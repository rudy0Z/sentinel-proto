# Sentinel — Hard Audit: the current build vs the plan and the vision

**Date:** 2026-09-03
**Method:** full read of the executed plan (`ok-i-saw-the-fuzzy-music.md`) and every file it names; diffed the working tree against HEAD; ran the app and captured 8 scenes × 2 viewports plus free-mode, session-expanded, checking, recommendation, and 1280 free-mode frames (`verification-artifacts/audit-captures/`); grepped every claim in the user's failure list against source.

**Verdict up front:** The plan was good. The execution did roughly a third of it, did the most visible third instead of the most load-bearing third, and invented two features nobody specified — an "ambient voice" panel and a full-bleed stage gradient — that each introduced a new class of defect. The result is a build that is *less* coherent than the one it started from: the state engine is real but invisible, the morph does not exist, the guardrail story — the thing the case study depends on — now misfires on the first interaction a recruiter will try. Sentinel went from "competent but generic" to "broken in a more interesting way." Both fail; the second is worse because it breaks trust, not just taste.

---

## Part 1 — Plan execution scorecard

| Plan section | Status | Evidence |
|---|---|---|
| **A1 Typography** (optical tracking, focal contract, mid-band collapse) | **~50%** | `tracking.displayTight/fine` added, `typeStyle` recipes now carry tracking, 9px ternary killed, focal contract *written into DESIGN.md §5*. Not done: `title` 13 still exists (mid-band never collapsed), size-only `typeScale` not deprecated, and the focal contract is **not applied to a single panel** — outside the infra-loss takeover, no panel renders any ≥26px read. The rule lives in the doc, not in the screens. |
| **A2 Color** (3-lead palette, cyan calibration) | **Deviated** | Cyan calibrated `#00C8FF → #1CB8E6` — genuinely good. But the plan's locked decision was **retire yellow**; the work *kept* yellow, recolored it (`#E6D24C`), and it still appears 22×. Teal was supposed to demote to completion-only; teal still runs the progress bars on every left-rail row. The plan said cut the rainbow; the work re-tuned the rainbow. |
| **A3 Spacing rhythm** | Not started | No evidence of sectionGap/itemGap audit work. |
| **A4 Radius allowlist** | Partial | Audit script touched; 9px hole closed. |
| **A6 Motion binding** | **Half-done, then violated** | `ease.out`/`ease.in` tokens added — but the new talon.css motion hardcodes ~15 inline durations (480ms, 260ms, 520ms, 900ms, 3.6s…) that the plan explicitly required folding into tokens *before* state work, precisely so the states couldn't drift. The states then drifted. |
| **B Anti-slop** | Partial | #29 neon cyan fixed. #4 rainbow not fixed (yellow kept). #2 custom domain icons not done. #8 moot (liquid-gooey never installed). |
| **C1 State engine on TalonMark** | **Built — and invisible** | The best work in the changeset: 8 motion signatures, aperture blades that close at a gate, glyph overlays, remount-on-state-change, reduced-motion end-states. But (a) the orb's *perimeter color* is driven by the conversation phase, which is `watching` in every ambient scene → the ring is idle-cyan forever; (b) the incident state reaches only the tiny 28px glyph inside a 60px dim disc; (c) nobody can see any of it. An invisible signature is not a signature. |
| **C2 Morphing plate** | **Not built** | Plan: move the command cluster into the *center* column, grow the plate symmetrically from the orb, use liquid-gooey for extension + contested fork only, prototype hold-to-authorize first, and pull the stranded actions out of panels. Shipped: pills still in the outer `1fr` columns (the opposite of the plan), a 200ms `scaleX(0.55→1)` entry animation, no library, no bridge, no fork, stranded actions still stranded. A name ("bloom") was given to an entry transition. |
| **D1 Correctness sweep** | Partial | reraise 78→78 fixed ✓, post-send packet states fixed ✓, entry posture copy fixed ✓. Map-label collisions persist (VANGUARD-01 under the disabled pill at 1280; HERALD-01 under the cluster). Right-rail tab strip still clips ("Exce…"). The plan's fixture↔state-machine invariant was never built. |
| **D2 Depth & atmosphere** | **Botched substitute** | No depth planes, no fog, no noise texture, no gradient borders. Instead: a `-50vw` full-bleed bottom gradient that crushes the bottom quarter of the map to near-black. Depth came out as a black hole. |
| **D3 Craft pass** | Not started | No `font-feature-settings`/`tnum` anywhere in `src/`. No asymmetric rail hierarchy. No collapse chevron. No border downscale work. |

