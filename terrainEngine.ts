/**
 * terrainEngine.ts: Tactical Terrain & Map Engine (Three.js r170)
 * -----------------------------------------------------------------
 * A headless engine for an emergency command display. It draws matte
 * hypsometric terrain with 20 m contours, a draped road network, instanced
 * structures and vegetation, generic glow-as-state overlays (lines, polygons,
 * points, markers, labels, time-of-arrival fields), DOM tactical chips and an
 * in-canvas drone gimbal PiP.
 *
 * The engine knows nothing about fires, plans or incidents. A situation is
 * data: a shell (or scenarioPlayer.ts) decides which layers exist at a given
 * scene time and drives the engine through the public API. Plan status
 * (proposed / committed / draft / compromised) is a styling state on a layer,
 * so changing it never moves geometry.
 *
 * Design rules
 *  - One terrain mesh, two cameras. Switching 2D/3D only tweens the camera.
 *  - Everything anchored to the ground samples the DEM bilinearly (the CPU and
 *    GPU use the same formula). Vertical exaggeration is a shared shader
 *    uniform, so changing it never rebuilds geometry.
 *  - Frames render on demand: when something changed, or while a time-varying
 *    layer is on screen (capped at 30 fps). After `motionIdleMs` without input
 *    the clock parks and the GPU does no work at all.
 *
 * Coordinate law: local metres, origin at frame centre, +x east, +y north.
 *   worldX = (col / (cols - 1)) * W - W / 2
 *   worldY = H / 2 - (row / (rows - 1)) * H
 *   scene  = (x, elevation, -y)          (Three.js is Y-up)
 */
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

// ============================================================================
// Public types
// ============================================================================

export type Vec2 = [number, number];

export interface GeoFrame {
  center: { lat: number; lon: number };
  widthMeters: number;
  heightMeters: number;
}

export interface DemGrid {
  cols: number;
  rows: number;
  /** Row-major elevations in metres; row 0 is the northern edge. */
  data: Float32Array;
}

export interface RoadFeature {
  id: string;
  kind: string; // highway | arterial | collector | residential | fireroad | turnaround
  width: number;
  name?: string;
  points: Vec2[];
}

export interface BuildingFeature {
  id: string;
  kind: string;
  height: number;
  footprint: Vec2[];
}

/** Land-cover raster covering the frame (ESA WorldCover classes: 10 tree cover, 20 shrubland, ...). */
export interface VegetationGrid {
  cols: number;
  rows: number;
  /** Row-major class codes; row 0 is the northern edge, cells tile the frame. */
  classes: Uint8Array;
  source?: string;
}

export interface WorldData {
  frame: GeoFrame;
  dem: DemGrid;
  roads: RoadFeature[];
  buildings: BuildingFeature[];
  vegetation?: VegetationGrid;
  source: 'procedural' | 'data';
  /** Procedural fixtures carry named anchors that the demo scenario uses. */
  meta?: { seed: number; anchors: Record<string, Vec2>; peaks: { name: string; position: Vec2; elevation: number }[] };
}

/**
 * Status ladder for authored layers. The engine owns the look so that no data can
 * make a draft read as a commitment:
 *  - committed:   the spec as given (full glow, flowing chevrons, filled zones)
 *  - proposed:    same colour and geometry, hollow core, frozen chevrons, outline-only zones
 *  - draft:       ghosted amber, thinner, long dashes (a revision awaiting approval)
 *  - compromised: red short dashes, no flow (measured or projected loss of the asset)
 */
export type LayerState = 'committed' | 'proposed' | 'draft' | 'compromised';

interface OverlayBase {
  visible?: boolean;
  /** Also visible in the drone sensor feed (physical phenomena only). */
  sensorVisible?: boolean;
  state?: LayerState;
  /** Clicks on this layer emit a 'layerclick' event (lines and markers). */
  interactive?: boolean;
}

export interface LineOverlaySpec extends OverlayBase {
  type: 'line';
  points: Vec2[];
  closed?: boolean;
  color?: string;
  /** Colour for intensity 0 when `intensity` is given. */
  colorLow?: string;
  /** Core width in CSS px. */
  width?: number;
  /** Halo width in CSS px on each side of the core (0 = none). */
  glow?: number;
  glowOpacity?: number;
  style?: 'solid' | 'dashed' | 'chevron';
  /** Dash and gap in px at the reference zoom (pattern is quantised per zoom octave). */
  dash?: [number, number];
  chevronSpacing?: number;
  /** Chevron flow speed, px per second at the reference zoom. */
  speed?: number;
  /** Metres above ground (default 3). */
  lift?: number;
  /** Per input vertex 0..1; blends colorLow to color and scales glow/heat. */
  intensity?: number[];
  /** Paints thermal glow onto the terrain under the line (0..1). */
  heat?: number;
  /** Ironbow temperature used in IR mode (0..1). Omit for annotation lines. */
  thermal?: number;
  opacity?: number;
  /** Paint into the terrain overlay mask instead of a Line2 (0 draw calls; no glow or animation). */
  drape?: boolean;
}

export interface PolygonOverlaySpec extends OverlayBase {
  type: 'polygon';
  /** rings[0] outer ring, others are holes (even-odd). */
  rings: Vec2[][];
  mode?: 'tint' | 'hatch' | 'burnScar' | 'heat';
  fill?: string;
  fillOpacity?: number;
  outline?: { color: string; width?: number; dash?: number[]; opacity?: number };
  stroke?: Omit<LineOverlaySpec, 'type' | 'points' | 'closed'>;
  structures?: 'threatened' | 'destroyed';
  /** Fire progression used by `pick()` to report when a point burned. */
  progression?: { from: Vec2; to: Vec2; start: string; end: string };
}

export interface PointsOverlaySpec extends OverlayBase {
  type: 'points';
  /** `window`: visible only while the scene time is in [from, until) (minutes). */
  points: { position: Vec2; intensity?: number; tempC?: number; id?: string; window?: [number, number] }[];
  size?: number;
}

export type MarkerIcon = 'hazard' | 'ignition' | 'staging' | 'info' | 'detection' | 'wind' | 'authority' | 'cut' | 'route' | 'focus' | 'station';
export type Tone = 'amber' | 'red' | 'cyan' | 'fire' | 'ok' | 'slate' | 'warn' | 'violet';

export interface MarkerOverlaySpec extends OverlayBase {
  type: 'marker';
  position: Vec2;
  icon?: MarkerIcon;
  /** Colour of icon and frame (defaults per icon). */
  tone?: Tone;
  /** Expanding ring (CSS; paused when the engine parks). */
  pulse?: boolean;
  /** Icon rotation in compass degrees (the wind arrow points where the air goes). */
  rotation?: number;
  title: string;
  detail?: string;
}

/**
 * A time-of-arrival surface over the frame (fire spread, flood, plume...). Everything it
 * draws is evaluated in the terrain shader against the scene clock, so scrubbing time
 * costs one uniform and no draw calls.
 */
export interface FieldOverlaySpec extends OverlayBase {
  type: 'field';
  /** Arrival time in scene minutes per cell, row-major, row 0 at the north edge, cells tiling the frame. */
  cols: number;
  rows: number;
  data: ArrayLike<number>;
  /** Cells reached by the scene time render as burned ground (char; trees become snags). */
  fill?: 'burnScar' | 'none';
  /** Emissive band behind the moving edge, e-folding minutes (0 = none). Physical: seen by sensors. */
  front?: number;
  /** Crisp edge at the scene time (map only). */
  edge?: { color?: string; width?: number };
  /** Projected contours at scene time + offset (map only, max 3). */
  isochrones?: { offset: number; color: string; style?: 'solid' | 'dashed' | 'dotted'; width?: number; label?: string }[];
  /** Origin for dash phase around the contours; labels sit on the ray origin -> labelToward. */
  origin?: Vec2;
  labelToward?: Vec2;
  /** Structure states derived from the field: reached by now, or reached within `within` minutes. */
  structures?: { reached?: 'destroyed' | 'threatened'; within?: number };
  /** ISO time of scene minute 0, used by pick() to report when a point was reached. */
  epoch?: string;
}

export interface LabelsOverlaySpec extends OverlayBase {
  type: 'labels';
  items: { position: Vec2; text: string; sub?: string; kind?: 'peak' | 'place' | 'water' | 'road' | 'area' }[];
}

export type OverlaySpec = LineOverlaySpec | PolygonOverlaySpec | PointsOverlaySpec | MarkerOverlaySpec | LabelsOverlaySpec | FieldOverlaySpec;

export type UnitKind = 'engine' | 'crew' | 'tender' | 'dozer' | 'drone' | 'command' | 'law';

export interface UnitSpec {
  id: string;
  kind: UnitKind;
  position: Vec2;
  /** Short type label: "Type 3", "Hotshots". Drones show altitude instead. */
  type?: string;
  name?: string;
  status?: 'active' | 'enroute' | 'alert' | 'standby';
  detail?: string;
  altitudeFt?: number;
  orbitRadius?: number;
  orbitPeriodS?: number;
  orbitPhase?: number;
  gimbal?: { target: Vec2; tempC?: number; targetId?: string };
  /** Timed positions (scene minutes); the unit is interpolated along it. Overrides `position`. */
  track?: { t: number; p: Vec2 }[];
  /** Breadcrumbs: minutes of track history drawn behind the unit. */
  trail?: number;
  /** Closed loop flown at `speedMps` on the animation clock (drones on a sweep). */
  patrol?: { path: Vec2[]; speedMps?: number };
}

export type CameraMode = 'topdown' | 'perspective';

export interface FlyToSpec {
  /** Ground point to look at (x, y) in world metres; z optional. */
  target: Vec2 | { x: number; y: number; z?: number };
  /** Camera position (x east, y north, z altitude in metres). */
  position?: { x: number; y: number; z: number };
  /** Alternatives to `position`. */
  range?: number;
  pitch?: number;
  bearing?: number;
  durationMs?: number;
}

export interface PickResult {
  x: number;
  y: number;
  elevation: number;
  slopeDeg: number;
  aspect: string;
  lat: number;
  lon: number;
  latLonText: string;
  cover: string;
  fuel: string;
  fire: { state: 'burned' | 'outside'; burnedAt?: string; agoText?: string; distanceToFront?: number };
}

export interface EngineMetrics {
  drawCalls: number;
  triangles: number;
  fps: number;
  main: { drawCalls: number; triangles: number };
  pip: { drawCalls: number; triangles: number } | null;
  frames: number;
  idle: boolean;
  motion: 'running' | 'parked' | 'off';
  pixelRatio: number;
  /** Instanced trees + shrubs drawn in the main view (included in triangles). */
  vegetation: { instances: number; triangles: number };
  geometries: number;
  textures: number;
  cpuFrameMs: number;
}

export interface EngineOptions {
  world?: WorldData;
  seed?: number;
  view?: CameraMode;
  pixelRatioCap?: number;
  motion?: boolean;
  /** Park animation after this long without input (0 = never). Default 45 s. */
  motionIdleMs?: number;
  /** Built-in compass, scale bar and lat/lon edge ticks. Pass false when an external shell draws its own. */
  hud?: boolean;
  /** Clock label shown in the drone feed (or one per lighting mode). */
  timeLabel?: string | { day: string; night: string };
  lighting?: LightingMode;
  /** Instanced trees/shrubs. Default 6,000 trees + 10,000 shrubs; false disables. */
  vegetation?: { trees?: number; shrubs?: number } | false;
  /** Clicking a drone chip opens its feed as a floating PiP (default true). Shells that host the feed elsewhere pass false and handle 'unitclick'. */
  pipOnUnitClick?: boolean;
}

/** Screen-space insets (CSS px) that an external shell covers with its own panels. */
export interface ViewInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ViewState {
  target: Vec2;
  /** Perspective: eye distance (m). Top-down: visible height (m). */
  range: number;
  pitch: number;
  bearing: number;
  mode: CameraMode;
}

export interface PipOptions {
  /** Render the feed inside this element (a shell panel) instead of floating over the map. */
  host?: HTMLElement;
  /** Built-in control bar (sensor, zoom, close). Default true. */
  bar?: boolean;
}

export type LightingMode = 'day' | 'night';

export type EngineEvent = 'camera' | 'pip' | 'motion' | 'unitclick' | 'world' | 'lighting' | 'time' | 'layerclick' | 'view';

export interface FieldStats {
  /** Area reached by the scene time (m²), from the active field layer. */
  reachedArea: number;
  threatened: number;
  destroyed: number;
  structures: number;
}

export interface Engine {
  setCamera(mode: CameraMode, durationMs?: number): void;
  getCameraMode(): CameraMode;
  setThermal(on: boolean): void;
  setLighting(mode: LightingMode, durationMs?: number): void;
  getLighting(): LightingMode;
  setVerticalExaggeration(scale: number, durationMs?: number): void;
  /** `fadeMs` cross-fades the old and new layer (removal fades out). */
  setOverlayLayer(id: string, spec: OverlaySpec | null, opts?: { fadeMs?: number }): void;
  /** Restyle in place: geometry, buffers and DOM nodes are kept. */
  setLayerState(id: string, state: LayerState): void;
  getOverlayLayerIds(): string[];
  setLayerVisible(id: string, visible: boolean): void;
  isLayerVisible(id: string): boolean;
  /** Scene clock in minutes; drives fields, timed points and unit tracks. */
  setSceneTime(minutes: number, durationMs?: number): void;
  getSceneTime(): number;
  /** Clock text shown in the drone feed. */
  setTimeLabel(label: string): void;
  getFieldStats(): FieldStats | null;
  /** Topmost interactive line or marker layer within `tolerancePx` of a client point. */
  pickLayer(clientX: number, clientY: number, tolerancePx?: number): string | null;
  setUnits(units: UnitSpec[]): void;
  /** Ring a unit chip (e.g. hovered in a shell list); null clears. */
  highlightUnit(id: string | null): void;
  /** Current ground position of a unit (track, patrol or fixed), or null. */
  getUnitPosition(id: string): Vec2 | null;
  openDronePip(droneId: string, opts?: PipOptions): void;
  closeDronePip(): void;
  setPipSensor(mode: 'eo' | 'ir'): void;
  setPipZoom(zoom: number): void;
  getPip(): { drone: string; sensor: 'eo' | 'ir'; zoom: number; hosted: boolean } | null;
  /** Focus + context: overlay layers not in `ids` fade to a low opacity; null restores all. */
  setLayerEmphasis(ids: string[] | null, durationMs?: number): void;
  /** The view centres on the region the insets leave uncovered; flyTo frames its range inside it. */
  setViewInsets(insets: Partial<ViewInsets>, durationMs?: number): void;
  getView(): ViewState;
  flyTo(spec: FlyToSpec): void;
  pick(clientX: number, clientY: number): PickResult | null;
  setMotion(on: boolean): void;
  /** Swap the world; overlays and units carry over (their coordinates are frame-relative). */
  setWorld(world: WorldData): void;
  getMetrics(): EngineMetrics;
  invalidate(): void;
  on(event: EngineEvent, fn: (payload: any) => void): () => void;
  dispose(): void;
}

// ============================================================================
// Constants and small utilities
// ============================================================================

export const PALETTE = {
  ink: '#0A0E14',
  slate: '#1C2530',
  cyan: '#00E5FF',
  amber: '#FF8A4A',
  red: '#E5533C',
  fire: '#FF6A00',
  ok: '#3DDC84',
  warn: '#FFB020',
  text: '#D7E0EA',
  dim: '#8796A8',
};

const DEG = Math.PI / 180;
const FT = 0.3048;
const ORTHO_FOV = 3; // perspective FOV that is visually indistinguishable from the ortho camera
const TACTICAL = { pitch: 55, bearing: -30, fov: 40 };
const ANIM_FPS = 30;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const wrap360 = (a: number) => ((a % 360) + 360) % 360;
const angleDelta = (from: number, to: number) => ((to - from + 540) % 360) - 180;
const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

