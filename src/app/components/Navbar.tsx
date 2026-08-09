import { useEffect, useRef, useState, type RefObject } from "react";
import { FOCUSED_INCIDENT_QUEUE, INCIDENT, getIncidentQueueItem } from "../mockData";
import { MODE_META, WORKFLOW_META, ShellState, T, border, font, radius, space, surface, tint, tracking, typeScale, typeStyle, typeWeight } from "../tokens";
import { OperationalIcon } from "./OperationalIcon";
import { PopoverSurface, usePopoverDismissal } from "./shared/PopoverSurface";

interface NavbarProps {
  state: ShellState;
  timeString: string;
  incidentElapsed: number;
  onShiftHandover?: () => void;
  onOpenTimeline?: () => void;
  timelineOpen?: boolean;
  timelineTriggerRef?: RefObject<HTMLButtonElement>;
  coreMode?: boolean;
}

export function Navbar({
  state,
  timeString,
  incidentElapsed,
  onShiftHandover,
  onOpenTimeline,
  timelineOpen,
  timelineTriggerRef,
  coreMode = false,
}: NavbarProps) {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const compact = viewportWidth < 1440;
  const narrow = viewportWidth < 1320;

  return (
    <>
      <BrandBlock compact={compact} />

      {!narrow ? <VerticalDivider /> : null}

      <IncidentStatusBlock state={state} compact={compact} />
      {!coreMode && !narrow ? <IncidentQueueControl state={state} /> : null}

      <div style={{ flex: "1 1 auto", minWidth: 12 }} />

      {/* V2 centerpiece — Intelligence/Operations phase + escalation benchmark */}
      <WorkflowPhaseBlock
        state={state}
        incidentElapsed={incidentElapsed}
        compact={compact || coreMode}
        minimal={coreMode}
      />

      <div style={{ flex: "1 1 auto", minWidth: 12 }} />

      {!coreMode && viewportWidth >= 1500 ? <EnvironmentMetrics state={state} /> : null}

      {!coreMode ? <VerticalDivider /> : null}

      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexShrink: 0 }}>
        {!coreMode && !compact && onShiftHandover && (
          <HandoverButton state={state} onShiftHandover={onShiftHandover} />
        )}
        {!coreMode ? (
          <SystemControls
            state={state}
            onOpenTimeline={onOpenTimeline}
            timelineOpen={timelineOpen}
            timelineTriggerRef={timelineTriggerRef}
            compact={compact}
          />
        ) : null}
        {!coreMode ? <div style={{ width: 1, height: 16, background: border.default }} /> : null}
        <OperatorClock state={state} timeString={timeString} hideOperator={narrow && !coreMode} />
      </div>
    </>
  );
}

function BrandBlock({ compact }: { compact: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: space.sm, minWidth: compact ? 118 : 150, flexShrink: 0 }}>
      <FlytBaseLogo />
      <span
        style={{
          fontFamily: font.sans,
          fontSize: typeStyle.brand.size,
          fontWeight: typeStyle.brand.weight,
          lineHeight: `${typeStyle.brand.lineHeight}px`,
          color: T.textPrimary,
          letterSpacing: tracking.tight,
          whiteSpace: "nowrap",
        }}
      >
        FlytBase
        {!compact ? <span style={{ color: T.textMuted, fontWeight: typeWeight.regular, marginLeft: space.sm, fontSize: typeScale.body }}>Sentinel</span> : null}
      </span>
    </div>
  );
}

