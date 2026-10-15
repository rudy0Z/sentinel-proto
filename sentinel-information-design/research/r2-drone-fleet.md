# R2 — Drone Fleet & Sensor Payload Specification for Wildfire First-Response (FlytBase Sentinel context)

**Date:** 2026-09-22 · **Method:** desk research (web sources cited; all bandwidth/latency figures not directly sourced are labeled **[est]**)
**Context:** FlytBase Sentinel = AI drone-based forest-fire early detection & first-response platform built on drone-in-a-box (DJI Dock) remote operations (FlytBase markets "From Detection to First Response of Wildfires" using automated DJI M3DT fleets) [S1]. KPI anchor given by project: **48 min → 90 s response**. Dock-launch numbers below (45 s airborne, Dock 2 [S7]) are consistent with a ~90 s detect→airborne-type KPI.

---

## (a) Drone classes: role, platforms, payload, limits

| # | Class | Mission role / timeline use | Example platforms | Key payload | Endurance | Wind / IP / env. limits | Source |
|---|-------|------------------------------|-------------------|-------------|-----------|--------------------------|--------|
| 1 | **Scout / reconnaissance multirotor** (primary Sentinel asset) | First airborne look after AI/smoke alert → verification within seconds–minutes; hotspot confirmation, close-up EO/IR inspection, live operator video. Used from detection through entire incident watch. | DJI Matrice 3DT (Dock 2) / M4TD (Dock 3); DJI M30T (manual ops) | Wide 48MP + tele 12MP(×56–128 hybrid) + radiometric thermal 640×512@30 fps (1280×1024 UHR mode), laser rangefinder | 41–54 min (M30T 41 min; M4D/M4TD ~47–54 min) | M30T: 15 m/s wind, IP55; M3D/3DT: IP54–IP55, ~8 m/s max landing wind (Dock 2); −20…50 °C | [S2][S3][S4][S7][S8][S9][S11][S12] |
| 2 | **VTOL fixed-wing long-endurance patrol** | Wide-area pre-positioned patrol routes (ridge lines, drainages) beyond multirotor radius; repeat mapping of fire perimeter; gas/multispectral survey. Early mission phase (routine patrol) + periodic re-map every 1–3 h. | Quantum Systems Trinity Pro; (alt.: Wingtra, DeltaQuad) | RGB oblique/mapping camera, optional thermal or MicaSense-class multispectral | ~90 min+ (Trinity Pro), cruise 17 m/s | C2 range 5–7.5 km, 5,500 m MSL ceiling; hover wind tolerance spec'd by Q.S. | [S13][S14] |
| 3 | **Thermal-IR platform** | Dedicated radiometric hotspot mapping (often merged with class 1 — every dock Scout today is a "T" variant). Night ops, fire-line mapping through smoke at altitude. | DJI M30T / M3DT; Zenmuse H20T on M350 | 640×512 @30 fps uncooled VOx, ±2 °C or ±2 % accuracy, isotherms, temp alarm, 28× thermal digital zoom (M3DT) | 41–55 min (M350: 55 min) | M350: IP55, 12 m/s, −20…50 °C | [S2][S3][S4][S10][S11] |
| 4 | **LiDAR mapping drone** | Post-detection terrain/fuel assessment, under-canopy terrain model for fire-spread modeling, drop-zone survey. Flown after detection (hours), typically pre-season for fuel maps. | M350 RTK + Zenmuse L1/L2 or GreenValley/CHC; Trinity Pro + Q.LiDAR | 100k–1.5M points/s, 50–1000 pts/m² densities, cm-dm accuracy | 30–45 min (payload-dependent) | IP55 airframe (M350), 12 m/s wind | [S2][S29][S30] |
| 5 | **Communications-relay (repeater) drone** | Extends C2/video links over ridges/terrain shadow; bridges cellular dead zones; carries mesh radio to link ground teams + drones. Launched when incident moves into RF-shadowed terrain or BVLOS beyond dock coverage. | Custom multirotor w/ Meshmerize-class mesh radio; tethered Elistair as static relay | Mesh radio (parallel video streams, 50+ km class), LTE/5G repeater | Multirotor 30–45 min; tethered 24 h | Task-dependent; usually flies above smoke layer | [S15][S16][S36] |
| 6 | **Heavy-lift water-drop / ignition platform** | Direct first response on small new ignitions (bucket drops) and prescribed/burnout ignition (aerial ignition spheres). Dispatched after verification when ground ETA is long. | Freefly Alta X (+ Drone Amplified IGNIS); CTIF-profiled "Thunder Wasp" class | 35 lb (≈16 kg) payload (Alta X); IGNIS ignition payload; 100–400 kg-class water (large systems) | Alta X: ~50 min empty / 22 min @20 lb; Thunder Wasp class: ~2 h | Alta X tested IP43; water ops in moderate wind only | [S15a][S16a][S17][S18][S19] |
| 7 | **Tethered persistent-surveillance drone** | Hours-scale unblinking watch over an active fire camp / incident command post / high-risk asset; also serves as fixed relay. Deployed on incident arrival, stays until relief. | Elistair Khronos (24 h continuous @ 60 m), ORION-class stations | EO/IR gimbal, onboard processing | 24 h+ (mains/tether-powered) | 60 m altitude envelope; station limits | [S20][S21] |

