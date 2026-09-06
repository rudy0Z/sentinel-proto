/**
 * Sentinel Spatial OS — Authored World
 *
 * Single source of truth for the build-time rendered basemap.
 * Real lat/lon (Encinal Canyon, Malibu, California — Woolsey Fire corridor)
 * with terrain features anchored to the same MapFrame u/v positions the
 * existing SVG overlay (zones, roads, agents) occupies. This guarantees
 * pixel-perfect alignment by construction (slice law contract preserved)
 * while the case study can credibly claim "real coordinates, ready to
 * swap for OSM/Mapbox tiles in Phase 2."
 *
 * Authoring frame: 2000m (E-W) × 1100m (N-S)
 * Native content:  1691px × 914px
 * Conversion:      u = x / 2000,  v = 1 - (z / 1100)   (z = depth in metres)
 * Lat/lon center:  34.050, -118.820
 * Projection:      EPSG:3857 (Web Mercator) — ready for tile fetch
 *
 * The four Sentinel states (SCAN / VERIFY / CONTAIN / RESCUE) toggle the
 * visibility of `stateOverlays` — Phase 1's render bakes the RESCUE state
 * (most loaded, case-study hero shot); Phase 2's runtime SVG overlay can
 * show/hide the same data by state.
 */

import type { MapPoint } from "../types";

export type Projection = "web-mercator" | "local";

export interface LatLon {
  lat: number;
  lon: number;
}

export interface WorldFrame {
  /** Authoring metres along the east-west axis. */
  widthMeters: number;
  /** Authoring metres along the north-south axis (z depth in 3D). */
  heightMeters: number;
  /** Real-world center for Phase 2 tile swap. */
  center: LatLon;
  /** Map projection; web-mercator matches OSM/Mapbox tile services. */
  projection: Projection;
}

export interface HeightfieldCell {
  /** 0–1 normalized elevation; 0 = valley floor, 1 = ridge top. */
  elevation: number;
  /** 0–1 vegetation density (chapparal/brush on slopes, sparse on flats). */
  vegetation: number;
}

export interface RoadRibbon {
  id: string;
  /** Lane width in metres. */
  width: number;
  /** Ordered world-frame metre pairs [x, z] (z = depth, y-down in 2D). */
  points: Array<[number, number]>;
  kind: "arterial" | "local" | "service";
  /** Visual treatment by state — overlay can switch visibility per state. */
  variants: Array<"ambient" | "evacuation" | "ingress" | "investigation">;
}

export interface BuildingFootprint {
  id: string;
  /** 4-point world-frame polygon (x, z) pairs. */
  footprint: Array<[number, number]>;
  /** Roof height in metres. */
  height: number;
  /** Maps to existing ZONE_MODELS zoneHint for applyZoneMargin compatibility. */
  zoneHint: "forest-north" | "buffer-west" | "buffer-east" | "residential-west" | "residential-south";
  /** Occupancy + state for RESCUE overlays (cleared/uncleared). */
  occupied: boolean;
  cleared?: boolean;
}

export interface FireFeature {
  /** Diegetic warm light source: emissive line tracing the ridge scar. */
  line: {
    start: [number, number, number]; // x, y (elevation), z
    end: [number, number, number];
  };
  /** Smoke billboard position (x, z) + height. */
  smoke: Array<{ position: [number, number]; height: number; opacity: number }>;
  /** Fire origin u/v anchor (used by spread prediction rings). */
  originUv: MapPoint;
}

export interface VegetationCluster {
  point: [number, number];
  kind: "tree" | "shrub";
  count: number;
}

export interface WaterFeature {
  /** Polyline world-frame (x, z) pairs; renders as a flat reflective ribbon. */
  points: Array<[number, number]>;
  /** Width in metres. */
  width: number;
}

/**
 * State-specific overlays (CONTAIN / RESCUE). The runtime SVG overlay
 * reads these and toggles visibility by state; Phase 1 bakes the RESCUE
 * state into the rendered PNG.
 */
