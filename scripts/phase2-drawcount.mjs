/** TEMP runner — vite + headless chromium, reads the draw-call probe. */
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const PORT = 4319;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function startVite() {
  const isWin = process.platform === "win32";
  return spawn(isWin ? "npx.cmd" : "npx", ["vite", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], {
    cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], shell: isWin,
  });
}

async function waitForServer(url, timeoutMs = 40000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { const r = await fetch(url, { method: "HEAD" }); if (r.ok || r.status === 404) return true; } catch (_) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("vite did not start");
}

async function main() {
  const require = createRequire(ROOT + "/package.json");
  let chromium;
  try { chromium = require("playwright-core").chromium; }
  catch (_) { const mod = await import("playwright-core"); chromium = mod.chromium; }

  const vite = startVite();
  vite.stdout.on("data", () => {});
  vite.stderr.on("data", (d) => process.stderr.write(`[vite] ${d}`));
  try {
    await waitForServer(`${BASE_URL}/`);
    const candidates = [process.env.CHROME_PATH, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"].filter(Boolean);
    const executablePath = candidates.find((c) => existsSync(c));
    if (!executablePath) throw new Error("chrome not found");
    const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-first-run", "--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 1691, height: 914 } });
    page.on("pageerror", (e) => console.log(`[pageerror] ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") console.log(`[console.error] ${m.text()}`); });
    await page.goto(`${BASE_URL}/embed/sentinel/scripts/phase2-drawcount.html`, { waitUntil: "commit", timeout: 120000 });
    const deadline = Date.now() + 240000;
    let out = null;
    while (Date.now() < deadline) {
      out = await page.$eval("#status", (el) => ({ text: el.textContent, ready: el.dataset.ready, base: el.dataset.baseCalls, full: el.dataset.fullCalls, overlay: el.dataset.overlayCalls, baseTris: el.dataset.baseTris, fullTris: el.dataset.fullTris })).catch(() => null);
      if (out?.ready === "1" || out?.ready === "error") break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log("PROBE_RESULT " + JSON.stringify(out));
    await browser.close();
  } finally {
    vite.kill("SIGTERM");
    const { execSync } = await import("node:child_process");
    try {
      const o = execSync(`netstat -ano | findstr ":${PORT}" | findstr "LISTENING"`).toString();
      const pids = new Set(o.split("\n").map((l) => l.trim().split(/\s+/).pop()).filter(Boolean));
      for (const pid of pids) { try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" }); } catch (_) {} }
    } catch (_) {}
  }
}

main().catch((err) => { console.error("FAILED:", err.message); process.exit(1); });
