# AGENTS.md — Sentinel repo guide for AI tools

> Purpose: one entry point so any AI session (Claude Code, Cursor, Figma agents, this designer agent) starts from the same truth. Read this first, then follow the authority order below. Human authors are the owner of this file.

## What this repo is

**FlytBase Sentinel** — a desktop emergency-response command prototype (wildfire initial attack). TALON, an AI copilot, detects/verifies/recommends; a human operator authorizes every consequential action. It is a **scripted portfolio prototype**: no FlytBase API, no fire-trained model, no real dispatch. Two-phase model: **Intelligence** (detect · verify · escalate) → **Operations** (stage · coordinate · supervise).

## Golden rules (do not violate)

1. **Honesty boundary.** TALON is a general LLM behind a permissioned tool layer, never a certified fire model. No invented metrics, success rates, or performance numbers. No "statutory"/"cryptographic authority" claims — receipts are a hash-chained event append; the authority packet is a mutual-aid *draft* the operator sends.
2. **Human authorization is structural.** TALON may not execute gated actions (`GATED_ACTIONS` in `src/app/domain/stateMachine.ts:72`). Staged actions *expire back to watch* — expiry is never execution. Never add a path where silence approves anything.
3. **Tokens are the source of truth.** Use `src/app/tokens.ts` (`space`, `radius`, `typeStyle`, `tracking`, `surface`, `border`, `material`, `tone`, `layer`, `ease`, `motion`). No free-form font sizes, radii, tracking, or component-local shadows. Raw `rgba()`/hex only inside token definitions or map/canvas code.
4. **Keep the gates green.** See Commands. A red gate invalidates portfolio copy that quotes it.
5. **Doc charter.** Every planning doc opens with `canonical | historical | exploratory`. Historical docs are context only — never build from them. Do not add a doc without a status header.
6. **Do not import the archived shadcn tree.** `src/app/components/ui/` is unused compatibility only.

## Authority order (owner ruling 2026-09-14)

1. `PRODUCT.md` — what Sentinel is (identity, users, design principles).
2. **`docs/sentinel-v2-master-plan/00–09` — THE final build plan** (owner ruling, 2026-09-14). `00` is the index/thesis; `03` is the state machine; `08` is the phase roadmap; `09` is the TALON mark spec. Its `original-specs/` folder is verbatim source history — read for context, never build from it directly.
3. `PORTFOLIO-DIRECTION.md` — portfolio scope/strategy for this repo. (Note: its §2 line naming `SENTINEL-V2-MASTER-SPEC.md` as product authority predates the ruling above — the vault wins.)
4. **`sentinel-core/00–06` — the product/visual core** (owner ruling 2026-09-30): `01` product core + data model, `02` TALON identity, `03` visual language + container system, `04` iconography, `05` map world, `06` command deck. Wins over all other docs for product/visual decisions; a change lands here first (numbered dated amendment), then in code.
5. `DESIGN.md` + `src/app/tokens.ts` — design system (doc + code).
6. `HANDOFF-2026-10-07.md` — latest session handoff: v3 rail system built but NOT yet wired (next session starts there; resume checklist inside). Its "what's NOT built" list can go stale — verify against disk (`git status` / `ls`) before trusting it.
7. `docs/archive/` — **the journey archive**: every superseded planner generation (`sentinel-ai-upgrade/`, `SENTINEL-V2-MASTER-SPEC.md`, `sentinel-flagship-quality-upgrade.md`, `sentinel-talon-backend-scenario-master-plan.md`) plus the old case-study drafts (`old-case-studies/`). Historical context and case-study material only — never build from it.

The earlier "open conflict" between the flagship plan and this repo's direction docs was resolved by the 2026-09-14 ruling: the vault `00–09` is the final build plan; everything else was sidelined to `docs/archive/`.

## Commands

```bash
npm install
npm run dev                 # dev server (vite, base /embed/sentinel/)
npm run build               # production build → dist/
npm run preview -- --port 4190   # serve dist for the browser gates
npm run verify:design       # typecheck + audit:tokens + verify:map   (static, always runnable)
npm run verify:flows        # 19 browser flows (needs the server above)
npm run verify:routes       # 23 scene/view combos + a11y + console (needs the server)
npm run verify:machine      # state-machine integrity (static)
npm run verify:signals      # telemetry signal integrity (static)
npm run verify:attention     # attention-arbiter contract checks (static)
npm run tokens:css          # regenerate src/styles/tokens.css from tokens.ts
npm run check               # verify:design + verify:flows
```

