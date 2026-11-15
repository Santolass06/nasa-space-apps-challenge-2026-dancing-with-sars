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
import json
from pathlib import Path

import h5py
import numpy as np
from rasterio.features import rasterize
from rasterio.transform import from_bounds, from_origin
from rasterio.warp import Resampling, reproject, transform_geom

from caramulo import export, gunw
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

# B4: the change between the two dates is small (p2 -2.7 dB, p98 +2.3 dB), so
# the diverging map is symmetric and tight around zero.
_DIFF_RANGE = (-2.5, 2.5)
# B4: HH/HV ratio (dB) sits around +5 dB on forest; 2-10 dB shows the contrast.
_RATIO_RANGE = (2.0, 10.0)

_MONTHS = (
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
)  # fmt: skip

_CAVEAT = (
    "Speckle is present. The scar darkens only slightly in backscatter; the "
    "standing-trunk explanation is a hypothesis, not a "
    "measurement. Coherence is the fire signal."
)

_DIFF_CAVEAT = (
    "After minus before, in dB: negative means a weaker return after the fire. "
    "Over most of the scene the change is a few tenths of a dB, and speckle "
    "dominates at pixel scale, so read the pattern, not single pixels."
)

_RGB_CAVEAT = (
    "R = HH, G = HV, B = HH/HV, all in dB with fixed ranges: a colour image "
    "made from radar, not a photograph."
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


def difference_layer(
    before: Path, after: Path, pol: str, orbit: str, dates: list[str], out_dir: Path
) -> dict:
    """Write one dB-change PNG (after minus before) and return its manifest entry."""
    d1, d2 = dates
    layer_id = f"d{pol}_{orbit}_{d1.replace('-', '')}_{d2.replace('-', '')}"
    change = backscatter_db(power_on_grid(after, pol)) - backscatter_db(power_on_grid(before, pol))
    change = export.downsample2(change)
    vmin, vmax = _DIFF_RANGE
    index = export.scalar_index(change, "rdbu", vmin, vmax)
    export.write_palette_png(out_dir / f"{layer_id}.png", index, "rdbu")
    return export.layer_entry(
        layer_id=layer_id,
        kind=f"d{pol}",
        file=f"{layer_id}.png",
        orbit=orbit,
        dates=[d1, d2],
        title=f"Backscatter change {pol.upper()}, {_pretty(d1)} to {_pretty(d2)}",
        units="dB",
        value_range=[vmin, vmax],
        colormap="rdbu",
        source=f"{before.name} / {after.name}",
        caveat=_DIFF_CAVEAT,
    )


def rgb_layer(h5_path: Path, orbit: str, date: str, out_dir: Path) -> dict:
    """Write the HH/HV/HH-HV colour composite of one date and return its manifest entry."""
    layer_id = f"rgb_{orbit}_{date.replace('-', '')}"
    hh = export.downsample2(backscatter_db(power_on_grid(h5_path, "hh")))
    hv = export.downsample2(backscatter_db(power_on_grid(h5_path, "hv")))
    ratio = hh - hv

    def stretch(data: np.ndarray, limits: tuple[float, float]) -> np.ndarray:
        low, high = limits
        return np.clip((data - low) / (high - low), 0.0, 1.0)

    rgb = np.stack(
        [
            stretch(hh, _RANGES["hh"]),
            stretch(hv, _RANGES["hv"]),
            stretch(ratio, _RATIO_RANGE),
        ],
        axis=-1,
    )
    valid = np.isfinite(hh) & np.isfinite(hv)
    rgb = np.round(np.nan_to_num(rgb * 255.0, nan=0.0)).astype(np.uint8)
    index, palette = export.rgb_index(rgb)
    index[~valid] = 255  # the four nodata pixels at the swath edge stay transparent
    export.write_palette_png(out_dir / f"{layer_id}.png", index, palette)
    return export.layer_entry(
        layer_id=layer_id,
        kind="rgb",
        file=f"{layer_id}.png",
        orbit=orbit,
        dates=[date],
        title=f"Colour composite (HH, HV, HH/HV), {_pretty(date)}",
        units="RGB",
        value_range=[0.0, 255.0],
        colormap="rgb",
        source=h5_path.name,
        caveat=_RGB_CAVEAT,
    )


def _scar_mask(layers_dir: Path) -> np.ndarray:
    """Burn polygon rasterised on the analysis grid (burn_nisar.geojson)."""
    feature = json.loads((layers_dir / "burn_nisar.geojson").read_text(encoding="utf-8"))
    geometry = feature["features"][0]["geometry"]
    geom_merc = transform_geom("EPSG:4326", CRS, geometry)
    grid = rasterize(
        [(geom_merc, 1)],
        out_shape=(HEIGHT, WIDTH),
        transform=from_bounds(*EXTENT_3857, WIDTH, HEIGHT),
        fill=0,
        dtype="uint8",
    )
    return np.asarray(grid, dtype="uint8").astype(bool)


def _means(data: np.ndarray, scar: np.ndarray) -> dict[str, float]:
    """Mean inside the scar and outside it, ignoring non-finite pixels."""
    valid = np.isfinite(data)
    return {
        "inside": round(float(np.mean(data[valid & scar])), 3),
        "outside": round(float(np.mean(data[valid & ~scar])), 3),
    }


def act4_numbers(layers_dir: Path, data_dir: Path) -> dict:
    """Means of HH, HV and coherence inside/outside the scar, before and after (B5).

    Computed from the products (not from the PNG layers), so the palette
    quantisation does not leak into the numbers. Writes the table into
    stats.json and returns it.
    """
    manifest = json.loads((layers_dir / "manifest.json").read_text(encoding="utf-8"))
    by_id = {layer["id"]: layer for layer in manifest["layers"]}
    scar = _scar_mask(layers_dir)
    dates = {"before": "2026-06-29", "after": "2026-07-11"}

    table: dict = {
        "method": (
            "mean inside the burn polygon vs the rest of the grid, computed from "
            "the products, not from the PNG layers"
        ),
        "dates": dates,
        "backscatter_db": {},
        "coherence": {},
    }

    for pol in ("hh", "hv"):
        row: dict = {}
        for label, date in dates.items():
            source = data_dir / by_id[f"{pol}_D52_{date.replace('-', '')}"]["source"]
            row[label] = _means(backscatter_db(power_on_grid(source, pol)), scar)
        row["change_inside_db"] = round(row["after"]["inside"] - row["before"]["inside"], 3)
        row["change_outside_db"] = round(row["after"]["outside"] - row["before"]["outside"], 3)
        table["backscatter_db"][pol] = row

    coherence_pairs = (
        ("fire", "coh_D52_20260629_20260711"),
        ("control", "coh_D52_20260711_20260723"),
    )
    for label, layer_id in coherence_pairs:
        source = data_dir / by_id[layer_id]["source"]
        table["coherence"][label] = _means(gunw.coherence_on_grid(source), scar)

    hh = table["backscatter_db"]["hh"]
    hv = table["backscatter_db"]["hv"]
    fire = table["coherence"]["fire"]
    control = table["coherence"]["control"]
    factor = float("nan")
    if hh["change_inside_db"]:
        factor = hv["change_inside_db"] / hh["change_inside_db"]
    table["answer"] = (
        f"Inside the scar HV changes {hv['change_inside_db']:+.2f} dB and HH "
        f"{hh['change_inside_db']:+.2f} dB between {dates['before']} and {dates['after']}; "
        f"outside, {hv['change_outside_db']:+.2f} and {hh['change_outside_db']:+.2f} dB. "
        f"HV moves {factor:.1f}x more than HH inside the scar: the scar is visible in HV "
        f"and barely in HH. Coherence inside the scar is {fire['inside']:.2f} in the fire "
        f"pair against {control['inside']:.2f} in the control pair (a drop of "
        f"{control['inside'] - fire['inside']:.2f}); outside it is {fire['outside']:.2f} "
        f"and {control['outside']:.2f}."
    )

    stats_path = layers_dir / "stats.json"
    stats = json.loads(stats_path.read_text(encoding="utf-8")) if stats_path.exists() else {}
    stats["act4"] = table
    stats_path.write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")
    return table


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("h5", type=Path, nargs="?", help="GCOV .h5 file (omit with --act4)")
    parser.add_argument("--orbit", help="orbit name, e.g. D52")
    parser.add_argument("--date", help="acquisition date (YYYY-MM-DD)")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("../web/public/layers"),
        help="output directory (default: ../web/public/layers)",
    )
    parser.add_argument(
        "--difference",
        type=Path,
        default=None,
        help="also write dhh/dhv against this earlier GCOV (the change, in dB)",
    )
    parser.add_argument(
        "--before-date",
        default=None,
        help="acquisition date of --difference (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--rgb",
        action="store_true",
        help="also write the HH/HV/HH-HV colour composite of this date",
    )
    parser.add_argument(
        "--act4",
        action="store_true",
        help="write the act-4 table (HH, HV and coherence inside/outside the scar) to stats.json",
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("../data/raw"),
        help="directory with the products (default: ../data/raw)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.act4:
        table = act4_numbers(args.out, args.data)
        print(json.dumps(table, indent=2))
        return 0
    if args.h5 is None or args.orbit is None or args.date is None:
        raise SystemExit("give a GCOV .h5 file with --orbit and --date (or use --act4)")
    if args.difference is not None and args.before_date is None:
        raise SystemExit("--difference needs --before-date")
    extras = args.difference is not None or args.rgb
    if not extras:
        for pol in ("hh", "hv"):
            entry = backscatter_layer(args.h5, pol, args.orbit, args.date, args.out)
            manifest = export.upsert_manifest_entry(args.out / "manifest.json", entry)
            print(f"Wrote {args.out / entry['file']} and updated {manifest}")
    if args.difference is not None:
        for pol in ("hh", "hv"):
            entry = difference_layer(
                args.difference,
                args.h5,
                pol,
                args.orbit,
                [args.before_date, args.date],
                args.out,
            )
            manifest = export.upsert_manifest_entry(args.out / "manifest.json", entry)
            print(f"Wrote {args.out / entry['file']} and updated {manifest}")
    if args.rgb:
        entry = rgb_layer(args.h5, args.orbit, args.date, args.out)
        manifest = export.upsert_manifest_entry(args.out / "manifest.json", entry)
        print(f"Wrote {args.out / entry['file']} and updated {manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
