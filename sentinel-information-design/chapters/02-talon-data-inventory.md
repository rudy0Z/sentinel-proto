# 02 · TALON Data-Consumption Inventory — Inputs, Computation, Outputs

> **Scope:** What TALON (the Sentinel AI engine) consumes, computes, and emits, grounded in the repo audit of `D:\portfolio porjects\flytbase` (React 18 + Vite + TS prototype; Fastify + WS server; deterministic fixtures, no live streams).
> **Tag legend:** `[repo·<file>]` = repo ground truth (file ref from repo audit) · `[R1-S#]` / `[R2-S#]` / `[R4-S#]` = citations carried from the research files (R1 = traditional workflow, R2 = drone fleet, R4 = operator UX; each has its own S-number namespace) · `[est]` = estimate · `[new-spec]` = not in repo; proposed for a production system.
> **KPI anchor:** traditional first-signal → effective response ≈ 48 min; Sentinel target ≈ 90 s (detection → validated alert → tasking decision — *not* water-on-fire) [repo·brief §1][R1-e].

---

## 2.1 Input inventory

### 2.1.1 Evidence-kind inputs (the 9 `EvidenceSourceKind` values)

Enum + per-source shape `{status: pending|active|stale|failed|missing, confidence 0–100, lastUpdated, note}` defined at `src/app/tokens.ts` L409–425, rendered by `getEvidenceSources()` (`src/app/domain/talon.ts` L423) [repo]. All feeds are consumed as typed fixture objects — **no real streams**; update rates are authored per scene [repo].

