# Sentinel — Final Design Layer: freeze status

**Branch:** `feat/map-spatial-os`
**Commits:** decaf97 (pre-fix checkpoint) → 33dfd1c (M0) → 77ed88b (M1) → 4e339fa (M2) → 4d61386 (M3) → 3da34e2 (M4)

## Verdict

**SHIP.** All six planned phases landed, all five automated gates pass against current source.

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `audit:tokens` | 62 files, 276 warnings (down from baseline 282) |
| `verify:map` | 6/6 PASS |
| `verify:flows` | 19/19 PASS (was 18) |
| `verify:routes` | 23/23 PASS (0 need attention) |

The new flow added in M0 asserts the surface-truth invariant: ambient voice names the actual state in contested, reraise, gate, and quiet scenes. The new flow added in M1 asserts the conversation contract: suggested questions are the entry point and the reply is the authored answer, not a repurposed recommendation.

## What landed, in order

### M0 — Truth layer (commit 33dfd1c)
- New `src/app/domain/talonSurface.ts` — `deriveTalonSurface(state, context)` returns `{ posture, tone, markState, postureLabel, postureLine, gateLabel }` from incident state, not `actionSurface` or conversation phase.
- Root-cause fix in `domain/talon.ts`: `requiresHumanGate` on the Notification Brief Agent is now conditional (was unconditionally true), and `getTalonSessionRecommendation` derives the session gate only from gate-able recommended commands in `actionSurface`. Agent gates stay contextual in the Workforce rail.
- Consumers rewired: ActionBar voice, TalonMark ring color, and TalonSession mark state all read the same derivation. Session-open phases still override with their own state colors.
- New `verify:flows` invariant (`ambient voice names the true state in contested, reraise, gate, and quiet scenes`) — failed on the pre-fix code, passes post-fix.

### M1 — Conversation repair (commit 77ed88b)
- Expanded session keeps the ambient voice block as its header (continuity — opening TALON never erases what TALON was saying).
- The "debug form" entry (Start browser speech / Use scripted fallback / Type command) is replaced by 3 suggested-question chips + voice + typed input. Chips come from `SCENE_CHIPS_MAP` (covers all 16 scenes).
- `runChipQuestion` runs a chip as a first-class conversation turn: the operator "asks" the chip's question in their own voice, and TALON answers with the authored response for that question.
- Receipts offer "Ask TALON something new" with chips — no more dead end.
- Authored per-scene transcripts/replies wired in (the ActionModal pattern).
- All "scripted prototype / Provider AI is not connected / use the scripted fallback" copy removed from product surfaces. The honesty boundary lives in the case-study framing.

### M2 — Chrome repairs (commit 4e339fa)
- Bounded command plinth replaces the `-50vw` blackout gradient. Centered, ~1240px, sits as a seated dark wash under the cluster; the map now reads at the edges.
- SCENES chip uses `adaptiveRailWidth` for `rightOffset` (was using constant `RIGHT_RAIL_W` → 40px overlap with voice panel at 1280).
- SCENES chip is now available in core/embed mode (it was hidden in the portfolio's shipping mode → reviewers couldn't navigate scenes without replaying the 90s script). `verify:routes` contract updated accordingly.
- `MapLegend.tsx` deleted (dead code, unimported by any file).
- Disabled pills wrap to 2 lines so the stated blocker never truncates mid-sentence ("Verify bu…").
- Map labels suppressed inside an expanded command-dock zone.

### M3 — Gooey plate + single-command surface (commit 4d61386)
- `liquid-gooey` installed; the command cluster is now one liquid silhouette: the orb, the staged command, and the danger menu are items of a single `Liquid` group, so a staged command is physically TALON's — it emerges bridged from the orb.
- Contested/reraise fork: two positions blooming on opposite sides of TALON, neither pre-selected. This is the case-study frame the plan was always chasing.
- Panel-stranded actions moved onto the command surface via a new `close-out-contested` action — Doc-12's "the action bar is the only command execution and human authorization surface" rule is structural now.
- 220ms critically-damped transition, reduced-motion collapses to a cut. The plate re-mounts on staged-command changes (`actionIdentity`) and the items travel in from off-stage.
- Orb content uses a transparent radial wash so the liquid silhouette shows through it as its body.

