# FlytBase Sentinel V2: Master Blueprint Vault
## 03 — State Machine, Route Topology & Failure Catalog

> **Document Status**: Canonical State & Transition Standard  
> **Repository Location**: `docs/sentinel-v2-master-plan/`  
> **Target Audience**: State Machine Architects, Systems Engineers, UX Flow Designers  

---

## 1. The State Machine as Constitutional Law

In Sentinel V2, the state machine (`src/app/domain/stateMachine.ts`) is the single source of truth for both client and backend. 

### Core State Invariants:
1. **No Dead-End States**: Every normal and fault-injected state possesses valid, documented recovery or exit edges.
2. **Strict Gate Enforcement**: High-consequence actions (`confirm-incident`, `notify-authorities`, `authorize-containment`, `emergency-evacuate`) cannot be triggered without satisfying explicit human authorization gates.
3. **No Silent Dissent**: Any operator overrule of a TALON recommendation must capture an immutable reason string and enter a dedicated contested tracking state.
4. **Anti-Nagging Boundary**: TALON is structurally prohibited from repeating a rejected recommendation unless new corroborating sensor evidence crosses a raised confidence threshold.

---

## 2. Complete Operational Lifecycle — Diagram Names vs Real SceneIds

**[REPAIRED — B3]** The diagram below is rewritten to the exact `SceneId` values from `src/app/tokens.ts` (16 scenes). Names that appear only in older prose/diagrams are mapped in §2.1; nodes that do not exist in code yet are tagged **NEW** with planned `TRANSITIONS` rows in §2.2.

```mermaid
stateDiagram-v2
    [*] --> baseline: Surveillance Baseline
    baseline --> alert-command: Anomaly Ping
    alert-command --> investigation-pending: Scout Dispatched
    investigation-pending --> verify-active: Drone On Station

    verify-active --> verify-source-conflict: Satellite/Ag Burn Discrepancy (NEW)
    verify-source-conflict --> verify-active: Conflict Cleared by Operator (NEW)

    verify-active --> monitoring-contested: Operator Overrules / Permits Burn
    monitoring-contested --> baseline: Dissent Validated by Ground Truth
    monitoring-contested --> talon-reraise: Thermal Expansion > 15% (New Evidence)
    talon-reraise --> authority-notification-ready: Supervisor Escalates

    investigation-pending --> authority-notification-ready: Operator Escalates Past Hold
    verify-active --> authority-notification-ready: Incident Confirmed (90s Gate)

    authority-notification-ready --> contain-awaiting-teams: Authorities Notified (NEW)
    contain-awaiting-teams --> contain-recommended: Run-Card Teams Staged (NEW)

    contain-recommended --> contain-alternate: Operator Recomputes (Ridge B)
    contain-recommended --> contain-degraded: Terrain Confidence Loss

    contain-recommended --> rescue-nominal: Containment Authorized
    contain-alternate --> rescue-nominal: Alternate Authorized
    contain-degraded --> rescue-nominal: Wide-Buffer Authorized

    rescue-nominal --> rescue-partial-evac: Route A Blocked by Smoke (NEW)
    rescue-partial-evac --> rescue-nominal: Route B Shift Authorized (NEW)

    rescue-nominal --> rescue-battery-critical: Scout-01 Battery < 15%
    rescue-nominal --> rescue-signal-degraded: Comms Link Loss > 40%
    rescue-nominal --> infrastructure-total-loss: Backhaul Severed (Black Sky)

    rescue-battery-critical --> rescue-nominal: Scout-03 Handover Complete
    rescue-signal-degraded --> rescue-nominal: Mesh Relay Restored
    infrastructure-total-loss --> baseline: Manual System Restart

    rescue-nominal --> handoff-pending: Shift Change (NEW)
    handoff-pending --> rescue-nominal: Authority Transferred with PIN (NEW)

    rescue-nominal --> post-incident-review: Incident Contained (NEW)
    post-incident-review --> baseline: Post-Action Stand Down (NEW)
    post-incident-review --> [*]
```

### 2.1 Alias table: old doc/diagram names → real SceneIds

Authority is the `SceneId` union in `src/app/tokens.ts` (~line 519): `baseline`, `alert-command`, `investigation-pending`, `verify-active`, `authority-notification-ready`, `contain-recommended`, `contain-alternate`, `contain-degraded`, `rescue-nominal`, `rescue-signal-degraded`, `monitoring-contested`, `talon-reraise`, `rescue-battery-critical`, `satellite-feed-loss`, `infrastructure-total-loss`, `network-degraded`.

