# SPEC.md — the product spec (owner-authored)

> **Status: canonical (in progress).** Written **before** the build, from the owner's intent.
>
> **This file is the contract.** Code is built *from* this document, not the other way round. If the code and this file disagree, one of them is wrong — find out which before changing anything.
>
> **Precedence:** `DECISIONS.md` → this file → everything else in `docs/`.
>
> **How this file was made:** section-by-section interview with the owner, 2026-10-19 onward. Each section records what the code *actually does today* (verified on disk) next to what the owner *wants*, so the gap is never hidden.
>
> **Every section ends with an owner ruling.** No ruling → the section stays `OPEN` → **nothing in it gets built.**

---

## Interview order

Deliberately sequenced so each answer constrains the next. Sections 1–2 are the foundation; the rest follow.

| # | Section | State | Blocks |
|---|---|---|---|
| 0 | **North star** — what is the final solution? | 🟡 interview in progress | everything |
| 1 | **Map & spatial model** | 🔴 OPEN — owner researching FireTracer | §2, §4, panels |
| 2 | **Shell & layout** | 🟡 interview | §3, panels |
| 3 | **TALON surface & conversation** | ⬜ queued | flows |
| 4 | **Panels & data density** | ⬜ queued | §2, §3 |
| 5 | **Authority gates & dissent** | ⟢ verified strong — confirm no redesign needed | — |
| 6 | **Motion & material** | ⬜ queued | all chrome |
| 7 | **Voice, copy & honesty boundary** | 🟢 golden rule 1 — confirm | — |
| 8 | **Live mode & server** | ⬜ queued | — |

Legend: 🟢 verified healthy 🟡 interview pending 🔴 blocked on owner research ⬜ queued

---

## §0 — North star

> **Status: 🟡 interview in progress**

**What the code does today:** a scripted 20-scene wildfire command prototype. TALON detects, verifies, recommends; a human operator authorizes. Two phases: Intelligence → Operations. The operator walks scenes via a `SCENES` chip, holds to authorize, dissents into contested watch, escalates, and debriefs.

**What the owner says the final solution is:** _(awaiting)_

**The gap:** the code is a well-gated prototype with 7,400 LOC of unreachable surface and four coexisting chrome generations. The owner reports that "every section has faults." Whether those are design faults or visibility faults is exactly what this interview determines.

**Owner ruling:** _(pending)_

---

## §1 — Map & spatial model

> **Status: 🔴 OPEN — blocked on owner research. DO NOT BUILD.**
> Owner is researching FireTracer as the reference target (2026-10-19). No map work until ruled.

**What the code does today — three renderers, none canonical:**

| Renderer | LOC | Entry | Notes |
|---|---:|---|---|
| `SpatialMapCanvas.tsx` (2D SVG) | 1,286 | default on `/` | Best-gated (9/9 checks). Basemap is a **3.5 MB PNG**, not the baked data |
| `Map3DExplorer.tsx` + `map/runtime/` | 1,731 | `EXPLORE · 3D` button | Real three.js. **Covered by no gate** |
| `map/hairline/` | 1,469 | typing `#/hairline-map` | Parallel three.js renderer. **No UI link, no gate.** Reuses world *data*, duplicates all *render* code |

**Known defects to resolve regardless of direction:**
- Two live, disagreeing fire geometries (`fireModel.FIRE` vs `world.fire.band`), both drawn by `worldScene.ts`
- Roads exist in the data (`roads.ts`, OSM) but are **not** a designed layer — the owner wants entry/escape routes generated on the map
- `world.landuse` (10 KB) is baked, shipped, and never drawn

**Owner ruling on Q1 (which renderer survives) and Q2 (hairline: future or experiment):** _(pending)_

---

## §2 — Shell & layout

> **Status: 🟡 interview pending**