| # | Input | Repo evidence kind | Real-world source system | Format | Update rate — repo vs real world | Consumer | Failure behavior (status → fallback) |
|---|-------|--------------------|--------------------------|--------|----------------------------------|----------|--------------------------------------|
| 1 | Drone thermal (radiometric IR) | `thermal` | Dock-scout FLIR-class radiometric LWIR/MWIR, 640×512 @30 fps, ±2 °C/±2 % [R2-S2][R2-S3][R2-S4]; repo docs cite radiometric LWIR/MWIR [repo·docs/01-fire-science] | H.264/H.265 video + R-JPEG 16-bit temp-per-pixel stills [R2-est] | **repo:** scene-keyed constants, confidence 62 (early) → 91 (converged), eased live during `verify-active` [repo·talon.ts] · **real:** 30 fps video, radiometric stills every 2–10 s [R2-est] | Both — TALON hotspot fusion + operator evidence chips | `active` through canonical arc; remains an active **fallback input** on satellite-feed-loss; `stale`/`missing` statuses defined but scene-keyed [repo·tokens.ts] |
| 2 | Satellite IR hotspots | `satellite-ir` | GOES-R ABI 3.9 µm; VIIRS 375 m FRP; FIRMS [repo·docs/01]. Real-world availability: VIIRS NIFC feed ~3¼ h [R1-S2]; ≤90 min best-case orbit+downlink+process [R1-S3]; MODIS ~2-day processing [R1-S4] | Thermal-anomaly pixel/point feed, per-pass snapshot | **repo:** authored ladder pending→active, 0→54→87 [repo·talon.ts] · **real:** hours (satellite) vs 2-min camera-pan machine floor [R1-S7] | Both | Forced `failed`/0 on `satellite-feed-loss`; `fallbackInputs` = drone visual, LiDAR, ground thermal, burn history [repo·exceptions.ts] |
| 3 | Drone EO visual | `drone-visual` | Scout EO live video, 1080p H.264/H.265 @30 fps [R2-S22][R2-S23]; O3 Enterprise glass-to-glass ~70 ms [R2-S3a]; <500 ms ops requirement [R2-S26] | RTP/RTSP → WebRTC/SRT to UI [R2-S24][R2-S25a] | **repo:** static PNG fixtures (`drone-thermal-feed.png` etc.), no live clock [repo·assets/mockData] · **real:** 5–8 Mbps H.264 / 2–4 Mbps H.265 [R2-est] | Both — AI smoke/fire detection on frames + operator video wall [R2] | Perception **blocked** on `network-degraded`: HD streams suspended → low-bandwidth LiDAR outlines, cached route model, local telemetry [repo·exceptions.ts] |
| 4 | LiDAR point cloud | `lidar` | UAV LiDAR 100k–1.5M pts/s, 50–1000 pts/m², cm–dm accuracy [R2-S29][R2-S30]; under-canopy terrain model for fire-spread modeling (R2 class 4) | LAS/PLY, generated post-flight (deferred); live raw streaming atypical [R2-est] | **repo:** fixture; Lidar-02 reading 840 °F / flame 18 ft / spread 12 m/min @03:48:14 fused into convergence narrative [repo·docs/01] · **real:** ≈0 live; 6–12 GB per 100 ha deferred [R2-est] | TALON compute (terrain/fuel model); operator gets low-bandwidth outlines on degrade | `rescue-battery-critical`: Lidar-02 at 14% battery → drone perception blocked → **supervised handoff to Scout-03** [repo·exceptions.ts] |
| 5 | Wind observation | `wind` | RAWS: 20-ft anemometer wind, RH 14%, Haines 5 [repo·docs/01]; RAWS station obs typically hourly, console display 1–5 min [R4-inf] | Station JSON / fixed string | **repo:** fixed string "NE 38° · 18 mph", no live clock [repo·mockData] · **real:** hourly obs [R4-inf] | Both — Rothermel-style spread input + CONTAIN display | `stale`/`missing` statuses defined [repo·tokens.ts]; live staleness watchdog [new-spec] |
| 6 | Fuel model | `fuel` | FBFM40 — Scott & Burgan 40 fuel models [repo·docs/01] | GIS raster / fixture object | **repo:** scene-keyed constant [repo·talon.ts] · **real:** seasonal/annual GIS layer [est] | TALON compute (Rothermel ROS input) | Static in repo; `stale` semantics for live fuel layers [new-spec] |
| 7 | Terrain / DEM | `terrain` | DEM/GIS layer; repo world is a synthetic DEM (`dem.bin`/`.json`) [repo·map/world]; LiDAR-derived under-canopy model [R2-S29] | DEM raster + JSON metadata | **repo:** static, 3D overlays derived from the same 2D data, "never re-authored" [repo·map/runtime] · **real:** per-mission LiDAR re-map [R2] | Both — Map3DExplorer + spread model | `TERRAIN_MODEL_STATUS` degraded-terrain scene flag — currently static, not a live degradation model [repo·mockData][repo·audit §6] |
| 8 | Burn history | `burn-history` | Burn-permit registry; ag-burn permit #8841 @03:47:12 in convergence timeline [repo·docs/01] | Permit-record fixture | **repo:** narrative constant [repo·docs/01] · **real:** permit-cycle / daily [est] | TALON compute (source-conflict adjudication) | Consumed in the `verify-source-conflict` disagreement arc; `missing` status defined [repo·tokens.ts]; live registry adapter [new-spec] |
| 9 | Structure & road GIS | `structure-road` | NFPA 1144/1140 structure triage layers [repo·docs/01]; WUI footprint | GIS layer fixture | **repo:** static [repo·mockData] · **real:** GIS update cycle [est] | Both — structuresAtRisk 47, evacuation corridors, cleared-structures tracking | Static; `stale` semantics for live structure parity [new-spec] |

### 2.1.2 Fixture inputs outside the evidence enum

