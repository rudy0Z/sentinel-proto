import { useState, useEffect, useRef } from "react";
import { EVACUATION_ROUTES, ZONES, INCIDENT } from "../mockData";
import type { QuickActionId, DroneRosterEntry, ShellState } from "../tokens";
import { T, font } from "../tokens";

// ─── Mission Brief Data ───────────────────────────────────────────────────────
// Maps each dispatch action to the context TALON presents in the Mission Brief

interface MissionBriefConfig {
  title: string;
  missionType: string;
  talonRationale: string;
  coverageNote: string;
  zoneHint: string;
  tone: string;
  icon: string;
  droneClass: string;
  defaultZoneId: string;
}

const MISSION_BRIEF_DATA: Partial<Record<QuickActionId, MissionBriefConfig>> = {
  "deploy-survey": {
    title: "Deploy Survey Drone",
    missionType: "ZONE SURVEY",
    talonRationale: "TALON recommends initial aerial coverage of the selected zone to build the spatial model. Survey arcs expand the active thermal map and are required before perimeter estimation can begin.",
    coverageNote: "Scout drones fly a wide-arc pattern at 80m AGL, feeding HD visual and thermal data back to TALON in real time.",
    zoneHint: "forest-north",
    tone: T.cyan,
    icon: "◉",
    droneClass: "surveillance",
    defaultZoneId: "forest-north",
  },
  "stage-perimeter": {
    title: "Stage Perimeter Monitor",
    missionType: "PERIMETER HOLD",
    talonRationale: "A Lidar-class asset on the fire edge gives TALON the most accurate spread data. Thermal + LiDAR at the active boundary is the primary input for containment boundary estimation.",
    coverageNote: "Lidar-02 will orbit the active fire boundary at 40m AGL, feeding real-time spread vectors to the TALON model.",
    zoneHint: "forest-north",
    tone: T.fire,
    icon: "∿",
    droneClass: "thermal-lidar",
    defaultZoneId: "forest-north",
  },
  "stage-responder-guidance": {
    title: "Guide Responders",
    missionType: "RESPONDER INGRESS",
    talonRationale: "A relay-guidance asset marks the safest responder ingress corridor. The eastern buffer lane has the clearest terrain and the best signal strength for live relay back to command.",
    coverageNote: "Relay-01 will anchor at the buffer zone ingress point and broadcast a combined audio + light guidance signal for incoming teams.",
    zoneHint: "buffer-east",
    tone: T.yellow,
    icon: "→",
    droneClass: "guidance-relay",
    defaultZoneId: "buffer-east",
  },
  "stage-residential-evacuation": {
    title: "Prepare Evacuation",
    missionType: "CIVILIAN GUIDANCE",
    talonRationale: "Residential Zone 1 is the primary civilian consequence zone with 47 tracked structures in the 30-minute spread path. A Herald-class asset with speakers and lighting is the correct guidance tool for this situation.",
    coverageNote: "Herald-01 will orbit above Residential Zone 1 at 30m AGL, broadcasting the authenticated evacuation instruction sequence with visual strobe markers.",
    zoneHint: "residential-south",
    tone: T.fire,
    icon: "⚠",
    droneClass: "evacuation-guidance",
    defaultZoneId: "residential-south",
  },
  "relay-field-intel": {
    title: "Relay Field Intel",
    missionType: "COMMS ANCHOR",
    talonRationale: "Deploying a relay anchor increases the signal bandwidth for all assets operating across the zone. This is especially important in buffer corridors where terrain obstructs direct comms.",
    coverageNote: "Relay-02 will position itself at the optimal elevation for a multi-hop relay chain from field assets back to the command platform.",
    zoneHint: "buffer-east",
    tone: T.cyan,
    icon: "⇌",
    droneClass: "guidance-relay",
    defaultZoneId: "buffer-east",
  },
  "deploy-navigation-drone": {
    title: "Guide Personnel",
    missionType: "RESPONDER INGRESS",
    talonRationale: "Active rescue operations require a dedicated navigation drone along the primary responder corridor. The eastern buffer has the clearest ingress lane, confirmed by TALON terrain analysis.",
    coverageNote: "Relay-01 will fly the corridor marking the route with strobe signaling and live audio comms for field team coordination.",
    zoneHint: "buffer-east",
    tone: T.yellow,
    icon: "→",
    droneClass: "guidance-relay",
    defaultZoneId: "buffer-east",
  },
  "activate-automatic-route": {
    title: "Residential Evac Drone",
    missionType: "EVACUATION GUIDANCE",
    talonRationale: "Residential Zone 1 has 47 structures in the projected 30-minute spread path. Herald drones provide authenticated audio broadcast and visual marking along the confirmed egress routes.",
    coverageNote: "Herald-01 and Herald-02 will split the residential zone into two guidance sectors, each covering one egress route with strobe lighting and speaker broadcast.",
    zoneHint: "residential-south",
    tone: T.fire,
    icon: "⚠",
    droneClass: "evacuation-guidance",
    defaultZoneId: "residential-south",
  },
};


