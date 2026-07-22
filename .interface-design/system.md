# Sentinel Interface System

## Intent

Sentinel is a desktop emergency-response command surface for a trained operator working under time pressure. The interface should feel like a spatial intelligence console: dense, calm, technical, and visibly governed by human authorization.

## Domain Vocabulary

- Sensor convergence
- Authority packet
- Human gate
- Spatial risk surface
- Drone/ground-team staging
- Incident timeline
- Evidence uncertainty

## Design Signature

TALON is a supervised copilot embedded in the command bar. The action bar is the single conversational input and authorization surface; the right rail shows TALON output, evidence, and agent state.

## Token Rules

- Use `space` for spacing and padding. Avoid new one-off values unless a map coordinate or fixed canvas measurement requires it.
- Use `typeScale` and `typeWeight` for typography. Avoid raw `fontSize` in new UI.
- Use `radius` for shape. Controls use `md`/`lg`; cards use `card`; glass containers use `glass`; pills use `pill`.
- Use `surface`, `border`, `shadow`, and `tone` for surface, separator, and semantic color treatment.
- Use `tint()` for one-off alpha treatments derived from semantic colors.
- Raw `rgba()` is allowed only inside low-level token definitions, custom keyframes, or map/canvas visualization code.

## Interaction Rules

- TALON may compute, explain, recommend, prepare, and propose.
- Operators authorize authority notifications, containment, evacuation, overrides, and handovers.
- Conversational chips live in the action bar only.
- TALON panel responses must show evidence, uncertainty, agent state, or audit context. It should not duplicate input controls.
- TALON Workforce shows supervised agent work only. It never introduces new action buttons; human-gated decisions remain in the action bar.
- Workforce cards stay compact by default with expandable detail for tool calls, inputs, dependencies, blockers, and audit receipts.
- Authority packet language is explicit: the primary human-gate CTA is `Send Authority Packet`, and completion is tied to an audit receipt.

## Visual System

- Depth strategy: surface color shifts plus low-opacity borders. Shadows are quiet and reserved for glass/overlay stacking.
- Palette: midnight command surfaces, cyan telemetry, amber uncertainty, red danger, teal completion/safe state.
- Typography: IBM Plex Sans for readable command UI, JetBrains Mono for telemetry, audit IDs, timers, and confidence.
- Density: preserve the existing `full`, `condensed`, and `critical` ladder. Reduce words as urgency increases.
