/**
 * World scene builder — shared by the basemap bake harness
 * (scripts/render-world-entry.ts) and the in-shell 3D EXPLORE canvas
 * (Map3DExplorer.tsx). One world dataset, one visual language.
 *
 * Coordinate convention: world local metres (+x east, +y north) map to
 * scene (x, elevation, -y) — north away from a south-side camera.
 */

import * as THREE from "three";
import {
  W, H, sampleElevation, sampleVegetation,
  type World,
} from "../world/world";
import { lwir } from "../../tokens";
import { FIRE, activeFront, burnScarPolygon } from "../model/fire";
import { SCENE } from "../model/scene";

/** Smoke column height above the terrain, metres, and its base opacity. */
const SMOKE_HEIGHT = 260;
const SMOKE_OPACITY = 0.34;

/** Day (baked basemap look) or LWIR (night thermal sensor). */
export type SceneMode = "day" | "lwir";

// Vertical exaggeration for the diorama read.
export const VEX = 1.6;

/**
 * Sample the authored DEM into scene elevation (metres, VEX applied) — the
 * exact law buildWorldScene uses for its terrainY, exported so the 3D
 * operational overlays can drape geometry without re-entering the build.
 */
export function sampleTerrainY(world: World, lx: number, ly: number): number {
  return (sampleElevation(world, lx, ly) - world.dem.min) * VEX;
}

export const PAL = {
  valley:  new THREE.Color("#3A4A5C"),
  mid:     new THREE.Color("#4C5E72"),
  ridge:   new THREE.Color("#8CA0B4"),
  forest:  new THREE.Color("#3A5240"),
  scrub:   new THREE.Color("#57644A"),
  grass:   new THREE.Color("#5E6C54"),
  built:   new THREE.Color("#6E7A82"),
  bare:    new THREE.Color("#6A6E6C"),
  water:   new THREE.Color("#2E4A5E"),
  road:    new THREE.Color("#98A8B8"),
  arterial:new THREE.Color("#C2D2E0"),
  bldg:    new THREE.Color("#DAE2EA"),
  bldgBig: new THREE.Color("#B8C6D2"),
  fire:    new THREE.Color("#FF7A3C"),
  fireHi:  new THREE.Color("#FFB066"),
  fog:     new THREE.Color("#2A3A4E"),
};

const vegColors: Record<number, THREE.Color> = {
  10: PAL.forest,
  20: PAL.scrub,
  30: PAL.grass,
  40: PAL.grass,
  50: PAL.built,
  60: PAL.bare,
  80: PAL.water,
};

export interface WorldScene {
  scene: THREE.Scene;
  terrainY(lx: number, ly: number): number;
  sceneVec(lx: number, ly: number, y: number): THREE.Vector3;
  /** Swap the whole rig between daylight and the LWIR night sensor. */
  setMode(mode: SceneMode): void;
  /** Pointer ray → world-local metres on the terrain surface (P2.4). */
  raycastTerrain(ray: THREE.Raycaster): { lx: number; ly: number } | null;
  /**
   * Resolves once every async texture in the scene has decoded.
   *
   * The offline basemap bake (render-world-entry) renders a single frame and
   * reads it back with `readPixels`. TextureLoader is asynchronous, so without
   * awaiting this the bake captured the frame BEFORE the orthophoto decoded and
   * wrote a black terrain into the 2D basemap. Interactive 3D hid the bug
   * because it renders continuously.
   */
  ready(): Promise<void>;
  dispose(): void;
}

