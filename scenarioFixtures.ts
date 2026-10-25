/**
 * scenarioFixtures.ts: incident content for tests and demos (tier 2 helpers)
 * --------------------------------------------------------------------------
 * The engine is incident-agnostic; everything that knows what a fire, an
 * evacuation zone or an engine company is lives here or in scenario data.
 *
 *  - simulateFireRun(): deterministic egg-shaped fire run (perimeter, hotspots, SPI)
 *  - fireArrivalField(): self-similar growth of a FireRun as a time-of-arrival grid
 *  - buildDemoScenario(): the procedural "Kestrel Fire" snapshot (single state)
 */
import {
  Heightfield,
  RoadNetwork,
  PALETTE,
  mulberry32,
  Simplex2,
  dist2,
  chaikin,
  smoothstep,
  clamp,
  distToPolyline,
  convexHull,
  bufferHull,
  centroid,
  fmtInt,
} from './terrainEngine.js';
import type { Vec2, WorldData, OverlaySpec, PointsOverlaySpec, LabelsOverlaySpec, UnitSpec } from './terrainEngine.js';

const DEG = Math.PI / 180;
const FT = 0.3048;

// ============================================================================
// Procedural demo: night fire run toward the canyon mouth (03:00 PDT)
// ============================================================================

export interface DemoScenario {
  layers: [string, OverlaySpec][];
  units: UnitSpec[];
}

export interface FireRun {
  /** Closed perimeter ring. */
  ring: Vec2[];
  /** Per ring vertex 0..1: heel 0.12 → head 1. */
  intensity: number[];
  /** Perimeter from flank to flank across the head (proj > 0.62), in ring order. */
  frontSorted: Vec2[];
  /** The leading arc (proj > 0.82). */
  headArc: Vec2[];
  tip: Vec2;
  /** Locked sensor point of interest just inside the tip (HS-01). */
  spi: Vec2;
  hotspots: PointsOverlaySpec['points'];
  C: Vec2;
  ux: number;
  uy: number;
  vx: number;
  vy: number;
  proj(p: Vec2): number;
  inward(p: Vec2, d: number): Vec2;
}

/**
 * Wind-driven fire run as an egg-shaped perimeter from ignition (heel) to head, with
 * noisy flanks, hotspots behind the head, spot fires ahead of it and a locked SPI.
 * Deterministic for a given seed.
 */
export function simulateFireRun(I: Vec2, Hd: Vec2, seed: number, opts: { width?: number; hotspots?: number } = {}): FireRun {
  const rand = mulberry32(seed);
  const nz = new Simplex2(rand);
  const rr = (a: number, b: number) => a + (b - a) * rand();
  const L = dist2(I, Hd);
  const ux = (Hd[0] - I[0]) / L, uy = (Hd[1] - I[1]) / L;
  const vx = -uy, vy = ux;
  const a = L / 2, b = (opts.width ?? 0.25) * L;
  const C: Vec2 = [I[0] + ux * a * 0.85, I[1] + uy * a * 0.85];
  let ring: Vec2[] = [];
  for (let k = 0; k < 160; k++) {
    const phi = (k / 160) * Math.PI * 2;
    const cp = Math.cos(phi), sp = Math.sin(phi);
    let r = (a * b) / Math.sqrt((b * cp) ** 2 + (a * sp) ** 2);
    r *= 1 + 0.15 * cp;
    r *= 1 + 0.11 * nz.fbm(cp * 1.6 + 4, sp * 1.6 - 2, 3) + 0.06 * nz.fbm(cp * 6 + 9, sp * 6, 2) * smoothstep(-0.2, 0.8, cp);
    ring.push([C[0] + (ux * cp + vx * sp) * r, C[1] + (uy * cp + vy * sp) * r]);
  }
  ring = chaikin(ring, 1, true);
  const proj = (p: Vec2) => ((p[0] - I[0]) * ux + (p[1] - I[1]) * uy) / L;
  const intensity = ring.map((p) => clamp(0.12 + 0.88 * smoothstep(0.5, 0.95, proj(p)), 0, 1));
  let heel = 0;
  ring.forEach((p, i) => {
    if (proj(p) < proj(ring[heel])) heel = i;
  });
  const frontSorted = [...ring.slice(heel), ...ring.slice(0, heel)].filter((p) => proj(p) > 0.62);
  const hotspots: PointsOverlaySpec['points'] = [];
  let tip = ring[0];
  for (const p of ring) if (proj(p) > proj(tip)) tip = p;
  const inward = (p: Vec2, d: number): Vec2 => {
    const dx = C[0] - p[0], dy = C[1] - p[1], l = Math.hypot(dx, dy);
    return [p[0] + (dx / l) * d, p[1] + (dy / l) * d];
  };
  const spi = inward(tip, 34);
  hotspots.push({ id: 'HS-01', position: spi, intensity: 1, tempC: 980 });
  const hot = ring.filter((p) => proj(p) > 0.72);
  for (let i = 0; i < (opts.hotspots ?? 30); i++) {
    const p = hot[Math.floor(rand() * hot.length)];
    const q = inward(p, rr(14, 110));
    const it = clamp(0.35 + 0.65 * rand() * proj(p), 0.25, 0.95);
    hotspots.push({ id: `HS-${String(i + 2).padStart(2, '0')}`, position: q, intensity: it, tempC: Math.round(420 + 520 * it) });
  }
  for (let i = 0; i < 4; i++) {
    const d = rr(90, 260), sd = rr(-170, 170);
    hotspots.push({ id: `SPOT-${i + 1}`, position: [tip[0] + ux * d + vx * sd, tip[1] + uy * d + vy * sd], intensity: rr(0.4, 0.7), tempC: Math.round(rr(380, 610)) });
  }
  return { ring, intensity, frontSorted, headArc: frontSorted.filter((p) => proj(p) > 0.82), tip, spi, hotspots, C, ux, uy, vx, vy, proj, inward };
}

