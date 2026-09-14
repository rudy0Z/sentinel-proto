import { chromium } from "playwright-core";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4190";
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

const SCENES = [
  "baseline", "alert-command", "investigation-pending", "verify-active",
  "authority-notification-ready", "contain-recommended", "contain-alternate",
  "contain-degraded", "rescue-nominal", "rescue-signal-degraded",
  "monitoring-contested", "talon-reraise", "rescue-battery-critical",
  "satellite-feed-loss", "infrastructure-total-loss", "network-degraded",
];

const report = { scenes: [], interactions: [], notes: [] };

async function newInstrumentedPage(w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message));
  return { page, consoleErrors };
}

async function sceneProbe(page, sceneId) {
  return page.evaluate((scene) => {
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));
    const visibleText = (document.body.innerText || "").slice(0, 4000);
    const orbi = $('[aria-label="TALON command bar"]');
    const chips = $$("button").filter(b => b.offsetParent !== null).map(b => (b.innerText || b.getAttribute("aria-label") || "").trim().slice(0, 60)).filter(t => t.length > 0 && t.length < 80);
    return {
      scene,
      hasCommandBar: !!orbi,
      visibleButtons: chips.slice(0, 25),
      keyboardFocusables: $$('button, [role="button"], input, select, a[href]').filter(e => e.offsetParent !== null).length,
      modalOpen: $$('[aria-modal="true"]').length,
      bodyTextLen: (document.body.innerText || "").length,
      hasTalonSession: !!$('[class*="talon"], [data-talon]') || visibleText.includes("TALON"),
      hasOverrideUI: visibleText.includes("override") || visibleText.includes("Override"),
      hasReviewDock: !!$('[aria-label="Prototype review dock"]'),
      hasExplore: visibleText.includes("EXPLORE") || visibleText.includes("Explore"),
      canvasCount: $$("canvas").length,
      svgCount: $$("svg").length,
      degradedBannerVisible: /degraded|DEGRADED|exception|Exception/.test(visibleText.slice(0, 800)),
      snapshot: visibleText.slice(0, 500),
    };
  }, sceneId);
}

