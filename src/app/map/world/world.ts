/**
 * Sentinel Spatial OS — Authored World (real data, baked at build time)
 *
 * The world is DATA; the basemap picture is a RENDER of this data.
 * Terrain, buildings, and roads are real geography (Encinal Canyon WUI,
 * Malibu CA), baked by scripts/fetch-world-data.py from:
 *   - USGS 3DEP elevation (public domain) — 400×220 grid, ~5 m cells
 *   - OpenStreetMap buildings/roads/landuse (ODbL) — vector geometry
 *
 * Fire and the operational overlays (spread rings, corridors, TFR) are
 * AUTHORED scenario data — they represent the incident, not the geography.
 *
 * Coordinate convention (local metres, origin = frame center):
 *   +x → east, +y → north. Renderer maps y → -z for Three.js.
 * MapFrame conversion: u = (x + width/2) / width,
 *                      v = (height/2 - y) / height   (v=0 at north edge)
 *
 * Attribution: see frame.json (USGS 3DEP; © OpenStreetMap contributors).
 */

import demData from "./dem.json";
import buildingsData from "./buildings.json";
import roadsData from "./roads.json";
import landuseData from "./landuse.json";
import frameData from "./frame.json";
import type { MapPoint } from "../types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface WorldFrame {
  center: { lat: number; lon: number };
  widthMeters: number;
  heightMeters: number;
  projection: string;
  attribution: string[];
}

export interface DemGrid {
  cols: number;
  rows: number;
  cellMeters: number;
  /** rows: north→south (row 0 = north edge), cols: west→east. Metres AMSL. */
  elevation: number[][];
  min: number;
  max: number;
}

export interface WorldBuilding {
  id: number;
  kind: string;
  /** metres; null → renderer picks a default by kind */
  height: number | null;
  /** local-metre polygon (x east, y north), ≥3 points */
  footprint: Array<[number, number]>;
}

export interface WorldRoad {
  id: number;
  kind: string;
  width: number;
  name: string | null;
  points: Array<[number, number]>;
}

export interface WorldLanduse {
  id: number | string;
  kind: string;
  polygon: Array<[number, number]>;
}

export interface StateOverlays {
  spreadRings: Array<{
    label: "15 MIN" | "30 MIN" | "60 MIN";
    radiusUv: number;
    color: string;
    dash: string;
  }>;
  proposedDrones: Array<{ id: string; point: MapPoint; label: string }>;
  evacuationCorridors: Array<{
    id: "route-a" | "route-b" | "responder-route";
    label: string;
    points: Array<[number, number]>;
    width: number;
    color: string;
    variant: "egress" | "ingress";
  }>;
  tfrZones: Array<{ id: string; center: MapPoint; radiusUv: number }>;
  wind: { originUv: MapPoint; directionUv: [number, number]; label: string };
}

export interface FireScenario {
  /** Ridge scar polyline in local metres, with intensity per vertex (0–1). */
  band: Array<{ x: number; y: number; intensity: number }>;
  smoke: Array<{ x: number; y: number; height: number; opacity: number }>;
  originUv: MapPoint;
}

export interface World {
  frame: WorldFrame;
  dem: DemGrid;
  buildings: WorldBuilding[];
  roads: WorldRoad[];
  landuse: WorldLanduse[];
  fire: FireScenario;
  stateOverlays: StateOverlays;
}

// ── Data loading ─────────────────────────────────────────────────────────────

const frame: WorldFrame = {
  center: frameData.center as WorldFrame["center"],
  widthMeters: frameData.widthMeters,
  heightMeters: frameData.heightMeters,
  projection: frameData.projection,
  attribution: frameData.attribution,
};

const W = frame.widthMeters;
const H = frame.heightMeters;

let minElev = Infinity;
let maxElev = -Infinity;
for (const row of demData.elevation) {
  for (const v of row) {
    if (v < minElev) minElev = v;
    if (v > maxElev) maxElev = v;
  }
}

const dem: DemGrid = {
  cols: demData.cols,
  rows: demData.rows,
  cellMeters: demData.cellMeters,
  elevation: demData.elevation,
  min: minElev,
  max: maxElev,
};

const buildings: WorldBuilding[] = buildingsData as WorldBuilding[];
const roads: WorldRoad[] = roadsData as WorldRoad[];
const landuse: WorldLanduse[] = landuseData as WorldLanduse[];

