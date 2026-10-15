/**
 * server/scenarios.ts — the authored scenario catalog (Phase 6).
 *
 * Data-only module: every scenario is a pure literal so the engine stays a
 * deterministic replay machine and the catalog can be diffed in review. Mirrors
 * docs/sentinel-v2-master-plan/05-MULTI-SCENARIO-DATABASE-AND-FIXTURES.md §2/§3.
 *
 * Scenario 1 is preserved byte-for-byte from Phase 4 (same beats, same hints,
 * same temps) so existing sessions and the live demo are unaffected; S-02..S-06
 * share the identical shape and add zone state, drone roster and decision map.
 */

export interface ScenarioSeed {
  id: string;
  code_name: string;
  title: string;
  description: string;
  fuel_model: string;
  ambient_temp_f: number;
  relative_humidity: number;
  wind_vector_bearing: number;
  wind_vector_speed_kts: number;
  initial_coordinates: [number, number];
}

/** One row of the scripted timeline. Optional wind overrides model in-run shifts. */
export interface ScenarioBeat {
  atS: number;
  sceneHint: string;
  thermalF: number;
  confidence: number;
  structures: number;
  lidarEta: number | null;
  windBearing?: number;
  windSpeedKts?: number;
}

export type ZoneState = "nominal" | "watch" | "warning" | "critical" | "blocked" | "cleared";

export interface ScenarioZone {
  id: string;
  label: string;
  state: ZoneState;
  note?: string;
}

export interface ScenarioDrone {
  id: string;
  role: "scout" | "lidar" | "relay" | "acoustic";
  lat: number;
  lng: number;
  altM: number;
  state: "staged" | "transit" | "onsite" | "rtb";
  batteryPct?: number;
}

/** A decision the run expects the operator to face. actionId aligns with TRANSITIONS. */
export interface DecisionPoint {
  atS: number;
  actionId: string;
  gate: "none" | "confirm" | "human-approval";
  prompt: string;
  options: string[];
}

export interface ScenarioDefinition extends ScenarioSeed {
  /** Human-facing label, e.g. "False Alarm (Permit Conflict)". */
  label: string;
  /** Default PRNG seed for this scenario — distinct per scenario. */
  seed: number;
  /** Scripted run length in seconds. */
  durationS: number;
  beats: ScenarioBeat[];
  zones: ScenarioZone[];
  drones: ScenarioDrone[];
  decisionPoints: DecisionPoint[];
}

