# Final Layout Spec — Sentinel v3 shell (owner ruling 2026-10-11)

> **Status:** canonical — supersedes `02-layout-research-and-direction.md` where they conflict (that doc stays exploratory). Vault `09` (mark law) is *relocated, not repealed* — see §5. Golden rules apply; the honesty boundary and gate law are untouched.
> **Inputs:** 57-frame FireTrace teardown · 21-frame Jarvis/Agently teardown · 16-frame One (getone.one) teardown · `sentinel-layout-thinking/00` (six voices) · `docs/portfolio-case-study/01-product-ux-business-decisions.md` (U1–U13, amended below).
> **Reference:** 1920×1080 desk-embedded console is canonical. Tablet = recomposition (rails → bottom sheets), deferred, never averaged.

---

## 1. The ruling in one paragraph

The map is the hero. TALON is an instrument, not an idol. Authorization stays in the neutral center, but the centered orb object dies — the aperture mark survives as *ink on the control that gates* (a ring that closes when the hold arms). The AI gets a real home on the right: ambient status, composed cards with one action each, voice in with a one-clause voice out, keyboard always. The left spine carries situation data with lips and tier dots; the panel is whatever the operator opened. Nothing auto-raises; TALON badges, the operator opens.

## 2. Regions (1920×1080, all px)

| Region | Geometry | Contents | Law |
|---|---|---|---|
| **Truth strip** | Top, 40px, floating pills over map | `INC-0847` · phase pill (`Intelligence: Detect·Verify·Escalate` / `Operations: Stage·Coordinate·Supervise`) · `T+ MM:SS` · mode badge (scripted / live) | Silent-when-clean: baseline shows incident + clock only. No buttons here. |
| **Map stage** | Full-bleed hero, between rails | fire footprint, spread + envelope, zones, routes, assets, ambient fire light | Only elements permitted to emit light: fire + LiDAR sweep during verification. |
| **FLIR PiP** | Tethered overlay, map bottom-right, ≤ 34% of map | EO / IR-Ironbow / IR-White-hot segment · `ALT/GS/HDG/BAT/LNK` telemetry strip · `HOT ###°C` detections | Overlay grammar (One/Jarvis/FireTrace): never modal, never covers >35% of map, never sits over the Hand. Opens on drone selection or verify scene only. |
| **Left spine** | 64 collapsed / 404 open, snap | `SIT` context inspector · `FLT` fleet + mission clusters · `LOG` ledger | Peek tabs: tier dot + one live lip. One open at a time. Tabs never move mid-hold. |
| **Right console** | 400 wide, full height under truth strip | TALON Mind — see §3 | Collapsible to a 64px spine tab (mistake from v2 fixed: it must be collapsible). |
| **The Hand** | Bottom center, 84px, content-width | Staged gate tile (aperture ring + hold) · decline/hold-left option · danger menu (abort/stand-down) · expiry ring | Compact. No voice panel rising from it. No bloom. Gates live ONLY here. |

**Map real estate budget:** with the Hand at 84px and rails collapsed, the map occupies ≥92% of the frame at 1920×1080 — vs ~72% in the legacy shell (navbar 52 + plinth 132/184 + always-open rails).

## 3. The Right Console — TALON Mind (three stacked zones)

**Zone 1 — Ambient header (~72px).** Aperture sigil 28px (the vault-09 mark at instrument scale) + posture label + one posture line from `deriveTalonSurface()`. This is a *status readout*, not an avatar: no idle animation loop beyond the 4s watching cadence, no pulse theater. When a gate stages, the sigil closes its blades here — and identically on the gate tile.

**Zone 2 — Composed thread (flex, scrolls).** One TALON turn = one card. Card anatomy (fixed, no variants):
- eyebrow: what this is (`EVIDENCE · CONFLICT`, `RECOMMENDATION · DISPATCH`)
- one hero: the single claim or number
- evidence chips: provenance to the 7 source kinds
- **one action row**: numbered `1 2 3` where options exist, the recommended one labeled `(Recommended)` inline — keyboard-addressable like One's blocking-question cards, never color-only
- class chip `C2` / `C3` — friction is *explained*, not arbitrary

Card laws:
- **Height = status.** Open/pending cards are full; resolved, expired, and dismissed cards collapse to a one-line receipt (`Staged "AUTH CONTAIN" expired — nothing executed · AUD-…`). Jarvis's *"Done. It disappears."*, enforced by our expiry law.
- **Disposal is receipted.** Collapse writes the ledger entry; nothing vanishes untraceable.
- **Voice never duplicates the card.** TALON speaks one clause (`• One renewal is at risk.`); the card carries the substance. If the sentence would narrate what the card already shows, the sentence is wrong.

**Zone 3 — Voice bar (sticky, ~64px).** Mic + waveform state (`listening` = red bars) + typed input + send. Transcript is editable before submit; Escape cancels without losing it (PRODUCT.md §9 — non-negotiable). **When listening, the thread condenses to a single pill** (One's collapsed-voice mode): dictation never competes with a full card for attention. Voice is *primary input, never only input* — keyboard path is constitutional. (Both references fail this; we don't.)

**Sticky mirror.** The staged action renders identically here and at the Hand — both derived from `deriveTalonSurface()`. One state, two renderings.

