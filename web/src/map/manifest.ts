/** The manifest contract (docs/CONTRACT.md): one entry per raster layer. */
export type LayerKind = "coh" | "hh" | "hv" | "s2" | "rgb" | "dhh" | "dhv";

export type Layer = {
  id: string;
  kind: LayerKind;
  file: string;
  /** The full-grid version (2000 px), loaded when the reader zooms in. Optional. */
  hires?: string;
  orbit: string | null;
  dates: string[];
  title: string;
  units: string;
  range: [number, number];
  colormap: string;
  source: string;
  caveat: string;
};

export type Bounds = [number, number, number, number]; // west, south, east, north

export type Manifest = {
  version: number;
  bounds: Bounds;
  layers: Layer[];
};

/** Where the static files live, honouring the Vite base path (GitHub Pages sub-path). */
export const layersBase = () => `${import.meta.env.BASE_URL}layers/`;

let cached: Promise<Manifest> | undefined;

export async function loadManifest(): Promise<Manifest> {
  // One fetch per page: the map, the compare view and the story all share it.
  cached ??= (async () => {
    const url = `${layersBase()}manifest.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`manifest: HTTP ${response.status} at ${url}`);
    }
    return (await response.json()) as Manifest;
  })();
  return cached;
}

export function layerUrl(layer: Layer): string {
  return `${layersBase()}${layer.file}`;
}

export function layerHiresUrl(layer: Layer): string | undefined {
  return layer.hires ? `${layersBase()}${layer.hires}` : undefined;
}
