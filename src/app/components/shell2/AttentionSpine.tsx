/*
 * ─── Attention Spine (shell v2) — docs/redesign-2026/03 §Architecture ──────
 * Peek tabs whose lips carry one live value + a tier dot (collapsed ≠ blind).
 * v1.1 adds the left-deck interaction: a tick position indicator (n/n count +
 * segmented track, scroll-indicator metaphor), stacked scroll-mode headers
 * inside the open panel (browser-tab metaphor, tap to land), and a manual pin
 * (one pinned tab max). No auto-raise, no free drag-out: TALON badges via
 * tier, the operator opens. Tabs never move mid-hold: the spine sits outside
 * the Command Deck entirely.
 */
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { T, border, font, layer, light, motion, radius, space, tracking, tint, typeScale, typeStyle, typeWeight } from "../../tokens";
import { KitStyles, PanelGlass, TierDot, pillTone, type Tier } from "../kit/core";

export interface SpineView {
  id: string;
  label: string;
  /** One load-bearing live value shown while collapsed. */
  lip?: string;
  tier?: Tier;
  render: () => ReactNode;
}

const SPINE_ABBR: Record<string, string> = {
  inspect: "SCAN",
  assets: "GRID",
  ledger: "LOG",
  talon: "TALON",
  priorities: "TASK",
  readiness: "TEAM",
  exceptions: "EXC",
};

