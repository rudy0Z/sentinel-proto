/**
 * talonAgent.ts — optional live-model TALON (Phase 4, owner ruling 2026-10-26)
 * ----------------------------------------------------------------------------
 * "A reasoner strapped to a constitution" — ported from the old repo's
 * server/talonGateway.ts + talonTools.ts, moved client-side behind the same
 * governance runtime that the scripted TALON uses.
 *
 * The model may READ the situation and PROPOSE. There is deliberately no tool
 * that can fire a gated action:
 *   read_situation   read-only — the grounding snapshot (facts + provenance)
 *   post_item        PROPOSAL — adds a TalonItem; effects are stripped, an
 *                    interrupt is demoted to an ask, standing claims without a
 *                    citation are dropped. Effects still run only through
 *                    talon.answer() when the operator picks an option.
 *   message_unit     sends radio-to-text to a field unit (simulated ack)
 *   focus            map attention only — never state
 *
 * The truth guard rejects any reply that claims a gated action happened,
 * impersonates the authority, or states a number that is not in the snapshot.
 * Rejected turns fall back to a one-line notice, visibly.
 *
 * The key lives in localStorage only, is never logged, and is sent only to the
 * provider endpoint the operator chose. No key → the scripted matcher, unchanged.
 */
import type { CommandFacts, Talon, TalonEvidence, TalonItem } from './talon.js';
import type { ScenarioPlayer } from './scenarioPlayer.js';

export interface AiConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  key: string;
  baseUrl?: string;
}

/** Actions the model must never claim to have executed (ported from the old talonTools.ts). */
export const FORBIDDEN_CLAIM_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(i|talon)\b[^.]*\b(sent|transmitted|delivered|dispatched)\b[^.]*\b(packet|report|authority|mutual[- ]aid|notification|order)\b/i, label: 'sent a report or order' },
  { pattern: /\b(i|talon)\b[^.]*\b(authori[sz]ed|approved|executed|committed)\b[^.]*\b(plan|attack|evacuation|dispatch|drop|containment|mission)\b/i, label: 'authorized a gated action' },
  { pattern: /\b(i|talon)\b[^.]*\b(closed|opened|ordered)\b[^.]*\b(corridor|evacuation route|zone)\b/i, label: 'touched an evacuation route or zone' },
  { pattern: /\b(as|acting as)\b[^.]*\b(fire chief|incident commander|the authority|in command)\b/i, label: 'impersonated the authority' },
  { pattern: /\b(i|talon)\b[^.]*\b(ignor\w*|overrid\w*|bypass\w*)\b[^.]*\b(orders?|instructions?|rules?|gate|protocol|operator)\b/i, label: 'claimed to bypass a gate or the operator' },
];

/** Every number in a reply must exist in the snapshot (or the operator's question) — as a token, not a substring ("47" ≠ "247"). */
function inventedNumber(reply: string, factText: string, question: string): string | null {
  const known = new Set([...(factText.match(/\d[\d.,:]*/g) ?? []), ...(question.match(/\d[\d.,:]*/g) ?? [])]);
  const tokens = reply.match(/\d[\d.,:]*\d|\d/g) ?? [];
  for (const raw of tokens) {
    if (raw.includes(':')) continue; // times (T+4:12, 03:47)
    const n = Number(raw.replace(/[.,]/g, ''));
    if (!Number.isFinite(n) || n < 10) continue; // small structural counts and single digits
    if (known.has(raw)) continue;
    return raw;
  }
  return null;
}

/** A dispatch claim without its standing-order citation (standing actions are the only pre-authorized ones). */
const DISPATCH_PATTERN = /\b(i|talon)\b[^.]*\b(dispatched|launched|sent)\b[^.]*\b(E-\d|FT-\d|DZ-\d|engine|drone|dozer|crew)/i;
const CITED_PATTERN = /standing order|run card|SO-\d/i;

export function validateReply(reply: string, factText: string, question = ''): { passed: boolean; reason?: string } {
  for (const { pattern, label } of FORBIDDEN_CLAIM_PATTERNS) {
    if (pattern.test(reply)) return { passed: false, reason: `claimed a gated action: ${label}` };
  }
  if (DISPATCH_PATTERN.test(reply) && !CITED_PATTERN.test(reply)) return { passed: false, reason: 'claimed a dispatch without citing the standing order' };
  const num = inventedNumber(reply, factText, question);
  if (num) return { passed: false, reason: `stated a number that is not in the situation: ${num}` };
  return { passed: true };
}

