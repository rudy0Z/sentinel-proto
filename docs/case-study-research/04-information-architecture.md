# Sentinel (FlytBase Sentinel) — Information Architecture

> Repo: `D:\portfolio porjects\flytbase` (branch `feat/map-spatial-os`) · Documented 2026-09-16 from latest code.
> Evidence basis: `src/app/routes.ts`, `src/app/tokens.ts`, `src/app/domain/*` (stateMachine, commands, talon, talonSurface, disagreement, exceptions, verification, microcopy), `src/app/components/*`, `src/app/mockData.ts`, `PRODUCT.md`, `DESIGN.md`, `PORTFOLIO-DIRECTION.md`.
> Companion docs: [02-user-flows](02-user-flows.md) · [05-state-path-catalog](05-state-path-catalog.md) · [01-user-journey-map](01-user-journey-map.md) · [03-empathy-maps](03-empathy-maps.md)

## 1. What this app is

An **AI-native emergency-response command interface** for wildfire response (desktop instrument, 1024px+). The entire UI is driven by a copilot — **TALON** assembles evidence, proposes, argues, and remembers being wrong — while a human operator (**Asha**) owns every consequential action. Core promise (from `PRODUCT.md`): compress the first bottleneck — a possible wildfire signal → a **source-aware authority notification** — while consequential decisions stay under human control. The baseline is 48 minutes; the target is **90 seconds**. This is the portfolio's "deep study": the design problem is the human–AI guardrail layer.

**Stack (observed):** React + Vite + react-router (hash router, 3 routes), a heavyweight domain layer (`src/app/domain/`) separate from components, a 3D spatial map (world JSON/DEM data, ~1.2 MB), a stub session gateway (`VITE_SENTINEL_GATEWAY`, default `127.0.0.1:4191`, WebSocket telemetry + `/command` POST), and a **verification toolchain** (`verify:machine`, `verify:signals`, `verify:flows`, `verify:routes`, `verify:map`, `eval:talon`, `npm run check`). It is a scripted portfolio prototype: no live drone feeds, no production AI — stated plainly in `PRODUCT.md`.

## 2. Top-level structure

```
Sentinel
├── Routes (hash router) ── / (ScanPage shell) · /components · /design-system · * → /
├── Experience modes: entry → brief → simulation (guided 90s run) → free exploration
├── The Shell (one instrument, one screen)
│   ├── Navbar — workflow-phase block, mode chip, stepper, operator clock,
│   │            incident-queue popover, debrief (ICS-209), shift handover
│   ├── Left observation rail (LeftPanel + RailStack/Section/PanelViz)
│   ├── Right TALON synthesis rail (TalonCopilotPanel + TalonSession/TalonStream/TalonMark)
│   ├── Persistent command surface (ActionBar + ActionModal gates)
│   └── 3D spatial map (Map3DExplorer → SpatialMapCanvas, zones/routes/agents/overlays3d)
├── Scene states: 20 authored scenes (REVIEW_SCENES) driven by a transition table
├── Exception surfaces: ExceptionSurface, InfrastructureLossTakeover, ContestedWatch
├── Prototype affordances: Review Dock (scene jump), Scenario Switcher (S-01…S-06),
│                          ?core=1 (hides Review Dock for stills/share)
└── Dev pages: ComponentsPage (52KB catalog), DesignSystemPage
```

## 3. Screen inventory

### A. Routes & experience surfaces
| ID | Surface | Source | Purpose |
|---|---|---|---|
| SEN-R0 | Operational shell (`/`) | `pages/ScanPage.tsx` → `SentinelShell.tsx` (150 KB) | The entire product; scenes change inside it |
| SEN-R1 | Components catalog (`/components`) | `pages/ComponentsPage.tsx` | Dev/design review of components |
| SEN-R2 | Design system (`/design-system`) | `pages/DesignSystemPage.tsx` | Tokens & primitives |
| SEN-90 | Entry screen | `shell/EntrySurfaces.tsx` | "FlytBase Sentinel — Wildfire response command interface. **AI proposes. Operator authorizes.**" + Begin Scenario / Explore freely + evaluator note |
| SEN-91 | Scenario brief | `SentinelShell.tsx` (mode `brief`) | Brief before the guided run |
| SEN-92 | End card | `SentinelShell.tsx` (simulation end) | Guided-run completion |
| SEN-93 | Review Dock | `shell/ReviewDock.tsx` | Prototype-only scene jumper (20 scenes, `REVIEW_SCENES`); hidden by `?core=1` |
| SEN-94 | Scenario Switcher | `shell/ScenarioSwitcher.tsx` | Catalog S-01…S-06; authored mirror default, live gateway fetch on demand; failed fetch is a state ("source: authored"), not an error |

