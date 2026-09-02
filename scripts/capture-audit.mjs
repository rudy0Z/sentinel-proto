import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const baseUrl = "http://localhost:4190/embed/sentinel/";
const outDir = "verification-artifacts/audit-captures";
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

const scenes = [
  { id: "baseline", label: "01-baseline" },
  { id: "verify-active", label: "02-verify-active-gate" },
  { id: "authority-notification-ready", label: "03-authority-ready" },
  { id: "investigation-pending", label: "04-investigation" },
  { id: "monitoring-contested", label: "05-contested" },
  { id: "talon-reraise", label: "06-reraise" },
  { id: "contain-recommended", label: "07-contain-recommended" },
  { id: "infrastructure-total-loss", label: "08-infra-loss" },
];

const viewports = [
  { w: 1600, h: 900, tag: "1600" },
  { w: 1280, h: 800, tag: "1280" },
];

for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  for (const scene of scenes) {
    await page.goto(`${baseUrl}#/?scene=${scene.id}&core=1`, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${outDir}/${scene.label}-${vp.tag}.png` });
    console.log(`captured ${scene.label} @${vp.tag}`);
  }
  await page.close();
}

await browser.close();
console.log("done");
