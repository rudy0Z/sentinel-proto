import { useState, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ActionBar } from "./ActionBar";
import { ActionModal } from "./ActionModal";
import type { ModalPayload } from "./ActionModal";
import { MapCanvas } from "./MapCanvas";
import { Navbar } from "./Navbar";
import { ActionGlyph } from "./actionVisuals";
import droneThermalFeed from "../../assets/drone-thermal-feed.png";
import { ActivityLogPanel, DroneFleetPanel, IntelPanel } from "./panels/LeftPanel";
import { GroundTeamsPanel, PriorityPanel } from "./panels/RightPanel";
import {
  ANOMALY,
  CONTAINMENT_PLAN_SUMMARY,
  INCIDENT,
  MISSION_ANCHORS,
  OVERRIDE_REASONS,
  REVIEW_SCENES,
  TERRAIN_MODEL_STATUS,
  createActivityLog,
  createDroneRoster,
  createGroundTeams,
  createRescueProgress,
  getZoneById,
} from "../mockData";
import {
  GLASS,
  GI,
  ACTIONBAR_H,
  ACTIONBAR_H_EXPANDED,
  DroneClass,
  DroneMissionType,
  OperationalMode,
  PriorityRiskItem,
  QuickActionId,
  QuickActionState,
  ActionSurface,
  SceneId,
  SelectedEntity,
  ShellDraft,
  ShellState,
  T,
  font,
} from "../tokens";

const SCREEN_INSET = 16;
const NAVBAR_H = 52;
const LEFT_RAIL_W = 300;
const RIGHT_RAIL_W = 300;
const PANEL_TOP = NAVBAR_H + 12;
const LEFT_PANEL_GAP = 8;
const RIGHT_PANEL_GAP = 8;

let activityCounter = 1000;

