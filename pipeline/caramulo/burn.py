"""Burn mask, polygon and burned area.

In:  the fire-pair and control-pair coherence layers (PNG, common grid) and,
     when available, the official perimeter (burn_official.geojson).
Out: burn_nisar.geojson (our polygon, WGS84) and stats.json (our area, the
     official area and the overlap when the official perimeter exists).
Reads: the coherence layers produced by caramulo.gunw.

Method (task A4): threshold on the coherence DIFFERENCE (fire pair minus
control pair), not on the fire pair alone — the control pair removes the
summer decorrelation that affects the whole frame. The threshold -0.25 was
calibrated on 2026-11-14 against the official areas known then (12,160 ha
EFFIS, 12,804 ha ICNF provisional) and lands at ~13.7k ha before morphology.
The final ICNF figure is 12,828.9 ha (REE_2026_004, p. 6); the threshold was
not re-tuned.

Run inside pipeline/:

    uv run python -m caramulo.burn
    uv run python -m caramulo.burn --fire ../web/public/layers/coh_D52_20260629_20260711.png \
        --control ../web/public/layers/coh_D52_20260711_20260723.png
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import cast

import geopandas as gpd
import numpy as np
from rasterio.features import shapes
from rasterio.transform import from_bounds
from rasterio.warp import transform_geom
from scipy import ndimage as ndi
from shapely.geometry import MultiPolygon, Polygon, shape
from shapely.ops import unary_union

from caramulo import export
from caramulo.grid import BBOX, EXTENT_3857, HEIGHT, WIDTH

THRESHOLD = -0.25  # coherence drop vs the control pair; calibrated against the official areas
SMOOTHING_M = 1000.0  # box smoothing on the ground before thresholding
UTM = "EPSG:32629"  # metric CRS for areas (the products' native grid here)
WGS84 = "EPSG:4326"

FIRE_LAYER = "coh_D52_20260629_20260711"
CONTROL_LAYER = "coh_D52_20260711_20260723"
LAYERS_DIR = Path("../web/public/layers")


def _coherence(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Read a coherence layer PNG as (values 0..1, valid mask)."""
    rgba = export.read_png(path)
    coh = rgba[..., :3].mean(axis=2).astype("float32") / 255.0
    return coh, rgba[..., 3] >= 128


def burn_mask(
    fire_path: Path, control_path: Path, threshold: float = THRESHOLD
) -> tuple[np.ndarray, dict]:
    """Burned-area mask on the common grid: the largest connected component.

    The fire scar is one contiguous area; smaller separate blobs are other
    changes or bbox-edge effects. They are excluded from the polygon and
    counted in the returned info dict (for stats.json).
    """
    fire, fire_ok = _coherence(fire_path)
    control, control_ok = _coherence(control_path)
    valid = fire_ok & control_ok
    diff = np.where(valid, fire - control, 0.0)

    # Web Mercator pixels are larger than the ground: convert to ground metres.
    lat_mid = (BBOX[1] + BBOX[3]) / 2.0
    merc_m_per_px = (EXTENT_3857[2] - EXTENT_3857[0]) / WIDTH
    ground_m_per_px = merc_m_per_px * math.cos(math.radians(lat_mid))

    box = max(1, round(SMOOTHING_M / ground_m_per_px))
    smooth = ndi.uniform_filter(diff, size=box)
    mask = (smooth < threshold) & valid

    # Morphology: drop isolated speckle, close holes inside the scar.
    mask = ndi.binary_opening(mask, iterations=2)
    mask = ndi.binary_closing(mask, iterations=3)

    px_ha = (ground_m_per_px**2) / 10_000.0
    labels, n = ndi.label(mask)
    info: dict = {"components": int(n), "dropped_ha": 0.0}
    if n == 0:
        return mask, info
    sizes = ndi.sum(mask, labels, list(range(1, n + 1))) * px_ha
    main = int(np.argmax(sizes)) + 1
    info["dropped_ha"] = round(float(sizes.sum() - sizes[main - 1]), 1)
    return labels == main, info


