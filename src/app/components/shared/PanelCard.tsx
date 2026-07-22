import { useContext, type ReactNode } from "react";
import { PanelBody, PanelHeader } from "./RailPanelFrame";
import { RailChromeContext } from "./railChrome";

interface PanelCardProps {
  title: string;
  badgeLabel: string;
  badgeColor: string;
  /** Optional action button label in the header */
  actionLabel?: string;
  /** Callback for the action button */
  onAction?: () => void;
  /** Force body-only rendering (no header). Otherwise inherited from RailChromeContext. */
  chromeless?: boolean;
  /** Optional control rendered on the right of the header (e.g. a small toggle) */
  headerAccessory?: ReactNode;
  children: ReactNode;
}

/** Rail panel content primitive. The outer glass frame is owned by RailPanelFrame / RailStack. */
export function PanelCard({ title, badgeLabel, badgeColor, actionLabel, onAction, chromeless, headerAccessory, children }: PanelCardProps) {
  const ctx = useContext(RailChromeContext);
  const headerless = chromeless ?? ctx.chromeless;
  return (
    <div style={{ width: "100%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "visible" }}>
      {!headerless && (
        <PanelHeader title={title} badgeLabel={badgeLabel} badgeColor={badgeColor} actionLabel={actionLabel} onAction={onAction} accessory={headerAccessory} />
      )}
      <PanelBody>
        {children}
      </PanelBody>
    </div>
  );
}
