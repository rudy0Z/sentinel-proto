/**
 * Spatial OS smoke verification.
 * - Pathfinding + zone expand unit checks
 * - Shell wires SpatialMapCanvas (not legacy MapCanvas)
 * - Zone envelope + road network presence
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const shellPath = path.join(root, "src/app/components/SentinelShell.tsx");
const shell = fs.readFileSync(shellPath, "utf8");

const checks = [];

function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

check(
  "shell-imports-spatial-canvas",
  /from ["']\.\.\/map\/SpatialMapCanvas["']/.test(shell) && /<SpatialMapCanvas\b/.test(shell),
  "SentinelShell uses SpatialMapCanvas",
);

check(
  "shell-no-legacy-map-import",
  !/from ["']\.\/MapCanvas["']/.test(shell),
  "legacy components/MapCanvas import removed",
);

check(
  "archive-present",
  fs.existsSync(path.join(root, "src/app/map/_archive/MapCanvas.tsx")) &&
    fs.existsSync(path.join(root, "src/app/map/_archive/mapSvgPaths.ts")) &&
    fs.existsSync(path.join(root, "src/app/map/_archive/MapBackground.tsx")),
  "legacy map stack archived",
);

check(
  "spatial-package",
  ["types.ts", "frame.ts", "zones.ts", "roads.ts", "agents.ts", "routes.ts", "SpatialMapCanvas.tsx"].every((f) =>
    fs.existsSync(path.join(root, "src/app/map", f)),
  ),
  "MapFrame package files present",
);

check(
  "zone-margins-on-shell-state",
  /zoneMargins/.test(fs.readFileSync(path.join(root, "src/app/tokens.ts"), "utf8")),
  "ShellState.zoneMargins declared",
);

const smoke = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["--yes", "tsx", "src/app/map/__tests__/spatial-smoke.ts"],
  { cwd: root, encoding: "utf8", shell: true },
);
check("spatial-smoke", smoke.status === 0, (smoke.stdout || smoke.stderr || "").trim().split("\n").pop());

const failed = checks.filter((c) => !c.ok);
if (failed.length) {
  console.error(`\nverify:map failed (${failed.length})`);
  process.exit(1);
}
console.log(`\nverify:map passed (${checks.length} checks).`);
