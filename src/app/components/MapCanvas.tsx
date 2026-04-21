import { useState, useCallback } from "react";
import svgPaths from "./mapSvgPaths";
import mapBackdrop from "../../assets/sentinel-map-overhaul.png";
import mapPreIncident from "../../assets/map-preincident.png";
import droneThermalFeed from "../../assets/drone-thermal-feed.png";
import droneNvgFeed from "../../assets/drone-nvg-feed.png";
import droneThermalRes from "../../assets/drone-thermal-residential.png";
import droneLowlight from "../../assets/drone-lowlight-road.png";
import {
  ANOMALY,
  EVACUATION_ROUTES,
  RESPONDER_ROUTE,
  TERRAIN_MODEL_STATUS,
  getZoneLabel,
} from "../mockData";
import { DroneMissionType, ShellState, T, font } from "../tokens";

// ─── Props interface (unchanged — consumed by SentinelShell) ────────────────
interface MapCanvasProps {
  state: ShellState;
  onSelectEntity: (selection: ShellState["selectedEntity"]) => void;
  mapImageSrc?: string;
}

// ─── Scaling: Figma canvas 1691×914 → display 1440×900 ─────────────────────
const SX = 1440 / 1691; // ≈ 0.8516
const SY = 900 / 914;   // ≈ 0.9847
const sx = (x: number) => x * SX;
const sy = (y: number) => y * SY;

// ─── NAV lines transform (Figma NAV: viewBox="0 0 1482 436.446" at left=5, top=479)
const NAV_A  = (1480 / 1482) * SX;
const NAV_D  = (435  / 436.446) * SY;
const NAV_TX = 5   * SX;
const NAV_TY = 479 * SY;
const NAV_TRANSFORM = `matrix(${NAV_A},0,0,${NAV_D},${NAV_TX},${NAV_TY})`;

// ─── Zone IDs for the new Figma-based interactive system ─────────────────────
type ZoneId = "FireZone_Main" | "FireSpread_Boundary" | "BufferZone" | "ForestZone" | "ResidentialZone";

// ─── Drone marker positions in Figma-space (matches drone IDs from mockData) ─
const DRONE_MARKER_MAP: Record<string, { cx: number; cy: number; label: string }> = {
  "scout-01":    { cx: 609,  cy: 302, label: "SCOUT-01"    },
  "lidar-02":    { cx: 1086, cy: 433, label: "LIDAR-02"    },
  "relay-01":    { cx: 538,  cy: 570, label: "RELAY-01"    },
  "relay-02":    { cx: 954,  cy: 603, label: "RELAY-02"    },
  "herald-01":   { cx: 1378, cy: 781, label: "HERALD-01"   },
  "vanguard-01": { cx: 1218, cy: 704, label: "VANGUARD-01" },
  "scout-03":    { cx: 1350, cy: 250, label: "SCOUT-03"    },
  "relay-03":    { cx: 1450, cy: 490, label: "RELAY-03"    },
  "herald-02":   { cx: 1050, cy: 830, label: "HERALD-02"   },
  "vanguard-02": { cx: 650,  cy: 690, label: "VANGUARD-02" },
};

// ─── Team marker positions in Figma-space (matches original MapCanvas coords) ─
const TEAM_MARKERS = {
  alpha: { cx: 530, cy: 616, color: T.amber,  dashColor: "#F5A623", label: "ALPHA" },
  bravo: { cx: 950, cy: 640, color: T.fire,   dashColor: "#E5533C", label: "BRAVO" },
} as const;

// ─── Ground-team vehicle cluster (new Figma-style glowing dot with dashed ring)
function Vehicle({ cx, cy, mainColor, dashColor, r = 4.5 }: {
  cx: number; cy: number; mainColor: string; dashColor: string; r?: number;
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 3.2} fill={mainColor} fillOpacity={0.1} />
      <circle cx={cx} cy={cy} r={r * 0.7} fill="white" />
      <circle cx={cx} cy={cy} r={r * 1.4} fill="none" stroke={mainColor} strokeOpacity={0.5} strokeWidth={0.65} />
      <circle cx={cx} cy={cy} r={r * 2.0} fill="none" stroke={dashColor} strokeOpacity={0.88} strokeWidth={1.0} strokeDasharray="8.22 5.87" />
    </g>
  );
}

