import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import mapBackdrop from "../../assets/sentinel-map-overhaul.png";
import mapPreIncident from "../../assets/map-preincident.png";
import { ANOMALY, SPREAD_RINGS } from "../mockData";
import { RouteArrowDefs, RouteLine } from "../components/RouteLine";
import {
  SelectedEntity,
  ShellState,
  T,
  font,
  typeScale,
  tracking,
  radius,
  surface,
  border,
  tint,
  typeWeight,
  space,
} from "../tokens";
import { MAP_DISPLAY, fromPixel, fromScreen, toPixel, toScreen } from "./frame";
import {
  ZONE_MODELS,
  applyZoneMargin,
  envelopePolygon,
  getZoneModel,
  nearestZoneId,
} from "./zones";
import { ROAD_NETWORK, findPath, getRoadNode, nearestNodeId, nodePoint } from "./roads";
import { createTransit, transitPoint, type TransitState } from "./agents";
import { getNamedRoute, routeToSvgPath } from "./routes";
import { ZonePolygons, ZoneEnvelope, RoadDebugLayer, AnomalyMarker } from "./render/ZoneLayer";
import { DroneMarker, TeamMarker, agentStatusColor } from "./render/AgentMarkers";
import { MapLabel, toneFromColor } from "./render/MapLabel";
import type { AgentKind, MapPoint, ZoneModel } from "./types";

/** Shell may pass optional route authority before it is promoted onto ShellState. */
export type SpatialMapState = ShellState & {
  selectedEvacuationRouteId?: string | null;
};

export interface SpatialMapCanvasProps {
  state: SpatialMapState;
  onSelectEntity: (selection: ShellState["selectedEntity"]) => void;
  spatialHover?: SelectedEntity;
  onSpatialHoverChange?: (target: SelectedEntity) => void;
  mapImageSrc?: string;
  /** Shell passes ShellDraft-compatible drafts; typed as ShellState for map mutations. */
  onUpdateState?: (updater: (draft: ShellState) => void) => void;
  coreMode?: boolean;
  showRoadDebug?: boolean;
}

const INVESTIGATION_SCENES = new Set<ShellState["scene"]>([
  "investigation-pending",
  "verify-active",
  "authority-notification-ready",
]);

const LABEL_X_MIN = 320;
const LABEL_X_MAX = 1120;
const ZONE_MARGIN_STEP = 0.012;
const NATIVE_WIDTH = 1691;

type DragKind = "drone" | "team";

interface DragPreview {
  type: DragKind;
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
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

function clampLabelX(x: number): number {
  return Math.max(LABEL_X_MIN, Math.min(LABEL_X_MAX, x));
}

/*
 * The TALON command dock and its gate line own the bottom-centre of the frame.
 * An agent label that lands underneath renders *through* the authorization
 * control — which is the one place in the product that must never look
 * ambiguous. Labels in this band are suppressed; the marker, its selection
 * ring, and the inspector rail still carry the identity, so nothing is lost
 * except the collision. Coordinates are in MAP_DISPLAY space (1440×900).
 */
/*
 * Bottom-center chrome band (command plinth, voice panel, staged commands).
 * Map labels never render here — a zone plate under the authorization control
 * reads as a render bug, and the label carries no urgency the chrome doesn't.
 */
const COMMAND_DOCK_ZONE = { xMin: 300, xMax: 1140, yMin: 720 };

function collidesWithCommandDock(screen: { x: number; y: number }): boolean {
  return (
    screen.y >= COMMAND_DOCK_ZONE.yMin &&
    screen.x >= COMMAND_DOCK_ZONE.xMin &&
    screen.x <= COMMAND_DOCK_ZONE.xMax
  );
}

function teamFallbackPixel(id: string): { x: number; y: number } {
  if (id === "alpha") return { x: 530, y: 616 };
  if (id === "bravo") return { x: 950, y: 640 };
  return { x: 1180, y: 500 };
}

function appendActivityLog(
  draft: ShellState,
  actor: ShellState["activityLog"][number]["actor"],
  type: string,
  text: string,
  severity: ShellState["activityLog"][number]["severity"],
) {
  const nextId = `log-map-${Date.now()}`;
  let timestamp = new Date().toISOString().slice(11, 19);
  const latest = draft.activityLog[0]?.ts;
  if (latest) {
    const parts = latest.replace(/Z$/, "").split(":").map(Number);
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
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
      ts: `${timestamp}Z`,
      actor,
      type,
      text,
      severity,
    },
    ...draft.activityLog,
  ].slice(0, 80);
}

