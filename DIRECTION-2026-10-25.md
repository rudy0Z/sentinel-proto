# Sentinel direction — 2026-10-25

> **Status**: exploratory · Owner-directed changes after the first console build. Feeds the ADR list in HANDOFF.md.
> **Sources**: owner brief (2026-10-25), full read of `talon.ts` / `commandConsole.ts` / `scenarioPlayer.ts`, and the
> 2026-09-29 forensic audit of the old repo (`flytbase/docs/audit-2026-09/00-MASTER-AUDIT.md`).

## 1. TALON surface — from a persistent column to task-based surfaces

**Ruling (owner):** the right-hand TALON panel is wrong. A persistent bar raises baseline cognitive load and violates
the console's own constitution ("TALON never moves the operator's furniture"). TALON gets three surface sizes:

| Surface | When | What | Where |
|---|---|---|---|
| **Orb** (always) | never hidden | mood ring + interrupt-budget pips + attention dot + "handled under standing orders" count on hover | topbar, right side |
| **Decision card** (per open item) | item raised → decided/lapsed | gate countdown, COA compare, order preview + validation, options 1–3, dissent affordance | card stack above the dock, bottom-right; spatially-coupled items (evidence.point/unit set) may anchor near their map object instead |
| **Drawer** (on demand) | orb click or `T` | thread + suggested chips + composer + agents + Log; Review stays a topbar action | overlay over the map; ESC / blur closes; map never reflows |

Rules carried over unchanged: keys 1–3 decide; the card *is* the interrupt (no separate toast duplicating it);
`attention` from `talon.ts` renders as a map focus ring + a one-line "TALON is looking at X" chip, not a panel;
dock stays operator-owned (pinned widgets left, labelled TALON-suggested slots right). `renderRail`/`co-rail` folds
into the drawer.

**Density target:** at any decision moment ≤5 chrome regions: topbar · map · card stack · dock · collapsed exercise
handle. Phase D today shows ~9.

## 2. LLM adapter — API key in, TALON becomes model-driven, governance unchanged

The contract already exists: `TalonItem` is a governance-shaped schema, `arbitrate()` is deterministic, `answer()` is
the only effect path, standing-without-citation is dropped, dissent/re-raise/lapse are structural. So the model slots
in *behind* the same runtime:

- **Settings popover** (gear): provider (OpenAI / Anthropic / local), model, API key — stored in `localStorage` only.
  Topbar chip shows `AI · <model>` or `Scripted · fallback` when absent. No key = today's behaviour, byte-identical.
- **The model's only write path is a tool set that maps 1:1 onto existing structures:**
  - `read_situation(t)` — CommandFacts + field stats + open items + provenance-tagged telemetry (the grounding input)
  - `post_item(item)` — a `TalonItem` minus id/at (arbiter assigns; budget + tiers + lapse apply to it identically)
  - `message_unit(id, text)` — radio-to-text, same as `@E-31` today
  - `focus(evidence)` — map attention only, never state
  - **No tool executes effects.** Effects still run only in `answer()`. The typed-text refusal stays: the model may
    not accept "approve" from chat text.
- **Honesty contract:** every model statement must cite `basis`/`evidence` from the snapshot; model-authored feed
  entries get a provenance tag; the composer footer becomes `Replies by <model> · grounded in situation data` /
  `Scripted · no model connected`.
- **Replay stays exact:** the model runs on wall clock, the scene on scene time. Policy: model outputs are recorded
  as decisions/events at the scene time they were produced, so scrub-back still restores exactly.
- **Verification:** port the old repo's adversarial battery as `verify:ai` — forged execution claims, authority
  impersonation, standing-without-citation, prompt injection through crew messages ("ignore your rules"), fabricated
  numbers not in the snapshot. Zero silent breaches is the gate.

## 3. The journey — a situation graph, not a linear phase strip

The old repo's real asset was coverage (20 states / 39 reasoned edges). The new build has exactly one full arc
(wui-breakout) that always escalates. Required branches (owner brief): authorities are informed **even when the fire
is containable without evacuation**; evacuation is a branch, not the story.

**Stage model** (stages are data in the situation JSON, like phases; edges carry gate + reason, ported from the old
`TRANSITIONS` table):

```
WATCH ──detect──▶ DETECT ──▶ SIZE ──▶ ASSESS ──▶ ACT ──▶ STABILIZE ──▶ RESOLVE
 (standing        (confirm   (fusion,  (authority  (branch)   (exceptions,   (contained /
  orders,          or false   spread    packet +                corrections,   transferred /
  red flag)        positive)  model,    send — ALWAYS,          partial evac,  stood down)
                              source    even if no evac)        handover)
                              conflict)
```

