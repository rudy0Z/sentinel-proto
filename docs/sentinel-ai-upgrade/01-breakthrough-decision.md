# 01 - Breakthrough Decision: From Four Phases To Intelligence / Operations

## Decision

Sentinel should stop presenting the product as four separate user-facing phases:

- Scan
- Verify
- Contain
- Rescue

Instead, Sentinel V2 should use two user-facing phases:

1. **Intelligence**
2. **Operations**

The internal prototype may temporarily keep the existing scene names to reduce implementation risk, but the visible product experience, navigation, timeline, case-study narrative, and decision model should shift to the two-phase structure.

## Suggested By

User.

The user identified that the original 90-second story was trying to compress too much into one moment. The previous model implied that TALON could detect, verify, create a containment plan, assign rescue teams, notify authorities, and begin rescue operations inside 90 seconds. That is visually impressive but operationally questionable.

## Final Choice

Use **Intelligence / Operations** as the new product model.

### Intelligence

This phase combines the old Scan and Verify work.

Purpose:

- Detect anomaly.
- Gather data.
- Scout the area.
- Fuse evidence sources.
- Expose confidence and uncertainty.
- Help the operator determine whether the situation is fatal or urgent.
- Notify authorities with an AI-prepared escalation packet inside the 90-second target.

### Operations

This phase combines the old Contain and Rescue work.

Purpose:

- Build containment options.
- Assign drone missions.
- Coordinate ground teams.
- Prepare evacuation and route guidance.
- Supervise exceptions.
- Handle degraded data.
- Maintain auditability.
- Support response after authorities are notified.

## Why This Decision Matters

The original four-phase model made the product feel structured, but it created a realism problem:

- A complete rescue and containment plan is unlikely to be safely produced and authorized inside 90 seconds.
- Real emergency response requires size-up before tactical commitment.
- Authorities need to be notified quickly, but operational planning continues after the notification.
- AI can synthesize evidence quickly, but human response coordination still has real-world constraints.

The new model makes the 90-second promise more credible:

> Sentinel compresses the time from uncertain anomaly to verified escalation and authority notification.

It does not claim:

> Sentinel completes the entire incident response plan in 90 seconds.

## Product Reasoning

The bottleneck in the problem brief is not that drones cannot fly fast enough. The bottleneck is that the operator needs to answer the first high-consequence question quickly:

> Is this real enough, dangerous enough, and urgent enough to notify authorities now?

The old model framed the 90 seconds around containment authorization. That made the story feel like a complete operational response.

The new model frames the 90 seconds around emergency escalation. That is more defensible:

- TALON can process sensor data faster than a human.
- TALON can build a confidence model from thermal, satellite, drone, terrain, weather, and structure data.
- TALON can create a concise notification packet.
- The operator can review enough evidence to confirm escalation.
- Authorities can be notified earlier, while detailed operations planning continues.

## Design Implication

The first 90 seconds should feel like an AI-powered command-room sprint:

1. TALON detects a serious anomaly.
2. TALON starts source convergence.
3. Drone scouting begins.
4. Evidence confidence rises or degrades visibly.
5. TALON prepares an escalation packet.
6. The operator reviews the evidence.
7. The operator confirms emergency risk.
8. Authorities are notified.
9. The product transitions into Operations.

The system should not imply that all downstream rescue and containment details are finished at step 8.

## Tradeoff

### What We Lose

- The old four-phase model was simple and cinematic.
- The old story made the product look more immediately complete.
- "Containment authorized in 90 seconds" sounded bold.

### What We Gain

- The product becomes more realistic.
- The case study becomes harder to attack in an interview.
- The AI role becomes clearer: accelerate intelligence and decision readiness.
- The human role becomes clearer: confirm escalation and retain accountability.
- The Operations phase can become richer and more believable.
- The product better matches enterprise AI design expectations in 2026.

## Case-Study Angle

This is a major decision story.

Possible case-study framing:

> I initially designed the 90-second target as a full containment authorization milestone. During review, I realized that was operationally unrealistic. A senior stakeholder could easily challenge it: no responsible incident system should imply complete rescue planning in 90 seconds. I reframed the product around a more defensible milestone: 90 seconds from anomaly detection to verified escalation and authority notification. The redesign made Sentinel less flashy but much more credible as an AI decision system.

## Interview Defense

If asked why the model changed:

> The first version was optimizing the wrong endpoint. It treated "90 seconds" as the time to complete the response plan. But in real emergency operations, the first critical bottleneck is verified escalation: deciding whether the anomaly is real, urgent, and authority-notifiable. So I reframed Sentinel around AI-assisted size-up and notification. Containment and rescue planning now happen after the authority handoff, which is more realistic and safer.

## Implementation Evidence To Create

- Replace visible four-phase progress with Intelligence / Operations.
- Show the 90-second timer ending at authority notification.
- Show TALON generating an escalation packet during Intelligence.
- Show Operations beginning only after notification.
- Keep containment/rescue work, but move it after the notification milestone.
- Update review dock labels so scenarios are grouped by Intelligence and Operations.
- Document the transition as a product decision, not just a UI rename.

