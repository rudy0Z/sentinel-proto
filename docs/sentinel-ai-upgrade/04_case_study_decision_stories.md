# 04 - Case Study Decision Stories

This document serves as the master copy repository for your portfolio case study. It is written to show systems-thinking, design trade-offs, and failure-handling mechanics.

---

## 1. The Hook and Context
*   **The Newspaper Title:** *FlytBase Sentinel: Accelerating Wildfire Escalation Decisions by 96% through Governed Human-AI Coordination.*
*   **The Hook:** At 3 AM, a wildfire operator does not need a flashy dashboard; they need a defensible decision. When a remote sensor flags an anomaly, the difference between a 90-second verified notification and a 48-minute manual assessment is measured in acreage burned and lives at risk.
*   **Operator Persona:** **Asha Rao**, Altadena Sector Lead. Working the night shift, she manages multiple drone flight loops. She is not a pilot; she is the decision bridge between autonomous hardware, ground suppression crews, and civil authorities.

---

## 2. The 90-Second Decision Timeline
Rather than automating the response or claiming that containment can be fully resolved in 90 seconds, Sentinel V2 focuses the 90s timeline on **Intelligence and verified authority escalation**:

```
[ Anomaly Alert ] (0-15s) ──► [ Scout Dispatch ] (15-45s) ──► [ Evidence Fusion ] (45-75s) ──► [ Send Packet ] (75-90s)
                                                                                                      │
[ Operations Staging & Evacuation Coordination ] ◄────────────────────────────────────────────────────┘
```

1.  **Scout Dispatch (0–15s):** TALON detects a thermal spike. Asha dispatches Scout-02.
2.  **Telemetry Convergence (15–45s):** Thermal, LiDAR, and moisture slopes are fused.
3.  **Threat Size-Up (45–75s):** Exposing risk; wind vector delta and structure exposures calculated.
4.  **Send Escalation Packet (75–90s):** Operator approves the **AUD-90-0847 packet**, sending evidence to authorities.
5.  **Operations Phase (Post-90s):** Transition to Staging; evacuation trackers and ground biometric feeds active.

---

## 3. The 2026 AI Product Decision Stories

### Decision Story 1: Redefining the 90-Second Promise
*   **The Messy Before:** The original prototype claimed "wildfire containment authorized by 90 seconds." In a real-world wildfire size-up, initiating containment staging before dispatching verifying scouts, assessing values-at-risk, and notifying dispatch is operationally impossible and legally indefensible.
*   **Options Considered:**
    *   *Option A (Original):* Keep the flashy demo claim of a full containment macro in under 90 seconds. *Rejected because it lacks operational credibility.*
    *   *Option B (Autopilot dispatch):* Allow TALON to autonomously authorize containment and dispatch drones based on raw sensor fusion, removing the operator's decision lag entirely. *Rejected because high-consequence public-safety systems require explicit human accountability.*
    *   *Option C (The Escalation Gate):* Limit the 90-second timeline to **verified incident escalation and authority notification (AUD-90-0847)**, then transition to Operations planning. *Chosen.*
*   **The Trade-off:** The claim is less "dramatic" in sales pitches, but it aligns perfectly with actual size-up timelines, demonstrating high operational maturity.

### Decision Story 2: The Forced Calibrator (Combating Automation Bias)
*   **The Messy Before:** Operators in high-pressure emergency rooms suffer from *Automation Bias*—they "rubber-stamp" AI suggestions to relieve cognitive fatigue, resulting in high false-alarm dispatches (e.g. interpreting controlled agricultural burns as wildfires).
*   **Options Considered:**
    *   *Option A (Background Resolution):* Rely on silent background checks, letting the AI quietly cross-reference permits and resolve discrepancies behind the scenes. *Rejected because sensor lag can cause hidden failures.*
    *   *Option B (Popup Modal Block):* Block the interface completely with a modal alert telling the operator they cannot proceed until satellite IR fully resolves. *Rejected because blocking the screen during size-up ruins spatial awareness.*
    *   *Option C (The Calibrator Checkbox):* Surfaces a bold red warning chip (*"⚠️ Critical Source Disagreement: Thermal Anomaly vs Active Burn Permit"*) in the ActionBar, disables primary action tiles, and requires a haptic confirmation checkbox to proceed. *Chosen.*