function parseTimeSeconds(timeStr: string): number {
  const [h, m, s] = timeStr.replace(" UTC", "").split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

export function formatTime(s: number): string {
  const h = Math.floor(s / 3600) % 24;
  const m = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatStopwatch(s: number): string {
  const m = Math.floor(s / 60);
  const secs = s % 60;
  return `T+ ${String(m).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

let logTimeSeconds = 49 * 60 + 18;
function nextLogTimestamp(): string {
  logTimeSeconds += 3 + Math.floor(Math.random() * 6);
  const h = Math.floor(logTimeSeconds / 3600) % 24;
  const m = Math.floor((logTimeSeconds % 3600) / 60);
  const s = logTimeSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Convert hex color to rgba with alpha */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function SentinelShell() {
  const [state, setState] = useState<ShellState>(() => createSceneState("baseline", 0));
  const [reviewDockOpen, setReviewDockOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<QuickActionId | null>(null);
  const [isActionBarExpanded, setIsActionBarExpanded] = useState(false);
  const [simTime, setSimTime] = useState(() => parseTimeSeconds(INCIDENT.detectedAt));
  const [incidentElapsed, setIncidentElapsed] = useState(0);
  const [investigationElapsed, setInvestigationElapsed] = useState(0);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "processing" | "responded">("idle");
  const [showSituationResolved, setShowSituationResolved] = useState(false);
  const [experienceMode, setExperienceMode] = useState<"entry" | "brief" | "simulation" | "free">("entry");
  const [showEndCard, setShowEndCard] = useState(false);
  const [rescueElapsed, setRescueElapsed] = useState(0);
  const [edgeCaseFired, setEdgeCaseFired] = useState(false);
  const [showEscalationOverlay, setShowEscalationOverlay] = useState(false);
  const [escalationElapsed, setEscalationElapsed] = useState(0);

  // Global ticking timer
  useEffect(() => {
    if (state.scene === "baseline") return;
    const timerId = setInterval(() => {
      setSimTime(t => t + 1);
      setIncidentElapsed(e => e + 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [state.scene]);

  // Investigation timer & auto-transition
  useEffect(() => {
    if (state.scene === "investigation-pending") {
      const timerId = setInterval(() => setInvestigationElapsed(e => e + 1), 1000);
      return () => clearInterval(timerId);
    } else {
      setInvestigationElapsed(0);
    }
  }, [state.scene]);

  useEffect(() => {
    if (state.scene === "investigation-pending" && investigationElapsed >= 10) {
      handleAction("open-verification");
    }
  }, [investigationElapsed, state.scene]);

  // Simulation: auto-fire first alert shortly after scenario brief closes
  useEffect(() => {
    if (experienceMode !== "simulation") return;
    const timer = setTimeout(() => setScene("alert-command"), 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceMode]);

  // Simulation: if the operator does not respond to the initial interrupt within 15s,
  // TALON triggers the Escalation Protocol — routing the decision to a secondary operator.
  // TALON does NOT autonomously dispatch drones. A human must always authorize.
  useEffect(() => {
    if (experienceMode !== "simulation" || state.scene !== "alert-command") return;
    const timer = setTimeout(() => setShowEscalationOverlay(true), 15000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceMode, state.scene]);

  // Hide escalation overlay when operator takes action (scene changes)
  useEffect(() => {
    if (state.scene !== "alert-command") {
      setShowEscalationOverlay(false);
      setEscalationElapsed(0);
    }
  }, [state.scene]);

  // Escalation elapsed counter — ticks while overlay is visible
  useEffect(() => {
    if (!showEscalationOverlay) { setEscalationElapsed(0); return; }
    const id = setInterval(() => setEscalationElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [showEscalationOverlay]);

  // Rescue phase elapsed timer for edge-case trigger and end-card timeout
  useEffect(() => {
    const active = state.mode === "rescue" && experienceMode === "simulation";
    if (!active) { setRescueElapsed(0); return; }
    const id = setInterval(() => setRescueElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [state.mode, experienceMode]);

  useEffect(() => {
    if (experienceMode !== "simulation" || state.mode !== "rescue") return;
    if (!edgeCaseFired && rescueElapsed === 20) {
      setScene("rescue-battery-critical");
      setEdgeCaseFired(true);
    }
    if (rescueElapsed >= 60 && !showEndCard) {
      setShowEndCard(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescueElapsed, edgeCaseFired, showEndCard, experienceMode, state.mode]);

  // Always collapse action bar and reset to collapsed state on scene change
  const setScene = (scene: SceneId) => {
    setIsActionBarExpanded(false);
    setVoiceState("idle");
    if (scene === "baseline") {
      logTimeSeconds = 49 * 60 + 18;
      setSimTime(parseTimeSeconds(INCIDENT.detectedAt));
      setIncidentElapsed(0);
      setInvestigationElapsed(0);
      setState(createSceneState("baseline", 0));
    } else {
      setInvestigationElapsed(0);
      setState(createSceneState(scene, 0));
    }
  };

  const updateState = (updater: (draft: ShellDraft) => ShellDraft) => {
    setState((current) => syncState(updater(stripDerived(current)), investigationElapsed));
  };

  const handleSelectEntity = (selection: SelectedEntity) => {
    updateState((draft) => {
      if (!selection) {
        return { ...draft, selectedEntity: null, selectedZoneId: null };
      }

      if (selection.type === "zone") {
        return { ...draft, selectedEntity: selection, selectedZoneId: selection.id };
      }

      if (selection.type === "drone") {
        const drone = draft.drones.find((item) => item.id === selection.id);
        return {
          ...draft,
          selectedEntity: selection,
          selectedZoneId: drone?.zoneId ?? draft.selectedZoneId,
        };
      }

      if (selection.type === "team") {
        const team = draft.groundTeams.find((item) => item.id === selection.id);
        return {
          ...draft,
          selectedEntity: selection,
          selectedZoneId: team?.linkedZoneId ?? draft.selectedZoneId,
        };
      }

      return {
        ...draft,
        selectedEntity: selection,
        selectedZoneId: ANOMALY.zoneId,
      };
    });
  };

  const handleAcknowledgePriority = (priorityId: string) => {
    updateState((draft) => {
      if (draft.acknowledgedPriorityIds.includes(priorityId)) {
        return draft;
      }
      const next = {
        ...draft,
        acknowledgedPriorityIds: [...draft.acknowledgedPriorityIds, priorityId],
      };
      appendLog(next, "Operator", "Exception", "Signal degradation acknowledged while rescue execution remains active.", "caution");
      return next;
    });
  };

  const handleAction = (actionId: QuickActionId) => {
    // Actions that open a modal first (confirmation or mission brief)
    const modalActions: QuickActionId[] = [
      // Standard confirmation modals
      "emergency-evacuate",
      "abort-mission",
      "deploy-backup",
      "notify-authorities",
      "notify-teams",
      "stand-down",
      // Mission Brief modals — drone deployment actions
      "deploy-survey",
      "stage-perimeter",
      "stage-responder-guidance",
      "stage-residential-evacuation",
      "relay-field-intel",
      "deploy-navigation-drone",
      "activate-automatic-route",
    ];
    if (modalActions.includes(actionId)) {
      setActiveModal(actionId);
      return;
    }

    switch (actionId) {
      case "surface-alert":
        setScene("alert-command");
        return;
      case "dispatch-scout":
        setScene("investigation-pending");
        return;
      case "open-verification":
        setScene("verify-active");
        return;
      case "monitor-only":
        setScene("baseline");
        return;
      case "confirm-incident":
        setScene("contain-recommended");
        return;
      case "override-plan":
        updateState((draft) => {
          draft.scene = "contain-alternate";
          draft.overrideReason = "Operator judgment / visual confirmation";
          return draft;
        });
        return;
      case "open-degraded":
        updateState((draft) => {
          draft.scene = "contain-degraded";
          return draft;
        });
        return;
      case "authorize-containment":
        updateState((draft) => {
          const next = {
            ...draft,
            mode: "rescue" as OperationalMode,
            scene: "rescue-nominal" as SceneId,
            incidentStatus: "rescue-active" as const,
            exceptionState: "none" as const,
            selectedEntity: { type: "zone", id: "residential-south" } as SelectedEntity,
            selectedZoneId: "residential-south",
          };
          appendLog(next, "Operator", "Authorization", "Containment authorized. The shell shifted into rescue supervision.", "caution");
          return next;
        });
        return;
      case "mark-high-risk":
        updateState((draft) => {
          if (!draft.selectedZoneId || draft.highlightedZoneIds.includes(draft.selectedZoneId)) {
            return draft;
          }
          const next = {
            ...draft,
            highlightedZoneIds: [...draft.highlightedZoneIds, draft.selectedZoneId],
          };
          appendLog(next, "Operator", "Risk Mark", `Marked ${getZoneById(draft.selectedZoneId)?.label ?? "selected zone"} as high risk.`, "caution");
          return next;
        });
        return;
      // Mission dispatch actions now handled via modal confirm — remove direct cases
      case "activate-automatic-route":
        // Now handled via MissionBriefModal — see onConfirm handler below
        return;
      case "acknowledge-exception":
        handleAcknowledgePriority("signal-degradation");
        return;
    }
  };

  const canToggleSurface = state.mode === "contain" || state.mode === "rescue";
  const showsActionBar = state.mode === "contain" || state.mode === "rescue";
  const actionBarHeight = showsActionBar ? (isActionBarExpanded ? ACTIONBAR_H_EXPANDED : ACTIONBAR_H) : 0;
  const railBottomInset = SCREEN_INSET + (showsActionBar ? actionBarHeight + 12 : 0);
  const reviewDockBottom = SCREEN_INSET + (showsActionBar ? actionBarHeight + 12 : 12);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        fontFamily: font.sans,
        background: T.bgBase,
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 999px; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>

      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <MapCanvas state={state} onSelectEntity={handleSelectEntity} />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "linear-gradient(180deg, rgba(7,10,18,0.42) 0%, rgba(7,10,18,0.10) 20%, rgba(7,10,18,0.18) 58%, rgba(5,8,14,0.48) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: NAVBAR_H,
          zIndex: 40,
          background: "rgba(6,10,18,0.82)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          padding: `0 ${SCREEN_INSET}px`,
          gap: 16,
        }}
      >
        <Navbar
          state={state}
          timeString={formatTime(simTime)}
          surfaceMode={state.surfaceMode}
          canToggleSurface={canToggleSurface}
          onSurfaceModeChange={(mode) =>
            setState((current) => {
              if (!canToggleSurface) {
                return current;
              }
              return syncState({ ...stripDerived(current), surfaceMode: mode }, current.scene === "investigation-pending" ? investigationElapsed : 0);
            })
          }
        />
      </div>

      {experienceMode !== "simulation" && (
        <ReviewDock
          open={reviewDockOpen}
          activeScene={state.scene}
          bottomOffset={reviewDockBottom}
          onToggle={() => setReviewDockOpen((current) => !current)}
          onJumpToScene={setScene}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: PANEL_TOP,
          left: SCREEN_INSET,
          width: LEFT_RAIL_W,
          bottom: railBottomInset,
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          gap: LEFT_PANEL_GAP,
        }}
        role="region"
        aria-label="Intelligence panels"
      >
        <RailCard flex={4}>
          <IntelPanel
            state={state}
            onClearSelection={() =>
              updateState((draft) => ({
                ...draft,
                selectedEntity: null,
                selectedZoneId: null,
              }))
            }
          />
        </RailCard>
        <RailCard flex={3.2}>
          <DroneFleetPanel state={state} onSelectDrone={(droneId) => handleSelectEntity({ type: "drone", id: droneId })} />
        </RailCard>
        <RailCard flex={2.8}>
          <ActivityLogPanel state={state} incidentElapsed={incidentElapsed} />
        </RailCard>
      </div>

      <div
        style={{
          position: "absolute",
          top: PANEL_TOP,
          right: SCREEN_INSET,
          width: RIGHT_RAIL_W,
          bottom: railBottomInset,
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          gap: RIGHT_PANEL_GAP,
        }}
        role="region"
        aria-label="Priority and team panels"
      >
        {state.scene === "investigation-pending" ? (
          <RailCard flex={0.8}>
            <InvestigationStrip investigationElapsed={investigationElapsed} />
          </RailCard>
        ) : null}
        <RailCard flex={state.scene === "investigation-pending" ? 5.3 : 7}>
          <PriorityPanel state={state} onAcknowledgePriority={handleAcknowledgePriority} />
        </RailCard>
        <RailCard flex={state.scene === "investigation-pending" ? 3 : 3}>
          <GroundTeamsPanel state={state} onSelectTeam={(teamId) => handleSelectEntity({ type: "team", id: teamId })} />
        </RailCard>
      </div>

      {showsActionBar ? (
        <div
          style={{
            position: "absolute",
            left: LEFT_RAIL_W + SCREEN_INSET + 18,
            right: RIGHT_RAIL_W + SCREEN_INSET + 18,
            bottom: SCREEN_INSET,
            height: actionBarHeight,
            zIndex: 30,
            ...GLASS,
            display: "flex",
            alignItems: "stretch",
            padding: "0 16px",
            transition: "height 220ms cubic-bezier(0.34,1.30,0.64,1)",
          }}
          role="region"
          aria-label="Action bar"
        >
          <ActionBar
            state={state}
            onAction={handleAction}
            expanded={isActionBarExpanded}
            onToggleExpand={() => setIsActionBarExpanded((value) => !value)}
          />
        </div>
      ) : null}

      {experienceMode === "simulation" && !showEndCard && (
        <GuidanceStrip
          mode={state.mode}
          scene={state.scene}
          bottom={SCREEN_INSET + (showsActionBar ? actionBarHeight + 8 : 8)}
        />
      )}

      {state.scene === "contain-alternate" ? (
        <CompactPanel
          title="Alternate containment plan active"
          subtitle={`Override reason: ${state.overrideReason}. TALON has rebalanced the plan toward the buffer corridor while keeping responder guidance active.`}
          tone={T.amber}
        >
          <InfoCallout title={CONTAINMENT_PLAN_SUMMARY.alternate.title} body={CONTAINMENT_PLAN_SUMMARY.alternate.reasoning} tone={T.amber} />
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", marginBottom: 16 }}>
            {OVERRIDE_REASONS.map((reason) => (
              <span
                key={reason}
                style={{
                  padding: "6px 9px",
                  borderRadius: 999,
                  border: `1px solid ${reason === state.overrideReason ? `${T.amber}55` : "rgba(255,255,255,0.10)"}`,
                  background: reason === state.overrideReason ? "rgba(245,166,35,0.16)" : "rgba(255,255,255,0.04)",
                  fontFamily: font.sans,
                  fontSize: 10,
                  color: reason === state.overrideReason ? T.amber : T.textSecondary,
                }}
              >
                {reason}
              </span>
            ))}
          </div>
          
          {/* Voice to TALON override strip */}
          <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
             <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Brief TALON by voice</div>
             <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <button
                   onClick={() => {
                      if (voiceState !== "idle") return;
                      setVoiceState("listening");
                      setTimeout(() => setVoiceState("processing"), 3000);
                      setTimeout(() => setVoiceState("responded"), 4500);
                   }}
                   style={{
                     width: 44, height: 44, borderRadius: "50%",
                     background: voiceState === "idle" ? "rgba(0,200,255,0.1)" : voiceState === "listening" ? "rgba(229,83,60,0.2)" : "rgba(45,212,160,0.1)",
                     border: `1px solid ${voiceState === "idle" ? T.cyan : voiceState === "listening" ? T.red : T.teal}`,
                     cursor: voiceState === "idle" ? "pointer" : "default",
                     display: "flex", alignItems: "center", justifyContent: "center",
                     flexShrink: 0,
                     transition: "all 0.3s ease",
                   }}
                >
                   {voiceState === "idle" ? <span style={{fontSize: 20}}>🎙️</span> : voiceState === "listening" ? <span style={{fontSize: 20}}>🔴</span> : <span style={{fontSize: 20}}>✅</span>}
                </button>

                <div style={{ flex: 1, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", minHeight: 44, display: "flex", alignItems: "center" }}>
                  {voiceState === "idle" && <span style={{ fontFamily: font.sans, fontSize: 13, color: T.textMuted }}>"TALON, wind shifted northeast, move perimeter hold to buffer east instead..."</span>}
                  {voiceState === "listening" && <span style={{ fontFamily: font.sans, fontSize: 13, color: T.textPrimary, fontStyle: "italic" }}>Listening...</span>}
                  {voiceState === "processing" && <span style={{ fontFamily: font.mono, fontSize: 11, color: T.cyan }}>Processing voice input...</span>}
                  {voiceState === "responded" && <span style={{ fontFamily: font.sans, fontSize: 13, color: T.teal, lineHeight: 1.5 }}>Voice input received. Recomputing plan with NE wind vector correction. Staging perimeter hold: Buffer East. Updated plan ready for review.</span>}
                </div>
             </div>
          </div>

          <button
            onClick={() => updateState((draft) => {
               draft.scene = "contain-recommended";
               return draft;
            })}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "8px 0",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              color: T.textPrimary,
              fontFamily: font.sans,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
          >
            Acknowledge & Return to Map
          </button>
        </CompactPanel>
      ) : null}

      {state.scene === "contain-degraded" ? (
        <CompactPanel
          title="Fallback evidence mode active"
          subtitle="Containment review continues, but the terrain model is degraded and the raw feed fallback stays visible alongside the spatial surface."
          tone={T.amber}
        >
          <InfoCallout title={TERRAIN_MODEL_STATUS.rawFeedTitle} body={TERRAIN_MODEL_STATUS.rawFeedBody} tone={T.amber} />
          
          <button
            onClick={() => updateState((draft) => {
               draft.scene = "contain-recommended";
               return draft;
            })}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "8px 0",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              color: T.textPrimary,
              fontFamily: font.sans,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
          >
            Acknowledge & Return to Map
          </button>
        </CompactPanel>
      ) : null}

      {/* ── INFRASTRUCTURE TOTAL LOSS ─────────────────────────────────────────
          Full-screen catastrophic failure takeover. The entire interface is
          replaced with a dramatic recovery screen and manual protocol instructions.
      ────────────────────────────────────────────────────────────────────── */}
      {state.scene === "infrastructure-total-loss" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 200,
            background: "rgba(4, 6, 10, 0.97)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
            animation: "fadeIn 400ms ease",
          }}
        >
          {/* Pulsing red border */}
          <div style={{
            position: "absolute", inset: 0,
            border: "2px solid rgba(229,83,60,0.5)",
            borderRadius: 0,
            boxShadow: "inset 0 0 80px rgba(229,83,60,0.08), 0 0 60px rgba(229,83,60,0.12)",
            animation: "pulse 2s ease-in-out infinite",
            pointerEvents: "none",
          }} />

          {/* Corner scan lines */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 120, height: 2, background: `linear-gradient(90deg, ${T.red}, transparent)`, opacity: 0.6 }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: 2, height: 120, background: `linear-gradient(180deg, ${T.red}, transparent)`, opacity: 0.6 }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 2, background: `linear-gradient(270deg, ${T.red}, transparent)`, opacity: 0.6 }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: 2, height: 120, background: `linear-gradient(180deg, ${T.red}, transparent)`, opacity: 0.6 }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 120, height: 2, background: `linear-gradient(90deg, ${T.red}, transparent)`, opacity: 0.6 }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 2, height: 120, background: `linear-gradient(0deg, ${T.red}, transparent)`, opacity: 0.6 }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 120, height: 2, background: `linear-gradient(270deg, ${T.red}, transparent)`, opacity: 0.6 }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 2, height: 120, background: `linear-gradient(0deg, ${T.red}, transparent)`, opacity: 0.6 }} />
          </div>

          <div style={{ maxWidth: 560, width: "100%", padding: "0 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
            {/* Icon + header */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(229,83,60,0.12)", border: "1px solid rgba(229,83,60,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>⚠</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.16em", color: T.red, textTransform: "uppercase", marginBottom: 10 }}>
                  CRITICAL SYSTEM FAILURE
                </div>
                <div style={{ fontFamily: font.sans, fontSize: 26, fontWeight: 700, color: T.textPrimary, lineHeight: 1.2 }}>
                  Infrastructure connection lost
                </div>
                <div style={{ fontFamily: font.sans, fontSize: 13, color: T.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
                  Primary data feeds offline. TALON computation suspended. All drone telemetry timed out.
                </div>
              </div>
            </div>

            {/* Status indicators */}
            <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "TALON AI", status: "Offline" },
                { label: "Satellite", status: "Link lost" },
                { label: "Drone Comms", status: "Timed out" },
                { label: "Ground Teams", status: "Unconfirmed" },
              ].map(({ label, status }) => (
                <div key={label} style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(229,83,60,0.06)",
                  border: "1px solid rgba(229,83,60,0.18)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div style={{ fontFamily: font.mono, fontSize: 10, color: T.textSecondary, letterSpacing: "0.06em" }}>{label}</div>
                  <div style={{ fontFamily: font.mono, fontSize: 10, color: T.red, letterSpacing: "0.06em" }}>● {status}</div>
                </div>
              ))}
            </div>

            {/* Last known state */}
            <div style={{ width: "100%", padding: "12px 16px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ fontFamily: font.mono, fontSize: 10, color: T.textMuted, letterSpacing: "0.06em", flexShrink: 0 }}>LAST KNOWN STATE</div>
              <div style={{ fontFamily: font.mono, fontSize: 11, color: T.textSecondary }}>RESCUE NOMINAL · INC-2024-0847 · 03:52:14 UTC</div>
            </div>

            {/* Manual protocol */}
            <div style={{ width: "100%", padding: "14px 18px", borderRadius: 12, background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.20)" }}>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.amber, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Manual Protocol — Fallback</div>
              <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.6 }}>
                Switch to manual radio protocol. Contact Station 12 directly on <strong style={{ color: T.textPrimary }}>Ch. 7</strong>. Use last-known map state for ground coordination.
                Alert Regional Dispatch to INC-2024-0847 status via landline.
              </div>
            </div>

            {/* Reconnect button */}
            <button
              type="button"
              onClick={() => setScene("baseline")}
              style={{
                padding: "14px 40px",
                borderRadius: 12,
                background: "rgba(229,83,60,0.1)",
                border: `1px solid ${T.red}`,
                color: T.red,
                fontFamily: font.sans,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Attempt System Restart
            </button>
          </div>
        </div>
      )}

      {/* ── SATELLITE FEED LOSS BANNER ────────────────────────────────────────
          Persistent amber strip below the navbar when satellite is offline.
          Operations continue on drone-only telemetry at reduced confidence.
      ────────────────────────────────────────────────────────────────────── */}
      {state.scene === "satellite-feed-loss" && (
        <div style={{
          position: "absolute",
          top: NAVBAR_H,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "rgba(245,166,35,0.10)",
          borderBottom: `1px solid rgba(245,166,35,0.30)`,
          padding: "8px 24px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.amber, animation: "pulse 1.2s infinite", flexShrink: 0 }} />
          <div style={{ fontFamily: font.mono, fontSize: 10, fontWeight: 700, color: T.amber, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>
            SATELLITE FEED OFFLINE
          </div>
          <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary }}>
            TALON operating on drone telemetry only · Spatial model confidence reduced to <strong style={{ color: T.amber }}>40%</strong> · Fire spread margin ±200m
          </div>
          <div style={{ marginLeft: "auto", fontFamily: font.mono, fontSize: 10, color: T.textMuted, flexShrink: 0 }}>
            EST. RESTORE: 04:22 UTC
          </div>
        </div>
      )}

      {/* ── NETWORK DEGRADED BANNER ───────────────────────────────────────────
          Subtle persistent latency warning. Ops continue but feeds may be
          delayed — the "slow internet" failure state.
      ────────────────────────────────────────────────────────────────────── */}
      {state.scene === "network-degraded" && (
        <div style={{
          position: "absolute",
          top: NAVBAR_H,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "rgba(255,209,102,0.07)",
          borderBottom: `1px solid rgba(255,209,102,0.22)`,
          padding: "7px 24px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.yellow, animation: "pulse 2s infinite", flexShrink: 0 }} />
          <div style={{ fontFamily: font.mono, fontSize: 10, fontWeight: 700, color: T.yellow, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>
            CONNECTION DEGRADED
          </div>
          <div style={{ fontFamily: font.mono, fontSize: 10, color: T.textMuted, flexShrink: 0 }}>340ms avg latency</div>
          <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary }}>
            · Drone telemetry feeds may arrive with delay · TALON processing at reduced throughput · All decisions remain valid
          </div>
          <div style={{
            marginLeft: "auto", padding: "2px 8px", borderRadius: 5,
            background: "rgba(255,209,102,0.1)", border: "1px solid rgba(255,209,102,0.2)",
            fontFamily: font.mono, fontSize: 9, color: T.yellow, flexShrink: 0,
            letterSpacing: "0.08em",
          }}>
            MONITORING
          </div>
        </div>
      )}

      {/* ── BATTERY CRITICAL TALON NOTICE ────────────────────────────────────
          When the battery-critical scene is active, show a TALON interrupt
          floating in the center top area (like the alert popup style).
      ────────────────────────────────────────────────────────────────────── */}
      {state.scene === "rescue-battery-critical" && (
        <div style={{
          position: "absolute",
          top: NAVBAR_H + 20,
          left: "50%",
          transform: "translateX(-50%)",
          width: 460,
          zIndex: 60,
          background: "rgba(6, 10, 18, 0.92)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderRadius: 16,
          border: `1px solid ${T.amber}44`,
          boxShadow: `0 0 0 1px rgba(245,166,35,0.08), 0 20px 48px rgba(0,0,0,0.48)`,
          padding: "16px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.amber, animation: "pulse 1s infinite", flexShrink: 0 }} />
            <div style={{ fontFamily: font.mono, fontSize: 9, fontWeight: 700, color: T.amber, letterSpacing: "0.12em", textTransform: "uppercase" }}>TALON · Asset Management · Interrupt</div>
          </div>
          <div style={{ fontFamily: font.sans, fontSize: 15, fontWeight: 700, color: T.textPrimary, marginBottom: 6 }}>Battery critical — autonomous handoff initiated</div>
          <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.55, marginBottom: 12 }}>
            <strong style={{ color: T.amber }}>Lidar-02 battery at 14%.</strong> TALON has initiated an autonomous recall and mission handoff to Scout-03. No operator action required — perimeter hold will remain continuous.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(229,83,60,0.08)", border: "1px solid rgba(229,83,60,0.2)" }}>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.red, letterSpacing: "0.08em", marginBottom: 4 }}>RECALLING</div>
              <div style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 600, color: T.textPrimary }}>Lidar-02</div>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted }}>14% · RTB in progress</div>
            </div>
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(45,212,160,0.08)", border: "1px solid rgba(45,212,160,0.2)" }}>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.teal, letterSpacing: "0.08em", marginBottom: 4 }}>TAKING OVER</div>
              <div style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 600, color: T.textPrimary }}>Scout-03</div>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted }}>En route · ETA 00:42</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => updateState((draft) => {
               // Acknowledge the battery critical issue and return to nominal rescue
               draft.scene = "rescue-nominal";
               return draft;
            })}
            style={{
              width: "100%",
              marginTop: 16,
              padding: "10px 0",
              borderRadius: 8,
              background: "rgba(245,166,35,0.12)",
              border: "1px solid rgba(245,166,35,0.3)",
              color: T.amber,
              fontFamily: font.sans,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Acknowledge Exception
          </button>
        </div>
      )}

      {/* ── B1: Alert Command Popup ─────────────────────────────────────────
          Floats over the baseline map. Does NOT replace the scene.
          Operator retains full spatial awareness of their current situation.
      ────────────────────────────────────────────────────────────────────── */}
      {state.scene === "alert-command" && (
        <AlertPopup
          onDispatch={() => handleAction("dispatch-scout")}
          onDismiss={() => handleAction("monitor-only")}
        />
      )}

      {/* ── ESCALATION PROTOCOL OVERLAY ────────────────────────────────────────
          Fires when operator is unresponsive for 15 seconds on the alert-command
          scene. TALON does NOT auto-dispatch drones — it routes the alert to
          a secondary operator. The primary operator can still take action.
      ────────────────────────────────────────────────────────────────────── */}
      {showEscalationOverlay && state.scene === "alert-command" && (
        <EscalationProtocolOverlay
          escalationElapsed={escalationElapsed}
          onOperatorResponds={() => {
            setShowEscalationOverlay(false);
          }}
          onDispatch={() => {
            setShowEscalationOverlay(false);
            handleAction("dispatch-scout");
          }}
          onDismiss={() => {
            setShowEscalationOverlay(false);
            handleAction("monitor-only");
          }}
        />
      )}

      {/* ── B3: Verify Live Feed placeholder ───────────────────────────────
          Before the TALON map is ready, the center space shows the drone cam.
          Overlaid on the map area between panels.
      ────────────────────────────────────────────────────────────────────── */}
      {(state.scene === "verify-ready" || state.scene === "verify-active") && (
        <VerifyLiveFeed
          scene={state.scene}
          onPrimaryAction={() =>
            handleAction(state.scene === "verify-ready" ? "open-verification" : "confirm-incident")
          }
          onSecondaryAction={() => handleAction("monitor-only")}
        />
      )}

      {/* ── Action Modal ─────────────────────────────────────────────────────
          Confirmation dialogs for high-consequence actions. Opened by
          handleAction when the action is in the modalActions list.
      ────────────────────────────────────────────────────────────────────── */}
      {activeModal && (
        <ActionModal
          modalId={activeModal}
          state={state}
          onClose={() => setActiveModal(null)}
          onConfirm={(actionId, payload) => {
            setActiveModal(null);
            // Execute the actual state change after modal confirm
            switch (actionId) {
              case "emergency-evacuate":
                updateState((draft) => {
                  const assignments = payload?.teamAssignments ?? [];
                  const activeRoute = payload?.route ?? "Route A";
                  const primaryZone = assignments.length > 0 ? assignments[0].zoneId : (draft.selectedZoneId ?? "residential-south");

                  const next = {
                    ...draft,
                    emergencyEvacuationActive: true,
                    selectedZoneId: primaryZone,
                    selectedEntity: { type: "zone", id: primaryZone } as SelectedEntity,
                  };

                  let logMessage = `Emergency evacuation initiated. ${activeRoute} active`;
                  if (assignments.length > 0) {
                     const teamMapping = assignments.map(a => {
                       const tName = draft.groundTeams.find(t => t.id === a.teamId)?.name ?? "Team";
                       const zName = getZoneById(a.zoneId)?.shortLabel ?? "Zone";
                       return `${tName} to ${zName}`;
                     }).join(", ");
                     logMessage += `. Deployments: ${teamMapping}.`;
                  } else {
                     logMessage += `.`;
                  }

                  appendLog(next, "TALON", "Evacuation", logMessage, "caution");
                  return next;
                });
                break;
              // Mission Brief confirms — execute the drone mission after approval
              case "deploy-survey":
              case "stage-perimeter":
              case "stage-responder-guidance":
              case "stage-residential-evacuation":
              case "relay-field-intel":
              case "deploy-navigation-drone":
                updateState((draft) => applyMissionAction(draft, actionId));
                break;
              case "activate-automatic-route":
                updateState((draft) => {
                  if (draft.residentialRouteActive) return draft;
                  const next = {
                    ...draft,
                    emergencyEvacuationActive: true,
                    residentialRouteActive: true,
                    rescueProgress: { ...draft.rescueProgress, routeA: "Active", routeB: "Active" },
                  };
                  appendLog(next, "TALON", "Routing", "Residential evacuation route guidance activated. Herald drones have been deployed.", "info");
                  return next;
                });
                break;
              case "abort-mission":
                setScene("baseline");
                break;
              case "deploy-backup":
                updateState((draft) => applyMissionAction(draft, "deploy-backup"));
                break;
              case "notify-authorities":
                updateState((draft) => {
                  if (draft.authoritiesNotified) return draft;
                  const next = { ...draft, authoritiesNotified: true };
                  appendLog(next, "Operator", "Authority", "Authorities notified with the current incident scope and active protection zones.", "info");
                  return next;
                });
                break;
              case "notify-teams":
                updateState((draft) => {
                  if (draft.teamsNotified) return draft;
                  const nextTeams = draft.groundTeams.map((team) =>
                    team.id === "charlie"
                      ? { ...team, availability: "staged" as const, assignment: "Awaiting mission confirmation" }
                      : team,
                  );
                  const next = { ...draft, teamsNotified: true, groundTeams: nextTeams };
                  appendLog(next, "Operator", "Teams", "Ground teams notified and staging states updated across the field rail.", "info");
                  return next;
                });
                break;
              case "stand-down":
                updateState((draft) => {
                  const next = { ...draft, standDownComplete: true };
                  appendLog(next, "Operator", "Stand Down", "Mission formally closed. All assets recalled. Returning to passive monitoring.", "info");
                  return next;
                });
                
                setShowSituationResolved(true);
                setTimeout(() => {
                  setShowSituationResolved(false);
                  setScene("baseline");
                  if (experienceMode === "simulation") {
                    setShowEndCard(true);
                  }
                }, 8000);
                break;
            }
          }}
          onVoiceOverride={(actionId) => {
            // Voice override: apply the mission, flag as operator-overridden,
            // then transition to contain-alternate to show the override panel
            updateState((draft) => {
              const next = applyMissionAction(draft, actionId);
              const overrideNext = {
                ...next,
                overrideReason: "Operational constraint" as const,
                scene: "contain-alternate" as const,
              };
              appendLog(
                overrideNext,
                "Operator",
                "Voice Override",
                `Voice-directed override applied to ${actionId.replace(/-/g, " ")}. Plan recomputed with operator correction. Deploying revised mission.`,
                "caution"
              );
              return overrideNext;
            });
            setActiveModal(null);
          }}
        />
      )}

      {/* ── SITUATION RESOLVED DEBRIEF ───────────────────────────────────────
          Positive endpoint for the mission, contrasting with the baseline.
      ────────────────────────────────────────────────────────────────────── */}
      {showSituationResolved && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 300,
          background: T.bgBase,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 600ms ease",
        }}>
          <div style={{ fontFamily: font.mono, fontSize: 12, color: T.textMuted, letterSpacing: "0.15em", marginBottom: 16 }}>INC-2024-0847</div>
          <div style={{ fontFamily: font.sans, fontSize: 32, fontWeight: 700, color: T.teal, letterSpacing: "0.02em", marginBottom: 40 }}>SITUATION RESOLVED</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 48 }}>
            <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, textAlign: "center", width: 140 }}>
              <div style={{ fontFamily: font.sans, fontSize: 32, color: T.textPrimary, marginBottom: 4 }}>18 min</div>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, textTransform: "uppercase" }}>Time to contain</div>
            </div>
            <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, textAlign: "center", width: 140 }}>
              <div style={{ fontFamily: font.sans, fontSize: 32, color: T.textPrimary, marginBottom: 4 }}>47</div>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, textTransform: "uppercase" }}>Structures protected</div>
            </div>
            <div style={{ padding: "20px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, textAlign: "center", width: 140 }}>
              <div style={{ fontFamily: font.sans, fontSize: 32, color: T.textPrimary, marginBottom: 4 }}>3</div>
              <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, textTransform: "uppercase" }}>Operator decisions</div>
            </div>
          </div>

          <div style={{ maxWidth: 440, padding: "16px 20px", background: "rgba(45,212,160,0.05)", border: `1px solid ${T.teal}40`, borderRadius: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.teal, marginTop: 6, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: font.mono, fontSize: 10, color: T.teal, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>TALON · Final Audit Log</div>
              <div style={{ fontFamily: font.sans, fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>Incident closed. All autonomous drone assets recalled. Ground team staging returned to nominal. The complete audit trail has been filed and preserved contextually. Returning system to passive monitoring.</div>
            </div>
          </div>
        </div>
      )}

      {/* ── SCENARIO END CARD ─────────────────────────────────────────────────
          Shown at end of guided simulation, replaces situation-resolved.
      ────────────────────────────────────────────────────────────────────── */}
      {showEndCard && (
        <ScenarioEndCard
          onExplore={() => {
            setExperienceMode("free");
            setShowEndCard(false);
            setReviewDockOpen(true);
          }}
        />
      )}

      {/* ── SCENARIO BRIEF MODAL ──────────────────────────────────────────────
          Mission context before simulation starts. Not a tutorial.
      ────────────────────────────────────────────────────────────────────── */}
      {experienceMode === "brief" && (
        <ScenarioBrief
          onReady={() => {
            setEdgeCaseFired(false);
            setRescueElapsed(0);
            setScene("baseline");
            setExperienceMode("simulation");
          }}
        />
      )}

      {/* ── ENTRY SCREEN ──────────────────────────────────────────────────────
          First thing a recruiter sees. Fades out on interaction.
      ────────────────────────────────────────────────────────────────────── */}
      {experienceMode === "entry" && (
        <EntryScreen
          onBeginScenario={() => setExperienceMode("brief")}
          onExploreFree={() => {
            setScene("baseline");
            setExperienceMode("free");
            setReviewDockOpen(true);
          }}
        />
      )}
    </div>
  );
}

function RailCard({ flex, children }: { flex: number; children: ReactNode }) {
  return (
    <div
      style={{
        ...GLASS,
        flex,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function ReviewDock({
  open,
  activeScene,
  bottomOffset,
  onToggle,
  onJumpToScene,
}: {
  open: boolean;
  activeScene: SceneId;
  bottomOffset: number;
  onToggle: () => void;
  onJumpToScene: (scene: SceneId) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: bottomOffset,
        right: RIGHT_RAIL_W + SCREEN_INSET + 12,
        width: open ? 232 : "auto",
        maxHeight: open ? 420 : "auto",
        zIndex: 35,
        ...GLASS,
        borderRadius: 16,
        overflow: "hidden",
        transition: "width 180ms ease, max-height 180ms ease",
      }}
      role="complementary"
      aria-label="Prototype review dock"
    >
      <div
        style={{
          padding: open ? "10px 12px 8px" : "8px 12px",
          borderBottom: open ? `1px solid ${GI.border}` : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          gap: 8,
        }}
      >
        {open ? (
          <div>
            <div style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.textPrimary }}>Review Dock</div>
            <div style={{ fontFamily: font.sans, fontSize: 9, color: T.textMuted, marginTop: 1 }}>Prototype only · {REVIEW_SCENES.length} scenes</div>
          </div>
        ) : (
          <span style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Review</span>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? "Collapse review dock" : "Expand review dock"}
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.05)",
            color: T.textSecondary,
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {open ? "–" : "+"}
        </button>
      </div>

      {open ? (
        <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto", maxHeight: 360 }}>
          {REVIEW_SCENES.map((scene) => {
            const active = scene.id === activeScene;
            return (
              <button
                type="button"
                key={scene.id}
                onClick={() => onJumpToScene(scene.id)}
                aria-label={`Jump to ${scene.label} scene${active ? " (current)" : ""}`}
                aria-current={active ? "true" : undefined}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 10,
                  border: `1px solid ${active ? `${T.cyan}55` : "rgba(255,255,255,0.08)"}`,
                  background: active ? "rgba(0,200,255,0.14)" : "rgba(255,255,255,0.03)",
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: active ? T.cyan : T.textPrimary }}>{scene.label}</div>
                <div style={{ fontFamily: font.sans, fontSize: 9, color: T.textMuted, lineHeight: 1.35, marginTop: 3 }}>{scene.note}</div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function TopOverlay({
  title,
  subtitle,
  tone,
  meta,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  title: string;
  subtitle: string;
  tone: string;
  meta: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: NAVBAR_H + 18,
        left: "50%",
        transform: "translateX(-50%)",
        width: 560,
        zIndex: 50,
        background: "rgba(8, 12, 22, 0.88)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderRadius: 18,
        border: `1px solid ${tone}44`,
        boxShadow: "0 18px 42px rgba(0,0,0,0.36)",
        padding: "18px 18px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: tone,
            display: "inline-block",
            animation: "pulse 1.2s infinite",
          }}
        />
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 9,
            fontWeight: 700,
            color: tone,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Interrupt command
        </span>
      </div>

      <div style={{ fontFamily: font.sans, fontSize: 20, fontWeight: 700, color: T.textPrimary }}>{title}</div>
      <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.5, marginTop: 6 }}>{subtitle}</div>

      <div
        style={{
          marginTop: 14,
          padding: "10px 12px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          fontFamily: font.mono,
          fontSize: 10,
          color: tone,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {meta}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button type="button" onClick={onSecondary} style={secondaryButtonStyle}>
          {secondaryLabel}
        </button>
        <button type="button" onClick={onPrimary} style={primaryButtonStyle(tone)}>
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}

function CompactPanel({
  title,
  subtitle,
  tone,
  children,
}: {
  title: string;
  subtitle: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: NAVBAR_H + 26,
        left: "50%",
        transform: "translateX(-50%)",
        width: 440,
        zIndex: 50,
        background: "rgba(8, 12, 22, 0.90)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderRadius: 18,
        border: `1px solid ${tone}44`,
        boxShadow: "0 18px 42px rgba(0,0,0,0.36)",
        padding: "18px 18px 16px",
      }}
    >
      <div style={{ fontFamily: font.sans, fontSize: 18, fontWeight: 700, color: T.textPrimary }}>{title}</div>
      <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.5, marginTop: 6 }}>{subtitle}</div>
      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

function InfoCallout({ title, body, tone }: { title: string; body: string; tone: string }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${hexToRgba(tone, 0.2)}`,
        background: hexToRgba(tone, 0.07),
        padding: "12px 14px",
      }}
    >
      <div style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: tone }}>{title}</div>
      <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary, lineHeight: 1.45, marginTop: 5 }}>{body}</div>
    </div>
  );
}

