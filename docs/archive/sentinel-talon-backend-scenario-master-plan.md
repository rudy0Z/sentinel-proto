# Sentinel TALON Backend + Scenario Master Plan

**Status:** planning document — nothing here is built yet.
**Owner:** personal portfolio project. No FlytBase API integration, ever.
**Thesis:** a real backend plus a real LLM API key drives a prototype TALON that controls the whole Sentinel shell — panels, interactions, and mock-data situations — so an external user (recruiter, reviewer) can run varied scenarios live instead of replaying one scripted incident.

Related docs: `DESIGN.md` (product law), `.interface-design/system.md` (token/interaction rules), `docs/portfolio-case-study/sentinel-final-fix-status.md` (what shipped), `src/app/domain/stateMachine.ts` (current transition table — the migration baseline).

---

## 0. Scope and non-goals

**In scope:**
1. A canonical atlas of every Sentinel stage/route (the 90-second sequence, containment, rescue, resolution) plus every branch, edge case, and failure state — specified tightly enough that both a designer and an AI builder can treat states as rock solid.
2. TALON behavior policy: what triggers TALON, how it makes plans, how it pitches them, and how it handles every class of operator response (including silence, refusal, partial compliance, and contradiction).
3. Backend architecture + frontend integration contracts so an LLM-backed TALON can drive the entire shell.
4. Database design: a proper data layer plus **multiple parallel scenario packs** so repeat visits don't replay the same incident.
5. A test matrix covering states, transitions, edges, failures, AI behavior, and UI contracts.
6. Research grounding: what data a real wildfire response carries (ICS-209, dispatch, detection, decision-support systems) mapped against what Sentinel models — so the prototype borrows credibility honestly without pretending to be operational software.

**Non-goals (explicit):**
- No FlytBase API integration. No real drone control. No live fire data ingestion presented as operational truth.
- TALON is **LLM-driven for prototype purposes**, not a fire-behavior model. It must never claim trained-on-fire-data authority. The honesty boundary lives in the portfolio framing and in-product "prototype simulation" labeling (per the M1 convention).
- No multi-incident live command, no offline continuity, no mobile/field variants in this plan (deferred per the original brief; the scenario packs make future multi-incident work easier but don't build it).

---

## 1. Real-world grounding: what a fire response actually carries

Research synthesis from ICS-209 program guides, NIFC/NICC mobilization standards, and the NASA/USFS detection stack. Each item ends with its Sentinel mapping and fidelity level.

### 1.1 Detection layer (how the world first notices)

| Real feed | What it carries | Latency | Sentinel equivalent today | Fidelity |
|---|---|---|---|---|
| VIIRS 375m active fire (Suomi NPP, NOAA-20/21) | hotspot lat/lon, brightness, confidence flag | ~3h global; near-real-time US/Canada via FIRMS | "Thermal sensor" evidence source | Theatrical — real latency/fusion logic not modeled |
| MODIS fire/thermal anomalies | coarser hotspots, burned area | hours | folded into "satellite IR" | Theatrical |
| GOES-16/17 | near-real-time emerging-fire notifications used by NWS offices for tactical alerts | minutes | the 03:47:03 alert interrupt (spiritually) | Conceptually closest single feed |
| 911 / public smoke reports → CAD | caller location, smoke description, callback | minutes | absent — Sentinel starts post-detection | **Gap (see §3.7)** |
| RAWS / IRAWS / PRAWS weather stations | temp, RH, wind speed/dir, fuel moisture, archived daily in WIMS | 10–60 min obs cadence | wind vector + "ground moisture 48h stale" note | Partial — freshness/staleness modeled, station identity not |

**Design consequence:** Sentinel's "thermal spike at 03:47:03" compresses a real multi-hour detection-to-dispatch pipeline into seconds. That's legitimate for a *decision-surface* prototype (the thesis is about decision latency, not sensor latency), but the scenario DB (§5) should model **detection provenance per evidence source** (sensor id, observed-at, latency class) so TALON can reason about freshness honestly — which it already does narratively ("48h stale") without data underneath. The backend makes the narrative true.

### 1.2 Dispatch layer (how the response starts)

- **Local dispatch centers** own initial attack: CAD record → preplanned response plan ("run cards") → resource mobilization → duty-officer notification. Doctrine: **one ignition, one record, one authoritative source** (IRWIN hub syncing CAD, IROC, FireCode, SIT-209, WFDSS, InFORM).
- **Resources ordered by category**: A (aircraft), O (overhead), C (crews), E (equipment), S (supplies), with drawdown levels protecting local initial-attack capability.
- **Initial attack vs extended attack** is the real-world phase boundary: IA = size-up/patrol/monitor/hold/suppress in the first operational period; extended attack triggers ordering, teams, and WFDSS modeling (FSPro ensembles, PODs, PCL, suppression-difficulty maps).

**Sentinel mapping:** the Intelligence/Operations phase boundary *is* the IA/extended-attack boundary, and the authority packet is the SIT-209 in miniature. What's missing: **run-card logic** (preplanned response per zone — Sentinel's TALON invents plans from nothing each run; real dispatch pulls a card first), **drawdown awareness** (TALON never says "we can't commit Scout-03, it's our last IA asset" — a powerful future pitch behavior), and **the ordering trail** (every drone assignment should feel like an IROC order with a number, not a magic spawn).

