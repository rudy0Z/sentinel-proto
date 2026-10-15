# R4 — Operator-UX & Control-Room Patterns Research (FlytBase Sentinel)

Desk research — compiled 2026-09-22. Scope: (a) role→decision matrix for first minutes of a reported wildfire, (b) console pattern catalogue from real mission-control / drone-ops products, (c) alert-hierarchy best practice, (d) sources, (e) uncertainties.

**Tag legend:** `[S#]` = grounded in cited source (see §d). `[INF]` = inference by researcher. `[INF-S#]` = inference anchored on a cited source. KPI anchor assumed: detection→validated dispatch 48 min → 90 s.

---

## (a) Role → Decision Matrix (draft, 28 rows)

Roles: **IC** = Incident Commander (incident-level decisions, remote or on-scene); **MO** = Mission Operator (Sentinel console: monitors alerts, validates detections, manages fleet/tasks); **RPIC** = Remote Pilot in Command (flight authority, intervention, sensor work). Phases: Validate → Dispatch → Flight → On-scene → Containment → Mop-up.

| # | Phase | Role | Decision | Exact data needed | Presentation format | Refresh | Tag |
|---|-------|------|----------|-------------------|---------------------|---------|-----|
| 1 | Validate | MO | Is this detection a real fire (accept/reject AI alert)? | Alert thumbnail + short clip; EO zoom / IR toggle from fixed camera or nearest dock; AI confidence %; detector ID & timestamp; lat/long; cross-sensor corroboration; known false-alarm sources nearby (substation, glare, dust) | One-glance **evidence card**: image + metadata + 1-click Confirm / Dismiss (reason code) | Stills on event; live video on open | Pano AI uses human analysts to verify AI flags before notification [S17][S18][S19]; card format [INF] |
| 2 | Validate | MO | Which alert to work first (triage severity)? | Confidence; smoke column growth across frames; proximity to WUI / critical infrastructure; wind & fuel dryness; clustering of multiple detections into one incident | **Priority queue** sorted by risk score; clustering merges duplicate detections into one incident row | Recomputed per new frame/event | [INF-S32][S34] (queue + correlation from CAD practice) |
| 3 | Validate | IC | Commit first resource: drone launch / crew / aircraft? | Validated lat/long; initial size & smoke volume/color (lookout-style report elements); access routes; time since detection; current RAWS weather | Incident card on map with launch/dispatch CTAs + auto-drafted smoke report | On validation; then 1–5 min | Lookout smoke-report fields (azimuth, distance, volume, color, behavior) [S5]; initial-attack size-up fields [S1][S2]; UI [INF] |
| 4 | Validate→Dispatch | MO | Which launch site / dock to use? | Dock availability & state; drone battery SOC & cycle health; range vs fire distance; wind at dock; airspace check result | Asset status grid + map coverage rings; recommended nearest-ready asset highlighted | 1 Hz (dock/battery state), map static per incident | FlytBase fleet/telemetry & dock integration [S12][S14]; selection logic [INF] |
| 5 | Dispatch | MO | Approve autonomous launch? | Mission plan (waypoint/route); geofence sanity; airspace/TFR status; battery & link preflight pass/fail; weather minima | Pre-flight checklist panel with pass/fail rows + single **LAUNCH** button with hold-to-confirm | Point-in-time; re-check on abort | FlytBase/DJI Dock automated workflows [S14]; hold-to-confirm [INF] |
| 6 | Dispatch | IC | Order ground crew / aircraft / mutual aid? | Fire size & behavior estimate; resource availability + ETAs; travel-time matrix; mutual-aid roster & contact actions | Resource list w/ ETA countdowns + click-to-call; auto-formed ics-style text summary | 1 min or on status change | Initial-attack size-up drives resource ordering [S1][S2]; CAD unit-assignment pattern [S34][S35]; [INF] |
| 7 | Dispatch | IC | Issue evacuation **pre-warning**? | Fire location + spread vector & ROS estimate; wind direction; WUI footprint & population layer; road network; typical household prep+travel timeline | Map layers: spread cone, population density, evacuation zones; lead-time estimate banner | 5 min or on perimeter update | Evacuation decision timeline research [S36]; NIST WUI warning-vs-order stages [S37]; [INF] |
| 8 | Dispatch→Flight | MO/RPIC | Accept airspace & deconfliction plan? | TFR/LAANC status; manned traffic (ADS-B) in area; other UAS; detect-and-avoid sensor data | Airspace overlay + intruder banners on map & video | Traffic ~1 Hz [S21][S22]; TFR on change | FlytBase alerts (manned-aircraft proximity) [S13]; Casia DAA overlay in dashboard [S15] |
| 9 | Flight | RPIC | Monitor autonomous transit; intervene on anomaly? | Position (lat/long/alt/heading), ground speed, battery %, link RSSI, GPS sats, wind aloft, geofence proximity, remaining ETA | Map-centric view + **telemetry strip** + drone card; anomaly rows highlighted | Position 1–10 Hz [INF-S21]; telemetry 1 Hz [INF-S12] | GCS telemetry strip pattern [S12][S9]; HF deficiencies in UAS GCS [S24] |
| 10 | Flight | MO | Warn IC of en-route hazards / re-task? | DAA alerts; weather cells; link degradation; alternate dock options | Alert banners (T2) on incident card; re-task buttons | Event-driven | FlytBase alerts [S13]; [INF] |
| 11 | Flight | MO | Update IC with ETA & arrival plan? | Current position, distance-to-scene, ground speed, expected sensor-on time | ETA countdown on incident card (visible to IC view) | 1 Hz recompute | [INF] |
| 12 | Flight | IC | Cross-check detection vs 911/caller reports? | Public report log (time, caller location), detection alert correlation | Correlated-reports timeline merged into incident card | Event-driven | CAD as system-of-record pattern [S34][S35]; [INF] |
| 13 | On-scene | RPIC | Fly recon orbit / datum run / thermal scan? | Live EO/IR video; thermal palette + isotherms; GPS-stamped video frames; wind at altitude | **Video wall** with PiP map; thermal toggle; frame-scrub | Video 24–30 fps; latency ~200 ms (DJI O3E spec) [S10]; triple-channel 1080p [S11] | DJI enterprise video specs [S10][S11]; orbit workflow [INF] |
| 14 | On-scene | MO | Produce structured size-up for IC? | Location (lat/long + reference point); size estimate; ROS via datum tracking; fuel type; slope/aspect; on-scene weather; smoke color/volume/behavior; values at risk; access/egress; hazards (powerlines); resources on scene | Auto-filled **size-up form** (IRPG-aligned checklist) with fields populated from AI + video annotations; one-click push to IC | Fields live-update during first orbit | IRPG/size-up factor sets (LCES, safety, fire environment) [S1][S2][S4]; fire-behavior triangle (fuel/weather/topography) [S6][S8]; fire-behavior observation guidance [S7]; form concept [INF] |
| 15 | On-scene | IC | Attack mode: direct / indirect / combined? | Flame length (≈4 ft heuristic threshold); ROS; slope alignment; safety zones & escape routes (LCES); water/retardant availability | Decision-support panel: thresholds color-coded (e.g., flame length gauge) | On each size-up update | Flame-length >4 ft guidance from tactics training [S3]; LCES in IRPG [S4]; [INF] |
| 16 | On-scene | IC | Escalate: order more engines / dozers / aircraft? | Projected spread (simulation or spread-rate extrapolation); values-at-risk; current commitment; resource contention | **Spread-projection layer** (shadow cone 15/30/60 min) on map | Recompute 5–15 min [INF] | FARSITE/FlamMap are the established spread tools [S38][S39]; near-real-time runtime [INF] |
| 17 | On-scene | MO/RPIC | Update geofence / no-fly (fire area, manned aviation)? | Current fire perimeter; TFR boundary; manned aircraft positions; mission bounds | Map drawing tools; push geofence to drone live | Perimeter per orbit; aircraft ~1 Hz | NFZ editor pattern in GCS software [S43]; area-designation mission building [S44]; live push [INF] |
| 18 | On-scene | IC | Evacuation GO / shelter-in-place? | Spread rate toward community; time-to-impact estimate; population & road capacity; shelter sites; warning-vs-order status per zone | Zone table with status chips (W / GO) + map; time-budget banner | 1–5 min during threat growth | NIST WUI evacuation & sheltering staging [S37]; evacuation timeline components [S36]; [INF] |
| 19 | Containment | MO/RPIC | Map fire perimeter from air? | GPS-tagged EO/IR frames; thermal hotspot boundary; orbit coverage %; area calculation | Perimeter overlay auto-built from frames; area/ROS stats chip | Per-task / per-orbit (1–5 min in active orbit) [INF] | Thermal mapping & perimeter tracking in drone fire ops [S41][S42]; workflow [INF] |
| 20 | Containment | IC | Is the line holding? | Perimeter diff between orbits; weather watch (gusts, RH trend); crew/line positions | **Perimeter diff view** with time slider; growth flagged red | Per orbit | [INF-S7] (fire-behavior assessment cadence) |
| 21 | Containment | RPIC | Overwatch & comms relay for crews? | Crew GPS positions (blue-force); radio relay state; live video share to IC | Blue-force tracker layer + persistent video share link | Crew 0.2–1 Hz [INF] | Multi-UAV supervisory control research (Cummings) [S27]; Evans integrated comms consoles [S20]; [INF] |
| 22 | Containment | IC | Deconflict drone vs tankers/helicopters? | Manned aircraft ADS-B positions & intents; drone position/altitude; TFR volume | Shared traffic picture; temporal deconfliction suggestions | ADS-B ~1 Hz [S21][S22] | FAA ADS-B In applications [S22]; [INF] |
| 23 | Mop-up | MO | Schedule thermal patrol tasks? | Dock/drone readiness; priority grid cells (heat persistence); IR sensor state; battery reserve budget | **Task queue builder** (grid picker → repeat schedule) | Static per plan; readiness 1 Hz | FlytBase dock automation & fleet mgmt [S12][S14]; Auterion task reporting [S16]; [INF] |
| 24 | Mop-up | MO/RPIC | Detect hotspots & hand off to crews? | Thermal isotherm imagery; hotspot lat/long + peak temp; delta vs background | **Hotspot list** with jump-to-video; exportable KML/CSV for crews | Per-task | IR hot-spot detection eases mop-up (OKState extension) [S41]; isotherms on M30T-class sensors [S11] |
| 25 | Mop-up | IC | Declare controlled / release resources? | Zero-hotspot confirmation across N consecutive patrols; forecast (wind, RH); line status | Checklist + heatmap of residual heat | Per patrol | [INF] |
| 26 | Cross | All | Maintain common operating picture? | All assets, incidents, perimeters, weather, traffic, tasks in one view | Map-centric COP with layer toggles; role-based default layers | Position 1–10 Hz; weather 1–5 min; perimeters per task | Dispatch/EOC consoles integrate CAD+GIS+radio into one workspace [S20][S34][S35][S46]; [INF] |
| 27 | Cross | MO | Fleet health & readiness watch? | Battery cycle counts & SOC, dock health, link status, firmware, maintenance due | **Asset status grid** (green/amber/red cards); readiness scoreboard | 1 Hz / on change | FlytBase fleet management (real-time telemetry & health) [S12]; Auterion Suite fleet monitoring [S16] |
| 28 | Cross | IC | Prioritize among N simultaneous fires? | Active incidents with risk scores; resource contention matrix; per-incident freshness (last update age) | **Incident switcher** + priority queue; staleness clock on each incident card | 1 min or on event | CAD multi-incident management from one console [S34][S35][S46]; single-operator multi-UAV workload limits [S27]; [INF] |

