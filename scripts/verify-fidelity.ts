/**
 * Fidelity-ladder contract check (SPEC.md §1.1 M6 / DECISIONS.md §4.2b).
 * Run: npm run verify:fidelity
 *
 * The degradation ladder is a DESIGN decision, so it gets the same treatment
 * as the safety model: written down as assertions that must hold. If someone
 * later weakens the thresholds or drops the world-model floor, this fails.
 */
import {
  resolveFidelity,
  availableTier,
  effectiveObscuration,
  prefersWorldModel,
  TIER_RANK,
  EO_OBSCURATION_LIMIT,
  IR_OBSCURATION_LIMIT,
  type VisualTier,
} from "../src/app/map/model/fidelity";
import { SCENE, windCompass, windVector, type SceneState } from "../src/app/map/model/scene";
import {
  toLocal,
  toGeo,
  normalized,
  fromNormalized,
  formatGeo,
  elevationAt,
  slopeDeg,
  aspectDeg,
  inFrame,
  W,
  H,
} from "../src/app/map/model/space";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * The DEM is loaded here rather than imported, because `world.ts` pulls in
 * `dem.bin?url` — a Vite-specific import that a bare tsx run cannot resolve.
 * Reading the raw grid directly also proves the coordinate law works against
 * the real bytes, not against a mocked surface.
 *
 * The grid is Int16 LE, north-to-south rows, west-to-east columns, in METRES
 * (verified against the binary: raw range -1…491 against dem.json's
 * -0.9…491.1 — integer metres, not decimetres).
 */
function loadDem() {
  const here = dirname(fileURLToPath(import.meta.url));
  const buf = readFileSync(resolve(here, "../src/app/map/world/dem.bin"));
  const raw = new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
  const cols = 400;
  const rows = 220;
  if (raw.length !== cols * rows) throw new Error(`dem.bin ${raw.length} != ${cols * rows}`);
  const elevation = new Float32Array(raw.length);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < raw.length; i++) {
    elevation[i] = raw[i];
    if (raw[i] < min) min = raw[i];
    if (raw[i] > max) max = raw[i];
  }
  return {
    cols,
    rows,
    cellMeters: 15,
    min,
    max,
    elevation,
    elevationAt(col: number, row: number) {
      const c = Math.max(0, Math.min(cols - 1, col));
      const r = Math.max(0, Math.min(rows - 1, row));
      return elevation[r * cols + c];
    },
  };
}

const dem = loadDem();

