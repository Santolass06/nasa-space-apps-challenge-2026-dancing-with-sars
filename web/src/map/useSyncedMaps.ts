import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect } from "react";

/**
 * Keep the cameras of several maps identical: move one and the others follow.
 * The equality check is what stops the loop (a jumpTo fires "move" on the
 * others, and the second pass finds nothing to change).
 */
export function useSyncedMaps(maps: Array<MapLibreMap | null>): void {
  useEffect(() => {
    const ready = maps.filter((map): map is MapLibreMap => map !== null);
    if (ready.length < 2) {
      return;
    }
    const follow = (from: MapLibreMap) => () => {
      const a = from.getCenter();
      for (const to of ready) {
        if (to === from) {
          continue;
        }
        const b = to.getCenter();
        if (
          Math.abs(a.lng - b.lng) < 1e-9 &&
          Math.abs(a.lat - b.lat) < 1e-9 &&
          Math.abs(from.getZoom() - to.getZoom()) < 1e-9
        ) {
          continue;
        }
        to.jumpTo({
          center: a,
          zoom: from.getZoom(),
          bearing: from.getBearing(),
          pitch: from.getPitch(),
        });
      }
    };
    const handlers = ready.map((map) => [map, follow(map)] as const);
    for (const [map, handler] of handlers) {
      map.on("move", handler);
    }
    return () => {
      for (const [map, handler] of handlers) {
        map.off("move", handler);
      }
    };
    // `maps` is a fresh array each render; its members decide when to re-attach.
  }, [...maps]);
}
