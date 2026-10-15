# 04 · Drone Fleet Specification — Classes, Payloads, Sentinel Data Feeds

> **Scope:** Required fleet for FlytBase Sentinel wildfire first response — merges R2 desk research (7 real-world drone classes, dock/handover/continuity numbers, bandwidth budgets) with the repo ground truth (10-drone roster / 5 classes in `src/app/mockData.ts`, network-degraded exception in `src/app/domain/exceptions.ts`).
> **Tag legend:** `[repo·<file>]` = repo ground truth · `[R2-S#]` = R2 citations (own S-namespace; see r2-drone-fleet.md §e) · `[R1-S#]` = R1 citations · `[R4-S#]` = R4 citations · `[est]` = estimate · `[new-spec]` = not in repo; proposed for a production system.
> **KPI anchor:** 48 min → 90 s detect → validated alert → tasking decision [repo·brief §1]. Dock-launch numbers make this plausible once detection is automated: Dock 2 ready-for-takeoff in 45 s [R2-S7], Dock 3 10-s takeoff [R2-S9a].

---

## 4.1 Required fleet — 7 researched classes merged with the repo's 10-drone / 5-class roster

Repo roster (from `createDroneRoster()`, `src/app/mockData.ts`): 10 drones across 5 classes — `surveillance` (visual overwatch ×2), `thermal-lidar` (mapping/model build), `guidance-relay` (comms relay ×3), `evacuation-guidance` (instructional audio+light ×2), `multi-role` (reserve ×2); each with battery, signal, status, assignedMission (9 `DroneMissionType` values incl. patrol, investigation, perimeter-monitor, guide-emergency-personnel, relay-field-intel, backup-support) [repo·mockData].

