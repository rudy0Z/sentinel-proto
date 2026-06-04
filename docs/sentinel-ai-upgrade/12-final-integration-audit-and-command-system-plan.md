# Sentinel Final Integration Audit And Command System Plan

Date: 2026-06-02

This document consolidates the final pre-testing audit after the TALON Workforce upgrade. It captures the remaining integration debt, the product-design rationale, and the phase-by-phase execution plan for making Sentinel feel like one connected supervised agentic command system.

## Reference Documents

- [00-previous-plan.md](./00-previous-plan.md)
- [01-breakthrough-decision.md](./01-breakthrough-decision.md)
- [03-product-thesis-v2.md](./03-product-thesis-v2.md)
- [04-talon-agentic-workflow.md](./04-talon-agentic-workflow.md)
- [05-data-visualization-system.md](./05-data-visualization-system.md)
- [06-governance-auditability.md](./06-governance-auditability.md)
- [09-phase-roadmap.md](./09-phase-roadmap.md)
- [10-open-risks-assumptions.md](./10-open-risks-assumptions.md)
- [11-execution-direction-command-bar-map-libraries.md](./11-execution-direction-command-bar-map-libraries.md)
- [sentinel-v2-master-technical-architecture.md](./sentinel-v2-master-technical-architecture.md)
- [sentinel_v2_strategic_additions_plan.md](./sentinel_v2_strategic_additions_plan.md)
- [PLAN.md](./PLAN.md)
- [PLAN2.md](./PLAN2.md)

## External Product References