export function buildDemoScenario(world: WorldData): DemoScenario | null {
  const meta = world.meta;
  if (!meta) return null;
  const A = meta.anchors;
  const hf = new Heightfield(world.dem, world.frame.widthMeters, world.frame.heightMeters);
  const fire = simulateFireRun(A.ignition, A.fireHead, meta.seed * 31 + 7);
  const { ring, intensity, frontSorted, headArc, tip, spi, hotspots, proj, C, vx, vy } = fire;
  const I = A.ignition;
  const inward = fire.inward;
  void spi;

  // ---- evacuation routing over the road graph
  const graph = new RoadNetwork(world.roads);
  const exitNode = graph.nearest(A.westExit, (r) => r === 'hwy-1');
  const startNode = graph.nearest(A.kestrelBench, (r) => r === 'kestrel-cyn-rd');
  const frontDist = (x: number, y: number) => distToPolyline(x, y, frontSorted);
  // Routing danger comes from the head of the run (headArc), not the slower flanks.
  const routeA = graph.route(startNode, exitNode, (x, y, w) => w * (1 + 80 * smoothstep(720, 260, distToPolyline(x, y, headArc))));
  const routeB = graph.route(startNode, exitNode);
  const dB = routeB.map((p) => frontDist(p[0], p[1]));
  let iMin = 0;
  dB.forEach((d, i) => {
    if (d < dB[iMin]) iMin = i;
  });
  let i0 = iMin, i1 = iMin;
  const lim = Math.max(dB[iMin] + 160, 650);
  while (i0 > 0 && dB[i0 - 1] < lim && iMin - i0 < 18) i0--;
  while (i1 < routeB.length - 1 && dB[i1 + 1] < lim && i1 - iMin < 18) i1++;
  const choke = routeB.slice(i0, i1 + 1);
  const chokeAt = routeB[iMin];

  // ---- evacuation zones from structure clusters
  const zoneAround = (c: Vec2, R: number) => {
    const pts = world.buildings.map((bd) => centroid(bd.footprint)).filter((p) => dist2(p, c) < R);
    return pts.length >= 3 ? chaikin(bufferHull(convexHull(pts), 70), 2, true) : null;
  };
  const orderZone = zoneAround(A.pointVista, 700);
  const warnZone = zoneAround(A.kestrelBench, 700);

  const layers: [string, OverlaySpec][] = [];
  if (warnZone)
    layers.push(['evac-warning', { type: 'polygon', rings: [warnZone], mode: 'tint', fill: PALETTE.amber, fillOpacity: 0.07, outline: { color: PALETTE.amber, width: 2, dash: [10, 6], opacity: 0.55 }, structures: 'threatened' }]);
  if (orderZone)
    layers.push(['evac-order', { type: 'polygon', rings: [orderZone], mode: 'hatch', fill: PALETTE.red, fillOpacity: 0.3, outline: { color: PALETTE.red, width: 2.2, opacity: 0.8 }, structures: 'threatened' }]);
  layers.push([
    'burn-scar',
    {
      type: 'polygon',
      rings: [ring],
      mode: 'burnScar',
      structures: 'destroyed',
      progression: { from: I, to: tip, start: '2026-08-14T22:41:00-07:00', end: '2026-08-15T03:00:00-07:00' },
    },
  ]);
  layers.push([
    'fire-perimeter',
    { type: 'line', points: ring, closed: true, color: PALETTE.fire, colorLow: '#7A1E08', intensity, width: 3.2, glow: 9, glowOpacity: 0.55, heat: 1, thermal: 0.9, sensorVisible: true },
  ]);
  layers.push(['hotspots', { type: 'points', points: hotspots, size: 16, sensorVisible: true }]);
  layers.push(['route-b', { type: 'line', points: routeB, color: PALETTE.amber, width: 3, glow: 3, glowOpacity: 0.35, style: 'dashed', dash: [12, 8] }]);
  layers.push(['route-a', { type: 'line', points: routeA, color: PALETTE.cyan, width: 5, glow: 7, glowOpacity: 0.5, style: 'chevron', chevronSpacing: 30, speed: 26 }]);
  layers.push(['choke-1', { type: 'line', points: choke, color: PALETTE.red, width: 6, glow: 6, glowOpacity: 0.5 }]);
  layers.push(['choke-1-marker', { type: 'marker', position: chokeAt, icon: 'hazard', title: 'CHOKE · KESTREL CYN RD', detail: `Compromised · front ${fmtInt(dB[iMin])} m` }]);
  layers.push(['ignition', { type: 'marker', position: I, icon: 'ignition', title: 'IGNITION', detail: 'Aug 14 · 22:41' }]);
  layers.push(['staging', { type: 'marker', position: A.staging, icon: 'staging', title: 'STAGING', detail: 'Coast Hwy · ICP' }]);

  const labelItems: LabelsOverlaySpec['items'] = meta.peaks.map((p) => ({ position: p.position, text: p.name, sub: `${fmtInt(p.elevation)} m`, kind: 'peak' as const }));
  labelItems.push(
    { position: A.kestrelMid, text: 'Kestrel Canyon', kind: 'area' },
    { position: A.westCanyon, text: 'Arroyo Seco', kind: 'area' },
    { position: A.eastCanyon, text: 'Solstice Canyon', kind: 'area' },
    { position: [A.kestrelBench[0] - 260, A.kestrelBench[1] + 40], text: 'KESTREL BENCH', kind: 'place' },
    { position: [A.pointVista[0], A.pointVista[1] + 150], text: 'POINT VISTA', kind: 'place' },
    { position: [A.saddleRanch[0], A.saddleRanch[1] - 120], text: 'SADDLE RANCH', kind: 'place' },
    { position: A.ocean, text: 'Pacific Ocean', kind: 'water' },
  );
  layers.push(['labels', { type: 'labels', items: labelItems }]);

  // ---- units
  const road = (r: string, near: Vec2) => graph.point(graph.nearest(near, (id) => id === r));
  const anyRoad = (near: Vec2) => graph.point(graph.nearest(near));
  const flank = (t: number, side: number, out: number): Vec2 => {
    let best = ring[0], bd = Infinity;
    for (const p of ring) {
      const s = (p[0] - C[0]) * vx + (p[1] - C[1]) * vy;
      if (Math.sign(s) !== side) continue;
      const d = Math.abs(proj(p) - t);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return inward(best, -out);
  };
  const units: UnitSpec[] = [
    { id: 'E-31', kind: 'engine', type: 'Type 3', status: 'active', detail: 'Structure protection · Point Vista', position: anyRoad([A.pointVista[0] + 60, A.pointVista[1] - 80]) },
    { id: 'E-32', kind: 'engine', type: 'Type 3', status: 'active', detail: 'Structure protection · Kestrel Bench', position: anyRoad([A.kestrelBench[0] + 120, A.kestrelBench[1] - 60]) },
    { id: 'E-45', kind: 'engine', type: 'Type 6', status: 'active', detail: 'Patrol · Ridgecrest Dr', position: road('ridgecrest-dr', [A.saddleRanch[0] + 500, A.saddleRanch[1] + 200]) },
    { id: 'C-7', kind: 'crew', type: 'Hotshots', status: 'active', detail: 'Holding & mop-up · west flank', position: flank(0.55, 1, 45) },
    { id: 'C-14', kind: 'crew', type: 'Hand crew', status: 'active', detail: 'Holding · heel', position: flank(0.2, -1, 50) },
    { id: 'WT-12', kind: 'tender', type: 'Water tender', status: 'enroute', detail: 'En route to E-31', position: road('hwy-1', [A.pointVista[0] - 700, 0]) },
    { id: 'DZ-3', kind: 'dozer', type: 'Dozer', status: 'active', detail: 'Contingency line · Skyline Fire Rd', position: road('skyline-fire-rd', [I[0] - 300, I[1] + 300]) },
  ];

  // FT-06 hovers WNW of the locked hotspot so that its gimbal reads HDG 112°, PITCH -27°.
  const agl6 = 740 * FT;
  const hdg = 112 * DEG, tanP = Math.tan(27 * DEG);
  const hs = hf.sample(spi[0], spi[1]);
  let D = 450;
  let P6: Vec2 = spi;
  for (let it = 0; it < 12; it++) {
    P6 = [spi[0] - Math.sin(hdg) * D, spi[1] - Math.cos(hdg) * D];
    D = Math.max(80, (hf.sample(P6[0], P6[1]) + agl6 - hs) / tanP);
  }
  const fireMid: Vec2 = [C[0], C[1]];
  units.push(
    { id: 'FT-01', kind: 'drone', name: 'Kite', altitudeFt: 1930, status: 'active', detail: 'Perimeter mapping', position: fireMid, orbitRadius: 420, orbitPeriodS: 150, orbitPhase: 0.3, gimbal: { target: fireMid } },
    { id: 'FT-02', kind: 'drone', name: 'Merlin', altitudeFt: 930, status: 'active', detail: 'Heel / north flank', position: flank(0.25, 1, 120), orbitRadius: 160, orbitPeriodS: 95, orbitPhase: 1.2, gimbal: { target: flank(0.25, 1, -40) } },
    { id: 'FT-03', kind: 'drone', name: 'Swift', altitudeFt: 400, status: 'active', detail: 'Origin investigation', position: [I[0] + 60, I[1] + 40], orbitRadius: 70, orbitPeriodS: 60, orbitPhase: 2.2, gimbal: { target: I } },
    { id: 'FT-04', kind: 'drone', name: 'Heron', altitudeFt: 900, status: 'active', detail: 'East flank', position: flank(0.6, -1, 160), orbitRadius: 150, orbitPeriodS: 90, orbitPhase: 0.7, gimbal: { target: flank(0.6, -1, -40) } },
    { id: 'FT-05', kind: 'drone', name: 'Osprey', altitudeFt: 1730, status: 'active', detail: 'Evac overwatch · Kestrel Bench', position: A.kestrelBench, orbitRadius: 260, orbitPeriodS: 130, orbitPhase: 4.0, gimbal: { target: A.kestrelBench } },
    { id: 'FT-06', kind: 'drone', name: 'Wren', altitudeFt: 740, status: 'active', detail: 'Gimbal lock · HS-01 flame front', position: P6, orbitRadius: 40, orbitPeriodS: 70, orbitPhase: 0, gimbal: { target: spi, tempC: 980, targetId: 'HS-01' } },
  );

  return { layers, units };
}

/**
 * Arrival time (minutes) of a self-similar run: the perimeter at growth fraction f is the
 * final ring scaled by f about the ignition point, and f grows linearly in time from
 * `tIgnition`, reaching 1 (the given ring) at `tRing`. Values are capped (no infinities),
 * so the field is continuous everywhere and contours stay clean.
 */
export function fireArrivalField(run: FireRun, ignition: Vec2, frame: { widthMeters: number; heightMeters: number }, opts: { cols: number; rows: number; tIgnition: number; tRing: number; cap?: number }) {
  const { cols, rows } = opts;
  const W = frame.widthMeters, H = frame.heightMeters;
  const N = 1440;
  const R = new Float32Array(N);
  const ring = run.ring;
  for (let k = 0; k < N; k++) {
    const th = (k / N) * Math.PI * 2;
    const dx = Math.cos(th), dy = Math.sin(th);
    let best = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const ax = a[0] - ignition[0], ay = a[1] - ignition[1];
      const t = (ax * ey - ay * ex) / den, u = (ax * dy - ay * dx) / den;
      if (u >= 0 && u <= 1 && t > best) best = t;
    }
    R[k] = best;
  }
  // Light angular smoothing, then a floor so the heel side grows slowly instead of never.
  const Rs = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    let s = 0;
    for (let j = -6; j <= 6; j++) s += R[(k + j + N) % N];
    Rs[k] = Math.max(70, s / 13);
  }
  const rate = (opts.tRing - opts.tIgnition);
  const cap = opts.cap ?? 900;
  const data = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5) / cols) * W - W / 2, y = H / 2 - ((r + 0.5) / rows) * H;
      const dx = x - ignition[0], dy = y - ignition[1];
      let th = Math.atan2(dy, dx);
      if (th < 0) th += Math.PI * 2;
      const f = Math.hypot(dx, dy) / Rs[Math.floor((th / (Math.PI * 2)) * N) % N];
      data[r * cols + c] = Math.min(cap, opts.tIgnition + f * rate);
    }
  return { cols, rows, data, fAt: (t: number) => (t - opts.tIgnition) / rate };
}
