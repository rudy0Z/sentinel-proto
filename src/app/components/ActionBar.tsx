import { useCallback, useRef, useState } from "react";
import { OperationalIcon } from "./OperationalIcon";
import {
  getTalonSessionRecommendation,
} from "../domain/talon";
import { COMMAND_LABELS } from "../domain/microcopy";
import { TalonSession } from "./talon/TalonSession";
import {
  DISABLED_OPACITY,
  type QuickActionId,
  type QuickActionState,
  type ShellState,
  type DroneMissionType,
  type TalonConversationChangeHandler,
  type TalonConversationState,
  type TalonVoiceState,
  T,
  border,
  material,
  font,
  radius,
  space,
  surface,
  tint,
  tone,
  typeScale,
  typeWeight,
} from "../tokens";

/*
 * The command cluster is content-width: one orb, one authorize-able command,
 * one danger affordance. These are the pill dimensions, sized to sit level with
 * the 56px TALON orb.
 */
const PILL_H = 56;
const PILL_MIN_W = 208;
const PILL_MAX_W = 320;

interface ActionBarProps {
  state: ShellState;
  onAction: (actionId: QuickActionId) => void;
  coreMode?: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onTalonVoiceChange?: (vs: TalonVoiceState) => void;
  onTalonConversationChange?: TalonConversationChangeHandler;
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
  const talonRecommendation = getTalonSessionRecommendation(state);
  const displayedRecommendation = state.talonConversation.response
    ? {
        ...talonRecommendation,
        title: state.talonConversation.response.title,
        body: state.talonConversation.response.body,
        tone: state.talonConversation.response.tone,
      }
    : talonRecommendation;
  const authorizationLabel = isGate
    ? "Source conflict must be resolved"
    : displayedRecommendation.requiresHumanGate
      ? "Human authorization required"
      : "Operator review remains in control";
  const authorizationDetail = isGate
    ? "TALON cannot prepare the packet until the permit conflict is verified."
    : displayedRecommendation.blocker ?? "TALON can recommend and explain; only the operator can commit.";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: space.md,
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
          gap: space.lg,
          background: tone.caution.fill,
          border: `1.5px solid ${T.amber}`,
          borderRadius: radius.panel,
          padding: `${space.sm}px ${space.lg}px`,
          maxWidth: 760,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: space.xs, minWidth: 0 }}>
            <span style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.bold, color: T.amber }}>
              Source disagreement: thermal anomaly vs. active burn permit
            </span>
            <span style={{ fontFamily: font.sans, fontSize: typeScale.body, color: T.textSecondary, lineHeight: 1.35 }}>
              Sensor Fusion flags a thermal spike but Satellite IR indicates a controlled agricultural burn.
            </span>
          </div>
          <label style={{
            display: "flex", alignItems: "center", gap: space.sm,
            fontFamily: font.sans, fontSize: typeScale.label, color: T.textPrimary, fontWeight: typeWeight.semibold,
            cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
            background: surface.controlHover, padding: `${space.sm}px ${space.md}px`, borderRadius: radius.control, border: `1px solid ${border.strong}`,
          }}>
            <input type="checkbox" checked={burnPermitVerified} onChange={(e) => onBurnPermitVerifyChange?.(e.target.checked)}
              style={{ cursor: "pointer", width: space.lg, height: space.lg, accentColor: T.amber }} />
            <span>I have verified agricultural burn permits for this sector.</span>
          </label>
        </div>
      )}

      {/*
        One line of gate / blocker state, directly above the control it governs.
        In quiet watch there is no gate to name, so the line goes away rather
        than asserting an authorization that nothing is waiting on. The open
        session states its own gate, so the line yields to it.
      */}
      {flank.length > 0 && !expanded && (
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: space.sm,
          maxWidth: "min(660px, calc(100vw - 48px))",
          textAlign: "center",
        }}
        role="status"
        aria-live="polite"
      >
        <span
          style={{
            fontFamily: font.sans,
            fontSize: typeScale.caption,
            fontWeight: typeWeight.bold,
            color: isGate || displayedRecommendation.requiresHumanGate ? T.amber : T.cyan,
            whiteSpace: "nowrap",
          }}
        >
          {authorizationLabel}
        </span>
        <span
          style={{
            fontFamily: font.sans,
            fontSize: typeScale.caption,
            color: T.textSecondary,
            lineHeight: 1.4,
          }}
        >
          {authorizationDetail}
        </span>
      </div>
      )}

      {/*
        Three-column frame keeps the orb on the true horizontal centre no matter
        how wide the current command is. The frame itself has no surface — the
        map runs underneath the cluster.
      */}
      <div
        style={{
          width: "min(980px, calc(100vw - 48px))",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: space.md,
        }}
      >
        <div aria-hidden="true" />

        <TalonSession
          variant="floating"
          conversation={state.talonConversation}
          onConversationChange={handleConversation}
          legacyMode={!onTalonConversationChange}
          expanded={expanded}
          onExpandedChange={() => onToggleExpand()}
          context={{
            recommendation: displayedRecommendation,
            statusLabel: displayedRecommendation.title,
            detail: displayedRecommendation.body,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: space.md, justifySelf: "start", minWidth: 0 }}>
          <CommandGroup actions={flank} onAction={handleAction} state={state} />
          {menuActions.length > 0 && <DangerMenu actions={menuActions} onAction={handleAction} state={state} />}
        </div>
      </div>

    </div>
  );
}

