# 11 - Execution Direction: TALON Command Bar, Two-Phase UX, Map Interaction, Icons, And Component Libraries

This document preserves the final pre-execution product direction for Sentinel V2. It translates the strategic plan into concrete code and UI decisions before implementation begins.

## Purpose

The goal is not to dump every planned feature into the interface.

The goal is to make Sentinel feel like a state-of-the-art AI command product by changing the interaction spine:

- TALON should not feel like a side-panel chatbot.
- TALON should drive the action system.
- The action bar should become the core copilot control surface.
- The right rail should support TALON with summaries, evidence, receipts, and decision context.
- Intelligence and Operations should feel cognitively and visually different.
- Map objects should become operationally meaningful, not decorative markers.
- Icons should be upgraded to a coherent professional icon system.
- External component libraries should only fill gaps, not overwrite Sentinel's product-specific design system.

## Current Code Reality

### Current Action Bar

Current file:

- `src/app/components/ActionBar.tsx`

Current behavior:

- The action bar renders primary and secondary action tiles from `state.actionSurface`.
- Tiles are fixed-size, horizontally arranged, and can expand to show secondary actions.
- `authorize-containment` uses a special hold-to-confirm tile.
- Actions are derived in `SentinelShell.tsx` through `deriveQuickActions`.
- Icons come from `ActionGlyph` in `src/app/components/actionVisuals.tsx`.

Current weakness:

- The action bar is treated as a command launcher.
- It does not feel like TALON is controlling or sequencing the workflow.
- It does not expose why a specific action is available now.
- It does not carry conversation, AI state, or recommendation context.
- It keeps the old four-phase action model alive.

### Current Icons

Current file:

- `src/app/components/actionVisuals.tsx`

Current behavior:

- Most icons are custom inline SVG glyphs.

Current weakness:

- They are functional but not refined enough for the product quality target.
- They do not fully match a professional enterprise UI icon system.
- They require manual maintenance and visual consistency checks.

### Current Map

Current file:

- `src/app/components/MapCanvas.tsx`

Current behavior:

- The map already has a Figma coordinate system.
- It maps a 1691 x 914 Figma canvas into a 1440 x 900 display.
- Drone markers are fixed by id in `DRONE_MARKER_MAP`.
- Team markers are fixed in `TEAM_MARKERS`.
- Zones and routes are drawn through a mix of image background, SVG paths, and hardcoded coordinates.
- Markers can be clicked/hovered, but not repositioned by the operator.

Current weakness:

- Map markers are not yet editable operational objects.
- TALON does not react to operator map edits.
- The current marker system is good enough to build on, but needs a formal map model.

## Key Product Decision

### Decision

The bottom action bar should become the **TALON Command Bar**.

This replaces the earlier idea that TALON primarily lives in the right rail.

### Why

The action bar is where the operator makes decisions. If TALON is supposed to be an embedded copilot, it should appear at the point of action, not only in a side panel.

The right rail should still exist, but it should not be the main "chat window." It should become a contextual support rail:

- TALON summary points.
- Evidence cards.
- Missing data.
- Decision receipts.
- Authority packet preview.
- Operations brief.

The bottom command bar becomes the primary interaction surface:

- Speak to TALON.
- See what TALON is asking.
- Choose from TALON-proposed options.
- Review high-consequence gates.
- Approve, override, defer, or escalate.

## New Interaction Model

### Old Model

Operator sees action tiles.

Operator chooses an action.

TALON explanation appears somewhere else.

### New Model

TALON presents the current decision context in the command bar.

Operator can:

- Speak to TALON.
- Select a TALON prompt.
- Choose from TALON-proposed options.
- Review the next recommended action.
- Hold to authorize high-consequence action.
- Reject or override with reason.

The right rail updates with:

- TALON summary.
- Evidence.
- Missing data.
- Audit preview.
- Decision receipt.

## TALON Command Bar Structure

The command bar should have three zones.

### 1. Left Zone: TALON Input

Purpose:

- Make TALON feel available and interactive.

Elements:

- Mic / Speak to TALON button.
- Listening / processing / ready state.
- Optional transcript capsule.
- Current TALON mode label, such as `Fusing evidence`, `Preparing packet`, `Awaiting human gate`, or `Recomputing route`.

Interaction:

- Click mic to simulate voice interaction.
- Voice interaction uses structured prototype states, not real speech recognition.
- Transcript appears briefly.
- TALON recomputes or updates available actions.

### 2. Center Zone: Dynamic TALON Actions

Purpose:

- Show the exact actions relevant to the current state.

Elements:

- One dominant action.
- Two to four secondary options.
- Locked/blocked states with reason.
- TALON recommendation state.
- Human-gate labels.

Examples:

- Dispatch scout.
- Continue monitoring.
- Review evidence.
- Notify authorities.
- Resolve source conflict.
- Approve operations brief.
- Assign teams.
- Revise route.
- Authorize evacuation broadcast.
- Acknowledge exception.
- Transfer shift control.
- Abort or stand down.

### 3. Right Zone: Decision State

Purpose:

- Show why the current action is available, blocked, or recommended.

Elements:

- 90-second timer during Intelligence.
- Current gate status.
- Evidence sufficiency indicator.
- Receipt status.
- Human authorization marker.

Examples:

- `3/5 sources aligned`
- `Authority packet ready`
- `Source conflict unresolved`
- `Awaiting operator hold`
- `Operations authorized`
- `Handover receipt ready`

## Action Bar States By Workflow

### Intelligence: Quiet Monitoring

TALON state:

- Quiet overwatch.
- Sensor fusion running in background.

Command bar:

- Speak to TALON.
- View source health.
- Run manual triage if needed.

Right rail:

- System posture.
- Sensor/source readiness.
- TALON quiet summary.

### Intelligence: Anomaly Detected

TALON state:

- Thermal anomaly detected.
- Corroboration started.

Command bar:

- Dominant: Dispatch scout / Start verification.
- Secondary: Dismiss, monitor, ask TALON why.

Right rail:

- Why TALON interrupted.
- First source state.
- Confidence building.

### Intelligence: Evidence Building

TALON state:

- Sources are converging or conflicting.

Command bar:

- TALON processing state.
- Ask "What is missing?"
- Ask "Why wait?"
- Monitor only.
- Open evidence.

Right rail:

- Evidence convergence timeline.
- Source matrix.
- Missing data.

### Intelligence: Escalation Ready

TALON state:

- Emergency risk is verified enough for notification.

Command bar:

- Dominant: Hold to notify authorities.
- Secondary: Review packet, monitor only, request additional scout, override.

Right rail:

- Authority notification packet.
- Evidence summary.
- Human consequence.
- Audit preview.

### Intelligence: Forced Calibrator / Source Conflict

TALON state:

- Critical source disagreement detected.

Example:

- Thermal anomaly indicates wildfire risk.
- Satellite or permit data indicates controlled agricultural burn.

Command bar:

- Dominant escalation action is locked.
- Operator must choose a conflict interpretation:
  - Controlled burn likely.
  - Wildfire likely despite permit.
  - Insufficient data, continue monitoring.
  - Escalate with override reason.
- Hold action unlocks only after interpretation.

Right rail:

- Source conflict comparison.
- Data freshness.
- TALON's recommended interpretation.
- Audit reason preview.

Why:

- This prevents automation bias.
- TALON does not let the operator rubber-stamp a recommendation under pressure.

### Operations: Planning

TALON state:

- Authorities notified.
- Operations brief is being built.

Command bar:

- Dominant: Review operations brief.
- Secondary: Assign drone coverage, assign teams, edit route, ask safer alternative.

Right rail:

- Operations brief.
- Route viability.
- Team readiness.
- Agent task progress.

### Operations: Coordination

TALON state:

- Map is ready.
- Drones, teams, zones, and routes are being coordinated.

Command bar:

- Dominant: Approve operations plan.
- Secondary: Revise route, reassign team, request backup, voice correction.

Right rail:

- Current plan summary.
- TALON deltas.
- Team/asset status.
- Audit preview.

### Operations: Rescue Greenlight

TALON state:

- Operations plan authorized.
- Final rescue/evacuation action needs human approval.

Command bar:

- Dominant: Hold to authorize evacuation broadcast / rescue greenlight.
- Secondary: Delay, revise, notify teams, abort.

Right rail:

- Evacuation scope.
- Human consequence.
- Route risk.
- Receipt preview.

### Operations: Exception Handling

TALON state:

- A source, route, drone, or communication channel is degraded.

Command bar:

- Dominant: Acknowledge exception or approve fallback.
- Secondary: Switch fallback, request backup, escalate chain, abort.

Right rail:

- What failed.
- What TALON still knows.
- What TALON can safely do.
- What requires human approval.

### Operations: Shift Handover

TALON state:

- Operator initiates handover.

Command bar:

- Dominant: Transfer control.
- Secondary: Cancel, review incident summary.

Right rail/modal:

- Incident transfer summary.
- Active assets.
- Active routes.
- Open decisions.
- Incoming operator credential.
- Handover receipt.

## Action Ownership Model

### TALON Can Show Automatically

- Evidence state.
- Missing data.
- Confidence trend.
- Suggested next action.
- Agent task progress.
- Authority packet draft.
- Operations brief draft.
- Decision receipt preview.

### TALON Can Prepare Automatically

- Source convergence.
- Route options.
- Drone assignment options.
- Authority notification packet.
- Operations brief.
- Handover summary.
- Audit receipt draft.

### TALON Can Execute Low-Risk Automation

Only after previous human authorization or where no high-consequence action occurs:

- Continue monitoring.
- Recompute confidence.
- Mark a source stale.
- Update map overlays.
- Preserve drone coverage through battery handoff after an operation is already authorized.

### Human Must Authorize

- Notify authorities.
- Confirm emergency escalation.
- Approve operations plan.
- Authorize evacuation broadcast.
- Assign field teams to high-risk routes.
- Override TALON.
- Transfer control to another operator.
- Abort or stand down.

## Two-Phase UX/UI Shift

The two modes should feel meaningfully different.

This is not just a label change.

## Intelligence Mode UX

### Cognitive Job

The operator is asking:

> Is this real, urgent, and authority-notifiable?

### Product Feel

- Computational.
- Evidence-heavy.
- Uncertainty-aware.
- Focused on prediction, verification, and synthesis.

### UI Emphasis

- Source convergence.
- Sensor matrix.
- Confidence over time.
- Missing data.
- Scout path.
- Thermal anomaly.
- Predicted spread preview.
- Authority notification readiness.

### Map Behavior

- Pre-incident or low-noise map.
- Source pings.
- Anomaly pulse.
- Scout route.
- Confidence rings.
- Early spread projection.
- Minimal team planning.

### Panels

Left rail:

- Evidence/source inspector.
- Selected anomaly/source/drone data.
- Compact sensor cards.

Right rail:

- TALON evidence summary.
- Authority packet readiness.
- Source conflict and missing data.

Bottom:

- TALON Command Bar.

## Operations Mode UX

### Cognitive Job

The operator is asking:

> Now that authorities are notified, how do we coordinate the response safely?

### Product Feel

- Tactical.
- Coordination-heavy.
- Route and team oriented.
- More spatially dense.
- More operational than computational.

### UI Emphasis

- Zones.
- Teams.
- Drones.
- Routes.
- Coverage.
- Containment options.
- Evacuation readiness.
- Exceptions.
- Shift handover.

### Map Behavior

- Full operational map is built.
- Zones become interactive.
- Routes become visible.
- Drone and team markers are active.
- Coverage cones and route viability appear.
- Operator can drag approved editable markers.

### Panels

Left rail:

- Selected zone, drone, route, or team inspector.
- Shows metrics, readiness, risk, and assignment.

Right rail:

- Operations brief.
- TALON plan deltas.
- Decision receipts.
- Open blockers.
- Field coordination summary.