## 4. Keyboard & keycap grammar (steal from One)

Shortcuts render as keycap typography `esc` `space` `E` `1–3`, not tooltips. v1 set: `1–3` answer threaded options · `J/K` cycle open rail views · `esc` cancel listen/undo intent receipt (with the `esc to undo` chip shown inline) · hold `space` on the gate tile for the 2s authorize. Every keycap is a real keyboard path; nothing shortcut-only is pointer-only.

## 5. The mark, relocated (vault-09 amendment — owner ruling)

The Tactical Hybrid Core's 8-posture aperture survives; its *scale and seat* change:
- **Ambient identity**: 28px sigil in the console header (watching = 4s breath cadence, gated = blades closed, etc.).
- **Authorization**: the ring lives on the gate tile itself — blades close as the hold arms. The mark becomes part of the act, not decoration beside it.
- The centered 60px orb object and the rising voice panel are deleted. `talon.css` keyframes port to the new seats; no new motion vocabulary.

## 6. Generative UI policy — industrialized

Rule: **TALON composes inside declared zones. It never moves the furniture.**
- Composition targets (whitelisted): console thread cards, FLIR PiP contents, map annotation layer, ledger receipt rows.
- Hard refusals: never reorder/raise a rail, never open a panel the operator closed, never touch the Hand, never generate outside the whitelist.
- Enforcement: every composition is an intent validated by `domain/intents.ts` like a transition, accepted/dismissed by the operator, logged with an undo receipt. (Jarvis sends a 12%-discount email with no gate and no undo; a command console cannot.)
- Case-study line: *"Generative UI, constitutionally bounded: the agent renders surfaces inside declared zones and every render is validated like a state transition — it never moves where the buttons are."*

## 7. Situation-conditional priority (what leads, when)

| Situation | Left spine leads | Console shows | Hand shows | Arbiter |
|---|---|---|---|---|
| Baseline (quiet) | SIT | designed quiet state — *"Nothing needs you"* as a headline, not a fallback | empty (posture text only) | T4 |
| Intelligence / verify | SIT (evidence) | evidence + conflict cards, calibration | `PREPARE PACKET` staged, gated | T1 gate |
| Intelligence / contested | SIT | re-raise cards citing new delta only | hold/monitor fork | T1 |
| Operations / contain | FLT (fleet/tasking) | plan + task cards, route state | `AUTHORIZE` hold-to-confirm | T1 |
| Operations / exception | FLT + exceptions lip amber | exception + recovery cards | recovery command staged | T2 |
| Degraded/critical | FLT | fallback-evidence cards | nothing auto-fires — human gate | T1/T2 |

Ordering law (already implemented in `domain/attention.ts`): T1 gate › T2 exception › T3 evidence › T4 routine; Intelligence weights evidence first, Operations weights exceptions first; routine is logged, never surfaced. No auto-expand, ever.

## 8. Borrow ledger — what came from where, and what we refused

| Source | Stolen | Refused (with reason) |
|---|---|---|
| **One (getone.one)** | rail-as-home-screen; numbered keyboard-addressable options with inline `(Recommended)`; panel height = status; keycap typography; collapsed-voice mode; empty state as headline; `esc to undo` receipts | Marketing-slide composition (left copy column); single-agent-task framing (we supervise a fleet + incident); its status-by-color-only dots (we pair tone + text) |
| **Jarvis (Agently)** | ambient-pill presence; one-clause voice out; composed cards that mutate and dispose; bound parameter control (deck slider ↔ recommendation numbers) | No-chat transcript (we keep the thread — receipts and debrief need it); execute-on-utterance with no gate/undo/keyboard (our C3 hold + esc-undo are constitutional); full-screen surface takeover (we keep map dominant) |
| **FireTrace** | FLIR PiP tethered + telemetry strip; terrain-clamped overlays; NWCG metric vocabulary; ICS resource grammar; scrub-driven debrief replay | live timeline scrub (forensic nav — debrief only); fixed-wing suppression fleet (scope); zoom/scale inconsistency (craft flaw) |

## 9. Build order (slots into `13-build-plan-a-to-z.md`)

1. **Phase A debt first** (5 `verify:design` violations) — captures must be honest before any new surface.
2. **Console relocation**: sigil header + composed-thread cards + numbered options + card-height-as-status; voice collapse mode. (Hand unchanged yet.)
3. **The Hand rebuild**: compact 84px, aperture ring on the tile, expiry ring, keycap `space` hold, danger menu.
4. **FLIR PiP** onto the map (fixes the verify-feed collision + the signature feature).
5. **Terrain drape + clamp** (the big visual win).
6. **NWCG metric layer** (deck truth cluster + evidence).
7. **Debrief replay** (scrub drives map; debrief mode only).
8. Gates after every step; kill-test unchanged: `verify-active → rescue-battery-critical` ≤30s, hold completes without losing spine position, raise logged.

## 10. Open items

1. Left spine: adopt `J/K` cycle (yes — cheap, matches the reference) — assumed yes, flag if not.
2. FLIR PiP default position: bottom-right of map (assumed) vs top-right under truth strip.
3. Console width 400 vs 420 at 1920 — settle during build against the mirror-parity flow.
