import type { ActionOutcomeVerification as ActionOutcomeVerificationModel } from "../../tokens";
import { T, border, font, radius, space, tint, typeScale, typeWeight } from "../../tokens";
import { PanelStateBlock } from "./RailPanelFrame";

export function ActionOutcomeVerification({
  verification,
}: {
  verification: ActionOutcomeVerificationModel | null | undefined;
}) {
  if (!verification) {
    return (
      <PanelStateBlock
        state="empty"
        title="No action awaiting verification"
        body="The next human-authorized action will record an expected outcome, observed result, and audit receipt here."
      />
    );
  }

  const attention =
    verification.deviationState === "deviated" || verification.deviationState === "unverifiable";
  const color = attention ? T.amber : verification.deviationState === "pending" ? T.cyan : T.teal;
  const status =
    verification.deviationState === "within-tolerance"
      ? "On track"
      : verification.deviationState === "deviated"
        ? "Attention required"
        : verification.deviationState === "unverifiable"
          ? "Cannot verify"
          : "Observation pending";

  return (
    <section
      aria-label="Observed outcome verification"
      data-testid="action-outcome-verification"
      style={{
        borderRadius: radius.tile,
        border: `1px solid ${tint(color, 0.3)}`,
        background: tint(color, 0.07),
        padding: `${space.md}px ${space.md}px`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: space.sm }}>
        <div style={{ color, fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold }}>
          {status}
        </div>
        <div style={{ color: T.textMuted, fontFamily: font.mono, fontSize: typeScale.metadata }}>
          {verification.timestamp}
        </div>
      </div>
      <div style={{ marginTop: space.xs, color: T.textPrimary, fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold }}>
        {verification.actionLabel}
      </div>

      <div style={{ display: "grid", gap: space.sm, marginTop: space.md }}>
        <OutcomeRow label="Expected" value={verification.expectedOutcome} />
        <OutcomeRow label="Observed" value={verification.observedOutcome} />
        <OutcomeRow label="Readout" value={verification.deviationSummary} />
      </div>

      <div style={{ marginTop: space.md, paddingTop: space.sm, borderTop: `1px solid ${tint(color, 0.2)}`, color: T.textMuted, fontFamily: font.mono, fontSize: typeScale.metadata }}>
        Audit receipt · {verification.auditId}
      </div>
    </section>
  );
}

function OutcomeRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: T.textMuted, fontFamily: font.sans, fontSize: typeScale.caption, fontWeight: typeWeight.semibold }}>
        {label}
      </div>
      <div style={{ marginTop: space.xs, color: T.textSecondary, fontFamily: font.sans, fontSize: typeScale.caption, lineHeight: 1.45 }}>
        {value}
      </div>
    </div>
  );
}
