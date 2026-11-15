import raw from "../content/story.en.json";
import type { Bounds } from "../map/manifest";

/** The story contract (docs/CONTRACT.md): acts → steps, each step drives the map. */
export type StoryLayerRef = { id: string; caption: string };

export type Comparison = { leftLayerId: string; rightLayerId: string };

export type Step = {
  id: string;
  text: string;
  layers: StoryLayerRef[];
  mapView?: { bounds: Bounds };
  comparisons?: Comparison[];
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

const VECTOR_IDS = ["burn_nisar", "burn_official", "progress"] as const;

export type VectorRef = (typeof VECTOR_IDS)[number];

export function isVector(id: string): id is VectorRef {
  return (VECTOR_IDS as readonly string[]).includes(id);
}

/** "places" is drawn as HTML markers, not as a raster or a perimeter. */
export const PLACES_ID = "places";
