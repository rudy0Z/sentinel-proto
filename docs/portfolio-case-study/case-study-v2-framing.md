# Case Study V2 — Framing Draft

> **Status:** DRAFT — skeleton for the case-study rewrite (framing only, no code). Vocabulary authority: `docs/sentinel-flagship-quality-upgrade.md` (§0 thesis, §2 repairs, Appendix A rejections). Nothing here is published copy until the §3 exit gate ("vault true, captures clean, framing drafted") closes.

**Thesis sentence (locked from the plan):** Sentinel compresses the time to a defensible first escalation decision from 15 minutes to under 90 seconds, then becomes a supervised tactical coordination surface. TALON is a reasoner strapped to a constitution: the state machine validates, the human authorizes, the LLM never acts directly. If the model is fully hijacked, the worst case is a weird voice — never a wrong action.

**Audience duality (write for both):** (1) the product designer — every state legible, every blocked action explained, every AI action inspectable, failures with real exits; (2) the AI builder — a permissioned tool layer over a formal machine, derived (not free-form) voice, structural refusals/re-raises/uncertainty, an eval harness.

---

## 1. The 11-row pattern scorecard

One row per design pattern Sentinel actually demonstrates. Columns: where the pattern lives in the product (scene/component), what a reviewer should do/look at, and the evidence artifact that proves it. Rows marked *planned* point at S5/S6 scope and must be labeled planned in the published case study.

| # | Pattern | Where it lives in the product (scene / component) | What a reviewer should look at | Evidence artifact |
|---|---|---|---|---|
| 1 | Human-authorization gates | `GATED_ACTIONS` in `stateMachine.ts`; staged command cluster with "Hold 2s"; scenes `authority-notification-ready`, `contain-recommended`, `handoff-pending` (planned) | Try to fire a gated action without the hold. The gate must explain what clearing it unlocks — never a dead button. | Flows audit 19/19 (`verify-flows`); TRANSITIONS table as single source; frozen-frame captures of each gate |
| 2 | Dissent-with-memory | `disagreement.ts` + `dissent_records`; scene `monitoring-contested` | Override TALON: the modal *requires* a reason; TALON's position is preserved verbatim with its confidence; nothing is deleted. | `DissentRecord` type (`src/app/tokens.ts`); dissent receipt in the audit ledger; contested-watch capture |
| 3 | Re-raise-with-new-evidence | Scene `talon-reraise`; anti-nag rule in the constitution | Reject an escalation, then let thermal expansion cross the bar: TALON re-raises citing only the *new* delta — it never repeats the old pitch. | Re-raise threshold spec (vault 03 §4); red-team "nagging" test (S6, planned); session transcript receipts |
| 4 | Forced calibrator | Burn-permit checkbox promoted to `verify-source-conflict` (planned, S5; today embedded at `verify-active`) | Make the two primary sources disagree: the UI blocks forward progress until a human resolves, with a TALON pitch naming the tiebreaker. | `verify-source-conflict` TRANSITIONS row (vault 03 §2.2); source-conflict captures; V3 clarification spec |
| 5 | Degradation ladders | Fault scenes: `satellite-feed-loss`, `network-degraded`, `rescue-battery-critical`, `rescue-signal-degraded`, `infrastructure-total-loss` | Inject every fault: each has a distinct visual surface and a *verified exit edge* — no dead ends, no fake recoveries. | Failure catalog with recovery exits (vault 03 §5); flows audit 19/19; fault-injection captures |
| 6 | Receipts / audit | Decisions receipts; hash-chained event append via `node:crypto` (S3); `authority_packets` with basis field; debrief export | Open the audit ledger: every confirm/override/escalation/abort has an immutable receipt with a basis (e.g. `operator-initiated (pre-convergence)`). | SQLite event-sourced store schema (S3); AUD-90-0847 mutual-aid draft receipt; `post-incident-review` (planned) export |
| 7 | Derived voice single-source | `talonSurface.ts` — `deriveTalonSurface()`; TALON orb (`TalonMark.tsx`); chip responses | At any frozen moment, the orb posture, pitch, and chips must all be derivable from machine state — TALON cannot speak a state that isn't true. | Single-derivation invariant; post-turn truth-check (vault 04 §6): rejected turns fall back to authored copy, logged `truth_check: false` |
| 8 | Uncertainty naming | Evidence convergence panel; pitch output contract ("confidence with basis, capped by stated caveat") | Hunt for a bare number. Every confidence reads like `78%: thermal 91 + satellite 87, capped by 48h-stale moisture`. A number without basis is a policy violation. | Per-source confidence + latency display; prompt scaffold output contract (vault 04 §6); captured pitches |
| 9 | Supervised execution | Executing posture (clockwise burn, cyan); plan comparison; tool allowlist (`propose_transition` renders a gate, never executes) | Watch TALON "do" something: the LLM's proposal becomes a human gate. Denied proposals surface visibly and are audited. | Tool contract (vault 04 §5); red-team gate-waiver test (S6, planned); golden-run parity scripted-vs-live |
| 10 | Expiry-never-execution | Class-2 staged actions (orbit adjust, scout handover, pre-staged alerts) | Stage an action and stay silent: it expires back to watch, the expiry is logged, and the state is unchanged. Expiry is never execution. | Class-2 HITL table (vault 04 §2, [REPAIRED]); regression test: silence → state unchanged + expiry logged (planned gate) |
| 11 | Honest prototype labeling | Entry badge, `live-ai`/`scripted` mode labels, scenario picker, case-study disclosure | Look for the honesty boundary on every surface: no fire-trained-AI claims, TALON named as a general LLM in a domain tool harness, scripted vs live always visible. | Mode badge implementation; disclosure copy; non-goals lock (no FlytBase API, no certification claims) |

