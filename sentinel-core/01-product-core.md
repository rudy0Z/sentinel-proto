# 01 — Product Core

> **status: canonical.** The product definition and the complete data model. This is the contract between TALON, the operator, and the backend.

## 1. Identity

**Sentinel** — FlytBase's autonomous aerial watch for wildfire initial attack: the first 0–90 minutes of a vegetation fire, where detection speed decides everything.

**The brand story (one paragraph, use it everywhere):** For a century, wildfire response began with a person in a fire lookout tower, watching. Sentinel is the next lookout — autonomous drones that watch, an AI named TALON that reasons about what it sees, and a human operator who decides. The machine watches; the human decides; every decision is receipted. We are not replacing the lookout — we are giving the lookout a fleet, a memory, and a voice that never lies about what it knows.

**The promise:** compress detection → verification → authorized escalation from a ~48-minute manual baseline into a ~90-second supervised arc — ending at **verified escalation + authority handoff, never at containment**. Honest compression: ×16–×60 depending on scenario.

**Users:** the **Operator** (EOC watch officer or IC's aide — the seat this product is designed around, 1920×1080 desk console with tablet recomposition as a later target) and the **reviewer** (design directors, drone-industry evaluators — the portfolio audience). One primary persona per seat; no persona soup.

**The two-phase model:** **Intelligence** (detect · verify · escalate) → **Operations** (stage · coordinate · supervise). The phase is state, not decoration — density, priorities, and TALON's authority all derive from it.

## 2. The constitution (product law, all enforced in code)

1. TALON is a reasoner strapped to a constitution: it reads evidence, recomputes plans, drafts — it **cannot** fire a gated action (no tool exists).
2. Gated actions (`confirm-incident`, `notify-authorities`, `authorize-containment`, `emergency-evacuate`) commit only through the operator: C2 staged (45 s expiry, logged, never executes) or C3 explicit hold.
3. TALON's surface is derived from a single source (`deriveTalonSurface`) — the orb, voice, and gate label cannot disagree.
4. Dissent is bidirectional and remembered; re-raise requires new evidence crossing the bar.
5. Every decision lands in a hash-chained ledger. The authority packet is a draft TALON never sends.
6. Attention is the only thing TALON controls: propose, never rearrange; ≤2 interrupts per 10 minutes; one pop at a time.
7. Honesty: scripted scenarios are labeled; live mode is labeled LIVE-SIM; degraded states show authored copy; targets are never quoted as results.

## 3. The data model — what TALON consumes, what the operator sees

### 3.1 TALON's inputs (computation and decision data)

| Input | Contents | Source today |
|---|---|---|
| Scene state | 20-scene machine position, workflow phase, mode | `stateMachine.ts` |
| Evidence | 9 kinds × 5 statuses × confidence (thermal, satellite-ir, drone-visual, lidar, wind, fuel, terrain, burn-history, structure-road) | `talon.ts:414` |
| Signal series | thermal / structures-at-risk / fused confidence over the 90 s convergence window | `getSignalHistory` |
| Fleet | 10 drones × 5 classes: battery, signal, position, status, assigned mission | `mockData` roster |
| Teams | 3 ground teams: availability, vitals, assignment | roster |
| Terrain & zones | 5 zone polygons + envelopes, DEM, risk/spread/structures per zone | `mockData` + `map/zones.ts` |
| Weather | wind vector string (scripted) / windBearing+speedKts (live) — **temp/RH exist server-side only** `[NEXT: RAWS surface]` | `INCIDENT`, frames |
| Containment plans | 2 strategies × spread/exposure/protection/cost/confidence/eta | `CONTAINMENT_PLAN_SUMMARY` |
| Constraints | geofence, TFR, blocked commands per exception — **geofence authored in world data, not yet a UI layer** `[NEXT]` | `exceptions.ts`, world |
| Dissent memory | prior operator overrides + re-raise thresholds | `disagreement.ts` |
| Live frames (LIVE-SIM) | 5 Hz: thermal, confidence, wind, structures, lidar ETA, scene hint | `server/scenarioEngine` |

### 3.2 TALON's outputs (what the operator is shown)

| Output | Where |
|---|---|
| Posture (8 states) + ≤90-word consequence brief | Deck cradle + Mind console |
| One recommendation at a time (Rule of One) with provenance chips + confidence | Mind console |
| Tool trace (11 agent tasks, tool calls, gates, blockers) | Mind console |
| Staged proposals with class chip (C2/C3) + expiry ring | Deck |
| UI intents (focus map / pin evidence / open panel / compare plans) — validated, dismissible, undoable, logged | Mind console |
| Attention pops (T1/T2) within the interrupt budget | Alert airspace |
| Draft authority packet (grade, agency, evidence, missingData) | Packet modal |
| Receipts (every decision, hash-chained) | Ledger surfaces |

### 3.3 The ledger (what the system remembers)

Client activity log (actor AI/TALON/Operator/System) + server SQLite: `scenarios, sessions, events, decisions (sha256 chain), dissent_records, ai_turns`. `[NEXT]` additive tables: `scenario_beats`, `scenario_zones`, `scenario_drones`, `tool_calls`, `intents`, `attention_pops` — see `07 §8` of redesign-2026.

## 4. Backend ↔ UI map

| Backend piece | Serves |
|---|---|
| Fastify gateway :4191, 5 Hz WS frames | LIVE-SIM telemetry |
| `POST /command` against the shared transition table | gate enforcement (403 on gated edges) |
| `POST /talon/message` + truth guard | one TALON turn, degraded fallback |
| `/audit/:sessionId` re-derivation | tamper-proof receipt review |
| Scenario catalog S-01…S-06 with beats/decisions | the mockup-situation library |

**Adopted patterns from LiveKit Agents** (redesign-2026 §7): typed tool registry · tool-trace event stream · `talon_state` posture attribute · confirmation round-trip for gated actions · RPC-framed UI intents · event-sequence scenario tests.

## 5. Data gaps (the honest list, carried from redesign-2026 §9)

Per-drone telemetry in frames · weather entity (RAWS) · geofence/TFR as data + layer · dock/preflight state · sceneHint → server-authoritative scene events · video wall feed · comms log. Each is a `[NEXT]` item; none blocks the visual finalization.
