/**
 * The world model's coordinate and terrain law.
 *
 * ONE module. Every renderer — the 2D world model, the EO camera, the IR
 * camera, the drone HUD, the analytics deck — projects through these
 * functions. There is no second transform anywhere in the map.
 *
 * This exists because the previous map had three renderers and three
 * coordinate laws, and they disagreed. Zone labels ended up floating in the
 * sky above the ridges they named, because the basemap was oblique and the
 * overlays were top-down. A single law makes that class of defect
 * unrepresentable rather than merely fixed.
 *
 * ── The frame ───────────────────────────────────────────────────────────────
 * Local metres, origin at the frame centre:
 *   +x → east, +y → north.
 * The frame is a local equirectangular projection (see frame.json): a small
 * patch of the globe where a simple metres-per-degree conversion is accurate
 * to well under a metre across 6 km. That is fine for a 6 km tactical frame
 * and is what the baked data was cut against.
 *
 * Normalized MapFrame space (u/v) is the shared vocabulary between the 2D
 * surface and the data layers: u 0 → 1 west to east, v 0 → 1 north to south.
 * Note v is flipped relative to local y, because screen and map conventions
 * differ — north is up.
 *
 * ── Scene coordinates ───────────────────────────────────────────────────────
 * three.js is Y-up while the world is Z-north, so the scene mapping is
 * (x, elevation, −y). That conversion lives in the 3D renderer and nowhere
 * else; it is a renderer concern, not a world concern.
 */

import frameData from "../world/frame.json";

export interface WorldFrame {
  center: { lat: number; lon: number };
  widthMeters: number;
  heightMeters: number;
  projection: string;
  attribution: string[];
}

export const frame: WorldFrame = frameData as WorldFrame;

/** Frame width in metres (east–west). */
export const W = frame.widthMeters;
/** Frame height in metres (north–south). */
export const H = frame.heightMeters;

/**
 * Metres per degree at the frame's centre latitude.
 *
 * The WGS-84 local scale factors: one degree of latitude is ~110 574 m
 * everywhere; one degree of longitude is ~111 320 · cos(lat) m.
 */
const METERS_PER_DEG_LAT = 110574;
const METERS_PER_DEG_LON =
  111320 * Math.cos((frame.center.lat * Math.PI) / 180);

/** Geographic (lon, lat) → local metres. */
export function toLocal(lon: number, lat: number): [number, number] {
  return [
    (lon - frame.center.lon) * METERS_PER_DEG_LON,
    (lat - frame.center.lat) * METERS_PER_DEG_LAT,
  ];
}

/** Local metres → geographic (lon, lat). */
export function toGeo(x: number, y: number): { lon: number; lat: number } {
  return {
    lon: frame.center.lon + x / METERS_PER_DEG_LON,
    lat: frame.center.lat + y / METERS_PER_DEG_LAT,
  };
}

/**
 * Local metres → normalized MapFrame space.
 * u: 0 west → 1 east. v: 0 north → 1 south (north is up).
 */
export function normalized(x: number, y: number): { u: number; v: number } {
  return { u: (x + W / 2) / W, v: (H / 2 - y) / H };
}

/** Normalized MapFrame space → local metres. */
export function fromNormalized(u: number, v: number): [number, number] {
  return [u * W - W / 2, H / 2 - v * H];
}

/** Format a local-metre position as a geographic coordinate string. */
export function formatGeo(x: number, y: number, precision = 4): string {
  const { lon, lat } = toGeo(x, y);
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(precision)}°${ns} ${Math.abs(lon).toFixed(precision)}°${ew}`;
}

// ── Terrain sampling ─────────────────────────────────────────────────────────

/**
 * The minimum a grid must provide to be sampled. Structurally compatible
 * with `DemGrid` in world.ts, but declared here so this module never has to
 * import the loader (and so the law has no dependency on async state).
 */
export interface TerrainGrid {
  cols: number;
  rows: number;
  cellMeters: number;
  min: number;
  max: number;
  elevation: Float32Array;
  elevationAt(col: number, row: number): number;
}

/**
 * Bilinear elevation sample, metres AMSL.
 *
 * Bilinear rather than nearest because the fire perimeter, the route
 * ribbons, and the contour line all drape over this surface: nearest-neighbour
 * sampling makes a 15 m grid look like a staircase and the ribbons visibly
 * detach from the ground.
 */
export function elevationAt(grid: TerrainGrid, x: number, y: number): number {
  const colF = ((x + W / 2) / W) * (grid.cols - 1);
  const rowF = ((H / 2 - y) / H) * (grid.rows - 1);
  const c0 = Math.max(0, Math.min(grid.cols - 2, Math.floor(colF)));
  const r0 = Math.max(0, Math.min(grid.rows - 2, Math.floor(rowF)));
  const fx = colF - c0;
  const fz = rowF - r0;
  const g = grid.elevation;
  const e00 = g[r0 * grid.cols + c0];
  const e10 = g[r0 * grid.cols + c0 + 1];
  const e01 = g[(r0 + 1) * grid.cols + c0];
  const e11 = g[(r0 + 1) * grid.cols + c0 + 1];
  const e0 = e00 * (1 - fx) + e10 * fx;
  const e1 = e01 * (1 - fx) + e11 * fx;
  return e0 * (1 - fz) + e1 * fz;
}

/**
 * Slope in degrees, from the local gradient.
 *
 * The horizontal step is the DEM cell size, which is what makes this honest:
 * a slope computed against a made-up metre would be wrong by the cell ratio.
 */
export function slopeDeg(grid: TerrainGrid, x: number, y: number): number {
  const d = grid.cellMeters;
  const dzdx = (elevationAt(grid, x + d, y) - elevationAt(grid, x - d, y)) / (2 * d);
  const dzdy = (elevationAt(grid, x, y + d) - elevationAt(grid, x, y - d)) / (2 * d);
  return (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
}

/**
 * Aspect in degrees, compass convention: 0 = north, 90 = east.
 *
 * Direction the slope faces, which is the direction a fire runs. 0 is used
 * for flat ground rather than north, because "flat and pointing north" is a
 * lie a fire model would act on.
 */
export function aspectDeg(grid: TerrainGrid, x: number, y: number): number {
  const d = grid.cellMeters;
  const dzdx = (elevationAt(grid, x + d, y) - elevationAt(grid, x - d, y)) / (2 * d);
  const dzdy = (elevationAt(grid, x, y + d) - elevationAt(grid, x, y - d)) / (2 * d);
  if (Math.hypot(dzdx, dzdy) < 1e-6) return 0;
  // Azimuth of the downhill direction, from north, clockwise.
  const deg = (Math.atan2(-dzdx, dzdy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** True when the point is inside the frame (with an optional margin in metres). */
export function inFrame(x: number, y: number, margin = 0): boolean {
  return (
    x >= -W / 2 - margin &&
    x <= W / 2 + margin &&
    y >= -H / 2 - margin &&
    y <= H / 2 + margin
  );
}
