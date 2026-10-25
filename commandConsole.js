/**
 * commandConsole.ts: Sentinel command console (tier 3 shell)
 * ----------------------------------------------------------
 * The operator's surface. It renders three runtimes and owns none of their rules:
 *   terrainEngine   the map (incident-agnostic)
 *   scenarioPlayer  the situation as a function of (time, decisions)
 *   talon           the copilot as a function of (time, decisions)
 *
 * Layout is a fixed constitution so the operator's spatial memory holds under stress:
 * global status on top, the map in the middle, TALON on the right (its side), the dock
 * at the bottom (the operator's side: pinned widgets left, one or two TALON-suggested
 * slots right, labelled as such). TALON never moves the operator's furniture.
 *
 * Exercise controls (clock, autopilot, holds) are harness, drawn in a dashed "EXERCISE"
 * group and kept out of the product surfaces. The incident flow is never shown as steps.
 */
import { createTerrainEngine, loadWorldData } from './terrainEngine.js';
import { createScenarioPlayer } from './scenarioPlayer.js';
import { createTalon, fmtDur, fmtT, layerPoint } from './talon.js';
import { createTalonAgent } from './talonAgent.js';
// ============================================================================
// Small DOM helpers
// ============================================================================
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtN = (n) => Math.round(n).toLocaleString('en-US');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const store = {
    get(k, d) {
        try {
            const v = localStorage.getItem(`sentinel.${k}`);
            return v === null ? d : JSON.parse(v);
        }
        catch {
            return d;
        }
    },
    set(k, v) {
        try {
            localStorage.setItem(`sentinel.${k}`, JSON.stringify(v));
        }
        catch {
            /* private mode */
        }
    },
};
/** 16px stroke icons (one visual language: 1.6 stroke, round caps). */
const IC = {
    play: '<path d="M5 3.5v9l7-4.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M5 3.5v9M11 3.5v9" stroke-width="2.2"/>',
    next: '<path d="M4 3.5v9l6-4.5zM12 3.5v9" />',
    prev: '<path d="M12 3.5v9l-6-4.5zM4 3.5v9" />',
    inbox: '<path d="M2.5 9.5 4 3.5h8l1.5 6v3h-11zM2.5 9.5h3l1 1.5h3l1-1.5h3"/>',
    chat: '<path d="M2.5 4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7l-3 2.5v-2.5h0a1.5 1.5 0 0 1-1.5-1.5z"/>',
    mic: '<rect x="6" y="2" width="4" height="7.5" rx="2"/><path d="M3.5 8a4.5 4.5 0 0 0 9 0M8 12.5v1.5"/>',
    shield: '<path d="M8 1.8 13 3.6v4.1c0 3-2.1 5.1-5 6.5-2.9-1.4-5-3.5-5-6.5V3.6z"/><path d="m5.8 8 1.6 1.6L10.4 6.6"/>',
    gear: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1"/>',
    layers: '<path d="m8 2 6 3.2-6 3.2-6-3.2zM2 8.2l6 3.2 6-3.2M2 11l6 3.2L14 11"/>',
    sun: '<circle cx="8" cy="8" r="2.8"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"/>',
    moon: '<path d="M13 9.6A5.5 5.5 0 0 1 6.4 3a5.5 5.5 0 1 0 6.6 6.6z"/>',
    ir: '<path d="M8 1.8c2.5 2.2 4 4.4 4 6.7a4 4 0 0 1-8 0c0-1.3.6-2.5 1.6-3.6.2 1.2.9 2 1.8 2.4C7.2 5.4 7.3 3.7 8 1.8z"/>',
    plus: '<path d="M8 3v10M3 8h10"/>',
    minus: '<path d="M3 8h10"/>',
    fit: '<path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/><circle cx="8" cy="8" r="1.6"/>',
    close: '<path d="m4 4 8 8M12 4l-8 8"/>',
    down: '<path d="m4 6 4 4 4-4"/>',
    up: '<path d="m4 10 4-4 4 4"/>',
    pin: '<path d="M9.5 2.5 13.5 6.5 11 7.5 8.5 10l.5 3-6-6 3 .5L8.5 5z"/>',
    send: '<path d="M2.5 8 13.5 2.5 10 13.5 7.5 8.5z"/>',
    review: '<path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.5 2.8v2.6h2.6M8 5v3.2l2.2 1.4"/>',
    help: '<circle cx="8" cy="8" r="6"/><path d="M6.3 6.2a1.8 1.8 0 0 1 3.4.8c0 1.2-1.7 1.4-1.7 2.6M8 11.5v.2"/>',
    check: '<path d="m3.5 8.5 3 3 6-6.5"/>',
    arrow: '<path d="M3 8h10M9 4l4 4-4 4"/>',
    live: '<path d="M8 13.5V4M4 8l4-4 4 4"/>',
    drone: '<circle cx="4" cy="4" r="1.8"/><circle cx="12" cy="4" r="1.8"/><circle cx="4" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><path d="M5.3 5.3 10.7 10.7M10.7 5.3 5.3 10.7"/>',
    engine: '<path d="M8 2.5 14 13H2z"/>',
    crew: '<rect x="3" y="3" width="10" height="10" rx="1"/>',
    dozer: '<path d="M8 2 13.2 5v6L8 14l-5.2-3V5z"/>',
    law: '<path d="M8 1.8 13 3.6v4.1c0 3-2.1 5.1-5 6.5-2.9-1.4-5-3.5-5-6.5V3.6z"/>',
    view3d: '<path d="m8 2 5.5 3v6L8 14l-5.5-3V5zM8 8v6M2.5 5 8 8l5.5-3"/>',
    view2d: '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M2.5 8h11M8 2.5v11"/>',
    timeline: '<circle cx="8" cy="8" r="5.5"/><path d="M8 4.8V8l2.2 1.4"/>',
};
const ic = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 16 16" aria-hidden="true">${IC[name] ?? ''}</svg>`;
/** TALON: a visor face with two slit eyes. Calm by default; mood and gaze are CSS states. */
const FACE = 'M32 5 54 14q4 2 4 7v13q0 16-26 25Q6 50 6 34V21q0-5 4-7Z';
const mascot = (mood = 'calm', id = '') => `<svg class="mascot" ${id ? `id="${id}"` : ''} viewBox="0 0 64 64" data-mood="${mood}" aria-hidden="true"><path d="${FACE}" fill="url(#talonFace)"/><path class="rim" d="${FACE}" fill="none" stroke-width="1.6"/><path class="rimglow" d="${FACE}" fill="none" stroke-width="3"/><g class="eyes"><g transform="rotate(-7 24 30.5)"><rect class="eye l" x="18.5" y="27" width="11" height="7" rx="3.5"/></g><g transform="rotate(7 40 30.5)"><rect class="eye r" x="34.5" y="27" width="11" height="7" rx="3.5"/></g></g></svg>`;
const BRAND = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6.8 14.6 12 7.6l5.2 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="16.6" r="1.4" fill="currentColor"/></svg>';
const SITUATIONS = [
    { id: 'standby', name: 'Standby', sub: 'No incident · Red Flag watch' },
    { id: 'small-incident', name: 'Small incident', sub: 'One detection · one engine' },
    { id: 'contain', name: 'Containable', sub: 'No evacuation · authority still notified' },
    { id: 'falsepos', name: 'Permitted burn', sub: 'False positive · the save' },
    { id: 'wui-breakout', name: 'WUI breakout', sub: 'Full incident · Encinal Canyon' },
];
const WIDGETS = {
    feed: { title: 'Drone feed' },
    weather: { title: 'Fire weather' },
    fleet: { title: 'Fleet & units' },
    evac: { title: 'Evacuation' },
    growth: { title: 'Fire growth' },
    events: { title: 'Key events' },
};
/** Doc 12 §3: who owns each layer kind. */
const OWNER = { labels: 'World (OSM)', assets: 'Situation', detections: 'TALON · Recon', firePerimeter: 'TALON · Spread', headAxis: 'TALON · Spread', weather: 'Weather feed', evacZones: 'TALON · Egress (plan)', routes: 'TALON · Egress (plan)', staging: 'TALON · Egress (plan)', suppression: 'TALON · Dispatch (plan)', authority: 'Operator', planDraft: 'TALON (draft)' };
const LAYER_GROUPS = [
    ['detections', 'Detections', 'Heat reports, hotspots, spot fires'],
    ['firePerimeter', 'Perimeter + projection', 'Reached area, +15 / +30 / +60 min'],
    ['weather', 'Weather', 'Wind'],
    ['evacZones', 'Evacuation zones', 'Order · warning · safe'],
    ['routes', 'Routes', 'Egress, choke, projected cut'],
    ['planDraft', 'Draft revision', 'Proposed change to the plan'],
    ['staging', 'Staging', 'Assembly points'],
    ['suppression', 'Suppression', 'Dozer and hand lines'],
    ['assets', 'Docks & sensors', 'Drone docks, thermal masts'],
];
const BASE_LAYERS = [['units', 'Ground units'], ['drones', 'Drones'], ['vegetation', 'Vegetation'], ['roads', 'Roads'], ['buildings', 'Structures'], ['contours', 'Contours'], ['labels', 'Place names']];
export async function mountConsole(app) {
    const params = new URLSearchParams(location.search);
    const $ = (s, el = app) => el.querySelector(s);
    document.getElementById('bootMascot').innerHTML = mascot('calm');
    const world = await loadWorldData('./data/');
    const engine = createTerrainEngine($('#map'), { world, view: 'perspective', lighting: params.get('lighting') === 'day' ? 'day' : 'night', hud: false, pipOnUnitClick: false });
    engine.setVerticalExaggeration(2, 0);
    window.engine = engine;
    app.insertAdjacentHTML('beforeend', SHELL);
    const ui = {
        sit: params.get('situation') ?? store.get('situation', 'wui-breakout'),
        // The chat card is on demand — the edge rail is the only persistent TALON surface (One reference). ?talon=open starts it open.
        panel: params.get('talon') === 'open',
        tab: 'now',
        logAgent: 'all',
        pinned: store.get('pinned', ['weather', 'fleet']),
        review: false,
        replay: false,
        playing: false,
        speed: 1,
        follow: store.get('follow', true),
        sound: store.get('sound', true),
        autopilot: params.get('autopilot') === '1',
        lastSeen: -Infinity,
        liveT: -Infinity,
        sel: null,
        hoverEv: null,
        dissent: null,
        hold: null,
        feedDrone: null,
        feedSensor: null,
        seen: new Set(),
        pop: null,
        listening: false,
        dockMin: false,
        ai: store.get('ai', null),
        aiProvider: 'openai',
    };
    let player;
    let talon;
    let sit;
    let scale;
    let growth = null;
    const cache = new Map();
    // ------------------------------------------------------------------ situations
    async function loadSituation(id) {
        if (!cache.has(id)) {
            const r = await fetch(`./data/scenarios/${id}.json`);
            if (!r.ok)
                throw new Error(`${id}.json: HTTP ${r.status}`);
            cache.set(id, await r.json());
        }
        return cache.get(id);
    }
    async function mount(id, phaseParam) {
        sit = await loadSituation(id);
        ui.sit = id;
        store.set('situation', id);
        player?.dispose();
        engine.closeDronePip();
        engine.setOverlayLayer('talon:focus', null);
        player = createScenarioPlayer(engine, sit, { director: false, autopilot: ui.autopilot });
        talon = createTalon(player);
        window.player = player;
        window.talon = talon;
        scale = new TimeScale(sit);
        growth = buildGrowth(sit, world);
        Object.assign(ui, { review: false, sel: null, dissent: null, hold: null, feedDrone: null, feedSensor: null, tab: 'now', hoverEv: null });
        ui.seen = new Set();
        stopPlay();
        const pi = phaseParam ? Math.max(0, sit.phases.findIndex((p) => p.id === phaseParam)) : 0;
        const t0 = sit.phases[pi]?.t ?? sit.clock.start;
        player.setTime(t0);
        ui.liveT = t0;
        ui.lastSeen = t0;
        const cam = sit.phases[pi]?.camera;
        if (cam)
            engine.flyTo({ ...cam, durationMs: 0 });
        for (const it of talon.state(t0).log)
            ui.seen.add(it.id);
        player.on('change', schedule);
        player.on('phase', onPhase);
        buildTimeline();
        applyHiddenGroups();
        schedule();
    }
    // ------------------------------------------------------------------ render scheduling
    let queued = false;
    function schedule() {
        if (queued)
            return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            render();
        });
    }
    const keys = new Map();
    const changed = (k, v) => {
        const s = JSON.stringify(v);
        if (keys.get(k) === s)
            return false;
        keys.set(k, s);
        return true;
    };
    function render() {
        if (!player)
            return;
        const ps = player.getState();
        const ts = talon.state(ps.t);
        if (ps.t > ui.liveT && !ui.review)
            ui.liveT = ps.t;
        announce(ts, ps);
        renderTopbar(ps, ts);
        renderRail(ts);
        renderCards(ps, ts);
        renderChat(ps, ts);
        renderBoardhead(ps);
        renderTimeline(ps);
        renderSlots(ps, ts);
        renderInspector(ps);
        renderAttention(ts);
        updateCountdowns(ps);
        app.classList.toggle('chat-open', ui.panel);
        app.classList.toggle('dock-min', ui.dockMin);
        updateInsets();
    }
    const isPast = () => !ui.review && player.getTime() < ui.liveT - 0.05;
    const canDecide = () => !ui.review && !isPast();
    // ------------------------------------------------------------------ announcements: sound + toast for new asks/interrupts
    let audio = null;
    function chime(kind) {
        if (!ui.sound)
            return;
        try {
            audio ?? (audio = new AudioContext());
            const notes = kind === 'interrupt' ? [880, 660, 880] : [660, 990];
            notes.forEach((f, i) => {
                const o = audio.createOscillator(), g = audio.createGain();
                o.type = kind === 'interrupt' ? 'triangle' : 'sine';
                o.frequency.value = f;
                const t = audio.currentTime + i * 0.13;
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.06, t + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
                o.connect(g).connect(audio.destination);
                o.start(t);
                o.stop(t + 0.25);
            });
        }
        catch {
            /* no audio */
        }
    }
    function announce(ts, ps) {
        for (const e of ts.log) {
            if (ui.seen.has(e.id))
                continue;
            ui.seen.add(e.id);
            if (ui.review || e.t < ps.t - 3)
                continue;
            // The decision card IS the interrupt — chime only, no duplicate toast.
            if (e.level === 'interrupt')
                chime('interrupt');
            else if (e.level === 'ask' && e.who === 'talon')
                chime('ask');
        }
    }
    // ------------------------------------------------------------------ topbar (TALON lives on the edge rail, not here)
    function renderTopbar(ps, ts) {
        const inc = ps.telemetry.incident;
        const wall = sit.meta.epoch ? player.wallClock(ps.t) : '';
        const mode = ui.review ? 'review' : isPast() ? 'past' : 'live';
        const mine = ts.open.filter((o) => !o.item.reraise).length;
        const gateOpen = !!ps.gate?.open;
        const k = [ui.sit, inc?.value, inc?.level, ps.phase.id, gateOpen, Math.floor(ps.gate?.expires ?? 0), wall, mode, ui.pop, mine, ui.panel, ui.replay, ui.listening, ui.ai?.model ?? ''];
        if (!changed('top', k))
            return;
        const s = SITUATIONS.find((x) => x.id === ui.sit);
        $('#topbar').innerHTML = `
      <div class="brand">${BRAND}<span>SENTINEL</span></div><div class="vsep"></div>
      <button class="sitbtn" data-act="pop" data-pop="sit" aria-haspopup="menu" aria-expanded="${ui.pop === 'sit'}"><span><b>${esc(sit.meta.title)} · ${esc(s.name)}</b><small>${esc(sit.meta.coords ?? '')} · Training exercise</small></span>${ic('down', 'sm')}</button>
      <button class="posture ${inc?.level ?? 'ok'}" data-act="pop" data-pop="arc" aria-haspopup="dialog" aria-expanded="${ui.pop === 'arc'}" title="Incident journey — what happened, what is pending. The operator follows the incident, not the process.">
        <i class="dot"></i><b>${esc(ps.phase.name)}</b>${gateOpen ? `<span class="gatechip">GATE <span class="countdown" data-until="${ps.gate.expires}"></span></span>` : ''}
      </button>
      <div class="grow"></div>
      ${ui.ai?.key ? `<span class="chip working" title="Live model · grounded in the situation, held by the truth guard, never executing">AI · ${esc(ui.ai.model)}</span>` : ''}
      <div class="clock" title="Scene time · wall clock"><span class="live ${mode}">${mode === 'live' ? 'LIVE' : mode === 'review' ? 'REVIEW' : 'VIEWING'}</span><b>${fmtT(ps.t)}</b><span>${esc(wall)}</span></div>
      ${mode === 'past' ? `<button class="btn sm" data-act="golive">${ic('live', 'xs')}Back to live</button>` : ''}
      <button class="btn icon ghost" data-act="scrub" aria-pressed="${ui.replay}" aria-label="Incident timeline" title="Incident timeline (scrub, replay)">${ic('timeline')}</button>
      <button class="btn ${ui.review ? 'primary' : 'ghost'}" data-act="review" aria-pressed="${ui.review}" title="After-action review (R)">${ic('review')}<span>${ui.review ? 'Exit review' : 'Review'}</span></button>
      <button class="btn icon ghost" data-act="keys" aria-label="Keyboard shortcuts (?)" title="Keyboard shortcuts (?)">${ic('help')}</button>`;
    }
    // ------------------------------------------------------------------ edge rail (One reference): agent dots in a pill + chat/voice controls
    function renderRail(ts) {
        const mine = ts.open.filter((o) => !o.item.reraise).length;
        const k = [ts.agents.map((a) => a.status), mine, ui.panel, ui.pop, ui.listening, ts.budget.used];
        if (!changed('rail', k))
            return;
        $('#rail').innerHTML = `
      <button class="statuspill" data-act="pop" data-pop="agents" aria-haspopup="menu" aria-expanded="${ui.pop === 'agents'}" aria-label="TALON agents — ${mine ? `${mine} need${mine > 1 ? '' : 's'} you` : 'all quiet'}">
        ${ts.agents.map((a) => `<span class="adot" data-tip="${esc(a.name)} · ${a.status === 'needs' ? 'needs you' : a.status}|${esc(a.line)}"><i class="dot ${a.status === 'idle' ? '' : a.status}"></i></span>`).join('')}
      </button>
      <button class="rbtn" data-act="panel" aria-pressed="${ui.panel}" aria-label="TALON chat (T)" data-tip="TALON chat|thread · log · review (T)">${ic('chat')}${mine ? `<span class="badge">${mine}</span>` : ''}</button>
      <button class="rbtn mic" data-act="mic" aria-pressed="${ui.listening}" aria-label="Voice command (V)" data-tip="Voice command|press V">${ic('mic')}</button>
      <button class="rbtn" data-act="pop" data-pop="authority" aria-pressed="${ui.pop === 'authority'}" aria-label="What TALON may do" data-tip="Authority|what TALON may do alone">${ic('shield')}</button>
      <button class="rbtn" data-act="pop" data-pop="settings" aria-pressed="${ui.pop === 'settings'}" aria-label="Settings" data-tip="Settings · live model">${ic('gear')}</button>`;
    }
    // ------------------------------------------------------------------ TALON chat (a floating card — the rail is the only persistent surface)
    let lastFocus = null;
    function renderChat(ps, ts) {
        const dr = $('#panel');
        dr.hidden = !ui.panel;
        const mine = ts.open.filter((o) => !o.item.reraise);
        const head = [ts.mood, ui.listening, mine.length, ts.agents.filter((a) => a.status === 'working').length, ts.budget, ui.tab, ui.hoverEv ? 1 : 0, ui.review];
        if (changed('phead', head)) {
            const working = ts.agents.filter((a) => a.status === 'working').length;
            const line = ui.review ? 'After-action review · read-only' : mine.length ? `${mine.length} need${mine.length > 1 ? '' : 's'} you · cards on the map` : working ? `${working} agent${working > 1 ? 's' : ''} working · nothing needs you` : 'Watching · nothing needs you';
            $('#phead').innerHTML = `${mascot(ui.listening ? 'listening' : ts.mood, 'talonFaceMain')}
        <div><h1>TALON</h1><div class="line">${mine.length ? '<i class="dot needs"></i>' : working ? '<i class="dot working"></i>' : '<i class="dot done"></i>'}${esc(line)}</div></div>
        <div class="budget" title="Interrupt budget: at most ${ts.budget.max} per ${ts.budget.windowMin} min (ISA-18.2). Over budget, TALON holds an interrupt to an ask and logs it."><div class="pips">${Array.from({ length: ts.budget.max }, (_, i) => `<i class="${i < ts.budget.used ? 'on' : ''}"></i>`).join('')}</div><small>Interrupts ${ts.budget.used}/${ts.budget.max} · ${ts.budget.windowMin} min</small></div>`;
            $('#ptabs').innerHTML = ['now', 'log', 'review'].map((t) => `<button role="tab" aria-selected="${ui.tab === t}" data-act="tab" data-tab="${t}">${t === 'now' ? 'Thread' : t === 'log' ? 'Log' : 'Review'}</button>`).join('');
        }
        // The header is cheap and always rendered (the chat card keeps its identity when closed);
        // the body only renders while open.
        if (!ui.panel)
            return;
        $('#talonFaceMain')?.setAttribute('data-gaze', ui.hoverEv ? 'map' : '');
        if (ui.tab === 'now')
            renderNow(ps, ts);
        else if (ui.tab === 'log')
            renderLog(ts);
        else
            renderReview(ps);
        $('#composer').hidden = ui.tab === 'review';
        const basis = ui.ai?.key ? `replies by ${ui.ai.model} · grounded, truth-guarded, never executing` : 'replies are scripted in this prototype';
        const b = $('#aiBasis');
        if (b && b.textContent !== basis)
            b.textContent = basis;
    }
    function confBars(c) {
        const n = c === 'high' ? 3 : c === 'moderate' ? 2 : c === 'low' ? 1 : 0;
        return n ? `<span class="conf" title="Confidence: ${c}">${[0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}<span>${c}</span></span>` : '';
    }
    function evChips(ev, scope = '') {
        if (!ev?.length)
            return '';
        return `<div class="evid" aria-label="Evidence on the map">${ev.map((e, i) => `<button class="chip talon" data-ev="${scope}|${i}" data-act="evfocus">${esc(e.label)}</button>`).join('')}</div>`;
    }
    function focusCard(o, ps) {
        const it = o.item;
        const t = ps.t;
        const decide = canDecide();
        const crit = it.level === 'interrupt';
        const agent = talon.agentName(it.agent);
        let opts = it.options ?? [];
        const draftNow = ui.dissent?.item === it.id ? it.options?.find((x) => x.id === ui.dissent.option) : null;
        let compare = '';
        if (it.compare) {
            const prim = ps.primary;
            compare = `<div class="coa" role="group" aria-label="Courses of action"><div class="hd"></div>${it.compare.cols.map((c) => `<button class="hd" data-act="coa" data-route="${c.route ?? ''}" aria-pressed="${prim === c.route}" ${decide ? '' : 'disabled'}><b>${c.recommended ? '<i class="pick" title="TALON recommends"></i>' : ''}${esc(c.label)}</b><small>${esc(c.sub ?? '')}</small></button>`).join('')}
        ${it.compare.rows.map((r) => `<div class="rl">${esc(r.label)}</div>${r.values.map((v, i) => `<div class="v${r.best === i ? ' best' : ''}">${esc(v)}</div>`).join('')}`).join('')}</div>`;
            // The route toggle lives in the COA header; keep the decisive options only.
            opts = opts.filter((x) => !x.toggle);
        }
        const gate = it.gate ? `<div class="gate"><b>${esc(it.gate.label)}</b>${it.gate.reach ? `<span>${esc(it.gate.reach)}</span>` : ''}${it.gate.check ? `<span class="check">${ic('check', 'xs')}${esc(it.gate.check)}</span>` : ''}<span class="lapse">If it lapses: ${esc(it.gate.onExpire ?? 'nothing is sent')}</span></div>` : '';
        const options = draftNow
            ? `<div class="dissent"><div><b>You're declining TALON's recommendation.</b><br><span style="color:var(--text-2)">Both positions go on the record verbatim: TALON's reasons and your words. A later re-raise can only cite new evidence, and goes to the Regional Duty Supervisor.</span></div>
          <textarea id="dissentText" placeholder="Your reason, in your words (optional)" aria-label="Your reason"></textarea>
          <div class="row"><button class="btn ghost sm" data-act="dissent-cancel">Cancel</button><button class="btn primary sm" data-act="dissent-ok">Record: ${esc(draftNow.label)}</button></div></div>`
            : `<div class="opts" role="group" aria-label="Your options">${opts.map((x, i) => `<button class="opt${x.recommended ? ' rec' : ''}" data-act="answer" data-item="${it.id}" data-opt="${x.id}" ${decide ? '' : 'disabled'}><span class="k">${i + 1}</span><b>${esc(x.label)}</b><span class="tag">${x.recommended ? 'Recommended' : ''}</span></button>`).join('')}</div>${decide ? '' : `<span class="caps" style="text-transform:none;letter-spacing:0">${ui.review ? 'Review is read-only.' : 'You are viewing the past. Go back to live to decide.'}</span>`}`;
        return `<article class="card ${crit ? 'critical' : 'needs'}" aria-live="polite">
      <div class="meta"><i class="dot ${crit ? 'critical' : 'needs'}"></i><span class="caps">${esc(agent)} · ${it.kind === 'proposal' ? 'Proposal' : 'Needs you'}</span><span class="grow"></span>${o.expiresAt !== null || Number.isFinite(o.closesAt) ? `<span class="countdown" data-until="${Number.isFinite(o.closesAt) ? o.closesAt : o.expiresAt}" title="Closes at ${fmtT(o.closesAt)} (scene time)"></span>` : ''}</div>
      <h2>${esc(talon.text(it.title, t))}</h2>
      ${it.body ? `<p>${esc(talon.text(it.body, t))}</p>` : ''}
      ${compare}
      ${gate}
      ${options}
      ${evChips(it.evidence, it.id)}
      <div class="basis">${it.authority === 'operator' ? '<span class="auth operator">Waits for you</span>' : ''}${confBars(it.confidence)}${it.basis ? `<span>${esc(it.basis)}</span>` : ''}</div>
      <div class="basis"><button class="btn ghost sm" data-act="why" data-item="${it.id}">Why?</button>${it.evidence?.some((e) => e.point || e.unit) ? `<button class="btn ghost sm" data-act="showmap" data-item="${it.id}">Show on map</button>` : ''}</div>
    </article>`;
    }
    function reraiseCard(o, ts) {
        const it = o.item;
        const d = ts.dissents.find((x) => x.itemId === it.reraise.of);
        return `<article class="card routed"><div class="meta"><i class="dot working"></i><span class="caps">Re-raised · routed to ${esc(it.reraise.to)}</span></div>
      <h2>${esc(it.title)}</h2><p>${esc(it.body ?? '')}</p>
      <div><span class="caps">New evidence only</span><ul style="margin:6px 0 0;padding-left:16px;color:var(--text-2);font-size:var(--fs-caption)">${it.reraise.newEvidence.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>
      ${d ? dissentRecord(d) : ''}
      <span class="caps" style="text-transform:none;letter-spacing:0">You are copied. Awaiting the ${esc(it.reraise.to)}'s ruling.</span></article>`;
    }
    function dissentRecord(d) {
        return `<div class="record"><div><span class="caps">TALON recommended</span><b>${esc(d.talon.position)}</b><ul>${d.talon.reasons.slice(0, 3).map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div><div><span class="caps">Operator chose · ${fmtT(d.t)}</span><b>${esc(d.operator.position)}</b>${d.operator.words ? `<span class="quote">“${esc(d.operator.words)}”</span>` : '<span>No reason given</span>'}${d.reraised ? `<span>Re-raised to ${esc(d.reraised.to)}${d.reraised.ruling ? ` · ruled: ${esc(d.reraised.ruling)}` : ''}</span>` : ''}</div></div>`;
    }
    function entryHtml(e) {
        const who = e.who === 'operator' ? 'You' : e.who === 'autopilot' ? 'Exercise autopilot' : e.who === 'crew' ? esc(e.to ?? 'Crew') : e.who === 'system' ? esc(e.decider ?? 'System') : esc(talon.agentName(e.agent));
        if (e.kind === 'message' && e.who === 'operator')
            return `<div class="entry operator"><time>${fmtT(e.t)}</time><div class="bubble">${esc(e.title)}</div></div>`;
        const auth = e.authority === 'standing' ? `<span class="auth standing" title="${esc(e.standing ?? '')}">${esc(e.standing ?? 'Standing order')}</span>` : '';
        const lvl = e.level === 'interrupt' ? ' interrupt' : '';
        const decided = e.kind === 'answer' ? `<span class="chip ${e.who === 'operator' ? 'ok' : ''}" style="height:18px">${e.who === 'operator' ? 'Decision' : e.who === 'autopilot' ? 'Harness' : 'Ruling'}</span>` : '';
        return `<div class="entry${lvl}"><time>${fmtT(e.t)}</time><div><div class="who"><b>${who}</b>${e.kind === 'expired' ? '<span class="chip needs" style="height:18px">lapsed</span>' : ''}${decided}</div><div class="title">${esc(e.title)}</div>${e.body && e.kind !== 'answer' ? `<div class="body">${esc(e.body)}</div>` : e.kind === 'answer' && e.body ? `<div class="body">${esc(e.body)}</div>` : ''}${e.bullets ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}${auth || e.evidence?.length ? `<div class="foot">${auth}${evChips(e.evidence, `e:${e.id}`)}</div>` : ''}</div></div>`;
    }
    function renderNow(ps, ts) {
        const mine = ts.open.filter((o) => !o.item.reraise);
        const routed = ts.open.filter((o) => o.item.reraise);
        const feed = ts.feed.filter((e) => !(e.kind === 'ask' || e.kind === 'proposal') || !ts.open.some((o) => o.item.id === e.itemId));
        const k = ['now', mine.map((o) => o.item.id), routed.map((o) => o.item.id), feed.map((e) => e.id), ps.primary, canDecide(), ts.agents.map((a) => a.status + a.line), ts.handled, Math.floor(ps.t * 2)];
        if (!changed('now', k))
            return;
        const body = $('#pbody');
        let html = '';
        if (!mine.length && !routed.length) {
            html += `<div class="quiet">${mascot('calm')}<div><b>Nothing needs you.</b>${ts.handled ? `${ts.handled} thing${ts.handled > 1 ? 's' : ''} handled under standing orders since your last decision.` : 'TALON is watching the sensors and will ask when it matters.'}</div></div>`;
        }
        html += routed.map((o) => reraiseCard(o, ts)).join('');
        const working = ts.agents.filter((a) => a.status === 'working');
        if (working.length)
            html += `<div><span class="caps">Working now</span><div class="working-rows">${working.map((a) => `<div class="wrow"><i class="dot working"></i><b>${esc(a.name)}</b><span title="${esc(a.line)}">${esc(a.line)}</span></div>`).join('')}</div></div>`;
        // Newest first: what just happened sits at the top of the thread.
        const shown = feed.slice(-40).reverse();
        html += `<div><span class="caps">Latest</span><div class="thread">${shown.map(entryHtml).join('') || '<div class="entry"><time></time><div class="body">TALON posts here when something changes. Quiet otherwise.</div></div>'}</div></div>`;
        body.innerHTML = html;
        body.scrollTop = 0;
    }
    // ------------------------------------------------------------------ decision cards (the interrupt surface — appears only while an item is open)
    function renderCards(ps, ts) {
        const mine = ts.open.filter((o) => !o.item.reraise);
        const routed = ts.open.filter((o) => o.item.reraise);
        const k = [mine.map((o) => [o.item.id, o.expiresAt, o.closesAt]), routed.map((o) => o.item.id), ui.dissent, canDecide(), ps.primary, Math.floor(ps.t * 2)];
        const el = $('#cards');
        if (!changed('cards', k))
            return;
        if (!mine.length && !routed.length)
            return void (el.innerHTML = '');
        let html = '';
        if (mine.length) {
            html += focusCard(mine[0], ps);
            if (mine.length > 1)
                html += `<div class="mini"><span class="caps">Also waiting</span>${mine.slice(1, 3).map((o) => `<div class="row" style="cursor:default"><i class="dot needs"></i><span><b>${esc(talon.text(o.item.title, ps.t))}</b>${esc(talon.agentName(o.item.agent))}</span><span class="countdown" data-until="${Number.isFinite(o.closesAt) ? o.closesAt : o.expiresAt ?? 0}"></span></div>`).join('')}</div>`;
        }
        html += routed.map((o) => `<div class="mini"><div class="row" style="cursor:default"><i class="dot working"></i><span><b>${esc(o.item.title)}</b>routed to ${esc(o.item.reraise.to)} · you are copied</span></div></div>`).join('');
        el.innerHTML = html;
    }
    // ------------------------------------------------------------------ board head (the situation summary that used to live in the topbar)
    function renderBoardhead(ps) {
        const inc = ps.telemetry.incident;
        const st = engine.getFieldStats();
        const evac = player.boardAt('evac');
        const z1 = evac?.zones?.find((z) => typeof z.cleared === 'number');
        const gateOpen = !!ps.gate?.open;
        const k = [inc?.value, inc?.level, st && Math.round(st.reachedArea / 4046.86), st?.threatened, z1?.cleared, gateOpen, Math.floor(ps.gate?.expires ?? 0), ui.dockMin];
        if (!changed('boardhead', k))
            return;
        const kpi = (v, l, prov, opt = false) => `<div class="kpi${opt ? ' opt' : ''}"><b>${v}</b><small>${l}<span class="prov ${prov}">${prov.slice(0, 3)}</span></small></div>`;
        $('#boardhead').innerHTML = `
      <span class="status-pill ${inc?.level ?? 'ok'}" title="${esc(inc?.source ?? '')}">${esc(inc?.value ?? 'No incident')}</span>
      <div class="kpis">${st ? kpi(fmtN(st.reachedArea / 4046.86) + ' ac', 'Burned', 'modeled') + kpi(String(st.threatened), 'Homes in 60 min', 'modeled') : ''}${z1 ? kpi(`${z1.cleared}%`, 'Zone 1 cleared', 'authored', true) : ''}</div>
      ${gateOpen ? `<span class="chip needs">Gate · <span class="countdown" data-until="${ps.gate.expires}"></span></span>` : ''}
      <div class="grow"></div>
      <button class="btn icon sm ghost" data-act="dockmin" aria-label="${ui.dockMin ? 'Expand the board' : 'Collapse the board'}" title="Collapse the board">${ic(ui.dockMin ? 'up' : 'down', 'sm')}</button>`;
    }
    function renderLog(ts) {
        const k = ['log', ts.log.map((e) => e.id), ui.logAgent, ts.dissents.length];
        if (!changed('now', k))
            return;
        const list = ts.log.filter((e) => ui.logAgent === 'all' || e.agent === ui.logAgent);
        $('#pbody').innerHTML = `<div class="seg" role="group" aria-label="Filter by agent"><button data-act="logagent" data-agent="all" aria-pressed="${ui.logAgent === 'all'}">All</button>${talon.script.agents.map((a) => `<button data-act="logagent" data-agent="${a.id}" aria-pressed="${ui.logAgent === a.id}">${esc(a.name)}</button>`).join('')}</div>
      ${ts.dissents.length ? `<div><span class="caps">Dissent records</span>${ts.dissents.map((d) => `<div style="margin-top:8px"><div style="font-weight:var(--fw-medium);margin-bottom:6px">${esc(d.question)}</div>${dissentRecord(d)}</div>`).join('')}</div>` : ''}
      <div><span class="caps">Everything on the record, including what TALON kept quiet</span><div class="thread">${list.map(entryHtml).join('')}</div></div>`;
    }
    function renderReview(ps) {
        const rv = talon.review(Math.max(ps.t, ui.liveT));
        const k = ['review', rv.measures, rv.decisions.map((d) => [d.item.id, d.by, d.choice]), rv.dissents.length, ps.hindsight];
        if (!changed('now', k))
            return;
        const by = (b) => (b === 'operator' ? 'You' : b === 'autopilot' ? 'Autopilot' : b === 'authority' ? 'Supervisor' : b === 'expired' ? 'Lapsed' : 'Open');
        $('#pbody').innerHTML = `
      <div class="card" style="gap:var(--s-2)"><div class="meta"><span class="caps">After-action review</span></div><h2>${esc(sit.meta.title)} · ${esc(SITUATIONS.find((s) => s.id === ui.sit)?.name ?? '')}</h2><p>The map and TALON's panel show exactly what you saw at each moment. Scrub the timeline or pick a decision below.</p>
        <button type="button" class="lrow" role="switch" aria-checked="${ps.hindsight}" data-act="hindsight" style="grid-template-columns:1fr auto"><span class="nm">Overlay what we know now<small>Corrected projection at every time (hindsight)</small></span><span class="switch"></span></button>
        <button class="btn sm" data-act="replay">${ic('play', 'xs')}Replay from the start</button></div>
      <div class="measures">${rv.measures.map((m) => `<div class="measure"><b>${esc(m.value)}</b><span>${esc(m.label)}</span>${m.note ? `<small>${esc(m.note)}</small>` : ''}</div>`).join('')}<div class="measure"><b>${rv.standing}</b><span>Standing-order actions</span><small>${rv.demoted} interrupt${rv.demoted === 1 ? '' : 's'} held by budget</small></div></div>
      <div><span class="caps">Decisions</span>${rv.decisions.map((d) => `<button class="drow" data-act="jump" data-t="${d.closedAt ?? d.raisedAt}"><time>${fmtT(d.raisedAt)}</time><span><b>${esc(talon.text(d.item.title, ps.t))}</b>TALON: ${esc(d.recommended ?? '–')} · ${by(d.by)}: ${esc(d.choice ?? '–')}${d.latency !== null ? ` · ${fmtDur(d.latency)} to decide` : ''}</span><span class="chip ${d.by === 'expired' ? 'needs' : d.choice && d.choice !== d.recommended ? 'needs' : ''}">${d.choice && d.recommended && d.choice !== d.recommended ? 'Dissent' : by(d.by)}</span></button>`).join('')}</div>
      ${rv.dissents.length ? `<div><span class="caps">Dissent records</span>${rv.dissents.map((d) => `<div style="margin-top:8px">${dissentRecord(d)}</div>`).join('')}</div>` : ''}`;
    }
    function updateCountdowns(ps) {
        app.querySelectorAll('.countdown[data-until]').forEach((el) => {
            const u = Number(el.dataset.until);
            if (!Number.isFinite(u))
                return void (el.textContent = '');
            const left = u - ps.t;
            el.textContent = `${fmtDur(Math.max(0, left))} left`;
            el.classList.toggle('low', left < 2);
        });
    }
    // ------------------------------------------------------------------ timeline (replay surface: hidden in live mode, the clock lives in the topbar)
    const timelineVisible = () => ui.replay || ui.review || isPast();
    function buildTimeline() {
        keys.delete('tlm');
        const ticks = [];
        let lastX = -1;
        for (const a of scale.anchors) {
            const x = scale.pos(a);
            if (x - lastX < 0.07 && a !== scale.anchors[scale.anchors.length - 1])
                continue;
            lastX = x;
            ticks.push(`<span style="left:${(x * 100).toFixed(2)}%">${fmtT(a)}</span>`);
        }
        $('#tlticks').innerHTML = ticks.join('');
    }
    function renderTimeline(ps) {
        const vis = timelineVisible();
        $('#timeline').hidden = !vis;
        $('#exhandle').hidden = vis;
        // The exercise controls render into whichever surface is on screen.
        if (changed('ex', [ui.playing, ui.speed, ui.autopilot, ui.hold?.id, ui.review])) {
            const buttons = `<button class="btn icon" data-act="play" aria-pressed="${ui.playing}" aria-label="${ui.playing ? 'Pause' : 'Run'} the exercise clock (Space)" title="Exercise clock (Space)">${ic(ui.playing ? 'pause' : 'play')}</button>
        <button class="btn sm opt" data-act="speed" title="Exercise speed">${ui.speed}×</button>
        <button class="btn icon opt" data-act="beat" aria-label="Skip to the next beat (.)" title="Next beat (.)">${ic('next')}</button>
        <button class="btn sm opt" data-act="autopilot" aria-pressed="${ui.autopilot}" title="Autopilot: the exercise script takes the operator's decisions (harness only)">Autopilot</button>`;
            (vis ? $('#exercise') : $('#exhandle')).innerHTML = buttons + (vis ? '' : ui.hold ? `<span class="holdmsg">${ic('pause', 'xs')}${esc(ui.hold.title)}</span>` : '');
            if (vis)
                $('#holdmsg').innerHTML = ui.hold ? `${ic('pause', 'xs')}Held for your decision: ${esc(ui.hold.title)}` : '';
        }
        if (!vis)
            return;
        const x = scale.pos(ps.t), live = scale.pos(ui.review ? sit.clock.end : ui.liveT);
        const tr = $('#track');
        tr.setAttribute('aria-valuemin', String(sit.clock.start));
        tr.setAttribute('aria-valuemax', String(sit.clock.end));
        tr.setAttribute('aria-valuenow', String(Math.round(ps.t * 10) / 10));
        tr.setAttribute('aria-valuetext', `${fmtT(ps.t)}${sit.meta.epoch ? ` · ${player.wallClock(ps.t)}` : ''}`);
        $('#tlfill').style.width = `${x * 100}%`;
        $('#tlhead').style.left = `${x * 100}%`;
        $('#tlfuture').style.left = `${live * 100}%`;
        const mk = talon.markers(ps.t, ui.review ? sit.clock.end : Math.max(ui.liveT, ps.t));
        if (changed('tlm', [mk.map((m) => [m.t, m.kind, m.label]), ui.review])) {
            $('#tlmarks').innerHTML = mk.map((m) => `<span class="mk ${m.kind}" style="left:${(scale.pos(m.t) * 100).toFixed(2)}%" title="${fmtT(m.t)} · ${esc(m.label)}"></span>`).join('');
        }
        $('#scrubtip').style.left = `${x * 100}%`;
        $('#scrubtip').textContent = `${fmtT(ps.t)}${sit.meta.epoch ? ` · ${player.wallClock(ps.t)}` : ''}`;
    }
    {
        // scrub
        let drag = false;
        const tr = () => $('#track');
        const at = (e) => {
            const r = tr().getBoundingClientRect();
            return scale.time(clamp((e.clientX - r.left) / r.width, 0, 1));
        };
        app.addEventListener('pointerdown', (e) => {
            if (!e.target.closest('#track'))
                return;
            drag = true;
            tr().classList.add('drag');
            tr().setPointerCapture(e.pointerId);
            stopPlay();
            scrubTo(at(e));
        });
        app.addEventListener('pointermove', (e) => drag && scrubTo(at(e)));
        app.addEventListener('pointerup', () => {
            drag = false;
            tr()?.classList.remove('drag');
        });
    }
    function scrubTo(t) {
        const lim = ui.review ? sit.clock.end : Math.max(ui.liveT, player.getTime());
        player.setTime(Math.min(t, lim));
    }
    // ------------------------------------------------------------------ exercise clock (harness)
    let raf = 0, lastTs = 0;
    function startPlay() {
        if (sit.clock.end <= sit.clock.start)
            return;
        if (player.getTime() >= sit.clock.end - 0.01)
            player.setTime(sit.clock.start);
        if (isPast())
            ui.liveT = player.getTime();
        ui.playing = true;
        ui.hold = null;
        lastTs = 0;
        raf = requestAnimationFrame(tick);
        schedule();
    }
    function stopPlay() {
        ui.playing = false;
        cancelAnimationFrame(raf);
        schedule();
    }
    const SECONDS_FULL = 110; // the whole timeline at 1×, paced by event density
    function tick(ts) {
        if (!ui.playing)
            return;
        if (!lastTs)
            lastTs = ts;
        const dt = (ts - lastTs) / 1000;
        if (dt < 1 / 30)
            return void (raf = requestAnimationFrame(tick));
        lastTs = ts;
        const t0 = player.getTime();
        let t1 = scale.time(Math.min(1, scale.pos(t0) + (Math.min(dt, 0.1) * ui.speed) / SECONDS_FULL));
        if (t1 <= t0)
            t1 = Math.min(sit.clock.end, t0 + 0.02);
        const hold = !player.autopilot && !ui.review ? talon.holdBetween(t0, t1) : null;
        if (hold)
            t1 = hold.t;
        player.setTime(t1, { fadeMs: 450 });
        if (!ui.review)
            ui.liveT = Math.max(ui.liveT, t1);
        if (hold) {
            ui.hold = hold.item;
            // The decision card in the stack is the surface for this — the chat stays closed.
            return stopPlay();
        }
        if (t1 >= sit.clock.end - 1e-3)
            return stopPlay();
        raf = requestAnimationFrame(tick);
    }
    function onPhase(s) {
        if (ui.follow && ui.playing && s.phase.camera)
            engine.flyTo({ ...s.phase.camera, durationMs: 1800 });
    }
    function nextBeat() {
        const t = player.getTime();
        const cands = [...talon.markers(t, sit.clock.end).map((m) => m.t), ...sit.phases.map((p, i) => player.phaseStart(i))].filter((x) => Number.isFinite(x) && x > t + 0.05).sort((a, b) => a - b);
        const to = Math.min(cands[0] ?? sit.clock.end, sit.clock.end);
        const hold = !player.autopilot ? talon.holdBetween(t, to + 0.25) : null;
        const target = hold ? hold.t : to + 0.25;
        stopPlay();
        player.setTime(Math.min(target, sit.clock.end), { fadeMs: 450 });
        ui.liveT = Math.max(ui.liveT, player.getTime());
        const ph = player.getState().phase;
        if (ui.follow && ph.camera)
            engine.flyTo({ ...ph.camera, durationMs: 1600 });
    }
    // ------------------------------------------------------------------ dock slots
    function slotCols() {
        const w = innerWidth - 30;
        return w >= 1180 ? 4 : w >= 860 ? 3 : w >= 540 ? 2 : 1;
    }
    function available(w, ps) {
        if (w === 'feed')
            return ps.units.some((u) => u.kind === 'drone' && (u.altitudeFt ?? 0) > 0);
        if (w === 'evac')
            return !!player.boardAt('evac');
        if (w === 'growth')
            return !!growth && ps.layers.some((l) => l.group === 'firePerimeter' && /^fire/.test(l.id));
        return true;
    }
    function composition(ps, ts) {
        const cols = slotCols();
        const nOp = cols >= 3 ? 2 : cols === 2 ? 1 : 0;
        // Stage-first: the situation's own modules lead (TALON's hints + the phase's),
        // the operator's pins follow. No filler — an unused column stays empty.
        const talonSlots = [];
        for (const d of ts.dock) {
            if (talonSlots.length >= cols - nOp)
                break;
            if (talonSlots.some((s) => s.w === d.widget) || !available(d.widget, ps))
                continue;
            talonSlots.push({ w: d.widget, reason: d.reason });
        }
        const op = ui.pinned.slice(0, nOp).filter((w) => !talonSlots.some((s) => s.w === w) && available(w, ps));
        return { cols, op, talonSlots };
    }
    const feedHost = document.createElement('div');
    feedHost.className = 'feedhost';
    function renderSlots(ps, ts) {
        const c = composition(ps, ts);
        const slots = $('#slots');
        slots.style.setProperty('--cols', String(c.cols));
        const layout = [...c.op.map((w) => ({ w, by: 'op', reason: '' })), ...c.talonSlots.map((s) => ({ w: s.w, by: 'talon', reason: s.reason }))];
        if (changed('layout', layout.map((l) => l.w + l.by))) {
            slots.innerHTML = layout.map((l, i) => `<article class="widget glass ${l.w === 'feed' ? 'feed' : ''} ${l.by === 'talon' ? 'by-talon' : ''}" data-w="${l.w}" data-slot="${i}"><header></header><div class="wbody" tabindex="0"></div></article>`).join('');
            for (const k of [...keys.keys()])
                if (k.startsWith('w:'))
                    keys.delete(k);
        }
        slots.querySelectorAll('.widget').forEach((el, i) => renderWidget(el, layout[i], ps, ts));
        if (!layout.some((l) => l.w === 'feed') && engine.getPip())
            engine.closeDronePip();
    }
    function widgetHeader(w, by, reason, extra = '') {
        const title = WIDGETS[w]?.title ?? w;
        return by === 'talon'
            ? `<h3 title="TALON put this here${reason ? `: ${esc(reason)}` : ''}">${title}</h3><span class="grow" title="TALON put this here${reason ? `: ${esc(reason)}` : ''}">${reason ? `TALON · ${esc(reason)}` : ''}</span>${extra}<button class="btn icon sm ghost" data-act="pin" data-w="${w}" aria-label="Pin ${title} to your side" title="Pin to your side">${ic('pin', 'sm')}</button>`
            : `<button class="btn ghost sm" data-act="pop" data-pop="slot:${w}" style="padding:0 4px;margin-left:-4px" aria-haspopup="menu"><h3>${title}</h3>${ic('down', 'xs')}</button><span class="grow"></span>${extra}`;
    }
    function renderWidget(el, l, ps, ts) {
        const body = el.querySelector('.wbody');
        const head = el.querySelector('header');
        const key = `w:${el.dataset.slot}`;
        if (l.w === 'feed')
            return renderFeed(el, head, body, l, ps, ts);
        let html = '';
        let extra = '';
        let k;
        if (l.w === 'weather') {
            const T = ps.telemetry;
            k = [T, l.reason];
            const cell = (label, v, cls = '') => (v ? `<div class="cell ${cls}"><small>${label}${v.basis ? `<span class="prov ${v.basis}">${v.basis.slice(0, 3)}</span>` : ''}</small><b>${esc(v.value)}</b></div>` : '');
            const w = T.wind;
            html = `<div class="wx two">${w ? `<div class="cell wide"><svg class="windarrow" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="none" stroke="var(--border-strong)"/><g transform="rotate(${w.dir ?? 0} 16 16)"><path d="M16 6v20M16 6l-4 5M16 6l4 5" fill="none" stroke="var(--text-1)" stroke-width="1.8" stroke-linecap="round"/></g></svg><div style="min-width:0"><small style="font-size:var(--fs-micro);color:var(--text-3);display:flex;gap:6px">Wind<span class="prov measured">mea</span></small><b style="font:var(--fw-semibold) var(--fs-title)/1.15 var(--font-mono)">${esc(w.value)}</b></div></div>` : ''}${cell('RH', T.rh)}${cell('Temp', T.temp)}${cell('Fuel', T.fuel, 'wide')}${cell('Spread', T.spread) || cell('Danger', T.status)}</div>
        ${T.status ? `<div class="srow" style="margin-top:6px"><i class="dot ${T.status.level === 'bad' ? 'bad' : T.status.level === 'warn' ? 'warn' : 'ok'}"></i>${esc(T.status.value)} <span style="color:var(--text-4)">· ${esc(T.status.source ?? '')}</span></div>` : ''}`;
        }
        else if (l.w === 'fleet') {
            k = [ps.units, Math.floor(ps.t * 2)];
            html = ps.units.map((u) => unitRow(u, ps.t)).join('');
            extra = `<span class="chip">${ps.units.length}</span>`;
        }
        else if (l.w === 'evac') {
            const b = player.boardAt('evac');
            k = [b, ps.committed];
            const sw = { z1: 'var(--map-red)', z2: 'var(--map-amber)', z3: 'var(--map-ok)' };
            html = b
                ? `${(b.zones ?? []).map((z) => `<div class="zrow"><b><i class="sw" style="background:${sw[z.id] ?? 'var(--text-3)'}"></i>${esc(z.name)} · ${esc(z.kind)}${z.state === 'proposed' ? ' <span class="chip" style="height:18px">proposed</span>' : ''}</b><small>${z.households ? `${z.households} homes` : ''}${typeof z.cleared === 'number' ? ` · <b class="num" style="display:inline;color:var(--text-1)">${z.cleared}%</b>` : ''}</small>${typeof z.cleared === 'number' ? `<div class="bar"><i style="width:${z.cleared}%"></i></div>` : ''}</div>`).join('')}
          ${(b.routes ?? []).map((r) => `<div class="srow"><i class="dot ${r.level ?? 'muted'}"></i><span style="color:var(--text-1)">${esc(r.name)}</span><span style="margin-left:auto">${esc(r.status)}</span></div>`).join('')}
          ${b.choke ? `<div class="srow"><i class="dot ${b.choke.level}"></i>${esc(b.choke.text)}</div>` : ''}${b.alerts ? `<div class="srow"><i class="dot ${b.alerts.level}"></i>${esc(b.alerts.text)}</div>` : ''}`
                : '<div class="empty">No evacuation plan exists.</div>';
            extra = b ? `<span class="prov authored">aut</span>` : '';
        }
        else if (l.w === 'growth') {
            k = [Math.round(ps.t * 2), ps.hindsight, ps.layers.some((x) => x.id === 'fire-rev')];
            html = growth ? growthChart(growth, ps) : '';
            extra = '<span class="prov modeled">mod</span>';
        }
        else if (l.w === 'events') {
            const mk = talon.markers(ps.t, ui.review ? sit.clock.end : Math.max(ui.liveT, ps.t)).filter((m) => m.kind !== 'answer');
            k = [mk.map((m) => [m.t, m.label, m.future])];
            html = mk.length ? mk.map((m) => `<button class="erow ${m.future ? 'future' : ''}" data-act="jump" data-t="${m.t}"><time>${fmtT(m.t)}</time><i class="dot ${m.kind === 'interrupt' ? 'critical' : m.kind === 'ask' ? 'needs' : m.kind === 'dissent' ? 'needs' : 'done'}"></i><span>${esc(m.label)}</span></button>`).join('') : '<div class="empty">No events yet.</div>';
        }
        if (changed(key, [l, k])) {
            head.innerHTML = widgetHeader(l.w, l.by, l.reason, extra);
            body.innerHTML = html;
        }
    }
    function unitRow(u, t) {
        const st = u.status === 'enroute' ? 'working' : u.status === 'alert' ? 'needs' : u.status === 'standby' ? '' : 'done';
        const bat = typeof u.info.battery === 'number' ? `<span class="bat" title="Battery ${u.info.battery}%"><i style="width:${Math.max(6, Number(u.info.battery) * 0.16)}px"></i></span>` : '';
        const eta = u.arrives && u.kind !== 'drone' ? `ETA ${fmtDur(u.arrives - t)}` : '';
        return `<button class="urow" data-act="unit" data-unit="${u.id}" data-hl="${u.id}">${ic(u.kind === 'drone' ? 'drone' : u.kind === 'dozer' ? 'dozer' : u.kind === 'law' ? 'law' : u.kind === 'crew' ? 'crew' : 'engine', 'xs')}<b>${esc(u.id)}</b><span><i class="dot ${st}" style="display:inline-block;width:6px;height:6px;margin-right:6px;vertical-align:1px"></i>${esc(u.detail ?? u.status ?? '')}</span><span class="eta">${bat} ${eta}</span></button>`;
    }
    function renderFeed(el, head, body, l, ps, ts) {
        const drones = ps.units.filter((u) => u.kind === 'drone' && (u.altitudeFt ?? 0) > 0);
        const want = drones.find((d) => d.id === ui.feedDrone)?.id ?? drones.find((d) => d.id === ts.feedSuggestion?.drone)?.id ?? drones[0]?.id ?? null;
        const sensor = ui.feedSensor ?? (ts.feedSuggestion?.drone === want ? ts.feedSuggestion?.sensor : null) ?? 'eo';
        if (changed(`w:${el.dataset.slot}`, [l, drones.map((d) => d.id), want, sensor])) {
            head.innerHTML = widgetHeader('feed', l.by, l.by === 'talon' ? '' : '', `${drones.length > 1 ? `<div class="seg" role="group" aria-label="Drone">${drones.map((d) => `<button data-act="feeddrone" data-unit="${d.id}" aria-pressed="${d.id === want}">${esc(d.id.replace('FT-', ''))}</button>`).join('')}</div>` : `<span class="chip">${esc(want ?? '–')}</span>`}<div class="seg" role="group" aria-label="Sensor"><button data-act="sensor" data-s="eo" aria-pressed="${sensor === 'eo'}">EO</button><button data-act="sensor" data-s="ir" aria-pressed="${sensor === 'ir'}">IR</button></div>`);
            if (feedHost.parentElement !== body) {
                body.innerHTML = '';
                body.appendChild(feedHost);
            }
            if (!want)
                feedHost.innerHTML = '<div class="empty">No drone airborne.</div>';
        }
        if (!want)
            return void (engine.getPip() && engine.closeDronePip());
        const pip = engine.getPip();
        if (!pip || pip.drone !== want || !feedHost.querySelector('.tte-pip')) {
            feedHost.innerHTML = '';
            try {
                engine.openDronePip(want, { host: feedHost, bar: false });
            }
            catch {
                /* drone left */
            }
        }
        if (engine.getPip()?.sensor !== sensor)
            engine.setPipSensor(sensor);
    }
    // ------------------------------------------------------------------ inspector (interrogate any mark)
    function renderInspector(ps) {
        const s = ui.sel;
        const el = $('#inspector');
        if (!changed('insp', [s, s?.kind === 'unit' ? ps.units.find((u) => u.id === s.id) : null, s?.kind === 'layer' ? ps.layers.find((l) => l.id === s.id) : null, ps.committed, ps.primary, Math.floor(ps.t)]))
            return;
        if (!s)
            return void (el.hidden = true);
        el.hidden = false;
        let title = '', sub = '', facts = [], acts = '';
        const pv = (p) => (p ? `<span class="prov ${p.basis}">${p.basis}</span> ${esc(p.source)}` : '–');
        if (s.kind === 'layer') {
            const L = ps.layers.find((l) => l.id === s.id);
            const def = sit.layers.find((l) => l.id === s.id?.replace(/^draft:/, ''));
            if (!L || !def)
                return void ((ui.sel = null), (el.hidden = true));
            title = L.name ?? def.name ?? L.id;
            sub = L.group === 'planDraft' ? 'Draft revision · awaiting approval' : L.state === 'proposed' ? 'Proposed · not authorized' : L.state === 'compromised' ? 'Compromised' : 'In force';
            facts = [['Basis', pv(L.provenance)], ['Owner', esc(OWNER[L.group] ?? 'Situation')], ['Since', `${fmtT(L.since)}${L.updated > L.since ? ` · updated ${fmtT(L.updated)}` : ''}`], ['State', esc(L.state)]];
            const spec = def.spec;
            if (spec.type === 'marker' && spec.detail)
                facts.unshift(['Detail', esc(spec.detail)]);
            if (def.route && canDecide()) {
                if (ps.primary === def.route)
                    acts = `<span class="chip ok">Primary egress</span>`;
                else if (!ps.committed && ps.gate?.open)
                    acts = `<button class="btn sm" data-act="route" data-route="${def.route}">Make primary (edits the proposal)</button>`;
                else if (ps.committed)
                    acts = `<button class="btn sm" data-act="route" data-route="${def.route}">Propose as primary (stages a draft)</button>`;
            }
        }
        else if (s.kind === 'unit') {
            const u = ps.units.find((x) => x.id === s.id);
            if (!u)
                return void ((ui.sel = null), (el.hidden = true));
            title = `${u.id}${u.name ? ` · ${u.name}` : ''}`;
            sub = `${u.type ?? u.kind}${u.info.role ? ` · ${u.info.role}` : ''}`;
            facts = [['Status', esc(u.status ?? 'active')], ['Task', esc(u.detail ?? '–')], ['Basis', pv(u.provenance)]];
            if (u.arrives && u.kind !== 'drone')
                facts.push(['Arrives', `${fmtT(u.arrives)} · in ${fmtDur(u.arrives - ps.t)}`]);
            if (u.info.battery !== undefined)
                facts.push(['Battery', `${u.info.battery}%`]);
            if (u.info.payload)
                facts.push(['Payload', esc(u.info.payload)]);
            acts = `<button class="btn sm" data-act="message" data-unit="${u.id}">${ic('chat', 'xs')}Message</button><button class="btn sm" data-act="flyunit" data-unit="${u.id}">Show</button>${u.kind === 'drone' && (u.altitudeFt ?? 0) > 0 ? `<button class="btn sm" data-act="feeddrone" data-unit="${u.id}">Open feed</button>` : ''}`;
        }
        else {
            title = s.info?.title ?? 'Location';
            sub = s.info?.sub ?? '';
            facts = Object.entries(s.info ?? {}).filter(([k2]) => k2 !== 'title' && k2 !== 'sub');
        }
        el.innerHTML = `<header><div class="grow"><h2>${esc(title)}</h2><div class="sub">${esc(sub)}</div></div><button class="btn icon sm ghost" data-act="closeinsp" aria-label="Close">${ic('close', 'sm')}</button></header><dl class="facts">${facts.map(([k2, v]) => `<dt>${esc(k2)}</dt><dd>${v}</dd>`).join('')}</dl>${acts ? `<div class="acts">${acts}</div>` : ''}`;
    }
    // ------------------------------------------------------------------ attention: TALON points at the map
    function evPoint(e) {
        if (e.unit)
            return engine.getUnitPosition(e.unit);
        if (e.point)
            return e.point;
        if (e.layers?.length)
            return layerPoint(sit, e.layers[0]);
        return null;
    }
    function renderAttention(ts) {
        const hov = ui.hoverEv;
        const ev = hov ? hov.ev[0] : ts.attention?.evidence;
        const label = hov ? hov.label : ts.attention ? ts.attention.evidence.label : '';
        const p = ev ? evPoint(ev) : null;
        const k = [p?.map(Math.round), label, !!hov];
        if (!changed('att', k))
            return;
        engine.setOverlayLayer('talon:focus', p ? { type: 'marker', position: p, icon: 'focus', tone: 'violet', title: ev?.layers?.length || ev?.unit ? '' : `TALON · ${label.toUpperCase()}` } : null, { fadeMs: 200 });
        const ids = hov ? hov.ev.flatMap((e) => e.layers ?? []) : null;
        engine.setLayerEmphasis(ids && ids.length ? [...ids, 'talon:focus', 'labels'] : null, 220);
        engine.highlightUnit(hov ? hov.ev.find((e) => e.unit)?.unit ?? null : null);
    }
    function evidenceFor(ref) {
        const [scope, idx] = ref.split('|');
        let list;
        if (scope.startsWith('e:'))
            list = talon.state().log.find((e) => e.id === scope.slice(2))?.evidence;
        else
            list = talon.item(scope)?.evidence;
        const e = list?.[Number(idx)];
        return e ? [e] : [];
    }
    function showOnMap(ev) {
        const p = ev.map(evPoint).find(Boolean);
        if (p)
            engine.flyTo({ target: p, range: 1700, pitch: 56, durationMs: 1200 });
    }
    // ------------------------------------------------------------------ popovers
    function openPop(name, anchor) {
        closePop();
        ui.pop = name;
        const pop = document.createElement('div');
        pop.className = 'pop glass';
        pop.id = 'pop';
        pop.setAttribute('role', name === 'sit' || name.startsWith('slot:') ? 'menu' : 'dialog');
        pop.innerHTML = popContent(name);
        app.appendChild(pop);
        const r = anchor.getBoundingClientRect();
        const pr = pop.getBoundingClientRect();
        const right = r.left > innerWidth / 2;
        pop.style.top = `${clamp(name.startsWith('slot:') ? r.top - pr.height - 8 : right && !name.startsWith('slot') && name !== 'sit' ? r.top : r.bottom + 8, 8, innerHeight - pr.height - 8)}px`;
        pop.style.left = `${clamp(right && name !== 'sit' ? r.left - pr.width - 10 : r.left, 8, innerWidth - pr.width - 8)}px`;
        schedule();
    }
    function closePop() {
        document.getElementById('pop')?.remove();
        if (ui.pop) {
            ui.pop = null;
            schedule();
        }
    }
    function popContent(name) {
        if (name === 'sit')
            return `<div class="caps" style="padding:4px 8px">Exercise situation</div>${SITUATIONS.map((s) => `<button class="menu-item" role="menuitemradio" aria-checked="${s.id === ui.sit}" data-act="situation" data-sit="${s.id}"><span><b>${s.name}</b><small>${s.sub}</small></span></button>`).join('')}`;
        if (name === 'agents') {
            // The One task list: agents with their live lines, then what is waiting on you.
            const ts = talon.state();
            const mine = ts.open.filter((o) => !o.item.reraise);
            const routed = ts.open.filter((o) => o.item.reraise);
            return `<h3 class="caps">TALON agents</h3>
        ${ts.agents.map((a) => `<button class="menu-item" data-act="agent" data-agent="${a.id}"><i class="dot ${a.status === 'idle' ? '' : a.status}" style="margin-top:5px"></i><span><b>${esc(a.name)}</b><small>${esc(a.line)}</small></span></button>`).join('')}
        ${mine.length ? `<div class="caps ghead">Waiting on you</div>${mine.map((o) => `<button class="menu-item" data-act="panel"><i class="dot needs" style="margin-top:5px"></i><span><b>${esc(talon.text(o.item.title, player.getTime()))}</b><small>${esc(talon.agentName(o.item.agent))} · waits for you</small></span></button>`).join('')}` : `<div class="caps ghead">Nothing needs you${ts.handled ? ` · ${ts.handled} handled under standing orders` : ''}</div>`}
        ${routed.map((o) => `<div class="menu-item" style="cursor:default"><i class="dot working" style="margin-top:5px"></i><span><b>${esc(o.item.title)}</b><small>routed to ${esc(o.item.reraise.to)} · you are copied</small></span></div>`).join('')}`;
        }
        if (name === 'arc') {
            // The journey, on demand: the operator follows the incident, not the process.
            const ps = player.getState();
            const cur = ps.phaseIndex;
            const rows = sit.phases.map((p, i) => {
                const start = player.phaseStart(i);
                const state = i < cur ? 'done' : i === cur ? 'now' : Number.isFinite(start) ? 'next' : 'wait';
                const label = state === 'done' ? 'done' : state === 'now' ? 'current' : state === 'next' ? 'pending' : `waiting on ${p.after ? 'your decision' : 'the exercise'}`;
                return `<button class="menu-item" data-act="jump" data-t="${start}" ${Number.isFinite(start) && state !== 'now' ? '' : 'disabled'}>
          <span><b>${esc(p.name)}</b><small>${Number.isFinite(start) ? fmtT(start) : 'not started'}${p.gate ? ` · gate ${fmtT(p.gate.expires)}` : ''}</small></span>
          <span class="chip ${state === 'now' ? 'needs' : state === 'done' ? 'ok' : ''}" style="height:20px">${label}</span></button>`;
            }).join('');
            return `<h3 class="caps">Incident journey</h3><p style="margin:0 0 10px;color:var(--text-2);font-size:var(--fs-caption);max-width:320px">Where the incident stands. The console shows what is happening now; this is the record and what is pending.</p>${rows}`;
        }
        if (name.startsWith('slot:')) {
            const cur = name.slice(5);
            return `<div class="caps" style="padding:4px 8px">Show in this slot</div>${Object.entries(WIDGETS).map(([id, w]) => `<button class="menu-item" role="menuitemradio" aria-checked="${id === cur}" data-act="setslot" data-from="${cur}" data-w="${id}"><span><b>${w.title}</b></span></button>`).join('')}`;
        }
        if (name === 'layers') {
            const present = new Map();
            for (const l of player.getState().layers)
                (present.get(l.group) ?? present.set(l.group, []).get(l.group)).push(l);
            return `<h3 class="caps">Layers</h3>${LAYER_GROUPS.map(([g, n, sub]) => {
                const ls = present.get(g) ?? [];
                const bases = [...new Set(ls.map((l) => l.provenance?.basis).filter(Boolean))];
                return `<div class="lrow ${ls.length ? '' : 'absent'}" role="switch" tabindex="0" aria-checked="${!hiddenGroups.has(g)}" data-act="group" data-g="${g}"><span>${bases.map((b) => `<span class="prov ${b}">${b.slice(0, 3)}</span>`).join('')}</span><span class="nm">${n}<small>${ls.length ? sub : 'Not at this time'}</small></span><span class="switch"></span></div>`;
            }).join('')}<div class="caps ghead">Base map</div>${BASE_LAYERS.map(([id, n]) => `<div class="lrow" role="switch" tabindex="0" aria-checked="${engine.isLayerVisible(id)}" data-act="base" data-g="${id}"><span></span><span class="nm">${n}</span><span class="switch"></span></div>`).join('')}
        <div class="caps ghead">Plan status</div>
        <div class="legend-row"><svg viewBox="0 0 28 12"><path d="M1 6h26" stroke="var(--map-cyan)" stroke-width="3"/></svg>Committed</div>
        <div class="legend-row"><svg viewBox="0 0 28 12"><path d="M1 3.8h26M1 8.2h26" stroke="var(--map-cyan)" stroke-width="1.3"/></svg>Proposed · not authorized</div>
        <div class="legend-row"><svg viewBox="0 0 28 12"><path d="M1 6h26" stroke="var(--map-amber)" stroke-width="1.8" stroke-dasharray="7 4" opacity=".75"/></svg>Draft revision</div>
        <div class="legend-row"><svg viewBox="0 0 28 12"><path d="M1 6h26" stroke="var(--map-red)" stroke-width="3" stroke-dasharray="3 3"/></svg>Compromised</div>
        <div class="legend-row"><svg viewBox="0 0 28 12"><circle cx="14" cy="6" r="4" fill="none" stroke="var(--talon)" stroke-width="1.6"/></svg>TALON is pointing here</div>`;
        }
        if (name === 'authority')
            return `<h3 class="caps">What TALON may do</h3><p style="margin:0 0 10px;color:var(--text-2);font-size:var(--fs-caption);max-width:320px">TALON never executes on its own initiative. It acts only inside standing orders your agency pre-authorized, and says so each time. Everything else waits for you. Set by the agency administrator.</p>
        <table style="border-collapse:collapse;font-size:var(--fs-caption);width:340px">${[
                ['Read every feed and sensor', 'Always', ''],
                ['Model, re-run, draft plans', 'Always', 'Drafts are proposals, never executions'],
                ['Send a drone to look', 'Standing order', 'SO-2 · pre-cleared airspace only'],
                ['Standard first response', 'Run card', 'ENC-N / ENC-H by fire-weather level'],
                ['Share intel with assigned units', 'Standing order', 'SO-4'],
                ['Escalate, request mutual aid', 'You decide', ''],
                ['Evacuation orders, public alerts', 'You decide', 'TALON drafts and checks the geofence'],
                ['Hide or remove data', 'Never', ''],
                ['Override you', 'Never', 'A re-raise goes to the Regional Duty Supervisor'],
            ].map(([a, b, c]) => `<tr style="border-top:1px solid var(--border-subtle)"><td style="padding:7px 8px 7px 0;color:var(--text-1)">${a}${c ? `<div style="color:var(--text-3);font-size:var(--fs-micro)">${c}</div>` : ''}</td><td style="padding:7px 0;white-space:nowrap;color:${b === 'Never' ? 'var(--critical)' : b === 'You decide' ? 'var(--needs)' : 'var(--text-2)'}">${b}</td></tr>`).join('')}</table>`;
        if (name === 'settings') {
            const ai = ui.ai;
            const prov = ui.aiProvider ?? ai?.provider ?? 'openai';
            return `<h3 class="caps">Settings</h3>${[
                ['follow', 'Camera follows the exercise', ui.follow],
                ['sound', 'Sound for asks and interrupts', ui.sound],
            ].map(([k, n, v]) => `<div class="lrow" role="switch" tabindex="0" aria-checked="${v}" data-act="setting" data-k="${k}" style="grid-template-columns:1fr auto"><span class="nm">${n}</span><span class="switch"></span></div>`).join('')}
        <div class="lrow" role="switch" tabindex="0" aria-checked="${engine.getLighting() === 'day'}" data-act="lighting" style="grid-template-columns:1fr auto"><span class="nm">Day lighting<small>Exercise variant</small></span><span class="switch"></span></div>
        <div class="caps ghead">Live model · optional</div>
        <p style="margin:0 0 10px;color:var(--text-2);font-size:var(--fs-caption);max-width:320px">Plug in an API key and TALON's replies come from the model — grounded in the live situation, held by the truth guard, never executing anything. The key stays in this browser (localStorage). No key: scripted replies, unchanged.</p>
        <div class="airow"><span class="caps">Provider</span><div class="seg" role="group" aria-label="Provider"><button data-act="aiprovider" data-p="openai" aria-pressed="${prov === 'openai'}">OpenAI-compatible</button><button data-act="aiprovider" data-p="anthropic" aria-pressed="${prov === 'anthropic'}">Anthropic</button></div></div>
        <div class="airow"><span class="caps">Model</span><input class="in" id="aiModel" placeholder="e.g. gpt-4o-mini, claude-sonnet-4, gemini-2.0-flash" value="${esc(ai?.model ?? '')}" aria-label="Model"></div>
        <div class="airow"><span class="caps">API key</span><input class="in" id="aiKey" type="password" placeholder="stored in this browser only" value="${esc(ai?.key ?? '')}" aria-label="API key"></div>
        <div class="airow"><span class="caps">Base URL</span><input class="in" id="aiBase" placeholder="optional · e.g. a local server" value="${esc(ai?.baseUrl ?? '')}" aria-label="Base URL"></div>
        <div class="row" style="display:flex;gap:8px;margin-top:10px"><button class="btn sm primary" data-act="aisave">Apply</button>${ai?.key ? `<button class="btn sm ghost" data-act="aiclear">Use scripted replies</button>` : ''}</div>
        <button class="menu-item" data-act="intro"><span><b>How TALON works</b><small>Replay the introduction</small></span></button>`;
        }
        return '';
    }
    // ------------------------------------------------------------------ layer groups (operator controls visibility, doc 12 §5)
    const hiddenGroups = new Set();
    function applyHiddenGroups() {
        for (const l of player.getState().layers) {
            const hide = hiddenGroups.has(l.group);
            if (engine.isLayerVisible(l.id) === hide)
                engine.setLayerVisible(l.id, !hide);
        }
    }
    // ------------------------------------------------------------------ insets: the map centres between topbar, rail and board
    let insetKey = '';
    function updateInsets() {
        const top = $('#topbar').getBoundingClientRect().bottom + 6;
        const dock = $('#dock').getBoundingClientRect();
        const right = innerWidth - ($('#rail').getBoundingClientRect().left) + 6;
        const bottom = innerHeight - dock.top;
        document.documentElement.style.setProperty('--talon-w', `${Math.round(right)}px`);
        document.documentElement.style.setProperty('--dock-h', `${bottom}px`);
        const k = `${Math.round(top)}|${Math.round(right)}|${Math.round(bottom)}`;
        if (k === insetKey)
            return;
        const first = !insetKey;
        insetKey = k;
        engine.setViewInsets({ top, right, bottom, left: 0 }, first ? 0 : 280);
    }
    new ResizeObserver(() => {
        keys.delete('layout');
        schedule();
    }).observe(app);
    // ------------------------------------------------------------------ toasts
    function toast(msg, tone = '', item) {
        const el = document.createElement('div');
        el.className = `toast ${tone}`;
        el.setAttribute('role', tone === 'critical' ? 'alert' : 'status');
        el.innerHTML = `${tone === 'critical' ? '<i class="dot critical"></i>' : tone === 'needs' ? '<i class="dot needs"></i>' : ''}<span>${esc(msg)}</span>${item ? `<button class="btn sm" data-act="openitem" data-item="${item}">Open</button>` : ''}`;
        $('#toasts').appendChild(el);
        setTimeout(() => el.remove(), tone === 'critical' ? 7000 : 4200);
    }
    // ------------------------------------------------------------------ decisions
    function answer(itemId, optId, note) {
        const it = talon.item(itemId);
        const opt = it?.options?.find((o) => o.id === optId);
        if (!it || !opt || !canDecide())
            return;
        if (!opt.recommended && !opt.toggle && it.options?.some((o) => o.recommended) && note === undefined) {
            ui.dissent = { item: itemId, option: optId };
            keys.delete('now');
            schedule();
            setTimeout(() => document.getElementById('dissentText')?.focus(), 30);
            return;
        }
        const r = talon.answer(itemId, optId, note);
        ui.dissent = null;
        if (!r.ok)
            return toast(r.reason ?? 'Could not record that.');
        ui.lastSeen = player.getTime();
        if (ui.hold?.id === itemId)
            ui.hold = null;
        toast(`${opt.toggle ? 'Proposal edited' : 'Recorded'}: ${opt.label}`);
    }
    function command(text) {
        const ps = player.getState();
        const st = engine.getFieldStats();
        const facts = { acres: st ? st.reachedArea / 4046.86 : undefined, threatened: st?.threatened, destroyed: st?.destroyed, phase: SITUATIONS.find((s) => s.id === ui.sit)?.name ?? '', wall: sit.meta.epoch ? player.wallClock(ps.t) : fmtT(ps.t), units: ps.units, boards: { evac: player.boardAt('evac') }, lastSeen: ui.lastSeen };
        ui.lastSeen = ps.t;
        if (ui.ai?.key) {
            // Live model: the operator's message goes on the record now; the model answers
            // through the adapter — grounded in the snapshot, held by the truth guard.
            talon.command(text, facts, ps.t, { scripted: false });
            const agent = createTalonAgent(talon, player, ui.ai, {
                onItem: () => keys.clear(),
                onMessage: (unit) => setTimeout(() => { talon.crewReply(unit, `${unit}: Copy.`); keys.delete('now'); schedule(); }, 2500),
                onFocus: (ev) => { ui.hoverEv = { ev, label: ev[0]?.label ?? '' }; showOnMap(ev); setTimeout(() => { ui.hoverEv = null; keys.delete('att'); schedule(); }, 4500); },
            });
            void agent.ask(text, facts).then(() => { keys.delete('now'); schedule(); });
            ui.panel = true;
            ui.tab = 'now';
            keys.delete('now');
            return schedule();
        }
        const res = talon.command(text, facts, ps.t);
        if (res.evidence?.length) {
            ui.hoverEv = { ev: res.evidence, label: res.evidence[0].label };
            setTimeout(() => {
                ui.hoverEv = null;
                keys.delete('att');
                schedule();
            }, 4500);
            showOnMap(res.evidence);
        }
        if (res.open === 'review')
            setReview(true);
        if (res.to) {
            const unit = res.to;
            setTimeout(() => {
                talon.crewReply(unit, `${unit}: Copy. ${/hold|stay/i.test(text) ? 'Holding.' : 'Will do.'}`);
                keys.delete('now');
                schedule();
            }, 2600);
        }
        ui.tab = 'now';
        keys.delete('now');
        schedule();
    }
    function setReview(on) {
        stopPlay();
        ui.review = on;
        if (on)
            ui.panel = true; // the review lives in the chat card — open it there
        ui.tab = on ? 'review' : 'now';
        ui.dissent = null;
        if (!on) {
            player.hindsight = false;
            player.setTime(ui.liveT);
        }
        keys.clear();
        schedule();
    }
    let rec = null;
    function toggleVoice() {
        const W = window;
        const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
        if (!Ctor)
            return toast('Voice needs a browser with the Web Speech API (Chrome or Edge).');
        if (ui.listening)
            return rec?.stop();
        rec = new Ctor();
        rec.lang = 'en-US';
        rec.onresult = (e) => {
            const text = e.results[0][0].transcript;
            $('#cmd').value = text;
            command(text);
            $('#cmd').value = '';
        };
        rec.onend = () => {
            ui.listening = false;
            schedule();
        };
        ui.listening = true;
        ui.panel = true;
        rec.start();
        schedule();
    }
    // ------------------------------------------------------------------ onboarding & shortcuts
    const INTRO = [
        { h: "Hi, I'm TALON.", p: 'I watch the sensors, model the fire and draft plans, so you can decide in seconds instead of minutes. You are in command.', l: [] },
        { h: 'What I do without asking', p: 'Only inside standing orders your agency pre-authorized, and I say so every time.', l: [['look', 'Send a drone to look at a detection, in pre-cleared airspace'], ['model', 'Model the spread and keep the projection current'], ['share', 'Share intel with units already assigned'], ['card', 'Dispatch the run-card first response']] },
        { h: 'What waits for you', p: 'Press 1, 2 or 3 to answer. If you decline my recommendation, both of our positions go on the record.', l: [['esc', 'Escalation and mutual aid'], ['plan', 'Evacuation plans, orders and public alerts'], ['never', 'I never hide data, and I never override you. A re-raise goes to your supervisor, with new evidence only.']] },
    ];
    function intro(step = 0) {
        const s = INTRO[step];
        $('#overlay').innerHTML = `<div class="scrim" role="dialog" aria-modal="true" aria-label="Introduction"><div class="modal glass">${mascot(step === 2 ? 'focused' : 'calm')}<div class="steps">${INTRO.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div><h2>${s.h}</h2><p>${s.p}</p>${s.l.length ? `<ul>${s.l.map(([, t]) => `<li>${ic('check', 'sm')}<span>${esc(t)}</span></li>`).join('')}</ul>` : ''}<div class="row">${step ? `<button class="btn" data-act="intro-step" data-step="${step - 1}">Back</button>` : `<button class="btn ghost" data-act="intro-done">Skip</button>`}<button class="btn primary" data-act="${step < INTRO.length - 1 ? 'intro-step' : 'intro-done'}" data-step="${step + 1}">${step < INTRO.length - 1 ? 'Next' : 'Start watch'}</button></div></div></div>`;
        $('#overlay .btn.primary').focus();
    }
    function shortcuts() {
        const rows = [['1 – 3', 'Answer the card TALON is asking'], ['/', 'Type to TALON'], ['V', 'Voice command'], ['T', 'TALON chat — thread, log, review'], ['R', 'After-action review'], ['C', '2D / 3D map'], ['L', 'Day / night'], ['I', 'Thermal map'], ['Esc', 'Close chat, popovers, highlight'], ['Space', 'Exercise clock (harness)'], ['.', 'Next beat (harness)']];
        $('#overlay').innerHTML = `<div class="scrim" data-act="overlay-close"><div class="modal glass" role="dialog" aria-label="Keyboard shortcuts"><h2>Shortcuts</h2><div class="keys">${rows.map(([k, d]) => `<span class="kbd">${k}</span><span>${d}</span>`).join('')}</div><div class="row"><button class="btn primary" data-act="overlay-close">Done</button></div></div></div>`;
    }
    // ------------------------------------------------------------------ input wiring
    app.addEventListener('click', (e) => {
        const t = e.target;
        if (ui.pop && !t.closest('#pop') && !t.closest('[data-pop]'))
            closePop();
        const a = t.closest('[data-act]');
        if (!a || a.disabled)
            return;
        const d = a.dataset;
        switch (d.act) {
            case 'pop':
                return ui.pop === d.pop ? closePop() : openPop(d.pop, a);
            case 'situation':
                closePop();
                return void mount(d.sit);
            case 'setslot': {
                const i = ui.pinned.indexOf(d.from);
                if (i >= 0)
                    ui.pinned[i] = d.w;
                store.set('pinned', ui.pinned);
                closePop();
                keys.delete('layout');
                return schedule();
            }
            case 'pin': {
                ui.pinned = [d.w, ...ui.pinned.filter((w) => w !== d.w)].slice(0, 2);
                store.set('pinned', ui.pinned);
                keys.delete('layout');
                return schedule();
            }
            case 'panel': {
                const wasOpen = ui.panel;
                ui.panel = !ui.panel;
                if (ui.panel && !wasOpen) {
                    lastFocus = document.activeElement;
                    setTimeout(() => $('#ptabs button')?.focus(), 30);
                }
                else if (!ui.panel && lastFocus) {
                    lastFocus.focus();
                    lastFocus = null;
                }
                return schedule();
            }
            case 'scrub':
                ui.replay = !ui.replay;
                return schedule();
            case 'agent':
                ui.panel = true;
                ui.tab = 'log';
                ui.logAgent = d.agent;
                keys.delete('now');
                closePop();
                return schedule();
            case 'tab':
                ui.tab = d.tab;
                keys.delete('now');
                keys.delete('phead');
                return schedule();
            case 'logagent':
                ui.logAgent = d.agent;
                keys.delete('now');
                return schedule();
            case 'answer':
                return answer(d.item, d.opt);
            case 'dissent-cancel':
                ui.dissent = null;
                keys.delete('now');
                return schedule();
            case 'dissent-ok':
                if (ui.dissent)
                    answer(ui.dissent.item, ui.dissent.option, document.getElementById('dissentText')?.value ?? '');
                return;
            case 'coa':
                if (d.route && canDecide())
                    player.setActiveRoute(d.route);
                return;
            case 'route': {
                const r = player.setActiveRoute(d.route);
                toast(r === 'primary' ? 'Proposal edited: new primary egress.' : r === 'draft' ? 'Draft staged next to the committed plan.' : 'Already the primary egress.');
                return;
            }
            case 'why': {
                const it = talon.item(d.item);
                if (it) {
                    ui.panel = true;
                    ui.tab = 'now';
                    command('why');
                }
                return;
            }
            case 'showmap': {
                const it = talon.item(d.item);
                if (it?.evidence)
                    showOnMap(it.evidence);
                return;
            }
            case 'evfocus':
                return showOnMap(evidenceFor(d.ev));
            case 'openitem':
                ui.panel = true;
                ui.tab = 'now';
                keys.delete('now');
                return schedule();
            case 'unit':
            case 'flyunit': {
                const p = engine.getUnitPosition(d.unit);
                ui.sel = { kind: 'unit', id: d.unit };
                if (p)
                    engine.flyTo({ target: p, range: 1500, durationMs: 1100 });
                return schedule();
            }
            case 'message': {
                ui.panel = true;
                ui.tab = 'now';
                const inp = $('#cmd');
                inp.value = `@${d.unit} `;
                inp.focus();
                return schedule();
            }
            case 'feeddrone':
                ui.feedDrone = d.unit;
                if (!composition(player.getState(), talon.state()).talonSlots.some((s) => s.w === 'feed') && !ui.pinned.includes('feed')) {
                    ui.pinned = ['feed', ...ui.pinned].slice(0, 2);
                    keys.delete('layout');
                }
                return schedule();
            case 'sensor':
                ui.feedSensor = d.s;
                return schedule();
            case 'closeinsp':
                ui.sel = null;
                return schedule();
            case 'review':
                return setReview(!ui.review);
            case 'golive':
                player.setTime(ui.liveT);
                return;
            case 'jump':
                stopPlay();
                return scrubTo(Number(d.t));
            case 'replay':
                player.setTime(sit.clock.start);
                return startPlay();
            case 'hindsight':
                player.hindsight = !player.hindsight;
                keys.delete('now');
                return;
            case 'keys':
                return shortcuts();
            case 'overlay-close':
                if (t.closest('.modal') && !t.closest('button'))
                    return;
                $('#overlay').innerHTML = '';
                return;
            case 'intro':
                closePop();
                return intro(0);
            case 'intro-step':
                return intro(Number(d.step));
            case 'intro-done':
                store.set('intro', true);
                $('#overlay').innerHTML = '';
                return;
            case 'play':
                return ui.playing ? stopPlay() : startPlay();
            case 'speed':
                ui.speed = ui.speed >= 4 ? 0.5 : ui.speed * 2;
                return schedule();
            case 'beat':
                return nextBeat();
            case 'autopilot':
                ui.autopilot = !ui.autopilot;
                player.autopilot = ui.autopilot;
                toast(ui.autopilot ? 'Exercise autopilot on: the script takes the operator’s decisions.' : 'Exercise autopilot off: you decide.');
                return schedule();
            case 'aiprovider':
                ui.aiProvider = d.p;
                return schedule();
            case 'aisave': {
                const model = document.getElementById('aiModel')?.value.trim() ?? '';
                const key = document.getElementById('aiKey')?.value.trim() ?? '';
                const baseUrl = document.getElementById('aiBase')?.value.trim() ?? '';
                ui.ai = key && model ? { provider: ui.aiProvider ?? 'openai', model, key, baseUrl: baseUrl || undefined } : null;
                store.set('ai', ui.ai);
                closePop();
                toast(ui.ai ? `Live model on · ${ui.ai.model} · grounded, truth-guarded, never executing` : 'Scripted replies.');
                return schedule();
            }
            case 'aiclear':
                ui.ai = null;
                store.set('ai', null);
                closePop();
                toast('Scripted replies.');
                return schedule();
            case 'mic':
                return toggleVoice();
            case 'group': {
                const g = d.g;
                hiddenGroups.has(g) ? hiddenGroups.delete(g) : hiddenGroups.add(g);
                for (const l of player.getState().layers)
                    if (l.group === g)
                        engine.setLayerVisible(l.id, !hiddenGroups.has(g));
                a.setAttribute('aria-checked', String(!hiddenGroups.has(g)));
                return;
            }
            case 'base':
                engine.setLayerVisible(d.g, !engine.isLayerVisible(d.g));
                a.setAttribute('aria-checked', String(engine.isLayerVisible(d.g)));
                return;
            case 'setting': {
                const k = d.k;
                ui[k] = !ui[k];
                store.set(k, ui[k]);
                a.setAttribute('aria-checked', String(ui[k]));
                return;
            }
            case 'lighting':
                engine.setLighting(engine.getLighting() === 'day' ? 'night' : 'day', 1400);
                a.setAttribute('aria-checked', String(engine.getLighting() !== 'day'));
                return;
            case 'view':
                return engine.setCamera(engine.getCameraMode() === 'perspective' ? 'topdown' : 'perspective', 1200);
            case 'zoomin':
            case 'zoomout': {
                const v = engine.getView();
                return engine.flyTo({ target: v.target, range: v.range * (d.act === 'zoomin' ? 0.6 : 1.6), pitch: v.pitch, bearing: v.bearing, durationMs: 400 });
            }
            case 'north': {
                const v = engine.getView();
                return engine.flyTo({ target: v.target, range: v.range, pitch: v.pitch, bearing: 0, durationMs: 600 });
            }
            case 'fit': {
                const cam = player.getState().phase.camera;
                if (cam)
                    engine.flyTo({ ...cam, durationMs: 1200 });
                return;
            }
            case 'ir': {
                const on = a.getAttribute('aria-pressed') !== 'true';
                engine.setThermal(on);
                a.setAttribute('aria-pressed', String(on));
                return;
            }
            case 'dockmin':
                ui.dockMin = !ui.dockMin;
                keys.delete('layout');
                return schedule();
        }
    });
    // Evidence hover: TALON points, the map dims everything else (focus + context).
    app.addEventListener('pointerover', (e) => {
        const c = e.target.closest('[data-ev]');
        const u = e.target.closest('[data-hl]');
        if (u)
            engine.highlightUnit(u.dataset.hl);
        if (!c)
            return;
        const ev = evidenceFor(c.dataset.ev);
        if (!ev.length)
            return;
        ui.hoverEv = { ev, label: ev[0].label };
        schedule();
    });
    app.addEventListener('pointerout', (e) => {
        const c = e.target.closest('[data-ev]');
        if (e.target.closest('[data-hl]'))
            engine.highlightUnit(null);
        if (c && !c.contains(e.relatedTarget)) {
            ui.hoverEv = null;
            schedule();
        }
    });
    // Rail tooltips (One-style pills to the left of the rail).
    app.addEventListener('pointerover', (e) => {
        const b = e.target.closest('[data-tip]');
        const tip = $('#tip');
        if (!b)
            return tip.classList.remove('on');
        const [a, sub] = (b.dataset.tip ?? '').split('|');
        tip.innerHTML = `${b.querySelector('.dot')?.outerHTML ?? ''}<span>${esc(a)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}`;
        const r = b.getBoundingClientRect();
        tip.style.top = `${r.top + r.height / 2 - 15}px`;
        tip.style.left = `${r.left - tip.offsetWidth - 10}px`;
        tip.classList.add('on');
    });
    $('#composer').addEventListener('submit', (e) => {
        e.preventDefault();
        const inp = $('#cmd');
        if (!inp.value.trim())
            return;
        command(inp.value);
        inp.value = '';
    });
    $('#suggest').addEventListener('click', (e) => {
        const b = e.target.closest('[data-say]');
        if (b)
            command(b.dataset.say);
    });
    // Map: interrogate anything.
    let layerHit = 0;
    engine.on('layerclick', ({ id }) => {
        layerHit = performance.now();
        ui.sel = { kind: 'layer', id };
        schedule();
    });
    engine.on('unitclick', (id) => {
        layerHit = performance.now();
        ui.sel = { kind: 'unit', id };
        const u = player.getState().units.find((x) => x.id === id);
        if (u?.kind === 'drone' && (u.altitudeFt ?? 0) > 0)
            ui.feedDrone = id;
        schedule();
    });
    {
        let down = { x: 0, y: 0 };
        const map = $('#map');
        map.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
        map.addEventListener('click', (e) => {
            if (performance.now() - layerHit < 80 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5)
                return;
            if (e.target.closest('.tte-pill, .tte-mt'))
                return;
            const r = engine.pick(e.clientX, e.clientY);
            if (!r)
                return;
            const ps = player.getState();
            for (const z of ['evac-order', 'evac-warning', 'evac-safe']) {
                const L = ps.layers.find((l) => l.id === z);
                const def = sit.layers.find((l) => l.id === z);
                if (L && def && def.spec.type === 'polygon' && def.spec.rings.some((ring) => inRing(r.x, r.y, ring))) {
                    ui.sel = { kind: 'layer', id: z };
                    return schedule();
                }
            }
            const f = r.fire;
            ui.sel = { kind: 'place', point: [r.x, r.y], info: { title: r.latLonText, sub: `${fmtN(r.elevation)} m · ${Math.round(r.slopeDeg)}° slope · ${r.aspect}`, Cover: esc(r.cover), Fuel: esc(r.fuel), Fire: f.state === 'burned' ? `Inside the perimeter${f.burnedAt ? ` · ${esc(f.burnedAt)}` : ''}` : `Outside${f.distanceToFront !== undefined ? ` · front ${fmtN(f.distanceToFront)} m` : ''}` } };
            schedule();
        });
        let pend = null;
        map.addEventListener('pointermove', (e) => {
            if (e.buttons || e.pointerType === 'touch')
                return;
            if (!pend)
                requestAnimationFrame(() => {
                    const p = pend;
                    pend = null;
                    const r = engine.pick(p.x, p.y);
                    $('#readout').innerHTML = r ? `<span>${esc(r.latLonText)}</span><i>·</i><span>${fmtN(r.elevation)} m</span><i>·</i><span>${esc(r.cover)}</span>` : '';
                });
            pend = { x: e.clientX, y: e.clientY };
        });
        map.addEventListener('pointerleave', () => ($('#readout').innerHTML = ''));
    }
    engine.on('view', (v) => {
        const c = $('#compassNeedle');
        if (c)
            c.style.transform = `rotate(${-v.bearing}deg)`;
        $('#viewBtn').innerHTML = ic(v.mode === 'perspective' ? 'view3d' : 'view2d');
    });
    document.addEventListener('keydown', (e) => {
        const tgt = e.target;
        if (e.key === 'Escape') {
            closePop();
            $('#overlay').innerHTML = '';
            if (ui.panel) {
                ui.panel = false;
                lastFocus?.focus();
                lastFocus = null;
            }
            ui.dissent = null;
            ui.sel = null;
            ui.hoverEv = null;
            keys.delete('now');
            tgt.blur?.();
            return schedule();
        }
        if (tgt.id === 'track' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End')) {
            e.preventDefault();
            stopPlay();
            if (e.key === 'Home')
                scrubTo(sit.clock.start);
            else if (e.key === 'End')
                scrubTo(sit.clock.end);
            else
                scrubTo(player.getTime() + (e.key === 'ArrowRight' ? 1 : -1));
            return;
        }
        if (tgt.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) {
            if (tgt.id === 'dissentText' && e.key === 'Enter' && (e.metaKey || e.ctrlKey) && ui.dissent)
                answer(ui.dissent.item, ui.dissent.option, tgt.value);
            return;
        }
        const k = e.key.toLowerCase();
        if (/^[1-9]$/.test(k)) {
            const ts = talon.state();
            const top = ts.open.find((o) => !o.item.reraise);
            const opts = (top?.item.options ?? []).filter((o) => !(top?.item.compare && o.toggle));
            const o = opts[Number(k) - 1];
            if (top && o) {
                e.preventDefault();
                answer(top.item.id, o.id);
            }
            return;
        }
        if (k === '/') {
            e.preventDefault();
            ui.panel = true;
            ui.tab = 'now';
            schedule();
            setTimeout(() => $('#cmd').focus(), 20);
        }
        else if (k === ' ') {
            e.preventDefault();
            ui.playing ? stopPlay() : startPlay();
        }
        else if (k === '.')
            nextBeat();
        else if (k === 't') {
            ui.panel = !ui.panel;
            schedule();
        }
        else if (k === 'r')
            setReview(!ui.review);
        else if (k === 'v')
            toggleVoice();
        else if (k === 'c')
            engine.setCamera(engine.getCameraMode() === 'perspective' ? 'topdown' : 'perspective', 1200);
        else if (k === 'l')
            engine.setLighting(engine.getLighting() === 'day' ? 'night' : 'day', 1400);
        else if (k === 'i') {
            const b = app.querySelector('[data-act=ir]');
            b.click();
        }
        else if (k === '?')
            shortcuts();
    });
    // ------------------------------------------------------------------ start
    await mount(ui.sit, params.get('phase'));
    if (params.get('autoplay') === '1')
        startPlay();
    $('#boot').classList.add('gone');
    if (!store.get('intro', false) && params.get('intro') !== '0')
        intro(0);
}
// ============================================================================
// Static shell
// ============================================================================
const SHELL = `
<header class="topbar glass" id="topbar"></header>
<div class="tools">
  <div class="toolgroup glass">
    <button class="btn compass" data-act="north" aria-label="Reset to north" title="North up"><svg viewBox="0 0 24 24" width="22" height="22" id="compassNeedle" aria-hidden="true"><path d="M12 3 15 12H9z" fill="var(--critical)"/><path d="M12 21 9 12h6z" fill="var(--n-8)"/></svg></button>
    <button class="btn" id="viewBtn" data-act="view" aria-label="2D / 3D (C)" title="2D / 3D (C)">${ic('view3d')}</button>
  </div>
  <div class="toolgroup glass">
    <button class="btn" data-act="zoomin" aria-label="Zoom in">${ic('plus')}</button>
    <button class="btn" data-act="zoomout" aria-label="Zoom out">${ic('minus')}</button>
    <button class="btn" data-act="fit" aria-label="Frame the incident" title="Frame the incident">${ic('fit')}</button>
  </div>
  <div class="toolgroup glass">
    <button class="btn" data-act="pop" data-pop="layers" aria-label="Layers" title="Layers">${ic('layers')}</button>
    <button class="btn" data-act="ir" aria-pressed="false" aria-label="Thermal map (I)" title="Thermal map (I)">${ic('ir')}</button>
  </div>
</div>
<div class="readout glass" id="readout" aria-hidden="true"></div>
<section class="inspector glass" id="inspector" aria-label="Inspector" hidden></section>
<div class="exhandle glass" id="exhandle" role="region" aria-label="Exercise controls (harness)" hidden></div>
<div class="timeline glass" id="timeline" role="region" aria-label="Incident timeline" hidden>
  <div class="exercise" id="exercise" aria-label="Exercise controls (harness)"></div>
  <div class="track" id="track" role="slider" aria-label="Incident timeline" aria-orientation="horizontal" tabindex="0">
    <div class="line"></div><div class="fill" id="tlfill"></div><div class="future" id="tlfuture"></div>
    <div id="tlmarks"></div><div class="head" id="tlhead"></div><div class="ticks" id="tlticks"></div><div class="scrubtip" id="scrubtip"></div>
  </div>
  <div class="tl-right"><span class="holdmsg" id="holdmsg"></span></div>
</div>
<section class="dock" id="dock" aria-label="Situation board">
  <div class="boardhead glass" id="boardhead"></div>
  <div class="slots" id="slots"></div>
</section>
<nav class="rail" id="rail" aria-label="TALON"></nav>
<div class="cards" id="cards" role="region" aria-label="TALON decision cards" aria-live="polite"></div>
<aside class="chat glass" id="panel" aria-label="TALON chat" hidden>
  <header class="phead" id="phead"></header>
  <nav class="ptabs" id="ptabs" role="tablist"></nav>
  <div class="pbody" id="pbody" aria-live="polite" tabindex="0"></div>
  <form class="composer" id="composer" autocomplete="off">
    <div class="suggest" id="suggest"><button type="button" class="chip" data-say="status">Status</button><button type="button" class="chip" data-say="what changed">What changed?</button><button type="button" class="chip" data-say="why">Why?</button><button type="button" class="chip" data-say="show route b">Show route B</button><button type="button" class="chip" data-say="help">Help</button></div>
    <div class="field"><input id="cmd" placeholder="Ask TALON, or @E-31 to message a unit" aria-label="Command"><button type="button" class="btn icon sm ghost" data-act="mic" aria-label="Voice">${ic('mic', 'sm')}</button><button class="btn icon sm" type="submit" aria-label="Send">${ic('send', 'sm')}</button></div>
    <div class="to">Talking to <b>TALON</b> · <span id="aiBasis">replies are scripted in this prototype</span></div>
  </form>
</aside>
<div class="toasts" id="toasts" aria-live="assertive"></div>
<div class="tip" id="tip" aria-hidden="true"></div>
<div id="overlay"></div>`;
// ============================================================================
// Time scale: dense moments get more room (segments weighted by √duration)
// ============================================================================
class TimeScale {
    constructor(sit) {
        const a = new Set([sit.clock.start, sit.clock.end, ...sit.phases.map((p) => p.t).filter((t) => t > sit.clock.start && t < sit.clock.end)]);
        this.anchors = [...a].sort((x, y) => x - y);
        this.cum = [0];
        for (let i = 1; i < this.anchors.length; i++)
            this.cum.push(this.cum[i - 1] + Math.sqrt(Math.max(0.01, this.anchors[i] - this.anchors[i - 1])));
    }
    pos(t) {
        const A = this.anchors, C = this.cum, tot = C[C.length - 1] || 1;
        if (A.length < 2)
            return 0;
        if (t <= A[0])
            return 0;
        for (let i = 1; i < A.length; i++)
            if (t <= A[i])
                return (C[i - 1] + ((t - A[i - 1]) / (A[i] - A[i - 1])) * (C[i] - C[i - 1])) / tot;
        return 1;
    }
    time(p) {
        const A = this.anchors, C = this.cum, tot = C[C.length - 1] || 1;
        if (A.length < 2)
            return A[0] ?? 0;
        const v = clamp(p, 0, 1) * tot;
        for (let i = 1; i < A.length; i++)
            if (v <= C[i])
                return A[i - 1] + ((v - C[i - 1]) / Math.max(1e-9, C[i] - C[i - 1])) * (A[i] - A[i - 1]);
        return A[A.length - 1];
    }
}
function buildGrowth(sit, world) {
    const f1 = sit.layers.find((l) => l.id === 'fire')?.spec;
    if (!f1 || f1.type !== 'field')
        return null;
    const rev = sit.layers.find((l) => l.id === 'fire-rev');
    const f2 = rev?.spec.type === 'field' ? rev.spec : null;
    const cellAc = (world.frame.widthMeters / f1.cols) * (world.frame.heightMeters / f1.rows) / 4046.86;
    const hist = (data) => Float32Array.from(data).sort();
    const h1 = hist(f1.data), h2 = f2 ? hist(f2.data) : null;
    const count = (h, t) => {
        let lo = 0, hi = h.length;
        while (lo < hi) {
            const m = (lo + hi) >> 1;
            if (h[m] <= t)
                lo = m + 1;
            else
                hi = m;
        }
        return lo * cellAc;
    };
    const t = [], a = [], b = [];
    const t0 = Math.max(sit.clock.start, sit.phases.find((p) => p.id === 'C')?.t ?? 0), t1 = sit.clock.end;
    for (let x = t0; x <= t1 + 1e-6; x += 1) {
        t.push(x);
        a.push(count(h1, x));
        if (h2)
            b.push(count(h2, x));
    }
    const sw = typeof rev?.from === 'number' ? rev.from : null;
    return { t, a, b: h2 ? b : null, switchAt: sw, max: Math.max(...a, ...(h2 ? b : [0])) };
}
function growthChart(g, ps) {
    const W = 300, H = 120, L = 30, B = 16, T = 8;
    const x = (t) => L + ((t - g.t[0]) / (g.t[g.t.length - 1] - g.t[0])) * (W - L - 4);
    const y = (v) => T + (1 - v / (g.max * 1.05)) * (H - T - B);
    const known = g.switchAt !== null && (ps.t >= g.switchAt || ps.hindsight);
    // What TALON projects now: the corrected field once the spot fire is known.
    const cur = known && g.b ? g.b : g.a;
    const path = (vals, from, to) => g.t.map((t, i) => [t, vals[i]]).filter(([t]) => t >= from && t <= to).map(([t, v], i) => `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const now = clamp(ps.t, g.t[0], g.t[g.t.length - 1]);
    const end = g.t[g.t.length - 1];
    const area = `${path(cur, g.t[0], now)}L${x(now).toFixed(1)},${y(0)}L${x(g.t[0])},${y(0)}Z`;
    const ticks = [0, 0.5, 1].map((k) => Math.round((g.max * k) / 10) * 10);
    const tT = [g.t[0], Math.round((g.t[0] + end) / 2), end];
    const nowV = cur[g.t.findIndex((t) => t >= now)] ?? 0;
    const legend = known && g.b ? `<div class="clegend"><span><i style="background:var(--viz-1)"></i>Projection now</span><span><i style="background:var(--viz-2)"></i>Earlier projection</span></div>` : `<div class="clegend"><span><i style="background:var(--viz-1)"></i>Burned area · projected after now (dashed)</span></div>`;
    return `<div style="display:grid;grid-template-rows:auto 1fr;height:100%;gap:4px"><div style="display:flex;align-items:baseline;gap:8px"><b class="num" style="font-size:var(--fs-heading)">${fmtN(nowV)} ac</b><span style="color:var(--text-3);font-size:var(--fs-micro)">at ${fmtT(ps.t)}</span><span class="grow"></span>${legend}</div>
    <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Burned area over time, ${fmtN(nowV)} acres now">
      ${ticks.map((v) => `<line class="grid" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${L - 4}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join('')}
      ${tT.map((t) => `<text class="axis" x="${x(t)}" y="${H - 3}" text-anchor="middle">${fmtT(t)}</text>`).join('')}
      <path class="s1f" d="${area}"/>
      ${known && g.b ? `<path class="s2" d="${path(g.a, g.switchAt ?? g.t[0], end)}"/>` : ''}
      <path class="s1" d="${path(cur, g.t[0], now)}"/><path class="s1 proj" d="${path(cur, now, end)}"/>
      <line class="now" x1="${x(now)}" x2="${x(now)}" y1="${T}" y2="${H - B}"/>
      <circle class="hdot" cx="${x(now)}" cy="${y(nowV)}" r="4" fill="var(--viz-1)"/>
    </svg></div>`;
}
function inRing(x, y, ring) {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
            c = !c;
    }
    return c;
}
