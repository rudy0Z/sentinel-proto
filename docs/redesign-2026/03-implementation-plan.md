# Sentinel Redesign — Implementation Plan (Waves P0–P7)

> **status: canonical — redesign execution plan** (owner-approved 2026-09-27, decisions locked in-session). Scope: the 2026 UI redesign only. `docs/sentinel-v2-master-plan/00–09` remains the product authority; golden rules in `AGENTS.md` apply to every wave. Companions: `00-validation-and-direction.md` (audit), `01-data-map.md` (data inventory), `02-layout-research-and-direction.md` (layout rationale), `04-visual-language-and-components.md` (design language + data→component mapping).

**Decisions locked (owner, 2026-09-27):**
1. Layout = **D2 "Mind / Hand / Senses"** (doc 02): Command Deck bottom with curved TALON bay · Alert airspace top · Attention Spines on the edges · TALON Mind Console right · map full-bleed.
2. Palette = **obsidian glass, semantic hues kept** (cyan=TALON/telemetry, amber=degraded, red=danger, teal=confirmed; fire-orange stays the fire layer). Material language moves to the 2026 bar; hues do not.
3. Rollout = **flag-gated v2, then promote.** New shell builds behind `?layout=v2`; existing shell remains default; gates run on both until parity; then default flips and legacy regions are deleted.
4. Data modes = **both.** Scripted prototype stays canonical for all gates; a **live mode** runs on `server/` with deterministic mock scenario datasets (5 Hz) and a real LLM behind the truth guard.
5. Sequencing = **foundation first** (hygiene → tokens → primitive kit → shell).

---

## Architecture (regions + geometry)

| Region | Geometry | Notes |
|---|---|---|
| Map command surface | full-bleed (inset 0) behind everything | reclaims the top band and ~96px of bottom chrome vs today (navbar 52 + plinth 132/184) |
| Alert airspace | floating, top, max-w 560, centered | T1 takeover / T2 banners + phase chip; empty when board is clean; Escape never dismisses an unacked T1 |
| Command Deck | full-width, ~88px tall, bottom 12px, radius 20 | left: truth cluster (incident · phase arc · T+ clock · scenario); center: orb cradle with curved inlay (TalonMark 48px in 60–64px bay); right: ≤3 staged tiles w/ expiry countdown + override + mic + receipts |
| Attention Spines | left/right, 44px collapsed | peek tabs, lips carry one live value + tier dot; drag = scrub-to-preview; open = one panel 300–340px; ≤4 slots/side; tabs never move mid-hold |
| TALON Mind Console | right, 380px, collapsible to spine tab | thread + tool trace + evidence chips + plan cards + confidence/class badges + refusal states + voice bar |
| Attention arbiter | `src/app/domain/attention.ts` | pure fn: tier (T1/T2/T3/T4) × phase density × Rule-of-One; ISA-18.2 budget ≤2 interrupts/10min; pops = proposals w/ undo receipts, logged |

**Laws that survive every wave:** gates live only in the Command Deck, never in a sliding surface · sticky mirror (anything actionable in the Mind thread appears identically at the deck, derived from `deriveTalonSurface()`) · TALON controls attention, never furniture · no canvas stacking, perf budgets not fps claims · tokens are the source of truth · honesty boundary.

## Wave P0 — Hygiene & constitution repair

| # | Change | Files |
|---|---|---|
| P0.1 | `ALL_SCENES` += 4 promoted scenes (`verify-source-conflict`, `contain-awaiting-teams`, `rescue-partial-evac`, `handoff-pending`) so `auditMachine` covers 20/20 | `src/app/domain/stateMachine.ts` |
| P0.2 | **Staged-action expiry** (G1): TALON-staged recommendations carry `stagedAt`; TTL (default 45s, `?stagedTtlMs=` test affordance) → tile dissolves, recommendation cleared, activity-log entry "staged recommendation expired — no action taken", surface returns to scene truth. Expiry is never execution. New verify:flows case. | `SentinelShell.tsx` (or `domain/staging.ts` + hook), `scripts/verify-flows.mjs` |
| P0.3 | `GATED_ACTIONS` moves home to `stateMachine.ts` (doc 04:113 says constitution lives there); `talon.ts` re-exports for compatibility | `stateMachine.ts`, `talon.ts` |
| P0.4 | theme.css stale neon `rgba(0,200,255,…)` pinned to the real cyan | `src/styles/theme.css` |
| P0.5 | DesignSystemPage: "yellow" documentation fixed (value is cyan; yellow retired), metric spec corrected (32px, not "Mono 11") | `src/app/pages/DesignSystemPage.tsx` |
| P0.6 | ExceptionBanner/VerifyLiveFeed inset bug (right side inset by *left* rail width) | `SentinelShell.tsx` |
| P0.7 | doc 10: `historical` status header, authority cosplay removed, invented telemetry labeled | `docs/sentinel-v2-master-plan/10-…md` |
| P0.8 | README/AGENTS.md counts: 20 scenes / 39 transitions; flows count updated when P0.2 lands | `README.md`, `AGENTS.md` |

