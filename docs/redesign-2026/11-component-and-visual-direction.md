# Component & Visual Direction — the library audit and the final call

> **status: exploratory** (2026-10-03). Research pass over ~30 component sources named by the owner (dashboardcn, flightcn, gauge-ui, mapcn, rosencharts, scichart, shadcn-map, CueDesign kit, hairline, paceui, tremor, reui, evilcharts, 21st.dev registries, shoogle, aicanvas, velora, reverseui, generativecharts, 23rd.dev, bencho, refero, inspira, neuform, open-design, visual-explainer), cross-checked against the Sentinel data map (`docs/redesign-2026/01-data-map.md`), the map code (`src/app/map/`), and the vault golden rules. Decides: which sources earn a place in the build, what the layout and surface law becomes, what the map canvas overlay system needs, and verdicts on the owner's two proposed component choices (keycap buttons, segmented progress cards). Companion to `02-layout-research-and-direction.md` (layout authority) and the light-chrome/dark-core ruling delivered in conversation 2026-10-03.

---

## 1. The surface law this audit settles on

**Calm light chrome · dark instrument core.** The owner's pull toward "white panels, crisp colors, solid typography" is validated by the 2026 market (calm density, editorial type, restrained accents), with one discipline the domain imposes: **the map, sensor feeds, the TALON mark, and alarm signals stay dark** — fire semantics (amber caution / red alert / the gated amber lock), thermal feeds, and night-ops legibility all demand it (see the 2026-10-03 conversation research: dark dashboards measurably lower perceived workload; dark is the standard for AI panels and C2 surfaces).

| Zone | Treatment | Grammar |
|---|---|---|
| Left rail panels, right session/console, dialog bodies | Light neutral chrome (near-white surfaces, hairline borders, generous rhythm) | dashboardcn-style cards |
| Bottom Command Deck | Dark bar — it holds the gate and the orb | existing deck law, restyled |
| Map + feeds + TALON mark + alert airspace | Dark instrument core | mapcn layer stack |
| Accents | **One** primary accent + strict semantic triad (amber caution / red alert / green-clear) | tokens.ts only |

This is a theming pass over the existing shell, **not a third shell**. `tokens.ts` gains a light surface tier; components read it.

---

## 2. Library verdicts — what earns a place

### Tier A — adopt (MIT/free, shadcn-native, directly mapped to Sentinel surfaces)