| # | Input | Repo fixture (shape) | Real-world analog | Update rate | Consumer | Failure behavior |
|---|-------|----------------------|-------------------|-------------|----------|------------------|
| 10 | Drone fleet telemetry | 10-drone roster `{class, battery, signal, status, assignedMission}` via `createDroneRoster()` [repo·mockData] | MAVLink v2 `BATTERY_STATUS`/`GPS_RAW_INT`/`HEARTBEAT`/`SYS_STATUS` [repo·docs/01] over WS :4191 @5 Hz [repo·docs/04-constitution]; 5–10 Hz platform-typical [R2-S33] | **repo:** authored per scene · **real:** 5 Hz WS / 5–10 Hz [repo][R2] | Both — DroneFleetPanel + TALON tasking | Battery-critical blocks perception agent; signal-degraded scene (`rescue-signal-degraded`) [repo·exceptions.ts] |
| 11 | Ground teams | `{readiness, assignment, ETA, vitals}` via `createGroundTeams()` [repo·mockData] | Radio/CAD blue-force tracking [R4-inf] | Authored; real 0.2–1 Hz [R4-inf] | Operator (GroundTeamsPanel) | Static; live crew tracking [new-spec] |
| 12 | Incident record | `INCIDENT` INC-2024-0847 `{Grid 4C ridge, 03:47:03 UTC, aiConfidence 78, wind "NE 38° · 18 mph", spread 0.8 km²/hr, footprint ~0.4 ha, structuresAtRisk 47, evacuationScope 47}` [repo·mockData] | CAD incident record — system-of-record pattern [R4-S34][R4-S35] | Point-in-time | Both — Navbar/Intel hero + TALON session | Frozen timestamps in prototype; live clock [new-spec] |
| 13 | Focused incident queue | 1 active + 2 read-only summaries (smoke report awaiting corroboration; thermal transient below escalation threshold) [repo·mockData] | CAD multi-incident queue [R4-S34][R4-S46] | Recomputed per event [R4] | Operator (priority triage) | Multi-incident is summarized, not operable — deferred per brief §9 [repo] |
| 14 | Containment plan summary | `CONTAINMENT_PLAN_SUMMARY` `{spread: baselineRate, projectedResidualRate, direction, uncertaintyMarginMeters; exposure: structuresInPath, structuresAtResidualRisk, routeExposure; protection; resourceCost; confidence; eta}` [repo·mockData] | FARSITE/FlamMap-class spread outputs [R4-S38][R4-S39] | Recompute 5–15 min [R4-inf] | Both — map rings + right rail | Static scene data; live model recompute [new-spec] |
| 15 | Operator input | Commands (`domain/commands.ts`), override reasons (`OVERRIDE_REASONS`), dissent capture (`domain/disagreement.ts`) [repo] | MO/RPIC console actions [R4] | Event-driven | TALON orchestration + state machine | Dissent never silent — `requiresDissent` on override edges [repo·stateMachine.ts] |
| 16 | LLM session snapshot | `{scene, thermalF, fused confidence, structuresCleared/47, wind bearing/kts}` [repo·talonGateway.ts] | — (TALON internal) | Per turn | TALON compute (tool calls) | 8 s timeout → authored microcopy fallback (§2.5.3) |

---

## 2.2 Computation pipeline — ingest → debrief

Ordered stages. "Compute class" is an estimate of production compute intensity; the repo implements each stage as scene-keyed fixtures + rules.

