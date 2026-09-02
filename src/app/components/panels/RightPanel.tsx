import { getZoneLabel } from "../../mockData";
import { useState } from "react";
import { getOperationalException } from "../../domain/exceptions";
import { getAgentTasks, getAuthorityPacket, getEvidenceSources, getSignalHistory, getTalonInteractionModel } from "../../domain/talon";
import type { GroundTeamStatus, PriorityRiskItem, SelectedEntity, ShellState } from "../../tokens";
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
import { ACTION_LABELS } from "../ActionBar";
import { PanelCard } from "../shared/PanelCard";
import { PanelStateBlock } from "../shared/RailPanelFrame";
import { RailFilterBar } from "../shared/RailFilterBar";
import { Section } from "../shared/Section";
import { StatusPill } from "../shared/StatusPill";
import { ActionOutcomeVerification } from "../shared/ActionOutcomeVerification";
import { ContainmentPlanComparison } from "../shared/ContainmentPlanComparison";
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

interface PriorityPanelProps {
  state: ShellState;
  onAcknowledgePriority: (priorityId: string) => void;
  onSelectZone?: (zoneId: string) => void;
  spatialHover?: SelectedEntity;
  onSpatialHoverChange?: (target: SelectedEntity) => void;
}

interface GroundTeamsPanelProps {
  state: ShellState;
  onSelectTeam: (teamId: string) => void;
  spatialHover?: SelectedEntity;
  onSpatialHoverChange?: (target: SelectedEntity) => void;
}

export function ExceptionPanel({ state }: { state: ShellState }) {
  const exception = state.operationalException ?? getOperationalException(state.scene);

  if (!exception) {
    const sources = getEvidenceSources(state.scene);
    const completeAgents = getAgentTasks(state.scene).filter((agent) => agent.status === "complete").length;
    return (
      <PanelCard title="Exception Readiness" badgeLabel="Clear" badgeColor={T.teal}>
        <PanelHeroMetric
          eyebrow="Capability state"
          title="No active exception"
          subtitle="Sources, agents, and command gates are available for the current scene."
          metric={`${completeAgents}`}
          metricLabel="agents done"
          signalTone="safe"
        />
        <Section label="Source Availability">
          <SourceFreshnessMatrix sources={sources} limit={4} />
        </Section>
      </PanelCard>
    );
  }

  const severityTone: SignalTone = exception.severity === "critical" || exception.severity === "blocked"
    ? "danger"
    : exception.severity === "degraded"
      ? "caution"
      : "info";
  const color = toneColor(severityTone);
  const agents = getAgentTasks(state.scene).filter((agent) => exception.affectedAgents.includes(agent.agentName) || agent.status === "blocked" || agent.status === "failed");

  return (
    <PanelCard title="Exception Readiness" badgeLabel={exception.severity} badgeColor={color}>
      <PanelHeroMetric
        eyebrow="Operational exception"
        title={exception.title}
        subtitle={exception.auditText}
        metric={exception.status.toUpperCase()}
        metricLabel="state"
        signalTone={severityTone}
      />

      <Section label="Capability Impact">
        <CapabilityMatrix
          items={[
            ...exception.affectedSources.map((source) => ({
              label: source,
              state: "affected",
              detail: exception.confidenceImpact,
              signalTone: severityTone,
            })),
            ...exception.fallbackInputs.map((input) => ({
              label: input,
              state: "fallback",
              detail: "Available for supervised continuity",
              signalTone: "safe" as SignalTone,
            })),
          ]}
        />
      </Section>

      <Section label="Blocked Commands">
        <CapabilityMatrix
          items={
            exception.blockedCommands.length
              ? exception.blockedCommands.map((command) => ({
                  label: ACTION_LABELS[command] ?? command,
                  state: "blocked",
                  detail: `Requires ${exception.title.toLowerCase()} to be resolved before dispatch`,
                  signalTone: "danger" as SignalTone,
                }))
              : [
                  {
                    label: exception.recommendedRecoveryCommand ? ACTION_LABELS[exception.recommendedRecoveryCommand] : "Command execution",
                    state: exception.recommendedRecoveryCommand ? "recovery ready" : "manual only",
                    detail: exception.recommendedRecoveryCommand
                      ? `Use recovery command to restore capability`
                      : exception.mapImpact,
                    signalTone: exception.recommendedRecoveryCommand ? "caution" : "danger",
                  },
                ]
          }
        />
      </Section>

      <Section label="Affected Agents">
        <AgentRelayStrip agents={agents.length ? agents : getAgentTasks(state.scene)} />
      </Section>
    </PanelCard>
  );
}