export function makeRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false,
  });
  renderer.setPixelRatio(Math.min(1.25, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  return renderer;
}

/**
 * Vertical sky gradient as a 2x256 canvas texture.
 *
 * A flat `background = fog` left the sky as a dead void and made the terrain
 * end in a hard black cut at the horizon. A gradient costs ONE small texture
 * and zero draw calls (it is the background, not geometry), and it gives the
 * ridgeline something to separate against. Night ops: cool near-horizon haze
 * lifting to a deeper zenith, warmer toward the fire side of the sky.
 */
function makeSkyTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, "#070C16"); // zenith
  grad.addColorStop(0.45, "#0C1626");
  grad.addColorStop(0.78, "#16273A"); // horizon haze
  grad.addColorStop(1.0, "#1D3145"); // just above the ridgeline
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export function makeScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = makeSkyTexture();
  /* Fog is the cheap depth cue: the frame is 6.0 x 3.25 km, so a 3.5–11 km
   * band never engaged and every ridge sat at the same value. Pulling it in
   * makes the far ridge recede and the near ridge read as near. */
  scene.fog = new THREE.Fog(0x16273A, 1400, 7200);
  scene.add(new THREE.AmbientLight(0xd4e2f0, 2.0));
  const key = new THREE.DirectionalLight(0xb4cce6, 1.5);
  key.position.set(-2400, 3200, 1800);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x76889f, 0.8);
  fill.position.set(2600, 1400, 2400);
  scene.add(fill);
  return scene;
}

