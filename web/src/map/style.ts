// How the coherence layers are drawn. This is display only: the PNG files stay grey
// because burn.py and progress.py read them as data (coherence = grey / 255), so the
// colour is applied in the browser, never baked into the files.

/** The orange slot of the data-viz palette, dark mode (#d95926): the single hue of the ramp. */
const HUE: [number, number, number] = [217, 89, 38];

/** At or above this coherence a pixel is transparent: nothing changed there. */
export const COHERENCE_CLEAR = 0.5;
/** At or below this coherence a pixel is at full strength. */
export const COHERENCE_FULL = 0.2;
const MAX_ALPHA = 0.95;
/** Half-width of the box smoothing applied for display only (2 = 5 x 5 pixels, ~230 m): it tames the pixel speckle. */
export const SMOOTH_RADIUS = 2;

type Rgba = [number, number, number, number];

/** RGBA (0-255) for a grey value (0-255) of a coherence PNG: stronger as coherence drops. */
export function coherenceColour(grey: number): Rgba {
  const t = (COHERENCE_CLEAR - grey / 255) / (COHERENCE_CLEAR - COHERENCE_FULL);
  const strength = Math.min(1, Math.max(0, t));
  return [HUE[0], HUE[1], HUE[2], Math.round(255 * MAX_ALPHA * strength)];
}

/** The same ramp as a CSS gradient (left = low coherence, right = high), for the legend. */
export function coherenceRampCss(): string {
  const stops = [0, COHERENCE_FULL, COHERENCE_CLEAR, 1].map((coherence) => {
    const [r, g, b, a] = coherenceColour(coherence * 255);
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)}) ${Math.round(coherence * 100)}%`;
  });
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/** Weighted box mean of `values` (weight 0 = no data), as two running-sum passes. */
function boxMean(values: Float32Array, weights: Uint8Array, width: number, height: number, radius: number): Float32Array {
  const sumV = new Float32Array(width * height);
  const sumW = new Float32Array(width * height);
  const prefV = new Float64Array(Math.max(width, height) + 1);
  const prefW = new Float64Array(Math.max(width, height) + 1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      prefV[x + 1] = prefV[x] + values[i] * weights[i];
      prefW[x + 1] = prefW[x] + weights[i];
    }
    for (let x = 0; x < width; x++) {
      const lo = Math.max(0, x - radius);
      const hi = Math.min(width - 1, x + radius);
      sumV[y * width + x] = prefV[hi + 1] - prefV[lo];
      sumW[y * width + x] = prefW[hi + 1] - prefW[lo];
    }
  }
  const out = new Float32Array(width * height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      prefV[y + 1] = prefV[y] + sumV[y * width + x];
      prefW[y + 1] = prefW[y] + sumW[y * width + x];
    }
    for (let y = 0; y < height; y++) {
      const lo = Math.max(0, y - radius);
      const hi = Math.min(height - 1, y + radius);
      const w = prefW[hi + 1] - prefW[lo];
      out[y * width + x] = w > 0 ? (prefV[hi + 1] - prefV[lo]) / w : 0;
    }
  }
  return out;
}

const cache = new Map<string, Promise<string>>();

/** Fetch a coherence PNG and return a blob URL of its recoloured version (one per url). */
export function recolourCoherence(url: string, radius = SMOOTH_RADIUS): Promise<string> {
  let result = cache.get(url);
  if (!result) {
    result = (async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${url}: HTTP ${response.status}`);
      }
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        throw new Error("no 2d canvas");
      }
      context.drawImage(bitmap, 0, 0);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const lut = Array.from({ length: 256 }, (_, grey) => coherenceColour(grey));
      const pixels = image.data;
      const count = canvas.width * canvas.height;
      const grey = new Float32Array(count);
      const valid = new Uint8Array(count);
      for (let p = 0; p < count; p++) {
        grey[p] = pixels[p * 4];
        valid[p] = pixels[p * 4 + 3] >= 128 ? 1 : 0;
      }
      const smooth = boxMean(grey, valid, canvas.width, canvas.height, radius);
      for (let p = 0; p < count; p++) {
        const i = p * 4;
        if (!valid[p]) {
          pixels[i + 3] = 0; // outside the radar swath
          continue;
        }
        const [r, g, b, a] = lut[Math.round(smooth[p])];
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
        pixels[i + 3] = a;
      }
      context.putImageData(image, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
      );
      return URL.createObjectURL(blob);
    })();
    cache.set(url, result);
  }
  return result;
}
