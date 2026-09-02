import { fromPixel, distanceUv } from "./frame";
import type { MapPoint, PathRequest, RoadAllow, RoadEdge, RoadNetwork, RoadNode } from "./types";

/**
 * Hand-authored road graph aligned to visible basemap spines:
 * residential grids, buffer corridors, forest-edge connectors.
 * Coordinates are Figma/native pixels converted to MapFrame.
 */
const NODE_DEFS: Array<Omit<RoadNode, "point"> & { x: number; y: number }> = [
  // Forest / ridge
  { id: "forest-overwatch", label: "Forest Overwatch", x: 610, y: 302, zoneHint: "forest-north" },
  { id: "ridge-lidar", label: "Ridge LiDAR Hold", x: 1086, y: 433, zoneHint: "forest-north" },
  { id: "ridge-mid", label: "Ridge Mid Fold", x: 860, y: 360, zoneHint: "forest-north" },
  { id: "forest-edge-south", label: "Forest Edge South", x: 980, y: 520, zoneHint: "forest-north" },

  // Buffer west corridor
  { id: "buffer-west-n", label: "Buffer West North", x: 220, y: 160, zoneHint: "buffer-west" },
  { id: "buffer-west-m", label: "Buffer West Mid", x: 360, y: 280, zoneHint: "buffer-west" },
  { id: "buffer-relay-west", label: "Buffer Relay West", x: 538, y: 570, zoneHint: "buffer-west" },
  { id: "alpha-staging", label: "Alpha Staging", x: 530, y: 616, zoneHint: "residential-west" },

  // Buffer east / ingress
  { id: "buffer-east-n", label: "Buffer East North", x: 1480, y: 180, zoneHint: "buffer-east" },
  { id: "buffer-east-m", label: "Buffer East Mid", x: 1380, y: 320, zoneHint: "buffer-east" },
  { id: "buffer-relay-east", label: "Buffer Relay East", x: 954, y: 603, zoneHint: "buffer-east" },
  { id: "east-service", label: "East Service Lane", x: 1188, y: 468, zoneHint: "buffer-east" },

  // Residential west grid
  { id: "res-west-n", label: "Residential West North", x: 280, y: 540, zoneHint: "residential-west" },
  { id: "res-west-c", label: "Residential West Center", x: 360, y: 680, zoneHint: "residential-west" },
  { id: "res-west-egress", label: "West Swing Egress", x: 180, y: 780, zoneHint: "residential-west" },

  // Residential south / primary grid
  { id: "bravo-staging", label: "Bravo Staging", x: 950, y: 640, zoneHint: "residential-south" },
  { id: "res-south-w", label: "Residential South West", x: 900, y: 720, zoneHint: "residential-south" },
  { id: "res-south-c", label: "Residential South Center", x: 1120, y: 760, zoneHint: "residential-south" },
  { id: "residential-egress", label: "Residential Egress", x: 1378, y: 781, zoneHint: "residential-south" },
  { id: "res-south-e", label: "Residential South East", x: 1520, y: 820, zoneHint: "residential-south" },
  { id: "route-a-west", label: "Guided Route A West", x: 320, y: 800, zoneHint: "residential-west" },
  { id: "route-b-east", label: "Guided Route B East", x: 1396, y: 844, zoneHint: "residential-south" },
  { id: "responder-ingress", label: "Responder Ingress", x: 1120, y: 612, zoneHint: "buffer-east" },
  { id: "herald-hold", label: "Herald Guidance Hold", x: 1218, y: 704, zoneHint: "residential-south" },
];

function undirected(
  from: string,
  to: string,
  kind: RoadEdge["kind"],
  allowed: RoadAllow = "both",
): RoadEdge {
  return { id: `${from}__${to}`, from, to, kind, allowed };
}

const EDGE_DEFS: RoadEdge[] = [
  // Ridge + forest edge
  undirected("forest-overwatch", "ridge-mid", "service", "drone"),
  undirected("ridge-mid", "ridge-lidar", "service", "drone"),
  undirected("ridge-lidar", "forest-edge-south", "service", "drone"),
  undirected("ridge-mid", "forest-edge-south", "service", "drone"),
  undirected("forest-edge-south", "buffer-relay-east", "local", "both"),
  undirected("forest-edge-south", "east-service", "local", "drone"),
  undirected("forest-overwatch", "buffer-relay-west", "local", "drone"),

  // Buffer west spine
  undirected("buffer-west-n", "buffer-west-m", "service", "both"),
  undirected("buffer-west-m", "buffer-relay-west", "local", "both"),
  undirected("buffer-relay-west", "alpha-staging", "local", "both"),
  undirected("alpha-staging", "res-west-n", "local", "team"),
  undirected("res-west-n", "res-west-c", "arterial", "both"),
  undirected("res-west-c", "res-west-egress", "arterial", "both"),
  undirected("res-west-egress", "route-a-west", "arterial", "both"),
  undirected("buffer-relay-west", "res-west-n", "local", "both"),

  // Buffer east / ingress
  undirected("buffer-east-n", "buffer-east-m", "service", "both"),
  undirected("buffer-east-m", "east-service", "local", "both"),
  undirected("east-service", "ridge-lidar", "service", "drone"),
  undirected("east-service", "responder-ingress", "arterial", "both"),
  undirected("responder-ingress", "buffer-relay-east", "arterial", "both"),
  undirected("buffer-relay-east", "bravo-staging", "local", "both"),
  undirected("responder-ingress", "bravo-staging", "local", "both"),

  // Residential south lattice
  undirected("bravo-staging", "res-south-w", "arterial", "both"),
  undirected("res-south-w", "res-south-c", "arterial", "both"),
  undirected("res-south-c", "herald-hold", "arterial", "both"),
  undirected("herald-hold", "residential-egress", "arterial", "both"),
  undirected("residential-egress", "res-south-e", "arterial", "both"),
  undirected("residential-egress", "route-b-east", "arterial", "both"),
  undirected("res-south-c", "residential-egress", "arterial", "both"),
  undirected("buffer-relay-east", "herald-hold", "local", "both"),
  undirected("bravo-staging", "herald-hold", "local", "both"),

  // Cross connectors west ↔ south via mid buffer relay
  undirected("res-west-c", "buffer-relay-west", "local", "both"),
  undirected("route-a-west", "res-south-w", "arterial", "both"),
];

