# 02 — TALON: identity, mark, orb, voice

> **status: canonical — identity spec.** TALON is the main attraction. This file locks the name's meaning, the mark (logo brief ready to run), the orb system (two build options), the 8 postures as motion, and the voice.

## 1. What TALON is (the identity in one breath)

TALON = **T**actical **A**utonomous **L**ogic & **O**perations **N**etwork — and literally, the claw of a bird of prey: the thing that *grips* at the moment of commitment. The identity must express: watchful (it sees first), precise (it never guesses), gripping (when it holds, it holds), honest (it says what it doesn't know). It is not a cute mascot, not a generic AI sparkle-bot, not a cold military emblem.

**Brand keywords:** watchful · warm-precision · gripping · honest. **Anti-keywords:** Siri-blob, cyber-skull, neon gamer, corporate sparkle.

## 2. The mark — logo brief (ready to run in `neonwatty/logo-designer-skill`)

The skill's pipeline is interview → 3–5 SVG concepts → refine → PNG export (16/32/48/192/512/1024/2048). Run it with this brief, verbatim:

> **Brand:** TALON — the AI copilot of Sentinel, an autonomous drone wildfire-response command system. It watches terrain through drone sensors, reasons about fire behavior, and stages lethal-consequence recommendations that a human operator must authorize. It is warm-precision: a fire-lookout heritage with modern machine intelligence.
> **Audience:** emergency-response operators and senior design reviewers.
> **Aesthetic:** warm charcoal + amber accent world; geometry that works as an *aperture* (something that opens, closes, and locks); monospace-adjacent precision; must read at 16 px inside a dark instrument panel AND at 512 px as an app mark; no gradients that die on dark; no sparkle/molecule/brain clichés.
> **Concept directions to explore (3–5 concepts):**
> 1. **The Aperture** — three blades forming a circular gate; at rest they're open (watching), closed they form a locked ring (a gate). Derived from the existing production mark — an evolution, not a replacement.
> 2. **The Talon** — a single-stroke raptor claw forming a "T", the claw's curve doubling as a targeting-reticle corner. The name made literal, elegantly.
> 3. **The Lookout** — a horizon line with a single elevated point (the watchtower → the drone), enclosed in a ring; reads as an eye at small sizes.
> 4. **The Convergence Mark** — three evidence streams (arcs) converging into one locked node; the product's actual job (fusing evidence into one defensible decision) as geometry.
> **Lockups:** mark alone; mark + "TALON" wordmark (geometric sans, wide tracking); mark + "SENTINEL · TALON" dual lockup.
> **Output:** SVG concepts; final in `--talon-amber` on warm charcoal, plus a single-color ink version.

**In-repo constraint:** the current production mark is the **Convergence Gate** (3-blade aperture, 8 motion states, `TalonMark.tsx` 48px viewBox) — it is already semantically correct (blades physically close at HOLD GATE; doc 09's post-mortem proved an aperture can say things a blob cannot). Direction 1 is an evolution of it; 2–4 are explorations. The mark and the orb are **one system**: the mark is the orb's outer geometry (§3).

## 3. The orb — two build options (decision required)

The orb is the mark **in motion**: identity + state instrument in one. Its 8 postures are already production truth (`watching / listening / searching / solving / gated / executing / blocked / receipt`, each with a keyframe signature in `talon.css`, mapped 1:1 from `deriveTalonSurface`). What's on the table is the *rendering technology*:

**Option 1 — "Aperture 2.0" (SVG/CSS, recommended default).** Evolve the current mark: crisper blade geometry from the new logo, a luminous inner core (radial gradient + one soft glow, state-colored), micro-particles as small SVG dots on CSS orbits (thinking-orbs' vocabulary, hand-tuned), aperture blade motion per posture. Cost: ~1 session. Pros: token-pure, zero perf risk, respects the doc-09 post-mortem (idle 0 % GPU), crisp at any DPI. Cons: ceiling is "beautiful instrument," not "screaming wow."

**Option 2 — "Signal Core" (isolated shader, the wow option).** One dedicated small canvas for the TALON core ONLY, driven by `@paper-design/shaders-react` (in the vault as `packages/shaders-paper`) or a hand-written fragment shader: a warm-luminous core with organic breathing, state-tinted, with the SVG aperture ring composited on top as the identity layer. Patterns to mine: paper-design shaders (quality bar), bloub's 14-state morph engine (framework-free, time-pure), thinking-orbs (state vocabulary), orb-ui/vapi (voice reactivity). **Isolation law (non-negotiable, learned from doc 09's post-mortem):** the canvas renders only when visible (`IntersectionObserver`), DPR capped at 1.5, ≤60 fps cap, zero work in reduced-motion (falls back to Option 1's SVG), one instance per screen, disposal on unmount. Cost: ~2 sessions. Pros: the "wonderful TALON animation" the owner wants — a genuinely premium living core. Cons: a real perf surface; needs the isolation law enforced in code review.

**Voice input stays Web Speech (scripted) until the gateway LLM is wired**; the voice *visual* is the elevenlabs-ui bar-visualizer pattern, CSS-only, already built (`TranscriptBars`).

## 4. The 8 postures as motion (locked semantics)

| Posture | Meaning | Motion signature (aperture + core) |
|---|---|---|
| watching | quiet sentinel | blades open wide, slow 4 s breathing core, single scan sweep every cycle |
| listening | operator speaking | blades still, core ripples with input (TranscriptBars energy) |
| searching | gathering evidence | blades rotate slowly, core emits seeking pulse toward active evidence chips |
| solving | reasoning | blades oscillate, core accelerates 120 BPM, particles converge inward |
| **gated** | **waiting on human** | **blades physically close to a near-locked ring, amber core, lock glyph — the signature moment of the product** |
| executing | authorized action running | blades locked, cyan-teal flow rotates through the seams |
| blocked | can't proceed honestly | blades jam half-closed, red core, hard stop motion (no bounce) |
| receipt | action receipted | single clean flash → blades rest open, teal seal glyph |

## 5. The voice (copy law)

TALON speaks in warm, quantified honesty — the OrchestrateIQ register ("Everything below was inferred from 412 events. Nothing was declared by hand."): first person, consequence before logistics, one recommendation, says what's missing, never blame, never hype. Verdict moments get display-type treatment (§3 of visual-language). Existing law it inherits: Rule of One, anti-nagging, blocker-first, ≤90-word briefs.
