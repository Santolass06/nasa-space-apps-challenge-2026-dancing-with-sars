"""Writers shared by every module.

In:   numpy arrays on the common grid (caramulo.grid) and layer metadata.
Out:  PNG files with transparency, GeoJSON and manifest.json, all under
      web/public/layers/ (the contract in docs/CONTRACT.md).
Reads: no product.

PNGs are written with the standard library (zlib) plus numpy: RGBA 8-bit,
one filter byte per scanline, no image dependency. Colormaps are linear
interpolations of matplotlib's anchor colors (gray is exact); matplotlib is
deliberately not a dependency for a handful of lookup tables.
"""

from __future__ import annotations

import json
import struct
import zlib
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np

from caramulo.grid import BBOX

if TYPE_CHECKING:
    from shapely.geometry.base import BaseGeometry

# Anchor colors (0-255 RGB) for the colormap names a manifest can carry.
_COLORMAP_ANCHORS: dict[str, list[tuple[int, int, int]]] = {
    "gray": [(0, 0, 0), (255, 255, 255)],
    "viridis": [
        (68, 1, 84),
        (72, 40, 120),
        (62, 74, 137),
        (49, 104, 142),
        (38, 130, 142),
        (31, 158, 137),
        (53, 183, 121),
        (109, 205, 89),
        (180, 222, 38),
        (253, 231, 37),
    ],
    "magma": [
        (0, 0, 4),
        (28, 16, 68),
        (79, 18, 123),
        (129, 37, 129),
        (181, 54, 122),
        (229, 80, 100),
        (251, 135, 97),
        (254, 194, 135),
        (252, 253, 191),
    ],
}


def colormap_lut(name: str) -> np.ndarray:
    """Return a (256, 3) uint8 lookup table for a manifest colormap name."""
    if name not in _COLORMAP_ANCHORS:
        known = ", ".join(_COLORMAP_ANCHORS)
        raise ValueError(f"unknown colormap {name!r}; known: {known}")
    anchors = np.asarray(_COLORMAP_ANCHORS[name], dtype=float)
    steps = np.linspace(0.0, anchors.shape[0] - 1.0, 256)
    i = np.clip(steps.astype(int), 0, anchors.shape[0] - 2)
    f = (steps - i)[:, None]
    lut = anchors[i] * (1.0 - f) + anchors[i + 1] * f
    return np.round(lut).astype(np.uint8)


def scalar_rgba(
    data: np.ndarray,
    colormap: str,
    vmin: float,
    vmax: float,
    mask: np.ndarray | None = None,
) -> np.ndarray:
    """Map a float grid to RGBA: colormap over vmin..vmax, transparent outside ``mask``.

    ``mask`` (default: finite values) marks the visible pixels; everything
    else becomes fully transparent so the web map's basemap shows through.
    Non-finite values are transparent even where ``mask`` is True: they have no
    colour to show.
    """
    data = np.asarray(data, dtype=float)
    if vmax <= vmin:
        raise ValueError(f"vmax must be greater than vmin; got vmin={vmin}, vmax={vmax}")
    finite = np.isfinite(data)
    mask = finite if mask is None else np.asarray(mask, dtype=bool) & finite
    data = np.where(finite, data, vmin)
    lut = colormap_lut(colormap)
    scaled = np.clip((data - vmin) / (vmax - vmin), 0.0, 1.0)
    rgb = lut[np.round(scaled * 255.0).astype(np.uint8)]
    rgba = np.zeros(data.shape + (4,), dtype=np.uint8)
    rgba[..., :3] = rgb
    rgba[..., 3] = np.where(mask, 255, 0).astype(np.uint8)
    return rgba


def rgb_rgba(rgb: np.ndarray, mask: np.ndarray | None = None) -> np.ndarray:
    """Attach alpha to an (h, w, 3) uint8 grid; ``mask`` (default: all) marks visible pixels."""
    rgb = np.asarray(rgb, dtype=np.uint8)
    if rgb.ndim != 3 or rgb.shape[-1] != 3:
        raise ValueError(f"rgb must be (h, w, 3); got shape {rgb.shape}")
    rgba = np.zeros(rgb.shape[:2] + (4,), dtype=np.uint8)
    rgba[..., :3] = rgb
    alpha = np.full(rgb.shape[:2], 255, dtype=np.uint8)
    if mask is not None:
        alpha[~np.asarray(mask, dtype=bool)] = 0
    rgba[..., 3] = alpha
    return rgba


def write_png(path: Path | str, rgba: np.ndarray) -> Path:
    """Write an (h, w, 4) uint8 array as an 8-bit RGBA PNG (zlib only, no image library)."""
    rgba = np.ascontiguousarray(np.asarray(rgba, dtype=np.uint8))
    if rgba.ndim != 3 or rgba.shape[-1] != 4:
        raise ValueError(f"rgba must be (h, w, 4); got shape {rgba.shape}")
    height, width = rgba.shape[:2]
    if height <= 0 or width <= 0:
        raise ValueError(f"PNG dimensions must be positive; got {width}x{height}")

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", zlib.crc32(tag + payload))
        )

    scanlines = b"".join(b"\x00" + row.tobytes() for row in rgba)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(scanlines, 9))
        + chunk(b"IEND", b"")
    )
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)
    return path


