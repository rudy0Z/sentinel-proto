import type { ActionSurface, QuickActionId, QuickActionState } from "../tokens";
import { GATED_ACTIONS } from "./stateMachine";

/*
 * Staged-command expiry. The constitution (vault 04 §HITL) says Class-2 staged
 * actions expire back to watch — expiry is logged, and expiry is never
 * execution. The staged surface in this product is a gate-able recommendation
 * the operator has not acted on; after its TTL it renders as merely available
 * (the operator can still choose it) and the expiry lands in the activity
 * ledger. Nothing fires.
 */

export const DEFAULT_STAGED_TTL_MS = 45_000;

/** `?stagedTtlMs=` shortens the expiry window for verification flows. 0 disables. */
export function readStagedTtlMs(params: URLSearchParams): number {
  const raw = params.get("stagedTtlMs");
  if (raw === null) return DEFAULT_STAGED_TTL_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_STAGED_TTL_MS;
}

/*
 * syncState re-derives the action surface on every update, so expiry is
 * enforced here at the derivation layer: an expired gate-able action can never
 * present as "recommended" again for the rest of the scene. New scenes start
 * with a clean slate (createSceneState does not carry expiredActions).
 */
export function demoteExpiredActions(
  surface: ActionSurface,
  expired: ReadonlySet<QuickActionId>,
): ActionSurface {
  const demote = (actions: QuickActionState[]): QuickActionState[] =>
    actions.map((action) =>
      expired.has(action.id) && action.status === "recommended" && GATED_ACTIONS.has(action.id)
        ? { ...action, status: "available" as const }
        : action,
    );
  return { ...surface, primary: demote(surface.primary), secondary: demote(surface.secondary) };
}
