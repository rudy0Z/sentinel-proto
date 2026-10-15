# Sentinel 2026 Redesign — Validation & Direction

> **status: exploratory** — research pass, 2026-09-27. This doc audits the vault plan, the current build, and the untracked redesign specs. It is input for an owner decision, **not** a ruling. The authority order in `AGENTS.md` is untouched: vault `00–09` remains the final build plan, and nothing here overrides the golden rules (honesty boundary · human authorization · tokens are the source of truth · keep the gates green · doc charter).

**Evidence base for every claim below:** full reads of vault 00–10 plus the untracked research set; a full `src/`+`scripts/`+`server/` build audit; gates run this session — typecheck ✓, `audit:tokens` 246-warning baseline, `verify:map` 9/9, machine + signals audits, production build ✓, `verify:flows` 19/19, `verify:routes` 23/23; inventory of the local component vault (`D:\Design Tools\Ui kits and components`); extraction of the AI-trust playbook (`D:\Downloads\Mobile Devices\pdfs\extracted_content.md`); evaluation of ~38 web UI resources from the owner's reference set.

---

## 1. TL;DR

1. **The vault plan (00–09) is sound.** Its load-bearing decisions — LLM-behind-a-constitution, three-tier human authorization, expiry-never-execution, derived voice, no-canvas-stacking, token discipline — are coherent, buildable, and differentiate the portfolio story. One constitutional rule is currently **unimplemented** (staged-action expiry), and several counts are stale.
2. **The new `10-EXECUTIVE-DESIGN-AUDIT-AND-2026-REDESIGN-SPEC.md` has the right diagnosis and four wrong prescriptions.** Every forensic bug it cites is verified real in code. But its new hex palette, canvas/GLSL shader orb, invented state names, and self-granted authority conflict with canonical docs 09/tokens/AGENTS.md. Verdict: **salvage the diagnosis and telemetry/geometry pillars; do not adopt as written.**
3. **The build is healthier than doc 10 claims** (all 7 gates green, including two browser suites), but TALON is currently **read-only** — it cannot drive the dashboard at all. The single-source `deriveTalonSurface()` is the crown jewel; the missing layers are (a) a *visible* thinking pipeline (tool-call trace, provenance, confidence) and (b) a *permissioned UI-intent* mechanism so TALON can propose information states without ever touching furniture or gates.
4. **The trust playbook maps cleanly onto TALON** — 15 distilled principles produce a concrete UI requirement set (§5), almost all of which are absent today.
5. **The local component vault is a goldmine** (85 repos, 4,386 catalogued components, its own MCP server) and already contains the best resources from the screenshots (AI-Elements mirrors, ElevenLabs UI, kibo, microcharts, thinking-orbs, bloub, amicro, prompt-kit). A curated adopt-list with licenses is in §6.

---

## 2. Vault decisions 00–09 — decision ledger

