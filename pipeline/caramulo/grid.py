"""The common output grid. Single source of truth: nobody writes these values elsewhere.

In:  nothing (constants).
Out: BBOX, CRS, WIDTH, HEIGHT, EXTENT_3857 for every raster layer (see docs/CONTRACT.md).
Reads: no product.

Run `python -m caramulo.grid` (inside pipeline/) to check the derived values.
"""

from __future__ import annotations

import math

# lon_min, lat_min, lon_max, lat_max, WGS84. Extended west to -8.50 on
# 2026-11-14 (task A2): the real scar (coherence, fire pair vs control) spans
# lon -8.40..-8.13, so the original -8.35 edge cut its western flank.
BBOX: tuple[float, float, float, float] = (-8.50, 40.45, -7.95, 40.85)
CRS = "EPSG:3857"  # Web Mercator, the map's projection
WIDTH = 2000  # px; the height follows from the bbox (~23 m/px on the ground)

_R = 6378137.0  # Web Mercator sphere radius, m


def _mercator(lon: float, lat: float) -> tuple[float, float]:
    x = math.radians(lon) * _R
    y = math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) * _R
    return x, y


_x0, _y0 = _mercator(BBOX[0], BBOX[1])
_x1, _y1 = _mercator(BBOX[2], BBOX[3])
EXTENT_3857: tuple[float, float, float, float] = (_x0, _y0, _x1, _y1)  # xmin, ymin, xmax, ymax
HEIGHT = round(WIDTH * (_y1 - _y0) / (_x1 - _x0))


if __name__ == "__main__":
    lat_mid = (BBOX[1] + BBOX[3]) / 2
    ground_m_per_px = (_x1 - _x0) / WIDTH * math.cos(math.radians(lat_mid))
    print(f"{WIDTH} x {HEIGHT} px, {ground_m_per_px:.1f} m/px on the ground")
    assert 22 < ground_m_per_px < 25, "the grid is about 23 m per pixel after the west extension"
    assert 0.9 < HEIGHT / WIDTH < 1.1, "the box is roughly square after the west extension"
