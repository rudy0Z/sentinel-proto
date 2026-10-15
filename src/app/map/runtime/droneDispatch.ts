/**
 * Drone dispatch (Sentinel V2 · P2.4) — drag-as-staging.
 *
 * A drag from the asset rail resolves (a) which authored zone the pointer is
 * over, (b) that zone's centroid as the snap point, and (c) an obstacle-aware
 * route along the shared road graph. The result is a **proposal** — this module
 * never authors a state change and has no path to execute a gated action; the
 * operator gate lives in the shell, exactly as it does in 2D.
 */

import { createDroneRoster } from "../../mockData";
import type { DroneRosterEntry } from "../../tokens";
import { MAP_NATIVE } from "../frame";
import { findPath, polylineLength } from "../roads";
import { H, W } from "../world/world";
import type { MapPoint } from "../types";
import type { ZoneOverlay } from "./overlayData";

/** Author hours… metres per second for the scout airframes. */
const DRONE_SPEED_MPS = 16;

export function pxToUv(x: number, y: number): MapPoint {
  return { u: x / MAP_NATIVE.width, v: y / MAP_NATIVE.height };
}

export function uvToLxLy(p: MapPoint): { lx: number; ly: number } {
  return { lx: (p.u - 0.5) * W, ly: (0.5 - p.v) * H };
}

export function lxLyToUv(lx: number, ly: number): MapPoint {
  return { u: lx / W + 0.5, v: 0.5 - ly / H };
}

/** Even-odd point-in-polygon over an [lx,ly,…] ring. */
export function pointInRing(lx: number, ly: number, ring: number[]): boolean {
  const n = ring.length / 2;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2], yi = ring[i * 2 + 1];
    const xj = ring[j * 2], yj = ring[j * 2 + 1];
    if ((yi > ly) !== (yj > ly) && lx < ((xj - xi) * (ly - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** The authored zone under a world-local point, if any. */
export function zoneAt(lx: number, ly: number, zones: ZoneOverlay[]): ZoneOverlay | null {
  for (const zone of zones) {
    if (pointInRing(lx, ly, zone.lxLyPolygon)) return zone;
  }
  return null;
}

export interface DispatchProposal {
  droneId: string;
  droneName: string;
  targetZoneId: string;
  targetLabel: string;
  /** Snap point — never the raw drop coordinate. */
  centroid: { lx: number; ly: number };
  /** Route along the shared road graph, [lx,ly,…]. */
  routeLxLy: number[];
  etaSeconds: number;
  /** Deterministic confirm copy (pre-LLM path, identical state path). */
  copy: string;
}

/** Build a PROPOSAL for dropping `drone` on `target`. Pure — no side effects. */
export function proposeDispatch(
  drone: Pick<DroneRosterEntry, "id" | "name" | "x" | "y">,
  target: ZoneOverlay,
): DispatchProposal {
  const from = pxToUv(drone.x, drone.y);
  const to = lxLyToUv(target.center.lx, target.center.ly);
  let pts = findPath({ from, to, allowed: "drone" });
  if (pts.length < 2) pts = [from, to];
  const routeLxLy = pts.flatMap((p) => {
    const { lx, ly } = uvToLxLy(p);
    return [lx, ly];
  });
  const metres = polylineLength(pts) * W;
  const etaSeconds = Math.max(6, Math.round(metres / DRONE_SPEED_MPS));
  return {
    droneId: drone.id,
    droneName: drone.name,
    targetZoneId: target.id,
    targetLabel: target.label,
    centroid: { lx: target.center.lx, ly: target.center.ly },
    routeLxLy,
    etaSeconds,
    copy: `${drone.name} assigned. Confirm?`,
  };
}

/** Draggable assets — the roster the rail lifts from. */
export function dispatchRoster(): DroneRosterEntry[] {
  return createDroneRoster().slice(0, 4);
}