export const SCENARIO_1: ScenarioDefinition = {
  id: "S-01",
  code_name: "Encinal Ridge",
  label: "Encinal Ridge (Flagship Hero)",
  title: "Encinal Canyon WUI — wind-driven chaparral run",
  description:
    "Thermal cluster registers a 480°F spike in dry chaparral under NE wind. Scout Lidar-02 confirms an 840°F crown run; operator authorizes packet AUD-90-0847 and Plan A (West Ridge anchor). 47/47 residential structures evacuated.",
  fuel_model: "FBFM4 High Chaparral",
  ambient_temp_f: 96,
  relative_humidity: 14,
  wind_vector_bearing: 38,
  wind_vector_speed_kts: 14,
  initial_coordinates: [34.0925, -118.813],
  seed: 20260915,
  durationS: 90,
  beats: [
    { atS: 0, sceneHint: "baseline", thermalF: 96, confidence: 0, structures: 0, lidarEta: null },
    { atS: 8, sceneHint: "alert-command", thermalF: 212, confidence: 41, structures: 0, lidarEta: null },
    { atS: 20, sceneHint: "investigation-pending", thermalF: 341, confidence: 55, structures: 0, lidarEta: 14 },
    { atS: 34, sceneHint: "verify-active", thermalF: 620, confidence: 68, structures: 0, lidarEta: 0 },
    { atS: 48, sceneHint: "verify-active", thermalF: 840, confidence: 78, structures: 0, lidarEta: 0 },
    { atS: 62, sceneHint: "authority-notification-ready", thermalF: 855, confidence: 78, structures: 0, lidarEta: 0 },
    { atS: 76, sceneHint: "contain-recommended", thermalF: 838, confidence: 78, structures: 12, lidarEta: 0 },
    { atS: 90, sceneHint: "rescue-nominal", thermalF: 790, confidence: 84, structures: 34, lidarEta: 0 },
  ],
  zones: [
    { id: "GRID-4C", label: "Grid 4C residential", state: "warning", note: "47 structures in the run's path" },
    { id: "WEST-RIDGE", label: "West Ridge anchor", state: "nominal", note: "Plan A containment line" },
    { id: "EAST-FLANK", label: "East flank", state: "watch" },
    { id: "RIDGE-ROAD", label: "Ridge Road corridor", state: "nominal" },
  ],
  drones: [
    { id: "Lidar-02", role: "lidar", lat: 34.0931, lng: -118.8122, altM: 120, state: "onsite", batteryPct: 91 },
    { id: "Scout-01", role: "scout", lat: 34.092, lng: -118.8155, altM: 90, state: "transit", batteryPct: 88 },
  ],
  decisionPoints: [
    { atS: 20, actionId: "dispatch-scout", gate: "confirm", prompt: "Dispatch Lidar-02 to corroborate the thermal cluster.", options: ["Dispatch", "Hold"] },
    { atS: 42, actionId: "notify-authorities", gate: "human-approval", prompt: "Release authority packet AUD-90-0847.", options: ["Authorize", "Decline"] },
    { atS: 62, actionId: "authorize-containment", gate: "human-approval", prompt: "Authorize Plan A (West Ridge anchor).", options: ["Authorize Plan A", "Authorize Plan B"] },
  ],
};

export const SCENARIO_2: ScenarioDefinition = {
  id: "S-02",
  code_name: "False Alarm",
  label: "False Alarm (Permit Conflict)",
  title: "Northern Agricultural Valley — permitted burn contested",
  description:
    "Satellite IR detects a heat bloom that matches an uncontrolled run. The agricultural permit database cross-references active permit #8841. Operator overrules TALON's escalation, citing VHF confirmation from the vineyard manager; the run enters Contested Watch and the burn crew extinguishes on schedule. Zero false-positive dispatch cost.",
  fuel_model: "FBFM1 Grazed Annual Grass",
  ambient_temp_f: 88,
  relative_humidity: 38,
  wind_vector_bearing: 12,
  wind_vector_speed_kts: 6,
  initial_coordinates: [36.78, -121.65],
  seed: 20260916,
  durationS: 600,
  beats: [
    { atS: 0, sceneHint: "baseline", thermalF: 88, confidence: 0, structures: 0, lidarEta: null },
    { atS: 8, sceneHint: "alert-command", thermalF: 148, confidence: 33, structures: 0, lidarEta: null },
    { atS: 20, sceneHint: "investigation-pending", thermalF: 171, confidence: 47, structures: 0, lidarEta: 12 },
    { atS: 34, sceneHint: "verify-active", thermalF: 188, confidence: 58, structures: 0, lidarEta: 0 },
    { atS: 48, sceneHint: "monitoring-contested", thermalF: 182, confidence: 61, structures: 0, lidarEta: 0 },
    { atS: 62, sceneHint: "monitoring-contested", thermalF: 176, confidence: 63, structures: 0, lidarEta: 0 },
    { atS: 120, sceneHint: "monitoring-contested", thermalF: 158, confidence: 60, structures: 0, lidarEta: 0 },
    { atS: 300, sceneHint: "monitoring-contested", thermalF: 121, confidence: 58, structures: 0, lidarEta: 0 },
    { atS: 600, sceneHint: "baseline", thermalF: 89, confidence: 55, structures: 0, lidarEta: 0 },
  ],
  zones: [
    { id: "PERMIT-8841", label: "Permit #8841 burn plot", state: "watch", note: "Active agricultural burn permit" },
    { id: "VALLEY-N", label: "North Valley crop block", state: "watch" },
    { id: "VINEYARD", label: "Vineyard margin", state: "nominal" },
    { id: "HWY-12", label: "Highway 12 corridor", state: "nominal" },
  ],
  drones: [
    { id: "Scout-01", role: "scout", lat: 36.7808, lng: -121.6488, altM: 110, state: "onsite", batteryPct: 94 },
  ],
  decisionPoints: [
    { atS: 34, actionId: "dispatch-scout", gate: "confirm", prompt: "Send Scout-01 to corroborate the satellite bloom.", options: ["Dispatch", "Hold"] },
    { atS: 48, actionId: "monitor-only", gate: "confirm", prompt: "TALON recommends escalation. Overrule and hold in Contested Watch?", options: ["Hold (record dissent)", "Escalate"] },
    { atS: 300, actionId: "operator.resolve-dissent", gate: "none", prompt: "Burn crew reports the fire extinguished on schedule — close the contest.", options: ["Close as false alarm"] },
  ],
};

