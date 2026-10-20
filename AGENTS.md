# AGENTS.md — Sentinel repo guide for AI tools

> Purpose: one entry point so any AI session (Claude Code, Cursor, Figma agents, this designer agent) starts from the same truth. Read this first, then follow the authority order below. Human authors are the owner of this file.

## What this repo is

**FlytBase Sentinel** — a desktop emergency-response command prototype (wildfire initial attack). TALON, an AI copilot, detects/verifies/recommends; a human operator authorizes every consequential action. It is a **scripted portfolio prototype**: no FlytBase API, no fire-trained model, no real dispatch. Two-phase model: **Intelligence** (detect · verify · escalate) → **Operations** (stage · coordinate · supervise).

## Golden rules (do not violate)

1. **Honesty boundary — express it as provenance, not as a disclaimer.** TALON's product role includes fire-behaviour analysis (see `DECISIONS.md` §1.6); this prototype ships a scripted stand-in for it. The rule is therefore: **never present an authored value as measured.** Every surface rendering a fire, weather, or detection metric states its basis — *measured* (real feed) · *modeled* (named model, e.g. Rothermel 1974, inputs shown) · *authored* (scripted placeholder). No invented success rates or performance numbers. No "statutory"/"cryptographic authority" claims — receipts are a hash-chained event append; the authority packet is a mutual-aid *draft* the operator sends.
2. **Human authorization is structural.** TALON may not execute gated actions (`GATED_ACTIONS` in `src/app/domain/stateMachine.ts:72`). Staged actions *expire back to watch* — expiry is never execution. Never add a path where silence approves anything.
3. **Tokens are the source of truth.** Use `src/app/tokens.ts` (`space`, `radius`, `typeStyle`, `tracking`, `surface`, `border`, `material`, `tone`, `layer`, `ease`, `motion`). No free-form font sizes, radii, tracking, or component-local shadows. Raw `rgba()`/hex only inside token definitions or map/canvas code.
4. **Keep the gates green.** See Commands. A red gate invalidates portfolio copy that quotes it.
5. **Doc charter.** Every planning doc opens with `canonical | historical | exploratory`. Historical docs are context only — never build from them. Do not add a doc without a status header.
6. **Do not import the archived shadcn tree.** `src/app/components/ui/` is unused compatibility only.

## Authority order (owner ruling 2026-09-14, corrected 2026-10-19)

> **Read `DECISIONS.md` FIRST.** It outranks every doc below. Where a doc contradicts it, the doc is stale.

1. **`DECISIONS.md` — the decision register.** The kill protocol. Every locked direction, marked `ACTIVE` / `SUPERSEDED` / `REJECTED` / `OPEN`. A decision cannot change without an entry here marking the old one `SUPERSEDED`.
2. `PRODUCT.md` — what Sentinel is (identity, users, design principles).
3. **`docs/sentinel-v2-master-plan/00–09` — the build plan** (owner ruling 2026-09-14). `00` is the index/thesis; `03` is the state machine; `08` is the phase roadmap; `09` is the TALON mark spec. Its `original-specs/` folder is verbatim source history — read for context, never build from it directly. ⚠️ Its `"8-stage / 23 routes"` framing and its four "NEW — not yet in code" scenes are **SUPERSEDED** (see `DECISIONS.md` §5.2, §5.3).
4. `PORTFOLIO-DIRECTION.md` — portfolio scope/strategy for this repo. (Note: its §2 line naming `SENTINEL-V2-MASTER-SPEC.md` as product authority predates the ruling above — the vault wins.)
5. **`sentinel-core/00–07` — the product/visual core** (owner ruling 2026-09-30): `01` product core + data model, `02` TALON identity, `03` visual language + container system, `04` iconography, `05` map world, `06` command deck, `07` panels charter. Wins over all other docs for product/visual decisions; a change lands here first (numbered dated amendment), then in code.
   - ⚠️ **`03-visual-language.md` is EXCLUDED from this band** — its warm direction was `REJECTED` 2026-09-30. `05` inherits `03`'s rejected "warm console" premise; treat its colour claims with suspicion. See `DECISIONS.md` §2.4–2.5.
