# FlytBase Sentinel V2: Master Blueprint Vault
## 09 — TALON Orb Identity, Shader Architecture & Surface UX

> **Document Status**: Canonical Identity & Visual System Standard  
> **Repository Location**: docs/sentinel-v2-master-plan/09-TALON-ORB-IDENTITY-AND-SURFACE-SPEC.md  
> **Last Updated**: 2026-09-11  
> **Target Audience**: AI Product Designers, Creative Technologists, Senior Frontend Engineers  

---

## 1. Executive Summary & Context

TALON is Sentinel's real-time AI reasoning agent. In the UI, TALON’s presence anchors the bottom ActionBar command plate. 

A central question in Sentinel's design is:
> *Should TALON look like a modern consumer AI orb (fluid, shader-based, Siri/ChatGPT-like as seen on orb-ui.com or orbkit) or an instrument-grade tactical aperture (hard-edged, mechanical, MIL-STD/ICS-aligned)?*

This document captures the forensic evaluation of both approaches, details why previous WebGL/npm orb library implementations failed in the codebase, and specifies the **Tactical Hybrid Core** architecture.

---

## 2. Why Past Implementations Failed (The npm Orb Library Post-Mortem)

Earlier attempts to integrate off-the-shelf orb libraries (such as libraries.dev/orbs / @orb-ui / Three.js-based shader blobs) failed for three concrete technical and architectural reasons:

### 2.1 WebGL Context Thrashing & Canvas Stacking
* Sentinel already mounts a full-screen Three.js WebGL canvas (worldScene.ts in Map3DExplorer.tsx / SentinelShell.tsx).
* Off-the-shelf orb packages create their own standalone <canvas> element running an independent requestAnimationFrame loop, WebGL context, and post-processing pipeline (bloom, chromatic aberration).
* On high-DPI (Retina/4K) displays, running dual uncoordinated WebGL contexts inside fixed-position DOM overlays caused frame drops, context-loss crashes, and layout container sizing glitches (0x0 canvas collapse inside dynamic flexbox containers).

### 2.2 Semantic Illiteracy (The Siri Blob Problem)
* Consumer AI orbs (orb-ui.com, Siri, Rabbit r1, Inflection Pi) use 3D Perlin/simplex noise to deform a glowing sphere into organic pastel clouds.
* While visually impressive in isolation, **an undulating liquid blob cannot communicate mission-critical emergency states**:
  * It cannot visually indicate a **2-Second Hold Gate** (GATED).
  * It cannot communicate a **Sensor Contested Conflict** without looking like a render glitch.
  * It cannot display a hard mechanical lockout (BLOCKED).
* Emergency operators make life-or-death decisions in high-stress environments. An ambiguous, wobbling pink/purple gradient conveys frivolity and unpredictability rather than deterministic reliability.

### 2.3 Brand & Visual Token Incoherence
* Sentinel's design language is strictly calibrated around instrument cyan (#1CB8E6), tactical amber (#F5A623), alert red (#E5533C), receipt teal (#2DD4A0), muted charcoal glass, and JetBrains Mono data tables. **[REPAIRED — B4]** The earlier invented hex set is deleted; these four are the real tokens.
* A consumer-grade iridescent multi-color orb destroyed the monochromatic discipline and optical hierarchy of the bottom command plate.

---

## 3. The Two Paradigms: Defense & Critique

`
┌───────────────────────────────────────────────────┬───────────────────────────────────────────────────┐
│ PARADIGM A: Modern Fluid AI Orb (Orb-UI / OrbKit) │ PARADIGM B: Mechanical Convergence Aperture (SVG) │
├───────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ STRENGTHS:                                        │ STRENGTHS:                                        │
│ • Immediate Frontier AI visual cue              │ • High domain authority & mission credibility     │
│ • Rich, organic motion during speech / thinking   │ • Unambiguous state conveyance (physical lock)    │
│ • Highly appealing in 10-second portfolio videos  │ • Zero WebGL overhead, deterministic rendering    │
│ • Proves modern WebGL / GLSL shader capability    │ • Strict alignment with ICS/DoD instrument tokens │
│                                                   │                                                   │
│ WEAKNESSES:                                       │ WEAKNESSES:                                       │
│ • Looks like a consumer toy / chatbot             │ • Can read as a static 2D vector icon at glance   │
│ • Cannot represent safety gates or veto states    │ • Lacks the alive organic presence of modern AI │
│ • Dual-canvas performance and layout instability  │ • Less visually arresting in static portfolio art │
│ • Fails WCAG contrast & crisp edge legibility     │ • Micro-state transitions can feel too subtle     │
└───────────────────────────────────────────────────┴───────────────────────────────────────────────────┘
`

---

## 4. The Canonical Solution: The Tactical Hybrid Core

To satisfy both the **AI Product Designer** (mission-critical safety, state clarity, domain credibility) and the **Portfolio Evaluator** (cutting-edge, alive, top-tier aesthetic craft), Sentinel adopts a **Tactical Hybrid Core**:

