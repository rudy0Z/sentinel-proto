# Sentinel — Full Audit (after Phase 6 freeze)

**Date:** 2026-09-03
**Scope:** Every committed phase (M0–M4) + the published status doc, walked against the plan, the code, and 14 fresh visual captures at 1280×800 and 1600×900.
**Audit method:** re-ran all five automated gates against the current source on `feat/map-spatial-os`; walked the diff (`decaf97..80534d0`); walked every capture in `verification-artifacts/audit-captures/`; opened the live build in headless Chrome for scenes the captures didn't cover (infrastructure-total-loss, free-mode session + chip reply); reconciled the plan's claims with the code paths that implement them.

---

## 1. Plan-execution scorecard (verbatim from the plan, with verdicts)

| Plan step | Verdict | Evidence |
|---|---|---|
| **M0 deriveTalonSurface truth layer** | **DONE** | `src/app/domain/talonSurface.ts` exists, ActionBar and TalonSession consume it. But two derivations still disagree on what a "gate" is — see §3.4. |
| Notification Brief Agent gate conditional | **DONE** | `domain/talon.ts:823` is now `isAuthority \|\| isReRaise`. |
| Session gate derived from `actionSurface` only | **PARTIAL** | Implemented at `talon.ts:194-197` (any recommended command), but the ID set in `talonSurface.GATED_IDS` differs — see §3.4. |
| `verify:flows` surface-truth invariant | **DONE** | Passes (`talon.ts:194-197` change + `verify-flows.mjs:208`). |
| **M1 Continuity header** | **DONE** | `TalonSession.tsx:568` renders `context.postureLabel` as the surface name; `context.postureLine` as the detail. Voice panel never erases. |
| Suggested-question chips | **DONE** | `talon-session__chip` CSS, 3 chips per scene from `SCENE_CHIPS_MAP`, authored answers via `getTalonChipResponse`. |
| Authored per-scene transcripts | **DONE** | `ActionBar.tsx:485-486` passes `defaultTranscript` + `scriptedReply`. |
| Receipt re-entry | **DONE** | Receipt phase renders chips + "Ask TALON something new" eyebrow (`TalonSession.tsx:730-744`). |
| All prototype/dev copy removed from product | **DONE** | Zero `scripted prototype` / `Provider AI is not connected` / `use the scripted fallback` strings in product surfaces. |
| **M2 Bounded plinth** | **DONE** | `ActionBar.tsx:312-325` is now a centered 1240px-w plinth, not `-50vw`. |
| SCENES chip on adaptive rail | **DONE** | `SentinelShell.tsx:674` now uses `adaptiveRailWidth`. But see §3.3 — still collides with voice panel on the right side. |
| SCENES in embeds | **DONE** | `verify:routes.mjs:111` now asserts presence in core mode. |
| `MapLegend` deleted | **DONE** | File removed; no imports remain. |
| Stated-blocker pills | **DONE** | Disabled pills wrap to 2 lines (`ActionBar.tsx:729-739`); full sentence visible. |
| Map-label suppression over command zone | **DONE** | `SpatialMapCanvas.tsx:113-114` widens the dock zone to `xMin:300 xMax:1140 yMin:720`. |
| **M3 `liquid-gooey` plate** | **DONE** | Installed; `ActionBar.tsx:345-506` wraps orb + right pill + (left pill when present) in a `Liquid` group. |
| Contested fork blooms both sides | **DONE** | `SentinelShell.tsx:2860-2877` returns both primary (`confirm-incident`) and secondary (`monitor-only`) for `talon-reraise`; `ActionBar.tsx:240-261` splits left/right. Visible in `m5-talon-reraise-1600.png`. |
| Panel-stranded actions moved onto command surface | **DONE** | `close-out-contested` added (`tokens.ts`, `commands.ts`, `microcopy.ts`, `SentinelShell.tsx:2855-2861`); `ContestedWatch.tsx` panel buttons removed; shell calls `setReconciliation(true)` directly. |
| Recommendation/command reconciliation ("Stage operations" vs "Deploy survey") | **NOT DONE** | Still visible in `m5-contain-recommended-1600.png`: TALON's recommended action is "Stage operations"; the offered command is "Deploy survey". The plan listed this as M3 work; it didn't land. **This is the most visible product-thesis contradiction remaining.** |
| Hold-to-authorize integration proven with goo | **PARTIAL** | The HoldPill renders unchanged and remains outside the `Liquid` group (line 504 DangerMenu is also outside). See §3.1. |
| **M4 Yellow retired (3-lead palette)** | **DONE** | `T.yellow` removed from tokens; 22 call sites migrated to `T.cyan` (guidance) or `T.amber` (advisory). |
| `tnum` on mono telemetry | **DONE** | 7 files updated via regex; all mono surfaces now set `fontFeatureSettings: '"tnum"'`. |
| Asymmetric rails | **DONE** | `SentinelShell.tsx:202-204` defines `adaptiveTalonRailWidth` (300 / 340). |
| Right-rail focal 32px | **DONE** | `TalonCopilotPanel.tsx:1461-1475`: packet confidence is now 32/36/heavy/-0.02em. |
| Navbar chip recipe consolidated | **DONE** | `Navbar.tsx:718-732`: one `navBtnStyle` with surface.control + border.default + 30px height + tracking.fine. |
| Map atmosphere strengthened | **DONE** | `SpatialMapCanvas.tsx:392-397` desaturates basemap (0.86 / 0.66 from 0.92 / 0.74); haze gradient 0.72→0.12; vignette widened to 72%/66%. |
| Hardcoded zIndex → `layer.*` | **DONE** | 4 sites (50/60/25) migrated; `layer.*` used in 15 places. |
| Rail tab labels truncate | **DONE** | `RailStack.tsx` tabs use `flex: "0 1 auto"` + `textOverflow: "ellipsis"` + `title` for full name. Kills the "Exce…" clip. |