**The pattern, named:** tokens and documentation were updated (the cheap, invisible half) while the application work the tokens were supposed to govern (the visible half) was skipped or replaced. And two unspecified inventions — the ambient voice panel and the stage gradient — shipped without the state-derivation layer that would have kept them honest.

---

## Part 2 — The failure you actually felt: TALON's soul was stripped, and here is the mechanism

Your sentence — "I click on talon expecting i can talk to talon but all i get is receipt written" — is not a vibe. It is traceable to specific decisions:

**1. The conversation is a debug form.** Expanding the session (`capture 11`) shows, in order: *"Scripted prototype — TALON replies, agent work, and evidence are authored states, not a live model"* (the first sentence of your AI copilot is a developer disclaimer), then a "TALON session / Watching" header, then a paragraph, then three stacked dev-form buttons: *Start browser speech / Type command / Use scripted fallback*. No conversation history. No suggested commands. No evidence you can interrogate. No personality. The old "Brief TALON by voice" strip — mic + example command (*"TALON, wind shifted northeast — move perimeter hold to buffer east…"*) + listening/processing/responded states — **still exists**, but it is buried inside a scene-specific panel (`CompactPanel`, "Alternate containment plan active", `SentinelShell.tsx:~1017-1060`), so it renders on one scene, inside one panel, behind one accordion. The multimodal interaction wasn't removed; it was *filed*.

**2. The scripted pipeline misfires semantically, and it's the first thing a recruiter does.** On the baseline scene I clicked the orb and ran the scripted fallback. The result (`capture 13`): **"Human approval required"** for the action *"Maintaining watch"* — a governance gate demanding authorization to continue watching nothing, with the instruction *"use the adjacent operator command to authorize this recommendation"* — and there is no adjacent operator command on that screen. The gate that was supposed to be Sentinel's most meaningful pattern fires on a meaningless action. This is guardrail theater, and it poisons the exact case-study claim (D-01/D-03, "named gates with receipts") the whole portfolio piece rests on. It also strands the orb in a green lock state at rest.

**3. Three surfaces say the same sentence, and a fourth contradicts all of them.** The TALON decision brief text is rendered simultaneously in the voice panel, the session surface, and the right rail. Meanwhile in `monitoring-contested` and `talon-reraise`, the voice panel — derived only from `state.actionSurface` — declares *"QUIET WATCH — nothing has crossed the escalation threshold"* directly beneath panels headlined *"contested watch"* and *"THRESHOLD CROSSED."* The old design's sin was saying "No command staged" (absence). The new one asserts the opposite of reality. In a product whose thesis is "TALON's words are trustworthy," a false sentence from TALON is the one unrecoverable bug class.

**4. Opening TALON destroys context.** The expanded session occupies the exact slot of the ambient voice and replaces it — so the act of engaging the copilot erases what the copilot was saying. A conversation partner that forgets its own last sentence when you look at it.

**Why this happened (root cause):** there is no single derivation of "what is TALON's state right now." The orb ring reads the *conversation* phase; the ambient voice reads *actionSurface*; the mark reads a hand-passed `ambientMarkState` that itself derives from `actionSurface` and is therefore blind exactly in the contested/reraise scenes; the center panels read scene fixtures. Four sources of truth, four answers. The plan's D1 invariant (a scene must not express a state the machine says is unreachable) was the fix for exactly this, and it was never built. Every defect above is a symptom of that one missing layer.

