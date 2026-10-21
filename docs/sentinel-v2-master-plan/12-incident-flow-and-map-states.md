# 12 — Incident flow & map states

> **Status: canonical.** The contract for what the map shows, when, and why.
> Written before the build, from the owner's product intent.
>
> **Precedence:** `DECISIONS.md` → `SPEC.md` → this file → everything else in `docs/`.
> Code is built *from* this document. If the code and this file disagree, one of
> them is wrong — find out which before changing anything.
>
> **Companion:** `SPEC.md` §1.1 defines the map's *architecture* (one world
> model, three fidelities, degradation ladder). This file defines the map's
> *content* — the situations it renders and how they change. They are
> complementary; neither is sufficient alone.

---

## 0. What a map is, here

> **The map is a function of two inputs: `(situation state, time)`.**

It shows **only what is currently true**, and **the difference between what is
true and what is proposed**. Those two clauses are the entire design. The
second one is what makes the operator's revision of TALON's plan legible
instead of a plan that silently mutated underneath them.

The map is never a fire map. "Fire perimeter" is one particular polygon among
about twenty layer kinds. The map must be able to render a situation with **no
fire at all** and still produce a complete, credible picture.

---

## 1. The incident arc

Seven phases. Each is a step in the operator's actual working sequence: a
report arrives, the operator finds out whether it is real, TALON assembles a
picture and a plan, the operator authorizes, the plan runs, and the operator
revises it.

For every phase: what the operator is doing, what TALON knows, the one job the
map has to do, and which layers exist.

### Phase A · Standby — no incident

| | |
|---|---|
| **Operator** | Watching. Nothing has happened yet. |
| **TALON** | Idle. No recommendation. |
| **Map job** | **Show the place and the assets.** Be a complete, calm, legitimate map of a coastal WUI canyon — the roads, the structures, the terrain, the people and aircraft available. |
| **Layers** | `terrain` · `roads` · `structures` · `labels` · `assets` |
| **Operator can** | pan · zoom · interrogate any feature · open the fleet roster |

> **The failure mode to avoid.** An empty map with a black canvas and the
> word "no data." Standby is a *state*, not an absence. This is the case that
> proves the engine is a situational map rather than a fire renderer.

### Phase B · Detection — something is reported

| | |
|---|---|
| **Operator** | Deciding whether a report is real. |
| **TALON** | Has a detection: a thermal hotspot with a confidence and a source drone. No picture yet. |
| **Map job** | **Show exactly one thing, and show where it is.** A detection is a *point*, not a perimeter. |
| **Layers** | A · `+ detections` (point, with source drone, time, confidence band) |
| **Operator can** | confirm · dismiss · dispatch a drone to look |

### Phase C · Sizing — intel has come back

| | |
|---|---|
| **Operator** | Understanding scope and direction. |
| **TALON** | Has the perimeter, weather, fuel state, and a spread projection with a named basis. |
| **Map job** | **Show how big, and where it is going.** |
| **Layers** | B · `+ firePerimeter` · `isochrones` · `headAxis` · `weather` · `fireDanger` |
| **Operator can** | read the projection · compare against structures · request a different projection basis |

### Phase D · Plan — TALON proposes

| | |
|---|---|
| **Operator** | Reviewing a plan before it costs anything. |
| **TALON** | Has a composed plan: routes, staging, suppression lines, air ops, structure triage, evacuation zones. |
| **Map job** | **Show the plan.** Every element of it, on the ground, at its proposed position. |
| **Layers** | C · `+ plan` (a composite: `routes` · `staging` · `suppression` · `airOps` · `triage` · `evacZones`) |
| **Operator can** | interrogate any element · request a change · reject the plan outright |

### Phase E · Authorized — the plan is committed

| | |
|---|---|
| **Operator** | Has authorized. The authority notification is out. |
| **TALON** | Same plan, now committed. |
| **Map job** | **Show the same plan, restyled as committed.** Nothing moves. Only its status changes. |
| **Layers** | D, with `plan` restyled committed · `+ authority` |
| **Operator can** | issue · withdraw · continue to Phase F |

