import { T, font, radius, space, tint, typeScale, typeWeight } from "../../tokens";

interface StatusPillProps {
  label: string;
  color: string;
}

/** Compact semantic status used across operational surfaces. */
export function StatusPill({ label, color }: StatusPillProps) {
  return (
    <span
      style={{
        fontFamily: font.sans,
        fontSize: typeScale.label,
        fontWeight: typeWeight.semibold,
        color,
        padding: `${space.xs}px ${space.sm}px`,
        borderRadius: radius.control,
        border: `1px solid ${tint(color, 0.24)}`,
        background: tint(color, 0.06),
        whiteSpace: "nowrap",
      }}
      role="status"
    >
      {label}
    </span>
  );
}
