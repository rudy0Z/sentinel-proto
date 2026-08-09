import type { OperationalException, OperationalExceptionSeverity, QuickActionId } from "../tokens";
import { T, font, radius, space, border, material, motion, tint, tracking, typeScale, typeStyle, typeWeight } from "../tokens";
import { COMMAND_LABELS } from "../domain/microcopy";
import { OperationalIcon } from "./OperationalIcon";

function severityColor(severity: OperationalExceptionSeverity): string {
  switch (severity) {
    case "critical": return T.red;
    case "blocked": return T.red;
    case "degraded": return T.amber;
    case "advisory": return T.yellow;
    default: return T.amber;
  }
}

function severityLabel(severity: OperationalExceptionSeverity): string {
  switch (severity) {
    case "critical": return "Critical";
    case "blocked": return "Blocked";
    case "degraded": return "Degraded";
    case "advisory": return "Advisory";
    default: return "Active";
  }
}

function impactMetric(ex: OperationalException): { label: string; value: string } {
  if (ex.confidenceImpact.includes("40%")) return { label: "Spatial confidence", value: "40% ↓" };
  if (ex.id === "battery-critical") return { label: "Perimeter continuity", value: "At risk" };
  if (ex.id === "network-degraded") return { label: "Decision latency", value: "340ms ↑" };
  if (ex.id === "terrain-model-degraded") return { label: "Spread buffer", value: "Widened" };
  if (ex.id === "signal-degraded") return { label: "Route confidence", value: "Reduced" };
  return { label: "Impact", value: ex.severity === "critical" ? "Severe" : "Degraded" };
}

function SourceChip({ label, online }: { label: string; online: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
        fontFamily: font.sans,
        fontSize: typeScale.label,
        color: online ? T.textSecondary : T.textMuted,
        background: "transparent",
        border: `1px solid ${online ? tint(T.teal, 0.22) : border.subtle}`,
        borderRadius: radius.control,
        padding: `${space.xs}px ${space.sm}px`,
        whiteSpace: "nowrap",
        textDecoration: online ? "none" : "line-through",
        opacity: online ? 1 : 0.7,
      }}
    >
      {label}
    </span>
  );
}

