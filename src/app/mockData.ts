import type {
  ActivityLogEntry,
  ContainmentPlanSummary,
  DroneMissionType,
  DroneRosterEntry,
  FocusedIncidentDetail,
  FocusedIncidentQueueItem,
  GroundTeamStatus,
  OverrideReason,
  PlanVariant,
  RescueProgress,
  SceneId,
  ZoneOpState,
} from "./tokens";
import { T } from "./tokens";

export interface ZoneData {
  id: string;
  label: string;
  shortLabel: string;
  category: "forest" | "buffer" | "residential";
  boundaryColor: string;
  polygon: string;
  center: { x: number; y: number };
  risk: string;
  spreadWindow: string;
  terrain: string;
  structures: string;
  note: string;
  /** 1–3 word chip values — the full sentences above render as detail lines, never inside chips. */
  riskShort: string;
  spreadShort: string;
  terrainShort: string;
  structuresShort: string;
}

export interface IncidentMarker {
  id: string;
  label: string;
  x: number;
  y: number;
  confidence: number;
  location: string;
  note: string;
  zoneId: string;
}

export interface SpreadRing {
  label: string;
  minutes: number;
  radius: number;
  color: string;
  dash: string;
  /**
   * Age of this projection's basis, mm:ss since it was computed (G-08 honesty
   * law: stale data must read stale). The 60-min ring is computed first, so it
   * carries the oldest basis.
   */
  age: string;
}

export interface AirspaceTraffic {
  id: string;
  callsign: string;
  x: number;
  y: number;
  /** Track in degrees, drawn as a short course vector (0 = north). */
  headingDeg: number;
}

export interface AirspaceModel {
  /** Incident geofence / TFR as a native-pixel polygon (same law as ZONES). */
  geofence: string;
  commsRing: { x: number; y: number; radius: number; label: string };
  traffic: AirspaceTraffic[];
}

export interface RoutePath {
  id: string;
  label: string;
  color: string;
  path: string;
  textX: number;
  textY: number;
}

export interface MissionAnchor {
  x: number;
  y: number;
  route: string;
}

export const REVIEW_SCENES: Array<{ id: SceneId; label: string; note: string }> = [
  { id: "baseline", label: "Intelligence: Quiet Watch", note: "Passive data monitoring before an incident." },
  { id: "alert-command", label: "Intelligence: Anomaly Alert", note: "Initial TALON interrupt for scout verification." },
  { id: "investigation-pending", label: "Intelligence: Scout En Route", note: "Lidar-02 moving toward Grid 4C." },
  { id: "verify-active", label: "Intelligence: Operator Review", note: "Operator assessing TALON-corroborated data." },
  { id: "authority-notification-ready", label: "Intelligence: Authority Packet", note: "90-second milestone ready for human send." },
  { id: "contain-recommended", label: "Operations: Plan Staging", note: "Post-notification containment plan." },
  { id: "contain-alternate", label: "Operations: Recomputed Plan", note: "Operator override plan for review." },
  { id: "contain-degraded", label: "Operations: Degraded Terrain", note: "Terrain-model fallback view." },
  { id: "rescue-nominal", label: "Operations: Active Rescue", note: "Authorized operations nominal." },
  { id: "rescue-signal-degraded", label: "Operations: Signal Exception", note: "Signal exception while rescue continues." },
  // Human/AI Disagreement Scenes
  { id: "monitoring-contested", label: "Disagreement: Contested Watch", note: "Operator overruled TALON; the hypothesis stays open at reduced weight." },
  { id: "talon-reraise", label: "Disagreement: TALON Appeals", note: "New evidence crossed the raised bar; routed to a second authority." },
  // Edge Case / Failure Scenes
  { id: "rescue-battery-critical", label: "Operations: Battery Critical", note: "Drone at 14%; TALON preparing a supervised handoff." },
  { id: "satellite-feed-loss", label: "Failure: Satellite Loss", note: "Aerial intelligence offline, drone-only telemetry." },
  { id: "infrastructure-total-loss", label: "Failure: Infrastructure Loss", note: "Total system breakdown; operator manual protocol." },
  { id: "network-degraded", label: "Failure: Network Degraded", note: "High latency across all feeds; 340ms average." },
  // Promoted states (vault 03 §2, plan Phase 3)
  { id: "verify-source-conflict", label: "Intelligence: Source Conflict", note: "Satellite and ag-burn records disagree; verification paused." },
  { id: "contain-awaiting-teams", label: "Operations: Awaiting Teams", note: "Packet delivered; holding for run-card crews to stage." },
  { id: "rescue-partial-evac", label: "Operations: Partial Evacuation", note: "Route A blocked by smoke; Route B shift staged." },
  { id: "handoff-pending", label: "Operations: Handover Open", note: "Shift change initiated; authority unassigned until PIN." },
];

