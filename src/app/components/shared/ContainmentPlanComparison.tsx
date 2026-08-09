import { compareContainmentPlans, getContainmentPlan } from "../../mockData";
import type { PlanVariant } from "../../tokens";
import {
  T,
  border,
  font,
  radius,
  space,
  tint,
  typeScale,
  typeWeight,
} from "../../tokens";

interface ContainmentPlanComparisonProps {
  activeVariant: PlanVariant;
}

const variants: PlanVariant[] = ["recommended", "alternate"];

function Metric({
  label,
  primary,
  comparison,
  favorable,
}: {
  label: string;
  primary: string;
  comparison: string;
  favorable: boolean | null;
}) {
  const color = favorable === null ? T.textMuted : favorable ? T.teal : T.amber;
  return (
    <div
      style={{
        paddingTop: space.sm,
        borderTop: `1px solid ${border.soft}`,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: space.sm,
      }}
    >
      <div style={{ gridColumn: "1 / -1", color: T.textMuted, fontFamily: font.sans, fontSize: typeScale.caption }}>
        {label}
      </div>
      <span style={{ color: T.textPrimary, fontFamily: font.mono, fontSize: typeScale.caption }}>{primary}</span>
      <span style={{ color, fontFamily: font.mono, fontSize: typeScale.caption, textAlign: "right" }}>{comparison}</span>
    </div>
  );
}

export function ContainmentPlanComparison({ activeVariant }: ContainmentPlanComparisonProps) {
  const recommended = getContainmentPlan("recommended");
  const alternate = getContainmentPlan("alternate");
  const active = getContainmentPlan(activeVariant);
  const alternateVariant: PlanVariant = activeVariant === "recommended" ? "alternate" : "recommended";
  const inactive = getContainmentPlan(alternateVariant);
  const delta = compareContainmentPlans(activeVariant, alternateVariant);

  return (
    <section aria-label="Containment plan comparison" data-testid="containment-plan-comparison">
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: space.sm,
          marginBottom: space.sm,
        }}
      >
        <div>
          <div style={{ color: T.textPrimary, fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold }}>
            Compare containment options
          </div>
          <div style={{ marginTop: space.xs, color: T.textMuted, fontFamily: font.sans, fontSize: typeScale.caption, lineHeight: 1.4 }}>
            Active selection is shown first. This is a decision comparison, not an override control.
          </div>
        </div>
        <span style={{ color: T.cyan, fontFamily: font.mono, fontSize: typeScale.metadata, whiteSpace: "nowrap" }}>
          {activeVariant === "recommended" ? "RECOMMENDED ACTIVE" : "ALTERNATE ACTIVE"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: space.sm }}>
        {variants.map((variant) => {
          const plan = variant === "recommended" ? recommended : alternate;
          const selected = variant === activeVariant;
          return (
            <article
              key={variant}
              style={{
                borderRadius: radius.control,
                border: `1px solid ${selected ? tint(T.cyan, 0.46) : border.soft}`,
                background: selected ? tint(T.cyan, 0.07) : "transparent",
                padding: space.md,
                minWidth: 0,
              }}
            >
              <div style={{ color: selected ? T.cyan : T.textPrimary, fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold }}>
                {variant === "recommended" ? "Recommended" : "Alternate"}
              </div>
              <div style={{ marginTop: space.xs, color: T.textMuted, fontFamily: font.sans, fontSize: typeScale.caption, lineHeight: 1.4 }}>
                {plan.sentence}
              </div>
              <div style={{ marginTop: space.sm, color: T.textSecondary, fontFamily: font.sans, fontSize: typeScale.caption, lineHeight: 1.45 }}>
                {plan.reasoning}
              </div>
            </article>
          );
        })}
      </div>

      <div style={{ marginTop: space.sm, display: "flex", flexDirection: "column", gap: space.sm }}>
        <Metric
          label="Protection ready"
          primary={`${active.eta.protectionReadyMinutes} min`}
          comparison={`${inactive.eta.protectionReadyMinutes} min`}
          favorable={delta.protectionReadyMinutesDelta < 0}
        />
        <Metric
          label="Structures protected"
          primary={`${active.protectedStructures.structuresCovered} (${active.protectedStructures.coveragePercent}%)`}
          comparison={`${inactive.protectedStructures.structuresCovered} (${inactive.protectedStructures.coveragePercent}%)`}
          favorable={delta.protectedStructuresDelta > 0}
        />
        <Metric
          label="Residual exposure"
          primary={`${active.exposure.structuresAtResidualRisk} structures`}
          comparison={`${inactive.exposure.structuresAtResidualRisk} structures`}
          favorable={delta.residualExposureDelta < 0}
        />
        <Metric
          label="Evidence confidence"
          primary={`${active.confidence.score}%`}
          comparison={`${inactive.confidence.score}%`}
          favorable={delta.confidenceDelta > 0}
        />
      </div>
    </section>
  );
}
