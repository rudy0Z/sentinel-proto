import type {
  DissentDirection,
  DissentRecord,
  DissentResolution,
  EscalationBasis,
  OverrideReason,
  SceneId,
} from "../tokens";

/*
 * Human/AI disagreement.
 *
 * Every other failure model in this prototype describes infrastructure breaking
 * — a feed drops, a battery dies, a mesh goes stale. This file describes the
 * failure mode that actually matters for a supervised AI system: TALON and the
 * operator reach different conclusions from the same evidence.
 *
 * Three rules shape everything below.
 *
 *  1. The human decides. TALON never withholds an action the operator has
 *     authority to take, and never executes one they refused.
 *  2. Rejection is not deletion. An overruled hypothesis stays alive at reduced
 *     weight with a raised re-raise bar, so TALON can return with new evidence
 *     but cannot repeat itself.
 *  3. Dissent stays attached. The disagreement rides along with the artifact it
 *     affects and is answered once ground truth arrives — in both directions,
 *     including when TALON was the one that was wrong.
 */

const DISSENT_AUDIT_PREFIX = "AUD-DIS-0847";

/** TALON's stated position at the moment the operator overruled it. */
const TALON_POSITIONS: Record<DissentDirection, string> = {
  "talon-escalates":
    "Thermal, satellite IR, and burn-history signals converge at 78%. I assess this as an authority-notifiable wildfire risk and recommend escalation.",
  "talon-holds":
    "Evidence sits at 46%. Satellite confirmation is absent and the visual feed is smoke-obscured. I do not have grounds to recommend escalation yet.",
};

const TALON_CONFIDENCE: Record<DissentDirection, number> = {
  "talon-escalates": 78,
  "talon-holds": 46,
};

/*
 * How high the bar goes after an override, by stated reason.
 *
 * A "false positive" call is a strong claim about the world, so TALON needs a
 * correspondingly strong signal before it comes back. "Incomplete data" is a
 * claim about the evidence, not the incident — a smaller increment, because new
 * data is exactly what would settle it. An operational constraint is not a
 * disagreement about whether the fire is real at all, so the bar barely moves.
 */
const RE_RAISE_INCREMENT: Record<OverrideReason, number> = {
  "False positive": 16,
  "Incomplete data": 9,
  "Operational constraint": 4,
  Other: 12,
};

export function createDissent(input: {
  direction: DissentDirection;
  reason: OverrideReason;
  operatorNote?: string;
  recordedAt: string;
}): DissentRecord {
  const talonConfidence = TALON_CONFIDENCE[input.direction];

  return {
    id: `DIS-${input.direction === "talon-escalates" ? "REJ" : "ESC"}-0847`,
    direction: input.direction,
    reason: input.reason,
    operatorNote: input.operatorNote,
    talonPosition: TALON_POSITIONS[input.direction],
    talonConfidence,
    recordedAt: input.recordedAt,
    auditId: `${DISSENT_AUDIT_PREFIX}-${input.reason === "False positive" ? "FP" : "GEN"}`,
    reRaiseThreshold: Math.min(99, talonConfidence + RE_RAISE_INCREMENT[input.reason]),
  };
}

/**
 * TALON may only come back when new evidence clears the raised bar. Below it,
 * the hypothesis stays in contested watch and the operator is left alone.
 */
export function shouldReRaise(dissent: DissentRecord | null, currentConfidence: number): boolean {
  if (!dissent || dissent.direction !== "talon-escalates") return false;
  if (dissent.resolution) return false;
  return currentConfidence >= dissent.reRaiseThreshold;
}

export interface ReRaiseBrief {
  /** What is different since the override — never a restatement of the original case. */
  whatChanged: string[];
  confidenceThen: number;
  confidenceNow: number;
  /**
   * An appeal does not re-prompt the operator who already said no. It routes to
   * a second authority, which is the same escalation path used when an operator
   * is unresponsive.
   */
  escalatesTo: string;
  escalationReason: string;
}

export function getReRaiseBrief(dissent: DissentRecord, currentConfidence: number): ReRaiseBrief {
  return {
    whatChanged: [
      "Satellite IR returned and confirms a sustained NE-oriented delta that was unavailable at override.",
      "Thermal signature has held above baseline for eleven further minutes rather than decaying.",
      "Burn-history match strengthened as the perimeter shape resolved.",
    ],
    confidenceThen: dissent.talonConfidence,
    confidenceNow: currentConfidence,
    escalatesTo: "Regional Duty Supervisor",
    escalationReason:
      "The operator on shift has already assessed this incident and declined escalation. New evidence is routed to a second authority rather than re-prompting the same decision.",
  };
}

/**
 * Direction B: the operator escalates past TALON's hold. TALON complies, then
 * attaches its objection to the packet so the receiving authority sees the
 * basis they are acting on — and so the operator is not later judged against a
 * confidence number the system never actually offered.
 */
export function getPacketDissentNote(dissent: DissentRecord | null, basis: EscalationBasis): string | null {
  if (basis !== "operator-initiated" || !dissent || dissent.direction !== "talon-holds") {
    return null;
  }

  return `Operator-initiated escalation. TALON assessed ${dissent.talonConfidence}% and did not recommend notification; the operator escalated on ${dissent.reason.toLowerCase()}. Both positions are preserved under ${dissent.auditId}.`;
}

/*
 * Reconciliation. The loop closes in both directions — this is the part that
 * makes the governance real rather than decorative. A system that only records
 * the operator's mistakes is an audit trail; a system that also records its own
 * is a colleague.
 */
export function resolveDissent(
  dissent: DissentRecord,
  outcome: DissentResolution["outcome"],
  groundTruth: string,
  resolvedAt: string,
): DissentRecord {
  const systemResponse =
    outcome === "operator-correct"
      ? "Operator judgment confirmed. TALON lowered the weighting of this signature pattern for Grid 4C and logged the correction against the model version."
      : outcome === "talon-correct"
        ? "TALON assessment confirmed. The override is retained in the incident record with the evidence available at decision time, not with hindsight."
        : "Ground truth was not decisive. Both positions remain on the record and neither weighting is adjusted.";

  return {
    ...dissent,
    resolution: { outcome, groundTruth, resolvedAt, systemResponse },
  };
}

/** Scenes where an active disagreement changes what the surfaces should show. */
export const DISSENT_SCENES: SceneId[] = ["monitoring-contested", "talon-reraise"];

export function isDissentScene(scene: SceneId): boolean {
  return DISSENT_SCENES.includes(scene);
}

/**
 * Contested watch is not baseline. Baseline means nothing is happening;
 * contested means the operator closed something TALON still considers open.
 * The map and rails need to show that difference.
 */
export interface ContestedWatchState {
  zoneId: string;
  headline: string;
  detail: string;
  reRaiseThreshold: number;
  currentConfidence: number;
  /** Reduced-weight monitoring continues on exactly these sources. */
  watchedSources: string[];
}

export function getContestedWatch(dissent: DissentRecord | null, currentConfidence: number): ContestedWatchState | null {
  if (!dissent || dissent.direction !== "talon-escalates") return null;

  return {
    zoneId: "forest-north",
    headline: "Grid 4C — contested watch",
    detail: `Operator closed this incident as ${dissent.reason.toLowerCase()}. TALON is holding the hypothesis at reduced weight and will not re-raise below ${dissent.reRaiseThreshold}% confidence.`,
    reRaiseThreshold: dissent.reRaiseThreshold,
    currentConfidence,
    watchedSources: ["Thermal sensor", "Satellite IR", "Wind model", "Burn history"],
  };
}
