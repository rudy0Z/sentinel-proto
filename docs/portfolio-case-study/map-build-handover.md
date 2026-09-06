# Map Build Handover — Sentinel / FlytBase

**Branch the new session should start on:** `feat/map-spatial-os` (latest `64bf19d`, the map-alignment fix)
**Goal of this build:** replace the hand-painted `sentinel-map-overhaul.png` basemap with an authored, low-poly terrain scene. Zones / roads / drones / agents currently sit on top of a photograph *they were not generated from*; the new scene makes the world **data** and the picture a **render of that data**. After this, day / dusk / fog variants are free, pixel alignment is guaranteed by construction, and the case study can honestly claim the same architecture scales to real geography.

---

## 0. Read first (in this exact order)

1. `docs/portfolio-case-study/map-alignment-audit.md` — root cause of the image/SVG drift and the slice law that fixed it. **You must not regress this.**
2. `docs/portfolio-case-study/sentinel-final-fix-status.md` — what M0–M4 + audit fixes + map alignment fix shipped.
3. `docs/portfolio-case-study/sentinel-full-audit.md` — the 8 inconsistencies the audit pass found, in case you re-introduce any.
4. `docs/portfolio-case-study/map-spatial-os-phase1.md` — the original Spatial OS plan; useful archaeology.
5. This file.

Do **not** read `PRODUCT.md`, `DESIGN.md`, or `~/.claude/plans/ok-i-saw-the-fuzzy-music.md` — pre-rebuild references; they will mis-anchor you.

---

## 1. The hand-off in one paragraph

The current Sentinel map renders a static `sentinel-map-overhaul.png` (1691×914) as an SVG `<image>` inside a backdrop SVG, with the overlay SVG (zones, roads, agents, labels) sharing the same `viewBox` and `preserveAspectRatio="xMidYMid slice"`. That's the slice law from `64bf19d`. `roads.ts` already has a hand-authored 23-node graph; `zones.ts` already parses 5 zones; `frame.ts` already does the u/v math. What doesn't exist: a **3D world** that the picture and the data are both renders of.

---

## 2. What you are building

### 2.1 The thesis

> The art asset has been carrying the whole UI. Real fix = make the world **data** and the picture a *render of that data*.

### 2.2 Two-phase build (the plan was already agreed)

**Phase 1 — Build-time render (Option A, ~1–2 days).** A headless Three.js script reads a new `world.ts` (heightfield + building extrusions + roadGraph + zones + vegetation) and renders the diorama to a PNG at exactly **1691×914** in the same blue-steel grade as the current asset. The shell stays exactly as it is. Alignment becomes pixel-perfect *by construction* (zones, roads, drones all share one coordinate frame). Day / dusk / IR variants come for free.

**Phase 2 — Runtime scene (Option B, ~3–5 days).** A live Three.js scene replaces the basemap SVG `<image>`: terrain mesh, extruded buildings, road ribbons, drones as meshes flying the road graph, raycast hit-testing for pointer/drag. SVG overlay either dies or survives as a projected-labels layer. Day/night becomes a sensor-mode story (EO day / IR night) — *not* a palette toggle, a different sensor interpretation. Architecture is identical to a MapLibre / Cesium 3D deployment in production; real geography just swaps in via the same interface.

**Do not start Phase 2 before Phase 1.** Phase 1 is the safe 80% and the case-study artifact. Phase 2 is the 100% that also gives you camera work, sensor modes, and a defensible "this is what production looks like" answer.

---

## 3. Phase 1 plan — the build-time render

### 3.1 What to author

A new `src/app/map/world/world.ts` exporting a single `WORLD` constant. Schema:

```ts
export interface World {
  // 32x18 grid (matches 16:9 in a 1691x914 frame at low res). Each cell is
  // a metres value; 0 is valley floor, 1 is ridge top. Authored to match
  // the diorama's composition: ridge in the top third, residential grid
  // filling the bottom third, corridor valleys between.
  heightfield: number[][];

  // Two parallel road ribbons: vertex pairs in world-frame metres. The
  // graph in roads.ts stays as the *semantic* network; these are the visual
  // ribbons rendered under the SVG overlay.
  roadRibbons: Array<{ id: string; width: number; points: Array<[number, number]> }>;

  // Box footprints in world-frame metres. ~250–400 boxes is enough for the
  // residential grid; 1.5x1.5 each in the bottom third, larger at the ridge
  // base. Group by zone to keep `applyZoneMargin` working.
  buildings: Array<{
    id: string;
    footprint: Array<[number, number]>;  // 4-point polygon
    height: number;                        // metres
    zoneHint: string;
  }>;

  // Fire as a diegetic light source. Three emissive lines tracing the
  // ridge scar, plus a smoke billboard. Same role as the current asset.
  fire: {
    line: Array<[number, number, number]>;   // x,y,z start
    end:  Array<[number, number, number]>;
    smoke: Array<[number, number]>;          // billboard position
  };

  // Optional flavor: water in the western valley, sparse trees at the
  // ridge base. Keep this minimal — mood comes from fog + the single light.
  vegetation: Array<{ point: [number, number]; kind: "tree" | "shrub" }>;
  water: Array<[number, number]>;

  // Authoring frame. Everything in world.ts is in metres within this box.
  // Convert to the existing u/v frame with: u = x / frame.width,
  // v = (frame.height - z) / frame.height  (z is depth; the existing
  // convention in roads.ts / mockData is y-down, but in 3D we use z for
  // depth — the render pipeline does the flip).
  frame: { width: number; height: number };  // metres, e.g. 2000 x 1100
}
```

### 3.2 The renderer (headless Three.js)

New file `scripts/render-world.mjs`:

- Load `WORLD` from `src/app/map/world/world.ts` (use `tsx` so you can import TS directly — the project already uses `tsx` for `verify:machine`).
- Set up a Three.js scene with one `PerspectiveCamera` at a fixed position (the diorama is shot from the south-southwest, ~30° elevation, ~1.2× frame depth, looking north).
- One `DirectionalLight` (cool blue, low intensity), one `PointLight` at the fire (warm, emissive material baked into the fire mesh), one `AmbientLight` (very low). Fog (`THREE.Fog` blue-steel, near=0.4, far=1.4) is what makes the mood cheap — the rest of the scene reads because the fog does the work.
- Materials: `MeshStandardMaterial` for terrain, `MeshLambertMaterial` for buildings (cheap + mood-appropriate), `MeshBasicMaterial` for the fire (emissive), `MeshStandardMaterial` for road ribbons.
- Render at exactly 1691×914 to an offscreen `WebGLRenderTarget`, export to PNG with the same palette: extract the existing asset's dominant colours from `sentinel-map-overhaul.png` and bake them into the materials' `color` properties.
- Output: `src/assets/sentinel-map-overhaul.png` (overwrite in place). Keep a copy of the current asset as `sentinel-map-overhaul.bak.png` until you've A/B compared the output.

### 3.3 Acceptance criteria for Phase 1

A pre-rendered diff between the old and new asset at the same 1691×914 frame, sampled at the 5 zone centers and 23 road nodes. **Drift < 2px** at every sampled feature. If the new asset can't land the residential polygon on the rooftop grid, the world data is wrong — fix the data, not the renderer.

### 3.4 What does NOT change in Phase 1

- `frame.ts`, `zones.ts`, `roads.ts`, `agents.ts`, `routes.ts`, `types.ts` — all unchanged.
- `SpatialMapCanvas.tsx` — unchanged. It already consumes the basemap through the slice law and the overlay as a peer SVG. The only edit is to optionally re-export a `mapImageSrc` that points to a different file (or the same one).
- The whole TALON stack, the chrome, the rails — all unchanged.

### 3.5 Output

- `src/app/map/world/world.ts` (data)
- `scripts/render-world.mjs` (renderer)
- `src/assets/sentinel-map-overhaul.png` (replaced; old backed up as `.bak.png`)
- A short note in `docs/portfolio-case-study/sentinel-final-fix-status.md` appending "Phase 1 (built scene) shipped" with the new SHA

---

## 4. Phase 2 plan — the runtime scene

Don't do this until Phase 1 is in. The handover is included so the next session has the destination, but the work is bigger.

### 4.1 What changes

- `SpatialMapCanvas.tsx` swaps the backdrop `<svg><image>` for a `<canvas>` (or a React `<Canvas>` from `@react-three/fiber` if you want declarative; vanilla Three is fine).
- The overlay SVG survives as a HUD layer projected from the same world frame (raycast from camera through a screen point → world point → u/v for the overlay).
- Pointer/drag becomes raycast: `pointerToNative` is replaced with `THREE.Raycaster.intersectObject(terrainMesh).point` (or a building hit-test if the click lands on a roof).
- `world.ts` becomes the single source of truth. The SVG overlay reads polygon vertices from `zones.ts`, the buildings render in the 3D scene, the road network renders as extruded ribbons **and** as overlay lines that the SVG still draws for the planner's eye.
- Day / IR variant = swap the directional light's colour and the fog density. No code path forks; one parameter changes per variant.

