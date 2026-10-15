# Showcase-Readiness Audit — is Sentinel 2026-level, and what stands between it and the portfolio bar

> **status: canonical — showcase-readiness audit** (2026-09-29). Owner asked: audit the newest build against every planning doc, walk every TALON response and human interaction, check every button/pixel/micro-interaction, and name the external resources that show where it falls short. Method: full doc re-read (vault 00/09/10, redesign-2026 04/07) → static gates → **live browser pass at 1920×1080 across 10 states in both layouts** → targeted code audit of the TALON voice/orb surfaces → external benchmark research. Builds on `07-talon-system-report.md` (system inventory — not repeated here) and judges what 07 could not: what it *looks and feels* like, and whether it survives a design director's 20-second scan.

---

## 1. The verdict

**Interaction architecture: genuinely 2026 state-of-the-art. Craft execution: ~80% there. Showcase-ready today: no — but it is 1–2 weeks of P0/P1 work away, not a rethink.**

Three things are demonstrably at (or above) the bar a design director will judge against:

1. **The constitutional interaction model is ahead of published 2026 guidance.** Smashing Magazine's Feb-2026 agentic-UX patterns and Atlassian's HITL patterns (approval / review / escalation) describe the state of the art; Sentinel already implements all of it *plus* things they don't ask for: staged commands that expire back to watch (verified live — the staged packet expired and rolled to "TALON is synthesizing the next accountable decision" during the session), hash-chained receipts (`Receipt AUD-90-0847`), bidirectional dissent with re-raise thresholds, and an ISA-18.2-flavored attention budget. Nobody expects a junior to have this; this is the top-1% part of the portfolio.
2. **The TALON voice is consistently strong.** All 22 `postureLine`s are consequence-first, plain, and honest (`talonSurface.ts:87-280`) — "TALON is holding at reduced weight — silent until the agreed threshold", "Freeze the authority packet until the operator sends it", "Send Authority Packet is staged. The authorization is yours." Tool-trace copy ("Hold the rejected hypothesis at reduced weight and suppress escalation below the agreed threshold") is the kind of line reviewers screenshot.
3. **The mark's concept is defensible and differentiated.** `TalonMark.tsx` implements the doc-09 Tactical Hybrid Core for real: chamfered collimator frame, three inbound source vectors, three claws that clamp shut at a gate, faceted core with hard fill jumps, lock/caution/check glyphs, ~20 keyframes + reduced-motion coverage (`talon.css:767-870`). The amber-locked orb with a padlock glyph appeared live in the Mind rail at the gate scene. An instrument aperture that *physically stops* is a better story than another Siri blob — the written rationale (doc 09 §2) is portfolio gold.

What keeps it out of showcase readiness right now is a short list of concrete, fixable defects — led by **three dead or broken core interactions in the v2 layout** and one geometry bug that reads as a rendering error in the flagship scene.

---

## 2. Gate truth (2026-09-29, branch `feat/map-spatial-os`)

| Gate | Result |
|---|---|
| `verify:design` | **FAIL — 5 violations**: `kit/core.tsx:356` fontSize 9 (+scale), `kit/viz.tsx:173` fontSize 28, `shell2/CommandDeck.tsx:86` glow boxShadow, `pages/ComponentsPage.tsx:513` fontSize 22. AGENTS.md's "all gates green" is stale. |
| `audit:tokens` | 261 warnings (259 raw-rgba — most in allowed map/canvas code — 2 exact-token duplicates). |
| `verify:flows` | **22/22 PASS** (incl. `layout v2: deck, spines, and mind console render`, staged-expiry, dissent, TALON suggested-question conversation). |
| `verify:routes` | PASS (23 combos + axe + console on the dev server). |
| `verify:machine` / `verify:signals` | PASS (20 scenes listed; convergence series OK). |
| `verify:attention` | **Script does not exist** in package.json — AGENTS.md Commands section is stale. |

A red `verify:design` invalidates any portfolio copy that quotes the gates (golden rule 4). Fix the 5 violations before anything else.

---

## 3. P0 — broken core interactions, live-verified

These are things a reviewer will hit in the first two minutes.

### P0-1 · The TALON conversation stream is unreachable in v2 — the "Open TALON session" button is a dead control
`shell2/TalonMindConsole.tsx:105-106` renders the session with `expanded={false}` and `onExpandedChange={() => {}}`. The button exists, is labeled, takes focus — and does nothing. Live-verified twice (dispatched click + CUA click; `aria-expanded` stays `false`; the `.talon-session` pill never grows). The full conversation thread exists only in the legacy `TalonCopilotPanel` (`SentinelShell.tsx:1018`). **The product's heart — watching TALON think — is missing from the layout meant to be the showcase.** Fix: own `sessionExpanded` state in the shell and pass it through (the legacy flow already has the machinery; ~1–2 h).

