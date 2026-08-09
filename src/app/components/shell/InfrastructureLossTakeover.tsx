import { OperationalIcon } from "../OperationalIcon";
import { T, border, font, layer, material, radius, space, surface, tint, tracking, typeScale, typeStyle, typeWeight } from "../../tokens";

export function InfrastructureLossTakeover({
  isRestarting,
  onRestart,
}: {
  isRestarting: boolean;
  onRestart: () => void;
}) {
  const statusRows = [
    { label: "TALON AI", status: "Offline" },
    { label: "Satellite", status: "Link lost" },
    { label: "Drone Comms", status: "Timed out" },
    { label: "Ground Teams", status: "Unconfirmed" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: layer.takeover,
        ...material.scrim,
        background: surface.takeoverScrim,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 400ms ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `2px solid ${tint(T.red, 0.5)}`,
          borderRadius: 0,
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 560, width: "100%", padding: `0 ${space["2xl"]}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: space["3xl"] }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: space.lg }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.overlay,
              background: tint(T.red, 0.12),
              border: `1px solid ${tint(T.red, 0.35)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <OperationalIcon name="warning" color={T.red} size={28} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, letterSpacing: tracking.eyebrow, color: T.red, textTransform: "uppercase", marginBottom: space.sm }}>
              CRITICAL SYSTEM FAILURE
            </div>
            <div style={{ fontFamily: font.sans, fontSize: typeStyle.display.size, fontWeight: typeWeight.bold, color: T.textPrimary, lineHeight: 1.2 }}>
              Infrastructure connection lost
            </div>
            <div style={{ fontFamily: font.sans, fontSize: typeScale.title, color: T.textSecondary, marginTop: space.sm, lineHeight: 1.5 }}>
              Primary data feeds offline. TALON computation suspended. All drone telemetry timed out.
            </div>
          </div>
        </div>

        <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.sm }}>
          {statusRows.map(({ label, status }) => (
            <div
              key={label}
              style={{
                padding: `${space.sm}px ${space.md}px`,
                borderRadius: radius.tile,
                background: tint(T.red, 0.06),
                border: `1px solid ${tint(T.red, 0.18)}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textSecondary, letterSpacing: tracking.telemetry }}>{label}</div>
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.red, letterSpacing: tracking.telemetry }}>● {status}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            width: "100%",
            padding: `${space.md}px ${space.lg}px`,
            borderRadius: radius.tile,
            background: surface.control,
            border: `1px solid ${border.default}`,
            display: "flex",
            gap: space.md,
            alignItems: "center",
          }}
        >
          <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, letterSpacing: tracking.telemetry, flexShrink: 0 }}>LAST KNOWN STATE</div>
          <div style={{ fontFamily: font.mono, fontSize: typeScale.label, color: T.textSecondary }}>RESCUE NOMINAL · INC-2024-0847 · 03:52:14 UTC</div>
        </div>

        <div
          style={{
            width: "100%",
            padding: `${space.md}px ${space.lg}px`,
            borderRadius: radius.panel,
            background: tint(T.amber, 0.06),
            border: `1px solid ${tint(T.amber, 0.2)}`,
          }}
        >
          <div style={{ fontFamily: font.mono, fontSize: typeScale.label, color: T.amber, letterSpacing: tracking.eyebrow, textTransform: "uppercase", marginBottom: space.sm }}>
            Manual Protocol — Fallback
          </div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textSecondary, lineHeight: 1.6 }}>
            Switch to manual radio protocol. Contact Station 12 directly on <strong style={{ color: T.textPrimary }}>Ch. 7</strong>. Use last-known map state for ground coordination.
            Alert Regional Dispatch to INC-2024-0847 status via landline.
          </div>
        </div>

        <button
          type="button"
          disabled={isRestarting}
          onClick={onRestart}
          style={{
            padding: `${space.md}px ${space.xl}px`,
            borderRadius: radius.panel,
            background: isRestarting ? tint(T.teal, 0.08) : tint(T.red, 0.1),
            border: `1px solid ${isRestarting ? T.teal : T.red}`,
            color: isRestarting ? T.teal : T.red,
            fontFamily: font.sans,
            fontSize: typeScale.title,
            fontWeight: typeWeight.bold,
            cursor: isRestarting ? "default" : "pointer",
          }}
        >
          {isRestarting ? "Reconnecting…" : "Attempt system restart"}
        </button>
      </div>
    </div>
  );
}