| # | Decision | Source | Verdict | Notes |
|---|----------|--------|---------|-------|
| 1 | LLM strapped to a constitution: state machine validates every proposal; hijacked model = "an odd sentence in the chat log" | 00:74–84, 04:15–31 | **Sound — keep** | The core differentiator. Server truth-guard (`server/`) + `scripts/eval-talon.mjs` already enforce it. |
| 2 | Three-tier HITL: Class 1 telemetry / Class 2 staged / Class 3 2-second hold | 04:36–46 | **Sound — keep** | Maps 1:1 to the trust playbook's Consequence Ladder (§5). |
| 3 | Staged actions **expire back to watch; expiry is never execution** | 04:40–45; AGENTS.md rule 2 | **Sound — but UNIMPLEMENTED** | `grep -rni expir src/app` → 0 hits. No timeout, no `expiresAt`, nothing. See §4 gap G1. |
| 4 | Tactical Hybrid Core orb + 8 token-locked postures (aperture blades close on HOLD) | 09:67–107 | **Sound — keep** | Semantically literate (a "Siri blob" cannot show gates/lockouts). Evolve, don't replace. |
| 5 | No canvas stacking; perf budgets not fps claims (idle 0% GPU, ≤12 draw calls) | 09:113–122, 02:39–46 | **Sound — keep** | Enforced today by `phase2-drawcount.mjs` (≤19 budget in overlays3d). |
| 6 | Tokens are the source of truth | AGENTS.md rule 3 | **Sound — keep, tighten** | Needs CSS-var emission + semantic roles to survive a redesign (§7 W1). |
| 7 | Derived voice single-source: `deriveTalonSurface()` drives orb, pitch, chips | 04:17; talonSurface.ts:174–283 | **Sound — the crown jewel** | Any attention-tier/motion system must derive from the same function. |
| 8 | Drag = staging, never execution | 02:124–140; droneDispatch.ts | **Sound — implemented** | `droneDispatch.ts` returns a pure proposal; no gate bypass. |
| 9 | Hash-chained receipts; authority packet is a draft TALON never sends | 01:121–124, 04:151 | **Sound — keep** | Server ledger + packet fixture honest. |
| 10 | Anti-nagging + Rule of One + bidirectional dissent with re-raise | 04:59–63, 03:136–153 | **Sound — keep** | Flows cover it; `disagreement.ts` is real. |
| 11 | 2D SVG ops map + 3D EXPLORE sharing one coordinate law | 02:22–94 | **Sound — keep** | Genuinely coherent architecture; doc 10 Pillar 1 overstates the fix needed. |
| 12 | Backend: Fastify WS + SQLite event store, shared TRANSITIONS | 04:71–105 | **Sound — built ahead of plan** | `server/` exists untracked with truth guard; client `session/` hook not yet wired. |
| 13 | Five-tool TALON surface (`read_scene_state`, `read_evidence`, `propose_transition`, `recompute_plan`, `draft_authority_packet`) | 04:113–161 | **Sound — keep** | This is exactly the permissioned-intent pattern the redesign needs (§5). |

**Stale counts (fix, don't redesign around):** doc 00:20/:91 "8-stage / 23 routes" (23 is actually the `verify:routes` combo count); doc 03:83–97 marks 4 promoted scenes "planned, not yet in code" while `stateMachine.ts:340–400` and `tokens.ts:559–563` implement them; README "16 states"; AGENTS.md "16 scenes / ~31 edges". Reality: **20 SceneIds, 39 TRANSITIONS** (matches the Flow Atlas' machine-extracted 97 nodes / 117 edges / 39 transitions).

---

## 3. Doc 10 (untracked redesign spec) — validation

**Diagnosis: correct, keep all of it.** Verified in code:
- 2D backdrop swaps to an oblique render while flat SVG zone polygons (authored for top-down space, `mockData.ts:194`) keep screen-space Y — zones fly into the sky (`SpatialMapCanvas.tsx:246–250`).
- `ZONE_LIFT_M = 4` with sparse vertices, no DEM clamping/densification (`overlays3d.ts:68`).
- TALON mark is a 28px SVG in a 60×60 squircle (`TalonSession.tsx:519,540,563`).
- 8px rounded "candy-bar" telemetry in `PanelViz.tsx`; multi-accent color sprawl.

**Prescriptions: conflicted — revise before adopting.**

| Doc 10 proposal | Conflict | Ruling recommendation |
|---|---|---|
| New palette `#00E5FF/#FF9F0A/#FF3B30` | `tokens.ts:16–20` canonical (`#1CB8E6/#F5A623/#E5533C/#2DD4A0`) | Direction (60-30-10, color-as-resource) is right. If hexes change, it's a **token revision pass** (owner decision), never literals. |
| Replace orb with 48px canvas/GLSL shader sphere | Doc 09's post-mortem explicitly bans canvas stacking; 8-posture vocabulary is semantic (gates/lockouts) | **Evolve the Tactical Hybrid Core** (richer aperture, depth via CSS/SVG, optional 3D-orb confined to EXPLORE scene). |
| New state names `IDLE_MONITORING`/`ANALYZING_BREACH`/`EXECUTING_INTERVENTION` | Locked 8-posture vocabulary from `deriveTalonSurface()` | Map every new visual to existing postures. |
| Auto 2D→3D transition at `contain-recommended` | Breaks the one-dataset/two-renderer law and the 2D interaction model | Spike behind a flag; simpler fix first: never put an oblique render under 2D vector space. |
| "Approved by Head of Product", invented live telemetry (`[LINK: 12ms]`), Palantir/Anduril parity claims, **no status header** | Golden rule 1 (honesty) + rule 5 (doc charter) | Add `> status: exploratory` header, strip authority cosplay and invented numbers before this doc is ever shown alongside the portfolio. |

