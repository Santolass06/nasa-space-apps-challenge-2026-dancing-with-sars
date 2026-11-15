# Caramulo em chamas

**NASA Space Apps Challenge 2026: *Dancing with the SARs*.** The largest wildfire of
Portugal's 2026 season, told with NISAR radar.

[![CI](https://github.com/Santolass06/nasa-space-apps-challenge-2026-dancing-with-sars/actions/workflows/ci.yml/badge.svg)](https://github.com/Santolass06/nasa-space-apps-challenge-2026-dancing-with-sars/actions/workflows/ci.yml)

An open-source, interactive web story about the **Vouzela / Serra do Caramulo wildfire**
(2-5 July 2026, 12,829 ha burned per ICNF) built only with radar remote sensing from the
**NASA-ISRO NISAR** mission: what happened, how the L-band radar saw it through the smoke, and
what came after.

- **Live demo:** <https://santolass06.github.io/nasa-space-apps-challenge-2026-dancing-with-sars/>
- **Challenge:** [Dancing with the SARs](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/)
- **Event:** 14-15 November 2026
- **License:** [Apache-2.0](LICENSE)

## What you get

A scroll-driven story in six acts (before the fire, the fire, the scar, how radar sees change,
after the fire, what comes next), then a free-exploration mode: every layer and date, one, two
or four synchronised maps, and a before/after slider. The numbers we measured (areas, overlap,
backscatter and coherence changes) are read from `web/public/layers/stats.json`, written by the
pipeline, never typed by hand.

## The science in short

- **Why radar.** NISAR is an L-band (24 cm) radar. It works through smoke and cloud and its
  long wavelength reaches trunks and branches, not only the canopy top.
- **Coherence finds the scar.** Two passes of the same orbit stay coherent while the ground is
  unchanged. Inside the burn they do not. Subtracting a control pair (11 to 23 July) from the
  fire pair (29 June to 11 July) and thresholding it traces a scar of about 13,500 ha that
  overlaps about 95% of the official ICNF perimeter. Exact figures: `stats.json`.
- **Brightness barely sees it.** HH and HV backscatter change little between the same dates;
  HV (volume scattering) drops about 2.5 times more than HH inside the scar. That contrast is
  the radar finding, and it is a modest one.
- **What is a hypothesis.** Why some burned areas still look bright (standing trunks may keep
  reflecting the radar) is worded in the app as "one possible reason", not as a result.
- **Limits we state.** Low coherence also occurs over water and dense forest. The detection
  threshold was calibrated against the official area, so the closeness of the two totals is
  partly by construction; the overlap is the independent evidence. Claims are reviewed in
  [`docs/STORY-VALIDATION.md`](docs/STORY-VALIDATION.md).

## How it works

Two halves that only touch through files, so nothing can fail during the demo:

1. **`pipeline/`** — offline Python. Downloads NISAR GUNW (coherence) and GCOV (HH/HV
   backscatter) products, puts them on one common grid, and writes PNG layers, GeoJSON and a
   `manifest.json` to `web/public/layers/`.
2. **`web/`** — a static React app (Vite, TypeScript, MapLibre) that reads the manifest and tells
   the story in six acts: before, the fire, the scar, why radar sees it, afterwards, what next.

The data contract between them is in [`docs/CONTRACT.md`](docs/CONTRACT.md).

## Repository layout

```
.
├── pipeline/         # Python pipeline (uv): fetch, gunw, gcov, s2, burn, series, export
├── web/              # Static app: map, story, explore, content
│   └── public/layers/  # pipeline output read by the app (versioned)
├── data/             # Raw and intermediate data (not versioned)
├── docs/             # Dossier, plan, contract, products, decisions, AI use, challenge, rules
├── AGENTS.md         # Instructions for AI agents
└── Makefile          # setup, dev, lint, check
```

## Quick start

Requirements: [uv](https://docs.astral.sh/uv/), Node.js 20+, and a free
[NASA Earthdata](https://urs.earthdata.nasa.gov/) account to download data.

```bash
make install      # uv sync + npm install
make dev-web      # http://localhost:5173
make check        # what CI runs
```

Search the NISAR products over the fire (no download, no login needed):

```bash
cd pipeline
uv run python -m caramulo.fetch --start 2026-06-17 --end 2026-07-25 --dry-run
```

Reproduce every layer from the raw NISAR products. They go in `data/raw`: fetch them with the
same command without `--dry-run`, using your Earthdata credentials (`EARTHDATA_USERNAME` and
`EARTHDATA_PASSWORD`, or a `~/.netrc` entry). Then:

```bash
cd pipeline
uv run python run.py --plan     # lists the steps and what each reads; writes nothing
uv run python run.py --real     # runs them in contract order and rebuilds manifest.json
uv run python run.py --real --s2   # also the Sentinel-2 true-colour layers (needs network)
```

Download them and rebuild every layer from the raw products:

```bash
cd pipeline
uv run python -m caramulo.fetch --start 2026-06-17 --end 2026-10-16   # ~25 GB into data/raw
uv run python run.py --plan   # the steps a full run would take, and with which products
uv run python run.py --real   # coherence, backscatter, change, perimeter, progression, numbers
uv run python run.py --real --s2   # also the Sentinel-2 optical layers (needs the network)
```

`run.py --real` reads the orbit and the dates from the NISAR file names, so it needs no
product table; each step prints what it reads and writes, and re-running one step leaves
the manifest in the same order. The HDF5 paths each step uses are in
[`docs/CONTRACT.md`](docs/CONTRACT.md), the products in
[`docs/PRODUCTS.md`](docs/PRODUCTS.md).

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/DOSSIER.md`](docs/DOSSIER.md) | The problem, the radar, the case and the shared values (area, dates, orbits) |
| [`docs/PLAN.md`](docs/PLAN.md) | Who does what and when: stack, phases, gates, tasks |
| [`docs/CONTRACT.md`](docs/CONTRACT.md) | Common grid, file names, `manifest.json`, HDF5 paths |
| [`docs/PRODUCTS.md`](docs/PRODUCTS.md) | NISAR products that exist and the ones used |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Decisions taken during the weekend |
| [`docs/AI_USE.md`](docs/AI_USE.md) | Where and how AI was used |
| [`docs/STORY-VALIDATION.md`](docs/STORY-VALIDATION.md) | Each claim in the story checked against the data |
| [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) | The 30-second demo video, shot by shot |
| [`docs/challenge.md`](docs/challenge.md) | Official challenge statement (offline snapshot) |
| [`docs/data-sources.md`](docs/data-sources.md) | Data sources, licenses, citations |
| [`docs/judging.md`](docs/judging.md) | Judging criteria |
| [`docs/submission-checklist.md`](docs/submission-checklist.md) | Submission rules |

## Data, credits and AI use

Data sources, licences and the required attributions are in [`NOTICE`](NOTICE) and
[`docs/data-sources.md`](docs/data-sources.md): NISAR (NASA/JPL-Caltech and ISRO, via ASF DAAC),
Copernicus Sentinel-2 and Sentinel-3, the ICNF official perimeter, OpenFreeMap and
OpenStreetMap. Where and how AI was used is recorded in [`docs/AI_USE.md`](docs/AI_USE.md).

## Contributing

The repository is **public to view and clone**, but write access is restricted to **invited
collaborators**. See [`CONTRIBUTING.md`](CONTRIBUTING.md). Everyone else is welcome to open an issue.

## License and attribution

Released under the [Apache License 2.0](LICENSE). Third-party data, libraries and imagery keep
their own licenses — see [`NOTICE`](NOTICE). NISAR data is provided by NASA/JPL-Caltech and ISRO
and accessed through the Alaska Satellite Facility DAAC.

This project is not affiliated with or endorsed by NASA.
