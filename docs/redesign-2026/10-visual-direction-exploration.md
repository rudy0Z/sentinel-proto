# Visual Direction Exploration — the full option space

> **status: exploratory — pre-decision exploration** (2026-09-30). Supersedes the "warm" recommendation in `09-visual-craft-recipe.md` — **warm/cream/serif is rejected by the owner as the AI-slop uniform** (recorded; that doc's §3 Option A and the sentinel-core 03 warm direction are dead until this doc's pick lands). Cold flat navy (the current v2 skin) is equally dead ("too dark blue"). This doc maps the real design space and names the options, Sentinel-first. The chosen direction will be written into `sentinel-core/03-visual-language.md` as the final world.

**How to read this:** options are positions along five axes — **temperature** (neutral-black ↔ navy ↔ graphite), **where color comes from** (the world/map vs the chrome), **accent** (one electric signal vs a derived ramp), **type** (instrument sans vs mono-forward vs condensed athletic), **finish** (precision instrument vs athletic kinetic). Sentinel-specificity is the filter: wildfire initial attack, night operations, thermal/LWIR imaging, autonomous aerial watch. A direction that could dress any SaaS product is auto-rejected.

---

## Part 1 — Visual language: six directions

### V1 — "NIGHT OPTIC" · the thermal instrument
The product is literally a night-vision instrument; dress it like one.
- **Surfaces:** true neutral black `#0A0B0C` → `#101214` panels; glass with *cool* white 1px hairlines; machined, not frosted.
- **Where color lives:** the **thermal ramp IS the accent system** — data renders in LWIR semantics (white-hot = critical, ember = elevated, cool = nominal). The UI chrome stays achromatic so the sensor data is the only color.
- **Accent:** white-hot `#F5F7F5` for the live/active signal + thermal-amber `#FF8A4A` for the fire/gate. No other hues.
- **Type:** instrument sans (IBM Plex Sans) + **thermal values in mono with tick-ruler detailing**; display moments are reticle-framed (corner brackets, like an optic HUD).
- **Map:** night satellite, desaturated 20%, thermal overlays carry all color; fire = white-hot bloom.
- **Steal from:** FLIR/night-optic UIs, Anduril Lattice marketing, the dossier's tool-graph restraint.
- **Sentinel fit: 10/10** — it is what the product physically is. **Risk:** restraint demands perfect execution; sparse done wrong = the current failure again. Effort: 2–3 sessions.

