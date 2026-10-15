# Visual Language "Obsidian Glass" + Component Mapping

> **status: canonical — design language for the 2026 redesign** (owner-approved 2026-09-27). Extends `DESIGN.md` and `src/app/tokens.ts`; within the redesign scope (kit + shell2 + rebuilt panels) this doc resolves conflicts, and DESIGN.md is updated to match at promote time (P7). Semantic hue law is unchanged from tokens.ts. Quality target: the "Aerion"-class 2026 tactical-console bar (dark glass, hairline precision, gradient data-fills, generous radii) — achieved with honest data only.

---

## 1. Foundations

### 1.1 Surface ladder (obsidian, same hue family as today)
| Token | Value | Use |
|---|---|---|
| `surface.void` | `#05080F` | page void behind map vignette |
| `surface.base` | deepened `bgBase` (≈`#050B13`) | canvas chrome |
| `surface.panel` | deepened `bgPanel` (≈`#0A121E` @ 78–88% alpha in glass contexts) | rail panels, deck |
| `surface.raised` | deepened `bgRaised` (≈`#0E1928`) | cards, popovers |
| `surface.inset` | unchanged | tracks, wells |

All text keeps `textPrimary #E8EDF4 / textSecondary #9AACBE / textMuted #7A8BA0`; contrast ≥ AA verified by verify:routes after P1.

### 1.2 Glass recipes (extend `material` — never raw in components)
| Recipe | Spec |
|---|---|
| `material.glass.panel` | `rgba(10,17,29,0.78)` + `backdrop-filter: blur(22px) saturate(1.45)` + `border.hairline` + top inner highlight `rgba(255,255,255,0.04)` + `shadow.glass.md` |
| `material.glass.raised` | `rgba(13,21,34,0.86)` + `blur(24px) saturate(1.5)` + `hairlineStrong` + `shadow.glass.lg` (popovers, T1 banners, Mind console) |
| `material.glass.deck` | `rgba(9,15,26,0.9)` + `blur(26px) saturate(1.5)` + `radius.deck` + `shadow.glass.lg` (Command Deck only) |
| `material.glass.label` | `rgba(8,14,24,0.72)` + `blur(16px) saturate(1.3)` + `radius.control` (map labels, lips, chips) |

`GLASS_FROST` replaces ad-hoc blur strings; old `RAIL_FROST`/`SCRIM_FROST` migrate to it.

### 1.3 Borders, shadows, radius (concentric law)
- `border.hairline = rgba(255,255,255,0.07)`, `hairlineStrong = rgba(255,255,255,0.10)`, focus unchanged.
- `shadow.glass.sm/md/lg` — soft, large-blur, low-alpha (0.28→0.5 black), plus a 1px edge highlight on `lg`.
- Radius law `R_outer = R_inner + padding`: tile 8 · control 10 · panel 14 · overlay 16 · **deck 20** · pill 999. Enforced in kit components.

### 1.4 Typography
- `typeStyle.eyebrow` — JetBrains Mono 10/14, weight 600, uppercase, `tracking.eyebrow` (0.1em), `textMuted` — every panel header, spine lip label, chip caption.
- Numerals: large values in `typeStyle.metric`/body-numerals with `fontFeatureSettings: "tnum"` (constant `NUMERIC_TNUM`); animated numerals animate position not value flicker.
- Hierarchy per panel: eyebrow → metric (28–32) → label (11) → body (12). One metric hero per panel max.

### 1.5 Color semantics (unchanged hues, disciplined shares)
60% void/base · 30% glass structure · 10% semantic accent. Cyan = TALON/telemetry/live · amber = degraded/uncertainty/gate-hold · red = danger only (T1) · teal = confirmed/receipt · fire-orange = fire layer only. Accent bodies at 12% alpha with 100% 1px edges (doc 10 salvage); glows only on active states and T1.

### 1.6 Data-viz ramps (`viz` group)
Per-tone bar gradient (tone @85% → tone @45%, 6px radius caps) · confidence ramp (void→tone) · `arc.track` (white 6%) / `arc.fill` (tone gradient, 24 segments, endpoint dots) · forecast-cone (tone @18% fill, 1px edge, dashed midline) · sparkline stroke 1.5px, area @10% · heat cells 7×12, 2px gap.