- [Microsoft HAX Toolkit: Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/haxtoolkit/?p=105) for human control, uncertainty, and AI behavior boundaries.
- [IBM Carbon for AI](https://carbondesignsystem.com/guidelines/carbon-for-ai/) for making AI visually and behaviorally distinct while preserving system consistency.
- [Atlassian AI Interaction Guidelines](https://atlassian.design/patterns/ai-interaction-guidelines) for AI as a cohesive collaborative layer rather than isolated UI decoration.
- [Microsoft Fluent 2 Toolbar Usage](https://fluent2.microsoft.design/components/web/react/core/toolbar/usage) for command grouping and overflow behavior.
- [Carbon Menu Buttons](https://carbondesignsystem.com/components/menu-buttons/usage/) for overflow and combo-button hierarchy when space is constrained.
- [DHS Common Operating Picture for Emergency Responders](https://www.dhs.gov/publication/common-operating-picture-emergency-responders) for continuous, cross-jurisdiction situational awareness.
- [FEMA NIMS Command and Coordination](https://www.usfa.fema.gov/a-z/nims/command-and-coordination.html) for tactical activity, incident support, policy decisions, and public communication as separate coordination responsibilities.

## Executive Verdict

Sentinel's product thesis is now strong: it is a supervised agentic emergency-response command system where TALON coordinates specialist agents while humans authorize consequential actions.

The current prototype still feels partially disconnected because the upgraded TALON Workforce sits beside older command, modal, review, and failure-state systems. The result is a product that can explain a strong 2026 AI-first concept in the case study, but during hands-on testing some screens still behave like separate prototype scenes rather than one operational system.

The final quality bar is not more features. The final quality bar is integration.

## Stabilization Already Completed

### Runtime Crash

Fixed in `src/app/components/ActionModal.tsx`.

Problem: `MissionBriefModal` referenced `modalId`, but the component prop is `actionId`.

Resolution: the mission asset icon now uses `actionId`, removing the `ReferenceError: modalId is not defined` crash.

### TALON Voice Lock

Fixed in `src/app/components/ActionBar.tsx` and `src/app/components/SentinelShell.tsx`.

Problem: the command-bar mic moved from `idle` to `responded`, then stayed disabled. Voice also did not produce a visible TALON answer.

Resolution: voice now creates a TALON response and the mic returns to `Speak` after the response state. The command-bar TALON status strip can host the response, so TALON does not disappear when the operations right rail is showing non-copilot panels.

### Verification

`cmd.exe /c npm run build` passed after the fixes. Vite still reports a chunk-size warning, which is not a runtime blocker.

## Current System Problems

### 1. Command Bar Cannot Reliably Fit

The shell gives the action bar the center lane between two fixed 300px rails. Inside that lane the command bar tries to fit:

- mic
- TALON status
- optional source-conflict gate
- up to five fixed action tiles
- secondary row
- conversational chips
- floating More/Less button

This exceeds available width at common portfolio-demo sizes such as 1366x768 and 1440x900. The result is overlap, cramped spacing, and a More/Less affordance that floats over content rather than acting like a true overflow control.

Decision: the action bar must become a command center, not a row of fixed tiles.

### 2. More/Less Is Structurally Wrong

The current More/Less button is absolutely positioned inside the action cluster. It is not part of a reserved layout slot, so it can overlap tiles, chips, or map content depending on scene and viewport.

Decision: remove the floating More/Less pattern. Replace it with a real overflow menu or a reserved command drawer control.

### 3. TALON Is Still Split Across Surfaces

TALON logic is currently split between:

- `domain/talon.ts`
- `ActionBar.tsx`
- `SentinelShell.tsx`
- `TalonCopilotPanel.tsx`
- mission modal voice override logic

The system has strong workforce data, but conversation, chips, voice state, response state, and agent evidence are not managed from one source of truth.

Decision: TALON must become one persistent interaction system:

Input -> turn lifecycle -> visible answer host -> agent evidence -> blocker/human gate -> next accountable command.

### 4. TALON Workforce Disappears When It Matters Most

The Workforce panel is strongest in intelligence mode, but operations and failure scenes often show evacuation/ground-team panels instead. That makes the agentic system feel like an information tab rather than the operating model of the product.

Decision: every TALON recommendation and failure state should cite the active agents behind it. Operations should still expose TALON Workforce, even if in a compact exception-focused mode.

### 5. Failure Scenes Are Prototype Jumps

Satellite loss, network degradation, battery critical, and infrastructure loss are currently scene IDs accessible through the Review Dock. Some are also rendered as old standalone overlays, banners, or popups.

This makes failures feel like a separate demo gallery instead of real operational exceptions inside TALON's supervised workflow.

Decision: failure states should be modeled as operational exceptions, not separate prototype screens.

### 6. Competing Command Surfaces Create Unsafe Ambiguity

Several flows duplicate primary actions:

- alert popup plus bottom action bar
- verification live feed buttons plus bottom action bar
- battery critical popup plus normal rescue action bar
- mission modals with their own voice override while command bar also has voice

In a high-stakes command interface, only one surface should execute commands. Other panels may explain, preview, or support the command.

Decision: the action bar is the only command execution and human authorization surface.

### 7. Source Conflict Gate Blocks Too Much

The burn-permit/source-conflict gate currently disables all primary verification actions, including safe alternatives like monitor-only. A good calibrator blocks risky escalation, not safe observation.

Decision: source conflict should block `Prepare Authority Packet`, not `Monitor only`, `Hold`, or evidence review.

### 8. Layout System Is Still Fragile

The shell uses fixed `100vw/100vh`, absolute rails, fixed live-feed heights, and scattered z-index values. This forces every panel, overlay, and modal to solve its own scrolling and layering.

Decision: create semantic layout and layer tokens, then move the shell to a predictable grid contract.

### 9. Right Rail Is Not Fully Tokenized

The TALON panel is heavily upgraded, but older right-rail cards still use raw gradients, raw rgba strings, local spacing, and independent card primitives.

Decision: right-rail panels need a shared rail frame and shared metric/card primitives.

### 10. Review Dock Is Hurting Demo Quality

The Review Dock is useful for internal testing, but in screenshots it floats over the map, collides visually with rails, and makes the prototype look unfinished.

Decision: keep Review Dock as a dev/testing utility only. Public demo mode should hide it or collapse it into a small scene switcher.

## Target Product Architecture

### Surface Ownership

Map:
Shows the live common operating picture: terrain, heat, drone positions, zones, routes, degraded overlays, and active exception impact.

Left rail:
Shows raw operational observations: current zone, tactical assets, command stream, evidence ledger.

Right rail:
Shows TALON interpretation: workforce, evidence confidence, exception queue, priority rationale, source health, and governance.

Bottom command bar:
Owns operator input, TALON conversation, recommended command, secondary commands, human gates, destructive actions, and receipts.

Modals/sheets:
Only used for detailed review before high-consequence execution. They should never introduce a second independent voice system or duplicate command model.

## Execution Plan

### Phase 0: Stabilize Before Personal Testing

Status: partially completed.

Completed:

- Fix `MissionBriefModal` `modalId` crash.
- Build verification after crash fix.
- Make TALON voice produce a visible response.
- Make TALON mic reset after response.

Remaining:

- Add a route-level error boundary so future runtime errors show a branded Sentinel recovery screen instead of the default React Router error page.
- Run `git diff --check`.
- Run one manual pass across all 15 Review Dock scenes to catch blocking crashes.

### Phase 1: Rebuild The Command Bar Model

Goal: make the bottom bar the single command and authorization surface.

Code work:

- Create `src/app/domain/commands.ts`.
- Define a single `CommandDefinition` model:
  - `id`
  - `label`
  - `shortLabel`
  - `intent`
  - `priority`
  - `riskLevel`
  - `status`
  - `gate`
  - `disabledReason`
  - `modal`
  - `receipt`
  - `visibleWhen`
  - `blockedBy`
  - `agentEvidence`
- Refactor `deriveQuickActions()` to return command definitions through this model.
- Remove action-specific drift between `QuickActionId`, `deriveQuickActions`, `handleAction`, local modal lists, and `ActionModal`.
- Replace the floating More/Less button with one reserved overflow control.
- Keep one dominant primary action visible per state.
- Keep two or three secondary actions visible when there is room.
- Move lower-priority commands into overflow.
- Separate destructive commands from primary/secondary commands with visual and spatial separation.
- Keep human-gate commands visible and never hidden behind overflow.

UX rules:

- Primary action: one per state.
- Secondary actions: adjacent, lower contrast.
- Destructive action: separated, danger tone.
- Hold-to-authorize: only for irreversible or field-affecting gates.
- Disabled commands: show blocker reason, not just dimmed opacity.
- Overflow: only for lower-priority or less frequent commands.

Acceptance criteria:

- No action bar overlap at 1366x768 or 1440x900.
- No floating More/Less control.
- `Send Authority Packet` is the obvious primary CTA at the 90-second gate.
- `Monitor only` remains available during source conflict.
- `Abort mission` is visually separated from normal operational CTAs.

### Phase 2: Make TALON One Persistent Conversation System

Goal: TALON should feel like a copilot/orchestrator across the entire product, not a right-rail tab.

Code work:

- Create `getTalonInteractionModel(state)` in `domain/talon.ts`.
- Centralize:
  - chips
  - chip responses
  - voice responses
  - recommendations
  - active agents
  - evidence links
  - human gates
  - failure runbooks
- Replace hard-coded `SCENE_CHIPS` in `ActionBar.tsx`.
- Replace hard-coded response map in `SentinelShell.tsx`.
- Add conversation history with scene stamps.
- Mark older turns as `superseded` instead of deleting them on scene transition.
- Add a visible answer host that is always available:
  - command-bar compact answer by default
  - right-rail expanded answer when TALON Workforce is visible
- Add `aria-live="polite"` and focus behavior for new TALON answers.

UX rules:

- TALON answer format:
  - conclusion
  - evidence
  - active agents/tools
  - uncertainty/blockers
  - recommended next command
- Voice, chip, timer, action failure, and degraded source should all create the same kind of TALON turn.

Acceptance criteria:

- Speaking to TALON creates a visible answer in every scene.
- The operator can speak again after TALON responds.
- TALON answers in operations cite active agents such as Drone Control, Resource Readiness, Governance, and Notification Brief.
- No duplicate TALON chip inputs appear outside the command bar.

### Phase 3: Convert Failure Scenes Into Operational Exceptions

Goal: make failures part of the product system, not separate prototype windows.

Code work:

- Replace narrow `ExceptionState = "none" | "signal-degraded"` with structured `OperationalException`.
- Fields:
  - `id`
  - `severity`
  - `status`
  - `affectedSources`
  - `affectedAgents`
  - `blockedCommands`
  - `fallbackInputs`
  - `confidenceImpact`
  - `recommendedRecoveryCommand`
  - `auditText`
  - `mapImpact`
- Map current scenes into exceptions:
  - satellite-feed-loss
  - network-degraded
  - rescue-battery-critical
  - rescue-signal-degraded
  - infrastructure-total-loss
  - contain-degraded
- Drive right-rail exception queue from the same model.
- Drive TALON Workforce blocked/failed agents from the same model.
- Drive action-bar disabled states from the same model.
- Retire duplicate banners where MapCanvas and Shell both show the same degradation.

UX rules:

- Failure state presentation should include:
  - what failed
  - what data remains online
  - what TALON can still compute
  - what is blocked
  - what the operator can safely do next
  - audit implication
- Reserve full-screen takeover only for infrastructure-total-loss/manual protocol.

Acceptance criteria:

- Satellite loss shows Satellite Intelligence failed, Sensor Fusion degraded, Drone Perception active, and confidence impact.
- Network degradation shows reduced throughput, affected telemetry, command blockers, and low-bandwidth fallback.
- Battery critical shows Drone Control handoff as a supervised gate, not autonomous invisible behavior.
- Infrastructure loss moves to manual protocol with a clean, intentional takeover.

### Phase 4: Consolidate Popups, Modals, And Review Dock

Goal: remove disconnected windows and duplicate command loci.

Code work:

- Replace legacy alert popup action buttons with command-bar commands.
- Replace verification embedded action buttons with command-bar commands.
- Replace battery critical popup with an exception card and command-bar gate.
- Convert mission modals into one `TalonPlanReviewSheet` primitive.
- Build one design-system modal primitive:
  - tokenized backdrop
  - tokenized surface
  - `maxHeight: calc(100dvh - safe areas)`
  - internal scroll body
  - fixed footer
  - focus-visible styles
  - Escape behavior
  - `aria-labelledby`
- Move modal voice override into the persistent TALON conversation controller.
- Hide Review Dock in public demo mode or collapse it to a small testing utility.

UX rules:

- Panels explain commands.
- Action bar executes commands.
- Modals review high-consequence commands.
- Review Dock never appears as a product feature.

Acceptance criteria:

- No scene has two primary CTAs in different surfaces.
- No modal clips on 1366x768.
- No Review Dock overlap in public demo screenshots.

### Phase 5: Repair Shell Layout And Design-System Contracts

Goal: make the interface robust before adding any more visual polish.

Code work:

- Extend `tokens.ts` with semantic groups:
  - `shell`
  - `layer`
  - `component.commandBar`
  - `component.railPanel`
  - `component.modal`
  - `motion`
  - `focus`
  - `scrollbar`
- Replace local z-index magic numbers with `layer` tokens.
- Replace fixed `100vh` with `100dvh`.
- Define shell dimensions:
  - `navHeight`
  - `railWidth`
  - `screenInset`
  - `railGap`
  - `commandBarHeight`
  - `commandBarExpandedHeight`
- Size center feed/map surfaces using the shell contract instead of fixed 1080-canvas math.
- Build shared `RailPanelFrame` for TALON and non-TALON right rail panels.
- Tokenize old `RightPanel.tsx` gradients, rgba, spacing, radius, and transitions.

UX rules:

- One scroll contract per rail.
- One panel header model.
- One modal model.
- One z-index ladder.
- No raw `rgba()` in new or edited core UI.
- No raw one-off spacing or radius in command/panel/modal work.

Acceptance criteria:

- No panel/action-bar overlap at 1366x768.
- Right rail can scroll without clipping the action bar.
- TALON panel and operations panels share the same rail frame.
- Focus states are visible on buttons, inputs, and modal controls.

### Phase 6: Scenario QA Matrix

Goal: prove the prototype is demo-stable.

Scenes to test:

- baseline
- alert-command
- investigation-pending
- verify-ready
- verify-active
- authority-notification-ready
- contain-recommended
- contain-alternate
- contain-degraded
- rescue-nominal
- rescue-signal-degraded
- rescue-battery-critical
- satellite-feed-loss
- infrastructure-total-loss
- network-degraded

Checks per scene:

- no runtime error
- no layout overlap
- action bar primary CTA is clear
- TALON answer host exists
- voice can be used repeatedly
- TALON Workforce/exception state matches scene
- right rail content matches operational context
- Review Dock does not block demo view
- destructive actions are separated
- disabled actions explain blockers

Viewport checks:

- 1440x900
- 1366x768
- 1920x1080

Commands:

- `cmd.exe /c npm run build`
- `git diff --check`

Manual product walkthrough:

- start at baseline
- surface alert
- dispatch scout
- open verification
- trigger source conflict
- hold escalation
- verify permit
- prepare authority packet
- send authority packet
- stage operations
- authorize containment
- trigger each exception
- recover or route to manual protocol

## Priority Order

### Must Fix Before Serious Portfolio Testing

1. Command bar overflow architecture.
2. Review Dock public-demo behavior.
3. TALON persistent answer host across all phases.
4. Source conflict blocking only escalation, not safe exits.
5. Failure scenes as exceptions instead of standalone prototype jumps.

### Should Fix Before Case Study Recording

1. Unified command model.
2. Unified TALON interaction model.
3. Right rail exception mode.
4. Modal primitive and mission sheet cleanup.
5. Layout and z-index tokens.

### Can Defer If Time Is Tight

1. Full conversation history with superseded turns.
2. Deep modal focus-trap implementation.
3. Code splitting for the Vite chunk-size warning.
4. Removing every legacy raw `rgba()` outside touched command/panel/modal files.

## Case Study Framing

The case study should not claim Sentinel has real autonomous AI agents. It should say:

> Designed and prototyped a supervised agentic workflow where TALON orchestrates specialist emergency-response agents, exposes confidence and blockers, and routes every field-affecting action through a human authorization gate.

The strongest product decision story is:

- Original idea: reduce the entire emergency response plan to 90 seconds.
- Revised senior-level decision: use 90 seconds to detect, verify, synthesize, and notify authorities; then use Operations to stage field response with TALON supervision.
- Final UX decision: the action bar becomes the human gate, TALON Workforce becomes the reasoning layer, and the map remains the common operating picture.

## Staff Product Design Review Summary

The upgraded direction is portfolio-worthy, but only if the execution becomes coherent. Recruiters will not judge Sentinel by how many AI concepts are present. They will judge whether the AI behavior, command surface, failure states, and data visualization form one understandable operating model.

The next implementation pass should therefore be ruthless about consolidation:

- one command model
- one TALON interaction model
- one exception model
- one modal primitive
- one shell layout contract

That is the difference between "interesting prototype" and "credible AI product design system."
