import {
  BASELINE_NOTES,
  INCIDENT,
  SYSTEM_HEALTH,
  WEATHER,
  getZoneById,
  getZoneLabel,
} from "../../mockData";
import { getAgentTasks, getEvidenceSources, getSignalHistory } from "../../domain/talon";
import type { ActivityLogEntry, DroneRosterEntry, GroundTeamStatus, SelectedEntity, ShellState, SurfaceMode } from "../../tokens";
import {
  T,
  border,
  font,
  motion,
  radius,
  space,
  surface,
  tint,
  typeScale,
  typeWeight,
  tracking,
} from "../../tokens";
import { useState } from "react";
import { PanelCard } from "../shared/PanelCard";
import { PanelStateBlock } from "../shared/RailPanelFrame";
import { RailFilterBar } from "../shared/RailFilterBar";
import { Section } from "../shared/Section";
import { StatusPill } from "../shared/StatusPill";
import {
  AgentRelayStrip,
  CapabilityMatrix,
  MetricGrid,
  MiniTrend,
  PanelHeroMetric,
  SignalBar,
  SourceFreshnessMatrix,
  toneColor,
  type SignalTone,
} from "../shared/PanelViz";

interface IntelPanelProps {
  state: ShellState;
  onClearSelection: () => void;
}

interface DroneFleetPanelProps {
  state: ShellState;
  onSelectDrone: (droneId: string) => void;
  spatialHover?: SelectedEntity;
  onSpatialHoverChange?: (target: SelectedEntity) => void;
  canToggleSurface?: boolean;
  onSurfaceModeChange?: (mode: SurfaceMode) => void;
}

interface ActivityLogPanelProps {
  state: ShellState;
  incidentElapsed: number;
}

type SelectedZone = NonNullable<ReturnType<typeof getZoneById>>;

export function IntelPanel({ state, onClearSelection }: IntelPanelProps) {
  const selectedZone =
    state.selectedEntity?.type === "zone"
      ? getZoneById(state.selectedEntity.id)
      : state.selectedZoneId
        ? getZoneById(state.selectedZoneId)
        : null;
  const selectedDrone =
    state.selectedEntity?.type === "drone"
      ? state.drones.find((drone) => drone.id === state.selectedEntity?.id) ?? null
      : null;
  const selectedTeam =
    state.selectedEntity?.type === "team"
      ? state.groundTeams.find((team) => team.id === state.selectedEntity?.id) ?? null
      : null;
  const selectedAnomaly = state.selectedEntity?.type === "anomaly";
  const hasSelection = Boolean(state.selectedEntity);
  const sources = getEvidenceSources(state.scene);
  const activeSources = sources.filter((source) => source.status === "active");
  const avgConfidence = activeSources.length
    ? Math.round(activeSources.reduce((sum, source) => sum + source.confidence, 0) / activeSources.length)
    : 0;
  const agents = getAgentTasks(state.scene);
  const observationAgents = agents.filter((agent) =>
    ["sensor-fusion", "satellite-intelligence", "drone-perception", "fire-behavior"].includes(agent.id),
  );
  const badge = hasSelection
    ? state.selectedEntity?.type === "anomaly"
      ? "Anomaly"
      : state.selectedEntity
        ? state.selectedEntity.type
        : "Selected"
    : state.workflowPhase === "operations"
      ? "Operations"
      : "Observation";

  return (
    <PanelCard
      title="Context Inspector"
      badgeLabel={badge}
      badgeColor={selectedZone?.boundaryColor ?? (selectedDrone ? T.cyan : selectedTeam ? T.cyan : selectedAnomaly ? T.fire : T.teal)}
      actionLabel={hasSelection ? "Clear" : undefined}
      onAction={hasSelection ? onClearSelection : undefined}
    >
      {selectedZone ? (
        <ZoneInspector state={state} zone={selectedZone} sources={sources} agents={observationAgents} />
      ) : selectedDrone ? (
        <DroneInspector drone={selectedDrone} agents={agents.filter((agent) => agent.id === "drone-perception" || agent.id === "drone-control")} />
      ) : selectedTeam ? (
        <TeamInspector team={selectedTeam} agents={agents.filter((agent) => agent.id === "resource-readiness" || agent.id === "governance")} />
      ) : selectedAnomaly ? (
        <AnomalyInspector sources={sources} agents={observationAgents} />
      ) : (
        <DefaultObservation state={state} avgConfidence={avgConfidence} sources={sources} agents={observationAgents} />
      )}

      <WeatherStrip />
    </PanelCard>
  );
}

