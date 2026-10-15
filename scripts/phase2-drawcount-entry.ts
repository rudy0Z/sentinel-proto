/**
 * TEMP harness (Phase 2 verification) — measures GPU draw calls for the
 * shared world scene with and without the operational overlays.
 * Not part of the app; deleted after measurement.
 */

import * as THREE from "three";
import { loadWorld } from "../src/app/map/world/world";
import { makeRenderer, makeScene, buildWorldScene, homePose } from "../src/app/map/runtime/worldScene";
import { buildOverlays } from "../src/app/map/runtime/overlays3d";
import { overlayData } from "../src/app/map/runtime/overlayData";

export function mount(canvas: HTMLCanvasElement, status: HTMLElement): void {
  const renderer = makeRenderer(canvas);
  renderer.setPixelRatio(1);
  renderer.setSize(1691, 914, false);
  const camera = new THREE.PerspectiveCamera(42, 1691 / 914, 1, 24000);
  homePose(camera);

  loadWorld().then((world) => {
    const sceneBase = makeScene();
    buildWorldScene(sceneBase, world);
    renderer.render(sceneBase, camera);
    const baseCalls = renderer.info.render.calls;
    const baseTris = renderer.info.render.triangles;

    const sceneFull = makeScene();
    const ws = buildWorldScene(sceneFull, world);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const overlays = buildOverlays(sceneFull, ws, overlayData);
    overlays.setSize(1691, 914);
    renderer.render(sceneFull, camera);
    const fullCalls = renderer.info.render.calls;
    const fullTris = renderer.info.render.triangles;

    status.dataset.ready = "1";
    status.dataset.baseCalls = String(baseCalls);
    status.dataset.fullCalls = String(fullCalls);
    status.dataset.overlayCalls = String(fullCalls - baseCalls);
    status.dataset.baseTris = String(baseTris);
    status.dataset.fullTris = String(fullTris);
    status.textContent = `base=${baseCalls} full=${fullCalls} overlay=${fullCalls - baseCalls} baseTris=${baseTris} fullTris=${fullTris}`;
  }).catch((err) => {
    status.textContent = "error: " + (err && err.message ? err.message : String(err));
    status.dataset.ready = "error";
  });
}