function IncidentQueueControl({ state }: { state: ShellState }) {
  const [open, setOpen] = useState(false);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const activeId = state.activeIncidentId ?? INCIDENT.id;
  const inspected = getIncidentQueueItem(inspectedId);

  usePopoverDismissal({
    open,
    onClose: () => {
      setOpen(false);
      setInspectedId(null);
    },
    triggerRef,
    surfaceRef,
  });

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open incident queue"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        style={{
          minHeight: 30,
          display: "inline-flex",
          alignItems: "center",
          gap: space.sm,
          padding: `0 ${space.sm}px`,
          border: `1px solid ${open ? tint(T.cyan, 0.46) : border.default}`,
          borderRadius: radius.control,
          background: open ? tint(T.cyan, 0.1) : surface.control,
          color: open ? T.cyan : T.textSecondary,
          cursor: "pointer",
          fontFamily: font.sans,
          fontSize: typeScale.label,
          fontWeight: typeWeight.semibold,
        }}
      >
        <OperationalIcon name="radio" color={open ? T.cyan : T.textSecondary} size={13} />
        Queue {FOCUSED_INCIDENT_QUEUE.length}
      </button>

      {open ? (
        <PopoverSurface ref={surfaceRef} ariaLabel="Incident queue" width={328} style={{ top: 38, right: 0 }}>
          <div style={{ padding: `${space.md}px ${space.md}px`, borderBottom: `1px solid ${border.soft}` }}>
            <div style={{ color: T.textPrimary, fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.bold }}>
              Incident queue
            </div>
            <div style={{ marginTop: space.xs, color: T.textMuted, fontFamily: font.sans, fontSize: typeScale.caption, lineHeight: 1.4 }}>
              Grid 4C is the only fully simulated incident. Other entries expose summary data without implying a live operational model.
            </div>
          </div>
          <div style={{ padding: space.sm, display: "flex", flexDirection: "column", gap: space.xs }}>
            {FOCUSED_INCIDENT_QUEUE.map((incident) => {
              const selected = inspectedId === incident.id;
              const active = incident.id === activeId;
              const color = incident.severity === "danger" ? T.red : incident.severity === "caution" ? T.amber : T.cyan;
              return (
                <button
                  key={incident.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setInspectedId((current) => current === incident.id ? null : incident.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: `1px solid ${selected ? tint(color, 0.46) : border.soft}`,
                    borderRadius: radius.control,
                    background: selected ? tint(color, 0.08) : "transparent",
                    padding: `${space.sm}px`,
                    color: T.textPrimary,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: space.sm }}>
                    <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold }}>{incident.label}</span>
                    <span style={{ color, fontFamily: font.mono, fontSize: typeScale.metadata }}>{active ? "ACTIVE" : "SUMMARY"}</span>
                  </div>
                  <div style={{ marginTop: space.xs, color: T.textMuted, fontFamily: font.sans, fontSize: typeScale.caption }}>
                    {incident.location} · {incident.lastUpdated}
                  </div>
                </button>
              );
            })}
          </div>
          {inspected && inspected.kind === "summary" ? (
            <div style={{ margin: `0 ${space.sm}px ${space.sm}px`, borderTop: `1px solid ${border.soft}`, padding: `${space.sm}px ${space.sm}px 0` }}>
              <div style={{ color: T.textSecondary, fontFamily: font.sans, fontSize: typeScale.caption, lineHeight: 1.45 }}>
                {inspected.summary}
              </div>
              <div style={{ marginTop: space.sm, color: T.textMuted, fontFamily: font.mono, fontSize: typeScale.metadata }}>
                {inspected.dataFreshness} · Read-only summary
              </div>
            </div>
          ) : null}
        </PopoverSurface>
      ) : null}
    </div>
  );
}

function FlytBaseLogo() {
  /*
   * Sentinel mark — one geometric glyph in the system's own palette:
   * a locator diamond with a live core, echoing the radar motif TALON
   * uses on the command orb. Single color, no gradients.
   */
  return (
    <div style={{ width: 28, height: 28, flexShrink: 0 }} aria-label="FlytBase Sentinel" role="img">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
        <rect
          x="6.7"
          y="6.7"
          width="14.6"
          height="14.6"
          rx="3.2"
          transform="rotate(45 14 14)"
          fill={tint(T.cyan, 0.08)}
          stroke={T.cyan}
          strokeWidth="1.6"
        />
        <circle cx="14" cy="14" r="2.8" fill={T.cyan} />
        <path d="M14 3.2 V 7.4" stroke={T.cyan} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      </svg>
    </div>
  );
}

/**
 * IncidentStatusBlock — "what am I looking at"
 * Merges operational mode, active incident ID, and a live status line into one
 * grouped unit (Law of Proximity). The incident ID gives the command system
 * accountability anchoring; the status line tells the operator the current beat.
 */