export function PriorityPanel({
  state,
  onSelectZone,
  spatialHover,
  onSpatialHoverChange,
}: PriorityPanelProps) {
  if (state.workflowPhase === "operations") {
    return (
      <OperationsPriorityPanel
        state={state}
        onSelectZone={onSelectZone}
        spatialHover={spatialHover}
        onSpatialHoverChange={onSpatialHoverChange}
      />
    );
  }

  return (
    <IntelligencePriorityPanel
      state={state}
      onSelectZone={onSelectZone}
      spatialHover={spatialHover}
      onSpatialHoverChange={onSpatialHoverChange}
    />
  );
}

function IntelligencePriorityPanel({
  state,
  onSelectZone,
  spatialHover,
  onSpatialHoverChange,
}: {
  state: ShellState;
  onSelectZone?: (zoneId: string) => void;
  spatialHover?: SelectedEntity;
  onSpatialHoverChange?: (target: SelectedEntity) => void;
}) {
  const [priorityFilter, setPriorityFilter] = useState("all");
  const interaction = getTalonInteractionModel(state);
  const packet = getAuthorityPacket(state);
  const sources = getEvidenceSources(state.scene);
  const active = sources.filter((source) => source.status === "active").length;
  const blockedAgents = interaction.activeAgents.filter((agent) => agent.status === "blocked" || agent.status === "failed").length;

  const filteredPriorities = state.activePriorities.filter((priority) =>
    priorityFilter === "all" ||
    (priorityFilter === "attention" && (priority.severity === "danger" || priority.severity === "caution")) ||
    (priorityFilter === "active" && (priority.status === "in-progress" || priority.status === "recommended")) ||
    (priorityFilter === "pending" && priority.status === "pending"),
  );

  return (
    <PanelCard title="Operational Priorities" badgeLabel={`${state.activePriorities.length} live`} badgeColor={interaction.recommendation.tone}>
      <PanelHeroMetric
        eyebrow="TALON synthesis"
        title={interaction.recommendation.action}
        subtitle={interaction.recommendation.text}
        metric={`${packet.confidence}%`}
        metricLabel="packet conf."
        signalTone={packet.confidence > 75 ? "safe" : "caution"}
      >
        <MetricGrid
          items={[
            { label: "Active sources", value: `${active}`, signalTone: active > 3 ? "safe" : "info" },
            { label: "Blocked agents", value: `${blockedAgents}`, signalTone: blockedAgents ? "caution" : "safe" },
            { label: "Gate", value: packet.humanGate, signalTone: packet.status === "ready" ? "danger" : "neutral" },
            { label: "Escalation", value: packet.status, signalTone: packet.status === "ready" ? "caution" : "neutral" },
          ]}
        />
      </PanelHeroMetric>

      <Section label="Priority Matrix">
        <RailFilterBar
          ariaLabel="Priority matrix"
          value={priorityFilter}
          onValueChange={setPriorityFilter}
          options={[
            { id: "all", label: "All" },
            { id: "attention", label: "Attention" },
            { id: "active", label: "Active" },
            { id: "pending", label: "Pending" },
          ]}
        />
        {filteredPriorities.length ? (
          filteredPriorities.slice(0, 4).map((priority, index) => (
            <PriorityMatrixRow
              key={priority.id}
              item={priority}
              index={index}
              selected={Boolean(priority.zoneId && state.selectedEntity?.type === "zone" && state.selectedEntity.id === priority.zoneId)}
              spatiallyLinked={Boolean(priority.zoneId && spatialHover?.type === "zone" && spatialHover.id === priority.zoneId)}
              onSelectZone={onSelectZone}
              onSpatialHoverChange={onSpatialHoverChange}
            />
          ))
        ) : (
          <PanelStateBlock state="empty" title="No priorities match this view" body="Choose a broader priority filter to restore the current risk list." />
        )}
      </Section>

      <Section label="Evidence Basis">
        <SourceFreshnessMatrix sources={sources} limit={4} />
      </Section>
    </PanelCard>
  );
}

