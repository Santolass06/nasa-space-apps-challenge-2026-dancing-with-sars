"""Numbers behind the E8 review of the story (acts 2, 5 and 6), recomputed from the products.

Reads the real NISAR products named in the manifest (default ../data/raw) and the burn polygon
(burn_nisar.geojson), and prints:

- mean coherence inside / outside the scar, and the share of pixels at or above the 0.5 where the
  map turns transparent, for the fire pair, the July control pair and the October pair (act 5);
- the HH and HV change inside / outside the scar between 11 July and 16 August (act 5);
- how far each place marker is from the official perimeter (act 2).

Run inside pipeline/:

    uv run python verify_story.py
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from rasterio.warp import transform_geom
from shapely.geometry import shape
from shapely.ops import unary_union

from caramulo import gcov, gunw

LAYERS_DIR = Path("../web/public/layers")
PAIRS = {
    "fire pair (29 Jun - 11 Jul)": "coh_D52_20260629_20260711",
    "July control (11 - 23 Jul)": "coh_D52_20260711_20260723",
    "October (3 - 15 Oct)": "coh_D52_20261003_20261015",
}
TRANSPARENT_FROM = 0.5  # web/src/map/style.ts: COHERENCE_CLEAR


def _utm(geometry: dict):
    return shape(transform_geom("EPSG:4326", "EPSG:32629", geometry))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("../data/raw"))
    parser.add_argument("--layers", type=Path, default=LAYERS_DIR)
    args = parser.parse_args(argv)

    manifest = json.loads((args.layers / "manifest.json").read_text(encoding="utf-8"))
    by_id = {layer["id"]: layer for layer in manifest["layers"]}
    scar = gcov._scar_mask(args.layers)

    print("coherence, mean inside/outside and % of pixels >= 0.5 inside/outside")
    for label, layer_id in PAIRS.items():
        coh = gunw.coherence_on_grid(args.data / by_id[layer_id]["source"])
        valid = np.isfinite(coh)
        inside, outside = coh[valid & scar], coh[valid & ~scar]
        print(
            f"  {label:30s} {inside.mean():.3f} / {outside.mean():.3f}"
            f"   {100 * (inside >= TRANSPARENT_FROM).mean():.1f} % / "
            f"{100 * (outside >= TRANSPARENT_FROM).mean():.1f} %"
        )

    print("backscatter 11 Jul -> 16 Aug, change in dB inside / outside the scar")
    for pol in ("hh", "hv"):
        means = {
            day: gcov._means(
                gcov.backscatter_db(
                    gcov.power_on_grid(args.data / by_id[f"{pol}_D52_{day}"]["source"], pol)
                ),
                scar,
            )
            for day in ("20260711", "20260816")
        }
        change = {k: means["20260816"][k] - means["20260711"][k] for k in ("inside", "outside")}
        print(f"  {pol.upper()}  {change['inside']:+.2f} / {change['outside']:+.2f}")

    print("place markers against the official perimeter (UTM 29N)")
    official = json.loads((args.layers / "burn_official.geojson").read_text(encoding="utf-8"))
    perimeter = unary_union([_utm(f["geometry"]) for f in official["features"]])
    places = json.loads((args.layers / "places.geojson").read_text(encoding="utf-8"))
    for feature in places["features"]:
        point = _utm(feature["geometry"])
        where = (
            "inside" if perimeter.contains(point) else f"{perimeter.distance(point):.0f} m outside"
        )
        print(f"  {feature['properties']['name']:30s} {where}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
