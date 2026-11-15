import { useEffect, useState } from "react";

import CompareView from "./CompareView";
import GridView from "./GridView";
import LayerChooser from "./LayerChooser";
import type { Manifest } from "./manifest";
import QuadView from "./QuadView";
import { recipesFor } from "./recipes";

export type ExploreMode = 1 | 2 | 4;

/** The two ways to lay out four layers; the separate maps need the room of the expanded view. */
type FourStyle = "point" | "grid";

// Icons for the two layouts: a square split by a point, and a 2x2 grid of maps.
const POINT_ICON = (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <rect x="1.5" y="1.5" width="17" height="17" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 1.5v17M1.5 10h17" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="10" cy="10" r="3" fill="currentColor" stroke="#0b1020" strokeWidth="1" />
  </svg>
);
const GRID_ICON = (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    {[1.5, 11].flatMap((x) =>
      [1.5, 11].map((y) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="7.5"
          height="7.5"
          rx="1.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      )),
    )}
  </svg>
);

type Props = {
  manifest: Manifest;
  mode: ExploreMode;
  onModeChange: (mode: ExploreMode) => void;
  full: boolean;
  onFullChange: (full: boolean) => void;
};

const MODES: Array<{ mode: ExploreMode; label: string; hint: string }> = [
  { mode: 1, label: "1 layer", hint: "One layer on the whole map" },
  { mode: 2, label: "2 layers", hint: "Two layers split by a slider" },
  { mode: 4, label: "4 layers", hint: "Four layers split by a point you can drag anywhere" },
];

/** Four layers need room (and four WebGL contexts): phones, in either orientation, get one and two. */
const NARROW = "(max-width: 640px), (orientation: landscape) and (max-height: 520px)";

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const query = window.matchMedia(NARROW);
    const onChange = () => setNarrow(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

/**
 * The last step: explore the layers on one map, as a before/after pair split by
 * a slider, or as four layers split by a point you drag freely, optionally
 * almost full screen.
 * The one-map mode is the story's own map; this draws the controls for all
 * three and the two- and four-map views over it.
 */
export default function Explorer({ manifest, mode: wanted, onModeChange, full, onFullChange }: Props) {
  const narrow = useNarrow();
  const mode: ExploreMode = narrow && wanted === 4 ? 2 : wanted;
  const [fourStyle, setFourStyle] = useState<FourStyle>("point");
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
          {full && fourStyle === "grid" ? (
            <GridView manifest={manifest} ids={ids} onChange={setOne} />
          ) : (
            <QuadView manifest={manifest} ids={ids} onChange={setOne} />
          )}
        </div>
      )}

      <div className="explorer__bar" role="toolbar" aria-label="Map layout">
        <div className="explorer__modes">
          {MODES.filter((item) => !(narrow && item.mode === 4)).map((item) => (
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
        {mode === 4 && full && (
          <button
            type="button"
            className="explorer__style"
            title={
              fourStyle === "point"
                ? "Show four separate maps side by side"
                : "Show one map split by a point"
            }
            aria-label={
              fourStyle === "point" ? "Four separate maps" : "One map split by a point"
            }
            onClick={() => setFourStyle(fourStyle === "point" ? "grid" : "point")}
          >
            {fourStyle === "point" ? GRID_ICON : POINT_ICON}
          </button>
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
