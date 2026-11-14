// Placeholder shell. The real app is built by fronts C (map) and D (story): see docs/PLAN.md.
const acts = [
  "Before",
  "The fire",
  "The scar",
  "Why radar sees it",
  "Afterwards",
  "What next",
];

export default function App() {
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

        <section className="placeholder" aria-label="Work in progress">
          <h2>Map and story coming next</h2>
          <p>
            Layers are read from <code>public/layers/manifest.json</code>; see{" "}
            <code>docs/CONTRACT.md</code>.
          </p>
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
