# 06 — The Command Deck (bottom bar)

> **status: canonical — deck spec.** Research synthesis + the final slot-by-slot spec for the bottom bar. The owner's framing is right: it should feel as deliberate as a game's ability bar — fixed geometry, readable states, zero ambiguity about what is pressable — while staying an emergency-response instrument, not a toy.

## 1. Research synthesis (what the best versions do)

| Pattern | Steal |
|---|---|
| **Game ability bars** (Destiny, WoW, MOBAs) | Fixed slot geometry, keybind badges, **cooldown rings** (= our expiry), state-lit icons, "unusable" dimming — the operator should read the deck like a HUD |
| **Bloomberg command line** | A bottom command surface can be the *primary* expert interface for decades; keyboard-first, zero ambiguity |
| **TrackWise / OrchestrateIQ** | Rich cluster interiors (truth cards, "Do first" priorities) — bars don't have to be sparse |
| **BMW "Locate, Inform, Act"** | Controls nearest reach at the bottom of the curve; status above, action below |
| Our own layout-thinking verdict | The gate never moves mid-hold; TALON never rearranges the deck; authorization stays center |

## 2. The final slot map (1920 reference, `material.glass.deck`, height 96 — up from 88 to end the underfill)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ TRUTH (left)            │  TALON BAY (center, the cradle)         │ COMMANDS (right)  │
│ INC-2024-0847           │   ◉ cradle (posture ring + mark)        │ [C3 tile ⏱] [C2]  │
│ VERIFY · T+1:12 · UTC   │   VERDICT LINE (display voice)          │ [C2 tile]  [⌘more]│
│ ● LIVE-SIM  ◈ receipts  │   consequence brief ≤90w · voice bars   │ override · mic    │
└──────────────────────────────────────────────────────────────────────────────────────┘
   ↑ above the deck, centered: the alert airspace (one arbitrated interrupt, else empty)
```

**Slot laws:**
1. **Truth cluster** — incident id, phase, T+ clock, UTC, LIVE-SIM badge, receipts dot (new: unread receipts pulse). Two rows, eyebrow type, never more.
2. **TALON bay (center)** — the cradle (60px, posture ring, mark) + the **verdict line in display voice** (the brief's first sentence, 15–16px, serif/sans per the type decision) + the full brief on hover/expand + voice bars. This is the deck's soul; it gets ~45% width.
3. **Command slots (right)** — fixed slots like an ability bar: up to 2 C3/gated tiles + 2 C2 tiles, each with keybind badge (`G1`–`G4`, already in the keyboard map), **cooldown-style expiry ring** on staged tiles, disabled = dimmed with reason-on-hover, and a `⌘more` overflow for menu actions. Override + mic anchor the far right.
4. **Quiet watch:** when nothing is staged, the right side shows the authored quiet-state ("Nothing is waiting on you") instead of void — the underfill failure never recurs.
5. **Stability law:** geometry is invariant during a hold; the alert airspace never pushes the deck; pops overlay, never reflow.
6. **Density law:** at 96px the deck carries ≥3 real data moments per zone; no dead thirds.

## 3. Interaction spec

- Tiles: press scale 0.97 (emil), keybind triggers the same `handleAction` path as click; hover raises border; staged tile's ring reads remaining TTL at a glance (arc + numerals on hover).
- Hold (C3): the radial 2s ring replaces the tile face during hold; release = cancel; completion = receipt flash + ledger entry.
- Expiry: dissolve animation → truth cluster logs "expired unactioned" → posture returns to scene truth.
- Keyboard: `G1..G4` arm slots; `Esc` never cancels an unacked T1; deck is fully reachable (existing keyboard map).
- Mic: display-only visualizer until voice input is wired to the gateway; then push-to-talk with barge-in.

## 4. What the deck does NOT do

No navigation (routes/spines own that), no notifications center (airspace + ledger own that), no settings, no chat scrolling (Mind console owns the thread). The deck is the hand — fixed, legible, gripping.
