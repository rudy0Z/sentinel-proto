# Repo Audit — FlytBase Sentinel (TALON data flow & UI inventory)

> Audit date: 2026-09-22 · Method: direct read-only inspection of `D:\portfolio porjects\flytbase`
> (file reads via PowerShell; all paths relative to repo root). Independent of any subagent self-report.

## 1. Repo overview

- **Stack:** React 18 + Vite 6 + TypeScript; Tailwind 4; `motion` for animation; three.js 3D explore mode; recharts present; Radix/shadcn tree archived under `src/app/components/ui/` (unused). Design tokens single-source: `src/app/tokens.ts` (33.7 KB).
- **Nature:** Scripted portfolio prototype — deterministic in-repo fixtures across 16 canonical scenes (+4 promoted states = 20 entries in `REVIEW_SCENES`, `src/app/mockData.ts`). No live drone feeds, no production AI, per `PRODUCT.md` ("Register" section) and README.
- **Server:** `server/` — Fastify + `@fastify/websocket`, scenario engine (`scenarioEngine.ts`, `scenarios.ts`), SQLite demo DB (`sentinel-demo.db`), TALON LLM gateway (`talonGateway.ts`) + tool layer (`talonTools.ts`).
- **Verification gates** (`package.json` scripts, all documented green in `docs/sentinel-foundation-audit-2026-09-14.md`): typecheck; audit:tokens (65 files, 240 warnings); verify:map 9/9; verify:flows 19/19; verify:routes 23/23; verify:machine 31 transitions/0 unreachable/4 fault scenes; verify:signals 16 scenes OK; eval:talon; render:world.

## 2. Problem-statement evidence (quoted, with paths)

- `src/imports/FlytBase_Sentinel_Project_Brief_Con.txt` §1: "designed to collapse response time from roughly 48 minutes to 90 seconds. The core problem is not slow hardware; it is cognitive friction in how operators verify, decide, and coordinate."
- Same file §4 — the canonical 90-second handoff: 0–15 s sensor fusion before interrupt (thermal spike 03:47:03, alert threshold crossed 03:47:18, nearest drone launches autonomously); 15–45 s single-question VERIFY (anomaly location, corroborating sources, drone ETA, rising confidence bar); 45–75 s CONTAIN (reconstructed terrain, spread projections 15/30/60 min, wind, ghost drone deployments, press-and-hold authorize); 75–90 s RESCUE (ghost→active, evacuation corridors, ingress, cleared structures, exception-only supervision).
- `PRODUCT.md`: operator persona "Asha" (authority on decisions), secondary relief operator + regional commander (handover/escalation packet); "48-minute baseline and 90-second target come from the challenge brief, not a field study."
- `README.md`: two-phase workflow (Intelligence: Detect·Verify·Escalate; Operations: Stage·Coordinate·Supervise); 16 states including guided 90-second arc, disagreement arc, four fault scenes.

## 3. TALON AI — implemented data flow

### 3.1 Inputs (evidence sources) — `src/app/tokens.ts` L409–425, rendered by `src/app/domain/talon.ts` `getEvidenceSources()` (L423)

Nine evidence kinds (`EvidenceSourceKind`): `thermal | satellite-ir | drone-visual | lidar | wind | fuel | terrain | burn-history | structure-road`.
Each carries `status: pending|active|stale|failed|missing`, `confidence 0–100`, `lastUpdated`, `note`.

Observed per-source behavior (scene-dependent, from `getEvidenceSources`):
- thermal: confidence 62 (early scenes) → 91 (converged; eased live during `verify-active`); "sustained across three passes" note.
- satellite-ir: pending→active, 0→54→87; forced `failed`/0 on `satellite-feed-loss`.
- wind/fuel/terrain/burn-history/structure-road: present as fused context sources (RAWS-style wind, FBFM-style fuel, burn permit history used for the source-conflict scene).
- Formats: all consumed as typed fixture objects — **no real streams**; update rates are authored per scene, not live.

