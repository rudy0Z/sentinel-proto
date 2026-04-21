import { getZoneLabel } from "../../mockData";
import { GI, PANEL_TITLES, getDensity, type PriorityRiskItem, type ShellState, T, font } from "../../tokens";
import { ACTION_LABELS } from "../ActionBar";
import { PanelCard } from "../shared/PanelCard";
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

// ─── Priority / Right Rail Panel ─────────────────────────────────────────────

export function PriorityPanel({ state, onAcknowledgePriority }: PriorityPanelProps) {
  const density = getDensity(state.mode);
  const titles = PANEL_TITLES[state.mode];

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

// ─── Ground Teams Panel ───────────────────────────────────────────────────────

export function GroundTeamsPanel({ state, onSelectTeam }: GroundTeamsPanelProps) {
  const density = getDensity(state.mode);
  const isCritical = density === "critical";
  const isCondensed = density === "condensed";
  const titles = PANEL_TITLES[state.mode];

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
              {item.acknowledged ? "✓ Ack" : "Ack"}
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
            {item.acknowledged ? "✓ Acknowledged" : "Acknowledge"}
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
