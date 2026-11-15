import type { Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";

import LayerChooser from "./LayerChooser";
import MapView from "./MapView";
import { LayerManager } from "./layers";
import { loadManifest, type Manifest } from "./manifest";
import { useSyncedMaps } from "./useSyncedMaps";

type Props = {
  manifest: Manifest;
  /** One layer id per panel (four). */
  ids: string[];
  onChange: (panel: number, id: string) => void;
};

/**
 * Four maps in a 2×2 grid (the expanded view's alternative to the split point), each with its own layer, all sharing one camera:
 * pan or zoom any of them and the others follow.
 */
export default function GridView({ manifest, ids, onChange }: Props) {
  const [maps, setMaps] = useState<Array<MapLibreMap | null>>([null, null, null, null]);
  const managers = useRef<Array<LayerManager | null>>([null, null, null, null]);
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const makeReady = useCallback(
    (panel: number) => (map: MapLibreMap) => {
      loadManifest()
        .then((loaded) => {
          const layers = new LayerManager(map, loaded);
          managers.current[panel] = layers;
          layers.showLayers([idsRef.current[panel]]);
          layers.flyTo(undefined, { instant: true });
          setMaps((current) => current.map((m, i) => (i === panel ? map : m)));
        })
        .catch((error: unknown) => console.error("grid", error));
    },
    [],
  );

  useEffect(() => {
    managers.current.forEach((layers, panel) => layers?.showLayers([ids[panel]]));
  }, [ids, maps]);

  useSyncedMaps(maps);

  return (
    <div className="grid4">
      {[0, 1, 2, 3].map((panel) => (
        <div className="grid4__panel" key={panel}>
          <MapView className="grid4__map" onReady={makeReady(panel)} />
          <div className="grid4__chooser">
            <LayerChooser
              manifest={manifest}
              value={ids[panel]}
              onChange={(id) => onChange(panel, id)}
              tipsAbove={panel >= 2}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
