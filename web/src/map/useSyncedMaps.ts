import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect } from "react";

/**
 * Keep the cameras of several maps identical: move one and the others follow.
 * The equality check is what stops the loop (a jumpTo fires "move" on the
 * others, and the second pass finds nothing to change).
 *
 * The copy waits for the next frame. When the story's frame changes width it resizes every
 * map of the group at once and each one shifts its own camera so its ground stays still;
 * copied from one map in the middle of that, a twin that had not shifted yet would write its
 * old camera back over the corrected one and the picture slid by half the frame change. A
 * frame later both have shifted, their cameras agree, and there is nothing to copy.
 */
export function useSyncedMaps(maps: Array<MapLibreMap | null>): void {
  useEffect(() => {
    const ready = maps.filter((map): map is MapLibreMap => map !== null);
    if (ready.length < 2) {
      return;
    }
    let scheduled = 0;
    const copy = (from: MapLibreMap) => {
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
    const follow = (from: MapLibreMap) => () => {
      // One copy per frame: the first map to move is the one the others follow.
      if (scheduled) {
        return;
      }
      scheduled = requestAnimationFrame(() => {
        scheduled = 0;
        copy(from);
      });
    };
    const handlers = ready.map((map) => [map, follow(map)] as const);
    for (const [map, handler] of handlers) {
      map.on("move", handler);
    }
    return () => {
      cancelAnimationFrame(scheduled);
      for (const [map, handler] of handlers) {
        map.off("move", handler);
      }
    };
    // `maps` is a fresh array each render; its members decide when to re-attach.
  }, [...maps]);
}
