import { INCIDENT } from "../mockData";
import { MODE_META, WORKFLOW_META, ShellState, T, font } from "../tokens";
import { OperationalIcon } from "./OperationalIcon";

interface NavbarProps {
  state: ShellState;
  timeString: string;
  incidentElapsed: number;
  onShiftHandover?: () => void;
}

export function Navbar({ state, timeString, incidentElapsed, onShiftHandover }: NavbarProps) {
  return (
    <>
      <BrandBlock />

      <VerticalDivider />

      <IncidentStatusBlock state={state} />

      <div style={{ flex: "1 1 auto", minWidth: 12 }} />

      {/* V2 centerpiece — Intelligence/Operations phase + escalation benchmark */}
      <WorkflowPhaseBlock state={state} incidentElapsed={incidentElapsed} />

      <div style={{ flex: "1 1 auto", minWidth: 12 }} />

      <EnvironmentMetrics state={state} />

      <VerticalDivider />

      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexShrink: 0 }}>
        {onShiftHandover && (
          <button
            type="button"
            onClick={onShiftHandover}
            title="Transfer operational authority"
            style={{
              background: "rgba(245, 166, 35, 0.12)",
              border: `1px solid rgba(245, 166, 35, 0.3)`,
              borderRadius: 8,
              padding: "6px 9px",
              fontFamily: font.sans,
              fontSize: 11,
              fontWeight: 600,
              color: T.amber,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 120ms ease",
              flexShrink: 0,
            }}
          >
            <OperationalIcon actionId="shift-handover" color={T.amber} size={13} />
            Handover
          </button>
        )}
        <SystemControls />
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
        <OperatorClock state={state} timeString={timeString} />
      </div>
    </>
  );
}

function BrandBlock() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 150, flexShrink: 0 }}>
      <DroneIcon />
      <span
        style={{
          fontFamily: font.sans,
          fontSize: 14,
          fontWeight: 700,
          color: T.textPrimary,
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
        }}
      >
        Flyt<span style={{ color: T.cyan }}>Base</span>
        <span style={{ color: T.textMuted, fontWeight: 400, marginLeft: 6, fontSize: 12 }}>Sentinel</span>
      </span>
    </div>
  );
}

/**
 * IncidentStatusBlock — "what am I looking at"
 * Merges operational mode, active incident ID, and a live status line into one
 * grouped unit (Law of Proximity). The incident ID gives the command system
 * accountability anchoring; the status line tells the operator the current beat.
 */
function IncidentStatusBlock({ state }: { state: ShellState }) {
  const meta = MODE_META[state.mode];
  const scene = state.scene;
  const isActive = scene !== "baseline";

  const activeScout = state.drones.find(
    (d) => d.assignedMission === "investigation" || d.droneClass === "thermal-lidar" || d.status === "en-route"
  );
  const scoutName = activeScout ? activeScout.name : "Scout-02";
  const scoutGrid = activeScout?.gridLabel || "Grid 4C";
  const degradedDrone = state.drones.find((d) => d.status === "signal-degraded");

  let detail = "Quiet watch · all sensors nominal";
  if (scene === "alert-command") detail = "Thermal spike detected · Grid 4C";
  else if (scene === "investigation-pending") detail = `${scoutName} en route · verifying ${scoutGrid}`;
  else if (scene === "verify-ready") detail = "Evidence ready for assessment";
  else if (scene === "verify-active") detail = "Convergence active · 78% confidence";
  else if (scene === "authority-notification-ready") detail = "Authority packet staged for send";
  else if (scene === "contain-recommended") detail = "Protection plan staging";
  else if (scene === "contain-alternate") detail = `${state.planVariant === "alternate" ? "Alternate" : "Recommended"} plan loaded`;
  else if (scene === "contain-degraded") detail = "Fallback evidence mode";
  else if (scene === "satellite-feed-loss") detail = "Satellite offline · drone-weighted";
  else if (scene === "network-degraded") detail = "Low-bandwidth failback active";
  else if (scene === "rescue-signal-degraded") detail = degradedDrone ? `${degradedDrone.name} signal exception` : "Signal exception";
  else if (scene === "rescue-battery-critical") detail = "Supervised battery handoff pending";
  else if (scene === "infrastructure-total-loss") detail = "Manual protocol active";
  else if (scene === "rescue-nominal") {
    const airborne = state.drones.filter(d => d.status === "assigned" || d.status === "holding" || d.status === "signal-degraded").length;
    detail = `Coordinating ${airborne} field assets`;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }} role="status" aria-label={`${meta.label}. ${detail}`}>
      {/* Mode chip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 9px",
          borderRadius: 8,
          background: `${meta.color}14`,
          border: `1px solid ${meta.color}30`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: meta.color,
            animation: isActive ? "pulse 1.2s infinite" : undefined,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <span style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 700, color: meta.color, whiteSpace: "nowrap" }}>
          {meta.label}
        </span>
      </div>

      {/* Incident ID + status line */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontFamily: font.mono, fontSize: 10, color: isActive ? T.textSecondary : T.textMuted, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
          {isActive ? INCIDENT.id : "NO ACTIVE INCIDENT"}
        </span>
        <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 240 }}>
          {detail}
        </span>
      </div>
    </div>
  );
}

