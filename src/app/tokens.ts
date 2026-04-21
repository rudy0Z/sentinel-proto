import type { CSSProperties } from "react";

export const T = {
  bgBase: "#071019",
  bgPanel: "#0D1724",
  bgRaised: "#122033",
  bgMap: "#060A12",
  border: "#1E2D42",
  cyan: "#00C8FF",
  amber: "#F5A623",
  red: "#E5533C",
  fire: "#FF6B4A",
  teal: "#2DD4A0",
  yellow: "#FFD166",
  textPrimary: "#E8EDF4",
  textSecondary: "#9AACBE",
  textMuted: "#7A8BA0",
} as const;

/** Consistent opacity for disabled interactive elements (WCAG-friendly) */
export const DISABLED_OPACITY = 0.38;

// ─── Action Bar Dimensions ────────────────────────────────────────────────────
/** Tile width — fixed, never grows */
export const TILE_W = 152;
/** Tile height — fixed */
export const TILE_H = 68;
/** Gap between adjacent tiles */
export const TILE_GAP = 12;
/** Action bar height — collapsed (primary row only) */
export const ACTIONBAR_H = 100;
/** Action bar height — expanded (primary + secondary rows) */
export const ACTIONBAR_H_EXPANDED = 184;
// ─────────────────────────────────────────────────────────────────────────────

export const font = {
  sans: "'Inter', sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
} as const;

export const GLASS: CSSProperties = {
  background: "rgba(8, 16, 28, 0.45)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  borderRadius: 20,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.45)",
};

/** Subtle glass for inner cards within panels */
export const GLASS_SUBTLE: CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  border: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: 14,
};

export const GI = {
  border: "rgba(255, 255, 255, 0.10)",
  borderDim: "rgba(255, 255, 255, 0.06)",
  surface: "rgba(255, 255, 255, 0.05)",
  surfaceMid: "rgba(255, 255, 255, 0.08)",
  dividerBg: "rgba(255, 255, 255, 0.04)",
  glow: "0 18px 42px rgba(0, 0, 0, 0.28)",
} as const;

export type OperationalMode = "scan" | "verify" | "contain" | "rescue";
export type SceneId =
  | "baseline"
  | "alert-command"
  | "investigation-pending"
  | "verify-ready"
  | "verify-active"
  | "contain-recommended"
  | "contain-alternate"
  | "contain-degraded"
  | "rescue-nominal"
  | "rescue-signal-degraded"
  // ── Edge Case / Failure Scenes (accessible via Review Dock) ──
  | "rescue-battery-critical"
  | "satellite-feed-loss"
  | "infrastructure-total-loss"
  | "network-degraded";

export type SurfaceMode = "map" | "drone-grid";
export type PlanVariant = "recommended" | "alternate";
export type OverrideReason = "False positive" | "Incomplete data" | "Operational constraint" | "Other";
export type IncidentStatus =
  | "monitoring"
  | "alerted"
  | "investigating"
  | "assessment-ready"
  | "confirmed"
  | "containment-authorized"
  | "rescue-active";
export type ExceptionState = "none" | "signal-degraded";

export type SelectedEntity =
  | { type: "zone"; id: string }
  | { type: "drone"; id: string }
  | { type: "anomaly"; id: string }
  | { type: "team"; id: string }
  | null;

export type QuickActionId =
  | "surface-alert"
  | "dispatch-scout"
  | "open-verification"
  | "monitor-only"
  | "confirm-incident"
  | "deploy-survey"
  | "stage-perimeter"
  | "stage-responder-guidance"
  | "stage-residential-evacuation"
  | "relay-field-intel"
  | "notify-authorities"
  | "notify-teams"
  | "mark-high-risk"
  | "override-plan"
  | "open-degraded"
  | "authorize-containment"
  | "emergency-evacuate"
  | "activate-automatic-route"
  | "deploy-navigation-drone"
  | "deploy-backup"
  | "acknowledge-exception"
  | "abort-mission"
  | "stand-down";

export type QuickActionStatus = "hidden" | "available" | "recommended" | "in-progress" | "complete" | "disabled";
export type PriorityStatus = "pending" | "recommended" | "in-progress" | "complete";
export type SeverityTone = "danger" | "caution" | "info" | "safe";
export type DroneClass =
  | "surveillance"
  | "thermal-lidar"
  | "guidance-relay"
  | "evacuation-guidance"
  | "multi-role";
export type DroneStatus = "available" | "en-route" | "assigned" | "holding" | "signal-degraded";
export type DroneMissionType =
  | "patrol"
  | "investigation"
  | "survey-zone"
  | "perimeter-monitor"
  | "guide-emergency-personnel"
  | "prepare-residential-evacuation"
  | "relay-field-intel"
  | "automatic-route"
  | "backup-support";
export type TeamAvailability = "available" | "staged" | "deployed";

export interface PriorityRiskItem {
  id: string;
  zoneId?: string;
  areaLabel: string;
  title: string;
  severity: SeverityTone;
  rationale: string;
  nextStep: string;
  status: PriorityStatus;
  linkedActionId?: QuickActionId;
  acknowledged?: boolean;
}