export interface ModalPayload {
  zones?: string[];
  route?: string;
  count?: number;
  teamAssignments?: { teamId: string; zoneId: string }[];
  zoneTarget?: string;
  resourceType?: string;
  urgency?: string;
}

interface ActionModalProps {
  modalId: QuickActionId;
  state: ShellState;
  onClose: () => void;
  onConfirm: (actionId: QuickActionId, payload?: ModalPayload) => void;
  /** Called when operator approves after voice-overriding the TALON plan */
  onVoiceOverride?: (actionId: QuickActionId) => void;
}

const BACKDROP: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.60)",
  backdropFilter: "blur(5px)",
  WebkitBackdropFilter: "blur(5px)",
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const GLASS_MODAL: React.CSSProperties = {
  background: "rgba(8, 16, 28, 0.96)",
  backdropFilter: "blur(32px) saturate(1.4)",
  WebkitBackdropFilter: "blur(32px) saturate(1.4)",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 32px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)",
  width: 520,
  maxWidth: "90vw",
  overflow: "hidden",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function ModalInput({ value, onChange, type = "text", placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: "10px 14px",
        color: T.textPrimary,
        fontFamily: font.sans,
        fontSize: 13,
        outline: "none",
        boxSizing: "border-box",
      }}
    />
  );
}

function ModalSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "10px 14px",
          color: T.textPrimary,
          fontFamily: font.sans,
          fontSize: 13,
          outline: "none",
          appearance: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#0D1724" }}>
            {o.label}
          </option>
        ))}
      </select>
      <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: T.textMuted, pointerEvents: "none", fontSize: 10 }}>▾</span>
    </div>
  );
}

function Chip({ label, selected, onClick, color }: { label: string; selected: boolean; onClick: () => void; color?: string }) {
  const c = color ?? T.cyan;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 16px",
        borderRadius: 8,
        border: `1px solid ${selected ? c : "rgba(255,255,255,0.12)"}`,
        background: selected ? `${c}22` : "rgba(255,255,255,0.04)",
        color: selected ? c : T.textSecondary,
        fontFamily: font.sans,
        fontSize: 12,
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
        transition: "all 120ms ease",
      }}
    >
      {label}
    </button>
  );
}

