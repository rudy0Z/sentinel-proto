# Sentinel Map Spatial OS — Status

Status: **Score-uplift Phases A–F complete on `feat/map-spatial-os`.** Portfolio gate: **SHIP** (`verify:routes` / `verify:flows` / `verify:design` green; artifacts regenerated).

Spatial authority: `src/app/map/` (`SpatialMapCanvas`, frame, zones, roads, agents, routes).
Legacy Figma SVG storyboard: `src/app/map/_archive/` (rollback only).

## Rollback

In `SentinelShell.tsx`:

```ts
import { MapCanvas } from "../map/_archive/MapCanvas";
```

Replace `<SpatialMapCanvas … />` with `<MapCanvas … />`.

## Honest claims (OK)

1. Zones, drones, and routes share one MapFrame — not hand-placed stickers.
2. Drones ease along an authored road graph (Dijkstra), including drag-to-assign.
3. We documented where to stop (2D ops surface; WebGL rejected for the ops slot).
4. Evidence envelopes widen automatically from degraded evidence; operators can also nudge Zone Envelope ±.

## Claims to avoid

1. Perfect photo alignment on the pre-incident satellite basemap (forest overlays suppressed until verify).
2. “Screenshot-ready without `?core=1`” — Review Dock is evaluator-only chrome.

## Share links

- Portfolio stills / clean chrome: `?core=1`
- Evaluator explore + Review Dock: default entry → Explore freely

## Commands

```bash
npm run verify:design   # typecheck + audit:tokens + verify:map
npm run check           # verify:design + verify:flows
npm run verify:routes   # regenerate scene captures (dev server required)
```