| # | Class (R2) | Mission role & timeline phase | Example platforms | Payload | Endurance | Limits | Feeds sent (→ §4.2) | Bandwidth | Repo mapping (roster) | Gap vs repo |
|---|------------|-------------------------------|-------------------|---------|-----------|--------|---------------------|-----------|------------------------|-------------|
| 1 | **Scout / recon multirotor** | First airborne look after AI alert → verify; hotspot confirmation, close-up EO/IR, live video. Detection through entire incident watch. | DJI M3DT (Dock 2) / M4TD (Dock 3); M30T [R2-S2][R2-S3][R2-S7] | Wide 48MP + tele 12MP (×56–128) + radiometric thermal 640×512@30 fps (1280×1024 UHR), laser rangefinder [R2-S11] | 41–54 min [R2-S2][R2-S12] | M30T 15 m/s wind, IP55; M3DT IP54–55, ~8 m/s max landing wind (Dock 2); −20…50 °C [R2-S8][R2-S12] | EO video, thermal video, radiometric stills, telemetry, EO stills, RTK corrections, health/dock status | 5–8 Mbps H.264 / 3–5 H.265 [est] | Covers repo `thermal-lidar` class (Lidar-02 flies FLIR mapping/model build; Scout-03 receives rescue handoff [repo·exceptions.ts]) and the surveillance overwatch role [repo·mockData] | Repo merges scout + thermal into one class; production splits EO-scout vs thermal-specialist [new-spec] |
| 2 | **VTOL fixed-wing long-endurance patrol** | Wide-area pre-positioned patrol (ridges, drainages) beyond multirotor radius; perimeter re-map every 1–3 h; early routine-patrol phase. | Quantum Systems Trinity Pro; Wingtra, DeltaQuad [R2-S13][R2-S14] | RGB oblique/mapping camera, optional thermal or multispectral | ~90 min+, cruise 17 m/s [R2-S13][R2-S14] | C2 5–7.5 km, 5,500 m MSL [R2-S13] | EO video (situational), mapping imagery (deferred), telemetry | 2–6 Mbps live + 2–6 GB deferred/mission [est] | **None** — repo roster has no fixed-wing class [repo·mockData] | **[new-spec] addition** — adds area-scale re-discovery beyond dock radius |
| 3 | **Thermal-IR platform** | Dedicated radiometric hotspot mapping; night ops; fire-line mapping through smoke at altitude. Often merged with class 1. | M30T / M3DT; Zenmuse H20T on M350 [R2-S2][R2-S4][R2-S10] | 640×512@30 fps VOx, ±2 °C/±2 %, isotherms, temp alarm, 28× thermal zoom [R2-S4][R2-S11] | 41–55 min [R2-S2] | M350: IP55, 12 m/s [R2-S2] | Radiometric stream + isotherm alarms | 1–2 Mbps [est] | Repo `thermal-lidar` class (drone feeds `thermal` + `lidar` evidence kinds [repo·tokens.ts]) | Split from class 1 in production fleet plan [new-spec] |
| 4 | **LiDAR mapping drone** | Post-detection terrain/fuel assessment; under-canopy terrain model for fire-spread modeling; drop-zone survey. Flown hours after detection; pre-season for fuel maps. | M350 RTK + Zenmuse L1/L2; Trinity Pro + Q.LiDAR [R2-S2][R2-S29] | 100k–1.5M pts/s, 50–1000 pts/m², cm–dm accuracy [R2-S29] | 30–45 min [R2] | IP55 airframe, 12 m/s wind [R2-S2] | Point cloud (deferred bulk) | ≈0 live; 6–12 GB per 100 ha [est] | Repo `thermal-lidar` class + `lidar` evidence kind; Lidar-02 supplies 840 °F / flame 18 ft / spread 12 m/min reading [repo·docs/01] | Repo conflates thermal + LiDAR on one airframe; heavy LiDAR needs M350-class [new-spec] |
| 5 | **Communications-relay (repeater)** | Extends C2/video over ridges/RF shadow; bridges cellular dead zones; mesh-links ground teams + drones. Launched when incident enters terrain shadow or BVLOS beyond dock coverage. | Custom multirotor + Meshmerize-class mesh; tethered Elistair as static relay [R2-S15][R2-S16][R2-S36] | Mesh radio (parallel video streams, 50+ km class), LTE/5G repeater | Multirotor 30–45 min; tethered 24 h [R2] | Task-dependent; flies above smoke layer [R2] | Mesh backhaul (other drones' + teams' traffic) | 5–20 Mbps pass-through [est] | Repo `guidance-relay` class ×3 (relay-field-intel mission) [repo·mockData] | Repo relay is *guidance*-oriented (audio/light); production needs RF-repeater payload spec [new-spec] |
| 6 | **Heavy-lift water-drop / ignition** | Direct first response on small new ignitions (bucket drops); prescribed/burnout ignition (aerial ignition spheres). Dispatched after verification when ground ETA is long. | Freefly Alta X + IGNIS; CTIF "Thunder Wasp" class [R2-S15a][R2-S17][R2-S18] | 35 lb (≈16 kg) payload (Alta X); IGNIS spheres; 100–400 kg-class water (large systems) | Alta X ~50 min empty / 22 min @20 lb; Thunder Wasp ~2 h [R2-S15a][R2-S17] | Alta X IP43; moderate-wind water ops only [R2-S15a] | EO video + payload status (drop/ignition sys) | 4–6 Mbps [est] | **None** — repo has no water/ignition class; containment is plan + ground teams only [repo·mockData] | **[new-spec] addition** — only class that physically intervenes before ground crews |
| 7 | **Tethered persistent-surveillance** | Hours-scale unblinking watch over fire camp / ICP / high-risk asset; doubles as fixed relay. Deployed on incident arrival until relief. | Elistair Khronos (24 h @ 60 m), ORION-class [R2-S20][R2-S21] | EO/IR gimbal, onboard processing | 24 h+ (tether-powered) [R2-S20] | 60 m altitude envelope; station limits [R2-S20] | EO/IR video 24/7 | 4–6 Mbps H.264 / 2–3 H.265 [est] | Partial: repo's surveillance overwatch is battery-multirotor, not tethered [repo·mockData] | **[new-spec] addition** — persistent watch layer; removes duty-cycle gaps |
| — | *(repo-only class)* **Evacuation-guidance** | Instructional audio + light guidance of evacuees along corridors; RESCUE phase (75–90 s arc). | — (no real-world platform in R2; conceptual) | Speaker + light payload | Multirotor-typical [est] | — | None defined in R2 — guidance is an *output* side effect | Negligible [est] | Repo `evacuation-guidance` class ×2 (guide-emergency-personnel mission) [repo·mockData] | Repo-only; not a researched real-world class — treat as Sentinel-specific [new-spec] |
| — | *(repo-only class)* **Multi-role reserve** | Backup-support pool; absorbs handoffs (Scout-03) and re-tasking. | — | Flexible | — | — | Per assumed role | Per assumed role | Repo `multi-role` ×2 [repo·mockData] | Repo-only reserve abstraction [new-spec] |

