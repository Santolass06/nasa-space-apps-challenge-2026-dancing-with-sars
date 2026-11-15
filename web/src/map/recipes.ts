import type { Manifest } from "./manifest";

/** A ready-made set of layers to compare, so nobody has to guess a good combination. */
export type Recipe = {
  name: string;
  /** What looking at these together shows. */
  why: string;
  ids: string[];
};

const ALL: Recipe[] = [
  {
    name: "Before and after, in sunlight",
    why: "The same ground in natural colour before and after the fire.",
    ids: ["s2_20260629", "s2_20260709"],
  },
  {
    name: "Optical and radar",
    why: "What the eye sees next to what the radar sees, on the same day.",
    ids: ["s2_20260629", "hh_D52_20260629"],
  },
  {
    name: "Fire and calm, in coherence",
    why: "Coherence across the fire dates next to a calm pair afterwards.",
    ids: ["coh_D52_20260629_20260711", "coh_D52_20260711_20260723"],
  },
  {
    name: "Four ways to see the fire",
    why: "Optical, HH, HV and coherence, all after the fire.",
    ids: ["s2_20260709", "hh_D52_20260711", "hv_D52_20260711", "coh_D52_20260629_20260711"],
  },
  {
    name: "Radar before and after, HH and HV",
    why: "HV (vegetation) moves more than HH (surfaces) where the forest burned.",
    ids: ["hh_D52_20260629", "hh_D52_20260711", "hv_D52_20260629", "hv_D52_20260711"],
  },
  {
    name: "Coherence through time",
    why: "Before, during, after and months after: where the signal recovers.",
    ids: [
      "coh_D52_20260617_20260629",
      "coh_D52_20260629_20260711",
      "coh_D52_20260711_20260723",
      "coh_D52_20261003_20261015",
    ],
  },
];

/** The recipes with `count` layers whose ids all exist in the manifest. */
export function recipesFor(manifest: Manifest, count: 2 | 4): Recipe[] {
  const known = new Set(manifest.layers.map((layer) => layer.id));
  return ALL.filter(
    (recipe) => recipe.ids.length === count && recipe.ids.every((id) => known.has(id)),
  );
}
