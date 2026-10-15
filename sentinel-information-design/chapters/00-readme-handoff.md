# 00 · Sentinel Information-Design Research Package — Read Me & Handoff

> Document control — **Date:** 2026-09-22 · **Revision:** A · **Status:** chapter set complete, pre-review (V1/V2 pending) · **Sources:** verified per chapter; raw index in `10-research-appendix.md`.
> Scope: FlytBase Sentinel — AI wildfire command interface; TALON AI engine; scripted portfolio prototype (React 18 + Vite + TypeScript, deterministic fixtures, no live feeds).

## 0.1 Purpose

FlytBase Sentinel's thesis is that wildfire first-response is not a hardware problem but a **cognitive-friction** problem: the traditional detection-to-response chain runs ≈48 minutes (challenge-brief anchor), dominated by slow verification, verbal dispatch, and travel-blind size-up, while the 90-second design target compresses detection→validated alert→tasking decision into a single continuous operator arc (0–15 s fuse, 15–45 s VERIFY, 45–75 s CONTAIN, 75–90 s RESCUE). This package is the **information-design research** behind that redesign: what data exists and when it arrives (01), what TALON consumes and may propose (02), what the operator must decide and under what authority (03), what the fleet physically provides and at what bandwidth (04), where the 48 minutes actually goes (05), where the current repo UI falls short (06), the component-level interface specification (07), how every UI element traces to the 90-second KPI (08), how the interface behaves when things fail (09), and the raw research index (10). It is a research-and-spec deliverable — no production code changes were made.

## 0.2 Package organization

| Chapter | File | One-line description |
|---|---|---|
| 00 | `00-README-handoff.md` | This handoff: purpose, organization, assumptions, traceability guide, next steps, glossary |
| 01 | `01-mission-timeline-data-map.md` | Mission timeline → data map: what information exists at each second of the 90-s arc |
| 02 | `02-talon-data-inventory.md` | TALON data-consumption inventory: 9 evidence kinds, agent tasks, tool surface, gates |
| 03 | `03-operator-decision-matrix.md` | Operator decision matrix: decisions × authority × data × UI surface |
| 04 | `04-drone-fleet-spec.md` | Drone fleet & sensor payload spec: 7 classes, per-class feeds, bandwidth, dock ops |
| 05 | `05-traditional-workflow-benchmark.md` | Traditional workflow benchmark: where the 48 minutes goes, compression map |
| 06 | `06-gap-analysis.md` | Gap analysis: current repo UI vs required information design |
| 07 | `07-ui-component-spec.md` | UI component specification: panel/component spec with wireframe |
| 08 | `08-kpi-traceability.md` | KPI traceability: every component row → the 90-second target |
| 09 | `09-risk-register-exception-paths.md` | Risk register & exception-path playbook: 14 risks, 6 playbooks, rollback table |
| 10 | `10-research-appendix.md` | Raw research index (R1–R4) & sources — the citation backbone for chapters 01–09 |

Raw research inputs live under `research/` (`r1-traditional-workflow.md`, `r2-drone-fleet.md`, `r3-data-feeds.md`, `r4-operator-ux.md`); the repo audit is `repo-audit.md`.

## 0.3 KPI anchor & honesty note

- **KPI anchor: 48 min → 90 s.** Both figures come from the **challenge brief** (`src/imports/FlytBase_Sentinel_Project_Brief_Con.txt`; PRODUCT.md states plainly: "the 48-minute baseline and 90-second target come from the challenge brief, not a field study") [repo].
- No public dataset decomposes an end-to-end wildland 48-min figure; the segment allocation in chapter 05 is a **constructed allocation** calibrated to the anchor, with NFPA 1710 urban floors used as anchors (they are structural-fire benchmarks, not wildland measurements) [R1].
- The 90-s target scopes **detection → validated alert → tasking decision** — not water-on-fire. Crew travel is not compressible by information systems [R1]. Sentinel moves *information*, not apparatus.
- Counterweight retained: reporting-delay improvements alone yield ≈0.25 % suppression-cost savings [R1 · Huang 2024] — the honest claim is **time-to-defensible-decision**, biggest on the fast-growing-ignition tail, not the median fire.
- All chapters mark estimates `[est]`, inferences `[INF]`, and source tags `[S#]`/`[repo]` per the methodology rules in `10-research-appendix.md` §10.3.

## 0.4 Key assumptions

From repo PRODUCT.md [repo]:
1. **Scripted prototype**: deterministic in-repo fixtures across 16 canonical scenes (+4 promoted states); no live drone feeds, no production AI.
2. Operator persona "Asha" is the decision authority; relief operator + regional commander exist for handover/escalation.
3. All evidence streams are authored fixtures; update rates are scene-keyed, not live.

From the research assumptions (per goal brief):
4. **Drone-in-a-box fleet of DJI Dock class** (DJI M3DT-class dock scouts, ≤10 km multi-dock spacing; duty-cycle and launch figures from R2, mostly `[est]`).
5. **North American wildfire doctrine** context: NWCG size-up, ICS-201/204/209, CAL FIRE initial attack, RAWS weather, GOES-R/VIIRS satellite feeds [repo §5 + R1].
6. English deliverables; design research only — no production code changes (plan.md).