function ModalHeader({ title, subtitle, accentColor, icon }: { title: string; subtitle: string; accentColor: string; icon?: string }) {
  return (
    <div style={{ padding: "22px 24px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        {icon && (
          <span style={{ fontSize: 18, color: accentColor }}>{icon}</span>
        )}
        <div style={{ fontFamily: font.sans, fontSize: 16, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.01em" }}>
          {title}
        </div>
      </div>
      <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary }}>
        {subtitle}
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onConfirm, confirmLabel, confirmColor, disabled }: {
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmColor: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ padding: "16px 24px 22px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <button
        type="button"
        onClick={onClose}
        style={{
          padding: "10px 20px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.05)",
          color: T.textSecondary,
          fontFamily: font.sans,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.02em",
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        style={{
          padding: "10px 20px",
          borderRadius: 10,
          border: "none",
          background: disabled ? "rgba(255,255,255,0.08)" : confirmColor,
          color: disabled ? T.textMuted : "#fff",
          fontFamily: font.sans,
          fontSize: 12,
          fontWeight: 700,
          cursor: disabled ? "default" : "pointer",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          opacity: disabled ? 0.5 : 1,
          transition: "opacity 120ms ease",
        }}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 24px" }} />;
}

/** Modal 1: Emergency Evacuation Protocol */
function EvacuationModal({ state, onClose, onConfirm }: { state: ShellState; onClose: () => void; onConfirm: (payload: ModalPayload) => void }) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(EVACUATION_ROUTES[0]?.id ?? "");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [teamZones, setTeamZones] = useState<Record<string, string>>({});

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) => {
      if (prev.includes(teamId)) {
        const next = prev.filter((id) => id !== teamId);
        const newTeamZones = { ...teamZones };
        delete newTeamZones[teamId];
        setTeamZones(newTeamZones);
        return next;
      }
      return [...prev, teamId];
    });
  };

  const selectTeamZone = (teamId: string, zoneId: string) => {
    setTeamZones((prev) => ({ ...prev, [teamId]: zoneId }));
  };

  const selectedRouteLabel = EVACUATION_ROUTES.find((r) => r.id === selectedRouteId)?.label ?? "";
  const assignmentsComplete = selectedTeamIds.length > 0 && selectedTeamIds.every((id) => teamZones[id]);
  const isValid = selectedRouteId && assignmentsComplete;

  return (
    <div style={GLASS_MODAL}>
      <ModalHeader title="Emergency Evacuation Protocol" subtitle="" accentColor={T.fire} />

      {/* Warning bar */}
      <div style={{ margin: "14px 24px 0", padding: "10px 14px", borderRadius: 10, background: "rgba(229,83,60,0.12)", border: `1px solid ${T.red}33`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: T.fire, fontSize: 14 }}>⚠</span>
        <span style={{ fontFamily: font.sans, fontSize: 12, color: T.fire, fontWeight: 500 }}>This will initiate immediate evacuation procedures</span>
      </div>

      <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Route chips */}
        <div>
          <Label>Evacuation Route</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EVACUATION_ROUTES.map((r) => (
              <Chip key={r.id} label={r.label} selected={selectedRouteId === r.id} onClick={() => setSelectedRouteId(r.id)} color={T.fire} />
            ))}
          </div>
        </div>

        {/* Team specific zones */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Label>Select Teams to Deploy</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {state.groundTeams.map((t) => (
                <Chip key={t.id} label={t.name} selected={selectedTeamIds.includes(t.id)} onClick={() => toggleTeam(t.id)} color={T.yellow} />
              ))}
            </div>
          </div>

          {selectedTeamIds.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {selectedTeamIds.map((teamId) => {
                const team = state.groundTeams.find((t) => t.id === teamId);
                const assignedZone = teamZones[teamId];
                // Filter logic: Medical/support typically stay out of direct fire zone
                const availableZones = team?.unitType.toLowerCase().includes("medical")
                  ? ZONES.filter((z) => z.category !== "forest")
                  : ZONES;

                return (
                  <div key={teamId}>
                    <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary, marginBottom: 6 }}>
                      Assign <strong>{team?.name}</strong> <span style={{ opacity: 0.6 }}>({team?.unitType})</span> to:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {availableZones.map((z) => (
                        <Chip
                          key={z.id}
                          label={z.shortLabel}
                          selected={assignedZone === z.id}
                          onClick={() => selectTeamZone(teamId, z.id)}
                          color={z.boundaryColor}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        {isValid && (
          <div style={{ background: "rgba(229,83,60,0.10)", border: `1px solid ${T.red}30`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontFamily: font.mono, fontSize: 9, color: T.fire, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Evacuation Summary</div>
            <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.7 }}>• Route: {selectedRouteLabel}</div>
            {selectedTeamIds.map((tid) => {
              const tName = state.groundTeams.find((t) => t.id === tid)?.name;
              const zName = ZONES.find((z) => z.id === teamZones[tid])?.shortLabel;
              return (
                <div key={tid} style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.7 }}>
                  • {tName} assigned to {zName}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Divider />
      <ModalFooter
        onClose={onClose}
        onConfirm={() =>
          onConfirm({
             route: selectedRouteLabel,
             teamAssignments: selectedTeamIds.map((id) => ({ teamId: id, zoneId: teamZones[id] }))
          })
        }
        confirmLabel="Confirm Evacuation"
        confirmColor={T.red}
        disabled={!isValid}
      />
    </div>
  );
}

/** Modal 2: Abort Drone Mission */
function AbortModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div style={{ ...GLASS_MODAL, width: 460 }}>
      {/* Header with amber warning icon */}
      <div style={{ padding: "22px 24px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: "rgba(245,166,35,0.15)", border: `1px solid ${T.amber}44`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18,
        }}>⚠</div>
        <div>
          <div style={{ fontFamily: font.sans, fontSize: 15, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.01em" }}>Abort Drone Mission</div>
          <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, marginTop: 3 }}>Confirm your decision</div>
        </div>
      </div>

      {/* Situation Summary */}
      <div style={{ margin: "0 24px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px" }}>
        <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Situation Summary</div>
        <div style={{ fontFamily: font.sans, fontSize: 14, fontWeight: 600, color: T.textPrimary, marginBottom: 8 }}>Active incident is under operational watch</div>
        <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: T.amber }}>⚡</span> Aborting will recall all active drones and clear the current mission state
        </div>
      </div>

      <Divider />

      {/* Caption */}
      <div style={{ padding: "10px 24px", fontFamily: font.sans, fontSize: 11, color: T.textMuted, textAlign: "center", fontStyle: "italic" }}>
        The system is advising. You are making the decision.
      </div>

      <Divider />
      <ModalFooter onClose={onClose} onConfirm={onConfirm} confirmLabel="Confirm Abort Drone Mission" confirmColor={T.amber} />
    </div>
  );
}

/** Modal 3: Request Backup Resources */
function BackupModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (payload: ModalPayload) => void }) {
  const [zoneTarget, setZoneTarget] = useState("Zone A");
  const [resourceType, setResourceType] = useState("Aerial Support");
  const [urgency, setUrgency] = useState("High");
  const urgencyLevels = ["Low", "Medium", "High", "Critical"];

  return (
    <div style={GLASS_MODAL}>
      <ModalHeader title="Request Backup Resources" subtitle="" accentColor={T.amber} />

      <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Label>Target Zone</Label>
          <ModalSelect
            value={zoneTarget}
            onChange={setZoneTarget}
            options={[
              { value: "Zone A", label: "Zone A – Forest North" },
              { value: "Zone B", label: "Zone B – Buffer East" },
              { value: "Zone C", label: "Zone C – Residential South" },
            ]}
          />
        </div>

        <div>
          <Label>Resource Type</Label>
          <ModalSelect
            value={resourceType}
            onChange={setResourceType}
            options={[
              { value: "Aerial Support", label: "Aerial Support" },
              { value: "Ground Unit", label: "Ground Unit" },
              { value: "Relay Drone", label: "Relay Drone" },
            ]}
          />
        </div>

        <div>
          <Label>Urgency Level</Label>
          <div style={{ display: "flex", gap: 8 }}>
            {urgencyLevels.map((u) => (
              <Chip key={u} label={u} selected={urgency === u} onClick={() => setUrgency(u)} color={u === "Critical" ? T.red : u === "High" ? T.amber : T.cyan} />
            ))}
          </div>
        </div>
      </div>

      <Divider />
      <ModalFooter
        onClose={onClose}
        onConfirm={() => onConfirm({ zoneTarget, resourceType, urgency })}
        confirmLabel="Confirm Request"
        confirmColor={T.amber}
      />
    </div>
  );
}

/** Modal 4: Notify Authorities */
function NotifyAuthoritiesModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div style={{ ...GLASS_MODAL, width: 460 }}>
      <ModalHeader title="Notify Emergency Authorities" subtitle="Transmit incident report to fire management and emergency dispatch." accentColor={T.cyan} icon="📡" />

      <div style={{ padding: "16px 24px" }}>
        <div style={{ background: "rgba(0,200,255,0.07)", border: `1px solid ${T.cyan}22`, borderRadius: 12, padding: "14px" }}>
          {[
            "Current incident scope and active protection zones",
            "Projected fire spread path and affected structures",
            "Active drone assets and their current assignments",
            "Ground team status and staging positions",
          ].map((line) => (
            <div key={line} style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.8, display: "flex", gap: 8 }}>
              <span style={{ color: T.cyan, flexShrink: 0 }}>✓</span> {line}
            </div>
          ))}
        </div>
      </div>

      <Divider />
      <ModalFooter onClose={onClose} onConfirm={onConfirm} confirmLabel="Send Notification" confirmColor={T.cyan} />
    </div>
  );
}

