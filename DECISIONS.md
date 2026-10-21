# DECISIONS.md — the decision register

> **This file is the kill protocol.** Every locked direction in this repo is listed here with exactly one status.
> A decision may not be changed without adding an entry that marks the old one `SUPERSEDED`.
>
> Status vocabulary: `ACTIVE` (build from it) · `SUPERSEDED` (replaced, read for context only) · `REJECTED` (discarded, never build from it) · `OPEN` (undecided — **do not build either way until the owner rules**).
>
> Rule of precedence: **this file outranks every other doc** when two docs disagree. If a doc contradicts this register, this register wins and the doc is stale.
>
> Maintained by: owner rulings + agent verification. Last verified against code: **2026-10-19** at `c07fd36`.

---

## How to use this file

- **Starting a build?** Read the `ACTIVE` entries for that section. Ignore everything else.
- **About to change a direction?** Add the new entry *first*, mark the old one `SUPERSEDED`, then build.
- **Found a doc that disagrees with this file?** The doc is stale. Fix or archive the doc — do not silently build from it.
- **Found a decision nobody remembers making?** It belongs here, not in a session file.

---

## 1. Product identity — ACTIVE

| # | Decision | Status | Date | Note |
|---|---|---|---|---|
| 1.1 | Sentinel is a **scripted portfolio prototype** for wildfire initial attack. No FlytBase API, no fire-trained model, no real dispatch. | ACTIVE | — | `PRODUCT.md` |
| 1.2 | Two-phase model: **Intelligence** (detect · verify · escalate) → **Operations** (stage · coordinate · supervise) | ACTIVE | — | `PRODUCT.md`, `sentinel-core/01` |
| 1.3 | **Honesty boundary — expressed as provenance, not as a disclaimer of capability.** No value may be presented as *measured* unless it was. Every surface that renders a fire, weather, or detection metric must state its basis: **measured** (from a real feed), **modeled** (computed by a named model — e.g. Rothermel 1974 — with its inputs shown), or **authored** (a scripted placeholder). No invented success rates or performance numbers. No "statutory"/"cryptographic authority" claims — receipts are a hash-chained event append, and the authority packet is a mutual-aid *draft* the operator sends. | ACTIVE | 2026-10-21 | **Replaces** the earlier "TALON is a general LLM behind a permissioned tool layer, never a certified fire model". That phrasing denied the product's intent, and denial-by-disclaimer is weaker than labelling: a viewer who is told the product is capable but the prototype is not learns more than one told the product is incapable. See 1.6. Guard is now *labelling*, not *disclaiming* |
| 1.6 | **TALON's product role includes fire-behaviour analysis.** TALON is intended to ingest weather (RAWS/NDFC) and on-scene data, compute spread probability, and advise on evacuation and on whether to escalate to authorities. The model is built by AI engineers — the designer's responsibility is the **operator↔AI interaction contract**, not the model. | ACTIVE | 2026-10-21 | Owner ruling. The prototype ships a scripted stand-in; the product direction is a fire-analysis copilot. Makes `map-overhaul-prd.md` §5 consistent with the product vision |
| 1.4 | **Human authorization is structural.** TALON may not execute `GATED_ACTIONS` (`src/app/domain/stateMachine.ts:72`). Staged actions expire back to watch — expiry is never execution. No path where silence approves anything. | ACTIVE | — | `AGENTS.md` golden rule 2. Verified by `verify:flows` |
| 1.5 | **Tokens are the source of truth** (`src/app/tokens.ts`). No free-form font sizes, radii, tracking, or component-local shadows. | ACTIVE | — | `AGENTS.md` golden rule 3, enforced by `audit:tokens` |

## 2. Visual language — ACTIVE

| # | Decision | Status | Date | Note |
|---|---|---|---|---|
| 2.1 | **3-lead palette.** Retire yellow. Semantic hues: cyan = TALON, amber = degraded, red = danger, teal = confirmed. | ACTIVE | 2026-10 | Locked in `.zcode/plans/plan-sess_449d26cb…`; `T.amber` replaced `#FFD166` in code |
| 2.2 | **Fire-orange is reserved for the fire layer only** — it never appears as UI chrome. | ACTIVE | 2026-10 | Same plan; prevents the fire from competing with the alert language |
| 2.3 | Obsidian-glass materials with semantic hues kept | ACTIVE | 2026-10 | Locked in `.zcode/plans/plan-sess_fa14ea0c…` |
| 2.4 | **Warm console direction** ("vivid terrain under a warm console") | **REJECTED** | 2026-09-30 | Owner rejected. `sentinel-core/03-visual-language.md` is headed `SUPERSEDED`. **Never build from it.** See 2.5 |
| 2.5 | `sentinel-core/03` is **excluded** from the `sentinel-core/00–06` authority band | ACTIVE | 2026-10-19 | Added because `AGENTS.md` ranked a REJECTED doc as canonical. `sentinel-core/05` inherits `03`'s rejected "warm console" premise — treat `05`'s colour claims with suspicion |

