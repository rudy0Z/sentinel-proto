# Review record — Sentinel Flow Atlas (2026-09-21)

Reviewer: orchestrator-run deterministic checks. Four dispatched review/analyst agents were lost to
repeated LLM provider failures (documented in plan.md cluster_bypass_reason); every check below is a
machine-executed command with output shown in the session, not an agent self-report.

## Check results

| # | Check | Method | Result |
|---|---|---|---|
| 1 | Gate counts (none=18, confirm=13, human-approval=8) | Group-Object over extracted transitions | PASS (exact match) |
| 2 | requiresDissent = 3 | filter count | PASS |
| 3 | Transition spot-check, 12 samples from/at/to/gate vs `stateMachine.ts` lines | multi-line segment match (from@line, to/gate within +3) | PASS 12/12 |
| 4 | Evidence spot-greps (10 samples across mockData, exceptions, talonSurface, disagreement, commands, PRODUCT) | exact-line or file grep | PASS 10/10 after 2 citation fixes |
| 5 | Range citations (tokens.ts:552-563 promoted block, routes.ts:5 ScanPage, exceptions.ts satellite case) | printed lines | PASS (evidence ranges correct) |
| 6 | Embedded data integrity in delivered HTML (transitionCount 39, machineEdgesAdded 39, nodes array, ATLAS marker) | string checks on built file | PASS |
| 7 | Referential integrity (every edge endpoint resolves to a node) | merge-atlas.mjs hard check, exit code | PASS (integrity: OK, 97 nodes / 109 edges) |
| 8 | Discrepancy claims: doc 03 "planned, not yet in code" vs tokens.ts implementing them; docs say 26 commands vs 25 in code | direct doc + code reads earlier in session | PASS (both verified, quoted in atlas meta) |
| 9 | Browser render: atlas boot, 6 view switches, search→detail→connections; archify companion boot, chapters, relationship explorer | visible side-panel browser | PASS |
| 10 | archify companion acceptance | `archify.mjs deliver --quality showcase --json` | PASS (ok:true; spec sha256 3a01a06…f62) |

## Corrections made during review
- Two curated evidence line citations off by ≤2 lines (exceptions.ts deploy-survey 17→16; blocked authorize-containment 11→13). Fixed in atlas-base.json, rebuilt (merge integrity OK, HTML rewritten).

## Known limitations (stated, not hidden)
- Scenario→scene mappings for S-03/S-04/S-05 are docs-inferred (edge notes say "docs-inferred mapping").
- Desktop-size rendering not exercised in a real browser (side-panel viewport only); layouts are deterministic.
- 39 transitions captured via regex over stateMachine.ts; 12-sample verification passed, full-table re-derivation not performed.
- scenarioLens filter relies on curated scenario nodeIds (S-01/S-02/S-06 code-anchored via flows F1/F2/F3; others docs-anchored).

## Verdict
SHIP. All machine-checkable gates pass; limitations are documented in the artifact itself (footer ⚠ discrepancies modal + edge notes).

## Continuation round (2026-09-21 22:07+, user: "continue")
| # | Check | Method | Result |
|---|---|---|---|
| 11 | FULL transition table (39/39) from/to/gate vs stateMachine.ts | segment match every row | PASS 39/39, 0 failures |
| 12 | Scenario-to-scene bindings | SentinelShell.tsx:391-438 read: switch(S-01..S-06) setScene + reverse scene-to-scenario effect | PASS — docs-inferred mappings were partially wrong; corrected with code evidence (16 scenario edges rebuilt) |
| 13 | Desktop render 1440x900 + 1920x1080 | Playwright: overflow, node/edge counts, console errors | FOUND REAL BUG: initial graph view rendered empty (view id mismatch graph vs full special case) -> fixed in template; after fix: 97 nodes/117 edges on stage, overflow=false, 0 console errors at both sizes |
| 14 | Desktop interactions | Playwright clicks: node detail, search Enter, lifecycle/F1 tabs, S-04 lens | PASS (detail opens; search 3 hits; lifecycle 23 node groups; F1 13; lens 9) |

New discrepancy recorded in atlas meta (now 3): scenario titles vs code landing scenes (S-03 lands on
contain-alternate; satellite-feed-loss bound to no scenario).

Verdict unchanged: SHIP (now with desktop-size render evidence and 39/39 transition verification).
