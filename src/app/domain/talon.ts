import type {
  EvidenceSource,
  QuickActionId,
  SceneId,
  ShellState,
  TalonAgentTask,
  TalonChipId,
  TalonChipResponse,
  TalonConversationState,
  TalonInputMode,
  TalonSessionPhase,
  TalonSessionRecommendation,
  TalonToolCall,
  TalonVoiceState,
} from "../tokens";
import { T } from "../tokens";
import { getOperationalException } from "./exceptions";
import { TALON_CHIP_RESPONSES, getVoiceResponseForScene } from "./microcopy";

export interface TalonRecommendationCopy {
  text: string;
  action: string;
  tone: string;
}

export interface AuthorityPacket {
  id: string;
  status: "drafting" | "ready" | "sent";
  confidence: number;
  escalationLevel: string;
  location: string;
  evidenceSummary: string;
  missingData: string[];
  preparedAt: string;
  humanGate: string;
}

export const TALON_PROMPT_CHIPS: Array<{ id: TalonChipId; label: string }> = [
  { id: "why-now", label: "Why now?" },
  { id: "what-changed", label: "What changed?" },
  { id: "what-missing", label: "Data gaps?" },
  { id: "show-alternate", label: "Show alternate" },
  { id: "autonomous-scope", label: "TALON scope" },
  { id: "confidence-breakdown", label: "Confidence?" },
  { id: "what-blocked", label: "What's blocked?" },
];

const SCENE_CHIPS_MAP: Partial<Record<SceneId, TalonChipId[]>> = {
  baseline: ["why-now", "autonomous-scope"],
  "alert-command": ["why-now", "what-missing", "autonomous-scope"],
  "investigation-pending": ["why-now", "autonomous-scope", "confidence-breakdown"],
  "verify-active": ["confidence-breakdown", "what-changed", "what-missing"],
  "monitoring-contested": ["what-blocked", "confidence-breakdown", "autonomous-scope"],
  "talon-reraise": ["what-changed", "confidence-breakdown", "what-missing"],
  "authority-notification-ready": ["confidence-breakdown", "what-missing", "autonomous-scope"],
  "contain-recommended": ["show-alternate", "what-blocked", "autonomous-scope", "confidence-breakdown"],
  "contain-alternate": ["why-now", "what-blocked", "confidence-breakdown"],
  "contain-degraded": ["what-missing", "confidence-breakdown", "what-blocked"],
  "rescue-nominal": ["autonomous-scope", "what-blocked"],
  "rescue-signal-degraded": ["autonomous-scope", "what-blocked"],
  "rescue-battery-critical": ["what-blocked", "autonomous-scope"],
  "satellite-feed-loss": ["what-missing", "confidence-breakdown", "what-blocked"],
  "network-degraded": ["what-missing", "what-blocked", "autonomous-scope"],
  "infrastructure-total-loss": ["what-blocked", "autonomous-scope"],
};

export function getSceneChips(scene: SceneId): Array<{ id: TalonChipId; label: string }> {
  const chipIds = SCENE_CHIPS_MAP[scene] ?? ["why-now", "autonomous-scope"];
  return TALON_PROMPT_CHIPS.filter((chip) => chipIds.includes(chip.id));
}

export function getTalonChipResponse(chipId: TalonChipId): TalonChipResponse {
  return { chipId, ...TALON_CHIP_RESPONSES[chipId] };
}

export function getTalonVoiceResponse(scene: SceneId): TalonChipResponse {
  return getVoiceResponseForScene(scene);
}

export interface TalonInteractionModel {
  chips: Array<{ id: TalonChipId; label: string }>;
  recommendation: TalonRecommendationCopy;
  activeAgents: TalonAgentTask[];
  exception: ReturnType<typeof getOperationalException>;
  answerFormat: {
    conclusion: string;
    evidence: string[];
    agents: string[];
    blocker: string | null;
    nextAction: string;
  };
}

export interface TalonSessionView {
  phase: TalonSessionPhase;
  inputMode: TalonInputMode;
  transcript: string;
  interimTranscript: string;
  recommendation: TalonSessionRecommendation | null;
  error: string | null;
  scriptedFallback: boolean;
  contextActionId: QuickActionId | null;
  voiceState: TalonVoiceState;
}

const PHASE_TO_LEGACY_VOICE: Record<TalonSessionPhase, TalonVoiceState> = {
  watching: "idle",
  input: "listening",
  review: "listening",
  checking: "processing",
  recommendation: "responded",
  "human-gate": "responded",
  executing: "processing",
  receipt: "responded",
  error: "idle",
  cancelled: "idle",
};

function phaseFromLegacyConversation(conversation: TalonConversationState): TalonSessionPhase {
  if (conversation.receipt) return "receipt";
  if (conversation.voiceState === "listening") return "input";
  if (conversation.voiceState === "processing") return "checking";
  if (conversation.voiceState === "responded") {
    return conversation.recommendation?.requiresHumanGate ? "human-gate" : "recommendation";
  }
  return conversation.response || conversation.recommendation ? "recommendation" : "watching";
}

export function getTalonSessionView(conversation: TalonConversationState): TalonSessionView {
  return {
    phase: conversation.phase ?? phaseFromLegacyConversation(conversation),
    inputMode: conversation.inputMode ?? null,
    transcript: conversation.transcript ?? "",
    interimTranscript: conversation.interimTranscript ?? "",
    recommendation: conversation.recommendation ?? null,
    error: conversation.error ?? null,
    scriptedFallback: conversation.scriptedFallback ?? false,
    contextActionId: conversation.contextActionId ?? null,
    voiceState: conversation.voiceState,
  };
}

export function updateTalonConversation(
  conversation: TalonConversationState,
  patch: Partial<TalonConversationState> & { phase?: TalonSessionPhase },
): TalonConversationState {
  const phase = patch.phase ?? conversation.phase ?? phaseFromLegacyConversation(conversation);
  return {
    ...conversation,
    ...patch,
    phase,
    voiceState: patch.voiceState ?? PHASE_TO_LEGACY_VOICE[phase],
  };
}

/**
 * Escape leaves completed recommendations and receipts intact while stopping
 * capture, review, checking, or execution work.
 */
