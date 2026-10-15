/**
 * HairlineMapCanvas — the Hairline Instrument rendition (docs/redesign-2026/14).
 *
 * Separate from the production map stack: same world DATA, new render language.
 * On-demand render (dirty-flag loop), retargetable orbit, click-to-fly, and the
 * instrument furniture (scale bar, north arrow, coords, honest draw-call HUD).
 * Glow = live state only (spec §2 rule 2).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { buildHairlineWorld, type HairlineWorld } from "./hairlineScene";
import { HAIRLINE } from "./palette";
import { loadWorld, frame, W, H } from "../world/world";
import { overlayData, type ZoneOverlay } from "../runtime/overlayData";
import { T, font, radius, tracking, typeStyle, NUMERIC_TNUM } from "../../tokens";

// ── Camera rig types ─────────────────────────────────────────────────────────

interface OrbitState {
  target: THREE.Vector3;
  distance: number;
  azimuth: number;
  elevation: number;
}

const FOV = 42;
const AZIMUTH_HOME = 0.42;
const ELEVATION_HOME = 0.44;
const DISTANCE_HOME = 4600;
const AZIMUTH_ISO = Math.PI / 4;
const ELEVATION_ISO = 0.95;

function applyOrbit(camera: THREE.PerspectiveCamera, o: OrbitState): void {
  const cosE = Math.cos(o.elevation);
  camera.position.set(
    o.target.x + o.distance * cosE * Math.sin(o.azimuth),
    o.target.y + o.distance * Math.sin(o.elevation),
    o.target.z + o.distance * cosE * Math.cos(o.azimuth),
  );
  camera.lookAt(o.target);
}

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Ray-march the elevation field: cheap, robust picking without a mesh raycast. */
function pickTerrain(
  ray: THREE.Ray,
  world: HairlineWorld,
  maxDist: number,
): THREE.Vector3 | null {
  const dir = ray.direction;
  const origin = ray.origin;
  let prevT = 0;
  let prevGap = origin.y - world.terrainY(origin.x, -origin.z);
  for (let t = 60; t < maxDist; t += 60) {
    const px = origin.x + dir.x * t;
    const py = origin.y + dir.y * t;
    const pz = origin.z + dir.z * t;
    const gap = py - world.terrainY(px, -pz);
    if (prevGap > 0 && gap <= 0) {
      let lo = prevT;
      let hi = t;
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        const mx = origin.x + dir.x * mid;
        const my = origin.y + dir.y * mid;
        const mz = origin.z + dir.z * mid;
        if (my - world.terrainY(mx, -mz) > 0) lo = mid;
        else hi = mid;
      }
      const hitT = (lo + hi) / 2;
      return new THREE.Vector3(
        origin.x + dir.x * hitT,
        origin.y + dir.y * hitT,
        origin.z + dir.z * hitT,
      );
    }
    prevT = t;
    prevGap = gap;
  }
  return null;
}

