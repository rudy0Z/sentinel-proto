/**
 * Design-token audit for Sentinel.
 *
 * HARD FAILURES (exit 1): off-scale fontSize/borderRadius, any 9px type
 * (including inside ternaries/expressions), and component-local glow shadows.
 *
 * WARNINGS (reported, non-fatal): raw letterSpacing em/px literals that bypass
 * the `tracking.*` tokens, and raw rgba() literals in components that bypass
 * `surface.*`/`border.*`/`tint()`. These are drift being ratcheted down over the
 * craft pass — they print a count so the number only moves in one direction.
 *
 * Locked scales (see tokens.ts / DESIGN.md — these Sets MUST match the docs):
 *   fontSize:    10 | 11 | 12 | 13 | 14 | 15 | 18 | 26 | 32
 *   borderRadius: 0 | 4 | 8 | 10 | 12 | 16 | 999   (+ '50%' string for circles)
 *   tracking:    displayTight | tight | fine | telemetry | eyebrow
 */
import fs from "fs";
import path from "path";

const ROOT = "src/app";
const ALLOWED_FONT = new Set([10, 11, 12, 13, 14, 15, 18, 26, 32]);
const ALLOWED_RADIUS = new Set([0, 4, 8, 10, 12, 16, 999]);

/** Files / patterns that may keep one-off geometry (map markers, SVG). */
const FILE_ALLOW = [
  /components\/ui\//,
  /map\/_archive\//,
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
const warnings = [];

/** tracking token values — a raw letterSpacing equal to one of these is drift, not novelty. */
const TRACKING_VALUES = new Set(["-0.02em", "-0.01em", "0.01em", "0.06em", "0.1em"]);

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const rel = file.replace(/\\/g, "/");
  const lines = text.split(/\r?\n/);

  lines.forEach((line, i) => {
    const n = i + 1;
    // 9px is forbidden anywhere in a fontSize expression — bare, ternary, or otherwise.
    // \b9\b won't match 19/29/90, so only a standalone 9 after fontSize: trips it.
    if (/fontSize:[^,;}\n]*\b9\b/.test(line) || /font-size:\s*9px/.test(line)) {
      violations.push({ file: rel, line: n, rule: "no-9px", detail: line.trim() });
    }
    // Off-scale bare fontSize literals (ternary numbers are covered by no-9px above;
    // other off-scale ternary sizes are rare and caught by review).
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
    // WARN: raw letterSpacing literal (em/px) not going through a tracking token.
    const lsMatch = line.match(/letterSpacing:\s*["'`](-?[\d.]+(?:em|px))["'`]/);
    if (lsMatch) {
      const dup = TRACKING_VALUES.has(lsMatch[1]) ? " (== a tracking.* token — use it)" : "";
      warnings.push({ file: rel, line: n, rule: "raw-tracking", detail: `${lsMatch[1]}${dup}` });
    }
    // WARN: raw rgba() in a component (token definitions live in tokens.ts, excluded below).
    if (!/tokens\.ts$/.test(rel) && /rgba\(/.test(line)) {
      const count = (line.match(/rgba\(/g) || []).length;
      for (let k = 0; k < count; k++) warnings.push({ file: rel, line: n, rule: "raw-rgba", detail: "" });
    }
  });
}

// Warnings first (non-fatal), so the ratchet number is visible on every run.
if (warnings.length) {
  const byRule = warnings.reduce((m, w) => ((m[w.rule] = (m[w.rule] || 0) + 1), m), {});
  console.warn(`Design token audit — ${warnings.length} warning(s) (drift to ratchet down):`);
  for (const [rule, count] of Object.entries(byRule)) console.warn(`  ${rule}: ${count}`);
  const tracking = warnings.filter((w) => w.rule === "raw-tracking");
  for (const w of tracking.slice(0, 12)) console.warn(`    ${w.file}:${w.line}  ${w.detail}`);
  if (tracking.length > 12) console.warn(`    …and ${tracking.length - 12} more raw-tracking`);
  console.warn("");
}

if (violations.length) {
  console.error(`Design token audit FAILED: ${violations.length} violation(s)\n`);
  for (const v of violations.slice(0, 80)) {
    console.error(`${v.file}:${v.line}  [${v.rule}]  ${v.detail}`);
  }
  if (violations.length > 80) console.error(`…and ${violations.length - 80} more`);
  process.exit(1);
}

console.log(`Design token audit passed (${files.length} files, ${warnings.length} warning(s)).`);
