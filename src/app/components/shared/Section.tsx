import { useState, type CSSProperties, type ReactNode } from "react";
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
  /**
   * Omit for the original always-open section (unchanged everywhere that
   * doesn't pass it). Pass `true`/`false` to make the section collapsible,
   * starting at that state — the same escape hatch that fixed the TALON rail
   * overflow, now available to any panel. A rail that stacks many Sections at
   * once (the right rail in Operations mode is the clearest case) reads as
   * "everything shouting at once" when every one of them is always expanded;
   * this lets the secondary, inspection-only ones default shut without
   * removing them.
   */
  defaultOpen?: boolean;
  /** Optional one-line summary shown next to the label, visible even when shut. */
  summary?: string;
}

/** Consistent section header + content wrapper used across all panels */
export function Section({ label, children, defaultOpen, summary }: SectionProps) {
  const collapsible = defaultOpen !== undefined;
  const [open, setOpen] = useState(defaultOpen ?? true);

  if (!collapsible) {
    return (
      <section aria-label={label} style={{ borderTop: `1px solid ${border.soft}`, paddingTop: space.md }}>
        <RailSectionLabel style={{ marginBottom: space.md }}>{label}</RailSectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: space.md }}>{children}</div>
      </section>
    );
  }

  return (
    <section aria-label={label} style={{ borderTop: `1px solid ${border.soft}`, paddingTop: space.md }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.sm,
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <RailSectionLabel>{label}</RailSectionLabel>
          {summary && !open ? (
            <div style={{ marginTop: 2, fontFamily: font.sans, fontSize: typeScale.caption, color: T.textMuted }}>{summary}</div>
          ) : null}
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0, color: T.textMuted }}>
          <path d={open ? "m3 5 4 4 4-4" : "m5 3 4 4-4 4"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div style={{ marginTop: space.md, display: "flex", flexDirection: "column", gap: space.md }}>{children}</div>
      ) : null}
    </section>
  );
}