### P0-2 · The "EXPLORE · 3D" toggle is occluded by the Command Deck in v2
The button is `position: absolute; left: 16; bottom: 14; zIndex: layer.map + 2` (`SentinelShell.tsx:1140-1160`); the v2 deck is full-width at the bottom with a higher `layer.command` z-index. Hit-testing at the button's center returns the deck's truth cluster — the 3D world is **unreachable by mouse in v2** (I had to `element.click()` to capture it). In legacy it sits in free space and works. Fix: move the toggle into the deck's left cluster or re-seat it above the deck.

### P0-3 · The deck's one-line brief truncates mid-sentence in most scenes
`CommandDeck.tsx:94` caps the center bay at `maxWidth: 320` and `:114` ellipsizes. Live at 1920×1080: "Nothing has crossed the es…" (baseline), "…before an…" (alert), "…silent until the agre…" (contested), "…gates stay b…" (degraded). This is **the most-read sentence in the product** — TALON's single source of truth line — and it reads as a layout bug in every capture. Fix: two-line clamp or wider bay, then re-fit all 22 posture lines; alternatively shorten the longest lines (`talonSurface.ts:117` is 90 chars).

### P0-4 · Zone overlays fly across the sky on the oblique backdrop ("topological absurdity", still live)
Doc 10 diagnosed it; it is **still shipping**. In `contain-recommended`, `network-degraded`, and `authority-notification-ready` the red dashed FOREST ZONE, the amber ±120 m evidence envelope, and transit dashes draw straight over the sky above the ridgeline; a flat dark-rectangle artifact also floats in the sky on the legacy backdrop. For a reviewer this reads as a rendering error in the hero scene. Fix options (in order of honesty): (a) clip the 2D overlay SVG to the terrain horizon per scene (`clipPath` polygon — the horizon is fixed per backdrop); (b) doc 10's original prescription — restrict the oblique image to sensor-feed framing and keep true top-down only in the 2D map; (c) move all zone rendering into the 3D world where ribbons already drape correctly.

---

## 4. P1 — craft defects a reviewer will notice

