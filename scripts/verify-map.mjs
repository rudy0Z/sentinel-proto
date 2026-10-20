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

// The legacy map stack used to be pinned here: the check asserted that
// src/app/map/_archive/ still EXISTED, which meant the dead 2,666-LOC copy
// could never be deleted without failing the gate. That was backwards — a
// gate should assert what must be true, not what must still be around.
// Retired 2026-10-21 (DECISIONS.md §4.2, §7.3); the archive is deleted and
// the check now asserts its ABSENCE, so it cannot creep back.
check(
  "legacy-map-archive-removed",
  !fs.existsSync(path.join(root, "src/app/map/_archive")),
  "dead legacy map stack is gone",
);

check(
  "hairline-renderer-removed",
  !fs.existsSync(path.join(root, "src/app/map/hairline")) &&
    !fs.existsSync(path.join(root, "src/app/pages/HairlineMapPage.tsx")),
  "parallel hairline renderer is gone (DECISIONS.md §4.2)",
);

check(
  "one-fire-geometry",
  fs.existsSync(path.join(root, "src/app/map/model/fire.ts")) &&
    !/fire:\s*FireScenario/.test(fs.readFileSync(path.join(root, "src/app/map/world/world.ts"), "utf8")),
  "the world model owns exactly one fire",
);

check(
  "single-coordinate-law",
  fs.existsSync(path.join(root, "src/app/map/model/space.ts")),
  "one coordinate law module (SPEC.md §1.1 M1)",
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

/*
 * Alignment gates. The historical defect: the basemap <img> scaled with
 * objectFit cover while the SVG overlay scaled with viewBox meet and pointer
 * input assumed stretch — three laws in one container, so zones/roads/labels
 * drifted off the photo by 5–82px at 16:9 (and up to 278px on the square
 * pre-incident asset). The fix renders the basemap INSIDE the SVG coordinate
 * space with the same "slice" law everywhere. These checks fail if any layer
 * reintroduces a divergent mapping.
 */
const canvasSrc = fs.readFileSync(path.join(root, "src/app/map/SpatialMapCanvas.tsx"), "utf8");

check(
  "map-basemap-in-svg",
  canvasSrc.includes("<image") && canvasSrc.includes("href={activeMapSrc}") && !canvasSrc.includes('objectFit: "cover"'),
  "basemap renders inside the SVG coordinate space (no HTML img / objectFit)",
);

const sliceCount = (canvasSrc.match(/preserveAspectRatio="xMidYMid slice"/g) || []).length;
check(
  "map-svg-slice-law",
  sliceCount >= 2 && !canvasSrc.includes('preserveAspectRatio="xMidYMid meet"'),
  `backdrop + overlay SVGs share the slice mapping (${sliceCount} declarations)`,
);

check(
  "map-pointer-slice-inverse",
  /svgScale/.test(canvasSrc) && /svgOffX/.test(canvasSrc),
  "pointer→map conversion uses the slice inverse (scale + centered offset)",
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
