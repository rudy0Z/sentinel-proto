# SPEC.md — the product spec (owner-authored)

> **Status: canonical (in progress).** Written **before** the build, from the owner's intent.
>
> **This file is the contract.** Code is built *from* this document, not the other way round. If the code and this file disagree, one of them is wrong — find out which before changing anything.
>
> **Precedence:** `DECISIONS.md` → this file → everything else in `docs/`.
>
> **How this file was made:** section-by-section interview with the owner, 2026-10-19 onward. Each section records what the code *actually does today* (verified on disk) next to what the owner *wants*, so the gap is never hidden.
>
> **Every section ends with an owner ruling.** No ruling → the section stays `OPEN` → **nothing in it gets built.**

---

## Interview order

Deliberately sequenced so each answer constrains the next. Sections 1–2 are the foundation; the rest follow.

| # | Section | State | Blocks |
|---|---|---|---|
| 0 | **North star** — what is the final solution? | 🟡 interview in progress | everything |
| 1 | **Map & spatial model** | 🟢 ruled 2026-10-21 — see §1.1 | §2, §4, panels |
| 2 | **Shell & layout** | 🟡 interview | §3, panels |
| 3 | **TALON surface & conversation** | ⬜ queued | flows |
| 4 | **Panels & data density** | ⬜ queued | §2, §3 |
| 5 | **Authority gates & dissent** | ⟢ verified strong — confirm no redesign needed | — |
| 6 | **Motion & material** | ⬜ queued | all chrome |
| 7 | **Voice, copy & honesty boundary** | 🟢 golden rule 1 — confirm | — |
| 8 | **Live mode & server** | ⬜ queued | — |

Legend: 🟢 verified healthy 🟡 interview pending 🔴 blocked on owner research ⬜ queued

---

## §0 — North star

> **Status: 🟡 interview in progress**

**What the code does today:** a scripted 20-scene wildfire command prototype. TALON detects, verifies, recommends; a human operator authorizes. Two phases: Intelligence → Operations. The operator walks scenes via a `SCENES` chip, holds to authorize, dissents into contested watch, escalates, and debriefs.

**What the owner says the final solution is:** _(awaiting)_

**The gap:** the code is a well-gated prototype with 7,400 LOC of unreachable surface and four coexisting chrome generations. The owner reports that "every section has faults." Whether those are design faults or visibility faults is exactly what this interview determines.

**Owner ruling:** _(pending)_

---

## §1 — Map & spatial model

> **Status: 🟢 RULED 2026-10-21. The build contract is §1.1 below — build from that.**
> Architecture: one world model, three fidelities (2D world model / drone EO camera / drone IR camera) with a degradation ladder as a designed state. Day and night both supported; the scenario runs at night.

**What the code does today — three renderers, none canonical:**

| Renderer | LOC | Entry | Notes |
|---|---:|---|---|
| `SpatialMapCanvas.tsx` (2D SVG) | 1,286 | default on `/` | Best-gated (9/9 checks). Basemap is a **3.5 MB PNG**, not the baked data |
| `Map3DExplorer.tsx` + `map/runtime/` | 1,731 | `EXPLORE · 3D` button | Real three.js. **Covered by no gate** |
| `map/hairline/` | 1,469 | typing `#/hairline-map` | Parallel three.js renderer. **No UI link, no gate.** Reuses world *data*, duplicates all *render* code |

**Known defects to resolve regardless of direction:**
- Two live, disagreeing fire geometries (`fireModel.FIRE` vs `world.fire.band`), both drawn by `worldScene.ts`
- Roads exist in the data (`roads.ts`, OSM) but are **not** a designed layer — the owner wants entry/escape routes generated on the map
- `world.landuse` (10 KB) is baked, shipped, and never drawn

**Owner ruling on Q1 (which renderer survives) and Q2 (hairline: future or experiment):** see §1.1 below — both ruled.

---

## §1.1 — The map architecture: one world, three fidelities

> **Status: 🟢 RULED 2026-10-21.** This is the build contract for the map.

### The idea

