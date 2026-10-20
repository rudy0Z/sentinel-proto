/**
 * The fidelity ladder — how the map degrades without ever going blind.
 *
 * ── The problem this solves ────────────────────────────────────────────────
 * In a real initial attack the camera feed dies: smoke rolls across the
 * valley, IR saturates, the uplink drops. Most software treats that as an
 * error state — a black viewport and a message. For a night incident that is
 * the worst possible behaviour, because the moment the operator loses the
 * picture is the moment they most need it.
 *
 * ── The design ─────────────────────────────────────────────────────────────
 * The operator never loses the world, because the world model is always
 * there. What degrades is the *fidelity* of the visual channel:
 *
 *     camera-eo   the drone's optical feed, rendered from the drone's pose
 *          ↓  obscured by smoke, or too dark to expose for
 *     camera-ir   the same world in thermal false-colour
 *          ↓  thermal also saturated
 *     world-model top-down 2D, elevation-shaded, carrying every data layer
 *
 * The world model is not a consolation prize. It is the substrate — always
 * on, and the surface the data layers live on. So the ladder is a change of
 * *viewpoint*, not a loss of information.
 *
 * A downgrade is automatic, because the operator cannot see the smoke they
 * are standing in. An upgrade is the operator's call, because only they know
 * whether conditions have changed.
 *
 * This is a designed state, not a rendering fallback. It is logged, it has a
 * visible indicator, and it is the product's differentiator. See
 * DECISIONS.md §4.2b.
 */

import type { SceneState } from "./scene";

/**
 * The three fidelities, ordered best → worst. The number is the rank: higher
 * means more degraded. The world model is the floor and is always available.
 */
export type VisualTier = "camera-eo" | "camera-ir" | "world-model";

export const TIER_RANK: Record<VisualTier, number> = {
  "camera-eo": 0,
  "camera-ir": 1,
  "world-model": 2,
};

export const TIER_LABEL: Record<VisualTier, string> = {
  "camera-eo": "EO camera",
  "camera-ir": "IR camera",
  "world-model": "World model",
};

/**
 * Obscuration above which EO is no longer usable, and above which thermal
 * is no longer usable.
 *
 * These are authored thresholds, not measured ones — a prototype cannot
 * calibrate sensor performance. They are stated here as numbers so the
 * behaviour is explicit and arguable rather than emergent.
 */
export const EO_OBSCURATION_LIMIT = 0.35;
export const IR_OBSCURATION_LIMIT = 0.8;

/**
 * How much darkness alone degrades the optical channel.
 *
 * A night scene is not the same as an obscured one, so darkness costs less
 * than smoke — but it costs something, and the camera has to expose for it.
 * At the scenario's ambient (0.08) this leaves EO usable under light smoke
 * and drops it when the column arrives.
 */
const NIGHT_OBSCURATION_WEIGHT = 0.3;

export interface FidelityState {
  /** What the operator asked for. */
  requested: VisualTier;
  /** What the scene supports. */
  available: VisualTier;
  /** What is actually being shown. */
  active: VisualTier;
  /** Why the active tier differs from the requested one. Empty when equal. */
  reason: string;
  /** Combined obscuration, 0–1. Smoke and darkness, whichever is worse. */
  obscuration: number;
  /** Whether the operator can attempt a return to a higher tier. */
  canAttemptUpgrade: boolean;
}

/** Combined obscuration from smoke and from darkness. */
export function effectiveObscuration(scene: SceneState): number {
  const smoke = scene.smoke.obscuration;
  const darkness =
    scene.phase === "night" ? (1 - scene.ambient) * NIGHT_OBSCURATION_WEIGHT : 0;
  return Math.max(smoke, darkness);
}

/** The best tier the scene can support right now. */
export function availableTier(scene: SceneState): VisualTier {
  const obs = effectiveObscuration(scene);
  if (obs < EO_OBSCURATION_LIMIT) return "camera-eo";
  if (obs < IR_OBSCURATION_LIMIT) return "camera-ir";
  return "world-model";
}

/**
 * Resolve the active tier.
 *
 * The rule is one line: the active tier is the *worse* of what was asked
 * for and what the scene supports. An operator may deliberately drop to a
 * lower tier, but cannot force a higher one than the conditions allow.
 */
export function resolveFidelity(
  scene: SceneState,
  requested: VisualTier,
): FidelityState {
  const available = availableTier(scene);
  const obs = effectiveObscuration(scene);
  const active: VisualTier =
    TIER_RANK[requested] >= TIER_RANK[available] ? requested : available;

  let reason = "";
  if (active !== requested) {
    if (active === "camera-ir") {
      reason =
        scene.smoke.obscuration >= EO_OBSCURATION_LIMIT
          ? "EO obscured by smoke — switched to thermal"
          : "Too dark to expose the optical channel — switched to thermal";
    } else if (active === "world-model") {
      reason = "Thermal saturated — fell back to the world model";
    }
  }

  return {
    requested,
    available,
    active,
    reason,
    obscuration: obs,
    canAttemptUpgrade: TIER_RANK[active] > TIER_RANK[available],
  };
}

/**
 * Whether a layer needs the world model to be legible.
 *
 * Some data has no photographic representation — a modelled spread cone, an
 * uncertainty envelope, a fuel moisture field. Those are drawn on the world
 * model, so when the camera is up the operator may want the world model
 * alongside it rather than instead of it.
 */
export function prefersWorldModel(layerKind: string): boolean {
  return (
    layerKind === "modeled" ||
    layerKind === "uncertainty" ||
    layerKind === "analysis" ||
    layerKind === "schematic"
  );
}