const secondaryButtonStyle: CSSProperties = {
  flex: 1,
  padding: "11px 12px",
  borderRadius: 12,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.12)",
  color: T.textSecondary,
  fontFamily: font.sans,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  cursor: "pointer",
};

function primaryButtonStyle(tone: string): CSSProperties {
  return {
    flex: 1.15,
    padding: "11px 12px",
    borderRadius: 12,
    background: `${tone}22`,
    border: `1px solid ${tone}`,
    color: tone,
    fontFamily: font.sans,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    cursor: "pointer",
  };
}

/**
 * AlertPopup — B1
 *
 * Floats over the baseline map. The operator sees their current situation
 * (map, panels) behind this prompt. No scene swap — just a decision interrupt.
 *
 * Two choices:
 *   • Dismiss — clears alert, notifies local fire dept, back to scan
 *   • Dispatch Scout ▸ — recommended path, TALON begins investigation
 */
function AlertPopup({ onDispatch, onDismiss }: { onDispatch: () => void; onDismiss: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        top: NAVBAR_H + 24,
        left: "50%",
        transform: "translateX(-50%)",
        width: 520,
        zIndex: 60,
        background: "rgba(6, 10, 18, 0.92)",
        backdropFilter: "blur(32px) saturate(1.4)",
        WebkitBackdropFilter: "blur(32px) saturate(1.4)",
        borderRadius: 20,
        border: `1px solid ${T.amber}44`,
        boxShadow: `0 0 0 1px rgba(245,166,35,0.08), 0 24px 48px rgba(0,0,0,0.48)`,
        padding: "20px 22px 18px",
      }}
      role="alertdialog"
      aria-modal="true"
      aria-label="TALON Alert — Thermal spike detected"
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: T.amber,
            display: "inline-block",
            animation: "pulse 1.2s infinite",
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 9,
            fontWeight: 700,
            color: T.amber,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          TALON Alert · Interrupt
        </span>
        <span style={{ marginLeft: "auto", fontFamily: font.mono, fontSize: 9, color: T.textMuted }}>
          03:47:03 UTC
        </span>
      </div>

      {/* Title */}
      <div style={{ fontFamily: font.sans, fontSize: 20, fontWeight: 700, color: T.textPrimary, lineHeight: 1.2 }}>
        Thermal spike detected
      </div>
      <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.5, marginTop: 6 }}>
        Grid 4C · North Forest Belt · Confidence 40%
      </div>

      {/* TALON reasoning */}
      <div
        style={{
          marginTop: 14,
          padding: "12px 14px",
          borderRadius: 12,
          background: "rgba(245,166,35,0.07)",
          border: "1px solid rgba(245,166,35,0.16)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontFamily: font.mono, fontSize: 9, color: T.amber, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          TALON Assessment
        </div>
        <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textPrimary, lineHeight: 1.5 }}>
          Area has <strong style={{ color: T.amber }}>high ignition risk</strong> based on burn memory from prior events, current wind corridor pointing northeast, and elevated thermal delta above seasonal baseline.
        </div>
        <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted, lineHeight: 1.45 }}>
          Lidar-02 is pre-staged and ready for immediate dispatch. ETA to Grid 4C: ~14s.
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <PopupActionButton
          actionId="monitor-only"
          label="Dismiss · Notify local dept"
          tone={T.textSecondary}
          onClick={onDismiss}
          subtle
        />
        <PopupActionButton
          actionId="dispatch-scout"
          label="Dispatch Lidar-02"
          tone={T.amber}
          onClick={onDispatch}
          annotation="Recommended"
          emphasis
        />
      </div>
    </div>
  );
}