**Fleet-level gaps vs repo (summary):** no VTOL fixed-wing, no heavy-lift, no tethered class in the 10-drone roster [repo·mockData]; guidance-relay needs an RF-repeater payload definition; thermal and LiDAR roles need separable airframes for production. All four marked [new-spec].

---

## 4.2 Per-class data feeds (format → rate → bandwidth → consumer)

Consumer **AI** = TALON automated (detection/fusion/alerting) · **H** = operator display · **A+H** = both. All rates/bandwidth from R2 §(b); tags preserved.

| Class | Feed | Format | Update rate | Est. bandwidth (uplink) | Consumer (TALON vs operator) |
|-------|------|--------|-------------|--------------------------|------------------------------|
| Scout (M3DT/M30T) | EO live video | H.264/H.265 RTP/RTSP→(WebRTC/SRT to UI); DJI Dock streams 1080p [R2-S22][R2-S23] | 30 fps | 1080p H.264: 5–8 Mbps (6–9 @60fps) [R2-S22][R2-S23]; H.265 ≈ half or less [R2-S25] → 2–4 Mbps [est] | **A+H** — AI smoke/fire detection on frames (`drone-visual` evidence kind) + operator video wall |
| Scout | Thermal video | H.264/H.265 RTP 640×512@30 | 30 fps | 1–2 Mbps [est] | **A+H** — hotspot classifier (`thermal` kind) + isotherm overlay |
| Scout | Radiometric thermal stills | R-JPEG (16-bit temp per pixel) / JPEG | on trigger / every 2–10 s | burst 1–8 MB/image; avg <0.2 Mbps [est] | **AI** — temperature-referenced detection, alarm evidence |
| Scout | Telemetry (pos/att/battery/gimbal) | JSON over MQTT/WebSocket (FlytBase over 4G/5G [R2-S31]); DJI OSDK up to 50 Hz GPS / 10 Hz gyro [R2-S33] | 5–10 Hz platform-typical | 200–500 B/msg → 0.02–0.04 Mbps [est] | **A+H** — fleet panel + TALON tasking; maps to repo 5 Hz WS [repo·docs/04] and MAVLink v2 messages [repo·docs/01] |
| Scout | Still photos (EO) | JPEG 12–48 MP | on trigger | burst 5–15 MB; avg <0.5 Mbps [est] | **A+H** |
| Scout | RTK corrections | NTRIP/RTCM3 (downlink; tiny) | 1 Hz | ~530 B/s ≈ 0.004 Mbps [R2-S40] | **AI** (accuracy) |
| Scout | Health/dock status | JSON (DJI Cloud API / FlytBase FDM) | 1–10 s | <0.01 Mbps [est] | **A+H** |
| VTOL patrol | EO video (situational) | H.264/H.265 1080p | 30 fps | 2–6 Mbps [est] | **H** mostly; AI optional |
| VTOL patrol | Mapping imagery | JPEG/RAW onboard; uploaded post-landing (or burst in-link) | per mission | bulk 2–6 GB/mission [est] deferred; live avg <1 Mbps [est] | **AI** (photogrammetry, perimeter) |
| VTOL patrol | Telemetry | JSON/MQTT | 1–10 Hz | 0.01–0.04 Mbps [est] | **A+H** |
| Thermal platform | Radiometric stream + isotherm alarms | RTP/H.264 + event JSON (temp-alarm trigger [R2-S3]) | 30 fps + events | 1–2 Mbps video [est] + negligible events | **A+H** |
| LiDAR | Point cloud | LAS/PLY, generated post-flight; 100k–1.5M pts/s raw [R2-S29] | n/a (deferred) | Raw ≈10–24 Mbps-class if live-streamed [est, not typical]; file 100 ha @200 pts/m² ≈ 6–12 GB [est]; .las uploads ≤5 GB/file [R2-S32] | **AI** (terrain/fuel model → `terrain`/`lidar` kinds) |
| Relay | Mesh backhaul (other drones' + teams' traffic) | IP over mesh radio | continuous | 5–20 Mbps pass-through [est] (sized for 1–3 concurrent video streams [R2-S36]) | **A+H** |
| Heavy-lift | EO video + payload status (drop/ignition sys) | H.264/H.265 1080p + JSON | 30 fps + 1 Hz | 4–6 Mbps video [est] + <0.01 status | **H** |
| Tethered | EO/IR video 24/7 | H.264/H.265 1080p over fiber tether → ground uplink | 30 fps | 4–6 Mbps (H.264) / 2–3 (H.265) [est] | **A+H** |