function OperationsPriorityPanel({
  state,
  onSelectZone,
  spatialHover,
  onSpatialHoverChange,
}: {
  state: ShellState;
  onSelectZone?: (zoneId: string) => void;
  spatialHover?: SelectedEntity;
  onSpatialHoverChange?: (target: SelectedEntity) => void;
}) {
  const [priorityFilter, setPriorityFilter] = useState("all");
  const cleared = state.rescueProgress.cleared;
  const total = state.rescueProgress.total;
  const pct = Math.round((cleared / total) * 100);
  const agents = getAgentTasks(state.scene).filter((agent) => agent.category === "operations" || agent.category === "governance");
  const remaining = total - cleared;

  const filteredPriorities = state.activePriorities.filter((priority) =>
    priorityFilter === "all" ||
    (priorityFilter === "attention" && (priority.severity === "danger" || priority.severity === "caution")) ||
    (priorityFilter === "active" && (priority.status === "in-progress" || priority.status === "recommended")) ||
    (priorityFilter === "pending" && priority.status === "pending"),
  );

  return (
    <PanelCard title="Operational Priorities" badgeLabel="Active operations" badgeColor={remaining > 30 ? T.fire : T.amber}>
      <PanelHeroMetric
        eyebrow="Evacuation progress"
        title={`${remaining} structures still uncleared`}
        subtitle="Operations view prioritizes route capacity, field readiness, and exceptions after authority notification."
        metric={`${pct}%`}
        metricLabel="cleared"
        signalTone={remaining > 30 ? "danger" : "caution"}
      >
        <SignalBar label="Civilian structure clearance" value={pct} signalTone={remaining > 30 ? "danger" : "caution"} animated />
      </PanelHeroMetric>

      <Section label="Route Capacity">
        <CapabilityMatrix
          items={[
            {
              label: "Route A · Egress Core",
              state: state.rescueProgress.routeA,
              detail: "Westbound civilian flow nominal. Audio guidance anchors verified.",
              signalTone: "safe",
            },
            {
              label: "Route B · Standby Lane",
              state: state.rescueProgress.routeB,
              detail: "Pre-staged fallback if Route A degrades.",
              signalTone: "caution",
            },
            {
              label: "FD ingress staging",
              state: `ETA ${state.rescueProgress.fireDeptEta}`,
              detail: "Engine 9 and Command Unit 4 staged at Buffer East service road.",
              signalTone: "caution",
            },
          ]}
        />
      </Section>

      {/*
        Trend, plan comparison, and observed outcome are inspection-only — real
        content the operator can drill into, not something they need shouting
        at them alongside the route/priority list they're actually acting on.
        Defaulting these shut is the same fix that solved the TALON rail
        overflow: nothing is removed, the rail just stops being seven
        equally-loud sections at once.
      */}
      <Section label="Operations Trend" defaultOpen={false} summary={`${pct}% cleared, trending ${remaining > 30 ? "behind" : "on pace"}`}>
        {/* Ends on `pct` — the same number the progress readout shows. */}
        <MiniTrend
          label="Cleared structures"
          unit="%"
          values={[...getSignalHistory(state.scene).structures.slice(0, -1), pct]}
          signalTone={remaining > 30 ? "danger" : "safe"}
        />
      </Section>

      <Section label="Plan Comparison" defaultOpen={false} summary={state.planVariant === "alternate" ? "Alternate plan active" : "Recommended plan active"}>
        <ContainmentPlanComparison activeVariant={state.planVariant} />
      </Section>

      <Section label="Observed Outcome" defaultOpen={false} summary="Latest authorized action vs. expected result">
        <ActionOutcomeVerification verification={state.recentActionVerification} />
      </Section>

      <Section label="Spatial Priorities">
        <RailFilterBar
          ariaLabel="Spatial priorities"
          value={priorityFilter}
          onValueChange={setPriorityFilter}
          options={[
            { id: "all", label: "All" },
            { id: "attention", label: "Attention" },
            { id: "active", label: "Active" },
            { id: "pending", label: "Pending" },
          ]}
        />
        {filteredPriorities.length ? (
          filteredPriorities.slice(0, 3).map((priority, index) => (
            <PriorityMatrixRow
              key={priority.id}
              item={priority}
              index={index}
              selected={Boolean(priority.zoneId && state.selectedEntity?.type === "zone" && state.selectedEntity.id === priority.zoneId)}
              spatiallyLinked={Boolean(priority.zoneId && spatialHover?.type === "zone" && spatialHover.id === priority.zoneId)}
              onSelectZone={onSelectZone}
              onSpatialHoverChange={onSpatialHoverChange}
            />
          ))
        ) : (
          <PanelStateBlock state="empty" title="No priorities match this view" body="Choose a broader priority filter to restore the current operations list." />
        )}
      </Section>

      <Section label="Agent Relay">
        <AgentRelayStrip agents={agents} />
      </Section>
    </PanelCard>
  );
}

