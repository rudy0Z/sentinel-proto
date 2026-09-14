import { chromium } from "playwright-core";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const baseUrl = "http://127.0.0.1:4190";
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

const report = { flows: [] };
const log = (...a) => console.log(...a);

async function newPage(w = 1600, h = 900) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));
  return { page, consoleErrors };
}

async function gotoScene(page, scene) {
  await page.goto(`${baseUrl}/#/?scene=${scene}`, { waitUntil: "commit", timeout: 20000 });
  await page.locator('[aria-label="TALON command bar"]').first().waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(700);
}

const bodyText = (page) => page.evaluate(() => (document.body.innerText || "").slice(0, 3000));
const modalText = (page) => page.evaluate(() => document.querySelector('[aria-modal="true"], [role="dialog"]')?.innerText?.slice(0, 600) ?? null);

// list all visible buttons with label-or-text
const allButtons = (page) => page.evaluate(() =>
  Array.from(document.querySelectorAll("button")).filter(b => b.offsetParent !== null)
    .map(b => ({ label: b.getAttribute("aria-label") || "", text: (b.innerText || "").replace(/\n/g, " · ").trim() }))
    .map(b => (b.label || b.text).slice(0, 90))
    .filter(Boolean));

// click a button by matching text via JS (bypasses overlays)
async function jsClick(page, matcher) {
  return page.evaluate((src) => {
    const buttons = Array.from(document.querySelectorAll("button")).filter(b => b.offsetParent !== null);
    const rx = new RegExp(src, "i");
    const target = buttons.find(b => rx.test(b.getAttribute("aria-label") || "") || rx.test(b.innerText || ""));
    if (!target) return false;
    target.click();
    return (target.getAttribute("aria-label") || target.innerText || "").replace(/\n/g, " ").slice(0, 90);
  }, matcher.source.replace(/\\\\/g, "\\"));
}

async function runFlow(name, fn) {
  const { page, consoleErrors } = await newPage();
  const entry = { flow: name, consoleErrors };
  report.flows.push(entry);
  try {
    await fn(page, entry);
  } catch (e) {
    entry.fatal = e.message.split("\n").slice(0, 3).join(" | ").slice(0, 300);
  } finally {
    await page.close();
  }
  const errs = consoleErrors.length ? ` ERRS:${consoleErrors.length}` : "";
  log(`── ${name}${errs}`);
  for (const [k, v] of Object.entries(entry)) {
    if (["flow", "consoleErrors"].includes(k)) continue;
    const s = typeof v === "string" ? v.replace(/\s+/g, " ").slice(0, 200) : JSON.stringify(v)?.slice(0, 300);
    log(`   ${k}: ${s}`);
  }
  if (consoleErrors.length) log(`   errors: ${consoleErrors.slice(0, 2).join(" | ").slice(0, 240)}`);
}

try {
  await runFlow("chip→answer (baseline session)", async (page, entry) => {
    await gotoScene(page, "baseline");
    await jsClick(page, /Open TALON session/i);
    await page.waitForTimeout(1600);
    const chips = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button")).filter(b => b.offsetParent !== null && /what|why|how|status|wind|confidence|survey|thermal|happening|explain/i.test(b.innerText || ""))
        .map(b => b.innerText.replace(/\n/g, " ").slice(0, 90)));
    entry.chips = chips;
    if (chips.length) {
      entry.clicked = chips[0];
      await jsClick(page, new RegExp(chips[0].split(" ").slice(0, 4).join(" ").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      await page.waitForTimeout(2600);
      entry.answerExcerpt = (await bodyText(page)).slice(0, 500);
      entry.modal = await modalText(page);
    }
  });

  await runFlow("authority send gate", async (page, entry) => {
    await gotoScene(page, "authority-notification-ready");
    const btns = await allButtons(page);
    entry.allButtons = btns.filter(t => /send|notify|authorit|packet|dispatch|hold|escalat/i.test(t)).slice(0, 10);
    entry.pinInputFound = false;
    // click "Send..." / "Notify..." style primary CTA
    const clicked = await jsClick(page, /send the|send packet|notify|send authority|prepare packet|authorize/i);
    entry.clicked = clicked;
    await page.waitForTimeout(1500);
    entry.modal1 = await modalText(page);
    const pin = page.locator('input[id*="pin" i], input[type="password"], input[inputmode="numeric"]');
    if (await pin.count() > 0) {
      entry.pinInputFound = true;
      const pinEl = pin.first();
      await pinEl.fill("0000");
      await jsClick(page, /confirm|verify|submit|log handoff/i);
      await page.waitForTimeout(900);
      entry.wrongPin = (await modalText(page))?.slice(0, 250);
      await pinEl.fill("8842");
      await jsClick(page, /confirm|verify|submit|log handoff/i);
      await page.waitForTimeout(2200);
      entry.afterRightPin = (await bodyText(page)).slice(0, 350);
      entry.modalAfterPin = await modalText(page);
    }
  });

  await runFlow("network-degraded telemetry", async (page, entry) => {
    await gotoScene(page, "network-degraded");
    const t = await page.evaluate(() => document.body.innerText || "");
    const lat = t.match(/(\d{2,4})\s?ms/ig);
    entry.latencyMentions = lat?.slice(0, 6);
    entry.railTabOrText = t.slice(0, 300);
  });

  await runFlow("keyboard tab order", async (page, entry) => {
    await gotoScene(page, "baseline");
    await page.keyboard.press("Tab");
    const chain = [];
    for (let i = 0; i < 15; i++) {
      const f = await page.evaluate(() => ({
        t: document.activeElement?.tagName,
        l: (document.activeElement?.getAttribute("aria-label") || document.activeElement?.innerText || "").replace(/\n/g, " ").slice(0, 60),
      }));
      chain.push(`${f.t}:${f.l}`);
      await page.keyboard.press("Tab");
    }
    entry.chain = chain;
    entry.dupes = chain.filter((x, i) => chain.indexOf(x) !== i);
  });

  await runFlow("reduced motion + 390px EXPLORE", async (page, entry) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoScene(page, "contain-recommended");
    const btns = await allButtons(page);
    entry.exploreButtonAt390 = btns.filter(t => /EXPLORE/i.test(t));
    const clicked = await jsClick(page, /EXPLORE · 3D/i);
    entry.clicked = clicked;
    await page.waitForTimeout(2500);
    entry.after = (await bodyText(page)).slice(0, 250);
    entry.hud = await page.evaluate(() => (document.body.innerText.match(/\d+ FPS\s*·\s*\d+ CALLS\s*·\s*\d+K? ?TRIS/i) || [])[0] ?? null);
    const m = await page.evaluate(() => ({ docW: document.documentElement.scrollWidth, w: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
    entry.viewport = m;
  });

} finally {
  await browser.close();
}

writeFileSync(join(outDir, "qa-flows2-report.json"), JSON.stringify(report, null, 2));
log(`\nREPORT: ${join(outDir, "qa-flows2-report.json")}`);
