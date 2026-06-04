import type { QuickActionId, SceneId, TalonChipId } from "../tokens";
import { T } from "../tokens";

export const COMMAND_LABELS: Record<QuickActionId, string> = {
  "surface-alert": "Surface alert",
  "dispatch-scout": "Dispatch scout",
  "open-verification": "Open verification",
  "monitor-only": "Monitor only",
  "confirm-incident": "Prepare packet",
  "deploy-survey": "Deploy survey",
  "stage-perimeter": "Stage perimeter",
  "stage-responder-guidance": "Guide responders",
  "stage-residential-evacuation": "Prepare evacuation",
  "relay-field-intel": "Relay field intel",
  "notify-authorities": "Send Authority Packet",
  "notify-teams": "Notify teams",
  "mark-high-risk": "Mark high risk",
  "override-plan": "Override plan",
  "open-degraded": "Open fallback",
  "authorize-containment": "Authorize",
  "emergency-evacuate": "Start evacuation",
  "activate-automatic-route": "Guide evac route",
  "deploy-navigation-drone": "Guide personnel",
  "deploy-backup": "Deploy backup",
  "acknowledge-exception": "Acknowledge",
  "abort-mission": "Abort mission",
  "stand-down": "Stand down",
  "shift-handover": "Handover shift",
};

export const COMMAND_BLOCKERS = {
  sourceConflict: "Blocked by source conflict. Verify burn permit before packet preparation.",
  noZone: "Select an operating zone before assigning field assets.",
  stagingIncomplete: "Blocked until coverage, guidance, and team notification are complete.",
  satelliteLoss: "Blocked by satellite loss. Use fallback evidence before authorization.",
} as const;

export const TALON_CHIP_RESPONSES: Record<TalonChipId, { title: string; body: string; tone: string }> = {
  "why-now": {
    title: "Evidence crossed threshold",
    body: "Thermal rise, burn-history match, and NE wind corridor now point to Grid 4C. TALON is surfacing the decision because the risk path is moving toward residential exposure.",
    tone: T.amber,
  },
  "what-changed": {
    title: "Thermal spread increased",
    body: "Thermal delta climbed above baseline and the active edge shifted northeast. Sensor Fusion is weighting recent thermal and wind data above stale fuel data.",
    tone: T.cyan,
  },
  "what-missing": {
    title: "Data gaps remain",
    body: "Ground moisture is stale, aerial visual is smoke-obscured, and fuel load survey is not current. TALON keeps these gaps visible before escalation.",
    tone: T.yellow,
  },
  "show-alternate": {
    title: "Alternate plan prepared",
    body: "Eastern buffer staging can reduce responder exposure but delays residential preparation. TALON can prepare this path; the operator must authorize any field change.",
    tone: T.teal,
  },
  "autonomous-scope": {
    title: "TALON scope",
    body: "TALON can synthesize evidence, prepare packets, recompute plans, and stage recommendations. It cannot notify authorities or alter field operations without operator approval.",
    tone: T.teal,
  },
  "confidence-breakdown": {
    title: "Confidence contributors",
    body: "Thermal and satellite are the strongest contributors. Drone visual is weaker because of smoke. Stale fuel data reduces the confidence ceiling until refreshed.",
    tone: T.cyan,
  },
  "what-blocked": {
    title: "Blocked gates",
    body: "Field-affecting actions remain blocked until the required evidence, source checks, and human authorization gates are complete.",
    tone: T.red,
  },
};

