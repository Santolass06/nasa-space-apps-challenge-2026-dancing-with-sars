# Caramulo em chamas

**NASA Space Apps Challenge 2026 — *Dancing with the SARs*.** The largest wildfire of
Portugal's 2026 season, told with NISAR radar.

[![CI](https://github.com/Santolass06/nasa-space-apps-challenge-2026-dancing-with-sars/actions/workflows/ci.yml/badge.svg)](https://github.com/Santolass06/nasa-space-apps-challenge-2026-dancing-with-sars/actions/workflows/ci.yml)

An open-source, interactive web story about the **Vouzela / Serra do Caramulo wildfire**
(2–5 July 2026, 12,829 ha burned per ICNF) built only with radar remote sensing from the
**NASA-ISRO NISAR** mission: what happened, how the L-band radar saw it through the smoke, and
what came after.

- **Challenge:** [Dancing with the SARs](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/)
- **Event:** 14–15 November 2026
- **License:** [Apache-2.0](LICENSE)

> **Status:** 🚧 under construction during the hackathon. Tasks and gates: [`docs/PLAN.md`](docs/PLAN.md).

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

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/DOSSIER.md`](docs/DOSSIER.md) | The problem, the radar, the case and the shared values (area, dates, orbits) |
| [`docs/PLAN.md`](docs/PLAN.md) | Who does what and when: stack, phases, gates, tasks |
| [`docs/CONTRACT.md`](docs/CONTRACT.md) | Common grid, file names, `manifest.json`, HDF5 paths |
| [`docs/PRODUCTS.md`](docs/PRODUCTS.md) | NISAR products that exist and the ones used |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Decisions taken during the weekend |
| [`docs/AI_USE.md`](docs/AI_USE.md) | Where and how AI was used |
| [`docs/challenge.md`](docs/challenge.md) | Official challenge statement (offline snapshot) |
| [`docs/data-sources.md`](docs/data-sources.md) | Data sources, licenses, citations |
| [`docs/judging.md`](docs/judging.md) | Judging criteria |
| [`docs/submission-checklist.md`](docs/submission-checklist.md) | Submission rules |

## Contributing

The repository is **public to view and clone**, but write access is restricted to **invited
collaborators**. See [`CONTRIBUTING.md`](CONTRIBUTING.md). Everyone else is welcome to open an issue.

## License and attribution

Released under the [Apache License 2.0](LICENSE). Third-party data, libraries and imagery keep
their own licenses — see [`NOTICE`](NOTICE). NISAR data is provided by NASA/JPL-Caltech and ISRO
and accessed through the Alaska Satellite Facility DAAC.

This project is not affiliated with or endorsed by NASA.
