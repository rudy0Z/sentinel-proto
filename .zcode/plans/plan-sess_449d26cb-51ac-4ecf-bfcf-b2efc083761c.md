# Sentinel Final Fix Plan — Truth → Conversation → Chrome → Signature → Craft → Ship

Root causes pinned by recon: (1) `requiresHumanGate` is unconditionally true via the Notification Brief Agent (`domain/talon.ts:823`) OR'd into every session recommendation (`talon.ts:194-197`) — why baseline lands in a nonsense human-gate; (2) three divergent state derivations for orb color (`TalonSession.tsx:75`), ambient voice (`ActionBar.tsx:256-270`), and mark state (`ActionBar.tsx:461-465`); (3) SCENES chip `rightOffset` uses constant `RIGHT_RAIL_W` instead of `adaptiveRailWidth` (`SentinelShell.tsx:674`) — the overlap; (4) MapLegend is dead code (unimported). Authored TALON copy exists for all 16 scenes (`TALON_VOICE_RESPONSES` microcopy.ts:76-157, `getTalonRecommendation` talon.ts:850-939) — repair is wiring, not writing. ActionModal already passes authored transcripts (`ActionModal.tsx:1155`) — the pattern to follow.

**Locked decisions:** retire yellow (3-lead palette) · liquid-gooey IN this pass · honesty copy removed from product entirely.

---

## Phase 0 — Safety checkpoint
1. Commit the current dirty tree as-is on `feat/map-spatial-os` (checkpoint commit; all fix work becomes diffable).
2. Run `npm run check` (typecheck + audit:tokens + verify:map + verify:flows) — record the baseline pass/fail set.
3. Keep `scripts/capture-audit*.mjs`; regenerate `verification-artifacts/audit-captures/` as the "before" set.

## Phase 1 — M0: One state derivation (the truth layer)
**New file `src/app/domain/talonSurface.ts`**: `deriveTalonSurface(scene, state, context) → { tone, markState, posture {label, line}, voice {eyebrow, line}, gate }`. Inputs are the existing pure functions: `getTalonSessionRecommendation`, `getEvidenceSources`, `getAuthorityPacket`, `getContestedWatch`/dissent, `SIGNAL_PROFILES`, transition table via `actionAllowed`. Context carries the two state pieces living outside ShellState: `burnPermitVerified` and `evidenceConfidence`.
- **Decision table per scene-class** (baseline quiet → cyan/watching; investigation → cyan/searching; verify-active unverified → amber/blocked; authority-ready → amber/gated; contested → amber-or-red/contested posture naming the disagreement; reraise → amber/gated + threshold-crossed line; operations/rescue → cyan-or-status/executing-available; failure scenes → red/blocked naming the failure).
- **Fix the gate root cause**: make the Notification Brief Agent's `requiresHumanGate` conditional (`talon.ts:823`), and change `getTalonSessionRecommendation` (`talon.ts:194-197`) to derive the session gate ONLY from gate-able recommended commands in `actionSurface` — agent gates stay contextual in the Workforce rail. Result: no gate without an authorize-able command.
- **Rewire consumers**: ActionBar voice/eyebrow/tone/`ambientMarkState` + `CommandGroup` empty posture (delete duplicated logic at `ActionBar.tsx:495-499`); `TalonSession.stateColor` takes the derived tone for the ring whenever conversation phase is `watching` (session-open phases keep conversation colors).
- **New verify invariant** (add to `verify:flows` or a new `verify:surface`): no scene may render quiet-watch voice/posture while in contested, reraise, gate, or failure state; fixture↔surface consistency check.
- **Test updates**: none expected to break in M0 (copy unchanged) — but the new invariant must fail on the pre-fix code and pass post-fix.

**Gate:** full verify suite green + re-captures show contested/reraise voice naming the actual state and amber/red orb rings.

## Phase 2 — M1: Conversation repair
- **Continuity**: the expanded session keeps the ambient voice block as its header (same surface, session body unfolds below it) — opening TALON never erases what TALON was saying.
- **Copilot entry replaces the debug form**: state header + the live authored recommendation + 2–3 suggested-command chips wired from `SCENE_CHIPS_MAP`/`TALON_CHIP_RESPONSES` (exist for all 16 scenes) + "Type command". Voice becomes a mic affordance on the input row; scripted fallback becomes the invisible automatic fallback when speech is unsupported — never a labeled ops button.
- **Authored replies**: ActionBar passes per-scene `defaultTranscript` + `scriptedReply` from `TALON_VOICE_RESPONSES`/`getTalonRecommendation` into session context (copy the ActionModal pattern). Delete the generic "…prepare maintaining watch for operator approval" sentence construction (`TalonSession.tsx:259-261`).
- **Receipt re-entry**: primary affordance "Ask TALON something new" with chips; receipt stays as the record.
- **Honesty copy removed from product** (decision): delete/rewrite all listed strings — `TalonSession.tsx:513, 549, 556, 579, 629, 685`, error strings at 349/360/370/391, `TalonCopilotPanel.tsx:993` disclosure block. The honesty boundary lives in the case-study framing (portfolio repo, out of scope here). Keep precise aria-labels.
- **Test updates**: `verify-flows.mjs:144-152` (session flow asserts "Use scripted fallback", /Scripted prototype/i — rewrite to new contract: chips, authored reply, no human-gate on baseline); `capture-audit2.mjs` labels/timing.