**Video-transport latency context:** drone ops want <500 ms glass-to-glass [R2-S26]; WebRTC sub-500 ms, SRT 0.5–2 s, RTMP 3–10 s [R2-S24][R2-S25a]; DJI O3 Enterprise transmission ~70 ms @1080p60 [R2-S3a]. Operator-facing refresh norms (from R4): position 1–10 Hz, telemetry strip 1 Hz, video 24–30 fps @≤250 ms budget, alerts event-driven push (never polled) [R4-S10][R4-S12][R4-S21][R4-inf].

---

## 4.3 Dock / handover / continuity specification

Researched numbers from R2 §(c), mapped against repo scenes. Where the repo lacks the behavior, marked [new-spec].

| Mechanism | Researched spec | Repo scene / behavior | Gap |
|-----------|-----------------|------------------------|-----|
| **Launch latency** | Dock 2 ready-for-takeoff **45 s** [R2-S7]; "airborne in 45–60 s" [R2-S8]; Dock 3 **10-s takeoff** [R2-S9a] | Canonical arc: "nearest drone launches autonomously" at alert threshold 03:47:18 [repo·brief §4]; no dock-latency constant authored | Adopt 45-s (Dock 2) / 10-s (Dock 3) as authored constants [new-spec] |
| **Battery turnaround** | Dock 2 recharges 20→90 % in **32 min** → min inter-sortie interval 32 min [R2-S8a]; battery 400 cycles [R2-S5]; Dock 3 10→90 % in **25 min** [R2-S9]; robotic hot-swap **2-min** cycles vs 40–60-min in-dock charging (≈20–25 vs 4–5 missions/day) [R2-S37]; ground hot-swap <20 s [R2-S38] | `rescue-battery-critical`: Lidar-02 at **14 %** battery → drone perception blocked → **supervised handoff to Scout-03** with recommendedRecoveryCommand + audit text [repo·exceptions.ts] | Repo has the *exception* but no recharge/turnaround constants or duty-cycle model [new-spec] |
| **Duty cycle** | 50-min flight + 32-min charge → single-dock watch coverage ≈ **61 %**; continuous coverage needs staggered missions w/ gap acceptance or **2× docks/drones** overlapping [R2-est] | Roster shows per-drone battery % but no rotation schedule [repo·mockData] | Rotation scheduler [new-spec] |
| **Multi-dock rotation** | Persistent watch = hand off track before low-battery RTH; incoming aircraft launches from second dock (≤10 km spacing), matches position; outgoing returns home; AI/vision continuity or brief double-coverage [R2-est — vendor workflows support mission handover, no public minute-level spec] | Not modeled — single-site roster, no second dock [repo·mockData] | **[new-spec]** — 2-dock rotation with position-match overlap |
| **Drone-to-drone handover** | FlytBase supports drone & payload control-access transfer between operators/teams [R2-S34]; remote manual piloting of dock aircraft [R2-S35]; guest video/telemetry share links [R2-S31a]; handover is a UI action (seconds); cellular ops have no RF handoff — continuity via platform session [R2] | `rescue-battery-critical` handoff to Scout-03 is the repo's drone-to-drone continuity pattern (supervised, exception-driven) [repo·exceptions.ts]; `investigation-pending` promoted state implies task continuity across scenes [repo·mockData/REVIEW_SCENES] — wiring not individually verified [repo·audit §6] | Generalize the supervised handoff into a first-class handover transaction with overlap window [new-spec] |
| **Pilot-to-pilot handover** | Control-access transfer = UI action, seconds [R2-S34] | Operator persona Asha holds authority; secondary relief operator + regional commander receive handover/escalation packet [repo·PRODUCT.md] | Relief-operator session handoff flow [new-spec] |
| **Loss-of-link failsafe** | C2 loss → auto failsafe: hover → RTH (dock landing) or land-in-place, configurable [R2-est — standard DJI enterprise behavior]; cellular-BVLOS adds dual-link redundancy (4G/5G + RC relay) | `rescue-signal-degraded` exception scene; network-degraded → HD suspended, low-bandwidth LiDAR outlines, cached route model, local telemetry [repo·exceptions.ts] | Explicit RTH profile + dual-link policy per mission class [new-spec] |
| **Weather gates** | Dock 2 max landing wind **8 m/s** [R2-S8]; M30T ops to **15 m/s** [R2-S12]; M350 **12 m/s** [R2-S2]; Dock 3 to **50 °C** ambient [R2-S9]; fire-weather columns/gusts frequently exceed these → UI must present go/no-go [R2] | Fixed wind string "NE 38° · 18 mph" (≈8 m/s — right at Dock 2 landing limit); no go/no-go surface [repo·mockData] | **[new-spec]** — go/no-go panel bound to live wind vs per-platform minima |
| **Investigation continuity** | — | `investigation-pending` + `handoff-pending` appear as promoted states in REVIEW_SCENES; transition wiring not individually verified this pass [repo·audit §6] | Verify + formalize as handover states [new-spec] |

