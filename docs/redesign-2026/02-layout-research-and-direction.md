# Layout Research & Direction — TALON's home, the rails, the deck, the device

> **status: exploratory** — research pass, 2026-09-27. Companion to `00-validation-and-direction.md` (gaps, workstreams) and `01-data-map.md` (what the data is). This doc answers the owner's layout questions with evidence, evaluates the three proposed mechanisms, and recommends one direction. It does **not** overturn any golden rule; where a proposal conflicts with the authorization law, it says so and offers the corrected version.

**Evidence base:** `sentinel-layout-thinking/00-layout-thinking.md` (six independent advisor voices + verifier — read in full this session); external precedent research (NASA mission control, Anduril Lattice, Palantir Gotham, ATAK, VS Code/M365 copilot placement, Raycast/Bloomberg command surfaces, iPadOS Stage Manager, Arc sidebar, Endsley situation-awareness, ANSI/ISA-18.2 + EEMUA 191 alarm standards, FUI practice (Jayse Hansen / Mark Coleran), BMW Curved Display, ISO 11064, NIFC initial-attack standards); `src/app/domain/panels.ts` + `SentinelShell` build audit; the 21-component spec (info-design ch07).

---

## 1. Your idea, reflected back

You're proposing: TALON gets a proper home (right-side chat + buttons, *or* a curved bay in a bottom command bar); the navbar moves to the bottom and gains a real purpose; the side rails become a **stacked panel deck** — headers always visible identifying each panel, an edge slider that scrubs through the stack instantly, and panels that **pop to active when TALON updates their data**; the device is either a desk-embedded command panel or a handheld tablet. Net effect: the dashboard becomes *responsive to the agent* instead of a static grid. That is a coherent product thesis, and it is genuinely more futuristic than the current shell — but two of its three mechanisms need corrections from the evidence to survive contact with an emergency-ops review. Details below; the corrections make it *stronger*, not smaller.

## 2. Direct answers to your questions

**Is TALON right to be center-bottom?** The *authorization instrument* — yes, structurally. This is the single best-verified fact in all the prior research: six advisor voices, the verifier, and the product thesis converge on "center-bottom is the neutral authorization axis between world (left) and interpretation (right); moving authorization to the AI's side biases the human" (LAYOUT §2.2, §4.1). The orb's dead-center position is the layout saying *the human is the axis*. It is not aesthetics; it's the product.

**But is TALON *only* center-bottom? No — that's the split-brain disease.** Presence (voice + pills) lives bottom-center, memory (brief, evidence, workforce) in the right rail, chips in an overlay. Every voice calls this out; one names it "eye-tracking pinball" — bottom → right → map → bottom for the hold. Your instinct ("more accessible and connected") is the correct diagnosis.

