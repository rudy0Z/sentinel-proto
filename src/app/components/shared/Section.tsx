import type { CSSProperties, ReactNode } from "react";
import { T, border, font, space, typeScale, typeWeight } from "../../tokens";

/** Shared rail/panel section label — one size, weight, and muted color everywhere. */
export function RailSectionLabel({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: font.sans,
        fontSize: typeScale.label,
        fontWeight: typeWeight.semibold,
        color: T.textMuted,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface SectionProps {
  label: string;
  children: ReactNode;
}

/** Consistent section header + content wrapper used across all panels */
export function Section({ label, children }: SectionProps) {
  return (
    <section aria-label={label} style={{ borderTop: `1px solid ${border.soft}`, paddingTop: space.md }}>
      <RailSectionLabel style={{ marginBottom: space.md }}>{label}</RailSectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>{children}</div>
    </section>
  );
}