### M4 — Palette, navbar, rails, focal, tnum, atmosphere (commit 3da34e2)
- **Yellow retired.** 22 call sites migrated — guidance routes/ground-team to `T.cyan` (guidance now belongs to telemetry), advisory/stale to `T.amber` (pending human judgment). The locked 3-lead palette (cyan/amber/red) is in effect; `T.yellow` deleted from tokens.
- Cyan calibration (`#00C8FF → #1CB8E6`) — kept from the prior pass; genuinely good.
- `tnum` applied across all mono telemetry surfaces (right rail brief, source freshness, Navbar, LeftPanel, ContestedWatch, shell entry).
- Asymmetric rails: TALON rail widens to 300/340 at 1366+; observation rail stays 260/280/300.
- Right-rail focal read: packet % promoted to 32px / heavy / tnum / -0.02em — the first time the focal contract (DESIGN §5) is actually applied to a panel, not just declared.
- Rail tab labels truncate before the strip pushes past its container; full name in the tooltip and aria-label. Kills the "Exce…" clip at 1280.
- Navbar chip recipe consolidated — one recipe (`navBtnStyle`) for all nine mixed chip languages; one height (30px), one radius, one border, one font weight.
- Map atmosphere: basemap desaturated/brightened, fog gradient strengthened, vignette widened, terrain recedes under crisp data overlays.
- Hardcoded zIndex (50/60/25) migrated to the `layer.*` token scale.

## Honest remaining debt (out of scope this pass)

- 276 raw-tracking warnings from `audit:tokens` — pre-existing, mostly `tracking.telemetry`/`tracking.eyebrow` values hardcoded inline instead of via the `tracking.*` tokens. Easy to crank down; left as-is so the scope of this pass stays focused.
- `ContainerPanel.tsx` no longer referenced (replaced by `CompactPanel`) — dead code, deletion is a one-line PR.
- `talon-reraise` is now driven by the surface truth (Contested) rather than a scene-specific override, but the 78→96 delta still depends on a wall-clock ramp that the test harness can wait for. The M0 invariant asserts the voice *label*; the numeric motion is correct.
- The map basemap image's contrast and color are still the dominant factor in "feels flat or feels alive" — atmosphere layers do real work, but a fresh paint pass on the basemap is the next step if the map still doesn't read as "alive" enough.

## How to verify

```bash
npm run check                                 # tsc + audit:tokens + verify:map
SENTINEL_VERIFY_URL="http://localhost:4190/embed/sentinel/" \
  node scripts/verify-flows.mjs              # 19 flows
SENTINEL_VERIFY_URL="http://localhost:4190/embed/sentinel/" \
  node scripts/verify-routes.mjs              # 23 routes
```

`scripts/capture-audit.mjs` and `scripts/capture-audit2.mjs` regenerate `verification-artifacts/audit-captures/` for 8 scenes × 2 viewports plus free-mode and the chip conversation chain.

Out of scope: portfolio embed sync (`node scripts/sync-embeds.mjs sentinel` from the portfolio repo) and case-study copy. Both are the next conversation.

---

## Phase 1 — Built scene: real-data diorama v2 (in progress, not yet accepted)

After the first attempt's rejection (see below), Phase 1 was rebuilt on real data following the Direction-B decision (stylized low-poly diorama, mood reference = original painted asset).

### What's different this time

