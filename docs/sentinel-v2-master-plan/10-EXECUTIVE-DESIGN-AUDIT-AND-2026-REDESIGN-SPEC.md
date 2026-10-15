# FLYTBASE SENTINEL // C2 AUTONOMOUS AIRSPACE & WILDFIRE SYSTEM
## EXECUTIVE DESIGN TEARDOWN & 2026 DEFENSE HUD SPECIFICATION

**DOCUMENT ID:** AUD-SPEC-2026-0916 (unratified draft)

> **status: historical** — audit input only (2026-09-16). Its forensic **diagnosis was verified against the code and salvaged** into `docs/redesign-2026/` (03 implementation plan, 04 visual language). Several **prescriptions were rejected** — new palette hexes, canvas/GLSL orb, invented state names, self-granted authority — because they conflict with canonical vault 09 / tokens.ts / the honesty rules (see `docs/redesign-2026/00-validation-and-direction.md` §3). Do **not** build from this document. The wireframe below contains illustrative fictional values (e.g. `[LINK: 12ms]`), not product data.

**DATE:** September 16, 2026  
**TARGET REPOSITORY:** `D:\portfolio porjects\flytbase`

---

## 1. EXECUTIVE VERDICT: THE "VIBECODED" PLAYGROUND REJECTION

I am formally **rejecting** the build delivery represented in `scene-contain-recommended.png`.

FlytBase Sentinel is intended to be our flagship autonomous wildfire containment and airspace C2 (Command & Control) environment—a defense/aerospace system on par with **Palantir Gotham, Anduril Lattice, and Skydio Autonomy**. What has been delivered instead is an amateurish, toy-like "vibecoded" visual playground that lacks design discipline, mathematical coherence, and aerospace credibility.

If this prototype is presented to Design Directors, VP of Product, or autonomous defense evaluators, it will be immediately dismissed as a junior designer's Figma experiment. 

### The Core Failure Pillars:
1. **Topological Absurdity ("Floating Sky Regions"):** Dashed orange and cyan boundary lines cut straight across the dark atmosphere 300 meters above the mountain peaks like broken neon powerlines. Operators cannot tell whether they are looking at airspace ceilings, ground zones, or rendering bugs.
2. **The Demotion of TALON AI:** Our premier autonomous reasoning engine has been degraded to an inert 28px 2D flat SVG icon inside a crude 60×60px squircle button. It possesses zero volumetric presence, no state awareness, no neural breathing, and zero cognitive authority.
3. **Candy-Bar Telemetry & Visual Pollution:** Critical operational gauges in the telemetry rails are chunky 8px rounded neon candy bars. The interface looks like a casual mobile game rather than an aerospace telemetry console.
4. **Catastrophic Color Sprawl (Violation of the 60-30-10 Rule):** Neon cyan, burning orange, warning amber, lime green, hot pink, and teal all scream for attention simultaneously at 100% saturation. There is no visual hierarchy; noise drowns out signal.

---

## 2. FORENSIC AUTOPSY: WHY ARE REGIONS FLYING INTO THE SKY?

### The Exact Bug Dissected
When inspecting the region commented on by leadership:
```
"what are these regions even? where are they going literally"
```

The user is observing the dashed orange lines (`FOREST ZONE`, `GRID 4C`) and cyan lines (`BUFFER ZONE 1`, `BUFFER ZONE 2`) extending into the black sky above the ridgeline.

#### The Root Cause: 2D SVG on a 3D Oblique Perspective Backdrop
1. **The Active View is 2D:** The screenshot is running `SpatialMapCanvas.tsx` (the 2D Ops Map), as evidenced by the bottom-left toggle `[EXPLORE • 3D]`.
2. **The Backdrop Swap:** In `baseline`, `SpatialMapCanvas` displays a flat, top-down orthomosaic (`map-preincident.png`). But when transitioning to `contain-recommended`, the backdrop is swapped to `sentinel-map-overhaul.png`—an **oblique ~45° perspective 3D render** where the top 40% (~350px) is empty night sky.
3. **Zero Perspective Transform:** In `ZoneLayer.tsx`, the zones are rendered as flat 2D SVG polygons:
   ```tsx
   <polygon points={polygonToSvgPoints(zone.polygon, viewport)} />
   ```
4. In `mockData.ts:194`, polygon coordinates were authored for the top-down flat orthomosaic:
   `polygon: "0,78 124,64 220,86 336,70..."`
   Because these coordinates are mapped directly to SVG screen pixels without any 3D homography projection, camera intrinsic matrix, or horizon clipping, the northern points with small Y values project straight into the open night sky!
5. **Secondary 3D Defect:** Even when switching to `EXPLORE • 3D` (`overlays3d.ts`), sparse GPS vertices are connected by straight lines through 3D space with `ZONE_LIFT_M = 4.0`, which lack vertex densification, causing line segments to clip through mountains and hover over valleys.

