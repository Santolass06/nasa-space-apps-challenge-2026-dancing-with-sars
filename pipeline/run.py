"""Runs the pipeline end to end and writes web/public/layers/.

In:  products downloaded by caramulo.fetch into data/raw/ (none yet).
Out: layers, vectors and manifest.json in web/public/layers/ (or --out).
Reads: GUNW and GCOV (see docs/CONTRACT.md).

Real steps arrive with tasks A2 (gunw.py), B2 (gcov.py) and B3 (s2.py);
until then only ``--mock`` works (task T2b): deterministic synthetic layers
on the common grid so the web app (fronts C and D) can be built against the
manifest contract before any NISAR download exists.

The mock's burn scar is an invented ellipse of roughly the real one's size
(14 x 10 km, docs/DOSSIER.md); every entry says in ``source`` and ``caveat``
that it is synthetic. Mock PNGs are 500 px wide (aspect ratio from
caramulo.grid) to keep the repository light; real layers use the full
grid width.

Examples (run inside pipeline/):

    uv run python run.py --mock
    uv run python run.py --mock --out ../data/processed/mock
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from scipy.ndimage import gaussian_filter

from caramulo import export
from caramulo.grid import HEIGHT, WIDTH

REPO_ROOT = Path(__file__).resolve().parent.parent
LAYERS_DIR = REPO_ROOT / "web" / "public" / "layers"

MOCK_WIDTH = 500  # mock-only size; real layers are grid.WIDTH (2000) px wide
MOCK_HEIGHT = round(MOCK_WIDTH * HEIGHT / WIDTH)

_SCAR_CENTER = (0.47, 0.40)  # cx, cy as grid fractions (invented, near Vouzela)
_SCAR_RADII = (0.155, 0.105)  # rx, ry as grid fractions (~14 x 10 km here)
_EDGE = 0.05  # left-edge fraction left transparent, like a radar swath edge
_SOURCE = "run.py --mock (synthetic, task T2b)"
_FAKE = "Synthetic mock layer for development; not real satellite data."


def _norm(field: np.ndarray) -> np.ndarray:
    """Rescale an array to [0, 1]."""
    span = float(field.max() - field.min())
    return (field - field.min()) / (span if span else 1.0)


def _smooth(rng: np.random.Generator, sigma: float) -> np.ndarray:
    """A smoothed standard-normal field rescaled to [0, 1] (terrain-like, light to compress)."""
    return _norm(gaussian_filter(rng.standard_normal((MOCK_HEIGHT, MOCK_WIDTH)), sigma))


def _scar_weight() -> np.ndarray:
    """Feathered ellipse weight in [0, 1] at the fake scar position."""
    yy, xx = np.mgrid[0:MOCK_HEIGHT, 0:MOCK_WIDTH]
    cx, cy = _SCAR_CENTER
    rx, ry = _SCAR_RADII
    inside = ((xx - cx * MOCK_WIDTH) / (rx * MOCK_WIDTH)) ** 2 + (
        (yy - cy * MOCK_HEIGHT) / (ry * MOCK_HEIGHT)
    ) ** 2 < 1.0
    return np.clip(gaussian_filter(inside.astype(float), MOCK_WIDTH / 60.0), 0.0, 1.0)


def _radar_valid() -> np.ndarray:
    """Valid-pixel mask for the fake radar layers: the left edge is transparent."""
    return np.tile(np.arange(MOCK_WIDTH), (MOCK_HEIGHT, 1)) >= _EDGE * MOCK_WIDTH


def mock_layers(out_dir: Path) -> list[dict]:
    """Write the synthetic PNGs into ``out_dir`` and return their manifest entries."""
    rng = np.random.default_rng(20261114)
    out_dir.mkdir(parents=True, exist_ok=True)

    terrain = _smooth(rng, MOCK_WIDTH / 24.0)
    farmland = _smooth(rng, MOCK_WIDTH / 12.0)
    scar = _scar_weight()
    valid = _radar_valid()

    # Coherence (0..1): high everywhere except on the scar of the fire pair.
    coh_base = 0.82 + 0.10 * (terrain - 0.5) + 0.04 * (_smooth(rng, 6.0) - 0.5)
    coh_fire = np.clip(coh_base - 0.68 * scar + 0.05 * (_smooth(rng, 6.0) - 0.5), 0.0, 1.0)
    coh_ctrl = np.clip(coh_base + 0.03 + 0.04 * (_smooth(rng, 6.0) - 0.5), 0.0, 1.0)

    # Backscatter (dB), independent texture per pass. The scar barely darkens
    # HV on purpose: docs/DOSSIER.md says burned trunks keep returning echo.
    def backscatter(base_db: float, gain_db: float, scar_drop_db: float) -> np.ndarray:
        return (
            base_db
            + gain_db * (terrain - 0.5)
            + 1.5 * (_smooth(rng, 6.0) - 0.5)
            - scar_drop_db * scar
        )

    hh_before = backscatter(-10.0, 6.0, 0.0)
    hh_after = backscatter(-10.0, 6.0, 2.0)
    hv_before = backscatter(-14.0, 5.0, 0.0)
    hv_after = backscatter(-14.0, 5.0, 1.5)

    def s2_rgb(burned: bool) -> np.ndarray:
        """Sentinel-2-like true color: green forest, tan farmland, dark scar."""
        forest = np.stack(
            [40.0 + 50.0 * terrain, 75.0 + 60.0 * terrain, 30.0 + 35.0 * terrain],
            axis=-1,
        )
        farm = np.array([150.0, 138.0, 92.0])
        farm_w = np.clip((farmland - 0.60) * 6.0, 0.0, 1.0)[..., None]
        rgb = forest * (1.0 - farm_w) + farm * farm_w
        if burned:
            burn = np.array([38.0, 30.0, 24.0])
            w = (0.9 * scar)[..., None]
            rgb = rgb * (1.0 - w) + burn * w
        return np.round(np.clip(rgb, 0.0, 255.0)).astype(np.uint8)

    entries: list[dict] = []

    def emit(entry: dict, rgba: np.ndarray) -> None:
        export.write_png(out_dir / entry["file"], rgba)
        entries.append(entry)

    def layer(**meta) -> dict:
        return export.layer_entry(source=_SOURCE, **meta)

    emit(
        layer(
            layer_id="coh_D52_20260629_20260711",
            kind="coh",
            file="coh_D52_20260629_20260711.png",
            orbit="D52",
            dates=["2026-06-29", "2026-07-11"],
            title="Coherence, 29 Jun to 11 Jul",
            units="coherence",
            value_range=[0.0, 1.0],
            colormap="gray",
            caveat=_FAKE + " The dark ellipse is the fake burn scar.",
        ),
        export.scalar_rgba(coh_fire, "gray", 0.0, 1.0, valid),
    )
    emit(
        layer(
            layer_id="coh_D52_20260711_20260723",
            kind="coh",
            file="coh_D52_20260711_20260723.png",
            orbit="D52",
            dates=["2026-07-11", "2026-07-23"],
            title="Coherence, 11 Jul to 23 Jul (control)",
            units="coherence",
            value_range=[0.0, 1.0],
            colormap="gray",
            caveat=_FAKE + " Control pair: no change expected after the fire.",
        ),
        export.scalar_rgba(coh_ctrl, "gray", 0.0, 1.0, valid),
    )
    for date, data, when in (
        ("20260629", hh_before, "29 Jun"),
        ("20260711", hh_after, "11 Jul"),
    ):
        emit(
            layer(
                layer_id=f"hh_D52_{date}",
                kind="hh",
                file=f"hh_D52_{date}.png",
                orbit="D52",
                dates=[f"{date[:4]}-{date[4:6]}-{date[6:]}"],
                title=f"Backscatter HH, {when}",
                units="dB",
                value_range=[-20.0, -4.0],
                colormap="viridis",
                caveat=_FAKE + " Speckle and terrain are invented.",
            ),
            export.scalar_rgba(data, "viridis", -20.0, -4.0, valid),
        )
    for date, data, when, note in (
        ("20260629", hv_before, "29 Jun", "Speckle and terrain are invented."),
        (
            "20260711",
            hv_after,
            "11 Jul",
            "The scar darkens only slightly, as in the real data.",
        ),
    ):
        emit(
            layer(
                layer_id=f"hv_D52_{date}",
                kind="hv",
                file=f"hv_D52_{date}.png",
                orbit="D52",
                dates=[f"{date[:4]}-{date[4:6]}-{date[6:]}"],
                title=f"Backscatter HV, {when}",
                units="dB",
                value_range=[-24.0, -8.0],
                colormap="magma",
                caveat=_FAKE + " " + note,
            ),
            export.scalar_rgba(data, "magma", -24.0, -8.0, valid),
        )
    for date, burned, when in (
        ("20260628", False, "28 Jun"),
        ("20260712", True, "12 Jul"),
    ):
        emit(
            layer(
                layer_id=f"s2_{date}",
                kind="s2",
                file=f"s2_{date}.png",
                orbit=None,
                dates=[f"{date[:4]}-{date[4:6]}-{date[6:]}"],
                title=f"Sentinel-2 true color, {when}",
                units="RGB",
                value_range=[0.0, 255.0],
                colormap="rgb",
                caveat=_FAKE + " Colors are invented, not Sentinel-2 data.",
            ),
            export.rgb_rgba(s2_rgb(burned)),
        )
    return entries


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="write the synthetic layers and manifest.json (task T2b)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=LAYERS_DIR,
        help="output directory (default: web/public/layers)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="overwrite a manifest that already lists real (non-synthetic) layers",
    )
    return parser.parse_args(argv)


def _real_layer_count(manifest_path: Path) -> int:
    """Layers in the manifest that did not come from --mock."""
    if not manifest_path.exists():
        return 0
    data = json.loads(manifest_path.read_text())
    layers = data.get("layers", [])
    return sum(1 for layer in layers if "synthetic" not in str(layer.get("source", "")))


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if not args.mock:
        raise SystemExit(
            "Nothing to do: only --mock is implemented so far (task T2b). Real steps "
            "arrive with A2 (gunw.py), B2 (gcov.py) and B3 (s2.py); see docs/PLAN.md."
        )
    manifest_path = args.out / "manifest.json"
    real = _real_layer_count(manifest_path)
    if real and not args.force:
        raise SystemExit(
            f"{manifest_path} already lists {real} real layer(s): --mock would replace them "
            "with synthetic entries and leave the real PNGs orphaned. "
            "Pass --force to overwrite anyway."
        )
    entries = mock_layers(args.out)
    manifest = export.write_manifest(args.out / "manifest.json", entries)
    print(f"Wrote {len(entries)} mock layers + {manifest.name} to {args.out}")
    for entry in entries:
        size_kib = (args.out / entry["file"]).stat().st_size / 1024
        print(f"  {entry['file']:<40} {size_kib:6.0f} KiB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
