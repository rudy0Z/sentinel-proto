# 03 — Visual language + the container system

> **status: historical — REJECTED by the owner 2026-09-30. DO NOT BUILD FROM §1–§2.** The warm direction below reads as the AI-slop uniform, and this file's "warm charcoal + amber + serif" variant inherits that verdict. The replacement direction was chosen from `docs/redesign-2026/10-visual-direction-exploration.md` and now lives in `DECISIONS.md` §2 (obsidian-glass; cyan = TALON, amber = degraded, red = danger, teal = confirmed; fire-orange reserved for the fire layer).
>
> **This file is explicitly EXCLUDED from the `sentinel-core/00–07` authority band** — `AGENTS.md` authority order §5 carves it out. `sentinel-core/05` inherits this file's rejected "warm console" premise; treat its colour claims with suspicion.
>
> Everything in §3 (the container system) and §4 (density law) survives the rejection — they are structure, not temperature. §2's specific values are dead.

> **The superseded world (kept for the record until the owner picks from `redesign-2026/10-visual-direction-exploration.md`):** "Warm Console over Vivid Terrain" — temperature, color, and type below are dead values. **The container system (§3) and the density law (§4) survive** — they are structure, not temperature.

## 1. The world (three sentences)

Sentinel lives in a **warm charcoal instrument** floating over a **vivid, living terrain**. The machine is warm-precise — charcoal, paper-warm borders, one amber signal — while the world below is saturated and alive: satellite terrain, luminous fire, glowing corridors. Nothing is cold blue; nothing is a void; every surface is full.

## 2. Tokens v3 (the re-skin, replacing the obsidian v2 values)

| Group | v3 direction |
|---|---|
| Base | warm charcoal ladder: `#151412` (void) → `#1B1917` (base) → `#232019` (panel) → `#2A2620` (raised) — brown-warm, zero blue |
| Canvas | the map stays **vivid** (satellite/terrain grade) — panels contrast *against* it, never blend into it |
| Panel fill | `rgba(35, 32, 25, 0.88)` + `backdrop-blur(22px) saturate(1.3)` |
| Borders | visible by design: `rgba(255, 244, 224, 0.12)` default, `0.18` strong, warm top-edge highlight `rgba(255, 240, 210, 0.07)` |
| **Brand accent** | **amber `#F5A623`** — the one saturated signal (TALON, gates, staged actions, brand) |
| State pastels | teal `#2DD4A0` confirmed/healthy · red `#E5533C` danger only · green `#4ADE80` nominal · violet `#A78BFA` TALON-cognitive moments · cyan demoted to telemetry-info pastel |
| Text | warm: `#F3EDE2` primary · `#B8AD9C` secondary · `#8A7F6E` muted — AA on all fills |
| Type scale | **+1 step everywhere:** label 11→12, body 12→13, panelTitle 15→16, display 26→30, hero numerals 32→40; **display voice** for TALON's verdicts: serif class (Source Serif 4 / Fraunces — owner pick) at 24–30 for brief headlines; JetBrains Mono stays for telemetry |
| Radii | concentric law unchanged: dense 4 · control 8 · tile 10 · panel 14 · overlay 16 · deck 20 · pill 999 |
| Texture | a 2 % grain on large voids (map chrome, deck) — kills the "flat AI render" feel |
| Glow | one glow law: the lit thing may glow (gated core, active corridor, fire); structure never glows |

**Light theme:** reserved as the Dawn-style dual-temperature expansion, later — the token groups are named so a light ladder can slot in without renaming.

## 3. The container system — the block everything is made of

Every surface in Sentinel is a composition of **one container primitive**. If a new UI doesn't use it, it's off-system.

**The contract (`PanelGlass` evolves into `Container`):**
- **Geometry:** `radius` by tier (panel 14 inside overlay 16 inside deck 20 — concentric law `R_outer = R_inner + padding`); padding `12/16/20` by density tier.
- **Material:** the fill/border/blur recipe from §2 by variant (`panel / raised / deck / label`).
- **Header (mandatory):** eyebrow label (12px mono uppercase) + optional **live lip** (one load-bearing value, right-aligned, tnum) + optional **tier dot** (T1–T4).
- **Body:** sections separated by 12 px; every section is eyebrow + content; hero numeral per container max.
- **Footer (optional):** a stats row (like the tool-graph reference: label-over-value pairs) — where receipts/confidence/age live.
- **States:** `nominal / degraded (amber header tick) / blocked (red, commands disabled) / live (LIVE-SIM tick)` — states tint the header, never flood the body.
- **States are data:** every container renders from the same domain view models; a container never invents copy.

**Composed blocks (the standard kit of parts):** truth-cluster · metric-cell · evidence-chip row · signal-row (label + numeral + sparkline) · tool-trace step · proposal card (intent) · command tile · timeline row · footer-stats. Any screen = terrain + containers. This is the "container system is the key to the blocks of everything" ruling, made concrete.

## 4. Density law (the anti-slop rule)

The v2 audit's real failure was void. v3 law: **a container taller than 240 px must be full** — content, footer stats, or it shrinks. Above-the-fold of every region carries ≥3 real data moments. Scroll is for history, never for the primary decision.
