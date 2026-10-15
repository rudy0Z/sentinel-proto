/*
 * ─── Rail panel content (shell v3) — docs/redesign-2026/14 §3.1.4 ──────────
 * The registry-to-component router. Existing panel bodies render unchanged
 * (props-in, chromeless); the two new surfaces are the Map & layers panel and
 * the chat-first TALON Session panel with its decision card.
 *
 * Gate law (constitution): the DecisionCard routes through the SAME
 * hold-to-confirm CommandTile path as the deck — hold → handleAction →
 * modal/dispatch. It is an entrance to the gate, never a second gate.
 */
import type { ReactNode } from "react";
import { GATED_ACTIONS } from "../../domain/stateMachine";
import {
  getAgentTasks,
  getEvidenceSources,
  getSceneChips,
  getTalonSessionRecommendation,
} from "../../domain/talon";
import type { TalonSurface } from "../../domain/talonSurface";
import { INTENT_LABELS, type TalonIntent } from "../../domain/intents";
import type { PanelSlotId } from "../../domain/panels";
import type {
  AgentStatus,
  QuickActionId,
  SelectedEntity,
  ShellState,
  TalonConversationState,
} from "../../tokens";
import {
  T,
  border,
  font,
  radius,
  space,
  tint,
  tracking,
  typeScale,
  typeStyle,
  typeWeight,
} from "../../tokens";
import {
  CommandButton,
  CommandTile,
  EvidenceChip,
  KitStyles,
  PanelGlass,
  SectionEyebrow,
  StatusDot,
  StatusPill,
  type PillTone,
} from "../kit/core";
import { IntelPanel, DroneFleetPanel, ActivityLogPanel } from "../panels/LeftPanel";import { ExceptionPanel, GroundTeamsPanel, PriorityPanel } from "../panels/RightPanel";
import { TalonSession } from "../talon/TalonSession";
import { FireBehaviourBlock } from "../shell2/panels2";
import { getZoneById } from "../../mockData";

export interface RailContentProps {
  state: ShellState;
  focusMode: boolean;
  surface: TalonSurface;
  onConversationChange: (conversation: TalonConversationState) => void;
  intents: TalonIntent[];
  onIntentAccept: (intent: TalonIntent) => void;
  onIntentDismiss: (intent: TalonIntent) => void;
  onAction: (id: QuickActionId) => void;
  stagedExpiresAt: number | null;
  onClearSelection: () => void;
  onAcknowledgePriority: (id: string) => void;
  onSelectDrone: (droneId: string) => void;
  onSelectTeam: (teamId: string) => void;
  onSelectZone: (zoneId: string) => void;
  spatialHover: SelectedEntity;
  onSpatialHoverChange: (hover: SelectedEntity) => void;
  canToggleSurface: boolean;
  onSurfaceModeChange: (mode: ShellState["surfaceMode"]) => void;
  onOpenExplore3d: () => void;
  incidentElapsed: number;
  investigationElapsed: number;
  /** Shell-local surfaces (InvestigationStrip) injected by SentinelShell. */
  renderers?: Partial<Record<PanelSlotId, () => ReactNode>>;
}

/* ─── Map & layers (NEW — the home for what used to float over the map) ──── */

const SURFACE_MODES: Array<{ id: ShellState["surfaceMode"]; label: string }> = [
  { id: "map", label: "Map" },
  { id: "drone-grid", label: "Drone grid" },
];

