import { useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import type { EvidenceSource, TalonAgentTask } from "../../tokens";
import {
  T,
  border,
  focus,
  font,
  motion,
  radius,
  space,
  surface,
  tint,
  tracking,
  typeScale,
  typeWeight,
} from "../../tokens";

export type SignalTone = "info" | "safe" | "caution" | "danger" | "neutral";

export function toneColor(signalTone: SignalTone) {
  switch (signalTone) {
    case "safe":
      return T.teal;
    case "caution":
      return T.amber;
    case "danger":
      return T.red;
    case "info":
      return T.cyan;
    case "neutral":
    default:
      return T.textMuted;
  }
}

export function sourceStatusTone(status: EvidenceSource["status"]): SignalTone {
  switch (status) {
    case "active":
      return "safe";
    case "stale":
      return "caution";
    case "failed":
    case "missing":
      return "danger";
    case "pending":
    default:
      return "neutral";
  }
}

export function agentStatusTone(status: TalonAgentTask["status"]): SignalTone {
  switch (status) {
    case "complete":
      return "safe";
    case "running":
      return "info";
    case "blocked":
      return "caution";
    case "failed":
      return "danger";
    case "queued":
    default:
      return "neutral";
  }
}

export function PanelHeroMetric({
  eyebrow,
  title,
  subtitle,
  metric,
  metricLabel,
  signalTone = "info",
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  metric?: string;
  metricLabel?: string;
  signalTone?: SignalTone;
  children?: ReactNode;
}) {
  const color = toneColor(signalTone);
  return (
    <div
      style={{
        borderBottom: `1px solid ${tint(color, 0.2)}`,
        background: "transparent",
        padding: `0 0 ${space.lg}px`,
        display: "flex",
        flexDirection: "column",
        gap: space.md,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: space.md }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: font.sans,
              fontSize: typeScale.label,
              color,
              fontWeight: typeWeight.bold,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontFamily: font.sans,
              fontSize: typeScale.subhead,
              fontWeight: typeWeight.bold,
              color: T.textPrimary,
              lineHeight: 1.2,
              marginTop: space.xs,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                fontFamily: font.sans,
                fontSize: typeScale.body,
                color: T.textSecondary,
                lineHeight: 1.45,
                marginTop: space.sm,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        {metric ? (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              style={{
                fontFamily: font.mono,
                fontVariantNumeric: "tabular-nums",
                fontSize: typeScale.heading,
                fontWeight: typeWeight.heavy,
                color,
                lineHeight: 1.25,
              }}
            >
              {metric}
            </div>
            {metricLabel ? (
              <div
                style={{
                  fontFamily: font.mono,
                  fontSize: typeScale.metadata,
                  color: T.textMuted,
                  marginTop: space.xs,
                }}
              >
                {metricLabel}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

const SIGNALBAR_CSS = `
  .sentinel-signal__fill { transition: width ${motion.deliberate}; }
  .sentinel-signal__trail { transition: width 420ms cubic-bezier(0.32, 0.72, 0, 1) 60ms; }
  @media (prefers-reduced-motion: reduce) {
    .sentinel-signal__fill, .sentinel-signal__trail { transition: none; }
    .sentinel-signal__trail { display: none; }
  }
`;

export function SignalBar({
  label,
  value,
  valueLabel,
  signalTone = "info",
  animated,
}: {
  label: string;
  value: number;
  valueLabel?: string;
  signalTone?: SignalTone;
  animated?: boolean;
}) {
  const color = toneColor(signalTone);
  const width = `${Math.max(0, Math.min(100, value))}%`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
      <style>{SIGNALBAR_CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
        <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary }}>{label}</span>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.label, color, fontWeight: typeWeight.bold }}>
          {valueLabel ?? `${Math.round(value)}%`}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: space.sm,
          borderRadius: radius.pill,
          background: surface.inset,
          border: `1px solid ${border.soft}`,
          overflow: "hidden",
        }}
      >
        {/* Trailing wash settles a beat behind the fill, so a moving value reads as motion rather than a jump. */}
        <div
          className="sentinel-signal__trail"
          style={{
            position: "absolute",
            inset: 0,
            width,
            borderRadius: radius.pill,
            background: tint(color, 0.32),
          }}
        />
        <div
          className="sentinel-signal__fill"
          style={{
            position: "relative",
            width,
            height: "100%",
            borderRadius: radius.pill,
            background: color,
            boxShadow: `inset 0 1px 0 ${tint(T.textPrimary, 0.16)}`,
            opacity: animated ? 1 : 0.88,
          }}
        />
      </div>
    </div>
  );
}

export function MetricTile({
  label,
  value,
  detail,
  signalTone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  signalTone?: SignalTone;
}) {
  const color = toneColor(signalTone);
  return (
    <div
      style={{
        minWidth: 0,
        padding: `${space.sm}px 0`,
        borderTop: `1px solid ${signalTone === "neutral" ? border.soft : tint(color, 0.16)}`,
      }}
    >
      <div
        style={{
          fontFamily: font.mono,
          fontSize: typeScale.label,
          color: T.textMuted,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: font.mono,
          fontSize: typeScale.body,
          fontWeight: typeWeight.bold,
          color: signalTone === "neutral" ? T.textPrimary : color,
          /* tnum: ETA/count readouts must not reflow as digits tick (vault 06 §3.2) */
          fontVariantNumeric: "tabular-nums",
          marginTop: space.xs,
          lineHeight: 1.3,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 2,
        }}
      >
        {value}
      </div>
      {detail ? (
        <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted, marginTop: space.xs }}>
          {detail}
        </div>
      ) : null}
    </div>
  );
}