### 3.2 Agent tasks — `TalonAgentTask` (tokens.ts L420–436), `getAgentTasks()` (talon.ts L542)

Six categories: `orchestrator | intelligence | perception | simulation | operations | governance`; statuses `queued|running|blocked|complete|failed`. Scene-driven: e.g. satellite agent `failed` on satellite-feed-loss; drone perception `blocked` on network-degraded / battery-critical. Rendered in TalonCopilotPanel with category badges.

### 3.3 Signal/convergence series — `getSignalHistory()` (talon.ts L372)

Three series per scene (`SIGNAL_PROFILES`): thermal, structures-at-risk, fused confidence; 90-second convergence window (`CONVERGENCE_WINDOW_S`), live advance during scenes, re-anchoring override for contested-watch confidence. Rendered as `HighFidelityTelemetryChart` in `TalonCopilotPanel.tsx` (L282).

### 3.4 Tool layer & gateway — `server/talonTools.ts`, `server/talonGateway.ts`

- Tools (complete enumerated surface): `read_scene_state` (read), `read_evidence` (read), `propose_transition` (proposal; validated against TRANSITIONS; gated proposal renders a human gate, never executes), `recompute_plan` (proposal; strategy enum ridge-anchor/creek-buffer/defensive-holding; evacuation route-a/route-b/dual-egress), `draft_authority_packet` (proposal; severity Grade-1/2/3; agency CAL_FIRE_NORTH/USFS_REGION_5/COUNTY_OES).
- **Forbidden by construction** (no tool exists): send-authority-packet, authorize-containment, close-corridor, order-chemical-drop, notify-mutual-aid, abort-mission. Truth guard: `FORBIDDEN_CLAIM_PATTERNS`, `FORBIDDEN_SOURCE_PATTERN` reject LLM turns claiming gated actions or invented sources.
- Gateway: default model `gemini-1.5-flash` via env (`SENTINEL_LLM_KEY/MODEL/BASE_URL`), 8 s timeout, falls back to authored microcopy so the demo never strands; session snapshot fields: scene, thermalF, fused confidence, structuresCleared/47, wind bearing/kts.
- Human gates: `GATED_ACTIONS` (talon.ts L44) = confirm-incident, notify-authorities, authorize-containment, emergency-evacuate.
- `AuthorityPacket` (talon.ts L31): id, status drafting/ready/sent, confidence, escalationLevel, location, evidenceSummary, missingData[], preparedAt, humanGate.

### 3.5 State machine — `src/app/domain/stateMachine.ts` (19.5 KB)

31 transitions; each edge has event, guard, gate (`none|confirm|human-approval`), reason, optional `requiresDissent` (overruling TALON captures a reason — dissent never silent), effects (mode, authoritiesNotified, resetIncident, escalationBasis). System events include timers (alert-surfaced, investigation-complete, reraise-threshold, source-discrepancy). Disagreement model in `domain/disagreement.ts` (`shouldReRaise` — re-raise only when new evidence crosses the raised bar).

### 3.6 Exception/failure model — `src/app/domain/exceptions.ts` (7.1 KB)

Per-scene `OperationalException`: affectedSources, affectedAgents, **blockedCommands**, **fallbackInputs**, confidenceImpact (e.g. "Confidence reduced to 40%. Spread margin increased ±200m"), recommendedRecoveryCommand, auditText, mapImpact, `spatialUncertainty {marginMeters, affectedZoneIds, basis, observedAt}`. Documented scenes: satellite-feed-loss (fallback to drone visual/LiDAR/ground thermal/burn history), network-degraded (low-bandwidth LiDAR outlines, cached route model, local telemetry; HD streams suspended), rescue-battery-critical (Lidar-02 at 14% → supervised handoff to Scout-03), rescue-signal-degraded, infrastructure-total-loss.

### 3.7 Fixture data — `src/app/mockData.ts` (30.5 KB)

