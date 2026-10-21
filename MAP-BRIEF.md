# MAP BRIEF — tactical-terrain engine, phase 2

> **Status: operational artifact, not authority.** This is the paste-in brief
> for the external build session. It carries only the **hard contract** —
> the things that are non-negotiable or the build drifts.
>
> **The product content lives in `docs/sentinel-v2-master-plan/12-incident-flow-and-map-states.md`.
> Paste that file with this one.** It defines the phases, the layer
> catalogue, the rules, and the three situations. This file says how the
> engine must behave so the content can be dropped in.
>
> **Do not re-derive the product.** The flow document is the product
> requirement. Your job is to make the engine able to render it.

---

## 0. Where the build stands

A working engine exists: terrain from a DEM, two cameras over one mesh,
Line2 overlays, a drone PiP with its own camera, day/night, instanced
vegetation, an ocean plane, a backdrop ridge, and a `tools/` harness
(build · verify · serve · shot · probe · fetch-real-data · gen-scenario).

**Do not rebuild it. Extend it.** Everything below is additive.

Current budget: 13 draw calls at rest, 19 with the feed open, ~405K triangles
of which ~204K is vegetation.

---

## 1. The one architectural rule

> **The engine renders a SITUATION. It must never know what a fire is.**

A situation is a set of layers plus a clock. "Fire perimeter" is one
particular polygon among ~23 layer kinds. The engine must render a situation
with no perimeter, no routes, and no fire at all, and still produce a
complete, credible map.

---

## 2. New primary API — the layer manifest

Today overlays are set one at a time. A situation has ~23 layers that change
together. Add:

```ts
interface LayerEntry {
  id: string;
  kind: "terrain" | "roads" | "structures" | "points" | "polyline"
       | "polygon" | "marker" | "heat" | "track" | "label"
       | "plan" | "draft";
  visible?: boolean;      // default true
  opacity?: number;       // 0..1, default 1
  order?: number;         // paint order, low = behind
  data: unknown;          // kind-specific payload (existing overlay types)
  style?: unknown;        // existing per-kind style fields
  validFrom?: number;     // seconds since incident start
  validTo?: number;
  provenance?: {
    source: string;                                // "USGS 3DEP", "FLIR FT-01", "TALON plan v3"
    basis: "measured" | "modeled" | "authored";    // per DECISIONS.md §1.3
    asOf?: string;                                 // ISO timestamp
  };
}

interface LayerManifest {
  situationId: string;
  phase: "standby" | "detection" | "sizing" | "plan"
        | "authorized" | "operations" | "revised";
  t: number;                 // scenario clock, seconds
  layers: LayerEntry[];
}

engine.setLayerManifest(m: LayerManifest): void
engine.getLayerManifest(): LayerManifest
```

Requirements:

- **Atomic and idempotent.** One call replaces the whole layer set in a
  single frame. No pop-in, no frame where old and new coexist.
- `kind: "plan"` and `kind: "draft"` are the same composite renderer with
  different treatment: **`plan` is committed — solid, full opacity. `draft` is
  a proposal and must be unmistakably provisional — ghosted, amber, thinner.**
  An operator must read the difference in one glance, without a legend.
  This is the most important visual rule in the product. Do not soften it.
- `provenance` must be **renderable**: a basis badge (`measured` / `modeled` /
  `authored`) and a source label in the layer inspector. The host must never
  have to fake this in DOM.
- `validFrom` / `validTo` drive visibility over time, so a layer can appear
  and disappear as the incident develops without the host re-sending it.

---

## 3. Time

```ts
engine.setTime(t: number): void
engine.getTime(): number
engine.getTimeRange(): [number, number]
```

One call must drive: `track` layers revealing along their `t0…t1`; layer
visibility via `validFrom`/`validTo`; any time-stamped progression (a
perimeter that grew); the `t` echoed in `getMetrics()`.

**Time must be settable backwards.** Scrubbing back restores the earlier
state exactly — it must not accumulate.

---

## 4. Transitions

When the manifest changes, nothing may pop.

- New layer: fade in ~400 ms.
- Removed layer: fade out ~250 ms.
- Changed geometry on an existing id: cross-fade, never a hard cut.
- A `draft` appearing gets its own motion — it should **draw in**, so the
  operator perceives new information rather than a glitch.
- All transitions suppressible via `engine.setTransitions(false)`, and must
  respect `prefers-reduced-motion`.

---

## 5. Generality must be proven, not asserted

**This is the acceptance criterion that matters most.** The harness must
render the same engine in **three situations**, and they must look
*deliberately different* — not like one scenario with layers switched off.

- **A — WUI breakout.** Everything: perimeter, burn scar, isochrones,
  weather, routes, staging, suppression, air ops, triage, evac zones,
  detections, ground teams, and a `draft` revision.
- **B — small incident.** One detection, minimal resources, **no perimeter
  yet**. Must not look like A with pieces missing.
- **C — standby.** No incident of any kind. A **complete, calm, legitimate
  map** — not an empty canvas, not an error state.

Add a **situation switcher** and a **phase scrubber** to the harness so a
reviewer can walk the whole arc in seconds.

---

## 6. Idle behaviour — must be demonstrable

The engine currently reports `motion: running` forever because the animated
chevrons keep a frame dirty. Add:

```ts
engine.setAnimated(boolean): void
```

With animation off and the camera static, the engine must go to **zero GPU
draws** and report `idle: true`. The product's "0 FPS idle" claim depends on
this being provable.

---

## 7. Carried over — do not regress

- **≤ 20 draw calls** at rest (≤ 24 with the PiP open).
- **≤ 450K triangles.** The previous 200K figure was a proxy for "don't make
  the demo heavy" and no longer serves that purpose. Do not regress past this.
  Vegetation is currently 16,000 instances / 204K triangles and is a
  deliberate choice; it may be tuned, and it may be toggled, but the scene
  must not silently exceed 450K.
- 0 GPU work when static and nothing is animating (§6).
- Device pixel ratio capped at 1.25×.
- **No shadow maps, no PBR, no bloom, no SSAO, no skybox, no loaded
  textures.** The world is dark and matte; **only state emits light.**
- Contour + graticule on the top-down view only.
- Coordinate law unchanged: local metres, +x east, +y north, 6000 × 3250 m.
- `loadWorldData()` must keep working against the real DEM.

---

## 8. Out of scope — do not build

A timeline scrubber UI · a provenance drawer UI · structure-triage colour
schemes · incident narrative logic · anything that decides *what* the
situation is · anything that decides what a fire is. The host owns the
situation; the engine renders it.

The harness chrome is scaffolding and does not ship. What ships is the canvas
plus the manifest API.
