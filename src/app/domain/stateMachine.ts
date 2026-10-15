import type { DissentRecord, EscalationBasis, OperationalMode, QuickActionId, SceneId } from "../tokens";
import { shouldReRaise } from "./disagreement";

/*
 * Sentinel scene transition model.
 *
 * Before this file the shell moved between scenes by calling `setScene` from
 * ~15 places, each with a hardcoded target. That made the 15 scenes a set of
 * authored snapshots rather than a system: there was no way to ask "what can
 * the operator do from here?", no guard on an illegal move, and no way to see
 * that some scenes were unreachable by operator action.
 *
 * TRANSITIONS below is the single source of truth for scene movement. Every
 * edge carries the event that fires it, the guard that can block it, the human
 * gate it must pass, and the reason it exists. The shell resolves moves through
 * `resolveTransition`; the analysis helpers at the bottom let the same table be
 * inspected (and rendered) rather than only executed.
 */

/** Events that are not operator commands — timers, lifecycle, acknowledgements. */
export type SystemEvent =
  | "system.enter-scenario"
  | "system.deep-link"
  | "system.restart"
  | "timer.alert-surfaced"
  | "timer.investigation-complete"
  | "timer.rescue-edge-case"
  | "timer.reraise-threshold"
  | "operator.acknowledge-handoff"
  | "operator.close-alternate"
  | "operator.close-degraded"
  | "operator.voice-override"
  | "operator.stand-down-complete"
  | "operator.resolve-dissent"
  | "operator.clear-source-conflict"
  | "operator.authorities-notified"
  | "operator.authorize-route-b"
  | "operator.initiate-shift-change"
  | "timer.source-discrepancy"
  | "timer.run-card-staged"
  | "timer.route-a-blocked";

export type TransitionEvent = QuickActionId | SystemEvent;

export type ExperienceMode = "entry" | "brief" | "simulation" | "free";

/** State the guards need that does not live on SceneId alone. */
export interface TransitionContext {
  experienceMode: ExperienceMode;
  mode: OperationalMode;
  authoritiesNotified: boolean;
  edgeCaseFired: boolean;
  dissent: DissentRecord | null;
  /** Current fused evidence confidence — gates whether TALON may appeal. */
  evidenceConfidence: number;
}

/**
 * `human-approval` and `confirm` mirror the CommandGate on the command
 * definition — repeated here so the transition is legible on its own, and so a
 * gate can never be dropped by wiring a scene move around the command surface.
 */
export type TransitionGate = "none" | "confirm" | "human-approval";

/*
 * The set of operator commands that require a human gate before they can fire
 * (vs commands that can be staged and executed as part of supervised work).
 * Home is the transition table itself, so the gate catalog and the table it
 * protects cannot drift — the shell and the TALON surface both consume this
 * one set. (Moved here from talon.ts, which re-exports for compatibility.)
 */
export const GATED_ACTIONS: ReadonlySet<QuickActionId> = new Set([
  "confirm-incident",
  "notify-authorities",
  "authorize-containment",
  "emergency-evacuate",
]);

/** Quick helper: is the staged operator command a gate-able one? */
export function isGatedAction(action: { id: QuickActionId } | undefined): boolean {
  return Boolean(action && GATED_ACTIONS.has(action.id));
}

export interface SceneTransition {
  from: SceneId | "*";
  event: TransitionEvent;
  to: SceneId;
  gate: TransitionGate;
  /** Blocks the edge when it returns false. Absent means always permitted. */
  guard?: (context: TransitionContext) => boolean;
  /** Why this edge exists — the operational justification, not the mechanics. */
  reason: string;
  /**
   * Set when taking this edge means overruling TALON. The shell must capture a
   * reason before the move is allowed — dissent is never silent, and this flag
   * is what makes that structural rather than a convention.
   */
  requiresDissent?: boolean;
  /** Side effects the shell must apply alongside the scene change. */
  effects?: {
    mode?: OperationalMode;
    authoritiesNotified?: boolean;
    resetIncident?: boolean;
    escalationBasis?: EscalationBasis;
  };
}