## 3. Shell chrome — ACTIVE (v3 promoted)

| # | Decision | Status | Date | Note |
|---|---|---|---|---|
| 3.1 | **v3 chrome is the default.** `RailSystem` + `BottomNav` render by default (`SentinelShell.tsx:187-190`, `:1321-1370`). | ACTIVE | commit `6317515` | **Verified on disk 2026-10-19.** Six docs still claim the opposite — they are stale |
| 3.2 | `?layout=v2` and `?layout=legacy` remain reachable as regression surfaces | ACTIVE | 2026-10-19 | Owner ruling 2026-10-19: keep both behind flags, decide in Sprint 4 |
| 3.3 | v2 chrome as default | SUPERSEDED | commit `6317515` | Replaced by 3.1 |
| 3.4 | Legacy chrome (pre-promotion rail stack) | SUPERSEDED | unknown | Still reachable at `?layout=legacy` per 3.2. Not a design target |

**Known non-obvious consequence of 3.1** — components that look core but are **not** rendered on the default shell:

| Component | LOC | Rendered on v3? | Evidence |
|---|---:|---|---|
| `components/Navbar.tsx` | 31.4 KB | **No** | gated `chromeVersion === "legacy"` (`:1196`) |
| `components/ActionBar.tsx` | 34.2 KB | **No** | gated `chromeVersion === "legacy"` (`:1424`) |
| `components/panels/TalonCopilotPanel.tsx` | **72.9 KB** | **No** | its render at `:1038` lives in `rightViews`, consumed only by legacy `:1417`. v3 uses `rails/panels.tsx` → `TalonSession` |

**This is why the repo feels "unfinished": the most-polished surface is on the non-default path.** Do not mistake `TalonCopilotPanel` for the live TALON UI.

## 4. Map architecture — **RULED 2026-10-21. Build from `SPEC.md` §1.1.**

> The section is no longer open. The owner ruled on 2026-10-21 after studying the FireTrace reference. **The build contract is `SPEC.md` §1.1** — one world model, three fidelities, a degradation ladder, day and night.

| # | Decision | Status | Date | Note |
|---|---|---|---|---|
| 4.1 | **One world model, three fidelities.** A single world (DEM, roads, structures, vegetation, fire, assets) behind one coordinate law, rendered at three fidelities: **Tier 3** the top-down 2D world model (always on, the substrate and the fallback), **Tier 1** the drone EO camera, **Tier 2** the drone IR camera. Switching is a *fidelity* switch, not a view switch. | **ACTIVE** | 2026-10-21 | Owner ruling. Replaces the three-renderer state. Full spec: `SPEC.md` §1.1 |
| 4.2 | **Hairline is dead.** `map/hairline/` (1,469 LOC, parallel three.js renderer, URL-only, no gate, docs contradicting themselves three ways) is deleted. Its correct reuse of world *data* is preserved; the duplicated *render* code is not. | **ACTIVE** | 2026-10-21 | Owner ruling on Q2. Deletion is Sprint 0 alongside the `verify-map` `archive-present` check retirement |
| 4.2b | **The degradation ladder is a designed state, not an error.** When smoke degrades the EO feed the operator steps EO → IR → world model, with the tier always visible and every transition logged. The operator never loses the world because the feed died. | **ACTIVE** | 2026-10-21 | The product's differentiator. This is a design decision, not a rendering fallback — it belongs in the case study |
| 4.2c | **Day and night are both supported.** The world carries a scene state (sun/ambient/visibility); the scenario runs at **night**. FireTrace is a day product and is the reference for the *day* treatment only. | **ACTIVE** | 2026-10-21 | A lighting state, not a theme swap |
| 4.2d | **The 2D basemap is rendered from the data, not from a PNG.** `src/assets/sentinel-map-overhaul.png` (3.4 MB) is deleted. The 2D surface renders elevation, vegetation, roads, and structures from the baked world. | **ACTIVE** | 2026-10-21 | Removes the still-image basemap that pixelates on zoom and cannot carry live state |
| 4.2e | **Cartographic furniture is required** — graticule with degree-minute labels, compass, live scale bar, terrain features labelled with elevation, attribution. None of it exists today. | **ACTIVE** | 2026-10-21 | The map's authority comes from this, not from the terrain shader |
| 4.3 | Roads as a **first-class data layer**, generating entry and escape routes directly on the map | **ACTIVE — pending 4.1 implementation** | 2026-10-19 | Owner requirement. Specified in `SPEC.md` §1.1 M5 as three states: active egress / standby / compromised |
| 4.4 | Default 2D basemap is a **3.5 MB PNG** (`src/assets/sentinel-map-overhaul.png`), not the baked world data | **SUPERSEDED — being fixed** | 2026-10-21 | Was a recorded defect. 4.2d removes it |
| 4.5 | Two live, **disagreeing fire geometries**: `map/fire/fireModel.ts` (`FIRE.isochrones`) and `map/world/world.ts:181-196` (`world.fire.band`), both drawn by `worldScene.ts` | **SUPERSEDED — being fixed** | 2026-10-21 | Correctness risk, not cosmetic. `SPEC.md` §1.1 M1 reconciles them into one model in the world |
| 4.6 | World location: **Encinal Canyon, Malibu CA**, from USGS 3DEP relief + OSM buildings/roads | ACTIVE | — | Commits `a0ad5c1`, `58365d9`, `84f0e0f` |
| 4.7 | Hairline reuses world **DATA** and never re-authors geography | **SUPERSEDED** | 2026-10-21 | Was true and worth keeping as a principle; the module is deleted by 4.2. The principle survives: the world model is the only geography source |
| 4.8 | **The 3D scene gets gate coverage.** It is covered by no gate today — only the button's existence is tested. | **ACTIVE — pending** | 2026-10-21 | `SPEC.md` §1.1 M12. Supersedes the 6.4 defect once landed |
| 4.9 | **Performance budget is a number, stated before Sprint 1** — draw calls, triangles, frame time, idle state. Baseline to beat: 19/19 draws · 188K tris · 0 FPS idle. | **ACTIVE — pending** | 2026-10-21 | `SPEC.md` §1.1 M11. A sprint must not silently blow it |