**Refresh-rate summary (normative draft for Sentinel):**

| Stream | Target rate | Anchor |
|---|---|---|
| Own/asset position on map | 1–10 Hz (≥1 Hz floor) | ADS-B position source ≈1 Hz in cockpit/ATC displays [S21][S22]; upper bound [INF] |
| Video | 24–30 fps @1080p; glass-to-glass latency budget ≤ 250 ms | DJI O3 Enterprise ~200 ms latency, 1080p/30 live view [S10][S11] |
| Telemetry strip (battery, link, GPS) | 1 Hz | Product docs show continuous telemetry; rate [INF-S12] |
| Traffic / DAA | ~1 Hz, alert-driven overlays | [S21][S15] |
| Weather panels | 1–5 min pull + on-demand spot forecast | RAWS-style obs are station-based (often hourly); 1–5 min console display [INF]; spot-weather guidance [S7] |
| Fire perimeter / heat map | Per-task / per-orbit (1–5 min during active recon) | [INF] |
| Alerts | Event-driven push (never polled) | [INF-S13] |

---

## (b) Console Pattern Catalogue (mission-control & drone-ops UI patterns)

| Pattern | Shows | Operator decision supported | Why it saves time |
|---|---|---|---|
| **P1. Map-centric common operating picture (COP)** | All incidents, assets, perimeters, weather, traffic on one GIS base with layer toggles | Dispatch, deconfliction, evac zones (rows 3, 6, 7, 26) | Removes mental map-reading & app-switching; single spatial truth — the core of CAD/EOC console design [S34][S35][S46] and FlightHub-2-class platforms [S9] |
| **P2. Video wall with PiP map sync** | Live EO/IR feeds; each feed linked to its map position; thermal palette toggle | Detection validation, size-up, hotspot sweep (rows 1, 13) | Keeps evidence and geo-context co-located; pilots/IC read the same frames without channel-hopping — standard GCS layout [S20][S9]; triple-channel 1080p makes multi-feed viable [S11] |
| **P3. AI detection overlay on video** | Bounding boxes / heat masks / confidence tags rendered over live video | Quick accept/reject; guiding pilot's eye to the pixel region (row 1) | Cuts visual search seconds→zero; overtrust risk must be managed (HF warning for UAS automation reliance [S23][S24]) |
| **P4. Evidence card / one-glance alert card** | Thumbnail, clip, confidence, lat/long, timestamp, corroboration, nearby false-alarm hints + Confirm/Dismiss | Row 1 validate-in-seconds | Mirrors Pano's analyst-verify loop, which exists precisely to keep human review fast and consistent [S17][S18][S19] |
| **P5. Telemetry strip + drone card** | Position, battery, link RSSI, GPS, speed in a fixed strip; per-drone status card | Flight monitoring & intervention (rows 9, 27) | Fixed-position instruments prevent scan misses — a documented UAS GCS human-factors deficiency area [S24]; FlytBase exposes drone cards with live telemetry [S12] |
| **P6. Asset / battery / dock status grid** | Green/amber/red readiness per drone, dock, battery | Which asset to launch (rows 4, 5, 27) | Launch-readiness answerable in one glance instead of drilling per device [S12][S14][S16] |
| **P7. Task / mission queue** | Scheduled & active tasks with state, owner, ETA; re-task buttons | Patrol scheduling, re-tasking, mop-up cycles (rows 23, 2) | Turns ad-hoc radio coordination into a visible queue; Auterion Mission Control & FlytBase dock missions model this [S16][S14] |
| **P8. Geofence & airspace layers (FRZ/TFR/DAA)** | Editable keep-out zones, TFR volumes, intruder positions with threat banners | Row 8, 17, 22 | Live geofence push prevents intrusions instead of reacting; NFZ editors and DAA overlays are shipping GCS features [S43][S15][S13] |
| **P9. Comms panel (radio/VoIP/chat/share links)** | Channels per incident; one-click bridge IC↔pilot↔crew; live video share URLs | Rows 21, 14, 11 | Removes mode-switching during time-critical coordination — dispatch consoles integrate radio+CAD+GIS for this reason [S20][S46]; FlightHub supports multi-user live streaming [S9] |
| **P10. Timeline / audit log** | Every alert, action, task, and video annotation with timestamps | After-action review, accountability, model feedback | CAD-as-system-of-record is the established dispatch pattern [S34][S35]; supports post-incident learning [INF] |
| **P11. Priority queue + incident switcher** | Ranked incident list; staleness clock; fast context switch | Row 28 multi-fire overload | CAD systems manage many incidents per console; ranked queues + switcher keep N-incident work survivable [S34][S35]; operator-capacity research says automation must offload scheduling [S27] |
| **P12. Structured size-up form builder** | IRPG-aligned fields auto-filled from AI/video/RAWS; push-to-IC | Rows 14, 15, 16 | Converts operator knowledge into the exact format ICs are trained on; prevents omission under stress (checklist principle in size-up training [S1][S2][S4]) |
| **P13. Spread-projection layer** | 15/30/60-min spread shadow cones / simulated perimeters on map | Rows 16, 18 | Anticipatory rather than reactive decisions; FARSITE/FlamMap are the trusted models [S38][S39] — runtime feasibility at <5 min is [INF] |
| **P14. Role-based views (IC vs operator vs pilot)** | Same data, different default layers: IC gets decisions/queues; pilot gets flight instruments | All rows | Reduces per-role scan cost; matches division of labor in supervisory-control research [S27]; [INF] |

