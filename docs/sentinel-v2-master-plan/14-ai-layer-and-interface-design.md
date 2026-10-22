# 14 — The AI layer & the interface system

> **Status: canonical (design contract, pre-build).** The research base, the
> decision-rights model for TALON, the interface system, and the iteration
> plan.
>
> **Precedence:** `DECISIONS.md` → `SPEC.md` → this file → `12` → `13` → the
> rest.
>
> **Why this document exists.** The console build proved the *mechanics* of
> TALON — a domain model, a governance layer, 20 passing checks. It did not
> prove the *design*. Two things were missing and both are design questions
> wearing engineering clothes: (1) nobody wrote down **who is allowed to
> decide what**, and (2) nobody wrote down **when the AI should speak**. The
> build answered both by improvisation, and improvised answers do not survive
> an interview.
>
> **What this document adds.** The research base for the human↔AI
> interaction, a decision-rights model that allocates authority between the
> machine and the person, an interface system derived from the host company's
> own brand system, and a surface model that is a *function* rather than a set
> of hand-placed panels.

---

# PART 1 — THE AI LAYER

## 1.1 The framing

> *"How do you design an experience that collapses decision time from minutes
> to seconds without creating cognitive overload, false confidence, or loss
> of control?"*
> — FlytBase Problem Statement, S3

That sentence contains the whole design problem, and it names three distinct
failure modes that are usually conflated into one:

| Failure | What it means | The literature's name |
|---|---|---|
| **Cognitive overload** | too much arrives | *alarm flood* (EEMUA 191, ISA-18.2) |
| **False confidence** | the operator believes more than the system knows | *trust miscalibration* (Lee & See 2004) |
| **Loss of control** | the operator cannot intervene | *automation surprise / out-of-the-loop* (Parasuraman et al. 2000) |

Each has its own literature, its own measurement, and its own design
countermeasure. Treating them as one problem is why AI products in this domain
so often fail on all three at once.

## 1.2 The research base

| Source | What it gives us |
|---|---|
| **Horvitz (1999)**, *Mixed-Initiative Interaction*, IEEE Intelligent Systems | The framing: *"each agent (human or computer) contributes what it is best suited at the most appropriate time."* And the mechanism: **initiative must be weighted by the AI's uncertainty** — an uncertain system should *ask*, not act. |
| **Parasuraman & Riley (1997)**, *Use, Misuse, Disuse, Abuse* | The four ways people get automation wrong. Every one is a design failure mode, and all four are observable in a product. |
| **Lee & See (2004)**, *Trust in Automation* | Overtrust (trust > capability) and distrust (trust < capability) are **both** failures. The cure is not persuasion — it is **legible capability**. |
| **Sheridan & Verplank (1978)**, 10 Levels of Automation | The canonical ladder of who selects and who acts. |
| **Parasuraman, Wickens & Sheridan (2000)**, *Beyond Levels of Automation* | The correction that matters: automation is not one level but **stage-specific** — information, analysis, decision selection, and action implementation each sit at their own level. This is the single most useful idea in the literature for this product. |
| **Parasuraman, Sheridan & Wickens (2000)**, *Automation Surprises* | Automation that acts faster than the human can sense erodes the human's ability to intervene. Consequence: **the system must stay legible while it acts.** |
| **EEMUA 191 / ISA-18.2** | Alarm management. Steady state: **≤1 alarm per 10 minutes.** An *alarm flood* is a 10-minute period containing more alarms than the operator can absorb. |

## 1.3 The model: TALON is a decision-rights allocator

The design question is not *"what can the AI say?"* It is:

> **Which decisions belong to the machine, which belong to the person, and
> how does each one know where the boundary is?**

### The stage model, applied

| Stage | Automation level | Who | In the product |
|---|---|---|---|
| **Information acquisition** | High | **TALON** | Docks launch, sensors stream, the map assembles a composed picture. The operator sees a *situation*, never a raw feed wall. |
| **Analysis** | High | **TALON** | Perimeter, spread projection, exposure, traffic, structure triage. Every output carries its basis and its ceiling. |
| **Decision selection** | **Mixed — this is the product** | **Operator** | Which route. Whether to order. Whether to send. TALON proposes with evidence; the operator selects. |
| **Action implementation** | Low–medium | **Machine, under standing order** | Dispatch within a pre-authorised envelope. Outside the envelope, it asks. |

