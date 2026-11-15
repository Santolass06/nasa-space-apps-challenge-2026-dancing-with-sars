import { Marker, type Map as MapLibreMap } from "maplibre-gl";

import { layerUrl, layersBase, type Bounds, type Layer, type Manifest } from "./manifest";
import { recolourCoherence } from "./style";

const OPACITY = 0.85;

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
  private wanted = new Set<string>();
  private readonly markers: Marker[] = [];

  constructor(map: MapLibreMap, manifest: Manifest) {
    this.map = map;
    this.manifest = manifest;
    this.byId = new Map(manifest.layers.map((layer) => [layer.id, layer]));
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

  /** Show exactly these raster layers; every other manifest layer is hidden. */
  showLayers(ids: string[]): void {
    const wanted = new Set(ids);
    this.wanted = wanted;
    for (const layer of this.manifest.layers) {
      if (!wanted.has(layer.id)) {
        this.hide(layer.id);
      }
    }
    for (const id of ids) {
      const layer = this.byId.get(id);
      if (!layer) {
        console.warn(`showLayers: unknown layer ${id}`);
        continue;
      }
      this.ensureRaster(layer);
      if (this.map.getLayer(layer.id)) {
        this.map.setLayoutProperty(layer.id, "visibility", "visible");
      }
    }
  }

  /** Show exactly these vector layers (perimeters); the others are hidden. */
  showVector(ids: VectorId[]): void {
    const wanted = new Set(ids);
    for (const id of Object.keys(VECTOR_STYLE) as VectorId[]) {
      if (!wanted.has(id)) {
        this.setVectorVisible(id, false);
      }
    }
    for (const id of ids) {
      this.ensureVector(id);
      this.setVectorVisible(id, true);
    }
  }

  /** Toggle the place labels (HTML markers, so no glyph server is needed). */
  showPlaces(visible: boolean): void {
    if (!visible) {
      for (const marker of this.markers) {
        marker.remove();
      }
      this.markers.length = 0;
      return;
    }
    if (this.markers.length > 0) {
      return;
    }
    fetch(`${layersBase()}places.geojson`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`places: HTTP ${response.status}`);
        }
        return response.json() as Promise<{
          features: { geometry: { coordinates: [number, number] }; properties: Place }[];
        }>;
      })
      .then((data) => {
        for (const feature of data.features) {
          const element = document.createElement("div");
          element.className = "place-marker";
          element.textContent = feature.properties.name;
          element.title = feature.properties.description;
          const marker = new Marker({ element }).setLngLat(feature.geometry.coordinates).addTo(this.map);
          this.markers.push(marker);
        }
      })
      .catch((error: unknown) => console.error("places", error));
  }

  /** Centre the map on the manifest bounds (or on a given box). */
  flyTo(bounds: Bounds = this.manifest.bounds): void {
    this.map.fitBounds(bounds, { padding: 24, duration: 800 });
  }

  private ensureRaster(layer: Layer): void {
    if (this.added.has(layer.id)) {
      return;
    }
    this.added.add(layer.id);
    // Coherence is recoloured in the browser (transparent where it is high); the other layers load as they are.
    const url = layer.kind === "coh" ? recolourCoherence(layerUrl(layer)) : Promise.resolve(layerUrl(layer));
    url
      .then((source) => {
        const [west, south, east, north] = this.manifest.bounds;
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
            layout: { visibility: this.wanted.has(layer.id) ? "visible" : "none" },
            paint: {
              "raster-opacity": layer.kind === "coh" ? 1 : OPACITY,
              "raster-fade-duration": 0,
            },
          },
          labels,
        );
      })
      .catch((error: unknown) => {
        this.added.delete(layer.id);
        console.error(`layer ${layer.id}`, error);
      });
  }

  private ensureVector(id: VectorId): void {
    if (this.added.has(id)) {
      return;
    }
    const style = VECTOR_STYLE[id];
    this.map.addSource(id, { type: "geojson", data: `${layersBase()}${id}.geojson` });
    this.map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      paint: { "fill-color": style.color, "fill-opacity": style.fill },
    });
    this.map.addLayer({
      id: `${id}-line`,
      type: "line",
      source: id,
      paint: {
        "line-color": style.color,
        "line-width": style.width,
        ...(style.dash ? { "line-dasharray": style.dash } : {}),
      },
    });
    this.added.add(id);
  }

  private setVectorVisible(id: VectorId, visible: boolean): void {
    for (const suffix of ["fill", "line"]) {
      const layerId = `${id}-${suffix}`;
      if (this.map.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      }
    }
  }

  private hide(id: string): void {
    if (this.map.getLayer(id)) {
      this.map.setLayoutProperty(id, "visibility", "none");
    }
  }
}
