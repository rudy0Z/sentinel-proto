#!/usr/bin/env python
"""
fetch-world-data.py — bake real-world data for the Sentinel world frame.

Frame: Encinal Canyon WUI, Malibu CA. Center (34.032, -118.815),
2.0 km E-W x 1.1 km N-S. Ridge (steep, ~250m relief) in the north third,
residential band in the flat south third — matches the original basemap's
composition and the SVG overlay's zone semantics.

Downloads (all free, attributed):
  - USGS 3DEP elevation (public domain) via the National Map ImageServer
  - OSM buildings + roads + landuse (ODbL, (c) OpenStreetMap contributors)
    via Overpass, with mirror fallback

Writes into src/app/map/world/:
  - frame.json        bbox, center, projection, attribution
  - dem.npz           float32 elevation grid (400x220, ~5m cells) + bounds
  - buildings.json    footprints in local metres + heights
  - roads.json        centerlines in local metres + type/width/name
  - landuse.json      vegetation/scrub polygons in local metres

Run:  python scripts/fetch-world-data.py [--force]
"""
import argparse
import json
import os
import sys
import time

import numpy as np
import requests

# ── Frame ────────────────────────────────────────────────────────────────────
CENTER_LAT = 34.032
CENTER_LON = -118.815
WIDTH_M = 2000.0    # E-W
HEIGHT_M = 1100.0   # N-S

M_PER_DEG_LAT = 110540.0
M_PER_DEG_LON = 111320.0 * np.cos(np.radians(CENTER_LAT))

LAT_D = HEIGHT_M / M_PER_DEG_LAT
LON_D = WIDTH_M / M_PER_DEG_LON

SOUTH = CENTER_LAT - LAT_D / 2
NORTH = CENTER_LAT + LAT_D / 2
WEST = CENTER_LON - LON_D / 2
EAST = CENTER_LON + LON_D / 2

OUT_DIR = os.path.join("src", "app", "map", "world")

OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
DEM_URL = (
    "https://elevation.nationalmap.gov/arcgis/rest/services/"
    "3DEPElevation/ImageServer/exportImage"
)


def lonlat_to_local(lon: float, lat: float):
    """WGS84 → local metres, origin at frame center, +x east, +y north."""
    x = (lon - CENTER_LON) * M_PER_DEG_LON
    y = (lat - CENTER_LAT) * M_PER_DEG_LAT
    return round(x, 1), round(y, 1)


def fetch_dem() -> np.ndarray:
    print("· USGS 3DEP elevation …")
    params = {
        "bbox": f"{WEST},{SOUTH},{EAST},{NORTH}",
        "bboxSR": "4326",
        "size": "400,220",  # ~5 m cells (interpolated from 10 m source)
        "imageSR": "4326",
        "format": "tiff",
        "pixelType": "F32",
        "interpolation": "RSP_BilinearInterpolation",
        "f": "image",
    }
    r = requests.get(DEM_URL, params=params, timeout=90)
    r.raise_for_status()
    tmp = os.path.join(OUT_DIR, "_dem_tmp.tif")
    with open(tmp, "wb") as f:
        f.write(r.content)
    import rasterio

    with rasterio.open(tmp) as src:
        dem = src.read(1).astype(np.float32)
    os.remove(tmp)
    print(f"  {dem.shape[1]}x{dem.shape[0]} samples, relief "
          f"{dem.max() - dem.min():.0f} m ({dem.min():.0f}-{dem.max():.0f} m)")
    return dem


def overpass(query: str):
    last_err = None
    for attempt in range(3):
        for mirror in OVERPASS_MIRRORS:
            try:
                r = requests.get(
                    mirror,
                    params={"data": query},
                    timeout=120,
                    headers={"User-Agent": "sentinel-portfolio/1.0"},
                )
                if r.status_code == 200:
                    return r.json()["elements"]
                last_err = f"{mirror} → HTTP {r.status_code}"
                print(f"  {last_err}")
            except requests.RequestException as exc:
                last_err = f"{mirror} → {type(exc).__name__}"
                print(f"  {last_err}")
            time.sleep(20)  # back off hard — 429s mean we're hot
    raise RuntimeError(f"all Overpass attempts failed; last: {last_err}")


def fetch_buildings():
    print("· OSM buildings …")
    q = (
        f'[out:json][timeout:60];'
        f'(way["building"]({SOUTH},{WEST},{NORTH},{EAST}););out geom;'
    )
    els = overpass(q)
    out = []
    for el in els:
        geom = el.get("geometry", [])
        if len(geom) < 3:
            continue
        tags = el.get("tags", {})
        levels = tags.get("building:levels")
        height_tag = tags.get("height")
        if height_tag:
            try:
                height = float(str(height_tag).split()[0])
            except ValueError:
                height = None
        else:
            height = None
        if height is None and levels:
            try:
                height = float(levels) * 3.1
            except ValueError:
                height = None
        out.append({
            "id": el["id"],
            "kind": tags.get("building", "yes"),
            "height": height,  # null → renderer uses kind default
            "footprint": [lonlat_to_local(p["lon"], p["lat"]) for p in geom],
        })
    print(f"  {len(out)} buildings")
    return out