**The error to avoid** is treating automation as one dial set once. The
correction is that each stage gets its own level, deliberately, and the
*decision-selection* stage is where the human holds the lever — because that
is the stage where accountability sits.

### The lever table

This is the artefact. It is the answer to "how the AI controls the system
versus how much the human can control the system."

| Lever | TALON | Operator | Neither — system law |
|---|---|---|---|
| Launch / retask a drone | proposes | **authorises** | — |
| Launch a drone *within a standing order* | **acts** | may veto | — |
| Open or close a sensor feed | proposes | **authorises** | — |
| Choose the egress route | proposes | **selects** | — |
| Issue an evacuation order | proposes | **authorises** | — |
| Send the authority packet | prepares | **sends** | — |
| Accept a re-raise | — | **cannot** | routed to the Regional Duty Supervisor |
| Revise a plan after approval | proposes a **draft** | approves / rejects | — |
| Revise a plan *before* approval | proposes | **selects** | — |
| Set the interrupt budget | — | — | ✓ ISA-18.2, ≤2 / 10 min |
| Fire a staged action's expiry | — | — | ✓ expiry, never execution |
| Label a value's basis | — | — | ✓ honesty law |
| Run with no human in the loop | — | — | ✗ **never** — a person is always accountable |

**Reading the table:** TALON has the levers of *analysis* and *preparation*.
The operator has the levers of *selection and commitment*. Neither has the
levers of *governance* — the budget, the expiry, the basis. Those are the
system's, and they are the reason the product is defensible.

## 1.4 The initiative calculus — when TALON should speak

Horvitz's mechanism: initiative is weighted by the AI's own uncertainty. An
uncertain system asks; a confident one proposes; only a confident, urgent,
actionable, non-duplicative thing interrupts.

**TALON interrupts only when all four hold:**

1. **Urgency** — waiting costs more than interrupting
2. **Confidence** — TALON is not uncertain about this
3. **Actionability** — the operator can *do something* about it
4. **Non-duplication** — it is not already on screen

Otherwise it is demoted:

| Condition | Where it goes |
|---|---|
| Not actionable, routine | **log** — the record, never a surface |
| Actionable but the operator is busy | **feed** — a badge with a line |
| Actionable, needs a decision, but the budget is spent | **ask** — in the inbox, with a soft chime |
| All four hold, and budget remains | **interrupt** — the one pop |

That is the existing four-level model (`log`/`feed`/`ask`/`interrupt`) — and
it is exactly Horvitz's uncertainty-weighted initiative. **The build got this
right.** It just hadn't been written down, so it can't be defended.

### The budget, and the flood

- **ISA-18.2 hard ceiling: 2 interrupts per 10 minutes.** (Already in the repo:
  `INTERRUPT_BUDGET = { maxPops: 2, windowMs: 600_000 }`.)
- **EEMUA 191 steady-state target: ≤1 per 10 minutes.** The ceiling is the
  limit, not the goal. Above 1, TALON should be *asking*, not interrupting.
- **Flood detection.** When the 10-minute window exceeds 1, the arbiter
  demotes proactively. When it would exceed 2, it refuses to pop and instead
  **collapses the queue into a single ranked summary** — "5 open, 2 need you" —
  rather than showing five things. A flood is a *state*, and the interface
  changes shape for it.

### The brief's question, answered directly

> *"How does the system communicate back — and when should it stay silent?"*

**Silent** is the default state and is a *designed* state, not an absence:
the ambient header still shows posture, the standing-order digest still
refreshes, and the map still updates. TALON is never "off" — it is quiet.
**Loud** requires all four initiative conditions, a remaining budget, and a
human who can act.

The console already does this: *"Nothing needs you. 1 thing handed under
standing orders since your last decision."* That is the answer, and it is
good.

## 1.5 The four ways people get AI wrong — designed out

Parasuraman & Riley's four modes, each mapped to a concrete countermeasure.

| Mode | How it looks in Sentinel | Countermeasure | Built? |
|---|---|---|---|
| **Misuse** — over-reliance | The operator rubber-stamps TALON's plan | The plan card always shows the **alternative and its cost** side by side; the recommended option is labelled *(Recommended)* but **never pre-selected**; "Why?" is always one key away | ✓ COA A / COA B |
| **Disuse** — under-reliance | The operator ignores TALON and does it manually | The card is the **shortest** path to a defensible order; refusing costs a typed reason | ✓ |
| **Misperception** — wrong mental model | The operator thinks TALON is a chatbot, or that it knows more than it does | Every card carries **inputs, basis, ceiling, and provenance**. `Status / What changed? / Why?` is one key from anywhere | ✓ |
| **Abuse** — wrong goal | The operator uses TALON to rubber-stamp a decision they had already made | The **dissent record keeps TALON's position verbatim**, and a re-raise goes to someone who is **not** the operator. The record is the check on abuse | ✓ verified |

