# Sentinel Map System — Architecture A→Z

**Branch:** `feat/map-spatial-os` · **Latest:** `84f0e0f` (EXPLORE) ← `a0ad5c1` (Phase 1 v2)
**Status:** working & gated; Phase A (performance) + Phase B (UI defects) implemented and verified, uncommitted on this branch

---

## 1. The thesis

The original basemap was a hand-painted PNG the operational data (zones, roads, drones, agents) sat *on top of* but was never generated from. The fix, per the handover thesis: **make the world data, make the picture a render of that data.** Product reason (sharper than craft reason): when the drone feed dies (Ghost Mode), the spatial world + accumulated data is the operator's only window — the map must be the source of truth, not a picture.

## 2. The place

**Encinal Canyon WUI, Malibu, California.** Center `34.032, -118.815`, frame **6.0 × 3.25 km** (aspect 1.85:1 — matches the 1691×914 canvas exactly). The frame was chosen by scoring three candidate bboxes on: steep ridge in the top third, flat buildable bottom third, OSM building density. Real place, real fire corridor (Woolsey 2018), named in the case study.

Composition earned from data: DEM quadrant analysis (NE=212m max 491m, NW=171m, SW=22m, SE=54m) → camera SE-looking-NW → massifs backdrop, residential foreground. Fire band authored on the **NE massif's real crest trace** (x +980..+1165, y +980..+1600, 374–489m).

## 3. Data pipeline (`scripts/fetch-world-data.py --force`)

| Source | What | Output |
|---|---|---|
| USGS 3DEP (National Map ImageServer `exportImage`, WGS84 bbox) | 400×220 elevation grid, 492m relief | `dem.bin` (Int16 LE, rows N→S, cols W→E) + `dem.json` (metadata only — grid is in the binary) |
| OpenStreetMap (Overpass, mirror fallback + 20s backoff) | 2,495 building footprints (+heights), 873 road ways (+class/width), 10 landuse polygons, local metres | `buildings.json`, `roads.json`, `landuse.json` |
| ESA WorldCover v200 10m (tile `N33W120`, windowed COG read via rasterio) | 260×118 land-cover grid (10 tree / 20 shrub / 30 grass / 40 crop / 50 built / 60 bare / 80 water) | `vegetation.json` |
| frame metadata + attribution | center, size, projection, credits | `frame.json` |

