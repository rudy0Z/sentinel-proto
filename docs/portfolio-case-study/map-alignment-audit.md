# Map System Audit — zone/image alignment inconsistency

**Date:** 2026-09-03 · **Scope:** `src/app/map/` (frame, zones, roads, SpatialMapCanvas, render/*) against both basemap assets, measured live at 1280×800 / 1600×900 / 1920×1080.
**Method:** read the full coordinate pipeline; parsed both basemap assets' real dimensions; computed the image (objectFit cover) vs overlay (SVG viewBox meet) on-screen positions of every zone center in a live browser at three viewports; visual walk of captures.

---

## Verdict

**Your eye is right, and it's structural — not an authoring mistake.** The zone polygons were authored correctly against the overhaul basemap (1691×914, which matches `MAP_NATIVE` exactly). The misalignment is born at render time: **the basemap image and the SVG overlay are scaled by two different rules in the same container**, so the overlay drifts off the image by an amount that grows toward the frame edges — and becomes catastrophic in the four scenes that use the second basemap, which is a **1024×1024 square JPEG masquerading as a .png** with no authored relationship to the zone frame at all.

Measured worst-case zone-center drift:

| Scene class | Basemap | 1280×800 | 1600×900 | 1920×1080 |
|---|---|---|---|---|
| Post-verify (contain/rescue/verify/failures) | overhaul 1691×914 (1.85:1) | 4–**61px** | 5–**69px** | 6–**82px** |
| Pre-verify (baseline, alert, investigation, **contested**) | preincident **1024×1024 (1:1)** | 14–**159px** | 47–**232px** | 56–**278px** |

(0px drift would be perfect. For scale: a drone marker is ~28px wide.)

---

## Root cause 1 — three coordinate mappings, one container

The container (the map fills the full viewport; rails float above it) is the same box for all three layers, but each layer converts "map space → screen" differently:

| Layer | Code | Scaling rule |
|---|---|---|
| Basemap `<img>` | `SpatialMapCanvas.tsx:615` — `objectFit: "cover"` | **Cover**: scales to fill, **crops** overflow. Crop window depends on the container's aspect ratio. |
| SVG overlay | `SpatialMapCanvas.tsx:654-658` — `viewBox="0 0 1440 900"`, **no `preserveAspectRatio`** → default `xMidYMid meet` | **Meet**: scales to fit, **letterboxes**. Never crops. |
| Pointer input | `SpatialMapCanvas.tsx:422-423` — `(clientX-rect.left)/rect.width * 1440` | **Stretch**: assumes the viewBox fills the container edge-to-edge. |

All three agree only when the container aspect is *exactly* 1.6:1 — true at 1280×800 and essentially never otherwise (the map fills the viewport, so it's 1.778 at 1600/1920, and changes again in any other window size).

Concretely at 1600×900 (container 1.778):
- The **image** (1.85) covers: crops ~33px total horizontally, fills 100% of container width.
- The **SVG** (1.6) meets: renders at 90% of container width, letterboxing **80px of empty margin on each side**.
- Net effect: the overlay is compressed ~11% horizontally relative to the image. Points near the frame center drift little (forest-north: 5–9px); points near the edges drift 47–82px (buffer-west, buffer-east, residential-west — exactly the corridor zones the operator interacts with).
- **Pointer hit-testing adds a third error on top**: clicking where a marker appears selects a map location displaced by the same mismatch — drone drag-to-snap lands in the wrong place at any non-1.6 aspect.

Ironically, the **archived legacy canvas had this right**: `map/_archive/MapBackground.tsx:73` uses `preserveAspectRatio="xMidYMid slice"` (the SVG equivalent of cover). The Spatial OS rebuild dropped it.

## Root cause 2 — the pre-verify basemap is a different photograph with no frame

`src/assets/map-preincident.png` is **not a PNG** — it's a **1024×1024 square JPEG** (signature `FF D8 FF E0`), shown in `baseline`, `alert-command`, `investigation-pending`, and `monitoring-contested` (`SpatialMapCanvas.tsx:202-206`).

- The zone frame is authored against the 1691×914 overhaul image. The square photo has **no authored mapping** to that frame — normalizing it through `MAP_NATIVE` is geographically meaningless.
- At 16:9 with `cover`, a square image scales to width and **crops 44% of its height** (224px top + 224px bottom at 1920). The visible strip is the middle 56% of the photo, while the overlay maps v∈[0,1] across the full container height.
- Result: in pre-verify scenes the polygons describe a *different geography* than the photo — measured drift **128–278px**, with `forest-north`'s center mapping *off the top of the visible image* (img y = −17 to −21px at 1600/1920) and `residential-south` mapping below the bottom edge.
- `monitoring-contested` — your case-study hero scene — is one of the affected four.

## Root cause 3 — viewport-dependent alignment (the "works on my machine" trap)

Because the map container is the full viewport, the effective aspect ratio changes per viewport (1.600 at 1280, 1.778 at 1600/1920). The same authored geometry therefore aligns differently on every screen — the polygons were presumably hand-nudged ("lightly re-centered for photo fit", `zones.ts:8`) at whatever size they were reviewed at, which locks the fit to that one size and guarantees drift at all others. Hand-nudging cannot fix a scaling-law mismatch; it can only move the error around.

## Knock-on effects (same root cause, different symptoms)

1. **Road graph / drone pathfollow** — `roads.ts` nodes go through the same `fromPixel` pipeline, so road-following drones are displaced from the *visible* roads by the same table above. In pre-verify scenes, a drone "flying the ingress road" is visually off-road by 100+px.
2. **Zone envelope controls** — `ZONE ENVELOPE ±` expands/contracts in normalized space (`zones.ts:44-66`), so operator adjustments inherit the drift; the envelope edge and the polygon edge diverge from the terrain proportionally.
3. **Labels** — zone/unit labels are positioned by the SVG mapping, so they sit up to ~80px from the features they name at 16:9 (e.g. `BUFFER ZONE 1` vs the corridor it labels).
4. **Selection/hover** — `pointInPolygon` hit-tests run in normalized space and are correct *internally*; the perceived "I clicked the zone and nothing happened" comes from the pointer-mapping error (RC1), not the hit-test.
5. **Why it survived every audit** — the baseline/pre-verify scenes are heavily darkened by the atmosphere layers (fog + vignette), which masks the square-image mismatch; the overhaul scenes fit near the center where reviewers look first; and 1280×800 (the portfolio embed size) is the *one* viewport where the SVG mapping is exact, so embed-mode screenshots looked fine while 1600/1920 live views drifted.

## What is correct (don't touch)

- The authoring pipeline itself: `parsePixelPolygon` → normalized u/v → SVG user units is internally consistent, and `sentinel-map-overhaul.png` is *exactly* 1691×914 — the polygons genuinely sit on the overhaul photo's features in SVG space.
- `pointInPolygon`, `nearestZoneId`, `expandPolygon` math — all correct in normalized space.
- Roads/zones/agents share one frame — the architecture is right; only the render mapping is broken.

## Fix plan (in order of preference)

**Fix A — one mapping to rule them all (recommended, ~15 lines).** Render the basemap *inside the SVG* as `<image href=… x=0 y=0 width=1440 height=900 preserveAspectRatio="xMidYMid slice" />` and delete the HTML `<img>` (keep the CSS filter by applying it to the SVG image). Then image, overlay, and pointer input all share the **slice/cover** law in one coordinate space: zones, roads, drones, labels, and click targets all land on the image at every viewport, permanently. Pointer mapping at `:422` already assumes fill and becomes correct automatically. Cost: the visible crop of the overhaul image at 16:9 (~2%) is identical to today's image behavior, so nothing that currently looks right changes.

**Fix B — re-author or re-crop the pre-verify asset.** Even with Fix A, the square JPEG covers correctly but shows the *middle strip* of an unrelated photo. Either (a) crop the square to a 1691×914-equivalent window of the overhaul image (e.g. a pre-incident grade of the same scene — ideal for the story: same geography, pre-fire), or (b) author a separate MapFrame for it. (a) is strongly preferred — it also fixes the jarring image *swap* between pre-verify and verify scenes.

**Fix C — regression gate.** Extend `verify:map` with an alignment check: load each scene, evaluate the cover-vs-overlay drift at the five zone centers (the measurement script `scripts/audit-map-alignment.mjs` already computes this), and fail if any drift exceeds a few px. This is what would have caught RC1 at build time.

**Not the fix:** more hand-nudging of polygon coordinates. It can only re-center the error; it cannot reconcile two scaling laws.

## Effort

Fix A is a focused change in `SpatialMapCanvas.tsx` (img→SVG image, one attribute) plus re-capturing verification artifacts. Fix B is an asset task. Fix C is ~40 lines in `verify-map.mjs`. Together: half a day, and the map system's central claim — "one shared spatial truth" — becomes literally true at every viewport.
