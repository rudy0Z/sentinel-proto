import type { PanelVariant, ShellState } from "../tokens";
import { hasOperationalException } from "./exceptions";

export type PanelRail = "left" | "right";
export type PanelContext = "baseline" | "intelligence" | "operations" | "exception";
export type PanelSlotId =
  | "intel"
  | "fleet"
  | "activity"
  | "investigation"
  | "talon"
  | "priority"
  | "ground-teams"
  | "exceptions";

export interface PanelLayoutSlot {
  id: PanelSlotId;
  rail: PanelRail;
  priority: number;
  variant: PanelVariant;
  minHeight: number;
  visibility: "always" | "contextual";
  context: PanelContext;
  scrollBehavior: "panel" | "content";
  flex: number;
}

export interface PanelLayout {
  left: PanelLayoutSlot[];
  right: PanelLayoutSlot[];
}

const slot = (input: PanelLayoutSlot): PanelLayoutSlot => input;

export function getPanelLayout(state: ShellState): PanelLayout {
  const isBaseline = state.scene === "baseline";
  const isException = hasOperationalException(state.scene);
  const isIntelligence = state.workflowPhase === "intelligence";

  const left: PanelLayoutSlot[] = [
    slot({
      id: "intel",
      rail: "left",
      priority: 1,
      variant: "standard",
      minHeight: 180,
      visibility: "always",
      context: isBaseline ? "baseline" : isIntelligence ? "intelligence" : "operations",
      scrollBehavior: "panel",
      flex: 4,
    }),
    slot({
      id: "fleet",
      rail: "left",
      priority: 2,
      variant: state.workflowPhase === "operations" ? "dense" : "standard",
      minHeight: 150,
      visibility: "always",
      context: state.workflowPhase,
      scrollBehavior: "panel",
      flex: 3.2,
    }),
    slot({
      id: "activity",
      rail: "left",
      priority: 3,
      variant: "compact",
      minHeight: 120,
      visibility: "always",
      context: state.workflowPhase,
      scrollBehavior: "panel",
      flex: 2.8,
    }),
  ];

  if (isException) {
    return {
      left,
      right: [
        slot({
          id: "exceptions",
          rail: "right",
          priority: 1,
          variant: state.scene === "infrastructure-total-loss" ? "takeover" : "focus",
          minHeight: 220,
          visibility: "contextual",
          context: "exception",
          scrollBehavior: "panel",
          flex: 3.6,
        }),
        slot({
          id: "talon",
          rail: "right",
          priority: 2,
          variant: "compact",
          minHeight: 150,
          visibility: "always",
          context: "exception",
          scrollBehavior: "panel",
          flex: 3,
        }),
        slot({
          id: "priority",
          rail: "right",
          priority: 3,
          variant: "compact",
          minHeight: 120,
          visibility: "always",
          context: "exception",
          scrollBehavior: "panel",
          flex: 2.2,
        }),
        slot({
          id: "ground-teams",
          rail: "right",
          priority: 4,
          variant: "compact",
          minHeight: 110,
          visibility: "always",
          context: "exception",
          scrollBehavior: "panel",
          flex: 1.6,
        }),
      ],
    };
  }

  if (isIntelligence) {
    const right: PanelLayoutSlot[] = [];
    if (state.scene === "investigation-pending") {
      right.push(slot({
        id: "investigation",
        rail: "right",
        priority: 1,
        variant: "compact",
        minHeight: 72,
        visibility: "contextual",
        context: "intelligence",
        scrollBehavior: "content",
        flex: 0.8,
      }));
    }
    right.push(
      slot({
        id: "talon",
        rail: "right",
        priority: 2,
        variant: "focus",
        minHeight: 260,
        visibility: "always",
        context: isBaseline ? "baseline" : "intelligence",
        scrollBehavior: "panel",
        flex: isBaseline ? 3.8 : state.scene === "authority-notification-ready" ? 7.8 : state.scene === "investigation-pending" ? 5.8 : 6.2,
      }),
      slot({
        id: "priority",
        rail: "right",
        priority: 3,
        variant: "standard",
        minHeight: 150,
        visibility: "always",
        context: isBaseline ? "baseline" : "intelligence",
        scrollBehavior: "panel",
        flex: isBaseline ? 3.4 : state.scene === "authority-notification-ready" ? 1.7 : 2.6,
      }),
      slot({
        id: "ground-teams",
        rail: "right",
        priority: 4,
        variant: "compact",
        minHeight: 110,
        visibility: "always",
        context: isBaseline ? "baseline" : "intelligence",
        scrollBehavior: "panel",
        flex: isBaseline ? 2.8 : state.scene === "authority-notification-ready" ? 1.1 : 1.8,
      }),
    );
    return { left, right };
  }

  return {
    left,
    right: [
      slot({
        id: "talon",
        rail: "right",
        priority: 1,
        variant: "compact",
        minHeight: 150,
        visibility: "always",
        context: "operations",
        scrollBehavior: "panel",
        flex: 2.4,
      }),
      slot({
        id: "priority",
        rail: "right",
        priority: 2,
        variant: "focus",
        minHeight: 220,
        visibility: "always",
        context: "operations",
        scrollBehavior: "panel",
        flex: 4.6,
      }),
      slot({
        id: "ground-teams",
        rail: "right",
        priority: 3,
        variant: "standard",
        minHeight: 170,
        visibility: "always",
        context: "operations",
        scrollBehavior: "panel",
        flex: 3,
      }),
    ],
  };
}