**Acceptance:** typecheck ✓ · audit:tokens ≤ existing baseline · verify:map 9/9 · verify:machine audits 20 scenes with no unreachable/dead-ends beyond the 4 fault-injected · verify:signals ✓ · flows (incl. new expiry flow) ✓ · routes 23/23.

## Wave P1 — Token system v2 ("obsidian glass" foundation)

| # | Change | Files |
|---|---|---|
| P1.1 | Deepen obsidian surfaces in the same hue family (bgBase/bgPanel/bgRaised/bgMap), keep all text contrast ≥ AA | `tokens.ts` (T palette, surface) |
| P1.2 | Glass material recipes: `material.glass.panel/raised/deck/label` (blur 20–28px, saturate 140–160%), `GLASS_FROST` const; `border.hairline` 0.07 / `hairlineStrong` 0.10; top inner highlight; `shadow.glass.sm/md/lg` | `tokens.ts` (material, border, shadow) |
| P1.3 | Data-viz ramps: per-tone bar gradients (12% alpha body + 100% 1px edge — doc 10 salvage), confidence ramp, arc track/fill, forecast-cone fills | `tokens.ts` (new `viz` group) |
| P1.4 | `radius.deck = 20`; `motion.spring` (capped, decorative only); `typeStyle.eyebrow` (mono, uppercase, 0.1em); tnum constant for numerals | `tokens.ts` (radius, motion, typeStyle) |
| P1.5 | CSS custom-property emission: `scripts/generate-tokens-css.ts` (tsx) → `src/styles/tokens.css`, imported last in `index.css`; theme.css reduced to a compatibility layer over the vars | `scripts/`, `src/styles/` |
| P1.6 | audit:tokens: hard-fail the retired neon `#00c8ff`/`rgba(0,200,255` anywhere in `src/` | `scripts/audit-design-tokens.mjs` |

**Acceptance:** verify:design ✓ with new-recipe tokens exempt as token definitions · routes a11y still 23/23 (contrast) · DesignSystemPage renders a "Redesign 2026" section showing the new materials.

## Wave P2 — Obsidian-glass primitive kit (`src/app/components/kit/`)

PanelGlass · SectionEyebrow · HairlineBar · ArcGauge (24-seg) · BarcodeHistogram · Sparkline · HeatCells · ForecastCone · Ticker · Numeral (tnum + animated count) · StatusDot/Pill · EvidenceChip · CommandTile · GlassToggle · Toast/Undo · MapLabelV2 · TranscriptBars. Each names its vault source (cult-ui ai-elements, `@microcharts/react` 0.19.1, kibo, number-flow, sonner, elevenlabs-ui, glass-lens-react, kokonutui) and is re-tokenized on arrival — no dependency adopted wholesale, no free-form hex. **Acceptance:** ComponentsPage v2 renders every primitive with live sample data from `mockData`; audit:tokens green; no new runtime deps except none (all copy-paste source).

## Wave P3 — Shell v2 behind `?layout=v2` (`src/app/components/shell2/`)

`SentinelShellV2.tsx` composing existing map + rebuilt panels · `CommandDeck.tsx` · `AlertAirspace.tsx` · `AttentionSpine.tsx` · `TalonMindConsole.tsx` · `panels.ts` v2 (slots gain `attention` tier, `lips` payload, intent hooks) · spine keyboard/ARIA · old shell untouched as default. **Acceptance:** new flows under the flag — mirror parity (thread action ≡ deck action), alarm budget (≤2 interrupts/10min scripted), kill-test `verify-active → rescue-battery-critical` ≤30s without losing spine position, raise logged; verify:routes v2 combos pass a11y.

## Wave P4 — TALON thinking pipeline v2

Tool-trace on ShellState (per-step status/timing) · provenance refs on every recommendation · class-of-action chips (1/2/3) · expiry countdown UI (from P0.2) · refusal/abstention + AI-degraded badge · `domain/intents.ts` (`focus_map_zone`, `open_panel`, `pin_evidence`, `compare_plans` — validated like transitions, rendered as proposal-with-undo, logged) · voice UX: mic state machine (idle/listening/thinking/speaking → mark states), CSS bar visualizer, live transcript line, barge-in, honest mic-unavailable fallback; voice output always lands as a proposal at the deck gate. **Acceptance:** eval-talon.mjs still zero silent breaches; new attention-arbiter fixture tests; flows for intent-propose/undo.

