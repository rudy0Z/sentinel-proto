import type { OperationalException, SceneId } from "../tokens";

export function getOperationalException(scene: SceneId): OperationalException | null {
  switch (scene) {
    case "satellite-feed-loss":
      return {
        id: "satellite-feed-loss",
        title: "Satellite feed offline",
        severity: "degraded",
        status: "active",
        affectedSources: ["Satellite IR", "Cloud mask"],
        affectedAgents: ["Satellite Intelligence Agent", "Sensor Fusion Agent"],
        blockedCommands: ["authorize-containment"],
        fallbackInputs: ["Drone visual", "LiDAR", "Ground thermal", "Burn history"],
        confidenceImpact: "Confidence reduced to 40%. Spread margin increased ±200m.",
        recommendedRecoveryCommand: "deploy-survey",
        auditText: "Satellite IR unavailable. TALON shifted evidence weighting to drone telemetry and LiDAR.",
        mapImpact: "Map retains last-known IR footprint and labels the fire edge as drone-weighted.",
      };
    case "network-degraded":
      return {
        id: "network-degraded",
        title: "Network degraded",
        severity: "degraded",
        status: "active",
        affectedSources: ["Live HD video", "Telemetry sync", "Remote command acknowledgements"],
        affectedAgents: ["Sensor Fusion Agent", "Drone Perception Agent", "Governance Agent"],
        blockedCommands: ["authorize-containment"],
        fallbackInputs: ["Low-bandwidth LiDAR outlines", "Cached route model", "Local drone telemetry"],
        confidenceImpact: "Decision latency increased. TALON reduces throughput and keeps gates visible.",
        recommendedRecoveryCommand: "relay-field-intel",
        auditText: "Network latency above threshold. Live HD streams suspended in favor of low-bandwidth telemetry.",
        mapImpact: "Map displays lightweight vector overlays instead of full live feed.",
      };
    case "rescue-battery-critical":
      return {
        id: "battery-critical",
        title: "Battery critical",
        severity: "blocked",
        status: "recovering",
        affectedSources: ["Lidar-02 perimeter feed"],
        affectedAgents: ["Drone Control Agent", "Resource Readiness Agent"],
        blockedCommands: ["activate-automatic-route"],
        fallbackInputs: ["Scout-03 substitute coverage", "Ground team telemetry"],
        confidenceImpact: "Perimeter continuity is at risk until handoff is acknowledged.",
        recommendedRecoveryCommand: "deploy-backup",
        auditText: "Lidar-02 at 14%. TALON prepared supervised recall and handoff to Scout-03.",
        mapImpact: "Map shows temporary coverage gap until backup asset reaches perimeter.",
      };
    case "rescue-signal-degraded":
      return {
        id: "signal-degraded",
        title: "Signal degraded",
        severity: "degraded",
        status: "active",
        affectedSources: ["Herald-01 relay", "Responder route telemetry"],
        affectedAgents: ["Drone Control Agent", "Sensor Fusion Agent"],
        blockedCommands: [],
        fallbackInputs: ["Relay-02 corridor", "Ground team radio", "Cached egress plan"],
        confidenceImpact: "Route confidence reduced. TALON recommends backup relay before additional routing changes.",
        recommendedRecoveryCommand: "deploy-backup",
        auditText: "Primary relay degraded. TALON prepared route through stronger relay corridor.",
        mapImpact: "Map highlights degraded relay segment and suggested fallback corridor.",
      };
    case "infrastructure-total-loss":
      return {
        id: "infrastructure-total-loss",
        title: "Infrastructure unavailable",
        severity: "critical",
        status: "manual",
        affectedSources: ["Command execution", "Cloud sync", "Remote telemetry"],
        affectedAgents: ["TALON Orchestrator", "Governance Agent", "Drone Control Agent"],
        blockedCommands: ["notify-authorities", "authorize-containment", "emergency-evacuate"],
        fallbackInputs: ["Manual radio protocol", "Last audit snapshot", "Local incident board"],
        confidenceImpact: "Automated command execution unavailable. Human manual protocol required.",
        recommendedRecoveryCommand: null,
        auditText: "Infrastructure loss triggered manual protocol. TALON preserves context but cannot execute commands.",
        mapImpact: "Full operational takeover replaces live map with manual-protocol status.",
      };
    case "contain-degraded":
      return {
        id: "terrain-model-degraded",
        title: "Terrain model degraded",
        severity: "advisory",
        status: "active",
        affectedSources: ["LiDAR terrain mesh", "Spread simulation"],
        affectedAgents: ["Drone Perception Agent", "Fire Behavior Agent"],
        blockedCommands: [],
        fallbackInputs: ["Raw camera feed", "Partial LiDAR ridge model", "Wind model"],
        confidenceImpact: "Spread projection remains usable with a wider safety buffer.",
        recommendedRecoveryCommand: "open-degraded",
        auditText: "Terrain reconstruction incomplete. TALON increased spread buffer and kept raw feed visible.",
        mapImpact: "Map marks terrain uncertainty zones around the ridge fold.",
      };
    default:
      return null;
  }
}

export function hasOperationalException(scene: SceneId): boolean {
  return getOperationalException(scene) !== null;
}
