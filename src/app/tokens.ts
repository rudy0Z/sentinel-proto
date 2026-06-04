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
  // ─── Temporal AI Glow System ──────────────────────────────────────────────
  // Used by TALON mic states and evidence convergence animations
  talonIdle: "#00C8FF",       // cyan — ambient presence
  talonListening: "#E5533C", // red — capturing voice
  talonProcessing: "#F5A623", // amber — computing
  talonResponded: "#2DD4A0", // teal — delivered insight
} as const;

/** Consistent opacity for disabled interactive elements (WCAG-friendly) */
export const DISABLED_OPACITY = 0.38;

// ─── Action Bar Dimensions ────────────────────────────────────────────────────
/** Tile width — fixed. 136px allows 3 tiles to fit at 1366x768 center lane (~700px). */
export const TILE_W = 136;
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

export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  "2xl": 14,
  "3xl": 16,
  "4xl": 20,
  "5xl": 24,
  "6xl": 32,
} as const;

export const radius = {
  xs: 3,
  sm: 5,
  md: 8,
  lg: 10,
  xl: 12,
  card: 14,
  overlay: 16,
  glass: 20,
  pill: 999,
} as const;

export const typeScale = {
  eyebrow: 9,
  metadata: 10,
  caption: 10,
  label: 11,
  body: 12,
  title: 13,
  subhead: 15,
  heading: 18,
  display: 26,
  metric: 32,
} as const;

export const typeWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  heavy: 800,
} as const;

