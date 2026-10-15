# Sentinel Layout Thinking — Master Synthesis

**FlytBase Sentinel · shell/TALON/rails layout reconsideration · rev A · 2026-09-22**
**Inputs:** 6 independent advisor conversations (archived in `sources/`, voices classified below) · `sentinel-information-design/` research package (11 chapters) · AutoCoder session evidence (flow atlas, 39-transition verification, gate catalog, scenario bindings) · `PRODUCT.md` / `DESIGN.md` / vault docs.

**Status:** thinking document, not a decision. It ends with one cascade question and three prototype-ready spikes.

---

## 1. The six voices (classification)

Six conversations, no speaker markers. Classification by method, not personality — each label describes *how* the advisor argued. Six genuinely distinct registers and citation fingerprints — with one flag: **#1 and #2 share identical code-citation ranges and the same flag-proposal signature (`?layout=split` / `?deck=1`), so they may be the same source across two sessions**; #5 and #6 share an ASCII-wireframe style but differ in mandate. Treat as six voices, possibly five people.

| # | Label (archived as) | Method | Core position in one line |
|---|---|---|---|
| 1 | **Code Forensic** (`advisor-1-code-forensic.txt`) | Reads the code first, cites files/lines for every claim | Split TALON: orb/gate stays center-bottom *as the authorization instrument*; conversation moves right with a mirrored sticky action so chat and orb never disagree |
| 2 | **Systems Refiner** (`advisor-2-systems-refiner.txt`) | Turns instincts into buildable specs with risk lists | Yes to navbar-v2 + panel deck + TALON attention protocol, but only as a strict 3-tier system; prototype behind `?deck=1` |
| 3 | **Human-Factors Critic** (`advisor-3-human-factors-critic.txt`) | Adversarial pushback, numbered objections | ~8 hard objections to the deck/slider; refinement: keep tabs + peek headers, TALON never auto-expands, gates never live in a sliding surface |
| 4 | **Instrument Architect** (`advisor-4-instrument-architect.txt`) | Defends the existing frame with evidence, then rebalances roles | Keep the four-surface contract; quieter top truth strip; bottom deck with TALON cradle; left rail scrub stack; tablet = recomposition, not a skin |
| 5 | **Co-Commander Advocate** (`advisor-5-co-commander-advocate.txt`) | Research-benchmark led, form-factor tables | Full right-rail Co-Commander console (Option B): reasoning + evidence + 2s-hold in one vertical column; kill the bottom plinth |
| 6 | **Shutter Engineer** (`advisor-6-shutter-engineer.txt`) | Accepts the futuristic vision, engineers the hazards away | "Tactical Shutter": peeking tabs with live-telemetry lips, indexed jog-slider with detents, pin&peel split; 32px Horizon HUD |

