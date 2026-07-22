import { useEffect, useRef, useState } from "react";
import { font } from "../tokens";

/*
 * RouteLine — the map's route/arrow system.
 *
 * Previously every route was a raw bezier path with a flat-backed triangle
 * marker, a bare text label at a hand-tuned pixel, and — in the TALON reroute
 * proposal's case — no arrowhead or label chip at all, breaking the visual
 * language the other two route types established. That inconsistency was the
 * actual complaint: not that arrows are hard, but that this one asset never
 * got the same pass as the drone markers and zone badges.
 *
 * Two decisions here matter beyond the visual refresh:
 *
 * 1. Label position is measured from the path itself (getPointAtLength) rather
 *    than carried as a hand-tuned textX/textY per route. When the map asset
 *    changes and route coordinates shift, labels move with the path instead of
 *    needing to be retuned one-by-one — the fragility this was setting up to
 *    avoid before the pan work starts.
 * 2. Motion is a variant property, not decoration. Active guidance flows
 *    toward its destination; a TALON proposal awaiting approval breathes
 *    instead — the same distinction the rest of the shell draws between
 *    "executing" and "held for a human gate."
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

/**
 * One shared set of marker/filter defs for every RouteLine on the map. Render
 * once inside the parent SVG's <defs> — markers are referenced by id, so a
 * second copy would collide rather than duplicate cleanly.
 */
export function RouteArrowDefs() {
  return (
    <>
      <filter id="route-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      {(
        [
          ["route-arrow-egress", "rgba(255,255,255,0.95)"],
          ["route-arrow-ingress", "#FFD166"],
          ["route-arrow-reroute", "#F5A623"],
          ["route-arrow-investigation", "#00C8FF"],
        ] as const
      ).map(([id, color]) => (
        // Tapered dart with a concave back edge — reads as a directed flight
        // path rather than a clip-art triangle, and stays legible at 9x8.
        <marker key={id} id={id} markerWidth="10" markerHeight="9" refX="8.4" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L9.5,4.5 L0,9 L2.6,4.5 Z" fill={color} />
        </marker>
      ))}
    </>
  );
}

/** Mid-path position and local tangent angle, measured from the rendered path. */
function usePathGeometry(pathRef: React.RefObject<SVGPathElement>, d: string) {
  const [geo, setGeo] = useState<{ startX: number; startY: number; midX: number; midY: number; angle: number } | null>(null);

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const length = el.getTotalLength();
    if (!length) return;
    const start = el.getPointAtLength(0);
    const mid = el.getPointAtLength(length * 0.5);
    /* Local tangent via two nearby samples — enough to offset the label
       perpendicular to travel without a full derivative. */
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
}: {
  path: string;
  color: string;
  label: string;
  variant: RouteVariant;
  animate: boolean;
  /** Perpendicular distance from the path to the label chip, in px. */
  labelOffset?: number;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const geo = usePathGeometry(pathRef, path);
  const dash = VARIANT_DASH[variant];
  /* Proposals awaiting a human gate breathe in place; active guidance flows
     toward its destination — the same executing-vs-held distinction the rest
     of the shell draws with the ActionBar and TALON rail. */
  const flows = animate && (variant === "egress" || variant === "ingress" || variant === "investigation");
  const breathes = animate && variant === "reroute";

  const labelChip = geo && (() => {
    /* Push the chip to whichever side of the path has more room, roughly —
       away from map-vertical-center keeps most routes from stacking their
       label back onto the line itself. */
    const nx = -Math.sin(geo.angle);
    const ny = Math.cos(geo.angle);
    const towardTop = geo.midY > 450 ? -1 : 1;
    const lx = geo.midX + nx * labelOffset * towardTop;
    const ly = geo.midY + ny * labelOffset * towardTop;
    const chipW = label.length * 6.1 + 18;
    const chipH = 20;

    return (
      <g pointerEvents="none">
        <line x1={geo.midX} y1={geo.midY} x2={lx} y2={ly} stroke={color} strokeWidth={1} strokeOpacity={0.4} />
        <rect
          x={lx - chipW / 2}
          y={ly - chipH / 2}
          width={chipW}
          height={chipH}
          rx={4}
          fill="#050A12"
          fillOpacity={0.82}
          stroke={color}
          strokeOpacity={0.4}
          strokeWidth={1}
        />
        <text
          x={lx}
          y={ly + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={10}
          fontFamily={font.mono}
          fontWeight={600}
          letterSpacing="0.02em"
        >
          {label}
        </text>
      </g>
    );
  })();

  return (
    <g pointerEvents="none">
      {/* Soft duct glow behind the line — separates the route from the terrain
          underneath instead of sitting on it as a flat clip-art stroke. */}
      <path d={path} fill="none" stroke={color} strokeWidth={5} strokeOpacity={0.16} strokeLinecap="round" filter="url(#route-glow)" />

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

      {/* Directional flow — a second dashed pass drifting toward the arrowhead,
          the same "this is live guidance" cue the LiDAR sweep gives the map. */}
      {flows && (
        <path d={path} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeDasharray="3 14" strokeOpacity={0.85}>
          <animate attributeName="stroke-dashoffset" from="0" to="-34" dur="1.1s" repeatCount="indefinite" />
        </path>
      )}

      {/* Origin marker — without it the arrow floats with no indication of
          where the guidance actually starts. */}
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
