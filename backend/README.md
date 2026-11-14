# Backend — Dancing with the SARs API

FastAPI service that searches NISAR products, prepares analysis-ready rasters and serves
metadata, statistics and map tiles to the frontend.

```bash
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/uvicorn app.main:app --reload
```

- Interactive docs: <http://localhost:8000/docs>
- Health probe: <http://localhost:8000/api/health>

## Layout

```
app/
├── main.py           # FastAPI app factory, CORS, routers
├── core/config.py    # settings from environment (.env)
└── api/routes/       # health, study areas, scenes, change detection
tests/                # pytest suite
```

## Roadmap

- [ ] ASF/Earthdata search wrapper (`asf_search`) with caching
- [ ] COG preparation and clipping pipeline (`rasterio`, `rioxarray`)
- [ ] Change metrics: log-ratio, multitemporal RGB, coherence where available
- [ ] Tile endpoint (XYZ PNG) for MapLibre
- [ ] Pre-computed demo study area so the public demo is instant