export interface GroundTeamStatus {
  id: string;
  name: string;
  unitType: string;
  readiness: string;
  assignment: string;
  eta: string;
  linkedZoneId?: string;
  availability: TeamAvailability;
  vitals: string;
}

export interface DroneRosterEntry {
  id: string;
  name: string;
  droneClass: DroneClass;
  capabilityLabel: string;
  role: string;
  status: DroneStatus;
  battery: number;
  signal: number;
  x: number;
  y: number;
  zoneId?: string;
  eta?: string;
  route?: string;
  gridLabel: string;
  assignedMission?: DroneMissionType;
  note?: string;
}

export interface QuickActionState {
  id: QuickActionId;
  label: string;
  status: QuickActionStatus;
  description: string;
  tone: string;
  requiresZone?: boolean;
}

/**
 * Two-tier action surface returned by deriveQuickActions.
 * primary   — always visible in the collapsed bar (current situational actions).
 * secondary — revealed on expand (phase transitions, call-off actions).
 * hasSplit  — false for simple scenes where no toggle should render.
 */
export interface ActionSurface {
  primary: QuickActionState[];
  secondary: QuickActionState[];
  hasSplit: boolean;
}

export interface ActivityLogEntry {
  id: string;
  ts: string;
  actor: "AI" | "TALON" | "Operator" | "System";
  type: string;
  text: string;
  severity: SeverityTone;
}

export interface DroneGridTile {
  id: string;
  droneId: string;
  label: string;
  zoneLabel: string;
  status: string;
  role: string;
  accent: string;
}

export interface MapOverlayDescriptor {
  id: string;
  kind:
    | "zone"
    | "anomaly"
    | "route"
    | "spread-ring"
    | "drone"
    | "risk"
    | "structure"
    | "banner";
  zoneId?: string;
  label?: string;
  active: boolean;
}

export interface RescueProgress {
  cleared: number;
  total: number;
  routeA: string;
  routeB: string;
  fireDeptEta: string;
}

export interface ShellState {
  mode: OperationalMode;
  scene: SceneId;
  surfaceMode: SurfaceMode;
  selectedEntity: SelectedEntity;
  selectedZoneId: string | null;
  incidentStatus: IncidentStatus;
  planVariant: PlanVariant;
  exceptionState: ExceptionState;
  activePriorities: PriorityRiskItem[];
  /** @deprecated use actionSurface — kept briefly for migration */
  quickActionStates: QuickActionState[];
  actionSurface: ActionSurface;
  drones: DroneRosterEntry[];
  groundTeams: GroundTeamStatus[];
  activityLog: ActivityLogEntry[];
  highlightedZoneIds: string[];
  residentialRouteActive: boolean;
  responderRouteActive: boolean;
  authoritiesNotified: boolean;
  teamsNotified: boolean;
  emergencyEvacuationActive: boolean;
  backupDeployed: boolean;
  standDownComplete: boolean;
  acknowledgedPriorityIds: string[];
  overrideReason: OverrideReason;
  rescueProgress: RescueProgress;
}

export type ShellDraft = Omit<ShellState, "activePriorities" | "quickActionStates" | "actionSurface">;

export const MODE_META: Record<
  OperationalMode,
  {
    label: string;
    color: string;
    statusText: string;
  }
> = {
  scan: {
    label: "Monitoring",
    color: T.teal,
    statusText: "TALON surveillance active",
  },
  verify: {
    label: "Verification",
    color: T.amber,
    statusText: "Operator assessment required",
  },
  contain: {
    label: "Contain",
    color: T.red,
    statusText: "Protection plan staging",
  },
  rescue: {
    label: "Rescue",
    color: T.fire,
    statusText: "Live operations active",
  },
};

// ─── Progressive Information Density ─────────────────────────────────────────

/**
 * Text density level driven by operational urgency.
 * full       — Scan/Verify: build awareness, read everything
 * condensed  — Contain: titles + actions, rationale on expand
 * critical   — Rescue: numbers only, single-line entries, latest log only
 */
export type TextDensity = "full" | "condensed" | "critical";

export function getDensity(mode: OperationalMode): TextDensity {
  if (mode === "scan" || mode === "verify") return "full";
  if (mode === "contain") return "condensed";
  return "critical";
}

/**
 * Dynamic panel titles that shift with operational mode.
 * The interface morphs vocabulary as urgency increases.
 */
export const PANEL_TITLES: Record<
  OperationalMode,
  { left: string; priority: string; fleet: string; log: string }
> = {
  scan:    { left: "Environmental Recon",  priority: "Fleet Readiness",    fleet: "Drone Fleet",     log: "Mission Ledger" },
  verify:  { left: "Anomaly Validation",   priority: "Asset Distribution",  fleet: "Drone Fleet",     log: "Mission Ledger" },
  contain: { left: "Tactical Intelligence", priority: "Deployment Metrics",  fleet: "Tactical Assets",  log: "Command Stream" },
  rescue:  { left: "Life Safety Data",     priority: "Evacuation Status",   fleet: "Field Assets",     log: "Command Stream" },
};