Fair summary: **no voice defends the status quo as-is.** Even the two most conservative (#1, #4) both concede TALON is split-brained today and want a real conversation surface. The disagreement is about *what moves*, not *whether something moves*.

---

## 2. Where everyone agrees (consensus)

1. **TALON is split-brained today.** Presence at bottom-center (voice + pills), memory in the right rail (brief, evidence, workforce), chips in a session overlay. All six voices converge; #5 names it "eye-tracking pinball" (bottom → right → map → bottom for the hold).
2. **The layout is not arbitrary — it's load-bearing.** Center-bottom = neutral authorization axis between "world" (left = what is) and "interpretation" (right = what it means). #1 and #4 both argue this from the product thesis: moving *authorization* to the AI's side of the screen biases the human toward the AI — the one thing Sentinel must never do.
3. **The top bar is underworked.** Everyone wants it thinner, floated, or split into truth-only (incident, phase, clock) with the buttons relocated. Nobody defends the current 44–52px strip.
4. **"TALON controls information" must mean attention, not furniture.** Every voice that engaged the deck idea (#2, #3, #4, #6) landed on the same law: TALON may *signal* ("this panel has news") but must not *rearrange* (raise/swap/steal focus) beyond narrowly defined tiers. Attention is agent-driven; layout sovereignty stays human.
5. **Desk panel and tablet are two containers, one brain.** #4 and #5 independently concluded: design the desk frame as canonical (1920×1080 acceptance), tablet as a recomposition (rails → bottom sheets, scrub interaction actually shines there).
6. **Muscle memory is a safety feature.** The command surface must stay physically stable during a 2-second hold — cited against any interaction that can move the gate mid-gesture. Note: this is also where the sharpest disagreement lives — see D1. Voice #5 (and partly #6) accept the hold *inside* the right console because the column is itself stable; voices #1/#3/#4 read "stable" as *center-bottom, never inside a rail*.

---

## 3. Where they genuinely disagree (the real decision space)

**D1 — Does the orb stay physically central, and where does the 2s hold live?** (Voice #4 calls this the cascade question; the verifier ranked it the sharpest disagreement across all six.)
- Keep central: #1 (split: orb center + conversation right, "gates stay center-bottom… never in deck"), #4 (cradle center + body right), #3 (gates never in a sliding surface, ever).
- Move fully right — including the hold: #5 (unified Co-Commander column with the 2s-hold at the bottom of the rail, bottom plinth deleted), #6 (right Co-Commander console with aperture at top of rail, hold in-rail).
- The disagreement is not aesthetic: #5's column makes cause → thought → consequence one vertical scan and wins touch ergonomics; #1/#3/#4 counter that in-rail gates put authorization on the AI's side and bias the human. This single choice cascades into map height, gate geometry, and the portfolio identity story (vault 09's aperture-closes-at-gate imagery only works where the gate lives).

**D2 — Deck/slider: transform the rails or refine them?**
- Transform: #2 (deck + edge slider + attention protocol), #6 (tactical shutter with detents + peeking live-ticker tabs).
- Refine, don't replace: #3 (tabs + peek headers — "if headers are always visible and tappable, the strip is redundant"), #4 (left stack, right pinned agent).

**D3 — Who wins when TALON has news: attention tier or nothing?**
- #2 proposes auto-raise *only* for gated/blocked states, badges for new-evidence, silence for routine.
- #3 goes further: never auto-expand, badge + operator opens; raises logged like dissent.
- #6 splits differently: peek (16px tab extension + glow + bead) but the flip is always operator-approved.
- #1 doesn't engage (out of scope) but its mirrored-action design requires the raise decision to live in `deriveTalonSurface()` — the same function that colors the orb.

**D4 — How much does the map get?**
- #5: full-bleed, kill the bottom plinth (~140px back), rails tolerate 360–400px.
- #4 and #1: bottom-center commit zone stays; map keeps full frame *between* rails.
- #2 warns the top gutter isn't free space — the current map art convicts the top band as empty night sky; floating pills can occlude northern zones at the wrong moment.

---

## 4. AutoCoder's position (earned from this session's work)

I have now traced this codebase at the transition-table level: 39 transitions verified against `stateMachine.ts`, the gate catalog (18 none / 13 confirm / 8 human-approval / hold-to-authorize), `talonSurface.ts` postures, the 8 mark states, scenario bindings in `SentinelShell.tsx:391-438`, and the atlas graph of 97 nodes. Four convictions:

**4.1 The gates are the product. Everything else is arrangement.**
The most important fact in this codebase is that 8 transitions carry `human-approval` and 3 carry `requiresDissent`, and the shell structurally refuses to move without them. Any layout debate that doesn't start with "where does the human-approval moment physically live" is decorating. This is why I side with voices #1 and #4 against a full right-move (#5): **authorization must not migrate to the agent's side of the screen.** The orb's dead-center position isn't aesthetics; it is the layout's way of saying *the human is the axis*. Voice #5's Option B is the strongest coherent alternative — but it optimizes for reading flow, and the product thesis optimizes for decision authority. When those conflict, authority wins.

**4.2 The split-brain is real, and the fix is the right rail, not the bottom.**
Voice #1's split is the sharpest single proposal in all six conversations: keep the orb as the *authorization instrument* (it already is — the pill *is* the output: "Awaiting your authorization / Hold 2s / Blocked by source conflict"; the brief itself is capped at ~90 words by design, `04 §6`), and promote the right TALON tab into a true conversation thread with a **sticky mirrored action** that always agrees with the orb. Voice #1 adds a de-duplication worth stealing: kill the right rail's `Priorities` tab — Intelligence priorities duplicate TALON's recommendation and Operations priorities duplicate route state. This costs almost nothing structurally (the rail already hosts TalonSession), fixes the connectedness complaint without touching gate geometry, and maps cleanly onto Phase 5 (`TalonConverser` feeds the thread; `StateResolver` still gates the pills). I adopt this as the spine of my recommendation.

**4.3 The deck idea is right about the disease, wrong about the cure — twice over.**
The disease: rails are static tab stacks that don't *express* "the situation just changed." That's a genuine gap, and the information-design package independently ranks "tiered alert hierarchy" as blocking gap #1 (ch06) — the instinct matches the research.
But the cure fails on code facts:
- Continuous scrub implies mounting all panels at once; today only one `RailView` renders (`RailStack.tsx:250-253`). That's a DOM/perf and determinism hit on `verify:routes` evidence.
- Auto-raise without arbitration collides with Rule of One + Anti-Nagging (`04-TALON-AI-AGENT-CONSTITUTION.md:59-64`) — voice #3's "who wins when battery-critical and source-conflict fire together" has no answer in the current design.
- Gates in a sliding surface violate DESIGN.md's one stability guarantee. Non-negotiable.

The surviving cure — slightly stronger than #3: **peek headers on both rails + a 3-tier attention protocol derived from `deriveTalonSurface()` (gated/blocked → pulse; new-evidence → badge+count; routine → silent dot) + TALON may *propose* focus with an "opened by TALON · undo" receipt, never auto-swap.** If the tactical-shutter mechanics are wanted anyway, adopt #6's parameters as the ceiling: 36px tab lips carrying live telemetry, 16px peek extension with glow + bead, flip always operator-approved. Raise events log to the activity ledger — voice #3's receipt point is correct and it matters for the debrief/handover story (an incoming lead in `handoff-pending` must inherit a legible deck, not someone else's unlogged auto-raises).

**4.4 Navbar: the three-pill truth strip is the convergence answer.**
#3's "3 floating pills (incident / phase+arc / clock)", #2's "accountability + time + phase, nothing else", #6's 32px Horizon HUD, and #4's "quieter top" all describe the same object. Timeline → Ledger, Debrief → command overflow, Queue → map chip. The empty top should get *lighter*, not fuller — and ch07 of the information-design package provides the component inventory without inventing new primitives.

**My addition that no voice made explicitly:** the atlas work showed Sentinel's flows have a *phase grammar* (Intelligence ⇄ Operations) the shell already derives from `OperationalMode`. The strongest version of "TALON controls information" is **phase-conditional density**: attention tiers weighted by phase — in Intelligence, evidence badges lead; in Operations (rescue), exception/blocking signals lead. The machinery (`mode` in `TransitionContext`, density modes in DESIGN.md) already exists; this connects the layout instinct to the state machine instead of inventing a parallel system. That's the defensible "extreme futuristic": a dashboard whose attention economy is derived from the same single source of truth that colors the orb.

**Form factor:** desk-embedded panel is canonical (matches 1920×1080 acceptance in DESIGN.md; arm's-reach bottom-center actually favors the orb, per #1's ergonomics). Tablet is a recomposition target, not a redesign: same state machine, same gate geometry, rails → bottom sheets, scrub/peek interactions become primary there. Do not design an average of the two — QGC ships two UIs; that's the precedent. The external evidence base the voices drew on, for the record: QGroundControl (dual desktop/tablet UIs), SAP Fiori (footer = workflow primaries), Figma's left-side-AI-replacing-navigation failure case, M365 Copilot (right-docked assistant convention), SpaceX-Dragon/Palantir-style horizontal decks (#5's Option C lineage).

**Kill-test (adopted from #3, endorsed):** `verify-active → rescue-battery-critical` inside 30 seconds. If the operator can finish the 2s hold without losing rail position and with the raise logged, the interaction model lives. If the raise interrupts the hold, it dies.

---

## 5. Prototype-ready spikes (no full rewrite needed)

| Spike | What | Where | Answers |
|---|---|---|---|
| S1 | Right-rail TALON conversation thread + sticky mirrored action | `?layout=split` (voice #1) | Does connectedness improve enough without moving the orb? |
| S2 | Peek headers + 3-tier attention protocol + proposal-with-undo | `?deck=1` (voices #2/#3/#6, corrected) | Does the deck *feeling* survive with tabs + peeks instead of a scrub strip? |
| S3 | Three-pill floating navbar + rebalanced top | navbar v2 branch | Does the top get quieter without becoming a void? (Watch the empty-night-sky risk, `10-EXECUTIVE-DESIGN-AUDIT.md:38-44`) |

All three keep the same views/state/RailView IDs so `verify:routes` / `verify:flows` evidence stays valid (voice #2's warning). Compare each against default in the same scene pair; run the kill-test on S2.

---

## 6. Open questions this document deliberately does not settle

1. **The orb-cascade question (D1)** — the sharpest next debate. If the conversation body proves its worth in S1, ask whether the *cradle* (hold-gate geometry without the full orb) can carry the identity at center while the aperture mark migrates right. That's an identity redesign (vault 09), not a layout tweak — treat it as its own project.
2. **Multi-incident operability** (ch06 gap) — the deck concept secretly assumes one incident; the information-design package flags multi-fire as unsolved. Layout v2 should at least not hard-code single-incident assumptions into the deck spec.
3. **Haptics/detents** (#6's jog-slider) — physical desk panels may support this; the web prototype cannot. Keep as a hardware-contingent note, not a spec commitment.
4. **Voice input placement** — none of the six voices engaged the voice axis seriously. Flagged, not resolved.

---

## 7. Concrete numbers and a bug the discussions surfaced (kept for the spec)

- #5's column budget: right console 360–400px; left dock collapses to a 48px icon strip; killing the bottom plinth returns ~140px of map height; #5's bottom-deck Option C assumes ~240px of deck height.
- #2's evidence-budget warning: `verify:routes` runs 23 scene combos; the orb spec's 12-draw-call budget (`09:116`) is the perf ceiling any deck must respect.
- #6's mechanism parameters: 36px live-ticker tab lips, 16px peek, indexed jog-slider detents — hardware-contingent, but the *dimensions* are usable in the web prototype.
- **A real shell bug found by #4 while reading:** `ExceptionBanner` / `VerifyLiveFeed` inset by the *left* rail width on the right side too — at 1920 they can paint under/over the wider right rail. Small drift, but fix it before any layout spike so spike comparisons are honest.
- Handover receipt gap: deck auto-raises must write to the activity log or `handoff-pending` inherits an unexplainable arrangement.

## Provenance

- `sources/advisor-1..6-*.txt` — the original pasted conversations, renamed by classification.
- `sentinel-information-design/` — the research package (11 chapters) referenced above; ch02 (evidence kinds), ch03 (decision matrix), ch06 (gaps), ch07 (components) are the load-bearing chapters.
- Session evidence: flow atlas data (`sentinel-reports/sentinel-flow-atlas-sources/atlas.json`), `review.md` (14 checks), and the discrepancy log (3 docs-vs-code conflicts).
- Verification: an independent verifier pass (2026-09-22) confirmed all six classifications with verbatim quotes, ranked consensus (gate stability 5–6 files, attention-not-rearrangement 4, slim navbar 4, desk≠tablet 4–5), flagged the #1/#2 possible same-source pairing, and contributed the §7 facts. Log: `sources/review.md`.
