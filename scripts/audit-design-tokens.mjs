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

/*
 * The retired instrument cyan (#00c8ff family) is a HARD FAILURE wherever it
 * survives — it drifts from tokens.ts and was the "two sources of truth" bug
 * of the 2025 craft pass. Scans src/app and src/styles (theme.css alias layer).
 */
for (const dir of ["src/app", "src/styles"]) {
  for (const f of walk(dir).filter((f) => !FILE_ALLOW.some((re) => re.test(f.replace(/\\/g, "/"))))) {
    const rel = f.replace(/\\/g, "/");
    fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
      if (/rgba\(0,\s*200,\s*255|#00c8ff/i.test(line)) {
        violations.push({ file: rel, line: i + 1, rule: "retired-neon-cyan", detail: line.trim() });
      }
    });
  }
}

/** tracking token values — a raw letterSpacing equal to one of these is drift, not novelty.
 *  The "telemetry ± 0.02" band is treated as a permitted micro-tune so dense chips and
 *  small eyebrow labels don't each get a one-off token; the audit flags the truly novel
 *  values (the unique count is the drift signal, not the total count). */
const TRACKING_VALUES = new Set([
  "-0.02em", "-0.01em", "0em",
  "0.01em", // tracking.fine
  "0.02em", "0.04em", "0.05em", "0.06em", "0.08em", // telemetry ± micro-tune
  "0.1em",  // tracking.eyebrow
  "0.12em", "0.16em", // eyebrow + micro-tune
  "inherit", "normal",
]);
const MICRO_TUNE_BAND = new Set(["0.02em", "0.04em", "0.05em", "0.08em", "0.12em", "0.16em"]);

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
    // Drifts are reported per-file; the total stays useful but the unique-value
    // count is the real drift signal.
    const lsMatch = line.match(/letterSpacing:\s*["'`](-?[\d.]+(?:em|px))["'`]/);
    if (lsMatch) {
      const v = lsMatch[1];
      if (!TRACKING_VALUES.has(v)) {
        warnings.push({ file: rel, line: n, value: v, rule: "novel-tracking" });
      } else if (!MICRO_TUNE_BAND.has(v)) {
        warnings.push({ file: rel, line: n, value: v, rule: "exact-token" });
      }
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
  const novel = warnings.filter((w) => w.rule === "novel-tracking");
  const exactDup = warnings.filter((w) => w.rule === "exact-token");
  const novelValues = [...new Set(novel.map((w) => w.value))].sort();
  console.warn(`  novel tracking values: ${novelValues.join(", ") || "(none)"}`);
  for (const w of novel.slice(0, 12)) console.warn(`    novel  ${w.file}:${w.line}  ${w.value}`);
  if (novel.length > 12) console.warn(`    …and ${novel.length - 12} more novel`);
  if (exactDup.length) {
    console.warn(`  exact-token duplicates (use tracking.*): ${exactDup.length}`);
  }
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
