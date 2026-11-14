# Architecture

> Status: initial proposal for the hackathon. Update this document as the design settles.

## Goals

- Let a non-specialist explore **where and how Earth's surface changed**, using NISAR SAR data.
- Keep the heavy raster work on the server; the browser only receives tiles, small rasters
  and time-series JSON.
- Be reproducible: every number in the UI can be traced to a product ID and a processing step.

## Components

```
┌────────────────────────────┐        ┌─────────────────────────────────────┐
│        Frontend            │        │              Backend                │
│  React + TypeScript + Vite │  HTTP  │            FastAPI                  │
│                            │ <────> │                                     │
│  • Map (MapLibre / deck.gl)│  JSON  │  /api/health                        │
│  • Timeline & date compare │        │  /api/study-areas                   │
│  • Swipe / difference view │        │  /api/scenes?bbox=&start=&end=      │
│  • Story panels            │        │  /api/change?scene_a=&scene_b=      │
└────────────────────────────┘        │  /api/tiles/{z}/{x}/{y}.png         │
                                      └───────────────┬─────────────────────┘
                                                      │ rasterio / xarray / numpy
                                      ┌───────────────▼─────────────────────┐
                                      │           Data layer                │
                                      │  data/raw → data/interim → processed│
                                      │  ASF / Earthdata downloads          │
                                      └─────────────────────────────────────┘
```

## Data flow

1. **Acquire** — `scripts/download_nisar.py` searches ASF for NISAR products in a bbox/date
   range and stores them in `data/raw/`.
2. **Prepare** — read the product (GCOV/GSLC), clip to the area of interest, reproject to a
   common grid, and cache a Cloud-Optimized GeoTIFF in `data/processed/`.
3. **Analyse** — compute a change layer, e.g.:
   - log-ratio of backscatter between two dates (`10·log10(σ⁰₂ / σ⁰₁)`),
   - RGB multitemporal composite (R = early, G = late, B = difference),
   - coherence change where interferometric products are available,
   - simple statistics per land-cover or administrative polygon.
4. **Serve** — the API exposes metadata, time series and map tiles; the frontend renders the
   map, slider and story.
5. **Explain** — the UI states the hypothesis (flood, harvest, fire scar, glacier flow…),
   the polarisation used, and the limits of the interpretation.

## Proposed API (first iteration)

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Liveness/version probe used by the UI and CI |
| `GET /api/study-areas` | Curated areas with name, bbox, narrative |
| `GET /api/scenes` | Available acquisitions for a bbox/date range |
| `GET /api/change` | Change statistics and URLs for rendered layers |
| `GET /api/tiles/{z}/{x}/{y}.png` | Map tiles for a given layer and date |

## Technology choices

- **Python** for the SAR stack (`rasterio`, `rioxarray`, `xarray`, `numpy`) — best ecosystem
  for Earth observation.
- **FastAPI** for a typed, self-documenting API (`/docs`) that is quick to demo.
- **React + TypeScript + Vite** for a fast, component-driven interactive UI.
- **MapLibre GL** (open source, no API key) for the map; `deck.gl` only if needed for large
  overlay layers.

## Constraints and risks

- NISAR is a new mission: product formats and coverage will still be limited. Have a
  fallback (Sentinel-1 / UAVSAR / RADARSAT) but **label it clearly** in the UI and citations.
- Demo must be a public link with no login. Serve the built frontend statically (GitHub Pages,
  Netlify, Vercel, or a container) — never expose Earthdata credentials to the browser.
- Keep one pre-rendered study area cached so the demo works even if downloads are slow.