export const INCIDENT: FocusedIncidentDetail = {
  id: "INC-2024-0847",
  location: "Grid 4C · Forest ridge",
  coords: "37.8821°N, 122.4194°W",
  detectedAt: "03:47:03 UTC",
  operator: "A. Rao",
  aiConfidence: 78,
  windVector: "NE 38° · 18 mph",
  fireBehavior: "Vegetation fire with upslope acceleration across the ridge line into the residential grid.",
  estimatedFootprint: "~0.4 hectares",
  spreadRate: "0.8 km² / hr",
  structuresAtRisk: 47,
  evacuationScope: 47,
  activeZoneId: "forest-north",
};

/**
 * Only the selected incident carries full operational context. The other
 * entries are intentionally read-only summaries and do not own scene state,
 * simulations, routes, resources, or executable commands.
 */
export const FOCUSED_INCIDENT_QUEUE: FocusedIncidentQueueItem[] = [
  {
    kind: "active",
    readOnly: false,
    id: INCIDENT.id,
    label: "Grid 4C ridge fire",
    location: INCIDENT.location,
    status: "confirmed",
    severity: "danger",
    lastUpdated: "03:49:07 UTC",
    detail: INCIDENT,
  },
  {
    kind: "summary",
    readOnly: true,
    independentSimulation: false,
    id: "INC-2024-0846",
    label: "Reservoir access smoke report",
    location: "Sector 2A · Reservoir road",
    status: "monitoring",
    severity: "caution",
    lastUpdated: "03:42:18 UTC",
    summary: "Single field report is awaiting a corroborating sensor source. No operational scene is loaded.",
    dataFreshness: "Operator note · 7 min old",
  },
  {
    kind: "summary",
    readOnly: true,
    independentSimulation: false,
    id: "INC-2024-0845",
    label: "West buffer thermal transient",
    location: "Buffer Zone 2 · Utility corridor",
    status: "investigating",
    severity: "info",
    lastUpdated: "03:39:44 UTC",
    summary: "Thermal transient remains below escalation threshold. This queue entry exposes summary metadata only.",
    dataFreshness: "Thermal grid · 10 min old",
  },
];

export const ANOMALY: IncidentMarker = {
  id: "grid-4c",
  label: "Thermal spike · Grid 4C",
  x: 1044,
  y: 332,
  confidence: 40,
  location: "Grid 4C · Forest ridge",
  note: "TALON flags this ridge band as high risk due to burn memory, wind corridor, and the current thermal delta.",
  zoneId: "forest-north",
};

export const ZONES: ZoneData[] = [
  {
    id: "forest-north",
    label: "Forest Zone",
    shortLabel: "Forest Zone",
    category: "forest",
    boundaryColor: "#FF6B4A",
    polygon:
      "648,52 860,22 1072,18 1244,52 1326,100 1320,210 1250,314 1312,462 1188,574 970,524 860,400 784,454 694,430 592,368 562,274 586,160",
    center: { x: 756, y: 206 },
    risk: "Active fire spread is building across the ridge line and remains the origin threat for both residential grids.",
    spreadWindow: "15 min to the eastern and southern buffer lanes under current wind.",
    terrain: "Steep ridge with smoke pooling in the central fold and heavy vegetation across the upper slope.",
    structures: "No occupied residences inside the forest zone; this remains the source zone for all downstream risk.",
    note: "Primary fire zone. Thermal verification and perimeter coverage should anchor here first.",
    riskShort: "Spread origin",
    spreadShort: "15 min to buffers",
    terrainShort: "Steep ridge",
    structuresShort: "None occupied",
  },
  {
    id: "buffer-west",
    label: "Buffer Zone 2",
    shortLabel: "Buffer Zone 2",
    category: "buffer",
    boundaryColor: T.cyan,
    polygon: "0,78 124,64 220,86 336,70 522,92 580,208 476,308 302,332 108,286 0,304",
    center: { x: 184, y: 142 },
    risk: "This western buffer is a passive edge today, but it should remain clear for any alternate evacuation swing.",
    spreadWindow: "Low direct fire risk unless the ridge front wraps west.",
    terrain: "Low-density edge corridor with road access and intermittent tree cover.",
    structures: "Sparse structures only; mainly useful as a routing reserve.",
    note: "Secondary corridor kept clear in case the primary guidance routes need to widen.",
    riskShort: "Passive edge",
    spreadShort: "Low direct risk",
    terrainShort: "Road corridor",
    structuresShort: "Sparse",
  },
  {
    id: "buffer-east",
    label: "Buffer Zone 1",
    shortLabel: "Buffer Zone 1",
    category: "buffer",
    boundaryColor: T.cyan,
    polygon: "1332,84 1518,108 1696,84 1696,418 1580,396 1488,340 1398,298 1314,352 1282,250",
    center: { x: 1486, y: 154 },
    risk: "This is still the cleanest responder ingress edge and the best lane for relay coverage if the ridge pushes southeast.",
    spreadWindow: "30 min to road network if the spread line breaks the forest edge.",
    terrain: "Open service roads, shallow drainage cuts, and fewer vertical obstructions for relay coverage.",
    structures: "Minimal occupied structures; strongest corridor for comms and responder access.",
    note: "Primary ingress and relay corridor. Responder guidance should reference this zone.",
    riskShort: "Ingress lane",
    spreadShort: "30 min to roads",
    terrainShort: "Open roads",
    structuresShort: "Minimal",
  },
  {
    id: "residential-west",
    label: "Residential Zone 2",
    shortLabel: "Residential Zone 2",
    category: "residential",
    boundaryColor: "#E5533C",
    polygon: "0,456 186,474 298,504 418,542 548,598 618,736 0,770",
    center: { x: 332, y: 676 },
    risk: "This western residential block is exposed if the ridge front bends across the lower roads.",
    spreadWindow: "< 30 min if the southern edge is not contained.",
    terrain: "Dense residential grid with long street corridors and limited turnaround space.",
    structures: "Primary west-side residential cluster with multiple internal streets.",
    note: "Residential zone 2 should remain visible in the map even when the primary rescue focus is east.",
    riskShort: "Exposed west block",
    spreadShort: "< 30 min",
    terrainShort: "Dense grid",
    structuresShort: "West cluster",
  },
  {
    id: "residential-south",
    label: "Residential Zone 1",
    shortLabel: "Residential Zone 1",
    category: "residential",
    boundaryColor: "#E5533C",
    polygon: "828,540 1214,528 1680,686 1696,929 1058,929 832,790 746,640",
    center: { x: 1068, y: 760 },
    risk: "Highest human-consequence zone if spread projections hold.",
    spreadWindow: "< 30 min in current model.",
    terrain: "Dense residential grid, primary eastbound exit, and clearer guidance lane along the lower roads.",
    structures: "94 tracked structures; 47 remain inside the projected 30-minute path.",
    note: "Primary human consequence zone. Evacuation and route guidance should anchor here.",
    riskShort: "Highest human risk",
    spreadShort: "< 30 min",
    terrainShort: "Dense grid · east exit",
    structuresShort: "94 tracked · 47 at risk",
  },
];