**Why each is needed (timeline view):** Tethered/patrol class provides the persistent "watch" layer; dock-based thermal scout provides the 45 s-class "verify" strike; fixed-wing covers area-scale re-discovery beyond 10 km dock radius; LiDAR feeds spread-model terrain after detection; relay restores comms in terrain shadow; heavy-lift is the only class that physically intervenes before ground crews arrive.

---

## (b) Per-class data feeds to platform (format → rate → bandwidth → consumer)

Legend: consumer **AI** = automated (detection/fusion/alerting), **H** = human operator UI, **A+H** = both.

| Class | Feed | Format | Update rate | Est. bandwidth (uplink) | Consumer |
|-------|------|--------|-------------|--------------------------|----------|
| Scout (M3DT/M30T) | EO live video | H.264/H.265 RTP/RTSP→(WebRTC/SRT to UI); DJI Dock streams 1080p | 30 fps | 1080p H.264: **5–8 Mbps** (6–9 @60fps) [S22][S23]; H.265 ≈ half or less (Celona claims ~70 % less) [S25] → **2–4 Mbps** [est] | A+H (AI smoke/fire detection on frames + operator video) |
| Scout | Thermal video | H.264/H.265 RTP 640×512@30 | 30 fps | **1–2 Mbps** [est] (≈0.15 Mbps 8-bit raw equivalent; typical encoded) | A+H (hotspot classifier + isotherm overlay) |
| Scout | Radiometric thermal stills | R-JPEG (16-bit temp per pixel) / JPEG | on trigger / every 2–10 s | burst 1–8 MB/image; avg <0.2 Mbps [est] | AI (temperature-referenced detection, alarm evidence) |
| Scout | Telemetry (pos/att/battery/gimbal) | JSON over MQTT/WebSocket (FlytBase over 4G/5G [S31]); DJI OSDK broadcasts up to 50 Hz GPS / 10 Hz gyro [S33] | 5–10 Hz platform-typical | 200–500 B/msg → **0.02–0.04 Mbps** [est] | A+H |
| Scout | Still photos (EO) | JPEG 12–48 MP | on trigger | burst 5–15 MB; avg <0.5 Mbps [est] | A+H |
| Scout | RTK corrections | NTRIP/RTCM3 (downlink; tiny) | 1 Hz | **~530 B/s ≈ 0.004 Mbps** [S40] | AI (accuracy) |
| Scout | Health/dock status | JSON (DJI Cloud API / FlytBase FDM) | 1–10 s | <0.01 Mbps [est] | A+H |
| VTOL patrol | EO video (situational) | H.264/H.265 1080p | 30 fps | 2–6 Mbps [est] (same codec basis as above) | H (mostly; AI optional) |
| VTOL patrol | Mapping imagery | JPEG/RAW stored onboard; uploaded post-landing (or burst when in link) | per mission | bulk **2–6 GB/mission [est]** deferred; live avg <1 Mbps [est] | AI (photogrammetry, perimeter) |
| VTOL patrol | Telemetry | JSON/MQTT | 1–10 Hz | 0.01–0.04 Mbps [est] | A+H |
| Thermal platform | Radiometric stream + isotherm alarms | RTP/H.264 + event JSON (temp-alarm trigger [S3]) | 30 fps + events | 1–2 Mbps video [est] + negligible events | A+H |
| LiDAR | Point cloud | LAS/PLY, generated post-flight; 100k–1.5M pts/s raw [S29] | n/a (deferred) | Raw ≈10–24 Mbps-class while live-streamed **[est, not typical]**; file 100 ha @200 pts/m² ≈ 6–12 GB [est]; .las uploads ≤5 GB/file to platforms [S32] | AI (terrain/fuel model) |
| Relay | Mesh backhaul (other drones' + teams' traffic) | IP over mesh radio | continuous | 5–20 Mbps pass-through [est] (sized for 1–3 concurrent video streams [S36]) | A+H |
| Heavy-lift | EO video + payload status (drop/ignition sys) | H.264/H.265 1080p + JSON | 30 fps + 1 Hz | 4–6 Mbps video [est] + <0.01 status | H |
| Tethered | EO/IR video 24/7 | H.264/H.265 1080p over fiber tether → ground uplink | 30 fps | 4–6 Mbps (H.264) / 2–3 (H.265) [est] | A+H |