- `INCIDENT` INC-2024-0847: Grid 4C ridge, 03:47:03 UTC, aiConfidence 78, wind "NE 38° · 18 mph", spread 0.8 km²/hr, footprint ~0.4 ha, structuresAtRisk 47, evacuationScope 47.
- `FOCUSED_INCIDENT_QUEUE`: 1 active + 2 read-only summaries (smoke report awaiting corroboration; thermal transient below escalation threshold) — multi-incident is summarized, not operable (brief §9 defers it).
- `ZONES`: forest-north, buffer-west, buffer-east (+ residential-south referenced) with risk/spreadWindow/terrain/structures narratives + chip shorts.
- `SPREAD_RINGS`: 15/30/60-min rings. `ANOMALY` marker with confidence 40→rising.
- Drone roster (10): classes `surveillance` (visual overwatch ×2), `thermal-lidar` (mapping/model build), `guidance-relay` (comms relay ×3), `evacuation-guidance` (instructional audio+light ×2), `multi-role` (reserve ×2); each with battery, signal, status, assignedMission (9 `DroneMissionType` values incl. patrol/investigation/perimeter-monitor/guide-emergency-personnel/relay-field-intel/backup-support).
- Ground teams, rescue progress (cleared/total, routeA/B, fireDeptEta), `CONTAINMENT_PLAN_SUMMARY` (spread {baselineRate, projectedResidualRate, direction, uncertaintyMarginMeters}, exposure {structuresInPath, structuresAtResidualRisk, routeExposure}, protection, resourceCost, confidence, eta), TERRAIN_MODEL_STATUS (degraded-terrain scene), OVERRIDE_REASONS.

## 4. UI inventory (component → data shown → data origin → file)