## 2. Metrics framing (three axes, none vanity)

**Velocity — "time to a defensible first decision."** Baseline: 15 minutes of manual verification (check permits, coordinate assets, assemble a dispatch packet) before a first escalation decision. Sentinel: under 90 seconds from anomaly (`baseline` → `alert-command`) to a gated, receipt-backed mutual-aid notification draft (`authority-notification-ready` at T+75s in the arc). Scope discipline: the 90 seconds end at *verified escalation + authority handoff*, never at "containment planned" — that older claim was retracted in writing (see `sentinel-ai-upgrade/01-breakthrough-decision.md`) and the case study should tell that retraction as a decision story, not hide it.

**Clarification — "the system asks before it argues."** The pattern to surface: when evidence conflicts, Sentinel routes the human to a calibrator instead of silently picking a winner; missing data is declared in the pitch, not footnoted; every confidence carries its basis and its ceiling cause. Candidate measures: share of TALON turns that name their evidence basis (target: all); conflicts surfaced vs conflicts silently resolved (target: zero silent); questions asked by TALON at low-evidence moments (V3 clarification, planned).

**Trust — "zero by construction, not by promise."** Claims that must be true by architecture, with counters that should read zero: actions executed without a receipt (0), gate bypasses reachable from any state (0 — machine-enforced), staged actions that executed on silence (0 — expiry is never execution), repeated pitches without new evidence (0 — anti-nag is structural). Trust framing also includes the failure story: five fault scenes with real exits, and dissent that is never silent and never erased.

## 3. Grice-style framing paragraph

The case study deliberately avoids the four maxim violations that make AI portfolio work read as inflated. *Quantity:* it never says "90 seconds" without naming what completes in 90 seconds (verified escalation, not containment planning), and it never claims stage/route counts without derivation. *Quality:* only implemented and gate-verified claims are stated as fact; everything planned is labeled planned (`verify-source-conflict`, `post-incident-review`, live-AI red-team scores); performance is stated as budgets ("idle 0% GPU, ≤12 draw calls — read it off the perf HUD"), never as "locked 60fps"; receipts are described as hash-chained event append via `node:crypto` — engineering, not theater — and the authority notification is a mutual-aid draft the operator sends, with no legal-instrument authority implied. *Relation:* every section answers a question a reviewer actually asks ("what happens if I say no?", "what happens if I stay silent?", "what if the model hallucinates?"). *Manner:* the banned vocabulary family (timeout-into-approval phrasing, silence-triggers-action phrasing, legal-instrument claims) is replaced with the exact semantics: *staged action expires back to watch; expiry is logged; expiry is never execution.*

## 4. Principled rejections (from Appendix A — each with its recorded reason)

| Rejected | Reason (recorded) |
|---|---|
| Orb libraries | WebGL context thrashing + dual-canvas instability (post-mortem, vault 09 §2); a wobbling blob cannot communicate gates or lockouts |
| Full-glass conversion / panel refraction | Authorization surfaces must stay opaque; legibility over spectacle |
| Departure Mono (any size), serif console type, fourth font family | Type system capped at ≤3 weights + fourth-family audit rule; pairing risk without payoff |
| Class-2 auto-timeout | Expiry is never execution — silence at a staged gate leaves state unchanged (B1 repair) |
| Autonomous dispatch | TALON proposes, human authorizes; worst case of a hijacked model is a weird voice, never a wrong action |
| Crypto-statutory language | No fake hash, no legal-instrument language; receipts are hash-chained via `node:crypto` (S3) and the packet is a mutual-aid draft TALON never sends |
| Invented modes / routes / scenes | Every scene/edge must be enumerated with machine parity; doc names ∩ code names exact (B3) |
| Audio alerts | Not scoped; "sound-reactive" renamed voice-*phase*-reactive (B4) |
| Cesium / deck.gl / OSRM | Rejected with reasons in the map track; three.js + ngraph chosen |
| Open "how can I help" | No open chat forms; structured chips keep TALON's voice derived and refusal surfaces real |
| Refinement loops | Anti-nag law: no repeat pitch without new evidence crossing the re-raise bar |
| Drag-dispatch as execution | Drag-dispatch wired as `propose_transition` only — staging, never execution |

## 5. Open items before this leaves DRAFT

- Fill "evidence artifact" cells with final capture filenames + audit command outputs once P0 craft MUSTs and captures land.
- Decide which rows lead the narrative (recommend: 1, 6, 10 — gates, receipts, expiry-never-execution).
- Velocity/Clarification/Trust sections need their final measured numbers (do not publish the framing without them).