const inSimulation = (context: TransitionContext) => context.experienceMode === "simulation";

export const TRANSITIONS: SceneTransition[] = [
  /* ── Entry ──────────────────────────────────────────────────────────── */
  {
    from: "*",
    event: "system.enter-scenario",
    to: "baseline",
    gate: "none",
    reason: "Entry and scenario brief both drop the operator into quiet watch.",
    effects: { resetIncident: true },
  },
  {
    from: "baseline",
    event: "timer.alert-surfaced",
    to: "alert-command",
    gate: "none",
    guard: inSimulation,
    reason: "Guided run surfaces the first anomaly so the 90 seconds can start.",
  },
  {
    from: "baseline",
    event: "surface-alert",
    to: "alert-command",
    gate: "none",
    reason: "Free exploration can raise the interrupt without waiting on the timer.",
  },

  /* ── Alert → investigation ──────────────────────────────────────────── */
  {
    from: "alert-command",
    event: "dispatch-scout",
    to: "investigation-pending",
    gate: "confirm",
    reason: "Operator sends a scout to corroborate before any escalation.",
  },

  /* ── Investigation → verification ───────────────────────────────────── */
  {
    from: "investigation-pending",
    event: "timer.investigation-complete",
    to: "verify-active",
    gate: "none",
    reason: "Scout reaches station and evidence becomes reviewable.",
  },
  {
    from: "investigation-pending",
    event: "open-verification",
    to: "verify-active",
    gate: "none",
    reason: "Operator opens the evidence frame before the scout timer completes.",
  },

  /* ── Disagreement — direction A: TALON escalates, operator refuses ───
     Declining here is not "do nothing". TALON has recommended escalation, so
     refusing it is a decision with a cost, and it lands in contested watch
     rather than baseline. Baseline would erase the disagreement. */
  {
    from: "verify-active",
    event: "monitor-only",
    to: "monitoring-contested",
    gate: "confirm",
    requiresDissent: true,
    reason: "Operator overrules the escalation recommendation and must state why.",
  },
  {
    from: "alert-command",
    event: "monitor-only",
    to: "baseline",
    gate: "none",
    reason: "Declining at alert stage predates any TALON recommendation — no dissent to record.",
  },
  {
    from: "monitoring-contested",
    event: "timer.reraise-threshold",
    to: "talon-reraise",
    gate: "none",
    guard: (context) => shouldReRaise(context.dissent, context.evidenceConfidence),
    reason: "New evidence crossed the raised bar set at override — TALON may appeal, not repeat.",
  },
  {
    from: "monitoring-contested",
    event: "operator.resolve-dissent",
    to: "baseline",
    gate: "none",
    reason: "Ground truth answered the disagreement; the contested watch closes with a recorded outcome.",
    effects: { resetIncident: true },
  },
  {
    from: "talon-reraise",
    event: "confirm-incident",
    to: "authority-notification-ready",
    gate: "human-approval",
    reason: "Second authority agrees with TALON; escalation proceeds without reversing the first operator's record.",
  },
  {
    from: "talon-reraise",
    event: "monitor-only",
    to: "monitoring-contested",
    gate: "confirm",
    requiresDissent: true,
    reason: "Supervisor also declines. Two humans now disagree with TALON; the watch continues, the bar does not rise again.",
  },

  /* ── Verification → authority ───────────────────────────────────────── */
  {
    from: "verify-active",
    event: "confirm-incident",
    to: "authority-notification-ready",
    gate: "human-approval",
    reason: "Operator confirms the incident, which lets TALON prepare — not send — the packet.",
  },

  /* ── Disagreement — direction B: TALON holds, operator escalates ─────
     The riskier direction, and the one most AI products ignore. TALON has not
     recommended escalation and the operator insists anyway. Authority is human,
     so the system complies — but the packet records whose call it was. */
  {
    from: "investigation-pending",
    event: "confirm-incident",
    to: "authority-notification-ready",
    gate: "human-approval",
    requiresDissent: true,
    reason: "Operator escalates past TALON's hold on local knowledge; TALON's objection rides with the packet.",
    effects: { escalationBasis: "operator-initiated" },
  },
  {
    from: "authority-notification-ready",
    event: "notify-authorities",
    to: "contain-recommended",
    gate: "human-approval",
    guard: (context) => !context.authoritiesNotified,
    reason: "The 90-second promise ends here: a human sends the packet. TALON never sends it.",
    effects: { mode: "contain", authoritiesNotified: true },
  },

  /* ── Containment planning ───────────────────────────────────────────── */
  {
    from: "contain-recommended",
    event: "override-plan",
    to: "contain-alternate",
    gate: "confirm",
    reason: "Operator changes the tactical assumption; TALON recomputes rather than argues.",
  },
  {
    from: "contain-recommended",
    event: "open-degraded",
    to: "contain-degraded",
    gate: "none",
    reason: "Terrain confidence dropped — open the fallback evidence surface.",
  },
  {
    from: "contain-alternate",
    event: "operator.close-alternate",
    to: "contain-recommended",
    gate: "none",
    reason: "Operator acknowledges the recomputed plan and returns to the staging picture.",
  },
  {
    from: "contain-degraded",
    event: "operator.close-degraded",
    to: "contain-recommended",
    gate: "none",
    reason: "Operator accepts the widened buffer and returns to the staging picture.",
  },
  {
    from: "contain-recommended",
    event: "operator.voice-override",
    to: "contain-alternate",
    gate: "confirm",
    reason: "Voice-directed correction applied to a staged mission.",
  },

  /* ── Containment → live operations ──────────────────────────────────── */
  {
    from: "contain-recommended",
    event: "authorize-containment",
    to: "rescue-nominal",
    gate: "human-approval",
    reason: "Operator authorizes the staged plan; supervised execution begins.",
    effects: { mode: "rescue" },
  },
  {
    from: "contain-alternate",
    event: "authorize-containment",
    to: "rescue-nominal",
    gate: "human-approval",
    reason: "Operator authorizes the alternate plan they corrected.",
    effects: { mode: "rescue" },
  },
  {
    from: "contain-degraded",
    event: "authorize-containment",
    to: "rescue-nominal",
    gate: "human-approval",
    reason: "Operator authorizes despite degraded terrain, accepting the wider buffer.",
    effects: { mode: "rescue" },
  },

  /* ── Live operations exceptions ─────────────────────────────────────── */
  {
    from: "rescue-nominal",
    event: "timer.rescue-edge-case",
    to: "rescue-battery-critical",
    gate: "none",
    guard: (context) => inSimulation(context) && !context.edgeCaseFired,
    reason: "Scripted edge case: the guided run must show one failure the operator must gate.",
  },
  {
    from: "rescue-battery-critical",
    event: "operator.acknowledge-handoff",
    to: "rescue-nominal",
    gate: "confirm",
    reason: "Operator authorizes the recall and Scout-03 handoff; execution resumes.",
  },
  {
    from: "rescue-signal-degraded",
    event: "deploy-backup",
    to: "rescue-nominal",
    gate: "confirm",
    reason: "Backup relay approved; route confidence restored.",
  },

  /* ── Infrastructure failure and recovery ────────────────────────────
     Each degraded scene needs a real way out. Before the table existed, the
     exception banner offered a recovery command that assigned a drone and left
     the operator in the degraded scene forever — the button looked like an exit
     and was not one. These are the edges that make the recovery real. */
  {
    from: "satellite-feed-loss",
    event: "deploy-survey",
    to: "contain-recommended",
    gate: "confirm",
    reason: "Drone survey replaces the lost IR coverage; fusion recovers enough to resume planning.",
  },
  {
    from: "network-degraded",
    event: "relay-field-intel",
    to: "contain-recommended",
    gate: "confirm",
    reason: "Relay restores telemetry throughput; gates reopen and planning resumes.",
  },
  {
    from: "infrastructure-total-loss",
    event: "system.restart",
    to: "baseline",
    gate: "none",
    reason: "Manual protocol ends when the system comes back; context restarts at watch.",
    effects: { resetIncident: true },
  },

  /* ── Promoted states (vault 03 §2) ────────────────────────────────────
     Four states the single-script prototype never needed: a live source
     discrepancy during verification, the wait between notifying authorities
     and teams actually staging, a partial evacuation, and a formal shift
     handover. Each one is reachable, and each one has a real way out. */
  {
    from: "verify-active",
    event: "timer.source-discrepancy",
    to: "verify-source-conflict",
    gate: "none",
    reason: "Satellite and agricultural-burn records disagree on the heat source; verification pauses until a human reconciles them.",
  },
  {
    from: "verify-source-conflict",
    event: "operator.clear-source-conflict",
    to: "verify-active",
    gate: "none",
    reason: "Operator reconciles the sources (permit on file, sensor re-tasked); verification resumes where it paused.",
  },
  {
    /* Alternate acknowledgement path — the operator notified authorities off-console
     * (radio/phone/paper) and now marks the system. This sets the SAME flag the
     * gated `notify-authorities` edge guards, so it must never be gate-free:
     * `gate: "none"` here was a human-gate bypass on the 90-second promise's
     * critical moment (audit 2026-09 §P0-2). It is a human-approval gate too. */
    from: "authority-notification-ready",
    event: "operator.authorities-notified",
    to: "contain-awaiting-teams",
    gate: "human-approval",
    guard: (context) => !context.authoritiesNotified,
    reason: "Packet sent by human hand; the console now waits on ground teams staging, not on TALON.",
    effects: { authoritiesNotified: true },
  },
  {
    from: "contain-awaiting-teams",
    event: "timer.run-card-staged",
    to: "contain-recommended",
    gate: "confirm",
    reason: "Run-card teams report staged; TALON recomputes the staging picture against confirmed crew positions.",
  },
  {
    from: "rescue-nominal",
    event: "timer.route-a-blocked",
    to: "rescue-partial-evac",
    gate: "none",
    reason: "Smoke cuts Route A mid-egress; the console shows partial evacuation honestly rather than as a failure state.",
  },
  {
    from: "rescue-partial-evac",
    event: "operator.authorize-route-b",
    to: "rescue-nominal",
    gate: "confirm",
    reason: "Operator shifts the remaining civilians to Route B; coverage resumes on the promoted corridor.",
  },
  {
    from: "rescue-nominal",
    event: "operator.initiate-shift-change",
    to: "handoff-pending",
    gate: "confirm",
    reason: "Shift change opens a formal transfer; authority is ambiguous until the incoming lead takes it.",
  },
  {
    from: "handoff-pending",
    event: "operator.acknowledge-handoff",
    to: "rescue-nominal",
    gate: "human-approval",
    reason: "Incoming shift lead takes authority with the PIN; the outgoing lead's record stays attached to the packet.",
  },

  /* ── Universal exits ────────────────────────────────────────────────── */
  {
    from: "*",
    event: "abort-mission",
    to: "baseline",
    gate: "confirm",
    reason: "Destructive exit — abandons the operation and returns to passive monitoring.",
    effects: { resetIncident: true },
  },
  {
    from: "*",
    event: "operator.stand-down-complete",
    to: "baseline",
    gate: "none",
    reason: "Mission formally closed after the resolved debrief; assets recalled.",
    effects: { resetIncident: true },
  },
];