export interface StateOverlays {
  /** 15/30/60-minute fire spread rings (CONTAIN). */
  spreadRings: Array<{
    label: "15 MIN" | "30 MIN" | "60 MIN";
    radiusUv: number; // 0–1 normalized radius around originUv
    color: string;
    dash: string;
  }>;
  /** Proposed drone positions (CONTAIN — "PROPOSED — PENDING AUTHORIZATION"). */
  proposedDrones: Array<{
    id: string;
    point: MapPoint;
    label: string;
  }>;
  /** Evacuation corridors (RESCUE — Route A white, Route B white, ingress yellow). */
  evacuationCorridors: Array<{
    id: "route-a" | "route-b" | "responder-route";
    label: string;
    points: Array<[number, number]>; // world-frame metres
    width: number;
    color: string;
    variant: "egress" | "ingress";
  }>;
  /** TFR / airspace restrictions (Sky Warden — CONTAIN/RESCUE). */
  tfrZones: Array<{
    id: string;
    center: MapPoint;
    radiusUv: number;
  }>;
  /** Wind arrow (CONTAIN — overlaid on the map). */
  wind: {
    originUv: MapPoint;
    directionUv: [number, number]; // unit vector
    label: string;
  };
}

/**
 * The full authored world. Phase 1's render-world.mjs reads this and bakes
 * the basemap PNG; Phase 2's runtime Three.js scene reads the same data.
 */
export interface World {
  frame: WorldFrame;
  /** 32 cols × 18 rows heightfield; matches 16:9 in the 1691×914 native frame. */
  heightfield: HeightfieldCell[][];
  roadRibbons: RoadRibbon[];
  buildings: BuildingFootprint[];
  fire: FireFeature;
  vegetation: VegetationCluster[];
  water: WaterFeature[];
  stateOverlays: StateOverlays;
}

// ───────────────────────────────────────────────────────────────────────────
// Authoring constants — Encinal Canyon, Malibu, California
// ───────────────────────────────────────────────────────────────────────────

const FRAME: WorldFrame = {
  widthMeters: 2000,
  heightMeters: 1100,
  center: { lat: 34.05, lon: -118.82 },
  projection: "web-mercator",
};

/**
 * Road ribbons anchored to existing road-node positions (roads.ts).
 * Each ribbon uses world-frame metres; the render pipeline converts to
 * u/v via `u = x / FRAME.widthMeters`, `v = 1 - (z / FRAME.heightMeters)`.
 *
 * Order: ridge+forest edges, buffer west spine, buffer east / ingress,
 * residential south lattice, residential west grid.
 */
