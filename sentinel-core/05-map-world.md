# 05 — The map & world

> **status: canonical — map art direction + data pipeline.** The map is the co-protagonist: the overlay UI and the terrain must feel like one product. This file locks the map's art direction, its layer completion list, and the pipeline for authoring location data — "the map needs to somehow match the overall system."

## 1. Art direction: vivid terrain under a warm console

The TrackWise lesson: darkness isn't the problem — **dead darkness** is. The map becomes the most saturated thing on screen:

- **Terrain grade:** lift the current bake — richer vegetation/rock saturation, warm sun-angle shading keyed to the amber accent family, atmosphere haze toward the horizon (the world already has DEM 400×220 @15 m, 2,495 OSM buildings, 873 roads, vegetation classes — the data is good, the grade is timid).
- **Fire = the only white-hot thing:** the fire band keeps its bloom; nothing else in the scene competes at that luminance.
- **Overlays glow:** corridors and routes get the 2px-core + soft-glow treatment in state colors; spread rings get gradient dashes (vivid → transparent) instead of flat dashes.
- **The 2D backdrop obeys the same grade:** one shared color-grade constant applied to both the bake and the 2D backdrop images so 2D and 3D are unmistakably the same world (they already share one coordinate law; now they share one *look*).
- **Draw-call law unchanged:** ≤19 calls, on-demand render, idle = 0.

## 2. Layer completion list (what the map still owes)

1. **Geofence / TFR layer** — authored polygon data + hatch fill + "no-fly" chips; drone dispatch validates against it (data exists in world constraints; not yet a layer).
2. **Corridor GO states** — per-corridor open/blocked/compromised already render in 3D; the 2D map gets the same state coloring (today only selection dims the other route).
3. **Evac GO chips on zones** — per-zone state chips at the zone label (residential zones): GO / WATCH / CLEAR, feeding the G3 decision (ch06 G-15).
4. **Spread-ring age badges** — "15 MIN · age 4m" on each ring; projection age is a G2 unlock condition, so it must be visible (G-08).
5. **Sensor fans** — 2D wedge from thermal-mission drones (pairs with the 3D cones).
6. **Scale + north + coordinate readout** — a single bottom-left map-utility cluster (the one place chrome touches the map).
7. **Briefing annotations** — neat-annotations-style callouts for the debrief/briefing mode (deferred, flagged).

## 3. The location-data pipeline (authoring any incident site)

The world is **files**, not a one-off — this is how any new incident location is created ("Encinal Canyon" is recipe #1):

1. **Pick a bbox** around a real wildland-urban interface site.
2. **DEM clip:** USGS 3DEP → Int16 grid @15 m (current: 400×220).
3. **OSM extract:** buildings (with types) + roads (with classes) clipped to the bbox.
4. **Vegetation:** ESA WorldCover class grid @23 m.
5. **Bake:** `world.ts` consumes the three rasters → `world.json` + prebaked LWIR vertex colors; textures/atlas built by the existing build step.
6. **Author the incident:** zones (pixel polygons in the 1691×914 native space), anomaly point, spread origin, corridors, mission anchors — per the S-catalog recipe.
7. **Register:** scenario row (server) + scenario-switcher entry + REVIEW_SCENES note.

**Zone authoring law:** polygons stay in the native pixel space; envelopes derive by vertex scaling; 3D derives everything from 2D via the single px→metres projection — the map cannot disagree with itself.

**`[NEXT]` pipeline tooling:** a `scripts/world:new-site <bbox>` scaffold that runs steps 2–6 — so the case study can showcase a second site (multi-site = the honest boundary; multi-*incident* stays locked).

## 4. Map containers

Map chrome (labels, chips, rings) uses the same container system at the `label` tier: warm fill, visible hairline, eyebrow text, state dot — the MapLabelV2 spec in `redesign-2026/04 §2`, re-based onto tokens v3. No bare SVG text on the map.