---

## Part 3 — Your six failures, verified, corrected, and deepened

**Failure 1 — TALON stripped of its multimodal soul: CONFIRMED**, with the correction that the voice/mic system was buried, not deleted (see Part 2). One more correction to your notes: the orb is not 36px — the floating orb is 60px; 36px is the compact/modal mark. The *mark inside* renders at 28px, which is why it reads as a trinket.

**Failure 2 — Double-bar overlap: CONFIRMED, different cause.** There is no `GuidanceStrip` in the codebase. What overlaps the voice panel is the **SCENES chip** (the ReviewDock trigger) pinned bottom-right of the map lane: at 1280 the voice panel (`max-width: min(520px, calc(100vw - 48px))`) extends into it and truncates mid-sentence behind it (`capture 14`). Two floating chrome objects claiming the same corner with no collision rule — the same class of defect as the map labels under the pills.

**Failure 3 — Navbar cacophony: CONFIRMED in free mode.** FlytBase+Sentinel, incident status, Queue 3 pill, the Intelligence/Detect·Verify·Escalate block (chip with a subtitle — a structure used nowhere else), Handover button, Timeline+Patrol count, two bare icon buttons, UTC clock, avatar. Each element has its own padding, radius, border treatment, and color logic — 46 inline fontSize/radius/tracking declarations in a 731-line file. Why it must be fixed before polish: the navbar is in every single screenshot and every embed; it is the highest-frequency surface in the whole case study, and it currently demonstrates *absence of system* — the exact "AI slop" read you've been fighting, at the top of every frame.

**Failure 4 — Rail disconnect: CONFIRMED, and the cause is structural, not color.** The raw-rgba cleanup actually happened (one raw white rgba left in TalonCopilotPanel). The mess is that the two rails use **two different tab systems** (left: boxed segmented control, Inspect/Assets/Ledger; right: bare text tabs with count badges that clip at 1280) and the right rail stacks four material dialects (brief card, definition rows, amber-bordered packet block, chevron disclosure rows) with inconsistent insets. One rail looks designed; the other looks accumulated. At 1,709 lines, TalonCopilotPanel is now the second-largest component in the app — the file grew a panel per scene instead of growing a system.

**Failure 5 — Map key + prototype disclaimers: CONFIRMED.** The Map key trigger floats mid-map providing near-zero tactical value. The prototype honesty copy — which was a *case-study asset* when it lived in the hero and the "what it proves" section — has leaked into the product surface as shouted UI: the session's first line, the checking phase's "Provider AI is not connected" notice, the scripted-fallback transcript label. There is a correct resolution and it is not deletion: **the honesty boundary lives in the case study's frame around the prototype; inside the product it demotes to a single quiet, dismissible footnote** — one line, first-run only, no developer vocabulary. What must go entirely is dev-voice copy like "use the adjacent operator command" that references UI which may not exist.

**Failure 6 — Missing scene navigator: CONFIRMED for embed, subtle in free.** The SCENES chip exists in free mode (bottom-right, low-contrast, unlabeled purpose) and is **rendered only when `experienceMode === "free" && !coreMode`** — so in the portfolio's embed mode there is no scene navigation at all, and the keyboard toggle (Ctrl+Shift+D) works only in free mode. Your recruiter-perspective requirement — flip scenes without replaying the 90-second script — is unmet in the mode the portfolio actually ships.

**Failures you didn't list, that belong on the same list:**

7. **The stage void** — the `-50vw` gradient that blacks out the bottom quarter of every scene (Part 1, D2).
8. **The disabled-command read** — on the gate screen the forward path ("Prepare authority packet — Blocked by source conflict. Verify bu…") is the dimmest, most truncated element on screen, while "Decline escalation" is crisp. The screen's composition argues against the product's own goal.
9. **The recommendation/command mismatch** — "Recommended next action: Stage operations" beside an offered command of "Deploy survey" — still unresolved, still disqualifying in a reviewer's eyes.
10. **No `tnum`** — every ticking number still jitters horizontally. The cheapest polish win in the entire codebase, unclaimed.
11. **Opening TALON erases the ambient voice** (Part 2.4).

