// Fictional training scenario on the real Encinal Canyon data in ./data/:
// a fire run across the northern ridge from Trancas Canyon, evacuation zones derived
// from real building clusters, the evacuation route on the real Encinal Canyon Rd ->
// Pacific Coast Hwy, a choke marker at the sharpest in-frame hairpin, and units
// snapped to real roads. Run after fetch-real-data.mjs. Writes:
//   data/scenario.json                 single-state snapshot (legacy, end of the run)
//   data/scenarios/standby.json        situation C: no incident, place and assets
//   data/scenarios/small-incident.json situation B: one detection, minimal resources
//   data/scenarios/wui-breakout.json   situation A: the full arc, phases A -> G
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Heightfield, GeoProjection, RoadNetwork, PALETTE, resampleUniform } from '../terrainEngine.js';
import { simulateFireRun, fireArrivalField } from '../scenarioFixtures.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = join(root, 'data');
const frame = JSON.parse(readFileSync(join(data, 'frame.json'), 'utf8'));
const buf = readFileSync(join(data, 'dem.bin'));
const i16 = new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2);
const dem = { cols: frame.cols, rows: frame.rows, data: Float32Array.from(i16) };
const roads = JSON.parse(readFileSync(join(data, 'roads.json'), 'utf8'));
const buildings = JSON.parse(readFileSync(join(data, 'buildings.json'), 'utf8'));
const placesFile = join(root, '.cache', 'places-encinal.json');
const places = existsSync(placesFile) ? JSON.parse(readFileSync(placesFile, 'utf8')) : [];
const hf = new Heightfield(dem, frame.widthMeters, frame.heightMeters);
const geo = new GeoProjection(frame);
const W = frame.widthMeters, H = frame.heightMeters;

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const segD = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
const lineD = (p, line) => { let d = Infinity; for (let i = 0; i < line.length - 1; i++) d = Math.min(d, segD(p, line[i], line[i + 1])); return d; };
const ringD = (p, ring) => lineD(p, [...ring, ring[0]]);
const length = (l) => l.slice(1).reduce((s, q, i) => s + dist(q, l[i]), 0);
const r2 = (p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];

// ---------------------------------------------------------------- evacuation network
const isEncinal = (r) => r.name === 'Encinal Canyon Road';
const isPCH = (r) => r.name === 'Pacific Coast Highway';
const evacNet = new RoadNetwork(roads.filter((r) => isEncinal(r) || isPCH(r)));
const pchNet = new RoadNetwork(roads.filter(isPCH));
// The longest in-frame piece of Encinal is the one connected to PCH (others leave the frame).
const encinalMain = roads.filter(isEncinal).reduce((a, b) => (b.points.length > a.points.length ? b : a));
const top = encinalMain.points.reduce((a, b) => (b[1] > a[1] ? b : a));
const pchPts = roads.filter(isPCH).flatMap((r) => r.points);
const westExit = pchPts.reduce((a, b) => (b[0] < a[0] ? b : a));
const eastExit = pchPts.reduce((a, b) => (b[0] > a[0] ? b : a));
const routeA = evacNet.route(evacNet.nearest(top, (r) => r.startsWith('osm')), evacNet.nearest(westExit));
// Junction = first route node that is on PCH.
const onPCH = (p) => roads.filter(isPCH).some((r) => lineD(p, r.points) < 12);
const jIdx = routeA.findIndex(onPCH);
const junction = routeA[Math.max(0, jIdx)];
const encinalLeg = routeA.slice(0, Math.max(2, jIdx + 1));
const routeB = pchNet.route(pchNet.nearest(junction), pchNet.nearest(eastExit));