function pointInRing(lx: number, ly: number, flat: number[]): boolean {
  let inside = false;
  const n = flat.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = flat[i * 2];
    const yi = flat[i * 2 + 1];
    const xj = flat[j * 2];
    const yj = flat[j * 2 + 1];
    if (yi > ly !== yj > ly && lx < ((xj - xi) * (ly - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function zoneAt(lx: number, ly: number): ZoneOverlay | null {
  for (const zone of overlayData.zones) {
    if (pointInRing(lx, ly, zone.lxLyPolygon)) return zone;
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

export function HairlineMapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ calls: number; tris: number } | null>(null);
  const [readout, setReadout] = useState<{ distKm: string; barPx: number; barLabel: string; northDeg: number } | null>(null);

  const stateRef = useRef<{
    orbit: OrbitState;
    home: OrbitState | null;
    tween: { from: OrbitState; to: OrbitState; t0: number } | null;
    dirty: boolean;
    lastPointer: { x: number; y: number; button: number; shift: boolean; downT: number; moved: number } | null;
  }>({
    orbit: { target: new THREE.Vector3(), distance: DISTANCE_HOME, azimuth: AZIMUTH_HOME, elevation: ELEVATION_HOME },
    home: null,
    tween: null,
    dirty: true,
    lastPointer: null,
  });

  const labelRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;

    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.cursor = "crosshair";
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    const camera = new THREE.PerspectiveCamera(FOV, 1, 2, 30000);

    let world: HairlineWorld | null = null;
    let raf = 0;
    const s = stateRef.current;

    const resize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      s.dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const invalidate = () => {
      s.dirty = true;
    };

    const flyTo = (to: Partial<OrbitState>) => {
      s.tween = {
        from: {
          target: s.orbit.target.clone(),
          distance: s.orbit.distance,
          azimuth: s.orbit.azimuth,
          elevation: s.orbit.elevation,
        },
        to: {
          target: (to.target ?? s.orbit.target).clone(),
          distance: to.distance ?? s.orbit.distance,
          azimuth: to.azimuth ?? s.orbit.azimuth,
          elevation: to.elevation ?? s.orbit.elevation,
        },
        t0: performance.now(),
      };
      invalidate();
    };

    (window as unknown as { __hairlineFly?: unknown }).__hairlineFly = flyTo;

    const render = () => {
      applyOrbit(camera, s.orbit);
      renderer.render(sceneRef.current!, camera);
      setStats({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles });
      updateLabels();
      updateFurniture();
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (s.tween) {
        const el = performance.now() - s.tween.t0;
        const t = Math.min(1, el / 700);
        const k = easeInOutCubic(t);
        s.orbit.target.lerpVectors(s.tween.from.target, s.tween.to.target, k);
        s.orbit.distance = s.tween.from.distance + (s.tween.to.distance - s.tween.from.distance) * k;
        s.orbit.azimuth = s.tween.from.azimuth + (s.tween.to.azimuth - s.tween.from.azimuth) * k;
        s.orbit.elevation = s.tween.from.elevation + (s.tween.to.elevation - s.tween.from.elevation) * k;
        if (t >= 1) s.tween = null;
        s.dirty = true;
      }
      if (s.dirty) {
        s.dirty = false;
        render();
      }
    };

    // ── Projected labels ───────────────────────────────────────────────────
    const proj = new THREE.Vector3();
    const updateLabels = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      for (const label of overlayData.labels) {
        const el = labelRefs.current.get(label.id);
        if (!el || !world) continue;
        const y = world.terrainY(label.lx, label.ly) + label.liftMetres;
        proj.set(label.lx, y, -label.ly).project(camera);
        if (proj.z > 1 || proj.x < -1.1 || proj.x > 1.1 || proj.y < -1.1 || proj.y > 1.1) {
          el.style.display = "none";
          continue;
        }
        el.style.display = "block";
        el.style.left = `${((proj.x + 1) / 2) * w}px`;
        el.style.top = `${((-proj.y + 1) / 2) * h}px`;
      }
    };

    const northV = new THREE.Vector3();
    const projB = new THREE.Vector3();
    const updateFurniture = () => {
      if (!world) return;
      const h = container.clientHeight || 1;
      // Scale bar: world metres per pixel at the target distance.
      const wpp = (2 * s.orbit.distance * Math.tan((FOV * Math.PI) / 360)) / h;
      const nice = [200, 500, 1000, 2000, 5000].find((m) => m / wpp >= 70 && m / wpp <= 170) ?? 1000;
      setReadout({
        distKm: (s.orbit.distance / 1000).toFixed(1),
        barPx: Math.round(nice / wpp),
        barLabel: nice >= 1000 ? `${nice / 1000} KM` : `${nice} M`,
        northDeg: (() => {
          northV.copy(s.orbit.target);
          applyOrbit(camera, s.orbit);
          const a = proj.copy(s.orbit.target).project(camera);
          northV.set(s.orbit.target.x, s.orbit.target.y, s.orbit.target.z - 500);
          const b = projB.copy(northV).project(camera);
          const dx = (b.x - a.x) * (container.clientWidth / 2);
          const dy = -(b.y - a.y) * (h / 2);
          return (Math.atan2(dx, dy) * 180) / Math.PI;
        })(),
      });
    };

    // ── Pointer: orbit / pan / wheel / click-to-fly ─────────────────────────
    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      s.lastPointer = { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey, downT: performance.now(), moved: 0 };
    };
    const onPointerMove = (e: PointerEvent) => {
      const lp = s.lastPointer;
      if (!lp) return;
      const dx = e.clientX - lp.x;
      const dy = e.clientY - lp.y;
      lp.moved += Math.abs(dx) + Math.abs(dy);
      lp.x = e.clientX;
      lp.y = e.clientY;
      if (lp.button === 2 || lp.shift) {
        // Pan + re-anchor the pivot (the fix for the fixed-focal-point complaint).
        const wpp = (2 * s.orbit.distance * Math.tan((FOV * Math.PI) / 360)) / (container.clientHeight || 1);
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
        const forwardGround = new THREE.Vector3(-Math.sin(s.orbit.azimuth), 0, -Math.cos(s.orbit.azimuth));
        s.orbit.target.addScaledVector(right, -dx * wpp);
        s.orbit.target.addScaledVector(forwardGround, -dy * wpp);
        s.orbit.target.x = Math.max(-W / 2, Math.min(W / 2, s.orbit.target.x));
        s.orbit.target.z = Math.max(-H / 2, Math.min(H / 2, s.orbit.target.z));
        s.orbit.target.y = Math.max(-40, Math.min(1100, s.orbit.target.y));
      } else {
        s.orbit.azimuth -= dx * 0.005;
        s.orbit.elevation = Math.max(0.12, Math.min(1.35, s.orbit.elevation + dy * 0.005));
      }
      s.tween = null;
      invalidate();
    };
    const onPointerUp = (e: PointerEvent) => {
      const lp = s.lastPointer;
      s.lastPointer = null;
      if (!lp || !world || lp.moved > 6 || performance.now() - lp.downT > 400) return;
      if (lp.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hit = pickTerrain(ray.ray, world, 26000);
      if (!hit) return;
      const lx = hit.x;
      const ly = -hit.z;
      const zone = zoneAt(lx, ly);
      if (zone) {
        flyTo({
          target: new THREE.Vector3(zone.center.lx, world.terrainY(zone.center.lx, zone.center.ly) + 120, -zone.center.ly),
          distance: 1900,
        });
      } else if (Math.hypot(lx - world.incident.lx, ly - world.incident.ly) < 350) {
        flyTo({
          target: new THREE.Vector3(world.incident.lx, world.terrainY(world.incident.lx, world.incident.ly) + 150, -world.incident.ly),
          distance: 1500,
        });
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      s.orbit.distance = Math.max(150, Math.min(9000, s.orbit.distance * Math.exp(e.deltaY * 0.001)));
      s.tween = null;
      invalidate();
    };
    const onContext = (e: Event) => e.preventDefault();

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContext);

    loadWorld()
      .then((loaded) => {
        if (disposed) return;
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        world = buildHairlineWorld(scene, loaded);
        s.home = {
          target: new THREE.Vector3(
            world.incident.lx,
            world.terrainY(world.incident.lx, world.incident.ly) + 150,
            -world.incident.ly,
          ),
          distance: DISTANCE_HOME,
          azimuth: AZIMUTH_HOME,
          elevation: ELEVATION_HOME,
        };
        s.orbit = { ...s.home, target: s.home.target.clone() };
        setLoading(false);
        s.dirty = true;
        loop();
      })
      .catch((err) => {
        if (!disposed) setError(String(err));
      });

    const sceneRef: { current: THREE.Scene | null } = { current: null };

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContext);
      world?.dispose();
      renderer.dispose();
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goHome = () => {
    const w = (window as unknown as { __hairlineFly?: (to: Partial<{ target: THREE.Vector3; distance: number; azimuth: number; elevation: number }>) => void }).__hairlineFly;
    const s = stateRef.current;
    if (w && s.home) w({ ...s.home, target: s.home.target.clone() });
  };
  const goIso = () => {
    const w = (window as unknown as { __hairlineFly?: (to: Partial<{ target: THREE.Vector3; distance: number; azimuth: number; elevation: number }>) => void }).__hairlineFly;
    const s = stateRef.current;
    if (w && s.home)
      w({
        target: s.orbit.target.clone(),
        distance: 5400,
        azimuth: AZIMUTH_ISO,
        elevation: ELEVATION_ISO,
      });
  };

  const chipStyle = useMemo(
    () =>
      ({
        position: "absolute",
        transform: "translate(-50%, -100%)",
        fontFamily: font.mono,
        fontSize: typeStyle.metadata.size,
        lineHeight: `${typeStyle.metadata.lineHeight}px`,
        fontWeight: typeStyle.metadata.weight,
        letterSpacing: tracking.telemetry,
        fontVariantNumeric: NUMERIC_TNUM,
        color: T.textPrimary,
        background: HAIRLINE.chipBg,
        border: `1px solid ${T.border}`,
        borderRadius: radius.dense,
        padding: "3px 7px",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }) as const,
    [],
  );

  const legend = [
    { label: "FIRE", tone: HAIRLINE.fireBand },
    { label: "DESIGNATE", tone: HAIRLINE.incidentGlow },
    { label: "EGRESS · AGENT", tone: T.cyan },
    { label: "AT-RISK STRUCTURES", tone: HAIRLINE.bldgEdgeAtRisk },
  ];

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0, background: T.bgMap, overflow: "hidden" }}>
      {/* Projected label chips */}
      {overlayData.labels.map((label) => (
        <div
          key={label.id}
          ref={(el) => {
            if (el) labelRefs.current.set(label.id, el);
            else labelRefs.current.delete(label.id);
          }}
          style={{
            ...chipStyle,
            color: label.tone,
            display: "none",
            fontVariantNumeric: label.numeric ? NUMERIC_TNUM : undefined,
          }}
        >
          {label.text}
        </div>
      ))}

      {/* Title chip */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 16,
          fontFamily: font.mono,
          pointerEvents: "none",
        }}
      >
        <div style={{ ...typeStyle.eyebrow, color: T.textSecondary }}>SENTINEL · HAIRLINE INSTRUMENT</div>
        <div style={{ ...typeStyle.metadata, color: T.textMuted, marginTop: 2 }}>
          EXPLORATORY RENDITION 01 — GLOW = LIVE STATE
        </div>
      </div>

      {/* Controls + honest perf HUD */}
      <div style={{ position: "absolute", top: 14, right: 16, display: "flex", gap: 8, alignItems: "center" }}>
        {stats && (
          <span
            style={{
              fontFamily: font.mono,
              fontSize: 10,
              letterSpacing: tracking.telemetry,
              color: T.textMuted,
              fontVariantNumeric: NUMERIC_TNUM,
              marginRight: 4,
            }}
          >
            {`CALLS ${stats.calls} · TRIS ${Math.round(stats.tris / 1000)}K · ON-DEMAND`}
          </span>
        )}
        {[
          { label: "HOME", fn: goHome },
          { label: "ISO", fn: goIso },
        ].map((b) => (
          <button
            key={b.label}
            onClick={b.fn}
            style={{
              fontFamily: font.mono,
              fontSize: 11,
              letterSpacing: tracking.telemetry,
              color: T.textSecondary,
              background: HAIRLINE.chipBg,
              border: `1px solid ${T.border}`,
              borderRadius: radius.dense,
              padding: "5px 10px",
              cursor: "pointer",
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Legend: what may glow, and why */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          pointerEvents: "none",
        }}
      >
        <span style={{ ...typeStyle.eyebrow, color: T.textMuted }}>GLOW = LIVE STATE</span>
        {legend.map((row) => (
          <span key={row.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 2, background: row.tone, display: "inline-block" }} />
            <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: tracking.telemetry, color: T.textSecondary }}>
              {row.label}
            </span>
          </span>
        ))}
      </div>

      {/* Furniture: scale bar · north arrow · coords · distance */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          right: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
          pointerEvents: "none",
          textAlign: "right",
        }}
      >
        <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: tracking.telemetry, color: T.textMuted }}>
          {`${frame.center.lat.toFixed(3)}°N ${Math.abs(frame.center.lon).toFixed(3)}°W${readout ? ` · DIST ${readout.distKm} KM` : ""}`}
        </span>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <span
            style={{
              fontFamily: font.mono,
              fontSize: 10,
              letterSpacing: tracking.telemetry,
              color: T.textMuted,
              transform: `rotate(${readout?.northDeg ?? 0}deg)`,
              display: "inline-block",
              transformOrigin: "50% 80%",
            }}
          >
            ↑ N
          </span>
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ width: readout?.barPx ?? 80, height: 1, background: T.textMuted, display: "block" }} />
            <span style={{ fontFamily: font.mono, fontSize: typeStyle.metadata.size, letterSpacing: tracking.telemetry, color: T.textMuted }}>
              {readout?.barLabel ?? ""}
            </span>
          </span>
        </div>
        <span style={{ fontFamily: font.mono, fontSize: typeStyle.metadata.size, letterSpacing: tracking.fine, color: T.textMuted, opacity: 0.7 }}>
          USGS 3DEP · © OPENSTREETMAP CONTRIBUTORS · ESA WORLDCOVER
        </span>
      </div>

      {/* Interaction hint */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: font.mono,
          fontSize: 10,
          letterSpacing: tracking.telemetry,
          color: T.textMuted,
          pointerEvents: "none",
        }}
      >
        DRAG ORBIT · SHIFT-DRAG PAN · WHEEL ZOOM · CLICK ZONE / INCIDENT TO FLY
      </div>

      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontFamily: font.mono,
            fontSize: 11,
            letterSpacing: tracking.telemetry,
            color: T.textSecondary,
          }}
        >
          LOADING WORLD…
        </div>
      )}
      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontFamily: font.mono,
            fontSize: 11,
            color: T.red,
          }}
        >
          WORLD LOAD FAILED — {error}
        </div>
      )}
    </div>
  );
}
