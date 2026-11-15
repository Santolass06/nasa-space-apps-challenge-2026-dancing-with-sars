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
    "rdbu": [
        (33, 102, 172),
        (103, 169, 207),
        (209, 229, 240),
        (247, 247, 247),
        (253, 219, 199),
        (239, 138, 98),
        (178, 24, 43),
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


def write_png(path: Path | str, rgba: np.ndarray, filter_type: int = 0) -> Path:
    """Write an (h, w, 4) uint8 array as an 8-bit RGBA PNG (zlib only, no image library).

    ``filter_type`` is the PNG row filter: 0 (None) or 2 (Up, each row minus the
    previous one). "Up" compresses noisy imagery ~20% better.
    """
    rgba = np.ascontiguousarray(np.asarray(rgba, dtype=np.uint8))
    if rgba.ndim != 3 or rgba.shape[-1] != 4:
        raise ValueError(f"rgba must be (h, w, 4); got shape {rgba.shape}")
    height, width = rgba.shape[:2]
    if height <= 0 or width <= 0:
        raise ValueError(f"PNG dimensions must be positive; got {width}x{height}")
    if filter_type not in (0, 2):
        raise ValueError(f"filter_type must be 0 or 2; got {filter_type}")

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return _chunk(tag, payload)

    rows = rgba.reshape(height, width * 4)
    scanlines = _scanlines(rows, filter_type)
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


def _scanlines(rows: np.ndarray, filter_type: int) -> bytes:
    """Encode byte rows (h, n) into PNG scanlines with filter 0 or 2 (Up)."""
    if filter_type == 0:
        return b"".join(b"\x00" + row.tobytes() for row in rows)
    previous = np.zeros(rows.shape[1], dtype=np.uint8)
    parts = []
    for row in rows:
        delta = (row.astype(np.uint16) - previous.astype(np.uint16)) % 256
        parts.append(b"\x02" + delta.astype(np.uint8).tobytes())
        previous = row
    return b"".join(parts)


def _chunk(tag: bytes, payload: bytes) -> bytes:
    body = struct.pack(">I", len(payload)) + tag + payload
    return body + struct.pack(">I", zlib.crc32(tag + payload))


def write_gray_png(path: Path | str, gray: np.ndarray, alpha: np.ndarray | None = None) -> Path:
    """Write an (h, w) uint8 gray image with an alpha channel (PNG colour type 4, filter Up)."""
    gray = np.ascontiguousarray(np.asarray(gray, dtype=np.uint8))
    if gray.ndim != 2:
        raise ValueError(f"gray must be (h, w); got shape {gray.shape}")
    height, width = gray.shape
    if height <= 0 or width <= 0:
        raise ValueError(f"PNG dimensions must be positive; got {width}x{height}")
    if alpha is None:
        alpha = np.full_like(gray, 255)
    alpha = np.ascontiguousarray(np.asarray(alpha, dtype=np.uint8))
    if alpha.shape != gray.shape:
        raise ValueError(f"alpha must match gray; got {alpha.shape} vs {gray.shape}")
    rows = np.stack([gray, alpha], axis=-1).reshape(height, width * 2)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 4, 0, 0, 0))
        + _chunk(b"IDAT", zlib.compress(_scanlines(rows, 2), 9))
        + _chunk(b"IEND", b"")
    )
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)
    return path


def scalar_index(
    data: np.ndarray,
    colormap: str,
    vmin: float,
    vmax: float,
    mask: np.ndarray | None = None,
) -> np.ndarray:
    """Map a float grid to palette indices 0-254 over vmin..vmax; 255 means transparent.

    The 256th palette slot is reserved for nodata, so the colormap is sampled at
    255 steps. Same normalisation as ``scalar_rgba``.
    """
    data = np.asarray(data, dtype=float)
    if vmax <= vmin:
        raise ValueError(f"vmax must be greater than vmin; got vmin={vmin}, vmax={vmax}")
    finite = np.isfinite(data)
    mask = finite if mask is None else np.asarray(mask, dtype=bool) & finite
    data = np.where(finite, data, vmin)
    scaled = np.clip((data - vmin) / (vmax - vmin), 0.0, 1.0)
    index = np.round(scaled * 254.0).astype(np.uint8)
    index[~mask] = 255
    return index


