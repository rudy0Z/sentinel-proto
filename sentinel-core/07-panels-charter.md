# 07 — The Panels Charter — what every panel is, and why it exists

> **status: canonical — the content contract.** This file answers the owner's question — *"what are the panels we're supposed to show, what does each show, and how is it relevant?"* — from the founding UX problem outward, grounded in the repo's own research set (information-design ch02/ch03/ch07, the 30-row decision matrix, the flow atlas), the current build, and fresh benchmarking of real products (DroneSense OpsHub, Skydio DFR Command, ATAK/CivTAK, Percepto AIM, Anduril Lattice, Technosylva WFA, ICS-209). It also answers the owner's strategic question: **panels-and-data are the product; visual direction is the carrier** — and it defends the bottom-oriented layout as intentional.

---

## 0. The founding problem (the north star every panel answers to)

**03:47.** The operator is four hours into a night shift, cognitively loaded, and a fire call drops — then a second, bigger one. Sentinel exists to absorb exactly that load. The test for every panel: *does this reduce what the operator must read and hold in their head during the worst minute of their night?* A panel that only displays data — without serving a decision — is load, not relief. That is the defense, and it is also the answer to "AI can do everything, so what am I?" (§5).

## 1. The decision spine (panels earn their place by serving these)

From the 30-row operator decision matrix (information-design ch03), compressed to the nine decisions that define the 90-second arc and the operations tail:

| # | Decision | When |
|---|---|---|
| D1 | Is this real? (accept / reject the alert) | 0–15 s |
| D2 | How big, where, spreading which way? (size-up) | 15–45 s |
| D3 | Do I escalate, and to whom? (authority gate G1) | 45–90 s |
| D4 | What flies first? (commit first resource) | Operations |
| D5 | Who is exposed? (structures, civilians, crews) | always |
| D6 | Which containment plan, which route? (G2) | contain |
| D7 | Which zones evacuate, when? (G3) | rescue |
| D8 | What broke, and what's the fallback? (exceptions) | any |
| D9 | What happened? (debrief, handover) | end |

## 2. The mental model — five regions, five questions

The layout the owner built (deck bottom, map center, rails at the sides, sky kept clear) is **kept and completed** — it just never had its content contract written. The five regions answer five questions, in the order a stressed brain asks them:

| Region | Question | Contents |
|---|---|---|
| **NOW** (top airspace) | "What needs me this second?" | one arbitrated interrupt (T1/T2); empty = clean board |
| **WHERE** (center map) | "Where is it, and where is it going?" | zones, fire perimeter, spread rings, corridors, fleet markers, geofence |
| **ACT** (bottom deck) | "What do I do right now?" | truth cluster, TALON bay, staged commands w/ expiry |
| **WHAT** (left rail) | "What is the ground truth?" | evidence, fleet state, activity ledger, weather, video |
| **SO-WHAT** (right rail) | "What does it mean, and what does TALON think?" | convergence, TALON mind, priorities, teams/evac, exceptions |

