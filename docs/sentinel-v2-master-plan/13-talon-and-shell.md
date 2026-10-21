# 13 — TALON & the shell

> **Status: canonical.** The product contract for TALON, the operator↔TALON
> interaction, and the shell that carries them. Written before the build, from
> the owner's intent.
>
> **Precedence:** `DECISIONS.md` → `SPEC.md` → this file → `12-incident-flow-and-map-states.md` → everything else in `docs/`.
>
> **This document is self-contained and pasteable.** It is the brief for the
> TALON and shell build session.
>
> **Companions:** `12-incident-flow-and-map-states.md` defines what the *map*
> shows. This defines what *TALON* is and where the shell puts it. The map
> engine itself is built — see `MAP-BRIEF.md` and `docs/sentinel-v2-master-plan/`
> history.

---

## 0. The one correction this document exists to make

> **The incident flow is NOT a visible surface.**

A previous build exposed the flow as a **phase player**: a phase selector, a
phase card with Authorize/Approve/Reject, a timeline with Prev / phase buttons
/ Next / Auto-play, a time scrubber, and a "Follow phase" toggle. All of that
is **test scaffolding**. It made the flow legible to a reviewer and, in
doing so, turned the product into a demo of a demo.

**In the product, the operator never sees a phase.** The incident *is* the
state. The operator experiences a report arriving, a doubt, an intel gap, a
recommendation, a decision, a consequence, and a change — in that order,
because of what they do, not because a scrubber moved.

The consequence for the build: **the flow must be driven by the incident state
machine, and the shell must render whatever state it is in.** There is no
"go to phase D" affordance. There is a *gate* the operator holds, and a map
that responds.

---

## 1. What TALON is

Not a chatbot. Not an avatar. **An instrument that has a body.**

TALON has a permanent seat in the shell and a *posture* that is always
legible without reading a word. It proposes. The human authorizes. **It never
executes.** Everything TALON suggests becomes a gate a person can refuse, and
refusing is a first-class, recorded act.

### The four properties

1. **It cannot speak a state that isn't true.** TALON's posture, pitch, and
   every chip it renders are *derived* from machine state by a single
   function. There is no separately-authored copy that can drift out of sync
   with the situation. *(Existing implementation:
   `src/app/domain/talonSurface.ts` → `deriveTalonSurface()`.)*

2. **Its uncertainty is named, never a bare number.** A confidence always
   reads with its basis and its ceiling — e.g. *"78%: thermal 91 + satellite
   87, capped by 48h-stale moisture."* A number without basis is a policy
   violation, not a style preference.

3. **It has a budget of attention.** One interrupt at a time. Runner-ups
   demote to badges. Routine material stays in the log. The budget is
   enforced in code, not by good intentions. *(Existing implementation:
   `src/app/domain/attention.ts` — 19 contract checks in `verify:attention`.)*

4. **It escalates *away* from the operator.** When the operator rejects
   TALON's position and new evidence crosses a threshold, TALON re-raises
   to a **Regional Duty Supervisor** — not back to the person who just said
   no. A system that only ever argues with the person in front of it is a
   system whose disagreement is decorative.

### The seven postures

One motion grammar, seven states. Every state animates the same three parts —
perimeter ring, source vectors, aperture blades — so the mark reads as *one
instrument changing behaviour*, never seven different loaders.

| Posture | What it means | What the operator sees |
|---|---|---|
| `watching` | nothing to say | ambient only; a slow breath on the ring |
| `listening` | the operator is speaking | amplitude ripples outward |
| `searching` | gathering evidence | evidence streams inward along the vectors |
| `solving` | reasoning | vectors solidify; the core commits |
| `gated` | **a decision is staged and awaiting a person** | **the blades close over the core and hold** |
| `executing` | supervised, working | steady supervised rotation |
| `blocked` | cannot resolve | one vector severed; the aperture does not close |
| `receipt` | resolved | blades open; the core settles solid |

