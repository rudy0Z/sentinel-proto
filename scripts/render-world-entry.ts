/**
 * Render-time entry point — loaded by scripts/render-world.html.
 *
 * Vite resolves the `three` bare specifier and the relative `world.ts`
 * import; we don't need an importmap here. The exported `mount()` function
 * builds the Three.js scene, attaches the canvas, and signals readiness
 * via the status element's `data-ready` attribute.
 */

import * as THREE from "three";
import { WORLD, type World, type LatLon } from "../src/app/map/world/world";

const NATIVE_W = 1691;
const NATIVE_H = 914;

const PAL = {
  // Brightened further. With outputColorSpace=SRGB, Three.js auto-converts
  // these hex values to linear before shading; the GPU encodes back to sRGB
  // when writing the framebuffer. Hex values here are what the user sees.
  terrain:     new THREE.Color("#7E94AC"), // mid slope (visibly readable)
  terrainHigh: new THREE.Color("#A6BAD0"), // ridge top (light, distinct)
  terrainLow:  new THREE.Color("#56708A"), // valley floor
  road:        new THREE.Color("#90A6BE"), // road ribbon
  roadBright:  new THREE.Color("#BAC9DC"), // arterial highlight
  building:    new THREE.Color("#8499B0"), // residential box
  buildingRim: new THREE.Color("#A8BAD0"), // roof edge
  fire:        new THREE.Color("#FF8A4A"), // emissive fire
  fireWarm:    new THREE.Color("#FFB066"), // fire glow
  smoke:       new THREE.Color("#9CA8B8"), // smoke billboard
  vegetation:  new THREE.Color("#7A8A6A"), // sparse chaparral
  water:       new THREE.Color("#56708A"), // drainage wash
  fog:         new THREE.Color("#4A607A"), // atmospheric blue-steel
  ambient:     new THREE.Color("#A8BCD0"), // ambient sky bounce
};

