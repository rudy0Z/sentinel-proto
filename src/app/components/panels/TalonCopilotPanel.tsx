import { useContext, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  LockKeyhole,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { RailChromeContext } from "../shared/railChrome";
import type {
  SceneId,
  ShellState,
  TalonAgentTask,
  EvidenceSource,
} from "../../tokens";
import { T, border, font, radius, space, surface, tint, tone, typeScale, typeWeight, tracking } from "../../tokens";
import {
  getAuthorityPacket,
  getEvidenceSources,
  getSignalHistory,
  getTalonInteractionModel,
} from "../../domain/talon";
import { getPacketDissentNote } from "../../domain/disagreement";

interface TalonCopilotPanelProps {
  state: ShellState;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusColor(status: EvidenceSource["status"]): string {
  switch (status) {
    case "active": return T.teal;
    case "pending": return T.textMuted;
    case "stale": return T.yellow;
    case "failed": return T.red;
    case "missing": return T.red;
    default: return T.textMuted;
  }
}

function getAgentStatusColor(status: TalonAgentTask["status"]): string {
  switch (status) {
    case "complete": return T.teal;
    case "running": return T.cyan;
    case "blocked": return T.amber;
    case "queued": return T.textMuted;
    case "failed": return T.red;
    default: return T.textMuted;
  }
}

function getAgentStatusLabel(status: TalonAgentTask["status"]): string {
  switch (status) {
    case "complete": return "Done";
    case "running": return "Running";
    case "blocked": return "Blocked";
    case "queued": return "Queued";
    case "failed": return "Failed";
    }
}

// ─── High-Fidelity Scanning & Shimmer Helpers ─────────────────────────────────

function ScanningRing() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: space.lg, height: space.lg, flexShrink: 0 }}>
      <svg width={space.lg} height={space.lg} viewBox="0 0 36 36" style={{ animation: "spin 2s linear infinite" }}>
        <circle cx="18" cy="18" r="15" fill="none" stroke={tint(T.cyan, 0.15)} strokeWidth="3" />
        <circle cx="18" cy="18" r="15" fill="none" stroke={T.cyan} strokeWidth="3" strokeDasharray="30 50" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function TelemetryShimmerCard({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: `${space.sm}px ${space.md}px`,
        borderRadius: radius.control,
        background: surface.inset,
        border: `1px solid ${border.soft}`,
        display: "flex",
        flexDirection: "column",
        gap: space.sm,
        animation: "pulse 1.8s infinite",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textMuted, fontWeight: typeWeight.medium }}>
          {label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: space.xs }}>
          <div style={{ width: space.xs, height: space.xs, borderRadius: radius.pill, background: T.cyan, animation: "pulse 1s infinite" }} />
          <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.cyan, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Aligning
          </span>
        </div>
      </div>
      <div style={{ width: "70%", height: space.xs, borderRadius: radius.dense, background: border.subtle }} />
    </div>
  );
}

type ChartState = {
  label: string;
  statusLabel: string;
  statusColor: string;
  thermalPath: string;
  thermalArea: string;
  moisturePath: string;
  moistureArea: string;
  thermalMetric: string;
  moistureMetric: string;
  thermalColor: string;
  moistureColor: string;
};

/*
 * The telemetry chart's curves used to be hand-drawn bezier strings — a shape
 * with no relationship to any value TALON reports. These build the same visual
 * character from the real series instead, so the line rises when confidence
 * rises and flattens when a source is lost.
 */
const CHART_W = 240;
const CHART_H = 68;

function toPoints(values: number[], min: number, max: number): Array<[number, number]> {
  const span = Math.max(1, max - min);
  return values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * CHART_W;
    /* SVG y grows downward, so a higher reading sits closer to the top. */
    const y = CHART_H - ((value - min) / span) * (CHART_H - 8) - 4;
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
  });
}

