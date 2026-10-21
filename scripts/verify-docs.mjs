/**
 * Documentation-contract check.
 * Run: npm run verify:docs
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * This repo is governed by documents, and the documents had drifted from the
 * code and from each other. The symptom was concrete: a canonical layout
 * spec said the centre orb was deleted, while the code rendered a 64px orb
 * in the bottom deck. A canonical art-direction doc still described a colour
 * direction the owner had REJECTED. Design-system numbers in DESIGN.md had
 * stopped matching tokens.ts.
 *
 * Those failures are invisible to every other gate. Typecheck does not read
 * markdown. The token audit does not read DESIGN.md. A build cannot tell you
 * that the rule you are about to implement was repealed six weeks ago.
 *
 * So the rules get a gate too, on the same principle as the rest: a
 * design decision that is not checked will drift.
 *
 * ── Scope ───────────────────────────────────────────────────────────────────
 * Only the documents in the AUTHORITY CHAIN are checked. A doc nobody cites
 * is not a rule, and making 71 files carry a status header is a filing
 * exercise, not a safety property. What matters is that the handful of
 * documents an agent is told to obey actually say true things.
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const checks = [];

function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function read(rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}

function head(rel, lines = 10) {
  const s = read(rel);
  return s === null ? "" : s.split("\n").slice(0, lines).join("\n");
}

/**
 * The authority chain, from AGENTS.md. Ordered — a doc higher in this list
 * outranks one lower.
 */
const AUTHORITY = [
  "DECISIONS.md",
  "SPEC.md",
  "PRODUCT.md",
  "PORTFOLIO-DIRECTION.md",
  "docs/sentinel-v2-master-plan/00-INDEX-AND-EXECUTIVE-THESIS.md",
  "docs/sentinel-v2-master-plan/02-SPATIAL-OS-AND-3D-MAP-SYSTEM.md",
  "docs/sentinel-v2-master-plan/03-STATE-MACHINE-AND-ROUTE-TOPOLOGY.md",
  "docs/sentinel-v2-master-plan/08-PHASED-EXECUTION-ROADMAP.md",
  "docs/sentinel-v2-master-plan/09-TALON-ORB-IDENTITY-AND-SURFACE-SPEC.md",
  "sentinel-core/01-product-core.md",
  "sentinel-core/02-talon-identity.md",
  "sentinel-core/03-visual-language.md",
  "sentinel-core/05-map-world.md",
  "sentinel-core/06-command-deck.md",
  "sentinel-core/07-panels-charter.md",
  "DESIGN.md",
  "docs/redesign-2026/14-final-layout-spec.md",
  "docs/redesign-2026/15-data-placement-matrix.md",
  "docs/redesign-2026/03-implementation-plan.md",
];

// ── 1. Every authority doc declares its status ──────────────────────────────
const STATUS_RE = /(canonical|historical|exploratory|superseded|rejected)/i;
for (const doc of AUTHORITY) {
  const h = head(doc);
  check(`status-header: ${doc}`, h !== "" && STATUS_RE.test(h), h === "" ? "FILE MISSING" : "");
}

// ── 2. The design system numbers agree with tokens.ts ───────────────────────
const tokens = read("src/app/tokens.ts") ?? "";
const design = read("DESIGN.md") ?? "";

/** The type scale as DESIGN.md states it, and as tokens.ts implements it. */
const TYPE_SCALE = [
  ["display", 26, 32],
  ["heading", 18, 24],
  ["panelTitle", 15, 21],
  ["brand", 14, 20],
  ["body", 12, 18],
  ["control", 12, 16],
  ["label", 11, 15],
  ["metadata", 10, 14],
  ["metric", 32, 36],
];

for (const [name, size, lineHeight] of TYPE_SCALE) {
  // tokens.ts: name: { size: N, lineHeight: M, ...
  const re = new RegExp(`${name}:\\s*\\{[^}]*?size:\\s*${size}\\b[^}]*?lineHeight:\\s*${lineHeight}\\b`, "s");
  check(`tokens type scale: ${name} ${size}/${lineHeight}`, re.test(tokens));
  // DESIGN.md states it as "- Panel title: 15px / 21px, 600."
  const docLine = new RegExp(`${size}px\\s*/\\s*${lineHeight}px`);
  check(`DESIGN.md states ${name} ${size}/${lineHeight}`, docLine.test(design));
}

