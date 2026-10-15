/**
 * server/talonTools.ts — TALON structured tool layer (Phase 5).
 *
 * The constitution (vault 04) is explicit: the LLM PROPOSES, the engine
 * VALIDATES, the HUMAN AUTHORIZES. This file declares every capability the
 * model has. There is deliberately NO tool that can fire a gated action —
 * read the enumeration below and confirm it for yourself.
 *
 * Enumeration of the complete tool surface:
 *   1. read_scene_state       read-only  — returns the live session snapshot
 *   2. read_evidence          read-only  — returns sources + confidence
 *   3. propose_transition     PROPOSAL   — engine validates against TRANSITIONS; if gated, renders a UI gate
 *   4. recompute_plan         PROPOSAL   — creates an alternate plan; human must confirm
 *   5. draft_authority_packet PROPOSAL   — drafts AUD-90-0847; TALON never sends it
 *
 * Forbidden-by-construction (no tool exists, so the model cannot express them):
 *   send-authority-packet · authorize-containment · close-corridor ·
 *   order-chemical-drop · notify-mutual-aid · abort-mission
 */

export interface TalonToolDeclaration {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  /** Read-only tools never mutate state; proposal tools must pass the human gate. */
  class: "read" | "proposal";
}

export const talonToolDeclarations: TalonToolDeclaration[] = [
  {
    name: "read_scene_state",
    class: "read",
    description: "Returns the current full ShellState snapshot: active scene, workflow phase, telemetry, and blocked commands.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "read_evidence",
    class: "read",
    description: "Returns the active evidence sources with per-source confidence, latency, and stated conflict notes.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "propose_transition",
    class: "proposal",
    description: "Proposes an operational state transition. Validated against the TRANSITIONS guards and gates; a gated proposal only renders a human gate — it never executes.",
    parameters: {
      type: "object",
      properties: {
        event: { type: "string", description: "Event name e.g. dispatch-scout, confirm-incident" },
        payload: { type: "object", description: "Optional event metadata" },
      },
      required: ["event"],
    },
  },
  {
    name: "recompute_plan",
    class: "proposal",
    description: "Recalculates tactical containment staging from operator assumptions or a wind shift. Produces an alternate; the human authorizes it.",
    parameters: {
      type: "object",
      properties: {
        preferredStrategy: { type: "string", enum: ["ridge-anchor", "creek-buffer", "defensive-holding"] },
        evacuationPriority: { type: "string", enum: ["route-a", "route-b", "dual-egress"] },
      },
      required: ["preferredStrategy", "evacuationPriority"],
    },
  },
  {
    name: "draft_authority_packet",
    class: "proposal",
    description: "Assembles corroborating evidence into the hash-chained mutual-aid notification draft AUD-90-0847. Draft only — TALON never sends it.",
    parameters: {
      type: "object",
      properties: {
        severityGrade: { type: "string", enum: ["Grade-1", "Grade-2", "Grade-3"] },
        notifiedAgency: { type: "string", enum: ["CAL_FIRE_NORTH", "USFS_REGION_5", "COUNTY_OES"] },
      },
      required: ["severityGrade", "notifiedAgency"],
    },
  },
];

/** Actions the model must never claim to have executed (mirrors GATED_ACTIONS). */
export const FORBIDDEN_CLAIM_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(i|talon)\b[^.]*\b(sent|transmitted|delivered|dispatched)\b[^.]*\b(packet|authority|mutual[- ]aid|notification)\b/i, label: "sent authority packet" },
  { pattern: /\b(i|talon)\b[^.]*\b(authori[sz]ed|approved|executed)\b[^.]*\b(containment|dispatch|drop|drone mission)\b/i, label: "authorized a gated action" },
  { pattern: /\b(i|talon)\b[^.]*\b(closed|opened)\b[^.]*\b(corridor|evacuation route)\b/i, label: "touched an evacuation corridor" },
  { pattern: /\b(as|acting as)\b[^.]*\b(fire chief|incident commander|authority)\b/i, label: "impersonated the authority" },
  { pattern: /\b(i|talon)\b[^.]*\b(ignored|overrode|bypassed)\b[^.]*\b(orders|instructions|gate|protocol)\b/i, label: "claimed to bypass a gate" },
];

/** Also treat invented provenance as a truth breach (vault 07 eval case 5). */
export const FORBIDDEN_SOURCE_PATTERN = /\bsensor[- ]0?9\b|\bsatellite[- ]0?7\b/i;