The fourth is the reason dissent and re-raise exist at all. They are not
politeness features; they are the *structural* countermeasure to abuse, and
removing them would remove the product's only defence against a motivated
operator.

## 1.6 Trust calibration → legible capability

Lee & See: overtrust and distrust are both failures. The cure is not
persuasion, it is **legible capability** — the operator must be able to see
what the system can and cannot see, and be right about it.

**Design consequences, all in the build:**

- Every value states its basis: `measured` · `modeled` · `authored`
- Every proposal states its **ceiling** — the cap on its confidence and why
  (*"capped by 48h-stale moisture"*)
- **TALON says it was wrong.** The build shows the corrected field *and*
  keeps the earlier projection visible, plus a hindsight overlay. This is
  the most trust-calibrating element in the product, and it is rare.
- The **scene-state cap** (L1/L2) is stated in the HUD, so the operator knows
  what TALON can see before trusting what TALON says

**The failure to design against:** an AI that never admits error teaches
overtrust faster than any amount of accuracy. The "I was wrong" moment is not
humility — it is the calibration mechanism.

## 1.7 Why a general LLM is the wrong substrate

The brief asks: *"What does 'AI-native' actually mean in a life-or-death
scenario?"*

**The answer from the research is not "a general model in a chat box."** It is
that the intelligence is **bound to the domain model** — it reasons over the
incident's state, the standing orders, and the plan library, not over free
text. A general LLM has no way to know what a *hairpin choke point* is, what
the standing orders authorise, or what the SOP requires at 03:47.

### The layered AI

```
L0  DOMAIN MODEL      incident · world · asset · plan state
L1  DOCTRINE          ICS-209 · LCES · WEA · standing orders · plan library
L2  REASONING         fire behaviour · traffic · exposure · uncertainty
L3  EXPRESSION        what TALON says — ALWAYS derived from L0–L2
L4  GOVERNANCE        gates · expiry · dissent · re-raise · budget
```

**The LLM's job is L3 only**, and even there it is constrained:

- It receives a *structured* item (title, body, evidence, basis, confidence,
  why[]) from L0–L2
- It returns only a *rendering* of that item
- Its output is **validated** against the item: no new numbers, no new ids,
  no new claims. A rendering that introduces a figure the item does not carry
  is rejected.

### The consequence that makes the product defensible

**If the model is down, the gates still hold, the expiry still fires, the
dissent still records, and the budget still binds.**

That is the direct answer to the brief's *"false confidence"* and to the
repo's existing thesis that *"if the model is fully hijacked, the worst case
is a weird voice — never a wrong action."* The safety lives in **L4**, below
the model. The model is a renderer, not a guard.

This is also the difference between "AI-native" and "a chatbot bolted to a
dashboard," and it is the thing an interviewer will press on.

## 1.8 Implementation — how we build the AI layer

| # | Change | Where | Done when |
|---|---|---|---|
| 1 | **One arbiter.** `talon.ts`'s replaces `domain/attention.ts`. | both projects | the 19 `verify:attention` contracts and 42 `eval:talon` cases are ported and pass against `talon.ts`; the old file is deleted |
| 2 | **Stage + level as data.** Every TALON item declares its stage and its authority tier. | `talon.ts` | a card can be traced to a row of the lever table |
| 3 | **Initiative calculus as a pure function.** `shouldInitiate(item, state) → 'log' \| 'feed' \| 'ask' \| 'interrupt'` | `talon.ts` | the four conditions are individually testable |
| 4 | **Flood detector.** Window > 1 → demote. Would exceed 2 → refuse and collapse. | arbiter | a synthetic flood collapses to one summary card |
| 5 | **Capability legibility.** Every derived item carries what TALON could see when it said it. | `talon.ts` | the console can show "as of 03:52, from thermal + satellite" |
| 6 | **Expression validation.** The LLM's output is checked against the item it renders. | expression layer | a rendering that introduces a figure is rejected and logged |
| 7 | **Stage-scoped authority.** Standing orders authorise *action*; they never authorise *selection*. | `talon.ts` | a standing order cannot issue an evacuation order |

