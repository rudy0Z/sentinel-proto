import { useState, useCallback, useEffect, useRef } from "react";
import svgPaths from "./mapSvgPaths";
import mapBackdrop from "../../../assets/sentinel-map-overhaul.png";
import mapPreIncident from "../../../assets/map-preincident.png";
import droneThermalFeed from "../../../assets/drone-thermal-feed.png";
import droneNvgFeed from "../../../assets/drone-nvg-feed.png";
import droneThermalRes from "../../../assets/drone-thermal-residential.png";
import droneLowlight from "../../../assets/drone-lowlight-road.png";
import { MapBackground } from "./MapBackground";
import { OperationalIcon } from "../../components/OperationalIcon";
import { RouteArrowDefs, RouteLine } from "../../components/RouteLine";
import { getOperationalException } from "../../domain/exceptions";
import {
  ANOMALY,
  EVACUATION_ROUTES,
  RESPONDER_ROUTE,
  TERRAIN_MODEL_STATUS,
  getZoneLabel,
  ZONES,
} from "../../mockData";
import { DroneMissionType, SelectedEntity, ShellState, T, font, motion, typeScale, radius } from "../../tokens";

// ─── Props interface (unchanged — consumed by SentinelShell) ────────────────
interface MapCanvasProps {
  state: ShellState;
  onSelectEntity: (selection: ShellState["selectedEntity"]) => void;
  spatialHover?: SelectedEntity;
  onSpatialHoverChange?: (target: SelectedEntity) => void;
  mapImageSrc?: string;
  onUpdateState?: (updater: (draft: any) => void) => void;
  coreMode?: boolean;
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

// ─── Map interaction IDs resolve directly to the shared mock-data model ──────
const MAP_ZONE_IDS = {
  forest: "forest-north",
  bufferWest: "buffer-west",
  bufferEast: "buffer-east",
  residentialWest: "residential-west",
  residentialSouth: "residential-south",
} as const;
type MapZoneId = (typeof MAP_ZONE_IDS)[keyof typeof MAP_ZONE_IDS];

const ZONE_BY_ID = new Map(ZONES.map((zone) => [zone.id, zone]));
const INVESTIGATION_SCENES = new Set<ShellState["scene"]>([
  "investigation-pending",
  "verify-active",
  "authority-notification-ready",
]);

type DraggableEntityType = "drone" | "team";

interface DragPreview {
  type: DraggableEntityType;
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

interface SettlingEntity {
  type: DraggableEntityType;
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  anchorLabel: string;
  started: boolean;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

function handleKeyboardActivation(
  event: React.KeyboardEvent<SVGGElement>,
  activate: () => void,
) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  event.stopPropagation();
  activate();
}

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

const MAP_OPERATION_ANCHORS: Array<{ id: string; label: string; x: number; y: number; allowed: Array<"drone" | "team"> }> = [
  { id: "forest-overwatch", label: "Forest Overwatch", x: 610, y: 302, allowed: ["drone"] },
  { id: "ridge-lidar", label: "Ridge LiDAR Hold", x: 1086, y: 433, allowed: ["drone"] },
  { id: "buffer-relay-west", label: "Buffer Relay West", x: 538, y: 570, allowed: ["drone", "team"] },
  { id: "buffer-relay-east", label: "Buffer Relay East", x: 954, y: 603, allowed: ["drone", "team"] },
  { id: "residential-egress", label: "Residential Egress Anchor", x: 1378, y: 781, allowed: ["drone", "team"] },
  { id: "alpha-staging", label: "Alpha Staging", x: 530, y: 616, allowed: ["team"] },
  { id: "bravo-staging", label: "Bravo Staging", x: 950, y: 640, allowed: ["team"] },
];

function nearestOperationalAnchor(x: number, y: number, type: "drone" | "team") {
  return MAP_OPERATION_ANCHORS
    .filter((anchor) => anchor.allowed.includes(type))
    .map((anchor) => ({
      ...anchor,
      distance: Math.hypot(anchor.x - x, anchor.y - y),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
}

// ─── Ground-unit marker — designed unit body inside a dashed coverage ring ────
function Vehicle({ cx, cy, mainColor, dashColor, r = 4.5 }: {
  cx: number; cy: number; mainColor: string; dashColor: string; r?: number;
}) {
  return (
    <g>
      {/* coverage glow + dashed ring */}
      <circle cx={cx} cy={cy} r={r * 2.8} fill={mainColor} fillOpacity={0.1} />
      <circle cx={cx} cy={cy} r={r * 2.0} fill="none" stroke={dashColor} strokeOpacity={0.85} strokeWidth={0.95} strokeDasharray="7 5" />
      {/* unit body */}
      <rect
        x={cx - r * 0.95} y={cy - r * 0.72} width={r * 1.9} height={r * 1.44} rx={r * 0.5}
        fill={mainColor} stroke="#0A0F18" strokeWidth={0.5} strokeOpacity={0.5}
      />
      {/* core */}
      <circle cx={cx} cy={cy} r={r * 0.4} fill="#0A0F18" fillOpacity={0.8} />
    </g>
  );
}

// ─── Class-specific accent glyph drawn in the drone body center ──────────────
function DroneClassGlyph({ droneClass, color }: { droneClass: string; color: string }) {
  switch (droneClass) {
    case "thermal-lidar":
      // scan diamond
      return <path d="M0,-3.2 L3.2,0 L0,3.2 L-3.2,0 Z" fill={color} />;
    case "guidance-relay":
      // broadcast arcs
      return (
        <g>
          <g fill="none" stroke={color} strokeWidth={0.9} strokeLinecap="round">
            <path d="M-3.2,-1.8 A4 4 0 0 1 3.2,-1.8" />
            <path d="M-1.7,-0.4 A2.2 2.2 0 0 1 1.7,-0.4" />
          </g>
          <circle cx={0} cy={1.6} r={1} fill={color} />
        </g>
      );
    case "evacuation-guidance":
      // downward beacon cone
      return (
        <g>
          <circle cx={0} cy={-2.1} r={1.2} fill={color} />
          <path d="M-2.5,3 L0,-1 L2.5,3 Z" fill={color} fillOpacity={0.55} />
        </g>
      );
    case "multi-role":
      // 4-point star
      return <path d="M0,-3.4 L0.9,-0.9 L3.4,0 L0.9,0.9 L0,3.4 L-0.9,0.9 L-3.4,0 L-0.9,-0.9 Z" fill={color} />;
    case "surveillance":
    default:
      // camera lens
      return (
        <g>
          <circle cx={0} cy={0} r={2.4} fill="none" stroke={color} strokeWidth={1} />
          <circle cx={0} cy={0} r={1} fill={color} />
        </g>
      );
  }
}

// ─── Drone marker — designed top-down quadcopter, class- and state-aware ──────
function DroneMarker({
  cx, cy, label, entityId, active, degraded, muted, isHovered, droneClass, status, battery,
  onEnter, onLeave, onClick, onPointerDown, onKeySelect, reducedMotion, settling,
}: {
  cx: number; cy: number; label: string; entityId: string; active: boolean;
  degraded?: boolean; muted?: boolean; isHovered: boolean;
  droneClass: string; status: string; battery?: number;
  onEnter: () => void; onLeave: () => void;
  onClick: (e: React.MouseEvent<SVGGElement>) => void;
  onPointerDown?: (e: React.PointerEvent<SVGGElement>) => void;
  onKeySelect: () => void;
  reducedMotion: boolean;
  settling?: boolean;
}) {
  const color = degraded ? T.amber : status === "available" ? "#5AD1FF" : "#00C8FF";
  const opacity = muted ? 0.72 : 0.98;
  const enRoute = status === "en-route";
  const assigned = status === "assigned";
  const holding = status === "holding";
  const animateRotors = !reducedMotion && enRoute;
  const animatePulse = !reducedMotion && (enRoute || degraded);
  const stateDash = degraded ? "4 3" : enRoute ? "2 2" : holding ? "7 4" : undefined;
  const scale = (isHovered ? 1.14 : 1) * 0.82;
  const arm = 8.4;
  const rotorR = 3.5;
  const rotors: Array<[number, number]> = [[arm, arm], [-arm, arm], [arm, -arm], [-arm, -arm]];
  const batteryColor = battery == null ? color : battery < 20 ? T.red : battery < 55 ? T.amber : T.teal;
  const statusLabel = status.replace("-", " ").toUpperCase();

  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`${label}, ${statusLabel.toLowerCase()}${battery == null ? "" : `, battery ${battery} percent`}. Select or drag to reposition.`}
      data-testid={`map-drone-${entityId}`}
      data-spatial-hover={isHovered ? "true" : "false"}
      style={{
        cursor: "grab",
        pointerEvents: "all",
        touchAction: "none",
        transform: `translate(${cx}px, ${cy}px)`,
        transition: settling && !reducedMotion ? `transform ${motion.deliberate}` : undefined,
      }}
      onMouseEnter={onEnter}
      onMouseLeave={(event) => {
        if (document.activeElement !== event.currentTarget) onLeave();
      }}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onClick}
      onKeyDown={(event) => handleKeyboardActivation(event, onKeySelect)}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (onPointerDown) onPointerDown(e);
      }}
    >
      <circle cx={0} cy={0} r={18} fill="transparent" pointerEvents="all" />
      <g style={{ transform: `scale(${scale})`, transformOrigin: "0 0", transition: `transform ${motion.normal}`, opacity }}>
        {/* A solid/dashed state ring keeps selection and flight state legible without glow. */}
        {(active || isHovered || degraded || enRoute || assigned || holding) && (
          <circle
            cx={0}
            cy={0}
            r={active ? 15 : 13}
            fill={active ? "rgba(0,200,255,0.09)" : "none"}
            stroke={color}
            strokeWidth={active ? 2 : 1.2}
            strokeDasharray={stateDash}
            strokeOpacity={active ? 1 : 0.74}
          >
            {animatePulse ? (
              <>
                <animate attributeName="r" values={`${active ? 15 : 13};${active ? 18 : 16};${active ? 15 : 13}`} dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.72;1;0.72" dur="1.8s" repeatCount="indefinite" />
              </>
            ) : null}
          </circle>
        )}
        {/* soft glow disc */}
        <circle cx={0} cy={0} r={12} fill={color} fillOpacity={muted ? 0.05 : 0.09} filter="url(#marker-glow-l3)" />
        {/* arms */}
        <g stroke={color} strokeWidth={1.1} strokeOpacity={0.8} strokeLinecap="round">
          <line x1={0} y1={0} x2={arm} y2={arm} />
          <line x1={0} y1={0} x2={-arm} y2={arm} />
          <line x1={0} y1={0} x2={arm} y2={-arm} />
          <line x1={0} y1={0} x2={-arm} y2={-arm} />
        </g>
        {/* rotors */}
        {rotors.map(([rx, ry], i) => (
          <g key={i}>
            <circle cx={rx} cy={ry} r={rotorR} fill={color} fillOpacity={0.14} stroke={color} strokeWidth={0.9} />
            {animateRotors && (
              <circle cx={rx} cy={ry} r={rotorR} fill="none" stroke={color} strokeWidth={0.7} strokeOpacity={0.65} strokeDasharray={`${rotorR * 1.1} ${rotorR * 2.2}`}>
                <animateTransform attributeName="transform" type="rotate" from={`0 ${rx} ${ry}`} to={`360 ${rx} ${ry}`} dur="0.85s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        ))}
        {/* center body */}
        <rect x={-4.6} y={-4.6} width={9.2} height={9.2} rx={2.4} fill="#0A0F18" fillOpacity={0.82} stroke={color} strokeWidth={1} />
        <DroneClassGlyph droneClass={droneClass} color={color} />
        {/* en-route heading chevron */}
        {enRoute && <path d="M0,-13 L3,-8 L-3,-8 Z" fill={color} fillOpacity={0.85} />}
      </g>
      {/* Name plate — dark backing so the label survives busy map regions;
          flips to the left near the right canvas edge; carries battery state. */}
      {(() => {
        const hasBattery = battery != null && !muted;
        const text = hasBattery ? `${label} · ${battery}%` : label;
        const plateW = Math.max(text.length * 6 + 16, statusLabel.length * 5.6 + 16);
        const plateH = 28;
        /* Flip the plate left before it would slide under the right rail
           (~330px of floating panel), not just the canvas edge. */
        const flip = cx + 15 + plateW > 1440 - 336;
        const plateX = flip ? -15 - plateW : 15;
        return (
          <g opacity={muted ? 0.7 : 0.96} pointerEvents="all">
            <rect
              x={plateX}
              y={-plateH / 2}
              width={plateW}
              height={plateH}
              rx={4}
              fill="transparent"
              pointerEvents="all"
            />
            <rect
              x={plateX}
              y={-plateH / 2}
              width={plateW}
              height={plateH}
              rx={4}
              fill="#0A0F18"
              fillOpacity={0.78}
              stroke={color}
              strokeOpacity={0.35}
              strokeWidth={0.8}
            />
            {hasBattery && (
              <circle cx={plateX + 7} cy={-5} r={2} fill={batteryColor} />
            )}
            <text
              x={plateX + (hasBattery ? 12 : 6)}
              y={-1.5}
              fill={color}
              fontSize={10.5}
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="bold"
            >
              {text}
            </text>
            <line
              x1={plateX + 6}
              x2={plateX + plateW - 6}
              y1={3}
              y2={3}
              stroke={color}
              strokeOpacity={active ? 0.7 : 0.28}
              strokeWidth={active ? 1.2 : 0.8}
              strokeDasharray={stateDash}
            />
            <text
              x={plateX + 6}
              y={11.5}
              fill={degraded ? T.amber : active ? T.textPrimary : color}
              fontSize={10.5}
              fontFamily="'JetBrains Mono', monospace"
              fontWeight={active || degraded ? 700 : 600}
            >
              {statusLabel}
            </text>
          </g>
        );
      })()}
    </g>
  );
}

// ─── Deterministic ember field for the living fire FX ────────────────────────
const FIRE_EMBERS = [
  { dx: -44, dy: 6,  r: 1.0, rise: 70, dur: 2.6, delay: 0.0, drift: 6,  color: "#FFB047" },
  { dx: -30, dy: -4, r: 1.4, rise: 84, dur: 3.0, delay: 0.5, drift: -7, color: "#FF6B4A" },
  { dx: -18, dy: 8,  r: 0.9, rise: 62, dur: 2.2, delay: 1.1, drift: 5,  color: "#FFD166" },
  { dx: -6,  dy: -6, r: 1.6, rise: 92, dur: 3.2, delay: 0.3, drift: -5, color: "#E5533C" },
  { dx: 4,   dy: 5,  r: 1.1, rise: 74, dur: 2.7, delay: 0.8, drift: 7,  color: "#FF8F3D" },
  { dx: 16,  dy: -3, r: 1.3, rise: 80, dur: 2.9, delay: 1.4, drift: -6, color: "#FF6B4A" },
  { dx: 28,  dy: 7,  r: 0.8, rise: 58, dur: 2.0, delay: 0.2, drift: 4,  color: "#FFD166" },
  { dx: 40,  dy: -5, r: 1.5, rise: 88, dur: 3.1, delay: 0.9, drift: -8, color: "#E5533C" },
  { dx: -36, dy: -8, r: 1.0, rise: 66, dur: 2.4, delay: 1.7, drift: 6,  color: "#FFB047" },
  { dx: 10,  dy: 9,  r: 1.2, rise: 78, dur: 2.8, delay: 2.0, drift: -4, color: "#FF8F3D" },
  { dx: -12, dy: 2,  r: 0.9, rise: 60, dur: 2.1, delay: 1.3, drift: 5,  color: "#FFD166" },
  { dx: 22,  dy: -7, r: 1.4, rise: 86, dur: 3.0, delay: 0.6, drift: -6, color: "#FF6B4A" },
];

// ─── Living fire — pulsing thermal glow + rising embers at the ignition point ─
function LiveFireFX({ cx, cy, animate }: { cx: number; cy: number; animate: boolean }) {
  return (
    <g pointerEvents="none">
      <ellipse cx={cx} cy={cy} rx={72} ry={34} fill="url(#fireGlow)">
        {animate ? (
          <>
            <animate attributeName="opacity" values="0.55;0.85;0.55" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="rx" values="72;78;72" dur="3.1s" repeatCount="indefinite" />
          </>
        ) : null}
      </ellipse>
      {animate ? FIRE_EMBERS.map((e, i) => {
        const ox = cx + e.dx;
        const oy = cy + e.dy;
        return (
          <circle key={i} cx={ox} cy={oy} r={e.r} fill={e.color} opacity={0}>
            <animate attributeName="cy" from={`${oy}`} to={`${oy - e.rise}`} dur={`${e.dur}s`} begin={`${e.delay}s`} repeatCount="indefinite" />
            <animate attributeName="cx" values={`${ox};${ox + e.drift};${ox}`} dur={`${e.dur}s`} begin={`${e.delay}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.9;0" keyTimes="0;0.3;1" dur={`${e.dur}s`} begin={`${e.delay}s`} repeatCount="indefinite" />
          </circle>
        );
      }) : null}
    </g>
  );
}

// ─── LiDAR scan-sweep — periodic reconstruction pass across the vision map ────
function LidarScanSweep() {
  return (
    <g pointerEvents="none" opacity={0.6}>
      <rect x={0} y={-72} width={1440} height={72} fill="url(#scanGrad)">
        <animateTransform attributeName="transform" type="translate" from="0 0" to="0 972" dur="5.5s" repeatCount="indefinite" />
      </rect>
      <line x1={0} y1={0} x2={1440} y2={0} stroke="#00C8FF" strokeWidth={1} strokeOpacity={0.45}>
        <animateTransform attributeName="transform" type="translate" from="0 0" to="0 972" dur="5.5s" repeatCount="indefinite" />
      </line>
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
  /* Clamp into the visible center lane: clear of the side rails (~330px each)
     and of the navbar / command bar, so edge zones never render half a badge
     or hide underneath a floating panel. */
  x = Math.min(Math.max(x, 336), 1440 - w - 336);
  y = Math.min(Math.max(y, 72), 730 - h);
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
        fontSize={10.5}
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="bold"
      >
        {text}
      </text>
    </g>
  );
}

// ─── Anomaly marker (fire thermal spike dot — shown once incident is surfaced) ─
function AnomalyMarker({
  selected,
  hovered,
  onClick,
  onKeySelect,
  onEnter,
  onLeave,
}: {
  selected: boolean;
  hovered: boolean;
  onClick: (e: React.MouseEvent<SVGGElement>) => void;
  onKeySelect: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const cx = sx(ANOMALY.x);
  const cy = sy(ANOMALY.y);
  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${ANOMALY.label}. Select anomaly.`}
      data-testid={`map-anomaly-${ANOMALY.id}`}
      style={{ cursor: "pointer", pointerEvents: "all" }}
      onMouseEnter={onEnter}
      onMouseLeave={(event) => {
        if (document.activeElement !== event.currentTarget) onLeave();
      }}
      onFocus={onEnter}
      onBlur={onLeave}
      onKeyDown={(event) => handleKeyboardActivation(event, onKeySelect)}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
    >
      <circle cx={cx} cy={cy} r={18} fill="transparent" pointerEvents="all" />
      <circle cx={cx} cy={cy} r={44 * SX} fill={`rgba(229,83,60,0.18)`} filter="url(#glow-strong)" />
      <circle cx={cx} cy={cy} r={selected ? 13 * SX : hovered ? 11 * SX : 10 * SX} fill={T.fire} />
      <circle
        cx={cx}
        cy={cy}
        r={selected ? 24 * SX : 22 * SX}
        fill={selected ? "rgba(229,83,60,0.12)" : "none"}
        stroke={T.fire}
        strokeWidth={selected ? 2.8 : hovered ? 2.2 : 1.8}
        strokeDasharray={selected ? undefined : "6 5"}
      />
    </g>
  );
}

// ─── Main MapCanvas export ───────────────────────────────────────────────────
export function MapCanvas({
  state,
  onSelectEntity,
  spatialHover,
  onSpatialHoverChange,
  mapImageSrc = mapBackdrop,
  onUpdateState,
  coreMode = false,
}: MapCanvasProps) {
  const reducedMotion = usePrefersReducedMotion();
  const restrainedMotion = reducedMotion || coreMode;
  if (state.surfaceMode === "drone-grid") {
    return (
      <DroneGridSurface
        state={state}
        onSelectEntity={onSelectEntity}
        spatialHover={spatialHover}
        onSpatialHoverChange={onSpatialHoverChange}
        reducedMotion={restrainedMotion}
      />
    );
  }
  return (
    <MapView
      state={state}
      onSelectEntity={onSelectEntity}
      spatialHover={spatialHover}
      onSpatialHoverChange={onSpatialHoverChange}
      mapImageSrc={mapImageSrc}
      onUpdateState={onUpdateState}
      reducedMotion={restrainedMotion}
      coreMode={coreMode}
    />
  );
}

// ─── MapView (the real map — split out so hooks are never called conditionally)
function MapView({
  state,
  onSelectEntity,
  spatialHover,
  onSpatialHoverChange,
  mapImageSrc,
  onUpdateState,
  reducedMotion,
  coreMode = false,
}: MapCanvasProps & { mapImageSrc: string; reducedMotion: boolean }) {
  // ── Internal hover/selection for new Figma zone visuals ──────────────────
  const [hoveredZone, setHoveredZone] = useState<MapZoneId | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const [failedMapSources, setFailedMapSources] = useState<Record<string, boolean>>({});
  const operationalException = state.operationalException ?? getOperationalException(state.scene);
  const spatialUncertainty = operationalException?.spatialUncertainty ?? null;

  const spatialHoverZoneId =
    spatialHover?.type === "zone"
      ? spatialHover.id
      : spatialHover?.type === "drone"
        ? state.drones.find((drone) => drone.id === spatialHover.id)?.zoneId ?? null
        : spatialHover?.type === "team"
          ? state.groundTeams.find((team) => team.id === spatialHover.id)?.linkedZoneId ?? null
          : spatialHover?.type === "anomaly"
            ? ANOMALY.zoneId
            : null;

  const uncertaintyLabelPosition = spatialUncertainty
    ? (() => {
        const affectedZones = spatialUncertainty.affectedZoneIds
          .map((zoneId) => ZONE_BY_ID.get(zoneId))
          .filter((zone): zone is NonNullable<typeof zone> => Boolean(zone));
        const anchor = affectedZones.length
          ? {
              x: affectedZones.reduce((sum, zone) => sum + zone.center.x, 0) / affectedZones.length,
              y: affectedZones.reduce((sum, zone) => sum + zone.center.y, 0) / affectedZones.length,
            }
          : { x: ANOMALY.x, y: ANOMALY.y };
        return {
          x: Math.min(1088, Math.max(352, sx(anchor.x))),
          y: Math.min(716, Math.max(116, sy(anchor.y))),
        };
      })()
    : null;

  // ── Drag and Drop State & Handlers ─────────────────────────────────────────
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [settlingEntity, setSettlingEntity] = useState<SettlingEntity | null>(null);
  const dragRef = useRef<DragPreview | null>(null);
  const captureTargetRef = useRef<SVGGElement | null>(null);
  const settleFrameRef = useRef<number[]>([]);
  const settleTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef<string | null>(null);
  const suppressClickTimerRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Self-contained appendLog helper for manual overrides inside MapCanvas context
  const appendLog = (
    draft: any,
    actor: "AI" | "TALON" | "Operator" | "System",
    type: string,
    text: string,
    severity: "danger" | "caution" | "info" | "safe",
  ) => {
    const nextId = `log-manual-${Date.now()}`;
    let timestamp = "03:48:55";
    if (draft.activityLog && draft.activityLog.length > 0) {
      const latest = draft.activityLog[0].ts;
      const parts = latest.split(":").map(Number);
      if (parts.length === 3) {
        let s = parts[0] * 3600 + parts[1] * 60 + parts[2] + 5;
        const h = Math.floor(s / 3600) % 24;
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        timestamp = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
      }
    }
    draft.activityLog = [
      {
        id: nextId,
        ts: timestamp,
        actor,
        type,
        text,
        severity,
      },
      ...draft.activityLog,
    ];
  };

  const cancelSettlingSchedule = () => {
    settleFrameRef.current.forEach((frame) => cancelAnimationFrame(frame));
    settleFrameRef.current = [];
    if (settleTimerRef.current != null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cancelSettlingSchedule();
      if (suppressClickTimerRef.current != null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
    };
  }, []);

  const pointerToFigma = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: Math.max(0, Math.min(1691, ((clientX - rect.left) / rect.width) * 1691)),
      y: Math.max(0, Math.min(914, ((clientY - rect.top) / rect.height) * 914)),
    };
  };

  const beginPointerDrag = (
    type: DraggableEntityType,
    id: string,
    x: number,
    y: number,
  ) => (event: React.PointerEvent<SVGGElement>) => {
    if (event.button !== 0 || !onUpdateState) return;
    event.stopPropagation();
    cancelSettlingSchedule();
    setSettlingEntity(null);
    event.currentTarget.setPointerCapture(event.pointerId);
    captureTargetRef.current = event.currentTarget;
    const next: DragPreview = {
      type,
      id,
      pointerId: event.pointerId,
      startX: x,
      startY: y,
      x,
      y,
      moved: false,
    };
    dragRef.current = next;
    setDragPreview(next);
  };

  const releasePointerCapture = (drag: DragPreview) => {
    const target = captureTargetRef.current;
    if (target?.hasPointerCapture(drag.pointerId)) {
      target.releasePointerCapture(drag.pointerId);
    }
    captureTargetRef.current = null;
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = pointerToFigma(event.clientX, event.clientY);
    if (!point) return;
    event.preventDefault();
    const next = {
      ...drag,
      x: point.x,
      y: point.y,
      moved: drag.moved || Math.hypot(point.x - drag.startX, point.y - drag.startY) > 4,
    };
    dragRef.current = next;
    setDragPreview(next);
  };

  const nearestZoneId = (x: number, y: number) => {
    let closest = ZONES[0]?.id;
    let minDistance = Number.POSITIVE_INFINITY;
    for (const zone of ZONES) {
      const distance = Math.hypot(x - zone.center.x, y - zone.center.y);
      if (distance < minDistance) {
        minDistance = distance;
        closest = zone.id;
      }
    }
    return closest;
  };

  const showSettlingTransition = (
    drag: DragPreview,
    anchor: ReturnType<typeof nearestOperationalAnchor>,
  ) => {
    if (!anchor || reducedMotion) {
      setSettlingEntity(null);
      return;
    }
    cancelSettlingSchedule();
    setSettlingEntity({
      type: drag.type,
      id: drag.id,
      fromX: drag.x,
      fromY: drag.y,
      toX: anchor.x,
      toY: anchor.y,
      anchorLabel: anchor.label,
      started: false,
    });
    const firstFrame = requestAnimationFrame(() => {
      const secondFrame = requestAnimationFrame(() => {
        setSettlingEntity((current) => current?.id === drag.id ? { ...current, started: true } : current);
      });
      settleFrameRef.current.push(secondFrame);
    });
    settleFrameRef.current.push(firstFrame);
    settleTimerRef.current = window.setTimeout(() => {
      setSettlingEntity((current) => current?.id === drag.id ? null : current);
      settleTimerRef.current = null;
    }, 280);
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    releasePointerCapture(drag);
    dragRef.current = null;
    setDragPreview(null);

    if (!drag.moved || !onUpdateState) return;
    const anchor = nearestOperationalAnchor(drag.x, drag.y, drag.type);
    if (!anchor) return;

    suppressClickRef.current = `${drag.type}:${drag.id}`;
    if (suppressClickTimerRef.current != null) {
      window.clearTimeout(suppressClickTimerRef.current);
    }
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = null;
      suppressClickTimerRef.current = null;
    }, 0);

    showSettlingTransition(drag, anchor);
    onUpdateState((draft) => {
      const closestZoneId = nearestZoneId(anchor.x, anchor.y);
      if (drag.type === "drone") {
        const drone = draft.drones.find((item: any) => item.id === drag.id);
        const droneName = drone?.name ?? drag.id.toUpperCase();
        if (drone) {
          drone.x = anchor.x;
          drone.y = anchor.y;
          drone.zoneId = closestZoneId;
        }
        appendLog(
          draft,
          "Operator",
          "Override",
          `Operator repositioned Drone ${droneName}. TALON snapped it to ${anchor.label} and is recomputing the authorized flight path.`,
          "caution",
        );
      } else {
        const team = draft.groundTeams.find((item: any) => item.id === drag.id);
        const teamName = team?.name ?? drag.id.toUpperCase();
        if (team) {
          team.x = anchor.x;
          team.y = anchor.y;
          team.linkedZoneId = closestZoneId;
        }
        appendLog(
          draft,
          "Operator",
          "Override",
          `Operator repositioned Ground Team ${teamName}. TALON snapped it to ${anchor.label} and is recomputing ingress guidance.`,
          "caution",
        );
      }

      if (state.mode === "contain") {
        draft.scene = "contain-alternate";
        draft.overrideReason = "Operator judgment / visual confirmation";
      }
    });
  };

  const handlePointerCancel = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    releasePointerCapture(drag);
    dragRef.current = null;
    setDragPreview(null);
  };

  const consumeSuppressedClick = (type: DraggableEntityType, id: string) => {
    const key = `${type}:${id}`;
    if (suppressClickRef.current !== key) return false;
    suppressClickRef.current = null;
    return true;
  };

  const getDisplayPosition = (
    type: DraggableEntityType,
    id: string,
    x: number,
    y: number,
  ) => {
    if (dragPreview?.type === type && dragPreview.id === id) {
      return { x: dragPreview.x, y: dragPreview.y, settling: false };
    }
    if (settlingEntity?.type === type && settlingEntity.id === id) {
      return {
        x: settlingEntity.started ? settlingEntity.toX : settlingEntity.fromX,
        y: settlingEntity.started ? settlingEntity.toY : settlingEntity.fromY,
        settling: true,
      };
    }
    return { x, y, settling: false };
  };

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
    // Contested watch is pre-incident by operator decision, not by evidence.
    state.scene === "monitoring-contested";
  const activeMapSrc = isPreVerify ? mapPreIncident : mapImageSrc;
  const activeImageFailed = Boolean(failedMapSources[activeMapSrc]);
  const projectionLabel = isPreVerify ? "SATELLITE WATCH" : "TALON RECONSTRUCTION";
  const projectionDescription = isPreVerify
    ? "Conceptual satellite context"
    : "Conceptual LiDAR and thermal fusion";
  const mapFilter = (showContain || showRescue)
    ? "saturate(0.96) brightness(0.84)"
    : isPreVerify
      ? "saturate(0.6) brightness(0.6) hue-rotate(180deg)"
      : "saturate(0.92) brightness(0.74)";

  const showInvestigationPath = INVESTIGATION_SCENES.has(state.scene);

  // Zones are only interactive in contain/rescue modes
  const zonesInteractive = showContain || showRescue;

  const hasMission = (mission: DroneMissionType) =>
    state.drones.some((d) => d.assignedMission === mission);

  // ── PROGRESSIVE REVEAL — each element gated by the action that triggers it ─
  // Coverage drones deployed → fire spread boundary + forest zone label appear
  const showFireSpreadBoundary =
    state.scene === "authority-notification-ready" ||
    hasMission("survey-zone") ||
    hasMission("perimeter-monitor") ||
    showRescue;

  // Residential zones appear only after evac staging or teams notified
  const showResidentialZones =
    hasMission("prepare-residential-evacuation") ||
    state.teamsNotified ||
    state.emergencyEvacuationActive ||
    showRescue;

  // Evacuation route lines: only after emergency-evacuate modal confirmed
  const showEvacuationRoutes =
    state.emergencyEvacuationActive ||
    state.residentialRouteActive;

  // Responder route: after deploy-navigation-drone action fires
  const showResponderRoute =
    state.responderRouteActive ||
    hasMission("guide-emergency-personnel");

  // Active field assets remain spatially present even if a scene is deep-linked.
  const showTeams = (showContain || showRescue) && (
    state.teamsNotified ||
    state.groundTeams.some((team) => team.availability !== "available")
  );

  const showContainDegraded = showContain && state.scene === "contain-degraded";

  // Continuous FX only run when they communicate the current operational task.
  const showFireFX = showIncident && !isPreVerify && (showContain || showRescue);
  const showScan = !reducedMotion && !coreMode && state.scene === "verify-active";

  // ── Zone opacity/filter for interactive hover/selection ──────────────────
  const selectedZoneId = state.selectedEntity?.type === "zone"
    ? state.selectedEntity.id
    : null;
  const isZoneTransient = useCallback((id: MapZoneId) => (
    hoveredZone === id || spatialHoverZoneId === id
  ), [hoveredZone, spatialHoverZoneId]);
  const getZoneOpacity = useCallback((id: MapZoneId) => {
    if (!zonesInteractive) return isZoneTransient(id) ? 1 : 0.85;
    if (selectedZoneId) return selectedZoneId === id || isZoneTransient(id) ? 1 : 0.42;
    if (isZoneTransient(id)) return 1;
    return 0.85;
  }, [zonesInteractive, isZoneTransient, selectedZoneId]);

  const getZoneFilter = useCallback((id: MapZoneId) => {
    if (!zonesInteractive) return isZoneTransient(id) ? "url(#glow-subtle)" : "none";
    if (selectedZoneId === id) return "url(#glow-subtle)";
    if (isZoneTransient(id)) return "url(#glow-subtle)";
    return "none";
  }, [zonesInteractive, isZoneTransient, selectedZoneId]);

  const getZoneStrokeWidth = (id: MapZoneId, base: number) => {
    if (selectedZoneId === id) return base + 1.8;
    if (isZoneTransient(id)) return base + 0.9;
    return base;
  };
  const getZoneStrokeOpacity = (id: MapZoneId, base: number) => {
    if (selectedZoneId === id) return 1;
    if (isZoneTransient(id)) return 0.86;
    return base;
  };
  const isZoneEmphasized = (id: MapZoneId) =>
    selectedZoneId === id || isZoneTransient(id);
  const handleZoneEnter = (id: MapZoneId) => () => {
    if (!zonesInteractive) return;
    setHoveredZone(id);
    onSpatialHoverChange?.({ type: "zone", id });
  };
  const handleZoneLeave = (
    event: React.MouseEvent<SVGGElement> | React.FocusEvent<SVGGElement>,
  ) => {
    if (event.type === "mouseleave" && document.activeElement === event.currentTarget) return;
    setHoveredZone(null);
    onSpatialHoverChange?.(null);
  };
  const selectZone = (id: MapZoneId) => {
    if (!zonesInteractive) return;
    onSelectEntity(selectedZoneId === id ? null : { type: "zone", id });
  };
  const handleZoneClick = (id: MapZoneId) => (e: React.MouseEvent) => {
    e.stopPropagation();
    selectZone(id);
  };
  const handleZoneKeyDown = (id: MapZoneId) => (event: React.KeyboardEvent<SVGGElement>) => {
    handleKeyboardActivation(event, () => selectZone(id));
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
      {/* ══ LAYER 0 — Procedural vector environment map ═════════════════════ */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.85 }}>
        <MapBackground />
      </div>

      {/* ══ LAYER 1 — Background image ════════════════════════════════════════ */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", userSelect: "none" }}>
        <img
          src={mapPreIncident}
          alt="Conceptual satellite watch map"
          draggable={false}
          onError={() => setFailedMapSources((current) => ({ ...current, [mapPreIncident]: true }))}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "50% 44%",
            transition: reducedMotion ? undefined : `opacity ${motion.deliberate}`,
            opacity: failedMapSources[mapPreIncident]
              ? 0
              : state.scene === "network-degraded"
                ? 0.04
                : isPreVerify ? 0.95 : 0,
            filter: mapFilter,
          }}
        />
        <img
          src={mapImageSrc}
          alt="Conceptual TALON reconstruction map"
          draggable={false}
          onError={() => setFailedMapSources((current) => ({ ...current, [mapImageSrc]: true }))}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "50% 44%",
            transition: reducedMotion ? undefined : `opacity ${motion.deliberate}`,
            opacity: failedMapSources[mapImageSrc]
              ? 0
              : state.scene === "network-degraded"
                ? 0.04
                : isPreVerify ? 0 : 0.95,
            filter: mapFilter,
          }}
        />
        {activeImageFailed ? (
          <div
            role="img"
            aria-label={`${projectionLabel.toLowerCase()} image unavailable; vector map remains active`}
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "radial-gradient(circle at 50% 42%, rgba(0,200,255,0.08), transparent 34%), #050A12",
            }}
          >
            <div style={{
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              background: "rgba(7,16,25,0.88)",
              color: T.textSecondary,
              fontFamily: font.sans,
              fontSize: 12,
              textAlign: "center",
            }}>
              <strong style={{ color: T.textPrimary }}>Conceptual map image unavailable</strong>
              <div style={{ marginTop: 3 }}>Vector overlays and entity controls remain active.</div>
            </div>
          </div>
        ) : null}
        {/* Radial vignette overlay — balanced for map clarity and panel separation */}
        <div style={{
          position: "absolute", inset: 0,
          background:
            "radial-gradient(ellipse 150% 85% at 50% 46%," +
            "rgba(10,15,26,0) 0%,rgba(5,10,18,0.12) 50%,rgba(2,4,10,0.48) 100%)",
        }} />
        {/* Vertical vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background:
            "linear-gradient(180deg," +
            "rgba(5,10,18,0.32) 0%,rgba(5,10,18,0) 25%," +
            "rgba(5,10,18,0) 65%,rgba(4,8,14,0.45) 100%)",
        }} />
      </div>

      <div
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          zIndex: 4,
          top: 70,
          left: "50%",
          transform: "translateX(-50%)",
          minWidth: 190,
          padding: "6px 10px",
          borderRadius: radius.control,
          border: `1px solid ${isPreVerify ? "rgba(0,200,255,0.28)" : "rgba(45,212,160,0.3)"}`,
          background: "rgba(5,10,18,0.84)",
          color: isPreVerify ? T.cyan : T.teal,
          fontFamily: font.mono,
          fontSize: 10.5,
          fontWeight: 700,
          lineHeight: 1.35,
          textAlign: "center",
          pointerEvents: "none",
          transition: reducedMotion ? undefined : `color ${motion.normal}, border-color ${motion.normal}`,
        }}
      >
        <div>{projectionLabel}</div>
        <div style={{ color: T.textSecondary, fontFamily: font.sans, fontSize: 11, fontWeight: 500 }}>
          {projectionDescription}
        </div>
      </div>

      {state.scene === "network-degraded" && (
        <div style={{
          position: "absolute",
          top: 20,
          left: 20,
          right: 20,
          background: "rgba(229, 83, 60, 0.15)",
          border: `1px solid ${T.red}`,
          borderRadius: 8,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          zIndex: 60,
          backdropFilter: "blur(8px)",
        }}>
          <OperationalIcon name="warning" color={T.red} size={16} />
          <div>
            <div style={{ fontFamily: font.mono, fontSize: 11, fontWeight: 700, color: T.red, letterSpacing: "0.08em" }}>
              LIVE HD VIDEO OFFLINE — CELL FAILBACK ACTIVE
            </div>
            <div style={{ fontFamily: font.sans, fontSize: 11, color: T.textSecondary, marginTop: 2 }}>
              High network latency (340ms) detected. Satellite and live camera streams suspended. Displaying lightweight spatial LiDAR vector outlines.
            </div>
          </div>
        </div>
      )}

      {/* ══ LAYER 2 — Zone + route SVG overlay ════════════════════════════════ */}
      <svg
        ref={svgRef}
        style={{ position: "absolute", zIndex: 1, inset: 0, width: "100%", height: "100%", touchAction: "none" }}
        viewBox="0 0 1440 900"
        xmlns="http://www.w3.org/2000/svg"
        overflow="hidden"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
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
          <RouteArrowDefs />
          <radialGradient id="fireGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF6B4A" stopOpacity="0.5" />
            <stop offset="55%" stopColor="#E5533C" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#E5533C" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00C8FF" stopOpacity="0" />
            <stop offset="100%" stopColor="#00C8FF" stopOpacity="0.16" />
          </linearGradient>
        </defs>

        {/* ── LiDAR scan-sweep — live reconstruction pass (vision map only) ──── */}
        {showScan && <LidarScanSweep />}

        {/* Evidence uncertainty is a safety envelope, not a projected spread ring. */}
        {spatialUncertainty && uncertaintyLabelPosition ? (
          <g
            role="img"
            aria-label={`Evidence uncertainty envelope, plus ${spatialUncertainty.marginMeters} meters across ${spatialUncertainty.affectedZoneIds.length} affected zones. ${spatialUncertainty.basis} Observed ${spatialUncertainty.observedAt}.`}
            data-testid="spatial-uncertainty-envelope"
            pointerEvents="none"
            opacity={coreMode ? 0.78 : 1}
          >
            <title>{spatialUncertainty.basis}</title>
            {spatialUncertainty.affectedZoneIds.map((zoneId) => {
              const zone = ZONE_BY_ID.get(zoneId);
              if (!zone) return null;
              const envelopeWidth = Math.max(10, Math.min(26, spatialUncertainty.marginMeters / 10));
              return (
                <g key={zoneId} data-zone-id={zoneId}>
                  <polygon
                    points={zone.polygon}
                    transform={`scale(${SX} ${SY})`}
                    fill={T.amber}
                    fillOpacity={0.035}
                    stroke={T.amber}
                    strokeOpacity={0.2}
                    strokeWidth={envelopeWidth}
                    strokeLinejoin="round"
                  />
                  <polygon
                    points={zone.polygon}
                    transform={`scale(${SX} ${SY})`}
                    fill="none"
                    stroke={T.amber}
                    strokeOpacity={0.92}
                    strokeWidth={2.2}
                    strokeDasharray="2 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
            <g transform={`translate(${uncertaintyLabelPosition.x} ${uncertaintyLabelPosition.y})`}>
              <rect
                x={-90}
                y={-13}
                width={180}
                height={26}
                rx={5}
                fill="#071019"
                fillOpacity={0.94}
                stroke={T.amber}
                strokeOpacity={0.82}
              />
              <text
                x={0}
                y={1}
                dominantBaseline="middle"
                textAnchor="middle"
                fill={T.amber}
                fontSize={10.5}
                fontFamily={font.mono}
                fontWeight={700}
              >
                EVIDENCE ENVELOPE · +{spatialUncertainty.marginMeters} M
              </text>
            </g>
          </g>
        ) : null}

        {/* Shared rail/map hover linkage stays separate from committed selection. */}
        {spatialHoverZoneId && ZONE_BY_ID.get(spatialHoverZoneId) ? (
          <g
            data-testid="map-transient-zone-link"
            data-zone-id={spatialHoverZoneId}
            pointerEvents="none"
          >
            <polygon
              points={ZONE_BY_ID.get(spatialHoverZoneId)!.polygon}
              transform={`scale(${SX} ${SY})`}
              fill={T.cyan}
              fillOpacity={0.035}
              stroke={T.cyan}
              strokeOpacity={0.94}
              strokeWidth={2.4}
              strokeDasharray="5 4"
              strokeLinejoin="round"
            />
          </g>
        ) : null}

        {/* ── Western buffer — large transparent interior keeps the whole zone selectable */}
        <g
          role="button"
          tabIndex={zonesInteractive ? 0 : -1}
          aria-disabled={!zonesInteractive}
          aria-pressed={selectedZoneId === MAP_ZONE_IDS.bufferWest}
          aria-label={`${ZONE_BY_ID.get(MAP_ZONE_IDS.bufferWest)!.label}. Select zone.`}
          data-testid={`map-zone-${MAP_ZONE_IDS.bufferWest}`}
          style={{
            cursor: zonesInteractive ? "pointer" : "default",
            opacity: getZoneOpacity(MAP_ZONE_IDS.bufferWest),
            transition: `opacity ${motion.normal}`,
          }}
          filter={getZoneFilter(MAP_ZONE_IDS.bufferWest)}
          onMouseEnter={handleZoneEnter(MAP_ZONE_IDS.bufferWest)}
          onMouseLeave={handleZoneLeave}
          onFocus={handleZoneEnter(MAP_ZONE_IDS.bufferWest)}
          onBlur={handleZoneLeave}
          onKeyDown={handleZoneKeyDown(MAP_ZONE_IDS.bufferWest)}
          onClick={handleZoneClick(MAP_ZONE_IDS.bufferWest)}
        >
          <polygon
            points={ZONE_BY_ID.get(MAP_ZONE_IDS.bufferWest)!.polygon}
            transform={`scale(${SX} ${SY})`}
            fill="transparent"
            stroke="transparent"
            strokeWidth={12}
            pointerEvents={zonesInteractive ? "all" : "none"}
          />
          <svg x={sx(-0.56)} y={sy(93.5)} width={sx(618.557)} height={sy(330.459)}
            viewBox="0 0 620.186 332.099" overflow="visible">
            <path d={svgPaths.p5fe3700} fill="none" stroke="#00C8FF"
              strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round"
              strokeOpacity={getZoneStrokeOpacity(MAP_ZONE_IDS.bufferWest, 0.45)}
              strokeWidth={getZoneStrokeWidth(MAP_ZONE_IDS.bufferWest, 1.64)} />
          </svg>
          {isZoneEmphasized(MAP_ZONE_IDS.bufferWest) ? (
            <ZoneBadge x={sx(188)} y={sy(150)} w={sx(132)} h={sy(28)}
              text="BUFFER ZONE 2" textColor={T.cyan} borderColor={T.cyan} />
          ) : null}
        </g>

        {/* ── Eastern buffer — formerly a disconnected visual-only ForestZone */}
        <g
          role="button"
          tabIndex={zonesInteractive ? 0 : -1}
          aria-disabled={!zonesInteractive}
          aria-pressed={selectedZoneId === MAP_ZONE_IDS.bufferEast}
          aria-label={`${ZONE_BY_ID.get(MAP_ZONE_IDS.bufferEast)!.label}. Select zone.`}
          data-testid={`map-zone-${MAP_ZONE_IDS.bufferEast}`}
          style={{
            cursor: zonesInteractive ? "pointer" : "default",
            opacity: getZoneOpacity(MAP_ZONE_IDS.bufferEast),
            transition: `opacity ${motion.normal}`,
          }}
          filter={getZoneFilter(MAP_ZONE_IDS.bufferEast)}
          onMouseEnter={handleZoneEnter(MAP_ZONE_IDS.bufferEast)}
          onMouseLeave={handleZoneLeave}
          onFocus={handleZoneEnter(MAP_ZONE_IDS.bufferEast)}
          onBlur={handleZoneLeave}
          onKeyDown={handleZoneKeyDown(MAP_ZONE_IDS.bufferEast)}
          onClick={handleZoneClick(MAP_ZONE_IDS.bufferEast)}
        >
          <polygon
            points={ZONE_BY_ID.get(MAP_ZONE_IDS.bufferEast)!.polygon}
            transform={`scale(${SX} ${SY})`}
            fill="transparent"
            stroke="transparent"
            strokeWidth={12}
            pointerEvents={zonesInteractive ? "all" : "none"}
          />
          <svg x={sx(1283)} y={sy(131)} width={sx(404.5)} height={sy(443)}
            viewBox="0 0 406.18 444.824" overflow="visible">
            <path d={svgPaths.p1cd2c800} fill="none" stroke="#00C8FF"
              strokeDasharray="3 3"
              strokeOpacity={getZoneStrokeOpacity(MAP_ZONE_IDS.bufferEast, 0.45)}
              strokeWidth={getZoneStrokeWidth(MAP_ZONE_IDS.bufferEast, 1.64)} />
          </svg>
          {isZoneEmphasized(MAP_ZONE_IDS.bufferEast) ? (
            <ZoneBadge x={sx(1430)} y={sy(178)} w={sx(132)} h={sy(28)}
              text="BUFFER ZONE 1" textColor={T.cyan} borderColor={T.cyan} />
          ) : null}
        </g>

        {/* ── Residential zones — each visual resolves to its real shared zone ID */}
        {showResidentialZones && (
          <>
            {/* Residential Zone 2 (left) */}
            <g
              role="button"
              tabIndex={zonesInteractive ? 0 : -1}
              aria-disabled={!zonesInteractive}
              aria-pressed={selectedZoneId === MAP_ZONE_IDS.residentialWest}
              aria-label={`${ZONE_BY_ID.get(MAP_ZONE_IDS.residentialWest)!.label}. Select zone.`}
              data-testid={`map-zone-${MAP_ZONE_IDS.residentialWest}`}
              style={{
                cursor: zonesInteractive ? "pointer" : "default",
                opacity: getZoneOpacity(MAP_ZONE_IDS.residentialWest),
                transition: `opacity ${motion.normal}`,
              }}
              filter={getZoneFilter(MAP_ZONE_IDS.residentialWest)}
              onMouseEnter={handleZoneEnter(MAP_ZONE_IDS.residentialWest)}
              onMouseLeave={handleZoneLeave}
              onFocus={handleZoneEnter(MAP_ZONE_IDS.residentialWest)}
              onBlur={handleZoneLeave}
              onKeyDown={handleZoneKeyDown(MAP_ZONE_IDS.residentialWest)}
              onClick={handleZoneClick(MAP_ZONE_IDS.residentialWest)}
            >
              <polygon
                points={ZONE_BY_ID.get(MAP_ZONE_IDS.residentialWest)!.polygon}
                transform={`scale(${SX} ${SY})`}
                fill="transparent"
                pointerEvents={zonesInteractive ? "all" : "none"}
              />
              <svg x={sx(5)} y={sy(410)} width={sx(883)} height={sy(518)}
                viewBox="0 0 891.741 525.58" overflow="visible">
                <g filter="url(#res2-blur)">
                  <path d={svgPaths.p2d098e80} fill="#E5533C" fillOpacity={0.05} />
                  <path
                    d={svgPaths.p2d098e80}
                    stroke="#E5533C"
                    strokeDasharray="4.7 4.7"
                    strokeWidth={getZoneStrokeWidth(MAP_ZONE_IDS.residentialWest, 2.35)}
                    strokeOpacity={getZoneStrokeOpacity(MAP_ZONE_IDS.residentialWest, 0.78)}
                    fill="none"
                  />
                </g>
              </svg>
              <ZoneBadge x={sx(267)} y={sy(662)} w={RES_LW} h={RES_LH}
                text="RESIDENTIAL ZONE 2" textColor="#E5533C" borderColor="#E5533C" pill />
            </g>
            {/* Residential Zone 1 (bottom-right) */}
            <g
              role="button"
              tabIndex={zonesInteractive ? 0 : -1}
              aria-disabled={!zonesInteractive}
              aria-pressed={selectedZoneId === MAP_ZONE_IDS.residentialSouth}
              aria-label={`${ZONE_BY_ID.get(MAP_ZONE_IDS.residentialSouth)!.label}. Select zone.`}
              data-testid={`map-zone-${MAP_ZONE_IDS.residentialSouth}`}
              style={{
                cursor: zonesInteractive ? "pointer" : "default",
                opacity: getZoneOpacity(MAP_ZONE_IDS.residentialSouth),
                transition: `opacity ${motion.normal}`,
              }}
              filter={getZoneFilter(MAP_ZONE_IDS.residentialSouth)}
              onMouseEnter={handleZoneEnter(MAP_ZONE_IDS.residentialSouth)}
              onMouseLeave={handleZoneLeave}
              onFocus={handleZoneEnter(MAP_ZONE_IDS.residentialSouth)}
              onBlur={handleZoneLeave}
              onKeyDown={handleZoneKeyDown(MAP_ZONE_IDS.residentialSouth)}
              onClick={handleZoneClick(MAP_ZONE_IDS.residentialSouth)}
            >
              <polygon
                points={ZONE_BY_ID.get(MAP_ZONE_IDS.residentialSouth)!.polygon}
                transform={`scale(${SX} ${SY})`}
                fill="transparent"
                pointerEvents={zonesInteractive ? "all" : "none"}
              />
              <svg x={sx(540)} y={sy(581)} width={sx(1057.5)} height={sy(335.5)}
                viewBox="0 0 1061.3 337.93" overflow="visible">
                <g opacity={0.74}>
                  <g filter="url(#res1-inner)">
                    <path d={svgPaths.p33509870} fill="#E5533C" fillOpacity={0.05} />
                  </g>
                  <path
                    d={svgPaths.p33509870}
                    stroke="#E5533C"
                    strokeDasharray="4.7 4.7"
                    strokeWidth={getZoneStrokeWidth(MAP_ZONE_IDS.residentialSouth, 2.35)}
                    strokeOpacity={getZoneStrokeOpacity(MAP_ZONE_IDS.residentialSouth, 0.78)}
                    fill="none"
                  />
                </g>
              </svg>
              <ZoneBadge x={sx(974)} y={sy(748)} w={RES_LW} h={RES_LH}
                text="RESIDENTIAL ZONE 1" textColor="#E5533C" borderColor="#E5533C" pill />
            </g>
          </>
        )}

        {/* ── Fire spread estimate is visual context; forest selection lives below */}
        {showFireSpreadBoundary && (
          <g
            pointerEvents="none"
            style={{
              opacity: getZoneOpacity(MAP_ZONE_IDS.forest),
              transition: `opacity ${motion.normal}`,
            }}
            filter={getZoneFilter(MAP_ZONE_IDS.forest)}
          >
            <svg x={sx(563.44)} y={sy(69.17)} width={sx(838.556)} height={sy(586.333)}
              viewBox="0 0 841.53 589.333" overflow="visible">
              <path d={svgPaths.p1073c400} fill="#FF6B4A" fillOpacity={0.07}
                stroke="#FF6B4A" strokeDasharray="5 5" strokeLinecap="round"
                strokeLinejoin="bevel" strokeMiterlimit={16}
                strokeWidth={getZoneStrokeWidth(MAP_ZONE_IDS.forest, 3)}
                strokeOpacity={getZoneStrokeOpacity(MAP_ZONE_IDS.forest, 0.78)} />
            </svg>
            <ZoneBadge x={sx(697)} y={sy(195)} w={FF_LW} h={FF_LH}
              text="FOREST ZONE" textColor="#F5A623" borderColor="#F5A623" />
          </g>
        )}

        {/* ── FireZone_Main (inner fire polygon + FIRE SPREAD label) — incident only */}
        {showIncident && (
          <g
            role="button"
            tabIndex={zonesInteractive ? 0 : -1}
            aria-disabled={!zonesInteractive}
            aria-pressed={selectedZoneId === MAP_ZONE_IDS.forest}
            aria-label={`${ZONE_BY_ID.get(MAP_ZONE_IDS.forest)!.label}. Select zone.`}
            data-testid={`map-zone-${MAP_ZONE_IDS.forest}`}
            style={{
              cursor: zonesInteractive ? "pointer" : "default",
              opacity: getZoneOpacity(MAP_ZONE_IDS.forest),
              transition: `opacity ${motion.normal}`,
            }}
            filter={getZoneFilter(MAP_ZONE_IDS.forest)}
            onMouseEnter={handleZoneEnter(MAP_ZONE_IDS.forest)}
            onMouseLeave={handleZoneLeave}
            onFocus={handleZoneEnter(MAP_ZONE_IDS.forest)}
            onBlur={handleZoneLeave}
            onKeyDown={handleZoneKeyDown(MAP_ZONE_IDS.forest)}
            onClick={handleZoneClick(MAP_ZONE_IDS.forest)}
          >
            <polygon
              points={ZONE_BY_ID.get(MAP_ZONE_IDS.forest)!.polygon}
              transform={`scale(${SX} ${SY})`}
              fill="transparent"
              stroke="transparent"
              strokeWidth={12}
              pointerEvents={zonesInteractive ? "all" : "none"}
            />
            <svg x={sx(690)} y={sy(159.5)} width={sx(657.299)} height={sy(416.5)}
              viewBox="0 0 658.98 417.373" overflow="visible">
              <path d={svgPaths.p20187b00} fill="#F5A623" fillOpacity={0.05} />
              <path
                d={svgPaths.p101b3000}
                fill="#FF6B4A"
                stroke={selectedZoneId === MAP_ZONE_IDS.forest ? T.textPrimary : T.fire}
                strokeWidth={getZoneStrokeWidth(MAP_ZONE_IDS.forest, 1)}
              />
            </svg>
            {showFireSpreadBoundary && (
              <ZoneBadge x={sx(982)} y={sy(283)} w={FF_LW} h={FF_LH}
                text="FIRE SPREAD EST." textColor="#E5533C" borderColor="#E5533C" />
            )}
          </g>
        )}

        {/* ── Living fire — pulsing glow + rising embers at the ignition point */}
        {showFireFX && (
          <LiveFireFX
            cx={sx(ANOMALY.x)}
            cy={sy(ANOMALY.y)}
            animate={!reducedMotion}
          />
        )}

        {/* ── Anomaly dot (thermal spike) — shown once incident is surfaced */}
        {showIncident && (
          <AnomalyMarker
            selected={state.selectedEntity?.type === "anomaly"}
            hovered={hoveredMarker === ANOMALY.id || spatialHover?.type === "anomaly"}
            onEnter={() => {
              setHoveredMarker(ANOMALY.id);
              onSpatialHoverChange?.({ type: "anomaly", id: ANOMALY.id });
            }}
            onLeave={() => {
              setHoveredMarker(null);
              onSpatialHoverChange?.(null);
            }}
            onKeySelect={() => onSelectEntity({ type: "anomaly", id: ANOMALY.id })}
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
              style={{
                animation: !reducedMotion && state.scene === "investigation-pending"
                  ? "pulse 2s infinite"
                  : undefined,
              }}
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
              fontSize={10.5}
              fontFamily={font.mono}
              letterSpacing="0.06em"
            >
              UNVERIFIED · GRID 4C
            </text>
          </g>
        )}

        {/* ── Investigation path — the scout's link to the anomaly it's verifying */}
        {showInvestigationPath && (
          <RouteLine
            path="M 925,369 C 908,344 896,316 888,290"
            color={T.cyan}
            label="SCOUT LINK"
            variant="investigation"
            animate={!reducedMotion}
          />
        )}

        {/* ── Evacuation routes */}
        {showEvacuationRoutes && EVACUATION_ROUTES.map((route) => (
          <RouteLine
            key={route.id}
            path={route.path}
            color={route.color}
            label={route.label}
            variant="egress"
            animate={!reducedMotion}
          />
        ))}

        {/* ── Responder route */}
        {showResponderRoute && (
          <RouteLine
            path={RESPONDER_ROUTE.path}
            color={RESPONDER_ROUTE.color}
            label={RESPONDER_ROUTE.label}
            variant="ingress"
            animate={!reducedMotion}
          />
        )}

        {/* Signal-degraded TALON reroute proposal — a proposal awaiting a human
            gate, so it breathes rather than flows like approved guidance. */}
        {state.exceptionState === "signal-degraded" && (
          <RouteLine
            path="M 1380,782 C 1328,730 1260,704 1188,706"
            color={T.amber}
            label="TALON REROUTE PROPOSAL"
            variant="reroute"
            animate={!reducedMotion}
          />
        )}

        {/* ── Drone / relay markers — visibility follows asset state, not scene IDs */}
        {state.drones.map((drone) => {
          const active = state.selectedEntity?.type === "drone" && state.selectedEntity.id === drone.id;
          const hasAssignment = Boolean(drone.assignedMission);
          const hasOperationalStatus = drone.status !== "available";
          const isInvestigationAsset =
            state.mode === "verify" &&
            INVESTIGATION_SCENES.has(state.scene) &&
            (drone.assignedMission === "investigation" || drone.droneClass === "thermal-lidar");
          const isContainReserve =
            state.mode === "contain" &&
            drone.status === "available" &&
            (drone.droneClass === "surveillance" || drone.droneClass === "guidance-relay");
          const isRescueReserve =
            state.mode === "rescue" &&
            drone.status === "available" &&
            (drone.droneClass === "evacuation-guidance" || drone.droneClass === "multi-role");
          const visibleInPhase =
            active ||
            (spatialHover?.type === "drone" && spatialHover.id === drone.id) ||
            hasAssignment ||
            hasOperationalStatus ||
            isInvestigationAsset ||
            isContainReserve ||
            isRescueReserve;

          if (!visibleInPhase) return null;

          const degraded = drone.status === "signal-degraded";
          const muted = drone.status === "available" && !drone.assignedMission;
          const label = DRONE_MARKER_MAP[drone.id]?.label || drone.name.toUpperCase();
          const displayPosition = getDisplayPosition("drone", drone.id, drone.x, drone.y);

          return (
            <DroneMarker
              key={drone.id}
              cx={sx(displayPosition.x)}
              cy={sy(displayPosition.y)}
              label={label}
              entityId={drone.id}
              active={active}
              degraded={degraded}
              muted={muted}
              droneClass={drone.droneClass}
              status={drone.status}
              battery={drone.battery}
              isHovered={hoveredMarker === drone.id || (spatialHover?.type === "drone" && spatialHover.id === drone.id)}
              onEnter={() => {
                setHoveredMarker(drone.id);
                onSpatialHoverChange?.({ type: "drone", id: drone.id });
              }}
              onLeave={() => {
                setHoveredMarker(null);
                onSpatialHoverChange?.(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (consumeSuppressedClick("drone", drone.id)) return;
                onSelectEntity({ type: "drone", id: drone.id });
              }}
              onKeySelect={() => onSelectEntity({ type: "drone", id: drone.id })}
              onPointerDown={beginPointerDrag("drone", drone.id, drone.x, drone.y)}
              reducedMotion={reducedMotion}
              settling={displayPosition.settling}
            />
          );
        })}

        {/* ── Ground teams — pointer capture and shared selection match drones */}
        {(showTeams || spatialHover?.type === "team") && (["alpha", "bravo"] as const).map((teamId) => {
          const team = state.groundTeams.find((item) => item.id === teamId);
          if (!team) return null;
          const marker = TEAM_MARKERS[teamId];
          const baseX = typeof team.x === "number" ? team.x : marker.cx;
          const baseY = typeof team.y === "number" ? team.y : marker.cy;
          const displayPosition = getDisplayPosition("team", teamId, baseX, baseY);
          const selected = state.selectedEntity?.type === "team" && state.selectedEntity.id === teamId;
          const hovered =
            hoveredMarker === `team:${teamId}` ||
            (spatialHover?.type === "team" && spatialHover.id === teamId);
          const teamColor = team.availability === "deployed"
            ? T.fire
            : team.availability === "staged"
              ? T.amber
              : T.teal;
          const availabilityLabel = team.availability.toUpperCase();
          return (
            <g
              key={teamId}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${team.name}, ${team.assignment}, ${team.availability}. Select or drag to reposition.`}
              data-testid={`map-team-${teamId}`}
              pointerEvents="all"
              style={{
                cursor: "grab",
                touchAction: "none",
                transform: `translate(${sx(displayPosition.x)}px, ${sy(displayPosition.y)}px)`,
                transition: displayPosition.settling && !reducedMotion
                  ? `transform ${motion.deliberate}`
                  : undefined,
              }}
              onMouseEnter={() => {
                setHoveredMarker(`team:${teamId}`);
                onSpatialHoverChange?.({ type: "team", id: teamId });
              }}
              onMouseLeave={(event) => {
                if (document.activeElement === event.currentTarget) return;
                setHoveredMarker(null);
                onSpatialHoverChange?.(null);
              }}
              onFocus={() => {
                setHoveredMarker(`team:${teamId}`);
                onSpatialHoverChange?.({ type: "team", id: teamId });
              }}
              onBlur={() => {
                setHoveredMarker(null);
                onSpatialHoverChange?.(null);
              }}
              onKeyDown={(event) => handleKeyboardActivation(
                event,
                () => onSelectEntity({ type: "team", id: teamId }),
              )}
              onClick={(event) => {
                event.stopPropagation();
                if (consumeSuppressedClick("team", teamId)) return;
                onSelectEntity({ type: "team", id: teamId });
              }}
              onPointerDown={beginPointerDrag("team", teamId, baseX, baseY)}
            >
              <ellipse cx={sx(-10)} cy={sy(5)} rx={sx(38)} ry={sy(22)} fill="transparent" pointerEvents="all" />
              {(selected || hovered) ? (
                <ellipse
                  cx={sx(-10)}
                  cy={sy(5)}
                  rx={sx(38)}
                  ry={sy(20)}
                  fill={selected ? `${teamColor}1f` : "none"}
                  stroke={teamColor}
                  strokeWidth={selected ? 2.4 : 1.5}
                  strokeDasharray={selected ? undefined : "5 3"}
                />
              ) : null}
              <g filter="url(#unit-glow-l3)" opacity={0.94}>
                <Vehicle cx={sx(-31)} cy={sy(6)} mainColor={teamColor} dashColor={marker.dashColor} r={4.2} />
                <Vehicle cx={sx(-18)} cy={sy(0)} mainColor={teamColor} dashColor={marker.dashColor} r={4.2} />
                <Vehicle cx={sx(-24)} cy={sy(14)} mainColor={teamColor} dashColor={marker.dashColor} r={4.2} />
                <Vehicle cx={sx(0)} cy={sy(-5)} mainColor={teamColor} dashColor={marker.dashColor} r={4.8} />
              </g>
              <g pointerEvents="none">
                <rect
                  x={sx(-39)}
                  y={sy(-36)}
                  width={sx(116)}
                  height={sy(22)}
                  rx={4}
                  fill="#0A0F18"
                  fillOpacity={0.86}
                  stroke={teamColor}
                  strokeWidth={selected ? 1.4 : 0.8}
                  strokeOpacity={selected ? 0.9 : 0.45}
                />
                <text
                  x={sx(-33)}
                  y={sy(-22)}
                  fill={selected ? T.textPrimary : teamColor}
                  fontSize={10.5}
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight="bold"
                >
                  {marker.label} · {availabilityLabel}
                </text>
              </g>
            </g>
          );
        })}

        {settlingEntity ? (
          <g pointerEvents="none">
            <circle
              cx={sx(settlingEntity.toX)}
              cy={sy(settlingEntity.toY)}
              r={18}
              fill="none"
              stroke={T.teal}
              strokeWidth={1.6}
              strokeDasharray="4 3"
            />
            <rect
              x={sx(settlingEntity.toX) + 22}
              y={sy(settlingEntity.toY) - 13}
              width={Math.min(220, settlingEntity.anchorLabel.length * 6.4 + 72)}
              height={26}
              rx={5}
              fill="#071019"
              fillOpacity={0.94}
              stroke={T.teal}
              strokeOpacity={0.55}
            />
            <text
              x={sx(settlingEntity.toX) + 30}
              y={sy(settlingEntity.toY) + 4}
              fill={T.teal}
              fontSize={10.5}
              fontFamily={font.mono}
              fontWeight={700}
            >
              SNAPPED · {settlingEntity.anchorLabel}
            </text>
          </g>
        ) : null}
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
  spatialHover,
  onSpatialHoverChange,
  reducedMotion,
}: {
  state: ShellState;
  onSelectEntity: (selection: ShellState["selectedEntity"]) => void;
  spatialHover?: SelectedEntity;
  onSpatialHoverChange?: (target: SelectedEntity) => void;
  reducedMotion: boolean;
}) {
  const sortedDrones = [...state.drones].sort((a, b) => {
      const score = (d: ShellState["drones"][number]) =>
        d.status === "signal-degraded" ? 0 : d.assignedMission ? 1 : d.status === "available" ? 3 : 2;
      return score(a) - score(b);
    });
  const linkedDrone = spatialHover?.type === "drone"
    ? sortedDrones.find((drone) => drone.id === spatialHover.id)
    : null;
  const drones = linkedDrone
    ? [linkedDrone, ...sortedDrones.filter((drone) => drone.id !== linkedDrone.id)].slice(0, 4)
    : sortedDrones.slice(0, 4);

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
        const spatiallyLinked =
          (spatialHover?.type === "drone" && spatialHover.id === drone.id) ||
          (spatialHover?.type === "zone" && spatialHover.id === drone.zoneId);
        const accent = drone.status === "signal-degraded" ? T.amber : drone.status === "available" ? T.teal : T.cyan;

        let bgImage = droneThermalFeed;
        if (index === 1) bgImage = droneNvgFeed;
        if (index === 2) bgImage = droneThermalRes;
        if (index === 3) bgImage = droneLowlight;

        return (
          <button
            key={drone.id}
            type="button"
            aria-pressed={active}
            aria-label={`${drone.name}, ${drone.status}, battery ${drone.battery} percent. Select drone.`}
            data-testid={`drone-grid-tile-${drone.id}`}
            onClick={() => onSelectEntity({ type: "drone", id: drone.id })}
            onMouseEnter={() => onSpatialHoverChange?.({ type: "drone", id: drone.id })}
            onMouseLeave={(event) => {
              if (document.activeElement !== event.currentTarget) onSpatialHoverChange?.(null);
            }}
            onFocus={() => onSpatialHoverChange?.({ type: "drone", id: drone.id })}
            onBlur={() => onSpatialHoverChange?.(null)}
            style={{
              borderRadius: radius.overlay,
              border: `1px solid ${active ? `${accent}66` : spatiallyLinked ? `${T.cyan}66` : "rgba(255,255,255,0.08)"}`,
              background: spatiallyLinked ? "rgba(0,200,255,0.07)" : "rgba(8,13,22,0.78)",
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
              {state.scene === "network-degraded" ? (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(5, 8, 14, 0.96)",
                  border: "1.5px dashed rgba(229, 83, 60, 0.3)",
                  padding: 16,
                  textAlign: "center",
                }}>
                  <div style={{ marginBottom: 6 }}>
                    <OperationalIcon name="warning" color={T.red} size={20} />
                  </div>
                  <div style={{ fontFamily: font.mono, fontSize: 10, fontWeight: 700, color: T.red, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    HD VIDEO DROPPED
                  </div>
                  <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted, marginTop: 4 }}>
                    Cell Failback Mode Active (340ms Latency)
                  </div>
                </div>
              ) : (
                <img src={bgImage} alt={drone.role} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.65 }} />
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,200,255,0.1) 0%, rgba(10,18,28,0.3) 48%, rgba(5,8,14,0.95) 100%)" }} />
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 48%, transparent 100%)",
                transform: "translateX(-100%)",
                animation: !reducedMotion && (drone.status === "assigned" || drone.status === "en-route")
                  ? "gridSweep 4.2s linear infinite"
                  : undefined,
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
                <div style={{ fontFamily: font.sans, fontSize: typeScale.heading, fontWeight: 700, color: T.textPrimary, marginTop: 6 }}>
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
      fontFamily: font.sans, fontSize: typeScale.label, fontWeight: 700,
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