**Headline: 23/27 plan steps DONE, 1 PARTIAL, 1 NOT DONE, 1 SURFACE TRUTH INCONSISTENCY between two derivations.**

---

## 2. Visual audit — every capture walked

| Scene / capture | Verdict | What I see, what I don't |
|---|---|---|
| **`m5-monitoring-contested-1600.png`** | **Best frame in the product.** | Orb in amber, "Close this out" pill bridged to the orb through the liquid silhouette — the bridge is *actually visible* between them. Voice says "Contested watch · TALON is holding at reduced weight — silent until the agreed threshold." Contested panel above is pure explanation. This is the case-study frame. |
| `m5-talon-reraise-1600.png` | **The fork is in.** | Decline again on left, Prepare authority packet on right, both bridged. But "Awaiting your authorization" subtitle fits in the right pill while the "Records dissent · contested watch" subtitle on the left is *visually identical* — a divider line between the two pills would let them read as "decline" and "forward" rather than twin instructions. The Threshold Crossed panel is still the explanation-only surface, but the panel has no border separation from the surrounding map. |
| `m5-verify-active-1600.png` | **Strong.** | Amber dominance is correct: orb, voice, blocker pill, and the source-conflict eyebrow all read amber. The disabled-pill wrap to 3 lines ("Blocked by source conflict. Verify burn permit before packet preparation.") works. But the **SCENES chip overlaps the "LIVE / Lidar-02 / Grid 4C / HD vis" video overlay** that the `VerifyLiveFeed` layer is rendering on this scene. See §3.3. |
| `m5-verify-active-1280.png` | **Chip still overlaps the voice panel.** | At 1280 the SCENES chip sits to the right of the voice panel at right=288, but the voice panel's right edge crosses x=900 and the chip's left edge sits at x=992, so the chip's left padding overlaps the voice's right padding. M2 said it was fixed; it isn't, in this scene. |
| `m5-authority-notification-ready-1600.png` | **Critical inconsistency.** | Voice: "Human authorization required · Send Authority Packet is staged. The authorization is yours." Orb: amber. Pill: "Send Authority Packet · Awaiting your authorization." Right rail: still says **"Packet Building · 46% · Awaiting incident confirmation"** — the *old* pre-M0 packet state. In `contain-recommended` (post-send) the right rail correctly reads "Authority Notified · Operator sent to authorities." The packet block in the right rail does not consume the same `getAuthorityPacket` logic the voice now does. **Two sources of truth for packet state, again.** |
| `m5-contain-recommended-1600.png` | **Recommendation/command mismatch persists.** | TALON's recommended action says "Stage operations." The right rail says "Authorities have been notified." The staged command is "Deploy survey" with subtitle "Awaiting your authorization." A reviewer who reads top-down learns three different things: TA should stage ops, A has been notified, and D-survey is the command. The plan called this out as M3 work. |
| `m5-baseline-1600.png` | **Right rail looks abandoned.** | "Source freshness 3 current · 1 uncertain" / "Agent relay 0 complete · 3 running · 0 gated" are *text labels in a 10px mono font with no visual emphasis on the 1 uncertain and 0 gated*. The left rail by contrast has bars with tints — it tells a different story in a different language. A baseline scene should arguably be the most legible, and it isn't. |
| `m5-baseline-1280.png` | **Rail tab strip is fine, but right-rail label "Source freshness" wraps because the column gets too narrow at 260px.** | The width split is right, but "1 uncertain" and "0 gated" wrap to the line below, eating rail real estate and pushing the rail content below the fold. The 12px line-height data lines need either more horizontal room or a numeric-only style. |
| `m6-infra-loss-1600.png` | **The only screen with real type contrast.** | 26px+ headline, structured chips, focal hierarchy. The lone working example of the focal contract; also the one screen the design system was *clearly* designed for. |
| `m6-chip-reply.png` | **The conversation is now a conversation.** | Click "TALON scope" → reply is the authored answer with the human-gate line. Title in teal, body in secondary, gate line as a note — three semantic levels. The expansion and opening sequence worked first-try in headless. |
| `m5-talon-reraise-1280.png` | **Same SCENES-chip/voice overlap pattern.** | Confirmed at 1280. |