function DefaultObservation({
  state,
  avgConfidence,
  sources,
  agents,
}: {
  state: ShellState;
  avgConfidence: number;
  sources: ReturnType<typeof getEvidenceSources>;
  agents: ReturnType<typeof getAgentTasks>;
}) {
  const isOperations = state.workflowPhase === "operations";
  const activeCount = sources.filter((source) => source.status === "active").length;
  const degradedCount = sources.filter((source) => source.status === "stale" || source.status === "failed" || source.status === "missing").length;
  const signalHistory = getSignalHistory(state.scene);

  return (
    <>
      <PanelHeroMetric
        eyebrow={isOperations ? "Spatial operations" : state.scene === "baseline" ? "Quiet watch" : "Evidence observation"}
        title={isOperations ? "Field picture stabilized" : state.scene === "baseline" ? "Surveillance baseline stable" : "Evidence sources converging"}
        subtitle={isOperations ? "Map, asset, and field telemetry remain the primary observable surfaces." : "Thermal, wind, burn-memory, and route telemetry remain inside nominal patrol thresholds."}
        metric={isOperations ? `${INCIDENT.structuresAtRisk}` : `${avgConfidence}%`}
        metricLabel={isOperations ? "exposed" : "source avg"}
        signalTone={isOperations ? "caution" : avgConfidence > 70 ? "safe" : "info"}
      >
        <MetricGrid
          items={
            isOperations
              ? [
                  { label: "Route A", value: state.rescueProgress.routeA, signalTone: "safe" },
                  { label: "Route B", value: state.rescueProgress.routeB, signalTone: "caution" },
                  { label: "Cleared", value: `${state.rescueProgress.cleared}/${state.rescueProgress.total}`, signalTone: "info" },
                  { label: "FD ETA", value: state.rescueProgress.fireDeptEta, signalTone: "caution" },
                ]
              : [
                  { label: "Active sources", value: `${activeCount}`, signalTone: activeCount > 2 ? "safe" : "info" },
                  { label: "Degraded", value: `${degradedCount}`, signalTone: degradedCount ? "caution" : "safe" },
                  { label: "Wind", value: INCIDENT.windVector.split(" · ")[0], signalTone: "neutral" },
                  { label: "Grid", value: "Grid 4C", signalTone: "info" },
                ]
          }
        />
      </PanelHeroMetric>

      <Section label="Source Freshness">
        <SourceFreshnessMatrix sources={sources} limit={isOperations ? 4 : 5} />
      </Section>

      <Section label="Observable Trend">
        <MiniTrend
          label={isOperations ? "Structures cleared trend" : "Thermal delta trend"}
          unit={isOperations ? "%" : ""}
          values={isOperations ? signalHistory.structures : signalHistory.thermal}
          signalTone={isOperations ? "safe" : state.scene === "baseline" ? "safe" : "caution"}
        />
      </Section>

      <Section label="Agent Relay">
        <AgentRelayStrip agents={agents} limit={2} />
      </Section>

      {state.scene === "baseline" ? (
        <Section label="System Baseline">
          <CapabilityMatrix
            items={SYSTEM_HEALTH.map((item) => ({
              label: item.label,
              state: item.value,
              detail: item.sub,
              signalTone: item.sub === "online" || item.sub === "clear" ? "safe" : "info",
            }))}
          />
          <CompactNotes notes={BASELINE_NOTES.slice(0, 2)} />
        </Section>
      ) : null}
    </>
  );
}