/** Build the whole world into `scene`. Returns helpers + disposal. */
export function buildWorldScene(scene: THREE.Scene, world: World): WorldScene {
  const dem = world.dem;
  const elevRange = dem.max - dem.min;

  function terrainY(lx: number, ly: number): number {
    return sampleTerrainY(world, lx, ly);
  }
  function sceneVec(lx: number, ly: number, y: number): THREE.Vector3 {
    return new THREE.Vector3(lx, y, -ly);
  }

  const disposables: Array<{ dispose(): void }> = [];
  /** Async texture decodes the offline bake must wait on before readPixels. */
  const textureReady: Promise<void>[] = [];
  function track<T extends { dispose(): void }>(obj: T): T {
    disposables.push(obj);
    return obj;
  }
  // The sky gradient is a GPU resource the scene owns; release it with the rest
  // or a re-mount leaks one 2x256 texture per EXPLORE open.
  if (scene.background instanceof THREE.Texture) track(scene.background);

  // LWIR scratch colours (P2.3) — the thermal ramp endpoints.
  const thermal = new THREE.Color();
  const lwirCool = new THREE.Color(lwir.cool);
  const lwirWarm = new THREE.Color(lwir.warm);

  // ── Terrain ─────────────────────────────────────────────────────────────
  const cols = 240, rows = 130;
  const terrainGeom = track(new THREE.PlaneGeometry(W, H, cols - 1, rows - 1));
  terrainGeom.rotateX(-Math.PI / 2);
  const pos = terrainGeom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const colorsLwir = new Float32Array(pos.count * 3);
  const slopeOf = new Float32Array(pos.count);
  const tint = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const ly = -pos.getZ(i);
    pos.setY(i, terrainY(lx, ly));
    const e0 = terrainY(lx, ly);
    const ex = terrainY(lx + 40, ly) - e0;
    const ey = terrainY(lx, ly + 40) - e0;
    slopeOf[i] = Math.hypot(ex, ey) / 40;
  }
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const ly = -pos.getZ(i);
    const t = Math.min(1, Math.max(0, pos.getY(i) / (elevRange * VEX)));
    tint.copy(PAL.valley)
      .lerp(PAL.mid, Math.min(1, t * 1.7))
      .lerp(PAL.ridge, Math.max(0, t - 0.55) * 1.8);
    const cls = sampleVegetation(world, lx, ly);
    const veg = vegColors[cls] ?? PAL.grass;
    tint.lerp(veg, 0.62);
    tint.lerp(PAL.bare, Math.min(0.4, Math.max(0, slopeOf[i] - 0.45) * 1.4));
    colors[i * 3] = tint.r; colors[i * 3 + 1] = tint.g; colors[i * 3 + 2] = tint.b;
    // LWIR: monotonic read — cool ridge (high t) dark, warm low ground brighter.
    const heat = THREE.MathUtils.clamp((1 - t) * 0.84 + Math.min(0.5, slopeOf[i]) * 0.16, 0, 1);
    thermal.copy(lwirCool).lerp(lwirWarm, heat);
    colorsLwir[i * 3] = thermal.r; colorsLwir[i * 3 + 1] = thermal.g; colorsLwir[i * 3 + 2] = thermal.b;
  }
  const dayColorAttr = new THREE.BufferAttribute(colors, 3);
  /* When the orthophoto is draped, the vertex colours stop being the surface and
   * become a MODULATION. Left at full strength they multiply the photo down to
   * the old diagrammatic look, which defeats the whole point of the drape. Pull
   * them toward neutral so the aerial carries the surface and the grade only
   * keeps the slope/vegetation shaping (and the night-console value ceiling). */
  if (world.imagery) {
    for (let i = 0; i < pos.count; i++) {
      const k = i * 3;
      const lum = (colors[k] + colors[k + 1] + colors[k + 2]) / 3;
      colors[k] = THREE.MathUtils.lerp(0.86, lum, 0.42);
      colors[k + 1] = THREE.MathUtils.lerp(0.9, lum, 0.42);
      colors[k + 2] = THREE.MathUtils.lerp(1.0, lum, 0.42);
    }
    dayColorAttr.needsUpdate = true;
  }
  const lwirColorAttr = new THREE.BufferAttribute(colorsLwir, 3);
  terrainGeom.setAttribute("color", dayColorAttr);
  terrainGeom.computeVertexNormals();
  const terrainMatDay = track(new THREE.MeshLambertMaterial({
    vertexColors: true, flatShading: true,
  }));

  /* ── Aerial drape ──────────────────────────────────────────────────────────
   * The orthophoto covers exactly the frame bbox, so terrain UVs map 1:1 with
   * no reprojection. The vertex colours stay as the MULTIPLIER: the baked
   * elevation/vegetation/slope grade still shapes the light, and the photo
   * supplies the texture and colour that vertex colours never could. That
   * combination is what stops the ridge reading as painted geometry.
   *
   * Cost: one 2048px texture. Draw calls unchanged (same single mesh).
   */
  if (world.imagery) {
    const loader = new THREE.TextureLoader();
    const map = track(loader.load(world.imagery.url));
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.wrapS = THREE.ClampToEdgeWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    terrainMatDay.map = map;
    // Night-console ceiling: the photo must sit UNDER the chrome, not compete.
    terrainMatDay.color = new THREE.Color(0.62, 0.66, 0.74);
    terrainMatDay.needsUpdate = true;
    // The bake reads pixels on its first frame, so hold the render until the
    // decode lands. THREE's typed EventDispatcher only exposes "dispose", so
    // poll `image` rather than subscribing to load/error. The timeout keeps a
    // failed fetch from hanging the bake forever.
    textureReady.push(
      new Promise<void>((resolve) => {
        const deadline = performance.now() + 8000;
        const poll = () => {
          if (map.image || performance.now() > deadline) resolve();
          else setTimeout(poll, 25);
        };
        poll();
      }),
    );
  }
  const terrainMatLwir = track(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true }));
  const terrainMesh: THREE.Mesh = new THREE.Mesh(terrainGeom, terrainMatDay);
  scene.add(terrainMesh);

  // ── Plinth: 1 draw call (4 side skirts merged into one geometry) ─────────
  const baseY = -160;
  const E = W / 2, Zh = H / 2;
  {
    const verts: number[] = [];
    const edges: Array<[[number, number], [number, number]]> = [
      [[-E, Zh], [E, Zh]],
      [[-E, -Zh], [E, -Zh]],
      [[-E, -Zh], [-E, Zh]],
      [[E, -Zh], [E, Zh]],
    ];
    for (const [a, b] of edges) {
      const y1 = terrainY(a[0], a[1]);
      const y2 = terrainY(b[0], b[1]);
      const v1 = sceneVec(a[0], a[1], y1), v2 = sceneVec(a[0], a[1], baseY);
      const v3 = sceneVec(b[0], b[1], y2), v4 = sceneVec(b[0], b[1], baseY);
      verts.push(
        v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z,
        v2.x, v2.y, v2.z, v4.x, v4.y, v4.z, v3.x, v3.y, v3.z,
      );
    }
    const g = track(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, track(new THREE.MeshBasicMaterial({
      color: new THREE.Color("#16202E"), side: THREE.DoubleSide,
    }))));
  }

  // ── Roads: ONE merged geometry per class (2 draw calls total) ────────────
  // Vertices for every clipped segment are pushed into shared arrays;
  // arterial vs local roads get separate meshes so classes keep their tint.
  const roadColor = (kind: string): THREE.Color =>
    kind === "primary" || kind === "secondary" || kind === "tertiary"
      ? PAL.arterial : PAL.road;
  const roadBuckets: Record<"arterial" | "local", { verts: number[]; cols: number[] }> = {
    arterial: { verts: [], cols: [] },
    local: { verts: [], cols: [] },
  };
  for (const road of world.roads) {
    const segments: Array<Array<[number, number]>> = [];
    let cur: Array<[number, number]> = [];
    for (const p of road.points) {
      if (Math.abs(p[0]) <= E + 60 && Math.abs(p[1]) <= Zh + 60) {
        cur.push(p);
      } else if (cur.length) {
        segments.push(cur); cur = [];
      }
    }
    if (cur.length) segments.push(cur);
    const halfW = Math.max(3, road.width / 2);
    const col = roadColor(road.kind);
    const bucket = col === PAL.arterial ? roadBuckets.arterial : roadBuckets.local;
    for (const seg of segments) {
      if (seg.length < 2) continue;
      // densified ribbon strip, same shape as before, accumulated not meshed
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < seg.length - 1; i++) {
        const [ax, ay] = seg[i];
        const [bx, by] = seg[i + 1];
        const len = Math.hypot(bx - ax, by - ay);
        const steps = Math.max(1, Math.round(len / 25));
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          pts.push(new THREE.Vector3(ax + (bx - ax) * t, 0, -(ay + (by - ay) * t)));
        }
      }
      const last = seg[seg.length - 1];
      pts.push(new THREE.Vector3(last[0], 0, -last[1]));
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i];
        const q = pts[i + 1];
        const r = pts[Math.max(0, i - 1)];
        const dir = new THREE.Vector3(q.x - r.x, 0, q.z - r.z).normalize();
        const nrm = new THREE.Vector3(-dir.z, 0, dir.x);
        const y = terrainY(p.x, -p.z) + 2.0;
        const y2 = terrainY(q.x, -q.z) + 2.0;
        const l = new THREE.Vector3(p.x + nrm.x * halfW, y, p.z + nrm.z * halfW);
        const rr = new THREE.Vector3(p.x - nrm.x * halfW, y, p.z - nrm.z * halfW);
        const l2 = new THREE.Vector3(q.x + nrm.x * halfW, y2, q.z + nrm.z * halfW);
        const r2 = new THREE.Vector3(q.x - nrm.x * halfW, y2, q.z - nrm.z * halfW);
        bucket.verts.push(
          l.x, l.y, l.z, rr.x, rr.y, rr.z, l2.x, l2.y, l2.z,
          rr.x, rr.y, rr.z, r2.x, r2.y, r2.z, l2.x, l2.y, l2.z,
        );
        for (let k = 0; k < 6; k++) bucket.cols.push(col.r, col.g, col.b);
      }
    }
  }
  const roadMats = {
    arterial: track(new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true })),
    local: track(new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true })),
  };
  for (const key of ["arterial", "local"] as const) {
    const b = roadBuckets[key];
    if (b.verts.length === 0) continue;
    const g = track(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(b.verts, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(b.cols, 3));
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, roadMats[key]));
  }

  // ── Buildings: ONE InstancedMesh (unit box, per-instance matrix + tint) ──
  function defaultHeight(kind: string): number {
    if (/garage|shed|roof|hut/.test(kind)) return 3;
    if (/commercial|retail|office|industrial|warehouse|church|school/.test(kind)) return 9;
    return 5.5;
  }
  const bldgMat = track(new THREE.MeshLambertMaterial({ color: 0xffffff }));
  const placed: Array<{ cx: number; cy: number; sx: number; sy: number; h: number; big: boolean }> = [];
  for (const b of world.buildings) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let cx = 0, cy = 0;
    for (const [x, y] of b.footprint) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      cx += x; cy += y;
    }
    cx /= b.footprint.length; cy /= b.footprint.length;
    if (Math.abs(cx) > E || Math.abs(cy) > Zh) continue;
    const sx = Math.max(5, maxX - minX);
    const sy = Math.max(5, maxY - minY);
    const h = (b.height ?? defaultHeight(b.kind)) * 2.4;
    placed.push({ cx, cy, sx, sy, h, big: sx * sy > 260 });
  }
  const bldgInst = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(1, 1, 1)),
    bldgMat,
    placed.length,
  );
  bldgInst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(placed.length * 3), 3);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  placed.forEach((p, i) => {
    const groundY = terrainY(p.cx, p.cy);
    m.makeScale(p.sx * 0.9, p.h, p.sy * 0.9);
    m.setPosition(p.cx, groundY + p.h / 2 - 3, -p.cy);
    bldgInst.setMatrixAt(i, m);
    bldgInst.setColorAt(i, c.copy(p.big ? PAL.bldgBig : PAL.bldg));
  });
  bldgInst.instanceMatrix.needsUpdate = true;
  bldgInst.instanceColor.needsUpdate = true;
  track(bldgInst);
  scene.add(bldgInst);

  // ── Forest (instanced cones on WorldCover tree cells) ───────────────────
  if (world.vegetation) {
    const v = world.vegetation;
    // Seeded PRNG: bake output must be reproducible pixel-for-pixel.
    let seed = 0x9e3779b9;
    const rand = () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const spots: Array<[number, number]> = [];
    for (let r = 0; r < v.rows; r += 1) {
      for (let c = 0; c < v.cols; c += 1) {
        if (v.classAt(c, r) !== 10) continue;
        const lx = (c / (v.cols - 1)) * W - W / 2;
        const ly = H / 2 - (r / (v.rows - 1)) * H;
        if (terrainY(lx, ly) > elevRange * VEX * 0.8) continue;
        spots.push([lx, ly]);
      }
    }
    const target = Math.min(6000, spots.length);
    const stride = Math.max(1, Math.floor(spots.length / target));
    const inst = new THREE.InstancedMesh(
      track(new THREE.ConeGeometry(16, 42, 5)),
      track(new THREE.MeshLambertMaterial({
        color: PAL.forest.clone().multiplyScalar(1.25), flatShading: true,
      })),
      Math.floor(spots.length / stride),
    );
    const m = new THREE.Matrix4();
    let n = 0;
    for (let i = 0; i < spots.length; i += stride) {
      const [lx, ly] = spots[i];
      const jx = lx + (rand() - 0.5) * 46;
      const jy = ly + (rand() - 0.5) * 46;
      const s = 0.7 + rand() * 0.7;
      m.makeScale(s, s, s);
      m.setPosition(sceneVec(jx, jy, terrainY(jx, jy) + 14 * s));
      inst.setMatrixAt(n++, m);
    }
    inst.count = n;
    scene.add(inst);
  }

  /* ── Fire ───────────────────────────────────────────────────────────────────
   * There is ONE fire now, and it lives in `model/fire.ts`.
   *
   * This block used to build a six-point crest of BOXES from `world.fire.band`
   * while a second block below built a burn scar from `FIRE.isochrones` — so
   * the 3D scene drew two disagreeing fires in the same place. The boxes are
   * gone; the fire is drawn once, from the one model, and it reads as a
   * continuous front rather than a sliver of crates on a ridge.
   */
  const fireGroup = new THREE.Group();

  /* ── Fire as the hero: scar, isochrones, head axis ─────────────────────────
   * The old crest was a thin sliver of boxes. Fire now carries the scene:
   *  - a dNBR-style BURN SCAR draped on the terrain (charcoal interior),
   *  - TIME-STAMPED ISOCHRONES so the operator can read progression, not a circle,
   *  - a HEAD-FIRE AXIS with direction chevrons, which is the thing that
   *    actually answers "where is it going in an hour".
   * All of it is ONE merged mesh + ONE line primitive, so the draw budget holds.
   */
  {
    const scarVerts: number[] = [];
    const scarCols: number[] = [];
    const emitPoly = (
      poly: Array<[number, number]>,
      col: THREE.Color,
      alpha: number,
    ) => {
      for (let i = 1; i < poly.length - 1; i++) {
        const tri = [poly[0], poly[i], poly[i + 1]];
        for (const [px, py] of tri) {
          const v = sceneVec(px, py, terrainY(px, py) + 2);
          scarVerts.push(v.x, v.y, v.z);
          scarCols.push(col.r, col.g, col.b, alpha);
        }
      }
    };

    const scarOuter = burnScarPolygon(FIRE, 0.94);
    const scarInner = burnScarPolygon(FIRE, 0.55);
    // Severity ramps inward: ember at the edge → charcoal where it has consumed.
    emitPoly(scarOuter, new THREE.Color("#3A1E14"), 0.62);
    emitPoly(scarInner, new THREE.Color("#14100E"), 0.86);

    /* ── Live fire front, merged into the SAME geometry ──────────────────────
     * The front is a continuous emissive band along the newest perimeter, so the
     * fire reads as a FRONT rather than boxes on a ridge. Emitting it into the
     * scar buffer means the whole fire surface is ONE draw call.
     */
    const front = activeFront(FIRE).polygon;
    const hot = new THREE.Color("#FFD9A0");
    const cool = new THREE.Color(FIRE.isochrones[FIRE.isochrones.length - 1].tone);
    const bandCol = hot.clone().lerp(cool, 0.35);
    for (let i = 0; i < front.length; i++) {
      const [x1, y1] = front[i];
      const [x2, y2] = front[(i + 1) % front.length];
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const ux = (x2 - x1) / len;
      const uy = (y2 - y1) / len;
      const px = -uy * 18;
      const py = ux * 18;
      const seg = 6;
      for (let s = 0; s < seg; s++) {
        const t0 = s / seg;
        const t1 = (s + 1) / seg;
        const ax = x1 + (x2 - x1) * t0;
        const ay = y1 + (y2 - y1) * t0;
        const bx = x1 + (x2 - x1) * t1;
        const by = y1 + (y2 - y1) * t1;
        const quad: Array<[number, number]> = [
          [ax + px, ay + py], [ax - px, ay - py],
          [bx - px, by - py], [bx + px, by + py],
        ];
        for (const [ix, iy] of [quad[0], quad[1], quad[2], quad[0], quad[2], quad[3]]) {
          const v = sceneVec(ix, iy, terrainY(ix, iy) + 7);
          scarVerts.push(v.x, v.y, v.z);
          scarCols.push(bandCol.r, bandCol.g, bandCol.b, 0.92);
        }
      }
    }

    const scarGeom = track(new THREE.BufferGeometry());
    scarGeom.setAttribute("position", new THREE.Float32BufferAttribute(scarVerts, 3));
    scarGeom.setAttribute("color", new THREE.Float32BufferAttribute(scarCols, 4));
    const scarMat = track(new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false,
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2,
    }));
    const scar = new THREE.Mesh(scarGeom, scarMat);
    scar.renderOrder = 2;
    fireGroup.add(scar);
  }
  // The fire's own light. Positioned at the head of the fire, not at the
  // midpoint of a legacy band — the head is where the light and the heat are.
  const fireMid = FIRE.ignition;
  const fireLight = new THREE.PointLight(PAL.fire.getHex(), 4.0, 2600, 2);
  fireLight.position.copy(sceneVec(fireMid.x, fireMid.y, terrainY(fireMid.x, fireMid.y) + 160));
  scene.add(fireLight);
  scene.add(fireGroup);

  // ── Smoke ───────────────────────────────────────────────────────────────
  const smokeCanvas = document.createElement("canvas");
  smokeCanvas.width = 128; smokeCanvas.height = 128;
  const sg = smokeCanvas.getContext("2d")!;
  const grad = sg.createRadialGradient(64, 64, 8, 64, 64, 64);
  grad.addColorStop(0, "rgba(200,208,218,0.5)");
  grad.addColorStop(0.55, "rgba(160,170,184,0.26)");
  grad.addColorStop(1, "rgba(150,162,178,0)");
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 128, 128);
  const smokeTex = track(new THREE.CanvasTexture(smokeCanvas));
  smokeTex.colorSpace = THREE.SRGBColorSpace;
  const smokeMats: Array<{ mat: THREE.SpriteMaterial; dayOpacity: number }> = [];
  // The smoke column is a property of the SCENE, not of the world data —
  // obscuration is what drives the fidelity ladder (model/fidelity.ts), so it
  // has to live where the ladder can read it.
  for (const s of SCENE.smoke.columnAt) {
    const smokeMaterial = track(new THREE.SpriteMaterial({
      map: smokeTex, transparent: true, opacity: SMOKE_OPACITY, depthWrite: false,
    }));
    smokeMats.push({ mat: smokeMaterial, dayOpacity: SMOKE_OPACITY });
    const sp = new THREE.Sprite(smokeMaterial);
    sp.scale.set(700, 560, 1);
    sp.position.copy(sceneVec(s.x, s.y, terrainY(s.x, s.y) + SMOKE_HEIGHT));
    scene.add(sp);
  }

  // ── Daylight ↔ LWIR rig (P2.3): one state machine, no duplicated scene ──
  const ambient = scene.children.find(
    (o): o is THREE.AmbientLight => (o as THREE.AmbientLight).isAmbientLight,
  );
  const dirLights = scene.children.filter(
    (o): o is THREE.DirectionalLight => (o as THREE.DirectionalLight).isDirectionalLight,
  );
  const applyMode = (mode: SceneMode): void => {
    const night = mode === "lwir";
    /* Both modes keep the gradient sky: a flat void was what made the terrain
     * end in a hard cut. LWIR shifts the fog colour, not the sky treatment. */
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.set(night ? lwir.void : 0x16273A);
      scene.fog.near = night ? 1400 : 1400;
      scene.fog.far = night ? 7000 : 7200;
    }
    if (ambient) {
      ambient.color.set(night ? 0x2a3038 : 0xd4e2f0);
      ambient.intensity = night ? 0.55 : 2.0;
    }
    if (dirLights[0]) {
      dirLights[0].color.set(night ? 0xff8a4a : 0xb4cce6);
      dirLights[0].intensity = night ? 0.35 : 1.5;
    }
    if (dirLights[1]) {
      dirLights[1].color.set(night ? 0x2a1408 : 0x76889f);
      dirLights[1].intensity = night ? 0.18 : 0.8;
    }
    terrainMesh.material = night ? terrainMatLwir : terrainMatDay;
    terrainGeom.setAttribute("color", night ? lwirColorAttr : dayColorAttr);
    for (const s of smokeMats) {
      s.mat.color.set(night ? lwir.plume : 0xffffff);
      s.mat.opacity = night ? Math.min(0.9, s.dayOpacity + 0.45) : s.dayOpacity;
    }
    // Night: the crest blooms hotter (white-hot core reads through the plume).
    fireLight.intensity = night ? 7.0 : 4.0;
  };

  return {
    scene,
    terrainY,
    sceneVec,
    setMode: applyMode,
    raycastTerrain: (ray) => {
      const hits = ray.intersectObject(terrainMesh, false);
      if (!hits.length) return null;
      const p = hits[0].point;
      return { lx: p.x, ly: -p.z };
    },
    ready: () => Promise.all(textureReady).then(() => undefined),
    dispose() {
      for (const d of disposables) d.dispose();
      scene.clear();
    },
  };
}

/** Camera pose matching the basemap bake (2D ↔ 3D visual continuity). */
export function homePose(camera: THREE.PerspectiveCamera): void {
  camera.position.set(400, 780, 3050);
  camera.lookAt(-150, 340, -600);
}