> The `gated` state is the whole point of the mark. A particle orb can show
> an AI thinking. **It cannot show an AI being stopped** — which is the one
> thing this product's mark must be able to say.

---

## 2. The operator ↔ TALON loop

This is the interaction the product is actually about. It is a loop, and every
turn has a matching *map* state.

```
   situation        TALON does                     operator does
   ─────────        ──────────                     ─────────────
   a report  ──→    frames it, names the gap  ──→  reads, judges
   a doubt   ──→    says what it does not know ──→  decides to look
   intel     ──→    assembles a picture      ──→  compares it
   a plan    ──→    proposes, with basis     ──→  interrogates, revises
   a decision ──→   stages a gate, and waits  ──→  holds, or refuses
   a refusal ──→    preserves the dissent     ──→  carries on, or re-raises
   a change  ──→    visualises the delta     ──→  accepts, or rejects
```

**The refusal path is the one that has to work.** Everything else is
demonstrative; the refusal path is the product.

---

## 3. The shell

> **Reference:** **getone.one** for the console, panel and interaction
> grammar; **FireTrace** for the map stage, the right-rail structure and the
> analytics bar. Sentinel's own law is the bottom deck.
>
> Take the *logic* from each. **Do not copy either surface.** GetOne's
> palette is not ours; FireTrace's sandstone chrome is explicitly rejected
> (`DECISIONS.md` §2.4).

### 3.1 Regions (1920 × 1080)

| Region | Geometry | Contents | Law |
|---|---|---|---|
| **Truth strip** | Top, 40px, floating pills over the map | incident id · phase chip · `T+ MM:SS` · mode badge | **Silent when clean.** No buttons. It states, it does not act. |
| **Map stage** | Full-bleed, behind everything | the world, the fire, the plan, the assets, the operator's selection | **The map is the hero.** Only active operational state emits light. |
| **Left spine** | 56px collapsed / 340 open, snap | situation · fleet · ledger | The operator pulls. **It never auto-opens.** Peek tabs carry a tier dot and one live lip. |
| **TALON console** | 380px, full height under the truth strip | **TALON's body** — see §3.2 | Always open. TALON is never hidden. |
| **The Hand** | Bottom centre, 88px, content-width | the staged gate · the decline option · the danger menu · the expiry ring | **Gates live ONLY here.** No navigation, no history, no chat scrolling. |

**Map real estate:** with the Hand at 88px and the spines collapsed, the map
holds ≥92% of the frame.

### 3.2 The TALON console (GetOne's grammar, our content)

Three zones, stacked:

**Zone 1 — Ambient header (~72px).**
A 28px aperture sigil, a posture label, and **one** posture line from
`deriveTalonSurface()`. This is a *status readout*, not an avatar. No idle
animation loop beyond the 4s watching cadence. When a gate stages, the sigil
closes its blades here **and** identically on the gate tile.

**Zone 2 — Composed thread (flex, scrolls).**
One TALON turn = **one card**. Fixed anatomy, no variants:

- **eyebrow** — what this is (`EVIDENCE · CONFLICT`, `RECOMMENDATION · DISPATCH`)
- **one hero** — the single claim or number
- **evidence chips** — provenance to the source kinds
- **one action row** — numbered `1 2 3` where options exist, the recommended
  one labelled *(Recommended)* inline, **keyboard-addressable**, never
  colour-only
- **class chip** `C2` / `C3` — friction is *explained*, not arbitrary

**Card laws:**
- **Height = status.** Open cards are full. Resolved, expired, and dismissed
  cards collapse to a **one-line receipt** (`Staged "AUTH CONTAIN" expired —
  nothing executed · AUD-…`). Nothing vanishes untraceable.
- **The voice never duplicates the card.** TALON speaks one clause
  (`• One renewal is at risk.`); the card carries the substance. If the
  sentence would narrate what the card already shows, **the sentence is
  wrong**.

