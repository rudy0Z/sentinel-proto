import type { MapPoint, MapViewport, ScreenPoint } from "./types";

/** Native basemap content frame used by Sentinel overlays. */
export const MAP_NATIVE = {
  width: 1691,
  height: 914,
} as const;

/** Default operational display size (shell map lane). */
export const MAP_DISPLAY = {
  width: 1440,
  height: 900,
} as const;

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/** Pixel (Figma / mockData) → normalized MapFrame. */
export function fromPixel(x: number, y: number): MapPoint {
  return {
    u: clamp01(x / MAP_NATIVE.width),
    v: clamp01(y / MAP_NATIVE.height),
  };
}

/** Normalized → pixel in native content space. */
export function toPixel(point: MapPoint): ScreenPoint {
  return {
    x: point.u * MAP_NATIVE.width,
    y: point.v * MAP_NATIVE.height,
  };
}

/** Normalized → screen coordinates for a viewport (defaults to 1440×900). */
export function toScreen(point: MapPoint, viewport: MapViewport = MAP_DISPLAY): ScreenPoint {
  return {
    x: point.u * viewport.width,
    y: point.v * viewport.height,
  };
}

export function fromScreen(point: ScreenPoint, viewport: MapViewport = MAP_DISPLAY): MapPoint {
  return {
    u: clamp01(point.x / viewport.width),
    v: clamp01(point.y / viewport.height),
  };
}

export function parsePixelPolygon(points: string): MapPoint[] {
  return points
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return fromPixel(x, y);
    });
}

export function polygonToSvgPoints(polygon: MapPoint[], viewport: MapViewport = MAP_DISPLAY): string {
  return polygon.map((p) => {
    const s = toScreen(p, viewport);
    return `${s.x},${s.y}`;
  }).join(" ");
}

export function distanceUv(a: MapPoint, b: MapPoint): number {
  const du = a.u - b.u;
  const dv = a.v - b.v;
  return Math.hypot(du, dv);
}

export function lerpPoint(a: MapPoint, b: MapPoint, t: number): MapPoint {
  return {
    u: a.u + (b.u - a.u) * t,
    v: a.v + (b.v - a.v) * t,
  };
}
