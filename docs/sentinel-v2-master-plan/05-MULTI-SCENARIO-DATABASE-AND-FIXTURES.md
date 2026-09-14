# FlytBase Sentinel V2: Master Blueprint Vault
## 05 — Multi-Scenario Database & Parallel Fixtures

> **Document Status**: Canonical Data Engine & Scenario Specification  
> **Repository Location**: `docs/sentinel-v2-master-plan/`  
> **Target Audience**: Data Engineers, Systems Builders, Scenario Authors  

---

## 1. The Multi-Scenario Rationale

A portfolio prototype that only replays a single 90-second canned script is immediately recognized by experienced evaluators as fragile.

By implementing an **Event-Sourced SQLite Database (`sentinel-demo.db`) with 6 Authored Scenarios**, Sentinel proves:
1. The state machine is general, robust, and capable of handling diverse emergency topologies.
2. The AI can reason across different fuel models, terrain constraints, and operational conflicts without breaking.
3. Recruiters and hiring managers can explore different operational scenarios (e.g. testing AI overrule, wind shifts, or hardware failovers) across multiple sessions.

---

## 2. The Six Authored Operational Scenarios

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   THE 6 AUTHORED SCENARIO PACKS                                  │
├───────┬──────────────────────┬───────────────────────────────┬───────────────────────────────────┤
│ ID    │ Scenario Name        │ Operational Context           │ Key Capability Demonstrated       │
├───────┼──────────────────────┼───────────────────────────────┼───────────────────────────────────┤
│ S-01  │ **Encinal Ridge**    │ Wind-driven chaparral run     │ The optimal 90s baseline flow,    │
│       │ (Flagship Hero)      │ toward 47 homes in Grid 4C.   │ multi-source convergence, Plan A/B│
├───────┼──────────────────────┼───────────────────────────────┼───────────────────────────────────┤
│ S-02  │ **False Alarm**      │ Vineyard stubble burn;        │ Dissent Direction A: Operator     │
│       │ (Permit Conflict)    │ State Permit #8841 on record. │ overrules TALON; AI yields calmly.│
├───────┼──────────────────────┼───────────────────────────────┼───────────────────────────────────┤
│ S-03  │ **Canyon Gulch**     │ Narrow mountain pass; sudden  │ Real-time dynamic replanning:     │
│       │ (Wind Shear Reroute) │ 180° wind shift cuts Route A. │ Route B promoted under fire.      │
├───────┼──────────────────────┼───────────────────────────────┼───────────────────────────────────┤
│ S-04  │ **Data Fog**         │ Downlink loss + 420ms RF      │ Graceful degradation under heavy  │
│       │ (Degraded Reality)   │ latency; smoke-obscured visual│ uncertainty; honest caveats.      │
├───────┼──────────────────────┼───────────────────────────────┼───────────────────────────────────┤
│ S-05  │ **Night Rescue**     │ Low-visibility night ops;     │ Post-90s depth: FLIR LWIR mode,   │
│       │ (Infrared & Battery) │ Scout-01 battery hits 14%.    │ autonomous Scout-03 handover.     │
├───────┼──────────────────────┼───────────────────────────────┼───────────────────────────────────┤
│ S-06  │ **Two Voices**       │ Fast flash fire; incomplete   │ Dissent Direction B: Operator     │
│       │ (Operator Escalates) │ initial sizeup data.          │ escalates past hold; objection kept│
└───────┴──────────────────────┴───────────────────────────────┴───────────────────────────────────┘
```

---

## 3. Detailed Scenario Specifications

### Scenario 1: Encinal Ridge (Flagship Hero Path)
- **Geography**: Encinal Canyon WUI, Malibu CA (`6.0 × 3.25 km` frame).
- **Environment**: FBFM4 High Chaparral, 10-hr dead fuel moisture 6%, 20-ft wind NE 38° @ 14 kts.
- **Incident Dynamic**: Thermal cluster registers 480°F spike. Scout `Lidar-02` dispatched. Arrives in 14s, verifying 840°F crown run.
- **Resolution**: Operator approves Authority Packet AUD-90-0847 in 42s. Plan A (West Ridge anchor) authorized. 47/47 residential structures evacuated.

### Scenario 2: False Alarm / Burn Permit (The Dissent Differentiator)
- **Geography**: Northern Agricultural Valley Border.
- **Conflict**: Satellite IR detects heat bloom matching uncontrolled run. Agricultural database cross-references active permit #8841.
- **Dissent Flow**: Operator overrules TALON escalation, declaring: *"Permitted vineyard burn confirmed with local vineyard manager on VHF."*
- **Outcome**: Enters **Contested Watch**. 10 minutes later, burn crew extinguishes fire on schedule. System logs zero false-positive dispatch costs.

### Scenario 3: Canyon Gulch Sudden Wind Shift (Dynamic Reraise)
- **Geography**: Steep narrow valley with single primary highway (East Ridge Road).
- **Dynamic Event**: At minute 4 of operations, a cold front causes wind to violently shift 180° (NE 38° $\rightarrow$ SW 210° gusting 35 kts).
- **Reroute**: Fire spots across East Ridge Road. Route A is compromised. TALON triggers audible alarm, automatically re-routes ground units to Route B (Valley Ingress), and directs Drone `Scout-01` to project acoustic evacuation sirens along the new corridor.

### Scenario 4: Data Fog (Degraded Reality)
- **Failure Mode**: Geostationary satellite downlink drops. Radio repeaters suffer 420ms latency and 48% packet drop due to dense pyrocumulus smoke.
- **Behavior**: TALON refuses to claim high confidence. Gated buttons clearly display: *"Authority packet blocked: Lacks secondary corroboration."* Prompting the operator to deploy secondary drone `Scout-03` for local optical confirmation.

### Scenario 5: Night Rescue (Infrared & Battery Handover)
- **Visual Mode**: Diegetic LWIR night thermal sensor mode. Terrain renders in dark basalt tones; heat signatures glow white-hot.
- **Asset Crisis**: Drone `Scout-01` reaches 14% battery while guiding civilians on Route A.
- **Autonomous Handover**: TALON stages intercept waypoint for `Scout-03` from Nest 2. Operator clicks single-affirmation `Acknowledge Handover`. `Scout-03` assumes acoustic lead with zero coverage drop.

### Scenario 6: Two Voices (Operator Escalates Past TALON's Hold)
- **Dynamic Event**: Anomaly detected, but convergence is only 42%. TALON's algorithm recommends holding 15 seconds for secondary scout confirmation.
- **Executive Override**: Operator spots heavy billowing smoke and manually forces immediate escalation.
- **Behavior**: TALON complies instantly without obstruction, attaching its formal objection to Packet AUD-90-0847: *"TALON advised holding 15s; operator exercised command prerogative to escalate immediately."*

---

## 4. SQLite Database Schema (`better-sqlite3`)

The database utilizes an **event-sourced architecture** where state is reconstructed from an immutable append-only ledger:

```sql
-- 1. SCENARIOS (Catalog of authored worlds and configurations)
CREATE TABLE scenarios (
    id TEXT PRIMARY KEY,
    code_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    fuel_model TEXT NOT NULL,
    ambient_temp_f INTEGER NOT NULL,
    relative_humidity INTEGER NOT NULL,
    wind_vector_bearing INTEGER NOT NULL,
    wind_vector_speed_kts INTEGER NOT NULL,
    initial_coordinates TEXT NOT NULL, -- JSON [lat, lng]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. SESSIONS (Individual user walkthrough instances)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL REFERENCES scenarios(id),
    mode TEXT NOT NULL,                -- 'live-ai', 'scripted', 'replay'
    operator_label TEXT NOT NULL,      -- e.g. 'A. Rao'
    seed INTEGER NOT NULL,             -- PRNG seed for deterministic runs
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME
);

