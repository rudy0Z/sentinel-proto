# FlytBase Sentinel V2: Master Blueprint Vault
## 02 — Spatial OS & 3D WebGL Map System

> **Document Status**: Canonical 3D Graphics & Spatial Interaction Standard  
> **Repository Location**: `docs/sentinel-v2-master-plan/`  
> **Target Audience**: 3D Graphics Engineers, Creative Technologists, Spatial Product Designers  

---

## 1. The Spatial Architecture Thesis

> *"The art asset cannot carry the whole UI. The world must be **data**, and the map a **live render of that data**."*

In Sentinel V2, the map is not a passive background image. It is an **interactive spatial coordination surface** built on real geographic datasets:
- **Terrain Elevation**: USGS 3DEP 10m Digital Elevation Model (DEM) — 400×220 binary grid (`dem.bin`).
- **Urban Structure**: OpenStreetMap (OSM) vector building footprints (`buildings.json`).
- **Road Infrastructure**: OSM connected road graph (`roads.json` / `roads.ts`).
- **Vegetation**: ESA WorldCover 10m land cover grid (`vegetation.json`).

---

## 2. Phase A Retrospective: The 12-Draw-Call Performance Breakthrough

Prior to the Phase A refactor, entering 3D EXPLORE mode severely lagged on high-DPI retina displays, running at ~4–12 FPS.

### 2.1 The Bottlenecks Discovered
1. **Per-Building Draw Calls**: 2,495 separate `THREE.Mesh` instances with individual scene-graph traversals and frustum tests (~3,500 draw calls per frame).
2. **Road Geometry Fragmentation**: Hundreds of clipped road segments rendered as independent meshes.
3. **Uncapped Retina Rendering**: `min(2, window.devicePixelRatio)` on MacBook Retina displays forced 8.3 million fragments per frame through Lambert lighting and 4x MSAA.
4. **Unconditional RAF Loop**: Burning GPU cycles rendering identical frames at 60 FPS even when the camera was completely static.

### 2.2 The Solution Shipped
```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                PERFORMANCE REFACTOR COMPARISON                                   │
├────────────────────────────┬──────────────────────────────────┬──────────────────────────────────┤
│ Metric                     │ Legacy 3D Map                    │ Sentinel V2 Phase A Shipped      │
├────────────────────────────┼──────────────────────────────────┼──────────────────────────────────┤
│ Total Draw Calls           │ ~3,500+ calls/frame              │ Exactly 12 calls/frame           │
│ Buildings Rendering        │ 2,495 individual meshes          │ 1 batched InstancedMesh (unit-box)│
│ Road Network               │ Fragmented buffer geometries     │ 2 merged geometries (arterial/local)│
│ Render Loop                │ Unconditional 60 FPS RAF loop    │ On-Demand rendering (dirty-flagged)│
│ Idle GPU Load              │ 100% continuous draw             │ 0 FPS / 0 GPU draw when static   │
│ Pixel Ratio Cap            │ 2.0x (8.3M fragments)            │ Capped at 1.25x                  │
│ Production Telemetry       │ None                             │ Built-in Dev/Prod HUD (FPS/Calls)│
└────────────────────────────┴──────────────────────────────────┴──────────────────────────────────┘
```

---

## 3. Phase B: 3D Operational Overlays (Closing the Thesis Loop)

While Phase A delivered a rock-solid 60 FPS terrain engine, **the 3D world currently renders an empty landscape without the active emergency**. 

To fulfill the thesis *"when the camera feed dies, the 3D world is the operator's window"*, the 2D tactical overlays must be projected directly into the 3D scene.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                            3D OPERATIONAL OVERLAYS INJECTION PLAN                                │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. 3D TACTICAL ZONE RIBBONS:                                                                     │
│    • Drapes the 5 perimeter boundaries (Forest Zone, Buffer 1/2, Residential 1/2) over the DEM   │
│      elevation using Three.js `Line2` fat vector lines (width: 3px, antialiased).                │
│    • Elevated +4m above terrain to prevent z-fighting with the ground plane.                     │
│                                                                                                  │
│ 2. CONCENTRIC SPREAD RINGS:                                                                      │
│    • 15 MIN (Red `#E5533C`), 30 MIN (Amber `#FF8A4A`), and 60 MIN (Muted `#9BA8B8`).            │
│    • Rendered as dashed horizontal bezier rings hovering +15m above terrain elevation.           │
│                                                                                                  │
│ 3. EVACUATION CORRIDOR GLOW RIBBONS:                                                             │
│    • Route A (East Ridge Road) and Route B (Valley Ingress) rendered as glowing ribbons.         │
│    • Dynamic color coding: Solid Cyan (Active Egress), Dashed Amber (Standby), Red (Compromised) │
│                                                                                                  │
│ 4. FLOATING TACTICAL LABELS (CSS2DRenderer):                                                     │
│    • Screen-space HTML/SVG chips anchored to 3D world coordinates.                               │
│    • Labels ("BUFFER ZONE 1", "SCOUT-01 · 84%", "GRID 4C") scale crisply without 3D blur.       │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 2D ↔ 3D Camera Synchronization