---

## (c) Alert-Hierarchy Recommendation (time-critical console)

Grounded in: ANSI/ISA-18.2 alarm-management practice [S28][S29][S32], ANSI/ISA-101.01 high-performance-HMI philosophy [S30][S31], ISO 7731 auditory danger signals [S33].

### Tiers

| Tier | Meaning | Color | Visual | Audio | Ack semantics |
|---|---|---|---|---|---|
| **T1 CRITICAL** | Validated fire threatening people/critical assets; flight-critical failure (link loss imminent, geofence breach) | Red (reserved exclusively for T1) | Full-width takeover banner + map flash; **single-primary-alert**: only one T1 in focus at a time, next queued | Distinct T1 tone, continuous until acked, ≥65 dBA above ambient per ISO 7731 audibility practice [S33] | Explicit **Acknowledge** (stops audio, alert stays active) + separate **Resolve**; unacked T1 escalates at 60 s (re-audio + backup channel notify) |
| **T2 WARNING** | High-confidence unvalidated detection; degraded telemetry; airspace intruder | Amber | Banner in alert rail + source highlight on map/video (no takeover) | Short 2-chirp tone, repeat ×2 max | Ack required; auto-escalates to T1 if trigger condition persists |
| **T3 ADVISORY** | Low-confidence detection; weather watch; battery service-due | Yellow / blue | Queue entry + subtle badge | None | Optional ack; auto-clears when condition clears |
| **T4 INFO** | Task complete, asset landed, log events | Gray | Log only | None | None |

