# 04 — Iconography & visual assets

> **status: canonical — asset spec.** The icon library verdict from the local vault, and the complete custom-asset inventory Sentinel needs beyond icons: drone-class glyphs, markers, zone language, sensor visuals, empty states.

## 1. Icon library verdict (from `D:\Design Tools\Ui kits and components\library`)

| Library | Verdict | Role |
|---|---|---|
| **Phosphor** (`repos/phosphor-core`) | **Primary** | 6 weights (thin→fill) + duotone — the only family that can express both the instrument precision (thin/regular) and the warm-state presence (duotone/fill) of the new visual language. Warm-consistent geometry. |
| **Tabler** (`repos/tabler-icons`) | Coverage gap-fill | 5,000+ strokes including geo/military/vehicle vocabulary Phosphor lacks; same 24px stroke logic. |
| Lucide (`repos/lucide`) | Reference only | Clean default; already familiar; keep for comparison during implementation. |
| Heroicons / Iconoir / Remix / Simple-Icons | Not selected | Either wrong personality or brand-logos only. |
| Custom set | **Mandatory** | The 5 drone-class glyphs, TALON mark, zone/sensor vocabulary — nothing off-the-shelf says "Sentinel." |

**Rules:** one family per surface; 1.5px stroke at 16px (Phosphor regular); duotone reserved for state-bearing icons (drone classes, sensors); no mixed families in one container; every icon aliased through a `src/app/icons.ts` registry (name → component) so a family swap is one file.

## 2. Custom asset inventory (what we draw ourselves)

**Drone-class glyphs (5, drawn, duotone):** surveillance = wide-V airframe · thermal-lidar = airframe + concentric scan rings · guidance-relay = airframe + signal arcs · evacuation-guidance = airframe + route arrow · multi-role = airframe + adaptive dot. Each in outline (map marker, 16px) and duotone (panel, 20px) versions. *These become the on-map drone markers and the fleet-panel identifiers — replacing the current abstract AgentMarkers glyphs.*

**TALON mark + orb** — see `02-talon-identity.md` (mark evolutions + orb options).

**Zone language:** per-category fills and strokes already exist (forest/buffer/residential); v3 adds a **hatch texture** per category (6% alpha diagonal patterns) so zones read on the vivid terrain without heavier fills.

**Sensor visuals:** LWIR sensor cones (3D, exists) get a 2D counterpart — a translucent fan wedge from the drone marker in thermal missions; evidence-source icons (9 kinds) drawn in Phosphor-duotone with kind-specific motifs.

**Corridors & routes:** the glowing-route language from TrackWise — 2px core + 8px soft outer glow in the corridor's state color, flow-dash toward egress, animated dash-offset for active only.

**Status & chip vocabulary:** state pills (nominal/degraded/blocked/live) with the warm border + dot; class chips (C2/C3) as mono square-chips; LIVE-SIM badge.

**Empty & edge states (draw, don't skip):** quiet-watch (deck right side: faint "nothing staged" reticle), no-evidence (Mind console), map off-condition (LWIR boot frame), degraded-feed (scanline + authored copy).

**Presentation assets (portfolio layer, not in-app):** deck-console bezel vignette, boot sequence, room-light render for the case study hero — built at case-study time per `redesign-2026/03 §P7`.

## 3. Asset pipeline

Custom SVGs live in `src/app/assets/icons/` as components (viewBox 24, `currentColor`), registered in `src/app/icons.ts`. Glyphs are drawn against the warm-charcoal panel AND the vivid map (test both). Every asset gets a 16px legibility check before merge — the TalonMark 56px rule applied fleet-wide.