Rules: incremental saves (a rate-limit can't wipe completed fetches); `dem.npz` is Python-side only and gitignored; **`dem.json` no longer carries the grid** — consumers must use `loadWorld()`.

## 4. Coordinate conventions (memorize these)

- **World:** local metres, origin at frame center, `+x` east, `+y` north.
- **MapFrame (overlay/SVG):** `u = (x + W/2)/W`, `v = (H/2 − y)/H` (v=0 at north edge).
- **Scene (Three.js):** `(x, elevation×VEX, −y)` — north points away from a south-side camera.
- **VEX = 1.6** vertical exaggeration (cartographic standard; real 492m relief reads correctly with it).
- One world, one derivation, one coordinate frame. A second frame is a bug.

## 5. Architecture (who does what)

```
scripts/fetch-world-data.py          bake real data → src/app/map/world/*.json + dem.bin
src/app/map/world/world.ts           typed access: loadWorld(), sampleElevation (bilinear),
                                     sampleVegetation, localToUv/uvToLocal
                                     + AUTHORED scenario data: fire band, spread rings,
                                     proposed drones, evacuation corridors, TFR, wind
src/app/map/runtime/worldScene.ts    SHARED scene builder (used by both consumers):
                                     terrain 240×130 veg-tinted + rock-on-steep-slope,
                                     plinth, roads, buildings, instanced forest, fire
                                     (emissive band + glow + point light), smoke sprites;
                                     makeRenderer / makeScene / homePose
scripts/render-world-entry.ts        thin bake wrapper: load → build → homePose → PNG
scripts/render-world-harness.html    canvas page served by Vite
scripts/render-world.mjs             Playwright driver (headless Chromium + WebGL,
                                     readPixels → 2D canvas → dataURL → file)
src/app/components/Map3DExplorer.tsx in-shell EXPLORE overlay (navigable canvas)
src/app/components/SentinelShell.tsx EXPLORE · 3D toggle + conditional mount
```

**Two consumers, one dataset:**
1. **Bake PNG** (`npm run render:world`) → `src/assets/sentinel-map-overhaul.png` at exactly 1691×914 — the 2D ops authority (SVG overlay + slice law land on it).
2. **EXPLORE live canvas** — situational awareness, outside the critical 90-second flow.

PNG extraction must go `gl.readPixels → 2D canvas → dataURL` — `canvas.toDataURL()` races the WebGL clear in headless Chromium.

## 6. Visual language

Blue-steel diorama, no true blacks: valley `#3A4A5C` → mid `#4C5E72` → ridge `#8CA0B4`; vegetation tints (forest `#3A5240`, scrub `#57644A`, grass `#5E6C54`) lerp 62% over the elevation ramp; rock on steep slopes; buildings pale `#DAE2EA`; roads `#98A8B8` / arterial `#C2D2E0`; fog `#2A3A4E` 3500–11000; fire `#FF7A3C`/`#FFB066` as the single warm accent + `PointLight`; Lambert flat-shading throughout; ambient 2.0 + NW key + SE fill.

## 7. Current state

**Committed & green:** `84f0e0f`. **Phase A + Phase B implemented & verified (uncommitted):** all five gates green, draw calls ~3,500 → **12** (terrain 1, plinth 1, roads 2, buildings 1, forest 1, fire 2, smoke 3, +1 pass), bake pixel-identical apart from tree jitter (now seeded → bakes reproducible bit-for-bit), on-demand rendering confirmed idle FPS → 0 with continuous rendering during interaction.

## 8. Phase A — performance plan (DONE — all six steps)

1. **Roads → 2 merged geometries** (arterial / local buckets) — DONE.
2. **Buildings → 1 InstancedMesh** (unit box, per-instance matrix + `instanceColor`); `bldgGeoCache` deleted — DONE. Also merged: plinth sides (4→1) and fire band+glow (9→2, per-vertex alpha preserves `0.26 × intensity`).
3. **On-demand rendering** — DONE. `requestWorldRender()` (module-level in Map3DExplorer) marks dirty and wakes the stopped RAF loop; pointer/wheel/resize/world-load/fly-by all re-render; idle = loop fully stopped.
4. **DPR cap 1.25** in `makeRenderer` — DONE.
5. **Instrumentation** — DONE. Dev-only HUD (`{fps} FPS · {calls} CALLS · {n}K TRIS`), sampled on a 1s interval (the render loop itself stops when idle); a `window.__sentinelExplore = {renderer, scene, camera}` dev handle supports per-object call breakdowns.
6. **Verify** — DONE. Bake diff: 0.0000% vs seeded re-bake; vs pre-refactor baseline only tree-jitter + fire-edge sub-pixel AA. EXPLORE verified at 1366/1600. `npm run check` + `verify:routes` green.

Bake-driver hardening (same effort): poll-loop instead of `waitForFunction` (RAF polling flaky), WebGL context-loss detection + 3 page retries (SwiftShader loses context mid-bake), Windows port-based Vite kill (shim `kill()` orphans the real server), seeded forest PRNG (`mulberry32`) for reproducible bakes.

## 9. Phase B — UI defects (DONE & VERIFIED)

1. **TALON drawer ↔ CompactPanel collision** — SOLVED. The original `TopOverlay` was dead code, but the real culprit was `<CompactPanel>` in `contain-alternate` and `contain-degraded`. When the operator clicked the TALON orb, the expanded drawer and `CompactPanel` collided in the screen center. Fixed by adding a `collapsed={isActionBarExpanded}` state to `<CompactPanel>`, which smoothly folds into a slim, non-blocking tactical status pill (`● Alternate containment plan active TALON SESSION ACTIVE`) at `top: NAVBAR_H + 12px` whenever the TALON session opens.
2. **EXPLORE chrome & 3D isolation** — SOLVED. HUD + controls moved below the navbar (`shell.navHeight + 12/10`). All 2D scene overlays (exception banners, battery interrupt, contested watch, re-raise, alert popup, escalation takeover, and `CompactPanel` in `contain-alternate/degraded`) are strictly gated on `!explore3d`. Zero alert-layer (z≥60) leaks while EXPLORE is active.
3. **ReviewDock right-offset** — FIXED. Corrected the right offset formula from `adaptiveRailWidth + SCREEN_INSET + 12` (which used the left rail width of 280/320px) to `adaptiveTalonRailWidth + SCREEN_INSET + 12` (which accurately references the right rail width of 300/340px), restoring the intended 12px clearance.
4. **Tokenize Map3DExplorer** — DONE. 4 tracking warnings fixed (3 exact-token `0.1em` → `tracking.eyebrow`, 1 novel `0.14em` → `tracking.eyebrow`); audit **244 → 240** (< 242 target).
5. **Live 3D telemetry in production** — ACTIVATED. The `{fps} FPS · {calls} CALLS · {tris} TRIS` HUD readout runs unconditionally in production as well as dev, with an immediate initial frame read (`60 FPS · 12 CALLS · 178K TRIS`) that drops to `0 FPS` on idle, giving evaluators direct proof of the graphics optimization.
6. **Liquid-plate hairline** — not taken (optional; halo verified absent).

## 10. Contracts that must not break

- **Slice law** + `verify:map` 9 checks (`map-basemap-in-svg`, `map-svg-slice-law`, `map-pointer-slice-inverse`).
- **`deriveTalonSurface`** — single source of truth for orb/voice/mark/phase.
- **`ZoneModel` / `RoadNetwork` / `AgentPose`** stay canonical for the app; world data (`WORLD`) is render-side and separate.
- **Five gates**: `npm run check` (tsc + tokens + verify:map + verify:flows — flows need Vite on :4190) + `verify:routes`.
- World data (geography) ≠ scenario data (incident). Geography is fetched; scenario is authored in `world.ts`.

## 11. Operational gotchas

- **Overpass 429s**: mirrors + 20s backoff built in; fetches save incrementally.
- **USGS ImageServer**: `exportImage` with WGS84 bbox, `size=400,220`, tiff F32.
- **WorldCover tiles**: named by lower-left 3° corner; ours is `N33W120`; windowed read via rasterio COG.
- **`render:world` readiness**: the old `waitForFunction` (RAF polling) was flaky — the driver now uses a poll loop + WebGL context-loss detection + 3 page retries (SwiftShader loses context mid-bake occasionally; a fresh load succeeds), and kills Vite by port on Windows (shim `kill()` orphans the real server).
- **Stale Vite on :4317** breaks `--strictPort` restarts → `taskkill //PID <pid> //F` first.
- **flows** need a dev server on `:4190` (`npx vite --port 4190` in background).

## 12. Future roadmap (post Phase A/B)

1. Project the 2D SVG overlays (zones, spread rings, drones, agents) into the 3D scene through the live camera — the handover's Phase-2 overlay plan.
2. 2D/3D camera sync on EXPLORE exit (2D view jumps to the explored region).
3. IR/night sensor mode = swap directional light color + fog density ("not a palette toggle — a different sensor interpretation").
4. Drone meshes flying the road graph; raycast building selection (feeds the LIDAR/mapping narrative).
5. Optional: worker-based world build if the frame ever grows again.

## 13. Reference repos (what each contributed)

- `tentone/geo-three` — tile-based terrain technique; Phase 2 runtime reference.
- `w3reality/three-geo` — DEM+imagery → mesh confirmation.
- `xyzmaps/xyz-threejs` — production 3D map engine architecture.
- `milos-agathon/forge3d` — path-traced cartography from USGS DEM + land cover; the look target and proof our exact data types produce that quality.
- `opengeos/GeoLibre` — MapLibre + deck.gl patterns, terrain toolbox.
- `img2threejs` — procedural asset builder (future props).
