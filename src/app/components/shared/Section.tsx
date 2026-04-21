import type { ReactNode } from "react";
import { T, font } from "../../tokens";

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
          fontSize: 10,
          color: T.textMuted,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}
