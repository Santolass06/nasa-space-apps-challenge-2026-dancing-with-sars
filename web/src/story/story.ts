import raw from "../content/story.en.json";
import type { Bounds } from "../map/manifest";

/** The story contract (docs/CONTRACT.md): acts → steps, each step drives the map. */
export type StoryLayerRef = { id: string; caption: string };

export type Comparison = { leftLayerId: string; rightLayerId: string };

/** An image that takes over the map for a step, with the credit its licence asks for. */
export type Figure = {
  /** Path under `public/`, e.g. "figures/x.jpg". */
  src: string;
  alt: string;
  caption: string;
  credit: string;
  licence: string;
  licenceUrl: string;
  sourceUrl: string;
};

/**
 * A zone to look at closely: the map widens, zooms to `bounds` and outlines it
 * with `label`. The text of the step explains what the reader is looking at.
 */
export type Focus = {
  bounds: Bounds;
  label: string;
  /** What the camera frames, when the reader needs more of the surroundings than the zone itself. */
  view?: Bounds;
};

export type Step = {
  id: string;
  text: string;
  layers: StoryLayerRef[];
  mapView?: { bounds: Bounds };
  comparisons?: Comparison[];
  figure?: Figure;
  focus?: Focus;
  sources?: string[];
};

export type Act = { id: string; title: string; steps: Step[] };

export type Story = { acts: Act[] };

export type FlatStep = { index: number; act: Act; step: Step };

export const story = raw as Story;

/** The six acts as one flat list, so a scroll position maps to one step. */
export function flatten(): FlatStep[] {
  const flat: FlatStep[] = [];
  for (const act of story.acts) {
    for (const step of act.steps) {
      flat.push({ index: flat.length, act, step });
    }
  }
  return flat;
}

const VECTOR_IDS = ["burn_nisar", "burn_official"] as const;

export type VectorRef = (typeof VECTOR_IDS)[number];

export function isVector(id: string): id is VectorRef {
  return (VECTOR_IDS as readonly string[]).includes(id);
}

/** "places" is drawn as HTML markers, not as a raster or a perimeter. */
export const PLACES_ID = "places";

/** What the reader sees for the layers that are not in the manifest. */
export const OVERLAY_TITLES: Record<string, string> = {
  [PLACES_ID]: "Places",
  burn_official: "Official burn perimeter (ICNF)",
  burn_nisar: "Burn perimeter from NISAR coherence",
};
