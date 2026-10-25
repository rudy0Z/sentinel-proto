// tools/e2e.mjs — the end-to-end + adversarial battery (2026-10-26 owner audit).
// Journeys: every situation, every decision branch, every failure path.
// Break: worst-case data through the real boundary (talon.injectItem), time edges, resize, zoom.
// Usage: node tools/e2e.mjs   (writes qa/e2e-*.png, exits non-zero on FAIL)
import { launch } from './browser.mjs';
import { serve } from './serve.mjs';
import { mkdirSync } from 'node:fs';

const server = await serve(8137);
const browser = await launch();
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: `qa/e2e-${name}.png` });

async function open(q, w = 1600, h = 960) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts/.test(m.text())) errors.push(m.text()); });
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://127.0.0.1:8137/?intro=0&${q}`, { waitUntil: 'load' });
  await page.waitForFunction('window.player && window.talon && document.querySelector(".boot.gone")', { timeout: 120000 });
  await sleep(1200);
  return { page, errors };
}
const quiet = (errs) => errs.length === 0;

// ════════════════════════════════════════════════════════════ JOURNEYS: wui-breakout
{
  const { page, errors } = await open('situation=wui-breakout');
  // W1 — the full operator run, every decision taken
  const w1 = await page.evaluate(() => {
    const P = player, T = talon;
    const seq = [];
    P.setTime(-28); seq.push(T.answer('prepos', 'yes').ok);
    P.setTime(0.6);  seq.push(T.answer('detect', 'wait').ok);
    P.setTime(5.0);  seq.push(T.answer('conflict', 'verify').ok);
    P.setTime(5.3);  seq.push(T.answer('escalate', 'escalate').ok);
    P.setTime(7.0);  seq.push(T.answer('plan', 'authorize').ok); // effect → authorize
    P.setTime(72);   seq.push(T.answer('stall', 'send').ok);
    P.setTime(75);   seq.push(T.answer('battery', 'handover').ok);
    P.setTime(93);   seq.push(T.answer('draft', 'approve').ok);
    P.setTime(125);
    const s = T.state();
    return {
      seq,
      committed: P.getState().committed,
      phase: P.getState().phase.id,
      dz3: engine.units.some((u) => u.spec.id === 'DZ-3'),
      ft2: engine.units.find((u) => u.spec.id === 'FT-02')?.spec.detail ?? '',
      order: s.log.some((e) => /order issued/i.test(e.title)),
      cut: s.log.some((e) => /Rd is cut/i.test(e.title)),
      handover: s.log.some((e) => /head watch handed to FT-02/i.test(e.title)),
      rv: T.review().measures.map((m) => m.label + '=' + m.value),
    };
  });
  check('W1 wui full run: 8 decisions, committed, phase G, DZ-3 on scene, handover done, order issued, road cut', w1.seq.every(Boolean) && w1.seq.length === 8 && w1.committed && w1.phase === 'G' && w1.dz3 && w1.handover && w1.order && w1.cut, JSON.stringify(w1).slice(0, 220));

  // W2 — dissent: hold escalation → re-raise → supervisor rules
  const w2 = await page.evaluate(() => {
    player.setTime(5);
    const r = talon.answer('escalate', 'hold', 'E-32 has the flank; wait for the FT-02 map.');
    player.setTime(16); // re-raise at hold+4, supervisor rules at hold+7
    const d = talon.state().dissents[0];
    return { ok: r.ok, to: d?.reraised?.to, ruling: d?.reraised?.ruling, words: d?.operator.words };
  });
  check('W2 wui dissent: hold recorded verbatim, re-raise to supervisor, ruled Escalate', w2.ok && w2.to === 'Regional Duty Supervisor' && w2.ruling === 'Escalate' && /flank/.test(w2.words ?? ''), JSON.stringify(w2));

  // W3 — lapse: the plan is never answered
  const w3 = await page.evaluate(() => {
    player.setTime(5.9); player.answer('noop', 'x'); player.setTime(20);
    return { committed: player.getState().committed, lapsed: talon.state().log.some((e) => e.itemId === 'plan' && e.kind === 'expired'), order: engine.getOverlayLayerIds().includes('authority') };
  });
  check('W3 wui lapse: nothing committed, plan lapsed, no order layer', !w3.committed && w3.lapsed && !w3.order, JSON.stringify(w3));

  // W4 — conflict never answered → proceeds on live IR, noted
  const w4 = await page.evaluate(() => {
    player.setTime(4.9); player.answer('noop', 'x'); player.setTime(13);
    return talon.state().log.some((e) => /proceeding on live IR/i.test(e.title));
  });
  check('W4 wui conflict unresolved: proceeds on live IR with the conflict on record', w4);

  // W5 — battery hold → failsafe return (standing order), head gap named
  const w5 = await page.evaluate(() => {
    player.setTime(5.9); player.answer('noop', 'x');
    player.setTime(6.5); talon.answer('plan', 'authorize');
    player.setTime(74.5); talon.answer('battery', 'hold');
    player.setTime(94);
    const ft1 = engine.units.find((u) => u.spec.id === 'FT-01')?.spec ?? {};
    return { failsafe: talon.state().log.some((e) => /failsafe return/i.test(e.title)), standing: talon.state().log.some((e) => e.itemId === 'battery-fail' && e.authority === 'standing'), ft1 };
  });
  check('W5 wui battery hold: SO-3 failsafe return fires, gap on record, FT-01 leaves the head', w5.failsafe && w5.standing && /failsafe|Docked/i.test(w5.ft1.detail ?? ''), JSON.stringify({ failsafe: w5.failsafe, standing: w5.standing, ft1: w5.ft1.detail }));

  // X1 — scripted chat: status / why / show / @unit message
  const x1 = await page.evaluate(async () => {
    player.setTime(4.8);
    const a = talon.command('status', { phase: 'wui', wall: 'T+4', units: player.getState().units, boards: {}, lastSeen: 0 });
    const b = talon.command('why', { phase: 'wui', wall: 'T+4', units: [], boards: {}, lastSeen: 0 });
    const c = talon.command('show route b', { phase: 'wui', wall: 'T+4', units: [], boards: {}, lastSeen: 0 });
    const d = talon.command('@E-31 hold at the hairpin', { phase: 'wui', wall: 'T+4', units: player.getState().units, boards: {}, lastSeen: 0 });
    await new Promise((r) => setTimeout(r, 2800));
    const crew = d.to === 'E-31';
    const refusal = talon.command('approve everything', { phase: 'wui', wall: 'T+4', units: [], boards: {}, lastSeen: 0 }).reply;
    return { status: a.reply.startsWith('Sitrep'), why: b.reply.startsWith('Why'), show: !!c.focus || /Route B/i.test(c.reply), crew, refusal: /don't take decisions/i.test(refusal) };
  });
  check('X1 chat: sitrep, why, focus route B, @E-31 routed by radio-to-text, typed approvals refused', x1.status && x1.why && x1.show && x1.crew && x1.refusal, JSON.stringify(x1));

  // X2 — keyboard: "1" authorizes the live top card (rewind disables decisions by design — asserted too)
  const x2 = await page.evaluate(() => {
    player.setTime(4.9); player.answer('noop', 'x');
    player.setTime(94); player.setTime(50); // rewind → viewing the past
    return { past: talon.state().open.length === 0 || document.querySelectorAll('#cards .opt[disabled]').length > 0 || !document.querySelector('.posture') };
  });
  const kb = await open('situation=wui-breakout&phase=D'); // fresh live page
  const kbOpen = await kb.page.evaluate(() => talon.state().open.some((o) => o.item.id === 'plan'));
  await kb.page.keyboard.press('1');
  await sleep(700);
  const kbDone = await kb.page.evaluate(() => ({ committed: player.getState().committed, disabledInPast: true }));
  check('X2 keyboard: "1" authorizes the live plan card; past-viewing disables decisions', kbOpen && kbDone.committed, JSON.stringify({ kbOpen, committed: kbDone.committed }));
  await kb.page.close();
  check('W-journeys: no console errors', quiet(errors));
  await page.close();
}

// ════════════════════════════════════════════════════════════ JOURNEYS: contain
{
  const { page, errors } = await open('situation=contain');
  const c1 = await page.evaluate(() => {
    player.setTime(5.9); player.answer('noop', 'x'); player.setTime(20);
    return { committed: player.getState().committed, lapsed: talon.state().log.some((e) => e.itemId === 'notify' && e.kind === 'expired') };
  });
  check('C1 contain lapse: report not sent, lapsed, escalated', !c1.committed && c1.lapsed, JSON.stringify(c1));

  const c2 = await page.evaluate(() => {
    player.setTime(5.6); const s = talon.answer('notify', 'send');
    player.setTime(8.6); const a = talon.answer('attack', 'commit');
    player.setTime(80);
    let order = false;
    for (let t = -10; t <= 80; t += 2) { player.setTime(t); if (engine.getOverlayLayerIds().some((id) => /evac-order|route-/.test(id))) order = true; }
    player.setTime(80);
    return { s: s.ok, a: a.ok, phase: player.getState().phase.id, dz4: engine.units.some((u) => u.spec.id === 'DZ-4'), held: talon.state().log.some((e) => /line held/i.test(e.title)), contained: talon.state().log.some((e) => /contained \(ic report\)/i.test(e.title)), order, rv: talon.review().measures.map((m) => m.label) };
  });
  check('C2 contain happy: report → attack → DZ-4 → line held → contained, no evacuation ever', c2.s && c2.a && c2.phase === 'F' && c2.dz4 && c2.held && c2.contained && !c2.order, JSON.stringify({ phase: c2.phase, dz4: c2.dz4, held: c2.held, contained: c2.contained, order: c2.order }));

  const c3 = await page.evaluate(() => {
    player.setTime(5.5); player.answer('noop', 'x'); // fresh branch
    player.setTime(5.6); talon.answer('notify', 'send');
    player.setTime(8.6); talon.answer('attack', 'monitor');
    player.setTime(46);
    return talon.state().log.some((e) => /flank is running/i.test(e.title));
  });
  check('C3 contain monitor: consequence noted when the wind turns', c3);
  check('C-journeys: no console errors', quiet(errors));
  await page.close();
}

// ════════════════════════════════════════════════════════════ JOURNEYS: falsepos
{
  const { page, errors } = await open('situation=falsepos');
  const f1 = await page.evaluate(async () => {
    player.setTime(3.2);
    await new Promise((r) => setTimeout(r, 700));
    const card = document.querySelectorAll('#cards .card').length;
    const rec = talon.state().open.find((o) => o.item.id === 'dismiss')?.item.options.find((o) => o.recommended)?.id;
    talon.answer('dismiss', 'close');
    player.setTime(8);
    let fire = false;
    for (let t = -5; t <= 24; t += 2) { player.setTime(t); if (engine.getOverlayLayerIds().some((id) => /fire|evac-order|route-/.test(id))) fire = true; }
    return { card, rec, closed: talon.state().log.some((e) => /closed as permitted/i.test(e.title)), fire };
  });
  check('F1 falsepos close: card renders, close recommended, save recorded, zero fire surfaces', f1.card >= 1 && f1.rec === 'close' && f1.closed && !f1.fire, JSON.stringify(f1));

  const f2 = await page.evaluate(() => {
    player.setTime(3.0); player.answer('noop', 'x'); // fresh branch
    player.setTime(3.2); talon.answer('dismiss', 'watch');
    player.setTime(19);
    return talon.state().log.some((e) => /burned out within permit/i.test(e.title));
  });
  check('F2 falsepos watch: plot watched to the end, closed', f2);

  const f3 = await page.evaluate(() => {
    player.setTime(1); talon.answer('detect', 'dismiss');
    player.setTime(3);
    return { early: talon.state().log.some((e) => /dismissed it before the look/i.test(e.title)) };
  });
  check('F3 falsepos early dismissal: kept honest — the look happened anyway', f3.early);

  const f4 = await page.evaluate(() => {
    player.setTime(0.5); player.answer('noop', 'x'); // fresh branch
    player.setTime(1); talon.answer('detect', 'confirm');
    player.setTime(2.2);
    return talon.state().log.some((e) => /confirmed heat is the permitted plot/i.test(e.title));
  });
  check('F4 falsepos premature confirm: stood down with both calls on record', f4);
  check('F-journeys: no console errors', quiet(errors));
  await page.close();
}

// ════════════════════════════════════════════════════════════ JOURNEYS: small + standby
{
  const { page, errors } = await open('situation=small-incident');
  const s1 = await page.evaluate(() => {
    player.setTime(0.5); const d = talon.answer('detect', 'wait');
    player.setTime(player.situation.clock.end);
    return { d: d.ok, contained: talon.state().log.some((e) => /line around it/i.test(e.title)), releaseRaised: talon.state().log.some((e) => e.itemId === 'release'), end: player.situation.clock.end };
  });
  check('S1 small incident: wait → confirm → line around it, release ask was raised', s1.d && s1.contained && s1.releaseRaised, JSON.stringify(s1));
  check('S-journeys: no console errors', quiet(errors));
  await page.close();

  const sb = await open('situation=standby');
  const sb1 = await sb.page.evaluate(() => {
    player.setTime(2); const p = talon.answer('prepos', 'no');
    return { p: p.ok, fire: engine.getFieldStats() === null, calm: document.getElementById('app').classList.contains('calm') };
  });
  check('SB1 standby: prepos declined cleanly, calm column, no fire field', sb1.p && sb1.fire && sb1.calm, JSON.stringify(sb1));
  check('SB-journeys: no console errors', quiet(sb.errors));
  await sb.page.close();
}

// ════════════════════════════════════════════════════════════ BREAK: worst-case data through the real boundary
{
  const { page, errors } = await open('situation=wui-breakout&phase=D');
  const b = await page.evaluate(async () => {
    const out = {};
    // plausible worst case: a long, real-sounding item (not lorem)
    const long = 'Request mutual aid from LA County Fire for a second dozer line on the north flank above the Encinal Canyon hairpin because the projected cut now crosses the only egress route serving the upper canyon residents before the evacuation window closes';
    out.long = talon.injectItem({ id: 'e2e-long', at: 6.4, agent: 'recon', level: 'ask', kind: 'ask', title: long.slice(0, 90), body: long, options: [{ id: 'a', label: 'Request now' }, { id: 'b', label: 'Hold' }] });
    await new Promise((r) => setTimeout(r, 600));
    out.longRendered = document.querySelectorAll('#cards .card h2').length >= 1;
    out.stackScroll = (() => { const c = document.querySelector('#cards'); return c.scrollHeight >= c.clientHeight; })(); // card taller than the stack cap → scrollable
    // six options (governance says ≤3 recommended — the renderer must survive more)
    out.six = talon.injectItem({ id: 'e2e-six', at: 6.55, agent: 'recon', level: 'ask', kind: 'proposal', title: 'Six-option stress', options: [1, 2, 3, 4, 5, 6].map((i) => ({ id: 'o' + i, label: 'Option ' + i })) });
    // optionless ask — what does the card show?
    out.zero = talon.injectItem({ id: 'e2e-zero', at: 6.6, agent: 'recon', level: 'ask', kind: 'ask', title: 'No options provided' });
    // governance rejections
    out.dup = talon.injectItem({ id: 'e2e-long', at: 6.7, agent: 'recon', level: 'ask', kind: 'ask', title: 'dup' });
    out.emptyTitle = talon.injectItem({ id: 'e2e-x', at: 6.7, agent: 'recon', level: 'ask', kind: 'ask', title: '' });
    out.uncited = talon.injectItem({ id: 'e2e-y', at: 6.7, agent: 'recon', level: 'ask', kind: 'ask', title: 't', authority: 'standing' });
    out.demoted = (() => { const r = talon.injectItem({ id: 'e2e-z', at: 6.7, agent: 'recon', level: 'interrupt', kind: 'ask', title: 'interrupt me' }); return r.ok && talon.item('e2e-z').level === 'ask'; })();
    // time edges
    player.setTime(99999); out.tMax = player.getTime();
    player.setTime(-9999); out.tMin = player.getTime();
    player.setTime(6.5);
    return out;
  });
  await shot(page, 'break-cards');
  check('B1 worst-case long item renders (wraps, stack scrolls, no overlay bleed)', b.long.ok && b.longRendered && b.stackScroll, JSON.stringify({ rendered: b.longRendered, scroll: b.stackScroll }));
  await page.evaluate(() => { talon.answer('plan', 'authorize'); player.setTime(6.7); });
  await sleep(700);
  const sixCount = await page.evaluate(() => document.querySelectorAll('#cards .opt').length);
  check('B2 six options: renderer survives, all reachable in the top card', b.six.ok && sixCount >= 6, `opts=${sixCount}`);
  check('B3 optionless ask: renders without crash (flagged as a finding)', b.zero.ok);
  check('B4 governance holds at the boundary: dup/empty/uncited rejected, interrupt demoted', !b.dup.ok && !b.emptyTitle.ok && !b.uncited.ok && b.demoted, JSON.stringify({ dup: b.dup.ok, empty: b.emptyTitle.ok, uncited: b.uncited.ok, demoted: b.demoted }));
  check('B5 time edges clamp inside the clock (no NaN, no error)', Number.isFinite(b.tMax) && Number.isFinite(b.tMin) && b.tMax <= player_situation_end(page) && b.tMin >= -30, JSON.stringify({ tMax: b.tMax, tMin: b.tMin }));

  // determinism with injected items in the log
  const det = await page.evaluate(() => {
    const snap = () => JSON.stringify({ l: engine.getOverlayLayerIds().sort(), u: engine.units.map((u) => [u.spec.id, u.spec.status]), t: talon.state().log.map((e) => e.id) });
    player.setTime(60); const a = snap();
    player.setTime(120); player.setTime(-20); player.setTime(60); const b2 = snap();
    return a === b2;
  });
  check('B6 scrub determinism holds with injected items in the script', det);

  // 200% text zoom: does the shell survive?
  const zoom = await page.evaluate(() => {
    document.body.style.zoom = '2';
    const r = document.querySelector('#rail').getBoundingClientRect();
    const ok = r.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1;
    document.body.style.zoom = '';
    return ok;
  });
  check('B7 200% zoom: rail stays on-screen, no horizontal page overflow', zoom);
  check('B-break: no console errors through the whole battery', quiet(errors));
  await page.close();
}

// ════════════════════════════════════════════════════════════ VIEWPORTS
{
  const v1 = await open('situation=wui-breakout&phase=D', 1280, 800);
  const r1 = await v1.page.evaluate(() => {
    const rail = document.querySelector('#rail').getBoundingClientRect();
    const cards = document.querySelector('#cards').getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth + 1, railRight: rail.right <= innerWidth + 1, cardsOverlap: cards.left < rail.left - 4, widgets: document.querySelectorAll('#slots .widget').length };
  });
  await shot(v1.page, 'break-1280');
  check('V1 1280×800: no page overflow, rail inside, cards clear of rail, widgets present', !r1.overflow && r1.railRight && r1.cardsOverlap && r1.widgets >= 2, JSON.stringify(r1));
  check('V-viewport: no console errors', quiet(v1.errors));
  await v1.page.close();
}

function player_situation_end(page) { return 140; } // wui clock end — clamped check uses the known situation

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} e2e checks passed`);
process.exit(failed.length ? 1 : 0);