Bottom:

- TALON Command Bar with operations actions.

## Map Editing And TALON Understanding

## Decision

Map markers should become editable operational objects, but only with constraints.

Do not allow fully freeform dragging across the entire map. That would look impressive but become unrealistic and hard to govern.

Instead:

- Drones can be dragged to valid mission anchors.
- Ground teams can be dragged to valid staging zones.
- Routes can have limited editable checkpoints.
- TALON interprets the edit as a proposed plan change.
- TALON explains impact before applying.
- Human confirms the change through the command bar.

## Why

This creates a state-of-the-art interaction without breaking governance.

The operator can act spatially:

- "Move drone coverage east."
- "Shift Bravo team to Route B."
- "Drag perimeter hold to buffer zone."

TALON responds:

- Recomputes coverage.
- Shows route impact.
- Updates recommendation.
- Creates audit preview.
- Asks for confirmation if high-consequence.

## Map Model To Add

Create a formal map domain model.

Recommended file:

- `src/app/domain/mapModel.ts`

Data structures:

- `MapZone`
- `MapAnchor`
- `MapRoute`
- `MapAssetMarker`
- `MapEditEvent`
- `MapEditConstraint`
- `TalonMapInterpretation`

Map objects should include:

- id.
- label.
- type.
- x/y coordinates normalized to the map.
- allowed phases.
- valid target zones.
- risk level.
- linked action id.
- linked TALON agent task.

## Drag Interaction Model

1. Operator drags drone/team marker.
2. Marker shows ghost state.
3. Valid anchors highlight.
4. Invalid zones stay locked.
5. Operator drops marker.
6. TALON Command Bar shows interpretation:
   - "You moved Lidar-02 toward Buffer East."
   - "Coverage improves on Route B but weakens origin perimeter by 18%."
7. Operator can:
   - Apply change.
   - Ask TALON safer alternative.
   - Revert.
8. If the change affects high-risk operations, hold-to-authorize is required.
9. Decision receipt is created.

## Icon System Upgrade

## Decision

Scrap the current hand-drawn action glyph set and move to a professional icon system.

Use `lucide-react` as the default icon library because it is already installed in the project.

Current dependency:

- `lucide-react`

## Why Lucide

- Already available.
- Consistent line style.
- Large enough set for emergency/command/product UI.
- Easier to maintain than custom inline SVG.
- Matches the current technical command-shell aesthetic.

## Implementation

Replace:

- `ActionGlyph`

With:

- `OperationalIcon`

Recommended file:

- `src/app/components/icons/OperationalIcon.tsx`

Icon mappings should cover:

- TALON / AI: `BrainCircuit`, `Sparkles`, `Bot`, or `Activity`.
- Mic / voice: `Mic`, `AudioLines`.
- Source fusion: `Radar`, `ScanSearch`, `Activity`.
- Thermal/fire: `Flame`.
- Satellite: `Satellite`.
- Drone/air asset: use closest available aviation/navigation icon, verified during implementation.
- Route: `Route`.
- Teams: `UsersRound`.
- Authorities: `Siren`, `RadioTower`, `ShieldAlert`.
- Notification: `Send`, `Radio`.
- Authorization: `ShieldCheck`, `LockKeyhole`, `BadgeCheck`.
- Conflict: `TriangleAlert`, `CircleAlert`.
- Override: `GitBranch`, `Replace`, or `RefreshCcw`.
- Handover: `UserRoundCheck`, `KeyRound`, `ArrowRightLeft`.
- Audit: `FileCheck`, `ClipboardCheck`.
- Abort: `OctagonAlert`, `Ban`.

If a domain-specific drone icon is not available, create one custom marker only for map assets, not for every action tile.

## External Component Library Review

The product should not import a random mix of UI libraries.

Sentinel already has:

- React.
- Vite.
- Tailwind.
- Radix/shadcn-style primitives.
- Recharts.
- Motion.
- Lucide.

The safest direction is:

> Keep Sentinel's design system, borrow interaction patterns selectively, and implement custom components with existing dependencies.