export const SPREAD_RINGS: SpreadRing[] = [
  { label: "15 MIN", minutes: 15, radius: 118, color: T.red, dash: "8 6", age: "00:42" },
  { label: "30 MIN", minutes: 30, radius: 196, color: T.amber, dash: "8 6", age: "01:56" },
  { label: "60 MIN", minutes: 60, radius: 292, color: T.textMuted, dash: "6 7", age: "03:12" },
];

/*
 * L3 airspace (G-10) — the missing overlay layer. Authored fixture data in
 * native pixel space, same law as ZONES/roads: the geofence drapes with the
 * terrain, airborne traffic may cross the sky band.
 */
export const AIRSPACE: AirspaceModel = {
  geofence: "880,250 1130,205 1290,300 1265,445 1035,505 885,430",
  commsRing: { x: 530, y: 616, radius: 268, label: "C2 RELAY" },
  traffic: [
    { id: "adsb-tanker-94", callsign: "TANKER 94", x: 1320, y: 150, headingDeg: 235 },
    { id: "adsb-patrol-2", callsign: "PATROL 2", x: 480, y: 165, headingDeg: 65 },
    { id: "adsb-medevac-7", callsign: "MEDEVAC 7", x: 820, y: 120, headingDeg: 160 },
  ],
};

export const EVACUATION_ROUTES: RoutePath[] = [
  {
    id: "route-a",
    label: "GUIDED ROUTE A",
    color: "rgba(255,255,255,0.92)",
    path: "M 616,792 C 480,804 328,806 116,806",
    textX: 284,
    textY: 790,
  },
  {
    id: "route-b",
    label: "GUIDED ROUTE B",
    color: "rgba(255,255,255,0.92)",
    path: "M 1128,746 C 1198,766 1290,800 1396,844",
    textX: 1250,
    textY: 806,
  },
];

export const RESPONDER_ROUTE: RoutePath = {
  id: "responder-route",
  label: "RESPONDER INGRESS",
  color: T.cyan,
  path: "M 1120,612 C 1012,664 938,724 854,820 C 822,858 792,876 762,888",
  textX: 900,
  textY: 736,
};

export const MISSION_ANCHORS: Record<
  string,
  Partial<Record<DroneMissionType, MissionAnchor>>
> = {
  "forest-north": {
    "survey-zone": { x: 608, y: 302, route: "North ridge survey arc" },
    "perimeter-monitor": { x: 1085, y: 433, route: "Primary fire perimeter hold" },
    "relay-field-intel": { x: 953, y: 603, route: "Forest-to-residential relay handoff" },
  },
  "buffer-east": {
    "survey-zone": { x: 1188, y: 468, route: "Eastern corridor sweep" },
    "perimeter-monitor": { x: 1162, y: 388, route: "East buffer perimeter" },
    "guide-emergency-personnel": { x: 953, y: 603, route: "Primary responder ingress guidance" },
    "relay-field-intel": { x: 953, y: 603, route: "Command relay across the ingress edge" },
  },
  "residential-south": {
    "prepare-residential-evacuation": { x: 1377, y: 780, route: "Residential Zone 1 guidance hold" },
    "guide-emergency-personnel": { x: 1192, y: 708, route: "Residential responder ingress" },
    "relay-field-intel": { x: 1098, y: 636, route: "Residential edge relay" },
    "automatic-route": { x: 1304, y: 842, route: "Guided residential egress" },
    "backup-support": { x: 1218, y: 704, route: "Residential backup staging" },
  },
};

