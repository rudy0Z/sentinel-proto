# Build Plan A→Z — the one pass that lands the new direction

> **status: canonical** (2026-10-03). Execution plan for the full redesign build agreed in conversation 2026-10-03 ("build the full plan A to Z in this pass"). Implements `11-component-and-visual-direction.md` (component/visual direction) and `12-ui-direction-explainer.html` (the layout + surface map). Owner call delegated to the agent: **the v2 shell is promoted to default**; the legacy shell stays behind `?layout=legacy` until Phase K gates pass, then the flag is retired in the follow-up cleanup.

---

## Decisions locked (from the direction docs)

1. **Surface law:** calm light chrome (rails, session, cards) · dark instrument core (map, feeds, deck, gate). One accent + semantic triad (amber caution / red alert / green clear). All via `tokens.ts`.
2. **Layout:** v2 shell = truth pills · attention spines (left) · map stage (center) · TALON Mind thread (right) · Command Deck (bottom, gate center). Sticky mirror: thread actions mirror at the gate from one `deriveTalonSurface()`.
3. **Primitives:** CommandButton (top-view chamfered key, press travel, gated verbs only), SegmentedCells (threshold colors, no tilt), dashboardcn-grammar cards.
4. **Map:** 7-layer stack; clip zone overlays to the terrain horizon (P0-4); spread-ring age badges; airspace layer (geofence + range rings); flow animates proposed movement only; chip-vs-chip collision suppression.
5. **Honesty law unchanged:** expiry never executes; stale data reads stale; gates center-bottom.

## Phases

| Phase | Work | Acceptance |
|---|---|---|
| **A · stop the bleeding** | 5 `verify:design` violations (kit/core.tsx:356 fontSize 9, kit/viz.tsx:173 fontSize 28, CommandDeck.tsx:86 glow boxShadow, ComponentsPage.tsx:513 fontSize 22); P0-1 dead "Open TALON session"; P0-2 EXPLORE toggle occluded by deck; P0-3 posture line ellipsis; P0-4 zone overlays over sky | `verify:design` green; session expands by click; toggle clickable; posture shows full line (2-line clamp); zones clip at horizon |
| **B · one shell** | v2 = default; `?layout=legacy` fallback; entry copy that exposes plumbing moves to README | Plain URL renders v2; flows pass both layouts |
| **C · token tier** | light surface tier + core tier in `tokens.ts`; `npm run tokens:css` | audit:tokens warnings down; no new violations |
| **D · primitives** | CommandButton (key), SegmentedCells, card/chip restyle in `kit/` | key used only on gated verbs; cells threshold-colored |
| **E · spines** | AttentionSpine lips carry live values + tier dots; fix `gap: 10` drift in touched files | collapsed ≠ blind in captures |
| **F · TALON Mind** | session thread reachable + sticky mirrored action; ToolTrace + evidence chips + plan card | thread opens from deck; mirror matches gate |
| **G · Command Deck** | two-line posture clamp; CommandButton on AUTHORIZE; staged tile with expiry ring; remove glow | no truncation at 1920; glow gone |
| **H · map overlays** | age badges on spread rings; airspace layer (geofence polygon + range ring); route flow on proposals; label collision suppression | zones clipped; badges render; no chip collisions in the 3 audited scenes |
| **I · typography** | hierarchy pass: display/mono roles via `typeStyle`; tnum on all numerals | no novel sizes (audit clean) |
| **J · drift + hygiene** | legacy neon purge (`theme.css`, `TalonCopilotPanel.tsx`, `mockData.ts`); `verify:attention` wired into package.json; AGENTS.md corrections | docs match reality; `npm run verify:attention` exists |
| **K · gates + evidence** | `verify:design` + `verify:flows` + `verify:routes` + `verify:machine` + `verify:signals` + `verify:attention`; fresh captures into `verification-artifacts/build-2026-10/` | all green; captures committed |

## Kill-test (unchanged from layout doc)

`verify-active → rescue-battery-critical` inside 30 s: the operator finishes the 2s hold without losing spine position and every raise is logged. If a raise interrupts the hold, the interaction model is wrong.

## Out of scope (recorded, not built)

- Real adapters/staleness watchdogs (G-13 honesty stays: prototype data).
- Multi-incident queue (deferred per data map G-06).
- Tablet recomposition (desk console is canonical).
- dashboardcn/rosencharts/gauge-ui/mapcn/flightcn as literal dependencies: the direction adopts their **grammar**; the prototype keeps its zero-dependency kit so the token audit stays enforceable. A production port is case-study material.
