import type { ReactNode } from "react";
import { GI, T, font } from "../../tokens";
import { StatusPill } from "./StatusPill";

interface PanelCardProps {
  title: string;
  badgeLabel: string;
  badgeColor: string;
  /** Optional action button label in the header */
  actionLabel?: string;
  /** Callback for the action button */
  onAction?: () => void;
  children: ReactNode;
}

/** Glass panel card container used by both left and right rail panels */
export function PanelCard({ title, badgeLabel, badgeColor, actionLabel, onAction, children }: PanelCardProps) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          padding: "14px 16px 12px",
          borderBottom: `1px solid ${GI.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: font.sans, fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{title}</div>
          {actionLabel && onAction ? (
            <button
              onClick={onAction}
              aria-label={actionLabel}
              style={{
                fontFamily: font.mono,
                fontSize: 10,
                color: T.textMuted,
                letterSpacing: "0.06em",
                cursor: "pointer",
                padding: "3px 8px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                textTransform: "uppercase",
              }}
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
        <StatusPill label={badgeLabel} color={badgeColor} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    </div>
  );
}
