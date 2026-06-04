import type {
  CommandGate,
  CommandPriority,
  CommandRiskLevel,
  QuickActionId,
  QuickActionState,
  QuickActionStatus,
} from "../tokens";
import { T } from "../tokens";
import { COMMAND_LABELS } from "./microcopy";

export interface CommandDefinition {
  id: QuickActionId;
  label: string;
  shortLabel: string;
  intent: string;
  priority: CommandPriority;
  riskLevel: CommandRiskLevel;
  gate: CommandGate;
  modal?: "mission" | "authority" | "handover" | "abort" | "none";
  disabledReason?: string;
  blockedBy?: string[];
  agentEvidence?: string[];
  receipt?: string;
  tone: string;
}

const definition = (
  id: QuickActionId,
  patch: Omit<CommandDefinition, "id" | "label"> & { label?: string },
): CommandDefinition => ({
  id,
  label: patch.label ?? COMMAND_LABELS[id],
  ...patch,
});

export const COMMAND_DEFINITIONS: Record<QuickActionId, CommandDefinition> = {
  "surface-alert": definition("surface-alert", {
    shortLabel: "Alert",
    intent: "Surface the investigation interrupt.",
    priority: "primary",
    riskLevel: "low",
    gate: "none",
    tone: T.amber,
  }),
  "dispatch-scout": definition("dispatch-scout", {
    shortLabel: "Dispatch",
    intent: "Send investigation drone to confirm evidence.",
    priority: "primary",
    riskLevel: "medium",
    gate: "confirm",
    tone: T.amber,
    agentEvidence: ["Sensor Fusion", "Drone Perception"],
  }),
  "open-verification": definition("open-verification", {
    shortLabel: "Verify",
    intent: "Open corroborated evidence for operator review.",
    priority: "primary",
    riskLevel: "medium",
    gate: "none",
    tone: T.amber,
  }),
  "monitor-only": definition("monitor-only", {
    shortLabel: "Monitor",
    intent: "Keep the incident under observation without escalation.",
    priority: "secondary",
    riskLevel: "low",
    gate: "none",
    tone: T.textSecondary,
  }),
  "confirm-incident": definition("confirm-incident", {
    shortLabel: "Prepare",
    intent: "Prepare the authority packet after operator confirmation.",
    priority: "primary",
    riskLevel: "high",
    gate: "human-approval",
    tone: T.amber,
    agentEvidence: ["Sensor Fusion", "Fire Behavior", "Historical Verification", "Governance"],
  }),
  "deploy-survey": definition("deploy-survey", {
    shortLabel: "Survey",
    intent: "Assign surveillance coverage to the selected zone.",
    priority: "primary",
    riskLevel: "medium",
    gate: "confirm",
    modal: "mission",
    tone: T.cyan,
  }),
  "stage-perimeter": definition("stage-perimeter", {
    shortLabel: "Perimeter",
    intent: "Stage thermal and LiDAR perimeter coverage.",
    priority: "primary",
    riskLevel: "high",
    gate: "confirm",
    modal: "mission",
    tone: T.red,
  }),
  "stage-responder-guidance": definition("stage-responder-guidance", {
    shortLabel: "Responders",
    intent: "Prepare responder ingress guidance.",
    priority: "primary",
    riskLevel: "high",
    gate: "confirm",
    modal: "mission",
    tone: T.yellow,
  }),
  "stage-residential-evacuation": definition("stage-residential-evacuation", {
    shortLabel: "Evac prep",
    intent: "Prepare residential evacuation support.",
    priority: "primary",
    riskLevel: "critical",
    gate: "confirm",
    modal: "mission",
    tone: T.fire,
  }),
  "relay-field-intel": definition("relay-field-intel", {
    shortLabel: "Relay",
    intent: "Strengthen command visibility across the selected zone.",
    priority: "primary",
    riskLevel: "medium",
    gate: "confirm",
    modal: "mission",
    tone: T.cyan,
  }),
  "notify-authorities": definition("notify-authorities", {
    shortLabel: "Send packet",
    intent: "Notify authorities with the TALON evidence packet.",
    priority: "primary",
    riskLevel: "critical",
    gate: "human-approval",
    modal: "authority",
    receipt: "AUD-90-0847",
    tone: T.red,
    agentEvidence: ["Notification Brief", "Governance"],
  }),
  "notify-teams": definition("notify-teams", {
    shortLabel: "Notify teams",
    intent: "Brief and stage ground teams.",
    priority: "secondary",
    riskLevel: "high",
    gate: "confirm",
    modal: "authority",
    tone: T.textSecondary,
  }),
  "mark-high-risk": definition("mark-high-risk", {
    shortLabel: "Mark risk",
    intent: "Mark a zone as high risk for planning.",
    priority: "overflow",
    riskLevel: "medium",
    gate: "none",
    tone: T.amber,
  }),
  "override-plan": definition("override-plan", {
    shortLabel: "Override",
    intent: "Record an operator plan override.",
    priority: "secondary",
    riskLevel: "high",
    gate: "confirm",
    tone: T.amber,
  }),
  "open-degraded": definition("open-degraded", {
    shortLabel: "Fallback",
    intent: "Open degraded evidence fallback.",
    priority: "secondary",
    riskLevel: "medium",
    gate: "none",
    tone: T.amber,
  }),
  "authorize-containment": definition("authorize-containment", {
    shortLabel: "Authorize",
    intent: "Authorize the staged operations plan.",
    priority: "primary",
    riskLevel: "critical",
    gate: "hold",
    tone: T.red,
  }),
  "emergency-evacuate": definition("emergency-evacuate", {
    shortLabel: "Evacuate",
    intent: "Start residential evacuation support.",
    priority: "primary",
    riskLevel: "critical",
    gate: "human-approval",
    modal: "mission",
    tone: T.fire,
  }),
  "activate-automatic-route": definition("activate-automatic-route", {
    shortLabel: "Guide route",
    intent: "Activate guided evacuation route support.",
    priority: "primary",
    riskLevel: "critical",
    gate: "confirm",
    modal: "mission",
    tone: T.cyan,
  }),
  "deploy-navigation-drone": definition("deploy-navigation-drone", {
    shortLabel: "Guide personnel",
    intent: "Deploy responder navigation drone.",
    priority: "primary",
    riskLevel: "high",
    gate: "confirm",
    modal: "mission",
    tone: T.yellow,
  }),
  "deploy-backup": definition("deploy-backup", {
    shortLabel: "Backup",
    intent: "Deploy backup asset for degraded coverage.",
    priority: "primary",
    riskLevel: "high",
    gate: "confirm",
    modal: "mission",
    tone: T.amber,
  }),
  "acknowledge-exception": definition("acknowledge-exception", {
    shortLabel: "Acknowledge",
    intent: "Acknowledge the active operational exception.",
    priority: "secondary",
    riskLevel: "medium",
    gate: "confirm",
    tone: T.amber,
  }),
  "abort-mission": definition("abort-mission", {
    shortLabel: "Abort",
    intent: "Abort mission state and return to baseline.",
    priority: "destructive",
    riskLevel: "critical",
    gate: "confirm",
    modal: "abort",
    tone: T.red,
  }),
  "stand-down": definition("stand-down", {
    shortLabel: "Stand down",
    intent: "Close the operation and return to passive monitoring.",
    priority: "overflow",
    riskLevel: "medium",
    gate: "confirm",
    tone: T.teal,
  }),
  "shift-handover": definition("shift-handover", {
    shortLabel: "Handover",
    intent: "Transfer operational authority to the next operator.",
    priority: "secondary",
    riskLevel: "medium",
    gate: "confirm",
    modal: "handover",
    tone: T.amber,
  }),
};

export function getCommandDefinition(id: QuickActionId): CommandDefinition {
  return COMMAND_DEFINITIONS[id];
}

export function createCommandAction(input: {
  id: QuickActionId;
  label?: string;
  status: QuickActionStatus;
  description?: string;
  tone?: string;
  requiresZone?: boolean;
}): QuickActionState {
  const command = getCommandDefinition(input.id);
  return {
    id: input.id,
    label: input.label ?? command.label,
    status: input.status,
    description: input.description ?? command.intent,
    tone: input.tone ?? command.tone,
    requiresZone: input.requiresZone,
  };
}
