/**
 * server/index.ts — Sentinel session gateway (Phase 4 + 5 + 6).
 *
 * Fastify + @fastify/websocket on :4191. Streams deterministic 5 Hz telemetry
 * for any authored scenario (S-01..S-06), accepts operator intents on
 * POST /command, and validates every intent through the SHARED domain
 * TRANSITIONS table before writing a hash-chained decision receipt. The AI
 * gateway (Phase 5) attaches here later; the state machine stays the
 * constitution either way.
 *
 * Run: npm run server   (node --experimental-strip-types server/index.ts)
 */
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { randomUUID } from "node:crypto";
import { migrate, appendEvent, recordDecision, verifyChain, db } from "./db";
import { ScenarioEngine, SCENARIO_1, SCENARIOS, getScenario, ensureScenarioRow } from "./scenarioEngine";
import { resolveTransition, getAvailableTransitions } from "../src/app/domain/stateMachine";
import type { TransitionContext } from "../src/app/domain/stateMachine";
import { askTalon, buildTurnPrompt, validateTurn, type SessionSnapshot } from "./talonGateway";
import { talonToolDeclarations } from "./talonTools";

const PORT = Number(process.env.PORT ?? 4191);

await migrate();
ensureScenarioRow();

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "warn" } });
await app.register(websocket);

/*
 * Dev CORS policy. The shell is served from a different origin (:4190) than
 * the gateway (:4191); without this the scenario catalog read is blocked by
 * the browser. Read-only, no credentials, no cookies — a local dev policy.
 */
app.addHook("onRequest", async (_req, reply) => {
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type");
});
app.options("/*", async (_req, reply) => reply.code(204).send());

/** Session registry — one engine per connected operator session. */
const sessions = new Map<string, { engine: ScenarioEngine; seed: number; operator: string; scenarioId: string; timer: NodeJS.Timeout; lastFrame?: import("./scenarioEngine").TelemetryFrame }>();

function createContext(): TransitionContext {
  return {
    experienceMode: "free",
    mode: "intel",
    authoritiesNotified: false,
    edgeCaseFired: false,
    dissent: null,
    evidenceConfidence: 78,
  };
}

app.get("/health", async () => ({
  ok: true,
  service: "sentinel-session-gateway",
  scenario: SCENARIO_1.id,
  scenarios: SCENARIOS.length,
  sessions: sessions.size,
  time: new Date().toISOString(),
}));

/**
 * GET /scenarios — the authored catalog as persisted in SQLite.
 * id + label + status (Phase 6 data layer; the select/debrief UI is a later
 * wave and lives in src/app). Falls back to the in-memory catalog for the
 * descriptive fields the table does not store.
 */
app.get("/scenarios", async () => {
  const rows = db
    .prepare("SELECT id, code_name, title FROM scenarios ORDER BY id")
    .all() as Array<{ id: string; code_name: string; title: string }>;
  const scenarios = rows.map((r) => {
    const def = getScenario(r.id);
    return {
      id: r.id,
      label: r.code_name,
      title: r.title,
      status: "ready" as const,
      seed: def?.seed ?? null,
      durationS: def?.durationS ?? null,
      beats: def?.beats.length ?? 0,
    };
  });
  return { ok: true, count: scenarios.length, scenarios };
});

/** WS: subscribe to the 5 Hz telemetry stream for a session. */
app.get("/ws", { websocket: true }, (socket, req) => {
  const q = req.query as { session?: string; operator?: string; seed?: string; scenario?: string };
  const sessionId = q.session ?? randomUUID();
  const seed = Number(q.seed ?? 20260915);
  const operator = q.operator ?? "A. Rao";
  const scenarioId = getScenario(q.scenario) ? (q.scenario as string) : SCENARIO_1.id;

  let entry = sessions.get(sessionId);
  if (!entry) {
    const engine = new ScenarioEngine(sessionId, seed, scenarioId);
    db.prepare(
      "INSERT OR REPLACE INTO sessions (id, scenario_id, mode, operator_label, seed) VALUES (?, ?, 'live-ai', ?, ?)",
    ).run(sessionId, scenarioId, operator, seed);
    const timer = setInterval(() => {
      const frame = engine.tick();
      entry.lastFrame = frame;
      if (socket.readyState === 1) socket.send(JSON.stringify({ type: "telemetry", sessionId, frame }));
    }, 200); // 5 Hz
    entry = { engine, seed, operator, scenarioId, timer };
    sessions.set(sessionId, entry);
    appendEvent(sessionId, 0, "session-open", { operator, seed, scenario: scenarioId });
  }

  socket.on("message", (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString()) as { type: string; payload?: unknown };
      if (msg.type === "available-transitions") {
        socket.send(JSON.stringify({ type: "available-transitions", transitions: getAvailableTransitions("baseline").map((t) => t.event) }));
      }
      if (msg.type === "ping") socket.send(JSON.stringify({ type: "pong" }));
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "malformed message" }));
    }
  });

  socket.on("close", () => {
    // keep the session engine alive for reconnect (vault 07 §3 resilience);
    // a sweeper would retire idle sessions in production.
  });
});