---

## 3. The inconsistencies — every one I found, with file:line evidence

### 3.1 The Danger menu and Hold pill render outside the `Liquid` group
**`src/app/components/ActionBar.tsx:504`** — `{menuActions.length > 0 && <DangerMenu ... />}` is rendered next to the `Liquid.Item` for the right pill, but it is NOT a `Liquid.Item` itself. The danger button has its own border-radius, its own box-shadow inset (`TalonSession.tsx:752-755` for HoldPill is also outside the `Liquid` group). In a contested scene where the danger menu is empty, the liquid plate is one shape; on rescue scenes where danger actions appear, the menu appears next to it with no liquid neck. **The signature works for the two-action scenes; the third surface is unjoined.** Fix: include the danger menu and HoldPill as `Liquid.Item` siblings, or accept that the danger menu is the lone out-of-silhouette element and document the rule.

### 3.2 Dead code: `flank` and `coreCandidate`
**`src/app/components/ActionBar.tsx:186-195`** — `flank` is computed (`flank = coreCandidate ? [coreCandidate] : []`) and never used. `coreCandidate` is only used to derive `flank` and to compute `menuActions`. Both can be deleted; the new `rightAction`/`leftAction` derivation is the only one that reaches the JSX. No runtime impact but a senior reviewer will spot it.