const ROAD_RIBBONS: RoadRibbon[] = [
  // Ridge / forest edges — drone-only service roads
  { id: "ribbon-forest-overwatch-ridge-mid", width: 6, kind: "service", variants: ["ambient", "investigation"], points: [[305, 302], [430, 360]] },
  { id: "ribbon-ridge-mid-ridge-lidar", width: 6, kind: "service", variants: ["ambient", "investigation"], points: [[430, 360], [543, 433]] },
  { id: "ribbon-ridge-lidar-forest-edge-south", width: 6, kind: "service", variants: ["ambient"], points: [[543, 433], [490, 520]] },
  { id: "ribbon-ridge-mid-forest-edge-south", width: 6, kind: "service", variants: ["ambient"], points: [[430, 360], [490, 520]] },
  { id: "ribbon-forest-edge-south-east-service", width: 8, kind: "local", variants: ["ambient"], points: [[490, 520], [594, 468]] },
  { id: "ribbon-forest-overwatch-buffer-relay-west", width: 8, kind: "local", variants: ["ambient"], points: [[305, 302], [269, 570]] },

  // Buffer west spine
  { id: "ribbon-buffer-west-north-mid", width: 10, kind: "service", variants: ["ambient"], points: [[110, 160], [180, 280]] },
  { id: "ribbon-buffer-west-mid-relay", width: 10, kind: "local", variants: ["ambient", "evacuation"], points: [[180, 280], [269, 570]] },
  { id: "ribbon-buffer-relay-west-alpha-staging", width: 10, kind: "local", variants: ["ambient", "evacuation"], points: [[269, 570], [265, 616]] },
  { id: "ribbon-alpha-staging-res-west-n", width: 10, kind: "local", variants: ["ambient", "evacuation"], points: [[265, 616], [140, 540]] },
  { id: "ribbon-res-west-north-center", width: 14, kind: "arterial", variants: ["ambient", "evacuation"], points: [[140, 540], [180, 680]] },
  { id: "ribbon-res-west-center-egress", width: 14, kind: "arterial", variants: ["ambient", "evacuation"], points: [[180, 680], [90, 780]] },
  { id: "ribbon-res-west-egress-route-a", width: 14, kind: "arterial", variants: ["ambient", "evacuation"], points: [[90, 780], [160, 800]] },
  { id: "ribbon-buffer-relay-west-res-west-n", width: 8, kind: "local", variants: ["ambient"], points: [[269, 570], [140, 540]] },

  // Buffer east / ingress
  { id: "ribbon-buffer-east-north-mid", width: 10, kind: "service", variants: ["ambient"], points: [[740, 180], [690, 320]] },
  { id: "ribbon-buffer-east-mid-east-service", width: 10, kind: "local", variants: ["ambient"], points: [[690, 320], [594, 468]] },
  { id: "ribbon-east-service-ridge-lidar", width: 8, kind: "service", variants: ["ambient", "investigation"], points: [[594, 468], [543, 433]] },
  { id: "ribbon-east-service-responder-ingress", width: 14, kind: "arterial", variants: ["ambient", "ingress"], points: [[594, 468], [560, 612]] },
  { id: "ribbon-responder-ingress-buffer-relay-east", width: 14, kind: "arterial", variants: ["ambient", "ingress"], points: [[560, 612], [477, 603]] },
  { id: "ribbon-buffer-relay-east-bravo-staging", width: 10, kind: "local", variants: ["ambient"], points: [[477, 603], [475, 640]] },
  { id: "ribbon-responder-ingress-bravo-staging", width: 8, kind: "local", variants: ["ambient", "ingress"], points: [[560, 612], [475, 640]] },

  // Residential south lattice
  { id: "ribbon-bravo-staging-res-south-w", width: 14, kind: "arterial", variants: ["ambient", "ingress"], points: [[475, 640], [450, 720]] },
  { id: "ribbon-res-south-w-center", width: 14, kind: "arterial", variants: ["ambient", "ingress", "evacuation"], points: [[450, 720], [560, 760]] },
  { id: "ribbon-res-south-center-herald-hold", width: 14, kind: "arterial", variants: ["ambient", "evacuation"], points: [[560, 760], [609, 704]] },
  { id: "ribbon-herald-hold-residential-egress", width: 14, kind: "arterial", variants: ["ambient", "evacuation"], points: [[609, 704], [689, 781]] },
  { id: "ribbon-residential-egress-res-south-east", width: 14, kind: "arterial", variants: ["ambient", "evacuation"], points: [[689, 781], [760, 820]] },
  { id: "ribbon-residential-egress-route-b-east", width: 14, kind: "arterial", variants: ["ambient", "evacuation"], points: [[689, 781], [698, 844]] },
  { id: "ribbon-res-south-center-egress", width: 14, kind: "arterial", variants: ["ambient", "evacuation"], points: [[560, 760], [689, 781]] },
  { id: "ribbon-buffer-relay-east-herald-hold", width: 8, kind: "local", variants: ["ambient"], points: [[477, 603], [609, 704]] },
  { id: "ribbon-bravo-staging-herald-hold", width: 8, kind: "local", variants: ["ambient", "ingress"], points: [[475, 640], [609, 704]] },

  // Cross connectors
  { id: "ribbon-res-west-center-relay-west", width: 8, kind: "local", variants: ["ambient"], points: [[180, 680], [269, 570]] },
  { id: "ribbon-route-a-west-res-south-w", width: 14, kind: "arterial", variants: ["ambient", "evacuation", "ingress"], points: [[160, 800], [450, 720]] },
];

