/**
 * Map alignment audit — measures the drift between the basemap <img>
 * (objectFit: cover) and the SVG overlay (viewBox 1440x900, preserveAspectRatio
 * default = xMidYMid meet) for every zone center and a sample of road nodes.
 *
 * Both layers sit in the same container, but they scale the authored content
 * differently. This script computes, for the REAL container rect at several
 * viewports, the on-screen position of each zone center under (a) the cover
 * mapping and (b) the meet mapping, and reports the pixel drift.
 */
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

const executableCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(existsSync);
const browser = await chromium.launch({ executablePath: executableCandidates[0], headless: true });

// zone centers in NATIVE pixel space (from mockData ZONES, mapped by fromPixel)
const ZONE_CENTERS_NATIVE = {
  "forest-north": { x: 900, y: 190 },
  "buffer-west": { x: 330, y: 430 },
  "buffer-east": { x: 1240, y: 420 },
  "residential-west": { x: 420, y: 700 },
  "residential-south": { x: 880, y: 760 },
};
const NATIVE = { w: 1691, h: 914 };
const VIEWBOX = { w: 1440, h: 900 };

function measure(vw, vh, scene, imgNative) {
  // container = the map lane. Measured live below; these are computed after.
  return { vw, vh, scene, imgNative };
}

const results = [];
for (const [vw, vh] of [[1600, 900], [1280, 800], [1920, 1080]]) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  for (const [scene, img] of [
    ["contain-recommended", { w: 1691, h: 914, name: "overhaul 1.85:1" }],
    ["baseline", { w: 1024, h: 1024, name: "preincident 1:1 (jpeg)" }],
  ]) {
    await page.goto(`http://localhost:4190/embed/sentinel/#/?scene=${scene}&core=1`, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    const rect = await page.evaluate(() => {
      const el = document.querySelector('[data-map-runtime="spatial-os"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    if (!rect) { console.log("no map container at", vw, scene); continue; }

    // IMG mapping: objectFit cover
    const scaleImg = Math.max(rect.w / img.w, rect.h / img.h);
    const visibleW = rect.w / scaleImg, visibleH = rect.h / scaleImg;
    const cropX = (img.w - visibleW) / 2, cropY = (img.h - visibleH) / 2;

    // SVG mapping: viewBox 1440x900, preserveAspectRatio xMidYMid meet (default)
    const scaleSvg = Math.min(rect.w / VIEWBOX.w, rect.h / VIEWBOX.h);
    const svgW = VIEWBOX.w * scaleSvg, svgH = VIEWBOX.h * scaleSvg;
    const offX = (rect.w - svgW) / 2, offY = (rect.h - svgH) / 2;

    let worst = { d: 0 };
    const rows = [];
    for (const [id, c] of Object.entries(ZONE_CENTERS_NATIVE)) {
      const u = c.x / NATIVE.w, v = c.y / NATIVE.h;
      // where the IMAGE puts this normalized point on screen
      const ix = (u * img.w - cropX) * scaleImg;
      const iy = (v * img.h - cropY) * scaleImg;
      // where the SVG OVERLAY puts it on screen
      const sx = offX + u * svgW;
      const sy = offY + v * svgH;
      const d = Math.hypot(ix - sx, iy - sy);
      if (d > worst.d) worst = { d, id };
      rows.push(`${id}: img(${ix.toFixed(0)},${iy.toFixed(0)}) svg(${sx.toFixed(0)},${sy.toFixed(0)}) drift ${d.toFixed(0)}px`);
    }
    results.push({ vw, vh, scene, img: img.name, rect: `${rect.w.toFixed(0)}x${rect.h.toFixed(0)}`, aspect: (rect.w / rect.h).toFixed(3), cropX: cropX.toFixed(0), cropY: cropY.toFixed(0), worst: `${worst.id} ${worst.d.toFixed(0)}px`, rows });
    console.log(`\n=== ${vw}x${vh} · ${scene} · ${img.name} · lane ${rect.w.toFixed(0)}x${rect.h.toFixed(0)} (aspect ${rect.w / rect.h < 1 ? "" : ""}${(rect.w / rect.h).toFixed(3)}) ===`);
    console.log(`img cover crop: left/right ${cropX.toFixed(0)}px, top/bottom ${cropY.toFixed(0)}px (native px)`);
    console.log(`svg meet letterbox: ${offX.toFixed(0)},${offY.toFixed(0)}px`);
    for (const r of rows) console.log("  " + r);
    await page.screenshot({ path: `verification-artifacts/audit-captures/map-align-${scene}-${vw}.png` });
  }
  await page.close();
}
await browser.close();
