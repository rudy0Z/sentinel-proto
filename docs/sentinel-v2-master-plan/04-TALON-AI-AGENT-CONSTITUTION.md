# FlytBase Sentinel V2: Master Blueprint Vault
## 04 — TALON AI Agent Constitution & Backend Architecture

> **Document Status**: Canonical Agent Governance & System Integration  
> **Repository Location**: `docs/sentinel-v2-master-plan/`  
> **Target Audience**: AI Systems Engineers, LLM Alignment Leads, Platform Architects  

---

## 1. The Core Agent Stance: "A Reasoner Strapped to a Constitution"

In mission-critical autonomous systems, an LLM must never be allowed unconstrained write access to application state. 

In Sentinel V2:
- **The Constitution**: The state machine (`stateMachine.ts`) and the 4 immutable gates (`GATED_ACTIONS`).
- **The Agent (TALON)**: An LLM reasoner (Gemini 1.5/2.0 Flash or Claude 3.5 Sonnet) operating exclusively through a **permissioned tool-calling interface**.
- **The Surface-Truth Invariant**: TALON’s voice is derived directly from state via `deriveTalonSurface()`. The LLM cannot speak a state that isn't true, cannot invent sensors not present in the scenario store, and cannot trigger transitions without human authorization.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 TALON CONSTITUTIONAL ENFORCEMENT                                 │
├────────────────────────────┬─────────────────────────────┬───────────────────────────────────────┤
│ LLM Capability             │ Permission Mechanism        │ Machine Enforcement                   │
├────────────────────────────┼─────────────────────────────┼───────────────────────────────────────┤
│ Read Scenario State        │ Tool: `read_scene_state()`  │ Always allowed (read-only query)      │
│ Read Evidence Convergence  │ Tool: `read_evidence()`     │ Cites real source confidence & latency│
│ Propose State Transition   │ Tool: `propose_transition()`│ Engine validates against TRANSITIONS. │
│                            │                             │ If gated, renders UI gate for human.  │
│ Recompute Tactical Plan    │ Tool: `propose_plan()`      │ Creates alternate; human must confirm │
│ Fire Gated Action Directly │ FORBIDDEN (No Tool Exists)  │ Mechanically impossible by design     │
└────────────────────────────┴─────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Three-Tier Human-in-the-Loop (HITL) Permission Gates

