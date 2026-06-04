import { useCallback, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { OperationalIcon } from "./OperationalIcon";
import { getSceneChips } from "../domain/talon";
import { COMMAND_LABELS } from "../domain/microcopy";
import {
  DISABLED_OPACITY,
  TILE_GAP,
  TILE_H,
  TILE_W,
  type QuickActionId,
  type QuickActionState,
  type ShellState,
  type DroneMissionType,
  type TalonChipId,
  type TalonVoiceState,
  T,
  border,
  font,
  radius,
  space,
  surface,
  tint,
  tone,
  typeScale,
  typeWeight,
} from "../tokens";

interface ActionBarProps {
  state: ShellState;
  onAction: (actionId: QuickActionId) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onTalonVoiceChange?: (vs: TalonVoiceState) => void;
  onTalonChip?: (chipId: TalonChipId) => void;
  burnPermitVerified?: boolean;
  onBurnPermitVerifyChange?: (verified: boolean) => void;
}

export const ACTION_LABELS: Record<QuickActionId, string> = COMMAND_LABELS;

const ROW_GAP = space.xl;

function withAlpha(hex: string, alpha: number) {
  return tint(hex, alpha);
}

function baseTileColors(action: QuickActionState) {
  const tone = action.status === "complete" ? T.teal : action.id === "abort-mission" ? T.red : action.tone;
  const isDisabled = action.status === "disabled";
  const isComplete = action.status === "complete";
  const isRecommended = action.status === "recommended";

  return {
    tone,
    border: isDisabled
      ? border.default
      : isComplete
        ? withAlpha(T.teal, 0.44)
        : isRecommended
          ? withAlpha(tone, 0.56)
          : withAlpha(tone, 0.28),
    background: isDisabled
      ? surface.inset
      : isComplete
        ? withAlpha(T.teal, 0.1)
        : isRecommended
          ? withAlpha(tone, 0.12)
          : action.tone === T.textSecondary
            ? withAlpha(T.textSecondary, 0.1)
            : surface.control,
    text: isDisabled ? withAlpha(T.textMuted, 0.92) : isComplete ? T.teal : tone,
  };
}

// ─── TALON Mic / Waveform Component ──────────────────────────────────────────

export function TalonMicButton({
  voiceState,
  onVoiceChange,
}: {
  voiceState: TalonVoiceState;
  onVoiceChange: (vs: TalonVoiceState) => void;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (voiceState !== "idle") return;
    onVoiceChange("listening");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onVoiceChange("processing");
      timeoutRef.current = setTimeout(() => {
        onVoiceChange("responded");
        timeoutRef.current = setTimeout(() => {
          onVoiceChange("idle");
        }, 1800);
      }, 1800);
    }, 2800);
  };

  const micColor =
    voiceState === "idle"
      ? T.talonIdle
      : voiceState === "listening"
        ? T.talonListening
        : voiceState === "processing"
          ? T.talonProcessing
          : T.talonResponded;

  const micAnimation =
    voiceState === "idle"
      ? "talonIdlePulse 2.4s ease-in-out infinite"
      : voiceState === "listening"
        ? "talonListeningPulse 0.8s ease-in-out infinite"
        : undefined;

  const micBg =
    voiceState === "idle"
      ? tone.info.fill
      : voiceState === "listening"
        ? tone.danger.fillStrong
        : voiceState === "processing"
          ? tone.caution.fillStrong
          : tone.safe.fillStrong;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: space.xs,
        flexShrink: 0,
      }}
      aria-label="TALON voice interface"
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={voiceState !== "idle"}
        aria-label={
          voiceState === "idle"
            ? "Speak to TALON"
            : voiceState === "listening"
              ? "TALON listening…"
              : voiceState === "processing"
                ? "TALON processing…"
                : "TALON responded"
        }
        style={{
          width: space["6xl"] + space.xl,
          height: space["6xl"] + space.xl,
          borderRadius: radius.pill,
          border: `1.5px solid ${withAlpha(micColor, 0.5)}`,
          background: micBg,
          cursor: voiceState === "idle" ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          flexShrink: 0,
          transition: "background 300ms ease, border-color 300ms ease",
          animation: micAnimation,
        }}
      >
        {/* Waveform bars — visible in listening/processing */}
        {(voiceState === "listening" || voiceState === "processing") ? (
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              alignItems: "center",
              gap: space.xxs,
              height: space["5xl"],
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  width: space.xs,
                  borderRadius: radius.pill,
                  background: micColor,
                  animation: `waveBar${i} ${0.4 + i * 0.08}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        ) : voiceState === "responded" ? (
          /* Checkmark on respond */
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <polyline points="3,9 7,13 15,5" stroke={micColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          /* Idle mic icon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={micColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>

      <span
        style={{
          fontFamily: font.mono,
          fontSize: typeScale.eyebrow,
          color: micColor,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          lineHeight: 1,
          whiteSpace: "nowrap",
          transition: "color 300ms ease",
        }}
      >
        {voiceState === "idle"
          ? "Speak"
          : voiceState === "listening"
            ? "Listening"
            : voiceState === "processing"
              ? "Processing"
              : "Responded"}
      </span>
    </div>
  );
}

// ─── TALON Status Strip (left of action tiles) ────────────────────────────────

function TalonStatusStrip({ state }: { state: ShellState }) {
  const { scene, workflowPhase } = state;
  const response = state.talonConversation.response;

  const statusMap: Partial<Record<typeof scene, { label: string; detail: string; color: string }>> = {
    "baseline":              { label: "Surveillance active",         detail: "All sensors nominal",                         color: T.teal },
    "alert-command":         { label: "Interrupt triggered",         detail: "Awaiting dispatch authorization",             color: T.amber },
    "investigation-pending": { label: "Lidar-02 en route",           detail: "Verifying Grid 4C · ETA ~14s",                color: T.cyan },
    "verify-ready":          { label: "Evidence ready",              detail: "78% confidence · Await operator review",      color: T.amber },
    "verify-active":         { label: "Building convergence",        detail: "Sensor fusion running · 3 sources active",   color: T.amber },
    "authority-notification-ready": { label: "Authority packet ready", detail: "Human send starts Operations",             color: T.red },
    "contain-recommended":   { label: "Operations staging",          detail: "Authorities notified · build the plan",       color: T.red },
    "contain-alternate":     { label: "Alternate plan loaded",       detail: "Recomputed with operator override",           color: T.amber },
    "contain-degraded":      { label: "Fallback evidence mode",      detail: "LiDAR incomplete · Using raw feed",           color: T.amber },
    "rescue-nominal":        { label: "Coordinating field assets",   detail: "Route A active · 12/47 structures cleared",  color: T.fire },
    "rescue-signal-degraded": { label: "Signal exception active",    detail: "Herald-01 degraded · Rerouting",             color: T.amber },
    "rescue-battery-critical": { label: "Asset handoff in progress", detail: "Lidar-02 recall · Scout-03 en route",        color: T.amber },
    "satellite-feed-loss":   { label: "Satellite offline",           detail: "Drone-only telemetry · 40% confidence",      color: T.amber },
    "network-degraded":      { label: "High latency detected",       detail: "340ms avg · TALON at reduced throughput",    color: T.yellow },
    "infrastructure-total-loss": { label: "System failure",          detail: "Manual protocol active",                     color: T.red },
  };

  const status = statusMap[scene] ?? { label: "TALON active", detail: "Monitoring situation", color: T.teal };
  const displayStatus = response
    ? { label: response.title, detail: response.body, color: response.tone }
    : status;

  return (
    <div
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: space.xs,
        minWidth: 160,
        maxWidth: 200,
        flexShrink: 0,
        paddingRight: space.xl,
        borderRight: `1px solid ${border.subtle}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: space.xs }}>
        <span
          style={{
            width: space.xs,
            height: space.xs,
            borderRadius: radius.pill,
            background: displayStatus.color,
            display: "inline-block",
            animation: "pulse 1.5s infinite",
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <span
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.metadata,
            fontWeight: typeWeight.bold,
            color: displayStatus.color,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          TALON
        </span>
      </div>
      <div
        style={{
          fontFamily: font.sans,
          fontSize: typeScale.label,
          fontWeight: typeWeight.semibold,
          color: T.textPrimary,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {displayStatus.label}
      </div>
      <div
        style={{
          fontFamily: font.sans,
          fontSize: typeScale.caption,
          color: T.textMuted,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {displayStatus.detail}
      </div>
    </div>
  );
}

// ─── Contextual Prompt Chips (right of action tiles) ─────────────────────────

function ConversationalChips({
  state,
  onChip,
}: {
  state: ShellState;
  onChip: (id: TalonChipId) => void;
}) {
  const chips = getSceneChips(state.scene);
  const activeChip = state.talonConversation.activeChip;

  if (chips.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: space.sm,
        flexShrink: 0,
        paddingLeft: space.xl,
        borderLeft: `1px solid ${border.subtle}`,
      }}
    >
      <div
        style={{
          fontFamily: font.mono,
          fontSize: typeScale.eyebrow,
          color: T.textMuted,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: space.xxs,
        }}
      >
        Ask TALON
      </div>
      {chips.map((chip) => {
        const isActive = activeChip === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChip(chip.id)}
            aria-pressed={isActive}
            aria-label={`Ask TALON: ${chip.label}`}
            style={{
              padding: `${space.sm}px ${space.lg}px`,
              borderRadius: radius.md,
              border: `1px solid ${isActive ? tint(T.cyan, 0.4) : border.strong}`,
              background: isActive ? tone.info.fillStrong : surface.control,
              color: isActive ? T.cyan : T.textSecondary,
              fontFamily: font.sans,
              fontSize: typeScale.caption,
              fontWeight: typeWeight.semibold,
              cursor: "pointer",
              textAlign: "left",
              whiteSpace: "nowrap",
              transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
            }}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main ActionBar ───────────────────────────────────────────────────────────

// Maximum primary tiles visible before overflow kicks in.
// At 1366px center lane (~700px) this keeps the bar fitting without horizontal scroll.
const MAX_VISIBLE_PRIMARY = 3;

export function ActionBar({
  state,
  onAction,
  expanded,
  onToggleExpand,
  onTalonVoiceChange,
  onTalonChip,
  burnPermitVerified = false,
  onBurnPermitVerifyChange,
}: ActionBarProps) {
  const rawPrimary = state.actionSurface.primary.filter((action) => action.status !== "hidden");
  const primary = state.scene === "verify-active" && !burnPermitVerified
    ? rawPrimary.map(action => action.id === "confirm-incident"
      ? { ...action, status: "disabled" as const, description: "Blocked by source conflict. Verify burn permit before packet preparation." }
      : action)
    : rawPrimary;

  // Split primary into visible (≤3) and overflow (rest) so the bar never exceeds viewport
  const visiblePrimary = primary.slice(0, MAX_VISIBLE_PRIMARY);
  const overflowPrimary = primary.slice(MAX_VISIBLE_PRIMARY);

  const secondary = state.actionSurface.secondary.filter((action) => action.status !== "hidden").slice(0, 5);
  // Overflow primary tiles are surfaced in the secondary (expanded) row
  const expandedSecondary = [...overflowPrimary, ...secondary];
  const hasSplit = expandedSecondary.length > 0;
  const voiceState = state.talonConversation.voiceState;

  const handleAction = useCallback(
    (id: QuickActionId, isSecondary: boolean) => {
      onAction(id);
      if (isSecondary && expanded) {
        onToggleExpand();
      }
    },
    [expanded, onAction, onToggleExpand],
  );

  const handleVoiceChange = useCallback(
    (vs: TalonVoiceState) => {
      onTalonVoiceChange?.(vs);
    },
    [onTalonVoiceChange],
  );

  const handleChip = useCallback(
    (id: TalonChipId) => {
      onTalonChip?.(id);
    },
    [onTalonChip],
  );

  const showChips = Boolean(onTalonChip) && !hasSplit && visiblePrimary.length <= 2;
  const hasActions = primary.length > 0 || secondary.length > 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: space.xl,
      }}
      role="toolbar"
      aria-label="TALON command bar"
    >
      {/* Left: TALON Mic */}
      <TalonMicButton
        voiceState={voiceState}
        onVoiceChange={handleVoiceChange}
      />

      {/* Center-left: TALON Status */}
      <TalonStatusStrip state={state} />

      {/* Forced Calibrator / Source Conflict Gate */}
      {state.scene === "verify-active" && (
        <div style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: space["3xl"],
          background: tone.danger.fill,
          border: `1.5px solid ${T.red}`,
          borderRadius: radius.xl,
          padding: `${space.lg}px ${space["3xl"]}px`,
          marginLeft: space.xs,
          flex: 1.5,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: space.xs }}>
            <span style={{
              fontFamily: font.sans,
              fontSize: typeScale.label,
              fontWeight: typeWeight.bold,
              color: T.red,
              letterSpacing: "-0.01em",
            }}>
              SOURCE DISAGREEMENT: Thermal anomaly vs. active burn permit
            </span>
            <span style={{
              fontFamily: font.sans,
              fontSize: typeScale.caption,
              color: T.textSecondary,
              lineHeight: 1.2,
            }}>
              Sensor Fusion flags thermal spike but Satellite IR indicates a controlled agricultural burn.
            </span>
          </div>

          <label style={{
            display: "flex",
            alignItems: "center",
            gap: space.md,
            fontFamily: font.sans,
            fontSize: typeScale.caption,
            color: T.textPrimary,
            fontWeight: typeWeight.semibold,
            cursor: "pointer",
            userSelect: "none",
            marginLeft: "auto",
            background: surface.controlHover,
            padding: `${space.sm}px ${space.xl}px`,
            borderRadius: radius.md,
            border: `1px solid ${border.strong}`,
            whiteSpace: "nowrap",
          }}>
            <input
              type="checkbox"
              checked={burnPermitVerified}
              onChange={(e) => onBurnPermitVerifyChange?.(e.target.checked)}
              style={{
                cursor: "pointer",
                width: space["2xl"],
                height: space["2xl"],
                accentColor: T.red,
              }}
            />
            <span>I have verified agricultural burn permits for this sector.</span>
          </label>
        </div>
      )}

      {/* Center: Action Tiles */}
      {hasActions ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: expanded && hasSplit ? ROW_GAP : 0,
            padding: hasSplit ? `${space["4xl"]}px 0 ${space["3xl"]}px` : `${space["3xl"]}px 0`,
            position: "relative",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: space.lg,
              minWidth: space.none,
            }}
          >
            <TileRow actions={visiblePrimary} onAction={(id) => handleAction(id, false)} state={state} />
            {hasSplit ? <ExpandButton expanded={expanded} onToggleExpand={onToggleExpand} overflowCount={overflowPrimary.length} /> : null}
          </div>

          <div
            style={{
              width: "100%",
              overflow: "hidden",
              maxHeight: expanded && hasSplit ? TILE_H + ROW_GAP + space.sm : space.none,
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
                width: `calc(100% - ${space["6xl"] + space["3xl"]}px)`,
                height: space.xxs / 2,
                background: border.subtle,
              }}
            />
            <TileRow actions={expandedSecondary} onAction={(id) => handleAction(id, true)} state={state} />
          </div>
        </div>
      ) : (
        /* No actions — show quiet TALON status */
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: space.lg,
              padding: `${space.lg}px ${space["4xl"]}px`,
              borderRadius: radius.xl,
              background: tone.safe.fill,
              border: `1px solid ${tone.safe.border}`,
            }}
          >
            <span
              style={{
                width: space.sm,
                height: space.sm,
                borderRadius: radius.pill,
                background: T.teal,
                animation: "pulse 1.5s infinite",
              }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: font.sans,
                fontSize: typeScale.body,
                color: T.textSecondary,
                fontStyle: "italic",
              }}
            >
              TALON is watching. Human gates appear only when evidence requires action.
            </span>
          </div>
        </div>
      )}

      {/* Right: Conversational Chips */}
      {showChips && (
        <ConversationalChips state={state} onChip={handleChip} />
      )}
    </div>
  );
}

