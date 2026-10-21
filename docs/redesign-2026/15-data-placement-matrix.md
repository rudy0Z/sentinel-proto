# Data Placement Matrix — every datum, its region, its rule

> **Status:** canonical — build contract (2026-10-14). Implements `sentinel-core/07-panels-charter.md` (L1–L5 / R1–R6, five regions) + `docs/redesign-2026/01-data-map.md` (G1–G9) + FireTrace-derived adds (F1–F4). Authority: `sentinel-core` › vault 00–09 › this doc › `14-final-layout-spec.md` (its orb-removal and 84px Hand are **superseded by core 06** — the deck keeps the TALON bay; only §3 card grammar + FLIR PiP + FireTrace ports from that doc survive here).
> **Reading law:** one row = one datum group. `[NEXT]` = real-but-unbuilt (charter/data-map marked). Status column is tonight's build scope marker.

---

## 1. The five regions (locked by core 07 §2)

| Region | Question | Where |
|---|---|---|
| NOW / airspace | What needs me this second? | Top band, one arbitrated T1/T2, else empty |
| WHERE / map | Where is it, where is it going? | Full-bleed center hero |
| ACT / deck | What do I do right now? | Bottom 88px (core 06; corrected 2026-10-21 — the built `DECK_HEIGHT` is 88px, not the 96px core 06 originally specified) |
| WHAT / left spine | What is the ground truth? | Left, bottom-anchored tabs, grows up |
| SO-WHAT / right | What does it mean, what does TALON think? | Right console, collapsible |

## 2. THE MATRIX

| # | Datum group (source) | Region / panel | Fields | Visibility rule | TALON clause | Status |
|---|---|---|---|---|---|---|
| 1 | **Incident identity** (G2) | Deck truth cluster | `INC-0847 · phase · T+clock · UTC · LIVE-SIM · receipts dot` | always | READS | live |
| 2 | **Evidence ×9 kinds** (G3) | Left L1 + console chips | status, confidence %, age, note | Intelligence primary; collapsed lip otherwise | ANNOTATE weight/provenance | live |
| 3 | **Fusion/convergence** (G4) | Right R1 (top of console) | fused %, thermal/structures/confidence series, 90s window | always top | the card cannot disagree with the orb (one source) | live |
| 4 | **Selected-entity inspector** (G2/G5) | Left L1 | zone/drone/team/anomaly cards, evidence-at-view | on map selection | READS + ANNOTATE | live |
| 5 | **Fleet state** (G5) | Left L2 | 10 drones, 5 clusters, BAT/SIG, mission, ETA | Operations primary; Intelligence 1-row | COMPUTES clusters, PROPOSES dispatch | live |
| 6 | **Activity ledger** (G7) | Left L3 | actor/type/text/severity/ts, receipts inline | collapsed strip; expands for debrief | WRITES only | live |
| 7 | **Priorities/tasking** (ch03 matrix) | Right R3 | risk-scored queue, staleness clocks, contention marks | Operations primary | PROPOSES ranking; operator re-sorts; raises logged | live |
| 8 | **Teams & zones/evac** (G5) | Right R4 | readiness, vitals, assignment, GO/WATCH/CLEAR chips | rescue primary | computes time-to-impact, drafts, operator owns GO | GO chips `[NEXT]` |
| 9 | **Exceptions** (G7) | Right R5 | affected sources/agents, blocked commands, fallback, recovery, spatial uncertainty | takes over rail when degraded | declares own degraded state | live |
| 10 | **Projection/plan** (G4) | Right R6 + map rings | strategy × route, uncertainty cone, **age badge** | contain phase | `recompute_plan` lives here | live; age badge `[NEXT]` |
| 11 | **TALON reasoning** (G6) | Right R2 console | thread, tool trace ×11, provenance chips, chips, intents, refusals | always | this panel IS TALON | live |
| 12 | **Gates & holds** (G7) | Deck command slots | C3 hold ring, C2 tiles, keybinds G1–G4, expiry rings | staged only | PROPOSES; NEVER fires | live |
| 13 | **Authority packet** (G7) | Deck CTA + modal | grade, agency, evidence summary, missing data, dissent note | authority scene | DRAFTS only — operator sends | live |
| 14 | **Debrief/ICS-209** (G7/G8) | Debrief modal + replay | ledger, receipts, scenario KPIs, timeline scrub | end/handover | WRITES | modal live; replay `[NEXT]` |
| 15 | **Weather/environment** (G4) | Left L4 strip + console citation | wind bearing/speed/gusts, temp, RH, fuel model, Haines | Intelligence + contain | READS into every recompute; cites in rationale | `[NEXT]` real data |
| 16 | **Video/FLIR feed** (G5 + F2) | Map-attached PiP (not a rail) | EO / IR-Ironbow / IR-White-hot · ALT/GS/HDG/BAT/LNK · HOT detections | verify + on selection; ≤34% of map, never over deck | READS; MAY request gimbal preset | `[NEXT]` **build tonight** |
| 17 | **NWCG fire behavior** (F1) | Deck truth strip lip + Right R6 | ROS ch/hr · ERC · fine fuel moisture · flame length · Haines | Intelligence + contain | READS; cites in pitch | `[NEXT]` **build tonight** |
| 18 | **Terrain probe** (F3) | Map hover pill | elevation · slope · aspect · fuel · DMS coords · burn age (debrief) | always on hover | ANNOTATE burn-state | `[NEXT]` |
| 19 | **Progression isochrones** (F4) | Map layer + debrief replay | time-stamped perimeter bands + head-fire chevrons | live layer (subtle) + full in debrief | READS; cites in size-up | `[NEXT]` map layer |
| 20 | **Geofence/TFR + ADS-B** (charter) | Map layer | striped violet boundary, traffic dots | contain+ | READS | `[NEXT]` deferred |
| 21 | **Comms** (G-09) | — | — | — | — | **cut** — not scoped |