export function cancelTalonConversation(conversation: TalonConversationState): TalonConversationState {
  const view = getTalonSessionView(conversation);
  const preservedPhase: TalonSessionPhase = conversation.receipt
    ? "receipt"
    : conversation.recommendation
      ? conversation.recommendation.requiresHumanGate
        ? "human-gate"
        : "recommendation"
      : view.transcript
        ? "cancelled"
        : "watching";

  return updateTalonConversation(conversation, {
    phase: preservedPhase,
    inputMode: null,
    interimTranscript: "",
    error: null,
    confirmedPhase:
      preservedPhase === "receipt" || preservedPhase === "human-gate" || preservedPhase === "recommendation"
        ? preservedPhase
        : conversation.confirmedPhase,
  });
}

export function getTalonSessionRecommendation(state: ShellState): TalonSessionRecommendation {
  const model = getTalonInteractionModel(state);
  return {
    title: model.recommendation.action,
    body: model.recommendation.text,
    actionLabel: model.answerFormat.nextAction,
    actionId: getRecommendedActionId(state),
    tone: model.recommendation.tone,
    evidence: model.answerFormat.evidence,
    blocker: model.answerFormat.blocker,
    /*
     * The session's gate derives ONLY from a staged, gate-able operator command.
     * Agent-level gates describe workforce context and stay in the Workforce
     * rail — folding them in here is what made every scene read
     * "Human approval required", including quiet watch.
     */
    requiresHumanGate: state.actionSurface.primary.some(
      (action) => action.status === "recommended",
    ),
  };
}

function getRecommendedActionId(state: ShellState): QuickActionId | undefined {
  return [...state.actionSurface.primary, ...state.actionSurface.secondary].find(
    (action) => action.status === "recommended" || action.status === "in-progress",
  )?.id;
}

export function getTalonInteractionModel(state: ShellState): TalonInteractionModel {
  const agents = getAgentTasks(state.scene);
  const recommendation = getTalonRecommendation(state);
  const exception = state.operationalException ?? getOperationalException(state.scene);
  const relevantAgents = agents
    .filter((agent) => agent.status === "running" || agent.status === "blocked" || agent.status === "failed")
    .slice(0, 4);

  return {
    chips: getSceneChips(state.scene),
    recommendation,
    activeAgents: agents,
    exception,
    answerFormat: {
      conclusion: recommendation.text,
      evidence: exception?.fallbackInputs ?? getEvidenceSources(state.scene).filter((source) => source.status === "active").slice(0, 4).map((source) => source.label),
      agents: relevantAgents.map((agent) => agent.agentName),
      blocker: exception?.confidenceImpact ?? agents.find((agent) => agent.blocker)?.blocker ?? null,
      nextAction: recommendation.action,
    },
  };
}

/*
 * Scene-entry clock — lets evidence confidence CONVERGE over real time while
 * the operator watches, instead of sitting at frozen values. Resets whenever
 * the scene changes, so `?scene=` deep links stay deterministic at entry
 * (elapsed 0 → start values) and then visibly build toward their targets.
 * The shell's one-second timers keep panels re-rendering, so no prop
 * drilling is needed for the values to advance.
 */
let convergenceScene: SceneId | null = null;
let convergenceEnteredAt = 0;

function sceneElapsedSeconds(scene: SceneId): number {
  if (scene !== convergenceScene) {
    convergenceScene = scene;
    convergenceEnteredAt = Date.now();
  }
  return (Date.now() - convergenceEnteredAt) / 1000;
}

const CONVERGENCE_WINDOW_S = 45;

function easeToward(start: number, target: number, elapsed: number, windowS = CONVERGENCE_WINDOW_S): number {
  const t = Math.min(1, Math.max(0, elapsed / windowS));
  const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic — fast early gains, slow settle
  return Math.round(start + (target - start) * eased);
}

/*
 * ── Signal history ──────────────────────────────────────────────────────
 *
 * Trend charts used to be hand-written arrays per scene. That is a quiet lie:
 * a time-series chart asserts that a time-series pipeline exists, and six
 * invented numbers assert nothing the rest of the system could support.
 *
 * These series are sampled backwards through the same easing curve that drives
 * evidence confidence, which gives one property that matters more than the
 * shape: THE LAST POINT OF A SERIES IS THE CURRENT VALUE. A chart can never
 * disagree with the number printed next to it, and both move together as
 * evidence converges.
 *
 * What this stands in for in production: TALON's historical-behaviour model,
 * fitted on prior Grid 4C burns, projecting forward from live sensor input.
 * The shape here is authored; the contract — one model, one clock, one value —
 * is the part that has to be real, and is.
 */
export interface SignalSeries {
  thermal: number[];
  structures: number[];
  confidence: number[];
  current: { thermal: number; structures: number; confidence: number };
}

type SignalRange = [start: number, target: number];

interface SignalProfile {
  thermal: SignalRange;
  structures: SignalRange;
  confidence: SignalRange;
  /** Settled scenes sit at target; live ones are still travelling. */
  live: boolean;
  /**
   * How far into its curve the signal already is on scene entry, 0–1.
   *
   * An operator joining at `verify-active` is not watching evidence begin —
   * thermal has been climbing since the dispatch. Without this the trailing
   * samples all clamp to the start value and the chart draws a flat line
   * claiming nothing happened, which is as untrue as the hardcoded arrays were.
   */
  entryProgress: number;
}