def write_palette_png(path: Path | str, index: np.ndarray, palette: str | np.ndarray) -> Path:
    """Write an (h, w) uint8 index image as a 256-colour PNG (colour type 3, filter Up).

    ``palette`` is a colormap name (see ``colormap_lut``) or an explicit (n, 3)
    uint8 palette; index 255 is transparent.
    """
    index = np.ascontiguousarray(np.asarray(index, dtype=np.uint8))
    if index.ndim != 2:
        raise ValueError(f"index must be (h, w); got shape {index.shape}")
    height, width = index.shape
    if height <= 0 or width <= 0:
        raise ValueError(f"PNG dimensions must be positive; got {width}x{height}")
    if isinstance(palette, str):
        lut = colormap_lut(palette)
        colours = np.zeros((256, 3), dtype=np.uint8)
        colours[:255] = lut[np.round(np.linspace(0.0, 255.0, 255)).astype(int)]
    else:
        colours = np.asarray(palette, dtype=np.uint8)
        if colours.ndim != 2 or colours.shape[1] != 3 or colours.shape[0] > 255:
            raise ValueError(f"palette must be (n, 3) with n <= 255; got {colours.shape}")
        colours = np.vstack([colours, np.zeros((256 - colours.shape[0], 3), np.uint8)])
    trns = np.full(256, 255, dtype=np.uint8)
    trns[255] = 0
    png = (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 3, 0, 0, 0))
        + _chunk(b"PLTE", colours.tobytes())
        + _chunk(b"tRNS", trns.tobytes())
        + _chunk(b"IDAT", zlib.compress(_scanlines(index, 2), 9))
        + _chunk(b"IEND", b"")
    )
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)
    return path


def rgb_index(rgb: np.ndarray, levels: int = 6) -> tuple[np.ndarray, np.ndarray]:
    """Quantise an (h, w, 3) uint8 image to a levels^3 RGB cube.

    Returns (index, palette) for ``write_palette_png``; index 255 is left free
    for transparency. ``levels`` must be at most 6 (6^3 = 216 colours).
    """
    rgb = np.asarray(rgb, dtype=np.uint8)
    if rgb.ndim != 3 or rgb.shape[-1] != 3:
        raise ValueError(f"rgb must be (h, w, 3); got shape {rgb.shape}")
    if not 2 <= levels <= 6:
        raise ValueError(f"levels must be between 2 and 6; got {levels}")
    step = 255 // (levels - 1)
    quantised = np.round(rgb.astype("float32") / step).astype(np.uint8)
    index = (
        quantised[..., 0].astype(np.uint16) * levels * levels
        + quantised[..., 1].astype(np.uint16) * levels
        + quantised[..., 2].astype(np.uint16)
    ).astype(np.uint8)
    ramp = np.arange(levels) * step
    palette = np.stack(np.meshgrid(ramp, ramp, ramp, indexing="ij"), axis=-1)
    return index, palette.reshape(-1, 3).astype(np.uint8)


