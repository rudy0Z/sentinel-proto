# Handoff · Sentinel console + TALON copilot (2026-10-21)

## Run it
```sh
npm install
npm run serve      # http://127.0.0.1:8130/  (console) · /harness.html (engine bench)
npm run verify     # 20 headless checks (console, copilot rules, engine)
node tools/cshot.mjs <name> "<query>" "<js>" [waitMs] [w] [h]   # screenshot into qa/
```
URL flags: `?situation=standby|small-incident|wui-breakout`, `?phase=D`, `?lighting=day`, `?autopilot=1`, `?autoplay=1`, `?intro=0`, `?talon=closed`.
Keys: `1–3` answer · `/` type · `V` voice · `T` TALON · `R` review · `C` 2D/3D · `L` lighting · `I` thermal · `Space` / `.` exercise clock · `?` all.
Target: control-room and desktop displays, ≥1280 px wide. Phone layouts are out of scope (decided 2026-10-21).

## What is built
| layer | file | role |
|---|---|---|
| engine | `terrainEngine.ts` | Incident-agnostic map. New in this pass: `setViewInsets` (map centres between panels), hosted drone feed (`openDronePip(id, {host, bar})`), `setLayerEmphasis` (focus + context), `highlightUnit`, `getUnitPosition`, `getView` + `view` event, `focus`/`station` marker icons, `pipOnUnitClick` option. |
| situation | `scenarioPlayer.ts` + `data/scenarios/*.json` | Decision-aware: time refs can name decisions (`@authorize`, `@answer:item:option+10`), phases can wait on them (`after`), patches gate on them (`when`/`unless`, `rel` tracks), boards merge keyframes, `hindsight` swaps in what is known now. Script decisions by the operator role apply only under the exercise autopilot. |
| copilot | `talon.ts` | TALON as a function of (time, decisions): agents, inbox, thread, mood, attention, dock suggestions, dissent records, re-raises, interrupt budget, review, scripted command matcher. |
| shell | `index.html`, `console.css`, `commandConsole.ts` | The operator console. `harness.html` stays as the engine bench only. |
| data | `tools/encinal-scenario.mjs` | Generates all three situations, including the TALON scripts. Every number in TALON's text is computed from the data. |

## Governance rules implemented (from the review of 2026-10-21)
1. **Dissent is preserved.** Declining a recommended option opens a dissent box. The record keeps TALON's position and reasons plus the operator's option and words verbatim (`talon.dissents()`, Log and Review tabs). A re-raise (`reraise: {of, to, newEvidence}`) cites only new evidence. It is routed to the **Regional Duty Supervisor**. The operator cannot answer it, and the supervisor's ruling is an exercise inject (`by: 'supervisor'`, `atRef`).
2. **Interrupt budget.** `INTERRUPT_BUDGET = { max: 2, windowMin: 10 }`. Excess interrupts are demoted to an ask or a feed entry, and the demotion is logged. The budget meter sits in the TALON header.
3. **Two authority tiers only: `standing` and `operator`.** `standing` items must cite their standing order or run card, or they are dropped. `auto`, `runcard` and `operator+legal` are gone. Option effects run only when the operator picks the option, and `route` only edits an unauthorized proposal. A TALON draft is a proposal and never executes.
4. **Silence is never approval.** A gated plan with no decision lapses, nothing is sent, and TALON escalates (verified).
5. **Hold and autopilot are harness only.** They live in the dashed "EXERCISE" group. The incident flow is never shown as steps in the product surface.

## Design system
- `console.css` defines every colour, space (4 px grid), radius, type step, duration and z-layer once as tokens. Components use semantic tokens only (`--needs`, `--working`, `--talon`, `--critical`…). Map-state colours mirror the engine `PALETTE`.
- The chart palette (`--viz-1/2`) was validated with the dataviz validator on the dark surface (CVD ΔE 27).
- UX laws applied:
  - **Hick:** ≤3 options per card.
  - **Miller:** 5 agents, chunked into cards.
  - **Fitts:** options sit next to what they authorize; keys 1–3.
  - **Serial position:** the recommended option comes first.
  - **Von Restorff:** amber means "waiting on a human" and red means life safety, nothing else.
  - **Proximity and common region:** cards and widget slots.
  - **Jakob:** inbox, thread, timeline.
  - **Doherty:** instant local feedback.
  - **Tesler:** TALON absorbs the computation.
  - **Spatial constancy:** the operator's pinned slots never move. TALON fills only its own, labelled slots.
- Brief alignment (FlytBase Design Fusion S3): night run at 03:47 PST, Jan 2026. Detection → plan in 6:00. Detection → order in about 7–8 min, against the brief's 38-min manual baseline, shown in Review.

## Decisions to write down (owner ruling needed)
- **ADR-1: one attention arbiter.** `talon.ts` now has an attention model: levels, interrupt budget, dissent and re-raise. The product repo also has `domain/attention.ts` (19 contract checks), `domain/talonSurface.ts` and `eval:talon` (42 cases). Two arbiters must not live side by side. **Proposed:** `talon.ts`'s arbiter replaces `domain/attention.ts` once the repo's 19 attention contracts and 42 talon evals are ported and pass against it. Until then, `talon.ts` is the prototype reference, not a second source of truth.
- **ADR-2: debrief model.** `Review` / `ReviewRow` / `CommandFacts` / `CommandResult` overlap the repo's `Ics209DebriefModal` and `DebriefTimeline`. Decide which one is canonical before either grows further.
- **ADR-3: second authority.** "Regional Duty Supervisor" is used as the re-raise authority and the lapse escalation path. Confirm it in DECISIONS.md, or rename it.
- **ADR-4: phases in data.** The player still uses phase ids internally (timeline scale, cameras, dock hints). They never appear as steps in the product UI. Confirm that this satisfies "the flow must not be a visible surface".

## Left to do / not verified
- **The repo contracts were not run.** doc 13, `domain/attention.ts`, the ISA-18.2 suite and `eval:talon` are not on this machine. The rules above follow the written review, not those tests. Port and run them (ADR-1).
- **Visual QA covers six frames only.** They were checked at 1280×800, 1440×900 and 1920×1080 (`qa/c-*.png`): standby, escalation, plan, correction, draft, review, small incident. Not looked at: day lighting in the console, 2D topo mode, Log tab density, popovers (layers, authority, settings), onboarding, the shortcuts modal, 4K or ultra-wide displays.
- **Not run in a real browser.** Voice uses the Web Speech API (Chrome/Edge). Sound uses WebAudio. Neither has run outside headless Chrome. Fps from SwiftShader is meaningless; check frame rate on real GPU hardware with the glass blur on.
- **Copilot replies are scripted** (intent matcher, no model). Crew acknowledgements are simulated.
- **`npm run phases`** still targets the old harness phase flow. Retire it or port it to `cshot.mjs`.
- **README.md** describes the engine and harness tiers. It needs a section for the console, `talon.ts` and the decision-aware player; this file is the current source.
- **Data stays exercise data:** fire spread is a self-similar growth model plus an elliptical spot fire, not Rothermel. Households are one per footprint; device and line counts are estimates.
- **The repo drift list from the review is not addressed beyond this prototype.** Three renderers, two coordinate laws and two fire geometries need a migration plan that names which ones survive.
