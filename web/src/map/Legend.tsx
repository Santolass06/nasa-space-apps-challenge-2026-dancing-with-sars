import type { Layer } from "./manifest";
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

type Props = { layer: Layer };

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

  return (
    <figure className="legend">
      <figcaption className="legend__title">{layer.title}</figcaption>
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
            </span>
            <span>
              {high}
              {suffix}
            </span>
          </div>
        </>
      ) : (
        <p className="legend__note">Natural colour (RGB) — not a scale.</p>
      )}
      <p className="legend__caveat">{layer.caveat}</p>
    </figure>
  );
}
