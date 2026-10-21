# Sentinel Design System

> **Status: canonical (design system — type, colour, space, radius, material).**
> Authority tier 6 in `AGENTS.md`, paired with `src/app/tokens.ts`, which is
> the executable half of this document. `npm run verify:docs` asserts the two
> agree; the type scale, radius steps, and layout numbers below are checked
> against the code, not trusted.
>
> **Scope note (2026-10-21):** this file governs the *system* — the type
> scale, the colour roles, the spacing law, the materials. It does **not**
> govern the *layout*. The layout is owned by
> `docs/redesign-2026/14-final-layout-spec.md` (owner ruling 2026-10-11) and
> the region table in `SPEC.md` §2. Where this file used to describe a
> centre-orb command surface, that description was the superseded v2 chrome
> and has been removed in favour of the current ruling.

## 1. Direction

Sentinel is a desktop spatial-intelligence instrument. It should feel dense, calm, technical, and visibly governed by human authorization.

The current architecture (see `SPEC.md` §2 for the region table and
`docs/redesign-2026/14-final-layout-spec.md` for the ruling):

- One full-bleed map stage, with a thin truth strip above it.
- One left spine — the operator pulls.
- One right console — TALON lives here, always open.
- One bottom hand — gates only, never navigation.
- Intelligence and Operations density modes.

The finish pass reduces decorative AI signals and increases clarity, consistency, and interaction reliability.

## 2. Signatures

### TALON Convergence Gate

The mark is a three-bladed **aperture** around a guarded centre, with three source vectors entering through the gaps. Aperture/reticle geometry is instrument language — optics, sensors, targeting — and it is rotationally symmetric, so it reads as a system rather than an emblem. It is not a bird, claw, eye, shield, badge, sparkle, or generic glowing orb.

The aperture is load-bearing, not decorative: **the blades physically close over the core at a human gate and hold there.** A particle orb can show an AI thinking; it cannot show an AI being stopped, which is the one thing Sentinel's mark must be able to say.

The mark is single-colour. Colour carries session state on the perimeter; geometry carries it through motion. Never both plus a glow.

- Cyan: watching or ready.
- Red: listening.
- Amber: checking evidence.
- Teal: recommendation ready or completed.

**One motion grammar, eight signatures** (`TalonMark` + `talon.css`). Every state animates the same three parts — perimeter ring, source vectors, aperture blades — so the mark reads as one instrument changing behaviour, never eight different loaders:

| State | Signature |
| --- | --- |
| `watching` | perimeter breathes; geometry still |
| `listening` | amplitude ripples outward on the perimeter |
| `searching` | evidence streams inward along the source vectors |
| `solving` | vectors solidify; the core commits |
| `gated` | **blades close over the core and hold** |
| `executing` | steady supervised rotation |
| `blocked` | one vector severed; aperture cannot resolve |
| `receipt` | blades open; core settles solid |

Under `prefers-reduced-motion` the mark keeps its *static state geometry* — a closed aperture still reads as gated — and stops all looping motion.

### TALON command surface — the right console

> **Superseded 2026-10-21.** This section previously described a command
> surface built around **one orb fixed dead-centre in the bottom deck**, with
> a voice panel rising from behind it and actions blooming sideways out of
> it. That is the v2 chrome, and the owner ruling of 2026-10-11 deleted the
> centred orb: *"The centered 60px orb object and the rising voice panel are
> deleted. The mark becomes part of the act, not decoration beside it."*
>
> The rule below is the current one. The v2 description is kept in
> `docs/archive/` for context only — never build from it.

TALON has **a real home on the right**, not a centre-bottom instrument. The
aperture mark survives as *ink on the control that gates*: a 28px sigil in the
console header as ambient identity, and the same ring on the gate tile where
the blades close as the hold arms.

- **Ambient status, not an avatar.** The console header carries the sigil, a
  posture label, and one posture line. No idle animation beyond the 4s
  watching cadence. No pulse theatre.
- **Composed thread.** One TALON turn is one card: eyebrow, one hero,
  evidence chips, and exactly one action row. The card carries the substance;
  the voice carries one clause and never narrates what the card already shows.
