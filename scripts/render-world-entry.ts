/**
 * Render-time entry — thin wrapper: loads the world, builds the shared
 * scene (src/app/map/runtime/worldScene.ts), frames the bake camera, and
 * extracts the PNG via readPixels → 2D canvas → data URL.
 */

import * as THREE from "three";
import { loadWorld } from "../src/app/map/world/world";
import {
  makeRenderer, makeScene, buildWorldScene, homePose,
} from "../src/app/map/runtime/worldScene";

const NATIVE_W = 1691;
const NATIVE_H = 914;

export function mount(canvas: HTMLCanvasElement, status: HTMLElement): void {
  const renderer = makeRenderer(canvas);
  renderer.setPixelRatio(1);
  renderer.setSize(NATIVE_W, NATIVE_H, false);

  const scene = makeScene();

  loadWorld().then((world) => {
    buildWorldScene(scene, world);
    const camera = new THREE.PerspectiveCamera(
      42, NATIVE_W / NATIVE_H, 1, 24000,
    );
    homePose(camera);
    renderer.render(scene, camera);

    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
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