def downsample2(array: np.ndarray) -> np.ndarray:
    """Halve both dimensions with a NaN-aware 2x2 mean (odd edges are dropped)."""
    array = np.asarray(array, dtype="float32")
    height = array.shape[0] // 2 * 2
    width = array.shape[1] // 2 * 2
    blocks = array[:height, :width].reshape(height // 2, 2, width // 2, 2)
    valid = np.isfinite(blocks)
    total = np.where(valid, blocks, 0.0).sum(axis=(1, 3))
    count = valid.sum(axis=(1, 3))
    with np.errstate(invalid="ignore", divide="ignore"):
        mean = np.where(count > 0, total / count, np.nan)
    return mean.astype("float32")


def downsample_rgba(rgba: np.ndarray) -> np.ndarray:
    """Halve an RGBA image with an alpha-weighted 2x2 mean (transparent pixels stay neutral)."""
    rgba = np.asarray(rgba, dtype=np.uint8)
    if rgba.ndim != 3 or rgba.shape[-1] != 4:
        raise ValueError(f"rgba must be (h, w, 4); got shape {rgba.shape}")
    height = rgba.shape[0] // 2 * 2
    width = rgba.shape[1] // 2 * 2
    rgb = rgba[..., :3].astype("float32")
    alpha = rgba[..., 3].astype("float32") / 255.0

    def blocks(array: np.ndarray) -> np.ndarray:
        return array[:height, :width].reshape(height // 2, 2, width // 2, 2, *array.shape[2:])

    weight = blocks(alpha).sum(axis=(1, 3))
    weighted = blocks(rgb * alpha[..., None]).sum(axis=(1, 3)) / np.maximum(weight, 1e-6)[..., None]
    out = np.empty((height // 2, width // 2, 4), dtype=np.uint8)
    out[..., :3] = np.clip(weighted, 0, 255).astype(np.uint8)
    out[..., 3] = np.where(weight / 4.0 > 0.5, 255, 0).astype(np.uint8)
    return out


def read_png(path: Path | str) -> np.ndarray:
    """Read one of our PNGs back into an (h, w, 4) uint8 RGBA array.

    Supports colour types 6 (RGBA), 4 (gray+alpha) and 3 (palette + tRNS), 8-bit,
    row filters 0 (None) and 2 (Up), no interlace.
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
    if depth != 8 or color not in (3, 4, 6):
        raise ValueError(
            f"{path}: only 8-bit RGBA, gray+alpha and palette PNGs are supported "
            f"({depth=}, {color=})"
        )
    bytes_per_pixel = {6: 4, 4: 2, 3: 1}[color]
    raw = zlib.decompress(b"".join(idat))
    rows = np.frombuffer(raw, np.uint8).reshape(height, 1 + bytes_per_pixel * width)
    out = np.empty((height, bytes_per_pixel * width), dtype=np.uint8)
    previous = np.zeros(bytes_per_pixel * width, dtype=np.uint8)
    for y in range(height):
        filter_byte = int(rows[y, 0])
        line = rows[y, 1:]
        if filter_byte == 0:
            current = line
        elif filter_byte == 2:  # Up: add the row above, modulo 256
            current = (line.astype(np.uint16) + previous).astype(np.uint8)
        else:
            raise ValueError(f"{path}: unsupported PNG row filter {filter_byte}")
        out[y] = current
        previous = current
    if color == 6:
        return out.reshape(height, width, 4)
    if color == 4:
        pixels = out.reshape(height, width, 2)
        rgba = np.empty((height, width, 4), dtype=np.uint8)
        rgba[..., 0] = rgba[..., 1] = rgba[..., 2] = pixels[..., 0]
        rgba[..., 3] = pixels[..., 1]
        return rgba
    palette = np.frombuffer(chunks[b"PLTE"], np.uint8).reshape(-1, 3)
    trns = np.frombuffer(chunks.get(b"tRNS", b""), np.uint8)
    index = out.reshape(height, width)
    rgba = np.empty((height, width, 4), dtype=np.uint8)
    rgba[..., :3] = palette[index]
    alpha = np.full((height, width), 255, dtype=np.uint8)
    if trns.size:
        transparent = index < trns.size
        alpha[transparent] = trns[index[transparent]]
    rgba[..., 3] = alpha
    return rgba


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
    """Insert or replace one layer entry in manifest.json, keeping the other layers.

    A replaced entry keeps its original position, so re-running one step does not
    reshuffle the manifest and every diff stays about the data, not the order.
    """
    path = Path(path)
    layers: list[dict] = []
    replaced = False
    if path.exists():
        existing = json.loads(path.read_text())
        for layer in existing.get("layers", []):
            if layer.get("id") == entry["id"]:
                layers.append(entry)
                replaced = True
            else:
                layers.append(layer)
    if not replaced:
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

    # gray+alpha and palette round trips
    gray = rng.integers(0, 256, size=(7, 5), dtype=np.uint8)
    alpha = rng.integers(0, 256, size=(7, 5), dtype=np.uint8)
    back = read_png(write_gray_png(tmp / "g.png", gray, alpha))
    assert np.array_equal(back[..., 0], gray) and np.array_equal(back[..., 3], alpha)

    index = scalar_index(np.array([[np.nan, 0.0, 1.0]]), "viridis", 0.0, 1.0)
    back = read_png(write_palette_png(tmp / "p.png", index, "viridis"))
    assert back[0, 0, 3] == 0 and back[0, 2, 3] == 255
    assert tuple(back[0, 2, :3]) == tuple(colormap_lut("viridis")[255])

    # downsample2 averages 2x2 blocks and ignores NaN
    field = np.array([[1.0, 3.0, np.nan, np.nan], [2.0, 4.0, np.nan, np.nan]], dtype="float32")
    small = downsample2(field)
    assert small.shape == (1, 2) and small[0, 0] == 2.5 and np.isnan(small[0, 1])

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