**Gate:** recruiter path on fresh page (orb → suggested chip → authored recommendation → no bogus gate) passes as an automated flow; disclosure strings zero-grep in product surfaces.

## Phase 3 — M2: Chrome repairs (surgical)
- **Stage**: replace the `-50vw` blackout (`ActionBar.tsx:295-307`) with a bounded plinth — centered, map-lane width, ~140px tall, gradient seat to transparent — or remove entirely; judge by capture.
- **SCENES chip**: `rightOffset` uses `adaptiveRailWidth` (`SentinelShell.tsx:674`); collision rule (chip yields or voice panel narrows ≤1366); **core-mode variant**: chip visible in embed so recruiters can navigate scenes — update the `verify-routes.mjs:109-111` "absent in core" contract deliberately.
- **Delete `shared/MapLegend.tsx`** (dead code; the "Map key" the user saw in the stale embed dies with it).
- **Blocked pill**: full stated-blocker treatment — two-line layout, never mid-sentence truncation.
- **Dedupe rule**: each TALON sentence renders on at most one surface — voice shows posture + one line; the brief body lives in the rail/session only.
- **Map-label suppression** near the command region and chip corners (`SpatialMapCanvas` render pass).

**Gate:** captures at 1280×800 show zero overlap/truncation/collision; verify-routes updated + green.

## Phase 4 — M3: The gooey plate
1. **Prototype first**: install `liquid-gooey`; spike the hold-to-authorize pill inside a `Liquid` group (blob shadow vs inset-edge conflict, progress fill crispness). Kill-switch: if the hold integration fights the library, fall back to static plate and report — do not force it.
2. **Structure**: plate grows in the center column from the orb (per original C2); primary anchored (never moves once visible); decline/hold blooms left; danger stays in its menu.
3. **Goo on two states only**: extension bridge (orb→plate) and **contested fork** (two bridge-joined positions, neither pre-selected). Everything else plain layout/opacity. Tuning: `contentBlur: 0`, bounce/trail ~0, 200–240ms, reduced-motion = cut, clickable the instant it's in the DOM.
4. **Structural single-command-surface**: `deriveQuickActions` gains commands for `monitoring-contested` (close-out) and `talon-reraise` (decline-again / prepare-packet); panels become explanation-only.
5. **Recommendation/command reconciliation**: "Stage operations" vs offered "Deploy survey" in `contain-recommended` — command set must include what TALON names.
6. Remove the scaleX bloom; add springs as named motion tokens; fold all new talon.css durations into `motion.*`/`ease.*`.

**Gate:** verify-flows extended (contested close-out reachable from command surface); captures show bridge + fork; axe clean on the Liquid DOM (content layer unfiltered).

## Phase 5 — M4: Palette, coherence, craft
- **Retire yellow**: migrate all 22 `T.yellow` call sites (routes ingress, ground-team advisory, stale states) → amber (pending judgment) or cyan (guidance); delete from tokens; update DESIGN.md §4 + audit gate allowlist. Teal demoted to completion/receipt only (audit-gated).
- **Navbar regroup**: three clusters — identity+incident (brand, incident ID) | situation (mode pill + timer ring) | utility (timeline, bell, settings | clock, operator chip) — one chip language (one border/radius/height), dividers only between clusters; compact/narrow behavior preserved.
- **Rails**: fix tab-strip clipping at 260px (nowrap+flex:1 in `RailStack.tsx:158-174` — abbreviate labels + min-widths or scroll); unify `RailFilterBar` chip language with RailStack; asymmetric widths (TALON 340 / observation 280, tuned at 1280).
- **Focal contract applied** (already written in DESIGN.md §5): right rail gets one ≥26px read (packet % / confidence); left rail Zone Signature becomes a graphic (threat number + slope/spread marks).
- **`tnum`** on every ticking numeral (tokens-level utility; apply to SignalBar, confidence, timers, coordinates).
- **z-index hygiene**: hardcoded 50/60/25 (`SentinelShell.tsx:1943, 2025, 2323`) → `layer.*`.
- **Atmosphere (D2)**: map fog gradient + vignette, basemap contrast down/data up, fire as the only bloom, noise texture + gradient border on rail material.

## Phase 6 — Verification & freeze
- Extended `audit:tokens` (letterSpacing + raw-rgba warning ratchet per A7, allowlist reconciled); full `npm run check`; new surface invariant green.
- Re-capture all 16 scenes × 1600/1280; walk the recruiter path end-to-end; reduced-motion pass over the morph; axe run on all new surfaces.
- Update `DESIGN.md` (palette, motion tokens, honesty-copy removal, plate grammar) and the audit docs' status.
- **Out of scope**: portfolio repo embed sync and case-study copy (next task after this lands).

**Execution order:** Phase 0 → 1 → 2 → 3 → 4 → 5 → 6, verify gate between each. Phases 1–2 are the prerequisite spine; 4 depends on 1; 5 is parallelizable internally but lands after 4 to avoid restyling the plate.