// Sharpest hairpin along the in-frame Encinal leg (heading change over a 150 m window).
const s = [0];
for (let i = 1; i < encinalLeg.length; i++) s.push(s[i - 1] + dist(encinalLeg[i], encinalLeg[i - 1]));
const hdg = (i) => Math.atan2(encinalLeg[i + 1][1] - encinalLeg[i][1], encinalLeg[i + 1][0] - encinalLeg[i][0]);
let best = { turn: 0, at: 0 };
for (let i = 0; i < encinalLeg.length - 2; i++) {
  let j = i, turn = 0;
  while (j < encinalLeg.length - 2 && s[j] - s[i] < 150) {
    turn += ((hdg(j + 1) - hdg(j) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    j++;
  }
  if (Math.abs(turn) > best.turn) best = { turn: Math.abs(turn), at: Math.round((i + j) / 2) };
}
const hairpin = encinalLeg[best.at];
const choke = encinalLeg.filter((_, i) => Math.abs(s[i] - s[best.at]) < 150);

// ---------------------------------------------------------------- fire on the northern ridge
// Head sits on the east slope above upper Encinal Canyon Rd; ignition in upper Trancas Canyon.
const upper = encinalLeg.filter((p) => p[1] > 450 && p[1] < 950);
const roadAtHead = upper.reduce((a, b) => (b[0] > a[0] ? b : a), upper[0] ?? top);
const head = [roadAtHead[0] + 420, roadAtHead[1] + 80];
const ignition = [2150, 1300];
const fire = simulateFireRun(ignition, head, 4242, { width: 0.27 });

// ---------------------------------------------------------------- evacuation zones from real building clusters
const centroids = buildings.map((b) => {
  const n = b.footprint.length;
  return [b.footprint.reduce((t, p) => t + p[0], 0) / n, b.footprint.reduce((t, p) => t + p[1], 0) / n];
});
const dFire = centroids.map((c) => ringD(c, fire.ring));
const pchLine = roads.filter(isPCH).flatMap((r) => r.points);
function clusters(idx, link = 130, min = 4) {
  const parent = idx.map((_, k) => k);
  const find = (k) => (parent[k] === k ? k : (parent[k] = find(parent[k])));
  for (let a = 0; a < idx.length; a++)
    for (let b = a + 1; b < idx.length; b++) if (dist(centroids[idx[a]], centroids[idx[b]]) < link) parent[find(a)] = find(b);
  const groups = new Map();
  idx.forEach((k, a) => { const r = find(a); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(centroids[k]); });
  return [...groups.values()].filter((g) => g.length >= min);
}
function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function buffer(h, d) {
  const out = [];
  for (let i = 0; i < h.length; i++) {
    const prev = h[(i - 1 + h.length) % h.length], cur = h[i], next = h[(i + 1) % h.length];
    let a0 = Math.atan2(cur[1] - prev[1], cur[0] - prev[0]) - Math.PI / 2, a1 = Math.atan2(next[1] - cur[1], next[0] - cur[0]) - Math.PI / 2;
    while (a1 < a0) a1 += 2 * Math.PI;
    for (let k = 0; k <= 4; k++) { const a = a0 + ((a1 - a0) * k) / 4; out.push(r2([cur[0] + Math.cos(a) * d, cur[1] + Math.sin(a) * d])); }
  }
  return out;
}
const zone = (pred) => clusters(centroids.map((_, k) => k).filter(pred)).map((g) => buffer(hull(g), 60));
const zone1 = zone((k) => dFire[k] < 900);
const zone2 = zone((k) => dFire[k] >= 900 && dFire[k] < 1800 && centroids[k][0] > junction[0] - 300);
const zone3 = zone((k) => dFire[k] >= 2200 && centroids[k][0] < junction[0] && lineD(centroids[k], pchLine) < 450);
const biggest = (rings) => rings.reduce((a, b) => (b.length > a.length ? b : a), rings[0]);
const ringCentroid = (r) => [r.reduce((t, p) => t + p[0], 0) / r.length, r.reduce((t, p) => t + p[1], 0) / r.length];

// ---------------------------------------------------------------- units on real roads
const anyNet = new RoadNetwork(roads);
const nearestOn = (pred, p) => { const n = new RoadNetwork(roads.filter(pred)); return n.point(n.nearest(p)); };
const trancas = roads.filter((r) => r.name === 'Trancas Canyon Road').flatMap((r) => r.points);
const trancasTop = trancas.length ? trancas.reduce((a, b) => (b[1] > a[1] ? b : a)) : [2400, -100];
const e31 = encinalLeg.reduce((a, b) => (ringD(b, fire.ring) < ringD(a, fire.ring) ? b : a));
// FT-01 stands off WSW of the locked hotspot so its gimbal looks ENE and ~27° down.
const FT = 0.3048, agl = 820 * FT, hd = 70 * Math.PI / 180, tanP = Math.tan(27 * Math.PI / 180);
const hs = hf.sample(fire.spi[0], fire.spi[1]);
let D = 500, P = fire.spi;
for (let k = 0; k < 12; k++) { P = [fire.spi[0] - Math.sin(hd) * D, fire.spi[1] - Math.cos(hd) * D]; D = Math.max(120, (hf.sample(P[0], P[1]) + agl - hs) / tanP); }
const units = [
  { id: 'E-31', kind: 'engine', type: 'Type 3', status: 'active', detail: 'Structure protection · Zone 1', position: r2(e31) },
  { id: 'E-32', kind: 'engine', type: 'Type 3', status: 'active', detail: 'Trancas Canyon Rd · patrol', position: r2(trancasTop) },
  { id: 'S-12', kind: 'law', type: 'Sheriff', status: 'alert', detail: 'Traffic control · Encinal hairpin', position: r2(hairpin) },
  { id: 'FT-01', kind: 'drone', name: 'Scout', altitudeFt: 820, status: 'active', detail: 'Gimbal lock · HS-01 head', position: r2(P), orbitRadius: 60, orbitPeriodS: 80, orbitPhase: 0, gimbal: { target: r2(fire.spi), tempC: 980, targetId: 'HS-01' } },
];
void anyNet; void nearestOn;

// ---------------------------------------------------------------- layers
const ZONE = (rings, fill, mode, opacity, outline, structures) => (rings.length ? { type: 'polygon', rings, mode, fill, fillOpacity: opacity, outline, ...(structures ? { structures } : {}) } : null);
const layers = [
  ['evac-safe', ZONE(zone3, PALETTE.ok, 'tint', 0.08, { color: PALETTE.ok, width: 2, dash: [10, 6], opacity: 0.6 })],
  ['evac-warning', ZONE(zone2, PALETTE.amber, 'tint', 0.08, { color: PALETTE.amber, width: 2, dash: [10, 6], opacity: 0.6 }, 'threatened')],
  ['evac-order', ZONE(zone1, PALETTE.red, 'hatch', 0.3, { color: PALETTE.red, width: 2.2, opacity: 0.85 }, 'threatened')],
  ['burn-scar', { type: 'polygon', rings: [fire.ring.map(r2)], mode: 'burnScar', structures: 'destroyed', progression: { from: ignition, to: r2(fire.tip), start: '2026-08-14T23:05:00-07:00', end: '2026-08-15T03:00:00-07:00' } }],
  ['fire-perimeter', { type: 'line', points: fire.ring.map(r2), closed: true, color: PALETTE.fire, colorLow: '#7A1E08', intensity: fire.intensity.map((v) => Math.round(v * 100) / 100), width: 3.2, glow: 9, glowOpacity: 0.55, heat: 1, thermal: 0.9, sensorVisible: true }],
  ['hotspots', { type: 'points', points: fire.hotspots.map((h) => ({ ...h, position: r2(h.position) })), size: 16, sensorVisible: true }],
  ['route-b', { type: 'line', points: routeB.map(r2), color: PALETTE.amber, width: 3, glow: 3, glowOpacity: 0.35, style: 'dashed', dash: [12, 8] }],
  ['choke-1', { type: 'line', points: choke.map(r2), color: PALETTE.red, width: 10, glow: 6, glowOpacity: 0.5 }],
  ['route-a', { type: 'line', points: routeA.map(r2), color: PALETTE.cyan, width: 5, glow: 7, glowOpacity: 0.5, style: 'chevron', chevronSpacing: 30, speed: 26 }],
  ['choke-1-marker', { type: 'marker', position: r2(hairpin), icon: 'hazard', title: 'CHOKE · ENCINAL HAIRPIN', detail: `${Math.round((best.turn * 180) / Math.PI)}° switchback · one lane outbound` }],
  ['ignition', { type: 'marker', position: ignition, icon: 'ignition', title: 'IGNITION', detail: 'Aug 14 · 23:05 · Trancas Cyn' }],
  ['staging', { type: 'marker', position: r2(zone3.length ? ringCentroid(biggest(zone3)) : westExit), icon: 'staging', title: 'ZONE 3 · SAFE', detail: 'Assembly · PCH westbound' }],
].filter(([, v]) => v);

const encMid = encinalLeg.filter((p) => p[1] > 900)[0] ?? top;
const labelItems = [
  { position: [encMid[0] - 260, encMid[1]], text: 'Encinal Canyon', kind: 'area' },
  { position: [trancasTop[0] + 150, trancasTop[1] + 650], text: 'Trancas Canyon', kind: 'area' },
  { position: [-600, -1450], text: 'Pacific Ocean', kind: 'water' },
  { position: r2(junction), text: 'PCH · Rte 1', kind: 'road' },
  ...places.filter((p) => /peak|hamlet|beach/.test(p.kind)).map((p) => ({ position: p.position, text: p.name, kind: p.kind === 'peak' ? 'peak' : 'place' })),
];
if (zone1.length) labelItems.push({ position: ringCentroid(biggest(zone1)), text: 'ZONE 1 · MANDATORY', kind: 'place' });
if (zone2.length) labelItems.push({ position: ringCentroid(biggest(zone2)), text: 'ZONE 2 · WARNING', kind: 'place' });
layers.push(['labels', { type: 'labels', items: labelItems }]);

const ll = geo.toLatLon(0, 0);
const scenario = {
  meta: {
    title: 'Encinal Canyon',
    subtitle: 'Training scenario · real terrain & roads, fictional fire',
    coords: `${ll.lat.toFixed(3)}°N ${Math.abs(ll.lon).toFixed(3)}°W`,
    size: `${(W / 1000).toFixed(1)} × ${(H / 1000).toFixed(2)} km`,
    attribution: 'Terrain: AWS Terrain Tiles (USGS 3DEP) · Roads & buildings © OpenStreetMap contributors · Land cover: ESA WorldCover 2021 (CC BY 4.0)',
    feedDrone: 'FT-01',
  },
  presets: [
    { name: 'Overview', sub: 'full frame', target: [0, -100], range: 5600, pitch: 52, bearing: -10 },
    { name: 'Fire head', sub: 'HS-01', target: r2(fire.tip), range: 1600, pitch: 58, bearing: 60 },
    { name: 'Hairpin', sub: 'choke point', target: r2(hairpin), range: 900, pitch: 60, bearing: 20 },
    { name: 'PCH junction', sub: 'Encinal / Rte 1', target: r2(junction), range: 1100, pitch: 58, bearing: -20 },
    { name: 'Zone 1', sub: 'mandatory', target: zone1.length ? r2(ringCentroid(biggest(zone1))) : r2(e31), range: 1300, pitch: 55, bearing: 40 },
    { name: 'Trancas', sub: 'looking north', target: [1700, 500], range: 2400, pitch: 62, bearing: 330 },
  ],
  layers,
  units,
};
writeFileSync(join(data, 'scenario.json'), JSON.stringify(scenario));
console.log(JSON.stringify({
  routeA: Math.round(length(routeA)), junction: r2(junction), routeB: Math.round(length(routeB)), hairpin: r2(hairpin), hairpinLatLon: geo.format(geo.toLatLon(...hairpin).lat, geo.toLatLon(...hairpin).lon), turnDeg: Math.round(best.turn * 57.3), choke: Math.round(length(choke)),
  fireHead: r2(fire.tip), headToEncinal: Math.round(lineD(fire.tip, encinalLeg)), zones: [zone1.length, zone2.length, zone3.length], bInZ1: dFire.filter((d) => d < 900).length, ft01: r2(P),
}));

// ============================================================================
// Situations (tte.situation/1) for scenarioPlayer.ts, with TALON scripts (talon.ts)
// ============================================================================
// Clock: scene minutes, T0 = first detection. The night variant matches the FlytBase brief
// (California, January 2026, 03:47); day is an exercise variant with the same geometry.
// Timing is the point: with TALON the plan is proposed 6 minutes after the detection, not
// 38 (the brief's manual baseline). Operator decisions are decisions, not clock times:
// everything that follows an authorization hangs off "@authorize".
const EPOCH = { day: '2026-01-14T10:12:00-08:00', night: '2026-01-14T03:47:00-08:00' };
const ATTRIB = scenario.meta.attribution;
const DISCLAIMER = 'Training exercise. Terrain, roads, structures and land cover are real; the fire, weather, units, times and TALON are invented.';
const r1 = (v) => Math.round(v * 10) / 10;
const fmtT = (t) => `T${t < 0 ? '−' : '+'}${Math.floor(Math.abs(Math.round(t)) / 60)}:${String(Math.abs(Math.round(t)) % 60).padStart(2, '0')}`;
const fmtLL = (p) => { const g = geo.toLatLon(p[0], p[1]); return geo.format(g.lat, g.lon); };
const mmss = (min) => `${Math.floor(min)}:${String(Math.round((min % 1) * 60)).padStart(2, '0')}`;
const drivable = new RoadNetwork(roads.filter((r) => r.kind !== 'turnaround'));
/** Timed track along the road network (m/s), from t0. Off-network targets finish at walking pace. */
function drive(from, to, t0, mps, net = drivable) {
  const a = net.nearest(from);
  const seen = new Uint8Array(net.xs.length);
  const stack = [a];
  seen[a] = 1;
  while (stack.length) for (const e of net.adj[stack.pop()]) if (!seen[e.to]) { seen[e.to] = 1; stack.push(e.to); }
  let b = a, bd = Infinity;
  for (let i = 0; i < net.xs.length; i++) if (seen[i]) { const d = Math.hypot(net.xs[i] - to[0], net.ys[i] - to[1]); if (d < bd) { bd = d; b = i; } }
  const pts = net.route(a, b);
  const out = [{ t: r1(t0), p: r2(pts[0]) }];
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    d += dist(pts[i], pts[i - 1]);
    if (i % 2 === 0 || i === pts.length - 1) out.push({ t: Math.round((t0 + d / mps / 60) * 100) / 100, p: r2(pts[i]) });
  }
  if (bd > 15) out.push({ t: Math.round((out[out.length - 1].t + bd / 1.2 / 60) * 100) / 100, p: r2(to) });
  return out;
}
const along = (line, t0, mps) => {
  const out = [{ t: r1(t0), p: r2(line[0]) }];
  let d = 0;
  for (let i = 1; i < line.length; i++) { d += dist(line[i], line[i - 1]); out.push({ t: Math.round((t0 + d / mps / 60) * 100) / 100, p: r2(line[i]) }); }
  return out;
};
const fly = (a, b, t0, mps) => [{ t: r1(t0), p: r2(a) }, { t: Math.round((t0 + dist(a, b) / mps / 60) * 100) / 100, p: r2(b) }];
const endT = (track) => track[track.length - 1].t;
const pip = (x, y, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const inRings = (p, rings) => rings.some((r) => pip(p[0], p[1], r));

// ---------------------------------------------------------------- fire as time-of-arrival fields
const T_IGN = -10, T_RING = 101;
const FIELD = fireArrivalField(fire, ignition, frame, { cols: 240, rows: 130, tIgnition: T_IGN, tRing: T_RING, cap: 900 });
const sampler = (data) => (x, y) => {
  const c = Math.max(0, Math.min(FIELD.cols - 1, ((x + W / 2) / W) * FIELD.cols - 0.5)), r = Math.max(0, Math.min(FIELD.rows - 1, ((H / 2 - y) / H) * FIELD.rows - 0.5));
  const c0 = Math.floor(c), r0 = Math.floor(r), c1 = Math.min(c0 + 1, FIELD.cols - 1), rr1 = Math.min(r0 + 1, FIELD.rows - 1), fx = c - c0, fy = r - r0;
  const g = (cc, rr) => data[rr * FIELD.cols + cc];
  return (g(c0, r0) * (1 - fx) + g(c1, r0) * fx) * (1 - fy) + (g(c0, rr1) * (1 - fx) + g(c1, rr1) * fx) * fy;
};
const fieldAt = sampler(FIELD.data);
const axisL = dist(ignition, fire.tip);
const ax = [(fire.tip[0] - ignition[0]) / axisL, (fire.tip[1] - ignition[1]) / axisL];
const ROS = Math.round(axisL / (T_RING - T_IGN));
const headAt = (t, f = fieldAt) => { let prev = ignition; for (let d = 10; d < 4000; d += 10) { const p = [ignition[0] + ax[0] * d, ignition[1] + ax[1] * d]; if (f(p[0], p[1]) > t) return prev; prev = p; } return prev; };
const cellAc = (W / FIELD.cols) * (H / FIELD.rows) / 4046.86;
const acresAt = (data, t) => { let n = 0; for (const v of data) if (v <= t) n++; return n * cellAc; };

const routeASamples = resampleUniform(routeA, 10);
const firstCut = (f) => { let c = { t: Infinity, p: routeASamples[0] }; routeASamples.forEach((p) => { const t = f(p[0], p[1]); if (t < c.t) c = { t, p }; }); return c; };
const cut = firstCut(fieldAt);

// The model is wrong: a spot fire ignites ahead of the front and reaches the road ~14 min early.
const T_SPOT = Math.round(cut.t - 43), T_OBS = T_SPOT + 3, T_G = T_OBS + 1;
const toIgn = [(ignition[0] - cut.p[0]), (ignition[1] - cut.p[1])]; const tiL = Math.hypot(...toIgn); const u = [toIgn[0] / tiL, toIgn[1] / tiL];
let sFront = 0; for (let d = 0; d < 3000; d += 10) { if (fieldAt(cut.p[0] + u[0] * d, cut.p[1] + u[1] * d) <= T_OBS) { sFront = d; break; } }
const spotAhead = Math.round(sFront * 0.48);
const spot = r2([cut.p[0] + u[0] * Math.max(220, sFront - spotAhead), cut.p[1] + u[1] * Math.max(220, sFront - spotAhead)]);
const sRoad = dist(spot, cut.p);
const rDw = sRoad / (cut.t - 14 - T_SPOT), rCw = rDw * 0.45, rBk = rDw * 0.22;
const REV = new Float32Array(FIELD.data.length);
for (let r = 0; r < FIELD.rows; r++) for (let c = 0; c < FIELD.cols; c++) {
  const x = ((c + 0.5) / FIELD.cols) * W - W / 2, y = H / 2 - ((r + 0.5) / FIELD.rows) * H;
  const dx = x - spot[0], dy = y - spot[1];
  const a = -(dx * u[0] + dy * u[1]), cw = Math.abs(dx * u[1] - dy * u[0]); // a > 0 downwind (toward the road)
  const ts = T_SPOT + Math.hypot(a / (a >= 0 ? rDw : rBk), cw / rCw);
  const i = r * FIELD.cols + c;
  REV[i] = Math.min(FIELD.data[i], ts);
}
const revAt = sampler(REV);
const cutRev = firstCut(revAt);
const ERR = Math.round(cut.t - cutRev.t);

const legSamples = resampleUniform(encinalLeg, 10);
const legIndex = (p) => { let bi = 0; legSamples.forEach((q, i) => { if (dist(q, p) < dist(legSamples[bi], p)) bi = i; }); return bi; };
const cutLeg = legIndex(cutRev.p);
const routeBNorth = legSamples.slice(0, Math.min(legSamples.length, cutLeg + 18)).reverse();
const cutSeg = legSamples.slice(Math.max(0, cutLeg - 15), cutLeg + 16);
const above = (cl) => centroids.filter((c) => { let bi = 0, bd = Infinity; legSamples.forEach((p, i) => { const d = dist(c, p); if (d < bd) { bd = d; bi = i; } }); return bd < 300 && bi < cl; }).length;
const upstream = above(cutLeg);
const occupied = Math.max(3, Math.round(upstream * 0.37));
const upperMid = r2(legSamples[Math.max(0, Math.floor(cutLeg * 0.45))]);

// Dozer contingency line, south flank.
const sv = [ax[1], -ax[0]];
const dozerLine = [];
for (let uu = 0.12; uu <= 0.62; uu += 0.025) {
  const b = [ignition[0] + ax[0] * axisL * uu, ignition[1] + ax[1] * axisL * uu];
  let dd = 0;
  for (let d = 0; d < 2000; d += 10) { if (fieldAt(b[0] + sv[0] * d, b[1] + sv[1] * d) > 140) { dd = d; break; } }
  dozerLine.push(r2([b[0] + sv[0] * (dd + 110), b[1] + sv[1] * (dd + 110)]));
}

// Hotspots behind the moving edge, plus the spot fire once FT-02 has seen it.
const hotspots = [];
{
  let seed = 99; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let tt = 6; tt <= 138; tt += 4) {
    const h = headAt(tt - 1.5);
    hotspots.push({ id: 'HS-01', position: r2(h), intensity: 1, tempC: 980, window: [tt, tt + 4] });
    for (let k = 0; k < 9; k++) {
      const off = (rnd() - 0.5) * 2.2, back = 20 + rnd() * 120;
      const ang = Math.atan2(ax[1], ax[0]) + off;
      const r0 = dist(ignition, headAt(tt - 2)) * (0.75 + 0.25 * Math.cos(off * 1.4));
      const p = [ignition[0] + Math.cos(ang) * (r0 - back), ignition[1] + Math.sin(ang) * (r0 - back)];
      const a = fieldAt(p[0], p[1]);
      if (a > tt || a < tt - 12) continue;
      const it = Math.max(0.3, Math.min(0.95, 0.4 + 0.55 * Math.cos(off)));
      hotspots.push({ id: `HS-${hotspots.length + 1}`, position: r2(p), intensity: r1(it), tempC: Math.round(420 + 520 * it), window: [tt, tt + 4 + rnd() * 3] });
    }
  }
  hotspots.push({ id: 'SPOT-1', position: spot, intensity: 0.85, tempC: 760, window: [T_OBS, 999] });
}

// ---------------------------------------------------------------- places, docks, sensors
const sweep = [[-1700, -150], [-300, 650], [900, 1150], [2300, 1250], [2400, 250], [800, -250]].map(r2);
const detection = r2(headAt(0.5));
const standoff = (target, bearingDeg = 250, d = 520) => r2([target[0] + Math.sin(bearingDeg * Math.PI / 180) * d, target[1] + Math.cos(bearingDeg * Math.PI / 180) * d]);
const placeLabels = labelItems.filter((l) => !/^ZONE/.test(l.text));
const z1c = zone1.length ? r2(ringCentroid(biggest(zone1))) : r2(e31);
const z2c = zone2.length ? r2(ringCentroid(biggest(zone2))) : r2(junction);
const z3c = zone3.length ? r2(ringCentroid(biggest(zone3))) : r2(westExit);
const pchEastEntry = r2(eastExit);
const trancasMouth = r2(trancas.reduce((a, b) => (b[1] < a[1] ? b : a), trancas[0] ?? [2400, -1000]));
const standbyE31 = r2(drivable.point(drivable.nearest([junction[0] - 260, junction[1] - 40])));
const e31Far = r2(drivable.point(drivable.nearest([junction[0] + 1500, junction[1] - 60])));
const standbySH = r2(drivable.point(drivable.nearest([junction[0] + 700, junction[1] + 60])));
const e31Post = r2(legSamples.reduce((a, b) => (Math.abs(fieldAt(...b) - 175) < Math.abs(fieldAt(...a) - 175) ? b : a)));
const nearestBuilding = (p) => r2(centroids.reduce((a, b) => (dist(b, p) < dist(a, p) ? b : a)));
const dock1 = nearestBuilding([junction[0] - 160, junction[1] - 40]);
const dock2 = nearestBuilding(trancasMouth);
let s7 = ignition, s7z = -Infinity;
for (let dx = -900; dx <= 900; dx += 30) for (let dy = -900; dy <= 300; dy += 30) {
  const p = [ignition[0] - 300 + dx, ignition[1] - 300 + dy];
  if (Math.abs(p[0]) > W / 2 - 60 || Math.abs(p[1]) > H / 2 - 60 || dist(p, detection) < 700) continue;
  const z = hf.sample(p[0], p[1]); if (z > s7z) { s7z = z; s7 = r2(p); }
}
const nearestHome = (p) => Math.round(Math.min(...centroids.map((c) => dist(c, p))));

// Households in the zones (one per footprint) and alert reach (exercise estimates).
const hh1 = centroids.filter((c) => inRings(c, zone1)).length;
const hh2 = centroids.filter((c) => inRings(c, zone2)).length;
const devices = Math.round((hh1 + hh2) * 2.4), lines = Math.round((hh1 + hh2) * 0.45), devUp = Math.round(occupied * 2.4);
const nIn = (t, h, f = fieldAt) => centroids.filter((c) => { const a = f(c[0], c[1]); return a > t && a <= t + h; }).length;
const firstHome = Math.min(...centroids.map((c) => fieldAt(c[0], c[1])));

// Courses of action for the plan (TALON egress model, exercise numbers).
const lenOf = (l) => l.slice(1).reduce((s, q, i) => s + dist(q, l[i]), 0);
const z1Leg = legIndex(z1c);
const southLen = lenOf(routeA.slice(Math.min(routeA.length - 2, Math.max(0, routeA.findIndex((p) => dist(p, legSamples[z1Leg]) < 40)))));
const northLen = lenOf(routeBNorth);
const VPH = 1.6, CAP = 14; // vehicles per household; one lane outbound under traffic control (veh/min)
const clearA = Math.round(southLen / 8 / 60 + (hh1 * VPH) / CAP);
const upCanyon = Math.min(hh1, above(z1Leg + 1) || Math.round(hh1 * 0.4));
const clearB = Math.round(Math.max(northLen / 8 / 60 + (upCanyon * VPH) / CAP, southLen / 8 / 60 + ((hh1 - upCanyon) * VPH) / CAP) + 4);

const meas = (source) => ({ basis: 'measured', source });
const model = (source) => ({ basis: 'modeled', source });
const auth = (source) => ({ basis: 'authored', source });
const SPREAD = model('TALON spread model v3 (exercise data)');
const routeDefs = [
  { id: 'route-a', name: 'Route A', anchor: r2(routeA[Math.floor(routeA.length * 0.55)]),
    primary: { color: PALETTE.cyan, width: 5, glow: 7, glowOpacity: 0.5, style: 'chevron', chevronSpacing: 30, speed: 26 },
    alternate: { color: PALETTE.cyan, width: 2.4, glow: 2, glowOpacity: 0.22, style: 'dashed', dash: [10, 7] } },
  { id: 'route-b', name: 'Route B', anchor: r2(routeBNorth[Math.floor(routeBNorth.length * 0.6)]),
    primary: { color: PALETTE.cyan, width: 5, glow: 7, glowOpacity: 0.5, style: 'chevron', chevronSpacing: 30, speed: 26 },
    alternate: { color: PALETTE.cyan, width: 2.4, glow: 2, glowOpacity: 0.22, style: 'dashed', dash: [10, 7] } },
];

const ESC = ['@answer:escalate:escalate', '@answer:escalate_rr:escalate'];
const plus = (refs, m) => refs.map((r) => `${r}+${m}`);
const phasesWUI = [
  { id: 'A', name: 'Standby', t: -30, job: 'Show the place and the assets.', camera: { target: [0, -100], range: 5600, pitch: 52, bearing: -10 }, dock: ['fleet', 'weather', 'events'] },
  { id: 'B', name: 'Detection', t: 0, job: 'Show exactly one thing, and where it is.', camera: { target: detection, range: 2400, pitch: 56, bearing: 250 }, feed: { drone: 'FT-01', sensor: 'ir' }, dock: ['feed', 'fleet'] },
  { id: 'C', name: 'Sizing', t: 4, job: 'Show how big, and where it is going.', camera: { target: r2(headAt(40)), range: 3300, pitch: 55, bearing: 235 }, dock: ['growth', 'feed', 'weather'] },
  { id: 'D', name: 'Plan', t: 6, job: 'Show the plan, every element at its proposed position.', camera: { target: [-400, 120], range: 5200, pitch: 50, bearing: -20 }, gate: { label: 'ORDER MANDATORY EVACUATION · ZONE 1', expires: 16 }, dock: ['evac', 'growth'] },
  { id: 'E', name: 'Authorized', t: 8, after: '@authorize', job: 'Show the same plan, restyled as committed. Nothing moves.', camera: { target: [-400, 120], range: 5200, pitch: 50, bearing: -20 }, dock: ['evac', 'fleet'] },
  { id: 'F', name: 'Operations', t: 12, after: '@authorize', job: 'Show where everyone is, and whether the plan still holds.', camera: { target: [-200, 200], range: 5000, pitch: 54, bearing: -25 }, dock: ['evac', 'feed', 'fleet'] },
  { id: 'G', name: 'Revision', t: T_G, after: '@authorize', job: 'Show the revision against the committed plan.', camera: { target: r2([cutRev.p[0] - 150, cutRev.p[1] + 150]), range: 2600, pitch: 56, bearing: 35 }, feed: { drone: 'FT-02', sensor: 'ir' }, dock: ['evac', 'feed', 'growth'] },
];

const W_ = (txt, dir) => ({ value: txt, basis: 'measured', source: 'RAWS Malibu Hills (exercise feed)', ...(dir !== undefined ? { dir } : {}) });
const telemetryWUI = [
  { at: 'A', values: { status: { value: 'Red Flag Warning', level: 'warn', basis: 'authored', source: 'NWS (exercise inject)' }, wind: W_('ENE 14 G24 mph', 247), rh: W_('12%'), temp: W_('64°F'), fuel: W_('1-h 4% · ERC 78'), incident: { value: 'No incident', level: 'ok', basis: 'authored', source: 'CAD' } } },
  { at: 'B', values: { incident: { value: 'Detection · unconfirmed', level: 'warn', basis: 'measured', source: 'S-7 LWIR' } } },
  { at: 2, values: { incident: { value: 'Type 4 · initial attack', level: 'bad', basis: 'measured', source: 'FT-01 IR' } } },
  { at: 'C', values: { status: { value: 'Critical fire weather', level: 'bad', basis: 'authored', source: 'NWS (exercise inject)' }, wind: W_('ENE 22 G38 mph', 247), rh: W_('8%'), temp: W_('66°F'), spread: { value: `${ROS} m/min WSW`, basis: 'modeled', source: 'TALON spread model v3' } } },
  { at: ESC, values: { incident: { value: 'Type 3 · extended attack', level: 'bad', basis: 'authored', source: 'Operator escalation' } } },
  { at: '@authorize+0.2', values: { incident: { value: 'Type 3 · evacuation order', level: 'bad', basis: 'authored', source: 'Operator authorization' } } },
  { at: 'F', values: { wind: W_('ENE 20 G34 mph', 247) } },
  { at: 50, values: { status: { value: 'GOES-West IR lost · drone-only fusion', level: 'warn', basis: 'measured', source: 'GOES-West ground segment' } } },
  { at: T_OBS, values: { spread: { value: `${ROS} m/min · spotting ${spotAhead} m`, basis: 'modeled', source: 'TALON spread model v3 (corrected)' } } },
];

const fieldBase = { type: 'field', cols: FIELD.cols, rows: FIELD.rows, fill: 'burnScar', front: 7, edge: { color: PALETTE.fire, width: 1.8 },
  isochrones: [
    { offset: 15, color: PALETTE.fire, style: 'solid', width: 1.8, label: '+15 min' },
    { offset: 30, color: PALETTE.fire, style: 'dashed', width: 1.8, label: '+30 min' },
    { offset: 60, color: PALETTE.red, style: 'dotted', width: 2.2, label: '+60 min' },
  ],
  origin: ignition, labelToward: r2(fire.tip), structures: { reached: 'destroyed', within: 60 }, epoch: EPOCH.night, sensorVisible: true };
const q10 = (a) => Array.from(a, (v) => Math.round(v * 10) / 10);
const zoneSpec = (rings, fill, mode, opacity, outline) => ({ type: 'polygon', rings, mode, fill, fillOpacity: opacity, outline });
const zoneLabel = (pct, proposed) => [
  { position: z1c, text: `ZONE 1 · ORDER${proposed ? ' · PROPOSED' : pct === undefined ? '' : ` · ${pct}% CLEARED`}`, kind: 'place' },
  { position: z2c, text: `ZONE 2 · WARNING${proposed ? ' · PROPOSED' : ''}`, kind: 'place' },
  { position: [z3c[0], z3c[1] - 120], text: 'ZONE 3 · SAFE', kind: 'place' },
];
const CLEAR = [[6, 10], [12, 28], [22, 51], [37, 70], [52, 80], [64, 84]];
const PLAN = { states: [{ at: 'D', state: 'proposed' }, { at: '@authorize', state: 'committed' }] };
// Source conflict: a registered burn plot near the detection (county registry, exercise).
const plotP = [detection[0] - 40, detection[1] + 330];
const burnPlotRing = [[plotP[0] - 110, plotP[1] - 90], [plotP[0] + 110, plotP[1] - 90], [plotP[0] + 110, plotP[1] + 90], [plotP[0] - 110, plotP[1] + 90], [plotP[0] - 110, plotP[1] - 90]].map(r2);
const station = (id, pos, title, detail) => ({ id, group: 'assets', name: title, provenance: meas('Dock and sensor telemetry'), spec: { type: 'marker', position: pos, icon: 'station', tone: 'slate', title, detail } });

const layersWUI = [
  { id: 'labels', group: 'labels', name: 'Place names', provenance: meas('OpenStreetMap'), spec: { type: 'labels', items: placeLabels } },
  station('dock-1', dock1, 'DOCK D-1', 'FT-03 ready'),
  station('dock-2', dock2, 'DOCK D-2', 'FT-02 ready'),
  station('sensor-s7', s7, 'S-7 · THERMAL MAST', 'LWIR · 360°'),
  { id: 'detection', group: 'detections', name: 'Heat detection', from: 'B', until: 'C', provenance: meas('S-7 LWIR'),
    spec: { type: 'marker', position: detection, icon: 'detection', tone: 'warn', pulse: true, title: 'HEAT DETECTION · UNCONFIRMED', detail: `S-7 LWIR · 71% · ${fmtLL(detection)}` },
    patches: [{ at: 2, spec: { tone: 'fire', title: 'CONFIRMED · ACTIVE FLAME', detail: `FT-01 IR · 412 °C · ${fmtLL(detection)}` } }] },
  { id: 'fire', group: 'firePerimeter', name: 'Perimeter + projection', from: 'C', until: T_OBS, hindsight: { from: 'C', until: 'C' }, provenance: SPREAD, spec: { ...fieldBase, data: q10(FIELD.data) } },
  { id: 'fire-rev', group: 'firePerimeter', name: 'Perimeter + projection (corrected)', from: T_OBS, hindsight: { from: 'C' }, provenance: model('TALON spread model v3, corrected with FT-02 IR'), spec: { ...fieldBase, data: q10(REV) } },
  { id: 'hotspots', group: 'detections', name: 'Thermal hotspots', from: 'C', provenance: meas('FT-01 / FT-02 IR'), spec: { type: 'points', points: hotspots, size: 15, sensorVisible: true } },
  { id: 'head-axis', group: 'headAxis', name: 'Head axis', from: 'C', until: 'D', provenance: SPREAD, spec: { type: 'line', points: [r2(ignition), r2(headAt(90))], color: PALETTE.fire, width: 1.6, glow: 0, style: 'dashed', dash: [6, 6], lift: 6 } },
  { id: 'ignition', group: 'firePerimeter', name: 'Ignition area', from: 'C', provenance: model('Origin estimate from spread'), spec: { type: 'marker', position: r2(ignition), icon: 'ignition', title: 'IGNITION AREA', detail: `est. ${fmtT(T_IGN)} · Trancas Cyn` } },
  { id: 'wind', group: 'weather', name: 'Wind', from: 'C', provenance: meas('RAWS Malibu Hills'),
    spec: { type: 'marker', position: r2([headAt(60)[0] - 250, headAt(60)[1] + 380]), icon: 'wind', tone: 'slate', rotation: 247, title: 'WIND ENE 22 G38', detail: 'RH 8% · 66°F' },
    patches: [{ at: 'F', spec: { title: 'WIND ENE 20 G34', detail: 'RH 9% · 65°F' } }] },
  { id: 'burn-plot', group: 'detections', name: 'Registered burn plot', from: 4.4, until: 13, provenance: auth('County burn-permit registry (exercise)'),
    spec: { type: 'polygon', rings: [burnPlotRing], mode: 'tint', fill: PALETTE.amber, fillOpacity: 0.1, outline: { color: PALETTE.amber, width: 2, dash: [8, 6], opacity: 0.7 } } },
  { id: 'evac-safe', group: 'evacZones', name: 'Zone 3 · safe', from: 'D', provenance: auth('TALON plan P-1'), ...PLAN, spec: zoneSpec(zone3, PALETTE.ok, 'tint', 0.08, { color: PALETTE.ok, width: 2, dash: [10, 6], opacity: 0.6 }) },
  { id: 'evac-warning', group: 'evacZones', name: 'Zone 2 · warning', from: 'D', provenance: auth('TALON plan P-1'), ...PLAN, spec: zoneSpec(zone2, PALETTE.amber, 'tint', 0.08, { color: PALETTE.amber, width: 2, dash: [10, 6], opacity: 0.6 }) },
  { id: 'evac-order', group: 'evacZones', name: 'Zone 1 · mandatory', from: 'D', provenance: auth('TALON plan P-1'), ...PLAN, spec: zoneSpec(zone1, PALETTE.red, 'hatch', 0.3, { color: PALETTE.red, width: 2.2, opacity: 0.85 }) },
  { id: 'zone-labels', group: 'evacZones', name: 'Zone status', from: 'D', provenance: auth('Sheriff field reports (exercise)'),
    spec: { type: 'labels', items: zoneLabel(undefined, true) },
    patches: [{ at: '@authorize', spec: { items: zoneLabel(0) } }, ...CLEAR.map(([m, pct]) => ({ at: `@authorize+${m}`, spec: { items: zoneLabel(pct) } })), { at: '@answer:stall:send+8', spec: { items: zoneLabel(90) } }, { at: '@approve+10', spec: { items: zoneLabel(100) } }] },
  { id: 'route-b', group: 'routes', name: 'Route B · Encinal north', from: 'D', route: 'route-b', provenance: auth('TALON plan P-1'), ...PLAN, spec: { type: 'line', points: routeBNorth.map(r2), interactive: true } },
  { id: 'route-a', group: 'routes', name: 'Route A · Encinal to PCH', from: 'D', route: 'route-a', provenance: auth('TALON plan P-1'), ...PLAN, spec: { type: 'line', points: routeA.map(r2), interactive: true } },
  { id: 'route-labels', group: 'routes', name: 'Route names', from: 'D', provenance: auth('TALON plan P-1'),
    spec: { type: 'labels', items: [
      { position: r2([routeBNorth[routeBNorth.length - 1][0] - 160, routeBNorth[routeBNorth.length - 1][1] - 60]), text: 'ROUTE B → MULHOLLAND HWY', kind: 'road' },
      { position: r2([westExit[0] + 300, westExit[1] + 70]), text: 'ROUTE A → PCH WEST', kind: 'road' },
    ] } },
  { id: 'choke-1', group: 'routes', name: 'Choke point', from: 'D', provenance: meas('OSM geometry'), ...PLAN, spec: { type: 'line', points: choke.map(r2), color: PALETTE.red, width: 10, glow: 6, glowOpacity: 0.5 } },
  { id: 'choke-1-marker', group: 'routes', name: 'Encinal hairpin', from: 'D', provenance: meas('OSM geometry'), ...PLAN,
    spec: { type: 'marker', position: r2(hairpin), icon: 'hazard', pulse: true, interactive: true, title: 'CHOKE · ENCINAL HAIRPIN', detail: `${Math.round((best.turn * 180) / Math.PI)}° switchback · one lane outbound` },
    patches: [{ at: '@authorize+3', spec: { pulse: false, detail: `${Math.round((best.turn * 180) / Math.PI)}° switchback · SH-12 traffic control` } }] },
  { id: 'staging', group: 'staging', name: 'Zone 3 assembly', from: 'D', provenance: auth('TALON plan P-1'), ...PLAN, spec: { type: 'marker', position: z3c, icon: 'staging', title: 'ZONE 3 · SAFE ASSEMBLY', detail: 'PCH westbound' } },
  { id: 'dozer-line', group: 'suppression', name: 'Dozer line · south flank', from: 'D', provenance: auth('TALON plan P-1'), ...PLAN, spec: { type: 'line', drape: true, points: dozerLine, color: '#D9B36C', width: 12, style: 'dashed', dash: [26, 12] } },
  { id: 'authority', group: 'authority', name: 'Evacuation order', from: '@authorize+0.2', provenance: auth('Operator authorization'),
    spec: { type: 'marker', position: r2([z1c[0] + 60, z1c[1] + 260]), icon: 'authority', tone: 'red', title: 'EVACUATION ORDER · ZONE 1', detail: 'WEA + reverse-911 · warning Zone 2' } },
  { id: 'spot', group: 'detections', name: 'Spot fire', from: T_OBS, provenance: meas('FT-02 IR'), spec: { type: 'marker', position: spot, icon: 'ignition', tone: 'fire', title: 'SPOT FIRE · 760 °C', detail: `FT-02 IR · ${spotAhead} m ahead of the front` } },
  { id: 'cut-prev', group: 'routes', name: 'Earlier projected cut', from: T_OBS, provenance: SPREAD, spec: { type: 'marker', position: r2(cut.p), icon: 'cut', tone: 'slate', state: 'proposed', title: `EARLIER PROJECTION · ${fmtT(cut.t)}`, detail: `superseded at ${fmtT(T_OBS)}` } },
  { id: 'route-a-cut', group: 'routes', name: 'Route A · projected cut', from: T_OBS, provenance: model('TALON spread model v3, corrected'), spec: { type: 'line', points: cutSeg.map(r2), state: 'compromised', width: 5, glow: 3 } },
  { id: 'cut-marker', group: 'routes', name: 'Projected cut', from: T_OBS, provenance: model('TALON spread model v3, corrected'),
    spec: { type: 'marker', position: r2(cutRev.p), icon: 'cut', tone: 'red', pulse: true, interactive: true, title: `PROJECTED CUT · ${fmtT(cutRev.t)}`, detail: `${upstream} homes above · Encinal Cyn Rd` },
    patches: [{ at: Math.ceil(cutRev.t), spec: { title: 'ROAD CUT · ENCINAL CYN RD', detail: `fire on the road · ${upstream} homes above` } }] },
];

// ---- units (positions on real roads; times in scene minutes or relative to decisions)
const e31Pre = drive(e31Far, standbyE31, 0, 12);
const e31FromJ = drive(standbyE31, e31Post, 0, 9), e31FromFar = drive(e31Far, e31Post, 0, 9);
const e32Out = drive(trancasMouth, trancasTop, 2.2, 10);
const shOut = drive(standbySH, hairpin, 0, 12);
const DZ_DELAY = 16;
const dzRoad = drive(pchEastEntry, dozerLine[dozerLine.length - 1], 0, 11);
const dzLine = along([...dozerLine].reverse(), endT(dzRoad) + 4, 0.45);
const dzArrive = Math.round((DZ_DELAY + endT(dzRoad)) * 10) / 10;
const ft01Out = fly(sweep[2], standoff(detection, 250, 380), 0, 12);
const ftStandoffs = [6, 20, 38, 54, 70, 86, T_G, 110, 125].map((at) => ({ at, target: r2(headAt(at)), pos: standoff(headAt(at)) }));
const ft02Out = fly(dock2, standoff(headAt(6), 160, 460), 4, 14);
const ft02Spot = standoff(spot, 200, 420);
const ft03Out = fly(dock1, z1c, 0, 15), ft03Up = fly(z1c, upperMid, 0, 15), ft03North = fly(upperMid, routeBNorth[Math.floor(routeBNorth.length * 0.7)], 0, 15);
// Failure-inject tracks: the battery handover (FT-01 → FT-02) and the failsafe return.
const ft01Home = fly(standoff(headAt(74)), dock2, 0, 14);
const ft02Head = fly(standoff(headAt(74), 160, 460), standoff(headAt(76)), 0, 12);
const loop = (line, i0, i1) => { const seg = line.slice(i0, i1); return [...seg, ...seg.slice(1, -1).reverse()].map(r2); };
const unitsWUI = [
  { spec: { id: 'FT-01', kind: 'drone', name: 'Kite', altitudeFt: 1200, status: 'active', detail: 'Canyon sweep', position: sweep[0], patrol: { path: sweep, speedMps: 22 } }, provenance: meas('Telemetry'),
    info: [{ at: -30, data: { battery: 81, role: 'Patrol', payload: 'EO/IR gimbal' } }, { at: 60, data: { battery: 46 } }, { at: 74, data: { battery: 14 } }, { at: 110, data: { battery: 6 } }, { at: '@answer:battery:handover+30', data: { battery: 34 } }],
    patches: [
      { at: 'B', spec: { track: [...ft01Out, ...ftStandoffs.slice(1).map((s) => ({ t: s.at, p: s.pos }))], detail: 'Retasked · heat detection', status: 'enroute', gimbal: { target: detection }, orbitRadius: 0 } },
      { at: endT(ft01Out), spec: { status: 'active', detail: 'Orbit · detection', orbitRadius: 140, orbitPeriodS: 70, gimbal: { target: detection, tempC: 412, targetId: 'DET-1' } } },
      ...ftStandoffs.slice(1).map((s) => ({ at: s.at, spec: { detail: 'Gimbal lock · head', orbitRadius: 90, orbitPeriodS: 80, gimbal: { target: s.target, tempC: 980, targetId: 'HS-01' } } })),
      { at: '@answer:battery:handover+0.2', rel: true, spec: { status: 'enroute', detail: 'Returning to dock D-2 · handover', track: ft01Home, orbitRadius: 0, gimbal: null } },
      { at: `@answer:battery:handover+${r1(0.2 + endT(ft01Home))}`, spec: { status: 'standby', detail: 'Docked D-2 · charging', altitudeFt: 0, track: null, orbitRadius: 0 } },
      { at: '@answer:battery:hold+18', rel: true, spec: { status: 'enroute', detail: 'Failsafe return · battery 6%', track: ft01Home, orbitRadius: 0, gimbal: null } },
      { at: `@answer:battery:hold+${r1(18 + endT(ft01Home))}`, spec: { status: 'standby', detail: 'Docked D-2 · auto-return', altitudeFt: 0, track: null, orbitRadius: 0 } },
    ] },
  { spec: { id: 'FT-02', kind: 'drone', name: 'Hawk', altitudeFt: 0, status: 'standby', detail: 'Docked · D-2', position: dock2 }, provenance: meas('Telemetry'),
    info: [{ at: -30, data: { battery: 100, role: 'Perimeter mapping', payload: 'IR mapping' } }, { at: 60, data: { battery: 58 } }, { at: 110, data: { battery: 31 } }],
    patches: [
      { at: 4, spec: { altitudeFt: 900, status: 'enroute', detail: 'Launched · perimeter mapping', track: [...ft02Out, ...ftStandoffs.slice(2, 6).map((s) => ({ t: s.at, p: standoff(headAt(s.at), 160, 460) })), { t: T_SPOT, p: standoff(headAt(T_SPOT), 160, 460) }, { t: T_OBS - 0.5, p: ft02Spot }], gimbal: { target: headAt(6) } } },
      { at: endT(ft02Out), spec: { status: 'active', detail: 'Perimeter orbit', orbitRadius: 260, orbitPeriodS: 140, gimbal: { target: r2(headAt(10)), tempC: 940, targetId: 'PERIM' } } },
      { at: T_OBS - 0.5, spec: { detail: 'Gimbal lock · spot fire', orbitRadius: 120, orbitPeriodS: 90, gimbal: { target: spot, tempC: 760, targetId: 'SPOT-1' } } },
      { at: '@answer:battery:handover+0.2', rel: true, spec: { detail: 'Head watch · handover from FT-01', track: ft02Head, gimbal: { target: r2(headAt(76)), tempC: 980, targetId: 'HS-01' } } },
      { at: `@answer:battery:handover+${r1(0.2 + endT(ft02Head))}`, spec: { status: 'active', detail: 'Head watch', orbitRadius: 120, orbitPeriodS: 80, track: null } },
    ] },
  { spec: { id: 'FT-03', kind: 'drone', name: 'Lark', altitudeFt: 0, status: 'standby', detail: 'Docked · D-1', position: dock1 }, provenance: meas('Telemetry'),
    info: [{ at: -30, data: { battery: 100, role: 'Evacuation support', payload: 'Speaker + strobes' } }, { at: '@authorize+40', data: { battery: 64 } }, { at: '@authorize+90', data: { battery: 37 } }],
    patches: [
      { at: '@authorize+0.4', rel: true, spec: { altitudeFt: 250, status: 'enroute', detail: 'Launched · Zone 1 egress', track: ft03Out } },
      { at: `@authorize+${r1(0.4 + endT(ft03Out))}`, spec: { status: 'active', detail: 'Speaker on · "Leave now via Encinal south"', track: null, patrol: { path: loop(legSamples, Math.max(0, z1Leg - 12), z1Leg + 14), speedMps: 9 } } },
      { at: '@answer:stall:send', rel: true, spec: { status: 'enroute', detail: 'To the upper canyon', track: ft03Up, patrol: null } },
      { at: `@answer:stall:send+${r1(endT(ft03Up))}`, spec: { status: 'active', detail: 'Broadcasting over the upper canyon', track: null, patrol: { path: loop(legSamples, Math.max(0, cutLeg - 20), cutLeg - 2), speedMps: 7 } } },
      { at: '@approve+0.3', rel: true, spec: { status: 'enroute', detail: 'Guiding north on Route B', track: ft03North, patrol: null } },
      { at: `@approve+${r1(0.3 + endT(ft03North))}`, spec: { status: 'active', detail: 'Speaker · "Go NORTH to Mulholland"', track: null, patrol: { path: loop(routeBNorth, 2, Math.floor(routeBNorth.length * 0.8)), speedMps: 8 } } },
    ] },
  { spec: { id: 'E-31', kind: 'engine', type: 'Type 3', status: 'standby', detail: 'Available · PCH east', position: e31Far }, provenance: meas('AVL'),
    patches: [
      { at: '@answer:prepos:yes', rel: true, spec: { status: 'enroute', detail: 'Pre-positioning · Encinal junction', track: e31Pre, trail: 10 } },
      { at: `@answer:prepos:yes+${r1(endT(e31Pre))}`, spec: { status: 'standby', detail: 'Staged · Encinal junction' } },
      { at: '@authorize+1', rel: true, when: '@answer:prepos:yes', spec: { status: 'enroute', detail: 'Structure protection · Zone 1', track: e31FromJ, trail: 14 } },
      { at: '@authorize+1', rel: true, unless: '@answer:prepos:yes', spec: { status: 'enroute', detail: 'Structure protection · Zone 1', track: e31FromFar, trail: 14 } },
      { at: `@authorize+${r1(1 + endT(e31FromJ))}`, when: '@answer:prepos:yes', spec: { status: 'active' } },
      { at: `@authorize+${r1(1 + endT(e31FromFar))}`, unless: '@answer:prepos:yes', spec: { status: 'active' } },
    ] },
  { spec: { id: 'E-32', kind: 'engine', type: 'Type 3', status: 'standby', detail: 'Available · Trancas', position: trancasMouth }, provenance: meas('AVL'),
    patches: [{ at: 2.2, spec: { status: 'enroute', detail: 'Initial attack · Trancas Cyn', track: e32Out, trail: 14 } }, { at: Math.ceil(endT(e32Out)), spec: { status: 'active' } }] },
  { spec: { id: 'SH-12', kind: 'law', type: 'Sheriff', status: 'standby', detail: 'Patrol · PCH', position: standbySH }, provenance: meas('AVL'),
    patches: [{ at: '@authorize+0.5', rel: true, spec: { status: 'enroute', detail: 'Traffic control · Encinal hairpin', track: shOut, trail: 12 } }, { at: `@authorize+${r1(0.5 + endT(shOut))}`, spec: { status: 'alert' } }] },
  { spec: { id: 'DZ-3', kind: 'dozer', type: 'Dozer · mutual aid', status: 'enroute', detail: 'Contingency line · south flank', position: pchEastEntry }, from: plus(ESC, DZ_DELAY), provenance: meas('AVL'),
    patches: [
      ...ESC.map((r) => ({ at: `${r}+${DZ_DELAY}`, rel: true, spec: { track: [...dzRoad, ...dzLine], trail: 20 } })),
      ...ESC.map((r) => ({ at: `${r}+${r1(DZ_DELAY + endT(dzRoad) + 4)}`, spec: { status: 'active', detail: 'Cutting line · south flank' } })),
    ] },
];

const presetsWUI = [
  { name: 'Overview', sub: 'full frame', target: [0, -100], range: 5600, pitch: 52, bearing: -10 },
  { name: 'Fire head', sub: 'HS-01', target: r2(headAt(80)), range: 1800, pitch: 58, bearing: 60 },
  { name: 'Hairpin', sub: 'choke point', target: r2(hairpin), range: 900, pitch: 60, bearing: 20 },
  { name: 'Projected cut', sub: 'upper Encinal', target: r2(cutRev.p), range: 1300, pitch: 58, bearing: 30 },
  { name: 'PCH junction', sub: 'Encinal / Rte 1', target: r2(junction), range: 1100, pitch: 58, bearing: -20 },
];

const evacBoard = [
  { at: 'D', data: { status: 'proposed', zones: [
    { id: 'z1', name: 'Zone 1', kind: 'Order', state: 'proposed', households: hh1, cleared: null },
    { id: 'z2', name: 'Zone 2', kind: 'Warning', state: 'proposed', households: hh2, cleared: null },
    { id: 'z3', name: 'Zone 3', kind: 'Safe assembly', state: 'proposed', households: null, cleared: null }],
    routes: [{ id: 'route-a', name: 'Route A · Encinal → PCH', status: 'Proposed', level: 'info' }, { id: 'route-b', name: 'Route B · Encinal north', status: 'Proposed alternate', level: 'muted' }],
    choke: { text: 'Hairpin · no traffic control yet', level: 'warn' }, alerts: { text: `Drafted · ${hh1 + hh2} households · not sent`, level: 'muted' } } },
  { at: '@authorize+0.2', data: { status: 'issued', zones: [{ id: 'z1', state: 'committed', cleared: 0 }, { id: 'z2', state: 'committed' }, { id: 'z3', state: 'committed' }],
    routes: [{ id: 'route-a', status: 'Open · primary', level: 'ok' }, { id: 'route-b', status: 'Open · alternate', level: 'muted' }],
    alerts: { text: `WEA ≈ ${devices} devices · reverse-911 ≈ ${lines} lines`, level: 'ok' } } },
  ...CLEAR.map(([m, pct]) => ({ at: `@authorize+${m}`, data: { zones: [{ id: 'z1', cleared: pct }], ...(m === 6 ? { choke: { text: 'SH-12 controlling · 14 veh/min', level: 'ok' } } : {}) } })),
  { at: '@answer:stall:send+8', data: { zones: [{ id: 'z1', cleared: 90 }] } },
  { at: T_OBS, data: { routes: [{ id: 'route-a', status: `Open · cut projected ${fmtT(cutRev.t)}`, level: 'warn' }] } },
  { at: '@approve+0.2', data: { routes: [{ id: 'route-a', status: 'Primary · lower canyon', level: 'warn' }, { id: 'route-b', status: 'Primary · upper canyon', level: 'ok' }], alerts: { text: `Update sent · ${devUp} devices above the cut`, level: 'ok' } } },
  { at: '@approve+10', data: { zones: [{ id: 'z1', cleared: 100 }] } },
  { at: Math.ceil(cutRev.t), data: { routes: [{ id: 'route-a', status: 'Cut above the hairpin', level: 'bad' }] } },
];

// ---- TALON: what it notices, does under standing orders, asks and proposes.
const AGENTS = [
  { id: 'recon', name: 'Recon', role: 'Drones, sensors, verification' },
  { id: 'spread', name: 'Spread', role: 'Fire behaviour, projections' },
  { id: 'egress', name: 'Egress', role: 'Zones, routes, traffic' },
  { id: 'dispatch', name: 'Dispatch', role: 'Units, run cards, mutual aid' },
  { id: 'notify', name: 'Notify', role: 'Alerts and crews' },
];
const SO_LOOK = 'SO-2 · verify detections in pre-cleared airspace';
const SO_INTEL = 'SO-4 · share incident intel with assigned units';
const e32eta = Math.round(endT(e32Out) - 2.2);
const readiness = (at) => ({ id: 'ready', agent: 'spread', at, level: 'feed', kind: 'note', title: 'Red Flag watch: evacuation playbooks are ready',
  body: `Red Flag Warning until 18:00. I re-ran the playbooks for ${[zone1, zone2, zone3].filter((z) => z.length).length} zones against tonight's forecast (ENE 14 G24, RH 12%). Upper Encinal has one road out to the south; the north exit is Mulholland Hwy.`,
  basis: 'TALON egress model · NWS forecast 03:10', milestone: 'Red Flag watch' });
const prepos = (at, until) => ({ id: 'prepos', agent: 'dispatch', at, until, level: 'ask', kind: 'ask', title: 'Pre-position E-31 at the Encinal junction?',
  body: `For the Red Flag window. It cuts E-31's response to Zone 1 from ${Math.round(endT(e31FromFar))} to ${Math.round(endT(e31FromJ))} min. E-31 is idle on PCH east.`,
  authority: 'operator', options: [{ id: 'yes', label: 'Pre-position E-31', recommended: true }, { id: 'no', label: 'Not now' }],
  why: [`Response to Zone 1: ${Math.round(endT(e31FromFar))} min from PCH east, ${Math.round(endT(e31FromJ))} min from the junction`, 'Red Flag Warning in effect until 18:00', 'No other engine covers the canyon mouth'],
  evidence: [{ label: 'E-31', unit: 'E-31' }, { label: 'Encinal junction', point: standbyE31 }], dock: ['fleet'] });

const talonWUI = {
  agents: AGENTS,
  review: { detect: 'detect', confirm: 'confirm', plan: 'plan', order: 'order', correction: 'correction', baseline: { minutes: 38, label: 'Manual baseline', source: 'FlytBase brief, “The Old Way”' } },
  items: [
    readiness(-30),
    prepos(-28, -5),
    { id: 'sweep1', agent: 'recon', at: -24, level: 'log', kind: 'status', title: 'FT-01 sweep: sectors 1–3 clear', body: 'No heat above 60 °C. S-7 mast nominal.' },
    { id: 'sweep2', agent: 'recon', at: -12, level: 'log', kind: 'status', title: 'FT-01 sweep: sectors 4–6 clear' },
    { id: 'detect', agent: 'recon', at: 0, until: 2, level: 'interrupt', kind: 'ask', title: 'Heat detection on Trancas ridge', milestone: 'Heat detection',
      body: `S-7 thermal mast · 71% match to a flame signature · ${fmtLL(detection)}. FT-01 is on its way to look, on scene in ${mmss(endT(ft01Out))}.`,
      authority: 'operator', options: [{ id: 'wait', label: 'Wait for FT-01', recommended: true }, { id: 'confirm', label: 'Confirm now' }, { id: 'dismiss', label: 'Dismiss as false alarm' }],
      why: ['71% match is below my confirm threshold (85%)', `FT-01 can see it in ${mmss(endT(ft01Out))}; confirming blind costs nothing to wait for`, `Nearest home is ${nearestHome(detection)} m away`],
      evidence: [{ label: 'Detection', point: detection, layers: ['detection'] }, { label: 'FT-01', unit: 'FT-01' }, { label: 'S-7 mast', point: s7, layers: ['sensor-s7'] }],
      dock: ['feed'], feed: { drone: 'FT-01', sensor: 'ir' } },
    { id: 'retask', agent: 'recon', at: 0.05, level: 'feed', kind: 'action', authority: 'standing', standing: SO_LOOK, title: 'FT-01 retasked to the detection', body: 'Airspace box TRANCAS-2 is pre-cleared; no manned aircraft within 5 nm. Sweep paused.', busy: 2 },
    { id: 'reraise_dismiss', agent: 'recon', at: 2, when: '@answer:detect:dismiss', level: 'feed', kind: 'note', title: 'The detection you dismissed is real',
      body: 'FT-01 IR shows active flame at 412 °C. Your dismissal stays on the record; I have opened the incident on the new evidence and copied the Regional Duty Supervisor.' },
    { id: 'confirm', agent: 'recon', at: 2, level: 'feed', kind: 'note', milestone: 'Confirmed', title: 'Confirmed: active fire',
      body: `FT-01 IR: flame front, 412 °C core, about ${r1(acresAt(FIELD.data, 2))} ac, ${nearestHome(headAt(2))} m from the nearest home and moving WSW with the wind.`, evidence: [{ label: 'Fire', point: detection }] },
    { id: 'runcard', agent: 'dispatch', at: 2.2, level: 'feed', kind: 'action', authority: 'standing', standing: 'Run card ENC-H · Red Flag dispatch level', title: 'E-32 dispatched', body: `From Trancas Canyon, ETA ${e32eta} min.`, busy: e32eta, evidence: [{ label: 'E-32', unit: 'E-32' }] },
    { id: 'intel1', agent: 'notify', at: 2.4, level: 'log', kind: 'action', authority: 'standing', standing: SO_INTEL, title: 'Intel package sent to E-32', body: 'GPS, IR still, wind and approach via Trancas Canyon Rd.' },
    { id: 'ft02', agent: 'recon', at: 4, level: 'feed', kind: 'action', authority: 'standing', standing: SO_LOOK, title: 'FT-02 launched from dock D-2', body: 'Mapping the perimeter on a 260 m orbit. FT-01 holds the head.', busy: 6, evidence: [{ label: 'FT-02', unit: 'FT-02' }] },
    { id: 'projection', agent: 'spread', at: 4.2, level: 'feed', kind: 'note', milestone: 'Projection', title: `Projection: west-southwest at ${ROS} m/min`,
      body: `${r1(acresAt(FIELD.data, 4))} ac now. Within 2 hours it reaches ${nIn(4, 120)} homes, the first at ${fmtT(firstHome)}, and Encinal Canyon Rd at ${fmtT(cut.t)}.`, confidence: 'moderate',
      basis: 'Spread model v3 (Rothermel + wind correction) · FT-01 IR perimeter 1 min old · RAWS 4 min old · LANDFIRE fuels',
      evidence: [{ label: 'Projection', layers: ['fire'], point: r2(headAt(64)) }], dock: ['growth'] },
    { id: 'escalate', agent: 'dispatch', at: 4.6, until: 14.6, hold: 5.6, level: 'ask', kind: 'ask', milestone: 'Escalation', title: 'Escalate to Type 3 and request mutual aid?',
      body: `Initial attack can't hold the head at ${ROS} m/min. Within 2 hours it reaches ${nIn(4.6, 120)} homes and the only road out of the upper canyon. Request DZ-3 and two engines from LA County (DZ-3 on scene in ~${Math.round(dzArrive)} min).`,
      authority: 'operator', options: [{ id: 'escalate', label: 'Escalate · request DZ-3 + 2 engines', recommended: true }, { id: 'hold', label: 'Hold at initial attack' }],
      why: [`Head spread ${ROS} m/min under ENE 22 G38 mph`, `${nIn(4.6, 120)} homes inside the 2-hour projection; the first burns at ${fmtT(firstHome)}`, 'E-32 can hold a flank, not the head', `Mutual aid takes ~${Math.round(dzArrive)} min; asking later adds that delay again`],
      evidence: [{ label: `${nIn(4.6, 120)} homes in 2 h`, layers: ['fire'], point: r2(headAt(60)) }, { label: 'E-32', unit: 'E-32' }], dock: ['growth'] },
    { id: 'escalate_rr', agent: 'dispatch', at: 'escalate+0', when: '@answer:escalate:hold', level: 'ask', kind: 'ask', title: 'Re-raised: escalation to Type 3',
      reraise: { of: 'escalate', to: 'Regional Duty Supervisor', newEvidence: [`FT-02 perimeter (T+0:08): head now ${ROS + 3} m/min, faster than at your decision`, `2-hour projection grew to ${nIn(9, 120)} homes`, 'E-32 reports spot fires across Trancas Cyn Rd'] },
      body: 'Only what is new since you held. Routed to the Regional Duty Supervisor; you are copied.', authority: 'operator',
      options: [{ id: 'escalate', label: 'Escalate', recommended: true }, { id: 'hold', label: 'Uphold the hold' }] },
    { id: 'conflict', agent: 'recon', at: 4.4, until: 12, level: 'ask', kind: 'ask', title: 'Two sources disagree on the heat',
      body: `S-7 and FT-01 IR read a flame front at the detection. The county registry lists a permitted burn plot 330 m north of it — unlit when FT-01 last passed. One of the two is stale.`,
      authority: 'operator', options: [{ id: 'verify', label: 'FT-01 EO look at the plot', recommended: true }, { id: 'proceed', label: 'Proceed on live IR' }],
      why: ['Live IR from two sensors says wildfire; the registry entry is from this morning', 'An EO look takes about 40 seconds — FT-01 is 300 m away', 'If it is the permitted plot we stand the engines down; if not, the registry is stale and the conflict rides with the report'],
      evidence: [{ label: 'Registered plot', layers: ['burn-plot'], point: r2(plotP) }, { label: 'Detection', point: detection, layers: ['detection'] }], dock: ['feed'] },
    { id: 'conflict-ok', agent: 'recon', at: '@answer:conflict:verify+1.2', level: 'feed', kind: 'note', title: 'Resolved: wildfire — the registry entry is stale',
      body: 'FT-01 EO: the plot is unlit, and the heat is outside its bounds and moving away from it. The discrepancy is resolved and rides with the report.' },
    { id: 'conflict-proceed', agent: 'recon', at: '@answer:conflict:proceed+0.1', level: 'feed', kind: 'note', title: 'Proceeding on live IR',
      body: 'Two live sensors against one stale registry entry. The discrepancy stays open on the record and rides with the report.' },
    { id: 'conflict-open', agent: 'recon', at: 12, unless: '@answer:conflict', level: 'feed', kind: 'note', title: 'Registry conflict unresolved — proceeding on live IR',
      body: 'The window for the EO look closed unanswered. Two live sensors outweigh the registry entry; the discrepancy stays on the record.' },
    { id: 'escalated', agent: 'dispatch', at: plus(ESC, 0.1), level: 'feed', kind: 'note', milestone: 'Type 3', title: 'Type 3 · mutual aid requested', body: `DZ-3 and two engines from LA County Fire. DZ-3 on scene in ~${Math.round(dzArrive)} min.` },
    { id: 'plan', agent: 'egress', at: 6, until: '@authorize', hold: 7.8, level: 'ask', kind: 'proposal', milestone: 'Plan P-1', title: 'Plan P-1: evacuate Zone 1, warn Zone 2',
      body: 'Adapted from playbook ENC-3 (pre-computed at T−0:42). Two changes: the wind is 8° more easterly, and Zone 2 is wider by 6 homes.',
      authority: 'operator', confidence: 'moderate', basis: 'TALON egress model · road capacity 14 veh/min one lane · 1.6 vehicles per home',
      compare: { cols: [{ id: 'a', label: 'COA A', sub: 'All south to PCH', route: 'route-a', recommended: true }, { id: 'b', label: 'COA B', sub: 'Upper canyon north', route: 'route-b' }],
        rows: [{ label: 'Clear Zone 1', values: [`${clearA} min`, `${clearB} min`], best: 0 }, { label: 'Through the hairpin', values: [`${hh1} homes`, `${hh1 - upCanyon} homes`], best: 1 },
          { label: 'Drive to safety', values: [`${(southLen / 1000).toFixed(1)} km`, `${(northLen / 1000).toFixed(1)} km north`] }, { label: 'Smoke exposure', values: ['Low · away from the head', 'Upper canyon drives the flank'], best: 0 }] },
      gate: { label: 'ORDER MANDATORY EVACUATION · ZONE 1 + WARNING · ZONE 2', needs: 'Your authorization', expires: 16, reach: `${hh1} + ${hh2} households · WEA ≈ ${devices} devices · reverse-911 ≈ ${lines} lines`, check: 'Alert geofence matches the zone polygons, no spill beyond 150 m', onExpire: 'Nothing is sent. I escalate to the Regional Duty Supervisor and keep the plan current.' },
      options: [{ id: 'authorize', label: 'Authorize P-1', recommended: true, effect: { kind: 'authorize' } }, { id: 'swap', label: 'Switch route', toggle: true, effect: { kind: 'route', route: 'route-b' } }, { id: 'reject', label: 'Reject plan' }],
      why: [`Zone 1 (${hh1} homes) is in the fire's path; the first home is reached at ${fmtT(firstHome)}`, 'Ordering now uses the time the fire gives us; the brief\'s manual process starts evacuating 38 min after the alert', `Encinal Cyn Rd stays open until ${fmtT(cut.t)}, far longer than the ${clearA} min to clear Zone 1`, 'COA A keeps everyone on one known road with SH-12 at the hairpin; COA B sends the upper canyon along the flank', 'Zone 2 is outside the 2-hour projection: a warning, not an order'],
      evidence: [{ label: 'Zone 1', layers: ['evac-order', 'zone-labels'], point: z1c }, { label: 'Route A', layers: ['route-a', 'route-labels'] }, { label: 'Hairpin', layers: ['choke-1', 'choke-1-marker'], point: r2(hairpin) }], dock: ['evac'] },
    { id: 'alertdraft', agent: 'notify', at: 6.1, level: 'log', kind: 'note', title: 'Alert drafted, waiting on the order', body: '“MANDATORY EVACUATION: Encinal Canyon. Leave now. Take Encinal Cyn Rd south to PCH, then west.”' },
    { id: 'expired', agent: 'egress', at: 16, unless: '@authorize', level: 'interrupt', kind: 'note', title: 'Plan P-1 lapsed without a decision', body: 'Nothing was sent. Silence is not approval: I escalated to the Regional Duty Supervisor and I keep the plan current.' },
    { id: 'order', agent: 'notify', at: '@authorize+0.2', level: 'feed', kind: 'note', milestone: 'Order issued', title: 'Evacuation order issued on your authorization', body: `WEA to ≈ ${devices} devices, reverse-911 to ≈ ${lines} lines. Zone 2 warned.` },
    { id: 'executing', agent: 'dispatch', at: '@authorize+0.4', level: 'feed', kind: 'action', authority: 'standing', standing: 'Plan P-1 (authorized)', title: 'Executing P-1', body: 'SH-12 to the hairpin, E-31 to Zone 1 structure protection, FT-03 out of dock D-1 with speaker and strobes over Zone 1.', busy: 4, evidence: [{ label: 'FT-03', unit: 'FT-03' }, { label: 'SH-12', unit: 'SH-12' }] },
    { id: 'intel2', agent: 'notify', at: '@authorize+0.6', level: 'log', kind: 'action', authority: 'standing', standing: SO_INTEL, title: 'Intel package sent to all units', body: 'IR perimeter, projection, egress Route A, traffic control at the hairpin.' },
    ...CLEAR.map(([m, pct]) => ({ id: `clear${m}`, agent: 'egress', at: `@authorize+${m}`, level: 'log', kind: 'status', title: `Zone 1 · ${pct}% cleared`, body: m === 6 ? 'SH-12 has traffic flowing at the hairpin, 14 vehicles/min.' : undefined })),
    { id: 'dz3', agent: 'dispatch', at: plus(ESC, dzArrive), level: 'feed', kind: 'note', title: 'DZ-3 on scene', body: 'Cutting the contingency line on the south flank.', evidence: [{ label: 'DZ-3', unit: 'DZ-3' }] },
    { id: 'modelcheck', agent: 'spread', at: 60, level: 'log', kind: 'status', title: 'Model check passed', body: 'FT-02 perimeter matches the projection within 40 m.' },
    { id: 'satloss', agent: 'spread', at: 50, level: 'feed', kind: 'note', title: 'GOES-West IR feed lost', confidence: 'moderate',
      body: 'Fusion continues on FT-01/FT-02 IR and the RAWS. Projection confidence drops until the next FT-02 perimeter pass (~6 min). Nothing here needs you; I am telling you because the map is one sensor poorer.' },
    { id: 'battery', agent: 'recon', at: 74, until: 82, when: '@authorize', level: 'ask', kind: 'ask', title: 'FT-01 at 14% — hand the head watch to FT-02?',
      body: 'FT-02 is at 58% on the perimeter orbit 400 m south. A handover takes about 40 seconds; below 10% FT-01 loses the gimbal on the flight home.',
      authority: 'operator', options: [{ id: 'handover', label: 'Hand over to FT-02', recommended: true }, { id: 'hold', label: 'Keep FT-01 up 20 min' }],
      why: ['FT-01 battery 14% and falling; the return flight needs 8%', 'FT-02 is on station with the IR payload already warm', 'A blind gap at the head is what the spot fire taught us to avoid'],
      evidence: [{ label: 'FT-01', unit: 'FT-01' }, { label: 'FT-02', unit: 'FT-02' }], dock: ['fleet', 'feed'] },
    { id: 'battery-done', agent: 'recon', at: '@answer:battery:handover+0.5', level: 'feed', kind: 'action', title: 'Head watch handed to FT-02',
      body: 'FT-01 returning to dock D-2, 34% on arrival. No gap at the head: FT-02 had it before FT-01 turned.', evidence: [{ label: 'FT-02', unit: 'FT-02' }] },
    { id: 'battery-fail', agent: 'recon', at: '@answer:battery:hold+18', level: 'feed', kind: 'action', authority: 'standing', standing: 'SO-3 · failsafe return below 8% battery',
      title: 'FT-01 failsafe return — battery 6%',
      body: 'Pre-authorized safety return; the gimbal goes dark on the way to the dock. The head is uncovered until FT-02 can shift its orbit — that gap is on the record.' },
    { id: 'stall', agent: 'egress', at: '@authorize+64', until: '@authorize+74', level: 'ask', kind: 'ask', title: 'Zone 1 has stalled at 84%',
      body: `${occupied} households in the upper canyon haven't left (Sheriff door-to-door). Send FT-03 to broadcast the order over them?`, authority: 'operator',
      options: [{ id: 'send', label: 'Send FT-03 · speaker + strobes', recommended: true }, { id: 'no', label: 'Leave it to the Sheriff' }],
      why: ['Clearing has been flat for 12 min', 'Door-to-door reaches 2 homes per 5 min on that road', 'A broadcast reaches every home on the canyon road at once'],
      evidence: [{ label: 'Upper canyon', point: upperMid }, { label: 'FT-03', unit: 'FT-03' }], dock: ['evac'] },
    { id: 'correction', agent: 'spread', at: T_OBS, level: 'interrupt', kind: 'correction', mood: 'sheepish', milestone: 'Projection corrected', metric: { errorMin: ERR },
      title: 'I was wrong about Encinal Canyon Rd',
      body: `FT-02 IR found a spot fire ${spotAhead} m ahead of the front. I had the fire reaching the road at ${fmtT(cut.t)}; it now reaches it at ${fmtT(cutRev.t)}, ${ERR} min earlier.`, confidence: 'moderate',
      why: [`Spot fire at ${fmtLL(spot)}, 760 °C, ignited around ${fmtT(T_SPOT)}`, `Embers carried ${spotAhead} m on 38 mph gusts`, 'My model under-weights ember spotting above 35 mph; I raised the spotting term for this incident', `${upstream} homes are above the new cut point`],
      evidence: [{ label: 'Spot fire', point: spot, layers: ['spot', 'fire-rev'] }, { label: `New cut · ${fmtT(cutRev.t)}`, point: r2(cutRev.p), layers: ['cut-marker', 'route-a-cut'] }, { label: `Earlier · ${fmtT(cut.t)}`, point: r2(cut.p), layers: ['cut-prev'] }],
      dock: ['feed', 'evac'], feed: { drone: 'FT-02', sensor: 'ir' } },
    { id: 'draft', agent: 'egress', at: T_G, until: ['@approve', '@reject', Math.round(cutRev.t - 8)], when: '@authorize', hold: T_G + 2.8, level: 'ask', kind: 'proposal', milestone: 'Draft: Route B',
      title: 'Draft: send the upper canyon north',
      body: `${occupied} households above the cut are still there. Route A closes at ${fmtT(cutRev.t)}. Route B runs north on Encinal to Mulholland Hwy: ${(northLen / 1000).toFixed(1)} km, ${Math.round(northLen / 9 / 60)} min, away from the head.`,
      authority: 'operator', confidence: 'moderate',
      gate: { label: 'UPDATE ORDER · UPPER CANYON EGRESS NORTH', needs: 'Your approval', expires: Math.round(cutRev.t - 8), reach: `WEA to ≈ ${devUp} devices above the cut`, onExpire: 'The committed plan stays. I escalate to the Regional Duty Supervisor.' },
      options: [{ id: 'approve', label: 'Approve draft', recommended: true, effect: { kind: 'approve' } }, { id: 'reject', label: 'Reject · keep Route A', effect: { kind: 'reject' } }],
      why: [`Route A closes above the hairpin at ${fmtT(cutRev.t)}`, `${occupied} households still in the upper canyon`, 'Driving north on Route B moves away from the head; south would drive into it', 'The lower canyon keeps Route A'],
      evidence: [{ label: 'Route B draft', layers: ['draft:route-b', 'draft:marker', 'route-labels'], point: r2(routeBNorth[Math.floor(routeBNorth.length * 0.6)]) }, { label: 'Cut', layers: ['cut-marker', 'route-a-cut'], point: r2(cutRev.p) }], dock: ['evac'] },
    { id: 'revised', agent: 'notify', at: '@approve+0.2', level: 'feed', kind: 'note', milestone: 'Revision approved', title: 'Order updated: the upper canyon goes north', body: `WEA to ≈ ${devUp} devices: “Upper Encinal: go NORTH to Mulholland. The road south is closing.” FT-03 is guiding north.` },
    { id: 'kept', agent: 'egress', at: '@reject+0.1', level: 'feed', kind: 'note', title: 'Draft rejected. Route A stays primary', body: `Your call is on the record. Route A closes at ${fmtT(cutRev.t)}; the ${occupied} households must be past the cut point before then.` },
    { id: 'cut', agent: 'egress', at: Math.ceil(cutRev.t), level: 'interrupt', kind: 'note', milestone: 'Road cut', title: 'Encinal Canyon Rd is cut', body: 'Fire is on the road at the projected point. Route A is closed above the hairpin.', evidence: [{ label: 'Cut', point: r2(cutRev.p), layers: ['cut-marker'] }] },
    { id: 'reviewready', agent: 'notify', at: 136, level: 'feed', kind: 'note', title: 'The incident log is ready for review', body: 'Every recommendation, decision, dissent and standing-order action is on the record.' },
  ],
};
// A re-raise follows a hold by 4 minutes of new evidence.
talonWUI.items.find((i) => i.id === 'escalate_rr').at = '@answer:escalate:hold+4';

const wui = {
  schema: 'tte.situation/1', id: 'wui-breakout',
  meta: { title: 'Encinal Canyon', subtitle: 'WUI breakout · training exercise', coords: scenario.meta.coords, size: scenario.meta.size, attribution: ATTRIB, disclaimer: DISCLAIMER, epoch: EPOCH, tz: 'PST', feedDrone: 'FT-01' },
  clock: { start: -30, end: 140 },
  phases: phasesWUI, layers: layersWUI, units: unitsWUI,
  routes: { defs: routeDefs, primary: 'route-a', committedAt: '@authorize' },
  script: [
    // TALON's own entry: a draft is a proposal, never an execution.
    { at: T_G, kind: 'draft', route: 'route-b', by: 'talon', when: '@authorize', note: `Upper canyon (${occupied} households) north before ${fmtT(cutRev.t)}` },
    // Second authority (exercise inject): the Regional Duty Supervisor rules on a re-raise.
    { at: 4.6 + 4 + 3, kind: 'answer', item: 'escalate_rr', option: 'escalate', by: 'supervisor', when: '@answer:escalate:hold' },
    // Exercise autopilot (harness only): the operator role, for hands-free demo runs.
    { at: -27, kind: 'answer', item: 'prepos', option: 'yes' },
    { at: 0.6, kind: 'answer', item: 'detect', option: 'wait' },
    { at: 5.0, kind: 'answer', item: 'conflict', option: 'verify' },
    { at: 5.3, kind: 'answer', item: 'escalate', option: 'escalate' },
    { at: 7.6, kind: 'answer', item: 'plan', option: 'authorize' }, { at: 7.6, kind: 'authorize' },
    { at: 7.6 + 64.8, kind: 'answer', item: 'stall', option: 'send' },
    { at: 75, kind: 'answer', item: 'battery', option: 'handover' },
    { at: T_G + 2.4, kind: 'answer', item: 'draft', option: 'approve' }, { at: T_G + 2.4, kind: 'approve' },
  ],
  telemetry: telemetryWUI, presets: presetsWUI, boards: { evac: evacBoard }, talon: talonWUI,
};
// The supervisor's ruling comes 3 minutes after the re-raise, whenever the hold was.
wui.script[1] = { at: 0, atRef: '@answer:escalate:hold+7', kind: 'answer', item: 'escalate_rr', option: 'escalate', by: 'supervisor' };

// ---- small incident: one detection, one engine, one crew, a short line. No perimeter.
const sDet = [369.4, 166.2];
const sRoadP = r2(drivable.point(drivable.nearest(sDet)));
const lineArc = [];
for (let a = -70; a <= 70; a += 14) { const rr = 55, th = (200 + a) * Math.PI / 180; lineArc.push(r2([sDet[0] + Math.sin(th) * rr, sDet[1] + Math.cos(th) * rr])); }
const e32Small = drive(trancasMouth, sRoadP, 2.2, 10);
const crewWalk = [{ t: r1(endT(e32Small) + 2), p: sRoadP }, { t: r1(endT(e32Small) + 9), p: lineArc[0] }, ...lineArc.slice(1).map((p, i) => ({ t: r1(endT(e32Small) + 11 + i * 1.6), p }))];
const T_SF = Math.ceil(endT(e32Small) + 4);
const small = {
  schema: 'tte.situation/1', id: 'small-incident',
  meta: { title: 'Encinal Canyon', subtitle: 'Small incident · training exercise', coords: scenario.meta.coords, size: scenario.meta.size, attribution: ATTRIB, disclaimer: DISCLAIMER, epoch: EPOCH, tz: 'PST', feedDrone: 'FT-01' },
  clock: { start: -10, end: T_SF + 26 },
  phases: [
    { id: 'A', name: 'Standby', t: -10, job: 'Show the place and the assets.', camera: { target: [0, -100], range: 5600, pitch: 52, bearing: -10 }, dock: ['fleet', 'weather', 'events'] },
    { id: 'B', name: 'Detection', t: 0, job: 'Show exactly one thing, and where it is.', camera: { target: sDet, range: 1500, pitch: 56, bearing: 200 }, feed: { drone: 'FT-01', sensor: 'ir' }, dock: ['feed', 'fleet'] },
    { id: 'F', name: 'Operations', t: T_SF, job: 'Show where everyone is.', camera: { target: [sDet[0] - 60, sDet[1] - 60], range: 1100, pitch: 58, bearing: 210 }, dock: ['fleet', 'feed', 'events'] },
  ],
  layers: [
    { id: 'labels', group: 'labels', name: 'Place names', provenance: meas('OpenStreetMap'), spec: { type: 'labels', items: placeLabels } },
    station('dock-1', dock1, 'DOCK D-1', 'FT-03 ready'), station('dock-2', dock2, 'DOCK D-2', 'FT-02 ready'),
    { id: 'detection', group: 'detections', name: 'Heat detection', from: 'B', provenance: meas('FT-01 LWIR'),
      spec: { type: 'marker', position: sDet, icon: 'detection', tone: 'warn', pulse: true, title: 'HEAT DETECTION · UNCONFIRMED', detail: `FT-01 LWIR · 64% · ${fmtLL(sDet)}` },
      patches: [{ at: 2, spec: { tone: 'fire', title: 'CONFIRMED · SMOLDERING', detail: `FT-01 IR · 236 °C · not sized` } }, { at: 'F', spec: { pulse: false, detail: 'E-32 + C-5 on scene · not sized' } }] },
    { id: 'hand-line', group: 'suppression', name: 'Hand line', from: 'F', provenance: auth('Engine captain (IC)'), spec: { type: 'line', drape: true, points: lineArc, color: '#D9B36C', width: 5, style: 'dashed', dash: [10, 6] } },
  ],
  units: [
    { spec: { id: 'FT-01', kind: 'drone', name: 'Kite', altitudeFt: 1200, status: 'active', detail: 'Canyon sweep', position: sweep[0], patrol: { path: sweep, speedMps: 22 } }, provenance: meas('Telemetry'),
      info: [{ at: -10, data: { battery: 74, role: 'Patrol', payload: 'EO/IR gimbal' } }],
      patches: [{ at: 'B', spec: { patrol: null, position: standoff(sDet, 20, 260), altitudeFt: 400, orbitRadius: 90, orbitPeriodS: 60, detail: 'Orbit · detection', gimbal: { target: sDet, tempC: 236, targetId: 'DET-2' } } },
        { at: '@answer:release:release', spec: { patrol: { path: sweep, speedMps: 22 }, altitudeFt: 1200, orbitRadius: 0, gimbal: null, detail: 'Canyon sweep (released)' } }] },
    { spec: { id: 'E-32', kind: 'engine', type: 'Type 3', status: 'standby', detail: 'Available · Trancas', position: trancasMouth }, provenance: meas('AVL'),
      patches: [{ at: 2.2, spec: { status: 'enroute', detail: 'Responding · coastal slope', track: e32Small, trail: 10 } }, { at: Math.ceil(endT(e32Small)), spec: { status: 'active', detail: 'On scene · IC' } }] },
    { spec: { id: 'C-5', kind: 'crew', type: 'Hand crew', status: 'enroute', detail: 'Hand line · head of the spot', position: sRoadP, track: crewWalk, trail: 8 }, from: Math.floor(endT(e32Small) + 2), provenance: meas('AVL'),
      patches: [{ at: Math.ceil(endT(e32Small) + 9), spec: { status: 'active' } }] },
    { spec: { id: 'E-31', kind: 'engine', type: 'Type 3', status: 'standby', detail: 'Available · Encinal junction', position: standbyE31 }, provenance: meas('AVL') },
    { spec: { id: 'FT-02', kind: 'drone', name: 'Hawk', altitudeFt: 0, status: 'standby', detail: 'Docked · D-2', position: dock2 }, provenance: meas('Telemetry'), info: [{ at: -10, data: { battery: 100, role: 'Perimeter mapping' } }] },
  ],
  telemetry: [
    { at: 'A', values: { status: { value: 'Normal fire weather', level: 'ok', basis: 'authored', source: 'NWS (exercise inject)' }, wind: W_('SW 8 mph', 45), rh: W_('34%'), temp: W_('58°F'), fuel: W_('1-h 11% · ERC 41'), incident: { value: 'No incident', level: 'ok', basis: 'authored', source: 'CAD' } } },
    { at: 'B', values: { incident: { value: 'Detection · unconfirmed', level: 'warn', basis: 'measured', source: 'FT-01 LWIR' } } },
    { at: 2, values: { incident: { value: 'Type 5 · initial attack', level: 'warn', basis: 'measured', source: 'FT-01 IR' } } },
  ],
  presets: [{ name: 'Overview', sub: 'full frame', target: [0, -100], range: 5600, pitch: 52, bearing: -10 }, { name: 'Detection', sub: 'spot fire', target: sDet, range: 900, pitch: 58, bearing: 200 }],
  script: [{ at: 0.5, kind: 'answer', item: 'detect', option: 'wait' }, { at: T_SF + 2.5, kind: 'answer', item: 'release', option: 'release' }],
  talon: { agents: AGENTS, review: { detect: 'detect', confirm: 'confirm' }, items: [
    { id: 'ready', agent: 'spread', at: -10, level: 'feed', kind: 'note', title: 'Normal fire weather', body: 'SW 8 mph, RH 34%. Playbooks current. FT-01 is on its canyon sweep.' },
    { id: 'detect', agent: 'recon', at: 0, until: 2, level: 'ask', kind: 'ask', milestone: 'Heat detection', title: 'Heat on the coastal slope', body: `FT-01 LWIR · 64% match · ${fmtLL(sDet)}. FT-01 is right there; it is dropping to 400 ft for a closer look.`, authority: 'operator',
      options: [{ id: 'wait', label: 'Wait for FT-01', recommended: true }, { id: 'confirm', label: 'Confirm now' }, { id: 'dismiss', label: 'Dismiss as false alarm' }],
      why: ['64% match is below my confirm threshold (85%)', 'FT-01 is overhead; confirmation takes under two minutes'], evidence: [{ label: 'Detection', point: sDet, layers: ['detection'] }, { label: 'FT-01', unit: 'FT-01' }], dock: ['feed'], feed: { drone: 'FT-01', sensor: 'ir' } },
    { id: 'look', agent: 'recon', at: 0.05, level: 'feed', kind: 'action', authority: 'standing', standing: SO_LOOK, title: 'FT-01 orbiting the detection', body: 'Pre-cleared airspace, 400 ft AGL.', busy: 2 },
    { id: 'confirm', agent: 'recon', at: 2, level: 'feed', kind: 'note', milestone: 'Confirmed', title: 'Confirmed: smoldering spot fire', body: `236 °C, well under a tenth of an acre, ${nearestHome(sDet)} m from the nearest home, backing downslope away from it.` },
    { id: 'runcard', agent: 'dispatch', at: 2.2, level: 'feed', kind: 'action', authority: 'standing', standing: 'Run card ENC-N · normal dispatch level', title: 'E-32 and crew C-5 dispatched', body: `ETA ${Math.round(endT(e32Small) - 2.2)} min.`, evidence: [{ label: 'E-32', unit: 'E-32' }] },
    { id: 'noescalate', agent: 'spread', at: 2.6, level: 'feed', kind: 'note', milestone: 'Type 5', title: 'No escalation, no projection', confidence: 'high', body: 'Too small to size. Light wind, the slope works against it, no homes in reach. I am not drawing a projection: there is nothing honest to project.' },
    { id: 'onscene', agent: 'dispatch', at: Math.ceil(endT(e32Small)), level: 'feed', kind: 'note', title: 'E-32 on scene · the captain is IC' },
    { id: 'release', agent: 'recon', at: T_SF + 1, until: T_SF + 20, level: 'ask', kind: 'ask', title: 'Release FT-01 back to its sweep?', body: 'E-32 has eyes on the fire and C-5 is cutting line. FT-01 battery 54%.', authority: 'operator',
      options: [{ id: 'release', label: 'Release FT-01', recommended: true }, { id: 'keep', label: 'Keep it overhead 15 min' }], why: ['The IC has visual on the fire', 'Two canyon sectors have gone unswept for 12 minutes'], evidence: [{ label: 'FT-01', unit: 'FT-01' }] },
    { id: 'contained', agent: 'dispatch', at: T_SF + 24, level: 'feed', kind: 'note', milestone: 'Contained', title: 'Line around it (IC report)', body: 'Hand line complete. E-32 mopping up.' },
  ] },
};

// ---- standby: the place and the assets, and TALON doing its homework.
const standby = {
  schema: 'tte.situation/1', id: 'standby',
  meta: { title: 'Encinal Canyon', subtitle: 'Standby · no incident', coords: scenario.meta.coords, size: scenario.meta.size, attribution: ATTRIB, disclaimer: DISCLAIMER, epoch: EPOCH, tz: 'PST', feedDrone: 'FT-01' },
  clock: { start: 0, end: 30 },
  phases: [{ id: 'A', name: 'Standby', t: 0, job: 'Show the place and the assets.', camera: { target: [0, -100], range: 5600, pitch: 52, bearing: -10 }, dock: ['fleet', 'weather', 'events'] }],
  layers: layersWUI.filter((l) => ['labels', 'dock-1', 'dock-2', 'sensor-s7'].includes(l.id)),
  units: unitsWUI.filter((u) => u.from === undefined).map((u) => ({ spec: u.spec, provenance: u.provenance, info: u.info, patches: (u.patches ?? []).filter((p) => String(p.at).startsWith('@answer:prepos')) })),
  telemetry: [{ at: 'A', values: telemetryWUI[0].values }],
  presets: presetsWUI.filter((p) => ['Overview', 'Hairpin', 'PCH junction'].includes(p.name)),
  script: [{ at: 1.5, kind: 'answer', item: 'prepos', option: 'yes' }],
  talon: { agents: AGENTS, items: [readiness(0), prepos(1, 25),
    { id: 'sweep1', agent: 'recon', at: 8, level: 'log', kind: 'status', title: 'FT-01 sweep: sectors 1–3 clear' },
    { id: 'sweep2', agent: 'recon', at: 18, level: 'log', kind: 'status', title: 'FT-01 sweep: sectors 4–6 clear' },
    { id: 'docks', agent: 'recon', at: 2, level: 'log', kind: 'status', title: 'Docks D-1 and D-2: FT-02 and FT-03 ready, 100%' }] },
};

// ============================================================================
// Journey v2 (2026-10-26 owner ruling): two arcs the linear script never had.
//   contain   a containable fire: NO evacuation — but the authority is STILL notified,
//             because the report is what queues the mutual-aid dozer that makes containment possible.
//   falsepos  a false positive: the dismissal is the RIGHT call, and the save is the story.
// ============================================================================

// ---- contain: a smaller fire running WSW into the backcountry, away from the canyon homes.
const head2 = [ignition[0] - 1050, ignition[1] - 520];
const fire2 = simulateFireRun(ignition, head2, 777, { width: 0.2 });
const FIELD2 = fireArrivalField(fire2, ignition, frame, { cols: FIELD.cols, rows: FIELD.rows, tIgnition: T_IGN, tRing: T_RING, cap: 900 });
const f2 = sampler(FIELD2.data);
const axis2 = dist(ignition, fire2.tip);
const ax2 = [(fire2.tip[0] - ignition[0]) / axis2, (fire2.tip[1] - ignition[1]) / axis2];
const head2At = (t) => { let prev = ignition; for (let d = 10; d < 4000; d += 10) { const p = [ignition[0] + ax2[0] * d, ignition[1] + ax2[1] * d]; if (f2(p[0], p[1]) > t) return prev; prev = p; } return prev; };
const detectionC = r2(head2At(0.5));
const ROS2 = Math.round(axis2 / (T_RING - T_IGN));
const acres2 = (t) => acresAt(FIELD2.data, t);
const homesC = (t, h) => centroids.filter((c) => { const a = f2(c[0], c[1]); return a > t && a <= t + h; }).length;
const warnC = clusters(centroids.map((_, k) => k).filter((k) => ringD(centroids[k], fire2.ring) < 750)).map((g) => buffer(hull(g), 60));
const hhC = centroids.filter((c) => inRings(c, warnC)).length;
// The flank line, the dozer that cuts it, and the field clamped where the line held.
const sv2 = [ax2[1], -ax2[0]];
const dozer2 = [];
for (let uu = 0.1; uu <= 0.62; uu += 0.025) {
  const b = [ignition[0] + ax2[0] * axis2 * uu, ignition[1] + ax2[1] * axis2 * uu];
  let dd = 0;
  for (let d = 0; d < 2000; d += 10) { if (f2(b[0] + sv2[0] * d, b[1] + sv2[1] * d) > 140) { dd = d; break; } }
  dozer2.push(r2([b[0] + sv2[0] * (dd + 110), b[1] + sv2[1] * (dd + 110)]));
}
const anchorC = r2(dozer2[Math.floor(dozer2.length * 0.4)]);
const dz4Road = drive(pchEastEntry, dozer2[dozer2.length - 1], 0, 11);
const dz4Line = along([...dozer2].reverse(), endT(dz4Road) + 4, 0.45);
const DZ4_AT = 12; // county mutual aid moves on the CAD entry — this many minutes after the report
const LINE_MIN = Math.ceil(DZ4_AT + endT(dz4Line));
const T_HOLD = LINE_MIN + 3;
const CONT = Float32Array.from(FIELD2.data, (v) => (v > T_HOLD ? 9999 : v));
const PLANC = { states: [{ at: '@authorize+1', state: 'proposed' }, { at: '@answer:attack:commit', state: 'committed' }] };
const ft01cOut = fly(sweep[2], standoff(detectionC, 250, 380), 0, 12);
const ft02cOut = fly(dock2, standoff(head2At(8), 160, 460), 4, 14);
const e32c = drive(trancasMouth, [detectionC[0] + 240, detectionC[1] + 120], 2.2, 10);
const e31c = drive(standbyE31, anchorC, 0, 9), e31cFar = drive(e31Far, anchorC, 0, 9);

const phasesC = [
  { id: 'A', name: 'Standby', t: -10, job: 'Show the place and the assets.', camera: { target: [0, -100], range: 5600, pitch: 52, bearing: -10 }, dock: ['fleet', 'weather', 'events'] },
  { id: 'B', name: 'Detection', t: 0, job: 'Show exactly one thing, and where it is.', camera: { target: detectionC, range: 2400, pitch: 56, bearing: 250 }, feed: { drone: 'FT-01', sensor: 'ir' }, dock: ['feed', 'fleet'] },
  { id: 'C', name: 'Sizing', t: 3.5, job: 'Show how big, and where it is going.', camera: { target: r2(head2At(40)), range: 3300, pitch: 55, bearing: 205 }, dock: ['growth', 'feed', 'weather'] },
  { id: 'D', name: 'Notify', t: 5.5, job: 'The report is always required — even with no evacuation.', camera: { target: r2(head2At(30)), range: 3800, pitch: 54, bearing: 210 }, gate: { label: 'REPORT TO COUNTY FIRE AUTHORITY · VEGETATION FIRE', expires: 14 }, dock: ['growth', 'weather'] },
  { id: 'E', name: 'Attack', t: 9, after: '@authorize', job: 'Direct attack: anchor and cut.', camera: { target: r2([ignition[0] - 200, ignition[1] - 100]), range: 3000, pitch: 56, bearing: 30 }, dock: ['fleet', 'growth'] },
  { id: 'F', name: 'Contained', t: T_HOLD + 2, after: '@answer:attack:commit', job: 'The line held. Show it against the projection.', camera: { target: r2(ignition), range: 3400, pitch: 55, bearing: 30 }, dock: ['fleet', 'weather'] },
];

const contain = {
  schema: 'tte.situation/1', id: 'contain',
  meta: { title: 'Encinal Canyon', subtitle: 'Containable · no evacuation, authority still notified', coords: scenario.meta.coords, size: scenario.meta.size, attribution: ATTRIB, disclaimer: DISCLAIMER, epoch: EPOCH, tz: 'PST', feedDrone: 'FT-01' },
  clock: { start: -10, end: T_HOLD + 26 },
  phases: phasesC,
  layers: [
    { id: 'labels', group: 'labels', name: 'Place names', provenance: meas('OpenStreetMap'), spec: { type: 'labels', items: placeLabels } },
    station('dock-1', dock1, 'DOCK D-1', 'FT-03 ready'), station('dock-2', dock2, 'DOCK D-2', 'FT-02 ready'), station('sensor-s7', s7, 'S-7 · THERMAL MAST', 'LWIR · 360°'),
    { id: 'detection', group: 'detections', name: 'Heat detection', from: 'B', until: 'C', provenance: meas('S-7 LWIR'),
      spec: { type: 'marker', position: detectionC, icon: 'detection', tone: 'warn', pulse: true, title: 'HEAT DETECTION · UNCONFIRMED', detail: `S-7 LWIR · 74% · ${fmtLL(detectionC)}` },
      patches: [{ at: 2, spec: { tone: 'fire', title: 'CONFIRMED · VEGETATION FIRE', detail: `FT-01 IR · 388 °C · ${fmtLL(detectionC)}` } }] },
    { id: 'fire', group: 'firePerimeter', name: 'Perimeter + projection', from: 'C', provenance: SPREAD, spec: { ...fieldBase, labelToward: r2(fire2.tip), data: q10(FIELD2.data) },
      patches: [{ at: `@answer:attack:commit+${LINE_MIN}`, spec: { data: q10(CONT) } }] },
    { id: 'ignition', group: 'firePerimeter', name: 'Ignition area', from: 'C', provenance: model('Origin estimate from spread'), spec: { type: 'marker', position: r2(ignition), icon: 'ignition', title: 'IGNITION AREA', detail: `est. ${fmtT(T_IGN)} · Trancas Cyn` } },
    { id: 'wind', group: 'weather', name: 'Wind', from: 'C', provenance: meas('RAWS Malibu Hills'),
      spec: { type: 'marker', position: r2([head2At(50)[0] - 250, head2At(50)[1] + 380]), icon: 'wind', tone: 'slate', rotation: 247, title: 'WIND ENE 14 G22', detail: 'RH 14% · 60°F' } },
    { id: 'advisory', group: 'evacZones', name: 'Advisory · no order', from: '@authorize+0.3', provenance: auth('Advisory sent with the CAD report'),
      spec: zoneSpec(warnC, PALETTE.amber, 'tint', 0.08, { color: PALETTE.amber, width: 2, dash: [10, 6], opacity: 0.6 }) },
    { id: 'dozer-line', group: 'suppression', name: 'Dozer line · flank', from: '@authorize+1', provenance: auth('TALON plan P-2'), ...PLANC,
      spec: { type: 'line', drape: true, points: dozer2, color: '#D9B36C', width: 12, style: 'dashed', dash: [26, 12] } },
  ],
  units: [
    { spec: { id: 'FT-01', kind: 'drone', name: 'Kite', altitudeFt: 1200, status: 'active', detail: 'Canyon sweep', position: sweep[0], patrol: { path: sweep, speedMps: 22 } }, provenance: meas('Telemetry'),
      info: [{ at: -10, data: { battery: 84, role: 'Patrol', payload: 'EO/IR gimbal' } }, { at: 40, data: { battery: 52 } }, { at: 66, data: { battery: 31 } }],
      patches: [
        { at: 'B', spec: { track: ft01cOut, detail: 'Retasked · heat detection', status: 'enroute', gimbal: { target: detectionC }, orbitRadius: 0 } },
        { at: endT(ft01cOut), spec: { status: 'active', detail: 'Orbit · detection', orbitRadius: 140, orbitPeriodS: 70, gimbal: { target: detectionC, tempC: 388, targetId: 'DET-3' } } },
        { at: '@answer:release:release', spec: { patrol: { path: sweep, speedMps: 22 }, detail: 'Canyon sweep (released)', orbitRadius: 0, gimbal: null } },
      ] },
    { spec: { id: 'FT-02', kind: 'drone', name: 'Hawk', altitudeFt: 0, status: 'standby', detail: 'Docked · D-2', position: dock2 }, provenance: meas('Telemetry'),
      info: [{ at: -10, data: { battery: 100, role: 'Perimeter mapping' } }, { at: 40, data: { battery: 62 } }],
      patches: [
        { at: 4, spec: { altitudeFt: 900, status: 'enroute', detail: 'Launched · perimeter mapping', track: [...ft02cOut, { t: 20, p: standoff(head2At(20), 160, 460) }, { t: 40, p: standoff(head2At(40), 160, 460) }], gimbal: { target: r2(head2At(8)) } } },
        { at: endT(ft02cOut), spec: { status: 'active', detail: 'Perimeter orbit', orbitRadius: 260, orbitPeriodS: 140, gimbal: { target: r2(head2At(10)), tempC: 870, targetId: 'PERIM' } } },
      ] },
    { spec: { id: 'E-31', kind: 'engine', type: 'Type 3', status: 'standby', detail: 'Available · PCH east', position: e31Far }, provenance: meas('AVL'),
      patches: [
        { at: '@answer:prepos:yes', rel: true, spec: { status: 'enroute', detail: 'Pre-positioning · Encinal junction', track: e31Pre, trail: 10 } },
        { at: `@answer:prepos:yes+${r1(endT(e31Pre))}`, spec: { status: 'standby', detail: 'Staged · Encinal junction' } },
        { at: '@answer:attack:commit+0.5', rel: true, when: '@answer:prepos:yes', spec: { status: 'enroute', detail: 'Anchor · flank', track: e31c, trail: 14 } },
        { at: '@answer:attack:commit+0.5', rel: true, unless: '@answer:prepos:yes', spec: { status: 'enroute', detail: 'Anchor · flank', track: e31cFar, trail: 14 } },
        { at: `@answer:attack:commit+${r1(0.5 + endT(e31c))}`, when: '@answer:prepos:yes', spec: { status: 'active', detail: 'Anchored · flank' } },
        { at: `@answer:attack:commit+${r1(0.5 + endT(e31cFar))}`, unless: '@answer:prepos:yes', spec: { status: 'active', detail: 'Anchored · flank' } },
      ] },
    { spec: { id: 'E-32', kind: 'engine', type: 'Type 3', status: 'standby', detail: 'Available · Trancas', position: trancasMouth }, provenance: meas('AVL'),
      patches: [{ at: 2.2, spec: { status: 'enroute', detail: 'Initial attack · coastal slope', track: e32c, trail: 14 } }, { at: Math.ceil(endT(e32c)), spec: { status: 'active', detail: 'On scene · IC' } }] },
    { spec: { id: 'DZ-4', kind: 'dozer', type: 'Dozer · county mutual aid', status: 'enroute', detail: 'Flank line · mutual aid', position: pchEastEntry }, from: `@authorize+${DZ4_AT}`, provenance: meas('AVL'),
      patches: [
        { at: `@authorize+${DZ4_AT}`, rel: true, spec: { track: [...dz4Road, ...dz4Line], trail: 20 } },
        { at: `@authorize+${r1(DZ4_AT + endT(dz4Road) + 4)}`, spec: { status: 'active', detail: 'Cutting line · flank' } },
      ] },
  ],
  telemetry: [
    { at: 'A', values: { status: { value: 'Fire weather watch', level: 'warn', basis: 'authored', source: 'NWS (exercise inject)' }, wind: W_('ENE 12 G22 mph', 247), rh: W_('14%'), temp: W_('60°F'), fuel: W_('1-h 6% · ERC 62'), incident: { value: 'No incident', level: 'ok', basis: 'authored', source: 'CAD' } } },
    { at: 'B', values: { incident: { value: 'Detection · unconfirmed', level: 'warn', basis: 'measured', source: 'S-7 LWIR' } } },
    { at: 2, values: { incident: { value: 'Type 4 · initial attack', level: 'warn', basis: 'measured', source: 'FT-01 IR' } } },
    { at: 'C', values: { spread: { value: `${ROS2} m/min WSW`, basis: 'modeled', source: 'TALON spread model v3' } } },
    { at: '@authorize+0.2', values: { incident: { value: 'Type 4 · reported', level: 'warn', basis: 'authored', source: 'Operator report' } } },
    { at: T_HOLD + 2, values: { incident: { value: 'Type 4 · contained', level: 'ok', basis: 'authored', source: 'IC report' } } },
  ],
  presets: [
    { name: 'Overview', sub: 'full frame', target: [0, -100], range: 5600, pitch: 52, bearing: -10 },
    { name: 'Fire', sub: 'backcountry head', target: r2(head2At(40)), range: 1800, pitch: 58, bearing: 30 },
    { name: 'Flank line', sub: 'dozer cut', target: anchorC, range: 1300, pitch: 56, bearing: 30 },
  ],
  script: [
    { at: -6, kind: 'answer', item: 'prepos', option: 'yes' },
    { at: 0.6, kind: 'answer', item: 'detect', option: 'wait' },
    { at: 6.4, kind: 'answer', item: 'notify', option: 'send' }, { at: 6.4, kind: 'authorize' },
    { at: 8.6, kind: 'answer', item: 'attack', option: 'commit' },
    { at: T_HOLD + 6, kind: 'answer', item: 'release', option: 'release' },
  ],
  talon: { agents: AGENTS, review: { detect: 'detect', confirm: 'confirm', plan: 'attack', baseline: { minutes: 38, label: 'Manual baseline', source: 'FlytBase brief, “The Old Way”' } }, items: [
    readiness(-10),
    prepos(-8, -2),
    { id: 'detect', agent: 'recon', at: 0, until: 2, level: 'interrupt', kind: 'ask', milestone: 'Heat detection', title: 'Heat detection on Trancas ridge',
      body: `S-7 thermal mast · 74% match to a flame signature · ${fmtLL(detectionC)}. FT-01 is on its way to look, on scene in ${mmss(endT(ft01cOut))}.`,
      authority: 'operator', options: [{ id: 'wait', label: 'Wait for FT-01', recommended: true }, { id: 'confirm', label: 'Confirm now' }, { id: 'dismiss', label: 'Dismiss as false alarm' }],
      why: ['74% match is below my confirm threshold (85%)', `FT-01 can see it in ${mmss(endT(ft01cOut))}; confirming blind costs nothing to wait for`, `Nearest home is ${nearestHome(detectionC)} m away`],
      evidence: [{ label: 'Detection', point: detectionC, layers: ['detection'] }, { label: 'FT-01', unit: 'FT-01' }, { label: 'S-7 mast', point: s7, layers: ['sensor-s7'] }], dock: ['feed'], feed: { drone: 'FT-01', sensor: 'ir' } },
    { id: 'retask', agent: 'recon', at: 0.05, level: 'feed', kind: 'action', authority: 'standing', standing: SO_LOOK, title: 'FT-01 retasked to the detection', body: 'Airspace box TRANCAS-2 is pre-cleared. Sweep paused.', busy: 2 },
    { id: 'reraise_dismiss', agent: 'recon', at: 2, when: '@answer:detect:dismiss', level: 'feed', kind: 'note', title: 'The detection you dismissed is real',
      body: 'FT-01 IR shows active flame at 388 °C. Your dismissal stays on the record; I have opened the incident on the new evidence and copied the Regional Duty Supervisor.' },
    { id: 'confirm', agent: 'recon', at: 2, level: 'feed', kind: 'note', milestone: 'Confirmed', title: 'Confirmed: vegetation fire',
      body: `FT-01 IR: ${r1(acres2(2))} ac, ${nearestHome(detectionC)} m from the nearest home, running WSW into the backcountry with the wind.`, evidence: [{ label: 'Fire', point: detectionC }] },
    { id: 'runcard', agent: 'dispatch', at: 2.2, level: 'feed', kind: 'action', authority: 'standing', standing: 'Run card ENC-N · normal dispatch level', title: 'E-32 dispatched', body: `From Trancas Canyon, ETA ${Math.round(endT(e32c) - 2.2)} min.`, evidence: [{ label: 'E-32', unit: 'E-32' }] },
    { id: 'ft02', agent: 'recon', at: 4, level: 'feed', kind: 'action', authority: 'standing', standing: SO_LOOK, title: 'FT-02 launched from dock D-2', body: 'Mapping the perimeter on a 260 m orbit.', busy: 6, evidence: [{ label: 'FT-02', unit: 'FT-02' }] },
    { id: 'projection', agent: 'spread', at: 3.8, level: 'feed', kind: 'note', milestone: 'Projection', title: `Projection: WSW into the backcountry at ${ROS2} m/min`,
      body: `${r1(acres2(4))} ac now. ${homesC(4, 60)} homes inside the +60 min projection; ${hhC} within 750 m of the flank get an advisory. The canyon mouth is off the right flank.`, confidence: 'moderate',
      basis: 'Spread model v3 · FT-01 IR perimeter 1 min old · RAWS 4 min old', evidence: [{ label: 'Projection', layers: ['fire'], point: r2(head2At(40)) }], dock: ['growth'] },
    { id: 'notify', agent: 'notify', at: 5.5, until: 14, hold: 7, level: 'ask', kind: 'ask', milestone: 'Report', title: 'Report the fire to the county authority?',
      body: `Type 4, ${r1(acres2(5.5))} ac, no homes in the projection — no evacuation is proposed. The county still requires the report within 30 min of confirmation, and it is the CAD entry that queues the mutual-aid dozer if the wind turns.`,
      authority: 'operator', confidence: 'high', basis: 'County fire code §F-210 (exercise) · CAD report format',
      gate: { label: 'REPORT TO COUNTY FIRE AUTHORITY · VEGETATION FIRE', needs: 'Your authorization', expires: 14, reach: 'CAD report · size, location, resources, no evacuation', check: 'Report drafted from live telemetry · geofence matches the advisory only', onExpire: 'Nothing is sent. The report is still required; I escalate to the Regional Duty Supervisor.' },
      options: [{ id: 'send', label: 'Send the report', recommended: true, effect: { kind: 'authorize' } }, { id: 'hold', label: 'Hold the report' }],
      why: ['Confirmed vegetation fire: the county requires a report within 30 min, evacuation or not', 'The CAD entry is what makes a county dozer available if this grows', 'Confirmation was at T+0:02 — the statutory clock is running', 'No public alert is drafted: nothing here touches the public'],
      evidence: [{ label: 'Fire', layers: ['fire'], point: detectionC }], dock: ['growth'] },
    { id: 'reported', agent: 'notify', at: '@authorize+0.2', level: 'feed', kind: 'note', milestone: 'Reported', title: 'Report sent · County Fire Authority',
      body: `CAD entry from live telemetry: Type 4, ${r1(acres2(6))} ac, WSW into the backcountry, E-32 on scene, no evacuation. Advisory going to ${hhC} homes near the flank.` },
    { id: 'lapsed', agent: 'notify', at: 14, unless: '@authorize', level: 'interrupt', kind: 'note', title: 'The report lapsed without a decision',
      body: 'Nothing was sent. Silence is not approval: the report is still required, so I escalated to the Regional Duty Supervisor.' },
    { id: 'attack', agent: 'dispatch', at: '@authorize+1', until: 20, level: 'ask', kind: 'proposal', milestone: 'Plan P-2', title: 'Plan P-2: direct attack — anchor and cut',
      body: `E-31 anchors the flank where the line starts, the county dozer (queued by your report) cuts ${Math.round(length(dozer2))} m of flank line, FT-02 maps the perimeter every 6 min. No evacuation: the advisory covers the nearest homes.`,
      authority: 'operator', confidence: 'moderate', basis: 'TALON attack model · flank ROS ≈ 60% of head · dozer line at 0.45 m/s',
      compare: { cols: [{ id: 'a', label: 'COA A', sub: 'Anchor + cut', recommended: true }, { id: 'b', label: 'COA B', sub: 'Monitor only' }],
        rows: [{ label: 'Homes at risk', values: [`${homesC(6, 120)}`, `${homesC(6, 120) + 2} if the wind turns`], best: 0 },
          { label: 'Line complete', values: [`~${LINE_MIN - DZ4_AT - Math.round(endT(dz4Road))} min of dozer work`, '—'] },
          { label: 'Cost', values: ['1 dozer + 2 engines', 'FT-02 mapping only'] }] },
      options: [{ id: 'commit', label: 'Commit P-2', recommended: true }, { id: 'monitor', label: 'Monitor only' }],
      why: [`The head runs at ${ROS2} m/min into open backcountry — a flank line can catch it`, 'The dozer is already queued by the report: no new request, no new delay', `${hhC} homes sit within 750 m of the flank; the advisory is not a substitute for a line`, 'Monitoring waits for the wind to decide'],
      evidence: [{ label: 'Dozer line', layers: ['dozer-line'], point: anchorC }, { label: 'E-31', unit: 'E-31' }], dock: ['fleet'] },
    { id: 'attackexec', agent: 'dispatch', at: '@answer:attack:commit+0.2', level: 'feed', kind: 'action', authority: 'standing', standing: 'Plan P-2 (authorized)', title: 'Executing P-2', body: 'E-31 to the anchor point, DZ-4 starts the flank line on arrival, FT-02 continues mapping.', busy: 4 },
    { id: 'monitorbad', agent: 'spread', when: '@answer:attack:monitor', at: '@answer:attack:monitor+35', level: 'feed', kind: 'note', title: 'Wind turned 15° — the flank is running',
      body: `The flank is now the head, toward the ${hhC} advisory homes. Monitoring is no longer the cheap option. The choice and this consequence are both on the record.` },
    { id: 'dz4', agent: 'dispatch', at: `@authorize+${r1(DZ4_AT + endT(dz4Road) + 4)}`, level: 'feed', kind: 'note', title: 'County dozer on scene · cutting the flank', evidence: [{ label: 'DZ-4', unit: 'DZ-4' }] },
    { id: 'held', agent: 'spread', when: '@answer:attack:commit', at: `@answer:attack:commit+${LINE_MIN}`, level: 'interrupt', kind: 'note', milestone: 'Line held', title: 'The line held',
      body: `Perimeter stopped at ${r1(acresAt(CONT, T_HOLD))} ac — the projection had ${r1(acres2(T_HOLD))} ac by now. The head is backing into the burn; FT-02 confirms no crossing.`,
      evidence: [{ label: 'Held perimeter', layers: ['fire'], point: r2(head2At(Math.max(6, T_HOLD - 5))) }] },
    { id: 'contained', agent: 'dispatch', when: '@answer:attack:commit', at: T_HOLD + 2, level: 'feed', kind: 'note', milestone: 'Contained', title: 'Contained (IC report)',
      body: `Line complete at ${r1(acresAt(CONT, T_HOLD))} ac. E-32 mopping up; the dozer finishes the flank at ${fmtT(LINE_MIN)}.` },
    { id: 'release', agent: 'recon', at: T_HOLD + 4, until: T_HOLD + 14, level: 'ask', kind: 'ask', title: 'Release FT-01 back to its sweep?', body: 'E-32 has eyes on the fire and the line is holding. FT-01 battery 31%.', authority: 'operator',
      options: [{ id: 'release', label: 'Release FT-01', recommended: true }, { id: 'keep', label: 'Keep it overhead 15 min' }], why: ['The line is holding and FT-02 continues mapping', 'Two canyon sectors have gone unswept for 40 minutes'], evidence: [{ label: 'FT-01', unit: 'FT-01' }] },
    { id: 'reviewready', agent: 'notify', at: T_HOLD + 20, level: 'feed', kind: 'note', title: 'The incident log is ready for review', body: 'Every recommendation, decision, dissent and standing-order action is on the record.' },
  ] },
};

// ---- falsepos: the heat is a permitted burn. The dismissal is the right call, and the save is the story.
const fpPlot = [sDet[0] - 40, sDet[1] + 320];
const fpRing = [[fpPlot[0] - 110, fpPlot[1] - 90], [fpPlot[0] + 110, fpPlot[1] - 90], [fpPlot[0] + 110, fpPlot[1] + 90], [fpPlot[0] - 110, fpPlot[1] + 90], [fpPlot[0] - 110, fpPlot[1] - 90]].map(r2);
const falsepos = {
  schema: 'tte.situation/1', id: 'falsepos',
  meta: { title: 'Encinal Canyon', subtitle: 'Permitted burn · false positive', coords: scenario.meta.coords, size: scenario.meta.size, attribution: ATTRIB, disclaimer: DISCLAIMER, epoch: EPOCH, tz: 'PST', feedDrone: 'FT-01' },
  clock: { start: -5, end: 26 },
  phases: [
    { id: 'A', name: 'Standby', t: -5, job: 'Show the place and the assets.', camera: { target: [0, -100], range: 5600, pitch: 52, bearing: -10 }, dock: ['fleet', 'weather', 'events'] },
    { id: 'B', name: 'Detection', t: 0, job: 'Show exactly one thing, and where it is.', camera: { target: sDet, range: 1500, pitch: 56, bearing: 200 }, feed: { drone: 'FT-01', sensor: 'eo' }, dock: ['feed', 'fleet'] },
    { id: 'C', name: 'Resolved', t: 4, job: 'The heat is a permitted plot. Show the save.', camera: { target: fpPlot, range: 1200, pitch: 58, bearing: 200 }, dock: ['fleet', 'weather'] },
  ],
  layers: [
    { id: 'labels', group: 'labels', name: 'Place names', provenance: meas('OpenStreetMap'), spec: { type: 'labels', items: placeLabels } },
    station('dock-1', dock1, 'DOCK D-1', 'FT-03 ready'), station('dock-2', dock2, 'DOCK D-2', 'FT-02 ready'), station('sensor-s7', s7, 'S-7 · THERMAL MAST', 'LWIR · 360°'),
    { id: 'detection', group: 'detections', name: 'Heat detection', from: 'B', provenance: meas('S-7 LWIR'),
      spec: { type: 'marker', position: sDet, icon: 'detection', tone: 'warn', pulse: true, title: 'HEAT DETECTION · UNCONFIRMED', detail: `S-7 LWIR · 71% · ${fmtLL(sDet)}` },
      patches: [{ at: 2.4, spec: { tone: 'ok', pulse: false, title: 'PERMITTED BURN · AU-2214', detail: `FT-01 EO · within plot bounds · ${fmtLL(sDet)}` } }] },
    { id: 'burn-plot', group: 'detections', name: 'Registered burn plot', from: 2.4, provenance: auth('County burn-permit registry AU-2214 (exercise)'),
      spec: { type: 'polygon', rings: [fpRing], mode: 'tint', fill: PALETTE.amber, fillOpacity: 0.1, outline: { color: PALETTE.amber, width: 2, dash: [8, 6], opacity: 0.7 } } },
  ],
  units: [
    { spec: { id: 'FT-01', kind: 'drone', name: 'Kite', altitudeFt: 1200, status: 'active', detail: 'Canyon sweep', position: sweep[0], patrol: { path: sweep, speedMps: 22 } }, provenance: meas('Telemetry'),
      info: [{ at: -5, data: { battery: 78, role: 'Patrol', payload: 'EO/IR gimbal' } }],
      patches: [{ at: 'B', spec: { patrol: null, position: standoff(sDet, 20, 260), altitudeFt: 400, orbitRadius: 90, orbitPeriodS: 60, detail: 'Orbit · detection', gimbal: { target: sDet, tempC: 340, targetId: 'DET-4' } } },
        { at: '@answer:dismiss:close', spec: { patrol: { path: sweep, speedMps: 22 }, altitudeFt: 1200, orbitRadius: 0, gimbal: null, detail: 'Canyon sweep (released)' } }] },
  ],
  telemetry: [
    { at: 'A', values: { status: { value: 'Normal fire weather', level: 'ok', basis: 'authored', source: 'NWS (exercise inject)' }, wind: W_('ENE 9 mph', 247), rh: W_('28%'), temp: W_('57°F'), fuel: W_('1-h 9% · ERC 44'), incident: { value: 'No incident', level: 'ok', basis: 'authored', source: 'CAD' } } },
    { at: 'B', values: { incident: { value: 'Detection · unconfirmed', level: 'warn', basis: 'measured', source: 'S-7 LWIR' } } },
    { at: 2.4, values: { incident: { value: 'Permitted burn · no incident', level: 'ok', basis: 'measured', source: 'FT-01 EO + county registry' } } },
  ],
  presets: [{ name: 'Overview', sub: 'full frame', target: [0, -100], range: 5600, pitch: 52, bearing: -10 }, { name: 'Detection', sub: 'the heat', target: sDet, range: 900, pitch: 58, bearing: 200 }],
  script: [{ at: 0.5, kind: 'answer', item: 'detect', option: 'wait' }, { at: 3.6, kind: 'answer', item: 'dismiss', option: 'close' }],
  talon: { agents: AGENTS, review: { detect: 'detect', confirm: 'verify' }, items: [
    { id: 'ready', agent: 'spread', at: -5, level: 'feed', kind: 'note', title: 'Normal fire weather', body: 'ENE 9 mph, RH 28%. FT-01 on its canyon sweep. The burn-permit window is open tonight until 23:00.' },
    { id: 'detect', agent: 'recon', at: 0, until: 2.5, level: 'interrupt', kind: 'ask', milestone: 'Heat detection', title: 'Heat on the coastal slope', body: `S-7 LWIR · 71% match to a flame signature · ${fmtLL(sDet)}. FT-01 is right there and dropping for a look.`, authority: 'operator',
      options: [{ id: 'wait', label: 'Wait for FT-01', recommended: true }, { id: 'confirm', label: 'Confirm now' }, { id: 'dismiss', label: 'Dismiss as false alarm' }],
      why: ['71% is below my confirm threshold (85%)', 'The burn-permit window is open tonight — a permitted plot is a live possibility', 'FT-01 is overhead; the EO look takes under two minutes'],
      evidence: [{ label: 'Detection', point: sDet, layers: ['detection'] }, { label: 'FT-01', unit: 'FT-01' }], dock: ['feed'], feed: { drone: 'FT-01', sensor: 'eo' } },
    { id: 'look', agent: 'recon', at: 0.05, level: 'feed', kind: 'action', authority: 'standing', standing: SO_LOOK, title: 'FT-01 orbiting the detection', body: 'Pre-cleared airspace, 400 ft AGL, EO first: tonight the registry matters more than the IR.', busy: 2 },
    { id: 'verify', agent: 'recon', at: 2.3, level: 'feed', kind: 'note', milestone: 'Identified', title: 'It is a permitted burn plot',
      body: `FT-01 EO: burn rows aligned with the wind, a control line on three sides, no spread beyond the plot. The county registry lists permit AU-2214 for exactly this polygon, valid tonight until 23:00. S-7's 71% flame-match is the plot doing what its permit says.`,
      evidence: [{ label: 'Registered plot', layers: ['burn-plot'], point: r2(fpPlot) }] },
    { id: 'dismiss', agent: 'recon', at: 3, until: 12, level: 'ask', kind: 'ask', milestone: 'Close-out', title: 'Close as permitted burn?',
      body: 'No engines, no report, no escalation: the permit covers it. If anything changes — spread past the plot bounds, the permit lapses — I re-open on the new evidence.',
      authority: 'operator', options: [{ id: 'close', label: 'Close as permitted burn', recommended: true }, { id: 'watch', label: 'Keep FT-01 overhead 20 min' }],
      why: ['The registry match is exact: permit AU-2214, this polygon, valid tonight', 'FT-01 EO shows the burn inside its control lines', 'A close-out is reversible: I re-open on any new evidence, and a disagreement goes to your supervisor'],
      evidence: [{ label: 'Registered plot', layers: ['burn-plot'], point: r2(fpPlot) }], dock: ['feed'] },
    { id: 'closed', agent: 'recon', at: '@answer:dismiss:close+0.2', level: 'feed', kind: 'note', milestone: 'Resolved', title: 'Closed as permitted burn AU-2214',
      body: 'No engines rolled, no report sent — the permit covers the burn. The registry match, the EO look and your call are all on the record.' },
    { id: 'watchdone', agent: 'recon', when: '@answer:dismiss:watch', at: '@answer:dismiss:watch+15', level: 'feed', kind: 'note', milestone: 'Resolved', title: 'Plot burned out within permit bounds',
      body: 'FT-01 watched it to the end: no spread past the control line. Closed.' },
    { id: 'watchopen', agent: 'recon', at: 12, unless: '@answer:dismiss', level: 'feed', kind: 'note', title: 'Window closed unanswered — staying on watch',
      body: 'You did not close it, so I did not either. FT-01 stays on the plot; silence keeps the watch, it never closes an incident.' },
    { id: 'confirmwrong', agent: 'recon', when: '@answer:detect:confirm', at: '@answer:detect:confirm+0.8', level: 'feed', kind: 'note', title: 'The confirmed heat is the permitted plot',
      body: 'FT-01 EO on it: burn rows, control lines, registry match. No incident — standing the confirmation down. Your call and my 71% are both on the record.' },
    { id: 'dismissed-early', agent: 'recon', when: '@answer:detect:dismiss', at: 2.5, level: 'feed', kind: 'note', title: 'You dismissed it before the look',
      body: 'FT-01 was already overhead, so the look happened anyway: permitted plot AU-2214. Your dismissal stands — and now it stands on evidence.' },
  ] },
};

mkdirSync(join(data, 'scenarios'), { recursive: true });
for (const sit of [standby, small, contain, falsepos, wui]) writeFileSync(join(data, 'scenarios', `${sit.id}.json`), JSON.stringify(sit));
console.log(JSON.stringify({ situations: true, ROS, cut: { t: r1(cut.t), p: r2(cut.p) }, cutRev: { t: r1(cutRev.t), p: r2(cutRev.p) }, ERR, T_SPOT, T_OBS, T_G, spot, spotAhead, upstream, occupied, hh1, hh2, devices, clearA, clearB, upCanyon, n120_4: nIn(4, 120), firstHome, dzArrive, s7, dock1, dock2, e31: [endT(e31FromFar), endT(e31FromJ)], kb: Math.round(JSON.stringify(wui).length / 1024) }));
