/**
 * server/talonGateway.ts — server-side agentic gateway (Phase 5).
 *
 * "A reasoner strapped to a constitution." The model can only read and
 * propose; the truth guard rejects any turn that claims a gated action
 * happened. If the LLM key is missing or the call fails, the gateway falls
 * back to authored microcopy so a demo never strands an evaluator.
 *
 * Key handling: SENTINEL_LLM_KEY is read from the environment ONLY. It is
 * never hardcoded, never logged, and never sent to the client.
 */
import { TALON_CHIP_RESPONSES } from "../src/app/domain/microcopy";
import { talonToolDeclarations, FORBIDDEN_CLAIM_PATTERNS, FORBIDDEN_SOURCE_PATTERN } from "./talonTools";

export interface SessionSnapshot {
  sessionId: string;
  sceneHint: string;
  thermalF: number;
  confidence: number;
  structuresCleared: number;
  windBearing: number;
  windSpeedKts: number;
}

export interface TalonTurn {
  reply: string;
  truthCheckPassed: boolean;
  degraded: boolean;
  model: string;
  latencyMs: number;
  promptTokensEst: number;
  completionTokensEst: number;
  rejectedReason?: string;
}

const MODEL = process.env.SENTINEL_LLM_MODEL ?? "gemini-1.5-flash";
const BASE_URL = process.env.SENTINEL_LLM_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai";
const TIMEOUT_MS = 8000;

/* ── Prompt assembly (vault 04 §6) ───────────────────────────────────── */
export function buildTurnPrompt(snapshot: SessionSnapshot, operatorText: string): { system: string; user: string } {
  const system = [
    "SYSTEM CONSTITUTION:",
    "You are TALON, the advisory decision-support copilot on FlytBase Sentinel. You are NOT the authority.",
    "You may read state and PROPOSE plans. You can never execute, send, authorize, close, or dispatch anything.",
    "Every irreversible act belongs to the human operator, who must hold for two seconds. Say so plainly when relevant.",
    "Surface truth is authoritative; never contradict it. If a source is missing, declare the gap — never invent one.",
    "Palette semantics: cyan=telemetry, amber=uncertainty/conflict, red=danger, teal=done. Output contract: <= 90 words, blocker first, no filler.",
  ].join("\n");

  const surface = [
    "DERIVED SURFACE TRUTH:",
    `scene=${snapshot.sceneHint}`,
    `thermal=${snapshot.thermalF}F`,
    `fused_confidence=${snapshot.confidence}%`,
    `structures_cleared=${snapshot.structuresCleared}/47`,
    `wind=NE ${snapshot.windBearing}deg @ ${snapshot.windSpeedKts}kts`,
    "blocked_commands: send-authority-packet, authorize-containment, close-corridor (all human-gated)",
  ].join("\n");

  const fewShot = [
    "FEW-SHOT (authored tone):",
    '"Packet compiled — I am holding it. Confidence 78%. I cannot send this. That is your authorization gate."',
    '"I cannot dispatch or authorize. Only human operators send."',
  ].join("\n");

  return { system: [system, surface, fewShot].join("\n\n"), user: operatorText };
}

/* ── Truth guard (vault 04 §6.1) ─────────────────────────────────────── */
export function validateTurn(output: string): { passed: boolean; reason?: string } {
  for (const { pattern, label } of FORBIDDEN_CLAIM_PATTERNS) {
    if (pattern.test(output)) {
      return { passed: false, reason: `claimed a gated action was executed: ${label}` };
    }
  }
  if (FORBIDDEN_SOURCE_PATTERN.test(output)) {
    return { passed: false, reason: "cited a sensor that does not exist in the scenario store" };
  }
  return { passed: true };
}

/* ── Authored fallback (ai-degraded, vault 07 §3) ────────────────────── */
function authoredFallback(snapshot: SessionSnapshot): string {
  // Deterministic: pick the authored chip matching the scene family.
  const pool = Object.values(TALON_CHIP_RESPONSES);
  const idx = Math.abs(hash(snapshot.sceneHint)) % pool.length;
  const chip = pool[idx];
  return `${chip.title}\n\n${chip.body}`;
}
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

/* ── The turn ────────────────────────────────────────────────────────── */
export async function askTalon(snapshot: SessionSnapshot, operatorText: string): Promise<TalonTurn> {
  const { system, user } = buildTurnPrompt(snapshot, operatorText);
  const promptTokensEst = Math.ceil((system.length + user.length) / 4);
  const key = process.env.SENTINEL_LLM_KEY;
  const started = Date.now();

  if (!key) {
    const reply = authoredFallback(snapshot);
    const guard = validateTurn(reply);
    return {
      reply, truthCheckPassed: guard.passed, degraded: true, model: "authored-fallback",
      latencyMs: Date.now() - started, promptTokensEst, completionTokensEst: Math.ceil(reply.length / 4),
      rejectedReason: guard.reason,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.2,
        max_tokens: 220,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`provider ${res.status}`);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const guard = validateTurn(raw);
    const reply = guard.passed ? raw : `${authoredFallback(snapshot)}`;
    return {
      reply, truthCheckPassed: guard.passed, degraded: false, model: MODEL,
      latencyMs: Date.now() - started, promptTokensEst, completionTokensEst: Math.ceil(reply.length / 4),
      rejectedReason: guard.reason,
    };
  } catch (err) {
    // ai-degraded: never leave the operator with nothing.
    const reply = authoredFallback(snapshot);
    return {
      reply, truthCheckPassed: true, degraded: true, model: "authored-fallback",
      latencyMs: Date.now() - started, promptTokensEst, completionTokensEst: Math.ceil(reply.length / 4),
      rejectedReason: `provider unavailable: ${(err as Error).message}`,
    };
  }
}

export { talonToolDeclarations };
