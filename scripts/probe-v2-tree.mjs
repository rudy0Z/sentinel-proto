import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
const candidates = [process.env.CHROME_PATH, "C:\Program Files\Google\Chrome\Application\chrome.exe", "C:\Program Files (x86)\Google\Chrome\Application\msedge.exe", "C:\Program Files\Microsoft\Edge\Application\msedge.exe"].filter(Boolean);
const browser = await chromium.launch({ executablePath: candidates.find((c) => existsSync(c)), headless: true, args: ["--no-first-run"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
await page.goto("http://localhost:4190/embed/sentinel/#/?scene=authority-notification-ready&layout=v2&stagedTtlMs=0", { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const tree = await page.evaluate(() => {
  const deck = document.querySelector('[data-deck="true"]');
  const walk = (node, depth) => {
    if (!node || depth > 3) return null;
    const r = node.getBoundingClientRect();
    return {
      tag: node.tagName, text: (node.textContent || "").slice(0, 40),
      w: Math.round(r.width), h: Math.round(r.height),
      kids: [...node.children].map((c) => walk(c, depth + 1)),
    };
  };
  return [...deck.children].map((c) => walk(c, 1));
});
console.log(JSON.stringify(tree, null, 1).slice(0, 3000));
const tab = document ? null : null;
const tabInfo = await page.evaluate(() => {
  const t = document.querySelector('[data-spine-tab="true"]');
  const span = t.querySelector("span:last-child");
  const r = t.getBoundingClientRect();
  return { tabH: Math.round(r.height), tabW: Math.round(r.width), label: t.getAttribute("aria-label"), spanW: Math.round(span.getBoundingClientRect().width) };
});
console.log("TAB:", JSON.stringify(tabInfo));
console.log("ERRORS:", errors.length ? errors : "none");
await browser.close();