// ─── Drone / Relay crosshair marker (new Figma-style with pulse animation) ───
function NewDroneMarker({
  cx, cy, label, active, degraded, muted, isHovered, onEnter, onLeave, onClick,
}: {
  cx: number; cy: number; label: string; active: boolean;
  degraded?: boolean; muted?: boolean; isHovered: boolean;
  onEnter: () => void; onLeave: () => void;
  onClick: (e: React.MouseEvent<SVGGElement>) => void;
}) {
  const scale = isHovered ? 1.12 : 1;
  const color = degraded ? T.amber : "#00C8FF";
  const opacity = muted ? 0.52 : 0.96;
  const R   = 14.0 * SX;
  const hw  = 9.4  * SX;
  const hh  = 1.76 * SY;

  return (
    <g
      transform={`translate(${cx},${cy})`}
      style={{ cursor: "pointer", pointerEvents: "all" }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <g style={{ transform: `scale(${scale})`, transformOrigin: "0 0", transition: "transform 0.2s ease", opacity }}>
        {/* Pulse ring */}
        {active && (
          <circle cx={0} cy={0} r={R} fill="none" stroke={color} strokeWidth={0.9} strokeOpacity={0.35}>
            <animate attributeName="r" from={`${R}`} to={`${R * 1.75}`} dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" from="0.42" to="0" dur="2.2s" repeatCount="indefinite" />
          </circle>
        )}
        {/* Outer glow circle */}
        <circle cx={0} cy={0} r={R}
          fill={color} fillOpacity={muted ? 0.06 : 0.11}
          stroke={color} strokeWidth={1.4 * SX}
          filter="url(#marker-glow-l3)"
        />
        {/* Crosshair: horizontal bar */}
        <rect x={-hw} y={-hh} width={hw * 2} height={hh * 2} fill={color} rx={hh} />
        {/* Crosshair: vertical bar */}
        <rect x={-hh} y={-hw} width={hh * 2} height={hw * 2} fill={color} rx={hh} />
        {/* Center dot */}
        <circle cx={0} cy={0} r={2.8 * SX} fill={color} />
      </g>
      {/* Label — not scaled */}
      <text
        x={R + 5 * SX}
        y={3.8 * SY}
        fill={color}
        fontSize={9.393 * SX}
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="bold"
        opacity={opacity}
      >
        {label}
      </text>
    </g>
  );
}

// ─── Zone label badge ────────────────────────────────────────────────────────
function ZoneBadge({
  x, y, w, h, text, textColor, borderColor, pill = false,
}: {
  x: number; y: number; w: number; h: number;
  text: string; textColor: string; borderColor: string; pill?: boolean;
}) {
  const rx = pill ? h * 0.38 : 3 * SX;
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} rx={rx}
        fill="#050A12" fillOpacity={0.74}
        stroke={borderColor} strokeWidth={1.17 * SX}
      />
      <text
        x={x + w / 2}
        y={y + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fontSize={9.98 * SX}
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="bold"
      >
        {text}
      </text>
    </g>
  );
}

// ─── Anomaly marker (fire thermal spike dot — shown once incident is surfaced) ─
function AnomalyMarker({ selected, onClick }: { selected: boolean; onClick: (e: React.MouseEvent<SVGGElement>) => void }) {
  const cx = sx(ANOMALY.x);
  const cy = sy(ANOMALY.y);
  return (
    <g style={{ cursor: "pointer", pointerEvents: "all" }} onClick={(e) => { e.stopPropagation(); onClick(e); }}>
      <circle cx={cx} cy={cy} r={44 * SX} fill={`rgba(229,83,60,0.18)`} filter="url(#glow-strong)" />
      <circle cx={cx} cy={cy} r={selected ? 13 * SX : 10 * SX} fill={T.fire} />
      <circle cx={cx} cy={cy} r={22 * SX} fill="none" stroke={`rgba(229,83,60,0.9)`} strokeWidth={1.8} strokeDasharray="6 5" />
    </g>
  );
}

// ─── Main MapCanvas export ───────────────────────────────────────────────────
export function MapCanvas({ state, onSelectEntity, mapImageSrc = mapBackdrop }: MapCanvasProps) {
  if (state.surfaceMode === "drone-grid") {
    return <DroneGridSurface state={state} onSelectEntity={onSelectEntity} />;
  }
  return <MapView state={state} onSelectEntity={onSelectEntity} mapImageSrc={mapImageSrc} />;
}

