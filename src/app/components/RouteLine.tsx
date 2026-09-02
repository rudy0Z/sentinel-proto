import { useEffect, useRef, useState } from "react";
import { T } from "../tokens";
import { MapLabelSvg } from "../map/render/MapLabel";

/*
 * RouteLine — map route/arrow system.
 * Label geometry comes from path length; craft matches MapLabel (no glow).
 */

export type RouteVariant = "egress" | "ingress" | "reroute" | "investigation";

const VARIANT_MARKER: Record<RouteVariant, string> = {
  egress: "route-arrow-egress",
  ingress: "route-arrow-ingress",
  reroute: "route-arrow-reroute",
  investigation: "route-arrow-investigation",
};

const VARIANT_DASH: Record<RouteVariant, string | undefined> = {
  egress: undefined,
  ingress: "9 6",
  reroute: "7 6",
  investigation: "5 5",
};

export function RouteArrowDefs() {
  return (
    <>
      {(
        [
          ["route-arrow-egress", T.textPrimary],
          ["route-arrow-ingress", T.yellow],
          ["route-arrow-reroute", T.amber],
          ["route-arrow-investigation", T.cyan],
        ] as const
      ).map(([id, color]) => (
        <marker key={id} id={id} markerWidth="10" markerHeight="9" refX="8.4" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L9.5,4.5 L0,9 L2.6,4.5 Z" fill={color} />
        </marker>
      ))}
    </>
  );
}

function usePathGeometry(pathRef: React.RefObject<SVGPathElement>, d: string) {
  const [geo, setGeo] = useState<{ startX: number; startY: number; midX: number; midY: number; angle: number } | null>(null);

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const length = el.getTotalLength();
    if (!length) return;
    const start = el.getPointAtLength(0);
    const mid = el.getPointAtLength(length * 0.5);
    const before = el.getPointAtLength(Math.max(0, length * 0.5 - 6));
    const after = el.getPointAtLength(Math.min(length, length * 0.5 + 6));
    const angle = Math.atan2(after.y - before.y, after.x - before.x);
    setGeo({ startX: start.x, startY: start.y, midX: mid.x, midY: mid.y, angle });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  return geo;
}

export function RouteLine({
  path,
  color,
  label,
  variant,
  animate,
  labelOffset = 18,
  emphasized = true,
}: {
  path: string;
  color: string;
  label: string;
  variant: RouteVariant;
  animate: boolean;
  labelOffset?: number;
  /** When false, dim non-selected corridors (single-route authority). */
  emphasized?: boolean;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const geo = usePathGeometry(pathRef, path);
  const dash = VARIANT_DASH[variant];
  const flows = animate && emphasized && (variant === "egress" || variant === "ingress" || variant === "investigation");
  const breathes = animate && emphasized && variant === "reroute";
  const opacity = emphasized ? 1 : 0.35;

  const labelChip = geo && (() => {
    const nx = -Math.sin(geo.angle);
    const ny = Math.cos(geo.angle);
    const towardTop = geo.midY > 450 ? -1 : 1;
    const lx = geo.midX + nx * labelOffset * towardTop;
    const ly = geo.midY + ny * labelOffset * towardTop;

    return (
      <g opacity={opacity}>
        <line x1={geo.midX} y1={geo.midY} x2={lx} y2={ly} stroke={color} strokeWidth={1} strokeOpacity={0.4} />
        <MapLabelSvg x={lx} y={ly} label={label} color={color} selected={emphasized} />
      </g>
    );
  })();

  return (
    <g pointerEvents="none" opacity={opacity}>
      {/* Flat under-stroke only — no Gaussian glow (shell material law). */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeOpacity={0.16}
        strokeLinecap="round"
      />

      <path
        ref={pathRef}
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeDasharray={dash}
        markerEnd={`url(#${VARIANT_MARKER[variant]})`}
      >
        {breathes && (
          <animate attributeName="stroke-opacity" values="0.55;0.95;0.55" dur="2.6s" repeatCount="indefinite" />
        )}
      </path>

      {flows && (
        <path d={path} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeDasharray="3 14" strokeOpacity={0.85}>
          <animate attributeName="stroke-dashoffset" from="0" to="-34" dur="1.1s" repeatCount="indefinite" />
        </path>
      )}

      {geo && (
        <>
          <circle cx={geo.startX} cy={geo.startY} r={4.5} fill={color} fillOpacity={0.16} />
          <circle cx={geo.startX} cy={geo.startY} r={2.4} fill={color} />
        </>
      )}

      {labelChip}
    </g>
  );
}
