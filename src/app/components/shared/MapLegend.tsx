import { useId, useRef, useState } from "react";
import {
  T,
  border,
  font,
  layer,
  motion,
  radius,
  space,
  surface,
  tint,
  typeScale,
  typeWeight,
} from "../../tokens";
import { PopoverSurface, usePopoverDismissal } from "./PopoverSurface";

interface MapLegendProps {
  coreMode?: boolean;
}

const LEGEND_ITEMS = [
  {
    id: "zone",
    label: "Zone boundary",
    detail: "Operational area. Cyan marks buffer space; red marks residential exposure.",
    swatch: (
      <span
        aria-hidden="true"
        style={{
          width: 24,
          height: 14,
          border: `1.5px dashed ${T.cyan}`,
          borderRadius: radius.xs,
          background: tint(T.cyan, 0.06),
          flexShrink: 0,
        }}
      />
    ),
  },
  {
    id: "route",
    label: "Routing line",
    detail: "Solid white is guided egress; dashed yellow is responder ingress.",
    swatch: (
      <span aria-hidden="true" style={{ position: "relative", width: 24, height: 14, flexShrink: 0 }}>
        <span style={{ position: "absolute", left: 0, right: 0, top: 4, borderTop: "2px solid rgba(255,255,255,0.9)" }} />
        <span style={{ position: "absolute", left: 0, right: 0, bottom: 2, borderTop: `2px dashed ${T.yellow}` }} />
      </span>
    ),
  },
  {
    id: "drone",
    label: "Drone asset",
    detail: "Marker ring shows selection, assignment, holding, or degraded signal state.",
    swatch: (
      <span
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
          marginInline: 4,
          border: `1.5px solid ${T.cyan}`,
          borderRadius: "50%",
          background: tint(T.cyan, 0.12),
          boxShadow: `inset 0 0 0 4px ${surface.overlay}`,
          flexShrink: 0,
        }}
      />
    ),
  },
  {
    id: "uncertainty",
    label: "Uncertainty envelope",
    detail: "Amber dotted outline is an added safety margin from degraded evidence, not fire spread.",
    swatch: (
      <span
        aria-hidden="true"
        style={{
          width: 24,
          height: 14,
          border: `2px dotted ${T.amber}`,
          borderRadius: radius.xs,
          background: tint(T.amber, 0.09),
          flexShrink: 0,
        }}
      />
    ),
  },
] as const;

export function MapLegend({ coreMode = false }: MapLegendProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  usePopoverDismissal({
    open,
    onClose: () => setOpen(false),
    triggerRef,
    surfaceRef,
  });

  if (coreMode) return null;

  return (
    <div
      data-testid="map-legend"
      style={{
        position: "absolute",
        // Keep the control below the command header's larger interactive hit area.
        top: 116,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: layer.modal,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-haspopup="true"
        data-testid="map-legend-trigger"
        onClick={() => setOpen((current) => !current)}
        style={{
          minHeight: 32,
          padding: `0 ${space.lg}px`,
          display: "inline-flex",
          alignItems: "center",
          gap: space.sm,
          border: `1px solid ${open ? tint(T.cyan, 0.44) : border.default}`,
          borderRadius: radius.md,
          background: open ? surface.controlActive : "rgba(8,16,28,0.9)",
          color: open ? T.textPrimary : T.textSecondary,
          fontFamily: font.sans,
          fontSize: typeScale.label,
          fontWeight: typeWeight.semibold,
          transition: `background ${motion.fast}, color ${motion.fast}, border-color ${motion.fast}`,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 14,
            height: 10,
            border: `1.5px dashed ${T.cyan}`,
            borderRadius: radius.xs,
          }}
        />
        Map key
      </button>

      {open ? (
        <PopoverSurface
          ref={surfaceRef}
          ariaLabel="Map vocabulary"
          width={264}
          style={{ top: 38 }}
        >
          <div id={popoverId} data-testid="map-legend-popover">
            <div
              style={{
                padding: `${space.xl}px ${space["3xl"]}px`,
                borderBottom: `1px solid ${border.soft}`,
              }}
            >
              <div style={{ color: T.textPrimary, fontFamily: font.sans, fontSize: typeScale.title, fontWeight: typeWeight.bold }}>
                Map vocabulary
              </div>
              <div style={{ marginTop: space.xs, color: T.textMuted, fontFamily: font.sans, fontSize: typeScale.caption, lineHeight: 1.45 }}>
                Selection uses a solid emphasis. Hover and keyboard focus are temporary.
              </div>
            </div>
            <div style={{ padding: `${space.sm}px ${space["3xl"]}px ${space.lg}px` }}>
              {LEGEND_ITEMS.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px minmax(0, 1fr)",
                    alignItems: "start",
                    gap: space.md,
                    padding: `${space.md}px 0`,
                    borderBottom: item.id === "uncertainty" ? "none" : `1px solid ${border.soft}`,
                  }}
                >
                  <span style={{ minHeight: 20, display: "flex", alignItems: "center" }}>{item.swatch}</span>
                  <span>
                    <span style={{ display: "block", color: T.textPrimary, fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold }}>
                      {item.label}
                    </span>
                    <span style={{ display: "block", marginTop: space.xs, color: T.textMuted, fontFamily: font.sans, fontSize: typeScale.caption, lineHeight: 1.4 }}>
                      {item.detail}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </PopoverSurface>
      ) : null}
    </div>
  );
}