export const SCENARIO_3: ScenarioDefinition = {
  id: "S-03",
  code_name: "Canyon Gulch",
  label: "Canyon Gulch (Wind Shear Reroute)",
  title: "Steep narrow valley — 180° wind shift cuts Route A",
  description:
    "Operations run against a single primary highway, East Ridge Road. At minute 4 a cold front snaps the wind 180° (NE 38° to SW 210°, gusting 35 kts); fire spots across the highway and Route A is compromised. TALON raises the reraise alarm, promotes Route B (Valley Ingress) and reprojects Scout-01's acoustic evacuation corridor in flight.",
  fuel_model: "FBFM5 Brush — Steep Slope",
  ambient_temp_f: 94,
  relative_humidity: 11,
  wind_vector_bearing: 38,
  wind_vector_speed_kts: 14,
  initial_coordinates: [34.245, -118.56],
  seed: 20260917,
  durationS: 300,
  beats: [
    { atS: 0, sceneHint: "baseline", thermalF: 94, confidence: 0, structures: 0, lidarEta: null },
    { atS: 8, sceneHint: "alert-command", thermalF: 233, confidence: 44, structures: 0, lidarEta: null },
    { atS: 20, sceneHint: "investigation-pending", thermalF: 372, confidence: 58, structures: 0, lidarEta: 12 },
    { atS: 34, sceneHint: "verify-active", thermalF: 610, confidence: 70, structures: 0, lidarEta: 0 },
    { atS: 48, sceneHint: "authority-notification-ready", thermalF: 720, confidence: 74, structures: 0, lidarEta: 0 },
    { atS: 62, sceneHint: "contain-recommended", thermalF: 706, confidence: 74, structures: 0, lidarEta: 0 },
    { atS: 120, sceneHint: "contain-recommended", thermalF: 688, confidence: 75, structures: 6, lidarEta: 0 },
    { atS: 180, sceneHint: "talon-reraise", thermalF: 671, confidence: 72, structures: 10, lidarEta: 0 },
    { atS: 240, sceneHint: "talon-reraise", thermalF: 934, confidence: 79, structures: 10, lidarEta: 0, windBearing: 210, windSpeedKts: 35 },
    { atS: 255, sceneHint: "contain-alternate", thermalF: 902, confidence: 81, structures: 22, lidarEta: 0, windBearing: 210, windSpeedKts: 35 },
    { atS: 270, sceneHint: "contain-alternate", thermalF: 866, confidence: 81, structures: 34, lidarEta: 0, windBearing: 210, windSpeedKts: 32 },
    { atS: 300, sceneHint: "rescue-partial-evac", thermalF: 812, confidence: 83, structures: 41, lidarEta: 0, windBearing: 208, windSpeedKts: 29 },
  ],
  zones: [
    { id: "ROUTE-A", label: "Route A (East Ridge Road)", state: "blocked", note: "Spot fire crosses the highway at T+240s" },
    { id: "ROUTE-B", label: "Route B (Valley Ingress)", state: "watch", note: "Promoted primary corridor" },
    { id: "GULCH-FLOOR", label: "Gulch floor", state: "critical" },
    { id: "EAST-RIDGE", label: "East Ridge slope", state: "warning" },
  ],
  drones: [
    { id: "Scout-01", role: "acoustic", lat: 34.2462, lng: -118.5588, altM: 80, state: "onsite", batteryPct: 72 },
    { id: "Lidar-02", role: "lidar", lat: 34.2431, lng: -118.5652, altM: 130, state: "transit", batteryPct: 84 },
  ],
  decisionPoints: [
    { atS: 20, actionId: "dispatch-scout", gate: "confirm", prompt: "Dispatch Lidar-02 into the gulch.", options: ["Dispatch", "Hold"] },
    { atS: 62, actionId: "authorize-containment", gate: "human-approval", prompt: "Authorize initial containment along East Ridge Road.", options: ["Authorize", "Decline"] },
    { atS: 240, actionId: "operator.authorize-route-b", gate: "none", prompt: "Route A is compromised — promote Route B (Valley Ingress) and reproject sirens.", options: ["Promote Route B"] },
  ],
};

