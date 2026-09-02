import type { CSSProperties } from "react";

export const T = {
  bgBase: "#071019",
  bgPanel: "#0D1724",
  bgRaised: "#122033",
  bgMap: "#060A12",
  border: "#1E2D42",
  /*
   * Instrument cyan, calibrated off the old pure-neon #00C8FF (0,200,255).
   * Lifting the zero red channel and easing saturation reads as telemetry, not
   * a toy accent (vibecoded tell #29), while staying vivid on the dark map.
   * Feeds every tint()/tone.info/focus derivation, so the whole cyan family
   * shifts with this one value.
   */
  cyan: "#1CB8E6",
  amber: "#F5A623",
  red: "#E5533C",
  fire: "#FF6B4A",
  teal: "#2DD4A0",
  /*
   * Guidance yellow (ground-team / ingress routes / advisory / stale). Shifted
   * off the old warm #FFD166 toward a cooler true-yellow so it no longer reads
   * as a shade of amber (#F5A623 orange) — the one genuine palette confusability.
   * Kept calmer than amber because guidance is lower-urgency than pending human
   * judgment. Leads its family via tint(); one raw rgba in ActionModal is routed
   * through tint() too.
   */
  yellow: "#E6D24C",
  textPrimary: "#E8EDF4",
  textSecondary: "#9AACBE",
  textMuted: "#7A8BA0",
  /** Legible label color on bright semantic action fills (WCAG AA). */
  onAction: "#071019",
  // TALON convergence-gate perimeter states.
  talonIdle: "#1CB8E6",
  talonListening: "#E5533C",
  talonProcessing: "#F5A623",
  talonResponded: "#2DD4A0",
} as const;

/** Consistent opacity for disabled interactive elements (WCAG-friendly) */
export const DISABLED_OPACITY = 0.38;

// ─── Action Bar Dimensions ────────────────────────────────────────────────────
/** One accountable command in the 1920×1080 headquarters action dock. */
export const TILE_W = 172;
export const TILE_H = 64;
/** Gap between adjacent tiles */
export const TILE_GAP = 12;
/** Action bar height — collapsed (primary row only) */
export const ACTIONBAR_H = 100;
/** Action bar height — expanded (primary + secondary rows) */
export const ACTIONBAR_H_EXPANDED = 184;
// ─────────────────────────────────────────────────────────────────────────────

export const font = {
  sans: "'IBM Plex Sans', 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
} as const;

/*
 * Strict 4px spacing: 4 | 8 | 12 | 16 | 20 | 24 | 32.
 * Off-grid steps (2/6/10/14) are retired.
 */
export const space = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
} as const;

/*
 * Locked radius scale. Dense telemetry → controls → tiles → panels → overlays.
 */
export const radius = {
  dense: 4,
  control: 8,
  tile: 10,
  panel: 12,
  overlay: 16,
  pill: 999,
} as const;

export const typeWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  heavy: 800,
} as const;

/**
 * Letter-spacing roles. Free-form tracking is a review failure.
 *
 * Optical tracking law (benchmarked against Linear + IBM Carbon):
 *   - Large display type gets NEGATIVE tracking so it reads intentional, not loose.
 *   - Small dense body/telemetry gets slight POSITIVE tracking for legibility at density.
 *   - Uppercase codes/eyebrows keep the wider telemetry/eyebrow tracking.
 */
export const tracking = {
  /** ≥26px display/metric — Linear runs ~-0.021em at 28px. */
  displayTight: "-0.02em",
  /** 15–18px headings. */
  tight: "-0.01em",
  /** 10–13px body/label — Carbon adds ~+0.011em at 14px for dense legibility. */
  fine: "0.01em",
  /** Uppercase machine codes / short telemetry strings. */
  telemetry: "0.06em",
  /** Uppercase section eyebrows. */
  eyebrow: "0.1em",
} as const;