const BASE_DRONES: DroneRosterEntry[] = [
  {
    id: "scout-01",
    name: "Scout-01",
    droneClass: "surveillance",
    capabilityLabel: "Visual overwatch",
    role: "Forest ridge watch",
    status: "assigned",
    battery: 91,
    signal: 98,
    x: 608,
    y: 302,
    zoneId: "forest-north",
    route: "North ridge loop",
    gridLabel: "Feed 01",
    assignedMission: "patrol",
    altitudeM: 120,
    groundSpeedMps: 8.2,
    headingDeg: 94,
    lat: 34.0369,
    lon: -118.8241,
    note: "Primary visual overwatch drone.",
  },
  {
    id: "lidar-02",
    name: "Lidar-02",
    droneClass: "thermal-lidar",
    capabilityLabel: "Thermal + LiDAR",
    role: "Mapping & model build",
    status: "available",
    battery: 78,
    signal: 94,
    x: 1085,
    y: 433,
    zoneId: "forest-north",
    route: "Forest incident approach",
    gridLabel: "Feed 02",
    altitudeM: 0,
    groundSpeedMps: 0,
    headingDeg: 12,
    lat: 34.0328,
    lon: -118.8058,
    note: "High-fidelity mapping and incident verification drone.",
  },
  {
    id: "relay-01",
    name: "Relay-01",
    droneClass: "guidance-relay",
    capabilityLabel: "Comms relay",
    role: "Ground team connectivity",
    status: "holding",
    battery: 66,
    signal: 88,
    x: 537,
    y: 570,
    zoneId: "buffer-west",
    route: "West residential relay arc",
    gridLabel: "Feed 03",
    altitudeM: 140,
    groundSpeedMps: 0.3,
    headingDeg: 271,
    lat: 34.0284,
    lon: -118.8249,
    note: "Maintains connectivity for field response units.",
  },
  {
    id: "relay-02",
    name: "Relay-02",
    droneClass: "guidance-relay",
    capabilityLabel: "Comms relay",
    role: "Ground team connectivity",
    status: "holding",
    battery: 84,
    signal: 92,
    x: 953,
    y: 603,
    zoneId: "buffer-east",
    route: "Ingress relay corridor",
    gridLabel: "Feed 04",
    altitudeM: 138,
    groundSpeedMps: 0.4,
    headingDeg: 269,
    lat: 34.0273,
    lon: -118.814,
    note: "Tied to responder guidance and field team coverage.",
  },
  {
    id: "herald-01",
    name: "Herald-01",
    droneClass: "evacuation-guidance",
    capabilityLabel: "Instructional audio + light",
    role: "Evacuation guidance",
    status: "available",
    battery: 87,
    signal: 91,
    x: 1377,
    y: 780,
    zoneId: "residential-south",
    route: "Residential zone 1 guidance hold",
    gridLabel: "Feed 05",
    altitudeM: 45,
    groundSpeedMps: 6.8,
    headingDeg: 182,
    lat: 34.0217,
    lon: -118.7999,
    note: "Used for civilian instruction and route verification.",
  },
  {
    id: "vanguard-01",
    name: "Vanguard-01",
    droneClass: "multi-role",
    capabilityLabel: "Multi-role reserve",
    role: "Operational backup",
    status: "available",
    battery: 88,
    signal: 93,
    x: 1218,
    y: 704,
    zoneId: "residential-south",
    route: "Residential reserve lane",
    gridLabel: "Feed 06",
    altitudeM: 0,
    groundSpeedMps: 0,
    headingDeg: 0,
    lat: 34.0241,
    lon: -118.8061,
    note: "Fallback asset for rapid mission reassignment.",
  },
  {
    id: "scout-03",
    name: "Scout-03",
    droneClass: "surveillance",
    capabilityLabel: "Visual overwatch",
    role: "East boundary patrol",
    status: "available",
    battery: 81,
    signal: 89,
    x: 1350,
    y: 250,
    zoneId: "buffer-east",
    route: "Outer perimeter sweep",
    gridLabel: "Feed 07",
    altitudeM: 110,
    groundSpeedMps: 9.4,
    headingDeg: 355,
    lat: 34.0386,
    lon: -118.801,
    note: "Ambient surveillance on the eastern edge.",
  },
  {
    id: "relay-03",
    name: "Relay-03",
    droneClass: "guidance-relay",
    capabilityLabel: "Comms relay",
    role: "Deep buffer relay",
    status: "holding",
    battery: 92,
    signal: 95,
    x: 1450,
    y: 490,
    zoneId: "buffer-east",
    route: "Deep signal anchor",
    gridLabel: "Feed 08",
    altitudeM: 142,
    groundSpeedMps: 0.3,
    headingDeg: 268,
    lat: 34.0309,
    lon: -118.7972,
    note: "Background relay for extreme edge connectivity.",
  },
  {
    id: "herald-02",
    name: "Herald-02",
    droneClass: "evacuation-guidance",
    capabilityLabel: "Instructional audio + light",
    role: "Evacuation backup",
    status: "available",
    battery: 96,
    signal: 97,
    x: 1050,
    y: 830,
    zoneId: "residential-south",
    route: "Southern staging",
    gridLabel: "Feed 09",
    altitudeM: 0,
    groundSpeedMps: 0,
    headingDeg: 0,
    lat: 34.0189,
    lon: -118.8127,
    note: "Ambient backup staged near residential route origins.",
  },
  {
    id: "vanguard-02",
    name: "Vanguard-02",
    droneClass: "multi-role",
    capabilityLabel: "Multi-role reserve",
    role: "Command standoff",
    status: "available",
    battery: 89,
    signal: 88,
    x: 650,
    y: 690,
    zoneId: "buffer-west",
    route: "Central standoff hold",
    gridLabel: "Feed 10",
    altitudeM: 90,
    groundSpeedMps: 0.2,
    headingDeg: 15,
    lat: 34.0262,
    lon: -118.8225,
    note: "Holding aloft above central command for quick dispatch.",
  },
];

