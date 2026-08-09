import type { ReactNode } from "react";
import type { PanelVariant } from "../../tokens";
import { T, border, focus, font, material, motion, panel, radius, space, surface, tint, tone, typeScale, typeWeight, tracking } from "../../tokens";
import { StatusPill } from "./StatusPill";
import { RailSectionLabel } from "./Section";

/*
 * Variants differ by border and semantic wash only. The base surface is always
 * the rail material — a panel inside a frosted rail must not become a second,
 * denser slab (see DESIGN.md § Materials).
 */
function variantChrome(variant: PanelVariant) {
  switch (variant) {
    case "focus":
      return { borderColor: tint(T.cyan, 0.22), background: material.rail.background };
    case "dense":
      return { borderColor: border.strong, background: material.rail.background };
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
      return { borderColor: border.subtle, background: material.rail.background };
  }
}

export function RailPanelFrame({
  children,
  variant = "standard",
  minHeight,
}: {
  children: ReactNode;
  /** @deprecated panels now size to content; the rail scrolls as one column */
  flex?: number;
  variant?: PanelVariant;
  minHeight?: number;
}) {
  const chrome = variantChrome(variant);
  return (
    <div
      style={{
        // Size to content (not a forced flex fraction). A tiny floor only avoids
        // collapse; the rail scrolls as a single column when total exceeds height.
        flex: "0 0 auto",
        minHeight: minHeight ?? 52,
        overflow: "hidden",
        borderRadius: radius.panel,
        border: `1px solid ${chrome.borderColor}`,
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
  accessory,
}: {
  title: string;
  badgeLabel?: string;
  badgeColor?: string;
  metric?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional control rendered on the right of the header (e.g. a small toggle) */
  accessory?: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: panel.headerHeight,
        padding: `${space.lg}px ${panel.bodyPadding}px`,
        borderBottom: `1px solid ${border.subtle}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: space.md,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: space.md, minWidth: 0 }}>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: typeScale.subhead,
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
              letterSpacing: tracking.telemetry,
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
              fontFamily: font.sans,
              fontSize: typeScale.label,
              color: T.textMuted,
              cursor: "pointer",
              padding: `${space.xs}px ${space.sm}px`,
              borderRadius: radius.control,
              border: `1px solid ${border.default}`,
              background: surface.control,
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
      <div style={{ display: "flex", alignItems: "center", gap: space.sm, flexShrink: 0 }}>
        {accessory}
        {badgeLabel && badgeColor ? <StatusPill label={badgeLabel} color={badgeColor} /> : null}
      </div>
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
        // Content flows naturally — the panel sizes to it and the rail scrolls as
        // one column. (No per-panel internal scroll = no cramped windows.)
        overflowY: "visible",
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
    <section style={{ display: "flex", flexDirection: "column", gap: space.md }}>
      {label ? <RailSectionLabel>{label}</RailSectionLabel> : null}
      {children}
    </section>
  );
}

export function PanelMetricRow({ label, value, tone: rowTone = T.textPrimary }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: space.sm }}>
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
        borderRadius: radius.tile,
        border: `1px solid ${tint(stateTone, 0.26)}`,
        background: tint(stateTone, 0.07),
        padding: `${space.md}px ${space.md}px`,
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
        borderRadius: radius.tile,
        border: `1px solid ${tint(severityTone, 0.3)}`,
        background: tint(severityTone, 0.08),
        padding: `${space.md}px ${space.md}px`,
      }}
    >
      <div style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: severityTone, marginBottom: space.xs }}>
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
