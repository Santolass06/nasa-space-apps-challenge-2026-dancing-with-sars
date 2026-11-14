# Data directory

Datasets are **not versioned**. This folder only keeps the layout:

```
data/
├── raw/        # original NISAR downloads (GCOV, GUNW) — git-ignored
├── interim/    # clipped / reprojected intermediate rasters — git-ignored
└── processed/  # intermediate GeoTIFFs — git-ignored
```

The final layers the web app reads are **not** here: they go to `web/public/layers/`
(see [`docs/CONTRACT.md`](../docs/CONTRACT.md)).

## Downloading

1. Create a free [NASA Earthdata](https://urs.earthdata.nasa.gov/) account and put the
   credentials in `~/.netrc` (or in `.env`, see `.env.example`).
2. Search and download (inside `pipeline/`):

   ```bash
   uv run python -m caramulo.fetch --start 2026-06-17 --end 2026-07-25 --dry-run
   uv run python -m caramulo.fetch --start 2026-06-29 --end 2026-07-12 --level GUNW --out ../data/raw
   ```

Record every product used in [`docs/PRODUCTS.md`](../docs/PRODUCTS.md) and cite it in
[`docs/data-sources.md`](../docs/data-sources.md).
