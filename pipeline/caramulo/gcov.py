"""HH and HV backscatter in dB from NISAR GCOV.

In:  a GCOV .h5 downloaded by caramulo.fetch, the common grid (caramulo.grid).
Out: hh_{orbit}_{date}.png and hv_{orbit}_{date}.png on the common grid and
     their manifest entries (kind=hh / kind=hv). The dB range is fixed per
     polarization and the same on every date (task B8).
Reads: GCOV. Dataset paths in docs/CONTRACT.md ("Dentro dos HDF5"), confirmed
against the first real file in task B1.

Run inside pipeline/:

    uv run python -m caramulo.gcov ../data/raw/NISAR_L2_PR_GCOV_....h5 \
        --orbit D52 --date 2026-06-29

The GCOV arrays are ~1.2 GB each: the module reads one polarization at a time
and frees it before the next, so it runs on a 14 GB laptop.
"""

from __future__ import annotations

import argparse
import gc
from pathlib import Path

import h5py
import numpy as np
from rasterio.transform import from_bounds, from_origin
from rasterio.warp import Resampling, reproject

from caramulo import export
from caramulo.grid import CRS, EXTENT_3857, HEIGHT, WIDTH

# GCOV layout confirmed on the first real file (task B1, 2026-11-14): the
# power datasets, coordinates and projection all sit in the frequencyA group.
_GCOV_GROUP = "science/LSAR/GCOV/grids/frequencyA"
_POLS = {"hh": "HHHH", "hv": "HVHV"}
_PROJECTION_PATH = f"{_GCOV_GROUP}/projection"
_X_PATH = f"{_GCOV_GROUP}/xCoordinates"
_Y_PATH = f"{_GCOV_GROUP}/yCoordinates"

# Fixed dB range per polarization, the same on every date (B8): the 2-98
# percentiles on the common grid (D52 29 Jun and 11 Jul, B1), rounded outwards.
_RANGES = {"hh": (-15.0, -2.0), "hv": (-20.0, -8.0)}
_COLORMAPS = {"hh": "viridis", "hv": "magma"}

_MONTHS = (
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
)  # fmt: skip

_CAVEAT = (
    "Speckle is present. The scar darkens only slightly in backscatter; the "
    "standing-trunk explanation in docs/DOSSIER.md is a hypothesis, not a "
    "measurement. Coherence is the fire signal."
)


def _pretty(iso_date: str) -> str:
    """'2026-06-29' -> '29 Jun' (manifest titles are in English)."""
    _, month, day = iso_date.split("-")
    return f"{int(day)} {_MONTHS[int(month) - 1]}"


def _read_dataset(f: h5py.File, path: str) -> np.ndarray:
    if path not in f:
        raise KeyError(
            f"{path!r} not found in {f.filename}; list the datasets with h5py "
            "and update docs/CONTRACT.md (task B1) before changing this module"
        )
    dataset = f[path]
    if not isinstance(dataset, h5py.Dataset):
        raise KeyError(f"{path!r} in {f.filename} is not a dataset")
    return np.asarray(dataset[()])


def _transform(x: np.ndarray, y: np.ndarray):
    """Source transform from pixel-centre coordinates (north-up raster)."""
    dx = float(x[1] - x[0])
    dy = float(y[0] - y[1])
    if dx <= 0 or dy <= 0:
        raise ValueError(
            "unexpected coordinate order (expected x increasing, y decreasing); "
            "inspect the file in B1"
        )
    return from_origin(x[0] - dx / 2.0, y[0] + dy / 2.0, dx, dy)


def power_on_grid(h5_path: Path, pol: str) -> np.ndarray:
    """Read one polarization (linear power) and reproject it onto the common grid."""
    dataset = _POLS[pol]
    with h5py.File(h5_path, "r") as f:
        power = _read_dataset(f, f"{_GCOV_GROUP}/{dataset}")
        x = np.asarray(_read_dataset(f, _X_PATH), dtype="float64")
        y = np.asarray(_read_dataset(f, _Y_PATH), dtype="float64")
        epsg = int(np.asarray(_read_dataset(f, _PROJECTION_PATH)).reshape(-1)[0])

    # Reproject the linear power (not the dB) so the averaging is unbiased.
    dst = np.full((HEIGHT, WIDTH), np.nan, dtype="float32")
    reproject(
        source=power,
        destination=dst,
        src_transform=_transform(x, y),
        src_crs=f"EPSG:{epsg}",
        dst_transform=from_bounds(*EXTENT_3857, WIDTH, HEIGHT),
        dst_crs=CRS,
        resampling=Resampling.bilinear,
        src_nodata=np.nan,
        dst_nodata=np.nan,
    )
    del power
    gc.collect()
    return dst


def backscatter_db(power: np.ndarray) -> np.ndarray:
    """Linear power -> dB; non-positive or missing values become NaN."""
    with np.errstate(invalid="ignore", divide="ignore"):
        return 10.0 * np.log10(np.where(power > 0.0, power, np.nan))


def backscatter_layer(h5_path: Path, pol: str, orbit: str, date: str, out_dir: Path) -> dict:
    """Write one backscatter PNG and return its manifest entry."""
    layer_id = f"{pol}_{orbit}_{date.replace('-', '')}"
    db = export.downsample2(backscatter_db(power_on_grid(h5_path, pol)))
    vmin, vmax = _RANGES[pol]
    index = export.scalar_index(db, _COLORMAPS[pol], vmin, vmax)
    export.write_palette_png(out_dir / f"{layer_id}.png", index, _COLORMAPS[pol])
    return export.layer_entry(
        layer_id=layer_id,
        kind=pol,
        file=f"{layer_id}.png",
        orbit=orbit,
        dates=[date],
        title=f"Backscatter {pol.upper()}, {_pretty(date)}",
        units="dB",
        value_range=[vmin, vmax],
        colormap=_COLORMAPS[pol],
        source=h5_path.name,
        caveat=_CAVEAT,
    )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("h5", type=Path, help="GCOV .h5 file")
    parser.add_argument("--orbit", required=True, help="orbit name, e.g. D52")
    parser.add_argument("--date", required=True, help="acquisition date (YYYY-MM-DD)")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("../web/public/layers"),
        help="output directory (default: ../web/public/layers)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    for pol in ("hh", "hv"):
        entry = backscatter_layer(args.h5, pol, args.orbit, args.date, args.out)
        manifest = export.upsert_manifest_entry(args.out / "manifest.json", entry)
        print(f"Wrote {args.out / entry['file']} and updated {manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
