import { useState } from "react";

import LayerChooser from "./LayerChooser";
import type { Manifest } from "./manifest";

type Props = {
  manifest: Manifest;
  onPick: (id: string) => void;
};

/**
 * C5 — pick a layer type and a date, straight from the manifest.
 * Changing the selection redraws the map; the page never reloads.
 */
export default function LayerPicker({ manifest, onPick }: Props) {
  const [id, setId] = useState(manifest.layers[0]?.id ?? "");
  return (
    <div className="picker">
      <LayerChooser
        manifest={manifest}
        value={id}
        onChange={(next) => {
          setId(next);
          onPick(next);
        }}
      />
    </div>
  );
}