## Useful Sources

### shadcn.io AI

URL:

- https://www.shadcn.io/ai

Useful because it has AI-specific components for:

- actions.
- agent.
- chain of thought.
- confirmation.
- conversation.
- prompt input.
- queue.
- reasoning.
- sources.
- speech input.
- task.
- toolbar.
- transcription.

Use for inspiration:

- TALON prompt chips.
- source display.
- reasoning/task blocks.
- speech input structure.
- confirmation states.

Do not copy wholesale.

### AI SDK Agents

URL:

- https://www.aisdkagents.com/

Useful because it focuses on:

- workflows.
- tool calling.
- agent orchestration.
- human-in-the-loop approval.
- task management.
- queues.
- structured output.

Use for inspiration:

- TALON agent task stack.
- HIL approval patterns.
- orchestrator/worker mental model.
- structured agent output.

Do not add AI SDK or backend integration in this version.

### Tremor

URL:

- https://www.tremor.so/

Useful because it is built for:

- dashboards.
- charts.
- data bars.
- spark charts.
- progress circles.
- trackers.
- analytical interfaces.

Use for inspiration:

- risk vector strips.
- compact data bars.
- source contribution bars.
- small charts.

Do not adopt Tremor styling directly. Sentinel already has its own visual language.

### Magic UI

URLs:

- https://magicui.design/docs/components
- https://magicui.design/docs/mcp

Useful for:

- animated list.
- border beam.
- shine border.
- ripple button.
- shimmer button.
- animated circular progress.
- number ticker.
- progressive blur.

Use selectively for:

- TALON processing pulse.
- source chip transition.
- command bar active border.
- evidence convergence loading.

Avoid:

- landing-page effects.
- sparkles.
- decorative backgrounds.
- anything too marketing-heavy.

### Cult UI

URL:

- https://www.cult-ui.com/docs/mcp-server

Useful patterns:

- dynamic island.
- toolbar expandable.
- morph surface.
- floating panel.
- popover.
- inputs and decision UI.

Use for inspiration:

- TALON Command Bar expansion.
- compact-to-expanded command surface.
- morphing decision controls.

Avoid:

- heavy hero effects.
- texture-heavy buttons.
- anything that fights the command-center design system.

### Animata

URL:

- https://animata.design/docs

Useful patterns:

- AI button.
- status button.
- swipe button.
- gauge chart.
- ring chart.
- progress.
- animated border trail.

Use for inspiration:

- hold-to-authorize.
- command bar state transitions.
- small progress visuals.

### Aceternity UI

URL:

- https://ui.aceternity.com/components

Useful only in small doses:

- stateful button.
- moving border.
- animated modal.
- animated tooltip.
- timeline.
- compare.

Avoid most background, hero, aurora, beams, spotlight, and marketing patterns. They are too landing-page oriented for Sentinel.

### Fancy Components

URL:

- https://www.fancycomponents.dev/docs/introduction

Mostly not suitable for Sentinel because the library is intentionally playful and weird.

Potentially useful:

- number ticker.
- subtle text reveal.
- drag elements as reference only.

Avoid:

- cursor gimmicks.
- gravity effects.
- playful physics.
- weird text effects.

### Indie UI

URL:

- https://ui.indie-starter.dev/

Mostly generic.

Potentially useful:

- stateful buttons.
- shimmer buttons.

Avoid:

- cards and generic SaaS UI.

### Origin UI NG

URL:

- https://www.originui-ng.com/

Not useful for this React project because it targets Angular / RadixNG.

Do not use.

### Watermelon UI

URL:

- https://ui.watermelon.sh/

Could not verify enough useful detail from the available page content. Do not prioritize.

### Syntax UI

URL:

- https://syntaxui.com/components

Could not reliably fetch during review. Do not prioritize unless inspected later.

### Skiper UI

URL:

- https://skiper-ui.com/components?source=free

Could not extract enough component detail during review. Do not prioritize unless a specific component is identified later.

## Final Library Decision

