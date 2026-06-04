# 02 - System Architecture and Design

## 1. Technical Environment & Design System Tokens
**FlytBase Sentinel V2** is built as a single-page React-Vite web application, leveraging TypeScript for static compile-time safety and CSS styling variables for rendering fidelity.

The styling system implements **cinematic dark modes** using custom translucent overlays and backdrop blur filters.

### Core Visual Tokens (`tokens.ts`)
*   **The GLASS Token:** `background: rgba(8, 16, 28, 0.55), backdrop-filter: blur(28px) saturate(1.5), border: 1px solid rgba(255, 255, 255, 0.06)`. This provides a "rear-projection" screen depth that captures light without cluttering the map underlay.
*   **The GLASS_SUBTLE Token:** `background: rgba(8, 16, 28, 0.3), backdrop-filter: blur(12px)`.
*   **Typography Separation:**
    *   **Inter (`font.sans`):** Applied to descriptive text, operator warnings, and system rationales to prevent eye strain and improve readability.
    *   **JetBrains Mono (`font.mono`):** Applied to coordinate values, latencies, timestamps, and log listings to maintain data-grid alignment.
*   **Semantic HSL Colors:**
    *   `teal`: `#2DD4A0` (Active sensors, safe statuses).
    *   `cyan`: `#00C8FF` (TALON agent processes).
    *   `amber`: `#F5A623` (Cautions, human gates, override states).
    *   `red`: `#E5533C` (Critical alerts, source discrepancies).
    *   `fire`: `#FF5E3A` (Active wildfire spreads, evacuations).

---

## 2. Progressive UI Density Scaling
During emergency sizing, the cognitive capacity of the operator shrinks. To mitigate change blindness, Sentinel V2 implements **progressive density scaling**—maintaining the same coordinate structure while stripping away verbose text as urgency escalates:

### Detailed Cards (Intelligence Phase)
During Scout Dispatch and Anomaly Review, the operator requires rich telemetry. Drones in the Left Panel render detailed listings:
*   Name and capability badge (e.g. `Thermal-LiDAR`).
*   Assigned zone and mission status.
*   Numeric readouts for Battery %, Signal %, and ETA.

### Compact Strips (Operations Phase)
When the console transitions to Containment or Rescue, the Left Panel drone fleet roster morphs into highly compact, single-line rows:
*   Drone Name (`font.sans` bold).
*   Active assigned role (e.g. `Tactical perimeter containment`).
*   Compact SVG battery icon and level.
*   Colored status indicator dot.
*   All conversational rationales and sub-metrics are hidden to prevent cognitive overload.

---

## 3. TALON Agentic Pipeline Architecture
TALON does not execute recommendations as a single black box. It coordinates a pipeline of dedicated background agents, each writing outputs and blocking on human gates inside the **Agents** tab of the copilot rail:

1.  **Sensor Fusion Agent:** Aggregates thermal, satellite IR, and drone telemetry to build a confidence score.
2.  **Fire Behavior Agent:** Consumes wind vector data, humidity levels, and fuel load profiles to map fire spread rates.
3.  **Values at Risk Agent:** Calculates structure exposures and civilian populations in the projected path.
4.  **Resource Readiness Agent:** Monitors drone battery levels, signal status, and ground team availability.
5.  **Notification Brief Agent:** Collates the AUD-90-0847 dispatch packet for the authority gate.
6.  **Operations Planner Agent:** Staging coordinator that recalculates routing recommendations upon manual operator adjustments.
7.  **Governance Agent:** Appends audit trail logs and seals cryptographic transfer receipts.

---

## 4. Map Canvas Drag-and-Drop Coordination
Sentinel V2 implements interactive click-and-drag asset coordination over the SVG spatial canvas:

```
[ Operator clicks & drags Drone/Team ] ──► [ Mouse move updates raw SVG coords ]
                                                         │
[ Override log written to ledger ] ◄── [ Snaps to nearest anchor & zone via Euclidean math ]
```

*   **Relative Coordinates:** Mouse tracking calculates pointer offsets relative to the SVG container boundaries (`1440x900` space) regardless of display zoom.
*   **Euclidean Proximity Math:** When the operator drops a drone or team, the system runs Euclidean calculations:
    $$\text{Distance} = \sqrt{(X_{\text{entity}} - X_{\text{zone}})^2 + (Y_{\text{entity}} - Y_{\text{zone}})^2}$$
    The system snaps the asset to the nearest operational anchor point and updates its zone association telemetry in real-time.
*   **Automatic Layout Recalculation:** Releasing the dragged asset automatically:
    1.  Writes a manual override caution entry to the activity log ledger.
    2.  Transitions the shell state to `contain-alternate`, forcing the Right Panel to render the alternative plan and prompt operator validation.
