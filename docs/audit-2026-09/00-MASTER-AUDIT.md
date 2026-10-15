# Sentinel — Master End-to-End Product, UX, AI, State, Safety & System Audit

> **Status**: canonical · Forensic audit of the working tree on branch `feat/map-spatial-os`, 2026-09-29.
> **Method**: repository + running product as source of truth. No code was modified during the audit.
> **Evidence base**: full read of `src/app/domain/*`, `SentinelShell.tsx`, panels/shell2/kit, map stack; static gates
> (`verify:machine`, `verify:signals`, `verify:attention` via tsx, `verify:map` 9/9, `audit:tokens`); runtime gates
> (`verify:flows` 22/22, `verify:routes` 23/23 with axe) against the production build; a live browser walkthrough of the
> guided arc (entry → alert → investigation → verify → conflict gate → packet → Operations), the v2 Command Deck, the 3D
> EXPLORE twin, and deep-linked exception scenes. All file:line references were verified against the working tree.

---

## A. Executive diagnosis

**What Sentinel actually is today.** The most credible artifact in the repo is not the UI — it is the *governance
layer*: a 20-state / 39-edge transition table with per-edge reasons, guards, dissent requirements, and effects
(`stateMachine.ts:110-439`); a staged-action TTL whose expiry provably executes nothing (`staging.ts:29-40`,
`SentinelShell.tsx:808-837`, flow-tested); a single TALON surface derivation with an explicit no-false-quiet guard
(`talonSurface.ts:174-283`); and an unusually strong verification culture (22 browser flows, 23 axe-audited routes,
machine/signals/attention contracts, an adversarial TALON eval battery). The product thesis — *AI prepares, humans
authorize* — is structurally real in the primary arc, and the runtime walkthrough confirms it feels like a command
instrument, not a dashboard.

**What it is trying to become.** A senior-level portfolio case study proving that the author can design a human-AI
authority architecture under time pressure, uncertainty, and physical consequence — and can translate that
architecture into a working system.

**The biggest gap between the two.** The constitution is real but **leaky at exactly the places a skeptical reviewer
will poke**, and **decorated with trust language the system does not earn**:

1. The single most consequential human gate — sending the authority packet — has a gate-`none` bypass edge
   (`operator.authorities-notified`, `stateMachine.ts:378-385`) that flips `authoritiesNotified` to true, which is the
   exact flag that makes the packet read "sent" (`talon.ts:974-987`). The server accepts it from any automation and
   issues a hash-chained receipt for it (`server/index.ts:141-172`).
2. The Class-3 hold-to-confirm — the repo's signature friction — exists **only in the legacy ActionBar**. The v2
   Command Deck fires `authorize-containment` on a plain click (`CommandDeck.tsx:130-135`) while its own header claims
   "gates live here and ONLY here." Two layouts currently ship two different safety envelopes.
3. The UI repeatedly claims cryptographic assurance it does not have: a hardcoded "RECEIPT · SHA-256 e62d93c8…
   · hash-chained" string (`DebriefTimeline.tsx:68`), "Cryptographic Receipt: AUDIT-8842" for a plain state write
   (`SentinelShell.tsx:1738`), "Cryptographic transfer of active tactical incident command" for a hardcoded PIN
   (`ActionModal.tsx:779`). The client ledger has no hash at all. This violates the repo's own honesty boundary
   (AGENTS.md rule 1) and is the single largest portfolio credibility risk.

Verdict in one line: **Sentinel is a genuinely strong interaction architecture wrapped in a trust narrative that is
partly earned and partly fabricated — and the fastest way to raise the portfolio ceiling is to delete the fabricated
half and close the four structural bypasses.**

---

## B. Complete architecture map

```text
REAL WORLD (scripted fixtures: talon.ts scene profiles, mockData.ts, verification.ts)
   ↓
EVIDENCE — getEvidenceSources (7 live sources of 9 declared kinds, talon.ts:429-493)
   ↓         per-source confidence + static lastUpdated + status (active/stale/pending/failed/missing)
FUSION — authored per-scene signal profiles + easeToward convergence over a 45s scene clock (talon.ts:266-349)
   ↓
TALON REASONING — authored decision briefs, agent workforce w/ tool traces, session engine (talon.ts, microcopy.ts)
   ↓               surface truth forced through ONE derivation: deriveTalonSurface (talonSurface.ts:174-283)
STATE / GOVERNANCE — TRANSITIONS table: guard + gate + requiresDissent + effects (stateMachine.ts:110-439)
   ↓                  single door: dispatch() → resolveTransition (SentinelShell.tsx:494-515)  [has bypasses]
PERMISSION — GATED_ACTIONS {confirm-incident, notify-authorities, authorize-containment, emergency-evacuate}
   ↓            staging TTL 45s (staging.ts), hold 2s (ActionBar HoldPill — legacy only)
HUMAN DECISION — ActionBar tiles / v2 Command Deck, DissentGate, mission briefs, packet modal w/ uncertainty
   ↓
AUTHORIZATION — confirm modals → dispatch; packet send = edge #15 guarded by !authoritiesNotified
   ↓
EXECUTION — scripted effects: mode switch, drone assignment, receipts appended to client ledger
   ↓
OBSERVATION — map (2D SVG + 3D twin), rail panels, exceptions, activity ledger, ICS-209 debrief export
   ↓
RECOVERY — 8 degraded/failure scenes, each with a real exit edge (flow-tested)
   ↓
ACCOUNTABILITY — client ledger (no hash) + reconciliation records + server hash-chain (reachable only via ?feed=live)
```

