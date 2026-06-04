# 02 - Real-World Wildfire Response Grounding

This file captures the real-world grounding behind the Sentinel V2 product model. It is not intended to claim Sentinel is a real certified emergency-response system. It is intended to keep the prototype credible and defensible in a portfolio review or interview.

## Core Question

Would the revised Sentinel model work better in an actual on-ground forest fire response scenario?

Answer:

Yes. The revised model is more credible than the old one because it separates early intelligence and escalation from later operational planning.

## Sources Checked

### NWCG Initial Attack Sizeup/Safety

Source:

https://www.nwcg.gov/6mfs/operational-engagement/initial-attack-sizeupsafety

Relevant idea:

Early response depends on size-up and relaying key information, including:

- Fire location.
- Fire size.
- Fuel type.
- Fire behavior.
- Weather and wind.
- Terrain.
- Values at risk.
- Resources needed.
- Safety conditions.
- Information relayed to dispatch.

Product implication:

Sentinel should not present a complete tactical plan before it has enough size-up data. The first AI job should be to gather and synthesize enough evidence for escalation.

### NWCG Fire Not Scouted And Sized Up

Source:

https://www.nwcg.gov/6mfs/operational-engagement/fire-not-scouted-and-sized

Relevant idea:

Acting before a fire is properly scouted and sized up creates risk. A fire that has not been understood can lead to unsafe tactics.

Product implication:

Sentinel should make scouting and evidence convergence visible. The operator should not just see "AI confidence 78%." They should see what TALON has scouted, what is missing, and what remains uncertain.

### USFA/FEMA NIMS Command And Coordination

Source:

https://www.usfa.fema.gov/a-z/nims/command-and-coordination.html

Relevant idea:

Incident response separates:

- On-scene tactical command.
- Incident support and coordination.
- Policy decision-making.
- Public information.
- Resource coordination.

Product implication:

Sentinel should not make TALON look like the incident commander. TALON should support command by preparing intelligence, routing evidence, and creating escalation packets. Human authority remains responsible for high-consequence decisions.

### CAL FIRE Incident Information

Source:

https://www.fire.ca.gov/incidents/

Relevant idea:

Public incident information can lag and may require approval by incident command before release.

Product implication:

Sentinel should show source freshness, authority status, and whether information has been approved, notified, or is still provisional.

## Realistic On-Ground Scenario Model

### Old Product Assumption

The old product assumed:

1. TALON detects anomaly.
2. TALON verifies anomaly.
3. Operator confirms incident.
4. TALON creates containment plan.
5. Operator authorizes containment.
6. Rescue phase starts.
7. All this happens inside the 90-second target.

Problem:

This compresses too many operational responsibilities into one promise. It risks making the product feel like science fiction instead of high-quality enterprise AI.

### Revised Product Assumption

The revised product assumes:

1. TALON detects anomaly.
2. TALON starts source convergence.
3. TALON dispatches or recommends scout verification depending on authority rules.
4. TALON synthesizes evidence.
5. Operator confirms whether emergency escalation is justified.
6. TALON prepares notification packet.
7. Operator sends authority notification inside 90 seconds.
8. Operations planning begins after the notification.

This is more realistic because the first critical objective is not to solve the entire incident. It is to make the first authority-level decision much faster.

## What Data Is Usually Needed Early

Sentinel should visually represent the data normally needed during early wildfire size-up:

### Location And Spread Context

- Exact anomaly location.
- Terrain and slope.
- Nearby roads.
- Wind direction and speed.
- Initial spread direction.
- Projected spread zone.

### Sensor Evidence

- Thermal anomaly strength.
- Satellite IR corroboration.
- Drone visual confirmation.
- Drone thermal view.
- LiDAR or terrain reconstruction.
- Historical burn memory.
- Fuel/vegetation risk.

### Human Consequence

- Structures in projected path.
- Residential areas.
- Field teams nearby.
- Road and evacuation route viability.
- Critical infrastructure.
- Personnel exposure.

### Resource Readiness

- Drone availability.
- Battery.
- Signal strength.
- Payload type.
- ETA.
- Coverage gaps.
- Ground-team readiness.

### Confidence And Uncertainty

- Which sources agree.
- Which sources disagree.
- Which sources are stale.
- Which sources are missing.
- What TALON knows.
- What TALON does not know.

## Product Principle

Sentinel should communicate:

> We are not using AI to skip emergency judgment. We are using AI to compress the time required to reach a defensible first judgment.

## Authority Notification Packet

The authority notification packet should become a core product artifact.

It should include:

- Incident location.
- Time detected.
- Confidence state.
- Confirmed evidence sources.
- Missing evidence sources.
- Current fire behavior.
- Values at risk.
- Recommended response level.
- TALON rationale.
- Operator identity.
- Timestamp.
- Audit id.

This packet marks the end of the 90-second milestone.

## Why The New Model Is Stronger For EY / AI Product Designer Positioning

EY and similar enterprise AI roles evaluate whether a designer can handle:

- Human-in-the-loop systems.
- Trust and uncertainty.
- AI governance.
- Operational workflows.
- Auditability.
- Enterprise decision authority.
- High-consequence UX.
- Conversational and agentic interfaces.

The revised model demonstrates those skills better than a flashy but unrealistic rescue dashboard.

## Case-Study Story

Potential section title:

> The breakthrough: 90 seconds should not mean "the plan is done."

Potential narrative:

> My initial interpretation of the brief was to compress the full containment workflow into 90 seconds. That made the prototype feel fast, but it ignored the realities of incident response. Fire response starts with size-up, escalation, and dispatch communication. The more credible design target became: help the operator reach a verified escalation decision and notify authorities in under 90 seconds, then support tactical operations after the handoff.

