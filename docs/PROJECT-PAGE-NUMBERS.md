# Numbers for the project page

Every number the project page may quote, with the file it comes from. Generated from
`web/public/layers/stats.json`, `progress.geojson` and `manifest.json` on 2026-11-15; if one of
those files changes, regenerate this table before the page is written (task V4, #90).

The page must show the same values as the app. The app reads its numbers from these same
files, so copy from here, never from memory or from an older document.

| Value | Number | Source |
| --- | --- | --- |
| Radar scar area (ours) | 13,501.0 ha | `stats.json` `our_area_ha` |
| Official perimeter area (ICNF file) | 12,819.8 ha | `stats.json` `official_area_ha` |
| Official area in the ICNF report | 12,828.9 ha | ICNF REE_2026_004, p. 6 (the perimeter file measures 12,819.8 ha: method difference) |
| Overlap, share of the official area | 94.8% | `stats.json` `overlap_pct_of_official` |
| Overlap, share of our area | 90.0% | `stats.json` `overlap_pct_of_ours` |
| Burned area by 4 July (estimate) | 6,831.3 ha | `progress.geojson`, phase `during` |
| Final scar in the progression | 13,501.0 ha | `progress.geojson`, phase `after` |
| Detection threshold | -0.25 on the coherence difference | `stats.json` `method` |
| Fire pair (coherence) | D52, 2026-06-29 to 2026-07-11 | `manifest.json` `coh_D52_20260629_20260711` |
| Control pair (coherence) | D52, 2026-07-11 to 2026-07-23 | `manifest.json` `coh_D52_20260711_20260723` |
| Coherence inside the scar, fire pair / control pair | 0.28 / 0.70 | `stats.json` `act4.coherence` |
| Coherence outside the scar, fire pair / control pair | 0.53 / 0.63 | `stats.json` `act4.coherence` |
| HV change inside / outside the scar | -0.67 dB / -0.27 dB | `stats.json` `act4.backscatter_db.hv` |
| HH change inside / outside the scar | -0.27 dB / -0.14 dB | `stats.json` `act4.backscatter_db.hh` |
| HV change inside the scar relative to HH | 2.5 times | computed from the two rows above |
| Orbits used | A116, A15, D124, D52 | `manifest.json` |
| Layers in the app | 18 | `manifest.json` |

## Fixed facts (not measured by us)

| Fact | Value | Source |
| --- | --- | --- |
| Fire dates | 2 to 5 July 2026 | ICNF REE_2026_004, `docs/DOSSIER.md` |
| NISAR band and wavelength | L-band, about 24 cm | `docs/DOSSIER.md` |
| NISAR repeat of one orbit | 12 days | `docs/DOSSIER.md` |
| Study area | Vouzela / Serra do Caramulo, Portugal | `docs/DOSSIER.md` |

## Wording to keep

- The standing-trunk explanation is a hypothesis, not a result (the app says "one possible reason").
- Low coherence also occurs over water and dense forest.
- The detection threshold was calibrated against the official area, so the closeness of the two
  totals is partly by construction; the overlap is the independent evidence.
