import { getZoneLabel } from "../../mockData";
import { getOperationalException } from "../../domain/exceptions";
import { GI, PANEL_TITLES, getDensity, type PriorityRiskItem, type ShellState, T, font } from "../../tokens";
import { ACTION_LABELS } from "../ActionBar";
import { PanelCard } from "../shared/PanelCard";
import { PanelDataViz, PanelExceptionCard, PanelMetricRow, PanelStateBlock } from "../shared/RailPanelFrame";
import { Section } from "../shared/Section";
import { TinyMetric } from "../shared/TinyMetric";

interface PriorityPanelProps {
  state: ShellState;
  onAcknowledgePriority: (priorityId: string) => void;
}
interface GroundTeamsPanelProps {
  state: ShellState;
  onSelectTeam: (teamId: string) => void;
}

export function ExceptionPanel({ state }: { state: ShellState }) {
  const exception = state.operationalException ?? getOperationalException(state.scene);

  if (!exception) {
    return (
      <PanelCard title="Exception Queue" badgeLabel="CLEAR" badgeColor={T.teal}>
        <PanelStateBlock
          state="complete"
          title="No active exceptions"
          body="TALON has not detected a degraded source, blocked agent, or manual-protocol condition."
        />
      </PanelCard>
    );
  }

  const severityTone =
    exception.severity === "critical" || exception.severity === "blocked"
      ? T.red
      : exception.severity === "degraded"
        ? T.amber
        : T.cyan;
  const confidenceValue = exception.confidenceImpact.includes("40%") ? 40 : exception.severity === "critical" ? 0 : exception.severity === "blocked" ? 58 : 72;

  return (
    <PanelCard
      title="Exception Queue"
      badgeLabel={exception.severity.toUpperCase()}
      badgeColor={severityTone}
    >
      <PanelExceptionCard
        title={exception.title}
        severity={exception.severity}
        body={exception.auditText}
      />

      <Section label="Capability Impact">
        <PanelMetricRow label="Status" value={exception.status.toUpperCase()} tone={severityTone} />
        <PanelMetricRow label="Confidence" value={exception.confidenceImpact} tone={severityTone} />
        <PanelDataViz value={confidenceValue} color={severityTone} />
      </Section>

      <Section label="Affected Agents">
        {exception.affectedAgents.map((agent) => (
          <PanelMetricRow key={agent} label={agent} value="AFFECTED" tone={severityTone} />
        ))}
      </Section>

      <Section label="Fallback Inputs">
        {exception.fallbackInputs.map((input) => (
          <PanelMetricRow key={input} label={input} value="ACTIVE" tone={T.teal} />
        ))}
      </Section>

      <PanelStateBlock
        state={exception.status === "manual" ? "blocked" : exception.severity === "degraded" ? "degraded" : "loading"}
        title={exception.recommendedRecoveryCommand ? `${ACTION_LABELS[exception.recommendedRecoveryCommand]} prepared` : "Manual protocol required"}
        body={exception.mapImpact}
      />
    </PanelCard>
  );
}

// ─── Priority / Right Rail Panel ─────────────────────────────────────────────

