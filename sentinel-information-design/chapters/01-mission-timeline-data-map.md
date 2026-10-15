# 01 · Mission Timeline Data Map — First Signal to Mission Close

**Study:** FlytBase Sentinel — operator-interface information design · **Doc type:** synthesis chapter (no new research; built from R1, R2, R4 and the repo audit) · **Compiled:** 2026-09-22
**KPI anchor (given):** traditional first-signal → effective response ≈ **48 min** → Sentinel target ≈ **90 s** [repo brief; R1].
**Arc anchor [repo]:** 0–15 s sensor fusion before interrupt (thermal spike 03:47:03 → alert threshold crossed 03:47:18 → nearest drone launches autonomously) → 15–45 s VERIFY single question → 45–75 s CONTAIN authorize (press-and-hold) → 75–90 s RESCUE exception-only supervision. Physical launch overlaps VERIFY; the 90-s clock ends **decision-complete**, not water-on-fire [R1 §e6].

**Tag legend:** `[repo]` = verified in repo audit (`mockData.ts`, `domain/talon.ts`, `domain/exceptions.ts`, `domain/stateMachine.ts`, `docs/sentinel-v2-master-plan/*`) · `[R1·…]` = traditional-workflow research file · `[R2·S#]` = drone-fleet research, source # per its §e · `[R4·S#]` = operator-UX research, source # per its §d · `[est]` = author estimate. Scene→phase mapping is the author's alignment of the repo's 16-scene canonical sequence (`baseline → alert-command → investigation-pending → verify-active → authority-notification-ready → contain-* → rescue-* → debrief`); the arc windows themselves are [repo].

---

## Phase 1 — Detection / First Signal (pre-interrupt; fusion window 0–15 s)

**Operator decision owed:** none — TALON fuses silently before interrupt [repo]. Traditional analog: lookouts / 911 / camera pans / satellite feed a dispatcher [R1].

| Data produced (source) | Data consumed | Latency requirement | Consumer | Repo scene mapping | Failure / degraded behavior |
|---|---|---|---|---|---|
| Thermal video frames — dock scout patrol, 640×512 @30 fps, 1–2 Mbps [est] [R2] | AI smoke/heat detection on frames; hotspot classifier | Real-time (<1 s/frame) | TALON | `baseline` (watch) [est] | `satellite-feed-loss`: satellite-ir forced failed/0 → fallback drone visual / LiDAR / ground thermal / burn history [repo exceptions.ts] |
| EO live video 1080p30 — H.264 5–8 Mbps / H.265 2–4 Mbps [R2·S22][R2·S23][R2·S25] | AI frame detection + operator video wall | Real-time; glass-to-glass ≤~250 ms | Both | `baseline` [est] | `network-degraded`: HD streams suspended [repo] |
| Thermal spike event — 480 °F @03:47:01 [repo docs] | Fusion evidence (thermal source, confidence 62 early) [repo] | Event-driven, inside 0–15 s fusion window [repo] | TALON | `baseline` → fusion [repo] | confidence-impact rules per exception [repo] |
| Satellite IR hotspots — VIIRS ~3¼ h availability [R1: data-nifc.opendata.arcgis.com]; narrative GOES-R bloom @03:47:04 [repo docs] | Cross-sensor corroboration (satellite-ir source, 0→54→87) [repo] | Minutes–hours in reality; per-event in arc narrative [repo] | TALON | `baseline` (satellite-ir evidence source) [repo] | `satellite-feed-loss` [repo] |
| Telemetry pos/att/batt/gimbal 5–10 Hz, JSON/MQTT [R2·S33] | Fusion context; asset readiness | 1 Hz floor [R4] | Both | `baseline` [est] | `network-degraded`: local telemetry only [repo] |
| Burn-permit history — ag-burn permit #8841 @03:47:12 [repo docs] | Authorized-burn likelihood (source-conflict context) | Per-event | TALON | `baseline`; reused in `verify-source-conflict` [repo] | — |
| RAWS-style wind obs (NE 38° · 18 mph) [repo; R4: RAWS stations are hourly] | Spread/fusion context | 1–5 min console display [R4·INF] | TALON | `baseline` [repo] | — |

