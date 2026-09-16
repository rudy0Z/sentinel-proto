# Sentinel (FlytBase Sentinel) — Empathy Maps

> Repo: `D:\portfolio porjects\flytbase` (branch `feat/map-spatial-os`) · Documented 2026-09-16.
> **Basis & honesty note:** no user interviews exist. Maps are **inferred** from the product's own authored persona (Asha, `PRODUCT.md`), its brand personality ("precise, calm, accountable"), anti-references, the dissent model's written design intent (`disagreement.ts` comments), and microcopy (`microcopy.ts`). "Says" quotes are lines the design itself writes — intended persona voice, not field data. Companion: [01-user-journey-map](01-user-journey-map.md).

## Personas identified from the product design

| Persona | Role | Stake | Source |
|---|---|---|---|
| **P1 — Asha, operator on authority** (primary) | Wildfire-response operator deciding escalation + supervising ops | Legal/operational authority; lives and land | `PRODUCT.md` authored persona |
| **P2 — Relief operator / shift lead** | Receives formal handover (PIN) | Continuity without authority ambiguity | handover flow + SEN-22 |
| **P3 — Regional commander / second authority** | Receives TALON appeals; co-signs contested escalations | Accountability for contested calls | talon-reraise flow |
| **(P4 — TALON, the copilot)** | Not a user — but the counterparty whose "experience" the dissent model deliberately designs | — | included as design counterparty |

---

## P1 — Asha, the operator on authority

**Context (inferred):** command desk, multi-source feeds (satellite IR, drones, LiDAR, ground thermal, burn history), a 48-minute baseline she must compress to 90 seconds *without owning a wrong escalation alone*. Trained, skeptical of automation, accountable by law and role.

### Says (the voice the design writes)
- "AI proposes. Operator authorizes." (entry screen, her contract with the system)
- "Thermal, satellite IR, and burn-history signals converge at 78%." (what she wants TALON to say — provenance attached)
- "I do not have grounds to recommend escalation yet." (the honesty she needs to hear at 46%)
- "Your 19-minute record stays attached to the packet." (handover promise, SEN-22)

### Thinks
- *78% of what?* — confidence without provenance is noise to her.
- *If I say no and it was real, that's on me* — the asymmetry that makes dissent-gating (a stated reason) feel fair rather than bureaucratic.
- *Is it nagging or is it new?* — the raised re-raise bar exists exactly for this thought.
- *What is it NOT seeing?* — the question `PRODUCT.md` says success is measured by.
- *Who else knows what I know?* — the handover anxiety the PIN formalizes.

### Does
- Demands evidence source freshness before any escalate.
- Uses voice override mid-crisis ("voice-directed correction applied to a staged mission").
- Holds-to-authorize on containment — a deliberate physical gesture for a critical act.
- Writes her dissent reason — because the system requires it and she agrees it should.
- Runs the guided 90-second run before trusting free exploration.

### Feels
| High | Low |
|---|---|
| Authority with backup (TALON prepares, she decides) | Peak load at the review gate (78% + smoke-obscured visual + stale fuel data) |
| Respect when TALON argues back with new evidence, not repetition | Weight of sending the packet ("wake up county dispatch") |
| Closure when ground truth reconciles the record — even against her | Distrust when systems break silently (designed away) |

### Pains / Gains
- **Pains:** automation that hides gates; disagreements that vanish; failures that strand; untraceable consequential actions.
- **Gains:** disclosed uncertainty; structural dissent memory; receipts; a copilot that can *be stopped* visibly.

---

## P2 — The relief operator (handover receiver)

### Says
- "Authority is ambiguous until the incoming lead takes it." (the formalization she relies on)

### Thinks
- *What did the last lead see that I haven't?* — the outgoing record stays attached to the packet.
- *Am I commanding yet?* — not until the PIN.

### Does
- Takes authority by PIN; reviews ICS-209 debrief timeline; inherits open dissent records.

### Feels
| High | Low |
|---|---|
| Continuity (context restarts at watch, records intact) | Ambiguity — eliminated by the formal open state (SEN-22) |

---

## P3 — The second authority (regional commander)

### Says
- "Second authority agrees with TALON; escalation proceeds without reversing the first operator's record." (talon-reraise contract)

### Thinks
- *Two humans have now declined* — and the system records that without breaking the watch.
- *Whose call was this?* — the packet answers: `talon-recommended` vs `operator-initiated`.

### Does / Feels
- Receives appeals only when the raised bar is crossed; co-signs escalations that don't erase the first operator. Feels: consultative weight without rubber-stamping; the record protects everyone who touched the decision.

---

## P4 — TALON (the designed counterparty)

The maps above only work because TALON is given a *character* by the code: it **proposes with provenance** (78%/46% with named sources), **keeps its position verbatim when overruled**, **argues by raising evidence, not by nagging** (+16/+9/+4/+12 bars), **prepares but never sends**, and **remembers being wrong** (reconciliation in both directions). The 8-state mark (watching → listening → searching → solving → gated → executing → blocked → receipt) gives it legible body language, including the one thing no other AI mark can say: **gated** — blades closed over the core at a human gate.

## Cross-persona insight (quotable)

Every persona's map resolves to the same design sentence: **authority is never ambiguous, dissent is never silent, and failure is never a dead end.** Sentinel's empathy work is not decoration around an AI — it is the guardrail layer that makes a human–AI command relationship operable.