Actor responsibilities per stage: evidence/fusion/TALON = machine; state enforcement = machine (deterministic);
decision/authorization = human only (by construction in the primary arc); execution = machine under supervision;
recovery = human-confirmed in 7 of 8 cases; accountability = machine-recorded, human-readable.

---

## C. State-machine audit

### C.1 The 20 states

| State | Meaning | Entered by | UI surface | Human responsibility | Exits |
|---|---|---|---|---|---|
| baseline | Quiet watch, no incident | entry / resets | ambient TALON, rails | none | alert (timer/surface) |
| alert-command | First interrupt | timer / surface-alert | AlertPopup, T1 | choose dispatch vs dismiss | investigation-pending / baseline |
| investigation-pending | Scout en route | dispatch-scout (confirm) | InvestigationStrip, map route | wait or escalate early | verify-active / authority-notification-ready |
| verify-active | Evidence review | timer / open-verification | VerifyLiveFeed, ActionBar | confirm, decline w/ reason, resolve conflict | authority-notification-ready / monitoring-contested / verify-source-conflict |
| authority-notification-ready | Packet prepared | confirm-incident (human-approval) | packet card + modal | **send the packet (the 90s promise ends here)** | contain-recommended / contain-awaiting-teams |
| contain-recommended | Staging picture | notify-authorities (human-approval) | plan polygon, priorities, deck | override plan / authorize | contain-alternate / contain-degraded / rescue-nominal |
| contain-alternate | Operator-corrected plan | override-plan / voice-override (confirm) | CompactPanel | authorize or close | contain-recommended / rescue-nominal |
| contain-degraded | Terrain-model fallback | open-degraded (none) | widened envelope | accept buffer / authorize | contain-recommended / rescue-nominal |
| rescue-nominal | Supervised execution | authorize-containment (human-approval ×3 edges) | ops priorities, live assets | supervise, handle exceptions | battery-critical / partial-evac / handoff-pending / signal-degraded |
| rescue-battery-critical | Drone 14%, handoff | timer (sim guard) | ExceptionInterrupt T1 | acknowledge handoff (confirm) | rescue-nominal |
| rescue-signal-degraded | Relay degraded | **no live path at all** | banner | deploy backup (confirm) | rescue-nominal |
| monitoring-contested | Operator overruled TALON | monitor-only + DissentGate (confirm+reason) | ContestedWatchPanel, meter | resolve, or wait past bar | talon-reraise / baseline |
| talon-reraise | Bar crossed, appeal | timer.reraise-threshold (guarded) | ReRaiseBrief → supervisor | confirm or decline again | authority-notification-ready / monitoring-contested |
| satellite-feed-loss | IR offline | fault injection (deep-link only live) | ExceptionBanner | deploy survey (confirm) | contain-recommended |
| network-degraded | 340ms latency | fault injection (deep-link only) | ExceptionBanner | relay field intel (confirm) | contain-recommended |
| infrastructure-total-loss | Manual protocol | fault injection (deep-link only) | takeover surface | restart (gate none; button bypasses machine) | baseline |
| verify-source-conflict | Sources disagree | timer (never fired live) | blocked posture + calibrator | reconcile sources | verify-active |
| contain-awaiting-teams | Packet sent, crews staging | `operator.authorities-notified` (**gate none — finding P0-1**) | posture says "delivered" | wait | contain-recommended |
| rescue-partial-evac | Route A blocked | timer (never fired live) | honest partial state | authorize Route B (confirm) | rescue-nominal |
| handoff-pending | Authority unassigned | initiate-shift-change (confirm) | PIN modal | PIN 8842 (human-approval) | rescue-nominal |

### C.6 Graph analysis

- **No unreachable or dead-end states by the machine's own audit** — but the audit excludes the four fault scenes and
  counts table edges, not live call sites. **18 of 39 transition events are never fired anywhere in the client.**
  Consequence: `verify-source-conflict`, `contain-awaiting-teams`, `rescue-partial-evac`, and `handoff-pending` have no
  operator path — deep link / Review Dock only — contradicting the in-code claim "Each one is reachable"
  (`stateMachine.ts:363`). `rescue-signal-degraded` is worse: it is in neither the promoted set nor reachable, and no
  scenario or shell code ever enters it. Four of the eight "failure states" in the portfolio story cannot be *operated*
  into, only linked to.
- **Cycles** all have exits: contested loop, plan fork, degraded fork, verify-conflict loop, three rescue loops.
- **Can the operational story be reconstructed from the graph alone?** Substantially yes — the edge `reason` strings
  read like an operations manual (a real strength). What the graph does *not* reveal: which edges the UI actually
  offers, the two dispatch bypasses, and the fact that the strongest-looking states are display-only.

