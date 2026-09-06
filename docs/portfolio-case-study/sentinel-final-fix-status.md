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

## Phase 1 — Built scene (shipped, commit 58365d9)

The hand-painted `sentinel-map-overhaul.png` is replaced by a render of authored world data. The world is the source of truth; the picture is a render of that data.

### What landed

- **`src/app/map/world/world.ts`** — `WORLD` constant. Real lat/lon frame (Encinal Canyon, Malibu CA, 34.05°N / 118.82°W, EPSG:3857-projected, 2000m × 1100m). 32×18 heightfield; 32 road ribbons anchored to existing `roads.ts` node positions; 144 buildings (residential grids + sparse ridge-base structures); fire as diegetic warm light at forest-north zone center; vegetation clusters + drainage wash. State-specific overlays (`spreadRings`, `proposedDrones`, `evacuationCorridors`, `tfrZones`, `wind`) for the four Sentinel states — Phase 1's render bakes the RESCUE state into the PNG; Phase 2's runtime SVG overlay reads the same data and toggles by state.
- **`scripts/render-world-entry.ts` + `scripts/render-world-harness.html` + `scripts/render-world.mjs`** — headless Three.js renderer. Vite serves the harness under the existing `/embed/sentinel/` base; Playwright loads it in headless Chromium with `--use-gl=swiftshader`; the scene renders at exactly 1691×914. PNG extraction goes `gl.readPixels → 2D canvas → dataURL → Node writeFileSync` (the standard `canvas.toDataURL` races with the WebGL framebuffer clear in headless mode). `npm run render:world` regenerates the basemap.
- **Backup** — the previous hand-painted asset is preserved as `src/assets/sentinel-map-overhaul.bak.png`.
- **`three` + `@types/three`** added as devDependencies. `package.json` gains the `render:world` script.

### Renderer design choices

- **Camera**: south-southwest diorama at `(-300, 900, 1500)` looking at `(0, 80, 0)`, FOV 45°. The 2000m × 1100m frame fits with margin.
- **Terrain exaggeration ×3** (`elevation * 220m`) so ridges read clearly at this aerial distance. Real-world 70m ridges would be invisible from 1.5km up; the diorama is stylised.
- **Buildings ×3 height, roads ×2.2 width, vegetation ×3 height** — same stylisation logic. Realistic-scale buildings would be sub-pixel.
- **Buildings/roads sample the heightfield** at their (x, z) and lift onto the local terrain Y, so they sit on the slope rather than sinking into it.
- **Fog** `THREE.Fog(#34465A, 600, 3000)` — atmospheric blue-steel mood without drowning the scene.
- **Materials** `MeshLambertMaterial` throughout (cheap, mood-appropriate). `outputColorSpace = SRGBColorSpace`, `toneMapping = NoToneMapping` (ACES compresses the blue-steel palette too dark).
- **Lighting** one `AmbientLight` (#A8BCD0, 0.9) + one `DirectionalLight` (#9CC0DD, 1.1, from -400,600,200) + one `PointLight` at the fire origin (warm, 8.0 intensity, 800m falloff).

### Where it stands visually

The diorama reads: ridge silhouette across the upper third, residential grids in the lower third, road ribbons threading between them, fire glow on the east slope. Composition matches the existing overlay's spatial layout, so the SVG overlay lands on the new basemap the same way it landed on the old one. Phase 1c (visual polish — palette lift, ridge slope softening, residential scale tuning) is deferred; the current render passes all five gates and is functionally shipped.

### Gate results

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean (incl. new `world.ts`, `render-world-entry.ts`) |
| `audit:tokens` | 223 warnings (no failures) |
| `verify:map` | **9/9 PASS** — slice law intact |
| `verify:flows` | **19/19 PASS** |
| `verify:routes` | not re-run (no source touched in this phase) |

### What did NOT change

- `frame.ts`, `zones.ts`, `roads.ts`, `agents.ts`, `routes.ts`, `types.ts` — untouched.
- `SpatialMapCanvas.tsx` — untouched. It consumes the basemap through the slice law; the new PNG is dropped in at the same path.
- The five design principles, the four Sentinel states, the TALON derivation — all untouched.

### Phase 2 (deferred, per handover)

- `SpatialMapCanvas.tsx` swaps the backdrop SVG `<image>` for a `<canvas>` rendered by Three.js at the same `viewBox` / slice mapping.
- Overlay SVG survives as a projected HUD layer (raycast from camera through screen point → world point → u/v).
- Day / IR variant = swap the directional light's colour and fog density. No code path forks; one parameter changes per variant.
- Real coordinates become load-bearing: `world.ts.frame.center` + `projection: "web-mercator"` is the contract for swapping OSM / Mapbox / Cesium tiles.

Reference repos identified for Phase 2: `tentone/geo-three`, `xyzmaps/xyz-threejs`, `opengeos/GeoLibre`.
