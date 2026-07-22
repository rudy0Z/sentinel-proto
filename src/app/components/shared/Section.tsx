import type { ReactNode } from "react";
import { T, border, font, space, typeScale, typeWeight } from "../../tokens";

interface SectionProps {
  label: string;
  children: ReactNode;
}

/** Consistent section header + content wrapper used across all panels */
export function Section({ label, children }: SectionProps) {
  return (
    <section aria-label={label} style={{ borderTop: `1px solid ${border.soft}`, paddingTop: space.xl }}>
      <div
        style={{
          fontFamily: font.sans,
          fontSize: typeScale.label,
          fontWeight: typeWeight.semibold,
          color: T.textSecondary,
          marginBottom: space.xl,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: space.lg }}>{children}</div>
    </section>
  );
}
