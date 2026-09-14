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
const executablePath = executableCandidates[0];
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  headless: true,
  args: ["--no-first-run", "--no-default-browser-check", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

const report = { flows: [] };

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

async function openTalonSession(page) {
  const btn = page.locator('button', { hasText: /Open TALON session/i }).first();
  const n = await btn.count();
  if (n === 0) return false;
  await btn.click();
  await page.waitForTimeout(1500);
  return true;
}

const snapshot = (page) => page.evaluate(() => ({
  text: (document.body.innerText || "").slice(0, 2500),
  modal: document.querySelector('[aria-modal="true"]')?.innerText?.slice(0, 500) ?? null,
  buttons: Array.from(document.querySelectorAll("button")).filter(b => b.offsetParent !== null)
    .map(b => (b.innerText || b.getAttribute("aria-label") || "").replace(/\n/g, " ").trim().slice(0, 70))
    .filter(Boolean).slice(0, 40),
}));

try {
  // ── FLOW 1: baseline → open session → click a suggested-question chip → answer ──
  {
    const { page, consoleErrors } = await newPage();
    await gotoScene(page, "baseline");
    const opened = await openTalonSession(page);
    const chips = page.locator('button', { hasText: /what|why|how|wind|drone|zone|confidence|range|status/i });
    const chipCount = await chips.count();
    let clicked = null, after = null;
    if (chipCount > 0) {
      clicked = (await chips.first().innerText()).replace(/\n/g, " ").slice(0, 80);
      await chips.first().click();
      await page.waitForTimeout(1800);
      after = await snapshot(page);
    }
    report.flows.push({ flow: "chip→answer (baseline session)", sessionOpened: opened, chipCount, clicked, answerExcerpt: after?.text?.slice(0, 400), modal: after?.modal, consoleErrors });
    await page.close();
  }

  // ── FLOW 2: monitoring-contested → "Ground truth arrived" ──
  {
    const { page, consoleErrors } = await newPage();
    await gotoScene(page, "monitoring-contested");
    const gt = page.locator('button', { hasText: /Ground truth arrived/i }).first();
    const n = await gt.count();
    let after = null, clicked = false;
    if (n > 0) {
      await gt.click(); clicked = true;
      await page.waitForTimeout(2500); // reraise confidence is wall-clock bound
      after = await snapshot(page);
    }
    report.flows.push({ flow: "contested → ground truth", found: n, clicked, sceneAfter: after?.text?.slice(0, 500), modal: after?.modal, consoleErrors });
    await page.close();
  }

  // ── FLOW 3: talon-reraise → dissent capture (operator refuses again) ──
  {
    const { page, consoleErrors } = await newPage();
    await gotoScene(page, "talon-reraise");
    const pre = await snapshot(page);
    const decline = page.locator('button', { hasText: /Decline again|Decline|Prepare packet/i }).first();
    const n = await decline.count();
    let after = null, clicked = false, modalSeq = [];
    if (n > 0) {
      await decline.click(); clicked = true;
      await page.waitForTimeout(1200);
      let s = await snapshot(page);
      modalSeq.push(s.modal);
      // if a dissent reason UI appeared, pick a reason and confirm
      const reasonBtn = page.locator('button', { hasText: /False positive|Incomplete data|Operational constraint/i }).first();
      if (await reasonBtn.count() > 0) {
        await reasonBtn.click();
        await page.waitForTimeout(900);
        const confirm = page.locator('button', { hasText: /Confirm|Record|Submit|Log/i }).first();
        if (await confirm.count() > 0) {
          await confirm.click();
          await page.waitForTimeout(1200);
        }
      }
      after = await snapshot(page);
      modalSeq.push(after.modal);
    }
    report.flows.push({ flow: "reraise → decline (dissent)", found: n, clicked, buttonsBefore: pre.buttons.filter(b => /decline|packet|appeal|authority/i.test(b)), sceneAfter: after?.text?.slice(0, 600), modals: modalSeq, consoleErrors });
    await page.close();
  }

  // ── FLOW 4: authority-notification-ready → send → PIN gate (8842) ──
  {
    const { page, consoleErrors } = await newPage();
    await gotoScene(page, "authority-notification-ready");
    const pre = await snapshot(page);
    const send = page.locator('button', { hasText: /send|notify|dispatch|authorize/i }).first();
    const n = await send.count();
    let pinSeen = false, wrongPin = null, rightPin = null, receipt = null;
    if (n > 0) {
      await send.first().click();
      await page.waitForTimeout(1000);
      const s1 = await snapshot(page);
      pinSeen = !!s1.modal && /PIN|pin|security/i.test(s1.modal);
      if (pinSeen) {
        // wrong PIN first
        const input = page.locator('#shift-handover-pin, input[inputmode="numeric"], input[type="password"]').first();
        if (await input.count() > 0) {
          await input.fill("0000");
          const conf = page.locator('button', { hasText: /confirm|verify|log|submit/i }).first();
          if (await conf.count() > 0) { await conf.click(); await page.waitForTimeout(800); }
          wrongPin = (await snapshot(page)).modal;
          // right PIN
          await input.fill("8842");
          if (await conf.count() > 0) { await conf.click(); await page.waitForTimeout(1500); }
          receipt = (await snapshot(page)).text.slice(0, 600);
        }
      }
    }
    report.flows.push({ flow: "authority send → PIN gate", found: n, pinSeen, wrongPinResult: wrongPin?.slice(0, 200), receiptAfter: receipt?.slice(0, 400), consoleErrors });
    await page.close();
  }

  // ── FLOW 5: EXPLORE deep-dive — orbit/zoom/drag live canvas ──
  {
    const { page, consoleErrors } = await newPage();
    await gotoScene(page, "contain-recommended");
    const btn = page.locator('button', { hasText: /EXPLORE/i }).first();
    await btn.click();
    await page.waitForTimeout(3000);
    const hud0 = await page.evaluate(() => (document.body.innerText.match(/\d+ FPS\s*·\s*\d+ CALLS\s*·\s*\d+K? ?TRIS/i) || [])[0] ?? null);
    // drag to orbit
    const canvas = page.locator("canvas").last();
    const box = await canvas.boundingBox();
    let orbitOk = false, zoomHud = null;
    if (box) {
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx - 180, cy + 60, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(1200);
      orbitOk = true;
      // wheel zoom
      await page.mouse.move(cx - 90, cy + 30);
      await page.mouse.wheel(0, -400);
      await page.waitForTimeout(1200);
      zoomHud = await page.evaluate(() => (document.body.innerText.match(/\d+ FPS\s*·\s*\d+ CALLS\s*·\s*\d+K? ?TRIS/i) || [])[0] ?? null);
    }
    const afterText = await page.evaluate(() => (document.body.innerText || "").slice(0, 300));
    report.flows.push({ flow: "EXPLORE orbit + zoom", hudBefore: hud0, orbitDragged: orbitOk, hudAfterZoom: zoomHud, exitAvailable: /EXPLORE|Exit|close/i.test(afterText), consoleErrors });
    await page.close();
  }

  // ── FLOW 6: network-degraded live telemetry (340ms claim) ──
  {
    const { page, consoleErrors } = await newPage();
    await gotoScene(page, "network-degraded");
    const t = await page.evaluate(() => (document.body.innerText || "").slice(0, 2500));
    report.flows.push({ flow: "network-degraded telemetry", has340: /340\s?ms/i.test(t), textExcerpt: t.slice(0, 400), consoleErrors });
    await page.close();
  }

  // ── FLOW 7: satellite-feed-loss — ghost mode map-only survival ──
  {
    const { page, consoleErrors } = await newPage();
    await gotoScene(page, "satellite-feed-loss");
    const m = await page.evaluate(() => ({
      canvas: document.querySelectorAll("canvas").length,
      svg: document.querySelectorAll("svg").length,
      mapLabels: Array.from(document.querySelectorAll("svg text, [class*=label]")).filter(e => e.offsetParent !== null).length,
      text: (document.body.innerText || "").slice(0, 300),
    }));
    report.flows.push({ flow: "satellite-loss ghost mode", ...m, consoleErrors });
    await page.close();
  }

} finally {
  await browser.close();
}

writeFileSync(join(outDir, "qa-flows-report.json"), JSON.stringify(report, null, 2));

for (const f of report.flows) {
  const errs = f.consoleErrors?.length ? ` ERRS:${f.consoleErrors.length}` : "";
  console.log(`── ${f.flow}${errs}`);
  for (const [k, v] of Object.entries(f)) {
    if (["flow", "consoleErrors"].includes(k)) continue;
    const s = typeof v === "string" ? v.replace(/\s+/g, " ").slice(0, 160) : JSON.stringify(v)?.slice(0, 200);
    console.log(`   ${k}: ${s}`);
  }
  if (f.consoleErrors?.length) console.log(`   errors: ${f.consoleErrors.slice(0, 3).join(" | ").slice(0, 300)}`);
}
console.log(`\nREPORT: ${join(outDir, "qa-flows-report.json")}`);
