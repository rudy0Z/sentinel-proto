# 10 · Research Appendix — Raw Research Index & Sources

> This appendix indexes the raw research files behind chapters 01–09. All web figures trace to these
> files; repo-derived claims trace to the repo audit. Read these before amending any chapter.

## 10.1 Source files

| File | Role | Size | Key sections |
|---|---|---|---|
| `.cluster/sentinel-info-design/research/r1-traditional-workflow.md` | Traditional wildfire detection→response workflow, 48-min allocation, compression map | 16.7 KB | (a) flow table L10 · (b) 48-min allocation L31 · (c) compression map L49 · (d) sources L62 · (e) uncertainties L94 |
| `.cluster/sentinel-info-design/research/r2-drone-fleet.md` | Drone classes, sensor payloads, per-class data feeds, bandwidth, dock/handover | 16.6 KB | (a) class table L8 · (b) data feeds L24 · (c) dock/handover L50 · (d) uplink budget L62 · (e) sources L78 · (f) uncertainties L128 |
| `.cluster/sentinel-info-design/research/r3-data-feeds.md` | External data sources (satellite/IoT/weather/GIS) + AI pipelines (inputs/outputs/failure modes) | 10.3 KB | (a) external sources · (b) AI pipelines · (c) fusion notes · (d) sources · (e) uncertainties · 18 sources · key finding: camera-AI false-positive rate 79% post-dedup (SmokeyNet) ⇒ fusion mandatory |
| `.cluster/sentinel-info-design/research/r4-operator-ux.md` | Role→decision matrix draft (28 rows), console pattern catalogue, alert hierarchy | 30.1 KB | (a) decision matrix L9 · (b) patterns L58 · (c) alert hierarchy L79 · (d) sources L111 · (e) caveats L175 |
| `.cluster/sentinel-info-design/repo-audit.md` | Read-only audit of the FlytBase Sentinel repo: TALON data flow, state machine, UI inventory | 14.0 KB | §2 problem statement · §3 TALON inputs/tools/transitions/exceptions · §4 UI inventory · §5 in-repo domain sources |

## 10.2 Repo evidence quick-reference (from repo-audit.md, all paths relative to repo root)

| Claim | Where verified |
|---|---|
| 48-min → 90-s thesis + 90-second handoff arc (0–15/15–45/45–75/75–90 s) | `src/imports/FlytBase_Sentinel_Project_Brief_Con.txt` §1, §4 |
| Gated operator actions (confirm-incident, notify-authorities, authorize-containment, emergency-evacuate) | `src/app/domain/talon.ts` L44 `GATED_ACTIONS` |
| 9 evidence source kinds + 5 statuses (pending/active/stale/failed/missing) | `src/app/tokens.ts` L409–425 |
| TALON tool surface (2 read, 3 proposal tools; forbidden-by-construction actions) | `server/talonTools.ts` header + declarations |
| LLM gateway: gemini-1.5-flash default, 8 s timeout, authored-microcopy fallback | `server/talonGateway.ts` |
| 31 state-machine transitions w/ guards, gates, dissent capture | `src/app/domain/stateMachine.ts` (verify:machine gate green) |
| 5 failure scenes w/ fallbackInputs/blockedCommands/spatialUncertainty | `src/app/domain/exceptions.ts` |
| 16 canonical scenes (+4 promoted) | `src/app/mockData.ts` `REVIEW_SCENES` |
| 10-drone roster, 5 drone classes, 9 mission types | `src/app/mockData.ts` L324–469 |
| Incident fixture: 03:47:03 detection, 78% confidence, 47 structures, NE 38°/18 mph | `src/app/mockData.ts` `INCIDENT` |
| Panel slot model (intel/fleet/activity · talon/priority/ground-teams/exceptions) | `src/app/domain/panels.ts` |
| Verification gates green (19 flows, 23 routes, 9 map checks, machine, signals) | `docs/sentinel-foundation-audit-2026-09-14.md` §1 |
| Domain grounding: NWCG PMS 461/484, ICS-201/204/209, Rothermel, FBFM40, GOES-R, VIIRS, RAWS, MAVLink | `docs/sentinel-v2-master-plan/01-FIRE-SCIENCE-AND-REAL-WORLD-GROUNDING.md` |
| TALON constitution: 3-tier HITL, Rule-of-One pitching, anti-nagging, backend topology (5 Hz WS) | `docs/sentinel-v2-master-plan/04-TALON-AI-AGENT-CONSTITUTION.md` |

## 10.3 Research methodology & honesty rules applied package-wide

1. KPI anchor (48 min → 90 s) is treated as a given challenge-brief constraint, not a measured figure (per `PRODUCT.md`).
2. Every web-sourced number carries a source tag `[S#]` resolving to the source lists in R1–R4; estimates are marked `[est]`, inferences `[INF]`.
3. The 48-minute end-to-end decomposition is a **constructed allocation** calibrated to the anchor — no public dataset decomposes it end-to-end for wildland response (R1 uncertainty note). NFPA 1710 figures are urban floors, not wildland measurements.
4. Counterweight finding retained: reporting-delay reduction alone yields ≈0.25% suppression-cost savings (R1, Huang 2024) — Sentinel's claim targets time-to-defensible-decision, not total suppression cost.
5. Repo claims are tagged `[repo]` and were verified by direct file inspection; where the repo models something (e.g., failure scenes) vs where research adds a new requirement, chapters mark the difference.

## 10.4 Cross-source conflicts & resolutions (writer-reported)

| Topic | Sources disagreed | Resolution |
|---|---|---|
| Satellite hotspot latency | R1: VIIRS ~3¼ h to availability vs best-case ≤90 min orbit+process | Both stated with ranges; timeline map uses "minutes-to-hours, pass-dependent" |
| Crew turnout/travel compressibility | R1: not compressible by AI vs brief's 90-s end-to-end framing | Kept: 90-s target scopes detection→validated tasking decision; physical travel excluded |
| Dock launch time | R2: 45 s airborne (Dock 2) vs brief's 15 s auto-launch at threshold | Brief number kept as product behavior; 45 s documented as current-hardware reality in fleet spec |
| Multi-fire operations | Repo queue: read-only summaries vs R4: full triage queue pattern | Gap analysis flags multi-fire as known repo limitation; UI spec includes queue component as new-spec |