### 1.3 ICS-209 (the decision-support record — closest real analog to the authority packet)

Six tabs; the blocks that matter for Sentinel:

| 209 block | Content | Sentinel equivalent | Gap |
|---|---|---|---|
| 6–9 Header | incident name/number, start time, size, % contained, definition | incident id, T+ clock, structures cleared/total | % contained ≈ evacuation progress; fine |
| 28 Fire behavior | controlled vocabulary: extreme/active/moderate/minimal + flanking/running/smoldering/torching | free-text `fireBehavior` string | **Adopt the vocabulary** — TALON should speak "active, running, torching" not prose |
| 29 Fuel model | 13 standard fuel models (grass/timber/slash/brush…) | absent | **Gap** — fuel model belongs in zone data; drives spread credibility |
| 30 Damage assessment | structures threatened/damaged/destroyed by type (single/multi-residence, commercial, minor) | cleared/total count only | **Gap** — threatened vs cleared vs lost is a richer (and more honest) triple |
| 31–34 Life/safety | civilian + responder injuries/fatalities, road closures w/ numbers + durations, evacuation counts | ground-team vitals (HR/VIS), evacuation routes | closest existing coverage; needs road-closure + evacuee-count entities |
| 35 Weather | wind speed/dir (from/to in plain language), temp, RH, watches/warnings | wind vector string | needs structured fields + watch/warning flags |
| 36/38 Threats | 12/24/48/72-hr projections | 15/30/60-min spread rings | timescale differs (tactical vs strategic) — both should exist; rings are the tactical face of the same projection |
| 39 Resource needs | needs by timeframe, in priority order | implicit in staging tiles | needs explicit "unmet needs" list for degraded states |
| 40/45 Strategy + costs | strategy/constraints discussion, costs to date | absent | strategy discussion ≈ TALON recommendation sentence (keep); costs out of scope |

**Net assessment:** Sentinel models ~40% of a 209's *decision-relevant* content and ~10% of its *record-keeping* content — exactly right for a command surface that is not a reporting tool. The backend should adopt the 209's **vocabularies** (behavior terms, fuel models, structure classes, threat timeframes) as enums, not its forms.

### 1.4 Extended-attack decision support (WFDSS/RMA/Predictive Services)

FSPro ensemble modeling, PODs (pre-collaborated response units), PCL (where containment is likely), suppression-difficulty index, snag/egress maps, 7-day significant-fire-potential outlooks. Sentinel's analogs: spread rings (deterministic, single-run — real FSPro is *probabilistic*; a future TALON could quote "P(containment at ridge road) = 0.62" instead of a ring, which is a stronger AI-trust story), zones-as-PODs (zones already function like PODs; naming the concept in the case study buys credibility), confidence-as-convergence (homegrown, and genuinely good — keep it; it's the product's own contribution, not a copy).

---

## 2. Canonical state atlas