- **Height equals status.** Open cards are full; resolved, expired, and
  dismissed cards collapse to a one-line receipt. Disposal is receipted.
- **The gate is in the hand, not the console.** Authorization lives only in
  the bottom hand. The staged action renders identically in the console and
  in the hand — one state, two renderings.
- Critically damped throughout — no bounce, wobble, or droplet on an
  authorization surface. Motion never gates input.

Full region geometry: `docs/redesign-2026/14-final-layout-spec.md` §2–§3.

### TALON replies

Synthesized answers reveal word-by-word (`TalonStream`) so a recommendation reads as reasoning arriving rather than a lookup returning. The reveal is opacity-only with the full text in the DOM from frame one, so assistive tech and copy/paste are never gated on it, and reduced motion renders instantly. Fast and monotone by contract — an operator must never wait on an animation to read a recommendation.

### Command Picture

The command picture is the smallest complete operational view:

`map + evidence/inspection + TALON/decision + one dominant action`

Portfolio embeds default to this view. Free exploration keeps the full telemetry system.

## 3. Theme

Sentinel uses one dark command theme.

- Canvas: deep blue-black, never pure black.
- Map: slightly darker than the shell, with controlled contrast.
- Panels: opaque or lightly translucent midnight surfaces.
- Raised content: small lightness shift plus a quiet inner edge.
- Overlays: elevated midnight surface and scrim.
- Broad glass blur, outer glow, and multiple stacked shadows are not routine materials.

## 4. Colour

Components bind to semantic roles from `tokens.ts`.

### Foundation

- `background.base`: shell canvas.
- `background.map`: map field.
- `surface.panel`: observation and decision panels.
- `surface.raised`: grouped content and focused controls.
- `surface.inset`: inputs and recessed telemetry.
- `border.soft`: internal separators.
- `border.default`: standard boundaries.
- `border.strong`: selected or emphasized boundaries.
- `text.primary`: primary decisions and headings.
- `text.secondary`: explanatory content.
- `text.muted`: metadata and nonessential telemetry.
- `text.disabled`: unavailable commands.

### Operational colour

- Cyan: telemetry, focus, TALON readiness, selected spatial object. Calibrated to `#1CB8E6` (instrument cyan) — never pure-neon; it leads the whole cyan family via `tint()`.
- Amber: uncertainty, source conflict, pending human judgment.
- Red: danger, destructive action, blocked life-safety condition.
- Teal: verified, safe, complete, receipt written. The "done" colour — cyan never carries completion.
- **Fire** (`#FF6B4A`) is the diegetic light source, not an operational accent. Fire (and the LiDAR sweep during active verification) are the ONLY elements permitted to emit light/bloom — this is the single earned exception to the no-glow rule. Everything else is edge-lit.

Only one operational colour leads a component. State always includes text or an icon. Keep chrome neutral so the one accent lands (the Linear discipline).

## 5. Typography

### Families

- Product UI: IBM Plex Sans.
- Telemetry, coordinates, timers, source IDs, and audit receipts: JetBrains Mono.

### Scale

- Display: 26px / 32px, 700.
- Workspace heading: 18px / 24px, 600.
- Panel title: 15px / 21px, 600.
- Brand: 14px / 20px, 700.
- Body: 12px / 18px, 400.
- Body strong: 12px / 18px, 600.
- Control: 12px / 16px, 600.
- Label: 11px / 15px, 600.
- Metadata: 10px / 14px, 500 mono.
- Metric: 32px / 36px, 700 — the panel focal read.
- Map label: 10px minimum at 1280px.

Essential information is never 9px (this includes ternary/expression sizes — `fontSize: compact ? 9 : 10` is forbidden). The mid-band 13/14/15 each carry one unambiguous job: title 13 is being retired, brand 14 is the wordmark only, panel-title 15 is panel headers.

