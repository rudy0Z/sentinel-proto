import type {
  ActivityLogEntry,
  DroneMissionType,
  DroneRosterEntry,
  GroundTeamStatus,
  OverrideReason,
  PlanVariant,
  RescueProgress,
  SceneId,
} from "./tokens";

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
  { id: "baseline", label: "Baseline", note: "Calm monitoring environment." },
  { id: "alert-command", label: "Alert Command", note: "Initial TALON interrupt for dispatch." },
  { id: "investigation-pending", label: "Investigation Pending", note: "Scout-02 en route." },
  { id: "verify-ready", label: "Verify Ready", note: "Assessment interrupt ready." },
  { id: "verify-active", label: "Verify Active", note: "Operator assessing TALON-corroborated data." },
  { id: "contain-recommended", label: "Contain Recommended", note: "TALON-recommended containment plan." },
  { id: "contain-alternate", label: "Contain Alternate", note: "Override plan for review." },
  { id: "contain-degraded", label: "Contain Degraded", note: "Terrain-model fallback view." },
  { id: "rescue-nominal", label: "Rescue Nominal", note: "Authorized operations nominal." },
  { id: "rescue-signal-degraded", label: "Rescue Degraded", note: "Signal exception while rescue continues." },
  // ── Edge Case / Failure Scenes ──
  { id: "rescue-battery-critical", label: "Battery Critical", note: "Drone at 14% — TALON initiating autonomous handoff." },
  { id: "satellite-feed-loss", label: "Satellite Feed Loss", note: "Aerial intelligence offline, drone-only telemetry." },
  { id: "infrastructure-total-loss", label: "Infrastructure Failure", note: "Total system breakdown — operator manual protocol." },
  { id: "network-degraded", label: "Network Degraded", note: "High latency across all feeds — 340ms average." },
];

export const INCIDENT = {
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
  },
  {
    id: "buffer-west",
    label: "Buffer Zone 2",
    shortLabel: "Buffer Zone 2",
    category: "buffer",
    boundaryColor: "#00C8FF",
    polygon: "0,78 124,64 220,86 336,70 522,92 580,208 476,308 302,332 108,286 0,304",
    center: { x: 184, y: 142 },
    risk: "This western buffer is a passive edge today, but it should remain clear for any alternate evacuation swing.",
    spreadWindow: "Low direct fire risk unless the ridge front wraps west.",
    terrain: "Low-density edge corridor with road access and intermittent tree cover.",
    structures: "Sparse structures only; mainly useful as a routing reserve.",
    note: "Secondary corridor kept clear in case the primary guidance routes need to widen.",
  },
  {
    id: "buffer-east",
    label: "Buffer Zone 1",
    shortLabel: "Buffer Zone 1",
    category: "buffer",
    boundaryColor: "#00C8FF",
    polygon: "1332,84 1518,108 1696,84 1696,418 1580,396 1488,340 1398,298 1314,352 1282,250",
    center: { x: 1486, y: 154 },
    risk: "This is still the cleanest responder ingress edge and the best lane for relay coverage if the ridge pushes southeast.",
    spreadWindow: "30 min to road network if the spread line breaks the forest edge.",
    terrain: "Open service roads, shallow drainage cuts, and fewer vertical obstructions for relay coverage.",
    structures: "Minimal occupied structures; strongest corridor for comms and responder access.",
    note: "Primary ingress and relay corridor. Responder guidance should reference this zone.",
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
  },
];

export const SPREAD_RINGS: SpreadRing[] = [
  { label: "15 MIN", minutes: 15, radius: 118, color: "#E5533C", dash: "8 6" },
  { label: "30 MIN", minutes: 30, radius: 196, color: "#F5A623", dash: "8 6" },
  { label: "60 MIN", minutes: 60, radius: 292, color: "#8899AA", dash: "6 7" },
];

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
    path: "M 1128,746 C 1210,770 1324,812 1482,866",
    textX: 1296,
    textY: 814,
  },
];

export const RESPONDER_ROUTE: RoutePath = {
  id: "responder-route",
  label: "RESPONDER INGRESS",
  color: "#FFD166",
  path: "M 1120,612 C 1012,664 938,724 854,820 C 814,864 776,894 744,924",
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
    "automatic-route": { x: 1304, y: 842, route: "Autonomous residential egress" },
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

export const CONTAINMENT_PLAN_SUMMARY: Record<
  PlanVariant,
  {
    title: string;
    sentence: string;
    reasoning: string;
    spreadRate: string;
    wind: string;
    structuresAtRisk: string;
  }
> = {
  recommended: {
    title: "Recommended contain response",
    sentence: "Expand aerial coverage, stage responder guidance, and prepare residential evacuation before authorizing the full protection plan.",
    reasoning:
      "The recommended sequence balances perimeter truth, responder ingress safety, and residential readiness without overcommitting early assets.",
    spreadRate: "0.8 km² / hr",
    wind: "NE · 18 mph",
    structuresAtRisk: "47 inside 30 min path",
  },
  alternate: {
    title: "Alternate contain response",
    sentence: "Shift one drone east into the buffer corridor and delay residential route guidance until terrain confidence stabilizes.",
    reasoning:
      "This protects the east corridor first, accepts slower residential staging, and is appropriate when the terrain model is incomplete or ingress conditions are changing.",
    spreadRate: "0.8 km² / hr",
    wind: "NE · 18 mph",
    structuresAtRisk: "47 inside 30 min path",
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

  if (scene === "investigation-pending" || scene === "verify-ready" || scene === "verify-active") {
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