const BASE_TEAMS: GroundTeamStatus[] = [
  {
    id: "alpha",
    name: "Alpha Lead",
    unitType: "Fire perimeter team",
    readiness: "Ready now",
    assignment: "Perimeter control",
    eta: "04 min",
    linkedZoneId: "buffer-east",
    availability: "staged",
    vitals: "HR 98 · VIS 250m",
    x: 530,
    y: 616,
  },
  {
    id: "bravo",
    name: "Bravo Team",
    unitType: "Structure protection",
    readiness: "On scene",
    assignment: "Residential edge",
    eta: "On site",
    linkedZoneId: "residential-south",
    availability: "deployed",
    vitals: "HR 165 · VIS 5m",
    x: 950,
    y: 640,
  },
  {
    id: "charlie",
    name: "Charlie Unit",
    unitType: "Medical + evac support",
    readiness: "Standby",
    assignment: "Staging lane",
    eta: "06 min",
    linkedZoneId: "buffer-east",
    availability: "available",
    vitals: "HR 112 · VIS 120m",
    x: 1188,
    y: 468,
  },
];

const BASE_RESCUE_PROGRESS: RescueProgress = {
  cleared: 12,
  total: 47,
  routeA: "Active",
  routeB: "Standby",
  fireDeptEta: "06 min",
};

export const OVERRIDE_REASONS: OverrideReason[] = [
  "False positive",
  "Incomplete data",
  "Operational constraint",
  "Other",
];

export const CONTAINMENT_PLAN_SUMMARY: Record<PlanVariant, ContainmentPlanSummary> = {
  recommended: {
    title: "Recommended contain response",
    sentence: "Expand aerial coverage, stage responder guidance, and prepare residential evacuation before authorizing the full protection plan.",
    reasoning:
      "The recommended sequence balances perimeter truth, responder ingress safety, and residential readiness without overcommitting early assets.",
    spreadRate: "0.8 km² / hr",
    wind: "NE · 18 mph",
    structuresAtRisk: "47 inside 30 min path",
    spread: {
      baselineRate: "0.8 km² / hr",
      projectedResidualRate: "0.3 km² / hr after perimeter staging",
      direction: "NE ridge front, checked before the eastern road edge",
      uncertaintyMarginMeters: 110,
    },
    exposure: {
      structuresInPath: 47,
      structuresAtResidualRisk: 8,
      affectedZoneIds: ["forest-north", "buffer-east", "residential-south"],
      routeExposure: "Responder ingress remains open; residential Route A is staged before the 15-minute decision point.",
    },
    protectedStructures: {
      structuresCovered: 39,
      coveragePercent: 83,
      protectionWindow: "Coverage in place within 12 min",
    },
    resourceCost: {
      dronesCommitted: 4,
      groundTeamsCommitted: 2,
      reserveImpact: "Six drones and the Charlie medical unit remain uncommitted.",
      tradeoff: "Higher initial asset use buys earlier residential coverage and a verified responder corridor.",
    },
    confidence: {
      score: 82,
      level: "high",
      basis: ["Thermal and satellite alignment", "LiDAR ridge model", "Current east-corridor road telemetry"],
      constraints: ["Fuel survey is 48h stale", "Fine visual detail is smoke-obscured"],
    },
    eta: {
      stagingMinutes: 6,
      protectionReadyMinutes: 12,
      label: "Stage 6 min · protection ready 12 min",
    },
  },
  alternate: {
    title: "Alternate contain response",
    sentence: "Shift one drone east into the buffer corridor and delay residential route guidance until terrain confidence stabilizes.",
    reasoning:
      "This protects the east corridor first, accepts slower residential staging, and is appropriate when the terrain model is incomplete or ingress conditions are changing.",
    spreadRate: "0.8 km² / hr",
    wind: "NE · 18 mph",
    structuresAtRisk: "47 inside 30 min path",
    spread: {
      baselineRate: "0.8 km² / hr",
      projectedResidualRate: "0.5 km² / hr while terrain confidence recovers",
      direction: "NE ridge front, with a wider eastern uncertainty envelope",
      uncertaintyMarginMeters: 180,
    },
    exposure: {
      structuresInPath: 47,
      structuresAtResidualRisk: 16,
      affectedZoneIds: ["forest-north", "buffer-east", "residential-south"],
      routeExposure: "East responder ingress is prioritized, but residential Route A guidance begins about 7 min later.",
    },
    protectedStructures: {
      structuresCovered: 31,
      coveragePercent: 66,
      protectionWindow: "Coverage in place within 19 min",
    },
    resourceCost: {
      dronesCommitted: 3,
      groundTeamsCommitted: 1,
      reserveImpact: "Seven drones and two ground units remain uncommitted.",
      tradeoff: "Lower initial commitment preserves reserve capacity but leaves more structures exposed during staging.",
    },
    confidence: {
      score: 68,
      level: "moderate",
      basis: ["Thermal alignment", "Partial LiDAR ridge model", "East-corridor road telemetry"],
      constraints: ["Terrain mesh is incomplete", "Delayed residential guidance increases residual exposure"],
    },
    eta: {
      stagingMinutes: 8,
      protectionReadyMinutes: 19,
      label: "Stage 8 min · protection ready 19 min",
    },
  },
};