| Source | What it gives Sentinel | Where it lands |
|---|---|---|
| **[dashboardcn](https://dashboardcn.com)** (MIT, CLI-installable, Radix/Base, Tailwind v4) | KPI Card, Radial Gauge (segmented + continuous), Distribution/Breakdown Card, Bar List, Activity Heatmap, Funnel, Composed Chart (dual axes, reference lines, peak markers — exactly the convergence/spread charts), Data Table | **This is the card/panel grammar the owner wants.** Fleet cards → KPI/Bar List; containment plan → Breakdown + Composed; evidence freshness → Distribution; debrief KPIs → Funnel. Install as source and re-token onto `tokens.ts`. |
| **[mapcn](https://www.mapcn.dev)** (MapLibre + Tailwind) | Map component scaffolding, marker/label/popup patterns, styled controls | The **map canvas system**. MapLibre underneath our baked USGS/OSM world or as the vector base; its label/chip/popup styling is the "on-screen map components" the owner asked for. |
| **[flightcn](https://flightcn.yencheng.dev)** (mapcn companion, MIT) | Great-circle routes, weighted networks, animated traffic flow, geodesic range rings, trails, waypoint labels, live-progress routes | **Adapted for drones, as the owner proposed:** FlightRoute → drone leg; Flight Range → geodesic comms/telemetry range; Flight Flow → responder convoy along route-a-west/route-b-east; Trail → recorded drone track; Network → mutual-aid ingress. The component semantics map 1:1 onto `routes.ts` / `droneDispatch.ts` data. |
| **[gauge-ui](https://www.gauge-ui.dev)** (composable SVG gauges, shadcn registry) | Speedometer-style gauges with redlines, segmented arcs | Battery/risk gauges for fleet cards and the deck truth cluster; a **redline gauge is the honest visual for containment margin** (spread rate vs. projected residual). Cheaper than SciChart for every gauge need Sentinel has. |
| **[rosencharts](https://rosencharts.com)** (copy-paste d3/html, RSC-safe) | Horizontal/stacked bars, thin breakdown bars, fillable donuts, heatmap, funnel, radar, connected-dots, **pulsating line** | **White-panel chart craft** — the crisp light-theme charts the owner admired. Radar = multi-source confidence shape (a real Sentinel need: the 9 evidence kinds); Pulsating Line = live thermal series with a live-point dot; connected-dots = per-estimate convergence timeline. |

### Tier B — steal the patterns, not the code

| Source | Verdict |
|---|---|
| **[SciChart](https://www.scichart.com)** (commercial — do not license) | **Patterns worth extracting:** (1) *strip-chart telemetry* — scrolling multi-series traces with a fixed time window and a "now" line; that's exactly the thermal/battery/signal series in the C2 telemetry strip; (2) *annotated reference lines* (threshold markers on-axis — 1000 °F line, battery floor, expiry ticks); (3) *data-density typography* — tnum figures, tight axis labels; (4) *cursor/crosshair inspection* shared across synced charts; (5) the honest "million points" downsampling story as a case-study talking point. Free equivalents: uPlot or ECharts (via EvilCharts) for the strip-chart; everything else is CSS/SVG in the rosencharts/dashboardcn vocabulary. Sentinel's scripted data never needs SciChart's perf — the case study should say so, which reads as engineering maturity. |
| **[CueDesign kit](https://kit.cuedesign.space)** | See §3 verdicts. |
| **[hairline](https://hairline.lucasmarkes.com)** (MIT isometric SVG line figures, "answer the pointer") | Good for **custom assets**: exploded-view / turntable line figures of the TALON mark, the dock, the sensor mast for the case study and empty states. The "draw your own" skill fits the doc-09 mark explainer. Not UI chrome. |
| **[Tremor](https://www.tremor.so)** | Overlaps dashboardcn but heavier as a *system*; steal two micro-viz ideas only: the **Tracker** (segmented time strip — good for scene/session timeline and signal freshness) and Data Bars. Don't take the system. |
| **[EvilCharts](https://evilcharts.com)** (Recharts/ECharts, shadcn-styled) | The escape hatch when a chart outgrows SVG: ECharts-backed animated charts. Use for the **debrief multi-series time story** if rosencharts' static craft can't carry it. |
| **shadcn-map (Leaflet)** | Weaker choice than mapcn: Leaflet's rendering model caps polish (no WebGL, dated pan/zoom feel), and "elastic modern" camera motion is what the owner asked for. MapLibre (mapcn) is the correct base for the 2026 bar. Keep Leaflet out. |

### Tier C — inspiration/registry only (no direct adoption)

- **21st.dev kits** (Kokonut, Efferd, HextaUI, ReUI, Cult, Kibo, Dice, Fluid Functionalism) and **shoogle / aicanvas / velora / reverseui / rewampui / paceui** — worth browsing for micro-interaction ideas (Kibo's AI-flavored blocks, velora's animation recipes); none clear the bar of dashboardcn + rosencharts + mapcn for Sentinel's specific surfaces. PaceUI is Pro-gated past the teaser — skip.
- **bencho / refero / inspira / neuform / open-design / generativecharts / 23rd.dev** — research references for AI-product composition (refero's real-product screens especially, to steal light-theme AI console layouts). No code.
- **visual-explainer skill** — useful at case-study time to render the component-to-surface mapping as an explainer graphic.

---

## 3. Verdicts on the owner's two proposed components

### Isometric keycap buttons for actions — **no as-is, yes after a redesign**

The instinct is right: consequential actions (AUTHORIZE, DISPATCH, STAGE) deserve tactile, physical emphasis — that matches the product thesis (the gate is a physical act). But the stock isometric keycap fails Sentinel twice: **isometric perspective breaks the flat instrument grammar** (the whole surface law is orthogonal, top-down, hairline — one tilted 3D object reads as a toy in it), and **mechanical keycap skeuomorphism is a 2023 novelty aesthetic**, not the 2026 calm-precision bar the owner is chasing.

**The approved translation:** a **top-down mechanical key** (as the owner intuited) — a flat, chamfered plate with a 2px edge lift and a real press: `translateY(1px)` + edge height collapse on `:active`, ~120ms, `ease.out`. It keeps the tactile "this button has travel" story, matches the chamfered-aperture TALON mark language (doc-09 chamfers), and is buildable as a tokenized `CommandButton` variant. Reserve it for **hold-to-authorize and primary dispatch only** — if every button is a keycap, none is special. Rule: `GATED_ACTIONS` verbs get the key; everything else stays flat. (The hold ring stays the true gate instrument; the key is its housing.)

### Segmented progress card — **yes, with two corrections**

The 30-cell segmented bar with stagger entrance is a genuinely good fit: it reads as **consumable resource** (battery cells, evidence cells, expiry slots) far better than a continuous bar, and the stagger is honest motion. Corrections for the domain: **drop the mouse-driven 3D tilt** (toys tilt; instruments don't — and it fights reduced-motion), and drive segments from semantic thresholds (cells change tone at amber/red boundaries — a battery bar that stays one color to 5% is lying). The bouncy entrance may stay ≤240ms, matching the existing spring cap. Ideal homes: fleet battery bars, evidence-freshness cells (9 kinds × status), staged-expiry slots, containment margin.

---

## 4. The map canvas overlay system (the owner's "major lacking")

The data map (§6) and map code confirm the gap: zones exist as 2D polygons, but the overlay language is incomplete and partially broken. The overlay system is specified as **layer stack + grammar**, using mapcn/flightcn mechanics on the existing world bake (12-draw-call budget stays the ceiling; doc 09:116):

| Layer (z-order) | Content | Source / data | Notes |
|---|---|---|---|
| L0 Base | Dark relief basemap (the baked USGS/3DEP + OSM world, or MapLibre vector restyle) | `worldScene.ts` | The "modern elastic" pass: restrained labels, soft terrain shading |
| L1 Terrain semantics | Zone footprints (forest-north, buffer-west/east, residential grids) as **clipped, draped fills** | `zones.ts` | Fixes the topological-absurdity bug (P0-4): clip to horizon; zone fills never cross the sky |
| L2 Incident | Fire footprint, **spread rings with age badge** (G-08: "60 MIN · 1836 M · 03:12 old"), ±120 m evidence envelope | `overlayData.ts` | Age badges = honesty law (stale data must read stale) |
| L3 Airspace (missing — G-10) | Geofence/TFR polygons, ADS-B traffic dots, drone altitude shelves | flightcn **Flight Range** (geodesic ring) + **Network/Flow** | The biggest single gap the owner noticed; flightcn is literally the missing layer's toolkit |
| L4 Routes | Dispatch proposals, guided routes A/B, responder ingress, mutual-aid flows | `routes.ts` + flightcn **Route/Flow/Trail** | Animated flow only on *proposed* movement; executed = solid |
| L5 Units | Drone markers (class chips), ground teams, docks, sensor heads | `AgentMarkers.tsx` | Live telemetry lips (spine grammar) as marker labels |
| L6 Attention | Selection halos, "opened by TALON · undo" pins, crosshair + polygon (the thermal hero) | attention arbiter (pending) | The cinematic verify-active moment lives here |

**Interaction grammar:** map stays the artifact (full-bleed between rails, per layout doc); operator camera = pan/zoom with elastic easing (mapcn/MapLibre gives this for free — it also fixes the "2D has no operator camera" P1); every overlay element carries a label + value + freshness (the spine lip law applied to geography); **overlays propose, the operator disposes** — TALON may pin ("why here") but never hide or reorder layers.

---

## 5. Typography & micro-craft (the crispness the owner wants)

1. **Type:** keep mono for telemetry/labels, move headings/body to a strong grotesque with real hierarchy (editorial-into-product is the dominant 2026 move); `tnum` everywhere a number can change. All via `typeStyle` in `tokens.ts`.
2. **Cards (dashboardcn grammar):** one radius law (concentric, existing), hairline borders, eyebrow + hero value + delta + one supporting fact. No glow shadows (currently a `verify:design` violation at `CommandDeck.tsx:86`).
3. **Motion:** transform/opacity only; press states on every actionable; stagger ≤60ms on card entry; springs ≤240ms, decorative only; `prefers-reduced-motion` kills stagger/tilt.
4. **Semantic color discipline:** amber/red/green only for domain meaning; the single accent covers selection, focus, links, TALON tone. Kill the raw `#00c8ff` legacy values (`theme.css`, `TalonCopilotPanel.tsx`, `mockData.ts`) as part of the theming pass.

---

## 6. Build order (fits the existing P0/P1 debt)

1. **P0 fixes first** (dead session control, deck truncation, toggle occlusion, 5 `verify:design` violations) — they invalidate any showcase regardless of style.
2. **Token tier for light chrome** + `CommandButton` (key translation) + segmented progress cell — the primitives.
3. **dashboardcn ports** onto the rails/session (fleet, evidence, containment cards).
4. **Map overlay stack L1–L5** via mapcn + flightcn adaptations — the biggest visual win.
5. **Type upgrade + glow/legacy-neon purge**; then the one-shell promotion decision.

Each step keeps `verify:design` / `verify:flows` / `verify:routes` green; the maps' evidence budget (12 draw calls) and refresh-rate honesty (G-13) constrain every chart and overlay.
