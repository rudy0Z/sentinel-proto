/**
 * 3D operational overlays (Sentinel V2 · P2.1).
 *
 * Paints the authored operational layer — zone ribbons, spread rings and
 * egress corridors — onto the shared world scene as wide, antialiased lines
 * draped on the terrain, plus DOM tactical labels anchored to world
 * coordinates. Every element is built from overlayData.ts, which is itself
 * derived from the 2D map's authored data, so the two surfaces cannot
 * disagree about where a boundary sits.
 *
 * DESIGN LAWS (vault 02 §3 / repo no-glow law)
 *   · Restraint — the world stays dark and low-chroma; the overlays are the
 *     only saturated elements and are FLAT (no bloom, no glow — fire remains
 *     the world's only emitter). A state change reads as a short opacity pulse.
 *   · Diegetic — labels are instrumentation chips (CSS2D), not tooltips, and
 *     carry tabular figures so numbers do not shimmer while the camera moves.
 *   · Budget — one batched zone primitive + 3 rings + 2 corridors = 6 overlay
 *     draws. The shared world contributes 12, so EXPLORE lands at 18 ≤ 19 and
 *     keeps on-demand rendering (static → 0 draws). Pixel-ratio cap 1.25× is
 *     owned by worldScene.makeRenderer.
 */

import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { font, lwir, radius, surface, T, tracking, tint } from "../../tokens";
import type { WorldScene } from "./worldScene";
import { FIRE, activeFront } from "../fire/fireModel";
import {
  CORRIDOR_TONE,
  DEFAULT_CORRIDOR_STATUS,
  type CorridorStatus,
  type OverlayData,
} from "./overlayData";

export interface OverlayState {
  /** Corridor status by corridor id (route-a / route-b). */
  corridors?: Record<string, CorridorStatus>;
}

export interface OverlayOptions {
  /** Wakes the host's on-demand render loop (used by the state-change pulse). */
  requestRender?: () => void;
}

export interface OverlayHandle {
  /** DOM half of the overlay — append `domElement` over the canvas. */
  labels: CSS2DRenderer;
  /** Apply operational state (corridor status). Pulses the changed element. */
  setState(state: OverlayState): void;
  /** Toggle the LWIR sensor-cone layer (P2.3). */
  setLwir(on: boolean): void;
  /** Keep the CSS2D layer matched to the canvas. */
  setSize(width: number, height: number): void;
  /** Draw/replace the dispatch route (P2.4); pass null to clear. */
  setRoute(lxLy: number[] | null): void;
  /** Emphasise one zone perimeter (P2.4 drag target); pass null to clear. */
  setHighlight(polygon: number[] | null): void;
  /** Draw calls contributed by the overlay layer (one per fat-line primitive). */
  drawCalls(): number;
  dispose(): void;
}

const LINE_WIDTH_PX = 3;
const ZONE_LIFT_M = 4;
const RING_LIFT_M = 15;
const CORRIDOR_LIFT_M = 6;
const RING_SEGMENTS = 96;
const PULSE_MS = 620;
const DASH_SIZE_M = 30;
const GAP_SIZE_M = 20;

