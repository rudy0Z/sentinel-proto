// Writes the procedural fixture to fixture-data/ in the real-data format the loader expects:
// data/dem.bin (Int16 LE), frame.json, roads.json, buildings.json, plus
// scenario.json (overlay specs + units) so the harness can drive the API from files.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateProceduralWorld, encodeWorldData, buildDemoScenario } from '../terrainEngine.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'fixture-data');
mkdirSync(out, { recursive: true });
const t0 = performance.now();
const world = generateProceduralWorld(1729);
const t1 = performance.now();
const enc = encodeWorldData(world);
writeFileSync(join(out, 'dem.bin'), Buffer.from(enc.dem));
writeFileSync(join(out, 'frame.json'), JSON.stringify(enc.frame, null, 2));
writeFileSync(join(out, 'roads.json'), JSON.stringify(enc.roads));
writeFileSync(join(out, 'buildings.json'), JSON.stringify(enc.buildings));
const sc = buildDemoScenario(world);
writeFileSync(join(out, 'scenario.json'), JSON.stringify(sc));
const d = world.dem.data;
let mn = Infinity, mx = -Infinity;
for (const v of d) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
const byKind = {};
for (const r of world.roads) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
console.log(JSON.stringify({ genMs: Math.round(t1 - t0), dem: `${world.dem.cols}x${world.dem.rows}`, elev: [mn, mx].map((v) => +v.toFixed(1)), roads: world.roads.length, byKind, buildings: world.buildings.length, layers: sc.layers.map(([id]) => id), units: sc.units.length, anchors: world.meta.anchors }, null, 1));
