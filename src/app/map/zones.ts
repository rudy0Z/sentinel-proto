import { ZONES } from "../mockData";
import { fromPixel, parsePixelPolygon, clamp01, lerpPoint } from "./frame";
import type { MapPoint, ZoneModel } from "./types";

/**
 * Zone footprints authored from basemap land use (mountain/ridge fire,
 * both buffer corridors, both residential grids). Migrated from mockData
 * pixel polygons into MapFrame, then lightly re-centered for photo fit.
 */
export const ZONE_MODELS: ZoneModel[] = ZONES.map((zone) => ({
  id: zone.id,
  label: zone.label,
  shortLabel: zone.shortLabel,
  category: zone.category,
  polygon: parsePixelPolygon(zone.polygon),
  center: fromPixel(zone.center.x, zone.center.y),
  riskShort: zone.riskShort,
  spreadShort: zone.spreadShort,
  terrainShort: zone.terrainShort,
  structuresShort: zone.structuresShort,
}));

const ZONE_BY_ID = new Map(ZONE_MODELS.map((z) => [z.id, z]));

export function getZoneModel(id: string): ZoneModel | undefined {
  return ZONE_BY_ID.get(id);
}

export function zoneFillTone(category: ZoneModel["category"]): string {
  switch (category) {
    case "forest":
      return "fire";
    case "buffer":
      return "cyan";
    case "residential":
      return "red";
  }
}

/**
 * Expand / contract a polygon about its centroid by a normalized margin.
 * Positive margin grows the envelope; negative shrinks (clamped).
 */
export function expandPolygon(polygon: MapPoint[], marginUv: number): MapPoint[] {
  if (polygon.length === 0 || marginUv === 0) return polygon.map((p) => ({ ...p }));

  let cu = 0;
  let cv = 0;
  for (const p of polygon) {
    cu += p.u;
    cv += p.v;
  }
  cu /= polygon.length;
  cv /= polygon.length;

  return polygon.map((p) => {
    const du = p.u - cu;
    const dv = p.v - cv;
    const len = Math.hypot(du, dv) || 1;
    const scale = 1 + marginUv / len;
    return {
      u: clamp01(cu + du * scale),
      v: clamp01(cv + dv * scale),
    };
  });
}

export function applyZoneMargin(zone: ZoneModel, marginUv: number): ZoneModel {
  if (!marginUv) return zone;
  const polygon = expandPolygon(zone.polygon, marginUv);
  const center = polygon.reduce(
    (acc, p) => ({ u: acc.u + p.u / polygon.length, v: acc.v + p.v / polygon.length }),
    { u: 0, v: 0 },
  );
  return { ...zone, polygon, center };
}

export function pointInPolygon(point: MapPoint, polygon: MapPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].u;
    const yi = polygon[i].v;
    const xj = polygon[j].u;
    const yj = polygon[j].v;
    const intersect =
      yi > point.v !== yj > point.v &&
      point.u < ((xj - xi) * (point.v - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function nearestZoneId(point: MapPoint, zones: ZoneModel[] = ZONE_MODELS): string {
  for (const zone of zones) {
    if (pointInPolygon(point, zone.polygon)) return zone.id;
  }
  let best = zones[0]?.id ?? "forest-north";
  let bestDist = Infinity;
  for (const zone of zones) {
    const d = Math.hypot(point.u - zone.center.u, point.v - zone.center.v);
    if (d < bestDist) {
      bestDist = d;
      best = zone.id;
    }
  }
  return best;
}

/** Soft uncertainty envelope outside the authored polygon. */
export function envelopePolygon(polygon: MapPoint[], marginUv: number): MapPoint[] {
  return expandPolygon(polygon, Math.max(0, marginUv));
}

export function blendToward(a: MapPoint, b: MapPoint, t: number): MapPoint {
  return lerpPoint(a, b, t);
}