function IncidentStatusBlock({ state, compact }: { state: ShellState; compact: boolean }) {
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
  else if (scene === "verify-active") detail = "Convergence active · 78% confidence";
  else if (scene === "monitoring-contested") detail = "Contested watch · operator closed, TALON holding";
  else if (scene === "talon-reraise") detail = "New evidence since override · escalated to supervisor";
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
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, overflow: "hidden", flexShrink: 1 }} role="status" aria-label={`${meta.label}. ${detail}`}>
      {/* Mode chip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 9px",
          borderRadius: radius.control,
          background: `${meta.color}14`,
          border: `1px solid ${meta.color}30`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold, color: meta.color, whiteSpace: "nowrap" }}>
          {meta.label}
        </span>
      </div>

      {/* Incident ID + status line */}
      <div style={{ minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.label, color: isActive ? T.textSecondary : T.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {isActive ? INCIDENT.id : "No active incident"}
        </span>
        {!compact ? (
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
            {detail}
          </span>
        ) : null}
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
function WorkflowPhaseBlock({
  state,
  incidentElapsed,
  compact,
  minimal,
}: {
  state: ShellState;
  incidentElapsed: number;
  compact: boolean;
  minimal: boolean;
}) {
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
          borderRadius: radius.pill,
          background: `${meta.color}1A`,
          border: `1px solid ${meta.color}44`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold, color: meta.color, whiteSpace: "nowrap" }}>
            {meta.label}
          </span>
          {!compact ? (
            <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted, whiteSpace: "nowrap", marginTop: space.xs }}>
              {meta.description}
            </span>
          ) : null}
        </div>
      </div>

      {/* Stage stepper — where the operator is INSIDE the Intelligence window */}
      {!compact && isIntelligence && isActiveIncident && (
        <StageStepper state={state} isNotified={isNotified} />
      )}

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
            <div style={{ fontFamily: font.mono, fontSize: typeScale.body, fontWeight: typeWeight.bold, color: arcColor, letterSpacing: "0.02em" }}>
              {isNotified ? "Escalated" : elapsedStr}
            </div>
            {!minimal ? (
              <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted, marginTop: space.xs, whiteSpace: "nowrap" }}>
                {isNotified ? "Authority notified" : compact ? "90s benchmark" : "Clock stops at authority notify"}
              </div>
            ) : null}
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
            borderRadius: radius.control,
            background: "rgba(45,212,160,0.08)",
            border: "1px solid rgba(45,212,160,0.2)",
          }}
        >
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.teal, fontWeight: typeWeight.semibold }}>
            TALON supervising
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * StageStepper — Scan → Verify → Escalate, so the operator always knows where
 * they are inside the 90-second Intelligence window. Completed stages settle
 * teal, the current stage pulses in the phase color, upcoming stages stay muted.
 */
function StageStepper({ state, isNotified }: { state: ShellState; isNotified: boolean }) {
  const escalateActive = state.scene === "authority-notification-ready";
  const stages: Array<{ label: string; status: "done" | "current" | "upcoming" }> = [
    {
      label: "Scan",
      status: state.mode === "scan" && !isNotified ? "current" : "done",
    },
    {
      label: "Verify",
      status:
        isNotified || escalateActive
          ? "done"
          : state.mode === "verify"
            ? "current"
            : "upcoming",
    },
    {
      label: "Escalate",
      status: isNotified ? "done" : escalateActive ? "current" : "upcoming",
    },
  ];

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
      aria-label={`Intelligence stages: ${stages.map((s) => `${s.label} ${s.status}`).join(", ")}`}
    >
      {stages.map((stage, index) => {
        const color =
          stage.status === "done" ? T.teal : stage.status === "current" ? T.amber : T.textMuted;
        return (
          <div key={stage.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {stage.status === "done" ? (
                <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M1.5 5.2l2.4 2.5 4.6-5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: stage.status === "current" ? color : "transparent",
                    border: `1px solid ${color}`,
                    animation: stage.status === "current" ? "pulse 1.6s infinite" : undefined,
                  }}
                  aria-hidden="true"
                />
              )}
              <span
                style={{
                  fontFamily: font.sans,
                  fontSize: typeScale.label,
                  fontWeight: stage.status === "current" ? 700 : 500,
                  color,
                }}
              >
                {stage.label}
              </span>
            </div>
            {index < stages.length - 1 && (
              <span aria-hidden="true" style={{ width: 10, height: 1, background: border.strong }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function VerticalDivider() {
  return <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} aria-hidden="true" />;
}

function HandoverButton({ state, onShiftHandover }: { state: ShellState; onShiftHandover: () => void }) {
  const isActive = state.scene !== "baseline";
  const btnColor = isActive ? T.amber : T.textSecondary;
  const bgAlpha = isActive ? "rgba(245,166,35,0.12)" : "rgba(255,255,255,0.04)";
  const borderColor = isActive ? "rgba(245,166,35,0.3)" : "rgba(255,255,255,0.08)";
  return (
    <button
      type="button"
      onClick={onShiftHandover}
      title="Transfer operational authority"
      style={{
        background: bgAlpha,
        border: `1px solid ${borderColor}`,
        borderRadius: radius.control,
        padding: "6px 9px",
        fontFamily: font.sans,
        fontSize: typeScale.label,
        fontWeight: typeWeight.semibold,
        color: btnColor,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "background 180ms ease, border-color 180ms ease, color 180ms ease",
        flexShrink: 0,
      }}
    >
      <OperationalIcon actionId="shift-handover" color={btnColor} size={13} />
      Handover
    </button>
  );
}

/**
 * EnvironmentMetrics — quiet contextual telemetry.
 * Two most-relevant live numbers per phase. Hidden on narrow viewports so the
 * navbar centerpiece never gets crowded (progressive disclosure).
 */
function EnvironmentMetrics({ state }: { state: ShellState }) {
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
          <span style={{ fontFamily: font.mono, fontSize: typeScale.body, fontWeight: typeWeight.bold, color: T.textPrimary }}>{m.value}</span>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted, marginTop: space.xs }}>{m.label}</span>
        </div>
      ))}
    </div>
  );
}