> **Phase D → E is a state change, not a redraw.** If the geometry moves
> between D and E, the operator cannot trust that what they approved is what
> got sent.

### Phase F · Operations — the plan is running

| | |
|---|---|
| **Operator** | Supervising. Assets are moving; conditions are changing. |
| **TALON** | Tracking live state: where everyone is, whether the plan is still working, what has changed. |
| **Map job** | **Show where everyone is, and whether the plan still holds.** |
| **Layers** | E · `+ groundTeams` · `assetTracks` · live route status (open / compromised / closed) |
| **Operator can** | re-task · call for a change · see the delta since last check |

### Phase G · Revision — the operator changes the plan

| | |
|---|---|
| **Operator** | Has changed their mind about something. |
| **TALON** | Has produced a revised plan. |
| **Map job** | **Show the revision *against* the committed plan.** The delta is the message. |
| **Layers** | F · `+ planDraft` (the proposal) alongside `plan` (what is still committed) |
| **Operator can** | approve the draft (it becomes `plan`) · reject it (it disappears) |

> **A draft must never be mistakable for a commitment.** The draft renders
> ghosted, amber, and thinner. The committed plan stays solid. The operator
> reads the difference in one glance, without a legend.
>
> This is the single most important visual rule in the map, and it is the one
> most easily lost in implementation.

---

## 2. The three situations

The engine renders all three. **No engine code branches on incident type.**

### Situation A · WUI breakout — the primary incident

Encinal Canyon, Malibu. A fire runs the ridge from Trancas Canyon toward the
coast; PCH is the only way out; the 80° hairpin is the choke point.

- Exercises every layer kind, every phase, and the plan revision.
- The interesting geometry is the *road network*: a single-lane switchback
  with one way out is why the choke point exists, and why the plan is a
  problem at all.
- **The map must not look like a fire picture.** It must look like a map of
  a real place with a fire on it.

### Situation B · Small incident — minimal resources

One thermal detection from one drone. Nothing has been sized. Two ground
units. A short fire line. One crew.

- Layers: `terrain` · `roads` · `structures` · `labels` · `assets` ·
  `detections`. **No perimeter yet** — it has not been sized, so drawing one
  would be a lie.
- **The map must not look like Situation A with pieces missing.** It must look
  like a *genuinely smaller* situation: less mark-up, more empty ground, and
  a sense of scale that matches the incident.
- This is the situation that catches an engine that only knows how to draw a
  fire. If the engine has a hardcoded perimeter, this situation exposes it
  immediately.

### Situation C · Standby — no incident

Phase A. No fire, no perimeter, no routes, no incident of any kind.

- The operator is on watch. The map shows the place and the available assets.
- **A complete, calm, legitimate map** — not an empty canvas, not an error
  state, not a spinner.

---

## 3. Layer catalogue

Every layer, what it means, when it exists, and who owns it.

| Layer | Kind | Means | First appears | Owner | Provenance |
|---|---|---|---|---|---|
| `terrain` | terrain | The ground. | always | world | measured (USGS 3DEP) |
| `roads` | polyline | The road network. | always | world | measured (OSM) |
| `structures` | polygon | Values at risk. | always | world | measured (OSM) |
| `labels` | label | Place names, elevations. | always | world | measured |
| `assets` | marker | Aircraft, engines, crews, drones. | always | situation | measured / authored |
| `detections` | points | A thermal or visual detection. | B | TALON | measured (FLIR) |
| `firePerimeter` | polygon | The active perimeter, time-stamped. | C | TALON | modeled |
| `isochrones` | polyline | Projected spread, with a named model. | C | TALON | modeled |
| `headAxis` | polyline | The head fire's advance direction. | C | TALON | modeled |
| `weather` | points | Wind vectors, RAWS readout. | C | weather feed | measured |
| `fireDanger` | label | Fuel moisture, ERC, flame length. | C | weather feed | measured / modeled |
| `burnScar` | polygon | dNBR severity, darkened interior, snags. | C | satellite | measured |
| `evacZones` | polygon | Warning / mandatory / safe. | D | TALON | authored (plan) |
| `triage` | polygon | Structure state: threatened / destroyed. | D | TALON | authored (plan) |
| `routes` | polyline | Egress, ingress, standby. Live status. | D | TALON + live | authored (plan) / measured (status) |
| `staging` | marker | Proposed resource positions. | D | TALON | authored (plan) |
| `suppression` | polyline | Dozer lines, hand lines, retardant drops. | D | TALON | authored (plan) / measured (drops) |
| `airOps` | polyline | Tanker run lines, airspace. | D | TALON | authored (plan) |
| `plan` | composite | The composed plan. | D | TALON | authored (plan) |
| `planDraft` | composite | A **proposed revision**. | G | TALON | authored (proposal) |
| `groundTeams` | marker | Live ground positions. | F | live | measured |
| `assetTracks` | track | Historical flight paths. | F | live | measured |
| `authority` | marker | Authority notification state. | E | situation | measured (system) |