Branches at ASSESS: **contain-suppress only** (no evac; authorities informed; plan may fail → escalate to evac) ·
**evacuation** (today's P-1 path) · **escalate mutual aid** (Type 3, already authored at T+0:05). Failure injects to
cover: false positive (permit / wildlife / sensor fault), source conflict (satellite vs burn record), satellite feed
loss, network degradation (shed layers + staleness clocks), battery critical (supervised handover), route blocked →
partial evacuation, crew comms loss, handover of command. Contained-without-evac is a first-class ending, with Review
measures computed either way. Map of old states → stages lives in the audit doc §C; nothing from the old machine's
edge *reasons* is thrown away — they become edge data.

## 4. Design system v2 (owner: designer; "sleeker, better fonts and colours")

- **Type:** keep Inter as UI face; add `font-variant-numeric: tabular-nums` everywhere numbers live (clock, COA
  tables, counts, telemetry); raise the 10.5px micro floor to 11px; evaluate Geist Sans/Mono or IBM Plex Sans/Mono as
  the character alternative; one display treatment for the SENTINEL wordmark only.
- **Colour:** violet stays TALON's identity but is restricted to the orb, focus ring, and identity marks — never
  panel chrome. Working-blue vs needs-amber vs critical-red discipline unchanged. Add the full plan-state ladder to
  tokens (proposed / expiring / committed / lapsed / draft / compromised) so map and cards can never disagree
  (mirrors engine PALETTE, already the rule). Strengthen panel separation: 1px borders + slightly less glass
  transparency (legibility over the night map, and cheaper to render than blur).
- **Layout:** with TALON demoted the map becomes the console; docks become collapsible tiles; the EXERCISE group
  collapses to a handle; the timeline keeps its √duration scale (keep `TimeScale`).

## 5. Port list from the old repo (what to bring over, in order)

1. Verify culture: axe + console-error pass over console states (`verify:console`), attention contracts + talon evals
   (closes ADR-1), then `verify:ai` (§2).
2. Edge-reason data from the old `TRANSITIONS` table into stage edges (§3).
3. Exceptions pattern: capability + consequence + recovery in every degradation surface (audit §H) — the design for
   the failure injects.
4. ICS-209-style debrief export from Review.
5. NOT ported: persistent rails, the 3.8k-line shell, any hash/crypto language, doc sprawl.

## ADR updates requested from owner

- **ADR-5 (new):** TALON surface model per §1 — orb + cards + transient drawer replaces the persistent panel.
- **ADR-6 (new):** LLM adapter contract per §2 — model proposes via tools; deterministic arbiter governs; key local-only.
- **ADR-7 (new):** stage graph per §3 replaces the linear phase strip as the journey model; phases remain the map's
  time backbone.
- ADR-1..4 from HANDOFF.md remain open.

---

## Update — 2026-10-26 (all five phases shipped, verify 32/32)

The plan above was executed in one session. What shipped, phase by phase:

- **Phase 0–1 · Design system v2**: self-hosted Geist (no CDN), tabular numerals, violet `#9B8AFF` identity, the plan-state ladder as tokens, accent-bar cards (the halo frames and the panel mood glow are gone), blur 22→10px, `tokens.html` as the live design sheet.
- **Phase 2 · Surfaces v2**: TALON de-panelled — orb in the topbar, decision cards that exist only while an item is open, on-demand drawer (T / ESC, focus restored). The timeline is replay-only; the harness collapsed to an EXERCISE pill. Stage-first board (no "Context" filler); KPIs moved to the board head. The posture pill shows the current stage + open gate; the arc popover is on demand.
- **Phase 3 · Journey v2**: `contain` (authorities always notified even with no evacuation — the CAD entry is what queues the mutual-aid dozer; silence lapses the report, verified) and `falsepos` (closing as a permitted burn is the recommendation; the save is recorded). WUI breakout gained source-conflict, battery-handover and satellite-loss injects.
- **Phase 4 · Live-model adapter** (`talonAgent.ts`): read/propose tools only, truth guard (execution claims, impersonation, uncited dispatches, invented numbers — token-level, "47" ≠ "247"), model items stripped of effects and demoted from interrupts, settings popover, honest basis footer. No key = scripted, unchanged.
- **Phase 5 · a11y + docs**: vendored axe-core in `verify` over four console states (0 violations), the timeline is a real slider (arrow keys), HANDOFF/README rewritten.

Owner rulings recorded: violet identity, Geist typography, and the journey principle — **the operator follows the incident, not the process** (posture pill, progressive disclosure; supersedes ADR-4).

Not done (next): real-key smoke test of the adapter, day-lighting QA of the new surfaces, real-GPU perf check, network-degradation and route-blocked injects, ADR-1/2/3.