### C.3 Discrepancy table (claim vs documentation vs code vs runtime vs tests)

| Claim | Documentation | Code | Runtime | Test coverage | Discrepancy |
|---|---|---|---|---|---|
| 20 scenes / 39 transitions | AGENTS.md, README, redesign docs | confirmed (`ALL_SCENES`, 39 rows) | 20 deep-linkable | machine audit prints | none |
| "3 permission tiers" | vault 04 §44-46 | **not in code** — 4-value `CommandGate`, no tier labels | C1/C2/C3 chips on v2 tiles only | none | doc taxonomy; `hold` gate used by exactly 1 command, 0 transitions |
| Class 2 = 45s TTL, expiry never executes | vault 03, AGENTS.md | `staging.ts:13`, live timer + demotion | expiry observed = log line only, scene unchanged | flow 20 asserts | none — this one is real |
| Class 3 = 2s hold (all high-consequence actions) | vault original-specs:478 | HoldPill wired for **authorize-containment only** | v2 deck fires it on click | none | **overclaim**; packet send + evac are tap-through modals; handoff = hardcoded PIN |
| "Each [promoted state] is reachable" | stateMachine.ts:363 | 4 states have no client call site | deep-link only | none | **contradicted by code comment itself** |
| 9-source evidence fusion | redesign docs 07/04 | 9-kind type union; **7 rendered** | 7 chips; 4 in freshness/bars | none | type-level truth, runtime fiction |
| Human gate on packet send is structural | vault 03, PRODUCT.md | edge #15 human-approval ✓ **but edge #32 gate-none flips the same flag** | server grants receipt to the bypass | flow only tests the front door | **bypass exists** |
| Receipts are "hash-chained" | README ("receipts"), microcopy | server chain real but web app never calls it; client ledger = plain array | UI shows hardcoded SHA-256 | none | **fabricated in client UI** |
| verify:attention gate | AGENTS.md commands list | script exists, **npm script missing** | passes 17 checks when run via tsx | — | doc drift |
| All gates green | AGENTS.md current state | `audit:tokens` **hard-fails 5 violations** on working tree (v2 kit/shell2 uncommitted) | typecheck/map/machine/signals/attention/flows/routes green | — | golden rule currently violated by in-flight work |
| README: "19 browser flows" | README | 22 flows | 22/22 pass | — | stale doc |
| "Time to contain {n} min" | ScenarioEndCard | scripted elapsed | presented as outcome metric | — | soft overclaim (scenario goal vs measurement) |

---

## D. The 90-second walkthrough (observed at runtime)

- **T+00 baseline.** Full-bleed 2D map, dual rails, TALON quiet posture with live source count, 90s benchmark arc in
  the navbar framed explicitly as aspiration. Three active sources; TALON "triage runs silently." Cognitive load: low.
- **T+12 alert-command.** Single T1 interrupt popup: thermal spike, Grid 4C, **confidence 40% stated up front**, TALON
  assessment names its basis (burn memory, wind corridor, thermal delta), and the recommended action
  (`DISPATCH LIDAR-02 · RECOMMENDED`) is visually distinct from the dismiss path. This is textbook interrupt design.
- **T+20 investigation-pending.** Scout route draws on the map with ETA; right rail flips to "Lidar-02 en route · ETA
  6s · CONNECTING"; evidence bars prefill; the verification action is **disabled with the reason visible** ("Available
  when Lidar-02 reaches site"). Idle 15s triggers the escalation protocol overlay (secondary operator notified, primary
  can still respond) — observed live, and it is honest.
- **T+45 verify-active.** Full-bleed live feed (thermal + HD), confidence 78%, **SOURCE CONFLICT declared in the feed
  itself**: "TALON will not prepare the packet until you resolve which is true" with a burn-permit calibrator. The
  decline path is labeled with its consequence *before* selection ("Records dissent · contested watch").
- **T+75 authority-notification-ready.** Two-step by design: a confirm modal stating "You are authorizing preparation
  only. A separate, explicit send gate remains," then the send modal with incident class, packet ID, confidence,
  **"Included uncertainty"** (48h-stale fuel survey, smoke-reduced drone visual) — the strongest single surface in the
  product.
- **T+88 send.** Clock stops; phase flips to Operations; map gains the containment polygon, evacuation progress, Route
  A/B capacity, FD ingress; actions re-condense to two tiles.

**Does the interface support sub-90-second decisions?** The information architecture does: at every beat the decision,
the evidence, the uncertainty, and the consequence are in one glance, and the walkthrough hit every beat without
navigation. The friction that exists is *calibrated* (confirm modal on dispatch = 1 extra tap; dissent = required
reason; packet = 2 explicit steps). What threatens the clock in practice: the guided run's modal stacking at the
dispatch beat, the absence of any scene label (you infer where you are from posture + overlay), and evidence surfaces
that *look* live but are frozen (see G).

---