### Anti-fatigue rules
1. **Rate budget:** target ≤ ~2 operator-interrupting alarms per 10 min per console — the ISA-18.2-derived target quoted in ABB's HMI material [S28]; measure and tune.
2. **Correlation/dedup:** clustered detections (same ignition, multiple sensors) = **one** incident alert, not N alerts; re-alert only on state change (growth, new threat) — mirrors CAD incident (vs call) grouping [S34].
3. **No colored noise:** in high-performance-HMI style, gray/desaturated base screens; bright red/amber reserved for abnormal conditions only [S30][S31][S20].
4. **Ack ≠ resolve; shelve with reason + timer:** shelved alerts auto-unshelve at expiry; shelving requires a reason code (audit + tuning data) — ISA-18.2 shelving concept [S29][S32].
5. **Single-primary-alert principle:** the most severe active alert owns the focal UI; everything else is ranked in the rail (prevents alert storms at decision time) [INF-S28].

### False-alarm quick-validate workflow (one-glance evidence card)
- Card opens in ≤1 s showing: thumbnail + 5-s clip, zoomed EO still, IR toggle, confidence, lat/long + reverse-geocode, detector/version, time, cross-sensor corroboration count, and "similar dismissed within 1 km / 24 h" hint [S17][S18]; layout [INF].
- Actions: **Confirm fire** (creates incident, fires T1/T2 path) · **Dismiss** with reason code (glare, fog/dust, industrial, animal, other) feeding the tuning/ML feedback loop · **Snooze 10 min** (re-check with same sensor).
- Dismissed alerts collapse into a dimmed, retrievable history — never silently vanish (trust + audit [INF-S34]).