Video-transport latency context: drone ops want <500 ms glass-to-glass [S26]; WebRTC sub-500 ms, SRT 0.5–2 s, RTMP 3–10 s [S24][S25a]; DJI O3 Enterprise transmission itself ~70 ms @1080p60 [S3a].

---

## (c) Dock / handover / continuity notes (numbers)

- **Launch latency:** DJI Dock 2 ready-for-takeoff in **45 s** [S7], "airborne in 45–60 s of a call" [S8]; Dock 3: **10-s takeoff**, vehicle-mountable [S9a]. This is what makes a 48 min → 90 s detect-to-eye KPI plausible once detection is automated.
- **Turnaround / battery:** Dock 2 recharges 20→90 % in **32 min** → minimum inter-sortie interval 32 min (FAQ) [S8a]; battery rated 400 cycles [S5]. Dock 3: 10→90 % in **25 min** [S9]. Robotic hot-swap systems claim **2-min** cycles vs 40–60-min in-dock charging (≈20–25 vs 4–5 missions/day) [S37]; ground hot-swap <20 s exists for non-dock platforms [S38]; in-air battery swap remains experimental [S39].
- **Duty-cycle math [est]:** 50-min flight + 32-min charge → single-dock watch coverage ≈ 50/82 ≈ **61 %**. Continuous coverage needs either staggered missions every ~45 min with acceptance of gaps, or **2× docks/drones** overlapping.
- **Multi-dock rotation:** persistent fire watch = hand off track before low-battery RTH: incoming aircraft launches from second dock (≤10 km spacing), matches position, outgoing drone returns home — AI/vision continuity or brief double-coverage [est — vendor workflows support mission handover, no public minute-level spec].
- **Pilot-to-pilot handover:** FlytBase supports **drone & payload control-access transfer** between operators/teams [S34] and remote manual piloting of dock aircraft [S35]; live video/telemetry shareable via guest links [S31a]. Handover is a UI action (seconds); on cellular there is no RF handoff, so continuity is preserved by the platform session, not the radio.
- **Loss-of-link behavior (DJI dock class):** on C2 loss the aircraft auto-executes failsafe — hover → **return-to-home** (dock landing) or land-in-place configurable; DJI document RTH behavior on signal loss [est — standard DJI enterprise behavior; exact Sentinel profile not public]. Cellular-BVLOS ops add dual-link redundancy (4G/5G + RC relay at dock).
- **Weather gates:** Dock 2 max landing wind **8 m/s** [S8]; M30T operations to 15 m/s [S12]; M350 12 m/s [S2]; Dock 3 charges/operates to **50 °C** ambient [S9]. Fire-weather (thermal columns, gusts) frequently exceeds these → UI must present go/no-go.