## E. Permission matrix

| Tier (docs) | Code reality | Actions | Friction observed | Verdict |
|---|---|---|---|---|
| Class 1 — autonomous synthesis | no gate; TALON synthesizes briefs, charts, agent traces | evidence fusion, posture, proposals | zero interrupts for synthesis; inspectable via tool traces | correct |
| Class 2 — staged tactical | `status: recommended` + 45s TTL + expiry-demote | dispatch-scout, override-plan, deploy-survey, notify-teams, etc. | confirm modal; countdown only in v2; **no cancel affordance, no expired visual** | sound core, incomplete surface |
| Class 3 — high consequence | `GATED_ACTIONS` (4) | confirm-incident (human-approval), notify-authorities (human-approval), authorize-containment (**hold**, legacy only), emergency-evacuate (**modal only, no dispatch()**) | hold 2s w/ keyboard path (legacy); v2 deck = plain click | **tier integrity broken in v2 + evac** |

---

## F. Human-AI responsibility matrix

| Capability | Who decides | Who executes | Can override | Recorded | UI implication |
|---|---|---|---|---|---|
| Evidence fusion & synthesis | TALON (autonomous) | machine | operator inspects, cannot edit | ledger | chips, traces — honest |
| Recommendation | TALON | — | human, with reason | dissent verbatim + threshold | posture + tile |
| Scout dispatch | human (confirm) | machine | — | receipt | confirm modal |
| Incident confirmation | human (human-approval) | machine | — | receipt | modal + staged posture |
| **Packet send** | **human (edge #15)** | machine | — | receipt | packet modal — **bypassable via edge #32** |
| Containment authorization | human (hold) | machine | — | receipt | HoldPill legacy / **click in v2** |
| Plan override | human (confirm) | machine (recompute) | TALON may recompute | ledger | compact panel |
| Emergency evacuation | human (modal) | machine | — | **direct state write — no machine consult** | weakest link |
| Dissent resolution | human | machine | — | verdict + audit id | reconciliation panel |
| Shift handover | human (PIN 8842) | machine | — | receipt | "cryptographic" copy overstates |
| Attention arbitration | machine (arbiter) | machine | operator acknowledges | pop history | rule-of-one |

---

## G. Trust model

**What is real.** Per-source confidence and status words; uncertainty as first-class copy in the packet modal and
evidence notes; a no-false-quiet guard so TALON never claims calm it doesn't have (flow-tested in 4 scenes); chart↔
number coherence inside a series (audit-signals); the re-raise bar is the one place AI confidence is genuinely bounded
by an evidence value.

**What is decoration.**
- **Confidence is authored, never computed.** Every percentage is a constant (scene profiles, per-source values,
  packet `ready ? 78 : 46`). The code comments admit this; the surfaces present it as fused data. Acceptable for a
  scripted prototype *if labeled* — the LIVE-SIM pill does this in v2, the legacy surfaces do not.
- **Freshness is frozen.** Evidence timestamps are static strings ("03:47:01"); no code computes age, so a source can
  never become stale at runtime, while the wind note *promises* a 15-minute staleness warning (`talon.ts:473`) and
  active chips pulse to imply liveness. The ledger clock moves; the evidence clocks don't — an inconsistency an
  attentive reviewer will catch.
- **The contested "evidence delta" is a clock.** `evidenceConfidence = talonConfidence + elapsedSeconds` — the bar set
  at override is always crossed within ≤16s, and `whatChanged` in the re-raise brief is hardcoded copy
  (`disagreement.ts:108-112`). The *mechanism* (threshold, suppression, escalation to a second authority) is real and
  flow-tested; the *evidence that crosses it* is authored. This is the most important thing to label honestly in the
  case study.
- **Receipts.** Client ledger entries are plain objects; the hash chain exists only on the unmounted-by-default server
  path. Yet the UI says "hash receipt" (microcopy), renders a hardcoded SHA-256 (DebriefTimeline), and calls a PIN
  check "cryptographic transfer." **AI confidence never exceeds evidence confidence is enforced in exactly one place;
  trust language exceeds system reality in at least five.**

---

## H. Failure matrix

| Failure | Impact | UI | Recovery | Human required? |
|---|---|---|---|---|
| satellite-feed-loss | IR offline; blocks authorize-containment (`exceptions.ts`) | banner + reduced sources | deploy-survey → contain-recommended | yes (confirm) |
| network-degraded | latency 340ms, shed telemetry; blocks authorize | banner | relay-field-intel | yes (confirm) |
| rescue-battery-critical | drone 14% | T1 interrupt | acknowledge handoff | yes (confirm) |
| rescue-signal-degraded | relay degraded | banner | deploy-backup | yes — **but no live way to enter** |
| infrastructure-total-loss | manual protocol; blocks 3 gates | takeover | system.restart (gate none; **button bypasses machine + logs nothing**) | nominally |
| contain-degraded | widened envelope | advisory | close or authorize-through | yes |
| verify-source-conflict | packet prep blocked | calibrator | reconcile | yes |
| rescue-partial-evac | honest partial state | — | authorize Route B | yes — **deep-link only** |

Graceful degradation quality is genuinely good where reachable (capability + consequence + recovery path, per the
pattern the audit brief asks for), and every reachable degraded scene has a verified exit (regression documented in-code
at `stateMachine.ts:331-335`, flow-tested). The gap is reachability, not design.

---

## I. Disagreement model

**Direction A (operator declines escalation).** DissentGate requires a reason (button disabled without one), restates
TALON's position verbatim with confidence, enumerates consequences, traps and restores focus. Landing state is
contested watch — *not* baseline, so the disagreement is never erased. Suppression is a raised threshold keyed by the
stated reason (+16 false-positive … +4 operational-constraint); the panel shows "TALON stays silent until 94% — 13
points away" plus the watched-sources list. Crossing the bar produces a re-raise brief addressed to a *Regional Duty
Supervisor*, preserving the original dissent audit id (flow-tested). Anti-nagging is structural and good. The
forensic caveat is G's clock-as-evidence: the mechanism deserves the portfolio story; the authored delta does not.

**Direction B (operator escalates past TALON's hold).** Available at investigation-pending as a human-approval edge
with `requiresDissent` and `escalationBasis: "operator-initiated"`; the system complies, the gate copy says "authority
is yours," TALON's objection rides with the packet (`getPacketDissentNote`), and reconciliation later derives — not
asks — the verdict from the threshold and records it with the audit id in both directions (flow-tested). This is the
strongest human-AI interaction design in the repo and it survives the audit.

**Two blemishes.** Deep-linking a contested scene fabricates a dissent the operator never performed
(`createSceneDissent`), and recovery actions are logged under actor "TALON" (`SentinelShell.tsx:1792`) — both pollute
the accountability story the feature exists to tell.

---

## J. Spatial UX audit

**2D** is a decision instrument: selection syncs zone ↔ rail; drag-to-assign snaps to the road graph and *stages* a
plan override in contain mode (never executes); uncertainty envelopes are explicit objects with aria descriptions and a
manual ± controller; spread rings, corridors, and routes are labeled; the anomaly marker carries its unverified state.
**3D** is a real-data twin (USGS relief, OSM buildings, ESA canopy — observed) with camera handoff both ways with 2D,
an on-demand render loop, and a perf HUD. **But 3D deliberately does not share the operational store** — selection
doesn't sync, drone drag there raises a proposal only ("TALON · PROPOSAL — NOT EXECUTED"). That is an *honest* scoping
decision (documented in its header: "Deliberately NOT wired into the critical 90-second flow") and the right one for
the thesis — but it means the audit brief's "2D and 3D represent the same underlying state" is true for the *world*,
false for the *operation*. Say that plainly in the case study rather than implying full sync. 3D decision utility:
genuine for terrain/slope judgment (why the staging plan hugs the ridge), zero for state management — correctly so.

---

## K. Attention-management audit

T1-T4 derivation, a ≤2-pops/10-min interrupt budget (ISA-18.2-derived), rule-of-one arbitration with badge degradation,
phase-based reordering — all pure functions with 17 passing contract checks. Live wiring builds only two signal kinds
(today), and `raisedAt` is hardcoded so the tie-break is inert — the arbiter is proven at the unit level, not yet
exercised by a five-simultaneous-events storm. The escalation protocol (15s unresponsiveness → secondary operator)
was observed live and is the right human answer to an unattended T1. Verdict: architecture ahead of content; no
attention catastrophe possible today mostly because there are only two interrupt sources.

---

## L. Component/state audit (missing states)

| Component | Present | Missing |
|---|---|---|
| Action tiles | available, recommended/staged, in-progress, complete, disabled-with-reason, countdown (v2) | **expired** (silent demotion), **failed**, loading/pending, blocked (distinct from disabled) |
| Evidence cards | active, pending, stale, failed, missing | **conflicted** (conflict is scene-level only) |
| Drone cards | available, en-route, assigned, holding, signal-degraded | charging, lost-link, fallback-assigned |
| TALON cradle | full posture + mark-state + session phases incl. error/cancelled | strongest coverage in the repo |
| Alerts | T1-T4, pop/badge/logged | acknowledged-but-open (shelved) |
| Buttons | disabled/pressed/emphasis | loading |

---

## M. Top findings

### P0 — safety / correctness / fundamental product failure
1. **Packet-send human gate is bypassable at the machine level.** Edge `operator.authorities-notified`
   (`stateMachine.ts:378-385`) carries `gate: "none"` yet sets `authoritiesNotified: true` — the exact flag that turns
   the packet "sent" (`talon.ts:974-987`). The server accepts it from any client and returns a hash-chained receipt
   (`server/index.ts:141-172`, which also lets callers override the entire guard context). Fix: gate the edge
   `human-approval` or derive "sent" only from edge #15's receipt.
2. **Two layouts, two safety envelopes.** The Class-3 hold exists only in the legacy ActionBar
   (`ActionBar.tsx:541-547, 766-915`); v2's CommandDeck fires `authorize-containment` on click
   (`CommandDeck.tsx:130-135`) under a header claiming exclusivity of gates. If v2 becomes the default, the flagship
   friction silently disappears.
3. **Fabricated cryptographic receipts.** Hardcoded SHA-256 string (`DebriefTimeline.tsx:68`), "Cryptographic
   Receipt: AUDIT-8842" for a plain update (`SentinelShell.tsx:1738`), "Cryptographic transfer…" for PIN 8842
   (`ActionModal.tsx:779`), "CRYPTO-CHAINED" label on a plain JSON export (`Ics209DebriefModal.tsx:179`), "hash
   receipt" copy (`microcopy.ts:180`) for a hashless client ledger. This is exactly the "statutory authority" claim
   the repo's own golden rule bans.
4. **Token gate is red on the working tree.** `audit:tokens` hard-fails: `kit/core.tsx:356` fontSize 9,
   `kit/viz.tsx:173` fontSize 28, `shell2/CommandDeck.tsx:86` novel glow shadow, `ComponentsPage.tsx:513` fontSize 22.
   AGENTS.md rule 4: a red gate invalidates portfolio copy quoting it.

### P1 — major UX / decision-making failures
5. **Four promoted states (and rescue-signal-degraded) are unoperable** — deep-link only; 18 of 39 events never fired
   client-side; the in-code "Each one is reachable" is false. The failure story is richer in the graph than in the
   product.
6. **Staged actions have no cancel and no expired visual.** Expiry = silent demotion + ledger line; countdown only in
   v2; an operator who misses the TTL gets no surface acknowledgment beyond a log entry.
7. **`emergency-evacuate` bypasses the machine** — the modal handler writes state directly, no `dispatch()`, no edge,
   no hold (`SentinelShell.tsx:1742-1772`).
8. **Stale data looks live.** Frozen timestamps + pulsing chips + hardcoded clocks in AlertPopup/VerifyLiveFeed;
   promised staleness warnings can never fire.
9. **HoldPill has no unmount cleanup** — the 16ms interval survives unmount and can fire `onConfirm` against stale
   closure state (the one real crack in "expiry is never execution").
10. **Shell bypasses its own single door** — 6+ raw `setScene` sites (simulation, scenario switcher, stand-down timer,
    restart, voice override, deep links) despite the "single door" comment; the machine cannot enforce what the shell
    routes around.

### P2 — important system/usability issues
11. 9-source fusion is a type, not a surface (7 rendered, 4 in freshness/contribution modules).
12. Deep-linked contested scenes fabricate a dissent; recovery logged under actor TALON.
13. Server is outside typecheck (`tsconfig` includes `src` only) and ships an invalid literal `mode: "intel"`
    (`server/index.ts:49`) — the constitution's enforcement layer is second-class in the build.
14. Client and server ledgers are disjoint — the web experience's receipts aren't the hash chain.
15. Zones are mouse-only on the map (no role/tabIndex/keyboard path) — the one a11y hole in an otherwise
    axe-clean surface; no keyboard-help overlay exists anywhere.
16. `verify:attention` npm script missing; `verify:machine`/`verify:signals` assert nothing (print-only, no exit code)
    — gates weaker than documented.
17. 2.08 MB ScanPage chunk (553 KB gzip) — three.js and the whole shell in one bundle.
18. Entry screen exposes reviewer instructions ("append ?core=1…") on the first portfolio surface.

### P3 — polish
19. 26 raw-hex instances in live components (14 in TalonCopilotPanel alone); theme.css legacy import survives.
20. Novel tracking values (`ActionModal.tsx` 0.4em, `DesignSystemPage.tsx` -0.03em); 28 `gap: 10` leftovers.
21. Arbiter `raisedAt` hardcoded 0/-1 (tie-break inert); two ESC handlers in 3D (capture vs bubble).
22. README says 19 flows (22 actual); ScenarioEndCard reports scripted elapsed as "Time to contain."

---

## N. Recommended roadmap

**Phase 1 — Correctness (do before any portfolio exposure).**
Close P0-1 (gate or re-derive "sent"), wire the hold into v2 CommandDeck (or gate v2 behind parity tests), delete every
fabricated crypto string (P0-3), get `audit:tokens` green and commit the v2 work, add unmount cleanup to HoldPill,
route `emergency-evacuate` through `dispatch()`.

**Phase 2 — Core UX.**
Real cancel + distinct expired state for staged actions; scene label in the navbar/deck; runtime age computation with
honest frozen-vs-live labeling (or animate the clocks); make the four promoted states reachable (fire their timers in
guided scenarios — the scenario engine already exists); add the missing tile states (expired/failed/blocked).

**Phase 3 — System.**
Keyboard-operable zones + "?" shortcut overlay; component state matrix from §L; typecheck the server and fix
`mode: "intel"`; split the ScanPage chunk (lazy three.js); wire the client ledger to the server chain or stop using
hash language; restore `verify:attention` npm script and give machine/signals audits exit codes.

**Phase 4 — Polish.**
Retire theme.css, ratchet raw-hex warnings, arbiter storm drill (5 simultaneous signals), motion pass on the re-raise
moment (the one place cinematic motion would *carry meaning*).

---

## Dimension scores (evidence-backed, per §52)

| Dimension | Assessment | Basis |
|---|---|---|
| State architecture | **Strong core, weak edges** | exemplary table + reasons; bypass edges, unreachable promoted states, shell setScene routes |
| Human-AI authority | **Strong in the arc, broken in three places** | DissentGate + packet two-step real; edge #32, v2 click-through, evac direct-write |
| Decision compression | **Good** | every beat answerable in one glance; no scene label; modal stacking at dispatch |
| Trust calibration | **Mixed** | uncertainty surfaces excellent; fabricated receipts, frozen clocks, clock-as-evidence |
| Temporal UX | **Good mechanisms, dishonest surfaces** | TTL real + safe; countdown v2-only; no age computation |
| Spatial UX | **Good** | 2D is a decision instrument; 3D honest but operationally decoupled; camera sync real |
| Attention management | **Good architecture, thin exercise** | budget + rule-of-one contract-tested; 2 signals in practice |
| Failure recovery | **Good where reachable** | real exits, flow-tested; half the failure catalog unoperable; restart unlogged |
| Accountability | **Good structure, decorated output** | verbatim dissent, reconciliation, ICS-209; hash language unearned |
| Conversational/agentic UX | **Good** | session phases, scene-scoped chips, tool traces; answers authored (labeled) |
| Design system | **Strong contract, current drift** | tokens + audits real; gate red today; missing expired/failed/blocked tile states |
| Accessibility | **Strong, one hole** | axe-clean 23 routes, focus traps, live regions, reduced motion; zones mouse-only |
| Visual hierarchy | **Strong** | restrained, professional, urgency-condensing works as documented |
| Portfolio credibility | **High ceiling, at risk** | verification culture is the differentiator; fabricated crypto + red gate are the story-killers |

---

## §54 Operator simulation (Asha), branched — from code paths, not imagination

**A — agree with TALON.** Alert (40%) → dispatch (confirm) → verify (78%, conflict resolved via calibrator) → confirm
incident → send packet (uncertainty reviewed) → Operations: staging picture, plan comparison, authorize via 2s hold →
supervised rescue; battery edge interrupts once; handoff acknowledged; stand-down closes with receipts. *Can go wrong:*
idle 15s escalates to the secondary operator (by design); nothing in this branch can execute without her.

**B — reject TALON.** Decline at verify requires a written reason; contested watch with a raised bar and visible
meter; TALON silent below 94%; new "evidence" (a clock) crosses it in ≤16s and the re-raise goes to the *duty
supervisor*, not back to her — the anti-nagging design holds structurally even though the delta is authored. She can
close the loop with ground truth; the verdict is derived and both positions survive in the record.

**C — override early.** At investigation-pending, confirm-incident opens the `talon-holds` DissentGate: TALON's 46%
position is restated, she proceeds anyway, the packet carries TALON's dissent note, and reconciliation will later
derive whether she was right. The system never obstructs her; it only makes the disagreement permanent.

**D — evidence conflicts.** Source conflict blocks packet prep *and is visible in the live feed itself*; the
calibrator is a required human reconciliation. Deep-linkable, but in the live arc it only arrives via a timer that is
never fired — in guided play she will never meet this state, which is the finding, not the design.

**E — network degrades.** Banner: capability lost, what remains, what's stale; gates that depend on the feed close
(`exceptions.ts` blocks authorize-containment); recovery is her confirm, and the exit edge genuinely leaves the scene
(the regression that motivated it is documented in-code).

**F — battery critical.** T1 interrupt, supervised handoff to Scout-03, her acknowledgment (confirm) resumes
execution; the autonomy boundary copy ("autonomous battery swaps are outside my authorization boundary") matches the
enforcement.

**G — infrastructure fails.** Manual protocol takeover; three gates closed by `exceptions.ts`; restart is gate-none
and — in the live client — bypasses the machine and logs nothing. This is the branch where "the system failed while
appearing accountable" is closest to true, and the fix is one line of routing plus one log line.

---

## §55 The final question

**If all visual polish, 3D spectacle, animation, and futuristic styling were removed, would Sentinel still
demonstrate exceptional product design?**

**Yes — with named exceptions that are exactly the work worth doing next.** What survives polish removal: the
transition table with reasons as the product's spine; dissent that is captured, weighted, escalated, and reconciled in
both directions; staged actions whose expiry provably executes nothing; one derivation for TALON's self-description
with a no-false-quiet guard; an interrupt budget with a rule of one; failure states with real exits; and a
verification culture (22 flows, 23 axe-audited routes, contract tests, adversarial TALON eval) that almost no
portfolio project ships. That is interaction architecture, not styling.

What does *not* survive: the trust decorations (hardcoded SHA-256, "cryptographic transfer," hash-receipt copy), the
v2 deck's click-through Class 3, the packet-send bypass edge, and the frozen clocks. These are not polish problems —
they are the constitution's own fine print, and a senior reviewer reading the state table (which the repo invites you
to do) will find all four in an afternoon.

**Highest-priority portfolio work, in order:** Phase 1 of §N. The case study's thesis is *"I designed authority
boundaries and made them structural."* The evidence is already 85% there; the remaining 15% is making the system's
fine print match its swagger — or deleting the swagger.

---

## Z. Implementation pass — 2026-09-30 (post-audit)

> Companion: `sentinel-core/07-panels-charter.md` (the content contract this pass implements) and
> `docs/redesign-2026/07+10` (system report + visual-direction exploration). The owner also ran a parallel
> redesign session in this window (docs 11–13, the light-token layer `light.*` in tokens.ts, HeroMetric anatomy,
> kit-key press grammar, AIRSPACE geofence/relay/ADS-B rendering, Mind-console sticky mirror) — that work is
> preserved and this pass builds on top of it.

### Z.1 Landed in this pass

| Item | Where | Notes |
|---|---|---|
| **Drone telemetry fields** — `altitudeM, groundSpeedMps, headingDeg, lat, lon` on all 10 roster entries | `tokens.ts` (DroneRosterEntry), `mockData.ts` | closes the "drones have no altitude/speed/coords" gap (charter §7) |
| **Per-drone HUD in the telemetry strip** — GS/ALT/HDG + BAT/LINK bars, selected-or-first drone | `shell2/panels2.tsx` (TelemetryStripV2), wired in SentinelShell + TalonMindConsole | |
| **Drone detail telemetry grid** — GS/ALT/HDG/position in the Context Inspector | `panels/LeftPanel.tsx` (DroneInspector) | |
| **Weather strip (L4)** — wind/G/°F/RH/fuel/Haines + observedAt | `panels/LeftPanel.tsx` (WeatherStrip in IntelPanel), `mockData WEATHER` | ICS-209-block-19 aligned |
| **Zone operational + evac states** — per-scene nominal/watch/warning/critical/cleared + GO/WATCH/CLEAR + time-to-impact | `mockData getZoneOperationalStates` | |
| **Evac chips in Field Readiness** (R4) + **on map zone labels** | `panels/RightPanel.tsx`, `SpatialMapCanvas` label layer | G-15 partial (chips + TTI; shelters still open) |
| **Corridor state colors on the 2D map** — route A/B tinted from the rescue-progress ledger (active teal / blocked red / standby amber) | `SpatialMapCanvas` (corridorTone) | |
| **Sensor coverage wedges** — ±22° fan from airborne thermal-lidar drones, heading-driven | `SpatialMapCanvas` (sensorWedge) | |
| **Coordinates readout** in the SPATIAL OS chip (map-center georef) | `SpatialMapCanvas` | first map utility |
| **Projection age + uncertainty cone** — age badge (≥10 min → recompute flag) + ForecastCone above the plan comparison | `panels/RightPanel.tsx` | G-08 UI side |
| **V2 deck gated-tile hold — FUNCTIONAL** | `kit/core.tsx` CommandTile: gated verbs require the 2-second hold (progress bar, release-cancels, plain click never fires) | **closes audit finding §A.2** (v2 deck fired `authorize-containment` on plain click) |
| **Spine gravity** — peek tabs anchored to the bottom corners flanking the deck | `shell2/AttentionSpine.tsx` | panels-charter §2 |

### Z.2 Still open (ranked)

1. **P0 — the `operator.authorities-notified` gate-`none` bypass edge** (§A.1): flips `authoritiesNotified`, which the packet reads as "sent", and the server receipts it. Needs an owner ruling: either give that edge a `confirm` gate + relabel it as a manual "authorities acknowledged" path, or split "notified" from "packet sent" in state. Not implemented here — it changes the transition table and two flows.
2. **P1 — fabricated-crypto copy** (§A.3): `DebriefTimeline.tsx:68` hardcoded "SHA-256 e62d93c8…", `SentinelShell.tsx:1738` "Cryptographic Receipt: AUDIT-8842". Fix = reword to plain "Receipt AUD-xxxx (hash-chained server-side)" or wire real digests from the ledger.
3. P1 — panel-level AI contracts printed per panel (charter §5 clauses rendered as spec chips) — the mechanics exist (intents/arbiter/expiry); the per-panel documentation pass remains.
4. P1 — video wall (P6), comms (P8), dock/preflight roll-up (G-05) — still unbuilt surfaces.
5. P2 — priorities staleness clocks (G-11), geofence as a toggleable layer with drone-dispatch validation, multi-incident queue behaviors.
6. P2 — visual direction pick from `10-visual-direction-exploration.md` (co-lead: Night Optic + Ember) + two concept screens; UI refinement explicitly deferred by the owner until the data layer is "100% right" (this pass).

### Z.3 Gate status after this pass

typecheck ✓ · audit:tokens 259-warn/0-violations (retired-neon hard-fail active) · verify:attention 17/17 ·
verify:machine 20 scenes/39 edges · verify:signals ✓ · build ✓ · **verify:flows 22/22** · **verify:routes 23/23 (axe)**.