function PopupActionButton({
  actionId,
  label,
  tone,
  onClick,
  subtle,
  emphasis,
  annotation,
  disabled,
  compact,
}: {
  actionId: QuickActionId;
  label: string;
  tone: string;
  onClick?: () => void;
  subtle?: boolean;
  emphasis?: boolean;
  annotation?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        flex: compact ? "0 0 auto" : emphasis ? 1.15 : 1,
        minWidth: compact ? 0 : 164,
        padding: compact ? "8px 12px" : "11px 14px",
        borderRadius: compact ? 10 : 12,
        border: `1px solid ${
          disabled ? "rgba(255,255,255,0.1)" : subtle ? "rgba(255,255,255,0.12)" : `${tone}${emphasis ? "" : ""}`
        }`,
        background: disabled
          ? "rgba(255,255,255,0.04)"
          : subtle
            ? hovered
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.05)"
            : hovered
              ? hexToRgba(tone, emphasis ? 0.22 : 0.16)
              : hexToRgba(tone, emphasis ? 0.16 : 0.1),
        color: disabled ? T.textMuted : subtle ? T.textSecondary : tone,
        fontFamily: font.sans,
        fontSize: compact ? 10 : 11,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        cursor: disabled ? "default" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 8 : 9,
        transform: pressed ? "translateY(1px) scale(0.985)" : hovered && !disabled ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 120ms ease, background 120ms ease, border-color 120ms ease",
        opacity: disabled ? 0.64 : 1,
      }}
    >
      <ActionGlyph actionId={actionId} color={disabled ? T.textMuted : subtle ? T.textSecondary : tone} size={compact ? 15 : 16} />
      <span>{label}</span>
      {annotation ? (
        <span style={{ opacity: 0.72, fontFamily: font.mono, fontSize: compact ? 9 : 10, letterSpacing: "0.04em" }}>
          {annotation}
        </span>
      ) : null}
    </button>
  );
}