---

## Part 4 — Why the plan-and-work did not reach the vision

The vision had three layers, in dependency order: **truth** (one state derivation all surfaces consume) → **behavior** (the morphing plate grammar, the state engine) → **face** (depth, atmosphere, focal hierarchy). The work built isolated pieces of layer 2 and 3 while skipping layer 1 entirely, then wired the new pieces to the *old* broken sources (`actionSurface`, conversation phase). That is why the result feels incoherent rather than merely unfinished: each new feature re-introduces the contradiction the signature was supposed to resolve. The mark engine was supposed to *be* the state display; instead it decorates a control whose color comes from somewhere else.

The second reason is quieter but just as important: **nobody walked the recruiter path.** Open the app → click TALON → run the scripted fallback → read the recommendation. That 20-second sequence ends in a nonsense gate, a developer disclaimer, and an instruction pointing at nothing. Any visual polish is invisible behind that sequence; it has to be the first thing fixed and the last thing re-verified.

---

## Part 5 — What must be fixed (in order), and why each is non-negotiable

**M0 — One state derivation (the truth layer).** A single `deriveTalonSurface(scene, machineState)` returning `{ posture, tone, markState, voice, command }`, consumed by the orb ring, the mark, the voice panel, and the command cluster. Incident/gate state is the source; `actionSurface` is an input, never the source. *Why first:* every current contradiction (quiet-watch-at-threshold-crossed, always-cyan ring, blind mark, triple-duplicated copy) is this one missing function. Nothing visual can be judged honestly until TALON stops lying.

**M1 — Repair the conversation (the soul).** (a) The session keeps the ambient voice as its header — one continuous surface, never a swap. (b) Replace the debug-form entry with a copilot entry: state header, the live recommendation, 2–3 suggested commands as chips ("Why 78%?", "Brief by voice", "What's uncertain?") that map to real session phases; free typing stays. (c) The scripted fallback produces the *scene's actual* recommendation — never a synthetic gate on a nothing-action; if no recommendation exists, TALON says the posture and stops. (d) Disclosure becomes one quiet dismissible line in the case-study's voice, developer vocabulary deleted from every string. *Why:* this is the interaction the portfolio's entire thesis claims exists; right now the demo of the thesis disproves it.

**M2 — Kill the inventions that misfire.** The stage gradient narrows to a seated plinth or dies; the SCENES chip gets a collision rule and an always-available core-mode variant; the disabled forward command gets a full-width stated-blocker treatment (never a truncated dim pill). *Why:* each is a visible "broken" tell in every capture.

**M3 — Then the plan's actual C2, or an honest descope.** With M0 in place, build the plate: center-column emergence with a real bridge (liquid-gooey, damped, extension + fork only) or a deliberately static plate — but decide it, don't let a 200ms entry animation impersonate it. Move contested/reraise actions onto the command surface so the single-command-surface rule is structural.

**M4 — The face:** unify the two rail tab systems into one, apply the already-written focal contract to panels, `tnum` everywhere numbers tick, navbar regrouped into three quiet clusters (identity / situation / utility), map key removed into the map's corner affordance, D2 atmosphere done as specified (fog + vignette + noise/gradient borders, fire as only light).

The repair order from my previous audit survives this audit unchanged — it just has M0/M1/M2 inserted in front of it, because the current build added regressions that the old order never anticipated.

---

*Captures referenced: `verification-artifacts/audit-captures/01–08` (8 scenes × 1600/1280), `10` free-mode baseline, `11` session expanded, `12` checking, `13` recommendation, `14` verify free 1280. Capture scripts: `scripts/capture-audit.mjs`, `scripts/capture-audit2.mjs`.*
