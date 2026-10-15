# Visual Quality Audit — pixel-level consistency check (shell v2 + kit)

> **status: canonical — audit record** (2026-09-28). Method: 10 fresh 1920×1080 captures of `?layout=v2` scenes + the kit showcase (`verification-artifacts/audit-v2/`), 23 route captures (default layout), DOM ground-truth probes (`scripts/probe-v2*.mjs`, `scripts/probe-kit.mjs`), and the full code-level token audit. Reviewed under three rubrics the owner invoked: **emil-design-eng** (motion/micro-interaction detail), **impeccable** (Operate-mode craft critique), **tool-design-sprint-test-and-score** (scorecard mechanic — adapted, see §4 honesty note).

---

## 1. Defects found by the audit — and fixed

The audit had teeth: six real defects, all fixed and re-verified by re-capture.

| # | Defect (pixel evidence) | Root cause | Fix | Verified |
|---|---|---|---|---|
| D1 | Deck rendered as an **empty glass bar** — all content pushed below the viewport; huge voids between Mind-console sections; "FUSED CONFIDENCE" caption overflowing its card | Kit spread `typeStyle.eyebrow` (a data recipe: `{size, lineHeight, weight, family, tracking}`) **raw into CSS** — `line-height: 14` is a *unitless* line-height = 14×font-size = **224px line boxes** (probe: label span h=224, lip span h=140) | All 5 spread sites now map fields explicitly (`fontSize: typeStyle.x.size, lineHeight: …px, fontWeight: …weight`) | Deck populated; voids gone; caption inside card |
| D2 | Spine active-tab, GlassToggle, Undo button rendered with **no background** | Bulk sed left `background: "tint(T.cyan, 0.10)"` — a quoted *string literal*, invalid CSS | Unquoted to real calls; `borderFocus()` dead helper removed | backgrounds render |
| D3 | Kit showcase rendered **4×**, once per DemoDroneCard | Insert anchor matched `DemoDroneCard`'s closing braces, not the main component's (probe-kit: 4 identical header nodes) | Block relocated to the main component's close; `DemoDroneCard` restored | Single full-width section |
| D4 | Spine tab labels clipped to 1–2 chars (`INS…`) | 44px tabs + vertical `writing-mode` + maxWidth tighter than the mono glyph advances | Horizontal 3–4-char codes (`SCAN/GRID/LOG/TALON/TASK/TEAM/EXC`), 64px tabs, aria-label + tooltip carry full names | labels legible |
| D5 | Alert airspace read **"Degraded — none"** | Pop text interpolated `state.exceptionState`, which is `"none"` while `operationalException` is set | Copy is now scene-independent: "Degraded — fallback evidence active" | correct text |
| D6 | Legacy `ExceptionBanner` **double-rendered** in v2 alongside AlertAirspace | Overlay predates the flag and wasn't gated | `!layoutV2` added to the banner gate | single interrupt surface |

## 2. emil-design-eng review — motion & micro-interaction detail

| Before | After | Why |
| --- | --- | --- |
| `HairlineBar` animates `width` | Switch fill to `transform: scaleX(n)` with `transform-origin: left` | Only `transform`/`opacity` skip layout/paint; width transitions relayout every frame |
| `AttentionSpine` animates `width` on expand | Animate the panel with `clip-path: inset(0 100% 0 0 → 0)` or `transform: translateX` | Same law — width triggers layout; clip-path is GPU-composited |
| `CommandTile`/spine tabs: no press state | `transform: scale(0.97)` on `:active` with `transition: transform 160ms ease-out` | Buttons must acknowledge the press instantly; the interface should feel like it's listening |
| `Ticker`/`UndoToast` mount with `kitRise` keyframes | CSS transition from `opacity: 0; translateY(6px)` (`@starting-style` where supported) | Toasts/tickers are rapidly re-triggered; keyframes restart from zero, transitions retarget mid-flight |
| `Ticker` items enter simultaneously | 30–60ms stagger via `animation-delay` per index | Cascading entry reads natural; keep it under 80ms or it feels slow |
| `Numeral` rAF tween with no cleanup on unmount | Already correct — keep (cleanup exists) | Cancelling the rAF avoids setState-after-unmount |
| Reduced motion | Already correct — `@media (prefers-reduced-motion)` kills `kitPulse/kitRise/kitWave`; Numeral checks `matchMedia` | Reduced motion = fewer/gentler animations, not zero |
| Easing set | Already correct — `ease.out (0.23,1,0.32,1)` everywhere, spring capped to decorative pops ≤240ms, no `ease-in` on any UI element | Strong custom ease-out feels instant; spring only where bounce is honest |
| `TranscriptBars` | Already correct — pure CSS `scaleY` wave, no canvas (vault 09 law holds) | CSS animations run off the main thread |

(Six "Already correct" rows are recorded deliberately — the audit checks what's right, not only what's wrong. The two `width`-transition rows and the missing press state are the actionable ones; queued for the P7 polish pass.)

## 3. impeccable critique (Operate mode) — heuristic scorecard