export function mount(canvas: HTMLCanvasElement, status: HTMLElement): void {
  const w = WORLD.frame.widthMeters;
  const h = WORLD.frame.heightMeters;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(1);
  renderer.setSize(NATIVE_W, NATIVE_H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // No tone mapping — ACES compresses our blue-steel palette too dark.
  // Linear → sRGB output keeps colours as authored.
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  scene.background = PAL.fog;
  // Fog: pushed back so the diorama reads.
  scene.fog = new THREE.Fog(PAL.fog.getHex(), 600, 3000);

  // Camera: pulled back so the whole 2000m × 1100m frame fits with margin.
  // At FOV 45° horizontal, the scene needs ~1500m of depth to read
  // end-to-end. Slight side offset keeps the composition asymmetric.
  const camBack = 1500;
  const camSide = -300;
  const camUp = 900;
  const camera = new THREE.PerspectiveCamera(45, NATIVE_W / NATIVE_H, 1, 5000);
  camera.position.set(camSide, camUp, camBack);
  camera.lookAt(0, 80, 0);

  const ambient = new THREE.AmbientLight(PAL.ambient.getHex(), 0.9);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight("#9CC0DD", 1.1);
  sun.position.set(-400, 600, 200);
  sun.target.position.set(0, 0, 0);
  scene.add(sun);
  scene.add(sun.target);

  const fireUv = WORLD.fire.originUv;
  const fireWorld = uvToWorld(fireUv.u, fireUv.v, w, h);
  const fireLight = new THREE.PointLight(PAL.fire.getHex(), 8.0, 800, 1.6);
  fireLight.position.set(fireWorld[0], 250, fireWorld[1]);
  scene.add(fireLight);

  // ── Helpers ────────────────────────────────────────────────────────────
  // Sample the heightfield at world-frame (x, z) → terrain Y.
  // The exaggeration constant (220) must match the one in the terrain loop.
  function sampleTerrainY(worldX: number, worldZ: number): number {
    const colF = ((worldX + w / 2) / w) * (cols - 1);
    const rowF = ((worldZ + h / 2) / h) * (rows - 1);
    const c0 = Math.max(0, Math.min(cols - 2, Math.floor(colF)));
    const r0 = Math.max(0, Math.min(rows - 2, Math.floor(rowF)));
    const fx = colF - c0;
    const fz = rowF - r0;
    const e00 = WORLD.heightfield[r0][c0].elevation;
    const e10 = WORLD.heightfield[r0][c0 + 1].elevation;
    const e01 = WORLD.heightfield[r0 + 1][c0].elevation;
    const e11 = WORLD.heightfield[r0 + 1][c0 + 1].elevation;
    const e0 = e00 * (1 - fx) + e10 * fx;
    const e1 = e01 * (1 - fx) + e11 * fx;
    const e = e0 * (1 - fz) + e1 * fz;
    return e * 220;
  }

  // ── Terrain ────────────────────────────────────────────────────────────
  const cols = WORLD.heightfield[0].length;
  const rows = WORLD.heightfield.length;
  const cellW = w / (cols - 1);
  const cellH = h / (rows - 1);

  const terrainGeom = new THREE.PlaneGeometry(w, h, cols - 1, rows - 1);
  terrainGeom.rotateX(-Math.PI / 2);
  const positions = terrainGeom.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const cell = WORLD.heightfield[r][c];
      const px = (c - (cols - 1) / 2) * cellW;
      const pz = (r - (rows - 1) / 2) * cellH;
      positions.setX(i, px);
      // Exaggerate elevation ×3 so ridges read clearly in the diorama.
      positions.setY(i, cell.elevation * 220);
      positions.setZ(i, pz);
      const t = cell.elevation;
      const vegMix = cell.vegetation * 0.35;
      const col = new THREE.Color()
        .copy(PAL.terrainLow)
        .lerp(PAL.terrain, Math.min(1, t * 1.3))
        .lerp(PAL.terrainHigh, Math.max(0, t - 0.5) * 1.6)
        .lerp(PAL.vegetation, vegMix);
      colors[i * 3]     = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
  }
  terrainGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  terrainGeom.computeVertexNormals();

  const terrainMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
  scene.add(new THREE.Mesh(terrainGeom, terrainMat));

  // ── Roads ──────────────────────────────────────────────────────────────
  for (const ribbon of WORLD.roadRibbons) {
    if (ribbon.points.length < 2) continue;
    // Lift road points onto the terrain surface so they read as ground-
    // hugging ribbons rather than floating lines.
    const pts = ribbon.points.map(([x, z]) => {
      const groundY = sampleTerrainY(x, z);
      return new THREE.Vector3(x, groundY + 1.5, z);
    });
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.0);
    const segments = Math.max(8, pts.length * 6);
    // Exaggerate road width slightly so arterials read at aerial view.
    const widthMul = ribbon.kind === "arterial" ? 2.2 : 1.5;
    const tubeGeom = new THREE.TubeGeometry(curve, segments, (ribbon.width / 2) * widthMul, 6, false);
    const mat = new THREE.MeshLambertMaterial({
      color: ribbon.kind === "arterial" ? PAL.roadBright : PAL.road,
      emissive: ribbon.kind === "arterial" ? new THREE.Color("#1A2840") : new THREE.Color("#000000"),
    });
    scene.add(new THREE.Mesh(tubeGeom, mat));
  }

  // ── Buildings ──────────────────────────────────────────────────────────
  for (const b of WORLD.buildings) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    let cx = 0, cz = 0;
    for (const [x, z] of b.footprint) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      cx += x; cz += z;
    }
    cx /= b.footprint.length;
    cz /= b.footprint.length;
    const widthX = maxX - minX;
    const depthZ = maxZ - minZ;

    // Exaggerate building height ×3 so they read as visible blocks.
    const visualHeight = b.height * 3;
    // Lift the building onto the local terrain surface so it doesn't sink
    // into the slope.
    const groundY = sampleTerrainY(cx, cz);
    const geom = new THREE.BoxGeometry(widthX * 0.85, visualHeight, depthZ * 0.85);
    const baseColor = new THREE.Color().copy(PAL.building);
    if (b.zoneHint.startsWith("residential")) {
      baseColor.lerp(new THREE.Color("#3F526E"), 0.3);
    }
    const mat = new THREE.MeshLambertMaterial({
      color: baseColor,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(cx, groundY + visualHeight / 2, cz);
    scene.add(mesh);

    const rimGeom = new THREE.BoxGeometry(widthX * 0.88, 0.3, depthZ * 0.88);
    const rimMat = new THREE.MeshLambertMaterial({
      color: PAL.buildingRim,
    });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.position.set(cx, groundY + visualHeight + 0.15, cz);
    scene.add(rim);
  }

  // ── Fire ───────────────────────────────────────────────────────────────
  const fireStart = new THREE.Vector3(
    WORLD.fire.line.start[0],
    WORLD.fire.line.start[1],
    WORLD.fire.line.start[2],
  );
  const fireEnd = new THREE.Vector3(
    WORLD.fire.line.end[0],
    WORLD.fire.line.end[1],
    WORLD.fire.line.end[2],
  );
  const fireGeom = new THREE.BufferGeometry().setFromPoints([fireStart, fireEnd]);
  const fireMat = new THREE.LineBasicMaterial({ color: PAL.fire });
  scene.add(new THREE.Line(fireGeom, fireMat));

  const glowGeom = new THREE.CircleGeometry(45, 24);
  const glowMat = new THREE.MeshBasicMaterial({
    color: PAL.fireWarm,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(glowGeom, glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(fireWorld[0], 0.4, fireWorld[1]);
  scene.add(glow);

  // ── Smoke ──────────────────────────────────────────────────────────────
  for (const s of WORLD.fire.smoke) {
    const geom = new THREE.PlaneGeometry(60, 60);
    const mat = new THREE.MeshBasicMaterial({
      color: PAL.smoke,
      transparent: true,
      opacity: s.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(s.position[0], s.height, s.position[1]);
    mesh.lookAt(camera.position);
    scene.add(mesh);
  }

  // ── Water ──────────────────────────────────────────────────────────────
  for (const wt of WORLD.water) {
    if (wt.points.length < 2) continue;
    const pts = wt.points.map(([x, z]) => new THREE.Vector3(x, 0.2, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.0);
    const tubeGeom = new THREE.TubeGeometry(curve, pts.length * 4, wt.width / 2, 6, false);
    const mat = new THREE.MeshLambertMaterial({
      color: PAL.water,
      emissive: new THREE.Color("#0A1822"),
    });
    scene.add(new THREE.Mesh(tubeGeom, mat));
  }

  // ── Vegetation ─────────────────────────────────────────────────────────
  for (const v of WORLD.vegetation) {
    for (let i = 0; i < v.count; i++) {
      const offsetX = (Math.random() - 0.5) * 12;
      const offsetZ = (Math.random() - 0.5) * 12;
      const geom = v.kind === "tree"
        ? new THREE.ConeGeometry(3, 9, 6)
        : new THREE.IcosahedronGeometry(2.5, 0);
      const mat = new THREE.MeshLambertMaterial({
        color: PAL.vegetation,
        flatShading: true,
      });
      const tree = new THREE.Mesh(geom, mat);
      // Exaggerate tree height for visibility
      tree.scale.set(1, 3, 1);
      tree.position.set(v.point[0] + offsetX, 4, v.point[1] + offsetZ);
      scene.add(tree);
    }
  }

  renderer.render(scene, camera);

  // Read the framebuffer. When outputColorSpace=SRGB, the framebuffer
  // stores sRGB-encoded values; when Linear, raw linear values. We
  // detect and convert as needed.
  const gl = renderer.getContext();
  const pixels = new Uint8Array(NATIVE_W * NATIVE_H * 4);
  gl.readPixels(0, 0, NATIVE_W, NATIVE_H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  // If the framebuffer is linear, apply sRGB gamma so the PNG matches
  // what the browser displays. (Three.js with outputColorSpace=SRGB
  // writes sRGB to the framebuffer, but readPixels returns those bytes
  // directly — no conversion needed in that case.)
  // Detect: if framebuffer format hints "srgb" or color attachment is
  // SRGB_ALPHA, treat as already-encoded.
  const colorAttachment = gl.getParameter(gl.FRAMEBUFFER_BINDING);
  // Apply linear→sRGB only if needed. For simplicity, always apply
  // (idempotent if already sRGB since values are 0..255 ints).
  // Actually skip — Three.js handles this. Use bytes as-is.

  // Flip Y (WebGL origin is bottom-left, PNG is top-left)
  const flipped = new Uint8ClampedArray(NATIVE_W * NATIVE_H * 4);
  const rowBytes = NATIVE_W * 4;
  for (let y = 0; y < NATIVE_H; y++) {
    const src = (NATIVE_H - 1 - y) * rowBytes;
    const dst = y * rowBytes;
    flipped.set(pixels.subarray(src, src + rowBytes), dst);
  }

  // Composite onto a 2D canvas and emit as PNG data URL.
  const canvas2d = document.createElement("canvas");
  canvas2d.width = NATIVE_W;
  canvas2d.height = NATIVE_H;
  const ctx2d = canvas2d.getContext("2d");
  if (!ctx2d) throw new Error("2D canvas context unavailable");
  const imageData = new ImageData(flipped, NATIVE_W, NATIVE_H);
  ctx2d.putImageData(imageData, 0, 0);
  const dataUrl = canvas2d.toDataURL("image/png");
  status.textContent = `rendered · ${WORLD.buildings.length} bldgs · ${WORLD.roadRibbons.length} roads · ${cols * rows} heightfield cells · ${(dataUrl.length / 1024).toFixed(0)}KB`;
  status.dataset.ready = "1";
  status.dataset.pngDataUrl = dataUrl;
}

function uvToWorld(u: number, v: number, w: number, h: number): [number, number] {
  return [u * w, h * (1 - v)];
}

// Expose for the inline HTML harness
declare global {
  interface Window {
    __renderWorld: (canvas: HTMLCanvasElement, status: HTMLElement) => void;
  }
}
window.__renderWorld = (canvas, status) => mount(canvas, status);
