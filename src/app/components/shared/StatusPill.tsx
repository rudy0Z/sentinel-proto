import { T, font } from "../../tokens";

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
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color,
        padding: "4px 8px",
        borderRadius: 999,
        border: `1px solid ${color}44`,
        background: `${color}12`,
        whiteSpace: "nowrap",
      }}
      role="status"
    >
      {label}
    </span>
  );
}