**Focal contract (load-bearing for the ~0.65× embed downscale).** Every panel renders exactly ONE ≥26px read — `metric` (data) or `display` (title). No size between 18 and 26 competes beneath it. A 32px anchor survives downscale at ~20–24px while 12px labels honestly recede; this is the primary cure for the "no focal point / generic" read.

**Optical tracking law** (benchmarked against Linear + IBM Carbon — bind these via `typeStyle`, never free-form; free-form letter-spacing is a review failure):
- `tracking.displayTight` (−0.02em): ≥26px display/metric — large type reads intentional, not loose.
- `tracking.tight` (−0.01em): 14–18px headings/brand.
- `tracking.fine` (+0.01em): 10–13px body/label — slight positive tracking for legibility at density.
- `tracking.telemetry` (0.06em) / `tracking.eyebrow` (0.1em): uppercase codes and section eyebrows only.

## 6. Spacing and geometry

The base unit is 4px. Legal steps only: **4 | 8 | 12 | 16 | 20 | 24 | 32**.

- Micro: 4px (`space.xs`).
- Control gap: 8px (`space.sm`).
- Component gap: 12px (`space.md`).
- Group gap: 16px (`space.lg`).
- Panel gap: 20px (`space.xl`).
- Major transition: 24px (`space["2xl"]`).
- Section break: 32px (`space["3xl"]`).

**Vertical rhythm.** Line-heights are chosen optically for readability (12/18 = 1.5 is correct; do NOT blanket-snap line-heights to a 4px baseline). Instead govern *section* spacing: stacked panel sections use `panel.sectionGap` (12) and `panel.itemGap` (8) consistently, and section blocks land on an 8px interval. Ad-hoc vertical margins between panel sections are a review failure — use the `panel.*` tokens.

### Radius

Legal steps only: **4 | 8 | 10 | 12 | 16 | 999**.

- Dense telemetry: 4px (`radius.dense`).
- Controls: 8px (`radius.control`).
- Tiles and cards: 10px (`radius.tile`).
- Panels: 12px (`radius.panel`).
- Overlays: 16px (`radius.overlay`).
- Full pill: compact state or segmented selection only (`radius.pill`).

Elevation is carried only by `material.*`. Component-local `boxShadow` recipes and coloured glow for state are review failures.

### Laptop layouts

The rails are **collapsed by default** (56px icon spine) and open to a panel
width on demand. A night-shift operator should see almost no chrome until
they ask for it.

- 1280x800: 56px collapsed spines; panels open to 340 / 380.
- 1366x768: as above; secondary navbar metrics hidden.
- 1440x900: as above; the map remains dominant.
- 1920x1080: as above. The map occupies the frame; chrome is opt-in.

> **Superseded 2026-10-21.** This section previously specified 260 / 280 /
> 300px *always-open* rails, which described the v2 chrome. The v3 rails
> collapse to 56px and open on demand, and the region geometry is owned by
> `docs/redesign-2026/14-final-layout-spec.md` §2. `verify:docs` now fails if
> a stale rail width reappears in this file.

### Materials

Sentinel has three shell materials and one backdrop. They live in `material.*` in
`tokens.ts` and are the only sanctioned way to make a surface float. A surface picks
one recipe; it never assembles its own blur, radius, and shadow.

| Recipe | Role | Spec |
| --- | --- | --- |
| `material.rail` | Left and right rails, floating map chrome | `surface.panel`, `blur(10px) saturate(1.12)`, `border.subtle`, `shadow.edgeRail` |
| `material.overlay` | Modals, takeovers, TALON session, dissent and exception surfaces | `surface.overlay`, no frost, `border.strong`, `shadow.edgeOverlay` |
| `material.popover` | Danger menu, review dock, timeline popovers | Overlay material, `border.default`, `shadow.edgePopover` |
| `material.scrim` | Backdrop behind a takeover | `surface.takeoverScrim`, `blur(8px)`, no edge, no radius |

Rules:

- Elevation is an edge, not a glow: one light top edge, one dark bottom edge, one soft
  drop (`shadow.edge*`). No stacked blooms, no coloured outer glow.
- Frost is a material, never a state. Severity arrives through the border tone, the
  words, and the icon — never through more blur.
