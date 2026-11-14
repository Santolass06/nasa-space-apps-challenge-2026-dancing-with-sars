#!/usr/bin/env python3
"""Search and download NISAR products from the ASF DAAC.

Requires a free NASA Earthdata account and the ``asf_search`` package::

    pip install asf_search

Credentials are read from ``EARTHDATA_USERNAME`` / ``EARTHDATA_PASSWORD`` (or prompted
interactively). Products are written to the target directory; nothing is committed.

Examples
--------
List matching products without downloading::

    python scripts/download_nisar.py \
        --bbox -122.5 37.7 -121.9 38.1 --start 2026-01-01 --end 2026-03-01 --dry-run

Download them::

    python scripts/download_nisar.py \
        --bbox -122.5 37.7 -121.9 38.1 --start 2026-01-01 --end 2026-03-01 \
        --out data/raw
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--bbox",
        nargs=4,
        type=float,
        required=True,
        metavar=("MIN_LON", "MIN_LAT", "MAX_LON", "MAX_LAT"),
        help="Area of interest in EPSG:4326",
    )
    parser.add_argument("--start", required=True, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end", required=True, help="End date (YYYY-MM-DD)")
    parser.add_argument("--out", type=Path, default=Path("data/raw"), help="Output directory")
    parser.add_argument(
        "--platform",
        default="NISAR",
        help="ASF platform short name (default: NISAR)",
    )
    parser.add_argument(
        "--max-results",
        type=int,
        default=100,
        help="Maximum number of products to return (default: 100)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only list the matching products, do not download",
    )
    return parser.parse_args(argv)


def bbox_to_wkt(min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> str:
    """Return a closed WKT polygon for the bounding box."""
    return (
        f"POLYGON(({min_lon} {min_lat}, {max_lon} {min_lat}, "
        f"{max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat}))"
    )


def build_session(asf):
    """Return an authenticated ASF session, or None to use ~/.netrc."""
    username = os.environ.get("EARTHDATA_USERNAME")
    password = os.environ.get("EARTHDATA_PASSWORD")

    if not username or not password:
        print(
            "No EARTHDATA_USERNAME/EARTHDATA_PASSWORD in the environment; "
            "falling back to ~/.netrc if present.",
            file=sys.stderr,
        )
        return None

    session = asf.ASFSession()
    session.auth_with_creds(username, password)
    return session


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    try:
        import asf_search as asf
    except ImportError:
        print(
            "asf_search is not installed. Install it in the backend virtualenv:\n"
            "    backend/.venv/bin/pip install asf_search",
            file=sys.stderr,
        )
        return 1

    min_lon, min_lat, max_lon, max_lat = args.bbox
    wkt = bbox_to_wkt(min_lon, min_lat, max_lon, max_lat)

    print(f"Searching {args.platform} products for {args.start} → {args.end}")
    results = asf.geo_search(
        platform=[args.platform],
        intersectsWith=wkt,
        start=args.start,
        end=args.end,
        maxResults=args.max_results,
    )

    print(f"Found {len(results)} product(s)")
    for product in results:
        properties = product.properties
        print(
            f"  {properties.get('sceneName', '?')}  "
            f"{properties.get('startTime', '?')}  "
            f"{properties.get('polarization', '?')}"
        )

    if not results:
        return 0

    if args.dry_run:
        print("Dry run: nothing downloaded.")
        return 0

    args.out.mkdir(parents=True, exist_ok=True)
    session = build_session(asf)
    print(f"Downloading to {args.out} …")
    results.download(path=str(args.out), session=session)
    print("Done. Remember to cite the products in docs/data-sources.md.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