**What the code does today:** v3 chrome is the default — a 56px collapsed icon rail left and right, an 88px bottom deck with a 64px TALON orb, and a rail system of 9 panels. `?layout=v2` and `?layout=legacy` still work. `SentinelShell.tsx` is 3,867 lines and holds all three generations plus the map, the deck, the modals, and the entry flow.

**Known facts for the ruling:**
- Deck is 88px in code; `sentinel-core/06` and `redesign-2026/15` both say 96px
- `redesign-2026/14-final-layout-spec.md` says the centre orb was deleted; code renders it
- Tablet recomposition was never built (deferred, honestly labelled)

**Owner ruling:** _(pending)_

---

## §3 — TALON surface & conversation

> **Status: ⬜ queued**

**What the code does today:** `TalonSession.tsx` drives the v3 orb and session. `talonSurface.ts` derives voice/mark/posture from scene state. Gates pass for suggested-question conversation, re-raise, dissent, and reconciliation.

**⚠️ The thing that makes this repo feel unfinished:** `panels/TalonCopilotPanel.tsx` is **72.9 KB — the largest component in the app** — and it is **not rendered on the default shell**. It renders only under `?layout=legacy`. v3 ships a different, smaller TALON surface. Several hundred doc references describe the legacy one.

**Owner ruling:** _(pending — is the 72.9 KB surface the design you want, and should v3 adopt it? Or is `TalonSession` the intended one?_

---

## §4 — Panels & data density

> **Status: ⬜ queued**

**What the code does today:** `components/kit/` is a real obsidian-glass primitive kit (1,175 LOC, 17 primitives, imported by 11 files across v2, v3, panels, and the showcase page). `sentinel-core/07-panels-charter.md` is the contract. `verify:attention` enforces one-pop-at-a-time with 19 contract checks — a genuinely strong, well-documented section.

**Owner ruling:** _(pending)_

---

## §5 — Authority gates & dissent

> **Status: 🟢 verified strong — confirm no redesign needed**

Five flows pass: guided verification to the authority gate, dissent routing into contested watch, focus trap + restore, contested watch preserving both positions, re-raise showing what changed. `GATED_ACTIONS` is structural, staged actions expire back to watch, and `verify:machine` confirms 20 scenes / 39 edges / 0 dead ends.

This is the product's thesis and it is the best-documented, best-gated section in the repo. Code, gates, and docs agree.

**Owner ruling:** _(pending — confirm this is not up for redesign)_

---

## §6 — Motion & material

> **Status: ⬜ queued**

`kit/` implements the obsidian-glass materials. `motion` and `liquid-gooey` are wired. Reduced-motion is covered by `verify:routes`. The 276-warning token baseline is the ratchet.

**Owner ruling:** _(pending)_

---

## §7 — Voice, copy & honesty boundary

> **Status: 🟢 golden rule 1 — confirm**

`domain/microcopy.ts` (12.4 KB) holds the product voice. Golden rule 1 forbids invented metrics and statutory/cryptographic authority claims; receipts are a hash-chained event append, and the authority packet is a mutual-aid *draft* the operator sends. A prior pass (`M1 conversation repair`) explicitly removed prototype/dev copy from product surfaces.

**Owner ruling:** _(pending)_

---

## §8 — Live mode & server

> **Status: ⬜ queued**

`server/` is a real Fastify + WebSocket + SQLite hash-chain + LLM gateway (10 files, 7 endpoints), wired at `SentinelShell.tsx:51,864` and driven by `?feed=live`. A 49 KB `sentinel-demo.db` is committed. Docs that called this "stubs" or "unwired" were wrong — it was simply missing from `AGENTS.md`'s repo map until 2026-10-19.

**Owner ruling:** _(pending — is live mode a portfolio asset or internal scaffolding?)_

---

## Change protocol

1. Owner rules on a section here.
2. The ruling is written into that section **with the date**.
3. If it contradicts a locked decision, `DECISIONS.md` gets a new entry and the old one is marked `SUPERSEDED` — in the same change.
4. Only then does code change.
5. The full gate suite must be green before the section is marked built.
