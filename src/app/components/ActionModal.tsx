import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ZONES, INCIDENT } from "../mockData";
import { EGRESS_ROUTES } from "../map/routes";
import type {
  QuickActionId,
  DroneRosterEntry,
  ShellState,
  TalonConversationChangeHandler,
} from "../tokens";
import { T, border, font, layer, material, motion, radius, surface, tint, typeScale } from "../tokens";
import { getTalonSessionView } from "../domain/talon";
import { OperationalIcon } from "./OperationalIcon";
import { TalonSession } from "./talon/TalonSession";

// ─── Mission Brief Data ───────────────────────────────────────────────────────
// Maps each dispatch action to the context TALON presents in the Mission Brief

interface MissionBriefConfig {
  title: string;
  missionType: string;
  talonRationale: string;
  coverageNote: string;
  zoneHint: string;
  tone: string;
  droneClass: string;
  defaultZoneId: string;
}

export const MISSION_BRIEF_DATA: Partial<Record<QuickActionId, MissionBriefConfig>> = {
  "deploy-survey": {
    title: "Deploy Survey Drone",
    missionType: "ZONE SURVEY",
    talonRationale: "TALON recommends initial aerial coverage of the selected zone to build the spatial model. Survey arcs expand the active thermal map and are required before perimeter estimation can begin.",
    coverageNote: "Scout drones fly a wide-arc pattern at 80m AGL, feeding HD visual and thermal data back to TALON in real time.",
    zoneHint: "forest-north",
    tone: T.cyan,
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
    droneClass: "thermal-lidar",
    defaultZoneId: "forest-north",
  },
  "stage-responder-guidance": {
    title: "Guide Responders",
    missionType: "RESPONDER INGRESS",
    talonRationale: "A relay-guidance asset marks the safest responder ingress corridor. The eastern buffer lane has the clearest terrain and the best signal strength for live relay back to command.",
    coverageNote: "Relay-01 will anchor at the buffer zone ingress point and broadcast a combined audio + light guidance signal for incoming teams.",
    zoneHint: "buffer-east",
    tone: T.cyan,
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
    droneClass: "guidance-relay",
    defaultZoneId: "buffer-east",
  },
  "deploy-navigation-drone": {
    title: "Guide Personnel",
    missionType: "RESPONDER INGRESS",
    talonRationale: "Active rescue operations require a dedicated navigation drone along the primary responder corridor. The eastern buffer has the clearest ingress lane, confirmed by TALON terrain analysis.",
    coverageNote: "Relay-01 will fly the corridor marking the route with strobe signaling and live audio comms for field team coordination.",
    zoneHint: "buffer-east",
    tone: T.cyan,
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
    droneClass: "evacuation-guidance",
    defaultZoneId: "residential-south",
  },
};


export interface ModalPayload {
  zones?: string[];
  route?: string;
  /** Named corridor id from NAMED_ROUTES / EGRESS_ROUTES (`route-a` | `route-b`). */
  routeId?: string;
  count?: number;
  teamAssignments?: { teamId: string; zoneId: string }[];
  zoneTarget?: string;
  resourceType?: string;
  urgency?: string;
  passcode?: string;
}

export interface ActionModalProps {
  modalId: QuickActionId;
  state: ShellState;
  onClose: () => void;
  onConfirm: (actionId: QuickActionId, payload?: ModalPayload) => void;
  /** Called when operator approves after voice-overriding the TALON plan */
  onVoiceOverride?: (actionId: QuickActionId) => void;
  /** Owns TALON transcript, review, recommendation, gate, and receipt state. */
  onTalonConversationChange?: TalonConversationChangeHandler;
}

