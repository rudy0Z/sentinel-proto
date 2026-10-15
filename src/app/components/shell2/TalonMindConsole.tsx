/*
 * ─── TALON Mind Console (shell v2) — docs/redesign-2026/03 §Architecture ───
 * The right-side "mind": one state, two renderings. Everything here derives
 * from the same domain functions the orb consumes (getTalonSessionRecommendation,
 * getAgentTasks, getEvidenceSources), so the thread can never disagree with the
 * gate. TALON's UI-intents render as dismissible proposals with undo receipts —
 * attention, never furniture.
 */
import { useState } from "react";
import { GATED_ACTIONS } from "../../domain/stateMachine";
import { getAgentTasks, getEvidenceSources, getSceneChips, getTalonSessionRecommendation } from "../../domain/talon";
import type { TalonSurface } from "../../domain/talonSurface";
import { INTENT_LABELS, type TalonIntent } from "../../domain/intents";
import type { AgentStatus, DroneRosterEntry, QuickActionId, ShellState, TalonConversationState } from "../../tokens";
import { NUMERIC_TNUM, T, font, layer, light, radius, space, tracking, typeStyle, typeWeight, tint } from "../../tokens";
import { CommandButton, EvidenceChip, KitStyles, PanelGlass, SectionEyebrow, StatusDot, StatusPill, type PillTone } from "../kit/core";
import { TalonSession } from "../talon/TalonSession";
import { ConvergenceCard, FleetRowsV2, TelemetryStripV2 } from "./panels2";
import type { TelemetryFrame } from "../../session/useScenarioSession";

const AGENT_TONE: Record<AgentStatus, { tone: PillTone; pulse: boolean }> = {
  running: { tone: "info", pulse: true },
  blocked: { tone: "caution", pulse: false },
  complete: { tone: "safe", pulse: false },
  failed: { tone: "danger", pulse: false },
  queued: { tone: "neutral", pulse: false },
};

