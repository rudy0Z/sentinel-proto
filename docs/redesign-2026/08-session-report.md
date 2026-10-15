# Session Report — what we actually did, and why your test showed the old UI

> **status: canonical — session record** (2026-09-28). Covers the whole session: research → validation → plan → full plan execution → audits → system report. Ends with the expectation mismatch you just hit and the decision it forces.

---

## 1. The headline

**Everything we promised in the approved plan was built and every gate is green — but the new layout and most of the new design language are behind a URL flag (`?layout=v2`), so opening the app normally shows you the *old* shell with only the palette deepened.** That flag-gating was decision #2 you locked when approving the plan ("flag-gated v2, then promote (recommended)"), and the promote step was deliberately staged pending your walkthrough. Your test just performed that walkthrough — and its verdict is that a hidden flag is not a walkthrough. The fix is one decision away (§5).

## 2. Chronological ledger

**Session 1 — research & validation (2026-09-27):**
- Ran all verification gates against a fresh build (typecheck, tokens, map 9/9, machine, signals, build, flows 19/19, routes 23/23) — all green.
- Audited the vault docs 00–10 and the whole repo: verdict — the vault plan is sound; the new "Defense HUD" spec (doc 10) has a verified-correct diagnosis but four prescriptions that violated canonical specs (new hexes, canvas orb, invented state names, self-granted authority) → salvage, don't adopt.
- Inventoried your component vault (`D:\Design Tools\…`: 85 repos, 4,386 components, its own MCP server), extracted the AI-trust playbook (15 principles), evaluated ~38 web UI resources from your screenshots.
- Found the structural gaps: **staged-action expiry was promised in the constitution but had zero implementation**; machine audit covered only 16 of 20 scenes; TALON was read-only (no mechanism to control the dashboard at all).
- Wrote `docs/redesign-2026/00` (validation + decision ledger) and answered your layout questions with evidence → **D2 "Mind / Hand / Senses"** became the recommended direction.

**Session 2 — plan + Wave 1:**
- You locked four decisions: obsidian glass with semantic hues kept · **flag-gated v2 then promote** · dual data modes (scripted canonical + live gateway) · foundation-first.
- Wrote `03-implementation-plan.md` (waves P0–P7) and `04-visual-language-and-components.md` (the full data→component mapping + glass recipes).
- **P0:** implemented staged-action expiry for real (45 s TTL, ledger entry, never executes, modal-hold, test affordance + a new browser flow); machine audit now covers 20/20 scenes; `GATED_ACTIONS` moved into the transition table; retired-neon pinned everywhere; ExceptionBanner inset bug fixed; doc 10 marked historical; README/AGENTS counts corrected to 20 scenes / 39 transitions.
- **P1:** obsidian-deepened palette; `materialGlass` recipes; hairline borders; glass shadows; deck radius; spring easing (decorative-only); eyebrow typography; the `viz` gradient ramps; `npm run tokens:css` → `src/styles/tokens.css`; the token audit now **hard-fails** the retired neon (it caught 16 survivors, all fixed).

