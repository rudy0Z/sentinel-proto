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

// Vertical exaggeration for the diorama read.
export const VEX = 1.6;

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

export function makeScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = PAL.fog;
  scene.fog = new THREE.Fog(PAL.fog.getHex(), 3500, 11000);
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
    return (sampleElevation(world, lx, ly) - dem.min) * VEX;
  }
  function sceneVec(lx: number, ly: number, y: number): THREE.Vector3 {
    return new THREE.Vector3(lx, y, -ly);
  }

  const disposables: Array<{ dispose(): void }> = [];
  function track<T extends { dispose(): void }>(obj: T): T {
    disposables.push(obj);
    return obj;
  }

  // ── Terrain ─────────────────────────────────────────────────────────────
  const cols = 240, rows = 130;
  const terrainGeom = track(new THREE.PlaneGeometry(W, H, cols - 1, rows - 1));
  terrainGeom.rotateX(-Math.PI / 2);
  const pos = terrainGeom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
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
  }
  terrainGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  terrainGeom.computeVertexNormals();
  scene.add(new THREE.Mesh(terrainGeom, track(new THREE.MeshLambertMaterial({
    vertexColors: true, flatShading: true,
  }))));

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

  // ── Fire: 2 draw calls total (1 merged band + 1 merged glow) ────────────
  const fireGroup = new THREE.Group();
  const band = world.fire.band;
  {
    const verts: number[] = [];
    const cols: number[] = [];
    const glowVerts: number[] = [];
    const glowCols: number[] = [];
    const BOX_H = 10, BOX_W = 22;
    for (let i = 0; i < band.length - 1; i++) {
      const a = band[i], b = band[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const mlx = (a.x + b.x) / 2, mly = (a.y + b.y) / 2;
      const col = a.intensity > 0.85 ? PAL.fireHi : PAL.fire;
      // oriented box corners in world-local metres (scene y = terrain + 22)
      const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
      const px = -uy * (BOX_W / 2), py = ux * (BOX_W / 2);
      const yLo = terrainY(mlx, mly) + 22 - BOX_H / 2;
      const yHi = yLo + BOX_H;
      const hl = len / 2;
      // 8 corners: along ±hl, across ±p, up yLo/yHi
      const c = [
        [mlx - ux * hl + px, mly - uy * hl + py, yLo], [mlx - ux * hl - px, mly - uy * hl - py, yLo],
        [mlx + ux * hl - px, mly + uy * hl - py, yLo], [mlx + ux * hl + px, mly + uy * hl + py, yLo],
        [mlx - ux * hl + px, mly - uy * hl + py, yHi], [mlx - ux * hl - px, mly - uy * hl - py, yHi],
        [mlx + ux * hl - px, mly + uy * hl - py, yHi], [mlx + ux * hl + px, mly + uy * hl + py, yHi],
      ];
      const faces = [
        [0, 1, 2], [1, 3, 2], // bottom
        [4, 6, 5], [5, 6, 7], // top
        [0, 4, 1], [1, 4, 5], // side A
        [2, 3, 6], [3, 7, 6], // side B
        [0, 2, 4], [2, 6, 4], // end +
        [1, 5, 3], [3, 5, 7], // end −
      ];
      for (const f of faces) {
        for (const idx of f) {
          verts.push(c[idx][0], c[idx][2], -c[idx][1]);
          cols.push(col.r, col.g, col.b);
        }
      }

      if (a.intensity > 0.6) {
        // glow disc, fanned in world space just above the terrain;
        // per-vertex alpha preserves the 0.26 × intensity falloff
        const gy = terrainY(mlx, mly) + 2;
        const r = 120 * a.intensity;
        const alpha = 0.26 * a.intensity;
        const n = 12;
        for (let s = 0; s < n; s++) {
          const a0 = (s / n) * Math.PI * 2, a1 = ((s + 1) / n) * Math.PI * 2;
          glowVerts.push(mlx, gy, -mly);
          glowVerts.push(mlx + Math.cos(a0) * r, gy, -(mly + Math.sin(a0) * r));
          glowVerts.push(mlx + Math.cos(a1) * r, gy, -(mly + Math.sin(a1) * r));
          for (let k = 0; k < 3; k++) glowCols.push(PAL.fire.r, PAL.fire.g, PAL.fire.b, alpha);
        }
      }
    }
    const bandGeom = track(new THREE.BufferGeometry());
    bandGeom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    bandGeom.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    fireGroup.add(new THREE.Mesh(bandGeom, track(new THREE.MeshBasicMaterial({
      color: 0xffffff, vertexColors: true,
      // hand-wound faces: DoubleSide makes winding order irrelevant
      side: THREE.DoubleSide,
    }))));
    const glowGeom = track(new THREE.BufferGeometry());
    glowGeom.setAttribute("position", new THREE.Float32BufferAttribute(glowVerts, 3));
    glowGeom.setAttribute("color", new THREE.Float32BufferAttribute(glowCols, 4));
    fireGroup.add(new THREE.Mesh(glowGeom, track(new THREE.MeshBasicMaterial({
      color: 0xffffff, vertexColors: true, transparent: true,
      side: THREE.DoubleSide, depthWrite: false,
    }))));
  }
  const fireMid = band[Math.floor(band.length / 2)];
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
  for (const s of world.fire.smoke) {
    const sp = new THREE.Sprite(track(new THREE.SpriteMaterial({
      map: smokeTex, transparent: true, opacity: s.opacity, depthWrite: false,
    })));
    sp.scale.set(700, 560, 1);
    sp.position.copy(sceneVec(s.x, s.y, terrainY(s.x, s.y) + s.height));
    scene.add(sp);
  }

  return {
    scene,
    terrainY,
    sceneVec,
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
