import type { ReactNode } from "react";
import type { EvidenceSource, TalonAgentTask } from "../../tokens";
import {
  T,
  border,
  font,
  radius,
  space,
  surface,
  tint,
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
        padding: `0 0 ${space["2xl"]}px`,
        display: "flex",
        flexDirection: "column",
        gap: space.lg,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: space.lg }}>
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
                fontSize: typeScale.heading,
                fontWeight: typeWeight.heavy,
                color,
                lineHeight: 1,
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.md }}>
        <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary }}>{label}</span>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.label, color, fontWeight: typeWeight.bold }}>
          {valueLabel ?? `${Math.round(value)}%`}
        </span>
      </div>
      <div
        style={{
          height: space.sm,
          borderRadius: radius.pill,
          background: surface.inset,
          border: `1px solid ${border.soft}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width,
            height: "100%",
            borderRadius: radius.pill,
            background: color,
            transition: "width 260ms ease",
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
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: space.md }}>
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
              gap: space.md,
              alignItems: "center",
              padding: `${space.md}px 0`,
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
                  gap: space.md,
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
                <div style={{ flex: 1, minWidth: space["5xl"] }}>
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
              gap: space.md,
              alignItems: "center",
              padding: `${space.md}px 0`,
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

export function AgentRelayStrip({ agents, limit = 3 }: { agents: TalonAgentTask[]; limit?: number }) {
  const activeAgents = agents
    .filter((agent) => agent.status === "running" || agent.status === "blocked" || agent.status === "failed" || agent.status === "complete")
    .slice(0, limit);

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
              gap: space.md,
              padding: `${space.md}px 0`,
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
    </div>
  );
}

export function MiniTrend({
  label,
  values,
  signalTone = "info",
}: {
  label: string;
  values: number[];
  signalTone?: SignalTone;
}) {
  const color = toneColor(signalTone);
  return (
    <div
      style={{
        padding: `${space.md}px 0 0`,
        borderTop: `1px solid ${border.soft}`,
      }}
    >
      <div
        style={{
          fontFamily: font.sans,
          fontSize: typeScale.label,
          color: T.textMuted,
          marginBottom: space.md,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: space.xs, height: space["5xl"] }}>
        {values.map((value, index) => (
          <div
            key={`${label}-${index}`}
            style={{
              flex: 1,
              minWidth: space.xs,
              height: `${Math.max(12, Math.min(100, value))}%`,
              borderRadius: `${radius.xs}px ${radius.xs}px 0 0`,
              background: tint(color, index === values.length - 1 ? 0.95 : 0.42),
              transition: "height 260ms ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