- Frost ceiling: 12px on product chrome. Rails frost so the map still reads underneath;
  authorization surfaces stay opaque so they never compete with the map.
- Both rails wear the same recipe. A panel inside a rail does not become a second,
  denser slab; variants change border and semantic wash only.
- Map markers and drone-feed furniture are not shell chrome and may stay lighter.
- Adding a fourth glass dialect is a review failure. Extend `material.*` instead.

## 7. Density modes

### Intelligence

Question: Is this real and urgent?

- Evidence sources and freshness remain inspectable.
- Conflicts, missing inputs, and reasoning are open.
- TALON explains what changed and what remains uncertain.

### Operations

Question: What needs operator attention now?

- Current priority, field assets, route state, and exception lead.
- Source detail remains available but is not persistent.
- TALON remains visible as supervisor.

### Critical

Question: What is blocked, degraded, or life-safety relevant?

- One exception, one recommended recovery, one authorization path.
- Historical detail moves behind disclosure.

## 8. Core embed mode

Core mode is activated by `embed=1` or `core=1`.

- Keep the map full-frame.
- Keep one left evidence or inspection view.
- Keep one right TALON or priority view.
- Show one dominant command.
- Hide Review Dock, unused rail tabs, duplicate status strips, ornamental map FX, and secondary navbar telemetry.
- Preserve source, uncertainty, human gate, and audit context.

Free mode retains all tabs, telemetry, scene review, timeline, and advanced controls.

## 9. TALON session

TALON has one state owner and one interaction surface.

States:

1. Watching.
2. Voice or typed input.
3. Transcript review.
4. Evidence and agent checks.
5. Recommendation ready.
6. Human authorization required.
7. Supervised execution.
8. Audit receipt.
9. Blocked or degraded.

Rules:

- Command input is editable before submission.
- Scripted fallback is labelled.
- Voice state and modal override state never diverge.
- Escape cancels listening, review, or processing without losing the transcript.
- The command bar remains physically stable.
- Explanatory prompts live inside the TALON session, not beside the primary action.
- Recommendations name evidence, blocker, and next action.

## 10. Map objects

### Zones

- Large interior hit region.
- Hover: boundary emphasis plus label.
- Selected: shared inspection state and panel update.
- Keyboard: focusable with Enter/Space selection.

### Drones

- Minimum invisible 32px hit region.
- Body identifies class; plate identifies name and battery.
- Selection, hover, degraded, en-route, assigned, and holding states are distinct without relying on glow.
- Drag uses pointer capture and a lightweight preview.
- Drop animates to the nearest valid anchor, then writes an audit receipt.

### Ground teams

- Same selection and drag contract as drones.
- Unit type, availability, assignment, and linked zone remain inspectable.

### Routes

- Recommended, alternate, active, blocked, and evacuation paths use distinct dash/weight vocabulary.
- Direction arrows are legible but restrained.
- Route changes animate once when state changes, not perpetually.

### Motion

- Fire, LiDAR, drone rotors, and pulse rings render only when they communicate live state.
- Reduced motion replaces movement with static state styling.

## 11. Panels and overlays

- One panel frame and header anatomy.
- One tab pattern with keyboard arrow navigation.
- One status treatment.
- One modal shell with focus trap, Escape, focus restoration, title, description, and consequence summary.
- Popovers use click-outside and Escape.
- Non-modal interrupts use status or alert semantics and do not claim `aria-modal`.

## 12. Motion

- Press feedback: 100-120ms.
- Hover and colour: 120-160ms.
- Popover: 150-180ms.
- Panel or modal: 200-240ms.
- Snap-to-anchor: 220-280ms.
- Ease out: `cubic-bezier(0.23, 1, 0.32, 1)`.
- Drawer: `cubic-bezier(0.32, 0.72, 0, 1)`.

No `transition: all`. No UI motion over 300ms unless it represents real progress or a deliberate hold action.

## 13. Anti-slop release gates

