import { layerHiresUrl, layerUrl, type Layer } from "./manifest";
import { SMOOTH_RADIUS, recolourCoherence } from "./style";

const cache = new Map<string, Promise<string>>();

/** Run `work` when the browser is idle, so heavy steps never land mid-animation. */
function whenIdle<T>(work: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => work().then(resolve, reject);
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(run, { timeout: 2000 });
    } else {
      setTimeout(run, 50);
    }
  });
}

/**
 * The image to hand to MapLibre for a raster layer, as an object URL.
 *
 * One download per layer for the whole page: the main map and both comparison
 * maps share it, and the fetch happens once even if three maps ask at the same
 * time. Coherence goes through the display recolour first (style.ts): at idle
 * when it is only being preloaded, straight away when the story needs it now.
 */
export function layerImage(layer: Layer, urgent = false, hires = false): Promise<string> {
  const key = hires ? `${layer.id}@2x` : layer.id;
  let result = cache.get(key);
  if (!result) {
    const url = (hires ? layerHiresUrl(layer) : undefined) ?? layerUrl(layer);
    // The full-grid image has twice the pixels, so the display smoothing covers twice the radius.
    const radius = hires ? SMOOTH_RADIUS * 2 : SMOOTH_RADIUS;
    result =
      layer.kind === "coh"
        ? urgent
          ? recolourCoherence(url, radius)
          : whenIdle(() => recolourCoherence(url, radius))
        : fetch(url)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`${layer.id}: HTTP ${response.status}`);
              }
              return response.blob();
            })
            .then((blob) => URL.createObjectURL(blob));
    cache.set(key, result);
    // A failed download must be retried the next time someone asks.
    result.catch(() => cache.delete(key));
  }
  return result;
}