The current failure is not that the map looks wrong. It is that **the map has no model of what it is showing.** It is a PNG with overlays (2D), a photoreal world (3D), and a second photoreal world (`hairline/`) — three pictures of three different things, with no shared truth underneath. So nothing can be trusted to register, and nothing can degrade gracefully.

The fix is a **single world model** with a **fidelity ladder** over one visual channel.

| | Channel | Rendered as | Active when |
|---|---|---|---|
| **Tier 3** | **World model** | Top-down 2D, elevation-shaded, carrying every data layer | **Always on.** The substrate. Also the fallback. |
| **Tier 1** | **Drone EO camera** | 3D world rendered from the drone's pose | Default. Operator sees the world from the air. |
| **Tier 2** | **Drone IR camera** | The same 3D world, Ironbow false-colour | EO is degraded by smoke or darkness. |

Three consequences that matter:

1. **The 2D map is not a lesser map.** It is the world model — the always-available substrate that carries the data layers and the orientation. It never blanks.
2. **The 3D is not a separate map.** It is the *camera view* of the same world. Switching between 2D and 3D is a **fidelity switch**, not a view switch.
3. **Degradation is a designed state, not an error.** When smoke kills the camera, the operator drops to the world model and *keeps the world*. The operator never loses situational awareness because the feed died. **This is the product's differentiator and it is a design decision, not a rendering fallback.**

### Day and night

FireTrace is a day product. Sentinel is not: the scenario is a **night** initial attack.

- The world model carries a **scene state** (sun elevation, ambient, visibility) and renders **day or night** from it. Not a theme swap — a lighting state.
- The camera views follow the same scene state, so the EO feed is genuinely low-light and the IR feed is genuinely the reason you switch to it.
- Both are authored states of the same world, not two worlds.

### Build spec

**M1 — World model & one coordinate law**
- Keep `map/world/` (USGS 3DEP, OSM roads/buildings, ESA vegetation) — **re-bake the DEM to 3–5 m** (current 400×220 ≈ 15 m; too coarse for contours or tactical relief).
- **One law:** local metres → world, in a single module. Every renderer consumes it. `frame.ts` becomes a thin projection over it. No renderer computes its own transform.
- **One fire.** `fire/fireModel.ts` and `world.fire.band` are reconciled into a single model in the world model. The other is deleted, not preserved.
- `world.landuse` is either drawn or dropped.

**M2 — Scene state**
`world/scene.ts`: sun/ambient/visibility → day or night grade, camera exposure, weather layer values. Authoritative for all tiers.

**M3 — Tier 3: the 2D world model**
- Top-down orthographic, **rendered from the data — no PNG basemap**. `src/assets/sentinel-map-overhaul.png` (3.4 MB) is deleted.
- Renders: elevation-shaded relief, vegetation, roads, structures, water.
- **Cartographic furniture (all missing today):** graticule with degree-minute labels · compass · live scale bar · terrain features labelled with elevation · attribution.
- Carries every data layer (M5).

**M4 — Tiers 1 & 2: the drone camera**
- One three.js scene, camera pose = drone pose.
- **Stylized relief diorama** (FireTrace-grade): faceted terrain, low-poly trees, flat-shaded, one strong key light. **This replaces the NAIP drape and the 6,000 tree instances** — which is what removes the white-box buildings and the ocean mosaic gap, rather than patching them.
- **IR mode:** same scene, Ironbow false-colour, fire rendered as heat.
- **Drone HUD over the view:** alt AGL · ground speed · heading · SPI/RNG/ELEV · battery · link · gimbal depression · EO|IR toggle.
- Operator camera states: free orbit **and** drone-pose (gimbal), with a fly-to.

