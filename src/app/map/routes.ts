import { nodePoint } from "./roads";
import { toScreen, MAP_DISPLAY } from "./frame";
import { T, tint } from "../tokens";
import type { MapPoint, MapViewport, NamedRoute } from "./types";

export type NamedRouteId = "route-a" | "route-b" | "responder-route" | "investigation-path";

/**
 * Named operational corridors as ordered road-node sequences
 * (replaces orphan Bezier EVACUATION_ROUTES / RESPONDER_ROUTE).
 */
export const NAMED_ROUTES: NamedRoute[] = [
  {
    id: "route-a",
    label: "GUIDED ROUTE A",
    variant: "egress",
    nodeIds: ["res-south-w", "res-west-c", "res-west-egress", "route-a-west"],
    color: tint(T.textPrimary, 0.92),
  },
  {
    id: "route-b",
    label: "GUIDED ROUTE B",
    variant: "egress",
    nodeIds: ["res-south-c", "residential-egress", "route-b-east"],
    color: tint(T.textPrimary, 0.92),
  },
  {
    id: "responder-route",
    label: "RESPONDER INGRESS",
    variant: "ingress",
    nodeIds: ["responder-ingress", "buffer-relay-east", "bravo-staging", "res-south-w"],
    color: T.yellow,
  },
  {
    id: "investigation-path",
    label: "SCOUT INVESTIGATION",
    variant: "investigation",
    nodeIds: ["forest-overwatch", "ridge-mid", "ridge-lidar"],
    color: T.cyan,
  },
];

export const EGRESS_ROUTES = NAMED_ROUTES.filter((r) => r.variant === "egress");

export function routePolyline(route: NamedRoute): MapPoint[] {
  return route.nodeIds.map(nodePoint);
}

export function routeToSvgPath(
  route: NamedRoute,
  viewport: MapViewport = MAP_DISPLAY,
): string {
  const pts = routePolyline(route).map((p) => toScreen(p, viewport));
  if (!pts.length) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
}

export function getNamedRoute(id: string): NamedRoute | undefined {
  return NAMED_ROUTES.find((r) => r.id === id);
}
