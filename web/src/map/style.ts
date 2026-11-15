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

/**
 * Recolour a coherence image in place: smooth the grey (display only), then
 * map it to the orange ramp. `pixels` is RGBA, as from getImageData.
 */
export function recolourPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): void {
  const lut = Array.from({ length: 256 }, (_, grey) => coherenceColour(grey));
  const count = width * height;
  const grey = new Float32Array(count);
  const valid = new Uint8Array(count);
  for (let p = 0; p < count; p++) {
    grey[p] = pixels[p * 4];
    valid[p] = pixels[p * 4 + 3] >= 128 ? 1 : 0;
  }
  const smooth = boxMean(grey, valid, width, height, radius);
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
}

const cache = new Map<string, Promise<string>>();

type WorkerReply = { id: number; blob?: Blob; error?: string };

let worker: Worker | undefined;
let nextId = 0;
const waiting = new Map<number, { resolve: (blob: Blob) => void; reject: (error: Error) => void }>();

/** The recolour runs in a worker when the browser can draw there, so the page never stalls on it. */
function recolourInWorker(url: string, radius: number): Promise<Blob> {
  if (!worker) {
    worker = new Worker(new URL("./recolour.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const job = waiting.get(event.data.id);
      waiting.delete(event.data.id);
      if (event.data.blob) {
        job?.resolve(event.data.blob);
      } else {
        job?.reject(new Error(event.data.error ?? "recolour failed"));
      }
    };
    worker.onerror = () => {
      // Without a working worker every pending and later call falls back to the page.
      for (const job of waiting.values()) {
        job.reject(new Error("recolour worker failed"));
      }
      waiting.clear();
      worker?.terminate();
      worker = undefined;
      workerBroken = true;
    };
  }
  return new Promise((resolve, reject) => {
    const id = nextId++;
    waiting.set(id, { resolve, reject });
    worker?.postMessage({ id, url: new URL(url, window.location.href).href, radius });
  });
}

let workerBroken = false;

async function recolourOnPage(url: string, radius: number): Promise<Blob> {
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
  recolourPixels(image.data, canvas.width, canvas.height, radius);
  context.putImageData(image, 0, 0);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

/** Fetch a coherence PNG and return a blob URL of its recoloured version (one per url). */
export function recolourCoherence(url: string, radius = SMOOTH_RADIUS): Promise<string> {
  const key = `${url}|${radius}`;
  let result = cache.get(key);
  if (!result) {
    const canUseWorker =
      !workerBroken && typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";
    result = (canUseWorker
      ? recolourInWorker(url, radius).catch(() => recolourOnPage(url, radius))
      : recolourOnPage(url, radius)
    ).then((blob) => URL.createObjectURL(blob));
    cache.set(key, result);
  }
  return result;
}