## 5. Data model — ACTIVE

| # | Decision | Status | Date | Note |
|---|---|---|---|---|
| 5.1 | 20 `SceneId` values, 39 transitions, 4 gated actions | ACTIVE (fact) | — | `tokens.ts:700-723`, `stateMachine.ts:110-445`, `:72-77`. **Verified 2026-10-19** |
| 5.2 | "8-stage lifecycle, 23 routes" | SUPERSEDED | 2026-09 | `docs/sentinel-v2-master-plan/00:20,91`. `23` is the `verify:routes` **combo** count, misread as a route count. Real: 20 scenes / 39 edges / 4 hash routes |
| 5.3 | 4 scenes marked "NEW — not yet in code" | SUPERSEDED | 2026-09 | `vault/03:83-96`. All four shipped (`verify-source-conflict`, `contain-awaiting-teams`, `rescue-partial-evac`, `handoff-pending`) |
| 5.4 | Staged actions expire back to watch; expiry is never execution | ACTIVE | — | `domain/staging.ts`. Verified by `verify:flows` ("staged recommendation expires back to watch") |
| 5.5 | Attention arbiter: one pop, runner-ups become badges, routine stays in the log | ACTIVE | — | `domain/attention.ts`, 19 contract checks in `verify:attention` |

## 6. Verification rig — ACTIVE

| # | Decision | Status | Date | Note |
|---|---|---|---|---|
| 6.1 | Gates must be green before any portfolio claim is made about the build | ACTIVE | — | `AGENTS.md` golden rule 4 |
| 6.2 | Full suite, re-verified **2026-10-19** at `c07fd36`: typecheck ✅ · `audit:tokens` ✅ (276 warnings baseline) · `verify:map` 9/9 ✅ · `verify:machine` 20 scenes/39 edges/0 dead ends ✅ · `verify:signals` ✅ · `verify:attention` ✅ · `verify:flows` **25/25** ✅ · `verify:routes` **23/23, 0 attention** ✅ · `build` ✅ | ACTIVE | 2026-10-19 | This is the project's real safety net and it is already built. Every sprint ends green here |
| 6.3 | "19 browser flows" / "22 flows" | SUPERSEDED | 2026-10-19 | Reality is **25**. Three different numbers appear across the docs; all stale |
| 6.4 | 3D EXPLORE scene is **covered by no gate** — only the button's existence is tested | ACTIVE (defect) | 2026-10-19 | Add a gate in Sprint 1 |

## 7. Repo hygiene — ACTIVE

