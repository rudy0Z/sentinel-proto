import type { ShellState } from "../tokens";
import { T } from "../tokens";
import { GATED_ACTIONS, getEvidenceSources, getTalonRecommendation } from "./talon";

/*
 * ─── The one state derivation ────────────────────────────────────────────────
 *
 * Everything TALON *says about itself* — the orb ring color, the mark's motion
 * state, the ambient voice eyebrow and line — derives from this single function.
 * Before it existed, four surfaces each re-derived TALON's state from different
 * sources (conversation phase, actionSurface, hand-passed flags) and could
 * disagree on one screen: a "quiet watch" voice above a THRESHOLD CROSSED
 * panel, an idle-cyan ring under an amber gate line.
 *
 * The source of truth is the incident state (scene + gate + exceptions), not
 * `actionSurface` alone and not the conversation phase. `actionSurface` is an
 * input for deciding whether a gate is *waiting on the operator*; it is never
 * the source of "what is happening."
 *
 * Postures, in priority order:
 *   blocked   — a failure or conflict prevents progress; words name it
 *   contested — the operator overrode TALON; TALON holds at reduced weight
 *   gated     — a consequential command is staged and waits on the operator
 *   alert     — anomaly under active review (popups own the commands)
 *   working   — supervised work or staged recommendations, nothing waiting
 *   quiet     — baseline watch; explicitly nothing is waiting
 */
export type TalonSurfaceMarkState =
  | "watching"
  | "listening"
  | "searching"
  | "solving"
  | "gated"
  | "executing"
  | "blocked"
  | "receipt";

export type TalonPosture = "quiet" | "working" | "gated" | "contested" | "blocked" | "alert";

export interface TalonSurfaceContext {
  /** verify-active source-conflict calibrator; lives outside ShellState today. */
  burnPermitVerified: boolean;
}

export interface TalonSurface {
  posture: TalonPosture;
  /** Ring + voice color. Session-open phases may override locally. */
  tone: string;
  markState: TalonSurfaceMarkState;
  /** Uppercase eyebrow above the command surface. */
  postureLabel: string;
  /** The one sentence the command surface says. Never duplicates a rail brief. */
  postureLine: string;
  /** Present only when a staged command waits on the operator. */
  gateLabel: string | null;
}

function findRecommended(state: ShellState) {
  return [...state.actionSurface.primary, ...state.actionSurface.secondary].find(
    (action) => action.status === "recommended",
  );
}

function findGatedRecommended(state: ShellState) {
  return [...state.actionSurface.primary, ...state.actionSurface.secondary].find(
    (action) => action.status === "recommended" && GATED_ACTIONS.has(action.id),
  );
}

function activeSourceCount(scene: ShellState["scene"]): number {
  return getEvidenceSources(scene).filter((source) => source.status === "active").length;
}

/**
 * The scene-keyed posture table. Only scenes whose state is not expressible by
 * the generic rules below live here — everything else falls through to the
 * gate/working/quiet derivation so a new scene cannot silently render a false
 * "quiet watch".
 */
const SCENE_POSTURES: Partial<
  Record<ShellState["scene"], Omit<TalonSurface, "gateLabel" | "tone"> & { tone?: string }>
> = {
  "alert-command": {
    posture: "alert",
    markState: "searching",
    postureLabel: "Anomaly flagged",
    postureLine: "Reviewing the thermal rise against burn history before any escalation.",
  },
  "investigation-pending": {
    posture: "working",
    markState: "searching",
    postureLabel: "Scout en route",
    postureLine: "Lidar-02 is on approach — the evidence frame is building.",
  },
  "monitoring-contested": {
    posture: "contested",
    markState: "gated",
    postureLabel: "Contested watch",
    postureLine: "TALON is holding at reduced weight — silent until the agreed threshold.",
  },
  "talon-reraise": {
    posture: "contested",
    markState: "gated",
    postureLabel: "Threshold crossed",
    postureLine: "New evidence crossed the override threshold. TALON awaits supervisor review.",
  },
  "satellite-feed-loss": {
    posture: "blocked",
    markState: "blocked",
    postureLabel: "Satellite feed lost",
    postureLine: "Satellite IR is offline. Fallback evidence holds at reduced confidence.",
  },
  "network-degraded": {
    posture: "blocked",
    markState: "blocked",
    postureLabel: "Network degraded",
    postureLine: "Telemetry is on low bandwidth. Authorization gates stay blocked until freshness recovers.",
  },
  "contain-degraded": {
    posture: "blocked",
    markState: "blocked",
    postureLabel: "Terrain degraded",
    postureLine: "The terrain model is degraded — TALON widened the spread buffer.",
  },
  "rescue-signal-degraded": {
    posture: "blocked",
    markState: "blocked",
    postureLabel: "Relay degraded",
    postureLine: "Relay signal is down. A backup route is staged — approval reroutes field assets.",
  },
  "rescue-battery-critical": {
    posture: "gated",
    markState: "gated",
    postureLabel: "Battery critical",
    postureLine: "Supervised recall is staged. Perimeter changes stay gated.",
  },
  "infrastructure-total-loss": {
    posture: "blocked",
    markState: "blocked",
    postureLabel: "Infrastructure lost",
    postureLine: "Command execution has moved to manual protocol.",
    tone: T.red,
  },
  "verify-source-conflict": {
    posture: "contested",
    markState: "gated",
    postureLabel: "Source conflict",
    postureLine: "Satellite and burn records disagree — verification holds until you reconcile them.",
    tone: T.amber,
  },
  "contain-awaiting-teams": {
    posture: "working",
    markState: "searching",
    postureLabel: "Awaiting teams",
    postureLine: "Packet delivered. Holding the staging picture until run-card crews report in.",
    tone: T.cyan,
  },
  "rescue-partial-evac": {
    posture: "alert",
    markState: "gated",
    postureLabel: "Partial evacuation",
    postureLine: "Route A compromised mid-egress. Route B shift is staged — awaiting your authorization.",
    tone: T.red,
  },
  "handoff-pending": {
    posture: "gated",
    markState: "gated",
    postureLabel: "Handover open",
    postureLine: "Authority is unassigned until the incoming lead confirms with the PIN.",
    tone: T.amber,
  },
};

