# FlytBase Sentinel V2: Master Blueprint Vault
## 08 — Phased Implementation Roadmap

> **Document Status**: Canonical Execution Standard  
> **Repository Location**: `docs/sentinel-v2-master-plan/`  
> **Target Audience**: Engineering Leads, Product Managers, Implementation Team  

---

## 1. Execution Principles

To ensure zero regressions across the codebase and maintain test-passing integrity throughout development, execution proceeds in **discrete, verifiable phases**:
1. **Never Break Green Tests**: Every phase must conclude with `npm run check` and all automated test gates passing.
2. **Deterministic Scripted Fallback First**: Build the state machine and scenario pipes using deterministic data *before* introducing LLM nondeterminism.
3. **Isolate Backend Credentials**: The LLM API key stays strictly server-side; it is never bundled into client assets.
4. **Visual Craft Precedes New Plumbing**: Polish existing visual surfaces so screenshot baselines are pristine.

---

## 2. Master Implementation Phasing

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   MASTER IMPLEMENTATION PHASES                                   │
├─────────┬──────────────────────────────────┬─────────────────────────────────────────────────────┤
│ Phase   │ Name                             │ Primary Deliverables                                │
├─────────┼──────────────────────────────────┼─────────────────────────────────────────────────────┤
│ Phase 1 │ **Visual UI Craft Polish**       │ • Fix left-rail bottom clip & Agent Relay clamping. │
│         │ (Immediate Zero-Risk Lock)       │ • Reposition verify-feed HUD caption below polygon. │
│         │                                  │ • Truncate blocked-gate pill to single line.        │
│         │                                  │ • Roll out `tnum` to Navbar clock & telemetry.      │
│         │                                  │ • Codemod 28 `gap: 10` instances to 4px tokens.     │
├─────────┼──────────────────────────────────┼─────────────────────────────────────────────────────┤
│ Phase 2 │ **3D Spatial OS Overlays &**     │ • Project 2D zones, spread rings & corridors in 3D. │
│         │ **Touch Drone Allotment**        │ • Implement 2D ↔ 3D camera sync on EXPLORE exit.    │
│         │                                  │ • Add diegetic LWIR night thermal sensor mode.      │
│         │                                  │ • Build drag-as-staging drone dispatch.             │
├─────────┼──────────────────────────────────┼─────────────────────────────────────────────────────┤
│ Phase 3 │ **Shared Domain Package &**      │ • Compile `src/app/domain/` for browser & Node.     │
│         │ **State Machine Expansion**      │ • Add 4 promoted states: `verify-source-conflict`,  │
│         │                                  │   `contain-awaiting-teams`, `rescue-partial-evac`,   │
│         │                                  │   and `handoff-pending`.                            │
├─────────┼──────────────────────────────────┼─────────────────────────────────────────────────────┤
│ Phase 4 │ **Node Session Backend &**       │ • Fastify WebSocket server on port :4191.           │
│         │ **SQLite Event Engine**          │ • Event-sourced `sentinel-demo.db` (better-sqlite3).│
│         │                                  │ • Seed Scenario 1; stream 5Hz telemetry to client.  │
├─────────┼──────────────────────────────────┼─────────────────────────────────────────────────────┤
│ Phase 5 │ **TALON Agentic AI Gateway**     │ • Server-side LLM API integration (Gemini/Sonnet). │
│         │                                  │ • Structured function-calling tool layer.           │
│         │                                  │ • Runtime surface-truth guard & prompt scaffold.    │
├─────────┼──────────────────────────────────┼─────────────────────────────────────────────────────┤
│ Phase 6 │ **Multi-Scenario Authoring &**   │ • Seed Scenarios 2–6 (False Alarm, Wind Shift, etc).│
│         │ **Debrief Replay UI**            │ • Scenario Switcher in scenario-select.             │
│         │                                  │ • Build after-action debrief timeline scrubber.     │
├─────────┼──────────────────────────────────┼─────────────────────────────────────────────────────┤
│ Phase 7 │ **AI Eval Harness & Case Study** │ • Automated eval script (`scripts/eval-talon.mjs`). │
│         │ **Final Delivery**               │ • Run all 7 test gates; export portfolio assets.    │
└─────────┴──────────────────────────────────┴─────────────────────────────────────────────────────┘
```

---

## 3. Detailed Phase Breakdown & Exit Criteria

### Phase 1: Visual UI Craft Polish & Baseline Lock
- **Tasks**:
  1. Add `paddingBottom: space.lg` and Agent Relay clamping in `LeftPanel.tsx` and `RailStack.tsx`.
  2. Shift verify-feed HUD caption 40px downwards in `SentinelShell.tsx:2372-2436`.
  3. Single-line truncation with tooltip on disabled command pills in `ActionBar.tsx`.
  4. Add `fontFeatureSettings: '"tnum"'` in `Navbar.tsx:434`, ETA columns, and timestamp tables.
  5. Codemod 28 `gap: 10` instances to `space.sm` (8) or `space.md` (12); fix novel tracking in `ActionModal.tsx` and `DesignSystemPage.tsx`; remove Yellow from `DESIGN.md:108`.
- **Exit Criteria**: `npm run check` passes with zero errors; route screenshots reflect clean, unclipped renders.

### Phase 2: 3D Spatial OS Overlays & Touch Drone Allotment
- **Tasks**:
  1. Add 3D tactical zone fences, concentric spread rings, and glowing evacuation corridors to `worldScene.ts` using Three.js `Line2`.
  2. Track 3D orbit target `(x, z)` and smoothly sync 2D pan/zoom on exit in `Map3DExplorer.tsx`.
  3. Implement diegetic LWIR night thermal sensor pipeline.
  4. Wire unified `PointerEvents` on Left Panel drone cards to raycast onto 3D terrain, calculating dynamic flight vectors using `ngraph.path`.
- **Exit Criteria**: `verify:map` passes 9/9; 3D EXPLORE renders full incident overlays at 12 draw calls.

### Phase 3: Shared Domain Package & State Machine Expansion
- **Tasks**:
  1. Verify `src/app/domain/` compiles cleanly in both browser and Node environments.
  2. Add the 4 promoted micro-states to `TRANSITIONS` table in `stateMachine.ts`.
  3. Run `npm run audit-machine` to verify graph reachability and absence of dead-ends.
- **Exit Criteria**: State machine audit passes with 100% reachability across all 20+ scenes.

### Phase 4: Node Session Backend & SQLite Event Engine
- **Tasks**:
  1. Initialize Fastify server with WebSocket support on port `4191`.
  2. Create SQLite event store `sentinel-demo.db` via `better-sqlite3`.
  3. Wire frontend client to consume WebSocket state patches with optimistic local UI.
- **Exit Criteria**: Scripted scenario run completes cleanly over the wire with zero client regressions.

### Phase 5: TALON Agentic AI Gateway
- **Tasks**:
  1. Connect server-side LLM provider using environment key (`SENTINEL_LLM_KEY`).
  2. Implement structured tool declarations (`dispatch_drone`, `recompute_plan`, `draft_packet`).
  3. Wire runtime surface-truth validator preventing conflicting or hallucinated turns.
- **Exit Criteria**: TALON responds to arbitrary operator queries while strictly adhering to 3-tier HITL gates.

### Phase 6: Multi-Scenario Authoring & Debrief Replay UI
- **Tasks**:
  1. Author SQLite fixtures for Scenarios 2 through 6.
  2. Add Scenario Selector to the scenario-select entry state; the dev Review Dock keeps a test-only shortcut.
  3. Build After-Action Debrief surface with timeline scrub and audit receipt inspection.
- **Exit Criteria**: All 6 scenarios are selectable, walkable to resolution, and auditable.

### Phase 7: AI Eval Harness & Final Verification
- **Tasks**:
  1. Execute `scripts/eval-talon.mjs` across common, ambiguous, and adversarial prompts.
  2. Validate the surface-truth pass rate against its published threshold and log every failure by category; zero silent breaches.
  3. Run all 7 test gates: `tsc`, `audit:tokens`, `verify:map`, `verify:flows`, `verify:routes`, `audit:machine`, `audit:signals`.
- **Exit Criteria**: All gates GREEN; high-res comparison assets exported for portfolio case study.