const SIGNAL_PROFILES: Record<SceneId, SignalProfile> = {
  /* Quiet watch genuinely is flat — that is the point of the scene. */
  baseline: { thermal: [2, 4], structures: [0, 2], confidence: [0, 0], live: false, entryProgress: 0.9 },
  "alert-command": { thermal: [4, 18], structures: [1, 6], confidence: [40, 62], live: true, entryProgress: 0.3 },
  "investigation-pending": { thermal: [12, 34], structures: [4, 26], confidence: [54, 68], live: true, entryProgress: 0.4 },
  "verify-active": { thermal: [22, 44], structures: [18, 40], confidence: [62, 78], live: true, entryProgress: 0.45 },
  "authority-notification-ready": { thermal: [34, 48], structures: [32, 47], confidence: [70, 78], live: false, entryProgress: 0.75 },
  "contain-recommended": { thermal: [40, 52], structures: [40, 47], confidence: [72, 78], live: false, entryProgress: 0.8 },
  "contain-alternate": { thermal: [40, 50], structures: [40, 47], confidence: [70, 76], live: false, entryProgress: 0.8 },
  /* Degraded terrain widens the envelope, so confidence settles lower. */
  "contain-degraded": { thermal: [38, 48], structures: [36, 47], confidence: [58, 61], live: false, entryProgress: 0.8 },
  /* Containment is working — thermal decays while cleared structures climb. */
  "rescue-nominal": { thermal: [52, 20], structures: [14, 34], confidence: [78, 84], live: true, entryProgress: 0.25 },
  "rescue-signal-degraded": { thermal: [46, 28], structures: [16, 29], confidence: [70, 66], live: false, entryProgress: 0.6 },
  "rescue-battery-critical": { thermal: [44, 32], structures: [18, 27], confidence: [64, 54], live: false, entryProgress: 0.6 },
  /* Contested: evidence keeps building precisely because nobody closed it. */
  "monitoring-contested": { thermal: [24, 48], structures: [20, 34], confidence: [78, 94], live: true, entryProgress: 0.3 },
  "talon-reraise": { thermal: [40, 54], structures: [30, 42], confidence: [86, 96], live: false, entryProgress: 0.85 },
  /* Lost sources flatten out — the line goes quiet rather than inventing continuity. */
  "satellite-feed-loss": { thermal: [32, 21], structures: [29, 31], confidence: [62, 40], live: false, entryProgress: 0.85 },
  "network-degraded": { thermal: [34, 27], structures: [30, 34], confidence: [66, 52], live: false, entryProgress: 0.85 },
  "infrastructure-total-loss": { thermal: [30, 22], structures: [18, 18], confidence: [40, 0], live: false, entryProgress: 0.9 },
};

const SERIES_POINTS = 6;
const SERIES_STEP_S = 8;

function sampleSeries(range: SignalRange, elapsed: number, points: number): number[] {
  const [start, target] = range;
  return Array.from({ length: points }, (_, index) => {
    /* Point i sits (points-1-i) steps in the past; the final point is "now". */
    const at = Math.max(0, elapsed - (points - 1 - index) * SERIES_STEP_S);
    return easeToward(start, target, at);
  });
}

export function getSignalHistory(
  scene: SceneId,
  overrides?: { confidence?: number },
  points = SERIES_POINTS,
): SignalSeries {
  const profile = SIGNAL_PROFILES[scene];
  /*
   * Live scenes advance from wherever the signal already stood on entry;
   * settled ones report their target so deep links stay deterministic.
   */
  const entryElapsed = profile.entryProgress * CONVERGENCE_WINDOW_S;
  const elapsed = profile.live
    ? entryElapsed + sceneElapsedSeconds(scene)
    : Math.max(entryElapsed, CONVERGENCE_WINDOW_S);

  const thermal = sampleSeries(profile.thermal, elapsed, points);
  const structures = sampleSeries(profile.structures, elapsed, points);
  const confidence = sampleSeries(profile.confidence, elapsed, points);

  /*
   * The shell owns contested-watch confidence, because it climbs on operator
   * time rather than scene time. When it passes a value, the series is
   * re-anchored so the chart still ends on the displayed number.
   */
  if (typeof overrides?.confidence === "number") {
    const anchored = sampleSeries([profile.confidence[0], overrides.confidence], elapsed, points);
    anchored[anchored.length - 1] = overrides.confidence;
    return {
      thermal,
      structures,
      confidence: anchored,
      current: {
        thermal: thermal[thermal.length - 1],
        structures: structures[structures.length - 1],
        confidence: overrides.confidence,
      },
    };
  }

  return {
    thermal,
    structures,
    confidence,
    current: {
      thermal: thermal[thermal.length - 1],
      structures: structures[structures.length - 1],
      confidence: confidence[confidence.length - 1],
    },
  };
}

export function getEvidenceSources(scene: SceneId): EvidenceSource[] {
  const isEarly = scene === "baseline" || scene === "alert-command" || scene === "investigation-pending";
  const isAuthorityPacket = scene === "authority-notification-ready";
  const isSatelliteLoss = scene === "satellite-feed-loss";
  const isDegradedTerrain = scene === "contain-degraded";
  /*
   * Evidence builds live during the verification window. This used to be split
   * across a separate "evidence ready" scene, which gated a decision the
   * operator had already made by dispatching. Convergence is a property of the
   * evidence, not a step for the operator: arrive early and watch it build,
   * arrive late and it has settled.
   */
  const isConverging = scene === "verify-active";
  const elapsed = isConverging ? sceneElapsedSeconds(scene) : 0;

  return [
    {
      id: "thermal",
      kind: "thermal",
      label: "Thermal sensor",
      status: isEarly ? "active" : "active",
      confidence: isEarly ? 62 : isConverging ? easeToward(62, 91, elapsed) : 91,
      lastUpdated: "03:47:01",
      note: isEarly ? "Ground thermal array is trending above baseline." : "Primary trigger source. Thermal rise sustained across three passes.",
    },
    {
      id: "satellite-ir",
      kind: "satellite-ir",
      label: "Satellite IR",
      status: isSatelliteLoss ? "failed" : isEarly ? "pending" : "active",
      confidence: isSatelliteLoss ? 0 : isEarly ? 0 : isConverging ? easeToward(54, 87, elapsed) : 87,
      lastUpdated: "03:46:44",
      note: isSatelliteLoss ? "Unavailable. TALON is reducing confidence and increasing drone weighting." : "Confirms thermal hotspot orientation.",
    },
    {
      id: "drone-visual",
      kind: "drone-visual",
      label: "Drone visual",
      status: scene === "baseline" || scene === "alert-command" ? "pending" : "active",
      confidence: scene === "baseline" || scene === "alert-command" ? 0 : isConverging ? easeToward(18, 42, elapsed) : 42,
      lastUpdated: "03:48:14",
      note: "Smoke-obscured visual feed. Useful for location, weak for fire-front certainty.",
    },
    {
      id: "lidar",
      kind: "lidar",
      label: "LiDAR 3D model",
      status: isDegradedTerrain ? "stale" : scene === "baseline" || scene === "alert-command" ? "pending" : "active",
      confidence: isDegradedTerrain ? 38 : scene === "baseline" || scene === "alert-command" ? 0 : isAuthorityPacket ? 76 : isConverging ? easeToward(31, 74, elapsed) : 74,
      lastUpdated: "03:48:16",
      note: isDegradedTerrain ? "Partial ridge reconstruction. Raw feed remains visible." : "Terrain and ridge reconstruction feeding spread estimate.",
    },
    {
      id: "wind",
      kind: "wind",
      label: "Wind model",
      status: "active",
      confidence: isEarly ? 68 : isConverging ? easeToward(68, 78, elapsed) : 78,
      lastUpdated: "03:31:00",
      note: "NE 38 degrees at 18 mph. TALON applies freshness warning after 15 minutes.",
    },
    {
      id: "burn-history",
      kind: "burn-history",
      label: "Burn history",
      status: "active",
      confidence: 95,
      lastUpdated: "2024-01-12",
      note: "Historical ignition memory for Grid 4C. Strong match to prior fire signatures.",
    },
    {
      id: "fuel-index",
      kind: "fuel",
      label: "Fuel index",
      status: "stale",
      confidence: 40,
      lastUpdated: "2024-05-29",
      note: "48h stale. TALON adds an uncertainty buffer before recommending escalation.",
    },
  ];
}

