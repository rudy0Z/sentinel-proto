# 14 · Hairline Instrument Map — Style Spec (Rendition 01)

> **Status: exploratory.** Draft 01, 2026-10-07. This doc specifies a *separate* map
> rendition (`src/app/map/hairline/`, page `#/hairline-map`). It does **not** replace the
> current world stack (`worldScene.ts` / `Map3DExplorer.tsx`), which stays untouched.
> Build-from authority: vault `02-SPATIAL-OS-AND-3D-MAP-SYSTEM.md` + this spec. If this
> direction is ratified, it graduates to canonical and the rendition number increments.
>
> **Built 2026-10-07.** Rendition 01 is implemented and wired at `#/hairline-map`
> (`src/app/map/hairline/` + `pages/HairlineMapPage.tsx`). Verified live: HOME + ISO
> poses, projected labels, furniture, on-demand HUD (`CALLS 21 · TRIS 165K` — inside
> the ≤24 budget). Gates green: typecheck, `verify:design` (after moving the two
> 9px furniture labels onto `typeStyle.metadata`), `verify:flows` 22/22,
> `verify:routes` 23/23.

## 1 · Thesis

The current 3D world is a *diorama*: real data, but rendered in a low-poly game register —
murky green-gray terrain, white box buildings, cone trees, one flat value band at night.
The product is a night-ops command instrument; the map should read like one.

Two external design languages were evaluated as the fix (owner find, 2026-10-07):