Currently, exiting 3D EXPLORE resets the 2D map to default zoom. In a mission-critical console, spatial context must never be lost.

### 4.1 Coordinate Translation Math
1. While orbiting in 3D, track the camera's `controls.target` coordinates `(sceneX, sceneZ)`.
2. Convert scene coordinates back to world local metres:  
   $$x = \text{sceneX}, \quad y = -\text{sceneZ}$$
3. Map local metres to normalized map UV coordinates:  
   $$u = \frac{x + W/2}{W}, \quad v = \frac{H/2 - y}{H}$$
4. Upon pressing `ESC` or clicking `EXIT 3D`:
   - Pass `(u, v)` to `SpatialMapCanvas`.
   - Smoothly animate the 2D pan and zoom transform (`transition: transform 300ms ease`) centered on the exact sector inspected in 3D.

---

## 5. Diegetic IR / Night Sensor Mode

Rather than a simple CSS dark-mode toggle, Sentinel implements an authentic **Long-Wave Infrared (LWIR) sensor pipeline**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   LWIR SENSOR MODE PIPELINE                                      │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. TERRAIN REFLECTIVITY INVERSION:                                                               │
│    • Background fog and ambient light shift to charcoal/black (`#0D121A`).                       │
│    • Topographic terrain rendered with inverted thermal reflectance (cooler ridges read darker). │
│                                                                                                  │
│ 2. HIGH-EMISSIVITY HEAT BLOOMS:                                                                  │
│    • Fire crest radiates intense white-hot core (`#FFFFFF`) blooming into vivid orange.         │
│    • Smoke billboards switch to semi-opaque thermal occlusion plumes (absorbing IR radiation).   │
│                                                                                                  │
│ 3. DRONE SENSOR COVERAGE CONES:                                                                  │
│    • Drones project semi-transparent downward frustum cones onto the ground plane.               │
│    • The footprint shows active radiometric FLIR coverage in false-color thermal gradient.       │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Drone Garage Allotment — Drag as Staging (Desktop-First)

Modern emergency operations centers utilize large touch tables (55"–85") and field command tablets. Designing drone dispatch as a **staging gesture** is the differentiator: the drop *proposes* an assignment, TALON confirms, and every gated action keeps its human gate (drag-as-staging, never drag-as-execution). Touch surfaces stay supported via unified PointerEvents, but the acceptance target is the 1920×1080 desktop instrument.

### 6.1 Interaction Flow:
```
[ Left Panel: Assets ] ──(Pointer Down / Touch)──> Lift Drone Card
                                                      │
                                                      ▼
                      [ Drag Over 3D Map ]: Raycaster projects to Terrain
                      • Cyan tether line connects dock to pointer
                      • Eligible zones highlight with pulsing glow
                                                      │
                                                      ▼
                      [ Drop on "Forest Zone" ]: Snap to Centroid
                      • Flight vector automatically draws along road graph
                      • Left rail updates: "En route · ETA 18s"
                      • TALON confirms: "Scout-02 assigned. Confirm?"
```

### 6.2 Technical Implementation:
- Implemented using unified native **`PointerEvents`** (`pointerdown`, `pointermove`, `pointerup`).
- Operates identically across mouse drag, iPad Pro Apple Pencil / touch, and multi-touch control room displays.
- Uses Three.js `Raycaster` intersecting `terrainGeom` to resolve exact 3D coordinates `(x, y, z)` in sub-millisecond time.

---

## 7. Open-Source GitHub Repositories & Algorithmic Engines

To ensure maximum quality, Sentinel integrates architectural patterns from leading open-source projects:

### 7.1 Road Routing & Dynamic Pathfinding:
1. **[`anvaka/ngraph.path`](https://github.com/anvaka/ngraph.path)** *(Recommended)*:
   - Ultra-fast, ~2KB JavaScript/TypeScript pathfinding library implementing A* and Dijkstra on arbitrary graphs.
   - Runs directly on Sentinel’s 23-node road network (`roads.ts`) to compute dynamic obstacle-avoidance routes when fire blocks roads.
2. **[`Project-OSRM/osrm-backend`](https://github.com/Project-OSRM/osrm-backend)** & **[`valhalla/valhalla`](https://github.com/valhalla/valhalla)**:
   - Industry standards for turn-by-turn emergency routing and time-distance isochrones.

### 7.2 3D Spatial C2 & Tactical Visualization:
1. **[`visgl/deck.gl`](https://github.com/visgl/deck.gl)** *(Uber / Open-Source)*:
   - `TripsLayer`: GPU-accelerated animated pathing for drone tracks.
   - `PathLayer`: Draped vector lines on 3D terrain.
2. **[`CesiumGS/cesium`](https://github.com/CesiumGS/cesium)**:
   - Defense aerospace standard for 3D sensor frustums, MIL-STD symbology, and orbital mechanics.
3. **[`milos-agathon/forge3d`](https://github.com/milos-agathon/forge3d)**:
   - Three.js cartographic shader engine for USGS elevation models.