Do not install a full new UI library right now.

Use:

- Existing Radix/shadcn primitives.
- Existing Recharts.
- Existing Motion.
- Existing Lucide.
- Custom Sentinel components.

Borrow patterns from:

- shadcn.io AI for AI conversation/source/reasoning primitives.
- AI SDK Agents for agent workflow and human-in-loop patterns.
- Tremor for compact data visualization logic.
- Magic UI / Animata / Cult UI for carefully constrained microinteractions.

Reject:

- Landing-page backgrounds.
- Decorative sparkles.
- Heavy gradients.
- Generic SaaS cards.
- Playful physics.
- Components that do not serve emergency command cognition.

## Concrete Code Direction

### Rename / Replace

Replace:

- `ActionBar`

With:

- `TalonCommandBar`

Replace:

- `ActionGlyph`

With:

- `OperationalIcon`

Replace visible:

- `Scan / Verify / Contain / Rescue`

With:

- `Intelligence / Operations`

Do not immediately rename all internal scene ids unless necessary.

### New Components

Recommended new components:

- `TalonCommandBar`
- `TalonMicButton`
- `TalonCommandPrompt`
- `TalonActionCluster`
- `TalonDecisionGate`
- `TalonGateStatus`
- `TalonContextRail`
- `EvidenceConvergence`
- `SourceMatrix`
- `AgentTaskStack`
- `AuthorityPacketPreview`
- `DecisionReceiptPreview`
- `MapAssetMarker`
- `MapEditGhost`
- `MapAnchor`
- `OperationalIcon`

### New Domain Files

Recommended:

- `src/app/domain/workflow.ts`
- `src/app/domain/talon.ts`
- `src/app/domain/mapModel.ts`
- `src/app/domain/decisions.ts`

These files should prevent `SentinelShell.tsx` from becoming even larger.

## Updated Execution Phases

### Phase 1 - Documentation And Spine Lock

- Save this direction.
- Do not implement UI until direction is clear.
- Treat TALON Command Bar as the primary interaction spine.

### Phase 2 - Two-Phase Workflow Mapping

- Add Intelligence / Operations visible workflow.
- Remap phase labels and guidance.
- Keep internal scenes if needed.

### Phase 3 - TALON Command Bar

- Replace current action bar with command bar architecture.
- Add mic state.
- Add dynamic TALON action cluster.
- Add gate status.
- Add hold-to-authorize for authority notification.

### Phase 4 - TALON Context Rail

- Right rail becomes summary/evidence/receipt rail.
- Not a generic chat window.
- Not the main action surface.

### Phase 5 - Structured Data And Evidence

- Add source model.
- Add agent task model.
- Add risk vectors.
- Add authority packet.

### Phase 6 - Intelligence UX

- Evidence convergence.
- Source matrix.
- Authority notification packet.
- Forced calibrator gate.

### Phase 7 - Operations UX

- Operations brief.
- Map-based planning.
- Team/drone coordination.
- Rescue greenlight.
- Exception handling.

### Phase 8 - Map Interaction

- Formalize map model.
- Add constrained draggable markers.
- Add TALON interpretation of map edits.
- Add confirmation through command bar.

### Phase 9 - Icon System

- Replace custom action glyphs with Lucide-based `OperationalIcon`.
- Keep custom map markers only where necessary.

### Phase 10 - Microinteraction Polish

- TALON processing.
- Command bar morph states.
- Source chip transitions.
- Agent task progress.
- Map layer fades.
- Reduced motion support.

## Product Quality Bar

Before calling the upgrade successful, the product must pass these checks:

- Does TALON feel embedded in the workflow, not placed beside it?
- Does the command bar clearly show what TALON is asking and what the human controls?
- Does Intelligence feel computational and evidence-driven?
- Does Operations feel tactical and coordination-driven?
- Does the map support operational reasoning?
- Are icons coherent and professional?
- Are animations clarifying state rather than decorating the UI?
- Can a recruiter understand the AI product decision in 30 seconds?
- Can a senior designer defend the human-control model in an interview?

