# Sentinel V2 Plan: TALON Copilot, Two-Phase Wildfire Response, Data-Driven Agentic UX

## Summary

Reframe Sentinel from a four-phase dashboard into a two-phase AI command system:

1. **Intelligence**: TALON detects, scouts, verifies, fuses evidence, exposes uncertainty, and helps the operator notify authorities within 90 seconds.
2. **Operations**: after escalation, TALON supports containment, rescue planning, field coordination, exception handling, and auditability.

The new 90-second promise becomes: **verified emergency escalation and authority notification**, not a complete rescue/containment plan. This is more realistic against wildfire practice: early response depends on size-up, dispatch communication, values-at-risk, weather, fuels, terrain, and resource needs before tactical planning is safe.

Research grounding:
- [NWCG Initial Attack Sizeup/Safety](https://www.nwcg.gov/6mfs/operational-engagement/initial-attack-sizeupsafety)
- [NWCG Fire Not Scouted and Sized Up](https://www.nwcg.gov/6mfs/operational-engagement/fire-not-scouted-and-sized)
- [USFA/FEMA NIMS Command and Coordination](https://www.usfa.fema.gov/a-z/nims/command-and-coordination.html)
- [CAL FIRE Incidents](https://www.fire.ca.gov/incidents/)

No case-study HTML changes in this plan. Instead, create decision archive MD files so the future case study has clean evidence, rationale, tradeoffs, and implementation history.

## Key Implementation Changes

### Documentation Archive

Create `docs/sentinel-ai-upgrade/` and save:
- `00-previous-plan.md`: previous proposed plan saved verbatim.
- `01-breakthrough-decision.md`: why the 90-second endpoint changed from “containment plan complete” to “verified escalation + authorities notified.”
- `02-real-world-response-grounding.md`: wildfire size-up, dispatch, ICS/NIMS, authority boundaries, and product implications.
- `03-product-thesis-v2.md`: Intelligence / Operations model, new success criteria, and revised narrative.
- `04-talon-agentic-workflow.md`: TALON agents, autonomy limits, human gates, and failure behavior.
- `05-data-visualization-system.md`: evidence convergence, risk vectors, map layers, and panel rules.
- `06-governance-auditability.md`: decision receipts, override history, escalation hierarchy, and audit model.
- `07-implementation-log.md`: per-phase changes, screenshots to capture later, open issues.
- `08-case-study-decision-stories.md`: raw material for the final portfolio case study.

Each decision entry must record: `decision`, `suggested by`, `final choice`, `why`, `tradeoff`, `implemented evidence`, and `case-study angle`.

### Product Model

Replace visible `Scan / Verify / Contain / Rescue` with:
- **Intelligence**: baseline monitoring, anomaly triage, scout dispatch, evidence convergence, incident confirmation, authority notification.
- **Operations**: containment planning, rescue planning, route guidance, field-team coordination, exception handling, closure.

Implementation default:
- Keep existing scenes internally at first to reduce risk.
- Add a visible `workflowPhase: "intelligence" | "operations"` layer.
- Rename UI labels, progress indicators, guidance text, and case-study language to the two-phase model.
- Later cleanup may rename internal `mode` values, but the first implementation should prioritize visible product behavior.

New 90-second endpoint:
- Timer starts when TALON detects a serious anomaly.
- Timer ends when the operator confirms fatal/emergency risk and authorities are notified.
- Operations planning begins after the 90-second milestone.

### TALON Copilot

Convert the right rail into a persistent TALON copilot rail.

TALON rail modules:
- Current TALON status: what the AI is doing now.
- Evidence convergence: source alignment over time.
- Missing data: what TALON does not know yet.
- Recommendation: why this action, why now, what changed.
- Conversational prompt chips: “Why now?”, “What changed?”, “What data is missing?”, “What can TALON do without me?”, “Show safer alternative.”
- Decision receipt preview: accepted, overridden, escalated, or pending human authorization.

Conversational UX remains simulated. Do not add a live AI API in this version. Use structured scenario responses so the prototype is reliable and matches the UI state.

### Data And Agentic Workflow

Add structured mock telemetry instead of text-only rationale.

Core types:
- `EvidenceSource`: thermal, satellite IR, drone visual, LiDAR, wind, fuel, terrain, burn history, structure/road data.
- `EvidenceConvergencePoint`: confidence over time, active sources, stale sources, missing sources.
- `RiskVector`: structures at risk, spread rate, wind shift, route viability, drone coverage, human consequence.
- `TalonAgentTask`: task id, agent name, status, input data, output, confidence, blocker, human gate.
- `AuthorityNotificationPacket`: location, verified risk, evidence summary, values at risk, recommended next step, operator identity.
- `DecisionReceipt`: TALON recommendation, human action, override reason, timestamp, source state, audit status.

TALON agents:
- Sensor Fusion Agent: correlates thermal, satellite, drone visual, LiDAR.
- Fire Behavior Agent: estimates spread from wind, terrain, fuel, and burn history.
- Values-at-Risk Agent: identifies structures, roads, teams, evacuation zones.
- Resource Readiness Agent: checks drone battery, signal, payload, ETA, coverage.
- Notification Brief Agent: prepares the authority escalation packet.
- Operations Planner Agent: proposes containment/rescue tasks after notification.
- Governance Agent: records decisions, overrides, source freshness, and human gates.

### Data-Driven Interface Upgrade

Repurpose text-heavy panels into visual data surfaces.

Left rail becomes a selected-data inspector:
- Zone, drone, team, or anomaly details shown as compact metrics, source chips, sparklines, and risk vectors.
- Long text becomes expandable supporting detail.

Right rail becomes TALON copilot:
- AI reasoning, evidence, uncertainty, and conversation live here.

Map becomes the main data canvas:
- Source pings.
- Confidence rings.
- Spread bands.
- Route viability.
- Drone coverage cones.
- Stale/offline source dimming.
- Missing-data overlays in degraded states.

Bottom action bar becomes human gates:
- Intelligence gate: confirm emergency and notify authorities.
- Operations gates: authorize plan, override, stand down, abort, acknowledge exception.

### Failure And Simulation Cases

Add reviewable simulation cases across both phases.

Intelligence failures:
- Thermal spike false positive.
- Satellite stale or unavailable.
- Thermal and satellite disagreement.
- Drone visual blocked by smoke/night.
- Wind forecast mismatch.
- Operator unresponsive.
- Multiple anomalies competing for attention.

Operations failures:
- Route blocked after notification.
- Field team signal loss.
- Drone battery handoff.
- Airspace restriction.
- Authority notification channel failure.
- Model confidence collapse.
- Human override conflict.
- Infrastructure total loss.

Each failure state must show:
- Trigger.
- Data affected.
- TALON confidence impact.
- What TALON can still do.
- What requires human authorization.
- Recovery path.
- Audit receipt.

### Visual Quality And Microinteractions

Keep the existing design system direction, but upgrade interaction quality.

Add:
- Evidence convergence animation.
- TALON “working” states with staged outputs.
- Source chips that transition from pending → active → stale → failed.
- Agent task rows that move queued → running → blocked → complete.
- Latency-aware loading states.
- Map layer fades and pulse states.
- Conversation response streaming simulation.
- Reduced-motion safe alternatives.

Do not redesign the full visual identity. Improve density, clarity, data visualization, and AI presence.

## Phased Execution Plan

### Phase 0: Documentation Setup

Create the MD archive, save the previous plan, and document this breakthrough decision before changing UI.

Acceptance:
- All planned MD files exist.
- Previous plan is saved.
- New 90-second definition is documented.
- Real-world wildfire response grounding is captured with source links.

### Phase 1: Product Model Reframe

Introduce the visible Intelligence / Operations workflow.

Acceptance:
- No visible four-phase progress UI remains.
- The 90-second timer ends at authority notification.
- Rescue/containment planning happens after notification.
- Existing scenes still work through the new two-phase framing.

### Phase 2: Structured Telemetry And Agent Tasks

Add mock telemetry and TALON agent task data.

Acceptance:
- TALON recommendations derive from structured mock data.
- Evidence sources have status, freshness, and confidence contribution.
- Agent tasks are visible in UI and linked to scenes.

### Phase 3: TALON Copilot Rail

Replace the current right rail with TALON copilot.

Acceptance:
- TALON can answer scene-aware prompt chips.
- Recommendations expose evidence and missing data.
- Copilot never implies autonomous authority over irreversible actions.

### Phase 4: Data Visualization Panels

Convert text-heavy panels into visual operational data.

Acceptance:
- Confidence, source status, risk, routes, drones, and teams are primarily visual.
- Long paragraphs are reduced or moved behind progressive disclosure.
- Operator can understand the next decision within 3-5 seconds.

### Phase 5: Governance And Auditability

Add decision receipts and richer audit trail.

Acceptance:
- Confirm, notify, override, authorize, abort, and escalation actions create receipts.
- Receipts show operator, TALON recommendation, source state, and reason.
- Escalation hierarchy is visible and documented.

### Phase 6: Failure Simulation Suite

Add the new Intelligence and Operations failure scenarios.

Acceptance:
- Review dock exposes all scenarios.
- Each failure has trigger, affected data, TALON behavior, human gate, and recovery.
- Failure states strengthen the AI-first case-study narrative.

### Phase 7: Evidence Capture Prep

Do not rewrite the HTML case study yet. Prepare case-study-ready material.

Acceptance:
- `08-case-study-decision-stories.md` contains decision stories for the two-phase model, TALON copilot, evidence convergence, governance, and failure handling.
- Screenshot checklist is ready for final case-study production.
- Unsupported old claims are marked for later rewrite.

## Test Plan

Run after implementation:
- `npm run build`
- Full walkthrough:
  - monitoring → anomaly → scout dispatch → evidence convergence → emergency confirmation → authorities notified within 90 seconds
  - operations planning → containment/rescue coordination → exception handling
- Failure walkthrough:
  - stale satellite
  - source disagreement
  - blocked visual confirmation
  - operator unresponsive
  - authority notification failure
  - drone battery handoff
  - infrastructure total loss
- Verify TALON:
  - shows uncertainty and missing data
  - uses visual evidence instead of text-only explanation
  - never self-authorizes high-consequence actions
  - records every human gate in audit receipts
- Visual checks:
  - 1440×900 desktop
  - no text overflow
  - no overlapping panels
  - reduced-motion behavior remains acceptable
  - data visuals remain legible under degraded/failure states

## Assumptions

- This remains a high-fidelity prototype, not a real emergency-response system.
- No live AI API or trained model is added in this version.
- Voice and conversational UX are simulated through structured states and prompt chips.
- The current design system is good enough; upgrades focus on data density, AI presence, microinteractions, governance, and realism.
- Case-study HTML updates come after the product upgrade and documentation archive are complete.
