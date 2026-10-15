/**
 * ─── Fire model — one authored fire, two renderers ───────────────────────────
 *
 * The 2D ops map and the 3D EXPLORE scene used to grow the fire independently
 * (a handful of boxes on the crest, plus three static circles on the flat map).
 * That is the same drift that put 2D SVG zones "in the sky" of an oblique bake.
 *
 * This module is the single source: an authored progression (isochrones), a
 * head-fire axis, a burn-severity field, and NWCG fire-behaviour metrics. Both
 * renderers project THIS data — 2D into map-local UV, 3D onto terrain in
 * metres. They cannot disagree because there is nothing to disagree about.
 *
 * HONESTY (repo golden rule 1)
 *   The isochrone geometry is AUTHORED, not forecast by a model. The metrics
 *   are real NWCG fire-behaviour definitions (rate of spread in chains/hour,
 *   energy release component, fine dead fuel moisture, flame length) quoted
 *   from standard practice — they are NOT computed from a Rothermel run, and
 *   the UI never claims they are. The *shape* of the progression follows the
 *   real 3DEP terrain so the story is at least geographically honest: the fire
 *   runs the ridge and is checked by the saddle.
 */

export interface Isochrone {
  /** Minutes since ignition. */
  tMinutes: number;
  /** Short stamp rendered at the perimeter, e.g. "T+30". */
  label: string;
  /** Clock time in the incident narrative, e.g. "03:12". */
  clock: string;
  /** Closed polygon in world-local metres (x east, y north). */
  polygon: Array<[number, number]>;
  /** dNBR-style severity inside this band: 0 unscorched → 1 consumed. */
  severity: number;
  /** Stroke tone; the newest band is the live front. */
  tone: string;
}

export interface FireMetrics {
  /** Rate of spread, chains per hour (NWCG). */
  rosChainsPerHr: number;
  /** Energy Release Component, 0–100+ (NWCG). */
  erc: number;
  /** Fine dead fuel moisture, %. */
  fuelMoisturePct: number;
  /** Flame length, feet. */
  flameLengthFt: number;
  /** Acres currently involved. */
  acres: number;
  /** How these numbers must be described in the UI. */
  basis: string;
}

export interface FireModel {
  ignition: { x: number; y: number };
  /** Oldest → newest. The last entry is the active front. */
  isochrones: Isochrone[];
  /** Directional spread vector: the head fire's advance path. */
  headAxis: Array<[number, number]>;
  metrics: FireMetrics;
}

/**
 * Ignition sits low on the south flank of the north ridge; the run goes north,
 * widens as it feeds, and is checked by the crest — the same saddle the
 * scenario's threat narrative depends on.
 *
 * Scale note: the newest perimeter encloses roughly 0.9 km² (~220 acres). The
 * `acres` metric is DERIVED from this polygon (see `burnedAcres`) rather than
 * authored separately, so the drawn scar and the reported number can never
 * disagree — which is exactly the class of drift this whole model exists to
 * remove.
 */
export const FIRE: FireModel = {
  ignition: { x: 1020, y: 980 },

  isochrones: [
    {
      tMinutes: 0,
      label: "T+00",
      clock: "02:24",
      severity: 0.55,
      tone: "#E5533C",
      polygon: [
        [900, 880], [1080, 830], [1240, 930], [1250, 1090],
        [1140, 1180], [960, 1150], [860, 1040], [862, 946],
      ],
    },
    {
      tMinutes: 15,
      label: "T+15",
      clock: "02:39",
      severity: 0.7,
      tone: "#E5533C",
      polygon: [
        [800, 800], [1060, 720], [1330, 820], [1380, 1020],
        [1300, 1230], [1100, 1310], [860, 1240], [756, 1050], [770, 900],
      ],
    },
    {
      tMinutes: 30,
      label: "T+30",
      clock: "02:54",
      severity: 0.82,
      tone: "#FF8A4A",
      polygon: [
        [700, 730], [1050, 610], [1440, 700], [1530, 940],
        [1470, 1230], [1200, 1370], [880, 1350], [640, 1160], [656, 890],
      ],
    },
    {
      tMinutes: 60,
      label: "T+60",
      clock: "03:24",
      severity: 0.9,
      tone: "#FFB066",
      polygon: [
        [600, 650], [1020, 500], [1560, 590], [1690, 880],
        [1640, 1250], [1330, 1450], [900, 1440], [530, 1230], [540, 890],
      ],
    },
  ],

  /** The head fire: from ignition up the west flank, checked at the crest. */
  headAxis: [
    [1020, 980], [980, 1120], [1010, 1260], [1080, 1380],
    [1180, 1470], [1300, 1540],
  ],

  metrics: {
    rosChainsPerHr: 28,
    erc: 84,
    fuelMoisturePct: 4,
    flameLengthFt: 52,
    acres: 0, // derived — see burnedAcres()
    basis: "NWCG fire-behaviour metrics — authored values, not model output",
  },
};

/** The active front: the newest isochrone. */
export function activeFront(fire: FireModel = FIRE): Isochrone {
  return fire.isochrones[fire.isochrones.length - 1];
}

/** The fully-burned interior = the newest perimeter scaled slightly inward. */
export function burnScarPolygon(fire: FireModel = FIRE, inset = 0.78): Array<[number, number]> {
  const poly = activeFront(fire).polygon;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of poly) {
    cx += x;
    cy += y;
  }
  cx /= poly.length;
  cy /= poly.length;
  return poly.map(([x, y]) => [cx + (x - cx) * inset, cy + (y - cy) * inset] as [number, number]);
}

/** Polygon area in m² (shoelace). */
export function polygonAreaM2(poly: Array<[number, number]>): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/** Acres covered by the newest isochrone — drives the fire-area metric. */
export function burnedAcres(fire: FireModel = FIRE): number {
  return Math.round(polygonAreaM2(activeFront(fire).polygon) / 4046.86);
}
