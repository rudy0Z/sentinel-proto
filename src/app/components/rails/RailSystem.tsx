/*
 * ─── RailSystem (shell v3) — docs/redesign-2026/14 §3.1.3 ──────────────────
 * The One-style edge rails: two collapsed icon strips whose dots carry the
 * attention state, panels that morph open on demand, and the peek engine —
 * important panels flash open, give a glimpse, and dissolve back to the rail.
 *
 * Laws enforced here:
 *   - one panel open per side; left never auto-opens (only T1/T2 peeks, and
 *     peeks auto-dissolve — silence never opens anything permanently);
 *   - peek budget reuses INTERRUPT_BUDGET from the attention arbiter;
 *   - every dot is a labelled tab button; Esc closes; focus returns to the dot.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import {
  MessageSquare,
  Plane,
  Radar,
  ScrollText,
  Search,
  TriangleAlert,
  Users,
  ListChecks,
  Map as MapIcon,
} from "lucide-react";
import {
  T,
  font,
  layer,
  material,
  motion,
  radius,
  space,
  tint,
  tracking,
  typeScale,
  typeStyle,
  typeWeight,
} from "../../tokens";
import { INTERRUPT_BUDGET } from "../../domain/attention";
import { deriveRailPanels, RAIL_PANELS, type RailPanelState, type RailSide } from "../../domain/railSystem";
import type { PanelSlotId } from "../../domain/panels";
import { KitStyles, PanelGlass } from "../kit/core";
import { RailChromeContext } from "../shared/railChrome";
import { RailPanelContent, type RailContentProps } from "./panels";
import { DECK_BOTTOM_INSET } from "../shell2/CommandDeck";
import "./rails.css";

const RAIL_W = 56;
const LEFT_PANEL_W = 340;
const RIGHT_PANEL_W = 380;
const PEEK_MS = 1600;

const ICONS = {
  situation: Radar,
  map: MapIcon,
  fleet: Plane,
  ledger: ScrollText,
  session: MessageSquare,
  priorities: ListChecks,
  teams: Users,
  investigation: Search,
  exceptions: TriangleAlert,
} as const;

function dotClass(panel: RailPanelState): string | undefined {
  if (panel.tier === "T1") return "rls-dot--t1";
  if (panel.tier === "T2") return "rls-dot--t2";
  if (panel.readiness === "computing") return "rls-dot--computing";
  return "rls-dot--fresh";
}

function dotColor(panel: RailPanelState): string {
  if (panel.tier === "T1") return T.red;
  if (panel.tier === "T2") return T.amber;
  if (panel.tier === "T3" || panel.readiness === "computing") return T.cyan;
  return T.textMuted;
}

export interface RailSystemProps extends RailContentProps {
  /** TALON open_panel intents land here (acceptIntent in SentinelShell). */
  openRequest: { id: PanelSlotId; seq: number } | null;
  onOpenRequestHandled: () => void;
  /** Esc and peeks stand down while a modal or the 3D explorer owns the screen. */
  suspended: boolean;
}