export function GroundTeamsPanel({
  state,
  onSelectTeam,
  spatialHover,
  onSpatialHoverChange,
}: GroundTeamsPanelProps) {
  // Three-level triage: vitals-distressed → deployed-active → normal
  const vitalsAbnormal = state.groundTeams.filter((team) => {
    const vitals = parseVitals(team.vitals);
    return vitals.hr > 150 || vitals.visibility < 40;
  });
  const deployedActive = state.groundTeams.filter((team) =>
    !vitalsAbnormal.includes(team) && team.availability === "deployed",
  );
  const normalTeams = state.groundTeams.filter(
    (team) => !vitalsAbnormal.includes(team) && !deployedActive.includes(team),
  );
  const hasDistressed = vitalsAbnormal.length > 0;
  const agents = getAgentTasks(state.scene).filter((agent) => agent.id === "resource-readiness" || agent.id === "governance");
  const activeTeamCount = state.groundTeams.filter((team) => team.availability === "deployed" || team.availability === "staged").length;

  const sectionLabel = hasDistressed
    ? "Distress · Active · Standby"
    : deployedActive.length > 0
      ? "Active · Standby"
      : "Unit Availability";

  return (
    <PanelCard
      title="Field Readiness"
      badgeLabel={`${state.groundTeams.length} units`}
      badgeColor={hasDistressed ? T.red : deployedActive.length > 0 ? T.amber : T.teal}
    >
      <PanelHeroMetric
        eyebrow="Ground coordination"
        title={hasDistressed ? `${vitalsAbnormal.length} unit distress signal` : deployedActive.length > 0 ? `${deployedActive.length} deployed active` : "Field teams nominal"}
        subtitle="Vitals-distressed units surface first. Deployed teams second. Normal units compressed at bottom."
        metric={`${activeTeamCount}`}
        metricLabel="active"
        signalTone={hasDistressed ? "danger" : deployedActive.length > 0 ? "caution" : "safe"}
      >
        <MetricGrid
          items={[
            { label: "Available", value: `${state.groundTeams.filter((team) => team.availability === "available").length}`, signalTone: "safe" },
            { label: "Staged", value: `${state.groundTeams.filter((team) => team.availability === "staged").length}`, signalTone: "caution" },
            { label: "Deployed", value: `${state.groundTeams.filter((team) => team.availability === "deployed").length}`, signalTone: deployedActive.length > 0 ? "danger" : "neutral" },
            { label: "Low visibility", value: `${state.groundTeams.filter((team) => parseVitals(team.vitals).visibility < 80).length}`, signalTone: "caution" },
          ]}
        />
      </PanelHeroMetric>

      <Section label={sectionLabel}>
        {[...vitalsAbnormal, ...deployedActive, ...normalTeams].map((team) => (
          <FieldUnitRow
            key={team.id}
            team={team}
            selected={state.selectedEntity?.type === "team" && state.selectedEntity.id === team.id}
            spatiallyLinked={
              (spatialHover?.type === "team" && spatialHover.id === team.id) ||
              (spatialHover?.type === "zone" && spatialHover.id === team.linkedZoneId)
            }
            onSelectTeam={onSelectTeam}
            onSpatialHoverChange={onSpatialHoverChange}
            triageLevel={vitalsAbnormal.includes(team) ? "distress" : deployedActive.includes(team) ? "active" : "normal"}
          />
        ))}
      </Section>

      <Section label="Agent Relay">
        <AgentRelayStrip agents={agents} limit={2} />
      </Section>
    </PanelCard>
  );
}

