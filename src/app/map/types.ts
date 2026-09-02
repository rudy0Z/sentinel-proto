/** Spatial OS coordinate and entity types. Authority: normalized MapFrame. */

export interface MapPoint {
  /** 0–1 across basemap width (1691px native). */
  u: number;
  /** 0–1 across basemap height (914px native). */
  v: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export type ZoneCategory = "forest" | "buffer" | "residential";

export interface ZoneModel {
  id: string;
  label: string;
  shortLabel: string;
  category: ZoneCategory;
  /** Authored polygon in MapFrame u/v. */
  polygon: MapPoint[];
  center: MapPoint;
  riskShort: string;
  spreadShort: string;
  terrainShort: string;
  structuresShort: string;
}

export type RoadKind = "arterial" | "local" | "service";
export type AgentKind = "drone" | "team";
export type RoadAllow = AgentKind | "both";

export interface RoadNode {
  id: string;
  point: MapPoint;
  label: string;
  zoneHint?: string;
}

export interface RoadEdge {
  id: string;
  from: string;
  to: string;
  kind: RoadKind;
  allowed: RoadAllow;
}

export interface RoadNetwork {
  nodes: RoadNode[];
  edges: RoadEdge[];
}

export interface AgentPose {
  id: string;
  kind: AgentKind;
  point: MapPoint;
  status?: string;
  assignedZoneId?: string;
  mission?: string;
  /** Active transit polyline in MapFrame; omitted when idle. */
  path?: MapPoint[];
  pathProgress?: number;
}

export interface PathRequest {
  from: MapPoint;
  to: MapPoint;
  allowed: RoadAllow;
}

export interface NamedRoute {
  id: string;
  label: string;
  variant: "egress" | "ingress" | "investigation";
  /** Ordered node ids along the corridor. */
  nodeIds: string[];
  color: string;
}

export interface MapViewport {
  width: number;
  height: number;
}
