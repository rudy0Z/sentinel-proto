# Visual Craft Recipe — the taste correction

> **status: exploratory — direction proposal** (2026-09-30). Prompted by the owner's verdict on the v2 build: the concept, components and layout are right, but the visual bar is wrong — "it looks worse than AI slop apps," and the whole direction "is too dark blue." This doc is the research deliverable: what the references actually are (read with my own eyes, not from secondhand descriptions), the taste DNA they share, an honest current-vs-bar comparison, **three direction options with combos**, and a phased implementation plan.

**Sources actually reviewed:** `D:\Downloads\Mobile Devices\New folder (4)` (the quality dossier, 13 files — I read OrchestrateIQ, TrackWise, and the tool-call graph in full) · `New folder (2)` (66 mobile refs — I read Dawn, Flare, Speaksy as triangulation samples) · the juicelab.uiux Aerion post (verified via search earlier in this session). Instagram post URLs themselves are login-walled to fetchers; the local sets + the verified post stand in for them. rondesignlab's C2/drone mockups follow the same vivid-map + rich-card language as TrackWise. **A confession that matters:** doc 10 described these same dossier images as a "dark defense HUD" (volumetric sphere, candy-bar telemetry) — that secondhand description was wrong, and I inherited its frame for two redesign generations. Seeing them directly changes the conclusion.

---

## 1. What the references actually are — the taste DNA

Five references, five products, one shared language:

| Reference | Mode | What it is | The tell |
|---|---|---|---|
| **OrchestrateIQ** (folder 4) | **Light** | AI-agent observability console: agent roster cards, a Gantt-style timeline with state pills, a "Next steps" priority card, an **assistant rail on the right ("Welcome — What can I help with today?" + suggested questions)** | Warm white surfaces, pastel icon tiles, ONE blue accent, friendly human copy: *"Everything below was inferred from 412 events. Nothing was declared by hand."* |
| **TrackWise** (folder 4) | Dark navy | Fleet console: **vivid satellite map center**, rich vehicle cards (photo, driver avatar, status chip), right detail column with big values, trip progress, donut, activity timeline | Panels are *darker than the map but rich and full*; ONE confident blue; glowing route; zero empty panels |
| **Tool-call graph** (folder 4) | Warm charcoal | Agent tool observability: node cards with counts, p50 latency, error chips, hot-path footer | **Warm charcoal, not blue**; monospace everywhere; one green accent; dotted grid; generous padding |
| **Dawn** (folder 2) | Light **and** warm-dark | Fintech home: serif display voice ("Good morning. Welcome to Dawn."), soft cards, pill chips, orange accent, green success chip | The SAME product in two temperatures — warm cream and warm charcoal. Never blue-black |
| **Flare / Speaksy** (folder 2) | Light | Consumer social/translation: photo-led cards, chip filters, bold display headlines with one accent word | Whitespace as a feature; one saturated accent; illustration where data isn't |

**The shared DNA (the recipe):**

1. **Temperature is the identity.** Warm neutrals everywhere — cream, warm charcoal, deep navy-with-vivid-content. **Never cold blue-black with blue-gray text.** This is precisely what the current build is, and precisely the owner's complaint.
2. **Light-mode-first is the modern AI-ops look** (OrchestrateIQ, Dawn, Flare, Speaksy); the dark references earn darkness with *vivid content inside* (satellite imagery, glowing routes) — not with dark-on-dark panels.
3. **Display voice:** high-character type for moments of speech — serif (Dawn) or oversized bold sans with one accent-colored word ("You're **Always** Almost There", "We found your system"). TALON's spoken moments are exactly this; today they're 12px body text.
4. **One accent, many pastels:** a single saturated brand accent + functional pastel state chips (green Healthy, amber Pending, yellow Do-first). Never the multi-accent neon sprawl — and also never my current near-monochrome cyan.
5. **Full panels, big values:** every container is *full* — two-line rows, avatars, chips, chevrons, footers. Values are big and bright; labels small but high-contrast. Void is the failure mode of the current build.
6. **Human voice:** the AI speaks in confident, warm first person, with quantified honesty ("inferred from 412 events", "92% confidence" chips under every detection card). This is TALON's existing constitution — the references just render it beautifully.
7. **The assistant rail is a pattern, not a gimmick:** OrchestrateIQ's right rail (suggested questions + input + attach) is exactly TALON's Mind console — proof the concept is current, rendered in the target taste.

## 2. Current build vs the bar — the honest comparison

| Dimension | Current v2 build | The bar | Verdict |
|---|---|---|---|
| Surface temperature | Cold obsidian `#050B13` + blue-gray text | Warm cream **or** warm charcoal; navy only with vivid map inside | **Fundamental mismatch** |
| Panel readability | `rgba(9,15,26,0.90)` on a dark map = invisible voids | Panels contrast with the canvas; visible borders; full interiors | **Fails** |
| Typography | 10px eyebrows, 12px body, no display voice | 16–28px display moments, 13–14px UI text, big numerals, mono for data | **Fails** |
| Accent system | Near-monochrome cyan + amber/red/teal | One saturated accent + pastel state chips | **Fails** |
| Density | Sparse columns with scroll-buried content | Full cards, everything above the fold | **Fails** |
| Copy voice | Correct but terse machine English | Warm, confident, quantified human voice | Half-right |
| Layout & mechanics | D2 deck/spines/mind, gates, expiry, arbiter, intents | — | **Keep everything** |
| Data honesty | Receipts, truth-guard, ledger | Confidence chips, "inferred from N events" | **Keep — it matches the bar** |