## Phase 2 — Alert & Validation (VERIFY window, 15–45 s)

**Operator decision owed:** accept/reject the AI alert in one glance (evidence card) and triage priority [R4 rows 1–2; Pano analyst-verify analog R4·S17–S19].

| Data produced (source) | Data consumed | Latency requirement | Consumer | Repo scene mapping | Failure / degraded behavior |
|---|---|---|---|---|---|
| Alert event — threshold crossed 03:47:18 [repo] | Interrupt: single-question VERIFY (anomaly location, corroborating sources, drone ETA, rising confidence bar) [repo] | Event-driven push, never polled [R4·INF]; T1 escalates if unacked at 60 s [R4·INF] | Both | `alert-command` [repo] | alert tiers T1/T2/T3 semantics [R4 §c] |
| Evidence card — thumbnail + 5-s clip, aiConfidence 78, lat/long, detector ID, corroboration count [repo; R4] | Human confirm/dismiss with reason code | Card opens ≤1 s [R4]; decision inside 15–45 s window [repo] | Human (gate) | `alert-command` → `verify-active` [repo] | `verify-source-conflict`: disagreement arc — ContestedWatch / Reconciliation / ReRaiseBrief [repo] |
| Signal-history series — thermal 62→91, structures-at-risk, fused confidence; 90-s convergence window [repo] | Rising-confidence bar; HighFidelityTelemetryChart [repo] | Live easing during `verify-active` [repo] | Both | `verify-active` [repo] | `contested-watch`: re-anchored confidence override [repo] |
| Corroborating sources — satellite-ir 0→54→87, drone-visual, wind/fuel/terrain [repo] | Corroboration count; missingData[] list [repo] | Per-source status change [repo] | Both | `investigation-pending` [repo] | per-source `failed` / `missing` statuses [repo] |
| Dismissal reason codes (glare / fog / industrial / animal / other) [R4] | ML tuning + audit loop; dismissed alerts retrievable, never silent [R4·INF] | Per-event | TALON + audit | override captured via `DissentGate` [repo] | re-raise only when new evidence crosses the raised bar (`shouldReRaise`) [repo] |

## Phase 3 — Dispatch (inside CONTAIN window, 45–75 s; auto-launch already fired at threshold)

**Operator decision owed:** approve autonomous launch (preflight) [R4 row 5]; send authority packet [repo]; order ground/mutual aid [R4 row 6].

| Data produced (source) | Data consumed | Latency requirement | Consumer | Repo scene mapping | Failure / degraded behavior |
|---|---|---|---|---|---|
| Autonomous tasking — nearest drone launches at threshold [repo] | Mission plan, geofence sanity, preflight pass/fail, weather minima [R4 row 5] | Point-in-time; re-check on abort [R4] | TALON launches; human can abort | `alert-command` [repo] | weather go/no-go (Dock 2 max landing wind 8 m/s) [R2·S8] |
| Authority packet — severity Grade-1/2/3, agency CAL_FIRE_NORTH / USFS_REGION_5 / COUNTY_OES, evidenceSummary, missingData[], humanGate [repo] | `notify-authorities` human gate [repo] | Drafting→ready across VERIFY→CONTAIN [est]; 8-s LLM timeout with authored microcopy fallback [repo] | Both | `authority-notification-ready` [repo] | send-authority-packet has **no tool** — forbidden by construction; truth-guard rejects LLM claims [repo] |
| Strategy proposal — `recompute_plan` (ridge-anchor / creek-buffer / defensive-holding) [repo] | IC review before CONTAIN authorize | Proposal only — never executes [repo] | Both | `contain-*` prep [est] | gated proposal renders a human gate [repo] |
| Compressed dispatch benchmark — 10–30 s vs 1–5 min CAD entry + radio tone-out [R1] | — | <30 s | — | — | — |

## Phase 4 — Drone Launch / Flight (launch at threshold, 0–15 s; transit during 15–75 s)

**Operator decision owed:** monitor autonomous transit, intervene on anomaly [R4 row 9]; warn IC of en-route hazards / re-task [R4 row 10].

