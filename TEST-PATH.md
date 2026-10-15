# TEST PATH — Sentinel first-run walkthrough

> **Status: canonical** · v3 shell · verified against `verify:routes` 23/23 and
> `verify:flows` 22/22 on 2026-10-15.
>
> A prototype is only finished when a stranger can reach a designed state
> without asking a question. This is that path. Every step is a URL you can open
> directly — no replay of a 90-second timer required.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173/embed/sentinel/
```

Optional: `npm run preview -- --port 4190` serves the production build.

---

## 1 · The 90-second arc (the spine of the product)

Walk this in order. Each scene is one operator decision. The deck is the only
place gates live — a plain click on a gated tile is *refused*; you must hold it.

| # | URL | Do this | What you should see |
|---|---|---|---|
| 1 | `/?scene=baseline` | — | Quiet watch. Deck reads `SCAN · T+0:00`. TALON idle, no interrupt. The clean baseline. |
| 2 | `/?scene=alert-command` | — | Top airspace lights with one arbitrated interrupt. Fire progression is on the map: isochrones, burn scar, head-fire axis. |
| 3 | `/?scene=investigation-pending` | — | Dispatch is **disabled with a live ETA**. This is the first thing to check: the blocker reason is visible, not hidden. |
| 4 | `/?scene=verify-active` | — | Peak cognitive load. Two decisions: `Confirm incident` vs `Monitor only`. The latter's subtitle is the *consequence* ("Records dissent · contested watch"). |
| 5 | `/?scene=authority-notification-ready` | — | Staged gate with a countdown ring. **Hold `Send Authority Packet` for 2s.** A plain click does nothing — that is the constitution, not a bug. |
| 6 | `/?scene=monitoring-contested` | — | Declining does not return to baseline. It lands here, with TALON's position and yours both preserved. |
| 7 | `/?scene=talon-reraise` | — | The appeal. `THRESHOLD CROSSED · new evidence since the override`, routed to the **Regional Duty Supervisor** — never back to you. |
| 8 | `/?scene=contain-recommended` | — | Operations begins. Five staging tiles; authorize stays locked until coverage + guidance + teams are all staged. |
| 9 | `/?scene=rescue-nominal` | — | Downstream of the gate. Structures cleared, routes live. |

**What to notice:** at no point can you execute anything TALON did not stage, and
at no point does the layout move under you.

---

## 2 · The map (both views)

### 2D ops map — the default surface

`/?scene=contain-recommended`

- Fire: **burn scar** (severity ramp), **time-stamped isochrones**
  (`T+00 · 02:24` → `T+60 · 03:24`), **head-fire axis** with direction
  chevrons, live front. Area is derived from the drawn perimeter.
- Zones, spread corridors, drone markers with telemetry chips.
- Hover terrain / zones for the spatial readout.
- **Wheel zooms toward the cursor; drag the background to pan.** The basemap
  and every overlay pan/zoom as one, so nothing can drift apart.

> **Both basemaps are top-down, and that is a correctness law, not a look.**
> Every 2D overlay is projected top-down through one MapFrame law, so an
> oblique backdrop makes them miss the ground — zone labels end up in the sky
> above the ridge they name. The 2D bake therefore runs `?mode=topo`
> (orthographic, fog off); 3D EXPLORE carries the perspective. If you re-bake:
> `npm run render:world` **then** `npm run build` — Vite hashes assets at build
> time, so building first silently serves the previous bake.

### 3D EXPLORE — the terrain question

Press `EXPLORE · 3D` (bottom-left, clear of the rail).

- Real **USGS 3DEP** terrain with **NAIP aerial** draped on it.
- HUD reads `0 FPS · 19/19 CALLS · 184K TRIS` when idle. **19/19 is the budget** — that number is the engineering claim.
- `H` home · `F` fly-by · `L` toggles the LWIR night sensor · `ESC` exit.
- Drag orbit, wheel zoom, right-drag pan.
- Fire, zones, corridors and rings are all **terrain-clamped** — nothing floats, nothing tunnels through a ridge.
- Fire geometry comes from the same `map/fire/fireModel.ts` the 2D map reads,
  so the two views cannot disagree about where the fire is.

### 2D ↔ 3D continuity

The map carries a normalized view (`u`, `v`, `zoom`). Open 3D, orbit, press
`ESC`: the 2D map returns to the sector you were looking at. Spatial context
must not be lost on exit.

---

## 3 · The rails

Both rails are **collapsed by default** (56px) — night-shift ambient load is
near zero. Dots carry status: red = gate waiting, amber = exception, cyan =
computing, one-shot pop = something just updated.

- **Left** (operator pulls): Situation · Map & layers · Fleet · Ledger
- **Right** (TALON): Session · Priorities · Readiness (+ contextual Investigation, Exceptions)

T1/T2 panels **peek** — a ~1.6s glimpse, then dissolve. Budgeted to ≤2 per
10 minutes. Clicking a peek opens it fully. Left never auto-opens.

Fire behaviour (ROS · ERC · fuel moisture · flame length · area) lives in the
TALON session panel. Area is **derived from the drawn perimeter**, so the number
cannot disagree with the map.

---

## 4 · Degraded / failure states (the honest ones)

| URL | Expect |
|---|---|
| `/?scene=satellite-feed-loss` | Gates locked. Blocker reason in the copy, not a dimmed button. |
| `/?scene=network-degraded` | Same discipline on a different subsystem. |
| `/?scene=rescue-battery-critical` | Battery threshold blocks autonomous dispatch. |
| `/?scene=infrastructure-total-loss` | Honest manual fallback. The system does not pretend. |
| `/?scene=infrastructure-total-loss&feed=live` | The live gateway drops to an `authored-fallback` badge. |

---

## 5 · What this prototype is not

State it before anyone else does:

- **No live drone feed.** Feeds are generated stills, labelled as such.
- **No fire-trained AI.** TALON is a general LLM behind a permissioned tool layer. `docs/portfolio-case-study/talon-model-boundary.md` is the full disclosure.
- **The fire is authored.** The *terrain* is real (USGS/OSM/ESA/NAIP); the
  progression shape is authored. NWCG metrics are real definitions with
  authored values, labelled as such on the surface.
- **Confidence percentages are authored**, not computed.
- The 48-min → 90-s figures come from the challenge brief, not a field study.

---

## 6 · Gates (what "done" means here)

```bash
npm run verify:design      # typecheck + token audit + map 9/9
npm run verify:machine     # 20 scenes / 39 edges, reachability
npm run verify:attention   # arbiter contract
npm run verify:signals     # telemetry ↔ number coherence
npm run verify:routes      # 23 scene/view combos + axe + console
npm run verify:flows       # 22 browser flows
npm run eval:talon         # 42 adversarial cases, zero silent breaches
```

All green at time of writing. A red gate invalidates any published copy that
quotes it.