try {
  // ── Phase 1: scene sweep at 1600x900 ─────────────────────────────────
  for (const scene of SCENES) {
    const { page, consoleErrors } = await newInstrumentedPage(1600, 900);
    const url = `${baseUrl}/#/?scene=${scene}`;
    try {
      await page.goto(url, { waitUntil: "commit", timeout: 20000 });
      await page.locator('[aria-label="TALON command bar"]').first().waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(600);
      const probe = await sceneProbe(page, scene);
      report.scenes.push({ ...probe, url, consoleErrors });
    } catch (e) {
      report.scenes.push({ scene, url, error: e.message.split("\n")[0], consoleErrors });
    } finally {
      await page.close();
    }
  }

  // ── Phase 2: viewports on key scenes (overflow + responsive) ────────
  const vp = [];
  for (const [scene, w, h] of [
    ["baseline", 1280, 800], ["baseline", 390, 844],
    ["contain-recommended", 390, 844], ["authority-notification-ready", 1280, 800],
    ["talon-reraise", 390, 844], ["network-degraded", 390, 844],
  ]) {
    const { page, consoleErrors } = await newInstrumentedPage(w, h);
    try {
      await page.goto(`${baseUrl}/#/?scene=${scene}`, { waitUntil: "commit", timeout: 20000 });
      await page.locator('[aria-label="TALON command bar"]').first().waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(500);
      const m = await page.evaluate(() => ({
        w: innerWidth,
        docW: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        hOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
      }));
      vp.push({ scene, w, h, ...m, consoleErrors });
    } catch (e) {
      vp.push({ scene, w, h, error: e.message.split("\n")[0], consoleErrors });
    } finally { await page.close(); }
  }
  report.viewports = vp;

  // ── Phase 3: interactions ────────────────────────────────────────────
  // 3a. Chip → authored answer (baseline)
  {
    const { page, consoleErrors } = await newInstrumentedPage(1600, 900);
    await page.goto(`${baseUrl}/#/?scene=baseline`, { waitUntil: "commit", timeout: 20000 });
    await page.locator('[aria-label="TALON command bar"]').first().waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(800);
    const chips = page.locator("button", { hasText: /What|Why|How|wind|drone|zone|fire/i });
    const n = await chips.count();
    let chipResult = { attempted: false, chipsFound: n, clickedText: null, answer: null };
    if (n > 0) {
      const first = chips.first();
      chipResult.attempted = true;
      chipResult.clickedText = await first.innerText().catch(() => null);
      await first.click();
      await page.waitForTimeout(1200);
      chipResult.answer = await page.evaluate(() => (document.body.innerText || "").slice(0, 3000));
    }
    report.interactions.push({ name: "suggested-question chip", scene: "baseline", ...chipResult, consoleErrors });
    await page.close();
  }

  // 3b. EXPLORE 3D toggle (contain-recommended — ops scene with 3D)
  {
    const { page, consoleErrors } = await newInstrumentedPage(1600, 900);
    await page.goto(`${baseUrl}/#/?scene=contain-recommended`, { waitUntil: "commit", timeout: 20000 });
    await page.locator('[aria-label="TALON command bar"]').first().waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(1000);
    const before = await page.evaluate(() => ({
      canvas: document.querySelectorAll("canvas").length,
      text: (document.body.innerText || "").slice(0, 200),
    }));
    const btn = page.locator('button', { hasText: /EXPLORE|Explore/i }).first();
    const btnCount = await btn.count();
    let after = null, hudText = null;
    if (btnCount > 0) {
      await btn.click();
      await page.waitForTimeout(2500);
      after = await page.evaluate(() => ({
        canvas: document.querySelectorAll("canvas").length,
        text: (document.body.innerText || "").slice(0, 200),
      }));
      hudText = await page.evaluate(() => {
        const m = (document.body.innerText || "").match(/\d+ FPS\s*[·:]?\s*\d+ CALLS\s*[·:]?\s*\d+K? ?TRIS/i);
        return m ? m[0] : null;
      });
    }
    report.interactions.push({ name: "EXPLORE 3D toggle", scene: "contain-recommended", btnCount, before, after, hudText, consoleErrors });
    await page.close();
  }

  // 3c. Gate flow: authority-notification-ready → PIN entry (human send gate)
  {
    const { page, consoleErrors } = await newInstrumentedPage(1600, 900);
    await page.goto(`${baseUrl}/#/?scene=authority-notification-ready`, { waitUntil: "commit", timeout: 20000 });
    await page.locator('[aria-label="TALON command bar"]').first().waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(800);
    const pre = await page.evaluate(() => (document.body.innerText || "").slice(0, 1200));
    // Find and click the send/authorize action
    const act = page.locator('button', { hasText: /Send|Notify|Authorize|Dispatch|Confirm/i }).first();
    const actCount = await act.count();
    let post = null, modalText = null;
    if (actCount > 0) {
      await act.first().click();
      await page.waitForTimeout(1200);
      post = await page.evaluate(() => (document.body.innerText || "").slice(0, 1200));
      modalText = await page.evaluate(() => {
        const modal = document.querySelector('[aria-modal="true"]');
        return modal ? modal.innerText.slice(0, 400) : null;
      });
    }
    report.interactions.push({ name: "human gate (send/authorize)", scene: "authority-notification-ready", actCount, pre: pre.slice(0, 300), post: post?.slice(0, 300), modalText, consoleErrors });
    await page.close();
  }

  // 3d. Override / dissent flow (monitoring-contested)
  {
    const { page, consoleErrors } = await newInstrumentedPage(1600, 900);
    await page.goto(`${baseUrl}/#/?scene=monitoring-contested`, { waitUntil: "commit", timeout: 20000 });
    await page.locator('[aria-label="TALON command bar"]').first(). waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(800);
    const pre = await page.evaluate(() => (document.body.innerText || "").slice(0, 1500));
    const over = page.locator('button', { hasText: /Override|Decline|Reject|Hold|Disagree|overrule/i });
    const overCount = await over.count();
    let post = null, reasonModal = null;
    if (overCount > 0) {
      await over.first().click();
      await page.waitForTimeout(1000);
      post = await page.evaluate(() => (document.body.innerText || "").slice(0, 1500));
      reasonModal = await page.evaluate(() => {
        const modal = document.querySelector('[aria-modal="true"]');
        return modal ? modal.innerText.slice(0, 400) : null;
      });
    }
    report.interactions.push({ name: "dissent/override", scene: "monitoring-sc contested", actCount: overCount, pre: pre.slice(0, 300), post: post?.slice(0, 300), reasonModal, consoleErrors });
    await page.close();
  }

  // 3e. Review Dock scene switcher (embed reviewer surface)
  {
    const { page, consoleErrors } = await newInstrumentedPage(1600, 900);
    await page.goto(`${baseUrl}/embed/sentinel/#/?scene=baseline`, { waitUntil: "commit", timeout: 20000 });
    await page.locator('[aria-label="TTALON command bar"], [aria-label="TALON command bar"]').first().waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(800);
    const dock = await page.evaluate(() => {
      const d = document.querySelector('[aria-label="Prototype review dock"]');
      return d ? d.innerText.slice(0, 600) : null;
    });
    report.interactions.push({ name: "embed + review dock", scene: "embed/baseline", dock, consoleErrors });
    await page.close();
  }

  // ── Phase 4: design-system + components pages (support surfaces) ────
  const support = [];
  for (const [route, w, h] of [["/components", 1600, 900], ["/design-system", 1600, 900]]) {
    const { page, consoleErrors } = await newInstrumentedPage(w, h);
    try {
      await page.goto(`${baseUrl}/#${route}`, { waitUntil: "commit", timeout: 20000 });
      await page.waitForTimeout(1200);
      const m = await page.evaluate(() => ({
        title: document.title,
        textLen: (document.body.innerText || "").length,
        docW: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        hOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
      }));
      support.push({ route, ...m, consoleErrors });
    } catch (e) {
      support.push({ route, error: e.message.split("\n")[0], consoleErrors });
    } finally { await page.close(); }
  }
  report.support = support;

} finally {
  await browser.close();
}

