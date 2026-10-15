# PORTFOLIO-DIRECTION.md — Sentinel

> **What this doc is:** the portfolio-level direction for this product, written into the repo so every future session (human or AI) knows what Sentinel *finally is*, what scope it serves, and what the portfolio case study needs from it.
> **Status:** v1 — 2026-09-14. Product authority inside this repo remains `PRODUCT.md` (identity, users, principles) and `docs/SENTINEL-V2-MASTER-SPEC.md`. Strategy authority is `D:\Portfolio\POSITIONING.md`.
> **Reads with:** `D:\Portfolio\case-study-copy\sentinel-copy-v3.md` (the copy this repo must be able to back).

---

## 1. What Sentinel finally is

An **AI-native emergency-response command interface**. The entire UI is driven by a copilot — TALON assembles evidence, proposes, argues, and remembers being wrong — and a human operator (Asha) owns every consequential action. Conversational UX is a first-class interaction model, not a chat widget bolted to a dashboard: the operator's relationship with TALON (argue with it, overrule it, get overruled, reconcile later) *is* the product.

**The one-line portfolio identity:** *the study where the whole interface is AI-driven, and the design problem is the human–AI guardrail layer.*

## 2. Its role in the portfolio (POSITIONING.md §1)

| Question | Answer |
| --- | --- |
| Which layer of the AI-product problem? | **The interface.** |
| Role in the lineup | **THE deep study — the seller.** The one study a reader is told to read fully (~4–5 min). |
| What it must prove | Can this person design an AI-native product end to end — conversational UX, disagreement/oversight models, verification tooling? |
| What it is deliberately NOT about | Business, market design, monetization — that is Feul's job. Do not add business/economics features to this product. |

## 3. Scope — what this repo is for now

**In scope (first-class):**
- AI-dense interaction work: TALON conversation quality, evidence assembly, disagreement model (`domain/disagreement.ts`), contested-watch / operator-initiated-escalation states, reconciliation memory.
- Human–AI guardrails: authorization gates, source-conflict pause, receipts, degraded modes.
- The verification tooling staying green (`verify:machine`, `verify:signals`, `verify:flows`) — it is quoted in the case study as evidence; a red gate invalidates published copy.
- Embed/scene reachability: the case study quotes two scenes — **contested watch** and **operator-initiated escalation** — as embeddable (`?scene=`/route). If they are not reachable without DevPanel, making them reachable is repo work ahead of the next embed sync.

**Out of scope (do not spend sessions here):**
- Marketplace/economics features, payout anything, business-model UI.
- Renaming or re-branding TALON/Asha/the product.
- New product layers that expand the brief (the 90-second scope discipline in the case study applies to the repo too).

## 4. What the portfolio case study needs from this repo

1. **Reachable embed states:** contested-watch and operator-initiated-escalation scenes (case-study copy v3 open question — resolve here first).
2. **Fresh embeds:** the portfolio embed sync (`sync-embeds.mjs sentinel`) must run after any behavior change; a stale embed contradicts the case study's own verification story.
3. **Boundary discipline:** scripted-prototype labels stay (per `PRODUCT.md` §7 "Prototype claims stay honest") — the case study's boundary line depends on it.
4. **The two-mode model (Intelligence / Operations)** is the current truth. **Note: `README.md` still describes the abandoned four-stage model (Scan/Verify/Contain/Rescue) and links an old case-study URL — it is stale and should be updated to match `PRODUCT.md` before anyone new onboards from it.**

## 5. Alignment rules for future sessions

- On conflict between this doc and older strategy docs, order: `PRODUCT.md` → `docs/SENTINEL-V2-MASTER-SPEC.md` → this doc's scope table → everything else.
- The portfolio copy (`sentinel-copy-v3.md`) may cite at most ~3 file-level artifacts (e.g. `domain/disagreement.ts`). Keep those files' names and locations stable, or update the copy when they move.
- Do not invent metrics, success rates, or performance numbers anywhere in this repo — the case study's honesty receipts quote the verification tooling, not benchmarks.