### Multi-fire overload behavior
- Priority queue re-sorts by risk score (threat × confidence × staleness); each incident card carries a **freshness clock** ("last video 6 min ago") so stale incidents become visible work [INF-S34].
- Incident switcher preserves per-incident UI state (layers, selected drone) for instant context return; T1 alerts always pull the console into the affected incident [INF].
- Resource-contention strip (drones airborne vs ready per incident) shown beside the queue so IC trade-offs are explicit [INF-S27].

---

## (d) Sources (URLs as returned by search provider; page titles given where the URL is the site root)

**Wildfire size-up / ICS / fire behavior**
1. [S1] NWCG — "Initial Attack Sizeup/Safety" — http://www.nwcg.gov/
2. [S2] LV Interagency — "Initial Attack Fire Size-Up (2023 Update)" — https://www.lvinteragency.org/
3. [S3] Colorado Firecamp — "Wildland Fire Suppression Tactics" (flame-length thresholds in size-up) — https://www.coloradofirecamp.com/
4. [S4] NWCG — "2025 NWCG Incident Response Pocket Guide (IRPG)" — http://www.nwcg.gov/
5. [S5] NWCG — "Fire Lookout" (smoke-report elements: azimuth, distance, volume, color, behavior) — http://www.nwcg.gov/
6. [S6] Oregon State University Extension — "Fire Science core curriculum, Module 3" (fire behavior triangle) — https://extension.oregonstate.edu/
7. [S7] NWCG — "Guide to Fire Behavior Assessment, PMS 437-1" — https://fs-prod-nwcg.s3.us-gov-west-1.amazonaws.com/
8. [S8] Firehouse — "Wildland Fire Behavior: A 'Tune-up' for Structural Firefighters" (IRPG visual factors) — https://www.firehouse.com/