- **Real elevation.** `scripts/fetch-world-data.py` pulls USGS 3DEP via the National Map ImageServer for a 2.0 × 1.1 km frame at Encinal Canyon, Malibu (center 34.032, -118.815 — frame chosen by scoring candidates on ridge-position, flatness, and building density). 400×220 samples, 246 m relief — versus the failed attempt's 576 invented cells.
- **Real buildings and roads.** Overpass (with mirror fallback + hard backoff) bakes 333 OSM building footprints and 80 road ways into `src/app/map/world/*.json`; frame metadata + attribution in `frame.json`.
- **Data-driven composition.** DEM quadrant analysis (NW=143 m → SE=54 m) placed the camera SE-looking-NW so the real massif reads as backdrop and the residential flats fill the foreground — the original's structure, earned from data instead of painted.
- **Fire authored on the real crest.** The band follows the massif's actual crest trace (x -700..-862, y 330..545 at 194-263 m), not a guessed line.
- **Root-cause fix from v1:** the terrain sampling bug (`ly = H/2 - pz` spanned [0,H] instead of [-550,+550], offsetting the whole mesh and flattening half the slab) is fixed; debug axis pillars were used to verify placement before removal.

### Pipeline

`npm run render:world` → `scripts/render-world.mjs` (Playwright + headless Chromium + WebGL) → `scripts/render-world-entry.ts` builds the Three.js scene from `WORLD` (dem.json + buildings.json + roads.json) → PNG extraction via `gl.readPixels` → 2D canvas → data URL → file write at exactly 1691×914. `python scripts/fetch-world-data.py --force` re-bakes data.

### Current visual state (honest)

The scene reads: real low-poly canyon relief, ~333 real houses on real streets, fire band + smoke on the actual massif crest, blue-steel grade. Framing crops the slab edges so terrain fills the frame like the original. **Not yet accepted:** building scale/exaggeration (×2.2 height) and fire glow are first-pass values; terrain texture is uniform (no landuse tint variety — only 1 OSM landuse polygon came back for this bbox); the baked PNG still needs the user's side-by-side sign-off against the original before calling this shipped.

### Gate results

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `audit:tokens` | 223 warnings (no failures) |
| `verify:map` | 9/9 PASS — slice law intact |
| `verify:flows` | 19/19 PASS |

---

## Phase 1 (v1) — Built scene: **abandoned**, renderer output rejected (commits 58365d9 reverted)

**Status:** the `render:world` pipeline and `world.ts` data were authored (commits 58365d9 + 3c03b4d), but the rendered basemap was not at the visual bar. The original cinematic PNG has been restored as `src/assets/sentinel-map-overhaul.png`; the rejected render is preserved as `sentinel-map-overhaul.bak.png` (renamed back from the working `bak`) — actually, the rejected render lives only in git history now.

### Why the render failed

The original hand-painted basemap reads as a disaster-film still: sculpted mountain ridges with thousands of displacement samples forming real crevasses and slope variation; a populated residential grid of hundreds of individual houses arranged in organic block patterns with thin road ribbons threading through them; multiple glowing fire lines along the ridge scar with smoke wisps drifting into the air; atmospheric blue-steel mood with volumetric haze and ridge shadowing.

What the first attempt produced: a flat-shaded trapezoid terrain with one bump; a 96-box checkerboard for the residential grid; thick tubes for roads; a single orange line for fire. It passed all five automated gates (which check structural contracts, not visual quality) but did not function as a basemap — the operator's eye reads "debug placeholder", not "incident scene".

The root cause was treating Phase 1 as a code exercise instead of a craft problem: I never studied the original closely enough to identify what makes it read that way (high-frequency terrain displacement, organic building distribution with road curbs, atmospheric volumetrics, multi-source fire with smoke), and instead authored data primitives (`heightfield: number[][]`, `roadRibbons[]`, `buildings[]`) at a density and complexity that could not produce the visual.

### What survives from the attempt

The architectural primitives are still useful for Phase 2's runtime scene, even though Phase 1's static render couldn't deliver the visual:

- **`src/app/map/world/world.ts`** — `WORLD` constant with real lat/lon frame (Encinal Canyon, Malibu CA, 34.05°N / 118.82°W, EPSG:3857-projected, 2000m × 1100m). The schema (`heightfield`, `roadRibbons`, `buildings`, `fire`, `stateOverlays`) is correct and Phase 2-ready. What it lacks is the **density and surface treatment** the original visual requires: terrain needs hundreds of displacement samples not 32×18; building footprints need to be authored from real street-network data not generated on a grid; road ribbons need curb geometry not tube radii.
- **`scripts/render-world-{entry.ts,harness.html,mjs}`** — headless Three.js pipeline via Vite + Playwright. The infrastructure works end-to-end (PNG extraction via `gl.readPixels` is reliable in headless; the harness loads; WebGL renders; the file writes). The pipeline is a Phase 2 starting point. **However, these scripts have not been re-run since the original basemap was restored, and the renderer code currently produces the rejected output — running `npm run render:world` against the current code will reproduce the failure.**
- **`three` + `@types/three`** as devDependencies — kept, for Phase 2.
- **`backup`** — `sentinel-map-overhaul.bak.png` is now the previous hand-painted asset again (since it was the only copy of the cinematic PNG before the failed render overwrote the live asset). The rejected render lives only in git history at 58365d9.

### Gate results at the time of the failed attempt

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean (incl. new `world.ts`, `render-world-entry.ts`) |
| `audit:tokens` | 223 warnings (no failures) |
| `verify:map` | **9/9 PASS** — slice law intact |
| `verify:flows` | **19/19 PASS** |
| `verify:routes` | not re-run (no source touched) |

All structural gates passed. The gates did not, and could not, verify the visual quality of the rendered PNG — they verify the slice law contract and the surrounding app behaviour, both of which were preserved because the new PNG replaced the old at the same 1691×914 dimensions.

### What needs to happen for a real Phase 1

The handover is right that "make the world data, the picture a render of that data" is the thesis. But the *density* of the data has to match the visual fidelity of the original basemap. Realistic options:

1. **Source the basemap from real data.** The frame is a 2km × 1.1km bbox centered at 34.05°N / 118.82°W. SRTM 30m DEM gives ~67×37 elevation samples; that produces real ridge sculpting. OSM buildings (downloaded via Overpass or pre-extracted GeoJSON) give real residential footprints with road curbs. ESRI World Imagery gives satellite texture. A composited render of those layers would deliver the visual and still satisfy the "world as data" thesis — the data is just higher-fidelity than hand-authored.
2. **Hand-author a much higher-density heightfield.** 128×72 vertices with multi-octave Perlin noise sculpts real crevasses. Hundreds of individually-placed buildings along real street networks (or imported from OSM). Road geometry with curb edges. Fire as a textured mesh with smoke shader.
3. **Render an existing reference scene to the right aspect ratio.** If the goal is to ship the cinematic look for the case study, render a reference scene (e.g. Mapscene, or a Cesium export of the bbox) at 1691×914 and use that as the basemap. The `world.ts` schema still anchors the data the overlay reads.

None of these is a 1–2 day task. The handover's estimate was correct for an *implementation* of a primitive version; it was off for delivering the visual the case study needs.

### Phase 2 (deferred, per handover)

Phase 2's runtime scene plan is still sound: `SpatialMapCanvas.tsx` swaps the backdrop SVG `<image>` for a `<canvas>` rendered by Three.js at the same `viewBox` / slice mapping. Overlay SVG survives as a projected HUD layer (raycast from camera through screen point → world point → u/v). Day / IR variant = swap the directional light's colour and fog density. Real coordinates become load-bearing: `world.ts.frame.center` + `projection: "web-mercator"` is the contract for swapping OSM / Mapbox / Cesium tiles.

Reference repos identified for Phase 2: `tentone/geo-three`, `xyzmaps/xyz-threejs`, `opengeos/GeoLibre`, `milos-agathon/forge3d`, `flywave/flywave.gl`, `w3reality/three-geo`, `img2threejs/img2threejs`, `milos-agathon/forge3d`.
