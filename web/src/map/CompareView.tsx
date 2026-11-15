import type { Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import MapView from "./MapView";
import { LayerManager } from "./layers";
import { loadManifest, type Bounds } from "./manifest";

type Props = {
  /** Manifest layer ids to compare: left side and right side. */
  before: string;
  after: string;
  beforeLabel: ReactNode;
  afterLabel: ReactNode;
  /** The labels hold controls (a layer chooser), so they must take clicks. */
  interactiveLabels?: boolean;
  /** Where to frame both maps; changing it eases the camera there. */
  bounds?: Bounds;
  /** Called once, when both maps have drawn their first frame. */
  onReady?: () => void;
  className?: string;
};

/**
 * Before/after slider (C2): two synchronised maps, the right one clipped.
 *
 * No plugin: two MapLibre instances keep their cameras in step, and a CSS
 * `clip-path` on the top pane reveals the bottom one. Only the handle moves the
 * split (drag it, or use the arrow keys); dragging anywhere else pans the maps.
 * The handle sits above both maps and captures the pointer, so grabbing it never
 * grabs the map underneath.
 */
export default function CompareView({
  before,
  after,
  beforeLabel,
  afterLabel,
  interactiveLabels,
  bounds,
  onReady,
  className,
}: Props) {
  const [maps, setMaps] = useState<[MapLibreMap | null, MapLibreMap | null]>([null, null]);
  const managers = useRef<[LayerManager | null, LayerManager | null]>([null, null]);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const ids = useRef({ before, after });
  ids.current = { before, after };
  const frame = useRef(bounds);
  frame.current = bounds;
  const [split, setSplit] = useState(50);
  const dragging = useRef(false);
  const container = useRef<HTMLDivElement>(null);

  // Each map is built once; the layer pair and the framing are applied by the
  // effects below, so moving between comparisons never rebuilds anything.
  const makeReady = useCallback(
    (side: 0 | 1) => (map: MapLibreMap) => {
      loadManifest()
        .then((manifest) => {
          const layers = new LayerManager(map, manifest);
          managers.current[side] = layers;
          layers.showLayers([side === 0 ? ids.current.before : ids.current.after]);
          layers.flyTo(frame.current, { instant: true });
          setMaps((current) => {
            const next: [MapLibreMap | null, MapLibreMap | null] = [...current];
            next[side] = map;
            return next;
          });
        })
        .catch((error: unknown) => console.error("compare", error));
    },
    [],
  );

  useEffect(() => {
    managers.current[0]?.showLayers([before]);
    managers.current[1]?.showLayers([after]);
  }, [before, after, maps]);

  // The right map follows the left one's camera (below), so only the left is moved.
  useEffect(() => {
    managers.current[0]?.flyTo(bounds);
  }, [bounds, maps]);

  // Report readiness once both maps have drawn: the overlay fades in after that.
  useEffect(() => {
    const [left, right] = maps;
    if (!left || !right) {
      return;
    }
    let remaining = 2;
    const done = () => {
      remaining -= 1;
      if (remaining === 0) {
        readyRef.current?.();
      }
    };
    left.once("idle", done);
    right.once("idle", done);
  }, [maps]);

  // Keep the two cameras identical. The comparison is what stops the loop:
  // jumpTo() re-fires "move" on the other map, and the second pass is a no-op.
  useEffect(() => {
    const [left, right] = maps;
    if (!left || !right) {
      return;
    }
    const follow = (from: MapLibreMap, to: MapLibreMap) => () => {
      const a = from.getCenter();
      const b = to.getCenter();
      const same =
        Math.abs(a.lng - b.lng) < 1e-9 &&
        Math.abs(a.lat - b.lat) < 1e-9 &&
        Math.abs(from.getZoom() - to.getZoom()) < 1e-9;
      if (same) {
        return;
      }
      to.jumpTo({
        center: from.getCenter(),
        zoom: from.getZoom(),
        bearing: from.getBearing(),
        pitch: from.getPitch(),
      });
    };
    const leftFollows = follow(left, right);
    const rightFollows = follow(right, left);
    left.on("move", leftFollows);
    right.on("move", rightFollows);
    return () => {
      left.off("move", leftFollows);
      right.off("move", rightFollows);
    };
  }, [maps]);

  const moveTo = (clientX: number) => {
    const box = container.current?.getBoundingClientRect();
    if (!box || box.width === 0) {
      return;
    }
    const percent = ((clientX - box.left) / box.width) * 100;
    setSplit(Math.min(100, Math.max(0, percent)));
  };

  return (
    <div ref={container} className={`compare ${className ?? ""}`}>
      <MapView className="compare__map" onReady={makeReady(0)} />
      <div className="compare__top" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
        <MapView className="compare__map" onReady={makeReady(1)} />
      </div>
      <div
        className="compare__handle"
        style={{ left: `${split}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Comparison divider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(split)}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          dragging.current = true;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Synthetic events (and some browsers) have no pointer to capture.
          }
          moveTo(event.clientX);
        }}
        onPointerMove={(event) => {
          if (dragging.current) {
            moveTo(event.clientX);
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
          if (event.key === "ArrowLeft") {
            setSplit((value) => Math.max(0, value - step));
          } else if (event.key === "ArrowRight") {
            setSplit((value) => Math.min(100, value + step));
          }
        }}
      />
      <div
        className={`compare__label compare__label--left${interactiveLabels ? " is-interactive" : ""}`}
      >
        {beforeLabel}
      </div>
      <div
        className={`compare__label compare__label--right${interactiveLabels ? " is-interactive" : ""}`}
      >
        {afterLabel}
      </div>
    </div>
  );
}