| Data produced (source) | Data consumed | Latency requirement | Consumer | Repo scene mapping | Failure / degraded behavior |
|---|---|---|---|---|---|
| Dock launch — 45 s ready-for-takeoff Dock 2 [R2·S7], 45–60 s airborne [R2·S8]; Dock 3 10-s takeoff [R2·S9a] | Launch GO/NO-GO (wind, battery SOC, link) [R4 row 4] | 10–60 s physical; overlaps VERIFY [est] | Both | `alert-command` → `investigation-pending` transit [est] | on C2 loss: failsafe hover → RTH (dock landing) [R2·est] |
| Flight telemetry — position 1–10 Hz, strip 1 Hz, RSSI, GPS sats, wind aloft, geofence proximity [R4 row 9; R2·S33] | Telemetry strip + drone card; anomaly rows highlighted [R4] | Real-time, 1 Hz floor [R4] | Both | DroneFleetPanel across scenes [repo] | `network-degraded`: local telemetry, cached route model [repo] |
| ETA countdown — distance-to-scene, ground speed, sensor-on time [R4 row 11] | VERIFY question "drone ETA" [repo] | 1 Hz recompute [R4] | Both | `verify-active` [repo] | `rescue-signal-degraded` [repo] |
| Airspace / deconfliction — TFR/LAANC status, ADS-B intruders ~1 Hz [R4 row 8; S21][S22] | Intruder banners on map & video [R4] | ~1 Hz; TFR on change [R4] | Both | airspace overlay (no dedicated repo scene) [est] | geofence proximity alerts [R4·S13] |
| Fleet duty cycle — 50-min flight + 32-min charge ≈ 61% single-dock coverage; multi-dock handover ≤10 km spacing [R2·est] | Continuous-watch planning | Per-sortie | TALON + planner | 10-drone roster, 5 classes [repo] | `rescue-battery-critical`: Lidar-02 @14% → supervised handoff to Scout-03 [repo] |

## Phase 5 — On-Scene Assessment (first orbit; feeds converge ~45–75 s)

**Operator decision owed:** structured size-up for IC [R4 row 14]; attack mode direct/indirect (flame-length heuristic [R4·S3]) [R4 row 15]; evacuation pre-warning [R4 row 7].

| Data produced (source) | Data consumed | Latency requirement | Consumer | Repo scene mapping | Failure / degraded behavior |
|---|---|---|---|---|---|
| Live EO/IR video 24–30 fps, ~200 ms glass-to-glass [R4·S10][R4·S11] | Video wall + PiP map; thermal palette toggle [R4] | Real-time | Both | `verify-active` → `authority-notification-ready` [est] | `network-degraded`: HD suspended; low-bandwidth LiDAR outlines [repo] |
| Radiometric thermal stills — R-JPEG 16-bit, on trigger / every 2–10 s [R2] | Temperature-referenced detection; alarm evidence | Per-event | TALON | `investigation-pending` [est] | thermal source `stale`/`failed` statuses [repo] |
| On-scene recon readout — Lidar-02 FLIR 840 °F, flame 18 ft, spread 12 m/min @03:48:14 [repo docs] | Size-up form (IRPG-aligned), auto-filled from AI + video [R4 row 14] | Fields live-update during first orbit [R4·INF] | Both | `authority-notification-ready` [est] | quantified confidence impact, e.g. "Confidence reduced to 40%. Spread margin increased ±200 m" [repo exceptions.ts] |
| Spread projection — 15/30/60-min rings [repo]; spread 0.8 km²/hr, footprint ~0.4 ha [repo] | CONTAIN decision support; spread-projection layer [R4 row 16] | Rings prebuilt at decision point; recompute 5–15 min [R4·INF] | Both | `contain-*` prep [repo] | spread margin ±200 m under degraded sources [repo] |
| Terrain / fuel / wind fusion — TERRAIN_MODEL_STATUS, FBFM-style fuel, RAWS wind [repo] | Attack-mode thresholds (flame-length gauge [R4·S3]); spread model input | Weather 1–5 min; terrain per-orbit [R4·INF] | TALON | `degraded-terrain` scene flags model status [repo] | `degraded-terrain` [repo] |
| Structures exposure — structuresAtRisk 47, evacuationScope 47 [repo] | Evacuation pre-warning; zone status table [R4 rows 7, 18] | 5 min or per perimeter update [R4] | Both | rescue prep [est] | — |

