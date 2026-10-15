/*
 * Rail clip verification (§3 C1).
 *
 * Loads every designed scene at two viewport heights (1080p + 768p) and scans
 * both rail containers for vertical clipping: any element whose content is
 * taller than its box (scrollHeight > clientHeight + 1) without being an
 * intentional scroll surface (computed overflowY auto/scroll) is a violation.
 *
 * The rails are allowed to scroll as a whole (RailStack's data-scroll-surface
 * with the bottom fade); what must never happen is content silently running
 * past a fixed box edge — the "broken panel" read at the rail bottom.
 *
 * Run against a static preview server:
 *   SENTINEL_VERIFY_URL=http://127.0.0.1:4190/embed/sentinel/ node scripts/verify-clip.mjs
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.SENTINEL_VERIFY_URL ?? "http://127.0.0.1:4190/embed/sentinel/";
const outputDir = process.env.SENTINEL_VERIFY_OUTPUT ?? join(projectRoot, "verification-artifacts", "clip");
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

const viewports = [
  { name: "1080p", width: 1920, height: 1080 },
  { name: "768p", width: 1366, height: 768 },
];

/*
 * Both rail wrappers from SentinelShell. Every element inside them — tab
 * strips, panels, matrices, relay strips — is scanned. The RailStack scroll
 * surface itself passes via the overflowY auto/scroll exemption; anything
 * that merely overflows a non-scrollable box fails.
 */
const railSelectors = [
  '[role="region"][aria-label="Intelligence panels"]',
  '[role="region"][aria-label="Priority and team panels"]',
];

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: [
    "--no-first-run",
    "--no-default-browser-check",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});

const report = [];

try {
  for (const scene of scenes) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const violations = [];
      try {
        await page.goto(`${baseUrl}#/?scene=${scene}`, { waitUntil: "commit", timeout: 20000 });
        await page.waitForSelector('[data-action="open-explore-3d"]', { state: "visible", timeout: 20000 });
        // Allow web fonts and the ResizeObserver-driven layout to settle.
        await page.waitForTimeout(500);

        violations.push(
          ...(await page.evaluate((selectors) => {
            const issues = [];
            for (const selector of selectors) {
              const container = document.querySelector(selector);
              if (!container) {
                issues.push({
                  rail: selector,
                  descriptor: "<rail container missing>",
                  scrollHeight: 0,
                  clientHeight: 0,
                  overflowY: "missing",
                });
                continue;
              }
              for (const el of container.querySelectorAll("*")) {
                if (!(el instanceof HTMLElement)) continue;
                const style = window.getComputedStyle(el);
                if (style.display === "none" || style.visibility === "hidden") continue;
                if (el.clientHeight === 0 && el.scrollHeight === 0) continue;
                const overflowY = style.overflowY;
                // Intentional scroll surfaces are the sanctioned way to hold
                // tall content — never a violation.
                if (overflowY === "auto" || overflowY === "scroll") continue;
                if (el.scrollHeight > el.clientHeight + 1) {
                  issues.push({
                    rail: selector,
                    descriptor: [
                      el.tagName.toLowerCase(),
                      el.getAttribute("data-testid"),
                      el.getAttribute("aria-label"),
                      (el.textContent ?? "").trim().slice(0, 40),
                    ]
                      .filter(Boolean)
                      .join(" · "),
                    scrollHeight: el.scrollHeight,
                    clientHeight: el.clientHeight,
                    overflowY,
                  });
                }
              }
            }
            return issues;
          }, railSelectors)),
        );
      } catch (error) {
        violations.push({
          rail: "page",
          descriptor: `load failed: ${error.message}`,
          scrollHeight: 0,
          clientHeight: 0,
          overflowY: "error",
        });
      } finally {
        await page.close();
      }

      report.push({ scene, viewport: viewport.name, violations });
      const mark = violations.length ? "FAIL" : "PASS";
      console.log(`${mark}  ${scene} @ ${viewport.name}${violations.length ? ` — ${violations.length} clipped element(s)` : ""}`);
      for (const violation of violations) {
        console.log(
          `    - [${violation.rail}] ${violation.descriptor} (scrollHeight ${violation.scrollHeight} > clientHeight ${violation.clientHeight}, overflowY=${violation.overflowY})`,
        );
      }
    }
  }
} finally {
  await browser.close();
}

const reportPath = join(outputDir, "report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));
const failed = report.filter((entry) => entry.violations.length > 0);

console.log(`Sentinel clip report: ${reportPath}`);
console.log(`Checked ${report.length} scene/viewport combinations across ${scenes.length} scenes; ${failed.length} need attention.`);
if (failed.length) process.exitCode = 1;