## 3. Console card grammar (from `14` §3, survives — applies inside R2)

One turn = one card: eyebrow · one hero · evidence chips · **one numbered action** (`1–3`, `(Recommended)` inline, keycap-typed) · class chip C2/C3. Card height = status; resolved/expired collapses to a receipt line. Voice = one clause out, never narrates the card. While listening, thread condenses to a pill (One's collapsed-voice mode). Sticky mirror: staged action renders identically at deck and console from `deriveTalonSurface()`.

## 4. Cuts and deferrals (say before asked)

Comms (G-09) **cut** · ADS-B/geofence + video-wall-as-panel `[NEXT]`/deferred (FLIR PiP replaces the video wall — video is a map-attached surface, never a rail) · multi-incident stays read-only queue · fixed-wing suppression fleet (FireTrace's VLAT/C-130) **cut** — scope. Debrief replay is where forensic affordances (isochrones, burn scar, scrub) live — never in the live shell.

## 5. Tonight's build order (wire → data → signature → gates)

**Step 1 — Baseline + wire the v3 rails (the actual "finish").** Run `npm run verify:design`; then wire `components/rails/` + `domain/railSystem.ts` into `SentinelShell` per `HANDOFF-2026-10-07.md` §3.2 — shell still renders v2 chrome. Keep `?layout=v2` as the flag name; capture before/after. *Gate: typecheck + tokens + map after wiring.*

**Step 2 — Drone telemetry fields** (charter §7 `[NEXT]`): add `altitudeM, groundSpeedMps, headingDeg, lat, lon` to `DroneRosterEntry` + scenario engine beat fields; render marker chip → fleet row → detail → strip per the charter's field table. *Gate: signals + flows.*

**Step 3 — NWCG strip (F1).** ROS/ERC/fuel moisture/flame length from scenario rows into deck truth lip + R6. Scenario DB rows already carry fuel model/temp/RH/wind — derive honestly, no invented numbers. *Gate: tokens + signals.*

**Step 4 — FLIR PiP (F2 + row 16).** Map-attached overlay, EO/IR segment, telemetry strip, HOT detections from the verify feed; replaces the modal verify feed (kills the old z-stack collision). ≤34% map, never over deck. *Gate: flows (verify-active capture) + routes.*

**Step 5 — Card grammar inside R2.** Numbered options, `(Recommended)` inline, card-collapse-to-receipt, listening-collapse mode. *Gate: flows mirror check.*

**Step 6 — GO/WATCH/CLEAR chips + weather strip (rows 8/15).** If time holds; otherwise first thing tomorrow.

**Not tonight:** terrain drape (Step 2 of the FireTrace ports — needs the ortho decision), debrief replay, visual-direction concept screens. They're next session's spine.

**Every step ends with `npm run verify:design`; browser gates (`verify:flows`, `verify:routes` against `:4190`) after steps 1 and 4.** Kill-test stays: `verify-active → rescue-battery-critical` ≤30s, hold completes, spine position kept, raise logged.