| # | Stage | Inputs consumed | Outputs produced | Compute class [est] | Repo enforcement mechanism |
|---|-------|-----------------|------------------|---------------------|----------------------------|
| 1 | **Ingest** | 9 evidence-kind feeds + roster telemetry + incident record (§2.1) | Typed source objects with `status/confidence/lastUpdated/note` | O(1) per message; WS @5 Hz | `EvidenceSourceKind` union + status enum [repo·tokens.ts L409–425]; backend WS :4191 @5 Hz telemetry/state sync, REST `/command`, seeded-PRNG scenario clock [repo·docs/04] |
| 2 | **Per-source validation** | Raw source objects | Validated sources with freshness matrix + notes ("sustained across three passes") | O(n), n = 9 sources | `getEvidenceSources()` scene-keyed truth — statuses/notes authored per scene; satellite forced `failed` on satellite-feed-loss [repo·talon.ts L423] |
| 3 | **Fusion / convergence** | Validated sources | 3 series (thermal, structures-at-risk, fused confidence) over the 90-s window; confidence easing | O(n·w) sliding window; w = 90 s | `getSignalHistory()` + `SIGNAL_PROFILES` + `CONVERGENCE_WINDOW_S`; live advance during scenes; re-anchoring override for contested-watch confidence [repo·talon.ts L372] |
| 4 | **Threshold crossing (alert)** | Fused series | Alert interrupt; nearest drone launches autonomously | O(1) rule eval per tick | State-machine timer events `alert-surfaced`, `reraise-threshold`, `source-discrepancy`; disagreement gate `shouldReRaise` — re-raise only when new evidence crosses the raised bar [repo·stateMachine.ts][repo·disagreement.ts]. Canonical timing: thermal spike 03:47:03 → threshold crossed 03:47:18 (~15 s) [repo·brief §4] |
| 5 | **Agent tasking** | Alert + evidence + fleet state | Agent tasks across 6 categories with `queued\|running\|blocked\|complete\|failed` | O(a) task graph + LLM orchestration | `TalonAgentTask` [repo·tokens.ts L420–436], `getAgentTasks()` [repo·talon.ts L542]; scene-driven failure states (satellite agent `failed`; drone perception `blocked` on network-degraded / battery-critical); rendered with category badges [repo·TalonCopilotPanel] |
| 6 | **Plan computation** | Wind, fuel, terrain, spread series, zones | Rothermel-style spread projection; 15/30/60-min rings; staged deployment trilogy — aerial coverage → corridor guidance → ground notification; strategy + evacuation-route selection | O(z) over zones; simulation-class | `recompute_plan` tool (proposal-only): strategy enum `ridge-anchor\|creek-buffer\|defensive-holding`, evacuation `route-a\|route-b\|dual-egress`; `SPREAD_RINGS`, `ZONES`, `CONTAINMENT_PLAN_SUMMARY` fixtures [repo·talonTools.ts][repo·mockData]; Rothermel ROS + FBFM40 grounding [repo·docs/01] |
| 7 | **Packet drafting** | Evidence summary, missing data, severity, confidence | Authority packet (AUD-90-0847 pattern) with `humanGate` set | LLM call + template merge; 8 s budget | `draft_authority_packet` tool: severity `Grade-1\|2\|3`, agency `CAL_FIRE_NORTH\|USFS_REGION_5\|COUNTY_OES`; `AuthorityPacket` `{id, status drafting\|ready\|sent, confidence, escalationLevel, location, evidenceSummary, missingData[], preparedAt, humanGate}` [repo·talonTools.ts][repo·talon.ts L31]; ICS-209-in-miniature [repo·docs/01] |
| 8 | **Execution supervision** | Approved commands, exceptions, fleet state | Executed actions; blocked-command lists; exception surfaces; dissent records | Event-driven rule eval | `GATED_ACTIONS` = confirm-incident, notify-authorities, authorize-containment, emergency-evacuate [repo·talon.ts L44]; press-and-hold gates [repo·ActionBar]; Class 2 staged-adjust `expiry-never-executes`, Class 3 two-second hold [repo·docs/04]; `blockedCommands` per exception [repo·exceptions.ts]; 31-transition state machine with guards, `gate: none\|confirm\|human-approval`, `requiresDissent` [repo·stateMachine.ts]; forbidden-by-construction tool set (send-authority-packet, authorize-containment, close-corridor, order-chemical-drop, notify-mutual-aid, abort-mission) [repo·talonTools.ts] |
| 9 | **Debrief** | Full session audit trail + containment outcome | ICS-209-style debrief + timeline; audit receipt lines | Batch aggregation | `Ics209DebriefModal` + `DebriefTimeline` from session data [repo·shell]; `ActivityLogPanel` actor-tagged feed (AI / TALON / Operator / System) [repo·mockData]; verification gates: typecheck, verify:map 9/9, verify:flows 19/19, verify:routes 23/23, verify:machine 31 transitions/0 unreachable/4 fault scenes, verify:signals 16 scenes, eval:talon [repo·package.json] |

---

## 2.3 Output inventory