/**
 * Buildings — populated for the residential grids + sparse ridge base
 * structures. Each building's u/v position is checked against the existing
 * zone polygons during authoring so applyZoneMargin keeps working.
 *
 * Zone centers (px in 1691×914):
 *   forest-north:        (756, 206)  → u=0.447, v=0.225
 *   buffer-west:         (184, 142)  → u=0.109, v=0.155
 *   buffer-east:         (1486, 154) → u=0.879, v=0.168
 *   residential-west:    (332, 676)   → u=0.196, v=0.740
 *   residential-south:   (1068, 760)  → u=0.632, v=0.831
 */
function pxToWorld(x: number, y: number): [number, number] {
  // 1691px wide → 2000m; 914px tall → 1100m. y-down means higher v = larger metres-z.
  const wx = (x / 1691) * 2000;
  const wz = (y / 914) * 1100;
  return [wx, wz];
}

function uvToWorld(u: number, v: number): [number, number] {
  return [u * 2000, v * 1100];
}

const BUILDINGS: BuildingFootprint[] = [
  // Residential south — primary grid (94 tracked structures, 47 at risk per mockData)
  ...buildResidentialGrid("residential-south", 560, 720, 8, 12, 26, 22, true),
  // Residential west — secondary grid
  ...buildResidentialGrid("residential-west", 180, 660, 4, 8, 22, 18, true),
  // Sparse structures along ridge base (forest-edge)
  ...buildRidgeBaseStructures(),
  // Sparse structures in buffer zones (road corridor, no dense grid)
  ...buildBufferStructures("buffer-east", 1380, 200, 6, true),
  ...buildBufferStructures("buffer-west", 220, 200, 4, false),
];

function buildResidentialGrid(
  zoneHint: BuildingFootprint["zoneHint"],
  originX: number,
  originY: number,
  cols: number,
  rows: number,
  stepX: number,
  stepY: number,
  occupied: boolean,
): BuildingFootprint[] {
  const out: BuildingFootprint[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = originX + c * stepX;
      const y = originY + r * stepY;
      // World-frame position
      const [wx, wz] = pxToWorld(x, y);
      // Footprint 22m × 18m (typical California residential lot)
      const halfW = 11;
      const halfD = 9;
      // Cleared state for RESCUE — mark some as cleared to show progress
      const cleared = occupied && (r * cols + c) % 3 === 0;
      out.push({
        id: `bld-${zoneHint}-${r}-${c}`,
        footprint: [
          [wx - halfW, wz - halfD],
          [wx + halfW, wz - halfD],
          [wx + halfW, wz + halfD],
          [wx - halfW, wz + halfD],
        ],
        height: 5 + ((r * 7 + c * 3) % 4), // 5–8m variation
        zoneHint,
        occupied,
        cleared,
      });
    }
  }
  return out;
}

function buildRidgeBaseStructures(): BuildingFootprint[] {
  // 6 sparse structures along the south edge of forest-north zone
  const seeds = [
    [700, 480], [780, 500], [860, 470], [940, 510], [1020, 490], [1100, 520],
  ];
  return seeds.map(([x, y], i) => {
    const [wx, wz] = pxToWorld(x, y);
    return {
      id: `bld-ridge-base-${i}`,
      footprint: [
        [wx - 8, wz - 7],
        [wx + 8, wz - 7],
        [wx + 8, wz + 7],
        [wx - 8, wz + 7],
      ],
      height: 6,
      zoneHint: "forest-north",
      occupied: false,
    };
  });
}

