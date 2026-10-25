/** At most `max` interrupts in any `windowMin` scene minutes. */
export const INTERRUPT_BUDGET = { max: 2, windowMin: 10 };
const LEVEL_RANK = { log: 0, feed: 1, ask: 2, interrupt: 3 };
/** "T−0:30", "T+1:38" */
export function fmtT(t) {
    const m = Math.round(Math.abs(t));
    return `T${t < -0.5 ? '−' : '+'}${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}
/** Minutes as "9:41" (countdowns, latencies). */
export function fmtDur(min) {
    const s = Math.max(0, Math.round(min * 60));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export class Talon {
    constructor(player) {
        this.thread = [];
        this.seq = 0;
        this.player = player;
        const raw = player.situation.talon;
        this.script = raw && Array.isArray(raw.items) ? raw : { agents: [], items: [] };
    }
    get situation() {
        return this.player.situation;
    }
    item(id) {
        return this.script.items.find((i) => i.id === id) ?? null;
    }
    agentName(id) {
        return (id && this.script.agents.find((a) => a.id === id)?.name) || 'TALON';
    }
    /** When an item happens at time t (null if it does not exist at t). */
    live(it, t) {
        const P = this.player;
        if (it.authority === 'standing' && !it.standing)
            return null; // never act without a citation
        const at = P.resolveRef(it.at, t);
        if (!(at <= t + 1e-6))
            return null;
        if (it.when !== undefined && !(P.resolveRef(it.when, t) <= at + 1e-6))
            return null;
        if (it.unless !== undefined && P.resolveRef(it.unless, t) <= at + 1e-6)
            return null;
        const expires = it.gate ? P.resolveRef(it.gate.expires, t) : null;
        let until = it.until !== undefined ? P.resolveRef(it.until, t) : Infinity;
        if (expires !== null)
            until = Math.min(until, expires);
        return { at, until, expires };
    }
    /** Fill `{@ref}` placeholders with the scene time of that reference. */
    text(s, t) {
        if (!s)
            return '';
        return s.replace(/\{(@[^}]+)\}/g, (_, ref) => {
            const v = this.player.resolveRef(ref, t);
            return Number.isFinite(v) ? fmtT(v) : '–';
        });
    }
    /** Who decides an item: the operator, or the second authority a re-raise is routed to. */
    decider(it) {
        return it.reraise?.to ?? 'operator';
    }
    deciderOf(d, it) {
        if (d.actor === 'supervisor')
            return 'system';
        return d.source === 'script' ? 'autopilot' : 'operator';
    }
    /** Items live at t with the interrupt budget applied (excess interrupts demoted, in time order). */
    arbitrate(t) {
        const out = [];
        for (const it of this.script.items) {
            const L = this.live(it, t);
            if (L)
                out.push({ it, L, level: it.level, demoted: false });
        }
        out.sort((a, b) => a.L.at - b.L.at);
        const granted = [];
        for (const x of out) {
            if (x.level !== 'interrupt')
                continue;
            const inWin = granted.filter((g) => g > x.L.at - INTERRUPT_BUDGET.windowMin + 1e-6).length;
            if (inWin >= INTERRUPT_BUDGET.max) {
                x.level = x.it.options?.length ? 'ask' : 'feed';
                x.demoted = true;
            }
            else
                granted.push(x.L.at);
        }
        return { live: out, granted };
    }
    state(t = this.player.getTime()) {
        const P = this.player;
        const log = [];
        const open = [];
        const lastByAgent = new Map();
        let interrupt = null;
        let lastOpenAt = -Infinity;
        const { live, granted } = this.arbitrate(t);
        for (const { it, L, level, demoted } of live) {
            const decider = this.decider(it);
            log.push({ id: it.id, t: L.at, seq: 0, agent: it.agent, who: 'talon', level, kind: it.kind, title: this.text(it.title, t), body: this.text(it.body, t), authority: it.authority, standing: it.standing, itemId: it.id, evidence: it.evidence, to: it.reraise?.to });
            if (demoted)
                log.push({ id: `dem:${it.id}`, t: L.at, seq: 1, agent: null, who: 'system', level: 'log', kind: 'demoted', title: `Interrupt held to an ${level}: budget is ${INTERRUPT_BUDGET.max} per ${INTERRUPT_BUDGET.windowMin} min`, itemId: it.id });
            const prev = lastByAgent.get(it.agent);
            if (!prev || L.at >= prev.at)
                lastByAgent.set(it.agent, { at: L.at, it, busyUntil: L.at + (it.busy ?? 0) });
            if (level === 'interrupt' && (!interrupt || L.at >= interrupt.at))
                interrupt = { at: L.at, it };
            if (it.kind === 'ask' || it.kind === 'proposal') {
                lastOpenAt = Math.max(lastOpenAt, L.at);
                const ans = P.answerOf(it.id, t);
                if (ans && ans.at >= L.at - 1e-6) {
                    const opt = it.options?.find((o) => o.id === ans.option);
                    log.push({ id: `ans:${it.id}`, t: ans.at, seq: 2, agent: it.agent, who: this.deciderOf(ans, it), level: 'feed', kind: 'answer', title: opt?.label ?? ans.option, body: ans.note ? `“${ans.note}”` : this.text(it.title, t), itemId: it.id, decider: ans.actor === 'supervisor' ? decider : ans.source === 'script' ? 'Exercise autopilot' : 'Operator' });
                }
                if (!ans && t < L.until - 1e-6)
                    open.push({ item: { ...it, level }, raisedAt: L.at, closesAt: L.until, expiresAt: L.expires });
                else if (!ans && L.expires !== null && L.until >= L.expires - 1e-6 && t >= L.expires - 1e-6)
                    log.push({ id: `exp:${it.id}`, t: L.expires, seq: 2, agent: it.agent, who: 'system', level: 'feed', kind: 'expired', title: `Lapsed: ${this.text(it.title, t)}`, body: it.gate?.onExpire ?? 'Nothing was sent.', itemId: it.id });
            }
        }
        for (const e of this.thread)
            if (e.t <= t + 1e-6)
                log.push(e);
        log.sort((a, b) => a.t - b.t || a.seq - b.seq);
        const rank = (o) => LEVEL_RANK[o.item.level] * 10 + (o.item.kind === 'proposal' ? 5 : 0) - (o.item.reraise ? 30 : 0);
        open.sort((a, b) => rank(b) - rank(a) || b.raisedAt - a.raisedAt);
        const agents = this.script.agents.map((a) => {
            const last = lastByAgent.get(a.id);
            const needs = open.find((o) => o.item.agent === a.id && !o.item.reraise);
            if (needs)
                return { ...a, status: 'needs', line: this.text(needs.item.title, t), since: needs.raisedAt };
            if (last && t < last.busyUntil)
                return { ...a, status: 'working', line: this.text(last.it.title, t), since: last.at };
            if (last)
                return { ...a, status: 'done', line: this.text(last.it.title, t), since: last.at };
            return { ...a, status: 'idle', line: 'Standing by', since: -Infinity };
        });
        const recent = (x, win) => !!x && t - x.at < win;
        let mood = 'calm';
        if (open.some((o) => !o.item.reraise))
            mood = 'focused';
        if (interrupt && recent(interrupt, 3))
            mood = interrupt.it.mood ?? 'alert';
        const mine = open.filter((o) => !o.item.reraise);
        const top = mine[0]?.item ?? null;
        const recentInt = interrupt && recent(interrupt, 4) ? interrupt.it : null;
        let attention = null;
        for (const src of [top, recentInt]) {
            const ev = src?.evidence?.find((e) => e.point || e.unit);
            if (src && ev) {
                attention = { item: src, evidence: ev };
                break;
            }
        }
        const phase = P.getState().phase;
        const dock = [];
        const push = (ws, reason) => {
            for (const w of ws ?? [])
                if (!dock.some((d) => d.widget === w))
                    dock.push({ widget: w, reason });
        };
        if (top)
            push(top.dock, this.text(top.title, t));
        if (recentInt)
            push(recentInt.dock, this.text(recentInt.title, t));
        push(phase.dock, 'Current situation');
        const fs = top?.feed ? { f: top.feed, r: this.text(top.title, t) } : recentInt?.feed ? { f: recentInt.feed, r: this.text(recentInt.title, t) } : phase.feed ? { f: phase.feed, r: 'Current situation' } : null;
        const feed = log.filter((e) => LEVEL_RANK[e.level] >= 1);
        const handled = log.filter((e) => e.t > lastOpenAt && e.who === 'talon' && (e.kind === 'action' || e.kind === 'status' || e.kind === 'note')).length;
        return {
            t,
            agents,
            open,
            feed,
            log,
            mood,
            attention,
            dock,
            feedSuggestion: fs ? { drone: fs.f.drone, sensor: fs.f.sensor ?? 'eo', reason: fs.r } : null,
            handled,
            dissents: this.dissents(t),
            budget: { used: granted.filter((g) => g > t - INTERRUPT_BUDGET.windowMin).length, max: INTERRUPT_BUDGET.max, windowMin: INTERRUPT_BUDGET.windowMin },
        };
    }
    /** Every declined recommendation, both positions verbatim, with any re-raise that followed. */
    dissents(t = this.player.getTime()) {
        const P = this.player;
        const out = [];
        for (const it of this.script.items) {
            if ((it.kind !== 'ask' && it.kind !== 'proposal') || it.reraise)
                continue;
            const ans = P.answerOf(it.id, t);
            if (!ans || ans.actor === 'supervisor')
                continue;
            const rec = it.options?.find((o) => o.recommended);
            const opt = it.options?.find((o) => o.id === ans.option);
            if (!rec || !opt || opt.recommended || opt.toggle)
                continue;
            let reraised = null;
            for (const r of this.script.items) {
                if (r.reraise?.of !== it.id)
                    continue;
                const L = this.live(r, t);
                if (!L)
                    continue;
                const ra = P.answerOf(r.id, t);
                reraised = { itemId: r.id, t: L.at, to: r.reraise.to, ruling: ra ? r.options?.find((o) => o.id === ra.option)?.label ?? ra.option : null };
            }
            out.push({ itemId: it.id, t: ans.at, question: this.text(it.title, t), talon: { position: rec.label, reasons: (it.why ?? []).map((w) => this.text(w, t)) }, operator: { position: opt.label, words: ans.note ?? null }, reraised });
        }
        return out;
    }
    /** The operator answers an open item. Effects run here and only here. */
    answer(itemId, optionId, note) {
        const P = this.player;
        const it = this.item(itemId);
        const opt = it?.options?.find((o) => o.id === optionId);
        if (!it || !opt)
            return { ok: false, reason: 'unknown option' };
        if (it.reraise)
            return { ok: false, reason: `This re-raise is routed to the ${it.reraise.to}.` };
        const open = this.state().open.some((o) => o.item.id === itemId);
        if (!open)
            return { ok: false, reason: 'This item is no longer open.' };
        const e = opt.effect;
        if (e?.kind === 'route') {
            // Switching plan variants edits the unauthorized proposal; the item stays open.
            P.setActiveRoute(e.route);
            return { ok: true, effect: 'route' };
        }
        if (e?.kind === 'authorize' && !P.authorize())
            return { ok: false, reason: 'The plan cannot be authorized right now (gate closed).' };
        if (e?.kind === 'approve' && !P.approveDraft())
            return { ok: false, reason: 'There is no draft to approve.' };
        if (e?.kind === 'reject' && it.kind === 'proposal' && P.getState().draft)
            P.rejectDraft();
        P.answer(itemId, optionId, note?.trim() || undefined);
        return { ok: true, effect: e?.kind };
    }
    /** First unanswered hold in (t0, t1]. Exercise mechanic: the harness pauses its clock there. */
    holdBetween(t0, t1) {
        const P = this.player;
        let best = null;
        for (const it of this.script.items) {
            if (it.hold === undefined || it.reraise)
                continue;
            const h = P.resolveRef(it.hold, t1);
            if (!(h > t0 + 1e-6 && h <= t1 + 1e-6))
                continue;
            const L = this.live(it, h);
            if (!L || h >= L.until - 1e-6 || P.answerOf(it.id, h))
                continue;
            if (!best || h < best.t)
                best = { item: it, t: h };
        }
        return best;
    }
    /** Moments worth marking on a timeline (decision-aware). */
    markers(t = this.player.getTime(), horizon = this.situation.clock.end) {
        const P = this.player;
        const out = [];
        const { live } = this.arbitrate(horizon);
        for (const { it, L, level } of live) {
            if (!it.milestone && level !== 'interrupt')
                continue;
            out.push({ t: L.at, label: it.milestone ?? this.text(it.title, t), kind: level === 'interrupt' ? 'interrupt' : it.kind === 'ask' || it.kind === 'proposal' ? 'ask' : 'milestone', itemId: it.id, future: L.at > t + 1e-6 });
        }
        const dis = new Set(this.dissents(horizon).map((d) => d.itemId));
        for (const d of P.getDecisions(horizon)) {
            if (d.kind !== 'answer')
                continue;
            const it = this.item(d.item);
            const opt = it?.options?.find((o) => o.id === d.option);
            if (!it || opt?.toggle)
                continue;
            out.push({ t: d.at, label: `${d.actor === 'supervisor' ? it.reraise?.to ?? 'Authority' : d.source === 'script' ? 'Autopilot' : 'You'}: ${opt?.label ?? d.option}`, kind: dis.has(it.id) ? 'dissent' : 'answer', itemId: it.id, future: d.at > t + 1e-6 });
        }
        return out.sort((a, b) => a.t - b.t);
    }
    // ------------------------------------------------------------------ review
    review(tEnd = this.situation.clock.end) {
        const P = this.player;
        const s = this.state(tEnd);
        const at = (id) => {
            if (!id)
                return null;
            const it = this.item(id);
            const L = it && this.live(it, tEnd);
            return L ? L.at : null;
        };
        const decisions = [];
        for (const it of this.script.items) {
            if (it.kind !== 'ask' && it.kind !== 'proposal')
                continue;
            const L = this.live(it, tEnd);
            if (!L)
                continue;
            const ans = P.answerOf(it.id, tEnd);
            const rec = it.options?.find((o) => o.recommended)?.label ?? null;
            const choice = ans ? it.options?.find((o) => o.id === ans.option)?.label ?? ans.option : null;
            const lapsed = !ans && L.expires !== null && tEnd >= L.expires;
            const by = ans ? (ans.actor === 'supervisor' ? 'authority' : ans.source === 'script' ? 'autopilot' : 'operator') : lapsed ? 'expired' : tEnd < L.until ? 'open' : 'expired';
            decisions.push({ item: it, raisedAt: L.at, closedAt: ans ? ans.at : Number.isFinite(L.until) ? L.until : null, choice, recommended: rec, by, latency: ans ? ans.at - L.at : null });
        }
        const R = this.script.review ?? {};
        const t0 = at(R.detect);
        const measures = [];
        const span = (id, label) => {
            const x = at(id);
            if (t0 !== null && x !== null)
                measures.push({ label, value: fmtDur(x - t0) });
        };
        span(R.confirm, 'Detection → confirmed');
        span(R.plan, 'Detection → plan proposed');
        const order = at(R.order);
        if (t0 !== null && order !== null) {
            const b = R.baseline;
            measures.push({ label: 'Detection → evacuation order', value: fmtDur(order - t0), note: b ? `${b.label}: ${b.minutes} min · ${b.source}` : undefined });
        }
        else if (R.order)
            measures.push({ label: 'Detection → evacuation order', value: 'not issued' });
        const corr = R.correction ? this.item(R.correction) : null;
        const ct = at(R.correction);
        if (corr && ct !== null)
            measures.push({ label: 'Projection error caught', value: `${corr.metric?.errorMin ?? '?'} min`, note: `by drone at ${fmtT(ct)}` });
        const answered = decisions.filter((d) => d.latency !== null && d.by === 'operator');
        if (answered.length)
            measures.push({ label: 'Median time to decide', value: fmtDur(median(answered.map((d) => d.latency))), note: `${answered.length} operator decisions` });
        return {
            milestones: s.log.filter((e) => e.itemId && e.who === 'talon' && this.item(e.itemId)?.milestone).map((e) => ({ t: e.t, label: this.item(e.itemId).milestone, itemId: e.itemId })),
            decisions,
            measures,
            standing: s.log.filter((e) => e.authority === 'standing' && e.who === 'talon').length,
            dissents: s.dissents,
            demoted: s.log.filter((e) => e.kind === 'demoted').length,
        };
    }
    // ------------------------------------------------------------------ typed commands
    /**
     * Adds the operator's message and TALON's reply to the thread (both at scene time t).
     * `scripted: false` pushes the operator's message only — the live-model adapter
     * (talonAgent.ts) answers instead of the intent matcher.
     */
    command(text, facts, t = this.player.getTime(), opts) {
        const raw = text.trim();
        if (!raw)
            return { reply: '' };
        const to = /^@(\S+)/.exec(raw)?.[1] ?? null;
        this.thread.push({ id: `msg:${++this.seq}`, t, seq: this.seq, agent: null, who: 'operator', level: 'feed', kind: 'message', title: raw, to: to ?? undefined });
        if (opts?.scripted === false)
            return { reply: '' };
        const res = this.interpret(raw, facts, t);
        if (res.reply)
            this.thread.push({ id: `rep:${++this.seq}`, t, seq: this.seq, agent: res.agent ?? null, who: 'talon', level: 'feed', kind: 'reply', title: res.reply, bullets: res.bullets, evidence: res.evidence });
        return res;
    }
    /** A field unit acknowledges (the shell simulates radio-to-text). */
    crewReply(unit, text, t = this.player.getTime()) {
        this.thread.push({ id: `crew:${++this.seq}`, t, seq: this.seq, agent: null, who: 'crew', level: 'feed', kind: 'message', title: text, to: unit });
    }
    /**
     * Phase 4 (live model): a proposal item may be injected at the current scene time.
     * Governance holds for model items exactly as for authored ones: standing claims
     * without a citation are dropped, effects are stripped (the operator's pick is
     * recorded but nothing runs), and an interrupt is demoted to an ask — the model
     * does not get to spend the operator's interrupt budget.
     */
    injectItem(item) {
        if (!item || typeof item.id !== 'string' || !item.title)
            return { ok: false, reason: 'malformed item' };
        if (this.script.items.some((i) => i.id === item.id))
            return { ok: false, reason: 'duplicate id' };
        if (item.authority === 'standing' && !item.standing)
            return { ok: false, reason: 'a standing action must cite its order' };
        const clean = {
            ...item,
            at: this.player.getTime(),
            agent: item.agent ?? 'recon',
            level: item.level === 'interrupt' ? 'ask' : (item.level ?? 'feed'),
            kind: item.kind === 'proposal' || item.kind === 'ask' ? item.kind : 'note',
            options: item.options?.map((o) => ({ ...o, effect: undefined })),
        };
        this.script.items.push(clean);
        return { ok: true };
    }
    /** Phase 4: a live model's reply enters the thread like any other TALON turn. */
    agentReply(reply, evidence, t = this.player.getTime()) {
        this.thread.push({ id: `ai:${++this.seq}`, t, seq: this.seq, agent: null, who: 'talon', level: 'feed', kind: 'reply', title: reply, evidence });
    }
    /** Drop session messages after t (the timeline was rewound and history branched). */
    truncateThread(t) {
        this.thread = this.thread.filter((e) => e.t <= t + 1e-6);
    }
    interpret(raw, f, t) {
        const s = this.state(t);
        let q = raw.toLowerCase();
        let agent;
        const at = /^@(\S+)\s*(.*)$/.exec(raw);
        if (at) {
            const target = at[1].toLowerCase().replace(/[^a-z0-9]/g, '');
            const unit = f.units.find((u) => u.id.toLowerCase().replace(/[^a-z0-9]/g, '') === target);
            if (unit) {
                const msg = at[2].trim();
                if (!msg)
                    return { reply: `What should I send to ${unit.id}? Type it after the name, e.g. "@${unit.id} hold at the hairpin".` };
                return { reply: `Sent to ${unit.id}${unit.detail ? ` (${unit.detail})` : ''} by radio-to-text. I'll show their reply here.`, to: unit.id };
            }
            const ag = this.script.agents.find((a) => a.id === target || a.name.toLowerCase() === target);
            if (ag) {
                agent = ag.id;
                q = at[2].toLowerCase() || ag.id;
            }
            else
                return { reply: `No unit or TALON agent called "${at[1]}". Units here: ${f.units.map((u) => u.id).join(', ')}.` };
        }
        const has = (...w) => w.some((x) => q.includes(x));
        const top = s.open[0]?.item;
        if (has('help', 'what can you', 'commands'))
            return { reply: 'Things I can do from the composer:', bullets: ['status · a short sitrep', 'what changed · the delta since you last looked', 'why · my reasoning for the open question', 'show route b / zone 1 / hairpin / E-31 · find it on the map', '@E-31 <message> · send a message to a unit', 'review · open the after-action review'], open: 'help', agent };
        if (/^(approve|authori[sz]e|reject|confirm|dismiss|yes|no|ok)\b/.test(q))
            return { reply: "I don't take decisions from typed text. Use the buttons on the card, or press 1, 2 or 3, so the decision is on the record with what you saw.", agent };
        if (has('review', 'replay', 'after action', 'after-action'))
            return { reply: 'Opening the after-action review.', open: 'review', agent };
        if (has('why', 'reason', 'explain', 'how come', 'basis')) {
            const it = top ?? [...s.log].reverse().find((e) => e.itemId && this.item(e.itemId)?.why)?.itemId;
            const item = typeof it === 'string' ? this.item(it) : it;
            if (!item?.why)
                return { reply: 'Nothing is waiting on you right now, so there is nothing to justify. Ask "status" for the picture.', agent };
            return { reply: `Why: ${this.text(item.title, t)}`, bullets: item.why.map((w) => this.text(w, t)), evidence: item.evidence, agent: item.agent };
        }
        if (has('what changed', 'changed', 'since', 'delta', 'new', 'missed')) {
            const since = Math.min(f.lastSeen, t);
            const ch = s.log.filter((e) => e.t > since + 1e-6 && e.who !== 'operator' && LEVEL_RANK[e.level] >= 0 && e.kind !== 'reply');
            if (!ch.length)
                return { reply: `Nothing new since ${fmtT(since)}.`, agent };
            return { reply: `Since ${fmtT(since)}, ${ch.length} thing${ch.length > 1 ? 's' : ''} happened:`, bullets: ch.slice(-6).map((e) => `${fmtT(e.t)} · ${e.title}`), agent };
        }
        const target = /^(show|where(?: is)?|find|zoom(?: to)?|go to|locate)\s+(.+)$/.exec(q.replace(/[?.!]+$/, ''));
        if (target)
            return this.locate(target[2].replace(/^the\s+/, ''), f, agent);
        if (has('status', 'sitrep', 'summary', 'situation', "what's happening", 'whats happening', 'update', 'brief'))
            return this.sitrep(s, f, t, agent);
        if (has('fire', 'spread', 'projection', 'acre', 'head')) {
            if (f.acres === undefined)
                return { reply: 'No projection: the incident has not been sized, so I am not drawing one.', agent: 'spread' };
            return { reply: `${Math.round(f.acres)} ac reached. ${f.threatened ?? 0} homes inside the 60-minute projection, ${f.destroyed ?? 0} inside the perimeter.`, agent: 'spread' };
        }
        if (has('unit', 'fleet', 'drone', 'engine', 'resource', 'crew')) {
            return { reply: `${f.units.length} units on the board:`, bullets: f.units.map((u) => `${u.id} · ${u.status ?? 'active'}${u.detail ? ` · ${u.detail}` : ''}${u.arrives ? ` · ETA ${fmtDur(u.arrives - t)}` : ''}`), agent: 'dispatch' };
        }
        if (has('route', 'egress', 'evac', 'zone', 'road')) {
            const b = f.boards.evac;
            if (!b)
                return { reply: 'No evacuation plan exists yet.', agent: 'egress' };
            return { reply: 'Egress:', bullets: [...(b.zones ?? []).map((z) => `${z.name} · ${z.kind}${z.households ? ` · ${z.households} homes` : ''}${typeof z.cleared === 'number' ? ` · ${z.cleared}% cleared` : ''}`), ...(b.routes ?? []).map((r) => `${r.name} · ${r.status}`)], agent: 'egress' };
        }
        return { reply: `I can't answer that in this prototype; my replies are scripted. Try "status", "what changed", "why", "show route B" or "@E-31 <message>".`, agent };
    }
    sitrep(s, f, t, agent) {
        const bullets = [`${f.phase} · ${f.wall}`];
        if (f.acres !== undefined)
            bullets.push(`Fire ${Math.round(f.acres)} ac · ${f.threatened ?? 0} homes in the 60-min projection`);
        const b = f.boards.evac;
        const z1 = b?.zones?.find((z) => typeof z.cleared === 'number');
        if (z1)
            bullets.push(`${z1.name} ${z1.cleared}% cleared`);
        const moving = f.units.filter((u) => u.arrives);
        bullets.push(`${f.units.length} units · ${moving.length} moving`);
        if (s.open.length)
            bullets.push(`${s.open.length} waiting on you: ${this.text(s.open[0].item.title, t)}`);
        else
            bullets.push(`Nothing needs you. ${s.handled} thing${s.handled === 1 ? '' : 's'} handled under standing orders since you last decided.`);
        return { reply: 'Sitrep:', bullets, agent };
    }
    locate(name, f, agent) {
        const key = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        const compact = key.replace(/ /g, '');
        const unit = f.units.find((u) => u.id.toLowerCase().replace(/[^a-z0-9]/g, '') === compact);
        if (unit)
            return { reply: `${unit.id}${unit.name ? ` (${unit.name})` : ''} · ${unit.status ?? 'active'}${unit.detail ? ` · ${unit.detail}` : ''}.`, evidence: [{ label: unit.id, unit: unit.id }], agent: agent ?? 'dispatch' };
        const aliases = [
            [/route ?a|encinal south|pch/, ['route-a']],
            [/route ?b|north|mulholland/, ['route-b', 'draft:route-b']],
            [/zone ?1|mandatory|order/, ['evac-order']],
            [/zone ?2|warning/, ['evac-warning']],
            [/zone ?3|safe|staging|assembly/, ['staging', 'evac-safe']],
            [/hairpin|choke|switchback/, ['choke-1-marker', 'choke-1']],
            [/spot/, ['spot']],
            [/cut/, ['cut-marker']],
            [/detection|report|heat/, ['detection']],
            [/fire|head|perimeter|projection/, ['fire-rev', 'fire', 'hand-line']],
            [/ignition|origin/, ['ignition']],
            [/dock/, ['docks']],
            [/wind/, ['wind']],
            [/dozer line|line/, ['dozer-line', 'hand-line']],
        ];
        const present = new Set(this.player.getState().layers.map((l) => l.id));
        for (const [re, ids] of aliases) {
            if (!re.test(key))
                continue;
            const id = ids.find((x) => present.has(x));
            if (!id)
                return { reply: `"${name}" isn't on the map at this time.`, agent };
            const p = layerPoint(this.situation, id);
            return { reply: `Here: ${this.situation.layers.find((l) => l.id === id)?.name ?? id}.`, evidence: [{ label: name, layers: [id], point: p ?? undefined }], focus: p ? { target: p } : undefined, agent };
        }
        return { reply: `I couldn't find "${name}". Try a unit id (E-31), a route, a zone, the hairpin, the fire or the cut.`, agent };
    }
}
/** A representative point for a layer: marker position, line middle, ring centroid, label. */
export function layerPoint(sit, id) {
    const L = sit.layers.find((l) => l.id === id.replace(/^draft:/, ''));
    if (!L)
        return null;
    const s = L.spec;
    if (s.type === 'marker')
        return s.position;
    if (s.type === 'line') {
        const pts = s.points;
        return pts[Math.floor(pts.length / 2)] ?? null;
    }
    if (s.type === 'polygon') {
        const rings = s.rings;
        const big = rings.reduce((a, b) => (b.length > a.length ? b : a), rings[0] ?? []);
        if (!big.length)
            return null;
        return [big.reduce((t, p) => t + p[0], 0) / big.length, big.reduce((t, p) => t + p[1], 0) / big.length];
    }
    if (s.type === 'labels')
        return (s.items[0]?.position) ?? null;
    if (s.type === 'field')
        return (s.labelToward ?? s.origin) ?? null;
    if (s.type === 'points')
        return (s.points[0]?.position) ?? null;
    return null;
}
function median(xs) {
    const a = [...xs].sort((x, y) => x - y);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
export function createTalon(player) {
    return new Talon(player);
}
