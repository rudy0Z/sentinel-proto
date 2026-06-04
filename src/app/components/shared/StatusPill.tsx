import { T, font, radius, space, tint, typeScale, typeWeight } from "../../tokens";

interface StatusPillProps {
  label: string;
  color: string;
}

/** Consistent status pill used across all panels, map, and action bar */
export function StatusPill({ label, color }: StatusPillProps) {
  return (
    <span
      style={{
        fontFamily: font.sans,
        fontSize: typeScale.caption,
        fontWeight: typeWeight.bold,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color,
        padding: `${space.xs}px ${space.md}px`,
        borderRadius: radius.pill,
        border: `1px solid ${tint(color, 0.28)}`,
        background: tint(color, 0.08),
        whiteSpace: "nowrap",
      }}
      role="status"
    >
      {label}
    </span>
  );
}