function ZoneInspector({
  state,
  zone,
  sources,
  agents,
}: {
  state: ShellState;
  zone: SelectedZone;
  sources: ReturnType<typeof getEvidenceSources>;
  agents: ReturnType<typeof getAgentTasks>;
}) {
  const level = getZoneThreatLevel(zone);
  const highlighted = state.highlightedZoneIds.includes(zone.id);

  return (
    <>
      <PanelHeroMetric
        eyebrow="Selected zone"
        title={zone.label}
        subtitle={zone.note}
        metric={`${level.value}%`}
        metricLabel="threat"
        signalTone={level.tone}
      >
        <SignalBar label={level.label} value={level.value} signalTone={level.tone} animated={highlighted} />
      </PanelHeroMetric>

      <Section label="Zone Signature">
        <MetricGrid
          items={[
            { label: "Risk", value: zone.riskShort, detail: zone.category, signalTone: level.tone },
            { label: "Spread", value: zone.spreadShort, signalTone: "caution" },
            { label: "Terrain", value: zone.terrainShort, signalTone: "neutral" },
            { label: "Structures", value: zone.structuresShort, signalTone: zone.category === "residential" ? "danger" : "neutral" },
          ]}
        />
        <div
          style={{
            marginTop: space.sm,
            padding: `${space.sm}px ${space.md}px`,
            borderRadius: radius.tile,
            background: surface.inset,
            border: `1px solid ${border.soft}`,
            fontFamily: font.sans,
            fontSize: typeScale.caption,
            lineHeight: 1.5,
            color: T.textSecondary,
          }}
        >
          {zone.risk}
        </div>
        {zone.category === "residential" ? (
          <StructureExposureStrip />
        ) : null}
      </Section>

      <Section label="Evidence At This View">
        <SourceFreshnessMatrix sources={sources} limit={4} />
      </Section>

      <Section label="Agent Relay">
        <AgentRelayStrip agents={agents} limit={1} />
      </Section>
    </>
  );
}

function WeatherStrip() {
  return (
    <div
      aria-label="Weather observations"
      style={{
        marginTop: space.md,
        padding: `${space.sm}px ${space.md}px`,
        borderRadius: radius.tile,
        border: `1px solid ${border.soft}`,
        background: surface.inset,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: space.xs }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.caption, letterSpacing: tracking.telemetry, textTransform: "uppercase", color: T.textMuted }}>
          Weather · RAWS
        </span>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.caption, color: T.textMuted }}>{WEATHER.observedAt}</span>
      </div>
      <MetricGrid
        items={[
          { label: "Wind", value: `${WEATHER.windBearing}° · ${WEATHER.windSpeedKts} kts G${WEATHER.windGustKts}`, signalTone: WEATHER.windGustKts > 20 ? "caution" : "info" },
          { label: "Temp / RH", value: `${WEATHER.tempF}°F · ${WEATHER.rh}%`, signalTone: WEATHER.rh < 25 ? "caution" : "safe" },
          { label: "Fuel model", value: WEATHER.fuelModel, signalTone: "neutral" },
          { label: "Haines", value: `${WEATHER.haines}`, signalTone: WEATHER.haines >= 5 ? "caution" : "safe" },
        ]}
      />
    </div>
  );
}

function DroneInspector({ drone, agents }: { drone: DroneRosterEntry; agents: ReturnType<typeof getAgentTasks> }) {
  const batteryTone = drone.battery < 20 ? "danger" : drone.battery < 55 ? "caution" : "safe";
  const signalTone = drone.signal < 60 || drone.status === "signal-degraded" ? "caution" : "safe";
  const batteryLow = drone.battery < 20;

  return (
    <>
      <PanelHeroMetric
        eyebrow="Selected asset"
        title={drone.name}
        subtitle={`${drone.capabilityLabel} · ${drone.role}`}
        metric={`${drone.battery}%`}
        metricLabel="battery"
        signalTone={batteryTone}
      >
        {batteryLow && (
          <div style={{
            fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: T.red,
            display: "flex", alignItems: "center", gap: space.xs,
          }}>
            Battery critical: recall imminent
          </div>
        )}
        <SignalBar label="Battery reserve" value={drone.battery} signalTone={batteryTone} animated={batteryLow} />
        <SignalBar label="Signal integrity" value={drone.signal} signalTone={signalTone} animated={drone.status === "signal-degraded"} />
      </PanelHeroMetric>

      <Section label="Asset State">
        <MetricGrid
          items={[
            { label: "Mission", value: labelMission(drone.assignedMission), signalTone: drone.assignedMission ? "info" : "neutral" },
            { label: "Status", value: drone.status, signalTone: drone.status === "signal-degraded" ? "caution" : "safe" },
            { label: "Zone", value: getZoneLabel(drone.zoneId), signalTone: "neutral" },
            { label: "ETA", value: drone.eta ?? "Live", signalTone: "info" },
          ]}
        />
      </Section>

      <Section label="Telemetry">
        <MetricGrid
          items={[
            { label: "Ground speed", value: `${drone.groundSpeedMps.toFixed(1)} m/s`, signalTone: "info" },
            { label: "Altitude", value: `${drone.altitudeM} m AGL`, signalTone: "neutral" },
            { label: "Heading", value: `${drone.headingDeg}°`, signalTone: "neutral" },
            { label: "Position", value: `${drone.lat.toFixed(4)}, ${drone.lon.toFixed(4)}`, signalTone: "neutral" },
          ]}
        />
      </Section>

      <Section label="Agent Relay">
        <AgentRelayStrip agents={agents} limit={2} />
      </Section>
    </>
  );
}

