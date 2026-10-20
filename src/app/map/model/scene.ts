/**
 * Scene state — the world's lighting, weather, and visibility.
 *
 * FireTrace is a day product. Sentinel's scenario is a night initial attack,
 * so the world has to carry a *lighting state* rather than a theme. One scene
 * state drives every tier: the 2D world model grades itself from it, the EO
 * camera exposes itself for it, the IR camera ignores it (thermal does not
 * care about the sun), and the degradation ladder reads its visibility from
 * it.
 *
 * That last point is the important one. Smoke is not a visual effect bolted
 * onto the camera — it is a property of the scene that *reduces what the
 * camera can see*, and the ladder follows from that. See fidelity.ts.
 *
 * ── Honesty ─────────────────────────────────────────────────────────────────
 * Weather values here are AUTHORED placeholders shaped like real RAWS/NDFC
 * output (wind speed and direction, temperature, RH, fine dead fuel moisture,
 * ERC, flame length). They are not a live feed. Per DECISIONS.md §1.3 every
 * surface that renders them must state that basis — measured / modeled /
 * authored — and this module carries the basis so the UI cannot forget.
 */

import { normalized, toGeo, formatGeo } from "./space";

/** How the incident's weather is known. Per DECISIONS.md §1.3. */
export type DataBasis = "measured" | "modeled" | "authored";

export type ScenePhase = "day" | "night";

export interface WeatherState {
  /** Sustained wind, miles per hour. */
  windMph: number;
  /** Meteorological wind direction, degrees the wind comes FROM. */
  windDirDeg: number;
  /** Wind gust, mph. */
  gustMph: number;
  /** Air temperature, °C. */
  tempC: number;
  /** Relative humidity, %. */
  rhPct: number;
  /** Fine dead fuel moisture, %. Below 6% is extreme fire danger. */
  fuelMoisturePct: number;
  /** Energy Release Component, 0–100+. */
  erc: number;
  /** Flame length at the fire front, feet. A range, because it is a range. */
  flameLengthFt: [number, number];
  /** How these values were obtained. */
  basis: DataBasis;
}

export interface SmokeState {
  /** 0 = clear, 1 = fully obscured. Drives the fidelity ladder. */
  obscuration: number;
  /** Where the smoke column is, in local metres. */
  columnAt: { x: number; y: number }[];
  /** Authored. */
  basis: DataBasis;
}

export interface SceneState {
  /** Day or night. The scenario runs at night. */
  phase: ScenePhase;
  /** Sun elevation in degrees; negative is below the horizon. */
  sunElevationDeg: number;
  /** Ambient light level, 0–1. */
  ambient: number;
  /** Air temperature, °C. */
  weather: WeatherState;
  /** Smoke obscuring the camera. */
  smoke: SmokeState;
  /** Incident clock, minutes since ignition. */
  minutesSinceIgnition: number;
  /** Incident clock, human readable. */
  clock: string;
}

/**
 * The scenario's scene. Night: 02:24 at the start of the initial attack.
 *
 * `minutesSinceIgnition` is the clock the whole product runs on — the deck,
 * the charts, the timeline, and the fire progression all read it, so they
 * cannot disagree about what time it is.
 */
export const SCENE: SceneState = {
  phase: "night",
  sunElevationDeg: -18,
  ambient: 0.08,
  minutesSinceIgnition: 0,
  clock: "02:24",
  weather: {
    windMph: 18,
    windDirDeg: 228,
    gustMph: 27,
    tempC: 31,
    rhPct: 20,
    fuelMoisturePct: 5,
    erc: 84,
    flameLengthFt: [35, 57],
    basis: "authored",
  },
  smoke: {
    obscuration: 0.12,
    columnAt: [
      { x: 1080, y: 1350 },
      { x: 1120, y: 1520 },
      { x: 1020, y: 1150 },
    ],
    basis: "authored",
  },
};

/** Compass label for a wind direction ("SW" for 228°). */
export function windCompass(deg: number): string {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return points[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

/** Human label for a basis value, for the provenance treatment. */
export function basisLabel(basis: DataBasis): string {
  switch (basis) {
    case "measured":
      return "measured";
    case "modeled":
      return "modeled";
    default:
      return "authored";
  }
}

/**
 * The wind vector, in local metres, for drawing an arrow on the map.
 * Meteorological convention: wind FROM `windDirDeg`, so the arrow points the
 * way the wind is going — which is the opposite of the "from" bearing.
 */
export function windVector(state: SceneState): { x: number; y: number } {
  const to = ((state.weather.windDirDeg + 180) % 360) * (Math.PI / 180);
  return { x: Math.sin(to), y: Math.cos(to) };
}

/** Where the smoke column sits, in normalized MapFrame space. */
export function smokeNormalized(state: SceneState): Array<{ u: number; v: number }> {
  return state.smoke.columnAt.map((p) => normalized(p.x, p.y));
}

/** Geographic position of the smoke column, for the readout. */
export function smokeGeographic(state: SceneState): string[] {
  return state.smoke.columnAt.map((p) => formatGeo(p.x, p.y));
}

/** Re-export for convenience so a renderer needs one import. */
export { toGeo };
