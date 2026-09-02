import type { CSSProperties, ReactNode } from "react";
import { T, font, radius, typeScale, tracking, surface, border, tint, typeWeight } from "../../tokens";

export type MapLabelTone = "neutral" | "cyan" | "fire" | "amber" | "red" | "teal";

export function toneFromColor(color: string): MapLabelTone {
  const c = color.toLowerCase();
  if (c.includes("00c8ff") || c.includes(T.cyan.toLowerCase())) return "cyan";
  if (c.includes("ff6b4a") || c.includes(T.fire.toLowerCase())) return "fire";
  if (c.includes("f5a623") || c.includes(T.amber.toLowerCase())) return "amber";
  if (c.includes("e5533c") || c.includes(T.red.toLowerCase())) return "red";
  if (c.includes("2dd4a0") || c.includes(T.teal.toLowerCase())) return "teal";
  if (c.includes("ffd166") || c.includes(T.yellow.toLowerCase())) return "amber";
  return "neutral";
}

/** One map-label recipe (P0) — zones, units, routes all use this. */
export function MapLabel({
  children,
  x,
  y,
  tone = "neutral",
  selected = false,
  showDot = true,
  anchor = "above",
}: {
  children: ReactNode;
  x: number;
  y: number;
  tone?: MapLabelTone;
  selected?: boolean;
  showDot?: boolean;
  /** above = unit/zone plates; center = route chips at measured midpoints */
  anchor?: "above" | "center";
}) {
  const accent =
    tone === "cyan" ? T.cyan :
    tone === "fire" ? T.fire :
    tone === "amber" ? T.amber :
    tone === "red" ? T.red :
    tone === "teal" ? T.teal :
    T.textSecondary;

  const style: CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    transform: anchor === "center" ? "translate(-50%, -50%)" : "translate(-50%, -120%)",
    height: selected ? 22 : 20,
    padding: "0 8px",
    display: "flex",
    alignItems: "center",
    gap: showDot ? 6 : 0,
    borderRadius: radius.control,
    background: surface.panelDense,
    border: `1px solid ${selected ? tint(accent, 0.45) : border.default}`,
    color: T.textPrimary,
    fontFamily: font.mono,
    fontSize: typeScale.metadata,
    fontWeight: typeWeight.medium,
    letterSpacing: tracking.telemetry,
    whiteSpace: "nowrap",
    pointerEvents: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
  };

  return (
    <div style={style}>
      {showDot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: radius.dense,
            background: accent,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </div>
  );
}

/** SVG twin of MapLabel for in-SVG route chips (same material law). */
export function MapLabelSvg({
  x,
  y,
  label,
  color,
  selected = false,
}: {
  x: number;
  y: number;
  label: string;
  color: string;
  selected?: boolean;
}) {
  const chipH = selected ? 22 : 20;
  const chipW = Math.max(48, label.length * 6.2 + (selected ? 22 : 18));
  return (
    <g pointerEvents="none">
      <rect
        x={x - chipW / 2}
        y={y - chipH / 2}
        width={chipW}
        height={chipH}
        rx={radius.control}
        fill={surface.panelDense}
        stroke={selected ? tint(color, 0.45) : border.default}
        strokeWidth={1}
      />
      <circle cx={x - chipW / 2 + 10} cy={y} r={3} fill={color} />
      <text
        x={x + 2}
        y={y + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill={T.textPrimary}
        fontSize={typeScale.metadata}
        fontFamily={font.mono}
        fontWeight={typeWeight.medium}
        letterSpacing={tracking.telemetry}
      >
        {label}
      </text>
    </g>
  );
}