export const TERRAIN_MODEL_STATUS = {
  confidenceLowLabel: "Terrain model confidence low",
  confidenceLowMessage: "LiDAR reconstruction is incomplete. Use the fallback feed to compare raw evidence while continuing containment review.",
  rawFeedTitle: "Raw drone feed fallback",
  rawFeedBody: "Smoke-obscured visual plus thermal contrast. This stays secondary to the spatial model unless confidence drops.",
  rawFeedMeta: "Scout-02 · 24 fps · 03:48:14 UTC",
};

export const RESCUE_AUDIT_RECEIPT = "RESCUE AUTHORIZED · 03:48:51 UTC · A. RAO";

export const RESCUE_STRUCTURES = [
  { id: "s1", x: 514, y: 620, cleared: true },
  { id: "s2", x: 582, y: 620, cleared: false },
  { id: "s3", x: 648, y: 620, cleared: true },
  { id: "s4", x: 714, y: 620, cleared: false },
  { id: "s5", x: 782, y: 620, cleared: false },
  { id: "s6", x: 850, y: 620, cleared: true },
  { id: "s7", x: 916, y: 620, cleared: false },
  { id: "s8", x: 982, y: 620, cleared: true },
  { id: "s9", x: 548, y: 692, cleared: true },
  { id: "s10", x: 618, y: 692, cleared: false },
  { id: "s11", x: 688, y: 692, cleared: true },
  { id: "s12", x: 758, y: 692, cleared: false },
  { id: "s13", x: 828, y: 692, cleared: false },
  { id: "s14", x: 898, y: 692, cleared: true },
];

export const SYSTEM_HEALTH = [
  { label: "Sensor grid", value: "22 / 22", sub: "online" },
  { label: "Patrol coverage", value: "68%", sub: "active" },
  { label: "Wind vector", value: "NE 38°", sub: "18 mph" },
  { label: "Road telemetry", value: "2 exits", sub: "clear" },
];

export const BASELINE_NOTES = [
  "TALON triage runs silently until corroboration crosses the alert threshold.",
  "Zone selection routes all spatial detail into the left-side intelligence rail.",
  "The map is the dominant surface once the incident is confirmed and protection begins.",
];

export function createDroneRoster(): DroneRosterEntry[] {
  return BASE_DRONES.map((drone) => ({ ...drone }));
}

export function createGroundTeams(): GroundTeamStatus[] {
  return BASE_TEAMS.map((team) => ({ ...team }));
}

export function createRescueProgress(): RescueProgress {
  return { ...BASE_RESCUE_PROGRESS };
}

export function getZoneById(zoneId: string | null | undefined) {
  return ZONES.find((zone) => zone.id === zoneId) ?? null;
}

export function getZoneLabel(zoneId: string | null | undefined) {
  return getZoneById(zoneId)?.shortLabel ?? "Unassigned zone";
}

export function getIncidentQueueItem(incidentId: string | null | undefined) {
  return FOCUSED_INCIDENT_QUEUE.find((incident) => incident.id === incidentId) ?? null;
}

export function getActiveIncidentQueueItem() {
  return FOCUSED_INCIDENT_QUEUE.find((incident) => incident.kind === "active") ?? null;
}

export function getContainmentPlan(variant: PlanVariant): ContainmentPlanSummary {
  return CONTAINMENT_PLAN_SUMMARY[variant];
}

