# 04 - TALON Agentic Workflow

## Purpose

This file defines TALON as a supervised agentic copilot rather than a static recommendation layer.

TALON should feel alive, useful, and operationally credible, but it must never remove human accountability for high-consequence decisions.

## Core Principle

TALON is an agentic system that can:

- Gather data.
- Analyze data.
- Compare sources.
- Prepare recommendations.
- Draft authority notifications.
- Prepare operational plans.
- Route low-risk tasks.
- Monitor execution.
- Surface failures.
- Create audit records.

TALON cannot:

- Secretly authorize emergency response.
- Notify authorities without a human gate.
- Evacuate civilians without human authorization.
- Override the operator.
- Hide uncertainty.
- Treat missing data as certainty.
- Make policy decisions.

## TALON Behavioral Contract

The product should make this contract visible:

> TALON accelerates evidence and preparation. Humans authorize high-consequence action.

## Agent Roles

### 1. Sensor Fusion Agent

Inputs:

- Thermal anomaly.
- Satellite IR.
- Drone visual.
- Drone thermal feed.
- LiDAR.
- Ground sensor grid.

Computes:

- Source agreement.
- Source disagreement.
- Confidence contribution by source.
- Freshness/staleness.
- Missing source impact.

Outputs:

- Evidence convergence score.
- Source matrix.
- Data quality warnings.
- Recommended next evidence step.

User value:

- Reduces manual cross-checking.
- Helps the operator see why TALON believes an anomaly is real or uncertain.

### 2. Fire Behavior Agent

Inputs:

- Wind direction.
- Wind speed.
- Terrain.
- Slope.
- Fuel/vegetation.
- Historical burn memory.
- Current thermal footprint.

Computes:

- Spread direction.
- Spread rate.
- Fire growth window.
- Uncertainty band.
- High-risk sectors.

Outputs:

- Spread bands.
- Risk vector.
- Fire-behavior rationale.
- Confidence warning if data is weak.

User value:

- Turns raw environmental data into operational risk.

### 3. Values-at-Risk Agent

Inputs:

- Structures.
- Roads.
- Residential zones.
- Critical infrastructure.
- Field team locations.
- Evacuation corridors.

Computes:

- Human consequence.
- Structures inside projected path.
- Route exposure.
- Team exposure.
- Priority zones.

Outputs:

- Human consequence score.
- Structures-at-risk metric.
- Route risk summary.
- Priority map overlays.

User value:

- Helps the operator understand why the incident needs escalation.

### 4. Resource Readiness Agent

Inputs:

- Drone fleet.
- Battery.
- Signal.
- Payload.
- ETA.
- Coverage role.
- Ground-team readiness.

Computes:

- Best scout asset.
- Best relay asset.
- Coverage gaps.
- Battery risk.
- Handoff readiness.

Outputs:

- Resource status matrix.
- Recommended drone assignment.
- Backup recommendation.
- Autonomy-safe handoff suggestion.

User value:

- Reduces time spent manually matching assets to the incident.

### 5. Notification Brief Agent

Inputs:

- Confirmed evidence.
- Missing evidence.
- Incident location.
- Human consequence.
- Fire behavior.
- Operator identity.
- Time elapsed.

Computes:

- Escalation packet readiness.
- Information sufficiency.
- Missing fields.
- Authority notification confidence.

Outputs:

- Authority notification packet.
- Suggested message.
- Evidence summary.
- Audit id.

User value:

- Turns AI analysis into an actionable, human-approved escalation artifact.

### 6. Operations Planner Agent

Inputs:

- Confirmed incident.
- Authority notification status.
- Fire behavior model.
- Resource readiness.
- Route viability.
- Team readiness.

Computes:

- Containment options.
- Rescue zones.
- Drone task sequence.
- Team staging options.
- Route guidance.
- Operational blockers.

Outputs:

- Recommended operations brief.
- Alternate plan.
- Blockers.
- Human authorization gates.

User value:

- Helps the operator move from escalation into coordinated action.

### 7. Governance Agent

Inputs:

- TALON recommendations.
- Operator decisions.
- Overrides.
- Confidence state.
- Data sources.
- Escalations.
- Authorization events.

Computes:

- Audit completeness.
- Human-control compliance.
- Override reason status.
- Escalation chain.

Outputs:

- Decision receipts.
- Audit trail.
- Accountability record.
- Case closure summary.

User value:

- Makes the AI system enterprise-credible and reviewable after the incident.

## Agent Status States

Each agent task should have a visible state:

- `queued`: waiting to start.
- `running`: actively processing.
- `blocked`: missing source, human gate, or failed dependency.
- `complete`: output ready.
- `degraded`: output exists but confidence is reduced.
- `replaced`: output superseded by newer data.

## Agent Workflow In Intelligence

1. Sensor Fusion Agent starts first.
2. Fire Behavior Agent starts once location and wind are available.
3. Values-at-Risk Agent starts once projected path is available.
4. Resource Readiness Agent selects scout/drone coverage.
5. Notification Brief Agent prepares escalation packet.
6. Governance Agent records each step.

## Agent Workflow In Operations

1. Operations Planner Agent creates plan options.
2. Resource Readiness Agent assigns drones and backup assets.
3. Fire Behavior Agent updates spread risk.
4. Values-at-Risk Agent updates rescue priority.
5. Governance Agent records authorizations, overrides, and exceptions.

## Conversational Copilot Rules

TALON should answer:

- Why now?
- What changed?
- What data is missing?
- What sources disagree?
- What can TALON do without me?
- What requires my authorization?
- What is the safer alternative?
- What happens if we wait?
- What changed after my voice correction?

TALON should not answer as a generic chatbot. Every answer should be tied to:

- Current phase.
- Current source state.
- Current risk vector.
- Current action gate.
- Current failure state.

## Simulated Conversation Model

No live AI API is required for this version.

Use scene-aware structured responses:

- Prompt chips are predefined.
- Responses are predefined but dynamic by scene.
- TALON response can include a short streaming animation.
- Each response links back to a data source, map overlay, or decision receipt.

Reason:

- A live API may produce realistic text but will not understand the prototype state without deeper integration.
- A structured simulation is more reliable for portfolio evaluation.
- The goal is to demonstrate AI product design, not build a production AI backend.

## Where A Real AI API Could Fit Later

Future optional upgrade:

- Use an API only for natural-language phrasing of TALON responses.
- Keep source data, action permissions, and phase state deterministic.
- Never let the model decide authorization.
- Never let the model invent source data.
- Always ground the model in structured telemetry.

## Human-Control Boundaries

### TALON May Prepare Automatically

- Evidence summary.
- Confidence analysis.
- Drone readiness recommendation.
- Authority notification draft.
- Operations brief draft.
- Alternate plan.
- Audit receipt draft.

### TALON May Execute Low-Risk Automation

- Continue monitoring.
- Recalculate confidence.
- Update map overlays.
- Reassign a drone only for continuity when already authorized and low-risk, such as battery handoff.
- Mark a data source stale.
- Queue a recommended task.

### TALON Requires Human Approval For

- Authority notification.
- Emergency escalation.
- Containment authorization.
- Evacuation action.
- Field-team redeployment.
- Incident closure.
- Abort or stand down.

## Case-Study Decision Story

Potential story:

> Instead of making TALON a chatbot, I designed it as a supervised agentic workflow. Each TALON capability maps to a task: sensor fusion, fire behavior, values at risk, resource readiness, notification brief, operations planning, and governance. This let the UI show AI working without pretending the model had unlimited authority.