function MapPanel({ ctx }: { ctx: RailContentProps }) {
  const { state, canToggleSurface, onSurfaceModeChange, onOpenExplore3d, spatialHover } = ctx;
  const evidence = getEvidenceSources(state.scene);
  const zone = state.selectedZoneId ? getZoneById(state.selectedZoneId) : null;
  return (
    <div style={{ display: "grid", gap: space.lg }}>
      <SectionEyebrow label="Center view" lip={state.surfaceMode} tier="T4" />
      <div
        role="group"
        aria-label="Center view mode"
        style={{
          display: "flex",
          gap: space.xs,
          padding: space.xs,
          borderRadius: radius.control,
          background: "rgba(255, 255, 255, 0.04)",
          border: `1px solid ${border.default}`,
          width: "fit-content",
        }}
      >
        {SURFACE_MODES.map((option) => {
          const active = state.surfaceMode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => canToggleSurface && onSurfaceModeChange(option.id)}
              aria-pressed={active}
              disabled={!canToggleSurface}
              title={canToggleSurface ? undefined : "Surface mode follows the operational phase"}
              style={{
                border: "none",
                borderRadius: radius.control,
                background: active ? tint(T.cyan, 0.16) : "transparent",
                color: active ? T.cyan : T.textMuted,
                padding: `${space.xs}px ${space.sm}px`,
                fontFamily: font.sans,
                fontSize: typeScale.label,
                fontWeight: typeWeight.bold,
                cursor: canToggleSurface ? "pointer" : "not-allowed",
                opacity: canToggleSurface ? 1 : 0.45,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gap: space.md }}>
        <SectionEyebrow label="Map layers" lip={`${evidence.filter((e) => e.status === "active").length}/${evidence.length} live`} tier="T3" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm }}>
          {evidence.map((source) => (
            <EvidenceChip
              key={source.id}
              kind={source.kind}
              status={source.status}
              confidence={source.confidence}
              title={`${source.label} · ${source.lastUpdated}${source.note ? ` · ${source.note}` : ""}`}
            />
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: space.md }}>
        <SectionEyebrow label="Focus" tier="T4" />
        <div style={{ display: "grid", gap: space.sm }}>
          <span style={{ fontFamily: font.sans, fontSize: typeStyle.body.size, color: T.textPrimary }}>
            {zone ? `Zone focused — ${zone.label}` : "No zone focused"}
          </span>
          <span style={{ fontFamily: font.sans, fontSize: typeStyle.body.size, color: T.textSecondary }}>
            {spatialHover ? `Hover — ${spatialHover.type} · ${spatialHover.id}` : "Hover the map for live asset readouts."}
          </span>
        </div>
      </div>

      <CommandButton label="Open EXPLORE · 3D" tone="info" onClick={onOpenExplore3d} />
    </div>
  );
}

/* ─── Decision card — the gate's entrance inside the chat ─────────────────── */

function DecisionCard({
  state,
  onAction,
  stagedExpiresAt,
}: {
  state: ShellState;
  onAction: (id: QuickActionId) => void;
  stagedExpiresAt: number | null;
}) {
  const staged = state.quickActionStates.find(
    (action) => action.status === "recommended" && GATED_ACTIONS.has(action.id),
  );
  if (!staged) return null;
  const recommendation = getTalonSessionRecommendation(state);
  return (
    <PanelGlass
      variant="label"
      padding={space.md}
      data-decision-card="true"
      style={{ display: "grid", gap: space.md, borderColor: tint(T.amber, 0.4) }}
    >
      <SectionEyebrow label="Decision required" lip={staged.label} tier="T1" />
      <span style={{ fontFamily: font.sans, fontSize: typeStyle.body.size, color: T.textPrimary, lineHeight: 1.5 }}>
        {recommendation.body}
      </span>
      <div style={{ position: "relative", display: "flex", justifyContent: "flex-start" }}>
        <CommandTile
          label={staged.label}
          tone="caution"
          classChip="C3"
          expiresAt={stagedExpiresAt}
          staged
          gated
          onClick={() => onAction(staged.id)}
        />
      </div>
      <span style={{ fontFamily: font.sans, fontSize: typeStyle.metadata.size, color: T.textMuted, lineHeight: 1.5 }}>
        Hold to authorize — or do nothing. The staged recommendation expires back to watch; nothing executes on silence.
      </span>
    </PanelGlass>
  );
}

/* ─── TALON Session — the chat-first right rail (doc 14: "the orb asks, the rail shows") ── */

const AGENT_TONE: Record<AgentStatus, { tone: PillTone; pulse: boolean }> = {
  running: { tone: "info", pulse: true },
  blocked: { tone: "caution", pulse: false },
  complete: { tone: "safe", pulse: false },
  failed: { tone: "danger", pulse: false },
  queued: { tone: "neutral", pulse: false },
};

function SessionPanel({ ctx }: { ctx: RailContentProps }) {
  const { state, surface, onConversationChange, intents, onIntentAccept, onIntentDismiss } = ctx;
  const sessionRec = getTalonSessionRecommendation(state);
  const tasks = getAgentTasks(state.scene);
  const evidence = getEvidenceSources(state.scene);
  const runningCount = tasks.filter((task) => task.status === "running").length;
  const gateWaiting = Boolean(
    state.quickActionStates.find((action) => action.status === "recommended" && GATED_ACTIONS.has(action.id)),
  );

  return (
    <div style={{ display: "grid", gap: space.xl }}>
      <div style={{ display: "grid", gap: space.md }}>
        {/* No local SectionEyebrow: the rail panel header already renders
         * "TALON SESSION" + the posture lip + the tier dot. Repeating it inside
         * the body printed the title twice and pushed the content down. */}
        <TalonSession
          /* "modal", not "floating": the floating variant positions its surface
           * `bottom: calc(100% + 12px)` — it rises ABOVE its anchor, which is
           * correct for the bottom-centre orb but pushed the whole session
           * off-screen inside a top-anchored rail panel (surface y=-125). The
           * modal variant renders in-flow, so the thread scrolls with the
           * panel. The orb in the deck keeps the floating surface. */
          variant="modal"
          conversation={state.talonConversation}
          onConversationChange={onConversationChange}
          legacyMode={false}
          expanded
          context={{
            recommendation: sessionRec,
            statusLabel: sessionRec.title,
            detail: sessionRec.body,
            ambientMarkState: surface.markState,
            ambientTone: surface.tone,
            postureLabel: surface.postureLabel,
            postureLine: surface.postureLine,
            chips: getSceneChips(state.scene),
            defaultTranscript: "TALON, brief me on the current picture.",
            scriptedReply: sessionRec.body,
          }}
        />
      </div>

      <DecisionCard state={state} onAction={ctx.onAction} stagedExpiresAt={ctx.stagedExpiresAt} />

      {intents.length > 0 ? (
        <div style={{ display: "grid", gap: space.md }}>
          <SectionEyebrow label="TALON proposals" tier="T2" />
          {intents.map((intent) => (
            <PanelGlass key={intent.id} variant="label" padding={space.md} style={{ display: "grid", gap: space.md }}>
              <div style={{ display: "flex", alignItems: "center", gap: space.md }}>
                <StatusPill label={INTENT_LABELS[intent.kind]} tone="info" />
                <span style={{ flex: 1 }} />
                <button
                  type="button"
                  onClick={() => onIntentAccept(intent)}
                  style={{
                    fontFamily: font.sans,
                    fontSize: typeStyle.control.size,
                    fontWeight: typeWeight.semibold,
                    color: T.cyan,
                    background: tint(T.cyan, 0.1),
                    border: `1px solid ${tint(T.cyan, 0.45)}`,
                    borderRadius: radius.control,
                    padding: "3px 10px",
                    cursor: "pointer",
                  }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => onIntentDismiss(intent)}
                  style={{
                    fontFamily: font.sans,
                    fontSize: typeStyle.control.size,
                    color: T.textMuted,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Dismiss
                </button>
              </div>
              <span style={{ fontFamily: font.sans, fontSize: typeStyle.body.size, color: T.textSecondary, lineHeight: 1.5 }}>
                {intent.reason}
              </span>
            </PanelGlass>
          ))}
        </div>
      ) : null}

      {/* Fire behaviour sits directly under the session: what the fire is DOING
          (NWCG metrics), which is the question the operator asks of the map. */}
      <FireBehaviourBlock dark={false} />

      <div style={{ display: "grid", gap: space.md }}>
        <SectionEyebrow label="Tool trace" lip={`${runningCount} running`} tier="T3" />
        <div style={{ display: "grid", gap: space.md }}>
          {tasks.slice(0, 5).map((task) => (
            <div key={task.id} style={{ display: "flex", gap: space.md, alignItems: "flex-start" }}>
              <span style={{ paddingTop: 4 }}>
                <StatusDot tone={AGENT_TONE[task.status].tone} pulse={AGENT_TONE[task.status].pulse} />
              </span>
              <div style={{ flex: 1, display: "grid", gap: 2, minWidth: 0 }}>
                <div style={{ display: "flex", gap: space.md, alignItems: "baseline" }}>
                  <span style={{ fontFamily: font.sans, fontSize: typeStyle.control.size, fontWeight: typeWeight.semibold, color: T.textPrimary }}>
                    {task.shortLabel}
                  </span>
                  <span
                    style={{
                      fontFamily: font.mono,
                      fontSize: typeStyle.metadata.size,
                      letterSpacing: tracking.telemetry,
                      color: T.textMuted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.toolCalls.length} tools
                  </span>
                </div>
                <span style={{ fontFamily: font.sans, fontSize: typeStyle.body.size, color: T.textSecondary, lineHeight: 1.45 }}>
                  {task.currentTask}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: space.md }}>
        <SectionEyebrow label="Evidence" lip={`${evidence.filter((e) => e.status === "active").length}/${evidence.length} active`} tier="T3" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm }}>
          {evidence.map((source) => (
            <EvidenceChip
              key={source.id}
              kind={source.kind}
              status={source.status}
              confidence={source.confidence}
              title={`${source.label} · ${source.lastUpdated}${source.note ? ` · ${source.note}` : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Router — registry id → content. New panels join here. ──────────────── */

export function RailPanelContent({ id, ctx }: { id: PanelSlotId; ctx: RailContentProps }) {
  const injected = ctx.renderers?.[id];
  if (injected) return <>{injected()}</>;
  switch (id) {
    case "intel":
      return <IntelPanel state={ctx.state} onClearSelection={ctx.onClearSelection} />;
    case "map":
      return <MapPanel ctx={ctx} />;
    case "fleet":
      return (
        <DroneFleetPanel
          state={ctx.state}
          onSelectDrone={ctx.onSelectDrone}
          spatialHover={ctx.spatialHover}
          onSpatialHoverChange={ctx.onSpatialHoverChange}
          canToggleSurface={ctx.canToggleSurface}
          onSurfaceModeChange={ctx.onSurfaceModeChange}
        />
      );
    case "activity":
      return <ActivityLogPanel state={ctx.state} incidentElapsed={ctx.incidentElapsed} />;
    case "talon":
      return <SessionPanel ctx={ctx} />;
    case "priority":
      return (
        <PriorityPanel
          state={ctx.state}
          onAcknowledgePriority={ctx.onAcknowledgePriority}
          onSelectZone={ctx.onSelectZone}
          spatialHover={ctx.spatialHover}
          onSpatialHoverChange={ctx.onSpatialHoverChange}
        />
      );
    case "ground-teams":
      return (
        <GroundTeamsPanel
          state={ctx.state}
          onSelectTeam={ctx.onSelectTeam}
          spatialHover={ctx.spatialHover}
          onSpatialHoverChange={ctx.onSpatialHoverChange}
        />
      );
    case "exceptions":
      return <ExceptionPanel state={ctx.state} />;
    default:
      return null;
  }
}
