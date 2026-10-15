# Sentinel Flow Atlas — delivery bundle

Built 2026-09-21 from the Sentinel repo (`D:\portfolio porjects\flytbase`). Two artifacts, one goal:
**see every flow, case, screen, and state in one interactive scene, with source evidence per node,**
so design-engineering decisions across screens stop requiring repo archaeology.

## Artifacts

| File | What it is |
| --- | --- |
| `sentinel-flow-atlas.html` | The combined scene — graphify's queryable-graph model + archify's named-view system in one self-contained file (95 KB, zero dependencies, works offline, just open it) |
| `sentinel-f1-intelligence-run.html` | Companion: archify-validated showcase workflow of flow F1 (the 90-second run), delivered through the real archify CLI (`deliver`, showcase quality, spec SHA-256 recorded) |
| `sentinel-flow-atlas-sources/` | Everything needed to regenerate and extend: data, template, build scripts, capability briefings, plan |

## Using the atlas

- **Tabs** = six named views: Full graph · F1 run · Scene lifecycle (all 20 scenes + fault injections) · Dataflow (evidence → fusion → packet) · Architecture (shell regions + principle governance) · Scenario catalog.
- **Search**: press `/`, type (`dissent`, `packet`, `S-04`, `SEN-12`…), Enter jumps and centers.
- **Click a node** → detail panel: description, tags, **evidence (file · lines · note)**, all connections by kind; click a connection to hop.
- **Click an edge** → its gate, label, and evidence.
- **Scenario lens** (sidebar): S-01…S-06 dims everything each case doesn't touch — use it to check "which screens does S-04 Data Fog exercise?"
- **Path mode**: trace the shortest connection between any two nodes (e.g. `SEN-11 Contested Watch` → `SEN-09 Active Rescue`).
- **Kind filters**: hide commands/principles/etc. to reduce density.
- **⚠ discrepancies** (footer): docs-vs-code conflicts found during extraction, quoted both ways.

## How it was built (and how to regenerate)

```
extract-transitions.ps1   # regex-parses stateMachine.ts → atlas-transitions.json (39 transitions, deterministic)
atlas-base.json           # curated nodes/edges/views/scenarios with evidence (screens, shell, commands, sources, scenarios, principles)
merge-atlas.mjs           # merges both, adds 25 command nodes, enforces referential integrity → atlas.json
build-atlas.mjs           # injects atlas.json into atlas-template.html → sentinel-flow-atlas.html
```

Regenerate after cloning this folder: `node merge-atlas.mjs && node build-atlas.mjs`.

## Extending it when you design new screens

1. New scene/state → add it to `stateMachine.ts` as usual, then re-run `extract-transitions.ps1` + merge + build; the lifecycle view picks it up automatically.
2. New shell region / modal / scenario → add a curated node + edges to `atlas-base.json` (copy an existing entry, cite the file you created it in), rebuild.
3. Keep evidence honest: every node needs at least one `file · lines` entry. The footer counts and integrity check (`merge-atlas.mjs` exits non-zero on dangling edges) protect you.

## When to reach for the source tools directly

- **archify** (`tt-a1i/archify`, MIT, CLI runs locally — verified): one-off polished single-topic diagrams (workflow/sequence/dataflow/lifecycle) with validation receipts. Good for case-study embeds. Note: its desktop-readability checker enforces ≤~6-column main paths at 1440px — compress intro nodes or split views.
- **graphify** (`Graphify-Labs/graphify`): run `uv tool install graphifyy && graphify install --project` in the repo when the codebase outgrows what you hold in your head; it maps code+docs into a queryable graph your AI assistant consults instead of grepping. Its `graph.html` pulls vis-network from a CDN (not offline), which is why the atlas here is hand-built instead.

## Verification status (2026-09-21)

- Transitions: 39 machine-extracted from `stateMachine.ts` (none 18 · confirm 13 · human-approval 8), `requiresDissent` 3; matches docs' "~40 edges".
- Atlas data: 97 nodes / 117 edges, referential integrity enforced at build.
- Browser-verified: boot, all six view switches, search→detail→connection-hop, footer stats (atlas); full viewer boot, guided chapters, relationship explorer (archify companion). Desktop rendering verified via headless Chromium at 1440x900 and 1920x1080: all 97 nodes / 117 edges on stage, zero overflow, zero console errors, scripted interaction checks pass (the check caught and fixed an empty-canvas bug on the initial graph view).
- Docs-vs-code discrepancies recorded, not hidden (3): (1) master-plan doc 03 marks four promoted states "planned, not yet in code" while `tokens.ts`/`stateMachine.ts` implement them; (2) docs claim 26 commands, code shows 25; (3) scenario titles vs code landing scenes (S-03 lands on the recomputed-plan scene; `satellite-feed-loss` is bound to no scenario in code).
- Scenario→scene bindings are code-verified from SentinelShell.tsx:391-438 (switch + reverse map), replacing the earlier docs-inferred mappings; remaining docs-side links are labeled [related (docs, not code-bound)] on the edges.
- Full review record: `sentinel-flow-atlas-sources/review.md` (14 checks) and execution log in `sentinel-flow-atlas-sources/plan.md`.