/** Catmull-Rom to cubic bezier — keeps the soft telemetry feel without faking data. */
function toSmoothPath(points: Array<[number, number]>): string {
  if (points.length < 2) return "";
  const [first, ...rest] = points;
  let path = `M${first[0]},${first[1]}`;
  for (let i = 0; i < rest.length; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = rest[i];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return path;
}

function toAreaPath(linePath: string): string {
  return `${linePath} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;
}

function seriesPaths(values: number[], min: number, max: number) {
  const line = toSmoothPath(toPoints(values, min, max));
  return { line, area: toAreaPath(line) };
}

/** Moisture is the inverse signal — it falls as thermal load rises. */
function inverseOf(values: number[], ceiling: number): number[] {
  return values.map((value) => Math.max(0, ceiling - value));
}

/*
 * Labels, status words, and colours stay authored — those are editorial
 * judgements about how to describe a state. The curves and the rate metric are
 * computed from the series, so the chart cannot say "rising" while the number
 * beside it falls.
 */
type ChartCopy = Pick<ChartState, "label" | "statusLabel" | "statusColor" | "thermalColor" | "moistureColor"> & {
  moistureMetric: string;
};

function getChartCopy(scene: SceneId): ChartCopy {
  switch (scene) {
    case "satellite-feed-loss":
      return {
        label: "Convergence (satellite offline)",
        statusLabel: "DEGRADED",
        statusColor: "#F5A623",
        thermalColor: "#F5A623",
        moistureColor: "#7A8BA0",
        moistureMetric: "–stale–",
      };
    case "network-degraded":
      return {
        label: "Convergence (low-bandwidth)",
        statusLabel: "JITTER",
        statusColor: "#FFD166",
        thermalColor: "#FFD166",
        moistureColor: "#F5A623",
        moistureMetric: "-8%",
      };
    case "monitoring-contested":
      return {
        label: "Contested watch — reduced weighting",
        statusLabel: "OPERATOR CLOSED",
        statusColor: T.cyan,
        thermalColor: T.cyan,
        moistureColor: "#7A8BA0",
        moistureMetric: "-11%",
      };
    case "talon-reraise":
      return {
        label: "Post-override evidence only",
        statusLabel: "THRESHOLD CROSSED",
        statusColor: "#F5A623",
        thermalColor: "#F5A623",
        moistureColor: "#F5A623",
        moistureMetric: "-17%",
      };
    case "baseline":
    case "alert-command":
      return {
        label: "Thermal baseline & moisture",
        statusLabel: "QUIET WATCH",
        statusColor: "#2DD4A0",
        thermalColor: "#2DD4A0",
        moistureColor: T.cyan,
        moistureMetric: "-2%",
      };
    case "contain-recommended":
    case "contain-alternate":
    case "contain-degraded":
    case "rescue-nominal":
    case "rescue-signal-degraded":
    case "rescue-battery-critical":
      return {
        label: "Evidence correlation (post-escalation)",
        statusLabel: "CONFIRMED",
        statusColor: "#2DD4A0",
        thermalColor: "#E5533C",
        moistureColor: "#F5A623",
        moistureMetric: "-19%",
      };
    default:
      return {
        label: "Convergence & moisture slope",
        statusLabel: "STABLE CORRELATION",
        statusColor: "#2DD4A0",
        thermalColor: T.cyan,
        moistureColor: T.amber,
        moistureMetric: "-14%",
      };
  }
}

function getChartState(scene: SceneId): ChartState {
  const copy = getChartCopy(scene);
  const history = getSignalHistory(scene);

  const thermal = seriesPaths(history.thermal, 0, 60);
  const moisture = seriesPaths(inverseOf(history.thermal, 60), 0, 60);

  /* Rate of change across the window, expressed the way an operator reads it. */
  const first = history.thermal[0];
  const last = history.thermal[history.thermal.length - 1];
  const slope = (last - first) / Math.max(1, history.thermal.length - 1);
  const thermalMetric = `${slope >= 0 ? "+" : ""}${slope.toFixed(1)}°C/m`;

  return {
    ...copy,
    thermalPath: thermal.line,
    thermalArea: thermal.area,
    moisturePath: moisture.line,
    moistureArea: moisture.area,
    thermalMetric,
  };
}

function HighFidelityTelemetryChart({ scene }: { scene: SceneId }) {
  const chart = getChartState(scene);

  return (
    <div
      style={{
        marginTop: space.sm,
        marginBottom: space.sm,
        padding: `${space.md}px ${space.md}px`,
        borderRadius: radius.tile,
        background: surface.raised,
        border: `1px solid ${border.subtle}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
          {chart.label}
        </span>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: chart.statusColor, fontWeight: typeWeight.semibold }}>
          {chart.statusLabel}
        </span>
      </div>

      <svg width="100%" height="68" viewBox="0 0 240 68" style={{ overflow: "visible" }} aria-hidden="true">
        <defs>
          <linearGradient id="thermalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chart.thermalColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={chart.thermalColor} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="moistureGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chart.moistureColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={chart.moistureColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        <line x1="0" y1="10" x2="240" y2="10" stroke={border.soft} strokeWidth="1" strokeDasharray="3 3" />
        <line x1="0" y1="34" x2="240" y2="34" stroke={border.soft} strokeWidth="1" strokeDasharray="3 3" />
        <line x1="0" y1="58" x2="240" y2="58" stroke={border.soft} strokeWidth="1" strokeDasharray="3 3" />

        <path d={chart.thermalPath} fill="none" stroke={chart.thermalColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d={chart.thermalArea} fill="url(#thermalGrad)" />
        <path d={chart.moisturePath} fill="none" stroke={chart.moistureColor} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
        <path d={chart.moistureArea} fill="url(#moistureGrad)" />
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: space.sm, borderTop: `1px solid ${border.soft}`, paddingTop: space.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: space.xs }}>
          <span style={{ width: space.xs, height: space.xs, borderRadius: radius.pill, background: chart.thermalColor }} />
          <span style={{ fontFamily: font.sans, fontSize: typeScale.eyebrow, color: T.textSecondary }}>Thermal slope</span>
          <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: chart.thermalColor, marginLeft: space.xs }}>{chart.thermalMetric}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: space.xs }}>
          <span style={{ width: space.xs, height: space.xs, borderRadius: radius.pill, background: chart.moistureColor }} />
          <span style={{ fontFamily: font.sans, fontSize: typeScale.eyebrow, color: T.textSecondary }}>Moisture delta</span>
          <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: chart.moistureColor, marginLeft: space.xs }}>{chart.moistureMetric}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Evidence Source Chip ─────────────────────────────────────────────────────

