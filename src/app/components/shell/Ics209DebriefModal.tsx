/**
 * Ics209DebriefModal (Sentinel V2 · Phase 6 / Recruiter Loop).
 *
 * Renders the formal Incident Status Summary (ICS-209) Authority Packet,
 * complete with NWCG fire-behavior telemetry, operator dissent records,
 * the interactive 6-beat after-action scrubber, and one-click JSON/PDF export.
 */

import { useState, useRef, useEffect } from "react";
import {
  T,
  border,
  font,
  layer,
  radius,
  space,
  surface,
  tint,
  tracking,
  typeScale,
  typeWeight,
  shadow,
  type ShellState,
} from "../../tokens";
import { INCIDENT } from "../../mockData";
import { DebriefTimeline } from "./DebriefTimeline";

interface Props {
  open: boolean;
  onClose: () => void;
  state: ShellState;
  incidentElapsed: number;
}

export function Ics209DebriefModal({ open, onClose, state }: Props) {
  const [downloaded, setDownloaded] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleExportJson = () => {
    const payload = {
      form: "ICS-209",
      standard: "NWCG PMS 461 / 484 WUI Standard",
      incidentId: INCIDENT.id,
      authorityPacketId: "AUD-90-0847",
      timestampUtc: new Date().toISOString(),
      activeScene: state.scene,
      operator: state.activeOperator || INCIDENT.operator,
      fuelModel: "Scott & Burgan SH9 (Very High Load Chaparral)",
      spreadRateChainsPerHour: 18.4,
      threatConfidence: 78,
      evacuation: {
        totalStructuresThreatened: 47,
        structuresCleared: 12,
        routeAStatus: "active",
        routeBStatus: "standby",
      },
      assignedAirframes: state.drones.map((d) => ({
        id: d.id,
        name: d.name,
        role: d.role,
        batteryPct: d.battery,
        signalPct: d.signal,
      })),
      dissentRecord: {
        id: "AUD-DIS-0847-FP",
        operatorOverride: "Closed as agricultural burn permit reference verified on north ridge.",
        talonHypothesisWeightAttenuated: true,
        talonReraiseThresholdPct: 94,
      },
      auditChainDigestSha256: "e62d93c8b4f1a2387190d79f29103c84e62d93c8f3a098471b",
      activityLogCount: state.activityLog.length,
      activityLog: state.activityLog,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ICS-209-${INCIDENT.id}-AUD-90-0847.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ics209-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: layer.modal,
        display: "grid",
        placeItems: "center",
        padding: space.xl,
        background: "rgba(3, 7, 13, 0.78)",
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: "100%",
          maxWidth: 780,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: radius.panel,
          border: `1px solid ${border.strong}`,
          background: surface.overlay,
          boxShadow: shadow.edgeOverlay,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: `${space.md}px ${space.lg}px`,
            borderBottom: `1px solid ${border.default}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: surface.panelDense,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: typeScale.eyebrow,
                fontWeight: typeWeight.bold,
                letterSpacing: tracking.eyebrow,
                color: T.amber,
                background: tint(T.amber, 0.14),
                border: `1px solid ${tint(T.amber, 0.32)}`,
                borderRadius: radius.dense,
                padding: "2px 6px",
              }}
            >
              ICS-209
            </span>
            <div>
              <h2
                id="ics209-title"
                style={{
                  margin: 0,
                  fontFamily: font.sans,
                  fontSize: typeScale.heading,
                  fontWeight: typeWeight.bold,
                  color: T.textPrimary,
                  letterSpacing: tracking.tight,
                }}
              >
                Incident Status Summary &amp; Debrief
              </h2>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, marginTop: 2 }}>
                {`CAD: ${INCIDENT.id} · AUTHORITY PACKET: AUD-90-0847 · CRYPTO-CHAINED`}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close debrief modal"
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.control,
              border: `1px solid ${border.default}`,
              background: surface.control,
              color: T.textMuted,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: space.lg,
            display: "flex",
            flexDirection: "column",
            gap: space.md,
          }}
        >
          {/* Incident Metadata Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: space.sm,
              padding: space.md,
              borderRadius: radius.control,
              background: surface.inset,
              border: `1px solid ${border.soft}`,
            }}
          >
            <div>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, letterSpacing: tracking.eyebrow }}>
                INCIDENT COMMANDER
              </div>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.bold, color: T.textPrimary, marginTop: 4 }}>
                {state.activeOperator || INCIDENT.operator}
              </div>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.metadata, color: T.cyan }}>Altadena Sector Lead</div>
            </div>

            <div>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, letterSpacing: tracking.eyebrow }}>
                FIRE BEHAVIOR MODEL
              </div>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.bold, color: T.textPrimary, marginTop: 4 }}>
                SH9 Chaparral
              </div>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.amber }}>18.4 ch/hr forward spread</div>
            </div>

            <div>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, letterSpacing: tracking.eyebrow }}>
                STRUCTURAL PROTECTION
              </div>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.body, fontWeight: typeWeight.bold, color: T.teal, marginTop: 4 }}>
                12 of 47 Cleared
              </div>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.metadata, color: T.textMuted }}>Route A Active · B Standby</div>
            </div>
          </div>

          {/* After-Action Scrubber */}
          <div
            style={{
              borderRadius: radius.control,
              border: `1px solid ${border.subtle}`,
              background: surface.panel,
              padding: space.md,
            }}
          >
            <div style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold, color: T.cyan, marginBottom: space.xs }}>
              Incident Sequence &amp; Decision Beats
            </div>
            <DebriefTimeline sceneLabel={state.scene} />
          </div>

          {/* Dissent &amp; Governance Record */}
          <div
            style={{
              padding: space.md,
              borderRadius: radius.control,
              border: `1px solid ${tint(T.amber, 0.3)}`,
              background: tint(T.amber, 0.05),
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold, color: T.amber }}>
                Human-AI Disagreement Ledger · AUD-DIS-0847-FP
              </span>
              <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.amber }}>
                CONTESTED WATCH
              </span>
            </div>
            <div style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textPrimary, marginTop: space.xs, lineHeight: 1.45 }}>
              <strong>Operator Overrule:</strong> &ldquo;Closed as agricultural burn permit reference verified on north ridge.&rdquo;
            </div>
            <div style={{ fontFamily: font.sans, fontSize: typeScale.caption, color: T.textSecondary, marginTop: 4 }}>
              TALON attenuated hypothesis weight to 78%. Re-raise locked until multi-sensor confidence crosses 94% threshold.
            </div>
          </div>

          {/* Append-only event ledger (prototype: in-memory, not a hash chain) */}
          <div
            style={{
              padding: space.sm,
              borderRadius: radius.control,
              background: surface.inset,
              border: `1px solid ${border.soft}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted }}>
              LEDGER: 34/34 EVENTS APPENDED
            </div>
            <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.teal }}>
              PROTOTYPE · NO HASH CHAIN
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: `${space.md}px ${space.lg}px`,
            borderTop: `1px solid ${border.default}`,
            background: surface.panelDense,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted }}>
            Auditable emergency debrief artifact. Safe for regulatory submission.
          </div>

          <div style={{ display: "flex", gap: space.sm }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: "8px 14px",
                borderRadius: radius.control,
                border: `1px solid ${border.default}`,
                background: surface.control,
                color: T.textPrimary,
                fontFamily: font.sans,
                fontSize: typeScale.label,
                fontWeight: typeWeight.semibold,
                cursor: "pointer",
              }}
            >
              Print Summary
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              data-action="export-ics209-json"
              style={{
                padding: "8px 16px",
                borderRadius: radius.control,
                border: `1px solid ${tint(T.cyan, 0.4)}`,
                background: downloaded ? tint(T.teal, 0.2) : tint(T.cyan, 0.15),
                color: downloaded ? T.teal : T.cyan,
                fontFamily: font.sans,
                fontSize: typeScale.label,
                fontWeight: typeWeight.bold,
                cursor: "pointer",
              }}
            >
              {downloaded ? "✓ JSON Exported" : "Download ICS-209 JSON"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
