import type { Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import CompareView from "../map/CompareView";
import LayerPicker from "../map/LayerPicker";
import Legend from "../map/Legend";
import MapView from "../map/MapView";
import { LayerManager } from "../map/layers";
import { loadManifest, type Layer, type Manifest } from "../map/manifest";
import {
  flatten,
  isVector,
  OVERLAY_TITLES,
  PLACES_ID,
  story,
  type FlatStep,
  type Step,
} from "./story";
import { hectares, loadStats, type Polarization, type Stats } from "./stats";

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
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const managerRef = useRef<LayerManager | null>(null);
  const [compareReady, setCompareReady] = useState(false);
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

  const applyStep = useCallback((manager: LayerManager, step: Step) => {
    const rasters: string[] = [];
    const vectors: Array<"burn_nisar" | "burn_official"> = [];
    let places = false;
    for (const ref of step.layers) {
      if (ref.id === PLACES_ID) {
        places = true;
      } else if (isVector(ref.id)) {
        vectors.push(ref.id);
      } else {
        rasters.push(ref.id);
      }
    }
    manager.showLayers(rasters);
    manager.showVector(vectors);
    manager.showPlaces(places);
    if (step.mapView?.bounds) {
      manager.flyTo(step.mapView.bounds, { instant: !framed.current });
      framed.current = true;
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
            setMainIdle(true);
            void manager.preload(preloadOrder(steps, activeRef.current, manager.ids()));
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

  const current = steps[active] ?? steps[0];
  const comparison = current?.step.comparisons?.[0];
  // The comparison maps are built once and kept: the overlay fades in and out,
  // and switching pairs is a cross-fade inside it. Until the reader reaches the
  // first comparison they are built in the background from the first one.
  const lastComparison = useRef(steps.find((item) => item.step.comparisons?.length));
  if (comparison && current) {
    lastComparison.current = current;
  }
  const shownComparison = lastComparison.current?.step.comparisons?.[0];
  const shownBounds = lastComparison.current?.step.mapView?.bounds;

  // C3: one legend per raster layer the step shows (at most two), or the one
  // the reader picked in the final step.
  const pickedLayer = picked ? manifest?.layers.find((layer) => layer.id === picked) : undefined;
  const legendLayers: Layer[] = pickedLayer
    ? [pickedLayer]
    : current
      ? current.step.layers
          .map((ref) => manifest?.layers.find((layer) => layer.id === ref.id))
          .filter((layer): layer is Layer => Boolean(layer))
          .slice(0, 2)
      : [];

  // Drive the single map. Comparison steps draw their own pair instead.
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || comparison || !current) {
      return;
    }
    applyStep(manager, current.step);
    setPicked(null);
  }, [active, comparison, applyStep, current]);

  return (
    <div className="story">
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
                    {item.index === active && act.id === "scar" && stats && (
                      <StatsPanel stats={stats} />
                    )}
                    {item.index === active && act.id === "radar" && stats?.act4 && (
                      <Act4Panel act4={stats.act4} />
                    )}
                  </div>
                </article>
              ))}
          </section>
        ))}
      </div>

      <div className="story__map">
        <MapView className="story__map-view" onReady={onMapReady} />
        {(legendLayers.length > 0 || (current?.step.id === "explore-the-map" && manifest)) && (
          <div className="map-hud">
            {current?.step.id === "explore-the-map" && manifest && (
              <LayerPicker
                manifest={manifest}
                onPick={(id) => {
                  managerRef.current?.showLayers([id]);
                  setPicked(id);
                }}
              />
            )}
            {legendLayers.length > 0 && (
              <div className="legend-stack">
                {legendLayers.map((layer) => (
                  <Legend key={layer.id} layer={layer} />
                ))}
              </div>
            )}
          </div>
        )}
        {shownComparison && mainIdle && (
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
    </div>
  );
}