### B. Authored scenario catalog (observed, `ScenarioSwitcher.tsx`)
| ID | Scenario | Title |
|---|---|---|
| SEN-S1 | S-01 Encinal Ridge (**Flagship Hero**) | Encinal Ridge |
| SEN-S2 | S-02 False Alarm | Permit Conflict |
| SEN-S3 | S-03 Canyon Gulch | Wind Shear Reroute |
| SEN-S4 | S-04 Data Fog | Degraded Reality |
| SEN-S5 | S-05 Night Rescue | Infrared & Battery |
| SEN-S6 | S-06 Two Voices | Operator Escalates |

### C. Scene states — the real "screens" (observed, `REVIEW_SCENES` in `mockData.ts`)
| ID | Scene | Label | Note (from code) |
|---|---|---|---|
| SEN-01 | `baseline` | Intelligence: Quiet Watch | Passive data monitoring before an incident |
| SEN-02 | `alert-command` | Intelligence: Anomaly Alert | Initial TALON interrupt for scout verification |
| SEN-03 | `investigation-pending` | Intelligence: Scout En Route | Lidar-02 moving toward Grid 4C |
| SEN-04 | `verify-active` | Intelligence: Operator Review | Operator assessing TALON-corroborated data |
| SEN-05 | `authority-notification-ready` | Intelligence: Authority Packet | 90-second milestone ready for **human** send |
| SEN-20 | `verify-source-conflict` | Intelligence: Source Conflict | Satellite and ag-burn records disagree; verification paused |
| SEN-06 | `contain-recommended` | Operations: Plan Staging | Post-notification containment plan |
| SEN-07 | `contain-alternate` | Operations: Recomputed Plan | Operator override plan for review |
| SEN-08 | `contain-degraded` | Operations: Degraded Terrain | Terrain-model fallback view |
| SEN-19 | `contain-awaiting-teams` | Operations: Awaiting Teams | Packet delivered; holding for run-card crews to stage |
| SEN-09 | `rescue-nominal` | Operations: Active Rescue | Authorized operations nominal |
| SEN-10 | `rescue-signal-degraded` | Operations: Signal Exception | Signal exception while rescue continues |
| SEN-21 | `rescue-partial-evac` | Operations: Partial Evacuation | Route A blocked by smoke; Route B shift staged |
| SEN-22 | `handoff-pending` | Operations: Handover Open | Shift change initiated; authority unassigned until PIN |
| SEN-11 | `monitoring-contested` | Disagreement: Contested Watch | Operator overruled TALON; hypothesis stays open at reduced weight |
| SEN-12 | `talon-reraise` | Disagreement: TALON Appeals | New evidence crossed the raised bar; routed to a second authority |
| SEN-13 | `rescue-battery-critical` | Operations: Battery Critical | Drone at 14%; TALON preparing a supervised handoff |
| SEN-14 | `satellite-feed-loss` | Failure: Satellite Loss | Aerial intelligence offline, drone-only telemetry |
| SEN-15 | `infrastructure-total-loss` | Failure: Infrastructure Loss | Total system breakdown; operator manual protocol |
| SEN-16 | `network-degraded` | Failure: Network Degraded | High latency across all feeds; 340 ms average |