export function PriorityPanel({ state, onAcknowledgePriority }: PriorityPanelProps) {
  const density = getDensity(state.mode);
  const titles = PANEL_TITLES[state.mode];
  const isOperations = state.workflowPhase === "operations";

  if (isOperations) {
    const cleared = state.rescueProgress.cleared;
    const total = state.rescueProgress.total;
    const pct = Math.round((cleared / total) * 100);

    return (
      <PanelCard
        title="Evacuation Tracker"
        badgeLabel="ACTIVE OPERATIONS"
        badgeColor={T.fire}
      >
        <Section label="Civilian Evacuation (Residential Zone 1)">
          {/* Evacuation progress and counts */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary }}>Structures Cleared</span>
            <span style={{ fontFamily: font.mono, fontSize: 16, fontWeight: 700, color: T.fire }}>
              {cleared} <span style={{ color: T.textMuted, fontSize: 11, fontWeight: 400 }}>/ {total}</span>
            </span>
          </div>

          {/* Premium glassmorphic progress bar */}
          <div style={{
            height: 14,
            borderRadius: 7,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            position: "relative",
            overflow: "hidden",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)",
            marginBottom: 8,
          }}>
            <div style={{
              width: `${pct}%`,
              height: "100%",
              borderRadius: "6px 0 0 6px",
              background: "linear-gradient(90deg, #FF6B4A 0%, #FF8F3D 50%, #FFD166 100%)",
              boxShadow: "0 0 10px rgba(255, 107, 74, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
              transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              position: "relative",
            }}>
              {/* Shimmer animation strip */}
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15) 50%, transparent)",
                animation: "talonProcessingFlow 2s linear infinite",
                backgroundSize: "200% 100%",
              }} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font.mono, fontSize: 9, color: T.textMuted, marginBottom: 12 }}>
            <span>PROGRESS: {pct}%</span>
            <span>{total - cleared} STRUCTURES LEFT</span>
          </div>
        </Section>

        <Section label="Evacuation Corridor Status">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Route A Card */}
            <div style={{
              borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              padding: "8px 10px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.textPrimary }}>Route A (Egress Core)</span>
                <span style={{
                  fontFamily: font.mono, fontSize: 9, color: T.teal, padding: "2px 6px", borderRadius: 4, background: "rgba(45,212,160,0.1)", border: `1px solid rgba(45,212,160,0.2)`
                }}>{state.rescueProgress.routeA.toUpperCase()}</span>
              </div>
              <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textSecondary, lineHeight: 1.4 }}>
                Civilians routed west to Buffer 2. Flow rate nominal. Audio guidance anchors verified.
              </div>
            </div>

            {/* Route B Card */}
            <div style={{
              borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              padding: "8px 10px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.textPrimary }}>Route B (Standby Lane)</span>
                <span style={{
                  fontFamily: font.mono, fontSize: 9, color: T.yellow, padding: "2px 6px", borderRadius: 4, background: "rgba(255,209,102,0.1)", border: `1px solid rgba(255,209,102,0.2)`
                }}>{state.rescueProgress.routeB.toUpperCase()}</span>
              </div>
              <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textSecondary, lineHeight: 1.4 }}>
                Pre-staged under ambient overwatch. Ready for a TALON reroute proposal if Route A degrades.
              </div>
            </div>
          </div>
        </Section>

        <Section label="Responder Ingress & Staging">
          <div style={{
            borderRadius: 10,
            background: "rgba(255,209,102,0.05)",
            border: `1px solid rgba(255,209,102,0.15)`,
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 6
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.yellow }}>FD Ingress Staging</span>
              <span style={{ fontFamily: font.mono, fontSize: 11, fontWeight: 700, color: T.yellow }}>
                ETA {state.rescueProgress.fireDeptEta}
              </span>
            </div>
            <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textSecondary, lineHeight: 1.4 }}>
              Engine 9 and Command Unit 4 staged at Buffer East service road. Drone guidance lock acquired for active ingress.
            </div>
          </div>
        </Section>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title={titles.priority}
      badgeLabel={`${state.activePriorities.length} LIVE`}
      badgeColor={state.mode === "rescue" ? T.fire : T.red}
    >
      <Section label="Current Priorities">
        {state.activePriorities.slice(0, 3).map((item) => (
          <PriorityCard
            key={item.id}
            item={item}
            density={density}
            canAcknowledge={state.mode === "rescue"}
            onAcknowledge={onAcknowledgePriority}
          />
        ))}
      </Section>
    </PanelCard>
  );
}