**Server-gate gotcha:** `verify:flows` / `verify:routes` default to `http://127.0.0.1:4190/embed/sentinel/`, but `vite preview` may bind IPv6-only (`[::1]`). If you get `ERR_CONNECTION_REFUSED`, run with:
`$env:SENTINEL_VERIFY_URL='http://localhost:4190/embed/sentinel/'` (PowerShell).

## Repo map

- `src/app/tokens.ts` — design tokens + shared types (the contract). `SceneId` union + `ALL_SCENES` (the 20-scene audit list) live in `src/app/domain/stateMachine.ts:510`.
- `src/app/domain/` — pure logic: `stateMachine.ts` (TRANSITIONS + GATED_ACTIONS), `talonSurface.ts` (voice derivation), `talon.ts`, `disagreement.ts`, `exceptions.ts`, `verification.ts`, `panels.ts`, `microcopy.ts`, `railSystem.ts` + `intents.ts` (v3 rails — built, see HANDOFF).
- `src/app/components/` — `shell/` (SentinelShell = the v2/legacy chrome switcher), `rails/` (v3 RailSystem + panels — built, NOT wired into the shell yet), `panels/`, `shared/`, `talon/` (mark/session). `ui/` = archived, do not use.
- `src/app/map/` — SpatialMapCanvas + `world/` data; `hairline/` = separate hairline-rendition module (spec `docs/redesign-2026/14-hairline-map-style-spec.md`; reuses world DATA, never re-authors it); `render/`, `runtime/`, `frame.ts`, `roads.ts`, `zones.ts`; `_archive/` = old map stack.
- `src/app/pages/` — `ScanPage` (the app), `ComponentsPage`, `DesignSystemPage`, `HairlineMapPage`. Routes in `src/app/routes.ts` (hash router): `/`, `/components`, `/design-system`, `/hairline-map`.
- `src/styles/` — `theme.css` is a **legacy** shadcn alias layer (cyan aliases pinned to the `tokens.ts` value); `index.css` imports fonts/tailwind/theme/keyboard.
- `scripts/` — the verification gates + world-bake/render tooling.
- `docs/` — see the authority order. `docs/archive/` = journey archive.
- `verification-artifacts/` — committed gate captures (evidence).

## Current state (2026-10)

- Built: 20 scenes (16 authored + 4 promoted), two-phase model, TALON session engine, dissent/re-raise, fault-recovery scenes, spatial map (2D SVG + 3D EXPLORE), hairline-rendition module (`/hairline-map` route live).
- Shell chrome: default is v2 (`?layout=v2` swaps chrome; `?layout=legacy` pre-promotion fallback). The v3 rail system (`components/rails/`, `domain/railSystem.ts` + `intents.ts`) compiles clean but is **not wired into SentinelShell** — the shell still renders v2 chrome. Wire per `HANDOFF-2026-10-07.md` / `docs/redesign-2026/14-rail-system-v3-handoff-and-build-plan.md` §3.2.
- Gates (static, re-verified 2026-10-11): typecheck ✅, `verify:design` (tokens 276-warning baseline, map 9/9) ✅, machine 20 scenes/39 edges ✅, signals ✅, attention ✅. Browser gates (`verify:flows`, `verify:routes`) need a live server — re-run to refresh (last green 22/22 flows, 23/23 routes).
- Redesign waves P0–P6 done (see `docs/redesign-2026/05-build-audit-and-design-report.md`). Hairline map direction ratified 2026-10-07 (`15-session-record` — its "not written" items like `/hairline-map` are now on disk; verify on disk before trusting it).

## Known drift / open TODOs

- `docs/sentinel-v2-master-plan/00-…md` — still says "8-stage / 23 routes" (real machine: 20 `SceneId`s / 39 edges).
- `src/styles/theme.css` — legacy shadcn alias layer; neon `#00c8ff` values pinned to the real cyan (2026-09-27); retire the file with the archived tree.
- Retired yellow `#FFD166`: gone from code (`TalonCopilotPanel.tsx` now uses `T.amber`; `mockData.ts` has no instance); `DESIGN.md` §4 still documents it.
- Phase 1 craft leftovers: `gap: 10` drift is gone from active code (2 survivors only in `src/app/map/_archive/`); novel tracking values are 0.
- `audit:tokens`: 276 warnings (273 raw-rgba, 3 exact-token tracking duplicates) — ratchet down over time.
