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
import { ANOMALY } from "../mockData";
import { FIRE, activeFront, burnScarPolygon, burnedAcres } from "./fire/fireModel";
import { localToUv } from "./world/world";
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
import { MAP_DISPLAY, MAP_NATIVE, clamp01, fromPixel, fromScreen, toPixel, toScreen } from "./frame";
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
import { MapLabel, MapLabelSvg, toneFromColor } from "./render/MapLabel";
import type { AgentKind, MapPoint, ZoneModel } from "./types";

/** Shell may pass optional route authority before it is promoted onto ShellState. */
export type SpatialMapState = ShellState & {
  selectedEvacuationRouteId?: string | null;
};

/**
 * Normalized 2D viewport: which part of the frame the operator is looking at.
 *
 * `u`/`v` are the CENTRE in MapFrame normalized space, `zoom` is 1 = the whole
 * frame. This is the unit 3D hands back on exit, so a sector inspected in
 * EXPLORE is the sector the operator lands on in 2D — spatial context must not
 * be lost by leaving the 3D view.
 */
export interface MapView {
  u: number;
  v: number;
  zoom: number;
}

export const FULL_FRAME_VIEW: MapView = { u: 0.5, v: 0.5, zoom: 1 };

/**
 * Project a fire polygon (world-local metres) to an SVG `points` string.
 *
 * Goes through the SAME coordinate law as every other spatial layer —
 * local metres → MapFrame u/v → the shared slice transform — so the fire
 * cannot drift out of register with the basemap the way an independently
 * authored overlay would.
 */
function fireAttr(poly: Array<[number, number]>): string {
  return poly
    .map(([x, y]) => {
      const s = toScreen(localToUv(x, y));
      return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
    })
    .join(" ");
}

/** Zoom is bounded: below ~1 the frame edges enter the shell gaps. */
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

/**
 * Resolve a MapView into the viewBox-space window the map is drawn through.
 * Zoom about the frame centre keeps the maths symmetric and means `zoom: 1`
 * is exactly the untransformed full-frame layout — no special case.
 */