/** Modal 5: Notify Teams */
function NotifyTeamsModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div style={{ ...GLASS_MODAL, width: 460 }}>
      <ModalHeader title="Alert Ground Teams" subtitle="Notify teams with current assignments and staging instructions." accentColor={T.yellow} icon="📋" />

      <div style={{ padding: "16px 24px" }}>
        <div style={{ background: "rgba(255,209,102,0.07)", border: `1px solid ${T.yellow}22`, borderRadius: 12, padding: "14px" }}>
          {[
            { team: "Alpha Lead", detail: "Perimeter control – Forest North" },
            { team: "Bravo Team", detail: "Structure protection – Buffer East" },
            { team: "Charlie", detail: "Medical and route support – Standby" },
          ].map(({ team, detail }) => (
            <div key={team} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{team}</span>
              <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary }}>{detail}</span>
            </div>
          ))}
        </div>
      </div>

      <Divider />
      <ModalFooter onClose={onClose} onConfirm={onConfirm} confirmLabel="Confirm Alert" confirmColor={T.yellow} />
    </div>
  );
}

/** Modal 6: Stand Down */
function StandDownModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div style={{ ...GLASS_MODAL, width: 460 }}>
      <ModalHeader title="Confirm Mission Stand Down" subtitle="All operations will be formally closed and assets recalled." accentColor={T.teal} icon="✓" />

      <div style={{ padding: "16px 24px" }}>
        <div style={{ background: "rgba(45,212,160,0.07)", border: `1px solid ${T.teal}22`, borderRadius: 12, padding: "14px" }}>
          {[
            "All active drone missions will be recalled to docks",
            "Ground teams will receive stand-down confirmation",
            "Authorities will be notified the incident is contained",
            "System returns to passive monitoring mode",
          ].map((line) => (
            <div key={line} style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.8, display: "flex", gap: 8 }}>
              <span style={{ color: T.teal, flexShrink: 0 }}>✓</span> {line}
            </div>
          ))}
        </div>
      </div>

      <Divider />
      <ModalFooter onClose={onClose} onConfirm={onConfirm} confirmLabel="Confirm Stand Down" confirmColor={T.teal} />
    </div>
  );
}

