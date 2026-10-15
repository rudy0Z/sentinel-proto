# Sentinel Layout Thinking

**FlytBase Sentinel · layout/TALON/rails reconsideration · 2026-09-22**

One thinking document that combines six separate advisor conversations about Sentinel's shell
(TALON placement, dual rails, navbar, deck/slider panel interaction, desk-panel vs tablet),
classifies the six voices, extracts consensus and disagreement, and adds AutoCoder's own position
grounded in the flow-atlas session work (39-transition state machine, gate catalog, talonSurface,
scenario bindings) plus the `sentinel-information-design/` research package.

## Contents

| File | What it is |
|---|---|
| `00-layout-thinking.md` | **Start here** — the master synthesis: six voices, consensus, disagreements, AutoCoder position, 3 prototype spikes, kill-test |
| `sources/advisor-1-code-forensic.txt` | Voice #1: split TALON (orb center + conversation right, mirrored action) |
| `sources/advisor-2-systems-refiner.txt` | Voice #2: navbar v2 + deck spec + 3-tier attention protocol |
| `sources/advisor-3-human-factors-critic.txt` | Voice #3: 8 objections; tabs + peek headers; gates never in sliding surfaces |
| `sources/advisor-4-instrument-architect.txt` | Voice #4: defend the four-surface contract; bottom deck + TALON cradle; tablet recomposition |
| `sources/advisor-5-co-commander-advocate.txt` | Voice #5: full right-rail Co-Commander console (Option B) |
| `sources/advisor-6-shutter-engineer.txt` | Voice #6: Tactical Shutter (peeking tabs, jog-slider detents, pin&peel) + Horizon HUD |

## The one-line version

Keep the human gate at center (it *is* the product thesis), give TALON's conversation a real home in
the right rail with a mirrored sticky action, express "TALON has news" through a 3-tier attention
protocol derived from `deriveTalonSurface()` (phase-weighted), thin the navbar to three floating
truth pills, and prototype all of it behind flags against a 30-second kill-test before committing.

## Status

Thinking document — no code was changed. Next natural step if wanted: spike S1/S2/S3 as `?layout=split`,
`?deck=1`, navbar-v2 behind flags, compared against default in `verify-active` → `rescue-battery-critical`.
