# Graphify capability briefing (authored by orchestrator after analyst subagent failed: LLM provider errors; 2026-09-21)

Source studied first-hand: `.openclaw/tmp/graphify/graphify/` (clone of Graphify-Labs/graphify@v8).

## What graphify is (verified from code)
Python CLI that parses a codebase (AST extractors, docs, SQL, PDFs) into a knowledge graph
(networkx), then exports multiple formats. `graphify explain`, path queries, GRAPH_REPORT.md,
and per-assistant skills (claude/codex/copilot/claw/... dirs observed under graphify/skills/).

## graph.html explorer (exporters/html.py — observed)
- Library: **vis-network 9.1.6 loaded from unpkg CDN** (line ~621: `<script src="https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js">`).
  → graph.html is NOT fully offline/self-contained. Archify's output IS. This decides our vehicle.
- Data: `RAW_NODES` / `RAW_EDGES` JSON embedded inline → `vis.DataSet` → force physics (stabilization 200 iterations, fit, then physics disabled).
- Interactions observed in html.py:
  - Search box with live results dropdown; selecting a result calls `focusNode(id)` → `network.focus(n.id, {scale:1.5, animation:true})`.
  - Click handler on nodes → info panel with node fields.
  - Legend with per-community checkbox filters + select-all (indeterminate state), dimming non-selected groups.
  - Neighbor list panel; clicking a neighbor focuses it (border-left colored links).
  - Hyperedges rendered as convex-hull shaded regions (Andrew's monotone chain hull in afterDrawing).
  - Node limit 5000 for viz (GRAPHIFY_VIZ_NODE_LIMIT env override); `sanitize_label()` used before embedding labels (XSS guard).
- Palette: COMMUNITY_COLORS in exporters/base.py = Tableau-10-like ["#4E79A7","#F28E2B","#E15759","#76B7B2","#59A14F","#EDC948","#B07AA1","#FF9DA7","#9C755F","#BAB0AC"].

## Data model (what to borrow)
- Nodes with kind/community/degree metadata; edges with provenance (explicit vs derived) and confidence styling
  (html.py comment: "community filter, physics clustering by community, confidence-styled edges").
- "Every edge explained" ethos: each edge should carry its reason — our atlas edges all carry evidence{file,lines,note}.

## GRAPH_REPORT.md + skill contract (skills dir observed; claude/references present)
- Installed skill instructs assistants to consult the graph for codebase questions before grepping; explain output gives Node/Source/Degree/Connections listings.
- For our atlas: mirror the "consult the map first" contract in the usage notes of the delivered HTML.

## Minimal recipe to reuse client-side (no CDN)
- Embed `const ATLAS = {nodes, edges, views, scenarios}` inline in one HTML.
- Skip physics entirely: Sentinel is phase-structured, so deterministic column/radial layout per view beats force jitter;
  keep graphify's interaction set: search+focus, kind legend filters with dimming, neighbor list, click detail panel, shortest-path highlight (BFS over edges, trivial client-side).
- Sanitize any text before innerHTML (escape), like graphify's sanitize_label.
