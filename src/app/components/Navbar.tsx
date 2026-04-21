import { Link } from "react-router";
import { INCIDENT } from "../mockData";
import { MODE_META, ShellState, SurfaceMode, T, font } from "../tokens";

interface NavbarProps {
  state: ShellState;
  timeString: string;
  surfaceMode: SurfaceMode;
  canToggleSurface: boolean;
  onSurfaceModeChange: (mode: SurfaceMode) => void;
}

export function Navbar({ state, timeString, surfaceMode, canToggleSurface, onSurfaceModeChange }: NavbarProps) {
  return (
    <>
      <BrandBlock />

      <VerticalDivider />

      <StatusBlock state={state} />

      <div style={{ flex: 1 }} />

      <SurfaceToggle
        surfaceMode={surfaceMode}
        canToggleSurface={canToggleSurface}
        onSurfaceModeChange={onSurfaceModeChange}
      />

      <DynamicMetrics state={state} />

      <VerticalDivider />

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <SystemControls />
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: font.mono, fontSize: 13, fontWeight: 700, color: T.textPrimary, letterSpacing: "0.04em" }}>{timeString} UTC</span>
          <span style={{ fontFamily: font.sans, fontSize: 11, color: T.cyan, padding: "2px 6px", background: "rgba(0,200,255,0.1)", borderRadius: 6 }}>{INCIDENT.operator}</span>
        </div>
      </div>
    </>
  );
}

function BrandBlock() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
      <DroneIcon />
      <span
        style={{
          fontFamily: font.sans,
          fontSize: 14,
          fontWeight: 700,
          color: T.textPrimary,
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
        }}
      >
        Flyt<span style={{ color: T.cyan }}>Base</span>
        <span style={{ color: T.textMuted, fontWeight: 400, marginLeft: 6, fontSize: 12 }}>Sentinel</span>
      </span>
    </div>
  );
}

function StatusBlock({ state }: { state: ShellState }) {
  const meta = MODE_META[state.mode];
  const scene = state.scene;
  const detail =
    scene === "alert-command"
      ? "Incoming thermal spike"
      : scene === "investigation-pending"
        ? "Scout-02 en route"
        : scene === "verify-ready"
          ? "Assessment interrupt ready"
          : scene === "verify-active"
            ? "Corroboration live"
            : scene === "contain-recommended"
              ? "Coverage expansion pending"
              : scene === "contain-alternate"
                ? "Alternate plan loaded"
                : scene === "contain-degraded"
                  ? "Fallback evidence mode"
                  : scene === "rescue-signal-degraded"
                    ? "Signal exception acknowledged"
                    : scene === "rescue-nominal"
                      ? "Execution nominal"
                      : "Quiet watch";

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 220 }}
      role="status"
      aria-label={`Operational mode: ${meta.label}. ${detail}`}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: meta.color,
          display: "inline-block",
          animation: scene === "baseline" ? undefined : "pulse 1.2s infinite",
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <span style={{ fontFamily: font.sans, fontSize: 12, fontWeight: 600, color: meta.color }}>
        {meta.label}
      </span>
      <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textMuted }}>·</span>
      <span style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary }}>{detail}</span>
    </div>
  );
}

function SurfaceToggle({
  surfaceMode,
  canToggleSurface,
  onSurfaceModeChange,
}: {
  surfaceMode: SurfaceMode;
  canToggleSurface: boolean;
  onSurfaceModeChange: (mode: SurfaceMode) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        opacity: canToggleSurface ? 1 : 0.45,
      }}
      role="group"
      aria-label={canToggleSurface ? "View mode toggle" : "View toggle — available from containment onwards"}
    >
      {[
        { id: "map", label: "Map" },
        { id: "drone-grid", label: "Drone Grid" },
      ].map((item) => {
        const isActive = surfaceMode === item.id;
        return (
          <button
            key={item.id}
            disabled={!canToggleSurface}
            onClick={() => onSurfaceModeChange(item.id as SurfaceMode)}
            aria-pressed={isActive}
            aria-label={`${item.label} view${isActive ? " (active)" : ""}${!canToggleSurface ? " — available from containment" : ""}`}
            style={{
              borderRadius: 10,
              border: `1px solid ${isActive ? `${T.cyan}55` : "transparent"}`,
              background: isActive ? "rgba(0,200,255,0.14)" : "transparent",
              color: isActive ? T.cyan : T.textSecondary,
              padding: "8px 12px",
              fontFamily: font.sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: canToggleSurface ? "pointer" : "default",
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function VerticalDivider() {
  return <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)" }} aria-hidden="true" />;
}

function DroneIcon() {
  return (
    <div
      style={{
        width: 24,
        height: 24,
        background: "rgba(0,200,255,0.12)",
        border: "1px solid rgba(0,200,255,0.3)",
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        flexShrink: 0,
      }}
      aria-label="FlytBase Sentinel"
      role="img"
    >
      <div style={{ position: "absolute", width: 13, height: 1.5, background: T.cyan }} />
      <div style={{ position: "absolute", width: 1.5, height: 13, background: T.cyan }} />
      <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.cyan, position: "absolute" }} />
    </div>
  );
}

// ─── Dynamic Additions ────────────────────────────────────────────────────────
function DynamicMetrics({ state }: { state: ShellState }) {
  let metrics: string[] = [];

  switch (state.mode) {
    case "scan":
      metrics = [
        "System nominal",
        "No severe thermal anomalies",
      ];
      break;
    case "verify":
      metrics = [
        "Investigating Grid 4C",
        "Asset ETA: 3 min",
      ];
      break;
    case "contain":
    case "rescue":
      metrics = [
        `${INCIDENT.structuresAtRisk} structures exposed`,
        `${state.drones.length} airborne assets`,
        INCIDENT.windVector,
      ];
      break;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, marginLeft: 18 }}>
      {metrics.map((label) => (
        <span
          key={label}
          style={{ fontFamily: font.mono, fontSize: 11, color: T.textSecondary, whiteSpace: "nowrap" }}
          aria-label={label}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function SystemControls() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button style={navBtnStyle}>
        <span>Incidents</span>
        <div style={{ background: T.amber, color: "#000", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 800 }}>1</div>
      </button>


      <button style={{ ...navBtnStyle, width: 28, justifyContent: "center" }} aria-label="Notifications">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </button>

      <button style={{ ...navBtnStyle, width: 28, justifyContent: "center" }} aria-label="Settings">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  padding: "6px 10px",
  fontFamily: font.sans,
  fontSize: 11,
  color: T.textSecondary,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const navBtnLinkStyle: React.CSSProperties = {
  ...navBtnStyle,
  textDecoration: "none",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: 10,
  fontWeight: 700,
};
