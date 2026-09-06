/**
 * Sentinel Spatial OS — Authored World (real data, baked at build time)
 *
 * The world is DATA; the basemap picture is a RENDER of this data.
 * Terrain, buildings, roads, and vegetation are real geography (Encinal
 * Canyon WUI, Malibu CA — 6.0 × 3.25 km frame), baked by
 * scripts/fetch-world-data.py from:
 *   - USGS 3DEP elevation (public domain) — 400×220 Int16 binary grid
 *   - OpenStreetMap buildings/roads (ODbL) — vector geometry
 *   - ESA WorldCover v200 10m land cover — vegetation class grid
 *
 * Fire and the operational overlays are AUTHORED scenario data.
 *
 * Loading: the DEM grid is binary (dem.bin, Int16 LE, north-first rows,
 * west-first cols) — async via loadWorld(). Everything else syncs.
 *
 * Coordinate convention (local metres, origin = frame center):
 *   +x → east, +y → north. Scene mapping: (x, elev, -y).
 *
 * Attribution: USGS 3DEP; © OpenStreetMap contributors (ODbL);
 * ESA WorldCover v200 (CC-BY-4.0).
 */

import demMeta from "./dem.json";
import buildingsData from "./buildings.json";
import roadsData from "./roads.json";
import landuseData from "./landuse.json";
import vegetationData from "./vegetation.json";
import frameData from "./frame.json";
import demBinUrl from "./dem.bin?url";
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
  min: number;
  max: number;
  /** row-major metres, row 0 = north; filled by loadWorld() */
  elevation: Float32Array;
  elevationAt(col: number, row: number): number;
}

export type VegClass = "tree" | "shrub" | "grass" | "crop" | "built" | "bare" | "water";

export interface VegGrid {
  cols: number;
  rows: number;
  cellMeters: number;
  classes: Uint8Array; // 10 tree, 20 shrub, 30 grass, 40 crop, 50 built, 60 bare, 80 water
  classAt(col: number, row: number): number;
}

export interface WorldBuilding {
  id: number;
  kind: string;
  height: number | null;
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
  band: Array<{ x: number; y: number; intensity: number }>;
  smoke: Array<{ x: number; y: number; height: number; opacity: number }>;
  originUv: MapPoint;
}

export interface World {
  frame: WorldFrame;
  dem: DemGrid;
  vegetation: VegGrid | null;
  buildings: WorldBuilding[];
  roads: WorldRoad[];
  landuse: WorldLanduse[];
  fire: FireScenario;
  stateOverlays: StateOverlays;
}

// ── Sync data ────────────────────────────────────────────────────────────────

export const frame: WorldFrame = {
  center: frameData.center as WorldFrame["center"],
  widthMeters: frameData.widthMeters,
  heightMeters: frameData.heightMeters,
  projection: frameData.projection,
  attribution: frameData.attribution,
};

export const W = frame.widthMeters;
export const H = frame.heightMeters;

const buildings: WorldBuilding[] = buildingsData as WorldBuilding[];
const roads: WorldRoad[] = roadsData as WorldRoad[];
const landuse: WorldLanduse[] = landuseData as WorldLanduse[];

// ── Vegetation (sync JSON import) ───────────────────────────────────────────

const vegData = vegetationData as {
  cols: number; rows: number; cellMeters: number; classes: number[][];
};

const vegFlat = new Uint8Array(vegData.cols * vegData.rows);
for (let r = 0; r < vegData.rows; r++) {
  for (let c = 0; c < vegData.cols; c++) {
    vegFlat[r * vegData.cols + c] = vegData.classes[r][c];
  }
}

const vegetation: VegGrid = {
  cols: vegData.cols,
  rows: vegData.rows,
  cellMeters: vegData.cellMeters,
  classes: vegFlat,
  classAt(col, row) {
    const c0 = Math.max(0, Math.min(this.cols - 1, col));
    const r0 = Math.max(0, Math.min(this.rows - 1, row));
    return this.classes[r0 * this.cols + c0];
  },
};

// ── Fire scenario (authored — NE massif crest, from the 6km DEM trace) ──────

const fire: FireScenario = {
  band: [
    { x: 980, y: 980, intensity: 0.7 },
    { x: 1090, y: 1180, intensity: 0.9 },
    { x: 1165, y: 1031, intensity: 0.85 },
    { x: 1075, y: 1330, intensity: 1.0 },
    { x: 1090, y: 1480, intensity: 1.0 },
    { x: 1150, y: 1600, intensity: 0.85 },
  ],
  smoke: [
    { x: 1080, y: 1350, height: 260, opacity: 0.4 },
    { x: 1120, y: 1520, height: 320, opacity: 0.32 },
    { x: 1020, y: 1150, height: 200, opacity: 0.28 },
  ],
  originUv: { u: 0.68, v: 0.08 },
};