writeFileSync(join(outDir, "qa-report.json"), JSON.stringify(report, null, 2));

// ── Summary ────────────────────────────────────────────────────────────
const sceneErrors = report.scenes.filter(s => s.consoleErrors?.length || s.error);
const overflow = (report.viewports || []).filter(v => v.hOverflow);
console.log("=== SCENE SWEEP (16 scenes @ 1600x900) ===");
console.log(`scenes ok: ${report.scenes.filter(s => !s.error).length}/16`);
for (const s of report.scenes) {
  if (s.error) console.log(`  LOAD-FAIL ${s.scene}: ${s.error}`);
  else if (s.consoleErrors.length) console.log(`  CONSOLE-ERR ${s.scene}: ${s.consoleErrors.slice(0, 2).join(" | ").slice(0, 160)}`);
}
console.log("=== VIEWPORTS ===");
for (const v of report.viewports || []) console.log(`  ${v.scene} @${v.w}: overflow=${v.hOverflow} docW=${v.docW} ${v.error ? v.error : ""}`);
console.log("=== INTERACTIONS ===");
for (const i of report.interactions) console.log(`  ${i.name} [${i.scene}]: ${JSON.stringify({ attempted: i.attempted ?? i.actCount ?? i.btnCount, ...(i.hudText ? { hud: i.hudText } : {}), ...(i.modalText || i.reasonModal ? { modal: (i.modalText || i.reasonModal || "").slice(0, 80) } : {}), errs: i.consoleErrors?.length || 0 })}`);
console.log("=== SUPPORT PAGES ===");
for (const s of report.support) console.log(`  ${s.route}: textLen=${s.textLen} overflow=${s.hOverflow} errs=${(s.consoleErrors || []).length} ${s.error || ""}`);
console.log(`REPORT: ${join(outDir, "qa-report.json")}`);