function OperatorClock({
  state,
  timeString,
  hideOperator,
}: {
  state: ShellState;
  timeString: string;
  hideOperator: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <span style={{ fontFamily: font.mono, fontSize: typeScale.title, fontWeight: typeWeight.bold, color: T.textPrimary, letterSpacing: "0.04em" }}>{timeString} UTC</span>
      {!hideOperator ? <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: font.sans,
          fontSize: typeScale.label,
          color: T.cyan,
          padding: "3px 8px",
          background: "rgba(0,200,255,0.1)",
          border: "1px solid rgba(0,200,255,0.2)",
          borderRadius: radius.control,
        }}
        title="Operator on authority"
      >
        <OperationalIcon name="operator" color={T.cyan} size={11} />
        {state.activeOperator || INCIDENT.operator}
      </span> : null}
    </div>
  );
}

function SystemControls({
  state,
  onOpenTimeline,
  timelineOpen,
  timelineTriggerRef,
  compact,
}: {
  state: ShellState;
  onOpenTimeline?: () => void;
  timelineOpen?: boolean;
  timelineTriggerRef?: RefObject<HTMLButtonElement>;
  compact: boolean;
}) {
  const latest = state.activityLog[0];
  const latestColor = latest?.severity === "danger"
    ? T.red
    : latest?.severity === "caution"
      ? T.amber
      : latest?.severity === "safe"
        ? T.teal
        : T.cyan;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        ref={timelineTriggerRef}
        type="button"
        onClick={onOpenTimeline}
        aria-haspopup="true"
        aria-expanded={timelineOpen}
        style={{
          ...navBtnStyle,
          maxWidth: compact ? 72 : 188,
          borderColor: timelineOpen ? tint(T.cyan, 0.34) : border.default,
          background: timelineOpen ? tint(T.cyan, 0.1) : surface.control,
        }}
        title="Open action timeline"
      >
        <span style={{ color: latestColor, fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold }}>
          Timeline
        </span>
        {!compact ? <span
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: T.textMuted,
            fontSize: typeScale.caption,
          }}
        >
          {latest ? latest.type : "No entries"}
        </span> : null}
        <span
          style={{
            background: tint(latestColor, 0.18),
            color: latestColor,
            borderRadius: radius.dense,
            padding: `${space.xs}px ${space.sm}px`,
            fontSize: typeScale.eyebrow,
            fontFamily: font.mono,
            fontWeight: typeWeight.heavy,
            flexShrink: 0,
          }}
        >
          {state.activityLog.length}
        </span>
      </button>

      <NotificationButton state={state} />
      <SettingsButton state={state} />
    </div>
  );
}