/*
 * Deep links reach every scene by design — the review dock is a prototype
 * affordance for jumping to an authored state. Reachability analysis below
 * deliberately ignores this edge, because "you can link to it" is not the same
 * as "an operator can get there".
 */
export const DEEP_LINK_EVENT: SystemEvent = "system.deep-link";

export function resolveTransition(
  from: SceneId,
  event: TransitionEvent,
  context: TransitionContext,
): SceneTransition | null {
  const candidates = TRANSITIONS.filter(
    (transition) => transition.event === event && (transition.from === from || transition.from === "*"),
  );

  /* Specific edges win over wildcards so `*` stays a fallback, not an override. */
  const ordered = [
    ...candidates.filter((transition) => transition.from === from),
    ...candidates.filter((transition) => transition.from === "*"),
  ];

  return ordered.find((transition) => transition.guard?.(context) ?? true) ?? null;
}

/** Every edge leaving a scene, wildcards included — drives "what can I do here?". */
export function getAvailableTransitions(from: SceneId): SceneTransition[] {
  return TRANSITIONS.filter((transition) => transition.from === from || transition.from === "*");
}

export function canTransition(
  from: SceneId,
  event: TransitionEvent,
  context: TransitionContext,
): boolean {
  return resolveTransition(from, event, context) !== null;
}

