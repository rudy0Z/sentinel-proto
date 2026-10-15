# Sentinel Session Gateway (Phase 4 + 5)

Fastify + WebSocket backend for the Sentinel prototype: a deterministic session
engine, a SQLite event ledger, and the constitutional TALON gateway.

## Run

```bash
npm run server          # npx tsx server/index.ts  → http://127.0.0.1:4191
npm run dev             # the client (Vite) → http://localhost:4190/embed/sentinel/
```

Environment (all optional; see "AI gateway" for the key):

| Var | Default | Purpose |
|---|---|---|
| `PORT` | 4191 | gateway port |
| `SENTINEL_DB_PATH` | `server/sentinel-demo.db` | SQLite file (delete to reset) |
| `SENTINEL_LLM_KEY` | — | server-side LLM key; **never** bundled to the client |
| `SENTINEL_LLM_MODEL` | `gemini-1.5-flash` | model id |
| `SENTINEL_LLM_BASE_URL` | Gemini OpenAI-compat endpoint | any OpenAI-compatible base URL |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness + active session count |
| GET | `/ws?session=&seed=&operator=` | 5 Hz telemetry stream (deterministic per seed) |
| POST | `/command` | operator intent — validated against the shared TRANSITIONS table |
| GET | `/audit/:sessionId` | verify the SHA-256 hash chain of decision receipts |
| GET | `/talon/tools` | the complete TALON capability surface (read + proposal only) |
| POST | `/talon/message` | one TALON turn (truth-guarded, logged to `ai_turns`) |
| POST | `/talon/_truth-check` | test-only: run the post-turn guard on arbitrary text |

## The constitution, mechanically

`POST /command` **cannot** execute an irreversible act. A transition whose
`gate` is not `none` is refused with `403` and the authored reason; every
accepted command writes a hash-chained receipt into `decisions`, and
`GET /audit/:sessionId` re-derives the chain to catch tampering. The TALON tool
list contains no tool that fires a gated action — see the enumeration at the top
of `talonTools.ts`.

## AI gateway & the ai-degraded fallback

With no `SENTINEL_LLM_KEY`, `POST /talon/message` serves deterministic authored
copy and returns `degraded: true` — the demo never strands an evaluator (vault 07
§3). With a key, each turn is assembled from the constitution, derived surface
truth, an evidence frame, few-shots and the ≤90-word output contract; every
reply is run through the truth guard, and a turn that claims a gated action
happened is rejected and replaced with authored copy (`truth_check_passed: 0`).

**The key is read from the server environment only** — it is never hardcoded,
logged, or sent to the client.

## Implementation notes / deviations from the vault

- **SQLite driver:** uses Node 22's built-in `node:sqlite` (`DatabaseSync`)
  instead of `better-sqlite3` — identical file format and append-only
  semantics, with zero native compilation. The six-table schema (vault 05 §4) is
  unchanged.
- **Runtime:** TypeScript executed with `tsx` (already used by the repo's
  verify scripts). The shared domain in `src/app/domain/` is imported
  read-only, so the browser bundle and the backend run the same state machine.
