# Sentinel AI Upgrade Documentation Archive

> **Status:** historical (quarantine). Context only — never build from these files.

**What superseded it:** `docs/sentinel-flagship-quality-upgrade.md` is the single canonical build authority. It consolidates the vault `00–09` (in `docs/sentinel-v2-master-plan/`), the craft measurement report, the identity research verdicts, the backend master plan, and the conversational-design synthesis — with every known defect repaired inline and marked **[REPAIRED]**. Where a repair touches files in this folder in place (Class-2 gate semantics, crypto/statutory language), the text has been corrected — but every file here remains historical. No build task may reference this folder except through its per-file status header and this README.

This folder preserves the product, UX, AI, and case-study decisions made during the Sentinel V2 upgrade planning process.

## Archive Structure

- `00-previous-plan.md` saves the first agreed plan before the major product-model breakthrough.
- `01-breakthrough-decision.md` documents the shift from four phases to a two-phase Intelligence / Operations model.
- `02-real-world-response-grounding.md` records how the revised product model maps to on-ground wildfire response practice.
- `03-product-thesis-v2.md` defines the new product thesis, user, success criteria, scope, and case-study framing.
- `04-talon-agentic-workflow.md` defines TALON as a supervised agentic copilot, including agent roles and human-control limits.
- `05-data-visualization-system.md` defines the new data-driven panel and map visualization model.
- `06-governance-auditability.md` defines authorization, escalation, audit receipts, and accountability rules.
- `07-implementation-log.md` is the running implementation log template and phase tracker.
- `08-case-study-decision-stories.md` captures future case-study story material.
- `09-phase-roadmap.md` turns the decisions into implementable phases with acceptance criteria.
- `10-open-risks-assumptions.md` tracks risks, constraints, and unresolved implementation questions.
- `11-execution-direction-command-bar-map-libraries.md` defines the TALON Command Bar direction, two-phase UX shift, map-editing model, icon-system upgrade, and external component-library review.
- `12-final-integration-audit-and-command-system-plan.md` is the final pre-execution integration audit and command-system plan.
- `PLAN.md`, `PLAN2.md` — earlier planning iterations.
- `sentinel-master-system-routes-and-data-specification.md`, `sentinel-v2-master-technical-architecture.md`, `sentinel_v2_strategic_additions_plan.md` — earlier system/architecture specs.

## Known-false claims in this archive (do not re-propose without repealing the rejection in writing)

1. **Autonomous drone dispatch** — e.g. "Dispatch of drone for visual confirmation is autonomous (pre-authorized standard patrol SOP)". False: drone dispatch is machine-validated and human-gated; TALON proposes, the human authorizes, TALON never dispatches.
2. **Auto-timeout approval** — the original Class-2 row claimed "One-Click Affirmation / Automatic Timeout". False: a staged action expires back to watch; expiry is logged; expiry is never execution. Silence at a staged gate leaves state unchanged.
3. **Cryptographic/statutory packet claims** — "Cryptographic Authority Packet", "SHA-256 digest", "statutory emergency powers". False as product claims: receipts are a hash-chained event append via `node:crypto` (implemented in S3), the notification is a *mutual-aid notification draft* that TALON prepares and never sends, and no statutory/legal-instrument powers exist or are claimed anywhere in Sentinel.
4. **"8-stage state machine covering 23 distinct system routes"** — false count framing. The real machine is 16 `SceneId`s / ~34 edges (authority: `src/app/tokens.ts` and the routes audit, which reports 23/23 green as a *gate result*, not a spec count).
5. **The San Francisco coordinate in a Malibu incident** — the Stage-2 anomaly is placed at `37.8821°N, 122.4194°W` (San Francisco) while the scenario geography is Encinal Canyon, Malibu CA (`34.032, -118.815`, 6.0 × 3.25 km frame).

## Documentation Rule

Every important product choice should be logged with:

- Decision
- Suggested by
- Final choice
- Why
- Tradeoff
- Implemented evidence
- Case-study angle
