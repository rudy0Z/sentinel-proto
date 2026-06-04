# 06 - Governance And Auditability

## Purpose

Sentinel is a high-consequence AI product. The product must make accountability visible.

Governance and auditability are not secondary enterprise features. They are core to making TALON trustworthy.

## Core Rule

TALON can accelerate, prepare, recommend, monitor, and recover.

TALON cannot silently take threatening control away from the human.

## Human-In-The-Loop Model

### TALON Responsibilities

TALON is responsible for:

- Detecting anomalies.
- Fusing evidence.
- Estimating risk.
- Preparing notification packet.
- Preparing operations plan.
- Recommending next action.
- Monitoring execution.
- Identifying failure states.
- Recording decision context.

### Human Responsibilities

The operator is responsible for:

- Confirming emergency escalation.
- Sending authority notification.
- Authorizing high-consequence operations.
- Approving evacuation or containment actions.
- Overriding TALON when needed.
- Acknowledging exceptions.
- Standing down or aborting mission.

## Authorization Gates

### Gate 1: Emergency Escalation And Authority Notification

Phase:

- Intelligence.

Human action:

- Confirm emergency risk and notify authorities.

TALON preparation:

- Evidence convergence.
- Authority packet.
- Missing-data warning.
- Recommended escalation level.

Audit record:

- Operator.
- Time.
- Evidence sources.
- Confidence state.
- Notification packet.
- Any missing sources.

### Gate 2: Operations Plan Authorization

Phase:

- Operations.

Human action:

- Approve containment/rescue plan.

TALON preparation:

- Plan options.
- Risk vectors.
- Drone assignments.
- Route viability.
- Team readiness.

Audit record:

- Recommended plan.
- Accepted or overridden.
- Reason.
- Source state.
- Operator.

### Gate 3: Override

Phase:

- Intelligence or Operations.

Human action:

- Change TALON recommendation.

TALON preparation:

- Recompute plan.
- Show recommendation delta.
- Surface tradeoff.

Audit record:

- Original recommendation.
- Operator correction.
- Revised recommendation.
- Override reason.
- Risk impact.

### Gate 4: Exception Acknowledgement

Phase:

- Operations.

Human action:

- Acknowledge degraded state or exception.

TALON preparation:

- Explain impact.
- Show fallback.
- Identify safe continuation or stop condition.

Audit record:

- Exception type.
- TALON response.
- Operator acknowledgement.
- Continued/paused/aborted state.

### Gate 5: Stand Down / Abort

Phase:

- Operations.

Human action:

- Stop or close active response.

TALON preparation:

- Consequence preview.
- Asset recall plan.
- Notification impact.

Audit record:

- Abort/stand-down reason.
- Assets affected.
- Teams affected.
- Authority status.
- Operator.

## Escalation Hierarchy

If the operator does not respond during a high-consequence alert:

1. TALON does not dispatch irreversible response automatically.
2. TALON escalates to secondary operator.
3. TALON escalates to commander if required.
4. TALON records non-response.
5. TALON records who received the escalation.

This is already partly present in the current prototype and should become a stronger decision story.

## Audit Receipt Data Model

Each audit receipt should include:

- Receipt id.
- Incident id.
- Phase.
- Scene.
- Trigger.
- TALON recommendation.
- Human decision.
- Operator identity.
- Timestamp.
- Confidence at decision time.
- Evidence source state.
- Missing data.
- Override reason if any.
- Authority notification status.
- Next accountability owner.

## Audit UI Rules

The audit UI should be:

- Compact during live response.
- Expandable after action.
- Visible enough to prove accountability.
- Not so large that it competes with the live map.

Recommended pattern:

- Live decision receipt preview in TALON rail.
- Full audit drawer or modal accessible from the activity log.
- Final incident closure receipt after Operations.

## Governance Language Rules

Use language that separates AI and human authority.

Preferred:

- "TALON recommends."
- "TALON prepared."
- "TALON detected missing data."
- "Awaiting operator authorization."
- "Authority notification ready."
- "Operator confirmed escalation."

Avoid:

- "TALON decided."
- "TALON authorized."
- "TALON evacuated."
- "AI took control."
- "Automatic rescue executed."

Exception:

TALON may automatically preserve continuity for already-authorized low-risk operational tasks, such as drone battery handoff during an active authorized operation. Even then, it must explain what it did and why.

## Failure Accountability

Every failure state must answer:

- What failed?
- What data is affected?
- What does TALON still know?
- What does TALON no longer know?
- What can TALON do safely?
- What requires a human?
- What is recorded?

## Case-Study Angle

Potential section:

> Designing AI that is powerful without being unaccountable.

Story:

> The key governance challenge was deciding where TALON could act and where it must stop. I designed TALON as a supervised copilot: it can synthesize evidence, prepare notification, and keep operations moving, but it cannot authorize high-consequence action. Every major gate creates a decision receipt so the system can be reviewed after the incident.