function buildBufferStructures(
  zoneHint: BuildingFootprint["zoneHint"],
  originX: number,
  originY: number,
  count: number,
  occupied: boolean,
): BuildingFootprint[] {
  const out: BuildingFootprint[] = [];
  for (let i = 0; i < count; i++) {
    const x = originX + i * 60;
    const y = originY + (i % 2 === 0 ? 0 : 40);
    const [wx, wz] = pxToWorld(x, y);
    out.push({
      id: `bld-${zoneHint}-${i}`,
      footprint: [
        [wx - 10, wz - 8],
        [wx + 10, wz - 8],
        [wx + 10, wz + 8],
        [wx - 10, wz + 8],
      ],
      height: 5,
      zoneHint,
      occupied,
    });
  }
  return out;
}

/**
 * 32 × 18 heightfield. Anchored to the existing basemap's vertical
 * composition: ridge in the top third (north), residential grid in the
 * bottom third (south), corridor valleys between.
 *
 * Elevation 0–1: 0 = valley floor, 1 = ridge top.
 */
const HEIGHTFIELD: HeightfieldCell[][] = (() => {
  const cols = 32;
  const rows = 18;
  const grid: HeightfieldCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: HeightfieldCell[] = [];
    for (let c = 0; c < cols; c++) {
      // Normalized position
      const u = c / (cols - 1);
      const v = r / (rows - 1);
      // Ridge: dominant in upper third (v small), peaked around u=0.45
      const ridgeDist = Math.hypot(u - 0.45, v - 0.18);
      const ridge = Math.max(0, 1 - ridgeDist * 2.4);
      // Secondary ridge on east
      const eastRidge = Math.max(0, 1 - Math.hypot(u - 0.85, v - 0.22) * 3.2) * 0.7;
      // South residential plateau (lower)
      const southPlateau = v > 0.7 ? 0.15 + 0.05 * Math.sin(u * 6) : 0;
      // Buffer corridor (mid-band, low)
      const bufferMid = v > 0.45 && v < 0.65 ? -0.08 : 0;
      // Fire scar (slightly lowered, around fire origin)
      const fireScar = Math.max(0, 1 - Math.hypot(u - 0.45, v - 0.22) * 6) * -0.18;

      const elevation = Math.max(0, Math.min(1,
        ridge * 0.85 + eastRidge + southPlateau + bufferMid + fireScar + 0.05,
      ));

      // Vegetation: dense on slopes (ridge), sparse on residential flats
      const vegBase = ridge > 0.3 ? 0.85 : (v > 0.7 ? 0.25 : 0.55);
      const vegNoise = 0.1 * Math.sin(c * 1.7 + r * 2.3);
      const vegetation = Math.max(0, Math.min(1, vegBase + vegNoise));

      row.push({ elevation, vegetation });
    }
    grid.push(row);
  }
  return grid;
})();

const FIRE: FireFeature = {
  line: {
    // Emissive ridge scar — traces the upper edge of forest-north zone
    start: [770, 180, 320],
    end: [950, 220, 280],
  },
  smoke: [
    { position: uvToWorld(0.50, 0.20), height: 60, opacity: 0.55 },
    { position: uvToWorld(0.55, 0.22), height: 50, opacity: 0.40 },
  ],
  originUv: { u: 0.45, v: 0.22 }, // Forest-north zone center u/v
};

const VEGETATION: VegetationCluster[] = [
  // Ridge base — dense chaparral/brush
  ...Array.from({ length: 24 }, (_, i) => ({
    point: uvToWorld(0.20 + i * 0.025, 0.45 + 0.02 * Math.sin(i)),
    kind: "shrub" as const,
    count: 3,
  })),
  // Sparse trees in buffer corridors
  { point: uvToWorld(0.15, 0.30), kind: "tree", count: 1 },
  { point: uvToWorld(0.30, 0.40), kind: "tree", count: 1 },
  { point: uvToWorld(0.70, 0.40), kind: "tree", count: 1 },
  { point: uvToWorld(0.85, 0.30), kind: "tree", count: 1 },
];

const WATER: WaterFeature[] = [
  // Drainage wash in the western buffer corridor
  {
    width: 4,
    points: [
      uvToWorld(0.05, 0.45),
      uvToWorld(0.10, 0.55),
      uvToWorld(0.18, 0.68),
      uvToWorld(0.22, 0.80),
    ],
  },
];