export function MetricGrid({
  items,
  columns = 2,
}: {
  items: Array<Parameters<typeof MetricTile>[0]>;
  columns?: 2 | 3;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: space.sm }}>
      {items.map((item) => (
        <MetricTile key={`${item.label}-${item.value}`} {...item} />
      ))}
    </div>
  );
}

export function SourceFreshnessMatrix({ sources, limit = 5 }: { sources: EvidenceSource[]; limit?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {sources.slice(0, limit).map((source) => {
        const signalTone = sourceStatusTone(source.status);
        const color = toneColor(signalTone);
        const active = source.status === "active";
        return (
          <div
            key={source.id}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: space.sm,
              alignItems: "center",
              padding: `${space.sm}px 0`,
              borderBottom: `1px solid ${active ? tint(color, 0.16) : border.soft}`,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: space.sm, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: font.sans,
                    fontSize: typeScale.body,
                    color: T.textPrimary,
                    fontWeight: typeWeight.semibold,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {source.label}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: space.sm,
                  marginTop: space.xs,
                }}
              >
                <span
                  style={{
                    fontFamily: font.mono,
                    fontSize: typeScale.metadata,
                    color: T.textMuted,
                    letterSpacing: "0.04em",
                  }}
                >
                  {source.lastUpdated}
                </span>
                <div style={{ flex: 1, minWidth: space["2xl"] }}>
                  <SignalBar
                    label=""
                    value={source.confidence}
                    valueLabel=" "
                    signalTone={signalTone}
                    animated={source.status === "active"}
                  />
                </div>
              </div>
            </div>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: typeScale.label,
                color,
                fontWeight: typeWeight.bold,
              }}
            >
              {source.status === "active" || source.status === "stale" ? `${source.confidence}%` : source.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function CapabilityMatrix({
  items,
}: {
  items: Array<{ label: string; state: string; detail?: string; signalTone?: SignalTone }>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((item) => {
        const signalTone = item.signalTone ?? "neutral";
        const color = toneColor(signalTone);
        return (
          <div
            key={`${item.label}-${item.state}`}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: space.sm,
              alignItems: "center",
              padding: `${space.sm}px 0`,
              borderBottom: `1px solid ${signalTone === "neutral" ? border.soft : tint(color, 0.16)}`,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textPrimary, fontWeight: typeWeight.semibold }}>
                {item.label}
              </div>
              {item.detail ? (
                <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted, marginTop: space.xs, lineHeight: 1.4 }}>
                  {item.detail}
                </div>
              ) : null}
            </div>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: typeScale.label,
                color,
                fontWeight: typeWeight.bold,
                whiteSpace: "nowrap",
              }}
            >
              {item.state}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/*
 * Agent Relay — a known rail-bottom clipper (§3 C1): busy scenes carry more
 * relay entries than the panel can hold. The strip clamps to `limit` visible
 * rows and reports the remainder as a "+n more" disclosure so the count is
 * never silently swallowed by the panel edge. Full per-agent state stays in
 * the TALON copilot rail; this strip is a relay, not the ledger.
 */
export function AgentRelayStrip({ agents, limit = 2 }: { agents: TalonAgentTask[]; limit?: number }) {
  const relayAgents = agents.filter(
    (agent) => agent.status === "running" || agent.status === "blocked" || agent.status === "failed" || agent.status === "complete",
  );
  const activeAgents = relayAgents.slice(0, limit);
  const hiddenCount = Math.max(0, relayAgents.length - activeAgents.length);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {activeAgents.map((agent) => {
        const signalTone = agentStatusTone(agent.status);
        const color = toneColor(signalTone);
        return (
          <div
            key={agent.id}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              alignItems: "center",
              gap: space.sm,
              padding: `${space.sm}px 0`,
              borderBottom: `1px solid ${agent.status === "running" ? tint(color, 0.18) : border.soft}`,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: font.sans,
                  fontSize: typeScale.body,
                  color: T.textPrimary,
                  fontWeight: typeWeight.semibold,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {agent.agentName}
              </div>
              <div
                style={{
                  fontFamily: font.sans,
                  fontSize: typeScale.label,
                  color: agent.blocker ? T.textSecondary : T.textMuted,
                  marginTop: space.xs,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {agent.blocker ?? agent.output ?? agent.currentTask}
              </div>
            </div>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: typeScale.label,
                color,
                fontWeight: typeWeight.bold,
              }}
            >
              {agent.status}
            </span>
          </div>
        );
      })}
      {hiddenCount > 0 ? (
        <div
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.eyebrow,
            color: T.textMuted,
            letterSpacing: tracking.telemetry,
            textTransform: "uppercase",
            padding: `${space.sm}px 0 ${space.xs}px`,
            borderTop: `1px solid ${border.soft}`,
          }}
        >
          +{hiddenCount} more agent{hiddenCount === 1 ? "" : "s"}
        </div>
      ) : null}
    </div>
  );
}