## Wave P5 — Data-viz & panel rebuild (against the kit, ch07 priority)

C1 Convergence card (fixes buried-convergence G-01) · P2 Intel & Evidence (freshness v2 + evidence chips) · P5 Fleet grid (+ preflight/dock roll-up G-05) · C2 telemetry strip (5Hz-ready, animated numerals) · P4 projection (ForecastCone + age badge G-08) · P9/P10 ledger streams · C8 weather strip (gusts G-07) · P11 evac GO-chips (G-15) · P12 debrief timeline (G-12) · map: orthomosaic-under-2D law, MapLabel v2, ring age badges, DEM-clamped 3D ribbons, optional annotation pass.

## Wave P6 — Live mode (parallel track)

`ShellState.feed: "scripted" | "live"` · `session/useScenarioSession.ts` wired **only** in live mode · `server/` serves existing deterministic mock scenarios at 5 Hz + real LLM via `/talon/message` (truth guard; degraded → authored fallback + visible badge) · UI carries a persistent **LIVE-SIM** badge and data-freshness indicators · same view models in both modes (panels cannot tell the difference) · scripted remains canonical for every gate. **Acceptance:** full gate suite passes in scripted mode regardless of live mode; live mode manual-verified on S-01.

## Wave P7 — Promote & close

Parity checklist (flows incl. v2 set · routes incl. v2 combos · map 9/9 · machine 20/39 · signals) → flip default to v2 → delete legacy shell regions (navbar top bar, old action plinth, old rail stack) → DESIGN.md updated to the obsidian-glass language → case-study artifacts (desk-console presentation chrome, tablet recomposition demo).

## Risks & mitigations

SentinelShell god-file → flag-gated parallel `shell2/`, never in-place surgery · draw-call budget → spine lips are CSS transforms only · occlusion regression → lips always carry live values + 2s-locate test · alarm flood → arbiter budget enforced in code, pops logged · a11y contrast under deeper obsidian → routes axe gate after P1 · scope creep → each wave has acceptance gates; no wave starts before the previous is green.

## Change log

- 2026-09-27 — created; owner-approved direction (D2, obsidian glass, flag-gated, dual data modes, foundation first).
- 2026-09-27 — **Wave 1 (P0+P1) landed, all gates green.** P0: machine audits 20/20 scenes; staged-action expiry implemented (`domain/staging.ts` + SentinelShell timer + ledger entry + `?stagedTtlMs=` test affordance + new verify:flows case); GATED_ACTIONS moved to stateMachine.ts (talon.ts re-exports); theme.css + keyboard.css + talon.css neon pinned to token cyan; DesignSystemPage stale yellow/metric fixed; ExceptionBanner/VerifyLiveFeed right-inset bug fixed; doc 10 marked historical; README/AGENTS counts corrected. P1: obsidian-deepened palette (AA holds — routes a11y green), `materialGlass` panel/raised/deck/label recipes, `border.hairline(+Strong)`, `shadow.glass.*`, `viz` ramps, `radius.deck`, `ease.spring`/`motion.pop` (decorative-only), `typeStyle.eyebrow`, `NUMERIC_TNUM`; `npm run tokens:css` → `src/styles/tokens.css` (77 properties) imported in index.css; audit gains retired-neon hard-fail (caught and fixed 16 survivors; warnings 246→243). Gates: typecheck ✓ · tokens 243-warn/0 violations · map 9/9 · machine 20/39 · signals 20 ✓ · build ✓ · flows 20/20 · routes 23/23.
- 2026-09-27 — **Waves P2–P6 landed; P7 staged.** P2: 17-primitive obsidian-glass kit (`kit/core|viz|feedback`) + ComponentsPage showcase. P3: `?layout=v2` — CommandDeck (curved TALON cradle, class chips, expiry rings), AlertAirspace (Rule-of-One pop + LIVE-SIM badge), AttentionSpines (44px lips + tier dots, expand-on-tap), TalonMindConsole (convergence hero, session, tool trace, evidence chips, intents). P4: `domain/attention.ts` (ISA-18.2 budget, Rule of One, phase density) + `verify:attention` (17 checks) + `domain/intents.ts` (validated proposals, undo receipts, ledger-logged). P5: ConvergenceCard / TelemetryStripV2 / FleetRowsV2 on the kit. P6: `?feed=live` gateway mode (`useScenarioSession(enabled)`, LIVE-SIM badge, real 5 Hz frames into telemetry). Gates: typecheck ✓ · tokens 262-warn/0 violations · map 9/9 · machine 20/39 · signals 20 · attention 17/17 · build ✓ · flows 22/22 · routes 23/23. P7 promote (default flip + legacy deletion) staged for owner walkthrough. Full ledger: `05-build-audit-and-design-report.md`.
