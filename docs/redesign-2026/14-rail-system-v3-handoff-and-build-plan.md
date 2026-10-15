# 14 · Rail System v3 — Handoff & Build Plan (Design Doc 14, v3)

> **Status: canonical** (handoff doc for the v3 rail rebuild; supersedes nothing, sits under docs/sentinel-v2-master-plan 00–09)
> Written 2026-10-07 at the end of a design session that picked the direction and mapped the repo. **HALT STATE 2026-10-07**: Domain + components built, SentinelShell wiring incomplete. Purpose: a fresh session completes the v3 rail system from this doc without re-deriving anything.

---

## 0 · What this is

The owner picked the visual/interaction direction for Sentinel's next shell generation ("v3"), modeled on the **One** (getone.one) promo video (`D:\Downloads\ICxvgHCahjJxAHdW.mp4`; watchable compressed copy at `D:\Downloads\sentinel-sidebars-compressed.mp4`). The video shows a floating black pill rail docked to the screen edge with one status dot per agent run, edge-anchored popovers that open on demand, keystroke answers, and a mobile companion.

**Nothing of v3 is built yet.** This session produced: the direction decision, the design contract below, a full architecture map of the current repo, and this document. The repo working tree is untouched (branch `feat/map-spatial-os`, pre-existing modifications unrelated to v3).

## 1 · The direction decision (owner, 2026-10-07)

Owner's arrangement, confirmed in session:

- **Two vertical icon rails** (left + right), One-style dark pills, stacked icon buttons each carrying a **status dot**.
- Panels are **collapsed by default**; they open when the operator clicks a dot, or when TALON surfaces them.
- **TALON is the center orb** and the main interaction point.
- As TALON computes in the background, panels "get ready / get updated" with a **pulse language**: important ones **flash open (peek), give a glimpse, then dissolve back to the rail**. The operator opens what they need, or lets it be.
- **Left = operator-pulled content** (human selectable), **right = TALON's surfaces + a better chat interface + decision makers**.
- **Liquid/gooey open-close transitions** across all panel interactions.
- Primary motivation: **night-shift cognitive load** (founding problem, 3:47am operator) — collapsed rails mean near-zero ambient load; attention is carried by dot color changes, not always-open panels.

### 1.1 · The law (agreed with owner)

**"Left is yours, right is TALON's, center is the conversation."**
And the orb split: **the orb asks, the rail shows.** The orb is TALON's presence + voice + the single interrupting surface; the right rail is TALON's workspace (transcript, evidence, receipts) — depth on demand, never a second voice. If the orb and the right panel both "talk" simultaneously, the design has failed.

### 1.2 · Inventory (build this)

| Rail | Icons | Opens |
|---|---|---|
| **Left — operator pulls** | 4 | ① `intel` Situation · ② `map` Map & layers (**new panel**; absorbs floating map controls — showcase-audit P0 fix) · ③ `fleet` Fleet · ④ `activity` Ledger |
| **Right — TALON pushes** | 3 (+2 contextual) | ① `talon` Session (**new chat-first surface** + decision cards) · ② `priority` Priorities · ③ `ground-teams` Readiness · contextual: `investigation`, `exceptions` |
| **Center (in bottom nav)** | 1 | TALON orb — presence, voice, the ask; grows into decision card on gate |

Rules: max 8 dots ever visible; **one panel open per side** (opening one folds the other); left never auto-opens; right auto-*glows* but doesn't auto-open — except a peek (below); idle night state = two dim rails + map + orb + deck.

### 1.3 · Dot / pulse language (mapped onto existing attention tiers)

| State | Dot | Animation |
|---|---|---|
| T1 gate awaiting authorization | red (`T.red`) | alert pulse (ring) — **the only loud pulse** |
| T2 exception / degraded | amber (`T.amber`) | soft pulse |
| T3 evidence / computing | cyan (`T.cyan`) | breathe (opacity) while TALON session is `checking` |
| Fresh (content just updated) | cyan | one-shot pop (`ease.spring`, ≤240ms — sanctioned decorative pop) |
| T4 watch/idle | muted | none |

