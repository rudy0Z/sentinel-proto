/**
 * Hairline Instrument palette — rendition 01 (docs/redesign-2026/14).
 *
 * Map/canvas code may carry raw hex (tokens charter exception); every value is
 * documented here so the audit trail stays readable. Two laws govern it:
 *
 *   1. VALUE BEFORE HUE — classes separate by luminance band first; everything
 *      lives in one blue-slate family so state tones (T.cyan/T.amber/T.red,
 *      imported from tokens where a state is semantic) are the only chroma.
 *   2. GLOW IS STATE — the fire is the only warm element at rest. Cyan/amber/
 *      red luminance appears only where an operational state authorizes it.
 */

export const HAIRLINE = {
  // ── Sky + atmosphere ──────────────────────────────────────────────────────
  skyTop: "#0A111B",
  skyHorizon: "#1D2E40",
  fog: "#16232F",

  // ── Light rig (cool night key, no warm light anywhere) ────────────────────
  ambient: "#BFD4E8",
  key: "#A9C2DC",
  fill: "#56687E",

  // ── Terrain: hypsometric slate ramp (valley → ridge) ─────────────────────
  hypso: ["#1D2836", "#263444", "#33445A"] as const,
  /** Vegetation class tints, lerped 0.5 over the hypso ramp (desaturated). */
  veg: {
    10: "#24382E", // forest
    20: "#303D2B", // shrub
    30: "#37422E", // grass
    40: "#37422E", // crop
    50: "#303944", // built
    60: "#363E45", // bare
    80: "#1C2F3D", // water
  } as Record<number, string>,
  vegLerp: 0.5,
  /** Slopes steeper than 0.45 darken toward ×0.80. */
  slopeFloor: 0.45,
  slopeDarken: 0.8,

  // ── Contour isolines (world-space, fwidth-AA'd in the terrain shader) ─────
  contourMinor: "#8FB3D1",
  contourMinorOpacity: 0.16,
  contourMajor: "#A9C8E4",
  contourMajorOpacity: 0.32,
  contourStep: 40.0, // scene metres (≈25 m terrain at VEX 1.6)
  contourMajorEvery: 5,

  // ── Plinth (diorama skirt) ────────────────────────────────────────────────
  plinth: "#101823",

  // ── Buildings: value band fills + hairline edges ──────────────────────────
  bldgSmall: "#39475B",
  bldgBig: "#4A5B76",
  /** Structures inside the 60-min ring mix toward this warm fill. */
  bldgAtRisk: "#6E4A3C",
  bldgAtRiskMix: 0.45,
  bldgEdge: "#9FB8D0",
  bldgEdgeOpacity: 0.5,
  /** The 60-min ring painted on the building stock (glow-as-state). */
  bldgEdgeAtRisk: "#FFB182",

  // ── Roads: faint lane + hairline centerline ───────────────────────────────
  roadLane: "#243344",
  roadArterial: "#9FC5E8",
  roadArterialOpacity: 0.7,
  roadLocal: "#5E7488",
  roadLocalOpacity: 0.32,

  // ── Vegetation: texture, not hero ─────────────────────────────────────────
  tree: "#2B3D33",
  treeJitter: 0.06,

  // ── Fire: the only warm element at rest (lwir.fire, token-anchored) ───────
  fireBand: "#FF8A4A", // = lwir.fire
  fireHot: "#FFC89A",
  fireGlow: "#FF9A5C",
  /** Radial ground designate under the incident (T.amber family). */
  incidentGlow: "#F5A623", // = T.amber
  incidentGlowRadius: 420,
  incidentGlowPeak: 0.14,

  // ── Glow ribbons / beacons ────────────────────────────────────────────────
  corridorRibbonOpacity: 0.12,
  corridorStandbyOpacity: 0.4,
  agentCore: "#EAF6FF",

  // ── Chrome (HUD chips; everything else stays on T tokens at the call site)─
  chipBg: "rgba(5, 11, 19, 0.82)",
  chipBorderAlpha: "44",
} as const;

/** Vertical exaggeration — same law as the original worldScene (consistency). */
export const VEX = 1.6;