export function compareContainmentPlans(
  primary: PlanVariant,
  comparison: PlanVariant,
) {
  const primaryPlan = getContainmentPlan(primary);
  const comparisonPlan = getContainmentPlan(comparison);

  return {
    protectedStructuresDelta:
      primaryPlan.protectedStructures.structuresCovered -
      comparisonPlan.protectedStructures.structuresCovered,
    residualExposureDelta:
      primaryPlan.exposure.structuresAtResidualRisk -
      comparisonPlan.exposure.structuresAtResidualRisk,
    dronesCommittedDelta:
      primaryPlan.resourceCost.dronesCommitted -
      comparisonPlan.resourceCost.dronesCommitted,
    groundTeamsCommittedDelta:
      primaryPlan.resourceCost.groundTeamsCommitted -
      comparisonPlan.resourceCost.groundTeamsCommitted,
    confidenceDelta:
      primaryPlan.confidence.score - comparisonPlan.confidence.score,
    protectionReadyMinutesDelta:
      primaryPlan.eta.protectionReadyMinutes -
      comparisonPlan.eta.protectionReadyMinutes,
  };
}

export function createActivityLog(scene: SceneId): ActivityLogEntry[] {
  const baseline: ActivityLogEntry[] = [
    {
      id: "log-00",
      ts: "03:44:12",
      actor: "System",
      type: "Patrol",
      text: "Patrol loop synchronized across all active zones.",
      severity: "info",
    },
    {
      id: "log-01",
      ts: "03:43:48",
      actor: "TALON",
      type: "Telemetry",
      text: "Residential telemetry check complete with both primary exits clear.",
      severity: "safe",
    },
    {
      id: "log-02",
      ts: "03:41:06",
      actor: "System",
      type: "Archive",
      text: "Reservoir route scan archived for trend comparison.",
      severity: "info",
    },
  ];

  if (scene === "baseline") {
    return baseline;
  }

  const alertStack: ActivityLogEntry[] = [
    {
      id: "log-10",
      ts: "03:47:18",
      actor: "TALON",
      type: "Corroboration",
      text: "Thermal sensor and satellite IR aligned over Grid 4C; risk threshold crossed.",
      severity: "caution",
    },
    {
      id: "log-11",
      ts: "03:47:45",
      actor: "TALON",
      type: "Dispatch",
      text: "Scout-02 launched from northeast dock for visual and LiDAR verification.",
      severity: "info",
    },
    ...baseline,
  ];

  if (scene === "alert-command") {
    return [
      {
        id: "log-09",
        ts: "03:47:45",
        actor: "System",
        type: "Interrupt",
        text: "Operator alerted with thermal spike command prompt.",
        severity: "caution",
      },
      ...alertStack,
    ];
  }

  if (scene === "investigation-pending" || scene === "verify-active") {
    return [
      {
        id: "log-12",
        ts: "03:48:12",
        actor: "TALON",
        type: "On site",
        text: "Scout-02 reached the incident area and began thermal plus HD visual capture.",
        severity: "info",
      },
      {
        id: "log-13",
        ts: "03:48:14",
        actor: "TALON",
        type: "Model",
        text: "Spatial reconstruction built from LiDAR and matched against topographic data.",
        severity: "info",
      },
      {
        id: "log-14",
        ts: "03:48:18",
        actor: "System",
        type: "Assessment",
        text: "Incident ready for operator verification with confidence rising toward 78%.",
        severity: "caution",
      },
      ...alertStack,
    ];
  }

  if (scene === "contain-recommended" || scene === "contain-alternate" || scene === "contain-degraded") {
    return [
      {
        id: "log-20",
        ts: "03:48:22",
        actor: "Operator",
        type: "Escalation",
        text: "Active incident confirmed. The shell shifted from verification into protection planning.",
        severity: "caution",
      },
      {
        id: "log-21",
        ts: "03:48:24",
        actor: "TALON",
        type: "Plan",
        text: "Containment plan generated with coverage expansion, responder guidance, and residential staging recommendations.",
        severity: "info",
      },
      ...createActivityLog("verify-active"),
    ];
  }

  return [
    {
      id: "log-30",
      ts: "03:48:51",
      actor: "Operator",
      type: "Authorization",
      text: "Containment authorized. Rescue supervision phase is now live.",
      severity: "caution",
    },
    {
      id: "log-31",
      ts: "03:49:05",
      actor: "TALON",
      type: "Notification",
      text: "Evacuation alerts transmitted to 47 households inside the projected path.",
      severity: "info",
    },
    {
      id: "log-32",
      ts: "03:49:07",
      actor: "System",
      type: "Execution",
      text: "Live operations active across route guidance, field intel relay, and ingress support.",
      severity: "info",
    },
    ...createActivityLog("contain-recommended"),
  ];
}


/*
 * ─── Panels-charter data (sentinel-core/07) ─────────────────────────────────
 * Weather (L4), incident airspace (geofence/TFR), per-zone operational states,
 * and the projection-basis age. Scripted values; live frames override wind.
 */
export const WEATHER = {
  observedAt: "03:47:03 UTC",
  windBearing: 38,
  windSpeedKts: 16,
  windGustKts: 24,
  tempF: 84,
  rh: 22,
  fuelModel: "G-29 · chaparral",
  haines: 5,
  source: "scripted",
};


/** The spread projection was generated when verification converged. */
export const PROJECTION_GENERATED_AT_S = 45;