### D. Persistent shell regions & modals
| ID | Region | Source | Contents / states |
|---|---|---|---|
| SEN-30 | Navbar | `Navbar.tsx` | Workflow-phase block (Intelligence ⇄ Operations), mode chip + prose status ("Convergence active…"), stepper, operator clock (Asha), incident-queue popover (Grid 4C fully simulated — honesty note in code), debrief + handover buttons; `coreMode`/narrow compact variants |
| SEN-31 | Left observation rail | `panels/LeftPanel.tsx` + `shared/RailStack` | Source/asset/zone panels; 8 panel variants incl. `degraded`, `blocked`, `handoff`, `takeover` (`PanelVariant` in tokens) |
| SEN-32 | Right TALON rail | `panels/TalonCopilotPanel.tsx` (71 KB) | Conversation, chips, evidence, recommendation, packet |
| SEN-33 | Command surface | `ActionBar.tsx` (33 KB) | Primary/secondary/overflow actions with gates + blocked reasons |
| SEN-34 | 3D map | `map/SpatialMapCanvas.tsx` + `runtime/` | Zones, routes, agents, 3D overlays, drone dispatch; world data (buildings/roads/DEM/vegetation) |
| SEN-40 | ActionModal — mission | `ActionModal.tsx` (58 KB) + `actionVisuals` | Confirm-gated mission staging |
| SEN-41 | ActionModal — authority | same | Human-approval packet send (receipt AUD-90-0847) |
| SEN-42 | ActionModal — handover | same | PIN-gated authority transfer |
| SEN-43 | ActionModal — abort | same | Destructive exit confirmation |
| SEN-44 | ExceptionSurface | `ExceptionSurface.tsx` + `domain/exceptions.ts` | Fault banner: affected sources/agents, blocked commands, fallback inputs, confidence impact, recovery command, audit text, spatial uncertainty |
| SEN-45 | InfrastructureLossTakeover | `shell/InfrastructureLossTakeover.tsx` | Total-loss manual protocol surface |
| SEN-46 | ContestedWatch | `ContestedWatch.tsx` + `domain/disagreement.ts` | Dissent record card, re-raise brief, resolution |
| SEN-47 | ICS-209 Debrief | `shell/Ics209DebriefTimeline.tsx` + `DebriefTimeline` | Incident debrief timeline |
| SEN-48 | Action outcome verification | `shared/ActionOutcomeVerification.tsx` + `domain/verification.ts` | Expected vs observed outcome records, deviation states |

## 4. Navigation model

Navigation is **not routes** — it is a single audited transition table (`domain/stateMachine.ts`, ~40 edges). Every edge carries: event, guard, gate (`none` / `confirm` / `human-approval`), a written **reason**, optional `requiresDissent` (overruling TALON forces a stated reason), and side effects (mode switch, authoritiesNotified, resetIncident). `resolveTransition()` is the only way the shell moves; deep links (`system.deep-link`) reach any scene by design but are excluded from reachability analysis ("you can link to it" ≠ "an operator can get there").

Operator movement inputs: command surface buttons (26 command definitions with `riskLevel`, `gate`, `modal`, `blockedBy`, `agentEvidence`, `receipt`), TALON chips, Review Dock jumps (prototype-only), scenario switch, `?scene=` deep links, `?core=1`. System events (timers) drive the guided simulation: alert surfaces, investigation completes, rescue edge case, re-raise threshold, run-card staged, route-A blocked.

Two workflow phases color the whole shell: **Intelligence** (scan → verify) and **Operations** (contain → rescue) derived from `OperationalMode`.

## 5. Navigation rules worth quoting in a case study

1. **Transitions are a governed table, not scattered `setScene` calls** — the code comment records why: 15 hardcoded call sites made scenes "authored snapshots rather than a system"; the table added guards, gates, reasons, and an audit (`auditMachine()`) that *surfaced unreachable scenes*.
2. **Overruling TALON is never silent** — `requiresDissent: true` edges structurally force a stated reason; dissent rides with the artifact.
3. **A human sends the packet** — `notify-authorities` is `human-approval` gated: "The 90-second promise ends here: a human sends the packet. TALON never sends it."
4. **Every failure scene has a real way out** — the code comment admits an earlier "recovery" button that *looked* like an exit but left the operator stuck; recovery edges are now first-class.
5. **Failures arrive by injection, not navigation** — `FAULT_INJECTED_SCENES` have no inbound operator edge by design; they must only have ways out.

*Everything above is observed in code; nothing invented.*
