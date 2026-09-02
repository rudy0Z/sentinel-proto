/**
 * Spatial OS unit checks — pathfinding, zone expand, transit continuity, route integrity.
 * Run: npx --yes tsx src/app/map/__tests__/spatial-smoke.ts
 */
import { findPath, nearestNodeId, polylineLength, ROAD_NETWORK, getRoadNode } from "../roads";
import { expandPolygon, getZoneModel, applyZoneMargin } from "../zones";
import { fromPixel } from "../frame";
import { requestPath, createTransit, transitPoint } from "../agents";
import { NAMED_ROUTES } from "../routes";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const forest = getZoneModel("forest-north");
assert(forest && forest.polygon.length >= 3, "forest-north polygon authored");

const expanded = expandPolygon(forest!.polygon, 0.02);
assert(expanded.length === forest!.polygon.length, "expand keeps vertex count");
const contracted = applyZoneMargin(forest!, -0.01);
assert(contracted.polygon.length === forest!.polygon.length, "contract keeps vertices");

const start = fromPixel(610, 302);
const end = fromPixel(1378, 781);
const path = findPath({ from: start, to: end, allowed: "both" });
assert(path.length >= 3, "path has via points");
assert(polylineLength(path) > 0, "path has length");

const dronePath = requestPath(start, end, "drone");
assert(dronePath.length >= 2, "drone path exists");

const near = nearestNodeId(fromPixel(954, 603), "both");
assert(near === "buffer-relay-east" || near.length > 0, "nearest node resolves");

for (const route of NAMED_ROUTES) {
  for (const nodeId of route.nodeIds) {
    assert(getRoadNode(nodeId), `route ${route.id} node ${nodeId} exists in ROAD_NETWORK`);
  }
}
assert(ROAD_NETWORK.nodes.length >= 20, "road graph has authored density");

// Mid-flight reassign should continue from interpolated point, not jump back.
const first = createTransit("scout", "drone", start, end, 1000);
const mid = transitPoint(first, first.startedAt + 500, false);
assert(!mid.done && mid.progress > 0.2 && mid.progress < 0.8, "mid transit progresses");
const second = createTransit("scout", "drone", mid.point, fromPixel(950, 640), 1000);
const secondStart = second.path[0];
assert(
  Math.hypot(secondStart.u - mid.point.u, secondStart.v - mid.point.v) < 0.002,
  "reassign transit starts at interpolated point",
);

console.log("spatial-smoke: ok");
