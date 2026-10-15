# 09 · Risk Register & Exception-Path Playbook

> Chapter 09 of the Sentinel information-design research package (rev A · 2026-09-22).
> **Two-source rule:** `[repo]` = verified in `repo-audit.md` (direct read-only file inspection); `[R1]` / `[R2]` = `research/r1-traditional-workflow.md` / `research/r2-drone-fleet.md`; **[new]** = risk added by this research, not modeled in the repo today; **[new-spec]** = required NEW interface behavior specified here. Likelihood and residual ratings are judgment calls tagged `[est]`.
> Design principle carried through every path: **"Uncertainty is operational data"** — degradation is rendered as quantified fields (confidence %, `marginMeters`, `blockedCommands`), staged Class-2 actions **expire to watch and never execute on silence**, Class-3 actions are a **2-second operator hold with TALON forbidden** [repo · TALON constitution, `docs/sentinel-v2-master-plan/04`].

---

## 9.1 What resilience must protect — the TALON exception field model

Every playbook step below renders through one schema — the repo's `OperationalException` (`src/app/domain/exceptions.ts`) [repo]:

| Exception field | Meaning | Repo UI surface |
|---|---|---|
| `affectedSources` | evidence kinds degraded/failed | IntelPanel freshness matrix + ExceptionPanel |
| `affectedAgents` | TALON agent tasks blocked/failed | TalonCopilotPanel agent-task list |
| `blockedCommands` | actions forbidden while degraded | ExceptionPanel blocked list; ActionBar |
| `fallbackInputs` | substitute evidence sources | ExceptionPanel fallback list |
| `confidenceImpact` | quantified change, e.g. "Confidence reduced to 40%. Spread margin increased ±200m" | copilot banner + signal chart re-anchor |
| `recommendedRecoveryCommand` | one-command path back toward nominal | ExceptionPanel action row |
| `auditText` | receipt text for the log | ActivityLogPanel (actor AI/TALON/Operator/System + severity) |
| `mapImpact` + `spatialUncertainty {marginMeters, affectedZoneIds, basis, observedAt}` | map degradation ring with provenance | SpatialMapCanvas overlay |

**Failure scenes already modeled [repo]** (`exceptions.ts` + `REVIEW_SCENES`, verified `verify:machine` 31 transitions / 0 unreachable / 4 fault scenes): `satellite-feed-loss`, `network-degraded`, `rescue-battery-critical`, `rescue-signal-degraded`, `infrastructure-total-loss`; disagreement scenes `monitoring-contested`, `talon-reraise`; promoted states incl. `handoff-pending` (PIN) and `verify-source-conflict`.

## 9.2 Risk register

Phase codes: **F** Fuse 0–15 s · **V** Verify 15–45 s · **C** Contain 45–75 s · **R** Rescue 75–90 s · **OPS** continuity/handoff. Likelihood: H/M/L `[est]`.