def read_png(path: Path | str) -> np.ndarray:
    """Read an 8-bit RGBA PNG written by write_png back into an (h, w, 4) uint8 array.

    Only our own outputs are supported (filter byte 0 per scanline, no interlace).
    """
    data = Path(path).read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path} is not a PNG")
    pos, chunks, idat = 8, {}, []
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        tag = data[pos + 4 : pos + 8]
        payload = data[pos + 8 : pos + 8 + length]
        if tag == b"IDAT":  # the PNG spec allows the stream to span several IDAT chunks
            idat.append(payload)
        else:
            chunks[tag] = payload
        pos += 12 + length
    width, height, depth, color = struct.unpack(">IIBB", chunks[b"IHDR"][:10])
    if (depth, color) != (8, 6):
        raise ValueError(f"{path}: only 8-bit RGBA PNGs are supported ({depth=}, {color=})")
    raw = zlib.decompress(b"".join(idat))
    rows = np.frombuffer(raw, np.uint8).reshape(height, 1 + 4 * width)
    return rows[:, 1:].reshape(height, width, 4)


def layer_entry(
    *,
    layer_id: str,
    kind: str,
    file: str,
    orbit: str | None,
    dates: list[str],
    title: str,
    units: str,
    value_range: list[float],
    colormap: str,
    source: str,
    caveat: str,
) -> dict:
    """Build one manifest entry with exactly the fields of docs/CONTRACT.md."""
    return {
        "id": layer_id,
        "kind": kind,
        "file": file,
        "orbit": orbit,
        "dates": dates,
        "title": title,
        "units": units,
        "range": value_range,
        "colormap": colormap,
        "source": source,
        "caveat": caveat,
    }


def write_manifest(path: Path | str, layers: list[dict]) -> Path:
    """Write manifest.json: version, bounds (single source: caramulo.grid) and layers."""
    manifest = {"version": 1, "bounds": list(BBOX), "layers": layers}
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2) + "\n")
    return path


def upsert_manifest_entry(path: Path | str, entry: dict) -> Path:
    """Insert or replace one layer entry in manifest.json, keeping the other layers."""
    path = Path(path)
    layers: list[dict] = []
    if path.exists():
        existing = json.loads(path.read_text())
        layers = [layer for layer in existing.get("layers", []) if layer.get("id") != entry["id"]]
    layers.append(entry)
    return write_manifest(path, layers)


def write_geojson(path: Path | str, features: list[tuple[BaseGeometry, dict]]) -> Path:
    """Write a FeatureCollection; each feature is a (shapely geometry, properties) pair."""
    collection = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": geometry.__geo_interface__,
                "properties": props,
            }
            for geometry, props in features
        ],
    }
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(collection, indent=2) + "\n")
    return path


if __name__ == "__main__":
    import struct as _st
    import tempfile
    import zlib as _z

    tmp = Path(tempfile.mkdtemp())
    rng = np.random.default_rng(0)

    # write_png / read_png round trip
    img = rng.integers(0, 256, size=(9, 13, 4), dtype=np.uint8)
    assert np.array_equal(read_png(write_png(tmp / "a.png", img)), img)

    # read_png accepts the compressed stream split over two IDAT chunks
    raw = b"".join(b"\x00" + row.tobytes() for row in img)
    z = _z.compress(raw)
    cut = len(z) // 2

    def _chunk(tag, payload):
        return (
            _st.pack(">I", len(payload)) + tag + payload + _st.pack(">I", _z.crc32(tag + payload))
        )

    two = (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", _st.pack(">IIBBBBB", 13, 9, 8, 6, 0, 0, 0))
        + _chunk(b"IDAT", z[:cut])
        + _chunk(b"IDAT", z[cut:])
        + _chunk(b"IEND", b"")
    )
    (tmp / "two.png").write_bytes(two)
    assert np.array_equal(read_png(tmp / "two.png"), img)

    # NaN is transparent even inside an explicit mask
    out = scalar_rgba(np.array([[np.nan, 0.5]]), "gray", 0.0, 1.0, mask=np.array([[True, True]]))
    assert out[0, 0, 3] == 0 and out[0, 1, 3] == 255

    # a PNG needs positive dimensions
    for bad in (
        np.zeros((0, 0, 4), np.uint8),
        np.zeros((0, 5, 4), np.uint8),
        np.zeros((5, 0, 4), np.uint8),
    ):
        try:
            write_png(tmp / "bad.png", bad)
        except ValueError:
            pass
        else:
            raise AssertionError(f"write_png accepted shape {bad.shape}")
    print("export self-check ok")