/**
 * SpatialMapCanvas — coordinate-driven map runtime.
 * Basemap is texture; zones/roads/agents live in MapFrame.
 * Phase B–D: evidence envelopes, route authority, mid-flight transit, drag-assign.
 */
export function SpatialMapCanvas({
  state,
  onSelectEntity,
  spatialHover,
  onSpatialHoverChange,
  mapImageSrc = mapBackdrop,
  onUpdateState,
  coreMode = false,
  showRoadDebug = false,
}: SpatialMapCanvasProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [failedMap, setFailedMap] = useState<Record<string, boolean>>({});
  const [hoverZoneId, setHoverZoneId] = useState<string | null>(null);
  const [displayPoints, setDisplayPoints] = useState<Record<string, MapPoint>>({});
  const [activeTransitIds, setActiveTransitIds] = useState<string[]>([]);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  const prevPosRef = useRef<Record<string, MapPoint>>({});
  const transitsRef = useRef<Record<string, TransitState>>({});
  const displayPointsRef = useRef(displayPoints);
  displayPointsRef.current = displayPoints;
  const dragRef = useRef<DragPreview | null>(null);
  const captureTargetRef = useRef<SVGGElement | null>(null);
  const suppressClickRef = useRef<string | null>(null);
  const suppressClickTimerRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const showContain = state.mode === "contain";
  const showRescue = state.mode === "rescue";
  const isPreVerify =
    state.scene === "baseline" ||
    state.scene === "alert-command" ||
    state.scene === "investigation-pending" ||
    state.scene === "monitoring-contested";
  const activeMapSrc = isPreVerify ? mapPreIncident : mapImageSrc;
  const zonesInteractive = showContain || showRescue;

  const hasMission = useCallback(
    (mission: string) => state.drones.some((d) => d.assignedMission === mission),
    [state.drones],
  );

  const showFireSpreadBoundary =
    state.scene === "authority-notification-ready" ||
    hasMission("survey-zone") ||
    hasMission("perimeter-monitor") ||
    showRescue;

  const showResidentialZones =
    hasMission("prepare-residential-evacuation") ||
    state.teamsNotified ||
    state.emergencyEvacuationActive ||
    showRescue;

  const showEvacuationRoutes =
    state.emergencyEvacuationActive || state.residentialRouteActive;

  const showResponderRoute =
    state.responderRouteActive || hasMission("guide-emergency-personnel");

  const showTeams =
    (showContain || showRescue) &&
    (state.teamsNotified || showRescue || state.groundTeams.some((t) => t.availability === "deployed"));

  const showDrones = state.scene !== "baseline" || state.drones.some((d) => d.status !== "available");
  const showAnomaly = state.scene !== "baseline";
  const anomalyUnverified =
    state.scene === "alert-command" || state.scene === "investigation-pending";
  const showInvestigationPath = INVESTIGATION_SCENES.has(state.scene);
  const zoneMargins = state.zoneMargins ?? {};
  const spatialUncertainty = state.operationalException?.spatialUncertainty ?? null;
  const selectedEvacuationRouteId = state.selectedEvacuationRouteId ?? null;

  const visibleZones = useMemo(() => {
    return ZONE_MODELS.filter((zone) => {
      // Phase D: pre-incident never draws forest-north polygons/labels (anomaly remains).
      if (isPreVerify && zone.id === "forest-north") return false;
      if (zone.category === "residential" && !showResidentialZones && !showContain && !showRescue) {
        return false;
      }
      if (zone.category === "forest" && !showFireSpreadBoundary && isPreVerify) {
        return false;
      }
      return true;
    }).map((zone) => applyZoneMargin(zone, zoneMargins[zone.id] ?? 0));
  }, [
    showResidentialZones,
    showContain,
    showRescue,
    showFireSpreadBoundary,
    isPreVerify,
    zoneMargins,
  ]);

  const evidenceEnvelopes = useMemo(() => {
    if (!spatialUncertainty) return [] as Array<{ zone: ZoneModel; meters: number }>;
    const marginUv = spatialUncertainty.marginMeters / NATIVE_WIDTH;
    return spatialUncertainty.affectedZoneIds
      .map((zoneId) => {
        // Manual zoneMargins stay additive: prefer visible (already margined) zone,
        // otherwise apply the manual margin before the auto evidence expansion.
        const model =
          visibleZones.find((z) => z.id === zoneId) ??
          (() => {
            const raw = getZoneModel(zoneId);
            return raw ? applyZoneMargin(raw, zoneMargins[zoneId] ?? 0) : undefined;
          })();
        if (!model) return null;
        return {
          zone: { ...model, polygon: envelopePolygon(model.polygon, marginUv) },
          meters: spatialUncertainty.marginMeters,
        };
      })
      .filter((entry): entry is { zone: ZoneModel; meters: number } => Boolean(entry));
  }, [spatialUncertainty, visibleZones, zoneMargins]);

  // Pathfollow: when roster pixel positions change, animate along the road graph.
  // Mid-flight: start from live display point or in-progress transit sample, not stale prev endpoint.
  useEffect(() => {
    let spawned = false;
    const now = performance.now();
    const consider = (id: string, kind: AgentKind, x: number, y: number) => {
      const point = fromPixel(x, y);
      const existing = transitsRef.current[id];
      const liveFromExisting = existing
        ? transitPoint(existing, now, reducedMotion).point
        : undefined;
      const from = displayPointsRef.current[id] ?? liveFromExisting ?? prevPosRef.current[id];
      prevPosRef.current[id] = point;
      if (!from) {
        setDisplayPoints((d) => ({ ...d, [id]: point }));
        return;
      }
      if (Math.hypot(from.u - point.u, from.v - point.v) < 0.002) return;
      transitsRef.current[id] = createTransit(id, kind, from, point, reducedMotion ? 1 : 1600);
      spawned = true;
    };

    for (const drone of state.drones) {
      consider(drone.id, "drone", drone.x, drone.y);
    }
    for (const team of state.groundTeams) {
      if (team.x == null || team.y == null) continue;
      consider(team.id, "team", team.x, team.y);
    }

    if (spawned) {
      setActiveTransitIds(Object.keys(transitsRef.current));
    }
  }, [state.drones, state.groundTeams, reducedMotion]);

  useEffect(() => {
    if (!activeTransitIds.length) return;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const nextDisplay: Record<string, MapPoint> = {};
      const still: string[] = [];
      for (const id of Object.keys(transitsRef.current)) {
        const t = transitsRef.current[id];
        const { point, done } = transitPoint(t, now, reducedMotion);
        nextDisplay[id] = point;
        if (done) {
          delete transitsRef.current[id];
        } else {
          still.push(id);
        }
      }
      setDisplayPoints((d) => ({ ...d, ...nextDisplay }));
      if (still.length) {
        raf = requestAnimationFrame(tick);
      } else {
        setActiveTransitIds([]);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activeTransitIds, reducedMotion]);

  useEffect(() => {
    return () => {
      if (suppressClickTimerRef.current != null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
    };
  }, []);

  const resolvePoint = (id: string, x: number, y: number): MapPoint => {
    if (dragPreview && dragPreview.id === id) {
      return fromPixel(dragPreview.x, dragPreview.y);
    }
    return displayPoints[id] ?? fromPixel(x, y);
  };

  const selectedId =
    state.selectedEntity?.type === "zone" ||
    state.selectedEntity?.type === "drone" ||
    state.selectedEntity?.type === "team" ||
    state.selectedEntity?.type === "anomaly"
      ? state.selectedEntity.id
      : null;

  const spatialHoverZone =
    spatialHover?.type === "zone" ? spatialHover.id : hoverZoneId;

  const activeZoneId = state.selectedZoneId ?? state.highlightedZoneIds[0] ?? null;
  const envelopeZone = activeZoneId
    ? visibleZones.find((z) => z.id === activeZoneId)
    : undefined;
  const manualEnvelope =
    envelopeZone && (zoneMargins[envelopeZone.id] ?? 0) !== 0
      ? {
          ...envelopeZone,
          polygon: envelopePolygon(
            envelopeZone.polygon,
            Math.abs(zoneMargins[envelopeZone.id] ?? 0) + ZONE_MARGIN_STEP,
          ),
        }
      : null;

  const mapFilter =
    showContain || showRescue
      ? "saturate(0.96) brightness(0.84)"
      : isPreVerify
        ? "saturate(0.6) brightness(0.6) hue-rotate(180deg)"
        : "saturate(0.92) brightness(0.74)";

  const adjustZoneMargin = (delta: number) => {
    if (!onUpdateState || !activeZoneId) return;
    onUpdateState((draft) => {
      const margins = { ...(draft.zoneMargins ?? {}) };
      const next = Math.max(-0.04, Math.min(0.06, (margins[activeZoneId] ?? 0) + delta));
      margins[activeZoneId] = next;
      draft.zoneMargins = margins;
      appendActivityLog(
        draft,
        "Operator",
        "Zone envelope",
        `${next >= 0 ? "Expanded" : "Contracted"} ${activeZoneId} envelope (${(next * 1000).toFixed(0)} u).`,
        "info",
      );
    });
  };

  const pointerToNative = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const screen = {
      x: ((clientX - rect.left) / rect.width) * MAP_DISPLAY.width,
      y: ((clientY - rect.top) / rect.height) * MAP_DISPLAY.height,
    };
    const pixel = toPixel(fromScreen(screen));
    return { x: pixel.x, y: pixel.y };
  };

  const releasePointerCapture = (drag: DragPreview) => {
    const target = captureTargetRef.current;
    if (target?.hasPointerCapture(drag.pointerId)) {
      target.releasePointerCapture(drag.pointerId);
    }
    captureTargetRef.current = null;
  };

  const beginPointerDrag =
    (type: DragKind, id: string, x: number, y: number) =>
    (event: ReactPointerEvent<SVGGElement>) => {
      if (event.button !== 0 || !onUpdateState) return;
      event.stopPropagation();
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

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = pointerToNative(event.clientX, event.clientY);
    if (!point) return;
    event.preventDefault();
    const next: DragPreview = {
      ...drag,
      x: point.x,
      y: point.y,
      moved: drag.moved || Math.hypot(point.x - drag.startX, point.y - drag.startY) > 4,
    };
    dragRef.current = next;
    setDragPreview(next);
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    releasePointerCapture(drag);
    dragRef.current = null;
    setDragPreview(null);

    if (!drag.moved || !onUpdateState) return;

    const dropUv = fromPixel(drag.x, drag.y);
    const nodeId = nearestNodeId(dropUv, drag.type);
    const destUv = nodePoint(nodeId);
    const startUv = fromPixel(drag.startX, drag.startY);
    const path = findPath({ from: startUv, to: destUv, allowed: drag.type });
    const end = path[path.length - 1] ?? destUv;
    const destPixel = toPixel(end);
    const zoneId = nearestZoneId(end);
    const nodeLabel = getRoadNode(nodeId)?.label ?? nodeId;

    suppressClickRef.current = `${drag.type}:${drag.id}`;
    if (suppressClickTimerRef.current != null) {
      window.clearTimeout(suppressClickTimerRef.current);
    }
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = null;
      suppressClickTimerRef.current = null;
    }, 0);

    onUpdateState((draft) => {
      if (drag.type === "drone") {
        const drone = draft.drones.find((item) => item.id === drag.id);
        const droneName = drone?.name ?? drag.id.toUpperCase();
        if (drone) {
          drone.x = destPixel.x;
          drone.y = destPixel.y;
          drone.zoneId = zoneId;
        }
        appendActivityLog(
          draft,
          "Operator",
          "Override",
          `Operator repositioned Drone ${droneName}. TALON snapped it to ${nodeLabel} and is recomputing the authorized flight path.`,
          "caution",
        );
      } else {
        const team = draft.groundTeams.find((item) => item.id === drag.id);
        const teamName = team?.name ?? drag.id.toUpperCase();
        if (team) {
          team.x = destPixel.x;
          team.y = destPixel.y;
          team.linkedZoneId = zoneId;
        }
        appendActivityLog(
          draft,
          "Operator",
          "Override",
          `Operator repositioned Ground Team ${teamName}. TALON snapped it to ${nodeLabel} and is recomputing ingress guidance.`,
          "caution",
        );
      }

      if (state.mode === "contain") {
        draft.scene = "contain-alternate";
        draft.overrideReason = "Operational constraint";
      }
    });
  };

  const handlePointerCancel = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    releasePointerCapture(drag);
    dragRef.current = null;
    setDragPreview(null);
  };

  const consumeSuppressedClick = (type: DragKind, id: string) => {
    const key = `${type}:${id}`;
    if (suppressClickRef.current !== key) return false;
    suppressClickRef.current = null;
    return true;
  };

  const shouldShowAgentLabel = (kind: DragKind, id: string, screen?: { x: number; y: number }) => {
    /* Collision with the command dock outranks every other reason to show. */
    if (screen && collidesWithCommandDock(screen)) return false;
    if (!(showContain || showRescue)) return true;
    if (selectedId === id) return true;
    if (spatialHover?.type === kind && spatialHover.id === id) return true;
    return false;
  };

  const anomalyScreen = toScreen(fromPixel(ANOMALY.x, ANOMALY.y));
  const transitPaths = activeTransitIds
    .map((id) => transitsRef.current[id])
    .filter(Boolean);

  const investigationRoute = getNamedRoute("investigation-path");
  const responderNamedRoute = getNamedRoute("responder-route");
  const egressRoutes = (["route-a", "route-b"] as const)
    .map((id) => getNamedRoute(id))
    .filter((route): route is NonNullable<typeof route> => Boolean(route));

  const firstEvidenceZone = evidenceEnvelopes[0]?.zone;
  const evidenceLabelScreen = firstEvidenceZone
    ? toScreen(firstEvidenceZone.center)
    : null;

  const subtleCorridorEdges = useMemo(
    () => ROAD_NETWORK.edges.filter((e) => e.kind === "arterial" || e.kind === "local"),
    [],
  );
  const nodeById = useMemo(
    () => new Map(ROAD_NETWORK.nodes.map((n) => [n.id, n])),
    [],
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: T.bgMap,
        overflow: "hidden",
        userSelect: "none",
      }}
      data-map-runtime="spatial-os"
    >
      {!failedMap[activeMapSrc] ? (
        <img
          src={activeMapSrc}
          alt=""
          draggable={false}
          onError={() => setFailedMap((f) => ({ ...f, [activeMapSrc]: true }))}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: mapFilter,
            pointerEvents: "none",
          }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: T.bgMap }} />
      )}

      {/*
        Atmosphere. Everything on this map used to render at one sharpness and
        one value range, which is the main reason the product read flat: the
        basemap's building texture competed with the data drawn on top of it.

        Two non-interactive layers sit BETWEEN the basemap and the SVG, so the
        terrain recedes while every piece of operational data stays crisp above
        them: depth haze toward the ridge line (distance), and a vignette that
        frames the working centre. Neither is decorative — together they buy the
        contrast headroom the overlays need.
      */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(to bottom, ${tint(T.bgMap, 0.62)} 0%, ${tint(T.bgMap, 0.34)} 18%, ${tint(T.bgMap, 0.08)} 42%, transparent 62%)`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(ellipse 78% 72% at 50% 46%, transparent 38%, ${tint(T.bgMap, 0.5)} 100%)`,
        }}
      />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_DISPLAY.width} ${MAP_DISPLAY.height}`}
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0 }}
        onClick={() => onSelectEntity(null)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <RouteArrowDefs />

        {showFireSpreadBoundary && !isPreVerify && (
          <g pointerEvents="none" opacity={0.55}>
            {SPREAD_RINGS.map((ring) => {
              const c = toScreen(fromPixel(ANOMALY.x, ANOMALY.y));
              return (
                <circle
                  key={ring.label}
                  cx={c.x}
                  cy={c.y}
                  r={ring.radius * (MAP_DISPLAY.width / NATIVE_WIDTH)}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={1}
                  strokeDasharray={ring.dash}
                  opacity={0.7}
                />
              );
            })}
          </g>
        )}

        {evidenceEnvelopes.length > 0 && spatialUncertainty && (
          <g
            role="img"
            aria-label={`Evidence uncertainty envelope, plus ${spatialUncertainty.marginMeters} meters across ${spatialUncertainty.affectedZoneIds.length} affected zones. ${spatialUncertainty.basis} Observed ${spatialUncertainty.observedAt}.`}
            data-testid="spatial-uncertainty-envelope"
            pointerEvents="none"
          >
            <title>{spatialUncertainty.basis}</title>
            {evidenceEnvelopes.map(({ zone }) => (
              <ZoneEnvelope key={`ev-${zone.id}`} zone={zone} />
            ))}
          </g>
        )}

        {manualEnvelope && <ZoneEnvelope zone={manualEnvelope} />}

        <ZonePolygons
          zones={visibleZones}
          selectedId={state.selectedEntity?.type === "zone" ? state.selectedEntity.id : null}
          hoverId={spatialHoverZone}
          interactive={zonesInteractive}
          onSelect={(id) => onSelectEntity({ type: "zone", id })}
          onHover={(id) => {
            setHoverZoneId(id);
            onSpatialHoverChange?.(id ? { type: "zone", id } : null);
          }}
        />

        {!showRoadDebug && (showContain || showRescue) && (
          <g opacity={0.12} pointerEvents="none" aria-hidden>
            {subtleCorridorEdges.map((edge) => {
              const a = nodeById.get(edge.from);
              const b = nodeById.get(edge.to);
              if (!a || !b) return null;
              const sa = toScreen(a.point);
              const sb = toScreen(b.point);
              return (
                <line
                  key={`corridor-${edge.id}`}
                  x1={sa.x}
                  y1={sa.y}
                  x2={sb.x}
                  y2={sb.y}
                  stroke={T.cyan}
                  strokeWidth={1.25}
                />
              );
            })}
          </g>
        )}

        {showRoadDebug && (
          <RoadDebugLayer edges={ROAD_NETWORK.edges} nodes={ROAD_NETWORK.nodes} />
        )}

        {showInvestigationPath && investigationRoute && (
          <RouteLine
            path={routeToSvgPath(investigationRoute)}
            color={T.cyan}
            label="SCOUT INVESTIGATION"
            variant="investigation"
            animate={!reducedMotion}
          />
        )}

        {showEvacuationRoutes &&
          egressRoutes.map((route) => {
            const emphasized =
              selectedEvacuationRouteId == null || selectedEvacuationRouteId === route.id;
            return (
              <RouteLine
                key={route.id}
                path={routeToSvgPath(route)}
                color={route.color}
                label={route.label}
                variant="egress"
                animate={!reducedMotion}
                emphasized={emphasized}
              />
            );
          })}

        {showResponderRoute && responderNamedRoute && (
          <RouteLine
            path={routeToSvgPath(responderNamedRoute)}
            color={T.yellow}
            label="RESPONDER INGRESS"
            variant="ingress"
            animate={!reducedMotion}
          />
        )}

        {transitPaths.map((t) => {
          const d = t.path
            .map((p, i) => {
              const s = toScreen(p);
              return `${i === 0 ? "M" : "L"} ${s.x},${s.y}`;
            })
            .join(" ");
          return (
            <path
              key={`transit-${t.id}`}
              d={d}
              fill="none"
              stroke={tint(T.cyan, 0.55)}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              pointerEvents="none"
            />
          );
        })}

        {showAnomaly && (
          <g
            onClick={(e) => {
              e.stopPropagation();
              onSelectEntity({ type: "anomaly", id: ANOMALY.id });
            }}
            style={{ cursor: "pointer" }}
          >
            <AnomalyMarker
              cx={anomalyScreen.x}
              cy={anomalyScreen.y}
              selected={selectedId === ANOMALY.id}
              unverified={anomalyUnverified}
            />
          </g>
        )}

        {showDrones &&
          state.drones.map((drone) => {
            const point = resolvePoint(drone.id, drone.x, drone.y);
            const screen = toScreen(point);
            const native = toPixel(point);
            const color = agentStatusColor("drone", drone.status);
            return (
              <g
                key={drone.id}
                role="button"
                tabIndex={0}
                data-testid={`map-drone-${drone.id}`}
                data-spatial-hover={spatialHover?.type === "drone" && spatialHover.id === drone.id ? "true" : "false"}
                aria-label={`${drone.name}. Select or drag to reposition`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (consumeSuppressedClick("drone", drone.id)) return;
                  onSelectEntity({ type: "drone", id: drone.id });
                }}
                onPointerDown={beginPointerDrag("drone", drone.id, native.x, native.y)}
                onPointerEnter={() => onSpatialHoverChange?.({ type: "drone", id: drone.id })}
                onPointerLeave={() => onSpatialHoverChange?.(null)}
              >
                <DroneMarker
                  cx={screen.x}
                  cy={screen.y}
                  label={drone.name}
                  selected={selectedId === drone.id}
                  statusColor={color}
                  droneClass={drone.droneClass}
                />
              </g>
            );
          })}

        {showTeams &&
          state.groundTeams.map((team) => {
            const fallback = teamFallbackPixel(team.id);
            const x = team.x ?? fallback.x;
            const y = team.y ?? fallback.y;
            const point = resolvePoint(team.id, x, y);
            const screen = toScreen(point);
            const native = toPixel(point);
            const color = agentStatusColor("team", team.availability);
            return (
              <g
                key={team.id}
                role="button"
                tabIndex={0}
                data-testid={`map-team-${team.id}`}
                data-spatial-hover={spatialHover?.type === "team" && spatialHover.id === team.id ? "true" : "false"}
                aria-label={`${team.name}. Select or drag to reposition`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (consumeSuppressedClick("team", team.id)) return;
                  onSelectEntity({ type: "team", id: team.id });
                }}
                onPointerDown={beginPointerDrag("team", team.id, native.x, native.y)}
                onPointerEnter={() => onSpatialHoverChange?.({ type: "team", id: team.id })}
                onPointerLeave={() => onSpatialHoverChange?.(null)}
              >
                <TeamMarker
                  cx={screen.x}
                  cy={screen.y}
                  label={team.name}
                  selected={selectedId === team.id}
                  statusColor={color}
                />
              </g>
            );
          })}
      </svg>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {visibleZones.map((zone) => {
          const c = toScreen(zone.center);
          if (collidesWithCommandDock(c)) return null;
          const tone =
            zone.category === "forest" ? "fire" :
            zone.category === "buffer" ? "cyan" : "red";
          return (
            <MapLabel
              key={`zl-${zone.id}`}
              x={clampLabelX(c.x)}
              y={c.y}
              tone={tone}
              selected={selectedId === zone.id}
            >
              {zone.shortLabel.toUpperCase()}
            </MapLabel>
          );
        })}

        {evidenceLabelScreen && spatialUncertainty && (
          <MapLabel
            x={clampLabelX(evidenceLabelScreen.x)}
            y={evidenceLabelScreen.y - 28}
            tone="amber"
            showDot
          >
            {`EVIDENCE ENVELOPE · +${spatialUncertainty.marginMeters} M`}
          </MapLabel>
        )}

        {showAnomaly && !anomalyUnverified && (
          <MapLabel
            x={clampLabelX(anomalyScreen.x)}
            y={anomalyScreen.y - 8}
            tone="fire"
            selected={selectedId === ANOMALY.id}
          >
            GRID 4C
          </MapLabel>
        )}

        {showDrones &&
          state.drones.map((drone) => {
            const point = resolvePoint(drone.id, drone.x, drone.y);
            const screen = toScreen(point);
            if (!shouldShowAgentLabel("drone", drone.id, screen)) return null;
            return (
              <MapLabel
                key={`dl-${drone.id}`}
                x={clampLabelX(screen.x)}
                y={screen.y}
                tone={toneFromColor(agentStatusColor("drone", drone.status))}
                selected={selectedId === drone.id}
              >
                {drone.name.toUpperCase()}
              </MapLabel>
            );
          })}

        {showTeams &&
          state.groundTeams.map((team) => {
            const fallback = teamFallbackPixel(team.id);
            const x = team.x ?? fallback.x;
            const y = team.y ?? fallback.y;
            const point = resolvePoint(team.id, x, y);
            const screen = toScreen(point);
            if (!shouldShowAgentLabel("team", team.id, screen)) return null;
            return (
              <MapLabel
                key={`tl-${team.id}`}
                x={clampLabelX(screen.x)}
                y={screen.y}
                tone={toneFromColor(agentStatusColor("team", team.availability))}
                selected={selectedId === team.id}
              >
                {team.name.split(" ")[0].toUpperCase()}
              </MapLabel>
            );
          })}
      </div>

      {!coreMode && (
        <div
          style={{
            position: "absolute",
            left: space.lg,
            bottom: space.lg,
            padding: "6px 10px",
            borderRadius: radius.control,
            background: surface.panelDense,
            border: `1px solid ${border.default}`,
            fontFamily: font.mono,
            fontSize: typeScale.metadata,
            letterSpacing: tracking.telemetry,
            color: T.textSecondary,
            pointerEvents: "none",
          }}
        >
          {isPreVerify ? "SATELLITE WATCH" : "TALON RECONSTRUCTION"} · SPATIAL OS
        </div>
      )}

      {!coreMode && zonesInteractive && activeZoneId && onUpdateState && (
        <div
          style={{
            position: "absolute",
            right: space.lg,
            bottom: space.lg,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "10px 12px",
            borderRadius: radius.control,
            background: surface.panelDense,
            border: `1px solid ${tint(T.amber, 0.45)}`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
            pointerEvents: "auto",
            minWidth: 188,
          }}
        >
          <div style={{ display: "flex", gap: space.sm, alignItems: "center" }}>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: typeScale.metadata,
                fontWeight: typeWeight.medium,
                letterSpacing: tracking.telemetry,
                color: T.amber,
                padding: "0 4px",
                flex: 1,
              }}
            >
              ZONE ENVELOPE
            </span>
            <button
              type="button"
              onClick={() => adjustZoneMargin(-ZONE_MARGIN_STEP)}
              style={chipBtn}
              aria-label="Contract zone envelope"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => adjustZoneMargin(ZONE_MARGIN_STEP)}
              style={chipBtn}
              aria-label="Expand zone envelope"
            >
              +
            </button>
          </div>
          <span
            style={{
              fontFamily: font.mono,
              fontSize: typeScale.metadata,
              letterSpacing: tracking.telemetry,
              color: T.textMuted,
              padding: "0 4px",
            }}
          >
            Click ± to adjust uncertainty
          </span>
        </div>
      )}
    </div>
  );
}

const chipBtn: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: radius.dense,
  border: `1px solid ${border.default}`,
  background: surface.control,
  color: T.textPrimary,
  fontFamily: font.mono,
  fontSize: typeScale.label,
  cursor: "pointer",
};

/** Snap mission coordinates onto the road network (pixel space). */
export function spatialCoordinatesForTarget(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  kind: "drone" | "team" = "drone",
): { x: number; y: number; path: MapPoint[] } {
  const from = fromPixel(fromX, fromY);
  const to = fromPixel(toX, toY);
  const path = findPath({ from, to, allowed: kind });
  const end = path[path.length - 1];
  return {
    x: end.u * NATIVE_WIDTH,
    y: end.v * 914,
    path,
  };
}

export function spatialNearestZone(x: number, y: number): string {
  return nearestZoneId(fromPixel(x, y));
}
