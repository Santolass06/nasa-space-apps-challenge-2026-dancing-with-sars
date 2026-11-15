import { useMemo, useState } from "react";

import type { Manifest } from "./manifest";

const KIND_LABEL: Record<string, string> = {
  coh: "Coherence",
  hh: "HH backscatter",
  hv: "HV backscatter",
  s2: "Optical (Sentinel-2)",
  dhh: "HH change",
  dhv: "HV change",
  rgb: "HH/HV/ratio colour",
};

type Props = {
  manifest: Manifest;
  onPick: (id: string) => void;
};

/**
 * C5 — pick a layer type and a date, straight from the manifest.
 * Changing the selection redraws the map; the page never reloads.
 */
export default function LayerPicker({ manifest, onPick }: Props) {
  const kinds = useMemo(() => {
    const seen: string[] = [];
    for (const layer of manifest.layers) {
      if (!seen.includes(layer.kind)) {
        seen.push(layer.kind);
      }
    }
    return seen;
  }, [manifest]);

  const [kind, setKind] = useState(kinds[0] ?? "coh");
  const [id, setId] = useState(manifest.layers.find((layer) => layer.kind === kind)?.id ?? "");

  const options = manifest.layers.filter((layer) => layer.kind === kind);

  return (
    <div className="picker" role="group" aria-label="Layer picker">
      <label className="picker__field">
        <span>Type</span>
        <select
          value={kind}
          onChange={(event) => {
            const next = event.target.value;
            setKind(next);
            const first = manifest.layers.find((layer) => layer.kind === next);
            if (first) {
              setId(first.id);
              onPick(first.id);
            }
          }}
        >
          {kinds.map((value) => (
            <option key={value} value={value}>
              {KIND_LABEL[value] ?? value}
            </option>
          ))}
        </select>
      </label>

      <label className="picker__field">
        <span>Layer</span>
        <select
          value={id}
          onChange={(event) => {
            setId(event.target.value);
            onPick(event.target.value);
          }}
        >
          {options.map((layer) => (
            <option key={layer.id} value={layer.id}>
              {layer.title}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
