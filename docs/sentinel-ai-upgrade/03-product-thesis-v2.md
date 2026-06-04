# 03 - Product Thesis V2

## Product Name

FlytBase Sentinel

## Product Category

AI-native wildfire command and response intelligence system.

## V2 Thesis

FlytBase Sentinel helps an emergency command operator move from uncertain wildfire signal to verified authority notification in under 90 seconds by using TALON, a supervised AI copilot, to synthesize live drone telemetry, sensor evidence, environmental data, and human-risk signals.

After escalation, Sentinel shifts into Operations mode, where TALON supports containment planning, rescue coordination, field-team guidance, degraded-state handling, and auditability while preserving human control over irreversible decisions.

## Problem Statement

The hardware can move quickly. Drones, sensors, thermal cameras, and automated patrol systems can detect anomalies fast. The slower part is the human software workflow:

- Operators must interpret multiple data sources.
- Operators must verify if an anomaly is real.
- Operators must understand human consequence.
- Operators must decide whether to escalate.
- Operators must notify authorities with enough confidence.
- Operators must keep accountability in high-pressure conditions.

Traditional response time can stretch toward 48 minutes because the operator is forced to assemble the picture manually.

Sentinel V2 reframes the product problem:

> How might we help an operator reach a defensible, auditable emergency escalation decision in 90 seconds without hiding uncertainty or removing human authority?

## Old Product Thesis

The old product thesis was:

> Reduce wildfire response from 48 minutes to 90 seconds by letting AI-powered drones verify, contain, and rescue through a staged command interface.

Weakness:

This made it sound like the complete operational plan could be safely finalized inside 90 seconds.

## New Product Thesis

The new product thesis is:

> Reduce the time from uncertain wildfire anomaly to verified authority notification from 48 minutes toward 90 seconds by using TALON to synthesize evidence, expose confidence, and prepare a human-approved escalation packet.

Strength:

This is more defensible, more operationally credible, and better aligned with enterprise AI design.

## Target User

Primary user:

- Emergency command operator monitoring drone-based wildfire intelligence.

User context:

- Night shift or low-staffed command center.
- High stakes.
- Multiple data feeds.
- Time pressure.
- Limited tolerance for ambiguous text.
- Needs spatial reasoning.
- Needs confidence and source clarity.
- Must preserve accountability.

User question during Intelligence:

> Is this real, urgent, and authority-notifiable?

User question during Operations:

> What needs to happen now, what has TALON prepared, what is blocked, and what still requires human approval?

## User Needs

### During Intelligence

The operator needs:

- A clear anomaly location.
- A visible evidence-building process.
- Source agreement/disagreement.
- Confidence trend.
- Missing data.
- Risk to people and structures.
- A concise TALON recommendation.
- A ready-to-send authority notification packet.
- Ability to confirm, defer, dismiss, or escalate.

### During Operations

The operator needs:

- Containment options.
- Rescue zones.
- Drone assignments.
- Team readiness.
- Route viability.
- Exception alerts.
- Human control gates.
- TALON recommendations with reasoning.
- Audit trail.

## Product Scope

### In Scope

- High-fidelity prototype.
- Structured mock telemetry.
- Simulated TALON copilot.
- Evidence convergence visuals.
- Agentic workflow visualization.
- Human-in-the-loop authorization.
- Authority notification packet.
- Operations planning after notification.
- Failure simulation suite.
- Audit receipts.
- Documentation archive for case study.

### Out Of Scope For This Version

- Real AI model integration.
- Real speech recognition.
- Backend.
- Live emergency APIs.
- Real incident dispatch.
- Real drone control.
- Regulatory certification.
- Mobile field app.
- Multi-user collaboration backend.

## New Success Criteria

### Product Success

The prototype succeeds if a viewer can understand:

- TALON is actively synthesizing evidence, not just showing static text.
- The first 90 seconds end with verified escalation and authority notification.
- Operations planning continues after notification.
- The AI is useful but bounded.
- Human accountability is preserved.
- Data visualization replaces dense reading.
- Failure states are designed, not ignored.

### Portfolio Success

The case study succeeds if it shows:

- AI product strategy.
- Complex data-product thinking.
- Conversational UX.
- Agentic workflow design.
- Human-in-the-loop governance.
- Trust and uncertainty handling.
- Enterprise-grade auditability.
- Realistic product reasoning.
- Strong visual-data craft.

## 90-Second Milestone Definition

Timer starts:

- TALON detects a serious anomaly that crosses the initial triage threshold.

Timer ends:

- Operator confirms emergency escalation and sends authority notification.

Timer does not end at:

- Full containment plan completion.
- Rescue route completion.
- All teams assigned.
- Full evacuation plan completion.

## Intelligence Phase Flow

1. Passive monitoring.
2. TALON detects anomaly.
3. TALON starts source convergence.
4. Scout/drone evidence is gathered.
5. Confidence builds or degrades visually.
6. Human consequence is calculated.
7. TALON prepares notification packet.
8. Operator confirms emergency escalation.
9. Authorities are notified.
10. Operations phase begins.

## Operations Phase Flow

1. TALON opens an operations brief.
2. Containment options are generated.
3. Rescue zones are identified.
4. Drones and teams are assigned.
5. Routes are evaluated.
6. Operator authorizes high-consequence actions.
7. TALON supervises execution.
8. Failure states trigger re-evaluation.
9. Audit receipts are created.
10. Incident is closed or handed off.

## Design Principles

### AI Should Be Visible, Not Magical

TALON should show what it is processing, what it knows, and what is missing.

### Data Should Be Visual First

The operator should not need to read multiple paragraphs under pressure. Use:

- Source chips.
- Convergence charts.
- Risk vectors.
- Route state visuals.
- Agent task progress.
- Decision receipts.
- Map overlays.

### Conversation Should Be Contextual

TALON should not be a generic chatbot. It should answer questions based on the current scene, evidence state, and decision gate.

### Human Control Should Be Explicit

The UI must clarify:

- What TALON recommends.
- What TALON can prepare.
- What TALON can execute automatically.
- What requires human authorization.

### Failure Must Be Designed

The product must include:

- Low confidence.
- Missing data.
- Source disagreement.
- Delayed feeds.
- Human non-response.
- Authority notification failure.
- Infrastructure loss.

## Positioning For EY AI Product Designer Role

This project should communicate:

> I can design AI-first enterprise workflows where the hardest part is not the screen layout, but the relationship between data, AI reasoning, human judgment, operational risk, and governance.