/**
 * Size + lineHeight + weight + family + optical tracking. Prefer these full
 * recipes over free-form type or the size-only `typeScale` wrapper below.
 *
 * FOCAL CONTRACT (see DESIGN.md §5): every panel renders exactly ONE ≥26px read
 * — `metric` (data) or `display` (title). No size between 18 and 26 competes
 * beneath it. This is what survives the portfolio's ~0.65× embed downscale and
 * is the primary cure for the "no focal point / generic" read.
 */
export const typeStyle = {
  display: { size: 26, lineHeight: 32, weight: typeWeight.bold, family: "sans" as const, tracking: tracking.displayTight },
  heading: { size: 18, lineHeight: 24, weight: typeWeight.semibold, family: "sans" as const, tracking: tracking.tight },
  panelTitle: { size: 15, lineHeight: 21, weight: typeWeight.semibold, family: "sans" as const, tracking: tracking.tight },
  body: { size: 12, lineHeight: 18, weight: typeWeight.regular, family: "sans" as const, tracking: tracking.fine },
  bodyStrong: { size: 12, lineHeight: 18, weight: typeWeight.semibold, family: "sans" as const, tracking: tracking.fine },
  control: { size: 12, lineHeight: 16, weight: typeWeight.semibold, family: "sans" as const, tracking: tracking.fine },
  label: { size: 11, lineHeight: 15, weight: typeWeight.semibold, family: "sans" as const, tracking: tracking.fine },
  metadata: { size: 10, lineHeight: 14, weight: typeWeight.medium, family: "mono" as const, tracking: tracking.fine },
  metric: { size: 32, lineHeight: 36, weight: typeWeight.bold, family: "sans" as const, tracking: tracking.displayTight },
  brand: { size: 14, lineHeight: 20, weight: typeWeight.bold, family: "sans" as const, tracking: tracking.tight },
  title: { size: 13, lineHeight: 18, weight: typeWeight.semibold, family: "sans" as const, tracking: tracking.fine },
} as const;

/** Thin size wrappers — prefer typeStyle for new work. */
export const typeScale = {
  eyebrow: typeStyle.metadata.size,
  metadata: typeStyle.metadata.size,
  caption: typeStyle.label.size,
  label: typeStyle.label.size,
  body: typeStyle.body.size,
  title: typeStyle.title.size,
  subhead: typeStyle.panelTitle.size,
  heading: typeStyle.heading.size,
  display: typeStyle.display.size,
  metric: typeStyle.metric.size,
  brand: typeStyle.brand.size,
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
  panel: "rgba(8, 16, 28, 0.92)",
  panelDense: "rgba(8, 16, 28, 0.90)",
  raised: "rgba(18, 32, 51, 0.76)",
  inset: "rgba(255, 255, 255, 0.025)",
  control: "rgba(255, 255, 255, 0.04)",
  controlHover: "rgba(255, 255, 255, 0.07)",
  controlActive: "rgba(255, 255, 255, 0.09)",
  overlay: "rgba(8, 16, 28, 0.96)",
  scrim: "rgba(0, 0, 0, 0.60)",
  /** Behind full-screen takeovers, where map detail must stop competing. */
  takeoverScrim: "rgba(6, 10, 18, 0.90)",
} as const;

export const border = {
  soft: "rgba(255, 255, 255, 0.04)",
  subtle: "rgba(255, 255, 255, 0.06)",
  default: "rgba(255, 255, 255, 0.08)",
  strong: "rgba(255, 255, 255, 0.12)",
  focus: tint(T.cyan, 0.5),
} as const;

/*
 * Elevation is carried by an edge, not by a glow. Every recipe below pairs one
 * light top edge with one dark bottom edge and a single soft drop — the depth
 * cue reads at headquarters distance without stacking blooms.
 */
