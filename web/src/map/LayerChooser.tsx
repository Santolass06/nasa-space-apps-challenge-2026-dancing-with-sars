import { useMemo } from "react";

import { KIND_GUIDE, kindName } from "./guide";
import type { LayerKind, Manifest } from "./manifest";

type Props = {
  manifest: Manifest;
  /** The id of the layer shown. */
  value: string;
  onChange: (id: string) => void;
  /** Open the tooltips above the chips instead of below them. */
  tipsAbove?: boolean;
  /** Line the tooltips up with the right edge (for a chooser at the right of the screen). */
  tipsRight?: boolean;
};

/**
 * Pick a layer: a chip per kind of layer (hover or focus it for what that kind
 * usually reveals), then the date. Controlled: the parent owns the choice.
 */
export default function LayerChooser({ manifest, value, onChange, tipsAbove, tipsRight }: Props) {
  const kinds = useMemo(() => {
    const seen: LayerKind[] = [];
    for (const layer of manifest.layers) {
      if (!seen.includes(layer.kind)) {
        seen.push(layer.kind);
      }
    }
    return seen;
  }, [manifest]);

  const current = manifest.layers.find((layer) => layer.id === value);
  const kind = current?.kind ?? kinds[0];
  const options = manifest.layers.filter((layer) => layer.kind === kind);

  return (
    <div className="chooser" role="group" aria-label="Choose a layer">
      <div className="chooser__kinds">
        {kinds.map((k) => {
          const guide = KIND_GUIDE[k];
          return (
            <span className="chooser__chip-wrap" key={k}>
              <button
                type="button"
                className={`chooser__chip${k === kind ? " is-selected" : ""}`}
                aria-pressed={k === kind}
                onClick={() => {
                  const first = manifest.layers.find((layer) => layer.kind === k);
                  if (first && k !== kind) {
                    onChange(first.id);
                  }
                }}
              >
                {kindName(k)}
              </button>
              {guide && (
                <span
                  role="tooltip"
                  className={`chooser__tip${tipsAbove ? " chooser__tip--above" : ""}${tipsRight ? " chooser__tip--right" : ""}`}
                >
                  <strong>{guide.name}</strong>
                  <span>{guide.reveals}</span>
                  <em>{guide.read}</em>
                </span>
              )}
            </span>
          );
        })}
      </div>
      <select
        aria-label="Date"
        value={current?.id ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((layer) => (
          <option key={layer.id} value={layer.id}>
            {layer.title}
          </option>
        ))}
      </select>
    </div>
  );
}