| Output | Payload / shape (tokens.ts interfaces unless noted) | Destination UI component | Refresh |
|--------|------------------------------------------------------|--------------------------|---------|
| Alert interrupt (threshold crossing) | Scene transition to `verify-active`; anomaly marker `{confidence 40 → rising}`; incident hero metrics | SentinelShell (composition/transitions), Navbar (mode/phase), SpatialMapCanvas (ANOMALY marker) | Event-driven, once per crossing |
| Evidence chips | Per-source `{kind, status, confidence, lastUpdated, note}` ×9 | TalonCopilotPanel (evidence chips) + IntelPanel freshness matrix (LeftPanel) | Scene-keyed; confidence eased live during `verify-active` |
| Confidence / signal series | 3 series (thermal, structures-at-risk, fused confidence) × 90-s window | HighFidelityTelemetryChart in TalonCopilotPanel (L282) | Live advance per scene tick; re-anchored on contested-watch override |
| Agent task states | `TalonAgentTask[]` `{category: 6 values, status: 5 values, …}` | TalonCopilotPanel agent-task list (category badges) | Scene-driven, incl. blocked/failed transitions |
| Recommendation + one alternate | Pitching doctrine: Rule of One — consequence before logistics, blocker first, anti-nagging; ≤90-word output contract [repo·docs/04]; 7 prompt chips | TalonCopilotPanel (prompt chips, voice session) + domain/microcopy.ts | Per turn / per gate |
| Authority packet (AUD-90-0847 pattern) | `AuthorityPacket {id, status drafting\|ready\|sent, confidence, escalationLevel, location, evidenceSummary, missingData[], preparedAt, humanGate}`; severity Grade-1/2/3; agency enum | SentinelShell gate surface (human-approval modal path) + audit receipt | On `draft_authority_packet` proposal; status transitions drafting→ready→sent |
| Exception object | `OperationalException {affectedSources, affectedAgents, blockedCommands, fallbackInputs, confidenceImpact, recommendedRecoveryCommand, auditText, mapImpact, spatialUncertainty {marginMeters, affectedZoneIds, basis, observedAt}}` | ExceptionPanel (right rail), ExceptionBanner / ExceptionInterrupt, InfrastructureLossTakeover (total loss) | Event-driven per exception scene |
| Audit receipt lines | Activity-log entries `{actor: AI\|TALON\|Operator\|System, severity, text}` | ActivityLogPanel (left rail) | Append on every action/event |
| Spread projections | `SPREAD_RINGS` 15/30/60-min; `CONTAINMENT_PLAN_SUMMARY` {spread, exposure, protection, resourceCost, confidence, eta} | SpatialMapCanvas (rings) + PriorityPanel / GroundTeamsPanel context | Authored per scene; recompute 5–15 min in production [R4-inf] |
| Debrief | ICS-209-style summary + DebriefTimeline | Ics209DebriefModal + DebriefTimeline (shell) | Once at mission end |

---

## 2.4 Thresholds & constants

Every operationally meaningful constant discoverable in the repo audit. Count: 40 rows.

