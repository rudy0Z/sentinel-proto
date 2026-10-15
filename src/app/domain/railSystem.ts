/*
 * ─── Rail system v3 — the scalable panel registry + readiness lifecycle ────
 * docs/redesign-2026/14 (canonical): the One-style edge rails are DATA-driven.
 * A panel is a registry entry, not a fixed slot — rails, dots, lips, peek
 * priority, keyboard order, and a11y labels all derive from RAIL_PANELS.
 * Adding a panel = one entry here + one renderer in components/rails/panels.
 *
 * Readiness (owner's pulse language, doc 14 §1.3):
 *   dormant → computing (TALON session checking/review) → fresh (UI diffs
 *   the content revision) → dormant (seen). Tiers overlay per attention law:
 *   T1 gate, T2 exception/degraded, T3 evidence/computing, T4 watch.
 *
 * Pure domain: state in, panel states out. Never touches React.
 */

import type { ShellState } from "../tokens";
import { GATED_ACTIONS } from "./stateMachine";
import { hasOperationalException } from "./exceptions";
import { getAgentTasks, getEvidenceSources, getTalonSessionView } from "./talon";
import type { TalonSurface } from "./talonSurface";
import type { AttentionTier } from "./attention";
import type { PanelSlotId } from "./panels";
import { getZoneById } from "../mockData";

export type RailSide = "left" | "right";

export type RailIconId =
  | "situation"
  | "map"
  | "fleet"
  | "ledger"
  | "session"
  | "priorities"
  | "teams"
  | "investigation"
  | "exceptions";

export interface RailPanelMeta {
  id: PanelSlotId;
  side: RailSide;
  title: string;
  /** Collapsed tooltip abbreviation. */
  abbr: string;
  icon: RailIconId;
  /** Lower renders higher in the rail stack. */
  order: number;
  /** Contextual panels register only while the predicate holds (scene-driven). */
  contextual?: (state: ShellState) => boolean;
  /** Gate-bearing panels mirror the staged-gate T1 dot. */
  gateBearing?: boolean;
}

export const RAIL_PANELS: RailPanelMeta[] = [
  { id: "intel", side: "left", title: "Situation", abbr: "SIT", icon: "situation", order: 1 },
  { id: "map", side: "left", title: "Map & layers", abbr: "MAP", icon: "map", order: 2 },
  { id: "fleet", side: "left", title: "Fleet", abbr: "FLT", icon: "fleet", order: 3 },
  { id: "activity", side: "left", title: "Ledger", abbr: "LOG", icon: "ledger", order: 4 },
  { id: "talon", side: "right", title: "TALON session", abbr: "TALON", icon: "session", order: 1, gateBearing: true },
  { id: "priority", side: "right", title: "Priorities", abbr: "PRI", icon: "priorities", order: 2, gateBearing: true },
  { id: "ground-teams", side: "right", title: "Readiness", abbr: "TEAM", icon: "teams", order: 3 },
  {
    id: "investigation",
    side: "right",
    title: "Investigation",
    abbr: "INV",
    icon: "investigation",
    order: 4,
    contextual: (state) => state.scene === "investigation-pending",
  },
  {
    id: "exceptions",
    side: "right",
    title: "Exceptions",
    abbr: "EXC",
    icon: "exceptions",
    order: 5,
    contextual: (state) => hasOperationalException(state.scene),
  },
];

export type PanelReadiness = "dormant" | "computing" | "gated" | "fault";

export interface RailPanelState {
  meta: RailPanelMeta;
  tier: AttentionTier;
  readiness: PanelReadiness;
  /** One load-bearing live value — collapsed tooltip and peek header. */
  lip: string;
  /** Cheap content fingerprint; a change while closed is a "fresh" event. */
  revision: string;
  pulse: boolean;
}

export interface RailDerivationOptions {
  surface: TalonSurface;
  focusMode?: boolean;
  investigationElapsed?: number;
}

const fingerprint = (parts: Array<string | number | boolean | null | undefined>): string =>
  parts.map((part) => (part === null || part === undefined ? "-" : String(part))).join(":");

/* Mirrors the shell's degraded-team predicate (SentinelShell degradedTeamCount)
 * — HR > 150, visibility < 40m, or deployed. Keep the two in sync or move the
 * shell onto this one. */
function degradedGroundTeams(teams: ShellState["groundTeams"]): number {
  return teams.filter((team) => {
    const hrMatch = team.vitals.match(/HR\s*(\d+)/i);
    const visibilityMatch = team.vitals.match(/VIS\s*(\d+)m/i);
    const hr = hrMatch ? Number(hrMatch[1]) : 100;
    const visibility = visibilityMatch ? Number(visibilityMatch[1]) : 150;
    return hr > 150 || visibility < 40 || team.availability === "deployed";
  }).length;
}

