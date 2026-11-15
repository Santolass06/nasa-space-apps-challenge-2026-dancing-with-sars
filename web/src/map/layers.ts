import type { Map as MapLibreMap } from "maplibre-gl";

import { layerUrl, type Bounds, type Layer, type Manifest } from "./manifest";

const OPACITY = 0.85;

/**
 * Draws the manifest's raster layers by id (C1).
 *
 * Every layer is a single PNG covering the manifest bounds, so each one is an
 * `image` source with its four corners: no tiling, no server, and the story can
 * switch between them without reloading the page.
 */
export class LayerManager {
  private readonly map: MapLibreMap;
  private readonly manifest: Manifest;
  private readonly byId: Map<string, Layer>;
  private readonly added = new Set<string>();

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

  /** Every layer id in the manifest, in file order. */
  ids(): string[] {
    return this.manifest.layers.map((layer) => layer.id);
  }

  /** Show exactly these layers; every other manifest layer is hidden. */
  showLayers(ids: string[]): void {
    const wanted = new Set(ids);
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
      this.ensure(layer);
      this.map.setLayoutProperty(layer.id, "visibility", "visible");
    }
  }

  /** Centre the map on the manifest bounds (or on a given box). */
  flyTo(bounds: Bounds = this.manifest.bounds): void {
    this.map.fitBounds(bounds, { padding: 24, duration: 800 });
  }

  private ensure(layer: Layer): void {
    if (this.added.has(layer.id)) {
      return;
    }
    const [west, south, east, north] = this.manifest.bounds;
    this.map.addSource(layer.id, {
      type: "image",
      url: layerUrl(layer),
      coordinates: [
        [west, north],
        [east, north],
        [east, south],
        [west, south],
      ],
    });
    this.map.addLayer({
      id: layer.id,
      type: "raster",
      source: layer.id,
      paint: { "raster-opacity": OPACITY, "raster-fade-duration": 0 },
    });
    this.added.add(layer.id);
  }

  private hide(id: string): void {
    if (this.map.getLayer(id)) {
      this.map.setLayoutProperty(id, "visibility", "none");
    }
  }
}
