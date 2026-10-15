// Merge curated atlas-base.json with machine-extracted atlas-transitions.json -> atlas.json
// Enforces referential integrity: every edge endpoint must have a node.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const stripBom = s => s.replace(/^\uFEFF/, "");
const base = JSON.parse(stripBom(readFileSync(join(dir, "atlas-base.json"), "utf8")));
const trans = JSON.parse(stripBom(readFileSync(join(dir, "atlas-transitions.json"), "utf8")));

const nodes = new Map(base.nodes.map(n => [n.id, n]));
const edges = [...base.edges];

function ensureNode(id, kind, label, tags, note) {
  if (!nodes.has(id)) {
    nodes.set(id, {
      id, kind, label, phase: "n/a",
      description: note || "Auto-added during merge (referenced by an edge).",
      tags, evidence: [{ file: "(merge)", lines: "-", note: note || "added to satisfy edge reference" }]
    });
  }
}

// Synthetic wildcard source for entry edges
ensureNode("any-scene", "state", "Any scene (*)", ["synthetic"], "Wildcard source in the transition table (system events, universal exits).");

// Exception event nodes referenced by curated edges
const excNodes = {
  "exc-satellite-loss": "Exception: satellite feed offline (injected)",
  "exc-network-degraded": "Exception: network degraded (injected)",
  "exc-battery-critical": "Exception: battery critical (timer)",
  "exc-signal-degraded": "Exception: rescue signal degraded (injected)",
  "exc-infra-total-loss": "Exception: infrastructure total loss (injected)",
  "exc-contain-degraded": "Exception: terrain confidence drops"
};
for (const [id, label] of Object.entries(excNodes)) {
  ensureNode(id, "state", label, ["exception-event", "injected"],
    "Injected exception event (not a SceneId); data from getOperationalException().");
  nodes.get(id).evidence = [{ file: "src/app/domain/exceptions.ts", lines: "5-123", note: "getOperationalException cases" }];
}

// All 25 command definitions as nodes (observed in commands.ts)
const commandIds = ["surface-alert","dispatch-scout","open-verification","close-out-contested","monitor-only",
"confirm-incident","deploy-survey","stage-perimeter","stage-responder-guidance","stage-residential-evacuation",
"relay-field-intel","notify-authorities","notify-teams","mark-high-risk","override-plan","open-degraded",
"authorize-containment","emergency-evacuate","activate-automatic-route","deploy-navigation-drone","deploy-backup",
"acknowledge-exception","abort-mission","stand-down","shift-handover"];
for (const id of commandIds) {
  const cid = "cmd-" + id;
  ensureNode(cid, "command", "CMD \u00b7 " + id, ["command"],
    "Command definition (25 observed in code; docs claim 26 - discrepancy recorded in meta).");
  nodes.get(cid).evidence = [{ file: "src/app/domain/commands.ts", lines: "COMMAND_DEFINITIONS", note: "definition(\"" + id + "\")" }];
  edges.push({ from: "reg-command-surface", to: cid, kind: "uses", label: "offers",
    evidence: [{ file: "src/app/domain/commands.ts", lines: "COMMAND_DEFINITIONS", note: "ActionBar renders gated commands" }] });
}

// Machine-extracted transitions -> edges
let added = 0;
for (const t of trans.transitions) {
  ensureNode(t.from, "state", t.from, ["auto"], "Referenced by transition table.");
  ensureNode(t.to, "state", t.to, ["auto"], "Referenced by transition table.");
  const label = `${t.event} [${t.gate}]` + (t.requiresDissent ? " +dissent" : "");
  edges.push({
    from: t.from, to: t.to, kind: "transitions", label,
    gate: t.gate, requiresDissent: t.requiresDissent,
    evidence: [{ file: "src/app/domain/stateMachine.ts", lines: "~" + t.line, note: t.reason || t.event }]
  });
  added++;
}

const out = {
  meta: { ...base.meta, transitionCount: trans.count, machineEdgesAdded: added },
  nodes: [...nodes.values()],
  edges,
  views: base.views,
  scenarios: base.scenarios
};

// Integrity check
const ids = new Set(out.nodes.map(n => n.id));
const missing = [];
for (const e of out.edges) {
  if (!ids.has(e.from)) missing.push("from:" + e.from);
  if (!ids.has(e.to)) missing.push("to:" + e.to);
}
if (missing.length) { console.error("INTEGRITY FAIL:", missing); process.exit(1); }

writeFileSync(join(dir, "atlas.json"), JSON.stringify(out, null, 1));
const byKind = {};
for (const n of out.nodes) byKind[n.kind] = (byKind[n.kind] || 0) + 1;
const byEdge = {};
for (const e of out.edges) byEdge[e.kind] = (byEdge[e.kind] || 0) + 1;
console.log("nodes:", out.nodes.length, JSON.stringify(byKind));
console.log("edges:", out.edges.length, JSON.stringify(byEdge));
console.log("scenarios:", out.scenarios.length, "| transitions merged:", added, "| integrity: OK");
