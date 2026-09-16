# Sentinel (FlytBase Sentinel) — Case-Study Research Set

> Internal working documentation for building the portfolio case study (the "deep study" / interface layer). Generated 2026-09-16 from the latest code in this repo. Analysis only — no screens or code were changed.

## What's in this folder

| Doc | Contains |
|---|---|
| [01-user-journey-map.md](01-user-journey-map.md) | The 90-second signal→authority arc (7 stages + emotional curve), the argue-with-the-machine journey, failure journeys, pain→answer index |
| [02-user-flows.md](02-user-flows.md) | 7 flows as mermaid diagrams: intelligence run, both disagreement directions, containment authorization, live-ops exceptions, failure recovery, free exploration |
| [03-empathy-maps.md](03-empathy-maps.md) | Says/Thinks/Does/Feels for operator, relief operator, second authority — plus TALON as designed counterparty. **Inferred, no user research exists** |
| [04-information-architecture.md](04-information-architecture.md) | Routes, experience modes, 20 scenes (SEN-01…22), shell regions, modals, 6 scenarios, navigation rules |
| [05-state-path-catalog.md](05-state-path-catalog.md) | Global state, full transition map (stateDiagram), 26-command gate catalog, dissent model, exceptions, verification receipts, machine audit |

## How to use the IDs

- **SEN-nn** = canonical scene/surface ID (defined in 04 §3, reused everywhere; R/S/9x series for routes, scenarios, prototype surfaces).
- **C-nn** not used here — Sentinel's edge cases live in the transition table and exceptions, not a CSV ledger (contrast: Feul).
- Gates (`none`/`confirm`/`human-approval`/`hold`) and dissent flags are part of the state vocabulary — keep them when quoting.

## Top case-study-ready insights (quotable)

1. **"AI proposes. Operator authorizes."** — the entry screen is the whole product in four words; the 90-second promise ends at a human gate ("TALON never sends it").
2. **The disagreement model is coded, not narrated** (`domain/disagreement.ts`): the human decides · rejection is not deletion (reduced weight + raised re-raise bar: +16/+9/+4/+12 by stated reason) · dissent stays attached (verbatim TALON position preserved, reconciliation answers both directions). Overruling TALON structurally requires a stated reason (`requiresDissent`).
3. **The transition table replaced 15 hardcoded `setScene` call sites** — guards, gates, written reasons per edge, plus `auditMachine()` which surfaced unreachable scenes; fault scenes have no inbound operator edge *by design* and exactly one real way out each (the "button that looked like an exit" bug is documented in code comments).
4. **A copilot with legible body language** — one mark, eight signatures; the aperture blades physically close over the core at human gates: "A particle orb can show an AI thinking; it cannot show an AI being stopped."
5. **Honest failure UX** — exceptions name affected sources/agents, blocked commands, fallback inputs, confidence impact (40%, ±200 m), recovery command, audit text, and spatial uncertainty in one surface.
6. **Verification is part of the UI** — action-outcome records (expected vs observed, deviation states, audit IDs AUD-90-0847) and a runnable machine audit (`npm run verify:machine`) that the case study itself quotes as evidence.
7. **Two embed scenes the case study needs** (per `PORTFOLIO-DIRECTION.md`): **contested watch** and **operator-initiated escalation** must be reachable without DevPanel — flagged as repo work ahead of the next embed sync.

## Positioning alignment (from latest copy draft + direction doc)

- This is **THE deep study** (the seller): the entire UI is AI-driven; the design problem is the human–AI guardrail layer. ~4–5 min read.
- Deliberately NOT about business/economics — that's Feul's job.
- Copy to satisfy: `D:\Portfolio\case-study-copy\sentinel-copy-v3.md` (the repo "must be able to back" it — `PORTFOLIO-DIRECTION.md`).
- The 90-second scope discipline applies to the repo too; do not expand the brief.

## Open questions / flags for Rudraksh

1. **Embed reachability:** contested-watch (SEN-11) and operator-initiated-escalation (SEN-05 with dissent, direction B) need `?scene=` reachability without DevPanel — verify before the embed sync (`sync-embeds.mjs sentinel`).
2. **Guided-run beat timings** live in `SentinelShell` effects; extract exact values if the case study quotes the 90-second choreography beat-by-beat.
3. **Gateway stub:** session telemetry (`useScenarioSession`) and `server/index.ts` exist but are stubs; the case study should keep the scripted-prototype disclosure (`PRODUCT.md` states it plainly — keep that honesty).
4. **Promoted states** (source conflict, awaiting teams, partial evac, handover) are reachable in the table; confirm each has final visual treatment before citing them as shipped.
5. Empathy maps and journey emotions are inferred from authored design intent — reconcile if real operator research exists.
