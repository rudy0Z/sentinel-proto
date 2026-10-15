# Task: Sentinel Information-Design Research (48 min → 90 s)

## Goal
Full information-design research package for FlytBase Sentinel (forest-fire AI response platform, AI engine "Talon"):
mission-timeline data map, Talon data-consumption inventory, on-scene operator decision matrix, drone fleet + data
feed spec, traditional-workflow benchmark (where the 48 minutes goes), gap analysis of current repo UI vs required,
panel/UI-component spec, KPI traceability to the 90-second target, risk register + exception paths, handoff package.

## Assumptions (stated, per goal brief)
- Repo at the bound workspace contains the current Sentinel/Talon implementation to audit.
- Research + design spec deliverable (documents, matrices, wireframes) — no production code changes.
- Baseline 48 min → 90 s treated as given KPI anchor. English deliverables. Mission FUI preset 16 (Territory Studio) for visual artifacts.

## Subtask map (numbered; one subtask → one agent)

### Round 1 — parallel research (subagents) + mainline repo audit (zcode)
| ID | Agent / handle | Role perspective | Output file |
|----|----------------|------------------|-------------|
| R1 | r1-traditional-workflow | Traditional wildfire detection→response chain, time breakdown, data per step | .cluster/sentinel-info-design/research/R1-traditional-workflow.md |
| R2 | r2-drone-fleet | Drone classes, sensor payloads, data feeds, bandwidth/latency, handover | .cluster/sentinel-info-design/research/R2-drone-fleet.md |
| R3 | r3-data-feeds | External data sources (satellite, weather, GIS, IoT, cameras) + AI detection/prediction inputs/outputs | .cluster/sentinel-info-design/research/R3-data-feeds.md |
| R4 | r4-operator-ux | Operator roles/decisions, console pattern catalogue, alert hierarchy best practice | .cluster/sentinel-info-design/research/R4-operator-ux.md |
| ZA1–ZA3 | zcode_run (mainline) | Repo audit: structure → Talon AI data flow → UI panels catalogue, with file refs | .cluster/sentinel-info-design/repo-audit.md (+ repo-ui-audit.md) |

### Round 2 — chapter writers (subagents), gated on R1–R4 + repo audit
| ID | Writer | Chapters (output files) |
|----|--------|--------------------------|
| W1 | Timeline & benchmark | 01-mission-timeline-data-map.md, 05-traditional-workflow-benchmark.md |
| W2 | Machine & sensors | 02-talon-data-inventory.md, 04-drone-fleet-spec.md |
| W3 | Human & interface | 03-operator-decision-matrix.md, 07-ui-component-spec.md + console-wireframe.html |
| W4 | Evaluation | 06-gap-analysis.md, 08-kpi-traceability.md |
| W5 | Resilience & handoff | 09-risk-register-exception-paths.md, 00-README-handoff.md |

### Round 3 — review (subagents)
| ID | Reviewer | Scope |
|----|----------|-------|
| V1 | Fact/number cross-check | Every cited figure traced to research files or repo evidence; flag upgrades of unverified claims |
| V2 | Acceptance-criteria sweep | Goal Brief criteria vs delivered chapters; decision-matrix↔panel coverage check; 90 s dry-run of the data path |

### Delivery (mainline render)
- md→HTML renderer script reads chapter files (no hardcoded content) → DELIVERY/sentinel-information-design/index.html (self-contained, Territory Studio styling).
- console-wireframe.html copied under DELIVERY/ ; markdown chapter sources kept as durable sources.
- Final reply: deliverables list, verification results, acceptance self-check.

## Dependency graph
R1–R4 ∥ ZA1–ZA3 → W1–W5 → V1–V2 → render/deliver → goal complete.

## Dispatch gate note
First substantive execution call of this turn = sessions_spawn (R1–R4). Repo audits run mainline while researchers work.

## Status log
- [x] S0/S1 routing: no swarm skill matches this custom research+spec task; run S1–S5 with subagents.
- [x] plan.md written; Round 1 dispatched (R1–R4).
- [x] R1 first spawn failed twice on transient LLM provider errors → respawned (r1-traditional-workflow, new run). R2/R3/R4 running.
- [x] Mainline repo audit DONE (native read-only inspection; zcode_run blocked by provider capacity): `.cluster/sentinel-info-design/repo-audit.md`
      — stack, problem-statement quotes, TALON inputs/9 evidence kinds/tool layer/31 transitions/exceptions, full UI panel inventory, mock-data flags, in-repo domain sources (vault 00/01/04).
- [x] R1 (respawned) returned: 27 sources, 48-min allocation, compression map; honest uncertainty (constructed allocation, NFPA floors). R2 + R4 files verified on disk and read.
- [x] W1 returned 01 + 05 (then died mid-repair); AutoCoder fixed the two table-grid defects mainline — both files now 0 mismatches.
- [x] All research complete: R1 (27 sources), R2, R3b (18 sources, replacement run after original R3 went silent), R4 (46 sources).
- [x] All writers returned: W1 (01+05), W2 (02+04), W3 (03+07+wireframe, 30 rows/21 components/12 callouts), W5 (09+00), W4 (06, 15 gap rows). Table defects repaired mainline throughout (05/01/02/r1).
- [x] V1 fact review returned: 32 tags/0 dangling, 14 anchors exact, 0 fidelity fails. F-01 (missing 06/08) = valid → closes when both land; F-02/F-03 REFUTED with direct repo evidence (mockData.ts L78/82/83/93, stateMachine.ts L149–187). Log: review.md.
- [ ] w4b (single-chapter finisher) writing 08-kpi-traceability.md — the last chapter.
- [ ] Then: V2 acceptance sweep → final render + wireframe copy under DELIVERY/ → goal complete.