**Drone ops platforms / GCS patterns**
9. [S9] DJI Enterprise — "DJI FlightHub 2 — Fly With Cloud Intelligence" (cloud ops mgmt, live streaming) — https://enterprise.dji.com/
10. [S10] DJI — "Mavic 3 Enterprise Series — Specs" (O3 Enterprise, ~200 ms latency, 1080p live view) — https://www.dji.com/
11. [S11] DJI Enterprise — "Matrice 30 Series" (triple-channel 1080p, 640 thermal w/ isotherms) — https://enterprise.dji.com/
12. [S12] FlytBase Docs — "Fleet Management" (real-time telemetry, status, health metrics) — https://docs.flytbase.com/ ; also "Can I see the status of the devices" (drone card live status) — https://flytbase.com/
13. [S13] FlytBase Releases — "New Feature: Alerts and Notifications" (manned-aircraft proximity alerts) — https://releases.flytbase.com/
14. [S14] FlytBase — "DJI Dock 2 with FlytBase" (autonomous dock ops, fleet mgmt, workflow automation) — https://flytbase.com/
15. [S15] DroneLife — "FlytBase and Iris Automation Partner" (Casia G intruder data displayed in FlytNow dashboard) — https://dronelife.com/
16. [S16] Auterion — "Auterion Suite introduces updates… Mission Control" (task reporting) — https://auterion.com/ ; Unmanned Systems Technology — "Overview of Auterion Suite" — https://www.unmannedsystemstechnology.com/