type ZoneOpEntry = { state: ZoneOpState; evac: 'GO' | 'WATCH' | 'CLEAR' | null; timeToImpact?: string };
const ZONE_OP_STATES: Record<string, Record<string, ZoneOpEntry>> = {
  "alert-command": { "forest-north": { state: "watch", evac: null }, "residential-south": { state: "watch", evac: "WATCH" }, "residential-west": { state: "nominal", evac: "WATCH" } },
  "investigation-pending": { "forest-north": { state: "warning", evac: null }, "buffer-west": { state: "watch", evac: null }, "buffer-east": { state: "watch", evac: null }, "residential-south": { state: "watch", evac: "WATCH", timeToImpact: "31 min" }, "residential-west": { state: "nominal", evac: "WATCH", timeToImpact: "38 min" } },
  "verify-active": { "forest-north": { state: "warning", evac: null }, "buffer-west": { state: "watch", evac: null }, "buffer-east": { state: "watch", evac: null }, "residential-south": { state: "watch", evac: "WATCH", timeToImpact: "26 min" }, "residential-west": { state: "nominal", evac: "WATCH" } },
  "verify-source-conflict": { "forest-north": { state: "warning", evac: null }, "residential-south": { state: "watch", evac: "WATCH" }, "residential-west": { state: "nominal", evac: "WATCH" } },
  "authority-notification-ready": { "forest-north": { state: "critical", evac: null }, "buffer-west": { state: "warning", evac: null }, "buffer-east": { state: "warning", evac: null }, "residential-south": { state: "warning", evac: "WATCH", timeToImpact: "19 min" }, "residential-west": { state: "watch", evac: "WATCH", timeToImpact: "26 min" } },
  "contain-recommended": { "forest-north": { state: "critical", evac: null }, "buffer-west": { state: "warning", evac: null }, "buffer-east": { state: "warning", evac: null }, "residential-south": { state: "warning", evac: "WATCH", timeToImpact: "14 min" }, "residential-west": { state: "watch", evac: "WATCH", timeToImpact: "21 min" } },
  "contain-alternate": { "forest-north": { state: "critical", evac: null }, "buffer-east": { state: "warning", evac: null }, "residential-south": { state: "warning", evac: "WATCH", timeToImpact: "12 min" }, "residential-west": { state: "watch", evac: "WATCH", timeToImpact: "24 min" } },
  "contain-degraded": { "forest-north": { state: "critical", evac: null }, "buffer-west": { state: "warning", evac: null }, "residential-south": { state: "warning", evac: "WATCH", timeToImpact: "16 min" }, "residential-west": { state: "watch", evac: "WATCH" } },
  "contain-awaiting-teams": { "forest-north": { state: "critical", evac: null }, "residential-south": { state: "warning", evac: "WATCH", timeToImpact: "11 min" }, "residential-west": { state: "watch", evac: "WATCH" } },
  "rescue-nominal": { "forest-north": { state: "critical", evac: null }, "residential-south": { state: "warning", evac: "GO", timeToImpact: "6 min" }, "residential-west": { state: "watch", evac: "GO", timeToImpact: "14 min" } },
  "rescue-partial-evac": { "forest-north": { state: "critical", evac: null }, "residential-south": { state: "critical", evac: "GO", timeToImpact: "4 min" }, "residential-west": { state: "warning", evac: "GO", timeToImpact: "12 min" } },
  "rescue-signal-degraded": { "residential-south": { state: "critical", evac: "GO", timeToImpact: "5 min" }, "residential-west": { state: "warning", evac: "GO" } },
  "rescue-battery-critical": { "residential-south": { state: "critical", evac: "GO", timeToImpact: "5 min" }, "residential-west": { state: "warning", evac: "GO" } },
  "handoff-pending": { "residential-south": { state: "critical", evac: "GO", timeToImpact: "6 min" }, "residential-west": { state: "warning", evac: "GO" } },
  "monitoring-contested": { "forest-north": { state: "watch", evac: null }, "residential-south": { state: "nominal", evac: "CLEAR" }, "residential-west": { state: "nominal", evac: "CLEAR" } },
  "talon-reraise": { "forest-north": { state: "warning", evac: null }, "residential-south": { state: "watch", evac: "WATCH" }, "residential-west": { state: "nominal", evac: "WATCH" } },
  "satellite-feed-loss": { "forest-north": { state: "critical", evac: null }, "residential-south": { state: "warning", evac: "WATCH", timeToImpact: "17 min" } },
  "network-degraded": { "forest-north": { state: "critical", evac: null }, "residential-south": { state: "warning", evac: "WATCH" } },
  "infrastructure-total-loss": { "forest-north": { state: "critical", evac: null }, "residential-south": { state: "warning", evac: "WATCH" } },
};

/** Per-zone operational + evacuation state for the current scene (panels-charter §6). */
export function getZoneOperationalStates(scene: SceneId): Record<string, { state: ZoneOpState; evac: 'GO' | 'WATCH' | 'CLEAR' | null; timeToImpact?: string }> {
  return ZONE_OP_STATES[scene] || {};
}