export const SCENARIO_4: ScenarioDefinition = {
  id: "S-04",
  code_name: "Data Fog",
  label: "Data Fog (Degraded Reality)",
  title: "Pyrocumulus smoke — downlink loss and 420ms RF latency",
  description:
    "The geostationary satellite downlink drops and repeaters run 420ms latency with 48% packet loss under dense pyrocumulus smoke. TALON refuses to claim high confidence and blocks the authority packet pending secondary corroboration, forcing the operator to deploy Scout-03 for local optical confirmation. Confidence stays honestly capped the entire run.",
  fuel_model: "FBFM8 Timber Litter",
  ambient_temp_f: 91,
  relative_humidity: 9,
  wind_vector_bearing: 265,
  wind_vector_speed_kts: 18,
  initial_coordinates: [40.812, -121.54],
  seed: 20260918,
  durationS: 240,
  beats: [
    { atS: 0, sceneHint: "baseline", thermalF: 91, confidence: 0, structures: 0, lidarEta: null },
    { atS: 8, sceneHint: "alert-command", thermalF: 188, confidence: 22, structures: 0, lidarEta: null },
    { atS: 20, sceneHint: "investigation-pending", thermalF: 355, confidence: 38, structures: 0, lidarEta: null },
    { atS: 34, sceneHint: "satellite-feed-loss", thermalF: 402, confidence: 44, structures: 0, lidarEta: null },
    { atS: 48, sceneHint: "network-degraded", thermalF: 431, confidence: 47, structures: 0, lidarEta: null },
    { atS: 62, sceneHint: "verify-source-conflict", thermalF: 448, confidence: 46, structures: 0, lidarEta: null },
    { atS: 90, sceneHint: "verify-source-conflict", thermalF: 466, confidence: 44, structures: 0, lidarEta: 26 },
    { atS: 120, sceneHint: "verify-source-conflict", thermalF: 489, confidence: 58, structures: 0, lidarEta: 0 },
    { atS: 150, sceneHint: "contain-degraded", thermalF: 471, confidence: 63, structures: 8, lidarEta: 0 },
    { atS: 180, sceneHint: "contain-degraded", thermalF: 455, confidence: 66, structures: 14, lidarEta: 0 },
    { atS: 240, sceneHint: "rescue-signal-degraded", thermalF: 430, confidence: 64, structures: 19, lidarEta: 0 },
  ],
  zones: [
    { id: "SATELLITE-DOWNLINK", label: "Geostationary downlink", state: "blocked", note: "Feed lost at T+34s" },
    { id: "RF-MESH", label: "RF repeater mesh", state: "warning", note: "420ms latency / 48% packet loss" },
    { id: "SMOKE-COVER", label: "Pyrocumulus smoke column", state: "warning", note: "Visual corroboration obscured" },
    { id: "PERIMETER", label: "Incident perimeter", state: "watch" },
  ],
  drones: [
    { id: "Scout-01", role: "scout", lat: 40.8131, lng: -121.5418, altM: 100, state: "onsite", batteryPct: 77 },
    { id: "Scout-03", role: "scout", lat: 40.8104, lng: -121.5385, altM: 60, state: "transit", batteryPct: 100 },
  ],
  decisionPoints: [
    { atS: 34, actionId: "open-degraded", gate: "none", prompt: "Open the degraded-reality console and surface the caveats.", options: ["Open degraded view"] },
    { atS: 62, actionId: "deploy-backup", gate: "confirm", prompt: "Authority packet blocked: lacks secondary corroboration. Deploy Scout-03?", options: ["Deploy Scout-03", "Accept risk without corroboration"] },
    { atS: 150, actionId: "authorize-containment", gate: "human-approval", prompt: "Authorize containment on locally corroborated evidence.", options: ["Authorize", "Hold"] },
  ],
};