**The one-line diagnosis:** we rebuilt the *structure* correctly and painted it in the wrong world. The owner said it exactly: *"our components and layouts are wonderful in concept" — the skin is what fails.*

## 3. Direction options

### Option A — "Warm Console" (recommended)
Keep the entire D2 layout, all mechanics, all gates. Re-skin to the warm-charcoal world:
- **Surfaces:** warm charcoal base `#161513`-family (charcoal with a hair of warmth), panel fills `rgba(30,28,25,0.92)`, visible 1px `rgba(255,255,255,0.10)` borders + top-edge highlight; the map canvas gets a subtle warm grade so panels contrast.
- **Accent:** ONE brand accent — warm **amber-orange** (`#F5A623` family, already in the palette as `amber`) promoted to brand; state pastels: teal=confirmed, red=danger, green=healthy, violet=TALON-cognitive moments. Cyan retires from primary duty (its "too dark blue" association) — it survives only as telemetry-info pastel.
- **Type:** display voice for TALON's speech — verdict headlines and onboarding moments in a character face (a readable serif like Source Serif / Fraunces, or keep IBM Plex Sans at display sizes with tighter leading — owner pick); UI sans stays IBM Plex; mono stays JetBrains for telemetry. One full size step up on labels (10→11px) and body (12→13px); hero numerals 28–36.
- **Copy pass:** TALON's voice becomes OrchestrateIQ-warm — "Nothing was declared by hand" honesty with human phrasing; suggested-question chips in the Mind console.
- **Effort:** token v3 + kit reskin + shell2 reskin + copy pass. **Layout untouched → all 22 flows and gates stay valid.** ~1–2 sessions.
- **Risk:** lowest. This is a re-skin, not a rebuild.

### Option B — "Daylight Ops" (OrchestrateIQ direction)
Light-mode-first command console: warm-white surfaces, dark text, pastel state chips, colored icon tiles, the map as a light cartographic layer. The single most "2026 SaaS-modern" option, and the references prove the AI-ops pattern.
- **Effort:** highest — every surface, the map backdrop strategy (light cartography vs the LWIR/thermal identity), and the 3D EXPLORE world re-graded. Semantic color re-mapping (danger red on light needs care).
- **Risk:** thermal/LWIR night-ops identity is dark-native; the wildfire domain *feels* night. Could ship as the light theme of one system (Dawn proves dual-temperature), but light-first is a bigger bet.
- **Effort:** ~3–4 sessions.

### Option C — "Vivid Terrain" (TrackWise direction)
Stay dark, but fix darkness the way TrackWise does: **the map becomes vivid** (real satellite/terrain rendering, luminous routes, glowing corridors), panels float over it with strong contrast and *richer interiors* — two-line rows, mini-map thumbnails, avatars, status chips, footer stats. Deck and mind console get full-card treatment.
- **Effort:** medium on chrome, **but the ceiling is set by map art** — this lives or dies on the terrain render quality (the exact thing doc 10 diagnosed as our weakest asset). 
- **Risk:** depends on assets we don't control yet; can partially fake with brighter map grading + stronger overlay glows.

### The combo I'd actually ship: **A + C ("Warm Console over Vivid Terrain")**
Warm-charcoal shell (A) with the vivid-map treatment (C) — TrackWise's energy in our layout, our mechanics untouched. Dawn proves the light variant can come later as a theme; OrchestrateIQ's assistant-rail patterns (suggested questions, "Do first" priority card) port straight into the Mind console.

## 4. Phased implementation plan (when the owner picks)

- **R1 — Token v3 (warm world):** rewrite the T palette + surface/border/shadow groups to the chosen temperature; accent decision; type scale +1 step; `tokens:css` regenerates. Half a session.
- **R2 — Kit reskin:** PanelGlass/HairlineBar/ArcGauge/StatusPill/etc. pick up the new tokens automatically; adjust borders/shadows for visibility; add the pastel-chip vocabulary. Half a session.
- **R3 — Shell reskin + density:** deck as a centered capsule with real presence; mind console compacted (kill convergence-card stretch, telemetry + evidence above the fold); spine tabs → icon-led. One session.
- **R4 — Voice & display pass:** TALON copy in the warm human register; display-face moments for verdicts/briefs; suggested-question chips. Half a session.
- **R5 — Map treatment:** brighter terrain grading, luminous routes/corridors, panel-contrast pass. One session (C part).
- **R6 — The review that was missing:** side-by-side captures vs folder-4 references at full size, fresh-eyes next-day pass, gates re-run. Half a session.
- Total: **~4 sessions to a defensible visual bar**, with all 22 flows valid throughout because the layout and state machine don't move.

## 5. Open questions for the owner (before R1)

1. **Pick the direction:** A / B / C / A+C (recommended).
2. **Accent:** warm amber-orange as the single brand accent (recommended — it's already semantically "attention" and kills the blue association), or keep a cool signal color for TALON specifically?
3. **Display voice:** serif display moments (Dawn-style, most distinctive) vs oversized sans (safer)?
4. **Light mode:** now as the default (B), later as a theme (Dawn pattern), or dark-only for v3?