function TeamInspector({ team, agents }: { team: GroundTeamStatus; agents: ReturnType<typeof getAgentTasks> }) {
  const vitals = parseVitals(team.vitals);
  const hrTone = vitals.hr > 150 ? "danger" : vitals.hr > 125 ? "caution" : "safe";
  const visibilityTone = vitals.visibility < 25 ? "danger" : vitals.visibility < 80 ? "caution" : "safe";

  return (
    <>
      <PanelHeroMetric
        eyebrow="Selected field unit"
        title={team.name}
        subtitle={`${team.unitType} · ${team.assignment}`}
        metric={team.eta}
        metricLabel="ETA"
        signalTone={team.availability === "deployed" ? "danger" : team.availability === "staged" ? "caution" : "safe"}
      >
        <SignalBar label="Readiness" value={readinessValue(team.readiness)} signalTone="safe" />
        <SignalBar label="Visibility" value={Math.min(100, Math.round((vitals.visibility / 250) * 100))} valueLabel={`${vitals.visibility}m`} signalTone={visibilityTone} />
      </PanelHeroMetric>

      <Section label="Unit Telemetry">
        <MetricGrid
          items={[
            { label: "Availability", value: team.availability, signalTone: team.availability === "deployed" ? "danger" : "safe" },
            { label: "Readiness", value: team.readiness, signalTone: "safe" },
            { label: "Heart rate", value: `${vitals.hr} bpm`, signalTone: hrTone },
            { label: "Zone", value: getZoneLabel(team.linkedZoneId), signalTone: "neutral" },
          ]}
        />
      </Section>

      <Section label="Agent Relay">
        <AgentRelayStrip agents={agents} limit={2} />
      </Section>
    </>
  );
}

function AnomalyInspector({
  sources,
  agents,
}: {
  sources: ReturnType<typeof getEvidenceSources>;
  agents: ReturnType<typeof getAgentTasks>;
}) {
  return (
    <>
      <PanelHeroMetric
        eyebrow="Incident focus"
        title="Grid 4C"
        subtitle={INCIDENT.location}
        metric={`${INCIDENT.aiConfidence}%`}
        metricLabel="model conf."
        signalTone="caution"
      >
        <SignalBar label="Thermal anomaly" value={INCIDENT.aiConfidence} signalTone="caution" animated />
      </PanelHeroMetric>

      <Section label="Observed Fire Signature">
        <MetricGrid
          items={[
            { label: "Footprint", value: INCIDENT.estimatedFootprint, signalTone: "danger" },
            { label: "Wind", value: INCIDENT.windVector.split(" · ")[0], signalTone: "caution" },
            { label: "Structures", value: `${INCIDENT.structuresAtRisk}`, detail: "at risk", signalTone: "danger" },
            { label: "Detected", value: INCIDENT.detectedAt.replace(" UTC", ""), signalTone: "neutral" },
          ]}
        />
      </Section>

      <Section label="Source Freshness">
        <SourceFreshnessMatrix sources={sources} />
      </Section>

      <Section label="Agent Relay">
        <AgentRelayStrip agents={agents} />
      </Section>
    </>
  );
}