## 0.5 How to read the traceability

The package is built to be walked in one direction:

```
03 decisions  →  07 components  →  08 KPI rows
(every operator decision maps to a component; every component row maps to a KPI moment in the 90-s arc)
```

- **Chapter 03** defines each operator decision (authority tier, data required, timing window).
- **Chapter 07** specifies the UI component that carries each decision (panel slot, data fields, states) — panel slots follow the repo's layout engine (`src/app/domain/panels.ts`) [repo].
- **Chapter 08** traces each component row to the KPI: which seconds of the 0–15/15–45/45–75/75–90 arc it serves, and which 48-min traditional segment it compresses (from chapter 05).
- **Chapter 09** is the failure-side mirror of the same chain: every risk row names its phase (F/V/C/R/OPS), its early UI indicator, and its interface mitigation.
- Every claim is traceable backward: chapter figure → `[repo]` tag (→ `repo-audit.md` §/path) or `[R1]–[R4]` tag (→ `research/*.md` → `10-research-appendix.md` §10.1).

## 0.6 Build-team next steps

1. **Validate press-and-hold timing with real operators.** The Class-3 two-second hold and staged-action expiry-to-watch are designed, not tested. Run timed scenario sessions with wildfire-literate operators (target: gate actions reliably completable inside their arc windows; measure dissent-capture friction). [repo · constitution; ch. 03/07/09]
2. **Multi-incident design spike.** The repo's incident queue is read-only summaries — a known gap (09 §9.2 R-06). Spike the triage-queue + active-incident-switch + fleet-deconfliction design from 09 §9.3 P-5 before any multi-fire build work.
3. **Live-feed integration plan.** Prototype fixtures → live streams: evidence-source status model (pending/active/stale/failed/missing) and `spatialUncertainty` fields already exist [repo]; plan the real-data mapping for MAVLink telemetry, radiometric thermal stills, dock status, and the 5–8 Mbps-class video budget (bandwidth tables in ch. 04; degradation playbook in ch. 09 P-1/P-3). Include the gateway microcopy fallback as the contract for LLM-outage behavior (verified in-repo: 8 s timeout → authored microcopy) [repo].
4. (Supporting) Time-box the promoted-state wiring verification (`handoff-pending`, `verify-source-conflict`, `rescue-partial-evac`, `contain-awaiting-teams`) flagged in repo-audit open questions and 09 §9.5.

## 0.7 Glossary

| Term | Definition |
|---|---|
| **TALON** | Sentinel's AI engine: fuses 9 evidence kinds, proposes (never executes) transitions/plans/packets; 3-tier HITL constitution (Class 1 autonomous synthesis / Class 2 staged-with-expiry / Class 3 two-second operator hold, TALON forbidden) |
| **MO / IC / RPIC** | Mission Operator (console role, Sentinel persona "Asha") / Incident Commander (on-scene authority, assumes command at size-up per NWCG) / Remote Pilot in Command (legally responsible flight operator — the role handoff transfers in dock ops) |
| **ICS-209** | Incident Status Summary — the US wildfire situation report form; Sentinel's authority packet (AUD-90-0847) is an "ICS-209 in miniature", and the post-mission debrief modal is ICS-209-style |
| **RAWS** | Remote Automated Weather Station — ground weather network (20-ft wind, RH, Haines index) feeding the wind/fuel evidence sources |
| **ROS** | Rate of Spread — fire propagation speed (Rothermel surface-fire model grounds Sentinel's 15/30/60-min spread rings and 0.8 km²/hr fixture) |
| **BVLOS** | Beyond Visual Line of Sight — regulatory class enabling dock-based remote operations; regional rules differ (FCC/FAA context in R2) |
| **RPIC** | Remote Pilot in Command (see MO/IC/RPIC above) |
| **Dock** | Automated drone hangar (DJI Dock 2/3 class): 45 s-class launch readiness, ~32 min 20→90 % recharge, robotic hot-swap variants ~2 min; houses and launches the fleet uncrewed |
| **FUI** | Flight User Interface — the drone/fleet operations UI layer (Mission FUI preset 16, Territory Studio, is the package's visual-language reference) |

## 0.8 Document control

| Field | Value |
|---|---|
| Date | 2026-09-22 |
| Revision | A |
| Deliverable type | Information-design research + specification (documents only; no production code changes) |
| Chapter status | 00–01, 05, 09, 10 written this round; 02/03/04/06/07/08 dispatched/completed per plan.md round 2 |
| Sources verified per chapter | Yes — repo claims by direct read-only file inspection (`repo-audit.md`); web figures tagged `[S#]` to `research/r1…r4`; unresolved conflicts logged in `10-research-appendix.md` §10.4 |
| Known gaps | Multi-fire operability (repo), terrain-degradation static flag, promoted-state transition wiring, handoff timeout policy — detailed in 09 §9.5 |
| Next gate | Round-3 review (V1 fact cross-check, V2 acceptance sweep), then render to `DELIVERY/` |