export function GroundTeamsPanel({ state, onSelectTeam }: GroundTeamsPanelProps) {
  const density = getDensity(state.mode);
  const isCritical = density === "critical";
  const isCondensed = density === "condensed";
  const titles = PANEL_TITLES[state.mode];
  const isOperations = state.workflowPhase === "operations";

  if (isOperations) {
    return (
      <PanelCard
        title="Ground Team Vitals"
        badgeLabel={`${state.groundTeams.length} FIELD UNITS`}
        badgeColor={T.yellow}
      >
        <Section label="Live Unit Telemetry">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {state.groundTeams.map((team) => {
              const isActive = state.selectedEntity?.type === "team" && state.selectedEntity.id === team.id;

              // Parse HR and VIS from vitals string
              const hrMatch = team.vitals.match(/HR\s*(\d+)/i);
              const visMatch = team.vitals.match(/VIS\s*(\d+)m/i);
              const hr = hrMatch ? parseInt(hrMatch[1]) : 100;
              const vis = visMatch ? parseInt(visMatch[1]) : 150;

              const isHrSpike = hr > 150;
              const isVisDegraded = vis < 10;

              // Connectivity and signals
              const signal = team.id === "bravo" ? 54 : team.id === "alpha" ? 98 : 94;

              const borderTone = isHrSpike ? T.red : isVisDegraded ? T.amber : T.teal;
              const accentColor =
                team.availability === "deployed" ? T.red : team.availability === "staged" ? T.amber : T.teal;

              return (
                <button
                  key={team.id}
                  onClick={() => onSelectTeam(team.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    borderRadius: 14,
                    border: `1px solid ${isActive ? `${borderTone}` : isHrSpike ? `${T.red}44` : "rgba(255,255,255,0.06)"}`,
                    background: isActive
                      ? `${borderTone}0A`
                      : isHrSpike
                        ? "rgba(229, 83, 60, 0.05)"
                        : "rgba(255,255,255,0.02)",
                    padding: "10px 12px",
                    cursor: "pointer",
                    transition: "background 150ms ease, border-color 150ms ease, transform 150ms ease",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6
                  }}
                >
                  {/* Glowing warning line indicator */}
                  {(isHrSpike || isVisDegraded) && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: 3,
                      background: isHrSpike ? T.red : T.amber,
                      animation: isHrSpike ? "pulse 1.2s infinite" : "none",
                    }} />
                  )}

                  {/* Header Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, width: "100%" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 700, color: T.textPrimary }}>
                          {team.name}
                        </span>
                        <span style={{
                          fontFamily: font.mono,
                          fontSize: 9,
                          color: accentColor,
                          padding: "1px 4px",
                          borderRadius: 3,
                          background: `${accentColor}15`,
                          border: `1px solid ${accentColor}25`,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em"
                        }}>
                          {team.availability}
                        </span>
                      </div>
                      <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted, marginTop: 1 }}>
                        {team.unitType}
                      </div>
                    </div>

                    {/* Signal Strength Connectivity */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: signal < 60 ? T.amber : T.textMuted }}>
                        <path d="M12 20h.01" />
                        <path d="M8.5 16.5a5 5 0 0 1 7 0" />
                        <path d="M5 13a10 10 0 0 1 14 0" />
                        {signal >= 80 && <path d="M1.5 9.5a15 15 0 0 1 21 0" />}
                      </svg>
                      <span style={{
                        fontFamily: font.mono,
                        fontSize: 9,
                        color: signal < 60 ? T.amber : T.textMuted,
                        fontWeight: 600
                      }}>
                        {signal}%
                      </span>
                    </div>
                  </div>

                  {/* Assignment and ETA Strip */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    padding: "4px 0",
                    marginTop: 2
                  }}>
                    <span style={{ fontFamily: font.sans, fontSize: 9, color: T.textSecondary }}>
                      Assignment: <strong style={{ color: T.textPrimary }}>{team.assignment}</strong>
                    </span>
                    <span style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted }}>
                      ETA: {team.eta}
                    </span>
                  </div>

                  {/* Biometric readout grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 2, width: "100%" }}>
                    {/* Heart Rate Block */}
                    <div style={{
                      borderRadius: 6,
                      background: isHrSpike ? "rgba(229, 83, 60, 0.08)" : "rgba(255,255,255,0.015)",
                      border: `1px solid ${isHrSpike ? `${T.red}33` : "rgba(255,255,255,0.04)"}`,
                      padding: "4px 6px",
                      display: "flex",
                      flexDirection: "column",
                    }}>
                      <span style={{ fontFamily: font.sans, fontSize: 9, color: T.textMuted, textTransform: "uppercase" }}>Heart Rate</span>
                      <span style={{
                        fontFamily: font.mono,
                        fontSize: 12,
                        fontWeight: 700,
                        color: isHrSpike ? T.red : T.textPrimary,
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}>
                        {isHrSpike && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, animation: "pulse 0.8s infinite" }}>
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                          </svg>
                        )}
                        {hr} <span style={{ fontSize: 9, fontWeight: 400, color: T.textMuted }}>BPM</span>
                      </span>
                    </div>

                    {/* Visibility Block */}
                    <div style={{
                      borderRadius: 6,
                      background: isVisDegraded ? "rgba(245, 166, 35, 0.08)" : "rgba(255,255,255,0.015)",
                      border: `1px solid ${isVisDegraded ? `${T.amber}33` : "rgba(255,255,255,0.04)"}`,
                      padding: "4px 6px",
                      display: "flex",
                      flexDirection: "column",
                    }}>
                      <span style={{ fontFamily: font.sans, fontSize: 9, color: T.textMuted, textTransform: "uppercase" }}>Visibility</span>
                      <span style={{
                        fontFamily: font.mono,
                        fontSize: 12,
                        fontWeight: 700,
                        color: isVisDegraded ? T.amber : T.textPrimary,
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}>
                        {isVisDegraded && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.amber} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <line x1="4" y1="8" x2="20" y2="8" />
                            <line x1="8" y1="12" x2="24" y2="12" />
                            <line x1="2" y1="16" x2="18" y2="16" />
                          </svg>
                        )}
                        {vis}m
                      </span>
                    </div>
                  </div>

                  {/* Warnings */}
                  {isHrSpike && (
                    <div style={{
                      fontFamily: font.mono,
                      fontSize: 9,
                      fontWeight: 700,
                      color: T.red,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 2,
                    }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        BIOMETRIC SPIKE — STRESS INDICATOR
                      </span>
                    </div>
                  )}
                  {isVisDegraded && (
                    <div style={{
                      fontFamily: font.mono,
                      fontSize: 9,
                      fontWeight: 700,
                      color: T.amber,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginTop: 2,
                    }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.amber} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        DEGRADED SIGHT RANGE — SMOKE OBSTRUCTION
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Section>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title={isCritical ? "Evacuation Teams" : titles.priority === "Evacuation Status" ? "Field Teams" : "Ground Teams"}
      badgeLabel={`${state.groundTeams.length} TEAMS`}
      badgeColor={T.yellow}
    >
      <Section label="Field Availability">
        {state.groundTeams.map((team) => {
          const isActive = state.selectedEntity?.type === "team" && state.selectedEntity.id === team.id;
          const color =
            team.availability === "deployed" ? T.red : team.availability === "staged" ? T.amber : T.teal;

          // ── Critical: compact single-line strip ──
          if (isCritical) {
            return (
              <button
                key={team.id}
                onClick={() => onSelectTeam(team.id)}
                aria-label={`${team.name} — ${team.availability}`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 10,
                  border: `1px solid ${isActive ? `${color}55` : "rgba(255,255,255,0.06)"}`,
                  background: isActive ? `${color}10` : "transparent",
                  padding: "7px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <span style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.textPrimary }}>{team.name}</span>
                <span style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted }}>{team.readiness} · {team.eta}</span>
                <StatusDot label={team.availability} color={color} />
              </button>
            );
          }

          // ── Condensed: name + unit + dot, no metrics row ──
          if (isCondensed) {
            return (
              <button
                key={team.id}
                onClick={() => onSelectTeam(team.id)}
                aria-label={`${team.name} — ${team.availability}, ${team.unitType}`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 11,
                  border: `1px solid ${isActive ? `${color}55` : GI.borderDim}`,
                  background: isActive ? `${color}10` : GI.surface,
                  padding: "9px 11px",
                  cursor: "pointer",
                  transition: "border-color 100ms",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{team.name}</div>
                    <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted, marginTop: 2 }}>
                      {team.unitType} · {team.eta}
                    </div>
                  </div>
                  <StatusDot label={team.availability} color={color} />
                </div>
              </button>
            );
          }

          // ── Full: original detailed card ──
          return (
            <button
              key={team.id}
              onClick={() => onSelectTeam(team.id)}
              aria-label={`${team.name} — ${team.availability}, ${team.unitType}`}
              style={{
                width: "100%",
                textAlign: "left",
                borderRadius: 12,
                border: `1px solid ${isActive ? `${color}55` : GI.borderDim}`,
                background: isActive ? `${color}10` : GI.surface,
                padding: "10px 12px",
                cursor: "pointer",
                transition: "border-color 100ms",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div>
                  <div style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{team.name}</div>
                  <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted, marginTop: 2 }}>
                    {team.unitType} · {team.assignment}
                  </div>
                </div>
                <StatusDot label={team.availability} color={color} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
                <TinyMetric label="Readiness" value={team.readiness} />
                <TinyMetric label="ETA" value={team.eta} />
                <TinyMetric label="Zone" value={getZoneLabel(team.linkedZoneId)} />
              </div>
            </button>
          );
        })}
      </Section>
    </PanelCard>
  );
}

