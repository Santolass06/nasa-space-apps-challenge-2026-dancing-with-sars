# Data directory

Datasets are **not versioned**. This folder only keeps the pipeline layout:

```
data/
├── raw/        # original downloads (NISAR/partner products) — git-ignored
├── interim/    # clipped / reprojected intermediate rasters — git-ignored
└── processed/  # analysis-ready COGs and JSON used by the API — git-ignored
```

## Downloading

1. Create a free [NASA Earthdata](https://urs.earthdata.nasa.gov/) account and accept the
   ASF DAAC data agreement (if prompted).
2. Put the credentials in `.env` (`EARTHDATA_USERNAME`, `EARTHDATA_PASSWORD`).
3. Run:

   ```bash
   python scripts/download_nisar.py --bbox MINLON MINLAT MAXLON MAXLAT \
       --start 2026-01-01 --end 2026-03-01 --out data/raw
   ```

## Manifest

Record what was downloaded in `data/manifest.csv` (or a JSON file) so the analysis is
reproducible:

```csv
granule_id,platform,instrument,start,end,bbox,url,license
```

Every product listed here must also be cited in `docs/data-sources.md` and in the Space Apps
submission form.
