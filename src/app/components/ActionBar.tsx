import { useCallback, useRef, useState } from "react";
import { OperationalIcon } from "./OperationalIcon";
import {
  getTalonChipResponse,
  getTalonInteractionModel,
  getTalonSessionRecommendation,
  updateTalonConversation,
} from "../domain/talon";
import { COMMAND_LABELS } from "../domain/microcopy";
import { TalonSession } from "./talon/TalonSession";
import { TalonMark } from "./talon/TalonMark";
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
  type TalonConversationChangeHandler,
  type TalonConversationState,
  type TalonVoiceState,
  GLASS,
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
  coreMode?: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onTalonVoiceChange?: (vs: TalonVoiceState) => void;
  onTalonConversationChange?: TalonConversationChangeHandler;
  onTalonChip?: (chipId: TalonChipId) => void;
  burnPermitVerified?: boolean;
  onBurnPermitVerifyChange?: (verified: boolean) => void;
}

export const ACTION_LABELS: Record<QuickActionId, string> = COMMAND_LABELS;

function withAlpha(hex: string, alpha: number) {
  return tint(hex, alpha);
}

function baseTileColors(action: QuickActionState) {
  const isDisabled = action.status === "disabled";
  const isComplete = action.status === "complete";
  const isRecommended = action.status === "recommended";
  const isInProgress = action.status === "in-progress";

  /*
   * Color is a status signal, not decoration. Only the recommended action,
   * live progress, completion, and destructive intent carry color — every
   * other tile stays neutral so the operator's eye lands on what matters.
   */
  const tone = isComplete
    ? T.teal
    : action.id === "abort-mission"
      ? T.red
      : isRecommended || isInProgress
        ? action.tone
        : T.textSecondary;

  return {
    tone,
    border: isDisabled
      ? border.default
      : isComplete
        ? withAlpha(T.teal, 0.44)
        : isRecommended
          ? withAlpha(tone, 0.56)
          : isInProgress
            ? withAlpha(tone, 0.34)
            : border.strong,
    background: isDisabled
      ? surface.inset
      : isComplete
        ? withAlpha(T.teal, 0.1)
        : isRecommended
          ? withAlpha(tone, 0.12)
          : surface.control,
    text: isDisabled
      ? withAlpha(T.textMuted, 0.92)
      : isComplete
        ? T.teal
        : isRecommended
          ? tone
          : T.textPrimary,
  };
}

// ─── TALON Mic / Waveform Component ──────────────────────────────────────────

export function TalonMicButton({
  voiceState,
  onVoiceChange,
  conversation,
  onConversationChange,
}: {
  voiceState: TalonVoiceState;
  onVoiceChange: (vs: TalonVoiceState) => void;
  conversation?: TalonConversationState;
  onConversationChange?: TalonConversationChangeHandler;
}) {
  const currentConversation = conversation ?? {
    activeChip: null,
    response: null,
    voiceState,
  };
  const handleConversation = (next: TalonConversationState) => {
    if (onConversationChange) {
      onConversationChange(next);
    } else if (next.voiceState !== voiceState) {
      onVoiceChange(next.voiceState);
    }
  };
  return (
    <TalonSession
      variant="compact"
      conversation={currentConversation}
      onConversationChange={handleConversation}
      legacyMode={!onConversationChange}
      context={{
        recommendation: {
          title: "TALON command",
          body: "Review the active Sentinel state.",
          actionLabel: "Review current state",
          tone: T.cyan,
          evidence: [],
          blocker: null,
          requiresHumanGate: false,
        },
      }}
    />
  );
}

// ─── Main ActionBar ───────────────────────────────────────────────────────────

// Destructive / high-consequence commands live in the danger menu, never inline.
const DANGER_IDS: QuickActionId[] = ["abort-mission", "stand-down"];