/**
 * InvestigationStrip — B2
 *
 * Investigation pending is now part of the right rail stack instead of a
 * floating overlay. This keeps the scout status in the same reading flow as
 * priorities and ground teams.
 */
function InvestigationStrip({ investigationElapsed }: { investigationElapsed: number }) {
  return (
    <div
      style={{
        height: "100%",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 12,
      }}
      role="status"
      aria-label="Lidar-02 investigation in progress"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 600, color: T.textPrimary }}>
            Lidar-02 en route
          </div>
          <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted, marginTop: 2 }}>
            to Grid 4C
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            flexShrink: 0,
            fontFamily: font.mono,
            fontSize: 9,
            color: T.cyan,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: T.cyan,
              animation: "pulse 1.2s infinite",
            }}
            aria-hidden="true"
          />
          <span>Grid 4C</span>
        </div>
      </div>

      <div
        style={{
          borderTop: `1px solid ${GI.dividerBg}`,
          paddingTop: 10,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 10,
          alignItems: "center",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textSecondary }}>
            Thermal + LiDAR · ETA {Math.max(0, 10 - investigationElapsed)} sec
          </div>
          <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted, marginTop: 2 }}>
            {investigationElapsed >= 10 ? "Lidar-02 is on station. Ready." : "Verification unlocks when Lidar-02 is on station"}
          </div>
        </div>
        <div
          style={{
            padding: "5px 10px",
            borderRadius: 8,
            background: investigationElapsed >= 10 ? "rgba(245,166,35,0.12)" : "rgba(0,200,255,0.08)",
            border: `1px solid ${investigationElapsed >= 10 ? "rgba(245,166,35,0.3)" : "rgba(0,200,255,0.18)"}`,
            fontFamily: font.mono,
            fontSize: 9,
            color: investigationElapsed >= 10 ? T.amber : T.cyan,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {investigationElapsed >= 10 ? "On Station" : "Connecting"}
        </div>
      </div>
    </div>
  );
}

/**
 * VerifyLiveFeed — B3
 *
 * In the Verify phase, before the TALON spatial map is ready, the center area
 * shows the drone's live camera feed. This is a placeholder component that
 * simulates what the live feed would look like.
 *
 * In verify-active, the map begins to overlay (in the real product, this
 * transitions automatically when TALON confidence crosses the threshold).
 */