// ─── MapView (the real map — split out so hooks are never called conditionally)
function MapView({ state, onSelectEntity, mapImageSrc }: Required<MapCanvasProps>) {
  // ── Internal hover/selection for new Figma zone visuals ──────────────────
  const [hoveredZone,   setHoveredZone]   = useState<ZoneId | null>(null);
  const [selectedZone,  setSelectedZone]  = useState<ZoneId | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);

  // ── Phase/flow visibility flags ──────────────────────────────────────────
  const showIncident   = state.scene !== "baseline";
  const showContain    = state.mode  === "contain";
  const showRescue     = state.mode  === "rescue";

  // Scenes before verify-active show the calm pre-incident map backdrop.
  // Once the operator confirms the incident (verify-active onward), the fire map appears.
  const isPreVerify =
    state.scene === "baseline" ||
    state.scene === "alert-command" ||
    state.scene === "investigation-pending" ||
    state.scene === "verify-ready";
  const activeMapSrc = isPreVerify ? mapPreIncident : mapImageSrc;

  const showInvestigationPath =
    state.scene === "investigation-pending" ||
    state.scene === "verify-ready"          ||
    state.scene === "verify-active";

  // Zones are only interactive in contain/rescue modes
  const zonesInteractive = showContain || showRescue;

  const hasMission = (mission: DroneMissionType) =>
    state.drones.some((d) => d.assignedMission === mission);

  // ── PROGRESSIVE REVEAL — each element gated by the action that triggers it ─
  // Coverage drones deployed → fire spread boundary + forest zone label appear
  const showFireSpreadBoundary =
    hasMission("survey-zone") ||
    hasMission("perimeter-monitor") ||
    showRescue;

  // Residential zones appear only after evac staging or teams notified
  const showResidentialZones =
    hasMission("prepare-residential-evacuation") ||
    state.teamsNotified ||
    state.emergencyEvacuationActive ||
    showRescue;

  // Nav lines appear after responder guidance or relay intel are staged
  const showNavLines =
    hasMission("guide-emergency-personnel") ||
    hasMission("relay-field-intel") ||
    state.responderRouteActive ||
    showRescue;

  // Evacuation route lines: only after emergency-evacuate modal confirmed
  const showEvacuationRoutes =
    state.emergencyEvacuationActive ||
    state.residentialRouteActive;

  // Responder route: after deploy-navigation-drone action fires
  const showResponderRoute =
    state.responderRouteActive ||
    hasMission("guide-emergency-personnel");

  // Team markers: only after notify-teams modal confirmed
  const showTeams = state.teamsNotified;

  const showContainDegraded = showContain && state.scene === "contain-degraded";

  // ── Zone opacity/filter for interactive hover/selection ──────────────────
  const getZoneOpacity = useCallback((id: ZoneId) => {
    if (!zonesInteractive) return 0.85;
    if (selectedZone) return selectedZone === id ? 1 : 0.28;
    if (hoveredZone === id) return 1;
    return 0.85;
  }, [zonesInteractive, hoveredZone, selectedZone]);

  const getZoneFilter = useCallback((id: ZoneId) => {
    if (!zonesInteractive) return "none";
    if (selectedZone === id) return "url(#glow-strong)";
    if (hoveredZone === id) return "url(#glow-subtle)";
    return "none";
  }, [zonesInteractive, hoveredZone, selectedZone]);

  const handleZoneEnter = (id: ZoneId) => () => { if (zonesInteractive) setHoveredZone(id); };
  const handleZoneLeave = () => setHoveredZone(null);
  const handleZoneClick = (id: ZoneId) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!zonesInteractive) return;
    setSelectedZone(prev => (prev === id ? null : id));
  };

  // Label badge dimensions
  const RES_LW = sx(133.434);
  const RES_LH = sy(35.934);
  const FF_LW  = sx(118.581);
  const FF_LH  = sy(24.656);

  return (
    <div
      style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", background: "#050A12" }}
      onClick={() => onSelectEntity(null)}
    >
      {/* ══ LAYER 1 — Background image ════════════════════════════════════════ */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", userSelect: "none" }}>
        <img
          src={activeMapSrc}
          alt="Sentinel spatial map"
          draggable={false}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "50% 44%",
            transition: "opacity 600ms ease",
            filter: (showContain || showRescue)
              ? "saturate(0.96) brightness(0.84)"
              : isPreVerify
              ? "saturate(0.6) brightness(0.6) hue-rotate(180deg)"
              : "saturate(0.92) brightness(0.74)",
          }}
        />
        {/* Radial vignette overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background:
            "radial-gradient(ellipse 152% 66% at 50% 46%," +
            "rgba(10,15,26,0.02) 0%,rgba(5,10,18,0.14) 4.3%,rgba(2,4,10,0.54) 20.2%)",
        }} />
        {/* Vertical vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background:
            "linear-gradient(180deg," +
            "rgba(5,10,18,0.40) 0%,rgba(5,10,18,0.06) 22%," +
            "rgba(5,10,18,0.10) 60%,rgba(4,8,14,0.52) 100%)",
        }} />
      </div>

      {/* ══ LAYER 2 — Zone + route SVG overlay ════════════════════════════════ */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 1440 900"
        xmlns="http://www.w3.org/2000/svg"
        overflow="hidden"
      >
        <defs>
          <filter id="glow-subtle" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-strong" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="res1-inner" colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse" x="0" y="0" width="1061.3" height="341.93">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset dy="4" /><feGaussianBlur stdDeviation="2" />
            <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
            <feBlend in2="shape" mode="normal" result="effect1_innerShadow" />
          </filter>
          <filter id="res2-blur" colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse" x="0" y="-1" width="893" height="528">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
            <feGaussianBlur result="effect1" stdDeviation="1.25" />
          </filter>
          <filter id="marker-glow-l3" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="unit-glow-l3" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <marker id="arrowhead-white" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
            <path d="M0,0 L0,8 L10,4 Z" fill="rgba(255,255,255,0.92)" />
          </marker>
          <marker id="arrowhead-yellow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
            <path d="M0,0 L0,8 L10,4 Z" fill={T.yellow} />
          </marker>
        </defs>

        {/* ── BufferZone (left cyan dashed) — always visible, interactive in contain/rescue */}
        <g
          style={{
            cursor: zonesInteractive ? "pointer" : "default",
            opacity: getZoneOpacity("BufferZone"),
            transition: "opacity 0.3s ease",
          }}
          filter={getZoneFilter("BufferZone")}
          onMouseEnter={handleZoneEnter("BufferZone")}
          onMouseLeave={handleZoneLeave}
          onClick={handleZoneClick("BufferZone")}
        >
          <svg x={sx(-0.56)} y={sy(93.5)} width={sx(618.557)} height={sy(330.459)}
            viewBox="0 0 620.186 332.099" overflow="visible">
            <path d={svgPaths.p5fe3700} fill="none" stroke="#00C8FF"
              strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round"
              strokeOpacity={0.35} strokeWidth={1.64} />
          </svg>
        </g>

        {/* ── ForestZone (right cyan dashed) — always visible */}
        <g
          style={{
            cursor: zonesInteractive ? "pointer" : "default",
            opacity: getZoneOpacity("ForestZone"),
            transition: "opacity 0.3s ease",
          }}
          filter={getZoneFilter("ForestZone")}
          onMouseEnter={handleZoneEnter("ForestZone")}
          onMouseLeave={handleZoneLeave}
          onClick={handleZoneClick("ForestZone")}
        >
          <svg x={sx(1283)} y={sy(131)} width={sx(404.5)} height={sy(443)}
            viewBox="0 0 406.18 444.824" overflow="visible">
            <path d={svgPaths.p1cd2c800} fill="none" stroke="#00C8FF"
              strokeDasharray="3 3" strokeOpacity={0.35} strokeWidth={1.64} />
          </svg>
        </g>

        {/* ── ResidentialZone — shown after evacuation staging or teams notified */}
        {showResidentialZones && (
          <g
            style={{
              cursor: zonesInteractive ? "pointer" : "default",
              opacity: getZoneOpacity("ResidentialZone"),
              transition: "opacity 0.3s ease",
            }}
            filter={getZoneFilter("ResidentialZone")}
            onMouseEnter={handleZoneEnter("ResidentialZone")}
            onMouseLeave={handleZoneLeave}
            onClick={handleZoneClick("ResidentialZone")}
          >
            {/* Residential Zone 2 (left) */}
            <svg x={sx(5)} y={sy(410)} width={sx(883)} height={sy(518)}
              viewBox="0 0 891.741 525.58" overflow="visible">
              <g filter="url(#res2-blur)">
                <path d={svgPaths.p2d098e80} fill="#E5533C" fillOpacity={0.05} />
                <path d={svgPaths.p2d098e80} stroke="#E5533C" strokeDasharray="4.7 4.7" strokeWidth={2.35} fill="none" />
              </g>
            </svg>
            {/* Residential Zone 1 (bottom-right) */}
            <svg x={sx(540)} y={sy(581)} width={sx(1057.5)} height={sy(335.5)}
              viewBox="0 0 1061.3 337.93" overflow="visible">
              <g opacity={0.74}>
                <g filter="url(#res1-inner)">
                  <path d={svgPaths.p33509870} fill="#E5533C" fillOpacity={0.05} />
                </g>
                <path d={svgPaths.p33509870} stroke="#E5533C" strokeDasharray="4.7 4.7" strokeWidth={2.35} fill="none" />
              </g>
            </svg>
            <ZoneBadge x={sx(974)} y={sy(748)} w={RES_LW} h={RES_LH}
              text="RESIDENTIAL ZONE 1" textColor="#E5533C" borderColor="#E5533C" pill />
            <ZoneBadge x={sx(267)} y={sy(662)} w={RES_LW} h={RES_LH}
              text="RESIDENTIAL ZONE 2" textColor="#E5533C" borderColor="#E5533C" pill />
          </g>
        )}

        {/* ── FireSpread_Boundary — appears after first coverage drone is deployed */}
        {showFireSpreadBoundary && (
          <g
            style={{
              cursor: zonesInteractive ? "pointer" : "default",
              opacity: getZoneOpacity("FireSpread_Boundary"),
              transition: "opacity 0.3s ease",
            }}
            filter={getZoneFilter("FireSpread_Boundary")}
            onMouseEnter={handleZoneEnter("FireSpread_Boundary")}
            onMouseLeave={handleZoneLeave}
            onClick={handleZoneClick("FireSpread_Boundary")}
          >
            <svg x={sx(563.44)} y={sy(69.17)} width={sx(838.556)} height={sy(586.333)}
              viewBox="0 0 841.53 589.333" overflow="visible">
              <path d={svgPaths.p1073c400} fill="#FF6B4A" fillOpacity={0.07}
                stroke="#FF6B4A" strokeDasharray="5 5" strokeLinecap="round"
                strokeLinejoin="bevel" strokeMiterlimit={16} strokeWidth={3} />
            </svg>
            <ZoneBadge x={sx(697)} y={sy(195)} w={FF_LW} h={FF_LH}
              text="FOREST ZONE" textColor="#F5A623" borderColor="#F5A623" />
          </g>
        )}

        {/* ── FireZone_Main (inner fire polygon + FIRE SPREAD label) — incident only */}
        {showIncident && (
          <g
            style={{
              cursor: zonesInteractive ? "pointer" : "default",
              opacity: getZoneOpacity("FireZone_Main"),
              transition: "opacity 0.3s ease",
            }}
            filter={getZoneFilter("FireZone_Main")}
            onMouseEnter={handleZoneEnter("FireZone_Main")}
            onMouseLeave={handleZoneLeave}
            onClick={handleZoneClick("FireZone_Main")}
          >
            <svg x={sx(690)} y={sy(159.5)} width={sx(657.299)} height={sy(416.5)}
              viewBox="0 0 658.98 417.373" overflow="visible">
              <path d={svgPaths.p20187b00} fill="#F5A623" fillOpacity={0.05} />
              <path d={svgPaths.p101b3000} fill="#FF6B4A" />
            </svg>
            {showFireSpreadBoundary && (
              <ZoneBadge x={sx(982)} y={sy(283)} w={FF_LW} h={FF_LH}
                text="FIRE SPREAD EST." textColor="#E5533C" borderColor="#E5533C" />
            )}
          </g>
        )}

        {/* ── Anomaly dot (thermal spike) — shown once incident is surfaced */}
        {showIncident && (
          <AnomalyMarker
            selected={state.selectedEntity?.type === "anomaly"}
            onClick={(e) => {
              e.stopPropagation();
              onSelectEntity({ type: "anomaly", id: ANOMALY.id });
            }}
          />
        )}

        {/* ── Pre-verify unverified signal badge — replaces specific fire labels before confirmation */}
        {isPreVerify && showIncident && (
          <g pointerEvents="none">
            {/* Pulsing ring around anomaly location */}
            <circle
              cx={sx(ANOMALY.x)}
              cy={sy(ANOMALY.y)}
              r={70 * SX}
              fill="none"
              stroke={T.amber}
              strokeWidth={1.4}
              strokeDasharray="6 5"
              opacity={0.45}
              style={{ animation: "pulse 2s infinite" }}
            />
            {/* Unverified tag badge */}
            <rect
              x={sx(ANOMALY.x) - 56}
              y={sy(ANOMALY.y) - 100}
              width={112}
              height={20}
              rx={4}
              fill="rgba(5,8,16,0.82)"
              stroke={`${T.amber}88`}
              strokeWidth={1}
            />
            <text
              x={sx(ANOMALY.x)}
              y={sy(ANOMALY.y) - 86}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={T.amber}
              fontSize={9}
              fontFamily={font.mono}
              letterSpacing="0.06em"
            >
              UNVERIFIED · GRID 4C
            </text>
          </g>
        )}

        {/* ── Investigation path (dashed cyan line toward anomaly) */}
        {showInvestigationPath && (
          <path
            d="M 925,369 C 908,344 896,316 888,290"
            fill="none"
            stroke={T.cyan}
            strokeWidth={1.8}
            strokeDasharray="9 8"
            opacity={0.76}
            pointerEvents="none"
          />
        )}

        {/* ── Nav lines & arrows — appear after responder guidance or relay intel staged */}
        {showNavLines && (
          <g pointerEvents="none" opacity={0.72}>
            <g transform={NAV_TRANSFORM} stroke="white" strokeOpacity={0.72} strokeWidth={0.5} fill="none">
              <line x1={1346.76} y1={365.376} x2={1366.76} y2={296.376} />
              <line x1={1366.87} y1={296.929} x2={1095.5}  y2={223.946} />
              <line x1={1346.87} y1={365.929} x2={1053}    y2={285.446} />
              <line x1={1096.2}  y1={223.591} x2={956.204} y2={419.591} />
              <line x1={956.927} y1={419.685} x2={608.927} y2={313.685} />
              <line x1={863.148} y1={126.647} x2={609.148} y2={313.647} />
              <line x1={1346.24} y1={365.518} x2={1325.24} y2={435.518} />
              <line x1={470.074} y1={270.207} x2={609.074} y2={313.207} />
              <line x1={575.097} y1={157.536} x2={470.537} y2={269.948} />
              <line x1={381.135} y1={94.6564} x2={55.1348} y2={302.656} />
              <line x1={34.8869} y1={119.223} x2={268.887} y2={0.22284} />
              <line x1={3.03809} y1={70.1986} x2={101.038} y2={85.1986} />
              <line x1={161.962} y1={53.6927} x2={0.96191} y2={28.6927} />
            </g>
            <g transform={NAV_TRANSFORM} fill="white" stroke="none">
              <path d={svgPaths.p9e6e800}  />
              <path d={svgPaths.p19374e00} />
              <path d={svgPaths.pc42d800}  />
              <path d={svgPaths.p33816100} />
            </g>
          </g>
        )}

        {/* ── Evacuation routes */}
        {showEvacuationRoutes && EVACUATION_ROUTES.map((route) => (
          <g key={route.id} pointerEvents="none">
            <path
              d={route.path}
              fill="none"
              stroke={route.color}
              strokeWidth={2.2}
              strokeLinecap="round"
              markerEnd="url(#arrowhead-white)"
            />
            <text x={route.textX} y={route.textY} fill="rgba(255,255,255,0.86)" fontSize={8.8} fontFamily={font.mono}>
              {route.label}
            </text>
          </g>
        ))}

        {/* ── Responder route */}
        {showResponderRoute && (
          <g pointerEvents="none">
            <path
              d={RESPONDER_ROUTE.path}
              fill="none"
              stroke={RESPONDER_ROUTE.color}
              strokeWidth={2.6}
              strokeDasharray="8 6"
              strokeLinecap="round"
              markerEnd="url(#arrowhead-yellow)"
            />
            <text x={RESPONDER_ROUTE.textX} y={RESPONDER_ROUTE.textY}
              fill={RESPONDER_ROUTE.color} fontSize={8.8} fontFamily={font.mono}>
              {RESPONDER_ROUTE.label}
            </text>
          </g>
        )}

        {/* ── Signal-degraded autonomous reroute annotation */}
        {state.exceptionState === "signal-degraded" && (
          <g pointerEvents="none">
            <path d="M 1380,782 C 1328,730 1260,704 1188,706"
              fill="none" stroke={T.amber} strokeWidth={2.8} strokeDasharray="7 6" />
            <text x="1214" y="742" fill={T.amber} fontSize={8.8} fontFamily={font.mono}>
              AUTONOMOUS REROUTE
            </text>
          </g>
        )}

        {/* ── Drone / Relay markers — controlled by original visibility rules */}
        {state.drones.map((drone) => {
          const pos = DRONE_MARKER_MAP[drone.id];
          if (!pos) return null;

          const { mode, scene } = state;

          // ── Phase-specific drone visibility ──────────────────────────────────
          // Baseline: only the two perimeter watchers on the northern ridge
          // Investigation: Lidar-02 goes en-route
          // Verify: Lidar-02 on-station (bright active marker)
          // Contain: mission-assigned drones appear as actions are taken
          //          ambient support drones (scout-03, relay-03, etc.) appear as extra density
          // Rescue: full fleet on map + herald/vanguard appear in residential sector

          let visibleInPhase = false;
          if (mode === "scan") {
            // Only baseline overwatch assets
            visibleInPhase = ["scout-01", "relay-01"].includes(drone.id);
          } else if (scene === "investigation-pending") {
            visibleInPhase = ["scout-01", "relay-01", "lidar-02"].includes(drone.id);
          } else if (scene === "verify-ready" || scene === "verify-active") {
            visibleInPhase = ["scout-01", "relay-01", "lidar-02", "scout-03"].includes(drone.id);
          } else if (mode === "contain") {
            // Contain: primary personnel + mission-assigned drones. Ambient ones fade in.
            const ambientContain = ["scout-01", "scout-03", "relay-01", "relay-03", "vanguard-02"];
            visibleInPhase = ambientContain.includes(drone.id) || Boolean(drone.assignedMission && drone.assignedMission !== "patrol");
          } else if (mode === "rescue") {
            // Rescue: all major assets visible
            const rescuePersistent = ["scout-01", "scout-03", "relay-01", "relay-02", "relay-03", "herald-02", "vanguard-02"];
            visibleInPhase = rescuePersistent.includes(drone.id) || Boolean(drone.assignedMission && drone.assignedMission !== "patrol") || (drone.id === "vanguard-01" && state.backupDeployed);
          }

          if (!visibleInPhase) return null;

          const active   = state.selectedEntity?.type === "drone" && state.selectedEntity.id === drone.id;
          const degraded = drone.status === "signal-degraded";
          const muted    = !drone.assignedMission || drone.assignedMission === "patrol";

          return (
            <NewDroneMarker
              key={drone.id}
              cx={sx(pos.cx)}
              cy={sy(pos.cy)}
              label={pos.label}
              active={active}
              degraded={degraded}
              muted={muted}
              isHovered={hoveredMarker === drone.id}
              onEnter={() => setHoveredMarker(drone.id)}
              onLeave={() => setHoveredMarker(null)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectEntity({ type: "drone", id: drone.id });
              }}
            />
          );
        })}

        {/* ── Ground teams — shown in contain/rescue or when teams notified */}
        {showTeams && (
          <>
            {/* Team Alpha */}
            <g pointerEvents="all" style={{ cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); onSelectEntity({ type: "team", id: "alpha" }); }}>
              <g filter="url(#unit-glow-l3)" opacity={0.92}>
                <Vehicle cx={sx(TEAM_MARKERS.alpha.cx - 31)} cy={sy(TEAM_MARKERS.alpha.cy + 6)}  mainColor="#F6B447" dashColor={TEAM_MARKERS.alpha.dashColor} r={4.2} />
                <Vehicle cx={sx(TEAM_MARKERS.alpha.cx - 18)} cy={sy(TEAM_MARKERS.alpha.cy)}     mainColor="#F6B447" dashColor={TEAM_MARKERS.alpha.dashColor} r={4.2} />
                <Vehicle cx={sx(TEAM_MARKERS.alpha.cx - 24)} cy={sy(TEAM_MARKERS.alpha.cy + 14)} mainColor="#F6B447" dashColor={TEAM_MARKERS.alpha.dashColor} r={4.2} />
              </g>
              <g filter="url(#unit-glow-l3)" opacity={0.92}>
                <Vehicle cx={sx(TEAM_MARKERS.alpha.cx)} cy={sy(TEAM_MARKERS.alpha.cy - 5)} mainColor="#F6B447" dashColor={TEAM_MARKERS.alpha.dashColor} r={4.8} />
              </g>
              {state.selectedEntity?.type === "team" && state.selectedEntity.id === "alpha" && (
                <ellipse cx={sx(TEAM_MARKERS.alpha.cx - 10)} cy={sy(TEAM_MARKERS.alpha.cy + 5)}
                  rx={sx(38)} ry={sy(20)} fill={`rgba(245,166,35,0.16)`} filter="url(#unit-glow-l3)" />
              )}
              <text x={sx(TEAM_MARKERS.alpha.cx - 20)} y={sy(TEAM_MARKERS.alpha.cy - 15)}
                fill={TEAM_MARKERS.alpha.color} fontSize={9.393 * SX}
                fontFamily="'JetBrains Mono', monospace" fontWeight="bold">
                {TEAM_MARKERS.alpha.label}
              </text>
            </g>

            {/* Team Bravo */}
            <g pointerEvents="all" style={{ cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); onSelectEntity({ type: "team", id: "bravo" }); }}>
              <g filter="url(#unit-glow-l3)" opacity={0.92}>
                <Vehicle cx={sx(TEAM_MARKERS.bravo.cx - 30)} cy={sy(TEAM_MARKERS.bravo.cy + 9)}  mainColor="#F6B447" dashColor={TEAM_MARKERS.bravo.dashColor} r={4.2} />
                <Vehicle cx={sx(TEAM_MARKERS.bravo.cx - 17)} cy={sy(TEAM_MARKERS.bravo.cy + 3)}  mainColor="#F6B447" dashColor={TEAM_MARKERS.bravo.dashColor} r={4.2} />
                <Vehicle cx={sx(TEAM_MARKERS.bravo.cx - 23)} cy={sy(TEAM_MARKERS.bravo.cy + 17)} mainColor="#F6B447" dashColor={TEAM_MARKERS.bravo.dashColor} r={4.2} />
              </g>
              <g filter="url(#unit-glow-l3)" opacity={0.92}>
                <Vehicle cx={sx(TEAM_MARKERS.bravo.cx)} cy={sy(TEAM_MARKERS.bravo.cy - 2)} mainColor="#F6B447" dashColor={TEAM_MARKERS.bravo.dashColor} r={4.8} />
              </g>
              {state.selectedEntity?.type === "team" && state.selectedEntity.id === "bravo" && (
                <ellipse cx={sx(TEAM_MARKERS.bravo.cx - 10)} cy={sy(TEAM_MARKERS.bravo.cy + 8)}
                  rx={sx(38)} ry={sy(20)} fill={`rgba(229,83,60,0.16)`} filter="url(#unit-glow-l3)" />
              )}
              <text x={sx(TEAM_MARKERS.bravo.cx - 20)} y={sy(TEAM_MARKERS.bravo.cy - 12)}
                fill={TEAM_MARKERS.bravo.color} fontSize={9.393 * SX}
                fontFamily="'JetBrains Mono', monospace" fontWeight="bold">
                {TEAM_MARKERS.bravo.label}
              </text>
            </g>
          </>
        )}
      </svg>

      {/* ══ Degraded terrain banner ═══════════════════════════════════════════ */}
      {showContainDegraded && (
        <div style={{
          position: "absolute",
          top: 26,
          left: "50%",
          transform: "translateX(-50%)",
          width: 500,
          borderRadius: 16,
          border: "1px solid rgba(245,166,35,0.32)",
          background: "rgba(8,12,22,0.82)",
          padding: "12px 16px",
          boxShadow: "0 18px 42px rgba(0,0,0,0.28)",
          pointerEvents: "none",
        }}>
          <div style={{ fontFamily: font.mono, fontSize: 10, color: T.amber, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {TERRAIN_MODEL_STATUS.confidenceLowLabel}
          </div>
          <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary, lineHeight: 1.45, marginTop: 6 }}>
            {TERRAIN_MODEL_STATUS.confidenceLowMessage}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DroneGridSurface — Preserved unchanged from original MapCanvas
// ══════════════════════════════════════════════════════════════════════════════
function DroneGridSurface({
  state,
  onSelectEntity,
}: {
  state: ShellState;
  onSelectEntity: (selection: ShellState["selectedEntity"]) => void;
}) {
  const drones = [...state.drones]
    .sort((a, b) => {
      const score = (d: ShellState["drones"][number]) =>
        d.status === "signal-degraded" ? 0 : d.assignedMission ? 1 : d.status === "available" ? 3 : 2;
      return score(a) - score(b);
    })
    .slice(0, 4);

  return (
    <div style={{
      width: "100%", height: "100%",
      padding: "88px 342px 132px 342px",
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gridTemplateRows: "repeat(2, minmax(0, 1fr))",
      gap: 18,
      background:
        "radial-gradient(circle at top, rgba(0,200,255,0.08), transparent 28%), linear-gradient(180deg, rgba(7,10,18,0.72) 0%, rgba(7,10,18,0.92) 100%)",
    }}>
      {drones.map((drone, index) => {
        const active = state.selectedEntity?.type === "drone" && state.selectedEntity.id === drone.id;
        const accent = drone.status === "signal-degraded" ? T.amber : drone.status === "available" ? T.teal : T.cyan;
        
        let bgImage = droneThermalFeed;
        if (index === 1) bgImage = droneNvgFeed;
        if (index === 2) bgImage = droneThermalRes;
        if (index === 3) bgImage = droneLowlight;

        return (
          <button
            key={drone.id}
            onClick={() => onSelectEntity({ type: "drone", id: drone.id })}
            style={{
              borderRadius: 22,
              border: `1px solid ${active ? `${accent}66` : "rgba(255,255,255,0.08)"}`,
              background: "rgba(8,13,22,0.78)",
              overflow: "hidden",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              textAlign: "left",
            }}
          >
            <div style={{
              flex: 1, position: "relative",
              background: "rgba(5,8,14,0.94)",
            }}>
              <img src={bgImage} alt={drone.role} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.65 }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,200,255,0.1) 0%, rgba(10,18,28,0.3) 48%, rgba(5,8,14,0.95) 100%)" }} />
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 48%, transparent 100%)",
                transform: "translateX(-100%)",
                animation: "gridSweep 4.2s linear infinite",
              }} />
              <div style={{
                position: "absolute", left: 18, right: 18, top: 18, height: 1,
                background: "rgba(255,255,255,0.16)",
                boxShadow: "0 62px 0 rgba(255,255,255,0.08), 0 124px 0 rgba(255,255,255,0.05)",
              }} />
              <div style={{ position: "absolute", right: 18, top: 18 }}>
                <DroneStatusBadge label={drone.status} color={accent} />
              </div>
              <div style={{ position: "absolute", left: 18, bottom: 18 }}>
                <div style={{ fontFamily: font.mono, fontSize: 10, color: accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {drone.gridLabel}
                </div>
                <div style={{ fontFamily: font.sans, fontSize: 20, fontWeight: 700, color: T.textPrimary, marginTop: 6 }}>
                  {drone.name}
                </div>
                <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary, marginTop: 4 }}>
                  {drone.capabilityLabel} · {getZoneLabel(drone.zoneId)}
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 16px 16px", display: "grid", gap: 8 }}>
              <DroneInfoRow label="Mission" value={drone.assignedMission ?? "Standby"} />
              <DroneInfoRow label="Role"    value={drone.role} />
              <DroneInfoRow label="Battery" value={`${drone.battery}%`} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DroneStatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontFamily: font.sans, fontSize: 9, fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase", color,
      padding: "4px 8px", borderRadius: 999,
      border: `1px solid ${color}44`, background: `${color}12`,
    }}>
      {label}
    </span>
  );
}

function DroneInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted }}>{label}</span>
      <span style={{ fontFamily: font.mono, fontSize: 10, color: T.textPrimary }}>{value}</span>
    </div>
  );
}