6. `DESIGN.md` + `src/app/tokens.ts` — design system (doc + code).
7. `docs/archive/` — **the journey archive**. Killed planner generations, superseded session audits, and old case-study drafts. Historical context only — never build from it. (Created 2026-10-19; it did not exist before, and both this file and `README.md:64` were pointing at it as if it did.)

### Session handoffs are NOT authority

`HANDOFF-2026-10-07.md` was superseded on 2026-10-19. It claimed the v3 rail system was not wired and that `BottomNav.tsx` did not exist — **both false**; v3 has been the default chrome since commit `6317515`. Handoffs are a record of a past session, not a spec. Verify any handoff claim against disk (`git log` / `grep`) before acting on it. `TEST-PATH.md` is currently the most accurate walkthrough doc, but it is not authority either.

## Commands

```bash
npm install
npm run dev                 # dev server (vite, base /embed/sentinel/)
npm run build               # production build → dist/
npm run preview -- --port 4190   # serve dist for the browser gates
npm run verify:design       # typecheck + audit:tokens + verify:map   (static, always runnable)
npm run verify:flows        # 25 browser flows (needs the server above)
npm run verify:routes       # 23 scene/view combos + a11y + console (needs the server)
npm run verify:machine      # state-machine integrity (static)
npm run verify:signals      # telemetry signal integrity (static)
npm run verify:attention     # attention-arbiter contract checks (static)
npm run tokens:css          # regenerate src/styles/tokens.css from tokens.ts
npm run check               # verify:design + verify:flows
npm run server              # optional live-mode backend (Fastify + WS + SQLite) — see server/README.md
```

**Server-gate gotcha:** `verify:flows` / `verify:routes` default to `http://127.0.0.1:4190/embed/sentinel/`, but `vite preview` may bind IPv6-only (`[::1]`). If you get `ERR_CONNECTION_REFUSED`, run with:
`$env:SENTINEL_VERIFY_URL='http://localhost:4190/embed/sentinel/'` (PowerShell).

## Repo map

- `src/app/tokens.ts` — design tokens + shared types (the contract). The `SceneId` union lives at `tokens.ts:700-723`; `ALL_SCENES` (the 20-scene audit list) lives at `src/app/domain/stateMachine.ts:516`.
- `src/app/domain/` — pure logic: `stateMachine.ts` (TRANSITIONS + GATED_ACTIONS), `talonSurface.ts` (voice derivation), `talon.ts`, `disagreement.ts`, `exceptions.ts`, `verification.ts`, `panels.ts`, `microcopy.ts`, `railSystem.ts` + `intents.ts` (**v3 rails — built AND wired, they are the default chrome**), `attention.ts` (attention arbiter), `staging.ts` (staged-action expiry), `commands.ts` (action definitions).
- `src/app/components/` — `SentinelShell.tsx` (the chrome switcher, ~3,867 lines), `rails/` (**v3 — the default**), `shell2/` (**v2 — `?layout=v2` only**), `shell/` (entry surfaces, scenario switcher, ICS-209 debrief, review dock), `panels/` (panel bodies), `kit/` (the obsidian-glass primitive kit — load-bearing, imported by 11 files), `shared/`, `talon/` (mark/session).
  - `ui/` — **archived shadcn tree. 4,639 LOC, zero importers. Do not use; deletion tracked in Sprint 3.**
  - `Navbar.tsx`, `ActionBar.tsx`, and `panels/TalonCopilotPanel.tsx` (72.9 KB) are gated to `chromeVersion === "legacy"` — **they do not render on the default shell.** Do not mistake them for the live UI.