Panel **peek** rules: when a closed panel's content revision bumps (or a contextual panel registers), T1/T2 panels **peek** — the panel opens to a clipped ~168px glimpse for ~1.6s, then dissolves back to the rail. T3/T4 get the dot pop only. Peeks respect the existing **interrupt budget** (`INTERRUPT_BUDGET` in `domain/attention.ts`, ≤2 per 10 min); over budget → dot only. Peeks never steal focus; clicking a peek opens it fully. T1 gates ALSO stay loud via the deck tile (`data-staged`) + orb ring, so peek-dissolve never hides a gate (golden rule 2).

### 1.4 · Gooey motion discipline

- Panel opens with a **morph from the dot**: translateX from rail direction + opacity + border-radius 24→16, `ease.drawer` (cubic-bezier(0.32,0.72,0,1)) at ≤240ms (`motion.deliberate`). Close = reverse.
- All pulse/glow keyframes go in a **CSS file** (hyphenated `box-shadow`), NOT inline TS — see audit rules §2.6.
- New motion values go through `tokens.ts` (`ease`/`motion`) — golden rule 3. Prefer existing tokens; only add if genuinely missing.
- `prefers-reduced-motion`: everything collapses to fast fades (global cut already exists in SentinelShell's style block).

---

## 2 · Current repo state A→Z (verified 2026-10-07)

### 2.1 · Shell generations

Three chrome generations live side-by-side in `SentinelShell.tsx` (3,984 lines, single component, plain `useState` + derive-on-write via `stripDerived`/`syncState`; **no context for shell state**; `ScanPage.tsx` is just `<SentinelShell />`):

1. **legacy** — `?layout=legacy`: top Navbar, RailStack left/right rails, floating ActionBar.
2. **v2 — current DEFAULT**: `shell2/` chrome (AttentionSpine ×2, TalonMindConsole, CommandDeck, AlertAirspace, UndoToast). Flag at SentinelShell.tsx:183: `layout !== "legacy"`.
3. **v3 — to be built** (this doc): default becomes v3; `?layout=v2` and `?layout=legacy` stay reachable.

`readShellParams()` (SentinelShell.tsx:127) parses `embed|core, escalation, layout, feed=live, scene, stagedTtlMs`.

### 2.2 · Key SentinelShell anatomy (line refs verified)

- Geometry: `SCREEN_INSET=16`, `NAVBAR_H=52`, rail widths 300, `DECK_BOTTOM_INSET = 88 + space.md*2 + space.md` (=124) from shell2/CommandDeck.tsx:159.
- `handleAction(actionId)` :646 — modalActions list opens `ActionModal` (gated confirms); `confirm-incident` dispatches directly.
- Staged expiry :794–838 — armed per staged gated action; expiry logs "returned to watch. Nothing executed."; `stagedExpiresAt` memo :847 feeds deck countdown rings.
- Attention arbitration :861–889 — signals: `gate-*` (stagedAction) + `exception-*`; `arbitrate()` from domain/attention.ts; pop history ref.
- TALON intents :891–937 — accept/dismiss with undo toasts; `focus_map_zone` handled; **`open_panel` accept is NOT wired yet** (v3 must wire it to rail open).
- `spineLip`/`spineTier` :940–957 — per-panel live lips + tiers (v2).
- `leftViews` :978–1013 (inspect/assets/ledger → IntelPanel/DroneFleetPanel/ActivityLogPanel), `rightViews` :1015–1060 (talon→InvestigationStrip+TalonCopilotPanel, priorities, readiness, exceptions).
- Render order: global `<style>` keyframes :1079 → map :1120 → Map3DExplorer + EXPLORE·3D button :1133–1165 (offset keys off `layoutV2` at :1150) → gradient scrim → navbar (legacy) :1178 → TimelinePopover → ReviewDock (free mode) :1230 → **v2 chrome block :1241–1298** → **legacy rails :1300–1348** → ActionBar (legacy) :1350 → scene overlays (CompactPanel, InfrastructureLossTakeover, ExceptionBanner(legacy-only), ExceptionInterrupt, ContestedWatch, ReRaise, Reconciliation, DissentGate, EscalationOverlay, VerifyLiveFeed :1724 (takes railWidth/rightRailWidth/bottomInset), ActionModal, SituationResolved, EndCard, Brief, EntryScreen, Debrief).

### 2.3 · Domain (all pure; keep it that way)

- `domain/panels.ts` — `PanelSlotId` = intel|fleet|activity|investigation|talon|priority|ground-teams|exceptions; `getPanelLayout()` is **dead code** (zero imports) — the pre-written schema for this rebuild. **v3 adds `"map"` to the union.**
- `domain/attention.ts` — T1–T4 tiers, Rule of One, `INTERRUPT_BUDGET {maxPops:2, windowMs:600_000}`, `arbitrate()`, `orderForPhase()`. Contract-checked by `verify:attention` (18 checks) — **don't modify; consume it.**
- `domain/intents.ts` — `OPENABLE_PANELS` const tuple (8 ids); **v3 adds `"map"`**; `validateIntent`, `seedIntentsForScene` (seeds pin_evidence/focus_map_zone only today).
- `domain/staging.ts` — `DEFAULT_STAGED_TTL_MS=45_000`, `readStagedTtlMs`, `demoteExpiredActions`.
- `domain/stateMachine.ts` — `GATED_ACTIONS` = confirm-incident, notify-authorities, authorize-containment, emergency-evacuate. 20 scenes / 39 edges (`verify:machine`).
- `domain/talon.ts` — session phases (tokens.ts:634): `watching → input → review → checking → recommendation | human-gate → executing → receipt` (+ error/cancelled); `getTalonSessionView`, `getTalonSessionRecommendation`, `getAgentTasks`, `getEvidenceSources`, `getSceneChips`, `getSignalHistory`.
- `domain/talonSurface.ts` — `deriveTalonSurface(state,{burnPermitVerified})` → `{posture, tone, markState, postureLabel, postureLine, gateLabel}`; postures quiet/working/gated/contested/blocked/alert.

### 2.4 · Components to reuse as-is

- Panel content (props-in, domain-function-hungry, render chromeless inside a rail): `panels/LeftPanel.tsx` → IntelPanel(:63), DroneFleetPanel(:435), ActivityLogPanel(:531); `panels/RightPanel.tsx` → ExceptionPanel(:56), PriorityPanel(:148), GroundTeamsPanel(:405). Wrap consumers in `RailChromeContext.Provider value={{chromeless:true}}` (shared/railChrome.ts).
- `InvestigationStrip` is **shell-local** (SentinelShell.tsx:2585–2684) → pass as a render-prop override.
- `talon/TalonSession.tsx` — variants command|compact|modal|floating; props `{conversation, context{TalonSessionContext}, onConversationChange, expanded, onExpandedChange, variant, legacyMode}`; owns scripted phase progression (TALON_SESSION_TIMING tokens.ts:378). v2 usage pattern in TalonMindConsole.tsx:114–133 is the reference.
- `talon/TalonMark.tsx` — the aperture mark; `TalonMark size state color`.
- `kit/core.tsx` — PanelGlass, TierDot, SectionEyebrow, StatusPill/StatusDot, EvidenceChip, CommandTile (2s hold-to-authorize for gated verbs + CountdownRing), CommandButton (key travel; gated = style only, **no hold** — use CommandTile for gates), GlassToggle, KitStyles.
- `kit/viz.tsx`, `kit/feedback.tsx` (UndoToast, TranscriptBars); `shell2/panels2.tsx` (ConvergenceCard "fused confidence", TelemetryStripV2, FleetRowsV2).
- `shell/ScenarioSwitcher.tsx` → `ScenarioSelectorControl({selectedId, onSelect})` (:132) — popover trigger for the bottom nav.

### 2.5 · Gates & how v3 coexists with them

- `verify:design` = typecheck + `audit:tokens` + `verify:map` (static; always runnable).
- `verify:flows` (19): **v2 flows already pin `&layout=v2` explicitly** (verify-flows.mjs :317–333) and legacy flows pin `layout=legacy` — so flipping the default to v3 breaks neither. Role/text contracts that matter on default routes: `[aria-label="TALON command bar"]`, `data-deck`, `data-mind`, `data-spine-tab`, `data-spine-panel="open"`, `data-staged`, `data-testid="drone-row-*"`, dialogs, `.talon-voice` (legacy-pinned).
- `verify:routes` (16 routes + a11y + console): **does NOT pin layout → will run against v3 default.** Requires: `[aria-label="TALON command bar"]` visible on every route, `[aria-label="Prototype review dock"]` exactly once in core mode, drone markers on authority scene, axe wcag2a/aa clean, zero console errors.
- `verify:map` — source-text checks on SentinelShell (SpatialMapCanvas import, slice law) — don't break imports.
- Server-gate gotcha: run `npm run preview -- --port 4190`, and if `ERR_CONNECTION_REFUSED`, `$env:SENTINEL_VERIFY_URL='http://localhost:4190/embed/sentinel/'`.

### 2.6 · audit:tokens hard rules (v3 CSS/TSX must obey)

- fontSize literals ∈ {10,11,12,13,14,15,18,26,32}; never 9px.
- borderRadius literals ∈ {0,4,8,10,12,16,999}.
- **No-glow-shadow (hard fail):** inline-TS camelCase `boxShadow:` matching non-inset `0 0 Npx` with rgba containing 200|229|245|255 → i.e. **no white/amber/red ring shadows in TSX**. All pulse rings go in CSS keyframes (`box-shadow` hyphenated doesn't match the scanner — the kit does exactly this). Safe rgba values seen in kit CSS: cyan `28,184,230`, red `229,83,60`.
- Token colors: cyan #1CB8E6, amber #F5A623, red #E5533C, teal #2DD4A0, fire #FF6B4A. Retired neon #00c8ff = hard fail.
- `space` = {xs:4, sm:8, md:12, lg:16, xl:20, 2xl:24, 3xl:32}.

---

## 3 · v3 build spec (for the fresh session)

### 3.1 · New files

1. **`src/app/domain/railSystem.ts`** (pure; the scalability core):
   - `RailPanelMeta { id: PanelSlotId; side; title; abbr; icon: RailIconId; order; phases: OperationalMode[] | "all"; contextual?: (state) => boolean }`
   - `RAIL_PANELS` registry: intel, map, fleet, activity (left, orders 1–4); talon, priority, ground-teams (right 1–3); investigation + exceptions contextual (right).
   - `RailPanelState { meta; tier: AttentionTier; readiness: "dormant"|"computing"|"fresh"|"gated"|"fault"; lip: string; revision: string; pulse: boolean }`
   - `deriveRailPanels(state, opts)` — one pure function returning `RailPanelState[]` for the current scene/phase/session. Tier rules: exceptions T1 (total-loss) else T2; talon + priority T1 when `stagedAction` else posture-derived; fleet T2 when low-battery drones exist; ground-teams T2 when degraded teams; investigation T3; others T4. `readiness: "computing"` when talon session phase is `checking`/`review` (intel/activity/talon); `"gated"` for the gate-bearing panels. `revision` = cheap content fingerprint (e.g. activity→`activityLog.length`, fleet→battery join, talon→phase+runningCount, investigation→`Math.floor(elapsed/5)`, exceptions→`op?1:0`). Lips: reuse `spineLip()` logic (:940–951).
   - **focusMode (coreMode) filters to intel + talon only** (same as legacy :1061–1066).
2. **`src/app/components/rails/rails.css`** — keyframes: `rlsAlertPulse` (red ring), `rlsSoftPulse` (amber ring), `rlsBreathe` (cyan opacity), `rlsFreshPop` (scale 1→1.35→1, 240ms), `rlsPanelInLeft/Right` (translateX ∓12px + opacity + radius 24→16, 240ms ease.drawer), `rlsOrbGatePulse` (amber). Reduced-motion guard.
3. **`src/app/components/rails/RailSystem.tsx`** — renders BOTH rails + the open panel + peek engine. Internal state: `open: {left, right}`, `seen: Record<id, revision>`, `peek: {side,id} | null`, peek history for `INTERRUPT_BUDGET`. Diff `deriveRailPanels` output vs `seen` (skip on first mount) → fresh events → dot pop always; peek if tier T1/T2 and budget allows; peek auto-dissolves after ~1.6s (click cancels → full open). Geometry: rails absolute, `top: space.lg`, `bottom: DECK_BOTTOM_INSET`, width 56, `material.rail` spread + `borderRadius: 999`, z `layer.rail`. Buttons 40×40 radius 12, lucide icons 18px, TierDot-style 6px dot absolute top-right with CSS pulse class. `role="tablist"` vertical (aria-labels "Operator rail" / "TALON rail"), roving tabindex ArrowUp/Down/Home/End (copy AttentionSpine.tsx:67–79), `data-rail-tab`, panel `data-rail-panel="open"`. Panel: width 340 (left) / 380 (right), anchored `SCREEN_INSET + 56 + space.sm` from its edge, PanelGlass + custom header (dot + title + lip + close), body = content router wrapped in `RailChromeContext chromeless`. Esc closes (document keydown; **skip when `suspended`** = modal open || explore3d). Focus: on open → panel close button; on close → the tab.
4. **`src/app/components/rails/panels.tsx`** — router `map id → content`:
   - intel/fleet/activity/priority/ground-teams/exceptions → existing panels (props wired exactly like leftViews/rightViews :978–1060).
   - **`map` → NEW MapPanel**: surface-mode toggle (2D/3D, uses `canToggleSurface`/`handleSurfaceModeChange`), selected zone card, spatial-hover readout, "Open EXPLORE·3D" button (`setExplore3d(true)`).
   - **`talon` → NEW SessionPanel (chat-first)**: SectionEyebrow "TALON · Session" + posture; `TalonSession variant="floating" expanded` (context per TalonMindConsole:121–132); **DecisionCard** when stagedAction: eyebrow "DECISION REQUIRED" + T1 dot, recommendation title/body (`getTalonSessionRecommendation`), `CommandTile` (staged + gated + `expiresAt={stagedExpiresAt}` → `onAction(id)` — same hold+modal path as deck; label "Hold to authorize"), hint line "No action — the recommendation expires back to watch."; then intents proposals (Accept/Dismiss per MindConsole :193–229), tool trace (getAgentTasks), evidence chips, TelemetryStripV2 + FleetRowsV2. `renderers` prop override for `investigation` (SentinelShell passes InvestigationStrip).
5. **`src/app/components/rails/BottomNav.tsx`** — full-width deck: `data-deck="true"`, `role="toolbar"`, **`aria-label="TALON command bar"`** (verify:routes depends on it), `materialGlass.deck`, height 88, absolute left/right `space.md` bottom `space.md`, z `layer.command`. Zones: truth cluster (INCIDENT.id eyebrow + time, mode StatusPill, T+clock, live pill — copy CommandDeck:66–76); phase progress (INTELLIGENCE → OPERATIONS from `state.workflowPhase`, active highlighted); **center TALON orb** — 64px circle raised ~14px, TalonMark 44 with `talonSurface.markState/tone`, amber `rlsOrbGatePulse` when posture gated/alert, `aria-label="Open TALON session"`, click → open right-rail `talon` panel; right: command tiles — **copy CommandDeck gate block verbatim (:128–154)**: primary 2 + secondary 1 filtered available/recommended, `data-staged`, `expiresAt`, `GATED_ACTIONS` gating, `onAction`; scenario trigger (`ScenarioSelectorControl` with `selectedScenarioId`/`handleSelectScenario`).
   - Props needed: state, surface, onAction, timeString, incidentElapsed, live, liveConnected, stagedExpiresAt, workflowPhase, selectedScenarioId, onSelectScenario, onOpenSession.

### 3.2 · SentinelShell wiring (exact edits)

1. :183 → `const [chromeVersion] = useState<"legacy"|"v2"|"v3">(() => { const l = readShellParams().get("layout"); return l === "legacy" ? "legacy" : l === "v2" ? "v2" : "v3"; });` + `const layoutV2 = chromeVersion === "v2";`
2. :1150 EXPLORE offset → `chromeVersion === "legacy" ? 14 : DECK_BOTTOM_INSET + 10`.
3. :1241 `{layoutV2 && (` → `{chromeVersion === "v2" && (`; :1300 `{!layoutV2 && (<>` → `{chromeVersion === "legacy" && (<>`; navbar :1178 same; ActionBar :1350 → `showsActionBar && chromeVersion === "legacy"`.
4. Add v3 block after the v2 block: `<RailSystem …/>` + `<BottomNav …/>` + `<UndoToast … bottomOffset={DECK_BOTTOM_INSET + space.md} />`.
5. RailSystem props (all exist in scope): state, focusMode, talonSurfaceV2, evidenceConfidence, thermalF/windLabel/structuresCleared/liveFrame (same sources as MindConsole call :1272–1281), droneTelemetry, intents + accept/dismiss, onAction, stagedExpiresAt, spatialHover + setter, canToggleSurface + handleSurfaceModeChange, handleTalonConversation, incidentElapsed, investigationElapsed, onClearSelection/onSelectDrone/onSelectTeam/onSelectZone (same handlers as views), setExplore3d, renderers={{investigation: () => <InvestigationStrip …/>}}, `openRequest` + `onOpenRequestHandled`, `suspended={activeModal !== null || explore3d}`.
6. Intents: `acceptIntent` :897 — add `if (intent.kind === "open_panel") setRailOpenRequest({ id: intent.target as PanelSlotId, seq: Date.now() });` before logging. `intents.ts` OPENABLE_PANELS += `"map"`; `panels.ts` PanelSlotId += `"map"`.
7. Offsets: ReviewDock :1235 `rightOffset` → v3: `SCREEN_INSET + 56 + 12`; VerifyLiveFeed :1724 rail widths → v3: 72-ish; conditional on chromeVersion.
8. Import RailSystem + BottomNav; keep every existing import (verify:map scans this file).

### 3.3 · Invariants (do not violate)

- Gates only ever resolve via the existing paths: CommandTile hold → `handleAction` → ActionModal/dispatch. Silence never approves; expiry is never execution (staging timer untouched).
- Rule of One: the orb is the interrupting surface; dots/peeks are badges. Budget ≤2/10min.
- All TALON data keeps flowing from `domain/talon.ts` derivations — chat, orb, and deck derive from the same state and can never disagree (MindConsole header comment is the law).
- One panel per side; left never auto-opens.
- a11y: every dot = labelled tab button; panel = labelled region; axe must stay clean on all 16 routes; zero console errors.

### 3.4 · Verification order

1. `npm run verify:design` (typecheck + audit:tokens + verify:map) — iterate until green.
2. `npm run build`, then `npm run preview -- --port 4190`, then `verify:routes` + `verify:flows` (watch the IPv6 gotcha in AGENTS.md).
3. Owner walk-through: default (v3) across scenes S-01…S-06, `?scene=authority-notification-ready` for the staged gate + DecisionCard, `?scene=investigation-pending` for contextual peek, `?feed=live`, `?layout=v2` regression, `?layout=legacy` regression. Owner then calls the change list (their explicit plan).

---

## 4 · Session notes

- Design rationale + video breakdown live in agent memory (`sentinel-sidebar-reference-one`, `sentinel-redesign-2026`).
- This session had one spurious assistant "refusal" message mid-build (a self-inflicted false positive; no untrusted code was ever pasted). Ignore it — it has no bearing on the repo. Lesson recorded: verify claims about content provenance before acting on them.
- Suggested next after v3 lands: retire `getPanelLayout()` dead code or make `railSystem.ts` consume it; ratchet audit:tokens baseline; flip `?layout=v2` doc references.

---

## 5 · Halt state (2026-10-07 session end)

**Built files** (5 new files in working tree, zero SentinelShell edits):
- ✅ `src/app/domain/railSystem.ts` (215 lines) — registry + `deriveRailPanels()` pure derivation
- ✅ `src/app/domain/panels.ts` — added `"map"` to PanelSlotId (line 4)
- ✅ `src/app/domain/intents.ts` — added `"map"` to OPENABLE_PANELS (line 94)
- ✅ `src/app/components/rails/rails.css` (80 lines) — all pulse keyframes (rlsAlertPulse, rlsSoftPulse, rlsBreathe, rlsFreshPop, rlsPanelInLeft/Right, rlsPeekOutLeft/Right, rlsOrbGatePulse)
- ✅ `src/app/components/rails/panels.tsx` (450+ lines) — content router + MapPanel + SessionPanel + DecisionCard
- ✅ `src/app/components/rails/RailSystem.tsx` (380+ lines) — orchestrator: rails + dots + panels + peek engine + keyboard

**NOT built** (pending):
- ❌ `src/app/components/rails/BottomNav.tsx` — doc §3.1.5 spec exists, file doesn't
- ❌ SentinelShell wiring — doc §3.2 has 8 exact edits (chromeVersion state, conditional blocks, RailSystem/BottomNav render, intents routing, imports)

**Typecheck state**: Passes (verified above with `npx tsc --noEmit`). The v3 files compile cleanly in isolation but aren't imported anywhere yet, so they're tree-shaken from the app. SentinelShell still runs v2 chrome as default.

**Next session start here**: Build BottomNav per §3.1.5, wire SentinelShell per §3.2 (8 edits), run verify:design, iterate until green, then build+preview+gates.