| Old doc/diagram name | Real SceneId | Status |
|---|---|---|
| Baseline | `baseline` | exact match |
| AlertSurfaced | `alert-command` | renamed |
| Investigation (bare name) | `investigation-pending` | renamed |
| VerifyActive | `verify-active` | renamed |
| SourceConflict | `verify-source-conflict` | **NEW** — planned (S5), not yet in code |
| ContestedWatch | `monitoring-contested` | renamed |
| TalonReraise | `talon-reraise` | renamed |
| AuthorityReady / `authority-ready` | `authority-notification-ready` | renamed |
| AwaitingTeams | `contain-awaiting-teams` | **NEW** — planned (S5), not yet in code |
| ContainRecommended | `contain-recommended` | renamed |
| ContainAlternate | `contain-alternate` | renamed |
| ContainDegraded | `contain-degraded` | renamed |
| RescueNominal | `rescue-nominal` | renamed |
| PartialEvac | `rescue-partial-evac` | **NEW** — planned (S5), not yet in code |
| BatteryCritical | `rescue-battery-critical` | renamed |
| SignalDegraded | `rescue-signal-degraded` | renamed |
| InfrastructureLoss | `infrastructure-total-loss` | renamed |
| HandoffPending | `handoff-pending` | **NEW** — planned (S5), not yet in code |
| Debrief | `post-incident-review` | **NEW** — planned (S5), not yet in code |

Note: the 16th real SceneId, `network-degraded`, is a fault scene entered via the Review Dock and is not part of this happy-path diagram. The sixth planned S5 state, `scenario-select` (recruiter front door), exists outside this diagram.

### 2.2 Planned `TRANSITIONS` rows for every NEW node

**[REPAIRED — B3]** Every non-existent node above is tagged NEW with its planned transition row (event / guard / gate / reason):

| NEW SceneId | Event (in → out) | Guard | Gate | Reason |
|---|---|---|---|---|
| `verify-source-conflict` | in: `source-conflict-detected` · out: `resolve-source-conflict` | in: satellite IR vs burn-permit discrepancy open · out: operator resolution recorded | out: forced calibrator (burn-permit checkbox promoted to addressable state) | Two primary sources must not silently cancel out; the conflict is resolved by a human, with a dedicated TALON pitch |
| `contain-awaiting-teams` | in: `authorities-notified` · out: `teams-staged` | in: notification receipt exists · out: ground crews confirmed staged | none (staging check, not an authorization) | Distinguishes "plan not ready" from "teams not yet staged" so containment cannot be authorized before crews exist |
| `rescue-partial-evac` | in: `route-a-stalled` · out: `route-b-authorized` | in: Route A blocked by smoke · out: Route B verified passable | out: human authorize (exception path) | Models real evacuation stalls; Route-B shift is a priority exception the operator must approve |
| `handoff-pending` | in: `shift-change-requested` · out: `confirm-handover` | in: outgoing operator is active · out: incoming operator PIN verified | out: PIN receipt gate | Shift change becomes a structured briefing moment with a PIN receipt, not an activity-log entry |
| `post-incident-review` | in: `incident-contained` · out: `stand-down` | in: all gates resolved and receipts written · out: debrief exported | none | Outcome-vs-expected review, dissent resolutions, and export before stand-down |

---

## 3. Beat-by-Beat 90-Second Intelligence Arc

The first 90 seconds are choreographed to maintain urgency without causing panic:

**[REPAIRED — B3/B5]** Scene names below are exact `SceneId`s; the packet line is downgraded to the hash-chained mutual-aid notification draft.

| Clock | State / Route | Operator Question Answered | TALON Behavioral Posture |
|---|---|---|---|
| T+00s | `baseline` | "What is nominal?" | Watching: 3 active sources, 3 aligning. Ambient patrol vectors. |
| T+12s | `alert-command` | "Why was I interrupted?" | Listening: 3-source convergence (thermal spike + wind vector). |
| T+20s | `investigation-pending` | "What is the scout doing?" | Solving: Scout Lidar-02 en route (ETA: 14s). Evidence prefilling. |
| T+45s | `verify-active` | "Is this fire real & urgent?" | Solving: Live dual-stream active. Burn permit conflict evaluated. |
| T+75s | `authority-notification-ready` | "Do I send this draft?" | Gated: hash-chained receipt ready — mutual-aid notification draft prepared. "I prepare; you authorize." |
| T+88s | `contain-recommended` | "What is our tactical plan?" | Staging: Authorities notified. Tactical staging begins. |