- `src/app/map/` — **see `DECISIONS.md` §4 — the map architecture is OPEN.** Three renderers coexist: `SpatialMapCanvas.tsx` (the 2D default), `components/Map3DExplorer.tsx` + `runtime/` (the 3D EXPLORE world), and `hairline/` (a 1,469-LOC parallel three.js renderer, reachable only by typing `#/hairline-map`). `world/` holds the shared baked data (USGS 3DEP + OSM), which `hairline/` reuses rather than re-authoring. `_archive/` is the dead legacy stack (2,666 LOC, zero importers, currently pinned in place by a `verify-map` check).
- `src/app/pages/` — `ScanPage` (the app), `ComponentsPage`, `DesignSystemPage`, `HairlineMapPage`. Routes in `src/app/routes.ts` (hash router): `/`, `/components`, `/design-system`, `/hairline-map`. **These are 4 routes** — the widely-quoted "23 routes" is the `verify:routes` *combo* count, not a route count.
- `server/` — the live-mode backend: Fastify + WebSocket + SQLite hash-chain + LLM gateway, wired via `session/useScenarioSession.ts`. Driven by `?feed=live`. **Was absent from this map until 2026-10-19**; docs calling it "stubs" or "unwired" are stale.
- `src/styles/` — `theme.css` is a **legacy** shadcn alias layer (cyan aliases pinned to the `tokens.ts` value); `index.css` imports fonts/tailwind/theme/keyboard.
- `scripts/` — the verification gates + world-bake/render tooling.
- `docs/` — see the authority order. `docs/archive/` = journey archive. `DECISIONS.md` at the repo root outranks all of them.
- `verification-artifacts/` — committed gate captures (evidence).

## Current state (2026-10-19, verified on disk at `c07fd36`)

- Built and gated: 20 scenes (16 authored + 4 promoted), two-phase model, TALON session engine, dissent/re-raise, fault-recovery scenes, the 2D spatial map, and the 3D EXPLORE world.
- **Shell chrome: v3 is the default** and has been since commit `6317515`. `?layout=v2` and `?layout=legacy` remain reachable as regression surfaces (owner ruling 2026-10-19). The v3 rail system is **not** "built but unwired" — that claim appeared in six docs and is now `SUPERSEDED`.
- **The map architecture is OPEN** — three renderers coexist and the owner is researching the target direction (FireTracer as reference). See `DECISIONS.md` §4. **Do not start map work until Q1/Q2 are ruled.**
- **All gates green**, re-verified 2026-10-19: typecheck ✅ · `audit:tokens` ✅ (276-warning baseline) · `verify:map` 9/9 ✅ · `verify:machine` 20 scenes / 39 edges / 0 dead ends ✅ · `verify:signals` ✅ · `verify:attention` ✅ · `verify:flows` **25/25** ✅ · `verify:routes` **23/23, 0 need attention** ✅ · `build` ✅.
- Redesign waves P0–P6 landed (see `docs/redesign-2026/05-build-audit-and-design-report.md`). Its "all gates green" note is accurate as of 2026-10-19.

## Known drift / open TODOs

- `docs/sentinel-v2-master-plan/00-…md` — still says "8-stage / 23 routes" (real machine: 20 `SceneId`s / 39 edges / 4 routes). Logged as `SUPERSEDED` in `DECISIONS.md` §5.2.
- Flow-count drift across docs — README says 19, `TEST-PATH.md` says 22, others say 18; the real number is **25**. Logged as `SUPERSEDED` in §6.3.
- `src/styles/theme.css` — legacy shadcn alias layer; neon `#00c8ff` values pinned to the real cyan (2026-09-27); retire the file with the archived tree.
- Retired yellow `#FFD166`: gone from code. (`AGENTS.md` previously claimed `DESIGN.md` §4 still documented it — **it does not**; that drift note is closed.)
- Phase 1 craft leftovers: `gap: 10` drift is gone from active code (2 survivors only in `src/app/map/_archive/`); novel tracking values are 0.
- `audit:tokens`: 276 warnings (273 raw-rgba, 3 exact-token tracking duplicates) — ratchet down over time.
- **Two live fire geometries disagree** (`map/fire/fireModel.ts` vs `map/world/world.ts:181-196`), both drawn by `worldScene.ts`. A correctness risk, not cosmetic — resolve in Sprint 1.
- The 3D EXPLORE scene is **covered by no gate** (only the button's existence is tested). Add coverage in Sprint 1.
- Dead code awaiting deletion (Sprint 3): `components/ui/` (4,639 LOC, zero importers), `map/_archive/` (2,666 LOC, zero importers, pinned by a `verify-map` existence check), `components/figma/ImageWithFallback.tsx` (total orphan), `world.landuse` (baked + shipped, never drawn).
