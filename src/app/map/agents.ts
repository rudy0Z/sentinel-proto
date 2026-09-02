import { findPath, nearestNodeId, nodePoint, pointAlongPolyline } from "./roads";
import { fromPixel, toPixel } from "./frame";
import type { AgentKind, AgentPose, MapPoint, PathRequest } from "./types";

export function poseFromPixel(
  id: string,
  kind: AgentKind,
  x: number,
  y: number,
  extras: Partial<AgentPose> = {},
): AgentPose {
  return {
    id,
    kind,
    point: fromPixel(x, y),
    ...extras,
  };
}

export function pixelFromPose(pose: AgentPose): { x: number; y: number } {
  return toPixel(pose.point);
}

/** Build a road-constrained path for an agent move. */
export function requestPath(
  from: MapPoint,
  to: MapPoint,
  kind: AgentKind,
): MapPoint[] {
  const request: PathRequest = { from, to, allowed: kind };
  return findPath(request);
}

export function snapToNetwork(point: MapPoint, kind: AgentKind): MapPoint {
  return nodePoint(nearestNodeId(point, kind));
}

export function samplePath(path: MapPoint[], progress: number): MapPoint {
  return pointAlongPolyline(path, Math.max(0, Math.min(1, progress)));
}

/**
 * Ease progress 0–1. Reduced-motion callers should jump to 1.
 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export interface TransitState {
  id: string;
  kind: AgentKind;
  path: MapPoint[];
  startedAt: number;
  durationMs: number;
}

export function createTransit(
  id: string,
  kind: AgentKind,
  from: MapPoint,
  to: MapPoint,
  durationMs = 1600,
): TransitState {
  return {
    id,
    kind,
    path: requestPath(from, to, kind),
    startedAt: performance.now?.() ?? Date.now(),
    durationMs,
  };
}

export function transitPoint(transit: TransitState, now: number, reducedMotion: boolean): {
  point: MapPoint;
  done: boolean;
  progress: number;
} {
  if (reducedMotion) {
    return { point: transit.path[transit.path.length - 1], done: true, progress: 1 };
  }
  const raw = (now - transit.startedAt) / transit.durationMs;
  const progress = Math.max(0, Math.min(1, raw));
  return {
    point: samplePath(transit.path, easeInOut(progress)),
    done: progress >= 1,
    progress,
  };
}