export function AttentionSpine({
  side,
  inset,
  views,
  top,
  bottom,
  panelWidth = 340,
}: {
  side: "left" | "right";
  /** Distance from the viewport edge (or from the Mind console on the right). */
  inset: number;
  views: SpineView[];
  top: number;
  bottom: number;
  panelWidth?: number;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const expanded = views.find((view) => view.id === expandedId) ?? null;
  const activeIndex = expanded ? views.findIndex((view) => view.id === expanded.id) : -1;
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const openView = (id: string) => {
    setExpandedId(id);
    /* Land on the tab: body back to top. Reduced motion is handled by the
       global transition cut; scroll itself jumps when the user prefers it. */
    const reduced =
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    bodyRef.current?.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % views.length;
    else if (event.key === "ArrowUp") nextIndex = (index - 1 + views.length) % views.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = views.length - 1;
    else return;
    event.preventDefault();
    const next = views[nextIndex];
    if (!next) return;
    openView(next.id);
    requestAnimationFrame(() => tabRefs.current[next.id]?.focus());
  };

  return (
    <div
      style={{
        position: "absolute",
        [side]: inset,
        top,
        bottom,
        width: expanded ? 64 + panelWidth : 64,
        zIndex: layer.rail,
        display: "flex",
        flexDirection: side === "left" ? "row" : "row-reverse",
        gap: space.sm,
        transition: `width ${motion.deliberate}`,
      }}
    >
      <KitStyles />
      {/* Edge indicator + peek tabs: count, tick track, then one tab per view.
          Ticks are position only (aria-hidden); the tabs stay the controls. */}
      <div
        role="tablist"
        aria-label={`${side} attention spine`}
        aria-orientation="vertical"
        style={{
          width: 64,
          display: "flex",
          flexDirection: "column",
          gap: space.sm,
          padding: `${space.sm}px ${space.xs}px`,
          justifyContent: "flex-end",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `0 ${space.xs}px`,
          }}
        >
          <span
            style={{
              fontFamily: font.mono,
              fontSize: typeScale.metadata,
              color: light.textMuted,
              fontFeatureSettings: '"tnum"',
            }}
          >
            {activeIndex >= 0 ? `${activeIndex + 1}/${views.length}` : `–/${views.length}`}
          </span>
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              gap: space.xs,
            }}
          >
            {views.map((view) => {
              const isActive = view.id === expandedId;
              const tone =
                view.tier === "T1" ? light.tone.danger : view.tier === "T2" ? light.tone.caution : isActive ? light.tone.info : light.textMuted;
              return (
                <span
                  key={view.id}
                  style={{
                    width: isActive ? space.lg : space.md,
                    height: space.xs,
                    borderRadius: radius.pill,
                    background: tone,
                    opacity: isActive ? 1 : 0.45,
                    transition: `width ${motion.fast}, background ${motion.fast}, opacity ${motion.fast}`,
                  }}
                />
              );
            })}
          </span>
        </div>
        {views.map((view, index) => {
          const active = view.id === expandedId;
          const pinned = view.id === pinnedId;
          return (
            <button
              key={view.id}
              type="button"
              role="tab"
              ref={(node) => { tabRefs.current[view.id] = node; }}
              data-spine-tab="true"
              aria-selected={active}
              aria-expanded={active}
              aria-label={`${view.label}${view.lip ? ` — ${view.lip}` : ""}${pinned ? " — pinned" : ""}`}
              title={view.lip ? `${view.label} · ${view.lip}` : view.label}
              onClick={() => {
                if (active && pinned) {
                  setPinnedId(null);
                  setExpandedId(null);
                  return;
                }
                if (active) {
                  setExpandedId(null);
                  return;
                }
                openView(view.id);
              }}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 5px",
                borderRadius: radius.control,
                border: `1px solid ${active ? tint(light.tone.info, 0.45) : light.border}`,
                background: active ? tint(light.tone.info, 0.1) : light.control,
                backdropFilter: "blur(16px) saturate(1.3)",
                WebkitBackdropFilter: "blur(16px) saturate(1.3)",
                cursor: "pointer",
                minHeight: 40,
              }}
            >
              <TierDot tier={view.tier ?? "T4"} />
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: typeStyle.eyebrow.size,
                  lineHeight: "12px",
                  letterSpacing: tracking.telemetry,
                  textTransform: "uppercase",
                  color: active ? light.tone.info : light.textSecondary,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 44,
                }}
              >
                {SPINE_ABBR[view.id] ?? view.label.slice(0, 5)}
              </span>
              {pinned ? (
                <span
                  aria-hidden="true"
                  style={{
                    width: space.xs,
                    height: space.xs,
                    borderRadius: radius.pill,
                    background: light.tone.info,
                    flexShrink: 0,
                  }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {/* Expanded panel — one at a time, never covering the gates.
          Stacked scroll-mode headers on top (all views, tap to land), body
          below. Pin keeps the tab; it never auto-opens anything. */}
      <div
        data-spine-panel={expanded ? "open" : undefined}
        aria-hidden={!expanded}
        style={{
          width: expanded ? panelWidth : 0,
          opacity: expanded ? 1 : 0,
          overflow: "hidden",
          display: "flex",
          transition: `width ${motion.deliberate}, opacity ${motion.normal}`,
        }}
      >
        {expanded ? (
          <PanelGlass light
            variant="panel"
            padding={space.md}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: space.sm,
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: space.xs,
                overflowY: "auto",
                scrollSnapType: "y proximity",
                flexShrink: 0,
                maxHeight: 3 * 44 + space.md,
              }}
            >
              {views.map((view) => {
                const isActive = view.id === expanded.id;
                const isPinned = view.id === pinnedId;
                return (
                  <button
                    key={view.id}
                    type="button"
                    data-spine-stack-tab={isActive ? "active" : undefined}
                    aria-current={isActive}
                    aria-label={`${view.label}${view.lip ? ` — ${view.lip}` : ""}`}
                    title={view.lip ? `${view.label} · ${view.lip}` : view.label}
                    onClick={() => openView(view.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: space.sm,
                      minHeight: 36,
                      padding: `${space.sm}px ${space.md}px`,
                      borderRadius: radius.control,
                      border: `1px solid ${isActive ? tint(light.tone.info, 0.45) : light.border}`,
                      background: isActive ? tint(light.tone.info, 0.08) : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      scrollSnapAlign: "start",
                      width: "100%",
                    }}
                  >
                    <TierDot tier={view.tier ?? "T4"} />
                    <span
                      style={{
                        fontFamily: font.mono,
                        fontSize: typeScale.metadata,
                        letterSpacing: tracking.telemetry,
                        textTransform: "uppercase",
                        color: isActive ? light.tone.info : light.textSecondary,
                        fontWeight: isActive ? typeWeight.bold : typeWeight.semibold,
                        flexShrink: 0,
                      }}
                    >
                      {SPINE_ABBR[view.id] ?? view.label.slice(0, 5)}
                    </span>
                    <span
                      style={{
                        fontFamily: font.sans,
                        fontSize: typeScale.label,
                        color: light.textMuted,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {view.lip ?? view.label}
                    </span>
                    {isPinned ? (
                      <span
                        style={{
                          fontFamily: font.mono,
                          fontSize: typeScale.metadata,
                          color: light.tone.info,
                          flexShrink: 0,
                        }}
                      >
                        PIN
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: space.sm,
              }}
            >
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: typeScale.metadata,
                  letterSpacing: tracking.telemetry,
                  textTransform: "uppercase",
                  color: light.textMuted,
                }}
              >
                {expanded.label}
              </span>
              <button
                type="button"
                aria-pressed={pinnedId === expanded.id}
                aria-label={pinnedId === expanded.id ? `Unpin ${expanded.label}` : `Pin ${expanded.label}`}
                onClick={() => setPinnedId((current) => (current === expanded.id ? null : expanded.id))}
                style={{
                  border: `1px solid ${pinnedId === expanded.id ? tint(light.tone.info, 0.45) : light.border}`,
                  borderRadius: radius.control,
                  background: pinnedId === expanded.id ? tint(light.tone.info, 0.1) : "transparent",
                  color: pinnedId === expanded.id ? light.tone.info : light.textMuted,
                  fontFamily: font.mono,
                  fontSize: typeScale.metadata,
                  letterSpacing: tracking.telemetry,
                  textTransform: "uppercase",
                  padding: `${space.xs}px ${space.sm}px`,
                  cursor: "pointer",
                }}
              >
                {pinnedId === expanded.id ? "Pinned" : "Pin"}
              </button>
            </div>
            <div
              ref={bodyRef}
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
              }}
            >
              {expanded.render()}
            </div>
          </PanelGlass>
        ) : null}
      </div>
    </div>
  );
}