Every capability in Sentinel is mapped to a strict permission class:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    THREE-TIER HITL TAXONOMY                                      │
├─────────┬──────────────────────────┬─────────────────────────────────┬───────────────────────────┤
│ Class   │ Name                     │ Permitted Actions               │ Authorization Requirement │
├─────────┼──────────────────────────┼─────────────────────────────────┼───────────────────────────┤
│ Class 1 │ Autonomous Telemetry     │ Sensor fusion, thermal contour  │ 100% Autonomous.          │
│         │ Synthesis                │ interpolation, camera tracking  │ Operates without prompts. │
├─────────┼──────────────────────────┼─────────────────────────────────┼───────────────────────────┤
│ Class 2 │ Supervised Tactical      │ Drone patrol orbit adjustments, │ Single-Click Confirm or   │
│         │ Adjustments              │ battery critical scout handover │ automatic timeout fallback│
├─────────┼──────────────────────────┼─────────────────────────────────┼───────────────────────────┤
│ Class 3 │ Irreversible High-       │ Statutory Authority Packet send,│ Strict 2-Second Hold on   │
│         │ Consequence Acts         │ Evacuation corridor closure,    │ tactile plinth. TALON     │
│         │                          │ Manual radio takeover trigger   │ strictly forbidden to act.│
└─────────┴──────────────────────────┴─────────────────────────────────┴───────────────────────────┘
```

---

## 3. TALON Behavioral Policy & Pitching Doctrine

### 3.1 Plan-Making Policy
When computing or recomputing a containment plan:
1. **Optimization Hierarchy**: Life safety $\rightarrow$ Responder exposure $\rightarrow$ Property / containment efficiency.
2. **Standard Staging Trilogy**: Every containment plan must specify (a) Aerial Coverage, (b) Corridor Guidance, and (c) Ground Team Notification.
3. **Run-Card Initialization**: Rather than inventing tactics from scratch, TALON customizes pre-approved initial-attack run cards matching real dispatch doctrine.
4. **Drawdown Awareness**: Never commit the last available scout drone without explicitly declaring reserve depletion.

### 3.2 Pitching Policy & Anti-Nagging Rules
- **The Rule of One**: Exactly one recommended plan, one alternate plan, and one trade-off sentence. Then silence.
- **Consequence Precedes Logistics**: Stated exposure (structures/lives) comes before drone names or radio frequencies.
- **Blocker Stated First**: Explain what is preventing an action before asking for an authorization.
- **Anti-Nagging Law**: If an operator rejects an escalation or plan, TALON is structurally prohibited from repeating the pitch unless new evidence crosses the re-raise threshold.

---

## 4. Backend System Architecture

The backend is built as a lightweight, robust Node.js service designed to run locally or deployed to a cloud runner:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BACKEND SERVICE TOPOLOGY                                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   React Front-End (Vite Client :4190)                                                            │
│          ▲                              │                                                        │
│          │ WebSocket (Port :4191)       │ REST POST /command                                     │
│          │ (5Hz Telemetry / State Sync) │ (Optimistic UI / Intent Dispatch)                      │
│          │                              ▼                                                        │
│   ┌──────┴──────────────────────────────────────────────────────┐                                │
│   │ Fastify Gateway & Session Manager                           │                                │
│   └──────┬──────────────────────────────┬───────────────────────┘                                │
│          ▼                              ▼                                                        │
│   ┌──────────────┐             ┌─────────────────┐             ┌───────────────────────────────┐ │
│   │ Scenario     │             │ StateResolver   │             │ TalonConverser                │ │
│   │ Engine       │             │ (Shared domain  │             │ • LLM API Client (Key Server) │ │
│   │ • Clock/Ticks│             │  TRANSITIONS    │             │ • Structured Tool Execution   │ │
│   │ • Seeded PRNG│             │  table)         │             │ • Runtime Truth-Check Guard   │ │
│   └──────┬───────┘             └────────┬────────┘             └───────────────┬───────────────┘ │
│          │                              │                                      │                 │
│          ▼                              ▼                                      ▼                 │
│   ┌────────────────────────────────────────────────────────────────────────────────────────────┐ │
│   │ SQLite Event-Sourced Storage (better-sqlite3)                                              │ │
│   │ `sentinel-demo.db` (Append-Only Event Ledger, Sessions, Decisions, Dissent Records)         │ │
│   └────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Server Stack Details
- **Runtime**: Node.js 22 LTS with TypeScript.
- **HTTP/WS Framework**: Fastify with `@fastify/websocket` on port `4191`.
- **Database Engine**: `better-sqlite3` operating an append-only event log.
- **Shared Codebase**: The entire `src/app/domain/` directory (`stateMachine.ts`, `talonSurface.ts`, `disagreement.ts`) compiles for both browser and Node.js.

---

## 5. Tool / Function Calling Declarations

The backend exposes the following structured tools to the LLM agent:

```typescript
export const talonToolDeclarations = [
  {
    name: "read_scene_state",
    description: "Returns the current full ShellState snapshot, including active scene, workflow phase, and telemetry.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "read_evidence",
    description: "Returns the active evidence sources, confidence scores, latencies, and stated conflict notes.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "propose_transition",
    description: "Proposes an operational state transition to the state machine. Validated against guards and gates.",
    parameters: {
      type: "object",
      properties: {
        event: { type: "string", description: "Event name e.g. dispatch-scout, confirm-incident" },
        payload: { type: "object", description: "Optional event metadata" }
      },
      required: ["event"]
    }
  },
  {
    name: "recompute_plan",
    description: "Recalculates tactical containment staging based on operator tactical assumptions or wind shifts.",
    parameters: {
      type: "object",
      properties: {
        preferredStrategy: { type: "string", enum: ["ridge-anchor", "creek-buffer", "defensive-holding"] },
        evacuationPriority: { type: "string", enum: ["route-a", "route-b", "dual-egress"] }
      },
      required: ["preferredStrategy", "evacuationPriority"]
    }
  },
  {
    name: "draft_authority_packet",
    description: "Assembles corroborating evidence into cryptographic packet AUD-90-0847. Does NOT send it.",
    parameters: {
      type: "object",
      properties: {
        severityGrade: { type: "string", enum: ["Grade-1", "Grade-2", "Grade-3"] },
        notifiedAgency: { type: "string", enum: ["CAL_FIRE_NORTH", "USFS_REGION_5", "COUNTY_OES"] }
      },
      required: ["severityGrade", "notifiedAgency"]
    }
  }
];
```

---

## 6. Runtime Surface-Truth Guard & Prompt Scaffolding

To guarantee that the LLM never hallucinates or drifts away from the application state, every turn is bound by a strict scaffold:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PER-TURN PROMPT ASSEMBLY                                       │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. SYSTEM CONSTITUTION: Capability limits, refusal rules, 3-lead palette semantics.               │
│ 2. DERIVED SURFACE TRUTH: Output of `deriveTalonSurface(state)`:                                 │
│    - Current Posture (e.g. `gated`, `solving`, `contested`)                                      │
│    - Locked Tone (`caution`, `safe`, `danger`)                                                   │
│    - Active Posture Line ("Packet prepared. You send it — I never do.")                          │
│    - List of currently blocked commands & reasons                                                │
│ 3. ACTIVE EVIDENCE FRAME: Fused confidence percentage, active sources, and missing data caveats. │
│ 4. FEW-SHOT EXEMPLARS: 2–3 authored chip responses from `microcopy.ts` grounding tone & syntax.  │
│ 5. OUTPUT CONTRACT: Max 90 words; cite per-source confidence; declare uncertainty; zero fluff.   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Post-Turn Validation:
Before streaming an LLM response to the client, the backend executes an automated regex/semantic truth check:
- If the model claimed an action was executed when it is actually gated $\rightarrow$ **Turn Rejected**.
- If rejected, the turn is logged to `ai_turns` with `truth_check: false`, and the canonical authored copy from `TALON_CHIP_RESPONSES` is delivered instead.
- This guarantees **zero visual drift and zero hallucinations** in live portfolio demonstrations.