export function DroneFleetPanel({
  state,
  onSelectDrone,
  spatialHover,
  onSpatialHoverChange,
  canToggleSurface,
  onSurfaceModeChange,
}: DroneFleetPanelProps) {
  const showSurfaceToggle = canToggleSurface && onSurfaceModeChange;
  const [assetQuery, setAssetQuery] = useState("");
  const [assetFilter, setAssetFilter] = useState("all");
  const filteredDrones = state.drones.filter((drone) => {
    const search = `${drone.name} ${drone.role} ${drone.status} ${drone.zoneId ?? ""}`.toLowerCase();
    const matchesQuery = search.includes(assetQuery.trim().toLowerCase());
    const matchesFilter =
      assetFilter === "all" ||
      (assetFilter === "active" && (drone.status === "assigned" || drone.status === "en-route")) ||
      (assetFilter === "degraded" && (drone.status === "signal-degraded" || drone.signal < 60 || drone.battery < 25)) ||
      (assetFilter === "reserve" && drone.status === "available");
    return matchesQuery && matchesFilter;
  });
  const clusters = getDroneMissionClusters(filteredDrones);
  const avgBattery = state.drones.length
    ? Math.round(state.drones.reduce((sum, drone) => sum + drone.battery, 0) / state.drones.length)
    : 0;
  const assigned = state.drones.filter((drone) => drone.status === "assigned" || drone.status === "en-route").length;
  const degraded = state.drones.filter((drone) => drone.signal < 60 || drone.battery < 25 || drone.status === "signal-degraded").length;
  const agents = getAgentTasks(state.scene).filter((agent) => agent.category === "operations" || agent.id === "drone-perception");

  return (
    <PanelCard
      title="Asset State"
      badgeLabel={`${state.drones.length} assets`}
      badgeColor={degraded ? T.amber : T.cyan}
      headerAccessory={showSurfaceToggle ? <CompactSurfaceToggle surfaceMode={state.surfaceMode} onSurfaceModeChange={onSurfaceModeChange} /> : undefined}
    >
      <PanelHeroMetric
        eyebrow="Fleet posture"
        title={degraded ? "Abnormal assets pinned" : state.workflowPhase === "operations" ? "Mission tasking active" : "Fleet ready for observation"}
        subtitle="Assets are grouped by mission state so normal inventory stays compressed."
        metric={`${assigned}`}
        metricLabel="active"
        signalTone={degraded ? "caution" : "safe"}
      >
        <MetricGrid
          items={[
            { label: "Avg battery", value: `${avgBattery}%`, signalTone: avgBattery < 45 ? "caution" : "safe" },
            { label: "Degraded", value: `${degraded}`, signalTone: degraded ? "caution" : "safe" },
            { label: "Assigned", value: `${assigned}`, signalTone: assigned ? "info" : "neutral" },
            { label: "Surface", value: state.surfaceMode === "drone-grid" ? "Drone grid" : "Map", signalTone: "neutral" },
          ]}
        />
      </PanelHeroMetric>

      <Section label="Mission Clusters">
        <RailFilterBar
          ariaLabel="Fleet"
          query={assetQuery}
          onQueryChange={setAssetQuery}
          queryPlaceholder="Search assets"
          value={assetFilter}
          onValueChange={setAssetFilter}
          options={[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "degraded", label: "Watch" },
            { id: "reserve", label: "Reserve" },
          ]}
        />
        {clusters.length ? (
          clusters.map((cluster) => (
            <MissionCluster
              key={cluster.id}
              cluster={cluster}
              selectedId={state.selectedEntity?.type === "drone" ? state.selectedEntity.id : null}
              spatialHover={spatialHover}
              onSelectDrone={onSelectDrone}
              onSpatialHoverChange={onSpatialHoverChange}
            />
          ))
        ) : (
          <PanelStateBlock
            state="empty"
            title={state.drones.length ? "No assets match this view" : "No fleet assets available"}
            body={state.drones.length ? "Clear the search or choose a broader filter to restore the fleet view." : "The selected incident has no simulated assets assigned."}
          />
        )}
      </Section>

      <Section label="Agent Relay">
        <AgentRelayStrip agents={agents} />
      </Section>
    </PanelCard>
  );
}