- No generic glowing AI orb.
- No card wall with equal emphasis.
- No essential 9px labels.
- No repeated tracked-uppercase scaffolding.
- No decorative status dots.
- No glow as the only selected or active state.
- No component-local elevation recipes — floating chrome uses `material.*` only.
- No always-running decorative scan, ember, rotor, shimmer, or pulse.
- No duplicated TALON mic or session state.
- No raw emoji in operational UI.
- No map object that responds visually without updating shared state.
- No developer controls in portfolio embeds.
- No more than one dominant command in core mode.

Run `npm run audit:tokens` before release. Off-scale `fontSize` / `borderRadius`, 9px type, and coloured glow shadows fail the gate.

The archived `src/app/components/ui/` shadcn tree is unused compatibility only — do not import it into product surfaces.

## 14. Data experience model

### Data domains

- `tokens.ts` owns shared contracts for operational state, plan comparison, incident scope, spatial uncertainty, and action-outcome verification.
- `mockData.ts` owns deterministic prototype fixtures: the selected incident, focused queue, zones, resources, and containment options.
- `domain/` owns pure derivation and scene-specific policy. Domain helpers may read fixtures but do not contain component or rendering logic.
- Existing display fields remain available while structured fields provide a migration path for richer data views.

### Plan comparison

Recommended and alternate containment plans share one comparison contract. Each option must expose:

- Modeled spread and residual spread, direction, and uncertainty margin.
- Baseline exposure and residual structures at risk.
- Structures covered and protection window.
- Drone and ground-team commitment plus reserve tradeoff.
- Confidence score, evidence basis, and constraints.
- Staging ETA, protection-ready ETA, and operator-readable reasoning.

The two plans represent real tactical tradeoffs. They must not differ only by title or prose.

### Focused incident queue

- One selected incident owns the full operational context used by scenes, maps, models, routes, resources, and commands.
- Additional incidents are read-only summaries for orientation and selection affordance.
- Summary incidents explicitly set `independentSimulation: false`; they do not imply separate live simulations, scene state, or executable command state.
- `activeIncidentId` is optional during shell migration and should resolve to the one full incident fixture by default.

### Spatial uncertainty

- Operational exceptions may add a structured spatial margin, affected zone IDs, basis, and observation timestamp.
- A margin is a safety envelope caused by degraded evidence, not a claim that the underlying fire perimeter physically expanded.
- Total infrastructure loss may remain unquantified rather than inventing a defensible spatial value.

### Trend primitives

- `MiniTrend` is an SVG sparkline: one series, one stroke at the semantic tone, one quiet
  area wash. Hover or keyboard focus reports the exact sample as a mono readout in the
  label row; there is no floating card, no crosshair spring, no second axis.
- The sparkline owns the interactive number for its series. Do not repeat that number in
  an adjacent `MetricTile`; `MetricTile` stays typographic and never fakes a chart.
- `SignalBar` eases with `motion.deliberate` and carries one trailing wash so a moving
  value reads as motion. It never pulses or glows.
- Reduced motion removes the draw-in and the trailing layer; values snap.
- No chart library. Trend craft stays in Sentinel SVG so it obeys these tokens.

### Closed-loop action verification

- The most recent operator-authorized action may carry expected outcome, observed outcome, deviation state, timestamp, action ID, and audit ID.
- `within-tolerance`, `deviated`, `pending`, and `unverifiable` are distinct states; completion alone does not prove the expected outcome occurred.
- Scene verification fixtures return fresh objects so the shell can initialize safely without mutating shared data.
- Verification describes observed consequences and audit linkage. It does not grant TALON independent authorization.

## 15. Verification

- Scene deep links: every `SceneId`.
- Guided flow: verify-ready, verify-active, authority packet, network degraded.
- Operations: recommended, alternate, degraded.
- Rescue: nominal, signal degraded, battery handoff.
- Map: zone/drone/team/anomaly select, keyboard, drag near rails, snap, tab persistence.
- Viewports: 1280x800, 1366x768, 1440x900, 1920x1080.
- Standard and reduced motion.
- Free mode, `embed=1`, and `core=1`.