export function RailSystem(props: RailSystemProps) {
  const { openRequest, onOpenRequestHandled, suspended } = props;
  const [open, setOpen] = useState<{ left: PanelSlotId | null; right: PanelSlotId | null }>({ left: null, right: null });
  const [peek, setPeek] = useState<{ side: RailSide; id: PanelSlotId } | null>(null);

  const panels = useMemo(
    () =>
      deriveRailPanels(props.state, {
        surface: props.surface,
        focusMode: props.focusMode,
        investigationElapsed: props.investigationElapsed,
      }),
    [props.state, props.surface, props.focusMode, props.investigationElapsed],
  );

  const openRef = useRef(open);
  openRef.current = open;
  const peekRef = useRef(peek);
  peekRef.current = peek;
  const suspendedRef = useRef(suspended);
  suspendedRef.current = suspended;
  const seenRef = useRef<Record<string, string>>({});
  const mountedRef = useRef(false);
  const peekTimesRef = useRef<number[]>([]);
  const peekTimerRef = useRef<number | undefined>(undefined);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const closeRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const panelsByKey = panels.map((panel) => `${panel.meta.id}:${panel.revision}:${panel.tier}`).join("|");

  /* Fresh-event diff: revision bumps and newly registered contextual panels. */
  useEffect(() => {
    if (!mountedRef.current) {
      for (const panel of panels) seenRef.current[panel.meta.id] = panel.revision;
      mountedRef.current = true;
      return;
    }
    const now = Date.now();
    for (const panel of panels) {
      if (seenRef.current[panel.meta.id] === panel.revision) continue;
      seenRef.current[panel.meta.id] = panel.revision;
      const isOpen = openRef.current[panel.meta.side] === panel.meta.id;
      if (isOpen || (panel.tier !== "T1" && panel.tier !== "T2")) continue;
      const recent = peekTimesRef.current.filter((at) => now - at < INTERRUPT_BUDGET.windowMs);
      if (recent.length >= INTERRUPT_BUDGET.maxPops) continue;
      peekTimesRef.current = [...recent, now];
      window.clearTimeout(peekTimerRef.current);
      setPeek({ side: panel.meta.side, id: panel.meta.id });
      peekTimerRef.current = window.setTimeout(() => setPeek(null), PEEK_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelsByKey]);

  useEffect(() => () => window.clearTimeout(peekTimerRef.current), []);

  /* TALON open_panel intents. */
  useEffect(() => {
    if (!openRequest) return;
    const meta = RAIL_PANELS.find((entry) => entry.id === openRequest.id);
    if (meta) {
      window.clearTimeout(peekTimerRef.current);
      setPeek(null);
      setOpen((current) => ({ ...current, [meta.side]: meta.id }));
    }
    onOpenRequestHandled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest?.seq]);

  const openPanel = (side: RailSide, id: PanelSlotId) => {
    const panel = panels.find((entry) => entry.meta.id === id);
    if (panel) seenRef.current[id] = panel.revision;
    window.clearTimeout(peekTimerRef.current);
    setPeek(null);
    setOpen((current) => ({ ...current, [side]: id }));
    requestAnimationFrame(() => closeRefs.current[id]?.focus());
  };

  const closePanel = (side: RailSide) => {
    const id = openRef.current[side];
    setOpen((current) => ({ ...current, [side]: null }));
    if (id) requestAnimationFrame(() => tabRefs.current[id]?.focus());
  };

  /* Esc closes whatever the rails hold — unless a modal/explorer owns the screen. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || suspendedRef.current) return;
      if (peekRef.current) {
        window.clearTimeout(peekTimerRef.current);
        setPeek(null);
        return;
      }
      if (openRef.current.left) closePanel("left");
      else if (openRef.current.right) closePanel("right");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabKeyDown = (side: RailSide, sidePanels: RailPanelState[]) => (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % sidePanels.length;
    else if (event.key === "ArrowUp") nextIndex = (index - 1 + sidePanels.length) % sidePanels.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = sidePanels.length - 1;
    else return;
    event.preventDefault();
    const next = sidePanels[nextIndex];
    if (!next) return;
    openPanel(side, next.meta.id);
  };

  const renderRail = (side: RailSide) => {
    const sidePanels = panels.filter((panel) => panel.meta.side === side);
    const openId = open[side];
    return (
      <div
        style={{
          position: "absolute",
          [side]: 16,
          top: space.lg,
          bottom: DECK_BOTTOM_INSET,
          width: RAIL_W,
          zIndex: layer.rail,
          display: "flex",
        }}
      >
        <KitStyles />
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label={side === "left" ? "Operator rail" : "TALON rail"}
          style={{
            flex: 1,
            ...material.rail,
            borderRadius: radius.pill,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: space.sm,
            padding: `${space.sm}px ${space.xs}px`,
          }}
        >
          {sidePanels.map((panel, index) => {
            const Icon = ICONS[panel.meta.icon];
            const active = panel.meta.id === openId || panel.meta.id === peek?.id;
            return (
              <button
                key={panel.meta.id}
                ref={(node) => {
                  tabRefs.current[panel.meta.id] = node;
                }}
                type="button"
                role="tab"
                aria-selected={panel.meta.id === openId}
                aria-expanded={panel.meta.id === openId}
                data-rail-tab="true"
                data-rail-side={side}
                aria-label={`${panel.meta.title}${panel.lip ? ` — ${panel.lip}` : ""}`}
                title={`${panel.meta.title}${panel.lip ? ` · ${panel.lip}` : ""}`}
                onClick={() => (panel.meta.id === openId ? closePanel(side) : openPanel(side, panel.meta.id))}
                onKeyDown={(event) => handleTabKeyDown(side, sidePanels)(event, index)}
                style={{
                  position: "relative",
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: radius.control,
                  border: `1px solid ${active ? tint(T.cyan, 0.45) : "transparent"}`,
                  background: active ? tint(T.cyan, 0.1) : "transparent",
                  color: active ? T.cyan : T.textSecondary,
                  cursor: "pointer",
                  transition: `background ${motion.fast}, border-color ${motion.fast}, color ${motion.fast}`,
                }}
              >
                <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
                <span
                  key={panel.revision}
                  className={dotClass(panel)}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 5,
                    width: 6,
                    height: 6,
                    borderRadius: radius.pill,
                    background: dotColor(panel),
                    opacity: panel.tier === "T4" && panel.readiness === "dormant" ? 0.55 : 1,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPanel = (side: RailSide) => {
    const id = open[side] ?? (peek?.side === side ? peek.id : null);
    if (!id) return null;
    const panel = panels.find((entry) => entry.meta.id === id);
    if (!panel) return null;
    const peeking = peek?.side === side && peek.id === id && open[side] !== id;
    return (
      <div
        key={id}
        data-rail-panel={peeking ? "peek" : "open"}
        role="tabpanel"
        aria-label={panel.meta.title}
        className={peeking ? undefined : `rls-panel--${side}`}
        onClick={peeking ? () => openPanel(side, id) : undefined}
        style={{
          position: "absolute",
          [side]: 16 + RAIL_W + space.sm,
          top: space.lg,
          bottom: DECK_BOTTOM_INSET,
          width: side === "left" ? LEFT_PANEL_W : RIGHT_PANEL_W,
          zIndex: layer.rail,
          display: "flex",
          maxHeight: peeking ? 168 : undefined,
          overflow: "hidden",
          cursor: peeking ? "pointer" : undefined,
        }}
      >
        <PanelGlass
          variant="panel"
          padding={space.lg}
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: space.md, minHeight: 0 }}
        >
          <header style={{ display: "flex", alignItems: "center", gap: space.md, flexShrink: 0 }}>
            <span
              className={dotClass(panel)}
              aria-hidden="true"
              style={{ width: 8, height: 8, borderRadius: radius.pill, background: dotColor(panel), flexShrink: 0 }}
            />
            <div style={{ display: "grid", gap: 2, flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: typeStyle.eyebrow.size,
                  fontWeight: typeWeight.semibold,
                  letterSpacing: tracking.eyebrow,
                  textTransform: "uppercase",
                  color: T.textSecondary,
                }}
              >
                {panel.meta.title}
              </span>
              {panel.lip ? (
                <span style={{ fontFamily: font.sans, fontSize: typeStyle.metadata.size, color: T.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {panel.lip}
                </span>
              ) : null}
            </div>
            {peeking ? (
              /* The peek is a 168px glimpse: the title + lip already fill the
               * 380px panel, so the affordance is a compact glyph rather than a
               * word that overflows (and `typeScale.metadata` is undefined here,
               * which silently dropped the font size). */
              <span
                aria-hidden="true"
                style={{
                  fontFamily: font.mono,
                  fontSize: typeStyle.metadata.size,
                  letterSpacing: tracking.telemetry,
                  color: T.textMuted,
                  flexShrink: 0,
                }}
              >
                ↗
              </span>
            ) : (
              <button
                ref={(node) => {
                  closeRefs.current[id] = node;
                }}
                type="button"
                aria-label={`Close ${panel.meta.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  closePanel(side);
                }}
                style={{
                  width: 26,
                  height: 26,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: radius.control,
                  border: `1px solid transparent`,
                  background: "transparent",
                  color: T.textMuted,
                  cursor: "pointer",
                  flexShrink: 0,
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </header>
          <div
            data-scroll-surface
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: peeking ? "hidden" : "auto",
            }}
          >
            <RailChromeContext.Provider value={{ chromeless: true }}>
              <RailPanelContent id={id} ctx={props} />
            </RailChromeContext.Provider>
          </div>
        </PanelGlass>
      </div>
    );
  };

  const nodes: ReactNode[] = [renderRail("left"), renderRail("right"), renderPanel("left"), renderPanel("right")];
  return <>{nodes}</>;
}