-- 3. EVENTS (Append-only immutable event ledger)
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    clock_ms INTEGER NOT NULL,         -- Simulation clock offset
    event_type TEXT NOT NULL,          -- 'beat', 'intent', 'ai_proposal', 'gate', 'dissent'
    payload TEXT NOT NULL,             -- JSON encoded event payload
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. DECISIONS (Human gate receipts)
CREATE TABLE decisions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    action_id TEXT NOT NULL,           -- e.g. 'notify-authorities', 'authorize-containment'
    operator_id TEXT NOT NULL,
    clock_ms INTEGER NOT NULL,
    sha256_digest TEXT NOT NULL,       -- Cryptographic audit hash
    authorized_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. DISSENT_RECORDS (Operator overrules)
CREATE TABLE dissent_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    direction TEXT NOT NULL,           -- 'operator-refuses', 'operator-escalates'
    talon_position TEXT NOT NULL,
    operator_reason TEXT NOT NULL,
    operator_notes TEXT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. AI_TURNS (Audit of LLM turns and surface-truth validation)
CREATE TABLE ai_turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    model TEXT NOT NULL,               -- e.g. 'gemini-1.5-flash', 'claude-3-5-sonnet'
    latency_ms INTEGER NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    truth_check_passed BOOLEAN NOT NULL,
    raw_prompt TEXT NOT NULL,
    output_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
