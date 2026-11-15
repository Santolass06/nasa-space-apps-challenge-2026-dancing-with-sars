import type { Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";

import LayerChooser from "./LayerChooser";
import MapView from "./MapView";
import { LayerManager } from "./layers";
import { loadManifest, type Manifest } from "./manifest";
import { useSyncedMaps } from "./useSyncedMaps";

type Props = {
  manifest: Manifest;
  /** One layer id per quarter: top-left, top-right, bottom-left, bottom-right. */
  ids: string[];
  onChange: (quarter: number, id: string) => void;
  /** Passed to every map (#82): see MapView. */
  cooperativeGestures?: boolean;
};

/** Each quarter of the picture is the part of its own map the point leaves to it. */
const clip = (quarter: number, x: number, y: number): string => {
  switch (quarter) {
    case 0:
      return `inset(0 ${100 - x}% ${100 - y}% 0)`;
    case 1:
      return `inset(0 0 ${100 - y}% ${x}%)`;
    case 2:
      return `inset(${y}% ${100 - x}% 0 0)`;
    default:
      return `inset(${y}% 0 0 ${x}%)`;
  }
};

/**
 * One map, four layers: a point sits in the middle and splits the picture into
 * four quarters, one layer each. Drag the point anywhere to give one layer more
 * room and the others less. Four synchronised maps lie on top of each other and
 * each shows only its quarter; panning or zooming any of them moves all four.
 */
export default function QuadView({ manifest, ids, onChange, cooperativeGestures }: Props) {
  const [maps, setMaps] = useState<Array<MapLibreMap | null>>([null, null, null, null]);
  const [point, setPoint] = useState({ x: 50, y: 50 });
  const managers = useRef<Array<LayerManager | null>>([null, null, null, null]);
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const dragging = useRef(false);
  const container = useRef<HTMLDivElement>(null);

  const makeReady = useCallback(
    (quarter: number) => (map: MapLibreMap) => {
      loadManifest()
        .then((loaded) => {
          const layers = new LayerManager(map, loaded);
          managers.current[quarter] = layers;
          layers.showLayers([idsRef.current[quarter]]);
          layers.flyTo(undefined, { instant: true });
          setMaps((current) => current.map((m, i) => (i === quarter ? map : m)));
        })
        .catch((error: unknown) => console.error("quad", error));
    },
    [],
  );

  useEffect(() => {
    managers.current.forEach((layers, quarter) => layers?.showLayers([ids[quarter]]));
  }, [ids, maps]);

  useSyncedMaps(maps);

  const moveTo = (clientX: number, clientY: number) => {
    const box = container.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) {
      return;
    }
    const x = ((clientX - box.left) / box.width) * 100;
    const y = ((clientY - box.top) / box.height) * 100;
    setPoint({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
  };

  // Corner of the picture where each quarter's layer chooser sits.
  const corners = ["tl", "tr", "bl", "br"] as const;

  return (
    <div ref={container} className="quad">
      {[0, 1, 2, 3].map((quarter) => (
        <div
          className="quad__pane"
          key={quarter}
          style={{ clipPath: clip(quarter, point.x, point.y) }}
        >
          <MapView className="quad__map" onReady={makeReady(quarter)} cooperativeGestures={cooperativeGestures} />
        </div>
      ))}
      <div className="quad__line quad__line--v" style={{ left: `${point.x}%` }} aria-hidden="true" />
      <div className="quad__line quad__line--h" style={{ top: `${point.y}%` }} aria-hidden="true" />
      {corners.map((corner, quarter) => (
        <div className={`quad__chooser quad__chooser--${corner}`} key={corner}>
          <LayerChooser
            manifest={manifest}
            value={ids[quarter]}
            onChange={(id) => onChange(quarter, id)}
            tipsAbove={corner.startsWith("b")}
            tipsRight={corner.endsWith("r")}
          />
        </div>
      ))}
      <div
        className="quad__handle"
        style={{ left: `${point.x}%`, top: `${point.y}%` }}
        role="application"
        tabIndex={0}
        aria-label="Divider point: drag it, or use the arrow keys, to share the picture between the four layers"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          dragging.current = true;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Synthetic events (and some browsers) have no pointer to capture.
          }
          moveTo(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (dragging.current) {
            moveTo(event.clientX, event.clientY);
          }
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 10 : 2;
          const move: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, -step],
            ArrowDown: [0, step],
          };
          const delta = move[event.key];
          if (delta) {
            event.preventDefault();
            setPoint((p) => ({
              x: Math.min(100, Math.max(0, p.x + delta[0])),
              y: Math.min(100, Math.max(0, p.y + delta[1])),
            }));
          }
        }}
      />
    </div>
  );
}
