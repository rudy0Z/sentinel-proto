/**
 * Render-time entry — thin wrapper: loads the world, builds the shared
 * scene (src/app/map/runtime/worldScene.ts), frames the bake camera, and
 * extracts the PNG via readPixels → 2D canvas → data URL.
 *
 * TWO BAKE MODES, and the difference is a correctness issue, not a style one:
 *
 *   ?mode=topo   → ORTHOGRAPHIC, straight down. This is the 2D ops basemap.
 *   ?mode=oblique → the cinematic perspective. Presentation only.
 *
 * The 2D map draws its zones, fire, routes and markers through a TOP-DOWN
 * projection (MapFrame u/v). Overlaying those on an OBLIQUE image makes them
 * miss the ground: the defect recorded in docs/sentinel-v2-master-plan/10 §2
 * as "floating sky regions" — zone labels sit above the ridge they name. The
 * only way a 2D overlay layer can register with its basemap is if the basemap
 * is the same projection. So the 2D bake is top-down by law, and 3D EXPLORE
 * carries the perspective.
 */

import * as THREE from "three";
import { loadWorld, W, H } from "../src/app/map/world/world";
import {
  makeRenderer, makeScene, buildWorldScene, homePose,
} from "../src/app/map/runtime/worldScene";

const NATIVE_W = 1691;
const NATIVE_H = 914;

/** Straight-down orthographic framing that exactly covers the world frame. */
function topDownPose(camera: THREE.OrthographicCamera): void {
  camera.left = -W / 2;
  camera.right = W / 2;
  camera.top = H / 2;
  camera.bottom = -H / 2;
  // Camera sits at y=9000; terrain tops out around y≈800 after VEX. A negative
  // near plane pushes the near cutoff past the terrain and the bake renders
  // bare sky, so keep near positive and far comfortably past the frame.
  camera.near = 0.1;
  camera.far = 20000;
  camera.position.set(0, 9000, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

export function mount(canvas: HTMLCanvasElement, status: HTMLElement): void {
  const renderer = makeRenderer(canvas);
  renderer.setPixelRatio(1);
  renderer.setSize(NATIVE_W, NATIVE_H, false);
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    status.textContent = "error: WebGL context lost";
    status.dataset.ready = "error";
  });

  const scene = makeScene();
  const mode = new URLSearchParams(location.search).get("mode") ?? "topo";

  loadWorld().then((world) => {
    const ws = buildWorldScene(scene, world);
    const camera: THREE.Camera =
      mode === "oblique"
        ? new THREE.PerspectiveCamera(42, NATIVE_W / NATIVE_H, 1, 24000)
        : new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20000);
    if (camera instanceof THREE.PerspectiveCamera) {
      homePose(camera);
    } else {
      topDownPose(camera);
    }
    // Textures are async. The draped orthophoto must be decoded before we
    // readPixels, or the bake writes a black terrain into the 2D basemap.
    return ws.ready().then(() => {
      /* A top-down orthographic basemap must NOT carry aerial perspective: the
       * camera sits 9 km up, well past scene.fog.far, so leaving fog on washes
       * the entire frame to the fog colour and the bake comes back as bare sky.
       * Ortho maps have no distance cue — that is what hillshade is for. */
      if (camera instanceof THREE.OrthographicCamera && scene.fog) {
        scene.fog = null;
        (scene as THREE.Scene & { background: unknown }).background = new THREE.Color(0x04070d);
        /* The ortho basemap is read under a CSS filter in the app
         * (saturate/brightness), so it must be baked BRIGHTER than the
         * interactive 3D scene, or the two-stage multiply renders the whole
         * map near-black. Exposure is applied at bake time only — the live 3D
         * keeps its night-console grade. */
        renderer.toneMapping = THREE.LinearToneMapping;
        renderer.toneMappingExposure = 2.6;
      }
      renderer.render(scene, camera);

    const gl = renderer.getContext();
    if (gl.isContextLost()) throw new Error("WebGL context lost before readback");
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    if (!w || !h) throw new Error(`zero drawing buffer ${w}x${h} (context lost?)`);
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const flipped = new Uint8ClampedArray(w * h * 4);
    const rowBytes = w * 4;
    for (let y = 0; y < h; y++) {
      const src = (h - 1 - y) * rowBytes;
      flipped.set(pixels.subarray(src, src + rowBytes), y * rowBytes);
    }
    const c2d = document.createElement("canvas");
    c2d.width = w; c2d.height = h;
    const ctx = c2d.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    ctx.putImageData(new ImageData(flipped, w, h), 0, 0);
    const dataUrl = c2d.toDataURL("image/png");
    status.textContent = `baked ${w}x${h}`;
    status.dataset.ready = "1";
    status.dataset.pngDataUrl = dataUrl;
    });
  }).catch((err) => {
    status.textContent = "error: " + (err && err.message ? err.message : String(err));
    status.dataset.ready = "error";
  });
}

declare global {
  interface Window {
    __renderWorld: (canvas: HTMLCanvasElement, status: HTMLElement) => void;
  }
}
window.__renderWorld = (canvas, status) => mount(canvas, status);
