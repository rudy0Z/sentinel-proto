/**
 * Operational overlay data for the 3D spatial surface (Sentinel V2 · P2.1).
 *
 * SINGLE SOURCE OF TRUTH. Zone perimeters, spread-ring radii and egress
 * corridors are DERIVED — never re-authored — from the same authored data the
 * 2D ops map renders: mockData.ZONES / mockData.SPREAD_RINGS and
 * map/routes.EGRESS_ROUTES (resolved through the shared road graph). The 3D
 * boundary is therefore the 2D boundary projected into world-local metres; a
 * hand-drawn 3D copy is structurally impossible here.
 *
 * "The world is data, the map a render of that data." — vault 02 §1
 *
 * Projection (identical to the frame worldScene builds the terrain in):
 *   u = x / 1691   lx = (u - 0.5) * W     (east, metres)
 *   v = y / 914    ly = (0.5 - v) * H     (north, metres)
 */

import { ANOMALY, SPREAD_RINGS, ZONES, createDroneRoster } from "../../mockData";
import { MAP_NATIVE, parsePixelPolygon } from "../frame";
import { EGRESS_ROUTES, routePolyline } from "../routes";
import { H, W } from "../world/world";
import { T } from "../../tokens";

/** World extent (metres) — the exact frame worldScene builds. */
export const WORLD_W = W;
export const WORLD_H = H;

/** Authored native pixel → world-local metres. */
function pxToLxLy(x: number, y: number): { lx: number; ly: number } {
  return {
    lx: (x / MAP_NATIVE.width - 0.5) * W,
    ly: (0.5 - y / MAP_NATIVE.height) * H,
  };
}

/** Normalized MapFrame u/v → world-local metres. */
function uvToLxLy(u: number, v: number): { lx: number; ly: number } {
  return { lx: (u - 0.5) * W, ly: (0.5 - v) * H };
}

/** The map's zone language, carried into 3D as tokens (never a new hex). */
const ZONE_TONE: Record<string, string> = {
  forest: T.fire,
  buffer: T.cyan,
  residential: T.red,
};

// ── Zones ───────────────────────────────────────────────────────────────────

export interface ZoneOverlay {
  id: string;
  label: string;
  tone: string;
  /** [lx,ly, …] closed perimeter ring, world metres. */
  lxLyPolygon: number[];
  center: { lx: number; ly: number };
}

export const zones: ZoneOverlay[] = ZONES.map((zone) => ({
  id: zone.id,
  label: zone.shortLabel.toUpperCase(),
  tone: ZONE_TONE[zone.category] ?? T.textSecondary,
  lxLyPolygon: parsePixelPolygon(zone.polygon).flatMap((p) => {
    const { lx, ly } = uvToLxLy(p.u, p.v);
    return [lx, ly];
  }),
  center: pxToLxLy(zone.center.x, zone.center.y),
}));

// ── Spread rings ────────────────────────────────────────────────────────────

export interface SpreadRingOverlay {
  label: string;
  minutes: number;
  /** Ring radius in world metres (authored native px → metres). */
  radiusMetres: number;
  tone: string;
  center: { lx: number; ly: number };
}

const ringCenter = pxToLxLy(ANOMALY.x, ANOMALY.y);

export const spreadRings: SpreadRingOverlay[] = SPREAD_RINGS.map((ring) => ({
  label: ring.label,
  minutes: ring.minutes,
  // Same authored pixel radius the 2D ring draws, expressed in metres.
  radiusMetres: (ring.radius / MAP_NATIVE.width) * W,
  // SPREAD_RINGS colours are already tokens (red / amber / textMuted).
  tone: ring.color,
  center: ringCenter,
}));

// ── Egress corridors (Route A + Route B) ────────────────────────────────────

export type CorridorStatus = "active" | "standby" | "compromised";

export interface CorridorOverlay {
  id: string;
  label: string;
  /** [lx,ly, …] open polyline along the road graph, world metres. */
  lxLyPolyline: number[];
}

/** Corridor grammar — one emphasis language, driven by operational state. */
export const CORRIDOR_TONE: Record<CorridorStatus, string> = {
  active: T.cyan,
  standby: T.amber,
  compromised: T.red,
};

/** Staged default: guidance active on A, held standby on B. */
export const DEFAULT_CORRIDOR_STATUS: Record<string, CorridorStatus> = {
  "route-a": "active",
  "route-b": "standby",
};

export const corridors: CorridorOverlay[] = EGRESS_ROUTES.map((route) => ({
  id: route.id,
  label: route.label,
  lxLyPolyline: routePolyline(route).flatMap((p) => {
    const { lx, ly } = uvToLxLy(p.u, p.v);
    return [lx, ly];
  }),
}));

// ── Tactical labels (DOM, projected by CSS2DRenderer) ───────────────────────

export interface TacticalLabel {
  id: string;
  text: string;
  lx: number;
  ly: number;
  /** Height above the draped terrain, metres. */
  liftMetres: number;
  tone: string;
  /** Numeric content → the chip renders with tabular figures. */
  numeric: boolean;
}

const ring60 = spreadRings[spreadRings.length - 1];

export const labels: TacticalLabel[] = [
  // Zone plates — instrumentation for each authored perimeter.
  ...zones.map((zone) => ({
    id: `lbl-${zone.id}`,
    text: zone.label,
    lx: zone.center.lx,
    ly: zone.center.ly,
    liftMetres: 28,
    tone: zone.tone,
    numeric: false,
  })),
  // Incident grid reference.
  {
    id: "lbl-grid-4c",
    text: "GRID 4C",
    lx: ringCenter.lx,
    ly: ringCenter.ly,
    liftMetres: 44,
    tone: T.textPrimary,
    numeric: true,
  },
  // Outer spread ring readout.
  {
    id: "lbl-ring-60",
    text: `${ring60.label} · ${Math.round(ring60.radiusMetres)} M`,
    lx: ring60.center.lx,
    ly: ring60.center.ly + ring60.radiusMetres,
    liftMetres: 22,
    tone: ring60.tone,
    numeric: true,
  },
  // Live actor plates — positions and battery straight from the roster.
  ...createDroneRoster()
    .slice(0, 3)
    .map((drone) => {
      const { lx, ly } = pxToLxLy(drone.x, drone.y);
      return {
        id: `lbl-${drone.id}`,
        text: `${drone.name.toUpperCase()} · ${drone.battery}%`,
        lx,
        ly,
        liftMetres: 46,
        tone: T.cyan,
        numeric: true,
      };
    }),
];

export interface OverlayData {
  zones: ZoneOverlay[];
  spreadRings: SpreadRingOverlay[];
  corridors: CorridorOverlay[];
  labels: TacticalLabel[];
}

export const overlayData: OverlayData = { zones, spreadRings, corridors, labels };
