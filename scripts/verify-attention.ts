/**
 * Attention-arbiter contract check (docs/redesign-2026/03 P4 acceptance).
 * Run: npm run verify:attention
 */
import { arbitrate, deriveAttentionTier, orderForPhase, shouldPop, INTERRUPT_BUDGET, type AttentionSignal } from "../src/app/domain/attention";

let failures = 0;
function check(name: string, condition: boolean) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL  ${name}`);
  } else {
    console.log(`PASS  ${name}`);
  }
}

const now = 1_000_000;
const signal = (over: Partial<AttentionSignal>): AttentionSignal => ({
  id: "s",
  source: "test",
  kind: "evidence",
  requiresAction: false,
  phase: "verify",
  raisedAt: now,
  ...over,
});

// Tier derivation
check("gate → T1", deriveAttentionTier(signal({ kind: "gate" })) === "T1");
check("actionable exception → T1", deriveAttentionTier(signal({ kind: "exception", requiresAction: true })) === "T1");
check("passive exception → T2", deriveAttentionTier(signal({ kind: "exception" })) === "T2");
check("actionable evidence → T2", deriveAttentionTier(signal({ kind: "evidence", requiresAction: true })) === "T2");
check("routine → T4", deriveAttentionTier(signal({ kind: "routine" })) === "T4");

// Pop eligibility: actionable T1/T2 only
check("T1 actionable pops", shouldPop("T1", true, [], now));
check("T2 actionable pops", shouldPop("T2", true, [], now));
check("T3 never pops", !shouldPop("T3", true, [], now));
check("non-actionable never pops", !shouldPop("T1", false, [], now));

// ISA-18.2 budget: ≤2 interrupts / 10 min
const full = [now - 1, now - 2];
check("budget blocks third pop", !shouldPop("T1", true, full, now));
check("budget window expires", shouldPop("T1", true, [now - INTERRUPT_BUDGET.windowMs - 1], now));

// Rule of One: exactly one pop, rest degrade
const a = signal({ id: "a", kind: "gate", requiresAction: true, raisedAt: now });
const b = signal({ id: "b", kind: "exception", requiresAction: true, raisedAt: now - 1000 });
const c = signal({ id: "c", kind: "evidence", requiresAction: true, raisedAt: now - 2000 });
const d = signal({ id: "d", kind: "routine" });
const arb = arbitrate([a, b, c, d], [], now);
check("rule of one: single pop", arb.pop?.id === "a" && arb.popTier === "T1");
check("runner-ups become badges", arb.badges.length === 2 && arb.badges.some((x) => x.signal.id === "b"));
check("routine logged not surfaced", arb.logged.length === 1 && arb.logged[0].id === "d");

// Newest signal wins a tier tie
const tie = arbitrate(
  [signal({ id: "old", kind: "gate", requiresAction: true, raisedAt: now - 500 }), signal({ id: "new", kind: "gate", requiresAction: true, raisedAt: now })],
  [],
  now,
);
check("tie breaks to newest", tie.pop?.id === "new");

// Phase-conditional density: evidence leads in Intelligence, exceptions in Operations
const items = [
  { id: "ev", tier: "T3" as const, kind: "evidence" as const },
  { id: "ex", tier: "T3" as const, kind: "exception" as const },
];
check("intelligence: evidence first", orderForPhase(items, "verify")[0].id === "ev");
check("operations: exception first", orderForPhase(items, "rescue")[0].id === "ex");
check("order deterministic", JSON.stringify(orderForPhase(items, "verify")) === JSON.stringify(orderForPhase(items, "verify")));

if (failures) {
  console.error(`verify:attention — ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify:attention — all checks passed");