export function ActivityLogPanel({ state, incidentElapsed }: ActivityLogPanelProps) {
  const [logQuery, setLogQuery] = useState("");
  const [logFilter, setLogFilter] = useState("all");
  const filteredEntries = state.activityLog.filter((entry) => {
    const matchesQuery = `${entry.actor} ${entry.type} ${entry.text}`.toLowerCase().includes(logQuery.trim().toLowerCase());
    const matchesFilter =
      logFilter === "all" ||
      (logFilter === "operator" && entry.actor === "Operator") ||
      (logFilter === "talon" && (entry.actor === "TALON" || entry.actor === "AI")) ||
      (logFilter === "attention" && (entry.severity === "caution" || entry.severity === "danger"));
    return matchesQuery && matchesFilter;
  });
  const visibleEntries = filteredEntries.slice(0, 7);
  const hiddenCount = Math.max(0, filteredEntries.length - visibleEntries.length);
  const stopwatch = incidentElapsed > 0 ? formatStopwatch(incidentElapsed) : "Passive watch";
  const operatorCount = state.activityLog.filter((entry) => entry.actor === "Operator").length;
  const talonCount = state.activityLog.filter((entry) => entry.actor === "TALON" || entry.actor === "AI").length;
  const exceptionCount = state.activityLog.filter((entry) => entry.type.toLowerCase().includes("exception")).length;

  return (
    <PanelCard title="Decision Ledger" badgeLabel={stopwatch} badgeColor={state.workflowPhase === "operations" ? T.amber : T.textSecondary}>
      <PanelHeroMetric
        eyebrow="Recorded actions"
        title={visibleEntries[0]?.text ?? "No actions recorded"}
        subtitle="Timeline records operator actions, TALON preparations, system events, and audit-relevant state changes."
        metric={`${state.activityLog.length}`}
        metricLabel="entries"
        signalTone={state.scene === "baseline" ? "safe" : "info"}
      >
        <MetricGrid
          items={[
            { label: "Operator", value: `${operatorCount}`, signalTone: operatorCount ? "caution" : "neutral" },
            { label: "TALON", value: `${talonCount}`, signalTone: "info" },
            { label: "Exceptions", value: `${exceptionCount}`, signalTone: exceptionCount ? "caution" : "safe" },
            { label: "Audit", value: state.authoritiesNotified ? "Receipt" : "Draft", signalTone: state.authoritiesNotified ? "safe" : "neutral" },
          ]}
        />
      </PanelHeroMetric>

      <Section label="Latest Events">
        <RailFilterBar
          ariaLabel="Decision ledger"
          query={logQuery}
          onQueryChange={setLogQuery}
          queryPlaceholder="Search ledger"
          value={logFilter}
          onValueChange={setLogFilter}
          options={[
            { id: "all", label: "All" },
            { id: "operator", label: "Operator" },
            { id: "talon", label: "TALON" },
            { id: "attention", label: "Attention" },
          ]}
        />
        <div role="log" aria-label="Decision ledger" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
          {visibleEntries.length === 0 ? (
            <PanelStateBlock
              state="empty"
              title={state.activityLog.length ? "No entries match this view" : "No entries yet"}
              body={state.activityLog.length ? "Clear the search or choose a broader filter to restore ledger entries." : "Timeline will populate as operations develop."}
            />
          ) : (
            visibleEntries.map((entry) => (
              <LedgerEntry key={entry.id} entry={entry} />
            ))
          )}
          {hiddenCount > 0 ? (
            <div
              style={{
                fontFamily: font.mono,
                fontSize: typeScale.eyebrow,
                color: T.textMuted,
                letterSpacing: tracking.telemetry,
                textTransform: "uppercase",
                textAlign: "center",
                padding: space.sm,
                borderTop: `1px solid ${border.soft}`,
              }}
            >
              +{hiddenCount} archived entries
            </div>
          ) : null}
        </div>
      </Section>
    </PanelCard>
  );
}