**M5 — Data layers (composited over every tier)**
- *Fire:* perimeter **with time-stamped nodes** (FireTrace's pattern — reads better than nested rings) · dNBR burn scar with severity gradient · modeled spread, labelled `modeled · Rothermel 1974` per `DECISIONS.md` §1.3/§1.6 · head axis · suppression lines (dozer/hand) · ignition point with timestamp · spot-fire detections with source drone and temperature.
- *Values at risk:* structures with **triage status** (not "at risk" — a projection) · evacuation zones (warning / mandatory) · routes in three states (active egress / standby / compromised).
- *Assets:* ground units with type and status · air ops.
- *Environment:* wind vector · fuel moisture · ERC · flame length — **qualified "at fire front"**, per FireTrace.

**M6 — Degradation ladder** *(the differentiator)*
- Tier indicator always visible — the operator always knows which fidelity they have.
- Smoke events step EO → IR → world model, and back.
- The world model also serves **special data** that has no photographic representation.
- Every transition is logged and visible. It is a state, not a glitch.

**M7 — Time**
Timeline scrubber drives world state: perimeter interpolates across the progression, drone breadcrumbs animate, event markers on the track.

**M8 — Analytics deck**
Three charts in one slot, subject switches with the tier: world model → **Fire Area / Rate of Spread / Elevation Profile** (terrain cross-section with burn-severity band) · camera → **Altitude / Max Temperature in View / Battery**. 60 s of history solid, projection dashed.

**M9 — Interaction & selection**
Select · hover-interrogate · pan/zoom · layer control with per-layer opacity · measure · fly-to from a list to the map. The map is interrogable, not just watched.

**M10 — Provenance & uncertainty**
Layer panel carries basis and "as of" per layer. Every metric states **measured / modeled / authored**. Uncertainty is an envelope, never a bare percentage. *(Implements `DECISIONS.md` §1.3 as a visual grammar, not a footnote.)*

**M11 — Performance budget** *(numbers, decided before Sprint 1)*
Draw calls · triangles · frame time · idle state. The existing 19/19 draws · 188K tris · 0 FPS idle is the baseline to beat, not to exceed. Stated as a number in this file so a sprint cannot silently blow it.

**M12 — Gates**
The 3D scene is covered by **no gate** today (`DECISIONS.md` §6.4). Add coverage: renders without console error, draw-call count within budget, tier switching works, degradation ladder steps, night grade applies.

### Build order

| Sprint | Delivers | Gate to pass before moving on |
|---|---|---|
| **S0** | M1 + M2 — world model, one coordinate law, one fire, scene state | typecheck; map 9/9 still green against the new law |
| **S1** | M3 — Tier 3 2D world model replaces the PNG basemap | map gate; a scene screenshot reviewed against the FireTrace frame |
| **S2** | M4 — Tier 1/2 camera + drone HUD | new 3D gate (§M12) |
| **S3** | M5 + M10 — data layers and provenance | new 3D gate; token audit at or below baseline |
| **S4** | M6 + M7 + M8 — degradation ladder, time, analytics deck | new 3D gate; flows green |
| **S5** | M9 + M11 — interaction, budget | full suite green |

### Definition of done — the map

A reviewer opening the app must be able to:

1. See a **real place** — USGS terrain, OSM roads and structures — not a stylised impression. *(S1)*
2. See the **fire as a fire**: a perimeter with a history, a burn scar, a head axis, and an origin. *(S3)*
3. **Interrogate** any element and get what it is, where it came from, and how fresh it is. *(S3, S5)*
4. **Move through time** and watch the incident develop, with the charts tracking. *(S4)*
5. See the world **from the drone**, in EO and in IR, with a real HUD. *(S2)*
6. **Lose the camera feed** and still keep the world, in a lower fidelity, with a visible indication of what happened. *(S4)*
7. Find **nothing on the map that contradicts anything else in the product**. *(S0 onward)*

### Owner ruling

> **Q1 — which renderer survives:** **rebuild the map module fresh, in this repo.** Keep `map/world/` (the real data) and the coordinate law; delete `map/hairline/`, `map/_archive/`, `components/ui/`, and the PNG basemap. The three-renderer state is retired. *Ruled 2026-10-21.*
>
> **Q2 — hairline:** **dead experiment.** 1,469 LOC, a parallel renderer, no UI link, no gate, and docs that contradict themselves three ways. It reuses the world *data* correctly, so nothing is lost by deleting the *render* code. *Ruled 2026-10-21.*
>
> **Architecture:** one world model, three fidelities (world model / EO camera / IR camera), with a **degradation ladder** as a designed state. The 2D map is the always-on substrate; the 3D is the camera view of the same world. Day and night are both supported; the scenario runs at night. *Ruled 2026-10-21.*

---

## §2 — Shell & layout

> **Status: 🟡 interview pending**

**What the code does today:** v3 chrome is the default — a 56px collapsed icon rail left and right, an 88px bottom deck with a 64px TALON orb, and a rail system of 9 panels. `?layout=v2` and `?layout=legacy` still work. `SentinelShell.tsx` is 3,867 lines and holds all three generations plus the map, the deck, the modals, and the entry flow.

**Known facts for the ruling:**
- Deck is 88px in code; `sentinel-core/06` and `redesign-2026/15` both say 96px
- `redesign-2026/14-final-layout-spec.md` says the centre orb was deleted; code renders it
- Tablet recomposition was never built (deferred, honestly labelled)

**Owner ruling:** _(pending)_

---

## §3 — TALON surface & conversation

> **Status: ⬜ queued**

**What the code does today:** `TalonSession.tsx` drives the v3 orb and session. `talonSurface.ts` derives voice/mark/posture from scene state. Gates pass for suggested-question conversation, re-raise, dissent, and reconciliation.

**⚠️ The thing that makes this repo feel unfinished:** `panels/TalonCopilotPanel.tsx` is **72.9 KB — the largest component in the app** — and it is **not rendered on the default shell**. It renders only under `?layout=legacy`. v3 ships a different, smaller TALON surface. Several hundred doc references describe the legacy one.

**Owner ruling:** _(pending — is the 72.9 KB surface the design you want, and should v3 adopt it? Or is `TalonSession` the intended one?_

---

## §4 — Panels & data density

> **Status: ⬜ queued**

**What the code does today:** `components/kit/` is a real obsidian-glass primitive kit (1,175 LOC, 17 primitives, imported by 11 files across v2, v3, panels, and the showcase page). `sentinel-core/07-panels-charter.md` is the contract. `verify:attention` enforces one-pop-at-a-time with 19 contract checks — a genuinely strong, well-documented section.

**Owner ruling:** _(pending)_

---

## §5 — Authority gates & dissent

> **Status: 🟢 verified strong — confirm no redesign needed**

Five flows pass: guided verification to the authority gate, dissent routing into contested watch, focus trap + restore, contested watch preserving both positions, re-raise showing what changed. `GATED_ACTIONS` is structural, staged actions expire back to watch, and `verify:machine` confirms 20 scenes / 39 edges / 0 dead ends.

This is the product's thesis and it is the best-documented, best-gated section in the repo. Code, gates, and docs agree.

**Owner ruling:** _(pending — confirm this is not up for redesign)_

---

## §6 — Motion & material

> **Status: ⬜ queued**

`kit/` implements the obsidian-glass materials. `motion` and `liquid-gooey` are wired. Reduced-motion is covered by `verify:routes`. The 276-warning token baseline is the ratchet.

**Owner ruling:** _(pending)_

---

## §7 — Voice, copy & honesty boundary

> **Status: 🟢 golden rule 1 — confirm**

`domain/microcopy.ts` (12.4 KB) holds the product voice. Golden rule 1 forbids invented metrics and statutory/cryptographic authority claims; receipts are a hash-chained event append, and the authority packet is a mutual-aid *draft* the operator sends. A prior pass (`M1 conversation repair`) explicitly removed prototype/dev copy from product surfaces.

**Owner ruling:** _(pending)_

---

## §8 — Live mode & server

> **Status: ⬜ queued**

`server/` is a real Fastify + WebSocket + SQLite hash-chain + LLM gateway (10 files, 7 endpoints), wired at `SentinelShell.tsx:51,864` and driven by `?feed=live`. A 49 KB `sentinel-demo.db` is committed. Docs that called this "stubs" or "unwired" were wrong — it was simply missing from `AGENTS.md`'s repo map until 2026-10-19.

**Owner ruling:** _(pending — is live mode a portfolio asset or internal scaffolding?)_

---

## Change protocol

1. Owner rules on a section here.
2. The ruling is written into that section **with the date**.
3. If it contradicts a locked decision, `DECISIONS.md` gets a new entry and the old one is marked `SUPERSEDED` — in the same change.
4. Only then does code change.
5. The full gate suite must be green before the section is marked built.