**Zone 3 — Voice bar (sticky, ~64px).**
Mic + waveform state (`listening` = red bars) + typed input + send. The
transcript is editable before submit; Escape cancels without losing it.
**When listening, the thread condenses to a single pill** — dictation never
competes with a full card for attention. Voice is **primary input, never
only input**; the keyboard path is constitutional.

**Sticky mirror.** The staged action renders identically in the console and in
the Hand. One state, two renderings.

### 3.3 The map stage (FireTrace's grammar, our content)

- The map is **full-bleed** and the chrome floats over it.
- **FireTrace's analytics bar** — three charts, one slot, subject switches
  with the view: world model → Fire Area / Rate of Spread / Elevation
  Profile; camera → Altitude / Max Temp in View / Battery. 60s of history
  solid, projection dashed. **This is our timeline, and it replaces the old
  "deck carries the timeline" law** — the deck is gates only.
- **FireTrace's right-rail stack** — layers, roster, detail — is the model
  for *contextual* panels. In Sentinel these sit in the **left spine** (the
  operator pulls) rather than a permanent right stack, because the right is
  TALON's.

### 3.4 Keyboard grammar (GetOne)

Shortcuts render as **keycap typography** (`esc`, `space`, `E`, `1–3`), not
tooltips. Every keycap is a real keyboard path; nothing is pointer-only.

`1–3` answer the thread's options · `J`/`K` cycle spine views · `esc` cancels
listen or undoes an intent receipt (with an `esc to undo` chip inline) ·
**hold `space`** on the gate tile for the 2s authorize.

---

## 4. Authority — the constitution

This is **not** new. It is the existing, gated safety model, and it must
survive the redesign intact.

| Law | Where it lives | Verified by |
|---|---|---|
| Gated actions require an explicit human authorization; TALON may not execute | `src/app/domain/stateMachine.ts` → `GATED_ACTIONS` | `verify:flows` |
| **Hold to authorize** — 2s. A plain click on a gated verb must never fire it | `src/app/components/kit/core.tsx` → `CommandTile` | `verify:flows` |
| Staged actions **expire back to watch**. Expiry is never execution. Silence never approves | `src/app/domain/staging.ts` | `verify:flows` |
| Dissent is a **preserved record**, not a message. TALON's position and the operator's are both kept verbatim | `src/app/domain/disagreement.ts` | `verify:flows` |
| Re-raise requires **new evidence since the override** and routes to a second authority | `src/app/domain/disagreement.ts` | `verify:flows` |
| One interrupt at a time; runner-ups become badges; routine stays in the log | `src/app/domain/attention.ts` | `verify:attention` (19 checks) |
| Voice is **derived from state** — TALON cannot speak a state that isn't true | `src/app/domain/talonSurface.ts` | `verify:flows` |
| Degraded states state the **blocker reason**, never a dimmed button | `verify:flows` | `verify:flows` |
| Tokens are the only source of style | `src/app/tokens.ts` | `audit:tokens` |

**A redesign that breaks any of these is not a redesign.** If a new surface
cannot express a gate, it cannot carry this product.

---

## 5. Honesty — the provenance law

`DECISIONS.md` §1.3 and §1.6. Restated because the UI is where it lands:

- **TALON's product role includes fire-behaviour analysis.** The model is
  built by AI engineers; the designer's job is the operator↔AI contract. The
  prototype ships a scripted stand-in.
- **Never present an authored value as measured.** Every fire, weather, and
  detection metric states its basis: **measured** (real feed) · **modeled**
  (named model, e.g. Rothermel 1974, inputs shown) · **authored** (scripted
  placeholder).
- **The guard is labelling, not disclaiming.** Telling the reviewer the
  product is capable but the prototype is not teaches more than telling them
  the product is incapable.
- No invented success rates or performance numbers. The authority packet is a
  mutual-aid **draft** the operator sends, not a cryptographically sealed
  receipt.
- **TALON's voice is the surface where this law is most easily broken.** A
  confident sentence is a claim. If the underlying value is authored, the
  sentence must carry the basis.

---

## 6. Generative UI — TALON composes, never rearranges

