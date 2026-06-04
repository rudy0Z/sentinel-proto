# Sentinel AI Copilot + Data-Driven UX Upgrade Plan

## Summary

Upgrade Sentinel from a text-heavy AI dashboard into an enterprise-cinematic AI command system where TALON behaves like a visible, conversational copilot and the operator can understand decisions through visual evidence convergence instead of reading dense panels.

Design direction:
- Domain concepts: sensor fusion, thermal anomaly, confidence convergence, drone fleet telemetry, containment perimeter, evacuation corridors, human authorization, audit chain.
- Signature pattern: **TALON Evidence Convergence Rail** — a persistent right-side copilot that combines conversation, source alignment, risk visuals, and decision accountability.
- Replace defaults:
  - Generic chat panel → contextual TALON copilot tied to scene, evidence, and map state.
  - Text priority cards → visual source/risk/forecast modules.
  - Static confidence number → source-by-source convergence over time.
  - “AI recommendation” copy → transparent recommendation with missing data, confidence reason, and human-control boundary.

Chosen defaults:
- Scope: prototype + decision documentation, not case-study HTML yet.
- TALON location: dedicated right rail.
- Data model: structured mock telemetry, no backend/API.
- Tone: enterprise-cinematic, not movie-only or plain utility.
- Dominant data story: evidence convergence.

## Key Changes

### 1. Documentation System First

Create `docs/sentinel-ai-upgrade/` before UI work so every product/design decision becomes future case-study material.

Create these markdown files:
- `00-decision-log.md`: running log with date, decision, suggested by, final choice, why, tradeoff, product impact, case-study angle.
- `01-product-thesis.md`: refined thesis, 48-min-to-90-sec framing, assumptions, evidence limits, target user, success criteria.
- `02-talon-copilot-model.md`: TALON behavior rules, autonomy boundaries, conversation principles, failure-state behavior.
- `03-data-visualization-system.md`: source convergence model, map overlays, chart patterns, data hierarchy.
- `04-human-control-governance.md`: authorization gates, escalation hierarchy, override rules, auditability.
- `05-implementation-notes.md`: phase-by-phase implementation record with changed files, screenshots to capture later, and unresolved questions.

Decision-log row format:
`Date | Phase | Decision | Suggested by | Final choice | Why | Tradeoff | Product evidence | Case-study story`

### 2. Structured AI Telemetry Layer

Add local structured data for TALON instead of relying on text strings.

New internal types:
- `EvidenceSource`: source id, label, status, confidence contribution, freshness, reliability, failure reason.
- `EvidenceConvergencePoint`: timestamp, total confidence, active sources, missing sources.
- `TalonCopilotMessage`: actor, message type, scene, summary, linked evidence ids, optional recommended action.
- `TalonPrompt`: operator question chip, scene availability, canned response.
- `DecisionRecord`: action, operator, TALON recommendation, accepted/overridden, reason, confidence state, timestamp.
- `RiskVector`: structures at risk, spread rate, wind change, route viability, drone coverage, consequence level.

Use structured mock telemetry in the existing mock-data layer. Do not add real APIs, backend services, or package installs.

### 3. TALON Dedicated Copilot Rail

Replace the current right-side priority/team stack with a persistent TALON rail.

Rail composition:
- Top: TALON state card showing current phase, confidence posture, and “what TALON is doing now.”
- Middle: evidence convergence visual showing thermal, satellite IR, burn history, wind, drone visual, and LiDAR status.
- Middle/lower: contextual recommendation card with “why this,” “what changed,” and “what data is missing.”
- Conversation area: operator prompt chips such as “Why now?”, “What changed?”, “What can TALON do without me?”, “What data is missing?”, and “Show safer alternative.”
- Bottom: compact field/team snapshot only when operationally necessary, kept visual and minimal.

Copilot behavior:
- Scan: quiet monitoring, source pipeline visible but low urgency.
- Alert: TALON explains why it interrupted now; confidence starts partial.
- Verify: convergence updates as drone visual/LiDAR arrives.
- Contain: recommendation is tied to risk vectors and source confidence.
- Rescue: rail compresses into critical command status, route risk, evacuation progress, and TALON accountability.
- Failure states: missing/offline sources visually degrade the convergence model and change TALON’s answer language.

TALON must never auto-authorize containment, evacuation, or irreversible response. It may recommend, prepare, route, reassign assets under allowed boundaries, and escalate to another human.

### 4. Visual Data System

Add data-heavy visual modules using existing dependencies only, especially Recharts and SVG/map overlays.

Required visual modules:
- Evidence convergence timeline: total confidence over scenario time.
- Source status matrix: each source’s status, freshness, and contribution.
- Risk vector strip: structures at risk, spread rate, wind, route viability, drone coverage.
- Missing-data state: explicitly shows what TALON does not know.
- Recommendation delta: shows how the recommendation changed after voice override or degraded data.
- Decision receipt preview: shows accepted/rejected/overridden TALON guidance.

Map upgrades:
- Evidence source pings correspond to source statuses.
- Confidence aura/rings around anomaly shift as sources converge.
- Degraded scenes remove or dim unavailable source layers.
- Containment forecast uses stronger visual priority for spread bands, routes, and consequence zones.

### 5. Preserve Human Control And Existing Flow

Keep the current phase structure and action bar intact:
`Scan → Verify → Contain → Rescue`

Preserve:
- Alert interrupt.
- Scout dispatch.
- Verify feed.
- Hold-to-authorize.
- Voice override.
- Escalation protocol.
- Battery handoff.
- Infrastructure failure.
- Review dock.

Refactor only where needed so TALON’s new rail becomes the primary explanation surface. Existing left rail remains operational detail; right rail becomes AI copilot + visual reasoning.

## Test Plan

Run after implementation:
- `npm run build`
- Manual scenario walkthrough at 1440×900:
  - baseline → alert → dispatch scout → verify → confirm incident → contain → authorize → rescue
  - voice override → revised TALON plan
  - satellite feed loss
  - network degraded
  - terrain fallback
  - battery critical
  - infrastructure total loss
  - no-response escalation
- Verify TALON rail changes by scene and never presents unauthorized AI action as completed.
- Verify confidence/evidence visuals update from partial → converging → degraded.
- Verify text-heavy areas are reduced and key decisions are visually scannable within 3-5 seconds.
- Verify keyboard/focus states still work for action tiles, prompt chips, modals, and hold-to-authorize.
- Capture screenshots for future case-study evidence but do not update the HTML case study yet.

## Assumptions

- No live AI, ASR, backend, or API integration in this phase.
- Conversational TALON is a simulated prototype using structured scene-aware prompt chips and canned responses.
- The case-study HTML will be updated only after the product upgrade is implemented and documented.
- New documentation lives in `docs/sentinel-ai-upgrade/`.
- The goal is portfolio credibility for AI product design roles, so every feature must explain: what TALON knows, what it does not know, what it recommends, what it can do autonomously, and where the human remains accountable.