export const shadow = {
  panel: "inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 28px rgba(0, 0, 0, 0.28)",
  overlay: "0 24px 64px rgba(0, 0, 0, 0.58), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
  quiet: "0 6px 18px rgba(0, 0, 0, 0.20)",
  /** Rails and floating shells seated over the map. */
  edgeRail:
    "inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.18), 0 8px 24px rgba(0, 0, 0, 0.28)",
  /** Modals and takeover surfaces: same edge, deeper drop. */
  edgeOverlay:
    "inset 0 1px 0 rgba(255, 255, 255, 0.07), inset 0 -1px 0 rgba(0, 0, 0, 0.22), 0 20px 48px rgba(0, 0, 0, 0.46)",
  /** Menus and popovers: same edge, quiet drop. */
  edgePopover:
    "inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.18), 0 10px 26px rgba(0, 0, 0, 0.32)",
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
  railInnerGap: 16,
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
  headerHeight: 56,
  bodyPadding: space.lg,
  bodyPaddingCompact: space.md,
  sectionGap: space.md,
  itemGap: space.sm,
  minCompactHeight: 72,
  minStandardHeight: 160,
  minFocusHeight: 260,
} as const;

export const focus = {
  ring: `0 0 0 2px ${border.focus}`,
  outline: `1px solid ${border.focus}`,
} as const;

/**
 * The two — and only two — sanctioned easing curves, standalone so progress
 * fills and draw-ins at custom durations reference the curve without a bundled
 * duration. A third curve is a review failure (see DESIGN.md §12).
 */
export const ease = {
  /** Default ease-out for UI transitions and hold/progress fills. */
  out: "cubic-bezier(0.23, 1, 0.32, 1)",
  /** Drawer / deliberate surfaces. */
  drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
} as const;

export const motion = {
  fast: `120ms ${ease.out}`,
  normal: `180ms ${ease.out}`,
  deliberate: `240ms ${ease.drawer}`,
} as const;

/** Shared TALON UI and scripted-prototype timing. */
export const TALON_SESSION_TIMING = {
  press: 110,
  stateChange: 160,
  surface: 220,
  scriptedCapture: 1400,
  evidenceCheck: 1600,
  executionReceipt: 1800,
} as const;

export const scrollbar = {
  width: 6,
  thumb: border.strong,
  track: "transparent",
} as const;

/*
 * ─── Material law ───────────────────────────────────────────────────────────
 * Sentinel has three shell materials plus one backdrop. Every floating surface
 * picks one; nothing invents its own blur, radius, or shadow stack.
 *
 *   rail    — panels seated over the live map. Light frost so the map still
 *             reads underneath, one edge light, one soft drop.
 *   overlay — modals, takeovers, and decision surfaces. Opaque, no frost: an
 *             authorization surface must never compete with the map behind it.
 *   popover — menus and transient attachments. Overlay material, quiet drop.
 *   scrim   — the dim behind a takeover. Backdrop only, never a container.
 *
 * Frost is a material, never a state. State is carried by semantic colour,
 * text, and iconography — see DESIGN.md § Materials.
 */
const RAIL_FROST = "blur(10px) saturate(1.12)";

const SCRIM_FROST = "blur(8px)";

export const material: Record<"rail" | "overlay" | "popover" | "scrim", CSSProperties> = {
  rail: {
    background: surface.panel,
    backdropFilter: RAIL_FROST,
    WebkitBackdropFilter: RAIL_FROST,
    borderRadius: radius.panel,
    border: `1px solid ${border.subtle}`,
    boxShadow: shadow.edgeRail,
  },
  overlay: {
    background: surface.overlay,
    borderRadius: radius.overlay,
    border: `1px solid ${border.strong}`,
    boxShadow: shadow.edgeOverlay,
  },
  popover: {
    background: surface.overlay,
    borderRadius: radius.panel,
    border: `1px solid ${border.default}`,
    boxShadow: shadow.edgePopover,
  },
  /*
   * Full-bleed backdrop behind a takeover. Not a panel: it carries no edge and
   * no radius, only one dim value and one frost value for the whole product.
   */
  scrim: {
    background: surface.takeoverScrim,
    backdropFilter: SCRIM_FROST,
    WebkitBackdropFilter: SCRIM_FROST,
  },
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

/** @deprecated Compatibility state for existing shell callbacks. */
export type TalonVoiceState = "idle" | "listening" | "processing" | "responded";

export type TalonSessionPhase =
  | "watching"
  | "input"
  | "review"
  | "checking"
  | "recommendation"
  | "human-gate"
  | "executing"
  | "receipt"
  | "error"
  | "cancelled";

export type TalonInputMode = "voice" | "typed" | "scripted" | null;

export interface TalonSessionRecommendation {
  title: string;
  body: string;
  actionLabel: string;
  actionId?: QuickActionId;
  tone: string;
  evidence: string[];
  blocker: string | null;
  requiresHumanGate: boolean;
}

export interface TalonExecutionReceipt {
  id: string;
  summary: string;
  createdAt: string;
}

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
  /** Rich session fields are optional so existing Shell initializers remain valid. */
  phase?: TalonSessionPhase;
  inputMode?: TalonInputMode;
  transcript?: string;
  interimTranscript?: string;
  recommendation?: TalonSessionRecommendation | null;
  receipt?: TalonExecutionReceipt | null;
  error?: string | null;
  scriptedFallback?: boolean;
  contextActionId?: QuickActionId | null;
  confirmedPhase?: "recommendation" | "human-gate" | "receipt" | null;
};

