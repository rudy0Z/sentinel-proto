> **Document Status**: canonical
> **Type**: Interview defense record — product, UX, and business decision reasoning
> **Scope**: Every decision a senior interviewer or design director would challenge,
> with the answer, the evidence, and the honest limitation.
> **Date**: 2026-10-11
> **Authority note**: This document does NOT override `PRODUCT.md`, the vault `00–09`,
> or `DESIGN.md`. Where this document records a decision that is *not yet enforced in
> code*, it is marked 🔴 and cross-referenced to `docs/audit-2026-09/00-MASTER-AUDIT.md`.

---

# How to use this document

This is not a spec. It is a **defense record**. For each decision it answers three
questions a hiring panel will actually ask:

1. **What did you decide?**
2. **Why this and not the obvious alternative?**
3. **What can go wrong, and what did you do about it?**

The third question is the one that separates a portfolio piece from a designer's
portfolio. Every 🔴 below is a **known, unfixed defect I found myself**. A candidate who
volunteers those is stronger than one who claims there are none.

**Rule for the interview:** never quote a number that isn't in
`docs/portfolio-case-study/talon-model-boundary.md` or proven by a gate in `package.json`.

---

# Part 0 — The one-paragraph answer

> Sentinel is a wildfire emergency-response command instrument where an AI agent
> (TALON) detects, verifies, and prepares, but a human operator authorizes every
> consequential action. The design problem is not "make a nice dashboard" — it is
> **how do you make an AI's recommendations trustworthy enough to act on, and
> legible enough to audit afterwards?** So every major UI decision serves trust:
> gates are visible, uncertainty is displayed, disagreement is recorded in both
> directions, and nothing executes on the agent's authority.

That paragraph is the answer to "what is this product about." Every subsequent
decision hangs off it.

---

# Part 1 — User & context decisions

## D1.1 Who is the user?

**Decision:** A named, trained operator (Asha Rao) with *authority*, not a
browsing analyst.
**Evidence:** `PRODUCT.md:9-13`; `mockData.ts:124`; `Navbar.tsx:714` renders
`A. Rao · on authority`.

**Why not a generic "user"?** Because the entire safety architecture depends on the
user having *authority to authorize*. An analyst without authority cannot be the
subject of a hold-to-authorize gate. Naming the role also forces me to answer
"what does this person lose if I'm wrong?" — which is the question that actually
drives the UI.

**Senior challenge:** *"Where did the persona come from?"*
**Honest answer:** It is authored from `PRODUCT.md`, **not from primary research**.
`docs/case-study-research/01-user-journey-map.md:4` says so explicitly: *"no user
research exists; journeys model the intended experience from PRODUCT.md."*
The 48-minute→90-second target is also brief-supplied, not measured
(`PRODUCT.md:15`). What I *did* do is ground the decisions in public doctrine —
NWCG fire behavior, ICS-209 reporting, ISA-18.2 alarm management — so the
reasoning is falsifiable even though the persona is not validated.

**🔴 The honest gap:** I cannot claim user research. I claim *documented
domain doctrine + a self-audited interaction model.* That is a weaker claim and
it is the true one.

---

## D1.2 What is the job to be done?

**Decision:** Compress *signal → source-aware authority notification* while keeping
consequential decisions human. (`PRODUCT.md:19`)

**The 7-beat journey** (`PRODUCT.md:21-29`) and the 90-second choreography
(`docs/sentinel-v2-master-plan/03-…md:121-128`):

| Clock | Scene | Operator question | Consequence |
|---|---|---|---|
| T+00 | `baseline` | What is nominal? | none |
| T+12 | `alert-command` | Why was I interrupted? | T1 |
| T+20 | `investigation-pending` | What is the scout doing? | commit a drone |
| T+45 | `verify-active` | Is this fire real and urgent? | peak load |
| T+75 | `authority-notification-ready` | Do I send this draft? | **human-approval** |
| T+88 | `contain-recommended` | What is the tactical plan? | staging |

**Why the clock matters as a design constraint:** it forced me to design for a
*single* dominant action per scene, not a dashboard of many. See D3.2.

**Senior challenge:** *"90 seconds to what? What's the baseline?"*
**Answer:** The brief claims 48 min → 90 s. I did not measure it. What I designed
is the *shape* of the compressed flow — and I can defend the shape because each
scene has one question and one dominant action.