**Session 3 — full plan execution + audits (2026-09-28):**
- **P2:** 17-primitive obsidian-glass kit (`kit/core|viz|feedback`) — PanelGlass, ArcGauge (24-segment), HairlineBar, Sparkline, BarcodeHistogram, HeatCells, ForecastCone, Numeral, Ticker, StatusPill, EvidenceChip, CommandTile with expiry ring, GlassToggle, TranscriptBars, UndoToast — every one mined from your vault sources and re-tokenized, zero new dependencies.
- **P3:** shell v2 behind `?layout=v2` — **CommandDeck** (truth cluster + curved TALON cradle + class-chipped staged tiles), **AlertAirspace** (Rule-of-One interrupts), **AttentionSpines** (44 px peek tabs with live lips + tier dots), **TalonMindConsole** (convergence hero, session, tool trace, evidence chips, telemetry, fleet) — composed inside the existing state engine, no copy.
- **P4:** attention arbiter (ISA-18.2 budget ≤2 interrupts/10 min, Rule of One, phase density) with a 17-check contract gate; **UI-intent catalog** — TALON proposes (focus zone / pin evidence / open panel / compare plans), engine validates, you accept/dismiss/undo, everything ledger-logged.
- **P5:** ConvergenceCard / TelemetryStripV2 / FleetRowsV2 rebuilt on the kit. **P6:** `?feed=live` — real Fastify gateway connection, 5 Hz frames into the UI, LIVE-SIM badge.
- **Audits:** `05` build report (P0–P6 ledger), `06` pixel audit — which **found and fixed 6 real defects** (the big one: token data-recipes spread raw into CSS → unitless `line-height: 14` → 224 px line boxes that emptied the deck; plus invalid quoted `tint()` strings, a 4×-duplicated kit section, clipped spine labels, wrong interrupt copy, a double-rendered banner), `07` system report (data components, deck/drone/map inventories, TALON end-to-end, every doc old→new, LiveKit adoption plan, database build-up, the missing list).

## 3. Gate evidence — start → now

| Gate | Session start | Now |
|---|---|---|
| Flows | 19/19 | **22/22** (expiry + two v2 flows) |
| Machine audit | 16 scenes | **20 scenes / 39 edges**, no unreachable |
| Token audit | 246 warnings, no neon enforcement | 0 violations, **retired-neon hard-fail active** |
| New gates | — | attention contract 17/17 · tokens.css pipeline |
| Routes (a11y) | 23/23 | 23/23 under the deepened palette |

## 4. Why your test showed the old UI — the honest breakdown

1. **The default shell is still the legacy layout.** New layout = add `?layout=v2`. This was decision #2 of the approved plan; I staged the promote behind your walkthrough and failed to make the flag unmissable in my handoff. That's on the report, not you.
2. **Even without the flag you should have noticed *some* change** — the deepened obsidian background, the purged neon — but that's ~10 % of the visual work.
3. **The full design language is confined to v2 surfaces + the kit page** by design of the flag-gate: the deck, spines, mind console, and the Components-page kit section are obsidian glass; the legacy panels, modals, and map chrome are still old-styled until the P7 port. So even `?layout=v2` is a new skeleton with some legacy organs — that's the honest state, and it's what "flag-gated, promote after parity" buys.

**To actually see the work, run:**
```
npm run build && npm run preview -- --port 4190
# new layout (then walk baseline → verify → authority → contain → rescue):
#   http://localhost:4190/embed/sentinel/#/?layout=v2
# with staged-tile expiry ring visible at authority:
#   http://localhost:4190/embed/sentinel/#/?scene=authority-notification-ready&layout=v2&stagedTtlMs=0
# live gateway mode:  node server/index.js  then  …#/?layout=v2&feed=live
# kit showcase:       http://localhost:4190/embed/sentinel/#/components  (scroll to "Redesign 2026 — Obsidian Glass Kit")
# reference captures: verification-artifacts/audit-v2/*.png
```

## 5. The decision your test forces

**Option A (recommended): flip the default to v2 now.** The 22 flows pass; the 19 legacy flows get `&layout=v1` appended (legacy stays reachable as the escape hatch), `layoutV2` becomes the default, all gates re-run, and you see the new product on a plain URL. One session of work. The legacy chrome deletion and panel kit-port continue behind it.
**Option B:** keep the flag until every legacy surface is ported — cleanest, but it means weeks of invisible progress, which is exactly what just failed your expectation.

Say "flip it" and Option A happens next session, with the gate evidence posted after.

## 6. Session totals

Docs written: 8 (`00`–`07` + this). Build: 1 domain module + 2 domain layers (attention, intents) + 17 kit primitives + 5 shell2 surfaces + 2 rebuilt panels + live-mode wiring + 3 new scripts/gates + 6 audit defects fixed. Gates: 9 suites green. Dependencies added: 0. Constitutional promises turned into working code: expiry, attention budget, UI intents, receipts surface — the four things the documents claimed but the build had never proven.
