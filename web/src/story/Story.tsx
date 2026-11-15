import type { Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import CompareView from "../map/CompareView";
import Explorer, { type ExploreMode } from "../map/Explorer";
import LayerPicker from "../map/LayerPicker";
import Legend from "../map/Legend";
import MapView from "../map/MapView";
import { LayerManager, type OverlayId } from "../map/layers";
import { loadManifest, type Layer, type Manifest } from "../map/manifest";
import {
  flatten,
  isVector,
  OVERLAY_TITLES,
  PLACES_ID,
  story,
  type FlatStep,
  type Step,
} from "./storyTypes";
import Embers from "./Embers";
import { hectares, loadStats, type Polarization, type Stats } from "./stats";

/**
 * Portrait phones and tablets: the map is pinned on top and the step's text sits
 * in a sheet at the bottom of the screen (landscape keeps the two columns).
 */
/** Timings of the map frame growing or shrinking (the 0.7 s transition on .story in styles.css). */
const MAP_DATA_DELAY_MS = 380;
const MAP_CAMERA_DELAY_MS = 640;

const STACKED = "(max-width: 900px) and (orientation: portrait)";

function useStacked(): boolean {
  const [stacked, setStacked] = useState(() => window.matchMedia(STACKED).matches);
  useEffect(() => {
    const query = window.matchMedia(STACKED);
    const onChange = () => setStacked(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return stacked;
}

/** How long scrolling must rest on a step before the map follows it. */
const APPLY_DELAY_MS = 260;
/** Steps applied closer together than this count as fast scrolling. */
const FAST_SCROLL_MS = 1500;

const layerTitle = (manifest: Manifest | null, id: string): string =>
  manifest?.layers.find((layer: Layer) => layer.id === id)?.title ?? OVERLAY_TITLES[id] ?? id;

/** Raster ids in the order the story will want them, starting after `from`, then the rest. */
function preloadOrder(steps: FlatStep[], from: number, all: string[]): string[] {
  const ordered: string[] = [];
  for (let offset = 0; offset < steps.length; offset++) {
    const { step } = steps[(from + offset) % steps.length];
    const ids = [
      ...step.layers.map((ref) => ref.id),
      ...(step.comparisons ?? []).flatMap((c) => [c.leftLayerId, c.rightLayerId]),
    ];
    for (const id of ids) {
      if (all.includes(id) && !ordered.includes(id)) {
        ordered.push(id);
      }
    }
  }
  return [...ordered, ...all.filter((id) => !ordered.includes(id))];
}

/** Our area next to the official one (D4), straight from stats.json. */
function StatsPanel({ stats }: { stats: Stats }) {
  return (
    <dl className="stats">
      <div>
        <dt>Our perimeter (coherence difference)</dt>
        <dd>{hectares(stats.our_area_ha)} ha</dd>
      </div>
      <div>
        <dt>ICNF perimeter</dt>
        <dd>{hectares(stats.official_area_ha)} ha</dd>
      </div>
      <div>
        <dt>Overlap</dt>
        <dd>
          {hectares(stats.overlap_ha)} ha · {stats.overlap_pct_of_official}% of the official
        </dd>
      </div>
    </dl>
  );
}

/** HH, HV and coherence side by side (D5), straight from the act-4 table. */
function Act4Panel({ act4 }: { act4: Stats["act4"] }) {
  const rows: { name: string; value: Polarization }[] = [
    { name: "HH", value: act4.backscatter_db.hh },
    { name: "HV", value: act4.backscatter_db.hv },
  ];
  return (
    <div className="act4">
      <table>
        <thead>
          <tr>
            <th>Change, 29 Jun → 11 Jul</th>
            <th>Inside the scar</th>
            <th>Outside</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ name, value }) => (
            <tr key={name}>
              <th>{name}</th>
              <td>{value.change_inside_db.toFixed(2)} dB</td>
              <td>{value.change_outside_db.toFixed(2)} dB</td>
            </tr>
          ))}
          <tr>
            <th>Coherence, fire pair</th>
            <td>{act4.coherence.fire.inside.toFixed(2)}</td>
            <td>{act4.coherence.fire.outside.toFixed(2)}</td>
          </tr>
          <tr>
            <th>Coherence, control pair</th>
            <td>{act4.coherence.control.inside.toFixed(2)}</td>
            <td>{act4.coherence.control.outside.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <p className="act4__answer">{act4.answer}</p>
    </div>
  );
}

/**
 * D1 — the guided story. Every step in story.en.json shows its layers and
 * frames its bounds; the step nearest the middle of the screen is the active
 * one, and comparison steps put the before/after slider over the map.
 */
export default function Story() {
  const steps = useMemo(flatten, []);
  // `active` is the step under the middle of the screen (it lights the text at once);
  // `applied` is the one the map shows, which follows `active` only once scrolling
  // has paused on it, so a quick scroll doesn't flash every step in between.
  const [active, setActive] = useState(0);
  const [applied, setApplied] = useState(0);
  const lastApplied = useRef(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const managerRef = useRef<LayerManager | null>(null);
  const [compareReady, setCompareReady] = useState(false);
  const [exploreMode, setExploreMode] = useState<ExploreMode>(1);
  const [exploreFull, setExploreFull] = useState(false);
  const [legendTarget, setLegendTarget] = useState<HTMLDivElement | null>(null);
  const stacked = useStacked();
  const [mainIdle, setMainIdle] = useState(false);
  const activeRef = useRef(0);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    loadManifest()
      .then(setManifest)
      .catch((error: unknown) => console.error("manifest", error));
    loadStats()
      .then(setStats)
      .catch((error: unknown) => console.error("stats", error));
  }, []);

  const framed = useRef(false);
  const wasWide = useRef(false);
  const dataTimer = useRef<number | undefined>(undefined);

  const applyStep = useCallback((manager: LayerManager, step: Step) => {
    const rasters: string[] = [];
    const overlays: OverlayId[] = [];
    for (const ref of step.layers) {
      if (ref.id === PLACES_ID) {
        overlays.push("places");
      } else if (isVector(ref.id)) {
        overlays.push(ref.id);
      } else {
        rasters.push(ref.id);
      }
    }
    // The map frame widens or narrows over the CSS transition on .story (0.7 s). While it
    // does, the data waits until the frame is most of the way there, so it fades in as the
    // camera starts and not on top of a half-grown frame at the old zoom; the camera then
    // waits for the frame to be done.
    const wide = Boolean(step.focus || step.wide);
    const widthChanges = framed.current && wasWide.current !== wide;
    const show = () => {
      manager.showLayers(rasters);
      manager.showVector(overlays);
      manager.showFocus(step.focus ?? null);
    };
    window.clearTimeout(dataTimer.current);
    if (widthChanges) {
      dataTimer.current = window.setTimeout(show, MAP_DATA_DELAY_MS);
    } else {
      show();
    }
    // A focus step frames its zone with room around it; any other step frames its view.
    const target = step.focus?.view ?? step.focus?.bounds ?? step.mapView?.bounds;
    if (target) {
      manager.flyTo(target, {
        instant: !framed.current,
        padding: step.focus ? 90 : 24,
        delay: widthChanges ? MAP_CAMERA_DELAY_MS : undefined,
      });
      framed.current = true;
      wasWide.current = wide;
    }
  }, []);

  const onMapReady = useCallback(
    (map: MapLibreMap) => {
      loadManifest()
        .then((loaded) => {
          const manager = new LayerManager(map, loaded);
          managerRef.current = manager;
          (window as unknown as { __layers?: LayerManager }).__layers = manager;
          applyStep(manager, steps[activeRef.current].step);
          // Once the first view has drawn, fetch the rest in story order.
          map.once("idle", () => {
            // The comparison maps are built once the layers are in (or sooner, if the
            // reader reaches a comparison first), so they don't compete for the network.
            void manager
              .preload(preloadOrder(steps, activeRef.current, manager.ids()))
              .finally(() => setMainIdle(true));
          });
        })
        .catch((error: unknown) => console.error("story", error));
    },
    [applyStep, steps],
  );

  // The step crossing the middle of the viewport is the active one.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          const index = Number((entry.target as HTMLElement).dataset.step);
          if (!Number.isNaN(index) && index !== activeRef.current) {
            activeRef.current = index;
            setActive(index);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const element of stepRefs.current) {
      if (element) {
        observer.observe(element);
      }
    }
    return () => observer.disconnect();
  }, [steps]);

  useEffect(() => {
    if (active === applied) {
      return;
    }
    const timer = window.setTimeout(() => setApplied(active), APPLY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, applied]);

  const current = steps[applied] ?? steps[0];
  const comparison = current?.step.comparisons?.[0];
  const exploring = current?.step.id === "explore-the-map";
  // The comparison maps are built once and kept: the overlay fades in and out,
  // and switching pairs is a cross-fade inside it. Until the reader reaches the
  // first comparison they are built in the background from the first one.
  const lastComparison = useRef(steps.find((item) => item.step.comparisons?.length));
  if (comparison && current) {
    lastComparison.current = current;
  }
  const shownComparison = lastComparison.current?.step.comparisons?.[0];
  const shownBounds = lastComparison.current?.step.mapView?.bounds;

  // Comparisons keep the left/right order; single maps use the current raster ids.
  const legendIds = comparison
    ? [comparison.leftLayerId, comparison.rightLayerId]
    : exploring && picked
      ? [picked]
      : current.step.layers.map((ref) => ref.id);
  const legendLayers = current.step.figure ? [] : legendIds
    .map((id) => manifest?.layers.find((layer) => layer.id === id))
    .filter((layer): layer is Layer => Boolean(layer));
  const legend = legendLayers.length > 0 && (
    <div className="legend-stack">
      {legendLayers.map((layer, index) => <Legend key={`${index}-${layer.id}`} layer={layer} />)}
    </div>
  );

  // The page takes the mood of the act being read (colours are CSS variables keyed on this).
  const activeAct = steps[active]?.act.id;
  useEffect(() => {
    if (!activeAct) {
      return;
    }
    const root = document.documentElement;
    root.dataset.act = activeAct;
    return () => {
      delete root.dataset.act;
    };
  }, [activeAct]);

  // Leaving the explore step closes the expanded view; while it is open the page behind stays put.
  useEffect(() => {
    if (!exploring) {
      setExploreFull(false);
    }
  }, [exploring]);
  useEffect(() => {
    document.body.style.overflow = exploreFull ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [exploreFull]);

  // Drive the single map. Comparison steps draw their own pair instead.
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || comparison || !current) {
      return;
    }
    const now = performance.now();
    manager.setPace(now - lastApplied.current < FAST_SCROLL_MS);
    lastApplied.current = now;
    applyStep(manager, current.step);
    setPicked(null);
  }, [applied, comparison, applyStep, current]);

  /** The text of a step: its sentence, one caption per layer, sources, and the numbers panels. */
  const stepContent = (item: FlatStep) => (
    <>
          <p className="story__step-text">{item.step.text}</p>
          <ul className="story__captions">
            {item.step.layers.map((ref) => (
              <li key={ref.id}>
                <span className="story__layer-name">{layerTitle(manifest, ref.id)}</span>{" "}
                {ref.caption}
              </li>
            ))}
          </ul>
          {item.step.sources && item.step.sources.length > 0 && (
            <p className="story__sources">
              Sources:{" "}
              {item.step.sources.map((url, position) => (
                <span key={url}>
                  <a href={url} target="_blank" rel="noreferrer">
                    {new URL(url).hostname}
                  </a>
                  {position < item.step.sources!.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
          )}
          {item.index === active && item.act.id === "scar" && !item.step.focus && stats && (
            <StatsPanel stats={stats} />
          )}
          {item.index === active && item.act.id === "radar" && !item.step.focus && stats?.act4 && (
            <Act4Panel act4={stats.act4} />
          )}
    </>
  );

  return (
    <div className={`story${current?.step.focus || current?.step.wide ? " is-wide" : ""}`}>
      <Embers active={activeAct === "fire"} />
      <div className="story__text">
        {story.acts.map((act) => (
          <section className="story__act" key={act.id} id={`act-${act.id}`}>
            <h2 className="story__act-title">{act.title}</h2>
            {steps
              .filter((item) => item.act.id === act.id)
              .map((item) => (
                <article
                  key={item.step.id}
                  data-step={item.index}
                  ref={(element) => {
                    stepRefs.current[item.index] = element;
                  }}
                  className={`story__step${item.index === active ? " is-active" : ""}`}
                >
                  <div className="story__step-body">
                    {!stacked && stepContent(item)}
                  </div>
                </article>
              ))}
          </section>
        ))}
      </div>

      <div className={`story__map-column${exploreFull ? " story__map-column--full" : ""}`}>
        <div className="story__map">
          <MapView className="story__map-view" onReady={onMapReady} cooperativeGestures={!exploreFull} />
          {exploring && manifest && (
            <Explorer
              manifest={manifest}
              mode={exploreMode}
              onModeChange={setExploreMode}
              full={exploreFull}
              onFullChange={setExploreFull}
              picker={
                <LayerPicker
                  manifest={manifest}
                  onPick={(id) => {
                    managerRef.current?.showLayers([id]);
                    setPicked(id);
                  }}
                />
              }
              legend={legend}
              legendTarget={legendTarget}
            />
          )}
          {steps.map(
            ({ index, step }) =>
              step.figure && (
                <figure
                  key={step.id}
                  className={`story__figure${index === applied ? " is-open" : ""}`}
                  aria-hidden={index !== applied}
                >
                  <img
                    src={`${import.meta.env.BASE_URL}${step.figure.src}`}
                    alt={step.figure.alt}
                    decoding="async"
                  />
                  <figcaption>
                    <p>{step.figure.caption}</p>
                    <p className="story__credit">
                      {step.figure.credit} ·{" "}
                      <a href={step.figure.licenceUrl} target="_blank" rel="noreferrer">
                        {step.figure.licence}
                      </a>{" "}
                      ·{" "}
                      <a href={step.figure.sourceUrl} target="_blank" rel="noreferrer">
                        source
                      </a>
                      . Resized.
                    </p>
                  </figcaption>
                </figure>
              ),
          )}
          {shownComparison && (mainIdle || comparison) && (
            <div className={`story__overlay${comparison && compareReady ? " is-open" : ""}`}>
              <CompareView
                before={shownComparison.leftLayerId}
                after={shownComparison.rightLayerId}
                beforeLabel={layerTitle(manifest, shownComparison.leftLayerId)}
                afterLabel={layerTitle(manifest, shownComparison.rightLayerId)}
                bounds={shownBounds}
                onReady={() => setCompareReady(true)}
              />
            </div>
          )}
        </div>
        <div className="story__legend-strip" ref={setLegendTarget} role="region" aria-label="Visible layer legends">
          {!exploring && legend}
        </div>
      </div>

      {stacked && (
        <div className="story__sheet" role="region" aria-live="polite" aria-label="About this view">
          <p className="story__sheet-act">{steps[active].act.title}</p>
          <div className="story__sheet-body" key={steps[active].step.id}>
            {stepContent(steps[active])}
          </div>
        </div>
      )}
    </div>
  );
}
