import type { DissentOutcome, DissentRecord } from "../tokens";
import { T, font, layer, motion, radius, shadow, space, surface, tint, typeScale, typeWeight } from "../tokens";
import { getContestedWatch, getReRaiseBrief, resolveDissent } from "../domain/disagreement";

/*
 * Surfaces for the two disagreement states.
 *
 * Both exist to answer the question an operator actually has after overruling
 * an AI: "so what is it doing now?" A system that silently returns to normal
 * teaches the operator that their override was meaningless. A system that
 * nags teaches them to stop reading it. These sit between the two — visible,
 * quiet, and bounded by a threshold the operator can see.
 */

function DissentRecordCard({ dissent }: { dissent: DissentRecord }) {
  return (
    <div
      style={{
        padding: `${space.lg}px ${space.xl}px`,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: radius.card,
        display: "grid",
        gap: space.md,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: space.md }}>
        <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMuted }}>
          Operator decision
        </span>
        <span style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted }}>{dissent.recordedAt}</span>
      </div>

      <div style={{ fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.semibold, color: T.textPrimary }}>
        Closed as {dissent.reason.toLowerCase()}
      </div>

      {dissent.operatorNote && (
        <div
          style={{
            fontFamily: font.sans,
            fontSize: typeScale.label,
            color: T.textSecondary,
            lineHeight: 1.55,
            borderLeft: `2px solid ${tint(T.textMuted, 0.4)}`,
            paddingLeft: space.md,
          }}
        >
          “{dissent.operatorNote}”
        </div>
      )}

      {/* TALON's position is preserved verbatim, not summarised away. */}
      <div
        style={{
          paddingTop: space.md,
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "grid",
          gap: space.xs,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: T.cyan }}>
            TALON position at override
          </span>
          <span style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted }}>{dissent.talonConfidence}%</span>
        </div>
        <p style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary, lineHeight: 1.55, margin: 0 }}>
          {dissent.talonPosition}
        </p>
      </div>

      <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted }}>
        Audit {dissent.auditId}
      </div>
    </div>
  );
}

/**
 * The threshold meter. This is the whole idea made visible: evidence is still
 * accruing, and there is a specific, stated bar it must cross before TALON is
 * allowed to speak again. The operator can see exactly how much room is left.
 */