let failures = 0;
function check(name: string, condition: boolean) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL  ${name}`);
  } else {
    console.log(`PASS  ${name}`);
  }
}

/** A scene with one field changed. */
function scene(over: Partial<SceneState>): SceneState {
  return { ...SCENE, ...over, weather: { ...SCENE.weather, ...(over.weather ?? {}) }, smoke: { ...SCENE.smoke, ...(over.smoke ?? {}) } };
}

// ── The floor: the world model is always available ───────────────────────────
check("world model is always the floor", TIER_RANK["world-model"] === 2);
check(
  "total obscuration still yields a tier",
  availableTier(scene({ smoke: { ...SCENE.smoke, obscuration: 1 } })) === "world-model",
);
check(
  "operator can always request the world model",
  resolveFidelity(scene({ smoke: { ...SCENE.smoke, obscuration: 1 } }), "world-model").active === "world-model",
);

// ── Ladder steps, in order, and only in order ───────────────────────────────
const clear = scene({ phase: "day", ambient: 1, smoke: { ...SCENE.smoke, obscuration: 0 } });
const smoked = scene({ phase: "day", ambient: 1, smoke: { ...SCENE.smoke, obscuration: 0.5 } });
const saturated = scene({ phase: "day", ambient: 1, smoke: { ...SCENE.smoke, obscuration: 0.95 } });

check("clear scene supports EO", availableTier(clear) === "camera-eo");
check("smoke drops to IR", availableTier(smoked) === "camera-ir");
check("heavy smoke drops to the world model", availableTier(saturated) === "world-model");

check(
  "requested EO degrades to IR when smoke arrives",
  resolveFidelity(smoked, "camera-eo").active === "camera-ir",
);
check(
  "degradation carries a reason",
  resolveFidelity(smoked, "camera-eo").reason.length > 0,
);
check(
  "degradation reason names smoke",
  /smoke/i.test(resolveFidelity(smoked, "camera-eo").reason),
);
check(
  "thermal saturation names the world model",
  /world model/i.test(resolveFidelity(saturated, "camera-ir").reason),
);
check(
  "no reason when nothing degraded",
  resolveFidelity(clear, "camera-eo").reason === "",
);

// ── The operator may always step DOWN ───────────────────────────────────────
check("operator may choose IR when EO is fine", resolveFidelity(clear, "camera-ir").active === "camera-ir");
check("operator may choose the world model when EO is fine", resolveFidelity(clear, "world-model").active === "world-model");

// ── The operator may NOT step UP past the conditions ────────────────────────
check(
  "operator cannot force EO through smoke",
  resolveFidelity(smoked, "camera-eo").active !== "camera-eo",
);
check(
  "operator cannot force IR through saturation",
  resolveFidelity(saturated, "camera-ir").active !== "camera-ir",
);
check(
  "an upgrade is offered when the scene allows a better tier",
  // On a clear scene the operator may sit on IR deliberately; EO is better and
  // available, so an upgrade is offered.
  resolveFidelity(clear, "camera-ir").canAttemptUpgrade === true,
);
check(
  "no upgrade is offered when already at the best available tier",
  // In smoke, IR *is* the best available tier — nothing better to return to.
  resolveFidelity(smoked, "camera-ir").canAttemptUpgrade === false,
);
check(
  "no upgrade is offered at the floor",
  resolveFidelity(saturated, "world-model").canAttemptUpgrade === false,
);

// ── Night degrades the optical channel, but less than smoke ────────────────
const night = scene({ phase: "night", ambient: 0.08, smoke: { ...SCENE.smoke, obscuration: 0 } });
const nightObs = effectiveObscuration(night);
check("night reduces visibility", nightObs > 0);
check("night alone does not kill EO", nightObs < EO_OBSCURATION_LIMIT);
check(
  "smoke is worse than darkness",
  effectiveObscuration(smoked) > effectiveObscuration(night),
);

// ── Layers that need the world model ────────────────────────────────────────
check("modelled layers prefer the world model", prefersWorldModel("modeled"));
check("uncertainty layers prefer the world model", prefersWorldModel("uncertainty"));
check("photographic layers do not", !prefersWorldModel("photo"));

// ── Scene data sanity ───────────────────────────────────────────────────────
check("wind compass reads SW for 228°", windCompass(228) === "SW");
check("wind vector points downwind", (() => {
  const v = windVector(SCENE);
  // Meteorological wind FROM the SW blows TOWARD the NE: +x, +y.
  return v.x > 0 && v.y > 0;
})());
check("weather is labelled authored", SCENE.weather.basis === "authored");
check("smoke is labelled authored", SCENE.smoke.basis === "authored");

// ── The coordinate law ──────────────────────────────────────────────────────
const centre = toLocal(-118.815, 34.032);
check("frame centre maps to the origin", Math.abs(centre[0]) < 1 && Math.abs(centre[1]) < 1);
const round = toGeo(centre[0], centre[1]);
check("geo round-trips", Math.abs(round.lon + 118.815) < 1e-6 && Math.abs(round.lat - 34.032) < 1e-6);
check("normalised centre is (0.5, 0.5)", (() => {
  const n = normalized(0, 0);
  return Math.abs(n.u - 0.5) < 1e-9 && Math.abs(n.v - 0.5) < 1e-9;
})());
check("normalised round-trips", (() => {
  const [x, y] = fromNormalized(0.25, 0.75);
  const n = normalized(x, y);
  return Math.abs(n.u - 0.25) < 1e-9 && Math.abs(n.v - 0.75) < 1e-9;
})());
check("north is v=0", (() => {
  const n = normalized(0, H / 2);
  return Math.abs(n.v) < 1e-9;
})());
check("east is u=1", (() => {
  const n = normalized(W / 2, 0);
  return Math.abs(n.u - 1) < 1e-9;
})());
check("geo format is hemisphere-aware", /°N\s+\d+\.\d+°W/.test(formatGeo(0, 0)));
check("frame bounds are respected", inFrame(0, 0) && !inFrame(W, 0) && !inFrame(0, H));

// ── Terrain sampling ────────────────────────────────────────────────────────
check("elevation samples inside the DEM range", (() => {
  const e = elevationAt(dem, 0, 0);
  return e >= dem.min - 1 && e <= dem.max + 1;
})());
check("elevation is finite everywhere on a sweep", (() => {
  for (let i = 0; i < 40; i++) {
    const x = -W / 2 + (i / 40) * W;
    for (let j = 0; j < 10; j++) {
      const y = -H / 2 + (j / 10) * H;
      if (!Number.isFinite(elevationAt(dem, x, y))) return false;
    }
  }
  return true;
})());
check("slope is in range", (() => {
  const s = slopeDeg(dem, 0, 0);
  return s >= 0 && s <= 90;
})());
check("aspect is in range", (() => {
  const a = aspectDeg(dem, 0, 0);
  return a >= 0 && a < 360;
})());
check("the ridge is steeper than the flats", (() => {
  // Sample the north ridge (the crest) against a coastal flat and confirm
  // the terrain model actually contains relief, not a flat plane.
  let steepest = 0;
  for (let i = 0; i < 60; i++) {
    const x = -W / 2 + (i / 60) * W;
    for (let j = 0; j < 40; j++) {
      const y = -H / 2 + (j / 40) * H;
      steepest = Math.max(steepest, slopeDeg(dem, x, y));
    }
  }
  return steepest > 15;
})());

// ── Report ──────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\nverify:fidelity — ${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nverify:fidelity — all checks passed");
