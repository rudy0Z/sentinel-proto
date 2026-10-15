/*
 * TALON UI-intent catalog — the permissioned way TALON "controls the dashboard"
 * (docs/redesign-2026/03 R6, golden rule 2).
 *
 * An intent is a PROPOSAL about information, never a command: the engine
 * validates it exactly like a scene transition, the UI renders it as a
 * dismissible card with an undo receipt, and every accept/dismiss lands in the
 * activity ledger. TALON changes what the operator sees and how it is framed —
 * never where the buttons are, and never the gates.
 */

import type { SceneId, ShellState } from "../tokens";
import { getZoneById } from "../mockData";

export type TalonIntentKind = "focus_map_zone" | "open_panel" | "pin_evidence" | "compare_plans";

export interface TalonIntent {
  id: string;
  kind: TalonIntentKind;
  /** Zone id, panel id, evidence id, or plan pair depending on kind. */
  target: string;
  reason: string;
  evidenceRefs: string[];
  createdAt: number;
}

export const INTENT_LABELS: Record<TalonIntentKind, string> = {
  focus_map_zone: "Focus map",
  open_panel: "Open panel",
  pin_evidence: "Pin evidence",
  compare_plans: "Compare plans",
};

export const OPENABLE_PANELS = [
  "inspect",
  "map",
  "fleet",
  "activity",
  "talon",
  "priority",
  "ground-teams",
  "exceptions",
  "investigation",
] as const;

export type OpenablePanel = (typeof OPENABLE_PANELS)[number];

/** Validate against live state — the intent equivalent of resolveTransition. */
export function validateIntent(intent: TalonIntent, state: ShellState): { ok: boolean; reason?: string } {
  switch (intent.kind) {
    case "focus_map_zone":
      if (!getZoneById(intent.target)) return { ok: false, reason: `unknown zone "${intent.target}"` };
      return { ok: true };
    case "open_panel":
      if (!(OPENABLE_PANELS as readonly string[]).includes(intent.target)) {
        return { ok: false, reason: `panel "${intent.target}" is not openable` };
      }
      return { ok: true };
    case "pin_evidence":
      if (intent.evidenceRefs.length === 0) return { ok: false, reason: "no evidence referenced" };
      return { ok: true };
    case "compare_plans": {
      const containish: SceneId[] = ["contain-recommended", "contain-alternate", "contain-degraded", "contain-awaiting-teams"];
      if (!containish.includes(state.scene)) return { ok: false, reason: "no containment plan on the table" };
      return { ok: true };
    }
  }
}

/** Scripted stand-ins for what a live TALON session would propose. */
export function seedIntentsForScene(scene: SceneId, now: number): TalonIntent[] {
  if (scene === "verify-active" || scene === "investigation-pending") {
    return [
      {
        id: "intent-pin-evidence",
        kind: "pin_evidence",
        target: "thermal",
        reason: "Keep the thermal cross-bearing pinned while the verify feed runs.",
        evidenceRefs: ["thermal", "drone-visual"],
        createdAt: now,
      },
    ];
  }
  if (scene === "contain-recommended" || scene === "contain-alternate" || scene === "contain-degraded") {
    return [
      {
        id: "intent-focus-zone",
        kind: "focus_map_zone",
        target: "forest-north",
        reason: "The northern perimeter moved — focus the map there while you weigh the plan.",
        evidenceRefs: ["thermal", "terrain"],
        createdAt: now,
      },
    ];
  }
  if (scene === "rescue-partial-evac" || scene === "rescue-nominal") {
    return [
      {
        id: "intent-focus-corridor",
        kind: "focus_map_zone",
        target: "residential-south",
        reason: "Corridor status changed — focus the evacuation side of the map.",
        evidenceRefs: ["structure-road"],
        createdAt: now,
      },
    ];
  }
  return [];
}