---

## (d) Total per-aircraft uplink bandwidth budget (sum)

| Aircraft | Typical sustained uplink | Peak |
|----------|--------------------------|------|
| Dock scout M3DT (EO+thermal+telemetry) | **5–8 Mbps** (H.264) / **3–5 Mbps** (H.265) [est] | 10–12 Mbps (4K EO or UHR thermal + stills burst) [est] |
| M350-class manual scout/thermal | 6–10 Mbps (dual 1080p channels) [est] | 12–16 Mbps [est] |
| VTOL patrol Trinity Pro (live only) | 2–6 Mbps [est] (+2–6 GB deferred per mission) | 8 Mbps [est] |
| LiDAR mapping | ≈0 live (deferred 6–12 GB/100 ha [est]) | 10–24 Mbps if raw-streamed [est, atypical] |
| Relay drone (pass-through) | 5–20 Mbps [est] | 30 Mbps [est] |
| Heavy-lift water/ignition | 4–6 Mbps [est] | 8 Mbps [est] |
| Tethered persistent | 4–6 Mbps (H.264) / 2–3 (H.265) [est] | 8 Mbps [est] |

**Fleet sizing rule of thumb [est]:** an active incident with 1 scout + 1 tethered + 1 relay ≈ **15–35 Mbps aggregate uplink**; plan dock sites for ≥25 Mbps sustained uplink (LTE/5G or fiber at tether).

---

## (e) Sources

