# Legacy map archive

Rollback: in [`SentinelShell.tsx`](../../components/SentinelShell.tsx) restore:

```ts
import { MapCanvas } from "../map/_archive/MapCanvas";
```

and replace `<SpatialMapCanvas … />` with `<MapCanvas … />`.

Or restore these files under `src/app/components/` and revert the SpatialMapCanvas import.

Files:
- `MapCanvas.tsx` — pre–spatial-OS Figma SVG storyboard
- `mapSvgPaths.ts` — decorative path soup
- `MapBackground.tsx` — procedural fallback backdrop

Spatial authority after cutover: `src/app/map/` (frame, zones, roads, agents, routes, SpatialMapCanvas).
