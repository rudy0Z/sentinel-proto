# 01 - Product Strategy and Thesis

## 1. Product Context and Positioning
**FlytBase Sentinel** is an AI-native wildfire command and response intelligence system. It serves as a governed, human-in-the-loop command bridge between autonomous drone fleets, ground crews, values-at-risk data, and emergency services.

In a traditional wildfire response scenario, the timeline from initial anomaly detection to containment authorization routinely stretches toward **48 minutes**. This latency is caused by manual assembly of information—operators must manually verify alarms, check controlled burn permits, coordinate field assets, and prepare dispatch packets.

**Sentinel V2's core positioning:**
> Reduce the time from an uncertain remote-sensing anomaly to verified authority escalation from 48 minutes toward 90 seconds, using the TALON copilot to synthesize evidence, expose confidence, and prepare a human-approved dispatch packet.

---

## 2. Redefining the 90-Second Promise
The initial V1 version of Sentinel treated the 90-second timeline as the target to complete the entire incident lifecycle (Scan, Verify, Contain, and Rescue). During design verification, this was identified as operationally unrealistic and indefensible for public-safety systems:
*   Safely finalizing containment flight lines and evacuating residential areas cannot occur before a fire has even been sized up.
*   Irreversible tactical actions require coordinated authority notification.

In Sentinel V2, the **90-second timeline ends at verified incident escalation and authority notification**. 
*   **Start Trigger:** TALON detects a serious thermal/LIDAR anomaly crossing the triage threshold.
*   **End Milestone:** The operator reviews the fused evidence and clicks "Notify Authorities" to dispatch the **AUD-90-0847 escalation packet**.
*   **Operations Phase:** Detailed containment staging, manual drone rerouting, civilian evacuation tracking, and ground team vitals monitoring proceed after the notification is sent.

---

## 3. The Two-Phase Workflow Framing
To reduce cognitive load under extreme time pressure, Sentinel V2 collapses the four procedural stages into **two core operational phases**:

### Phase A: Intelligence (Detect · Verify · Escalate)
*   **Focus:** "Is this incident real, dangerous, and authority-notifiable?"
*   **Operator Task:** Assess incoming anomalies, dispatch verification scouts, review converged evidence sources, resolve permit disagreements, and dispatch the notification packet inside the 90s window.
*   **Aesthetic State:** Verbose data inspect cards, sensor charts, and detailed copilot logs.

### Phase B: Operations (Stage · Coordinate · Supervise)
*   **Focus:** "Coordinate resources, evacuate residents, and authorize tactical containment plans."
*   **Operator Task:** Assign drone mission roles, coordinate staging zones, monitor ground crew biometrics, handle path recomputations, and execute shift authority transfers.
*   **Aesthetic State:** Highly condensed single-line telemetry rows, glowing gradient evacuation meters, and visual exception warnings (zero prose).

---

## 4. Phase-by-Phase Roadmap

```
Phase 0: Specs & Grounding ──► Phase 1: Two-Phase Workflow ──► Phase 2: Intelligence Engine
                                                                         │
Phase 5: Copilot Rail ◄──────── Phase 4: Operations Planning ◄──────────┘
           │
           ▼
Phase 6: Visual Data Craft ──► Phase 7: Governance Ledger ──► Phase 8: Degradation Failbacks
```

*   **Phase 0 - Operational Grounding:** Archive all design rules, telemetry baselines, and safety thresholds.
*   **Phase 1 - Two-Phase UI Reframing:** Introduce the navbar phase indicators, the 90s arc timer, and mode transitions.
*   **Phase 2 - Intelligence Workflow:** Integrate the converged evidence matrix and the AUD-90-0847 dispatch packet.
*   **Phase 3 - Operations Planning:** Move containment staging after notification; establish compact Left Panel views.
*   **Phase 4 - TALON Copilot Rail:** Build the persistent right rail with agent pipelines and conversational prompts.
*   **Phase 5 - Visual Data Craft:** Implement telemetry charts, HSL-themed overlays, and progress gauges.
*   **Phase 6 - Agentic Pipeline:** Surface supervised background agents (Sensor Fusion, Fire Behavior, Resource Readiness).
*   **Phase 7 - Governance & Audit:** Code the Shift Handover PIN validation and log cryptographic receipt ledgers.
*   **Phase 8 - Failback Simulation:** Wire up cell network failbacks (latency warnings, satellite fades, camera drop states).