- **Label-on-label collision**: LIDAR-02's chip renders on top of the GRID 4C chip (`authority-notification-ready`, live). The dock-collision suppression doesn't cover chip-vs-chip.
- **Alert modal primary button wraps mid-callsign**: "DISPATCH LIDAR-/02" and "DISMISS · NOTIFY LOCAL/DEPT" break across lines (`alert-command`, live). `white-space: nowrap` + width rebalance.
- **Legacy TALON Decision Brief freshness bars are unlabeled** — five cyan bars + percentages with no source names; the data is honest, the chart is unreadable.
- **Idle voice-bars read as a glitch**: the deck's `TranscriptBars` idle dot-row floats mid-deck next to the posture text and looks like rendering debris at a glance.
- **Mind "Session" tile wastes its space**: a 60px orb button floating in a large empty section — the weakest composition in the otherwise good right rail, and it's the section that's dead (P0-1).
- **Entry screen exposes plumbing**: "Portfolio stills / share link: append ?core=1 (hides Review Dock). Evaluators: Explore freely." — evaluator-facing instructions don't belong in the artifact; move to README. The entry is also the least-designed screen: default-feeling sans title, tiny helper text, no TALON presence — and it's the first impression.
- **C3 tile → modal auto-close suspicion**: during automation the authority modal opened and was gone 1.5s later while the action staged. Needs a manual owner pass (`verify:flows` says "authority packet modal and Escape" passes, so likely an automation artifact — but confirm by hand since it's the signature flow).
- **2D has no operator camera** (07's P1, confirmed): no pan/zoom in 2D while v2's full-bleed map makes the fixed framing more visible.
- **Doc/reality drift that a reviewer can trip on**: AGENTS.md claims all-green gates + a `verify:attention` script that doesn't exist; `?layout=v2` is still a gated flag — reviewers who open the plain URL get the legacy shell, which is denser but has its own defects. **The biggest strategic risk is the split-brain: two half-polished shells.** P7 promotion is the decision that unlocks the showcase.

---

## 5. What already survives the 20-second scan (keep, don't touch)

- Convergence card: 24-segment-style arc gauge with endpoint dot, gradient sparklines, tnum numerals — the strongest data-viz surface.
- Attention airspace: one arbitrated interrupt ("Gate waiting — Prepare authority packet" / "Degraded — fallback evidence active") — exactly the 2026 "useful transparency" pattern.
- Staged-tile grammar: class chip + expiry ring + "is staged. The authorization is yours." — verified working, expiry included.
- Gated posture: amber orb + padlock glyph + stillness — the doc-09 signature, real in the build.
- The cinematic thermal-feed moment at `verify-active` (viewfinder corners, magma temperature bar, ">1000 °F", crosshair + polygon on a real fire frame) — this is the hero screenshot; compose it deliberately rather than leaving it as a scene side-effect.
- The 3D world itself: USGS 3DEP + OSM (2495 buildings), draped zone ribbons, spread rings with "60 MIN · 1836 M" label, on-demand render with an honest draw-call HUD ("18/19 CALLS").

---

## 6. Benchmark deltas — where Sentinel sits against the 2026 bar

| Reference | What they'd judge | Sentinel delta |
|---|---|---|
| **Palantir Gotham / AIP** (mission-control bar) | Density with hierarchy; every pixel is data; tool-augmented map | Sentinel's *legacy* rail density is close; v2 swung too sparse (empty deck right side, empty Mind sections). Palantir never truncates a status line — P0-3 would not ship there. |
| **Anduril Lattice** (autonomy console) | The autonomous system's *state* is ambient and legible; map-first | Sentinel's posture system matches the ambition; the map art direction (murky baseline, sky-clipped overlays) is below Lattice's terrain-locked rendering. |
| **Linear / Vercel craft bar** | Type scale discipline, press states, zero truncation, motion restraint | Token system is Linear-grade in intent; execution leftovers (5 gate violations, unlabeled bars, missing `:active` states, mid-token button wraps) are exactly what Linear never ships. |
| **Apple Liquid Glass / iOS 27 Siri glow** | Material hierarchy (glass on content, not glass on glass); identity = luminous state | Glass recipes (`material.glass.*`) are HIG-conformant in spec; live passes show 2-glass stacking is mostly respected. TALON's identity is state-legible (better than Siri for this domain) but lacks Siri's *presence* — see §7. |
| **Smashing/Atlassian agentic patterns (2026)** | Approval gates, transparency, override, recovery | Already implemented *and* exceeded (expiry-never-executes, dissent memory, receipts). Use these articles as citation fuel in the case study, not as fixes. |

---

## 7. TALON identity upgrade paths (the showpiece ask)

The owner's instinct is right: the mark is the showpiece and its presence is under-realized at control sizes. Constraints that still hold: doc 09 bans canvas stacking (dual WebGL contexts failed here before), and the honesty rules ban consumer-blob semantics. Ranked paths:

1. **Rive state machine (recommended)** — rebuild the 8 postures as one Rive artboard: true vector morphing between blade states, particle-ish constellation without WebGL, one tiny runtime, backed by the same `TalonMarkState` contract. Rive is the 2025–26 industry default for assistant presence precisely because it solves "alive but deterministic". The 8-state contract maps 1:1 to a Rive state machine; reduced-motion is a listener swap.
   - rive.app (editor + docs) · Rive React runtime · examples: assistant/voice state machines in the Rive marketplace.
2. **SVG depth pass on the current mark (cheapest)** — keep the geometry; add token-governed luminance layers: radial-gradient core (cyan 12% → 85% on solving), a 1px inner keyline highlight, `feGaussianBlur` glow layer that breathes on the 4s watching cadence, and a soft drop-shadow "lift" in the deck cradle. ~1 day, zero new dependencies, fully token-governed.
3. **Single-canvas shared renderer (only if re-ratified)** — if volumetric presence is non-negotiable, the doc-09 failure mode (context thrashing) is avoidable with one shared `<canvas>` owned by the shell rendering both the world and the orb (react-three-fiber + a single gl instance), fresnel-rim + additive particles.
   - Docs: pmnd.rs (react-three-fiber/drei) · threejs-journey.com · Maxime Heckel's glow/Fresnel shader studies (blog.maximeheckel.com) · Shadertoy for rim/atmosphere references.
4. **Identity surroundings**: give the cradle a stage — a slightly recessed well (`surface.inset`), concentric radii per doc 04 §1.3, and let the deck's empty right side become the receipt/quiet-watch surface (already queued in 07 §2).

**Visual-asset resources (map + imagery, honesty-safe):**
- NASA FIRMS / GOES-R / Copernicus EMS imagery — real fire/thermal reference textures for the reconstruction frames (label as reference-derived, keep the honesty lips).
- Poly Haven HDRIs + ambientCG textures — free, CC0 lighting/texture for the 3D world (current flat sky is the biggest 3D art gap; an HDRI sky + atmospheric fog pass fixes it cheaply).
- USGS 3DEP (already in use) — extend with OSM building-height enrichment where available.
- Map furniture from the C4–C7 spec: scale bar, north arrow, coordinate readout — small widgets that read "real instrument" more than any glow.

**Micro-craft references:** Palantir Blueprint (palantir.github.io/blueprint) for ops-console component anatomy · motion.dev (Framer Motion) `layoutId` shared transitions for the tile→modal staging handoff · Lucide/Phosphor for consistent 1.5px instrument icons · Geist/Geist Mono as the type benchmark for instrument UI (tnum + optical sizes already in the tokens).

---

## 8. The ordered fix plan to showcase-ready

**P0 — this week (gates + dead controls + the line):**
1. Fix the 5 `verify:design` violations; re-run to green (`kit/core.tsx:356`, `kit/viz.tsx:173`, `CommandDeck.tsx:86`, `ComponentsPage.tsx:513`).
2. Wire the v2 session (`TalonMindConsole.tsx:105-106`) — shell owns `expanded`.
3. Move/re-layer EXPLORE · 3D in v2 (`SentinelShell.tsx:1140-1160`).
4. Deck brief: 2-line clamp + re-fit all 22 posture lines (`CommandDeck.tsx:94,114`).
5. Manual pass: C3 tile → modal → 2s hold → receipt; verify modal persistence.
6. Correct AGENTS.md (gates claim, `verify:attention`).

**P1 — the showcase week (map truth + presence + micro-craft):**
7. Sky-clip the 2D overlays (or restrict oblique to feed framing) — the hero-scene killer.
8. TALON presence pass (§7 path 1 or 2) + Mind session tile recomposition.
9. Micro-craft batch: button nowrap, freshness-bar labels, chip collision, idle voice-bars, `:active` press states, toast pause-on-hover, spine roving focus, AlertAirspace `aria-live` (07 §5.4 list).
10. Entry screen redesign: remove plumbing text, add TALON ambient presence, real display type.
11. 2D pan/zoom on the existing (u,v,zoom) law (already planned in 07).

**P2 — polish ledger:** quiet-watch deck affordance, evac GO chips, weather strip, 3D ribbon densification, HDRI sky, legacy sky-rectangle artifact, tablet recomposition.

**The strategic decision (P7, unchanged from 07 but now urgent): pick one shell.** Recommendation: promote v2 after P0 — it is the more cinematic, more differentiated instrument — and port the four legacy surfaces that beat it (zone intel rail, right-rail priorities, copilot conversation via P0-1 fix, debrief) before deleting legacy chrome. A portfolio cannot show both shells without diluting both.

---

## 9. Sources (researched 2026-09-29)

**Agentic UX (state of the art Sentinel already matches/exceeds):**
- Smashing Magazine — [Designing For Agentic AI: Practical UX Patterns](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/) (Feb 2026)
- Atlassian — [Human-in-the-loop patterns for AI agents](https://www.atlassian.com/blog) (approval / review / escalation)
- [Fuselab — Agent UX: designing UI for AI agents in 2026](https://www.fuselabcreative.com) · Gökhan Meriç — [Designing for AI Agents: UX Principles (2026)](https://www.gokhanmeric.com)

**Defense-console visual bar:**
- [Palantir AIP defense demo (video)](https://www.youtube.com/watch?v=XEM5qz__HOU) · [Palantir Defense — Air & Space](https://www.palantir.com/offerings/defense/air-space) · Palantir Blueprint design system (palantir.github.io/blueprint)
- [Anduril — Lattice mission autonomy platform](https://www.anduril.com/news/anduril-and-palantir-to-accelerate-ai-capabilities-for-national-security)

**AI identity / glow trend:**
- [Apple revamps Siri icon with 'Liquid Glass' (iOS 27 beta, Aug 2026)](https://enterpriseai.economictimes.indiatimes.com) · [Apple Siri AI docs](https://support.apple.com) — the industry-wide "identity = luminous state" convergence doc 09 argues against (correctly, for this domain) but whose *presence quality* is the bar to match.

**Identity build techniques:** rive.app (state machines, React runtime) · pmnd.rs (react-three-fiber/drei, single-renderer pattern) · threejs-journey.com · blog.maximeheckel.com (Fresnel/glow studies) · shadertoy.com

**Assets:** polyhaven.com (CC0 HDRIs) · ambientcg.com · firms.modaps.eosdis.nasa.gov (FIRMS) · USGS 3DEP (in use)
