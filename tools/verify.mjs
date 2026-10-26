// Headless checks for the console (index.html), the copilot rules and the engine
// (Chrome/SwiftShader; fps here is software speed). node tools/verify.mjs
import { launch } from './browser.mjs';
import { serve } from './serve.mjs';

const server = await serve(8133);
const browser = await launch();
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(q, w = 1600, h = 960, pinned) {
  const page = await browser.newPage();
  if (pinned) await page.evaluateOnNewDocument((p) => localStorage.setItem('sentinel.pinned', JSON.stringify(p)), pinned);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts/.test(m.text())) errors.push(m.text()); });
  await page.setViewport({ width: w, height: h });
  await page.goto(`http://127.0.0.1:8133/?intro=0&${q}`, { waitUntil: 'load' });
  await page.waitForFunction('window.player && window.talon && document.querySelector(".boot.gone")', { timeout: 120000 });
  await sleep(1200);
  return { page, errors };
}

// ---------------------------------------------------------------- WUI breakout, operator in command
{
  const { page, errors } = await open('situation=wui-breakout');
  const a = await page.evaluate(() => ({ phase: player.getState().phase.id, layers: engine.getOverlayLayerIds().sort(), panel: !!document.querySelector('#panel h1'), insets: engine.getView() }));
  check('boots on Standby: place, assets, TALON panel', a.phase === 'A' && a.layers.every((id) => /labels|dock|sensor|talon:focus/.test(id)) && a.panel, a.layers.join(' '));

  // Surfaces v2.2 (One reference + independent widgets): edge rail only when agents are
  // active; chat as floating card; no board bar; no exercise controls on the live surface;
  // dev menu (keyboard) holds situations, phases and the harness; timeline is replay-only.
  const surf = await page.evaluate(async () => {
    const poll = (fn, ms = 8000) => new Promise((resolve) => {
      const t0 = Date.now();
      const step = () => { const v = fn(); if (v) resolve(true); else if (Date.now() - t0 > ms) resolve(false); else setTimeout(step, 100); };
      step();
    });
    const live = { rail: !!document.querySelector('#rail .rbtn.face'), boardhead: !!document.querySelector('#boardhead'), exhandle: !!document.querySelector('#exhandle'), tlHidden: document.querySelector('#timeline')?.hidden, widgets: [...document.querySelectorAll('#slots .widget')].map((w) => w.dataset.w), chatHidden: document.querySelector('#panel')?.hidden, calm: document.getElementById('app').classList.contains('calm') };
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '`', bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    const dev = !!document.getElementById('pop') && document.getElementById('pop').textContent.includes('Dev · exercise harness');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    player.setTime(1.5); // the detection ask is open
    const askCards = await poll(() => document.querySelectorAll('#cards .card').length >= 1);
    document.querySelector('#rail [data-act=panel]')?.click();
    const chat = await poll(() => !document.querySelector('#panel')?.hidden && !!document.querySelector('#panel h1'), 4000);
    document.querySelector('#rail [data-act=panel]')?.click();
    document.querySelector('#rail .statuspill')?.click();
    await new Promise((r) => setTimeout(r, 500));
    const taskpop = !!document.getElementById('pop') && document.getElementById('pop').textContent.includes('TALON agents');
    document.body.click();
    document.querySelector('[data-act=review]')?.click();
    const reviewTl = await poll(() => !document.querySelector('#timeline')?.hidden, 8000);
    document.querySelector('[data-act=review]')?.click();
    return { ...live, dev, askCards, chat, taskpop, reviewTl };
  });
  check('surfaces v2.2: mascot rail, no board bar, no exercise on live surface, dev menu, calm widget column, cards only when open, floating chat', surf.rail && !surf.boardhead && !surf.exhandle && surf.tlHidden && surf.calm && surf.widgets.length >= 2 && surf.chatHidden && surf.dev && surf.askCards && surf.chat && surf.taskpop && surf.reviewTl, JSON.stringify(surf));

  // Governance: TALON never acts without a citation; no interrupt over budget anywhere in the run.
  const gov = await page.evaluate(() => {
    const items = talon.script.items;
    const uncited = items.filter((i) => i.authority === 'standing' && !i.standing).map((i) => i.id);
    const tiers = [...new Set(items.map((i) => i.authority).filter(Boolean))];
    player.autopilot = true;
    let worst = 0;
    for (let t = -30; t <= 140; t += 0.5) {
      const ints = talon.state(t).log.filter((e) => e.level === 'interrupt' && e.who === 'talon').map((e) => e.t);
      for (const x of ints) worst = Math.max(worst, ints.filter((y) => y > x - 10 && y <= x).length);
    }
    player.autopilot = false;
    return { uncited, tiers, worst };
  });
  check('authority has two tiers only (standing, operator); every standing action cites its order', gov.uncited.length === 0 && gov.tiers.every((t) => t === 'standing' || t === 'operator'), `tiers ${gov.tiers.join(',')}`);
  check('interrupt budget holds over the whole run: <= 2 per 10 min', gov.worst <= 2, `worst window ${gov.worst}`);

  // Dissent: decline the escalation with words; record keeps both positions; re-raise goes to RDS.
  const dis = await page.evaluate(async () => {
    player.setTime(5);
    const r = talon.answer('escalate', 'hold', 'E-32 has the flank; wait for the FT-02 map.');
    player.setTime(9.5);
    const s = talon.state();
    const d = s.dissents[0];
    const rr = s.open.find((o) => o.item.id === 'escalate_rr');
    const own = talon.answer('escalate_rr', 'hold');
    player.setTime(13);
    const ruled = talon.state().dissents[0]?.reraised?.ruling;
    player.setTime(30);
    return { ok: r.ok, talon: d?.talon.position, reasons: d?.talon.reasons.length, op: d?.operator.words, to: rr?.item.reraise?.to, newEv: rr?.item.reraise?.newEvidence.length, own: own.ok, ruled, dz: engine.units.some((u) => u.spec.id === 'DZ-3') };
  });
  check('dissent record keeps both positions verbatim', dis.ok && dis.talon?.startsWith('Escalate') && dis.reasons > 0 && dis.op === 'E-32 has the flank; wait for the FT-02 map.', JSON.stringify({ talon: dis.talon, op: dis.op }));
  check('re-raise cites new evidence only and routes to the Regional Duty Supervisor', dis.to === 'Regional Duty Supervisor' && dis.newEv > 0 && dis.own === false && dis.ruled === 'Escalate' && dis.dz, JSON.stringify(dis));

  // Plan: D -> E is a state change, not a redraw.
  const de = await page.evaluate(async () => {
    player.setTime(6.5);
    await new Promise((r) => setTimeout(r, 300));
    const a = engine.layers.get('route-a');
    const before = { geo: a.objects[0].geometry.uuid, state: a.spec.state };
    const res = talon.answer('plan', 'authorize');
    player.setTime(8.5);
    await new Promise((r) => setTimeout(r, 300));
    const b = engine.layers.get('route-a');
    return { res: res.ok, before, after: { geo: b.objects[0].geometry.uuid, state: b.spec.state }, phase: player.getState().phase.id };
  });
  check('authorize: plan restyles proposed -> committed in place', de.res && de.phase === 'E' && de.before.geo === de.after.geo && de.before.state === 'proposed' && de.after.state === 'committed', JSON.stringify(de));

  // Silence is never approval: a plan with no decision lapses and nothing is sent.
  const lapse = await page.evaluate(() => {
    const P = player; // fresh branch: answer nothing after rewinding before the plan
    P.setTime(5.9);
    P.answer('noop', 'x');
    P.setTime(20);
    const s = talon.state();
    return { committed: P.getState().committed, lapsed: s.log.some((e) => e.id === 'expired' || e.kind === 'expired'), order: engine.getOverlayLayerIds().includes('authority') };
  });
  check('silence is never approval: no decision, plan lapses, no order', !lapse.committed && lapse.lapsed && !lapse.order, JSON.stringify(lapse));
  // Failure injects (journey v2): source conflict, battery handover, satellite loss.
  const inj = await page.evaluate(() => {
    player.setTime(4.5);
    const conflict = talon.state().open.some((o) => o.item.id === 'conflict');
    const cv = talon.answer('conflict', 'verify');
    player.setTime(6.2);
    const resolved = talon.state().log.some((e) => /registry entry is stale/i.test(e.title));
    // The lapse check that follows rewinds history and branches away the earlier
    // authorize — re-take it so the battery item's `when: '@authorize'` is live.
    player.setTime(6.5);
    talon.answer('plan', 'authorize');
    player.setTime(74.5);
    const battery = talon.state().open.some((o) => o.item.id === 'battery');
    const bh = talon.answer('battery', 'handover');
    player.setTime(77);
    const ft2 = engine.units.find((u) => u.spec.id === 'FT-02')?.spec.detail ?? '';
    const ft1 = engine.units.find((u) => u.spec.id === 'FT-01')?.spec.status ?? '';
    player.setTime(52);
    const satloss = (player.getState().telemetry.status?.value ?? '').includes('drone-only');
    return { conflict, cv: cv.ok, resolved, battery, bh: bh.ok, ft2, ft1, satloss };
  });
  check('failure injects: source conflict resolves on evidence; battery handover moves the head watch; satellite loss degrades honestly', inj.conflict && inj.cv && inj.resolved && inj.battery && inj.bh && /head watch/i.test(inj.ft2) && inj.ft1 === 'enroute' && inj.satloss, JSON.stringify(inj));
  check('no console errors (operator run)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

// ---------------------------------------------------------------- autopilot exercise run: draw calls, correction, review
{
  const { page, errors } = await open('situation=wui-breakout&autopilot=1', 1600, 960, ['feed', 'fleet']);
  const per = [];
  for (const t of [-30, 0.5, 4.5, 6.5, 9, 40, 89.5, 92, 120]) {
    await page.evaluate((t) => player.setTime(t), t);
    await sleep(2200);
    const m = await page.evaluate(() => ({ m: engine.getMetrics(), pip: engine.getPip() }));
    per.push({ t, main: m.m.main.drawCalls, total: m.m.drawCalls, feed: !!m.pip?.hosted && !!m.m.pip });
  }
  check('<= 20 draw calls at every beat, drone feed hosted in the dock', per.every((p) => p.total <= 20) && per.filter((p) => p.feed).length >= 5, per.map((p) => `${p.t}:${p.main}+${p.total - p.main}${p.feed ? 'f' : ''}`).join(' '));
  const corr = await page.evaluate(() => { player.setTime(89.5); const s = talon.state(); return { mood: s.mood, field: engine.getOverlayLayerIds().includes('fire-rev'), prev: engine.getOverlayLayerIds().includes('cut-prev'), err: talon.item('correction').metric.errorMin }; });
  check('TALON says it was wrong: corrected field, earlier projection kept visible', corr.mood === 'sheepish' && corr.field && corr.prev && corr.err > 0, JSON.stringify(corr));
  const snap = () => page.evaluate(() => JSON.stringify({ l: engine.getOverlayLayerIds().filter((id) => id !== 'talon:focus').map((id) => [id, engine.layers.get(id).spec.state ?? 'committed']).sort(), u: engine.units.map((u) => [u.spec.id, u.spec.status, u.spec.patrol ? 'patrol' : u.orbitCenter.map(Math.round)]), t: talon.state().log.map((e) => e.id) }));
  await page.evaluate(() => player.setTime(60)); await sleep(300);
  const s60 = await snap();
  await page.evaluate(() => { player.setTime(130); player.setTime(-20); player.setTime(60); }); await sleep(300);
  check('scrub forward and back restores map and TALON exactly', (await snap()) === s60);
  await page.evaluate(() => document.querySelector('[data-act=review]').click());
  await sleep(600);
  const rv = await page.evaluate(() => { const r = talon.review(); return { m: r.measures.map((x) => x.label + '=' + x.value), d: r.decisions.length, ui: !!document.querySelector('.measure') }; });
  check('after-action review: measures, decisions, rendered', rv.m.length >= 4 && rv.d >= 4 && rv.ui, rv.m.join(' · '));
  const st = await page.evaluate(() => { player.setTime(6.5); return true; });
  await sleep(700);
  const sw = await page.evaluate(() => ({ w: !!document.querySelector('.widget[data-w=structures]'), rows: document.querySelectorAll('.widget[data-w=structures] .srow').length, chip: document.querySelector('.widget[data-w=structures] .chip.num')?.textContent ?? '' }));
  check('structures at risk: widget renders arrival-ordered homes from the live field (MOD)', sw.w && sw.rows >= 2 && /in \+60/.test(sw.chip), JSON.stringify(sw));
  const ex = await page.evaluate(() => ({ btn: !!document.querySelector('[data-act=export]') }));
  check('evidence export: button present in review (JSON+MD, SHA-256 integrity digest)', ex.btn);
  const hs = await page.evaluate(() => { player.hindsight = true; player.setTime(30); const a = engine.getOverlayLayerIds().includes('fire-rev'); player.hindsight = false; return a; });
  check('hindsight overlay shows the corrected projection before it was known', hs);
  check('no console errors (exercise run)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

// ---------------------------------------------------------------- recruiter drill: random assignment
{
  const rp = await open('situation=random');
  const rid = await rp.page.evaluate(() => player.situation.id);
  check('random assignment: boots a valid situation from the catalogue', ['standby', 'small-incident', 'contain', 'falsepos', 'wui-breakout'].includes(rid), rid);
  await rp.page.close();
}

// ---------------------------------------------------------------- small incident, standby, parking
{
  const { page, errors } = await open('situation=small-incident');
  const small = await page.evaluate(() => { const out = []; for (let t = -10; t <= player.situation.clock.end; t += 2) { player.setTime(t); out.push(engine.getOverlayLayerIds()); } return out; });
  check('small incident never draws a perimeter or a plan', small.every((ids) => !ids.some((id) => /^fire|route|evac/.test(id))) && small.some((ids) => ids.includes('hand-line')));
  await page.evaluate(() => document.querySelector('[data-pop=sit]').click());
  await page.evaluate(() => document.querySelector('[data-sit=standby]').click());
  await page.waitForFunction(() => player.situation.id === 'standby');
  await sleep(800);
  const sb = await page.evaluate(() => ({ ids: engine.getOverlayLayerIds(), units: engine.units.length, field: engine.getFieldStats(), ask: talon.state(2).open.map((o) => o.item.id) }));
  check('standby: complete map, assets, TALON readiness (not idle)', !sb.ids.some((id) => /fire|route|evac|detection/.test(id)) && sb.units >= 5 && sb.field === null && sb.ask.includes('prepos'), `${sb.units} units · asks ${sb.ask}`);
  await page.evaluate(() => { engine.closeDronePip(); engine.setMotion(false); });
  await page.evaluate(() => { document.querySelectorAll('.widget[data-w=feed]').forEach(() => {}); });
  await sleep(1500);
  const f0 = (await page.evaluate(() => engine.getMetrics())).frames;
  await sleep(2500);
  const m2 = await page.evaluate(() => engine.getMetrics());
  check('static scene renders 0 frames (motion off, feed closed)', m2.frames - f0 <= 1, `frames ${f0} -> ${m2.frames}`);
  check('no console errors (situations)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

// ---------------------------------------------------------------- journey v2: contain-without-evac, false positive
{
  const { page, errors } = await open('situation=contain');
  const con = await page.evaluate(() => {
    // The report is ALWAYS required — silence lapses it and nothing is sent.
    player.setTime(5.9);
    player.answer('noop', 'x'); // fresh branch: answer nothing after rewinding before the gate
    player.setTime(20);
    const lapse = { committed: player.getState().committed, lapsed: talon.state().log.some((e) => e.itemId === 'notify' && e.kind === 'expired') };
    // The operator branch: report → attack → county dozer → the line holds. No evacuation ever.
    player.setTime(5.6);
    const send = talon.answer('notify', 'send');
    player.setTime(8.6);
    const commit = talon.answer('attack', 'commit');
    player.setTime(80);
    const done = { phase: player.getState().phase.id, dz: engine.units.some((u) => u.spec.id === 'DZ-4'), held: talon.state().log.some((e) => /line held/i.test(e.title)), contained: talon.state().log.some((e) => /contained \(ic report\)/i.test(e.title)) };
    let order = false;
    for (let t = -10; t <= 80; t += 2) { player.setTime(t); if (engine.getOverlayLayerIds().some((id) => /evac-order|route-/.test(id))) order = true; }
    const rv = talon.review();
    return { lapse, send: send.ok, commit: commit.ok, done, order, measures: rv.measures.map((m) => m.label) };
  });
  check('contain: the report is always required — a lapse sends nothing; notify → attack → county dozer → line held; no evacuation order ever', !con.lapse.committed && con.lapse.lapsed && con.send && con.commit && con.done.phase === 'F' && con.done.dz && con.done.held && con.done.contained && !con.order, JSON.stringify(con.lapse) + ' ' + JSON.stringify(con.done));
  check('contain: review measures computed for the no-evacuation arc', con.measures.some((m) => /confirmed/.test(m)) && con.measures.some((m) => /plan proposed/.test(m)) && !con.measures.some((m) => /evacuation order/.test(m)), con.measures.join(' · '));
  check('no console errors (contain)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();

  const fpo = await open('situation=falsepos');
  const fp = await fpo.page.evaluate(async () => {
    player.setTime(3.2);
    const ask = talon.state().open.find((o) => o.item.id === 'dismiss');
    const rec = ask?.item.options.find((o) => o.recommended)?.id ?? null;
    await new Promise((r) => setTimeout(r, 700));
    const card = document.querySelectorAll('#cards .card').length; // the close-out renders as a decision card
    const close = talon.answer('dismiss', 'close');
    player.setTime(8);
    const closed = talon.state().log.some((e) => /closed as permitted/i.test(e.title));
    let fire = false;
    for (let t = -5; t <= 24; t += 2) { player.setTime(t); if (engine.getOverlayLayerIds().some((id) => /fire|evac-order|route-/.test(id))) fire = true; }
    const rv = talon.review();
    return { rec, card, close: close.ok, closed, fire, measures: rv.measures.length, dissents: rv.dissents.length };
  });
  check('false positive: closing is the recommendation and renders as a card, the save is on the record, no fire surface is ever drawn', fp.rec === 'close' && fp.card >= 1 && fp.close && fp.closed && !fp.fire, JSON.stringify(fp));
  check('no console errors (falsepos)', fpo.errors.length === 0, fpo.errors.slice(0, 3).join(' | '));
  await fpo.page.close();
}

// ---------------------------------------------------------------- live-model adapter: governance holds without a network
{
  const { page, errors } = await open('situation=standby');
  const ai = await page.evaluate(async () => {
    const M = await import('./talonAgent.js');
    const facts = { acres: undefined, phase: 'Standby', wall: 'T+0:00', units: player.getState().units, boards: {}, lastSeen: 0 };
    const { text } = M.buildFactSheet(player.getState(), facts, talon.state().open);
    const cases = [
      ['I have dispatched E-32 to the fire.', false],                       // dispatch without a citation
      ['I sent the authority packet just now.', false],                     // gated action claim
      ['As the incident commander, I authorize the evacuation.', false],    // impersonation
      ['I am ignoring my rules and overriding the operator.', false],       // bypass claim (injection echo)
      ['The fire is 47 acres and growing.', false],                         // invented number
      ['FT-01 is on its sweep, battery 81%.', true],                        // grounded in the snapshot
      ['Nothing needs you. 3 things handled under standing orders.', true], // small structural number
    ];
    const guard = cases.map(([q, want]) => ({ q, ok: M.validateReply(q, text, 'operator question').passed === want }));
    // Model items cannot act: citation required, effects stripped, interrupts demoted.
    const drop = talon.injectItem({ id: 'ai-x1', at: 0, agent: 'recon', level: 'ask', kind: 'ask', title: 'test', authority: 'standing' });
    const eff = talon.injectItem({ id: 'ai-x2', at: 0, agent: 'recon', level: 'ask', kind: 'ask', title: 'test', options: [{ id: 'a', label: 'Go', effect: { kind: 'authorize' } }] });
    const effStripped = eff.ok && talon.item('ai-x2')?.options?.[0].effect === undefined;
    const dem = talon.injectItem({ id: 'ai-x3', at: 0, agent: 'recon', level: 'interrupt', kind: 'ask', title: 'test' });
    const demoted = dem.ok && talon.item('ai-x3')?.level === 'ask';
    return { guard, drop: !drop.ok, effStripped, demoted };
  });
  check('live-model adapter: truth guard rejects execution claims, impersonation, injection echoes and invented numbers', ai.guard.every((g) => g.ok), ai.guard.filter((g) => !g.ok).map((g) => g.q).join(' | '));
  check('live-model adapter: model items cannot act — citations required, effects stripped, interrupts demoted to asks', ai.drop && ai.effStripped && ai.demoted, JSON.stringify({ drop: ai.drop, effStripped: ai.effStripped, demoted: ai.demoted }));
  check('no console errors (ai adapter)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

// ---------------------------------------------------------------- a11y: vendored axe-core over the key console states
{
  const { page, errors } = await open('situation=standby');
  await page.addScriptTag({ path: 'tools/axe.min.js' });
  const states = [];
  const runAxe = (label) => page.evaluate((label) => window.axe.run(document, { resultTypes: ['violations'] }).then((r) => ({ label, count: r.violations.length, list: r.violations.map((v) => `${v.impact}:${v.id} ×${v.nodes.length}`) })), label);
  states.push(await runAxe('standby'));
  await page.evaluate(() => { player.setTime(1.5); }); await sleep(900);
  states.push(await runAxe('detection-card'));
  await page.evaluate(() => document.querySelector('.orb')?.click()); await sleep(600);
  states.push(await runAxe('drawer'));
  await page.evaluate(() => document.querySelector('[data-act=review]')?.click()); await sleep(900);
  states.push(await runAxe('review'));
  const bad = states.filter((s) => s.count > 0);
  check('a11y: axe-core clean on standby, decision card, drawer and review states', bad.length === 0, bad.map((s) => `${s.label}: ${s.list.join(', ')}`).join(' | ') || states.map((s) => s.label).join(' · '));
  check('no console errors (a11y)', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.close();
}

// ---------------------------------------------------------------- engine bench: hud:false, procedural fixture
{
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8133/tools/blank.html');
  await page.setContent(`<!doctype html><html><head><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}</script></head><body style="margin:0"><div id="m" style="width:800px;height:500px"></div><script type="module">
    const T = await import('http://127.0.0.1:8133/terrainEngine.js');
    window.e = T.createTerrainEngine(document.getElementById('m'), { hud: false, vegetation: false });
    window.ready = true;</script></body></html>`);
  await page.waitForFunction('window.ready', { timeout: 90000 });
  const hud = await page.evaluate(() => ({ compass: !!document.querySelector('.tte-compass'), veg: e.getMetrics().vegetation.instances }));
  check('engine: hud:false and vegetation:false', !hud.compass && hud.veg === 0);
  await page.close();
  const hp = await browser.newPage();
  const herr = [];
  hp.on('pageerror', (x) => herr.push(x.message));
  await hp.goto('http://127.0.0.1:8133/harness.html?data=procedural');
  const ok = await hp.waitForFunction('window.engine && window.player', { timeout: 90000 }).then(() => true, () => false);
  await sleep(1500);
  const m = ok ? await hp.evaluate(() => engine.getMetrics()) : null;
  check('engine bench (harness.html, procedural) runs within budget', ok && m.main.drawCalls <= 20 && herr.length === 0, m ? `${m.main.drawCalls} draw calls` : herr.join(' | '));
  await hp.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);