## Phase 6 — Suppression Support (CONTAIN window, 45–75 s)

**Operator decision owed:** authorize the containment plan (press-and-hold, Class-3 two-second hold [repo docs]); evacuation GO [R4 row 18; repo `emergency-evacuate` gate].

| Data produced (source) | Data consumed | Latency requirement | Consumer | Repo scene mapping | Failure / degraded behavior |
|---|---|---|---|---|---|
| Containment plan summary — spread {baselineRate, projectedResidualRate, direction, uncertaintyMarginMeters}, exposure {structuresInPath, structuresAtResidualRisk, routeExposure}, protection, resourceCost, confidence, eta [repo] | Authorize decision; consequence-before-logistics pitching doctrine [repo docs] | Plan refresh per recompute [est]; ~2-s hold gate [repo docs] | Both | `contain-*` [repo] | `blockedCommands` list per exception [repo exceptions.ts] |
| Strategy options — ridge-anchor / creek-buffer / defensive-holding; evacuation route-a / route-b / dual-egress [repo] | Human selection among TALON proposals | Proposal-only, never auto-executes [repo] | Both | `contain-*` [repo] | `order-chemical-drop` forbidden (no tool exists) [repo] |
| Ghost drone deployments → active handoff [repo] | Pre-positioned effect before crews arrive | Per-event | Both | rescue transition (ghost→active) [repo] | `rescue-battery-critical` handoff [repo] |
| Evacuation corridors + ingress routing [repo] | `emergency-evacuate` gate; fireDeptEta, ground-team ETAs [repo] | Route recompute on degrade [est] | Both | `rescue-*` [repo] | `network-degraded`: cached route model [repo] |

## Phase 7 — Containment (RESCUE / supervision window, 75–90 s and onward)

**Operator decision owed:** is the line holding [R4 row 20]; escalate resources [R4 row 16]; deconflict drone vs tankers/helicopters [R4 row 22].

| Data produced (source) | Data consumed | Latency requirement | Consumer | Repo scene mapping | Failure / degraded behavior |
|---|---|---|---|---|---|
| Perimeter overlay per orbit + perimeter diff with time slider [R4 rows 19–20] | Line-holding check; growth flagged red [R4] | Per-orbit 1–5 min [R4·INF] | Both | `contain-awaiting-teams` [repo] | satellite-feed-loss fallback imagery stack [repo] |
| Hotspot list — lat/long, peak temp, delta vs background [R4 row 24] | Crew handoff; exportable KML/CSV [R4] | Per-task | Both | `rescue-*` supervision [est] | thermal source degradation statuses [repo] |
| Blue-force tracking — crew GPS 0.2–1 Hz; radio relay state [R4 row 21] | Overwatch; persistent video share to IC [R4] | 0.2–1 Hz [R4·INF] | Both | GroundTeamsPanel [repo] | relay drone restores RF-shadow links [R2·S36] |
| Zone risk narratives — forest-north, buffer-west/east, residential-south [repo] | Zone-level contain/rescue decisions | Per update [repo] | Both | zone panels [repo] | `spatialUncertainty` {marginMeters, affectedZoneIds, basis} [repo exceptions.ts] |
| Supervision-by-exception — interrupt only on deviation [repo] | Operator attention budget (≤~2 interrupts/10 min [R4·S28]) | Event-driven | Human | ExceptionPanel / ExceptionInterrupt [repo] | `rescue-signal-degraded`; battery-critical handoff [repo] |

## Phase 8 — Mop-up & Post-Mission Reporting

**Operator decision owed:** declare controlled / release resources [R4 row 25]; schedule thermal patrol tasks [R4 row 23].

