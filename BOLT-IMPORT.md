# BOLT IMPORT — handing the app to bolt.new for UI refinement

> **Status: canonical** · prepared 2026-10-15 · against the v3 shell
>
> Bolt edits **UI only**. This note is the contract: what to hand over, what to
> keep out, and the constraints that must survive the round-trip.

---

## 1 · What to upload

The app is a standard Vite + React 18 + TypeScript project. Upload the repo
root **minus** the exclusions in §2, or copy this exact set:

```
index.html
package.json          ← required, but see §4 before installing
postcss.config.mjs
vite.config.ts
tsconfig.json
src/                  ← the whole thing (9.3 MB)
```

`src/` carries the real data with it — `src/app/map/world/` holds `dem.bin`
(USGS 3DEP), `buildings.json` / `roads.json` (OSM), `vegetation.json` (ESA
WorldCover) and `imagery.jpg` (USGS NAIP). Do **not** strip these; the map is
built from them and there is no network fetch at runtime.

## 2 · What to leave behind

Do not upload these — they are large, generated, or irrelevant to UI work:

| Exclude | Why | Size |
|---|---|---|
| `node_modules/` | reinstalled | 234 MB |
| `dist/` | build output | 6 MB |
| `verification-artifacts/` | gate screenshots (untracked) | 152 MB |
| `docs/` | planning archive, not code | 22 MB |
| `server/` | Fastify + SQLite gateway, out of scope for UI | — |
| `scripts/` | verification + bake harness | 0.1 MB |
| `.zcode/`, `.openclaw/`, `.phase-h-scratch/`, `.remember/` | agent scratch | — |
| `sentinel-core/`, `sentinel-reports/`, `sentinel-layout-thinking/`, `sentinel-information-design/` | design docs | — |

They are already listed in `.gitignore` (or removed), so a git-aware upload
skips them automatically.

## 3 · The rule for what may change

**The safety layer is structural, not visual. It must survive untouched.**

| Keep | Why |
|---|---|
| `src/app/domain/stateMachine.ts` | `GATED_ACTIONS` and the transition table *are* the constitution. Not a UI concern. |
| `src/app/domain/staging.ts` | Staged actions expire back to watch. Expiry is never execution. |
| `src/app/domain/disagreement.ts` | Bidirectional dissent + re-raise. |
| `src/app/domain/attention.ts` | Rule of One, ≤2 interrupts / 10 min. **Do not modify — consume it.** |
| `src/app/domain/intents.ts` | TALON proposes about information, never about furniture or gates. |
| `src/app/map/fire/fireModel.ts` | One authored fire, two renderers. 2D and 3D project the same data. |

If a UI change appears to require touching one of those, it is a design
question, not an implementation one — say so rather than editing the file.

**Free to change:** tokens in `src/app/tokens.ts` (within the material law),
anything in `src/app/components/` and `src/app/styles/`, plus the `shell2/`,
`rails/`, and `kit/` presentation layers.

## 4 · Known constraints to respect

- **Never reintroduce a white rail.** `materialLight` exists for review cards
  only. The instrument core is dark by design — see `tokens.ts` §light chrome.
- **The deck is gates-only.** No navigation, no history, no chat scrolling in
  the bottom bar (`sentinel-core/06`).
- **Gated verbs require the 2-second hold.** A plain click on a gated tile must
  never fire the verb. `kit/core.tsx` `CommandTile` enforces this.
- **Token-only styling.** Raw `rgba()`/hex in TSX is a hard gate failure
  (`npm run audit:tokens`). Use `surface.*`, `border.*`, `tint()`, `light.*`.
- **Baseline is 273 token warnings.** Going above it fails the gate; going below
  it is a win.
- **19 draw calls is the 3D budget.** The HUD in EXPLORE displays it live.

## 5 · Verify after the round-trip

```bash
npm install
npm run dev
npm run verify:design     # typecheck + tokens + map 9/9
npm run build && npm run preview -- --port 4190
npm run verify:routes     # 23 combos + axe + console  ← catches a11y/contrast
```

Then walk `TEST-PATH.md`. It is the fastest way to tell whether a UI change
broke behaviour or only changed how it looks.

## 6 · Expected friction

- **The 3D scene needs WebGL.** It runs headless under SwiftShader for the
  basemap bake; in the browser it is hardware-accelerated. If 3D looks blank in
  Bolt's preview, check the console for a WebGL context error before assuming
  a regression.
- **`imagery.jpg` and `dem.bin` are fetched at runtime** via Vite `?url` /
  `fetch`. Both are inside `src/`, so a correct upload is self-contained. If
  the terrain renders as a flat colour, the world data did not come across.
- **Bolt may try to "simplify" the state machine** because it looks like
  boilerplate. It is not boilerplate. See §3.