`
                              ┌────────────────────────────────────────┐
                              │         THE TACTICAL HYBRID CORE       │
                              └────────────────────────────────────────┘
                                                  │
                ┌─────────────────────────────────┴─────────────────────────────────┐
                ▼                                                                   ▼
    ┌───────────────────────────────┐                               ┌───────────────────────────────┐
    │  OUTER RING: Mechanical Gate  │                               │    INNER CORE: Luminescent    │
    │  (Precision SVG Instrument)   │                               │         Energy Pulse          │
    ├───────────────────────────────┤                               ├───────────────────────────────┤
    │ • 3-bladed aperture reticle   │                               │ • Multi-layered radial sheen  │
    │ • Physical close on HOLD GATE │                               │ • Voice-phase harmonics       │
    │ • Hard ticks & state glyphs   │                               │ • State-locked token hues:    │
    │   (Lock, Caution, Check)      │                               │   - Cyan #1CB8E6: watching,   │
    │ • Budget: idle 0% GPU         │                               │     searching, executing      │
    │   (verified by perf HUD)      │                               │   - Amber #F5A623: solving,   │
    │ • Absolute state precision    │                               │     gated                     │
    └───────────────────────────────┘                               │   - Red #E5533C: blocked      │
                                                                    │   - Teal #2DD4A0: receipt     │
                                                                    └───────────────────────────────┘
`

### 4.1 The 8 Visual Postures & Kinetic Signatures

**[REPAIRED — B4]** Table re-pinned to the real tokens (cyan `#1CB8E6`, amber `#F5A623`, red `#E5533C`, teal `#2DD4A0` — the earlier invented hex set is deleted). Gated moved red → **amber**: blades-closed geometry plus stillness carry the distinction from solving-amber; red is reserved for blocked/danger; teal for receipt/complete. Listening moved cyan → **red** per the temporal contract (red marks operator time being spent). "Locked" renamed **blocked** to match the posture vocabulary. The watching cadence is resolved to the single **4s cycle** (the earlier "60s ambient drift" reading was the inconsistency): visible liveness without noise.

| State | Outer Aperture Geometry | Inner Core Dynamics | Token Color | Semantic Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **watching** | Open reticle, gentle breath on the 4s watching cadence | Gentle breathing glint (0.2 to 0.5 opacity, 4s cycle) | cyan `#1CB8E6` | Passive sensor monitoring |
| **listening** | Concentric tick rings active | Outward ripple keyed to the operator's voice phase (derived from conversation state — no mic pipeline) | red `#E5533C` (temporal contract) | Operator prompt active |
| **searching** | Fast dual-ring counter-rotation | Sweeping orbital radar beam, inward sweep | cyan `#1CB8E6` | Querying fixtures & sensors |
| **solving** | Blades narrowing, consolidating density | Dense core pulsation (120 BPM harmonic pulse) | amber `#F5A623` | LLM generating action proposal |
| **gated** | **Blades locked dead shut over core** | Core still behind closed blades + Lock Glyph — stillness is the signature no orb library has | amber `#F5A623` + lock glyph | **Awaiting 2-second human hold** |
| **executing** | Segmented ring spinning clockwise | Steady luminescent burn | cyan `#1CB8E6` | Supervised action dispatched |
| **blocked** | Aperture tremor | Warning pulse + Caution triangle glyph | red `#E5533C` | Safety guard / boundary refusal |
| **receipt** | Aperture settled at rest | Soft expanding ripple + Checkmark glyph | teal `#2DD4A0` | Event permanently committed to log |

---

## 5. Technical Implementation Blueprint

### 5.1 Technology Choice: CSS / SVG Filter Mesh (No Canvas Stacking)
Instead of an external Three.js canvas or npm bundle:
1. **Zero Library Dependencies**: Built directly using SVG geometry and GPU-accelerated CSS properties (will-change: transform, filter: drop-shadow, backdrop-filter).
2. **Performance budget (not a locked-fps claim) — [REPAIRED — B4]**: compositor-only CSS/SVG animation. Budget: idle 0% GPU, ≤12 draw calls — verified by the perf HUD (`{fps} FPS · {calls} CALLS · {tris} TRIS`). Frame rate is device-dependent; we claim budgets, never "60fps locked / zero penalty".
3. **Voice-Phase-Reactive / Token-Reactive — [REPAIRED — B4]**: driven by the derived conversation state in `talonSurface.ts` (`deriveTalonSurface()`) and `TalonMark.tsx`. No mic pipeline is scoped, so nothing is sound-reactive.

### 5.2 File Structure & Ownership
* **Component**: src/app/components/talon/TalonMark.tsx (geometry and state morphs)
* **Styles**: src/app/components/talon/talon.css (kinetic animations and glow gradients)
* **Integration**: src/app/components/ActionBar.tsx (command plate anchoring)

---

## 6. Verification & Evaluation Criteria

1. **At 56px Control Size**: An evaluator glancing at the orb must be able to tell within 200ms whether TALON is *idle*, *thinking*, or *blocked by a safety gate*.
2. **Zero Context Loss**: 3D EXPLORE mode (worldScene.ts) and TALON orb can run simultaneously for 60 minutes without WebGL memory leak or context drop.
3. **WCAG AA Compliance**: Contrast ratios of the inner core and outer glyphs against the dark console background exceed 4.5:1 in all active states.
