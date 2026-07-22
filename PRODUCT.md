# Product

## Register

product

## Users

Sentinel is a desktop emergency-response command prototype for a trained operator monitoring wildfire risk and coordinating supervised drone operations.

The primary prototype user is Asha, the operator on authority. She must decide whether incomplete evidence is strong enough to notify authorities, then supervise containment and rescue activity without losing sight of exceptions, field assets, or the limits of TALON.

Secondary users are a relief operator and regional commander who may receive a handover or escalation packet when the primary operator cannot continue.

Sentinel is a scripted portfolio prototype. It has no live drone feeds, production AI, dispatcher testing, or field deployment. The 48-minute baseline and 90-second target come from the challenge brief, not a field study.

## Product Purpose

Sentinel compresses the first emergency-response bottleneck: turning a possible wildfire signal into a source-aware authority notification while keeping consequential decisions under human control.

The core product journey is:

1. TALON detects and assembles a possible anomaly.
2. The operator inspects source freshness, uncertainty, and missing evidence.
3. Conflicting evidence pauses the workflow until a human resolves it.
4. TALON prepares an authority packet.
5. The operator reviews and sends the packet.
6. Operations begin only after authority notification.
7. TALON supervises assets, prepares recovery options, and escalates exceptions without silently taking authority.

Success in the prototype means an evaluator can explain what TALON knows, what it does not know, which action is recommended, what requires human authorization, and what happened after the operator acted.

## Brand Personality

Precise, calm, and accountable.

Sentinel should feel technically capable without becoming theatrical, urgent without using panic as decoration, and autonomous without obscuring human responsibility. The interface is a professional command instrument, not a cinematic control-room fantasy.

## Anti-references

- Generic AI command centers made from glowing orbs, neon gradients, glass-card walls, and constant pulse animation.
- Military-game HUDs that use tactical decoration without useful hierarchy.
- Dashboards that show every metric, badge, and agent state at the same visual weight.
- Voice assistants that simulate listening and action without transcript review or clear scripted-prototype disclosure.
- Autonomous-system UI that hides human gates, uncertainty, degraded inputs, or audit receipts.
- Map markers that appear interactive but do not update shared context.
- Tiny uppercase telemetry used for essential instructions or decisions.
- Demo controls, review docks, or developer shortcuts visible in portfolio screenshots.

## Design Principles

1. **One command picture.** Keep the map, decision context, TALON recommendation, and primary action visible without forcing the operator to scan every telemetry source.
2. **AI prepares; humans authorize.** TALON may detect, compute, explain, recommend, and stage. The operator sends, deploys, overrides, evacuates, aborts, and hands over.
3. **Uncertainty is operational data.** Missing, stale, failed, and conflicting sources remain visible and affect recommendations.
4. **Urgency reduces density.** Verification exposes evidence. Containment condenses decisions. Rescue prioritizes exceptions and live execution.
5. **Spatial state and panel state agree.** Selecting or moving a zone, drone, team, anomaly, or route updates one shared model and one inspection context.
6. **Every consequential action leaves a receipt.** Recommendations, overrides, approvals, dispatches, and failbacks produce plain audit language.
7. **Prototype claims stay honest.** Scripted scenes, simulated telemetry, and conceptual map imagery are labelled without weakening the interaction demonstration.

## Accessibility & Inclusion

Target WCAG 2.2 AA for the desktop prototype.

- Essential labels and instructions are at least 11px, with 12px preferred.
- Text, controls, focus indicators, and map objects meet minimum contrast.
- Every command, tab, modal, popover, map selection, and hold action has a keyboard path.
- Focus is trapped and restored for true modal dialogs.
- Status is never communicated by colour, glow, or motion alone.
- Reduced motion removes scanning sweeps, pulse rings, embers, rotor loops, and positional entrances while retaining useful state changes.
- The interface remains usable at 1280x800, 1366x768, 1440x900, and 1920x1080.
- Consequential actions include explicit names and outcomes rather than icon-only or gesture-only authorization.
- Time-based simulation never prevents a user from pausing, reviewing, or recovering.
