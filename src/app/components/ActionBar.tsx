import { useCallback, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ActionGlyph } from "./actionVisuals";
import {
  DISABLED_OPACITY,
  TILE_GAP,
  TILE_H,
  TILE_W,
  type QuickActionId,
  type QuickActionState,
  type ShellState,
  type DroneMissionType,
  T,
  font,
} from "../tokens";


interface ActionBarProps {
  state: ShellState;
  onAction: (actionId: QuickActionId) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

export const ACTION_LABELS: Record<string, string> = {
  "surface-alert": "Surface alert",
  "dispatch-scout": "Dispatch scout",
  "open-verification": "Open verification",
  "monitor-only": "Monitor only",
  "confirm-incident": "Confirm incident",
  "deploy-survey": "Deploy survey",
  "stage-perimeter": "Stage perimeter",
  "stage-responder-guidance": "Guide responders",
  "stage-residential-evacuation": "Prepare evacuation",
  "relay-field-intel": "Relay field intel",
  "notify-authorities": "Notify authorities",
  "notify-teams": "Notify teams",
  "mark-high-risk": "Mark high risk",
  "override-plan": "Override plan",
  "open-degraded": "Terrain fallback",
  "authorize-containment": "Authorize",
  "emergency-evacuate": "Emergency evacuate",
  "activate-automatic-route": "Residential evac drone",
  "deploy-navigation-drone": "Guide personnel",
  "deploy-backup": "Deploy backup",
  "acknowledge-exception": "Ack exception",
  "abort-mission": "Abort mission",
  "stand-down": "Stand down",
};

const ROW_GAP = 12;

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((part) => `${part}${part}`).join("") : normalized;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function baseTileColors(action: QuickActionState) {
  const tone = action.status === "complete" ? T.teal : action.id === "abort-mission" ? T.red : action.tone;
  const isDisabled = action.status === "disabled";
  const isComplete = action.status === "complete";
  const isRecommended = action.status === "recommended";

  return {
    tone,
    border: isDisabled
      ? "rgba(255,255,255,0.08)"
      : isComplete
        ? withAlpha(T.teal, 0.44)
        : isRecommended
          ? withAlpha(tone, 0.56)
          : withAlpha(tone, 0.28),
    background: isDisabled
      ? "rgba(255,255,255,0.03)"
      : isComplete
        ? withAlpha(T.teal, 0.1)
        : isRecommended
          ? withAlpha(tone, 0.12)
          : action.tone === T.textSecondary
            ? withAlpha(T.textSecondary, 0.1)
            : "rgba(255,255,255,0.04)",
    text: isDisabled ? withAlpha(T.textMuted, 0.92) : isComplete ? T.teal : tone,
  };
}

export function ActionBar({ state, onAction, expanded, onToggleExpand }: ActionBarProps) {
  const primary = state.actionSurface.primary.filter((action) => action.status !== "hidden").slice(0, 5);
  const secondary = state.actionSurface.secondary.filter((action) => action.status !== "hidden").slice(0, 5);
  const hasSplit = state.actionSurface.hasSplit && secondary.length > 0;

  const handleAction = useCallback(
    (id: QuickActionId, isSecondary: boolean) => {
      onAction(id);
      if (isSecondary && expanded) {
        onToggleExpand();
      }
    },
    [expanded, onAction, onToggleExpand],
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: expanded && hasSplit ? ROW_GAP : 0,
        padding: hasSplit ? "18px 0 16px" : "16px 0",
      }}
      role="toolbar"
      aria-label="Operator action bar"
    >
      {hasSplit ? <ExpandButton expanded={expanded} onToggleExpand={onToggleExpand} /> : null}

      <TileRow actions={primary} onAction={(id) => handleAction(id, false)} state={state} />