1. S1 https://flytbase.com/ — FlytBase wildfire detection→first-response (M3DT dock ops)
2. S2 https://enterprise.dji.com/matrice-350-rtk/specs — M350: 55 min, IP55, 12 m/s
3. S3 https://www.dji.com/matrice-30/specs — M30T cameras, thermal 640×512, 70 ms latency
4. S3a same as S3 (transmission latency 70 ms @1080p60)
5. S4 https://enterprise.dji.com/matrice-30 — thermal ±2 °C/±2 %, 30 fps
6. S5 https://enterprise.dji.com/dock-2 — 32-min charge, 400 cycles, 6-mo maintenance
7. S7 https://www.heliguy.com/blogs/posts/dji-dock-2-everything-you-need-to-know — 45 s takeoff readiness
8. S8 https://advexure.com/blogs/news/dji-dock-2 — 45–60 s airborne; 8 m/s max landing wind
9. S8a https://megadron.pl/blogs/news/dji-dock-2-faq — 32-min min interval between ops
10. S9 https://uavcoach.com/dji-dock-3/ + https://fizuas.com/dji-dock-3/ — Dock 3: 10-s takeoff, 25-min charge, M4D/M4TD
11. S9a fizuas.com (same)
12. S10 https://enterprise-insights.dji.com — wildfire thermal hotspot ops
13. S11 https://droniq.de/matrice-3td/ — M3DT thermal 640×512/1280×1024 UHR, 28×
14. S12 https://www.maverickdrone.com/dji-matrice-30t/ — M30T IP55, 15 m/s, 41 min
15. S13 https://quantum-systems.com/trinity-pro/ — Trinity Pro C2 5–7.5 km, 5,500 m, 17 m/s
16. S14 https://www.dronenerds.com — Trinity Pro 90-min endurance
17. S15 https://meshmerize.net/ — drone mesh, 50+ km, parallel video streams
18. S15a https://freeflysystems.com/alta-x + https://downloads.regulations.gov (Alta X filing) — 35 lb payload, IP43, ~50/22 min
19. S16 https://www.dslrpros.com (Alta X Gen2) — IP43-equivalent
20. S17 https://ctif.org (Thunder Wasp) — 400 kg lift, 2 h, 3× = 1,200 kg
21. S18 https://www.mapnova.com/blog — IGNIS (Drone Amplified) on Freefly Alta X
22. S19 https://www.vallfirest.com — Water Hog drone buckets
23. S20 https://www.unmannedsystemstechnology.com — Elistair Khronos 24 h @60 m
24. S21 https://elistair.com — tethered persistent surveillance
25. S22 https://vodlix.com — 1080p H.264 5–8 Mbps
26. S23 https://megaservicesllc.com — 1080p60 6–9 Mbps; 4K 15–25 Mbps
27. S24 https://www.vdocipher.com — 4K H.264 32 / H.265 15 Mbps
28. S25 https://docs.celona.io — H.265 ≈70 % bandwidth saving
29. S25a https://www.mux.com + https://antmedia.io — RTMP 3–10 s, SRT 0.5–2 s, WebRTC <500 ms
30. S26 https://www.maris-tech.com — drone live video <500 ms requirement
31. S27 https://www.mdpi.com/2504-446X/9/12/812 — LTE remote control <150 ms average
32. S28 https://www.aviationtoday.com — LTE 20–30 ms, 5G ~10 ms radio latency
33. S29 https://www.sphengineering.com — UAV LiDAR 100k–1.5M pts/s, 50–1000 pts/m²
34. S30 https://www.thefuture3d.com — LAS file size ranges
35. S31 https://help.dronedeploy.com — 5 GB max .las upload
36. S31a https://flytbase.com (guest link sharing) + https://www.suasnews.com (FlytNow 4G/5G low latency)
37. S32 https://help.dronedeploy.com (same as S31)
38. S33 https://developer.dji.com/doc/onboard-sdk — telemetry broadcast 50 Hz GPS / 10 Hz gyro
39. S34 https://releases.flytbase.com — drone & payload control access transfer
40. S35 https://docs.flytbase.com — manual dock controls
41. S36 https://meshmerize.net (relay sizing context)
42. S37 https://dronehub.ai — 2-min robotic swap vs 40–60-min charge; 20–25 vs 4–5 missions/day
43. S38 https://voliro.com — hot-swap <20 s
44. S39 https://www.tue.nl — in-air battery swap (experimental)
45. S40 https://docs.sparkfun.com — RTCM corrections ≈530 B/s

---

## (f) Uncertainties

1. **FlytBase/Sentinel internals are not public** — exact codec, adaptive-bitrate ladder, and dock→cloud stream specs (DJI Cloud API caps dock live view at 1080p-class) are inferred, not documented. "Sentinel" as a product name could not be independently confirmed in public search; the July 2025 FlytBase wildfire page is the closest public artifact.
2. **Thermal live bandwidth [est]** — no vendor publishes 640×512 radiometric stream bitrates; 1–2 Mbps is an inference from typical IR encoder settings. Whether full radiometric (16-bit) frames stream live vs arrive as R-JPEG stills is platform-dependent.
3. **H.265 savings** — Celona's "~70 %" is at the aggressive end; commonly observed H.265 savings vs H.264 are ~40–50 %. Budgets above assume the conservative end.
4. **LiDAR live streaming is atypical** — treat as deferred bulk upload; real cellular-linked LiDAR streaming products weren't found.
5. **Handover timing** — no public spec for drone-to-drone handover latency/overlap in dock fleets or FlytBase specifically; numbers here are duty-cycle math + product-capability inference.
6. **Relay payload throughput [est]** — Meshmerize claims 50+ km class meshes but per-node sustained throughput was not verified.
7. **Regional variation** — FCC vs CE link ranges (20 km vs 8 km for O3 Enterprise) and BVLOS rules differ by country; operational figures used here are FCC-class.