function EvidenceChip({ source }: { source: EvidenceSource }) {
  const [expanded, setExpanded] = useState(false);
  const color = getStatusColor(source.status);
  const isActive = source.status === "active";

  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
      aria-label={`${source.label}: ${source.status}, ${source.confidence}% confidence`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: space.sm,
        padding: `${space.sm}px ${space.md}px`,
        borderRadius: radius.control,
        border: `1px solid ${color}${isActive ? "33" : "22"}`,
        background: `${color}0A`,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "background 120ms ease, border-color 120ms ease, transform 120ms ease",
      }}
    >
      {/* Status dot */}
      <span
        style={{
          width: space.sm,
          height: space.sm,
          borderRadius: radius.pill,
          background: color,
          flexShrink: 0,
          animation: isActive ? "evidenceSourcePulse 2s ease-in-out infinite" : undefined,
        }}
        aria-hidden="true"
      />

      {/* Label + status */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, fontWeight: typeWeight.semibold, lineHeight: 1.2 }}>
            {source.label}
          </span>
          <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted }}>
            {source.lastUpdated}
          </span>
        </div>
        {expanded && source.note && (
          <div
            style={{
              fontFamily: font.sans,
              fontSize: typeScale.caption,
              color: T.textSecondary,
              marginTop: space.xs,
              lineHeight: 1.4,
              animation: "slideInUp 120ms ease",
            }}
          >
            {source.note}
          </div>
        )}
      </div>

      {/* Confidence badge + expand chevron */}
      <div style={{ display: "flex", alignItems: "center", gap: space.sm, flexShrink: 0 }}>
        {source.status === "active" || source.status === "stale" ? (
          <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color, letterSpacing: "0.04em" }}>
            {source.confidence}%
          </span>
        ) : (
          <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
            {source.status}
          </span>
        )}
        {source.note && (
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
            style={{ color: T.textMuted, transition: "transform 150ms ease", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
          >
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </button>
  );
}

// ─── TALON Workforce Components ───────────────────────────────────────────────

function getCategoryMeta(category: TalonAgentTask["category"]) {
  switch (category) {
    case "orchestrator":
      return { label: "Orchestrator", color: T.teal, fill: tone.safe.fill, border: tone.safe.border };
    case "intelligence":
      return { label: "Intelligence", color: T.cyan, fill: tone.info.fill, border: tone.info.border };
    case "perception":
      return { label: "Perception", color: T.teal, fill: tone.safe.fill, border: tone.safe.border };
    case "simulation":
      return { label: "Simulation", color: T.amber, fill: tone.caution.fill, border: tone.caution.border };
    case "operations":
      return { label: "Operations", color: T.red, fill: tone.danger.fill, border: tone.danger.border };
    case "governance":
      return { label: "Governance", color: T.yellow, fill: tone.caution.fill, border: tone.caution.border };
    default:
      return { label: "Agent", color: T.textMuted, fill: tone.neutral.fill, border: tone.neutral.border };
  }
}

function StatusDot({ status }: { status: TalonAgentTask["status"] }) {
  const color = getAgentStatusColor(status);
  return (
    <span
      aria-hidden="true"
      style={{
        width: space.sm,
        height: space.sm,
        borderRadius: radius.pill,
        background: color,
        flexShrink: 0,
        outline: status === "running" ? `1px solid ${tint(color, 0.55)}` : undefined,
        outlineOffset: status === "running" ? 2 : undefined,
      }}
    />
  );
}

function CategoryBadge({ category }: { category: TalonAgentTask["category"] }) {
  const meta = getCategoryMeta(category);
  return (
    <span
      style={{
        fontFamily: font.mono,
        fontSize: typeScale.eyebrow,
        color: meta.color,
        letterSpacing: tracking.telemetry,
        textTransform: "uppercase",
        border: `1px solid ${meta.border}`,
        background: meta.fill,
        borderRadius: radius.dense,
        padding: `${space.xs}px ${space.xs}px`,
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: TalonAgentTask["status"] }) {
  const color = getAgentStatusColor(status);
  return (
    <span
      style={{
        fontFamily: font.mono,
        fontSize: typeScale.eyebrow,
        color,
        letterSpacing: tracking.telemetry,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {getAgentStatusLabel(status)}
    </span>
  );
}

function InputBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        fontFamily: font.sans,
        fontSize: typeScale.eyebrow,
        color: T.textSecondary,
        border: `1px solid ${border.soft}`,
        background: surface.control,
        borderRadius: radius.dense,
        padding: `${space.xs}px ${space.xs}px`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function WorkforceMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        border: `1px solid ${border.soft}`,
        background: surface.inset,
        borderRadius: radius.control,
        padding: `${space.sm}px ${space.sm}px`,
      }}
    >
      <div style={{ fontFamily: font.mono, fontSize: typeScale.title, fontWeight: typeWeight.heavy, color, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ marginTop: space.xs, fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

function AgentThroughputStrip({ tasks }: { tasks: TalonAgentTask[] }) {
  const total = Math.max(tasks.length, 1);
  const states: Array<{ status: TalonAgentTask["status"]; label: string }> = [
    { status: "running", label: "Running" },
    { status: "complete", label: "Complete" },
    { status: "blocked", label: "Gated" },
    { status: "failed", label: "Failed" },
    { status: "queued", label: "Queued" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
      <div style={{ display: "flex", height: space.sm, borderRadius: radius.pill, overflow: "hidden", background: border.soft }}>
        {states.map(({ status }) => {
          const count = tasks.filter((task) => task.status === status).length;
          if (count === 0) return null;
          return (
            <div
              key={status}
              style={{
                width: `${(count / total) * 100}%`,
                minWidth: space.xs,
                background: getAgentStatusColor(status),
              }}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm }}>
        {states.map(({ status, label }) => {
          const count = tasks.filter((task) => task.status === status).length;
          if (count === 0) return null;
          return (
            <span key={status} style={{ display: "inline-flex", alignItems: "center", gap: space.xs, fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, textTransform: "uppercase" }}>
              <StatusDot status={status} />
              {count} {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SourceFreshnessTracker({ sources }: { sources: EvidenceSource[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.sm }}>
      {sources.slice(0, 4).map((source) => {
        const color = getStatusColor(source.status);
        return (
          <div key={source.id} style={{ border: `1px solid ${border.soft}`, background: surface.control, borderRadius: radius.control, padding: `${space.sm}px ${space.sm}px`, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
              <span style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {source.label}
              </span>
              <StatusDot status={source.status === "active" ? "complete" : source.status === "failed" ? "failed" : source.status === "stale" ? "blocked" : "queued"} />
            </div>
            <div style={{ marginTop: space.xs, fontFamily: font.mono, fontSize: typeScale.eyebrow, color }}>
              {source.lastUpdated}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConfidenceContributionBars({ sources }: { sources: EvidenceSource[] }) {
  const rows = sources.filter((source) => source.status !== "pending").slice(0, 4);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
      {rows.map((source) => {
        const color = getStatusColor(source.status);
        return (
          <div key={source.id} style={{ display: "grid", gridTemplateColumns: "86px 1fr 34px", alignItems: "center", gap: space.sm }}>
            <span style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {source.label}
            </span>
            <div style={{ height: space.sm, background: border.soft, borderRadius: radius.pill, overflow: "hidden" }}>
              <div style={{ width: `${Math.max(source.confidence, space.none)}%`, height: "100%", background: color, borderRadius: radius.pill, opacity: source.status === "stale" ? 0.54 : 0.92 }} />
            </div>
            <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color }}>
              {source.confidence}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MiniDeltaChart({ toneColor, label, values }: { toneColor: string; label: string; values: number[] }) {
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 44 - value;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{ border: `1px solid ${border.soft}`, background: surface.control, borderRadius: radius.control, padding: space.sm }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: space.sm, marginBottom: space.sm }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
          {label}
        </span>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: toneColor }}>
          {values[values.length - 1]}
        </span>
      </div>
      <svg viewBox="0 0 100 48" width="100%" height={space["3xl"] + space.lg} aria-hidden="true">
        <polyline points={points} fill="none" stroke={toneColor} strokeWidth={space.xs} strokeLinecap="round" strokeLinejoin="round" />
        <line x1={space.none} y1={44} x2={100} y2={44} stroke={border.soft} strokeWidth={space.xs} />
      </svg>
    </div>
  );
}

function HumanGateChecklist({ tasks }: { tasks: TalonAgentTask[] }) {
  const gateTask = tasks.find((task) => task.requiresHumanGate && task.status === "blocked");
  if (!gateTask) return null;

  const required = ["sensor-fusion", "fire-behavior", "historical-verification", "values-risk"];
  const upstreamReady = required.every((id) => tasks.find((task) => task.id === id)?.status === "complete");
  const items = [
    { label: "Evidence agents complete", complete: upstreamReady },
    { label: "Authority packet compiled", complete: Boolean(gateTask.auditId) },
    { label: gateTask.blocker ?? "Awaiting operator", complete: false },
  ];

  return (
    <div style={{ border: `1px solid ${tone.caution.border}`, background: tone.caution.fill, borderRadius: radius.tile, padding: `${space.sm}px ${space.md}px`, display: "flex", flexDirection: "column", gap: space.sm }}>
      <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
        <LockKeyhole size={space.lg} color={T.amber} strokeWidth={space.xs} />
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.amber, letterSpacing: tracking.telemetry, textTransform: "uppercase", fontWeight: typeWeight.bold }}>
          Human Gate Dependency
        </span>
      </div>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: space.sm, fontFamily: font.sans, fontSize: typeScale.caption, color: item.complete ? T.textSecondary : T.amber }}>
          {item.complete ? <CheckCircle2 size={space.md} color={T.teal} strokeWidth={space.xs} /> : <AlertTriangle size={space.md} color={T.amber} strokeWidth={space.xs} />}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function WorkforceSummary({ tasks }: { tasks: TalonAgentTask[] }) {
  const active = tasks.filter((task) => task.status === "running").length;
  const blocked = tasks.filter((task) => task.status === "blocked" || task.requiresHumanGate).length;
  const complete = tasks.filter((task) => task.status === "complete").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
      <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
        <WorkforceMetric label="active agents" value={active} color={T.cyan} />
        <WorkforceMetric label="gated tasks" value={blocked} color={blocked > 0 ? T.amber : T.teal} />
        <WorkforceMetric label="complete" value={complete} color={T.teal} />
      </div>
      <AgentThroughputStrip tasks={tasks} />
    </div>
  );
}

function OrchestratorCard({ task }: { task: TalonAgentTask }) {
  const color = getAgentStatusColor(task.status);
  return (
    <div style={{ border: `1px solid ${getCategoryMeta(task.category).border}`, background: getCategoryMeta(task.category).fill, borderRadius: radius.tile, padding: `${space.sm}px ${space.md}px` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: space.sm, minWidth: 0 }}>
          <Workflow size={space.lg} color={color} strokeWidth={space.xs} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, fontWeight: typeWeight.bold, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {task.agentName}
            </div>
            <div style={{ marginTop: space.xs, fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {task.currentTask}
            </div>
          </div>
        </div>
        <StatusBadge status={task.status} />
      </div>
      {task.blocker && (
        <div style={{ marginTop: space.sm, fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.amber, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
          {task.blocker}
        </div>
      )}
    </div>
  );
}

function AgenticFlowVisualization({ tasks }: { tasks: TalonAgentTask[] }) {
  const lanes: Array<{ label: string; categories: TalonAgentTask["category"][] }> = [
    { label: "Intelligence", categories: ["intelligence", "perception"] },
    { label: "Simulation", categories: ["simulation"] },
    { label: "Operations", categories: ["operations"] },
    { label: "Governance", categories: ["governance"] },
  ];

  return (
    <div style={{ border: `1px solid ${border.default}`, background: surface.inset, borderRadius: radius.tile, padding: `${space.sm}px ${space.md}px`, display: "flex", flexDirection: "column", gap: space.sm }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
          Parallel Agent Flow
        </span>
        <Activity size={space.lg} color={T.cyan} strokeWidth={space.xs} />
      </div>
      {lanes.map((lane) => {
        const laneTasks = tasks.filter((task) => lane.categories.includes(task.category));
        const activeCount = laneTasks.filter((task) => task.status === "running").length;
        const blockedCount = laneTasks.filter((task) => task.status === "blocked" || task.status === "failed").length;
        return (
          <div key={lane.label} style={{ display: "grid", gridTemplateColumns: "74px 1fr auto", alignItems: "center", gap: space.sm }}>
            <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, textTransform: "uppercase" }}>
              {lane.label}
            </span>
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: space.xs, paddingLeft: space.md, minWidth: 0 }}>
              <div style={{ position: "absolute", left: space.none, top: "50%", width: space.md, height: space.xs, background: border.strong, overflow: "hidden" }}>
                {laneTasks.some((task) => task.status === "running") && (
                  <span style={{ display: "block", width: "100%", height: "100%", background: T.cyan, animation: "workforceConnector 1.4s ease-in-out infinite" }} />
                )}
              </div>
              {laneTasks.slice(0, 6).map((task) => (
                <span key={task.id} title={task.agentName} style={{ display: "inline-flex", alignItems: "center" }}>
                  <StatusDot status={task.status} />
                </span>
              ))}
            </div>
            <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: blockedCount > 0 ? T.amber : activeCount > 0 ? T.cyan : T.textMuted, letterSpacing: tracking.telemetry, textTransform: "uppercase", whiteSpace: "nowrap" }}>
              {activeCount} run / {blockedCount} gate
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ToolCallRow({ task }: { task: TalonAgentTask }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
      {task.toolCalls.slice(0, 3).map((call) => {
        const color = getAgentStatusColor(call.status);
        return (
          <div key={call.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: space.sm, alignItems: "center", borderTop: `1px solid ${border.soft}`, paddingTop: space.xs }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: space.xs, minWidth: 0 }}>
                <StatusDot status={call.status} />
                <span style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {call.label}
                </span>
              </div>
              {(call.input || call.output) && (
                <div style={{ marginTop: space.xs, fontFamily: font.sans, fontSize: typeScale.eyebrow, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {call.output ?? call.input}
                </div>
              )}
            </div>
            <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
              {getAgentStatusLabel(call.status)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/*
 * One agent, as a genuine summary row.
 *
 * This used to render the agent's current task, its input badges, AND its
 * output/blocker line *inside the collapsed header* — so a "collapsed" card was
 * still 145–199px and ten of them pushed the rail to ~3,300px of content in a
 * ~676px box. Disclosure that doesn't actually withhold anything isn't
 * disclosure. The header is now one scannable line (status · name · gate ·
 * confidence); everything else lives behind the chevron. Nothing was removed —
 * it moved to where it was supposed to be.
 *
 * The category badge is deliberately gone from the row: these cards are already
 * grouped *by* category ("Intelligence · 3 agents"), so repeating it on every
 * child was redundant and it was what squeezed the name into an ellipsis.
 */
const AGENT_ROW_H = 44;

function AgentWorkforceCard({ task }: { task: TalonAgentTask }) {
  const [expanded, setExpanded] = useState(false);
  const color = getAgentStatusColor(task.status);

  return (
    <div style={{ border: `1px solid ${border.soft}`, background: surface.inset, borderRadius: radius.control, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`${task.agentName}. ${task.status}. ${expanded ? "Hide" : "Show"} detail`}
        style={{
          width: "100%",
          minHeight: AGENT_ROW_H,
          display: "flex",
          alignItems: "center",
          gap: space.sm,
          padding: `0 ${space.md}px`,
          border: "none",
          background: "transparent",
          color: T.textPrimary,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <StatusDot status={task.status} />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: font.sans,
            fontSize: typeScale.label,
            color: T.textPrimary,
            fontWeight: typeWeight.semibold,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {task.agentName}
        </span>
        {task.requiresHumanGate && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: space.xs, fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.amber, letterSpacing: tracking.telemetry, textTransform: "uppercase", flexShrink: 0 }}>
            <LockKeyhole size={space.md} color={T.amber} strokeWidth={space.xs} />
            Gate
          </span>
        )}
        <StatusBadge status={task.status} />
        {task.confidence !== undefined && task.status !== "queued" && (
          <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color, fontWeight: typeWeight.semibold, flexShrink: 0 }}>
            {task.confidence}%
          </span>
        )}
        {expanded ? (
          <ChevronDown size={space.lg} color={T.textMuted} strokeWidth={space.xs} />
        ) : (
          <ChevronRight size={space.lg} color={T.textMuted} strokeWidth={space.xs} />
        )}
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid ${border.soft}`, padding: `${space.sm}px ${space.md}px`, display: "flex", flexDirection: "column", gap: space.sm, animation: "slideInUp 140ms ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
            <CategoryBadge category={task.category} />
          </div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, lineHeight: 1.35 }}>
            {task.currentTask}
          </div>
          {task.inputs.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: space.xs }}>
              {task.inputs.slice(0, 4).map((input) => (
                <InputBadge key={input} label={input} />
              ))}
            </div>
          )}
          <div style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: task.blocker ? T.amber : T.textMuted, lineHeight: 1.35 }}>
            {task.blocker ?? task.output ?? task.shortLabel}
          </div>
          <ToolCallRow task={task} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.sm }}>
            <div style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textMuted, lineHeight: 1.4 }}>
              <span style={{ color: T.textSecondary, fontWeight: typeWeight.semibold }}>Impact: </span>
              {task.decisionImpact}
            </div>
            <div style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textMuted, lineHeight: 1.4 }}>
              <span style={{ color: T.textSecondary, fontWeight: typeWeight.semibold }}>Depends on: </span>
              {task.dependencies.join(", ") || "None"}
            </div>
          </div>
          {task.auditId && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: space.xs, fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.teal, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
              <ShieldCheck size={space.md} color={T.teal} strokeWidth={space.xs} />
              Audit {task.auditId}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/*
 * Sampled from the same convergence curve as evidence confidence, so the last
 * point of each series is the value shown beside it. Previously these were
 * hand-written arrays, which made the chart decorative — it moved on scene
 * change but had no relationship to anything TALON claimed to know.
 */
function getDeltaChartValues(scene: SceneId): { thermal: number[]; structures: number[] } {
  const history = getSignalHistory(scene);
  return { thermal: history.thermal, structures: history.structures };
}

function WorkforceDataModules({ evidenceSources, agentTasks, scene }: { evidenceSources: EvidenceSource[]; agentTasks: TalonAgentTask[]; scene: SceneId }) {
  const deltaValues = getDeltaChartValues(scene);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
      <SourceFreshnessTracker sources={evidenceSources} />
      <ConfidenceContributionBars sources={evidenceSources} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.sm }}>
        <MiniDeltaChart toneColor={T.cyan} label="Thermal Delta" values={deltaValues.thermal} />
        <MiniDeltaChart toneColor={T.amber} label="Structures Risk" values={deltaValues.structures} />
      </div>
      <HumanGateChecklist tasks={agentTasks} />
    </div>
  );
}

function TalonWorkforceView({
  evidenceSources,
  agentTasks,
  scene,
}: {
  evidenceSources: EvidenceSource[];
  agentTasks: TalonAgentTask[];
  scene: SceneId;
}) {
  const orchestrator = agentTasks.find((task) => task.category === "orchestrator");
  const workforceTasks = agentTasks.filter((task) => task.category !== "orchestrator");
  const orderedCategories: TalonAgentTask["category"][] = ["intelligence", "perception", "simulation", "operations", "governance"];

  return (
    <>
      <div
        role="note"
        style={{
          padding: `${space.sm}px ${space.md}px`,
          borderRadius: radius.control,
          border: `1px solid ${tint(T.cyan, 0.24)}`,
          background: tint(T.cyan, 0.06),
          color: T.textSecondary,
          fontFamily: font.sans,
          fontSize: typeScale.caption,
          lineHeight: 1.45,
        }}
      >
        <strong style={{ color: T.cyan }}>Prototype disclosure.</strong> Workforce states illustrate a scripted supervised model. They describe evidence, blockers, and audit context, not live autonomous agents.
      </div>
      <AgentThroughputStrip tasks={agentTasks} />
      {orchestrator && <OrchestratorCard task={orchestrator} />}
      <AgenticFlowVisualization tasks={workforceTasks} />
      <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
        {orderedCategories.map((category) => {
          const categoryTasks = workforceTasks.filter((task) => task.category === category);
          if (categoryTasks.length === 0) return null;
          const meta = getCategoryMeta(category);
          return (
            <section key={category} style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
                <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: meta.color, letterSpacing: tracking.telemetry, textTransform: "uppercase", fontWeight: typeWeight.bold }}>
                  {meta.label}
                </span>
                <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
                  {categoryTasks.length} agents
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
                {categoryTasks.map((task) => (
                  <AgentWorkforceCard key={task.id} task={task} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <WorkforceDataModules evidenceSources={evidenceSources} agentTasks={agentTasks} scene={scene} />
    </>
  );
}

// ─── TALON Recommendation Block ───────────────────────────────────────────────

function TalonRecommendation({ state }: { state: ShellState }) {
  const interaction = getTalonInteractionModel(state);
  const rec = interaction.recommendation;

  return (
    <div
      style={{
        padding: `${space.md}px ${space.md}px`,
        borderRadius: radius.tile,
        background: tint(rec.tone, 0.04),
        border: `1px solid ${tint(rec.tone, 0.16)}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: space.xs, marginBottom: space.sm }}>
        <span
          style={{
            width: space.xs,
            height: space.xs,
            borderRadius: radius.pill,
            background: rec.tone,
          }}
          aria-hidden="true"
        />
        <span
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.eyebrow,
            color: rec.tone,
            letterSpacing: tracking.eyebrow,
            textTransform: "uppercase",
            fontWeight: typeWeight.bold,
          }}
        >
          TALON Recommendation
        </span>
      </div>
      <p
        style={{
          fontFamily: font.sans,
          fontSize: typeScale.label,
          color: T.textSecondary,
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {rec.text}
      </p>
      <div
        style={{
          marginTop: space.sm,
          fontFamily: font.mono,
          fontSize: typeScale.metadata,
          color: rec.tone,
          letterSpacing: tracking.telemetry,
          textTransform: "uppercase",
        }}
      >
        - {rec.action}
      </div>
      {interaction.exception ? (
        <div
          style={{
            marginTop: space.sm,
            paddingTop: space.sm,
            borderTop: `1px solid ${tint(interaction.exception.severity === "critical" ? T.red : T.amber, 0.18)}`,
            fontFamily: font.sans,
            fontSize: typeScale.caption,
            color: T.textSecondary,
            lineHeight: 1.45,
          }}
        >
          {interaction.exception.confidenceImpact}
        </div>
      ) : null}
    </div>
  );
}

function CopilotDataSnapshot({
  evidenceSources,
  agentTasks,
}: {
  evidenceSources: EvidenceSource[];
  agentTasks: TalonAgentTask[];
}) {
  const sourceRows = evidenceSources.slice(0, 4);
  const running = agentTasks.filter((task) => task.status === "running").length;
  const blocked = agentTasks.filter((task) => task.status === "blocked").length;
  const complete = agentTasks.filter((task) => task.status === "complete").length;

  return (
    <div
      style={{
        padding: `${space.md}px ${space.md}px`,
        borderRadius: radius.tile,
        background: surface.inset,
        border: `1px solid ${border.default}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: tracking.eyebrow, textTransform: "uppercase" }}>
          Evidence Snapshot
        </span>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: blocked > 0 ? T.amber : T.teal }}>
          {complete} done / {running} running / {blocked} gated
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: space.sm }}>
        {sourceRows.map((source) => {
          const color = getStatusColor(source.status);
          return (
            <div key={source.id} style={{ display: "grid", gridTemplateColumns: "78px 1fr 34px", alignItems: "center", gap: space.sm }}>
              <span style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {source.label}
              </span>
              <div style={{ height: space.xs, borderRadius: radius.pill, background: border.subtle, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.max(0, source.confidence)}%`,
                    height: "100%",
                    borderRadius: radius.pill,
                    background: color,
                    opacity: source.status === "pending" ? 0.3 : 0.9,
                  }}
                />
              </div>
              <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color }}>
                {source.status === "pending" ? "--" : `${source.confidence}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AuthorityPacketPreview({ state }: { state: ShellState }) {
  const packet = getAuthorityPacket(state);
  const tone = packet.status === "sent" ? T.teal : packet.status === "ready" ? T.red : T.amber;
  const dissentNote = getPacketDissentNote(state.dissent, state.escalationBasis);

  return (
    <div
      style={{
        padding: `${space.md}px ${space.md}px`,
        borderRadius: radius.tile,
        background: tint(tone, 0.05),
        border: `1px solid ${tint(tone, 0.18)}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: space.sm, marginBottom: space.sm }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: tone, letterSpacing: tracking.eyebrow, textTransform: "uppercase", fontWeight: typeWeight.bold }}>
          Authority Packet
        </span>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted }}>
          {packet.id}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: space.sm, alignItems: "start" }}>
        <div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, fontWeight: typeWeight.bold, marginBottom: space.xs }}>
            {packet.escalationLevel}
          </div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, lineHeight: 1.45 }}>
            {packet.evidenceSummary}
          </div>
        </div>
        {/* Confidence arc gauge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: space.xs, flexShrink: 0 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <circle
              cx="24" cy="24" r="18" fill="none"
              stroke={tone} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - packet.confidence / 100)}`}
              transform="rotate(-90 24 24)"
              style={{ transition: "stroke-dashoffset 600ms ease, stroke 400ms ease" }}
            />
            <text x="24" y="28" textAnchor="middle" fill={tone} fontSize="11" fontFamily="monospace" fontWeight="700">
              {packet.confidence}%
            </text>
          </svg>
          <div style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, textTransform: "uppercase", letterSpacing: tracking.telemetry }}>
            conf.
          </div>
        </div>
      </div>
      <div style={{ marginTop: space.md, display: "flex", flexDirection: "column", gap: space.xs }}>
        {packet.missingData.slice(0, 2).map((item) => (
          <div key={item} style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textMuted }}>
            Missing: {item}
          </div>
        ))}
      </div>

      {/*
        Direction B: the operator escalated past TALON's hold. The objection
        travels with the packet so the receiving authority sees the basis they
        are acting on — and so the operator is not later measured against a
        confidence the system never offered.
      */}
      {dissentNote && (
        <div
          style={{
            marginTop: space.sm,
            padding: `${space.sm}px ${space.sm}px`,
            background: tint(T.amber, 0.07),
            border: `1px solid ${tint(T.amber, 0.22)}`,
            borderRadius: radius.control,
            display: "grid",
            gap: 3,
          }}
        >
          <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, letterSpacing: tracking.telemetry, textTransform: "uppercase", color: T.amber }}>
            TALON dissent attached
          </span>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, lineHeight: 1.5 }}>
            {dissentNote}
          </span>
        </div>
      )}

      <div style={{ marginTop: space.sm, fontFamily: font.mono, fontSize: typeScale.eyebrow, color: tone, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
        {packet.humanGate}
      </div>
    </div>
  );
}

// ─── Conversational Chip Response Panel ──────────────────────────────────────

function ChipResponsePanel({ state }: { state: ShellState }) {
  const { talonConversation } = state;
  if (!talonConversation.response) return null;

  const { title, body, tone } = talonConversation.response;

  return (
    <div
      style={{
        padding: `${space.md}px ${space.md}px`,
        borderRadius: radius.tile,
        background: tint(tone, 0.05),
        border: `1px solid ${tint(tone, 0.2)}`,
        animation: "slideInUp 150ms ease",
      }}
      role="region"
      aria-label="TALON response"
    >
      <div
        style={{
          fontFamily: font.mono,
          fontSize: typeScale.eyebrow,
          color: tone,
          letterSpacing: tracking.eyebrow,
          textTransform: "uppercase",
          marginBottom: space.sm,
        }}
      >
        TALON · Response
      </div>
      <div
        style={{
          fontFamily: font.sans,
          fontSize: typeScale.label,
          fontWeight: typeWeight.semibold,
          color: T.textPrimary,
          marginBottom: space.xs,
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>
      <p
        style={{
          fontFamily: font.sans,
          fontSize: typeScale.label,
          color: T.textSecondary,
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {body}
      </p>
    </div>
  );
}

// ─── Connected Intelligence Brief ────────────────────────────────────────────
// Replaces the 4-card stack with one visual narrative: assessment → evidence → gate.

function IntelligenceBrief({
  state,
  evidenceSources,
  agentTasks,
}: {
  state: ShellState;
  evidenceSources: EvidenceSource[];
  agentTasks: TalonAgentTask[];
}) {
  const interaction = getTalonInteractionModel(state);
  const rec = interaction.recommendation;
  const packet = getAuthorityPacket(state);
  const packetTone = packet.status === "sent" ? T.teal : packet.status === "ready" ? T.red : T.amber;

  const activeSources = evidenceSources.filter((s) => s.status === "active" || s.status === "stale");
  const missingSources = evidenceSources.filter((s) => s.status === "missing" || s.status === "failed");
  const staleSources = evidenceSources.filter((s) => s.status === "stale");

  const running = agentTasks.filter((t) => t.status === "running").length;
  const blocked = agentTasks.filter((t) => t.status === "blocked" || t.requiresHumanGate).length;
  const complete = agentTasks.filter((t) => t.status === "complete").length;

  const showDecisionGate = state.scene !== "baseline";
  const hasMissingData = state.scene === "verify-active" || state.scene === "authority-notification-ready" || state.scene === "contain-recommended";

  return (
    <div
      style={{
        overflow: "visible",
        padding: space.md,
        border: `1px solid ${border.default}`,
        borderRadius: radius.tile,
        background: surface.inset,
      }}
      role="region"
      aria-label="TALON intelligence brief"
    >
      {/* ── Section 1: Assessment ── */}
      <div
        style={{
          padding: `${space.sm}px 0 ${space.md}px`,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.sm, marginBottom: space.sm }}>
          <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
            TALON decision brief
          </span>
          <span
            style={{
              fontFamily: font.sans,
              fontSize: typeScale.label,
              color: rec.tone,
              fontWeight: typeWeight.bold,
            }}
          >
            Assessment
          </span>
        </div>

        <p
          style={{
            fontFamily: font.sans,
            fontSize: typeScale.label,
            color: T.textSecondary,
            lineHeight: 1.6,
            margin: 0,
            marginBottom: space.sm,
          }}
        >
          {rec.text}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: space.xs,
            fontFamily: font.sans,
            fontSize: typeScale.label,
            fontWeight: typeWeight.semibold,
            color: rec.tone,
          }}
        >
          Recommended next action: {rec.action}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: border.soft }} />

      {/* ── Section 2: Evidence State ── */}
      <div
        style={{
          padding: `${space.md}px 0`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: space.sm }}>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: T.textSecondary }}>
            Source freshness
          </span>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: missingSources.length || staleSources.length ? T.amber : T.teal, textAlign: "right" }}>
            {Math.max(0, activeSources.length - staleSources.length)} current · {staleSources.length + missingSources.length} uncertain
          </span>
        </div>
        {hasMissingData ? (
          <div style={{ marginTop: space.sm, fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted, lineHeight: 1.45 }}>
            Uncertainty: ground moisture is stale, fuel load is not current, and aerial visual is smoke-obscured.
          </div>
        ) : null}
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: border.soft }} />

      {/* ── Section 3: Agent Relay ── */}
      <div
        style={{
          padding: `${space.md}px 0`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: space.sm }}>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: T.textSecondary }}>
            Agent relay
          </span>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: blocked > 0 ? T.amber : T.cyan, textAlign: "right" }}>
            {complete} complete · {running} running · {blocked} gated
          </span>
        </div>
      </div>

      {/* ── Divider ── */}
      {showDecisionGate && <div style={{ height: 1, background: border.soft }} />}

      {/* ── Section 4: Decision Gate ── */}
      {showDecisionGate && (
        <div
          style={{
            padding: `${space.md}px 0 0`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space.xs }}>
            <span
              style={{
                fontFamily: font.sans,
                fontSize: typeScale.label,
                color: packetTone,
                fontWeight: typeWeight.bold,
              }}
            >
              {packet.status === "sent" ? "Authority Notified" : packet.status === "ready" ? "Authority Packet" : "Packet Building"}
            </span>
            <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted }}>
              {packet.status === "sent" ? `Receipt ${packet.id}` : packet.id}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: space.sm, marginBottom: space.xs }}>
            <span style={{ fontFamily: font.mono, fontSize: typeScale.subhead, fontWeight: typeWeight.heavy, color: packetTone, lineHeight: 1 }}>
              {packet.confidence}%
            </span>
            <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary, lineHeight: 1.4 }}>
              {packet.escalationLevel}
            </span>
          </div>

          <div
            style={{
              fontFamily: font.sans,
              fontSize: typeScale.label,
              color: packet.status === "sent" ? T.teal : packetTone,
              marginTop: space.xs,
            }}
          >
            {packet.humanGate}
          </div>

          {/* CTA nudge: when packet is ready, point the operator to the action */}
          {packet.status === "ready" && (
            <div style={{
              marginTop: space.sm,
              display: "flex",
              alignItems: "center",
              gap: space.xs,
              fontFamily: font.sans,
              fontSize: typeScale.label,
              fontWeight: typeWeight.semibold,
              color: packetTone,
            }}>
              <span>Send Authority Packet to proceed</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Progressive rail sections (single navigation layer — no nested tabs) ─────

/*
 * A rail section is a persistent summary row plus a disclosure.
 *
 * The summary must be load-bearing: it is what remains on screen when the
 * section is shut, and the section is shut by default precisely so the rail
 * stays inside its own height. If a state matters (a human gate, a blocker),
 * the row says so in its own colour — demoting the detail must never demote
 * the signal. `attention` is what makes collapsing safe.
 */
function RailSection({
  title,
  summary,
  defaultOpen = false,
  attention = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  attention?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section style={{ borderTop: `1px solid ${border.soft}`, paddingTop: space.md }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.sm,
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
            <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: attention ? T.amber : T.textMuted }}>
              {title}
            </span>
            {attention && !open ? (
              <span
                aria-hidden="true"
                style={{ width: 5, height: 5, borderRadius: radius.pill, background: T.amber, flexShrink: 0 }}
              />
            ) : null}
          </div>
          {summary ? (
            <div style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: attention ? T.amber : T.textMuted, marginTop: space.xs }}>
              {summary}
            </div>
          ) : null}
        </div>
        {open ? <ChevronDown size={14} color={T.textMuted} aria-hidden /> : <ChevronRight size={14} color={T.textMuted} aria-hidden />}
      </button>
      {open ? <div style={{ marginTop: space.md, display: "flex", flexDirection: "column", gap: space.md }}>{children}</div> : null}
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TalonCopilotPanel({ state }: TalonCopilotPanelProps) {
  const { chromeless } = useContext(RailChromeContext);
  const interaction = getTalonInteractionModel(state);
  const evidenceSources = getEvidenceSources(state.scene);
  const agentTasks = interaction.activeAgents;

  const pendingSources = evidenceSources.filter((s) => s.status === "pending");
  const runningAgents = agentTasks.filter((t) => t.status === "running").length;
  const blockedAgents = agentTasks.filter((t) => t.status === "blocked").length;
  const humanGatedTasks = agentTasks.filter((t) => t.requiresHumanGate || t.status === "blocked").length;
  const evidenceSummary = `${evidenceSources.filter((s) => s.status === "active").length} active · ${pendingSources.length} aligning`;
  /* Gated work is the reason to open this section, so the row must name it. */
  const workforceSummary = `${runningAgents} active${humanGatedTasks ? ` · ${humanGatedTasks} awaiting human` : ""}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "visible",
      }}
      role="region"
      aria-label="TALON copilot panel"
    >
      <div
        style={{
          padding: chromeless ? `${space.sm}px ${space.lg}px 0` : `${space.md}px ${space.lg}px 0`,
          flexShrink: 0,
        }}
      >
        {!chromeless ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: space.md }}>
            <span style={{ fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.bold, color: T.teal, whiteSpace: "nowrap" }}>
              TALON decision support
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: font.mono, fontSize: typeScale.title, fontWeight: typeWeight.heavy, color: T.cyan, lineHeight: 1 }}>
                  {runningAgents}
                </div>
                <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
                  Active
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: font.mono, fontSize: typeScale.title, fontWeight: typeWeight.heavy, color: humanGatedTasks > 0 ? T.amber : T.teal, lineHeight: 1 }}>
                  {humanGatedTasks}
                </div>
                <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
                  Gated
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div
        style={{
          overflowY: "visible",
          padding: `${space.md}px ${space.lg}px ${space.lg}px`,
          display: "flex",
          flexDirection: "column",
          gap: space.md,
        }}
      >
        {state.talonConversation.response ? <ChipResponsePanel state={state} /> : null}
        <IntelligenceBrief state={state} evidenceSources={evidenceSources} agentTasks={agentTasks} />

        <RailSection title="Evidence" summary={evidenceSummary} defaultOpen={state.mode === "verify"}>
          <div style={{
            display: "flex", alignItems: "center", gap: space.sm,
            fontFamily: font.sans, fontSize: typeScale.caption,
            color: T.textSecondary, lineHeight: 1.5,
          }}>
            Sources contributing to confidence. Expand any row for details.
          </div>
          <HighFidelityTelemetryChart scene={state.scene} />
          {pendingSources.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
              <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
                <ScanningRing />
                <span style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.cyan, fontWeight: typeWeight.semibold }}>
                  Resolving telemetry feeds…
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
                {pendingSources.map((s) => (
                  <TelemetryShimmerCard key={s.id} label={s.label} />
                ))}
              </div>
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
            {evidenceSources.filter((s) => s.status !== "pending").map((source) => (
              <EvidenceChip key={source.id} source={source} />
            ))}
          </div>
        </RailSection>

        {/*
          Workforce stays shut by default. Open it carries ~1,500px into a
          ~676px rail, which is how ~80% of TALON's reasoning ended up
          permanently below the fold. The gate count is already reported in the
          brief above ("Agent relay · N gated") and again on this row, in amber,
          so collapsing costs the operator no signal — only scrolling.
        */}
        <RailSection
          title="Workforce"
          summary={workforceSummary}
          attention={humanGatedTasks > 0}
        >
          <TalonWorkforceView evidenceSources={evidenceSources} agentTasks={agentTasks} scene={state.scene} />
        </RailSection>
      </div>
    </div>
  );
}