---

## 3. REAL-WORLD BENCHMARKING & REFERENCE ANALYSIS

### A. The Instagram Reference (`https://www.instagram.com/p/DdMJFsPkhEL`)
Analysis of modern dark-mode defense and geospatial interfaces (`juicelab.uiux` / ZIXO):
1. **Vertical Barcode Spectrum Columns:** Instead of chunky horizontal 8px progress bars, data density is achieved through dense vertical micro-columns (1.5px width, 0.5px gap) displaying distribution and confidence over time.
2. **Concentric Floating Glass Capsules:** Action bars and command controls are unified, frosted-glass capsules (`backdrop-filter: blur(24px) saturate(180%)`) with mathematically aligned inner-to-outer radii ($R_{\text{outer}} = R_{\text{inner}} + \text{Padding}$).
3. **Monochrome Obsidian Base:** 95% of the viewport is rendered in deep obsidian slate (`#06080C` to `#0F1622`). Color is treated as an expensive resource, reserved strictly for live state changes and warnings.

### B. The Technical Dossier (`D:\Downloads\Mobile Devices\New folder (4)`)
1. **Concentric Radius Law (`HRj9GgQbUAEVZ5G.jpg`):**
   $$R_{\text{outer}} = R_{\text{inner}} + \text{Padding}$$
   Every card, button, and pill in Sentinel must follow this law to eliminate visual discord.
2. **TrackWise Telemetry (`HSApmk9WYA08vH3.jpg`):** Hairline precision borders (`border: 1px solid rgba(255, 255, 255, 0.06)`), 10px monospace micro-labels, and muted slate secondary text.
3. **OrchestrateIQ Neural Core (`HSAdSygbAAAvmFO.jpg`):** Volumetric glowing AI sphere with fluid particle clouds, organic multi-layered breathing, and reactive radial aura.
4. **Radial Arc Tick Gauge & Token Matrix (`HSKNCFCaEAAeNu3.jpg`):** 24-segment radial arc meters with tick marks rather than continuous rounded progress bars; live token and event throughput counters.
5. **Tool Call DAG (`HSKNDnxXsAUJEuU.jpg`):** Hierarchical agent reasoning chains displaying execution trees (`Perception` $\rightarrow$ `Risk Eval` $\rightarrow$ `Waypoint Optimization` $\rightarrow$ `Containment Command`).
6. **Alert Sparklines & Latency Heatmap (`HSKNEoLbEAAbCjn.jpg`):** Micro 7×24 cell heatmaps and threshold sparklines embedded into telemetry panels.

---

## 4. RADICAL REDESIGN SPECIFICATION: 2026 DEFENSE HUD

```
+----------------------------------------------------------------------------------------------------+
| FLYTBASE SENTINEL // C2 AIRSPACE CONTAINMENT                 [THREAT: ELEVATED] [LINK: 12ms] [UTC] |
+------------------------------------+-----------------------------------+---------------------------+
| SECTOR TELEMETRY                   | 3D TACTICAL AIRSPACE (ORBIT CAMERA) | TALON COPILOT (AUTONOMOUS)|
| - 24-Segment Arc Gauges            | - Terrain-Conforming Vector Meshes| - Volumetric Neural Core  |
| - Micro-Column Barcode Histograms  | - Ground-Clamped Glowing Ribbons  | - Real-time Tool-Call DAG |
| - 7x24 Fleet Latency Heatmap       | - Volumetric Exclusion Cylinders  | - Dynamic Reasoning Trace |
|                                    |                                   | - Reversible Interventions|
+------------------------------------+-----------------------------------+---------------------------+
|                                    | [ <o> TALON: CONTAINMENT ENGAGED | DISPATCH FLEET | ABORT ]   |
|                                    |    Unified Dynamic Floating Glass Capsule (Concentric)    |
+------------------------------------+---------------------------------------------------------------+
```

### Pillar 1: Geospatial & Terrain Coherence Engine
- **Strict 2D/3D Separation:**
  - In 2D Ops mode (`SpatialMapCanvas.tsx`), use ONLY the true top-down orthomosaic (`map-preincident.png`). Oblique 3D renderings must NEVER be used as flat 2D image backdrops.
  - When the incident escalates to containment (`contain-recommended`), automatically transition to the WebGL 3D Engine (`SpatialMapCanvas3D.tsx`).
- **Terrain-Conforming Volumetric Ribbons in 3D (`overlays3d.ts`):**
  - Densify polygon perimeter vertices at 1.0m intervals between GPS coordinates.
  - Clamp ground vertices directly to the DEM elevation grid using `sampleElevation(x, z)` from `world.ts`.
  - Extrude containment boundaries as **vertical volumetric curtain ribbons** from ground level up to the airspace ceiling (e.g. 120m AGL), textured with a faint holographic grid raster and a glowing perimeter wire.