function viewWindow(view: MapView): { cx: number; cy: number; w: number; h: number } {
  const w = MAP_DISPLAY.width / view.zoom;
  const h = MAP_DISPLAY.height / view.zoom;
  return {
    cx: clamp01(view.u) * MAP_DISPLAY.width,
    cy: clamp01(view.v) * MAP_DISPLAY.height,
    w,
    h,
  };
}

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
  /**
   * Sector to show on mount / when the shell re-seeds it (3D exit). Changes to
   * the object identity are treated as an external hand-off and applied.
   */
  initialView?: MapView | null;
  /** Fired when the operator pans or zooms, so 3D can pick the sector up. */
  onViewChange?: (view: MapView) => void;
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
  initialView,
  onViewChange,
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

  /* ── 2D viewport (pan / zoom) ──────────────────────────────────────────────
   * One transform drives BOTH the backdrop and the overlay SVG, so the photo
   * and everything drawn on it stay locked together. It is applied as a CSS
   * transform rather than by rewriting the viewBox because the viewBox is also
   * the pointer-mapping law (see pointerToNative) — keeping it fixed means only
   * ONE inverse has to be maintained.
   */
  const [view, setView] = useState<MapView>(initialView ?? FULL_FRAME_VIEW);
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;

  // An external hand-off (3D exit, deep-link) replaces the local view.
  useEffect(() => {
    if (!initialView) return;
    setView(initialView);
  }, [initialView]);

  const applyView = useCallback((next: MapView) => {
    const clamped: MapView = {
      u: clamp01(next.u),
      v: clamp01(next.v),
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next.zoom)),
    };
    setView(clamped);
    onViewChangeRef.current?.(clamped);
  }, []);

  const win = viewWindow(view);
  // Zoom about the frame centre: content scales, the window stays put.
  const viewTransform = `translate(${MAP_DISPLAY.width / 2}px, ${MAP_DISPLAY.height / 2}px) scale(${view.zoom}) translate(${-MAP_DISPLAY.width / 2}px, ${-MAP_DISPLAY.height / 2}px)`;

  /* ── Pan / zoom input ──────────────────────────────────────────────────────
   * Wheel zooms toward the cursor. Drag pans, but ONLY when the gesture starts
   * on the map background: entity markers install their own pointerdown and
   * capture, and a map pan must never steal an asset drag-assign.
   */
  const panRef = useRef<{ x: number; y: number; u: number; v: number; id: number } | null>(null);

  const handleWheel = useCallback((event: React.WheelEvent<SVGSVGElement>) => {
    if (reducedMotion) return;
    const svg = svgRef.current;
    if (!svg) return;
    const native = pointerToNative(event.clientX, event.clientY);
    if (!native) return;
    const from = { ...view };
    const nextZoom = from.zoom * (event.deltaY < 0 ? 1.14 : 1 / 1.14);
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    // Keep the map point under the cursor pinned while the scale changes.
    const anchorU = native.x / MAP_NATIVE.width;
    const anchorV = native.y / MAP_NATIVE.height;
    const k = from.zoom / zoom;
    applyView({
      u: anchorU + (from.u - anchorU) * k,
      v: anchorV + (from.v - anchorV) * k,
      zoom,
    });
  }, [view, applyView, reducedMotion]);

  const handleMapPanStart = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    // Only background gestures pan; anything with its own handler owns the press.
    if (event.button !== 0) return;
    if (event.target !== event.currentTarget) return;
    if (view.zoom <= MIN_ZOOM) return;
    panRef.current = {
      x: event.clientX,
      y: event.clientY,
      u: view.u,
      v: view.v,
      id: event.pointerId,
    };
  }, [view.u, view.v, view.zoom]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onMove = (e: PointerEvent) => {
      const pan = panRef.current;
      if (!pan || e.pointerId !== pan.id) return;
      const rect = svg.getBoundingClientRect();
      const svgScale = Math.max(rect.width / MAP_DISPLAY.width, rect.height / MAP_DISPLAY.height);
      // Drag right → content moves right → centre moves left in normalized space.
      const du = (e.clientX - pan.x) / svgScale / MAP_DISPLAY.width / view.zoom;
      const dv = (e.clientY - pan.y) / svgScale / MAP_DISPLAY.height / view.zoom;
      applyView({ u: pan.u - du, v: pan.v - dv, zoom: view.zoom });
    };
    const onUp = (e: PointerEvent) => {
      if (panRef.current && e.pointerId === panRef.current.id) panRef.current = null;
    };
    svg.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      svg.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [applyView, view.zoom]);

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

  /* The 2D basemap is baked TOP-DOWN (scripts/render-world-entry `?mode=topo`):
   * orthographic, fog off, exposure lifted so it survives being shown as a
   * backdrop. That bake is required for correctness, not looks — every overlay
   * here (zones, fire, routes, markers) is projected TOP-DOWN through the same
   * MapFrame law, so an oblique backdrop makes them miss the ground: zone
   * labels sit in the sky above the ridge they name. A top-down overlay layer
   * can only register with a top-down basemap.
   *
   * Because the bake now carries its own grade, these filters do PHASE
   * DISTINCTION only, never exposure. Applying an oblique-era brightness(0.66)
   * on top of it multiplied the whole frame into near-black.
   */
  const mapFilter =
    showContain || showRescue
      ? "saturate(1) brightness(1)"
      : isPreVerify
        ? "saturate(0.55) brightness(0.62) hue-rotate(180deg)"
        : "saturate(1) brightness(1)";

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

  /*
   * Screen → viewBox units under the SLICE mapping (the same law the backdrop
   * and overlay SVGs render with): uniform scale = max(w/vw, h/vh), content
   * centered, overflow cropped. The old stretch assumption silently displaced
   * every pointer → map conversion whenever the container aspect differed from
   * 1.6 — drag-to-snap landed in the wrong field.
   *
   * Then the ONE inverse of the pan/zoom transform. Everything downstream of
   * this function already works in map content space (drag-assign, hover,
   * select), so undoing the view here keeps all of it correct at any zoom
   * without threading a viewport through a dozen call sites.
   */
  const pointerToNative = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const svgScale = Math.max(rect.width / MAP_DISPLAY.width, rect.height / MAP_DISPLAY.height);
    const svgOffX = (rect.width - MAP_DISPLAY.width * svgScale) / 2;
    const svgOffY = (rect.height - MAP_DISPLAY.height * svgScale) / 2;
    const screenX = (clientX - rect.left - svgOffX) / svgScale;
    const screenY = (clientY - rect.top - svgOffY) / svgScale;
    // Invert: content = centre + (screen - centre) / zoom.
    const z = view.zoom;
    const cX = MAP_DISPLAY.width / 2;
    const cY = MAP_DISPLAY.height / 2;
    const screen = {
      x: cX + (screenX - cX) / z,
      y: cY + (screenY - cY) / z,
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
      {/*
        The basemap lives INSIDE the map's coordinate space: one viewBox, one
        preserveAspectRatio ("slice", the SVG equivalent of cover) shared by the
        backdrop and the overlay. Before this, the <img> scaled with objectFit
        cover while the overlay scaled with meet — two laws in one container, so
        zones/roads/labels drifted off the photo by up to 82px at 16:9 and up to
        278px on the square pre-incident asset. Now every layer — image, zones,
        roads, agents, labels, and pointer hit-testing — shares one mapping, and
        alignment holds at every viewport by construction.
      */}
      {!failedMap[activeMapSrc] ? (
        <svg
          viewBox={`0 0 ${MAP_DISPLAY.width} ${MAP_DISPLAY.height}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
          style={{ position: "absolute", inset: 0 }}
          aria-hidden="true"
        >
          <g style={{ transform: viewTransform, transformOrigin: "0 0" }}>
          <image
            href={activeMapSrc}
            x={0}
            y={0}
            width={MAP_DISPLAY.width}
            height={MAP_DISPLAY.height}
            preserveAspectRatio="xMidYMid slice"
            style={{ filter: mapFilter }}
            onError={() => setFailedMap((f) => ({ ...f, [activeMapSrc]: true }))}
          />
          </g>
        </svg>
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
          background: `linear-gradient(to bottom, ${tint(T.bgMap, 0.72)} 0%, ${tint(T.bgMap, 0.42)} 18%, ${tint(T.bgMap, 0.12)} 42%, transparent 60%)`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(ellipse 72% 66% at 50% 44%, transparent 30%, ${tint(T.bgMap, 0.62)} 100%)`,
        }}
      />

      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_DISPLAY.width} ${MAP_DISPLAY.height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0 }}
        onClick={() => onSelectEntity(null)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
        onPointerDown={handleMapPanStart}
      >
        <g style={{ transform: viewTransform, transformOrigin: "0 0" }}>
        <RouteArrowDefs />

        {showFireSpreadBoundary && !isPreVerify && (
          /* The fire is drawn from the SAME model the 3D scene consumes
           * (map/fire/fireModel) — burn scar, time-stamped isochrones, and a
           * head-fire axis with direction chevrons. The three concentric
           * spread circles it replaces could not say where the fire HAS BEEN,
           * only how far it might spread; an isochrone carries the clock and
           * the axis carries direction, which is the actual question an
           * operator asks of a fire map. Projected through localToUv → the
           * shared slice law, so it cannot drift out of register. */
          <g
            pointerEvents="none"
            role="img"
            aria-label={`Fire progression. ${FIRE.isochrones.length} time-stamped perimeters from ignition to ${activeFront(FIRE).label}. ${burnedAcres()} acres inside the newest perimeter. Head fire advancing along the ridge.`}
            data-testid="fire-progression"
          >
            <title>
              Burn scar and progression isochrones. Behaviour metrics are real
              NWCG definitions with authored values, not model output.
            </title>

            <polygon
              points={fireAttr(burnScarPolygon(FIRE, 0.94))}
              fill="#2A1710"
              fillOpacity={0.6}
              stroke="none"
            />
            <polygon
              points={fireAttr(burnScarPolygon(FIRE, 0.55))}
              fill="#120E0C"
              fillOpacity={0.78}
              stroke="none"
            />

            {FIRE.isochrones.map((iso) => {
              const newest = iso.tMinutes === activeFront(FIRE).tMinutes;
              const anchor = toScreen(localToUv(iso.polygon[0][0], iso.polygon[0][1]));
              return (
                <g key={iso.label}>
                  <polygon
                    points={fireAttr(iso.polygon)}
                    fill="none"
                    stroke={iso.tone}
                    strokeWidth={newest ? 2 : 1.1}
                    strokeDasharray={newest ? undefined : "6 5"}
                    opacity={newest ? 0.95 : 0.5}
                  />
                  <MapLabelSvg
                    x={anchor.x}
                    y={anchor.y}
                    label={`${iso.label} · ${iso.clock}`}
                    color={iso.tone}
                  />
                </g>
              );
            })}

            <polygon
              points={fireAttr(activeFront(FIRE).polygon)}
              fill="none"
              stroke="#FFD9A0"
              strokeWidth={3}
              opacity={0.9}
            />
            <polyline
              points={fireAttr(FIRE.headAxis)}
              fill="none"
              stroke="#FFB066"
              strokeWidth={1.4}
              strokeDasharray="7 5"
              opacity={0.9}
            />
            {FIRE.headAxis.slice(1).map(([hx, hy], i) => {
              const [ax, ay] = FIRE.headAxis[i];
              const a = toScreen(localToUv(ax, ay));
              const b = toScreen(localToUv(hx, hy));
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const back = 0.34;
              const wing = 0.22;
              return (
                <path
                  key={`chev-${i}`}
                  d={`M ${a.x - dx * back + dy * wing} ${a.y - dy * back - dx * wing} L ${b.x} ${b.y} L ${a.x - dx * back - dy * wing} ${a.y - dy * back + dx * wing}`}
                  fill="none"
                  stroke="#FFB066"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.9}
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
            color={T.cyan}
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
        </g>
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