type AgentBuildInput = Omit<TalonAgentTask, "toolCalls" | "inputs" | "dependencies" | "requiresHumanGate"> & {
  toolCalls?: TalonToolCall[];
  inputs?: string[];
  dependencies?: string[];
  requiresHumanGate?: boolean;
};

const AUTHORITY_AUDIT_ID = "AUD-90-0847";
const DISSENT_AUDIT_ID = "AUD-DIS-0847";

function tool(id: string, label: string, status: TalonToolCall["status"], input?: string, output?: string): TalonToolCall {
  return { id, label, status, input, output };
}

function agent(task: AgentBuildInput): TalonAgentTask {
  return {
    inputs: [],
    toolCalls: [],
    dependencies: [],
    requiresHumanGate: false,
    ...task,
  };
}

function phaseFor(
  scene: SceneId,
): "baseline" | "alert" | "verification" | "authority" | "operations" | "rescue" | "failure" | "contested" {
  if (scene === "baseline") return "baseline";
  if (scene === "alert-command") return "alert";
  if (scene === "authority-notification-ready") return "authority";
  if (scene === "monitoring-contested" || scene === "talon-reraise") return "contested";
  if (scene === "contain-recommended" || scene === "contain-alternate" || scene === "contain-degraded") return "operations";
  if (scene === "rescue-nominal" || scene === "rescue-signal-degraded") return "rescue";
  if (scene === "satellite-feed-loss" || scene === "network-degraded" || scene === "rescue-battery-critical" || scene === "infrastructure-total-loss") return "failure";
  return "verification";
}