function hexToVec3(hex: string): THREE.Vector3 {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return new THREE.Vector3(((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 2D simplex noise (Gustavson), seeded. Output roughly in [-1, 1]. */
class Simplex2 {
  private perm = new Uint8Array(512);
  private static G = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 0, 1, 0, -1];
  constructor(rand: () => number) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  noise(xin: number, yin: number): number {
    const F2 = 0.3660254037844386, G2 = 0.21132486540518713;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255, P = this.perm, G = Simplex2.G;
    let n = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      const g = (P[ii + P[jj]] & 7) * 2;
      t0 *= t0;
      n += t0 * t0 * (G[g] * x0 + G[g + 1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      const g = (P[ii + i1 + P[jj + j1]] & 7) * 2;
      t1 *= t1;
      n += t1 * t1 * (G[g] * x1 + G[g + 1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      const g = (P[ii + 1 + P[jj + 1]] & 7) * 2;
      t2 *= t2;
      n += t2 * t2 * (G[g] * x2 + G[g + 1] * y2);
    }
    return 70 * n;
  }
  fbm(x: number, y: number, oct: number): number {
    let a = 1, f = 1, sum = 0, norm = 0;
    for (let o = 0; o < oct; o++) {
      sum += a * this.noise(x * f, y * f);
      norm += a;
      a *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  }
  ridged(x: number, y: number, oct: number): number {
    let a = 1, f = 1, sum = 0, norm = 0;
    for (let o = 0; o < oct; o++) {
      const n = 1 - Math.abs(this.noise(x * f, y * f));
      sum += a * n * n;
      norm += a;
      a *= 0.5;
      f *= 2.1;
    }
    return sum / norm;
  }
}

// ---------------------------------------------------------------- polylines

function dist2(a: Vec2, b: Vec2) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function polyLength(p: Vec2[]): number {
  let L = 0;
  for (let i = 1; i < p.length; i++) L += dist2(p[i - 1], p[i]);
  return L;
}

/** Inserts points so no segment exceeds maxSeg; `t` is the fractional source index. */
function resampleMax(p: Vec2[], maxSeg: number): { pts: Vec2[]; t: number[] } {
  if (p.length < 2) return { pts: p.slice(), t: p.map((_, i) => i) };
  const pts: Vec2[] = [[p[0][0], p[0][1]]];
  const t: number[] = [0];
  for (let i = 0; i < p.length - 1; i++) {
    const k = Math.max(1, Math.ceil(dist2(p[i], p[i + 1]) / maxSeg));
    for (let j = 1; j <= k; j++) {
      const f = j / k;
      pts.push([lerp(p[i][0], p[i + 1][0], f), lerp(p[i][1], p[i + 1][1], f)]);
      t.push(i + f);
    }
  }
  return { pts, t };
}

function resampleUniform(p: Vec2[], spacing: number): Vec2[] {
  if (p.length < 2) return p.slice();
  const out: Vec2[] = [[p[0][0], p[0][1]]];
  let carry = 0;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i], b = p[i + 1];
    const d = dist2(a, b);
    let s = spacing - carry;
    while (s <= d) {
      const f = s / d;
      out.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]);
      s += spacing;
    }
    carry = d - (s - spacing);
  }
  const last = p[p.length - 1];
  if (dist2(out[out.length - 1], last) > spacing * 0.35) out.push([last[0], last[1]]);
  else out[out.length - 1] = [last[0], last[1]];
  return out;
}

function chaikin(p: Vec2[], iters: number, closed = false): Vec2[] {
  let pts = p;
  for (let it = 0; it < iters; it++) {
    const out: Vec2[] = [];
    const n = pts.length;
    if (!closed) out.push(pts[0]);
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) out.push(pts[n - 1]);
    pts = out;
  }
  return pts;
}

function simplifyDP(p: Vec2[], eps: number): Vec2[] {
  if (p.length < 3) return p.slice();
  const keep = new Uint8Array(p.length);
  keep[0] = keep[p.length - 1] = 1;
  const stack: [number, number][] = [[0, p.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let best = -1, bd = eps;
    for (let i = a + 1; i < b; i++) {
      const d = distPointSeg(p[i][0], p[i][1], p[a][0], p[a][1], p[b][0], p[b][1]);
      if (d > bd) {
        bd = d;
        best = i;
      }
    }
    if (best > 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return p.filter((_, i) => keep[i]);
}

function distPointSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const L2 = dx * dx + dy * dy;
  const t = L2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distToPolyline(x: number, y: number, line: Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const d = distPointSeg(x, y, line[i][0], line[i][1], line[i + 1][0], line[i + 1][1]);
    if (d < best) best = d;
  }
  return best;
}

function pointInRing(x: number, y: number, ring: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInPolygon(x: number, y: number, rings: Vec2[][]): boolean {
  let inside = false;
  for (const r of rings) if (pointInRing(x, y, r)) inside = !inside;
  return inside;
}

function convexHull(points: Vec2[]): Vec2[] {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Vec2[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Vec2[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Rounded outward buffer of a convex ring (counter-clockwise). */
function bufferHull(hull: Vec2[], d: number): Vec2[] {
  const out: Vec2[] = [];
  const n = hull.length;
  for (let i = 0; i < n; i++) {
    const prev = hull[(i - 1 + n) % n], cur = hull[i], next = hull[(i + 1) % n];
    const a0 = Math.atan2(cur[1] - prev[1], cur[0] - prev[0]) - Math.PI / 2;
    let a1 = Math.atan2(next[1] - cur[1], next[0] - cur[0]) - Math.PI / 2;
    while (a1 < a0) a1 += Math.PI * 2;
    const steps = Math.max(1, Math.ceil((a1 - a0) / (Math.PI / 10)));
    for (let k = 0; k <= steps; k++) {
      const a = a0 + ((a1 - a0) * k) / steps;
      out.push([cur[0] + Math.cos(a) * d, cur[1] + Math.sin(a) * d]);
    }
  }
  return out;
}

function centroid(pts: Vec2[]): Vec2 {
  let x = 0, y = 0;
  for (const p of pts) {
    x += p[0];
    y += p[1];
  }
  return [x / pts.length, y / pts.length];
}

/** Uniform grid hash of circles (x, y, r). */
class PointGrid {
  private map = new Map<number, number[]>();
  constructor(private cell: number) {}
  private key(ix: number, iy: number) {
    return (ix + 32768) * 65536 + (iy + 32768);
  }
  add(x: number, y: number, r: number) {
    const k = this.key(Math.floor(x / this.cell), Math.floor(y / this.cell));
    let a = this.map.get(k);
    if (!a) this.map.set(k, (a = []));
    a.push(x, y, r);
  }
  /** Calls fn for every stored item within `rad` cells-worth of (x, y); stop by returning true. */
  query(x: number, y: number, rad: number, fn: (px: number, py: number, pr: number) => boolean | void): boolean {
    const c = this.cell;
    const x0 = Math.floor((x - rad) / c), x1 = Math.floor((x + rad) / c);
    const y0 = Math.floor((y - rad) / c), y1 = Math.floor((y + rad) / c);
    for (let ix = x0; ix <= x1; ix++)
      for (let iy = y0; iy <= y1; iy++) {
        const a = this.map.get(this.key(ix, iy));
        if (!a) continue;
        for (let i = 0; i < a.length; i += 3) if (fn(a[i], a[i + 1], a[i + 2])) return true;
      }
    return false;
  }
}

// ============================================================================
// Heightfield + geodesy
// ============================================================================

export class Heightfield {
  readonly cols: number;
  readonly rows: number;
  readonly width: number;
  readonly height: number;
  readonly data: Float32Array;
  readonly dx: number;
  readonly dy: number;
  readonly min: number;
  readonly max: number;

  constructor(dem: DemGrid, width: number, height: number) {
    this.cols = dem.cols;
    this.rows = dem.rows;
    this.data = dem.data;
    this.width = width;
    this.height = height;
    this.dx = width / (dem.cols - 1);
    this.dy = height / (dem.rows - 1);
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < dem.data.length; i++) {
      const v = dem.data[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    this.min = mn;
    this.max = mx;
  }
  xOf(col: number) {
    return (col / (this.cols - 1)) * this.width - this.width / 2;
  }
  yOf(row: number) {
    return this.height / 2 - (row / (this.rows - 1)) * this.height;
  }
  colOf(x: number) {
    return ((x + this.width / 2) / this.width) * (this.cols - 1);
  }
  rowOf(y: number) {
    return ((this.height / 2 - y) / this.height) * (this.rows - 1);
  }
  contains(x: number, y: number) {
    return Math.abs(x) <= this.width / 2 && Math.abs(y) <= this.height / 2;
  }
  /** Bilinear elevation (metres), clamped at the frame edge. */
  sample(x: number, y: number): number {
    return sampleGrid(this.data, this.cols, this.rows, this.colOf(x), this.rowOf(y));
  }
  gradient(x: number, y: number): Vec2 {
    const ex = this.dx, ey = this.dy;
    return [(this.sample(x + ex, y) - this.sample(x - ex, y)) / (2 * ex), (this.sample(x, y + ey) - this.sample(x, y - ey)) / (2 * ey)];
  }
}

const TRAIL_STEP = 1.5; // minutes between breadcrumbs

/** Position on a timed track (clamped to its ends). */
function trackAt(track: { t: number; p: Vec2 }[], t: number): Vec2 {
  if (t <= track[0].t) return track[0].p;
  const last = track[track.length - 1];
  if (t >= last.t) return last.p;
  let lo = 0, hi = track.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (track[m].t <= t) lo = m;
    else hi = m;
  }
  const a = track[lo], b = track[hi];
  const k = (t - a.t) / Math.max(b.t - a.t, 1e-9);
  return [lerp(a.p[0], b.p[0], k), lerp(a.p[1], b.p[1], k)];
}

function sampleGrid(data: Float32Array, cols: number, rows: number, c: number, r: number): number {
  c = clamp(c, 0, cols - 1.001);
  r = clamp(r, 0, rows - 1.001);
  const c0 = Math.floor(c), r0 = Math.floor(r);
  const fc = c - c0, fr = r - r0;
  const i = r0 * cols + c0;
  const a = data[i], b = data[i + 1], d0 = data[i + cols], d1 = data[i + cols + 1];
  return (a + (b - a) * fc) * (1 - fr) + (d0 + (d1 - d0) * fc) * fr;
}

export class GeoProjection {
  readonly lat0: number;
  readonly lon0: number;
  readonly mLat: number;
  readonly mLon: number;
  constructor(frame: GeoFrame) {
    this.lat0 = frame.center.lat;
    this.lon0 = frame.center.lon;
    const p = this.lat0 * DEG;
    this.mLat = 111132.954 - 559.822 * Math.cos(2 * p) + 1.175 * Math.cos(4 * p);
    this.mLon = 111412.84 * Math.cos(p) - 93.5 * Math.cos(3 * p) + 0.118 * Math.cos(5 * p);
  }
  toLatLon(x: number, y: number) {
    return { lat: this.lat0 + y / this.mLat, lon: this.lon0 + x / this.mLon };
  }
  format(lat: number, lon: number): string {
    const dm = (v: number, pos: string, neg: string, w: number) => {
      const a = Math.abs(v);
      const d = Math.floor(a);
      const m = (a - d) * 60;
      return `${String(d).padStart(w, '0')}°${m.toFixed(2).padStart(5, '0')}′${v >= 0 ? pos : neg}`;
    };
    return `${dm(lat, 'N', 'S', 2)} ${dm(lon, 'E', 'W', 3)}`;
  }
}

// ============================================================================
// Grid A* used by the procedural road builder
// ============================================================================

class MinHeap {
  private keys: number[] = [];
  private vals: number[] = [];
  get size() {
    return this.vals.length;
  }
  push(v: number, k: number) {
    const K = this.keys, V = this.vals;
    let i = V.length;
    K.push(k);
    V.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (K[p] <= k) break;
      K[i] = K[p];
      V[i] = V[p];
      i = p;
    }
    K[i] = k;
    V[i] = v;
  }
  pop(): number {
    const K = this.keys, V = this.vals;
    const top = V[0];
    const k = K.pop()!, v = V.pop()!;
    const n = V.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i, mk = k;
        if (l < n && K[l] < mk) {
          m = l;
          mk = K[l];
        }
        if (r < n && K[r] < mk) m = r;
        if (m === i) break;
        K[i] = K[m];
        V[i] = V[m];
        i = m;
      }
      K[i] = k;
      V[i] = v;
    }
    return top;
  }
}

interface PathOpts {
  maxGrade: number;
  highPref?: number;
  goalMask?: Uint8Array;
  maxCost?: number;
  sidePenalty?: number;
}

const MOVES: Vec2[] = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
  [2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2],
];

/** Grade-limited least-cost path on the DEM grid. Produces switchbacks naturally. */
function gridPath(hf: Heightfield, slope: Float32Array, from: Vec2, to: Vec2 | null, o: PathOpts): Vec2[] | null {
  const { cols, rows, data } = hf;
  const N = cols * rows;
  const cellOf = (p: Vec2) => clamp(Math.round(hf.rowOf(p[1])), 0, rows - 1) * cols + clamp(Math.round(hf.colOf(p[0])), 0, cols - 1);
  const s = cellOf(from);
  const goal = to ? cellOf(to) : -1;
  const gc = goal % cols, gr = (goal / cols) | 0;
  const g = new Float32Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heap = new MinHeap();
  g[s] = 0;
  heap.push(s, 0);
  const side = o.sidePenalty ?? 3;
  let found = -1;
  while (heap.size) {
    const u = heap.pop();
    if (closed[u]) continue;
    closed[u] = 1;
    if (u === goal || (o.goalMask && o.goalMask[u] && u !== s)) {
      found = u;
      break;
    }
    if (o.maxCost && g[u] > o.maxCost) break;
    const uc = u % cols, ur = (u / cols) | 0;
    const hu = data[u];
    for (const m of MOVES) {
      const vc = uc + m[0], vr = ur + m[1];
      if (vc < 0 || vr < 0 || vc >= cols || vr >= rows) continue;
      const v = vr * cols + vc;
      if (closed[v]) continue;
      const hv = data[v];
      if (hv < 1.2) continue;
      const d = Math.hypot(m[0] * hf.dx, m[1] * hf.dy);
      const r = Math.abs(hv - hu) / d / o.maxGrade;
      let pen = 1 + 2.5 * r * r;
      if (r > 1) pen += 30 * (r - 1) + 12;
      pen += side * Math.max(0, slope[v] - 0.45);
      if (o.highPref) pen += o.highPref * (1 - hv / hf.max);
      const ng = g[u] + d * pen;
      if (ng < g[v]) {
        g[v] = ng;
        prev[v] = u;
        const hcost = goal >= 0 ? Math.hypot((vc - gc) * hf.dx, (vr - gr) * hf.dy) : 0;
        heap.push(v, ng + hcost);
      }
    }
  }
  if (found < 0) return null;
  const out: Vec2[] = [];
  for (let c = found; c >= 0; c = prev[c]) out.push([hf.xOf(c % cols), hf.yOf((c / cols) | 0)]);
  return out.reverse();
}

// ============================================================================
// Procedural fixture: coastal WUI canyon (6000 m x 3250 m)
// ============================================================================

const DEFAULT_FRAME: GeoFrame = { center: { lat: 34.032, lon: -118.815 }, widthMeters: 6000, heightMeters: 3250 };

interface Canyon {
  x0: number;
  amp: number;
  f: number;
  ph: number;
  w: number;
  k: number;
  end: number;
}

export function generateProceduralWorld(seed = 1729): WorldData {
  const W = DEFAULT_FRAME.widthMeters, H = DEFAULT_FRAME.heightMeters, cols = 400, rows = 220;
  const rand = mulberry32(seed);
  const nz = new Simplex2(rand);

  const coastY = (x: number) => -1440 + 55 * Math.sin(x / 690 + 1.3) + 28 * Math.sin(x / 240 + 0.4) + 40 * nz.noise(x / 900, 3.1);
  const crestY = (x: number) => 1080 + 110 * Math.sin(x / 1150 + 0.6) + 45 * Math.sin(x / 430 + 2.0) + 50 * nz.noise(x / 800, 7.7);
  const canyons: Canyon[] = [
    { x0: -260, amp: 150, f: 520, ph: 0.3, w: 150, k: 0.8, end: 1.0 }, // Kestrel Canyon (main)
    { x0: -2080, amp: 120, f: 480, ph: 1.7, w: 140, k: 0.74, end: 1.0 }, // Arroyo Seco (west)
    { x0: 1720, amp: 140, f: 560, ph: 2.4, w: 150, k: 0.76, end: 1.0 }, // Solstice (east)
    { x0: -1180, amp: 90, f: 400, ph: 0.9, w: 95, k: 0.5, end: 0.78 },
    { x0: 640, amp: 80, f: 380, ph: 2.9, w: 90, k: 0.5, end: 0.8 },
    { x0: 2640, amp: 70, f: 420, ph: 0.2, w: 85, k: 0.46, end: 0.75 },
    { x0: -2800, amp: 60, f: 350, ph: 1.1, w: 80, k: 0.42, end: 0.7 },
  ];
  const canyonX = (c: Canyon, y: number) => c.x0 + c.amp * Math.sin(y / c.f + c.ph) + 45 * nz.noise(y / 450, c.x0 * 0.01);
  const peakSeeds = [
    { x: -1350, dy: -40, a: 40, s: 260 },
    { x: 380, dy: -30, a: 46, s: 300 },
    { x: 2150, dy: -60, a: 32, s: 240 },
  ];

  const heightAt = (x: number, y: number): number => {
    const cy = coastY(x), ky = crestY(x);
    const t = (y - cy) / (ky - cy);
    if (t < 0) return -1;
    let base = t <= 1 ? 470 * Math.pow(smoothstep(0.05, 1.0, t), 1.05) : 470 * (1 - 1.1 * (t - 1));
    const terrace = 1.5 + 22 * smoothstep(0.0, 0.035, t) + 24 * smoothstep(0.05, 0.17, t);
    base = Math.max(base, terrace);
    const amp = smoothstep(0.1, 0.55, t);
    base += amp * (60 * (nz.ridged(x / 700 + 11, y / 700 - 5, 4) - 0.45) + 22 * nz.fbm(x / 260 + 3, y / 260 + 9, 4));
    base += amp * 38 * nz.fbm(x / 230 - 4, y / 950 + 6, 3); // N-S trending spurs
    base += (1.5 + 5 * amp) * nz.fbm(x / 90 - 7, y / 90 + 2, 3);
    let carve = 1;
    for (const c of canyons) {
      const ft = smoothstep(0.03, 0.2, t) * (1 - smoothstep(c.end - 0.2, c.end, t));
      if (ft <= 0) continue;
      const w = c.w * (1.5 - 0.7 * clamp(t, 0, 1));
      const dx = Math.abs(x - canyonX(c, y));
      if (dx > 3 * w) continue;
      const V = 0.55 * Math.exp(-((dx / w) ** 2)) + 0.45 * Math.pow(Math.max(0, 1 - dx / (2.6 * w)), 1.5);
      carve *= 1 - c.k * ft * V;
    }
    let h = base * carve;
    for (const p of peakSeeds) {
      const py = crestY(p.x) + p.dy;
      h += p.a * Math.exp(-((x - p.x) ** 2 + (y - py) ** 2) / (2 * p.s * p.s));
    }
    return h;
  };

  const data = new Float32Array(cols * rows);
  let maxH = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = (c / (cols - 1)) * W - W / 2, y = H / 2 - (r / (rows - 1)) * H;
      const h = heightAt(x, y);
      data[r * cols + c] = h;
      if (h > maxH) maxH = h;
    }
  const scale = 490 / maxH;
  for (let i = 0; i < data.length; i++) data[i] = data[i] > 0 ? data[i] * scale : -1;

  const hf = new Heightfield({ cols, rows, data }, W, H);
  const slope = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const cl = Math.max(c - 1, 0), cr = Math.min(c + 1, cols - 1), ru = Math.max(r - 1, 0), rd = Math.min(r + 1, rows - 1);
      const gx = (data[r * cols + cr] - data[r * cols + cl]) / ((cr - cl) * hf.dx);
      const gy = (data[ru * cols + c] - data[rd * cols + c]) / ((rd - ru) * hf.dy);
      slope[r * cols + c] = Math.hypot(gx, gy);
    }

  // ---------------------------------------------------------------- roads
  const roads: RoadFeature[] = [];
  const roadMask = new Uint8Array(cols * rows);
  const roadIdx = new PointGrid(30);
  const r2 = (p: Vec2): Vec2 => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];
  const addRoad = (id: string, name: string, kind: string, width: number, pts: Vec2[]) => {
    roads.push({ id, name, kind, width, points: pts.map(r2) });
    const dense = kind === 'turnaround' ? pts : resampleUniform(pts, 5);
    for (const p of dense) {
      roadIdx.add(p[0], p[1], kind === 'turnaround' ? width / 2 : width / 2);
      const c = Math.round(hf.colOf(p[0])), r = Math.round(hf.rowOf(p[1]));
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const cc = c + dc, rr = r + dr;
          if (cc >= 0 && rr >= 0 && cc < cols && rr < rows) roadMask[rr * cols + cc] = 1;
        }
    }
  };
  const smoothPath = (p: Vec2[]) => resampleUniform(chaikin(simplifyDP(p, 6), 3), 10);
  const nearestRoadPoint = (p: Vec2, maxR: number): Vec2 | null => {
    let best: Vec2 | null = null, bd = maxR;
    roadIdx.query(p[0], p[1], maxR, (x, y) => {
      const d = Math.hypot(x - p[0], y - p[1]);
      if (d < bd) {
        bd = d;
        best = [x, y];
      }
    });
    return best;
  };

  // Coast highway rides the marine terrace.
  const hwy: Vec2[] = [];
  for (let x = -W / 2; x <= W / 2 + 1; x += 40) hwy.push([x, coastY(x) + 0.075 * (crestY(x) - coastY(x))]);
  const hwyPts = resampleUniform(chaikin(hwy, 2), 12);
  hwyPts[0][0] = -W / 2;
  hwyPts[hwyPts.length - 1][0] = W / 2;
  addRoad('hwy-1', 'Coast Hwy', 'highway', 22, hwyPts);
  const onHighway = (x: number): Vec2 => {
    let best = hwyPts[0];
    for (const p of hwyPts) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
    return best;
  };

  const main = canyons[0], west = canyons[1], east = canyons[2];
  const yAt = (x: number, t: number) => coastY(x) + t * (crestY(x) - coastY(x));
  const crestPt = (x: number, dy = -50): Vec2 => [x, crestY(x) + dy];

  const mouthMain = onHighway(canyonX(main, -1250));
  // Two legs: up the canyon floor to the bench, then switchbacks to the crest.
  const yFloor = yAt(main.x0, 0.42);
  const benchFloor: Vec2 = [canyonX(main, yFloor), yFloor];
  const leg1 = gridPath(hf, slope, mouthMain, benchFloor, { maxGrade: 0.1, sidePenalty: 1 });
  const leg2 = gridPath(hf, slope, benchFloor, crestPt(-900, -40), { maxGrade: 0.12 });
  const kestrelPts = leg1 && leg2 ? smoothPath([mouthMain, ...leg1, ...leg2.slice(1)]) : [mouthMain, benchFloor, crestPt(-900, -40)];
  addRoad('kestrel-cyn-rd', 'Kestrel Canyon Rd', 'arterial', 11, kestrelPts);
  const kestrelTop = kestrelPts[kestrelPts.length - 1];

  const westHead = crestPt(canyonX(west, crestY(west.x0) - 250), -40);
  const ridge = gridPath(hf, slope, kestrelTop, westHead, { maxGrade: 0.12, highPref: 0.9 });
  const ridgePts = ridge ? smoothPath([kestrelTop, ...ridge.slice(1)]) : [kestrelTop, westHead];
  addRoad('ridgecrest-dr', 'Ridgecrest Dr', 'collector', 9, ridgePts);

  const ridgeMask = new Uint8Array(cols * rows);
  for (const p of resampleUniform(ridgePts, 6)) ridgeMask[Math.round(hf.rowOf(p[1])) * cols + Math.round(hf.colOf(p[0]))] = 1;
  const mouthWest = onHighway(canyonX(west, -1250));
  const arroyo = gridPath(hf, slope, mouthWest, null, { maxGrade: 0.105, goalMask: ridgeMask });
  if (arroyo) {
    const end = nearestRoadPoint(arroyo[arroyo.length - 1], 40);
    addRoad('arroyo-seco-rd', 'Arroyo Seco Rd', 'arterial', 10, smoothPath([mouthWest, ...arroyo, ...(end ? [end] : [])]));
  }

  const eastCrest = crestPt(2350, -30);
  const sky = gridPath(hf, slope, kestrelTop, eastCrest, { maxGrade: 0.16, highPref: 1.4 });
  if (sky) addRoad('skyline-fire-rd', 'Skyline Fire Rd', 'fireroad', 5, smoothPath([kestrelTop, ...sky.slice(1)]));

  const mouthEast = onHighway(canyonX(east, -1250));
  const solTarget: Vec2 = [canyonX(east, yAt(east.x0, 0.42)), yAt(east.x0, 0.42)];
  const sol = gridPath(hf, slope, mouthEast, solTarget, { maxGrade: 0.1 });
  if (sol) addRoad('solstice-cyn-rd', 'Solstice Canyon Rd', 'collector', 8, smoothPath([mouthEast, ...sol]));

  // ---------------------------------------------------------------- neighbourhoods
  const buildings: BuildingFeature[] = [];
  const bldIdx = new PointGrid(40);
  let bseq = 0;
  const tryPlace = (cx: number, cy: number, ang: number, len: number, wid: number, height: number, kind: string, maxSlope = 0.42): boolean => {
    if (!hf.contains(cx, cy)) return false;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const corners: Vec2[] = [
      [-len / 2, -wid / 2], [len / 2, -wid / 2], [len / 2, wid / 2], [-len / 2, wid / 2],
    ].map(([u, v]) => [cx + u * ca - v * sa, cy + u * sa + v * ca] as Vec2);
    const rad = Math.hypot(len, wid) / 2;
    for (const p of [[cx, cy] as Vec2, ...corners]) {
      if (hf.sample(p[0], p[1]) < 2.5) return false;
      const g = hf.gradient(p[0], p[1]);
      if (Math.hypot(g[0], g[1]) > maxSlope) return false;
      if (roadIdx.query(p[0], p[1], 30, (x, y, r) => Math.hypot(x - p[0], y - p[1]) < r + 2.5)) return false;
    }
    if (bldIdx.query(cx, cy, 60, (x, y, r) => Math.hypot(x - cx, y - cy) < r + rad + 2)) return false;
    bldIdx.add(cx, cy, rad);
    buildings.push({ id: `b-${++bseq}`, kind, height: Math.round(height * 10) / 10, footprint: corners.map(r2) });
    return true;
  };

  interface HoodStyle {
    spacing: number;
    setback: number;
    len: [number, number];
    wid: [number, number];
    hgt: [number, number];
    kind: string;
  }
  const rr = (a: number, b: number) => a + (b - a) * rand();
  const homesAlong = (pts: Vec2[], hw: number, st: HoodStyle, from = 18, to = 12, sides = [-1, 1]) => {
    const L = polyLength(pts);
    const dense = resampleUniform(pts, 2);
    const at = (s: number) => {
      const i = clamp(Math.round((s / L) * (dense.length - 1)), 1, dense.length - 2);
      const a = dense[i - 1], b = dense[i + 1];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      return { p: dense[i], ang };
    };
    for (let s = from; s < L - to; s += st.spacing * rr(0.85, 1.25)) {
      const { p, ang } = at(s);
      for (const side of sides) {
        if (rand() < 0.12) continue;
        const len = rr(st.len[0], st.len[1]), wid = rr(st.wid[0], st.wid[1]);
        const off = hw + st.setback * rr(0.8, 1.3) + wid / 2;
        const nx = -Math.sin(ang) * side, ny = Math.cos(ang) * side;
        tryPlace(p[0] + nx * off, p[1] + ny * off, ang + rr(-0.08, 0.08), len, wid, rr(st.hgt[0], st.hgt[1]), st.kind);
      }
    }
  };
  const homesAround = (c: Vec2, incoming: number, R: number, st: HoodStyle) => {
    for (let k = 0; k < 7; k++) {
      const a = incoming + Math.PI + ((k - 3) / 3.4) * Math.PI * 0.82;
      const len = rr(st.len[0], st.len[1]), wid = rr(st.wid[0], st.wid[1]);
      const off = R + st.setback + wid / 2;
      tryPlace(c[0] + Math.cos(a) * off, c[1] + Math.sin(a) * off, a + Math.PI / 2, len, wid, rr(st.hgt[0], st.hgt[1]), st.kind);
    }
  };

  const pickSites = (center: Vec2, radius: number, count: number, minSpacing: number, maxSlope: number, elev: [number, number], minRoad: number) => {
    const out: Vec2[] = [];
    for (let tries = 0; tries < 900 && out.length < count; tries++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * radius;
      const p: Vec2 = [center[0] + Math.cos(a) * d, center[1] + Math.sin(a) * d];
      if (!hf.contains(p[0], p[1])) continue;
      const h = hf.sample(p[0], p[1]);
      if (h < elev[0] || h > elev[1]) continue;
      const g = hf.gradient(p[0], p[1]);
      if (Math.hypot(g[0], g[1]) > maxSlope) continue;
      if (roadIdx.query(p[0], p[1], minRoad, (x, y) => Math.hypot(x - p[0], y - p[1]) < minRoad)) continue;
      if (out.some((q) => dist2(p, q) < minSpacing)) continue;
      out.push(p);
    }
    return out;
  };

  let sseq = 0;
  const streetNames = ['Kestrel Ln', 'Falcon Ct', 'Sage Way', 'Toyon Pl', 'Manzanita Ct', 'Chamise Ln', 'Laurel Ct', 'Yucca Pl', 'Ceanothus Way', 'Sumac Ln', 'Bluff Ct', 'Tidepool Ln', 'Seaview Pl', 'Marine Ct', 'Saddle Ln', 'Ranch Rd', 'Oak Bench Rd', 'Canyon View Ct', 'Solstice Ct', 'Ember Ln'];
  const growStreets = (center: Vec2, radius: number, count: number, o: { minSpacing: number; maxSlope: number; elev: [number, number]; minRoad: number; maxGrade: number; style: HoodStyle; driveway?: boolean }) => {
    const sites = pickSites(center, radius, count, o.minSpacing, o.maxSlope, o.elev, o.minRoad);
    for (const site of sites) {
      const path = gridPath(hf, slope, site, null, { maxGrade: o.maxGrade, goalMask: roadMask, maxCost: radius * 10, sidePenalty: 6 });
      if (!path || path.length < 4) continue;
      const end = nearestRoadPoint(path[path.length - 1], 35);
      const pts = smoothPath([...path, ...(end ? [end] : [])]).reverse();
      if (polyLength(pts) < 70) continue;
      const id = `st-${++sseq}`;
      const kind = o.driveway ? 'residential' : 'residential';
      addRoad(id, streetNames[sseq % streetNames.length], kind, 7.5, pts);
      const tip = pts[pts.length - 1], before = pts[Math.max(0, pts.length - 4)];
      addRoad(`${id}-ta`, '', 'turnaround', 26, [tip]);
      homesAlong(pts, 3.75, o.style, 26, 16);
      homesAround(tip, Math.atan2(tip[1] - before[1], tip[0] - before[0]), 13, o.style);
    }
  };

  const home: HoodStyle = { spacing: 30, setback: 9, len: [13, 20], wid: [10, 15], hgt: [5, 8.5], kind: 'home' };
  const cottage: HoodStyle = { spacing: 24, setback: 7, len: [9, 13], wid: [8, 11], hgt: [4, 6], kind: 'cottage' };
  const ranch: HoodStyle = { spacing: 70, setback: 16, len: [22, 32], wid: [14, 20], hgt: [5, 7.5], kind: 'ranch' };

  const yBench = yAt(main.x0, 0.4);
  const anchors: Record<string, Vec2> = {};
  anchors.kestrelBench = [canyonX(main, yBench), yBench];
  anchors.pointVista = [950, coastY(950) + 230];
  anchors.saddleRanch = [-1150, crestY(-1150) - 280];
  anchors.solstice = [canyonX(east, yAt(east.x0, 0.3)), yAt(east.x0, 0.3)];

  growStreets(anchors.kestrelBench, 560, 9, { minSpacing: 150, maxSlope: 0.25, elev: [8, 280], minRoad: 100, maxGrade: 0.15, style: home });
  growStreets(anchors.pointVista, 460, 7, { minSpacing: 140, maxSlope: 0.22, elev: [6, 140], minRoad: 100, maxGrade: 0.15, style: home });
  growStreets(anchors.saddleRanch, 460, 4, { minSpacing: 220, maxSlope: 0.3, elev: [200, 480], minRoad: 140, maxGrade: 0.17, style: ranch, driveway: true });
  growStreets(anchors.solstice, 340, 3, { minSpacing: 150, maxSlope: 0.25, elev: [8, 260], minRoad: 100, maxGrade: 0.15, style: home });

  // Homes on the arterial / collector inside the neighbourhoods, and the beach strip.
  const within = (pts: Vec2[], c: Vec2, R: number) => {
    const runs: Vec2[][] = [];
    let cur: Vec2[] = [];
    for (const p of pts) {
      if (dist2(p, c) < R) cur.push(p);
      else if (cur.length) {
        runs.push(cur);
        cur = [];
      }
    }
    if (cur.length) runs.push(cur);
    return runs.filter((r) => r.length > 3);
  };
  for (const run of within(kestrelPts, anchors.kestrelBench, 620)) homesAlong(run, 5.5, home, 10, 10);
  for (const road of roads.filter((r) => r.id === 'solstice-cyn-rd')) for (const run of within(road.points, anchors.solstice, 420)) homesAlong(run, 4, home, 10, 10);
  for (const run of within(ridgePts, anchors.saddleRanch, 520)) homesAlong(run, 4.5, ranch, 20, 20);
  for (const run of within(hwyPts, [anchors.pointVista[0], coastY(anchors.pointVista[0])], 650)) homesAlong(run, 11, cottage, 6, 6, [-1]);
  for (const run of within(hwyPts, [mouthMain[0], mouthMain[1]], 260))
    homesAlong(run, 11, { spacing: 40, setback: 10, len: [24, 36], wid: [16, 22], hgt: [6, 9], kind: 'commercial' }, 6, 6, [1]);

  // ---------------------------------------------------------------- landmarks
  const peaks: { name: string; position: Vec2; elevation: number }[] = [];
  const names = ['Sentinel Peak', 'Kestrel Peak', 'Vista Ridge'];
  [[-3000, -900], [-900, 1000], [1000, 3000]].forEach(([x0, x1], i) => {
    let best: Vec2 = [0, 0], bh = -1;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = hf.xOf(c);
        if (x < x0 || x > x1) continue;
        const h = data[r * cols + c];
        if (h > bh) {
          bh = h;
          best = [x, hf.yOf(r)];
        }
      }
    peaks.push({ name: names[i], position: best, elevation: Math.round(bh) });
  });

  anchors.mouthMain = mouthMain;
  anchors.mouthWest = mouthWest;
  anchors.kestrelMid = [canyonX(main, yAt(main.x0, 0.62)), yAt(main.x0, 0.62)];
  anchors.westCanyon = [canyonX(west, yAt(west.x0, 0.45)), yAt(west.x0, 0.45)];
  anchors.eastCanyon = [canyonX(east, yAt(east.x0, 0.55)), yAt(east.x0, 0.55)];
  anchors.westExit = hwyPts[0];
  anchors.ignition = [canyonX(east, 700) - 250, 700];
  anchors.fireHead = [mouthMain[0] + 370, mouthMain[1] + 290];
  anchors.staging = onHighway(-1500);
  anchors.ocean = [-600, coastY(-600) - 110];

  return { frame: structuredCloneFrame(DEFAULT_FRAME), dem: { cols, rows, data }, roads, buildings, source: 'procedural', meta: { seed, anchors, peaks } };
}

function structuredCloneFrame(f: GeoFrame): GeoFrame {
  return { center: { lat: f.center.lat, lon: f.center.lon }, widthMeters: f.widthMeters, heightMeters: f.heightMeters };
}

// ============================================================================
// Real data: loader + encoder (dem.bin Int16 LE, frame.json, roads.json, buildings.json)
// ============================================================================

