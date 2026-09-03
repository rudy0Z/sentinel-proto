import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { T, font, material, motion, radius, space, surface, tint, typeScale, typeWeight } from "../../tokens";
import { RailChromeContext } from "./railChrome";

export interface RailView {
  id: string;
  /** Short tab label */
  label: string;
  /** Optional small count/badge shown in the tab */
  badge?: { text: string; color: string };
  /** Body content — rendered chromeless inside the active floating surface */
  render: () => ReactNode;
}

/**
 * RailStack — single-focus rail.
 *
 * Replaces the old connected rail slab with a focused floating tab capsule plus
 * one active panel surface. The rail itself remains transparent, so unused space
 * returns to the map while dense content still scrolls without visible scrollbars.
 */
export function RailStack({ views, defaultViewId, ariaLabel }: { views: RailView[]; defaultViewId: string; ariaLabel?: string }) {
  const [activeId, setActiveId] = useState(defaultViewId);
  const prevDefault = useRef(defaultViewId);
  const userPinned = useRef(false);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const instanceId = useId().replace(/:/g, "");
  const availableIds = views.map((view) => view.id).join("|");

  /*
   * Scroll affordance. Tracks whether content remains below the fold so the
   * fade can be shown only when it means something. Re-measured on scroll, on
   * resize, and whenever the rail's content changes height (scene switches and
   * disclosure toggles both change it without a scroll event).
   */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  const updateOverflow = () => {
    const el = scrollRef.current;
    if (!el) return;
    setHasMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      updateOverflow();
      return;
    }
    updateOverflow();
    const ro = new ResizeObserver(updateOverflow);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    window.addEventListener("resize", updateOverflow);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateOverflow);
    };
  }, [activeId, availableIds]);

  // Smart defaults follow context until the operator explicitly pins a tab.
  useEffect(() => {
    if (prevDefault.current !== defaultViewId) {
      prevDefault.current = defaultViewId;
      if (!userPinned.current && views.some((view) => view.id === defaultViewId)) {
        setActiveId(defaultViewId);
      }
    }
  }, [availableIds, defaultViewId]);

  const active = views.find((v) => v.id === activeId);

  // If the active view disappeared (context changed the available set), fall back.
  useEffect(() => {
    if (views.length === 1) {
      userPinned.current = false;
      setActiveId(views[0]?.id ?? "");
    } else if (!views.find((v) => v.id === activeId)) {
      userPinned.current = false;
      setActiveId(views.find((v) => v.id === defaultViewId)?.id ?? views[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableIds]);

  const resolved = active ?? views.find((v) => v.id === defaultViewId) ?? views[0];
  if (!resolved) return null;
  const hasTabStrip = views.length > 1;
  const tabId = (viewId: string) => `${instanceId}-tab-${viewId}`;
  const contentPanelId = `${instanceId}-panel`;

  const pinView = (viewId: string, focus = false) => {
    userPinned.current = true;
    setActiveId(viewId);
    if (focus) {
      requestAnimationFrame(() => tabRefs.current[viewId]?.focus());
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % views.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + views.length) % views.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = views.length - 1;
    else return;

    event.preventDefault();
    pinView(views[nextIndex].id, true);
  };

  // Both rails wear the one rail material, so left and right read as the same
  // instrument seated over the map.
  const floatingSurface = material.rail;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: space.sm,
        overflow: "hidden",
      }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Core embeds have one view, so the redundant tab control disappears. */}
      {hasTabStrip ? (
        <div
          style={{
            display: "flex",
            gap: space.xs,
            padding: space.xs,
            ...floatingSurface,
            borderRadius: radius.panel,
            flexShrink: 0,
          }}
          role="tablist"
          aria-label={ariaLabel}
          aria-orientation="horizontal"
        >
          {views.map((v, index) => {
            const isActive = v.id === resolved.id;
            return (
              <button
                key={v.id}
                ref={(node) => { tabRefs.current[v.id] = node; }}
                id={tabId(v.id)}
                type="button"
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                aria-controls={contentPanelId}
                onClick={() => pinView(v.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                style={{
                  flex: "0 1 auto",
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: space.xs,
                  padding: `${space.sm}px ${space.xs}px`,
                  borderRadius: radius.control,
                  border: "none",
                  outlineColor: T.cyan,
                  outlineOffset: 2,
                  background: isActive ? surface.controlActive : "transparent",
                  color: isActive ? T.textPrimary : T.textMuted,
                  fontFamily: font.sans,
                  fontSize: typeScale.caption,
                  fontWeight: typeWeight.semibold,
                  cursor: "pointer",
                  /*
                   * Labels truncate before the strip pushes past its
                   * container (the "Exce…" clip at 260px). Full name in
                   * the tooltip and aria-label.
                   */
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  transition: `background ${motion.fast}, color ${motion.fast}`,
                }}
                title={v.label}
              >
                {v.label}
                {v.badge ? (
                  <span
                    style={{
                      fontFamily: font.mono,
                      fontSize: typeScale.eyebrow,
                      fontWeight: typeWeight.bold,
                      color: v.badge.color,
                      background: tint(v.badge.color, 0.16),
                      borderRadius: radius.dense,
                      padding: `${space.xs}px ${space.xs}px`,
                      lineHeight: 1.4,
                    }}
                  >
                    {v.badge.text}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {/*
        Active view — scrollable with a hidden scrollbar. Because the scrollbar
        is hidden, a rail whose content runs past its box simply stops
        mid-element, which reads as a broken panel rather than a scrollable one.
        The fade below is the affordance that makes the hidden scrollbar
        survivable: it appears only while content remains underneath, so a rail
        that fits shows no chrome at all.
      */}
      <div
        id={contentPanelId}
        role={hasTabStrip ? "tabpanel" : "region"}
        aria-labelledby={hasTabStrip ? tabId(resolved.id) : undefined}
        aria-label={hasTabStrip ? undefined : `${ariaLabel ?? "Rail"}: ${resolved.label}`}
        tabIndex={0}
        data-scroll-surface
        ref={scrollRef}
        onScroll={updateOverflow}
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          paddingBottom: space.xs,
        }}
      >
        <div
          style={{
            ...floatingSurface,
            overflow: "hidden",
            width: "100%",
          }}
        >
          <RailChromeContext.Provider value={{ chromeless: true }}>
            {resolved.render()}
          </RailChromeContext.Provider>
        </div>
        {hasMoreBelow ? (
          <div
            aria-hidden="true"
            style={{
              position: "sticky",
              bottom: 0,
              left: 0,
              right: 0,
              height: 28,
              marginTop: -28,
              pointerEvents: "none",
              background: `linear-gradient(to top, ${tint(T.bgPanel, 0.96)} 0%, ${tint(T.bgPanel, 0)} 100%)`,
              borderBottomLeftRadius: radius.panel,
              borderBottomRightRadius: radius.panel,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