export function ExceptionBanner({
  exception,
  onRecover,
  restoreEta,
}: {
  exception: OperationalException;
  onRecover?: (cmd: QuickActionId) => void;
  restoreEta?: string;
}) {
  const color = severityColor(exception.severity);
  const metric = impactMetric(exception);

  return (
    <div
      style={{
        ...bannerShell(color),
        animation: `slideInDown ${motion.normal}`,
      }}
      role="status"
      aria-live="polite"
      aria-label={`${exception.title}. ${exception.confidenceImpact}`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: space.md, marginBottom: space.sm }}>
        <div style={{
          width: 32, height: 32, borderRadius: radius.tile, flexShrink: 0,
          background: tint(color, 0.12), border: `1px solid ${tint(color, 0.32)}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <OperationalIcon name="warning" color={color} size={15} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
            <span style={{ fontFamily: font.sans, fontSize: typeStyle.brand.size, fontWeight: typeStyle.brand.weight, color: T.textPrimary, letterSpacing: tracking.tight, whiteSpace: "nowrap" }}>
              {exception.title}
            </span>
            <span style={{
              fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color,
              background: tint(color, 0.08), border: `1px solid ${tint(color, 0.24)}`, borderRadius: radius.control, padding: `${space.xs}px ${space.sm}px`,
            }}>
              {severityLabel(exception.severity)}
            </span>
          </div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary, marginTop: space.xs, lineHeight: `${typeStyle.label.lineHeight}px` }}>
            {exception.auditText}
          </div>
        </div>
        {restoreEta && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted }}>Estimated restore</div>
            <div style={{ fontFamily: font.mono, fontSize: typeScale.body, color: T.textSecondary, marginTop: space.xs }}>{restoreEta}</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, alignItems: "center", paddingTop: space.sm, borderTop: `1px solid ${border.subtle}` }}>
        <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: T.red, marginRight: space.xs }}>Offline</span>
        {exception.affectedSources.slice(0, 3).map((s) => <SourceChip key={s} label={s} online={false} />)}
        <span style={{ width: 1, height: space.md, background: border.strong, margin: `0 ${space.xs}px` }} aria-hidden="true" />
        <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: T.teal, marginRight: space.xs }}>Online</span>
        {exception.fallbackInputs.slice(0, 3).map((s) => <SourceChip key={s} label={s} online />)}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: space.md, marginTop: space.sm }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: space.sm }}>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted }}>{metric.label}</span>
          <span style={{ fontFamily: font.mono, fontSize: typeScale.title, fontWeight: typeWeight.bold, color }}>{metric.value}</span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{
          fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted,
          display: "flex", alignItems: "center", gap: space.xs,
        }}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
            <path d="M2 4h4M4 2l2 2-2 2" stroke={T.textMuted} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Exceptions panel
        </span>
        {exception.recommendedRecoveryCommand && onRecover && (
          <button
            type="button"
            onClick={() => onRecover(exception.recommendedRecoveryCommand!)}
            style={{
              display: "inline-flex", alignItems: "center", gap: space.sm,
              fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.bold,
              color, background: tint(color, 0.12), border: `1px solid ${color}`,
              borderRadius: radius.tile, padding: `${space.sm}px ${space.md}px`, cursor: "pointer",
              transition: `background ${motion.fast}`,
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = tint(color, 0.2))}
            onMouseOut={(e) => (e.currentTarget.style.background = tint(color, 0.12))}
          >
            {COMMAND_LABELS[exception.recommendedRecoveryCommand]}
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </div>
  );
}

function bannerShell(color: string) {
  return {
    position: "relative" as const,
    ...material.overlay,
    border: `1px solid ${tint(color, 0.3)}`,
    padding: `${space.lg}px ${space.lg}px`,
    overflow: "hidden" as const,
  };
}

export function ExceptionInterrupt({
  exception,
  recallAsset,
  coverageAsset,
  onAcknowledge,
}: {
  exception: OperationalException;
  recallAsset?: { name: string; detail: string };
  coverageAsset?: { name: string; detail: string };
  onAcknowledge: () => void;
}) {
  const color = severityColor(exception.severity);

  return (
    <div
      style={{
        ...bannerShell(color),
        width: 480,
        animation: `slideInDown ${motion.normal}`,
      }}
      role="region"
      aria-live="assertive"
      aria-label={`${exception.title}. Operator acknowledgement required.`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: space.sm, marginBottom: space.sm }}>
        <OperationalIcon name="warning" color={color} size={15} />
        <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold, color }}>
          TALON supervised handoff · Human gate
        </span>
      </div>

      <div style={{ fontFamily: font.sans, fontSize: typeStyle.panelTitle.size, fontWeight: typeWeight.bold, color: T.textPrimary, marginBottom: space.xs }}>
        {exception.title}: acknowledgement required
      </div>
      <div style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textSecondary, lineHeight: `${typeStyle.body.lineHeight}px`, marginBottom: space.md }}>
        {exception.auditText} {exception.confidenceImpact}
      </div>

      {(recallAsset || coverageAsset) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.sm, marginBottom: space.md }}>
          {recallAsset && (
            <div style={{ padding: `${space.sm}px ${space.md}px`, borderRadius: radius.control, background: tint(T.red, 0.08), border: `1px solid ${tint(T.red, 0.2)}` }}>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: T.red, marginBottom: space.xs }}>Recalling</div>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.semibold, color: T.textPrimary }}>{recallAsset.name}</div>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, marginTop: space.xs }}>{recallAsset.detail}</div>
            </div>
          )}
          {coverageAsset && (
            <div style={{ padding: `${space.sm}px ${space.md}px`, borderRadius: radius.control, background: tint(T.teal, 0.08), border: `1px solid ${tint(T.teal, 0.2)}` }}>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: T.teal, marginBottom: space.xs }}>Coverage ready</div>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.semibold, color: T.textPrimary }}>{coverageAsset.name}</div>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, marginTop: space.xs }}>{coverageAsset.detail}</div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onAcknowledge}
        style={{
          width: "100%", padding: `${space.sm}px 0`, borderRadius: radius.tile,
          background: tint(color, 0.12), border: `1px solid ${color}`, color,
          fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.bold,
          cursor: "pointer",
        }}
      >
        Authorize supervised handoff
      </button>
    </div>
  );
}
