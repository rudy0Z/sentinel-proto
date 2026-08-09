# Map Pan Extension — Plan

Status: **Planned, not started.** Blocked on a new map asset with margin beyond
the current frame. This document exists so the asset generation brief and the
code sequencing are decided before either starts.

Builds on `map-exploration-and-decision.md`, which resolved the map to a
high-fidelity 2D surface with data-driven overlays. This plan does not revisit
that decision — it extends the surface with a bounded pan, per the operator
framing: *"an operator would see the surrounding to understand the situation,
but the map is a stabilized picture, not a flyable one."*

---

## 1. What "a little draggable" means here (and what it doesn't)

**Does:** the operator can drag the map a bounded distance — roughly 15-20% of
frame width/height — to glimpse what's just outside the current view, then it
settles back toward the operational frame. This is peripheral awareness, not
navigation.

**Does not:** free-pan, zoom, or fly-through. The 90-second command picture
stays the smallest complete operational view. Dragging reveals context; it
never relocates the incident off-screen or requires the operator to "find"
anything.

This distinction matters because it's the difference between the aliveness
you're after and the "camera orbit" failure mode the exploration doc already
ruled out for a different reason (WebGL 3D). A bounded-margin 2D pan doesn't
carry that risk — it's closer to a parallax layer than a navigable camera.

---

## 2. Why this needs new art, not a crop

Checked the current asset: `sentinel-map-overhaul.png` is 1691×914px, and that
is exactly the Figma coordinate space the map already scales from
(`SX = 1440/1691`, `SY = 900/914` in `MapCanvas.tsx`). The current frame **is**
the full asset — there is no hidden margin already painted beyond what's
visible today. A pan needs new terrain painted outward from every edge of the
existing composition, in the same style, or the drag reveals nothing (or reveals
a seam).

**Margin needed:** roughly 20% beyond each edge, so a full-travel drag never
shows an edge of the image. At 1691×914 native, that's approximately:
- Width: 1691 → ~2440px (add ~375px each side)
- Height: 914 → ~1315px (add ~200px each side)

**Generation brief (for when you make this):**
- Same isometric/tactical style, same time-of-day (California foothills, ~3AM),
  same palette as the existing forest/residential/road composition.
- Extend the *existing* terrain logic outward — more forest canopy to the
  north/west, more residential grid or open ground to the south/east — rather
  than inventing a new landmark that would compete with Grid 4C as the visual
  anchor. The current incident zone must stay the unambiguous center of the
  extended composition, not just the center of the crop.
- No new zones, roads major enough to imply new interactive regions, or focal
  points in the margin — it's peripheral context, not new operational surface.
  If it looks like something the operator should click, it's the wrong kind of
  detail for a margin.

---

## 3. Coordinate refactor (code work, can happen before the art exists)

The pan reveals a gap that already exists independent of dragging: every
zone, drone, and route position in `MapCanvas.tsx` is a hardcoded Figma-space
pixel pair (`DRONE_MARKER_MAP`, zone polygons, etc.), scaled once by `SX`/`SY`.
That's fine for a static frame. It stops being fine the moment the frame can
shift, because a drag offset would then need to be applied consistently across
every one of those literals, by hand, at every call site.

**The fix:** one `project(coord, frameOffset)` function that all positions
route through — zones, drone markers, fire perimeter, route paths. Today it's
a near-identity transform (existing `SX`/`SY` math plus a zero offset). Once
the extended art exists, `frameOffset` becomes the live pan state and every
consumer gets pan support for free, because they were never touching raw pixels
to begin with.

This can be built and merged against the *current* asset with zero visual
change — it's a refactor, not a feature, until pan is switched on. Doing it
before the art exists de-risks the sequencing: the code that needs the new
image is isolated to "what frameOffset bounds do we clamp to," not "which of
40 call sites do we touch."

---

## 4. Sequencing

1. **Now, unblocked:** coordinate refactor — introduce `project()`, migrate
   `DRONE_MARKER_MAP` and zone/route positions through it, verify zero visual
   diff against the current 1440×900 frame. This is the item with a
   predictable scope.
2. **You:** generate the extended map asset per the brief above.
3. **Once asset exists:** wire drag input (pointer events, clamped to the
   asset's margin, spring back to frame on release — reuse the existing
   drag-preview pattern already in `MapCanvas.tsx` for entity repositioning),
   feed the offset into `project()`.
4. **Aliveness pass** (was bundled with this before, now cleanly separable
   since coordinates are real either way): drones interpolating along route
   paths instead of sitting at fixed points, fire perimeter breathing with the
   spread model, scan sweep timing tied to the same evidence clock
   `getSignalHistory` already uses.

Step 1 has no dependency on the art and can start immediately if you want
progress while the asset is in progress. Steps 3–4 are blocked on the asset.

---

## 5. Open question for you

The margin math above (20%, ~2440×1315px) is a starting estimate, not a fixed
spec — it depends on how far a drag should feel like it travels. Worth deciding
before generating: does "a little draggable" mean a small settle-back nudge
(~10%, feels like weight/parallax) or a fuller peek at the surrounding grid
(~25-30%, feels like an actual look around)? That changes both the brief and
the pixel budget on the new art.