export function ActionBar({
  state,
  onAction,
  coreMode = false,
  expanded,
  onToggleExpand,
  onTalonVoiceChange,
  onTalonConversationChange,
  onTalonChip,
  burnPermitVerified = false,
  onBurnPermitVerifyChange,
}: ActionBarProps) {
  const voiceState = state.talonConversation.voiceState;

  const rawPrimary = state.actionSurface.primary.filter((a) => a.status !== "hidden");
  const primary = state.scene === "verify-active" && !burnPermitVerified
    ? rawPrimary.map((a) => a.id === "confirm-incident"
      ? { ...a, status: "disabled" as const, description: "Blocked by source conflict. Verify burn permit before packet preparation." }
      : a)
    : rawPrimary;
  const secondary = state.actionSurface.secondary.filter((a) => a.status !== "hidden");

  // Keep one accountable command beside the stable TALON control. Core mode keeps
  // the same candidate filtering while removing the lower-priority menu.
  const promoted = secondary.filter((a) => a.status === "recommended" && !DANGER_IDS.includes(a.id));
  const coreCandidate =
    [...primary, ...promoted].find((action) => action.status === "recommended") ??
    [...primary, ...promoted].find((action) => action.status === "in-progress") ??
    [...primary, ...promoted].find(
      (action) => action.status === "available" && !DANGER_IDS.includes(action.id),
    );
  const flank = coreCandidate ? [coreCandidate] : [];
  const menuActions = coreMode
    ? []
    : secondary.filter((a) => a.id !== coreCandidate?.id);

  const handleAction = useCallback((id: QuickActionId) => onAction(id), [onAction]);
  const handleChip = useCallback(
    (id: TalonChipId) => {
      if (onTalonConversationChange) {
        const sameChip = state.talonConversation.activeChip === id;
        onTalonConversationChange(
          updateTalonConversation(state.talonConversation, {
            activeChip: sameChip ? null : id,
            response: sameChip ? null : getTalonChipResponse(id),
            phase: sameChip ? "watching" : "recommendation",
          }),
        );
        return;
      }
      onTalonChip?.(id);
    },
    [onTalonChip, onTalonConversationChange, state.talonConversation],
  );
  const handleConversation = useCallback(
    (next: TalonConversationState) => {
      if (onTalonConversationChange) {
        onTalonConversationChange(next);
      } else if (next.voiceState !== voiceState) {
        onTalonVoiceChange?.(next.voiceState);
      }
    },
    [onTalonConversationChange, onTalonVoiceChange, voiceState],
  );

  const isGate = state.scene === "verify-active";
  const talonModel = getTalonInteractionModel(state);
  const talonRecommendation = getTalonSessionRecommendation(state);
  const displayedRecommendation = state.talonConversation.response
    ? {
        ...talonRecommendation,
        title: state.talonConversation.response.title,
        body: state.talonConversation.response.body,
        tone: state.talonConversation.response.tone,
      }
    : talonRecommendation;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: isGate ? space.sm : space.none,
      }}
      role="toolbar"
      aria-label="TALON command bar"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes commandTileIn {
          from { opacity: 0; transform: translateY(6px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes commandTileIn {
            from { opacity: 1; transform: none; }
            to { opacity: 1; transform: none; }
          }
        }
      `}} />
      {/* Source-conflict calibrator gate (verify-active) */}
      {isGate && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: space["3xl"],
          background: tone.caution.fill,
          border: `1.5px solid ${T.amber}`,
          borderRadius: radius.xl,
          padding: `${space.md}px ${space["3xl"]}px`,
          maxWidth: 760,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: space.xxs, minWidth: 0 }}>
            <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold, color: T.amber }}>
              Source disagreement: thermal anomaly vs. active burn permit
            </span>
            <span style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textSecondary, lineHeight: 1.35 }}>
              Sensor Fusion flags a thermal spike but Satellite IR indicates a controlled agricultural burn.
            </span>
          </div>
          <label style={{
            display: "flex", alignItems: "center", gap: space.md,
            fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, fontWeight: typeWeight.semibold,
            cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
            background: surface.controlHover, padding: `${space.sm}px ${space.xl}px`, borderRadius: radius.md, border: `1px solid ${border.strong}`,
          }}>
            <input type="checkbox" checked={burnPermitVerified} onChange={(e) => onBurnPermitVerifyChange?.(e.target.checked)}
              style={{ cursor: "pointer", width: space["2xl"], height: space["2xl"], accentColor: T.amber }} />
            <span>I have verified agricultural burn permits for this sector.</span>
          </label>
        </div>
      )}

      {/* Premium TALON Control: Speak Orb + Inline Quick-Ask Chips */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: space.xl, position: "relative" }}>
        <TalonSession
          variant="floating"
          conversation={state.talonConversation}
          onConversationChange={handleConversation}
          legacyMode={!onTalonConversationChange}
          expanded={expanded}
          onExpandedChange={() => onToggleExpand()}
          onChip={onTalonChip || onTalonConversationChange ? handleChip : undefined}
          context={{
            recommendation: displayedRecommendation,
            statusLabel: displayedRecommendation.title,
            detail: displayedRecommendation.body,
            chips: coreMode ? [] : talonModel.chips,
          }}
        />

        {/* Circular Speak Orb */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: space.xxs }}>
          <button
            type="button"
            onClick={() => onToggleExpand()}
            aria-expanded={expanded}
            aria-label={expanded ? "Close TALON session" : "Open TALON session"}
            title={expanded ? "Close TALON session" : "Open TALON session"}
            style={{
              position: "relative",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: tint(
                state.talonConversation.voiceState === "listening"
                  ? T.red
                  : state.talonConversation.voiceState === "processing"
                    ? T.amber
                    : state.talonConversation.voiceState === "responded"
                      ? T.teal
                      : T.cyan,
                0.14,
              ),
              border: `2px solid ${
                state.talonConversation.voiceState === "listening"
                  ? T.red
                  : state.talonConversation.voiceState === "processing"
                    ? T.amber
                    : state.talonConversation.voiceState === "responded"
                      ? T.teal
                      : T.cyan
              }`,
              color:
                state.talonConversation.voiceState === "listening"
                  ? T.red
                  : state.talonConversation.voiceState === "processing"
                    ? T.amber
                    : state.talonConversation.voiceState === "responded"
                      ? T.teal
                      : T.cyan,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: `0 0 16px ${tint(
                state.talonConversation.voiceState === "listening"
                  ? T.red
                  : state.talonConversation.voiceState === "processing"
                    ? T.amber
                    : state.talonConversation.voiceState === "responded"
                      ? T.teal
                      : T.cyan,
                0.4,
              )}`,
              transition: "background 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease",
            }}
          >
            {state.talonConversation.voiceState === "listening" && (
              <span
                style={{
                  position: "absolute",
                  inset: -6,
                  borderRadius: "50%",
                  border: `1.5px solid ${T.red}`,
                  animation: "talonRipple 1.4s ease-out infinite",
                }}
              />
            )}
            <TalonMark
              color={
                state.talonConversation.voiceState === "listening"
                  ? T.red
                  : state.talonConversation.voiceState === "processing"
                    ? T.amber
                    : state.talonConversation.voiceState === "responded"
                      ? T.teal
                      : T.cyan
              }
              size={28}
              decorative
            />
          </button>
          <div
            style={{
              fontFamily: font.mono,
              fontSize: typeScale.metadata,
              color: T.textMuted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {state.talonConversation.voiceState === "idle" || !state.talonConversation.voiceState
              ? "CLICK TO SPEAK"
              : state.talonConversation.voiceState.toUpperCase()}
          </div>
        </div>

        {/* Inline Quick-Ask Chips */}
        {!coreMode && talonModel.chips.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: space.xxs,
              borderLeft: `1px solid ${border.subtle}`,
              paddingLeft: space.lg,
            }}
          >
            <div
              style={{
                fontFamily: font.mono,
                fontSize: typeScale.metadata,
                color: T.textMuted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Ask TALON
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: space.xs }}>
              {talonModel.chips.map((chip) => {
                const active = state.talonConversation.activeChip === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      handleChip(chip.id);
                      if (!expanded) onToggleExpand();
                    }}
                    style={{
                      padding: `${space.xs}px ${space.md}px`,
                      borderRadius: radius.md,
                      border: `1px solid ${active ? tint(T.cyan, 0.5) : border.strong}`,
                      background: active ? tint(T.cyan, 0.16) : surface.control,
                      color: active ? T.cyan : T.textSecondary,
                      fontFamily: font.sans,
                      fontSize: typeScale.caption,
                      fontWeight: typeWeight.semibold,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 120ms ease",
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <TileGroup actions={flank} onAction={handleAction} state={state} />
        {menuActions.length > 0 && <DangerMenu actions={menuActions} onAction={handleAction} state={state} />}
      </div>
    </div>
  );
}

// ─── Flanking tile group (content-width) ─────────────────────────────────────

function TileGroup({ actions, onAction, state }: { actions: QuickActionState[]; onAction: (id: QuickActionId) => void; state: ShellState }) {
  if (actions.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: TILE_GAP, flexShrink: 0, animation: "commandTileIn 180ms cubic-bezier(0.23,1,0.32,1)" }}>
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

// ─── Danger menu — high-consequence commands behind a deliberate gate ─────────

function DangerMenu({ actions, onAction, state }: { actions: QuickActionState[]; onAction: (id: QuickActionId) => void; state: ShellState }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", flexShrink: 0, animation: "commandTileIn 180ms cubic-bezier(0.23,1,0.32,1)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="High-consequence commands"
        aria-expanded={open}
        title="High-consequence commands"
        style={{
          width: 44, height: 44, borderRadius: radius.lg,
          border: `1px solid ${open ? T.red : border.strong}`,
          background: open ? tint(T.red, 0.12) : surface.control,
          color: open ? T.red : T.textMuted,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          transition: "border-color 120ms ease, background 120ms ease, color 120ms ease",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 1 }} aria-hidden="true" />
          <div
            role="menu"
            style={{
              position: "absolute", bottom: "calc(100% + 10px)", right: 0, zIndex: 2,
              ...GLASS, borderColor: tint(T.red, 0.3), minWidth: 220,
              padding: space.md, display: "flex", flexDirection: "column", gap: space.xs,
            }}
          >
            <div style={{ fontFamily: font.mono, fontSize: typeScale.label, color: T.red, padding: `${space.xs}px ${space.sm}px` }}>
              High-consequence commands
            </div>
            {actions.map((action) => {
              const danger = DANGER_IDS.includes(action.id);
              const disabled = action.status === "disabled" || action.status === "complete";
              const c = danger ? T.red : action.status === "complete" ? T.teal : T.textSecondary;
              return (
                <button
                  key={action.id}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() => { onAction(action.id); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: space.md, width: "100%",
                    padding: `${space.md}px ${space.lg}px`, borderRadius: radius.md,
                    border: `1px solid ${danger ? tint(T.red, 0.24) : border.subtle}`,
                    background: danger ? tint(T.red, 0.06) : surface.control,
                    color: c, cursor: disabled ? "default" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                    fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, textAlign: "left",
                  }}
                >
                  <OperationalIcon actionId={action.id} color={c} size={15} />
                  {action.label}
                  {action.status === "complete" && (
                    <span style={{ marginLeft: "auto", fontFamily: font.mono, fontSize: typeScale.label, color: T.teal }}>Done</span>
                  )}
                </button>
              );
            })}
            <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted, padding: `${space.xs}px ${space.sm}px`, lineHeight: 1.4 }}>
              {state.workflowPhase === "operations" ? "Closing or aborting the operation requires this deliberate step." : "Stand-down ends the active watch."}
            </div>
          </div>
        </>
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

  const boxShadow = isRecommended
    ? `inset 0 1px 0 ${withAlpha(tone, 0.24)}`
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
        animation: "commandTileIn 180ms cubic-bezier(0.23,1,0.32,1)",
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

      {(isComplete || isRecommended || isInProgress) && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: space.md,
            right: space.md,
            fontFamily: font.mono,
            fontSize: typeScale.label,
            fontWeight: typeWeight.bold,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            lineHeight: 1.2,
            color: isComplete ? T.teal : tone,
            background: withAlpha(isComplete ? T.teal : tone, 0.12),
            border: `1px solid ${withAlpha(isComplete ? T.teal : tone, 0.3)}`,
            borderRadius: radius.pill,
            padding: `${space.xxs}px ${space.sm}px`,
          }}
        >
          {isComplete ? "Done" : isInProgress ? "Live" : "Ready"}
        </div>
      )}

      <OperationalIcon actionId={action.id} color={text} size={22} />

      <div
        style={{
          fontFamily: font.sans,
          fontSize: typeScale.label,
          fontWeight: 700,
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
            fontSize: typeScale.label,
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
          fontSize: typeScale.label,
          color: withAlpha(T.teal, 0.9),
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
        boxShadow: `inset 0 1px 0 ${border.soft}`,
        transform: holding ? "scale(0.99)" : hovered && !disabled ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
        animation: "commandTileIn 180ms cubic-bezier(0.23,1,0.32,1)",
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
          fontSize: typeScale.label,
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
          fontSize: typeScale.label,
          color: disabled ? T.textMuted : withAlpha(tone, 0.92),
        }}
      >
        {disabled ? "Blocked" : holding ? "Authorizing" : "Hold 2s"}
      </div>
    </div>
  );
}