const SPARK_W = 100;
const SPARK_H = 28;
const SPARK_PAD = 3;
const SPARK_INSET = 1.5;

const SPARKLINE_CSS = `
  .sentinel-spark { outline: none; }
  .sentinel-spark:focus-visible { outline: ${focus.outline}; outline-offset: 2px; border-radius: ${radius.dense}px; }
  .sentinel-spark__path {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
    animation: sentinelSparkDraw 260ms cubic-bezier(0.23, 1, 0.32, 1) both;
  }
  .sentinel-spark__area { animation: sentinelSparkFade 260ms cubic-bezier(0.23, 1, 0.32, 1) both; }
  @keyframes sentinelSparkDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
  @keyframes sentinelSparkFade { from { opacity: 0; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .sentinel-spark__path, .sentinel-spark__area { animation: none; }
  }
`;

/**
 * Compact trend line. One series, one readout: hover or focus reports the exact
 * sample instead of asking the operator to eyeball a bar height.
 */
export function MiniTrend({
  label,
  values,
  signalTone = "info",
  unit = "",
}: {
  label: string;
  values: number[];
  signalTone?: SignalTone;
  /** Appended to the readout, e.g. "%" or "°C". */
  unit?: string;
}) {
  const color = toneColor(signalTone);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const series = values.length > 0 ? values : [0];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;

  // Endpoints keep a small inset so the marker dot never clips at the panel edge.
  const points = series.map((value, index) => ({
    value,
    x:
      series.length === 1
        ? SPARK_W / 2
        : SPARK_INSET + (index / (series.length - 1)) * (SPARK_W - SPARK_INSET * 2),
    y: SPARK_PAD + (1 - (value - min) / span) * (SPARK_H - SPARK_PAD * 2),
  }));
  const line = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const areaShape = `${points[0].x.toFixed(2)},${SPARK_H} ${line} ${points[points.length - 1].x.toFixed(2)},${SPARK_H}`;

  const latest = points[points.length - 1];
  const active = hoverIndex === null ? latest : points[hoverIndex];
  const readout = `${Math.round(active.value)}${unit}${hoverIndex === null ? " · now" : ""}`;

  function trackPointer(event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    setHoverIndex(Math.round(ratio * (series.length - 1)));
  }

  return (
    <div
      style={{
        padding: `${space.sm}px 0 0`,
        borderTop: `1px solid ${border.soft}`,
      }}
    >
      <style>{SPARKLINE_CSS}</style>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: space.sm,
          marginBottom: space.sm,
        }}
      >
        <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted }}>{label}</span>
        <span
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.label,
            fontWeight: typeWeight.bold,
            color,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {readout}
        </span>
      </div>
      <div
        className="sentinel-spark"
        role="img"
        tabIndex={0}
        aria-label={`${label}: latest ${Math.round(latest.value)}${unit}, ${series.length} samples, range ${Math.round(min)}${unit} to ${Math.round(max)}${unit}`}
        style={{ position: "relative", height: SPARK_H, cursor: "crosshair" }}
        onPointerMove={trackPointer}
        onPointerLeave={() => setHoverIndex(null)}
        onBlur={() => setHoverIndex(null)}
      >
        <svg
          width="100%"
          height={SPARK_H}
          viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <polygon className="sentinel-spark__area" points={areaShape} fill={tint(color, 0.14)} />
          <polyline
            className="sentinel-spark__path"
            points={line}
            fill="none"
            stroke={color}
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
          />
        </svg>
        {/*
         * The marker and hairline live in HTML, not the SVG: the chart stretches
         * horizontally, which would smear a circle into an ellipse.
         */}
        {hoverIndex !== null ? (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: `${active.x}%`,
              top: active.y,
              bottom: 0,
              width: 1,
              background: tint(color, 0.3),
            }}
          />
        ) : null}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: `${active.x}%`,
            top: active.y,
            width: 5,
            height: 5,
            marginLeft: -2.5,
            marginTop: -2.5,
            borderRadius: "50%",
            background: color,
            transition: `left ${motion.fast}, top ${motion.fast}`,
          }}
        />
      </div>
    </div>
  );
}