export const SCENARIO_5: ScenarioDefinition = {
  id: "S-05",
  code_name: "Night Rescue",
  label: "Night Rescue (Infrared & Battery)",
  title: "Low-visibility night operations — Scout-01 battery at 14%",
  description:
    "Diegetic LWIR night operations: terrain renders in basalt tones and heat signatures glow white-hot. Scout-01 hits 14% battery while guiding civilians on Route A; TALON stages the intercept waypoint and Scout-03 launches from Nest 2. The operator makes a single affirmation and the handover completes with zero coverage drop.",
  fuel_model: "FBFM4 High Chaparral",
  ambient_temp_f: 62,
  relative_humidity: 41,
  wind_vector_bearing: 21,
  wind_vector_speed_kts: 9,
  initial_coordinates: [34.108, -118.742],
  seed: 20260919,
  durationS: 180,
  beats: [
    { atS: 0, sceneHint: "baseline", thermalF: 62, confidence: 0, structures: 0, lidarEta: null },
    { atS: 8, sceneHint: "alert-command", thermalF: 176, confidence: 39, structures: 0, lidarEta: null },
    { atS: 20, sceneHint: "investigation-pending", thermalF: 288, confidence: 53, structures: 0, lidarEta: 16 },
    { atS: 34, sceneHint: "verify-active", thermalF: 431, confidence: 66, structures: 0, lidarEta: 0 },
    { atS: 48, sceneHint: "authority-notification-ready", thermalF: 455, confidence: 70, structures: 0, lidarEta: 0 },
    { atS: 62, sceneHint: "contain-recommended", thermalF: 448, confidence: 71, structures: 0, lidarEta: 0 },
    { atS: 90, sceneHint: "rescue-battery-critical", thermalF: 430, confidence: 72, structures: 9, lidarEta: 0 },
    { atS: 120, sceneHint: "handoff-pending", thermalF: 402, confidence: 74, structures: 15, lidarEta: 0 },
    { atS: 150, sceneHint: "rescue-nominal", thermalF: 366, confidence: 78, structures: 22, lidarEta: 0 },
    { atS: 180, sceneHint: "rescue-nominal", thermalF: 344, confidence: 80, structures: 26, lidarEta: 0 },
  ],
  zones: [
    { id: "NEST-2", label: "Nest 2 launch pad", state: "nominal", note: "Scout-03 staged" },
    { id: "ROUTE-A", label: "Route A evacuation corridor", state: "warning" },
    { id: "CIVILIAN-CLUSTER", label: "Civilian cluster (LWIR)", state: "critical" },
    { id: "NIGHT-PERIMETER", label: "Night perimeter", state: "watch" },
  ],
  drones: [
    { id: "Scout-01", role: "acoustic", lat: 34.1089, lng: -118.7408, altM: 70, state: "onsite", batteryPct: 14 },
    { id: "Scout-03", role: "scout", lat: 34.107, lng: -118.7442, altM: 60, state: "staged", batteryPct: 100 },
    { id: "Lidar-02", role: "lidar", lat: 34.1092, lng: -118.7441, altM: 120, state: "onsite", batteryPct: 63 },
  ],
  decisionPoints: [
    { atS: 90, actionId: "operator.acknowledge-handoff", gate: "none", prompt: "Scout-01 at 14% battery — acknowledge the autonomous handover to Scout-03.", options: ["Acknowledge handover"] },
    { atS: 120, actionId: "deploy-backup", gate: "confirm", prompt: "Launch Scout-03 from Nest 2 onto the intercept waypoint.", options: ["Launch Scout-03", "Hold"] },
  ],
};