export function getAgentTasks(scene: SceneId): TalonAgentTask[] {
  const phase = phaseFor(scene);
  const isBaseline = phase === "baseline";
  const isAlert = phase === "alert";
  const isVerification = phase === "verification";
  const isAuthority = phase === "authority";
  const isOperations = phase === "operations";
  const isRescue = phase === "rescue";
  const isFailure = phase === "failure";
  const isSatelliteLoss = scene === "satellite-feed-loss";
  const isNetworkDegraded = scene === "network-degraded" || scene === "rescue-signal-degraded";
  const isBatteryCritical = scene === "rescue-battery-critical";
  const isInfrastructureLoss = scene === "infrastructure-total-loss";
  const isTerrainDegraded = scene === "contain-degraded";
  const isAlternate = scene === "contain-alternate";
  const isContested = phase === "contested";
  const isReRaise = scene === "talon-reraise";

  const satelliteStatus: TalonAgentTask["status"] = isSatelliteLoss
    ? "failed"
    : isBaseline
      ? "queued"
      : isAlert || isVerification
        ? "running"
        : "complete";
  const dronePerceptionStatus: TalonAgentTask["status"] = isBatteryCritical
    ? "blocked"
    : isNetworkDegraded
      ? "blocked"
      : isBaseline || isAlert
        ? "queued"
        : isRescue || isOperations
          ? "running"
          : "complete";
  const sensorStatus: TalonAgentTask["status"] = isNetworkDegraded
    ? "blocked"
    : isAuthority
      ? "complete"
      : "running";
  const fireStatus: TalonAgentTask["status"] = isBaseline
    ? "queued"
    : isAlert || isVerification || isOperations || isFailure || isRescue
      ? "running"
      : "complete";
  const historicalStatus: TalonAgentTask["status"] = isBaseline ? "queued" : isAlert || isVerification ? "running" : "complete";
  const valuesStatus: TalonAgentTask["status"] = isBaseline || isAlert ? "queued" : isAuthority || isOperations || isRescue ? "complete" : "running";
  const resourceStatus: TalonAgentTask["status"] = isBatteryCritical ? "blocked" : isOperations || isRescue || isFailure ? "running" : "queued";
  const droneControlStatus: TalonAgentTask["status"] = isBatteryCritical ? "blocked" : isOperations || isRescue || isFailure ? "running" : "queued";
  /*
   * Under contest the notification agent is blocked by a decision, not by
   * missing evidence — and the two must not look alike. The blocker copy below
   * names who is holding it: the operator while the watch is contested, the
   * duty supervisor once TALON has appealed.
   */
  const notificationStatus: TalonAgentTask["status"] = isAuthority || isContested
    ? "blocked"
    : isOperations || isRescue || isFailure
      ? "complete"
      : isVerification
        ? "running"
        : "queued";
  const governanceStatus: TalonAgentTask["status"] = isAuthority || isOperations || isRescue || isFailure ? "running" : isBaseline ? "running" : "running";

  return [
    agent({
      id: "talon-orchestrator",
      agentName: "TALON Orchestrator",
      shortLabel: isReRaise
        ? "Appealing to second authority"
        : isContested
          ? "Standing down, watch retained"
          : isAuthority
            ? "Holding human gate"
            : isOperations || isRescue
              ? "Supervising operations"
              : "Coordinating agents",
      category: "orchestrator",
      status: isAuthority ? "blocked" : "running",
      description: "Master supervisor that sequences specialist agents and converts outputs into operator-authorized next actions.",
      currentTask: isReRaise
        ? "Route new evidence to the duty supervisor rather than re-prompting the operator who declined."
        : isContested
          ? "Hold the rejected hypothesis at reduced weight and suppress escalation below the agreed threshold."
          : isAuthority
            ? "Freeze the authority packet until the operator sends it."
            : isOperations || isRescue
              ? "Route live agent outputs into field-safe recommendations."
              : "Fan out evidence processing across surveillance, simulation, and governance agents.",
      inputs: ["Scene state", "Agent outputs", "Operator commands", "Human gates"],
      toolCalls: [
        tool("assign", "Assign specialist agents", "complete", "Current incident state", "Workforce plan synchronized"),
        tool("gate", "Check human gates", isAuthority ? "blocked" : "running", "Authorization policy", isAuthority ? "Authority send required" : "No field action released without approval"),
      ],
      dependencies: ["Sensor Fusion Agent", "Governance Agent"],
      decisionImpact: isContested
        ? "Keeps an overruled hypothesis alive without letting TALON overrule the operator."
        : isAuthority
          ? "Prevents TALON from notifying authorities without the operator."
          : "Controls when evidence becomes a recommendation, packet, or field plan.",
      confidence: isAuthority ? 78 : isOperations || isRescue ? 84 : isBaseline ? 62 : 74,
      blocker: isReRaise
        ? "Awaiting supervisor review"
        : isContested
          ? "Operator declined escalation — suppressed below re-raise threshold"
          : isAuthority
            ? "Awaiting operator send"
            : undefined,
      requiresHumanGate: isAuthority || isReRaise,
      gateLabel: isReRaise ? "Supervisor decision" : isAuthority ? "Send Authority Packet" : undefined,
      blockedBy: isReRaise ? "Duty Supervisor" : isContested ? "Operator" : isAuthority ? "Operator" : undefined,
      auditId: isAuthority ? AUTHORITY_AUDIT_ID : undefined,
    }),
    agent({
      id: "satellite-intelligence",
      agentName: "Satellite Intelligence Agent",
      shortLabel: isSatelliteLoss ? "IR feed failed" : isBaseline ? "Queued for anomaly" : satelliteStatus === "complete" ? "IR delta confirmed" : "Fetching IR delta",
      category: "intelligence",
      status: satelliteStatus,
      description: "Compares satellite infrared passes against baseline heat signatures and cloud-mask confidence.",
      currentTask: isSatelliteLoss ? "Fallback to drone and ground thermal feeds." : satelliteStatus === "queued" ? "Wait for sustained thermal trigger." : "Validate the hotspot orientation from live IR deltas.",
      inputs: ["Satellite IR", "Thermal anomaly", "Cloud mask"],
      toolCalls: [
        tool("ir-delta", "Fetch IR delta", satelliteStatus, "Satellite IR", isSatelliteLoss ? "Unavailable" : satelliteStatus === "complete" ? "+22 C NE-oriented delta" : undefined),
        tool("cloud-mask", "Apply cloud mask", satelliteStatus === "failed" ? "failed" : satelliteStatus, "Weather overlay", satelliteStatus === "complete" ? "Clear enough for confidence weighting" : undefined),
      ],
      dependencies: ["Sensor Fusion Agent"],
      decisionImpact: "Raises or lowers the evidence threshold before TALON asks for authority notification.",
      confidence: isSatelliteLoss ? 0 : isBaseline ? undefined : isAuthority ? 87 : 72,
      blocker: isSatelliteLoss ? "Satellite IR feed unavailable" : undefined,
      output: isSatelliteLoss ? "Fallback weighting increased for drone perception and ground thermal." : satelliteStatus === "complete" ? "Thermal plume direction supports Grid 4C ignition." : undefined,
    }),
    agent({
      id: "drone-perception",
      agentName: "Drone Perception Agent",
      shortLabel: dronePerceptionStatus === "blocked" ? "Drone input degraded" : dronePerceptionStatus === "queued" ? "Awaiting dispatch" : "Parsing aerial feed",
      category: "perception",
      status: dronePerceptionStatus,
      description: "Reads drone visual, LiDAR, smoke density, and terrain edge confidence from autonomous drone passes.",
      currentTask: dronePerceptionStatus === "queued" ? "Wait for Lidar-02 to reach the scan corridor." : dronePerceptionStatus === "blocked" ? "Report degraded autonomy and expose fallback observation." : "Extract terrain and smoke-obscured perimeter cues.",
      inputs: ["Drone visual", "LiDAR", "Smoke density", "Terrain mesh"],
      toolCalls: [
        tool("object-pass", "Run object pass", dronePerceptionStatus, "EO feed", dronePerceptionStatus === "complete" || dronePerceptionStatus === "running" ? "Smoke obscures fine detail" : undefined),
        tool("lidar-mesh", "Refresh LiDAR mesh", isTerrainDegraded ? "blocked" : dronePerceptionStatus, "LiDAR", isTerrainDegraded ? "Partial ridge mesh only" : undefined),
      ],
      dependencies: ["Drone Control Agent"],
      decisionImpact: "Improves spatial certainty without giving TALON field-control authority.",
      confidence: dronePerceptionStatus === "blocked" ? 42 : dronePerceptionStatus === "queued" ? undefined : 68,
      blocker: isBatteryCritical ? "Drone battery below safe autonomy threshold" : isNetworkDegraded ? "Network jitter delaying telemetry" : isTerrainDegraded ? "LiDAR ridge mesh is partial" : undefined,
      output: dronePerceptionStatus === "blocked" ? "Fallback: use thermal perimeter and operator visual review." : dronePerceptionStatus !== "queued" ? "Smoke-obscured perimeter supports NE spread." : undefined,
    }),
    agent({
      id: "sensor-fusion",
      agentName: "Sensor Fusion Agent",
      shortLabel: sensorStatus === "complete" ? "Sources aligned" : sensorStatus === "blocked" ? "Fusion degraded" : "Correlating signals",
      category: "intelligence",
      status: sensorStatus,
      description: "Weights live thermal, satellite, drone, wind, and terrain signals into one explainable evidence score.",
      currentTask: sensorStatus === "blocked" ? "Run degraded fusion and expose missing-source risk." : sensorStatus === "complete" ? "Hold confirmed evidence for the authority packet." : "Normalize live sources and flag contradictions.",
      inputs: ["Thermal", "Satellite IR", "Wind", "Drone visual", "Fuel index"],
      toolCalls: [
        tool("weight", "Weight source confidence", sensorStatus, "Evidence sources", sensorStatus === "complete" ? "78 percent convergence" : undefined),
        tool("contradictions", "Scan contradictions", sensorStatus === "blocked" ? "blocked" : sensorStatus, "Cross-source residuals", sensorStatus === "complete" ? "No high-risk contradiction" : undefined),
      ],
      dependencies: ["Satellite Intelligence Agent", "Drone Perception Agent"],
      decisionImpact: "Determines whether TALON can prepare, but not send, the authority packet.",
      confidence: sensorStatus === "blocked" ? 58 : isAuthority ? 78 : isBaseline ? 62 : 70,
      blocker: sensorStatus === "blocked" ? "Live telemetry latency exceeds fusion tolerance" : undefined,
      output: sensorStatus === "complete" ? "Incident confirmed at Grid 4C with uncertainty noted." : undefined,
    }),
    agent({
      id: "fire-behavior",
      agentName: "Fire Behavior Agent",
      shortLabel: isBaseline ? "Standing by" : isTerrainDegraded ? "Spread model uncertain" : "Modeling spread",
      category: "simulation",
      status: fireStatus,
      description: "Simulates probable fire-front movement from wind, slope, fuel, terrain, and historical burn behavior.",
      currentTask: isBaseline ? "Wait for a validated heat trigger." : "Project spread corridor and uncertainty envelope.",
      inputs: ["Wind", "Fuel index", "Terrain", "Burn history"],
      toolCalls: [
        tool("wind-corridor", "Compute wind corridor", fireStatus, "NE 38 degrees at 18 mph", fireStatus === "complete" || fireStatus === "running" ? "NE corridor remains dominant" : undefined),
        tool("spread-rate", "Estimate spread rate", fireStatus, "Fuel and slope", isTerrainDegraded ? "Uncertainty buffer widened" : fireStatus === "complete" ? "0.8 km2/hr projected" : undefined),
      ],
      dependencies: ["Sensor Fusion Agent", "Historical Verification Agent"],
      decisionImpact: "Translates evidence into the risk-path visual and notification urgency.",
      confidence: isBaseline ? undefined : isTerrainDegraded ? 61 : isAuthority ? 74 : 69,
      blocker: isTerrainDegraded ? "Terrain mesh confidence is below preferred threshold" : undefined,
      output: isAuthority ? "0.8 km2/hr NE corridor included in packet." : isTerrainDegraded ? "Fallback spread model uses widened perimeter buffer." : undefined,
    }),
    agent({
      id: "historical-verification",
      agentName: "Historical Verification Agent",
      shortLabel: historicalStatus === "complete" ? "Prior pattern matched" : historicalStatus === "queued" ? "Queued" : "Checking burn memory",
      category: "intelligence",
      status: historicalStatus,
      description: "Compares the incident signature with burn history, false positives, and prior dispatch patterns.",
      currentTask: historicalStatus === "queued" ? "Wait for thermal anomaly." : "Verify whether this signature matches prior emergency patterns.",
      inputs: ["Burn history", "Incident archive", "False-positive memory"],
      toolCalls: [
        tool("archive", "Query incident archive", historicalStatus, "Grid 4C memory", historicalStatus === "complete" ? "Strong match to prior ignition signatures" : undefined),
      ],
      dependencies: ["Sensor Fusion Agent"],
      decisionImpact: "Reduces false escalation risk before the operator sends authorities.",
      confidence: historicalStatus === "queued" ? undefined : 91,
      output: historicalStatus === "complete" ? "Prior Grid 4C pattern supports escalation." : undefined,
    }),
    agent({
      id: "values-risk",
      agentName: "Values-at-Risk Agent",
      shortLabel: valuesStatus === "complete" ? "47 structures in path" : valuesStatus === "queued" ? "Mapping assets queued" : "Mapping exposure",
      category: "simulation",
      status: valuesStatus,
      description: "Quantifies structures, roads, critical assets, and likely exposure as the simulated perimeter evolves.",
      currentTask: valuesStatus === "queued" ? "Wait for spread corridor." : "Convert the fire behavior model into exposed assets and route risk.",
      inputs: ["Structures", "Roads", "Critical assets", "Population"],
      toolCalls: [
        tool("structures", "Project structures-at-risk", valuesStatus, "Spread corridor", valuesStatus === "complete" ? "47 structures inside 90-minute path" : undefined),
        tool("roads", "Check road exposure", valuesStatus, "Road graph", isInfrastructureLoss ? "Primary access route compromised" : undefined),
      ],
      dependencies: ["Fire Behavior Agent"],
      decisionImpact: "Defines severity for the authority packet and later evacuation staging.",
      confidence: valuesStatus === "queued" ? undefined : isAuthority ? 82 : 76,
      blocker: isInfrastructureLoss ? "Road graph has major outage" : undefined,
      output: valuesStatus === "complete" ? "47 structures and two access roads flagged." : undefined,
    }),
    agent({
      id: "resource-readiness",
      agentName: "Resource Readiness Agent",
      shortLabel: resourceStatus === "queued" ? "Waiting for operations phase" : isBatteryCritical ? "Asset readiness blocked" : "Checking field assets",
      category: "operations",
      status: resourceStatus,
      description: "Tracks crew ETAs, drone battery, staging zones, water points, and availability constraints.",
      currentTask: resourceStatus === "queued" ? "Stand by until authorities are notified." : "Prepare field-ready resource status for operator-approved staging.",
      inputs: ["Crew ETA", "Drone battery", "Water points", "Road access"],
      toolCalls: [
        tool("fleet", "Check fleet readiness", resourceStatus, "Drone fleet", isBatteryCritical ? "Drone-03 battery critical" : resourceStatus === "running" ? "8 assets ready, 2 en route" : undefined),
        tool("crew", "Refresh crew ETA", resourceStatus === "queued" ? "queued" : "running", "Dispatch status", resourceStatus !== "queued" ? "Nearest unit ETA 11 minutes" : undefined),
      ],
      dependencies: ["Notification Brief Agent"],
      decisionImpact: "Supports containment and rescue planning after the 90-second authority decision.",
      confidence: resourceStatus === "queued" ? undefined : isBatteryCritical ? 54 : 88,
      blocker: isBatteryCritical ? "Drone-03 cannot be assigned until battery swap or override." : undefined,
      output: resourceStatus !== "queued" && !isBatteryCritical ? "8 assets ready, 2 en route." : undefined,
    }),
    agent({
      id: "drone-control",
      agentName: "Drone Control Agent",
      shortLabel: droneControlStatus === "queued" ? "No field command yet" : droneControlStatus === "blocked" ? "Autonomy constrained" : "Supervising drone tasks",
      category: "operations",
      status: droneControlStatus,
      description: "Stages supervised drone scan, perimeter, and relay actions without bypassing operator authorization.",
      currentTask: droneControlStatus === "queued" ? "Wait for a human-approved field action." : "Translate approved tasks into drone-safe tasking envelopes.",
      inputs: ["Drone telemetry", "No-fly zones", "Approved tasks", "Operator gates"],
      toolCalls: [
        tool("geofence", "Validate geofence", droneControlStatus, "No-fly zones", droneControlStatus === "running" ? "Safe corridor verified" : undefined),
        tool("assign-drone", "Assign drone task", droneControlStatus === "blocked" ? "blocked" : droneControlStatus, "Approved plan", droneControlStatus === "running" ? "Awaiting or executing approved assignment" : undefined),
      ],
      dependencies: ["Resource Readiness Agent", "Governance Agent"],
      decisionImpact: "Shows autonomy as supervised execution, not independent field command.",
      confidence: droneControlStatus === "queued" ? undefined : droneControlStatus === "blocked" ? 51 : 86,
      blocker: isBatteryCritical ? "Battery threshold blocks autonomous dispatch." : undefined,
      output: droneControlStatus === "running" ? (isAlternate ? "Eastern corridor task envelope staged." : "Perimeter scan and relay tasks staged.") : undefined,
    }),
    agent({
      id: "notification-brief",
      agentName: "Notification Brief Agent",
      shortLabel: isReRaise
        ? "Held for supervisor"
        : isContested
          ? "Withdrawn on operator call"
          : isAuthority
            ? "Packet ready"
            : notificationStatus === "complete"
              ? "Packet sent"
              : notificationStatus === "running"
                ? "Brief drafting"
                : "Awaiting evidence",
      category: "governance",
      status: notificationStatus,
      description: "Builds the authority packet from evidence, uncertainty, risk path, and missing data for human send.",
      currentTask: isReRaise
        ? "Hold the revised packet for the duty supervisor; the shift operator has already declined."
        : isContested
          ? "Stand the packet down and retain it unsent against the operator's logged reason."
          : isAuthority
            ? "Hold prepared packet until the operator sends it."
            : notificationStatus === "running"
              ? "Assemble concise dispatch evidence and caveats."
              : notificationStatus === "complete"
                ? "Maintain sent receipt for audit and handover."
                : "Wait for incident confirmation.",
      inputs: ["Evidence bundle", "Risk score", "Missing data", "Audit log"],
      toolCalls: [
        tool("packet", "Compile authority packet", isAuthority || notificationStatus === "complete" ? "complete" : notificationStatus, "Confirmed evidence", isAuthority ? "Packet ready for send" : notificationStatus === "complete" ? "Packet sent to authority channels" : undefined),
        tool("send", "Send authority packet", isAuthority ? "blocked" : notificationStatus === "complete" ? "complete" : "queued", "Operator authorization", isAuthority ? "Awaiting operator send" : notificationStatus === "complete" ? AUTHORITY_AUDIT_ID : undefined),
      ],
      dependencies: ["Sensor Fusion Agent", "Fire Behavior Agent", "Values-at-Risk Agent", "Governance Agent"],
      decisionImpact: "Marks the 90-second success point only after human-authorized authority notification.",
      confidence: isAuthority ? 78 : notificationStatus === "running" ? 64 : notificationStatus === "complete" ? 82 : undefined,
      blocker: isReRaise
        ? "Awaiting duty supervisor review"
        : isContested
          ? "Operator declined escalation — packet retained unsent"
          : isAuthority
            ? "Awaiting operator send"
            : isAlert
              ? "Awaiting incident confirmation"
              : undefined,
      output: isReRaise
        ? "Revised packet prepared from post-override evidence only."
        : isContested
          ? `Packet withdrawn unsent. Operator reason and TALON position both retained under ${DISSENT_AUDIT_ID}.`
          : isAuthority
            ? `Dispatch packet ${AUTHORITY_AUDIT_ID} ready.`
            : notificationStatus === "complete"
              ? `Authority packet sent. Receipt ${AUTHORITY_AUDIT_ID}.`
              : undefined,
      /*
       * The agent's gate is contextual, not global: it reports a human gate only
       * where the packet genuinely waits on a person (authority-ready, re-raise).
       * An unconditional true here used to leak into every session
       * recommendation — manufacturing a "Human approval required" verdict on
       * scenes with nothing to authorize.
       */
      requiresHumanGate: isAuthority || isReRaise,
      gateLabel: isReRaise ? "Supervisor decision" : "Send Authority Packet",
      blockedBy: isReRaise ? "Duty Supervisor" : isContested ? "Operator" : isAuthority ? "Operator" : undefined,
      auditId: isAuthority || notificationStatus === "complete" ? AUTHORITY_AUDIT_ID : undefined,
    }),
    agent({
      id: "governance",
      agentName: "Governance Agent",
      shortLabel: isAuthority ? "Audit receipt prepared" : "Logging gates",
      category: "governance",
      status: governanceStatus,
      description: "Records source freshness, model confidence, human gates, tool calls, overrides, and receipt IDs.",
      currentTask: isAuthority ? "Prepare an audit receipt before the authority send is released." : "Continuously log supervised AI decisions and operator actions.",
      inputs: ["Human gates", "Model version", "Tool log", "Audit ID"],
      toolCalls: [
        tool("audit", "Append audit log", "running", "Tool calls and gates", isAuthority ? `Receipt draft ${AUTHORITY_AUDIT_ID}` : "Live log current"),
        tool("policy", "Check control policy", "complete", "Human authorization matrix", "Field-affecting actions require approval"),
      ],
      dependencies: ["TALON Orchestrator"],
      decisionImpact: "Makes TALON explainable, inspectable, and accountable for enterprise emergency operations.",
      confidence: 96,
      output: isAuthority ? `Audit receipt ${AUTHORITY_AUDIT_ID} prepared before send.` : "Governance log active for all gates.",
      auditId: isAuthority || notificationStatus === "complete" ? AUTHORITY_AUDIT_ID : undefined,
    }),
  ];
}

