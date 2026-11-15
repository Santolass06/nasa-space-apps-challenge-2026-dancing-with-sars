import { Marker, type Map as MapLibreMap } from "maplibre-gl";

import { layerImage } from "./images";
import { layersBase, type Bounds, type Layer, type Manifest } from "./manifest";

const OPACITY = 0.85;

// Motion. Layers cross-fade (the outgoing one waits a beat so the basemap never
// shows through), and the camera eases rather than snapping or swooping.
const FADE_MS = 650;
const FADE_OUT_DELAY_MS = 120;
const CAMERA_MS = 1400;
const CAMERA_DEBOUNCE_MS = 150;

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
  private cameraTimer: number | undefined;

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
  flyTo(bounds: Bounds = this.manifest.bounds, options: { instant?: boolean } = {}): void {
    const key = bounds.join(",");
    if (key === this.lastFit) {
      return;
    }
    this.lastFit = key;
    window.clearTimeout(this.cameraTimer);
    const go = () =>
      this.map.fitBounds(bounds, {
        padding: 24,
        duration: options.instant || reducedMotion() ? 0 : CAMERA_MS,
        easing: easeInOutCubic,
      });
    if (options.instant) {
      go();
    } else {
      this.cameraTimer = window.setTimeout(go, CAMERA_DEBOUNCE_MS);
    }
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
      })
      .catch((error: unknown) => {
        this.placesLoading = undefined;
        console.error("places", error);
      });
    return this.placesLoading;
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