function NotificationButton({ state }: { state: ShellState }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const unread = state.activityLog.filter((e) => e.severity === "danger" || e.severity === "caution").length;
  const recent = state.activityLog.slice(0, 4);
  usePopoverDismissal({
    open,
    onClose: () => setOpen(false),
    triggerRef,
    surfaceRef,
  });

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Notifications${unread > 0 ? `, ${unread} alerts` : ""}`}
        style={{
          ...navBtnStyle,
          width: 28,
          justifyContent: "center",
          position: "relative",
          borderColor: open ? tint(T.cyan, 0.3) : border.default,
          background: open ? tint(T.cyan, 0.08) : surface.control,
          color: open ? T.cyan : T.textMuted,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 ? (
          <span style={{
            position: "absolute", top: 1, right: 1, minWidth: 12, height: 12,
            borderRadius: radius.pill, background: T.amber, color: T.bgBase,
            fontFamily: font.mono, fontSize: typeScale.metadata, fontWeight: typeWeight.heavy,
            display: "grid", placeItems: "center",
          }} aria-hidden="true">{Math.min(unread, 9)}</span>
        ) : null}
      </button>

      {open && (
          <PopoverSurface ref={surfaceRef} ariaLabel="System notifications">
            <div style={{ padding: `${space.md}px ${space.lg}px`, borderBottom: `1px solid ${border.subtle}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.semibold, color: T.textPrimary }}>System notifications</span>
              <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: unread > 0 ? T.amber : T.teal }}>
                {unread > 0 ? `${unread} active` : "All clear"}
              </span>
            </div>
            {recent.length === 0 ? (
              <div style={{ padding: `${space.lg}px ${space.lg}px`, fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted, textAlign: "center" }}>
                No notifications yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recent.map((entry) => {
                  const dotColor = entry.severity === "danger" ? T.red : entry.severity === "caution" ? T.amber : entry.severity === "safe" ? T.teal : T.cyan;
                  return (
                    <div key={entry.id} style={{
                      padding: `${space.sm}px ${space.lg}px`, borderBottom: `1px solid ${border.soft}`,
                    }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: dotColor }}>{entry.actor} · {entry.type}</span>
                          <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, flexShrink: 0 }}>{entry.ts}</span>
                        </div>
                        <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary, lineHeight: 1.4, marginTop: space.xs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </PopoverSurface>
      )}
    </div>
  );
}

function SettingsButton({ state }: { state: ShellState }) {
  const [open, setOpen] = useState(false);
  const [density, setDensity] = useState<"Compact" | "Comfortable">("Compact");
  const [soundAlerts, setSoundAlerts] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  usePopoverDismissal({
    open,
    onClose: () => setOpen(false),
    triggerRef,
    surfaceRef,
  });

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Operator settings"
        style={{
          ...navBtnStyle,
          width: 28,
          justifyContent: "center",
          borderColor: open ? tint(T.cyan, 0.3) : border.default,
          background: open ? tint(T.cyan, 0.08) : surface.control,
          color: open ? T.cyan : T.textMuted,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
          <PopoverSurface ref={surfaceRef} ariaLabel="Operator preferences" width={248}>
            <div style={{ padding: `${space.md}px ${space.lg}px`, borderBottom: `1px solid ${border.subtle}` }}>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.semibold, color: T.textPrimary }}>Operator preferences</div>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted, marginTop: space.xs }}>{state.activeOperator || INCIDENT.operator} · on authority</div>
            </div>
            <div style={{ padding: "8px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
              <SettingsRow
                label="Display density"
                value={density}
                onToggle={() => setDensity((d) => d === "Compact" ? "Comfortable" : "Compact")}
              />
              <SettingsRow
                label="Sound alerts"
                value={soundAlerts ? "On" : "Off"}
                valueColor={soundAlerts ? T.teal : T.textMuted}
                onToggle={() => setSoundAlerts((v) => !v)}
              />
              <SettingsRow label="Map labels" value="Operational" />
              <SettingsRow label="Rail layout" value="Fixed" />
            </div>
            <div style={{ padding: `${space.sm}px ${space.lg}px`, borderTop: `1px solid ${border.subtle}` }}>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted }}>
                FlytBase Sentinel · Build 2024-0847
              </div>
            </div>
          </PopoverSurface>
      )}
    </div>
  );
}

function SettingsRow({
  label,
  value,
  valueColor,
  onToggle,
}: {
  label: string;
  value: string;
  valueColor?: string;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!onToggle}
      style={{
        width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 8px", borderRadius: radius.control, border: "none",
        background: onToggle ? "transparent" : "transparent",
        cursor: onToggle ? "pointer" : "default",
        transition: "background 100ms ease",
      }}
      onMouseEnter={(e) => { if (onToggle) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textSecondary }}>{label}</span>
      <span style={{ fontFamily: font.mono, fontSize: typeScale.label, color: valueColor ?? T.cyan }}>{value}</span>
    </button>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: radius.control,
  padding: "6px 10px",
  fontFamily: font.sans,
  fontSize: typeScale.label,
  color: T.textSecondary,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
};