function PriorityMatrixRow({
  item,
  index,
  selected,
  spatiallyLinked,
  onSelectZone,
  onSpatialHoverChange,
}: {
  item: PriorityRiskItem;
  index: number;
  selected: boolean;
  spatiallyLinked: boolean;
  onSelectZone?: (zoneId: string) => void;
  onSpatialHoverChange?: (target: SelectedEntity) => void;
}) {
  const signalTone = severityToTone(item.severity);
  const color = toneColor(signalTone);
  const score = priorityScore(item, index);
  const interactive = Boolean(item.zoneId && onSelectZone);

  const activate = () => {
    if (item.zoneId) onSelectZone?.(item.zoneId);
  };

  return (
    <div
      role={interactive ? "button" : "article"}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      aria-label={`${item.title}: ${item.severity} priority${item.zoneId ? ` in ${getZoneLabel(item.zoneId)}. Select zone.` : ""}`}
      data-testid={`priority-row-${item.id}`}
      onClick={interactive ? activate : undefined}
      onKeyDown={interactive ? (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        activate();
      } : undefined}
      onMouseEnter={item.zoneId ? () => onSpatialHoverChange?.({ type: "zone", id: item.zoneId! }) : undefined}
      onMouseLeave={item.zoneId ? (event) => {
        if (document.activeElement !== event.currentTarget) onSpatialHoverChange?.(null);
      } : undefined}
      onFocus={item.zoneId ? () => onSpatialHoverChange?.({ type: "zone", id: item.zoneId! }) : undefined}
      onBlur={item.zoneId ? () => onSpatialHoverChange?.(null) : undefined}
      style={{
        borderTop: `1px solid ${tint(color, 0.18)}`,
        borderRadius: radius.control,
        outlineOffset: 2,
        background: selected ? tint(color, 0.08) : spatiallyLinked ? tint(T.cyan, 0.07) : "transparent",
        padding: `${space.md}px 0`,
        display: "flex",
        flexDirection: "column",
        gap: space.sm,
        cursor: interactive ? "pointer" : "default",
        transition: `background ${motion.fast}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: space.sm }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color, fontWeight: typeWeight.semibold }}>
            {item.areaLabel}
          </div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, fontWeight: typeWeight.bold, lineHeight: 1.3, marginTop: space.xs }}>
            {item.title}
          </div>
        </div>
        <StatusPill label={item.status} color={color} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: space.xs }}>
        <ScoreTile label="Life" value={score.life} tone={signalTone} />
        <ScoreTile label="Spread" value={score.spread} tone={signalTone} />
        <ScoreTile label="Data" value={score.data} tone={score.data < 60 ? "caution" : "safe"} />
        <ScoreTile label="Time" value={score.time} tone={signalTone} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: space.sm, alignItems: "center", borderTop: `1px solid ${border.soft}`, paddingTop: space.sm }}>
        <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary, lineHeight: 1.4 }}>
          {item.nextStep}
        </div>
        {item.linkedActionId ? (
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color, whiteSpace: "nowrap" }}>
            {ACTION_LABELS[item.linkedActionId] ?? item.linkedActionId}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function FieldUnitRow({
  team,
  selected,
  spatiallyLinked,
  onSelectTeam,
  onSpatialHoverChange,
  triageLevel = "normal",
}: {
  team: GroundTeamStatus;
  selected: boolean;
  spatiallyLinked: boolean;
  onSelectTeam: (teamId: string) => void;
  onSpatialHoverChange?: (target: SelectedEntity) => void;
  triageLevel?: "distress" | "active" | "normal";
}) {
  const vitals = parseVitals(team.vitals);
  const isDistress = triageLevel === "distress";
  const isActive = triageLevel === "active";
  const signalTone: SignalTone = isDistress ? (vitals.hr > 150 ? "danger" : "caution") : isActive ? "caution" : "safe";
  const color = toneColor(signalTone);

  const hrPct = Math.min(100, Math.round((vitals.hr / 200) * 100));
  const visPct = Math.min(100, Math.round((vitals.visibility / 250) * 100));
  const hrTone: SignalTone = vitals.hr > 170 ? "danger" : vitals.hr > 140 ? "caution" : "safe";
  const visTone: SignalTone = vitals.visibility < 30 ? "danger" : vitals.visibility < 80 ? "caution" : "safe";

  return (
    <button
      type="button"
      data-testid={`team-row-${team.id}`}
      aria-label={`${team.name}, ${team.assignment}, ${team.availability}, ${getZoneLabel(team.linkedZoneId)}. Select ground team.`}
      aria-pressed={selected}
      onClick={() => onSelectTeam(team.id)}
      onMouseEnter={() => onSpatialHoverChange?.({ type: "team", id: team.id })}
      onMouseLeave={(event) => {
        if (document.activeElement !== event.currentTarget) onSpatialHoverChange?.(null);
      }}
      onFocus={() => onSpatialHoverChange?.({ type: "team", id: team.id })}
      onBlur={() => onSpatialHoverChange?.(null)}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: radius.control,
        border: `1px solid ${selected || isDistress || isActive ? tint(color, 0.26) : spatiallyLinked ? tint(T.cyan, 0.34) : "transparent"}`,
        borderBottomColor: selected || isDistress || isActive ? tint(color, 0.26) : spatiallyLinked ? tint(T.cyan, 0.34) : border.soft,
        background: selected || isDistress ? tint(color, 0.06) : spatiallyLinked ? tint(T.cyan, 0.07) : "transparent",
        padding: `${space.sm}px ${space.md}px`,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: space.sm,
        transition: `background ${motion.fast}, border-color ${motion.fast}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: space.sm }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space.sm, minWidth: 0 }}>
            <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold, color: T.textPrimary }}>
              {team.name}
            </span>
            <StatusPill label={team.availability} color={color} />
          </div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textMuted, marginTop: space.xs, lineHeight: 1.35 }}>
            {team.assignment} · {getZoneLabel(team.linkedZoneId)}
          </div>
        </div>
        <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color, fontWeight: typeWeight.bold, whiteSpace: "nowrap" }}>
          {team.eta}
        </div>
      </div>

      {isDistress ? (
        <div style={{ display: "flex", flexDirection: "column", gap: space.sm }}>
          <VitalsBar label="HR" value={hrPct} displayValue={`${vitals.hr} bpm`} signalTone={hrTone} />
          <VitalsBar label="VIS" value={visPct} displayValue={`${vitals.visibility}m`} signalTone={visTone} />
        </div>
      ) : isActive ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary }}>{team.unitType}</span>
          <div style={{ display: "flex", gap: space.sm }}>
            <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted }}>
              HR {vitals.hr}
            </span>
            <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted }}>
              VIS {vitals.visibility}m
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted }}>
            {team.unitType}
          </span>
          <span style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.teal, fontWeight: typeWeight.semibold }}>
            Nominal
          </span>
        </div>
      )}
    </button>
  );
}