// ─── The one authorize-able command beside TALON ─────────────────────────────

function CommandGroup({ actions, onAction, state }: { actions: QuickActionState[]; onAction: (id: QuickActionId) => void; state: ShellState }) {
  if (actions.length === 0) {
    /*
     * Quiet watch. TALON is still synthesizing, but nothing is waiting on the
     * operator — say so rather than inventing a command.
     */
    return (
      <div
        style={{
          height: PILL_H,
          display: "flex",
          alignItems: "center",
          padding: `0 ${space.md}px`,
          borderRadius: radius.panel,
          border: `1px dashed ${border.default}`,
          fontFamily: font.mono,
          fontSize: typeScale.caption,
          letterSpacing: "0.04em",
          color: T.textMuted,
          whiteSpace: "nowrap",
        }}
      >
        No command staged
      </div>
    );
  }
  return (
    <>
      {actions.map((action) =>
        action.id === "authorize-containment" ? (
          <HoldPill key={action.id} action={action} onConfirm={() => onAction(action.id)} />
        ) : (
          <CommandPill key={action.id} action={action} state={state} onClick={() => onAction(action.id)} />
        ),
      )}
    </>
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
          width: 44, height: 44, borderRadius: radius.tile,
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
              ...material.popover, borderColor: tint(T.red, 0.3), minWidth: 220,
              padding: space.sm, display: "flex", flexDirection: "column", gap: space.xs,
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
                    display: "flex", alignItems: "center", gap: space.sm, width: "100%",
                    padding: `${space.sm}px ${space.md}px`, borderRadius: radius.control,
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

/*
 * The pill is the operator's half of the contract. Its fill, border, and
 * subtitle all follow the action's status, so the surface beside TALON is what
 * tells the operator whether anything is waiting on them.
 */
function pillSubtitle(action: QuickActionState, assignedDroneName?: string) {
  if (action.status === "disabled") return action.description;
  if (action.status === "complete") return assignedDroneName ? `${assignedDroneName} assigned` : "Receipt written";
  if (action.status === "in-progress") return "Executing under supervision";
  if (action.status === "recommended") return "Awaiting your authorization";
  return action.description;
}

function CommandPill({ action, onClick, state }: { action: QuickActionState; state: ShellState; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const { tone, border: pillBorder, background, text } = baseTileColors(action);
  const isDisabled = action.status === "disabled";
  const isComplete = action.status === "complete";
  const isRecommended = action.status === "recommended";
  const isInteractive = !isDisabled && !isComplete;
  const isInProgress = action.status === "in-progress";

  const missionType = ACTION_TO_MISSION[action.id];
  const assignedDrone = isComplete && missionType
    ? state.drones.find((d) => d.assignedMission === missionType)
    : undefined;

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
        height: PILL_H,
        minWidth: PILL_MIN_W,
        maxWidth: PILL_MAX_W,
        borderRadius: radius.panel,
        border: `1px solid ${isRecommended && hovered ? withAlpha(tone, 0.8) : pillBorder}`,
        background: isRecommended && hovered ? withAlpha(tone, 0.18) : background,
        color: text,
        opacity: isDisabled ? DISABLED_OPACITY : 1,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        gap: space.md,
        padding: `0 ${space.md}px`,
        cursor: isInteractive ? "pointer" : "default",
        boxShadow: `inset 0 1px 0 ${isRecommended ? withAlpha(tone, 0.24) : border.soft}`,
        transform: pressed ? "translateY(1px) scale(0.99)" : hovered && isInteractive ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 120ms ease, border-color 160ms ease, background 160ms ease",
        textAlign: "left",
        animation: "commandTileIn 200ms cubic-bezier(0.23,1,0.32,1)",
      }}
    >
      {isInProgress ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: space.none,
            right: space.none,
            bottom: space.none,
            height: space.xs,
            background: withAlpha(tone, 0.55),
            animation: "pulseBar 1.5s ease-in-out infinite",
          }}
        />
      ) : null}

      <OperationalIcon actionId={action.id} color={text} size={20} />

      <span style={{ display: "flex", flexDirection: "column", gap: space.xs, minWidth: 0 }}>
        <span
          style={{
            fontFamily: font.sans,
            fontSize: typeScale.body,
            fontWeight: typeWeight.bold,
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {action.label}
        </span>
        <span
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.caption,
            color: isComplete ? withAlpha(T.teal, 0.92) : isDisabled ? T.textMuted : T.textSecondary,
            letterSpacing: "0.02em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {pillSubtitle(action, assignedDrone?.name)}
        </span>
      </span>
    </button>
  );
}

