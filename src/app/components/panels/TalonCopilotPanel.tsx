import { useState } from "react";
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
import type {
  ShellState,
  TalonAgentTask,
  EvidenceSource,
} from "../../tokens";
import { T, border, font, radius, shadow, space, surface, tint, tone, typeScale, typeWeight } from "../../tokens";
import {
  getAuthorityPacket,
  getEvidenceSources,
  getTalonInteractionModel,
} from "../../domain/talon";

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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: space["2xl"], height: space["2xl"], flexShrink: 0 }}>
      <svg width={space["2xl"]} height={space["2xl"]} viewBox="0 0 36 36" style={{ animation: "spin 2s linear infinite" }}>
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
        padding: `${space.md}px ${space.lg}px`,
        borderRadius: radius.md,
        background: surface.inset,
        border: `1px solid ${border.soft}`,
        boxShadow: shadow.quiet,
        display: "flex",
        flexDirection: "column",
        gap: space.sm,
        animation: "pulse 1.8s infinite",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textMuted, fontWeight: 500 }}>
          {label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: space.xs }}>
          <div style={{ width: space.xs, height: space.xs, borderRadius: radius.pill, background: T.cyan, animation: "pulse 1s infinite" }} />
          <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.cyan, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Aligning
          </span>
        </div>
      </div>
      <div style={{ width: "70%", height: space.xs, borderRadius: radius.xs, background: border.subtle }} />
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

function getChartState(scene: string): ChartState {
  const isSatelliteLoss = scene === "satellite-feed-loss";
  const isNetworkDegraded = scene === "network-degraded";
  const isFailure = isSatelliteLoss || isNetworkDegraded || scene === "infrastructure-total-loss";
  const isBaseline = scene === "baseline" || scene === "alert-command";
  const isOperations = scene.startsWith("contain") || scene.startsWith("rescue");

  if (isSatelliteLoss) {
    return {
      label: "Convergence (satellite offline)",
      statusLabel: "DEGRADED",
      statusColor: "#F5A623",
      thermalPath: "M0,40 Q30,38 60,44 T120,36 T180,40 T240,38",
      thermalArea: "M0,40 Q30,38 60,44 T120,36 T180,40 T240,38 L240,68 L0,68 Z",
      moisturePath: "M0,38 Q40,42 80,46 T160,50 T240,52",
      moistureArea: "M0,38 Q40,42 80,46 T160,50 T240,52 L240,68 L0,68 Z",
      thermalMetric: "+1.1°C/m",
      moistureMetric: "–stale–",
      thermalColor: "#F5A623",
      moistureColor: "#7A8BA0",
    };
  }
  if (isNetworkDegraded) {
    return {
      label: "Convergence (low-bandwidth)",
      statusLabel: "JITTER",
      statusColor: "#FFD166",
      thermalPath: "M0,34 Q15,28 30,38 T60,30 T90,40 T120,32 T150,38 T180,34 T210,40 T240,36",
      thermalArea: "M0,34 Q15,28 30,38 T60,30 T90,40 T120,32 T150,38 T180,34 T210,40 T240,36 L240,68 L0,68 Z",
      moisturePath: "M0,44 Q40,48 80,44 T160,50 T240,46",
      moistureArea: "M0,44 Q40,48 80,44 T160,50 T240,46 L240,68 L0,68 Z",
      thermalMetric: "±high",
      moistureMetric: "-8%",
      thermalColor: "#FFD166",
      moistureColor: "#F5A623",
    };
  }
  if (isBaseline) {
    return {
      label: "Thermal baseline & moisture",
      statusLabel: "QUIET WATCH",
      statusColor: "#2DD4A0",
      thermalPath: "M0,46 Q60,44 120,46 T240,44",
      thermalArea: "M0,46 Q60,44 120,46 T240,44 L240,68 L0,68 Z",
      moisturePath: "M0,32 Q60,34 120,32 T240,34",
      moistureArea: "M0,32 Q60,34 120,32 T240,34 L240,68 L0,68 Z",
      thermalMetric: "+0.3°C/m",
      moistureMetric: "-2%",
      thermalColor: "#2DD4A0",
      moistureColor: "#00C8FF",
    };
  }
  if (isOperations) {
    return {
      label: "Evidence correlation (post-escalation)",
      statusLabel: "CONFIRMED",
      statusColor: "#2DD4A0",
      thermalPath: "M0,58 Q20,52 40,38 T80,18 T120,12 T160,10 T200,10 T240,10",
      thermalArea: "M0,58 Q20,52 40,38 T80,18 T120,12 T160,10 T200,10 T240,10 L240,68 L0,68 Z",
      moisturePath: "M0,20 Q40,28 80,40 T160,54 T240,60",
      moistureArea: "M0,20 Q40,28 80,40 T160,54 T240,60 L240,68 L0,68 Z",
      thermalMetric: "+3.1°C/m",
      moistureMetric: "-19%",
      thermalColor: "#E5533C",
      moistureColor: "#F5A623",
    };
  }
  // default: intelligence / verification phases
  return {
    label: "Convergence & moisture slope",
    statusLabel: "STABLE CORRELATION",
    statusColor: "#2DD4A0",
    thermalPath: "M0,58 Q30,55 60,40 T120,28 T180,18 T240,12",
    thermalArea: "M0,58 Q30,55 60,40 T120,28 T180,18 T240,12 L240,68 L0,68 Z",
    moisturePath: "M0,22 Q40,30 80,38 T160,52 T240,60",
    moistureArea: "M0,22 Q40,30 80,38 T160,52 T240,60 L240,68 L0,68 Z",
    thermalMetric: "+2.4°C/m",
    moistureMetric: "-14%",
    thermalColor: T.cyan,
    moistureColor: T.amber,
  };
}

