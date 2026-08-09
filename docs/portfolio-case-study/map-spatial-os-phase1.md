# Sentinel Map Spatial OS — Phase 1 Plan

Status: **Ready to execute.** Builds a new coordinate-driven map runtime on the
fixed basemap. Does **not** polish the legacy Figma SVG storyboard in place.

Related:
- [`map-exploration-and-decision.md`](./map-exploration-and-decision.md) — resolved: 2D surface + data overlays (not WebGL ops slot)
- [`map-pan-extension-plan.md`](./map-pan-extension-plan.md) — later; blocked on wider art
- Visual craft P0–P2 from the map visual audit (glow kill, one label recipe, craft unify, zone stroke lock)

---

## Intent

Stop treating the map as hand-tuned stickers on a PNG. Build a **spatial OS** where:

1. The basemap image is texture only
2. Zones, roads, and agents share one coordinate frame
3. Assign / deploy / evacuate produce **paths on a road graph**, not scene teleports
4. Marker / zone / route visual craft (P0–P2) is the **renderer** of that data from day one

Improving the old `MapCanvas` dialect is inefficient. Archive it; build new assets around the upgraded canvas.

---

## Safety first (before cutover)

Current branch: `codex/talon-workforce-upgrade` with large uncommitted DS consistency work.

| Step | Action |
|------|--------|
| 1 | Commit or stash the design-system consistency work so it is not lost |
| 2 | Create branch `feat/map-spatial-os` from that known-good point |
| 3 | Archive legacy map stack into `src/app/map/_archive/` (compile-excluded / dead import) |
| 4 | Document rollback: restore archive import in shell + checkout archive files |

**Archive candidates (do not delete until Phase 1 green):**

- `src/app/components/MapCanvas.tsx`
- `src/app/components/mapSvgPaths.ts`
- `src/app/components/MapBackground.tsx`
- Map-only hardcodes that become redundant once spatial data owns them (migrate carefully; keep `mockData` product fields that rails still need)

---

## Locked architecture

```text
Basemap PNG ──► MapFrame (u,v 0–1)
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   ZoneModel   RoadNetwork   AgentPose
   polygons      graph         poses
        │           │           │
        └────► PathRequest ◄────┘
                    │
                    ▼
            MapRenderer (P0–P2 craft)
                    │
                    ▼
              SentinelShell
```

### Coordinate frame

- **Authority:** `MapPoint { u: 0–1, v: 0–1 }` relative to the operational basemap (`1691×914` content frame used today).
- **Display:** `toScreen(point, viewport)` — replaces scattered Figma `sx/sy` inside render code.
- **HUD labels:** fake local meters / grid IDs (“Grid 4C”) remain display-only — not real GIS.
- One-time migrate: existing zone polygons, anchors, drone/team `{x,y}` → u/v via `u = x/1691`, `v = y/914`.

### Zone model — read the photo correctly

These five zones are operationally load-bearing. Author polygons that match **land use on the basemap**, not decorative Figma leftovers.

| Zone id | Image / terrain role | Ops role | Current polygon notes (1691×914) |
|---------|----------------------|----------|----------------------------------|
| `forest-north` | Mountain / ridge fire — steep vegetated north-central ridge, anomaly ~Grid 4C | Spread origin; survey + perimeter first | Large north polygon; center ~756,206; anomaly 608–756 band |
| `buffer-west` | Western edge corridor — road access, intermittent trees | Passive alternate egress reserve | Far-left strip; center ~184,142 |
| `buffer-east` | Eastern open service / ingress edge | Primary responder + relay corridor | Far-right strip; center ~1486,154 |
| `residential-west` | West residential street grid | Secondary human consequence | SW block; center ~332,676 |
| `residential-south` | Primary south/SE residential grid | Highest human risk; evac guidance | SE block; center ~1068,760; 94 structures story |

**Phase 1 mutation:** expand/contract by margin (u/v delta or fake meters) from TALON/operator. Updates envelope + “structures in path” consumers. **No** freehand polygon editor.

### Road network — hand-authored on visible roads

Do **not** CV-trace the PNG. Author ~25–50 nodes on visible road centerlines:

| Corridor | What to place | Why |
|----------|---------------|-----|
| Residential south grid | Street lattice through Zone 1 | Evac A/B, Herald / guidance holds |
| Residential west grid | Internal streets + connectors | Alpha staging, west swing |
| Buffer-east service | Ingress / open roads into forest edge | Responder route, Relay-02/03 |
| Buffer-west corridor | Edge road spine | Alternate egress, Relay-01, Alpha |
| Forest-edge connectors | Ridge ↔ residential / buffer handoffs | Scout/LiDAR arcs become pathable |

Edge metadata: `kind: arterial | local | service`, `allowed: drone | team | both`.

Derived routes become **edge sequences** (or shortest paths), not orphan Beziers:

| Today (decorative) | Becomes |
|--------------------|---------|
| `EVACUATION_ROUTES` Route A/B | Named corridors on residential graph |
| `RESPONDER_ROUTE` | Path on buffer-east → residential-south edges |
| `MISSION_ANCHORS` pixel holds | Snap to nearest node / edge position |

Seed operational anchors (already in map code) become graph nodes:

- Forest Overwatch (610, 302)
- Ridge LiDAR Hold (1086, 433)
- Buffer Relay West / East (538, 570) / (954, 603)
- Residential Egress (1378, 781)
- Alpha / Bravo staging (530, 616) / (950, 640)

### Agents + paths

- `AgentPose`: id, kind, position along edge or at node, status, `assignedZoneId?`, `mission?`
- On assign / deploy: `PathRequest` → Dijkstra/A* → polyline → **pathfollow** (ease; reduced-motion = snap)
- Rails inventory reads the **same** assignment write path as the map

### Renderer — P0–P2 baked in (not a retrofit)

| Priority | Craft rule |
|----------|------------|
| **P0** | No glow-as-presence; one map label recipe (H 20–22, `radius.control`/`dense`, `typeScale.metadata`, `tracking.telemetry`) |
| **P1** | Shared selection-ring / status-dash for drones + teams; anomaly = core + one ring (+ optional unverified chip) |
| **P2** | Locked zone stroke ladder + dash set; colors only from `T.*` / `tone.*` |

Optional atmospheric fire FX may keep restrained motion; **markers may not** use glow-as-state.

---

## Workstreams (sequential)

### 1.1 Branch + archive

Exit: `feat/map-spatial-os` exists; legacy map recoverable in ≤1 command.

### 1.2 Spatial data package

New folder `src/app/map/`:

- `frame.ts` — MapFrame, `toScreen` / `fromScreen`
- `zones.ts` — ZoneModel + expand helper (authored against basemap)
- `roads.ts` — nodes, edges, pathfinding
- `agents.ts` — poses + pathfollow helpers
- `routes.ts` — named operational corridors as edge sequences
- `types.ts`

**Design-critical authoring pass:** place nodes/polygons while viewing the basemap at native aspect; verify forest/mountain fire, both buffers, both residential blocks, and primary road spines.

Exit: data-only tests for pathfinding + zone expand; no UI yet.

### 1.3 New canvas shell

- `SpatialMapCanvas.tsx` — layers: basemap → zones → roads (optional debug) → routes → agents → HUD
- Wire into `SentinelShell.tsx` in place of legacy `MapCanvas`
- Preserve selection / spatial hover / `coreMode` contracts

Exit: baseline + contain + rescue scenes render with correct zone footprints.

### 1.4 Craft renderer (P0–P2)

Implement under `src/app/map/render/` with tokens only. Extend `scripts/audit-design-tokens.mjs` to cover `src/app/map/`.

Exit: `npm run verify:design` green; map labels one family.

### 1.5 Path animation + assignment coupling

- Deploy / assign / evacuate update `AgentPose` + enqueue path
- Animate along polyline; audit log on arrival
- Left/right rail fleet lists reflect live assignment
- Free mode: assign a drone to a zone → motion on roads

Exit: scripted verify path + free-mode assign demo in `verify:flows` or new `verify:map` smoke.

### 1.6 Zone mutation (thin)

- TALON chip or operator control: expand/contract active zone margin
- Map redraws polygon + envelope; panels keep existing fields fed by derived metrics

Exit: one contain-scene interaction changes zone geometry without swapping scene SVG.

---

## Out of Phase 1

- WebGL / 3D rebuild (already rejected for ops slot)
- Auto road extraction from pixels
- Full freehand zone editor
- Bounded map pan / extended art margin (separate plan)
- Content voice rewrite and shadcn `ui/` delete (queued after map)

---

## Verification

- Visual: baseline, verify-active, contain-recommended, rescue-nominal @ 1440×900
- Interaction: select zone/drone/team; assign → pathfollow; expand zone
- Reduced motion: paths snap
- Core embed: legend / review dock rules unchanged
- `npm run verify:design` + typecheck; extend route/flow verifies for new map hooks

---

## Success criteria

1. Map behavior is **data-driven** (zones/roads/agents in MapFrame), not Figma path soup.
2. Forest/mountain fire, buffers, residential blocks, and road spines **read correctly** against the photo.
3. Assignment produces **animated road paths**; inventory state matches map.
4. Visual craft matches shell material law (no glow-as-state markers; one label recipe).
5. Legacy canvas recoverable from archive/branch if cutover fails.

---

## Execution order (when you say go)

1. Safety: commit/stash DS → branch → archive
2. Data package + authoring (zones + roads against image)
3. SpatialMapCanvas cutover
4. Craft renderer P0–P2
5. Pathfollow + assignment
6. Thin zone expand
7. Verify + green gates