- **isoglow** (isoglow.dev, on Tolga Cohce's iso-figure) — isometric fine-line figures
  where *"whatever is switched on glows"* and every part is individually addressable.
- **hairline** (hairline.lucasmarkes.com) — interactive figures drawn to *"Hairline's ten
  rules"*: hairline strokes, one motif per figure, reads-at-a-glance, pointer-driven,
  machine-checked restraint.

Neither is a map system (both author single-file HTML figures); **both are design
languages, and both port.** The synthesis for Sentinel:

> **Hairline Instrument render** — a cartographic night grade where the world is drawn
> (hairline edges, contour isolines, matte value-separated fills) and *glow is reserved
> exclusively for live operational state.*

The product rhyme: **glow-as-state is the attention arbiter, rendered in 3D.** Silence is
dark; escalation lights the ground under itself. The render language enforces the HITL
constitution (vault 04) — nothing glows without a state that authorizes the glow.

## 2 · Language rules (adapted from hairline/isoglow, governed like tokens)

1. **Line before shade.** Structure is communicated by 1px hairlines (edges, contours,
   centerlines) before any shading trick. Line weights are a closed set: hairline (1px),
   major (1px, brighter), emphasis (additive ribbon). No thick lines, no outlines-as-strokes.
2. **Matte world, luminous state.** Terrain, vegetation, buildings, roads are matte and
   low-chroma. Only these may emit: fire, designated zone ground, active corridor,
   agent beacons, at-risk structure edges. If nothing is happening, the map is dark and quiet.
3. **One warm accent.** The fire is the only warm element in the base world. Everything
   else lives in the blue-slate family; cyan/amber/red appear only as *state* tones
   (borrowed from `T.cyan / T.amber / T.red`, never new hues).
4. **Value separation over hue.** Classes separate by luminance band first (built > bare >
   scrub > forest > valley floor), hue second. The night read must survive at 20% zoom.
5. **Contours are the mountains.** Terrain gets world-space elevation isolines (minor 40 m
   scene-step, major every 5th). View-independent — they hold from any camera angle.
6. **Data furniture is part of the style.** Scale bar, north arrow, coordinate readout,
   draw-call/tri HUD, attribution. A map without furniture is a game; with it, an instrument.
7. **Every glow has a read-out.** Any lit element carries a label chip (token-styled,
   tabular figures) naming its state. Unexplained glow is a bug.
8. **Restraint budget.** Max 2 lit zone grounds + 1 active corridor + fire + agents in any
   single frame. No bloom post-processing — glow is additive geometry, budgeted per draw call.

## 3 · Render language by layer (rendition 01 scope)

| Layer | Technique | Draws |
|---|---|---|
| Terrain | Real DEM mesh (240×130, VEX 1.6 — same law as the original), Lambert flat-shaded, hypsometric vertex ramp × vegetation class × slope shade. Contour isolines injected via `onBeforeCompile` (fwidth-AA'd, world-space elevation). | 1 |
| Sky | Gradient dome shader (`#0A111B` → `#1C2C3E`) + matched fog. Kills the flat-sky seam. | 1 |
| Buildings | Real OSM footprints/heights, instanced boxes with per-instance fill (value bands, slightly lighter than terrain). **Merged hairline edge lines** (one `LineSegments`, ~2.5k buildings × 12 edges). Structures inside the 60-min spread ring get warm edge tint — the ring painted on the building stock. | 2 |
| Roads | OSM ribbons: faint ground lane for arterials + merged hairline centerlines (arterial bright, local dim). | 2 |
| Vegetation | Instanced cones (WorldCover tree cells, ~5–6k), desaturated dark green-slate, per-instance jitter. Texture, not hero. | 1 |
| Zones | `overlayData.zones` (single source of truth) → subdivided ring draped on terrain, triangulated fill (additive, tone @ 0.10) + merged perimeter hairline. | 2 |
| Spread rings | Authored radii draped as dashed 1px rings (`LineDashedMaterial`), token tones. | 3 |
| Corridors | Route polylines draped: active = bright centerline + additive glow ribbon; standby = dim centerline. Status-driven (route A active, B standby default). | ~4 |
| Fire | Authored band → merged oriented boxes (warm `#FF8A4A`, basic material) + additive glow sprites at high-intensity nodes + one radial ground-glow disc at the origin. The only warm thing in the world. | 3 |
| Agents | Roster positions → additive beacon sprites (cyan) + token label chips. | 1 |
| Labels | HTML overlay, projected per render: zone plates, GRID 4C, ring readout, agent chips (reuse of `overlayData.labels`). | DOM |
| Furniture | Scale bar (distance-derived), north arrow (azimuth-derived), coordinate + distance readout, calls/tris HUD, legend ("GLOW = LIVE STATE"), attribution. | DOM |

Palette lives in `src/app/map/hairline/palette.ts` (raw hex permitted by the map-code
exception; documented per value). UI chrome (chips, HUD, furniture) uses `T` tokens only.

## 4 · Camera model

- Retargetable orbit: left-drag orbits the current target, wheel dollies, right/shift-drag
  pans **and re-anchors the pivot** (clamped to the frame, above terrain).
- Click-to-fly: raycast → zone under point (or incident within 300 m) → 700 ms tween of
  target + distance. Cursor is a crosshair; every fly-to is a read (no rubber-band).
- Presets: **HOME** (basemap pose) and **ISO** (locked 45° azimuth, high elevation — the
  isoglow framing as a *mode*, not a cage). Pitch clamped 7°–77°, distance 150–9000 m.
- FOV 42 (tighter than the diorama's default — less perspective drama, more instrument).

## 5 · Performance

On-demand render (dirty-flag + render on interaction/tween/resize; no continuous loop).
No post-processing. Budget ≤ 24 draw calls at rest; report calls/tris honestly in the HUD.
World data is the existing bake (DEM Int16 + OSM vectors + WorldCover) — zero new assets.

## 6 · Non-goals (rendition 01)

- Not replacing `worldScene.ts` / `Map3DExplorer.tsx` / the 2D map — separate module, separate route.
- No whole-earth streaming. Scale story = this 6×3.25 km frame; a region-shell LOD is a
  candidate for rendition 02 (contours-only terrain from the same DEM sources).
- No day mode. This rendition is the night instrument; LWIR gets its own pass later.
- No interactivity beyond camera + fly-to (no dispatch proposals — the existing explorer owns that).

## 7 · Acceptance bar

1. At the HOME pose, in one second: where is the fire, what is lit (state), where do I send
   things (corridors), what is at risk (warm edges inside the 60-min ring) — **at night**.
2. A reviewer says "instrument", not "game" — the tell: hairlines, contours, furniture, restraint.
3. Gates stay green (`verify:design` typecheck; tokens audit not worsened outside map-code paths).
4. The current world still loads and passes its gates, untouched.

## 8 · Open for refinement pass 2

- Tree impostors vs cones; roof forms from OSM building kinds.
- LWIR rendition under the same language (cool terrain hairlines + warm signatures).
- Region shell (zoom-out context) and the pull-back portfolio beat.
- Structure-risk pulse cadence (slow breath on at-risk edges?) — must stay restrained.
