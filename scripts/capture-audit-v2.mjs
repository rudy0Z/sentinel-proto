/**
 * Visual-audit captures: shell v2 scenes + components page at 1920×1080.
 * Companion to scripts/capture-audit.mjs (default layout). Run with preview up:
 *   node scripts/capture-audit-v2.mjs
 * Output: verification-artifacts/audit-v2/*.png
 */
import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const baseUrl = "http://localhost:4190/embed/sentinel/";
const outDir = "verification-artifacts/audit-v2";
mkdirSync(outDir, { recursive: true });

const executableCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const executablePath = executableCandidates.find((candidate) => existsSync(candidate));
if (!executablePath) throw new Error("Chrome or Edge was not found.");

const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-first-run"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const scenes = [
  { id: "baseline", label: "01-baseline" },
  { id: "alert-command", label: "02-alert" },
  { id: "verify-active", label: "03-verify-active" },
  { id: "authority-notification-ready", label: "04-authority", ttl: "&stagedTtlMs=0" },
  { id: "contain-recommended", label: "05-contain", ttl: "&stagedTtlMs=0" },
  { id: "monitoring-contested", label: "06-contested" },
  { id: "rescue-battery-critical", label: "07-rescue-battery" },
  { id: "satellite-feed-loss", label: "08-satellite-loss" },
];

for (const scene of scenes) {
  await page.goto(`${baseUrl}#/?scene=${scene.id}&layout=v2${scene.ttl ?? ""}`, { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${outDir}/${scene.label}-v2.png` });
  console.log(`captured ${scene.label}`);
}

// Spine-expanded interaction shot
await page.goto(`${baseUrl}#/?scene=baseline&layout=v2`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator('[data-spine-tab="true"]').first().waitFor({ timeout: 10000 });
await page.locator('[data-spine-tab="true"]').first().click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${outDir}/09-spine-expanded-v2.png` });
console.log("captured spine-expanded");

// Components page — kit showcase section
await page.goto(`${baseUrl}#/components`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.getByText("Redesign 2026 — Obsidian Glass Kit").first().waitFor({ timeout: 10000 });
await page.getByText("Redesign 2026 — Obsidian Glass Kit").first().scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.screenshot({ path: `${outDir}/10-components-kit.png` });
console.log("captured components-kit");

await browser.close();
console.log("v2 audit captures complete");