function VitalsBar({ label, value, displayValue, signalTone }: { label: string; value: number; displayValue: string; signalTone: SignalTone }) {
  const color = toneColor(signalTone);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 44px", alignItems: "center", gap: space.sm }}>
      <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>{label}</span>
      <div style={{ height: space.xs, borderRadius: radius.pill, background: border.subtle, overflow: "hidden" }}>
        <div style={{
          width: `${value}%`, height: "100%", background: color, borderRadius: radius.pill,
          transition: "width 300ms ease",
        }} />
      </div>
      <span style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color, textAlign: "right" }}>{displayValue}</span>
    </div>
  );
}

function ScoreTile({ label, value, tone }: { label: string; value: number; tone: SignalTone }) {
  const color = toneColor(tone);
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: font.mono, fontSize: typeScale.eyebrow, color: T.textMuted, letterSpacing: tracking.telemetry, textTransform: "uppercase", marginBottom: space.xs }}>
        {label}
      </div>
      <div style={{ height: space.sm, borderRadius: radius.pill, background: surface.inset, overflow: "hidden", border: `1px solid ${border.soft}` }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: radius.pill }} />
      </div>
    </div>
  );
}

function priorityScore(item: PriorityRiskItem, index: number) {
  const base = item.severity === "danger" ? 88 : item.severity === "caution" ? 68 : item.severity === "safe" ? 38 : 54;
  return {
    life: clamp(base + (item.areaLabel.toLowerCase().includes("residential") ? 6 : -index * 4)),
    spread: clamp(base - index * 5 + (item.title.toLowerCase().includes("spread") ? 8 : 0)),
    data: clamp(item.status === "pending" ? 52 : item.status === "recommended" ? 74 : item.status === "complete" ? 92 : 64),
    time: clamp(base + (index === 0 ? 6 : -index * 6)),
  };
}

function parseVitals(vitals: string): { hr: number; visibility: number } {
  const hrMatch = vitals.match(/HR\s*(\d+)/i);
  const visibilityMatch = vitals.match(/VIS\s*(\d+)m/i);
  return {
    hr: hrMatch ? Number(hrMatch[1]) : 100,
    visibility: visibilityMatch ? Number(visibilityMatch[1]) : 150,
  };
}

function severityToTone(severity: PriorityRiskItem["severity"]): SignalTone {
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

function clamp(value: number) {
  return Math.max(8, Math.min(100, value));
}