function VerifyLiveFeed({
  scene,
  onPrimaryAction,
  onSecondaryAction,
}: {
  scene: "verify-ready" | "verify-active";
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) {
  const mapLoaded = scene === "verify-active";
  const primaryAction = scene === "verify-ready" ? "open-verification" : "confirm-incident";
  const primaryLabel = scene === "verify-ready" ? "Open verification" : "Confirm active incident";
  const secondaryLabel = scene === "verify-ready" ? "Hold in background" : "Monitor only";

  return (
    <div
      style={{
        position: "absolute",
        top: PANEL_TOP,
        left: LEFT_RAIL_W + SCREEN_INSET + 18,
        right: RIGHT_RAIL_W + SCREEN_INSET + 18,
        height: Math.round((1080 - NAVBAR_H - SCREEN_INSET * 2 - 18 * 2) * 0.62),
        zIndex: 25,
        borderRadius: 16,
        overflow: "hidden",
        border: mapLoaded
          ? `1px solid rgba(255,255,255,0.28)`
          : `1.5px solid ${T.cyan}BB`,
        background: "#050810",
        transition: "opacity 400ms ease",
        opacity: 1,
      }}
      aria-label={mapLoaded ? "Drone feed (map overlay active)" : "Drone live feed — Scout-02 · Grid 4C"}
    >
      {/* Scanline texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,200,255,0.018) 3px, rgba(0,200,255,0.018) 4px)",
          pointerEvents: "none",
          zIndex: 2,
        }}
        aria-hidden="true"
      />

      {/* Drone Footage */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <img
          src={droneThermalFeed}
          alt="Drone thermal feed"
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(5,8,16,0.5) 0%, rgba(5,8,16,0.1) 20%, rgba(5,8,16,0.3) 80%, rgba(5,8,16,0.8) 100%)" }} />

        {/* Tactical Fire Bounding Model */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="400" height="300" viewBox="0 0 400 300" style={{ transform: "rotate(-10deg) translate(-20px, 40px)", filter: "drop-shadow(0 0 12px rgba(229,83,60,0.6))" }}>
            <polygon 
              points="150,50 250,80 320,180 280,260 120,240 60,150" 
              fill={mapLoaded ? "rgba(229,83,60,0.15)" : "rgba(229,83,60,0.05)"}
              stroke={T.red} 
              strokeWidth={mapLoaded ? "2.5" : "1.5"}
              strokeDasharray={mapLoaded ? "none" : "8 8"}
              style={{ animation: mapLoaded ? "none" : "pulse 2s infinite", transition: "all 0.5s ease" }}
            />
            {mapLoaded && (
               <polygon 
                 points="130,120 180,110 220,160 160,200" 
                 fill="rgba(255,107,74,0.3)" 
               />
            )}
            {mapLoaded && (
              <text x="325" y="170" fill={T.red} fontSize="12" fontFamily={font.mono} letterSpacing="0.05em">THERMAL_CORE</text>
            )}
          </svg>
        </div>
      </div>

      {/* Feed content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: `2px solid ${T.cyan}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: T.red,
              animation: "pulse 1.2s infinite",
            }}
            aria-hidden="true"
          />
        </div>
        <div style={{ fontFamily: font.mono, fontSize: 11, color: T.cyan, letterSpacing: "0.1em" }}>
          ◉ LIVE — Lidar-02 · Grid 4C
        </div>
        <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted }}>
          Thermal + HD vis · 24 fps · {scene === "verify-active" ? "TALON model building..." : "Feed stable"}
        </div>
      </div>

      {/* HUD frame corners */}
      {[
        { top: 12, left: 12, borderTop: "2px solid", borderLeft: "2px solid" },
        { top: 12, right: 12, borderTop: "2px solid", borderRight: "2px solid" },
        { bottom: 12, left: 12, borderBottom: "2px solid", borderLeft: "2px solid" },
        { bottom: 12, right: 12, borderBottom: "2px solid", borderRight: "2px solid" },
      ].map((corner, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 16,
            height: 16,
            borderColor: `${T.cyan}44`,
            ...corner,
          }}
          aria-hidden="true"
        />
      ))}

      {/* Top metadata bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "8px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          zIndex: 3,
        }}
      >
        <span style={{ fontFamily: font.mono, fontSize: 9, color: T.cyan, letterSpacing: "0.08em" }}>
          LIDAR-02 · THERMAL/LiDAR · 37.8821°N 122.4194°W
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {mapLoaded && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(245,166,35,0.12)",
              border: `1px solid rgba(245,166,35,0.3)`,
              padding: "2px 6px",
              borderRadius: 3,
            }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.amber, animation: "pulse 2s infinite" }} />
              <span style={{ fontFamily: font.mono, fontSize: 9, color: T.amber, fontWeight: 700, letterSpacing: "0.05em" }}>
                CONFIDENCE: 78%
              </span>
            </div>
          )}
          <span style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted }}>
            03:48:14 UTC · {mapLoaded ? "TALON MAP BUILDING" : "FEED STABLE"}
          </span>
        </div>
      </div>



      <div
        style={{
          position: "absolute",
          right: 14,
          bottom: mapLoaded ? 38 : 14,
          display: "flex",
          gap: 8,
          zIndex: 4,
        }}
      >
        <PopupActionButton
          actionId="monitor-only"
          label={secondaryLabel}
          tone={T.textSecondary}
          subtle
          compact
          onClick={onSecondaryAction}
        />
        <PopupActionButton
          actionId={primaryAction}
          label={primaryLabel}
          tone={T.amber}
          compact
          emphasis
          onClick={onPrimaryAction}
        />
      </div>
    </div>
  );
}


function stripDerived(state: ShellState): ShellDraft {
  const { activePriorities, quickActionStates, actionSurface, ...draft } = state;
  return draft;
}

function syncState(draft: ShellDraft, investigationElapsed: number): ShellState {
  const actionSurface = deriveQuickActions(draft, investigationElapsed);
  const quickActionStates = [...actionSurface.primary, ...actionSurface.secondary];
  const activePriorities = derivePriorities(draft, quickActionStates);
  return {
    ...draft,
    quickActionStates,
    actionSurface,
    activePriorities,
  };
}

function createSceneState(scene: SceneId, investigationElapsed: number): ShellState {
  const base: ShellDraft = {
    mode: sceneToMode(scene),
    scene,
    surfaceMode: "map",
    selectedEntity: null,
    selectedZoneId: null,
    incidentStatus: "monitoring",
    planVariant: scene === "contain-alternate" ? "alternate" : "recommended",
    exceptionState: scene === "rescue-signal-degraded" ? "signal-degraded" : "none",
    drones: createDroneRoster(),
    groundTeams: createGroundTeams(),
    activityLog: createActivityLog(scene),
    highlightedZoneIds: [],
    residentialRouteActive: false,
    responderRouteActive: false,
    authoritiesNotified: false,
    teamsNotified: false,
    emergencyEvacuationActive: false,
    backupDeployed: false,
    standDownComplete: false,
    acknowledgedPriorityIds: [],
    overrideReason: scene === "contain-alternate" ? "Operational constraint" : "Incomplete data",
    rescueProgress: createRescueProgress(),
  };

  if (scene === "alert-command") {
    base.incidentStatus = "alerted";
    base.highlightedZoneIds = ["forest-north"];
  }

  if (scene === "investigation-pending") {
    base.incidentStatus = "investigating";
    base.selectedEntity = { type: "anomaly", id: ANOMALY.id };
    base.selectedZoneId = ANOMALY.zoneId;
    assignDroneToMission(base, "investigation", "forest-north");
  }

  if (scene === "verify-ready" || scene === "verify-active") {
    base.mode = "verify";
    base.incidentStatus = "assessment-ready";
    base.selectedEntity = { type: "anomaly", id: ANOMALY.id };
    base.selectedZoneId = ANOMALY.zoneId;
    const assignment = assignDroneToMission(base, "investigation", "forest-north");
    if (assignment?.drone) {
      assignment.drone.x = ANOMALY.x + 24;
      assignment.drone.y = ANOMALY.y - 20;
      assignment.drone.status = "assigned";
      assignment.drone.route = "On-station visual and LiDAR corroboration";
      assignment.drone.role = "Incident verification";
    }
  }

  if (scene === "contain-recommended" || scene === "contain-alternate" || scene === "contain-degraded") {
    base.mode = "contain";
    base.incidentStatus = "confirmed";
    base.selectedEntity = { type: "zone", id: INCIDENT.activeZoneId };
    base.selectedZoneId = INCIDENT.activeZoneId;
    base.highlightedZoneIds = ["residential-south"];
    const assignment = assignDroneToMission(base, "investigation", "forest-north");
    if (assignment?.drone) {
      assignment.drone.x = ANOMALY.x + 24;
      assignment.drone.y = ANOMALY.y - 20;
      assignment.drone.status = "assigned";
      assignment.drone.route = "Holding on verified incident";
      assignment.drone.role = "Incident verification";
    }
  }

  if (scene === "rescue-nominal" || scene === "rescue-signal-degraded") {
    base.mode = "rescue";
    base.incidentStatus = "rescue-active";
    base.selectedEntity = { type: "zone", id: "residential-south" };
    base.selectedZoneId = "residential-south";
    base.highlightedZoneIds = ["forest-north", "residential-south"];
    // Pre-evac: operator has not yet confirmed evacuation
    base.authoritiesNotified = false;
    base.teamsNotified = false;
    base.emergencyEvacuationActive = false;
    base.residentialRouteActive = false;
    base.responderRouteActive = false;
    base.groundTeams = base.groundTeams.map((team) =>
      team.id === "charlie"
        ? { ...team, availability: "staged", assignment: "Medical and route support" }
        : team,
    );
    assignDroneToMission(base, "perimeter-monitor", "forest-north");

    if (scene === "rescue-signal-degraded") {
      base.authoritiesNotified = true;
      base.teamsNotified = true;
      base.emergencyEvacuationActive = true;
      base.residentialRouteActive = true;
      base.responderRouteActive = true;
      assignDroneToMission(base, "prepare-residential-evacuation", "residential-south");
      assignDroneToMission(base, "guide-emergency-personnel", "buffer-east");
      const degradedDrone = base.drones.find((drone) => drone.assignedMission === "prepare-residential-evacuation");
      if (degradedDrone) {
        degradedDrone.status = "signal-degraded";
        degradedDrone.signal = 46;
        degradedDrone.route = "Autonomous reroute toward stronger relay corridor";
      }
    }
  }

  // ── Rescue: Battery Critical ────────────────────────────────────────────
  if (scene === "rescue-battery-critical") {
    base.mode = "rescue";
    base.incidentStatus = "rescue-active";
    base.selectedEntity = { type: "zone", id: "residential-south" };
    base.selectedZoneId = "residential-south";
    base.highlightedZoneIds = ["forest-north", "residential-south"];
    base.authoritiesNotified = true;
    base.teamsNotified = true;
    base.emergencyEvacuationActive = true;
    base.residentialRouteActive = true;
    base.responderRouteActive = true;
    assignDroneToMission(base, "perimeter-monitor", "forest-north");
    assignDroneToMission(base, "prepare-residential-evacuation", "residential-south");
    assignDroneToMission(base, "guide-emergency-personnel", "buffer-east");
    // Mark the perimeter drone as battery-critical (TALON is initiating handoff)
    const criticalDrone = base.drones.find((drone) => drone.assignedMission === "perimeter-monitor");
    if (criticalDrone) {
      criticalDrone.battery = 14;
      criticalDrone.status = "en-route"; // returning to base
      criticalDrone.note = "Recall in progress — returning to base";
      criticalDrone.route = "RTB (Return to Base) — Autonomous recall";
    }
    // Mark a substitute drone as picking up the mission
    const substitutePool = base.drones.filter((d) => d.status === "available" && d.droneClass === "surveillance");
    if (substitutePool[0]) {
      substitutePool[0].status = "en-route";
      substitutePool[0].assignedMission = "perimeter-monitor";
      substitutePool[0].role = "Perimeter monitor (handoff)";
      substitutePool[0].route = "En route — taking over perimeter hold";
    }
  }

  // ── Contain: Satellite Feed Loss ────────────────────────────────────
  if (scene === "satellite-feed-loss") {
    base.mode = "contain";
    base.incidentStatus = "confirmed";
    base.selectedEntity = { type: "zone", id: INCIDENT.activeZoneId };
    base.selectedZoneId = INCIDENT.activeZoneId;
    base.highlightedZoneIds = ["residential-south"];
    const assignment = assignDroneToMission(base, "investigation", "forest-north");
    if (assignment?.drone) {
      assignment.drone.x = ANOMALY.x + 24;
      assignment.drone.y = ANOMALY.y - 20;
      assignment.drone.status = "assigned";
      assignment.drone.role = "Primary intelligence source (satellite offline)";
    }
  }

  // ── Contain: Network Degraded ───────────────────────────────────────
  if (scene === "network-degraded") {
    base.mode = "contain";
    base.incidentStatus = "confirmed";
    base.selectedEntity = { type: "zone", id: INCIDENT.activeZoneId };
    base.selectedZoneId = INCIDENT.activeZoneId;
    base.highlightedZoneIds = ["residential-south"];
    assignDroneToMission(base, "investigation", "forest-north");
    // All drones show slightly degraded signal as a network ripple
    base.drones = base.drones.map((d) => ({ ...d, signal: Math.max(d.signal - 18, 22) }));
  }

  // ── Infrastructure Total Loss ─────────────────────────────────────────
  // Shown as a full-screen takeover; base mode doesn't matter much
  // but we set rescue so the underlying scene is realistic
  if (scene === "infrastructure-total-loss") {
    base.mode = "rescue";
    base.incidentStatus = "rescue-active";
  }

  return syncState(base, investigationElapsed);
}

function sceneToMode(scene: SceneId): OperationalMode {
  if (scene === "verify-ready" || scene === "verify-active") {
    return "verify";
  }
  if (scene === "contain-recommended" || scene === "contain-alternate" || scene === "contain-degraded" || scene === "satellite-feed-loss" || scene === "network-degraded") {
    return "contain";
  }
  if (scene === "rescue-nominal" || scene === "rescue-signal-degraded" || scene === "rescue-battery-critical") {
    return "rescue";
  }
  if (scene === "infrastructure-total-loss") {
    // Infrastructure loss inherits the rescue mode visually
    return "rescue";
  }
  return "scan";
}

function deriveQuickActions(draft: ShellDraft, investigationElapsed: number): ActionSurface {
  const flat = (primary: QuickActionState[], secondary: QuickActionState[] = []): ActionSurface => ({
    primary,
    secondary,
    hasSplit: secondary.length > 0,
  });

  const missionByZone = (mission: DroneMissionType) =>
    Boolean(draft.selectedZoneId && draft.drones.some((drone) => drone.assignedMission === mission && drone.zoneId === draft.selectedZoneId));
  const selectedZone = getZoneById(draft.selectedZoneId);
  const coverageReady = hasMission(draft, "survey-zone") || hasMission(draft, "perimeter-monitor");
  const guidanceReady = hasMission(draft, "guide-emergency-personnel") || hasMission(draft, "prepare-residential-evacuation");
  const minimumContainmentReady = coverageReady && guidanceReady && draft.teamsNotified;

  const mk = (
    id: QuickActionId,
    label: string,
    status: QuickActionState["status"],
    description: string,
    tone: string,
    requiresZone?: boolean,
  ): QuickActionState => ({ id, label, status, description, tone, requiresZone });

  switch (draft.scene) {
    // ── Scan scenes: popups own the actions, not the global bar ──────────
    case "baseline":
      return flat([]);

    case "alert-command":
      return flat([
        mk("dispatch-scout", "Dispatch Lidar-02", "recommended", "Launch investigation drone toward Grid 4C.", T.amber),
        mk("monitor-only", "Dismiss", "available", "Clear the interrupt and return to quiet watch.", T.textSecondary),
      ]);

    case "investigation-pending": {
      const arrived = investigationElapsed >= 5;
      return flat([
        mk(
          "open-verification",
          "Open verification",
          arrived ? "recommended" : "disabled",
          arrived ? "Lidar-02 on station. Ready for assessment." : `Available when Lidar-02 reaches site (ETA: ${5 - investigationElapsed}s)`,
          arrived ? T.amber : T.textSecondary
        )
      ]);
    }

    // ── Verify scenes: single row, no split ───────────────────────────────
    case "verify-ready":
      return flat([
        mk("open-verification", "Open verification", "recommended", "Bring the corroborated incident into assessment.", T.amber),
        mk("monitor-only", "Hold in background", "available", "Return to background watch.", T.textSecondary),
      ]);

    case "verify-active":
      return flat([
        mk("confirm-incident", "Confirm active incident", "recommended", "Escalate into containment planning.", T.amber),
        mk("monitor-only", "Monitor only", "available", "Keep under observation without escalating.", T.textSecondary),
      ]);

    // ── Contain scenes: 5 primary staging tiles + 3 secondary ─────────────
    case "contain-recommended":
    case "contain-alternate":
    case "contain-degraded": {
      const zoneRequired = !draft.selectedZoneId;
      const surveyRecommended = selectedZone?.category !== "residential";
      const perimeterRecommended = selectedZone?.category === "forest" || selectedZone?.category === "buffer";
      const responderRecommended = selectedZone?.category === "buffer";
      const evacRecommended = selectedZone?.category === "residential";
      const relayRecommended = selectedZone?.category === "buffer";

      const primaryContain = [
        mk("deploy-survey", "Deploy survey",
          zoneRequired ? "disabled" : missionByZone("survey-zone") ? "complete" : surveyRecommended ? "recommended" : "available",
          "TALON assigns a surveillance drone to expand coverage.", T.cyan, true),
        mk("stage-perimeter", "Stage perimeter",
          zoneRequired ? "disabled" : missionByZone("perimeter-monitor") ? "complete" : perimeterRecommended ? "recommended" : "available",
          "Thermal + LiDAR drone monitors the active fire edge.", T.red, true),
        mk("stage-responder-guidance", "Guide responders",
          zoneRequired ? "disabled" : missionByZone("guide-emergency-personnel") ? "complete" : responderRecommended ? "recommended" : "available",
          "Ingress guidance and live relay support for field personnel.", T.yellow, true),
        mk("stage-residential-evacuation", "Prepare evacuation",
          zoneRequired ? "disabled" : missionByZone("prepare-residential-evacuation") ? "complete" : evacRecommended ? "recommended" : "available",
          "Civilian-guidance drone with speakers and lighting.", T.fire, true),
        mk("relay-field-intel", "Relay field intel",
          zoneRequired ? "disabled" : missionByZone("relay-field-intel") ? "complete" : relayRecommended ? "recommended" : "available",
          "Strengthen command visibility across the selected zone.", T.cyan, true),
      ];

      const secondaryContain = [
        mk("notify-authorities", "Notify auth.", draft.authoritiesNotified ? "complete" : "available",
          "Share incident scope with fire management and dispatch.", T.textSecondary),
        mk("notify-teams", "Notify teams", draft.teamsNotified ? "complete" : "available",
          "Alert and stage ground teams.", T.textSecondary),
        mk("stand-down", "Stand down", "available",
          "Formally close the operation if threat is resolved.", T.teal),
        mk("authorize-containment", "Authorize",
          minimumContainmentReady ? "recommended" : "disabled",
          "Hold to authorize once minimum staging is complete.", T.red),
      ];

      return flat(primaryContain, secondaryContain);
    }

    // ── Rescue scenes ──────────────────────────────────────────────────────
    case "rescue-nominal":
    case "rescue-battery-critical":
    case "rescue-signal-degraded": {
      if (!draft.emergencyEvacuationActive) {
        const primaryPreEvac = [
          mk("emergency-evacuate", "Emergency evacuate", "recommended",
            "Activate residential evacuation for the projected path.", T.fire),
          mk("notify-authorities", "Notify auth.", draft.authoritiesNotified ? "complete" : "available",
            "Notify authorities of the active rescue scope.", T.textSecondary),
          mk("notify-teams", "Notify teams", draft.teamsNotified ? "complete" : "available",
            "Alert and brief all ground teams.", T.textSecondary),
          mk("abort-mission", "Abort mission", "available",
            "Return the prototype to baseline.", T.red),
        ];
        return flat(primaryPreEvac);
      }

      const primaryPostEvac: QuickActionState[] = [
        mk("activate-automatic-route", "Residential evac drone",
          draft.residentialRouteActive ? "complete" : "recommended",
          "Drone-guided egress path — speakers + lighting for residents.", T.cyan),
        mk("deploy-navigation-drone", "Guide personnel",
          draft.responderRouteActive ? "complete" : "recommended",
          "Responder-guidance drone via safest ingress corridor.", T.yellow),
        mk("notify-authorities", "Notify auth.", draft.authoritiesNotified ? "complete" : "available",
          "Confirm rescue scope with authorities.", T.textSecondary),
        mk("notify-teams", "Notify teams", draft.teamsNotified ? "complete" : "available",
          "Reconfirm field team staging readiness.", T.textSecondary),
      ];

      if (draft.exceptionState === "signal-degraded") {
        primaryPostEvac.splice(
          2,
          0,
          mk("deploy-backup", "Deploy backup",
            draft.backupDeployed ? "complete" : "recommended",
            "Assign support asset to stabilize field coverage.", T.amber),
        );
      }

      const secondaryPostEvac = [
        mk("stand-down", "Stand down", "available",
          "Formally close the mission and return to passive monitoring.", T.teal),
        mk("abort-mission", "Abort mission", "available",
          "Immediately terminate all mission parameters.", T.red),
      ];

      return flat(primaryPostEvac, secondaryPostEvac);
    }

    // ── Edge Case / Failure Scenes: all expose minimal action bar ─────────
    case "satellite-feed-loss":
    case "network-degraded":
      return flat([
        mk("authorize-containment", "Authorize", "disabled",
          "Satellite feed required before authorization.", T.red),
      ]);
    case "infrastructure-total-loss":
      return flat([]);

    default:
      return flat([]);
  }
}

function derivePriorities(draft: ShellDraft, actions: QuickActionState[]): PriorityRiskItem[] {
  const statusOf = (actionId: QuickActionId) => actions.find((action) => action.id === actionId)?.status;
  const actionToPriority = (actionId: QuickActionId): PriorityRiskItem["status"] => {
    const status = statusOf(actionId);
    if (status === "complete") return "complete";
    if (status === "in-progress") return "in-progress";
    if (status === "recommended") return "recommended";
    return "pending";
  };

  if (draft.scene === "baseline") {
    return [
      {
        id: "baseline-watch",
        areaLabel: "Forest Zone",
        zoneId: "forest-north",
        title: "Grid 4C remains the highest historical fire pocket",
        severity: "caution",
        rationale: "Burn memory and current wind keep the north forest under quiet watch.",
        nextStep: "Allow TALON triage to continue until corroboration crosses threshold.",
        status: "pending",
      },
      {
        id: "baseline-buffer",
        areaLabel: "Buffer Zone",
        zoneId: "buffer-east",
        title: "Buffer corridor remains suitable for future ingress",
        severity: "info",
        rationale: "No immediate obstruction is present in the eastern corridor.",
        nextStep: "Keep the transit lane clear for future responder guidance.",
        status: "complete",
      },
      {
        id: "baseline-residential",
        areaLabel: "Residential Zone",
        zoneId: "residential-south",
        title: "Residential exits remain uncongested",
        severity: "safe",
        rationale: "Road telemetry shows both primary routes are open and clear.",
        nextStep: "Maintain passive watch only.",
        status: "complete",
      },
    ];
  }

  if (draft.mode === "scan" || draft.mode === "verify") {
    return [
      {
        id: "verify-evidence",
        areaLabel: "Grid 4C",
        zoneId: "forest-north",
        title: draft.scene === "investigation-pending" ? "On-site corroboration is still building" : "Evidence is now sufficient for operator assessment",
        severity: "caution",
        rationale:
          draft.scene === "investigation-pending"
            ? "Thermal and satellite sources are aligned while Scout-02 closes the final approach."
            : "Thermal, satellite, and on-site visual corroboration all support an active incident.",
        nextStep: draft.scene === "verify-active" ? "Confirm the incident or keep it under monitor-only watch." : "Wait for the assessment interrupt or open verification.",
        status: draft.scene === "verify-active" ? actionToPriority("confirm-incident") : "in-progress",
        linkedActionId: draft.scene === "verify-active" ? "confirm-incident" : "open-verification",
      },
      {
        id: "verify-buffer",
        areaLabel: "Buffer Zone",
        zoneId: "buffer-east",
        title: "Buffer corridor will become the likely ingress lane",
        severity: "info",
        rationale: "Wind and road alignment make the eastern corridor the cleanest responder path.",
        nextStep: "Prepare this corridor for responder guidance if the incident is confirmed.",
        status: "pending",
      },
      {
        id: "verify-residential",
        areaLabel: "Residential Zone",
        zoneId: "residential-south",
        title: "Residential consequences depend on the escalation decision",
        severity: "caution",
        rationale: "47 structures remain inside the current 30-minute projection.",
        nextStep: "Escalate into protection if the evidence supports active containment.",
        status: "pending",
      },
    ];
  }

  if (draft.mode === "contain") {
    return [
      {
        id: "contain-coverage",
        areaLabel: getZoneById(draft.selectedZoneId)?.shortLabel ?? "Zone focus",
        zoneId: draft.selectedZoneId ?? undefined,
        title: "Expand aerial coverage in the selected zone",
        severity: "danger",
        rationale: "TALON expands aerial truth beyond the original verification footprint before containment is authorized.",
        nextStep: "Deploy surveillance or perimeter drones into the active zone.",
        status:
          actionToPriority("deploy-survey") === "complete" || actionToPriority("stage-perimeter") === "complete"
            ? "in-progress"
            : actionToPriority("deploy-survey"),
        linkedActionId: "deploy-survey",
      },
      {
        id: "contain-guidance",
        areaLabel: "Buffer Corridor",
        zoneId: "buffer-east",
        title: "Prepare responder guidance and field relay support",
        severity: "caution",
        rationale: "Personnel need a guided ingress route and live intel corridor before containment is authorized.",
        nextStep: "Stage responder guidance and field relay assets in the buffer corridor.",
        status:
          actionToPriority("stage-responder-guidance") === "complete" || actionToPriority("relay-field-intel") === "complete"
            ? "in-progress"
            : actionToPriority("stage-responder-guidance"),
        linkedActionId: "stage-responder-guidance",
      },
      {
        id: "contain-residential",
        areaLabel: "Residential Zone",
        zoneId: "residential-south",
        title: "Prepare residential evacuation readiness",
        severity: "danger",
        rationale: "47 structures remain inside the projected 30-minute path and need route-ready support.",
        nextStep: "Stage the evacuation-guidance drone and notify the relevant teams.",
        status:
          actionToPriority("stage-residential-evacuation") === "complete" && actionToPriority("notify-teams") === "complete"
            ? "in-progress"
            : actionToPriority("stage-residential-evacuation"),
        linkedActionId: "stage-residential-evacuation",
      },
    ];
  }

  return [
    {
      id: "rescue-evacuation",
      areaLabel: "Residential Zone",
      zoneId: "residential-south",
      title: "Residential evacuation path remains the top human priority",
      severity: "danger",
      rationale: "The rescue phase is active and the residential zone remains inside the projected spread path.",
      nextStep: "Activate or maintain automatic routes and evacuation guidance.",
      status:
        actionToPriority("activate-automatic-route") === "complete" && actionToPriority("emergency-evacuate") === "complete"
          ? "in-progress"
          : actionToPriority("emergency-evacuate"),
      linkedActionId: "activate-automatic-route",
    },
    {
      id: "rescue-responders",
      areaLabel: "Buffer Corridor",
      zoneId: "buffer-east",
      title: draft.exceptionState === "signal-degraded" ? "Responder support must stay intact through the signal exception" : "Emergency-personnel guidance remains active",
      severity: draft.exceptionState === "signal-degraded" ? "caution" : "info",
      rationale:
        draft.exceptionState === "signal-degraded"
          ? "One active drone has degraded signal and the TALON is already rerouting to preserve guidance coverage."
          : "Ingress safety depends on keeping the corridor visible and continuously updated.",
      nextStep: draft.exceptionState === "signal-degraded" ? "Acknowledge the exception and deploy backup if needed." : "Maintain responder guidance coverage.",
      status: draft.exceptionState === "signal-degraded" ? actionToPriority("deploy-backup") : actionToPriority("deploy-navigation-drone"),
      linkedActionId: draft.exceptionState === "signal-degraded" ? "deploy-backup" : "deploy-navigation-drone",
      acknowledged: draft.acknowledgedPriorityIds.includes("rescue-responders"),
    },
    {
      id: "signal-degradation",
      areaLabel: "Operations",
      title: draft.exceptionState === "signal-degraded" ? "Signal degradation is contained but still active" : "Field coordination remains stable",
      severity: draft.exceptionState === "signal-degraded" ? "caution" : "safe",
      rationale:
        draft.exceptionState === "signal-degraded"
          ? "The system has preserved execution continuity and is waiting for operator acknowledgement."
          : "Authorities, teams, and live routes remain synchronized.",
      nextStep: draft.exceptionState === "signal-degraded" ? "Acknowledge the exception while rescue execution continues." : "Continue supervising exceptions only.",
      status: draft.exceptionState === "signal-degraded" ? "in-progress" : "complete",
      linkedActionId: draft.exceptionState === "signal-degraded" ? "acknowledge-exception" : undefined,
      acknowledged: draft.acknowledgedPriorityIds.includes("signal-degradation"),
    },
  ];
}

function hasMission(draft: ShellDraft, mission: DroneMissionType) {
  return draft.drones.some((drone) => drone.assignedMission === mission);
}

function preferredClassForMission(mission: DroneMissionType): DroneClass {
  switch (mission) {
    case "survey-zone":
      return "surveillance";
    case "perimeter-monitor":
    case "investigation":
      return "thermal-lidar";
    case "guide-emergency-personnel":
    case "relay-field-intel":
      return "guidance-relay";
    case "prepare-residential-evacuation":
    case "automatic-route":
      return "evacuation-guidance";
    case "backup-support":
      return "multi-role";
    case "patrol":
      return "surveillance";
  }
}

function roleForMission(mission: DroneMissionType) {
  switch (mission) {
    case "investigation":
      return "Incident verification";
    case "survey-zone":
      return "Zone survey";
    case "perimeter-monitor":
      return "Perimeter monitor";
    case "guide-emergency-personnel":
      return "Responder guidance";
    case "prepare-residential-evacuation":
      return "Evacuation staging";
    case "relay-field-intel":
      return "Field intel relay";
    case "automatic-route":
      return "Route guidance";
    case "backup-support":
      return "Backup support";
    case "patrol":
      return "Patrol";
  }
}

function routeForMission(zoneId: string, mission: DroneMissionType) {
  return MISSION_ANCHORS[zoneId]?.[mission]?.route ?? `${roleForMission(mission)} anchor`;
}

function coordinatesForMission(zoneId: string, mission: DroneMissionType) {
  const anchor = MISSION_ANCHORS[zoneId]?.[mission];
  if (anchor) {
    return { x: anchor.x, y: anchor.y };
  }
  const zone = getZoneById(zoneId);
  return {
    x: zone?.center.x ?? ANOMALY.x,
    y: zone?.center.y ?? ANOMALY.y,
  };
}

function assignDroneToMission(draft: ShellDraft, mission: DroneMissionType, zoneId: string) {
  const existing = draft.drones.find((drone) => drone.assignedMission === mission && drone.zoneId === zoneId);
  if (existing) {
    return { drone: existing, fallback: false };
  }

  const availablePool = draft.drones.filter(
    (drone) => drone.status === "available" || drone.status === "holding" || drone.assignedMission === "patrol" || drone.assignedMission === undefined,
  );

  let selected = undefined;
  if (draft.selectedEntity?.type === "drone") {
    selected = availablePool.find((d) => d.id === draft.selectedEntity?.id);
  }

  let isFallback = false;
  if (!selected) {
    const preferredClass = preferredClassForMission(mission);
    const preferred = availablePool.find((drone) => drone.droneClass === preferredClass);
    const fallback = availablePool.find((drone) => drone.droneClass === "multi-role");
    selected = preferred ?? fallback ?? availablePool[0];
    isFallback = !preferred && Boolean(fallback);
  }

  if (!selected) {
    return null;
  }

  const coords = coordinatesForMission(zoneId, mission);
  selected.status = mission === "investigation" ? "en-route" : "assigned";
  selected.assignedMission = mission;
  selected.zoneId = zoneId;
  selected.role = roleForMission(mission);
  selected.route = routeForMission(zoneId, mission);
  selected.x = coords.x;
  selected.y = coords.y;
  selected.eta = mission === "investigation" ? "00:43" : "Live";
  selected.signal = mission === "investigation" ? selected.signal : Math.max(selected.signal, 78);

  return { drone: selected, fallback: isFallback };
}

function applyMissionAction(draft: ShellDraft, actionId: QuickActionId): ShellDraft {
  const zoneId =
    draft.selectedZoneId ??
    (actionId === "deploy-navigation-drone" ? "buffer-east" : actionId === "deploy-backup" ? "residential-south" : null);
  if (!zoneId) {
    return draft;
  }

  const missionMap: Partial<Record<QuickActionId, DroneMissionType>> = {
    "deploy-survey": "survey-zone",
    "stage-perimeter": "perimeter-monitor",
    "stage-responder-guidance": "guide-emergency-personnel",
    "stage-residential-evacuation": "prepare-residential-evacuation",
    "relay-field-intel": "relay-field-intel",
    "deploy-navigation-drone": "guide-emergency-personnel",
    "deploy-backup": "backup-support",
  };

  const mission = missionMap[actionId];
  if (!mission) {
    return draft;
  }

  const next = { ...draft, drones: draft.drones.map((drone) => ({ ...drone })) };
  const assignment = assignDroneToMission(next, mission, zoneId);
  if (!assignment?.drone) {
    return draft;
  }

  if (actionId === "deploy-backup") {
    next.backupDeployed = true;
  }

  if (actionId === "deploy-navigation-drone") {
    next.responderRouteActive = true;
  }

  const zoneLabel = getZoneById(zoneId)?.label ?? "selected zone";
  const fallbackMessage = assignment.fallback ? " Preferred drone class unavailable, multi-role fallback assigned." : "";
  appendLog(next, "AI", "Drone task", `${assignment.drone.name} assigned to ${roleForMission(mission)} in ${zoneLabel}.${fallbackMessage}`, "info");
  return next;
}

function appendLog(
  draft: ShellDraft,
  actor: "AI" | "TALON" | "Operator" | "System",
  type: string,
  text: string,
  severity: PriorityRiskItem["severity"],
) {
  const nextId = `log-${activityCounter++}`;
  draft.activityLog = [
    {
      id: nextId,
      ts: nextLogTimestamp(),
      actor,
      type,
      text,
      severity,
    },
    ...draft.activityLog,
  ];
}

// ── Experience overlay components ──────────────────────────────────────────

function EntryScreen({ onBeginScenario, onExploreFree }: { onBeginScenario: () => void; onExploreFree: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 500,
        background: "rgba(6, 10, 18, 0.94)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 700ms ease",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, maxWidth: 480, padding: "0 32px", textAlign: "center" }}>
        <div style={{ fontFamily: font.mono, fontSize: 10, color: T.textMuted, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Wildfire Response · Prototype
        </div>
        <div style={{ fontFamily: font.sans, fontSize: 38, fontWeight: 700, color: T.textPrimary, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          FlytBase Sentinel
        </div>
        <div style={{ fontFamily: font.sans, fontSize: 15, color: T.textSecondary, lineHeight: 1.7, maxWidth: 340 }}>
          Wildfire response command interface.<br />AI proposes. Operator authorizes.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 260, marginTop: 12 }}>
          <button
            onClick={onBeginScenario}
            style={{
              padding: "14px 0",
              borderRadius: 10,
              background: T.cyan,
              border: "none",
              color: "#06090f",
              fontFamily: font.sans,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.01em",
            }}
          >
            Begin Scenario
          </button>
          <button
            onClick={onExploreFree}
            style={{
              padding: "12px 0",
              borderRadius: 10,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.14)",
              color: T.textSecondary,
              fontFamily: font.sans,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Explore freely →
          </button>
        </div>
      </div>
    </div>
  );
}

function ScenarioBrief({ onReady }: { onReady: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 490,
        background: "rgba(6, 10, 18, 0.78)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 400ms ease",
      }}
    >
      <div
        style={{
          ...GLASS,
          maxWidth: 460,
          width: "100%",
          margin: "0 24px",
          padding: "36px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 10, color: T.amber, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
            03:47 UTC — Thermal anomaly detected, Grid 4C, Altadena
          </div>
          <div style={{ fontFamily: font.sans, fontSize: 18, fontWeight: 600, color: T.textPrimary, lineHeight: 1.4 }}>
            TALON is analyzing. You are the operator on duty.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {(["Scan", "Verify", "Contain", "Rescue"] as const).map((phase, i) => (
            <div key={phase} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: font.mono, fontSize: 10, color: T.textSecondary, letterSpacing: "0.06em" }}>{phase}</span>
              {i < 3 && <span style={{ color: T.textMuted, fontSize: 9 }}>·</span>}
            </div>
          ))}
        </div>

        <div style={{ fontFamily: font.sans, fontSize: 13, color: T.textSecondary, lineHeight: 1.65 }}>
          Your role: authorize or override the critical calls.
        </div>

        <button
          onClick={onReady}
          style={{
            padding: "13px 24px",
            borderRadius: 10,
            background: T.cyan,
            border: "none",
            color: "#06090f",
            fontFamily: font.sans,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          I'm ready
        </button>
      </div>
    </div>
  );
}

function GuidanceStrip({ mode, scene, bottom }: { mode: OperationalMode; scene: SceneId; bottom: number }) {
  const PHASE_INFO: Record<OperationalMode, { label: string; index: number; prompt: string }> = {
    scan:    { label: "Scan",    index: 1, prompt: "TALON flagged an anomaly. Dispatch or dismiss." },
    verify:  { label: "Verify",  index: 2, prompt: "Evidence received. Confirm incident or override." },
    contain: { label: "Contain", index: 3, prompt: "TALON recommends containment. Authorize or revise." },
    rescue:  { label: "Rescue",  index: 4, prompt: "System executing. Supervise exceptions only." },
  };
  const info = { ...PHASE_INFO[mode] };
  if (scene === "investigation-pending") {
    info.prompt = "Drone dispatched. Awaiting live feed.";
  }
  return (
    <div
      style={{
        position: "absolute",
        left: LEFT_RAIL_W + SCREEN_INSET + 18,
        right: RIGHT_RAIL_W + SCREEN_INSET + 18,
        bottom,
        height: 40,
        zIndex: 28,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 18px",
        background: "rgba(6, 10, 18, 0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.07)",
        pointerEvents: "none",
      }}
    >
      <span style={{ fontFamily: font.mono, fontSize: 9, color: T.cyan, letterSpacing: "0.12em", textTransform: "uppercase", flexShrink: 0 }}>
        {info.label}
      </span>
      <span style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, flexShrink: 0 }}>
        Phase {info.index} of 4
      </span>
      <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.10)", flexShrink: 0 }} />
      <span style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {info.prompt}
      </span>
    </div>
  );
}

function ScenarioEndCard({ onExplore }: { onExplore: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 400,
        background: "rgba(6, 10, 18, 0.90)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 600ms ease",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, maxWidth: 380, padding: "0 32px", textAlign: "center" }}>
        <div style={{ fontFamily: font.mono, fontSize: 10, color: T.textMuted, letterSpacing: "0.15em", textTransform: "uppercase" }}>
          INC-2024-0847 · Altadena Grid 4C
        </div>
        <div style={{ fontFamily: font.sans, fontSize: 28, fontWeight: 700, color: T.teal, letterSpacing: "-0.01em" }}>
          Situation handled.
        </div>
        <div style={{ fontFamily: font.sans, fontSize: 14, color: T.textSecondary, lineHeight: 1.7 }}>
          All assets recalled. Returning to passive monitoring.
        </div>
        <button
          onClick={onExplore}
          style={{
            marginTop: 10,
            padding: "13px 28px",
            borderRadius: 10,
            background: T.cyan,
            border: "none",
            color: "#06090f",
            fontFamily: font.sans,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Explore the system freely
        </button>
      </div>
    </div>
  );
}

// ─── ESCALATION PROTOCOL OVERLAY ─────────────────────────────────────────────
// Appears after 15s of operator non-response on the alert-command scene.
// TALON does NOT self-authorize. It routes the decision to another human.
// The primary operator can still respond and take authority back at any time.
// ─────────────────────────────────────────────────────────────────────────────
function EscalationProtocolOverlay({
  escalationElapsed,
  onOperatorResponds,
  onDispatch,
  onDismiss,
}: {
  escalationElapsed: number;
  onOperatorResponds: () => void;
  onDispatch: () => void;
  onDismiss: () => void;
}) {
  const elapsed = String(escalationElapsed).padStart(2, "0");

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 120,
        background: "rgba(4, 6, 10, 0.72)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 300ms ease",
      }}
    >
      {/* Pulsing amber border around whole screen */}
      <div style={{
        position: "absolute",
        inset: 0,
        border: "2px solid rgba(245,166,35,0.4)",
        boxShadow: "inset 0 0 80px rgba(245,166,35,0.06)",
        animation: "pulse 1.4s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Corner accents */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {[
          { top: 0, left: 0, width: 80, height: 2 },
          { top: 0, left: 0, width: 2, height: 80 },
          { top: 0, right: 0, width: 80, height: 2 },
          { top: 0, right: 0, width: 2, height: 80 },
          { bottom: 0, left: 0, width: 80, height: 2 },
          { bottom: 0, left: 0, width: 2, height: 80 },
          { bottom: 0, right: 0, width: 80, height: 2 },
          { bottom: 0, right: 0, width: 2, height: 80 },
        ].map((s, i) => (
          <div key={i} style={{ position: "absolute", background: "rgba(245,166,35,0.55)", ...s }} />
        ))}
      </div>

      {/* Main panel */}
      <div style={{
        width: 520,
        background: "rgba(8, 12, 22, 0.96)",
        border: "1px solid rgba(245,166,35,0.35)",
        borderRadius: 18,
        boxShadow: "0 0 0 1px rgba(245,166,35,0.1), 0 32px 80px rgba(0,0,0,0.6)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Header band */}
        <div style={{
          background: "rgba(245,166,35,0.1)",
          borderBottom: "1px solid rgba(245,166,35,0.22)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: T.amber,
            animation: "pulse 0.9s ease-in-out infinite",
            flexShrink: 0,
          }} />
          <div style={{
            fontFamily: font.mono, fontSize: 9, fontWeight: 700,
            color: T.amber, letterSpacing: "0.14em", textTransform: "uppercase",
          }}>
            TALON · Escalation Protocol · Active
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontFamily: font.mono, fontSize: 9, color: "rgba(245,166,35,0.5)", letterSpacing: "0.08em" }}>
              UNRESPONSIVE
            </div>
            <div style={{
              fontFamily: font.mono, fontSize: 13, fontWeight: 700,
              color: T.amber, letterSpacing: "0.04em",
            }}>
              +{elapsed}s
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Title */}
          <div>
            <div style={{
              fontFamily: font.sans, fontSize: 18, fontWeight: 700,
              color: T.textPrimary, marginBottom: 6, lineHeight: 1.25,
            }}>
              No operator response detected
            </div>
            <div style={{
              fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.6,
            }}>
              TALON has not dispatched any drones. Authorization requires a human decision.
              Routing alert to secondary operator and Regional Commander.
            </div>
          </div>

          {/* Escalation targets */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              fontFamily: font.mono, fontSize: 9, color: T.textMuted,
              letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2,
            }}>
              Routing to
            </div>

            {/* Secondary operator */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(245,166,35,0.07)",
              border: "1px solid rgba(245,166,35,0.2)",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(245,166,35,0.14)",
                border: "1px solid rgba(245,166,35,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, flexShrink: 0,
              }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: font.sans, fontSize: 12, fontWeight: 600,
                  color: T.textPrimary, marginBottom: 2,
                }}>
                  B. Singh — Secondary Operator
                </div>
                <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.06em" }}>
                  WATCH-DESK-02 · Altadena Sector
                </div>
              </div>
              <div style={{
                padding: "3px 9px", borderRadius: 100,
                background: "rgba(245,166,35,0.14)",
                fontFamily: font.mono, fontSize: 9, fontWeight: 700,
                color: T.amber, letterSpacing: "0.08em",
                animation: "pulse 1.2s infinite",
              }}>
                ALERTING
              </div>
            </div>

            {/* Regional commander */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(229,83,60,0.1)",
                border: "1px solid rgba(229,83,60,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, flexShrink: 0,
              }}>🎖️</div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: font.sans, fontSize: 12, fontWeight: 600,
                  color: T.textPrimary, marginBottom: 2,
                }}>
                  Regional Commander — R. Patel
                </div>
                <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.06em" }}>
                  INC-2024-0847 · Override authority
                </div>
              </div>
              <div style={{
                padding: "3px 9px", borderRadius: 100,
                background: "rgba(229,83,60,0.1)",
                fontFamily: font.mono, fontSize: 9, fontWeight: 700,
                color: T.red, letterSpacing: "0.08em",
              }}>
                STANDBY
              </div>
            </div>
          </div>

          {/* Alarm indicator */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 14px",
            borderRadius: 8,
            background: "rgba(229,83,60,0.06)",
            border: "1px solid rgba(229,83,60,0.15)",
          }}>
            <div style={{ fontSize: 14 }}>🔔</div>
            <div style={{
              fontFamily: font.sans, fontSize: 11, color: "rgba(229,83,60,0.8)", lineHeight: 1.4,
            }}>
              Hard auditory alarm sounding at command center. Station 12 on Ch. 7 notified.
            </div>
          </div>

          {/* Primary operator CTA — they can still take authority */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              fontFamily: font.mono, fontSize: 9, color: T.textMuted,
              letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4,
            }}>
              Primary operator — still available to respond
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={onDispatch}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: 10,
                  background: "rgba(245,166,35,0.16)",
                  border: "1px solid rgba(245,166,35,0.4)",
                  color: T.amber,
                  fontFamily: font.sans,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                I'm here — Dispatch Scout
              </button>
              <button
                type="button"
                onClick={onDismiss}
                style={{
                  padding: "11px 16px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: T.textSecondary,
                  fontFamily: font.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Dismiss alert
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

