# Map Rendering — Exploration & Decision

Status: **Resolved.** Operational map = high-fidelity 2D surface with data-driven
interactive overlays. 3D LiDAR reconstruction documented as the production path.

This is the honest record of the map exploration: what we tried, how each
attempt fell short, why, how a real engineering team would build it, and the
decision we landed on. It exists so the detour becomes *evidence of design
judgment*, not a gap to explain away.

---

## 1. Why we explored a rendered map at all

The product thesis: operators can't trust real cameras at night or through
smoke, so drones + LiDAR scan the site and **reconstruct the operator's vision
as a data-built 3D model**. The perspective "vision render" we started with is
literally that reconstruction — so a *live-rendered* version felt like the
thesis expressing itself. The goal was to move the map from "a picture with
stickers on it" to "a coordinate-driven system" that could carry real zonal
regions, drone coordinates, and rescue routes.

That goal was right. The execution path we chose to reach it was the problem.

---

## 2. What we tried, and how each attempt failed (honest)

### Attempt A — SVG overlays on a static perspective render (starting point)
The original map: a pre-rendered 3D image with zones, drones, routes drawn as
flat SVG at hardcoded screen coordinates.
- **Limitation:** no spatial model. Everything is hand-tuned to one camera
  angle. Zones are traced shapes, not regions; spread rings are flat circles on
  a tilted plane; assets sit at pixel coordinates. It works and looks good, but
  it's "locked" — you can't drive it with data.

### Attempt B — React-three-fiber procedural terrain (first real-time attempt)
A displaced-plane terrain + cyan scan mesh inside the app's map layer.
- **How it failed:** rendered far too dark; read as a vague blob. The terrain,
  town, and lake were lost in near-black.
- **Why:** the React-three-fiber `<Canvas>` defaults to ACES tone mapping (which
  crushes darks), the colours were very dark, and the lighting was too weak.

### Attempt C — Standalone WebGL, full spec (photoreal city + mountain + fire)
A detailed prompt: SimplexNoise terrain, merged building city, branching fractal
fire, particles, smoke, UnrealBloom post-processing.
- **What worked:** the **fire** (branching tubes + bloom) and the **moonlit
  mountain** looked genuinely good once the fog/lighting were fixed.
- **How it failed:** the **city** read as procedural — scattered cubes, not a
  believable suburb. It looked like a tech demo, not the cinematic reference.
- **Why:** matching a *pre-rendered* cinematic image with *real-time procedural*
  geometry is the single hardest thing to do in WebGL. It plays to every one of
  real-time's weaknesses (organic terrain, dense believable cities).

### Attempt D — Patch v2 (road grid, matte materials, terrain exclusion, calm fire)
Added an explicit road grid, terrain exclusion (no buildings on the slope),
varied buildings, flat matte LinearToneMapping, calmer fire.
- **What worked:** the **road grid** finally made the city read as a grid; the
  structure was correct; matte look was right.
- **How it failed:** the patch's brightness targets crushed the scene to
  near-black (mountain + city vanished) — twice — and the city density still
  looked sparse/odd next to the reference.
- **Why:** the patch over-corrected toward "dark" because it was written against
  an over-bright build; the *reference* is dark-MOOD but clearly lit. Calibrating
  density + brightness to match a photoreal render is a long tail of tuning.

### Attempt E — Stylized "Montfort + tactical" terrain, in-app
Pivoted away from photoreal to an elegant stylized vision map (smooth landform +
cyan scan mesh + atmosphere) built into the operational map layer.
- **How it failed:** in the cramped operational map area, behind the dense UI,
  with the existing 2D overlays floating on top in *non-matching* coordinates, it
  looked cluttered and small — not the elegant hero it is in isolation.
- **Why (the key insight):** an elegant WebGL scene is a **full-bleed hero**. An
  operational command map is a **framed working surface with crisp overlays**.
  They're different jobs. Forcing the hero into the operational slot fights
  everything good about it.

---

## 3. The root lesson

Two separate truths emerged:

1. **Faking a cinematic pre-render in real time, procedurally, is the wrong
   approach** — not because the feature is infeasible, but because that *method*
   is the hard way and looks like a demo.
2. **A cinematic 3D hero and a dense operational map are different surfaces.**
   The elegant render wants full-bleed room; the operational map wants a stable
   frame and legible data overlays.

Neither truth says "3D maps are impossible." Both say "we were using the wrong
tool for the wrong slot."

---

## 4. How an actual engineering team would build this (the production path)

A real 3D wildfire command map is **geospatial engineering**, not a UX-prototype
task. The buildable, shipped pattern:

| Layer | Production approach |
|---|---|
| Engine | **Cesium**, **deck.gl**, or **Mapbox GL JS** (3D terrain + extrusions) |
| Terrain | Real **DEM** elevation — USGS 3DEP LiDAR GeoTIFF → heightmap |
| Buildings | **OSM / Mapbox** building footprints, extruded by `building:height` |
| Fire perimeter | Live **NIFC / FIRMS** active-fire GeoJSON, polled ~30s |
| Coordinates | EPSG:4326 (lat/lng) → world projection via mercator offset |
| Drones | FlytBase telemetry WebSocket → marker layer, updated per frame |
| Assets | GeoJSON zones, routes, staging — the same data the 2D surface uses |

This is weeks of specialist (geospatial + 3D) work with real datasets. It is
absolutely buildable — it's a known production pattern — but it is **out of scope
for a UX prototype**, and faking it by hand produces a tech demo, not a command
system.

---

## 5. The decision

**Operational map = a high-fidelity 2D surface + a data-driven interactive
overlay** (selectable zones, coordinate-driven drones, route guidance, living
fire + LiDAR scan FX). This is what we shipped and what we're keeping.

Why it's the right call, and defensible to an engineering lead:
- **Delivers the operator value** — the map's job is interaction and situational
  read, not camera orbit. A command picture is *stabilized*, not flyable.
- **Performant and reliable** — no heavy real-time 3D, no fragile shader tuning.
- **Clean handoff** — a clear data contract (zones = polygons, drones =
  coordinates, routes = paths) plus "render in 3D with Cesium + DEM when we
  productionize." That spec is a *better* handoff than a bespoke WebGL scene.
- **Honest** — it doesn't claim to be a real-time 3D engine it isn't.

3D LiDAR reconstruction is documented above as the **production path**, not
abandoned.

---

## 6. Alternatives matrix (for the case study)

| Option | Why considered | Why not (for the prototype) |
|---|---|---|
| Real-time procedural WebGL terrain | Most literal LiDAR thesis | Fakes a pre-render the hard way; fragile; perf cost |
| Geospatial engine (Cesium/deck.gl + DEM/GeoJSON) | The correct *production* answer | Out of scope for a UX prototype; ties fiction to real geo |
| Stylized WebGL hero (Montfort/tactical) | Premium, achievable | Wrong fit *behind* a dense operational UI; it's a hero, not a map |
| **2D surface + data-driven overlay** ✓ | Performant, interaction-first, clean handoff | **Chosen for the operational map** |

---

## 7. What this demonstrates (the point for interviews)

- **Feasibility awareness** — knowing the production stack (Cesium/deck.gl, DEM,
  GeoJSON) and that it's specialist geospatial work.
- **Scope discipline** — prototype vs production; validate the concept, ship the
  reliable surface.
- **Prioritization** — optimise for operator value + clean handoff, not a tech
  demo.
- **Integrity** — not claiming a capability the artifact doesn't have.

The map detour is not a failure to hide. It is a design-exploration record — the
kind of feasibility reasoning that separates a product designer from a screen
decorator.

---

## Artifacts
- `sentinel-webgl-map.html` — the standalone WebGL exploration (best-looking
  result: moonlit mountain + branching bloom fire + road-grid city). Kept as the
  exploration artifact; could later become a full-bleed case-study *hero*, where
  the elegant render actually belongs.