export async function loadWorldData(basePath: string, opts: { cols?: number; rows?: number } = {}): Promise<WorldData> {
  const base = basePath.endsWith('/') ? basePath : basePath + '/';
  const get = async (name: string) => {
    const res = await fetch(base + name);
    if (!res.ok) throw new Error(`loadWorldData: ${name} → HTTP ${res.status}`);
    return res;
  };
  const [demRes, frameRes] = await Promise.all([get('dem.bin'), get('frame.json')]);
  const [buf, frameJson] = await Promise.all([demRes.arrayBuffer(), frameRes.json()]);
  const optional = async (name: string) => {
    try {
      return await (await get(name)).json();
    } catch {
      return [];
    }
  };
  const [roadsJson, buildingsJson, vegJson] = await Promise.all([optional('roads.json'), optional('buildings.json'), optional('vegetation.json')]);

  const frame = frameJson as Partial<GeoFrame> & { cols?: number; rows?: number };
  if (!frame.center || !Number.isFinite(frame.widthMeters) || !Number.isFinite(frame.heightMeters))
    throw new Error('loadWorldData: frame.json needs {center:{lat,lon}, widthMeters, heightMeters}');
  const n = buf.byteLength / 2;
  let cols = opts.cols ?? frame.cols ?? 400;
  let rows = opts.rows ?? frame.rows ?? 220;
  if (cols * rows !== n) {
    // Infer a grid whose aspect best matches the frame.
    const aspect = frame.widthMeters! / frame.heightMeters!;
    let best: [number, number] | null = null, err = Infinity;
    for (let r = 2; r * r <= n * 4; r++)
      if (n % r === 0) {
        const c = n / r;
        const e = Math.abs(Math.log(c / r / aspect));
        if (e < err) {
          err = e;
          best = [c, r];
        }
      }
    if (!best) throw new Error(`loadWorldData: dem.bin has ${n} samples; cannot infer grid`);
    [cols, rows] = best;
  }
  const dv = new DataView(buf);
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) data[i] = dv.getInt16(i * 2, true);

  const roads: RoadFeature[] = (Array.isArray(roadsJson) ? roadsJson : [])
    .filter((r: any) => r && Array.isArray(r.points) && r.points.length > 0)
    .map((r: any, i: number) => ({ id: String(r.id ?? `r${i}`), kind: String(r.kind ?? 'residential'), width: Number(r.width) || 8, name: r.name, points: r.points }));
  const buildings: BuildingFeature[] = (Array.isArray(buildingsJson) ? buildingsJson : [])
    .filter((b: any) => b && Array.isArray(b.footprint) && b.footprint.length >= 3)
    .map((b: any, i: number) => ({ id: String(b.id ?? `b${i}`), kind: String(b.kind ?? 'home'), height: Number(b.height) || 6, footprint: b.footprint }));

  let vegetation: VegetationGrid | undefined;
  const v = vegJson as { cols?: number; rows?: number; data?: string; classes?: number[]; source?: string };
  if (v && v.cols && v.rows && (v.data || v.classes)) {
    const classes = v.data ? fromBase64(v.data) : Uint8Array.from(v.classes!);
    if (classes.length === v.cols * v.rows) vegetation = { cols: v.cols, rows: v.rows, classes, source: v.source };
  }
  return { frame: { center: frame.center, widthMeters: frame.widthMeters!, heightMeters: frame.heightMeters! }, dem: { cols, rows, data }, roads, buildings, vegetation, source: 'data' };
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toBase64(u8: Uint8Array): string {
  const B = (globalThis as { Buffer?: { from(a: Uint8Array): { toString(enc: string): string } } }).Buffer;
  if (B) return B.from(u8).toString('base64');
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Serialises a world in the loader's format (Int16 LE DEM, rounded to metres). */
export function encodeWorldData(world: WorldData) {
  const { cols, rows, data } = world.dem;
  const dem = new ArrayBuffer(cols * rows * 2);
  const dv = new DataView(dem);
  for (let i = 0; i < data.length; i++) dv.setInt16(i * 2, Math.round(data[i]), true);
  return {
    dem,
    frame: { ...structuredCloneFrame(world.frame), cols, rows },
    roads: world.roads,
    buildings: world.buildings,
    vegetation: world.vegetation ? { cols: world.vegetation.cols, rows: world.vegetation.rows, encoding: 'base64-uint8', data: toBase64(world.vegetation.classes), source: world.vegetation.source } : undefined,
  };
}

// ============================================================================
// Road graph (routing for the demo scenario)
// ============================================================================

/** Routable road graph (20 m nodes, junctions snapped within 40 m). Used for evacuation routing. */
export class RoadNetwork {
  xs: number[] = [];
  ys: number[] = [];
  road: string[] = [];
  adj: { to: number; w: number }[][] = [];

  constructor(roads: RoadFeature[]) {
    const ends: number[] = [];
    for (const r of roads) {
      if (r.kind === 'turnaround' || r.points.length < 2) continue;
      const pts = resampleUniform(r.points, 20);
      let prev = -1;
      pts.forEach((p, i) => {
        const id = this.add(p, r.id);
        if (prev >= 0) this.link(prev, id);
        if (i === 0 || i === pts.length - 1) ends.push(id);
        prev = id;
      });
    }
    const grid = new PointGrid(40);
    const byPos = new Map<string, number>();
    this.xs.forEach((x, i) => {
      grid.add(x, this.ys[i], i);
      byPos.set(`${x.toFixed(2)},${this.ys[i].toFixed(2)}`, i);
    });
    const nearestOther = (i: number, R: number) => {
      let best = -1, bd = R;
      grid.query(this.xs[i], this.ys[i], R, (x, y, j) => {
        if (this.road[j] === this.road[i]) return;
        const d = Math.hypot(x - this.xs[i], y - this.ys[i]);
        if (d < bd) {
          bd = d;
          best = j;
        }
      });
      return best;
    };
    for (const e of ends) {
      const j = nearestOther(e, 40);
      if (j >= 0) this.link(e, j);
    }
    for (let i = 0; i < this.xs.length; i++) {
      const j = nearestOther(i, 9);
      if (j >= 0) this.link(i, j);
    }
  }
  private add(p: Vec2, road: string) {
    this.xs.push(p[0]);
    this.ys.push(p[1]);
    this.road.push(road);
    this.adj.push([]);
    return this.xs.length - 1;
  }
  private link(a: number, b: number) {
    const w = Math.hypot(this.xs[a] - this.xs[b], this.ys[a] - this.ys[b]);
    this.adj[a].push({ to: b, w });
    this.adj[b].push({ to: a, w });
  }
  nearest(p: Vec2, filter?: (road: string) => boolean): number {
    let best = 0, bd = Infinity;
    for (let i = 0; i < this.xs.length; i++) {
      if (filter && !filter(this.road[i])) continue;
      const d = Math.hypot(this.xs[i] - p[0], this.ys[i] - p[1]);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }
  point(i: number): Vec2 {
    return [this.xs[i], this.ys[i]];
  }
  route(a: number, b: number, cost: (x: number, y: number, w: number) => number = (_x, _y, w) => w): Vec2[] {
    const n = this.xs.length;
    const g = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const heap = new MinHeap();
    g[a] = 0;
    heap.push(a, 0);
    while (heap.size) {
      const u = heap.pop();
      if (u === b) break;
      for (const e of this.adj[u]) {
        const mx = (this.xs[u] + this.xs[e.to]) / 2, my = (this.ys[u] + this.ys[e.to]) / 2;
        const ng = g[u] + cost(mx, my, e.w);
        if (ng < g[e.to]) {
          g[e.to] = ng;
          prev[e.to] = u;
          heap.push(e.to, ng);
        }
      }
    }
    const out: Vec2[] = [];
    for (let c = b; c >= 0; c = prev[c]) out.push(this.point(c));
    return out.reverse();
  }
}

// ============================================================================
// GLSL
// ============================================================================

const GLSL_COMMON = /* glsl */ `
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec3 ironbow(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.00, 0.00, 0.03), c1 = vec3(0.12, 0.02, 0.36), c2 = vec3(0.46, 0.03, 0.56), c3 = vec3(0.80, 0.13, 0.36);
  vec3 c4 = vec3(0.96, 0.42, 0.06), c5 = vec3(1.00, 0.76, 0.16), c6 = vec3(1.00, 0.98, 0.84);
  if (t < 0.18) return mix(c0, c1, t / 0.18);
  if (t < 0.36) return mix(c1, c2, (t - 0.18) / 0.18);
  if (t < 0.52) return mix(c2, c3, (t - 0.36) / 0.16);
  if (t < 0.68) return mix(c3, c4, (t - 0.52) / 0.16);
  if (t < 0.84) return mix(c4, c5, (t - 0.68) / 0.16);
  return mix(c5, c6, (t - 0.84) / 0.16);
}
// Map colour -> output for the active sensor: map (EO), IR ironbow, or the drone EO camera
// (low-light amplified mono at night, natural colour by day).
vec3 grade(vec3 c, float T) {
  vec3 o = c;
  if (uThermal > 0.5) o = ironbow(T);
  else if (uSensor > 0.5) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    vec3 lowLight = vec3(1.0 - exp(-l * 4.6)) * vec3(0.84, 0.93, 0.90);
    o = mix(lowLight, c * 1.05, uDayNight);
  }
  if (uSensor > 0.5) o += (hash12(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0) - 0.5) * 0.045;
  return o;
}
// THREE.FogExp2 formula; density and colour mirror scene.fog.
vec3 applyFog(vec3 c, float d) {
  float f = uFogDensity * d;
  return mix(c, uFogColor, 1.0 - exp(-f * f));
}
`;

const GLSL_DEM = /* glsl */ `
uniform sampler2D uDem;
uniform vec4 uDemInfo; // cols, rows, width, height
float demAt(vec2 xy) {
  vec2 g = vec2((xy.x / uDemInfo.z + 0.5) * (uDemInfo.x - 1.0), (0.5 - xy.y / uDemInfo.w) * (uDemInfo.y - 1.0));
  g = clamp(g, vec2(0.0), uDemInfo.xy - 1.001);
  ivec2 i = ivec2(floor(g)); vec2 f = g - vec2(i);
  float a = texelFetch(uDem, i, 0).r, b = texelFetch(uDem, i + ivec2(1, 0), 0).r;
  float c = texelFetch(uDem, i + ivec2(0, 1), 0).r, d = texelFetch(uDem, i + ivec2(1, 1), 0).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`;

// Time-of-arrival field. uArrInfo: on, front e-fold minutes, edge width px, fill on.
// Data row 0 (north edge) is uploaded as the top texture row, so muv (y = 1 at the north edge) samples directly.
const GLSL_FIELD = /* glsl */ `
uniform sampler2D uArr;
uniform vec4 uArrInfo;
uniform vec4 uArrTexel; // 1/cols, 1/rows, cell width m, cell height m
uniform float uClock;
float arrivalAt(vec2 muv) { return textureLod(uArr, muv, 0.0).r; }
`;

// Every colour shader declares these (uDayNight: 0 = night, 1 = day).
const SENSOR_UNIFORMS = /* glsl */ `
uniform float uThermal;
uniform float uSensor;
uniform float uTime;
uniform float uDayNight;
uniform vec3 uSun;
uniform vec3 uFogColor;
uniform float uFogDensity;
`;

const TERRAIN_VERT = /* glsl */ `
attribute vec4 aTerr;  // dh/dx, dh/dy(north), vegetation, rock
attribute float aZone; // 0 = data frame, -1 = context backdrop
uniform float uExag;
varying vec3 vW;
varying vec3 vN;
varying vec2 vCover;
varying float vZone;
varying float vDist;
void main() {
  float h = position.y;
  vec3 p = vec3(position.x, h * uExag, position.z);
  vW = vec3(position.x, h, -position.z);
  vN = vec3(-aTerr.x * uExag, 1.0, aTerr.y * uExag);
  vCover = aTerr.zw;
  vZone = aZone;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const TERRAIN_FRAG = /* glsl */ `
uniform sampler2D uFx;
uniform sampler2D uTint;
uniform sampler2D uTintPrev;
uniform float uTintFade;
uniform float uScale;
uniform vec3 uIsoT;     // contour offsets (minutes)
uniform vec3 uIsoOn;
uniform vec3 uIsoStyle; // 0 solid, 1 dashed, 2 dotted
uniform vec3 uIsoW;     // px
uniform vec3 uIsoC0;
uniform vec3 uIsoC1;
uniform vec3 uIsoC2;
uniform vec3 uEdgeC;
uniform vec2 uArrOrigin;
${GLSL_FIELD}
uniform vec2 uFrame;
uniform vec4 uGrat;
uniform float uTopo;
uniform float uContours;
uniform float uGraticule;
uniform float uElevMax;
${SENSOR_UNIFORMS}
varying vec3 vW;
varying vec3 vN;
varying vec2 vCover;
varying float vZone;
varying float vDist;
${GLSL_COMMON}
// AA contour of the arrival field at value v, dashed by arc length s around the origin.
float isoLine(float arr, float fwA, float v, float w, float style, float s) {
  float l = 1.0 - smoothstep(w * 0.5 - 0.5, w * 0.5 + 0.5, abs(arr - v) / fwA);
  if (style > 0.5) {
    float per = (style > 1.5 ? 8.0 : 22.0) * uScale;
    float on = (style > 1.5 ? 3.0 : 13.0) * uScale;
    float ph = mod(s, per);
    float sw = max(fwidth(s), 1e-3);
    l *= smoothstep(-sw, sw, on - ph) * smoothstep(-sw, sw, ph - sw * 0.5);
  }
  return l;
}
void main() {
  vec2 xy = vW.xz;
  float h = vW.y;
  vec3 n = normalize(vN);
  float context = step(vZone, -0.5);
  float inFrame = step(abs(xy.x), uFrame.x * 0.5) * step(abs(xy.y), uFrame.y * 0.5) * (1.0 - context);
  float veg = vCover.x, rock = vCover.y;
  float e = clamp(h / max(uElevMax, 1.0), 0.0, 1.0);
  float day = uDayNight;

  // --- night: matte slate ramp, multi-directional NW relief
  float s1 = max(dot(n, normalize(vec3(-1.0, 1.15, -1.0))), 0.0);
  float s2 = max(dot(n, normalize(vec3(-1.0, 1.4, 0.2))), 0.0);
  float s3 = max(dot(n, normalize(vec3(0.3, 1.6, -1.0))), 0.0);
  float shadeN = 0.6 * s1 + 0.25 * s2 + 0.15 * s3;
  vec3 cN = mix(vec3(0.039, 0.055, 0.078), vec3(0.110, 0.145, 0.188), smoothstep(0.0, 1.0, e));
  cN = mix(cN, cN * vec3(0.82, 1.05, 0.92), veg * 0.75);
  cN = mix(cN, vec3(0.155, 0.17, 0.19), rock * 0.6);
  cN *= 0.36 + 1.75 * shadeN;

  // --- day: 10:30 sun from the south-east, sky fill, natural cover palette
  float key = max(dot(n, uSun), 0.0);
  float fill = max(dot(n, normalize(vec3(-0.6, 1.0, -0.5))), 0.0);
  float lightD = 0.26 * (0.5 + 0.5 * n.y) + 0.92 * key + 0.16 * fill;
  vec3 sand = vec3(0.80, 0.72, 0.56), grass = vec3(0.70, 0.62, 0.43);
  vec3 sage = vec3(0.302, 0.384, 0.282), oak = vec3(0.227, 0.322, 0.251), granite = vec3(0.549, 0.627, 0.706);
  vec3 alb = mix(grass, sand, 1.0 - smoothstep(6.0, 45.0, h));
  alb = mix(alb, sage, smoothstep(0.18, 0.7, veg));
  alb = mix(alb, oak, smoothstep(0.72, 0.95, veg));
  alb = mix(alb, granite, smoothstep(0.35, 0.9, rock) * 0.6);
  alb *= mix(1.0, 1.06, e);
  vec3 cD = alb * lightD;

  vec3 c = mix(cN, cD, day);

  // Canopy stipple with screen-space LOD (keeps mean tone when it fades).
  vec2 sc = xy / 7.0;
  vec2 ic = floor(sc);
  float px = length(fwidth(sc));
  float lod = (1.0 - smoothstep(0.12, 0.3, px)) * (1.0 - context);
  float present = step(hash12(ic + 17.0), veg * 0.9);
  float dd = length(fract(sc) - 0.5 - (hash22(ic) - 0.5) * 0.5);
  float dotm = (1.0 - smoothstep(0.26 - px, 0.26 + px, dd)) * present;
  c *= mix(1.0 - 0.09 * veg, 1.0 - mix(0.42, 0.3, day) * dotm, lod);

  // Shallow water under the ocean plane (seen by the drone at grazing angles).
  float water = 1.0 - smoothstep(0.15, 0.6, h);
  c = mix(c, mix(vec3(0.020, 0.032, 0.050), vec3(0.165, 0.322, 0.431), day), water);

  // Overlay masks: tint (map only), burn scar (R), heat (G).
  vec2 muv = vec2(xy.x / uFrame.x + 0.5, xy.y / uFrame.y + 0.5);
  vec4 fx = texture2D(uFx, muv) * inFrame;
  vec4 tint = mix(texture2D(uTintPrev, muv), texture2D(uTint, muv), uTintFade) * inFrame;
  float burn = fx.r;
  float heat = fx.g;
  // Arrival field: reached ground and the emissive band behind the moving edge (physical).
  float arr = 1e5, fwA = 1.0, fOk = 0.0, since = -1e5;
  if (uArrInfo.x > 0.5 && inFrame > 0.5) {
    arr = arrivalAt(muv);
    since = uClock - arr;
    fwA = max(fwidth(arr), 1e-4);
    fOk = 1.0 - step(25.0, fwA);
    burn = max(burn, smoothstep(-0.5, 0.5, since / fwA) * uArrInfo.w * fOk);
    if (uArrInfo.y > 0.0) {
      // Head runs brighter than the flanks: rate of spread from the field gradient (m/min).
      vec2 tuv = vec2(muv.x, muv.y);
      float gx = (arrivalAt(tuv + vec2(uArrTexel.x, 0.0)) - arrivalAt(tuv - vec2(uArrTexel.x, 0.0))) / (2.0 * uArrTexel.z);
      float gy = (arrivalAt(tuv + vec2(0.0, uArrTexel.y)) - arrivalAt(tuv - vec2(0.0, uArrTexel.y))) / (2.0 * uArrTexel.w);
      float ros = 1.0 / max(length(vec2(gx, gy)), 1e-3);
      float inten = mix(0.3, 1.0, smoothstep(3.0, 13.0, ros));
      float band = exp(-max(since, 0.0) / uArrInfo.y) * (1.0 - smoothstep(0.0, 2.0, -since));
      heat = max(heat, band * inten * fOk);
    }
  }
  c = mix(c, tint.rgb, tint.a * (1.0 - uSensor));
  float ash = vnoise(xy / 9.0);
  vec3 charN = vec3(0.028, 0.030, 0.034) * (0.65 + 0.7 * shadeN);
  vec3 charD = vec3(0.17, 0.16, 0.15) * (0.45 + 0.7 * lightD);
  c = mix(c, mix(charN, charD, day) * (0.8 + 0.4 * ash), burn * 0.86);

  // 20 m contours, 100 m index contours; fade where they would crowd (< 3 px apart).
  float land = 1.0 - water;
  float e20 = h / 20.0;
  float f20 = max(fwidth(e20), 1e-5);
  float minorL = (1.0 - smoothstep(0.35, 1.25, abs(fract(e20 + 0.5) - 0.5) / f20)) * (1.0 - smoothstep(0.22, 0.45, f20));
  float e100 = h / 100.0;
  float f100 = max(fwidth(e100), 1e-5);
  float majorL = (1.0 - smoothstep(0.7, 1.7, abs(fract(e100 + 0.5) - 0.5) / f100)) * (1.0 - smoothstep(0.25, 0.5, f100));
  float cAmt = land * uContours * mix(1.0, 0.3, context);
  minorL *= cAmt;
  majorL *= cAmt;
  vec3 cc = mix(vec3(0.55, 0.64, 0.73), vec3(0.30, 0.22, 0.14), day);
  c = mix(c, cc, minorL * mix(0.12, 0.2, uTopo) * mix(1.0, 0.8, day));
  c = mix(c, cc, majorL * mix(0.26, 0.38, uTopo) * mix(1.0, 0.85, day));

  // Graticule (only meaningful in the top-down map).
  vec2 g = (xy - uGrat.xy) / uGrat.zw;
  vec2 gd = abs(fract(g + 0.5) - 0.5) / max(fwidth(g), vec2(1e-6));
  float gl = 1.0 - smoothstep(0.3, 1.2, min(gd.x, gd.y));
  c = mix(c, mix(vec3(0.42, 0.55, 0.68), vec3(0.22, 0.30, 0.40), day), gl * 0.2 * uGraticule * uTopo * (1.0 - uSensor));

  // Field annotations (map only): projected contours and the crisp edge at the scene time.
  if (fOk > 0.5) {
    float annot = (1.0 - uSensor) * mix(1.0, 0.85, day);
    vec2 od = xy - uArrOrigin;
    float s = atan(od.y, od.x) * length(od);
    vec3 cas = vec3(0.02, 0.025, 0.035);
    for (int k = 0; k < 3; k++) {
      if (uIsoOn[k] < 0.5) continue;
      float l = isoLine(arr, fwA, uClock + uIsoT[k], uIsoW[k], uIsoStyle[k], s);
      float lc = isoLine(arr, fwA, uClock + uIsoT[k], uIsoW[k] + 2.5, uIsoStyle[k], s);
      vec3 ic = k == 0 ? uIsoC0 : (k == 1 ? uIsoC1 : uIsoC2);
      c = mix(c, cas, lc * 0.55 * day * annot);
      c = mix(c, ic, l * 0.92 * annot);
    }
    if (uArrInfo.z > 0.0) {
      float e = isoLine(arr, fwA, uClock, uArrInfo.z, 0.0, 0.0);
      c = mix(c, uEdgeC, e * annot);
    }
  }

  // Fire: emissive glow along the active front plus flickering embers.
  vec2 eg = xy / 6.0;
  vec2 ei = floor(eg);
  float er = hash12(ei + 7.0);
  float eprob = burn * 0.03 + heat * 0.5;
  float epx = length(fwidth(eg));
  float elod = 1.0 - smoothstep(0.15, 0.4, epx);
  float ed = length(fract(eg) - 0.5 - (hash22(ei) - 0.5) * 0.5);
  float ember = step(er, eprob) * (1.0 - smoothstep(0.1, 0.1 + 1.5 * epx, ed)) * elod;
  float fl = 0.6 + 0.4 * sin(uTime * (3.0 + 4.0 * er) + er * 40.0);
  float glowAmt = heat * heat * (0.8 + 0.2 * sin(uTime * 2.3 + xy.x * 0.02 + xy.y * 0.017)) * mix(1.0, 0.6, day);
  vec3 fireC = vec3(1.0, 0.416, 0.0);
  c += fireC * glowAmt * 0.85;
  c = mix(c, mix(fireC, vec3(1.0, 0.75, 0.35), 0.4), ember * fl * 0.95);
  c += fireC * eprob * 0.18 * (1.0 - elod) * (1.0 - day * 0.5);

  // Context terrain beyond the data frame sits back in the haze.
  c = mix(c, uFogColor, context * 0.18);

  // Apparent temperature for the IR grade (sun-loaded slopes run warm by day).
  float T = 0.19 + 0.06 * n.z + 0.05 * rock - 0.025 * veg + 0.035 * (1.0 - e) + 0.02 * shadeN + day * 0.13 * key;
  T = mix(T, 0.12, water);
  T += burn * (0.13 + 0.07 * ash);
  T = mix(T, 0.55 + 0.45 * heat, smoothstep(0.02, 0.3, heat));
  T = max(T, ember * fl * 0.85);

  vec3 outc = grade(c, T);
  if (uThermal > 0.5 && uSensor < 0.5) outc = mix(outc, vec3(1.0), minorL * 0.05 + majorL * 0.12);
  float f = uFogDensity * vDist;
  outc = mix(outc, uFogColor, (1.0 - exp(-f * f)) * (uThermal > 0.5 ? 0.5 : 1.0));
  gl_FragColor = vec4(outc, 1.0);
}
`;

const OCEAN_VERT = /* glsl */ `
varying vec2 vXY;
varying vec3 vWP;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vXY = vec2(wp.x, -wp.z);
  vWP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const OCEAN_FRAG = /* glsl */ `
uniform sampler2D uCoast; // metres to the nearest land cell inside the data frame
uniform vec4 uCoastInfo;  // cols, rows, width, height
${SENSOR_UNIFORMS}
varying vec2 vXY;
varying vec3 vWP;
${GLSL_COMMON}
float coastAt(vec2 p) {
  // Outside the frame: distance at the nearest frame point plus the distance out to it.
  vec2 xy = clamp(p, -uCoastInfo.zw * 0.5, uCoastInfo.zw * 0.5);
  float outside = length(p - xy);
  vec2 g = vec2((xy.x / uCoastInfo.z + 0.5) * (uCoastInfo.x - 1.0), (0.5 - xy.y / uCoastInfo.w) * (uCoastInfo.y - 1.0));
  ivec2 i = ivec2(floor(g)); vec2 f = g - vec2(i);
  ivec2 m = ivec2(uCoastInfo.xy) - 1;
  float a = texelFetch(uCoast, min(i, m), 0).r, b = texelFetch(uCoast, min(i + ivec2(1, 0), m), 0).r;
  float c = texelFetch(uCoast, min(i + ivec2(0, 1), m), 0).r, d = texelFetch(uCoast, min(i + ivec2(1, 1), m), 0).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) + outside;
}
void main() {
  float day = uDayNight;
  float dist = coastAt(vXY);
  // Swell normal from a few drifting sines (static when motion is parked).
  vec2 p = vXY;
  float t = uTime;
  float wx = 0.035 * cos(p.x * 0.021 + p.y * 0.013 + t * 0.9) + 0.02 * cos(p.x * 0.061 - p.y * 0.047 + t * 1.7) + 0.012 * (vnoise(p / 7.0 + t * 0.3) - 0.5);
  float wz = 0.035 * cos(p.y * 0.019 - p.x * 0.011 + t * 0.8) + 0.02 * cos(p.y * 0.057 + p.x * 0.043 + t * 1.5) + 0.012 * (vnoise(p / 6.0 - t * 0.3) - 0.5);
  vec3 N = normalize(vec3(wx, 1.0, wz));
  vec3 V = normalize(cameraPosition - vWP);
  vec3 deep = mix(vec3(0.018, 0.030, 0.046), vec3(0.165, 0.322, 0.431), day);
  vec3 shallow = mix(vec3(0.030, 0.050, 0.068), vec3(0.24, 0.45, 0.53), day);
  vec3 c = mix(shallow, deep, smoothstep(15.0, 700.0, dist));
  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  c = mix(c, uFogColor, fres * mix(0.25, 0.45, day));
  vec3 Hs = normalize(V + uSun);
  float glint = pow(max(dot(N, Hs), 0.0), 220.0) * day * 1.4;
  vec3 moon = normalize(vec3(-0.45, 0.5, 0.75));
  float mglint = pow(max(dot(N, normalize(V + moon)), 0.0), 260.0) * (1.0 - day) * 0.35;
  c += vec3(1.0, 0.97, 0.9) * glint + vec3(0.55, 0.62, 0.72) * mglint;
  // Surf: a band of breaking foam hugging the shoreline.
  float band = 1.0 - smoothstep(4.0, 34.0, dist);
  float br = smoothstep(0.55, 1.0, sin(dist * 0.32 - t * 1.4 + vnoise(p / 40.0) * 6.0));
  float foam = band * (0.45 + 0.55 * br) * smoothstep(0.0, 3.0, dist);
  c = mix(c, mix(vec3(0.20, 0.25, 0.30), vec3(0.95, 0.97, 0.98), day), foam * mix(0.4, 0.85, day));
  vec3 o = grade(c, 0.13 + foam * 0.03);
  float f = uFogDensity * length(vWP - cameraPosition); // per fragment: the quad is 48 km wide
  o = mix(o, uFogColor, (1.0 - exp(-f * f)) * (uThermal > 0.5 ? 0.5 : 1.0));
  gl_FragColor = vec4(o, 1.0);
}
`;

const ROAD_VERT = /* glsl */ `
attribute vec2 aOff;
attribute vec4 aRoad; // half width (m), across, along (m), kind
uniform float uExag;
uniform float uMppA;
uniform float uMppB;
uniform float uBias;
uniform float uBiasOrtho;
varying float vAcross;
varying float vAlong;
varying float vKind;
varying float vPx;
varying float vDist;
${GLSL_DEM}
void main() {
  vec2 c = vec2(position.x, -position.z);
  float k = aRoad.w;
  float lift = k < 0.5 ? 1.7 : k < 1.5 ? 1.55 : k < 2.5 ? 1.45 : k < 3.5 ? 1.35 : 1.3;
  float minPx = k < 0.5 ? 3.4 : k < 1.5 ? 2.8 : k < 2.5 ? 2.4 : k < 3.5 ? 1.8 : 1.6;
  vec4 mc = modelViewMatrix * vec4(c.x, demAt(c) * uExag, -c.y, 1.0);
  float mpp = uMppA + uMppB * max(-mc.z, 1.0);
  float hw = max(aRoad.x, minPx * 0.5 * mpp);
  vec2 q = c + aOff * hw;
  vec4 mv = modelViewMatrix * vec4(q.x, demAt(q) * uExag + lift, -q.y, 1.0);
  if (projectionMatrix[2][3] == -1.0) mv.xyz *= (1.0 - uBias); else mv.z += uBiasOrtho;
  vAcross = aRoad.y;
  vAlong = aRoad.z;
  vKind = k;
  vPx = hw / mpp;
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const ROAD_FRAG = /* glsl */ `
${SENSOR_UNIFORMS}
varying float vAcross;
varying float vAlong;
varying float vKind;
varying float vPx;
varying float vDist;
${GLSL_COMMON}
void main() {
  float a = abs(vAcross);
  float aa = max(fwidth(vAcross), 1e-4);
  int k = int(vKind + 0.5);
  float day = uDayNight;
  vec3 fillN = k == 0 ? vec3(0.34, 0.39, 0.46) : k == 1 ? vec3(0.29, 0.34, 0.40) : k == 2 ? vec3(0.26, 0.31, 0.37) : k == 3 ? vec3(0.235, 0.275, 0.325) : vec3(0.24, 0.23, 0.21);
  vec3 fillD = k == 4 ? vec3(0.62, 0.53, 0.40) : k == 0 ? vec3(0.20, 0.26, 0.32) : vec3(0.227, 0.290, 0.361);
  vec3 fill = mix(fillN, fillD, day);
  vec3 casing = mix(vec3(0.016, 0.022, 0.03), vec3(0.90, 0.90, 0.87), day);
  float casW = vPx > 3.0 ? 0.78 : 0.64;
  float edge = smoothstep(casW - aa, casW + aa, a) * smoothstep(1.2, 2.2, vPx);
  vec3 c = mix(fill, casing, edge);
  if (k <= 1) {
    float dashOn = step(0.45, fract(vAlong / 24.0));
    float lw = k == 0 ? 0.05 : 0.07;
    float center = 1.0 - smoothstep(lw, lw + aa, a);
    c = mix(c, mix(vec3(0.70, 0.60, 0.36), vec3(0.93, 0.80, 0.36), day), center * dashOn * smoothstep(4.0, 7.0, vPx) * 0.8);
  }
  if (k == 4) c = mix(c * mix(0.5, 0.82, day), c, step(0.5, fract(vAlong / 12.0)));
  // Coverage from the half width in pixels keeps 1-2 px roads solid instead of fading out.
  float alpha = clamp((1.0 - a) * vPx + 0.5, 0.0, 1.0);
  vec3 o = grade(c * mix(1.0, 0.92 + 0.08 * uSun.y, day), 0.31 + day * 0.12);
  gl_FragColor = vec4(applyFog(o, vDist), alpha);
}
`;

const BUILDING_VERT = /* glsl */ `
attribute float aState;
attribute float aEmbed;
uniform float uExag;
varying vec3 vNrm;
varying vec2 vLoc;
varying vec2 vHalf;
varying float vState;
varying float vRoof;
varying float vDist;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  float base = instanceMatrix[3].y;
  float ht = length(instanceMatrix[1].xyz);
  wp.y = base * uExag + position.y * (ht + (uExag - 1.0) * aEmbed);
  vHalf = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[2].xyz)) * 0.5;
  vLoc = position.xz * vHalf * 2.0;
  vNrm = normalize(mat3(instanceMatrix) * normal);
  vRoof = normal.y;
  vState = aState;
  vec4 mv = viewMatrix * wp;
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const BUILDING_FRAG = /* glsl */ `
${SENSOR_UNIFORMS}
varying vec3 vNrm;
varying vec2 vLoc;
varying vec2 vHalf;
varying float vState;
varying float vRoof;
varying float vDist;
${GLSL_COMMON}
void main() {
  vec3 n = normalize(vNrm);
  float day = uDayNight;
  float shadeN = 0.32 + 0.68 * max(dot(n, normalize(vec3(-1.0, 1.15, -1.0))), 0.0) + 0.14 * max(dot(n, normalize(vec3(-1.0, 1.4, 0.2))), 0.0);
  float shadeD = 0.42 + 0.62 * max(dot(n, uSun), 0.0) + 0.12 * max(dot(n, normalize(vec3(-0.6, 1.0, -0.5))), 0.0);
  bool roof = vRoof > 0.5;
  vec3 roofC = mix(vec3(0.25, 0.30, 0.36), vec3(0.886, 0.910, 0.941) * (0.88 + 0.12 * shadeD), day);
  vec3 wallC = mix(vec3(0.15, 0.18, 0.22) * shadeN, vec3(0.80, 0.83, 0.87) * shadeD, day);
  vec3 c = roof ? roofC : wallC;
  float edgeD = min(vHalf.x - abs(vLoc.x), vHalf.y - abs(vLoc.y));
  float ew = max(fwidth(edgeD), 1e-4);
  float outline = (1.0 - smoothstep(ew * 0.6, ew * 1.7, edgeD)) * (roof ? 1.0 : 0.0);
  vec3 ol = mix(vec3(0.47, 0.55, 0.64), vec3(0.45, 0.50, 0.57), day);
  float olA = 0.55;
  if (vState > 1.5) {
    c = mix(vec3(0.045, 0.046, 0.05), vec3(0.20, 0.19, 0.18), day) * (roof ? 1.0 : mix(shadeN, shadeD, day));
    ol = vec3(1.0, 0.416, 0.0) * (0.55 + 0.45 * sin(uTime * 3.0 + vLoc.x * 0.7 + vLoc.y));
    olA = 0.9;
  } else if (vState > 0.5) {
    ol = mix(vec3(1.0, 0.54, 0.29), vec3(0.93, 0.42, 0.16), day);
    olA = 0.95;
  }
  c = mix(c, ol, outline * olA);
  float T = vState > 1.5 ? 0.6 : (roof ? 0.31 + day * 0.14 : 0.37);
  gl_FragColor = vec4(applyFog(grade(c, T), vDist), 1.0);
}
`;

// Low-poly trees and shrubs. Instances sit on the DEM; heights scale with uExag so
// they stay rooted on exaggerated relief. Burn-scar instances collapse to snags.
const VEG_VERT = /* glsl */ `
attribute float aTone;
uniform float uExag;
uniform float uKind; // 0 tree, 1 shrub
uniform sampler2D uFx;
uniform vec2 uFrame;
${GLSL_FIELD}
varying vec3 vNrm;
varying float vTone;
varying float vBurn;
varying float vHeat;
varying float vY;
varying float vDist;
void main() {
  vec3 base = instanceMatrix[3].xyz;
  vec2 muv = vec2(base.x / uFrame.x + 0.5, -base.z / uFrame.y + 0.5);
  vec4 fx = textureLod(uFx, muv, 0.0);
  vec3 p = position;
  float fb = 0.0, fh = 0.0;
  if (uArrInfo.x > 0.5 && abs(muv.x - 0.5) < 0.5 && abs(muv.y - 0.5) < 0.5) {
    float since = uClock - arrivalAt(muv);
    fb = step(0.0, since) * uArrInfo.w;
    fh = uArrInfo.y > 0.0 ? exp(-max(since, 0.0) / uArrInfo.y) * step(0.0, since) : 0.0;
  }
  float burnt = max(step(0.5, fx.r), fb);
  if (uKind < 0.5) p.xz *= mix(1.0, p.y > 0.3 ? 0.18 : 1.0, burnt);
  else p.y *= mix(1.0, 0.35, burnt);
  vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
  wp.y *= uExag;
  vNrm = normalize(mat3(instanceMatrix) * normal);
  vTone = aTone;
  vBurn = burnt;
  vHeat = max(fx.g, fh);
  vY = p.y;
  vec4 mv = viewMatrix * wp;
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const VEG_FRAG = /* glsl */ `
uniform float uKind;
${SENSOR_UNIFORMS}
varying vec3 vNrm;
varying float vTone;
varying float vBurn;
varying float vHeat;
varying float vY;
varying float vDist;
${GLSL_COMMON}
void main() {
  vec3 n = normalize(vNrm);
  float day = uDayNight;
  float shadeN = 0.35 + 0.65 * max(dot(n, normalize(vec3(-1.0, 1.15, -1.0))), 0.0);
  float shadeD = 0.34 + 0.8 * max(dot(n, uSun), 0.0) + 0.1 * max(n.y, 0.0);
  bool trunk = uKind < 0.5 && vY < 0.3;
  vec3 nightC = (uKind < 0.5 ? vec3(0.07, 0.105, 0.10) : vec3(0.085, 0.115, 0.105)) * (0.85 + 0.3 * vTone);
  vec3 dayC = (uKind < 0.5 ? vec3(0.227, 0.322, 0.251) : vec3(0.302, 0.384, 0.282)) * (0.82 + 0.36 * vTone);
  if (trunk) { nightC = vec3(0.06, 0.06, 0.065); dayC = vec3(0.30, 0.25, 0.20); }
  vec3 c = mix(nightC * shadeN * 1.6, dayC * shadeD, day);
  if (vBurn > 0.5) c = mix(vec3(0.03, 0.03, 0.032), vec3(0.14, 0.13, 0.12), day) * mix(shadeN, shadeD, day) + vec3(1.0, 0.42, 0.0) * vHeat * vHeat * 0.9;
  float T = vBurn > 0.5 ? 0.42 + 0.5 * vHeat : 0.16 + day * 0.05;
  gl_FragColor = vec4(applyFog(grade(c, T), vDist), 1.0);
}
`;

const HOTSPOT_VERT = /* glsl */ `
attribute float aI;
attribute float aSeed;
attribute vec2 aWin;
uniform float uClock;
uniform float uExag;
uniform float uPR;
uniform float uSize;
uniform float uBias;
uniform float uBiasOrtho;
uniform float uTime;
varying float vI;
void main() {
  vec3 p = position;
  p.y = p.y * uExag + 4.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  if (projectionMatrix[2][3] == -1.0) mv.xyz *= (1.0 - uBias); else mv.z += uBiasOrtho;
  gl_Position = projectionMatrix * mv;
  float fl = 0.85 + 0.15 * sin(uTime * (4.0 + aSeed * 5.0) + aSeed * 30.0);
  gl_PointSize = uSize * (0.55 + 0.75 * aI) * fl * uPR;
  if (uClock < aWin.x || uClock >= aWin.y) { gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }
  vI = aI;
}
`;

const HOTSPOT_FRAG = /* glsl */ `
uniform float uThermal;
uniform float uSensor;
uniform float uDayNight;
uniform float uOpacity;
varying float vI;
vec3 ironbow(float t);
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r = length(q);
  if (r > 1.0) discard;
  float core = 1.0 - smoothstep(0.16, 0.4, r);
  float glow = exp(-r * r * 4.0) * mix(0.55, 0.4, uDayNight);
  vec3 c = mix(vec3(1.0, 0.416, 0.0), vec3(1.0, 0.88, 0.6), core * vI);
  float a = clamp(core + glow, 0.0, 1.0);
  if (uThermal > 0.5) c = ironbow(0.7 + 0.3 * vI * (0.4 + 0.6 * core));
  else if (uSensor > 0.5) c = mix(c, vec3(1.0), 0.55);
  gl_FragColor = vec4(c, a * uOpacity);
}
vec3 ironbow(float t) {
  t = clamp(t, 0.0, 1.0);
  return t < 0.68 ? mix(vec3(0.80, 0.13, 0.36), vec3(0.96, 0.42, 0.06), clamp((t - 0.52) / 0.16, 0.0, 1.0))
       : t < 0.84 ? mix(vec3(0.96, 0.42, 0.06), vec3(1.00, 0.76, 0.16), (t - 0.68) / 0.16)
       : mix(vec3(1.00, 0.76, 0.16), vec3(1.00, 0.98, 0.84), (t - 0.84) / 0.16);
}
`;

const MARKER_VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aShape;
attribute float aSel;
attribute float aAlpha;
uniform float uPR;
varying vec3 vC;
varying float vShape;
varying float vSel;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  if (projectionMatrix[2][3] == -1.0) mv.xyz *= 0.996; else mv.z += 30.0;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPR * (1.0 + aSel * 0.35);
  vC = aColor;
  vShape = aShape;
  vSel = aSel;
  vA = aAlpha;
}
`;

const MARKER_FRAG = /* glsl */ `
varying vec3 vC;
varying float vShape;
varying float vSel;
varying float vA;
float sdf(vec2 p, float s) {
  if (s < 0.5) return length(p);
  if (s < 1.5) { p.y += 0.12; return max(abs(p.x) * 0.866 + p.y * 0.5, -p.y) * 1.55; }
  if (s < 2.5) return max(abs(p.x), abs(p.y)) * 1.12;
  if (s < 3.5) return (abs(p.x) + abs(p.y)) * 0.8;
  if (s < 4.5) return max(abs(p.x) * 0.866 + abs(p.y) * 0.5, abs(p.y)) * 1.1;
  p.y -= 0.1; return max(max(abs(p.x) * 1.15, p.y * 1.2), length(p - vec2(0.0, 0.05)) * 0.95); // shield
}
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  p.y = -p.y;
  if (vShape > 5.5) { // breadcrumb
    float r = length(p);
    float a = 1.0 - smoothstep(0.45, 0.85, r);
    if (a < 0.01 || vA < 0.01) discard;
    gl_FragColor = vec4(mix(vec3(0.039, 0.055, 0.078), vC, 1.0 - smoothstep(0.3, 0.55, r)), a * vA);
    return;
  }
  float d = sdf(p, vShape);
  float aa = max(fwidth(d), 1e-3);
  float fill = 1.0 - smoothstep(0.52 - aa, 0.52 + aa, d);
  float ring = 1.0 - smoothstep(0.84 - aa, 0.84 + aa, d);
  if (ring < 0.01) discard;
  vec3 c = mix(vec3(0.039, 0.055, 0.078), vC, fill);
  if (vSel > 0.5) c = mix(c, vec3(0.0, 0.9, 1.0), (1.0 - fill) * 0.9);
  gl_FragColor = vec4(c, ring * vA);
}
`;

const SEG_VERT = /* glsl */ `
attribute vec4 aColor;
varying vec4 vC;
void main() {
  vC = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const SEG_FRAG = /* glsl */ `