**The bottom-oriented gravity refinement (defending and finishing the owner's idea):** the deck already moved the command surface down; the completion is that **the rails anchor at the bottom too** — spine tabs sit at the bottom corners flanking the deck, and panels grow **upward** from them, capped below the airspace. The top band stays pure sky: alerts can appear without pushing anything, and the map owns the full vertical center. The operator's scan becomes a stable triangle — *down to act, center to see, sides to know* — instead of a screen-wide hunt. Cognitive-load rule this implements: **fixed anchors, predictable positions, nothing ever jumps** (the layout-thinking consensus: attention is agent-driven, furniture is not).

## 3. THE PANEL CHARTER (left rail = THE WORLD)

Every panel below declares: the decision it serves, its exact data, its TALON contract, and its visibility budget. Data fields marked `[NEXT]` are real-but-unbuilt (from `01 §5`).

### L1 — Intel & Evidence / Context Inspector *(decision: D1, D2, D5)*
- **Data:** the selected entity's ground truth. Zone card: name, category, risk, spread window, terrain, structures count. Drone card: callsign, class, mission, status, **GS (ground speed), ALT (AGL), HDG, LAT/LON, BAT %, LINK %, payload, ETA** `[NEXT: alt/coords on roster]`. Team card: availability, vitals (HR/VIS), assignment. Anomaly card: detection confidence, source, timestamp. Plus **Evidence at this view**: each of the 9 sources with status (active/pending/stale/failed/missing), confidence %, age.
- **TALON contract:** READS everything; ANNOTATES every evidence row with provenance + weight ("weighted 62% after satellite loss"); MAY pin evidence (intent); NEVER edits values.
- **Visible:** Intelligence phase — primary. Benchmark: this is the inspector panel every product has (DroneSense/Skydio detail view).

### L2 — Fleet Grid / Asset State *(decision: D4, D10-transit)*
- **Data:** all 10 drones clustered by readiness (Needs attention · Evidence collection · Field tasking · Relay & guidance · Standby) with per-drone rows: callsign, class glyph, status chip, BAT/SIG bars, mission, ETA. `[NEXT]` dock/preflight roll-up + LAUNCH gate (G-05).
- **TALON contract:** COMPUTES the clusters and the needs-attention sort; PROPOSES dispatch through the Mission Brief; flags battery-critical as an interrupt; NEVER auto-launches.
- **Visible:** Operations — primary; Intelligence — collapsed to one row.

### L3 — Activity Ledger *(decision: D9 + trust)*
- **Data:** the append-only stream — actor (AI/TALON/Operator/System), type, text, severity, timestamp; receipts inline.
- **TALON contract:** WRITES; never edits; every TALON action lands here or it didn't happen.
- **Visible:** always as a collapsed strip; expands for debrief/handover (ICS-209 export `[NEXT]`).

### L4 — Weather & Environment *(decision: D2, D6)* — `[NEXT panel, real data]`
- **Data:** wind (bearing/speed/gusts), temp, RH, fuel model, Haines — from live frames + scenario rows. Benchmark: ICS-209 block 19 "weather observations."
- **TALON contract:** READS into every recomputation; cites wind in plan rationales ("shifted to 210° @ 35 kts — route B promoted").
- **Visible:** Intelligence + contain as a strip.

### L5 — Video Wall *(decision: D2, D5)* — `[NEXT panel]`
- **Data:** one primary EO/IR feed + thumbnails. Benchmark: "video is a first-class pane, never buried" (DroneSense/Skydio).
- **TALON contract:** READS (its tool calls reference the feed); MAY request gimbal preset; NEVER controls the airframe directly.
- **Visible:** verify-active + on-scene operations.

## 4. THE PANEL CHARTER (right rail = THE MEANING)

### R1 — Convergence Card *(decision: D1, D2)*
- **Data:** fused confidence % + the three series (thermal / structures / confidence) with the 90 s convergence window.
- **TALON contract:** the card IS TALON's honesty instrument — the gauge and the orb derive from the same source and cannot disagree.
- **Visible:** always, top of the Mind console (the buried-convergence fix, G-01).

### R2 — TALON Mind Console *(decision: all)*
- **Data:** session thread, tool trace (11 tasks, statuses, latencies), provenance chips, suggested questions, intents, refusal/degraded states.
- **TALON contract:** this panel is TALON; everything in it is derived from `deriveTalonSurface` + the session — one state, two renderings with the orb.
- **Visible:** always on the right; collapsible to a spine tab.

### R3 — Priorities & Tasking *(decision: D2, D4)*
- **Data:** the ranked queue of what needs the operator — risk-scored, staleness-clocked, contention-marked (G-11 fix: never a static list).
- **TALON contract:** PROPOSES the ranking (phase-density weighted); the operator re-sorts at will; every auto-raise logged.
- **Visible:** Operations — primary.

### R4 — Teams & Zones / Evacuation *(decision: D5, D7)*
- **Data:** ground teams (readiness, vitals, assignment), per-zone evac state with **GO/WATCH/CLEAR chips** `[NEXT: GO chips, G-15]`, corridor status (route A/B), shelter capacity.
- **TALON contract:** computes per-zone time-to-impact from the projection; drafts the evac recommendation; the operator owns the GO.
- **Visible:** rescue — primary.

### R5 — Exceptions *(decision: D8)*
- **Data:** what broke (affected sources/agents), blocked commands, fallback inputs, recovery recommendation, map impact + spatial uncertainty.
- **TALON contract:** declares its own degraded state honestly; blocked commands are mechanically enforced, not advisory.
- **Visible:** takes over the rail in any degraded scene (already in `panels.ts`).

### R6 — Projection *(decision: D6)*
- **Data:** spread forecast (strategy × route), uncertainty cone, **projection age badge** (a G2 unlock condition, G-08).
- **TALON contract:** `recompute_plan` lives here; plan comparison (ridge-anchor / creek-buffer / defensive-holding) with deltas.
- **Visible:** contain phase.

## 5. The TALON × panels contract — the actual differentiator

This is the answer to *"someone told me I have to design new interactions… AI can do everything, so how am I different?"* The differentiator is not a widget — it is that **every panel has an explicit AI relationship contract**, the same four clauses, machine-enforced:

1. **READ** — what TALON may consume from this panel (evidence, fleet, weather, ledger).
2. **ANNOTATE** — what TALON may add to it: provenance chips, confidence badges, live lips, tier dots, "opened by TALON" marks.
3. **PROPOSE** — what TALON may stage through it: dispatch briefs, intents, gate recommendations — always dismissible, always undoable, always logged.
4. **NEVER** — rearrange furniture, hide information, fire a gate, outlive its audit trail.

No benchmarked product has this as a *system* (DroneSense/Skydio have AI features; none declare per-panel AI contracts with refusal states and undo receipts). That is the new interaction design the owner was told to find — and it is already half-built (intent catalog, attention arbiter, expiry, receipts). The charter's job is to finish it deliberately: **every panel ships with its four clauses printed in the spec and honored in code.**

## 6. Map zones — how the operator knows what's what

Benchmark conventions (DroneSense map-feature layers, ATAK overlay manager + WFIGS perimeters, Skydio geofences, ICS-209 fields), applied to our five zone categories + the fire itself:

| Zone | Fill | Outline | Label chip |
|---|---|---|---|
| Fire perimeter (live) | thermal gradient, 18% alpha | saturated ember, 2px, pulsing when active | "FIRE · spread 0.8 km²/h · age 4m" |
| Forest | deep-green 8% + hatch | dashed 1.6px | name + risk chip |
| Buffer | neutral 6% + hatch | dashed 1.35px | name + "buffer" chip |
| Residential | red-family 8% + hatch | solid 1.5px | name + **GO/WATCH/CLEAR chip** (G-15) |
| Geofence / TFR `[NEXT]` | none | striped violet boundary | "TFR · active" |

Laws: translucent fill + saturated outline (never both heavy); label at centroid carrying name + the one chip that matters; states rendered as dashed (planned) / solid (active) / faded (complete); zones live in named toggleable layers; authoritative perimeters arrive as imported overlays (WFIGS-style), hand-drawn is the fallback. The uncertainty envelope (±meters) wraps whichever zone the evidence is uncertain about — that's how "the operator knows what the zones are *and* how sure we are."

## 7. Drone telemetry completeness (the "drones have no altitude" fix)

The full field set, and where each lives — this is the DroneSense telemetry-bar spec plus ours:

| Field | Map marker chip | Fleet row | Selected detail | Telemetry strip |
|---|---|---|---|---|
| ID / class glyph | ✓ | ✓ | ✓ | ✓ |
| Mission + status | ✓ (dot) | ✓ chip | ✓ | — |
| GS (speed) | — | — | ✓ | ✓ |
| ALT (AGL) | — | — | ✓ | ✓ |
| HDG | ✓ (nose rotates) | — | ✓ | ✓ |
| LAT/LON | ✓ (on demand) | — | ✓ | — |
| BAT % | ✓ (low = amber) | ✓ bar | ✓ | ✓ |
| LINK/SIG | — | ✓ bar | ✓ | ✓ |
| ETA | ✓ (when en-route) | ✓ | ✓ | ✓ |

`[NEXT data]` the roster needs `altitudeM`, `groundSpeedMps`, `headingDeg`, `lat`, `lon` added to `DroneRosterEntry` (scenario engine already carries position; altitude/speed are one beat-field away). Until then the strip shows what's real — nothing invented.

## 8. Visual direction vs panels-and-data — the direct answer

**The panels and their data are the product; the visual direction is the carrier.** They are graded differently and sequenced differently:

- **Panels/data = the defense.** When the tutor asks "why does this panel exist," the answer is a decision id (D1–D9), a data contract, and a TALON clause — that's what makes it un-slop, because slop is decoration without a decision to serve.
- **Visual direction = the attraction.** It decides whether anyone stays long enough to hear the defense. It is *important* — but it is **constrained** by the panels: the chosen direction must carry this density honestly (that test alone eliminates the thin pastel look and keeps V1 Night Optic / V2 Ember / V4 Phosphor as the serious candidates from `10-visual-direction-exploration.md`).
- **Sequencing:** lock this charter → pick the direction (by seeing concept screens) → re-skin. Deciding the skin first is exactly how we got a beautiful skeleton with empty organs.

## 9. What "restore the direction" concretely means

Nothing in the D2 skeleton overthrows the founding idea — the deck-bottom/airspace-top/full-bleed-map frame *is* the cognitive-load answer; it was just under-instructed. The restoration is: (1) this charter becomes the content contract for every rail and deck slot; (2) the `[NEXT]` data gaps (drone telemetry fields, weather, GO chips, geofence) get built so panels show reality; (3) the panel-level AI contracts (§5) get finished and *documented on each panel*; (4) the visual direction gets picked by seeing two concept screens; (5) only then does the polish pass run. That order is the difference between a case study that says "I made a dashboard" and one that says "I designed an AI-operator contract for the worst minute of someone's night."
