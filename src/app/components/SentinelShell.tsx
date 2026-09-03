import { lazy, Suspense, useState, useEffect, useRef } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { ActionBar, TalonMicButton } from "./ActionBar";
import { ContestedWatchPanel, ReconciliationPanel, ReRaiseBriefPanel } from "./ContestedWatch";
import { DissentGate } from "./DissentGate";
import { ExceptionBanner, ExceptionInterrupt } from "./ExceptionSurface";
import type { ModalPayload } from "./ActionModal";
import { SpatialMapCanvas, spatialCoordinatesForTarget } from "../map/SpatialMapCanvas";
import { nearestNodeId, nodePoint } from "../map/roads";
import { fromPixel, toPixel } from "../map/frame";
import { Navbar } from "./Navbar";
import { ActionGlyph } from "./actionVisuals";
import { OperationalIcon } from "./OperationalIcon";
import droneThermalFeed from "../../assets/drone-thermal-feed.png";
import { ActivityLogPanel, DroneFleetPanel, IntelPanel } from "./panels/LeftPanel";
import { ExceptionPanel, GroundTeamsPanel, PriorityPanel } from "./panels/RightPanel";
import { TalonCopilotPanel } from "./panels/TalonCopilotPanel";
import { RailStack, type RailView } from "./shared/RailStack";
import { PopoverSurface, usePopoverDismissal } from "./shared/PopoverSurface";
import { ReviewDock } from "./shell/ReviewDock";
import { EntryScreen, ScenarioBrief, ScenarioEndCard, SituationResolved } from "./shell/EntrySurfaces";
import { InfrastructureLossTakeover } from "./shell/InfrastructureLossTakeover";
import { createCommandAction } from "../domain/commands";
import { createDissent, resolveDissent } from "../domain/disagreement";
import { getOperationalException } from "../domain/exceptions";
import { COMMAND_LABELS } from "../domain/microcopy";
import {
  canTransition,
  resolveTransition,
  type SceneTransition,
  type TransitionContext,
  type TransitionEvent,
} from "../domain/stateMachine";
import { getAgentTasks, getTalonChipResponse, getTalonVoiceResponse } from "../domain/talon";
import { createRecentActionVerification } from "../domain/verification";
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
  material,
  GI,
  DroneClass,
  DroneMissionType,
  OperationalMode,
  PriorityRiskItem,
  QuickActionId,
  QuickActionState,
  ActionSurface,
  ActivityLogEntry,
  DissentDirection,
  OverrideReason,
  SceneId,
  SelectedEntity,
  ShellDraft,
  ShellState,
  TalonChipId,
  TalonConversationState,
  WorkflowPhase,
  getWorkflowPhase,
  T,
  border,
  font,
  layer,
  radius,
  space,
  surface,
  shell as shellTokens,
  tint,
  typeScale,
  typeWeight,
  tracking,
} from "../tokens";

const SCREEN_INSET = shellTokens.screenInset;
const NAVBAR_H = shellTokens.navHeight;
/*
 * The two rails have different jobs and different densities. The TALON rail
 * (right) is the protagonist — the copilot brief, workforce, and the densest
 * evidence summaries. The observation rail (left) is supporting — the operator
 * inspects there. Same width at narrow viewports (readability first); width is
 * the cheapest hierarchy there is.
 */
const LEFT_RAIL_W = shellTokens.railWidth;
const RIGHT_RAIL_W = shellTokens.railWidth;
const PANEL_TOP = NAVBAR_H + shellTokens.railGap + 4;
const LEFT_PANEL_GAP = shellTokens.railGap;
const RIGHT_PANEL_GAP = shellTokens.railGap;
const ActionModal = lazy(async () => ({
  default: (await import("./ActionModal")).ActionModal,
}));

let activityCounter = 1000;

/**
 * Ceiling for contested-watch evidence confidence. Mirrors the contested
 * targets in `SIGNAL_PROFILES` (domain/talon.ts) so the printed number and the
 * trend chart resolve to the same value.
 */
const CONTESTED_CEILING = 96;

function readShellParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  new URLSearchParams(query).forEach((value, key) => params.set(key, value));
  return params;
}

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

function createVoiceTalonResponse(scene: SceneId) {
  return getTalonVoiceResponse(scene);
}