/**
 * WorkflowPhaseBlock — V2 centerpiece
 *
 * Shows the two-phase Intelligence / Operations model. The escalation timer is
 * framed as an ASPIRATION against the 90-second benchmark, not a pressure
 * countdown. It counts elapsed time calmly and celebrates the achievement when
 * authorities are notified — "the goal is to compress 48 minutes toward 90s",
 * never to punish the operator for taking the time a real decision needs.
 */
function WorkflowPhaseBlock({ state, incidentElapsed }: { state: ShellState; incidentElapsed: number }) {
  const { workflowPhase } = state;
  const meta = WORKFLOW_META[workflowPhase];
  const isIntelligence = workflowPhase === "intelligence";
  const isActiveIncident = state.scene !== "baseline";
  const isNotified = state.authoritiesNotified || workflowPhase === "operations";

  const BENCHMARK = 90;
  const elapsed = incidentElapsed;
  const pct = Math.min(100, (elapsed / BENCHMARK) * 100);
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  const elapsedStr = `T+${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  // Calm informational tone — never an alarming "overdue" red
  const arcColor = isNotified ? T.teal : elapsed > BENCHMARK ? T.amber : T.cyan;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }} aria-label={`Phase: ${meta.label}. ${meta.description}`}>
      {/* Phase pill — larger, the navbar's visual anchor */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          borderRadius: 999,
          background: `${meta.color}1A`,
          border: `1px solid ${meta.color}44`,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: meta.color,
            animation: isActiveIncident ? "pulse 1.8s infinite" : undefined,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontFamily: font.mono, fontSize: 10, fontWeight: 700, color: meta.color, letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {meta.label}
          </span>
          <span style={{ fontFamily: font.sans, fontSize: 9, color: `${meta.color}99`, whiteSpace: "nowrap", marginTop: 3 }}>
            {meta.description}
          </span>
        </div>
      </div>

      {/* Escalation benchmark — Intelligence phase, active incident */}
      {isIntelligence && isActiveIncident && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} aria-label={isNotified ? "Authorities notified" : `Elapsed ${elapsedStr} toward 90 second benchmark`}>
          <div style={{ position: "relative", width: 30, height: 30, flexShrink: 0 }}>
            <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
              <circle cx="15" cy="15" r="12" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
              <circle
                cx="15" cy="15" r="12" fill="none"
                stroke={arcColor} strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 12}`}
                strokeDashoffset={`${2 * Math.PI * 12 * (1 - pct / 100)}`}
                transform="rotate(-90 15 15)"
                style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease" }}
              />
              {isNotified && (
                <path d="M10 15.2l3 3.1 7-7.4" fill="none" stroke={T.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: font.mono, fontSize: 12, fontWeight: 700, color: arcColor, letterSpacing: "0.02em" }}>
              {isNotified ? "Escalated" : elapsedStr}
            </div>
            <div style={{ fontFamily: font.sans, fontSize: 9, color: T.textMuted, marginTop: 3 }}>
              {isNotified ? `Authorities notified · ${elapsedStr}` : "toward 90s benchmark"}
            </div>
          </div>
        </div>
      )}

      {/* Operations — TALON supervising indicator */}
      {!isIntelligence && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            borderRadius: 8,
            background: "rgba(45,212,160,0.08)",
            border: "1px solid rgba(45,212,160,0.2)",
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.teal, animation: "pulse 1.5s infinite" }} aria-hidden="true" />
          <span style={{ fontFamily: font.mono, fontSize: 9, color: T.teal, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            TALON Supervising
          </span>
        </div>
      )}
    </div>
  );
}