### Pillar 2: TALON Volumetric Autonomous Neural Core
- **Retire the 28px Flat Squircle:**
  - Replace the flat SVG in `TalonSession.tsx` and `TalonMark.tsx` with a multi-layered, interactive canvas shader sphere inspired by OrchestrateIQ.
  - **Visual Anatomy:** A 48px sphere featuring an inner chromatic core, an outer Fresnel rim glow, and an orbiting particle constellation representing active reasoning threads.
- **Cognitive State Animation:**
  - `IDLE_MONITORING`: Slow, deep cyan pulse (0.5 Hz), particles orbiting calmly.
  - `ANALYZING_BREACH`: Amber acceleration (1.8 Hz), particles condensing inward.
  - `EXECUTING_INTERVENTION`: Electric blue plasma flare with radial shockwaves along the command capsule.
- **Tool-Call DAG in `TalonCopilotPanel.tsx`:**
  - Replace static text logs with a live execution DAG showing sub-agent milestones:
    $$\text{Sensor Fusion} \longrightarrow \text{Crown Spread Simulation} \longrightarrow \text{Airspace Lock} \longrightarrow \text{Evacuation Corridor}$$

### Pillar 3: Precision Micro-Telemetry & Data Density
- **Eradicate 8px Jelly Bars in `PanelViz.tsx`:**
  - **Primary Meters:** Replace with 2px precision hairline track gauges (`background: rgba(255, 255, 255, 0.06)`, `fill: #00E5FF`).
  - **Distribution Data:** Replace with 24-column vertical barcode spectrum meters (inspired by `juicelab.uiux`), where column heights represent signal confidence.
- **Radial Arc Tick Gauges:**
  - Implement 24-segment circular arc meters with individual tick cutouts for containment integrity and drone battery endurance.
- **Cell Heatmaps & Threshold Sparklines:**
  - Embed 7×12 micro-cell heatmaps in `LeftPanel.tsx` to monitor RF signal-to-noise ratio across all active drones.

### Pillar 4: Mathematical Geometry & 60-30-10 Color Discipline
- **Concentric Radius Law ($R_{\text{outer}} = R_{\text{inner}} + \text{Padding}$):**
  - Outer panel container: `padding: 12px`, inner card `border-radius: 8px` $\rightarrow$ outer border-radius must be `20px`.
  - Floating dock pill: Outer capsule `height: 52px`, `border-radius: 26px`, inner action buttons `height: 40px`, `border-radius: 20px`, `padding: 6px`.
- **The 60-30-10 Defense Spec:**
  - **60% Void / Deep Obsidian:** `#06080C` to `#0A0E15` (canvas backdrops, window chrome).
  - **30% Structural Glass / Hairline Surfaces:** `#0F1622` at 70% opacity, `backdrop-filter: blur(20px)`, borders `1px solid rgba(255, 255, 255, 0.08)`.
  - **10% Tactical Functional Accent (Surgical Only):**
    - **Telemetry Cyan (`#00E5FF`):** Nominal telemetry, active flight corridors, verified sensors.
    - **Threat Amber (`#FF9F0A`):** Perimeter breach warnings, degraded link states, human gate hold.
    - **Critical Red (`#FF3B30`):** Kinetic intervention authorization, no-fly violations, structural loss.
    - *Rule:* Never use pure neon fills; use 12% alpha fills with 100% alpha 1px perimeter outlines.

---

## 5. ACTIONABLE ENGINEERING IMPLEMENTATION ROADMAP

| Phase | Focus Area | Key Changes & Target Files |
| :--- | :--- | :--- |
| **Phase A** | **Geospatial & 3D Fix** | Lock 2D canvas strictly to orthomosaic `map-preincident.png`. Transition 3D views to WebGL `SpatialMapCanvas3D.tsx`. Densify polygon lines at 1.0m intervals in `overlays3d.ts` and clamp to DEM elevation. |
| **Phase B** | **TALON Neural Core** | Build volumetric Canvas/GLSL shader orb in `TalonSession.tsx` and `TalonMark.tsx` with 3 cognitive states (idle, evaluating, executing). Replace gooey filter with concentric frosted pill in `ActionBar.tsx`. |
| **Phase C** | **Telemetry Overhaul** | Replace 8px pill bars in `PanelViz.tsx` with 2px hairline gauges and 24-column vertical barcode histograms. Add 24-segment radial arc meters. |
| **Phase D** | **Color & Typography Polish** | Apply strict 60-30-10 palette across `tokens.ts` and `theme.css`. Enforce concentric radius law across all nested card containers. |
| **Phase E** | **Tool-Call DAG & Verification**| Implement agent execution DAG in `TalonCopilotPanel.tsx`. Run full verification gate suite (`typecheck`, `audit:tokens`, `verify:clip`, `verify:routes`). |

---
*Never ratified for implementation. Superseded by `docs/redesign-2026/03-implementation-plan.md` (owner-approved 2026-09-27).*