**The fix is a split, not a move: Mind on the right, Hand at the center.**
- **Right — TALON Mind Console (the conversation):** a real thread: session turns, tool-call trace (`read_scene_state → read_evidence → recompute_plan → propose_transition`), evidence chips, plan cards, class-of-action badges. This is where your "better chat and buttons panel design" lives. Precedent: VS Code's documented rationale for chat as the *secondary sidebar* beside the primary artifact; M365 Copilot's right-dock convention. The map is the artifact, so the companion goes right.
- **Center-bottom — the Hand (the gate):** orb posture + one-line consequence brief + staged command tiles + 2-second hold. The rule that makes the split safe: **the sticky mirror** — anything actionable that appears in the thread *must* appear identically at the gate, derived from the same `deriveTalonSurface()` state, so chat and orb can never disagree (LAYOUT §4.2, voice #1's design). Conversation may live on the AI's side of the screen; authorization never does.

**What does TALON's output actually look like?** Today: a voice line + word-by-word stream, prompt chips, staged tiles, a receipt posture. Target (mind): a session thread whose turns are *structured* — reasoning trace with per-step status/timing, evidence chips (the 9 kinds with live status), a plan card (strategy × route × margin), confidence badge, class chip (1/2/3), and an explicit refusal/abstention state. (hand): the orb in one of 8 postures, a ≤90-word consequence-first brief, the staged tile with countdown-to-expiry, the radial hold ring, then a receipt. Output shape is *two renderings of one state* — never two states.

**What about the two rails?** The composition is already smarter than it looks: `panels.ts` phase-purposes the right rail (talon/priority/ground-teams, exceptions takeover on degraded) and fixes the left (intel/fleet/activity). The failure is **expression, not composition**: rails are static, they don't say "the situation just changed," they're dense (LeftPanel = 882 lines / 4 panels), and their telemetry is candy-bar grade. Your deck instinct targets exactly this — it's the right disease.

**Move the navbar to the bottom?** Yes as a **Command Deck**, no as a copy-paste. The evidence: the top bar is underworked (all six voices want it thinner or gone — incident/phase/clock are the only truths it earns); the bottom-center slot is already the command zone; Bloomberg/Raycast prove an operator command surface at the bottom edge sustains decades of expert use; BMW's curved display puts "Locate, Inform, Act" controls nearest reach at the bottom of the curve. The corrected version of your idea: **one full-width bottom deck (~84–96px) that unifies truth (incident · phase arc · clock), command (orb cradle + staged tiles + override + mic), and identity** — the navbar's content is *re-homed with a purpose*, not relocated. The curve: supported as **styling** (a cradle inlay that the orb sits in), rejected as **hardware cosplay** — no real product puts the AI in a curved bottom-center bay; FUI curved consoles are built for camera legibility, not operator throughput, and BMW's curve is hardware ergonomics we can't honestly claim. Flag it in the case study as deliberate FUI→product translation.

**Keep the top empty?** Almost. The top becomes **alert airspace**: T1 takeover banners and the phase arc float there; when the board is clean, the emptiness *is* the signal. Two cautions from the research: (1) the current map art wastes the top band on dead night sky — a floating pill can occlude northern zones, so the map composition must be re-cut for a full-bleed top (LAYOUT D4); (2) Escape/keyboard map must never dismiss an unacked T1 (ch07:137–145).

**The stacked panel deck + slider + TALON pops?** Right disease, wrong cure as specified — and the corrected cure keeps ~all of the futurism:

| Your mechanism | Risk (evidence) | Corrected mechanism — the **Attention Spine** |
|---|---|---|
| All panels stacked, headers visible | Headers preserve *orientability*, not *awareness* (Endsley: info not visible ≠ info); Stage Manager shipped occlusion-with-thumbnails and was publicly eviscerated for "messy clumps" | Spine of **peek tabs**: 44px header lips, each carrying its one load-bearing live value ("FLEET · 2 RTB · 14%") + tier dot. Collapsed ≠ blind: the lip *is* the data. |
| Edge slider scrubs through panels instantly | Continuous scrub implies all panels mounted (today only one `RailView` renders — RailStack.tsx:250); perf + determinism hit on verify:routes | Drag across the spine = **scrub-to-preview** (hover-peek, release-to-open); one panel expanded at a time (accordion); slot count capped 3–4 per rail. Scrub must be faster than screen-switching or it's a buried menu. |
| TALON pops panels to active on updates | Un-arbitrated auto-raise collides with Rule-of-One/Anti-Nagging (04:59–64); aviation "alarm cascade" distrust; alarm flood operators learn to ignore | **ISA-18.2 discipline**: pop only when the panel requires operator action; tiers ~5/15/80; interrupt budget ≤2/10 min (already in ch07:87); every pop *explains itself* ("why now" header state + cause/consequence line); pop = **proposal with "opened by TALON · undo"**, auto-expand reserved for T1 only; **every raise logged to the ledger** so `handoff-pending` inherits a legible deck. |
| Gates/commands in the moving panels | Voice #3's non-negotiable + DESIGN.md stability guarantee: the command surface must be physically stable during a 2s hold | Gates live **only** in the bottom deck. Never in a spine, never in a sliding surface. |

**Desk-embedded console or tablet?** Both — as **two containers, one brain**, and don't design the average (QGC ships two UIs; LAYOUT §4 form-factor ruling). Desk-embedded panel is the canonical design target (1920×1080 gate; arm's-reach bottom-center favors the orb's hold geometry; ISO 11064 supports fixed-console task zoning) — and the "screen embedded in the desk" aesthetic you want is largely *presentation chrome* (bezel, boot sequence, room lighting, vignette) built at case-study time, not in-app layout. The tablet is a **recomposition**: same state machine, same gate geometry, spines → bottom sheets, scrub/peek becomes primary, ATAK-grade touch targets. One honesty note to settle with yourself: the documented initial-attack reality is a field IC on a rugged ATAK tablet; the desk console authenticates as the **EOC watch officer / command-center** seat backing up the field. Pick which persona the portfolio leads with — it changes the copy, not the layout system.

## 3. The directions (with the case against the current layout)

**What's actually wrong today (the defense for changing anything):**
1. **Split-brain TALON** — presence bottom, memory right, no connective tissue; the hold requires bottom→right→map→bottom circulation (all six voices; ch06 G-01 is the same disease from the data side).
2. **The rails don't express change** — a static tab stack in a product whose entire thesis is "the situation just changed"; no tiered alerts at all (ch06 blocking gap G-03).
3. **The top bar is underworked chrome** — 52px carrying buttons that belong elsewhere while its truths (incident, phase, clock) drown among them.
4. **The map loses real estate to a ~140px bottom plinth + dead top band** — in a map-dominant product where every C2 precedent (ATAK ~90% map, Lattice, Gotham, NASA trench) subordinates panels to the map.
5. **Telemetry is toy-grade** — 8px candy bars in a defense-grade instrument (doc 10's correct diagnosis).

**What's right today (must survive the redesign):** the center-bottom authorization axis; the map's coordinate law (one dataset, two renderers); `panels.ts` slot discipline and phase-purposing; the four-surface contract (world left / interpretation right / command bottom / map center); `deriveTalonSurface()` as the single source of truth for what TALON looks like it's doing.

### D1 — "Current+" (refine in place)
Right rail gains the thread + sticky mirror; top slims to three floating pills; rails get badges. *Lowest risk, lowest differentiation. This is the fallback, not the goal.*

### D2 — "Mind / Hand / Senses" ← **recommended**
One idea: the three surfaces of an operator's nervous system, each with a home.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ALERT AIRSPACE (top, floating):  T1/T2 banners · phase arc · nothing else   │
│                                                                              │
│        │                                                                │    │
│ SPINE-W│                        MAP COMMAND SURFACE                     │TALON
│ 48px   │                  (full-bleed, 2D/3D, dominant)                 │MIND
│ peek   │                                                                │380px
│ tabs + │                                                                │(col-
│ live   │                                                                │lapsible
│ lips   │                                                                │to tab)
│  ◂scrub│                                                                │     │
├────────┴────────────────────────────────────────────────────────────────┴────┤
│ COMMAND DECK 88px:                                                           │
│  INC-0847 · VERIFY · T+58s   ╭─orb cradle─╮   [staged: AUTH CONTAIN ⏱0:42]   │
│  (truth pills)               │ ◉ 2s HOLD  │   override · mic · receipts       │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Senses (edges):** Attention Spines per §2 — peek tabs with live lips, scrub-to-preview, tier dots, ISA-18.2 pops with undo receipts. Left spine = world data (intel/fleet/activity); right spine edge = TALON Mind tab + ops data.
- **Mind (right):** TALON Mind Console, 380–400px, collapsible to its spine tab; thread + tool trace + evidence chips + plan cards; sticky mirror of anything actionable.
- **Hand (bottom):** the Command Deck — truth pills left, orb cradle center (curve = styling), staged tiles + override + mic right. ~88px replaces both the old action plinth *and* the navbar; the map gains the top band and ~50px of height.
- **The brain:** phase-conditional density — the attention arbiter derives from `deriveTalonSurface()` + `workflowPhase` (Intelligence: evidence badges lead; Operations: exceptions/blocking lead). This is the defensible version of "TALON controls the dashboard": attention derived from the same source of truth that colors the orb.
- *Why it wins:* fixes the split-brain without moving the gate; gives TALON a home your "accessible and connected" instinct is asking for; makes the dashboard *actually responsive* through a mechanism grounded in industrial alarm standards; keeps every precedent-aligned virtue (map-dominant, stable command zone).

### D3 — "Co-Commander column" (voice #5's Option B)
Everything TALON — including the 2s hold — in one 360–400px right column; bottom plinth deleted; map ~full-bleed. *Best reading flow (cause → thought → consequence in one vertical scan), best touch ergonomics. Rejected as default because it puts authorization on the AI's side of the screen — the one structural claim the product thesis will not trade. Keep as the honest alternative to test in S1; if S1's data ever shows the mirror-jump is worse than the bias risk, this is the documented fallback.*

### D4 — "Deck-first" (voices #2/#6, uncorrected)
Full scrub decks both edges + bottom nav + auto-raise. *Maximum futurism, maximum risk: Stage-Manager clumps, mount-everything perf, alarm flood, gates-in-motion. Its mechanisms are absorbed into D2 as parameters (44px lips, 16px peek, detents as a hardware-contingent note), so nothing of the vision is lost — it's just disciplined.*

## 4. Acceptance tests (borrow + extend)

1. **Kill-test (from LAYOUT, endorsed):** `verify-active → rescue-battery-critical` inside 30 s — operator completes the 2s hold without losing spine position, and the raise is logged. If the raise interrupts the hold, the interaction model dies.
2. **2-second locate:** any panel's data findable from its spine lip alone in <2 s (the Stage-Manager defense).
3. **Mirror parity:** every actionable in the Mind thread appears identically at the Hand — assertable in `verify:flows`.
4. **Alarm budget:** ≤2 interrupting pops per 10 min scripted run; every pop carries cause + consequence; every raise in the ledger.
5. **Gate stability:** the deck's geometry is invariant during a hold; nothing slides under a pressed thumb.

## 5. Prototype spikes (extend LAYOUT §5 — same views/state IDs, so verify:routes stays valid)

- **S1** `?layout=split` — TALON Mind Console (thread + trace + sticky mirror), orb unchanged. Answers: does connectedness improve without moving the gate?
- **S2** `?deck=1` — Attention Spines (peek lips + scrub-preview + tiered proposal-with-undo). Run the kill-test here.
- **S3** `?deck=2` — Command Deck (navbar re-homed; truth pills + cradle). Watch the dead-top-band risk on map art.
- **S4** `?density=phase` — phase-conditional attention arbiter prototype (pure function + fixture tests before any UI).

Fix the `ExceptionBanner`/`VerifyLiveFeed` inset bug (LAYOUT §7) *before* running any spike so comparisons are honest.

## 6. What not to do (learned from the research)

Don't auto-rearrange layout on TALON events (attention, never furniture). Don't let any panel expansion cover >35–40% of the map. Don't mount all deck panels at once. Don't put gates in sliding surfaces. Don't ship unexplained pops. Don't design a desk/tablet average. Don't claim hardware curves as ergonomics. Don't let the Mind console auto-open on focus — it opens on TALON events and operator intent only.
