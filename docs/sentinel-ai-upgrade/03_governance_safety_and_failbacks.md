# 03 - Governance, Safety, and Failbacks

## 1. The Forced Calibrator Gate (Automation Bias Mitigation)
High-stress emergency rooms suffer from **Automation Bias**—operators have a natural tendency to trust and "rubber-stamp" AI recommendations without checking source data, leading to false-alarm dispatches (such as treating controlled agricultural burns as active forest fires).

To combat this, Sentinel V2 implements a **Forced Calibrator conflict gate** in the `verify-active` scene:
*   **The Mismatch Trigger:** The Sensor Fusion Agent detects a thermal spike, but satellite records indicate an active agricultural burn permit in the same sector.
*   **Visual Warning Strip:** A high-contrast warning banner is displayed across the ActionBar:
    > `SOURCE DISAGREEMENT: Thermal anomaly vs. active burn permit`
*   **Action Lock:** The primary verification CTAs (like *Confirm Incident* or *Authorize Plan*) are immediately disabled. Hovering over them reveals a tooltip: `"Blocked by source conflict. Verify burn permit before packet preparation."`
*   **Productive Friction:** The operator must manually review the sector permit database and click the safety checkbox:
    > `"I have verified agricultural burn permits for this sector."`
*   **Unlock State:** Checking the box immediately unlocks the action CTAs, restoring the operator's command authority.

---

## 2. Shift Handover Command Transfer (Fatigue Management)
Wildfire suppression incidents span several days, requiring multiple shift rotations. Sizing up drone positions, remaining battery reserves, active evacuation routes, and threat deltas during a shift rotation is a major source of operational failure.

Sentinel V2 implements a secure, telemetry-rich **Shift Handover Incident Transfer Gate**:
*   **Consolidated Handoff Summary:** Clicking the `"👤 Shift Handover"` button in the secondary toolbar pauses active console edits and overlays a dedicated transfer screen summarizing:
    *   Active drone count and specific missions.
    *   Current wind vectors and threat spread rate.
    *   Active civilian evacuation routes.
*   **The PIN Validation Gate:** Incoming Shift Command Lead R. Sharma must review the incident metrics and input their security credentials (PIN `8842`).
*   **Cryptographic Audit Log:** Entering the correct PIN updates the active operator name in the main Navbar to `R. Sharma` and logs a secure receipt to the audit ledger:
    > `Operational Authority transferred from A. Rao to R. Sharma · Cryptographic Receipt: AUDIT-8842`

---

## 3. Cell Network Degradation & Bandwidth Failbacks
Remote wildfire boundaries lack stable fiber-optic connections. In degraded infrastructure zones, network latency frequently exceeds the 300ms SLA, which causes full-screen freeze on traditional dashboards saturated with heavy HD streaming assets.

Sentinel V2 handles connectivity drops through a dedicated **Cell Failback Mode** (`network-degraded` scene):
*   **Latency Threshold:** Latencies above 300ms (configured at **340ms** in the fallback state) trigger a system-wide failback.
*   **Cell Failback Banner:** A red alert strip appears under the main Navbar:
    > `CELL FAILBACK: Low-Bandwidth Mode Active (340ms Latency) · Live HD video streams dropped · Operating via lightweight spatial LiDAR vector outlines`
*   **Satellite Image Opacity Shedding:** To save network bandwidth, the satellite imagery on the MapCanvas is immediately faded to an opacity of **`0.04`**. The background goes dark, prioritizing lightweight, vector-drawn path lines and spatial boundaries.
*   **HD Camera Drop Banners:** Real-time video feeds within the drone inspector modules drop active streams and overlay an offline cell notice:
    > `HD VIDEO DROPPED · Cell Failback Mode Active (340ms Latency)`
*   **Signal Strength Scaler:** Drone signal indicators automatically scale down to reflect transmission interference (`Math.max(d.signal - 18, 22)`).