export function tint(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((part) => `${part}${part}`).join("") : normalized;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const surface = {
  base: T.bgBase,
  map: T.bgMap,
  panel: "rgba(8, 16, 28, 0.55)",
  panelDense: "rgba(8, 16, 28, 0.72)",
  raised: "rgba(18, 32, 51, 0.68)",
  inset: "rgba(255, 255, 255, 0.025)",
  control: "rgba(255, 255, 255, 0.04)",
  controlHover: "rgba(255, 255, 255, 0.07)",
  controlActive: "rgba(255, 255, 255, 0.09)",
  overlay: "rgba(8, 16, 28, 0.96)",
  scrim: "rgba(0, 0, 0, 0.60)",
} as const;

export const border = {
  soft: "rgba(255, 255, 255, 0.04)",
  subtle: "rgba(255, 255, 255, 0.06)",
  default: "rgba(255, 255, 255, 0.08)",
  strong: "rgba(255, 255, 255, 0.12)",
  focus: tint(T.cyan, 0.5),
} as const;

export const shadow = {
  panel: "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 18px 48px rgba(0, 0, 0, 0.38)",
  overlay: "0 32px 80px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
  quiet: "0 8px 24px rgba(0, 0, 0, 0.24)",
} as const;

export const tone = {
  neutral: {
    fill: surface.control,
    fillHover: surface.controlHover,
    border: border.default,
  },
  info: {
    fill: tint(T.cyan, 0.08),
    fillStrong: tint(T.cyan, 0.14),
    border: tint(T.cyan, 0.28),
  },
  safe: {
    fill: tint(T.teal, 0.08),
    fillStrong: tint(T.teal, 0.14),
    border: tint(T.teal, 0.28),
  },
  caution: {
    fill: tint(T.amber, 0.08),
    fillStrong: tint(T.amber, 0.14),
    border: tint(T.amber, 0.28),
  },
  danger: {
    fill: tint(T.red, 0.08),
    fillStrong: tint(T.red, 0.14),
    border: tint(T.red, 0.28),
  },
} as const;

export const shell = {
  navHeight: 52,
  screenInset: 16,
  railWidth: 300,
  railGap: 8,
  railInnerGap: 18,
  commandBarHeight: ACTIONBAR_H,
  commandBarExpandedHeight: ACTIONBAR_H_EXPANDED,
  safeAreaPadding: 16,
} as const;

export const layer = {
  map: 0,
  rail: 20,
  centerSurface: 25,
  command: 30,
  popover: 35,
  nav: 40,
  alert: 60,
  modal: 200,
  takeover: 400,
  entry: 500,
} as const;

export const panel = {
  headerHeight: 58,
  bodyPadding: space["3xl"],
  bodyPaddingCompact: space["2xl"],
  sectionGap: space["2xl"],
  itemGap: space.lg,
  minCompactHeight: 72,
  minStandardHeight: 160,
  minFocusHeight: 260,
} as const;

export const focus = {
  ring: `0 0 0 2px ${border.focus}`,
  outline: `1px solid ${border.focus}`,
} as const;

export const motion = {
  fast: "120ms ease",
  normal: "180ms ease",
  deliberate: "260ms cubic-bezier(0.34, 1, 0.64, 1)",
} as const;

export const scrollbar = {
  width: 6,
  thumb: border.strong,
  track: "transparent",
} as const;

export const GLASS: CSSProperties = {
  background: surface.panel,
  backdropFilter: "blur(28px) saturate(1.5)",
  WebkitBackdropFilter: "blur(28px) saturate(1.5)",
  borderRadius: radius.glass,
  border: `1px solid ${border.subtle}`,
  boxShadow: `${shadow.panel}, radial-gradient(circle at top left, rgba(255, 255, 255, 0.03), transparent 70%)`,
};

/** Subtle glass for inner cards within panels */
export const GLASS_SUBTLE: CSSProperties = {
  background: surface.raised,
  backdropFilter: "blur(16px) saturate(1.2)",
  WebkitBackdropFilter: "blur(16px) saturate(1.2)",
  border: `1px solid ${border.soft}`,
  borderRadius: radius.card,
  boxShadow: shadow.quiet,
};

export const GI = {
  border: border.strong,
  borderDim: border.subtle,
  surface: surface.control,
  surfaceMid: surface.controlHover,
  dividerBg: border.soft,
  glow: shadow.quiet,
} as const;

export type OperationalMode = "scan" | "verify" | "contain" | "rescue";
export type PanelVariant = "standard" | "compact" | "focus" | "dense" | "degraded" | "blocked" | "handoff" | "takeover";

/**
 * Two-phase workflow model for Sentinel V2.
 * Intelligence: TALON detects, verifies, fuses evidence, helps operator escalate.
 * Operations:   After authority notification, TALON supports containment/rescue coordination.
 */
export type WorkflowPhase = "intelligence" | "operations";

/** Derive workflow phase from operational mode */
export function getWorkflowPhase(mode: OperationalMode): WorkflowPhase {
  return mode === "contain" || mode === "rescue" ? "operations" : "intelligence";
}

// ─── TALON Agentic Data Types ─────────────────────────────────────────────────

export type EvidenceSourceKind =
  | "thermal"
  | "satellite-ir"
  | "drone-visual"
  | "lidar"
  | "wind"
  | "fuel"
  | "terrain"
  | "burn-history"
  | "structure-road";

export type EvidenceSourceStatus = "pending" | "active" | "stale" | "failed" | "missing";

export interface EvidenceSource {
  id: string;
  kind: EvidenceSourceKind;
  label: string;
  status: EvidenceSourceStatus;
  confidence: number; // 0–100
  lastUpdated: string; // timestamp string
  note?: string;
}

export type AgentStatus = "queued" | "running" | "blocked" | "complete" | "failed";

export type TalonAgentCategory =
  | "orchestrator"
  | "intelligence"
  | "perception"
  | "simulation"
  | "operations"
  | "governance";

export interface TalonToolCall {
  id: string;
  label: string;
  status: AgentStatus;
  input?: string;
  output?: string;
}

export interface TalonAgentTask {
  id: string;
  agentName: string;
  shortLabel: string;
  category: TalonAgentCategory;
  status: AgentStatus;
  description: string;
  currentTask: string;
  inputs: string[];
  toolCalls: TalonToolCall[];
  dependencies: string[];
  decisionImpact: string;
  confidence?: number;
  blocker?: string;
  output?: string;
  requiresHumanGate: boolean;
  gateLabel?: string;
  blockedBy?: string;
  auditId?: string;
}

export type TalonVoiceState = "idle" | "listening" | "processing" | "responded";

export type TalonChipId =
  | "why-now"
  | "what-changed"
  | "what-missing"
  | "show-alternate"
  | "autonomous-scope"
  | "confidence-breakdown"
  | "what-blocked";

export interface TalonChipResponse {
  chipId: TalonChipId;
  title: string;
  body: string;
  tone: string;
}

export type TalonConversationState = {
  activeChip: TalonChipId | null;
  response: TalonChipResponse | null;
  voiceState: TalonVoiceState;
};

export type SceneId =
  | "baseline"
  | "alert-command"
  | "investigation-pending"
  | "verify-ready"
  | "verify-active"
  | "authority-notification-ready"
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
  | "notification-ready"
  | "confirmed"
  | "containment-authorized"
  | "rescue-active";
export type ExceptionState = "none" | "signal-degraded";
export type OperationalExceptionId =
  | "satellite-feed-loss"
  | "network-degraded"
  | "battery-critical"
  | "signal-degraded"
  | "infrastructure-total-loss"
  | "terrain-model-degraded";
export type OperationalExceptionSeverity = "advisory" | "degraded" | "blocked" | "critical";
export type OperationalExceptionStatus = "active" | "recovering" | "manual";

export interface OperationalException {
  id: OperationalExceptionId;
  title: string;
  severity: OperationalExceptionSeverity;
  status: OperationalExceptionStatus;
  affectedSources: string[];
  affectedAgents: string[];
  blockedCommands: QuickActionId[];
  fallbackInputs: string[];
  confidenceImpact: string;
  recommendedRecoveryCommand: QuickActionId | null;
  auditText: string;
  mapImpact: string;
}

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
  | "stand-down"
  | "shift-handover";

export type QuickActionStatus = "hidden" | "available" | "recommended" | "in-progress" | "complete" | "disabled";
export type CommandPriority = "primary" | "secondary" | "overflow" | "destructive";
export type CommandRiskLevel = "low" | "medium" | "high" | "critical";
export type CommandGate = "none" | "confirm" | "hold" | "human-approval";
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
  x?: number;
  y?: number;
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
  /** Derived two-phase workflow framing: Intelligence (scan/verify) or Operations (contain/rescue) */
  workflowPhase: WorkflowPhase;
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
  operationalException: OperationalException | null;
  /** TALON conversational state — drives copilot rail content */
  talonConversation: TalonConversationState;
  activeOperator?: string;
}

