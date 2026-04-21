import { useState, useRef, useCallback } from "react";
import { DISABLED_OPACITY, GLASS, GLASS_SUBTLE, GI, T, font } from "../tokens";
import { StatusPill } from "../components/shared/StatusPill";
import { TinyMetric } from "../components/shared/TinyMetric";

export default function ComponentsPage() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100%",
        background: T.bgBase,
        fontFamily: font.sans,
        color: T.textPrimary,
        padding: "48px 56px",
        overflowY: "auto",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 999px; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        select option { background: #0D1724; color: #E8EDF4; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes barIn { from{width:0} }
      `}</style>

      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        {/* ── Page header ── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ fontFamily: font.mono, fontSize: 11, color: T.cyan, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Component Library · v2.0
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: T.textPrimary, margin: 0, letterSpacing: "-0.02em" }}>
            Flyt<span style={{ color: T.cyan }}>Base</span> Sentinel — Current Component Reference
          </h1>
          <p style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.6, marginTop: 12, maxWidth: 680 }}>
            Live-aligned reference for the operator shell. Labels, status semantics, glass surfaces, and control states
            are updated to match the current UI instead of the older concept sheet.
          </p>
        </div>

        {/* ════════════════════════════════════════════════════
            1. ACTION BAR TILES — all states
        ════════════════════════════════════════════════════ */}
        <Section title="Action Bar Tiles" description="Fixed 152 × 68 px tiles. Larger CTA surface. Two-tier layout for complex scenes.">
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            {/* State row */}
            <div>
              <SubLabel>All Tile States</SubLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <ActionTile label="Deploy survey"   status="available"    tone={T.cyan}   stateNote="available" />
                <ActionTile label="Dispatch Lidar-02" status="recommended" tone={T.amber} stateNote="recommended" />
                <ActionTile label="Residential evac drone" status="in-progress" tone={T.fire} stateNote="in-progress" />
                <ActionTile label="Notify auth."    status="complete"     tone={T.teal}   stateNote="complete" />
                <ActionTile label="Stage perimeter" status="disabled"     tone={T.red}    stateNote="disabled" />
              </div>
            </div>

            {/* Contain bar */}
            <div>
              <SubLabel>Contain Phase — Tiered Layout (Expandable)</SubLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>Primary Row (always visible)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <ActionTile label="Deploy survey"    status="recommended" tone={T.cyan}   />
                    <ActionTile label="Stage perimeter"  status="available"   tone={T.red}    />
                    <ActionTile label="Guide responders" status="available"   tone={T.yellow} />
                    <ActionTile label="Prepare evacuation" status="disabled"  tone={T.fire}   />
                    <ActionTile label="Relay field intel" status="available"  tone={T.cyan}   />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>Secondary Row (revealed on "More")</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <ActionTile label="Notify auth."     status="available"   tone={T.textSecondary} />
                    <ActionTile label="Notify teams"     status="complete"    tone={T.teal}   />
                    <HoldTile />
                  </div>
                </div>
              </div>
            </div>

            {/* Rescue bar */}
            <div>
              <SubLabel>Rescue Phase — Tiered Layout (Expandable)</SubLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>Primary Row</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <ActionTile label="Residential evac drone" status="recommended" tone={T.cyan}          />
                    <ActionTile label="Guide personnel"        status="recommended" tone={T.yellow}        />
                    <ActionTile label="Deploy backup"          status="recommended" tone={T.amber}  note="signal-degraded" />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8 }}>Secondary Row</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <ActionTile label="Notify auth."           status="complete"    tone={T.teal}          />
                    <ActionTile label="Notify teams"           status="available"   tone={T.textSecondary} />
                    <ActionTile label="Stand down"             status="available"   tone={T.teal}          />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            2. HOLD-TO-AUTHORIZE TILE
        ════════════════════════════════════════════════════ */}
        <Section title="Hold-to-Authorize Tile" description="Used exclusively for Authorize Containment. Requires 2-second hold to prevent accidental execution.">
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div>
              <SubLabel>Enabled (staging complete)</SubLabel>
              <HoldTile />
            </div>
            <div>
              <SubLabel>Disabled (staging incomplete)</SubLabel>
              <HoldTile disabled />
            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            3. MODALS
        ════════════════════════════════════════════════════ */}
        <Section title="Action Modals" description="Confirmation dialogs for high-consequence actions. Open on button click, close on Cancel or backdrop click.">
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            {/* Evacuation Protocol */}
            <div>
              <SubLabel>1. Emergency Evacuation Protocol</SubLabel>
              <InlineModal title="Emergency Evacuation Protocol" accentColor={T.fire} confirmLabel="Confirm Evacuation">
                <div style={{ margin: "0 0 16px", padding: "10px 14px", borderRadius: 10, background: "rgba(229,83,60,0.12)", border: `1px solid ${T.red}33`, display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: T.fire }}>⚠</span>
                  <span style={{ fontFamily: font.sans, fontSize: 12, color: T.fire, fontWeight: 500 }}>This will initiate immediate evacuation procedures</span>
                </div>
                <ModalField label="Select Zones to Evacuate">
                  <div style={{ display: "flex", gap: 8 }}>
                    <DemoChip label="Zone A" selected={false} color={T.fire} />
                    <DemoChip label="Zone B" selected={false} color={T.fire} />
                    <DemoChip label="Zone C" selected color={T.fire} />
                  </div>
                </ModalField>
                <ModalField label="Evacuation Route">
                  <DemoInput value="Route 1 – North Exit" />
                </ModalField>
                <ModalField label="Estimated Personnel Count">
                  <DemoInput value="15" />
                </ModalField>
                <div style={{ background: "rgba(229,83,60,0.10)", border: `1px solid ${T.red}30`, borderRadius: 12, padding: "12px 14px", marginTop: 4 }}>
                  <div style={{ fontFamily: font.mono, fontSize: 9, color: T.fire, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Evacuation Summary</div>
                  {["Zones: Zone C", "Route: Route 1 – North Exit", "Personnel: 15 people", "ETA to Safety: ~12 minutes"].map((l) => (
                    <div key={l} style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.7 }}>• {l}</div>
                  ))}
                </div>
              </InlineModal>
            </div>

            {/* Abort */}
            <div>
              <SubLabel>2. Abort Drone Mission</SubLabel>
              <InlineModal title="Abort Drone Mission" subtitle="Confirm your decision" accentColor={T.amber} confirmLabel="Confirm Abort Drone Mission" icon="⚠" narrowWidth>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px", marginBottom: 12 }}>
                  <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Situation Summary</div>
                  <div style={{ fontFamily: font.sans, fontSize: 14, fontWeight: 600, color: T.textPrimary, marginBottom: 8 }}>Active incident is under operational watch</div>
                  <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, display: "flex", gap: 6 }}>
                    <span style={{ color: T.amber }}>⚡</span> Aborting will recall all active drones and clear the current mission state
                  </div>
                </div>
                <div style={{ textAlign: "center", fontFamily: font.sans, fontSize: 11, color: T.textMuted, fontStyle: "italic", padding: "4px 0 8px" }}>
                  The system is advising. You are making the decision.
                </div>
              </InlineModal>
            </div>

            {/* Backup Resources */}
            <div>
              <SubLabel>3. Request Backup Resources (signal-degraded only)</SubLabel>
              <InlineModal title="Request Backup Resources" accentColor={T.amber} confirmLabel="Confirm Request">
                <ModalField label="Target Zone">
                  <DemoSelect value="Zone A – Forest North" />
                </ModalField>
                <ModalField label="Resource Type">
                  <DemoSelect value="Aerial Support" />
                </ModalField>
                <ModalField label="Urgency Level">
                  <div style={{ display: "flex", gap: 8 }}>
                    <DemoChip label="Low"      selected={false} color={T.cyan}  />
                    <DemoChip label="Medium"   selected={false} color={T.cyan}  />
                    <DemoChip label="High"     selected        color={T.amber} />
                    <DemoChip label="Critical" selected={false} color={T.red}   />
                  </div>
                </ModalField>
              </InlineModal>
            </div>

            {/* Simple confirms side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900 }}>
              <div>
                <SubLabel>4. Notify Authorities</SubLabel>
                <InlineModal title="Notify Emergency Authorities" subtitle="Transmit incident report to fire management and emergency dispatch." accentColor={T.cyan} confirmLabel="Send Notification" icon="📡">
                  <div style={{ background: "rgba(0,200,255,0.07)", border: `1px solid ${T.cyan}22`, borderRadius: 12, padding: "12px 14px" }}>
                    {["Current incident scope and active protection zones", "Projected fire spread path and affected structures", "Active drone assets and assignments", "Ground team status and staging positions"].map((l) => (
                      <div key={l} style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.8, display: "flex", gap: 8 }}>
                        <span style={{ color: T.cyan, flexShrink: 0 }}>✓</span> {l}
                      </div>
                    ))}
                  </div>
                </InlineModal>
              </div>
              <div>
                <SubLabel>5. Notify Teams</SubLabel>
                <InlineModal title="Alert Ground Teams" subtitle="Notify teams with current assignments and staging instructions." accentColor={T.yellow} confirmLabel="Confirm Alert" icon="📋">
                  <div style={{ background: "rgba(255,209,102,0.07)", border: `1px solid ${T.yellow}22`, borderRadius: 12, padding: "12px 14px" }}>
                    {[{ t: "Alpha Lead", d: "Perimeter control – Forest North" }, { t: "Bravo Team", d: "Structure protect – Buffer East" }, { t: "Charlie", d: "Medical & route support – Standby" }].map(({ t, d }) => (
                      <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{t}</span>
                        <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </InlineModal>
              </div>
            </div>

            {/* Stand Down */}
            <div>
              <SubLabel>6. Stand Down</SubLabel>
              <InlineModal title="Confirm Mission Stand Down" subtitle="All operations will be formally closed and assets recalled." accentColor={T.teal} confirmLabel="Confirm Stand Down" icon="✓" narrowWidth>
                <div style={{ background: "rgba(45,212,160,0.07)", border: `1px solid ${T.teal}22`, borderRadius: 12, padding: "12px 14px" }}>
                  {["All active drone missions will be recalled to docks", "Ground teams will receive stand-down confirmation", "Authorities will be notified the incident is contained", "System returns to passive monitoring mode"].map((l) => (
                    <div key={l} style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, lineHeight: 1.8, display: "flex", gap: 8 }}>
                      <span style={{ color: T.teal, flexShrink: 0 }}>✓</span> {l}
                    </div>
                  ))}
                </div>
              </InlineModal>
            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            4. ALERT POPUP OVERLAY
        ════════════════════════════════════════════════════ */}
        <Section title="Alert Popup Overlay" description="Appears over the map as a command interrupt when TALON detects a thermal spike. Not a scene change — floats over baseline.">
          <AlertPopupDemo />
        </Section>

        {/* ════════════════════════════════════════════════════
            5. STATUS PILLS
        ════════════════════════════════════════════════════ */}
        <Section title="Status Pills" description="Semantic status indicators across all panels, map labels, and the action bar. Each color is tied to a specific operational meaning — never used decoratively.">
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            <div>
              <SubLabel>Severity — maps to risk level of a zone or priority card</SubLabel>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <StatusPill label="SAFE"    color={T.teal}  />
                <StatusPill label="INFO"    color={T.cyan}  />
                <StatusPill label="CAUTION" color={T.amber} />
                <StatusPill label="DANGER"  color={T.red}   />
              </div>
              <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted }}>
                Safe = all clear · Info = noteworthy, no action needed · Caution = watch and prepare · Danger = immediate action required
              </div>
            </div>

            <div>
              <SubLabel>Operational Mode — shown in the navbar and mode indicator</SubLabel>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <StatusPill label="SCAN"    color={T.teal}  />
                <StatusPill label="VERIFY"  color={T.amber} />
                <StatusPill label="CONTAIN" color={T.red}   />
                <StatusPill label="RESCUE"  color={T.fire}  />
              </div>
              <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted }}>
                Mode escalates left to right. Color intensity tracks urgency.
              </div>
            </div>

            <div>
              <SubLabel>Drone Status — shown on each drone card in the fleet panel</SubLabel>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <StatusPill label="AVAILABLE"       color={T.teal}          />
                <StatusPill label="EN-ROUTE"        color={T.cyan}          />
                <StatusPill label="ASSIGNED"        color={T.cyan}          />
                <StatusPill label="HOLDING"         color={T.textSecondary} />
                <StatusPill label="SIGNAL-DEGRADED" color={T.amber}         />
              </div>
              <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted }}>
                Available = ready to deploy · En-route = moving to position · Assigned = on active mission · Holding = standby, no mission · Signal-degraded = comms warning
              </div>
            </div>

            <div>
              <SubLabel>Ground Team Availability — shown on each team card</SubLabel>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <StatusPill label="AVAILABLE" color={T.teal}  />
                <StatusPill label="STAGED"    color={T.amber} />
                <StatusPill label="DEPLOYED"  color={T.red}   />
              </div>
              <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted }}>
                Available = not yet assigned · Staged = positioned and ready · Deployed = actively operating in the field
              </div>
            </div>

            <div>
              <SubLabel>Action / Priority Status — used in priority risk cards and action tile sub-labels</SubLabel>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <StatusPill label="PENDING"     color={T.textSecondary} />
                <StatusPill label="RECOMMENDED" color={T.amber}         />
                <StatusPill label="IN-PROGRESS" color={T.cyan}          />
                <StatusPill label="COMPLETE"    color={T.teal}          />
                <StatusPill label="LOCKED"      color={T.textMuted}     />
              </div>
              <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted }}>
                Pending = not started · Recommended = TALON flagged as next action · In-progress = executing now · Complete = done · Locked = prerequisites not met
              </div>
            </div>

          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            6. PRIORITY RISK CARDS
        ════════════════════════════════════════════════════ */}
        <Section title="Priority Risk Cards" description="TALON-generated risk cards in the right panel. One card per zone. Drives operator focus and action.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 840 }}>
            <DemoPriorityCard severity="danger" areaLabel="Residential Zone" title="Residential evacuation path remains the top human priority" rationale="The rescue phase is active and the residential zone remains inside the projected path." nextStep="Activate automatic routes and evacuation guidance." status="recommended" action="Emergency evacuate" />
            <DemoPriorityCard severity="caution" areaLabel="Buffer Corridor" title="Responder support must stay intact through signal exception" rationale="One active drone has degraded signal — TALON is rerouting to preserve coverage." nextStep="Acknowledge exception and deploy backup if needed." status="in-progress" action="Deploy backup" />
            <DemoPriorityCard severity="info" areaLabel="Grid 4C" title="Evidence is now sufficient for operator assessment" rationale="Thermal, satellite, and on-site visual corroboration all support an active incident." nextStep="Confirm the incident or keep under monitor-only watch." status="pending" action="Open verification" />
            <DemoPriorityCard severity="safe" areaLabel="Operations" title="Field coordination remains stable" rationale="Authorities, teams, and live routes remain synchronized." nextStep="Continue supervising exceptions only." status="complete" />
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            7. DRONE FLEET CARDS
        ════════════════════════════════════════════════════ */}
        <Section title="Drone Fleet Cards" description="Individual drone status in the left panel. Selection state drives zone-aware action tiles.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 780 }}>
            <DemoDroneCard name="Scout-01"  capability="Visual sweep"        mission="Patrol"             zone="Forest Zone"  status="assigned"        color={T.cyan}  battery={91} signal={98} eta="Live"  selected={false} />
            <DemoDroneCard name="Scout-02"  capability="Thermal + LiDAR"     mission="Investigation"      zone="Forest Zone"  status="en-route"        color={T.cyan}  battery={88} signal={92} eta="00:43" selected />
            <DemoDroneCard name="Relay-01"  capability="Comms relay"          mission="Standby"            zone="—"            status="available"       color={T.teal}  battery={94} signal={99} eta="Live"  selected={false} />
            <DemoDroneCard name="Evac-01"   capability="Evacuation guidance"  mission="Residential evac"   zone="Residential"  status="signal-degraded" color={T.amber} battery={72} signal={46} eta="Live"  selected={false} />
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            8. GROUND TEAM CARDS
        ════════════════════════════════════════════════════ */}
        <Section title="Ground Team Cards" description="Field team readiness and staging status in the right panel.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, maxWidth: 780 }}>
            <DemoTeamCard name="Alpha Lead"  type="Fire perimeter"    assignment="Perimeter control"   availability="staged"    color={T.amber} readiness="Ready now" eta="04 min" zone="Buffer Zone"   />
            <DemoTeamCard name="Bravo Medic" type="Emergency medical"  assignment="Route B standby"     availability="deployed"  color={T.red}   readiness="On-site"   eta="Active" zone="Residential"    />
            <DemoTeamCard name="Charlie Eng" type="Engineering"        assignment="Awaiting mission"     availability="available" color={T.teal}  readiness="Ready"     eta="12 min" zone="—"             />
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            9. GLASS SURFACES
        ════════════════════════════════════════════════════ */}
        <Section title="Glass Surfaces" description="Panel containers, modal overlays, and floating components all use glass tokens.">
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ ...GLASS, width: 260, padding: "20px", borderRadius: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Panel Glass (GLASS)</div>
              <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5 }}>rgba(8,16,28,0.45) · blur(24px) · Used for side panels and the action bar.</div>
            </div>
            <div style={{ background: "rgba(8,16,28,0.96)", backdropFilter: "blur(32px) saturate(1.4)", WebkitBackdropFilter: "blur(32px) saturate(1.4)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 32px 80px rgba(0,0,0,0.65)", width: 260, padding: "20px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Modal Glass</div>
              <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5 }}>rgba(8,16,28,0.96) · blur(32px) · Used for confirmation modal surfaces.</div>
            </div>
            <div style={{ ...GLASS_SUBTLE, width: 260, padding: "20px", borderRadius: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Inner Card (GLASS_SUBTLE)</div>
              <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5 }}>rgba(255,255,255,0.04) · Used for inner content cards within panels.</div>
            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            10. COLOR TOKENS
        ════════════════════════════════════════════════════ */}
        <Section title="Color Tokens" description="Every color maps to a specific operational meaning. Never use ad-hoc hex values in components.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {[
              { name: "Cyan",          value: T.cyan,          usage: "TALON actions, info, navigation, drone feed" },
              { name: "Amber",         value: T.amber,         usage: "Caution, recommendations, verify mode" },
              { name: "Red",           value: T.red,           usage: "Danger, contain mode, abort" },
              { name: "Fire",          value: T.fire,          usage: "Emergency, rescue mode, evacuation" },
              { name: "Teal",          value: T.teal,          usage: "Safe, available, complete states" },
              { name: "Yellow",        value: T.yellow,        usage: "Ground teams, field coordination" },
              { name: "Text Primary",  value: T.textPrimary,   usage: "Headlines, labels, active values" },
              { name: "Text Secondary",value: T.textSecondary, usage: "Body text, descriptions, captions" },
              { name: "Text Muted",    value: T.textMuted,     usage: "Timestamps, section labels, disabled" },
              { name: "Bg Base",       value: T.bgBase,        usage: "Root canvas background" },
              { name: "Bg Panel",      value: T.bgPanel,       usage: "Panel and card surfaces" },
              { name: "Bg Raised",     value: T.bgRaised,      usage: "Elevated / active surfaces" },
            ].map((tok) => (
              <div key={tok.name} style={{ padding: "14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ width: "100%", height: 32, borderRadius: 8, background: tok.value, marginBottom: 10, border: "1px solid rgba(255,255,255,0.10)" }} />
                <div style={{ fontSize: 11, fontWeight: 600, color: T.textPrimary }}>{tok.name}</div>
                <div style={{ fontFamily: font.mono, fontSize: 10, color: T.textMuted, marginTop: 2 }}>{tok.value}</div>
                <div style={{ fontSize: 10, color: T.textSecondary, marginTop: 5, lineHeight: 1.4 }}>{tok.usage}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            11. TYPOGRAPHY
        ════════════════════════════════════════════════════ */}
        <Section title="Typography" description="Type scale — Inter for UI, JetBrains Mono for telemetry and code.">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Panel Heading (16px / 700)", family: font.sans, size: 16, weight: 700, text: "Emergency Evacuation Protocol" },
              { label: "Subheading (14px / 600)", family: font.sans, size: 14, weight: 600, text: "Active incident is under operational watch" },
              { label: "Body (12px / 400)", family: font.sans, size: 12, weight: 400, text: "TALON has surfaced the first operator decision. Select a zone to begin staging." },
              { label: "Caption (11px / 400)", family: font.sans, size: 11, weight: 400, text: "The system is advising. You are making the decision." },
              { label: "Tile Label (10px / 700 / uppercase)", family: font.sans, size: 10, weight: 700, text: "EMERGENCY EVACUATE" },
              { label: "Section Label (9px / mono / uppercase)", family: font.mono, size: 9, weight: 400, text: "CURRENT PRIORITIES · SITUATION SUMMARY" },
              { label: "Metric Value (11px / mono)", family: font.mono, size: 11, weight: 400, text: "91%  ·  98%  ·  ETA 00:43  ·  Live" },
              { label: "Timestamp (10px / mono)", family: font.mono, size: 10, weight: 400, text: "03:49:18 UTC" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "baseline", gap: 24, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ width: 260, fontFamily: font.mono, fontSize: 10, color: T.textMuted, flexShrink: 0 }}>{item.label}</div>
                <div style={{ fontFamily: item.family, fontSize: item.size, fontWeight: item.weight, color: T.textPrimary }}>{item.text}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════
            12. TINY METRICS
        ════════════════════════════════════════════════════ */}
        <Section title="Tiny Metrics" description="Compact telemetry display used in drone and team cards.">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <TinyMetric label="Battery"    value="91%"          />
            <TinyMetric label="Signal"     value="98%"          />
            <TinyMetric label="ETA"        value="00:43"        />
            <TinyMetric label="Zone"       value="Forest North" />
            <TinyMetric label="Structures" value="47"           />
            <TinyMetric label="Cleared"    value="12 / 47"      />
            <TinyMetric label="Readiness"  value="Ready now"    />
          </div>
        </Section>

        {/* Footer */}
        <div style={{ padding: "40px 0 24px", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 40 }}>
          <div style={{ fontFamily: font.mono, fontSize: 10, color: T.textMuted, letterSpacing: "0.06em" }}>
            FlytBase Sentinel · Component Library 2.0 · Live UI reference · Dev-facing documentation
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   LAYOUT ATOMS
════════════════════════════════════════════════════════════════ */

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 56 }}>
      <div style={{ marginBottom: 22, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>
        <p style={{ fontSize: 12, color: T.textSecondary, marginTop: 6, lineHeight: 1.5, maxWidth: 680 }}>{description}</p>
      </div>
      {children}
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ACTION TILES
════════════════════════════════════════════════════════════════ */

function ActionTile({ label, status, tone, stateNote, note }: {
  label: string; status: string; tone: string; stateNote?: string; note?: string;
}) {
  const isDisabled    = status === "disabled";
  const isComplete    = status === "complete";
  const isRec         = status === "recommended";
  const isInProgress  = status === "in-progress";

  const statusText = isComplete ? "✓ Done" : isInProgress ? "● Active" : isRec ? "Rec." : isDisabled ? "Locked" : "";
  const statusColor = isComplete ? T.teal : tone;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      {note && <div style={{ fontFamily: font.mono, fontSize: 8, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>{note}</div>}
      <button
        type="button"
        disabled={isDisabled || isComplete}
        style={{
          width: 152,
          height: 68,
          flexShrink: 0,
          borderRadius: 14,
          border: `1px solid ${isDisabled ? "rgba(255,255,255,0.06)" : isComplete ? `${T.teal}50` : isRec ? `${tone}80` : `${tone}35`}`,
          background: isDisabled ? "rgba(255,255,255,0.02)" : isComplete ? "rgba(45,212,160,0.10)" : isRec ? `${tone}1A` : `${tone}0D`,
          cursor: isDisabled || isComplete ? "default" : "pointer",
          opacity: isDisabled ? DISABLED_OPACITY : 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          padding: "0 14px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Active left bar */}
        {isInProgress && (
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: tone, borderRadius: "3px 0 0 3px", animation: "pulse 1.2s infinite" }} />
        )}
        <span style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: isDisabled ? T.textMuted : isComplete ? T.teal : tone, textAlign: "center", lineHeight: 1.25 }}>
          {label}
        </span>
        {statusText && (
          <span style={{ fontFamily: font.mono, fontSize: 10, color: isDisabled ? T.textMuted : statusColor }}>
            {statusText}
          </span>
        )}
      </button>
      {stateNote && <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{stateNote}</div>}
    </div>
  );
}

function HoldTile({ disabled = false }: { disabled?: boolean }) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setHolding(false);
    setProgress(0);
  }, []);

  const start = useCallback(() => {
    if (disabled) return;
    setHolding(true);
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startRef.current) / 2000) * 100);
      setProgress(pct);
      if (pct >= 100) stop();
    }, 16);
  }, [disabled, stop]);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
      style={{
        width: 152,
        height: 68,
        flexShrink: 0,
        borderRadius: 14,
        border: `1px solid ${disabled ? "rgba(255,255,255,0.08)" : holding ? T.red : `${T.red}66`}`,
        background: disabled ? "rgba(255,255,255,0.03)" : "rgba(229,83,60,0.14)",
        cursor: disabled ? "default" : "pointer",
        userSelect: "none",
        opacity: disabled ? DISABLED_OPACITY : 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, width: `${progress}%`, background: "rgba(229,83,60,0.22)", transition: progress === 0 ? "none" : undefined }} />
      <span style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: disabled ? T.textMuted : "#FFFFFF", position: "relative" }}>
        Authorize
      </span>
      <span style={{ fontFamily: font.mono, fontSize: 10, color: disabled ? T.textMuted : "rgba(255,255,255,0.6)", position: "relative" }}>
        {holding ? `${Math.round(progress)}%` : disabled ? "Locked" : "Hold 2s"}
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MODAL DEMO WRAPPER
════════════════════════════════════════════════════════════════ */

function InlineModal({ title, subtitle, accentColor, confirmLabel, icon, children, narrowWidth }: {
  title: string; subtitle?: string; accentColor: string; confirmLabel: string; icon?: string; children: React.ReactNode; narrowWidth?: boolean;
}) {
  return (
    <div style={{
      background: "rgba(8,16,28,0.96)",
      backdropFilter: "blur(32px) saturate(1.4)",
      WebkitBackdropFilter: "blur(32px) saturate(1.4)",
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
      width: narrowWidth ? 460 : 520,
      maxWidth: "100%",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 22px 0", display: "flex", alignItems: "flex-start", gap: icon ? 12 : 0 }}>
        {icon && (
          <div style={{ width: 36, height: 36, borderRadius: 9, background: `${accentColor}18`, border: `1px solid ${accentColor}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>
            {icon}
          </div>
        )}
        <div>
          <div style={{ fontFamily: font.sans, fontSize: 15, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.01em" }}>{title}</div>
          {subtitle && <div style={{ fontFamily: font.sans, fontSize: 12, color: T.textSecondary, marginTop: 3 }}>{subtitle}</div>}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "0 22px" }} />

      {/* Footer */}
      <div style={{ padding: "14px 22px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" style={{ padding: "9px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: T.textSecondary, fontFamily: font.sans, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Cancel
        </button>
        <button type="button" style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: accentColor, color: "#fff", fontFamily: font.sans, fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>{label}</div>
      {children}
    </div>
  );
}

function DemoInput({ value }: { value: string }) {
  return (
    <div style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: T.textPrimary, fontFamily: font.sans, fontSize: 13 }}>
      {value}
    </div>
  );
}