Source of truth today: `TRANSITIONS` in `stateMachine.ts` (16 scenes, ~34 edges) + `FAULT_INJECTED_SCENES` (4). This section restates that machine in product language, fills the gaps the audit found (scenes with no operator path in, recoveries that weren't exits), and adds the states this plan requires. **Any scene added here must land in `TRANSITIONS` with event/guard/gate/reason — no orphan scenes.**

### 2.1 The 90-second sequence (beat-by-beat, normative)

Timings are scenario-clock targets, not wall-clock mandates; the backend scenario engine (§5) drives them as timed events the operator can outrun or stall.

| T+ | Scene | Operator question | TALON behavior | Exit edges |
|---|---|---|---|---|
| 0:00 | `baseline` (quiet watch) | — (ambient monitoring) | surveillance posture; evidence ticking below threshold | `timer.alert-surfaced` → alert-command (sim) / `surface-alert` (free) |
| 0:15 | `alert-command` (interrupt) | "Do I look at this?" | thermal + satellite-IR fusion summary, drone pre-staged, confidence 40% and rising | `dispatch-scout` → investigation-pending (confirm) / `monitor-only` → baseline (no dissent — predates recommendation) |
| 0:15–0:45 | `investigation-pending` (scout en route) | "Is it real?" | ETA countdown, evidence frame building, no recommendation yet | `timer.investigation-complete` → verify-active / `open-verification` → verify-active (early) / `confirm-incident` → authority-notification-ready (**direction-B dissent**: escalating past TALON's hold, objection rides with packet) |
| 0:45–1:15 | `verify-active` (evidence convergence) | "Is it real enough to escalate?" | convergence %, source chips, burn-permit calibrator gate, recommendation forms | `confirm-incident` → authority-notification-ready (human-approval) / `monitor-only` → monitoring-contested (**direction-A dissent**: refusing TALON's escalation, reason required) |
| 1:15–1:30 | `authority-notification-ready` (packet staged) | "Do I send this?" | packet preview (confidence, evidence summary, missing data, human-gate label) | `notify-authorities` → contain-recommended (human-approval; **the 90-second promise ends here — a human sends**) |

### 2.2 Containment (post-90-second planning)

| Scene | Operator question | TALON behavior | Exit edges |
|---|---|---|---|
| `contain-recommended` | "What level of response is justified?" | full situational picture: terrain, spread rings, wind, zones, 4 ghost deployments, one causal recommendation sentence, consequence number (structures in 30-min path) | `authorize-containment` → rescue-nominal (hold-2s) / `override-plan` → contain-alternate / `open-degraded` → contain-degraded |
| `contain-alternate` | "Is my correction better than the default?" | recomputed plan, **side-by-side comparison** (existing `ContainmentPlanComparison`), override reason preserved | `authorize-containment` → rescue-nominal / `operator.close-alternate` → contain-recommended |
| `contain-degraded` | "Can I authorize on weak evidence?" | widened uncertainty buffer, raw-feed fallback, honest low-confidence signaling | `authorize-containment` → rescue-nominal (accepting buffer) / `operator.close-degraded` → contain-recommended |

### 2.3 Rescue (supervised execution)

| Scene | Operator question | TALON behavior | Exit edges |
|---|---|---|---|
| `rescue-nominal` | "Anything need my judgment?" (no dominant CTA by design) | evacuation progress, route states, exception surfacing only | `timer.rescue-edge-case` → rescue-battery-critical (sim, once) / injected faults (see §2.5) / `operator.stand-down-complete` → baseline |
| `rescue-signal-degraded` | "Accept the reroute?" | autonomous reroute executed, exception + recovery path surfaced | `deploy-backup` → rescue-nominal / acknowledge → remain with exception noted |
| `rescue-battery-critical` | "Authorize the handoff?" | recall + Scout-03 coverage plan staged, single authorize path | `operator.acknowledge-handoff` → rescue-nominal |
| resolved debrief | "What happened?" (after-action, not a decision) | outcome vs. expected (existing `ActionOutcomeVerification`), audit receipt, stats | `operator.stand-down-complete` → baseline |

### 2.4 Disagreement track (both directions — the product's signature)

- **Direction A** (TALON escalates, operator refuses): verify-active → `monitoring-contested` (reason required, never silent) → either `operator.resolve-dissent` → baseline (ground truth answered it, outcome recorded: operator-correct / talon-correct / inconclusive) or `timer.reraise-threshold` → `talon-reraise` (appeal, not nag: higher bar, new evidence cited) → supervisor confirms (→ authority-notification-ready, first operator's record intact) or declines (→ monitoring-contested, bar does not rise again — two humans beat TALON, full stop).
- **Direction B** (TALON holds, operator escalates): investigation-pending → authority-notification-ready with `escalationBasis: "operator-initiated"` and TALON's objection attached to the packet. Comply + record, never obstruct.

### 2.5 Fault catalog (injected, never operator-chosen; every fault has a real exit)

| Fault scene | Trigger class | Operator's real decision | Exit |
|---|---|---|---|
| `satellite-feed-loss` | source outage | accept drone-only picture at reduced confidence? | `deploy-survey` → contain-recommended (fusion recovers) |
| `network-degraded` | pipe degradation | shed load / relay? | `relay-field-intel` → contain-recommended (throughput restored) |
| `infrastructure-total-loss` | catastrophic | follow manual protocol until restart | `system.restart` → baseline (context restarts — honest, not magical) |
| `rescue-signal-degraded` | asset degradation | approve backup relay? | `deploy-backup` → rescue-nominal |
| `contain-degraded` | model weakness (not outage) | authorize on widened buffer? | authorize or close (see §2.2) |

### 2.6 Gaps to add (new states this plan requires)

1. **`verify-source-conflict`** (promote the burn-permit calibrator from embedded gate to addressable state): two sources disagree (thermal=fire vs satellite-IR=controlled burn). Today it's a checkbox inside verify-active; as a state it gets entry/exit edges, its own TALON pitch ("two sources disagree, here's the tiebreaker I need from you"), and test coverage. Highest-value addition.
2. **`contain-awaiting-teams`** (staging incomplete): authorize gated because ground teams not yet notified/staged — distinguishes "plan not ready" from "plan not authorized." Gives the minimum-containment logic a home.
3. **`rescue-partial-evac`** (evacuation stalled/degraded mid-execution): route A blocked → TALON proposes Route B shift as an exception with one authorize path. Currently evacuation is binary; real evacuations stall.
4. **`handoff-pending`** (shift handover as a moment, not a log line): outgoing operator briefs, incoming acknowledges, authority transfers with receipt. Answers the old audit's handover critique structurally.
5. **`post-incident-review`** (promote the resolved debrief): outcome-vs-expected per authorized action, dissent resolutions, audit trail export. The portfolio's "prove the AI was supervised" surface.
6. **`scenario-select`** (recruiter entry): scenario pack picker with difficulty/focus labels — the front door of §6, not a shell scene.

---

## 3. TALON behavior policy

This is the spec the LLM backend (§4) implements. Rules are ordered: lower numbers override higher ones.

### 3.1 Authority doctrine (hard constraints, also enforced in code — `GATED_ACTIONS`)
1. TALON **computes, explains, recommends, prepares, proposes**. It never notifies, authorizes, dispatches, evacuates, overrides, or hands over.
2. Every field-affecting action passes a human gate (`confirm` or `hold`). No gate may be added or removed at runtime; the backend exposes gates as data, never as suggestions the AI can waive.
3. Uncertainty is always stated with basis ("confidence 78%: thermal 91 + satellite 87, capped by 48h-stale moisture"). A number without a basis is a policy violation.
4. Dissent is never silent (operator states a reason) and never erased (TALON's position preserved verbatim with a re-raise bar).
5. TALON never repeats a refused recommendation without new evidence crossing the raised bar (anti-nag rule).

### 3.2 Trigger table (what makes TALON speak, and in what posture)

| Trigger | Posture | Surface | Example line shape |
|---|---|---|---|
| Evidence crosses alert threshold | alert | interrupt popup | names sensor pair + first confidence + staged asset |
| Scout ETA updates / on-station | working | ambient voice | "Lidar-02 on approach — evidence frame building" |
| Convergence completes | working → recommendation | copilot + chips | recommendation + evidence + blocker + next action |
| Source conflict detected | blocked (verify-source-conflict) | calibrator | "Two sources disagree; here's the tiebreaker I need" |
| Gate staged (packet/containment/handoff) | gated | orb + staged command | gate label + what clearing it unlocks |
| Operator overrides | contested | containment panel | recomputed plan + preserved objection, no argument |
| New evidence beats re-raise bar | contested (appeal) | reraise interrupt | cites the *new* evidence, never repeats the old pitch |
| Fault injected | blocked | exception surface | one exception + one recovery + one authorize path |
| Operator silent past timeout | escalation (to secondary operator, never autonomous action) | escalation overlay | routes the *decision*, doesn't take it |
| Resolution/stand-down | receipt | debrief | outcome vs expected + audit id |

### 3.3 Plan-making policy (how TALON builds a containment plan)
1. Start from the **run card** (scenario DB, §5.3): preplanned response for the zone — TALON customizes a card, it doesn't invent from nothing (matches real dispatch).
2. Constrain by **drawdown**: never commit the last IA-capable asset without flagging reserve impact (from `ContainmentPlanSummary.resourceCost` — already structured, now actually reasoned over).
3. Quote **probabilities where ensembles exist**, deterministic rings where they don't — never present a single ring as certain.
4. Always produce **recommended + alternate** (real tactical tradeoff, differing in more than prose — enforced by the comparison contract).
5. Attach **confidence with basis + constraints** (evidence for, data against, ceiling cause).

### 3.4 Pitching policy (how TALON presents the plan)
- One causal sentence first ("wind NE 38° pushes the core toward 47 structures; perimeter hold buys the buffer road").
- Consequence number before logistics (structures > drones).
- Blocker stated before the ask ("two actions remain before Authorize unlocks" — never a dead button).
- Missing data declared in the pitch, not footnoted.

### 3.5 Operator-response handling matrix

| Operator response | TALON behavior | State effect |
|---|---|---|
| Accept / authorize | execute, write receipt, shift posture (e.g. working → executing) | transition fires |
| Refuse with reason | record dissent, drop to reduced-weight watch, set re-raise bar | contested |
| Refuse without reason (where required) | **block the transition** — the shell must capture reason first (structural, per `requiresDissent`) | no move |
| Dismiss pre-recommendation | return to watch, no record (nothing to dissent yet) | baseline |
| Partial compliance (some staging done) | acknowledge progress, restate remaining gates, never re-pitch from zero | stay, gates update |
| Silence past timeout | escalate to secondary operator; never act | escalation overlay |
| Contradictory orders (authorize then abort) | comply with latest, log both with receipts, note the reversal in debrief | transition fires, reversal flagged |
| Voice correction | apply as override, recompute, show alternate with operator's correction cited | contain-alternate |
| Question (chip) | answer from authored/scoped knowledge, cite evidence, offer next action | no state move (conversation only) |
| Out-of-scope request ("call my wife") | decline briefly, restate what it can do | no state move |

### 3.6 Timeout and non-response policy
- Alert interrupt: 15s → escalation overlay (routes decision to secondary; primary can still act).
- Investigation: auto-advances on scout arrival (evidence, not authority — safe to automate).
- Gates never time out into approval. A gate left waiting is re-surfaced (ambient reminder), never auto-cleared. This is the single most important safety sentence in the document.

---

## 4. Backend architecture (LLM-driven TALON, portfolio-owned)

### 4.1 Principles
- **Deterministic core, probabilistic voice.** The scenario engine (timers, evidence values, faults, transitions) is seeded and reproducible; the LLM generates *language* (pitches, answers, summaries) inside guardrails, never state. The LLM proposes tool calls; the backend validates them against `TRANSITIONS`/gates before applying. An LLM output can never move the machine to a state no edge allows.
- **The frontend's `stateMachine.ts` becomes the shared contract.** Backend mirrors `TRANSITIONS` (single JSON source or codegen — decide in build; JSON source consumed by both is recommended) so frontend and backend can never disagree about legal moves.
- **Every AI utterance logged with its inputs** (evidence snapshot id, scenario seed, model, prompt version) — the audit trail recruiters will actually inspect.

### 4.2 Services (small, boring, sufficient)

```
┌─────────────┐     WS (state patches)      ┌──────────────┐
│  Sentinel   │◄───────────────────────────►│   Gateway    │
│  frontend   │     REST (commands/intent)   │  (Node/TS)   │
└─────────────┘                              └──────┬───────┘
                                                    │
                              ┌─────────────────────┼─────────────────────┐
                              ▼                     ▼                     ▼
                       ┌──────────────┐   ┌─────────────────┐   ┌────────────────┐
                       │ Scenario     │   │ TALON Agent     │   │  Data API      │
                       │ Engine       │   │ (LLM + tools)   │   │  (Postgres)    │
                       │ (seeds, clock│   │ proposes; never │   │  scenarios,    │
                       │  events,     │   │ applies directly│   │  entities, logs│
                       │  faults)     │   └─────────────────┘   └────────────────┘
                       └──────────────┘
```

- **Gateway:** auth (prototype key), session management, WS fan-out of state patches, REST for commands. Rate-limits recruiter traffic; isolates the LLM key server-side (never ships to the browser).
- **Scenario Engine:** owns the scenario clock, timed events (alert at T+15, scout arrival, edge-case timers), evidence tick functions, fault injection schedule, and seed control. Deterministic given `(scenarioId, seed)`.
- **TALON Agent:** LLM with a **tool allowlist** mirroring read-only queries (`getEvidence`, `getPlanComparison`, `getGateStatus`) and *proposal* tools (`proposeRecommendation`, `proposePitch`, `answerChip`) — plus a `requestTransition` tool the backend validates against the transition table and gate policy before applying. System prompt encodes §3 (doctrine, triggers, pitch shape, anti-nag, timeout rules). Temperature low for pitches/answers; structured outputs (JSON schema per tool) so the frontend never parses prose.
- **Data API:** CRUD over §5 schema; scenario-pack loading; session logs/audit export.

### 4.3 Frontend integration contracts
- Transport: WebSocket `state.patch` (versioned, id-stamped, reorder-tolerant) + REST `POST /command` (optimistic UI with server reconcile; server is authoritative on conflicts).
- The LLM never streams into state: it streams into the **voice/transcript surface only**; state moves arrive as validated patches. This preserves the M0 truth layer — `deriveTalonSurface` keeps working because patches are machine-shaped.
- Modes: `live-ai` (recruiter default — LLM on, seeded scenario), `scripted` (current authored copy — deterministic fallback + offline), `replay` (session log re-drive for case-study walkthroughs). A visible mode badge preserves the honesty boundary.

### 4.4 LLM operations for a portfolio budget
- One key, server-side, per-session caps (turns + tokens), small-model default with escalation path; prompt version pinned per scenario pack so outputs are comparable across runs.
- Red-team the agent against: gate-waiving ("just authorize it"), state invention (claiming scenes that don't exist), confidence fabrication (numbers without basis), nagging after refusal. Each maps to a §7 AI-behavior test.

---

## 5. Database + scenario packs

### 5.1 Schema (Postgres; enums mirror ICS-209 vocabularies from §1.3)

**Core tables:** `scenarios`, `scenario_variants` (difficulty/focus labels, seed defaults), `zones` (fuel_model enum 1–13, risk, terrain, structures JSONB by class), `evidence_sources` (kind, provenance: sensor id/observed-at/latency class, status, confidence, freshness policy), `drones` (class, capabilities, battery/signal models, home station), `ground_teams` (unit type, readiness, vitals model, assignment), `routes` (geometry refs, capacity, status state machine), `structures` (per-structure: zone, class, status threatened→cleared→lost), `containment_plans` (recommended + alternate with full structured comparison fields), `run_cards` (preplanned response per zone — TALON's starting point), `road_closures`, `weather_snapshots` (structured wind/temp/RH + watch/warning flags), `threat_projections` (12/24/48/72h + tactical rings).

**Session tables:** `sessions` (scenario, variant, seed, mode, operator handle), `state_transitions` (from/to/event/gate/outcome + wall + scenario clock), `dissent_records` (direction, reason, TALON position verbatim, bar, resolution), `authority_packets` (basis, confidence, evidence snapshot, audit id), `talon_turns` (prompt version, inputs hash, output, tools proposed/applied, tokens), `audit_receipts` (action, expected vs observed, deviation state), `activity_log` (the mission ledger, persisted).

### 5.2 Scenario packs (parallel paths — never the same incident twice)

Ship **4 packs × 2–3 variants** (variants change wind, fuel moisture, asset availability, civilian load, and which fault fires):

1. **Ridge Ignition (flagship)** — the current incident rebuilt as data: forest-zone thermal spike, NE wind, 47 residential structures, burn-permit conflict available as variant. Variants: *permit-conflict on/off*, *wind shift mid-contain*, *second spot fire*.
2. **Interface Threat** — fire starts *in* the exurban grid (structure protection first, evacuation immediate, no 90-second luxury): tests a compressed timeline variant where phases collapse.
3. **Overnight Hold** — low spread, stale intel, fatigued staffing: tests contested-watch depth, reraise behavior, and the "boring but uncertain" TALON (anti-action-bias — TALON must recommend *patience* credibly).
4. **Multi-fault Storm** — satellite loss + network degradation + battery critical in one run (staggered): stress-tests exception stacking, gate blocking, and TALON's prioritization narration ("three faults; here's the order I care about them and why").

Each pack declares: seed, timeline script (timed events), variant matrix, expected operator path ("golden run" for regression), and which §7 tests it covers.

### 5.3 Seed-data plan (what exists → what gets authored)
- Migrate current `mockData.ts` fixtures 1:1 into Pack 1 (zones, drones, teams, routes, plans, ANOMALY, INCIDENT) — it becomes data, not code.
- Author Packs 2–4 net-new (they're the portfolio proof of range).
- Enums first (behavior vocabulary, fuel models, structure classes, severity tones), fixtures second, variants third.

---

## 6. Recruiter experience (the external user loop)

1. Land on `scenario-select` (new): pack cards with focus labels ("escalation judgment," "degraded ops," "dissent handling"), difficulty, ~duration.
2. Guided run (seeded, timed, one injected fault) with visible `live-ai` badge + reset/replay controls; or free explore with the review dock.
3. Debrief (`post-incident-review`): outcome vs expected, dissent resolutions, full audit export (the artifact that proves supervised AI better than any paragraph).
4. Guardrails: session caps, no real-world claims anywhere, prototype framing on entry + case-study page carrying the simulation disclosure.

---

## 7. Test matrix

**State tests** (per scene): entry conditions render, correct panels/tiles/gates shown, exit edges available and only those (*resolveTransition* parity frontend↔backend).
**Transition tests** (per edge): happy path, guard-blocked path, gate enforcement (confirm/hold actually gate), dissent-required edges reject reasonless moves, effects applied (mode/authorities/basis/reset).
**Edge/failure tests**: every fault scene entered + exited via its real recovery; timeout paths (15s escalation to a secondary operator, scout auto-advance on arrival — evidence, not authority); reversal (authorize→abort) logged + flagged; silence at every gate (re-surface, never executes — a staged action expires back to watch, expiry is logged, expiry is never execution); contradictory rapid orders (latest wins, both logged).
**AI-behavior tests** (LLM-specific): gate-waiver refusal, no invented states, confidence always with basis, no repeat pitch without new evidence, out-of-scope decline, tone/posture match (alert≠receipt language), token/turn caps respected, prompt-version pinned outputs stable on golden runs.
**UI-contract tests** (existing + extended): captures per scene × viewport × mode (live-ai/scripted/reduced-motion), focal-contract check per panel, contrast floors on rails over brightest map, clip/overflow scan (the agent-relay bug class), no `aria-modal` on non-modal interrupts.
**Scenario tests**: golden-run replay per pack-variant (state sequence hash matches), seed determinism (same seed → same timeline), variant divergence (wind-shift variant actually changes the plan comparison deltas).

---

## 8. Build order (ties to UI Phase A/B and the bigger upgrade)

1. **Contracts first:** shared transition JSON (from `stateMachine.ts`), tool schemas, WS patch format. Everything else hangs off these.
2. **DB + Pack 1 migration** (mockData → Postgres, enums per §1.3 vocabularies).
3. **Scenario Engine + scripted mode** (deterministic backend driving the current frontend — de-risks integration before any LLM).
4. **TALON Agent (LLM)** behind `live-ai` flag: read tools → pitch/answer tools → validated `requestTransition`; golden-run parity with scripted mode.
5. **Packs 2–4 + variants** (authored against the now-proven pipeline).
6. **New states (§2.6)** in dependency order: verify-source-conflict → contain-awaiting-teams → rescue-partial-evac → handoff-pending → post-incident-review → scenario-select.
7. **Recruiter loop (§6)** + audit export + caps/budget guards.
8. UI Phase A/B and the bigger upgrade ride on top throughout — surfaces consume contracts, never invent them.

## 9. Open questions and risks

- **LLM determinism vs живость:** golden-run stability vs. varied recruiter runs — solve with low temperature + pinned prompts for gates/pitches, higher latitude only for chip answers (still cited, still logged).
- **Cost control:** per-session token budgets + small-model default; a viral portfolio post should not produce a surprising bill. Caps are a launch gate, not a later optimization.
- **Latency:** pitch generation must not block the 90-second choreography — pre-generate likely pitches per state at pack-build time; live-generate only answers and re-pitches.
- **Honesty at scale:** every new surface re-asks "could a visitor mistake this for operational software?" — the entry badge + case-study disclosure + `live-ai`/`scripted` labeling must travel with every future UI phase, including the big upgrade.
- **Scope discipline:** this plan is deliberately larger than one build. If forced to cut, protect: contracts → Pack 1 → scripted backend → one LLM surface (chips) → debrief. Everything else is sequenced behind that spine.