export type TalonConversationChangeHandler = (next: TalonConversationState) => void;

export type SceneId =
  | "baseline"
  | "alert-command"
  | "investigation-pending"
  | "verify-active"
  | "authority-notification-ready"
  | "contain-recommended"
  | "contain-alternate"
  | "contain-degraded"
  | "rescue-nominal"
  | "rescue-signal-degraded"
  // ── Human/AI Disagreement Scenes ──
  | "monitoring-contested"
  | "talon-reraise"
  // ── Edge Case / Failure Scenes (accessible via Review Dock) ──
  | "rescue-battery-critical"
  | "satellite-feed-loss"
  | "infrastructure-total-loss"
  | "network-degraded";

export type SurfaceMode = "map" | "drone-grid";
export type PlanVariant = "recommended" | "alternate";
export type OverrideReason = "False positive" | "Incomplete data" | "Operational constraint" | "Other";

/*
 * ── Human/AI disagreement ───────────────────────────────────────────────
 * Disagreement runs in two directions with different risk. When TALON wants
 * to escalate and the operator refuses, the cost of a wrong operator is an
 * unreported incident. When TALON wants to hold and the operator escalates
 * anyway, the cost is a false alarm. Authority is human in both cases, so the
 * system's job is not to win the argument — it is to keep both positions
 * legible, attached to the artifact, and answerable once ground truth lands.
 */
export type DissentDirection = "talon-escalates" | "talon-holds";

/** Whether a packet exists because TALON asked for it or because the operator insisted. */
export type EscalationBasis = "talon-recommended" | "operator-initiated";

export interface DissentRecord {
  id: string;
  direction: DissentDirection;
  /** The operator's stated reason. Required — dissent is never silent. */
  reason: OverrideReason;
  operatorNote?: string;
  /** TALON's position at the moment it was overruled, preserved verbatim. */
  talonPosition: string;
  talonConfidence: number;
  recordedAt: string;
  auditId: string;
  /**
   * Rejection is not deletion. TALON keeps watching the rejected hypothesis at
   * reduced weight, and may only re-raise once evidence crosses this higher
   * bar — which is what stops an appeal from becoming a nag.
   */
  reRaiseThreshold: number;
  /** Set once ground truth arrives and the disagreement can be answered. */
  resolution?: DissentResolution;
}

export type DissentOutcome = "operator-correct" | "talon-correct" | "inconclusive";

export interface DissentResolution {
  outcome: DissentOutcome;
  groundTruth: string;
  resolvedAt: string;
  /** What the system changes because of this, if anything. */
  systemResponse: string;
}
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

export interface SpatialUncertainty {
  /** Safety margin added around the affected operational geometry. */
  marginMeters: number;
  affectedZoneIds: string[];
  basis: string;
  observedAt: string;
}

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
  /** Optional for backward compatibility; populated when the exception has a defensible spatial effect. */
  spatialUncertainty?: SpatialUncertainty;
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