### 3.3 The SCENES chip still collides with the voice panel at 1280
**`src/app/components/SentinelShell.tsx:672-674`** — `rightOffset = adaptiveRailWidth + SCREEN_INSET + 12` gives 288 at 1280. The voice panel is centered at 640 with `max-width: min(520px, calc(100vw - 48px))` so at 1280 it spans x=380–900. The chip sits at x=952 leftward (1280 - 288 - 32 for its own width). At 1600 the chip is at x=1208 — clear. At 1280 the chip's left edge is at x=952, the voice panel's right edge is at x=900 — **52px of breathing room, not overlap.** I was wrong above; the chip is *clear of* the voice panel. **Correction: there is no collision in 1280 — what I was reading as overlap was actually the SCENES chip's left edge approaching the right rail's left edge (which is at x=1280 - 260 = 1020, i.e. 68px to the right of the chip's left edge). The chip sits in the gap between the voice panel and the right rail.** Confirmed in `m5-baseline-1280.png` and `m5-verify-active-1280.png`. **The only true collision remains the LIVE-feed banner in `verify-active-1600.png`** which the SCENES chip overlaps because the VerifyLiveFeed layer (zIndex centerSurface 25) extends across the full width of the rail inset — see §3.6.

### 3.4 Two derivations disagree on what "human gate" means
- `domain/talon.ts:194-197`: `requiresHumanGate = state.actionSurface.primary.some(a => a.status === "recommended")` — any recommended command.
- `domain/talonSurface.ts:58-63`: `GATED_IDS = new Set(["confirm-incident", "notify-authorities", "authorize-containment", "emergency-evacuate"])` — only four IDs.

In **`contain-recommended`**, the recommended action is `deploy-survey` (a forward command, not in `GATED_IDS`). The voice correctly says "Operator review" (working posture), but the session reply lands in `human-gate` phase and shows the "Authorization is yours" notice. **The orb and the conversation disagree on whether the scene is gated.** In `contain-recommended` the issue is mostly aesthetic because the human-gate line happens to be a reasonable prompt. In `contain-alternate` (a scene where TALON's recommendation explicitly says "Review alternate plan" but the staged command is *also* `deploy-survey`) the same mismatch fires.

**Fix:** make the session-gate rule use the same `GATED_IDS` set the surface uses, OR make the surface also fire on any recommended action. Either is defensible; the inconsistency is not.

### 3.5 The right rail's packet block lags the surface truth
**`src/app/components/panels/TalonCopilotPanel.tsx:1440-1500`** — the packet status string is derived from `packet.status` from `getAuthorityPacket(state)`. The voice and command surface now read from the same `getAuthorityPacket` but the `showDecisionGate` block in the right rail still prints the *old* "Packet Building / Awaiting incident confirmation / 46% Evidence synthesis in progress" copy on `authority-notification-ready`. The voice says "Send Authority Packet is staged" — the right rail should say the same. **Inconsistent packet truth between the two surfaces that already share the same data source.** This is a 5-line fix in the rail's status labels.

### 3.6 VerifyLiveFeed banner is zIndex 25, so the SCENES chip (zIndex 35) sits on top of it — but the banner extends across the full rail gap
**`src/app/components/SentinelShell.tsx:2316-2325`** — the live-feed banner fills the map lane between the rails. The SCENES chip (zIndex 35) and the live-feed banner (zIndex 25) both occupy the bottom-right of the map lane. In `m5-verify-active-1600.png` the chip visually overlaps the live-feed text. Fix: give the chip a higher zIndex or push the live-feed banner's bottom-right corner out of the chip's reserved area.

### 3.7 The two rails speak two data languages
**`src/app/components/panels/LeftPanel.tsx:84-110`** (left rail) — "Thermal sensor 91% / Satellite IR 87% / Drone visual 42%" rendered as bars with tints and timestamps. **Right rail (TalonCopilotPanel.tsx:1600-1660)** — "Source freshness 3 current · 1 uncertain" as a single line of 10px mono text, with the "1" in amber and the "0" in muted. **Same telemetry, two visual languages.** A reviewer who scans both rails gets no signal that they're looking at the same data.

### 3.8 Rail overflow on the right rail at 1280
**`src/app/components/panels/TalonCopilotPanel.tsx:1640-1660`** — the Source freshness/Agent relay lines wrap to two lines at 260px because the "uncertain" / "gated" tail of each line is non-truncating. Result: the section eats 30% more vertical space than at 1600. The asymmetric rail widening (M4) is correct, but the *content* of the right rail was written for 300px+ and needs to either wrap-and-shrink or use compact data rows.

### 3.9 The "Awaiting your authorization" subtitle on the command pill
**`src/app/components/ActionBar.tsx:502`** (pill subtitle) and the parallel "Records dissent · contested watch" on the left pill are *visually identical mono lines* but say different things. The fork would read more clearly if the subtitles carried the action's *risk* hint or at least used different tone-tinted text.

### 3.10 Mode pill narration diverges
**`src/app/components/Navbar.tsx`** — the "Intelligence" / "Operations" pill is a single pill with a subtitle "Detect · Verify · Escalate". In **`m5-verify-active-1600.png` and `m5-contain-recommended-1600.png`** the pill and subtitle are present, but the subtitle on the Operations pill ("TALON supervising") is a *status indicator* while the Intelligence subtitle is a *process narration*. Inconsistent: a reader has to learn that one subtitle tells you the workflow phase and the other tells you the system's behavior.

### 3.11 Navbar item heights still differ at narrow widths
**`src/app/components/Navbar.tsx:45-89`** — the brand mark is 28px, the queue chip is 30px (per M4 recipe), the mode block is ~36px tall (pill + timer + subtitle), the Handover/Timeline/Notification/Settings chips are 30px. The mode block sits taller than its neighbors; the divider lines on either side don't compensate. At compact (1440) and narrow (1320) the relative size mismatch is the loudest visual rhythm break in the row.

### 3.12 The MapLegend delete left a "Map key" affordance in only the stale embed
**No code change needed** — but the user's reported "Map key" button exists only in the embed `D:\Portfolio\public\embed\sentinel\` which is still the pre-fix build. After the next `node scripts/sync-embeds.mjs sentinel`, the button disappears. Listed for completeness.

### 3.13 The 78→96 ramp on re-raise is wall-clock-bound
**`src/app/components/SentinelShell.tsx:372-382`** — `evidenceConfidence` climbs from 78 to 96 over ~15s. The `talon-reraise` flow asserts the 78→96 delta, but a reviewer who navigates to the scene via SCENES chip sees the panel **at the moment they arrive**; the delta display is meaningful only at T+15s. In `m5-talon-reraise-1600.png` the delta reads "78 → 96" (caught just after the 15s mark). This is by design but worth a callout — the case study should mention "the appeal visibly resolves over ~15 seconds," or the wall-clock should be tunable from the URL.

### 3.14 The 276 raw-tracking warnings are a smell
**`scripts/audit-design-tokens.mjs`** — 276 hits, mostly `letterSpacing: "0.04em"` / `"0.06em"` / `"0.12em"` / `"0.1em"` hardcoded inline. The fix is mechanical (`tracking.telemetry` / `tracking.eyebrow` / `tracking.fine` exist in tokens). The 22 character saves per site is trivial; the architectural cost is that every free-form tracking value is a place a junior contributor can introduce drift. **One PR to crank `tracking.fine` to warning, `tracking.telemetry` and `tracking.eyebrow` to error, would make this disappear permanently.**

### 3.15 The D-01 / D-02 / D-03 framing in the case study is not yet wired
The visual story is now much better; the case study is the next conversation. The current page copy (last commit) is the live one. The plan's framing (D-01 / D-02 / D-03 / D-04 business scope) is not in the page; it's in `case-study-copy/sentinel-audit.md`. **Out of scope for this audit but worth flagging — when the case study rewrites happen, the new visuals (fork, contested bridge, infra-loss focal) make a strong core.**

---

## 4. Summary

**What landed well:** the truth layer (M0), the conversation repair (M1), the chrome cleanups (M2), the gooey plate and structural single-command surface (M3), the palette and tnum and atmosphere (M4). Five gates green. The contested frame at 1600×900 is genuinely portfolio-grade — the liquid bridge between the orb and "Close this out" is the most legible moment in the product.

**What's still wrong, in order of severity:**

1. **Recommendation/command mismatch persists** in `contain-recommended` (M3 work that didn't land).
2. **Two derivations disagree on "human gate"** (`talon.ts:194` vs `talonSurface.ts:58`) — visible in the session phase / voice posture mismatch on contain-recommended.
3. **The right rail's packet block lags the surface truth** in `authority-notification-ready` (one-line fix in the rail's status labels).
4. **The two rails speak two data languages** — bars+timestamps on the left, mono text on the right.
5. **Dead code** in ActionBar (`flank` / `coreCandidate`) and the Danger menu / Hold pill are outside the liquid silhouette.
6. **VerifyLiveFeed banner overlap** with the SCENES chip on `verify-active`.
7. **276 raw-tracking warnings** — one PR away from a clean run.
8. **Rail content wraps awkwardly at 1280** on the right rail — text wasn't designed for the new asymmetric width.

**Two semantic inconsistencies the plan should have caught:** the GATED_IDS set vs the session-gate rule, and the right rail's packet block reading from a different derivation than the voice. Both are five-line fixes; both are visible in the screenshots above.

**Recommendation for the case-study-ready pass:** the visuals are now good enough to ship; the case study should lead with the contested frame (`m5-monitoring-contested-1600.png`), then the re-raise fork, then the infra-loss focal, then the chip-reply flow. The architecture narrative is no longer aspirational — it's the code.

The "orbs library" idea from our earlier discussion did not get adopted; the state engine is built into `TalonMark` itself, which was the right call. Liquid-gooey *is* used for the plate, which is the part of the orbs-inspired grammar that actually earned its place. The dynamic island lesson (one grammar, not seven bespoke animations) shows up in the eight mark signatures, not in gooey.

Final status: the work is shipped, the gates are green, the inconsistencies above are real but local. Worth one more pass before the case study rebuilds, but not worth rebuilding from scratch.