function CompactSurfaceToggle({
  surfaceMode,
  onSurfaceModeChange,
}: {
  surfaceMode: SurfaceMode;
  onSurfaceModeChange: (mode: SurfaceMode) => void;
}) {
  const options: Array<{ id: SurfaceMode; label: string }> = [
    { id: "map", label: "Map" },
    { id: "drone-grid", label: "Grid" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: space.xs,
        padding: space.xs,
        borderRadius: radius.control,
        background: surface.control,
        border: `1px solid ${border.default}`,
      }}
      role="group"
      aria-label="Center view mode"
    >
      {options.map((option) => {
        const active = surfaceMode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSurfaceModeChange(option.id)}
            aria-pressed={active}
            style={{
              border: "none",
              borderRadius: radius.control,
              background: active ? tint(T.cyan, 0.16) : "transparent",
              color: active ? T.cyan : T.textMuted,
              padding: `${space.xs}px ${space.sm}px`,
              fontFamily: font.sans,
              fontSize: typeScale.label,
              fontWeight: typeWeight.bold,
              cursor: "pointer",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function StructureExposureStrip() {
  const tracked = 94;
  const exposed = INCIDENT.structuresAtRisk;
  const pct = Math.round((exposed / tracked) * 100);

  return (
    <div
      style={{
        padding: `${space.md}px ${space.md}px`,
        borderRadius: radius.panel,
        border: `1px solid ${tint(T.red, 0.24)}`,
        background: tint(T.red, 0.07),
        display: "flex",
        flexDirection: "column",
        gap: space.sm,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: space.sm }}>
        <div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: T.red }}>
            Structures at risk
          </div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, marginTop: space.xs }}>
            30-minute projected exposure
          </div>
        </div>
        <div style={{ fontFamily: font.mono, fontSize: typeScale.heading, color: T.red, fontWeight: typeWeight.heavy }}>
          {exposed}<span style={{ color: T.textMuted, fontSize: typeScale.label, fontWeight: typeWeight.regular }}> / {tracked}</span>
        </div>
      </div>
      <SignalBar label="Exposure load" value={pct} signalTone="danger" valueLabel={`${pct}%`} />
    </div>
  );
}

function MissionCluster({
  cluster,
  selectedId,
  spatialHover,
  onSelectDrone,
  onSpatialHoverChange,
}: {
  cluster: DroneCluster;
  selectedId: string | null;
  spatialHover?: SelectedEntity;
  onSelectDrone: (droneId: string) => void;
  onSpatialHoverChange?: (target: SelectedEntity) => void;
}) {
  if (cluster.drones.length === 0) return null;
  const visible = cluster.drones.slice(0, 3);
  const hidden = Math.max(0, cluster.drones.length - visible.length);

  return (
    <div
      style={{
        borderTop: `1px solid ${tint(toneColor(cluster.signalTone), 0.16)}`,
        paddingTop: space.md,
        display: "flex",
        flexDirection: "column",
        gap: space.sm,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
        <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: toneColor(cluster.signalTone), fontWeight: typeWeight.semibold }}>
          {cluster.label}
        </div>
        <StatusPill label={`${cluster.drones.length}`} color={toneColor(cluster.signalTone)} />
      </div>
      {visible.map((drone) => {
        const active = selectedId === drone.id;
        const spatiallyLinked =
          (spatialHover?.type === "drone" && spatialHover.id === drone.id) ||
          (spatialHover?.type === "zone" && spatialHover.id === drone.zoneId);
        const signalTone = drone.signal < 60 || drone.status === "signal-degraded" ? "caution" : drone.battery < 25 ? "danger" : "safe";
        const color = toneColor(signalTone);
        return (
          <button
            key={drone.id}
            type="button"
            data-testid={`drone-row-${drone.id}`}
            aria-label={`${drone.name}, ${labelMission(drone.assignedMission)}, ${getZoneLabel(drone.zoneId)}, battery ${drone.battery} percent. Select drone.`}
            aria-pressed={active}
            onClick={() => onSelectDrone(drone.id)}
            onMouseEnter={() => onSpatialHoverChange?.({ type: "drone", id: drone.id })}
            onMouseLeave={(event) => {
              if (document.activeElement !== event.currentTarget) onSpatialHoverChange?.(null);
            }}
            onFocus={() => onSpatialHoverChange?.({ type: "drone", id: drone.id })}
            onBlur={() => onSpatialHoverChange?.(null)}
            style={{
              width: "100%",
              textAlign: "left",
              borderRadius: radius.control,
              border: `1px solid ${active ? tint(color, 0.4) : spatiallyLinked ? tint(T.cyan, 0.34) : border.soft}`,
              background: active ? tint(color, 0.08) : spatiallyLinked ? tint(T.cyan, 0.07) : "transparent",
              padding: `${space.sm}px ${space.md}px`,
              cursor: "pointer",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              gap: space.sm,
              alignItems: "center",
              transition: `background ${motion.fast}, border-color ${motion.fast}`,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, fontWeight: typeWeight.semibold }}>
                {drone.name}
              </div>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textMuted, marginTop: space.xs, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {labelMission(drone.assignedMission)} · {getZoneLabel(drone.zoneId)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color, fontWeight: typeWeight.bold }}>
                {drone.battery}%
              </div>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, marginTop: space.xs }}>
                SIG {drone.signal}%
              </div>
            </div>
          </button>
        );
      })}
      {hidden ? (
        <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted }}>
          +{hidden} compressed normal assets
        </div>
      ) : null}
    </div>
  );
}

