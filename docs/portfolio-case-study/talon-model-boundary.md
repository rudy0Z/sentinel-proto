# TALON — What Is Real, What Is Authored, What Production Requires

Status: **Resolved.** TALON is an authored decision system with a genuine state
machine and a genuine evidence contract. It is not a trained model, and this
document says so on purpose, then draws the line to what production would need.

This exists for the same reason the map document exists: to turn a boundary
into evidence of judgment instead of a gap a reviewer discovers on their own.

---

## 1. The claim Sentinel actually makes

Sentinel's problem statement is a 90-second decision loop replacing a 48-minute
one, with AI widening the evidence a human can review in that window. Nothing
in that claim requires TALON to be a trained model inside the prototype — it
requires the *interface* to behave like one: consistent confidence, evidence
that builds instead of teleporting, agents that block and recover for stated
reasons, and a memory of what happened last time this shape of incident
occurred.

The risk was never "a product designer didn't train an LLM." The risk was
quieter: a trend chart or a confidence number that implies a data pipeline
underneath it that doesn't exist. That gap has since been closed in code, and
this document is the write-up of what closed it and what remains authored by
design.

---

## 2. What is real (built, not simulated behavior)

**A state machine, not a slideshow of scenes.**
`domain/stateMachine.ts` — 31 transitions, each with a stated event, guard,
human gate, and side effect. Every scene move resolves through
`resolveTransition`; an event with no legal edge from the current scene is
refused rather than applied. `npm run verify:machine` audits reachability and
distinguishes real gaps from injected faults, so the prototype can be asked
"what can the operator do from here?" and answered from the same table a
reviewer can read.

**An evidence contract with one clock.**
`domain/talon.ts` — `getSignalHistory` samples every trend chart backwards
through the same easing curve that drives displayed confidence. The invariant
that matters: the last point of a series is always the current value on
screen. A chart cannot disagree with the number printed beside it, and
`npm run verify:signals` checks this across all sixteen scenes. This used to be
six hand-written numbers per chart with no relationship to anything TALON
claimed to know — that gap is what this document exists to be honest about
even where it has been fixed.

**A disagreement model with both directions and a memory.**
`domain/disagreement.ts` — TALON escalating and the operator refusing
(*contested watch*, evidence held at reduced weight behind a re-raised
threshold scaled to the operator's stated reason); and the operator escalating
past TALON's hold (*operator-initiated*, TALON's objection attached to the
packet). Reconciliation is willing to record that TALON was wrong in the same
voice it records the operator being wrong — the verdict falls out of the
machine rather than being chosen for the demo.

**A governance surface, not a status light.**
Every agent task carries `requiresHumanGate`, `blockedBy`, and `auditId`.
Blocking is structural — `notification-brief` cannot reach `"complete"`
without an operator-authorized send — not a copy convention that could be
violated by a future screen.

None of the above required training a model. All of it required deciding, in
advance, what TALON is allowed to believe and when it is allowed to speak — the
actual design problem underneath "AI-native."

---

## 3. What is authored, not learned (and why that's the honest choice)

`SIGNAL_PROFILES` in `domain/talon.ts` is sixteen scenes × three signals of
hand-set start/target values and a hand-set entry progress. It is not a
regression fit against historical fire behavior. It is a designer's model of
*what a trained system's output would look like*, built so the shape is
plausible (thermal decaying under successful containment, confidence held flat
by a lost source, evidence still climbing under an active contest) without
claiming a training corpus this prototype never had.

The re-raise thresholds in `disagreement.ts` work the same way: a "false
positive" override raises the bar further than an "operational constraint"
override, because one is a claim about the world and the other is a claim
about operating conditions — a judgment a designer can make about *what should
matter*, not a weight learned from outcomes.

This is the same move as the map decision: faking the training data with
invented numbers dressed as a model would be a worse artifact than an authored
model that says plainly what it is. An interviewer who asks "is this trained on
real fire data?" gets an honest no, and a specific answer for what would sit
underneath it in production.

---

## 4. The production path (specialist work, correctly out of scope)

| Layer | Production approach | Owner |
|---|---|---|
| Evidence fusion | Model fit on historical incident + sensor data (thermal, satellite, LiDAR, weather) per region, retrained on a cadence | ML / data science |
| Confidence calibration | Learned from reconciliation outcomes — every resolved disagreement (`DissentResolution`) becomes a training signal for whether TALON's confidence at decision time was well-calibrated | ML |
| Historical memory | A structured incident archive per zone (burn history, false-positive rate, prior escalations) that the fusion model conditions on — `historical-verification` agent's `output` field is the *interface* to this, not the memory itself | Data engineering |
| Recommendation policy | Whatever produces `getTalonRecommendation`'s text/action/tone today would be a policy layer over the fusion model's confidence — rule-based at first, learned once enough reconciliation data exists | ML + product |
| Interface contract | Fusion model outputs a stable shape (per-source status, confidence, freshness, blocker) that `EvidenceSource` already specifies. Building against this contract now means production can swap the authored profile for a real model without touching a single screen | **This is the product design deliverable, and it is done** |

The important row is the last one. The interface was designed as if a real
model already existed behind it — the same discipline as designing a settings
screen against an API contract before the backend ships. That is the
differentiator this document is written to make legible: not "I built an ML
model," but "I designed the exact seam a real one would plug into, and proved
the interface works by authoring plausible values against that seam."

---

## 5. What this demonstrates (the point for interviews)

- **Scope discipline** — the same discipline as the map decision: build the
  interaction contract, document the seam, do not fake the specialist layer.
- **Systems thinking under a stated constraint** — the disagreement model exists
  because "TALON is always right" is a worse design than "TALON can be
  overruled, remembers being overruled, and is sometimes wrong."
- **Integrity** — nothing on screen claims a capability the artifact doesn't
  have. The trend charts used to violate this quietly; they don't now, and the
  fix is itself part of the record.
- **AI-native design specifically** — the reconciliation model is the one piece
  most AI products skip: recording when the AI was wrong, in the same voice
  used to record the human being wrong, and changing system behavior as a
  result rather than only logging it.

This is not a substitute for the ML work a real Sentinel would need. It is the
part of that work that belongs to product design, done to the same standard as
the rest of the prototype.