const RADIUS = [
  ["dense", 4],
  ["control", 8],
  ["tile", 10],
  ["panel", 12],
  ["overlay", 16],
  ["pill", 999],
];
for (const [name, value] of RADIUS) {
  const re = new RegExp(`${name}:\\s*${value}\\b`);
  check(`tokens radius: ${name} = ${value}`, re.test(tokens));
}

// ── 3. Layout numbers in canonical docs match the code ─────────────────────
const bottomNav = read("src/app/components/rails/BottomNav.tsx") ?? "";
const railSystem = read("src/app/components/rails/RailSystem.tsx") ?? "";

const DECK = Number((bottomNav.match(/DECK_HEIGHT\s*=\s*(\d+)/) ?? [])[1] ?? NaN);
const RAIL = Number((railSystem.match(/RAIL_W\s*=\s*(\d+)/) ?? [])[1] ?? NaN);
check("deck height is readable from code", Number.isFinite(DECK), `${DECK}px`);
check("rail width is readable from code", Number.isFinite(RAIL), `${RAIL}px`);

const layoutSpec = read("docs/redesign-2026/14-final-layout-spec.md") ?? "";
const deckSpec = read("sentinel-core/06-command-deck.md") ?? "";
const placement = read("docs/redesign-2026/15-data-placement-matrix.md") ?? "";

/**
 * A deck height is only a VIOLATION if the doc ASSERTS it as current. A doc
 * that mentions a wrong number in a dated correction note — or explicitly
 * marks the old figure superseded — is doing the right thing and must not
 * fail. So the check looks for the assertion, not for the number.
 */
const DECK_ASSERTIONS = [
  ["sentinel-core/06-command-deck.md", /at\s+(\d{2,3})px\s+the deck/i],
  ["redesign-2026/15-data-placement-matrix.md", /Bottom\s+(\d{2,3})px/i],
  ["redesign-2026/14-final-layout-spec.md", /The Hand.{0,40}?(\d{2,3})px/s],
];
for (const [doc, pattern] of DECK_ASSERTIONS) {
  const text = read(doc) ?? "";
  const m = text.match(pattern);
  if (!m) {
    check(`${doc} states no deck height`, true);
    continue;
  }
  const claimed = Number(m[1]);
  // A mention is legal if the document marks that figure as superseded.
  const marked = new RegExp(
    `${claimed}px[^.\\n]{0,120}(superseded|corrected|replaced)` +
      `|(superseded|corrected|replaced)[^.\\n]{0,120}${claimed}px`,
    "i",
  ).test(text);
  check(
    `${doc} asserts the real deck height (${DECK}px)`,
    claimed === DECK || marked,
    claimed !== DECK && !marked ? `asserts ${claimed}px as current` : "",
  );
}

/** A canonical doc must not state a rail width the code does not use. */
for (const [label, text] of [
  ["DESIGN.md", design],
  ["redesign-2026/14-final-layout-spec.md", layoutSpec],
]) {
  const widths = [...text.matchAll(/(\d{2,3})\s*px\s+rails|rails[^.\n]{0,16}?(\d{2,3})\s*px/g)]
    .map((m) => Number(m[1] ?? m[2]))
    .filter(Boolean);
  const wrong = widths.filter((n) => n !== RAIL && n !== 64 && n !== 404 && n !== 400 && n !== 340 && n !== 380);
  check(`${label} states no stale rail width`, wrong.length === 0, wrong.length ? `claims ${wrong.join(", ")}px` : "");
}

