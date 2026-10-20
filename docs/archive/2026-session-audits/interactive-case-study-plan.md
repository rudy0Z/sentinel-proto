# Interactive Case Study & Portfolio Hosting Plan

Status: **Planning / parked.** Not to be built yet.
Owner: Rudraksh
Last updated: 2026-06-04

This document captures the direction, decisions, reality-checks, and open
questions for building interactive case studies and the portfolio app. It exists
so we do not lose this context before execution begins.

---

## 1. The Vision

Move away from static case studies (the old portfolio was all static images, no
interaction). The new case studies should embed the **actual live UI** — real,
interactive components/screens a recruiter can hover, click, and explore — instead
of screenshots, GIFs, or videos.

Why this is worth doing:

- **Differentiation.** In the current (brutal) Indian junior market, almost every
  portfolio is a static Behance/Notion board. A case study where the real UI
  responds to the cursor stops a recruiter cold and reads as senior.
- **Quality.** The components render at native crispness at any resolution. No
  banding, no compression artifacts.
- **Less production pain.** Today's screenshot pipeline is: design in code →
  send screen to Figma → clean up → export to image → rename → crop/resize →
  arrange in the case study. Live embeds remove that entire round-trip because
  the designed screen already exists as working code.

## 2. Reality Checks (things that will bite if ignored)

These are not reasons to abandon the direction — they are the gotchas to design
around.

### 2.1 "Copy-paste the component code and it just works" — it will NOT

The Sentinel components are a **connected system**, not isolated tiles. A single
file like `TalonCopilotPanel.tsx` depends on:

- the token system (`tokens.ts`: `T`, `font`, `space`, `radius`, etc.)
- domain logic (`talon.ts`, `exceptions.ts`, `commands.ts`, `panels.ts`, `microcopy.ts`)
- a fully constructed `ShellState` object
- global keyframes injected in `SentinelShell` (`pulse`, `slideInUp`, etc.)
- the Inter / JetBrains Mono fonts (`fonts.css`)
- `framer-motion` / `motion` and `lucide-react`

Pasting one `.tsx` into a blank case-study page produces a wall of errors. The
correct mental model is **"import and mount the real component with curated
state,"** not "paste a file."

### 2.2 Format performance ladder (corrected)

- **GIF — avoid.** 256-color cap = banding on this dark/gradient/glow UI; huge files.
- **MP4/WebM loop — good.** Light, hardware-decoded, smooth. But not interactive.
- **Live component — premium.** Interactive and crisp, but a heavier runtime than a
  static image or a hardware-decoded video. Many live screens on one long page can
  cause jank unless lazy-mounted (render only when scrolled into view).

The live option wins for one reason only: **interactivity** — the recruiter can
touch it. Video/GIF can never do that.

### 2.3 Mobile / responsive

Sentinel screens are dense desktop command UIs designed for ~1366px+ width. On a
recruiter's phone they will look broken unless handled:

- `transform: scale()` the embed down to fit, OR
- a "tap to view fullscreen" affordance, OR
- a graceful fallback (static hero image or short video) on small screens.

### 2.4 Live components do not explain themselves

A case study still needs a **narrative + annotation layer**. The strongest format:
the live screen is the hero, wrapped with the decision story and pointed callouts
("notice the human gate blocks here →"). The interactivity supports the story; it
does not replace it.

## 2.5 Embed strategy — DECIDED: frozen scenes as default, live embed as exception

Two ways to put a screen in a case study:

- **Live prototype embed** (iframe to `/embed?scene=X`): runs the real app. Real
  click-through flow, but heavier (boots the whole app per embed) and coupled to
  prototype churn (scene-ID/route changes can break the case study later).
- **Hardcoded frozen scene** (snapshot baked into the case study): just the visual +
  chosen interactivity. Lighter, decoupled, break-proof.

**Decision: hardcoded frozen scenes are the DEFAULT.** A case study is a frozen
narrative artifact representing the design at ship time — it should NOT silently
change or break when the prototype is refactored. Frozen scenes also address both
stated fears directly:

- *"feel broken later"* → a frozen snapshot can't break from prototype churn.
- *"hogging performance"* → stripped + lazy-mounted, it lands in the same weight
  ballpark as an optimized image, and is far lighter than a live iframe (which
  boots an entire app instance).

Reserve **one** live prototype embed for a single hero "try the real flow yourself"
moment, if true multi-step click-through is wanted. Everything else = frozen scenes.

### Cheap extraction shortcut for Sentinel

Sentinel components are mostly pure functions of `state`. To freeze a scene:
construct the snapshot once (e.g. `createSceneState("authority-notification-ready", 90)`),
freeze the result, render the existing component with it — no timers, no scene
machine. Pixel-perfect, reuses real component code, fully static at runtime.

### Guardrails (so frozen scenes stay light and unbreakable)

1. **Vendor dependencies** — copy `tokens.ts` + needed shared primitives + the
   scene's domain files into the case-study app (or a small shared package). Do
   NOT import live from the prototype; that re-couples them.