uniform float uDayNight;
varying vec4 vC;
void main() {
  // Grey stalks/orbits darken by day so they read against sunlit ground.
  float grey = step(0.3, vC.r);
  gl_FragColor = vec4(mix(vC.rgb, vec3(0.10, 0.14, 0.19), uDayNight * grey * 0.85), vC.a * mix(1.0, 1.25, uDayNight));
}
`;

// LineMaterial (Line2) patches: exaggeration + lift + depth bias in the vertex
// stage, and a replacement fragment stage with AA core, halo, dashes and
// arc-length chevrons. Cap triangles are dropped from the index (2 tris/segment).
const LINE_VERT_UNIFORMS = /* glsl */ `
uniform float uExag;
uniform float uLift;
uniform float uBias;
uniform float uBiasOrtho;
`;
const LINE_VERT_START = /* glsl */ `
vec3 iS = instanceStart; iS.y = iS.y * uExag + uLift;
vec3 iE = instanceEnd; iE.y = iE.y * uExag + uLift;
vec4 start = modelViewMatrix * vec4( iS, 1.0 );
vec4 end = modelViewMatrix * vec4( iE, 1.0 );
if ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ) { start.xyz *= ( 1.0 - uBias ); end.xyz *= ( 1.0 - uBias ); }
else { start.z += uBiasOrtho; end.z += uBiasOrtho; }
`;

const LINE_FRAG = /* glsl */ `
uniform float opacity;
uniform float linewidth;
uniform vec3 uColor;
uniform vec3 uColorLow;
uniform float uCore;
uniform float uGlow;
uniform float uStyle;
uniform vec2 uDash;
uniform float uPeriod;
uniform float uSpeed;
uniform float uScale;
uniform float uThermalT;
uniform float uHollow;
${SENSOR_UNIFORMS}
varying float vLineDistance;
varying vec2 vUv;
#include <color_pars_fragment>
${GLSL_COMMON}
void main() {
  float across = abs(vUv.x);
  float aa = max(fwidth(vUv.x), 1e-4);
  float core = 1.0 - smoothstep(uCore - aa, uCore + aa, across);
  // Proposed: hollow core (two rails), so a plan awaiting authorization never reads as lit.
  if (uHollow > 0.5) core *= smoothstep(uCore * 0.4 - aa, uCore * 0.4 + aa, across);
  float gx = clamp((across - uCore) / max(1.0 - uCore, 1e-3), 0.0, 1.0);
  float glow = uGlow * (1.0 - gx) * (1.0 - gx);
  float inten = 1.0;
  vec3 col = uColor;
  #ifdef USE_COLOR
    inten = vColor.r;
    col = mix(uColorLow, uColor, inten);
    glow *= mix(0.2, 1.0, inten);
  #endif
  float d = vLineDistance;
  float fw = max(length(vec2(dFdx(d), dFdy(d))), 1e-4);
  if (uStyle > 0.5 && uStyle < 1.5) {
    float per = (uDash.x + uDash.y) * uScale;
    float s = mod(d, per);
    float on = smoothstep(-fw, fw, uDash.x * uScale - s) * smoothstep(-fw, fw, s - fw * 0.5);
    core *= on;
    glow *= mix(0.3, 1.0, on);
  } else if (uStyle > 1.5) {
    float halfCore = linewidth * 0.5 * uCore * fw;
    float per = uPeriod * uScale;
    float s = d - uTime * uSpeed * uScale + (across / uCore) * halfCore * 1.4;
    float ph = fract(s / per);
    float e = fw * 1.2 / per;
    float band = smoothstep(0.0, e, ph) * (1.0 - smoothstep(0.24 - e, 0.24, ph));
    col = mix(col * 0.6, mix(col, vec3(1.0), 0.7), band);
  }
  float a = core + (1.0 - core) * glow;
  // Night halos glow in the line colour; by day the halo becomes a dark casing.
  vec3 o = mix(mix(col, vec3(0.03, 0.045, 0.065), uDayNight * 0.85), col, core);
  if (uThermal > 0.5 && uThermalT >= 0.0) o = ironbow(uThermalT * mix(0.62, 1.0, inten));
  else if (uSensor > 0.5) o = mix(o, vec3(1.0, 0.92, 0.8), 0.45);
  a *= opacity;
  if (a < 0.004) discard;
  gl_FragColor = vec4(o, a);
}
`;

// ============================================================================
// DOM styles (scoped with .tte-)
// ============================================================================

const ICONS: Record<string, string> = {
  engine: '<svg viewBox="0 0 10 10"><path d="M5 1.2 9 8.6H1z"/></svg>',
  crew: '<svg viewBox="0 0 10 10"><rect x="1.6" y="1.6" width="6.8" height="6.8"/></svg>',
  tender: '<svg viewBox="0 0 10 10"><path d="M5 .8 9.2 5 5 9.2.8 5z"/></svg>',
  dozer: '<svg viewBox="0 0 10 10"><path d="M5 .9 8.6 3v4L5 9.1 1.4 7V3z"/></svg>',
  drone: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.6"/></svg>',
  law: '<svg viewBox="0 0 10 10"><path d="M5 .8 8.8 2.2V5c0 2.2-1.6 3.6-3.8 4.3C2.8 8.6 1.2 7.2 1.2 5V2.2z"/></svg>',
  command: '<svg viewBox="0 0 10 10"><path d="M5 .8l1.2 2.7 2.9.3-2.2 1.9.7 2.9L5 7.1 2.4 8.6l.7-2.9L.9 3.8l2.9-.3z"/></svg>',
  hazard: '<svg viewBox="0 0 16 16"><path d="M8 1.5 15 14H1z" fill="currentColor"/><path d="M8 6v4M8 11.6v.9" stroke="#0A0E14" stroke-width="1.6" stroke-linecap="round"/></svg>',
  ignition: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2.2" fill="currentColor"/></svg>',
  staging: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.3"/><text x="8" y="11" text-anchor="middle" font-size="8" font-weight="700" fill="currentColor" font-family="sans-serif">S</text></svg>',
  info: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 7v4.2M8 4.6v.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  peak: '<svg viewBox="0 0 10 10"><path d="M5 1.5 9 8.5H1z"/></svg>',
  detection: '<svg viewBox="0 0 16 16"><path d="M8 1.5 14.5 8 8 14.5 1.5 8z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>',
  wind: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="rgba(10,14,20,.85)" stroke="currentColor" stroke-width="1"/><path d="M8 2.6v10.2M8 2.6 5.2 6M8 2.6 10.8 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  authority: '<svg viewBox="0 0 16 16"><rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="rgba(10,14,20,.85)" stroke="currentColor" stroke-width="1.3"/><path d="M4.6 8.3 7 10.6l4.6-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cut: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.6" fill="rgba(10,14,20,.85)" stroke="currentColor" stroke-width="1.3"/><path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  route: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.6" fill="rgba(10,14,20,.85)" stroke="currentColor" stroke-width="1.3"/><path d="M6.2 4.8 9.6 8l-3.4 3.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  focus: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><path d="M8 .8v2.6M8 12.6v2.6M.8 8h2.6M12.6 8h2.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  station: '<svg viewBox="0 0 16 16"><rect x="2.2" y="7.2" width="11.6" height="6.6" rx="1.4" fill="rgba(10,14,20,.85)" stroke="currentColor" stroke-width="1.2"/><path d="M4.6 7.2V5.6h6.8v1.6M8 5.6V2.6M6.2 3.7 8 2.6l1.8 1.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="10.5" r="1.2" fill="currentColor"/></svg>',
};

const STATUS_COLOR: Record<string, string> = { active: PALETTE.ok, enroute: PALETTE.warn, alert: PALETTE.red, standby: PALETTE.dim };

const CSS = `
.tte-root{position:relative;overflow:hidden;background:linear-gradient(180deg,var(--tte-sky-top,#020306) 0px,var(--tte-sky-hz,#0A1018) var(--tte-hz,40%),var(--tte-sky-hz,#0A1018) 100%);--tte-mono:"JetBrains Mono","IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--tte-sans:Inter,"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;font-family:var(--tte-sans);-webkit-font-smoothing:antialiased}
.tte-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none;cursor:grab}
.tte-root.is-dragging .tte-canvas{cursor:grabbing}
.tte-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden;user-select:none}
.tte-item{position:absolute;left:0;top:0;will-change:transform}
.tte-item[hidden]{display:none}
.tte-chip .tte-pill{position:absolute;bottom:calc(13px + var(--lift,0px));left:0;transform:translateX(calc(-50% + var(--dx,0px)));display:flex;align-items:center;gap:6px;height:22px;padding:0 8px 0 7px;background:rgba(10,14,20,.93);border:1px solid rgba(150,170,195,.26);border-radius:6px;color:#D7E0EA;font:500 11px/1 var(--tte-mono);letter-spacing:.01em;white-space:nowrap;pointer-events:auto;cursor:default;box-shadow:0 2px 12px rgba(0,0,0,.5);transition:border-color .15s,background .15s}
.tte-chip .tte-pill b{font-weight:600;color:#EEF3F8}
.tte-chip .tte-pill i{font-style:normal;color:#5B6878}
.tte-chip .tte-pill span{color:#9AA8B8}
.tte-chip .tte-pill em{display:none;font-style:normal;color:#7E8C9C;padding-left:6px;margin-left:2px;border-left:1px solid rgba(150,170,195,.22)}
.tte-chip .tte-pill:hover em{display:inline}
.tte-chip .tte-pill:hover{border-color:rgba(190,205,225,.5);z-index:2}
.tte-chip .tte-ico{width:9px;height:9px;flex:none;fill:var(--st);filter:drop-shadow(0 0 3px var(--st))}
.tte-chip .tte-stem{position:absolute;left:-.5px;bottom:1px;width:1px;height:calc(12px + var(--lift,0px));background:linear-gradient(rgba(150,170,195,.6),rgba(150,170,195,.15))}
.tte-chip[data-kind=drone] .tte-pill{cursor:pointer}
.tte-chip[data-kind=drone] .tte-stem{height:calc(9px + var(--lift,0px));bottom:4px}
.tte-chip.is-selected .tte-pill{border-color:rgba(0,229,255,.75);box-shadow:0 0 0 1px rgba(0,229,255,.25),0 0 18px rgba(0,229,255,.25)}
.tte-chip.is-occluded{opacity:.4}
.tte-label{transform:translate(-50%,-50%);color:#9AAABD;font:500 11px/1.25 var(--tte-sans);text-align:center;white-space:nowrap;text-shadow:0 0 3px #05070A,0 0 6px #05070A,0 0 10px #05070A}
.tte-label small{display:block;font:500 10px/1.2 var(--tte-mono);color:#6E7E91}
.tte-label[data-kind=peak]{transform:translate(-50%,-6px)}
.tte-label[data-kind=peak] svg{width:8px;height:8px;fill:#B8C4D2;margin-right:4px;vertical-align:0}
.tte-label[data-kind=place]{font:600 10px/1 var(--tte-sans);letter-spacing:.16em;color:#8C9BAD}
.tte-label[data-kind=area]{font:italic 500 11px/1 var(--tte-sans);color:#6F8196;letter-spacing:.03em}
.tte-label[data-kind=water]{font:italic 500 12px/1 var(--tte-sans);color:#4E6A86;letter-spacing:.12em}
.tte-label.is-occluded{opacity:.25}
.tte-day .tte-label{color:#1E2A36;text-shadow:0 0 2px rgba(255,255,255,.95),0 0 6px rgba(255,255,255,.85),0 0 10px rgba(255,255,255,.6)}
.tte-day .tte-label small{color:#3A4757}
.tte-day .tte-label[data-kind=peak] svg{fill:#2C3846}
.tte-day .tte-label[data-kind=place]{color:#2B3744}
.tte-day .tte-label[data-kind=area]{color:#3C4A3A}
.tte-day .tte-label[data-kind=water]{color:#1F4560}
.tte-day .tte-hud .tte-scale{color:#1E2A36}
.tte-day .tte-hud .tte-scale .bar{border-color:#1E2A36;background:linear-gradient(90deg,#1E2A36 0 50%,transparent 50% 100%);background-size:100% 2px;background-repeat:no-repeat;background-position:0 100%}
.tte-label.is-clashing{opacity:0}
.tte-label{transition:opacity .15s}
.tte-marker{color:#C9D3DF}
.tte-marker .tte-mk{position:absolute;left:0;top:0;transform:translate(-50%,-50%);width:18px;height:18px}
.tte-marker .tte-mk svg{width:18px;height:18px;display:block}
.tte-marker .tte-mt{position:absolute;left:14px;top:-10px;display:flex;flex-direction:column;gap:2px;padding:4px 7px;background:rgba(10,14,20,.9);border:1px solid rgba(150,170,195,.25);border-radius:5px;font:600 10px/1.15 var(--tte-mono);letter-spacing:.05em;white-space:nowrap}
.tte-marker .tte-mt span{font-weight:500;color:#8796A8;letter-spacing:.01em}
.tte-marker[data-icon=hazard]{color:#E5533C}
.tte-marker[data-icon=hazard] .tte-mt{border-color:rgba(229,83,60,.7);color:#FF8C78;box-shadow:0 0 16px rgba(229,83,60,.25)}
.tte-marker[data-icon=hazard] .tte-mk::after{content:"";position:absolute;inset:-9px;border:1.5px solid rgba(229,83,60,.7);border-radius:50%;animation:tte-pulse 1.8s ease-out infinite}
.tte-marker[data-icon=ignition]{color:#FF8A4A}
.tte-marker .tte-mk i{display:block;width:18px;height:18px}
.tte-marker[style*="--tone"]{color:var(--tone)}
.tte-marker[style*="--tone"] .tte-mt{border-color:color-mix(in srgb,var(--tone) 60%,transparent);color:color-mix(in srgb,var(--tone) 70%,#fff);box-shadow:0 0 14px color-mix(in srgb,var(--tone) 22%,transparent)}
.tte-marker.is-pulse .tte-mk::after{content:"";position:absolute;inset:-9px;border:1.5px solid var(--tone,#E5533C);border-radius:50%;animation:tte-pulse 1.8s ease-out infinite}
.tte-marker.is-proposed .tte-mt{border-style:dashed;background:rgba(10,14,20,.7);box-shadow:none}
.tte-marker.is-proposed .tte-mk{opacity:.75}
.tte-marker.is-draft{--tone:#FF8A4A;color:#FF8A4A}
.tte-marker.is-draft .tte-mt{border-style:dashed;border-color:rgba(255,138,74,.7);color:#FFB089;opacity:.85;box-shadow:none}
.tte-marker.is-compromised{color:#E5533C}
.tte-marker.is-compromised .tte-mt{border-color:rgba(229,83,60,.75);color:#FF8C78}
.tte-marker.is-interactive .tte-mt{pointer-events:auto;cursor:pointer}
.tte-marker.is-interactive .tte-mt:hover{filter:brightness(1.25)}
.tte-iso{transform:translate(-50%,-50%);font:600 10px/1 var(--tte-mono);color:var(--tone);background:rgba(10,14,20,.8);border:1px solid color-mix(in srgb,var(--tone) 55%,transparent);border-radius:3px;padding:2px 5px;white-space:nowrap;transition:opacity .15s}
.tte-iso.is-clashing{opacity:0}
.tte-day .tte-iso{background:rgba(255,255,255,.88)}
.tte-marker[data-icon=staging]{color:#9FB4C8}
.tte-marker[data-icon=station]{color:#8FA3B8}
.tte-marker[data-icon=station] .tte-mt{background:rgba(10,14,20,.78);font-weight:500;color:#9FB0C2}
.tte-marker[data-icon=focus]{color:var(--tone,#A99BFF)}
.tte-marker[data-icon=focus] .tte-mk::after{content:"";position:absolute;inset:-12px;border:1.5px solid var(--tone,#A99BFF);border-radius:50%;animation:tte-pulse 1.6s ease-out infinite}
.tte-marker[data-icon=focus] .tte-mt{border-color:color-mix(in srgb,var(--tone,#A99BFF) 70%,transparent);color:#E4DEFF;background:rgba(18,14,34,.92);box-shadow:0 0 18px color-mix(in srgb,var(--tone,#A99BFF) 30%,transparent)}
.tte-chip.is-hl .tte-pill{border-color:rgba(185,170,255,.9);box-shadow:0 0 0 1px rgba(185,170,255,.3),0 0 18px rgba(150,130,255,.4);z-index:3}
@keyframes tte-pulse{0%{transform:scale(.55);opacity:.9}100%{transform:scale(1.6);opacity:0}}
.tte-root.is-still .tte-marker .tte-mk::after,.tte-root.is-still .tte-rec{animation-play-state:paused}
.tte-ticks .tte-tick{position:absolute;font:500 10px/1 var(--tte-mono);color:#7F90A4;background:rgba(5,7,10,.78);padding:3px 5px;border:1px solid rgba(120,140,165,.22);border-radius:3px;white-space:nowrap}
.tte-hud .tte-compass{position:absolute;left:14px;top:14px;width:44px;height:44px;border-radius:50%;background:rgba(10,14,20,.86);border:1px solid rgba(150,170,195,.28);pointer-events:auto;cursor:pointer;display:grid;place-items:center}
.tte-hud .tte-compass svg{width:34px;height:34px;transition:transform .05s linear}
.tte-hud .tte-scale{position:absolute;right:16px;bottom:16px;font:500 10px/1 var(--tte-mono);color:#8FA0B3}
.tte-hud .tte-scale .bar{height:5px;border:1px solid #8FA0B3;border-top:none;margin-top:4px;background:linear-gradient(90deg,#8FA0B3 0 50%,transparent 50% 100%);background-size:100% 2px;background-repeat:no-repeat;background-position:0 100%}
.tte-hud .tte-scale .lbl{display:flex;justify-content:space-between;gap:12px}
.tte-pip{position:absolute;z-index:5;border-radius:10px;overflow:hidden;background:transparent;box-shadow:0 0 0 1px rgba(150,170,195,.3),0 18px 50px rgba(0,0,0,.6);animation:tte-pip-in .22s ease-out}
@keyframes tte-pip-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
.tte-pip-view{position:relative;width:100%;aspect-ratio:16/9;color:#E8EEF3;font:500 11px/1.35 var(--tte-mono);letter-spacing:.04em;text-shadow:0 0 4px rgba(0,0,0,.9),0 0 1px #000;cursor:move;touch-action:none;user-select:none}
.tte-pip-view .hud{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.tte-pip-view .hud *{vector-effect:non-scaling-stroke}
.tte-pip-view .tl{position:absolute;left:12px;top:10px}
.tte-pip-view .tr{position:absolute;right:12px;top:10px;text-align:right}
.tte-pip-view .bl{position:absolute;left:12px;bottom:10px}
.tte-pip-view .bc{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);text-align:center;white-space:nowrap}
.tte-pip-view .br{position:absolute;right:12px;bottom:10px;text-align:right}
.tte-pip-view .dim{color:rgba(232,238,243,.55)}
.tte-pip-view .tte-rec{color:#FF4D3D;animation:tte-blink 1.2s steps(2,start) infinite}
@keyframes tte-blink{to{visibility:hidden}}
.tte-pip-view .tape{position:absolute;left:50%;top:8px;width:46%;transform:translateX(-50%);height:30px;overflow:hidden}
.tte-pip-view .tape svg{width:100%;height:100%}
.tte-pip-view .ladder{position:absolute;right:12px;top:22%;height:56%;width:30px}
.tte-pip-view .ladder .mk{position:absolute;right:16px;transform:translateY(-50%);font-size:10px;white-space:nowrap}
.tte-pip-view .lock{position:absolute;width:34px;height:34px;transform:translate(-50%,-50%);border:1.5px solid rgba(255,255,255,.9);box-shadow:0 0 6px rgba(0,0,0,.6)}
.tte-pip-view .lock::before,.tte-pip-view .lock::after{content:"";position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border:1.5px solid #fff;border-radius:50%}
.tte-pip-view .lock::after{display:none}
.tte-pip-view .lock b{position:absolute;left:calc(100% + 8px);top:-3px;white-space:nowrap;font-weight:600;color:#fff;background:rgba(229,83,60,.85);padding:1px 5px;border-radius:2px;text-shadow:none}
.tte-pip-view .lock span{position:absolute;left:calc(100% + 8px);top:17px;white-space:nowrap;font-size:10px;color:rgba(255,255,255,.85)}
.tte-pip-view .legend{position:absolute;right:52px;top:22%;height:56%;width:7px;display:none;border:1px solid rgba(255,255,255,.4);background:linear-gradient(to top,#000008,#1F055C,#75088F,#CC215C,#F56B0F,#FFC229,#FFFAD6)}
.tte-pip-view .legend i{position:absolute;right:11px;font-style:normal;font-size:9px;transform:translateY(-50%)}
.tte-pip.is-ir .legend{display:block}
.tte-pip-bar{display:flex;align-items:center;gap:8px;height:44px;padding:0 8px 0 14px;background:#0B0F15;border-top:1px solid rgba(150,170,195,.16);color:#D7E0EA;font:500 13px/1 var(--tte-sans);cursor:move;touch-action:none;user-select:none}
.tte-pip-bar .ttl b{font-weight:600}
.tte-pip-bar .ttl span{color:#7E8C9C;margin-left:6px}
.tte-pip-bar .seg{display:flex;background:#141A22;border-radius:7px;padding:3px;margin-left:8px}
.tte-pip-bar button{appearance:none;border:0;background:transparent;color:#AEB9C6;font:600 12px/1 var(--tte-sans);padding:7px 10px;border-radius:5px;cursor:pointer}
.tte-pip-bar button:hover{color:#fff}
.tte-pip-bar button:focus-visible{outline:2px solid #00E5FF;outline-offset:1px}
.tte-pip-bar .seg button.on{background:#E5533C;color:#fff}
.tte-pip-bar .sp{flex:1}
.tte-pip-bar .zoom{font:500 12px/1 var(--tte-mono);min-width:38px;text-align:center;color:#C6D0DB}
.tte-pip-bar .ico{font-size:17px;padding:6px 8px;line-height:1}
.tte-pip.is-docked{position:relative;left:auto;top:auto;width:100%;height:100%;border-radius:inherit;box-shadow:none;animation:none;z-index:auto}
.tte-pip.is-docked .tte-pip-view{aspect-ratio:auto;height:100%;cursor:default}
.tte-pip.is-compact .tte-pip-view{font-size:9px;line-height:1.3}
.tte-pip.is-compact .tape,.tte-pip.is-compact .ladder,.tte-pip.is-compact .legend{display:none}
.tte-pip.is-compact .tl{left:8px;top:7px}.tte-pip.is-compact .tr{right:8px;top:7px}.tte-pip.is-compact .bl{left:8px;bottom:7px}.tte-pip.is-compact .br{right:8px;bottom:7px}.tte-pip.is-compact .bc{bottom:7px}
.tte-pip.is-compact .lock{width:26px;height:26px}
`;

// ============================================================================
// Engine
// ============================================================================

interface CamState {
  tx: number;
  ty: number;
  h: number; // visible height (m) at the target
  pitch: number; // degrees from nadir
  bearing: number; // degrees, screen-up compass direction
  fov: number;
}

interface Tween<T> {
  from: T;
  to: T;
  t0: number;
  dur: number;
  done?: () => void;
}

interface LayerRec {
  id: string;
  spec: OverlaySpec;
  visible: boolean;
  objects: THREE.Object3D[];
  els: { el: HTMLElement; pos: Vec2; lift: number; occlusion: boolean; hide?: boolean }[];
  /** 0..1 fade multiplier. */
  alpha: number;
  /** 0..1 emphasis multiplier (focus + context), tweened separately from fades. */
  dim: number;
}

interface FieldRec {
  id: string;
  spec: FieldOverlaySpec;
  data: Float32Array;
  tex: THREE.DataTexture;
  origin: Vec2;
}

interface GimbalInfo {
  heading: number;
  pitch: number;
  range: number;
  tgt: Vec2;
  tz: number;
  hfov: number;
}

interface UnitRec {
  spec: UnitSpec;
  el: HTMLElement;
  pos: THREE.Vector3;
  /** Current ground anchor (track, patrol or fixed position). */
  orbitCenter: Vec2;
  agl: number; // metres above the anchor's ground (drones)
  patrolLen: number;
}

function sharedUniforms() {
  return {
    uExag: { value: 1 },
    uTime: { value: 0 },
    uThermal: { value: 0 },
    uSensor: { value: 0 },
    uTopo: { value: 1 },
    uContours: { value: 1 },
    uGraticule: { value: 1 },
    uMppA: { value: 1 },
    uMppB: { value: 0 },
    uPR: { value: 1 },
    uScale: { value: 4 },
    uFogColor: { value: hexToVec3('#0A1018') },
    uFogDensity: { value: 0 },
    uDayNight: { value: 0 },
    uClock: { value: 0 },
    uTintFade: { value: 1 },
    // 10:30 sun from the south-east (azimuth 125°, elevation 52°), scene axes.
    uSun: { value: new THREE.Vector3(Math.sin(125 * DEG) * Math.cos(52 * DEG), Math.sin(52 * DEG), -Math.cos(125 * DEG) * Math.cos(52 * DEG)) },
  };
}
type Shared = ReturnType<typeof sharedUniforms>;

/** Uniforms of the (single) time-of-arrival field, shared by the terrain and vegetation. */
function fieldUniforms(clock: { value: number }) {
  const blank = new THREE.DataTexture(new Uint16Array([THREE.DataUtils.toHalfFloat(1e4)]), 1, 1, THREE.RedFormat, THREE.HalfFloatType);
  blank.needsUpdate = true;
  return {
    uArr: { value: blank as THREE.DataTexture },
    uArrInfo: { value: new THREE.Vector4(0, 0, 0, 0) },
    uArrTexel: { value: new THREE.Vector4(1, 1, 1, 1) },
    uClock: clock,
    uIsoT: { value: new THREE.Vector3(15, 30, 60) },
    uIsoOn: { value: new THREE.Vector3(0, 0, 0) },
    uIsoStyle: { value: new THREE.Vector3(0, 1, 2) },
    uIsoW: { value: new THREE.Vector3(2, 2, 2) },
    uIsoC0: { value: hexToVec3(PALETTE.fire) },
    uIsoC1: { value: hexToVec3(PALETTE.fire) },
    uIsoC2: { value: hexToVec3(PALETTE.red) },
    uEdgeC: { value: hexToVec3(PALETTE.fire) },
    uArrOrigin: { value: new THREE.Vector2() },
  };
}

const TONE: Record<Tone, string> = { amber: '#FF8A4A', red: '#E5533C', cyan: '#00E5FF', fire: '#FF6A00', ok: '#3DDC84', slate: '#9FB4C8', warn: '#FFB020', violet: '#A99BFF' };

class TacticalTerrainEngine implements Engine {
  private container: HTMLElement;
  private opts: Required<Pick<EngineOptions, 'pixelRatioCap' | 'motionIdleMs' | 'hud'>> & { timeLabel: { day: string; night: string } };
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private persp = new THREE.PerspectiveCamera(TACTICAL.fov, 1, 10, 50000);
  private ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 20000);
  private pipCam = new THREE.PerspectiveCamera(30, 16 / 9, 2, 8000);
  private active: THREE.Camera = this.ortho;
  private U: Shared = sharedUniforms();

  private world!: WorldData;
  private hf!: Heightfield;
  private geo!: GeoProjection;
  private smoothDem!: Float32Array;
  private analysis!: ReturnType<typeof analyseTerrain>;
  private worldGroup = new THREE.Group();
  private terrain!: THREE.Mesh;
  private demTex!: THREE.DataTexture;
  private roadsMesh: THREE.Mesh | null = null;
  private buildings: THREE.InstancedMesh | null = null;
  private buildingCentroids: Vec2[] = [];
  private fxCanvas = document.createElement('canvas');
  private tintCanvas = document.createElement('canvas');
  private fxTex: THREE.CanvasTexture;
  private tintTex: THREE.CanvasTexture;
  private terrainMat!: THREE.ShaderMaterial;
  private roadMat!: THREE.ShaderMaterial;
  private buildingMat!: THREE.ShaderMaterial;
  private ocean: THREE.Mesh | null = null;
  private oceanMat: THREE.ShaderMaterial | null = null;
  private coastTex: THREE.DataTexture | null = null;
  private vegMeshes: THREE.InstancedMesh[] = [];
  private vegMat: THREE.ShaderMaterial | null = null;
  private vegOption: { trees?: number; shrubs?: number } | false = {};
  private lighting: LightingMode = 'night';
  private dayTween: Tween<number> | null = null;
  private F = fieldUniforms(this.U.uClock);
  private field: FieldRec | null = null;
  private clock = 0;
  private clockTween: Tween<number> | null = null;
  private fades: { rec: LayerRec; tw: Tween<number>; out: boolean }[] = [];
  private tintPrevCanvas = document.createElement('canvas');
  private tintPrevTex: THREE.CanvasTexture;
  private tintFadeTween: Tween<number> | null = null;
  private tintFadeReq = 0;
  private timeLabel: string | null = null;
  private statsCache: { clock: number; v: FieldStats } | null = null;
  private emphasis: Set<string> | null = null;
  private dimTweens = new Map<LayerRec, Tween<number>>();
  private insets: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  private insetTween: Tween<ViewInsets> | null = null;
  private lastView = '';

  private layers = new Map<string, LayerRec>();
  private baseVisible: Record<string, boolean> = { contours: true, graticule: true, roads: true, buildings: true, units: true, drones: true, vegetation: true };
  private units: UnitRec[] = [];
  private markerPoints: THREE.Points | null = null;
  private segLines: THREE.LineSegments | null = null;

  // DOM
  private canvas: HTMLCanvasElement;
  private overlay: HTMLDivElement;
  private labelLayer: HTMLDivElement;
  private markerLayer: HTMLDivElement;
  private chipLayer: HTMLDivElement;
  private tickLayer: HTMLDivElement;
  private hudLayer: HTMLDivElement;
  private compassSvg: SVGElement | null = null;
  private scaleEl: HTMLDivElement | null = null;
  private tickPool: HTMLDivElement[] = [];

  // camera
  private mode: CameraMode = 'topdown';
  private useOrtho = true;
  private cam: CamState = { tx: 0, ty: 0, h: 3400, pitch: 0, bearing: 0, fov: ORTHO_FOV };
  private camTween: Tween<CamState> | null = null;
  private exag = 1;
  private exagTween: Tween<number> | null = null;
  private thermal = false;
  private targetZ = 0;

  // PiP
  private pip: { drone: UnitRec; el: HTMLDivElement; view: HTMLDivElement; sensor: 'eo' | 'ir'; zoom: number; opened: number; refs: Record<string, HTMLElement>; hosted: boolean; host: HTMLElement | null } | null = null;
  private pipOnUnitClick = true;

  // loop
  private rafId = 0;
  private timer = 0;
  private lastFrame = 0;
  private animTime = 0;
  private motion = true;
  private parked = false;
  private pageVisible = true;
  private onScreen = true;
  private lastInput = performance.now();
  private frameTimes: number[] = [];
  private frames = 0;
  private stats = { main: { drawCalls: 0, triangles: 0 }, pip: null as null | { drawCalls: number; triangles: number }, cpu: 0 };
  private width = 1;
  private height = 1;
  private listeners = new Map<EngineEvent, Set<(p: any) => void>>();
  private cleanup: (() => void)[] = [];
  private disposed = false;
  private maskDirty = true;
  private gratStep = 0.005;
  private sizeCache = new WeakMap<HTMLElement, [number, number]>();

  constructor(container: HTMLElement, options: EngineOptions = {}) {
    this.container = container;
    this.opts = {
      pixelRatioCap: options.pixelRatioCap ?? 1.25,
      motionIdleMs: options.motionIdleMs ?? 45000,
      hud: options.hud ?? true,
      timeLabel: typeof options.timeLabel === 'string' ? { day: options.timeLabel, night: options.timeLabel } : options.timeLabel ?? { day: 'AUG 15, 10:30 PDT', night: 'AUG 15, 03:00 PDT' },
    };
    this.vegOption = options.vegetation === false ? false : options.vegetation ?? {};
    this.pipOnUnitClick = options.pipOnUnitClick ?? true;
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.motion = options.motion ?? !reduced;

    if (!document.getElementById('tte-styles')) {
      const st = document.createElement('style');
      st.id = 'tte-styles';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.classList.add('tte-root');

    // Transparent clear: the sky is a CSS gradient behind the canvas (0 draw calls).
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.opts.pixelRatioCap));
    this.renderer.setClearColor(0x000000, 0);
    this.scene.fog = new THREE.FogExp2(0x0a1018, 0);
    this.renderer.info.autoReset = false;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'tte-canvas';
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('aria-label', 'Tactical terrain map');
    container.appendChild(this.canvas);

    const mk = (cls: string) => {
      const d = document.createElement('div');
      d.className = cls;
      return d;
    };
    this.overlay = mk('tte-layer');
    this.labelLayer = mk('tte-layer tte-labels');
    this.markerLayer = mk('tte-layer tte-markers');
    this.chipLayer = mk('tte-layer tte-chips');
    this.tickLayer = mk('tte-layer tte-ticks');
    this.hudLayer = mk('tte-layer tte-hud');
    this.overlay.append(this.labelLayer, this.markerLayer, this.chipLayer, this.tickLayer, this.hudLayer);
    container.appendChild(this.overlay);
    if (this.opts.hud) this.buildHud();

    this.fxCanvas.width = this.tintCanvas.width = this.tintPrevCanvas.width = 2048;
    this.fxCanvas.height = this.tintCanvas.height = this.tintPrevCanvas.height = 1110;
    this.fxTex = new THREE.CanvasTexture(this.fxCanvas);
    this.tintTex = new THREE.CanvasTexture(this.tintCanvas);
    this.tintPrevTex = new THREE.CanvasTexture(this.tintPrevCanvas);
    for (const t of [this.fxTex, this.tintTex, this.tintPrevTex]) {
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 4;
    }

    this.scene.add(this.worldGroup);
    this.persp.layers.enable(1);
    this.persp.layers.enable(2);
    this.ortho.layers.enable(1);
    this.ortho.layers.enable(2);
    this.pipCam.layers.set(0);
    this.pipCam.layers.enable(2);

    this.bindEvents();
    this.resize();
    // Chip boxes are measured once; re-measure when the web fonts arrive.
    document.fonts?.ready.then(() => {
      this.sizeCache = new WeakMap();
      this.invalidate();
    });

    this.lighting = options.lighting ?? 'night';
    this.U.uDayNight.value = this.lighting === 'day' ? 1 : 0;
    this.onLightingChanged();
    const world = options.world ?? generateProceduralWorld(options.seed);
    this.loadWorld(world);
    this.fitAll();
    if ((options.view ?? 'topdown') === 'perspective') this.setCamera('perspective', 0);
    this.invalidate();
  }

  // ------------------------------------------------------------------ public API

  setCamera(mode: CameraMode, durationMs = 1200): void {
    this.touch();
    const from = this.tweenStart();
    this.mode = mode;
    this.useOrtho = false;
    if (mode === 'perspective') {
      const to: CamState = { ...from, pitch: TACTICAL.pitch, bearing: TACTICAL.bearing, fov: TACTICAL.fov, h: from.h * 0.92 };
      this.startCamTween(from, to, durationMs);
    } else {
      const to: CamState = { ...from, pitch: 0, bearing: 0, fov: ORTHO_FOV };
      this.startCamTween(from, to, durationMs, () => {
        if (this.mode === 'topdown') this.useOrtho = true;
      });
    }
    this.emit('camera', mode);
  }

  /** Current camera as a perspective state (the ortho camera maps to a ~3° FOV nadir view). */
  private tweenStart(): CamState {
    const from = { ...this.cam };
    if (this.useOrtho) {
      from.fov = ORTHO_FOV;
      from.pitch = 0;
    }
    return from;
  }

  getCameraMode(): CameraMode {
    return this.mode;
  }

  setThermal(on: boolean): void {
    this.touch();
    this.thermal = on;
    this.invalidate();
  }

  setLighting(mode: LightingMode, durationMs = 1200): void {
    this.touch();
    this.lighting = mode;
    const to = mode === 'day' ? 1 : 0;
    if (durationMs <= 0) {
      this.dayTween = null;
      this.U.uDayNight.value = to;
      this.onLightingChanged();
    } else this.dayTween = { from: this.U.uDayNight.value, to, t0: performance.now(), dur: durationMs };
    this.emit('lighting', mode);
    this.invalidate();
  }

  getLighting(): LightingMode {
    return this.lighting;
  }

  /** Sky gradient, haze colour and DOM theme follow uDayNight. */
  private onLightingChanged() {
    const d = this.U.uDayNight.value;
    const mixHex = (a: string, b: string) => {
      const A = hexToVec3(a), B = hexToVec3(b);
      return A.lerp(B, d);
    };
    const hz = mixHex('#0A1018', '#CBD7E0');
    const top = mixHex('#020306', '#6F95B9');
    this.U.uFogColor.value.copy(hz);
    (this.scene.fog as THREE.FogExp2).color.setRGB(hz.x, hz.y, hz.z, THREE.SRGBColorSpace);
    const css = (v: THREE.Vector3) => `rgb(${Math.round(v.x * 255)},${Math.round(v.y * 255)},${Math.round(v.z * 255)})`;
    this.container.style.setProperty('--tte-sky-hz', css(hz));
    this.container.style.setProperty('--tte-sky-top', css(top));
    this.container.classList.toggle('tte-day', d > 0.5);
  }

  setVerticalExaggeration(scale: number, durationMs = 700): void {
    this.touch();
    scale = clamp(scale, 0.5, 5);
    if (durationMs <= 0) {
      this.exag = scale;
      this.exagTween = null;
      this.onExagChanged();
    } else this.exagTween = { from: this.exag, to: scale, t0: performance.now(), dur: durationMs };
    this.invalidate();
  }

  setOverlayLayer(id: string, spec: OverlaySpec | null, opts: { fadeMs?: number } = {}): void {
    this.touch();
    const fade = Math.max(0, opts.fadeMs ?? 0);
    const old = this.layers.get(id);
    if (old && fade > 0 && !this.disposed) {
      // Keep the old objects on screen and fade them out; masks cross-fade as a whole.
      this.layers.delete(id);
      if (old.spec.type === 'polygon' || (old.spec.type === 'line' && (old.spec.heat || old.spec.drape))) {
        this.maskDirty = true;
        this.tintFadeReq = Math.max(this.tintFadeReq, fade);
      }
      if (old.spec.type === 'polygon' && old.spec.structures) this.updateBuildingStates();
      if (old.spec.type === 'field') this.detachField(old.id);
      this.fades = this.fades.filter((f) => f.rec !== old);
      this.fades.push({ rec: old, tw: { from: old.alpha, to: 0, t0: performance.now(), dur: fade }, out: true });
    } else this.removeLayer(id);
    if (!spec) {
      this.invalidate();
      return;
    }
    const rec: LayerRec = { id, spec, visible: spec.visible !== false, objects: [], els: [], alpha: 1, dim: this.dimTarget(id) };
    this.layers.set(id, rec);
    this.buildLayer(rec);
    if (fade > 0) {
      if (spec.type === 'polygon' || (spec.type === 'line' && (spec.heat || spec.drape))) this.tintFadeReq = Math.max(this.tintFadeReq, fade);
      this.setLayerAlpha(rec, 0);
      this.fades.push({ rec, tw: { from: 0, to: 1, t0: performance.now(), dur: fade }, out: false });
    } else if (rec.dim < 1) this.setLayerAlpha(rec, 1);
    this.invalidate();
  }

  setLayerState(id: string, state: LayerState): void {
    const rec = this.layers.get(id);
    if (!rec || (rec.spec.state ?? 'committed') === state) return;
    this.touch();
    rec.spec = { ...rec.spec, state } as OverlaySpec;
    const s = rec.spec;
    if (s.type === 'line') {
      for (const o of rec.objects) if (o instanceof Line2) this.styleLine(o, s);
      if (s.drape) this.maskDirty = true;
    } else if (s.type === 'polygon') {
      for (const o of rec.objects) if (o instanceof Line2 && s.stroke) this.styleLine(o, { type: 'line', points: [], ...s.stroke, state });
      this.maskDirty = true;
    }
    for (const e of rec.els) for (const st of ['proposed', 'draft', 'compromised']) e.el.classList.toggle(`is-${st}`, state === st);
    this.invalidate();
  }

  getOverlayLayerIds(): string[] {
    return [...this.layers.keys()];
  }

  setSceneTime(minutes: number, durationMs = 0): void {
    this.touch();
    if (durationMs <= 0 || !Number.isFinite(this.clock)) {
      this.clockTween = null;
      this.clock = minutes;
      this.onClockChanged();
    } else this.clockTween = { from: this.clock, to: minutes, t0: performance.now(), dur: durationMs };
    this.invalidate();
  }

  getSceneTime(): number {
    return this.clock;
  }

  setTimeLabel(label: string): void {
    this.timeLabel = label;
    if (this.pip) this.pip.refs.clock.textContent = label;
  }

  getFieldStats(): FieldStats | null {
    const f = this.field;
    if (!f) return null;
    if (this.statsCache && this.statsCache.clock === this.clock) return this.statsCache.v;
    let n = 0;
    for (let i = 0; i < f.data.length; i++) if (f.data[i] <= this.clock) n++;
    const cell = (this.hf.width / f.spec.cols) * (this.hf.height / f.spec.rows);
    let threatened = 0, destroyed = 0;
    const attr = this.buildings?.geometry.getAttribute('aState') as THREE.InstancedBufferAttribute | undefined;
    if (attr) for (let i = 0; i < attr.count; i++) attr.getX(i) > 1.5 ? destroyed++ : attr.getX(i) > 0.5 ? threatened++ : 0;
    const v = { reachedArea: n * cell, threatened, destroyed, structures: this.buildingCentroids.length };
    this.statsCache = { clock: this.clock, v };
    return v;
  }

  pickLayer(clientX: number, clientY: number, tolerancePx = 9): string | null {
    const cr = this.canvas.getBoundingClientRect();
    const px = clientX - cr.left, py = clientY - cr.top;
    const v = new THREE.Vector3();
    const toScreen = (p: Vec2, lift: number): Vec2 | null => {
      v.set(p[0], this.hf.sample(p[0], p[1]) * this.exag + lift, -p[1]).project(this.active);
      if (v.z > 1 || v.z < -1) return null;
      return [((v.x + 1) / 2) * this.width, ((1 - v.y) / 2) * this.height];
    };
    let best: string | null = null, bd = tolerancePx;
    for (const rec of [...this.layers.values()].reverse()) {
      const s = rec.spec;
      if (!rec.visible || !s.interactive) continue;
      if (s.type === 'marker') {
        const r = rec.els[0]?.el.getBoundingClientRect();
        if (r && r.width && clientX >= r.left - 6 && clientX <= r.right + 6 && clientY >= r.top - 6 && clientY <= r.bottom + 6) return rec.id;
      } else if (s.type === 'line') {
        const pts = resampleUniform(s.points, 25);
        let prev: Vec2 | null = null;
        for (const p of pts) {
          const q = toScreen(p, s.lift ?? 3);
          if (q && prev) {
            const d = distPointSeg(px, py, prev[0], prev[1], q[0], q[1]);
            if (d < bd) {
              bd = d;
              best = rec.id;
            }
          }
          prev = q;
        }
      }
    }
    return best;
  }

  setLayerVisible(id: string, visible: boolean): void {
    this.touch();
    if (id in this.baseVisible) {
      this.baseVisible[id] = visible;
      if (id === 'roads' && this.roadsMesh) this.roadsMesh.visible = visible;
      if (id === 'buildings' && this.buildings) this.buildings.visible = visible;
      if (id === 'vegetation') for (const m of this.vegMeshes) m.visible = visible;
      if (id === 'units' || id === 'drones') this.rebuildUnitGraphics();
    } else {
      const rec = this.layers.get(id);
      if (!rec) return;
      rec.visible = visible;
      for (const o of rec.objects) o.visible = visible;
      for (const e of rec.els) e.el.hidden = !visible;
      if (rec.spec.type === 'polygon' || (rec.spec.type === 'line' && (rec.spec.heat || rec.spec.drape))) this.maskDirty = true;
      if (rec.spec.type === 'polygon' && rec.spec.structures) this.updateBuildingStates();
      if (rec.spec.type === 'field') {
        this.applyFieldUniforms();
        this.onFieldChanged();
      }
    }
    this.invalidate();
  }

  isLayerVisible(id: string): boolean {
    if (id in this.baseVisible) return this.baseVisible[id];
    return this.layers.get(id)?.visible ?? false;
  }

  setUnits(units: UnitSpec[]): void {
    this.touch();
    for (const u of this.units) u.el.remove();
    this.units = units.map((spec) => this.makeUnit(spec));
    this.rebuildUnitGraphics();
    if (this.pip) {
      const d = this.units.find((u) => u.spec.id === this.pip!.drone.spec.id);
      if (d) this.pip.drone = d;
      else this.closeDronePip();
    }
    this.invalidate();
  }

  openDronePip(droneId: string, opts: PipOptions = {}): void {
    this.touch();
    const drone = this.units.find((u) => u.spec.id === droneId && u.spec.kind === 'drone');
    if (!drone) throw new Error(`openDronePip: no drone "${droneId}"`);
    if (this.pip) {
      if (this.pip.drone === drone && this.pip.host === (opts.host ?? null)) return;
      this.closeDronePip();
    }
    this.buildPip(drone, opts);
    this.rebuildUnitGraphics();
    this.emit('pip', { open: true, drone: droneId, sensor: this.pip!.sensor });
    this.invalidate();
  }

  closeDronePip(): void {
    if (!this.pip) return;
    const id = this.pip.drone.spec.id;
    this.pip.el.remove();
    this.pip = null;
    this.rebuildUnitGraphics();
    this.emit('pip', { open: false, drone: id });
    this.invalidate();
  }

  setPipSensor(mode: 'eo' | 'ir'): void {
    if (!this.pip) return;
    this.touch();
    this.pip.sensor = mode;
    this.pip.el.classList.toggle('is-ir', mode === 'ir');
    this.pip.el.querySelectorAll<HTMLButtonElement>('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.s === mode));
    this.emit('pip', { open: true, drone: this.pip.drone.spec.id, sensor: mode });
    this.invalidate();
  }

  setPipZoom(zoom: number): void {
    if (!this.pip) return;
    this.touch();
    this.pip.zoom = clamp(zoom, 1, 8);
    this.invalidate();
  }

  getPip() {
    const p = this.pip;
    return p ? { drone: p.drone.spec.id, sensor: p.sensor, zoom: p.zoom, hosted: p.hosted } : null;
  }

  highlightUnit(id: string | null): void {
    for (const u of this.units) u.el.classList.toggle('is-hl', u.spec.id === id);
  }

  getUnitPosition(id: string): Vec2 | null {
    const u = this.units.find((x) => x.spec.id === id);
    return u ? this.unitAnchor(u) : null;
  }

  setViewInsets(insets: Partial<ViewInsets>, durationMs = 0): void {
    const to = { ...(this.insetTween?.to ?? this.insets), ...insets };
    if (durationMs <= 0) {
      this.insets = to;
      this.insetTween = null;
    } else this.insetTween = { from: { ...this.insets }, to, t0: performance.now(), dur: durationMs };
    this.invalidate();
  }

  getView(): ViewState {
    const c = this.cam;
    const range = this.useOrtho ? c.h : c.h / (2 * Math.tan((c.fov * DEG) / 2));
    return { target: [c.tx, c.ty], range, pitch: c.pitch, bearing: wrap360(c.bearing), mode: this.mode };
  }

  /** How much farther a framed view must pull back so it fits the uncovered region. */
  private insetScale() {
    const i = this.insetTween?.to ?? this.insets;
    const sv = this.height / Math.max(120, this.height - i.top - i.bottom);
    const sh = this.width / Math.max(160, this.width - i.left - i.right);
    return clamp(Math.max(sv, sh), 1, 1.8);
  }

  private applyViewOffset(cam: THREE.PerspectiveCamera | THREE.OrthographicCamera) {
    const i = this.insets;
    const dx = (i.right - i.left) / 2, dy = (i.bottom - i.top) / 2;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      if (cam.view) cam.view.enabled = false;
      return;
    }
    if (!cam.view) cam.setViewOffset(this.width, this.height, dx, dy, this.width, this.height);
    const v = cam.view!;
    v.enabled = true;
    v.fullWidth = v.width = this.width;
    v.fullHeight = v.height = this.height;
    v.offsetX = dx;
    v.offsetY = dy;
  }

  flyTo(spec: FlyToSpec): void {
    this.touch();
    const t: { x: number; y: number; z?: number } = Array.isArray(spec.target) ? { x: spec.target[0], y: spec.target[1] } : spec.target;
    const from = this.tweenStart();
    let pitch = spec.pitch ?? (this.mode === 'perspective' ? this.cam.pitch : 0);
    let bearing = spec.bearing ?? (this.mode === 'perspective' ? this.cam.bearing : 0);
    let range = spec.range;
    if (spec.position) {
      const gz = t.z ?? this.hf.sample(t.x, t.y) * this.exag;
      const dx = t.x - spec.position.x, dy = t.y - spec.position.y, vz = spec.position.z - gz;
      const hd = Math.hypot(dx, dy);
      range = Math.hypot(hd, vz);
      pitch = clamp(Math.atan2(hd, Math.max(1, vz)) / DEG, 0, 80);
      if (hd > 1) bearing = Math.atan2(dx, dy) / DEG;
    }
    const persp = this.mode === 'perspective' || pitch > 0.5;
    const fov = persp ? TACTICAL.fov : ORTHO_FOV;
    // Perspective: range is the eye distance. Top-down: range is the visible height.
    const h = range !== undefined ? (persp ? 2 * range * Math.tan((fov * DEG) / 2) : range) * this.insetScale() : this.cam.h;
    const to: CamState = { tx: t.x, ty: t.y, h: clamp(h, 120, this.maxH()), pitch: persp ? pitch : 0, bearing: persp ? bearing : 0, fov };
    if (persp && this.mode !== 'perspective') {
      this.mode = 'perspective';
      this.emit('camera', 'perspective');
    }
    this.useOrtho = false;
    this.startCamTween(from, to, spec.durationMs ?? 1600, () => {
      if (this.mode === 'topdown') this.useOrtho = true;
    });
  }

  pick(clientX: number, clientY: number): PickResult | null {
    const hit = this.groundHit(clientX, clientY);
    if (!hit) return null;
    const [x, y] = hit;
    const elev = this.hf.sample(x, y);
    const g = this.hf.gradient(x, y);
    const slopeDeg = Math.atan(Math.hypot(g[0], g[1])) / DEG;
    const az = wrap360(Math.atan2(-g[0], -g[1]) / DEG);
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const aspect = slopeDeg < 2 ? 'flat' : `${dirs[Math.round(az / 22.5) % 16]}-facing`;
    const { lat, lon } = this.geo.toLatLon(x, y);
    const cover = this.describeCover(x, y, elev, slopeDeg);
    const fire: PickResult['fire'] = { state: 'outside' };
    let frontD = Infinity;
    for (const rec of this.layers.values()) {
      if (!rec.visible) continue;
      const s = rec.spec;
      if (s.type === 'polygon' && s.mode === 'burnScar' && pointInPolygon(x, y, s.rings)) {
        fire.state = 'burned';
        if (s.progression) {
          const p = s.progression;
          const L = dist2(p.from, p.to);
          const u = clamp(((x - p.from[0]) * (p.to[0] - p.from[0]) + (y - p.from[1]) * (p.to[1] - p.from[1])) / (L * L), 0, 1);
          const t0 = Date.parse(p.start), t1 = Date.parse(p.end);
          const at = t0 + u * (t1 - t0);
          const ago = Math.max(0, t1 - at) / 60000;
          const d = new Date(at - 7 * 3600000); // shown in PDT (fixture is local to the frame)
          const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
          fire.burnedAt = `${mon} ${d.getUTCDate()} at ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
          fire.agoText = ago >= 60 ? `${Math.floor(ago / 60)} h ${Math.round(ago % 60)} min ago` : `${Math.round(ago)} min ago`;
        }
      }
      if (s.type === 'line' && s.heat) {
        const pts = s.intensity ? s.points.filter((_, i) => (s.intensity![i] ?? 0) > 0.6) : s.points;
        if (pts.length > 1) frontD = Math.min(frontD, distToPolyline(x, y, pts));
      }
    }
    const f = this.field;
    if (f && this.layers.get(f.id)?.visible && this.hf.contains(x, y)) {
      const a = this.fieldAt(x, y);
      const cw = this.hf.width / f.spec.cols;
      const gx = (this.fieldAt(x + cw, y) - this.fieldAt(x - cw, y)) / (2 * cw), gy = (this.fieldAt(x, y + cw) - this.fieldAt(x, y - cw)) / (2 * cw);
      const g = Math.max(Math.hypot(gx, gy), 1e-4);
      if (a <= this.clock) {
        fire.state = 'burned';
        const ago = this.clock - a;
        fire.agoText = ago >= 60 ? `${Math.floor(ago / 60)} h ${Math.round(ago % 60)} min ago` : `${Math.round(ago)} min ago`;
        if (f.spec.epoch) {
          const d = new Date(Date.parse(f.spec.epoch) + a * 60000 - 7 * 3600000);
          fire.burnedAt = `at ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
        }
      } else frontD = Math.min(frontD, (a - this.clock) / g);
    }
    if (Number.isFinite(frontD)) fire.distanceToFront = Math.round(frontD);
    return { x, y, elevation: elev, slopeDeg, aspect, lat, lon, latLonText: this.geo.format(lat, lon), cover: cover.label, fuel: cover.fuel, fire };
  }

  setMotion(on: boolean): void {
    this.motion = on;
    this.touch();
    this.emitMotion();
    this.invalidate();
  }

  setWorld(world: WorldData): void {
    this.touch();
    const specs = [...this.layers.entries()].map(([id, r]) => [id, r.spec, r.visible] as const);
    for (const id of [...this.layers.keys()]) this.removeLayer(id);
    const unitSpecs = this.units.map((u) => u.spec);
    this.closeDronePip();
    this.loadWorld(world);
    for (const [id, spec, vis] of specs) this.setOverlayLayer(id, { ...spec, visible: vis } as OverlaySpec);
    this.setUnits(unitSpecs);
    this.fitAll();
    if (this.mode === 'perspective') this.setCamera('perspective', 0);
    this.emit('world', { source: world.source });
    this.invalidate();
  }

  getMetrics(): EngineMetrics {
    const now = performance.now();
    const fps = this.frameTimes.filter((t) => now - t < 1000).length;
    const pip = this.stats.pip;
    const motionState = !this.motion ? 'off' : this.parked || !this.pageVisible || !this.onScreen ? 'parked' : 'running';
    return {
      drawCalls: this.stats.main.drawCalls + (pip?.drawCalls ?? 0),
      triangles: this.stats.main.triangles + (pip?.triangles ?? 0),
      fps,
      main: { ...this.stats.main },
      pip: pip ? { ...pip } : null,
      frames: this.frames,
      idle: !this.rafId && !this.timer,
      motion: motionState,
      pixelRatio: this.renderer.getPixelRatio(),
      vegetation: this.vegStats(),
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      cpuFrameMs: Math.round(this.stats.cpu * 100) / 100,
    };
  }

  private vegStats() {
    let instances = 0, triangles = 0;
    for (const m of this.vegMeshes) {
      if (!m.visible) continue;
      instances += m.count;
      triangles += m.count * ((m.geometry.index ? m.geometry.index.count : m.geometry.getAttribute('position').count) / 3);
    }
    return { instances, triangles };
  }

  invalidate(): void {
    this.requestFrame();
  }

  on(event: EngineEvent, fn: (payload: any) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(fn);
    return () => set!.delete(fn);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    clearTimeout(this.timer);
    for (const c of this.cleanup) c();
    for (const id of [...this.layers.keys()]) this.removeLayer(id);
    this.closeDronePip();
    this.disposeWorld();
    for (const u of this.units) u.el.remove();
    this.disposeUnitGraphics();
    this.fxTex.dispose();
    this.tintTex.dispose();
    this.renderer.dispose();
    this.canvas.remove();
    this.overlay.remove();
    this.container.classList.remove('tte-root', 'is-still', 'is-dragging');
    this.listeners.clear();
  }

  // ------------------------------------------------------------------ world

  /** Sensor/lighting/fog uniforms shared by every colour shader. */
  private sensorUniforms() {
    const U = this.U;
    return { uThermal: U.uThermal, uSensor: U.uSensor, uTime: U.uTime, uDayNight: U.uDayNight, uSun: U.uSun, uFogColor: U.uFogColor, uFogDensity: U.uFogDensity };
  }

  private loadWorld(world: WorldData) {
    this.disposeWorld();
    this.world = world;
    this.hf = new Heightfield(world.dem, world.frame.widthMeters, world.frame.heightMeters);
    this.geo = new GeoProjection(world.frame);
    this.smoothDem = boxBlur(boxBlur(world.dem.data, world.dem.cols, world.dem.rows, 8), world.dem.cols, world.dem.rows, 8);
    const { cols, rows } = world.dem;
    const U = this.U;
    const seed = world.meta?.seed ?? 11;

    this.demTex = new THREE.DataTexture(world.dem.data, cols, rows, THREE.RedFormat, THREE.FloatType);
    this.demTex.needsUpdate = true;

    const an = analyseTerrain(this.hf, seed);
    this.analysis = an;
    this.terrainMat = new THREE.ShaderMaterial({
      vertexShader: TERRAIN_VERT,
      fragmentShader: TERRAIN_FRAG,
      uniforms: {
        ...this.sensorUniforms(),
        uExag: U.uExag,
        uTopo: U.uTopo,
        uContours: U.uContours,
        uGraticule: U.uGraticule,
        uElevMax: { value: Math.max(50, this.hf.max) },
        uFx: { value: this.fxTex },
        uTint: { value: this.tintTex },
        uTintPrev: { value: this.tintPrevTex },
        uTintFade: U.uTintFade,
        uScale: U.uScale,
        ...this.F,
        uFrame: { value: new THREE.Vector2(this.hf.width, this.hf.height) },
        uGrat: { value: this.gratUniform() },
      },
    });
    // One mesh, one draw call: the data grid first (row-major, so the drone feed can draw a
    // row range), then the context ring, which is seamless with the frame edge.
    this.terrain = new THREE.Mesh(mergeTerrain(buildTerrainGeometry(this.hf, an), buildBackdropGeometry(this.hf, seed, an)), this.terrainMat);
    this.terrain.frustumCulled = false;
    this.worldGroup.add(this.terrain);

    // Ocean plane at sea level out to the horizon; the coast-distance field drives surf and shallows.
    this.coastTex = coastDistanceTexture(this.hf);
    this.oceanMat = new THREE.ShaderMaterial({
      vertexShader: OCEAN_VERT,
      fragmentShader: OCEAN_FRAG,
      uniforms: { ...this.sensorUniforms(), uCoast: { value: this.coastTex }, uCoastInfo: { value: new THREE.Vector4(cols, rows, this.hf.width, this.hf.height) } },
    });
    const oceanGeo = new THREE.PlaneGeometry(48000, 48000);
    oceanGeo.rotateX(-Math.PI / 2);
    oceanGeo.translate(0, 0.35, 0);
    this.ocean = new THREE.Mesh(oceanGeo, this.oceanMat);
    this.ocean.frustumCulled = false;
    // Main view only; in the feed the terrain shader's own water cells stand in (keeps the feed pass small).
    this.ocean.layers.set(1);
    this.worldGroup.add(this.ocean);

    const demUniforms = { uDem: { value: this.demTex }, uDemInfo: { value: new THREE.Vector4(cols, rows, this.hf.width, this.hf.height) } };
    this.roadMat = new THREE.ShaderMaterial({
      vertexShader: ROAD_VERT,
      fragmentShader: ROAD_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: { ...demUniforms, ...this.sensorUniforms(), uExag: U.uExag, uMppA: U.uMppA, uMppB: U.uMppB, uBias: { value: 0.0012 }, uBiasOrtho: { value: 8 } },
    });
    const roadGeo = buildRoadGeometry(world.roads);
    if (roadGeo) {
      this.roadsMesh = new THREE.Mesh(roadGeo, this.roadMat);
      this.roadsMesh.frustumCulled = false;
      this.roadsMesh.renderOrder = 1;
      this.roadsMesh.visible = this.baseVisible.roads;
      this.worldGroup.add(this.roadsMesh);
    }

    this.buildingMat = new THREE.ShaderMaterial({
      vertexShader: BUILDING_VERT,
      fragmentShader: BUILDING_FRAG,
      uniforms: { ...this.sensorUniforms(), uExag: U.uExag },
    });
    this.buildings = this.buildBuildings(world.buildings);
    if (this.buildings) {
      this.buildings.visible = this.baseVisible.buildings;
      this.worldGroup.add(this.buildings);
    }

    this.vegMeshes = this.buildVegetation(world, seed);
    for (const m of this.vegMeshes) {
      m.visible = this.baseVisible.vegetation;
      this.worldGroup.add(m);
    }
    this.maskDirty = true;
    this.cam.tx = clamp(this.cam.tx, -this.hf.width / 2, this.hf.width / 2);
    this.cam.ty = clamp(this.cam.ty, -this.hf.height / 2, this.hf.height / 2);
  }

  private disposeWorld() {
    if (!this.terrain) return;
    const meshes: (THREE.Mesh | null)[] = [this.terrain, this.ocean, this.roadsMesh, this.buildings, ...this.vegMeshes];
    for (const o of meshes) {
      if (!o) continue;
      this.worldGroup.remove(o);
      o.geometry.dispose();
    }
    for (const m of [this.terrainMat, this.roadMat, this.buildingMat, this.oceanMat, this.vegMat]) m?.dispose();
    this.demTex.dispose();
    this.coastTex?.dispose();
    this.roadsMesh = null;
    this.buildings = null;
    this.vegMeshes = [];
  }

  /** Trees in one InstancedMesh, shrubs in another (2 draw calls). */
  private buildVegetation(world: WorldData, seed: number): THREE.InstancedMesh[] {
    const want = this.vegOption;
    if (want === false) return [];
    const nTrees = want.trees ?? 6000, nShrubs = want.shrubs ?? 10000;
    if (!nTrees && !nShrubs) return [];
    const placed = placeVegetation(world, this.hf, this.analysis, this.buildingCentroids, nTrees, nShrubs, seed);
    this.vegMat = new THREE.ShaderMaterial({
      vertexShader: VEG_VERT,
      fragmentShader: VEG_FRAG,
      uniforms: { ...this.sensorUniforms(), ...this.F, uExag: this.U.uExag, uKind: { value: 0 }, uFx: { value: this.fxTex }, uFrame: { value: new THREE.Vector2(this.hf.width, this.hf.height) } },
    });
    const shrubMat = this.vegMat.clone();
    // clone() copies uniform values; re-link the shared ones so tweens reach both materials.
    Object.assign(shrubMat.uniforms, this.sensorUniforms(), this.F, { uExag: this.U.uExag, uKind: { value: 1 }, uFx: { value: this.fxTex } });
    const out: THREE.InstancedMesh[] = [];
    const make = (geo: THREE.BufferGeometry, mat: THREE.ShaderMaterial, list: Float32Array) => {
      const n = list.length / 5;
      if (!n) return;
      const tone = new Float32Array(n);
      geo.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 1));
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < n; i++) {
        const [x, y, rot, size, height] = list.subarray(i * 5, i * 5 + 5);
        p.set(x, this.hf.sample(x, y) - 0.5, -y);
        q.setFromAxisAngle(up, rot);
        sc.set(size, height, size);
        m.compose(p, q, sc);
        mesh.setMatrixAt(i, m);
        tone[i] = (Math.sin(i * 12.9898 + x * 0.01) * 43758.5453) % 1 * 0.5 + 0.5;
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      out.push(mesh);
    };
    make(treeGeometry(), this.vegMat, placed.trees);
    make(shrubGeometry(), shrubMat, placed.shrubs);
    // Shrubs are main-view only: at feed range they are a few pixels and would cost a draw call.
    if (out[1]) out[1].layers.set(1);
    return out;
  }

  private fitAll() {
    const aspect = this.width / this.height;
    this.cam.tx = 0;
    this.cam.ty = 0;
    this.cam.h = Math.max(this.hf.height * 1.06, (this.hf.width * 1.03) / aspect);
  }

  private buildBuildings(list: BuildingFeature[]): THREE.InstancedMesh | null {
    if (!list.length) return null;
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const idx = box.getIndex()!.array as ArrayLike<number>;
    const keep: number[] = [];
    // BoxGeometry groups: +x, -x, +y, -y, +z, -z (6 indices each). Drop the floor (-y).
    for (let i = 0; i < idx.length; i++) if (Math.floor(i / 6) !== 3) keep.push(idx[i]);
    box.setIndex(keep);
    box.clearGroups();
    box.deleteAttribute('uv');
    const n = list.length;
    const state = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    const embed = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    box.setAttribute('aState', state);
    box.setAttribute('aEmbed', embed);
    const mesh = new THREE.InstancedMesh(box, this.buildingMat, n);
    mesh.frustumCulled = false;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    this.buildingCentroids = [];
    list.forEach((b, i) => {
      const o = footprintOBB(b.footprint);
      const ca = Math.cos(o.angle), sa = Math.sin(o.angle);
      let mn = Infinity, mx = -Infinity;
      for (const [u, v] of [[0, 0], [-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
        const x = o.cx + u * o.len * ca - v * o.wid * sa, y = o.cy + u * o.len * sa + v * o.wid * ca;
        const h = this.hf.sample(x, y);
        mn = Math.min(mn, h);
        mx = Math.max(mx, h);
      }
      const em = mx - mn + 1.5;
      p.set(o.cx, mn - 1.5, -o.cy);
      q.setFromAxisAngle(up, o.angle);
      s.set(o.len, Math.max(2, b.height) + em, o.wid);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      embed.setX(i, em);
      this.buildingCentroids.push([o.cx, o.cy]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  private updateBuildingStates() {
    if (!this.buildings) return;
    const attr = this.buildings.geometry.getAttribute('aState') as THREE.InstancedBufferAttribute;
    const polys = [...this.layers.values()].filter((r) => r.visible && r.spec.type === 'polygon' && r.spec.structures) as (LayerRec & { spec: PolygonOverlaySpec })[];
    const f = this.field && this.layers.get(this.field.id)?.visible && this.field.spec.structures ? this.field : null;
    const reachedSt = f?.spec.structures?.reached === 'threatened' ? 1 : 2;
    const within = f?.spec.structures?.within ?? 0;
    let changed = false;
    this.buildingCentroids.forEach(([x, y], i) => {
      let st = 0;
      for (const r of polys) if (pointInPolygon(x, y, r.spec.rings)) st = Math.max(st, r.spec.structures === 'destroyed' ? 2 : 1);
      if (f && this.hf.contains(x, y)) {
        const a = this.fieldAt(x, y);
        if (a <= this.clock) st = Math.max(st, reachedSt);
        else if (within > 0 && a <= this.clock + within) st = Math.max(st, 1);
      }
      if (attr.getX(i) !== st) {
        attr.setX(i, st);
        changed = true;
      }
    });
    if (changed) attr.needsUpdate = true;
    this.statsCache = null;
  }

  private describeCover(x: number, y: number, h: number, slopeDeg: number): { label: string; fuel: string } {
    const { cols, rows } = this.world.dem;
    const c = clamp(Math.round(this.hf.colOf(x)), 0, cols - 1), r = clamp(Math.round(this.hf.rowOf(y)), 0, rows - 1);
    const i = r * cols + c;
    const veg = this.analysis.veg[i], rock = this.analysis.rock[i], lap = this.analysis.lap[i];
    if (h < 0.5) return { label: 'Open water', fuel: 'NB8' };
    let developed = false;
    for (const [bx, by] of this.buildingCentroids)
      if (Math.abs(bx - x) < 40 && Math.abs(by - y) < 40) {
        developed = true;
        break;
      }
    if (developed) return { label: 'Developed · WUI parcels', fuel: 'NB1' };
    if (rock > 0.5) return { label: slopeDeg > 35 ? 'Rock outcrop, sparse' : 'Bare rock · ridge top', fuel: 'NB9' };
    if (lap > 0.25 && veg > 0.55) return { label: 'Riparian oak / sycamore', fuel: 'TU5' };
    if (veg > 0.72) return { label: 'Chaparral, heavy', fuel: 'SH7' };
    if (veg > 0.48) return { label: 'Mixed chaparral / sage scrub', fuel: 'SH5' };
    if (veg > 0.25) return { label: 'Coastal sage scrub, light', fuel: 'SH2' };
    return { label: 'Annual grass, light', fuel: 'GR2' };
  }

  // ------------------------------------------------------------------ overlays

  private buildLayer(rec: LayerRec) {
    const s = rec.spec;
    switch (s.type) {
      case 'line': {
        if (!s.drape) {
          const line = this.makeLine(s, s.points, !!s.closed);
          if (line) rec.objects.push(line);
        }
        if (s.heat || s.drape) this.maskDirty = true;
        break;
      }
      case 'field':
        this.attachField(rec, s);
        break;
      case 'polygon': {
        if (s.stroke && s.rings[0]?.length > 2) {
          const line = this.makeLine({ type: 'line', ...s.stroke, points: s.rings[0] } as LineOverlaySpec, s.rings[0], true);
          if (line) rec.objects.push(line);
        }
        this.maskDirty = true;
        if (s.structures) queueMicrotask(() => this.updateBuildingStates());
        break;
      }
      case 'points': {
        const pts = this.makeHotspots(s);
        if (pts) rec.objects.push(pts);
        break;
      }
      case 'marker': {
        const el = document.createElement('div');
        el.className = `tte-item tte-marker${s.pulse ? ' is-pulse' : ''}${s.interactive ? ' is-interactive' : ''}${s.state && s.state !== 'committed' ? ` is-${s.state}` : ''}`;
        el.dataset.icon = s.icon ?? 'info';
        if (s.tone) el.style.setProperty('--tone', TONE[s.tone] ?? s.tone);
        const rot = s.rotation !== undefined ? ` style="transform:rotate(${s.rotation}deg)"` : '';
        el.innerHTML = `<div class="tte-mk"><i${rot}>${ICONS[s.icon ?? 'info'] ?? ICONS.info}</i></div><div class="tte-mt">${esc(s.title)}${s.detail ? `<span>${esc(s.detail)}</span>` : ''}</div>`;
        if (s.interactive) el.querySelector('.tte-mt')!.addEventListener('click', () => this.emit('layerclick', { id: rec.id }));
        this.markerLayer.appendChild(el);
        rec.els.push({ el, pos: s.position, lift: 2, occlusion: true });
        break;
      }
      case 'labels': {
        for (const it of s.items) {
          const el = document.createElement('div');
          el.className = 'tte-item tte-label';
          el.dataset.kind = it.kind ?? 'place';
          el.innerHTML = `${it.kind === 'peak' ? ICONS.peak : ''}${esc(it.text)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}`;
          this.labelLayer.appendChild(el);
          rec.els.push({ el, pos: it.position, lift: it.kind === 'peak' ? 4 : 30, occlusion: true });
        }
        break;
      }
    }
    for (const o of rec.objects) {
      o.visible = rec.visible;
      this.scene.add(o);
    }
    for (const e of rec.els) e.el.hidden = !rec.visible;
  }

  private removeLayer(id: string) {
    const rec = this.layers.get(id);
    if (!rec) return;
    this.disposeLayerObjects(rec);
    this.layers.delete(id);
    if (rec.spec.type === 'polygon' || (rec.spec.type === 'line' && (rec.spec.heat || rec.spec.drape))) this.maskDirty = true;
    if (rec.spec.type === 'polygon' && rec.spec.structures) this.updateBuildingStates();
    if (rec.spec.type === 'field') this.detachField(id);
  }

  private disposeLayerObjects(rec: LayerRec) {
    for (const o of rec.objects) {
      this.scene.remove(o);
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material)?.dispose();
    }
    rec.objects = [];
    for (const e of rec.els) e.el.remove();
    rec.els = [];
  }

  /** Fade multiplier for a layer's GPU objects and DOM nodes. */
  private setLayerAlpha(rec: LayerRec, a: number) {
    rec.alpha = a;
    const k = a * rec.dim;
    for (const o of rec.objects) {
      const m = (o as THREE.Mesh).material as THREE.ShaderMaterial;
      if (o instanceof Line2) (m as unknown as LineMaterial).opacity = (o.userData.opacity ?? 1) * k;
      else if (m.uniforms?.uOpacity) m.uniforms.uOpacity.value = k;
    }
    for (const e of rec.els) e.el.style.opacity = k >= 1 ? '' : k.toFixed(3);
  }

  private dimTarget(id: string) {
    return this.emphasis && !this.emphasis.has(id) ? 0.22 : 1;
  }

  setLayerEmphasis(ids: string[] | null, durationMs = 220): void {
    this.touch();
    this.emphasis = ids ? new Set(ids) : null;
    const t0 = performance.now();
    for (const rec of this.layers.values()) {
      const to = this.dimTarget(rec.id);
      if (Math.abs(rec.dim - to) < 1e-3) continue;
      if (durationMs <= 0) {
        rec.dim = to;
        this.setLayerAlpha(rec, rec.alpha);
      } else this.dimTweens.set(rec, { from: rec.dim, to, t0, dur: durationMs });
    }
    this.invalidate();
  }

  // ------------------------------------------------------------------ time-of-arrival field

  private attachField(rec: LayerRec, s: FieldOverlaySpec) {
    if (this.field && this.field.id !== rec.id) {
      console.warn(`[terrainEngine] one field layer at a time; "${this.field.id}" replaced by "${rec.id}"`);
      this.layers.delete(this.field.id);
      this.detachField(this.field.id);
    }
    const n = s.cols * s.rows;
    const data = new Float32Array(n);
    const half = new Uint16Array(n);
    // Texture row 0 is the south edge (v = 0); data row 0 is the north edge.
    for (let r = 0; r < s.rows; r++)
      for (let c = 0; c < s.cols; c++) {
        const v = Number(s.data[r * s.cols + c]);
        const vv = Number.isFinite(v) ? Math.min(v, 6e4) : 6e4;
        data[r * s.cols + c] = vv;
        half[(s.rows - 1 - r) * s.cols + c] = THREE.DataUtils.toHalfFloat(vv);
      }
    const tex = new THREE.DataTexture(half, s.cols, s.rows, THREE.RedFormat, THREE.HalfFloatType);
    tex.magFilter = tex.minFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    let origin = s.origin;
    if (!origin) {
      let k = 0;
      for (let i = 1; i < n; i++) if (data[i] < data[k]) k = i;
      origin = this.fieldCellXY(s, k % s.cols, Math.floor(k / s.cols));
    }
    this.field = { id: rec.id, spec: s, data, tex, origin };
    const F = this.F;
    F.uArr.value = tex;
    F.uArrTexel.value.set(1 / s.cols, 1 / s.rows, this.hf.width / s.cols, this.hf.height / s.rows);
    F.uArrOrigin.value.set(origin[0], origin[1]);
    this.applyFieldUniforms();
    // Contour labels: DOM chips placed on the ray origin -> labelToward each clock change.
    for (const iso of (s.isochrones ?? []).slice(0, 3)) {
      if (!iso.label) continue;
      const el = document.createElement('div');
      el.className = 'tte-item tte-iso';
      el.style.setProperty('--tone', iso.color);
      el.textContent = iso.label;
      this.labelLayer.appendChild(el);
      rec.els.push({ el, pos: [0, 0], lift: 6, occlusion: true, hide: true });
    }
    this.onFieldChanged();
  }

  private detachField(id: string) {
    if (!this.field || this.field.id !== id) return;
    this.field.tex.dispose();
    this.field = null;
    this.F.uArrInfo.value.set(0, 0, 0, 0);
    this.F.uIsoOn.value.set(0, 0, 0);
    this.statsCache = null;
    this.updateBuildingStates();
    this.invalidate();
  }

  private applyFieldUniforms() {
    const f = this.field;
    const F = this.F;
    if (!f) return;
    const s = f.spec;
    const rec = this.layers.get(f.id);
    const on = rec && rec.visible ? 1 : 0;
    F.uArrInfo.value.set(on, s.front ?? 0, s.edge ? s.edge.width ?? 1.6 : 0, s.fill === 'none' ? 0 : 1);
    F.uEdgeC.value.copy(hexToVec3(s.edge?.color ?? PALETTE.fire));
    const isos = (s.isochrones ?? []).slice(0, 3);
    const styles = { solid: 0, dashed: 1, dotted: 2 };
    for (let k = 0; k < 3; k++) {
      const iso = isos[k];
      F.uIsoOn.value.setComponent(k, iso && on ? 1 : 0);
      if (!iso) continue;
      F.uIsoT.value.setComponent(k, iso.offset);
      F.uIsoStyle.value.setComponent(k, styles[iso.style ?? 'solid']);
      F.uIsoW.value.setComponent(k, iso.width ?? 1.8);
      (k === 0 ? F.uIsoC0 : k === 1 ? F.uIsoC1 : F.uIsoC2).value.copy(hexToVec3(iso.color));
    }
  }

  private fieldCellXY(s: { cols: number; rows: number }, c: number, r: number): Vec2 {
    return [((c + 0.5) / s.cols) * this.hf.width - this.hf.width / 2, this.hf.height / 2 - ((r + 0.5) / s.rows) * this.hf.height];
  }

  /** Bilinear arrival time at a world point (cell-centred samples, like the GPU). */
  private fieldAt(x: number, y: number): number {
    const f = this.field!;
    const { cols, rows } = f.spec;
    const c = clamp(((x + this.hf.width / 2) / this.hf.width) * cols - 0.5, 0, cols - 1);
    const r = clamp(((this.hf.height / 2 - y) / this.hf.height) * rows - 0.5, 0, rows - 1);
    return sampleGrid(f.data, cols, rows, c, r);
  }

  /** Clock-dependent derived state: structures, contour labels, stats. */
  private onFieldChanged() {
    this.statsCache = null;
    this.updateBuildingStates();
    const f = this.field;
    if (!f) return;
    const rec = this.layers.get(f.id);
    if (!rec) return;
    const s = f.spec;
    const o = f.origin;
    const to = s.labelToward;
    const isos = (s.isochrones ?? []).slice(0, 3).filter((i) => i.label);
    isos.forEach((iso, k) => {
      const e = rec.els[k];
      if (!e) return;
      e.hide = true;
      if (!to) return;
      const target = this.clock + iso.offset;
      const L = dist2(o, to);
      const dx = (to[0] - o[0]) / L, dy = (to[1] - o[1]) / L;
      let prev = this.fieldAt(o[0], o[1]);
      for (let d = 15; d < 9000; d += 15) {
        const x = o[0] + dx * d, y = o[1] + dy * d;
        if (!this.hf.contains(x, y)) break;
        const v = this.fieldAt(x, y);
        if (prev <= target && v > target) {
          const t = (target - prev) / Math.max(v - prev, 1e-6);
          e.pos = [x - dx * 15 * (1 - t), y - dy * 15 * (1 - t)];
          e.hide = false;
          break;
        }
        prev = v;
      }
    });
  }

  private onClockChanged() {
    this.U.uClock.value = this.clock;
    this.updateUnitPositions();
    if (this.field) this.onFieldChanged();
    this.emit('time', this.clock);
  }

  private makeLine(s: LineOverlaySpec, points: Vec2[], closed: boolean): Line2 | null {
    if (points.length < 2) return null;
    const src = closed ? [...points, points[0]] : points;
    const { pts, t } = resampleMax(src, 10);
    const pos = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      pos[i * 3] = p[0];
      pos[i * 3 + 1] = this.hf.sample(p[0], p[1]);
      pos[i * 3 + 2] = -p[1];
    });
    const geo = new LineGeometry();
    geo.setPositions(pos);
    const inten = s.intensity;
    if (inten) {
      const n = points.length;
      const col = new Float32Array(pts.length * 3);
      t.forEach((ti, i) => {
        const i0 = Math.floor(ti) % n, i1 = (i0 + 1) % n;
        const v = lerp(inten[i0] ?? 1, inten[i1] ?? 1, ti - Math.floor(ti));
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
      });
      geo.setColors(col);
    }
    geo.setIndex([2, 4, 3, 4, 5, 3]); // middle quad only: no caps, no double-blended joints
    const mat = new LineMaterial({ linewidth: 1, dashed: true, transparent: true, depthWrite: false, vertexColors: !!inten });
    const extra = {
      ...this.sensorUniforms(),
      uExag: this.U.uExag,
      uScale: this.U.uScale,
      uLift: { value: s.lift ?? 3 },
      uBias: { value: 0.0025 },
      uBiasOrtho: { value: 15 },
      uColor: { value: new THREE.Vector3() },
      uColorLow: { value: new THREE.Vector3() },
      uCore: { value: 1 },
      uGlow: { value: 0 },
      uStyle: { value: 0 },
      uDash: { value: new THREE.Vector2(12, 8) },
      uPeriod: { value: 30 },
      uSpeed: { value: 24 },
      uThermalT: { value: s.thermal ?? -1 },
      uHollow: { value: 0 },
    };
    Object.assign(mat.uniforms, extra);
    mat.onBeforeCompile = (shader) => {
      const before = shader.vertexShader;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${LINE_VERT_UNIFORMS}`)
        .replace(/vec4 start = modelViewMatrix \* vec4\( instanceStart, 1\.0 \);\s*vec4 end = modelViewMatrix \* vec4\( instanceEnd, 1\.0 \);/, LINE_VERT_START);
      if (shader.vertexShader === before || !shader.vertexShader.includes('uExag + uLift')) console.warn('[terrainEngine] LineMaterial patch did not apply; check the three.js version');
      shader.fragmentShader = LINE_FRAG;
    };
    mat.customProgramCacheKey = () => `tte-line-${inten ? 'c' : 'n'}`;
    const line = new Line2(geo, mat);
    line.computeLineDistances();
    line.frustumCulled = false;
    line.layers.set(s.sensorVisible ? 2 : 1);
    this.styleLine(line, s);
    return line;
  }

  /** Resolves the status ladder (see LayerState) into line uniforms; never touches geometry. */
  private styleLine(line: Line2, s: LineOverlaySpec) {
    const st = s.state ?? 'committed';
    let color = s.color ?? PALETTE.cyan, colorLow = s.colorLow ?? color;
    let core = s.width ?? 3, glow = s.glow ?? 0, glowOp = s.glowOpacity ?? 0.45, opacity = s.opacity ?? 1;
    let style = s.style === 'dashed' ? 1 : s.style === 'chevron' ? 2 : 0;
    let dash = s.dash ?? [12, 8], speed = s.speed ?? 24, hollow = 0;
    if (st === 'proposed') {
      hollow = 1;
      core = Math.max(core, 4);
      glow *= 0.5;
      glowOp *= 0.35;
      speed = 0;
    } else if (st === 'draft') {
      color = colorLow = PALETTE.amber;
      core = Math.max(1.6, core * 0.6);
      glow = 0;
      opacity *= 0.62;
      style = 1;
      dash = [16, 10];
    } else if (st === 'compromised') {
      color = colorLow = PALETTE.red;
      core = Math.max(2.4, core * 0.8);
      glow = Math.min(glow, 3);
      glowOp = 0.3;
      style = 1;
      dash = [7, 6];
    }
    const total = core + glow * 2;
    const mat = line.material as LineMaterial;
    const u = mat.uniforms;
    mat.linewidth = total;
    u.uColor.value.copy(hexToVec3(color));
    u.uColorLow.value.copy(hexToVec3(colorLow));
    u.uCore.value = core / total;
    u.uGlow.value = glow > 0 ? glowOp : 0;
    u.uStyle.value = style;
    u.uDash.value.set(dash[0], dash[1]);
    u.uPeriod.value = s.chevronSpacing ?? 30;
    u.uSpeed.value = speed;
    u.uHollow.value = hollow;
    line.userData.opacity = opacity;
    line.userData.flow = style === 2 && speed > 0;
    mat.opacity = opacity * (this.layerOf(line)?.alpha ?? 1);
    line.renderOrder = st === 'draft' ? 11 : st === 'compromised' ? 10 : style === 2 ? 8 : style === 1 ? 6 : s.heat ? 5 : 7;
  }

  private layerOf(o: THREE.Object3D): LayerRec | undefined {
    for (const r of this.layers.values()) if (r.objects.includes(o)) return r;
    return undefined;
  }

  private makeHotspots(s: PointsOverlaySpec): THREE.Points | null {
    if (!s.points.length) return null;
    const n = s.points.length;
    const pos = new Float32Array(n * 3), inten = new Float32Array(n), seed = new Float32Array(n), win = new Float32Array(n * 2);
    s.points.forEach((p, i) => {
      pos[i * 3] = p.position[0];
      pos[i * 3 + 1] = this.hf.sample(p.position[0], p.position[1]);
      pos[i * 3 + 2] = -p.position[1];
      inten[i] = p.intensity ?? 0.7;
      seed[i] = (i * 0.618) % 1;
      win[i * 2] = p.window?.[0] ?? -1e9;
      win[i * 2 + 1] = p.window?.[1] ?? 1e9;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aI', new THREE.BufferAttribute(inten, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aWin', new THREE.BufferAttribute(win, 2));
    const mat = new THREE.ShaderMaterial({
      vertexShader: HOTSPOT_VERT,
      fragmentShader: HOTSPOT_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uExag: this.U.uExag,
        uTime: this.U.uTime,
        uThermal: this.U.uThermal,
        uSensor: this.U.uSensor,
        uDayNight: this.U.uDayNight,
        uPR: this.U.uPR,
        uClock: this.U.uClock,
        uOpacity: { value: 1 },
        uSize: { value: s.size ?? 16 },
        uBias: { value: 0.004 },
        uBiasOrtho: { value: 25 },
      },
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.layers.set(s.sensorVisible === false ? 1 : 2);
    pts.renderOrder = 9;
    return pts;
  }

  /** Rasterises polygon fills, zone outlines and heat glow into the two terrain mask textures. */
  private paintMasks() {
    this.maskDirty = false;
    const fx = this.fxCanvas.getContext('2d')!, tint = this.tintCanvas.getContext('2d')!;
    const cw = this.fxCanvas.width, ch = this.fxCanvas.height;
    const W = this.hf.width, H = this.hf.height;
    const tx = (x: number) => ((x + W / 2) / W) * cw, ty = (y: number) => ((H / 2 - y) / H) * ch;
    const pxPerM = cw / W;
    if (this.tintFadeReq > 0) {
      // Cross-fade: the current mask becomes the "previous" texture, the new one fades in.
      const prev = this.tintPrevCanvas.getContext('2d')!;
      prev.clearRect(0, 0, cw, ch);
      prev.drawImage(this.tintCanvas, 0, 0);
      this.tintPrevTex.needsUpdate = true;
      this.U.uTintFade.value = 0;
      this.tintFadeTween = { from: 0, to: 1, t0: performance.now(), dur: this.tintFadeReq };
      this.tintFadeReq = 0;
    }
    fx.globalCompositeOperation = 'source-over';
    fx.fillStyle = '#000';
    fx.fillRect(0, 0, cw, ch);
    tint.clearRect(0, 0, cw, ch);
    fx.globalCompositeOperation = 'lighten';
    const path = (ctx: CanvasRenderingContext2D, rings: Vec2[][]) => {
      ctx.beginPath();
      for (const r of rings) {
        r.forEach((p, i) => (i ? ctx.lineTo(tx(p[0]), ty(p[1])) : ctx.moveTo(tx(p[0]), ty(p[1]))));
        ctx.closePath();
      }
    };
    for (const rec of this.layers.values()) {
      if (!rec.visible) continue;
      const s = rec.spec;
      if (s.type === 'polygon') {
        const mode = s.mode ?? 'tint';
        const st = s.state ?? 'committed';
        if ((mode === 'tint' || mode === 'hatch') && st !== 'committed') {
          // Proposed zones: outline only with a faint fill. Drafts: amber ghost outline.
          const col = st === 'draft' ? PALETTE.amber : st === 'compromised' ? PALETTE.red : s.outline?.color ?? s.fill ?? PALETTE.amber;
          tint.save();
          path(tint, s.rings);
          tint.globalAlpha = st === 'proposed' ? (s.fillOpacity ?? 0.15) * 0.3 : 0;
          tint.fillStyle = s.fill ?? col;
          tint.fill('evenodd');
          tint.globalAlpha = st === 'draft' ? 0.55 : 0.85;
          tint.strokeStyle = col;
          tint.lineWidth = (s.outline?.width ?? 2) * (st === 'draft' ? 0.8 : 1.1);
          tint.setLineDash(st === 'draft' ? [16, 10] : [7, 6]);
          tint.stroke();
          tint.restore();
          continue;
        }
        if (mode === 'burnScar' || mode === 'heat') {
          fx.fillStyle = mode === 'burnScar' ? '#ff0000' : '#00ff00';
          path(fx, s.rings);
          fx.fill('evenodd');
        } else {
          tint.save();
          path(tint, s.rings);
          tint.globalAlpha = s.fillOpacity ?? 0.15;
          if (mode === 'hatch') {
            tint.globalAlpha = (s.fillOpacity ?? 0.3) * 0.35;
            tint.fillStyle = s.fill ?? PALETTE.red;
            tint.fill('evenodd');
            tint.globalAlpha = s.fillOpacity ?? 0.3;
            tint.fillStyle = hatchPattern(tint, s.fill ?? PALETTE.red);
          } else tint.fillStyle = s.fill ?? PALETTE.amber;
          tint.fill('evenodd');
          if (s.outline) {
            tint.globalAlpha = s.outline.opacity ?? 0.8;
            tint.strokeStyle = s.outline.color;
            tint.lineWidth = s.outline.width ?? 2;
            tint.setLineDash(s.outline.dash ?? []);
            tint.stroke();
          }
          tint.restore();
        }
      } else if (s.type === 'line' && s.drape) {
        // Draped line in the tint mask: width and dash in metres.
        const st = s.state ?? 'committed';
        const pts = s.closed ? [...s.points, s.points[0]] : s.points;
        tint.save();
        tint.lineCap = 'round';
        tint.lineJoin = 'round';
        tint.beginPath();
        pts.forEach((q, i) => (i ? tint.lineTo(tx(q[0]), ty(q[1])) : tint.moveTo(tx(q[0]), ty(q[1]))));
        const wM = s.width ?? 10;
        tint.globalAlpha = 0.85 * (st === 'draft' ? 0.6 : 1);
        tint.strokeStyle = '#05070A';
        tint.lineWidth = (wM + 6) * pxPerM;
        tint.stroke();
        const dash = st === 'proposed' || st === 'draft' ? [22, 14] : st === 'compromised' ? [10, 8] : s.style === 'dashed' ? s.dash ?? [18, 10] : [];
        tint.setLineDash(dash.map((d) => d * pxPerM));
        tint.strokeStyle = st === 'draft' ? PALETTE.amber : st === 'compromised' ? PALETTE.red : s.color ?? PALETTE.amber;
        tint.globalAlpha = (s.opacity ?? 1) * (st === 'draft' ? 0.6 : st === 'proposed' ? 0.75 : 1);
        tint.lineWidth = wM * pxPerM;
        tint.stroke();
        tint.restore();
      } else if (s.type === 'line' && s.heat) {
        const pts = s.closed ? [...s.points, s.points[0]] : s.points;
        const widths = [150, 90, 50, 22].map((m) => m * pxPerM);
        const alphas = [0.28, 0.5, 0.75, 1];
        fx.lineCap = 'round';
        fx.lineJoin = 'round';
        widths.forEach((w, k) => {
          fx.lineWidth = w;
          for (let i = 0; i < pts.length - 1; i++) {
            const it = s.intensity ? s.intensity[i % s.points.length] ?? 1 : 1;
            const v = Math.round(255 * clamp(alphas[k] * (s.heat ?? 1) * Math.pow(it, 1.6), 0, 1));
            if (v < 4) continue;
            fx.strokeStyle = `rgb(0,${v},0)`;
            fx.beginPath();
            fx.moveTo(tx(pts[i][0]), ty(pts[i][1]));
            fx.lineTo(tx(pts[i + 1][0]), ty(pts[i + 1][1]));
            fx.stroke();
          }
        });
      }
    }
    this.fxTex.needsUpdate = true;
    this.tintTex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ units

  private makeUnit(spec: UnitSpec): UnitRec {
    const el = document.createElement('div');
    el.className = 'tte-item tte-chip';
    el.dataset.kind = spec.kind;
    el.dataset.id = spec.id;
    const st = STATUS_COLOR[spec.status ?? 'active'] ?? PALETTE.ok;
    const second = spec.kind === 'drone' ? `${fmtInt(spec.altitudeFt ?? 0)} ft` : spec.type ?? '';
    el.innerHTML = `<div class="tte-stem"></div><div class="tte-pill" style="--st:${st}" role="${spec.kind === 'drone' ? 'button' : 'note'}" tabindex="${spec.kind === 'drone' ? 0 : -1}" aria-label="${esc(spec.id)} ${esc(second)}">${(ICONS[spec.kind] ?? ICONS.drone).replace('<svg ', '<svg class="tte-ico" ')}<b>${esc(spec.id)}</b><i>·</i><span>${esc(second)}</span>${spec.detail ? `<em>${esc(spec.detail)}</em>` : ''}</div>`;
    const pill = el.querySelector<HTMLElement>('.tte-pill')!;
    const activate = () => {
      this.emit('unitclick', spec.id);
      if (spec.kind === 'drone' && this.pipOnUnitClick) this.openDronePip(spec.id);
    };
    pill.addEventListener('click', activate);
    pill.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });
    this.chipLayer.appendChild(el);
    const patrolLen = spec.patrol && spec.patrol.path.length > 1 ? polyLength([...spec.patrol.path, spec.patrol.path[0]]) : 0;
    const u: UnitRec = { spec, el, pos: new THREE.Vector3(), orbitCenter: spec.position, agl: spec.kind === 'drone' ? (spec.altitudeFt ?? 400) * FT : 0, patrolLen };
    u.orbitCenter = this.unitAnchor(u);
    return u;
  }

  /** Ground anchor: track at the scene time, else patrol loop on the animation clock, else position. */
  private unitAnchor(u: UnitRec, animTime = this.animTime): Vec2 {
    const s = u.spec;
    if (s.track && s.track.length) return trackAt(s.track, this.clock);
    if (s.patrol && u.patrolLen > 0) {
      const path = [...s.patrol.path, s.patrol.path[0]];
      let d = ((animTime * (s.patrol.speedMps ?? 18)) % u.patrolLen + u.patrolLen) % u.patrolLen;
      for (let i = 0; i < path.length - 1; i++) {
        const L = dist2(path[i], path[i + 1]);
        if (d <= L) return [lerp(path[i][0], path[i + 1][0], d / L), lerp(path[i][1], path[i + 1][1], d / L)];
        d -= L;
      }
    }
    return s.position;
  }

  /** Drone position for a given exaggeration (AGL is never exaggerated). */
  private dronePos(u: UnitRec, exag: number, out: THREE.Vector3): THREE.Vector3 {
    const s = u.spec;
    const r = s.orbitRadius ?? 0;
    const a = (s.orbitPhase ?? 0) + (r > 0 ? (this.animTime / (s.orbitPeriodS ?? 90)) * Math.PI * 2 : 0);
    const x = u.orbitCenter[0] + Math.cos(a) * r, y = u.orbitCenter[1] + Math.sin(a) * r;
    const g = this.hf.sample(u.orbitCenter[0], u.orbitCenter[1]);
    return out.set(x, g * exag + u.agl, -y);
  }

  private disposeUnitGraphics() {
    for (const o of [this.markerPoints, this.segLines]) {
      if (!o) continue;
      this.scene.remove(o);
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
    this.markerPoints = null;
    this.segLines = null;
  }

  private rebuildUnitGraphics() {
    this.disposeUnitGraphics();
    const vis = this.units.filter((u) => (u.spec.kind === 'drone' ? this.baseVisible.drones : this.baseVisible.units));
    for (const u of this.units) u.el.hidden = !vis.includes(u);
    if (!vis.length) return;
    // Breadcrumb slots follow the unit markers in the same Points draw call.
    const trails: { u: UnitRec; n: number }[] = vis.filter((u) => u.spec.track && (u.spec.trail ?? 0) > 0).map((u) => ({ u, n: Math.min(40, Math.ceil(u.spec.trail! / TRAIL_STEP)) }));
    const n = vis.length + trails.reduce((t, x) => t + x.n, 0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const col = new Float32Array(n * 3), size = new Float32Array(n), shape = new Float32Array(n), sel = new Float32Array(n), alpha = new Float32Array(n).fill(1);
    const shapes: Record<string, number> = { drone: 0, engine: 1, crew: 2, tender: 3, dozer: 4, command: 3, law: 5 };
    vis.forEach((u, i) => {
      const c = hexToVec3(STATUS_COLOR[u.spec.status ?? 'active'] ?? PALETTE.ok);
      col.set([c.x, c.y, c.z], i * 3);
      size[i] = u.spec.kind === 'drone' ? 11 : 12;
      shape[i] = shapes[u.spec.kind] ?? 0;
      sel[i] = this.pip?.drone === u ? 1 : 0;
      u.el.classList.toggle('is-selected', this.pip?.drone === u);
    });
    let k = vis.length;
    for (const t of trails) {
      const c = hexToVec3(STATUS_COLOR[t.u.spec.status ?? 'active'] ?? PALETTE.ok);
      for (let j = 0; j < t.n; j++, k++) {
        col.set([c.x, c.y, c.z], k * 3);
        size[k] = 6;
        shape[k] = 6;
      }
    }
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aShape', new THREE.BufferAttribute(shape, 1));
    g.setAttribute('aSel', new THREE.BufferAttribute(sel, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    this.markerPoints = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: MARKER_VERT, fragmentShader: MARKER_FRAG, transparent: true, depthWrite: false, uniforms: { uPR: this.U.uPR } }));
    this.markerPoints.frustumCulled = false;
    this.markerPoints.layers.set(1);
    this.markerPoints.renderOrder = 11;
    this.markerPoints.userData.units = vis;
    this.markerPoints.userData.trails = trails;
    this.scene.add(this.markerPoints);

    const drones = vis.filter((u) => u.spec.kind === 'drone');
    if (drones.length) {
      const RING = 48;
      const vcount = drones.length * (2 + RING);
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vcount * 3), 3));
      const sc = new Float32Array(vcount * 4);
      drones.forEach((u, d) => {
        const base = d * (2 + RING);
        const selected = this.pip?.drone === u;
        sc.set([0.62, 0.71, 0.8, 0.6, 0.62, 0.71, 0.8, 0.08], base * 4);
        for (let k = 0; k < RING; k++) sc.set(selected ? [0, 0.9, 1, 0.75] : [0.62, 0.75, 0.88, 0.32], (base + 2 + k) * 4);
      });
      sg.setAttribute('aColor', new THREE.BufferAttribute(sc, 4));
      this.segLines = new THREE.LineSegments(sg, new THREE.ShaderMaterial({ vertexShader: SEG_VERT, fragmentShader: SEG_FRAG, transparent: true, depthWrite: false, uniforms: { uDayNight: this.U.uDayNight } }));
      this.segLines.frustumCulled = false;
      this.segLines.layers.set(1);
      this.segLines.renderOrder = 10;
      this.segLines.userData.drones = drones;
      this.scene.add(this.segLines);
    }
    this.updateUnitPositions();
  }

  private updateUnitPositions() {
    const e = this.exag;
    for (const u of this.units) {
      u.orbitCenter = this.unitAnchor(u);
      if (u.spec.kind === 'drone') this.dronePos(u, e, u.pos);
      else u.pos.set(u.orbitCenter[0], this.hf.sample(u.orbitCenter[0], u.orbitCenter[1]) * e + 1, -u.orbitCenter[1]);
    }
    if (this.markerPoints) {
      const vis = this.markerPoints.userData.units as UnitRec[];
      const attr = this.markerPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      const al = this.markerPoints.geometry.getAttribute('aAlpha') as THREE.BufferAttribute;
      vis.forEach((u, i) => attr.setXYZ(i, u.pos.x, u.pos.y, u.pos.z));
      let k = vis.length;
      for (const t of this.markerPoints.userData.trails as { u: UnitRec; n: number }[]) {
        const tr = t.u.spec.track!;
        let last: Vec2 = t.u.orbitCenter;
        for (let j = 1; j <= t.n; j++, k++) {
          const tt = this.clock - j * TRAIL_STEP;
          const p = trackAt(tr, tt);
          const show = tt >= tr[0].t && dist2(p, last) > 8;
          if (show) last = p;
          attr.setXYZ(k, p[0], this.hf.sample(p[0], p[1]) * e + 1.5, -p[1]);
          al.setX(k, show ? 0.85 * (1 - (j - 1) / t.n) : 0);
        }
      }
      attr.needsUpdate = true;
      al.needsUpdate = true;
    }
    if (this.segLines) {
      const drones = this.segLines.userData.drones as UnitRec[];
      const attr = this.segLines.geometry.getAttribute('position') as THREE.BufferAttribute;
      const RING = 48;
      drones.forEach((u, d) => {
        const base = d * (2 + RING);
        const gx = u.pos.x, gy = -u.pos.z;
        attr.setXYZ(base, u.pos.x, u.pos.y - 3, u.pos.z);
        attr.setXYZ(base + 1, u.pos.x, this.hf.sample(gx, gy) * e + 1, u.pos.z);
        const r = u.spec.orbitRadius ?? 0;
        const g = this.hf.sample(u.orbitCenter[0], u.orbitCenter[1]);
        const alt = g * e + u.agl;
        for (let k = 0; k < RING; k += 2) {
          for (let j = 0; j < 2; j++) {
            const a = ((k + j) / RING) * Math.PI * 2;
            attr.setXYZ(base + 2 + k + j, u.orbitCenter[0] + Math.cos(a) * r, alt, -(u.orbitCenter[1] + Math.sin(a) * r));
          }
        }
      });
      attr.needsUpdate = true;
    }
  }

  // ------------------------------------------------------------------ PiP

  private buildPip(drone: UnitRec, opts: PipOptions = {}) {
    const el = document.createElement('div');
    const hosted = !!opts.host;
    el.className = hosted ? 'tte-pip is-docked' : 'tte-pip';
    el.setAttribute('role', hosted ? 'img' : 'dialog');
    el.setAttribute('aria-label', `${drone.spec.id} gimbal feed`);
    if (!hosted) {
      const w = Math.min(560, this.width - 24);
      el.style.width = `${w}px`;
      el.style.left = `${Math.max(12, this.width - w - 16)}px`;
      el.style.top = `16px`;
    }
    const name = drone.spec.name ?? '';
    const eoLabel = this.lighting === 'day' ? 'EO Day' : 'EO Night';
    el.innerHTML = `
      <div class="tte-pip-view">
        <svg class="hud" viewBox="0 0 160 90" preserveAspectRatio="none" aria-hidden="true">
          <g fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.2">
            <path d="M8 18V8h12M152 18V8h-12M8 72v10h12M152 72v10h-12"/>
            <path d="M68 45h8M84 45h8M80 33v8M80 49v8" />
            <circle cx="80" cy="45" r=".6" fill="#fff"/>
          </g>
        </svg>
        <div class="tape"><svg viewBox="0 0 200 30" preserveAspectRatio="none"></svg></div>
        <div class="ladder"><svg viewBox="0 0 30 100" preserveAspectRatio="none" style="width:100%;height:100%"><g stroke="rgba(255,255,255,.7)" stroke-width="1">${Array.from({ length: 10 }, (_, i) => `<line x1="${i % 3 === 0 ? 14 : 20}" x2="30" y1="${i * 11.1}" y2="${i * 11.1}"/>`).join('')}</g></svg><div class="mk" data-r="pmark">◂ −27°</div></div>
        <div class="legend"><i style="top:0">1000°C</i><i style="top:50%">400°</i><i style="top:100%">0°</i></div>
        <div class="lock" data-r="lock"><b data-r="temp"></b><span data-r="spi"></span></div>
        <div class="tl"><span class="tte-rec">●</span> REC <span data-r="rec">0:00:00</span><br>${esc(drone.spec.id)} ${esc(name.toUpperCase())}<br><span class="dim" data-r="mode">EO · NIGHT</span></div>
        <div class="tr"><span data-r="clock">${esc(this.timeLabel ?? this.opts.timeLabel[this.lighting])}</span><br><span class="dim">RELAY · LOS</span></div>
        <div class="bl" data-r="tele"></div>
        <div class="bc" data-r="spiline"></div>
        <div class="br" data-r="right"></div>
      </div>
      ${opts.bar === false ? '' : `<div class="tte-pip-bar">
        <span class="ttl"><b>${esc(drone.spec.id)}</b><span>${esc(name)}</span></span>
        <div class="seg" role="group" aria-label="Sensor"><button data-s="eo" class="on">${eoLabel}</button><button data-s="ir">IR Thermal</button></div>
        <span class="sp"></span>
        <button class="ico" data-z="-1" aria-label="Zoom out">−</button><span class="zoom" data-r="zoom">1.0×</span><button class="ico" data-z="1" aria-label="Zoom in">+</button>
        <button class="ico" data-a="close" aria-label="Close feed">✕</button>
      </div>`}`;
    (opts.host ?? this.container).appendChild(el);
    const refs: Record<string, HTMLElement> = {};
    el.querySelectorAll<HTMLElement>('[data-r]').forEach((n) => (refs[n.dataset.r!] = n));
    this.pip = { drone, el, view: el.querySelector('.tte-pip-view')!, sensor: 'eo', zoom: 1, opened: this.animTime, refs, hosted, host: opts.host ?? null };

    el.querySelectorAll<HTMLButtonElement>('.seg button').forEach((b) => b.addEventListener('click', () => this.setPipSensor(b.dataset.s as 'eo' | 'ir')));
    el.querySelectorAll<HTMLButtonElement>('[data-z]').forEach((b) =>
      b.addEventListener('click', () => {
        if (!this.pip) return;
        this.pip.zoom = clamp(this.pip.zoom * (Number(b.dataset.z) > 0 ? 1.5 : 1 / 1.5), 1, 8);
        this.touch();
        this.invalidate();
      }),
    );
    el.querySelector('[data-a=close]')?.addEventListener('click', () => this.closeDronePip());
    for (const ev of ['pointerdown', 'wheel', 'dblclick'] as const) el.addEventListener(ev, (e) => e.stopPropagation());
    if (hosted) return;

    const bar = el;
    let drag: { x: number; y: number; l: number; t: number } | null = null;
    bar.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      drag = { x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', (e) => {
      if (!drag) return;
      this.touch();
      el.style.left = `${clamp(drag.l + e.clientX - drag.x, 0, this.width - el.offsetWidth)}px`;
      el.style.top = `${clamp(drag.t + e.clientY - drag.y, 0, this.height - el.offsetHeight)}px`;
      this.invalidate();
    });
    const end = () => (drag = null);
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  }

  private pipRect(): { x: number; y: number; w: number; h: number } | null {
    if (!this.pip) return null;
    const vr = this.pip.view.getBoundingClientRect();
    const cr = this.canvas.getBoundingClientRect();
    const x = Math.max(0, vr.left - cr.left), y = Math.max(0, vr.top - cr.top);
    const w = Math.min(vr.width, cr.width - x), h = Math.min(vr.height, cr.height - y);
    return w > 8 && h > 8 ? { x, y, w, h } : null;
  }

  private updatePipCamera(rect: { w: number; h: number }): GimbalInfo {
    const pip = this.pip!;
    const pos = this.dronePos(pip.drone, 1, new THREE.Vector3());
    // No gimbal lock: look ahead along the sweep (or due east when hovering).
    let tgt: Vec2 = pip.drone.spec.gimbal?.target ?? this.unitAnchor(pip.drone, this.animTime + 30);
    if (Math.hypot(tgt[0] - pos.x, tgt[1] + pos.z) < 60) tgt = [pos.x + 450, -pos.z + 1];
    const tz = this.hf.sample(tgt[0], tgt[1]) + 1;
    const cam = this.pipCam;
    cam.position.copy(pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(tgt[0], tz, -tgt[1]);
    const hfov = 52 / pip.zoom;
    cam.aspect = rect.w / rect.h;
    cam.fov = (2 * Math.atan(Math.tan((hfov * DEG) / 2) / cam.aspect)) / DEG;
    cam.near = 2;
    cam.far = 9000;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const dx = tgt[0] - pos.x, dy = tgt[1] + pos.z, dz = tz - pos.y;
    const horiz = Math.hypot(dx, dy);
    return { heading: wrap360(Math.atan2(dx, dy) / DEG), pitch: Math.atan2(dz, horiz) / DEG, range: Math.hypot(horiz, dz), tgt, tz, hfov };
  }

  private updatePipHud(g: GimbalInfo, rect: { w: number; h: number }) {
    const pip = this.pip!;
    const r = pip.refs;
    const s = pip.drone.spec;
    const agl = pip.drone.agl / FT;
    const gs = s.orbitRadius && s.orbitPeriodS ? ((2 * Math.PI * s.orbitRadius) / s.orbitPeriodS) * 1.94384 : 0;
    const secs = Math.max(0, this.animTime - pip.opened);
    r.rec.textContent = `${Math.floor(secs / 3600)}:${String(Math.floor(secs / 60) % 60).padStart(2, '0')}:${String(Math.floor(secs) % 60).padStart(2, '0')}`;
    r.clock.textContent = this.timeLabel ?? this.opts.timeLabel[this.U.uDayNight.value > 0.5 ? 'day' : 'night'];
    r.mode.textContent = pip.sensor === 'ir' ? 'IR · IRONBOW · WHT-HOT' : this.U.uDayNight.value > 0.5 ? 'EO · DAY' : 'EO · NIGHT · GAIN HI';
    r.tele.innerHTML = `ALT ${fmtInt(agl)} FT AGL<br>GS ${Math.round(gs)} KT<br>HDG ${String(Math.round(g.heading) % 360).padStart(3, '0')}°<br>PITCH ${g.pitch < 0 ? '−' : ''}${Math.abs(Math.round(g.pitch))}°`;
    const { lat, lon } = this.geo.toLatLon(g.tgt[0], g.tgt[1]);
    r.spiline.innerHTML = `SPI ${this.geo.format(lat, lon)}<br><span class="dim">RNG ${fmtInt(g.range)} M · ELEV ${fmtInt(g.tz - 1)} M</span>`;
    r.right.innerHTML = `BAT 69%<br>LNK −63 DBM<br>ZOOM ${pip.zoom.toFixed(1)}× · ${Math.round(g.hfov)}° FOV`;
    if (r.zoom) r.zoom.textContent = `${pip.zoom.toFixed(1)}×`;
    pip.el.classList.toggle('is-compact', rect.w < 420);
    r.pmark.textContent = `◂ ${g.pitch < 0 ? '−' : ''}${Math.abs(Math.round(g.pitch))}°`;
    r.pmark.style.top = `${clamp(-g.pitch / 90, 0, 1) * 100}%`;
    const temp = s.gimbal?.tempC;
    r.temp.textContent = temp ? `${fmtInt(temp)}°C${s.gimbal?.targetId ? ` · ${s.gimbal.targetId}` : ''}` : 'TRACK';
    r.spi.textContent = this.geo.format(lat, lon);
    const v = new THREE.Vector3(g.tgt[0], g.tz, -g.tgt[1]).project(this.pipCam);
    r.lock.style.left = `${((v.x + 1) / 2) * rect.w}px`;
    r.lock.style.top = `${((1 - v.y) / 2) * rect.h}px`;
    // heading tape
    const tape = pip.el.querySelector('.tape svg')!;
    let html = '<g stroke="rgba(255,255,255,.85)" fill="rgba(255,255,255,.9)" font-size="8" font-family="monospace" text-anchor="middle">';
    const h0 = g.heading;
    for (let d = Math.floor((h0 - 40) / 5) * 5; d <= h0 + 40; d += 5) {
      const x = 100 + (d - h0) * 2.4;
      const major = wrap360(d) % 30 === 0;
      html += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${major ? 14 : 18}" y2="22"/>`;
      if (major) html += `<text x="${x.toFixed(1)}" y="10" stroke="none">${wrap360(d)}</text>`;
    }
    html += `</g><path d="M100 23l-3 5h6z" fill="#fff"/>`;
    tape.innerHTML = html;
  }

  // ------------------------------------------------------------------ camera

  private startCamTween(from: CamState, to: CamState, dur: number, done?: () => void) {
    to.bearing = from.bearing + angleDelta(from.bearing, to.bearing);
    if (dur <= 0) {
      this.cam = { ...to };
      this.camTween = null;
      done?.();
    } else this.camTween = { from, to, t0: performance.now(), dur, done };
    this.invalidate();
  }

  private stepTweens(now: number): boolean {
    let active = false;
    if (this.camTween) {
      const tw = this.camTween;
      const k = clamp((now - tw.t0) / tw.dur, 0, 1);
      const e = easeInOutCubic(k);
      const f = tw.from, t = tw.to;
      this.cam = {
        tx: lerp(f.tx, t.tx, e),
        ty: lerp(f.ty, t.ty, e),
        h: Math.exp(lerp(Math.log(f.h), Math.log(t.h), e)),
        pitch: lerp(f.pitch, t.pitch, e),
        bearing: lerp(f.bearing, t.bearing, e),
        fov: Math.exp(lerp(Math.log(f.fov), Math.log(t.fov), e)),
      };
      if (k >= 1) {
        this.cam.bearing = wrap360(this.cam.bearing + 180) - 180;
        this.camTween = null;
        tw.done?.();
      } else active = true;
    }
    if (this.dayTween) {
      const tw = this.dayTween;
      const k = clamp((now - tw.t0) / tw.dur, 0, 1);
      this.U.uDayNight.value = lerp(tw.from, tw.to, easeInOutCubic(k));
      this.onLightingChanged();
      if (k >= 1) this.dayTween = null;
      else active = true;
    }
    if (this.clockTween) {
      const tw = this.clockTween;
      const k = clamp((now - tw.t0) / tw.dur, 0, 1);
      this.clock = lerp(tw.from, tw.to, easeInOutCubic(k));
      this.onClockChanged();
      if (k >= 1) this.clockTween = null;
      else active = true;
    }
    if (this.tintFadeTween) {
      const tw = this.tintFadeTween;
      const k = clamp((now - tw.t0) / tw.dur, 0, 1);
      this.U.uTintFade.value = easeInOutCubic(k);
      if (k >= 1) this.tintFadeTween = null;
      else active = true;
    }
    if (this.insetTween) {
      const tw = this.insetTween;
      const k = clamp((now - tw.t0) / tw.dur, 0, 1);
      const e = easeInOutCubic(k);
      const f = tw.from, t = tw.to;
      this.insets = { top: lerp(f.top, t.top, e), right: lerp(f.right, t.right, e), bottom: lerp(f.bottom, t.bottom, e), left: lerp(f.left, t.left, e) };
      if (k >= 1) this.insetTween = null;
      else active = true;
    }
    if (this.dimTweens.size) {
      for (const [rec, tw] of [...this.dimTweens]) {
        const k = clamp((now - tw.t0) / tw.dur, 0, 1);
        rec.dim = lerp(tw.from, tw.to, k);
        this.setLayerAlpha(rec, rec.alpha);
        if (k >= 1 || !this.layers.has(rec.id)) this.dimTweens.delete(rec);
        else active = true;
      }
    }
    if (this.fades.length) {
      for (const f of [...this.fades]) {
        const k = clamp((now - f.tw.t0) / f.tw.dur, 0, 1);
        this.setLayerAlpha(f.rec, lerp(f.tw.from, f.tw.to, k));
        if (k >= 1) {
          this.fades.splice(this.fades.indexOf(f), 1);
          if (f.out) this.disposeLayerObjects(f.rec);
        }
      }
      if (this.fades.length) active = true;
    }
    if (this.exagTween) {
      const tw = this.exagTween;
      const k = clamp((now - tw.t0) / tw.dur, 0, 1);
      this.exag = lerp(tw.from, tw.to, easeInOutCubic(k));
      this.onExagChanged();
      if (k >= 1) this.exagTween = null;
      else active = true;
    }
    return active;
  }

  private onExagChanged() {
    this.U.uExag.value = this.exag;
    this.updateUnitPositions();
  }

  private applyCamera() {
    const c = this.cam;
    const aspect = this.width / this.height;
    const W = this.hf.width, H = this.hf.height;
    c.tx = clamp(c.tx, -W / 2, W / 2);
    c.ty = clamp(c.ty, -H / 2, H / 2);
    const tz = sampleGrid(this.smoothDem, this.hf.cols, this.hf.rows, this.hf.colOf(c.tx), this.hf.rowOf(c.ty)) * this.exag;
    this.targetZ = tz;
    const target = new THREE.Vector3(c.tx, tz, -c.ty);
    const b = c.bearing * DEG;
    const heading = new THREE.Vector3(Math.sin(b), 0, -Math.cos(b));
    if (this.useOrtho) {
      const o = this.ortho;
      o.left = (-c.h / 2) * aspect;
      o.right = (c.h / 2) * aspect;
      o.top = c.h / 2;
      o.bottom = -c.h / 2;
      o.position.set(c.tx, tz + 6000, -c.ty);
      o.up.copy(heading);
      o.lookAt(target);
      o.near = 10;
      o.far = 6000 + tz + 900;
      this.applyViewOffset(o);
      o.updateProjectionMatrix();
      o.updateMatrixWorld();
      this.active = o;
      this.U.uMppA.value = c.h / this.height;
      this.U.uMppB.value = 0;
    } else {
      const p = this.persp;
      const p0 = c.pitch * DEG;
      const dist = c.h / (2 * Math.tan((c.fov * DEG) / 2));
      const pos = target.clone().addScaledVector(heading, -dist * Math.sin(p0));
      pos.y += dist * Math.cos(p0);
      const ground = this.hf.sample(pos.x, -pos.z) * this.exag;
      if (pos.y < ground + 25) pos.y = ground + 25;
      p.position.copy(pos);
      p.up.copy(heading).multiplyScalar(Math.cos(p0)).add(new THREE.Vector3(0, Math.sin(p0), 0)).normalize();
      p.lookAt(target);
      p.fov = c.fov;
      p.aspect = aspect;
      const agl = Math.max(5, pos.y - ground);
      p.near = clamp(Math.min(dist * 0.03, agl * 0.4), 1, 5000);
      p.far = Math.max(dist * 4 + 16000, 42000);
      this.applyViewOffset(p);
      p.updateProjectionMatrix();
      p.updateMatrixWorld();
      this.active = p;
      this.U.uMppA.value = 0;
      this.U.uMppB.value = (2 * Math.tan((c.fov * DEG) / 2)) / this.height;
    }
    const topo = this.useOrtho ? 1 : 1 - smoothstep(0, 25, c.pitch);
    this.U.uTopo.value = topo;
    const vk = `${Math.round(c.bearing * 2)}|${Math.round(c.pitch)}|${this.mode}|${Math.round(c.h / 20)}`;
    if (vk !== this.lastView) {
      this.lastView = vk;
      queueMicrotask(() => this.emit('view', this.getView()));
    }
    const mpp = c.h / this.height;
    this.U.uScale.value = Math.pow(2, Math.round(Math.log2(Math.max(mpp, 0.05))));
    const dist = c.h / (2 * Math.tan((c.fov * DEG) / 2));
    // FogExp2: half-fogged at ~2.6x the eye distance; none in the top-down map.
    const fog = this.scene.fog as THREE.FogExp2;
    fog.density = this.useOrtho ? 0 : (0.8326 / (dist * 2.6 + 2200)) * smoothstep(0, 30, c.pitch);
    this.U.uFogDensity.value = fog.density;
    // Horizon line for the CSS sky gradient.
    let hz = -1000;
    if (!this.useOrtho) {
      const pc = this.persp;
      const fwd = new THREE.Vector3();
      pc.getWorldDirection(fwd);
      fwd.y = 0;
      if (fwd.lengthSq() > 1e-6) {
        const v = pc.position.clone().addScaledVector(fwd.normalize(), 1e6).project(pc);
        hz = ((1 - v.y) / 2) * this.height;
      }
    }
    const hzs = `${Math.round(hz)}px`;
    if (this.container.style.getPropertyValue('--tte-hz') !== hzs) this.container.style.setProperty('--tte-hz', hzs);
    // Graticule step adapts so lines stay 60..400 px apart.
    const px = (0.005 * this.geo.mLon) / mpp;
    const step = px < 60 ? 0.01 : px > 420 ? 0.001 : 0.005;
    if (step !== this.gratStep) {
      this.gratStep = step;
      (this.terrainMat.uniforms.uGrat.value as THREE.Vector4).copy(this.gratUniform());
    }
  }

  private gratUniform(): THREE.Vector4 {
    const s = this.gratStep;
    const lon0 = Math.ceil(this.geo.lon0 / s) * s, lat0 = Math.ceil(this.geo.lat0 / s) * s;
    return new THREE.Vector4((lon0 - this.geo.lon0) * this.geo.mLon, (lat0 - this.geo.lat0) * this.geo.mLat, s * this.geo.mLon, s * this.geo.mLat);
  }

  private rayFrom(clientX: number, clientY: number): THREE.Ray {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.active);
    return rc.ray;
  }

  private planeHit(clientX: number, clientY: number): THREE.Vector3 | null {
    const ray = this.rayFrom(clientX, clientY);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.targetZ);
    const out = new THREE.Vector3();
    if (!ray.intersectPlane(plane, out)) return null;
    const d = out.distanceTo(ray.origin);
    if (!this.useOrtho && d > this.cam.h * 8) return null;
    return out;
  }

  /** Ray march against the exaggerated heightfield; returns world (x, y). */
  private groundHit(clientX: number, clientY: number): Vec2 | null {
    const ray = this.rayFrom(clientX, clientY);
    const e = this.exag;
    const o = ray.origin, d = ray.direction;
    const top = (this.hf.max + 5) * e;
    let t = 0;
    if (o.y > top) {
      if (d.y >= 0) return null;
      t = (o.y - top) / -d.y;
    }
    const step = Math.max(3, (this.cam.h / this.height) * 1.5);
    const p = new THREE.Vector3();
    const below = (tt: number) => {
      p.copy(o).addScaledVector(d, tt);
      return p.y <= this.hf.sample(p.x, -p.z) * e;
    };
    for (let i = 0; i < 6000; i++) {
      const tn = t + step;
      if (below(tn)) {
        let lo = t, hi = tn;
        for (let k = 0; k < 18; k++) {
          const mid = (lo + hi) / 2;
          if (below(mid)) hi = mid;
          else lo = mid;
        }
        p.copy(o).addScaledVector(d, hi);
        return this.hf.contains(p.x, -p.z) ? [p.x, -p.z] : null;
      }
      t = tn;
      p.copy(o).addScaledVector(d, t);
      if (p.y < this.hf.min * e - 10 || !Number.isFinite(p.y)) return null;
    }
    return null;
  }

  // ------------------------------------------------------------------ input

  private bindEvents() {
    const c = this.container;
    const pointers = new Map<number, { x: number; y: number }>();
    let mode: 'pan' | 'rotate' | 'pinch' | null = null;
    let anchor: THREE.Vector3 | null = null;
    let last = { x: 0, y: 0 };
    let pinch: { d: number; a: number; h: number; bearing: number } | null = null;

    let press = { x: 0, y: 0, t: 0 };
    const onDown = (e: PointerEvent) => {
      if (e.target !== this.canvas) return;
      press = { x: e.clientX, y: e.clientY, t: performance.now() };
      this.touch();
      this.camTween = null;
      this.canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(b.x - a.x, b.y - a.y), a: Math.atan2(b.y - a.y, b.x - a.x), h: this.cam.h, bearing: this.cam.bearing };
        mode = 'pinch';
        return;
      }
      const rotate = e.button === 2 || e.button === 1 || e.shiftKey || e.ctrlKey || e.altKey;
      mode = rotate && !this.useOrtho && this.mode === 'perspective' ? 'rotate' : 'pan';
      anchor = mode === 'pan' ? this.planeHit(e.clientX, e.clientY) : null;
      last = { x: e.clientX, y: e.clientY };
      c.classList.add('is-dragging');
    };
    const onMove = (e: PointerEvent) => {
      this.touch();
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === 'pinch' && pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        this.cam.h = clamp((pinch.h * pinch.d) / Math.max(d, 1), 120, this.maxH());
        if (this.mode === 'perspective' && !this.useOrtho) this.cam.bearing = pinch.bearing - (Math.atan2(b.y - a.y, b.x - a.x) - pinch.a) / DEG;
        this.invalidate();
        return;
      }
      if (mode === 'pan' && anchor) {
        this.applyCamera();
        const cur = this.planeHit(e.clientX, e.clientY);
        if (cur) {
          this.cam.tx += anchor.x - cur.x;
          this.cam.ty -= anchor.z - cur.z;
        }
        this.invalidate();
      } else if (mode === 'rotate') {
        this.cam.bearing += (e.clientX - last.x) * 0.3;
        this.cam.pitch = clamp(this.cam.pitch - (e.clientY - last.y) * 0.25, 5, 78);
        last = { x: e.clientX, y: e.clientY };
        this.invalidate();
      }
    };
    const onUp = (e: PointerEvent) => {
      // A click (not a drag) on an interactive line selects it.
      if (pointers.size === 1 && e.type === 'pointerup' && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5 && performance.now() - press.t < 450) {
        const id = this.pickLayer(e.clientX, e.clientY);
        if (id) this.emit('layerclick', { id });
      }
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        mode = null;
        anchor = null;
        pinch = null;
        c.classList.remove('is-dragging');
      }
    };
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.tte-pip')) return;
      e.preventDefault();
      this.touch();
      this.camTween = null;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      this.zoomAt(e.clientX, e.clientY, Math.exp(dy * 0.0012));
    };
    const onDbl = (e: MouseEvent) => {
      if (e.target !== this.canvas) return;
      this.zoomAt(e.clientX, e.clientY, 0.5);
    };
    const onKeyInput = () => this.touch();
    const onVis = () => {
      this.pageVisible = document.visibilityState !== 'hidden';
      this.emitMotion();
      if (this.pageVisible) this.invalidate();
    };
    this.canvas.addEventListener('pointerdown', onDown);
    this.canvas.addEventListener('pointermove', onMove);
    c.addEventListener('pointermove', onKeyInput, { passive: true });
    this.canvas.addEventListener('pointerup', onUp);
    this.canvas.addEventListener('pointercancel', onUp);
    c.addEventListener('wheel', onWheel, { passive: false });
    this.canvas.addEventListener('dblclick', onDbl);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('keydown', onKeyInput);
    document.addEventListener('visibilitychange', onVis);
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(c);
    const io = new IntersectionObserver((ents) => {
      this.onScreen = ents.some((x) => x.isIntersecting);
      this.emitMotion();
      if (this.onScreen) this.invalidate();
    });
    io.observe(c);
    this.cleanup.push(
      () => c.removeEventListener('wheel', onWheel),
      () => c.removeEventListener('pointermove', onKeyInput),
      () => c.removeEventListener('keydown', onKeyInput),
      () => document.removeEventListener('visibilitychange', onVis),
      () => ro.disconnect(),
      () => io.disconnect(),
    );
  }

  private maxH() {
    return Math.max(4200, (this.hf.width / (this.width / this.height)) * 1.15);
  }

  private zoomAt(clientX: number, clientY: number, factor: number) {
    this.applyCamera();
    const before = this.planeHit(clientX, clientY);
    this.cam.h = clamp(this.cam.h * factor, 120, this.maxH());
    this.applyCamera();
    const after = this.planeHit(clientX, clientY);
    if (before && after) {
      this.cam.tx += before.x - after.x;
      this.cam.ty -= before.z - after.z;
    }
    this.invalidate();
  }

  private resize() {
    const r = this.container.getBoundingClientRect();
    this.width = Math.max(1, Math.round(r.width));
    this.height = Math.max(1, Math.round(r.height));
    this.renderer.setSize(this.width, this.height, false);
    this.U.uPR.value = this.renderer.getPixelRatio();
    if (this.pip && !this.pip.hosted) {
      const el = this.pip.el;
      el.style.width = `${Math.min(560, this.width - 24)}px`;
      el.style.left = `${clamp(el.offsetLeft, 0, Math.max(0, this.width - el.offsetWidth))}px`;
      el.style.top = `${clamp(el.offsetTop, 0, Math.max(0, this.height - el.offsetHeight))}px`;
    }
    this.invalidate();
  }

  private touch() {
    this.lastInput = performance.now();
    if (this.parked) {
      this.parked = false;
      this.emitMotion();
      this.invalidate();
    }
  }

  private emitMotion() {
    const m = this.getMetrics().motion;
    this.container.classList.toggle('is-still', m !== 'running');
    this.emit('motion', m);
  }

  private emit(ev: EngineEvent, payload: unknown) {
    this.listeners.get(ev)?.forEach((fn) => fn(payload));
  }

  // ------------------------------------------------------------------ loop

  private hasAnimatedContent(): boolean {
    if (this.pip) return true;
    if (this.units.some((u) => u.spec.kind === 'drone' && ((u.spec.orbitRadius ?? 0) > 0 || u.spec.patrol)) && this.baseVisible.drones) return true;
    for (const r of this.layers.values()) {
      if (!r.visible) continue;
      const s = r.spec;
      if (s.type === 'points' || (s.type === 'field' && (s.front ?? 0) > 0)) return true;
      if (s.type === 'line' && (s.heat || r.objects.some((o) => o.userData.flow))) return true;
    }
    return false;
  }

  private motionActive(now: number): boolean {
    if (!this.motion || !this.pageVisible || !this.onScreen) return false;
    if (this.opts.motionIdleMs > 0 && now - this.lastInput > this.opts.motionIdleMs) {
      if (!this.parked) {
        this.parked = true;
        queueMicrotask(() => this.emitMotion());
      }
      return false;
    }
    return this.hasAnimatedContent();
  }

  private requestFrame() {
    if (this.rafId || this.disposed) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = 0;
    }
    this.rafId = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.rafId = 0;
    if (this.disposed) return;
    const dt = this.lastFrame ? Math.min(0.1, (now - this.lastFrame) / 1000) : 0;
    this.lastFrame = now;
    const tweening = this.stepTweens(now);
    const motion = this.motionActive(now);
    if (motion) {
      this.animTime += dt;
      this.U.uTime.value = this.animTime;
      this.updateUnitPositions();
    }
    const t0 = performance.now();
    this.renderNow();
    this.stats.cpu = performance.now() - t0;
    if (tweening) this.requestFrame();
    else if (motion) {
      const wait = Math.max(0, 1000 / ANIM_FPS - (performance.now() - now));
      this.timer = window.setTimeout(() => {
        this.timer = 0;
        this.requestFrame();
      }, wait);
    } else this.lastFrame = 0;
  };

  private renderNow() {
    if (this.maskDirty) this.paintMasks();
    this.applyCamera();
    const r = this.renderer, U = this.U;
    r.info.reset();
    r.setScissorTest(false);
    r.setViewport(0, 0, this.width, this.height);
    U.uThermal.value = this.thermal ? 1 : 0;
    U.uSensor.value = 0;
    U.uContours.value = this.baseVisible.contours ? 1 : 0;
    U.uGraticule.value = this.baseVisible.graticule ? 1 : 0;
    r.render(this.scene, this.active);
    this.stats.main = { drawCalls: r.info.render.calls, triangles: r.info.render.triangles };
    this.stats.pip = null;
    this.frames++;
    const now = performance.now();
    this.frameTimes.push(now);
    while (this.frameTimes.length && now - this.frameTimes[0] > 1000) this.frameTimes.shift();

    const rect = this.pipRect();
    if (this.pip && rect) {
      const saved = { exag: U.uExag.value, topo: U.uTopo.value, mppA: U.uMppA.value, mppB: U.uMppB.value, fog: U.uFogDensity.value };
      U.uExag.value = 1;
      U.uSensor.value = 1;
      U.uThermal.value = this.pip.sensor === 'ir' ? 1 : 0;
      U.uTopo.value = 0;
      U.uContours.value = 0;
      U.uGraticule.value = 0;
      const g = this.updatePipCamera(rect);
      U.uMppA.value = 0;
      U.uMppB.value = (2 * Math.tan((this.pipCam.fov * DEG) / 2)) / rect.h;
      U.uFogDensity.value = 0.8326 / 3600;
      // Only the rows the sensor frustum can see are drawn (row-major index range).
      const range = this.pipRowRange();
      const geo = this.terrain.geometry;
      const perRow = (this.hf.cols - 1) * 6;
      geo.setDrawRange(range[0] * perRow, (range[1] - range[0]) * perRow);
      const before = { calls: r.info.render.calls, tris: r.info.render.triangles };
      r.setScissorTest(true);
      const y = this.height - rect.y - rect.h;
      r.setScissor(rect.x, y, rect.w, rect.h);
      r.setViewport(rect.x, y, rect.w, rect.h);
      const hzc = U.uFogColor.value;
      r.setClearColor(new THREE.Color().setRGB(hzc.x, hzc.y, hzc.z, THREE.SRGBColorSpace), 1);
      r.render(this.scene, this.pipCam);
      r.setClearColor(0x000000, 0);
      r.setScissorTest(false);
      r.setViewport(0, 0, this.width, this.height);
      geo.setDrawRange(0, Infinity);
      this.stats.pip = { drawCalls: r.info.render.calls - before.calls, triangles: r.info.render.triangles - before.tris };
      U.uExag.value = saved.exag;
      U.uTopo.value = saved.topo;
      U.uMppA.value = saved.mppA;
      U.uMppB.value = saved.mppB;
      U.uFogDensity.value = saved.fog;
      U.uSensor.value = 0;
      U.uThermal.value = this.thermal ? 1 : 0;
      this.updatePipHud(g, rect);
    }
    this.updateDom();
  }

  /** Terrain rows intersected by the PiP frustum footprint (with margin). */
  private pipRowRange(): [number, number] {
    const cam = this.pipCam;
    const ys: number[] = [];
    const v = new THREE.Vector3();
    const dir = new THREE.Vector3();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
      v.set(sx, sy, 0.5).unproject(cam);
      dir.copy(v).sub(cam.position).normalize();
      for (const planeZ of [this.hf.min, this.hf.max]) {
        let t = dir.y < -1e-4 ? (planeZ - cam.position.y) / dir.y : 6000;
        if (t < 0 || t > 6000) t = 6000;
        ys.push(-(cam.position.z + dir.z * t));
      }
    }
    ys.push(-cam.position.z);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const r0 = clamp(Math.floor(this.hf.rowOf(yMax)) - 2, 0, this.hf.rows - 1);
    const r1 = clamp(Math.ceil(this.hf.rowOf(yMin)) + 2, r0 + 1, this.hf.rows - 1);
    return [r0, r1];
  }

  // ------------------------------------------------------------------ DOM projection

  private updateDom() {
    const cam = this.active;
    const W = this.width, H = this.height;
    const v = new THREE.Vector3();
    const camPos = cam.position;
    const persp = !this.useOrtho;
    // The PiP view is see-through DOM over its scissor region, so map DOM under it must hide.
    const pr = this.pipRect();
    let pipBox: number[] | null = null;
    if (pr && this.pip) {
      const er = this.pip.el.getBoundingClientRect(), cr = this.container.getBoundingClientRect();
      pipBox = [er.left - cr.left - 30, er.top - cr.top - 30, er.right - cr.left + 30, er.bottom - cr.top + 30];
    }
    const project = (el: HTMLElement, p: THREE.Vector3, occlusion: boolean): Vec2 | null => {
      v.copy(p).project(cam);
      const sx = ((v.x + 1) / 2) * W, sy = ((1 - v.y) / 2) * H;
      const underPip = !!pipBox && sx > pipBox[0] && sx < pipBox[2] && sy > pipBox[1] && sy < pipBox[3];
      const visible = !underPip && v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15;
      if (!visible) {
        if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
        return null;
      }
      if (el.style.visibility) el.style.visibility = '';
      const x = ((v.x + 1) / 2) * W, y = ((1 - v.y) / 2) * H;
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      if (occlusion) el.classList.toggle('is-occluded', persp && this.occluded(camPos, p));
      return [x, y];
    };

    // Declutter: markers keep their spot, chips stack upward on longer stems, labels yield.
    const boxes: number[][] = [];
    const hits = (b: number[]) => boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    const overlapArea = (b: number[]) => {
      let a = 0;
      for (const o of boxes) a += Math.max(0, Math.min(b[2], o[2]) - Math.max(b[0], o[0])) * Math.max(0, Math.min(b[3], o[3]) - Math.max(b[1], o[1]));
      return a;
    };
    const p = new THREE.Vector3();
    const labels: { el: HTMLElement; xy: Vec2 }[] = [];
    for (const rec of [...this.layers.values(), ...this.fades.filter((f) => f.out).map((f) => f.rec)]) {
      if (!rec.visible) continue;
      for (const e of rec.els) {
        if (e.el.hidden) continue;
        if (e.hide) {
          if (e.el.style.visibility !== 'hidden') e.el.style.visibility = 'hidden';
          continue;
        }
        p.set(e.pos[0], this.hf.sample(e.pos[0], e.pos[1]) * this.exag + e.lift, -e.pos[1]);
        const xy = project(e.el, p, e.occlusion);
        if (!xy) continue;
        if (rec.spec.type === 'marker') {
          const [w, h] = this.measure(e.el.querySelector('.tte-mt') as HTMLElement);
          boxes.push([xy[0] - 10, xy[1] - 12, xy[0] + 16 + w, xy[1] - 8 + h]);
        } else labels.push({ el: e.el, xy });
      }
    }
    const chips = this.units.filter((u) => !u.el.hidden).sort((a, b) => Number(this.pip?.drone === b) - Number(this.pip?.drone === a) || Number(a.spec.kind === 'drone') - Number(b.spec.kind === 'drone'));
    for (const u of chips) {
      const xy = project(u.el, u.pos, u.spec.kind !== 'drone');
      if (!xy) continue;
      const [w, h] = this.measure(u.el.querySelector('.tte-pill') as HTMLElement);
      boxes.push([xy[0] - 6, xy[1] - 6, xy[0] + 6, xy[1] + 6]);
      // Candidates: stack up to 4 levels, centred or slid sideways over the stem; least overlap wins.
      let best = { lift: 0, dx: 0, box: [] as number[], cost: Infinity };
      search: for (let k = 0; k < 5; k++)
        for (const f of [0, -0.42, 0.42]) {
          const lift = k * (h + 5), dx = f * w;
          const box = [xy[0] + dx - w / 2 - 3, xy[1] - 13 - lift - h - 3, xy[0] + dx + w / 2 + 3, xy[1] - 13 - lift + 1];
          const cost = overlapArea(box) + k * 4 + Math.abs(f) * 6;
          if (cost < best.cost) best = { lift, dx, box, cost };
          if (overlapArea(box) === 0) break search;
        }
      boxes.push(best.box);
      const lv = `${best.lift}px`, dv = `${best.dx.toFixed(1)}px`;
      if (u.el.style.getPropertyValue('--lift') !== lv) u.el.style.setProperty('--lift', lv);
      if (u.el.style.getPropertyValue('--dx') !== dv) u.el.style.setProperty('--dx', dv);
    }
    for (const l of labels) {
      const [w, h] = this.measure(l.el);
      const b = [l.xy[0] - w / 2, l.xy[1] - h / 2, l.xy[0] + w / 2, l.xy[1] + h / 2];
      const clash = hits(b);
      l.el.classList.toggle('is-clashing', clash);
      if (!clash) boxes.push(b);
    }
    this.updateHud();
  }

  private measure(el: HTMLElement | null): [number, number] {
    if (!el) return [0, 0];
    let s = this.sizeCache.get(el);
    if (!s || !s[0]) {
      s = [el.offsetWidth, el.offsetHeight];
      this.sizeCache.set(el, s);
    }
    return s;
  }

  private occluded(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const e = this.exag;
    const N = 28;
    for (let i = 2; i < N; i++) {
      const t = i / N;
      const x = lerp(to.x, from.x, t), y = lerp(to.y, from.y, t), z = lerp(to.z, from.z, t);
      if (!this.hf.contains(x, -z)) break;
      if (this.hf.sample(x, -z) * e > y + 2) return true;
    }
    return false;
  }

  private buildHud() {
    const comp = document.createElement('button');
    comp.className = 'tte-compass';
    comp.setAttribute('aria-label', 'Reset bearing to north');
    comp.innerHTML = `<svg viewBox="-20 -20 40 40"><g><path d="M0-15 5 0H-5z" fill="#E5533C"/><path d="M0 15 5 0H-5z" fill="#8796A8"/><text y="-16.5" text-anchor="middle" font-size="6.5" font-weight="700" fill="#D7E0EA" font-family="sans-serif" dy="0">N</text></g></svg>`;
    comp.style.border = '1px solid rgba(150,170,195,.28)';
    comp.addEventListener('click', () => {
      if (this.mode === 'perspective') this.startCamTween({ ...this.cam }, { ...this.cam, bearing: 0 }, 600);
    });
    this.compassSvg = comp.querySelector('svg g');
    const scale = document.createElement('div');
    scale.className = 'tte-scale';
    this.scaleEl = scale;
    this.hudLayer.append(comp, scale);
  }

  private updateHud() {
    if (!this.opts.hud) return;
    this.compassSvg?.setAttribute('transform', `rotate(${-this.cam.bearing})`);
    const mpp = this.cam.h / this.height;
    const nice = [25, 50, 100, 200, 250, 500, 1000, 2000];
    let L = nice[0];
    for (const n of nice) if (n / mpp <= 120) L = n;
    if (this.scaleEl) {
      const px = Math.round(L / mpp);
      const lab = (m: number) => (m >= 1000 ? `${m / 1000} km` : `${m} m`);
      const html = `<div class="lbl" style="width:${px}px"><span>0</span><span>${lab(L / 2)}</span><span>${lab(L)}</span></div><div class="bar" style="width:${px}px"></div>`;
      if (this.scaleEl.dataset.k !== html) {
        this.scaleEl.innerHTML = html;
        this.scaleEl.dataset.k = html;
      }
    }
    // Lat/lon edge ticks (top-down only).
    const show = this.useOrtho && this.opts.hud;
    let used = 0;
    if (show) {
      const s = this.gratStep;
      const halfW = (this.cam.h / 2) * (this.width / this.height), halfH = this.cam.h / 2;
      const left = this.cam.tx - halfW, right = this.cam.tx + halfW, top = this.cam.ty + halfH, bottom = this.cam.ty - halfH;
      const dec = s < 0.005 ? 3 : 3;
      const lonA = this.geo.lon0 + left / this.geo.mLon, lonB = this.geo.lon0 + right / this.geo.mLon;
      for (let lon = Math.ceil(lonA / s) * s; lon <= lonB; lon += s) {
        const x = ((lon - this.geo.lon0) * this.geo.mLon - left) / (2 * halfW) * this.width;
        if (x < 70 || x > this.width - 70) continue;
        const el = this.tick(used++);
        el.textContent = `${Math.abs(lon).toFixed(dec)}°${lon < 0 ? 'W' : 'E'}`;
        el.style.transform = `translate(${(x - el.offsetWidth / 2).toFixed(1)}px, 8px)`;
      }
      const latA = this.geo.lat0 + bottom / this.geo.mLat, latB = this.geo.lat0 + top / this.geo.mLat;
      for (let lat = Math.ceil(latA / s) * s; lat <= latB; lat += s) {
        const y = (top - (lat - this.geo.lat0) * this.geo.mLat) / (2 * halfH) * this.height;
        if (y < 40 || y > this.height - 50) continue;
        const el = this.tick(used++);
        el.textContent = `${Math.abs(lat).toFixed(dec)}°${lat < 0 ? 'S' : 'N'}`;
        el.style.transform = `translate(${(this.width - el.offsetWidth - 8).toFixed(1)}px, ${(y - 9).toFixed(1)}px)`;
      }
    }
    for (let i = used; i < this.tickPool.length; i++) this.tickPool[i].hidden = true;
  }

  private tick(i: number): HTMLDivElement {
    let el = this.tickPool[i];
    if (!el) {
      el = document.createElement('div');
      el.className = 'tte-tick';
      el.style.left = '0';
      el.style.top = '0';
      this.tickLayer.appendChild(el);
      this.tickPool[i] = el;
    }
    el.hidden = false;
    return el;
  }
}

// ============================================================================
// Geometry builders and analysis
// ============================================================================

function boxBlur(src: Float32Array, cols: number, rows: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < rows; y++) {
    let acc = 0;
    const row = y * cols;
    for (let x = -r; x <= r; x++) acc += src[row + clamp(x, 0, cols - 1)];
    for (let x = 0; x < cols; x++) {
      tmp[row + x] = acc / (2 * r + 1);
      acc += src[row + clamp(x + r + 1, 0, cols - 1)] - src[row + clamp(x - r, 0, cols - 1)];
    }
  }
  for (let x = 0; x < cols; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, rows - 1) * cols + x];
    for (let y = 0; y < rows; y++) {
      out[y * cols + x] = acc / (2 * r + 1);
      acc += tmp[clamp(y + r + 1, 0, rows - 1) * cols + x] - tmp[clamp(y - r, 0, rows - 1) * cols + x];
    }
  }
  return out;
}

function analyseTerrain(hf: Heightfield, seed: number) {
  const { cols, rows, data } = hf;
  const n = cols * rows;
  const sm = boxBlur(data, cols, rows, 1);
  const gx = new Float32Array(n), gy = new Float32Array(n), veg = new Float32Array(n), rock = new Float32Array(n), lap = new Float32Array(n);
  const nz = new Simplex2(mulberry32(seed * 977 + 3));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const cl = Math.max(c - 1, 0), cr = Math.min(c + 1, cols - 1), ru = Math.max(r - 1, 0), rd = Math.min(r + 1, rows - 1);
      const dx = (sm[r * cols + cr] - sm[r * cols + cl]) / ((cr - cl) * hf.dx);
      const dy = (sm[ru * cols + c] - sm[rd * cols + c]) / ((rd - ru) * hf.dy);
      gx[i] = dx;
      gy[i] = dy;
      // Curvature in metres of departure from the 4-neighbour mean (positive = concave).
      const L = (sm[r * cols + cl] + sm[r * cols + cr] + sm[ru * cols + c] + sm[rd * cols + c]) / 4 - sm[i];
      lap[i] = L;
      const h = data[i];
      const g = Math.hypot(dx, dy);
      const sd = Math.atan(g) / DEG;
      const south = g > 1e-4 ? dy / g : 0;
      const x = hf.xOf(c), y = hf.yOf(r);
      const patch = nz.fbm(x / 420, y / 420, 3);
      let rk = smoothstep(31, 44, sd) * 0.85 + smoothstep(-0.4, -1.6, L) * smoothstep(320, 470, h) * 0.85;
      rk = clamp(rk + 0.12 * patch, 0, 1);
      let v = 0.62 + 0.28 * patch - 0.34 * Math.max(0, south) * smoothstep(4, 20, sd) + 0.2 * Math.max(0, -south) + 0.3 * smoothstep(0.1, 0.7, L) - 0.55 * rk;
      v *= smoothstep(1, 10, h);
      if (h < 60 && sd < 7) v *= 0.45;
      veg[i] = clamp(v, 0, 1);
      rock[i] = h < 1 ? 0 : rk;
    }
  return { gx, gy, veg, rock, lap };
}

function buildTerrainGeometry(hf: Heightfield, an: ReturnType<typeof analyseTerrain>): THREE.BufferGeometry {
  const { cols, rows, data } = hf;
  const n = cols * rows;
  const pos = new Float32Array(n * 3), terr = new Float32Array(n * 4);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      pos.set([hf.xOf(c), data[i], -hf.yOf(r)], i * 3);
      terr.set([an.gx[i], an.gy[i], an.veg[i], an.rock[i]], i * 4);
    }
  const index = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let o = 0;
  for (let r = 0; r < rows - 1; r++)
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      // Split along the diagonal with the smaller height change (closer to the bilinear surface).
      if (Math.abs(data[a] - data[e]) < Math.abs(data[b] - data[d])) index.set([a, d, e, a, e, b], o);
      else index.set([a, d, b, b, d, e], o);
      o += 6;
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aTerr', new THREE.BufferAttribute(terr, 4));
  geo.setAttribute('aZone', new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  return geo;
}

function mergeTerrain(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  const na = a.getAttribute('position').count;
  for (const name of ['position', 'aTerr', 'aZone']) {
    const A = a.getAttribute(name) as THREE.BufferAttribute, B = b.getAttribute(name) as THREE.BufferAttribute;
    const arr = new Float32Array(A.array.length + B.array.length);
    arr.set(A.array as Float32Array);
    arr.set(B.array as Float32Array, A.array.length);
    out.setAttribute(name, new THREE.BufferAttribute(arr, A.itemSize));
  }
  const ia = a.getIndex()!.array, ib = b.getIndex()!.array;
  const idx = new Uint32Array(ia.length + ib.length);
  idx.set(ia);
  for (let i = 0; i < ib.length; i++) idx[ia.length + i] = ib[i] + na;
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  a.dispose();
  b.dispose();
  return out;
}

/**
 * Context terrain around the data frame: concentric rectangular rings, the first of
 * which reuses the frame's edge vertices exactly (no seam). Heights extrapolate the
 * edge profile, grow into procedural mountains inland, and fall to the sea on the
 * ocean side. About 6k triangles out to 20 km.
 */
function buildBackdropGeometry(hf: Heightfield, seed: number, an: ReturnType<typeof analyseTerrain>): THREE.BufferGeometry {
  const W = hf.width, H = hf.height, { cols, rows } = hf;
  const nz = new Simplex2(mulberry32(seed * 131 + 17));
  // Which side is the sea? (fraction of each edge under water)
  const wet = (pts: Vec2[]) => pts.filter((p) => hf.sample(p[0], p[1]) < 0.5).length / pts.length;
  const edge = (fx: (t: number) => Vec2) => Array.from({ length: 41 }, (_, i) => fx(i / 40));
  const seaS = wet(edge((t) => [lerp(-W / 2, W / 2, t), -H / 2])) > 0.2 || wet(edge((t) => [lerp(-W / 2, W / 2, t), -H / 2 + 600])) > 0.3;
  const heightAt = (x: number, y: number): number => {
    const d = Math.hypot(x - clamp(x, -W / 2, W / 2), y - clamp(y, -H / 2, H / 2));
    const w = smoothstep(0, 2600, d);
    // Coast wiggle: east/west of the frame the edge profile is sampled with a drifting offset.
    const outX = Math.max(0, Math.abs(x) - W / 2);
    const wig = 260 * nz.noise(x / 2600, 3.7) * smoothstep(0, 2000, outX);
    const cx = clamp(x, -W / 2, W / 2), cy = clamp(y + wig, -H / 2, H / 2);
    const e = hf.sample(cx, cy);
    if (seaS && y < -H / 2) return Math.max(-40, Math.min(e, e - (-H / 2 - y) * 0.45) - 2);
    if (e < 0.5) return Math.min(e, -1) - w * 25;
    const amp = smoothstep(15, 320, e);
    const m = 300 * nz.ridged(x / 2800 + 4, y / 2800 - 2, 4) + 120 * nz.fbm(x / 1100, y / 1100, 3) - 140;
    const inland = smoothstep(0, 9000, y - H / 2) * smoothstep(20, 200, e);
    return e + w * (amp * m + inland * 700);
  };

  // Ring 0 = frame perimeter (clockwise from NW), parameterised per side.
  const sideLen = [W, H, W, H];
  type RingPt = { x: number; y: number; h: number; t: number };
  const ring0: RingPt[] = [];
  const pushSide = (side: number, count: number, at: (f: number) => [number, number, number]) => {
    for (let i = 0; i < count; i++) {
      const f = i / count;
      const [x, y, h] = at(f);
      ring0.push({ x, y, h, t: (side + f) / 4 });
    }
  };
  const D = hf.data;
  pushSide(0, cols - 1, (f) => { const c = Math.round(f * (cols - 1)); return [hf.xOf(c), hf.yOf(0), D[c]]; });
  pushSide(1, rows - 1, (f) => { const r = Math.round(f * (rows - 1)); return [hf.xOf(cols - 1), hf.yOf(r), D[r * cols + cols - 1]]; });
  pushSide(2, cols - 1, (f) => { const c = cols - 1 - Math.round(f * (cols - 1)); return [hf.xOf(c), hf.yOf(rows - 1), D[(rows - 1) * cols + c]]; });
  pushSide(3, rows - 1, (f) => { const r = rows - 1 - Math.round(f * (rows - 1)); return [hf.xOf(0), hf.yOf(r), D[r * cols]]; });

  const offsets = [45, 110, 200, 330, 520, 800, 1200, 1800, 2700, 4000, 6000, 9000, 13500, 20000];
  const rings: RingPt[][] = [ring0];
  for (const r of offsets) {
    const hw = W / 2 + r, hh = H / 2 + r;
    const spacing = Math.max(30, r * 0.35);
    const pts: RingPt[] = [];
    for (let side = 0; side < 4; side++) {
      const len = side % 2 ? 2 * hh : 2 * hw;
      const count = Math.max(2, Math.ceil(len / spacing));
      for (let i = 0; i < count; i++) {
        const f = i / count;
        const [x, y] = side === 0 ? [lerp(-hw, hw, f), hh] : side === 1 ? [hw, lerp(hh, -hh, f)] : side === 2 ? [lerp(hw, -hw, f), -hh] : [-hw, lerp(-hh, hh, f)];
        pts.push({ x, y, h: heightAt(x, y), t: (side + f) / 4 });
      }
    }
    rings.push(pts);
  }
  void sideLen;

  const P: number[] = [], T: number[] = [], IDX: number[] = [];
  const base: number[] = [];
  const g = (x: number, y: number) => {
    const e = 30;
    return [(heightAt(x + e, y) - heightAt(x - e, y)) / (2 * e), (heightAt(x, y + e) - heightAt(x, y - e)) / (2 * e)];
  };
  rings.forEach((ring, k) => {
    base.push(P.length / 3);
    for (const p of ring) {
      P.push(p.x, p.h, -p.y);
      const [gx, gy] = k === 0 ? [0, 0] : g(p.x, p.y);
      const slope = Math.hypot(gx, gy);
      const veg = clamp(0.55 + 0.35 * nz.fbm(p.x / 900, p.y / 900, 2) - 0.6 * smoothstep(0.5, 0.9, slope), 0, 1) * smoothstep(1, 20, p.h);
      T.push(gx, gy, veg, clamp(smoothstep(0.6, 1.0, slope) + smoothstep(500, 900, p.h) * 0.4, 0, 1));
    }
  });
  // Ring 0 shares the frame's edge heights; give it the frame's real gradients/cover too.
  ring0.forEach((p, i) => {
    const c = clamp(Math.round(hf.colOf(p.x)), 0, cols - 1), r = clamp(Math.round(hf.rowOf(p.y)), 0, rows - 1);
    const j = r * cols + c;
    T.splice(i * 4, 4, an.gx[j], an.gy[j], an.veg[j], an.rock[j]);
  });
  // Zip consecutive rings together by perimeter parameter.
  const tri = (a: number, b: number, c: number) => {
    const ax = P[a * 3], az = P[a * 3 + 2], bx = P[b * 3], bz = P[b * 3 + 2], cx = P[c * 3], cz = P[c * 3 + 2];
    const ny = (cz - az) * (bx - ax) - (cx - ax) * (bz - az); // y of (c-a)x(b-a)
    if (ny >= 0) IDX.push(a, c, b);
    else IDX.push(a, b, c);
  };
  for (let k = 0; k < rings.length - 1; k++) {
    const A = rings[k], B = rings[k + 1];
    const ia = base[k], ib = base[k + 1];
    let i = 0, j = 0;
    const tA = (q: number) => (q >= A.length ? 1 + A[q - A.length].t : A[q].t);
    const tB = (q: number) => (q >= B.length ? 1 + B[q - B.length].t : B[q].t);
    while (i < A.length || j < B.length) {
      const a0 = ia + (i % A.length), a1 = ia + ((i + 1) % A.length), b0 = ib + (j % B.length), b1 = ib + ((j + 1) % B.length);
      if (j >= B.length || (i < A.length && tA(i + 1) <= tB(j + 1))) {
        tri(a0, a1, b0);
        i++;
      } else {
        tri(a0, b1, b0);
        j++;
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('aTerr', new THREE.Float32BufferAttribute(T, 4));
  geo.setAttribute('aZone', new THREE.Float32BufferAttribute(new Array(P.length / 3).fill(-1), 1));
  geo.setIndex(IDX);
  return geo;
}

/** Metres from each DEM vertex to the nearest land vertex (two-pass chamfer), for surf and shallows. */
function coastDistanceTexture(hf: Heightfield): THREE.DataTexture {
  const { cols, rows, data, dx, dy } = hf;
  const d = new Float32Array(cols * rows);
  for (let i = 0; i < d.length; i++) d[i] = data[i] > 0.5 ? 0 : 1e6;
  const dd = Math.hypot(dx, dy);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (c > 0) d[i] = Math.min(d[i], d[i - 1] + dx);
      if (r > 0) {
        d[i] = Math.min(d[i], d[i - cols] + dy);
        if (c > 0) d[i] = Math.min(d[i], d[i - cols - 1] + dd);
        if (c < cols - 1) d[i] = Math.min(d[i], d[i - cols + 1] + dd);
      }
    }
  for (let r = rows - 1; r >= 0; r--)
    for (let c = cols - 1; c >= 0; c--) {
      const i = r * cols + c;
      if (c < cols - 1) d[i] = Math.min(d[i], d[i + 1] + dx);
      if (r < rows - 1) {
        d[i] = Math.min(d[i], d[i + cols] + dy);
        if (c < cols - 1) d[i] = Math.min(d[i], d[i + cols + 1] + dd);
        if (c > 0) d[i] = Math.min(d[i], d[i + cols - 1] + dd);
      }
    }
  for (let i = 0; i < d.length; i++) d[i] = Math.min(d[i], 5000);
  const tex = new THREE.DataTexture(d, cols, rows, THREE.RedFormat, THREE.FloatType);
  tex.needsUpdate = true;
  return tex;
}

/** Low-poly tree, unit height: 3-sided trunk (6 tris) + pentagonal cone canopy with base (8 tris) = 14. */
function treeGeometry(): THREE.BufferGeometry {
  const v: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => v.push(...a, ...b, ...c);
  const ring = (n: number, r: number, y: number, rot = 0) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2 + rot) * r, y, Math.sin((i / n) * Math.PI * 2 + rot) * r]);
  const t0 = ring(3, 0.05, 0), t1 = ring(3, 0.05, 0.32);
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3;
    tri(t0[i], t1[i], t0[j]);
    tri(t0[j], t1[i], t1[j]);
  }
  const cb = ring(5, 0.32, 0.22, 0.3), apex = [0, 1, 0];
  for (let i = 0; i < 5; i++) tri(cb[i], apex, cb[(i + 1) % 5]);
  tri(cb[0], cb[1], cb[2]);
  tri(cb[0], cb[2], cb[3]);
  tri(cb[0], cb[3], cb[4]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/** Flattened hexagonal bipyramid shrub, unit radius and height: 12 tris. */
function shrubGeometry(): THREE.BufferGeometry {
  const v: number[] = [];
  const eq = Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * Math.PI * 2) * 0.5, 0.38, Math.sin((i / 6) * Math.PI * 2) * 0.5]);
  for (let i = 0; i < 6; i++) {
    const a = eq[i], b = eq[(i + 1) % 6];
    v.push(...a, 0, 1, 0, ...b);
    v.push(...a, ...b, 0, 0, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Instance placement: ESA WorldCover classes when the world carries them (10 tree
 * cover -> trees, 20 shrubland -> shrubs), otherwise the slope/aspect/curvature cover
 * model. Keeps clear of roads, buildings, water and cliffs. Each instance packs
 * [x, y, rotation, crown scale, height].
 */
function placeVegetation(world: WorldData, hf: Heightfield, an: ReturnType<typeof analyseTerrain>, buildings: Vec2[], nTrees: number, nShrubs: number, seed: number) {
  const rand = mulberry32(seed * 7919 + 1);
  const W = hf.width, H = hf.height;
  const roadIdx = new PointGrid(30);
  for (const r of world.roads) {
    const hw = r.kind === 'turnaround' ? r.width / 2 : r.width / 2;
    for (const p of r.points.length > 1 ? resampleUniform(r.points, 6) : r.points) roadIdx.add(p[0], p[1], hw);
  }
  const bIdx = new PointGrid(40);
  for (const b of buildings) bIdx.add(b[0], b[1], 14);
  const veg = world.vegetation;
  const classAt = veg
    ? (x: number, y: number) => {
        const c = clamp(Math.floor(((x + W / 2) / W) * veg.cols), 0, veg.cols - 1);
        const r = clamp(Math.floor(((H / 2 - y) / H) * veg.rows), 0, veg.rows - 1);
        return veg.classes[r * veg.cols + c];
      }
    : null;
  const cell = (x: number, y: number) => clamp(Math.round(hf.rowOf(y)), 0, hf.rows - 1) * hf.cols + clamp(Math.round(hf.colOf(x)), 0, hf.cols - 1);
  const clear = (x: number, y: number, pad: number) =>
    !roadIdx.query(x, y, 30, (px, py, pr) => Math.hypot(px - x, py - y) < pr + pad) && !bIdx.query(x, y, 40, (px, py, pr) => Math.hypot(px - x, py - y) < pr + pad);
  const fill = (n: number, accept: (x: number, y: number, i: number) => number, size: () => [number, number], pad: number) => {
    const out = new Float32Array(n * 5);
    let k = 0;
    for (let tries = 0; tries < n * 40 && k < n; tries++) {
      const x = (rand() - 0.5) * W, y = (rand() - 0.5) * H;
      const i = cell(x, y);
      if (hf.data[i] < 1.5 || rand() > accept(x, y, i) || !clear(x, y, pad)) continue;
      const [s, h] = size();
      out.set([x, y, rand() * Math.PI * 2, s, h], k * 5);
      k++;
    }
    return out.subarray(0, k * 5);
  };
  const slopeOf = (i: number) => Math.hypot(an.gx[i], an.gy[i]);
  const treeP = classAt
    ? (x: number, y: number, i: number) => (classAt(x, y) === 10 ? 0.95 : 0) * (slopeOf(i) < 1.1 ? 1 : 0)
    : (_x: number, _y: number, i: number) => {
        const g = slopeOf(i);
        const north = g > 1e-4 ? clamp(-an.gy[i] / g, 0, 1) : 0;
        return Math.pow(an.veg[i], 1.6) * (0.25 + 0.5 * smoothstep(0.05, 0.6, an.lap[i]) + 0.35 * north) * (1 - an.rock[i]) * (g < 1.0 ? 1 : 0);
      };
  const shrubP = classAt
    ? (x: number, y: number, i: number) => (classAt(x, y) === 20 ? 0.9 : classAt(x, y) === 30 ? 0.08 : 0) * (slopeOf(i) < 1.2 ? 1 : 0)
    : (_x: number, _y: number, i: number) => an.veg[i] * (1 - an.rock[i]) * (slopeOf(i) < 1.2 ? 0.9 : 0);
  const trees = fill(nTrees, treeP, () => {
    const h = 6 + rand() * 8;
    return [h * (0.7 + rand() * 0.45), h];
  }, 3);
  const shrubs = fill(nShrubs, shrubP, () => [2.4 + rand() * 3.2, 1.1 + rand() * 1.4], 1.5);
  return { trees, shrubs };
}

const ROAD_KIND: Record<string, number> = { highway: 0, motorway: 0, primary: 0, arterial: 1, secondary: 1, collector: 2, tertiary: 2, residential: 3, turnaround: 3, service: 3, fireroad: 4, track: 4 };

function buildRoadGeometry(roads: RoadFeature[]): THREE.BufferGeometry | null {
  const P: number[] = [], OFF: number[] = [], RD: number[] = [], IDX: number[] = [];
  const pushVert = (x: number, y: number, ox: number, oy: number, hw: number, across: number, along: number, kind: number) => {
    P.push(x, 0, -y);
    OFF.push(ox, oy);
    RD.push(hw, across, along, kind);
    return P.length / 3 - 1;
  };
  for (const road of roads) {
    const kind = ROAD_KIND[road.kind] ?? 3;
    const hw = Math.max(1.5, road.width / 2);
    if (road.kind === 'turnaround' || road.points.length === 1) {
      const c = road.points[0];
      const R = hw / 2;
      const seg = 20;
      const base = P.length / 3;
      for (let k = 0; k <= seg; k++) {
        const a = (k / seg) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        pushVert(c[0] + ca * R, c[1] + sa * R, ca, sa, R, 1, a * R, kind);
        pushVert(c[0] + ca * R, c[1] + sa * R, -ca, -sa, R, 0, a * R, kind);
      }
      for (let k = 0; k < seg; k++) {
        const i = base + k * 2;
        IDX.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
      }
      continue;
    }
    const pts = resampleMax(road.points, 8).pts.filter((p, i, arr) => i === 0 || dist2(p, arr[i - 1]) > 0.05);
    if (pts.length < 2) continue;
    const base = P.length / 3;
    let along = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i > 0) along += dist2(pts[i - 1], pts[i]);
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      let nx = -ty, ny = tx;
      let miter = 1;
      if (i > 0 && i < pts.length - 1) {
        const p0 = pts[i - 1], p1 = pts[i];
        const sx = p1[0] - p0[0], sy = p1[1] - p0[1], sl = Math.hypot(sx, sy) || 1;
        const pn: Vec2 = [-sy / sl, sx / sl];
        miter = 1 / Math.max(0.5, nx * pn[0] + ny * pn[1]);
      }
      nx *= miter;
      ny *= miter;
      pushVert(pts[i][0], pts[i][1], nx, ny, hw, 1, along, kind);
      pushVert(pts[i][0], pts[i][1], -nx, -ny, hw, -1, along, kind);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const v = base + i * 2;
      IDX.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }
  if (!IDX.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('aOff', new THREE.Float32BufferAttribute(OFF, 2));
  geo.setAttribute('aRoad', new THREE.Float32BufferAttribute(RD, 4));
  geo.setIndex(IDX);
  return geo;
}

function footprintOBB(fp: Vec2[]) {
  let best = 0, angle = 0;
  for (let i = 0; i < fp.length; i++) {
    const a = fp[i], b = fp[(i + 1) % fp.length];
    const d = dist2(a, b);
    if (d > best) {
      best = d;
      angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    }
  }
  const ca = Math.cos(angle), sa = Math.sin(angle);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [x, y] of fp) {
    const u = x * ca + y * sa, v = -x * sa + y * ca;
    u0 = Math.min(u0, u);
    u1 = Math.max(u1, u);
    v0 = Math.min(v0, v);
    v1 = Math.max(v1, v);
  }
  const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
  return { cx: um * ca - vm * sa, cy: um * sa + vm * ca, len: Math.max(2, u1 - u0), wid: Math.max(2, v1 - v0), angle: -angle };
}

const patternCache = new Map<string, CanvasPattern>();
function hatchPattern(ctx: CanvasRenderingContext2D, color: string): CanvasPattern {
  let p = patternCache.get(color);
  if (p) return p;
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const g = c.getContext('2d')!;
  g.strokeStyle = color;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-2, 10);
  g.lineTo(10, -2);
  g.moveTo(-2, 2);
  g.lineTo(2, -2);
  g.moveTo(6, 10);
  g.lineTo(10, 6);
  g.stroke();
  p = ctx.createPattern(c, 'repeat')!;
  patternCache.set(color, p);
  return p;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}

// ============================================================================
// Factory
// ============================================================================

export function createTerrainEngine(container: HTMLElement, options: EngineOptions = {}): Engine {
  return new TacticalTerrainEngine(container, options);
}

// Geometry helpers shared with scenario tooling (scenarioFixtures.ts, tools/*.mjs).
export { mulberry32, Simplex2, dist2, chaikin, smoothstep, clamp, distToPolyline, convexHull, bufferHull, centroid, fmtInt, pointInPolygon, resampleUniform, polyLength };
