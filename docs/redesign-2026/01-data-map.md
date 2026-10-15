# Sentinel Data Map — everything the system processes, and for whom

> **status: exploratory** — research pass, 2026-09-27. Companion to `00-validation-and-direction.md`. Sources: `sentinel-information-design/` (11 chapters + console wireframe), `sentinel-reports/` (Flow Atlas 97n/117e + F1 run), `docs/case-study-research/` (journeys/flows/empathy/IA/state catalog), `server/` (index/db/scenarioEngine/talonTools), `src/app/` build audit, vault 00–09. Citations use the file key below.

**File key:** `chNN` = `sentinel-information-design/chapters/`; `WIRE` = `console-wireframe.html`; `ENG` = `server/scenarioEngine.ts`; `DB` = `server/db.ts`; `TOOLS` = `server/talonTools.ts`; `IDX` = `server/index.ts`; `STATE` = `docs/case-study-research/05-state-path-catalog.md`; `IA` = `docs/case-study-research/04-information-architecture.md`; `ATLAS` = `sentinel-reports/sentinel-flow-atlas-readme.md`.

---

## 1. Purpose of the application (one paragraph)

Sentinel compresses the first minutes of a wildfire response — **detection → verification → authorized escalation → containment → rescue → handoff** — from a ~48-minute manual baseline into a ~90-second supervised arc (challenge-brief figure; honest range ×16–×60, ch08:9). It is a **two-phase instrument**: Intelligence (detect · verify · escalate) then Operations (stage · coordinate · supervise). TALON is a reasoner strapped to a constitution: it reads, fuses, proposes and drafts, but every consequential action is a human gate (`confirm-incident`, `notify-authorities`, `authorize-containment`, `emergency-evacuate` — GATED_ACTIONS, talon.ts:46). The product serves two showcase personas at a **desk-embedded command console** (1920×1080 canonical, PRODUCT.md:70) with a tablet recomposition target; the measured promises are Velocity ("time to a defensible first decision", ending at verified escalation + authority handoff — never containment), Clarification (asks before it argues; zero silent conflict resolutions), Trust (0 unreceipted actions, 0 gate bypasses, 0 silence-executions, 0 repeat pitches — V2:29–35).

## 2. The process spine — data created and consumed per beat