const BACKDROP: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: surface.scrim,
  zIndex: layer.modal,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const MODAL_SURFACE: React.CSSProperties = {
  ...material.overlay,
  width: 520,
  maxWidth: "90vw",
  maxHeight: "calc(100vh - 40px)",
  overflow: "hidden",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: font.mono, fontSize: 11, color: T.textMuted, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function actionConfirmText(disabled?: boolean): string {
  return disabled ? T.textMuted : T.onAction;
}

function ModalInput({
  id,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  spellCheck,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  spellCheck?: boolean;
}) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      spellCheck={spellCheck}
      aria-label={id ? undefined : placeholder}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: "10px 14px",
        color: T.textPrimary,
        fontFamily: font.sans,
        fontSize: 13,
        boxSizing: "border-box",
      }}
    />
  );
}

function ModalSelect({
  id,
  name,
  value,
  onChange,
  options,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={id ? undefined : "Select option"}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "10px 14px",
          color: T.textPrimary,
          fontFamily: font.sans,
          fontSize: 13,
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
      <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: T.textMuted, pointerEvents: "none", fontSize: 11 }}>▾</span>
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
        transition: `background-color ${motion.fast}, border-color ${motion.fast}, color ${motion.fast}`,
      }}
    >
      {label}
    </button>
  );
}

function ModalHeader({ title, subtitle, accentColor, icon }: { title: string; subtitle: string; accentColor: string; icon?: ReactNode }) {
  return (
    <div style={{ padding: "20px 24px 0" }}>
      {/* Mono eyebrow — the shared overlay-family signature */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: font.mono, fontSize: 11, fontWeight: 700, color: accentColor }}>
          Operator command · confirmation required
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        {icon}
        <div style={{ fontFamily: font.sans, fontSize: typeScale.heading, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.01em" }}>
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
          color: actionConfirmText(disabled),
          fontFamily: font.sans,
          fontSize: 12,
          fontWeight: 700,
          cursor: disabled ? "default" : "pointer",
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

function ConfirmIncidentModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div>
      <ModalHeader
        title="Prepare authority packet"
        subtitle="TALON can assemble the packet, but it cannot send it or escalate independently."
        accentColor={T.amber}
      />
      <div style={{ padding: "18px 24px", display: "grid", gap: 12 }}>
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(245,166,35,0.10)", border: `1px solid ${T.amber}33` }}>
          <div style={{ fontFamily: font.mono, fontSize: 11, color: T.amber, marginBottom: 6 }}>HUMAN AUTHORIZATION CHECK</div>
          <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.55 }}>
            You are authorizing preparation only. A separate, explicit send gate remains before authorities are notified.
          </div>
        </div>
        <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.55 }}>
          The authority packet will carry the active evidence summary, known uncertainty, and any recorded operator dissent.
        </div>
      </div>
      <Divider />
      <ModalFooter
        onClose={onClose}
        onConfirm={onConfirm}
        confirmLabel="Prepare authority packet"
        confirmColor={T.amber}
      />
    </div>
  );
}

function CommandConfirmationModal({
  title,
  description,
  tone,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  tone: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <ModalHeader title={title} subtitle={description} accentColor={tone} />
      <div style={{ padding: "18px 24px", fontFamily: font.sans, fontSize: 12, lineHeight: 1.55, color: T.textSecondary }}>
        Confirm this operator action. TALON can prepare and explain the recommendation, but it does not execute the command independently.
      </div>
      <Divider />
      <ModalFooter onClose={onClose} onConfirm={onConfirm} confirmLabel={`Confirm ${title.toLowerCase()}`} confirmColor={tone} />
    </div>
  );
}

