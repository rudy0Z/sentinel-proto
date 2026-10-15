# Task: Sentinel Flow Atlas — one interactive scene of all flows/cases

## Intent
User wants every flow, case, screen, and state built for Sentinel (D:\portfolio porjects\flytbase)
mapped into one visual, interactive scene that speeds up design engineering across screens.
Two capability repos to borrow from:
- graphify (Graphify-Labs/graphify): codebase → queryable knowledge graph; nodes/edges with explain-style detail; graph.html force-directed explorer.
- archify (tt-a1i/archify): agent skill producing self-contained interactive HTML diagrams (architecture, workflow, sequence, data-flow, lifecycle) with named views, motion, node details.

## Assumptions (stated at delivery)
- Deliverable is a standalone HTML atlas under DELIVERY/ in the AutoCoder control workspace, not a change to the Sentinel app.
- "Combine both into one scene" = one HTML file that fuses graphify's graph model (nodes/edges/evidence) with archify's view system (named views: workflow / lifecycle / sequence / data-flow).
- Clone-local study of both repos is acceptable (cloned to .openclaw/tmp/).

## Resources
- Sentinel repo bound: D:\portfolio porjects\flytbase (src/app/domain/stateMachine.ts, routes, session, fixtures; docs/case-study-research/01–05; docs/sentinel-v2-master-plan/03; PRODUCT.md; DESIGN.md)
- Clones: .openclaw/tmp/archify, .openclaw/tmp/graphify
- Tooling: uv 0.12.7, pipx 1.17.2, python 3.13, node 22

## Subtasks
1. [subagent_01] Archify capability study → how its output HTML is structured (JSON source → named views), diagram types, view mechanics, what we can reuse to author a conforming scene by hand. Write subagent_01.md.
2. [subagent_02] Graphify capability study → graph data model (nodes/edges/kinds, explain output), what graph.html interactions matter (click/filter/search/path), minimal schema to reuse. Write subagent_02.md.
3. [zcode] Sentinel extraction → full inventory: routes/screens, state machine states/transitions/gates, scenarios/cases from fixtures+docs, phase topology, design-principle→surface mapping. Output JSON (schema below) + MD with evidence citations. Write into D:\portfolio porjects\flytbase\.zcode\atlas-inventory.{json,md}; then AutoCoder copies into .cluster task dir.
4. [review] Adversarial cross-check: inventory vs stateMachine.ts evidence; archify/graphify claims vs actual skill files; completeness vs docs/case-study-research catalogs. Write review.md.
5. [builder] Build sentinel-flow-atlas.html (self-contained, embedded JSON, graphify-style graph view + archify-style named views, search/filter, node detail with evidence links). Then AutoCoder render-verifies in browser.

## Atlas JSON schema (contract between extractor and builder)
{
  "meta": { "title", "generated", "sources": [] },
  "nodes": [ { "id", "kind": "screen|state|gate|scenario|component|principle|asset",
               "label", "phase", "description", "tags": [],
               "evidence": [ { "file", "lines", "note" } ] } ],
  "edges": [ { "from", "to", "kind": "navigates|transitions|gates|triggers|uses|verifies|escalates",
               "label", "evidence": [ ... ] } ],
  "views": [ { "id", "title", "type": "workflow|lifecycle|sequence|dataflow|graph",
               "focus", "nodeIds": [], "edgeKinds": [] } ],
  "scenarios": [ { "id", "label", "summary", "nodeIds": [] } ]
}

## Dependencies
1,2 parallel; 3 parallel (zcode); 4 after 1–3; 5 after 4.

## Execution log
- ZCode attempt #1 failed: provider capacity error ("high demand, try again shortly"). Read-only recovery done: only .zcode/plans/plan-sess_*.md (ZCode-internal) exists; no repo source touched. Retry with tightened prompt after mainline prep.
- ZCode attempt #2 (tightened prompt) failed with the same provider capacity error. Read-only recovery: no new writes in D:\portfolio porjects\flytbase\.zcode (only pre-existing plan file from 2026-03-09). cluster_bypass_reason: ZCode unavailable due to repeated transient provider capacity failures; per contract the same invocation must not be retried while the blocker persists. Extraction rerouted to a dispatched native sub-agent with read-only repo access and outputs in the control workspace, keeping the repo untouched.
