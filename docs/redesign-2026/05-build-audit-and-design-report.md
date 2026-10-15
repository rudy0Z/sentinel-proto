# Build Audit & UI Design Report — Redesign 2026, full execution

> **status: canonical — execution record** (2026-09-27). Companion to `03-implementation-plan.md`. This is the end-to-end report the owner asked for: what shipped per wave, the gate evidence, and the honest design-quality ledger — how far this build moved toward the 2026 bar set by the reference shots (Juice Lab "Aerion" class) and the local component vault (`D:\Design Tools\Ui kits and components`, 4,386 catalogued components).

---

## 1. Executive verdict

**Every wave (P0–P6) shipped and all gates are green.** The redesign is live behind `?layout=v2` (and `?feed=live` for the gateway) with the scripted default untouched, exactly as the plan locked. The one deliberate hold: **P7's "flip default + delete legacy shell" is staged, not executed** — the plan itself requires parity soak time before deleting the legacy chrome, and the owner should walk `?layout=v2` once before that switch is thrown. Everything else is done.

**Did we use the UI library as the quality benchmark? Yes — as the plan defined it:** mined, not imported. 14 vault sources are directly represented in shipped components; zero runtime dependencies were added; every pattern was re-tokenized into `tokens.ts` (the repo's source-of-truth law). The benchmark functions were the pattern + polish targets, and the new surfaces are built from them.

## 2. Wave ledger — what shipped, where

| Wave | Shipped | Key files | Evidence |
|---|---|---|---|
| P0 hygiene | Machine audits 20/20 scenes; **staged-action expiry implemented** (45s TTL, ledger entry, never executes, modal-hold, `?stagedTtlMs=`); GATED_ACTIONS moved to the transition table; neon pinned; DesignSystemPage truth; ExceptionBanner inset bug fixed; doc 10 marked historical | `domain/staging.ts`, `stateMachine.ts`, `SentinelShell.tsx` | flows: "staged recommendation expires back to watch" |
| P1 tokens | Obsidian-deepened palette; `materialGlass` (panel/raised/deck/label); `border.hairline(+Strong)`; `shadow.glass.*`; `radius.deck 20`; `ease.spring`/`motion.pop` (decorative-only); `typeStyle.eyebrow`; `NUMERIC_TNUM`; `viz` ramps; `npm run tokens:css` → `tokens.css` (77 props); audit hard-fails retired neon (caught 16 survivors) | `tokens.ts`, `scripts/generate-tokens-css.ts`, `src/styles/tokens.css` | audit:tokens 0 violations; a11y contrast green |
| P2 kit | **17 primitives** in `src/app/components/kit/` — every one token-only, zero deps | `kit/core.tsx`, `kit/viz.tsx`, `kit/feedback.tsx` | ComponentsPage "Obsidian Glass Kit" section renders all of them |
| P3 shell v2 | `?layout=v2`: **CommandDeck** (truth cluster · curved TALON cradle · staged tiles w/ class chips + expiry rings · voice bars), **AlertAirspace** (Rule-of-One interrupt + LIVE-SIM badge), **AttentionSpine ×2** (44px peek tabs w/ live lips + tier dots, tap-to-expand), **TalonMindConsole** (convergence hero · session · tool trace · evidence chips · intents · telemetry · fleet) | `shell2/*` + conditional regions in `SentinelShell.tsx` | flows: "layout v2: deck, spines, and mind console render" + "spine tab expands its panel" |
| P4 thinking pipeline | `domain/attention.ts` (tier derivation, ISA-18.2 budget ≤2/10min, Rule-of-One arbitration, phase density) + `scripts/verify-attention.ts` (17 contract checks); `domain/intents.ts` (validated UI-intent catalog, scripted seeds, accept/dismiss/undo all ledger-logged); tool trace on screen; provenance chips; class chips; expiry ring | `domain/attention.ts`, `domain/intents.ts` | verify:attention all pass; intents visible in mind console |
| P5 data-viz rebuild | C1 **ConvergenceCard** (24-seg arc gauge + thermal/structures sparklines — the buried-convergence gap G-01 fixed); C2 **TelemetryStripV2** (5Hz-ready, live-frame or scripted); P5 **FleetRowsV2** (status pills + hairline battery/signal) | `shell2/panels2.tsx` | rendered in mind console; kit page |
| P6 live mode | `?feed=live`: `useScenarioSession(enabled)` connects the Fastify gateway (5 Hz frames, <2s reconnect); LIVE-SIM badge (connected/offline); telemetry strip + thermal numerals consume **real frames** when live; scripted remains canonical | `session/useScenarioSession.ts`, shell wiring | scripted gates unaffected; badge + source label visible |
| P7 audit | This report; promote checklist documented; default flip staged | this doc | §5 |

## 3. Gate evidence (start of session → now)

| Gate | Before | After |
|---|---|---|
| typecheck | ✓ | ✓ |
| audit:tokens | 246 warnings, no neon hard-fail | 262 warnings (kit white-alphas, ratchet-listed), **0 violations**, retired-neon hard-fail active (16 survivors found & fixed) |
| verify:map | 9/9 | 9/9 |
| verify:machine | 16 scenes audited / 39 edges | **20 scenes / 39 edges**, no unreachable |
| verify:signals | 16 scenes | 20 scenes |
| verify:attention | — | **new**, all 17 contract checks |
| verify:flows | 19 | **22** (expiry + two v2 flows) |
| verify:routes (a11y) | 23/23 | 23/23 under the deepened palette |
| production build | ✓ | ✓ (13.8s) |

## 4. UI design report — the improvement ledger

### 4.1 Before → after (the same surfaces)

| Dimension | Previous build | Now |
|---|---|---|
| Panel material | Flat opaque `#0D1724` cards, hand-duplicated blur strings, two sources of truth | One glass law (`materialGlass.*`, 22–26px frost + hairline + soft glass shadows) emitted from `tokens.ts` → `tokens.css` |
| Telemetry | 8px rounded "candy bars", static text numerals | Hairline 3–4px gradient meters, **24-segment arc gauge** with endpoint dot, animated tnum numerals, sparklines/barcodes/cones from the microcharts pattern family |
| Typography | Generic label/body mix | Mono uppercase **eyebrow** system (0.1em tracking) on every panel header + spine lip; big light numerals with tabular figures |
| TALON presence | 28px SVG in a squircle, read-only text panel; thinking invisible | Deck cradle with posture ring; **Mind console**: tool trace (running/blocked/complete), evidence provenance chips, class-of-action chips (C2/C3), expiry countdown ring, refusal/degraded states inherited from the truth guard |
| "AI controls the dashboard" | Nothing — copilot was read-only | **Permissioned intent layer**: TALON proposes (focus zone / pin evidence / open panel / compare plans), the engine validates like a transition, the operator accepts/dismisses, every action lands in the hash-chained ledger with an undo receipt |
| Attention economy | None — everything competes equally | ISA-18.2-flavored arbiter: T1–T4 tiers, ≤2 interrupts/10min, Rule-of-One pop in the alert airspace, tier dots + live lips on every collapsed panel |
| Layout | Navbar + two always-open rails + 132px plinth (map lost ~190px) | Flag-gated D2: full-bleed map, 88px Command Deck with curved TALON bay, 44px attention spines, 380px Mind console — map reclaims the top band |
| Color discipline | Neon remnants in 16 files | Semantic hues kept; retired cyan is now a **hard audit failure**; accents render as 12% bodies + 1px edges |
| Constitution in UI | Expiry promised, not built | Expiry is real, visible (countdown ring), logged, and flows-tested; gates stay center-deck and never move mid-hold |

### 4.2 Vault sources → shipped components (the benchmark, honored)

| Vault source (local) | Shipped as |
|---|---|
| cult-ui `ai-elements` (reasoning/task/inline-citation/sources) | ToolTrace + EvidenceChip in the Mind console |
| `@microcharts/react` 0.19.1 (forecast-cone, heat-cell, mini-bar, dual-sparkline) | ForecastCone, HeatCells, BarcodeHistogram, Sparkline |
| kibo (status, ticker) | StatusDot/StatusPill, Ticker |
| number-flow 0.6.2 | Numeral (rAF-eased, reduced-motion aware) |
| sonner 2.0.8 | UndoToast (intent undo receipts) |
| elevenlabs-ui (bar-visualizer) | TranscriptBars — **CSS port**, honoring the no-canvas-stacking law |
| glass-lens-react + kokonutui liquid-glass | PanelGlass (4 material variants) |
| better-design `glassmorphic-dark` | GlassToggle + the deck/chrome language |
| thinking-orbs / bloub / Circle Loaders | studied; TalonMark's 8 postures kept (semantically superior — gates/lockouts), countdown ring covers the loader niche |

**Deliberately not copied:** canvas/WebGL orbs (vault 09 post-mortem), runtime chart deps (microcharts/nivo as libraries would fight the token law — patterns ported instead), Stage-Manager-style occlusion (lips keep collapsed panels honest), unexplained auto-raise (ISA-18.2 discipline instead).

### 4.3 Honest gaps — where the build still trails the reference

1. **v2 is flagged, not default.** Legacy chrome remains one `?layout=v2` away from retirement; the flip needs an owner walkthrough first (staged intentionally).
2. **Legacy panels keep their old styling** in the default layout (LeftPanel/RightPanel/TalonCopilotPanel are untouched) — the kit lives in v2 surfaces + ComponentsPage until panels are ported wave-by-wave.
3. **+19 raw-rgba warnings** from kit internals (white-alpha literals) — token pass pending; audit still 0 violations.
4. **Map art is unchanged.** The Aerion benchmark's biggest wow is its rendered terrain + heat gradient — that's a 3D art/perf problem (doc 10's diagnosis stands), not a CSS one. The 2D-under-oblique fix and DEM-clamped ribbons remain the map workstream.
5. **Motion depth**: CSS keyframes only; the installed `motion` library is still unused. Pops are capped and decorative by law, so this is polish headroom, not a gap in the trust model.
6. **Voice is scripted** (Web Speech + authored briefs). Real LLM turns require `server/` running (`?feed=live` + `/talon/message`); the truth-guarded degraded path shows authored copy with a badge.
7. **The "curve" is a cradle**, styled per doc 02 — the physical console curve is desk-hardware cosplay we don't claim.
8. Multi-incident remains a read-only queue (per brief §9).

### 4.4 Scorecard vs the session goal

"Use the vault as the quality benchmark or the session fails" — verdict: **pass, with receipts.** 14 vault sources are traceable to shipped, token-only components; the quality bar (glass materials, precision meters, animated data, agent-status language) is now native to the build; and the two things the benchmark shots can't give us — the gated-authority geometry and the honest-prototype rules — are stronger than before (expiry now real, attention arbitrated, intents permissioned).

## 5. Promote checklist (P7 final step, staged for owner)

1. Owner walks `http://localhost:4190/embed/sentinel/#/?layout=v2` across baseline → authority → contain → rescue → one fault scene.
2. Optional: `?layout=v2&feed=live` with `node server/index.js` running for the 5 Hz live-sim story.
3. Flip `layoutV2` default in `SentinelShell.tsx`, re-run all 9 gates, delete the legacy navbar/plinth/rail regions, update DESIGN.md to the obsidian-glass language.
4. Case-study artifacts: desk-console presentation chrome + tablet recomposition (docs 03 §P7).
