import { lazy, Suspense } from "react";

// The story (and with it the map library) loads after the page has painted.
const Story = lazy(() => import("./story/Story"));

export default function App() {
  return (
    <div className="page">
      <header className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <p className="eyebrow">NASA Space Apps Challenge 2026 · Dancing with the SARs</p>
        <h1>
          Caramulo <span className="flame"><span className="accent">em chamas</span></span>
        </h1>
        <p className="lede">
          The largest wildfire of Portugal&apos;s 2026 season (Vouzela, 2–5 July), told with
          NISAR L-band radar alone: what happened, how the radar saw it through the smoke,
          and what came after.
        </p>
        <div className="badges">
          <span className="badge">NISAR · L-band SAR</span>
          <span className="badge">Open source · Apache-2.0</span>
        </div>
      </header>

      <main>
        <Suspense fallback={<div className="story-loading" aria-busy="true" />}>
          <Story />
        </Suspense>
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