| # | Constant | Value | Repo ref | Operational meaning |
|---|----------|-------|----------|---------------------|
| 1 | Response KPI | 48 min → 90 s | [repo·brief §1][repo·PRODUCT.md] | Compression target; 90 s covers detect → validated alert → tasking decision only |
| 2 | Handoff total window | 90 s, 4 phases | [repo·brief §4] | The canonical guided arc |
| 3 | Fusion pre-interrupt window | 0–15 s | [repo·brief §4] | Sensor fusion runs before the operator is interrupted |
| 4 | Thermal spike timestamp | 03:47:03 UTC | [repo·brief §4][repo·mockData] | Ignition-signal origin of the arc |
| 5 | Alert threshold crossing | 03:47:18 (~15 s after spike) | [repo·brief §4] | Interrupt fires; nearest drone launches autonomously |
| 6 | VERIFY window | 15–45 s | [repo·brief §4] | Single-question verification: location, corroboration, drone ETA, rising confidence |
| 7 | CONTAIN window | 45–75 s | [repo·brief §4] | Terrain reconstruction, spread projections, ghost deployments, press-and-hold authorize |
| 8 | RESCUE window | 75–90 s | [repo·brief §4] | Ghost→active, evacuation corridors, ingress, cleared structures, exception-only supervision |
| 9 | Convergence window | `CONVERGENCE_WINDOW_S` = 90 s | [repo·talon.ts L372] | Signal-history horizon for all three series |
| 10 | Thermal confidence (early) | 62 | [repo·talon.ts] | Pre-convergence fusion floor |
| 11 | Thermal confidence (converged) | 91 | [repo·talon.ts] | Eased live during `verify-active` |
| 12 | Satellite-IR confidence ladder | 0 → 54 → 87 | [repo·talon.ts] | pending→active authored ramp |
| 13 | Anomaly confidence | 40, rising | [repo·mockData] | Initial alert confidence at interrupt |
| 14 | Incident aiConfidence | 78 | [repo·mockData INCIDENT] | INC-2024-0847 headline confidence |
| 15 | Exception confidence impact | "Confidence reduced to 40%. Spread margin increased ±200 m" | [repo·exceptions.ts] | Canonical degraded-state arithmetic |
| 16 | GATED_ACTIONS | 4: confirm-incident, notify-authorities, authorize-containment, emergency-evacuate | [repo·talon.ts L44] | Human-gate set; never auto-executed |
| 17 | HITL permission tiers | Class 1 autonomous synthesis / Class 2 staged adjust / Class 3 two-second hold | [repo·docs/04-constitution] | 3-tier autonomy boundary |
| 18 | Class 3 hold duration | 2 s (press-and-hold) | [repo·docs/04] | Deliberate-friction confirmation |
| 19 | Class 2 staged actions | `expiry-never-executes` | [repo·docs/04] | Staged adjustments expire inert; they never fire on timeout |
| 20 | LLM gateway timeout | 8 s | [repo·talonGateway.ts] | Falls back to authored microcopy so the demo never strands |
| 21 | Backend telemetry rate | 5 Hz over WS :4191; REST `/command` | [repo·docs/04] | Telemetry/state sync + command channel |
| 22 | Output contract | ≤90 words per TALON output | [repo·docs/04] | Anti-flooding pitching budget |
| 23 | Pitching doctrine | Rule of One (one recommendation + one alternate) | [repo·docs/04] | Consequence before logistics; blocker first; anti-nagging |
| 24 | Prompt chips | 7 | [repo·TalonCopilotPanel] | Operator quick-prompt surface |
| 25 | Spread rings | 15 / 30 / 60 min | [repo·mockData SPREAD_RINGS] | CONTAIN-phase projection horizons |
| 26 | Spread rate / footprint | 0.8 km²/hr; ~0.4 ha | [repo·mockData] | Incident baseline behavior |
| 27 | Structures at risk = evacuation scope | 47 = 47 | [repo·mockData] | Full-scope evacuation pressure |
| 28 | Wind fixture | "NE 38° · 18 mph" | [repo·mockData] | Fixed RAWS-style readout |
| 29 | RAWS parameters | 20-ft wind, RH 14%, Haines 5 | [repo·docs/01] | Ground-weather station grounding |
| 30 | First thermal detection | 480 °F @03:47:01 | [repo·docs/01] | Convergence-timeline origin |
| 31 | GOES-R bloom | @03:47:04 | [repo·docs/01] | Satellite corroboration beat |
| 32 | Ag-burn permit | #8841 @03:47:12 | [repo·docs/01] | Burn-history corroboration (source-conflict fodder) |
| 33 | Lidar-02 fused reading | FLIR 840 °F, flame 18 ft, spread 12 m/min @03:48:14 | [repo·docs/01] | Drone-level confirmation beat |
| 34 | Battery-critical threshold (scene) | Lidar-02 at 14% | [repo·exceptions.ts] | Triggers supervised handoff to Scout-03 |
| 35 | Packet severity grades | Grade-1 / Grade-2 / Grade-3 | [repo·talonTools.ts] | Escalation level of authority packet |
| 36 | Packet agencies | CAL_FIRE_NORTH / USFS_REGION_5 / COUNTY_OES | [repo·talonTools.ts] | Notify-authorities routing |
| 37 | Strategy / route enums | ridge-anchor, creek-buffer, defensive-holding; route-a, route-b, dual-egress | [repo·talonTools.ts] | recompute_plan proposal vocabulary |
| 38 | Domain cardinalities | 9 evidence kinds; 6 agent categories; 5 source statuses; 5 agent statuses; 31 transitions; gate enum none\|confirm\|human-approval; 10 drones; 5 drone classes; 9 mission types | [repo·tokens.ts][repo·stateMachine.ts][repo·mockData] | Inventory sizes enforced by types + verify gates |
| 39 | Semantic palette | cyan = TALON/synthesis · amber = degraded/warning · red = critical/gated · teal = confirmed/resolved | [repo·tokens.ts] (single-source design tokens) | Color carries state semantics, not decoration |
| 40 | Verification gates | 31 transitions / 0 unreachable / 4 fault scenes; 19 flows; 23 routes; 16 signal scenes | [repo·package.json][repo·docs/sentinel-foundation-audit] | Machine-level guarantees behind the UI |

---

## 2.5 Failure modes

### 2.5.1 Evidence status semantics