export const SCENARIO_6: ScenarioDefinition = {
  id: "S-06",
  code_name: "Two Voices",
  label: "Two Voices (Operator Escalates)",
  title: "Fast flash fire — operator escalates past TALON's hold",
  description:
    "An anomaly is detected but convergence is only 42%. TALON's algorithm recommends holding 15 seconds for secondary scout confirmation. The operator spots heavy billowing smoke and forces immediate escalation; TALON complies instantly and attaches its formal objection to packet AUD-90-0847 rather than obstructing. Dissent direction B — operator escalates.",
  fuel_model: "FBFM3 Tall Grass",
  ambient_temp_f: 99,
  relative_humidity: 8,
  wind_vector_bearing: 47,
  wind_vector_speed_kts: 21,
  initial_coordinates: [38.442, -122.71],
  seed: 20260920,
  durationS: 90,
  beats: [
    { atS: 0, sceneHint: "baseline", thermalF: 99, confidence: 0, structures: 0, lidarEta: null },
    { atS: 8, sceneHint: "alert-command", thermalF: 268, confidence: 42, structures: 0, lidarEta: null },
    { atS: 20, sceneHint: "talon-reraise", thermalF: 512, confidence: 42, structures: 0, lidarEta: null },
    { atS: 34, sceneHint: "contain-recommended", thermalF: 806, confidence: 55, structures: 0, lidarEta: 0 },
    { atS: 48, sceneHint: "contain-awaiting-teams", thermalF: 884, confidence: 60, structures: 0, lidarEta: 0 },
    { atS: 62, sceneHint: "contain-awaiting-teams", thermalF: 912, confidence: 63, structures: 8, lidarEta: 0 },
    { atS: 76, sceneHint: "rescue-partial-evac", thermalF: 866, confidence: 68, structures: 21, lidarEta: 0 },
    { atS: 90, sceneHint: "rescue-partial-evac", thermalF: 823, confidence: 71, structures: 29, lidarEta: 0 },
  ],
  zones: [
    { id: "GRASS-FLAT", label: "Tall-grass flat", state: "critical", note: "Fast-running surface fire" },
    { id: "STRUCTURE-BELT", label: "Structure belt", state: "warning" },
    { id: "FIREBREAK-9", label: "Firebreak 9", state: "watch" },
  ],
  drones: [
    { id: "Scout-01", role: "scout", lat: 38.4431, lng: -122.7088, altM: 95, state: "transit", batteryPct: 82 },
  ],
  decisionPoints: [
    { atS: 20, actionId: "operator.voice-override", gate: "none", prompt: "TALON advises holding 15s at 42% convergence. Escalate immediately?", options: ["Escalate now (record objection)", "Hold 15s"] },
    { atS: 34, actionId: "authorize-containment", gate: "human-approval", prompt: "Authorize containment with the objection attached to AUD-90-0847.", options: ["Authorize", "Decline"] },
  ],
};

/** The full authored catalog, in scenario order. */
export const SCENARIOS: ScenarioDefinition[] = [
  SCENARIO_1,
  SCENARIO_2,
  SCENARIO_3,
  SCENARIO_4,
  SCENARIO_5,
  SCENARIO_6,
];

/** Look up a scenario definition by id (e.g. "S-03"). */
export function getScenario(id: string | undefined | null): ScenarioDefinition | undefined {
  if (!id) return undefined;
  return SCENARIOS.find((s) => s.id === id);
}
