"""True-colour Sentinel-2 context image.

In:  a Sentinel-2 L2A scene from the Earth Search STAC catalogue and the common grid.
Out: an s2 PNG + manifest entry.
Reads: Sentinel-2 L2A (Copernicus; no login needed).
"""

import argparse
from datetime import date
from pathlib import Path

import numpy as np
import rasterio
from pystac_client import Client
from rasterio.enums import ColorInterp, Resampling
from rasterio.transform import from_bounds
from rasterio.vrt import WarpedVRT

from caramulo import export
from caramulo.export import (
    downsample_rgba,
    layer_entry,
    lod_files,
    rgb_index,
    rgb_rgba,
    write_manifest,
    write_palette_png,
)
from caramulo.grid import BBOX, CRS, EXTENT_3857, HEIGHT, WIDTH

CATALOG_URL = "https://earth-search.aws.element84.com/v1"
COLLECTION = "sentinel-2-l2a"
DEFAULT_OUT = Path(__file__).resolve().parents[2] / "web" / "public" / "layers"
SCENES = {
    date(2026, 6, 29): (
        "S2A_29TNF_20260629_0_L2A",
        "S2A_29TNE_20260629_0_L2A",
    ),
    date(2026, 7, 9): (
        "S2A_29TNF_20260709_0_L2A",
        "S2A_29TNE_20260709_0_L2A",
    ),
}
CAVEATS = {
    date(2026, 6, 29): "Isolated clouds are visible near the study area.",
    date(2026, 7, 9): ("The burn scar is visible, but clouds obscure parts of its western edge."),
}


def render_scene(catalog, day: date) -> np.ndarray:
    """Combine the two tiles from one acquisition on the project grid."""
    collection = catalog.get_collection(COLLECTION)
    items = list(catalog.search(collections=[collection.id], ids=list(SCENES[day])).items())
    by_id = {item.id: item for item in items}
    missing = set(SCENES[day]) - by_id.keys()
    if missing:
        raise ValueError(f"Missing STAC items: {', '.join(sorted(missing))}")

    transform = from_bounds(*EXTENT_3857, WIDTH, HEIGHT)
    rgb = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
    covered = np.zeros((HEIGHT, WIDTH), dtype=bool)

    for item_id in SCENES[day]:
        item = by_id[item_id]
        asset = item.assets.get("visual")
        if asset is None:
            raise ValueError(f"{item_id}: missing visual asset")

        with rasterio.open(asset.href) as source:
            has_alpha = ColorInterp.alpha in source.colorinterp
            with WarpedVRT(
                source,
                crs=CRS,
                transform=transform,
                width=WIDTH,
                height=HEIGHT,
                resampling=Resampling.bilinear,
                add_alpha=not has_alpha,
            ) as tile:
                pixels = tile.read([1, 2, 3]).transpose(1, 2, 0)
                alpha_band = tile.colorinterp.index(ColorInterp.alpha) + 1
                valid = tile.read(alpha_band) > 0
                take = valid & ~covered
                rgb[take] = pixels[take]
                covered |= valid

    if not covered.any():
        raise ValueError(f"{day}: no valid Sentinel-2 pixels on the project grid")
    print(f"{day}: {covered.mean():.1%} of the grid has image data")
    return rgb_rgba(rgb, covered)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args(argv)

    if BBOX[0] > -8.4456:
        parser.error("Update grid.py from PR #28 before exporting Sentinel-2 layers.")

    manifest_path = args.out / "manifest.json"
    layers = []
    if export.manifest_target(manifest_path).exists():
        manifest = export.read_manifest(manifest_path)
        if manifest["bounds"] != list(BBOX):
            parser.error("Existing manifest uses a different grid. Regenerate its layers first.")
        layers = manifest["layers"]

    catalog = Client.open(CATALOG_URL)
    images = {day: render_scene(catalog, day) for day in SCENES}

    for day, rgba in images.items():
        layer_id = f"s2_{day:%Y%m%d}"
        filename, hires = lod_files(layer_id)
        for image, name in ((downsample_rgba(rgba), filename), (rgba, hires)):
            index, palette = rgb_index(image[..., :3])
            index[image[..., 3] < 128] = 255
            write_palette_png(args.out / name, index, palette)
        entry = layer_entry(
            layer_id=layer_id,
            kind="s2",
            file=filename,
            hires=hires,
            orbit=None,
            dates=[day.isoformat()],
            title=f"Sentinel-2 true colour, {day:%d %b %Y}",
            units="RGB",
            value_range=[0, 255],
            colormap="rgb",
            source=(
                "Contains modified Copernicus Sentinel data 2026, "
                f"accessed via Earth Search (Element 84): {', '.join(SCENES[day])}"
            ),
            caveat=CAVEATS[day],
        )
        # Replace in place: re-running must not move the entry to the end.
        for index, layer in enumerate(layers):
            if layer["id"] == layer_id:
                layers[index] = entry
                break
        else:
            layers.append(entry)

    write_manifest(manifest_path, layers)


if __name__ == "__main__":
    main()
