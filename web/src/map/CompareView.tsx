import type { Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";

import MapView from "./MapView";
import { LayerManager } from "./layers";
import { loadManifest } from "./manifest";

type Props = {
  /** Manifest layer ids to compare: left side and right side. */
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
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
  className,
}: Props) {
  const [maps, setMaps] = useState<[MapLibreMap | null, MapLibreMap | null]>([null, null]);
  const [split, setSplit] = useState(50);
  const dragging = useRef(false);
  const container = useRef<HTMLDivElement>(null);

  const makeReady = useCallback(
    (id: string, side: 0 | 1) => (map: MapLibreMap) => {
      loadManifest()
        .then((manifest) => {
          const layers = new LayerManager(map, manifest);
          layers.showLayers([id]);
          layers.flyTo();
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
      <MapView className="compare__map" onReady={makeReady(before, 0)} />
      <div className="compare__top" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
        <MapView className="compare__map" onReady={makeReady(after, 1)} />
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
      <span className="compare__label compare__label--left">{beforeLabel}</span>
      <span className="compare__label compare__label--right">{afterLabel}</span>
    </div>
  );
}