**AI wildfire detection verification workflow**
17. [S17] Pano AI — "Product" (cloud AI + Pano Intelligence Center analysts confirm incidents) — https://www.pano.ai/
18. [S18] GovTech — "Startup Uses AI, Panoramic Cameras for Wildfire Detection" (analyst verifies flag visually) — https://www.govtech.com/
19. [S19] Xcel Energy Newsroom — "Xcel Energy brings AI-driven wildfire detection to Wisconsin" (human verification → triangulation → notification) — https://newsroom.xcelenergy.com/

**Control rooms / human factors / refresh rates**
20. [S20] Evans — "How to Design and Equip a UAV Ground Control Station" & "Public Safety" consoles (integrated CAD, radio, GIS, multi-monitor) — https://www.evansonline.com/
21. [S21] Dynon — "Understanding ADS-B in SkyView" (position source at 1 Hz) — https://dynon.zendesk.com/
22. [S22] FAA — "ADS-B In Pilot Applications" (traffic position reports to displays) — https://www.faa.gov/
23. [S23] NASA ARC — Hobbs — "Human Factor Challenges of Remotely Piloted Aircraft Introduction" — https://human-factors.arc.nasa.gov/
24. [S24] NASA NTRS — Howe 2017 — "The Leading Human Factors Deficiencies in Unmanned Aircraft Systems" — https://ntrs.nasa.gov/
25. [S25] ASTM — F3264-18b "Standard Specification for Design of UAS Control Stations" (referenced via F3563 page) — https://store.astm.org/
26. [S26] EDS Technologies — "Evaluating UAV ground control station design using human factors standards" — https://edstechnologies.com/
27. [S27] Cummings & Mitchell — "Operator scheduling strategies in supervisory control of multiple UAVs" (MIT/DSpace; also ScienceDirect) — https://dspace.mit.edu/ ; https://www.sciencedirect.com/

**Alarm management / HMI standards**
28. [S28] ABB Library — "How a high performance HMI can lead to greater…" (ISA SP 18.2 target: max ~2 alarms per 10 min per operator) — https://library.e.abb.com/
29. [S29] Rockwell Automation — "Process HMI Style Guide" (alarm management per ANSI/ISA-18.2) — https://literature.rockwellautomation.com/
30. [S30] Idaho National Laboratory (LWRS) — "State Design Philosophy" (ANSI/ISA-101.01 high-performance HMI/alarm systems) — https://lwrs.inl.gov/
31. [S31] MyControlRoom — "Control Room High Performance HMI" (workload, SA, color philosophy) — https://mycontrolroom.com/ ; Huffman Engineering — "High Performance Graphics Lead to Improved Response" — https://huffmaneng.com/
32. [S32] HumanFactors101 — "Effective alarm management for optimal human performance" — https://humanfactors101.com/ ; Hexagon — "Taming the Wild Alarm System, Part 7" — https://aliresources.hexagon.com/
33. [S33] ISO 7731 — "Ergonomics — Danger signals for public and work areas" — https://www.iso.org/ ; van der Hoek-Snieders et al. 2021 (≥65 dBA audibility guidance) — https://www.tandfonline.com/

**Dispatch / CAD / multi-incident**
34. [S34] 10-8 Systems — "What Is a CAD System in Dispatch?" (system of record; call intake → incident → unit assignment → status) — https://10-8systems.com/
35. [S35] Bureau of Justice Assistance — "Law Enforcement Computer Aided Dispatch (CAD) Systems" — https://bja.ojp.gov/ ; Kabatone — multi-agency single-console CAD — https://kabatone.com/
36. [S36] Kuligowski 2021 — "Evacuation decision-making and behavior in wildfires" — https://www.sciencedirect.com/
37. [S37] NIST — "NIST Updates Critical Wildfire Evacuation and Sheltering" — https://www.nist.gov/ ; Maranghides — "WUI Fire Evacuation and Sheltering Considerations" (warning vs order staging) — https://berkeleyfiresafe.org/

