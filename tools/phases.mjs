// Screenshots every phase of a situation and reports draw calls (main + feed) per phase.
// node tools/phases.mjs [situation] [lighting]
import { launch } from './browser.mjs';
import { serve } from './serve.mjs';
import { mkdirSync } from 'node:fs';
const [sit = 'wui-breakout', light = 'night'] = process.argv.slice(2);
const server = await serve(8134);
const browser = await launch();
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`http://127.0.0.1:8134/harness.html?situation=${sit}&lighting=${light}`, { waitUntil: 'load' });
await page.waitForFunction('window.player', { timeout: 90000 });
mkdirSync('qa', { recursive: true });
const n = await page.evaluate(() => player.situation.phases.length);
for (let i = 0; i < n; i++) {
  await page.evaluate((i) => player.setPhase(i, 0), i);
  await new Promise((r) => setTimeout(r, 2500));
  const id = await page.evaluate(() => player.getState().phase.id);
  await page.screenshot({ path: `qa/${sit}-${light}-${id}.png` });
  const m = await page.evaluate(async () => {
    const main = engine.getMetrics().main.drawCalls;
    const had = !!engine.pip;
    if (!had) try { engine.openDronePip(player.situation.meta.feedDrone); } catch {}
    await new Promise((r) => setTimeout(r, 900));
    const all = engine.getMetrics();
    if (!had) engine.closeDronePip();
    return { main, withFeed: all.drawCalls, layers: engine.getOverlayLayerIds().length, stats: engine.getFieldStats() };
  });
  console.log(id, JSON.stringify(m));
}
console.log(logs.join('\n'));
await browser.close();
server.close();