/*
 * ── Analysis ────────────────────────────────────────────────────────────
 * These exist so the machine can be audited and drawn, not just run. The
 * reachability check is what surfaced that several authored scenes have no
 * operator path into them.
 */

/**
 * Faults arrive from the environment, not from an operator choosing them. They
 * are entered by injection (review dock, or a real telemetry event in
 * production), so having no inbound operator edge is correct rather than a gap.
 * They must still have a way *out*, which is what the recovery edges provide.
 */
export const FAULT_INJECTED_SCENES: SceneId[] = [
  "satellite-feed-loss",
  "network-degraded",
  "infrastructure-total-loss",
  "rescue-signal-degraded",
];

export interface MachineAudit {
  /** Scenes an operator can never reach and that are not injected faults. */
  unreachableScenes: SceneId[];
  /** Injected faults — no inbound operator edge by design. */
  faultOnlyScenes: SceneId[];
  /** Scenes with no outbound edge except the universal exits. */
  deadEndScenes: SceneId[];
  totalTransitions: number;
}

const ALL_SCENES: SceneId[] = [
  "baseline",
  "alert-command",
  "investigation-pending",
  "verify-active",
  "authority-notification-ready",
  "contain-recommended",
  "contain-alternate",
  "contain-degraded",
  "rescue-nominal",
  "rescue-signal-degraded",
  "monitoring-contested",
  "talon-reraise",
  "rescue-battery-critical",
  "satellite-feed-loss",
  "infrastructure-total-loss",
  "network-degraded",
  /*
   * Promoted states (vault 03's "planned" set — implemented in code since the
   * atlas pass). Listed here so auditMachine covers all 20 scenes, not 16.
   */
  "verify-source-conflict",
  "contain-awaiting-teams",
  "rescue-partial-evac",
  "handoff-pending",
];

export function auditMachine(): MachineAudit {
  const inbound = new Set(TRANSITIONS.map((transition) => transition.to));
  const outbound = new Set(
    TRANSITIONS.filter((transition) => transition.from !== "*").map((transition) => transition.from as SceneId),
  );

  const noInbound = ALL_SCENES.filter((scene) => scene !== "baseline" && !inbound.has(scene));

  return {
    unreachableScenes: noInbound.filter((scene) => !FAULT_INJECTED_SCENES.includes(scene)),
    faultOnlyScenes: noInbound.filter((scene) => FAULT_INJECTED_SCENES.includes(scene)),
    deadEndScenes: ALL_SCENES.filter((scene) => !outbound.has(scene)),
    totalTransitions: TRANSITIONS.length,
  };
}

export { ALL_SCENES };