export const TALON_VOICE_RESPONSES: Partial<Record<SceneId, { title: string; body: string; tone: string }>> = {
  "baseline": {
    title: "On watch",
    body: "No active incident. I'm running triage on thermal, wind corridor, and burn history. Grid 4C is the highest-risk pocket — I'll interrupt if the convergence threshold crosses. Nothing to act on right now.",
    tone: T.teal,
  },
  "alert-command": {
    title: "Risk confirmed from three sources",
    body: "Thermal rise, NE wind corridor, and burn-memory from Grid 4C all align above my triage threshold. This isn't a single sensor. Recommend dispatch before the signal drifts. I need Lidar-02 on site to build the verification frame.",
    tone: T.amber,
  },
  "investigation-pending": {
    title: "Evidence frame building",
    body: "Lidar-02 is en route. I'm prefilling the convergence model with thermal, satellite, and wind data while the drone closes in. When it reaches the site, I'll have a preliminary confidence score ready for your review. ETA under 15 seconds.",
    tone: T.cyan,
  },
  "verify-ready": {
    title: "Three sources agree — but visual is weak",
    body: "Thermal, satellite, and burn history converge on Grid 4C at 78%. Drone visual is smoke-obscured — I can locate the perimeter but I can't give you a sharp fire-front boundary. Ground moisture is 48h stale. If you confirm, I'll flag those gaps in the authority packet.",
    tone: T.amber,
  },
  "verify-active": {
    title: "Ready to prepare the packet — I need your call",
    body: "Evidence is sufficient to prepare an authority notification. I have thermal, satellite, wind, and burn history locked in. What I'm missing: fuel moisture index is stale and aerial boundary is smoke-limited. I'll keep those as explicit caveats. Confirm and I prepare the packet. You send it.",
    tone: T.amber,
  },
  "authority-notification-ready": {
    title: "Packet compiled — I am holding it",
    body: "AUD-90-0847 is ready. Thermal, satellite, LiDAR, wind, burn history — all confirmed. Missing fields are documented inline. Confidence: 78%. I cannot send this. That is your authorization gate. When you send it, Operations begins.",
    tone: T.red,
  },
  "contain-recommended": {
    title: "Authorities notified — staging the response",
    body: "Packet AUD-90-0847 is sent and logged. I'm now staging containment options: survey coverage, perimeter hold, responder ingress, and residential preparation. Zone selection routes each task. I won't dispatch drones or move teams until you authorize each one.",
    tone: T.red,
  },
  "contain-alternate": {
    title: "Plan recomputed with your correction",
    body: "NE wind vector correction applied. Perimeter hold is now staged at Buffer East — cleaner ingress edge and better defensible position under current wind. Residential preparation timing shifts slightly later. Review the alternate plan and authorize when ready.",
    tone: T.amber,
  },
  "contain-degraded": {
    title: "Terrain model is incomplete",
    body: "LiDAR ridge mesh reconstruction failed at the northern fold — smoke density was too high. I've widened the spread buffer to absorb the uncertainty. Raw feed remains visible as a secondary reference. I'd recommend holding authorization until we have a cleaner mesh, but the decision is yours.",
    tone: T.amber,
  },
  "rescue-nominal": {
    title: "Coordinating — no autonomous field commands",
    body: "Route A is active. 12 of 47 structures confirmed cleared. I'm monitoring Herald-01, Relay-02, and ground team telemetry in parallel. If anything breaks — battery, signal, route blockage — I'll surface it as an exception before any asset moves. You still authorize all reassignments.",
    tone: T.fire,
  },
  "rescue-signal-degraded": {
    title: "Relay degraded — backup route prepared",
    body: "Herald-01 dropped to 46% signal. Rerouting through the stronger Relay-02 corridor would restore coverage, but that's a field asset change — it needs your approval before I act on it. I've staged the backup assignment. Deploy when ready.",
    tone: T.amber,
  },
  "rescue-battery-critical": {
    title: "Supervised handoff ready — I need your acknowledgement",
    body: "Lidar-02 is at 14%. I've prepared a recall and Scout-03 handoff. Perimeter coverage will transfer without a gap if you acknowledge in the next 60 seconds. I won't recall Lidar-02 or dispatch Scout-03 until you confirm — autonomous battery swaps are outside my authorization boundary.",
    tone: T.amber,
  },
  "network-degraded": {
    title: "Low-bandwidth mode — commands are slower",
    body: "Network latency is at 340ms. I've dropped HD video streams and shifted to lightweight LiDAR vector outlines. Evidence fusion is running but slower. I'm keeping all field-authorization gates blocked until source freshness meets minimum threshold. What do you need from me?",
    tone: T.yellow,
  },
  "satellite-feed-loss": {
    title: "Satellite offline — drone and thermal coverage only",
    body: "Satellite IR is unavailable. I've reweighted the evidence model toward drone telemetry and ground thermal. Spatial model confidence dropped to 40% — spread margin is now ±200m instead of ±80m. I can continue operations with this reduced certainty, but I recommend expanding drone coverage to compensate.",
    tone: T.yellow,
  },
  "infrastructure-total-loss": {
    title: "Core systems offline — manual protocol required",
    body: "Primary feeds are down. I cannot run evidence fusion, spread modeling, or route guidance without infrastructure. Last confirmed state: Rescue Nominal, INC-2024-0847, 03:52:14 UTC. Switch to manual radio on Channel 7 and contact Station 12. I'll preserve audit context until reconnection.",
    tone: T.red,
  },
};

export function getVoiceResponseForScene(scene: SceneId) {
  return {
    chipId: "autonomous-scope" as TalonChipId,
    ...(TALON_VOICE_RESPONSES[scene] ?? {
      title: "Voice request captured",
      body: "TALON is processing the request against active evidence, agent state, and human-gate policy.",
      tone: T.cyan,
    }),
  };
}
