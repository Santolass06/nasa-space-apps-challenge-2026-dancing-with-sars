import { useId, useState, useSyncExternalStore } from "react";

import type { Layer, LayerKind } from "./manifest";
import { coherenceRampCss } from "./style";

// The same anchors as pipeline/caramulo/export.py (`_COLORMAP_ANCHORS`): the
// pipeline interpolates evenly between them, so a CSS gradient with the same
// stops is the same ramp. Keep the two lists in step.
const RAMP: Record<string, string[]> = {
  gray: ["#000000", "#ffffff"],
  viridis: [
    "#440154",
    "#482878",
    "#3e4a89",
    "#31688e",
    "#26828e",
    "#1f9e89",
    "#35b779",
    "#6dcd59",
    "#b4de26",
    "#fde725",
  ],
  magma: [
    "#000004",
    "#1c1044",
    "#4f127b",
    "#812581",
    "#b5367a",
    "#e55064",
    "#fb8761",
    "#fec287",
    "#fcfdbf",
  ],
  rdbu: ["#2166ac", "#67a9cf", "#d1e5f0", "#f7f7f7", "#fddbc7", "#ef8a62", "#b2182b"],
};

/** What the two ends of the scale mean, in words (the numbers alone say nothing to most readers). */
const ENDS: Partial<Record<LayerKind, [string, string]>> = {
  hh: ["weaker echo", "stronger echo"],
  hv: ["weaker echo", "stronger echo"],
  dhh: ["dimmer", "brighter"],
  dhv: ["dimmer", "brighter"],
};

/** Caveats longer than this fold behind "More". */
const CAVEAT_SHORT = 110;

type Props = { layer: Layer };

// Which legends the reader has folded away. Kept outside the component, so a legend
// stays folded when the story moves on and the same layer comes back in a later step.
const folded = new Set<string>();
const listeners = new Set<() => void>();

function useFolded(id: string): [boolean, () => void] {
  const isFolded = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => folded.has(id),
    () => false,
  );
  const toggle = () => {
    if (!folded.delete(id)) {
      folded.add(id);
    }
    listeners.forEach((listener) => listener());
  };
  return [isFolded, toggle];
}

/**
 * C3 — the legend of a layer, built only from its manifest entry (`colormap`,
 * `range`, `units`, `caveat`). No per-layer code: if a new layer appears with a
 * known colormap, it gets a legend for free.
 */
export default function Legend({ layer }: Props) {
  const isCoherence = layer.kind === "coh";
  const ramp = isCoherence ? undefined : RAMP[layer.colormap];
  const [low, high] = layer.range;
  const suffix = layer.units === "coherence" ? "" : ` ${layer.units}`;
  const ends = ENDS[layer.kind];
  const [open, setOpen] = useState(false);
  const long = layer.caveat.length > CAVEAT_SHORT;
  const [isFolded, toggle] = useFolded(layer.id);
  const bodyId = useId();

  return (
    <figure className={`legend${isFolded ? " is-folded" : ""}`}>
      <figcaption className="legend__title">
        <button
          type="button"
          className="legend__head"
          aria-expanded={!isFolded}
          aria-controls={bodyId}
          title={isFolded ? "Show the legend" : "Fold the legend"}
          onClick={toggle}
        >
          <span>{layer.title}</span>
          <span className="legend__chevron" aria-hidden="true" />
        </button>
      </figcaption>
      <div className="legend__body" id={bodyId}>
        <div className="legend__inner">
          {isCoherence ? (
            <>
              <div
                className="legend__ramp"
                style={{ background: coherenceRampCss() }}
                aria-hidden="true"
              />
              <div className="legend__scale">
                <span>0 (low)</span>
                <span>1 (high)</span>
              </div>
              <p className="legend__note">Colour marks low coherence (smoothed for display); it is transparent where coherence is high.</p>
            </>
          ) : ramp ? (
            <>
              <div
                className="legend__ramp"
                style={{ background: `linear-gradient(90deg, ${ramp.join(", ")})` }}
                aria-hidden="true"
              />
              <div className="legend__scale">
                <span>
                  {low}
                  {suffix}
                  {ends && <em> · {ends[0]}</em>}
                </span>
                <span>
                  {high}
                  {suffix}
                  {ends && <em> · {ends[1]}</em>}
                </span>
              </div>
            </>
          ) : (
            <p className="legend__note">Natural colour (RGB) — not a scale.</p>
          )}
          <p className={`legend__caveat${open ? " is-open" : ""}`}>{layer.caveat}</p>
          {long && (
            <button type="button" className="legend__more" onClick={() => setOpen(!open)}>
              {open ? "Less" : "More"}
            </button>
          )}
        </div>
      </div>
    </figure>
  );
}