---

## 4.4 Uplink budget & network-degraded ladder

### 4.4.1 Per-aircraft sustained uplink (R2 §d, tags preserved)

| Aircraft | Typical sustained uplink | Peak |
|----------|--------------------------|------|
| Dock scout M3DT (EO+thermal+telemetry) | **5–8 Mbps** (H.264) / **3–5 Mbps** (H.265) [est] | 10–12 Mbps (4K EO or UHR thermal + stills burst) [est] |
| M350-class manual scout/thermal | 6–10 Mbps (dual 1080p channels) [est] | 12–16 Mbps [est] |
| VTOL patrol Trinity Pro (live only) | 2–6 Mbps [est] (+2–6 GB deferred per mission) | 8 Mbps [est] |
| LiDAR mapping | ≈0 live (deferred 6–12 GB/100 ha [est]) | 10–24 Mbps if raw-streamed [est, atypical] |
| Relay drone (pass-through) | 5–20 Mbps [est] | 30 Mbps [est] |
| Heavy-lift water/ignition | 4–6 Mbps [est] | 8 Mbps [est] |
| Tethered persistent | 4–6 Mbps (H.264) / 2–3 (H.265) [est] | 8 Mbps [est] |

### 4.4.2 Fleet-level aggregate [est]

- **Active incident set (R2 rule of thumb):** 1 scout + 1 tethered + 1 relay ≈ **15–35 Mbps aggregate uplink**; plan dock sites for **≥25 Mbps sustained uplink** (LTE/5G or fiber at tether) [R2-est].
- **Full Sentinel incident deployment [est]:** 1 dock scout (5–8) + 1 thermal/LiDAR (1–2 live) + 1 relay pass-through (5–20) + 2 evacuation-guidance (≈0.1) + 1 heavy-lift when dispatched (4–6) ≈ **15–36 Mbps**, i.e. the same envelope — the relay pass-through dominates sizing. Add VTOL patrol (+2–6 live, 2–6 GB deferred/mission) and tethered (+4–6) for wide incidents → plan **≥40 Mbps** site uplink [est].
- Repo anchor: backend sync is WS :4191 @5 Hz telemetry/state [repo·docs/04] — operator-console side is trivial vs the RF uplink; the constraint is drone→ground [est].