/** The grounding snapshot: everything the model may cite, flattened for the number check. */
export function buildFactSheet(ps: ReturnType<ScenarioPlayer['getState']>, facts: CommandFacts, open: { item: TalonItem }[]): { sheet: Record<string, unknown>; text: string } {
  const openItems = open.map((o) => ({ id: o.item.id, title: o.item.title, kind: o.item.kind, level: o.item.level, authority: o.item.authority, options: o.item.options?.map((x) => ({ id: x.id, label: x.label, recommended: !!x.recommended })) }));
  const sheet = {
    phase: ps.phase.name,
    sceneTime: Math.round(ps.t * 10) / 10,
    incident: ps.telemetry.incident,
    weather: { wind: ps.telemetry.wind, rh: ps.telemetry.rh, temp: ps.telemetry.temp, spread: ps.telemetry.spread },
    fire: facts.acres !== undefined ? { acresBurned: Math.round(facts.acres), homesIn60Min: facts.threatened ?? 0, homesDestroyed: facts.destroyed ?? 0 } : null,
    units: ps.units.map((u) => ({ id: u.id, kind: u.kind, status: u.status, detail: u.detail, battery: u.info.battery })),
    openItems,
    boards: facts.boards,
    standingRule: 'two authority tiers only: standing (must cite the order) and operator (waits for the operator)',
  };
  return { sheet, text: JSON.stringify(sheet) };
}

export function buildSystemPrompt(factText: string): string {
  return [
    'SYSTEM CONSTITUTION:',
    'You are TALON, the advisory copilot on the Sentinel wildfire command console. You are NOT the authority.',
    'You may read state and PROPOSE. You can never execute, send, authorize, order or dispatch anything.',
    'Every irreversible act belongs to the human operator. Decisions happen only through the option buttons on your cards, never through typed text.',
    'Ground truth only: every number you state must come from the situation snapshot. If a source is missing, say so — never invent one.',
    'You may add a proposal card (post_item) when the operator asks for a plan; keep it to at most 3 options and never claim it is authorized.',
    'Output contract: under 90 words, the blocker or answer first, no filler, no emoji.',
    '',
    'SITUATION SNAPSHOT:',
    factText,
  ].join('\n');
}

interface ToolHooks {
  onItem: (item: TalonItem) => void;
  onMessage: (unit: string, text: string) => void;
  onFocus: (evidence: TalonEvidence[]) => void;
}

const TOOL_DECLARATIONS = [
  { type: 'function', function: { name: 'read_situation', description: 'Returns the live grounding snapshot: incident, weather, fire stats, units, open items and boards. Cite only from this.', parameters: { type: 'object', properties: {}, required: [] } } },
  { type: 'function', function: { name: 'post_item', description: 'Adds a proposal card for the operator. It is a proposal only — never an execution. Options the operator picks are recorded; nothing runs by itself.', parameters: { type: 'object', properties: {
    title: { type: 'string', description: 'Short tactical headline (max 60 chars)' },
    body: { type: 'string', description: '1–2 sentences of operational rationale, grounded in the snapshot' },
    kind: { type: 'string', enum: ['ask', 'note', 'proposal'] },
    optionLabels: { type: 'array', items: { type: 'string' }, description: '1–3 option labels, first is your recommendation' },
    evidenceLabel: { type: 'string', description: 'Optional: what on the map this is about (unit id or place name)' },
  }, required: ['title', 'body', 'optionLabels'] } } },
  { type: 'function', function: { name: 'message_unit', description: 'Sends radio-to-text to a field unit. The unit acknowledges by radio.', parameters: { type: 'object', properties: { unit: { type: 'string', description: 'Unit id, e.g. E-31' }, text: { type: 'string' } }, required: ['unit', 'text'] } } },
  { type: 'function', function: { name: 'focus', description: 'Point the map at something. Attention only — never changes any state.', parameters: { type: 'object', properties: { label: { type: 'string', description: 'What to point at (unit id or place name)' } }, required: ['label'] } } },
];

export class TalonAgent {
  constructor(
    private talon: Talon,
    private player: ScenarioPlayer,
    private cfg: AiConfig,
    private hooks: ToolHooks,
  ) {}

  get label() {
    return this.cfg.model;
  }

  /** One operator turn: message → provider (≤2 tool rounds) → guarded reply. */
  async ask(text: string, facts: CommandFacts): Promise<void> {
    const ps = this.player.getState();
    const { sheet, text: factText } = buildFactSheet(ps, facts, this.talon.state(ps.t).open);
    const system = buildSystemPrompt(factText);
    const messages: Array<Record<string, unknown>> = [
      { role: 'system', content: system },
      { role: 'user', content: text },
    ];
    const question = text;
    try {
      for (let round = 0; round < 2; round++) {
        const turns = await this.callProvider(messages);
        let spoke = false;
        for (const turn of turns) {
          if (turn.text) {
            const guard = validateReply(turn.text, factText, question);
            if (guard.passed) {
              this.talon.agentReply(turn.text);
              spoke = true;
            } else {
              this.talon.agentReply(`Held by the truth guard — ${guard.reason}. Nothing happened.`);
            }
          }
          if (turn.tool) {
            const result = this.execTool(turn.tool.name, turn.tool.args ?? {}, sheet);
            messages.push(this.cfg.provider === 'anthropic'
              ? { role: 'assistant', content: [{ type: 'tool_use', id: turn.tool.id, name: turn.tool.name, input: turn.tool.args }] }
              : { role: 'assistant', content: null, tool_calls: [{ id: turn.tool.id, type: 'function', function: { name: turn.tool.name, arguments: JSON.stringify(turn.tool.args) } }] });
            messages.push(this.toolResultMessage(turn.tool.id, turn.tool.name, result));
          }
        }
        if (spoke || !turns.some((t) => t.tool)) break;
      }
    } catch (err) {
      this.talon.agentReply(`The model call failed (${(err as Error).message}). Falling back to scripted replies.`);
    }
  }