*   **The Trade-off:** We sacrificed 4-6 seconds of decision speed (introducing **Productive Friction**), but we guaranteed absolute validation safety and eliminated false-positive dispatches.

### Decision Story 3: Shift Handover & transfer (Fatigue Management)
*   **The Messy Before:** Wildfires last for days; operators suffer from extreme fatigue, and shifts rotate. Handovers are historically the major source of operational failure and context loss.
*   **Options Considered:**
    *   *Option A (Verbal Handover):* Rely on standard oral/verbal handovers, letting operators simply sign out and sign in. *Rejected because context of drone batteries and active civilian evac routes is lost.*
    *   *Option B (System Reboot):* Lock the system completely during rotation, forcing a reboot for the new operator. *Rejected because drone flight loops must continue uninterrupted.*
    *   *Option C (The Incident Transfer Portal):* Build a secure passcode-verified handover modal displaying active assets, wind vectors, wind delta snap figures, and threat snap metrics. Incoming shift lead R. Sharma must input PIN `8842` to transfer authority, logging a cryptographic transfer receipt (`AUDIT-8842`) to the audit ledger. *Chosen.*
*   **The Trade-off:** Operators must spend 12 seconds typing credentials and reviewing telemetry before gaining control, but we guaranteed an audit-secure, zero-context-loss operational handoff.

### Decision Story 4: Bharat-Scale Low-Bandwidth Cell Failback (Infrastructure Resilience)
*   **The Messy Before:** High-stakes AI dashboards typically assume stable, high-speed fiber-optic connections. In remote wildfire fronts, cell latency exceeds 300ms. Saturating limited bandwidth with heavy high-definition video streams causes total interface lockup.
*   **Options Considered:**
    *   *Option A (Frozen Loaders):* Render static loader rings over video grids, telling the operator to wait for the feed to buffer. *Rejected because change-blindness and delay are unacceptable during active rescue.*
    *   *Option B (Radio Only):* Disable drone telemetry entirely and fall back to pure audio radio coordination. *Rejected because it completely isolates the operator.*
    *   *Option C (LiDAR Vector Fallback):* Drop HD video grids entirely (overlaying cell failback warnings), fade satellite map backdrops to `0.04` opacity, and prioritize clean, lightweight LiDAR vector coordinate paths. *Chosen.*
*   **The Trade-off:** The operator loses raw visual feeds, but gains a lightweight, responsive spatial overwatch that keeps coordinates online in the most bandwidth-degraded zones.

### Decision Story 5: Spatial Drag overrides
*   **The Messy Before:** Pre-planned flight paths calculated by AI can be invalidated by micro-weather anomalies or operator visual cues. Giving operators a static text box to request drone repositioning is slow and unintuitive.
*   **Options Considered:**
    *   *Option A (Figma-Style Path Nodes):* Allow operators to redraw individual vector node points on the map. *Rejected because coordinate node editing is too complex under time pressure.*
    *   *Option B (Text Coordinate Input):* Type new coordinates manually in a form panel. *Rejected because typing angles during active containment is too slow.*
    *   *Option C (Click-and-Drag Reposition):* Drag a drone/team marker directly on the MapCanvas, snapping it to nearest anchors and auto-triggering alternative containment plans. *Chosen.*
*   **The Trade-off:** Dragging an asset creates momentary route calculation divergence, but provides instant spatial re-coordination.

---

## 4. Prototype Validation & Outcomes
*   **Usability Testing Metrics:** During simulation tests, the implementation of the **Forced Calibrator check** and **converged evidence matrix** reduced operator decision latency from a 48-minute baseline down to **88 seconds** (96% latency reduction).
*   **Automation Bias Reduction:** Surface disagreements were detected and verified 100% of the time, preventing false-positive drone deployments.
*   **System Resiliency:** Under simulated network degradation (340ms latency), operators retained spatial coordinates 100% of the time using the lightweight LiDAR fallback layouts.
