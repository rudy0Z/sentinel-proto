/**
 * Render the authored World (src/app/map/world/world.ts) to a 1691x914 PNG.
 *
 * Spins up a static file server (Vite preview on the existing app), loads the
 * Three.js harness in headless Chromium, and screenshots the canvas after
 * the harness signals `data-ready="1"`.
 *
 * Output: src/assets/sentinel-map-overhaul.png (overwrite in place).
 * Backup: src/assets/sentinel-map-overhaul.bak.png (preserved across runs).
 *
 * Run via: npm run render:world
 */

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { resolve, extname, normalize } from "node:path";
import { chromium } from "playwright-core";

const ROOT = resolve(process.cwd());
const ASSET_DIR = resolve(ROOT, "src/assets");
const ASSET_PATH = resolve(ASSET_DIR, "sentinel-map-overhaul.png");
const BAK_PATH = resolve(ASSET_DIR, "sentinel-map-overhaul.bak.png");
const HARNESS_PATH = resolve(ROOT, "scripts/render-world-harness.html");

const PORT = 4317;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// ── MIME map for the static server ─────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".ts":   "application/javascript; charset=utf-8", // browser will ignore; we rely on native import
  ".tsx":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
};

// ── Static file server ─────────────────────────────────────────────────────
// Browsers can't import .ts directly without a transform layer. We rely on
// a Vite dev server instead — it handles the TS transform and serves
// node_modules paths (three.module.js) correctly. The server runs in the
// background until the screenshot is taken.
function startVite() {
  const isWin = process.platform === "win32";
  const proc = spawn(
    isWin ? "npx.cmd" : "npx",
    ["vite", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"],
    {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
      shell: isWin, // Git Bash / Windows: shell:true resolves .cmd shims
    },
  );
  return proc;
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url, { method: "HEAD" });
      if (r.ok || r.status === 404) return true;
    } catch (_) { /* keep polling */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

async function main() {
  // 1. Backup existing asset before we overwrite
  if (!existsSync(BAK_PATH) && existsSync(ASSET_PATH)) {
    mkdirSync(ASSET_DIR, { recursive: true });
    copyFileSync(ASSET_PATH, BAK_PATH);
    console.log(`[render-world] backed up existing asset → ${BAK_PATH}`);
  } else if (existsSync(BAK_PATH)) {
    console.log(`[render-world] backup already exists at ${BAK_PATH}`);
  }

  // 2. Start Vite dev server
  console.log(`[render-world] starting Vite on ${BASE_URL} …`);
  const vite = startVite();
  let viteOutput = "";
  vite.stdout.on("data", (d) => { viteOutput += d.toString(); });
  vite.stderr.on("data", (d) => { viteOutput += d.toString(); });

  try {
    await waitForServer(`${BASE_URL}/`, 30000);
    console.log("[render-world] server up");

    // 3. Launch headless Chromium with WebGL enabled
    const executableCandidates = [
      process.env.CHROME_PATH,
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ].filter(Boolean);
    const executablePath = executableCandidates.find((c) => existsSync(c));
    if (!executablePath) throw new Error("Chrome or Edge not found.");

    const browser = await chromium.launch({
      executablePath,
      headless: true,
      args: [
        "--no-first-run",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--use-gl=swiftshader",
      ],
    });

    // 4. Load the harness page (Vite serves it from /scripts/render-world-harness.html)
    const page = await browser.newPage({ viewport: { width: 1691, height: 914 } });
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log(`[browser:error] ${msg.text()}`);
    });
    page.on("pageerror", (err) => console.log(`[browser:pageerror] ${err.message}`));
    page.on("response", (r) => {
      if (r.status() >= 400) console.log(`[browser:${r.status()}] ${r.url()}`);
    });

    const harnessUrl = `${BASE_URL}/embed/sentinel/scripts/render-world-harness.html`;
    console.log(`[render-world] loading ${harnessUrl}`);

    // Poll for ready with retries: SwiftShader occasionally loses the WebGL
    // context mid-bake; a fresh page load usually succeeds.
    let statusText = null;
    for (let attempt = 1; attempt <= 3 && !statusText?.ready; attempt++) {
      if (attempt > 1) {
        console.log(`[render-world] retrying page load (attempt ${attempt})`);
      }
      await page.goto(harnessUrl, { waitUntil: "domcontentloaded" });
      const deadline = Date.now() + 300000;
      while (Date.now() < deadline) {
        statusText = await page.$eval("#status", (el) => ({
          text: el.textContent,
          ready: el.dataset.ready === "1",
          error: el.dataset.ready === "error",
        })).catch(() => null);
        if (statusText?.error) break;
        if (statusText?.ready) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (statusText?.error) console.log(`[render-world] attempt failed: ${statusText.text}`);
    }
    if (!statusText?.ready) {
      throw new Error(`harness not ready after 3 attempts: ${statusText?.text ?? "no status"}`);
    }
    console.log(`[render-world] harness ready: ${statusText.text}`);

    // 6. Extract the PNG data URL the harness built from readPixels.
    //    This bypasses canvas.toDataURL which races with the WebGL clear.
    await page.evaluate(() => {
      const s = document.getElementById("status");
      if (s) s.style.display = "none";
    });
    await page.waitForTimeout(200);
    const dataUrl = await page.$eval("#status", (el) => el.dataset.pngDataUrl);
    if (!dataUrl) throw new Error("harness did not produce pngDataUrl");
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const buf = Buffer.from(b64, "base64");
    const { writeFileSync } = await import("node:fs");
    writeFileSync(ASSET_PATH, buf);
    console.log(`[render-world] wrote ${ASSET_PATH} (${(buf.length / 1024).toFixed(1)}KB)`);

    await page.close();
    await browser.close();
  } finally {
    vite.kill("SIGTERM");
    // Windows: the spawn used shell:true, so kill()/tree-kill hits only the
    // cmd shim and orphans the real Vite. Kill whatever still listens on the
    // port instead — deterministic regardless of shim nesting.
    if (process.platform === "win32") {
      const { execSync } = await import("node:child_process");
      try {
        const out = execSync(
          `netstat -ano | findstr ":${PORT}" | findstr "LISTENING"`,
        ).toString();
        const pids = new Set(
          out.split("\n").map((l) => l.trim().split(/\s+/).pop()).filter(Boolean),
        );
        for (const pid of pids) {
          try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" }); } catch (_) {}
        }
      } catch (_) { /* nothing listening — already gone */ }
    }
    setTimeout(() => vite.kill("SIGKILL"), 1000);
  }
}

main().catch((err) => {
  console.error("[render-world] FAILED:", err.message);
  process.exit(1);
});