// ── 4. A canonical doc must not carry a REJECTED direction ─────────────────
// DECISIONS.md §2.4 rejected the "warm console" direction. If a doc still
// carries that language, it must be marked REJECTED ON THE SPOT — a
// "canonical" header does not make a rejected section safe to read.
const decisions = read("DECISIONS.md") ?? "";
if (/REJECTED/i.test(decisions) && /warm console/i.test(decisions)) {
  for (const doc of ["sentinel-core/05-map-world.md", "sentinel-core/03-visual-language.md"]) {
    const text = read(doc) ?? "";
    const lines = text.split("\n");
    // Any line mentioning the rejected direction must be marked rejected
    // itself OR be adjacent to a line that marks it. A phrase can straddle a
    // line break, so a single-line window produces false failures.
    const offenders = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => /warm console|vivid terrain under a warm/i.test(l))
      .filter(({ i }) => {
        const window = lines.slice(Math.max(0, i - 2), i + 3).join("\n");
        return !/REJECTED|rejected|repealed|superseded/i.test(window);
      });
    check(
      `${doc} marks every mention of the rejected direction as rejected`,
      offenders.length === 0,
      offenders.length ? `L${offenders[0].i + 1}: ${offenders[0].l.trim().slice(0, 70)}` : "",
    );
  }
}

// ── 5. Superseded claims must not appear as current ────────────────────────
/**
 * A superseded rule may still be *mentioned* — that is how a correction stays
 * traceable. It must not be *asserted as current*. So the check looks for the
 * claim, and then for a superseded marker near it.
 */
const SUPERSEDED_CLAIMS = [
  ["sentinel-core/06-command-deck.md", /at\s+96px\s+the deck/i],
  ["redesign-2026/15-data-placement-matrix.md", /Bottom\s+96px/i],
  ["docs/sentinel-v2-master-plan/02-SPATIAL-OS-AND-3D-MAP-SYSTEM.md", /CONCENTRIC SPREAD RINGS/i],
];
for (const [doc, pattern] of SUPERSEDED_CLAIMS) {
  const text = read(doc) ?? "";
  const m = text.match(pattern);
  if (!m) {
    check(`${doc} does not assert a superseded rule as current`, true);
    continue;
  }
  // Look for a superseded marker within a window around the claim.
  const start = Math.max(0, m.index - 400);
  const window = text.slice(start, m.index + pattern.source.length + 500);
  const marked = /superseded|replaced|no longer|do not build/i.test(window);
  check(`${doc} does not assert a superseded rule as current`, marked, marked ? "" : "stale claim present with no superseded marker");
}

// ── 6. A canonical layout spec must match the built shell ──────────────────
// The centre TALON bay is the most-argued element in the product. It is
// ruled by sentinel-core/06 ("the deck keeps the TALON bay"), which
// supersedes 14-final-layout-spec's orb-removal. So the check is not
// "is there an orb" but "does the built bay match the ruled bay" — and
// whether the owner's open question about it has been recorded, because an
// unrecorded open question is exactly how a rule gets silently reversed.
const core06 = read("sentinel-core/06-command-deck.md") ?? "";
const bayRuled = /TALON bay/i.test(core06);
const bayBuilt = /rls-orb/.test(bottomNav);
check("centre TALON bay: code matches the ruling", bayBuilt === bayRuled, bayBuilt !== bayRuled ? "core/06 rules a bay; the code does not build one" : "");

// The cradle size must be the ruled size, not a near-miss.
const cradleRuled = Number((core06.match(/cradle \((\d+)px/) ?? [])[1] ?? NaN);
const cradleBuilt = Number((bottomNav.match(/rls-orb[\s\S]{0,400}?width:\s*(\d+)/) ?? [])[1] ?? NaN);
check(
  "TALON cradle size matches the spec",
  Number.isFinite(cradleRuled) && cradleRuled === cradleBuilt,
  Number.isFinite(cradleRuled) && Number.isFinite(cradleBuilt) ? `spec ${cradleRuled}px, code ${cradleBuilt}px` : "",
);

// An open design question must be recorded in the register, not left implicit.
check(
  "TALON placement question is recorded in DECISIONS.md",
  /\|\s*Q6\s*\|/.test(decisions) && /Where does TALON live/i.test(decisions),
  "an open placement question must be an explicit register entry (Q6)",
);

// ── Report ──────────────────────────────────────────────────────────────────
const failed = checks.filter((c) => !c.ok);
if (failed.length) {
  console.error(`\nverify:docs — ${failed.length} of ${checks.length} checks FAILED`);
  for (const f of failed) console.error(`  FAIL  ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
  process.exit(1);
}
console.log(`\nverify:docs — all ${checks.length} checks passed`);
