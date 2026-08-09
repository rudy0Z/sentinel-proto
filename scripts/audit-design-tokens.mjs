/**
 * Design-token audit for Sentinel.
 * Fails on off-scale fontSize/borderRadius, 9px type, and component-local glow shadows.
 *
 * Locked scales (see tokens.ts / DESIGN.md):
 *   fontSize: 10 | 11 | 12 | 13 | 14 | 15 | 18 | 26 | 32
 *   borderRadius: 4 | 8 | 10 | 12 | 16 | 999 | 50% | 0
 */
import fs from "fs";
import path from "path";

const ROOT = "src/app";
const ALLOWED_FONT = new Set([10, 11, 12, 13, 14, 15, 18, 26, 28, 32, 38]);
const ALLOWED_RADIUS = new Set([0, 1, 3, 4, 8, 10, 12, 16, 999]);

/** Files / patterns that may keep one-off geometry (map markers, SVG). */
const FILE_ALLOW = [
  /components\/ui\//,
  /mapSvgPaths\.ts$/,
  /MapBackground\.tsx$/,
];

/** Inset rings / control edges are allowed; coloured outer glow is not. */
const GLOW_RE = /boxShadow:\s*[`'"](?![^`'"]*inset)[^`'"]*0\s+0\s+\d+px[^`'"]*(?:rgba?\([^)]*(?:200|229|245|255)|\$\{)/;

function walk(d, files = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p, files);
    else if (/\.(tsx|ts|css)$/.test(f)) files.push(p);
  }
  return files;
}

const files = walk(ROOT).filter((f) => !FILE_ALLOW.some((re) => re.test(f.replace(/\\/g, "/"))));
const violations = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const rel = file.replace(/\\/g, "/");
  const lines = text.split(/\r?\n/);

  lines.forEach((line, i) => {
    const n = i + 1;
    if (/fontSize:\s*9\b|font-size:\s*9px/.test(line)) {
      violations.push({ file: rel, line: n, rule: "no-9px", detail: line.trim() });
    }
    const fsMatch = line.match(/fontSize:\s*(\d+)/);
    if (fsMatch && !ALLOWED_FONT.has(Number(fsMatch[1]))) {
      violations.push({ file: rel, line: n, rule: "fontSize-scale", detail: line.trim() });
    }
    const brMatch = line.match(/borderRadius:\s*(\d+)/);
    if (brMatch && !ALLOWED_RADIUS.has(Number(brMatch[1]))) {
      violations.push({ file: rel, line: n, rule: "borderRadius-scale", detail: line.trim() });
    }
    if (GLOW_RE.test(line) && !/inset 0 1px/.test(line)) {
      violations.push({ file: rel, line: n, rule: "no-glow-shadow", detail: line.trim() });
    }
  });
}

if (violations.length) {
  console.error(`Design token audit failed: ${violations.length} violation(s)\n`);
  for (const v of violations.slice(0, 80)) {
    console.error(`${v.file}:${v.line}  [${v.rule}]  ${v.detail}`);
  }
  if (violations.length > 80) console.error(`…and ${violations.length - 80} more`);
  process.exit(1);
}

console.log(`Design token audit passed (${files.length} files).`);