---

## 4. Rules the map must obey

1. **Provenance is a visual element.** Every layer and every metric states its
   basis — `measured` · `modeled` · `authored` — and its source. Not in a
   tooltip; in the layer inspector, and in the readout next to the value.
   *(Per `DECISIONS.md` §1.3. The guard is labelling, not disclaiming.)*

2. **The map never asserts a fact the situation does not contain.** If there
   is no perimeter because nothing has been sized, there is no perimeter. A
   layer that cannot be drawn is **omitted, not faked**.

3. **Physical phenomena appear in sensor feeds; annotations do not.** A drone
   camera sees terrain, fire, and heat. It does not see an evacuation route
   drawn on the map. This distinction is carried per layer.

4. **A draft is never mistakable for a commitment.** See Phase G.

5. **The world never competes with the data.** The terrain is dark and matte.
   Only active operational state emits light.

6. **The map is always interrogable.** Every mark answers: *what is this, where
   did it come from, how fresh is it, and who owns it.*

7. **Layers carry time.** A layer may be valid only in a window. Scrubbing
   time backwards must restore the earlier state exactly, not accumulate.

8. **The map must not branch on incident type.** Same engine, different
   situation data. This is the definition of a situational map rather than a
   fire renderer.

---

## 5. Who controls what

| | |
|---|---|
| **The operator** | Which layers are visible. Zoom, pan, selection, measurement. Whether a plan is approved. Whether a draft becomes the plan. |
| **TALON** | The *content* of the plan, the draft, the projection, the recommendation, and the layers it proposes exist. |
| **The situation** | The facts. Entities, positions, times, and the layer set that is true at this instant. |
| **The engine** | Renders. Knows nothing about fire, plans, or incidents. |

TALON never moves furniture. TALON proposes a *layer*, and the operator
decides whether it is on. That is the same constitution as the command deck:
composition targets are whitelisted, and the agent never rearranges the room.

---

## 6. The world

| | |
|---|---|
| **Site** | **Encinal Canyon, Malibu, California, USA.** |
| **Frame centre** | **34°02.8'N 118°52.3'W** (34.0465, −118.872) |
| **Frame** | 6000 m (E–W) × 3250 m (N–S) |
| **Grid** | 400 × 220, 15 m cells |
| **Contains** | the Pacific, PCH, the Encinal junction, the lower Encinal switchbacks, Trancas Canyon |
| **Choke** | the 80° hairpin — one lane out |
| **Superseded** | the previous frame at 34.032°N 118.815°W (Zuma / Point Dume). It did not contain Encinal Canyon Road at all. |

The previous world (`src/app/map/world/`) is centred on the old frame and
must be **re-baked onto this one**: DEM, roads, buildings, vegetation,
imagery, and the authored fire model, whose coordinates are frame-relative
and therefore move with it.

---

## 7. The three situations as files

```
scenarios/
  standby.json         Phase A. The place and the assets. Nothing else.
  small-incident.json  Situation B. One detection, minimal resources.
  wui-breakout.json    Situation A. The full arc, A → G.
```

Each is a layer manifest plus a phase, a clock, and the entities. The engine
reads one; it does not know which.

**Acceptance:** one engine, three situations, no engine branch on incident
type. Switching scenarios swaps the layer set with no rebuild and no console
errors.
