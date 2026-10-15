# AutoCoder-verified ground-truth anchors (read directly from repo docs/code, 2026-09-21)

These facts were read first-hand from the Sentinel repo by the orchestrator. The reviewer must
check the extractor's atlas-inventory.json against these, and against the raw files for anything else.

## Routes (src/app/routes.ts, observed)
- `/` → ScanPage (lazy) · `/components` → ComponentsPage · `/design-system` → DesignSystemPage
- Hash router (createHashRouter); `*` → redirect `/`

## State machine (src/app/domain/stateMachine.ts, observed)
- Header comment: previously ~15 setScene call sites; TRANSITIONS is now the single source of truth.
- SystemEvent union includes: system.enter-scenario, system.deep-link, system.restart,
  timer.alert-surfaced, timer.investigation-complete, timer.rescue-edge-case,
  timer.reraise-threshold, operator.acknowledge-handoff, operator.close-alternate,
  operator.close-degraded, operator.voice-override, operator.stand-down-complete,
  operator.resolve-dissent, operator.clear-source-conflict, operator.authorities-notified,
  operator.authorize-route-b, operator.initiate-shift-change, timer.source-discrepancy,
  timer.run-card-staged, timer.route-a-blocked
- TransitionGate = "none" | "confirm" | "human-approval"; guards read TransitionContext
  {experienceMode, mode, authoritiesNotified, edgeCaseFired, dissent, evidenceConfidence}
- SceneTransition supports requiresDissent (dissent never silent) and effects {mode, authoritiesNotified, resetIncident, escalationBasis}
- ExperienceMode = entry | brief | simulation | free; OperationalMode = scan/verify/contain/rescue (from docs table)

## Docs: 05-state-path-catalog.md (observed)
- 20 authored scenes; scenarios S-01…S-06 (ScenarioSwitcher)
- Fault-injected scenes (no inbound operator edge by design): SEN-14 satellite-feed-loss → deploy-survey;
  SEN-16 network-degraded → relay-field-intel; SEN-15 infrastructure-total-loss → system.restart;
  SEN-10 rescue-signal-degraded → deploy-backup
- Universal exits from `*`: abort-mission [confirm, destructive], stand-down
- 26 command definitions in commands.ts; gates none/confirm/human-approval/hold; risk low→critical
- TALON surface posture: quiet/working/gated/alert/contested/blocked (talonSurface.ts single derivation)
- TALON mark states (8 signatures): watching/listening/searching/solving/gated/executing/blocked/receipt

## Docs: 02-user-flows.md (observed)
- F1 90-second intelligence run: SEN-90 → 91 → 01 → 02 → 03 → 04 → 05 → 06 → 09 (ends at human gate)
- F2 operator overrules TALON (contested watch, dissent reasons with weights +16/+9/+4/+12; TALON appeals via second authority SEN-12)
- F3 operator escalates past TALON (46% confidence, escalationBasis operator-initiated, TALON objection verbatim)
- F4 containment planning: SEN-06 → 07/08 → 09 (override-plan, degraded terrain, hold-to-authorize)
- F5 live-ops exceptions: SEN-13 battery handoff, SEN-21 route-A blocked, SEN-22 shift change PIN, SEN-10 signal degraded
- F6 infrastructure failure recovery (injection-only entries)
- F7 free exploration: Review Dock 20 scenes, ?scene= deep links, ?core=1 strips dock
- Flow rules: gates proportional to risk; two-way disagreement with memory; one honest exception surface; guided repeatability

## Reviewer checklist
1. atlas-inventory.json parses; node kinds cover: screen/scene, state, gate, scenario, component, principle, phase.
2. All 20 scenes present or accounted for (extractor must list scene IDs found in code; docs list them via IA doc).
3. All flows F1–F7 representable as edge paths; fault scenes have no inbound operator edge (by design) — flag if extractor added operator edges into fault scenes.
4. Evidence sampling: pick 8+ random nodes/edges, open the quoted file:lines, confirm the claim. Any mismatch = major finding.
5. Discrepancy list exists (docs_say vs code_shows) where applicable.
6. Scenario count matches S-01…S-06 (or code shows a different count — record actual).