function HighFidelityTelemetryChart({ scene }: { scene: string }) {
  const chart = getChartState(scene);

  return (
    <div
      style={{
        marginTop: space.sm,
        marginBottom: space.md,
        padding: `${space.lg}px ${space.xl}px`,
        borderRadius: radius.lg,
        background: surface.raised,
        border: `1px solid ${border.subtle}`,
        boxShadow: shadow.quiet,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space.md }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {chart.label}
        </span>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: chart.statusColor, fontWeight: 600 }}>
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
          <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: chart.thermalColor, marginLeft: space.xxs }}>{chart.thermalMetric}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: space.xs }}>
          <span style={{ width: space.xs, height: space.xs, borderRadius: radius.pill, background: chart.moistureColor }} />
          <span style={{ fontFamily: font.sans, fontSize: typeScale.eyebrow, color: T.textSecondary }}>Moisture delta</span>
          <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: chart.moistureColor, marginLeft: space.xxs }}>{chart.moistureMetric}</span>
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
        gap: space.md,
        padding: `${space.sm}px ${space.lg}px`,
        borderRadius: radius.md,
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
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, fontWeight: 600, lineHeight: 1.2 }}>
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

      {/* Confidence badge */}
      {source.status === "active" || source.status === "stale" ? (
        <span
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.metadata,
            color,
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          {source.confidence}%
        </span>
      ) : (
        <span
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.eyebrow,
            color,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          {source.status}
        </span>
      )}
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
        boxShadow: status === "running" ? `0 0 ${space.lg}px ${tint(color, 0.36)}` : undefined,
        animation: status === "running" ? "workforcePulse 1.6s ease-in-out infinite" : undefined,
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
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        border: `1px solid ${meta.border}`,
        background: meta.fill,
        borderRadius: radius.xs,
        padding: `${space.xxs}px ${space.xs}px`,
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
        letterSpacing: "0.06em",
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
        borderRadius: radius.xs,
        padding: `${space.xxs}px ${space.xs}px`,
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
        borderRadius: radius.md,
        padding: `${space.sm}px ${space.md}px`,
      }}
    >
      <div style={{ fontFamily: font.mono, fontSize: typeScale.title, fontWeight: typeWeight.heavy, color, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ marginTop: space.xs, fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
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
      <div style={{ display: "flex", height: space.md, borderRadius: radius.pill, overflow: "hidden", background: border.soft }}>
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
              aria-label={`${count} ${status} agents`}
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
          <div key={source.id} style={{ border: `1px solid ${border.soft}`, background: surface.control, borderRadius: radius.md, padding: `${space.sm}px ${space.md}px`, minWidth: 0 }}>
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
    <div style={{ border: `1px solid ${border.soft}`, background: surface.control, borderRadius: radius.md, padding: space.md }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: space.sm, marginBottom: space.sm }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </span>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: toneColor }}>
          {values[values.length - 1]}
        </span>
      </div>
      <svg viewBox="0 0 100 48" width="100%" height={space["6xl"] + space["3xl"]} aria-hidden="true">
        <polyline points={points} fill="none" stroke={toneColor} strokeWidth={space.xxs} strokeLinecap="round" strokeLinejoin="round" />
        <line x1={space.none} y1={44} x2={100} y2={44} stroke={border.soft} strokeWidth={space.xxs} />
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
    <div style={{ border: `1px solid ${tone.caution.border}`, background: tone.caution.fill, borderRadius: radius.lg, padding: `${space.md}px ${space.lg}px`, display: "flex", flexDirection: "column", gap: space.sm }}>
      <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
        <LockKeyhole size={space["3xl"]} color={T.amber} strokeWidth={space.xxs} />
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.amber, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: typeWeight.bold }}>
          Human Gate Dependency
        </span>
      </div>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: space.sm, fontFamily: font.sans, fontSize: typeScale.caption, color: item.complete ? T.textSecondary : T.amber }}>
          {item.complete ? <CheckCircle2 size={space.xl} color={T.teal} strokeWidth={space.xxs} /> : <AlertTriangle size={space.xl} color={T.amber} strokeWidth={space.xxs} />}
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
    <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
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
    <div style={{ border: `1px solid ${getCategoryMeta(task.category).border}`, background: getCategoryMeta(task.category).fill, borderRadius: radius.lg, padding: `${space.md}px ${space.lg}px`, boxShadow: shadow.quiet }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.md }}>
        <div style={{ display: "flex", alignItems: "center", gap: space.sm, minWidth: 0 }}>
          <Workflow size={space["3xl"]} color={color} strokeWidth={space.xxs} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, fontWeight: typeWeight.bold, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {task.agentName}
            </div>
            <div style={{ marginTop: space.xxs, fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {task.currentTask}
            </div>
          </div>
        </div>
        <StatusBadge status={task.status} />
      </div>
      {task.blocker && (
        <div style={{ marginTop: space.sm, fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.amber, letterSpacing: "0.06em", textTransform: "uppercase" }}>
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
    <div style={{ border: `1px solid ${border.default}`, background: surface.inset, borderRadius: radius.lg, padding: `${space.md}px ${space.lg}px`, display: "flex", flexDirection: "column", gap: space.sm }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Parallel Agent Flow
        </span>
        <Activity size={space["3xl"]} color={T.cyan} strokeWidth={space.xxs} />
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
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: space.xs, paddingLeft: space.lg, minWidth: 0 }}>
              <div style={{ position: "absolute", left: space.none, top: "50%", width: space.lg, height: space.xxs, background: border.strong, overflow: "hidden" }}>
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
            <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: blockedCount > 0 ? T.amber : activeCount > 0 ? T.cyan : T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
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
                <div style={{ marginTop: space.xxs, fontFamily: font.sans, fontSize: typeScale.eyebrow, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {call.output ?? call.input}
                </div>
              )}
            </div>
            <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {getAgentStatusLabel(call.status)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AgentWorkforceCard({ task }: { task: TalonAgentTask }) {
  const [expanded, setExpanded] = useState(false);
  const color = getAgentStatusColor(task.status);
  const hasDetails = task.toolCalls.length > 0 || task.dependencies.length > 0 || Boolean(task.description);

  return (
    <div style={{ border: `1px solid ${border.soft}`, background: surface.inset, borderRadius: radius.md, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "start",
          gap: space.md,
          padding: `${space.md}px ${space.lg}px`,
          border: "none",
          background: "transparent",
          color: T.textPrimary,
          cursor: hasDetails ? "pointer" : "default",
          textAlign: "left",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space.sm, minWidth: 0 }}>
            <StatusDot status={task.status} />
            <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, fontWeight: typeWeight.semibold, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {task.agentName}
            </span>
            <CategoryBadge category={task.category} />
          </div>
          <div style={{ marginTop: space.xs, fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, lineHeight: 1.35 }}>
            {task.currentTask}
          </div>
          <div style={{ marginTop: space.sm, display: "flex", flexWrap: "wrap", gap: space.xs }}>
            {task.inputs.slice(0, 4).map((input) => (
              <InputBadge key={input} label={input} />
            ))}
          </div>
          <div style={{ marginTop: space.sm, fontFamily: font.sans, fontSize: typeScale.caption, color: task.blocker ? T.amber : T.textMuted, lineHeight: 1.35 }}>
            {task.blocker ?? task.output ?? task.shortLabel}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: space.sm }}>
          <div style={{ display: "flex", alignItems: "center", gap: space.xs }}>
            {task.requiresHumanGate && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: space.xxs, fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.amber, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                <LockKeyhole size={space.lg} color={T.amber} strokeWidth={space.xxs} />
                Gate
              </span>
            )}
            <StatusBadge status={task.status} />
          </div>
          {task.confidence !== undefined && task.status !== "queued" && (
            <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color, fontWeight: typeWeight.semibold }}>
              {task.confidence}%
            </span>
          )}
          {hasDetails && (
            expanded ? (
              <ChevronDown size={space["3xl"]} color={T.textMuted} strokeWidth={space.xxs} />
            ) : (
              <ChevronRight size={space["3xl"]} color={T.textMuted} strokeWidth={space.xxs} />
            )
          )}
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid ${border.soft}`, padding: `${space.sm}px ${space.lg}px ${space.md}px`, display: "flex", flexDirection: "column", gap: space.sm, animation: "slideInUp 140ms ease" }}>
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
            <div style={{ display: "inline-flex", alignItems: "center", gap: space.xs, fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.teal, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              <ShieldCheck size={space.xl} color={T.teal} strokeWidth={space.xxs} />
              Audit {task.auditId}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorkforceDataModules({ evidenceSources, agentTasks }: { evidenceSources: EvidenceSource[]; agentTasks: TalonAgentTask[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
      <SourceFreshnessTracker sources={evidenceSources} />
      <ConfidenceContributionBars sources={evidenceSources} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.sm }}>
        <MiniDeltaChart toneColor={T.cyan} label="Thermal Delta" values={[6, 11, 18, 24, 31, 36]} />
        <MiniDeltaChart toneColor={T.amber} label="Structures Risk" values={[4, 8, 13, 23, 34, 40]} />
      </div>
      <HumanGateChecklist tasks={agentTasks} />
    </div>
  );
}

function TalonWorkforceView({
  evidenceSources,
  agentTasks,
}: {
  evidenceSources: EvidenceSource[];
  agentTasks: TalonAgentTask[];
}) {
  const orchestrator = agentTasks.find((task) => task.category === "orchestrator");
  const workforceTasks = agentTasks.filter((task) => task.category !== "orchestrator");
  const orderedCategories: TalonAgentTask["category"][] = ["intelligence", "perception", "simulation", "operations", "governance"];

  return (
    <>
      <AgentThroughputStrip tasks={agentTasks} />
      {orchestrator && <OrchestratorCard task={orchestrator} />}
      <AgenticFlowVisualization tasks={workforceTasks} />
      <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>
        {orderedCategories.map((category) => {
          const categoryTasks = workforceTasks.filter((task) => task.category === category);
          if (categoryTasks.length === 0) return null;
          const meta = getCategoryMeta(category);
          return (
            <section key={category} style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
                <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: meta.color, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: typeWeight.bold }}>
                  {meta.label}
                </span>
                <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
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
      <WorkforceDataModules evidenceSources={evidenceSources} agentTasks={agentTasks} />
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
        padding: `${space.lg}px ${space.xl}px`,
        borderRadius: radius.lg,
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
            animation: "pulse 1.8s infinite",
          }}
          aria-hidden="true"
        />
        <span
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.eyebrow,
            color: rec.tone,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 700,
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
          marginTop: space.md,
          fontFamily: font.mono,
          fontSize: typeScale.metadata,
          color: rec.tone,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        - {rec.action}
      </div>
      {interaction.exception ? (
        <div
          style={{
            marginTop: space.md,
            paddingTop: space.md,
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
        padding: `${space.lg}px ${space.xl}px`,
        borderRadius: radius.lg,
        background: surface.inset,
        border: `1px solid ${border.default}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space.md }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Evidence Snapshot
        </span>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: blocked > 0 ? T.amber : T.teal }}>
          {complete} done / {running} running / {blocked} gated
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: space.md }}>
        {sourceRows.map((source) => {
          const color = getStatusColor(source.status);
          return (
            <div key={source.id} style={{ display: "grid", gridTemplateColumns: "78px 1fr 34px", alignItems: "center", gap: space.md }}>
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

  return (
    <div
      style={{
        padding: `${space.lg}px ${space.xl}px`,
        borderRadius: radius.lg,
        background: tint(tone, 0.05),
        border: `1px solid ${tint(tone, 0.18)}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: space.md, marginBottom: space.md }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: tone, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
          Authority Packet
        </span>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted }}>
          {packet.id}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: space.md, alignItems: "start" }}>
        <div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, fontWeight: typeWeight.bold, marginBottom: space.xs }}>
            {packet.escalationLevel}
          </div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, lineHeight: 1.45 }}>
            {packet.evidenceSummary}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: font.mono, fontSize: typeScale.heading, color: tone, fontWeight: 800 }}>
            {packet.confidence}%
          </div>
          <div style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, textTransform: "uppercase" }}>
            confidence
          </div>
        </div>
      </div>
      <div style={{ marginTop: space.lg, display: "flex", flexDirection: "column", gap: space.xs }}>
        {packet.missingData.slice(0, 2).map((item) => (
          <div key={item} style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textMuted }}>
            Missing: {item}
          </div>
        ))}
      </div>
      <div style={{ marginTop: space.md, fontFamily: font.mono, fontSize: typeScale.eyebrow, color: tone, letterSpacing: "0.08em", textTransform: "uppercase" }}>
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
        padding: `${space.lg}px ${space.xl}px`,
        borderRadius: radius.lg,
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
          letterSpacing: "0.1em",
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
          fontWeight: 600,
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
        borderRadius: radius.lg,
        border: `1px solid ${border.default}`,
        background: surface.inset,
        overflow: "hidden",
      }}
      role="region"
      aria-label="TALON intelligence brief"
    >
      {/* ── Section 1: Assessment ── */}
      <div
        style={{
          padding: `${space.lg}px ${space.xl}px`,
          borderLeft: `2px solid ${rec.tone}`,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: space.xs, marginBottom: space.sm }}>
          <span
            style={{
              width: space.xs,
              height: space.xs,
              borderRadius: radius.pill,
              background: rec.tone,
              flexShrink: 0,
              animation: "pulse 1.8s infinite",
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontFamily: font.mono,
              fontSize: typeScale.eyebrow,
              color: rec.tone,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: typeWeight.bold,
            }}
          >
            Assessment
          </span>
        </div>

        <p
          style={{
            fontFamily: font.sans,
            fontSize: typeScale.body,
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
            display: "inline-flex",
            alignItems: "center",
            gap: space.xs,
            fontFamily: font.mono,
            fontSize: typeScale.eyebrow,
            color: rec.tone,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          → {rec.action}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: border.soft, marginLeft: space.xl + 2 }} />

      {/* ── Section 2: Evidence State ── */}
      <div
        style={{
          padding: `${space.lg}px ${space.xl}px`,
          borderLeft: `2px solid ${border.strong}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space.md }}>
          <span
            style={{
              fontFamily: font.mono,
              fontSize: typeScale.eyebrow,
              color: T.textMuted,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Evidence
          </span>
          <span
            style={{
              fontFamily: font.mono,
              fontSize: typeScale.eyebrow,
              color: blocked > 0 ? T.amber : T.teal,
            }}
          >
            {complete}✓ {running > 0 ? `${running}↻ ` : ""}{blocked > 0 ? `${blocked}⊘` : ""}
          </span>
        </div>

        {/* Compact source confidence bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
          {activeSources.slice(0, 4).map((source) => {
            const color = source.status === "stale" ? T.yellow : source.status === "active" ? T.teal : T.textMuted;
            return (
              <div key={source.id} style={{ display: "grid", gridTemplateColumns: "74px 1fr 28px", alignItems: "center", gap: space.sm }}>
                <span style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {source.label}
                </span>
                <div style={{ height: space.xs, background: border.soft, borderRadius: radius.pill, overflow: "hidden" }}>
                  <div style={{ width: `${source.confidence}%`, height: "100%", background: color, borderRadius: radius.pill, opacity: source.status === "stale" ? 0.55 : 0.88, transition: "width 400ms ease" }} />
                </div>
                <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color, textAlign: "right" }}>
                  {source.confidence}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Missing / failed inline */}
        {(missingSources.length > 0 || staleSources.length > 0) && hasMissingData && (
          <div style={{ marginTop: space.md, display: "flex", flexWrap: "wrap", gap: space.xs }}>
            {["Ground moisture · 48h stale", "Fuel load · Not current", "Aerial visual · Smoke-obscured"].map((gap) => (
              <span
                key={gap}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: space.xxs,
                  fontFamily: font.sans,
                  fontSize: typeScale.eyebrow,
                  color: T.textMuted,
                  background: tone.caution.fill,
                  border: `1px solid ${tone.caution.border}`,
                  borderRadius: radius.xs,
                  padding: `${space.xxs}px ${space.xs}px`,
                }}
              >
                <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke={T.yellow} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                </svg>
                {gap}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      {showDecisionGate && <div style={{ height: 1, background: border.soft, marginLeft: space.xl + 2 }} />}

      {/* ── Section 3: Decision Gate ── */}
      {showDecisionGate && (
        <div
          style={{
            padding: `${space.lg}px ${space.xl}px`,
            borderLeft: `2px solid ${tint(packetTone, 0.5)}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: space.xs }}>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: typeScale.eyebrow,
                color: packetTone,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: typeWeight.bold,
              }}
            >
              {packet.status === "sent" ? "Authority Notified" : packet.status === "ready" ? "Authority Packet" : "Packet Building"}
            </span>
            <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted }}>
              {packet.id}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: space.md, marginBottom: space.xs }}>
            <span style={{ fontFamily: font.mono, fontSize: typeScale.subhead, fontWeight: typeWeight.heavy, color: packetTone, lineHeight: 1 }}>
              {packet.confidence}%
            </span>
            <span style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, lineHeight: 1.4 }}>
              {packet.escalationLevel}
            </span>
          </div>

          <div
            style={{
              fontFamily: font.mono,
              fontSize: typeScale.eyebrow,
              color: packet.status === "sent" ? T.teal : packetTone,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginTop: space.xs,
            }}
          >
            {packet.humanGate}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TalonCopilotPanel({ state }: TalonCopilotPanelProps) {
  const [activeTab, setActiveTab] = useState<"copilot" | "evidence" | "workforce">("copilot");
  const interaction = getTalonInteractionModel(state);
  const evidenceSources = getEvidenceSources(state.scene);
  const agentTasks = interaction.activeAgents;

  const pendingSources = evidenceSources.filter((s) => s.status === "pending");
  const runningAgents = agentTasks.filter((t) => t.status === "running").length;
  const blockedAgents = agentTasks.filter((t) => t.status === "blocked").length;
  const humanGatedTasks = agentTasks.filter((t) => t.requiresHumanGate || t.status === "blocked").length;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      role="region"
      aria-label="TALON copilot panel"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes workforcePulse { 0%, 100% { transform: scale(1); opacity: .72; } 50% { transform: scale(1.22); opacity: 1; } }
            @keyframes workforceConnector { 0% { transform: translateX(-100%); opacity: .2; } 50% { opacity: 1; } 100% { transform: translateX(100%); opacity: .2; } }
          `,
        }}
      />
      {/* Header */}
      <div
        style={{
          padding: `${space.xl}px ${space["2xl"]}px 0`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: space.lg }}>
          <div style={{ display: "flex", alignItems: "center", gap: space.sm, minWidth: 0 }}>
            <span
              style={{
                width: space.sm,
                height: space.sm,
                borderRadius: radius.pill,
                background: T.teal,
                display: "inline-block",
                animation: "pulse 1.8s infinite",
              }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: font.mono,
                fontSize: typeScale.metadata,
                fontWeight: typeWeight.bold,
                color: T.teal,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              TALON Workforce
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.title, fontWeight: typeWeight.heavy, color: T.cyan, lineHeight: 1 }}>
                {runningAgents}
              </div>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Active
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.title, fontWeight: typeWeight.heavy, color: humanGatedTasks > 0 ? T.amber : T.teal, lineHeight: 1 }}>
                {humanGatedTasks}
              </div>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Gated
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: space.xxs,
            padding: space.xs,
            background: surface.control,
            borderRadius: radius.lg,
          }}
          role="tablist"
          aria-label="TALON copilot tabs"
        >
          {(["copilot", "evidence", "workforce"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const labels: Record<string, string> = { copilot: "Brief", evidence: "Evidence", workforce: `Workforce${runningAgents > 0 ? ` (${runningAgents})` : ""}` };
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={labels[tab]}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: `${space.sm}px ${space.xs}px`,
                  borderRadius: radius.md,
                  border: "none",
                  background: isActive ? surface.controlActive : "transparent",
                  color: isActive ? T.textPrimary : T.textMuted,
                  fontFamily: font.sans,
                  fontSize: typeScale.caption,
                  fontWeight: typeWeight.semibold,
                  cursor: "pointer",
                  transition: "background 120ms ease, color 120ms ease",
                  position: "relative",
                }}
              >
                {labels[tab]}
                {tab === "workforce" && blockedAgents > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: space.xs,
                      right: space.xs,
                      width: space.xs,
                      height: space.xs,
                      borderRadius: radius.pill,
                      background: T.amber,
                    }}
                    aria-label={`${blockedAgents} blocked`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: `${space.lg}px ${space["2xl"]}px ${space["2xl"]}px`,
          display: "flex",
          flexDirection: "column",
          gap: space.lg,
        }}
        role="tabpanel"
        aria-label={`TALON ${activeTab} content`}
      >
        {/* ── Copilot Tab ── */}
        {activeTab === "copilot" && (
          <>
            {/* Voice / chip response — shown when TALON has responded */}
            {state.talonConversation.response && (
              <ChipResponsePanel state={state} />
            )}

            {/* Connected intelligence brief — one card, three linked sections with visual spine */}
            <IntelligenceBrief state={state} evidenceSources={evidenceSources} agentTasks={agentTasks} />
          </>
        )}

        {/* ── Evidence Tab ── */}
        {activeTab === "evidence" && (
          <>
            <div
              style={{
                fontFamily: font.sans,
                fontSize: typeScale.caption,
                color: T.textMuted,
                lineHeight: 1.5,
              }}
            >
              Active sources contributing to current confidence score. Click any source for details.
            </div>
            
            <HighFidelityTelemetryChart scene={state.scene} />

             {/* Pending / Aligning shimmers */}
            {pendingSources.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: space.sm, marginBottom: space.xs }}>
                <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
                  <ScanningRing />
                  <span style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.cyan, fontWeight: 600 }}>
                    Resolving telemetry feeds...
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
                  {pendingSources.map((s) => (
                    <TelemetryShimmerCard key={s.id} label={s.label} />
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
              {evidenceSources.filter((s) => s.status !== "pending").map((source) => (
                <EvidenceChip key={source.id} source={source} />
              ))}
            </div>
          </>
        )}

        {/* ── Workforce Tab ── */}
        {activeTab === "workforce" && (
          <TalonWorkforceView evidenceSources={evidenceSources} agentTasks={agentTasks} />
        )}
      </div>
    </div>
  );
}