### V2 — "EMBER" · the fire is the brand
The wildfire is the only color source; the chrome is its smoke.
- **Surfaces:** smoke-charcoal `#131110` (warm-leaning but NOT cream — a dark smoke, zero beige), panels like carbonized wood edges: near-black with a faint ember edge-light on the top border.
- **Where color lives:** a **fire gradient ramp** (`#2A160E → #7A2E12 → #E5533C → #FF8A4A → #FFD9A0`) is the brand system — used on the live signal, the fire layer, confidence ramps, TALON's core.
- **Accent:** ember `#FF6B4A` (already the palette's `fire`). State colors are ash-cooled: teal for confirmed, blue-gray for nominal.
- **Type:** bold geometric sans display (Archivo/Space Grotesk energy) + mono data; display moments get ember-gradient text treatments (used sparingly — verdict headlines only).
- **Map:** dusk-burnt terrain grade — the world reads as active fireground; glow = heat bloom.
- **Steal from:** the Aerion shot (obsidian + fiery terrain), LeMans/Endurance racing livery logic.
- **Sentinel fit: 10/10** — no other product on earth owns fire-as-brand-color like this. **Risk:** gradient discipline; ember can tip into "gamer RGB" if overused — the glow law must be brutal. Effort: 2–3 sessions.

### V3 — "DEEP FIELD" · TrackWise, finished properly
The dossier's own quality bar, done without our failures: deep navy `#0B1220`, **vivid satellite map as the color engine**, rich full panels, electric blue `#3B82F6→#60A5FA` signal, big values, photo-density cards.
- **Difference from current build:** the current one is navy-on-navy with empty panels; this one is navy chrome *around a vivid world*, with card interiors that are actually full (avatars, mini-maps, footers).
- **Sentinel fit: 7/10** — beautiful but it could dress any fleet product; nothing says wildfire. **Risk:** "premium SaaS tracker" is a crowded look. Effort: 2 sessions.

### V4 — "PHOSPHOR" · mission-control terminal
The tool-call graph reference, productized: warm charcoal `#1A1917`, **monospace-forward**, phosphor green `#4ADE80` as the single signal color, dotted grids, tick rulers, scanline texture at 2%.
- **Type:** JetBrains Mono for nearly everything; sans only for long prose. Display moments = oversized mono.
- **Sentinel fit: 8/10** — "mission control" is honest; the mono discipline solves the typography failure wholesale. **Risk:** mono-heavy UIs can tax scanning under urgency; needs strict size rhythm. Effort: 2 sessions.

### V5 — "WHITE HOT" · the inverted instrument
The inverse move nobody does: **light-neutral chrome, dark world.** Near-white `#F4F4F2` instrument panels, black text, and the map viewport is the only deep-dark region (night terrain + thermal layers) — like a photo editor holding a night photograph.
- **Sentinel fit: 7/10** — extremely distinctive, daylight-EO authentic (ops happen in day too); the thermal map pops like a viewfinder. **Risk:** the night-ops identity dims; dual-temperature theming becomes mandatory. Effort: 3–4 sessions.

### V6 — "GRAPHITE ATHLETIC" · performance hardware
Graphite `#17181A` + an electric **voltage** accent (acid `#D7FF3E` or electric white), condensed athletic display type (Archivo Expanded energy), kinetic micro-motion, chamfered-corner containers (angled HUD cuts, not rounded SaaS cards).
- **Steal from:** Whoop/Nothing/pace-athletics interfaces + Hangar 13-style HUD chamfers.
- **Sentinel fit: 8/10** — the "athletic" the owner asked for; drone-racing energy. **Risk:** chamfers + kinetics can cosplay esports; needs the glow law. Effort: 2–3 sessions.

**Combos are allowed:** V1+V2 is the natural union — **"Night Optic chrome, Ember data"** (achromatic instrument + fire-ramp data language): my actual recommendation. V4's mono discipline can graft onto any of them.

## Part 2 — TALON identity: six directions + the orb

All marks must work at 16px in the deck cradle, at 512px as an app icon, and as the orb's outer geometry. Briefs are written to run in `neonwatty/logo-designer-skill` (interview → 3–5 SVG concepts → refine → PNG ladder).

| # | Direction | The idea | Posture logic | Sentinel-specificity |
|---|---|---|---|---|
| I1 | **Aperture 2.0** (evolution) | Refine the existing 3-blade convergence gate; blades = iris; closes/locks at gates | Already production-proven (8 states live) | High |
| I2 | **The Talon** | Single-stroke raptor claw forming a "T"; the claw curve doubles as a target-lock corner bracket | Claw *grips* on gated; releases on watch | 9/10 — the name, literally |
| I3 | **The Lookout** | Horizon line + one elevated watch-point inside a bearing ring; reads as an eye at 16px | Watch-point "sees" (scan beam) on searching; ring locks on gated | 9/10 — the fire-lookout heritage story |
| I4 | **Convergence** | Three evidence arcs fusing into one locked node — the product's actual job as geometry | Node saturates as evidence converges; splits on dissent | 8/10 |
| I5 | **Thermal Pupil** | A lens/pupil ring that renders postures as **thermal states** (white-hot solving, ember gated, cool watching) — identity fused with LWIR imaging | The pupil's thermal state IS the posture | 10/10 — only Sentinel can own this |
| I6 | **Watch Constellation** | A star-point + bearing ring; the star is the lookout, the ring is the compass rose of the incident | Star pulses on search; ring segments lock on gates | 7/10 |

**Orb technology (unchanged from sentinel-core 02, now with a third option):** (1) SVG/CSS "Aperture 2.0"; (2) isolated shader core via `@paper-design/shaders-react`/hand-written fragment (isolation law enforced); **(3) hybrid — SVG mark + shader ONLY for the core's inner glow** (smallest possible canvas, biggest visible payoff). All driven by `deriveTalonSurface()` — the orb cannot lie, regardless of renderer.

## Part 3 — everything else: the option spaces

**Command deck (3 variants):** (a) **Ability bar** — fixed slots, keybind chips, cooldown=expiry rings, game-HUD clarity (current spec, sentinel-core 06); (b) **Split capsule** — centered 1200px capsule, truth left / bay center / commands right (legacy ActionBar's geometry, v3 materials); (c) **Twin-deck** — a thin status strip + a floating action capsule above it that grows when staged (more cinematic, more motion). Works with any visual direction.

**Map treatment (3 variants):** (a) **Night satellite** — desaturated real imagery + thermal overlays (V1/V3); (b) **Dusk fireground** — burnt warm grade, heat-bloom glows (V2); (c) **Tactical vector** — dark cartographic linework with terrain shading only on hover (cleanest under dense overlays; pairs with V4/V6).

**Icon system (3 variants):** (a) Phosphor duotone (warm-state presence); (b) custom HUD line set — 1.5px, chamfer corners, tick details (matches V1/V6; most Sentinel); (c) mono glyph set (letter-code chips: `TH`, `EO`, `LID` — pairs with V4).

**Motion personality (3):** (a) **Instrument** — 120–240ms, ease-out, nothing decorative (emil-strict); (b) **Kinetic** — spring entrances, chamfer-slide transitions, energy in every state change (V6-native); (c) **Sensor** — scan-line sweeps, thermal dissolves, data materializes like a sensor acquiring (V1/V5-native).

## Part 4 — fit matrix

| Direction | Sentinel-specific | Distance from slop | Urgency legibility | Map synergy | Effort |
|---|---|---|---|---|---|
| V1 Night Optic | ●●●●● | ●●●●● | ●●●●● | ●●●●● | 2–3 sess |
| V2 Ember | ●●●●● | ●●●●○ | ●●●●○ | ●●●●● | 2–3 sess |
| V3 Deep Field | ●●○○○ | ●●●○○ | ●●●●○ | ●●●●● | 2 sess |
| V4 Phosphor | ●●●●○ | ●●●●● | ●●●○○ | ●●●○○ | 2 sess |
| V5 White Hot | ●●●●○ | ●●●●● | ●●●○○ | ●●●○○ | 3–4 sess |
| V6 Graphite Athletic | ●●●●○ | ●●●●○ | ●●●●○ | ●●●○○ | 2–3 sess |

## Part 5 — the shortlist and the next move

**Co-leads: V1 "Night Optic" (chrome) + V2 "Ember" (data language)** — the achromatic thermal instrument whose only colors are the fire's. Nothing about it can be mistaken for AI slop (there is no cream, no serif-cozy, no blue-navy, no pastel chips); it is the one direction no competitor can borrow because it *is* the domain; and it inherits the existing TalonMark semantics untouched. **Runner-up: V4 Phosphor** if the owner wants the most radical typographic break. **V6 Graphite Athletic** if energy > instrument.

**The next move I recommend:** stop deciding by prose. I build **two concept screens** (the authority scene at 1920, deck + spines + mind console + vivid map) — one in **Night Optic + Ember**, one in **Graphite Athletic** — real code, real data, captured side-by-side with the reference shots. You pick by looking, the way you picked the references. One session, and the choice is made with eyes.
