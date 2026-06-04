# Sentinel AI Upgrade Documentation Archive

This folder preserves the product, UX, AI, and case-study decisions made during the Sentinel V2 upgrade planning process.

The goal is to avoid losing context over time. These files are written as source material for later implementation and for the final 2026 AI Product Designer case study.

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

## Canonical Product Direction

Sentinel V2 is not a generic wildfire dashboard. It is a high-stakes AI command system where TALON accelerates emergency intelligence, source convergence, and authority notification while preserving human accountability for irreversible decisions.

The new 90-second promise is:

> Within 90 seconds of TALON detecting a serious anomaly, the system should help the operator verify emergency risk, understand evidence confidence, and notify authorities with an AI-prepared escalation packet.

The 90-second promise is no longer:

> Complete containment and rescue planning within 90 seconds.

That older interpretation was visually dramatic but less realistic. The revised interpretation is stronger for enterprise AI product design because it respects real-world incident command, early wildfire size-up, source uncertainty, dispatch handoff, human authorization, and operational planning constraints.

## Documentation Rule

Every important product choice should be logged with:

- Decision
- Suggested by
- Final choice
- Why
- Tradeoff
- Implemented evidence
- Case-study angle
