import { useEffect, useState } from "react";

import { API_URL, getHealth, type HealthResponse } from "./lib/api";

type ApiState =
  | { kind: "loading" }
  | { kind: "online"; health: HealthResponse }
  | { kind: "offline" };

const steps = [
  {
    title: "Pick a place",
    body: "A wetland, a glacier, a wildfire scar, a growing city — wherever the music calls you.",
  },
  {
    title: "Watch it change",
    body: "Compare NISAR acquisitions over time, in different polarisations, with context layers.",
  },
  {
    title: "Tell the story",
    body: "Turn radar backscatter into insight: what changed, why, and what it means for people.",
  },
];

export default function App() {
  const [api, setApi] = useState<ApiState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    getHealth()
      .then((health) => {
        if (!cancelled) setApi({ kind: "online", health });
      })
      .catch(() => {
        if (!cancelled) setApi({ kind: "offline" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const statusLabel =
    api.kind === "online"
      ? `API v${api.health.version} online`
      : api.kind === "offline"
        ? "API offline — start the backend"
        : "Connecting to API…";

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <p className="eyebrow">NASA Space Apps Challenge 2026 · The Next Frontier</p>
        <h1>
          Dancing with the <span className="accent">SARs</span>
        </h1>
        <p className="lede">
          Earth&apos;s surface never stops moving. NISAR&apos;s radar sees through clouds and
          darkness to show wetlands breathing, glaciers flowing, cities growing and floods
          retreating — if we can make the data dance.
        </p>
        <div className="badges">
          <span className={`status status--${api.kind}`}>
            <span className="dot" aria-hidden="true" />
            {statusLabel}
          </span>
          <span className="badge">NISAR · L-band SAR</span>
          <span className="badge">Open source · Apache-2.0</span>
        </div>
        <p className="api-hint">
          API endpoint: <code>{API_URL}</code>
        </p>
      </header>

      <main>
        <section className="steps" aria-label="How it works">
          {steps.map((step, index) => (
            <article className="card" key={step.title}>
              <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </article>
          ))}
        </section>

        <section className="placeholder" aria-label="Work in progress">
          <h2>Interactive map coming next</h2>
          <p>
            This scaffold is the starting point for the hackathon: the map, timeline and
            change layers plug into the API in <code>frontend/src/components</code>.
          </p>
          <p className="muted">
            Challenge:{" "}
            <a
              href="https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/"
              target="_blank"
              rel="noreferrer"
            >
              Dancing with the SARs
            </a>
          </p>
        </section>
      </main>

      <footer className="footer">
        <p>
          Built for the NASA Space Apps Challenge 2026. NISAR data courtesy of NASA/JPL-Caltech
          and ISRO, accessed through the ASF DAAC.
        </p>
        <p className="muted">
          Not affiliated with or endorsed by NASA. Code released under the Apache License 2.0.
        </p>
      </footer>
    </div>
  );
}
