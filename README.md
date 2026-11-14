# Dancing with the SARs

**NASA Space Apps Challenge 2026 — interactive exploration of NISAR surface change**

[![CI](https://github.com/Santolass06/nasa-space-apps-challenge-2026-dancing-with-sars/actions/workflows/ci.yml/badge.svg)](https://github.com/Santolass06/nasa-space-apps-challenge-2026-dancing-with-sars/actions/workflows/ci.yml)

An open-source, interactive web application that turns radar remote sensing data from the
**NASA-ISRO Synthetic Aperture Radar (NISAR)** mission into an accessible story of how
Earth's surface changes over time.

- **Challenge:** [Dancing with the SARs](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/) — NASA Space Apps Challenge 2026
- **Event:** 14–15 November 2026
- **Theme:** The Next Frontier
- **License:** [Apache-2.0](LICENSE) (NASA's default license for Space Apps solutions)

> **Status:** 🚧 initial scaffold — the concept, study areas and change-detection
> products are being defined during the hackathon. See `docs/` for the challenge
> statement, data sources and submission rules.

---

## What it will do

1. Pick a study area anywhere on Earth (wetland, glacier, wildfire scar, flooded
   neighbourhood, agricultural region, volcano…).
2. Load NISAR SAR scenes for two or more dates (plus optional optical/GIS context layers).
3. Compute and display a **change signal** (backscatter difference, coherence, RGB
   multitemporal composites, time-series).
4. Tell the story: interactive maps, swipe/slider comparisons, animations and short
   explanations of the physical drivers behind the change.

## Repository layout

```
.
├── backend/          # FastAPI service: data access, change detection, tiles
├── frontend/         # React + TypeScript + Vite interactive app
├── data/             # Local data lake (not versioned: raw / interim / processed)
├── notebooks/        # Exploration and analysis notebooks
├── scripts/          # Download and preprocessing CLIs
├── docs/             # Challenge statement, data sources, architecture, submission rules
├── .github/          # CI, issue/PR templates, CODEOWNERS
├── Makefile          # One-liners for setup, dev, lint and tests
└── docker-compose.yml
```

## Quick start

Requirements: Python 3.11+, Node.js 20+, and (for data downloads) a free
[NASA Earthdata](https://urs.earthdata.nasa.gov/) account.

```bash
cp .env.example .env          # add your Earthdata credentials
make install                  # backend venv + frontend npm install

make dev-backend              # http://localhost:8000/docs
make dev-frontend             # http://localhost:5173
```

Or with Docker:

```bash
docker compose up --build
```

## Data

NISAR data is downloaded on demand and **never committed** to the repository
(`data/` is git-ignored). See [`docs/data-sources.md`](docs/data-sources.md) for
the full list of NASA and Space Agency Partner resources, access instructions,
licenses and the citations you must include in the project submission.

```bash
python scripts/download_nisar.py \
  --bbox -122.5 37.7 -121.9 38.1 \
  --start 2026-01-01 --end 2026-03-01 \
  --out data/raw
```

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/challenge.md`](docs/challenge.md) | Official challenge statement, objectives and considerations |
| [`docs/data-sources.md`](docs/data-sources.md) | NISAR / partner data, access, licenses, citation strings |
| [`docs/architecture.md`](docs/architecture.md) | System design and data flow |
| [`docs/submission-checklist.md`](docs/submission-checklist.md) | 2026 submission rules (demo limits, public link, citations) |
| [`docs/judging.md`](docs/judging.md) | Judging criteria and global awards |
| [`docs/team-and-concept.md`](docs/team-and-concept.md) | Team, concept, study areas and demo script |

## Contributing

The repository is **public to view and clone**, but write access is restricted to
**invited collaborators**. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the branch
and commit conventions. Everyone else is welcome to open an issue.

## License and attribution

Released under the [Apache License 2.0](LICENSE). Third-party data, libraries and
imagery keep their own licenses — see [`NOTICE`](NOTICE). NISAR data is provided by
NASA/JPL-Caltech and ISRO and accessed through the Alaska Satellite Facility DAAC.

This project is not affiliated with or endorsed by NASA.
