/**
 * server/scenarioEngine.ts — deterministic multi-scenario engine (Phase 6).
 *
 * Phase 4 shipped a single hardcoded Scenario 1. The engine is now a pure
 * replay machine over the authored catalog in ./scenarios.ts: every tick is
 * derived from the session seed, so the same seed replays the same incident
 * byte-for-byte — the demo must never surprise an evaluator who has seen it
 * before. Scenario 1 remains byte-identical to Phase 4 (same beats, same
 * hints, same temps) so existing sessions and the live demo are unaffected.
 */
import { appendEvent, db } from "./db";
import { SCENARIOS, SCENARIO_1, getScenario } from "./scenarios";
import type { ScenarioBeat, ScenarioDefinition, ScenarioSeed } from "./scenarios";

export { SCENARIOS, SCENARIO_1, getScenario };
export type { ScenarioDefinition, ScenarioSeed, ScenarioBeat };

/** Mulberry32 — small, fast, fully deterministic PRNG. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TelemetryFrame {
  clockMs: number;
  scenarioId: string;
  thermalF: number;
  structuresCleared: number;
  confidence: number;
  windBearing: number;
  windSpeedKts: number;
  lidar02EtaS: number | null;
  sceneHint: string;
}

/** Authoritative beat for a scenario at elapsed second `elapsedS`. */
function beatFor(def: ScenarioDefinition, elapsedS: number): ScenarioBeat {
  let beat = def.beats[0];
  for (const b of def.beats) if (elapsedS >= b.atS) beat = b;
  return beat;
}

/** Assemble a telemetry frame from a beat plus a deterministic jitter sample. */
function frameFrom(def: ScenarioDefinition, beat: ScenarioBeat, elapsedS: number, jitter: number): TelemetryFrame {
  return {
    clockMs: elapsedS * 1000,
    scenarioId: def.id,
    thermalF: Math.round(beat.thermalF + jitter),
    structuresCleared: beat.structures,
    confidence: beat.confidence,
    windBearing: beat.windBearing ?? def.wind_vector_bearing,
    windSpeedKts: beat.windSpeedKts ?? def.wind_vector_speed_kts,
    lidar02EtaS: beat.lidarEta,
    sceneHint: beat.sceneHint,
  };
}

/**
 * Pure, wall-clock-free frame sample. Jitter is keyed to (seed, elapsedS) so a
 * given second always yields the same value — used by offline verification and
 * by later frame-scrubbing UI. The live engine (tick) intentionally keeps the
 * Phase 4 PRNG order to stay byte-identical.
 */
export function sampleFrame(scenarioId: string, seed: number, elapsedS: number): TelemetryFrame {
  const def = getScenario(scenarioId);
  if (!def) throw new Error(`unknown scenario: ${scenarioId}`);
  const beat = beatFor(def, elapsedS);
  const rng = makeRng((seed ^ Math.imul(elapsedS + 1, 0x9e3779b1)) >>> 0);
  const jitter = (rng() - 0.5) * 6; // deterministic noise, ±3°F
  return frameFrom(def, beat, elapsedS, jitter);
}

export class ScenarioEngine {
  private sessionId: string;
  private def: ScenarioDefinition;
  private rng: () => number;
  private now: () => number;
  private startedAt: number;
  private lastBeat = -1;

  constructor(
    sessionId: string,
    seed: number,
    scenarioId: string = SCENARIO_1.id,
    now: () => number = Date.now,
  ) {
    const def = getScenario(scenarioId);
    if (!def) throw new Error(`unknown scenario: ${scenarioId}`);
    this.sessionId = sessionId;
    this.def = def;
    this.rng = makeRng(seed);
    this.now = now;
    this.startedAt = now();
  }

  get scenarioId(): string { return this.def.id; }
  get definition(): ScenarioDefinition { return this.def; }

  /** 5 Hz telemetry: 200 ms cadence, deterministic from the seed. */
  tick(): TelemetryFrame {
    const elapsedS = Math.floor((this.now() - this.startedAt) / 1000);
    const beat = beatFor(this.def, elapsedS);
    const index = this.def.beats.indexOf(beat);
    if (index > this.lastBeat) {
      this.lastBeat = index;
      appendEvent(this.sessionId, elapsedS * 1000, "beat", { sceneHint: beat.sceneHint, index, scenario: this.def.id });
    }
    const jitter = (this.rng() - 0.5) * 6; // deterministic noise, ±3°F
    return frameFrom(this.def, beat, elapsedS, jitter);
  }
}

/** Seed the full scenario catalog (idempotent — re-runnable on every boot). */
export function ensureScenarioRows(): number {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO scenarios (id, code_name, title, description, fuel_model, ambient_temp_f, relative_humidity, wind_vector_bearing, wind_vector_speed_kts, initial_coordinates) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const s of SCENARIOS) {
    insert.run(
      s.id, s.code_name, s.title, s.description, s.fuel_model,
      s.ambient_temp_f, s.relative_humidity, s.wind_vector_bearing,
      s.wind_vector_speed_kts, JSON.stringify(s.initial_coordinates),
    );
  }
  const row = db.prepare("SELECT COUNT(*) AS n FROM scenarios").get() as { n: number };
  return row.n;
}

/** Back-compat alias from Phase 4 — still seeds the catalog, now all 6 rows. */
export function ensureScenarioRow(): void {
  ensureScenarioRows();
}