export function getTalonRecommendation(state: ShellState): TalonRecommendationCopy {
  const recs: Partial<Record<SceneId, TalonRecommendationCopy>> = {
    baseline: {
      text: "No active incident. TALON is quietly watching thermal, wind, burn history, and route telemetry for early convergence.",
      action: "Maintaining watch",
      tone: T.teal,
    },
    "alert-command": {
      text: "Thermal rise in Grid 4C correlates with prior burn memory and the NE wind corridor. Recommend scout dispatch before escalation.",
      action: "Dispatch Lidar-02",
      tone: T.amber,
    },
    "investigation-pending": {
      text: "Lidar-02 is en route. TALON is preparing the evidence frame from thermal, satellite, wind, and burn-history data.",
      action: "Await on-station status",
      tone: T.cyan,
    },
    "verify-active": {
      text: "Incident appears urgent and authority-notifiable. TALON can prepare the dispatch packet, but the operator must confirm escalation.",
      action: "Confirm incident",
      tone: T.red,
    },
    "monitoring-contested": {
      text: "The operator closed this incident against TALON's recommendation. The hypothesis stays open at reduced weight; TALON will not re-raise below the agreed threshold.",
      action: "Holding contested watch",
      tone: T.cyan,
    },
    "talon-reraise": {
      text: "New evidence has crossed the raised threshold set at override. TALON is presenting what changed — not the original case again — and has routed it to a second authority.",
      action: "Review what changed",
      tone: T.amber,
    },
    "authority-notification-ready": {
      text: "Authority packet is ready. TALON has synthesized evidence, uncertainty, risk path, and missing data. Operator approval sends it.",
      action: "Send Authority Packet",
      tone: T.red,
    },
    "contain-recommended": {
      text: "Authorities have been notified. TALON is now staging containment options and field coordination tasks for human authorization.",
      action: "Stage operations",
      tone: T.red,
    },
    "contain-alternate": {
      text: "Alternate plan prioritizes the eastern buffer corridor. TALON recomputed routes after the operator changed the tactical assumption.",
      action: "Review alternate plan",
      tone: T.amber,
    },
    "rescue-nominal": {
      text: "Authorized plan is executing. TALON is supervising exceptions, route integrity, and field telemetry while humans retain command.",
      action: "Monitor exceptions",
      tone: T.fire,
    },
    "rescue-signal-degraded": {
      text: "Relay signal is degraded. TALON has prepared a backup route through stronger coverage; operator approval is required before rerouting field assets.",
      action: "Deploy backup",
      tone: T.amber,
    },
    "rescue-battery-critical": {
      text: "Lidar-02 battery is critical. TALON prepared supervised recall and Scout-03 handoff; perimeter change remains gated.",
      action: "Deploy backup",
      tone: T.amber,
    },
    "satellite-feed-loss": {
      text: "Satellite feed is offline. Drone telemetry and LiDAR remain active, but confidence is reduced until fallback evidence is reviewed.",
      action: "Deploy survey",
      tone: T.amber,
    },
    "network-degraded": {
      text: "Network latency is high. TALON is using low-bandwidth telemetry and keeping authorization gates blocked until source freshness improves.",
      action: "Relay field intel",
      tone: T.yellow,
    },
    "contain-degraded": {
      text: "Terrain model is degraded. TALON is widening the spread buffer and keeping raw feed fallback visible before operations authorization.",
      action: "Open fallback",
      tone: T.amber,
    },
    "infrastructure-total-loss": {
      text: "Infrastructure is unavailable. TALON can preserve context, but command execution must move to manual protocol.",
      action: "Manual protocol",
      tone: T.red,
    },
  };

  return recs[state.scene] ?? {
    text: "TALON is monitoring the situation and surfacing only the next accountable decision.",
    action: "Standby",
    tone: T.teal,
  };
}