export function buildOverlays(
  scene: THREE.Scene,
  ws: WorldScene,
  data: OverlayData,
  options: OverlayOptions = {},
): OverlayHandle {
  const group = new THREE.Group();
  group.name = "sentinel-operational-overlays";
  scene.add(group);

  const disposables: Array<{ dispose(): void }> = [];
  const materials: LineMaterial[] = [];

  const makeMaterial = (tone: string, dashed: boolean, opacity: number): LineMaterial => {
    const mat = new LineMaterial({
      color: new THREE.Color(tone),
      linewidth: LINE_WIDTH_PX,
      worldUnits: false,
      dashed,
      dashSize: DASH_SIZE_M,
      gapSize: GAP_SIZE_M,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    // Non-zero until the first frame; LineSegments2.onBeforeRender then keeps
    // this in sync with the live viewport.
    mat.resolution.set(1920, 1080);
    mat.userData.baseOpacity = opacity;
    materials.push(mat);
    disposables.push(mat);
    return mat;
  };

  /** One draped scene vertex at terrain + lift. */
  const drapedAt = (lx: number, ly: number, liftMetres: number): [number, number, number] => {
    const v = ws.sceneVec(lx, ly, ws.terrainY(lx, ly) + liftMetres);
    return [v.x, v.y, v.z];
  };

  /**
   * Resample a polyline so consecutive draped vertices are at most
   * `stepMetres` apart.
   *
   * Without this the drape only samples the DEM at the authored (sparse)
   * vertices, so each segment is a straight CHORD that tunnels through ridges
   * and floats over valleys — the documented defect in docs/sentinel-v2-master-plan/10
   * §2. Densifying is a vertex-count cost only: the batched Line2 primitives
   * stay a single draw call each, so the 19-call budget is unchanged.
   */
  const densify = (flat: number[], close: boolean, stepMetres: number): number[] => {
    const count = flat.length / 2;
    if (count < 2) return flat.slice();
    const out: number[] = [];
    const last = close ? count : count - 1;
    for (let i = 0; i < last; i++) {
      const ax = flat[i * 2];
      const ay = flat[i * 2 + 1];
      const j = (i + 1) % count;
      const bx = flat[j * 2];
      const by = flat[j * 2 + 1];
      out.push(ax, ay);
      const span = Math.hypot(bx - ax, by - ay);
      const steps = Math.ceil(span / stepMetres);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        out.push(ax + (bx - ax) * t, ay + (by - ay) * t);
      }
    }
    if (!close) out.push(flat[(count - 1) * 2], flat[(count - 1) * 2 + 1]);
    return out;
  };

  /** Flatten [lx,ly,…] into draped scene positions at terrain + lift. */
  const drape = (flat: number[], liftMetres: number, close: boolean): number[] => {
    const pts: number[] = [];
    // Rings/corridors want fine sampling so they hug the slope; zone perimeters
    // use a slightly coarser step because they are long closed loops.
    const step = close ? 5 : 8;
    const dense = densify(flat, close, step);
    const count = dense.length / 2;
    for (let i = 0; i < count; i++) {
      pts.push(...drapedAt(dense[i * 2], dense[i * 2 + 1], liftMetres));
    }
    return pts;
  };

  const addLine = (positions: number[], mat: LineMaterial): Line2 => {
    const geom = new LineGeometry();
    geom.setPositions(positions);
    const line = new Line2(geom, mat);
    line.computeLineDistances();
    line.frustumCulled = false;
    line.renderOrder = 3;
    group.add(line);
    disposables.push(geom);
    return line;
  };

  /* ── (a) Zone ribbons — ONE batched primitive, per-zone vertex colours ──── */
  {
    const positions: number[] = [];
    const colors: number[] = [];
    for (const zone of data.zones) {
      const flat = zone.lxLyPolygon;
      const count = flat.length / 2;
      const col = new THREE.Color(zone.tone);
      for (let i = 0; i < count; i++) {
        const a = i;
        const b = (i + 1) % count;
        positions.push(
          ...drapedAt(flat[a * 2], flat[a * 2 + 1], ZONE_LIFT_M),
          ...drapedAt(flat[b * 2], flat[b * 2 + 1], ZONE_LIFT_M),
        );
        colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
      }
    }
    const geom = new LineSegmentsGeometry();
    geom.setPositions(positions);
    geom.setColors(colors);
    const mat = new LineMaterial({
      color: 0xffffff,
      vertexColors: true,
      linewidth: LINE_WIDTH_PX,
      worldUnits: false,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    mat.resolution.set(1920, 1080);
    mat.userData.baseOpacity = 0.95;
    materials.push(mat);
    disposables.push(mat);
    const mesh = new LineSegments2(geom, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 3;
    group.add(mesh);
    disposables.push(geom);
  }

  /* ── (b) Fire isochrones + head-fire axis — ONE batched draw ──────────────
   * These REPLACE the three static concentric spread rings, which is why the
   * budget still lands at 19: a circle says "it will be this big somewhere",
   * an isochrone says "it was here at 02:39, and the head is heading THIS way".
   *
   * Everything (4 perimeters + the axis + every chevron) is merged into a
   * single LineSegments2, so the whole fire-progression layer costs 1 draw.
   */
  {
    const positions: number[] = [];
    const colors: number[] = [];
    const push = (verts: number[], col: THREE.Color) => {
      positions.push(...verts);
      for (let i = 0; i < verts.length / 3; i++) colors.push(col.r, col.g, col.b);
    };

    for (const iso of FIRE.isochrones) {
      const flat: number[] = [];
      for (const [x, y] of iso.polygon) flat.push(x, y);
      const newest = iso.tMinutes === activeFront(FIRE).tMinutes;
      push(drape(flat, newest ? 10 : 7, true), new THREE.Color(iso.tone));
    }

    // Head-fire axis + directional chevrons, merged into the same primitive.
    const axis: number[] = [];
    for (const [x, y] of FIRE.headAxis) axis.push(x, y);
    push(drape(axis, 26, false), new THREE.Color("#FFB066"));

    const c = new THREE.Color("#FFB066");
    for (let i = 1; i < FIRE.headAxis.length; i++) {
      const [x1, y1] = FIRE.headAxis[i - 1];
      const [x2, y2] = FIRE.headAxis[i];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const half = 26;
      const back = 34;
      const w1x = x2 - ux * back + -uy * half;
      const w1y = y2 - uy * back + ux * half;
      const w2x = x2 - ux * back - -uy * half;
      const w2y = y2 - uy * back - ux * half;
      positions.push(...drapedAt(w1x, w1y, 28), ...drapedAt(x2, y2, 28));
      positions.push(...drapedAt(x2, y2, 28), ...drapedAt(w2x, w2y, 28));
      for (let k = 0; k < 4; k++) colors.push(c.r, c.g, c.b);
    }

    const fireGeom = new LineSegmentsGeometry();
    fireGeom.setPositions(positions);
    fireGeom.setColors(colors);
    const fireMat = new LineMaterial({
      color: 0xffffff,
      vertexColors: true,
      linewidth: LINE_WIDTH_PX,
      worldUnits: false,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    fireMat.resolution.set(1920, 1080);
    fireMat.userData.baseOpacity = 0.95;
    materials.push(fireMat);
    disposables.push(fireMat);
    const fireMesh = new LineSegments2(fireGeom, fireMat);
    fireMesh.frustumCulled = false;
    fireMesh.renderOrder = 3;
    group.add(fireMesh);
    disposables.push(fireGeom);
  }

  /* ── (c) Egress corridors — state-driven colour + dash ──────────────────── */
  const corridorLines = new Map<string, Line2>();
  for (const corridor of data.corridors) {
    if (corridor.lxLyPolyline.length < 4) continue;
    const line = addLine(drape(corridor.lxLyPolyline, CORRIDOR_LIFT_M, false), makeMaterial(CORRIDOR_TONE.active, false, 1));
    line.renderOrder = 4;
    corridorLines.set(corridor.id, line);
  }

  /* ── (d) Tactical labels — DOM chips anchored to world coordinates ──────── */
  const labels = new CSS2DRenderer();
  labels.domElement.style.position = "absolute";
  labels.domElement.style.top = "0px";
  labels.domElement.style.left = "0px";
  labels.domElement.style.width = "100%";
  labels.domElement.style.height = "100%";
  labels.domElement.style.pointerEvents = "none";
  labels.setSize(1920, 1080);

  const labelNodes: HTMLDivElement[] = [];
  for (const spec of data.labels) {
    const el = document.createElement("div");
    el.dataset.overlayLabel = spec.id;
    el.textContent = spec.text;
    el.style.cssText = [
      "position:absolute",
      "white-space:nowrap",
      `color:${T.textPrimary}`,
      `background:${surface.panelDense}`,
      `border:1px solid ${tint(spec.tone, 0.4)}`,
      `border-radius:${radius.dense}px`,
      "padding:3px 7px",
      `font:600 10px/1 ${font.mono}`,
      `letter-spacing:${tracking.telemetry}`,
      // Numeric plates must not shimmer while the camera moves.
      spec.numeric ? "font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1" : "",
      "pointer-events:none",
    ]
      .filter(Boolean)
      .join(";");
    const obj = new CSS2DObject(el);
    obj.center.set(0.5, 1);
    obj.position.copy(ws.sceneVec(spec.lx, spec.ly, ws.terrainY(spec.lx, spec.ly) + spec.liftMetres));
    obj.renderOrder = 5;
    group.add(obj);
    labelNodes.push(el);
  }

  /* ── State + the one sanctioned state-change emphasis: an opacity pulse ─── */
  const statuses: Record<string, CorridorStatus> = {};
  let pulseRaf = 0;

  const pulse = (targets: LineMaterial[]): void => {
    if (!targets.length || typeof requestAnimationFrame !== "function") return;
    const t0 = performance.now();
    cancelAnimationFrame(pulseRaf);
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / PULSE_MS);
      const k = 1 - 0.42 * Math.sin(Math.PI * t); // 1 → 0.58 → 1, subtle
      for (const m of targets) m.opacity = (m.userData.baseOpacity as number) * k;
      options.requestRender?.();
      if (t < 1) {
        pulseRaf = requestAnimationFrame(step);
      } else {
        for (const m of targets) m.opacity = m.userData.baseOpacity as number;
      }
    };
    pulseRaf = requestAnimationFrame(step);
  };

  const applyStatus = (id: string, status: CorridorStatus): void => {
    const line = corridorLines.get(id);
    if (!line) return;
    const mat = line.material as LineMaterial;
    mat.color = new THREE.Color(CORRIDOR_TONE[status]);
    const dashed = status !== "active";
    if (mat.dashed !== dashed) {
      mat.dashed = dashed;
      mat.needsUpdate = true;
    }
    line.computeLineDistances();
  };

  const setState = (state: OverlayState): void => {
    if (!state.corridors) return;
    const pulsed: LineMaterial[] = [];
    for (const [id, status] of Object.entries(state.corridors)) {
      if (statuses[id] === status) continue;
      statuses[id] = status;
      applyStatus(id, status);
      const line = corridorLines.get(id);
      if (line) pulsed.push(line.material as LineMaterial);
    }
    pulse(pulsed);
  };

  // Stage the authored default. This is a real state change, so the corridors
  // pulse in once on entry rather than appearing as a hard flash.
  setState({ corridors: DEFAULT_CORRIDOR_STATUS });

  /* ── (e) Drone sensor cones — radiometric coverage, LWIR only (P2.3) ──── */
  const coneMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(lwir.cone),
    transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
  });
  disposables.push(coneMat);
  const cones = new THREE.Group();
  cones.name = "sentinel-sensor-cones";
  cones.visible = false;
  const coneRing = data.spreadRings[0];
  const coneSpots = [
    { lx: coneRing.center.lx - 360, ly: coneRing.center.ly + 150 },
    { lx: coneRing.center.lx + 280, ly: coneRing.center.ly + 190 },
    { lx: coneRing.center.lx + 70, ly: coneRing.center.ly - 260 },
    { lx: coneRing.center.lx - 160, ly: coneRing.center.ly - 70 },
  ];
  const CONE_H = 380;
  for (const spot of coneSpots) {
    const groundY = ws.terrainY(spot.lx, spot.ly);
    const geom = new THREE.ConeGeometry(150, CONE_H, 20, 1, true);
    const cone = new THREE.Mesh(geom, coneMat);
    cone.position.copy(ws.sceneVec(spot.lx, spot.ly, groundY + 420 - CONE_H / 2));
    cone.renderOrder = 2;
    cones.add(cone);
    disposables.push(geom);
  }
  group.add(cones);

  /* ── (f) Dispatch affordances (P2.4): route line + drop-zone emphasis ──── */
  const affordanceMat = new LineMaterial({
    color: new THREE.Color(T.cyan),
    linewidth: LINE_WIDTH_PX + 1,
    worldUnits: false,
    dashed: false,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  affordanceMat.resolution.set(1920, 1080);
  materials.push(affordanceMat);
  disposables.push(affordanceMat);
  let affordanceLine: Line2 | null = null;

  const setAffordance = (flat: number[] | null, lift: number, close: boolean): void => {
    if (affordanceLine) {
      group.remove(affordanceLine);
      affordanceLine.geometry.dispose();
      affordanceLine = null;
    }
    if (!flat || flat.length < 4) return;
    const geom = new LineGeometry();
    geom.setPositions(drape(flat, lift, close));
    affordanceLine = new Line2(geom, affordanceMat);
    affordanceLine.computeLineDistances();
    affordanceLine.frustumCulled = false;
    affordanceLine.renderOrder = 6;
    group.add(affordanceLine);
  };

  return {
    labels,
    setState,
    setRoute(lxLy) {
      setAffordance(lxLy, CORRIDOR_LIFT_M + 4, false);
    },
    setHighlight(polygon) {
      setAffordance(polygon, ZONE_LIFT_M + 3, true);
    },
    setLwir(on) {
      cones.visible = on;
      coneMat.opacity = on ? 0.12 : 0;
    },
    setSize(width: number, height: number) {
      const w = Math.max(1, width);
      const h = Math.max(1, height);
      for (const m of materials) m.resolution.set(w, h);
      labels.setSize(w, h);
    },
    drawCalls() {
      // 1 batched zone primitive + one fat line per ring + per corridor.
      return 1 + data.spreadRings.length + corridorLines.size;
    },
    dispose() {
      cancelAnimationFrame(pulseRaf);
      scene.remove(group);
      for (const d of disposables) d.dispose();
      for (const el of labelNodes) el.remove();
      labels.domElement.remove();
      group.clear();
    },
  };
}
