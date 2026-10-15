# Original Specs — Quarantine README

> **Status:** historical (quarantine). These specs are context only — never build from them.

**What superseded them:** `docs/sentinel-flagship-quality-upgrade.md` is the single canonical build authority. It consolidates the repaired vault `00–09` (in `docs/sentinel-v2-master-plan/`) with every known defect in these originals fixed inline and marked **[REPAIRED]**. Where a repair touches these files in place (Class-2 gate semantics, crypto/statutory language), the in-place text has been corrected — but the files remain historical: no build task may reference them except through this quarantine header.

**Scope of this folder:** `SENTINEL-V2-MASTER-SPEC.md`, `sentinel-master-system-routes-and-data-specification.md`, `sentinel-talon-backend-scenario-master-plan.md` — the pre-consolidation planning specs.

## Known-false claims in these specs (do not re-propose without repealing the rejection in writing)

1. **Autonomous drone dispatch** — e.g. "Dispatch of drone for visual confirmation is autonomous (pre-authorized standard patrol SOP)". False: drone dispatch is machine-validated and human-gated; TALON proposes, the human authorizes, TALON never dispatches.
2. **Auto-timeout approval** — the original Class-2 row claimed "One-Click Affirmation / Automatic Timeout". False: a staged action expires back to watch; expiry is logged; expiry is never execution. Silence at a staged gate leaves state unchanged.
3. **Cryptographic/statutory packet claims** — "Cryptographic Authority Packet", "SHA-256 hash of all packet payload", "triggers statutory emergency powers". False as product claims: receipts are a hash-chained event append via `node:crypto` (implemented in S3 — engineering, not theater), the notification is a *mutual-aid notification draft* that TALON prepares and never sends, and no statutory/legal-instrument powers exist or are claimed anywhere in Sentinel.
4. **"8-stage state machine covering 23 distinct system routes"** — false count framing. The real machine is 16 `SceneId`s / ~34 edges (authority: `src/app/tokens.ts` and the routes audit, which reports 23/23 green as a *gate result*, not a spec count).
5. **The San Francisco coordinate in a Malibu incident** — the Stage-2 anomaly is placed at `37.8821°N, 122.4194°W` (San Francisco) while the scenario geography is Encinal Canyon, Malibu CA (`34.032, -118.815`, 6.0 × 3.25 km frame).