// ── Fire scenario (authored) ────────────────────────────────────────────────
// Scar following the real NW crest line (from the baked DEM's per-slice
// maxima: x -815..-930 through the middle, easing to -745 at the south).

const fire: FireScenario = {
  band: [
    { x: -700, y: 330, intensity: 0.7 },
    { x: -754, y: 369, intensity: 0.85 },
    { x: -820, y: 429, intensity: 0.95 },
    { x: -862, y: 488, intensity: 1.0 },
    { x: -760, y: 545, intensity: 0.8 },
  ],
  smoke: [
    { x: -855, y: 470, height: 190, opacity: 0.42 },
    { x: -790, y: 420, height: 230, opacity: 0.34 },
    { x: -730, y: 360, height: 160, opacity: 0.26 },
  ],
  originUv: { u: 0.3, v: 0.1 },
};

// ── Operational overlays (authored, state-driven) ───────────────────────────

const stateOverlays: StateOverlays = {
  spreadRings: [
    { label: "15 MIN", radiusUv: 0.07, color: "#E5533C", dash: "8 6" },
    { label: "30 MIN", radiusUv: 0.116, color: "#FF8A4A", dash: "8 6" },
    { label: "60 MIN", radiusUv: 0.173, color: "#9BA8B8", dash: "6 7" },
  ],
  proposedDrones: [
    { id: "proposed-north", point: { u: 0.46, v: 0.12 }, label: "PROPOSED · N" },
    { id: "proposed-east", point: { u: 0.58, v: 0.22 }, label: "PROPOSED · E" },
    { id: "proposed-south", point: { u: 0.45, v: 0.34 }, label: "PROPOSED · S" },
    { id: "proposed-west", point: { u: 0.32, v: 0.22 }, label: "PROPOSED · W" },
  ],
  evacuationCorridors: [
    {
      id: "route-a",
      label: "GUIDED ROUTE A",
      points: [
        [-180, -430],
        [-420, -450],
        [-620, -470],
        [-800, -480],
      ],
      width: 8,
      color: "rgba(255,255,255,0.92)",
      variant: "egress",
    },
    {
      id: "route-b",
      label: "GUIDED ROUTE B",
      points: [
        [-60, -420],
        [280, -440],
        [420, -470],
      ],
      width: 8,
      color: "rgba(255,255,255,0.92)",
      variant: "egress",
    },
    {
      id: "responder-route",
      label: "RESPONDER INGRESS",
      points: [
        [900, -60],
        [500, -180],
        [240, -300],
        [-40, -380],
      ],
      width: 8,
      color: "#5BB7E6",
      variant: "ingress",
    },
  ],
  tfrZones: [{ id: "tfr-incident", center: fire.originUv, radiusUv: 0.24 }],
  wind: {
    originUv: { u: 0.42, v: 0.2 },
    directionUv: [0.71, -0.71],
    label: "18 MPH NE",
  },
};

// ── Export ───────────────────────────────────────────────────────────────────

export const WORLD: World = {
  frame,
  dem,
  buildings,
  roads,
  landuse,
  fire,
  stateOverlays,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Local metres → MapFrame u/v (u: 0 west → 1 east; v: 0 north → 1 south). */
export function localToUv(x: number, y: number): MapPoint {
  return {
    u: (x + W / 2) / W,
    v: (H / 2 - y) / H,
  };
}

/** MapFrame u/v → local metres. */
export function uvToLocal(u: number, v: number): [number, number] {
  return [u * W - W / 2, H / 2 - v * H];
}

/** Bilinear DEM sample at local metres; returns elevation AMSL. */
export function sampleElevation(x: number, y: number): number {
  const colF = ((x + W / 2) / W) * (dem.cols - 1);
  const rowF = ((H / 2 - y) / H) * (dem.rows - 1);
  const c0 = Math.max(0, Math.min(dem.cols - 2, Math.floor(colF)));
  const r0 = Math.max(0, Math.min(dem.rows - 2, Math.floor(rowF)));
  const fx = colF - c0;
  const fz = rowF - r0;
  const g = dem.elevation;
  const e00 = g[r0][c0];
  const e10 = g[r0][c0 + 1];
  const e01 = g[r0 + 1][c0];
  const e11 = g[r0 + 1][c0 + 1];
  const e0 = e00 * (1 - fx) + e10 * fx;
  const e1 = e01 * (1 - fx) + e11 * fx;
  return e0 * (1 - fz) + e1 * fz;
}
