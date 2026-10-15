# Sentinel — Foundation Verification Audit

> **Status:** canonical (audit record) — 2026-09-14.
> **Scope:** `D:\portfolio porjects\flytbase` — design system, documentation vs code, verification gates, repo hygiene, AI-readiness.
> **Method:** re-ran all seven gates against the current source; read every root/project doc; compared doc claims to `src/app/tokens.ts` and the component tree; inspected git state. Evidence is file/line where relevant.

---

## 0. Verdict

The **product and code are in good shape** — every verification gate passes. The instability you feel is **not the app**; it is the **documentation layer, repo hygiene, and a handful of token drifts**. Several plan generations claim authority at once, the README describes a model the code abandoned, and ~133 MB of gate screenshots plus root scratch files sit in git. That is exactly the "drifting / context loss" pattern. The code is the solid part; the surrounding paperwork is what future AI sessions trip over.

---

## 1. Verification gates — reproduced on this machine

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | ✅ pass |
| Token audit | `npm run audit:tokens` | ✅ pass (65 files, **240 warnings**: 238 raw-rgba, 2 novel tracking) |
| Map integrity | `npm run verify:map` | ✅ **9/9** |
| Flow tests | `npm run verify:flows` | ✅ **19/19** |
| Route tests | `npm run verify:routes` | ✅ **23/23** (0 contract failures, 0 a11y violations, 0 console errors) |
| State machine | `npm run verify:machine` | ✅ 31 transitions, 0 unreachable, 0 dead ends, 4 fault-injected scenes |
| Signals | `npm run verify:signals` | ✅ 16 scenes OK |

**Reproducibility finding:** `verify:flows` / `verify:routes` default to `http://127.0.0.1:4190/embed/sentinel/`, but `vite preview` binds IPv6-only on this machine (`[::1]:4190`) — so `npm run check` **fails out of the box** unless you set `SENTINEL_VERIFY_URL=http://localhost:4190/embed/sentinel/`. Documented in the new `AGENTS.md`. Recommend adding a `serve` script that binds `--host 127.0.0.1`.

---

## 2. The documentation authority problem (highest leverage)

The repo carries **six overlapping planning generations**, several claiming the same throne:

| Doc | Claims to be | Reality |
|---|---|---|
| `PRODUCT.md` | product identity/users/principles | ✅ clean, current |
| `docs/sentinel-flagship-quality-upgrade.md` | "**the single build authority**" | consolidated + repaired; sound but undated |
| `PORTFOLIO-DIRECTION.md` (untracked) | portfolio scope; names `SENTINEL-V2-MASTER-SPEC.md` as product authority | newest (2026-09-14); **conflicts** with flagship's sole-authority claim |
| `docs/sentinel-v2-master-plan/00–09` | vault "**Canonical Architecture & Planning Standard**" | mostly repaired; `00` still says "8-stage / 23 routes" |
| `docs/SENTINEL-V2-MASTER-SPEC.md` | planning spec | richer product narrative; build plan superseded by flagship |
| `docs/sentinel-ai-upgrade/` · `original-specs/` · `old case studies/` | (quarantined history) | correctly quarantined |

**Repair status of the flagship's own B1–B5 corrections:** B1 (auto-timeout) ✅, B4 (palette) ✅, B5 (crypto/statutory) ✅ — all landed in the vault with `[REPAIRED]` markers. **B3 partial:** vault `03` was rewritten to real `SceneId`s, but the vault `00` index still carries "8-stage operational lifecycle across 23 discrete routes" (lines 20, 91). **B2 partial:** `11`/`12` carry `historical` headers; `00` still self-labels `Canonical`.

**This is the root cause of "context loss":** a new AI session reading `docs/` cold cannot tell which plan wins. Fixed by encoding a single authority order in the new `AGENTS.md`. **One open conflict needs your one-line ruling** (PORTFOLIO-DIRECTION §2 vs flagship §Status).

---

## 3. Findings by severity

### High
- **H1 — README is stale** (describes the abandoned 4-stage flow, "CSS Modules", old case-study URL, "Begin Scenario"). *Fixed* — refreshed to the two-phase / 16-scene model.
- **H2 — Competing authority claims** (§2). *Mitigated* by `AGENTS.md`; needs owner ruling.
- **H3 — Nothing for an AI tool to read first.** The docs are numerous but unconciliatory; no single machine-readable entry point existed. *Fixed* — new `AGENTS.md` + `CLAUDE.md`.
- **H4 — Gates are not reproducible cold** (§1 URL gotcha). *Documented*.

