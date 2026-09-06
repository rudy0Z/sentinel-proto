/**
 * Render-time entry — builds the low-poly diorama from the baked world
 * data (real USGS relief + OSM buildings/roads) and signals readiness.
 *
 * Aesthetic: stylized cartographic diorama — flat-shaded terrain facets
 * following real geology, clean building blocks, road ribbons, one warm
 * accent (fire band), blue-steel atmosphere. Mood reference: the original
 * painted basemap (ridge over residential, fire on the crest).
 */

import * as THREE from "three";
import { WORLD, sampleElevation } from "../src/app/map/world/world";

const NATIVE_W = 1691;
const NATIVE_H = 914;

// Vertical exaggeration — cartographic standard for dioramas; real 246m
// relief is subtle at frame scale. 1.4x keeps geology honest but visible.
const VEX = 1.4;

const PAL = {
  valley:  new THREE.Color("#2B3849"),
  mid:     new THREE.Color("#46586D"),
  ridge:   new THREE.Color("#7E93A9"),
  scrub:   new THREE.Color("#3E4F45"),  // steep-slope chaparral tint
  road:    new THREE.Color("#8296AA"),
  arterial:new THREE.Color("#A7BACD"),
  bldg:    new THREE.Color("#D6DFE8"),
  bldgBig: new THREE.Color("#B4C4D2"),
  fire:    new THREE.Color("#FF7A3C"),
  fireHi:  new THREE.Color("#FFB066"),
  smoke:   new THREE.Color("#8E99A6"),
  fog:     new THREE.Color("#263447"),
};