| Data produced (source) | Data consumed | Latency requirement | Consumer | Repo scene mapping | Failure / degraded behavior |
|---|---|---|---|---|---|
| Thermal patrol task queue — grid picker, repeat schedule [R4 row 23] | Dock readiness, battery reserve budget [R4] | Readiness 1 Hz; plan static [R4] | Both | fleet/task panels [est] | battery-critical supervised handoff [repo] |
| Zero-hotspot confirmation across N consecutive patrols [R4 row 25] | Controlled/release checklist + residual-heat heatmap [R4] | Per-patrol | Human | debrief prep [est] | stale thermal sources flagged [repo] |
| ICS-209-style debrief — authority packet AUD-90-0847; DebriefTimeline [repo docs] | Post-mission report; audit log (actor AI/TALON/Operator/System) [repo] | Post-mission; per-event audit entries | Both | `debrief` (Ics209DebriefModal) [repo] | `infrastructure-total-loss`: manual protocol takeover (InfrastructureLossTakeover) [repo] |
| Handover / escalation packet — relief operator + regional commander [repo PRODUCT.md] | Session snapshot (scene, thermalF, fused confidence, structuresCleared/47, wind) [repo] | Per-event | Both | `handoff-pending` [repo] | `network-degraded`: continuation on local state [repo] |

---

## Cross-phase data-flow summary

Signal → fusion → alert → tasking → live ops → closeout:

| Stage | Carries | Latency gate | Owner |
|---|---|---|---|
| Signal | Raw thermal/EO frames, satellite-ir, RAWS, permits | Real-time; machine detection ~1–5 s [R1·est] | TALON |
| Fusion | Nine evidence kinds → fused confidence + corroboration [repo] | 0–15 s before interrupt [repo] | TALON |
| Alert | Evidence card + threshold event | Push event-driven; card ≤1 s [R4]; VERIFY 15–45 s [repo] | Human gate 1 (confirm) |
| Tasking | Auto-launch + authority packet + strategy proposals | 10–30 s compressed dispatch [R1]; gates: notify-authorities, authorize-containment [repo] | Human gate 2 (authorize) |
| Live ops | Video, telemetry, spread rings, perimeter, blue-force | Real-time video; per-orbit perimeter; supervision-by-exception [repo][R4] | Human gate 3 (supervise) |
| Closeout | Hotspot confirmation, ICS-209-style debrief, audit timeline, handover packet | Per-patrol / post-mission [repo][R4] | Human declare/release |

## Latency budget ladder

| Budget | What must fit (anchors inline) |
|---|---|
| **<1 s** | EO glass-to-glass ≤~250 ms (DJI O3E ~200 ms [R4·S10]; link component ~70 ms [R2·S3a]; requirement ceiling <500 ms [R2·S26]); thermal 30 fps [R2]; evidence-card open ≤1 s [R4]; alert push event-driven [R4·INF]; map render 1–10 Hz [R4]; press-and-hold ~2 s Class-3 gate [repo docs] |
| **<5 s** | Telemetry strip 1 Hz [R4]; dock/battery state 1 Hz [R4]; ADS-B ~1 Hz [R4·S21][R4·S22]; ETA recompute 1 Hz [R4 row 11]; evidence-status flips + live confidence easing [repo]; backend WS sync 5 Hz [repo docs] |
| **<30 s** | Machine detection ~1–5 s [R1·est]; fusion-before-interrupt 0–15 s [repo]; VERIFY window 15–45 s [repo]; validation 10–30 s [R1]; tasking decision 10–30 s [R1]; Dock 3 takeoff 10 s [R2·S9a]; Dock 2 airborne 45–60 s [R2·S7][R2·S8] — boundary item, acceptable because launch starts autonomously at threshold and overlaps VERIFY [repo][est] |
| **Minutes** | Spread-projection recompute 5–15 min [R4·INF]; perimeter per orbit 1–5 min [R4·INF]; weather 1–5 min / RAWS hourly [R4]; dock recharge 32 min = min inter-sortie [R2·S8a]; single-dock duty cycle ≈61% [R2·est]; LiDAR deferred bulk 6–12 GB/100 ha [R2·est]; VTOL re-map 1–3 h [R2]; ICS-209-style debrief post-mission [repo] |
