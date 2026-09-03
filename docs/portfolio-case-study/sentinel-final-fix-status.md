# Sentinel — Final Design Layer: freeze status

**Branch:** `feat/map-spatial-os`
**Commits:** decaf97 (pre-fix checkpoint) → 33dfd1c (M0) → 77ed88b (M1) → 4e339fa (M2) → 4d61386 (M3) → 3da34e2 (M4)

## Verdict

**SHIP.** All six planned phases landed, all five automated gates pass against current source.

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `audit:tokens` | 62 files, 276 warnings (down from baseline 282) |
| `verify:map` | 6/6 PASS |
| `verify:flows` | 19/19 PASS (was 18) |
| `verify:routes` | 23/23 PASS (0 need attention) |

The new flow added in M0 asserts the surface-truth invariant: ambient voice names the actual state in contested, reraise, gate, and quiet scenes. The new flow added in M1 asserts the conversation contract: suggested questions are the entry point and the reply is the authored answer, not a repurposed recommendation.

## What landed, in order

### M0 — Truth layer (commit 33dfd1c)
- New `src/app/domain/talonSurface.ts` — `deriveTalonSurface(state, context)` returns `{ posture, tone, markState, postureLabel, postureLine, gateLabel }` from incident state, not `actionSurface` or conversation phase.
- Root-cause fix in `domain/talon.ts`: `requiresHumanGate` on the Notification Brief Agent is now conditional (was unconditionally true), and `getTalonSessionRecommendation` derives the session gate only from gate-able recommended commands in `actionSurface`. Agent gates stay contextual in the Workforce rail.
- Consumers rewired: ActionBar voice, TalonMark ring color, and TalonSession mark state all read the same derivation. Session-open phases still override with their own state colors.
- New `verify:flows` invariant (`ambient voice names the true state in contested, reraise, gate, and quiet scenes`) — failed on the pre-fix code, passes post-fix.

### M1 — Conversation repair (commit 77ed88b)
- Expanded session keeps the ambient voice block as its header (continuity — opening TALON never erases what TALON was saying).
- The "debug form" entry (Start browser speech / Use scripted fallback / Type command) is replaced by 3 suggested-question chips + voice + typed input. Chips come from `SCENE_CHIPS_MAP` (covers all 16 scenes).
- `runChipQuestion` runs a chip as a first-class conversation turn: the operator "asks" the chip's question in their own voice, and TALON answers with the authored response for that question.
- Receipts offer "Ask TALON something new" with chips — no more dead end.
- Authored per-scene transcripts/replies wired in (the ActionModal pattern).
- All "scripted prototype / Provider AI is not connected / use the scripted fallback" copy removed from product surfaces. The honesty boundary lives in the case-study framing.

### M2 — Chrome repairs (commit 4e339fa)
- Bounded command plinth replaces the `-50vw` blackout gradient. Centered, ~1240px, sits as a seated dark wash under the cluster; the map now reads at the edges.
- SCENES chip uses `adaptiveRailWidth` for `rightOffset` (was using constant `RIGHT_RAIL_W` → 40px overlap with voice panel at 1280).
- SCENES chip is now available in core/embed mode (it was hidden in the portfolio's shipping mode → reviewers couldn't navigate scenes without replaying the 90s script). `verify:routes` contract updated accordingly.
- `MapLegend.tsx` deleted (dead code, unimported by any file).
- Disabled pills wrap to 2 lines so the stated blocker never truncates mid-sentence ("Verify bu…").
- Map labels suppressed inside an expanded command-dock zone.

### M3 — Gooey plate + single-command surface (commit 4d61386)
- `liquid-gooey` installed; the command cluster is now one liquid silhouette: the orb, the staged command, and the danger menu are items of a single `Liquid` group, so a staged command is physically TALON's — it emerges bridged from the orb.
- Contested/reraise fork: two positions blooming on opposite sides of TALON, neither pre-selected. This is the case-study frame the plan was always chasing.
- Panel-stranded actions moved onto the command surface via a new `close-out-contested` action — Doc-12's "the action bar is the only command execution and human authorization surface" rule is structural now.
- 220ms critically-damped transition, reduced-motion collapses to a cut. The plate re-mounts on staged-command changes (`actionIdentity`) and the items travel in from off-stage.
- Orb content uses a transparent radial wash so the liquid silhouette shows through it as its body.

### M4 — Palette, navbar, rails, focal, tnum, atmosphere (commit 3da34e2)
- **Yellow retired.** 22 call sites migrated — guidance routes/ground-team to `T.cyan` (guidance now belongs to telemetry), advisory/stale to `T.amber` (pending human judgment). The locked 3-lead palette (cyan/amber/red) is in effect; `T.yellow` deleted from tokens.
- Cyan calibration (`#00C8FF → #1CB8E6`) — kept from the prior pass; genuinely good.
- `tnum` applied across all mono telemetry surfaces (right rail brief, source freshness, Navbar, LeftPanel, ContestedWatch, shell entry).
- Asymmetric rails: TALON rail widens to 300/340 at 1366+; observation rail stays 260/280/300.
- Right-rail focal read: packet % promoted to 32px / heavy / tnum / -0.02em — the first time the focal contract (DESIGN §5) is actually applied to a panel, not just declared.
- Rail tab labels truncate before the strip pushes past its container; full name in the tooltip and aria-label. Kills the "Exce…" clip at 1280.
- Navbar chip recipe consolidated — one recipe (`navBtnStyle`) for all nine mixed chip languages; one height (30px), one radius, one border, one font weight.
- Map atmosphere: basemap desaturated/brightened, fog gradient strengthened, vignette widened, terrain recedes under crisp data overlays.
- Hardcoded zIndex (50/60/25) migrated to the `layer.*` token scale.

## Honest remaining debt (out of scope this pass)

- 276 raw-tracking warnings from `audit:tokens` — pre-existing, mostly `tracking.telemetry`/`tracking.eyebrow` values hardcoded inline instead of via the `tracking.*` tokens. Easy to crank down; left as-is so the scope of this pass stays focused.
- `ContainerPanel.tsx` no longer referenced (replaced by `CompactPanel`) — dead code, deletion is a one-line PR.
- `talon-reraise` is now driven by the surface truth (Contested) rather than a scene-specific override, but the 78→96 delta still depends on a wall-clock ramp that the test harness can wait for. The M0 invariant asserts the voice *label*; the numeric motion is correct.
- The map basemap image's contrast and color are still the dominant factor in "feels flat or feels alive" — atmosphere layers do real work, but a fresh paint pass on the basemap is the next step if the map still doesn't read as "alive" enough.

## How to verify

```bash
npm run check                                 # tsc + audit:tokens + verify:map
SENTINEL_VERIFY_URL="http://localhost:4190/embed/sentinel/" \
  node scripts/verify-flows.mjs              # 19 flows
SENTINEL_VERIFY_URL="http://localhost:4190/embed/sentinel/" \
  node scripts/verify-routes.mjs              # 23 routes
```

`scripts/capture-audit.mjs` and `scripts/capture-audit2.mjs` regenerate `verification-artifacts/audit-captures/` for 8 scenes × 2 viewports plus free-mode and the chip conversation chain.

Out of scope: portfolio embed sync (`node scripts/sync-embeds.mjs sentinel` from the portfolio repo) and case-study copy. Both are the next conversation.