function ExpandButton({
  expanded,
  onToggleExpand,
  overflowCount = 0,
}: {
  expanded: boolean;
  onToggleExpand: () => void;
  overflowCount?: number;
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
        display: "inline-flex",
        alignItems: "center",
        gap: space.sm,
        padding: `${space.sm}px ${space.xl}px`,
        borderRadius: radius.pill,
        border: `1px solid ${tone.info.border}`,
        background: hovered ? tone.info.fillStrong : tone.info.fill,
        color: T.textMuted,
        flexShrink: 0,
        cursor: "pointer",
        transform: pressed ? "translateY(1px) scale(0.985)" : hovered ? "translateY(-1px)" : "translateY(0)",
        transition: "background 120ms ease, transform 120ms ease, border-color 120ms ease",
      }}
    >
      <span
        style={{
          fontFamily: font.mono,
          fontSize: typeScale.metadata,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {expanded ? "Less" : overflowCount > 0 ? `+${overflowCount} more` : "More"}
      </span>
      <span
        aria-hidden="true"
        style={{
          fontSize: typeScale.label,
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
        minWidth: space.none,
        overflowX: "auto",
        scrollbarWidth: "none",
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
  const { tone, border: tileBorder, background, text } = baseTileColors(action);
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
        ? `inset 0 1px 0 ${border.soft}, 0 14px 28px ${withAlpha(tone, 0.12)}`
        : `inset 0 1px 0 ${border.soft}`;

  return (
    <button
      type="button"
      onClick={isInteractive ? onClick : undefined}
      disabled={isDisabled || isComplete}
      aria-label={`${action.label}${isDisabled ? ` — unavailable: ${action.description}` : isComplete ? " — completed" : ""}`}
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
        borderRadius: radius.card,
        border: `1px solid ${tileBorder}`,
        background,
        color: text,
        opacity: isDisabled ? DISABLED_OPACITY : 1,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: isComplete && assignedDrone ? space.xs : space.md,
        cursor: isInteractive ? "pointer" : "default",
        boxShadow,
        transform: pressed ? "translateY(1px) scale(0.985)" : hovered && isInteractive ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease, background 120ms ease",
        textAlign: "center",
        padding: `${space.lg}px ${space.xl}px`,
      }}
    >
      {isInProgress ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: space.none,
            right: space.none,
            top: space.none,
            height: space.xs,
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
            left: space.none,
            right: space.none,
            top: space.none,
            height: space.xxs,
            background: `linear-gradient(90deg, transparent, ${tone}, transparent)`,
            opacity: 0.7,
          }}
        />
      )}

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: space.md,
          right: space.lg,
          minWidth: 14,
          minHeight: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isComplete ? T.teal : tone,
          fontFamily: font.mono,
          fontSize: typeScale.metadata,
        }}
      >
        {isComplete ? "Done" : isRecommended ? "Ready" : null}
      </div>

      <OperationalIcon actionId={action.id} color={text} size={22} />

      <div
        style={{
          fontFamily: font.sans,
          fontSize: typeScale.label,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          lineHeight: 1.25,
          maxWidth: "100%",
        }}
      >
        {action.label}
      </div>

      {isDisabled && (
        <div
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.eyebrow,
            color: T.textMuted,
            letterSpacing: "0.04em",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {action.description}
        </div>
      )}

      {/* Completed state: show assigned drone as a tag */}
      {isComplete && assignedDrone && (
        <div style={{
          fontFamily: font.mono,
          fontSize: typeScale.eyebrow,
          color: withAlpha(T.teal, 0.9),
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: withAlpha(T.teal, 0.1),
          border: `1px solid ${withAlpha(T.teal, 0.25)}`,
          borderRadius: radius.sm,
          padding: `${space.xxs}px ${space.sm}px`,
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
  const { tone, border: tileBorder, background, text } = baseTileColors(action);

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
      aria-label={`${action.label}${disabled ? ` — unavailable: ${action.description}` : " — hold two seconds to authorize"}`}
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
        borderRadius: radius.card,
        border: `1px solid ${tileBorder}`,
        background,
        color: text,
        opacity: disabled ? DISABLED_OPACITY : 1,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: space.md,
        cursor: disabled ? "default" : "pointer",
        boxShadow: hovered && !disabled ? `inset 0 1px 0 ${border.soft}, 0 14px 28px ${withAlpha(tone, 0.12)}` : `inset 0 1px 0 ${border.soft}`,
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
          top: space.md,
          right: space.lg,
          fontFamily: font.mono,
          fontSize: typeScale.metadata,
          color: tone,
        }}
      >
        {holding ? `${Math.ceil(progress)}%` : null}
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: space.lg,
          right: space.lg,
          bottom: space.sm,
          height: space.xs,
          borderRadius: radius.pill,
          background: border.subtle,
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: `${Math.max(progress, disabled ? space.none : space.xxs)}%`,
            height: "100%",
            borderRadius: radius.pill,
            background: disabled ? border.default : tone,
            transition: holding ? "none" : "width 120ms ease",
          }}
        />
      </div>

      <OperationalIcon actionId={action.id} color={text} size={22} style={{ position: "relative", zIndex: 1 }} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          fontFamily: font.sans,
          fontSize: typeScale.label,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          lineHeight: 1.25,
          textAlign: "center",
        }}
      >
        {action.label}
      </div>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          fontFamily: font.mono,
          fontSize: typeScale.eyebrow,
          color: disabled ? T.textMuted : withAlpha(tone, 0.92),
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {disabled ? "Blocked" : holding ? "Authorizing" : "Hold 2s"}
      </div>
    </div>
  );
}