**Salvage list (adopt):** concentric radius law (`R_outer = R_inner + padding`) as tokens; hairline 2px gauges; 24-column barcode histograms; 24-segment radial arc gauges; 7×12 heatmaps; tool-call DAG in the copilot panel; terrain-clamped densified 3D ribbons (already planned in doc 02 — this is alignment, not new scope).

---

## 4. Build vs plan — drift and gaps

All gates green (see header), so this is drift, not breakage:

- **G1 — Staged-action expiry unimplemented (structural).** Constitution and AGENTS.md promise "expire back to watch; expiry is logged; expiry is never execution." Zero expiry code exists. Either implement (recommended: staged command carries `expiresAt`; on expiry → staged chip dissolves, event appended to log, orb returns to `watching` posture) or formally re-scope the rule. This is the #1 honesty-adjacent gap in the product story.
- **G2 — Audit blind spot.** `ALL_SCENES` (`stateMachine.ts:491–508`) lists only 16 of 20 SceneIds → `auditMachine()` never checks the 4 promoted scenes. One-line-class fix with real integrity value.
- **G3 — Promoted states are shallow.** TALON chips (talon.ts:68–85), per-scene recommendations (892–981) and verification fixtures (verification.ts:76–88) cover 16 scenes; the 4 promoted states render generic "Standby" copy. Designed states with placeholder depth.
- **G4 — GATED_ACTIONS home.** Docs say `stateMachine.ts`; actually exported from `talon.ts:46`. Re-export or update docs.
- **G5 — Two sources of truth for CSS.** `theme.css` still carries retired neon `rgba(0,200,255,…)`; `DesignSystemPage.tsx` documents a "yellow" whose value is cyan and a wrong metric spec. Tokens have no CSS-var emission.
- **G6 — Dead weight.** 45-file archived `ui/` tree; `recharts` referenced only by dead `ui/chart.tsx`; `motion` 12 installed but imported **zero** times. Cross-file keyframe-name coupling (`fadeIn` defined in SentinelShell's injected `<style>`, consumed in EntrySurfaces) silently no-ops if the host changes.
- **G7 — God files.** SentinelShell 3,734 lines (with an injected `<style>` block), TalonCopilotPanel 1,756 lines / 219 inline style blocks, ActionModal 1,464 lines / 42 raw rgba. Any redesign fights these.
- **G8 — Bundle.** ScanPage chunk 2.06 MB (546 KB gzip) — the 3D world; code-split EXPLORE behind a dynamic import when convenient.
- **G9 — Backend ahead of UI.** `server/` (Fastify WS, SQLite hash-chained ledger, truth guard, eval harness) and `src/app/session/useScenarioSession.ts` are complete but **unwired** — the "live backend" story has no UI consumer yet.

---

## 5. TALON thinking pipeline — from trust framework to UI spec

Source: `D:\Downloads\Mobile Devices\pdfs\extracted_content.md` (Sudhir Mishra's playbook: Agentic Design, Conversational AI patterns, Responsible AI ×2, Systems Thinking). 15 distilled principles; the ones that bind the redesign:

1. **Calibrated trust is the design goal** — not maximum trust. Confidence badges exist to *prevent over-reliance*.
2. **Autonomy calibrates to consequence, not capability** — Level 2 "AI suggests, human decides" is TALON's contract; declare the agency level *per action*, not globally.
3. **The Golden Rule: visibility & control scale with consequence** (5-level Consequence Ladder; L5 = human executes, AI assists only).
4. **Variable friction** — instant for routine reads, deliberate friction (modal, hold, preview) for consequential ones. The existing 2-second hold *is* this principle; make it visible as such.
5. **Trust Architecture: reasoning + confidence + sources on every claim** — High/Moderate/Review-Needed badges; citation chips linked to the actual sensor row.
6. **5-Question checklist per action**: What will it do? Why? What data is it using? Does the user confirm? Can the user undo?
7. **Plan-Explain-Approve-Execute** with pre-execution preview (diff-style) for high-risk operations.
8. **Human Control Spectrum**: AI suggests → human reviews → AI executes → undo/escalation/handoff. Draft is *not* sent until a human acts.
9. **L5 mandate**: at the highest stakes the human's hand pushes the button (already structural in Sentinel — keep it that way).
10. **Written authority allocation** — publish the AI-Decides / AI-Recommends-Human-Approves / Human-Decides matrix.
11. **Escalation + uncertainty routing are mandatory** — low confidence auto-routes to human review *with the reasoning trace attached*.
12. **Accountability = named human + immutable audit trail** (receipts already hash-chained — surface them).
13. **Pre-launch audit gate**: bias, privacy/RBAC, citations, authorization gates, graceful fallbacks, reversibility, drift telemetry — maps directly onto the eval harness (`scripts/eval-talon.mjs`) + gates.
14. **Bounded autonomy + graceful degradation + error honesty** — name the failed feed, state what's preserved, offer the fallback (the `AI DEGRADED` authored-copy path from doc 07 must become *visible*, not silent).
15. **Make uncertainty, approval, and recovery visible** — the manifesto line. Show working states, approval cards, refusal/abstention states, undo, activity log.

### Current state vs that bar

**Already strong:** single-source derived surface (`deriveTalonSurface()` → orb posture, voice, gate label — the orb literally cannot lie); 8-state TalonMark with talon.css state engine + reduced-motion; gated-action modality; dissent/re-raise; hash-chained receipts; server-side truth guard that rejects hallucinated execution claims; eval harness for adversarial prompts.

**Missing (each maps to a principle):**

| # | TALON thinking-pipeline UI requirement | Principle | Pattern sources (already local in the vault) |
|---|---|---|---|
| R1 | **Visible tool-call trace** — live stepper `read_scene_state → read_evidence → recompute_plan → propose_transition` with per-step status/timing during a session turn; collapsible reasoning under each recommendation | 5, 6, 11 | AI Elements Reasoning / Chain-of-Thought / Task (cult-ui local mirror); BoardUI Agent Log/Thinking; Better-Design `registry/vercel` |
| R2 | **Provenance chips + confidence badge** on every recommendation card — link to the 7 evidence sources (talon.ts:423–503); High/Moderate/Review-Needed derived from the convergence clock + signal confidence | 1, 5, 6 | AI Elements Sources/Inline-citation; microcharts annotations |
| R3 | **Class-of-action chip** — every staged tile and recommendation shows its Consequence class (1/2/3) so friction is *explained*, not arbitrary | 2, 3, 4 | Beautiful UI Approval Card; AI Elements Confirmation |
| R4 | **Expiry made visible** — staged chips show a countdown; expiry dissolves to watch, logs an event, orb returns to `watching` (fixes G1 *and* turns it into a trust feature) | 7, 8 | Circle Loaders (countdown arcs); TalonMark gated posture (already spec'd) |
| R5 | **Honest failure & abstention** — named-feed failure copy, visible "AI DEGRADED / authored fallback" badge, explicit "I don't know" posture instead of confident guesses | 13, 14, 15 | Prompt-kit refusal patterns; 5-outcome-state model (Success/Partial/Failure/Recovery/Escalation) |
| R6 | **Permissioned UI-intent layer ("TALON controls information, never furniture")** — a propable-and-dismissible intent catalog (`focus_map_zone`, `open_panel`, `pin_evidence`, `compare_plans`, `arm_probe`) validated by the engine exactly like `propose_transition`; every intent renders as a dismissible affordance and lands in the event log | Golden rule 2 + layout-thinking consensus | json-render's Zod-catalog→renderer *pattern* (do not adopt the framework); extend `panels.ts getPanelLayout` |

Design law for R1–R6 (from layout-thinking + doc 04): the gate stays center-bottom; authorization never migrates to the AI's side of the screen; TALON changes *what you see and how it's framed*, never *where the buttons are*. The 30-second kill-test (`verify-active → rescue-battery-critical`) must stay the acceptance bar for any attention system.

---

## 6. Component strategy

**Rules.** (a) Tokens stay the contract — any adopted component is re-tokenized on arrival; no free-form hex/radii. (b) Prefer copy-paste/registry source (shadcn-CLI style) over runtime deps that bring their own theme system (that's why nivo is a surgical tool, not the backbone). (c) Licenses: MIT/Apache-2.0 only as dependencies; Commons Clause kits (react-bits, rare-ui, sora-ui, canvas-ui) fine to *use*, never to redistribute as a kit; AGPL (tokokino) and no-license folders (kinetics, transitions-dev, cursify, morph-ui, efferd) — reference-only.

**The local vault is the mining tool.** `D:\Design Tools\Ui kits and components\library\` = 85 repos → `registry/` (4,386 components, `components.jsonl`, search index, license folder), paste-ready `content/` md, and an **MCP server** (`library/mcp/index.mjs`: `search_components`, `get_code`, `suggest_for_project`). Mine it before reaching for the web.

**Adopt list (all present locally unless noted):**

| Need | Source | License | Why |
|---|---|---|---|
| Thinking/reasoning/trace surfaces (R1, R2) | **cult-ui `components/ai-elements`** (41 files: agent, chain-of-thought, reasoning, task, artifact, sources, inline-citation, tool, conversation) + AI Elements patterns via Better-Design `registry/vercel` | MIT | The R1/R2 pattern set nearly verbatim; source lands in-repo and gets re-tokenized. |
| Word-sized data viz (W4) | **microcharts** (`library/packages/microcharts`, 106 zero-dep chart types: bullet, annotations, activity-grid, burn-chart, calibration strips) | License in package | PanelViz v2 backbone — hairline gauges, barcode histograms, heatmaps without a runtime dep. |
| Ops tables/timelines | **kibo** (Gantt, Table, Status, Ticker, Tree) | MIT | Incident triage, debrief timeline (replaces hardcoded beats, G-fix), fleet tables. |
| Streaming telemetry | **Bklit UI** Live Line / Projection Line / Gauge / Heatmap | Free OSS | 5 Hz frames once `session/` is wired (G9). |
| Charts backbone | **Evil Charts** (Recharts + ECharts dual engine, CSS-var theming) — reactivates the existing recharts dep legitimately | OSS | When PanelViz's hand-rolled SVG isn't enough. |
| AI status micro-indicators | **thinking-orbs** (9 states, zero-dep), **Circle Loaders** (24 monochrome SVG), **bloub** morph engine (study, don't ship — x.ai design) | MIT | Sub-status inside R1 steps; countdown arcs for R4. |
| Voice presence | **ElevenLabs UI** orb/waveform/transcript — adapt to SVG/CSS per no-canvas-stacking, or confine the 3D orb to EXPLORE | MIT | R6-adjacent: voice turn visualization. |
| Micro-interactions | **MicroKit** (49, Tailwind-4-verified, 26 zero-dep), **Amicro** (radar-sweep, siri-wave, dither heatmap, mac-terminal), **KokonutUI** (ai-loading, liquid-glass-card), **prompt-kit** (text-morph), **number-flow** (animated numbers), **sonner** (toasts → undo window), **magicui** (border-beam), **useLayouts** (Status Button, tabs) | MIT | The polish layer; each is small enough to re-token. |
| Map briefing callouts | **neat-annotations** (hand-drawn arrows/labels, CSS-var colored) | MIT | Briefing/debrief annotation pass over the map — TALON "explaining" the terrain. |
| Case-study diagrams | **elchininet/isometric** (TS isometric SVG, Apache-2.0) | Apache-2.0 | Schematic architecture/sensor diagrams for the written case study. |
| Theme tooling | **tweakcn** (shadcn theme editor, Apache-2.0) | Apache-2.0 | Exploring W1 token revisions quickly. |

**Skip:** overflow.design isometric icons (paid, Notion aesthetic), Rare UI/Amicro-web (unverifiable), nivo as default (runtime theme fight), OpenUI/json-render as dependencies (pattern reference only — a scripted prototype shouldn't inherit a generative-UI runtime), shadercn (WebGL budget), svg.guide (course), vibeprompts (prompts), rewampui/justice (empty), orbo-ui (undocumented), Orbloom (borrow the state-preset idea).

---

## 7. Proposed workstreams (for owner review)

- **W0 — Drift & hygiene repair** (pre-design, ~1 session): G1 expiry (implement, recommended), G2 `ALL_SCENES` +18 lines, G3 promoted-state depth, G4 GATED_ACTIONS home, G5 theme.css/DesignSystemPage truth, doc 00/03/README/AGENTS counts, doc 10 gets a status header + stripped cosplay.
- **W1 — Token system v2:** semantic roles, elevation ladder, blur/opacity scales, data-viz palette, concentric-radius tokens, CSS-var emission from `tokens.ts` (kill theme.css drift), decide hex revision (doc 10 direction vs current), decide px→rem.
- **W2 — TALON thinking surface (the trust layer):** R1 trace stepper, R2 provenance/confidence, R3 class chips, R4 visible expiry, R5 failure/abstention — all derived from `deriveTalonSurface()`; TalonMark evolves (aperture depth), no shader-sphere replacement.
- **W3 — UI-intent layer:** R6 propable-and-dismissible intent catalog + `panels.ts` extension + map-focus intents; kill-test acceptance.
- **W4 — Telemetry rebuild:** PanelViz v2 on microcharts patterns (hairline gauges, barcode histograms, arc gauges, heatmaps, tickers).
- **W5 — Map coherence:** enforce orthomosaic-under-2D rule, densified DEM-clamped 3D ribbons (doc 02 alignment), neat-annotations briefing layer; optional 2D→3D auto-transition spike behind a flag.
- **W6 — Case-study & product artifacts:** information-design ch07's 21-component spec + layout-thinking synthesis + Flow Atlas become the written case study's spine; isometric diagrams via elchininet/isometric; keep the framing doc's anti-inflation rules (90s = verified escalation, never containment).

**Stack call needed from owner:** the codebase is ~1,000 inline-style sites + tokens.ts, with Tailwind 4 configured but unused outside the archived tree. The redesign is the moment to pick one rendering idiom. Recommendation: keep `tokens.ts` as the single contract, adopt Tailwind utilities for layout/spacing in *new* components, keep `talon.css`-style state engines for motion — and don't mass-migrate old files; starve them out via W2–W4 rebuilds.

---

## 8. Open questions for the owner

1. Ratify the W0–W6 order, or re-cut?
2. Expiry: implement for real (recommended) or re-scope the constitution line?
3. Palette: token revision toward doc 10's cooler `#00E5FF`-family, or keep `#1CB8E6` and fix discipline only?
4. Orb: evolve Tactical Hybrid Core (recommended) vs doc 10's shader sphere?
5. Rendering idiom (inline-styles vs Tailwind hybrid) per the stack call above?
6. Wire `server/` + `session/` into the UI during this redesign (turns G9 into the live-data story), or keep the scripted-prototype purity for the case study?

## 9. Appendix — screenshot resources (status of each)

- **Deep-checked & recommended:** AI Elements (elements.ai-sdk.dev), json-render (pattern ref), BoardUI, Beautiful UI, ElevenLabs UI, thinking-orbs, Circle Loaders, Torph (reimplement, don't ship), React Bits, Cult UI, kibo, MicroKit, Evil Charts, Bklit, SpectrumHQ, KokonutUI, useLayouts, neat-annotations, elchininet/isometric, fluidfunctionalism, spaceui.one Bloop Orb, microcharts, amicro, prompt-kit, number-flow, sonner, magicui, tweakcn, threeui.
- **Already in the local vault:** cult-ui ai-elements, elevenlabs-ui, kibo, react-bits, uselayouts, amicro, kokonutui, thinking-orbs, bloub, spell-ui, boardui, beautifului (1 snippet), prompt-kit, better-design vercel registry, microcharts, bklit, orb-ui, vapi-blocks, loading-dev, shadcn-ui, magicui, beste-ui, spectrum-registry, sonner, number-flow, tweakcn, threeui, smoothui, vengenceui, lightswind.
- **Not found locally:** evil-charts, nivo, halaska, circle-loaders, torph, neat-annotations, overflow isometric, json-render, openui, shadcnblocks-standalone.
- **Dead/empty/mismatch:** open-design.ai is *not* ElevenLabs (it's a design-agent tool — skip), jeremy-prt/blobu → repo is `bloub` (Vue wrapper), rewampui + justice + rareui (HTTP 402/empty), orbloom license unstated.
- **Irrelevant by type:** PanelUI/gluestack/flyerhq (React Native), ShipSwift (SwiftUI), svg.guide/vibeprompts/cursor-lab/vectorize/MCP-logo (tools/courses), YouTube/kick/MRKD/orbitkit/before-skills/superpowers (non-UI).
