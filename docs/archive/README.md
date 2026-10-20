# docs/archive — the journey archive

> **Status: historical.** Everything in this folder is context only. **Never build from it.**
> Nothing here is authority. If a document in here disagrees with `DECISIONS.md`, `DECISIONS.md` wins and the document is simply an old record of a decision that has since changed.

Created **2026-10-19**. Before this folder existed, `AGENTS.md` tier 7 and a live link in `README.md:64` both pointed here as though it did — so the archived material was scattered unlabelled inside `docs/portfolio-case-study/`, including four binaries. That is what this folder is for.

---

## `2026-session-audits/`

Dated session artifacts from the 2026 redesign waves and the map build. Each is a **record of one session's state at that moment**, which is exactly why they drifted — they were written after the build and describe a past. Numbers in them are stale by design.

| Doc | Superseded because |
|---|---|
| `map-alignment-audit.md` | Alignment is now enforced by construction (slice law) and gated by `verify:map` 9/9 |
| `map-build-handover.md` | Phase 1 landed; superseded by the map architecture itself (see `DECISIONS.md` §4) |
| `map-exploration-and-decision.md` | Decision recorded, then superseded by later map direction |
| `map-pan-extension-plan.md` | "Planned, not started" — never started |
| `map-spatial-os-phase1.md` | Phase 1 shipped; claims 18/18 flows, real number is 25 |
| `sentinel-final-fix-status.md` | Fixes landed; its "16 scenes" is now 20 |
| `sentinel-full-audit.md` | Audit of a state that has since changed |
| `sentinel-talon-hard-audit.md` | Same |
| `spatial-os-multi-persona-audit.md` | Audit of a state that has since changed |
| `spatial-os-score-uplift-status.md` | Claims 18/18 flows; real number is 25 |
| `interactive-case-study-plan.md` | Was marked "parked, not to be built yet" |
| `2026 AI Product Designer Case Study Blueprint.md` | Superseded by `case-study-v2-framing.md` |

## `superseded-plans/`

Binary planning documents from earlier planner generations, replaced by `docs/sentinel-v2-master-plan/00–10`.

- `AI_Portfolio_Upgrade_Master_Plan.docx`
- `Sentinel_AI_Upgrade_Strategy.docx`
- `Sentinel_Project_Review_Extraction.docx`

---

## What is deliberately NOT here

These stayed in `docs/portfolio-case-study/` because they are live deliverables or source material, not session debris:

- `01-product-ux-business-decisions.md` — canonical decision record (verified accurate 2026-10-19)
- `case-study-v2-framing.md` — the active case-study framing
- `spatial-os-portfolio-prototype-test.md` — shipped test record
- `talon-model-boundary.md` — the TALON honesty boundary (still load-bearing for golden rule 1)
- `map-system-architecture.md` — reference architecture for the 2D map; **re-verify against `DECISIONS.md` §4 before use, since the map direction is OPEN**
- `FlytBase Problem Statement _ Design Fusion S3 _ PD & Branding.pdf` — source material, not a session artifact

## Archiving rule

A document gets archived when it is **superseded**, not when it is merely old. Before moving anything here:

1. Check no live doc depends on it as authority.
2. Add a status header to it first (`historical`) so it declares its own status.
3. Move it, then fix any inbound links.
4. Add a row above explaining **why** it was superseded.

Never archive a doc that records a decision which is still `ACTIVE` in `DECISIONS.md`.