| # | Decision | Status | Date | Note |
|---|---|---|---|---|
| 7.1 | Every planning doc opens with `canonical \| historical \| exploratory` | ACTIVE | — | `AGENTS.md` golden rule 5. **24 of 78 docs violated this; remediation in progress** |
| 7.2 | Do not import the archived shadcn tree (`src/app/components/ui/`) | ACTIVE | — | Now stronger: **zero importers, 4,639 LOC fully dead.** Verified 2026-10-19. Deletion = Sprint 3 |
| 7.3 | `src/app/map/_archive/` is dead (2,666 LOC, zero importers) | ACTIVE (fact) | — | Pinned in place by `scripts/verify-map.mjs:35-41` (`archive-present` check). Deletion requires retiring that check first — Sprint 3 |
| 7.4 | `components/figma/ImageWithFallback.tsx` | ACTIVE (defect) | — | Total orphan: no importer, and zero mentions in any `.md` in the repo |
| 7.5 | `docs/archive/` is the journey archive | ACTIVE | — | **This directory did not exist.** Created 2026-10-19. Previously referenced by `AGENTS.md` tier 7 and a live link in `README.md:64` — both were broken |
| 7.6 | Deck height is **88px** (`DECK_HEIGHT`) | ACTIVE (fact) | — | `sentinel-core/06:33` and `redesign-2026/15:14` say 96px — stale |
| 7.7 | Bottom deck renders a **64px TALON orb** | ACTIVE (fact) | — | `redesign-2026/14-final-layout-spec.md:55` says the orb was "deleted" — contradicted by `BottomNav.tsx:160-165` |

## 8. Not built / deferred — do not assume these exist

| # | Item | Status | Note |
|---|---|---|---|
| 8.1 | Tablet recomposition (rails → bottom sheets) | **DEFERRED** | Named in `PRODUCT.md:70`, `sentinel-core/01`, `13:39`. Never built. All docs say deferred |
| 8.2 | FLIR PiP / IR-Ironbow / IR-White-hot | **NOT BUILT** | Spec'd in `14-final-layout-spec.md:19`; `15-data-placement-matrix` marks `[NEXT]`. Zero matches in `src/`. `14-final-layout-spec.md` presents it as current — that doc overstates |
| 8.3 | `post-incident-review`, `scenario-select` scenes | **NOT BUILT** | `vault/03:97,99`. Honestly labelled |
| 8.4 | Debrief replay scrub | **NOT BUILT** | `15:35` marks `[NEXT]` |
| 8.5 | Live server session maturity | **ACTIVE, undersold** | `server/` = 10 files, Fastify + WebSocket + SQLite hash-chain + LLM gateway, wired at `SentinelShell:51,864`. Docs calling it "stubs"/"unwired" are **SUPERSEDED**. Committed 49 KB `sentinel-demo.db` is undocumented |

---

## Open items requiring an owner ruling

Ordered by how much work they block.

| # | Question | Blocks | Owner ruling |
|---|---|---|---|
| Q6 | **Where does TALON live?** The centre-bottom TALON bay is the current ruling (`sentinel-core/06`, confirmed by `redesign-2026/15`), but the owner has rejected it in the redesign brief: *"why is TALON still the central bottom."* The `14-final-layout-spec` position (TALON in the right console, no centre object) was reversed by `core/06` and is available again. The FireTrace reference puts the agent in a right console with the map dominant. | Layout rework (SPEC §2) | **OPEN — awaiting owner ruling.** Three live candidates: (a) centre bay as now, (b) right console only, no centre object, (c) bay as a quiet status echo with the console carrying the voice. `verify:docs` fails if this question is not recorded here |
| Q7 | **Typography.** `DESIGN.md` §5 and `tokens.ts` both specify IBM Plex Sans + JetBrains Mono. The redesign brief calls for "better fonts." The current scale (26/18/15/14/12/11/10/32) and the optical tracking law are sound and can survive a family swap; the families themselves are the open question. | Design system rework (SPEC §6) | **OPEN** — needs a family ruling before tokens are rewritten |
| Q1 | Which map renderer survives — rebuild fresh against a FireTracer reference, promote hairline, or keep the 2D canvas? | **Sprint 0** | **RULED 2026-10-21 — rebuild the map module fresh, in-repo.** One world model, three fidelities. `SPEC.md` §1.1 |
| Q2 | Is the hairline module the future of the map, or a dead experiment? | Sprint 0 | **RULED 2026-10-21 — dead experiment.** Delete the render code; keep its correct reuse of world data |
| Q3 | Delete `v2` + `legacy` chrome, or keep both behind flags? | Sprint 2 (deferred to Sprint 4) | **keep both behind flags** (2026-10-19) |
| Q4 | Which sections need genuine redesign vs. are fine once the duplicates are gone? | Sprint 4 | pending — the section interview |
| Q5 | Are `docs/case-study-research/` + `docs/portfolio-case-study/` portfolio deliverables, or archive material? | archive hygiene | pending |