---

## D1.3 Why two phases (Intelligence / Operations)?

**Decision:** `intelligence` (detect → verify → escalate) and `operations`
(post-notification → contain → rescue). `tokens.ts:555-565`.

**Why:** The authority boundary *is* the phase boundary. Before notification,
TALON is proposing. After, it's supporting field operations. Different risk
classes → different UI density.

**Design consequence:** `attention.ts:94-110` makes arbitration
phase-conditional — *"evidence leads in Intelligence, exceptions/blocking signals
lead in Operations."* Same arbiter, different priorities per phase. That's how
you avoid two different systems.

---

## D1.4 Handover as a first-class decision

**Decision:** Shift change is a PIN-authenticated transfer with an
**ambiguous-authority window**, not a log line.
**Evidence:** `stateMachine.ts:408-420`; `microcopy.ts:188-192` —
*"Until the incoming shift lead enters the PIN, no operator holds authority: gates
stay locked… nothing executes in between."*
**Rationale documented:** archived plan — *"operators experience extreme fatigue,
and shifts rotate mid-incident. Handover points are historically the #1 source of
coordination disasters."*

**🔴 Not actually reachable in the running product.** `handoff-pending` is
deep-link only; the shipped handover modal just swaps `activeOperator`
(`ActionModal.tsx:761-767` hardcodes PIN `8842`). The scene exists; the enforced
ambiguity window does not.

**Interview value:** this is a case where I designed the *right* interaction and
didn't finish wiring it. Say that plainly — it reads as honest scoping, not failure.

---

# Part 2 — The decision model (what the operator actually decides)

## D2.1 The gate taxonomy

**Decision:** Four gate levels, not a boolean (`tokens.ts:855`):
`none | confirm | hold | human-approval`.

Across 25 commands (`commands.ts:37-255`): **6 none · 15 confirm · 1 hold ·
3 human-approval**.

**Why graded gates instead of one confirm?**
Different consequences need different friction. Confirming "deploy backup drone"
(despawn cost) shouldn't equal "send authority packet" (legal + life-safety).
The 2-second hold exists specifically for the irreversible one.

**Senior challenge:** *"A 2-second hold is trivial friction — is it security?"*
**Answer:** No, and I never claim it is. It's a **deliberate-friction ritual** —
its job is to convert an automatic action into a deliberate one, and to make the
button itself show the progress (the fill advances across the command). Real
security would be server-side auth; this is a human-factors control.

---

## D2.2 The two-step packet (prepare ≠ send)

**Decision:** Authorizing packet *preparation* and authorizing the *send* are two
separate human-approval gates.
**Evidence:** `ActionModal.tsx:349-377` — *"You are authorizing preparation only.
A separate, explicit send gate remains before authorities are notified."*
`stateMachine.ts:240` — *"The 90-second promise ends here: a human sends the
packet. TALON never sends it."*

**Why:** This is the single most important trust decision in the product. A
reviewer who sees one "send" button will never trust the AI. Two gates makes
"the agent cannot send this" visible, not just documented.

---

## D2.3 The operator's decision surface is derived, not static

**Decision:** `deriveActionSurface` (`SentinelShell.tsx:3172-3365`) computes what
the operator can do from scene + evidence + gates. Disabled commands always carry
a **blocker reason**, never just dimmed.

**Examples:**
- `investigation-pending` → dispatch disabled with live ETA
  (`Available when Lidar-02 reaches site (ETA: Xs)`).
- Containment authorize disabled until coverage && guidance && teams notified
  (`SentinelShell.tsx:3159-3161`).
- Fault scenes → authorize blocked with the reason in the copy
  (*"Satellite feed required before authorization"*).

**Why:** "You can't do this yet, and here's why" is a decision-support statement.
A greyed button with no reason is a bug report waiting to happen.

---

# Part 3 — Safety & honesty architecture

## D3.1 GATED_ACTIONS lives in the state machine

**Decision:** The gated-action set is defined *in the transition table*
(`stateMachine.ts:72-77`), consumed by the shell, TALON surface, and deck.
**Why (documented in code):** *"Home is the transition table itself, so the gate
catalog and the table it protects cannot drift."*

