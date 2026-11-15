"""Coherence from NISAR GUNW interferograms.

In:  a GUNW .h5 downloaded by caramulo.fetch, the common grid (caramulo.grid).
Out: coh_{orbit}_{d1}_{d2}.png on the common grid + a manifest entry (kind=coh).
Reads: GUNW. Dataset paths follow docs/CONTRACT.md ("Dentro dos HDF5") — the
expected layout, confirmed against the first real file in task A1.

Run inside pipeline/:

    uv run python -m caramulo.gunw ../data/raw/NISAR_L2_PR_GUNW_....h5 \
        --orbit D52 --dates 2026-06-29 2026-07-11
"""

from __future__ import annotations

import argparse
from pathlib import Path

import h5py
import numpy as np
import rasterio
from rasterio.crs import CRS as RioCRS
from rasterio.transform import from_bounds, from_origin
from rasterio.warp import Resampling, reproject

from caramulo import export
from caramulo.caveats import coherence_caveat
from caramulo.grid import CRS, EXTENT_3857, HEIGHT, WIDTH

# GUNW layout confirmed on the first real file (task A1, 2026-11-14):
# coherence sits at the CONTRACT path; projection and coordinates are inside
# unwrappedInterferogram/ (per polarization), and projection is an EPSG code.
_GUNW_GROUP = "science/LSAR/GUNW/grids/frequencyA"
_COH_PATH = f"{_GUNW_GROUP}/unwrappedInterferogram/HH/coherenceMagnitude"
_PROJECTION_PATH = f"{_GUNW_GROUP}/unwrappedInterferogram/projection"
_X_PATH = f"{_GUNW_GROUP}/unwrappedInterferogram/HH/xCoordinates"
_Y_PATH = f"{_GUNW_GROUP}/unwrappedInterferogram/HH/yCoordinates"

_MONTHS = (
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
)


def _pretty(iso_date: str) -> str:
    """'2026-06-29' -> '29 Jun' (manifest titles are in English)."""
    _, month, day = iso_date.split("-")
    return f"{int(day)} {_MONTHS[int(month) - 1]}"


def _read_dataset(f: h5py.File, path: str) -> np.ndarray:
    if path not in f:
        raise KeyError(
            f"{path!r} not found in {f.filename}; list the datasets with h5py "
            "and update docs/CONTRACT.md (task A1) before changing this module"
        )
    dataset = f[path]
    if not isinstance(dataset, h5py.Dataset):
        raise KeyError(f"{path!r} in {f.filename} is not a dataset")
    return np.asarray(dataset[()])


def _crs_from_projection(raw: np.ndarray | bytes) -> RioCRS:
    """GUNW stores the projection as a scalar EPSG code (uint32)."""
    value = int(np.asarray(raw).reshape(-1)[0])
    return RioCRS.from_epsg(value)


def _transform(x: np.ndarray, y: np.ndarray) -> rasterio.Affine:
    """Build the source transform from pixel-centre coordinates (north-up raster)."""
    dx = float(x[1] - x[0])
    dy = float(y[0] - y[1])
    if dx <= 0 or dy <= 0:
        raise ValueError(
            "unexpected coordinate order (expected x increasing, y decreasing); "
            "inspect the file in A1"
        )
    return from_origin(x[0] - dx / 2.0, y[0] + dy / 2.0, dx, dy)


def coherence_on_grid(h5_path: Path) -> np.ndarray:
    """Read the GUNW coherence and reproject it onto the common grid (float32, NaN = nodata)."""
    with h5py.File(h5_path, "r") as f:
        coh = np.asarray(_read_dataset(f, _COH_PATH), dtype="float32")
        x = np.asarray(_read_dataset(f, _X_PATH), dtype="float64")
        y = np.asarray(_read_dataset(f, _Y_PATH), dtype="float64")
        crs = _crs_from_projection(_read_dataset(f, _PROJECTION_PATH))

    # Coherence is 0..1; 0 / negative marks no valid interferogram in this product.
    coh = np.where(coh > 0.0, coh, np.nan)
    dst = np.full((HEIGHT, WIDTH), np.nan, dtype="float32")
    reproject(
        source=coh,
        destination=dst,
        src_transform=_transform(x, y),
        src_crs=crs,
        dst_transform=from_bounds(*EXTENT_3857, WIDTH, HEIGHT),
        dst_crs=CRS,
        resampling=Resampling.bilinear,
        src_nodata=np.nan,
        dst_nodata=np.nan,
    )
    return dst


def coherence_layer(h5_path: Path, orbit: str, dates: list[str], out_dir: Path) -> dict:
    """Write the coherence PNG and return its manifest entry."""
    d1, d2 = dates
    layer_id = f"coh_{orbit}_{d1.replace('-', '')}_{d2.replace('-', '')}"
    coh = export.downsample2(coherence_on_grid(h5_path))
    gray = np.round(np.clip(np.nan_to_num(coh, nan=0.0), 0.0, 1.0) * 255.0).astype(np.uint8)
    alpha = np.where(np.isfinite(coh), 255, 0).astype(np.uint8)
    export.write_gray_png(out_dir / f"{layer_id}.png", gray, alpha)
    return export.layer_entry(
        layer_id=layer_id,
        kind="coh",
        file=f"{layer_id}.png",
        orbit=orbit,
        dates=[d1, d2],
        title=f"Coherence, {_pretty(d1)} to {_pretty(d2)}",
        units="coherence",
        value_range=[0.0, 1.0],
        colormap="gray",
        source=h5_path.name,
        caveat=coherence_caveat(d1, d2),
    )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("h5", type=Path, help="GUNW .h5 file")
    parser.add_argument("--orbit", required=True, help="orbit name, e.g. D52")
    parser.add_argument(
        "--dates",
        nargs=2,
        required=True,
        metavar=("D1", "D2"),
        help="reference and secondary dates (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("../web/public/layers"),
        help="output directory (default: ../web/public/layers)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    entry = coherence_layer(args.h5, args.orbit, args.dates, args.out)
    manifest = export.upsert_manifest_entry(args.out / "manifest.json", entry)
    print(f"Wrote {args.out / entry['file']} and updated {manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
