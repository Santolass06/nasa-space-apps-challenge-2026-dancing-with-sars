# Scripts

| Script | Purpose |
| --- | --- |
| `download_nisar.py` | Search the ASF DAAC for NISAR products in a bbox/date range and download them. |

Install the optional dependency in the backend virtualenv:

```bash
backend/.venv/bin/pip install asf_search
```

Usage:

```bash
python scripts/download_nisar.py \
  --bbox -122.5 37.7 -121.9 38.1 \
  --start 2026-01-01 --end 2026-03-01 \
  --out data/raw --dry-run
```

Credentials come from `EARTHDATA_USERNAME` / `EARTHDATA_PASSWORD` or from `~/.netrc`.