/** Voice state for the override flow inside MissionBriefModal */
type VoiceOverrideState = "idle" | "listening" | "processing" | "responded";

/** Waveform bar animation for listening state */
function VoiceWaveform({ active }: { active: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 20 }}>
      {[0.6, 1.0, 0.75, 1.0, 0.5, 0.85, 0.65].map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: `${h * 100}%`,
            borderRadius: 2,
            background: T.red,
            opacity: active ? 1 : 0.3,
            animation: active ? `voiceBar${i} 0.6s ease-in-out ${i * 0.08}s infinite alternate` : "none",
            transition: "opacity 200ms ease",
          }}
        />
      ))}
      <style>{`
        ${[0, 1, 2, 3, 4, 5, 6].map(i => `
          @keyframes voiceBar${i} {
            from { transform: scaleY(0.3); }
            to   { transform: scaleY(1); }
          }
        `).join("")}
      `}</style>
    </div>
  );
}

/** Mission Brief — TALON Tactical Order Review */
function MissionBriefModal({
  actionId,
  state,
  onClose,
  onConfirm,
  onVoiceOverride,
}: {
  actionId: QuickActionId;
  state: ShellState;
  onClose: () => void;
  onConfirm: () => void;
  onVoiceOverride?: () => void;
}) {
  const cfg = MISSION_BRIEF_DATA[actionId];
  if (!cfg) return null;

  const [coveragePriority, setCoveragePriority] = useState<"coverage" | "speed">("coverage");
  const [voiceState, setVoiceState] = useState<VoiceOverrideState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleVoiceClick = () => {
    if (voiceState !== "idle") return;
    setVoiceState("listening");
    timerRef.current = setTimeout(() => {
      setVoiceState("processing");
      timerRef.current = setTimeout(() => {
        setVoiceState("responded");
      }, 1800);
    }, 3000);
  };

  const handleVoiceReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVoiceState("idle");
  };

  // Find best candidate drone from the current state
  const candidateDrone: DroneRosterEntry | undefined = state.drones.find(
    (d) => d.droneClass === cfg.droneClass && (d.status === "available" || d.status === "holding")
  ) ?? state.drones.find((d) => d.droneClass === "multi-role" && (d.status === "available" || d.status === "holding"))
    ?? state.drones.find((d) => d.status === "available" || d.status === "holding");

  const zoneData = ZONES.find((z) => z.id === cfg.zoneHint);
  const tone = cfg.tone;

  const signalColor = (!candidateDrone || candidateDrone.signal > 70) ? T.teal : T.amber;
  const batteryColor = (!candidateDrone || candidateDrone.battery > 30) ? T.teal : T.amber;

  const isVoiceActive = voiceState !== "idle";

  return (
    <div style={{ ...GLASS_MODAL, width: 560 }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {/* TALON badge row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{
            padding: "3px 10px", borderRadius: 6, fontFamily: font.mono, fontSize: 9,
            fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            background: voiceState === "responded" ? `${T.amber}18` : `${tone}18`,
            border: `1px solid ${voiceState === "responded" ? `${T.amber}44` : `${tone}44`}`,
            color: voiceState === "responded" ? T.amber : tone,
            transition: "all 300ms ease",
          }}>
            {voiceState === "responded" ? "TALON REVISED PLAN · OPERATOR OVERRIDE" : `TALON MISSION PLAN · ${cfg.missionType}`}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: voiceState === "responded" ? T.amber : T.teal,
              animation: "pulse 1.2s infinite",
            }} />
            <span style={{ fontFamily: font.mono, fontSize: 9, color: voiceState === "responded" ? T.amber : T.teal }}>
              {voiceState === "responded" ? "PLAN UPDATED" : `CONFIDENCE: ${INCIDENT.aiConfidence}%`}
            </span>
          </div>
        </div>

        <div style={{ fontFamily: font.sans, fontSize: 17, fontWeight: 700, color: T.textPrimary }}>{cfg.title}</div>
        <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, marginTop: 4, lineHeight: 1.5 }}>
          {voiceState === "responded"
            ? "Voice input received. TALON has recomputed the mission plan with your correction applied. Review the updated parameters and approve to deploy."
            : cfg.talonRationale}
        </div>
      </div>

      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Asset Assignment */}
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Asset Assignment</div>
          {candidateDrone ? (
            <div style={{
              background: `${tone}0A`,
              border: `1px solid ${tone}30`,
              borderRadius: 12,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: `${tone}18`, border: `1px solid ${tone}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, color: tone, flexShrink: 0,
              }}>{cfg.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: font.sans, fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{candidateDrone.name}</div>
                <div style={{ fontFamily: font.mono, fontSize: 10, color: T.textSecondary, marginTop: 2 }}>{candidateDrone.capabilityLabel}</div>
              </div>
              <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 700, color: batteryColor }}>{candidateDrone.battery}%</div>
                  <div style={{ fontFamily: font.mono, fontSize: 8, color: T.textMuted, letterSpacing: "0.06em" }}>BATT</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 700, color: signalColor }}>{candidateDrone.signal}%</div>
                  <div style={{ fontFamily: font.mono, fontSize: 8, color: T.textMuted, letterSpacing: "0.06em" }}>SIG</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.25)", borderRadius: 12, padding: "12px 14px", color: T.amber, fontFamily: font.sans, fontSize: 12 }}>
              ⚠ No available asset found. A multi-role fallback will be used.
            </div>
          )}
        </div>

        {/* Zone Target */}
        {zoneData && (
          <div>
            <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Target Zone</div>
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "12px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: font.sans, fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{zoneData.label}</div>
                  <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary, marginTop: 3, lineHeight: 1.4 }}>{zoneData.spreadWindow}</div>
                </div>
                <div style={{
                  padding: "3px 8px", borderRadius: 6, fontFamily: font.mono, fontSize: 9, fontWeight: 700,
                  background: "rgba(229,83,60,0.12)", color: T.fire, border: "1px solid rgba(229,83,60,0.25)",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {zoneData.category.toUpperCase()} ZONE
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coverage toggle — hide when voice override is responded */}
        {voiceState !== "responded" && (
          <div>
            <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Coverage Priority</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["coverage", "speed"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setCoveragePriority(p)}
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: 10, cursor: "pointer",
                    fontFamily: font.sans, fontSize: 12, fontWeight: coveragePriority === p ? 700 : 400,
                    border: `1px solid ${coveragePriority === p ? `${tone}66` : "rgba(255,255,255,0.1)"}`,
                    background: coveragePriority === p ? `${tone}18` : "rgba(255,255,255,0.04)",
                    color: coveragePriority === p ? tone : T.textSecondary,
                    transition: "all 120ms ease",
                  }}
                >
                  {p === "coverage" ? "Maximum Coverage" : "Fastest Response"}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted, marginTop: 8, lineHeight: 1.4 }}>
              {coveragePriority === "coverage" ? cfg.coverageNote : "TALON will prioritize the shortest route to position, trading coverage arc for 40% faster on-station time."}
            </div>
          </div>
        )}

        {/* ── Voice Override Panel ──────────────────────────────────────────── */}
        {/* A soft separator before the panel */}
        {isVoiceActive && (
          <div style={{
            borderRadius: 14,
            border: `1px solid ${
              voiceState === "listening" ? `${T.red}50`
              : voiceState === "processing" ? `${T.cyan}40`
              : `${T.teal}55`
            }`,
            background: `${
              voiceState === "listening" ? "rgba(229,83,60,0.07)"
              : voiceState === "processing" ? "rgba(0,200,255,0.05)"
              : "rgba(45,212,160,0.07)"
            }`,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            transition: "all 300ms ease",
            animation: "voicePanelIn 220ms cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            {/* Top row: status label + waveform / spinner */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: voiceState === "listening" ? "rgba(229,83,60,0.18)"
                  : voiceState === "processing" ? "rgba(0,200,255,0.12)"
                  : "rgba(45,212,160,0.12)",
                border: `1px solid ${
                  voiceState === "listening" ? `${T.red}55`
                  : voiceState === "processing" ? `${T.cyan}44`
                  : `${T.teal}55`
                }`,
                flexShrink: 0,
                fontSize: 14,
              }}>
                {voiceState === "listening" ? "🎙️" : voiceState === "processing" ? "⟳" : "✓"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: font.mono, fontSize: 9, letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: voiceState === "listening" ? T.red
                    : voiceState === "processing" ? T.cyan
                    : T.teal,
                  marginBottom: 2,
                }}>
                  {voiceState === "listening" ? "Listening to operator..."
                    : voiceState === "processing" ? "TALON recomputing plan..."
                    : "Plan updated — ready to deploy"}
                </div>
                {voiceState === "listening" && <VoiceWaveform active={true} />}
                {voiceState === "processing" && (
                  <div style={{ fontFamily: font.mono, fontSize: 10, color: T.textMuted }}>
                    Processing voice input · applying corrections
                  </div>
                )}
                {voiceState === "responded" && (
                  <div style={{ fontFamily: font.mono, fontSize: 10, color: T.teal }}>
                    Operator override applied · TALON acknowledged
                  </div>
                )}
              </div>
              {/* Cancel voice if still listening */}
              {voiceState === "listening" && (
                <button
                  type="button"
                  onClick={handleVoiceReset}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.05)", color: T.textMuted,
                    fontFamily: font.sans, fontSize: 11, cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Transcript/response text */}
            <div style={{
              fontFamily: font.sans, fontSize: 12, lineHeight: 1.6,
              color: voiceState === "responded" ? T.textPrimary : T.textSecondary,
              padding: "8px 10px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.06)",
              minHeight: 40,
              transition: "color 300ms ease",
            }}>
              {voiceState === "listening" && (
                <span style={{ color: T.textMuted, fontStyle: "italic" }}>
                  "TALON, wind shifted northeast — move perimeter hold to buffer east instead, and reduce altitude to 30m AGL..."
                </span>
              )}
              {voiceState === "processing" && (
                <span style={{ color: T.cyan, fontFamily: font.mono, fontSize: 11 }}>
                  Recomputing plan with NE wind vector correction...
                </span>
              )}
              {voiceState === "responded" && (
                <span>
                  <strong style={{ color: T.teal }}>TALON:</strong> Confirmed operator correction. Wind vector NE 22km/h applied. Perimeter hold relocated to Buffer East at 30m AGL. Asset re-routed. Plan is updated and ready for your approval.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <Divider />

      {/* ── Custom footer with voice override button ─────────────────────── */}
      <div style={{ padding: "16px 24px 22px", display: "flex", gap: 10, alignItems: "center" }}>
        {/* Cancel (left-aligned) */}
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            color: T.textSecondary,
            fontFamily: font.sans,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.02em",
          }}
        >
          Cancel
        </button>

        {/* Voice override button — shows only when idle or responded */}
        {voiceState !== "listening" && voiceState !== "processing" && (
          <button
            id="mission-brief-voice-override-btn"
            type="button"
            onClick={voiceState === "idle" ? handleVoiceClick : handleVoiceReset}
            title={voiceState === "idle" ? "Change plan by voice" : "Reset voice override"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 16px",
              borderRadius: 10,
              border: `1px solid ${
                voiceState === "responded" ? `${T.amber}55` : "rgba(255,255,255,0.14)"
              }`,
              background: voiceState === "responded"
                ? "rgba(245,166,35,0.12)"
                : "rgba(255,255,255,0.05)",
              color: voiceState === "responded" ? T.amber : T.textSecondary,
              fontFamily: font.sans,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.02em",
              transition: "all 200ms ease",
            }}
          >
            <span style={{ fontSize: 15, lineHeight: 1 }}>
              {voiceState === "responded" ? "↺" : "🎙"}
            </span>
            <span>{voiceState === "responded" ? "Reset" : "Change Plan"}</span>
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Approve & Deploy (right-aligned, amber when override applied) */}
        <button
          id="mission-brief-approve-btn"
          type="button"
          onClick={() => {
            if (voiceState === "responded" && onVoiceOverride) {
              onVoiceOverride();
            } else if (voiceState === "idle") {
              onConfirm();
            }
          }}
          disabled={voiceState === "listening" || voiceState === "processing"}
          style={{
            padding: "10px 22px",
            borderRadius: 10,
            border: "none",
            background: voiceState === "responded" ? T.amber : tone,
            color: "#fff",
            fontFamily: font.sans,
            fontSize: 12,
            fontWeight: 700,
            cursor: voiceState === "listening" || voiceState === "processing" ? "default" : "pointer",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            opacity: voiceState === "listening" || voiceState === "processing" ? 0.4 : 1,
            transition: "all 250ms ease",
          }}
        >
          {voiceState === "responded" ? "Deploy Revised Plan" : "Approve & Deploy"}
        </button>
      </div>

      <style>{`
        @keyframes voicePanelIn {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/** Root modal dispatcher */
export function ActionModal({ modalId, state: _state, onClose, onConfirm, onVoiceOverride }: ActionModalProps) {
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

    const renderModal = () => {
      switch (modalId) {
        case "emergency-evacuate":
          return <EvacuationModal state={_state} onClose={onClose} onConfirm={(p) => onConfirm(modalId, p)} />;
      case "abort-mission":
        return <AbortModal onClose={onClose} onConfirm={() => onConfirm(modalId)} />;
      case "deploy-backup":
        return <BackupModal onClose={onClose} onConfirm={(p) => onConfirm(modalId, p)} />;
      case "notify-authorities":
        return <NotifyAuthoritiesModal onClose={onClose} onConfirm={() => onConfirm(modalId)} />;
      case "notify-teams":
        return <NotifyTeamsModal onClose={onClose} onConfirm={() => onConfirm(modalId)} />;
      case "stand-down":
        return <StandDownModal onClose={onClose} onConfirm={() => onConfirm(modalId)} />;
      // Mission Brief modals — all 7 drone dispatch actions
      case "deploy-survey":
      case "stage-perimeter":
      case "stage-responder-guidance":
      case "stage-residential-evacuation":
      case "relay-field-intel":
      case "deploy-navigation-drone":
      case "activate-automatic-route":
        return (
          <MissionBriefModal
            actionId={modalId}
            state={_state}
            onClose={onClose}
            onConfirm={() => onConfirm(modalId)}
            onVoiceOverride={() => {
              onClose();
              if (onVoiceOverride) onVoiceOverride(modalId);
            }}
          />
        );
      default:
        return null;
    }
  };


  const modal = renderModal();
  if (!modal) return null;

  return (
    <div style={BACKDROP} onClick={handleBackdrop} role="dialog" aria-modal="true">
      <div
        style={{ animation: "modalIn 160ms cubic-bezier(0.34,1.56,0.64,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {modal}
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        select option { background: #0D1724; color: #E8EDF4; }
      `}</style>
    </div>
  );
}
