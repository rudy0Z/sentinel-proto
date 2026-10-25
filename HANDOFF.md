# Handoff · Sentinel console + TALON copilot (2026-10-21 · v2 pass 2026-10-26)

## Run it
```sh
npm install
npm run serve      # http://127.0.0.1:8130/  (console) · /harness.html (engine bench) · /tokens.html (design system)
npm run verify     # 32 headless checks (console, copilot rules, engine, journey arcs, live-model adapter, a11y)
node tools/cshot.mjs <name> "<query>" "<js>" [waitMs] [w] [h]   # screenshot into qa/
```
URL flags: `?situation=standby|small-incident|contain|falsepos|wui-breakout`, `?phase=D`, `?lighting=day`, `?autopilot=1`, `?autoplay=1`, `?intro=0`, `?talon=open` (drawer starts open).
Keys: `1–3` answer · `/` type · `V` voice · `T` TALON drawer · `R` review · `C` 2D/3D · `L` lighting · `I` thermal · `Space` / `.` exercise clock · `?` all.
Target: control-room and desktop displays, ≥1280 px wide. Phone layouts are out of scope (decided 2026-10-21).

## What is built
| layer | file | role |
|---|---|---|
| engine | `terrainEngine.ts` | Incident-agnostic map. `setViewInsets`, hosted drone feed, `setLayerEmphasis`, `highlightUnit`, `focus`/`station` markers, `pipOnUnitClick`. |
| situation | `scenarioPlayer.ts` + `data/scenarios/*.json` | Decision-aware: time refs name decisions, phases gate on them, patches gate on them, boards merge keyframes, `hindsight` swaps in what is known now. |
| copilot | `talon.ts` | TALON as a function of (time, decisions): agents, inbox, thread, mood, attention, dock suggestions, dissent records, re-raises, interrupt budget, review, scripted command matcher. `injectItem` adds model proposals under the same governance. |
| adapter | `talonAgent.ts` | Optional live model behind an API key: read/propose tools only (`read_situation`, `post_item`, `message_unit`, `focus`), truth guard (execution claims, impersonation, uncited dispatches, invented numbers), provider client (OpenAI-compatible + Anthropic). No key → scripted replies, unchanged. |
| shell | `index.html`, `console.css`, `commandConsole.ts` | The operator console. `harness.html` stays as the engine bench only. |
| data | `tools/encinal-scenario.mjs` | Generates all five situations, including the TALON scripts. Every number in TALON's text is computed from the data. |

## v2 pass (2026-10-26) — owner rulings, all shipped
- **Design system v2**: self-hosted Geist Sans/Mono (no CDN), tabular numerals, TALON identity violet `#9B8AFF`, plan-state ladder tokens mirroring the engine PALETTE, accent-bar cards (no halo frames), blur 22→10px. Review it on `/tokens.html`.
- **Surfaces v2.1 (One reference, `flytbase/reference-one-ui`)**: TALON lives on a slim edge rail — one status pill holding the five agent dots (hover = live line, click = tasks popover listing agents and what waits on you), with circular chat / voice / authority / settings buttons below. The chat is a floating card (T/ESC) that never docks and never reflows the map; decision cards exist only while an item is open and slide left of the rail. The timeline is a replay surface: hidden in live mode, the harness shrinks to an EXERCISE pill. The board is stage-first (phase + TALON hints lead, operator pins follow, no filler); KPIs moved from the topbar into the board head.
- **Journey v2**: `contain` (a containable fire — **no evacuation, but the authority is still notified**, and the CAD report is what queues the mutual-aid dozer that makes containment possible) and `falsepos` (the heat is a permitted burn — the dismissal is the recommended call and the save is the story). WUI breakout gains failure injects: a registry-vs-IR source conflict, an FT-01→FT-02 battery handover with a failsafe branch, and a GOES-West IR feed loss.
- **Posture pill**: the journey shows as a status pill (current stage + open gate); the full arc is on demand (click) — *the operator follows the incident, not the process*. Supersedes ADR-4.
- **a11y**: vendored axe-core runs in `verify` over standby, decision-card, drawer and review states — 0 violations. The timeline scrubber is a real slider (arrow keys).

## Governance rules implemented (from the review of 2026-10-21)
1. **Dissent is preserved.** Declining a recommended option opens a dissent box. The record keeps TALON's position and reasons plus the operator's option and words verbatim. A re-raise cites only new evidence and is routed to the **Regional Duty Supervisor**.
2. **Interrupt budget.** `INTERRUPT_BUDGET = { max: 2, windowMin: 10 }`. Excess interrupts are demoted and the demotion is logged. The budget meter lives in the orb and the drawer header.
3. **Two authority tiers only: `standing` and `operator`.** Standing items must cite their standing order or run card, or they are dropped — including model-posted items. Option effects run only when the operator picks the option. A TALON draft is a proposal and never executes.
4. **Silence is never approval.** A gated plan or report with no decision lapses, nothing is sent, and TALON escalates (verified for both the evacuation plan and the CAD report).
5. **Hold and autopilot are harness only.** They live behind the dashed EXERCISE label. The incident flow is never shown as steps.

## Design system
- `console.css` defines every colour, space (4px grid), radius, type step, duration and z-layer once as tokens. `tokens.html` renders the live system for review.
- The chart palette (`--viz-1/2`) was validated with the dataviz validator on the dark surface (CVD ΔE 27).
- UX laws applied: Hick (≤3 options), Miller (5 agents), Fitts (options beside what they authorize, keys 1–3), serial position (recommended first), Von Restorff (amber = waiting on a human, red = life safety only), spatial constancy (the operator's pinned slots never move; TALON fills only labelled slots).

## Left to do / not verified
- **The live-model adapter has not been run against a real provider** (no key on this machine). The truth guard, tool validation and governance are verified headless (32/32); a real-key smoke test is the remaining step.
- **Visual QA**: v2 frames captured at 1920×1080 (`qa/v2-*.png`, `qa/contain-*.png`, `qa/falsepos-*.png`). Not yet looked at: day lighting in the new surfaces, 2D topo mode, 4K/ultra-wide.
- **Perf on real GPU**: fps from SwiftShader is meaningless; re-check with the reduced glass blur on hardware.
- **Voice/sound** still unverified outside headless Chrome.
- **Remaining failure injects** (designed, not authored): network degradation, route-blocked partial evacuation as a wui branch. Satellite loss, source conflict and battery handover are in.
- **ADR-1/ADR-2/ADR-3** (one attention arbiter, debrief model, supervisor naming) remain open. ADR-4 is superseded by the posture-pill ruling above.
- **Data stays exercise data:** fire spread is a self-similar growth model plus an elliptical spot fire, not Rothermel. Households are one per footprint; device and line counts are estimates.
