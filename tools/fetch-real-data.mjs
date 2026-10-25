// Builds ./data/ for the Encinal Canyon frame from public sources, in the loader's format:
//   dem.bin        Int16 LE, 400 x 220, metres   AWS Terrain Tiles (Terrarium, z14)
//   frame.json     center / width / height        (center chosen to contain lower Encinal Canyon Rd)
//   roads.json     [{id, kind, width, name, points}]   OpenStreetMap via Overpass
//   buildings.json [{id, kind, height, footprint}]      OpenStreetMap via Overpass
//   vegetation.json {cols, rows, data: base64 uint8}   ESA WorldCover 10 m v200 (2021)
//   scenario.json  overlays + units for a fictional training scenario (built by tools/encinal-scenario.mjs)
// Downloads are cached in .cache/. Run: node tools/fetch-real-data.mjs
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { fromUrl } from 'geotiff';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = join(root, '.cache');
const out = join(root, 'data');
mkdirSync(cache, { recursive: true });
mkdirSync(out, { recursive: true });

export const FRAME = { center: { lat: 34.0465, lon: -118.872 }, widthMeters: 6000, heightMeters: 3250 };
const COLS = 400, ROWS = 220;
const W = FRAME.widthMeters, H = FRAME.heightMeters;
const DEG = Math.PI / 180;
const p0 = FRAME.center.lat * DEG;
const mLat = 111132.954 - 559.822 * Math.cos(2 * p0) + 1.175 * Math.cos(4 * p0);
const mLon = 111412.84 * Math.cos(p0) - 93.5 * Math.cos(3 * p0) + 0.118 * Math.cos(5 * p0);
const toXY = (lat, lon) => [(lon - FRAME.center.lon) * mLon, (lat - FRAME.center.lat) * mLat];
const toLL = (x, y) => [FRAME.center.lat + y / mLat, FRAME.center.lon + x / mLon];
const bbox = { s: FRAME.center.lat - H / 2 / mLat, n: FRAME.center.lat + H / 2 / mLat, w: FRAME.center.lon - W / 2 / mLon, e: FRAME.center.lon + W / 2 / mLon };
const r2 = (v) => Math.round(v * 100) / 100;

async function cached(name, fetcher) {
  const f = join(cache, name);
  if (existsSync(f)) return readFileSync(f);
  const buf = Buffer.from(await fetcher());
  writeFileSync(f, buf);
  return buf;
}