function ThresholdMeter({ current, threshold }: { current: number; threshold: number }) {
  const pct = Math.min(100, Math.max(0, current));
  const markerPct = Math.min(100, Math.max(0, threshold));
  const remaining = Math.max(0, threshold - current);
  const close = remaining <= 6;

  return (
    <div style={{ display: "grid", gap: space.sm }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMuted }}>
          Evidence under reduced weighting
        </span>
        <span
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.body,
            fontWeight: typeWeight.bold,
            color: close ? T.amber : T.cyan,
            transition: `color ${motion.normal}`,
          }}
        >
          {current}%
        </span>
      </div>

      <div
        style={{
          position: "relative",
          height: 6,
          borderRadius: radius.pill,
          background: "rgba(255,255,255,0.06)",
          overflow: "visible",
        }}
        role="meter"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Evidence confidence ${current} percent, re-raise threshold ${threshold} percent`}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: radius.pill,
            background: close ? T.amber : T.cyan,
            transition: `width 900ms cubic-bezier(0.22, 1, 0.36, 1), background ${motion.normal}`,
          }}
        />
        {/* The bar TALON must clear before it may return. */}
        <div
          style={{
            position: "absolute",
            left: `${markerPct}%`,
            top: -4,
            bottom: -4,
            width: 2,
            background: T.amber,
            borderRadius: 1,
          }}
          aria-hidden="true"
        />
      </div>

      <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary, lineHeight: 1.5 }}>
        {remaining > 0
          ? `TALON stays silent until ${threshold}% — ${remaining} points away.`
          : `Threshold reached. TALON is escalating to a second authority.`}
      </div>
    </div>
  );
}

export function ContestedWatchPanel({
  dissent,
  currentConfidence,
  onResolve,
}: {
  dissent: DissentRecord;
  currentConfidence: number;
  onResolve: () => void;
}) {
  const watch = getContestedWatch(dissent, currentConfidence);
  if (!watch) return null;

  return (
    <section
      style={{
        width: 380,
        background: surface.overlay,
        border: `1px solid ${tint(T.cyan, 0.24)}`,
        borderRadius: radius.overlay,
        boxShadow: shadow.quiet,
        padding: `${space.xl}px ${space["2xl"]}px`,
        display: "grid",
        gap: space.xl,
        animation: `slideInDown ${motion.normal}`,
      }}
      aria-label="Contested watch"
    >
      <header style={{ display: "grid", gap: space.xs }}>
        <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: T.cyan }}>
          Watch retained
        </span>
        <h2
          style={{
            fontFamily: font.sans,
            fontSize: typeScale.subhead,
            fontWeight: typeWeight.bold,
            color: T.textPrimary,
            margin: 0,
          }}
        >
          {watch.headline}
        </h2>
        <p style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary, lineHeight: 1.55, margin: 0 }}>
          {watch.detail}
        </p>
      </header>

      <ThresholdMeter current={watch.currentConfidence} threshold={watch.reRaiseThreshold} />

      <DissentRecordCard dissent={dissent} />

      <div style={{ display: "grid", gap: space.sm }}>
        <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMuted }}>
          Still watching
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: space.xs }}>
          {watch.watchedSources.map((source) => (
            <span
              key={source}
              style={{
                fontFamily: font.sans,
                fontSize: typeScale.label,
                color: T.textSecondary,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: radius.pill,
                padding: "3px 10px",
              }}
            >
              {source}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onResolve}
        style={{
          fontFamily: font.sans,
          fontSize: typeScale.body,
          fontWeight: typeWeight.semibold,
          color: T.textSecondary,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: radius.lg,
          padding: "9px 0",
          cursor: "pointer",
          transition: `background ${motion.fast}`,
        }}
      >
        Ground truth arrived — close this out
      </button>
    </section>
  );
}

export function ReRaiseBriefPanel({
  dissent,
  currentConfidence,
  onEscalate,
  onDecline,
}: {
  dissent: DissentRecord;
  currentConfidence: number;
  onEscalate: () => void;
  onDecline: () => void;
}) {
  const brief = getReRaiseBrief(dissent, currentConfidence);

  return (
    <section
      style={{
        width: 440,
        background: surface.overlay,
        border: `1px solid ${tint(T.amber, 0.32)}`,
        borderRadius: radius.overlay,
        boxShadow: shadow.quiet,
        padding: `${space.xl}px ${space["2xl"]}px`,
        display: "grid",
        gap: space.xl,
        animation: `slideInDown ${motion.normal}`,
      }}
      aria-label="TALON re-raise brief"
      role="region"
      aria-live="polite"
    >
      <header style={{ display: "grid", gap: space.xs }}>
        <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: T.amber }}>
          Threshold crossed
        </span>
        <h2
          style={{
            fontFamily: font.sans,
            fontSize: typeScale.subhead,
            fontWeight: typeWeight.bold,
            color: T.textPrimary,
            margin: 0,
          }}
        >
          Something changed since the override.
        </h2>
      </header>

      {/* Then → now. An appeal has to show movement, not restate the first case. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: space.lg,
          padding: `${space.md}px ${space.xl}px`,
          background: tint(T.amber, 0.07),
          border: `1px solid ${tint(T.amber, 0.2)}`,
          borderRadius: radius.card,
        }}
      >
        <div style={{ display: "grid", gap: 2 }}>
          <span style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, textTransform: "uppercase" }}>At override</span>
          <span style={{ fontFamily: font.mono, fontSize: typeScale.subhead, color: T.textSecondary }}>{brief.confidenceThen}%</span>
        </div>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.body, color: T.amber }}>→</span>
        <div style={{ display: "grid", gap: 2 }}>
          <span style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, textTransform: "uppercase" }}>Now</span>
          <span style={{ fontFamily: font.mono, fontSize: typeScale.subhead, fontWeight: typeWeight.bold, color: T.amber }}>
            {brief.confidenceNow}%
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gap: space.sm }}>
        <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMuted }}>
          New evidence only
        </span>
        <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: space.sm }}>
          {brief.whatChanged.map((line) => (
            <li key={line} style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary, lineHeight: 1.55 }}>
              {line}
            </li>
          ))}
        </ul>
      </div>

      {/* The appeal routes away from the operator who already decided. */}
      <div
        style={{
          padding: `${space.lg}px ${space.xl}px`,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: radius.card,
          display: "grid",
          gap: space.xs,
        }}
      >
        <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMuted }}>
          Routed to
        </span>
        <span style={{ fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.semibold, color: T.textPrimary }}>
          {brief.escalatesTo}
        </span>
        <p style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary, lineHeight: 1.55, margin: 0 }}>
          {brief.escalationReason}
        </p>
      </div>

      <div style={{ display: "flex", gap: space.md }}>
        <button
          type="button"
          onClick={onDecline}
          style={{
            flex: 1,
            fontFamily: font.sans,
            fontSize: typeScale.body,
            fontWeight: typeWeight.semibold,
            color: T.textSecondary,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: radius.lg,
            padding: "10px 0",
            cursor: "pointer",
          }}
        >
          Decline again
        </button>
        <button
          type="button"
          onClick={onEscalate}
          style={{
            flex: 1,
            fontFamily: font.sans,
            fontSize: typeScale.body,
            fontWeight: typeWeight.bold,
            color: T.amber,
            background: tint(T.amber, 0.16),
            border: `1px solid ${T.amber}`,
            borderRadius: radius.lg,
            padding: "10px 0",
            cursor: "pointer",
            transition: `background ${motion.fast}`,
          }}
        >
          Prepare authority packet
        </button>
      </div>
    </section>
  );
}

/*
 * Reconciliation.
 *
 * The loop closes here, and it closes in both directions. A system that only
 * records the operator's mistakes is an audit trail pointed at one party; one
 * that also records its own is a colleague. This panel is deliberately willing
 * to say "TALON was wrong" in the same voice it would say the opposite.
 *
 * The verdict is not chosen — it falls out of the machine. Reaching this point
 * from contested watch without the evidence ever crossing the re-raise bar is
 * itself the finding: the signal decayed, so the operator read it correctly.
 */
const OUTCOME_COPY: Record<DissentOutcome, { label: string; tone: string; headline: string }> = {
  "operator-correct": {
    label: "Operator was right",
    tone: T.teal,
    headline: "TALON over-read the signal.",
  },
  "talon-correct": {
    label: "TALON was right",
    tone: T.red,
    headline: "The override delayed a real escalation.",
  },
  inconclusive: {
    label: "Inconclusive",
    tone: T.textMuted,
    headline: "Ground truth could not settle it.",
  },
};

export function ReconciliationPanel({
  dissent,
  outcome,
  groundTruth,
  resolvedAt,
  onClose,
}: {
  dissent: DissentRecord;
  outcome: DissentOutcome;
  groundTruth: string;
  resolvedAt: string;
  onClose: () => void;
}) {
  const resolved = resolveDissent(dissent, outcome, groundTruth, resolvedAt);
  const copy = OUTCOME_COPY[outcome];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: layer.entry,
        background: "rgba(4,8,14,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: `fadeIn ${motion.normal}`,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Disagreement reconciliation"
    >
      <div
        style={{
          width: 560,
          background: surface.overlay,
          border: `1px solid ${tint(copy.tone, 0.3)}`,
          borderRadius: radius.overlay,
          boxShadow: shadow.quiet,
          padding: `${space["2xl"]}px ${space["3xl"]}px`,
          display: "grid",
          gap: space.xl,
        }}
      >
        <header style={{ display: "grid", gap: space.xs }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: copy.tone }}>
              {copy.label}
            </span>
            <span style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted }}>{resolvedAt}</span>
          </div>
          <h2
            style={{
              fontFamily: font.sans,
              fontSize: typeScale.heading,
              fontWeight: typeWeight.bold,
              color: T.textPrimary,
              margin: 0,
            }}
          >
            {copy.headline}
          </h2>
        </header>

        <div
          style={{
            padding: `${space.lg}px ${space.xl}px`,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: radius.card,
            display: "grid",
            gap: space.xs,
          }}
        >
          <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: T.textMuted }}>
            Ground truth
          </span>
          <p style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textSecondary, lineHeight: 1.6, margin: 0 }}>
            {groundTruth}
          </p>
        </div>

        {/* Both positions, side by side, judged on what was knowable at the time. */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.md }}>
          <div
            style={{
              padding: `${space.lg}px ${space.xl}px`,
              background: outcome === "operator-correct" ? tint(T.teal, 0.08) : "rgba(255,255,255,0.03)",
              border: `1px solid ${outcome === "operator-correct" ? tint(T.teal, 0.3) : "rgba(255,255,255,0.08)"}`,
              borderRadius: radius.card,
              display: "grid",
              gap: space.xs,
            }}
          >
            <span style={{ fontFamily: font.mono, fontSize: 9, textTransform: "uppercase", color: T.textMuted }}>Operator said</span>
            <span style={{ fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.semibold, color: T.textPrimary }}>
              {dissent.reason}
            </span>
          </div>
          <div
            style={{
              padding: `${space.lg}px ${space.xl}px`,
              background: outcome === "talon-correct" ? tint(T.red, 0.08) : "rgba(255,255,255,0.03)",
              border: `1px solid ${outcome === "talon-correct" ? tint(T.red, 0.3) : "rgba(255,255,255,0.08)"}`,
              borderRadius: radius.card,
              display: "grid",
              gap: space.xs,
            }}
          >
            <span style={{ fontFamily: font.mono, fontSize: 9, textTransform: "uppercase", color: T.textMuted }}>TALON said</span>
            <span style={{ fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.semibold, color: T.textPrimary }}>
              Escalate · {dissent.talonConfidence}%
            </span>
          </div>
        </div>

        {/* What the system actually changes as a result — the point of the loop. */}
        <div
          style={{
            padding: `${space.lg}px ${space.xl}px`,
            background: tint(copy.tone, 0.06),
            border: `1px solid ${tint(copy.tone, 0.2)}`,
            borderRadius: radius.card,
            display: "grid",
            gap: space.xs,
          }}
        >
          <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: copy.tone }}>
            System response
          </span>
          <p style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary, lineHeight: 1.6, margin: 0 }}>
            {resolved.resolution?.systemResponse}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted }}>Audit {dissent.auditId}</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: font.sans,
              fontSize: typeScale.body,
              fontWeight: typeWeight.bold,
              color: copy.tone,
              background: tint(copy.tone, 0.16),
              border: `1px solid ${copy.tone}`,
              borderRadius: radius.lg,
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            File and return to watch
          </button>
        </div>
      </div>
    </div>
  );
}