function VerticalDivider() {
  return <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} aria-hidden="true" />;
}

function DroneIcon() {
  return (
    <div
      style={{
        width: 24,
        height: 24,
        background: "rgba(0,200,255,0.12)",
        border: "1px solid rgba(0,200,255,0.3)",
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        flexShrink: 0,
      }}
      aria-label="FlytBase Sentinel"
      role="img"
    >
      <div style={{ position: "absolute", width: 13, height: 1.5, background: T.cyan }} />
      <div style={{ position: "absolute", width: 1.5, height: 13, background: T.cyan }} />
      <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.cyan, position: "absolute" }} />
    </div>
  );
}

/**
 * EnvironmentMetrics — quiet contextual telemetry.
 * Two most-relevant live numbers per phase. Hidden on narrow viewports so the
 * navbar centerpiece never gets crowded (progressive disclosure).
 */
function EnvironmentMetrics({ state }: { state: ShellState }) {
  const compactViewport = typeof window !== "undefined" && window.innerWidth < 1500;
  if (compactViewport) return null;

  const avgBattery = state.drones.length > 0
    ? Math.round(state.drones.reduce((sum, d) => sum + d.battery, 0) / state.drones.length)
    : 100;

  let metrics: Array<{ label: string; value: string }> = [];
  switch (state.mode) {
    case "scan":
      metrics = [
        { label: "Fleet", value: `${state.drones.length} ready` },
        { label: "Avg battery", value: `${avgBattery}%` },
      ];
      break;
    case "verify":
      metrics = [
        { label: "Confidence", value: "78%" },
        { label: "Wind", value: INCIDENT.windVector.split(" · ")[0] },
      ];
      break;
    case "contain":
    case "rescue": {
      const airborne = state.drones.filter(
        (d) => d.status === "assigned" || d.status === "en-route" || d.status === "holding" || d.status === "signal-degraded"
      ).length;
      metrics = [
        { label: "Structures", value: `${INCIDENT.structuresAtRisk} exposed` },
        { label: "Airborne", value: `${airborne}` },
      ];
      break;
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
      {metrics.map((m) => (
        <div key={m.label} style={{ display: "flex", flexDirection: "column", lineHeight: 1, alignItems: "flex-end" }}>
          <span style={{ fontFamily: font.mono, fontSize: 12, fontWeight: 700, color: T.textPrimary }}>{m.value}</span>
          <span style={{ fontFamily: font.mono, fontSize: 8, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>{m.label}</span>
        </div>
      ))}
    </div>
  );
}

function OperatorClock({ state, timeString }: { state: ShellState; timeString: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <span style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 700, color: T.textPrimary, letterSpacing: "0.04em" }}>{timeString} UTC</span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: font.sans,
          fontSize: 11,
          color: T.cyan,
          padding: "3px 8px",
          background: "rgba(0,200,255,0.1)",
          border: "1px solid rgba(0,200,255,0.2)",
          borderRadius: 6,
        }}
        title="Operator on authority"
      >
        <OperationalIcon name="operator" color={T.cyan} size={11} />
        {state.activeOperator || INCIDENT.operator}
      </span>
    </div>
  );
}

function SystemControls() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button style={navBtnStyle} title="Active incidents">
        <span>Incidents</span>
        <div style={{ background: T.amber, color: "#000", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 800 }}>1</div>
      </button>

      <button style={{ ...navBtnStyle, width: 28, justifyContent: "center" }} aria-label="Notifications">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </button>

      <button style={{ ...navBtnStyle, width: 28, justifyContent: "center" }} aria-label="Settings">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  padding: "6px 10px",
  fontFamily: font.sans,
  fontSize: 11,
  color: T.textSecondary,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
};