/** Convert hex color to rgba with alpha */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function SentinelShell() {
  const [coreMode] = useState(() => {
    const params = readShellParams();
    return params.get("embed") === "1" || params.get("core") === "1";
  });
  const [escalationDeepLink] = useState(() => readShellParams().get("escalation") === "1");
  const [state, setState] = useState<ShellState>(() =>
    createSceneState(escalationDeepLink ? "alert-command" : "baseline", 0),
  );
  const [reviewDockOpen, setReviewDockOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<QuickActionId | null>(null);
  const [burnPermitVerified, setBurnPermitVerified] = useState(false);
  const [isActionBarExpanded, setIsActionBarExpanded] = useState(false);
  const [simTime, setSimTime] = useState(() => parseTimeSeconds(INCIDENT.detectedAt));
  const [incidentElapsed, setIncidentElapsed] = useState(0);
  const [investigationElapsed, setInvestigationElapsed] = useState(0);
  // voiceState is now owned by state.talonConversation — no local duplicate
  const [showSituationResolved, setShowSituationResolved] = useState(false);
  const [isRestartingSystem, setIsRestartingSystem] = useState(false);
  const [experienceMode, setExperienceMode] = useState<"entry" | "brief" | "simulation" | "free">(
    escalationDeepLink ? "simulation" : "entry",
  );
  const [showEndCard, setShowEndCard] = useState(false);
  const [rescueElapsed, setRescueElapsed] = useState(0);
  const [edgeCaseFired, setEdgeCaseFired] = useState(false);
  const [showEscalationOverlay, setShowEscalationOverlay] = useState(escalationDeepLink);
  const [escalationElapsed, setEscalationElapsed] = useState(0);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [spatialHover, setSpatialHover] = useState<SelectedEntity>(null);
  /* Seconds spent in contested watch — drives evidence climbing toward the re-raise bar. */
  const [contestedElapsed, setContestedElapsed] = useState(0);
  /* Pending dissent-gated move, held until the operator states a reason. */
  const [pendingDissent, setPendingDissent] = useState<{
    event: TransitionEvent;
    direction: DissentDirection;
  } | null>(null);
  /* Ground truth has landed and the disagreement can be answered. */
  const [reconciliation, setReconciliation] = useState(false);
  const timelineTriggerRef = useRef<HTMLButtonElement>(null);
  const timelinePopoverRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const adaptiveRailWidth =
    viewportWidth <= 1280 ? 260 : viewportWidth <= 1366 ? 280 : LEFT_RAIL_W;
  const adaptiveTalonRailWidth =
    viewportWidth <= 1280 ? 260 : viewportWidth <= 1366 ? 300 : 340;

  usePopoverDismissal({
    open: timelineOpen,
    onClose: () => setTimelineOpen(false),
    triggerRef: timelineTriggerRef,
    surfaceRef: timelinePopoverRef,
  });

  useEffect(() => {
    const sceneParam = readShellParams().get("scene") as SceneId | null;

    if (sceneParam && REVIEW_SCENES.some((scene) => scene.id === sceneParam)) {
      setExperienceMode("free");
      setScene(sceneParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleDevShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
        // Only toggle the review dock when already in free/explore mode
        if (experienceMode === "free") {
          setReviewDockOpen((current) => !current);
        }
      }
    };
    window.addEventListener("keydown", handleDevShortcut);
    return () => window.removeEventListener("keydown", handleDevShortcut);
  }, [experienceMode]);

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

  /*
   * Contested watch. TALON is not idle here — it keeps the overruled hypothesis
   * alive and evidence keeps accruing. The appeal fires only when the guard in
   * the transition table agrees the raised threshold has been crossed, which is
   * what keeps this an appeal rather than a nag.
   */
  useEffect(() => {
    if (state.scene !== "monitoring-contested") {
      setContestedElapsed(0);
      return;
    }
    const timerId = setInterval(() => setContestedElapsed((e) => e + 1), 1000);
    return () => clearInterval(timerId);
  }, [state.scene]);

  useEffect(() => {
    if (state.scene !== "monitoring-contested") return;
    dispatch("timer.reraise-threshold", (transition) =>
      updateState((draft) => ({
        ...draft,
        scene: transition.to,
      })),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestedElapsed, state.scene]);

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
    // Guided path front-loads a full infrastructure-loss differentiator after the battery beat.
    if (edgeCaseFired && rescueElapsed === 32 && state.scene === "rescue-battery-critical") {
      setScene("infrastructure-total-loss");
    }
    if (rescueElapsed >= 60 && !showEndCard) {
      setShowEndCard(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescueElapsed, edgeCaseFired, showEndCard, experienceMode, state.mode, state.scene]);

  // Always collapse action bar and reset to collapsed state on scene change.
  // Voice state lives in talonConversation, which createSceneState resets to idle.
  const setScene = (scene: SceneId) => {
    setIsActionBarExpanded(false);
    setBurnPermitVerified(false);
    setSpatialHover(null);
    if (scene === "baseline") {
      logTimeSeconds = 49 * 60 + 18;
      activityCounter = 1000;
      setSimTime(parseTimeSeconds(INCIDENT.detectedAt));
      setIncidentElapsed(0);
      setInvestigationElapsed(0);
      setState(createSceneState("baseline", 0));
    } else {
      setInvestigationElapsed(0);
      setState(createSceneState(scene, 0));
    }
  };

  /*
   * Evidence keeps building while a watch is contested — that is the whole
   * point of holding the hypothesis instead of deleting it. It starts at the
   * confidence TALON had when it was overruled and climbs from there.
   *
   * The ceiling matches SIGNAL_PROFILES' contested targets in domain/talon.ts,
   * so the printed number and the trend chart cannot disagree.
   */
  const evidenceConfidence = state.scene === "monitoring-contested"
    ? Math.min(CONTESTED_CEILING, (state.dissent?.talonConfidence ?? 78) + contestedElapsed)
    : state.scene === "talon-reraise"
      /*
       * TALON only re-raises once the evidence has crossed the re-raise
       * threshold, so by the time this scene exists the crossing is a fact.
       * Reporting the stale override number here rendered the whole brief as
       * "78% → 78%" under a headline that says something changed.
       */
      ? Math.max(state.dissent?.reRaiseThreshold ?? 94, CONTESTED_CEILING)
      : (state.dissent?.talonConfidence ?? 78);

  const transitionContext = (): TransitionContext => ({
    experienceMode,
    mode: state.mode,
    authoritiesNotified: state.authoritiesNotified,
    edgeCaseFired,
    dissent: state.dissent,
    evidenceConfidence,
  });

  /*
   * The single door for scene movement. Every move is checked against the
   * transition table first, so an event with no legal edge from the current
   * scene is refused rather than quietly applied — which is what made the old
   * scattered `setScene` calls a set of snapshots rather than a system.
   *
   * `apply` exists because most moves carry richer state than a scene id
   * (logs, selections, mission assignments). The table authorizes the move;
   * the callback performs it.
   */
  const dispatch = (
    event: TransitionEvent,
    apply?: (transition: SceneTransition) => void,
  ): boolean => {
    const transition = resolveTransition(state.scene, event, transitionContext());
    if (!transition) return false;

    /* Overruling TALON requires a stated reason before the move is allowed. */
    if (transition.requiresDissent && !pendingDissent) {
      setPendingDissent({
        event,
        direction: transition.effects?.escalationBasis === "operator-initiated"
          ? "talon-holds"
          : "talon-escalates",
      });
      return false;
    }

    if (apply) apply(transition);
    else setScene(transition.to);
    return true;
  };

  /*
   * Completes a dissent-gated move once the operator has stated why. The
   * dissent record is written before the scene changes, so the new scene is
   * never rendered without the disagreement that produced it.
   */
  const confirmDissent = (reason: OverrideReason, note?: string) => {
    if (!pendingDissent) return;
    const transition = resolveTransition(state.scene, pendingDissent.event, transitionContext());
    setPendingDissent(null);
    if (!transition) return;

    const record = createDissent({
      direction: pendingDissent.direction,
      reason,
      operatorNote: note,
      recordedAt: `${formatTime(simTime)} UTC`,
    });

    setState((current) => {
      const draft = stripDerived(current);
      const next: ShellDraft = {
        ...createSceneState(transition.to, 0),
        dissent: record,
        overrideReason: reason,
        escalationBasis: transition.effects?.escalationBasis ?? draft.escalationBasis,
        activityLog: draft.activityLog,
      };
      appendLog(
        next,
        "Operator",
        "Dissent",
        `Overruled TALON: ${reason.toLowerCase()}. TALON position retained under ${record.auditId}; re-raise threshold set to ${record.reRaiseThreshold}%.`,
        "caution",
      );
      return syncState(next, 0);
    });

    setIsActionBarExpanded(false);
    setBurnPermitVerified(false);
    setSpatialHover(null);
    setContestedElapsed(0);
  };

  const updateState = (updater: (draft: ShellDraft) => ShellDraft) => {
    setState((current) => syncState(updater(stripDerived(current)), investigationElapsed));
  };

  const recordTalonExecution = (actionId: QuickActionId, summary: string, auditId: string) => {
    updateState((draft) => ({
      ...draft,
      talonConversation: {
        ...draft.talonConversation,
        phase: "executing",
        contextActionId: actionId,
        confirmedPhase: null,
        receipt: null,
      },
    }));
    window.setTimeout(() => {
      updateState((draft) => {
        if (draft.talonConversation.contextActionId !== actionId) return draft;
        return {
          ...draft,
          talonConversation: {
            ...draft.talonConversation,
            phase: "receipt",
            confirmedPhase: "receipt",
            receipt: {
              id: auditId,
              summary,
              createdAt: `${formatTime(simTime)} UTC`,
            },
          },
        };
      });
    }, 720);
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
      "shift-handover",
      "abort-mission",
      "deploy-backup",
      "notify-authorities",
      "confirm-incident",
      "dispatch-scout",
      "override-plan",
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

    // Closing contested watch opens reconciliation — a shell surface, not a
    // scene transition, so it never touches the machine.
    if (actionId === "close-out-contested") {
      setReconciliation(true);
      return;
    }

    /*
     * Scene-moving commands go through the transition table. Each returns
     * whether the move was legal, so an action fired from a scene that has no
     * edge for it is refused instead of teleporting the operator.
     */
    switch (actionId) {
      case "surface-alert":
      case "dispatch-scout":
      case "open-verification":
      case "monitor-only":
      case "confirm-incident":
        dispatch(actionId);
        return;
      case "override-plan":
        dispatch("override-plan", () =>
          updateState((draft) => {
            draft.scene = "contain-alternate";
            draft.overrideReason = "Operational constraint";
            return draft;
          }),
        );
        return;
      case "open-degraded":
        dispatch("open-degraded", () =>
          updateState((draft) => {
            draft.scene = "contain-degraded";
            return draft;
          }),
        );
        return;
      case "authorize-containment":
        dispatch("authorize-containment", (transition) =>
          updateState((draft) => {
            const next = {
              ...draft,
              mode: transition.effects?.mode ?? ("rescue" as OperationalMode),
              scene: transition.to,
              incidentStatus: "rescue-active" as const,
              exceptionState: "none" as const,
              selectedEntity: { type: "zone", id: "residential-south" } as SelectedEntity,
              selectedZoneId: "residential-south",
              recentActionVerification: createRecentActionVerification(transition.to),
            };
            appendLog(next, "Operator", "Authorization", "Containment authorized. The shell shifted into rescue supervision.", "caution");
            return next;
          }),
        );
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

  const handleSurfaceModeChange = (mode: ShellState["surfaceMode"]) => {
    setState((current) => {
      if (!canToggleSurface) return current;
      return syncState(
        { ...stripDerived(current), surfaceMode: mode },
        current.scene === "investigation-pending" ? investigationElapsed : 0,
      );
    });
  };
  // V2: The command bar is the persistent TALON control surface, including quiet watch.
  const showsActionBar = true;
  // Keep the command surface physically stable. State changes animate inside the
  // bar instead of moving TALON or changing the operator's touch target.
  const actionBarHeight = !showsActionBar
    ? 0
    : state.scene === "verify-active"
      ? 184
      : 132;
  const railBottomInset = SCREEN_INSET + (showsActionBar ? actionBarHeight + 12 : 0);
  const reviewDockBottom = SCREEN_INSET + (showsActionBar ? actionBarHeight + 12 : 12);

  const handleTalonVoice = (vs: "idle" | "listening" | "processing" | "responded") => {
    setState((current) => ({
      ...current,
      talonConversation: {
        ...current.talonConversation,
        activeChip: vs === "responded" ? null : current.talonConversation.activeChip,
        response: vs === "responded" ? createVoiceTalonResponse(current.scene) : current.talonConversation.response,
        voiceState: vs,
      },
    }));
  };

  const handleTalonConversation = (conversation: TalonConversationState) => {
    setState((current) => ({
      ...current,
      talonConversation: conversation,
    }));
  };

  const operationalException = state.operationalException ?? getOperationalException(state.scene);
  const criticalFocusMode =
    state.scene === "rescue-battery-critical" ||
    (state.scene === "rescue-signal-degraded" && state.exceptionState === "signal-degraded");
  const focusMode = coreMode || criticalFocusMode;
  const agentTasks = getAgentTasks(state.scene);
  const activeAgentCount = agentTasks.filter((agent) => agent.status === "running").length;
  const gatedAgentCount = agentTasks.filter((agent) => agent.status === "blocked" || agent.requiresHumanGate).length;
  const degradedTeamCount = state.groundTeams.filter((team) => {
    const hrMatch = team.vitals.match(/HR\s*(\d+)/i);
    const visibilityMatch = team.vitals.match(/VIS\s*(\d+)m/i);
    const hr = hrMatch ? Number(hrMatch[1]) : 100;
    const visibility = visibilityMatch ? Number(visibilityMatch[1]) : 150;
    return hr > 150 || visibility < 40 || team.availability === "deployed";
  }).length;

  const leftDefaultView = state.selectedEntity ? "inspect" : state.workflowPhase === "operations" ? "assets" : "inspect";
  const rightDefaultView = operationalException ? "exceptions" : state.workflowPhase === "operations" ? "priorities" : "talon";

  const leftViews: RailView[] = [
    {
      id: "inspect",
      label: "Inspect",
      badge: state.selectedEntity ? { text: state.selectedEntity.type, color: T.cyan } : undefined,
      render: () => (
        <IntelPanel
          state={state}
          onClearSelection={() =>
            updateState((draft) => ({ ...draft, selectedEntity: null, selectedZoneId: null }))
          }
        />
      ),
    },
    {
      id: "assets",
      label: "Assets",
      badge: { text: `${state.drones.length}`, color: state.workflowPhase === "operations" ? T.amber : T.cyan },
      render: () => (
        <DroneFleetPanel
          state={state}
          onSelectDrone={(droneId) => handleSelectEntity({ type: "drone", id: droneId })}
          spatialHover={spatialHover}
          onSpatialHoverChange={setSpatialHover}
          canToggleSurface={canToggleSurface}
          onSurfaceModeChange={handleSurfaceModeChange}
        />
      ),
    },
    {
      id: "ledger",
      label: "Ledger",
      badge: { text: `${state.activityLog.length}`, color: state.activityLog.length > 0 ? T.cyan : T.textMuted },
      render: () => <ActivityLogPanel state={state} incidentElapsed={incidentElapsed} />,
    },
  ];

  const rightViews: RailView[] = [
    {
      id: "talon",
      label: "TALON",
      badge: { text: `${activeAgentCount}`, color: activeAgentCount ? T.teal : T.textMuted },
      render: () => (
        <>
          {!focusMode && state.scene === "investigation-pending" ? <InvestigationStrip investigationElapsed={investigationElapsed} /> : null}
          <TalonCopilotPanel state={state} />
        </>
      ),
    },
    {
      id: "priorities",
      label: "Priorities",
      badge: { text: `${state.activePriorities.length}`, color: state.workflowPhase === "operations" ? T.fire : T.amber },
      render: () => (
        <PriorityPanel
          state={state}
          onAcknowledgePriority={handleAcknowledgePriority}
          onSelectZone={(zoneId) => handleSelectEntity({ type: "zone", id: zoneId })}
          spatialHover={spatialHover}
          onSpatialHoverChange={setSpatialHover}
        />
      ),
    },
    {
      id: "readiness",
      label: "Readiness",
      badge: { text: degradedTeamCount ? `${degradedTeamCount}` : `${state.groundTeams.length}`, color: degradedTeamCount ? T.amber : T.teal },
      render: () => (
        <GroundTeamsPanel
          state={state}
          onSelectTeam={(teamId) => handleSelectEntity({ type: "team", id: teamId })}
          spatialHover={spatialHover}
          onSpatialHoverChange={setSpatialHover}
        />
      ),
    },
    {
      id: "exceptions",
      label: "Exceptions",
      badge: { text: operationalException ? "1" : "0", color: operationalException ? T.amber : T.teal },
      render: () => <ExceptionPanel state={state} />,
    },
  ];
  const visibleLeftViews = focusMode
    ? leftViews.filter((view) => view.id === "inspect")
    : leftViews;
  const visibleRightViews = focusMode
    ? rightViews.filter((view) => view.id === "talon")
    : rightViews;

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
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
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.16); border-radius: 999px; }
        [data-scroll-surface] { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.16) transparent; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes talonIdlePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,200,255,0.0), 0 0 8px rgba(0,200,255,0.15); }
          50% { box-shadow: 0 0 0 6px rgba(0,200,255,0.08), 0 0 16px rgba(0,200,255,0.3); }
        }
        @keyframes talonListeningPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(229,83,60,0.0), 0 0 8px rgba(229,83,60,0.2); }
          50% { box-shadow: 0 0 0 8px rgba(229,83,60,0.12), 0 0 20px rgba(229,83,60,0.4); }
        }
        @keyframes talonProcessingFlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes evidenceSourcePulse {
          0%, 100% { opacity: 0.7; } 50% { opacity: 1; }
        }
        @keyframes agentTaskRunning {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes workforcePulse { 0%, 100% { transform: scale(1); opacity: .72; } 50% { transform: scale(1.22); opacity: 1; } }
        @keyframes waveBar1 { 0%, 100% { height: 4px; } 50% { height: 18px; } }
        @keyframes waveBar2 { 0%, 100% { height: 8px; } 40% { height: 22px; } }
        @keyframes waveBar3 { 0%, 100% { height: 12px; } 60% { height: 28px; } }
        @keyframes waveBar4 { 0%, 100% { height: 6px; } 50% { height: 20px; } }
        @keyframes waveBar5 { 0%, 100% { height: 10px; } 45% { height: 16px; } }
        @keyframes pulseBar { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <div style={{ position: "absolute", inset: 0, zIndex: layer.map }}>
        <SpatialMapCanvas
          state={state}
          coreMode={focusMode}
          onSelectEntity={handleSelectEntity}
          spatialHover={spatialHover}
          onSpatialHoverChange={setSpatialHover}
          onUpdateState={(updater) => updateState((draft) => { updater(draft as import("../tokens").ShellState); return draft; })}
        />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: layer.map + 1,
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
          zIndex: layer.nav,
          background: surface.panelDense,
          borderBottom: `1px solid ${border.default}`,
          display: "flex",
          alignItems: "center",
          padding: `0 ${SCREEN_INSET}px`,
          gap: space.lg,
        }}
      >
        <Navbar
          state={state}
          timeString={formatTime(simTime)}
          incidentElapsed={incidentElapsed}
          onShiftHandover={() => handleAction("shift-handover")}
          onOpenTimeline={() => setTimelineOpen((current) => !current)}
          timelineOpen={timelineOpen}
          timelineTriggerRef={timelineTriggerRef}
          coreMode={focusMode}
        />
      </div>

      {timelineOpen && (
        <TimelinePopover
          surfaceRef={timelinePopoverRef}
          entries={state.activityLog}
          onClose={() => {
            setTimelineOpen(false);
            window.requestAnimationFrame(() => timelineTriggerRef.current?.focus());
          }}
        />
      )}

      {/*
        Scene navigation is always available — including embeds — because a
        reviewer (or a recruiter) must reach any designed state without
        replaying the 90-second script. It aligns to the ADAPTIVE rail width;
        the old constant offset floated it 40px into the map at 1280, where it
        collided with TALON's voice panel.
      */}
      {experienceMode === "free" && (
        <ReviewDock
          open={reviewDockOpen}
          activeScene={state.scene}
          bottomOffset={reviewDockBottom}
          rightOffset={adaptiveRailWidth + SCREEN_INSET + 12}
          onToggle={() => setReviewDockOpen((current) => !current)}
          onJumpToScene={setScene}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: PANEL_TOP,
          left: SCREEN_INSET,
          width: adaptiveRailWidth,
          bottom: railBottomInset,
          zIndex: layer.rail,
          display: "flex",
          flexDirection: "column",
          gap: LEFT_PANEL_GAP,
          overflowY: "hidden",
          overflowX: "hidden",
        }}
        role="region"
        aria-label="Intelligence panels"
      >
        <RailStack
          views={visibleLeftViews}
          defaultViewId={focusMode ? "inspect" : leftDefaultView}
          ariaLabel="Observation rail"
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: PANEL_TOP,
          right: SCREEN_INSET,
          width: adaptiveTalonRailWidth,
          bottom: railBottomInset,
          zIndex: layer.rail,
          display: "flex",
          flexDirection: "column",
          gap: RIGHT_PANEL_GAP,
          overflowY: "hidden",
          overflowX: "hidden",
        }}
        role="region"
        aria-label="Priority and team panels"
      >
        <RailStack
          views={visibleRightViews}
          defaultViewId={focusMode ? "talon" : rightDefaultView}
          ariaLabel="TALON synthesis rail"
        />
      </div>

      {showsActionBar ? (
        <div
          style={{
            position: "absolute",
            // Centered, content-width: a compact pill when TALON is just watching,
            // growing wider as situational actions appear around the core.
            left: "50%",
            transform: "translateX(-50%)",
            bottom: SCREEN_INSET,
            height: actionBarHeight,
            maxWidth: `calc(100vw - ${SCREEN_INSET * 2}px)`,
            zIndex: layer.command,
            // No dock. The command cluster floats over a full-bleed map; only the
            // orb, the command pill, and the danger affordance carry surface.
            display: "flex",
            alignItems: "center",
            overflow: "visible",
            transition: "height 220ms cubic-bezier(0.23,1,0.32,1)",
          }}
        >
          <ActionBar
            state={state}
            onAction={handleAction}
            coreMode={focusMode}
            expanded={isActionBarExpanded}
            onToggleExpand={() => setIsActionBarExpanded((value) => !value)}
            onTalonVoiceChange={handleTalonVoice}
            onTalonConversationChange={handleTalonConversation}
            burnPermitVerified={burnPermitVerified}
            onBurnPermitVerifyChange={setBurnPermitVerified}
          />
        </div>
      ) : null}

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
                  border: `1px solid ${reason === state.overrideReason ? `${T.amber}55` : border.strong}`,
                  background: reason === state.overrideReason ? "rgba(245,166,35,0.16)" : "rgba(255,255,255,0.04)",
                  fontFamily: font.sans,
                  fontSize: typeScale.metadata,
                  color: reason === state.overrideReason ? T.amber : T.textSecondary,
                }}
              >
                {reason}
              </span>
            ))}
          </div>
          
          {/* Voice to TALON override strip — uses the unified TALON conversation system */}
          <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
             <div style={{ fontFamily: font.mono, fontSize: typeScale.label, color: T.textMuted, letterSpacing: tracking.eyebrow, textTransform: "uppercase", marginBottom: 10 }}>Brief TALON by voice</div>
             <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <TalonMicButton
                  voiceState={state.talonConversation.voiceState}
                  onVoiceChange={handleTalonVoice}
                  conversation={state.talonConversation}
                  onConversationChange={handleTalonConversation}
                />

                <div style={{ flex: 1, padding: "12px 14px", background: surface.control, borderRadius: radius.tile, border: `1px solid ${border.subtle}`, minHeight: 44, display: "flex", alignItems: "center" }}>
                  {state.talonConversation.voiceState === "idle" && (
                    <span style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textMuted }}>
                      "TALON, wind shifted northeast — move perimeter hold to buffer east..."
                    </span>
                  )}
                  {state.talonConversation.voiceState === "listening" && (
                    <span style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textPrimary, fontStyle: "italic" }}>Listening...</span>
                  )}
                  {state.talonConversation.voiceState === "processing" && (
                    <span style={{ fontFamily: font.mono, fontSize: typeScale.label, color: T.cyan }}>TALON processing...</span>
                  )}
                  {state.talonConversation.voiceState === "responded" && state.talonConversation.response && (
                    <span style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.teal, lineHeight: 1.55 }}>
                      {state.talonConversation.response.body}
                    </span>
                  )}
                  {state.talonConversation.voiceState === "responded" && !state.talonConversation.response && (
                    <span style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.teal, lineHeight: 1.55 }}>
                      Plan recomputed with operator correction. Review the updated alternate plan.
                    </span>
                  )}
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
              background: border.subtle,
              border: `1px solid ${border.strong}`,
              borderRadius: radius.control,
              color: T.textPrimary,
              fontFamily: font.sans,
              fontSize: typeScale.body,
              fontWeight: typeWeight.semibold,
              cursor: "pointer",
              transition: "background 180ms ease, border-color 180ms ease, color 180ms ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseOut={(e) => e.currentTarget.style.background = border.subtle}
          >
            Acknowledge & Close
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
              background: border.subtle,
              border: `1px solid ${border.strong}`,
              borderRadius: radius.control,
              color: T.textPrimary,
              fontFamily: font.sans,
              fontSize: typeScale.body,
              fontWeight: typeWeight.semibold,
              cursor: "pointer",
              transition: "background 180ms ease, border-color 180ms ease, color 180ms ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseOut={(e) => e.currentTarget.style.background = border.subtle}
          >
            Acknowledge & Close
          </button>
        </CompactPanel>
      ) : null}

      {state.scene === "infrastructure-total-loss" && (
        <InfrastructureLossTakeover
          isRestarting={isRestartingSystem}
          onRestart={() => {
            setIsRestartingSystem(true);
            setTimeout(() => {
              setIsRestartingSystem(false);
              setScene("baseline");
            }, 1400);
          }}
        />
      )}

      {/* ── UNIFIED EXCEPTION BANNER ──────────────────────────────────────────
          One design language for persistent degraded states. Driven by the
          OperationalException model — the same model that powers the right-rail
          Exception Queue and the blocked agents in TALON Workforce. The failure
          is therefore felt across the entire system, not shown in one frame.
      ────────────────────────────────────────────────────────────────────── */}
      {(state.scene === "satellite-feed-loss" || state.scene === "network-degraded") && state.operationalException && (
        <div
          style={{
            position: "absolute",
            top: PANEL_TOP,
            left: adaptiveRailWidth + SCREEN_INSET + 18,
            right: adaptiveRailWidth + SCREEN_INSET + 18,
            zIndex: layer.alert,
          }}
        >
          <ExceptionBanner
            exception={state.operationalException}
            restoreEta={state.scene === "satellite-feed-loss" ? "04:22 UTC" : "Auto-recovering"}
            onRecover={(cmd) => handleAction(cmd)}
          />
        </div>
      )}

      {/* ── BATTERY CRITICAL — SUPERVISED HANDOFF INTERRUPT ───────────────────
          Acknowledge-required exception. Same visual language as the banner,
          elevated to a human gate. Reinforces: TALON prepares, the human
          authorizes. The same exception also populates the right-rail queue.
      ────────────────────────────────────────────────────────────────────── */}
      {state.scene === "rescue-battery-critical" && state.operationalException && (
        <div
          style={{
            position: "absolute",
            top: NAVBAR_H + 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: layer.alert,
          }}
        >
          <ExceptionInterrupt
            exception={state.operationalException}
            recallAsset={{ name: "Lidar-02", detail: "14% · RTB in progress" }}
            coverageAsset={{ name: "Scout-03", detail: "En route · ETA 00:42" }}
            onAcknowledge={() =>
              dispatch("operator.acknowledge-handoff", (transition) =>
                updateState((draft) => {
                  draft.scene = transition.to;
                  return draft;
                }),
              )
            }
          />
        </div>
      )}

      {/* ── CONTESTED WATCH ───────────────────────────────────────────────────
          What TALON does after being overruled. Not baseline, not an alert —
          a visible, bounded watch with a stated bar it must clear to speak.
      ────────────────────────────────────────────────────────────────────── */}
      {state.scene === "monitoring-contested" && state.dissent && (
        <div
          style={{
            position: "absolute",
            top: NAVBAR_H + 26,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: layer.alert,
          }}
        >
          <ContestedWatchPanel
            dissent={state.dissent}
            currentConfidence={evidenceConfidence}
          />
        </div>
      )}

      {/* ── TALON RE-RAISE ────────────────────────────────────────────────────
          The appeal. Shows only what changed since the override, and routes to
          a second authority rather than re-prompting the operator who declined.
      ────────────────────────────────────────────────────────────────────── */}
      {state.scene === "talon-reraise" && state.dissent && (
        <div
          style={{
            position: "absolute",
            top: NAVBAR_H + 26,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: layer.alert,
          }}
        >
          <ReRaiseBriefPanel
            dissent={state.dissent}
            currentConfidence={evidenceConfidence}
          />
        </div>
      )}

      {/* ── RECONCILIATION ────────────────────────────────────────────────────
          Ground truth lands and the disagreement is answered. The verdict is
          not chosen — it falls out of the machine. Arriving here from contested
          watch without the evidence ever clearing the re-raise bar means the
          signal decayed, which is the finding: the operator read it correctly.
      ────────────────────────────────────────────────────────────────────── */}
      {reconciliation && state.dissent && (
        <ReconciliationPanel
          dissent={state.dissent}
          outcome={evidenceConfidence >= state.dissent.reRaiseThreshold ? "talon-correct" : "operator-correct"}
          groundTruth={
            evidenceConfidence >= state.dissent.reRaiseThreshold
              ? "Fire crews confirmed an active vegetation fire at Grid 4C. The permit on file covered a parcel 1.2km east of the ignition point."
              : "County records confirmed an active burn permit for Grid 4C. Thermal signature decayed on schedule and no ignition was reported."
          }
          resolvedAt={`${formatTime(simTime)} UTC`}
          onClose={() => {
            const outcome = evidenceConfidence >= state.dissent!.reRaiseThreshold ? "talon-correct" : "operator-correct";
            const groundTruth = outcome === "talon-correct"
              ? "Fire crews confirmed an active vegetation fire at Grid 4C. The permit on file covered a parcel 1.2km east of the ignition point."
              : "County records confirmed an active burn permit for Grid 4C. Thermal signature decayed on schedule and no ignition was reported.";
            const resolvedAt = `${formatTime(simTime)} UTC`;
            const resolvedDissent = resolveDissent(state.dissent!, outcome, groundTruth, resolvedAt);
            setReconciliation(false);
            setIsActionBarExpanded(false);
            setBurnPermitVerified(false);
            setSpatialHover(null);
            setContestedElapsed(0);
            setState((current) => {
              const prior = stripDerived(current);
              const next = stripDerived(createSceneState("baseline", 0));
              next.dissent = resolvedDissent;
              next.activityLog = prior.activityLog;
              appendLog(
                next,
                "System",
                "Reconciliation",
                `${resolvedDissent.resolution?.outcome === "operator-correct" ? "Operator judgment confirmed" : "TALON assessment confirmed"} · ${resolvedDissent.auditId}`,
                resolvedDissent.resolution?.outcome === "operator-correct" ? "safe" : "caution",
              );
              return syncState(next, 0);
            });
          }}
        />
      )}

      {/* ── DISSENT GATE ──────────────────────────────────────────────────────
          Overruling TALON is a decision, not an absence of one. The move is
          held here until the operator states why, because an unexplained
          override is unreviewable later — for them as much as for the system.
      ────────────────────────────────────────────────────────────────────── */}
      {pendingDissent && (
        <DissentGate
          direction={pendingDissent.direction}
          onCancel={() => setPendingDissent(null)}
          onConfirm={confirmDissent}
        />
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
      {state.scene === "verify-active" && (
        <VerifyLiveFeed
          railWidth={adaptiveRailWidth}
          bottomInset={railBottomInset}
        />
      )}

      {/* ── Action Modal ─────────────────────────────────────────────────────
          Confirmation dialogs for high-consequence actions. Opened by
          handleAction when the action is in the modalActions list.
      ────────────────────────────────────────────────────────────────────── */}
      {activeModal && (
        <Suspense fallback={null}>
          <ActionModal
            modalId={activeModal}
            state={state}
            onClose={() => setActiveModal(null)}
            onTalonConversationChange={handleTalonConversation}
            onConfirm={(actionId, payload) => {
            setActiveModal(null);
            // Execute the actual state change after modal confirm
            switch (actionId) {
              case "shift-handover":
                updateState((draft) => {
                  const next = { ...draft, activeOperator: "R. Sharma" };
                  appendLog(next, "System", "Audit", "Operational Authority transferred from A. Rao to R. Sharma · Cryptographic Receipt: AUDIT-8842", "safe");
                  return next;
                });
                break;
              case "emergency-evacuate":
                updateState((draft) => {
                  const assignments = payload?.teamAssignments ?? [];
                  const activeRoute = payload?.route ?? "Route A";
                  const primaryZone = assignments.length > 0 ? assignments[0].zoneId : (draft.selectedZoneId ?? "residential-south");

                  const next = {
                    ...draft,
                    emergencyEvacuationActive: true,
                    residentialRouteActive: true,
                    selectedEvacuationRouteId: payload?.routeId ?? draft.selectedEvacuationRouteId ?? "route-a",
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
                /*
                 * Most missions stage inside the current scene. A few double as
                 * the recovery for a degraded scene — those must also leave it,
                 * or the exception banner offers an exit that assigns a drone
                 * and strands the operator where they were.
                 */
                if (!dispatch(actionId, (transition) =>
                  updateState((draft) => {
                    const next = applyMissionAction(draft, actionId);
                    next.scene = transition.to;
                    next.operationalException = null;
                    next.exceptionState = "none";
                    appendLog(next, "TALON", "Recovery", `Degraded state cleared. ${COMMAND_LABELS[actionId]} restored the missing coverage.`, "info");
                    return next;
                  }),
                )) {
                  updateState((draft) => applyMissionAction(draft, actionId));
                }
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
                setIsActionBarExpanded(false);
                setBurnPermitVerified(false);
                setSpatialHover(null);
                setState((current) => {
                  const prior = stripDerived(current);
                  const next = stripDerived(createSceneState("baseline", 0));
                  next.activityLog = prior.activityLog;
                  appendLog(
                    next,
                    "Operator",
                    "Abort",
                    "Mission aborted by operator. Active assets recalled and command returned to passive monitoring.",
                    "caution",
                  );
                  return syncState(next, 0);
                });
                break;
              case "deploy-backup":
                setState((current) => {
                  const draft = stripDerived(current);
                  const transition = resolveTransition(
                    draft.scene,
                    "deploy-backup",
                    {
                      experienceMode,
                      mode: draft.mode,
                      authoritiesNotified: draft.authoritiesNotified,
                      edgeCaseFired: draft.scene === "rescue-battery-critical",
                      dissent: draft.dissent,
                      evidenceConfidence: draft.dissent?.talonConfidence ?? 78,
                    },
                  );
                  if (!transition) return current;
                  const next = applyMissionAction(draft, "deploy-backup");
                  next.scene = transition.to;
                  next.exceptionState = "none";
                  next.backupDeployed = true;
                  appendLog(
                    next,
                    "Operator",
                    "Recovery",
                    "Backup relay deployed. Signal degradation cleared and rescue supervision resumed.",
                    "info",
                  );
                  return syncState(next, investigationElapsed);
                });
                break;
              case "dispatch-scout":
                dispatch("dispatch-scout");
                break;
              case "override-plan":
                dispatch("override-plan", () =>
                  updateState((draft) => {
                    draft.scene = "contain-alternate";
                    draft.overrideReason = "Operational constraint";
                    return draft;
                  }),
                );
                break;
              case "confirm-incident": {
                const committed = dispatch("confirm-incident", (transition) =>
                  updateState((draft) => {
                    const next = {
                      ...draft,
                      scene: transition.to,
                      mode: "verify" as OperationalMode,
                      incidentStatus: "notification-ready" as const,
                      selectedEntity: { type: "anomaly", id: ANOMALY.id } as SelectedEntity,
                      selectedZoneId: ANOMALY.zoneId,
                    };
                    appendLog(
                      next,
                      "Operator",
                      "Authorization",
                      "Authority packet preparation authorized. TALON assembled the packet; a separate human send gate remains.",
                      "caution",
                    );
                    return next;
                  }),
                );
                if (committed) {
                  recordTalonExecution(
                    "confirm-incident",
                    "Authority packet prepared for operator review. TALON did not notify authorities.",
                    "AUD-PKT-PREP-0847",
                  );
                }
                break;
              }
              case "notify-authorities": {
                const committed = dispatch("notify-authorities", (transition) =>
                  updateState((draft) => {
                    if (draft.authoritiesNotified) return draft;
                    const next = {
                      ...draft,
                      authoritiesNotified: true,
                      mode: transition.effects?.mode ?? ("contain" as OperationalMode),
                      scene: transition.to,
                      incidentStatus: "confirmed" as const,
                      selectedEntity: { type: "zone", id: INCIDENT.activeZoneId } as SelectedEntity,
                      selectedZoneId: INCIDENT.activeZoneId,
                      highlightedZoneIds: ["residential-south"],
                      recentActionVerification: createRecentActionVerification(transition.to),
                    };
                    /* Direction B: the packet records that the operator, not TALON, called it. */
                    const basisNote = draft.escalationBasis === "operator-initiated"
                      ? " Operator-initiated escalation; TALON's dissent is attached to the packet."
                      : "";
                    appendLog(next, "Operator", "Authority", `Authorities notified with TALON packet AUD-90-0847. Operations planning is now active.${basisNote}`, "info");
                    return next;
                  }),
                );
                if (committed) {
                  recordTalonExecution(
                    "notify-authorities",
                    "Authority packet sent after explicit operator confirmation.",
                    "AUD-AUTH-0847",
                  );
                }
                break;
              }
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
        </Suspense>
      )}

      {showSituationResolved && (
        <SituationResolved
          elapsedMins={Math.max(1, Math.floor(incidentElapsed / 60))}
          structuresProtected={state.rescueProgress.cleared > 0 ? state.rescueProgress.cleared : state.rescueProgress.total}
          operatorDecisions={state.activityLog.filter((e) => e.actor === "Operator").length}
        />
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

function TimelinePopover({
  surfaceRef,
  entries,
  onClose,
}: {
  surfaceRef: RefObject<HTMLDivElement>;
  entries: ActivityLogEntry[];
  onClose: () => void;
}) {
  const latest = entries[0];

  return (
    <PopoverSurface
      ref={surfaceRef}
      ariaLabel="Action timeline"
      width={360}
      style={{
        position: "absolute",
        top: NAVBAR_H + shellTokens.railGap,
        right: SCREEN_INSET + 96,
        maxHeight: `calc(100dvh - ${NAVBAR_H + shellTokens.railGap + SCREEN_INSET}px)`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: `${space.lg}px ${space.lg}px`,
          borderBottom: `1px solid ${border.subtle}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: space.md,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: font.sans,
              fontSize: typeScale.body,
              color: T.cyan,
              fontWeight: typeWeight.bold,
            }}
          >
            Action timeline
          </div>
          <div
            style={{
              fontFamily: font.sans,
              fontSize: typeScale.label,
              color: T.textPrimary,
              fontWeight: typeWeight.semibold,
              marginTop: space.xs,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {latest?.text ?? "No actions recorded"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close timeline"
          style={{
            width: space.xl,
            height: space.xl,
            borderRadius: radius.control,
            border: `1px solid ${border.default}`,
            background: surface.control,
            color: T.textMuted,
            cursor: "pointer",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </button>
      </div>

      <div
        style={{
          padding: space.lg,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: space.sm,
        }}
      >
        {entries.map((entry) => {
          const color = activitySeverityColor(entry.severity);
          return (
            <div
              key={entry.id}
              style={{
                display: "grid",
                gridTemplateColumns: "52px minmax(0, 1fr)",
                gap: space.sm,
                padding: `${space.sm}px ${space.xs}px`,
                borderBottom: `1px solid ${border.soft}`,
              }}
            >
              <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted }}>{entry.ts}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: space.sm, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontFamily: font.mono,
                      fontSize: typeScale.label,
                      color,
                      fontWeight: typeWeight.bold,
                    }}
                  >
                    {entry.actor}
                  </span>
                  <span
                    style={{
                      fontFamily: font.mono,
                      fontSize: typeScale.metadata,
                      color: T.textMuted,
                    }}
                  >
                    {entry.type}
                  </span>
                </div>
                <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, lineHeight: 1.45, marginTop: space.xs }}>
                  {entry.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PopoverSurface>
  );
}

function activitySeverityColor(severity: ActivityLogEntry["severity"]): string {
  switch (severity) {
    case "danger":
      return T.red;
    case "caution":
      return T.amber;
    case "safe":
      return T.teal;
    case "info":
    default:
      return T.cyan;
  }
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
        zIndex: layer.alert,
        ...material.overlay,
        border: `1px solid ${tone}4D`,
        padding: "14px 18px 14px 22px",
        overflow: "hidden",
      }}
    >
      {/* Severity edge — same signature as every exception surface */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: tone, borderRadius: "16px 0 0 16px" }} aria-hidden="true" />
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
            fontSize: typeScale.label,
            fontWeight: typeWeight.bold,
            color: tone,
            letterSpacing: tracking.eyebrow,
            textTransform: "uppercase",
          }}
        >
          Interrupt command
        </span>
      </div>

      <div style={{ fontFamily: font.sans, fontSize: typeScale.heading, fontWeight: typeWeight.bold, color: T.textPrimary }}>{title}</div>
      <div style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textSecondary, lineHeight: 1.5, marginTop: 6 }}>{subtitle}</div>

      <div
        style={{
          marginTop: 14,
          padding: "10px 12px",
          borderRadius: radius.panel,
          background: surface.controlHover,
          border: `1px solid ${border.default}`,
          fontFamily: font.mono,
          fontSize: typeScale.metadata,
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
        maxHeight: `calc(100dvh - ${NAVBAR_H + 26 + shellTokens.screenInset + 160}px)`,
        overflowY: "auto",
        zIndex: layer.alert,
        ...material.overlay,
        // Severity still arrives on the border; the material never changes.
        border: `1px solid ${tone}4D`,
        padding: "16px 18px",
        scrollbarWidth: "none",
      }}
    >
      <div style={{ fontFamily: font.sans, fontSize: typeScale.heading, fontWeight: typeWeight.bold, color: T.textPrimary }}>{title}</div>
      <div style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textSecondary, lineHeight: 1.5, marginTop: 6 }}>{subtitle}</div>
      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

function InfoCallout({ title, body, tone }: { title: string; body: string; tone: string }) {
  return (
    <div
      style={{
        borderRadius: radius.panel,
        border: `1px solid ${hexToRgba(tone, 0.2)}`,
        background: hexToRgba(tone, 0.07),
        padding: "12px 14px",
      }}
    >
      <div style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: tone }}>{title}</div>
      <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary, lineHeight: 1.45, marginTop: 5 }}>{body}</div>
    </div>
  );
}

const secondaryButtonStyle: CSSProperties = {
  flex: 1,
  padding: "11px 12px",
  borderRadius: radius.panel,
  background: "transparent",
  border: `1px solid ${border.strong}`,
  color: T.textSecondary,
  fontFamily: font.sans,
  fontSize: typeScale.label,
  fontWeight: typeWeight.bold,
  letterSpacing: tracking.telemetry,
  textTransform: "uppercase",
  cursor: "pointer",
};

function primaryButtonStyle(tone: string): CSSProperties {
  return {
    flex: 1.15,
    padding: "11px 12px",
    borderRadius: radius.panel,
    background: `${tone}22`,
    border: `1px solid ${tone}`,
    color: tone,
    fontFamily: font.sans,
    fontSize: typeScale.label,
    fontWeight: typeWeight.bold,
    letterSpacing: tracking.telemetry,
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
        zIndex: layer.modal,
        ...material.overlay,
        border: `1px solid ${T.amber}44`,
        padding: "20px 22px 18px",
      }}
      role="region"
      aria-live="assertive"
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
            fontSize: typeScale.label,
            fontWeight: typeWeight.bold,
            color: T.amber,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          TALON Alert · Interrupt
        </span>
        <span style={{ marginLeft: "auto", fontFamily: font.mono, fontSize: typeScale.label, color: T.textMuted }}>
          03:47:03 UTC
        </span>
      </div>

      {/* Title */}
      <div style={{ fontFamily: font.sans, fontSize: typeScale.heading, fontWeight: typeWeight.bold, color: T.textPrimary, lineHeight: 1.2 }}>
        Thermal spike detected
      </div>
      <div style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textSecondary, lineHeight: 1.5, marginTop: 6 }}>
        Grid 4C · North Forest Belt · Confidence 40%
      </div>

      {/* TALON reasoning */}
      <div
        style={{
          marginTop: 14,
          padding: "12px 14px",
          borderRadius: radius.panel,
          background: "rgba(245,166,35,0.07)",
          border: "1px solid rgba(245,166,35,0.16)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ fontFamily: font.mono, fontSize: typeScale.label, color: T.amber, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
          TALON Assessment
        </div>
        <div style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textPrimary, lineHeight: 1.5 }}>
          Area has <strong style={{ color: T.amber }}>high ignition risk</strong> based on burn memory from prior events, current wind corridor pointing northeast, and elevated thermal delta above seasonal baseline.
        </div>
        <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted, lineHeight: 1.45 }}>
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
          disabled ? "rgba(255,255,255,0.1)" : subtle ? border.strong : `${tone}${emphasis ? "" : ""}`
        }`,
        background: disabled
          ? "rgba(255,255,255,0.04)"
          : subtle
            ? hovered
              ? border.default
              : "rgba(255,255,255,0.05)"
            : hovered
              ? hexToRgba(tone, emphasis ? 0.22 : 0.16)
              : hexToRgba(tone, emphasis ? 0.16 : 0.1),
        color: disabled ? T.textMuted : subtle ? T.textSecondary : tone,
        fontFamily: font.sans,
        fontSize: compact ? 10 : 11,
        fontWeight: typeWeight.bold,
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
        <span style={{ opacity: 0.72, fontFamily: font.mono, fontSize: 10, letterSpacing: tracking.telemetry }}>
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
          <div style={{ fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.semibold, color: T.textPrimary }}>
            Lidar-02 en route
          </div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.metadata, color: T.textMuted, marginTop: 2 }}>
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
            fontSize: typeScale.label,
            color: T.cyan,
            letterSpacing: tracking.telemetry,
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
          <div style={{ fontFamily: font.sans, fontSize: typeScale.metadata, color: T.textSecondary }}>
            Thermal + LiDAR · ETA {Math.max(0, 10 - investigationElapsed)} sec
          </div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.metadata, color: T.textMuted, marginTop: 2 }}>
            {investigationElapsed >= 10 ? "Lidar-02 is on station. Ready." : "Verification unlocks when Lidar-02 is on station"}
          </div>
        </div>
        <div
          style={{
            padding: "5px 10px",
            borderRadius: radius.control,
            background: investigationElapsed >= 10 ? "rgba(245,166,35,0.12)" : "rgba(0,200,255,0.08)",
            border: `1px solid ${investigationElapsed >= 10 ? "rgba(245,166,35,0.3)" : "rgba(0,200,255,0.18)"}`,
            fontFamily: font.mono,
            fontSize: typeScale.label,
            color: investigationElapsed >= 10 ? T.amber : T.cyan,
            letterSpacing: tracking.telemetry,
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
  railWidth,
  bottomInset,
}: {
  railWidth: number;
  bottomInset: number;
}) {
  const mapLoaded = true;

  return (
    <div
      style={{
        position: "absolute",
        top: PANEL_TOP,
        left: railWidth + SCREEN_INSET + 18,
        right: railWidth + SCREEN_INSET + 18,
        bottom: bottomInset,
        zIndex: layer.centerSurface,
        borderRadius: radius.overlay,
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
              style={{ animation: mapLoaded ? "none" : "pulse 2s infinite", transition: "fill 180ms ease, stroke-width 180ms ease" }}
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
        <div style={{ fontFamily: font.mono, fontSize: typeScale.label, color: T.cyan, letterSpacing: tracking.eyebrow }}>
          ◉ LIVE — Lidar-02 · Grid 4C
        </div>
        <div style={{ fontFamily: font.mono, fontSize: typeScale.label, color: T.textMuted }}>
          Thermal + HD vis · 24 fps · TALON model building...
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
        <span style={{ fontFamily: font.mono, fontSize: typeScale.label, color: T.cyan, letterSpacing: tracking.telemetry }}>
          LIDAR-02 · THERMAL/LiDAR · 37.8821°N 122.4194°W
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {mapLoaded && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(245,166,35,0.12)",
              border: `1px solid rgba(245,166,35,0.3)`,
              padding: "2px 6px",
              borderRadius: radius.dense,
            }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.amber, animation: "pulse 2s infinite" }} />
              <span style={{ fontFamily: font.mono, fontSize: typeScale.label, color: T.amber, fontWeight: typeWeight.bold, letterSpacing: "0.05em" }}>
                CONFIDENCE: 78%
              </span>
            </div>
          )}
          <span style={{ fontFamily: font.mono, fontSize: typeScale.label, color: T.textMuted }}>
            03:48:14 UTC · {mapLoaded ? "TALON MAP BUILDING" : "FEED STABLE"}
          </span>
        </div>
      </div>



    </div>
  );
}


function stripDerived(state: ShellState): ShellDraft {
  const { activePriorities, quickActionStates, actionSurface, workflowPhase, ...draft } = state;
  return draft;
}

function syncState(draft: ShellDraft, investigationElapsed: number): ShellState {
  const operationalException = getOperationalException(draft.scene);
  const actionSurface = deriveQuickActions(draft, investigationElapsed);
  const quickActionStates = [...actionSurface.primary, ...actionSurface.secondary];
  const activePriorities = derivePriorities(draft, quickActionStates);
  return {
    ...draft,
    workflowPhase: getWorkflowPhase(draft.mode),
    operationalException,
    quickActionStates,
    actionSurface,
    activePriorities,
  };
}

/*
 * The disagreement scenes only make sense with a dissent on the record — the
 * contested watch exists *because* the operator overruled TALON. Seeding it
 * here keeps deep links into those scenes coherent instead of showing a
 * contested state with nothing being contested.
 */
function createSceneDissent(scene: SceneId) {
  if (scene !== "monitoring-contested" && scene !== "talon-reraise") return null;
  return createDissent({
    direction: "talon-escalates",
    reason: "False positive",
    operatorNote: "Permitted burn on the north ridge. I have the permit reference and visual on the crew.",
    recordedAt: "03:49:02 UTC",
  });
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
    dissent: createSceneDissent(scene),
    escalationBasis: "talon-recommended",
    rescueProgress: createRescueProgress(),
    operationalException: getOperationalException(scene),
    zoneMargins: {},
    selectedEvacuationRouteId: null,
    talonConversation: { activeChip: null, response: null, voiceState: "idle" },
    activeIncidentId: INCIDENT.id,
    recentActionVerification: createRecentActionVerification(scene),
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

  if (scene === "verify-active" || scene === "authority-notification-ready") {
    base.mode = "verify";
    base.incidentStatus = scene === "authority-notification-ready" ? "notification-ready" : "assessment-ready";
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
    /*
     * Operations is downstream of notify-authorities in the transition table
     * (stateMachine.ts: notify-authorities → contain-recommended sets this).
     * The fixture must agree with the machine, or the packet card reports the
     * 90-second gate as still awaiting a send that already happened.
     */
    base.authoritiesNotified = true;
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
    /*
     * Rescue is only reachable through notify-authorities, so the authority
     * gate is by definition already passed here. Evacuation is a *separate,
     * later* gate — `emergencyEvacuationActive` is the flag that carries it.
     * Reusing `authoritiesNotified` for "pre-evac" overloaded one flag across
     * two gates and made the packet card claim the 90-second gate was still open.
     */
    base.authoritiesNotified = true;
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
        degradedDrone.route = "TALON reroute proposal toward stronger relay corridor";
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
      criticalDrone.note = "Recall prepared - returning to base after acknowledgement";
      criticalDrone.route = "RTB (Return to Base) - supervised recall";
    }
    // Mark a substitute drone as picking up the mission
    const substitutePool = base.drones.filter((d) => d.status === "available" && d.droneClass === "surveillance");
    if (substitutePool[0]) {
      substitutePool[0].status = "en-route";
      substitutePool[0].assignedMission = "perimeter-monitor";
      substitutePool[0].role = "Perimeter monitor (handoff)";
      substitutePool[0].route = "En route - ready for perimeter handoff";
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
  if (scene === "verify-active" || scene === "authority-notification-ready" || scene === "talon-reraise") {
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

function buildActionTransitionContext(draft: ShellDraft): TransitionContext {
  return {
    experienceMode: "free",
    mode: draft.mode,
    authoritiesNotified: draft.authoritiesNotified,
    edgeCaseFired: draft.scene === "rescue-battery-critical",
    dissent: draft.dissent,
    evidenceConfidence: draft.dissent?.talonConfidence ?? 78,
  };
}

function actionAllowed(draft: ShellDraft, event: TransitionEvent): boolean {
  return canTransition(draft.scene, event, buildActionTransitionContext(draft));
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
  ): QuickActionState => createCommandAction({ id, label, status, description, tone, requiresZone });

  switch (draft.scene) {
    // ── Scan scenes: popups own the actions, not the global bar ──────────
    case "baseline":
      return flat([]);

    // alert-command: AlertPopup IS the command surface — action bar shows TALON status only
    case "alert-command":
      return flat([]);

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

    // verify-active: command actions live in the action bar — not duplicated on the feed overlay
    case "verify-active":
      return flat([
        mk("confirm-incident", "Prepare authority packet", "recommended",
          "Authorize TALON to assemble the authority packet after the source conflict is resolved.", T.amber),
        /* Command subtitles ride in a fixed-width pill — state the consequence, don't narrate it. */
        mk("monitor-only", "Decline escalation", "available",
          "Records dissent · contested watch", T.textSecondary),
      ]);

    case "authority-notification-ready":
      return flat([
        mk(
          "notify-authorities",
          "Send Authority Packet",
          draft.authoritiesNotified || !actionAllowed(draft, "notify-authorities") ? "complete" : "recommended",
          "Send TALON packet AUD-90-0847 and start Operations after the human gate.",
          T.red,
        ),
        mk("monitor-only", "Hold escalation", "available",
          "Keep the packet staged without notifying authorities.", T.textSecondary),
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
          "Ingress guidance and live relay support for field personnel.", T.cyan, true),
        mk("stage-residential-evacuation", "Prepare evacuation",
          zoneRequired ? "disabled" : missionByZone("prepare-residential-evacuation") ? "complete" : evacRecommended ? "recommended" : "available",
          "Civilian-guidance drone with speakers and lighting.", T.fire, true),
        mk("relay-field-intel", "Relay field intel",
          zoneRequired ? "disabled" : missionByZone("relay-field-intel") ? "complete" : relayRecommended ? "recommended" : "available",
          "Strengthen command visibility across the selected zone.", T.cyan, true),
      ];

      const secondaryContain = [
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

    // ── Dissent scenes: the command surface holds the commands, panels explain ──
    case "monitoring-contested":
      return flat([
        mk("close-out-contested", "Ground truth arrived — close this out", "recommended",
          "Ground truth has arrived. Reconcile the disagreement and record the verdict.", T.cyan),
      ]);

    // The fork: forward (prepare the packet for the supervisor) and back
    // (decline again, raised threshold) bloom on opposite sides of TALON —
    // neither pre-selected, the disagreement made physical.
    case "talon-reraise":
      return flat(
        [
          mk("confirm-incident", "Prepare authority packet", "recommended",
            "New evidence cleared the override threshold. Prepare the packet for the duty supervisor.", T.amber),
        ],
        [
          mk("monitor-only", "Decline again", "available",
            "Decline the re-raise. TALON returns to contested watch at a raised threshold.", T.textSecondary),
        ],
      );

    // ── Rescue scenes ──────────────────────────────────────────────────────
    case "rescue-nominal":
    case "rescue-battery-critical":
    case "rescue-signal-degraded": {
      if (!draft.emergencyEvacuationActive) {
        const primaryPreEvac = [
          mk("emergency-evacuate", "Start evacuation", "recommended",
            "Activate residential evacuation for the projected path.", T.fire),
          mk("notify-teams", "Notify teams", draft.teamsNotified ? "complete" : "available",
            "Alert and brief all ground teams.", T.textSecondary),
          mk("abort-mission", "Abort mission", "available",
            "Return the prototype to baseline.", T.red),
        ];
        return flat(primaryPreEvac);
      }

      const primaryPostEvac: QuickActionState[] = [
        mk("activate-automatic-route", "Guided evac drone",
          draft.residentialRouteActive ? "complete" : "recommended",
          "Drone-guided egress path with speakers and lighting for residents.", T.cyan),
        mk("deploy-navigation-drone", "Guide personnel",
          draft.responderRouteActive ? "complete" : "recommended",
          "Responder-guidance drone via safest ingress corridor.", T.cyan),
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
      return flat([
        mk("deploy-survey", "Restore visual coverage", "recommended",
          "Deploy a survey asset to replace the unavailable satellite feed.", T.cyan),
        mk("authorize-containment", "Authorize", "disabled",
          "Satellite feed required before authorization.", T.red),
      ]);
    case "network-degraded":
      return flat([
        mk("relay-field-intel", "Restore field relay", "recommended",
          "Deploy a relay anchor to reopen telemetry and command visibility.", T.cyan),
        mk("authorize-containment", "Authorize", "disabled",
          "Network recovery is required before authorization.", T.red),
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
      nextStep: "Activate or maintain guided routes and evacuation support.",
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
    // Snap mission anchors onto the road graph so staging never orphans off-network.
    const snapped = nodePoint(nearestNodeId(fromPixel(anchor.x, anchor.y), "drone"));
    const px = toPixel(snapped);
    return { x: px.x, y: px.y };
  }
  const zone = getZoneById(zoneId);
  const center = fromPixel(zone?.center.x ?? ANOMALY.x, zone?.center.y ?? ANOMALY.y);
  const snapped = nodePoint(nearestNodeId(center, "drone"));
  const px = toPixel(snapped);
  return { x: px.x, y: px.y };
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
  const snapped = spatialCoordinatesForTarget(selected.x, selected.y, coords.x, coords.y, "drone");
  selected.status = mission === "investigation" ? "en-route" : "assigned";
  selected.assignedMission = mission;
  selected.zoneId = zoneId;
  selected.role = roleForMission(mission);
  selected.route = routeForMission(zoneId, mission);
  selected.x = snapped.x;
  selected.y = snapped.y;
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
        zIndex: layer.alert,
        background: surface.scrim,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 180ms cubic-bezier(0.23, 1, 0.32, 1)",
      }}
      role="region"
      aria-live="assertive"
      aria-label="Escalation protocol active. Human response required."
    >
      {/* Main panel */}
      <div style={{
        width: 520,
        maxWidth: "calc(100vw - 32px)",
        background: surface.overlay,
        border: `1px solid ${tint(T.amber, 0.34)}`,
        borderRadius: radius.overlay,
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
            fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold,
            color: T.amber,
          }}>
            TALON escalation protocol
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted }}>
              Awaiting response
            </div>
            <div style={{
              fontFamily: font.mono, fontSize: typeScale.title, fontWeight: typeWeight.bold,
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
              fontFamily: font.sans, fontSize: typeScale.heading, fontWeight: typeWeight.bold,
              color: T.textPrimary, marginBottom: 6, lineHeight: 1.25,
            }}>
              Operator approval unavailable
            </div>
            <div style={{
              fontFamily: font.sans, fontSize: typeScale.body, color: T.textSecondary, lineHeight: 1.6,
            }}>
              TALON has not dispatched any drones. Authorization requires a human decision.
              Routing alert to secondary operator and Regional Commander.
            </div>
          </div>

          {/* Escalation targets */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted,
              fontWeight: typeWeight.semibold, marginBottom: 2,
            }}>
              Routing to
            </div>

            {/* Secondary operator */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px",
              borderRadius: radius.tile,
              background: "rgba(245,166,35,0.07)",
              border: "1px solid rgba(245,166,35,0.2)",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: radius.control,
                background: "rgba(245,166,35,0.14)",
                border: "1px solid rgba(245,166,35,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: typeScale.brand, flexShrink: 0,
              }}>
                <OperationalIcon name="operator" color={T.amber} size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.semibold,
                  color: T.textPrimary, marginBottom: 2,
                }}>
                  B. Singh, Secondary Operator
                </div>
                <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted }}>
                  WATCH-DESK-02 · Altadena Sector
                </div>
              </div>
              <div style={{
                padding: "3px 9px", borderRadius: radius.control,
                background: "rgba(245,166,35,0.14)",
                fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold,
                color: T.amber,
              }}>
                Alerting
              </div>
            </div>

            {/* Regional commander */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px",
              borderRadius: radius.tile,
              background: surface.control,
              border: `1px solid ${border.default}`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: radius.control,
                background: "rgba(229,83,60,0.1)",
                border: "1px solid rgba(229,83,60,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: typeScale.brand, flexShrink: 0,
              }}>
                <OperationalIcon name="operator" color={T.red} size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.semibold,
                  color: T.textPrimary, marginBottom: 2,
                }}>
                  Regional Commander, R. Patel
                </div>
                <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted }}>
                  INC-2024-0847 · Override authority
                </div>
              </div>
              <div style={{
                padding: "3px 9px", borderRadius: radius.control,
                background: "rgba(229,83,60,0.1)",
                fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold,
                color: T.red,
              }}>
                Standby
              </div>
            </div>
          </div>

          {/* Alarm indicator */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 14px",
            borderRadius: radius.control,
            background: "rgba(229,83,60,0.06)",
            border: "1px solid rgba(229,83,60,0.15)",
          }}>
            <OperationalIcon name="alert" color={T.red} size={15} />
            <div style={{
              fontFamily: font.sans, fontSize: typeScale.label, color: "rgba(229,83,60,0.8)", lineHeight: 1.4,
            }}>
              Hard auditory alarm sounding at command center. Station 12 on Ch. 7 notified.
            </div>
          </div>

          {/* Primary operator CTA — they can still take authority */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{
              fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted,
              fontWeight: typeWeight.semibold, marginBottom: 4,
            }}>
              Primary operator can still respond
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={onDispatch}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: radius.tile,
                  background: "rgba(245,166,35,0.16)",
                  border: "1px solid rgba(245,166,35,0.4)",
                  color: T.amber,
                  fontFamily: font.sans,
                  fontSize: typeScale.body,
                  fontWeight: typeWeight.bold,
                  cursor: "pointer",
                }}
              >
                Dispatch Scout
              </button>
              <button
                type="button"
                onClick={onOperatorResponds}
                style={{
                  padding: "11px 14px",
                  borderRadius: radius.tile,
                  background: surface.control,
                  border: `1px solid ${border.default}`,
                  color: T.textPrimary,
                  fontFamily: font.sans,
                  fontSize: typeScale.body,
                  fontWeight: typeWeight.semibold,
                  cursor: "pointer",
                }}
              >
                Resume review
              </button>
              <button
                type="button"
                onClick={onDismiss}
                style={{
                  padding: "11px 16px",
                  borderRadius: radius.tile,
                  background: surface.control,
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: T.textSecondary,
                  fontFamily: font.sans,
                  fontSize: typeScale.body,
                  fontWeight: typeWeight.semibold,
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

