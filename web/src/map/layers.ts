import { Marker, type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";

import { layerImage } from "./images";
import { layersBase, type Bounds, type Layer, type Manifest } from "./manifest";

export type FocusZone = { bounds: Bounds; label: string };

const OPACITY = 0.85;

// Motion. Layers cross-fade (the outgoing one waits a beat so the basemap never
// shows through), and the camera eases rather than snapping or swooping.
const FADE_MS = 650;
const FADE_OUT_DELAY_MS = 120;
const CAMERA_MS = 1400;
const CAMERA_DEBOUNCE_MS = 150;
// The layers are 46 m per pixel; past this zoom they are magnified more than
// about 2x and look smeared, so the story's close-ups stop here.
const MAX_ZOOM = 12.4;

const reducedMotion = (): boolean =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const fadeMs = (): number => (reducedMotion() ? 0 : FADE_MS);

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** The vector layers that ship with the manifest (docs/CONTRACT.md). */
export type VectorId = "burn_nisar" | "burn_official";

const VECTOR_STYLE: Record<VectorId, { color: string; width: number; fill: number; dash?: number[] }> = {
  // Our perimeter, from the coherence difference: a warmer, dashed line.
  burn_nisar: { color: "#ff9d4d", width: 2.4, fill: 0.1, dash: [2, 1.4] },
  // The ICNF perimeter: cooler, solid.
  burn_official: { color: "#4da3ff", width: 2.0, fill: 0.12 },
};

type Place = { name: string; kind: string; description: string };

/**
 * Draws the manifest's raster layers by id (C1) and the vector layers (C4).
 *
 * Every raster layer is a single PNG covering the manifest bounds, so each one
 * is an `image` source with its four corners: no tiling, no server, and the
 * story can switch between them without reloading the page.
 */
export class LayerManager {
  private readonly map: MapLibreMap;
  private readonly manifest: Manifest;
  private readonly byId: Map<string, Layer>;
  private readonly added = new Set<string>();
  private readonly loading = new Map<string, Promise<void>>();
  private readonly shown = new Set<string>();
  private wanted = new Set<string>();
  private readonly markers: Marker[] = [];
  private placesLoading: Promise<void> | undefined;
  private placesVisible = false;
  private lastFit = "";
  private lastView: { bounds: Bounds; padding: number } | undefined;
  private cameraTimer: number | undefined;
  private refitTimer: number | undefined;
  private focusLabel: HTMLElement | undefined;
  private focusMarker: Marker | undefined;

  constructor(map: MapLibreMap, manifest: Manifest) {
    this.map = map;
    this.manifest = manifest;
    this.byId = new Map(manifest.layers.map((layer) => [layer.id, layer]));
    // A reader who pans or zooms has left the framing: the next step must re-frame.
    map.on("movestart", (event) => {
      if ((event as { originalEvent?: unknown }).originalEvent) {
        this.lastFit = "";
      }
    });
    // When the story widens the map, its left edge moves and its right edge stays.
    // MapLibre keeps the centre of the canvas fixed, which would slide the whole
    // picture sideways while it grows; shift it back so the ground stays still
    // and the new width just reveals more of it.
    const container = map.getContainer();
    let lastWidth = container.clientWidth;
    let lastRight = container.getBoundingClientRect().right;
    map.on("resize", () => {
      const width = container.clientWidth;
      const right = container.getBoundingClientRect().right;
      const grew = width - lastWidth;
      if (grew !== 0 && Math.abs(right - lastRight) < 1.5 && !map.isMoving()) {
        map.panBy([-grew / 2, 0], { duration: 0 });
      }
      lastWidth = width;
      lastRight = right;
      // A window resize re-frames the same box once it has settled.
      window.clearTimeout(this.refitTimer);
      this.refitTimer = window.setTimeout(() => this.refit(), 250);
    });
  }

  get bounds(): Bounds {
    return this.manifest.bounds;
  }

  layer(id: string): Layer | undefined {
    return this.byId.get(id);
  }

  /** Every raster layer id in the manifest, in file order. */
  ids(): string[] {
    return this.manifest.layers.map((layer) => layer.id);
  }

  /**
   * Show exactly these raster layers; every other manifest layer fades out.
   *
   * Layers stay in the map at opacity 0 once loaded (MapLibre skips drawing
   * them), so bringing one back is a fade, never a reload or a texture upload.
   */
  showLayers(ids: string[]): void {
    const wanted = new Set(ids);
    this.wanted = wanted;
    for (const layer of this.manifest.layers) {
      if (!wanted.has(layer.id)) {
        this.fadeRaster(layer.id, false);
      }
    }
    for (const id of ids) {
      const layer = this.byId.get(id);
      if (!layer) {
        console.warn(`showLayers: unknown layer ${id}`);
        continue;
      }
      this.fadeRaster(layer.id, true);
      void this.ensureRaster(layer, true);
    }
  }

  /**
   * Fetch and add rasters ahead of the story reaching them, two at a time and
   * only once the map is idle, so the first view of each step is already there.
   */
  async preload(ids: string[], concurrency = 2): Promise<void> {
    this.ensureVector("burn_official");
    this.ensureVector("burn_nisar");
    void this.loadPlaces();
    const queue = ids.filter((id) => this.byId.has(id));
    const worker = async () => {
      for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
        await this.ensureRaster(this.byId.get(id) as Layer, false).catch(() => undefined);
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
  }

  /** Show exactly these vector layers (perimeters); the others fade out. */
  showVector(ids: VectorId[]): void {
    const wanted = new Set(ids);
    for (const id of Object.keys(VECTOR_STYLE) as VectorId[]) {
      this.fadeVector(id, wanted.has(id));
    }
  }

  /** Toggle the place labels (HTML markers, so no glyph server is needed). */
  showPlaces(visible: boolean): void {
    this.placesVisible = visible;
    void this.loadPlaces().then(() => this.applyPlaces());
  }

  /**
   * Frame the map on the manifest bounds (or on a given box) with an eased
   * move. Repeated calls for the same box are ignored, and quick scrolling
   * through several steps only moves the camera for the last one.
   */
  flyTo(
    bounds: Bounds = this.manifest.bounds,
    options: { instant?: boolean; padding?: number; delay?: number } = {},
  ): void {
    const padding = options.padding ?? 24;
    const key = `${bounds.join(",")}|${padding}`;
    if (key === this.lastFit) {
      return;
    }
    this.lastFit = key;
    this.lastView = { bounds, padding };
    window.clearTimeout(this.cameraTimer);
    const go = () => this.fit(bounds, padding, options.instant || reducedMotion() ? 0 : CAMERA_MS);
    if (options.instant) {
      go();
    } else {
      this.cameraTimer = window.setTimeout(go, options.delay ?? CAMERA_DEBOUNCE_MS);
    }
  }

  private fit(bounds: Bounds, padding: number, duration: number): void {
    this.map.fitBounds(bounds, { padding, duration, easing: easeInOutCubic, maxZoom: MAX_ZOOM });
  }

  private refit(): void {
    if (this.lastView && this.lastFit !== "" && !this.map.isMoving()) {
      this.fit(this.lastView.bounds, this.lastView.padding, reducedMotion() ? 0 : 450);
    }
  }

  /**
   * Outline a zone and name it (or fade the outline out when `zone` is null).
   * The outline and its label cross-fade like every other overlay.
   */
  showFocus(zone: FocusZone | null): void {
    if (!zone) {
      this.setFocusVisible(false);
      return;
    }
    this.ensureFocus();
    const [west, south, east, north] = zone.bounds;
    const source = this.map.getSource("focus") as GeoJSONSource | undefined;
    void source?.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ],
        ],
      },
    });
    if (this.focusLabel && this.focusMarker) {
      this.focusLabel.textContent = zone.label;
      this.focusMarker.setLngLat([(west + east) / 2, north]);
    }
    this.setFocusVisible(true);
  }

  private ensureFocus(): void {
    if (this.added.has("focus")) {
      return;
    }
    const fade = { duration: fadeMs(), delay: 0 };
    this.map.addSource("focus", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    this.map.addLayer({
      id: "focus-fill",
      type: "fill",
      source: "focus",
      paint: { "fill-color": "#ffffff", "fill-opacity": 0, "fill-opacity-transition": fade },
    });
    this.map.addLayer({
      id: "focus-line",
      type: "line",
      source: "focus",
      paint: {
        "line-color": "#ffffff",
        "line-width": 2.5,
        "line-dasharray": [2, 1.5],
        "line-opacity": 0,
        "line-opacity-transition": fade,
      },
    });
    const element = document.createElement("div");
    const label = document.createElement("span");
    label.className = "focus-label is-hidden";
    element.append(label);
    this.focusLabel = label;
    this.focusMarker = new Marker({ element, anchor: "bottom", offset: [0, -6] })
      .setLngLat([0, 0])
      .addTo(this.map);
    this.added.add("focus");
  }

  private setFocusVisible(visible: boolean): void {
    if (!this.added.has("focus") || visible === this.shown.has("focus")) {
      return;
    }
    if (visible) {
      this.shown.add("focus");
    } else {
      this.shown.delete("focus");
    }
    const transition = { duration: fadeMs(), delay: visible ? 0 : FADE_OUT_DELAY_MS };
    this.map.setPaintProperty("focus-fill", "fill-opacity-transition", transition);
    this.map.setPaintProperty("focus-fill", "fill-opacity", visible ? 0.07 : 0);
    this.map.setPaintProperty("focus-line", "line-opacity-transition", transition);
    this.map.setPaintProperty("focus-line", "line-opacity", visible ? 1 : 0);
    this.focusLabel?.classList.toggle("is-hidden", !visible);
  }

  private loadPlaces(): Promise<void> {
    this.placesLoading ??= fetch(`${layersBase()}places.geojson`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`places: HTTP ${response.status}`);
        }
        return response.json() as Promise<{
          features: { geometry: { coordinates: [number, number] }; properties: Place }[];
        }>;
      })
      .then((data) => {
        data.features.forEach((feature, index) => {
          // MapLibre writes inline opacity on the marker element itself, so the
          // fade lives on an inner label instead.
          const element = document.createElement("div");
          element.title = feature.properties.description;
          const label = document.createElement("span");
          label.className = "place-marker is-hidden";
          label.style.transitionDelay = `${index * 70}ms`;
          label.textContent = feature.properties.name;
          element.append(label);
          this.markers.push(
            new Marker({ element }).setLngLat(feature.geometry.coordinates).addTo(this.map),
          );
        });
        this.applyPlaces();
        this.map.on("moveend", () => this.spreadPlaces());
        this.spreadPlaces();
      })
      .catch((error: unknown) => {
        this.placesLoading = undefined;
        console.error("places", error);
      });
    return this.placesLoading;
  }

  /**
   * Keep the labels from sitting on top of each other (Matadegas and Mançores
   * are 15 px apart at the story's zoom): each label takes the first free spot
   * among "on the point", above, below, and to either side, in screen pixels.
   */
  private spreadPlaces(): void {
    const taken: Array<[number, number, number, number]> = [];
    for (const marker of this.markers) {
      const label = marker.getElement().firstElementChild as HTMLElement | null;
      if (!label) {
        continue;
      }
      const w = label.offsetWidth;
      const h = label.offsetHeight;
      const at = this.map.project(marker.getLngLat());
      const gap = 4;
      const spots: Array<[number, number]> = [
        [0, 0],
        [0, -(h + gap)],
        [0, h + gap],
        [-(w / 2 + gap), 0],
        [w / 2 + gap, 0],
        [0, -2 * (h + gap)],
        [0, 2 * (h + gap)],
      ];
      const free = (dx: number, dy: number) =>
        taken.every(
          ([x0, y0, x1, y1]) =>
            at.x + dx + w / 2 <= x0 ||
            at.x + dx - w / 2 >= x1 ||
            at.y + dy + h / 2 <= y0 ||
            at.y + dy - h / 2 >= y1,
        );
      const [dx, dy] = spots.find(([x, y]) => free(x, y)) ?? spots[0];
      marker.setOffset([dx, dy]);
      taken.push([at.x + dx - w / 2, at.y + dy - h / 2, at.x + dx + w / 2, at.y + dy + h / 2]);
    }
  }

  private applyPlaces(): void {
    for (const marker of this.markers) {
      marker.getElement().firstElementChild?.classList.toggle("is-hidden", !this.placesVisible);
    }
  }

  private fadeRaster(id: string, visible: boolean): void {
    const layer = this.byId.get(id);
    if (!layer || !this.map.getLayer(id)) {
      return;
    }
    if (visible === this.shown.has(id)) {
      return;
    }
    if (visible) {
      this.shown.add(id);
    } else {
      this.shown.delete(id);
    }
    this.map.setPaintProperty(id, "raster-opacity-transition", {
      duration: fadeMs(),
      delay: visible || reducedMotion() ? 0 : FADE_OUT_DELAY_MS,
    });
    this.map.setPaintProperty(id, "raster-opacity", visible ? rasterOpacity(layer) : 0);
  }

  private ensureRaster(layer: Layer, urgent: boolean): Promise<void> {
    const pending = this.loading.get(layer.id);
    if (pending) {
      return pending;
    }
    const [west, south, east, north] = this.manifest.bounds;
    const result = layerImage(layer, urgent)
      .then((source) => {
        this.map.addSource(layer.id, {
          type: "image",
          url: source,
          coordinates: [
            [west, north],
            [east, north],
            [east, south],
            [west, south],
          ],
        });
        // Under the basemap's labels, so place names stay readable over the data.
        const labels = this.map.getStyle().layers.find((l) => l.type === "symbol")?.id;
        this.map.addLayer(
          {
            id: layer.id,
            type: "raster",
            source: layer.id,
            paint: {
              "raster-opacity": 0,
              "raster-fade-duration": 0,
            },
          },
          labels,
        );
        if (this.wanted.has(layer.id)) {
          // Let the invisible layer render once, so the fade has a start to run from.
          this.map.once("render", () => {
            if (this.wanted.has(layer.id)) {
              this.fadeRaster(layer.id, true);
            }
          });
          this.map.triggerRepaint();
        }
      })
      .catch((error: unknown) => {
        this.loading.delete(layer.id);
        console.error(`layer ${layer.id}`, error);
      });
    this.loading.set(layer.id, result);
    return result;
  }

  private ensureVector(id: VectorId): void {
    if (this.added.has(id)) {
      return;
    }
    const style = VECTOR_STYLE[id];
    const fade = { duration: fadeMs(), delay: 0 };
    this.map.addSource(id, { type: "geojson", data: `${layersBase()}${id}.geojson` });
    this.map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      paint: {
        "fill-color": style.color,
        "fill-opacity": 0,
        "fill-opacity-transition": fade,
      },
    });
    this.map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: {
        "line-color": style.color,
        "line-width": style.width,
        "line-opacity": 0,
        "line-opacity-transition": fade,
        ...(style.dash ? { "line-dasharray": style.dash } : {}),
      },
    });
    this.added.add(id);
  }

  private fadeVector(id: VectorId, visible: boolean): void {
    if (visible) {
      this.ensureVector(id);
    }
    if (!this.added.has(id) || visible === this.shown.has(id)) {
      return;
    }
    if (visible) {
      this.shown.add(id);
    } else {
      this.shown.delete(id);
    }
    const style = VECTOR_STYLE[id];
    const transition = {
      duration: fadeMs(),
      delay: visible || reducedMotion() ? 0 : FADE_OUT_DELAY_MS,
    };
    this.map.setPaintProperty(`${id}-fill`, "fill-opacity-transition", transition);
    this.map.setPaintProperty(`${id}-fill`, "fill-opacity", visible ? style.fill : 0);
    this.map.setPaintProperty(`${id}-line`, "line-opacity-transition", transition);
    this.map.setPaintProperty(`${id}-line`, "line-opacity", visible ? 1 : 0);
  }
}

function rasterOpacity(layer: Layer): number {
  return layer.kind === "coh" ? 1 : OPACITY;
}
