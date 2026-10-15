/*
 * ─── Alert airspace (shell v2) — docs/redesign-2026/03 §Architecture ───────
 * The top band is reserved for exactly one thing: the arbitrated interrupt
 * (Rule of One, ISA-18.2 budget enforced upstream in domain/attention.ts).
 * A quiet top band IS the signal that the board is clean.
 */
import type { CSSProperties } from "react";
import { T, font, layer, space, typeStyle, typeWeight } from "../../tokens";
import { KitStyles, PanelGlass, StatusPill, TierDot, type Tier } from "../kit/core";

export function AlertAirspace({
  pop,
  live,
  liveConnected,
}: {
  pop: { text: string; tier: Tier } | null;
  live: boolean;
  liveConnected: boolean;
}) {
  if (!pop && !live) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: space.md,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: layer.alert,
        display: "flex",
        alignItems: "center",
        gap: space.md,
        maxWidth: 560,
      }}
    >
      <KitStyles />
      {pop ? (
        <PanelGlass
          variant="raised"
          padding={`10px ${16}px`}
          style={{ display: "flex", alignItems: "center", gap: space.md } as CSSProperties}
          data-alert="true"
        >
          <TierDot tier={pop.tier} />
          <span style={{ fontFamily: font.sans, fontSize: typeStyle.body.size, fontWeight: typeWeight.semibold, color: T.textPrimary, whiteSpace: "nowrap" }}>
            {pop.text}
          </span>
        </PanelGlass>
      ) : null}
      {live ? <StatusPill label={liveConnected ? "LIVE-SIM" : "LIVE-SIM · OFFLINE"} tone={liveConnected ? "info" : "caution"} pulse={!liveConnected} /> : null}
    </div>
  );
}
