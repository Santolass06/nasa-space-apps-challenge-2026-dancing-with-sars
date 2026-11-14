// Copy the MapLibre worker into public/ so the browser can load it.
//
// maplibre-gl builds the worker URL at runtime (`new URL("./" + name,
// import.meta.url)`), which Vite cannot see, so the file never reaches the
// bundle and the map silently fails with "Worker failed to load". Copying it to
// a stable path and calling setWorkerUrl() in main.tsx fixes that.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const from = resolve(root, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const to = resolve(root, "public/maplibre/maplibre-gl-worker.mjs");

mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log(`maplibre worker -> ${to}`);
