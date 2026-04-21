import { BASELINE_NOTES, INCIDENT, SYSTEM_HEALTH, getZoneById, getZoneLabel } from "../../mockData";
import { GI, PANEL_TITLES, getDensity, type ShellState, T, font } from "../../tokens";
import { PanelCard } from "../shared/PanelCard";
import { Section } from "../shared/Section";
import { TinyMetric } from "../shared/TinyMetric";

interface IntelPanelProps {
  state: ShellState;
  onClearSelection: () => void;
}
interface DroneFleetPanelProps {
  state: ShellState;
  onSelectDrone: (droneId: string) => void;
}
interface ActivityLogPanelProps {
  state: ShellState;
  incidentElapsed: number;
}

// ─── Intel / Left Panel ─────────────────────────────────────────────────────

export function IntelPanel({ state, onClearSelection }: IntelPanelProps) {
  const density = getDensity(state.mode);
  const titles = PANEL_TITLES[state.mode];
  const isCritical = density === "critical";
  const isCondensed = density === "condensed";

  const selectedZone =
    state.selectedEntity?.type === "zone"
      ? getZoneById(state.selectedEntity.id)
      : state.selectedZoneId
        ? getZoneById(state.selectedZoneId)
        : null;
  const selectedDrone =
    state.selectedEntity?.type === "drone"
      ? state.drones.find((d) => d.id === state.selectedEntity?.id) ?? null
      : null;
  const selectedTeam =
    state.selectedEntity?.type === "team"
      ? state.groundTeams.find((t) => t.id === state.selectedEntity?.id) ?? null
      : null;
  const selectedAnomaly = state.selectedEntity?.type === "anomaly";

  // ── Header card content (density-aware) ──────────────────────────────────
  let headerTitle = "";
  let headerBody = "";
  let tone: string = T.teal;

  if (selectedZone) {
    headerTitle = selectedZone.label;
    headerBody = isCondensed || isCritical ? selectedZone.note : selectedZone.note;
    tone = selectedZone.boundaryColor;
  } else if (selectedDrone) {
    headerTitle = selectedDrone.name;
    headerBody = `${selectedDrone.capabilityLabel} · ${selectedDrone.role}`;
    tone = T.cyan;
  } else if (selectedTeam) {
    headerTitle = selectedTeam.name;
    headerBody = `${selectedTeam.unitType} · ${selectedTeam.assignment}`;
    tone = T.yellow;
  } else if (selectedAnomaly) {
    headerTitle = "Incident focus";
    headerBody = INCIDENT.fireBehavior;
    tone = state.mode === "verify" ? T.amber : T.fire;
  } else {
    // No entity selected — mode-dependent default
    if (isCritical) {
      // Rescue: show the key numbers directly
      const cleared = state.rescueProgress.cleared;
      const total = state.rescueProgress.total;
      headerTitle = `${total - cleared} structures remaining`;
      headerBody = `Route A ${state.rescueProgress.routeA.toLowerCase()} · Route B ${state.rescueProgress.routeB.toLowerCase()} · Fire dept ETA ${state.rescueProgress.fireDeptEta}`;
      tone = T.fire;
    } else if (isCondensed) {
      // Contain: directive, not descriptive
      headerTitle = state.selectedZoneId
        ? `${getZoneById(state.selectedZoneId)?.label ?? "Zone"} selected`
        : "Select a zone to begin staging";
      headerBody = state.selectedZoneId
        ? `${getZoneById(state.selectedZoneId)?.note ?? ""}`
        : "Tile actions unlock automatically when a zone is selected on the map.";
      tone = T.red;
    } else if (state.mode === "verify") {
      headerTitle = "Anomaly validation";
      headerBody = "Assessing AI-corroborated evidence before escalating into protection.";
      tone = T.amber;
    } else {
      // Scan / baseline
      headerTitle = "Calm spatial overview";
      headerBody =
        "Nothing is selected. Zone intelligence, verification detail, and protection context route here as the operator moves through the workflow.";
      tone = T.teal;
    }
  }

  return (
    <PanelCard
      title={titles.left}
      badgeLabel={state.mode.toUpperCase()}
      badgeColor={tone}
      actionLabel={state.selectedEntity ? "Clear" : undefined}
      onAction={state.selectedEntity ? onClearSelection : undefined}
    >
      {/* Header info block */}
      <SelectionBlock title={headerTitle} subtitle={headerBody} tone={tone} dense={isCondensed || isCritical} />

      {/* Zone detail — always show when zone selected */}
      {selectedZone ? (
        <Section label="Zone Detail">
          <MetricRow label="Risk posture" value={selectedZone.risk} multiline={!isCritical} />
          {!isCritical && <MetricRow label="Spread window" value={selectedZone.spreadWindow} multiline />}
          <MetricRow label="Terrain" value={selectedZone.terrain} multiline={!isCritical} />
          <MetricRow label="Structures" value={selectedZone.structures} multiline={!isCritical} />
        </Section>
      ) : null}

      {/* Drone detail — condense in action modes */}
      {selectedDrone ? (
        <Section label="Asset Detail">
          <MetricRow label="Class" value={selectedDrone.droneClass} />
          <MetricRow label="Mission" value={selectedDrone.assignedMission ?? "Standby"} />
          <MetricRow label="Status" value={selectedDrone.status} />
          <MetricRow label="Zone" value={getZoneLabel(selectedDrone.zoneId)} />
          <MetricRow label="Battery" value={`${selectedDrone.battery}%`} />
          <MetricRow label="Signal" value={`${selectedDrone.signal}%`} />
          {!isCritical && <MetricRow label="Route" value={selectedDrone.route ?? "Not assigned"} multiline />}
        </Section>
      ) : null}

      {/* Team detail — condense in action modes */}
      {selectedTeam ? (
        <Section label="Unit Detail">
          <MetricRow label="Availability" value={selectedTeam.availability} />
          <MetricRow label="Readiness" value={selectedTeam.readiness} />
          {!isCritical && <MetricRow label="Assignment" value={selectedTeam.assignment} multiline />}
          <MetricRow label="ETA" value={selectedTeam.eta} />
          {!isCritical && <MetricRow label="Vitals" value={selectedTeam.vitals} />}
          <MetricRow label="Zone" value={getZoneLabel(selectedTeam.linkedZoneId)} />
        </Section>
      ) : null}

      {/* Anomaly detail */}
      {selectedAnomaly ? (
        <Section label="Incident Detail">
          <MetricRow label="Location" value={INCIDENT.location} />
          <MetricRow label="Confidence" value={`${INCIDENT.aiConfidence}%`} />
          <MetricRow label="Footprint" value={INCIDENT.estimatedFootprint} />
          <MetricRow label="Wind" value={INCIDENT.windVector} />
          {!isCritical && <MetricRow label="Behavior" value={INCIDENT.fireBehavior} multiline />}
        </Section>
      ) : null}

      {/* No entity selected context block */}
      {!state.selectedEntity ? (
        <>
          {/* Scan bullet notes */}
          {state.mode === "scan" ? (
            <Section label="System Posture">
              {BASELINE_NOTES.map((note) => <BulletRow key={note} text={note} />)}
            </Section>
          ) : null}

          {/* Contain: key status metrics compactly */}
          {state.mode === "contain" ? (
            <Section label="Staging Status">
              <MetricRow label="Primary zone" value={getZoneLabel(state.selectedZoneId)} />
              <MetricRow label="Authorities" value={state.authoritiesNotified ? "Notified ✓" : "Pending"} />
              <MetricRow label="Teams" value={state.teamsNotified ? "Notified ✓" : "Pending"} />
              <MetricRow
                label="Routes"
                value={state.residentialRouteActive ? "Prepared ✓" : "Pending activation"}
              />
            </Section>
          ) : null}

          {/* Rescue: key live numbers only */}
          {state.mode === "rescue" ? (
            <Section label="Live Metrics">
              <MetricRow label="Cleared" value={`${state.rescueProgress.cleared} / ${state.rescueProgress.total}`} />
              <MetricRow label="Route A" value={state.rescueProgress.routeA} />
              <MetricRow label="Route B" value={state.rescueProgress.routeB} />
              <MetricRow label="Fire dept ETA" value={state.rescueProgress.fireDeptEta} />
            </Section>
          ) : null}

          {/* System health strip — scan only */}
          {state.mode === "scan" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                marginTop: 8,
                paddingTop: 8,
                borderTop: `1px solid ${GI.dividerBg}`,
              }}
            >
              {SYSTEM_HEALTH.map((item) => (
                <div key={item.label} style={{ padding: "6px 8px", borderRadius: 8, background: GI.surface }}>
                  <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {item.label}
                  </div>
                  <div style={{ fontFamily: font.mono, fontSize: 10, color: T.textPrimary, marginTop: 3 }}>
                    {item.value}
                  </div>
                  <div style={{ fontFamily: font.sans, fontSize: 9, color: T.textMuted, marginTop: 1 }}>
                    {item.sub}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </PanelCard>
  );
}

// ─── Drone Fleet Panel ───────────────────────────────────────────────────────

export function DroneFleetPanel({ state, onSelectDrone }: DroneFleetPanelProps) {
  const density = getDensity(state.mode);
  const isCritical = density === "critical";
  const isCondensed = density === "condensed";
  const titles = PANEL_TITLES[state.mode];

  return (
    <PanelCard title={titles.fleet} badgeLabel={`${state.drones.length} AIRBORNE`} badgeColor={T.cyan}>
      <Section label="Assignments">
        {state.drones.map((drone) => {
          const active = state.selectedEntity?.type === "drone" && state.selectedEntity.id === drone.id;
          const color =
            drone.status === "signal-degraded"
              ? T.amber
              : drone.status === "available"
                ? T.teal
                : drone.status === "holding"
                  ? T.textSecondary
                  : T.cyan;

          // ── Critical mode: one-line strip ──
          if (isCritical) {
            return (
              <button
                key={drone.id}
                onClick={() => onSelectDrone(drone.id)}
                aria-label={`${drone.name} — ${drone.status}`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 10,
                  border: `1px solid ${active ? `${color}55` : "rgba(255,255,255,0.06)"}`,
                  background: active ? `${color}10` : "transparent",
                  padding: "7px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.textPrimary }}>{drone.name}</span>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: T.textMuted }}>
                      <rect x="2" y="7" width="16" height="10" rx="2" />
                      <line x1="22" y1="11" x2="22" y2="13" />
                    </svg>
                    <span style={{ fontFamily: font.mono, fontSize: 10, color: T.textMuted }}>{drone.battery}%</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: T.textMuted }}>
                      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                      <line x1="12" y1="20" x2="12.01" y2="20" />
                    </svg>
                    <span style={{ fontFamily: font.mono, fontSize: 10, color: T.textMuted }}>{drone.signal}%</span>
                  </div>
                </div>
                <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontFamily: font.mono, fontSize: 9, color, letterSpacing: "0.06em", textTransform: "uppercase" }}>{drone.status}</span>
                </span>
              </button>
            );
          }

          // ── Condensed: name + mission + dot, no metrics ──
          if (isCondensed) {
            return (
              <button
                key={drone.id}
                onClick={() => onSelectDrone(drone.id)}
                aria-label={`${drone.name} — ${drone.status}, ${drone.capabilityLabel}`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 12,
                  border: `1px solid ${active ? `${color}55` : "rgba(255,255,255,0.07)"}`,
                  background: active ? `${color}10` : "rgba(255,255,255,0.025)",
                  padding: "8px 11px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.textPrimary }}>{drone.name}</div>
                  <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted, marginTop: 2 }}>
                    {drone.assignedMission ?? "Standby"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontFamily: font.mono, fontSize: 9, color, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {drone.status}
                  </span>
                </div>
              </button>
            );
          }

          // ── Full: original detailed card ──
          return (
            <button
              key={drone.id}
              onClick={() => onSelectDrone(drone.id)}
              aria-label={`${drone.name} — ${drone.status}, ${drone.capabilityLabel}`}
              style={{
                width: "100%",
                textAlign: "left",
                borderRadius: 14,
                border: `1px solid ${active ? `${color}66` : "rgba(255,255,255,0.08)"}`,
                background: active ? `${color}14` : "rgba(255,255,255,0.03)",
                padding: "10px 12px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.textPrimary }}>{drone.name}</div>
                  <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted, marginTop: 3 }}>
                    {drone.capabilityLabel} · {drone.assignedMission ?? "Standby"} · {getZoneLabel(drone.zoneId)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontFamily: font.mono, fontSize: 9, color, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {drone.status}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <TinyMetric label="Battery" value={`${drone.battery}%`} />
                <TinyMetric label="Signal" value={`${drone.signal}%`} />
                <TinyMetric label="ETA" value={drone.eta ?? "Live"} />
              </div>
            </button>
          );
        })}
      </Section>
    </PanelCard>
  );
}

// ─── Activity Log Panel ──────────────────────────────────────────────────────

export function ActivityLogPanel({ state, incidentElapsed }: ActivityLogPanelProps) {
  const density = getDensity(state.mode);
  const isCritical = density === "critical";
  const isCondensed = density === "condensed";
  const titles = PANEL_TITLES[state.mode];

  // Restrict entries based on density
  const maxEntries = isCritical ? 1 : isCondensed ? 2 : 6;
  const visibleEntries = state.activityLog.slice(0, maxEntries);
  const hiddenCount = state.activityLog.length - visibleEntries.length;

  const mm = Math.floor(incidentElapsed / 60);
  const ss = incidentElapsed % 60;
  const stopwatch = incidentElapsed > 0 ? `T+ ${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : "PASSIVE WATCH";

  return (
    <PanelCard
      title={titles.log}
      badgeLabel={isCritical ? `LIVE AUDIT · ${stopwatch}` : stopwatch}
      badgeColor={isCritical ? T.amber : T.textSecondary}
    >
      <div role="log" aria-label="Activity timeline" aria-live="polite">
        <Section label="Timeline">
          {visibleEntries.map((entry) => {
            const color =
              entry.severity === "danger"
                ? T.red
                : entry.severity === "caution"
                  ? T.amber
                  : entry.severity === "safe"
                    ? T.teal
                    : T.cyan;

            // ── Critical: compact one-liner ──
            if (isCritical) {
              const actorColor = entry.actor === "TALON" || entry.actor === "AI" ? T.cyan : entry.actor === "Operator" ? T.amber : T.textMuted;
              return (
                <div
                  key={entry.id}
                  style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: `1px solid ${GI.borderDim}` }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 4 }} aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontFamily: font.mono, fontSize: 9, color: actorColor, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {entry.actor}
                    </span>
                    <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textPrimary, lineHeight: 1.4, display: "block", marginTop: 2 }}>
                      {entry.text}
                    </span>
                  </div>
                  <span style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, flexShrink: 0 }}>{entry.ts}</span>
                </div>
              );
            }

            // ── Full / condensed: original layout ──
            const actorColor = entry.actor === "TALON" || entry.actor === "AI" ? T.cyan : entry.actor === "Operator" ? T.amber : T.textMuted;
            return (
              <div
                key={entry.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr",
                  gap: 12,
                  padding: "8px 0",
                  borderBottom: `1px solid ${GI.borderDim}`,
                }}
              >
                <div style={{ fontFamily: font.mono, fontSize: 10, color: T.textMuted }}>{entry.ts}</div>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} aria-hidden="true" />
                    <span style={{ fontFamily: font.sans, fontSize: 10, color: actorColor }}>
                      {entry.actor} · {entry.type}
                    </span>
                  </div>
                  <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textPrimary, lineHeight: 1.45, marginTop: 5 }}>
                    {entry.text}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Hidden entry count badge */}
          {hiddenCount > 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "8px 0 4px",
                fontFamily: font.mono,
                fontSize: 9,
                color: T.textMuted,
                letterSpacing: "0.06em",
              }}
            >
              +{hiddenCount} earlier entries
            </div>
          )}
        </Section>
      </div>
    </PanelCard>
  );
}

/* ─── Shared subcomponents ──────────────────────────────────────────────────── */

function SelectionBlock({ title, subtitle, tone, dense }: { title: string; subtitle: string; tone: string; dense?: boolean }) {
  return (
    <div
      style={{
        borderRadius: dense ? 12 : 16,
        border: `1px solid ${tone}33`,
        background: `${tone}0D`,
        padding: dense ? "9px 12px" : "12px 14px",
      }}
    >
      <div style={{ fontFamily: font.sans, fontSize: dense ? 12 : 13, fontWeight: 600, color: T.textPrimary }}>{title}</div>
      {subtitle && (
        <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary, lineHeight: 1.45, marginTop: dense ? 4 : 6 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  if (multiline) {
    return (
      <div>
        <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted }}>{label}</div>
        <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textPrimary, lineHeight: 1.45, marginTop: 3 }}>{value}</div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted }}>{label}</span>
      <span style={{ fontFamily: font.mono, fontSize: 11, color: T.textPrimary, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function BulletRow({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.textMuted, marginTop: 5, flexShrink: 0 }} aria-hidden="true" />
      <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary, lineHeight: 1.4 }}>{text}</span>
    </div>
  );
}
