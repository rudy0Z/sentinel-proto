const DRAFT_PREFIX = 'draft:';
export class ScenarioPlayer {
    constructor(engine, situation, opts = {}) {
        this.overrides = [];
        this.applied = new Map();
        this.unitSig = '';
        this.listeners = new Map();
        this.offs = [];
        this.fadeMs = 0;
        this.lastPhase = -1;
        this.playing = false;
        this.playTimer = 0;
        this.feedByDirector = false;
        this.disposed = false;
        this.ctxCache = null;
        this.resolved = null;
        this.ver = 0;
        this._hindsight = false;
        /** When true, phase changes also move the camera and open the suggested feed. */
        this.director = true;
        if (situation.schema !== 'tte.situation/1')
            throw new Error(`scenarioPlayer: unsupported schema "${situation.schema}"`);
        this.engine = engine;
        this.situation = situation;
        this.director = opts.director ?? true;
        this._autopilot = opts.autopilot ?? false;
        this.t = situation.phases[opts.phase ?? 0]?.t ?? situation.clock.start;
        this.offs.push(engine.on('time', (t) => this.onTime(t)), engine.on('lighting', () => this.updateTimeLabel()), engine.on('pip', (p) => {
            if (!p.open)
                this.feedByDirector = false;
        }));
        engine.setSceneTime(this.t, 0);
        this.apply(0);
        this.lastPhase = this.phaseIndexAt(this.t);
        if (this.director)
            this.direct(this.lastPhase, 0);
    }
    // ------------------------------------------------------------------ public API
    /** Exercise playback: the script also takes the operator's decisions. */
    get autopilot() {
        return this._autopilot;
    }
    set autopilot(on) {
        if (on === this._autopilot)
            return;
        this._autopilot = on;
        this.changed(350);
    }
    /** Show what is known now (hindsight layers) at every time, e.g. in an after-action review. */
    get hindsight() {
        return this._hindsight;
    }
    set hindsight(on) {
        if (on === this._hindsight)
            return;
        this._hindsight = on;
        this.changed(450);
    }
    getState() {
        const t = this.t;
        const c = this.ctx(t);
        const r = this.resolve(t);
        const i = this.phaseIndexAt(t);
        const phases = this.situation.phases;
        const committed = this.committedAt(t);
        let gate = null;
        for (let k = i; k >= 0; k--) {
            const g = phases[k].gate;
            if (!g)
                continue;
            gate = { ...g, open: !committed && t < g.expires - 1e-6 && t >= this.phaseStartIn(k, c) - 1e-6 };
            break;
        }
        const ct = this.committedTime(c);
        return {
            t,
            phaseIndex: i,
            phase: phases[i],
            primary: r.primary,
            draft: r.draft,
            committed,
            committedT: committed && Number.isFinite(ct) ? ct : null,
            playing: this.playing,
            autopilot: this._autopilot,
            hindsight: this._hindsight,
            telemetry: this.telemetryAt(t),
            layers: [...r.layers.entries()].map(([id, l]) => ({ id, group: l.group, name: l.name, state: l.state, provenance: l.provenance, since: l.since, updated: l.updated })),
            units: r.units.meta,
            gate,
        };
    }
    /** Jump (tweened) to a phase: clock, layers with cross-fades, and, when directing, camera and feed. */
    setPhase(index, durationMs = 1600) {
        const phases = this.situation.phases;
        const i = Math.max(0, Math.min(phases.length - 1, Math.round(index)));
        if (!this.playing)
            this.stop();
        this.fadeMs = Math.min(700, Math.max(250, durationMs * 0.45));
        const start = this.phaseStart(i);
        const p = phases[i];
        const to = Number.isFinite(start) ? start : p.t;
        this.engine.setSceneTime(to, durationMs);
        if (durationMs <= 0)
            this.onTime(to);
        if (this.director)
            this.direct(i, durationMs);
        this.lastPhase = i;
        this.emit('phase');
    }
    next(durationMs) {
        this.setPhase(this.phaseIndexAt(this.t) + 1, durationMs);
    }
    prev(durationMs) {
        const i = this.phaseIndexAt(this.t);
        // From inside a phase, "previous" returns to its start first.
        this.setPhase(this.t > this.phaseStart(i) + 0.01 ? i : i - 1, durationMs);
    }
    /** Scrub: instant, no camera moves. `fadeMs` cross-fades layers (live playback). */
    setTime(minutes, opts = {}) {
        this.stop();
        this.fadeMs = opts.fadeMs ?? 0;
        const c = this.situation.clock;
        this.engine.setSceneTime(Math.max(c.start, Math.min(c.end, minutes)), 0);
    }
    getTime() {
        return this.t;
    }
    phaseIndexAt(t) {
        const c = this.ctx(t);
        let i = 0;
        for (let k = 0; k < this.situation.phases.length; k++)
            if (this.phaseStartIn(k, c) <= t + 1e-6)
                i = k;
        return i;
    }
    /** When phase `i` starts given the decisions in force at `t` (Infinity while it is gated). */
    phaseStart(i, t = this.t) {
        return this.phaseStartIn(i, this.ctx(t));
    }
    /** Resolve any time reference against the decisions in force at `t`. */
    resolveRef(r, t = this.t) {
        return this.refIn(r, this.ctx(t));
    }
    /** Decisions in force at `t`, in order, with their source. */
    getDecisions(t = this.t) {
        return [...this.ctx(t).applied];
    }
    /** Every operator decision recorded this session (including ones after the current time). */
    getOverrides() {
        return [...this.overrides];
    }
    answerOf(item, t = this.t) {
        for (const d of this.ctx(t).applied)
            if (d.kind === 'answer' && d.item === item)
                return d;
        return null;
    }
    /** Record the operator's answer to a copilot question. Returns false if it was already answered. */
    answer(item, option, note) {
        if (this.answerOf(item))
            return false;
        this.decide({ at: this.t, kind: 'answer', item, option, by: 'operator', ...(note ? { note } : {}) });
        return true;
    }
    /**
     * A shell board at time t: keyframes in time order, each merged over the previous one
     * (objects by key, arrays of objects with an `id` by id), so a keyframe can carry only
     * what changed and decision-gated keyframes compose with the rest.
     */
    boardAt(name, t = this.t) {
        const c = this.ctx(t);
        const frames = (this.situation.boards?.[name] ?? [])
            .map((b, k) => ({ b, k, at: this.refIn(b.at, c) }))
            .filter((x) => x.at <= t + 1e-6)
            .sort((a, b) => a.at - b.at || a.k - b.k);
        if (!frames.length)
            return null;
        let out = undefined;
        for (const f of frames)
            out = mergeBoard(out, f.b.data);
        return out;
    }
    /** Autoplay through the remaining phases, then on to the end of the clock. */
    play() {
        if (this.playing)
            return;
        const ph = this.situation.phases;
        if (this.t >= this.situation.clock.end - 0.01)
            this.setPhase(0, 0);
        this.playing = true;
        this.emit('change');
        const step = () => {
            if (!this.playing || this.disposed)
                return;
            const i = this.phaseIndexAt(this.t);
            const nextStart = i + 1 < ph.length ? this.phaseStart(i + 1) : Infinity;
            const target = Number.isFinite(nextStart) ? nextStart : this.situation.clock.end;
            if (this.t >= this.situation.clock.end - 0.01)
                return this.stop();
            const travel = Math.max(1800, Math.min(6500, (target - this.t) * 90));
            if (Number.isFinite(nextStart))
                this.setPhase(i + 1, travel);
            else {
                this.fadeMs = 400;
                this.engine.setSceneTime(target, travel);
            }
            this.playTimer = window.setTimeout(step, travel + 2600);
        };
        step();
    }
    stop() {
        if (!this.playing && !this.playTimer)
            return;
        this.playing = false;
        clearTimeout(this.playTimer);
        this.playTimer = 0;
        this.emit('change');
    }
    isPlaying() {
        return this.playing;
    }
    /**
     * Make `routeId` the primary egress. Before the plan is committed this edits the proposal;
     * afterwards it stages a draft that needs approval. Returns which one happened.
     */
    setActiveRoute(routeId) {
        const r = this.resolve(this.t);
        if (!this.situation.routes?.defs.some((d) => d.id === routeId))
            throw new Error(`setActiveRoute: unknown route "${routeId}"`);
        if (r.primary === routeId && !r.draft)
            return 'unchanged';
        if (!this.committedAt(this.t)) {
            this.decide({ at: this.t, kind: 'primary', route: routeId, by: 'operator' });
            return 'primary';
        }
        if (r.primary === routeId) {
            this.decide({ at: this.t, kind: 'reject', by: 'operator' });
            return 'unchanged';
        }
        this.decide({ at: this.t, kind: 'draft', route: routeId, by: 'operator' });
        return 'draft';
    }
    approveDraft() {
        if (!this.resolve(this.t).draft)
            return false;
        this.decide({ at: this.t, kind: 'approve', by: 'operator' });
        return true;
    }
    rejectDraft() {
        if (!this.resolve(this.t).draft)
            return false;
        this.decide({ at: this.t, kind: 'reject', by: 'operator' });
        return true;
    }
    /**
     * Authorize the staged plan while its gate is open. The plan is committed from now; with
     * `advance` (or a duration, the older signature) the clock also moves to the first phase
     * the authorization unlocks.
     */
    authorize(opts = {}) {
        const o = typeof opts === 'number' ? { advance: true, durationMs: opts } : opts;
        if (this.committedAt(this.t) || !this.getState().gate?.open)
            return false;
        this.decide({ at: this.t, kind: 'authorize', by: 'operator' });
        if (o.advance) {
            const ph = this.situation.phases;
            const i = ph.findIndex((_, k) => this.phaseStart(k) >= this.t && k > this.phaseIndexAt(this.t));
            if (i >= 0)
                this.setPhase(i, o.durationMs ?? 1400);
        }
        return true;
    }
    on(ev, fn) {
        let set = this.listeners.get(ev);
        if (!set)
            this.listeners.set(ev, (set = new Set()));
        set.add(fn);
        return () => set.delete(fn);
    }
    /** Removes everything this player put on the engine. */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.stop();
        for (const off of this.offs)
            off();
        for (const id of this.applied.keys())
            this.engine.setOverlayLayer(id, null);
        this.applied.clear();
        this.engine.setUnits([]);
        if (this.feedByDirector)
            this.engine.closeDronePip();
        this.listeners.clear();
    }
    // ------------------------------------------------------------------ decisions and references
    /** Decisions in force at t: the exercise script (operator-role entries only under autopilot), then operator overrides. */
    ctx(t) {
        if (this.ctxCache && this.ctxCache.t === t)
            return this.ctxCache;
        const script = this.situation.script ?? [];
        const evs = [
            ...script.filter((d) => d.atRef === undefined).map((d, o) => ({ d, o, source: 'script' })),
            ...this.overrides.map((d, i) => ({ d, o: 1e6 + i, source: 'operator' })),
        ]
            .filter((e) => e.d.at <= t + 1e-6)
            .sort((a, b) => a.d.at - b.d.at || a.o - b.o);
        const c = { t, applied: [], cache: new Map() };
        for (const e of evs) {
            const d = e.d;
            const actor = d.by ?? (d.kind === 'draft' && e.source === 'script' ? 'talon' : 'operator');
            if (e.source === 'script' && actor === 'operator' && !this._autopilot)
                continue;
            if (d.when !== undefined) {
                c.cache.clear();
                if (this.refIn(d.when, c, Infinity) > d.at + 1e-6)
                    continue;
            }
            // A question is answered once and a plan authorized once: the earliest decision wins.
            if (d.kind === 'answer' && c.applied.some((a) => a.kind === 'answer' && a.item === d.item))
                continue;
            if (d.kind === 'authorize' && c.applied.some((a) => a.kind === 'authorize'))
                continue;
            c.applied.push({ ...d, source: e.source, actor });
        }
        // Relative script decisions (e.g. a second authority ruling minutes after a re-raise).
        for (const d of script) {
            if (d.atRef === undefined)
                continue;
            c.cache.clear();
            const at = this.refIn(d.atRef, c, Infinity);
            const actor = d.by ?? 'operator';
            if (!(at <= t + 1e-6) || (actor === 'operator' && !this._autopilot))
                continue;
            if (d.kind === 'answer' && c.applied.some((a) => a.kind === 'answer' && a.item === d.item))
                continue;
            c.applied.push({ ...d, at, source: 'script', actor });
            c.applied.sort((a, b) => a.at - b.at);
        }
        c.cache.clear();
        this.ctxCache = c;
        return c;
    }
    refIn(r, c, fallback = -Infinity) {
        if (r === undefined)
            return fallback;
        if (typeof r === 'number')
            return r;
        if (Array.isArray(r)) {
            let m = Infinity;
            for (const x of r)
                m = Math.min(m, this.refIn(x, c, Infinity));
            return m;
        }
        const hit = c.cache.get(r);
        if (hit !== undefined)
            return hit;
        const m = /^(.*?)([+-]\d+(?:\.\d+)?)?$/.exec(r);
        const base = m[1];
        let v;
        if (base.startsWith('@')) {
            const [kind, item, option] = base.slice(1).split(':');
            const d = c.applied.find((a) => a.kind === kind && (a.kind !== 'answer' || ((!item || a.item === item) && (!option || a.option === option))));
            v = d ? d.at : Infinity;
        }
        else {
            const i = this.situation.phases.findIndex((p) => p.id === base);
            if (i < 0)
                throw new Error(`scenarioPlayer: unknown phase "${base}"`);
            v = this.phaseStartIn(i, c);
        }
        if (m[2])
            v += Number(m[2]);
        c.cache.set(r, v);
        return v;
    }
    phaseStartIn(i, c) {
        const key = `#${i}`;
        const hit = c.cache.get(key);
        if (hit !== undefined)
            return hit;
        const p = this.situation.phases[i];
        let v = p.t;
        if (i > 0)
            v = Math.max(v, this.phaseStartIn(i - 1, c));
        if (p.after !== undefined)
            v = Math.max(v, this.refIn(p.after, c, -Infinity));
        c.cache.set(key, v);
        return v;
    }
    withinIn(from, until, t, c) {
        return t >= this.refIn(from, c) - 1e-6 && t < this.refIn(until, c, Infinity) - 1e-6;
    }
    gated(p, c, t) {
        return (p.when === undefined || this.refIn(p.when, c, Infinity) <= t + 1e-6) && (p.unless === undefined || this.refIn(p.unless, c, Infinity) > t + 1e-6);
    }
    committedTime(c) {
        const r = this.situation.routes?.committedAt;
        return r === undefined ? Infinity : this.refIn(r, c, Infinity);
    }
    committedAt(t) {
        return t >= this.committedTime(this.ctx(t)) - 1e-6;
    }
    telemetryAt(t) {
        const c = this.ctx(t);
        const out = {};
        (this.situation.telemetry ?? [])
            .map((k, i) => ({ k, i, at: this.refIn(k.at, c) }))
            .filter((x) => x.at <= t + 1e-6)
            .sort((a, b) => a.at - b.at || a.i - b.i)
            .forEach((x) => Object.assign(out, x.k.values));
        return out;
    }
    routeState(c) {
        let primary = this.situation.routes?.primary ?? null;
        let draft = null;
        for (const d of c.applied) {
            if (d.kind === 'primary') {
                primary = d.route;
                draft = null;
            }
            else if (d.kind === 'draft') {
                draft = d.route !== primary ? { route: d.route, by: d.actor, note: d.note } : null;
            }
            else if (d.kind === 'approve') {
                if (draft)
                    primary = draft.route;
                draft = null;
            }
            else if (d.kind === 'reject')
                draft = null;
        }
        return { primary, draft };
    }
    // ------------------------------------------------------------------ resolution
    resolve(t) {
        if (this.resolved && this.resolved.t === t && this.resolved.ver === this.ver)
            return this.resolved.r;
        const c = this.ctx(t);
        const { primary, draft } = this.routeState(c);
        const start = this.situation.clock.start;
        const defs = new Map((this.situation.routes?.defs ?? []).map((d) => [d.id, d]));
        const layers = new Map();
        for (const L of this.situation.layers) {
            const win = this._hindsight && L.hindsight ? L.hindsight : L;
            if (!this.withinIn(win.from, win.until, t, c))
                continue;
            const since = Math.max(start, this.refIn(win.from, c));
            let updated = since;
            let spec = L.spec;
            const sig = [];
            (L.patches ?? [])
                .map((p, k) => ({ p, k, at: this.refIn(p.at, c) }))
                .filter((x) => x.at <= t + 1e-6 && this.gated(x.p, c, t))
                .sort((a, b) => a.at - b.at || a.k - b.k)
                .forEach((x) => {
                spec = { ...spec, ...x.p.spec };
                sig.push(String(x.k));
                updated = Math.max(updated, x.at);
            });
            let state = spec.state ?? 'committed';
            let stAt = -Infinity;
            for (const k of L.states ?? []) {
                const at = this.refIn(k.at, c);
                if (at <= t + 1e-6 && at >= stAt) {
                    state = k.state;
                    stAt = at;
                    updated = Math.max(updated, at);
                }
            }
            const pk = sig.join('+');
            let role = '';
            if (L.route && defs.has(L.route)) {
                role = L.route === primary ? 'primary' : 'alternate';
                spec = { ...spec, ...(defs.get(L.route)[role]) };
                if (draft && draft.route === L.route && spec.type === 'line') {
                    // The proposal renders beside the committed plan: same geometry, draft styling.
                    const d = defs.get(L.route);
                    layers.set(`${DRAFT_PREFIX}${L.id}`, {
                        spec: { ...spec, ...d.primary, interactive: false, state: 'draft' },
                        sig: `d|${pk}`,
                        state: 'draft',
                        group: 'planDraft',
                        name: `Draft: ${d.name} as primary`,
                        provenance: { basis: 'authored', source: draft.by === 'operator' ? 'Operator request' : 'TALON proposal' },
                        since,
                        updated,
                    });
                    const anchor = d.anchor ?? spec.points[Math.floor(spec.points.length / 2)];
                    layers.set(`${DRAFT_PREFIX}marker`, {
                        spec: { type: 'marker', position: anchor, icon: 'route', state: 'draft', title: `DRAFT · ${d.name.toUpperCase()} AS PRIMARY`, detail: draft.note ?? 'Awaiting operator approval' },
                        sig: `dm|${draft.route}|${draft.note ?? ''}`,
                        state: 'draft',
                        group: 'planDraft',
                        since,
                        updated,
                    });
                }
            }
            layers.set(L.id, { spec: { ...spec, state }, sig: `${pk}|${role}`, state, group: L.group, name: L.name, provenance: L.provenance, since, updated });
        }
        const list = [];
        const sigs = [];
        const meta = [];
        for (const U of this.situation.units) {
            if (!this.withinIn(U.from, U.until, t, c))
                continue;
            let spec = U.spec;
            const sig = [];
            (U.patches ?? [])
                .map((p, k) => ({ p, k, at: this.refIn(p.at, c) }))
                .filter((x) => x.at <= t + 1e-6 && this.gated(x.p, c, t))
                .sort((a, b) => a.at - b.at || a.k - b.k)
                .forEach(({ p, k, at }) => {
                let ps = p.spec;
                if (p.rel && ps.track)
                    ps = { ...ps, track: ps.track.map((q) => ({ t: Math.round((q.t + at) * 1000) / 1000, p: q.p })) };
                spec = { ...spec, ...ps };
                sig.push(`${k}@${at.toFixed(3)}`);
            });
            list.push(spec);
            sigs.push(`${spec.id}:${sig.join('+')}`);
            const info = {};
            (U.info ?? [])
                .map((x, i) => ({ x, i, at: this.refIn(x.at, c) }))
                .filter((y) => y.at <= t + 1e-6)
                .sort((a, b) => a.at - b.at || a.i - b.i)
                .forEach((y) => Object.assign(info, y.x.data));
            const end = spec.track?.length ? spec.track[spec.track.length - 1].t : undefined;
            meta.push({ id: spec.id, kind: spec.kind, name: spec.name, type: spec.type, status: spec.status, detail: spec.detail, altitudeFt: spec.altitudeFt, arrives: end !== undefined && end > t ? end : undefined, provenance: U.provenance, info });
        }
        const r = { layers, units: { list, sig: sigs.join(','), meta }, primary: this.situation.routes ? primary : null, draft };
        this.resolved = { t, ver: this.ver, r };
        return r;
    }
    // ------------------------------------------------------------------ application
    onTime(t) {
        if (this.disposed)
            return;
        this.t = t;
        this.apply(this.fadeMs);
        const i = this.phaseIndexAt(t);
        if (i !== this.lastPhase) {
            this.lastPhase = i;
            this.emit('phase');
        }
        this.emit('change');
    }
    /** Diffs the resolved state against what is on the engine. */
    apply(fadeMs) {
        const r = this.resolve(this.t);
        const E = this.engine;
        for (const id of this.applied.keys()) {
            if (!r.layers.has(id)) {
                E.setOverlayLayer(id, null, { fadeMs });
                this.applied.delete(id);
            }
        }
        for (const [id, l] of r.layers) {
            const cur = this.applied.get(id);
            if (!cur || cur.sig !== l.sig) {
                E.setOverlayLayer(id, l.spec, { fadeMs: cur ? Math.min(fadeMs, 300) : fadeMs });
                this.applied.set(id, { sig: l.sig, state: l.state });
            }
            else if (cur.state !== l.state) {
                E.setLayerState(id, l.state);
                cur.state = l.state;
            }
        }
        if (r.units.sig !== this.unitSig) {
            this.unitSig = r.units.sig;
            E.setUnits(r.units.list);
        }
        this.updateTimeLabel();
    }
    changed(fadeMs) {
        this.ctxCache = null;
        this.ver++;
        this.fadeMs = fadeMs;
        this.apply(fadeMs);
        const i = this.phaseIndexAt(this.t);
        if (i !== this.lastPhase) {
            this.lastPhase = i;
            this.emit('phase');
        }
        this.emit('change');
    }
    decide(d) {
        // A new decision branches the timeline: later operator decisions no longer apply.
        this.overrides = this.overrides.filter((o) => o.at <= d.at);
        this.overrides.push(d);
        this.changed(450);
    }
    direct(i, durationMs) {
        const p = this.situation.phases[i];
        if (p.camera)
            this.engine.flyTo({ ...p.camera, durationMs: Math.max(0, durationMs) });
        if (p.feed) {
            try {
                this.engine.openDronePip(p.feed.drone);
                this.engine.setPipSensor(p.feed.sensor ?? 'eo');
                this.feedByDirector = true;
            }
            catch {
                /* drone not present at this time */
            }
        }
        else if (this.feedByDirector) {
            this.engine.closeDronePip();
            this.feedByDirector = false;
        }
    }
    updateTimeLabel() {
        this.engine.setTimeLabel(this.wallClock(this.t, true));
    }
    /** "JAN 14 · 03:47 PST" for the scene time (variant epoch per lighting mode). */
    wallClock(t, upper = false) {
        const e = this.situation.meta.epoch;
        if (!e)
            return formatT(t);
        const iso = typeof e === 'string' ? e : e[this.engine.getLighting()];
        const off = /([+-])(\d\d):?(\d\d)$/.exec(iso);
        const offMin = off ? (off[1] === '-' ? -1 : 1) * (Number(off[2]) * 60 + Number(off[3])) : 0;
        const d = new Date(Date.parse(iso) + (t + offMin) * 60000);
        const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
        const s = `${mon} ${d.getUTCDate()} · ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} ${this.situation.meta.tz ?? ''}`.trim();
        return upper ? s.toUpperCase() : s;
    }
    emit(ev) {
        const set = this.listeners.get(ev);
        if (!set?.size)
            return;
        const s = this.getState();
        set.forEach((fn) => fn(s));
    }
}
function mergeBoard(a, b) {
    if (Array.isArray(b)) {
        if (!Array.isArray(a) || !b.every((x) => x && typeof x === 'object' && 'id' in x))
            return b;
        const out = a.map((x) => ({ ...x }));
        for (const y of b) {
            const i = out.findIndex((x) => x && x.id === y.id);
            if (i >= 0)
                out[i] = mergeBoard(out[i], y);
            else
                out.push(y);
        }
        return out;
    }
    if (b && typeof b === 'object') {
        const out = a && typeof a === 'object' && !Array.isArray(a) ? { ...a } : {};
        for (const [k, v] of Object.entries(b))
            out[k] = mergeBoard(out[k], v);
        return out;
    }
    return b;
}
/** "T−0:30", "T+1:38" */
export function formatT(t) {
    const m = Math.round(Math.abs(t));
    return `T${t < -0.5 ? '−' : '+'}${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}
/** Wraps a single-state scenario ({ layers: [id, spec][], units }) as a one-phase situation. */
export function snapshotSituation(sc, groups = {}) {
    const meta = (sc.meta ?? {});
    return {
        schema: 'tte.situation/1',
        id: 'snapshot',
        meta: { ...meta, title: meta.title ?? 'Snapshot' },
        clock: { start: 0, end: 0 },
        phases: [{ id: 'S', name: 'Snapshot', t: 0, job: 'Single state: no timeline in this data.' }],
        layers: sc.layers.map(([id, spec]) => ({ id, group: groups[id] ?? id, spec })),
        units: sc.units.map((spec) => ({ spec })),
        presets: sc.presets,
    };
}
export function createScenarioPlayer(engine, situation, opts) {
    return new ScenarioPlayer(engine, situation, opts);
}