| Status | Repo behavior | Production hardening |
|--------|---------------|----------------------|
| `pending` | Source present, awaiting first corroboration (satellite-ir at 0) [repo·talon.ts] | Auto-promotion rules + timeout-to-stale [new-spec] |
| `active` | Fused into confidence series; shown as chip | Live freshness heartbeat per source [new-spec] |
| `stale` | Status defined; per-scene authoring only [repo·tokens.ts] | Watchdog that ages `lastUpdated` → auto-`stale` [new-spec] |
| `failed` | Scene-forced (satellite-feed-loss → failed/0; satellite agent failed) [repo·talon.ts][repo·exceptions.ts] | Retry/backoff, circuit-breaker, health probes [new-spec] |
| `missing` | Status defined; authoritative absence surfaced as gap in `missingData[]` [repo·tokens.ts][repo·talon.ts L31] | Registry of required-vs-present sources per phase [new-spec] |

### 2.5.2 Per-input failure behavior (documented exception scenes)

| Scene | Failed/blocked inputs | Exception payload behavior (all fields per `OperationalException`) |
|-------|----------------------|---------------------------------------------------------------------|
| `satellite-feed-loss` | satellite-ir forced `failed`/0; satellite agent `failed` | fallbackInputs = drone visual, LiDAR, ground thermal, burn history; confidenceImpact + spread margin widened; recommendedRecoveryCommand; auditText; mapImpact; spatialUncertainty {marginMeters, affectedZoneIds, basis, observedAt} [repo·exceptions.ts] |
| `network-degraded` | drone-visual HD suspended; drone perception `blocked` | Low-bandwidth LiDAR outlines + cached route model + local telemetry continue; blockedCommands listed [repo·exceptions.ts] (bandwidth ladder → ch. 04 §4.4) |
| `rescue-battery-critical` | Lidar-02 at 14% battery; perception blocked | Supervised handoff to Scout-03; exception surfaces recovery command + audit text [repo·exceptions.ts] (continuity spec → ch. 04 §4.3) |
| `rescue-signal-degraded` | Link quality drop on rescue assets | Degraded-supervision mode with exception banner [repo·exceptions.ts] |
| `infrastructure-total-loss` | All automated channels | InfrastructureLossTakeover — manual protocol takeover surface [repo·exceptions.ts][repo·shell] |

### 2.5.3 Gateway fallback & truth guard

- **8 s LLM timeout → authored microcopy:** gateway (`gemini-1.5-flash` default via `SENTINEL_LLM_KEY/MODEL/BASE_URL`) falls back to authored microcopy (`domain/microcopy.ts`) so the console never strands [repo·talonGateway.ts].
- **Truth guard:** `FORBIDDEN_CLAIM_PATTERNS` + `FORBIDDEN_SOURCE_PATTERN` reject any LLM turn claiming a gated action (confirm-incident, notify-authorities, authorize-containment, emergency-evacuate) or citing an invented source; the forbidden tool set (send-authority-packet, authorize-containment, close-corridor, order-chemical-drop, notify-mutual-aid, abort-mission) does not exist to call [repo·talonGateway.ts][repo·talonTools.ts].
- **Dissent capture:** overriding TALON requires a reason (`requiresDissent` edges; `OVERRIDE_REASONS`); disagreement re-raise only when new evidence crosses the raised bar [repo·stateMachine.ts][repo·disagreement.ts].
- All of the above are **repo-enforced** (state machine + tool layer + gateway), verified by verify:machine / eval:talon gates [repo·package.json].

### 2.5.4 Repo-enforced vs [new-spec] for production

| Concern | Status |
|---------|--------|
| Status enum, gates, forbidden tools, dissent, exception payload shape, microcopy fallback, 8 s timeout, 90-s window | **Repo-enforced** [repo] |
| Live source adapters (thermal/satellite/RAWS/LiDAR streams replacing fixtures) | [new-spec] |
| Staleness watchdogs + automatic status transitions on `lastUpdated` age | [new-spec] |
| Live geo-registration / pixel-to-ground truthing of evidence | [new-spec] |
| Persistent audit store (DB-backed receipts, ICS-209 export) | [new-spec] |
| Retry/backoff, circuit breakers, clock sync across sources | [new-spec] |
| Live RAWS/weather feed (replacing the fixed "NE 38° · 18 mph" string) | [new-spec] |
| Live degradation model driven by `TERRAIN_MODEL_STATUS` (currently a static scene flag) | [new-spec] |
| Operable multi-incident queue (deferred by brief §9; summaries only) | [repo-deferred] — production design [new-spec] |