def mask_to_polygon(mask: np.ndarray) -> Polygon | MultiPolygon:
    """Vectorise the mask (Web Mercator) and merge the pieces."""
    transform = from_bounds(*EXTENT_3857, WIDTH, HEIGHT)
    geoms = [
        shape(geom) for geom, _value in shapes(mask.astype("uint8"), mask=mask, transform=transform)
    ]
    if not geoms:
        raise SystemExit("empty burn mask: no polygon to write")
    return cast(Polygon | MultiPolygon, unary_union(geoms))


def _utm_area_ha(geom_wgs) -> float:
    """Area in hectares, computed in the products' UTM zone (metric)."""
    g = shape(transform_geom(WGS84, UTM, geom_wgs.__geo_interface__))
    return g.area / 10_000.0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--fire", type=Path, default=LAYERS_DIR / f"{FIRE_LAYER}.png", help="fire-pair layer"
    )
    parser.add_argument(
        "--control",
        type=Path,
        default=LAYERS_DIR / f"{CONTROL_LAYER}.png",
        help="control-pair layer",
    )
    parser.add_argument("--threshold", type=float, default=THRESHOLD)
    parser.add_argument("--out", type=Path, default=LAYERS_DIR, help="output directory")
    parser.add_argument(
        "--official",
        type=Path,
        default=LAYERS_DIR / "burn_official.geojson",
        help="official perimeter (WGS84 GeoJSON); skipped when missing",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    mask, info = burn_mask(args.fire, args.control, args.threshold)
    geom_merc = mask_to_polygon(mask)
    geom_wgs = shape(transform_geom("EPSG:3857", WGS84, geom_merc.__geo_interface__))
    area_ha = _utm_area_ha(geom_wgs)

    stats = {
        "method": {
            "kind": "coherence difference (fire pair minus control pair)",
            "threshold": args.threshold,
            "smoothing_m": SMOOTHING_M,
            "components": info["components"],
            "dropped_ha": info["dropped_ha"],
        },
        "fire_layer": args.fire.stem,
        "control_layer": args.control.stem,
        "our_area_ha": round(area_ha, 1),
        "official_area_ha": None,
        "overlap_ha": None,
        "overlap_pct_of_official": None,
        "overlap_pct_of_ours": None,
    }

    if args.official.exists():
        official = gpd.read_file(args.official).to_crs(UTM)
        official_geom = unary_union(official.geometry)
        official_ha = official_geom.area / 10_000.0
        ours_utm = shape(transform_geom(WGS84, UTM, geom_wgs.__geo_interface__))
        overlap_ha = ours_utm.intersection(official_geom).area / 10_000.0
        stats["official_area_ha"] = round(official_ha, 1)
        stats["overlap_ha"] = round(overlap_ha, 1)
        stats["overlap_pct_of_official"] = round(100.0 * overlap_ha / official_ha, 1)
        stats["overlap_pct_of_ours"] = round(100.0 * overlap_ha / area_ha, 1)
    else:
        print(f"note: {args.official} not found; overlap numbers stay null until task E1")

    export.write_geojson(
        args.out / "burn_nisar.geojson",
        [
            (
                geom_wgs,
                {
                    "area_ha": round(area_ha, 1),
                    "threshold": args.threshold,
                    "method": "coherence difference (fire pair minus control pair)",
                    "source": f"{args.fire.stem} minus {args.control.stem}",
                },
            )
        ],
    )
    stats_path = args.out / "stats.json"
    stats_path.write_text(json.dumps(stats, indent=2) + "\n")
    print(f"burn_nisar.geojson + stats.json written to {args.out}")
    print(f"our area: {area_ha:,.1f} ha (threshold {args.threshold})")
    if stats["official_area_ha"] is not None:
        print(
            f"official area: {stats['official_area_ha']:,.1f} ha; "
            f"overlap {stats['overlap_pct_of_official']}% of the official perimeter"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