## 1.9 The SOP the AI reasons over

The "doctrine layer" (L1) is a real, writable artefact, and it is what makes
the AI domain-specific. It should contain, in machine-readable form:

- **ICS-209** reporting fields and the thresholds that trigger each
- **LCES** — Lookouts, Communications, Escape routes, Safety — as a check the
  plan must pass before it is proposed
- **WEA** — Warning and Evacuation Area definitions, and the household counts
  they imply
- **Standing orders** — what may be done without a person, and the citation
  each action must carry
- **The plan library** — pre-computed playbooks (the build already references
  "playbook ENC-3")
- **The fade/expiry doctrine** — the conditions under which a staged action
  lapses rather than executes

**This is the single most differentiating artefact in the project** and it
does not exist yet. A general model + a domain model can imitate a fire
assistant. A general model + a domain model + **a machine-readable SOP** is
an operations system.

---

# PART 2 — THE INTERFACE SYSTEM

## 2.1 The host company's system — and what to take from it

FlytBase publishes a full brand system, **Edition 2026.04**
(`flytbase.com/brand-guidelines`). It is the design language of the company
that set this challenge, and it is *not* the soft-glass look the current
console has.

**Colours.** Charcoal base (not blue-slate): `#1A1A1A` → `#242424` → `#2E2E2E`
→ `#3D3D3D` → `#5C5C5C` → `#999999` → `#D6D6D6` → `#F0F0F0`. **Signal
Orange** is the sole brand accent: `#FDF0E8` `#F4B896` `#EC7D42` `#D95B28`
`#A33D14` `#7A2B0E` `#4A1808`. **Eucalyptus** is the success/semantic family:
`#EAF0EE` `#BACDD0` `#72A899` `#3A7A65` `#2B5A4A` `#1B3A30` `#0F2219`. Status
colours are functional and separate: success `#3A7A65`, error `#F43F5E`,
warning `#D9A441`, info `#3E6F9E`, review `#C8923A`.

> **FlytBase's hard rule:** *one brand accent. Green, red, amber and blue are
> functional status colours, never brand colours. Never use the accent to
> signal status. **Pair every status with an icon and label, never colour
> alone.***

**Typography.** **Lora** (serif) for display and editorial accents. **Geist**
for all interface copy. **Geist Mono** for eyebrows, labels, timestamps,
numbers and code. Eyebrows at 10px / 0.12em tracking.

**Iconography.** **Phosphor Thin** (1px stroke) is the mandated set. Regular
weight only inside a bordered 32–40px square. A one-off SVG is allowed if a
glyph is missing, matching Phosphor stroke. Explicitly banned: duotone, fill
weights, emoji, and every other library (Lucide, Heroicons, Material, Tabler,
Font Awesome).

**Components.** *"No border-radius unless the design calls for a framed
element."* Transitions `cubic-bezier(0.22, 1, 0.36, 1)` at 200ms.

**Spacing.** **8px base grid** — 8, 16, 24, 32, 48, 64, 96. Max content width
1200px. **Border radius: zero by default. Surfaces do not round.**

**Surfaces.** Three tileable patterns over Charcoal: Grid (32px lines, 4%
alpha), Dots (20px radial, 14% alpha), and a one-off **Thermal** gradient
from Signal Orange into Charcoal — *"used for hero moments, never inside
cards."* Plus an animated film-grain overlay, explicitly decorative.

**Motion.** *"Motion is purposeful, not ambient."* Reveal 0.9s `power3.out`,
24px rise, runs once. Hover 200ms. Reduced motion resolves everything
immediately.

**Voice.** *"Write like an operator, not a marketer. Short sentences.
Specific nouns. No buzzwords. No em dashes. No emoji."*

### What to take, and the one collision

**Take:** the charcoal ramp, zero radius, the 8px grid, Phosphor Thin, the
Lora/Geist/Geist Mono trio, the motion law, the thermal gradient, the dot and
grid patterns, the one-accent discipline, and the icon+label rule for status.

**The collision:** FlytBase's brand accent is **Signal Orange**, and our law
(`DECISIONS.md` §2.2) reserves fire-orange for the fire layer and forbids
orange as chrome. Orange cannot be both the brand and the fire.

**Three ways out:**