export function mount(canvas: HTMLCanvasElement, status: HTMLElement): void {
  const W = WORLD.frame.widthMeters;
  const H = WORLD.frame.heightMeters;

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, preserveDrawingBuffer: true, alpha: false,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(NATIVE_W, NATIVE_H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  scene.background = PAL.fog;
  scene.fog = new THREE.Fog(PAL.fog.getHex(), 2600, 6400);

  // Camera: low and close — the slab edges crop out of frame so the
  // terrain reads edge-to-edge like the original (which also never shows
  // its world's edges). SE azimuth toward the NW massif.
  const camera = new THREE.PerspectiveCamera(38, NATIVE_W / NATIVE_H, 1, 12000);
  camera.position.set(950, 620, 640);
  camera.lookAt(-500, 90, -260);

  // Orientation: ridge crest runs N-S on the frame's WEST side; residential
  // band runs E-W in the south. SE camera + scene z = -y (north is far).
  const toScene = (lx: number, ly: number): [number, number] => [lx, -ly];
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  // Lights: high ambient keeps every slope in the readable blue-steel band
  // (the original has no true blacks); NW key models relief; SE fill lifts.
  scene.add(new THREE.AmbientLight(0xd4e2f0, 2.1));
  const key = new THREE.DirectionalLight(0xb4cce6, 1.5);
  key.position.set(-900, 1400, 500); // NW, slightly behind camera so S slopes catch light
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x76889f, 0.8);
  fill.position.set(900, 500, 1000);
  scene.add(fill);

  // ── Terrain (real DEM, flat-shaded low-poly) ─────────────────────────────
  const cols = 100, rows = 55; // facet size ~20m — reads as crafted, not noisy
  const dem = WORLD.dem;
  const elevRange = dem.max - dem.min;

  function terrainY(x: number, y: number): number {
    return (sampleElevation(x, y) - dem.min) * VEX;
  }

  const terrainGeom = new THREE.PlaneGeometry(W, H, cols - 1, rows - 1);
  terrainGeom.rotateX(-Math.PI / 2); // now XZ plane; -z = north after flip below
  const pos = terrainGeom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const slopeOf = new Float32Array(pos.count);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      // PlaneGeometry after rotateX(-π/2): row 0 sits at z=-H/2 → north,
      // so local north ly = -z (spans [-H/2, +H/2] correctly).
      const px0 = pos.getX(i);
      const pz0 = pos.getZ(i);
      const lx = px0;          // local east
      const ly = -pz0;         // local north
      const [sx, sz] = toScene(lx, ly);
      pos.setX(i, sx);
      pos.setZ(i, sz);
      pos.setY(i, terrainY(lx, ly));
      const e0 = terrainY(lx, ly);
      const ex = terrainY(lx + 25, ly) - e0;
      const ey = terrainY(lx, ly + 25) - e0;
      slopeOf[i] = Math.hypot(ex, ey) / 25;
    }
  }
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, pos.getY(i) / (elevRange * VEX)));
    const col = new THREE.Color()
      .copy(PAL.valley)
      .lerp(PAL.mid, Math.min(1, t * 1.6))
      .lerp(PAL.ridge, Math.max(0, t - 0.45) * 1.5);
    // scrub tint on steep slopes
    col.lerp(PAL.scrub, Math.min(0.45, slopeOf[i] * 3.2));
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  terrainGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  terrainGeom.computeVertexNormals();
  worldGroup.add(new THREE.Mesh(terrainGeom, new THREE.MeshLambertMaterial({
    vertexColors: true, flatShading: true,
  })));

  // Base plinth: solid dark block under the terrain, reads as a carved
  // diorama model. MeshBasicMaterial — lighting-independent silhouette.
  const baseY = -80;
  const plinthColor = new THREE.Color("#141D2A");
  function plinthSide(points: Array<[number, number]>): THREE.Mesh {
    const verts: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [lx1, ly1] = toScene(points[i][0], -(points[i][1]));
      const [lx2, ly2] = toScene(points[i + 1][0], -(points[i + 1][1]));
      const y1 = terrainY(points[i][0], -(points[i][1]));
      const y2 = terrainY(points[i + 1][0], -(points[i + 1][1]));
      verts.push(lx1, y1, ly1,  lx1, baseY, ly1,  lx2, y2, ly2);
      verts.push(lx1, baseY, ly1,  lx2, baseY, ly2,  lx2, y2, ly2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    g.computeVertexNormals();
    return new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      color: plinthColor, side: THREE.DoubleSide,
    }));
  }
  const E = W / 2, Zh = H / 2;
  worldGroup.add(plinthSide([[ -E, -Zh ], [ E, -Zh ]]));
  worldGroup.add(plinthSide([[ -E, Zh ], [ E, Zh ]]));
  worldGroup.add(plinthSide([[ -E, -Zh ], [ -E, Zh ]]));
  worldGroup.add(plinthSide([[ E, -Zh ], [ E, Zh ]]));
  // bottom cap
  {
    const g = new THREE.PlaneGeometry(W, H);
    g.rotateX(Math.PI / 2);
    const cap = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: plinthColor }));
    cap.position.y = baseY;
    worldGroup.add(cap);
  }

  // ── Roads (real centerlines, draped, clipped to frame) ────────────────────
  const roadMat = (kind: string) => new THREE.MeshLambertMaterial({
    color: kind === "primary" || kind === "secondary" || kind === "tertiary"
      ? PAL.arterial : PAL.road,
  });
  const E2 = W / 2, Zh2 = H / 2;
  for (const road of WORLD.roads) {
    // clip: keep points inside the frame (with 30m grace), split on exit
    const segments: Array<Array<[number, number]>> = [];
    let cur: Array<[number, number]> = [];
    for (const [x, y] of road.points) {
      if (Math.abs(x) <= E2 + 30 && Math.abs(y) <= Zh2 + 30) {
        cur.push([x, y]);
      } else if (cur.length) {
        segments.push(cur); cur = [];
      }
    }
    if (cur.length) segments.push(cur);
    for (const seg of segments) {
      if (seg.length < 2) continue;
      const pts = seg.map(([x, y]) => {
        const [sx, sz] = toScene(x, y);
        return new THREE.Vector3(sx, terrainY(x, y) + 1.2, sz);
      });
      const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1);
      const segs = Math.min(160, Math.max(12, pts.length * 8));
      const geom = new THREE.TubeGeometry(curve, segs, road.width / 2, 5, false);
      worldGroup.add(new THREE.Mesh(geom, roadMat(road.kind)));
    }
  }

  // ── Buildings (real footprints, extruded blocks) ─────────────────────────
  function defaultHeight(kind: string): number {
    if (/garage|shed|roof|hut/.test(kind)) return 3;
    if (/commercial|retail|office|industrial|warehouse|church|school/.test(kind)) return 9;
    return 5.5; // house / yes / residential
  }
  const bldgGeoCache = new Map<string, THREE.BufferGeometry>();
  const bldgGroup = new THREE.Group();
  for (const b of WORLD.buildings) {
    let minX = Infinity, maxX = -Infinity, minZv = Infinity, maxZv = -Infinity;
    let cx = 0, cy = 0;
    for (const [x, y] of b.footprint) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minZv = Math.min(minZv, y); maxZv = Math.max(maxZv, y);
      cx += x; cy += y;
    }
    cx /= b.footprint.length; cy /= b.footprint.length;
    const [scx, scz] = toScene(cx, cy);
    const sx = Math.max(4, maxX - minX);
    const sz = Math.max(4, maxZv - minZv);
    const h = (b.height ?? defaultHeight(b.kind)) * 2.2; // diorama scale
    const groundY = terrainY(cx, cy);
    const key = `${sx.toFixed(0)}x${sz.toFixed(0)}x${h.toFixed(0)}`;
    let geo = bldgGeoCache.get(key);
    if (!geo) {
      geo = new THREE.BoxGeometry(sx * 0.9, h, sz * 0.9);
      bldgGeoCache.set(key, geo);
    }
    const big = sx * sz > 300;
    const mat = new THREE.MeshLambertMaterial({ color: big ? PAL.bldgBig : PAL.bldg });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(scx, groundY + h / 2 - 2.5, scz); // sink 2.5m so none float on slopes
    bldgGroup.add(mesh);
  }
  worldGroup.add(bldgGroup);

  // ── Fire (authored ridge band, diegetic warm light) ──────────────────────
  const fireGroup = new THREE.Group();
  const band = WORLD.fire.band;
  for (let i = 0; i < band.length - 1; i++) {
    const a = band[i], b = band[i + 1];
    const [ax, az] = toScene(a.x, a.y);
    const [bx, bz] = toScene(b.x, b.y);
    const len = Math.hypot(bx - ax, bz - az);
    const segGeom = new THREE.BoxGeometry(len, 6, 14);
    const mat = new THREE.MeshBasicMaterial({
      color: a.intensity > 0.85 ? PAL.fireHi : PAL.fire,
    });
    const seg = new THREE.Mesh(segGeom, mat);
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const mly = (a.y + b.y) / 2, mlx = (a.x + b.x) / 2;
    seg.position.set(mx, terrainY(mlx, mly) + 14, mz);
    seg.rotation.y = -Math.atan2(bz - az, bx - ax);
    fireGroup.add(seg);

    // glow disc under each intense segment
    if (a.intensity > 0.6) {
      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(55 * a.intensity, 12),
        new THREE.MeshBasicMaterial({
          color: PAL.fire, transparent: true, opacity: 0.3 * a.intensity,
          side: THREE.DoubleSide, depthWrite: false,
        }),
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(mx, terrainY(mlx, mly) + 1.0, mz);
      fireGroup.add(glow);
    }
  }
  const fireMid = band[Math.floor(band.length / 2)];
  const fireLight = new THREE.PointLight(PAL.fire.getHex(), 3.5, 900, 2);
  {
    const [fsx, fsz] = toScene(fireMid.x, fireMid.y);
    fireLight.position.set(fsx, terrainY(fireMid.x, fireMid.y) + 60, fsz);
  }
  worldGroup.add(fireLight);
  worldGroup.add(fireGroup);

  // ── Smoke (radial-gradient sprites, not flat rectangles) ──────────────────
  function smokeTexture(): THREE.Texture {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    grad.addColorStop(0, "rgba(190,200,212,0.55)");
    grad.addColorStop(0.55, "rgba(150,162,178,0.28)");
    grad.addColorStop(1, "rgba(140,152,168,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const smokeTex = smokeTexture();
  for (const s of WORLD.fire.smoke) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({
      map: smokeTex, transparent: true, opacity: s.opacity,
      depthWrite: false,
    }));
    m.scale.set(320, 260, 1);
    {
      const [ssx, ssz] = toScene(s.x, s.y);
      m.position.set(ssx, terrainY(s.x, s.y) + s.height, ssz);
    }
    worldGroup.add(m);
  }


  // ── Render ────────────────────────────────────────────────────────────────
  renderer.render(scene, camera);

  // PNG extraction via readPixels → 2D canvas (canvas.toDataURL races with
  // the framebuffer clear in headless Chromium).
  const gl = renderer.getContext();
  const pixels = new Uint8Array(NATIVE_W * NATIVE_H * 4);
  gl.readPixels(0, 0, NATIVE_W, NATIVE_H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const flipped = new Uint8ClampedArray(NATIVE_W * NATIVE_H * 4);
  const rowBytes = NATIVE_W * 4;
  for (let y = 0; y < NATIVE_H; y++) {
    const src = (NATIVE_H - 1 - y) * rowBytes;
    flipped.set(pixels.subarray(src, src + rowBytes), y * rowBytes);
  }
  const c2d = document.createElement("canvas");
  c2d.width = NATIVE_W; c2d.height = NATIVE_H;
  const ctx = c2d.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  ctx.putImageData(new ImageData(flipped, NATIVE_W, NATIVE_H), 0, 0);
  const dataUrl = c2d.toDataURL("image/png");

  status.textContent = `rendered · ${WORLD.buildings.length} bldgs · ${WORLD.roads.length} roads · ${cols}x${rows} terrain · ${(dataUrl.length / 1024).toFixed(0)}KB`;
  status.dataset.ready = "1";
  status.dataset.pngDataUrl = dataUrl;
}

declare global {
  interface Window {
    __renderWorld: (canvas: HTMLCanvasElement, status: HTMLElement) => void;
  }
}
window.__renderWorld = (canvas, status) => mount(canvas, status);
