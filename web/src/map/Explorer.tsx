import { useEffect, useState } from "react";

import CompareView from "./CompareView";
import GridView from "./GridView";
import LayerChooser from "./LayerChooser";
import type { Manifest } from "./manifest";
import { recipesFor } from "./recipes";

export type ExploreMode = 1 | 2 | 4;

type Props = {
  manifest: Manifest;
  mode: ExploreMode;
  onModeChange: (mode: ExploreMode) => void;
  full: boolean;
  onFullChange: (full: boolean) => void;
};

const MODES: Array<{ mode: ExploreMode; label: string; hint: string }> = [
  { mode: 1, label: "1 map", hint: "One layer on the whole map" },
  { mode: 2, label: "2 maps", hint: "Before and after, with a slider" },
  { mode: 4, label: "4 maps", hint: "Four layers side by side, moving together" },
];

/**
 * The last step: explore the layers on one map, as a before/after pair with a
 * slider, or as four maps that move together, optionally almost full screen.
 * The one-map mode is the story's own map; this draws the controls for all
 * three and the two- and four-map views over it.
 */
export default function Explorer({ manifest, mode, onModeChange, full, onFullChange }: Props) {
  const [ids, setIds] = useState<string[]>(() => {
    const four = recipesFor(manifest, 4)[0]?.ids;
    return four ?? manifest.layers.slice(0, 4).map((layer) => layer.id);
  });

  // Escape leaves the full-screen view.
  useEffect(() => {
    if (!full) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onFullChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full, onFullChange]);

  const setOne = (panel: number, id: string) =>
    setIds((current) => current.map((value, index) => (index === panel ? id : value)));

  const recipes = mode === 1 ? [] : recipesFor(manifest, mode);

  return (
    <div className={`explorer${mode === 1 ? " explorer--one" : " explorer--multi"}`}>
      {mode === 2 && (
        <div className="explorer__stage">
          <CompareView
            before={ids[0]}
            after={ids[1]}
            interactiveLabels
            beforeLabel={
              <LayerChooser
                manifest={manifest}
                value={ids[0]}
                onChange={(id) => setOne(0, id)}
                tipsAbove
              />
            }
            afterLabel={
              <LayerChooser
                manifest={manifest}
                value={ids[1]}
                onChange={(id) => setOne(1, id)}
                tipsAbove
              />
            }
          />
        </div>
      )}
      {mode === 4 && (
        <div className="explorer__stage">
          <GridView manifest={manifest} ids={ids} onChange={setOne} />
        </div>
      )}

      <div className="explorer__bar" role="toolbar" aria-label="Map layout">
        <div className="explorer__modes">
          {MODES.map((item) => (
            <button
              key={item.mode}
              type="button"
              title={item.hint}
              className={`explorer__mode${item.mode === mode ? " is-selected" : ""}`}
              aria-pressed={item.mode === mode}
              onClick={() => onModeChange(item.mode)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {recipes.length > 0 && (
          <select
            className="explorer__recipes"
            aria-label="Ready-made comparison"
            value=""
            onChange={(event) => {
              const recipe = recipes.find((r) => r.name === event.target.value);
              if (recipe) {
                setIds((current) => [...recipe.ids, ...current.slice(recipe.ids.length)]);
              }
            }}
          >
            <option value="">Ready-made comparisons…</option>
            {recipes.map((recipe) => (
              <option key={recipe.name} value={recipe.name} title={recipe.why}>
                {recipe.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          className="explorer__full"
          aria-pressed={full}
          title={full ? "Back to the page (Esc)" : "Almost full screen"}
          onClick={() => onFullChange(!full)}
        >
          {full ? "Close" : "Expand"}
        </button>
      </div>
    </div>
  );
}
