# 10 - Open Risks And Assumptions

This file tracks constraints, risks, and assumptions so the product remains credible.

## Current Assumptions

### Prototype Status

Sentinel is a prototype.

Implication:

- It can simulate AI, voice, drone telemetry, and emergency workflows.
- It should not imply real-world deployment.
- Case study language should say "prototype," "design-estimated," "simulated," or "conceptual" where needed.

### No Real AI Model In This Version

Assumption:

- TALON conversation and agent workflows will be simulated with structured state and predefined responses.

Reason:

- A live model would add complexity without automatically making the UI state-aware.
- The portfolio goal is to show AI product design, not backend model integration.

Risk:

- Viewers may ask whether TALON is real.

Mitigation:

- Be transparent: TALON is a high-fidelity simulated AI workflow prototype.
- Show realistic AI interaction patterns through structured design.

### No Real Voice System In This Version

Assumption:

- Voice-to-TALON remains simulated.

Reason:

- Real ASR/NLU would require integration and may not map cleanly to the prototype state.

Mitigation:

- Present voice as a simulated multimodal interaction.
- Use transcript, recompute state, plan delta, and confirmation to make it believable.

### Structured Mock Telemetry

Assumption:

- Use realistic mock data, not live datasets or APIs.

Reason:

- The prototype needs reliability and narrative control.

Mitigation:

- Make the data model realistic.
- Document data sources and assumptions.
- Show uncertainty and missing data instead of pretending perfect realism.

## Product Risks

### Risk 1 - Product Still Feels Like A Dashboard

Cause:

- If the right rail remains text-heavy and map overlays are weak, TALON will not feel like a copilot.

Mitigation:

- Prioritize TALON copilot rail.
- Use evidence convergence visuals.
- Reduce paragraph text.
- Make agent workflow visible.

### Risk 2 - 90-Second Claim Still Feels Unsupported

Cause:

- If the UI still shows containment/rescue completion inside 90 seconds.

Mitigation:

- End 90 seconds at authority notification.
- Move operations planning after notification.
- Document claim as design target/proxy.

### Risk 3 - AI Feels Too Magical

Cause:

- TALON recommendations appear without evidence or missing-data state.

Mitigation:

- Every recommendation must show source basis.
- Every confidence state must show missing data.
- Every high-consequence action must show human gate.

### Risk 4 - AI Feels Too Passive

Cause:

- TALON only explains after the fact.

Mitigation:

- Add working states.
- Add agent tasks.
- Add staged processing.
- Add proactive but bounded recommendations.

### Risk 5 - Visual Complexity Becomes Overwhelming

Cause:

- Adding charts, map layers, agent tasks, and receipts may overload the screen.

Mitigation:

- Use progressive disclosure.
- Prioritize one dominant decision at a time.
- Keep map primary.
- Keep action gates clear.

### Risk 6 - Governance Becomes Bureaucratic

Cause:

- Too much audit UI during active response.

Mitigation:

- Use compact receipt previews during live response.
- Move full audit detail into drawer/modal.
- Keep live decision surface fast.

### Risk 7 - Failure Cases Feel Like Random Demo Scenes

Cause:

- Failure states not integrated into TALON workflow.

Mitigation:

- Each failure must affect evidence sources, agent tasks, recommendation, human gate, and audit trail.

## Case Study Risks

### Risk 1 - Too Much Process

Mitigation:

- Use decision stories, not a diary.

### Risk 2 - Old And New Narratives Conflict

Mitigation:

- Rewrite old claims later.
- Archive the old model as an iteration.
- Make the 90-second endpoint precise.

### Risk 3 - Evidence Missing

Mitigation:

- Capture screenshots after each implementation phase.
- Keep `08-case-study-decision-stories.md` updated.
- Avoid final case-study rewrite until product evidence exists.

## Open Implementation Questions

These can be answered during implementation:

1. Should internal `OperationalMode` be renamed now or only visually remapped?
   - Default: visually remap first to reduce risk.

2. Should TALON copilot replace both priority and ground-team panels or preserve a compact team module inside the rail?
   - Default: replace the rail but include compact team status only when relevant.

3. Should authority notification be a new action tile or part of the Intelligence decision gate modal?
   - Default: make it the primary Intelligence gate with a packet review modal.

4. Should evidence charts use Recharts or custom SVG?
   - Default: use existing Recharts for chart-like visuals and custom SVG for map overlays.

5. Should voice override stay inside mission modal or move into TALON rail?
   - Default: keep mission-specific voice in modal, but add TALON rail prompt chips for general conversation.

6. Should review dock be expanded into a scenario launcher?
   - Default: yes, group scenarios by Intelligence and Operations.

## Non-Negotiables

- TALON does not self-authorize high-consequence action.
- 90 seconds ends at verified escalation and authority notification.
- Operations planning starts after notification.
- Evidence and uncertainty must be visible.
- Data visuals must reduce reading load.
- Failure states must be designed.
- Decision receipts must exist for major human gates.

