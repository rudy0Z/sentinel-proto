# Product, UX & Business Decision Record — the reasoning behind the build

> **Status:** canonical — decision record for build + portfolio defense (2026-10-11).
> **Reads with:** `PRODUCT.md` (identity, principles) · `PORTFOLIO-DIRECTION.md` (portfolio scope) · `docs/sentinel-v2-master-plan/00–09` (product architecture authority) · `docs/redesign-2026/02` (layout rationale), `11` (visual direction), `13` (build plan) · `docs/portfolio-case-study/case-study-v2-framing.md` (pattern scorecard) · `sentinel-layout-thinking/00-layout-thinking.md` (six-voice advisor record).
> **Honesty law for this doc:** every decision traces to an artifact in this repo, a named constraint, or an explicitly labeled hypothesis. No invented metrics, success rates, market sizes, or deployment claims. Where a number exists (48 minutes, 90 seconds), its provenance is stated.

---

## 1. Why this product exists (the decision stack, top to bottom)

Six decisions, each narrowing the next. If any one is wrong, everything below it is decoration.

**D1 — The bottleneck is the decision, not the data.** Traditional initial attack spends 15–25 minutes assembling a defensible first escalation (permits, corroboration, dispatch packet) while fire spreads. Sentinel's wedge is compressing *time to a defensible decision*, not visualizing fire. Source: challenge-brief anchors (48-minute baseline, 90-second target — `PRODUCT.md` §Users), not a field study. **This is why Sentinel is a command instrument and not a GIS viewer.**

**D2 — Therefore the product is an interface problem, not a model problem.** The differentiator is not fire prediction (we have no fire-trained model and say so); it is how a human supervises an imperfect reasoner under time pressure. This is the portfolio thesis in `PORTFOLIO-DIRECTION.md` §1: the human–AI guardrail layer *is* the product.

**D3 — Therefore authority is structural, not policy.** TALON may detect, verify, compute, recommend, stage. The operator sends, deploys, overrides, evacuates, aborts, hands over. Enforced by `GATED_ACTIONS` + `TRANSITIONS` (39 edges, `stateMachine.ts`), expiry-never-execution (`domain/staging.ts`), and a state machine that mechanically refuses illegal moves. A hijacked model's worst case is a strange sentence — never a wrong action.

**D4 — Therefore uncertainty is operational data.** Missing, stale, failed, and conflicting sources stay visible and shape recommendations (`PRODUCT.md` §3). This is what produces the product's only two truly novel scenes: contested watch (operator overrules TALON; TALON holds at reduced weight and may re-raise only past a raised bar) and operator-initiated escalation (operator escalates past TALON's hold; the objection rides with the packet).

**D5 — Therefore the shell is arranged around the authorization moment, not around information browsing.** Every layout decision in §3 exists to keep "what is true," "what it means," and "what I must authorize" simultaneously legible — and to keep the authorize surface physically stable.

**D6 — Therefore the demo must be replayable and honest.** Scripted-first, machine-verified (gates), real-LLM behind a truth guard, honest degradation labels. An evaluator must be able to rerun any state; the case study quotes the gate suite as evidence, so a red gate invalidates published copy.

### What this deliberately is not (recorded, with reasons)

| Not this | Why | Source |
|---|---|---|
| A fire-behavior model or forecasting product | No fire-trained model; honesty boundary | `PRODUCT.md` §7; golden rule 1 |
| A marketplace / economics product | That is a different portfolio study's job | `PORTFOLIO-DIRECTION.md` §2 |
| Multi-incident command | Decision ergonomics depth over breadth | `PRODUCT.md` §5; redesign 00 §G-06 |
| A tablet / mobile product (yet) | Desk console is the canonical container; tablet is a recomposition, not a skin | redesign 02 §2 form factor |
| Hardware bezel / curved-desk cosplay | Claims we cannot honestly make; FUI→product translation must be labeled | redesign 02 §2 |
| Autonomous dispatch | D3 | case-study framing §4 rejections |

---

## 2. The scope contract (what a reviewer should probe)

**In scope (first-class):** TALON conversation quality and derived voice; evidence assembly with confidence *and basis*; bidirectional disagreement with memory and re-raise; authorization gates with hold friction; staged-action expiry; fault scenes with verified exits; receipts; debrief/ICS-209; the verification suite (`verify:machine/signals/flows/routes/attention` + `audit:tokens`).

**Deferred with reasons (say these before asked):** multi-incident (one full simulation — breadth would dilute the decision story); tablet recomposition (desk-first; two containers, one brain); live-LLM UI wiring (server + truth guard exist and are eval-tested; the UI consumer is the last promotion step, deliberate); advanced 3D chase cameras (exploration chrome, not initial-attack C2 — parked in EXPLORE).