/** Modal 1: Emergency Evacuation Protocol */
function EvacuationModal({ state, onClose, onConfirm }: { state: ShellState; onClose: () => void; onConfirm: (payload: ModalPayload) => void }) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    state.selectedEvacuationRouteId ?? EGRESS_ROUTES[0]?.id ?? "route-a",
  );
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

  const selectedRouteLabel = EGRESS_ROUTES.find((r) => r.id === selectedRouteId)?.label ?? "";
  const assignmentsComplete = selectedTeamIds.length > 0 && selectedTeamIds.every((id) => teamZones[id]);
  const isValid = selectedRouteId && assignmentsComplete;

  return (
    <div>
      <ModalHeader title="Emergency Evacuation Protocol" subtitle="" accentColor={T.fire} />

      {/* Warning bar */}
      <div style={{ margin: "14px 24px 0", padding: "10px 14px", borderRadius: 10, background: "rgba(229,83,60,0.12)", border: `1px solid ${T.red}33`, display: "flex", alignItems: "center", gap: 8 }}>
        <OperationalIcon name="warning" color={T.fire} size={14} />
        <span style={{ fontFamily: font.sans, fontSize: 12, color: T.fire, fontWeight: 500 }}>This will initiate immediate evacuation procedures</span>
      </div>

      <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Route chips */}
        <div>
          <Label>Evacuation Route</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EGRESS_ROUTES.map((r) => (
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
                <Chip key={t.id} label={t.name} selected={selectedTeamIds.includes(t.id)} onClick={() => toggleTeam(t.id)} color={T.cyan} />
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
            <div style={{ fontFamily: font.mono, fontSize: 11, color: T.fire, marginBottom: 8 }}>Evacuation summary</div>
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
             routeId: selectedRouteId,
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
    <div>
      {/* Header with amber warning icon */}
      <div style={{ padding: "22px 24px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: "rgba(245,166,35,0.15)", border: `1px solid ${T.amber}44`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18,
        }}><OperationalIcon name="warning" color={T.amber} size={18} /></div>
        <div>
          <div style={{ fontFamily: font.sans, fontSize: 15, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.01em" }}>Abort Drone Mission</div>
          <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, marginTop: 3 }}>Confirm your decision</div>
        </div>
      </div>

      {/* Situation Summary */}
      <div style={{ margin: "0 24px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px" }}>
        <div style={{ fontFamily: font.mono, fontSize: 11, color: T.textMuted, marginBottom: 10 }}>Situation summary</div>
        <div style={{ fontFamily: font.sans, fontSize: 14, fontWeight: 600, color: T.textPrimary, marginBottom: 8 }}>Active incident is under operational watch</div>
        <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
          <OperationalIcon name="warning" color={T.amber} size={14} />
          <span>Aborting will recall all active drones and clear the current mission state</span>
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
    <div>
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
  const packetItems = [
    { label: "Incident class", value: "Authority-notifiable wildfire risk", tone: T.red },
    { label: "Packet ID", value: "AUD-90-0847", tone: T.cyan },
    { label: "Confidence", value: "78%", tone: T.amber },
    { label: "Human gate", value: "Operator send required", tone: T.teal },
  ];

  const evidence = [
    "Thermal delta exceeds seasonal baseline",
    "Satellite IR confirms spread orientation",
    "Scout LiDAR validates ridge-side heat bloom",
    "Wind vector projects northeast movement",
  ];

  const gaps = [
    "Ground fuel survey is 48h stale",
    "Drone visual confidence reduced by smoke",
  ];

  return (
    <div>
      <ModalHeader
        title="Send Authority Packet"
        subtitle="Marks the 90-second milestone. Operations planning begins after dispatch receives this packet."
        accentColor={T.cyan}
        icon={<OperationalIcon actionId="notify-authorities" color={T.cyan} size={18} />}
      />

      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {packetItems.map((item) => (
            <div
              key={item.label}
              style={{
                borderRadius: 10,
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "9px 10px",
              }}
            >
              <div style={{ fontFamily: font.mono, fontSize: 11, color: T.textMuted, marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 700, color: item.tone, lineHeight: 1.25 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(0,200,255,0.07)", border: `1px solid ${T.cyan}22`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontFamily: font.mono, fontSize: 11, color: T.cyan, marginBottom: 8 }}>
            TALON evidence summary
          </div>
          {evidence.map((line) => (
            <div key={line} style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.7, display: "flex", alignItems: "center", gap: 8 }}>
              <OperationalIcon name="check" color={T.cyan} size={13} />
              <span>{line}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(245,166,35,0.07)", border: `1px solid ${T.amber}26`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontFamily: font.mono, fontSize: 11, color: T.amber, marginBottom: 8 }}>
            Included uncertainty
          </div>
          {gaps.map((line) => (
            <div key={line} style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.7, display: "flex", alignItems: "center", gap: 8 }}>
              <OperationalIcon name="warning" color={T.amber} size={13} />
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>

      <Divider />
      <ModalFooter onClose={onClose} onConfirm={onConfirm} confirmLabel="Send Authority Packet" confirmColor={T.cyan} />
    </div>
  );
}

/** Modal 5: Notify Teams */
function NotifyTeamsModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div>
      <ModalHeader title="Alert Ground Teams" subtitle="Notify teams with current assignments and staging instructions." accentColor={T.cyan} icon={<OperationalIcon actionId="notify-teams" color={T.cyan} size={18} />} />

      <div style={{ padding: "16px 24px" }}>
        <div style={{ background: tint(T.cyan, 0.07), border: `1px solid ${tint(T.cyan, 0.28)}`, borderRadius: radius.panel, padding: "14px" }}>
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
      <ModalFooter onClose={onClose} onConfirm={onConfirm} confirmLabel="Confirm Alert" confirmColor={T.cyan} />
    </div>
  );
}

/** Modal: Shift Handover */
function ShiftHandoverModal({
  state,
  onClose,
  onConfirm,
}: {
  state: ShellState;
  onClose: () => void;
  onConfirm: (payload: ModalPayload) => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (pin === "8842") {
      onConfirm({ passcode: pin });
    } else {
      setError("INVALID SECURITY IDENTIFICATION PIN");
    }
  };

  const activeDronesCount = state.drones.filter(d => d.assignedMission && d.assignedMission !== "patrol").length;
  const activeMissions = state.drones
    .filter(d => d.assignedMission && d.assignedMission !== "patrol")
    .map(d => `${d.name} (${d.assignedMission})`)
    .join(", ") || "No active operational missions";

  return (
    <div>
      <ModalHeader
        title="Shift Handover Transfer"
        subtitle="Cryptographic transfer of active tactical incident command."
        accentColor={T.amber}
        icon={<OperationalIcon actionId="shift-handover" color={T.amber} size={18} />}
      />

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Operators block */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: "10px 14px",
          }}>
            <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted }}>Outgoing operator</div>
            <div style={{ fontFamily: font.sans, fontSize: 13, fontWeight: 700, color: T.textPrimary, marginTop: 4 }}>Asha Rao</div>
            <div style={{ fontFamily: font.mono, fontSize: 11, color: T.amber, marginTop: 2 }}>[Altadena Sector Lead]</div>
          </div>
          <div style={{
            background: "rgba(245,166,35,0.06)",
            border: `1px solid ${T.amber}33`,
            borderRadius: 10,
            padding: "10px 14px",
          }}>
            <div style={{ fontFamily: font.sans, fontSize: 11, color: T.amber }}>Incoming operator</div>
            <div style={{ fontFamily: font.sans, fontSize: 13, fontWeight: 700, color: T.textPrimary, marginTop: 4 }}>R. Sharma</div>
            <div style={{ fontFamily: font.mono, fontSize: 11, color: T.teal, marginTop: 2 }}>[Shift Command Lead]</div>
          </div>
        </div>

        {/* Operational state summary */}
        <div style={{
          background: "rgba(0,0,0,0.2)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>
          <div style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 700, color: T.textPrimary, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 6 }}>
            Tactical Operational Summary
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted }}>Active fleet missions</span>
              <div style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.textSecondary, marginTop: 2 }}>
                {activeDronesCount} Drones Assigned
              </div>
            </div>
            <div>
              <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted }}>Weather and wind</span>
              <div style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.textSecondary, marginTop: 2 }}>
                Wind NE @ 18 mph
              </div>
            </div>
            <div>
              <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted }}>Civilian evacuation routes</span>
              <div style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.textSecondary, marginTop: 2 }}>
                {state.emergencyEvacuationActive ? "Routes Stage Active" : "Routes Pending"}
              </div>
            </div>
            <div>
              <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted }}>Threat delta</span>
              <div style={{ fontFamily: font.mono, fontSize: 11, fontWeight: 600, color: T.red, marginTop: 2 }}>
                -4.2% spread vector
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, fontFamily: font.mono, color: T.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Missions: {activeMissions}
          </div>
        </div>

        {/* Passcode validation block */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label htmlFor="shift-handover-pin" style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.textSecondary }}>
            Enter Shift Lead PIN to log handoff:
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              id="shift-handover-pin"
              name="shift-handover-pin"
              type="password"
              placeholder="••••"
              value={pin}
              maxLength={4}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              style={{
                flex: 1,
                background: "rgba(0,0,0,0.4)",
                border: error ? `1px solid ${T.red}` : "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                padding: "8px 12px",
                color: T.onAction,
                fontFamily: font.mono,
                fontSize: 14,
                textAlign: "center",
                letterSpacing: "0.4em",
              }}
            />
            <button
              onClick={handleConfirm}
              style={{
                background: T.amber,
                color: T.onAction,
                border: "none",
                borderRadius: 8,
                padding: "0 20px",
                fontFamily: font.sans,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Verify PIN
            </button>
          </div>
          {error && (
            <span style={{ fontFamily: font.mono, fontSize: 11, color: T.red, fontWeight: 700 }}>
              {error}
            </span>
          )}
        </div>
      </div>

      <Divider />
      <div style={{ padding: "16px 24px 22px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            color: T.textSecondary,
            fontFamily: font.sans,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Modal 6: Stand Down */
function StandDownModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <div>
      <ModalHeader title="Confirm Mission Stand Down" subtitle="All operations will be formally closed and assets recalled." accentColor={T.teal} icon={<OperationalIcon actionId="stand-down" color={T.teal} size={18} />} />

      <div style={{ padding: "16px 24px" }}>
        <div style={{ background: "rgba(45,212,160,0.07)", border: `1px solid ${T.teal}22`, borderRadius: 12, padding: "14px" }}>
          {[
            "All active drone missions will be recalled to docks",
            "Ground teams will receive stand-down confirmation",
            "Authorities will be notified the incident is contained",
            "System returns to passive monitoring mode",
          ].map((line) => (
            <div key={line} style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.8, display: "flex", gap: 8 }}>
              <OperationalIcon name="check" color={T.teal} size={13} /> {line}
            </div>
          ))}
        </div>
      </div>

      <Divider />
      <ModalFooter onClose={onClose} onConfirm={onConfirm} confirmLabel="Confirm Stand Down" confirmColor={T.teal} />
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
  onTalonConversationChange,
}: {
  actionId: QuickActionId;
  state: ShellState;
  onClose: () => void;
  onConfirm: () => void;
  onVoiceOverride?: () => void;
  onTalonConversationChange?: TalonConversationChangeHandler;
}) {
  const cfg = MISSION_BRIEF_DATA[actionId];
  if (!cfg) return null;

  const [coveragePriority, setCoveragePriority] = useState<"coverage" | "speed">("coverage");

  // Find best candidate drone from the current state
  const candidateDrone: DroneRosterEntry | undefined = state.drones.find(
    (d) => d.droneClass === cfg.droneClass && (d.status === "available" || d.status === "holding")
  ) ?? state.drones.find((d) => d.droneClass === "multi-role" && (d.status === "available" || d.status === "holding"))
    ?? state.drones.find((d) => d.status === "available" || d.status === "holding");

  const zoneData = ZONES.find((z) => z.id === cfg.zoneHint);
  const tone = cfg.tone;

  const signalColor = (!candidateDrone || candidateDrone.signal > 70) ? T.teal : T.amber;
  const batteryColor = (!candidateDrone || candidateDrone.battery > 30) ? T.teal : T.amber;

  const session = getTalonSessionView(state.talonConversation);
  const missionSessionActive = session.contextActionId === actionId;
  const revisedPlanReady =
    missionSessionActive &&
    (session.phase === "recommendation" || session.phase === "human-gate") &&
    Boolean(session.transcript);
  const sessionBusy =
    missionSessionActive &&
    (session.phase === "input" || session.phase === "review" || session.phase === "checking" || session.phase === "executing");
  const targetLabel = zoneData?.label ?? cfg.defaultZoneId.replace(/-/g, " ");
  const priorityLabel = coveragePriority === "coverage" ? "maximum coverage" : "fastest response";
  const overrideTranscript = `TALON, revise ${cfg.missionType.toLowerCase()} for ${targetLabel}. Prioritize ${priorityLabel}, keep ${candidateDrone?.name ?? "the assigned asset"} within its operating limits, and hold deployment for my approval.`;
  const overrideReply = `${cfg.title} revised for ${targetLabel} with ${priorityLabel}. ${candidateDrone?.name ?? "The available fallback asset"} remains staged. The updated recommendation is held at the human deployment gate.`;

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Mission status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{
            padding: "3px 8px", borderRadius: radius.control, fontFamily: font.mono, fontSize: 11,
            fontWeight: 700,
            background: revisedPlanReady ? `${T.amber}18` : `${tone}18`,
            border: `1px solid ${revisedPlanReady ? `${T.amber}44` : `${tone}44`}`,
            color: revisedPlanReady ? T.amber : tone,
            transition: `background-color ${motion.normal}, border-color ${motion.normal}, color ${motion.normal}`,
          }}>
            {revisedPlanReady ? "TALON revised plan · operator correction" : `TALON mission plan · ${cfg.missionType}`}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: font.mono, fontSize: 11, color: revisedPlanReady ? T.amber : T.teal }}>
              {revisedPlanReady ? "Plan updated" : `Confidence: ${INCIDENT.aiConfidence}%`}
            </span>
          </div>
        </div>

        <div style={{ fontFamily: font.sans, fontSize: typeScale.heading, fontWeight: 700, color: T.textPrimary }}>{cfg.title}</div>
        <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, marginTop: 4, lineHeight: 1.5 }}>
          {revisedPlanReady
            ? "Operator correction reviewed. The revised recommendation remains held until you approve deployment."
            : cfg.talonRationale}
        </div>
      </div>

      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Asset Assignment */}
        <div>
          <div style={{ fontFamily: font.mono, fontSize: 11, color: T.textMuted, marginBottom: 8 }}>Asset assignment</div>
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
              }}><OperationalIcon actionId={actionId} color={cfg.tone} size={18} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: font.sans, fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{candidateDrone.name}</div>
                <div style={{ fontFamily: font.mono, fontSize: 11, color: T.textSecondary, marginTop: 2 }}>{candidateDrone.capabilityLabel}</div>
              </div>
              <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 700, color: batteryColor }}>{candidateDrone.battery}%</div>
                  <div style={{ fontFamily: font.mono, fontSize: 11, color: T.textMuted }}>Battery</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 700, color: signalColor }}>{candidateDrone.signal}%</div>
                  <div style={{ fontFamily: font.mono, fontSize: 11, color: T.textMuted }}>Signal</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.25)", borderRadius: 12, padding: "12px 14px", color: T.amber, fontFamily: font.sans, fontSize: 12 }}>
              No available asset found. A multi-role fallback will be used.
            </div>
          )}
        </div>

        {/* Zone Target */}
        {zoneData && (
          <div>
            <div style={{ fontFamily: font.mono, fontSize: 11, color: T.textMuted, marginBottom: 8 }}>Target zone</div>
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
                  padding: "3px 8px", borderRadius: radius.control, fontFamily: font.mono, fontSize: 11, fontWeight: 700,
                  background: "rgba(229,83,60,0.12)", color: T.fire, border: "1px solid rgba(229,83,60,0.25)",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {zoneData.category.toUpperCase()} ZONE
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coverage parameters stay editable until a revised recommendation is ready. */}
        {!revisedPlanReady && (
          <div>
            <div style={{ fontFamily: font.mono, fontSize: 11, color: T.textMuted, marginBottom: 8 }}>Coverage priority</div>
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
                    transition: `background-color ${motion.fast}, border-color ${motion.fast}, color ${motion.fast}`,
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

        <TalonSession
          variant="modal"
          conversation={state.talonConversation}
          onConversationChange={onTalonConversationChange}
          legacyMode={!onTalonConversationChange}
          context={{
            recommendation: {
              title: `Review ${cfg.title.toLowerCase()}`,
              body: cfg.talonRationale,
              actionLabel: revisedPlanReady ? "Deploy revised plan" : `Approve ${cfg.title.toLowerCase()}`,
              actionId,
              tone,
              evidence: [
                `${candidateDrone?.name ?? "Fallback asset"} available for ${cfg.missionType.toLowerCase()}`,
                `${targetLabel} is the active target`,
                coveragePriority === "coverage" ? cfg.coverageNote : "Shortest route selected for faster on-station time",
              ],
              blocker: candidateDrone ? null : "No preferred-class asset is currently available",
              requiresHumanGate: true,
            },
            defaultTranscript: overrideTranscript,
            scriptedReply: overrideReply,
          }}
        />
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

        <div style={{ flex: 1 }} />

        <button
          id="mission-brief-approve-btn"
          type="button"
          onClick={() => {
            if (revisedPlanReady && onVoiceOverride) {
              onVoiceOverride();
            } else if (!sessionBusy) {
              onConfirm();
            }
          }}
          disabled={sessionBusy}
          style={{
            padding: "10px 22px",
            borderRadius: 10,
            border: "none",
            background: revisedPlanReady ? T.amber : tone,
            color: sessionBusy ? T.textMuted : T.onAction,
            fontFamily: font.sans,
            fontSize: 12,
            fontWeight: 700,
            cursor: sessionBusy ? "default" : "pointer",
            opacity: sessionBusy ? 0.4 : 1,
            transition: `background-color ${motion.deliberate}, color ${motion.deliberate}, opacity ${motion.deliberate}`,
          }}
        >
          {revisedPlanReady ? "Deploy revised plan" : "Approve and deploy"}
        </button>
      </div>
    </div>
  );
}

const MODAL_ACCESSIBILITY: Partial<Record<QuickActionId, { title: string; description: string; width: number }>> = {
  "emergency-evacuate": {
    title: "Emergency evacuation protocol",
    description: "Review the route and team assignments before initiating immediate evacuation procedures.",
    width: 520,
  },
  "abort-mission": {
    title: "Abort drone mission",
    description: "Confirm recalling active drones and clearing the current mission state.",
    width: 460,
  },
  "deploy-backup": {
    title: "Request backup resources",
    description: "Select a target zone, resource type, and urgency before sending the request.",
    width: 520,
  },
  "notify-authorities": {
    title: "Send authority packet",
    description: "Review the evidence, uncertainty, and human send gate before notifying authorities.",
    width: 520,
  },
  "confirm-incident": {
    title: "Prepare authority packet",
    description: "Confirm that TALON may prepare the evidence packet; sending remains a separate human gate.",
    width: 480,
  },
  "dispatch-scout": {
    title: "Dispatch scout drone",
    description: "Confirm the corroboration flight before TALON begins evidence review.",
    width: 460,
  },
  "override-plan": {
    title: "Apply alternate containment plan",
    description: "Confirm that the operator is changing the tactical assumption used by TALON.",
    width: 480,
  },
  "notify-teams": {
    title: "Alert ground teams",
    description: "Confirm the current team assignments and staging instructions.",
    width: 460,
  },
  "shift-handover": {
    title: "Shift handover transfer",
    description: "Verify the incoming operator before transferring active incident command.",
    width: 500,
  },
  "stand-down": {
    title: "Confirm mission stand down",
    description: "Confirm closure of operations, asset recall, team notification, and return to monitoring.",
    width: 460,
  },
};

function modalAccessibility(modalId: QuickActionId) {
  const mission = MISSION_BRIEF_DATA[modalId];
  if (mission) {
    return {
      title: mission.title,
      description: `Review the ${mission.missionType.toLowerCase()} recommendation and approve any operator correction before deployment.`,
      width: 560,
    };
  }
  return MODAL_ACCESSIBILITY[modalId] ?? {
    title: "Confirm operator command",
    description: "Review the command and its consequences before confirmation.",
    width: 520,
  };
}

/** One accessible shell owns focus, Escape, labels, and restoration for every command. */
export function ActionModal({
  modalId,
  state: _state,
  onClose,
  onConfirm,
  onVoiceOverride,
  onTalonConversationChange,
}: ActionModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const conversationRef = useRef(_state.talonConversation);
  const conversationHandlerRef = useRef(onTalonConversationChange);
  const meta = modalAccessibility(modalId);

  useEffect(() => {
    onCloseRef.current = onClose;
    conversationRef.current = _state.talonConversation;
    conversationHandlerRef.current = onTalonConversationChange;
  }, [onClose, onTalonConversationChange, _state.talonConversation]);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      (firstFocusable ?? dialogRef.current)?.focus();
    });

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const phase = getTalonSessionView(conversationRef.current).phase;
      const talonBusy = phase === "input" || phase === "review" || phase === "checking" || phase === "executing";
      if (talonBusy && conversationHandlerRef.current) return;
      event.preventDefault();
      onCloseRef.current();
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleEscape);
      restoreFocusRef.current?.focus();
    };
  }, [modalId]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    if (focusable.length === 0) {
      event.preventDefault();
      event.currentTarget.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

    const renderModal = () => {
      switch (modalId) {
        case "emergency-evacuate":
          return <EvacuationModal state={_state} onClose={onClose} onConfirm={(p) => onConfirm(modalId, p)} />;
        case "shift-handover":
          return <ShiftHandoverModal state={_state} onClose={onClose} onConfirm={(p) => onConfirm(modalId, p)} />;
      case "abort-mission":
        return <AbortModal onClose={onClose} onConfirm={() => onConfirm(modalId)} />;
      case "deploy-backup":
        return <BackupModal onClose={onClose} onConfirm={(p) => onConfirm(modalId, p)} />;
      case "notify-authorities":
        return <NotifyAuthoritiesModal onClose={onClose} onConfirm={() => onConfirm(modalId)} />;
      case "confirm-incident":
        return <ConfirmIncidentModal onClose={onClose} onConfirm={() => onConfirm(modalId)} />;
      case "dispatch-scout":
      case "override-plan":
        return (
          <CommandConfirmationModal
            title={meta.title}
            description={meta.description}
            tone={modalId === "override-plan" ? T.amber : T.cyan}
            onClose={onClose}
            onConfirm={() => onConfirm(modalId)}
          />
        );
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
            onTalonConversationChange={onTalonConversationChange}
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
    <div style={BACKDROP} onClick={handleBackdrop} role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-modal-title"
        aria-describedby="action-modal-description"
        tabIndex={-1}
        onKeyDown={trapFocus}
        style={{
          ...MODAL_SURFACE,
          width: meta.width,
          overflowY: "auto",
          animation: "modalIn 220ms cubic-bezier(0.23,1,0.32,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="action-modal-title" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
          {meta.title}
        </h2>
        <p id="action-modal-description" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
          {meta.description}
        </p>
        {modal}
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.98) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes modalIn {
            from { opacity: 1; transform: none; }
            to { opacity: 1; transform: none; }
          }
        }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        select option { background: #0D1724; color: #E8EDF4; }
      `}</style>
    </div>
  );
}