      <div
        style={{
          width: "100%",
          overflow: "hidden",
          maxHeight: expanded && hasSplit ? TILE_H + ROW_GAP + 6 : 0,
          transition: "max-height 220ms cubic-bezier(0.34,1.30,0.64,1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: ROW_GAP,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: "calc(100% - 48px)",
            height: 1,
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <TileRow actions={secondary} onAction={(id) => handleAction(id, true)} state={state} />
      </div>
    </div>
  );
}

function ExpandButton({
  expanded,
  onToggleExpand,
}: {
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onToggleExpand}
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse action bar" : "Show more actions"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        position: "absolute",
        top: 10,
        right: 16,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 1000,
        border: "1px solid rgba(0,200,255,0.3)",
        background: hovered ? "rgba(0,200,255,0.14)" : "rgba(0,200,255,0.1)",
        color: T.textMuted,
        cursor: "pointer",
        transform: pressed ? "translateY(1px) scale(0.985)" : hovered ? "translateY(-1px)" : "translateY(0)",
        transition: "background 120ms ease, transform 120ms ease, border-color 120ms ease",
      }}
    >
      <span
        style={{
          fontFamily: font.mono,
          fontSize: 9,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {expanded ? "Less" : "More"}
      </span>
      <span
        aria-hidden="true"
        style={{
          fontSize: 11,
          lineHeight: 1,
          opacity: 0.6,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 180ms ease",
        }}
      >
        ⌄
      </span>
    </button>
  );
}

function TileRow({
  actions,
  onAction,
  state,
}: {
  actions: QuickActionState[];
  onAction: (id: QuickActionId) => void;
  state: ShellState;
}) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: TILE_GAP,
        width: "100%",
        flexWrap: "nowrap",
      }}
    >
      {actions.map((action) =>
        action.id === "authorize-containment" ? (
          <HoldTile key={action.id} action={action} onConfirm={() => onAction(action.id)} />
        ) : (
          <ActionTile key={action.id} action={action} state={state} onClick={() => onAction(action.id)} />
        ),
      )}
    </div>
  );
}

// Maps action IDs to their corresponding drone mission type for lookup
const ACTION_TO_MISSION: Partial<Record<QuickActionId, DroneMissionType>> = {
  "deploy-survey": "survey-zone",
  "stage-perimeter": "perimeter-monitor",
  "stage-responder-guidance": "guide-emergency-personnel",
  "stage-residential-evacuation": "prepare-residential-evacuation",
  "relay-field-intel": "relay-field-intel",
  "deploy-navigation-drone": "guide-emergency-personnel",
  "activate-automatic-route": "prepare-residential-evacuation",
  "deploy-backup": "backup-support",
};

function ActionTile({ action, onClick, state }: { action: QuickActionState; state: ShellState; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const { tone, border, background, text } = baseTileColors(action);
  const isDisabled = action.status === "disabled";
  const isComplete = action.status === "complete";
  const isRecommended = action.status === "recommended";
  const isInteractive = !isDisabled && !isComplete;
  const isInProgress = action.status === "in-progress";

  // Find assigned drone for this action (only relevant when complete)
  const missionType = ACTION_TO_MISSION[action.id];
  const assignedDrone = isComplete && missionType
    ? state.drones.find((d) => d.assignedMission === missionType)
    : undefined;

  const boxShadow =
    isRecommended && !pressed
      ? `inset 0 1px 0 ${withAlpha(tone, 0.24)}, 0 0 0 1px ${withAlpha(tone, 0.12)}, 0 12px 32px ${withAlpha(tone, 0.14)}`
      : hovered && isInteractive
        ? `inset 0 1px 0 rgba(255,255,255,0.05), 0 14px 28px ${withAlpha(tone, 0.12)}`
        : "inset 0 1px 0 rgba(255,255,255,0.04)";

  return (
    <button
      type="button"
      onClick={isInteractive ? onClick : undefined}
      disabled={isDisabled || isComplete}
      aria-label={`${action.label}${isDisabled ? " — unavailable" : isComplete ? " — completed" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        width: TILE_W,
        height: TILE_H,
        borderRadius: 14,
        border: `1px solid ${border}`,
        background,
        color: text,
        opacity: isDisabled ? DISABLED_OPACITY : 1,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: isComplete && assignedDrone ? 4 : 8,
        cursor: isInteractive ? "pointer" : "default",
        boxShadow,
        transform: pressed ? "translateY(1px) scale(0.985)" : hovered && isInteractive ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease, background 120ms ease",
        textAlign: "center",
        padding: "10px 12px",
      }}
    >
      {isInProgress ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 3,
            background: `linear-gradient(90deg, ${withAlpha(tone, 0.2)} 0%, ${tone} 48%, ${withAlpha(tone, 0.2)} 100%)`,
            animation: "pulseBar 1.5s ease-in-out infinite",
          }}
        />
      ) : null}

      {/* Recommended shimmer accent (top edge) */}
      {isRecommended && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${tone}, transparent)`,
            opacity: 0.7,
          }}
        />
      )}

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 8,
          right: 9,
          minWidth: 14,
          minHeight: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isComplete ? T.teal : tone,
          fontFamily: font.mono,
          fontSize: 9,
        }}
      >
        {isComplete ? "✓" : isRecommended ? "●" : null}
      </div>

      <ActionGlyph actionId={action.id} color={text} size={22} />

      <div
        style={{
          fontFamily: font.sans,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          lineHeight: 1.25,
          maxWidth: "100%",
        }}
      >
        {action.label}
      </div>

      {/* Completed state: show assigned drone as a tag */}
      {isComplete && assignedDrone && (
        <div style={{
          fontFamily: font.mono,
          fontSize: 8,
          color: withAlpha(T.teal, 0.9),
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: withAlpha(T.teal, 0.1),
          border: `1px solid ${withAlpha(T.teal, 0.25)}`,
          borderRadius: 5,
          padding: "2px 6px",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {assignedDrone.name}
        </div>
      )}
    </button>
  );
}

