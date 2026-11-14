// Placeholder shell. The real app is built by fronts C (map) and D (story): see docs/PLAN.md.
import type { Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useRef, useState } from "react";

import MapView from "./map/MapView";
import CompareView from "./map/CompareView";
import { LayerManager } from "./map/layers";
import { loadManifest } from "./map/manifest";

const acts = [
  "Before",
  "The fire",
  "The scar",
  "Why radar sees it",
  "Afterwards",
  "What next",
];

// The story opens on the fire pair: the coherence image that shows the scar.
const INITIAL_LAYER = "coh_D52_20260629_20260711";

export default function App() {
  const layersRef = useRef<LayerManager | null>(null);
  const [status, setStatus] = useState("Loading layers…");

  const onReady = useCallback((map: MapLibreMap) => {
    loadManifest()
      .then((manifest) => {
        const layers = new LayerManager(map, manifest);
        layers.showLayers([INITIAL_LAYER]);
        layers.showVector(["burn_official"]);
        layers.showPlaces(true);
        layers.flyTo();
        layersRef.current = layers;
        (window as unknown as { __layers?: LayerManager }).__layers = layers;
        setStatus(`${manifest.layers.length} layers from the manifest`);
      })
      .catch((error: unknown) => {
        console.error("manifest", error);
        setStatus("Layers failed to load — see the console");
      });
  }, []);

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <p className="eyebrow">NASA Space Apps Challenge 2026 · Dancing with the SARs</p>
        <h1>
          Caramulo <span className="accent">em chamas</span>
        </h1>
        <p className="lede">
          The largest wildfire of Portugal&apos;s 2026 season (Vouzela, 2–5 July, 12,804 ha),
          told with NISAR L-band radar alone: what happened, how the radar saw it through the
          smoke, and what came after.
        </p>
        <div className="badges">
          <span className="badge">NISAR · L-band SAR</span>
          <span className="badge">Open source · Apache-2.0</span>
        </div>
      </header>

      <main>
        <section className="steps" aria-label="Story acts">
          {acts.map((title, index) => (
            <article className="card" key={title}>
              <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
              <h2>{title}</h2>
            </article>
          ))}
        </section>

        <section className="map-section" aria-label="Map of the fire area">
          <MapView onReady={onReady} />
          <p className="map-caption">{status}</p>
        </section>

        <section className="compare-section" aria-label="Before and after the fire">
          <CompareView
            before="coh_D52_20260617_20260629"
            after="coh_D52_20260629_20260711"
            beforeLabel="17–29 Jun · before the fire"
            afterLabel="29 Jun–11 Jul · with the fire"
          />
        </section>
      </main>

      <footer className="footer">
        <p>
          NISAR data courtesy of NASA/JPL-Caltech and ISRO, accessed through the ASF DAAC.
        </p>
        <p className="muted">
          Not affiliated with or endorsed by NASA. Code released under the Apache License 2.0.
        </p>
      </footer>
    </div>
  );
}