**The 90-second metric, stated precisely.** It measures anomaly → gated, receipt-backed mutual-aid *draft*. It does not measure containment. An earlier, larger claim ("48 minutes → 90 seconds including containment") was retracted in writing; the case study tells that retraction as a decision story rather than hiding it (`case-study-v2-framing.md` §2).

---

## 3. UX decision ledger (each with the rejected alternative and its test)

| # | Decision | Rejected alternative | Why | Evidence / kill-test |
|---|---|---|---|---|
| U1 | **Gate at center-bottom, orb dead-center** | Gate in a right-docked column (advisor voice #5 "Co-Commander") | Center is the neutral authorization axis between world (left) and interpretation (right). Putting authorization on the AI's side biases the human — the one claim the product thesis will not trade. | `deriveTalonSurface.ts:174-283` single source; orb posture readable in <200ms (vault 09 §6) |
| U2 | **Split TALON: Hand center / Mind right** | Chat-only right panel; orb-only bottom | The observed disease was split-brain TALON (presence bottom, memory right, chips in an overlay — "eye-tracking pinball"). Split keeps authorization central while giving the conversation a real home. | Mirror parity: any action in the Mind thread renders identically at the gate, both derived from one function (verify:flows "layout v2" set) |
| U3 | **Sticky mirror** | Independent thread + gate actions | Two surfaces showing one action state can never disagree. | flows: thread action ≡ deck action |
| U4 | **Attention spines with lips + tier dots; tap-to-expand, snap only** | Edge-scrub deck of all stacked panels; auto-raise | Scrub implies mounting every panel (perf + determinism); unarbitrated auto-raise is alarm-flood (Rule of One / anti-nag, vault 04 §3.2); gates must never live in a moving surface. Collapsed ≠ blind: each tab carries one live value. | Kill-test: `verify-active → rescue-battery-critical` ≤30s without losing spine position, raise logged |
| U5 | **Attention arbiter: tiers T1–T4, ISA-18.2-style budget ≤2 pops/10min** | Uniform notifications | Instruction-trust collapses under pop floods; every interrupting signal must be actionable. Routine updates badge or log, never interrupt. | `verify:attention` 18/18 (budget, rule-of-one, phase ordering) |
| U6 | **Silent top: truth pills only** | Full navbar with buttons | The top bar is the highest-frequency surface; three narrators (navbar, voice panel, phase pill) was the loudest generic tell. Empty top when clean *is* the signal. | Shell v2 renders navbar only under `?layout=legacy` |
| U7 | **One Command Deck (truth + gate + commands)** | Separate action plinth below the map + navbar above | Two bars cost ~190px of map for redundancy; the deck is the "Hand" in Mind/Hand/Senses. | flows: deck/spines/mind render under `?layout=v2` |
| U8 | **Map dominant, full-bleed between rails** | Panel-grid app frame | C2 precedent (ATAK/Lattice/Gotham): panels subordinate to the map. | captures; 12-draw-call budget |
| U9 | **Light chrome + dark live core (semantic split)** | All-dark console (or all-light) | Dark = live/sensed (feeds, thermal, telemetry, selections) · Light = authored/recorded (rosters, layers, timeline). Serves night ops at 3:47am: resting surfaces calm, only live sensing runs hot. Independently corroborated by FireTrace's parchment/dark-HUD split (same material logic, arrived at separately — worth citing in the case study). | redesign 11 §1; routes a11y 23/23 |
| U10 | **Terrain-clamped overlays; one dataset, two renderers** | Lifted 3D lines; oblique raster under 2D vectors | Floating geometry destroys spatial credibility ("regions flying into the sky" — the doc-10 conviction). One coordinate law across 2D/3D keeps map + panels agreeing. | `verify:map` 9/9 incl. slice-law gates; commit `64bf19d` |
| U11 | **Truth pill + lips typed for instruments (eyebrow, tnum)** | Proportional display type | An operator reads 900+ changing numerals per session; tnum is the single typographic move that stops the instrument from twitching. | `NUMERIC_TNUM` token; audit:design green |
| U12 | **Debrief replay = the only timeline scrubbing in the product** | Live scrub as primary navigation | Scrubbing the operator's own present is incoherent for a live console; the brief asks for the *record* to be inspectable — that is a debrief feature, and it is where forensic affordances (burn progression, fired assets) belong. | `DebriefTimeline.tsx` + ICS-209 exist; playback upgrade scoped to debrief mode only |
| U13 | **Desk-panel canonical; tablet deferred, not averaged** | One responsive layout | Designing the average of two containers produces a good fit for neither (QGC precedent: two UIs, one brain). | redesign 02 §2; DESIGN.md §6 viewport ladder |

> **AMENDMENT — owner ruling 2026-10-11 (supersedes U1–U3 in part; full spec: `docs/redesign-2026/14-final-layout-spec.md`).** The centered orb object is demoted: the map is the hero, TALON is an instrument not an idol. *Unchanged:* authorization stays in the neutral center (never migrates to the AI's side — the thesis trade still refused), gates live only in the one stable surface, one-state-two-renderings via `deriveTalonSurface()`, expiry-never-execution. *Changed:* (a) the orb dies as an object — the aperture mark relocates as a 28px ambient sigil in the right console header *and* as ink on the gate tile itself (vault 09 relocated, not repealed); (b) the voice panel no longer rises from the orb — TALON's home is the right console: ambient header + composed cards (one claim, one numbered action, recommended labeled inline) + sticky voice bar that collapses while listening; (c) the Hand shrinks to a compact 84px command bar — no command bloom, no plinth. Evidence for the change: two independent reference teardowns (ambient-pill AI presence, rail-as-home-screen, keyboard-addressable options, panel-height-as-status, dispose-with-receipt) plus the density case — the centered idol advertises the AI over the incident, and command bloom was consuming the map's most valuable band. New budget: map ≥92% of frame with rails collapsed.

---

## 4. External benchmark: FireTrace (what it validates, what it corrects)

Positioning line for the case study: **FireTrace answers what happened. Sentinel decides what to do.** FireTrace (San Gabriel "Ridgeview Incident", Aug 14–18 2024, cause "Under Investigation", analysis "In Progress") is a forensic playback viewer: it has no gates, no disagreement, no degraded states, no confidence — because a replay has nothing at stake. Sentinel starts where it ends. Not a smaller product; a different one.

**Validates (adopt with confidence):** parchment chrome + single ember accent discipline; tabular numerals + uppercase cap micro-labels as the "instrument" register; context-linked bottom data set switching with the inspected object; ICS vocabulary authenticity (unit designators, agencies, divisions) as credibility craft; the warm-shadow/hairline material family; and — per its author — the claim that craft throughput is now cheap (one engineer + a frontier model). The differentiation must come from decision architecture, not render quality.

**Corrects / adds (the port list, each mapped to a fix or gap):**
1. **Tethered FLIR PiP (docked, EO / IR-Ironbow / IR-White-hot + telemetry strip + HOT detections)** — simultaneously fixes our worst live-layout defect (verify feed covering the map stage, colliding with the Mind console) and adds the signature affordance. **Highest leverage single port.**
2. **Satellite ortho draped onto the existing USGS 3DEP mesh** — we already have `dem.bin` + the slice law; this is texture mapping, not a rebuild. Biggest visual gap closed at lowest cost.
3. **Terrain clamp everything** (raise the P0-4 bar from "clip to horizon" to "drape onto the mesh"): zones, routes, rings, suppression lines.
4. **NWCG metric layer** (ROS ch/hr, ERC, fine fuel moisture, flame length) — sourced already in the info-design package; makes the velocity story domain-true instead of asserted. Lives in the deck truth cluster + evidence layer.
5. **Debrief scrub-driven replay** — upgrades `DebriefTimeline` from log rows to playback (perimeter growth, asset tracks, receipts landing). Debrief mode only (U12).
6. **Grammar steal, fleet skip:** agency/division/personnel/chains language → Readiness panel + debrief KPIs. Do **not** add fixed-wing suppression (VLAT/C-130/Hotshots) — that is a different product's scope creep.

---

## 5. Business & positioning decisions (honest framing, no invented numbers)

**What this project is for.** The portfolio's deep study ("the seller", `PORTFOLIO-DIRECTION.md` §2). It proves one hireable claim: can this person design an AI-native product end to end — conversational UX, oversight models, verification tooling — with judgment about what *not* to build.

**Who it serves in-world (pick and say it out loud).** The desk console authenticates as the **EOC watch-officer seat** — the command-center operator supervising autonomous response, in a dim room, at 3:47am. The documented field reality (IC on a rugged tablet) is deliberately not the lead persona; the tablet is a future recomposition of the same brain. This choice changes copy, not layout.

**Why the gates are a business decision, not just QA.** In AI-native products, the reviewable artifact *is* the trust product. A replayable decision log, machine-enforced authorization, and a green gate suite are what a buyer (or interviewer) can actually inspect. The verification suite is quoted as evidence precisely because it makes claims falsifiable.

**Commercial framing (labeled as hypothesis, not claim):** the realistic buyer hypothesis is an incident-command or drone-operator vendor adding a supervisory-autonomy layer where accountability is contractual (mutual-aid notification, evacuation authorization). Untested — no deployment, no LOIs. State it as a hypothesis if asked; do not inflate it.

**Metrics the business cares about, honestly mapped:** velocity = time to defensible first decision (the 90s, precisely scoped, §2); clarification = share of TALON turns that name their evidence basis and conflicts surfaced vs silently resolved (target: zero silent); trust = zero-by-construction counters (actions executed without a receipt; gate bypasses reachable from any state; staged actions that executed on silence; repeated pitches without new evidence).

---

## 6. Interview defense — the questions seniors actually ask

**"Why is TALON center-bottom and not right-docked like Copilot?"**
Because that placement is the thesis made visible: the human is the axis between world and interpretation. Copilot conventions optimize reading flow; Sentinel optimizes decision authority. And it isn't chat-only: the Mind thread lives right — the split is deliberate (U1/U2), with the mirror guaranteeing the two can never disagree.

**"What happens if the operator just ignores the gate?"**
Silence approves nothing. A staged action expires back to watch; expiry is logged; expiry is never execution. If the operator never engages the *first* interrupt, the escalation protocol routes the decision to a secondary operator after 15 seconds — TALON still dispatches nothing. Both behaviors are flows-tested.

**"A chat panel seems more usable."**
For exploring a brief, yes. For a 90-second authorization under consequence, conversation normalizes the gate into "just another message," and it puts authorization on the AI's side. We keep chat — in the Mind thread — precisely so the decision surface isn't one.

**"How do you know this works? Did you test it with operators?"**
Not field-tested, and the case study says so. What is verified: a 39-edge state machine audited for reachability and dead ends, 22 interaction flows, 23 routes with a11y checks, an attention-arbiter contract suite, and the 30-second kill-test for the interaction model. Confidence is stated as architecture plus replayable evidence, never as user outcomes.

**"FireTrace exists. Why does yours need to?"**
Different job: replay vs decide. FireTrace has no gates, no dissent, no degraded modes — because nothing is at stake. Also note the meta: it was built by one engineer with a frontier model. Render craft is now cheap; the scarce work is the decision architecture — constitution, dissent, attention budgets, receipts. That's the part that wins.

**"Why is the whole thing light-themed — I thought ops tools are dark?"**
It isn't: light chrome is *authored record*, dark is *live sensing* (map, thermal, telemetry, selections) — the semantic split from U9. It serves a dim room and 3:47am, and the split is what keeps glare off the operator's resting surfaces while letting live data run hot.

**"What did you cut, and why?"**
Multi-incident, tablet, fixed-wing suppression, chase cameras as core nav, marketplace features, autonomous dispatch. Each is recorded with a reason (§1/§3). The strongest product decisions in this repo are in that table.

**"What breaks first if this were real?"**
Multi-incident (one full simulation by design), refresh-rate honesty (prototype data is scripted; live gateway exists but is unwired by choice), and the attention budget at scale. All three are labeled in the repo rather than papered over.

**"How would you validate with real operators?"**
NWCG run-card conformance on the plan vocabulary; a tabletop with real ICS roles watching the 90-second arc; measure clarification (did TALON ask before arguing?) and gate-completion without position loss. The kill-test already encodes the second.

**"Your 90 seconds — prove it."**
It ends at a gated, receipt-backed mutual-aid draft — not containment. The larger claim was retracted in writing and the retraction is part of the story. The 48/90 anchors come from the challenge brief and are labeled as such.

---

## 7. Open decisions that block the next build waves (owner calls)

1. **Debrief replay scope** — full scrub-driven map replay (perimeter growth + assets + receipts) or timeline + receipts only? (Drives the debrief wave.)
2. **Ortho source for the terrain drape** — texture-map the existing overhaul raster onto the 3DEP mesh, or pull a fresh satellite ortho? (Drives cost of the single biggest visual win.)
3. **Persona lead in copy** — EOC watch officer (recommended, matches desk canonical) vs field IC on tablet. Copy only, not layout.
4. **Token debt ordering** — the 5 standing `verify:design` violations are Phase A of the build plan (`13-build-plan-a-to-z.md`); confirm they land before the FireTrace ports so captures are honest.

## 8. Traceability

Decision → artifact: U1 `talonSurface.ts` + CommandDeck · U2/U3 `TalonMindConsole.tsx` + flows mirror check · U4 `AttentionSpine.tsx` + kill-test · U5 `domain/attention.ts` + `verify:attention` · U7–U9 `SentinelShell.tsx` v2 regions + `kit/` · U10 `SpatialMapCanvas.tsx`, `verify:map` · D3 `stateMachine.ts` (`GATED_ACTIONS`, 39 edges) + `domain/staging.ts` · D6 gate suite in `package.json` · §4 benchmark `sentinel-layout-thinking/` + the 57-frame teardown · honesty `PRODUCT.md` §7 + golden rule 1.