ROAD_WIDTHS = {
    "motorway": 16, "trunk": 14, "primary": 12, "secondary": 10,
    "tertiary": 8, "residential": 6, "unclassified": 5, "service": 4,
    "living_street": 5,
}


def fetch_roads():
    print("· OSM roads …")
    kinds = "|".join(ROAD_WIDTHS)
    q = (
        f'[out:json][timeout:60];'
        f'(way["highway"~"{kinds}"]({SOUTH},{WEST},{NORTH},{EAST}););out geom;'
    )
    els = overpass(q)
    out = []
    for el in els:
        geom = el.get("geometry", [])
        if len(geom) < 2:
            continue
        tags = el.get("tags", {})
        kind = tags.get("highway", "unclassified")
        out.append({
            "id": el["id"],
            "kind": kind,
            "width": ROAD_WIDTHS.get(kind, 5),
            "name": tags.get("name"),
            "points": [lonlat_to_local(p["lon"], p["lat"]) for p in geom],
        })
    print(f"  {len(out)} road ways")
    return out


def fetch_landuse():
    print("· OSM landuse / natural polygons …")
    q = (
        f'[out:json][timeout:60];'
        f'(way["landuse"~"forest|farmland|grass|meadow|orchard|vineyard"]'
        f'({SOUTH},{WEST},{NORTH},{EAST});'
        f'way["natural"~"wood|scrub|grassland|wetland"]'
        f'({SOUTH},{WEST},{NORTH},{EAST});'
        f'relation["landuse"~"forest"]({SOUTH},{WEST},{NORTH},{EAST}););'
        f'out geom;'
    )
    els = overpass(q)
    out = []
    for el in els:
        tags = el.get("tags", {})
        kind = tags.get("landuse") or tags.get("natural")
        members = el.get("members") if el["type"] == "relation" else None
        if members:
            # take the outer ways only
            for m in members:
                if m.get("role") in ("outer", "") and "geometry" in m:
                    out.append({
                        "id": f'{el["id"]}-{m.get("ref")}',
                        "kind": kind,
                        "polygon": [lonlat_to_local(p["lon"], p["lat"])
                                    for p in m["geometry"]],
                    })
        else:
            geom = el.get("geometry", [])
            if len(geom) >= 3:
                out.append({
                    "id": el["id"],
                    "kind": kind,
                    "polygon": [lonlat_to_local(p["lon"], p["lat"]) for p in geom],
                })
    print(f"  {len(out)} landuse polygons")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true",
                    help="re-download even if outputs exist")
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    frame_path = os.path.join(OUT_DIR, "frame.json")
    if not args.force and os.path.exists(frame_path) and os.path.exists(
        os.path.join(OUT_DIR, "dem.npz")
    ):
        print("world data already baked (use --force to re-fetch)")
        return

    dem = fetch_dem()
    np.savez_compressed(
        os.path.join(OUT_DIR, "dem.npz"),
        elevation=dem,
        south=SOUTH, north=NORTH, west=WEST, east=EAST,
    )
    # Browser-side copy: rounded to 0.1 m keeps the JSON ~0.5 MB.
    with open(os.path.join(OUT_DIR, "dem.json"), "w") as f:
        json.dump({
            "cols": dem.shape[1],
            "rows": dem.shape[0],
            "cellMeters": round(WIDTH_M / dem.shape[1], 2),
            "elevation": [[round(float(v), 1) for v in row] for row in dem],
        }, f)
    print("  saved dem.npz + dem.json ✓")

    buildings = fetch_buildings()
    with open(os.path.join(OUT_DIR, "buildings.json"), "w") as f:
        json.dump(buildings, f)
    print("  saved buildings.json ✓")

    roads = fetch_roads()
    with open(os.path.join(OUT_DIR, "roads.json"), "w") as f:
        json.dump(roads, f)
    print("  saved roads.json ✓")

    try:
        landuse = fetch_landuse()
        with open(os.path.join(OUT_DIR, "landuse.json"), "w") as f:
            json.dump(landuse, f)
        print("  saved landuse.json ✓")
    except RuntimeError as exc:
        # Non-fatal: vegetation tint can fall back to slope/height heuristics.
        print(f"  landuse skipped ({exc}); renderer will fall back to heuristics")

    with open(os.path.join(OUT_DIR, "frame.json"), "w") as f:
        json.dump({
            "center": {"lat": CENTER_LAT, "lon": CENTER_LON},
            "widthMeters": WIDTH_M,
            "heightMeters": HEIGHT_M,
            "projection": "local-equirectangular",
            "attribution": [
                "Elevation: USGS 3DEP (public domain)",
                "Buildings/roads/landuse: © OpenStreetMap contributors (ODbL)",
            ],
        }, f, indent=2)
    print("  saved frame.json ✓")

    print(f"\nbaked to {OUT_DIR}/  ✓")


if __name__ == "__main__":
    sys.exit(main())
