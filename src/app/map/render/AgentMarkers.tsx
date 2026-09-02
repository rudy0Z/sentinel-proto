import { T, tint, radius, surface } from "../../tokens";
import { SelectionRing, StatusDashRing } from "./ZoneLayer";
import type { AgentKind } from "../types";

function DroneClassGlyph({ droneClass, cx, cy, color }: { droneClass?: string; cx: number; cy: number; color: string }) {
  switch (droneClass) {
    case "thermal-lidar":
      return <path d={`M ${cx} ${cy - 3.2} L ${cx + 3.2} ${cy} L ${cx} ${cy + 3.2} L ${cx - 3.2} ${cy} Z`} fill={color} opacity={0.9} />;
    case "guidance-relay":
      return (
        <g fill="none" stroke={color} strokeWidth={1}>
          <path d={`M ${cx - 3.2},${cy - 1.6} A 4 4 0 0 1 ${cx + 3.2},${cy - 1.6}`} />
          <path d={`M ${cx - 1.7},${cy - 0.2} A 2.2 2.2 0 0 1 ${cx + 1.7},${cy - 0.2}`} />
        </g>
      );
    case "evacuation-guidance":
      return <path d={`M ${cx},${cy + 3} L ${cx},${cy - 1} L ${cx + 2.5},${cy + 3} Z`} fill={color} fillOpacity={0.85} />;
    case "multi-role":
      return (
        <path
          d={`M ${cx},${cy - 3.4} L ${cx + 0.9},${cy - 0.9} L ${cx + 3.4},${cy} L ${cx + 0.9},${cy + 0.9} L ${cx},${cy + 3.4} L ${cx - 0.9},${cy + 0.9} L ${cx - 3.4},${cy} L ${cx - 0.9},${cy - 0.9} Z`}
          fill={color}
        />
      );
    case "surveillance":
    default:
      return <circle cx={cx} cy={cy} r={1.6} fill={color} />;
  }
}

export function DroneMarker({
  cx,
  cy,
  label,
  selected,
  statusColor = T.cyan,
  droneClass,
}: {
  cx: number;
  cy: number;
  label: string;
  selected?: boolean;
  statusColor?: string;
  droneClass?: string;
}) {
  return (
    <g style={{ cursor: "pointer" }}>
      {selected && <SelectionRing cx={cx} cy={cy} color={statusColor} r={15} />}
      <StatusDashRing cx={cx} cy={cy} color={statusColor} r={11} />
      <circle cx={cx} cy={cy} r={5.5} fill={tint(statusColor, 0.25)} stroke={statusColor} strokeWidth={1.2} />
      <DroneClassGlyph droneClass={droneClass} cx={cx} cy={cy} color={T.textPrimary} />
      <title>{label}</title>
    </g>
  );
}

export function TeamMarker({
  cx,
  cy,
  label,
  selected,
  statusColor = T.amber,
}: {
  cx: number;
  cy: number;
  label: string;
  selected?: boolean;
  statusColor?: string;
}) {
  const r = 4.5;
  return (
    <g style={{ cursor: "pointer" }}>
      {selected && <SelectionRing cx={cx} cy={cy} color={statusColor} r={16} />}
      <StatusDashRing cx={cx} cy={cy} color={statusColor} r={12} />
      <rect
        x={cx - r * 0.95}
        y={cy - r * 0.72}
        width={r * 1.9}
        height={r * 1.44}
        rx={radius.dense}
        fill={statusColor}
        stroke={T.bgBase}
        strokeWidth={0.6}
      />
      <circle cx={cx} cy={cy} r={r * 0.35} fill={T.bgBase} fillOpacity={0.85} />
      <title>{label}</title>
    </g>
  );
}

export function agentStatusColor(kind: AgentKind, status?: string): string {
  if (kind === "team") {
    if (status === "deployed") return T.fire;
    if (status === "available") return T.teal;
    return T.amber;
  }
  if (status === "en-route") return T.amber;
  if (status === "assigned") return T.cyan;
  if (status === "holding") return T.teal;
  return T.cyan;
}
