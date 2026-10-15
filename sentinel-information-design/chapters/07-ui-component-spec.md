# 07 · Information Design Specification — Panels & Components

FlytBase Sentinel mission console · desktop 1920×1080 · operator: Asha (MO) + relief operator + regional commander.
Design language per repo `src/app/tokens.ts`: **cyan = telemetry**, **amber = uncertainty/conflict/attention**, **red = danger (T1 only)**, **teal = done**. Principle: **"One command picture."** Anti-references (PRODUCT.md): no glowing orbs/neon/glass-card walls, no decorative military HUD, **urgency reduces density**. Press-and-hold gates for `GATED_ACTIONS`. [S#] tags preserved from R4/R2; *(repo)* = grounded in repo code/constitution; [INF] = inference.

---

## 1 · Console layout — 12-column grid @ 1920×1080

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP NAVBAR (rows 1–2 · col 1–12, 56 px)  mode/phase · incident · operator ·  │
│                                          UTC clock · comms state             │
├───────────────┬──────────────────────────────────────────┬───────────────────┤
│ LEFT RAIL     │ CENTER: MAP COMMAND SURFACE (col 3–10)   │ RIGHT RAIL        │
│ (col 1–2,     │ P1 COP + layers: zones · spread rings    │ (col 11–12,       │
│ 320 px)       │ 15/30/60 · wind arrow · drone tracks ·   │ 360 px)           │
│ P2 Intel &    │ evac corridors · ingress · geofence      │ Phase-purposed:   │
│  Evidence     │ C3 video wall (EO + thermal PiP) docked  │ Validate→TALON    │
│ P5 Fleet      │ bottom-right of map (collapsible)        │  copilot stream   │
│ P10 Activity  │                                          │ Contain→contain-  │
│  log          │                                          │  ment reasoning   │
│               │                                          │ Flight/degraded→  │
│               │                                          │  exception feed   │
├───────────────┴──────────────────────────────────────────┴───────────────────┤
│ BOTTOM ACTION BAR (row 12, 72 px)  context actions · G1/G2/G3 press-and-hold │
│                                    · mic (TALON voice) · Override (compact)  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Panel slot model** — compatible with repo `domain/panels.ts` slots. Left rail: `intel`, `fleet`, `activity`. Right rail: `talon`, `priority`, `ground-teams`, `exceptions`. Slot visibility is phase- and exception-driven; the right rail shows exactly one primary purpose per phase:

| Phase | Right-rail primary | Right-rail secondary | Left rail | Notes |
|---|---|---|---|---|
| Validate | `talon` (copilot stream: verify question) | `priority` | intel · fleet · activity | Single-question VERIFY screen (90-s arc 15–45 s) |
| Dispatch | `talon` | `priority` · `ground-teams` | intel · fleet · activity | Pre-flight checklist C9 front-and-center |
| Flight | `exceptions` (if any) else `talon` | `priority` | fleet · intel · activity | Fleet grid elevates during transit |
| On-scene | `talon` (size-up push) | `ground-teams` | intel · fleet · activity | Video wall + size-up form active |
| Containment | `talon` (containment reasoning + G2) | `ground-teams` · `priority` | intel · activity | Fleet grid may compress to one row |
| Mop-up | `talon` (debrief) | `priority` | intel · fleet · activity | ICS-209 export C9 |
| Any degraded scene | `exceptions` **takes over** | — | intel (fallback inputs highlighted) | network-degraded / satellite-loss / battery-critical |

---

## 2 · Component inventory

**Conflict resolved:** R4's 14 patterns (P1–P14) and the repo's 8 panel slots are reconciled into one inventory: P1–P12 are console panels/regions (R4 patterns renumbered, in 1920×1080 layout positions), C1–C9 are embedded components or cross-cutting surfaces. Every R4 pattern maps: P4→C1, P5→C2, P12→C6, P13→C5, P6→P6, P7→P7, P8→C4, P9→P8, P10→P9, P11→P11, P14→role-based defaults (§1 table).

| ID | Component | Purpose | Data bound | Refresh | States (nominal / degraded / blocked) | Phase visibility | Time-saving rationale |
|----|-----------|---------|-----------|---------|----------------------------------------|------------------|----------------------|
| **P1** | **Map Command Surface** (COP, 2D SVG; 3D explorer on demand) | Single spatial truth: one command picture for dispatch, deconfliction, evac | Layers: zone polygons (forest-north, buffer-west/east, residential-south); **spread rings 15/30/60-min**; wind arrow (NE 38° · 18 mph); drone tracks; **evacuation corridors** (route-a/b); ingress route; geofence/TFR; anomaly marker; blue-force crews; ADS-B traffic | Position 1–10 Hz (≥1 Hz floor) [S21][S22]; perimeters per orbit; zones on change | Nominal: all layers. Degraded: cached route model, low-bandwidth LiDAR outlines, spatial-uncertainty margin ring ±m. Blocked: map impact declared by exception (e.g., "perimeter stale 6 min") | All | Removes mental map-reading & app-switching; core CAD/EOC pattern [S34][S35][S46][S9] |
| **P2** | **Intel & Evidence panel** (left rail top) | Incident hero metrics + evidence freshness matrix + signal trend | INCIDENT (INC-2024-0847, Grid 4C, 03:47:03 UTC, footprint ~0.4 ha); 9 evidence sources (thermal, satellite-ir, drone-visual, lidar, wind, fuel, terrain, burn-history, structure-road) with status/confidence/lastUpdated/note; thermal→structures→fused-confidence series | Sources on event (eased live during verify); series 1 Hz during convergence window | Nominal: all sources active. Degraded: satellite-ir `failed`/0, staleness amber. Blocked: source `missing` shown grey with fallback note | Validate→Mop-up | Pano-style analyst loop keeps review fast & consistent [S17][S18][S19]; fixed-position instruments prevent scan misses [S24] |
| **P3** | **Tasking queue** (priority queue + incident switcher) | What to work next; N-fire overload | Ranked incidents by risk score (threat × confidence × staleness); freshness clock ("last video 6 min"); resource-contention strip (airborne vs ready); 2 read-only summaries | Recomputed per new frame/event; staleness 1 min | Nominal: 1 active + summaries. Degraded: stale card goes amber. Blocked: contention red | All (center-left overlay or left-rail tab in multi-fire) | CAD ranked-queue pattern [S34][S35]; automation offloads scheduling [S27] |
| **P4** | **Fire-spread projection panel** (map-anchored card) | Anticipatory decisions: attack mode, escalation, evac timing | Spread {baselineRate 0.8 km²/h, projectedResidualRate, direction, uncertaintyMarginMeters}; exposure {structuresInPath 47, atResidualRisk, routeExposure}; ring ages; projection engine confidence | Recompute 5–15 min [INF]; ring timestamps on map | Nominal: model confidence high. Degraded: margin widens ±200 m, age badge amber >5 min. Blocked: "projection stale — cones extrapolated from last orbit" | On-scene→Containment | FARSITE/FlamMap-class trust; runtime <5 min unproven → cones are v1 fallback [S38][S39] |
| **P5** | **Fleet Grid** (left rail) | Which asset is ready; launch decision in one glance | 10-drone roster: id, class (surveillance ×2, thermal-lidar, guidance-relay ×3, evacuation-guidance ×2, multi-role ×2), battery %, signal, status, mission, ETA; dock state; battery cycles | 1 Hz (dock/health 1–10 s source) [S12][S14] | Nominal: green readiness. Degraded: Lidar-02 14 % battery-critical amber→red. Blocked: drone `unavailable` (maintenance/link loss) | All (elevates in Dispatch/Flight) | Launch-readiness in one glance instead of per-device drill [S12][S16] |
| **P6** | **Video wall** (map-docked) + EO/thermal PiP | Evidence and geo-context co-located; sensor work | Live EO 1080p/30 + thermal 640×512/30 with isotherms; AI detection overlay (bounding boxes/confidence); GPS-stamped frame scrubber; PiP mini-map sync | Video 24–30 fps; latency ≤250 ms [S10][S11]; stills on trigger | Nominal: dual-channel. Degraded: HD suspended → single low-bandwidth channel (network-degraded). Blocked: frame-hold + "feed lost — last GPS-stamped still" | On-scene→Mop-up | Standard GCS layout [S20][S9]; triple-channel viable [S11] |
| **P7** | **TALON copilot stream** (right rail, phase-purposed) | One recommendation at a time; conclusions before logistics | Recommendation sentence (Rule of One); evidence chips w/ per-source status; agent task list (6 categories: orchestrator/intelligence/perception/simulation/operations/governance × queued/running/blocked/complete/failed); blocker first; next-action chips (7 prompt chips); voice session | Stream event-driven; agent statuses on change | Nominal: verdict + tasks. Degraded: "blocked — satellite agent failed; fallback engaged" styled amber. Blocked: gateway fallback microcopy (never strands, 8 s timeout) | Validate→Mop-up | Pitching doctrine (consequence before logistics); staged proposals never execute gates [repo]; offloads scheduling [S27] |
| **P8** | **Comms panel** (navbar-anchored flyout) | Radio/VoIP/chat/share without mode-switching | Channels per incident; IC↔pilot↔crew bridge state; live video share URLs (guest links); packet send receipts; call targets (mutual-aid roster) | Connection state 1 Hz; messages event-driven | Nominal: bridge live. Degraded: relay-drone bridging required (RF shadow). Blocked: "comms via cell only — video share disabled" | Dispatch→Mop-up | Integrated radio+CAD+GIS consoles remove mode-switching [S20][S46][S9] |
| **P9** | **Audit receipt stream** (left rail bottom; exportable) | System of record: every alert, action, gate, packet | Actor-tagged entries (AI/TALON/Operator/System) + severity; gate completions w/ hold duration; packet AUD-90-0847 lifecycle; dissent reasons; dismissed-alert history (retrievable, never silently gone) | Event-driven append | Nominal: streaming. Degraded: append queued locally w/ "syncing" badge. Blocked: none (local-first write) | All | CAD-as-system-of-record [S34][S35]; post-incident learning [INF] |
| **P10** | **Activity log** (left rail) | Recent ops timeline at a glance | Latest N audit/exception/system events, actor + severity color | Event-driven | Nominal. Degraded: row highlight. Blocked: n/a | All | Shared timeline prevents "what just happened" queries [INF] |
| **P11** | **Ground-teams / zones panel** (right-rail secondary) | Crew readiness + evac zone status | Team readiness/assignment/ETA/vitals; zone chips (W→GO) w/ per-zone ack; corridor open/blocked; shelters | Crew 0.2–1 Hz; zone status on change | Nominal: all crews staged. Degraded: ETA slip amber. Blocked: crew comms red | Dispatch→Mop-up | Evacuation staging per NIST warning-vs-order [S37][S36] |
| **P12** | **Debrief / ICS-209 export** (modal over console) | Handover + after-action packet | ICS-209-style summary (authority packet AUD-90-0847 in miniature); DebriefTimeline; zero-hotspot patrol checklist; residual-heat heatmap; resource release list | Static snapshot per export | Nominal: packet ready. Degraded: missingData[] listed. Blocked: export requires ≥1 completed patrol cycle | Mop-up (+ handover pending) | Converts session into the format agencies already consume [repo; S34] |
| **C1** | **Evidence / convergence card** (in P2 + TALON verify) | Single-question VERIFY in seconds | Rising confidence bar (thermal 62→78→91 fused); per-source status chips (pending/active/stale/failed/missing); corroboration count; "similar dismissed within 1 km / 24 h" hint; anomaly lat/long + timestamp; G1 gate | Eased live during verify-active; else on event | Nominal: converging cyan bar. Degraded: amber divergence (source-conflict scene). Blocked: red failed source w/ fallback | Validate | Pano verify loop [S17][S18]; card format [INF] |
| **C2** | **Telemetry strip + drone card** (fixed, under map) | Flight monitoring; no scan misses | Position, GS, alt/heading, battery %, link RSSI, GPS sats, wind aloft, geofence proximity, ETA | Render 1 Hz (source 5–10 Hz broadcast) | Nominal cyan. Degraded amber (RSSI fall). Blocked: link-loss failsafe banner (RTH countdown) | Dispatch→Mop-up | Fixed-position instruments = documented GCS HF fix [S24][S12] |
| **C3** | **Gate control cluster** (bottom bar, right) | The three human gates, always same place | Per-gate unlock checklist (data-ready state from matrix §2); 2-s radial hold ring; completion receipt | Checklist on change | Nominal: ready (ring cyan). Degraded: locked-but-explainable (amber checklist item). Blocked: locked w/ reason | Validate (G1), On-scene→Containment (G2), Containment/Rescue (G3) | Deliberate friction on irreversible actions [repo Class-3; INF] |
| **C4** | **Airspace & geofence layer controls** (map overlay + editor) | Deconfliction; live geofence push | TFR/LAANC status; ADS-B intruders w/ threat banners; DAA overlay; geofence editor; manned-aircraft intents | Traffic ~1 Hz [S21][S22]; TFR on change | Nominal. Degraded: ADS-B stale >10 s flagged. Blocked: "geofence push failed — aircraft out of link" | Dispatch→Containment | Prevents intrusions instead of reacting [S43][S15][S13] |
| **C5** | **Perimeter diff view** (map mode) | Is the line holding? | Orbit-over-orbit perimeter diff; time slider; growth areas flagged red; area/ROS stats chip | Per orbit (1–5 min active recon) | Nominal: teal contained-diff. Degraded: amber growth <threshold. Blocked: "no orbit in 6 min" red | Containment→Mop-up | Direct answer to the IC's recurring question [INF-S7] |
| **C6** | **Size-up form** (structured, IRPG-aligned) | Knowledge → the format ICs are trained on | Auto-filled fields from AI+video+RAWS: location, size, ROS, fuel, slope/aspect, weather, smoke color/volume/behavior, values-at-risk, access/egress, hazards, resources-on-scene | Fields live-update during first orbit | Nominal: ≥90 % fields auto-filled. Degraded: missing fields amber. Blocked: manual entry required | On-scene | Checklist prevents omission under stress [S1][S2][S4] |
| **C7** | **Hotspot list** (mop-up card over map) | Hotspot handoff to crews | Isotherm imagery; hotspot lat/long + peak temp; delta vs background; jump-to-video; KML/CSV export | Per patrol task | Nominal: list w/ teal cleared marks. Degraded: persistent heat amber across N patrols. Blocked: sensor `failed` | Mop-up | IR hot-spot detection eases mop-up [S41][S11] |
| **C8** | **Weather strip (RAWS)** (navbar-adjacent) | Go/no-go + fire-behavior context | Wind (dir · kts), gusts, RH, temp, Haines; dock-site wind vs 8 m/s landing limit; spot-forecast CTA | Display 1–5 min pull; RAWS obs hourly; on-demand spot forecast [S7] | Nominal cyan. Degraded: obs stale >30 min amber. Blocked: "no station — using drone-estimates" | All | Dock weather gates are hard limits [S8][S9] |
| **C9** | **Pre-flight checklist + mission preview** (Dispatch card) | Approve autonomous launch | Waypoint route preview; geofence sanity; TFR/LAANC; battery & link preflight pass/fail rows; weather minima vs limits; single LAUNCH hold-to-confirm | Point-in-time; re-check on abort | Nominal: all-pass. Degraded: warn row amber w/ override. Blocked: fail row red (no launch) | Dispatch | Automated dock workflow with human seal [S14][INF] |

---

## 3 · Alerting hierarchy

Per R4 §c (ANSI/ISA-18.2 / ISA-101.01 analogy, ISO 7731 audibility) + repo exception model.

| Tier | Meaning (triggers) | Color | Visual | Audio | Ack / snooze | Fatigue mitigations |
|------|--------------------|-------|--------|-------|--------------|---------------------|
| **T1 CRITICAL** | Validated fire threatening people/critical assets; flight-critical failure (imminent link loss, geofence breach) | **Red** — reserved exclusively for T1 | Full-width takeover banner + map flash; **single-primary-alert**: only one T1 in focus, next queued | Distinct T1 tone, continuous until acked, ≥65 dBA above ambient [S33] | **Acknowledge** (stops audio, alert stays active) + separate **Resolve**; unacked escalates at 60 s (re-audio + backup channel) | Rate budget ≤2 interrupting alarms/10 min/console [S28]; correlation: clustered detections = ONE incident alert [S34]; red never used decoratively [S30][S31] |
| **T2 WARNING** | High-confidence unvalidated detection; degraded telemetry; airspace intruder; exception declared (satellite loss, network-degraded, battery-critical) | Amber | Banner in alert rail + source highlight on map/video (no takeover) | Short 2-chirp, repeat ×2 max | Ack required; auto-escalates to T1 if trigger persists | Re-alert only on state change (growth, new threat); shelve with reason code + timer, auto-unshelve [S29][S32] |
| **T3 ADVISORY** | Low-confidence detection; weather watch; battery service-due; projection age >5 min | Yellow/blue | Queue entry + subtle badge | None | Optional ack; auto-clears when condition clears | No colored noise: grey/desaturated base [S30] |
| **T4 INFO** | Task complete, asset landed, log events | Grey | Log only (P9/P10) | None | None | — |

**Multi-fire overload:** priority queue re-sorts by risk score; each incident card carries freshness clock; incident switcher preserves per-incident UI state; T1 always pulls the console into the affected incident; resource-contention strip beside queue [S27][S34][INF].
**False-alarm quick-validate:** evidence card opens ≤1 s; actions Confirm / Dismiss w/ reason code (feeds ML tuning loop) / Snooze 10 min; dismissed alerts collapse into dimmed retrievable history [S17][S18][INF-S34].

---

## 4 · Refresh-rate budget (consolidated R2/R4)

| Stream | Console target | Source reality (R2) | Anchor |
|---|---|---|---|
| Own/asset map position | 1–10 Hz render, ≥1 Hz floor | Platform telemetry broadcast 5–10 Hz (DJI OSDK up to 50 Hz GPS) | ADS-B ≈1 Hz [S21][S22]; bounds [INF]; DJI [S33] |
| Video (EO/thermal) | 24–30 fps @1080p; latency ≤250 ms | 30 fps; O3E ~200 ms glass-to-glass; cloud hop adds latency | [S10][S11][S26] |
| Telemetry strip (battery, link, GPS) | 1 Hz render | Source 5–10 Hz | [S12][INF-S12] |
| Traffic / DAA | ~1 Hz, alert-driven overlays | ADS-B position ≈1 Hz | [S21][S15][S13] |
| Weather (RAWS strip) | 1–5 min display + on-demand spot forecast | Station obs typically hourly | [S7]; [INF] |
| Evidence confidences / convergence series | Eased live during 90-s window; on event otherwise | Authored per scene (fixtures) | repo *(mock)* → live [INF] |
| Fire perimeter / heat map | Per task / per orbit (1–5 min active recon) | Frame collection per orbit | [INF] |
| Spread projection | 5–15 min recompute; age badge; invalidate >5 min for gate G2 | Simulation agent runtime unproven <5 min | [S38][S39]; [INF] |
| Fleet/dock health | 1 Hz console; source 1–10 s | DJI Cloud API / FDM heartbeats | [S12][S14] |
| Crew / blue-force | 0.2–1 Hz | Crew GPS pings | [INF] |
| Alerts | Event-driven push, never polled | — | [INF-S13] |
| Bandwidth context | Scout sustained 5–8 Mbps (H.264) / 3–5 (H.265); incident aggregate 15–35 Mbps; plan dock ≥25 Mbps uplink | R2 §d | [est] per R2 |

---

## 5 · Urgency-density rule (what sheds at each phase)

Repo principle: **urgency reduces density** — under time pressure the console removes, never adds. Shed order (each phase keeps what its decisions need, sheds the rest):

| Phase | Density | Keeps visible | Sheds / dims |
|---|---|---|---|
| Validate | Medium-low | C1 evidence card (focus), P1 with anomaly + nearest-asset ring, TALON single question, G1 | Activity log collapsed; fleet grid compact; 3D explorer hidden; queue summaries dimmed |
| Dispatch | Medium | C9 checklist, P5 fleet readiness, P8 comms, packet card | Intel zone narratives collapsed; hotspot tools hidden; video wall closed until launch |
| Flight | Medium | C2 telemetry strip, P5, map w/ route + traffic, T2 banners | Evidence matrix dims; size-up form hidden; debrief hidden |
| On-scene | High workload → medium density | P6 video wall, C6 size-up, P1 spread rings, TALON size-up stream | Activity log collapsed; queue summaries collapsed; 3D explorer hidden; non-incident layers dimmed |
| Containment | **Lowest density** (decision phase) | Containment reasoning card + G2, spread rings w/ uncertainty margin, corridor status, ghost placements | Everything else steps back: rails compress, chips replace charts, only exception rows remain in right rail |
| Rescue / degraded | Exception-only | Exception feed: affected sources, blocked commands, fallback inputs, confidence impact, recovery command | All non-exception panels dim; HD video suspended by rule (network-degraded); one primary alert at a time |
| Mop-up | Medium | C7 hotspot list, patrol scheduler, P12 debrief | Spread cones fade to residual-heat heatmap; gates hidden except none |

Shedding is automatic by phase, overridable by the operator; anything shed remains one click away (never a dead end).

---

## 6 · Keyboard + press-and-hold semantics

**Press-and-hold gates (Class-3, repo constitution):**
- Hold = **2.0 s continuous**; radial ring fills (cyan→amber at 50 %→teal at 100 %). Release before 100 % = cancel, no partial execution, no audit noise beyond a dimmed "hold cancelled" log row.
- Completion fires exactly once → P9 receipt (actor=Operator, hold duration, snapshot hash of the data shown at unlock).
- Gate unlocking requires the checklist in matrix §2; a locked gate shows the missing item in amber, never a silent disabled button.
- G2/G3 while a T1 is in focus: the takeover banner steps down one density level so the ring and its data are visible.
- Override (compact control, bottom bar): overrides a TALON recommendation → **DissentGate** requires a reason (OVERRIDE_REASONS); captured to P9; dissent never silent.

**Keyboard (one-hand-reachable, no chords for critical keys):**
- `V` open/next evidence card · `C` confirm (arms G1) · `X` dismiss w/ reason dialog · `S` snooze 10 min
- `1–9` jump to incident in queue · `F` focus fleet grid · `M` cycle map layers (zones→rings→traffic→corridors) · `T` thermal/EO toggle on focused feed · `Space` play/pause focused video · `[` `]` frame-scrub
- `Tab` cycle rails (intel→fleet→activity→talon→priority→ground-teams→exceptions) matching repo slot order · `\` toggle video wall
- `G` then `1/2/3` arms the corresponding gate (hold still required with mouse/spacebar — keyboard alone never completes a Class-3 gate)
- `O` override w/ dissent dialog · `E` open exception feed · `D` debrief export · `?` cheat-sheet overlay
- `Esc` closes topmost surface but **never** cancels an in-progress hold mid-ring and never dismisses an unacked T1.

**Mic (bottom bar):** push-to-talk TALON voice session; transcript renders into P7 stream; voice can *propose* but never *complete* a gate (mirror of the tool layer: no tool exists for gated execution).

---

*Cross-references: decision data per row → `03-operator-decision-matrix.md`; annotated console visual → `console-wireframe.html`.*
