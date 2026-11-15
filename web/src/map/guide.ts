import type { LayerKind } from "./manifest";

/** Plain-language help for each kind of layer, shown when the reader hovers it. */
export type KindGuide = {
  /** Short name for menus. */
  name: string;
  /** What this kind of layer usually reveals. */
  reveals: string;
  /** How to read its colours. */
  read: string;
};

export const KIND_GUIDE: Record<LayerKind, KindGuide> = {
  coh: {
    name: "Coherence",
    reveals:
      "Where the ground changed between two radar passes. Fire, clearing, floods and landslides lower it; unchanged ground keeps it high.",
    read: "Orange is low coherence (changed). Clear means the ground stayed the same. Water and dense forest also score low.",
  },
  hh: {
    name: "HH backscatter",
    reveals:
      "How strongly the surface sends the radar back (horizontal in, horizontal out). Good for surfaces: calm water is dark, bare ground and buildings are bright.",
    read: "Dark purple is a weak echo, yellow is a strong echo.",
  },
  hv: {
    name: "HV backscatter",
    reveals:
      "The echo that comes back turned (horizontal in, vertical out). It comes mostly from vegetation, so it shows forest structure and, after a fire, lost canopy.",
    read: "Dark purple is a weak echo, yellow is a strong echo.",
  },
  s2: {
    name: "Optical (Sentinel-2)",
    reveals:
      "What the area looks like to the eye, in sunlight. Good for context and for checking the radar against something familiar. Clouds block it.",
    read: "Natural colour, like a photograph from space.",
  },
  dhh: {
    name: "HH change",
    reveals:
      "How much the HH echo changed between two dates. Useful for spotting where the surface was altered.",
    read: "Blue means weaker after, red means stronger after. Over most of the scene the change is small, so read the pattern, not single pixels.",
  },
  dhv: {
    name: "HV change",
    reveals:
      "How much the HV echo changed between two dates. Because HV follows vegetation, it is the more sensitive of the two for a burned forest.",
    read: "Blue means weaker after, red means stronger after.",
  },
  rgb: {
    name: "Colour composite",
    reveals:
      "Three radar measurements in one image (red is HH, green is HV, blue is their ratio), so different surfaces get different colours at a glance.",
    read: "A colour image made from radar, not a photograph: look for patches that change colour between dates.",
  },
};

export const kindName = (kind: string): string =>
  (KIND_GUIDE as Record<string, KindGuide | undefined>)[kind]?.name ?? kind;