---

## 4. The Disagreement Arc (Structural Dissent)

Sentinel’s signature design innovation is how it handles human-AI disagreement in **both directions**:

### 4.1 Direction A: Operator Refuses TALON’s Escalation
- **Context**: At `verify-active`, TALON recommends escalation based on thermal heat bloom. The operator believes it is a permitted agricultural burn.
- **Action**: Operator clicks `Decline Escalation`.
- **System Behavior**:
  1. The Dissent Modal opens; operator enters justification: *"Permitted vineyard burn confirmed via local VHF radio."*
  2. Transition moves to `monitoring-contested`.
  3. TALON enters **Reduced-Weight Watch**: tracking continues silently in the background.
  4. The bar to re-raise is elevated: TALON cannot interrupt again unless fire front expands by >15% or crosses a buffer line.
  5. If new evidence arrives, TALON triggers `talon-reraise`, presenting the delta to the duty supervisor.

### 4.2 Direction B: Operator Escalates Past TALON’s Hold
- **Context**: During `investigation-pending`, the scout is still 10 seconds away, but the operator visually spots a smoke plume out the window.
- **Action**: Operator clicks `Confirm Incident Early`.
- **System Behavior**:
  1. TALON complies immediately without obstruction.
  2. It attaches an immutable note to the packet:  
     `escalationBasis: "operator-initiated (pre-convergence)"`
  3. TALON’s dissent rides along inside the audit ledger: *"TALON advised holding 10s for Lidar-02 optical confirmation; operator exercised executive authority to escalate."*

---

## 5. Comprehensive Failure & Degradation Catalog

Every critical failure mode in Sentinel has a distinct visual surface and a verified exit edge:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FAILURE CATALOG & RECOVERY EXITS                               │
├──────────────────────────┬─────────────────────────────┬─────────────────────────────────────────┤
│ Failure State            │ Root Cause / Failure Mode   │ Verified Recovery Exit                  │
├──────────────────────────┼─────────────────────────────┼─────────────────────────────────────────┤
│ `satellite-feed-loss`    │ GOES-R downlink timeout     │ Deploy second drone Scout-03 for aerial │
│                          │ during initial sizeup       │ cross-corroboration (`deploy-survey`)   │
├──────────────────────────┼─────────────────────────────┼─────────────────────────────────────────┤
│ `network-degraded`       │ 340ms cellular pipe latency │ Shed secondary telemetry; route via     │
│                          │ and 48% packet drop         │ local mesh drone (`relay-field-intel`)  │
├──────────────────────────┼─────────────────────────────┼─────────────────────────────────────────┤
│ `rescue-battery-critical`│ Scout-01 battery drops to   │ Supervised automated handover: Scout-03 │
│                          │ 14% while guiding evacuees  │ intercepts waypoint (`acknowledge-handoff`)│
├──────────────────────────┼─────────────────────────────┼─────────────────────────────────────────┤
│ `rescue-signal-degraded` │ Smoke cloud attenuates RF to│ Deploy mesh repeater Relay-03 overhead  │
│                          │ ground crew Strike Team A   │ (`deploy-backup`)                       │
├──────────────────────────┼─────────────────────────────┼─────────────────────────────────────────┤
│ `infrastructure-total-loss`│ Simultaneous power cut and│ Full-screen red takeover: fallback to   │
│                          │ satellite backhaul severance│ VHF Radio 154.280 MHz (`system.restart`) │
└──────────────────────────┴─────────────────────────────┴─────────────────────────────────────────┘
```

---

## 6. The 4 Newly Promoted Micro-States

To address the gaps identified in the architecture review, four intermediate states are promoted to full first-class members of the state machine:

1. **`verify-source-conflict`**:
   - Promotes the burn-permit calibrator from an embedded checkbox into an addressable state.
   - Dedicated TALON pitch: *"Two primary sources disagree: Thermal reads 840°F crown run; Satellite cross-references Permit #8841. Awaiting operator resolution."*
2. **`contain-awaiting-teams`**:
   - Gated state distinguishing "containment plan not computed" from "ground crews not yet notified".
   - Prevents operators from authorizing containment before ground units are staged.
3. **`rescue-partial-evac`**:
   - Models real-world evacuation stalls when smoke blocks primary corridors.
   - TALON dynamically surfaces Route B shift as a priority exception.
4. **`handoff-pending`**:
   - Transforms shift change from an activity log entry into a structured briefing moment.
   - Outgoing operator reviews audit receipts; incoming operator enters PIN (8842) to assume command.
