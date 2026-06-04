# 08 - Case Study Decision Stories

This file captures raw material for the final case study. It should be updated as implementation progresses.

## Case Study Strategy

The final case study should not be a process diary. It should tell a sequence of product decisions.

The strongest final story:

> I redesigned Sentinel from a wildfire dashboard into a governed AI command system where TALON accelerates evidence synthesis and escalation while keeping humans accountable for high-consequence decisions.

## Decision Story 1 - Redefining The 90-Second Promise

### Initial Direction

The original product treated 90 seconds as the time required to move through:

- Scan.
- Verify.
- Contain.
- Rescue.

This made the interface feel fast but risked an unrealistic claim.

### Problem Found

The product implied that a full containment and rescue plan could be completed in 90 seconds.

That would be hard to defend because real wildfire response requires:

- Size-up.
- Source verification.
- Dispatch communication.
- Values-at-risk assessment.
- Resource assessment.
- Human authority.
- Operational planning.

### Final Decision

Redefine 90 seconds as:

> Time from serious anomaly detection to verified emergency escalation and authority notification.

### Why

This makes the product:

- More realistic.
- More credible.
- More aligned with wildfire size-up.
- Better for enterprise AI governance.
- Easier to defend in interviews.

### Tradeoff

The claim becomes less flashy but much more mature.

### Case-Study Framing

> The biggest product decision was changing what "90 seconds" meant. I realized the first version optimized for a dramatic demo instead of operational truth. A real command system should not imply a full rescue plan before the fire is even sized up. So I reframed the target around verified escalation and authority notification.

## Decision Story 2 - From Four Phases To Two Phases

### Initial Direction

The product used:

- Scan.
- Verify.
- Contain.
- Rescue.

### Problem Found

Four phases made the interface feel structured, but they split the user's real mental model too finely.

The operator is really doing two jobs:

1. Determining whether this is real and notifiable.
2. Coordinating the response after escalation.

### Final Decision

Use:

- Intelligence.
- Operations.

### Why

This maps better to emergency work:

- Intelligence gathers and verifies enough evidence for escalation.
- Operations handles tactical planning after notification.

### Case-Study Framing

> I collapsed four UI phases into two operational modes because the operator's actual cognitive job was not "scan, verify, contain, rescue." It was "build enough intelligence to escalate" and then "coordinate the response."

## Decision Story 3 - TALON As Copilot, Not Chatbot

### Initial Direction

TALON appeared through recommendations, text rationale, and a voice override flow.

### Problem Found

This made TALON feel like an AI label layered onto a dashboard. It did not feel like an active copilot.

### Final Decision

Make TALON a persistent right-rail copilot with:

- Evidence convergence.
- Agent tasks.
- Missing data.
- Recommendation reasoning.
- Contextual prompt chips.
- Decision receipt preview.

### Why

A real AI product designer portfolio should show the relationship between:

- AI reasoning.
- Data inputs.
- Human questions.
- Decision gates.
- Trust.
- Failure states.

### Case-Study Framing

> I avoided making TALON a generic chatbot. Instead, I designed TALON as a scene-aware copilot whose answers are grounded in evidence, current risk, and human authorization boundaries.

## Decision Story 4 - From Static Confidence To Evidence Convergence

### Initial Direction

The product showed confidence values like 40% or 78%.

### Problem Found

A static confidence number does not explain why the system is confident or what data is missing.

### Final Decision

Use evidence convergence:

- Source status.
- Source freshness.
- Source agreement.
- Missing data.
- Confidence over time.
- Threshold for escalation.

### Why

This makes trust visual and operational.

### Case-Study Framing

> Instead of asking the operator to trust a score, I let them watch TALON build its case across thermal, satellite, drone visual, LiDAR, wind, terrain, fuel, and human-risk sources.

## Decision Story 5 - Text-Heavy Dashboard To Data Command Surface

### Initial Direction

Many panels relied on explanatory text.

### Problem Found

Text-heavy AI interfaces slow operators and create interpretation risk.

### Final Decision

Repurpose panels:

- Left rail: selected-data inspector.
- Right rail: TALON copilot.
- Map: primary data canvas.
- Bottom bar: human decision gates.

### Why

The interface should show complex data through visual systems, not paragraphs.

### Case-Study Framing

> The main UX issue was not missing features. It was that the product asked operators to read too much during a high-pressure moment. I redesigned the information architecture so source state, risk, confidence, and action readiness became visual.

## Decision Story 6 - Agentic Workflow For 2026 AI UX

### Initial Direction

TALON recommendations appeared as static outputs.

### Problem Found

Static recommendations do not show how AI reaches outcomes or what work it is doing.

### Final Decision

Represent TALON as supervised agents:

- Sensor Fusion.
- Fire Behavior.
- Values at Risk.
- Resource Readiness.
- Notification Brief.
- Operations Planner.
- Governance.

### Why

Agentic workflow is a major 2026 AI UX pattern. The product should show AI completing tasks, hitting blockers, waiting for data, and handing decisions to humans.

### Case-Study Framing

> I designed TALON's intelligence as an agent workflow, not a single black-box recommendation. That made the AI feel active while preserving clear boundaries around what it could and could not do.

## Decision Story 7 - Governance As Product Experience

### Initial Direction

The product had activity logs and some human authorization.

### Problem Found

For enterprise AI, a log is not enough. The system needs decision receipts and explicit accountability.

### Final Decision

Add governance artifacts:

- Authority notification packet.
- Decision receipts.
- Override reasons.
- Human gates.
- Escalation hierarchy.
- Audit trail.

### Why

High-consequence AI must be reviewable.

### Case-Study Framing

> I treated governance as part of the UX, not a compliance appendix. Every major TALON recommendation becomes reviewable through a human decision receipt.

## Decision Story 8 - Designed Failure States

### Initial Direction

The prototype already had some failure states:

- Signal degradation.
- Battery critical.
- Satellite loss.
- Network degradation.
- Infrastructure total loss.

### Problem Found

Failure states needed to be integrated into the new AI model, not presented as isolated demo scenes.

### Final Decision

Add Intelligence and Operations failure scenarios:

- Thermal false positive.
- Source disagreement.
- Smoke-blocked drone visual.
- Stale satellite.
- Wind mismatch.
- Authority notification failure.
- Airspace restriction.
- Model confidence collapse.

### Why

AI products are judged by how they behave when certainty breaks.

### Case-Study Framing

> The strongest AI design work was in the failure states. I designed how TALON communicates uncertainty, what it can still do, and where the human must step in.

## Old Claims To Rewrite Later

- "48 minutes to 90 seconds" should specify the endpoint as verified escalation and authority notification.
- "Containment authorized by 90 seconds" should be removed or reframed.
- "Rescue phase starts by 90 seconds" should be changed to "Operations begins after notification."
- "TALON confidence" should not appear as only a static score.
- "Voice-to-TALON" should be described as simulated prototype interaction unless real ASR/model integration is added.

## Future Case Study Structure

1. Hook: The hardware could move fast, but the operator still needed a defensible escalation decision.
2. Context: AI-powered drones, wildfire monitoring, 48-minute traditional response gap.
3. Product correction: why 90 seconds was redefined.
4. Intelligence demo: evidence convergence to authority notification.
5. Operations demo: TALON supports containment/rescue after notification.
6. Decision stories: two-phase model, TALON copilot, evidence convergence, agent workflow, governance.
7. Failure states: source disagreement, stale data, blocked visibility, authority notification failure.
8. Outcome: estimated impact, proxy metrics, what would be tested next.

