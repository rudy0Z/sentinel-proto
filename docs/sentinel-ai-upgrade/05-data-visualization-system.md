# 05 - Data Visualization System

## Problem

The current Sentinel prototype is too text-dependent.

The product claims to reduce emergency response time from 48 minutes toward 90 seconds, but the UI often asks the operator to read dense text across multiple panels. That weakens the product because:

- Reading under pressure is error-prone.
- Text-heavy dashboards slow expert operators.
- Static confidence numbers feel shallow.
- AI recommendations feel like labels, not evidence.
- The product does not yet showcase enough complex data-product skill.

## Decision

Upgrade Sentinel into a visual data command system.

Use text only where it adds accountability, explanation, or audit clarity. Use visuals for the primary operational understanding.

## Data Visualization Principles

### 1. Evidence Before Recommendation

The operator should see the evidence state before reading the recommendation.

Bad pattern:

> TALON recommends containment. Confidence 78%.

Better pattern:

- Thermal: active.
- Satellite IR: aligned.
- Drone visual: confirmed.
- LiDAR: partial.
- Wind: rising.
- Structures: 47 in projected path.
- TALON: emergency escalation recommended.

### 2. Confidence Is A System, Not A Number

Confidence should show:

- Which sources contribute.
- Which sources are missing.
- Which sources disagree.
- Whether confidence is rising or falling.
- Whether confidence is good enough for escalation.

### 3. Map Is The Primary Data Surface

Emergency operators reason spatially. The map should carry:

- Anomaly location.
- Source pings.
- Confidence rings.
- Drone routes.
- Spread bands.
- Risk zones.
- Evacuation routes.
- Team locations.
- Data degradation overlays.

### 4. Panels Should Summarize, Not Compete

Panels should not become parallel essays. Panels should compress:

- Current status.
- Key metrics.
- Visual evidence.
- Current decision gate.
- Exceptions.

### 5. The AI Should Look Like It Is Working

Show:

- Queued tasks.
- Running tasks.
- Staged outputs.
- Loading/processing states.
- Partial readiness.
- Blockers.
- Recomputed results after new data.

## Core Data Visuals

### Evidence Convergence Timeline

Purpose:

Show confidence building over time.

Data:

- Timestamp.
- Total confidence.
- Active sources.
- Missing sources.
- Trigger threshold.

States:

- Building.
- Converging.
- Sufficient for escalation.
- Degraded.
- Conflicting.

Case-study value:

Shows that the operator is not asked to trust a static confidence score. They watch the system build its case.

### Source Matrix

Purpose:

Show which evidence sources are active, stale, missing, or conflicting.

Sources:

- Thermal.
- Satellite IR.
- Drone visual.
- Drone thermal.
- LiDAR.
- Wind.
- Terrain.
- Fuel/vegetation.
- Burn history.
- Structures/roads.

Each source shows:

- Status.
- Freshness.
- Contribution.
- Reliability.
- Failure reason if degraded.

### Risk Vector Strip

Purpose:

Show why the situation matters.

Metrics:

- Structures at risk.
- Spread rate.
- Wind shift.
- Route viability.
- Drone coverage.
- Field-team exposure.
- Confidence.

Visual style:

- Compact horizontal strip.
- One number or state per vector.
- Uses semantic color only when meaningful.

### Agent Task Stack

Purpose:

Show TALON as an agentic workflow.

Rows:

- Sensor Fusion.
- Fire Behavior.
- Values at Risk.
- Resource Readiness.
- Notification Brief.
- Operations Planner.
- Governance.

Each row shows:

- Status.
- Progress.
- Input source.
- Output readiness.
- Blocker if any.
- Human gate if needed.

### Authority Notification Packet

Purpose:

Mark the 90-second endpoint.

Sections:

- Location.
- Verified evidence.
- Missing data.
- Human consequence.
- Recommended escalation.
- Operator confirmation.
- Timestamp.
- Audit id.

Visual style:

- Structured receipt, not paragraph.
- Clear "ready to notify" state.
- Clear "sent" state.

### Decision Receipt

Purpose:

Make high-consequence actions auditable.

Fields:

- TALON recommendation.
- Human action.
- Confidence at decision time.
- Sources active.
- Sources missing.
- Override reason.
- Operator.
- Timestamp.
- Audit id.

## Panel Redesign Rules

### Left Rail

Role:

Selected-data inspector.

It should show:

- Selected zone metrics.
- Selected drone metrics.
- Selected team metrics.
- Selected anomaly evidence.
- Compact source chips.
- Small charts or sparkline visuals.

It should avoid:

- Long paragraphs.
- Repeating TALON recommendation text.
- Competing with map or copilot.

### Right Rail

Role:

TALON copilot and evidence control center.

It should show:

- TALON status.
- Evidence convergence.
- Agent tasks.
- Conversational prompt chips.
- Recommendation and missing data.
- Decision receipt preview.

It should replace:

- Current priority-only panel.
- Text-heavy risk cards.
- Static right-side summaries.

### Bottom Action Bar

Role:

Human decision gates.

It should show:

- Next decision.
- Locked/unlocked prerequisite state.
- Human authorization controls.
- Secondary actions collapsed or minimized.

It should avoid:

- Looking like a generic command launcher.
- Mixing low-risk tasks and high-consequence authorizations without hierarchy.

## Map Layer Rules

### Intelligence Map Layers

Show:

- Anomaly location.
- Source pings.
- Scout path.
- Confidence rings.
- Source freshness.
- Initial projected risk.

Hide or minimize:

- Full containment routes.
- Rescue assignment details.
- Final evacuation plan.

Reason:

During Intelligence, the goal is evidence and escalation, not full tactical planning.

### Operations Map Layers

Show:

- Spread bands.
- Containment options.
- Drone coverage cones.
- Team positions.
- Evacuation routes.
- Route viability.
- Blocked paths.
- Degraded source zones.

Reason:

After notification, the operator needs planning and coordination.

## Microinteraction Rules

Use microinteractions to show AI work:

- Source chip pulse while waiting.
- Source chip locks when confirmed.
- Timeline rises as evidence converges.
- Agent task rows stream progress.
- TALON response streams in small chunks.
- Map layer fades in when its source becomes available.
- Degraded sources dim and display reason.
- Human gates animate only when prerequisites become ready.

Avoid:

- Decorative animation.
- Excessive glow.
- Random motion.
- Animations that obscure emergency state.

## Data Hierarchy

Priority order during Intelligence:

1. Is the anomaly real?
2. Is there human consequence?
3. Is evidence sufficient for authority notification?
4. What data is missing?
5. What can TALON do next?

Priority order during Operations:

1. What is the current highest human risk?
2. Which routes/assets/teams are viable?
3. What is blocked or degraded?
4. What requires authorization?
5. What has TALON already prepared?

## Case-Study Angle

Potential section:

> Replacing text-heavy AI with visual evidence convergence.

Story:

> The original interface asked trained operators to read too much under time pressure. I redesigned the information model so TALON's confidence is built visually through source convergence, risk vectors, and agent task progress. The goal was not to make the UI look more futuristic; it was to reduce interpretation error in the first 90 seconds.