**Fire spread modeling / thermal ops / response time**
38. [S38] FRAMES — "FARSITE" fire-growth simulator — https://www.frames.gov/catalog/908
39. [S39] US Forest Service — "FlamMap" (potential fire behavior: spread rate, flame length, intensity) — https://research.fs.usda.gov/firelab/products/dataandtools/flammap
40. [S40] MDPI — Xu 2023 — "Modeling Wildfire Initial Attack Success Rate" — https://www.mdpi.com/ ; ConnectSci — "Assessing the suppression difficulty of wildland fires" (response-time effect on IA success) — https://connectsci.au/
41. [S41] Oklahoma State University Extension — "Using Drones with Infrared Capabilities to Monitor Fire" (hotspot detection eases mop-up) — https://extension.okstate.edu/
42. [S42] Advexure — "Firewatch from Above: How Thermal Drones Aid Wildfire Response" — https://advexure.com/ ; Global Drone HQ — thermal drones for firefighting (perimeter, hotspot, mop-up roles) — https://globaldronehq.com/
43. [S43] UAV Navigation — "Ground Control Station" (no-fly-zone editor in mission planning) — https://www.uavnavigation.com/
44. [S44] Fusion Engineering — "From the Workshop 1: Ground Control Station" (area-designation mission building) — https://fusion.engineering/
45. [S45] Sensenet — "Rapid Response Planning After Early Wildfire Detection" (response chains, IA teams, drones) — https://sensenet.ai/
46. [S46] ConstantTech — "EOCs vs. Dispatch Centers" (CAD + radio + GIS integrated console workspace) — https://constanttech.com/

---

## (e) Uncertainties & caveats

1. **Exact GCS refresh rates are product-specific, not standardized in public docs.** The 1 Hz floor is anchored on ADS-B practice [S21][S22]; the 1–10 Hz envelope for own-ship position is an inference (consumer/enterprise GCS commonly render faster than the data link updates; DJI does not publish telemetry Hz). Video latency ~200 ms is a DJI M3-series spec and will differ over FlytBase cloud relays (cloud hop adds latency — unquantified here).
2. **ISA-18.2 / ISA-101.01 are process-industry standards.** Their transfer to a wildfire console (non-continuous process, event-driven domain) is analogy, not compliance; the ≤2 alarms/10-min budget in particular may be unrealistic during a mass-start (multiple ignitions) day and needs a domain-specific budget.
3. **ICS role mapping is ours:** ICS defines IC + operations etc., but "mission operator" vs "remote pilot" split is a FlytBase/platform abstraction. Whether MO validation authority and RPIC flight authority can sit with one person is a regulatory question (BVLOS waiver / Part 107 constraints) — unresolved.
4. **Flame-length ≥4 ft = "too intense for direct attack"** is a training heuristic from tactics texts [S3], not a hard rule; ICs blend more factors. Presenting it as a decision threshold in UI must not imply certainty.
5. **Near-real-time spread simulation (row 16, P13):** FARSITE/FlamMap are desktop/analyst tools [S38][S39]; running them in <5 min console loops is unproven for this class of hardware — treat as roadmap item, use simple spread-rate cones as the v1 fallback.
6. **Vendor-page bias:** FlytBase, DJI, Pano, Auterion feature descriptions are marketing surfaces; observed capabilities were cross-checked across ≥2 sources where possible, but exact behaviors (e.g., alert-ack semantics in FlytBase) were not verifiable from public pages.
7. **Evacuation decision support:** the literature supports warning-vs-order staging and lead-time components [S36][S37], but no source defines what a drone console specifically owes an IC for evacuation decisions — the zone-status/timing UI is our inference.
8. **Weather refresh 1–5 min:** station networks (RAWS) typically report hourly; 1–5 min console display of wind assumes on-board estimates or dense station interpolation — flagged [INF] in the matrix.
