import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const baseUrl = process.env.SENTINEL_VERIFY_URL ?? "http://127.0.0.1:4190/embed/sentinel/";
const outputDir = process.env.SENTINEL_VERIFY_OUTPUT ?? join(tmpdir(), "sentinel-route-matrix");
const headquartersViewport = { width: 1920, height: 1080 };
const executableCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const executablePath = executableCandidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  throw new Error("Chrome or Edge was not found. Set CHROME_PATH before verification.");
}

mkdirSync(outputDir, { recursive: true });

const scenes = [
  "baseline",
  "alert-command",
  "investigation-pending",
  "verify-active",
  "authority-notification-ready",
  "contain-recommended",
  "contain-alternate",
  "contain-degraded",
  "rescue-nominal",
  "rescue-signal-degraded",
  "monitoring-contested",
  "talon-reraise",
  "rescue-battery-critical",
  "satellite-feed-loss",
  "infrastructure-total-loss",
  "network-degraded",
];

const routes = [
  ...scenes.map((scene) => ({
    name: `scene-${scene}`,
    route: `/?scene=${scene}`,
    ...headquartersViewport,
    capture: true,
  })),
  { name: "core-verify-active", route: "/?scene=verify-active&core=1", ...headquartersViewport, core: true, capture: true },
  { name: "core-contested", route: "/?scene=monitoring-contested&core=1", ...headquartersViewport, core: true, capture: true },
  { name: "core-authority", route: "/?scene=authority-notification-ready&core=1", ...headquartersViewport, core: true, capture: true },
  { name: "core-network", route: "/?scene=network-degraded&core=1", ...headquartersViewport, core: true, capture: true },
  { name: "embed-contain", route: "/?scene=contain-recommended&embed=1", ...headquartersViewport, core: true, capture: true },
  { name: "reduced-motion-contain", route: "/?scene=contain-recommended&core=1", ...headquartersViewport, core: true, reducedMotion: true, capture: true },
  { name: "escalation-direct", route: "/?escalation=1&core=1", ...headquartersViewport, core: true, capture: true },
];

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-first-run", "--no-default-browser-check"],
});

const report = [];

try {
  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: route.width, height: route.height } });
    if (route.reducedMotion) {
      await page.emulateMedia({ reducedMotion: "reduce" });
    }
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    await page.goto(`${baseUrl}#${route.route}`, { waitUntil: "commit", timeout: 20000 });
    await page.locator('[aria-label="TALON command bar"]').first().waitFor({ state: "visible" });
    await page.addScriptTag({ path: axePath });
    const axe = await page.evaluate(async () =>
      window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      }),
    );

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const width = window.innerWidth;
      return {
        viewportWidth: width,
        documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
        horizontalOverflow: Math.max(root.scrollWidth, body.scrollWidth) > width + 1,
        reviewDockCount: document.querySelectorAll('[aria-label="Prototype review dock"]').length,
        droneMarkers: document.querySelectorAll('[aria-label*="Select or drag to reposition"]').length,
        modalCount: document.querySelectorAll('[aria-modal="true"]').length,
      };
    });

    const contractFailures = [];
    if (route.core && metrics.reviewDockCount) {
      contractFailures.push("Review Dock is visible in core mode.");
    }
    if (route.route.includes("authority-notification-ready") && metrics.droneMarkers === 0) {
      contractFailures.push("Authority scene has no visible drone markers.");
    }

    if (route.capture) {
      await page.screenshot({ path: join(outputDir, `${route.name}.png`), fullPage: false });
    }

    report.push({
      ...route,
      metrics,
      contractFailures,
      accessibilityViolations: axe.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        targets: violation.nodes.map((node) => node.target),
      })),
      consoleErrors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const reportPath = join(outputDir, "report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));
const failures = report.filter(
  (entry) =>
    entry.metrics.horizontalOverflow ||
    entry.contractFailures.length ||
    entry.accessibilityViolations.length ||
    entry.consoleErrors.length,
);

console.log(`Sentinel route report: ${reportPath}`);
console.log(`Checked ${report.length} scene/view combinations; ${failures.length} need attention.`);
for (const failure of failures) {
  console.log(
    `- ${failure.name}: overflow=${failure.metrics.horizontalOverflow}, contract=${failure.contractFailures.length}, a11y=${failure.accessibilityViolations.length}, errors=${failure.consoleErrors.length}`,
  );
}
if (failures.length) process.exitCode = 1;
