import { recolourPixels } from "./style";

// Recolours a coherence PNG off the page's main thread (see recolourCoherence in style.ts).
type Job = { id: number; url: string; radius: number };

self.onmessage = async (event: MessageEvent<Job>) => {
  const { id, url, radius } = event.data;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${url}: HTTP ${response.status}`);
    }
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("no 2d canvas");
    }
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    recolourPixels(image.data, canvas.width, canvas.height, radius);
    context.putImageData(image, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    self.postMessage({ id, blob });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
