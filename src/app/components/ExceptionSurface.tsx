import type { OperationalException, OperationalExceptionSeverity, QuickActionId } from "../tokens";
import { T, font, radius, space, border, tint } from "../tokens";
import { COMMAND_LABELS } from "../domain/microcopy";
import { OperationalIcon } from "./OperationalIcon";

// ─── Shared severity language ────────────────────────────────────────────────
// One visual vocabulary for every failure state. Severity drives color; the
// OperationalException model drives the content. This is what makes a failure
// feel like part of the system instead of a one-off screen.

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

/** Restore-time and impact metric hints per exception, parsed from the model. */
function impactMetric(ex: OperationalException): { label: string; value: string } {
  if (ex.confidenceImpact.includes("40%")) return { label: "Spatial confidence", value: "40% ↓" };
  if (ex.id === "battery-critical") return { label: "Perimeter continuity", value: "At risk" };
  if (ex.id === "network-degraded") return { label: "Decision latency", value: "340ms ↑" };
  if (ex.id === "terrain-model-degraded") return { label: "Spread buffer", value: "Widened" };
  if (ex.id === "signal-degraded") return { label: "Route confidence", value: "Reduced" };
  return { label: "Impact", value: ex.severity === "critical" ? "Severe" : "Degraded" };
}

// ─── Chip rows: what broke, what survived ─────────────────────────────────────

function SourceChip({ label, online }: { label: string; online: boolean }) {
  const color = online ? T.teal : T.textMuted;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: font.sans,
        fontSize: 10,
        color: online ? T.textSecondary : T.textMuted,
        background: online ? tint(T.teal, 0.07) : "rgba(255,255,255,0.03)",
        border: `1px solid ${online ? tint(T.teal, 0.22) : border.subtle}`,
        borderRadius: radius.sm,
        padding: "3px 8px",
        whiteSpace: "nowrap",
        textDecoration: online ? "none" : "line-through",
        opacity: online ? 1 : 0.7,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

// ─── ExceptionBanner ──────────────────────────────────────────────────────────
// Persistent system-status strip for degraded states (satellite, network).
// Sits in the map lane so the failure reads against the common operating picture.
// The same OperationalException also drives the right-rail ExceptionPanel and the
// blocked agents in TALON Workforce — so the failure is felt across the whole system.

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
        animation: "slideInDown 280ms cubic-bezier(0.34,1.3,0.64,1)",
      }}
      role="status"
      aria-live="polite"
      aria-label={`${exception.title}. ${exception.confidenceImpact}`}
    >
      {/* Severity edge */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color, borderRadius: "16px 0 0 16px" }} aria-hidden="true" />

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          background: tint(color, 0.12), border: `1px solid ${tint(color, 0.32)}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <OperationalIcon name="warning" color={color} size={15} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: font.sans, fontSize: 14, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
              {exception.title}
            </span>
            <span style={{
              fontFamily: font.mono, fontSize: 9, fontWeight: 700, color, letterSpacing: "0.1em", textTransform: "uppercase",
              background: tint(color, 0.12), border: `1px solid ${tint(color, 0.3)}`, borderRadius: 4, padding: "1px 6px",
            }}>
              {severityLabel(exception.severity)}
            </span>
          </div>
          <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary, marginTop: 2, lineHeight: 1.4 }}>
            {exception.auditText}
          </div>
        </div>
        {restoreEta && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Est. Restore</div>
            <div style={{ fontFamily: font.mono, fontSize: 12, color: T.textSecondary, marginTop: 2 }}>{restoreEta}</div>
          </div>
        )}
      </div>

      {/* Source state row — what broke / what survived */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", paddingTop: 8, borderTop: `1px solid ${border.subtle}` }}>
        <span style={{ fontFamily: font.mono, fontSize: 9, color: T.red, letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 2 }}>Offline</span>
        {exception.affectedSources.slice(0, 3).map((s) => <SourceChip key={s} label={s} online={false} />)}
        <span style={{ width: 1, height: 14, background: border.strong, margin: "0 4px" }} aria-hidden="true" />
        <span style={{ fontFamily: font.mono, fontSize: 9, color: T.teal, letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 2 }}>Online</span>
        {exception.fallbackInputs.slice(0, 3).map((s) => <SourceChip key={s} label={s} online />)}
      </div>

      {/* Impact + recovery row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>{metric.label}</span>
          <span style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 700, color }}>{metric.value}</span>
        </div>
        <div style={{ flex: 1 }} />
        {exception.recommendedRecoveryCommand && onRecover && (
          <button
            type="button"
            onClick={() => onRecover(exception.recommendedRecoveryCommand!)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              fontFamily: font.sans, fontSize: 11, fontWeight: 700,
              color, background: tint(color, 0.12), border: `1px solid ${color}`,
              borderRadius: 9, padding: "7px 14px", cursor: "pointer",
              letterSpacing: "0.04em", textTransform: "uppercase",
              transition: "background 120ms ease",
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
    background: "rgba(8, 12, 22, 0.92)",
    backdropFilter: "blur(28px) saturate(1.4)",
    WebkitBackdropFilter: "blur(28px) saturate(1.4)",
    borderRadius: 16,
    border: `1px solid ${tint(color, 0.3)}`,
    boxShadow: `0 0 0 1px ${tint(color, 0.06)}, 0 20px 48px rgba(0,0,0,0.42)`,
    padding: "14px 18px 14px 22px",
    overflow: "hidden" as const,
  };
}

// ─── ExceptionInterrupt ───────────────────────────────────────────────────────
// Modal interrupt for exceptions that require an explicit human acknowledgement
// before TALON proceeds (battery handoff). Same visual language as the banner,
// elevated to demand a decision. Reinforces: TALON prepares, the human authorizes.

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
        animation: "slideInDown 280ms cubic-bezier(0.34,1.3,0.64,1)",
      }}
      role="alertdialog"
      aria-modal="true"
      aria-label={`${exception.title}. Operator acknowledgement required.`}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color, borderRadius: "16px 0 0 16px" }} aria-hidden="true" />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, animation: "pulse 1s infinite", flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontFamily: font.mono, fontSize: 9, fontWeight: 700, color, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          TALON · Supervised Handoff · Human Gate
        </span>
      </div>

      <div style={{ fontFamily: font.sans, fontSize: 15, fontWeight: 700, color: T.textPrimary, marginBottom: 5 }}>
        {exception.title} — acknowledgement required
      </div>
      <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.5, marginBottom: 12 }}>
        {exception.auditText} {exception.confidenceImpact}
      </div>

      {(recallAsset || coverageAsset) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {recallAsset && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: tint(T.red, 0.08), border: `1px solid ${tint(T.red, 0.2)}` }}>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.red, letterSpacing: "0.08em", marginBottom: 4 }}>RECALLING</div>
              <div style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{recallAsset.name}</div>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, marginTop: 2 }}>{recallAsset.detail}</div>
            </div>
          )}
          {coverageAsset && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: tint(T.teal, 0.08), border: `1px solid ${tint(T.teal, 0.2)}` }}>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.teal, letterSpacing: "0.08em", marginBottom: 4 }}>COVERAGE READY</div>
              <div style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{coverageAsset.name}</div>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, marginTop: 2 }}>{coverageAsset.detail}</div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onAcknowledge}
        style={{
          width: "100%", padding: "11px 0", borderRadius: 9,
          background: tint(color, 0.12), border: `1px solid ${color}`, color,
          fontFamily: font.sans, fontSize: 12, fontWeight: 700,
          letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer",
        }}
      >
        Acknowledge & authorize handoff
      </button>
    </div>
  );
}