**Rule: TALON composes inside declared zones. It never moves the furniture.**

- **Whitelisted composition targets:** console thread cards · the analytics
  bar's chart slot · the map annotation layer · ledger receipt rows.
- **Never:** resizing panels, opening panels, moving the Hand, changing the
  density mode, reordering the truth strip, or anything that moves a control
  the operator is mid-way through using.
- **It proposes a layer; the operator decides whether it is on.** Same
  constitution as the deck.
- Any AI-generated surface must be **inspectable**: the operator can see
  what TALON produced and how it got there.

---

## 7. The map ↔ TALON relationship

The map is the substrate; TALON is what makes it meaningful. Their contract:

- **TALON proposes layers; the map renders them.** The map never decides
  what to show on its own.
- **The map is interrogable, and TALON can point at it.** When TALON says
  *"Route B is the only way out for the 19 structures above the hairpin,"*
  the 19 structures are **selectable on the map**, and selecting them
  selects the same objects in TALON's card. One truth, two views.
- **The plan revision is visible as a delta.** `plan` (committed) and
  `planDraft` (proposed) render together, and the draft is unmistakably
  provisional. *(Contract: `12-incident-flow-and-map-states.md` §1 Phase G.)*
- **Physical phenomena appear in sensor feeds; annotations do not.** A drone
  camera sees terrain, fire, and heat — not an evacuation route drawn on the
  map.

---

## 8. What the shell must not become

Learned from the previous two attempts:

- **No tier exposed as a product surface.** An internal architecture tier
  (engine / flow map / testbed) must never be visible to the operator. The
  phase player is the repeat of this mistake.
- **No "mode" the operator has to understand.** There is the product.
- **No auto-opening panels.** The left spine never auto-opens; TALON badges,
  the operator opens. T1/T2 peeks are budgeted to ≤2 per 10 minutes.
- **No chat log as the primary TALON surface.** The thread is composed
  cards; a chat transcript is the fallback, not the design.
- **No motion that gates input.** Commands are clickable from the first
  frame.

---

## 9. Acceptance criteria

1. An operator can complete the whole arc — report → doubt → intel → plan →
   authorize → operation → revision — **without ever seeing a phase label, a
   scrubber, or an auto-play control.**
2. TALON's posture, pitch, and chips are all derivable from one function, and
   no authored copy can contradict the state. *(Existing: `talonSurface.ts`.)*
3. A gated verb cannot fire on a plain click. A staged action expires back
   to watch if the operator says nothing.
4. Refusing TALON produces a **preserved record**, and a later re-raise
   cites only the new evidence.
5. Every fire/weather/detection value shown states its basis.
6. An operator can select the objects TALON is talking about, on the map and
   in the card, and they are the same objects.
7. A draft plan is unmistakable for a committed one in a still frame.
8. The map holds ≥92% of the frame at 1920×1080 with the spines collapsed.
9. Every keyboard path exists and is discoverable as keycap typography.
10. `prefers-reduced-motion` preserves static state legibility — a closed
    aperture still reads as gated.

---

## 10. Out of scope

The map engine and the data pipeline (built — see `MAP-BRIEF.md` and the
`tactical-terrain` project). The state machine, gating law, dissent records,
and attention arbiter (built, gated, and **not to be redesigned**). The
server-side LLM gateway. What goes to field teams and how.

---

## 11. Reference frames

| What | Where |
|---|---|
| getone.one console, cards, voice, keycaps | `C:\Users\rudra\AppData\Local\Temp\opencode\vid2` (if retained — otherwise describe from §3.2) |
| FireTrace map, right rail, analytics bar, layers | `C:\Users\rudra\AppData\Local\Temp\opencode\vidframes` (re-extractable from `D:\Downloads\I9C5fnlHLSd31oxb.mp4`) |
| The map build and its own docs | `D:\Downloads\first attempy\tactical-terrain\` |

**Palette:** dark obsidian console with semantic accents. FireTrace's
sandstone chrome is **rejected** — take its map logic, not its colour.
