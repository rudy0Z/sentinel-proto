/**
 * server/db.ts — SQLite event store (Phase 4).
 *
 * Zero-dependency choice: Node 22's built-in `node:sqlite` (DatabaseSync)
 * instead of better-sqlite3. Same synchronous, append-only semantics the
 * vault 05 §4 schema assumes, with nothing to compile or install. The DB is
 * a throwaway demo artifact — delete the file to reset.
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.SENTINEL_DB_PATH ?? join(here, "sentinel-demo.db");
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

/** Idempotent migration — vault 05 §4 schema, six tables. */
export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      code_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      fuel_model TEXT NOT NULL,
      ambient_temp_f INTEGER NOT NULL,
      relative_humidity INTEGER NOT NULL,
      wind_vector_bearing INTEGER NOT NULL,
      wind_vector_speed_kts INTEGER NOT NULL,
      initial_coordinates TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL REFERENCES scenarios(id),
      mode TEXT NOT NULL,
      operator_label TEXT NOT NULL,
      seed INTEGER NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      clock_ms INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      action_id TEXT NOT NULL,
      operator_id TEXT NOT NULL,
      clock_ms INTEGER NOT NULL,
      sha256_digest TEXT NOT NULL,
      authorized_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dissent_records (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      direction TEXT NOT NULL,
      talon_position TEXT NOT NULL,
      operator_reason TEXT NOT NULL,
      operator_notes TEXT,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      model TEXT NOT NULL,
      latency_ms INTEGER NOT NULL,
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      truth_check_passed INTEGER NOT NULL,
      raw_prompt TEXT NOT NULL,
      output_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/** Hash-chained decision receipt: chain = sha256(prevDigest + actionId + clock + payload). */
export function recordDecision(input: {
  sessionId: string;
  actionId: string;
  operatorId: string;
  clockMs: number;
  payload: string;
}): { id: string; digest: string } {
  const prev = db
    .prepare("SELECT sha256_digest FROM decisions WHERE session_id = ? ORDER BY rowid DESC LIMIT 1")
    .get(input.sessionId) as { sha256_digest: string } | undefined;
  const id = `D-${input.sessionId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const material = `${prev?.sha256_digest ?? "GENESIS"}|${input.actionId}|${input.operatorId}|${input.clockMs}`;
  const digest = createHash("sha256").update(material).digest("hex");
  db.prepare(
    "INSERT INTO decisions (id, session_id, action_id, operator_id, clock_ms, sha256_digest) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, input.sessionId, input.actionId, input.operatorId, input.clockMs, digest);
  return { id, digest };
}

/** Verify the full decision chain for a session — tamper check for the audit trail. */
export function verifyChain(sessionId: string): { ok: boolean; length: number; breakAt: string | null } {
  const rows = db
    .prepare("SELECT action_id, operator_id, clock_ms, sha256_digest FROM decisions WHERE session_id = ? ORDER BY rowid")
    .all(sessionId) as Array<{ action_id: string; operator_id: string; clock_ms: number; sha256_digest: string }>;
  let prev = "GENESIS";
  for (const r of rows) {
    const material = `${prev}|${r.action_id}|${r.operator_id}|${r.clock_ms}`;
    const expect = createHash("sha256").update(material).digest("hex");
    if (expect !== r.sha256_digest) return { ok: false, length: rows.length, breakAt: r.action_id };
    prev = r.sha256_digest;
  }
  return { ok: true, length: rows.length, breakAt: null };
}

import { createHash } from "node:crypto";

/** Append an event to the immutable ledger. */
export function appendEvent(sessionId: string, clockMs: number, eventType: string, payload: unknown): void {
  db.prepare("INSERT INTO events (session_id, clock_ms, event_type, payload) VALUES (?, ?, ?, ?)").run(
    sessionId,
    clockMs,
    eventType,
    JSON.stringify(payload),
  );
}

export function recordDissent(sessionId: string, record: {
  direction: string; talonPosition: string; operatorReason: string; operatorNotes?: string;
}): void {
  db.prepare(
    "INSERT OR REPLACE INTO dissent_records (id, session_id, direction, talon_position, operator_reason, operator_notes) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(`DS-${sessionId}-${Date.now()}`, sessionId, record.direction, record.talonPosition, record.operatorReason, record.operatorNotes ?? null);
}