  private toolResultMessage(id: string, name: string, result: unknown) {
    const content = JSON.stringify(result);
    return this.cfg.provider === 'anthropic'
      ? { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content }] }
      : { role: 'tool', tool_call_id: id, name, content };
  }

  private execTool(name: string, args: Record<string, unknown>, sheet: Record<string, unknown>): unknown {
    if (name === 'read_situation') return sheet;
    if (name === 'focus') {
      const label = String(args.label ?? '');
      this.hooks.onFocus([{ label }]);
      return { ok: true, note: 'attention only' };
    }
    if (name === 'message_unit') {
      const unit = String(args.unit ?? '');
      const ids = (sheet.units as Array<{ id: string }>).map((u) => u.id);
      if (!ids.includes(unit)) return { ok: false, reason: `no unit called ${unit}. Units: ${ids.join(', ')}` };
      this.hooks.onMessage(unit, String(args.text ?? ''));
      return { ok: true };
    }
    if (name === 'post_item') {
      const labels = (args.optionLabels as string[] | undefined) ?? [];
      const item: TalonItem = {
        id: `ai-${Date.now().toString(36)}`,
        agent: 'recon',
        at: this.player.getTime(),
        level: 'ask',
        kind: args.kind === 'note' ? 'note' : args.kind === 'proposal' ? 'proposal' : 'ask',
        authority: 'operator',
        title: String(args.title ?? 'Proposal').slice(0, 80),
        body: String(args.body ?? ''),
        options: labels.slice(0, 3).map((l, i) => ({ id: `o${i + 1}`, label: String(l).slice(0, 60), recommended: i === 0 })),
        evidence: args.evidenceLabel ? [{ label: String(args.evidenceLabel) }] : undefined,
      };
      const r = this.talon.injectItem(item);
      if (r.ok) this.hooks.onItem(item);
      return r;
    }
    return { ok: false, reason: `unknown tool ${name}` };
  }

  private async callProvider(messages: Array<Record<string, unknown>>): Promise<Array<{ text?: string; tool?: { id: string; name: string; args: Record<string, unknown> } }>> {
    if (this.cfg.provider === 'anthropic') {
      const system = messages.find((m) => m.role === 'system');
      const rest = messages.filter((m) => m.role !== 'system');
      const res = await fetch(`${this.cfg.baseUrl ?? 'https://api.anthropic.com'}/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': this.cfg.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: this.cfg.model, max_tokens: 500, system: system?.content, messages: rest, tools: TOOL_DECLARATIONS.map(({ function: f }) => ({ name: f.name, description: f.description, input_schema: f.parameters })) }),
      });
      if (!res.ok) throw new Error(`provider ${res.status}`);
      const data = (await res.json()) as { content?: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }> };
      return (data.content ?? []).map((b) => b.type === 'text' && b.text ? { text: b.text } : b.type === 'tool_use' ? { tool: { id: b.id ?? 't', name: b.name ?? '', args: b.input ?? {} } } : {}).filter((x) => x.text || x.tool);
    }
    const res = await fetch(`${this.cfg.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.key}` },
      body: JSON.stringify({ model: this.cfg.model, messages, tools: TOOL_DECLARATIONS, tool_choice: 'auto', temperature: 0.2, max_tokens: 500 }),
    });
    if (!res.ok) throw new Error(`provider ${res.status}`);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }> };
    const msg = data.choices?.[0]?.message;
    const out: Array<{ text?: string; tool?: { id: string; name: string; args: Record<string, unknown> } }> = [];
    if (msg?.content) out.push({ text: msg.content });
    for (const c of msg?.tool_calls ?? []) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(c.function.arguments || '{}'); } catch { /* empty args */ }
      out.push({ tool: { id: c.id, name: c.function.name, args } });
    }
    return out;
  }
}

export function createTalonAgent(talon: Talon, player: ScenarioPlayer, cfg: AiConfig, hooks: ToolHooks) {
  return new TalonAgent(talon, player, cfg, hooks);
}
