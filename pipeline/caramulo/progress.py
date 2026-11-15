"""Fire progression: before, during, after (task A6).

Out: progress.geojson — three dated features on the common grid:

    before  (D52 17 -> 29 Jun):   no scar, area 0
    during  (A116 22 Jun -> 4 Jul): the part of the final scar already incoherent by 4 Jul
    after   (D52 29 Jun -> 11 Jul): the full A4 scar

The during mask is relative, not absolute: the A116 pair has no control pair, and an
absolute coherence threshold picks up water and valleys across the whole scene
(only ~45% of it lands inside the scar). So the threshold is the scene median
minus 2 MAD of the A116 coherence outside the scar, intersected with the final
scar — a subset by construction. The before/after features reuse the A4 result.

Run inside pipeline/:

    uv run python -m caramulo.progress
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from rasterio.features import rasterize, shapes
from rasterio.transform import from_bounds
from rasterio.warp import transform_geom
from scipy import ndimage as ndi
from shapely.geometry import shape
from shapely.ops import unary_union

from caramulo import export
from caramulo.grid import CRS, EXTENT_3857

LAYERS_DIR = Path("../web/public/layers")
DURING_LAYER = "coh_A116_20260622_20260704"
BEFORE_DATES = ["2026-06-17", "2026-06-29"]
DURING_DATES = ["2026-06-22", "2026-07-04"]
AFTER_DATES = ["2026-06-29", "2026-07-11"]
WGS84 = "EPSG:4326"


def _read_layer(path: Path) -> tuple[np.ndarray, np.ndarray]:
    rgba = export.read_png(path)
    coh = rgba[..., :3].mean(axis=2).astype("float32") / 255.0
    return coh, rgba[..., 3] >= 128


def _grid_transform(shape: tuple[int, int]):
    """Affine for the layer's own resolution: (height, width) from the array (C7)."""
    return from_bounds(*EXTENT_3857, shape[1], shape[0])


def _scar_mask(burn_geojson: Path, shape: tuple[int, int]) -> np.ndarray:
    feature = json.loads(burn_geojson.read_text())["features"][0]
    geom_merc = transform_geom(WGS84, CRS, feature["geometry"])
    grid = rasterize(
        [(geom_merc, 1)],
        out_shape=shape,
        transform=_grid_transform(shape),
        fill=0,
        dtype="uint8",
    )
    return np.asarray(grid, dtype="uint8").astype(bool)


def during_mask(layer_path: Path, scar: np.ndarray) -> np.ndarray:
    """Part of the scar already incoherent by the A116 second date."""
    coh, valid = _read_layer(layer_path)
    outside = coh[valid & ~scar]
    median = float(np.median(outside))
    mad = float(np.median(np.abs(outside - median)))
    threshold = median - 2.0 * mad
    mask = (coh < threshold) & valid & scar
    mask = ndi.binary_opening(mask, iterations=2)
    mask = ndi.binary_closing(mask, iterations=3)
    labels, n = ndi.label(mask)
    if n > 1:
        sizes = ndi.sum(mask, labels, list(range(1, n + 1)))
        mask = labels == int(np.argmax(sizes)) + 1
    return mask


def _polygon_wgs84(mask: np.ndarray):
    geoms = [
        shape(geom)
        for geom, _value in shapes(
            mask.astype("uint8"), mask=mask, transform=_grid_transform(mask.shape)
        )
    ]
    return transform_geom(CRS, WGS84, unary_union(geoms).__geo_interface__)


def _area_ha_wgs84(geom: dict) -> float:
    g = shape(transform_geom(WGS84, "EPSG:32629", geom))
    return g.area / 10_000.0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--layers", type=Path, default=LAYERS_DIR)
    parser.add_argument(
        "--scar",
        type=Path,
        default=None,
        help="A4 polygon (default: layers/burn_nisar.geojson)",
    )
    parser.add_argument(
        "--during",
        type=Path,
        default=None,
        help=f"A116 layer (default: layers/{DURING_LAYER}.png)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="output file (default: layers/progress.geojson)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    scar_path = args.scar or args.layers / "burn_nisar.geojson"
    during_path = args.during or args.layers / f"{DURING_LAYER}.png"
    out_path = args.out or args.layers / "progress.geojson"

    scar = _scar_mask(scar_path, _read_layer(during_path)[0].shape)
    after_feature = json.loads(scar_path.read_text())["features"][0]
    after_area = float(after_feature["properties"]["area_ha"])

    mask = during_mask(during_path, scar)
    during_geom = _polygon_wgs84(mask)
    during_area = _area_ha_wgs84(during_geom)

    progress = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": None,
                "properties": {
                    "phase": "before",
                    "dates": BEFORE_DATES,
                    "area_ha": 0.0,
                    "note": "no scar in the pre-fire pair (coherence stays high inside)",
                },
            },
            {
                "type": "Feature",
                "geometry": during_geom,
                "properties": {
                    "phase": "during",
                    "dates": DURING_DATES,
                    "area_ha": round(during_area, 1),
                    "method": "A116 coherence below scene median - 2 MAD, inside the final scar",
                },
            },
            {
                "type": "Feature",
                "geometry": after_feature["geometry"],
                "properties": {
                    "phase": "after",
                    "dates": AFTER_DATES,
                    "area_ha": after_area,
                    "note": "the A4 polygon (same geometry)",
                },
            },
        ],
    }
    out_path.write_text(json.dumps(progress, indent=2) + "\n")
    print(f"{out_path} written")
    print(f"before: 0 ha; during: {during_area:,.0f} ha; after: {after_area:,.0f} ha")
    print(f"during / after = {100.0 * during_area / after_area:.1f}% of the final scar")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
