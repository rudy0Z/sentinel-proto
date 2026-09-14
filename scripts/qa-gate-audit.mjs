import { chromium } from "playwright-core";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = "verification-artifacts/qa-20260909";
mkdirSync(outDir, { recursive: true });

const executableCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(existsSync);
const browser = await chromium.launch({
  executablePath: executableCandidates[0],
  headless: true,
  args: ["--no-first-run", "--no-default-browser-check", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

async function jsClick(page, pattern) {
  return page.evaluate((src) => {
    const rx = new RegExp(src, "i");
    const target = Array.from(document.querySelectorAll("button"))
      .filter(b => b.offsetParent !== null)
      .find(b => rx.test(b.getAttribute("aria-label") || "") || rx.test(b.innerText || ""));
    if (!target) return null;
    target.click();
    return (target.getAttribute("aria-label") || target.innerText || "").replace(/\n/g, " ").slice(0, 80);
  }, pattern);
}

const bodyText = (page) => page.evaluate(() => document.body.innerText || "");
const modalText = (page) => page.evaluate(() =>
  Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]'))
    .filter(d => d.offsetParent !== null)
    .map(d => d.innerText.slice(0, 700))[0] ?? null);

const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

const result = { steps: [] };
try {
  await page.goto("http://127.0.0.1:4190/#/?scene=authority-notification-ready", { waitUntil: "commit", timeout: 20000 });
  await page.locator('[aria-label="TALON command bar"]').first().waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(800);

  const step1 = await jsClick(page, "Send Authority Packet");
  result.steps.push({ step: "click Send Authority Packet", clicked: step1 });
  await page.waitForTimeout(1500);
  let modal = await modalText(page);
  result.steps.push({ step: "modal after send click", modal });

  // If a PIN input is inside the modal, wrong-then-right PIN
  const pinInModal = await page.evaluate(() => {
    const dlg = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]')).filter(d => d.offsetParent !== null)[0];
    if (!dlg) return null;
    const input = dlg.querySelector('input');
    return input ? { id: input.id, type: input.type, label: dlg.innerText.slice(0, 200) } : null;
  });
  result.steps.push({ step: "input inside modal", pinInModal });

  if (pinInModal) {
    // wrong PIN
    await page.evaluate(() => {
      const dlg = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]')).filter(d => d.offsetParent !== null)[0];
      const input = dlg.querySelector("input");
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, "0000");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await jsClick(page, "Verify PIN|Confirm|Log handoff");
    await page.waitForTimeout(900);
    const wrong = await modalText(page);
    result.steps.push({ step: "wrong PIN 0000", wrong });

    // right PIN
    await page.evaluate(() => {
      const dlg = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]')).filter(d => d.offsetParent !== null)[0];
      if (!dlg) return;
      const input = dlg.querySelector("input");
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, "8842");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await jsClick(page, "Verify PIN|Confirm|Log handoff");
    await page.waitForTimeout(2200);
    const right = await modalText(page);
    const receipt = await bodyText(page);
    result.steps.push({ step: "right PIN 8842", modalGone: !right, receiptExcerpt: receipt.slice(0, 300) });
  } else {
    // maybe confirm-style: look for confirm/authorize inside modal
    const inner = await jsClick(page, "Confirm|Authorize|Send|Yes");
    result.steps.push({ step: "inner confirm click", clicked: inner });
    await page.waitForTimeout(2000);
    result.steps.push({ step: "after inner confirm", text: (await bodyText(page)).slice(0, 300) });
  }
} finally {
  await page.close();
  await browser.close();
}

result.consoleErrors = errors;
writeFileSync(join(outDir, "qa-gate-report.json"), JSON.stringify(result, null, 2));
for (const s of result.steps) console.log(s.step.padEnd(28), JSON.stringify(Object.fromEntries(Object.entries(s).slice(1))).slice(0, 300));
console.log("console errors:", errors.length ? errors.slice(0, 3) : "none");