| Component | Data shown | Data origin | File |
|---|---|---|---|
| SentinelShell | scene composition, transitions, modals, rails | useScenarioSession + state machine | src/app/components/SentinelShell.tsx (154 KB) |
| Navbar | mode/phase, incident, operator, clock | ShellState | src/app/components/Navbar.tsx |
| SpatialMapCanvas (2D SVG) | zones, anomaly, spread rings, routes, agent markers, labels | mockData + map/frame + map/render/* | src/app/map/SpatialMapCanvas.tsx, render/ZoneLayer.tsx, render/AgentMarkers.tsx |
| Map3DExplorer (three.js) | DEM terrain, buildings/landuse/roads/vegetation, 3D overlays derived from same 2D data | map/world/* (dem.bin/.json/.npz, *.json), runtime/overlayData.ts (derived, "never re-authored") | src/app/components/Map3DExplorer.tsx, src/app/map/runtime/* |
| IntelPanel (left rail) | incident hero metrics, evidence sources w/ freshness matrix, signal trend, zone detail on selection | getEvidenceSources, getSignalHistory, INCIDENT, zones | src/app/components/panels/LeftPanel.tsx |
| DroneFleetPanel (left rail) | 10-drone roster: class, capability, status, battery, signal, mission, ETA | createDroneRoster() | LeftPanel.tsx |
| ActivityLogPanel (left rail) | audit activity feed (actor AI/TALON/Operator/System, severity) | createActivityLog() | LeftPanel.tsx |
| TalonCopilotPanel (right rail) | telemetry chart (thermal/structures/confidence), evidence chips, agent tasks, prompt chips (7), voice session | domain/talon.ts, domain/microcopy.ts | src/app/components/panels/TalonCopilotPanel.tsx |
| PriorityPanel (right rail) | priority risk items w/ rationale + linked actions | mockData | src/app/components/panels/RightPanel.tsx |
| GroundTeamsPanel (right rail) | team readiness/assignment/ETA/vitals | createGroundTeams() | RightPanel.tsx |
| ExceptionPanel (right rail) | exception banner data, fallback inputs, blocked commands | domain/exceptions.ts | RightPanel.tsx |
| ActionBar | quick actions incl. press-and-hold gates, mic button | domain/commands.ts, GATED_ACTIONS | src/app/components/ActionBar.tsx |
| ActionModal / DissentGate | command confirmation; dissent capture on override | domain/disagreement.ts | ActionModal.tsx, DissentGate.tsx |
| ContestedWatch / Reconciliation / ReRaiseBrief | disagreement arc UI | disagreement.ts | ContestedWatch.tsx |
| ExceptionBanner / ExceptionInterrupt | degraded-state interrupts | exceptions.ts | ExceptionSurface.tsx |
| InfrastructureLossTakeover | total-loss manual protocol takeover | exceptions.ts | shell/InfrastructureLossTakeover.tsx |
| Ics209DebriefModal + DebriefTimeline | post-mission ICS-209-style debrief | session data | shell/Ics209DebriefModal.tsx, shell/DebriefTimeline.tsx |
| ReviewDock / ScenarioSwitcher / EntrySurfaces | prototype navigation (hidden in portfolio embed via ?core=1) | REVIEW_SCENES | shell/ReviewDock.tsx, shell/ScenarioSwitcher.tsx, shell/EntrySurfaces.tsx |
| Panel layout engine | left intel/fleet/activity; right talon/priority/ground-teams/exceptions; contextual by phase + exception | domain/panels.ts | src/app/domain/panels.ts |

**Mock/static data presentations:** all feeds are authored fixtures — video feeds are static PNGs (`src/assets/drone-thermal-feed.png` etc.), map world is synthetic DEM, evidence confidences are scene-keyed constants with easing, weather is a fixed string ("NE 38° · 18 mph"), incident queue summaries are frozen timestamps. No live clocks/streams anywhere.

## 5. Docs grounding found in-repo (usable as internal sources)

- `docs/sentinel-v2-master-plan/01-FIRE-SCIENCE-AND-REAL-WORLD-GROUNDING.md`: NWCG PMS 461/484 sizeup, S-390 fire behavior, ICS-201/204/209, CAL FIRE initial attack/run-cards; Rothermel ROS; Scott & Burgan 40 fuel models; GOES-R ABI 3.9 µm; VIIRS 375 m FRP; FIRMS; FLIR radiometric LWIR/MWIR; RAWS (20-ft wind, RH 14%, Haines 5); NFPA 1144/1140 structure triage; MAVLink v2 (BATTERY_STATUS, GPS_RAW_INT, HEARTBEAT, SYS_STATUS). Convergence timeline: thermal 480°F @03:47:01 → GOES-R bloom @03:47:04 → ag-burn permit #8841 @03:47:12 → Lidar-02 FLIR 840°F/flame 18 ft/spread 12 m/min @03:48:14 → RAWS wind. Authority packet AUD-90-0847 (ICS-209 in miniature).
- `docs/sentinel-v2-master-plan/04-TALON-AI-AGENT-CONSTITUTION.md`: 3-tier HITL (Class 1 autonomous synthesis / Class 2 staged adjust w/ expiry-never-executes / Class 3 two-second hold), pitching doctrine (Rule of One; consequence before logistics; blocker first; anti-nagging), backend topology (WS :4191 at 5 Hz telemetry/state sync; REST /command; Scenario Engine clock/ticks seeded PRNG).
- `docs/sentinel-foundation-audit-2026-09-14.md`: gates green; doc-authority conflicts; IPv6 preview gotcha.

## 6. Open questions / unclear from code

1. `rescue-partial-evac`, `verify-source-conflict`, `contain-awaiting-teams`, `handoff-pending` appear in REVIEW_SCENES ("promoted states") but their transition wiring was not individually verified in this pass.
2. `eval:talon` script semantics (scripts/eval-talon.mjs) not inspected in depth.
3. Whether TERRAIN_MODEL_STATUS drives a live degradation model or is a static scene flag (static per current evidence).
4. Backend `server/scenarios.ts` fixture parity with front-end `mockData.ts` (single source vs duplicated) not diffed.
