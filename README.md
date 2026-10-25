# Tactical Terrain Engine

> **Start with [HANDOFF.md](HANDOFF.md)**: the Sentinel console (`index.html`, `commandConsole.ts`), the TALON copilot (`talon.ts`), the optional live-model adapter (`talonAgent.ts`), the governance rules, open decisions and what is left. The design system renders at `tokens.html`. This README covers the engine and the bench harness.

A Three.js (r170) terrain and map engine for emergency command displays, plus a player that runs an incident as a timeline. Three tiers:

| tier | file | knows about |
|---|---|---|
| 1 · engine | `terrainEngine.ts` | terrain, vegetation, roads, structures, generic layers (line, polygon, points, marker, labels, time-of-arrival field), units, cameras, drone feed. Nothing about fires, plans or incidents. |
| 2 · situation | `data/scenarios/*.json` + `scenarioPlayer.ts` | phases, timed layers, plan routes and decisions. Mounts a situation on any engine through its public API. |
| 3 · shell | `index.html` + `commandConsole.ts` | the operator console: topbar (posture pill, orb), decision cards, situation board, on-demand TALON drawer. `harness.html` stays as the engine bench. |

`scenarioFixtures.ts` holds incident content used by the tools and the procedural demo (`simulateFireRun`, `fireArrivalField`, `buildDemoScenario`). The compiled `.js` modules are inlined into `harness.html` so it also runs from `file://`; `three` comes from jsDelivr through an import map.

```sh
npm install
npm run serve        # http://127.0.0.1:8130/  (console) · /tokens.html (design system) · /harness.html (bench)
npm run verify       # headless checks (32): governance, journey arcs, live-model adapter, a11y, engine
npm run build        # tsc + re-inline the three modules into harness.html
npm run data         # re-download ./data/ and rebuild the scenario + situations
npm run phases       # screenshot every phase into qa/ and print draw calls per phase
```

Over HTTP the harness opens the real Encinal data on the WUI breakout at Phase A (Standby). From `file://`, or with `?data=procedural`, it falls back to the procedural fixture as a one-phase snapshot. URL flags: `?situation=standby|small-incident|contain|falsepos|wui-breakout`, `?phase=D`, `?lighting=day`. Keys: `←`/`→` phase, `P` auto-play, `2`/`3` view, `L` lighting, `T` thermal, `X` relief, `F` drone feed, `M` motion.

## Situations

Five arcs, all on the real Encinal Canyon data (`data/scenarios/`):

- `standby` — the place and the assets, no incident.
- `small-incident` — one detection, one engine, a short hand line, never a perimeter.
- `contain` — a containable fire: **no evacuation, but the authority is still notified** (the CAD report queues the mutual-aid dozer that makes containment possible).
- `falsepos` — the heat is a permitted burn: the dismissal is the recommended call, and the save is the story.
- `wui-breakout` — the full incident (A→G), with failure injects: a registry-vs-IR source conflict, a battery handover with a failsafe branch, and a GOES-West IR feed loss.

## Incident flow

The map is a function of (situation, scene time, decisions). `player.setTime(t)` is a pure resolution, so scrubbing back restores the earlier state exactly (`verify` checks this).

| phase | t | map shows | engine primitives |
|---|---|---|---|
| A Standby | T−0:30 | place and assets: FT-01 on a sweep, E-31, E-32, SH-12 available | `labels`, units with `patrol` |
| B Detection | T+0:00 | one pulsing detection point (unconfirmed, confirmed at T+0:06); FT-01 retasked, IR feed | `marker` (`pulse`, `tone`), unit `track` |
| C Sizing | T+0:20 | burned area, flame front, +15 / +30 / +60 min isochrones, head axis, wind, triage | `field` (time-of-arrival grid) |
| D Plan | T+0:38 | zones, Route A primary, Route B alternate, choke, staging, dozer line, all **proposed**; gated order with expiry | layer `state: 'proposed'` |
| E Authorized | T+0:46 | the same plan restyled **committed**; authority marker. No geometry moves | `setLayerState()` |
| F Operations | T+0:54 | units drive real roads with breadcrumbs; DZ-3 (mutual aid) arrives and cuts line; Zone 1 clearing % | unit `track` + `trail` |
| G Revision | T+1:39 | projected cut of Encinal Cyn Rd; TALON **draft**: Route B (north to Mulholland Hwy) as primary for the upper canyon | `state: 'draft'` / `'compromised'` |

Status ladder (enforced by the engine, so no data can make a draft read as committed): committed = spec as given; proposed = hollow core, frozen chevrons, outline-only zones; draft = ghosted amber, thinner, long dashes; compromised = red short dashes.

Routes: `player.setActiveRoute('route-a' | 'route-b')`, or click a route on the map. Before E it edits the proposal; after E it stages a draft that renders next to the committed plan until `approveDraft()` or `rejectDraft()`. The exercise script drafts Route B at G and approves it 5 minutes later; operator decisions override the script from the moment they are made.

Why Route B is Encinal north: the projection first reaches Encinal Canyon Rd at (224, 911), T+2:09. Above that point, the only in-frame road out is north on Encinal toward Mulholland Hwy (19 structures). PCH east, the Route B of the earlier snapshot, cannot help those residents.

Situations (`data/scenarios/`): `standby.json` (no incident), `small-incident.json` (one detection at 34.048°N 118.868°W, E-32 and hand crew C-5, a short hand line, never a perimeter), `wui-breakout.json` (A → G). Every layer carries a catalogue group and provenance (`measured` / `modeled` / `authored` + source), shown in the harness. Structure counts and burned area are computed from the field, not typed in.