function DemoSelect({ value }: { value: string }) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: T.textPrimary, fontFamily: font.sans, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
        <span>{value}</span>
        <span style={{ color: T.textMuted }}>▾</span>
      </div>
    </div>
  );
}

function DemoChip({ label, selected, color }: { label: string; selected: boolean; color: string }) {
  return (
    <div style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${selected ? color : "rgba(255,255,255,0.12)"}`, background: selected ? `${color}22` : "rgba(255,255,255,0.04)", color: selected ? color : T.textSecondary, fontFamily: font.sans, fontSize: 12, fontWeight: selected ? 600 : 400 }}>
      {label}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ALERT POPUP DEMO
════════════════════════════════════════════════════════════════ */

function AlertPopupDemo() {
  return (
    <div style={{ ...GLASS, padding: "18px 20px", borderRadius: 18, border: `1px solid ${T.red}44`, maxWidth: 420, boxShadow: `0 0 0 1px ${T.red}22, 0 20px 48px rgba(0,0,0,0.42)` }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.red, marginTop: 5, animation: "pulse 1.2s infinite", flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: font.sans, fontSize: 13, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.01em" }}>Thermal spike detected — Grid 4C</div>
          <div style={{ fontFamily: font.mono, fontSize: 10, color: T.red, marginTop: 3, letterSpacing: "0.04em" }}>TALON CONFIDENCE 84% · FIRE-PRONE ZONE</div>
        </div>
      </div>

      {/* Intel */}
      <div style={{ ...GLASS_SUBTLE, padding: "10px 12px", marginBottom: 14 }}>
        {[{ l: "Location", v: "Grid 4C — Forest North" }, { l: "Temp spike", v: "+340°C above baseline" }, { l: "Wind", v: "NE 22 km/h" }, { l: "Zone history", v: "High fire-prone · 3 prior incidents" }].map(({ l, v }) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted }}>{l}</span>
            <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textPrimary, fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* TALON verdict */}
      <div style={{ padding: "16px 20px" }}>
        <span style={{ color: T.amber, fontWeight: 600 }}>TALON recommends:</span> Dispatch Scout-02 for on-site corroboration. Area matches historical fire-prone pattern.
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" style={{ flex: 1, padding: "9px 14px", borderRadius: 10, border: `1px solid ${T.amber}`, background: `${T.amber}20`, color: T.amber, fontFamily: font.sans, fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Dispatch Scout-02
        </button>
        <button type="button" style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: T.textSecondary, fontFamily: font.sans, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   CARDS
════════════════════════════════════════════════════════════════ */

function DemoPriorityCard({ severity, areaLabel, title, rationale, nextStep, status, action }: {
  severity: "danger" | "caution" | "info" | "safe"; areaLabel: string; title: string; rationale: string; nextStep: string; status: string; action?: string;
}) {
  const tone = severity === "danger" ? T.red : severity === "caution" ? T.amber : severity === "safe" ? T.teal : T.cyan;
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${tone}33`, background: `${tone}0D`, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div>
        <div style={{ fontFamily: font.mono, fontSize: 9, color: tone, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>{areaLabel}</div>
          <div style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{title}</div>
        </div>
        <StatusPill
          label={status.toUpperCase().replace(/-/g, "·")}
          color={
            status === "complete"    ? T.teal :
            status === "in-progress" ? T.cyan :
            status === "recommended" ? T.amber :
            T.textSecondary
          }
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted, marginBottom: 3 }}>Why now</div>
          <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textPrimary, lineHeight: 1.45 }}>{rationale}</div>
        </div>
        <div>
          <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted, marginBottom: 3 }}>Next step</div>
          <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textPrimary, lineHeight: 1.45 }}>{nextStep}</div>
        </div>
      </div>
      {action && <div style={{ fontFamily: font.mono, fontSize: 9, color: T.textMuted, marginTop: 10, letterSpacing: "0.06em" }}>Action → {action}</div>}
    </div>
  );
}