| Beat (scene) | Data created/updated | Processed by | Consumed on surface | Attention tier |
|---|---|---|---|---|
| baseline (watch) | thermal series `[3,3,4…]`, confidence 0 | signal engine, `deriveTalonSurface()` (quiet) | map, intel freshness, orb | T4 log |
| alert-command | thermal spike `[4,4,9,13]` conf 54; AI detection claim | 5-pipeline corroboration check | T2 banner, evidence card ≤1s (ch03 #1), orb alert | **T2** |
| investigation-pending | corroboration status ×7 sources, drift/anomaly | evidence fusion; TALON asks, doesn't argue | C1 convergence card, P2 intel | T3 badges |
| verify-active | live verify feed, source-discrepancy risk | `verification.ts`, dissent engine | VerifyLiveFeed, map focus | **T2** |
| verify-source-conflict † | conflict pair (burn-permit #8841 vs thermal) | disagreement gating; block reason | contested banner, blocked tile | **T1-ish** |
| authority-notification-ready | AuthorityPacket AUD-90-0847 draft (grade, agency, evidenceSummary, missingData[]) | `draft_authority_packet` (draft-only) | P7 rec + G2 gate + packet modal | **T1** (gate) |
| contain-* | spread projection (3 strategies × 2 routes), uncertainty margin ±m | `recompute_plan`; plan comparison | map rings + C3 compare + G2 hold | **T1** (gate) |
| rescue-* | routing, battery/edge timers, ETA 16 m/s | `droneDispatch.ts`, timers | P5 fleet grid, C2 telemetry strip | T2/T3 |
| handoff-pending | session snapshot, activity ledger, PIN 8842 | ledger re-derivation | debrief modal (ICS-209), receipt stream | T2 |
| monitoring-contested / talon-reraise | dissent record, re-raise bar (+16/+9/+4/+12) | `shouldReRaise` (disagreement.ts:86) | contested watch, reraise delta | **T2** |

† = promoted state implemented in code but still marked "planned" in doc 03 (atlas discrepancy #1). The arc's data backbone when the server is wired: 5 Hz WS frames `{clockMs, scenarioId, thermalF, structuresCleared, confidence, windBearing, windSpeedKts, lidar02EtaS, sceneHint}` (ENG:29–39) + beat rows `{atS, thermalF, structures, confidence, wind…, sceneHint}` (ENG:49–61), Mulberry32-deterministic per (seed, beat).

## 3. Data inventory (nine groups)

### G1 — World & terrain (static bake)
DEM terrain, vegetation, buildings, roads (worldScene bake; USGS 3DEP + OSM), zone narratives (forest-north, buffer-west/east, residential-south — ZONES), road graph for routing. Consumers: SpatialMapCanvas, overlays3d, droneDispatch (point-in-polygon, road path). Gap: no LOD/LOD-free LOD contract beyond 12-draw-call budget; zones are 2D-authored polygons that need the orthomosaic law (doc 10 diagnosis, verified).

### G2 — Incident record
`INCIDENT` INC-2024-0847 `{Grid 4C ridge, 03:47:03 UTC, aiConfidence 78, wind, spread 0.8 km²/hr, footprint ~0.4 ha, structuresAtRisk 47, evacuationScope 47}` (ch02:30–37). Consumers: Navbar identity, P2 hero metrics, packet summary. Gap: incident queue is 1 active + 2 read-only (multi-incident is a deferred minor gap, ch06 G-06).

### G3 — Evidence (the 9 kinds × 5 statuses)
`EvidenceSourceKind` `{status: pending|active|stale|failed|missing, confidence 0–100, lastUpdated, note}` (tokens.ts:409–425; ch02:13–25): **thermal** (IR 640×512@30fps), **satellite-ir** (GOES-R/VIIRS; forced failed on satellite-feed-loss), **drone-visual** (EO; blocked on network-degraded), **lidar** (Lidar-02: 840 °F, flame 18 ft, spread 12 m/min), **wind** (RAWS), **fuel** (FBFM40), **terrain** (DEM, static flag), **burn-history** (permit #8841 — the conflict source), **structure-road** (NFPA 1144; structuresAtRisk 47). Consumers: TALON fusion, evidence chips (P7), IntelPanel freshness matrix (P2). Five-status semantics ch02:129–135. This group is the **provenance backbone** — every TALON claim should chip-link here.

### G4 — Signals & telemetry
Per-scene thermal series + confidence (16 signals audited, `audit-signals.ts`; "last point = displayed value" contract talon.ts:372–421); convergence clock 90 s easeOutCubic (talon.ts:264–281); containment plan summary `{spread{baselineRate, projectedResidualRate, direction, uncertaintyMarginMeters}, exposure{structuresInPath, structuresAtResidualRisk, routeExposure}, protection, resourceCost, confidence, eta}`. **Refresh-rate budget** (ch07:93–106): map 1–10 Hz (floor 1 Hz), video 24–30 fps ≤250 ms, telemetry strip 1 Hz render / 5–10 Hz source, alerts event-driven push *never polled*; latency ladder <1 s / <5 s / <30 s / minutes (ch01:122–129). Gap: G-13 refresh-rate honesty — no live adapters or staleness watchdogs yet; server is unwired (see G9 below).

### G5 — Fleet & mission
10-drone roster, 5 classes `{class, battery, signal, status, assignedMission}`; 9 `DroneMissionType`s (ch04:11); ground teams `{readiness, assignment, ETA, vitals}`; dispatch proposals from `droneDispatch.ts` (centroid snap, road route, ETA — pure proposal, never execution); degradation ladder 0–5 HD→outlines→telemetry-only→C2-loss→infra-loss (ch04:97–104); dock economics (45 s ready, 8 m/s landing wind, 32-min recharge ≈61 % duty, ch04:59–68). Consumers: P5 fleet grid, C2 telemetry strip, map tracks. Gap: G-05 launch-decision roll-up absent (no dock state, preflight rows, LAUNCH CTA); ADS-B traffic + geofence/TFR layer missing (G-10).

### G6 — TALON reasoning
`TalonAgentTask[]` `{category: orchestrator|intelligence|perception|simulation|operations|governance, status: queued|running|blocked|complete|failed}` (ch02:51 — 11 tasks in talon.ts:542–890); 3 signal series over the 90 s convergence window (thermal, structures-at-risk, fused confidence); Rule-of-One recommendation ≤90 words (04 §6); 7 prompt chips; surface postures `quiet/working/gated/alert/contested/blocked` → 8 mark states (talonSurface.ts); `DissentRecord {direction, reason, operatorNote, talonPosition verbatim, talonConfidence, auditId DIS-REJ/DIS-ESC-0847}` with re-raise bar; conversation turns (client-today, `ai_turns` server-side with `{model, latency, tokens, truth_check_passed, degraded, rejected_reason}`). **The five tools** (TOOLS:29–81): `read_scene_state`, `read_evidence`, `propose_transition`, `recompute_plan`, `draft_authority_packet`; **forbidden-by-construction** tools (send-packet, authorize, close-corridor, chemical-drop, mutual-aid, abort) and `FORBIDDEN_CLAIM_PATTERNS` ×5 (TOOLS:84–93) enforce the constitution mechanically.

### G7 — Governance & audit
GATED_ACTIONS ×4; transition gates (18 none / 13 confirm / 8 human-approval / 3 `requiresDissent`); Class-3 = 2.0 s radial-ring hold, release = cancel, completion fires once → receipt `{hold duration, snapshot hash}` (ch07:130–134); **Class-2 staged expiry: status "expiry-never-executes" is claimed but no expiry timestamp is specified anywhere — open design point (this doc's G1)**; `OperationalException` 9 fields `{affectedSources, affectedAgents, blockedCommands, fallbackInputs, confidenceImpact, recommendedRecoveryCommand, auditText, mapImpact, spatialUncertainty}` (ch09:14–23); audit receipts `{actor: AI|TALON|Operator|System, severity, text}`; server ledger `decisions {action_id, operator_id, clock_ms, sha256_digest}` chained `sha256(prev+action+operator+clock)` (DB:92–109) + `/audit/:sessionId` re-derivation with 409-on-tamper (IDX:177–182). ICS-209 debrief export exists as modal (P12), receipts not yet exportable (G-12).

### G8 — Scenario & session
6 scenarios S-01…S-06 (IA:48–56), DB rows `{fuel_model, ambient_temp_f, relative_humidity, wind_vector_bearing, wind_vector_speed_kts, initial_coordinates}` (DB:23–35); 20 scenes SEN-01…22 (IA:59–80), 39 edges, 26 commands `{intent, riskLevel, gate, modal, blockedBy, agentEvidence, receipt}` (STATE:74–89); `TransitionContext {experienceMode, mode, authoritiesNotified, edgeCaseFired, dissent, evidenceConfidence}`; entry surfaces → brief → simulation → free modes; 13 modals/surfaces (IA). Server endpoints: `/health`, `/ws?session=&seed=&operator=&scenario=` (5 Hz push + `available-transitions`), `/command` (422 invalid edge · **403 with authored reason when gate ≠ none** · receipt on accept), `/scenarios`, `/talon/tools`, `/talon/message` (truth-guarded, degraded fallback when no key), `/audit/:sessionId` (IDX:57–229). Client adapter `session/useScenarioSession.ts` complete but imported nowhere.

### G9 — KPIs & measurement
×32 compression target (honest ×16–×60); median time-to-authorize ≤75 s; override rate <10 %; false-positive escalation ≤2 %; time-to-confirm ≤45 s; evidence-card open ≤1 s P95; alert-to-eye ≤60 s; **interrupt budget ≤2/10 min**; data-age compliance 100 % (ch08:69–79). Targets, not results — must stay labeled as such (honesty rule).

## 4. Consumption map — the 21 components × data (condensed)

P1 Map (all geo + rings + corridors + geofence + ADS-B + crews + ghosts) · P2 Intel & Evidence (G2+G3) · P3 Tasking queue (G5 + staleness clocks) · P4 Spread projection (G4 plan summary + age badge — G-08) · P5 Fleet Grid (G5 + preflight/dock — G-05) · P6 Video wall (EO/IR PiP ≤250 ms — G-04, absent) · P7 TALON copilot stream (G6 + evidence chips) · P8 Comms (absent, G-09) · P9 Audit receipt stream (G7) · P10 Activity log (G7/G8) · P11 Ground teams/zones (G5 + evac GO chips — G-15) · P12 Debrief/ICS-209 (G7+G8) · C1 Convergence card (G4 fusion — G-01, the buried hero) · C2 Telemetry strip (G5 live) · C3 Gate cluster (G7 holds) · C4 Airspace/geofence controls (G-10) · C5 Perimeter diff (G4) · C6 Size-up form (IRPG-aligned) · C7 Hotspot list · C8 Weather strip (RAWS — G-07 static) · C9 Pre-flight checklist + mission preview (G5). Right rail is **phase-purposed — exactly one primary purpose per phase**, exceptions take over in degraded scenes (ch07:33–41); `panels.ts` already implements the slot table for this.

## 5. What the dynamic dashboard needs *from* the data

1. **Provenance on every rendered claim**: source kind, status, confidence, age — the "why am I seeing this" payload. Exists for evidence (G3); must propagate to recommendation cards and popped panels.
2. **A tier on every update**: T1 takeover / T2 banner / T3 advisory / T4 log (ch07:79–87), distributed ~5/15/80 (ISA-18.2), interrupt budget ≤2/10 min, single-primary-alert, ack-vs-resolve, 60-s unacked escalation.
3. **Arbitration**: who wins when two tiers fire together — must be a pure function derived from `deriveTalonSurface()` + phase density (Intelligence: evidence leads; Operations: exceptions lead), never an ad-hoc raise.
4. **Expiry clock**: staged commands need `expiresAt` + expiry event (logged, never executes) — currently missing entirely.
5. **Staleness watchdogs**: data-age-vs-requirement at gates (G-14) — e.g. projection age <5 min is a G2 unlock condition (ch03:57–63).
6. **Update semantics**: push-not-poll for alerts; 5 Hz telemetry where wired; render at 1 Hz for strips.
7. **Intent payload shape** (the "TALON controls information" layer): `{intent: focus_map_zone|open_panel|pin_evidence|compare_plans, target, tier, reason, evidenceRefs[], expiresAt}` — validated like transitions, rendered as proposal-with-undo, logged to the ledger.

## 6. Blocking gaps for the redesign (merged, priority-ordered)

1. G1 expiry unimplemented (constitutional, and a feature once real). 2. G-03 no tiered alert hierarchy (the deck/spine mechanic depends on it). 3. G-01 convergence buried across 3 surfaces → C1 card. 4. G-13/G-14 refresh honesty + staleness at gates (server wiring, `session/` adapter). 5. G-08 static spread rings without age badge. 6. Promoted-state depth (TALON voice/chips/verification for 4 scenes). 7. Attention arbiter function (does not exist yet). 8. Intent catalog (does not exist yet). 9. G-04/P6 video wall, G-05 launch roll-up, G-09 comms, G-10 airspace layer — major P1 surface gaps in the 21-component spec. 10. Receipt export (G-12).

## 7. Open data design points (owner input welcome)

- `expiresAt` schema + expiry event vocabulary (orb posture on expiry?).
- Tier derivation function signature (pure? in `talonSurface.ts` or new `attention.ts`?).
- Intent catalog scope for v1 (which 5 intents?).
- Multi-incident: keep read-only queue (deferred) but ensure deck spec doesn't hard-code single-incident.