function HoldTile({ action, onConfirm }: { action: QuickActionState; onConfirm: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const confirmedRef = useRef(false);
  const disabled = action.status === "disabled";
  const { tone, border, background, text } = baseTileColors(action);

  const stopHold = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setHolding(false);
    setProgress(0);
  }, []);

  const startHold = useCallback(() => {
    if (disabled || holding) {
      return;
    }
    confirmedRef.current = false;
    setHolding(true);
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startRef.current) / 2000) * 100);
      setProgress(pct);
      if (pct >= 100 && !confirmedRef.current) {
        confirmedRef.current = true;
        stopHold();
        onConfirm();
      }
    }, 16);
  }, [disabled, holding, onConfirm, stopHold]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.key === "Enter" || event.key === " ") && !holding) {
        event.preventDefault();
        startHold();
      }
    },
    [holding, startHold],
  );

  const handleKeyUp = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        stopHold();
      }
    },
    [stopHold],
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${action.label}${disabled ? " — unavailable until staging is complete" : " — hold to authorize"}`}
      aria-disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        stopHold();
      }}
      onMouseDown={startHold}
      onMouseUp={stopHold}
      onTouchStart={startHold}
      onTouchEnd={stopHold}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={stopHold}
      style={{
        width: TILE_W,
        height: TILE_H,
        borderRadius: 14,
        border: `1px solid ${border}`,
        background,
        color: text,
        opacity: disabled ? DISABLED_OPACITY : 1,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: disabled ? "default" : "pointer",
        boxShadow: hovered && !disabled ? `inset 0 1px 0 rgba(255,255,255,0.05), 0 14px 28px ${withAlpha(tone, 0.12)}` : "inset 0 1px 0 rgba(255,255,255,0.04)",
        transform: holding ? "scale(0.99)" : hovered && !disabled ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, ${withAlpha(tone, 0.24)} 0%, ${withAlpha(tone, 0.08)} 100%)`,
          transform: `scaleX(${progress / 100})`,
          transformOrigin: "left center",
          transition: holding ? "none" : "transform 120ms ease",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 8,
          right: 9,
          fontFamily: font.mono,
          fontSize: 9,
          color: tone,
        }}
      >
        {holding ? `${Math.ceil(progress)}%` : null}
      </div>

      <ActionGlyph actionId={action.id} color={text} size={22} style={{ position: "relative", zIndex: 1 }} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          fontFamily: font.sans,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          lineHeight: 1.25,
          textAlign: "center",
        }}
      >
        {action.label}
      </div>
    </div>
  );
}