export type ShellDraft = Omit<ShellState, "activePriorities" | "quickActionStates" | "actionSurface" | "workflowPhase">;

export const MODE_META: Record<
  OperationalMode,
  {
    label: string;
    color: string;
    statusText: string;
    phaseLabel: string;
  }
> = {
  scan: {
    label: "Monitoring",
    phaseLabel: "TALON Surveillance",
    color: T.teal,
    statusText: "TALON surveillance active",
  },
  verify: {
    label: "Evidence Review",
    phaseLabel: "Incident Verification",
    color: T.amber,
    statusText: "Evidence convergence in progress",
  },
  contain: {
    label: "Staging",
    phaseLabel: "Operations Planning",
    color: T.red,
    statusText: "Protection plan staging",
  },
  rescue: {
    label: "Live Ops",
    phaseLabel: "Active Operations",
    color: T.fire,
    statusText: "Coordinating field assets",
  },
};

/** Workflow phase display metadata for the two-phase Sentinel V2 model */
export const WORKFLOW_META: Record<
  WorkflowPhase,
  {
    label: string;
    description: string;
    color: string;
    operatorFocus: string;
  }
> = {
  intelligence: {
    label: "Intelligence",
    description: "Detect · Verify · Escalate",
    color: T.teal,
    operatorFocus: "Is this real and urgent?",
  },
  operations: {
    label: "Operations",
    description: "Stage · Coordinate · Supervise",
    color: T.amber,
    operatorFocus: "Coordinate resources and authorize",
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
  { left: string; priority: string; fleet: string; log: string; copilot: string }
> = {
  scan:    { left: "Environmental Recon",   priority: "Fleet Readiness",    fleet: "Drone Fleet",     log: "Mission Ledger",  copilot: "TALON Intelligence" },
  verify:  { left: "Anomaly Validation",    priority: "Evidence Matrix",    fleet: "Drone Fleet",     log: "Mission Ledger",  copilot: "TALON Assessment" },
  contain: { left: "Tactical Intelligence", priority: "Deployment Metrics", fleet: "Tactical Assets", log: "Command Stream", copilot: "TALON Operations" },
  rescue:  { left: "Life Safety Data",      priority: "Evacuation Status",  fleet: "Field Assets",    log: "Command Stream", copilot: "TALON Supervision" },
};