function DemoDroneCard({ name, capability, mission, zone, status, color, battery, signal, eta, selected }: {
  name: string; capability: string; mission: string; zone: string; status: string; color: string; battery: number; signal: number; eta: string; selected: boolean;
}) {
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${selected ? `${color}66` : GI.border}`, background: selected ? `${color}14` : GI.surface, padding: "10px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.textPrimary }}>{name}</div>
          <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted, marginTop: 3 }}>{capability} · {mission} · {zone}</div>
        </div>
        <StatusPill label={status} color={color} />
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 9 }}>
        <TinyMetric label="Battery" value={`${battery}%`} />
        <TinyMetric label="Signal" value={`${signal}%`} />
        <TinyMetric label="ETA" value={eta} />
      </div>
    </div>
  );
}

function DemoTeamCard({ name, type, assignment, availability, color, readiness, eta, zone }: {
  name: string; type: string; assignment: string; availability: string; color: string; readiness: string; eta: string; zone: string;
}) {
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${GI.border}`, background: GI.surface, padding: "10px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: T.textPrimary }}>{name}</div>
          <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted, marginTop: 3 }}>{type} · {assignment}</div>
        </div>
        <StatusPill label={availability} color={color} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 9 }}>
        <TinyMetric label="Readiness" value={readiness} />
        <TinyMetric label="ETA" value={eta} />
        <TinyMetric label="Zone" value={zone} />
      </div>
    </div>
  );
}
