import { layersBase } from "../map/manifest";

/** The pipeline's numbers (web/public/layers/stats.json). Nothing is typed by hand. */
export type Stats = {
  our_area_ha: number;
  official_area_ha: number;
  overlap_ha: number;
  overlap_pct_of_official: number;
  overlap_pct_of_ours: number;
  act4: {
    dates: { before: string; after: string };
    backscatter_db: {
      hh: Polarization;
      hv: Polarization;
    };
    coherence: {
      fire: { inside: number; outside: number };
      control: { inside: number; outside: number };
    };
    answer: string;
  };
};

export type Polarization = {
  before: { inside: number; outside: number };
  after: { inside: number; outside: number };
  change_inside_db: number;
  change_outside_db: number;
};

let cached: Promise<Stats> | undefined;

export function loadStats(): Promise<Stats> {
  cached ??= (async () => {
    const url = `${layersBase()}stats.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`stats: HTTP ${response.status} at ${url}`);
    }
    return (await response.json()) as Stats;
  })();
  return cached;
}

/** 13501 → "13,501" (the UI is English). */
export const hectares = (value: number) => value.toLocaleString("en-GB", { maximumFractionDigits: 1 });
