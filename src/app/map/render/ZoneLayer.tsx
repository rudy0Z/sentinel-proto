import { T, tint, radius, surface, font, typeScale, tracking, typeWeight } from "../../tokens";
import { polygonToSvgPoints, MAP_DISPLAY } from "../frame";
import type { MapViewport, ZoneModel } from "../types";

const STROKE: Record<ZoneModel["category"], { color: string; width: number; dash?: string }> = {
  forest: { color: T.fire, width: 1.6, dash: "7 5" },
  buffer: { color: T.cyan, width: 1.35, dash: "5 5" },
  residential: { color: T.red, width: 1.5 },
};

const FILL: Record<ZoneModel["category"], string> = {
  forest: tint(T.fire, 0.08),
  buffer: tint(T.cyan, 0.06),
  residential: tint(T.red, 0.07),
};

export function ZonePolygons({
  zones,
  selectedId,
  hoverId,
  interactive,
  onSelect,
  onHover,
  viewport = MAP_DISPLAY,
}: {
  zones: ZoneModel[];
  selectedId?: string | null;
  hoverId?: string | null;
  interactive?: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  viewport?: MapViewport;
}) {
  return (
    <g role="group" aria-label="Operational zones">
      {zones.map((zone) => {
        const stroke = STROKE[zone.category];
        const active = selectedId === zone.id || hoverId === zone.id;
        return (
          <polygon
            key={zone.id}
            points={polygonToSvgPoints(zone.polygon, viewport)}
            fill={FILL[zone.category]}
            stroke={stroke.color}
            strokeWidth={active ? stroke.width + 0.4 : stroke.width}
            strokeOpacity={active ? 0.95 : 0.72}
            strokeDasharray={stroke.dash}
            style={{ cursor: interactive ? "pointer" : "default", pointerEvents: interactive ? "auto" : "none" }}
            onClick={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              onSelect?.(zone.id);
            }}
            onPointerEnter={() => interactive && onHover?.(zone.id)}
            onPointerLeave={() => interactive && onHover?.(null)}
          />
        );
      })}
    </g>
  );
}

export function ZoneEnvelope({
  zone,
  viewport = MAP_DISPLAY,
}: {
  zone: ZoneModel;
  viewport?: MapViewport;
}) {
  return (
    <polygon
      points={polygonToSvgPoints(zone.polygon, viewport)}
      fill="none"
      stroke={tint(T.amber, 0.55)}
      strokeWidth={1}
      strokeDasharray="3 4"
      opacity={0.85}
      pointerEvents="none"
    />
  );
}

/** Debug: road graph edges (optional). */
export function RoadDebugLayer({
  edges,
  nodes,
  viewport = MAP_DISPLAY,
}: {
  edges: Array<{ id: string; from: string; to: string }>;
  nodes: Array<{ id: string; point: { u: number; v: number } }>;
  viewport?: MapViewport;
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (
    <g opacity={0.35} pointerEvents="none">
      {edges.map((e) => {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!a || !b) return null;
        return (
          <line
            key={e.id}
            x1={a.point.u * viewport.width}
            y1={a.point.v * viewport.height}
            x2={b.point.u * viewport.width}
            y2={b.point.v * viewport.height}
            stroke={T.cyan}
            strokeWidth={1}
          />
        );
      })}
      {nodes.map((n) => (
        <circle
          key={n.id}
          cx={n.point.u * viewport.width}
          cy={n.point.v * viewport.height}
          r={2.5}
          fill={T.cyan}
        />
      ))}
    </g>
  );
}

export function SelectionRing({
  cx,
  cy,
  color,
  r = 14,
}: {
  cx: number;
  cy: number;
  color: string;
  r?: number;
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={1.25}
      strokeDasharray="5 4"
      strokeOpacity={0.9}
    />
  );
}

export function StatusDashRing({
  cx,
  cy,
  color,
  r = 11,
}: {
  cx: number;
  cy: number;
  color: string;
  r?: number;
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={1}
      strokeDasharray="4 5"
      strokeOpacity={0.8}
    />
  );
}

export function AnomalyMarker({
  cx,
  cy,
  selected,
  unverified,
}: {
  cx: number;
  cy: number;
  selected?: boolean;
  unverified?: boolean;
}) {
  const tag = "UNVERIFIED · GRID 4C";
  const chipW = 118;
  const chipH = 20;
  return (
    <g>
      {selected && <SelectionRing cx={cx} cy={cy} color={T.fire} r={16} />}
      <circle cx={cx} cy={cy} r={7} fill={tint(T.fire, 0.2)} stroke={T.fire} strokeWidth={1.4} />
      <circle cx={cx} cy={cy} r={3.2} fill={T.fire} />
      {unverified && (
        <g pointerEvents="none">
          <rect
            x={cx + 10}
            y={cy - 11}
            width={chipW}
            height={chipH}
            rx={radius.dense}
            fill={surface.panelDense}
            stroke={tint(T.amber, 0.45)}
            strokeWidth={1}
          />
          <text
            x={cx + 10 + chipW / 2}
            y={cy - 11 + chipH / 2 + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill={T.textPrimary}
            fontSize={typeScale.metadata}
            fontFamily={font.mono}
            fontWeight={typeWeight.medium}
            letterSpacing={tracking.telemetry}
          >
            {tag}
          </text>
        </g>
      )}
    </g>
  );
}
