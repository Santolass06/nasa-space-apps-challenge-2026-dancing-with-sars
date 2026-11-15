import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setWorkerUrl } from "maplibre-gl";

import App from "./App";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";

// The worker is copied to public/maplibre/ by scripts/copy-maplibre-worker.mjs
// (see the note there: Vite cannot see maplibre's runtime worker URL).
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.mjs`);

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element #root not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
