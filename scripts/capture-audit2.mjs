import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const baseUrl = "http://localhost:4190/embed/sentinel/";
const outDir = "verification-artifacts/audit-captures";
mkdirSync(outDir, { recursive: true });

const executableCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const executablePath = executableCandidates.find((candidate) => existsSync(candidate));
const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-first-run"] });

const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

// 1. Free mode baseline — full navbar, no core param
await page.goto(`${baseUrl}#/?scene=baseline`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${outDir}/10-freemode-baseline.png` });
console.log("captured free-mode baseline");

// 2. Click the orb -> expanded session surface (baseline)
const orb = page.getByRole("button", { name: /Open TALON session/i });
if (await orb.count()) {
  await orb.click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/11-session-expanded.png` });
  console.log("captured expanded session");

  // 3. Ask a suggested question -> checking -> authored reply
  const chip = page.getByRole("button", { name: "TALON scope" });
  if (await chip.count()) {
    await chip.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${outDir}/12-session-checking.png` });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${outDir}/13-session-recommendation.png` });
    console.log("captured checking + recommendation");
  }
}

// 4. verify-active free mode at 1280 (embed scale) — overlap check
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(`${baseUrl}#/?scene=verify-active`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${outDir}/14-verify-free-1280.png` });
console.log("captured verify free 1280");

await browser.close();
console.log("done");