/**
 * The one derivation the rails render from. Everything observable — dot tier,
 * pulse, lip, revision — comes from live shell state so the rails can never
 * disagree with the deck, the orb, or the TALON session.
 */
export function deriveRailPanels(state: ShellState, options: RailDerivationOptions): RailPanelState[] {
  const { surface, focusMode, investigationElapsed = 0 } = options;
  const session = getTalonSessionView(state.talonConversation);
  const computingSession = session.phase === "checking" || session.phase === "review";
  const stagedAction = state.quickActionStates.find(
    (action) => action.status === "recommended" && GATED_ACTIONS.has(action.id),
  );
  const tasks = getAgentTasks(state.scene);
  const runningAgents = tasks.filter((task) => task.status === "running").length;
  const evidence = getEvidenceSources(state.scene);
  const activeEvidence = evidence.filter((source) => source.status === "active").length;
  const lowBatteries = state.drones.filter((drone) => drone.battery < 30).length;
  const degradedTeams = degradedGroundTeams(state.groundTeams);
  const gateWaiting = Boolean(stagedAction) || surface.posture === "gated" || surface.posture === "blocked";

  const panels: RailPanelState[] = [];
  for (const meta of RAIL_PANELS) {
    if (meta.contextual && !meta.contextual(state)) continue;
    if (focusMode && meta.id !== "intel" && meta.id !== "talon") continue;

    let tier: AttentionTier = "T4";
    let readiness: PanelReadiness = "dormant";
    let pulse = false;
    let lip = "";
    let revision = "";

    switch (meta.id) {
      case "intel": {
        lip = state.selectedEntity ? `${state.selectedEntity.type} selected` : `${activeEvidence}/${evidence.length} sources`;
        revision = fingerprint([activeEvidence, evidence.length, state.selectedEntity?.id ?? "-"]);
        readiness = computingSession ? "computing" : "dormant";
        tier = computingSession ? "T3" : "T4";
        break;
      }
      case "map": {
        lip = state.selectedZoneId ? (getZoneById(state.selectedZoneId)?.label ?? "zone focused") : "full view";
        revision = fingerprint([state.selectedZoneId ?? "-", state.surfaceMode]);
        break;
      }
      case "fleet": {
        lip = lowBatteries ? `${lowBatteries} low bat` : `${state.drones.length} assets`;
        revision = fingerprint([state.drones.map((drone) => drone.battery).join("."), state.drones.length]);
        tier = lowBatteries ? "T2" : "T4";
        pulse = lowBatteries > 0;
        break;
      }
      case "activity": {
        lip = `${state.activityLog.length} events`;
        revision = fingerprint([state.activityLog.length]);
        readiness = computingSession ? "computing" : "dormant";
        tier = computingSession ? "T3" : "T4";
        break;
      }
      case "talon": {
        lip = surface.postureLabel;
        revision = fingerprint([session.phase, runningAgents, stagedAction?.id ?? "-"]);
        tier = gateWaiting ? "T1" : runningAgents ? "T3" : "T4";
        readiness = stagedAction ? "gated" : computingSession ? "computing" : "dormant";
        pulse = tier === "T1";
        break;
      }
      case "priority": {
        lip = `${state.activePriorities.length} open`;
        revision = fingerprint([state.activePriorities.length, stagedAction?.id ?? "-"]);
        tier = stagedAction ? "T1" : "T4";
        pulse = Boolean(stagedAction);
        readiness = stagedAction ? "gated" : "dormant";
        break;
      }
      case "ground-teams": {
        lip = degradedTeams ? `${degradedTeams} degraded` : `${state.groundTeams.length} teams`;
        revision = fingerprint([state.groundTeams.length, degradedTeams]);
        tier = degradedTeams ? "T2" : "T4";
        pulse = degradedTeams > 0;
        break;
      }
      case "investigation": {
        lip = "field investigation running";
        revision = fingerprint([Math.floor(investigationElapsed / 5)]);
        tier = "T3";
        break;
      }
      case "exceptions": {
        lip = "degraded — fallback evidence";
        revision = fingerprint([state.scene]);
        tier = state.scene === "infrastructure-total-loss" ? "T1" : "T2";
        readiness = "fault";
        pulse = true;
        break;
      }
    }

    panels.push({ meta, tier, readiness, lip, revision, pulse });
  }
  return panels;
}