### 1.7 Motion
Keep `motion.fast/normal/deliberate` (120/180/240) + `ease/ease.drawer`. Add `motion.spring = cubic-bezier(0.34,1.56,0.64,1)` — decorative pops only (spine peek, tile dissolve-in), never gates/holds. Pops ≤240ms; T1 banner = 180ms `ease` + single attention pulse. All motion respects reduced-motion.

## 2. Component kit (`src/app/components/kit/`) — source-mined, re-tokenized

| Primitive | Mined from (vault path under `D:\Design Tools\Ui kits and components\library\`) | Notes |
|---|---|---|
| `PanelGlass` | `repos/glass-lens-react/src/GlassSurface.tsx` + `repos/kokonutui/components/kokonutui/liquid-glass-card.tsx` | the panel shell; consumes `material.glass.*` |
| `SectionEyebrow` | `repos/better-design/registry/vercel/section-header` | eyebrow + optional live lip value |
| `HairlineBar` | rebuild of `PanelViz.SignalBar` (src/app/components/shared/PanelViz.tsx:177) | gradient fill, value chip, tnum |
| `ArcGauge` | custom SVG (Aerion threat-gauge pattern) | 24 segments, endpoint dots, hero number |
| `BarcodeHistogram` | `packages/microcharts` dist `mini-bar`/`city-skyline` pattern | vertical micro-columns |
| `Sparkline` | microcharts `dual-sparkline` pattern; evolve `PanelViz.MiniTrend` | 1.5px stroke, hover hairline |
| `HeatCells` | microcharts `heat-cell`/`heat-strip` pattern | evidence freshness matrix |
| `ForecastCone` | microcharts `forecast-cone` pattern | spread projection + age badge |
| `Ticker` | `repos/kibo/packages/ticker` | streaming one-liners (activity, receipts) |
| `Numeral` | `repos/number-flow` (core v0.6.2 pattern, ported) | animated value changes |
| `StatusDot` / `StatusPill` | `repos/kibo/packages/status` | 5 evidence statuses + scene tones |
| `EvidenceChip` | `repos/cult-ui/apps/www/components/ai-elements/inline-citation.tsx` + `sources.tsx` | provenance chips → evidence kind + status + age |
| `CommandTile` | current action tile + hairline polish | staged commands, class chip, expiry ring |
| `GlassToggle` | `repos/better-design/components/glassmorphic-dark` switch | layer/coverage toggles |
| `Toast/Undo` | `repos/sonner` v2.0.8 pattern | undo receipts for TALON pops |
| `MapLabelV2` | current `render/MapLabel` + glass label recipe | floating chip + leader line + glow dot |
| `TranscriptBars` | `repos/elevenlabs-ui` `bar-visualizer` (CSS port) | voice visualizer, no canvas |

## 3. Complete data → component mapping

| # | Data entity (01-data-map) | Presentation | Component(s) | Surface | Refresh |
|---|---|---|---|---|---|
| 1 | Fused confidence (90s convergence) | 24-seg arc gauge + hero % | ArcGauge + Numeral | C1 card + deck cradle | 1 Hz |
| 2 | Thermal / structures / confidence series | 3 aligned sparklines w/ shared cursor | Sparkline ×3 | C1 | 1 Hz |
| 3 | 9 evidence kinds × 5 statuses | chip grid + freshness heat cells | EvidenceChip + HeatCells | P2 + Mind trace | event + 30s age |
| 4 | Spread projection (3 strategies × 2 routes) | area + uncertainty cone + strategy legend | ForecastCone | P4 + map rings | 5–15 min |
| 5 | Projection age | badge on cone + gate unlock condition | StatusPill | P4 + C3 gate | 1 Hz |
| 6 | Fleet roster (10 drones × 5 classes) | rows: callsign, class icon, status pill, battery HairlineBar | kibo-status + HairlineBar | P5 + spine lip | 1 Hz |
| 7 | Drone live telemetry (GS/ALT/HDG/BAT/LINK/ETA) | label + Numeral + Sparkline rows | Numeral + Sparkline | C2 strip | 5 Hz frame / 1 Hz render |
| 8 | Battery/endurance | HairlineBar + remaining energy numerals | HairlineBar + Numeral | P5/C2 | 1 Hz |
| 9 | Dock/preflight state | roll-up strip + LAUNCH gate tile | CommandTile | P5 | event |
| 10 | Staged command | tile: label, class chip (1/2/3), expiry countdown ring, blocker line | CommandTile + arc | deck (only) | 100ms ring |
| 11 | TALON recommendation (≤90 words) | plan card: consequence-first line + confidence badge + provenance chips | PanelGlass + EvidenceChip | Mind + deck brief | event |
| 12 | Tool-call trace | vertical stepper w/ per-step status/timing | custom Steps (cult-ui `reasoning`/`task`/`tool` patterns) | Mind | event (timings) |
| 13 | Conversation turns / voice | thread bubbles + TranscriptBars + transcript line | cult-ui `conversation`/`message` patterns + TranscriptBars | Mind | stream |
| 14 | Refusal / abstention / AI-degraded | explicit state card w/ reason + fallback copy | PanelGlass variant | Mind + deck | event |
| 15 | Authority packet (draft) | packet card: grade, agency, evidenceSummary, missingData[], HOLD | PanelGlass + StatusPill | Mind + modal | event |
| 16 | Receipts / activity / decisions ledger | actor-chip stream (AI/TALON/Operator/System) | Ticker + StatusDot | P9/P10 + deck receipts | event |
| 17 | Dissent / re-raise | contested card: both positions + bar delta | PanelGlass | P7 area + Mind | event |
| 18 | Exceptions (9-field) | exception card: blocked cmds, fallbacks, map impact | PanelGlass + StatusPill | P-exceptions takeover | event |
| 19 | Weather (RAWS wind/gust/RH/Haines) | value chips + trend arrow | SectionEyebrow + Numeral | C8 | 1–5 min |
| 20 | Evac zones / corridors | zone cards w/ GO chips + corridor open/blocked | StatusPill + HairlineBar | P11 | event |
| 21 | Tasking queue / priorities | ranked rows w/ risk pills + staleness clocks | kibo-table pattern + StatusPill | P3 | 1 Hz |
| 22 | Debrief beats / ICS-209 | horizontal beat timeline + export card | kibo-gantt pattern | P12 | static post-run |
| 23 | Perimeter diff (holding?) | SVG diff overlay + time slider | custom (map layer) | C5/map | event |
| 24 | Hotspots | list w/ temp chips | StatusPill + Numeral | C7 | 1 Hz |
| 25 | Geofence/TFR/airspace layers | glass toggles | GlassToggle | C4 | static |
| 26 | Map labels (zones, waypoints, drones) | glass chip + leader line + glow dot | MapLabelV2 | map | 10 Hz |
| 27 | Attention tier signal | tier dot / badge / pulse on lips | StatusDot + motion | spines | event |
| 28 | Scene/phase/T+ clock truth | truth pills | SectionEyebrow + Numeral | deck left | 1 Hz |

## 4. Map & 3D visual language

Backdrop: deepened obsidian with vignette + faint star/grid texture; terrain heat gradient reserved to the fire layer. Zones: hairline 1px edges w/ 12% alpha fills; envelopes on hover. Rings: 15/30/60-min with age badges. Corridors: status-colored hairlines w/ dash flow toward egress. Labels: MapLabelV2 glass chips, collision-suppressed as today. 3D (EXPLORE): DEM-clamped, 1m-densified curtain ribbons (doc 02 plan), LWIR cone toggle; draw-call budget ≤19 stays.

## 5. TALON output spec (one state, two renderings)

**Mind (right):** thread turn = [tool-trace stepper] → [plan card: consequence line, confidence badge, class chip, evidence chips] → [actions mirrored]. Refusal/degraded/abstention are first-class cards. **Hand (deck):** orb posture (8 states) + ≤90-word consequence brief + staged tile w/ expiry ring + radial 2s hold; receipt posture on completion. Voice: mic button states idle/listening/thinking/speaking mapped to mark states; TranscriptBars react to level; live transcript line above deck; barge-in stops playback; mic-unavailable shows typed fallback honestly. Voice never executes — proposals land at the gate.

## 6. Anti-patterns (explicit)

No neon fills (12% body + 1px edge law) · no canvas/GLSL orb or canvas stacking · no glass-wall stacking (>2 glass layers overlapping) · no motion on gates/holds beyond the existing ring · no auto-rearranging layout (attention, never furniture) · no hidden-live-data without lips · no invented telemetry anywhere (sample data labeled as such) · no free-form hex/radii/blur outside tokens.