// ── Operational overlays (authored, state-driven) ───────────────────────────

const stateOverlays: StateOverlays = {
  spreadRings: [
    { label: "15 MIN", radiusUv: 0.07, color: "#E5533C", dash: "8 6" },
    { label: "30 MIN", radiusUv: 0.116, color: "#FF8A4A", dash: "8 6" },
    { label: "60 MIN", radiusUv: 0.173, color: "#9BA8B8", dash: "6 7" },
  ],
  proposedDrones: [
    { id: "proposed-north", point: { u: 0.62, v: 0.14 }, label: "PROPOSED · N" },
    { id: "proposed-east", point: { u: 0.74, v: 0.22 }, label: "PROPOSED · E" },
    { id: "proposed-south", point: { u: 0.6, v: 0.3 }, label: "PROPOSED · S" },
    { id: "proposed-west", point: { u: 0.48, v: 0.2 }, label: "PROPOSED · W" },
  ],
  evacuationCorridors: [
    {
      id: "route-a",
      label: "GUIDED ROUTE A",
      points: [
        [-200, -400],
        [-700, -500],
        [-1400, -700],
        [-2200, -900],
      ],
      width: 10,
      color: "rgba(255,255,255,0.92)",
      variant: "egress",
    },
    {
      id: "route-b",
      label: "GUIDED ROUTE B",
      points: [
        [200, -350],
        [900, -550],
        [1700, -800],
        [2400, -1000],
      ],
      width: 10,
      color: "rgba(255,255,255,0.92)",
      variant: "egress",
    },
    {
      id: "responder-route",
      label: "RESPONDER INGRESS",
      points: [
        [2600, 200],
        [1600, 100],
        [800, -100],
        [200, -250],
      ],
      width: 10,
      color: "#5BB7E6",
      variant: "ingress",
    },
  ],
  tfrZones: [{ id: "tfr-incident", center: fire.originUv, radiusUv: 0.24 }],
  wind: {
    originUv: { u: 0.55, v: 0.12 },
    directionUv: [0.71, -0.71],
    label: "18 MPH NE",
  },
};

// ── Async loader (binary DEM) ────────────────────────────────────────────────

let cached: World | null = null;

export async function loadWorld(): Promise<World> {
  if (cached) return cached;

  const res = await fetch(demBinUrl);
  if (!res.ok) throw new Error(`dem.bin fetch failed: ${res.status}`);
  const buf = new Int16Array(await res.arrayBuffer());

  const cols = demMeta.cols;
  const rows = demMeta.rows;
  if (buf.length !== cols * rows) {
    throw new Error(`dem.bin size ${buf.length} != ${cols}×${rows}`);
  }

  const elevation = new Float32Array(buf.length);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < buf.length; i++) {
    elevation[i] = buf[i];
    if (elevation[i] < min) min = elevation[i];
    if (elevation[i] > max) max = elevation[i];
  }

  const dem: DemGrid = {
    cols,
    rows,
    cellMeters: demMeta.cellMeters,
    min,
    max,
    elevation,
    elevationAt(col, row) {
      const c0 = Math.max(0, Math.min(this.cols - 1, col));
      const r0 = Math.max(0, Math.min(this.rows - 1, row));
      return this.elevation[r0 * this.cols + c0];
    },
  };

  cached = {
    frame,
    dem,
    vegetation,
    buildings,
    roads,
    landuse,
    fire,
    stateOverlays,
  };
  return cached;
}

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

/** Bilinear DEM sample (needs loadWorld() first); returns metres AMSL. */
export function sampleElevation(world: World, x: number, y: number): number {
  const { dem } = world;
  const colF = ((x + W / 2) / W) * (dem.cols - 1);
  const rowF = ((H / 2 - y) / H) * (dem.rows - 1);
  const c0 = Math.max(0, Math.min(dem.cols - 2, Math.floor(colF)));
  const r0 = Math.max(0, Math.min(dem.rows - 2, Math.floor(rowF)));
  const fx = colF - c0;
  const fz = rowF - r0;
  const g = dem.elevation;
  const e00 = g[r0 * dem.cols + c0];
  const e10 = g[r0 * dem.cols + c0 + 1];
  const e01 = g[(r0 + 1) * dem.cols + c0];
  const e11 = g[(r0 + 1) * dem.cols + c0 + 1];
  const e0 = e00 * (1 - fx) + e10 * fx;
  const e1 = e01 * (1 - fx) + e11 * fx;
  return e0 * (1 - fz) + e1 * fz;
}

/** Nearest vegetation class at local metres. */
export function sampleVegetation(world: World, x: number, y: number): number {
  if (!world.vegetation) return 30; // grass default
  const v = world.vegetation;
  const col = Math.round(((x + W / 2) / W) * (v.cols - 1));
  const row = Math.round(((H / 2 - y) / H) * (v.rows - 1));
  return v.classAt(col, row);
}