export function getAuthorityPacket(state: ShellState): AuthorityPacket {
  const sent = state.authoritiesNotified;
  const ready =
    state.scene === "authority-notification-ready" ||
    state.scene === "contain-recommended" ||
    state.scene === "contain-alternate" ||
    state.scene === "contain-degraded" ||
    state.scene === "rescue-nominal" ||
    state.scene === "rescue-signal-degraded" ||
    state.scene === "rescue-battery-critical";

  return {
    id: "AUD-90-0847",
    status: sent ? "sent" : ready ? "ready" : "drafting",
    confidence: ready ? 78 : 46,
    escalationLevel: ready ? "Authority-notifiable wildfire risk" : "Evidence synthesis in progress",
    location: "Grid 4C / North forest ridge",
    evidenceSummary: ready
      ? "Thermal, satellite IR, wind, LiDAR, and burn-history signals converge on active vegetation-fire risk."
      : "Thermal and burn-memory signals are active. Drone and satellite confirmation are still being resolved.",
    missingData: ["Ground moisture is 48h stale", "Aerial visual is smoke-obscured", "Fuel load survey is not current"],
    preparedAt: ready ? "03:48:37 UTC" : "Drafting",
    humanGate: sent ? "Operator sent to authorities" : ready ? "Awaiting operator send" : "Awaiting incident confirmation",
  };
}
