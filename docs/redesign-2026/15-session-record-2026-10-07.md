# 15 · Session record — 2026-10-07 · Map direction + hairline rendition build

> **Status: canonical** (as a session/state record). Build-from authority for the
> style is `14-hairline-map-style-spec.md` — build from that doc, not from this one.
> Written 2026-10-07 at session end, under an unreliable tool channel — verify §2
> against disk before trusting any state line.

## 1 · Direction decision (owner, 2026-10-07)

Owner critique of the current 3D world, condensed:

- **Scale** — one authored 6×3.25 km slice will not hold up if Sentinel needs
  whole-earth reach; but whole-earth streaming is a different architecture (not this build).
- **Night legibility** — trees vs houses vs terrain do not separate on screen; an
  operator cannot read the difference at night.
- **Roads** — effectively invisible in the 3D night grade; roads were a founding need.
- **Register** — boxes / cones / low-poly reads cheap and "like a game"; the map must
  match the UI's instrument quality bar or the product reads as a game.
- **Camera** — stuck to a fixed focal point; wants free movement between areas.
- **Zones** — outline markings are not enough; owner wants state lit *from the
  ground up* (area glow), restrained ("a lot of glow might kill the design").

Owner's synthesis (ratified): adopt two external design languages — **isoglow**
(glow-when-on, per-element addressability) + **hairline** (ten-rule line discipline) —
combined into ONE unified language: urban in fine-line hairline, mountains in three.js
terrain + contour isolines, roads glowing when state authorizes it.

**Ruling: build the hairline rendition as a SEPARATE map module.** The current world
(`worldScene.ts` / `Map3DExplorer.tsx` / 2D map) is untouched and stays canonical until
the rendition is ratified against the tutor bar. The 2D bake image is the composition
reference; world DATA (DEM/OSM/WorldCover + `overlayData.ts`) is reused, never re-authored.

## 2 · Build state at session end (UNVERIFIED — check against disk)

| Artifact | State per session echo |
|---|---|
| `docs/redesign-2026/14-hairline-map-style-spec.md` | Written (canonical spec: rules §2, layers §3, camera §4, perf §5, acceptance §7, pass-2 §8) |
| `src/app/map/hairline/palette.ts` | Written (documented night grade; VEX 1.6) |
| `src/app/map/hairline/hairlineScene.ts` | Written (scene builder per spec §3; consumes `overlayData.ts` single-source) |
| `src/app/map/hairline/HairlineMapCanvas.tsx` | Write corrupted — disk state UNKNOWN |
| `src/app/pages/HairlineMapPage.tsx` | Not written |
| `src/app/routes.ts` `/hairline-map` lazy route | Not written |

## 3 · Incident: session tool-channel corruption

From mid-session, tool results became unreliable: writes echoed garbled content, reads
returned content under wrong paths (including a fabricated `tokens.ts`), `git`/`ls`
echoes listed files that were never composed with inconsistent byte counts, and even
`tsc` output could not be trusted. Response: stopped all further writes rather than
claim an unverifiable delivery. Nothing in the current world imports the hairline
module, so worst case is contained to one new folder.

**Resume verification protocol (run before anything else):**

```bash
git status --short src/app/map/hairline docs/redesign-2026
npm run verify:design
```

- Garbled files → `git clean -f src/app/map/hairline` and rebuild from spec 14.
- `verify:design` green → only canvas/page/route remain.

## 4 · Resume checklist

1. Verify per §3; clean or keep accordingly.
2. Finish `HairlineMapCanvas.tsx` per spec §4: retargetable orbit (shift-drag pan
   re-anchors the pivot — the fix for the fixed-focal-point complaint), wheel dolly,
   click zone/incident → 700 ms fly-to tween, HOME + ISO presets, FOV 42, pitch clamp
   0.12–1.35 rad, distance 150–9000 m, on-demand render (dirty-flag), honest
   calls/tris HUD, projected label chips from `overlayData.labels`, scale bar +
   north arrow + coords furniture, legend "GLOW = LIVE STATE".
3. `HairlineMapPage.tsx` (full-viewport wrapper) + lazy route `/hairline-map`.
4. Screenshot iteration against spec §7 acceptance bar — night legibility first
   (one-second read: fire, lit state, corridors, at-risk structures).
5. Pass 2 (spec §8): region-shell LOD pull-back beat, LWIR rendition, tree/roof
   geometry upgrades, at-risk edge pulse cadence.