function HoldPill({ action, onConfirm }: { action: QuickActionState; onConfirm: () => void }) {
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
        height: PILL_H,
        minWidth: PILL_MIN_W,
        maxWidth: PILL_MAX_W,
        borderRadius: radius.panel,
        border: `1px solid ${tileBorder}`,
        background,
        color: text,
        opacity: disabled ? DISABLED_OPACITY : 1,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        gap: space.md,
        padding: `0 ${space.md}px`,
        cursor: disabled ? "default" : "pointer",
        boxShadow: `inset 0 1px 0 ${border.soft}`,
        transform: holding ? "scale(0.99)" : hovered && !disabled ? "translateY(-1px)" : "translateY(0)",
        transition: "transform 120ms ease, border-color 160ms ease",
        animation: "commandTileIn 200ms cubic-bezier(0.23,1,0.32,1)",
      }}
    >
      {/* Hold progress reads as the fill advancing across the command itself. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: withAlpha(tone, 0.22),
          transform: `scaleX(${progress / 100})`,
          transformOrigin: "left center",
          transition: holding ? "none" : "transform 120ms ease",
        }}
      />

      <OperationalIcon actionId={action.id} color={text} size={20} style={{ position: "relative", zIndex: 1 }} />

      <span style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: space.xs, minWidth: 0 }}>
        <span
          style={{
            fontFamily: font.sans,
            fontSize: typeScale.body,
            fontWeight: typeWeight.bold,
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {action.label}
        </span>
        <span
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.caption,
            color: disabled ? T.textMuted : withAlpha(tone, 0.92),
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          {disabled
            ? action.description
            : holding
              ? `Authorizing · ${Math.ceil(progress)}%`
              : "Hold 2s to authorize"}
        </span>
      </span>
    </div>
  );
}