2. **Freeze state** — one snapshot, no ticking timers, no transitions.
3. **Keep only intended animation** — prefer CSS keyframes over JS animation loops.
4. **Lazy-mount** — render each scene only when scrolled into view (IntersectionObserver
   / in-view), so off-screen scenes cost nothing.

Trade-off accepted: more upfront extraction per screen than a live embed, but far
less than the old screenshot pipeline, and you do it once. Drift is a non-issue
because a case study is meant to be a snapshot, not an auto-synced mirror.

## 3. Hosting Architecture (decided direction)

One domain, portfolio shell + isolated prototype deployments, embedded via iframe.

```
yourdomain.com                  → Portfolio app (the shell): home, work index, case studies
  /work/sentinel                → Case study PAGE (narrative + annotations + embeds)
                                    └─ iframes the live prototype below
sentinel.yourdomain.com         → Sentinel prototype, its OWN Vercel deployment
  (or yourdomain.com/p/sentinel via vercel.json path rewrite)
project-2.yourdomain.com        → Next prototype, its own deployment
...
```

Why separate deployments instead of one monorepo:

- Sentinel and other prototypes are **heavy standalone apps** with their own
  dependency trees. Keeping them isolated means one prototype's deps/version
  never break another, and you can update or redeploy one without rebuilding all.
- The portfolio shell stays lean; prototypes load on demand inside their case study.

Embedding mechanism:

- **iframe** the prototype (optionally at a deep-linked state, e.g.
  `sentinel.yourdomain.com/embed?scene=verify-active`) into the case-study page.
- iframe gives **style/JS isolation** (the prototype's global CSS/keyframes can't
  leak into the portfolio and vice versa) and bulletproof "it just works" embedding.
- Handle responsive scaling on the iframe wrapper (scale + aspect-ratio box).
- Lazy-load the iframe (only when scrolled near) for performance.

Alternative considered: single Vite/Next monorepo with prototypes as routes and
direct component imports. Cleaner imports, but forces all projects to build
together and risks dependency conflicts. **Rejected** in favor of isolation, given
multiple heavy distinct prototypes.

## 4. Prototype Prerequisites (before any embedding)

Each prototype must be foolproofed before it becomes an embed:

- [ ] No runtime crashes across all scenes/states (Sentinel: all 15 scenes).
- [ ] `npm run typecheck` clean (Sentinel now has tsconfig + script — replicate this
      on every project; the Vite build does NOT type-check).
- [ ] An error boundary so a fault shows a branded screen, not a stack trace.
- [ ] A deep-linkable "embed" entry point / route that can boot directly into a
      chosen state (e.g. `?scene=...`), so a case study can show a specific moment.
- [ ] Looks intact at 1366×768 and 1440×900.
- [ ] A responsive/fallback story for small screens.

## 5. Open Decisions (to finalize later)

- [ ] Portfolio shell stack: Next.js (good for MDX case studies + SEO) vs Vite SPA.
      Leaning Next.js for content + routing + image/iframe handling.
- [ ] Case study authoring format: MDX (narrative + embedded React) vs CMS.
- [ ] Embed mechanism per screen: full iframe vs scaled iframe vs (for simple,
      dependency-light components) direct import.
- [ ] Subdomain (`sentinel.domain.com`) vs path rewrite (`domain.com/p/sentinel`).
- [ ] Which Sentinel moments become live embeds vs video vs static (don't make
      everything live — pick the 2–4 hero moments).
- [ ] Small-screen fallback per embed.

## 6. Candidate Hero Moments for Sentinel (live embeds)

Pick a few; the rest can be video/static.

1. **Authority packet at the 90-second gate** — TALON prepared it, the human sends
   it. The governance thesis in one screen.
2. **Satellite-loss failure** — the unified exception system: banner + right-rail
   queue + blocked agents all reacting to one model. "Failure as a system property."
3. **TALON Workforce** — the agentic workflow running, blocked, gated.
4. **Evidence convergence** — watching TALON build its case across sources.

## 7. Recommended First Step (when resumed)

Build ONE proof-of-concept **frozen scene** end-to-end before scaling (default path):

1. Vendor `tokens.ts` + the scene's component(s) + needed domain files into the
   case-study app (or a small shared package).
2. Construct a frozen snapshot state (e.g. `createSceneState(...)`, no timers) and
   render the component statically.
3. Wrap it in a lazy-mount (in-view) container with one annotated callout, scaled
   responsively with a small-screen fallback.
4. Validate: pixel-perfect vs prototype, light weight, smooth, mobile-safe.
5. Replicate the pattern across the chosen scenes.

Separately, IF a hero "try the real flow" moment is wanted, build ONE live embed:
add `/embed?scene=...` to Sentinel, deploy it standalone, iframe it scaled. Just one.

Learn the real gotchas on one scene, not twelve.

## 8. Why We Are Waiting

Execution is parked until:

1. The case study narrative/structure is finalized.
2. Sentinel is fully foolproofed (and the other portfolio projects too).
3. Then the portfolio app is built as one coordinated effort.

This avoids building the shell around prototypes that are still changing.
