#!/usr/bin/env python
"""
fetch-imagery.py — bake real aerial imagery for the Sentinel world frame.

WHY
    The terrain in Sentinel is a real USGS 3DEP elevation grid, but it is
    rendered with flat-shaded vertex colours. That makes the ridge read as a
    painted diagram rather than a place: there is no light in the image, only
    colour we invented. Draping a true aerial orthophoto over the same DEM is
    what closes the gap to reference-grade terrain — the photo carries its own
    lighting, texture, and colour variation, so the mountain finally looks
    like ground instead of geometry.

    One texture. One draw call. The 19-call budget is unchanged.

SOURCE
    USGS NAIP (National Agriculture Imagery Program), National Map
    ImageServer. Public domain, no key, no rate limit for this volume.

Writes into src/app/map/world/:
    imagery.jpg         aerial orthophoto covering the frame bbox
    imagery.json        provenance: source, bbox, resolution, attribution, date

Run:  python scripts/fetch-imagery.py [--force] [--width 2048]
"""
import argparse
import io
import json
import os
import sys
import time

import requests

CENTER_LAT = 34.032
CENTER_LON = -118.815
WIDTH_M = 6000.0
HEIGHT_M = 3250.0

M_PER_DEG_LAT = 110540.0
M_PER_DEG_LON = 111320.0 * 0.0  # replaced below with the cos() form

import math  # noqa: E402

M_PER_DEG_LON = 111320.0 * math.cos(math.radians(CENTER_LAT))

LAT_D = HEIGHT_M / M_PER_DEG_LAT
LON_D = WIDTH_M / M_PER_DEG_LON

SOUTH = CENTER_LAT - LAT_D / 2
NORTH = CENTER_LAT + LAT_D / 2
WEST = CENTER_LON - LON_D / 2
EAST = CENTER_LON + LON_D / 2

OUT_DIR = os.path.join("src", "app", "map", "world")
OUT_IMG = os.path.join(OUT_DIR, "imagery.jpg")
OUT_META = os.path.join(OUT_DIR, "imagery.json")

# NAIP via the National Map imagery service. Public domain.
IMAGERY_URL = (
    "https://imagery.nationalmap.gov/arcgis/rest/services/"
    "USGSNAIPImagery/ImageServer/exportImage"
)

ATTRIBUTION = (
    "Aerial imagery: USGS NAIP via the National Map ImageServer (public domain)."
)


def fetch_imagery(width: int) -> int:
    """Fetch the orthophoto covering the frame bbox. Returns the pixel height."""
    height = max(1, round(width * (HEIGHT_M / WIDTH_M)))
    print(f"· USGS NAIP aerial imagery … {width}x{height}")
    params = {
        "bbox": f"{WEST},{SOUTH},{EAST},{NORTH}",
        "bboxSR": "4326",
        "size": f"{width},{height}",
        "imageSR": "4326",
        "format": "jpg",
        "quality": "92",
        "f": "image",
    }
    last = None
    for attempt in range(3):
        try:
            r = requests.get(IMAGERY_URL, params=params, timeout=120)
            r.raise_for_status()
            with open(OUT_IMG, "wb") as f:
                f.write(r.content)
            return height
        except Exception as exc:  # noqa: BLE001
            last = exc
            print(f"  ! attempt {attempt + 1} failed: {exc}")
            time.sleep(2 + attempt * 2)
    raise SystemExit(f"imagery fetch failed: {last}")


def write_meta(width: int, height: int) -> None:
    meta = {
        "source": "USGS NAIP (National Agriculture Imagery Program)",
        "service": IMAGERY_URL,
        "license": "public domain (US Government work)",
        "attribution": ATTRIBUTION,
        "bbox": {
            "west": WEST,
            "south": SOUTH,
            "east": EAST,
            "north": NORTH,
        },
        "widthPx": width,
        "heightPx": height,
        "frameMetres": {"width": WIDTH_M, "height": HEIGHT_M},
        "groundResolutionMPerPx": round(WIDTH_M / width, 2),
        "projection": "WGS84 lon/lat, drawn over the local-equirectangular frame",
        "note": (
            "Real orthophoto draped on the real 3DEP DEM. The fire scenario, "
            "zones, and telemetry layered on top remain authored — see "
            "world.ts for the real/authored split."
        ),
    }
    with open(OUT_META, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(f"· wrote {OUT_META}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-download even if present")
    ap.add_argument("--width", type=int, default=2048, help="pixel width (default 2048)")
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    if os.path.exists(OUT_IMG) and os.path.exists(OUT_META) and not args.force:
        print("· imagery already present (use --force to re-fetch)")
        return

    height = fetch_imagery(args.width)
    write_meta(args.width, height)
    size_kb = round(os.path.getsize(OUT_IMG) / 1024)
    print(f"✓ imagery.jpg written ({size_kb} kB)  ·  {ATTRIBUTION}")


if __name__ == "__main__":
    sys.exit(main())