```ts
const player = createScenarioPlayer(engine, situation, { phase: 0, director: true });
player.setPhase(3, 1600); player.next(); player.prev(); player.setTime(72); player.play(); player.stop();
player.authorize(); player.setActiveRoute('route-b'); player.approveDraft(); player.rejectDraft();
player.getState(); player.on('change', fn); player.dispose();
```

`director` (default on) lets phase changes move the camera and open the suggested feed; turn it off and the operator keeps the view.

## API

```ts
const engine = createTerrainEngine(container, {
  world,              // WorldData; default: procedural fixture
  view: 'perspective',
  lighting: 'night',  // 'day' | 'night'
  hud: true,          // false: no compass / scale bar / lat-lon ticks (external shell draws its own)
  vegetation: { trees: 6000, shrubs: 10000 },  // or false
  motion: true, motionIdleMs: 45000, pixelRatioCap: 1.25,
});
engine.setCamera('topdown' | 'perspective', ms)
engine.setLighting('day' | 'night', ms)     // tweens the shared uDayNight uniform (0 night, 1 day)
engine.setThermal(on)
engine.setVerticalExaggeration(scale, ms)
engine.setOverlayLayer(id, spec | null, { fadeMs })  // line | polygon | points | marker | labels | field
engine.setLayerState(id, 'committed' | 'proposed' | 'draft' | 'compromised')  // restyle in place
engine.setSceneTime(minutes, ms) / getSceneTime()   // drives fields, timed points, unit tracks
engine.getFieldStats()                      // reached area, threatened / destroyed structures
engine.pickLayer(x, y)                      // interactive line or marker under the pointer ('layerclick' event)
engine.setTimeLabel(text)                   // clock shown in the drone feed
engine.setLayerVisible(id, on)              // overlay ids, or: contours graticule roads buildings vegetation units drones
engine.setUnits(units)                      // engine | crew | tender | dozer | drone | law | command
engine.openDronePip(id) / closeDronePip() / setPipSensor('eo' | 'ir')
engine.flyTo({ target, range, pitch, bearing } | { target, position })
engine.pick(clientX, clientY)               // elevation, slope, aspect, cover/fuel, burn time, lat/lon
engine.setWorld(world) / getMetrics() / on(event, fn) / dispose()

await loadWorldData('./data/')   // dem.bin, frame.json, roads.json, buildings.json, vegetation.json (optional)
generateProceduralWorld(seed); new RoadNetwork(roads)
// scenarioFixtures.js: simulateFireRun(ignition, head, seed); fireArrivalField(run, ignition, frame, opts); buildDemoScenario(world)
```

`vegetation.json` is `{ cols, rows, encoding: "base64-uint8", data }`, or `{ cols, rows, classes: [...] }`. It holds ESA WorldCover codes in row-major order, with row 0 at the north edge and cells tiling the frame. Class 10 cells get trees, class 20 cells get shrubs, and class 30 cells get the occasional shrub. Without the file, placement falls back to the slope, aspect and curvature cover model.

## Rendering

| | draw calls |
|---|---|
| terrain + context ring (one mesh) | 1 |
| ocean plane, roads, buildings, trees, shrubs | 5 |
| overlays (procedural snapshot): route A, route B, choke, fire front, hotspots, unit markers, drone stalks/orbits | 7 |
| **procedural snapshot at rest** | **13** (+6 feed = 19) |

Per phase on the Encinal WUI breakout (main + drone feed): A 8+4, B 8+4, C 10+5, D 12+5, E 12+5, F 12+5, G 14+5. The fire field, isochrones, zones, dozer line, breadcrumbs and all DOM markers cost no draw calls: the field and masks are evaluated in the terrain shader, breadcrumbs share the unit-marker draw call. Cross-fades briefly draw the outgoing layer as well.

- **Triangles:** the main view is about 405k with the procedural world and about 418k with Encinal. Vegetation accounts for 204k of that (6,000 trees × 14 triangles + 10,000 shrubs × 12). Without vegetation the main view is 201k (procedural) or 214k (Encinal, which has 1,106 OSM buildings and 228 road pieces). The harness shows the split, and `getMetrics().vegetation` reports it.
- **On-demand rendering:** frames draw only on change, or while animated layers are visible (capped at 30 fps). Animation parks after 45 s idle or when the tab or canvas is hidden. With motion off, the GPU draws 0 frames (checked by `verify`).
- **Sky and haze:** the sky is a CSS gradient behind a transparent canvas, so it costs no draw call. Haze follows `scene.fog` (a `THREE.FogExp2`) and is evaluated per fragment in the custom shaders.
- **Context ring:** the ring outside the data frame is procedural. Its first ring reuses the frame's edge vertices, so there is no seam. The terrain beyond the frame is invented and fades into the haze.

## Encinal Canyon data (real terrain, fictional fire)

`frame.json` is centred at 34.0465°N, 118.872°W and covers 6 × 3.25 km at 400 × 220. The original spec centre (34.032°N, 118.815°W) covers Zuma and Point Dume, and Encinal Canyon Road lies entirely west and north of that frame.

The scenario is a training exercise. The roads, buildings, terrain and land cover are real. The fire, weather, zones, units and times are invented, and the fire spread is a self-similar growth of the authored perimeter, not a Rothermel run. `data/scenario.json` is the earlier single-state snapshot (end of the run), kept for compatibility.

- The evacuation route runs down the real Encinal Canyon Road to PCH, then west.
- The choke marker sits on the sharpest in-frame switchback: 80° at 34°02.62′N 118°53.56′W.
- Zones 1, 2 and 3 are clusters of real buildings, banded by distance to the perimeter.

Sources:
- Terrain: AWS Terrain Tiles (Terrarium, z14; USGS 3DEP)
- Roads and buildings: © OpenStreetMap contributors (ODbL)
- Land cover: ESA WorldCover 2021 v200 (CC BY 4.0)
