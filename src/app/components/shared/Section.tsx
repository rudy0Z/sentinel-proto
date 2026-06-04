import type { ReactNode } from "react";
import { T, font, space, typeScale } from "../../tokens";

interface SectionProps {
  label: string;
  children: ReactNode;
}

/** Consistent section header + content wrapper used across all panels */
export function Section({ label, children }: SectionProps) {
  return (
    <div role="region" aria-label={label}>
      <div
        style={{
          fontFamily: font.mono,
          fontSize: typeScale.caption,
          color: T.textMuted,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: space.lg,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: space.lg }}>{children}</div>
    </div>
  );
}
