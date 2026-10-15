# FlytBase Sentinel V2: Master Blueprint Vault
## 00 — Index & Executive Product Thesis

> **Document Status**: Canonical Architecture & Planning Standard  
> **Repository Location**: `docs/sentinel-v2-master-plan/`  
> **Last Updated**: 2026-09-11  
> **Target Audience**: AI Product Design Directors, Emergency Response Systems Engineers, Senior AI Builders  

---

## 1. Vault Directory & Document Map

This documentation vault contains the complete, authoritative record of all thinking, research, state machine design, spatial engineering, AI agent governance, and multi-scenario data modeling for FlytBase Sentinel V2.

```
docs/sentinel-v2-master-plan/
├── 00-INDEX-AND-EXECUTIVE-THESIS.md          (This document: Product vision & thesis)
├── 01-FIRE-SCIENCE-AND-REAL-WORLD-GROUNDING.md (NWCG, Rothermel, fuel models, ICS-209, CAD)
├── 02-SPATIAL-OS-AND-3D-MAP-SYSTEM.md        (Three.js 3D overlays, camera sync, IR mode, drag-drop)
├── 03-STATE-MACHINE-AND-ROUTE-TOPOLOGY.md    (8-stage lifecycle, 23 routes, dissent, failovers)
├── 04-TALON-AI-AGENT-CONSTITUTION.md         (LLM tool layer, 3-tier HITL gates, surface-truth guard)
├── 05-MULTI-SCENARIO-DATABASE-AND-FIXTURES.md(SQLite event store, 6 authored scenarios, schemas)
├── 06-UI-CRAFT-AUDIT-AND-REMEDIATION.md      (Left rail clip, tnum rollout, gap: 10 codemods, tokens)
├── 07-EVAL-HARNESS-TESTING-AND-VERIFICATION.md(7-gate test suite, prompt injection, eval matrix)
├── 08-PHASED-EXECUTION-ROADMAP.md            (Step-by-step implementation milestones)
├── 09-TALON-ORB-IDENTITY-AND-SURFACE-SPEC.md (Orb vs aperture, shader failure post-mortem, hybrid core)
└── original-specs/                           (Verbatim foundational source specifications)
    ├── SENTINEL-V2-MASTER-SPEC.md
    ├── sentinel-talon-backend-scenario-master-plan.md
    └── sentinel-master-system-routes-and-data-specification.md
```

---

## 2. The Core Problem Statement & Product Vision

### 2.1 The Real-World Dilemma
Wildland-Urban Interface (WUI) fires spread at terrifying velocity. When a fire ignites in dry chaparral under 25-knot winds, the window to prevent catastrophic community loss is measured in minutes, not hours. 

Yet in traditional emergency response:
- Size-up intel is fractured: satellite pings lag by hours, thermal ground sensors report false positives, and 911 calls overwhelm dispatchers.
- Reaching a defensible decision to mobilize mutual aid or trigger residential evacuation historically takes **15 to 25 minutes**.
- By the time human incident commanders confirm the fireline, flames have jumped primary containment corridors.

### 2.2 The Sentinel Solution
**FlytBase Sentinel is an Autonomous Spatial Operating System (Spatial OS)** for emergency initial attack and perimeter defense. 

It does not automate emergency judgment. It **compresses the time required to reach a defensible first escalation decision from 15 minutes down to under 90 seconds**, and then transitions into a **supervisory tactical coordination platform** for drone fleets and ground crews.

---

## 3. The Dual-Competency Showcase

This portfolio prototype is designed to prove that the candidate operates in the **top 1% across two intersecting disciplines**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    THE DUAL-PERSONA CAPABILITY                                   │
├──────────────────────────────────────────────────┬───────────────────────────────────────────────┤
│ 1. ELITE AI PRODUCT DESIGNER                     │ 2. FULL-STACK AI SYSTEMS BUILDER              │
├──────────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ • Human-in-the-Loop (HITL) Safety Architecture   │ • Production Agentic LLM Gateway (Gemini/Sonnet)│
│ • Clear distinction between AI synthesis (auto)  │ • Deterministic SQLite Event-Sourced Database │
│   and high-consequence execution (human-gated)   │ • Structured Tool / Function Calling Layer    │
│ • Cognitive Mode Shift: Intelligence vs. Ops     │ • Runtime Surface-Truth Validator (no drift)  │
│ • Deep Uncertainty UX: Conflicting sensor data,  │ • High-Performance WebGL 3D Engine (12 calls) │
│   operator dissents, and graceful degradation    │ • Automated AI Eval Harness (measuring hallucination│
│ • Desktop-led Control Center ergonomics          │   rates, refusal quality, and injection risk) │
└──────────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 4. The Core Architectural Stance: "A Reasoner Strapped to a Constitution"

The fundamental design law of Sentinel is that **the AI (TALON) never controls the application directly**. 

Instead:
1. **The State Machine is the Constitution**: Defined in a shared, immutable `TRANSITIONS` table and `GATED_ACTIONS` contract.
2. **The LLM Proposes**: When TALON reasons, it can only suggest actions by calling strictly permissioned tools.
3. **The Engine Validates**: Every proposal is verified against current state guards and human-gate requirements.
4. **The Human Authorizes**: Irreversible high-consequence actions (dispatching mutual aid, closing evacuation corridors, ordering chemical drops) strictly require an operator's continuous 2-second hold.

If the LLM hallucinates, experiences prompt injection, or goes completely rogue, **the state machine mechanically refuses the invalid transition**. The worst that can happen is an odd sentence in the chat log; the system can never take an unauthorized operational action.

---

## 5. Scope & Non-Goals

### In-Scope:
- Full 8-stage operational lifecycle across 23 discrete routes.
- Real LLM API integration with structured function calling.
- Multi-scenario SQLite database engine powering 6 distinct operational scenarios.
- 3D WebGL topography with projected operational overlays, diegetic IR night sensor mode, and drag-as-staging drone allotment.
- Rigorous AI evaluation harness measuring factual attribution and refusal correctness.
- Complete visual UI craft polish (eliminating text clipping, layout jitter, and off-grid spacing).

### Explicit Non-Goals:
- **No FlytBase Commercial API Integration**: Sentinel is a standalone portfolio prototype. It does not integrate proprietary FlytBase fleet cloud endpoints.
- **No False Claims of Fire-Trained AI**: TALON is honestly framed as a general frontier LLM operating within a domain-specific constitutional tool harness — not a certified meteorological fire model.
- **No Multi-Incident Simultaneous Command**: Scenarios run one active incident at a time to focus on deep decision ergonomics.