### 4.2 Why this fixes the "in actual production this was proper maps" question

The architecture is identical to a MapLibre / Cesium 3D deployment. The only difference is the data source: in production, terrain tiles come from a server; in the prototype, terrain comes from `world.ts`. The interface is the same — `terrainMesh`, `buildings[]`, `roads[]`, `zones[]` — so the case study can say "this is what production looks like" without lying.

---

## 5. What you must not break

These are the contracts the rest of the app depends on. Touching them is a bigger conversation than the map build.

- **The slice law.** `verify:map` has three regression gates that fail if anyone reintroduces a divergent scaling law: `map-basemap-in-svg`, `map-svg-slice-law`, `map-pointer-slice-inverse`. Phase 1 keeps the basemap inside the SVG coordinate space (still slice); Phase 2 replaces the SVG `<image>` with a `<canvas>` rendered by Three.js at the same `viewBox` and slice mapping. The map container continues to use the same `viewBox="0 0 1440 900"` coordinate frame the overlay uses. **Do not split into two viewBoxes.**
- **The state derivation.** `deriveTalonSurface` in `domain/talonSurface.ts` is the single source of truth for orb color, voice, mark, and session phase. Phase 1 doesn't touch it; Phase 2 doesn't touch it.
- **The data contracts.** `World` is a new schema, but `ZoneModel`, `RoadNetwork`, `AgentPose` stay as the canonical types the rest of the app reads. Phase 1 generates `WORLD` (raw geometry); the existing parsers continue to produce `ZONE_MODELS` and `ROAD_NETWORK` from the existing inputs. The world data and the data the app consumes are not the same thing; keep them separate.
- **The five gates.** `npm run check` covers `tsc + audit:tokens + verify:map + verify:flows`. `verify:routes` runs separately. All five must stay green. If Phase 1's new dependencies (e.g. `three`) cause `audit:tokens` to flag the new files, fix it; do not silence the gate.

---

## 6. The single most important rule

**One world, one derivation, one coordinate frame.** If you find yourself adding a second viewBox, a second basemap, a second zone-frame, or a second state derivation — stop. The plan was authored against the property that everything in Sentinel reads one thing, and the map build must extend that property, not fork it.

---

## 7. What success looks like at the end of Phase 1

A pre-rendered diorama at 1691×914 that:

1. Lands the 5 zone polygons on the same terrain features the current asset does (drift < 2px at center of each zone).
2. Renders the 23-node road graph as visible ribbons.
3. Renders the fire as a diegetic light source (warm) against a blue-steel cool scene — same mood as the current asset, no game-graphic warmth, no chromakey saturation.
4. Survives `npm run check` (all 5 gates green).
5. Survives `scripts/audit-map-alignment.mjs` (drift table shows ≤ 2px at all zone centers).
6. Looks, at first glance, like a *better* version of the current asset — sharper, more consistent, still cinematic, still blue-steel.

That's it. If you have those six, Phase 1 is done. Take the case study artifact photo, update the status doc with the new SHA, and the case study now has a "world authored, world rendered" narrative that no other portfolio piece has.

---

## 8. Files you'll touch

- **Create**: `src/app/map/world/world.ts`, `scripts/render-world.mjs`
- **Modify**: `src/assets/sentinel-map-overhaul.png` (overwrite), `package.json` (add `three` + `@types/three` + the render script), possibly `scripts/verify-map.mjs` if you want a "world asset was generated by scripts/render-world" structural gate
- **Don't touch**: any of the existing source code unless the render script needs a small exported helper

## 9. Reference paths the next session will need

- `src/app/map/frame.ts` — for the `fromPixel` / `toScreen` conversion when porting world-space back to u/v
- `src/app/map/roads.ts` lines 1–80 — the existing 23-node graph to port into `world.ts` as `roadRibbons`
- `src/app/mockData.ts` `ZONES` — the existing 5-zone polygons to port into `world.ts` as the zone polygons
- `src/app/map/SpatialMapCanvas.tsx` lines 590–700 — the slice-law render path you must not regress

Good luck. The data, the contracts, and the gates are ready. Author the world.