export interface ContainmentPlanSpread {
  baselineRate: string;
  projectedResidualRate: string;
  direction: string;
  uncertaintyMarginMeters: number;
}

export interface ContainmentPlanExposure {
  structuresInPath: number;
  structuresAtResidualRisk: number;
  affectedZoneIds: string[];
  routeExposure: string;
}

export interface ContainmentPlanProtection {
  structuresCovered: number;
  coveragePercent: number;
  protectionWindow: string;
}

export interface ContainmentPlanResourceCost {
  dronesCommitted: number;
  groundTeamsCommitted: number;
  reserveImpact: string;
  tradeoff: string;
}

export interface ContainmentPlanConfidence {
  score: number;
  level: "moderate" | "high";
  basis: string[];
  constraints: string[];
}

export interface ContainmentPlanEta {
  stagingMinutes: number;
  protectionReadyMinutes: number;
  label: string;
}

export interface ContainmentPlanSummary {
  /** Legacy display fields remain stable for current consumers. */
  title: string;
  sentence: string;
  reasoning: string;
  spreadRate: string;
  wind: string;
  structuresAtRisk: string;
  spread: ContainmentPlanSpread;
  exposure: ContainmentPlanExposure;
  protectedStructures: ContainmentPlanProtection;
  resourceCost: ContainmentPlanResourceCost;
  confidence: ContainmentPlanConfidence;
  eta: ContainmentPlanEta;
}

export type VerificationDeviationState =
  | "within-tolerance"
  | "deviated"
  | "pending"
  | "unverifiable";

/** Closed-loop check for the most recently executed operator-authorized action. */
export interface ActionOutcomeVerification {
  id: string;
  actionId: QuickActionId;
  actionLabel: string;
  auditId: string;
  activityLogId?: string;
  expectedOutcome: string;
  observedOutcome: string;
  deviationState: VerificationDeviationState;
  deviationSummary: string;
  timestamp: string;
}

export interface FocusedIncidentDetail {
  id: string;
  location: string;
  coords: string;
  detectedAt: string;
  operator: string;
  aiConfidence: number;
  windVector: string;
  fireBehavior: string;
  estimatedFootprint: string;
  spreadRate: string;
  structuresAtRisk: number;
  evacuationScope: number;
  activeZoneId: string;
}

interface IncidentQueueBase {
  id: string;
  label: string;
  location: string;
  status: IncidentStatus;
  severity: SeverityTone;
  lastUpdated: string;
}

export interface ActiveIncidentQueueItem extends IncidentQueueBase {
  kind: "active";
  readOnly: false;
  detail: FocusedIncidentDetail;
}

export interface IncidentQueueSummaryItem extends IncidentQueueBase {
  kind: "summary";
  readOnly: true;
  /** Summary incidents have no independent scene, model run, or command state in this prototype. */
  independentSimulation: false;
  summary: string;
  dataFreshness: string;
}

export type FocusedIncidentQueueItem =
  | ActiveIncidentQueueItem
  | IncidentQueueSummaryItem;

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
  /** Active operator/TALON disagreement, preserved until ground truth resolves it. */
  dissent: DissentRecord | null;
  /** Provenance of the authority packet — TALON asked, or the operator insisted. */
  escalationBasis: EscalationBasis;
  rescueProgress: RescueProgress;
  operationalException: OperationalException | null;
  /**
   * Spatial OS: per-zone envelope margin in normalized MapFrame units.
   * Positive expands; negative contracts. Consumed by SpatialMapCanvas.
   */
  zoneMargins: Record<string, number>;
  /**
   * Selected guided egress corridor id (`route-a` | `route-b`).
   * When null and evacuation is active, both egress routes emphasize.
   */
  selectedEvacuationRouteId: string | null;
  /** TALON conversational state — drives copilot rail content */
  talonConversation: TalonConversationState;
  /** Optional until incident selection is wired into the shell. */
  activeIncidentId?: string;
  /** Optional so existing scene initializers remain source-compatible. */
  recentActionVerification?: ActionOutcomeVerification | null;
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