| Option | What it means | Verdict |
|---|---|---|
| **A — Ember brand, hot fire** | Brand `#EC7D42`, fire `#FF3B1C`. Adjacent hues, distinguished by behaviour: chrome is static, fire glows and lives only in the map pane | Works, but a near-miss hue is a weak distinction for an operator at 03:00 |
| **B — Charcoal + cyan** | FlytBase's *structure* with our cyan as the single accent, fire keeps `#FF6A00` | **Structurally FlytBase, tonally ours.** Fire stays the only orange on screen, exactly as §2.2 wants |
| **C — Full FlytBase orange** | Take the brand as-is; move the fire to a distinctly hotter red | Breaks §2.2, and makes the fire a brand colour |

**Recommendation: B, with a FlytBase-derived signature.** The distinctiveness
does not need a new hue — it needs *charcoal instead of blue-slate*, hairlines
instead of soft cards, **zero radius**, monospaced metadata, and one glow
colour. That is a different product language, not a different accent.

And take FlytBase's **dot-stream eyebrow** as our signature: a horizontal
stream of small squares carrying metadata (`Signal 01 · Autonomy · Updated
2026-04-21`). It is memorable, unmistakably an instrument, and it maps onto
our truth strip.

## 2.2 Icons

**Phosphor Thin** is the answer, and it is FlytBase's own mandated set — so
aligning costs nothing and reads as informed.

| | |
|---|---|
| **Phosphor (Thin, 1px)** | ~1,500 icons, 6 weights, MIT. **The domain glyphs we are missing exist here**: drone, drone-tilt, truck, fire, wind, mountain, road, path, warning, warning-octagon, siren, broadcast, antenna, target-crosshair, gauge, battery, satellite-dish, drop, leaf, tree, wave, person, shield, first-aid, lock, key, arrows-out-line, path, signpost, flag-banner. **Chosen.** |
| Tabler | 6,000+ icons, excellent stroke discipline, MIT. The strongest alternative; a fine second if a Phosphor glyph is missing |
| Lucide | 1,700+, MIT. The current console's closest cousin — and the reason it reads generic |
| Solar | 1,000+, MIT, has good "sharp" weights |
| Iconify | 200,000+ from 100+ sets. Useful as a *fallback source*, not a system |
| Material Symbols / Heroicons / Font Awesome | Ban. Banned by FlytBase, and Material/FA carry consumer-product DNA |

**Two rules for our use:** every icon is 16px-grid, 1.5px stroke, sharp
terminals; and **every icon is paired with a text label or an aria-label** —
never icon-alone, which is the accessibility law and the FlytBase status rule
at once.

**The icon vocabulary we still need** (and Phosphor has all of them):
dock · drone (by class: scout/lidar/relay) · engine · crew · air-tanker ·
helicopter · hairpin/choke · geofence/TFR · escape route · staging point ·
thermal hotspot · wind vector · RAWS station · structure-triage states ·
accountability (unit lost) · battery/link state.

## 2.3 Typography

| Role | Family | Licence | Why |
|---|---|---|---|
| **Display** | **Lora** | OFL | A serif in a tactical console is a *choice*, and nobody defaults to it. Gives the product a voice. Italic for a single emphasised word. |
| **Interface** | **Geist** | OFL (SIL) | Vercel's grotesque: neutral, excellent at 11–13px, wide weight range |
| **Metadata** | **Geist Mono** | OFL | Telemetry, coordinates, timestamps, IDs, counts — every number in the product. Tabular figures mandatory |

**Self-host all three.** FlytBase's own rule: *never from fonts.googleapis.com
at runtime* — it is a privacy leak (the user's IP reaches Google on every
load) and a performance cost. We should adopt it as a law regardless.

**The current IBM Plex Sans + JetBrains Mono is not wrong, it is invisible.**
Nobody remembers it, which for a product whose whole thesis is being
*legible at 03:00* is a failure.