function LedgerEntry({ entry }: { entry: ActivityLogEntry }) {
  const signalTone = severityToTone(entry.severity);
  const color = toneColor(signalTone);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "48px minmax(0, 1fr)",
        gap: space.sm,
        padding: `${space.sm}px 0`,
        borderBottom: `1px solid ${border.soft}`,
      }}
    >
      <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted }}>{entry.ts}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: space.sm, flexWrap: "wrap" }}>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color, fontWeight: typeWeight.semibold }}>
            {entry.actor}
          </span>
          <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted }}>
            {entry.type}
          </span>
        </div>
        <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, lineHeight: 1.4, marginTop: space.xs }}>
          {entry.text}
        </div>
      </div>
    </div>
  );
}

function CompactNotes({ notes }: { notes: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
      {notes.map((note) => (
        <div key={note} style={{ display: "flex", alignItems: "flex-start", gap: space.sm }}>
          <span style={{ width: space.xs, height: space.xs, borderRadius: radius.pill, background: T.textMuted, marginTop: space.sm, flexShrink: 0 }} />
          <span style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textMuted, lineHeight: 1.4 }}>
            {note}
          </span>
        </div>
      ))}
    </div>
  );
}

interface DroneCluster {
  id: string;
  label: string;
  signalTone: SignalTone;
  drones: DroneRosterEntry[];
}

function getDroneMissionClusters(drones: DroneRosterEntry[]): DroneCluster[] {
  const abnormal = drones.filter((drone) => drone.signal < 60 || drone.battery < 25 || drone.status === "signal-degraded");
  const verification = drones.filter((drone) => drone.assignedMission === "investigation" || drone.droneClass === "thermal-lidar");
  const operations = drones.filter((drone) =>
    ["survey-zone", "perimeter-monitor", "guide-emergency-personnel", "prepare-residential-evacuation", "automatic-route"].includes(drone.assignedMission ?? ""),
  );
  const relay = drones.filter((drone) => drone.assignedMission === "relay-field-intel" || drone.droneClass === "guidance-relay" || drone.assignedMission === "backup-support");
  const standby = drones.filter((drone) => !abnormal.includes(drone) && !verification.includes(drone) && !operations.includes(drone) && !relay.includes(drone));

  const clusters: DroneCluster[] = [
    { id: "abnormal", label: "Needs attention", signalTone: "caution", drones: abnormal },
    { id: "verification", label: "Evidence collection", signalTone: "info", drones: verification.filter((drone) => !abnormal.includes(drone)) },
    { id: "operations", label: "Field tasking", signalTone: "danger", drones: operations.filter((drone) => !abnormal.includes(drone)) },
    { id: "relay", label: "Relay and guidance", signalTone: "safe", drones: relay.filter((drone) => !abnormal.includes(drone)) },
    { id: "standby", label: "Compressed standby", signalTone: "neutral", drones: standby },
  ];

  return clusters.filter((cluster) => cluster.drones.length > 0);
}

function getZoneThreatLevel(zone: SelectedZone): { label: string; value: number; tone: SignalTone } {
  if (zone.category === "residential") return { label: "Life-safety exposure", value: 88, tone: "danger" };
  if (zone.category === "forest") return { label: "Active spread origin", value: 76, tone: "caution" };
  return { label: "Buffer / transit exposure", value: 34, tone: "info" };
}

function labelMission(mission: DroneRosterEntry["assignedMission"]): string {
  if (!mission) return "Standby";
  return mission
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseVitals(vitals: string): { hr: number; visibility: number } {
  const hrMatch = vitals.match(/HR\s*(\d+)/i);
  const visibilityMatch = vitals.match(/VIS\s*(\d+)m/i);
  return {
    hr: hrMatch ? Number(hrMatch[1]) : 100,
    visibility: visibilityMatch ? Number(visibilityMatch[1]) : 150,
  };
}

function readinessValue(readiness: string): number {
  if (readiness.includes("%")) return Number(readiness.replace(/[^0-9]/g, "")) || 80;
  if (readiness.toLowerCase().includes("ready")) return 88;
  if (readiness.toLowerCase().includes("staged")) return 74;
  return 64;
}

function severityToTone(severity: ActivityLogEntry["severity"]): SignalTone {
  switch (severity) {
    case "danger":
      return "danger";
    case "caution":
      return "caution";
    case "safe":
      return "safe";
    case "info":
    default:
      return "info";
  }
}

function formatStopwatch(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `T+ ${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