/** REST: operator intent dispatch — validated by the shared TRANSITIONS table. */
app.post("/command", async (req, reply) => {
  const body = (req.body ?? {}) as { sessionId?: string; event?: string; operator?: string; from?: string; context?: Partial<TransitionContext> };
  if (!body.sessionId || !body.event) {
    return reply.code(400).send({ ok: false, error: "sessionId and event are required" });
  }
  ensureSession(body.sessionId, body.operator);
  const from = (body.from ?? "baseline") as Parameters<typeof resolveTransition>[0];
  const ctx: TransitionContext = { ...createContext(), ...(body.context ?? {}) };
  const transition = resolveTransition(from, body.event as never, ctx);

  if (!transition) {
    return reply.code(422).send({
      ok: false,
      error: "transition rejected by the state machine",
      from,
      event: body.event,
      reason: "No TRANSITIONS edge authorizes this event from the current scene. The constitution mechanically refuses invalid moves.",
    });
  }
  if (transition.gate !== "none") {
    return reply.code(403).send({
      ok: false,
      error: "human gate required",
      from,
      event: body.event,
      to: transition.to,
      gate: transition.gate,
      reason: transition.reason,
    });
  }

  appendEvent(body.sessionId, Date.now() % 1_000_000, "intent", { event: body.event, from, to: transition.to });
  const receipt = recordDecision({
    sessionId: body.sessionId,
    actionId: body.event,
    operatorId: body.operator ?? "A. Rao",
    clockMs: Date.now() % 1_000_000,
    payload: JSON.stringify({ from, to: transition.to }),
  });
  return { ok: true, from, to: transition.to, gate: transition.gate, receipt };
});

/** Audit: verify the hash chain of a session's decision ledger. */
app.get("/audit/:sessionId", async (req, reply) => {
  const { sessionId } = req.params as { sessionId: string };
  const result = verifyChain(sessionId);
  if (!result.ok) return reply.code(409).send({ ok: false, ...result });
  return { ok: true, ...result };
});

/** Guarantee a sessions row exists before any FK'd insert (ai_turns/events). */
function ensureSession(sessionId: string, operator = "A. Rao"): void {
  const row = db.prepare("SELECT id FROM sessions WHERE id = ?").get(sessionId);
  if (!row) {
    db.prepare(
      "INSERT OR REPLACE INTO sessions (id, scenario_id, mode, operator_label, seed) VALUES (?, ?, 'live-ai', ?, ?)",
    ).run(sessionId, SCENARIO_1.id, operator, 20260915);
  }
}

/** Build a session snapshot for the AI gateway (live frame when available). */
function snapshotFor(sessionId: string): SessionSnapshot {
  const f = sessions.get(sessionId)?.lastFrame;
  const def = getScenario(f?.scenarioId ?? SCENARIO_1.id) ?? SCENARIO_1;
  return {
    sessionId,
    sceneHint: f?.sceneHint ?? "baseline",
    thermalF: f?.thermalF ?? def.ambient_temp_f,
    confidence: f?.confidence ?? 0,
    structuresCleared: f?.structuresCleared ?? 0,
    windBearing: f?.windBearing ?? def.wind_vector_bearing,
    windSpeedKts: f?.windSpeedKts ?? def.wind_vector_speed_kts,
  };
}

/** GET /talon/tools — the complete, auditable capability surface. */
app.get("/talon/tools", async () => ({ ok: true, tools: talonToolDeclarations }));

/** POST /talon/message — one constitutional TALON turn. */
app.post("/talon/message", async (req, reply) => {
  const body = (req.body ?? {}) as { sessionId?: string; text?: string };
  if (!body.sessionId || !body.text) return reply.code(400).send({ ok: false, error: "sessionId and text are required" });
  ensureSession(body.sessionId, body.operator);
  const snap = snapshotFor(body.sessionId);
  const turn = await askTalon(snap, body.text);
  db.prepare(
    "INSERT INTO ai_turns (session_id, model, latency_ms, prompt_tokens, completion_tokens, truth_check_passed, raw_prompt, output_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(body.sessionId, turn.model, turn.latencyMs, turn.promptTokensEst, turn.completionTokensEst, turn.truthCheckPassed ? 1 : 0, buildTurnPrompt(snap, body.text).system, turn.reply);
  return {
    ok: true, reply: turn.reply, truth_check_passed: turn.truthCheckPassed, degraded: turn.degraded,
    model: turn.model, latency_ms: turn.latencyMs, rejected_reason: turn.rejectedReason ?? null,
  };
});

/** POST /talon/_truth-check — TEST ONLY: run the post-turn guard on arbitrary text. */
app.post("/talon/_truth-check", async (req) => {
  const body = (req.body ?? {}) as { output?: string };
  return { ok: true, ...validateTurn(body.output ?? "") };
});

const shutdown = async () => {
  for (const [, s] of sessions) clearInterval(s.timer);
  await app.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

app.listen({ port: PORT, host: "127.0.0.1" }).then(() => {
  app.log.info(`sentinel gateway on http://127.0.0.1:${PORT} (ws /ws, POST /command, GET /health, GET /scenarios, GET /audit/:id)`);
});