export function deriveTalonSurface(
  state: ShellState,
  context: TalonSurfaceContext,
): TalonSurface {
  const scene = state.scene;
  const sceneEntry = SCENE_POSTURES[scene];

  /*
   * The verify-active gate is the one scene where a *source conflict*, not a
   * staged command, is what blocks progress — and the calibrator lives outside
   * ShellState, so it arrives through context.
   */
  if (scene === "verify-active" && !context.burnPermitVerified) {
    return {
      posture: "blocked",
      tone: T.amber,
      markState: "blocked",
      postureLabel: "Source conflict",
      postureLine:
        "Thermal anomaly reads as fire; Satellite IR reads a controlled agricultural burn. TALON will not prepare the packet until you resolve which is true.",
      gateLabel: null,
    };
  }

  const recommended = findRecommended(state);
  const gatedRecommended = findGatedRecommended(state);

  /*
   * The scene table always wins: these postures ARE the incident's truth, and
   * their staged commands (a recovery, the fork's forward position) sit beside
   * the voice rather than redefining it. The re-raise says "threshold crossed"
   * even though "Prepare authority packet" is staged — the command is visible
   * next to the voice, not instead of it.
   */
  if (sceneEntry) {
    return {
      posture: sceneEntry.posture,
      tone: sceneEntry.tone ?? T.amber,
      markState: sceneEntry.markState,
      postureLabel: sceneEntry.postureLabel,
      postureLine: sceneEntry.postureLine,
      gateLabel: null,
    };
  }

  if (gatedRecommended) {
    return {
      posture: "gated",
      tone: T.amber,
      markState: "gated",
      postureLabel: "Human authorization required",
      postureLine: `${gatedRecommended.label} is staged. The authorization is yours.`,
      gateLabel: gatedRecommended.label,
    };
  }

  const inProgress = [...state.actionSurface.primary, ...state.actionSurface.secondary].find(
    (action) => action.status === "in-progress",
  );
  if (inProgress) {
    return {
      posture: "working",
      tone: T.cyan,
      markState: "executing",
      postureLabel: "Supervised execution",
      postureLine: `${inProgress.label} is executing under supervision.`,
      gateLabel: null,
    };
  }

  const staged = findRecommended(state);
  if (staged) {
    return {
      posture: "working",
      tone: T.cyan,
      markState: "solving",
      postureLabel: "Operator review",
      postureLine: `${staged.label} is staged for your review.`,
      gateLabel: null,
    };
  }

  if (scene === "baseline") {
    const live = activeSourceCount(scene);
    return {
      posture: "quiet",
      tone: T.cyan,
      markState: "watching",
      postureLabel: "Quiet watch",
      postureLine:
        live > 0
          ? `TALON is watching ${live} source${live === 1 ? "" : "s"}. Nothing has crossed the escalation threshold.`
          : "TALON is holding. No operator action is required.",
      gateLabel: null,
    };
  }

  /*
   * Any scene not covered above is an active incident moment with no staged
   * command — say what TALON is doing, never invent quiet.
   */
  return {
    posture: "working",
    tone: T.cyan,
    markState: "searching",
    postureLabel: getTalonRecommendation(state).action,
    postureLine: "TALON is synthesizing the next accountable decision.",
    gateLabel: null,
  };
}