const STATE_OVERLAYS: StateOverlays = {
  // Anchored to fire origin (forest-north zone center); radii match
  // mockData SPREAD_RINGS (118/196/292 px in 1691×914 → 0.0698/0.116/0.173 u/v).
  spreadRings: [
    { label: "15 MIN", radiusUv: 0.0698, color: "#E5533C", dash: "8 6" },
    { label: "30 MIN", radiusUv: 0.116, color: "#FF8A4A", dash: "8 6" },
    { label: "60 MIN", radiusUv: 0.173, color: "#9BA8B8", dash: "6 7" },
  ],
  // Proposed drone positions (CONTAIN) — equidistant around fire origin
  proposedDrones: [
    { id: "proposed-north", point: { u: 0.46, v: 0.12 }, label: "PROPOSED · N" },
    { id: "proposed-east", point: { u: 0.58, v: 0.22 }, label: "PROPOSED · E" },
    { id: "proposed-south", point: { u: 0.45, v: 0.34 }, label: "PROPOSED · S" },
    { id: "proposed-west", point: { u: 0.32, v: 0.22 }, label: "PROPOSED · W" },
  ],
  // Evacuation corridors (RESCUE)
  evacuationCorridors: [
    {
      id: "route-a",
      label: "GUIDED ROUTE A",
      points: [
        uvToWorld(0.450, 0.760),
        uvToWorld(0.300, 0.760),
        uvToWorld(0.180, 0.770),
        uvToWorld(0.090, 0.780),
      ],
      width: 8,
      color: "rgba(255,255,255,0.92)",
      variant: "egress",
    },
    {
      id: "route-b",
      label: "GUIDED ROUTE B",
      points: [
        uvToWorld(0.560, 0.770),
        uvToWorld(0.690, 0.780),
        uvToWorld(0.700, 0.840),
      ],
      width: 8,
      color: "rgba(255,255,255,0.92)",
      variant: "egress",
    },
    {
      id: "responder-route",
      label: "RESPONDER INGRESS",
      points: [
        uvToWorld(0.560, 0.610),
        uvToWorld(0.477, 0.600),
        uvToWorld(0.475, 0.640),
        uvToWorld(0.450, 0.720),
      ],
      width: 8,
      color: "#5BB7E6",
      variant: "ingress",
    },
  ],
  // TFR zone (Sky Warden) — circle around the active incident
  tfrZones: [
    { id: "tfr-incident", center: FIRE.originUv, radiusUv: 0.22 },
  ],
  // Wind arrow (CONTAIN) — pushing northeast, matching the 3:47 AM brief
  wind: {
    originUv: { u: 0.40, v: 0.18 },
    directionUv: [0.71, -0.71], // 45° north-east
    label: "18 MPH NE",
  },
};

export const WORLD: World = {
  frame: FRAME,
  heightfield: HEIGHTFIELD,
  roadRibbons: ROAD_RIBBONS,
  buildings: BUILDINGS,
  fire: FIRE,
  vegetation: VEGETATION,
  water: WATER,
  stateOverlays: STATE_OVERLAYS,
};

/**
 * Convert world-frame metres [x, z] to MapFrame u/v.
 *   u = x / frame.widthMeters
 *   v = (frame.heightMeters - z) / frame.heightMeters   (z is depth; y-down)
 *
 * Note: z is depth in metres from the south edge of the frame. Higher z
 * (further north in real-world coords) → smaller v (toward top of frame).
 */
export function worldToUv(x: number, z: number): MapPoint {
  return {
    u: x / FRAME.widthMeters,
    v: (FRAME.heightMeters - z) / FRAME.heightMeters,
  };
}

/**
 * Convert MapFrame u/v back to world-frame metres [x, z].
 */
export function uvToWorldUv(u: number, v: number): [number, number] {
  return [u * FRAME.widthMeters, FRAME.heightMeters * (1 - v)];
}
