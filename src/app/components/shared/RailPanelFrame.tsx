import type { ReactNode } from "react";
import type { PanelVariant } from "../../tokens";
import { GLASS, T, border, focus, font, motion, panel, radius, shadow, space, surface, tint, tone, typeScale, typeWeight } from "../../tokens";
import { StatusPill } from "./StatusPill";

function variantChrome(variant: PanelVariant) {
  switch (variant) {
    case "focus":
      return { borderColor: tint(T.cyan, 0.22), background: surface.panelDense };
    case "dense":
      return { borderColor: border.strong, background: surface.panelDense };
    case "degraded":
      return { borderColor: tone.caution.border, background: tint(T.amber, 0.06) };
    case "blocked":
      return { borderColor: tone.danger.border, background: tint(T.red, 0.06) };
    case "handoff":
      return { borderColor: tone.safe.border, background: tint(T.teal, 0.06) };
    case "takeover":
      return { borderColor: tone.danger.border, background: surface.overlay };
    case "compact":
    case "standard":
    default:
      return { borderColor: border.subtle, background: surface.panel };
  }
}

export function RailPanelFrame({
  children,
  flex = 1,
  variant = "standard",
  minHeight,
}: {
  children: ReactNode;
  flex?: number;
  variant?: PanelVariant;
  minHeight?: number;
}) {
  const chrome = variantChrome(variant);
  return (
    <div
      style={{
        ...GLASS,
        flex,
        minHeight: minHeight ?? (variant === "compact" ? panel.minCompactHeight : variant === "focus" ? panel.minFocusHeight : panel.minStandardHeight),
        overflow: "hidden",
        borderColor: chrome.borderColor,
        background: chrome.background,
      }}
      data-panel-variant={variant}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  badgeLabel,
  badgeColor,
  metric,
  actionLabel,
  onAction,
}: {
  title: string;
  badgeLabel?: string;
  badgeColor?: string;
  metric?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      style={{
        minHeight: panel.headerHeight,
        padding: `${space["2xl"]}px ${panel.bodyPadding}px ${space.xl}px`,
        borderBottom: `1px solid ${border.subtle}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: space.lg,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: space.lg, minWidth: 0 }}>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: typeScale.title,
            fontWeight: typeWeight.semibold,
            color: T.textPrimary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
        {metric ? (
          <span
            style={{
              fontFamily: font.mono,
              fontSize: typeScale.metadata,
              color: T.textMuted,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {metric}
          </span>
        ) : null}
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            aria-label={actionLabel}
            style={{
              fontFamily: font.mono,
              fontSize: typeScale.caption,
              color: T.textMuted,
              letterSpacing: "0.06em",
              cursor: "pointer",
              padding: `${space.xs}px ${space.md}px`,
              borderRadius: radius.md,
              border: `1px solid ${border.default}`,
              background: surface.control,
              textTransform: "uppercase",
              transition: `background ${motion.fast}, border-color ${motion.fast}, color ${motion.fast}`,
            }}
            onFocus={(event) => {
              event.currentTarget.style.boxShadow = focus.ring;
            }}
            onBlur={(event) => {
              event.currentTarget.style.boxShadow = "none";
            }}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      {badgeLabel && badgeColor ? <StatusPill label={badgeLabel} color={badgeColor} /> : null}
    </div>
  );
}

export function PanelBody({
  children,
  density = "standard",
}: {
  children: ReactNode;
  density?: "compact" | "standard" | "dense";
}) {
  const bodyPadding = density === "compact" ? panel.bodyPaddingCompact : panel.bodyPadding;
  const gap = density === "dense" ? panel.itemGap : panel.sectionGap;
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: `${bodyPadding}px ${panel.bodyPadding}px ${panel.bodyPadding}px`,
        display: "flex",
        flexDirection: "column",
        gap,
      }}
    >
      {children}
    </div>
  );
}

export function PanelSection({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: space.lg }}>
      {label ? (
        <div
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.eyebrow,
            color: T.textMuted,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PanelMetricRow({ label, value, tone: rowTone = T.textPrimary }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: space.md }}>
      <span style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textMuted }}>{label}</span>
      <span style={{ fontFamily: font.mono, fontSize: typeScale.caption, color: rowTone, fontWeight: typeWeight.semibold }}>{value}</span>
    </div>
  );
}

export function PanelStateBlock({
  state,
  title,
  body,
}: {
  state: "empty" | "loading" | "degraded" | "blocked" | "complete";
  title: string;
  body: string;
}) {
  const stateTone = state === "blocked" ? T.red : state === "degraded" ? T.amber : state === "complete" ? T.teal : T.cyan;
  return (
    <div
      style={{
        borderRadius: radius.lg,
        border: `1px solid ${tint(stateTone, 0.26)}`,
        background: tint(stateTone, 0.07),
        padding: `${space.lg}px ${space.xl}px`,
        boxShadow: shadow.quiet,
      }}
    >
      <div style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold, color: stateTone, marginBottom: space.xs }}>
        {title}
      </div>
      <div style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, lineHeight: 1.45 }}>{body}</div>
    </div>
  );
}

export function PanelExceptionCard({
  title,
  severity,
  body,
}: {
  title: string;
  severity: "advisory" | "degraded" | "blocked" | "critical";
  body: string;
}) {
  const severityTone = severity === "critical" || severity === "blocked" ? T.red : severity === "degraded" ? T.amber : T.cyan;
  return (
    <div
      style={{
        borderRadius: radius.lg,
        border: `1px solid ${tint(severityTone, 0.3)}`,
        background: tint(severityTone, 0.08),
        padding: `${space.lg}px ${space.xl}px`,
      }}
    >
      <div style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: severityTone, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: space.xs }}>
        {severity}
      </div>
      <div style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold, color: T.textPrimary, marginBottom: space.xs }}>{title}</div>
      <div style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, lineHeight: 1.45 }}>{body}</div>
    </div>
  );
}

export function PanelDataViz({ value, color = T.cyan }: { value: number; color?: string }) {
  return (
    <div style={{ height: space.sm, borderRadius: radius.pill, background: border.subtle, overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: "100%",
          borderRadius: radius.pill,
          background: color,
          transition: `width ${motion.deliberate}`,
        }}
      />
    </div>
  );
}