**Interview point:** This is anti-drift architecture. A designer who treats safety
as UI is doing it wrong; it has to be structural so a later component can't
quietly bypass it.

---

## D3.2 Staged actions expire back to watch — expiry is never execution

**Decision:** A staged recommendation has a 45 s TTL (`staging.ts:13`).
On expiry it demotes `recommended → available` **only for gated actions**, enforced
at the *derivation layer* (`staging.ts:29-40`) so it can't re-present as
recommended. Log line: *"Staged 'X' expired unactioned — returned to watch. Nothing
executed."* (`SentinelShell.tsx:826`)

**Verified by:** `verify-flows.mjs:306-315` asserts the staged marker disappears
*and* nothing executes.

**Nuance I'd defend:** expiry is *held* while an authorization modal is open
(`SentinelShell.tsx:815-819`) — because the operator is actively engaging the
gate. That's a real edge case a reviewer might not think of.

**Senior challenge:** *"Why 45 seconds?"*
**Honest answer:** It matches the pacing of the 90-second arc — a staged
recommendation that the operator hasn't acted on within 45 s is stale by the
time they finish reading it. It's tuned to the narrative, not derived from user
testing.

---

## D3.3 Bidirectional dissent (both directions recorded)

**Decision:** `disagreement.ts` implements **Direction A** (operator refuses
escalation) and **Direction B** (operator escalates past TALON's hold).

**The three laws** (`disagreement.ts:10-28`):
1. The human decides.
2. **Rejection is not deletion** — an overruled hypothesis stays alive at reduced
   weight with a raised re-raise bar.
3. **Dissent stays attached** — the disagreement rides with the artifact and is
   answered once ground truth lands, *"in both directions, including when TALON
was the one that was wrong."*

**The bar rises by the *reason*** (`disagreement.ts:45-53`):
`False positive: +16 · Incomplete data: +9 · Operational constraint: +4 · Other: +12`
Rationale: *"A 'false positive' call is a strong claim about the world… 'Incomplete
data' is a claim about the evidence, not the incident."*

**Refusal lands in `monitoring-contested`, not `baseline`** (`stateMachine.ts:161-164`):
*"Baseline would erase the disagreement."*

**Override requires a written reason, enforced in the shell**
(`SentinelShell.tsx:502-511` — the move is *refused* until a reason exists).

**This is my strongest single artifact.** It answers the hardest AI-UX question:
*what happens when the AI is wrong?* Answer: the system records that it was wrong,
routes the appeal to a second authority, and reconciles without hindsight.

---

## D3.4 TALON controls information, never furniture

**Decision:** `intents.ts` — TALON can propose `focus_map_zone`, `open_panel`,
`pin_evidence`, `compare_plans`, validated against live state and rendered as
**dismissible proposals with undo receipts**. Header (`:1-10`): *"TALON changes
what the operator sees and how it is framed — never where the buttons are, and
never the gates."*

**Why this matters:** an AI that rearranges your UI is unpredictable and
unreviewable. An AI that *highlights* information but never *moves your controls*
is auditable. This is my answer to "how do you ship AI UX without losing user
agency."

---

## D3.5 Attention arbitration (ISA-18.2)

**Decision:** `attention.ts` enforces **Rule of One** — exactly one interrupting
surface at a time — with a budget of **≤2 pops per 10 min**
(`INTERRUPT_BUDGET = { maxPops: 2, windowMs: 600_000 }`). T3/T4 never pop;
runners-up become badges; routine is logged only.

**Rationale documented in `docs/redesign-2026/02-…md:37`:** un-arbitrated auto-raise
collides with anti-nagging; *"alarm flood operators learn to ignore."*

**UI expression:** `AlertAirspace.tsx` — the top band is reserved for exactly one
thing; *"A quiet top band IS the signal that the board is clean."*

**Verified by:** `npm run verify:attention` — 17 contract checks.

**Why this matters for interviews:** "AI-driven dashboard" is a cliché. My answer
is a *budgeted, tested, single-interrupt arbiter* that shows restraint. Restraint
is a design decision.

---

## D3.6 Attention Spines (what replaced the white rail's role)

**Decision:** The left/right rails are **edge-tab spines** (`AttentionSpine.tsx`)
with a tick-position indicator, not free-floating or auto-arranging panels.
Width collapses to 64px, expands on demand, tick count shows "n of m."

**Why:** This is the middle ground between "everything always visible" (too much)
and "AI auto-raises panels" (D3.4 violation). The operator controls reveal; the
arbiter controls interruption.

---

# Part 4 — Data honesty (the differentiator most candidates miss)

## D4.1 The real/authored split is architectural

**Decision:** Real geography (USGS 3DEP DEM, OSM buildings/roads, ESA WorldCover)
vs authored fire/telemetry, kept in **separate types** (`world.ts:1-22`).
Real data baked from public sources; fire scenario is explicitly authored.

**Labeled in UI at:** prototype eyebrow (`EntrySurfaces.tsx:21`), review dock
(*"Prototype only · 20 scenes"*), read-only queue entries, LIVE-SIM pill, telemetry
`source: scripted|live` lip, AI-degraded badge (`model: "authored-fallback"`).

**The document that wins interviews:**
`docs/portfolio-case-study/talon-model-boundary.md` — *"faking training data with
invented numbers dressed as a model would be a worse artifact than an authored model
that says plainly what it is."*

## D4.2 Confidence is authored, and that's disclosed

**Decision:** Every confidence % is a constant (`talon.ts:429-493`). The telemetry
model is *"a designer's model of what a trained system's output would look like —
without claiming a training corpus this prototype never had."*

**Senior challenge:** *"Is the confidence number real?"*
**Answer:** No, and the product says so. This is the honest posture that
distinguishes a thoughtful prototype from a fake-AI demo.

## D4.3 🔴 The re-raise "evidence" is a clock

**Finding:** `SentinelShell.tsx:464-474` — `evidenceConfidence = talonConfidence +
contestedElapsed`, so the re-raise bar always crosses within ~16 s.
The *mechanism* is real and flow-tested; the *evidence delta* is authored.

**Why this is the most important thing to label:** it's the one place where a
reviewer could feel misled. The audit calls it *"the most important thing to label
honestly in the case study."* Volunteer it.

---

# Part 5 — Design decisions & their reasoning

## D5.1 Orb fixed dead-centre; commands bloom sideways

**Decision:** TALON's orb is fixed at bottom-centre (never moves). Its voice rises
*from behind it*; commands *bloom sideways* (forward right, decline left, danger in
its own menu). `DESIGN.md` §TALON command surface; `09-…md`.

**Why:** In an instrument you want the AI's *state* always co-located with the
*commit control*, so "what it's suggesting" and "what I'm about to authorize" are
one gesture. Blooms keep the cause-effect visible.

## D5.2 Materials: one rail recipe, glass for obsidian

**Decision:** Two surface materials — `material.rail` (frosted, rails/map chrome)
and `material.overlay` (opaque, modals/authorization). *Elevation is an edge, not a
glow* (`DESIGN.md`). Frost is a **material, never a state** — severity comes from
border tone/words, never more blur.

**Why:** Frost lets the map read underneath the rails (context preserved) while
opaque authorization surfaces never compete with the map (safety). One recipe for
both rails prevents "one rail feels denser than the other."

## D5.3 One dominant action per state

**Decision:** Per-scene one dominant command; secondaries adjacent; danger separate;
human gates never hidden behind overflow.

**Why:** Peak cognitive load is T+45 (`verify-active`). One primary action reduces
the decision to a single focal point. Fiori + NASA control-room ergonomics both
support footer-primary.

## D5.4 Status never by color alone; density modes

**Decision:** WCAG 2.2 AA; status via icon/word/border, not color; Intelligence /
Operations / Critical density modes; fire is the *only* permitted light emitter
(`DESIGN.md`).

**Why:** Night ops, degraded feeds, and color-blind operators. The "fire-only glow"
rule keeps the eye on the actual hazard.

## D5.5 Anti-references (defend these)

From `PRODUCT.md:39-48` — I explicitly reject: glowing orbs, military-HUD
decoration, dashboards at uniform weight, voice assistants simulating listening,
**"autonomous-system UI that hides human gates, uncertainty, degraded inputs, or
audit receipts,"** and dev controls in portfolio screenshots.

**Interview use:** "Here are the things I refused to do, and why" is a stronger
signal than "here's what I built."

---

# Part 6 — Business & positioning decisions

## D6.1 What is the moat?

**Positioning:** FireTrace-style tools render the *geospatial truth* beautifully but
have **zero agentic decision-making, zero authorization gating, zero dissent.**
Sentinel's depth is the **supervised-AI governance layer**, with good-enough
rendering.

**The defensible claim:** *"I did not build the best map. I built the trust and
authorization layer that makes an AI's map advice safe to act on."*

**🔴 Disclose honestly:** if compared to a FireTrace-style product, concede they
have better rendering; explain that my thesis is the agent-safety layer and the
rendering is a means to it. Do NOT overclaim ("makes FireTrace look like a toy") —
a reviewer who knows the product will catch it and you'll lose trust.

## D6.2 Non-goals (scope discipline as a feature)

Explicit non-goals (`00-INDEX-…md:88-101`): no FlytBase API, **no false claims of
fire-trained AI**, no multi-incident simultaneous command, no certified fire model.
Multi-incident is a read-only summary queue only.

**Why this is a *business* decision:** it defines the wedge. By refusing
multi-incident command, the product has one defensible story: *supervised AI
authorization in one incident, end to end*, rather than a shallow dashboard of
everything.

## D6.3 Audience for the portfolio

**Decision:** Position for a **product designer applying to AI-tool / safety-critical
UX roles**, not a graphics engineer. The differentiator is judgment + systems
thinking, not rendering fidelity.

**The narrative arc for a portfolio:**
1. The hard problem: supervise an AI that cannot be trusted blindly.
2. The architecture: one state table that *is* the constitution (D3.1).
3. The rituals: gates, staged-expiry, dissent-with-reason (D3.2, D3.3).
4. The honesty: real vs authored, disclosed (Part 4).
5. The self-audit: I found and documented my own safety holes (Part 7).

---

# Part 7 — 🔴 Known defects (volunteer these)

These are real, found by me/audit, currently unfixed. Each has a fix path. A
candidate who names these unprompted reads as a senior engineer-designer.

| # | Defect | Evidence | Severity | Fix |
|---|---|---|---|---|
| 1 | **2-second hold exists only in legacy layout**; default v2 (`layout=v2`) fires `authorize-containment` on plain click | `ActionBar.tsx:766` vs `CommandDeck.tsx:138`; default at `SentinelShell.tsx:183` | **P0 safety** | Wire `HoldPill` into `CommandDeck` for gated actions |
| 2 | **`authorities-notified` edge has `gate:"none"`** yet sets the guarded flag | `stateMachine.ts:378-385` | **P0 safety** | Gate the edge; only the packet-send path may set the flag |
| 3 | **Crypto language over a hashless ledger** — 4 sites say SHA-256 / "cryptographic" but client ledger has no hash | `DebriefTimeline.tsx:68`; `Ics209DebriefModal.tsx:311`; `ActionModal.tsx:779`; `SentinelShell.tsx:1749` | **P0 credibility** | Either implement the hash chain or strip the claims (repo's own golden rule 1 bans this) |
| 4 | **`emergency-evacuate` bypasses the machine** (direct state write, logged as actor "TALON") | `SentinelShell.tsx:1753-1783` | **P1 safety** | Route through `dispatch()` with a real edge |
| 5 | **18 of 39 transition events never fired client-side**; guided run uses raw `setScene` | `SentinelShell.tsx:334,375,380`; audit `:113-119` | P1 | Route the guided run through `dispatch()` |
| 6 | **Staged actions have no cancel** and expiry has no visual (silent demotion + ledger line) | `SentinelShell.tsx:821-833` | P1 | Add cancel affordance + expired state on the tile |
| 7 | **Confidence freshness is frozen** (static `lastUpdated`) yet UI promises a 15-min freshness warning | `talon.ts:436-490` vs `:473` | P1 | Compute real age or drop the promise |
| 8 | **Re-raise evidence delta is a clock** (see D4.3) | `SentinelShell.tsx:464-474` | P1 (honesty) | Label it authored in UI + case study |
| 9 | **Two half-polished shells** (legacy panels un-ported) | `docs/redesign-2026/08-…:64` | P2 | Finish v2 or gate legacy behind flag |
| 10 | **Zones are mouse-only on the map** (the one a11y hole) | audit `:353` | P2 | Keyboard path for zone selection |
| 11 | Server is outside typecheck; client/server ledgers disjoint | audit `:349-352` | P2 | Fold into CI or clearly scope |

**The interview line:** *"I ran a self-audit and it found three P0 safety holes. The
most important was that my new default layout silently dropped the hold-to-authorize
on the one irreversible action. That's the kind of defect you only catch if you
treat your own governance layer as code to be tested, not as UX copy to be trusted."*

That single sentence demonstrates more design maturity than any feature list.

---

# Part 8 — Numbers you may vs may not quote

**May quote (gate-proven):** 20 scenes · 39 edges · 25 commands · 25 browser flows ·
23 route combos · 9/9 map checks · 17 attention checks · 2,495 OSM buildings ·
USGS/OSM/ESA real-data provenance · 12-draw-call 3D budget · on-demand 0-FPS render.

**May NOT quote:** the 48-min→90-sec targets (brief-supplied, not measured) ·
any confidence % (authored) · "hash-chained" (not implemented) · any success rate ·
"trained on fire data" (it isn't).

---

# Part 9 — Hard questions, prepared answers

**"What if the AI is wrong?"**
Recorded both directions. An override requires a reason; the re-raise bar rises by
the reason's epistemic weight; the appeal routes to a *second authority*, never back
to the operator who already said no; reconciliation records whether TALON or the
operator was right, without hindsight. (`disagreement.ts`)

**"How do you know the operator isn't just rubber-stamping the AI?"**
Good question. Mitigations: the declining path is *equally cheap* (one click, and
it records dissent rather than blocking); the system never rewards agreement — a
contested watch is a legitimate outcome; and re-raise routes to a supervisor, so
"just agree with TALON" isn't the comfortable path. I would add instrumentation
(accept/decline ratio) as the next iteration.

**"Why does the AI only get 2 interrupts per 10 minutes?"**
ISA-18.2 alarm philosophy: un-arbitrated popups train operators to ignore them. The
arbiter escalates *priority*, not *volume* — a T1 exception always outranks a T3
evidence update. (`attention.ts`)

**"Isn't a 90-second flow unrealistic for a real wildfire?"**
Yes — and I say so. Real incidents last days. The 90 seconds is the *time-to-first-authority-notification*, not the incident. That framing is why the handover model matters (D1.4).

**"Two layouts — which is the product?"**
Right now that's a real defect (#9): v2 is default but legacy panels are un-ported,
and critically the hold-to-authorize only exists in legacy (#1). The honest answer
is "I'm mid-migration and I documented the safety regression rather than shipping
it silently" — which is the correct engineering posture.

**"What would you do next, professionally?"**
(1) Close the P0 safety holes (#1–3). (2) Retire the legacy shell. (3) Real user
testing with an actual operator persona to validate the 90-second claim. (4) Move
the confidence model from authored constants to a documented, bounded computation.

---

# Appendix A — Decision-to-evidence index

| Decision | Primary evidence | Gate |
|---|---|---|
| Gate catalog is constitutional | `stateMachine.ts:72-77` | `verify:machine` |
| Expiry never executes | `staging.ts:29-40` | `verify-flows:306` |
| Dissent requires reason + bar-by-reason | `disagreement.ts`, `DissentGate.tsx` | `verify-flows:53-121` |
| Single interrupt, budgeted | `attention.ts:39-47` | `verify:attention` (17) |
| TALON can't move furniture | `intents.ts:49-68` | (unit + flow) |
| Map slice-law alignment | `frame.ts` | `verify:map` (9/9) |
| Real/authored boundary | `world.ts:1-22` | — (disclosed) |
| 3D draw budget + on-demand | `worldScene.ts` | HUD (12 calls, 0 FPS idle) |
| Keyboard/a11y | `PRODUCT.md:60-72` | axe in `verify:routes` |

# Appendix B — Doc charter

New decisions made after this date that contradict it should either update it or add
an ADR under `docs/redesign-2026/`. This document is canonical for *defense
reasoning*; it does not change the build authority (vault `00–09` + `DESIGN.md` +
`tokens.ts`).