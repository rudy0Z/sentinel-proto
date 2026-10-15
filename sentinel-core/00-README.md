# Sentinel Product Core — the A-to-Z documentation

> **status: canonical — the final product core.** This folder is the senior-product-design record of Sentinel: what the product is, who TALON is, what it looks like, what data flows through it, and how every block is built. When any other document contradicts this folder, this folder wins for product/visual decisions; the engineering authority remains `src/app/` + `docs/sentinel-v2-master-plan/00–09` (behavior) and `docs/redesign-2026/03` (build plan).

**Why this folder exists:** across five planning generations the product kept drifting — five doc sets, three visual directions, two layout systems. The owner's ruling (2026-09-30): *"unless we are absolutely clean with the final product core, we will keep on drifting."* This folder is the clean core. Nothing here is aspirational; everything here is either already true in the build or explicitly marked `[NEXT]` as the one next change.

**The index:**

| File | What it locks |
|---|---|
| `01-product-core.md` | Identity, users, promise, two-phase model, brand story, the complete data model (what TALON consumes → what the operator sees), backend↔UI mapping, data gaps |
| `02-talon-identity.md` | TALON: the name, the mark (logo brief ready for the logo-designer skill), the orb system (two build options), the 8 postures as motion, the voice |
| `03-visual-language.md` | The final art direction ("Warm Console over Vivid Terrain"), tokens v3, type system, and the **container system** — the one block contract every surface composes |
| `04-iconography-assets.md` | Icon library verdict (from the local vault), the custom asset inventory (drone classes, markers, zones, sensors, empty states) |
| `05-map-world.md` | The map as co-protagonist: vivid-terrain art direction, layer completion list, the location-data pipeline for authoring new incident sites |
| `06-command-deck.md` | The bottom bar: research (Bloomberg, game ability bars, TrackWise/OrchestrateIQ) and the final slot-by-slot spec |

**The drift rule:** a change belongs in this folder first, as a numbered amendment with a date — then in code. If code and this folder disagree, one of them is a bug.

**What is settled (do not re-litigate):** the two-phase model (Intelligence → Operations) · the 90-second promise ending at verified escalation, never containment · human gates on every consequential action · staged expiry, never silent execution · receipts, not authority · the D2 layout (Mind right, Hand bottom-center, Senses on the edges, map full-bleed) · scripted-prototype honesty with a live-sim mode.