### 4.4.3 Network-degraded degradation ladder

Repo-enforced anchor: `network-degraded` exception — HD streams suspended, **low-bandwidth LiDAR outlines** + cached route model + local telemetry continue; drone perception agent `blocked`; `blockedCommands` listed; confidenceImpact applied [repo·exceptions.ts].

| Ladder stage | Trigger [est] | What sheds first | What survives | Repo mapping |
|--------------|---------------|-------------------|---------------|--------------|
| 0 — Full | Link ≥ sustained budget | — | All feeds (§4.2) | Normal scenes [repo] |
| 1 — Shed HD video | Sustained link < ~5 Mbps per streaming aircraft [est] | EO/IR HD video first (highest bitrate, lowest AI-criticality) | Radiometric stills (burst), telemetry, thermal alarms | "HD streams suspended" [repo·exceptions.ts]; operator falls back to evidence chips + stills |
| 2 — Low-bandwidth outlines | Link < ~1–2 Mbps [est] | Full LiDAR/video payloads | **Low-bandwidth LiDAR outlines** (vectorized perimeter/hotspot geometry), cached route model | "low-bandwidth LiDAR outlines, cached route model" [repo·exceptions.ts] — matches R2's finding that LiDAR-as-geometry is orders lighter than point-cloud/video [R2-S29][R2-est] |
| 3 — Telemetry-only | Link < ~0.05 Mbps [est] | All imagery | Telemetry + health JSON (0.02–0.04 Mbps/class [R2-est]) + isotherm alarm events | Drone perception `blocked`; local telemetry [repo·exceptions.ts]; operator sees drone cards only |
| 4 — C2 loss | Total link loss | Everything | Onboard failsafe: hover → RTH/land-in-place [R2-est] | `rescue-signal-degraded` scene; loss-of-link RTH profile [new-spec] |
| 5 — Infrastructure total loss | Site/system failure | All automated channels | Manual protocol takeover | `infrastructure-total-loss` → InfrastructureLossTakeover surface [repo·exceptions.ts][repo·shell] |

**Ladder rules (production):** shed in descending bitrate / ascending AI-criticality order (video → imagery → geometry → telemetry); every shed step emits an `OperationalException` with affectedSources/affectedAgents/blockedCommands/fallbackInputs/confidenceImpact/auditText and mapImpact + spatialUncertainty [repo·exceptions.ts shape]; recovery recommended via `recommendedRecoveryCommand`. Stage behaviors 1–3 are repo-anchored; numeric triggers are [est] [new-spec].

---

## 4.5 Sources

Carried from the research files — do not re-derive here: R2 §e (S1–S40, drone/dock/payload/bandwidth), R1 §d (S1–S27, traditional-latency context), R4 §d (S1–S46, operator-console patterns). Repo refs per `[repo·<file>]` tags resolve against the repo audit (`repo-audit.md` §3–§5).