| Surface | Score | Notes |
|---|---|---|
| Command Deck | **8.5/10** | One glass law, truth cluster legible, cradle posture ring carries state honestly, C2/C3 class chips + expiry ring are best-in-build. Minus: baseline right side is empty (a quiet-watch affordance would balance the grid); second-row pills sit low. |
| TALON Mind Console | **8.5/10** | Convergence hero (G-01 fixed) reads as the focal point; tool trace + evidence chips give real provenance; density rhythm is even after D1. Minus: collapsed Session shows only the orb. |
| Attention Spines | **7.5/10** | Lips + tier dots work; expansion interaction verified. Minus: tab typography still tight (post-fix codes render, worth one more px pass); scrub-to-preview from doc 02 not yet wired. |
| Obsidian Glass Kit page | **8.5/10** | All 17 primitives render correctly; token discipline verified by audit. Minus: card-internal top void (alignContent), cone scales small in its card. |
| Default layout | unchanged | 23/23 a11y; deepened palette only. Legacy panels await the kit port (P7). |
| Consistency sweep | **pass** | One radius law (concentric), one border law (hairline), one eyebrow style across deck/console/spines/kit; semantic hues never repurposed; a11y 23/23. |

## 4. Design-sprint scorecard — adapted (honesty note)

The Friday skill expects 5 live customers; this audit had **zero humans**. What follows scores the sprint questions against *flow evidence* (22 scripted Playwright runs) + *pixel evidence* (captures), which validates mechanics, not human trust. Real-user testing remains a scheduled prerequisite before the P7 promote.

| Sprint question | Evidence | Call |
|---|---|---|
| Q1 Can the operator reach the authorization gate in ≤2 interactions in v2? | Flow "layout v2: deck, spines and mind console render" + authority capture: staged tile with ring is on the deck, one click from the modal | **Validated** |
| Q2 Do collapsed panels keep the operator informed (lips + tier dots)? | Captures show lips + dots; content verified by expansion flow | **Partial — validated mechanically, unproven with humans** |
| Q3 Are TALON's dashboard proposals visible, dismissible, undoable, logged? | intents.ts validation + UndoToast + ledger entries in flows | **Validated (mechanics)** |
| Q4 Is staged expiry visible and does it never execute? | Dedicated flow (countdown ring, dissolve, ledger, scene unchanged) | **Validated** |
| Q5 Does a11y hold across both layouts? | routes 23/23 axe-clean under deepened palette | **Validated** |
| Q6 Promote v2 to default now? | All mechanics green; no human has walked it | **Decision: iterate-once** — owner walkthrough of `?layout=v2` (+ optional `?feed=live`), then flip |

**Decider summary (adapted):** call = **build-on (iterate-once before promote)**. Highest-confidence learning: the single-source `deriveTalonSurface` + derivation-layer expiry survived every new surface without a single contradiction — the constitution is load-bearing in code, not just prose. Next artifact: owner walkthrough notes → default flip → legacy-panel kit port.

## 5. Vault usage inventory (what came from the UI components repo)

Every item below was **mined from `D:\Design Tools\Ui kits and components\library` and re-tokenized** — zero runtime dependencies added; license-clean (MIT/Apache); no copy-paste of foreign token systems.

| Vault source | Shipped component(s) | Files |
|---|---|---|
| cult-ui `apps/www/components/ai-elements` (reasoning, task, inline-citation, sources) | ToolTrace stepper, EvidenceChip provenance chips | `kit/core.tsx`, `shell2/TalonMindConsole.tsx` |
| `packages/microcharts` (`@microcharts/react` 0.19.1: forecast-cone, heat-cell, mini-bar, dual-sparkline) | ForecastCone, HeatCells, BarcodeHistogram, Sparkline | `kit/viz.tsx` |
| kibo (status, ticker) | StatusDot/StatusPill, Ticker | `kit/core.tsx`, `kit/viz.tsx` |
| number-flow 0.6.2 | Numeral (rAF-eased animated numerals) | `kit/viz.tsx` |
| sonner 2.0.8 | UndoToast (intent undo receipts) | `kit/feedback.tsx` |
| elevenlabs-ui (bar-visualizer) | TranscriptBars — CSS port, no canvas | `kit/feedback.tsx` |
| glass-lens-react (GlassSurface) + kokonutui (liquid-glass-card) | PanelGlass (4 material variants) | `kit/core.tsx` |
| better-design `glassmorphic-dark` skin | GlassToggle + deck/chrome material language | `kit/core.tsx`, `tokens.ts materialGlass` |
| thinking-orbs / bloub / Circle Loaders | studied; TalonMark's 8 postures kept (semantically superior: gates/lockouts), countdown arc covers the loader niche | `shell2/CommandDeck.tsx` |
| BoardUI / Beautiful UI / AI Elements patterns (web eval) | Approval-card → intent cards; agent-log → tool trace | `TalonMindConsole.tsx` |
| juice-lab/Aerion reference shots (design target) | arc gauge, hairline meters, eyebrow typography, glass deck + curved cradle | `kit/viz.tsx`, `shell2/CommandDeck.tsx` |

**Pattern-level (no component taken):** json-render/OpenUI generative-UI → the permissioned intent catalog (`domain/intents.ts`); ISA-18.2 alarm discipline → attention arbiter; neat-annotations → queued for the map briefing pass (P5-map).

## 6. Artifacts

Captures: `verification-artifacts/audit-v2/*.png` (10). Probes: `scripts/probe-v2.mjs`, `probe-v2-tree.mjs`, `probe-kit.mjs`, `capture-audit-v2.mjs` (kept as regression tooling). Gates after fixes: typecheck ✓ · tokens 261-warn/0 violations · attention 17/17 · machine 20/39 · signals 20 ✓ · build ✓ · flows 22/22 · routes 23/23.
