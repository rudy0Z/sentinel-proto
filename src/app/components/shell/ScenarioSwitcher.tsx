/**
 * ScenarioSwitcher (Sentinel V2 · Phase 6) — the scenario-select entry control.
 *
 * Lists the authored scenario catalog. It defaults to the authored mirror so
 * the surface is deterministic and network-silent; the live, DB-persisted
 * catalog is fetched from the session gateway (`GET /scenarios`) only when the
 * operator asks for it. A failed fetch is a state, not an error — the chip
 * reports which source is showing.
 */

import { useEffect, useRef, useState } from "react";
import { T, border, font, motion, radius, space, surface, tint, tracking, typeScale, typeWeight } from "../../tokens";
import { PopoverSurface, usePopoverDismissal } from "../shared/PopoverSurface";

const GATEWAY =
  (import.meta.env as unknown as Record<string, string | undefined>).VITE_SENTINEL_GATEWAY ??
  "http://127.0.0.1:4191";

interface ScenarioRow {
  id: string;
  label: string;
  title: string;
}

/** Authored catalog mirror — the deterministic default source. */
const FALLBACK: ScenarioRow[] = [
  { id: "S-01", label: "Encinal Ridge (Flagship Hero)", title: "Encinal Ridge" },
  { id: "S-02", label: "False Alarm (Permit Conflict)", title: "False Alarm" },
  { id: "S-03", label: "Canyon Gulch (Wind Shear Reroute)", title: "Canyon Gulch" },
  { id: "S-04", label: "Data Fog (Degraded Reality)", title: "Data Fog" },
  { id: "S-05", label: "Night Rescue (Infrared & Battery)", title: "Night Rescue" },
  { id: "S-06", label: "Two Voices (Operator Escalates)", title: "Two Voices" },
];

export function ScenarioSwitcher({
  selectedId,
  onSelect,
}: {
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const [rows, setRows] = useState<ScenarioRow[]>(FALLBACK);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(selectedId ?? "S-01");

  useEffect(() => {
    if (selectedId) setActive(selectedId);
  }, [selectedId]);

  /* Explicit, user-initiated read of the live catalog. */
  const loadLive = () => {
    setBusy(true);
    fetch(GATEWAY + "/scenarios")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { scenarios?: ScenarioRow[] }) => {
        if (data && data.scenarios && data.scenarios.length) {
          setRows(data.scenarios.map((s) => ({ id: s.id, label: s.label, title: s.title })));
          setLive(true);
        }
      })
      .catch(() => {
        /* gateway offline — the authored mirror stands in */
        setLive(false);
      })
      .finally(() => setBusy(false));
  };

  const choose = (id: string) => {
    setActive(id);
    onSelect?.(id);
  };

  return (
    <div data-action="scenario-switcher" style={{ width: "100%", maxWidth: 420, textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: space.sm }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, letterSpacing: tracking.eyebrow, textTransform: "uppercase" }}>
          Scenarios
        </span>
        <button
          type="button"
          onClick={loadLive}
          data-action="scenario-refresh"
          aria-label="Load live scenario catalog from the gateway"
          style={{
            cursor: "pointer",
            border: "none",
            background: "transparent",
            padding: 0,
            fontFamily: font.mono,
            fontSize: typeScale.metadata,
            color: live ? T.teal : T.cyan,
            letterSpacing: tracking.telemetry,
          }}
        >
          {(busy ? "READING…" : live ? "GATEWAY LIVE" : "AUTHORED CATALOG") + " · " + rows.length + (live ? "" : " · ↻ live")}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space.xs }}>
        {rows.map((row) => {
          const on = row.id === active;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => choose(row.id)}
              aria-pressed={on}
              data-action={"scenario-" + row.id}
              style={{
                textAlign: "left",
                cursor: "pointer",
                border: "1px solid " + (on ? tint(T.cyan, 0.4) : border.default),
                background: on ? tint(T.cyan, 0.14) : surface.control,
                borderRadius: radius.tile,
                padding: space.xs + "px " + space.sm + "px",
              }}
            >
              <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: on ? T.cyan : T.textMuted, letterSpacing: tracking.telemetry }}>
                {row.id}
              </div>
              <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, fontWeight: typeWeight.semibold, lineHeight: 1.3 }}>
                {row.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ScenarioSelectorControl({
  selectedId = "S-01",
  onSelect,
}: {
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  usePopoverDismissal({
    open,
    onClose: () => setOpen(false),
    triggerRef,
    surfaceRef,
  });

  const activeRow = FALLBACK.find((r) => r.id === selectedId) ?? FALLBACK[0];

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Select operational scenario"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-action="scenario-selector-trigger"
        onClick={() => setOpen((c) => !c)}
        style={{
          minHeight: 30,
          display: "inline-flex",
          alignItems: "center",
          gap: space.sm,
          padding: `0 ${space.sm}px`,
          border: `1px solid ${open ? tint(T.cyan, 0.46) : border.default}`,
          borderRadius: radius.control,
          background: open ? tint(T.cyan, 0.1) : surface.control,
          color: open ? T.cyan : T.textSecondary,
          cursor: "pointer",
          fontFamily: font.sans,
          fontSize: typeScale.label,
          fontWeight: typeWeight.semibold,
        }}
      >
        <span
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.metadata,
            color: T.cyan,
            letterSpacing: tracking.telemetry,
            padding: "2px 5px",
            borderRadius: radius.dense,
            background: tint(T.cyan, 0.12),
          }}
        >
          {selectedId}
        </span>
        <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeRow.title}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: `transform ${motion.fast}`,
          }}
          aria-hidden="true"
        >
          <path d="M2 3.5L5 6.5L8 3.5" />
        </svg>
      </button>

      {open && (
        <PopoverSurface
          ref={surfaceRef}
          ariaLabel="Operational scenario catalog"
          width={420}
          origin="top-left"
          style={{ top: 38, left: 0, right: "auto", padding: space.md }}
        >
          <ScenarioSwitcher
            selectedId={selectedId}
            onSelect={(id) => {
              onSelect?.(id);
              setOpen(false);
            }}
          />
        </PopoverSurface>
      )}
    </div>
  );
}
