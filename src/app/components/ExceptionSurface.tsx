import type { OperationalException, OperationalExceptionSeverity, QuickActionId } from "../tokens";
import { T, font, radius, space, border, motion, shadow, surface, tint, typeScale, typeWeight } from "../tokens";
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
        borderRadius: radius.md,
        padding: "3px 8px",
        whiteSpace: "nowrap",
        textDecoration: online ? "none" : "line-through",
        opacity: online ? 1 : 0.7,
      }}
    >
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
        animation: `slideInDown ${motion.normal}`,
      }}
      role="status"
      aria-live="polite"
      aria-label={`${exception.title}. ${exception.confidenceImpact}`}
    >
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
              fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color,
              background: tint(color, 0.08), border: `1px solid ${tint(color, 0.24)}`, borderRadius: radius.md, padding: "2px 6px",
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
            <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted }}>Estimated restore</div>
            <div style={{ fontFamily: font.mono, fontSize: typeScale.body, color: T.textSecondary, marginTop: 2 }}>{restoreEta}</div>
          </div>
        )}
      </div>

      {/* Source state row — what broke / what survived */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", paddingTop: 8, borderTop: `1px solid ${border.subtle}` }}>
        <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: T.red, marginRight: 2 }}>Offline</span>
        {exception.affectedSources.slice(0, 3).map((s) => <SourceChip key={s} label={s} online={false} />)}
        <span style={{ width: 1, height: 14, background: border.strong, margin: "0 4px" }} aria-hidden="true" />
        <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: T.teal, marginRight: 2 }}>Online</span>
        {exception.fallbackInputs.slice(0, 3).map((s) => <SourceChip key={s} label={s} online />)}
      </div>

      {/* Impact + recovery row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted }}>{metric.label}</span>
          <span style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 700, color }}>{metric.value}</span>
        </div>
        <div style={{ flex: 1 }} />
        {/* Exceptions panel pointer — full detail is always in the right rail */}
        <span style={{
          fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted,
          display: "flex", alignItems: "center", gap: 4,
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
              display: "inline-flex", alignItems: "center", gap: 7,
              fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.bold,
              color, background: tint(color, 0.12), border: `1px solid ${color}`,
              borderRadius: 9, padding: "7px 14px", cursor: "pointer",
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
    background: surface.overlay,
    borderRadius: radius.overlay,
    border: `1px solid ${tint(color, 0.3)}`,
    boxShadow: shadow.quiet,
    padding: `${space["2xl"]}px ${space["3xl"]}px`,
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
        animation: `slideInDown ${motion.normal}`,
      }}
      role="region"
      aria-live="assertive"
      aria-label={`${exception.title}. Operator acknowledgement required.`}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <OperationalIcon name="warning" color={color} size={15} />
        <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold, color }}>
          TALON supervised handoff · Human gate
        </span>
      </div>

      <div style={{ fontFamily: font.sans, fontSize: 15, fontWeight: 700, color: T.textPrimary, marginBottom: 5 }}>
        {exception.title}: acknowledgement required
      </div>
      <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.5, marginBottom: 12 }}>
        {exception.auditText} {exception.confidenceImpact}
      </div>

      {(recallAsset || coverageAsset) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {recallAsset && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: tint(T.red, 0.08), border: `1px solid ${tint(T.red, 0.2)}` }}>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: T.red, marginBottom: 4 }}>Recalling</div>
              <div style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{recallAsset.name}</div>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, marginTop: 2 }}>{recallAsset.detail}</div>
            </div>
          )}
          {coverageAsset && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: tint(T.teal, 0.08), border: `1px solid ${tint(T.teal, 0.2)}` }}>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: T.teal, marginBottom: 4 }}>Coverage ready</div>
              <div style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{coverageAsset.name}</div>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, marginTop: 2 }}>{coverageAsset.detail}</div>
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
          cursor: "pointer",
        }}
      >
        Authorize supervised handoff
      </button>
    </div>
  );
}
