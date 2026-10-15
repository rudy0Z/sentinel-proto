/**
 * Hairline Instrument world — rendition 01 (docs/redesign-2026/14).
 *
 * One world dataset, a different render language: hairline edges, contour
 * isolines, matte value-separated fills, and glow reserved exclusively for
 * live operational state. Consumes the SAME baked world data + the SAME
 * derived overlay data (overlayData.ts — single source of truth) as the
 * original diorama; shares no visual code with it.
 *
 * Coordinate convention (inherited from the world frame): local metres,
 * origin = frame center, +x east, +y north. Scene mapping: (x, elev, -y).
 */

import * as THREE from "three";
import { HAIRLINE, VEX } from "./palette";
import { W, H, sampleElevation, sampleVegetation, type World } from "../world/world";
import { overlayData, CORRIDOR_TONE, DEFAULT_CORRIDOR_STATUS } from "../runtime/overlayData";
import { MAP_NATIVE } from "../frame";
import { createDroneRoster } from "../../mockData";
import { T } from "../../tokens";

// ── Small helpers ────────────────────────────────────────────────────────────

/** Seeded PRNG — the rendition must be reproducible run to run. */
function makeRand(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Break a polyline (flat lx,ly pairs) into ≤step-metre segments so drapes follow terrain. */
function subdivideFlat(flat: number[], step: number, closed: boolean): number[] {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
  if (closed && pts.length > 1) {
    const f = pts[0];
    const l = pts[pts.length - 1];
    if (Math.abs(f[0] - l[0]) < 0.5 && Math.abs(f[1] - l[1]) < 0.5) pts.pop();
  }
  const out: number[] = [];
  const n = pts.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.round(len / step));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
    }
  }
  if (!closed && n > 0) out.push(pts[n - 1][0], pts[n - 1][1]);
  return out;
}

/** Soft radial glow sprite (canvas-generated, one texture shared by all beacons). */
function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.35, "rgba(255,255,255,0.38)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// ── Scene builder ────────────────────────────────────────────────────────────

export interface HairlineWorld {
  terrainY(lx: number, ly: number): number;
  sceneVec(lx: number, ly: number, y: number): THREE.Vector3;
  incident: { lx: number; ly: number };
  ring60Radius: number;
  stats: { buildings: number; trees: number };
  dispose(): void;
}