**Scale** (FlytBase's, adapted to a dense instrument):
- Display `clamp(28px, 3vw, 44px)` / 1.1 — Lora
- Section heading 18 / 24 — Geist 600
- Panel title 14 / 20 — Geist 600
- Body 13 / 19 — Geist 400
- Control 13 / 16 — Geist 600
- Label 11 / 15 — Geist 600
- **Metadata 10 / 14 — Geist Mono 500, 0.1em tracking, uppercase**
- **Metric 30 / 34 — Geist Mono 700, tabular** — the one focal read per panel
- Map label 10 minimum at 1280 — Geist Mono

## 2.4 The token system — rebuilt, with no random hex

The law: **every value is a token; no raw hex in a component; a lint rule
enforces it.** The current `console.css` already has a good token layer
(13-step neutral ramp, semantic accents, `--prov` badge style, `tabular-nums`
on mono) — the rebuild is about *changing what the tokens are*, not about
adding discipline.

### The rebuild

| Layer | Now | Proposed | Source |
|---|---|---|---|
| **Neutral ramp** | blue-slate `#0C0E12`→`#161922` | **charcoal** `#1A1A1A`→`#F0F0F0` | FlytBase |
| **Brand accent** | violet `#8F7CFF` | **cyan** (ours) — or ember, per §2.1 | `DECISIONS §2.1` |
| **Status** | violet · blue · amber · green · red | **cyan** · **amber** · **red** · **teal** — 4, no more | `DECISIONS §2.1` |
| **Radius** | 12 on cards | **0 by default**; 2 on framed squares only | FlytBase |
| **Grid** | 4px | **8px base**, 4 as a half-step | FlytBase |
| **Motion** | scattered | `cubic-bezier(0.22, 1, 0.36, 1)` @ 200ms, 1 easing family | FlytBase |
| **Type** | IBM Plex + JetBrains | **Lora / Geist / Geist Mono** | FlytBase |

### The four status colours, and the one rule

| Colour | Means | Paired with |
|---|---|---|
| **Cyan** | TALON · focused · ready | the aperture sigil, always |
| **Amber** | **waiting on a human** | an icon + the word |
| **Red** | life safety · blocked · destructive | an icon + the word |
| **Teal** | verified · complete · receipt written | an icon + the word |

Two corrections to the current build, both small and both load-bearing:
**green is not in the palette** — teal is the "done" colour, and *"cyan never
carries completion."* And **status is never colour-alone**: every status mark
gets a shape or an icon, because red at 03:00 is nearly invisible to
dark-adapted eyes and a hue alone is an accessibility failure.

### Shapes over hues

`.dot { border-radius: 50% }` is the consumer-app tell. Replace with
**shape-coded state**, which the build already does for authority
(`.auth.standing` = 2px square, `.auth.operator` = circle). Extend it:
square = standing order · circle = needs an operator · diamond = committed ·
hollow = proposed · slashed = unavailable · triangle = hazard.

## 2.5 The TALON panel — adaptive without being unpredictable

The user's question: *the right-hand TALON panel needs to be more versatile,
more adaptive to the situation, like how the AI uses it, not a static layout.*

### The principle

> **The panel's *slots* are fixed. Its *contents* are adaptive.**

This is the spatial-constancy law and our own "TALON never moves the
operator's furniture" rule. Adaptivity that moves things around is not
adaptivity — it is a tax on the operator.

### The slot grammar

```
S0  AMBIENT HEADER   always   sigil · posture · one line
S1  INBOX            always   asks and proposals awaiting you
S2  FOCUS            always   the ONE card that owns the keyboard
S3  THREAD           always   composed history (scrolls, collapses)
S4  RESERVED SLOTS   variable situational slots, in fixed positions
S5  COMPOSER         always   talk to TALON · @unit
```

**S4 — the reserved slots** are the adaptivity, and they are *reserved*, so
they never displace anything:

| Reserved slot | Appears when | Never |
|---|---|---|
| **FEED** | a sensor feed is live and relevant | when the feed is degraded — then it shows the degradation, not the picture |
| **DEGRADED** | the fidelity ladder has dropped a tier | never hidden — the operator must always know which tier they are on |
| **CONFIDENCE** | a projection is on screen | never |
| **RECALL** | a prior incident is being referenced | never |
| **HANDOFF** | a mutual-aid unit is joining | never |

**TALON may not create a slot the operator did not reserve.** It may fill
reserved slots only. This is the "composes inside declared zones" law, made
concrete.

### What adapts inside a fixed slot

1. **S0's one line** adapts to the *scene*, not the log: "Watching" / "2 need
   you" / "Escalating" / "Degraded — thermal"
2. **S1↔S2 swap**: when nothing needs you, S2 shows the standing-order digest
   (*"Nothing needs you. 1 thing handed under standing orders since your last
   decision."*). When something does, S2 shows the decision card. *(Already
   built.)*
3. **S3 summarises under flood**: 5+ open items → *"5 open, 2 need you"* with
   a ranked list, not five full cards
4. **S3 collapses by status**: resolved/expired cards → one-line receipts
   *(Already built.)*
5. **S2's focus rule** is deterministic: `actionable ∧ within budget ∧ newest
   unresolved`. That is the arbiter's `top` — one rule, no cleverness.

## 2.6 The surface model — a function, not a set of panels

The user's requirement: *"I don't think everything should be on the screen;
it should be very systematic, broadened according to the requirement, and the
AI should be able to handle that."*

### The rule

> **The surface is a function of four inputs. Nothing is placed by hand.**

```
Surface = f(phase, capability, budget, selection)
  phase        which layers and which slots are ELIGIBLE
  capability  what TALON may currently claim (feed health, data freshness,
               model health, tier)
  budget      how much may interrupt vs ask vs log (the arbiter's output)
  selection   what is focused (drives S2 and the map emphasis)
```

This is what makes the surface **systematic**: there is one function, so the
same inputs always produce the same screen, and a new situation is a new
*input*, not a new hand-placed panel.

### The screen has a budget, like attention does

The insight that makes "not everything on screen" enforceable rather than
aspirational: **the screen has a capacity, and elements compete for it.**

| Budget | Limit | What wins |
|---|---|---|
| Interrupt pop | 1 | the arbiter's `top` |
| Expanded decision cards in S2 | 1 | the focused item |
| Open items in the inbox | 3 shown, rest counted | ranked by urgency |
| Dock widgets | 4 | the operator's pinned ones, always |
| TALON-suggested slots | 2 | highest expected value |
| Map emphasis | 1 layer at a time | the operator's selection |
| Simultaneous map highlights | 3 | nearest / highest consequence |

**Anything that does not win a budget slot is not on the screen — it is in
the log, the count, or a badge.** That is the mechanism that stops the
interface accumulating panels, and it is the direct answer to "everything
should be on the screen."

### The surface matrix

Every situation × every region, specified once. Blank means *not shown*.

| Situation | Truth strip | Map | TALON S0 | S2 focus | S1 inbox | S4 reserved | Dock |
|---|---|---|---|---|---|---|---|
| **Standby** | incident · clock · *No incident* | place + assets | "Watching · nothing needs you" | standing-order digest | — | — | weather · fleet |
| **Detection** | *Type 4* · T+ | place + **detection point** | "Verifying" | the detection card | — | **FEED** (IR) | feed · fleet |
| **Sizing** | acres · homes [MOD] | perimeter · isochrones · wind | "Sizing" | the sizing card | — | FEED | fire · weather |
| **Plan** | *Proposed* | plan + routes + zones | "1 need you" | **the plan card** (COA A/B) | — | — | fire · evac · fleet |
| **Authorized** | *Committed* | same geometry, committed | "Working" | the commitment receipt | — | — | fire · evac |
| **Operations** | clock · assets live | live positions · breadcrumbs | "Watching · 1 working" | — | — | — | fleet · weather |
| **Revision** | *Draft* | plan **+ draft**, draft ghosted | "1 need you" | the diff card | — | — | fire · evac |
| **Feed degraded** | **tier badge** | tier dropped | "Degraded — thermal" | the degradation note | — | **DEGRADED** | — |
| **TALON down** | **model state** | unchanged | "Not responding" | *the operator's own tools* | queue | — | unchanged |
| **Stale data** | *as of* on every layer | layers marked stale | — | — | — | — | — |

The last four rows are the **failure states** and they are currently missing
from the build entirely (see §3.2).

## 2.7 The design-system deliverable

A real, buildable system, not a palette:

1. `tokens.css` — the single source: colour, type, space, radius, motion,
   elevation, density. **No raw hex in any component** — enforced by a lint
   rule in the token audit, like the existing one.
2. `console.css` rebuilt on it (the current one is good; the *values* change)
3. **The icon set** — Phosphor Thin, 16px grid, 1.5px stroke, with the
   domain vocabulary above
4. **A component spec** — every component documented with its states,
   its keyboard path, and its reduced-motion behaviour
5. **The patterns** — grid 32px @4%, dots 20px @14%, thermal gradient for
   hero moments only
6. **Contrast + CVD validation** as a gate. The build already validates the
   chart palette (CVD ΔE 27) — extend that to the whole system
7. **A density mode** — `compact` / `default` / `expanded`, because an
   operator on a 32" console and one on a 13" laptop need different
   densities, and that is a token change, not a different screen

---

# PART 3 — THE ITERATION PLAN

The build was one long session and it was coherent, but the *decisions were
never reviewed*. Five rounds, each ending in something committed and each
independently shippable.

### Round A — The decision register (2 days)

Every product decision the console makes, written down and owner-ruled, in the
repo's `DECISIONS.md` format. The session's handoff lists four; there are
more behind them. **This is the round that stops the next session
re-litigating.** Outputs: the lever table (§1.3) ratified, the four ADRs
ruled, the phase-in-data question settled.

### Round B — The AI layer (1 week)

1. Port the 19 `verify:attention` contracts and 42 `eval:talon` cases against
   `talon.ts`; delete the old arbiter (ADR-1)
2. Implement the initiative calculus as a pure, testable function
3. Implement the EEMUA/ISA-18.2 flood detector and the queue-collapse state
4. Add capability legibility to every derived item
5. **Write the SOP layer (L1)** — ICS-209, LCES, WEA, standing orders, the
   plan library, the fade doctrine — in machine-readable form
6. Add the expression validator (no new numbers from the model)

### Round C — The failure states (1 week)

The nine states in §2.6's last four rows plus the full list, each with a
surface, a system behaviour, a TALON line, a **verifiable exit**, and a gate
check. Plus **port the fidelity ladder** from the repo's `model/fidelity.ts`
into the console engine, so the map's degradation is real and the operator
never loses the world.

### Round D — The interface system (1 week)

1. Rebuild the token layer: charcoal ramp, zero radius, 8px grid, 4 status
   colours, the motion law
2. Lora / Geist / Geist Mono, self-hosted
3. Phosphor Thin, with the domain vocabulary
4. The slot grammar + reserved slots + the screen budget
5. The surface matrix, implemented as `f(phase, capability, budget, selection)`
6. The density modes

### Round E — Integration (1 week)

1. Port the 9 repo `verify:flows` scenarios (especially the 5 fault scenes)
   into the console build
2. The 90-second brief question: decide and state the divergence
3. A real-hardware pass — voice, sound, frame rate with the blur on
4. The endgame: the case study's evidence pack

---

# PART 4 — POINTERS

**Read (foundational)**
- Horvitz, *Mixed-Initiative Interaction*, IEEE Intelligent Systems 1999 —
  `microsoft.com/en-us/research/publication/mixed-initiative-interaction/`
- Parasuraman & Riley, *Humans and Automation: Use, Misuse, Disuse, Abuse* —
  `web.mit.edu/16.459/www/parasuraman.pdf`
- Lee & See, *Trust in Automation: Designing for Appropriate Reliance* —
  `csel.eng.ohio-state.edu/productions/intel/research/trust/Lee & See Trust Review.pdf`
- Parasuraman, Wickens & Sheridan, *Beyond Levels of Automation* — the
  stage-based correction
- EEMUA 191 (2024 ed.) — `eemua.org` — and ISA-18.2 / IEC 62682
- Methnani et al., *The Impact of Mixed-Initiative on Collaboration in
  Hybrid AI* (Search & Rescue) — the closest domain match found
- Natarajan et al., *Adaptive Agents for Mixed-Initiative Human-AI
  Collaborations*, AAAI 2025 — trust determines compliance; miscalibration
  disrupts collaboration
- Horvitz, *Principles of Mixed-Initiative Systems* — the 39-principle
  distillation

**Use (design assets)**
- `flytbase.com/brand-guidelines` — the host brand system, Edition 2026.04
- `phosphor-icons.com` — the mandated icon set
- `fonts.google.com/specimen/Lora` · `vercel.com/fonts` (Geist, Geist Mono) —
  all OFL, self-host

**Read (in the repo)**
- `DECISIONS.md` — the register; §1.3 honesty, §2.1 palette, §2.2 fire-orange
  reservation, §4 map architecture
- `SPEC.md` §1.1 — the map architecture and the degradation ladder
- `docs/sentinel-v2-master-plan/12` — the incident flow and map states
- `docs/sentinel-v2-master-plan/13` — TALON and the shell
- `src/app/domain/attention.ts` — the arbiter that must survive as the only one
- `src/app/domain/disagreement.ts` — dissent and re-raise
- `src/app/domain/talonSurface.ts` — derived voice

**The three sentences to be able to say**

1. *"TALON is a decision-rights allocator, not a chatbot. The lever table
   says who decides what; the safety laws live below the model, so if the
   model is hijacked the worst case is a weird voice, never a wrong action."*
2. *"Every value states its basis, and TALON says it was wrong — because an
   AI that never admits error teaches overtrust faster than any amount of
   accuracy."*
3. *"The screen has a budget, like attention does. Anything that does not win
   a slot is in the log, not on the glass."*
