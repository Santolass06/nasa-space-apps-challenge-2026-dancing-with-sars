"""Search and download NISAR products from the ASF DAAC.

In:  an area (default: the common grid's bbox), a date range and the processing levels.
Out: NISAR .h5 products in data/raw/ (never committed).
Reads: GCOV and GUNW (search only; the other modules open the files).

Needs a free NASA Earthdata account. Credentials come from ``EARTHDATA_USERNAME`` /
``EARTHDATA_PASSWORD`` or from ``~/.netrc``.

Examples (run inside pipeline/)::

    # list the GUNW and GCOV products over Vouzela around the fire, no download
    uv run python -m caramulo.fetch --start 2026-06-17 --end 2026-07-25 --dry-run

    # download one product by name (use this: a date search can match several GB-sized files)
    uv run python -m caramulo.fetch --scene NISAR_L2_PR_GUNW_..._001 --out ../data/raw
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from caramulo.grid import BBOX


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--bbox",
        nargs=4,
        type=float,
        default=list(BBOX),
        metavar=("MIN_LON", "MIN_LAT", "MAX_LON", "MAX_LAT"),
        help="Area of interest in EPSG:4326 (default: the common grid, caramulo.grid.BBOX)",
    )
    parser.add_argument("--start", help="Start date (YYYY-MM-DD); required unless --scene")
    parser.add_argument("--end", help="End date (YYYY-MM-DD); required unless --scene")
    parser.add_argument(
        "--scene",
        nargs="+",
        metavar="NAME",
        help="Exact product name(s) to fetch; bbox, dates and levels are then ignored",
    )
    parser.add_argument("--out", type=Path, default=Path("../data/raw"), help="Output directory")
    parser.add_argument(
        "--level",
        nargs="+",
        choices=["GCOV", "GUNW"],
        default=["GCOV", "GUNW"],
        help="NISAR processing level(s) (default: GCOV GUNW)",
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
    args = parser.parse_args(argv)
    if not args.scene and not (args.start and args.end):
        parser.error("--start and --end are required unless --scene is given")
    return args


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
        print("asf_search is not installed. Run `uv sync` inside pipeline/.", file=sys.stderr)
        return 1

    if args.scene:
        print(f"Looking up {len(args.scene)} product(s) by name")
        results = asf.granule_search(args.scene)
    else:
        print(f"Searching NISAR {'/'.join(args.level)} for {args.start} → {args.end}")
        results = asf.geo_search(
            dataset="NISAR",
            processingLevel=args.level,
            intersectsWith=bbox_to_wkt(*args.bbox),
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
    print("Done. Record the products in docs/PRODUCTS.md and docs/data-sources.md.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