export function buildHairlineWorld(scene: THREE.Scene, world: World): HairlineWorld {
  const disposables: Array<{ dispose(): void }> = [];
  const added: THREE.Object3D[] = [];
  function track<T extends { dispose(): void }>(obj: T): T {
    disposables.push(obj);
    return obj;
  }
  function add(obj: THREE.Object3D): void {
    added.push(obj);
    scene.add(obj);
  }

  const elevMin = world.dem.min;
  const elevRange = Math.max(1, world.dem.max - world.dem.min);
  function terrainY(lx: number, ly: number): number {
    return (sampleElevation(world, lx, ly) - elevMin) * VEX;
  }
  function sceneVec(lx: number, ly: number, y: number): THREE.Vector3 {
    return new THREE.Vector3(lx, y, -ly);
  }

  const incident = { ...overlayData.spreadRings[0].center };
  const ring60 = overlayData.spreadRings[overlayData.spreadRings.length - 1];

  // ── Atmosphere: fog + gradient sky dome (kills the flat-band seam) ───────
  scene.background = new THREE.Color(HAIRLINE.fog);
  scene.fog = new THREE.Fog(new THREE.Color(HAIRLINE.fog).getHex(), 3800, 13000);
  {
    const skyGeo = track(new THREE.SphereGeometry(12000, 24, 16));
    const skyMat = track(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(HAIRLINE.skyTop) },
          uHorizon: { value: new THREE.Color(HAIRLINE.skyHorizon) },
        },
        vertexShader: `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          varying vec3 vPos;
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          void main() {
            float t = smoothstep(-0.06, 0.55, normalize(vPos).y);
            gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0);
          }`,
      }),
    );
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.renderOrder = -1;
    add(sky);
  }

  // ── Light rig: cool night key, never warm ──────────────────────────────────
  add(new THREE.AmbientLight(new THREE.Color(HAIRLINE.ambient), 1.35));
  const key = new THREE.DirectionalLight(new THREE.Color(HAIRLINE.key), 1.15);
  key.position.set(-2200, 3000, 1400);
  add(key);
  const fill = new THREE.DirectionalLight(new THREE.Color(HAIRLINE.fill), 0.45);
  fill.position.set(2400, 1200, 2600);
  add(fill);

  // ── Terrain: DEM mesh, hypsometric value ramp, contour isolines ───────────
  const cols = 240;
  const rows = 130;
  const terrainGeom = track(new THREE.PlaneGeometry(W, H, cols - 1, rows - 1));
  terrainGeom.rotateX(-Math.PI / 2);
  const pos = terrainGeom.attributes.position as THREE.BufferAttribute;
  const slopeOf = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const ly = -pos.getZ(i);
    const e0 = terrainY(lx, ly);
    pos.setY(i, e0);
    const ex = terrainY(lx + 40, ly) - e0;
    const ey = terrainY(lx, ly + 40) - e0;
    slopeOf[i] = Math.hypot(ex, ey) / 40;
  }
  const colors = new Float32Array(pos.count * 3);
  {
    const h0 = new THREE.Color(HAIRLINE.hypso[0]);
    const h1 = new THREE.Color(HAIRLINE.hypso[1]);
    const h2 = new THREE.Color(HAIRLINE.hypso[2]);
    const tint = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const ly = -pos.getZ(i);
      const t = Math.min(1, Math.max(0, pos.getY(i) / (elevRange * VEX)));
      if (t < 0.5) tint.copy(h0).lerp(h1, t * 2);
      else tint.copy(h1).lerp(h2, (t - 0.5) * 2);
      const vegHex = HAIRLINE.veg[sampleVegetation(world, lx, ly)];
      if (vegHex) tint.lerp(new THREE.Color(vegHex), HAIRLINE.vegLerp);
      const slopeDim = 1 - Math.min(0.2, Math.max(0, slopeOf[i] - HAIRLINE.slopeFloor) * 0.5);
      tint.multiplyScalar(slopeDim);
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
    }
  }
  terrainGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  terrainGeom.computeVertexNormals();
  const terrainMat = track(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  // Contour isolines — world-space elevation, fwidth-AA'd, mixed BEFORE fog so
  // they fade with distance like everything else.
  terrainMat.onBeforeCompile = (shader) => {
    shader.uniforms.uContourMinor = { value: new THREE.Color(HAIRLINE.contourMinor) };
    shader.uniforms.uContourMajor = { value: new THREE.Color(HAIRLINE.contourMajor) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vElev;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvElev = (modelMatrix * vec4(position, 1.0)).y;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying float vElev;
uniform vec3 uContourMinor;
uniform vec3 uContourMajor;`,
      )
      .replace(
        "#include <fog_fragment>",
        `{
  float stepMinor = ${HAIRLINE.contourStep.toFixed(1)};
  float relMinor = abs(fract(vElev / stepMinor + 0.5) - 0.5) * stepMinor;
  float wMinor = fwidth(vElev) * 1.25;
  float minor = 1.0 - smoothstep(0.0, wMinor, relMinor);
  float stepMajor = stepMinor * ${HAIRLINE.contourMajorEvery.toFixed(1)};
  float relMajor = abs(fract(vElev / stepMajor + 0.5) - 0.5) * stepMajor;
  float wMajor = fwidth(vElev) * 1.45;
  float major = 1.0 - smoothstep(0.0, wMajor, relMajor);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uContourMinor, minor * ${HAIRLINE.contourMinorOpacity.toFixed(2)});
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uContourMajor, major * ${HAIRLINE.contourMajorOpacity.toFixed(2)});
}
#include <fog_fragment>`,
      );
  };
  add(new THREE.Mesh(terrainGeom, terrainMat));

  // ── Plinth: one merged skirt so the frame reads as an instrument plate ────
  {
    const baseY = -160;
    const E = W / 2;
    const Zh = H / 2;
    const verts: number[] = [];
    const edges: Array<[[number, number], [number, number]]> = [
      [[-E, Zh], [E, Zh]],
      [[-E, -Zh], [E, -Zh]],
      [[-E, -Zh], [-E, Zh]],
      [[E, -Zh], [E, Zh]],
    ];
    for (const [a, b] of edges) {
      const v1 = sceneVec(a[0], a[1], terrainY(a[0], a[1]));
      const v2 = sceneVec(a[0], a[1], baseY);
      const v3 = sceneVec(b[0], b[1], terrainY(b[0], b[1]));
      const v4 = sceneVec(b[0], b[1], baseY);
      verts.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
      verts.push(v2.x, v2.y, v2.z, v4.x, v4.y, v4.z, v3.x, v3.y, v3.z);
    }
    const g = track(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    g.computeVertexNormals();
    add(
      new THREE.Mesh(
        g,
        track(new THREE.MeshBasicMaterial({ color: HAIRLINE.plinth, side: THREE.DoubleSide })),
      ),
    );
  }

  // ── Roads: arterial lane + hairline centerlines (2 draws) ─────────────────
  {
    const laneVerts: number[] = [];
    const lineVerts: number[] = [];
    const lineCols: number[] = [];
    const arterialC = new THREE.Color(HAIRLINE.roadArterial);
    const localC = new THREE.Color(HAIRLINE.roadLocal);
    const isArterial = (kind: string) =>
      kind === "primary" || kind === "secondary" || kind === "tertiary";
    for (const road of world.roads) {
      // Clip to frame, then subdivide for terrain-following drape.
      const clipped: Array<[number, number]> = [];
      const segs: Array<Array<[number, number]>> = [];
      for (const p of road.points) {
        if (Math.abs(p[0]) <= W / 2 + 60 && Math.abs(p[1]) <= H / 2 + 60) clipped.push([p[0], p[1]]);
        else if (clipped.length) {
          segs.push(clipped.splice(0));
        }
      }
      if (clipped.length) segs.push(clipped);
      const arterial = isArterial(road.kind);
      for (const seg of segs) {
        if (seg.length < 2) continue;
        const flat: number[] = [];
        for (const p of seg) flat.push(p[0], p[1]);
        const dense = subdivideFlat(flat, 30, false);
        const col = arterial ? arterialC : localC;
        for (let i = 0; i < dense.length - 2; i += 2) {
          const y1 = terrainY(dense[i], dense[i + 1]) + 1.8;
          const y2 = terrainY(dense[i + 2], dense[i + 3]) + 1.8;
          lineVerts.push(dense[i], y1, -dense[i + 1], dense[i + 2], y2, -dense[i + 3]);
          lineCols.push(col.r, col.g, col.b, col.r, col.g, col.b);
        }
        if (arterial) {
          // Faint ground lane so the corridor reads as carve, not floating line.
          const halfW = Math.max(4, road.width / 2);
          for (let i = 0; i < dense.length - 2; i += 2) {
            const ax = dense[i];
            const ay = dense[i + 1];
            const bx = dense[i + 2];
            const by = dense[i + 3];
            const dirLen = Math.hypot(bx - ax, by - ay) || 1;
            const nx = -(by - ay) / dirLen;
            const ny = (bx - ax) / dirLen;
            const ya = terrainY(ax, ay) + 1.0;
            const yb = terrainY(bx, by) + 1.0;
            laneVerts.push(
              ax + nx * halfW, ya, -(ay + ny * halfW),
              ax - nx * halfW, ya, -(ay - ny * halfW),
              bx + nx * halfW, yb, -(by + ny * halfW),
              ax - nx * halfW, ya, -(ay - ny * halfW),
              bx - nx * halfW, yb, -(by - ny * halfW),
              bx + nx * halfW, yb, -(by + ny * halfW),
            );
          }
        }
      }
    }
    if (laneVerts.length) {
      const g = track(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(laneVerts, 3));
      add(new THREE.Mesh(g, track(new THREE.MeshBasicMaterial({ color: HAIRLINE.roadLane }))));
    }
    if (lineVerts.length) {
      const g = track(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(lineVerts, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(lineCols, 3));
      add(
        new THREE.LineSegments(
          g,
          track(
            new THREE.LineBasicMaterial({
              vertexColors: true,
              transparent: true,
              opacity: 0.8,
            }),
          ),
        ),
      );
    }
  }

  // ── Buildings: instanced fills + merged hairline edges (2 draws) ──────────
  const placed: Array<{ cx: number; cy: number; sx: number; sy: number; h: number; big: boolean; atRisk: boolean }> = [];
  {
    const defaultHeight = (kind: string): number => {
      if (/garage|shed|roof|hut/.test(kind)) return 3;
      if (/commercial|retail|office|industrial|warehouse|church|school/.test(kind)) return 9;
      return 5.5;
    };
    for (const b of world.buildings) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let cx = 0;
      let cy = 0;
      for (const [x, y] of b.footprint) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        cx += x;
        cy += y;
      }
      cx /= b.footprint.length;
      cy /= b.footprint.length;
      if (Math.abs(cx) > W / 2 || Math.abs(cy) > H / 2) continue;
      const sx = Math.max(5, maxX - minX);
      const sy = Math.max(5, maxY - minY);
      const h = (b.height ?? defaultHeight(b.kind)) * 2.0;
      const atRisk =
        Math.hypot(cx - incident.lx, cy - incident.ly) <= ring60.radiusMetres;
      placed.push({ cx, cy, sx, sy, h, big: sx * sy > 260, atRisk });
    }
  }
  if (placed.length) {
    const fillMat = track(new THREE.MeshLambertMaterial({ flatShading: true }));
    const inst = new THREE.InstancedMesh(track(new THREE.BoxGeometry(1, 1, 1)), fillMat, placed.length);
    inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(placed.length * 3), 3);
    const smallC = new THREE.Color(HAIRLINE.bldgSmall);
    const bigC = new THREE.Color(HAIRLINE.bldgBig);
    const riskC = new THREE.Color(HAIRLINE.bldgAtRisk);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const edgeVerts: number[] = [];
    const edgeCols: number[] = [];
    const edgeBase = new THREE.Color(HAIRLINE.bldgEdge);
    const edgeRisk = new THREE.Color(HAIRLINE.bldgEdgeAtRisk);
    placed.forEach((p, i) => {
      const groundY = terrainY(p.cx, p.cy);
      m.makeScale(p.sx * 0.9, p.h, p.sy * 0.9);
      m.setPosition(p.cx, groundY + p.h / 2 - 2, -p.cy);
      inst.setMatrixAt(i, m);
      c.copy(p.big ? bigC : smallC);
      if (p.atRisk) c.lerp(riskC, HAIRLINE.bldgAtRiskMix);
      inst.setColorAt(i, c);
      inst.instanceMatrix.needsUpdate = true;
      inst.instanceColor!.needsUpdate = true;
      // 12 hairline edges of this box, merged into one LineSegments batch.
      const hx = (p.sx * 0.9) / 2;
      const hy = p.h / 2;
      const hz = (p.sy * 0.9) / 2;
      const my = groundY + p.h / 2 - 2;
      const corners: number[][] = [];
      for (const gx of [-1, 1])
        for (const gy of [-1, 1])
          for (const gz of [-1, 1])
            corners.push([p.cx + gx * hx, my + gy * hy, -p.cy + gz * hz]);
      const idx = (a: number, b: number) => [a, b] as const;
      const edgePairs = [
        idx(0, 1), idx(0, 2), idx(0, 4), idx(1, 3), idx(1, 5), idx(2, 3),
        idx(2, 6), idx(3, 7), idx(4, 5), idx(4, 6), idx(5, 7), idx(6, 7),
      ];
      const ec = p.atRisk ? edgeRisk : edgeBase;
      for (const [a, b] of edgePairs) {
        edgeVerts.push(...corners[a], ...corners[b]);
        edgeCols.push(ec.r, ec.g, ec.b, ec.r, ec.g, ec.b);
      }
    });
    add(inst);
    const eg = track(new THREE.BufferGeometry());
    eg.setAttribute("position", new THREE.Float32BufferAttribute(edgeVerts, 3));
    eg.setAttribute("color", new THREE.Float32BufferAttribute(edgeCols, 3));
    add(
      new THREE.LineSegments(
        eg,
        track(
          new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: HAIRLINE.bldgEdgeOpacity }),
        ),
      ),
    );
  }

  // ── Vegetation: instanced cones, desaturated texture layer (1 draw) ───────
  let treeCount = 0;
  if (world.vegetation) {
    const v = world.vegetation;
    const rand = makeRand(0x51ed270b);
    const spots: Array<[number, number]> = [];
    for (let r = 0; r < v.rows; r += 1) {
      for (let col = 0; col < v.cols; col += 1) {
        if (v.classAt(col, r) !== 10) continue;
        const lx = (col / (v.cols - 1)) * W - W / 2;
        const ly = H / 2 - (r / (v.rows - 1)) * H;
        if (terrainY(lx, ly) > elevRange * VEX * 0.8) continue;
        spots.push([lx, ly]);
      }
    }
    const target = Math.min(5200, spots.length);
    const stride = Math.max(1, Math.floor(spots.length / target));
    const inst = new THREE.InstancedMesh(
      track(new THREE.ConeGeometry(11, 30, 5)),
      track(new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })),
      Math.floor(spots.length / stride),
    );
    inst.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(Math.floor(spots.length / stride) * 3),
      3,
    );
    const base = new THREE.Color(HAIRLINE.tree);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    let n = 0;
    for (let i = 0; i < spots.length && n < inst.count; i += stride) {
      const [lx, ly] = spots[i];
      const jx = lx + (rand() - 0.5) * 46;
      const jy = ly + (rand() - 0.5) * 46;
      const s = 0.65 + rand() * 0.75;
      m.makeScale(s, s, s);
      m.setPosition(sceneVec(jx, jy, terrainY(jx, jy) + 9 * s));
      inst.setMatrixAt(n, m);
      c.copy(base).multiplyScalar(1 - HAIRLINE.treeJitter + rand() * HAIRLINE.treeJitter * 2);
      inst.setColorAt(n, c);
      n += 1;
    }
    inst.count = n;
    inst.instanceMatrix.needsUpdate = true;
    inst.instanceColor!.needsUpdate = true;
    treeCount = n;
    add(inst);
  }

  // ── Zones: draped additive ground + merged perimeter hairline (2 draws) ───
  {
    const fillPos: number[] = [];
    const fillCol: number[] = [];
    const perimPos: number[] = [];
    const perimCol: number[] = [];
    for (const zone of overlayData.zones) {
      const tone = new THREE.Color(zone.tone);
      const ring = subdivideFlat(zone.lxLyPolygon, 60, true);
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i < ring.length; i += 2) pts.push(new THREE.Vector2(ring[i], ring[i + 1]));
      if (pts.length < 3) continue;
      // Fill: one additive ground wash per category tone (rule 8: ≤2 lit at rest
      // is enforced by the page state; the wash itself is dim by construction).
      const tris = THREE.ShapeUtils.triangulateShape(pts, []);
      const lift = 2.5;
      for (const tri of tris) {
        for (const vi of tri) {
          const p = pts[vi];
          fillPos.push(p.x, terrainY(p.x, p.y) + lift, -p.y);
          fillCol.push(tone.r, tone.g, tone.b);
        }
      }
      // Perimeter hairline.
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        perimPos.push(
          a.x, terrainY(a.x, a.y) + 3.5, -a.y,
          b.x, terrainY(b.x, b.y) + 3.5, -b.y,
        );
        perimCol.push(tone.r, tone.g, tone.b, tone.r, tone.g, tone.b);
      }
    }
    if (fillPos.length) {
      const g = track(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(fillPos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(fillCol, 3));
      add(
        new THREE.Mesh(
          g,
          track(
            new THREE.MeshBasicMaterial({
              vertexColors: true,
              transparent: true,
              opacity: 0.1,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
          ),
        ),
      );
    }
    if (perimPos.length) {
      const g = track(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(perimPos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(perimCol, 3));
      add(
        new THREE.LineSegments(
          g,
          track(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 })),
        ),
      );
    }
  }

  // ── Spread rings: dashed hairline loops, draped (1 draw each) ─────────────
  for (const ring of overlayData.spreadRings) {
    const SEG = 96;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const lx = ring.center.lx + Math.cos(a) * ring.radiusMetres;
      const ly = ring.center.ly + Math.sin(a) * ring.radiusMetres;
      pts.push(sceneVec(lx, ly, terrainY(lx, ly) + 3));
    }
    const g = track(new THREE.BufferGeometry().setFromPoints(pts));
    const loop = new THREE.Line(
      g,
      track(
        new THREE.LineDashedMaterial({
          color: new THREE.Color(ring.tone),
          dashSize: 26,
          gapSize: 16,
          transparent: true,
          opacity: 0.85,
        }),
      ),
    );
    loop.computeLineDistances();
    add(loop);
  }

  // ── Egress corridors: state-driven centerline + active glow ribbon ────────
  for (const corridor of overlayData.corridors) {
    const status = DEFAULT_CORRIDOR_STATUS[corridor.id] ?? "standby";
    const tone = new THREE.Color(CORRIDOR_TONE[status]);
    const dense = subdivideFlat(corridor.lxLyPolyline, 50, false);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < dense.length; i += 2) {
      pts.push(sceneVec(dense[i], dense[i + 1], terrainY(dense[i], dense[i + 1]) + 4));
    }
    if (pts.length < 2) continue;
    const g = track(new THREE.BufferGeometry().setFromPoints(pts));
    add(
      new THREE.Line(
        g,
        track(
          new THREE.LineBasicMaterial({
            color: tone,
            transparent: true,
            opacity: status === "active" ? 0.95 : HAIRLINE.corridorStandbyOpacity,
          }),
        ),
      ),
    );
    if (status === "active") {
      const halfW = 8;
      const verts: number[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len;
        const nz = dx / len;
        verts.push(
          a.x + nx * halfW, a.y + 1.2, a.z + nz * halfW,
          a.x - nx * halfW, a.y + 1.2, a.z - nz * halfW,
          b.x + nx * halfW, b.y + 1.2, b.z + nz * halfW,
          a.x - nx * halfW, a.y + 1.2, a.z - nz * halfW,
          b.x - nx * halfW, b.y + 1.2, b.z - nz * halfW,
          b.x + nx * halfW, b.y + 1.2, b.z + nz * halfW,
        );
      }
      const rg = track(new THREE.BufferGeometry());
      rg.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      add(
        new THREE.Mesh(
          rg,
          track(
            new THREE.MeshBasicMaterial({
              color: tone,
              transparent: true,
              opacity: HAIRLINE.corridorRibbonOpacity,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
          ),
        ),
      );
    }
  }

  // ── Fire: merged band + glow points + incident ground designate (3 draws) ─
  {
    const glowTex = track(makeGlowTexture());
    const band = world.fire.band;
    const BOX_H = 9;
    const BOX_W = 16;
    const verts: number[] = [];
    const cols: number[] = [];
    const hotC = new THREE.Color(HAIRLINE.fireHot);
    const bandC = new THREE.Color(HAIRLINE.fireBand);
    for (let i = 0; i < band.length - 1; i++) {
      const a = band[i];
      const b = band[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const mlx = (a.x + b.x) / 2;
      const mly = (a.y + b.y) / 2;
      const col = a.intensity > 0.85 ? hotC : bandC;
      const ux = (b.x - a.x) / len;
      const uy = (b.y - a.y) / len;
      const px = -uy * (BOX_W / 2);
      const py = ux * (BOX_W / 2);
      const yLo = terrainY(mlx, mly) + 10 - BOX_H / 2;
      const yHi = yLo + BOX_H;
      const hl = len / 2;
      const corners = [
        [mlx - ux * hl + px, mly - uy * hl + py, yLo], [mlx - ux * hl - px, mly - uy * hl - py, yLo],
        [mlx + ux * hl - px, mly + uy * hl - py, yLo], [mlx + ux * hl + px, mly + uy * hl + py, yLo],
        [mlx - ux * hl + px, mly - uy * hl + py, yHi], [mlx - ux * hl - px, mly - uy * hl - py, yHi],
        [mlx + ux * hl - px, mly + uy * hl - py, yHi], [mlx + ux * hl + px, mly + uy * hl + py, yHi],
      ];
      const faces = [
        [0, 1, 2], [1, 3, 2], [4, 6, 5], [5, 6, 7],
        [0, 4, 1], [1, 4, 5], [2, 3, 6], [3, 7, 6],
        [0, 2, 4], [2, 6, 4], [1, 5, 3], [3, 5, 7],
      ];
      for (const f of faces) {
        for (const vi of f) {
          verts.push(corners[vi][0], corners[vi][2], -corners[vi][1]);
          cols.push(col.r, col.g, col.b);
        }
      }
    }
    if (verts.length) {
      const g = track(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
      add(
        new THREE.Mesh(
          g,
          track(new THREE.MeshBasicMaterial({ vertexColors: true })),
        ),
      );
    }
    // Glow points at hot nodes — one draw.
    const glowPos: number[] = [];
    const hot = band.filter((p) => p.intensity > 0.55);
    const stride = Math.max(1, Math.floor(hot.length / 40));
    for (let i = 0; i < hot.length; i += stride) {
      const p = hot[i];
      glowPos.push(p.x, terrainY(p.x, p.y) + 20, -p.y);
    }
    if (glowPos.length) {
      const g = track(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(glowPos, 3));
      add(
        new THREE.Points(
          g,
          track(
            new THREE.PointsMaterial({
              map: glowTex,
              color: new THREE.Color(HAIRLINE.fireGlow),
              size: 130,
              sizeAttenuation: true,
              transparent: true,
              opacity: 0.5,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
          ),
        ),
      );
    }
    // Incident ground designate — radial warm wash from the origin (rule 2).
    const SEG = 56;
    const gPos: number[] = [];
    const gCol: number[] = [];
    const glowC = new THREE.Color(HAIRLINE.incidentGlow);
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2;
      const a1 = ((i + 1) / SEG) * Math.PI * 2;
      const cx = incident.lx;
      const cy = incident.ly;
      const y0 = terrainY(cx, cy) + 1.8;
      gPos.push(cx, y0, -cy);
      gCol.push(glowC.r, glowC.g, glowC.b);
      gPos.push(
        cx + Math.cos(a0) * HAIRLINE.incidentGlowRadius,
        terrainY(cx + Math.cos(a0) * HAIRLINE.incidentGlowRadius, cy + Math.sin(a0) * HAIRLINE.incidentGlowRadius) + 1.8,
        -(cy + Math.sin(a0) * HAIRLINE.incidentGlowRadius),
      );
      gCol.push(0, 0, 0);
      gPos.push(
        cx + Math.cos(a1) * HAIRLINE.incidentGlowRadius,
        terrainY(cx + Math.cos(a1) * HAIRLINE.incidentGlowRadius, cy + Math.sin(a1) * HAIRLINE.incidentGlowRadius) + 1.8,
        -(cy + Math.sin(a1) * HAIRLINE.incidentGlowRadius),
      );
      gCol.push(0, 0, 0);
    }
    const gg = track(new THREE.BufferGeometry());
    gg.setAttribute("position", new THREE.Float32BufferAttribute(gPos, 3));
    gg.setAttribute("color", new THREE.Float32BufferAttribute(gCol, 3));
    add(
      new THREE.Mesh(
        gg,
        track(
          new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: HAIRLINE.incidentGlowPeak,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      ),
    );
  }

  // ── Agents: beacon glow + core points from the live roster (2 draws) ──────
  {
    const roster = createDroneRoster().slice(0, 4);
    const glowTex = track(makeGlowTexture());
    const toLocal = (px: number, py: number): [number, number] => [
      (px / MAP_NATIVE.width - 0.5) * W,
      (0.5 - py / MAP_NATIVE.height) * H,
    ];
    const glowPos: number[] = [];
    const corePos: number[] = [];
    for (const d of roster) {
      const [lx, ly] = toLocal(d.x, d.y);
      glowPos.push(lx, terrainY(lx, ly) + 34, -ly);
      corePos.push(lx, terrainY(lx, ly) + 34, -ly);
    }
    const gg = track(new THREE.BufferGeometry());
    gg.setAttribute("position", new THREE.Float32BufferAttribute(glowPos, 3));
    add(
      new THREE.Points(
        gg,
        track(
          new THREE.PointsMaterial({
            map: glowTex,
            color: new THREE.Color(T.cyan),
            size: 90,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      ),
    );
    const cg = track(new THREE.BufferGeometry());
    cg.setAttribute("position", new THREE.Float32BufferAttribute(corePos, 3));
    add(
      new THREE.Points(
        cg,
        track(
          new THREE.PointsMaterial({
            color: new THREE.Color(HAIRLINE.agentCore),
            size: 16,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
          }),
        ),
      ),
    );
  }

  return {
    terrainY,
    sceneVec,
    incident,
    ring60Radius: ring60.radiusMetres,
    stats: { buildings: placed.length, trees: treeCount },
    dispose(): void {
      for (const obj of added) scene.remove(obj);
      for (const d of disposables) d.dispose();
      scene.fog = null;
      scene.background = null;
    },
  };
}
