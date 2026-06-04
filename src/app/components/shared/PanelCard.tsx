import type { ReactNode } from "react";
import { PanelBody, PanelHeader } from "./RailPanelFrame";

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

/** Rail panel content primitive. The outer glass frame is owned by RailPanelFrame. */
export function PanelCard({ title, badgeLabel, badgeColor, actionLabel, onAction, children }: PanelCardProps) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PanelHeader title={title} badgeLabel={badgeLabel} badgeColor={badgeColor} actionLabel={actionLabel} onAction={onAction} />
      <PanelBody>
        {children}
      </PanelBody>
    </div>
  );
}
