/*
 * Attention arbiter — the "TALON controls information, never furniture" law,
 * made mechanical (docs/redesign-2026/03 §Architecture, 02 §2).
 *
 * Grounded in ANSI/ISA-18.2 alarm-rationalization practice:
 *   - every interrupting signal must be unique, actionable, and require operator response;
 *   - priority distribution skews low (most signals are badges, not interrupts);
 *   - interrupt budget ≤ 2 per 10 minutes (matches info-design ch07:87);
 *   - Rule of One: exactly one interrupting surface at a time — everything else
 *     degrades to a badge or a log entry.
 *
 * Pure functions only: the shell feeds signals + a pop history; the arbiter
 * never touches state. Pops are proposals — the operator can always dismiss.
 */

import type { OperationalMode } from "../tokens";

export type AttentionTier = "T1" | "T2" | "T3" | "T4";

export interface AttentionSignal {
  id: string;
  source: string;
  kind: "gate" | "exception" | "evidence" | "routine";
  /** Does the operator need to do something? Non-actionable signals never pop. */
  requiresAction: boolean;
  phase: OperationalMode;
  raisedAt: number;
}

const TIER_RANK: Record<AttentionTier, number> = { T1: 3, T2: 2, T3: 1, T4: 0 };

export function deriveAttentionTier(signal: AttentionSignal): AttentionTier {
  if (signal.kind === "gate") return "T1";
  if (signal.kind === "exception") return signal.requiresAction ? "T1" : "T2";
  if (signal.kind === "evidence") return signal.requiresAction ? "T2" : "T3";
  return "T4";
}

export const INTERRUPT_BUDGET = { maxPops: 2, windowMs: 600_000 } as const;

/** Only T1/T2 actionable signals may pop, and never past the ISA-18.2 budget. */
export function shouldPop(tier: AttentionTier, requiresAction: boolean, recentPopAts: readonly number[], now: number): boolean {
  if (tier !== "T1" && tier !== "T2") return false;
  if (!requiresAction) return false;
  const recent = recentPopAts.filter((at) => now - at < INTERRUPT_BUDGET.windowMs).length;
  return recent < INTERRUPT_BUDGET.maxPops;
}

export interface Arbitration {
  /** The single interrupting surface, if any survives the budget. */
  pop: AttentionSignal | null;
  popTier: AttentionTier | null;
  /** Everything else that still deserves a badge on its spine lip. */
  badges: Array<{ signal: AttentionSignal; tier: AttentionTier }>;
  /** T4 noise — logged, never surfaced as a badge. */
  logged: AttentionSignal[];
}

/**
 * Rule of One arbitration. Ties break toward the newer signal (a fresh gate
 * outranks a stale banner for the same tier).
 */
export function arbitrate(signals: readonly AttentionSignal[], recentPopAts: readonly number[], now: number): Arbitration {
  const scored = signals
    .map((signal) => ({ signal, tier: deriveAttentionTier(signal) }))
    .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || b.signal.raisedAt - a.signal.raisedAt);

  let pop: AttentionSignal | null = null;
  let popTier: AttentionTier | null = null;
  const badges: Arbitration["badges"] = [];
  const logged: AttentionSignal[] = [];

  for (const { signal, tier } of scored) {
    if (!pop && shouldPop(tier, signal.requiresAction, recentPopAts, now)) {
      pop = signal;
      popTier = tier;
      continue;
    }
    if (tier === "T4" || (tier === "T3" && !signal.requiresAction)) {
      logged.push(signal);
      continue;
    }
    badges.push({ signal, tier });
  }
  return { pop, popTier, badges, logged };
}

/**
 * Phase-conditional density (docs/redesign-2026/02 §4.4): spine lips are
 * ordered by what the phase makes load-bearing — evidence leads in
 * Intelligence, exceptions/blocking signals lead in Operations. Same-tier
 * signals keep a stable order (deterministic for verify:routes evidence).
 */
export function orderForPhase(
  items: ReadonlyArray<{ id: string; tier: AttentionTier; kind: AttentionSignal["kind"] }>,
  phase: OperationalMode,
): Array<{ id: string; tier: AttentionTier; kind: AttentionSignal["kind"] }> {
  const rank = (item: { tier: AttentionTier; kind: AttentionSignal["kind"] }): number => {
    const base = TIER_RANK[item.tier];
    if (phase === "scan" || phase === "verify") {
      return item.kind === "evidence" ? base + 0.5 : base;
    }
    // operations: exceptions and gates outrank evidence of the same tier
    return item.kind === "evidence" ? base - 0.25 : base + 0.25;
  };
  return [...items]
    .map((item) => ({ item, r: rank(item) }))
    .sort((a, b) => b.r - a.r || a.item.id.localeCompare(b.item.id))
    .map(({ item }) => item);
}