// ─── Priority Card (density-adaptive) ────────────────────────────────────────

function PriorityCard({
  item,
  density,
  canAcknowledge,
  onAcknowledge,
}: {
  item: PriorityRiskItem;
  density: "full" | "condensed" | "critical";
  canAcknowledge: boolean;
  onAcknowledge: (priorityId: string) => void;
}) {
  const tone =
    item.severity === "danger"
      ? T.red
      : item.severity === "caution"
        ? T.amber
        : item.severity === "safe"
          ? T.teal
          : T.cyan;

  // ── Critical: metric-style card (numbers and status only) ──
  if (density === "critical") {
    return (
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${tone}22`,
          background: `${tone}0A`,
          padding: "9px 11px",
        }}
        role="article"
        aria-label={`${item.severity} priority: ${item.title}`}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: tone, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {item.areaLabel}
          </div>
          <StatusDot label={item.status} color={tone} />
        </div>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: 12,
            fontWeight: 600,
            color: T.textPrimary,
            lineHeight: 1.3,
            marginTop: 5,
          }}
        >
          {item.title}
        </div>
        {item.linkedActionId && (
          <div style={{ fontFamily: font.mono, fontSize: 10, color: tone, marginTop: 6, opacity: 0.85 }}>
            ▸ {ACTION_LABELS[item.linkedActionId] ?? item.linkedActionId}
          </div>
        )}
        {canAcknowledge && item.severity !== "safe" && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              onClick={() => onAcknowledge(item.id)}
              disabled={item.acknowledged}
              aria-label={item.acknowledged ? `${item.title} — acknowledged` : `Acknowledge: ${item.title}`}
              style={{
                borderRadius: 7,
                border: `1px solid ${item.acknowledged ? GI.borderDim : `${tone}44`}`,
                background: item.acknowledged ? "transparent" : `${tone}14`,
                color: item.acknowledged ? T.textMuted : tone,
                padding: "4px 9px",
                fontFamily: font.sans,
                fontSize: 10,
                fontWeight: 700,
                cursor: item.acknowledged ? "default" : "pointer",
              }}
            >
              {item.acknowledged ? "Acked" : "Ack"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Condensed: title + status + linked action. Rationale hidden. ──
  if (density === "condensed") {
    return (
      <div
        style={{
          borderRadius: 13,
          border: `1px solid ${tone}24`,
          background: `${tone}0B`,
          padding: "10px 11px",
        }}
        role="article"
        aria-label={`${item.severity} priority: ${item.title}`}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontFamily: font.mono, fontSize: 10, color: tone, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {item.areaLabel}
          </div>
          <StatusDot label={item.status} color={tone} />
        </div>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: 12,
            fontWeight: 600,
            color: T.textPrimary,
            lineHeight: 1.35,
            marginTop: 5,
          }}
        >
          {item.title}
        </div>
        {/* Next step is one short sentence — keep it in condensed */}
        <div
          style={{
            fontFamily: font.sans,
            fontSize: 11,
            color: T.textSecondary,
            lineHeight: 1.4,
            marginTop: 4,
          }}
        >
          {item.nextStep}
        </div>
        {item.linkedActionId && (
          <div style={{ fontFamily: font.mono, fontSize: 10, color: tone, marginTop: 6, opacity: 0.8 }}>
            ▸ {ACTION_LABELS[item.linkedActionId] ?? item.linkedActionId}
          </div>
        )}
      </div>
    );
  }

  // ── Full: original 5-block card ──
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${tone}28`,
        background: `${tone}0D`,
        padding: "11px 12px",
      }}
      role="article"
      aria-label={`${item.severity} priority: ${item.title}`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 10,
            color: tone,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {item.areaLabel}
        </div>
        <StatusDot label={item.status} color={tone} />
      </div>
      <div
        style={{
          fontFamily: font.sans,
          fontSize: 13,
          fontWeight: 600,
          color: T.textPrimary,
          lineHeight: 1.35,
          marginTop: 6,
        }}
      >
        {item.title}
      </div>
      <div
        style={{
          fontFamily: font.sans,
          fontSize: 11,
          color: T.textSecondary,
          lineHeight: 1.5,
          marginTop: 6,
          paddingTop: 6,
          borderTop: `1px solid ${GI.dividerBg}`,
        }}
      >
        {item.rationale}
      </div>
      <div
        style={{
          fontFamily: font.sans,
          fontSize: 11,
          color: T.textPrimary,
          lineHeight: 1.45,
          marginTop: 5,
        }}
      >
        {item.nextStep}
      </div>
      {item.linkedActionId ? (
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 10,
            color: tone,
            marginTop: 8,
            opacity: 0.8,
          }}
        >
          ▸ {ACTION_LABELS[item.linkedActionId] ?? item.linkedActionId}
        </div>
      ) : null}
      {canAcknowledge && item.severity !== "safe" ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button
            onClick={() => onAcknowledge(item.id)}
            disabled={item.acknowledged}
            aria-label={item.acknowledged ? `${item.title} — acknowledged` : `Acknowledge: ${item.title}`}
            style={{
              borderRadius: 8,
              border: `1px solid ${item.acknowledged ? GI.borderDim : `${tone}44`}`,
              background: item.acknowledged ? "transparent" : `${tone}14`,
              color: item.acknowledged ? T.textMuted : tone,
              padding: "5px 10px",
              fontFamily: font.sans,
              fontSize: 10,
              fontWeight: 700,
              cursor: item.acknowledged ? "default" : "pointer",
            }}
          >
            {item.acknowledged ? "Acknowledged" : "Acknowledge"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ─── StatusDot ───────────────────────────────────────────────────────────────

function StatusDot({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} aria-hidden="true" />
      <span
        style={{
          fontFamily: font.mono,
          fontSize: 9,
          color,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}