### Medium
- **M1 — `DESIGN.md` §4 uses a namespace that doesn't exist in code.** It documents `background.base`, `background.map`, `text.disabled`; `tokens.ts` actually exports `surface.base`, `surface.map`, `T.textPrimary/…`, `DISABLED_OPACITY`. Any AI syncing docs→tokens will look for the wrong keys.
- **M2 — Retired yellow survives as raw hex.** `#FFD166` literals remain in `src/app/components/panels/TalonCopilotPanel.tsx:200-201` and `src/app/mockData.ts:285`; `DesignSystemPage.tsx:42` still lists a `"yellow"` entry (aliased to `T.cyan`). `tokens.ts` has no yellow. The token audit **does not catch raw hex** — a gate gap.
- **M3 — `src/styles/theme.css` contradicts the palette.** Legacy shadcn aliases keep the old neon cyan `#00c8ff` (`--primary`, `--sidebar-primary`) and `rgba(0,200,255,…)`, vs the calibrated `#1CB8E6` in `tokens.ts`. Only the archived `ui/` tree consumes it, but it's a live drift trap.
- **M4 — Vault `00` index stale** (§2, B3 partial).
- **M5 — Dependency bloat.** Of the production dependencies, only `liquid-gooey`, `lucide-react`, `motion`, `three`, `react-router` are imported by product code. ~24 packages (all `@radix-ui/*`, `recharts`, `embla-carousel-react`, `react-slick`, `cmdk`, `vaul`, `sonner`, `canvas-confetti`, `date-fns`, `react-dnd`, `react-hook-form`, `react-popper`, `react-resizable-panels`, `react-responsive-masonry`, `input-otp`, `next-themes`, `class-variance-authority`, `clsx`, `tailwind-merge`, `react-day-picker`, `@tailwindcss/vite`, `tailwindcss`) exist only for the **archived, unused** 48-file `src/app/components/ui/` tree. Tailwind is wired in but not used by product surfaces.
- **M6 — Repo weight.** `verification-artifacts/` = **146 files, 133.1 MB, all git-tracked**. Root scratch artifacts present: `dem_stage0_raw.tif`, `stage0_shaded_relief.png`, `side-by-side.png`, `sentinel-final.html`, `sentinel-webgl-map.html`, `vite-dev.log` (177 KB), `static-server.log`, `vite.err.log`, `vite.out.log`.
- **M7 — Dirty working tree, including the authority doc.** Uncommitted: `.gitignore`, `PanelViz.tsx` + `RailStack.tsx` (intentional C1 clip fixes), and ~40 modified docs. **`PORTFOLIO-DIRECTION.md` — the file that defines the authority order — is untracked.** Also untracked: `scripts/verify-clip.mjs`, `case-study-v2-framing.md`.

### Low
- **L1** — 240 token warnings (raw-rgba) — ratchet down over time.
- **L2** — 2 novel tracking values (`0.4em` ActionModal, `-0.03em` DesignSystemPage).
- **L3** — 172 raw `fontSize` / 60 raw `borderRadius` / 35 raw `letterSpacing` literals outside tokens (many legitimate in map/canvas code; the gate treats them as warnings, not errors).
- **L4** — `old case studies/` = 24 files (v1–v8 HTML + docx iterations, 1.6 MB), untracked but unignored.
- **L5** — `ScanPage` bundles to ~2.0 MB (528 KB gzip) in one chunk; no code-splitting.
- **L6** — AI-tool dirs: `.zcode/` (1 file) and `.interface-design/system.md` are git-tracked; `.remember/` is not.

---

## 4. Answers to your specific questions

**"Read the documentation against what the code does."** Done — see §3 M1–M4 and §2. Docs and code disagree in five places: the token namespace (M1), the palette alias (M3), the yellow hex (M2), the staged *flow model* in README (H1), and the state-machine framing in vault `00` (M4). The *code* is internally consistent; the *prose* lags.

**"There's a final masterplan sitting in the repo."** That is `docs/sentinel-flagship-quality-upgrade.md` (P0→P6, self-declared build authority, consolidating the vault). The vault `00–09` is its source material. Note **P0 of that plan is "land the present" — the working tree is dirty again**, so that step is not closed.

**"Make sure Sentinel is clean and solid before executing the masterplan."** The code is ready; the *foundations* now are. Recommended order before executing: commit the tree → rule on authority → decide the `ui/`+deps question → move the 133 MB of captures out of git → clean root → ratchet tokens.

**Portfolio-embed open question** (`PORTFOLIO-DIRECTION.md` §3): contested watch (`?scene=monitoring-contested&core=1`) and the escalation path (`?escalation=1&core=1`) **are reachable in core/embed mode without the review dock** — `verify:routes` covers `core-contested` and `escalation-direct` and both pass. One nuance: the *operator-initiated escalation basis* (the packet with TALON's dissent attached) is produced through interaction, not a static deep link — confirm with a flow if the case study needs a single URL to that exact packet state.

---

## 5. Changes made to this repo (foundation setup)

- **`AGENTS.md`** (new) — the single AI entry point: what the repo is, golden rules, authoritative order, commands (+ the verify URL note), repo map, current state, known drift.
- **`README.md`** (refresh) — four-stage → two-phase + 16 scenes; corrected stack and run instructions; points AI tools to `AGENTS.md`.
- **`CLAUDE.md`** (new) — pointer to `AGENTS.md`.
- **`docs/sentinel-foundation-audit-2026-09-14.md`** (this file).

No `src/` code was changed. No git commits were made — that is left to you. The previous `README.md` is recoverable from git history.