| ID | Risk | Phase | Lklhd | Impact on the 90-s path | Early indicator in UI data | Mitigation (interface behavior) | Residual risk | Owner | Model |
|----|------|-------|-------|--------------------------|-----------------------------|--------------------------------|---------------|-------|-------|
| R-01 | Satellite/weather data-feed loss (satellite-ir, RAWS-style wind) | F, V | M `[est]` — pass gaps 90 min–3¼ h `[R1]` | Fused confidence collapses (scene example −38 pts → 40%; spread margin +200 m); verify window must re-anchor before any gate | `satellite-ir` status → `failed`/0; satellite agent `failed`; `source-discrepancy` event [repo] | ExceptionBanner interrupt; `fallbackInputs` = drone-visual/LiDAR/ground-thermal/burn-history; `recommendedRecoveryCommand` offered; gated actions held until re-convergence [repo] | Single-source false negative persists until drone ETA | TALON autonomous | **repo scene** |
| R-02 | Live video feed loss / bandwidth collapse (HD EO/thermal streams) | V, R | M–H `[est]` — per-scout uplink 5–8 Mbps H.264 / 2–4 H.265 `[R2]` | Operator loses the eye on fire mid-verify; rescue supervision degrades to telemetry-only | stream-quality chip drops; drone-perception agent `blocked`; HD tiles freeze [repo] | Auto-downshift to low-bandwidth LiDAR outlines + cached route model + local telemetry; HD suspended, never silently dropped [repo]; adaptive codec ladder H.264→H.265 [R2] **[new-spec]** | Visual confirmation latency returns | TALON + operator | repo (ladder new) |
| R-03 | GPS-denied flight (RTK/NTRIP corrections absent ~530 B/s RTCM; GPS_RAW_INT quality drop) [R2 · MAVLink fields in-repo §5] | F, V, C, R | M `[est]` | Georeferenced anomaly/perimeter invalid → contain plan mis-anchored; corridor guidance unsafe | `[new-spec]` RTK-lock flag absent; position age grows; `GPS_RAW_INT` fix quality low | **[new-spec]** marker → last-known/dead-reckoned + `spatialUncertainty` halo (schema already supports it [repo]); `blockedCommands`: perimeter-monitor, guide-emergency-personnel, corridor-approach; `fallbackInputs`: EO terrain anchoring, LiDAR relative nav; RTH is **operator-authorized** (never TALON) | Mission abort if re-lock exceeds battery reserve `[est]` | TALON + operator | **new** |
| R-04 | Comms relay failure / C2 link loss (terrain RF shadow, LTE outage) | C, R | M `[est]` — ridges/shadow terrain `[R2]` | Command latency spikes; precision commands blocked; crews out of reach during rescue window | signal badges fall; HEARTBEAT gaps at 5 Hz WS sync [repo]; airframe failsafe hover→RTH is airframe-class behavior [R2] | `network-degraded`/`rescue-signal-degraded` scenes [repo]; dispatch `guidance-relay` drone (roster ×3) to restore mesh backhaul 5–20 Mbps `[R2 est]`; continue supervision on cached model | Airframe may RTH before relay is aloft → coverage gap | TALON + operator | repo |
| R-05 | False-alarm escalation (unverified civilian/911-style reports; conflicting sources) | V | H `[est]` — R1: 911 "~15 min" report is optimistic perception; location reports unstandardized | Burns the single verify window on a non-fire; authority-packet mis-send risk | `source-discrepancy` event; conflicting evidence chips (thermal spike vs ag-burn permit #8841) [repo] | `verify-source-conflict` → ContestedWatch panel; dissent capture on override (never silent); TALON re-raises **only** when new evidence crosses the raised bar (`shouldReRaise`) [repo] | Corroborated false alarm still escalates (permit on file ≠ no fire) | TALON proposes / operator decides | repo |
| R-06 | **Multiple simultaneous fires** — queue is read-only summaries | All | M `[est]` — major-fire days | **Unbounded**: 90-s arc exists for one active incident only; second ignition cannot be operated | FOCUSED_INCIDENT_QUEUE grows (1 active + N read-only, frozen timestamps) [repo] | **[new-spec]** triage queue w/ Grade-1/2/3 reuse; per-incident state-machine sessions; fleet-deconfliction board (10-drone roster shared); per-incident exception namespacing; escalation to regional commander + mutual aid as **human gate** (`notify-mutual-aid` forbidden-by-construction for TALON [repo]) | Single-console span of control | Operator + process | **repo gap → new** (R4 triage pattern, resolved in appendix §10.4) |
| R-07 | Sensor degradation / drift (thermal ±2 °C/±2 % spec; smoke/SOF/heat-soak) `[R2]` | F, V | M–H `[est]` | Hotspot misclassification; confidence stalls before the convergence bar; verify extends past 45 s | thermal confidence easing (62→91) stalls; evidence `status: stale`; freshness matrix ages [repo] | Freshness matrix forces stale acknowledgment; re-pass tasking to `thermal-lidar` class; gated actions require converged confidence [repo]; drift quantification in `confidenceImpact` **[new-spec]** | Sub-threshold drift undetected between passes | TALON autonomous | repo partial (drift metrics new) |
| R-08 | Terrain-model degradation (under-canopy, burn-altered terrain) | C | M `[est]` | 15/30/60-min spread rings widen; contain-plan confidence drops inside the 45–75 s window | TERRAIN_MODEL_STATUS chip → degraded; `uncertaintyMarginMeters` grows; `contain-degraded` scene [repo] | Rings re-rendered with margin; hold `authorize-containment` until fresh LiDAR model build (Class-3 hold anyway) [repo]; model `basis` shown in `spatialUncertainty` [repo] | Under-canopy terrain stays unmodeled [R2 LiDAR limits] | TALON + operator | repo (flag is static today — open q. §9.5) |
| R-09 | Battery / logistics exhaustion (dock duty cycle) | C, R, OPS | H `[est]` — single-dock coverage ≈ 61 % (50 min fly + 32 min charge) `[R2 est]`; min inter-sortie 32 min `[R2]` | Coverage gap mid-incident; rescue supervision handoff forced under time pressure | battery %, signal, mission ETA in DroneFleetPanel; `rescue-battery-critical` (Lidar-02 14 % → supervised handoff to Scout-03) [repo] | Supervised handoff flow [repo]; staggered multi-dock rotation ≤10 km spacing [R2, no public timing spec]; 2-min robotic hot-swap class [R2] **[new-spec for UI]**; low-battery RTH scheduled before handoff | 32-min floor per dock on single-dock sites | TALON schedules / operator approves | repo + R2 |
| R-10 | Operator overload / fatigue | All | H `[est]` | Missed interrupt inside the 45–75 s contain window; slow gated action = arc blows past 90 s | unacked banner age; prompt-queue depth (7 chips); N active exceptions at once [repo] | Pitching doctrine: Rule of One, consequence-before-logistics, blocker-first, anti-nagging [repo]; exceptions consolidate into one panel slot; relief-operator handoff [repo · PRODUCT.md] | Vigilance decrement on long watches | TALON (pitching) + process (shifts) | repo partial (workload metrics new) |
| R-11 | LLM gateway failure (model timeout/unreachable) | All | L `[est]` | Copilot goes silent — operator loses synthesis voice; **gates unaffected** (gates are code, not LLM) [repo] | gateway health flag; microcopy-mode badge **[new-spec]** | **Verified this audit:** 8 s timeout → falls back to authored microcopy "so the demo never strands" [repo]; truth-guard patterns reject fabricated claims; tool layer stays deterministic [repo] | Loss of narrative synthesis, never loss of control | TALON autonomous | repo — **claim verified** |
| R-12 | Alert fatigue | All | M `[est]` | Desensitization → a true re-raise gets dismissed like the last false one | re-raises/hour **[new-spec metric]**; dismissed-banner count | Re-raise **only** on new evidence crossing the raised bar (`reraise-threshold` timer + `shouldReRaise`) [repo]; consequence-first copy [repo] | Threshold tuning is terrain-specific | TALON + process | repo |
| R-13 | Handover / shift-change authority gap | OPS | H `[est]` — shifts are routine | Authority vacuum mid-exception; gated actions with no owner; exception context lost between operators | `handoff-pending` banner; PIN prompt unaccepted; pending-handoff age [repo] | PIN-gated transfer; exception packet + audit trail travels with the chair (relief operator + regional commander personas [repo · PRODUCT.md]); pending state **never auto-completes**; platform-class control-access transfer exists in FlytBase ops [R2 · S34] | Unaccepted handoff strands the incident — timeout policy required **[new-spec]** | Process | repo + R2 |
| R-14 | Dock weather exceedance (fire-weather gusts vs airframe/dock limits) | Pre-arc, OPS | M–H `[est]` — Dock 2 max landing wind 8 m/s vs M30T 15 m/s ops; fire columns exceed both `[R2]` | Fleet grounded exactly when needed — the 90-s arc never starts (no airborne eye) | **[new-spec]** dock wind/ambient chip vs limits; go/no-go state per airframe | Go/no-go card in DroneFleetPanel [R2]; pre-position tethered/patrol class for watch continuity [R2]; manual M30T-class ops inside 15 m/s [R2] | Sustained gusts ground all rotary assets | TALON monitors / process decides | **new** |

## 9.3 Exception-path playbook (6 goal-brief scenarios)

Format per scenario: **Trigger → Interface behavior → Operator fallback → Recovery/return-to-nominal → Audit receipt.**

### P-1 · Data loss (satellite/weather/video) — repo scene: `satellite-feed-loss` (+ `network-degraded`)

| Step | Content |
|---|---|
| Trigger | `satellite-ir` forced `failed`/0 confidence [repo]; weather feed stale; HD video stream collapse [R2: per-scout 5–8 Mbps class] |
| Interface behavior [repo] | ExceptionBanner interrupt; ExceptionPanel populates `affectedSources` (satellite-ir), `affectedAgents` (satellite agent failed), scene `blockedCommands`, `fallbackInputs` = drone visual/LiDAR/ground thermal/burn history, `confidenceImpact` ("Confidence reduced to 40%. Spread margin increased ±200m"), `recommendedRecoveryCommand`; IntelPanel freshness matrix shows `failed`; TalonCopilotPanel signal series re-anchors |
| Operator fallback | Acknowledge interrupt → run `recommendedRecoveryCommand` → task nearest drone re-look + ground thermal → **hold all gated actions** until fused confidence re-crosses the bar |
| Recovery → nominal | Feed restored → status `active` → confidence re-converges inside the 90-s window → uncertainty margin shrinks → exception clears to watch (Class 2 expiry, never executes on silence) [repo] |
| Audit receipt | `auditText` + ActivityLogPanel row (actor System/TALON, severity), `spatialUncertainty.basis` + `observedAt` timestamped; dissent captured if operator overrode [repo] |

### P-2 · GPS-denied flight — **[new-spec]** (no repo scene; exception schema already supports it [repo])

| Step | Content |
|---|---|
| Trigger | RTK/NTRIP correction stream absent (~530 B/s RTCM) [R2]; `GPS_RAW_INT` fix-quality drop [repo doc §5]; executed as failsafe hover→RTH on C2 loss [R2] |
| Interface behavior [new-spec] | ExceptionBanner: airframe position → last-known/dead-reckoned marker + `spatialUncertainty` halo (`marginMeters` from DR drift model, `basis: "GNSS-denied dead reckoning"`); `blockedCommands`: perimeter-monitor, guide-emergency-personnel, corridor approach, precision containment ghost-deploy; `fallbackInputs`: EO terrain anchoring, LiDAR-relative nav; `confidenceImpact` on every perception fused from that airframe; `affectedAgents`: drone perception `blocked` |
| Operator fallback | Switch airframe to watch-only posture → authorize RTH (operator-only; TALON forbidden) → re-task reserve `multi-role` drone from roster |
| Recovery → nominal | RTK re-lock → verification re-pass over affected zones → margin shrinks → blocked commands release → banner to watch |
| Audit receipt | Drift-window start/end, max `marginMeters` reached, blocked-command list, RTH authorization event, re-lock timestamp (actor split: System detect / Operator authorize) |

### P-3 · Comms relay failure — repo scenes: `network-degraded`, `rescue-signal-degraded`

| Step | Content |
|---|---|
| Trigger | C2/video degradation in RF shadow or LTE outage [R2]; telemetry heartbeat gaps at 5 Hz WS sync [repo]; airframe-class failsafe arms [R2] |
| Interface behavior [repo] | HD streams suspended — never silently dropped; low-bandwidth LiDAR outlines + cached route model + local telemetry; `affectedAgents`: drone perception `blocked`; map: agent markers → last-known + stale badge; ExceptionPanel lists scene `blockedCommands` + `fallbackInputs` |
| Operator fallback | Dispatch a `guidance-relay` drone (roster carries 3 [repo]; mesh class 5–20 Mbps pass-through `[R2 est]`) → keep crews on radio → supervise rescue on cached model + outlines |
| Recovery → nominal | Relay aloft → backhaul restored → HD resumes → blocked commands release → relay re-assigned or recovered |
| Audit receipt | Outage window (start/end), bandwidth-mode switches, blocked-command list with release times, relay sortie ID [repo ActivityLog + `auditText`] |

### P-4 · False-alarm escalation — repo scenes: `verify-source-conflict`, `monitoring-contested`, `talon-reraise`

| Step | Content |
|---|---|
| Trigger | `source-discrepancy` event — e.g., thermal spike vs ag-burn permit #8841 [repo]; or operator downgrade of a TALON incident call (R1: unverified caller reports are the classic false-alarm vector) |
| Interface behavior [repo] | ContestedWatch panel opens; confidence series re-anchored via contested-watch override; DissentGate captures a reason on every override edge (`requiresDissent` — dissent never silent); ReRaiseBrief renders only on threshold crossing |
| Operator fallback | Record dissent reason → downgrade incident to watch → set watch parameters (evidence bar, window) |
| Recovery → nominal | TALON re-raises **only** when new evidence crosses the raised bar (`shouldReRaise`) [repo]; otherwise incident closes to patrol and the queue summary is retired |
| Audit receipt | Dissent record (actor, time, reason), original raise evidence, bar values before/after, re-raise evidence if fired. ⚠ `verify-source-conflict` transition wiring not individually verified this audit [repo open q. §9.5] |

### P-5 · Multiple simultaneous fires — **[new-spec]** (known repo gap: queue is read-only summaries)

| Step | Content |
|---|---|
| Trigger | Second ignition during an active incident; a queue summary becomes operable (today: FOCUSED_INCIDENT_QUEUE = 1 active + 2 read-only, frozen timestamps; brief §9 defers operability [repo]) |
| Interface behavior [new-spec] | Triage queue with ranked severity (reuse Grade-1/2/3 + agency enum); explicit **active-incident switch** (per-incident state-machine session; incident ID prefixes every banner/audit row); fleet-deconfliction board showing the 10-drone roster split across incidents with conflict markers; exception objects namespaced per incident (schema unchanged); cross-incident `spatialUncertainty` rendering on one map |
| Operator fallback | Triage decision: continue / switch / hand off — hand one incident to the relief operator via `handoff-pending` PIN flow [repo]; escalate to regional commander; mutual aid is a **human gate** (`notify-mutual-aid` forbidden-by-construction for TALON [repo]) |
| Recovery → nominal | Incidents consolidate or close → fleet returns to a unified roster → single-session mode resumes |
| Audit receipt | Per-incident receipts (the per-scene `auditText` model, namespaced), resource-contention log (which drone/task denied to which incident, why), switch/handoff events with PIN acknowledgment. R4 triage-queue pattern adopted per appendix §10.4 conflict resolution |

### P-6 · Sensor degradation / drift — repo: `degraded-terrain` scene, TERRAIN_MODEL_STATUS, evidence `stale` status

| Step | Content |
|---|---|
| Trigger | Thermal accuracy erodes (±2 °C/±2 % class spec [R2]) under smoke/SOF/heat-soak; terrain model flagged degraded (static flag today [repo, §9.5]); evidence `status → stale` [repo] |
| Interface behavior [repo] | Freshness matrix ages the source; TERRAIN_MODEL_STATUS chip → degraded; spread rings re-rendered with `uncertaintyMarginMeters`; `confidenceImpact` string quantifies the hit; `mapImpact` + `spatialUncertainty` ring with `basis` |
| Operator fallback | Widen margins → request fresh `thermal-lidar` pass (Lidar-02 class) → hold `authorize-containment` until model refresh (Class-3 2-second hold anyway; TALON forbidden) |
| Recovery → nominal | New model build lands → margins shrink → plan confidence restores → chip returns to nominal |
| Audit receipt | Model version/`basis`, before/after `marginMeters`, missions tasked to rebuild, gate holds and releases [repo exceptions + ActivityLog] |

## 9.4 Rollback method summary

| Mechanism | Trigger | What rolls back | Who invokes | Finality / expiry | Evidence |
|---|---|---|---|---|---|
| Staged-action expiry (Class 2) | TALON stages an adjustment; operator does not act | Staged action **expires to watch — never executes on silence** | TALON autonomous | Expiry is terminal for the action; state returns to watch | [repo · constitution §3-tier HITL] |
| Two-second hold (Class 3) | Destructive/high-consequence command (authorize-containment class) | Nothing auto-runs; command lives only while held | Operator only — TALON forbidden | Released early = no-op; no silence-execution path exists | [repo · constitution + ActionBar press-and-hold gates] |
| Dissent record | Operator overrides a TALON proposal/gate | TALON decision downgraded to watch; operator position becomes the record | Operator | Permanent record; never silent (reason required) | [repo · `requiresDissent` edges, DissentGate, `disagreement.ts`] |
| Recommended recovery command | Any active exception | One-command path from degraded state back toward nominal (proposed, not executed) | TALON proposes / operator executes | Stays valid until exception clears or scene changes | [repo · `recommendedRecoveryCommand`] |
| Abort controls | Mission/route unsafe mid-execution | Tasking stopped; airframe to failsafe (hover→RTH per class behavior [R2]) | Operator only — `abort-mission` has no TALON tool (forbidden-by-construction) | Immediate; logged with reason | [repo · `talonTools.ts` forbidden surface] |
| Infrastructure-loss takeover | `infrastructure-total-loss` scene | Console switches to full manual protocol (InfrastructureLossTakeover); AI supervision suspended | Operator / System | Manual protocol persists until infra restored | [repo · `shell/InfrastructureLossTakeover.tsx`] |
| Handoff PIN gate | Shift change / relief operator | Authority transfer held in `handoff-pending` until PIN accepted; **never auto-completes** | Process (both operators) | Pending until accepted or explicitly cancelled — timeout policy is a **[new-spec]** gap (R-13) | [repo · `handoff-pending`; PRODUCT.md personas] |

## 9.5 Honesty notes & open questions

1. `verify-source-conflict`, `handoff-pending` (and `rescue-partial-evac`, `contain-awaiting-teams`) appear as promoted states but their transition wiring was **not individually verified** in the repo audit [repo open q.1] — P-4/P-5 flows assume the wiring exists.
2. TERRAIN_MODEL_STATUS is a **static scene flag** today, not a live degradation model [repo open q.3] — R-08 mitigation is spec-level, not implemented.
3. All bandwidth, duty-cycle, and handover-timing figures trace to R2 and are `[est]`/vendor-inferred; no public dock-to-drone handover latency spec exists [R2 §f.5].
4. Multi-fire: repo-vs-research conflict (read-only summaries vs R4 full triage queue) resolved per `10-research-appendix.md` §10.4 — flagged as a known repo limitation; UI treatment is new-spec.
5. Likelihood/residual ratings are analyst judgments `[est]`, anchored to R1/R2 figures where cited; they are not measured incident statistics.