export const ROAD_NETWORK: RoadNetwork = {
  nodes: NODE_DEFS.map(({ x, y, ...rest }) => ({ ...rest, point: fromPixel(x, y) })),
  edges: EDGE_DEFS,
};

const NODE_INDEX = new Map(ROAD_NETWORK.nodes.map((n) => [n.id, n]));

export function getRoadNode(id: string): RoadNode | undefined {
  return NODE_INDEX.get(id);
}

function allows(edge: RoadEdge, allowed: RoadAllow): boolean {
  if (allowed === "both" || edge.allowed === "both") return true;
  return edge.allowed === allowed;
}

export function nearestNodeId(point: MapPoint, allowed: RoadAllow = "both"): string {
  let bestId = ROAD_NETWORK.nodes[0].id;
  let best = Infinity;
  for (const node of ROAD_NETWORK.nodes) {
    // Prefer nodes reachable by at least one allowed edge.
    const hasEdge = ROAD_NETWORK.edges.some(
      (e) => (e.from === node.id || e.to === node.id) && allows(e, allowed),
    );
    if (!hasEdge && allowed !== "both") continue;
    const d = distanceUv(point, node.point);
    if (d < best) {
      best = d;
      bestId = node.id;
    }
  }
  return bestId;
}

export function nodePoint(id: string): MapPoint {
  return NODE_INDEX.get(id)?.point ?? { u: 0.5, v: 0.5 };
}

/** Dijkstra shortest path; returns polyline through node points (inclusive). */
export function findPath(request: PathRequest): MapPoint[] {
  const startId = nearestNodeId(request.from, request.allowed);
  const endId = nearestNodeId(request.to, request.allowed);
  if (startId === endId) {
    return [request.from, nodePoint(startId), request.to];
  }

  const adj = new Map<string, Array<{ to: string; w: number }>>();
  for (const edge of ROAD_NETWORK.edges) {
    if (!allows(edge, request.allowed)) continue;
    const a = NODE_INDEX.get(edge.from);
    const b = NODE_INDEX.get(edge.to);
    if (!a || !b) continue;
    const w = distanceUv(a.point, b.point);
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    if (!adj.has(edge.to)) adj.set(edge.to, []);
    adj.get(edge.from)!.push({ to: edge.to, w });
    adj.get(edge.to)!.push({ to: edge.from, w });
  }

  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const open = new Set<string>(ROAD_NETWORK.nodes.map((n) => n.id));
  for (const id of open) dist.set(id, Infinity);
  dist.set(startId, 0);

  while (open.size) {
    let u: string | null = null;
    let best = Infinity;
    for (const id of open) {
      const d = dist.get(id) ?? Infinity;
      if (d < best) {
        best = d;
        u = id;
      }
    }
    if (u == null || best === Infinity) break;
    open.delete(u);
    if (u === endId) break;
    for (const { to, w } of adj.get(u) ?? []) {
      if (!open.has(to)) continue;
      const alt = best + w;
      if (alt < (dist.get(to) ?? Infinity)) {
        dist.set(to, alt);
        prev.set(to, u);
      }
    }
  }

  const chain: string[] = [];
  let cur: string | undefined = endId;
  while (cur) {
    chain.push(cur);
    cur = prev.get(cur);
  }
  chain.reverse();
  if (chain[0] !== startId) {
    // No path — straight fallback via nearest nodes.
    return [request.from, nodePoint(startId), nodePoint(endId), request.to];
  }

  return [request.from, ...chain.map(nodePoint), request.to];
}

export function polylineLength(points: MapPoint[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += distanceUv(points[i - 1], points[i]);
  return len;
}

export function pointAlongPolyline(points: MapPoint[], t: number): MapPoint {
  if (points.length === 0) return { u: 0.5, v: 0.5 };
  if (points.length === 1 || t <= 0) return points[0];
  if (t >= 1) return points[points.length - 1];
  const total = polylineLength(points) || 1;
  let remain = total * t;
  for (let i = 1; i < points.length; i++) {
    const seg = distanceUv(points[i - 1], points[i]);
    if (remain <= seg) {
      const local = seg === 0 ? 0 : remain / seg;
      return {
        u: points[i - 1].u + (points[i].u - points[i - 1].u) * local,
        v: points[i - 1].v + (points[i].v - points[i - 1].v) * local,
      };
    }
    remain -= seg;
  }
  return points[points.length - 1];
}