export function TalonMindConsole({
  state,
  surface,
  conversation,
  onConversationChange,
  intents,
  onIntentAccept,
  onIntentDismiss,
  drones,
  evidenceConfidence,
  thermalF,
  windLabel,
  structuresCleared,
  droneTelemetry,
  popTier,
  liveFrame,
  onAction,
  top,
  bottom,
}: {
  state: ShellState;
  surface: TalonSurface;
  conversation: TalonConversationState;
  onConversationChange: (conversation: TalonConversationState) => void;
  intents: TalonIntent[];
  onIntentAccept: (intent: TalonIntent) => void;
  onIntentDismiss: (intent: TalonIntent) => void;
  drones: DroneRosterEntry[];
  evidenceConfidence: number;
  thermalF: number;
  windLabel: string;
  structuresCleared: number;
  popTier: "T1" | "T2" | "T3" | "T4" | null;
  liveFrame: TelemetryFrame | null;
  /** The tracked asset's HUD fields (panels-charter §7) — selected drone, else first. */
  droneTelemetry?: { name: string; gs: number; alt: number; hdg: number; bat: number; link: number } | null;
  onAction: (id: QuickActionId) => void;
  top: number;
  bottom: number;
}) {
  const [sessionExpanded, setSessionExpanded] = useState(false);
  const sessionRec = getTalonSessionRecommendation(state);
  const tasks = getAgentTasks(state.scene);
  const evidence = getEvidenceSources(state.scene);
  const runningCount = tasks.filter((task) => task.status === "running").length;
  const trackedDrone =
    state.selectedEntity?.type === "drone"
      ? drones.find((drone) => drone.id === state.selectedEntity?.id)
      : drones[0];
  // The sticky mirror: one derivation feeding both the thread and the gate.
  const mirror = state.actionSurface.primary.find((a) => a.status === "available" || a.status === "recommended") ?? null;

  return (
    <div
      data-mind="true"
      style={{
        position: "absolute",
        right: space.lg,
        top,
        bottom,
        width: 380,
        zIndex: layer.rail,
        display: "flex",
      }}
    >
      <KitStyles />
      <PanelGlass light
        variant="panel"
        padding={space.lg}
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: space.xl, overflowY: "auto" }}
        role="region"
        aria-label="TALON mind console"
      >
        <SectionEyebrow onLight
          label="TALON · Mind"
          lip={surface.postureLabel}
          tier={popTier ?? (surface.posture === "gated" || surface.posture === "blocked" ? "T1" : "T4")}
        />

        {/* C1 — fused convergence: arc gauge + the three series (fixes G-01) */}
        <ConvergenceCard state={state} evidenceConfidence={evidenceConfidence} />

        {/* The conversation — same session surface, now with a real home */}
        <div style={{ display: "grid", gap: space.md }}>
          <SectionEyebrow onLight label="Session" tier="T4" />
          <TalonSession
            variant="floating"
            conversation={conversation}
            onConversationChange={onConversationChange}
            legacyMode={false}
            expanded={sessionExpanded}
            onExpandedChange={setSessionExpanded}
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

        {/* Tool trace — the visible thinking pipeline (R1) */}
        <div style={{ display: "grid", gap: space.md }}>
          <SectionEyebrow onLight label="Tool trace" lip={`${runningCount} running`} tier="T3" />
          <div style={{ display: "grid", gap: space.md }}>
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} style={{ display: "flex", gap: space.md, alignItems: "flex-start" }}>
                <span style={{ paddingTop: 4 }}>
                  <StatusDot tone={AGENT_TONE[task.status].tone} pulse={AGENT_TONE[task.status].pulse} onLight />
                </span>
                <div style={{ flex: 1, display: "grid", gap: 2, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: space.md, alignItems: "baseline" }}>
                    <span style={{ fontFamily: font.sans, fontSize: typeStyle.control.size, fontWeight: typeWeight.semibold, color: light.textPrimary }}>
                      {task.shortLabel}
                    </span>
                    <span
                      style={{
                        fontFamily: font.mono,
                        fontSize: typeStyle.metadata.size,
                        letterSpacing: tracking.telemetry,
                        color: light.textMuted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {task.toolCalls.length} tools
                    </span>
                    {typeof task.confidence === "number" ? (
                      <span style={{ fontFamily: font.sans, fontSize: typeStyle.metadata.size, fontWeight: typeWeight.semibold, fontFeatureSettings: NUMERIC_TNUM, color: light.textMuted }}>
                        {task.confidence}%
                      </span>
                    ) : null}
                  </div>
                  <span style={{ fontFamily: font.sans, fontSize: typeStyle.body.size, color: light.textSecondary, lineHeight: 1.45 }}>
                    {task.currentTask}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence provenance — every claim chips back to its source (R2) */}
        <div style={{ display: "grid", gap: space.md }}>
          <SectionEyebrow onLight label="Evidence" lip={`${evidence.filter((e) => e.status === "active").length}/${evidence.length} active`} tier="T3" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm }}>
            {evidence.map((source) => (
              <EvidenceChip onLight
                key={source.id}
                kind={source.kind}
                status={source.status}
                confidence={source.confidence}
                title={`${source.label} · ${source.lastUpdated}${source.note ? ` · ${source.note}` : ""}`}
              />
            ))}
          </div>
        </div>

        {/* UI intents — proposals with undo receipts, never auto-applied (R6) */}
        {intents.length > 0 ? (
          <div style={{ display: "grid", gap: space.md }}>
            <SectionEyebrow onLight label="TALON proposals" tier="T2" />
            {intents.map((intent) => (
              <PanelGlass light key={intent.id} variant="label" padding={space.md} style={{ display: "grid", gap: space.md }}>
                <div style={{ display: "flex", alignItems: "center", gap: space.md }}>
                  <StatusPill label={INTENT_LABELS[intent.kind]} tone="info" onLight />
                  <span style={{ flex: 1 }} />
                  <button
                    type="button"
                    onClick={() => onIntentAccept(intent)}
                    style={{
                      fontFamily: font.sans, fontSize: typeStyle.control.size, fontWeight: typeWeight.semibold,
                      color: light.tone.info, background: tint(light.tone.info, 0.10), border: `1px solid ${tint(light.tone.info, 0.45)}`,
                      borderRadius: 8, padding: "3px 10px", cursor: "pointer",
                    }}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => onIntentDismiss(intent)}
                    style={{
                      fontFamily: font.sans, fontSize: typeStyle.control.size,
                      color: light.textMuted, background: "none", border: "none", cursor: "pointer",
                    }}
                  >
                    Dismiss
                  </button>
                </div>
                <span style={{ fontFamily: font.sans, fontSize: typeStyle.body.size, color: light.textSecondary, lineHeight: 1.5 }}>
                  {intent.reason}
                </span>
              </PanelGlass>
            ))}
          </div>
        ) : null}

        {/* Live telemetry + fleet — same view models in scripted and live modes */}
        <TelemetryStripV2
          thermalF={thermalF}
          confidence={evidenceConfidence}
          windLabel={windLabel}
          structuresCleared={structuresCleared}
          source={liveFrame ? "live" : "scripted"}
          drone={droneTelemetry}
        />
        <FleetRowsV2 drones={drones} />

        {/* The sticky mirror (doc 13 Phase F): anything actionable in the thread
            renders here from the same actionSurface the deck gate consumes, so
            chat and orb can never disagree. Authorization still happens at the
            gate — this is a mirror, not a second gate. */}
        {mirror ? (
          <div
            data-mirror={mirror.id}
            style={{
              position: "sticky",
              bottom: 0,
              display: "grid",
              gap: space.sm,
              padding: space.md,
              borderRadius: radius.panel,
              border: `1px solid ${light.border}`,
              background: GATED_ACTIONS.has(mirror.id) ? tint(light.tone.caution, 0.10) : light.base,
            }}
          >
            <span style={{ fontFamily: font.mono, fontSize: typeStyle.eyebrow.size, fontWeight: typeWeight.semibold, letterSpacing: tracking.eyebrow, textTransform: "uppercase", color: light.textSecondary }}>
              {GATED_ACTIONS.has(mirror.id) ? "mirrors the gate · authorization at the deck" : "mirrors the deck"}
            </span>
            <CommandButton
              label={mirror.label}
              tone={GATED_ACTIONS.has(mirror.id) ? "caution" : "info"}
              gated={GATED_ACTIONS.has(mirror.id)}
              onLight
              onClick={() => onAction(mirror.id)}
            />
          </div>
        ) : null}
      </PanelGlass>
    </div>
  );
}