// ---------------------------------------------------------------- DEM (Terrarium z14, bilinear)
async function buildDem() {
  const z = 14, n = 2 ** z;
  const fx = (lon) => ((lon + 180) / 360) * n;
  const fy = (lat) => ((1 - Math.log(Math.tan(lat * DEG) + 1 / Math.cos(lat * DEG)) / Math.PI) / 2) * n;
  const tiles = new Map();
  const tile = async (tx, ty) => {
    const k = `${tx}_${ty}`;
    if (!tiles.has(k)) {
      const buf = await cached(`t${z}_${k}.png`, async () => (await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${tx}/${ty}.png`)).arrayBuffer());
      tiles.set(k, PNG.sync.read(buf));
    }
    return tiles.get(k);
  };
  const px = async (gx, gy) => {
    const t = await tile(Math.floor(gx / 256), Math.floor(gy / 256));
    const i = ((gy % 256) * 256 + (gx % 256)) * 4;
    return t.data[i] * 256 + t.data[i + 1] + t.data[i + 2] / 256 - 32768;
  };
  const data = new Int16Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const x = (c / (COLS - 1)) * W - W / 2, y = H / 2 - (r / (ROWS - 1)) * H;
      const [lat, lon] = toLL(x, y);
      const gx = fx(lon) * 256 - 0.5, gy = fy(lat) * 256 - 0.5;
      const x0 = Math.floor(gx), y0 = Math.floor(gy), tx = gx - x0, ty = gy - y0;
      const [a, b, d, e] = await Promise.all([px(x0, y0), px(x0 + 1, y0), px(x0, y0 + 1), px(x0 + 1, y0 + 1)]);
      const h = (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty;
      data[r * COLS + c] = Math.max(-1, Math.round(h)); // bathymetry clamps to -1 like the spec DEM
    }
  return data;
}

// ---------------------------------------------------------------- OSM via Overpass
async function overpass() {
  const b = `${bbox.s - 0.002},${bbox.w - 0.002},${bbox.n + 0.002},${bbox.e + 0.002}`;
  const q = `[out:json][timeout:120];(
    way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|track)$"](${b});
    node["highway"="turning_circle"](${b});
    way["building"](${b});
    node["natural"="peak"](${b});
    node["place"](${b});
    node["natural"~"^(beach|bay|cape)$"](${b});
    way["natural"="beach"]["name"](${b});
  );out tags geom;`;
  const buf = await cached('overpass-encinal.json', async () => {
    const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'user-agent': 'tactical-terrain-engine/1.0 (dev fixture build)' }, body: new URLSearchParams({ data: q }) });
    if (!res.ok) throw new Error(`overpass ${res.status}`);
    return res.arrayBuffer();
  });
  return JSON.parse(buf.toString('utf8')).elements;
}

// Liang-Barsky clip of a polyline to the frame; returns the inside pieces.
function clipLine(pts) {
  const out = [];
  let cur = [];
  const inside = ([x, y]) => Math.abs(x) <= W / 2 && Math.abs(y) <= H / 2;
  const clipSeg = (a, b) => {
    let t0 = 0, t1 = 1;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    for (const [p, q] of [[-dx, a[0] + W / 2], [dx, W / 2 - a[0]], [-dy, a[1] + H / 2], [dy, H / 2 - a[1]]]) {
      if (p === 0) { if (q < 0) return null; continue; }
      const t = q / p;
      if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
    }
    return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]];
  };
  for (let i = 0; i < pts.length - 1; i++) {
    const s = clipSeg(pts[i], pts[i + 1]);
    if (!s) { if (cur.length > 1) out.push(cur); cur = []; continue; }
    if (!cur.length) cur.push(s[0]);
    cur.push(s[1]);
    if (!inside(pts[i + 1])) { if (cur.length > 1) out.push(cur); cur = []; }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

const KIND = { motorway: ['highway', 18], trunk: ['highway', 18], primary: ['highway', 16], secondary: ['arterial', 9], tertiary: ['collector', 8], unclassified: ['residential', 7], residential: ['residential', 7], living_street: ['residential', 6], service: ['residential', 5], track: ['fireroad', 4] };

function osmToFeatures(els) {
  const roads = [], buildings = [], places = [];
  for (const el of els) {
    const t = el.tags ?? {};
    if (el.type === 'way' && t.highway && KIND[t.highway]) {
      if (t.highway === 'service' && /driveway|parking_aisle|drive-through/.test(t.service ?? '')) continue;
      const [kind, width] = KIND[t.highway];
      const pts = el.geometry.map((g) => toXY(g.lat, g.lon));
      clipLine(pts).forEach((piece, i) => roads.push({ id: `osm-w${el.id}${i ? `-${i}` : ''}`, kind, width, name: t.name ?? t.ref ?? '', points: piece.map(([x, y]) => [r2(x), r2(y)]) }));
    } else if (el.type === 'node' && t.highway === 'turning_circle') {
      const [x, y] = toXY(el.lat, el.lon);
      if (Math.abs(x) < W / 2 && Math.abs(y) < H / 2) roads.push({ id: `osm-n${el.id}`, kind: 'turnaround', width: 22, points: [[r2(x), r2(y)]] });
    } else if (el.type === 'way' && t.building && el.geometry?.length >= 4) {
      const fp = el.geometry.map((g) => toXY(g.lat, g.lon));
      fp.pop();
      const cx = fp.reduce((s, p) => s + p[0], 0) / fp.length, cy = fp.reduce((s, p) => s + p[1], 0) / fp.length;
      if (Math.abs(cx) > W / 2 || Math.abs(cy) > H / 2) continue;
      const levels = parseFloat(t['building:levels']);
      const height = parseFloat(t.height) || (levels ? levels * 3.2 + 1 : 6);
      buildings.push({ id: `osm-b${el.id}`, kind: t.building === 'yes' ? 'building' : t.building, height: r2(height), footprint: fp.map(([x, y]) => [r2(x), r2(y)]) });
    } else if (t.name && (el.type === 'node' || el.geometry)) {
      const lat = el.lat ?? el.geometry[0].lat, lon = el.lon ?? el.geometry[0].lon;
      const [x, y] = toXY(lat, lon);
      if (Math.abs(x) < W / 2 && Math.abs(y) < H / 2) places.push({ name: t.name, kind: t.natural ?? t.place, ele: t.ele, position: [r2(x), r2(y)] });
    }
  }
  return { roads, buildings, places };
}

// ---------------------------------------------------------------- ESA WorldCover 10 m (COG window read)
async function buildVegetation() {
  const f = join(cache, 'worldcover-encinal.json');
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
  const tiff = await fromUrl('https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N33W120_Map.tif');
  const img = await tiff.getImage();
  const [ox, oy] = img.getOrigin();
  const [rx, ry] = img.getResolution();
  const x0 = Math.floor((bbox.w - ox) / rx), x1 = Math.ceil((bbox.e - ox) / rx);
  const y0 = Math.floor((bbox.n - oy) / ry), y1 = Math.ceil((bbox.s - oy) / ry);
  const [ras] = await img.readRasters({ window: [x0, y0, x1, y1] });
  const ww = x1 - x0, wh = y1 - y0;
  const cols = 600, rows = 325;
  const classes = new Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = ((c + 0.5) / cols) * W - W / 2, y = H / 2 - ((r + 0.5) / rows) * H;
      const [lat, lon] = toLL(x, y);
      const px = Math.min(ww - 1, Math.max(0, Math.floor((lon - ox) / rx) - x0));
      const py = Math.min(wh - 1, Math.max(0, Math.floor((lat - oy) / ry) - y0));
      classes[r * cols + c] = ras[py * ww + px];
    }
  const res = { cols, rows, classes, source: 'ESA WorldCover 10 m 2021 v200 (CC BY 4.0)' };
  writeFileSync(f, JSON.stringify(res));
  return res;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const [dem, els, veg] = await Promise.all([buildDem(), overpass(), buildVegetation()]);
  const { roads, buildings, places } = osmToFeatures(els);
  writeFileSync(join(out, 'dem.bin'), Buffer.from(dem.buffer));
  writeFileSync(join(out, 'frame.json'), JSON.stringify({ ...FRAME, cols: COLS, rows: ROWS, sources: { dem: 'AWS Terrain Tiles (Terrarium z14; USGS 3DEP)', roads: '© OpenStreetMap contributors (ODbL)', buildings: '© OpenStreetMap contributors (ODbL)', vegetation: veg.source } }, null, 2));
  writeFileSync(join(out, 'roads.json'), JSON.stringify(roads));
  writeFileSync(join(out, 'buildings.json'), JSON.stringify(buildings));
  writeFileSync(join(out, 'vegetation.json'), JSON.stringify({ cols: veg.cols, rows: veg.rows, encoding: 'base64-uint8', data: Buffer.from(Uint8Array.from(veg.classes)).toString('base64'), source: veg.source }));
  writeFileSync(join(cache, 'places-encinal.json'), JSON.stringify(places, null, 1));
  let mn = 1e9, mx = -1e9;
  for (const v of dem) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
  const hist = {};
  for (const c of veg.classes) hist[c] = (hist[c] ?? 0) + 1;
  const kinds = {};
  for (const r of roads) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
  console.log(JSON.stringify({ ms: Date.now() - t0, elev: [mn, mx], roads: roads.length, kinds, named: [...new Set(roads.map((r) => r.name).filter(Boolean))], buildings: buildings.length, worldcover: hist, places: places.map((p) => `${p.name} (${p.kind})`) }, null, 1));
}
