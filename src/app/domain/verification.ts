import type {
  ActionOutcomeVerification,
  SceneId,
  VerificationDeviationState,
} from "../tokens";

const DISPATCH_VERIFICATION: ActionOutcomeVerification = {
  id: "VER-0847-DISPATCH-01",
  actionId: "dispatch-scout",
  actionLabel: "Dispatch Lidar-02",
  auditId: "AUD-0847-DISPATCH-01",
  activityLogId: "log-12",
  expectedOutcome: "Lidar-02 reaches Grid 4C and begins thermal plus LiDAR capture within 90 seconds.",
  observedOutcome: "Lidar-02 reached Grid 4C in 27 seconds and began both requested capture modes.",
  deviationState: "within-tolerance",
  deviationSummary: "On-station 63 seconds inside the dispatch threshold.",
  timestamp: "03:48:12 UTC",
};

const REVIEW_VERIFICATION: ActionOutcomeVerification = {
  id: "VER-0847-REVIEW-01",
  actionId: "open-verification",
  actionLabel: "Open verification",
  auditId: "AUD-0847-REVIEW-01",
  activityLogId: "log-14",
  expectedOutcome: "Present the operator with converged evidence, confidence, and unresolved source limitations.",
  observedOutcome: "Evidence review opened at 78% confidence with smoke-obscured visual and stale fuel data disclosed.",
  deviationState: "within-tolerance",
  deviationSummary: "Required evidence and uncertainty fields were present.",
  timestamp: "03:48:18 UTC",
};

const AUTHORITY_PACKET_VERIFICATION: ActionOutcomeVerification = {
  id: "VER-0847-AUTHORITY-01",
  actionId: "notify-authorities",
  actionLabel: "Send Authority Packet",
  auditId: "AUD-90-0847",
  expectedOutcome: "Transmit the confirmed incident packet and preserve an operator-linked audit receipt.",
  observedOutcome: "Authority channels acknowledged the packet; receipt AUD-90-0847 is retained for handover.",
  deviationState: "within-tolerance",
  deviationSummary: "Packet delivery and audit linkage both confirmed.",
  timestamp: "03:48:41 UTC",
};

const CONTAINMENT_VERIFICATION: ActionOutcomeVerification = {
  id: "VER-0847-CONTAIN-01",
  actionId: "authorize-containment",
  actionLabel: "Authorize containment",
  auditId: "AUD-0847-CONTAIN-01",
  activityLogId: "log-30",
  expectedOutcome: "Stage perimeter coverage, responder ingress support, and residential route guidance.",
  observedOutcome: "Perimeter, ingress, and route-guidance tasks entered supervised execution.",
  deviationState: "within-tolerance",
  deviationSummary: "All three authorized workstreams reported active.",
  timestamp: "03:48:51 UTC",
};

const SIGNAL_DEVIATION_VERIFICATION: ActionOutcomeVerification = {
  ...CONTAINMENT_VERIFICATION,
  id: "VER-0847-CONTAIN-02",
  observedOutcome: "Perimeter and ingress tasks are active, but residential route telemetry is intermittent.",
  deviationState: "deviated",
  deviationSummary: "Primary relay degradation prevents continuous observation of the route-guidance outcome.",
  timestamp: "03:49:36 UTC",
};

const BATTERY_DEVIATION_VERIFICATION: ActionOutcomeVerification = {
  ...CONTAINMENT_VERIFICATION,
  id: "VER-0847-CONTAIN-03",
  observedOutcome: "Responder tasks remain active, but Lidar-02 cannot maintain the authorized perimeter refresh.",
  deviationState: "deviated",
  deviationSummary: "Battery threshold created a temporary perimeter coverage gap pending supervised handoff.",
  timestamp: "03:50:02 UTC",
};

const SCENE_VERIFICATIONS: Partial<
  Record<SceneId, ActionOutcomeVerification>
> = {
  "investigation-pending": DISPATCH_VERIFICATION,
  "verify-active": REVIEW_VERIFICATION,
  "authority-notification-ready": REVIEW_VERIFICATION,
  "contain-recommended": AUTHORITY_PACKET_VERIFICATION,
  "contain-alternate": AUTHORITY_PACKET_VERIFICATION,
  "contain-degraded": AUTHORITY_PACKET_VERIFICATION,
  "rescue-nominal": CONTAINMENT_VERIFICATION,
  "rescue-signal-degraded": SIGNAL_DEVIATION_VERIFICATION,
  "rescue-battery-critical": BATTERY_DEVIATION_VERIFICATION,
};

/** Returns a fresh fixture so scene state can own it without mutating shared data. */
export function createRecentActionVerification(
  scene: SceneId,
): ActionOutcomeVerification | null {
  const verification = SCENE_VERIFICATIONS[scene];
  return verification ? { ...verification } : null;
}

export function isVerificationClosed(
  verification: ActionOutcomeVerification | null | undefined,
): boolean {
  return (
    verification?.deviationState === "within-tolerance" ||
    verification?.deviationState === "deviated"
  );
}

export function verificationNeedsAttention(
  deviationState: VerificationDeviationState,
): boolean {
  return deviationState === "deviated" || deviationState === "unverifiable";
}
