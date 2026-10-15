# Archify capability briefing (authored by orchestrator after analyst subagent failed: LLM provider errors; 2026-09-21)

Source studied first-hand: `.openclaw/tmp/archify/archify/` (clone of tt-a1i/archify@main, dev version 2.17.0-dev.1).
Doctor verified locally: `node bin/archify.mjs doctor` → all 15 checks ok, exit 0.

## What archify is
An agent skill that turns a small typed JSON spec into a polished, validated, self-contained
interactive HTML diagram (inline SVG, dark/light themes, optional trace motion, PNG/JPEG/WebP/SVG/WebM export).
Diagram types: `architecture` | `workflow` | `sequence` | `dataflow` | `lifecycle`.
Mermaid flowchart/sequence/state input is accepted and re-authored.

## Spec → HTML pipeline (SKILL.md, archify/SKILL.md lines 1–150 observed)
1. Author JSON per type schema: `schemas/{architecture,workflow,sequence,dataflow,lifecycle}.schema.json` + `schemas/common.schema.json`.
2. Validate: `node bin/archify.mjs validate <type> <candidate.json> --quality showcase --json` → receipt with 9 artifact checks, 0 composition errors, 0 warnings for showcase.
3. Deliver: `node bin/archify.mjs deliver <type> <candidate.json> <output.html> --quality showcase --json` → freezes spec bytes, renders, commits atomically, reports SHA-256.
4. `visual-check <output.html> --json` → bounded browser evidence on the delivered HTML.

## Key schema facts (workflow v1 example `examples/incident-response.workflow.json` observed verbatim)
- Top-level: `schema_version` (1|2), `diagram_type`, `meta`, `lanes`, `phases`, `groups`, `mainPath`, `nodes`, `edges`, `cards`.
- `meta`: title, subtitle, output, animation (trace|none), visual_preset (classic|signal-flow|blueprint|editorial), quality_profile (standard|showcase), views, legend, viewBox.
- `meta.views` (guidedViews in common.schema.json): array of `{id, label, focus: [nodeIds], note}` — curated chapters; SKILL.md caps at ~5.
- Node: `{id, lane, col, type: frontend|backend|database|cloud|security|messagebus|external, label, sublabel, width, tag, variant}`.
- Edge: `{from, to, label, variant (emphasis|security|dashed), role, route, fromSide, toSide, via}` — semantic labels are data, never delete meaning to fix geometry.
- IDs: `^[a-zA-Z][a-zA-Z0-9_-]*$` (common.schema.json $defs.id).
- `cards`: conclusion cards with dot color + bullet items.

## Viewer capabilities baked into delivered HTML (SKILL.md "Optional viewer capabilities")
Theme switching, pan/zoom, search, focus, relationship tracing, semantic views, presentation mode, truthful exports.
Reader capabilities, not authoring work. Deep-linking and share cards exist (references/viewer-runtime.md).

## Authoring invariants that matter for us
- Self-contained output (no CDN) — unlike graphify's graph.html (vis-network from unpkg).
- Desktop-first first-screen artifact; verify no overflow at 1440×900/1600×1000/1920×1080.
- One obvious main path; ≤12 primary nodes is their guidance for a single diagram — our atlas exceeds this by design (multi-scene), so we should split views rather than cram one diagram.
- `quality_profile: "showcase"` default; validate after every edit; deliver freezes; never claim success on non-zero exit.

## Recipe for using archify for Sentinel (authored path)
1. From atlas-inventory.json derive per-view archify specs: F1 run → workflow; scene state machine → lifecycle; TALON data sources → dataflow; screens/components → architecture.
2. Write candidate JSONs under .cluster/sentinel-flow-atlas/archify/, run validate → deliver with local CLI.
3. Keep the bespoke combined scene (graphify-style interactions, no CDN) as the main deliverable; ship validated archify diagrams as companion views.

## Version-sensitive notes
- Dev version 2.17.0-dev.1; workflow schema v2 exists with a "readable layout contract"; we used v1 shape from examples (both supported).
- Update-check script exists (scripts/check-update.mjs); irrelevant for one-shot local use.
