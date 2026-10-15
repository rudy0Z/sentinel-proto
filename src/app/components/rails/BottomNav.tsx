/*
 * ─── BottomNav (shell v3) — docs/redesign-2026/14 §3.1.5 · sentinel-core/06 ──
 * The deck as three zones plus the orb. TRUTH (left) · PHASE + TALON ORB
 * (center) · COMMANDS (right).
 *
 * Laws inherited from sentinel-core/06 and not negotiable here:
 *   1. Gates resolve ONLY through CommandTile's hold-to-authorize → onAction →
 *      handleAction → ActionModal. A plain click never fires a gated verb.
 *   2. Geometry is invariant during a hold. Nothing here reflows on a pop.
 *   3. The deck is the hand — fixed, legible, gripping. No navigation, no
 *      history, no chat scrolling. Those belong to the rails.
 *   4. Silence never approves. Expiry is never execution.
 */
import { GATED_ACTIONS } from "../../domain/stateMachine";
import type { TalonSurface } from "../../domain/talonSurface";
import type { QuickActionId, ShellState } from "../../tokens";
import { INCIDENT } from "../../mockData";
import { T, border, font, materialGlass, motion, radius, space, tracking, typeStyle, typeWeight, layer } from "../../tokens";
import { CommandTile, KitStyles, SectionEyebrow, StatusPill } from "../kit/core";
import { TalonMark } from "../talon/TalonMark";
import "./rails.css";

export const DECK_HEIGHT = 88;

const PHASES = [
  { id: "intelligence", label: "Intelligence" },
  { id: "operations", label: "Operations" },
] as const;

export function BottomNav({
  state,
  surface,
  onAction,
  timeString,
  incidentElapsed,
  live,
  liveConnected,
  stagedExpiresAt,
  onOpenSession,
}: {
  state: ShellState;
  surface: TalonSurface;
  onAction: (id: QuickActionId) => void;
  timeString: string;
  incidentElapsed: number;
  live: boolean;
  liveConnected: boolean;
  stagedExpiresAt: number | null;
  onOpenSession: () => void;
}) {
  const primary = state.actionSurface.primary
    .filter((a) => a.status === "available" || a.status === "recommended")
    .slice(0, 2);
  const secondary = state.actionSurface.secondary
    .filter((a) => a.status === "available" || a.status === "recommended")
    .slice(0, 1);
  const voiceActive =
    state.talonConversation.voiceState === "listening" ||
    state.talonConversation.voiceState === "processing";
  const minutes = Math.floor(incidentElapsed / 60);
  const seconds = String(incidentElapsed % 60).padStart(2, "0");
  const orbLoud = surface.posture === "gated" || surface.posture === "alert" || voiceActive;

  return (
    <div
      data-deck="true"
      role="toolbar"
      aria-label="TALON command bar"
      style={{
        position: "absolute",
        left: space.md,
        right: space.md,
        bottom: space.md,
        height: DECK_HEIGHT,
        zIndex: layer.command,
        ...materialGlass.deck,
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
        alignItems: "center",
        columnGap: space.xl,
        padding: `0 ${space.xl}px`,
      }}
    >
      <KitStyles />

      {/* TRUTH — incident, phase, clock, live state. Two rows, never more. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <SectionEyebrow label={INCIDENT.id} lip={`${timeString} UTC`} />
        <div style={{ display: "flex", alignItems: "center", gap: space.md }}>
          <StatusPill
            label={state.mode}
            tone={state.mode === "rescue" ? "danger" : state.mode === "contain" ? "caution" : "info"}
          />
          <span
            style={{
              fontFamily: font.mono,
              fontSize: typeStyle.metadata.size,
              letterSpacing: tracking.telemetry,
              color: T.textSecondary,
              fontFeatureSettings: '"tnum"',
            }}
          >
            T+{minutes}:{seconds}
          </span>
          {live ? (
            <StatusPill
              label={liveConnected ? "LIVE-SIM" : "LIVE-SIM · OFFLINE"}
              tone={liveConnected ? "info" : "caution"}
              pulse={!liveConnected}
            />
          ) : null}
        </div>
      </div>

      {/* CENTER — phase progress + the orb. The orb asks; the rail shows. */}
      <div style={{ display: "flex", alignItems: "center", gap: space.lg }}>
        <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
          {PHASES.map((phase, i) => {
            const active = state.workflowPhase === phase.id;
            const passed = i === 0 && state.workflowPhase === "operations";
            return (
              <span key={phase.id} style={{ display: "inline-flex", alignItems: "center", gap: space.sm }}>
                {i > 0 ? (
                  <span
                    aria-hidden="true"
                    style={{
                      width: 14,
                      height: 1,
                      background: passed || active ? T.cyan : border.soft,
                      transition: `background ${motion.normal}`,
                    }}
                  />
                ) : null}
                <span
                  style={{
                    fontFamily: font.mono,
                    fontSize: typeStyle.eyebrow.size,
                    lineHeight: `${typeStyle.eyebrow.lineHeight}px`,
                    fontWeight: typeStyle.eyebrow.weight,
                    letterSpacing: tracking.eyebrow,
                    textTransform: "uppercase",
                    color: active ? T.cyan : T.textMuted,
                  }}
                >
                  {phase.label}
                </span>
              </span>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onOpenSession}
          aria-label="Open TALON session"
          title={surface.postureLine}
          className={orbLoud ? "rls-orb rls-orb--gate" : "rls-orb"}
          style={{
            width: 64,
            height: 64,
            marginBottom: 10,
            borderRadius: radius.pill,
            background: T.bgBase,
            border: `1px solid ${surface.tone}`,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <TalonMark size={44} state={surface.markState} color={surface.tone} />
        </button>

        <div style={{ display: "grid", gap: 3, maxWidth: 320 }}>
          <span
            style={{
              fontFamily: font.mono,
              fontSize: typeStyle.eyebrow.size,
              lineHeight: `${typeStyle.eyebrow.lineHeight}px`,
              fontWeight: typeStyle.eyebrow.weight,
              letterSpacing: tracking.eyebrow,
              textTransform: "uppercase",
              color: surface.tone,
            }}
          >
            {surface.postureLabel}
          </span>
          <span
            style={{
              fontFamily: font.sans,
              fontSize: typeStyle.body.size,
              lineHeight: `${typeStyle.body.lineHeight}px`,
              color: T.textSecondary,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {surface.postureLine}
          </span>
        </div>
      </div>

      {/* COMMANDS — fixed slots. Gated verbs carry hold-to-authorize + expiry. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: space.md,
          minWidth: 0,
        }}
      >
        {primary.length === 0 && secondary.length === 0 ? (
          <span
            style={{
              fontFamily: font.sans,
              fontSize: typeStyle.metadata.size,
              color: T.textMuted,
              whiteSpace: "nowrap",
            }}
          >
            Nothing is waiting on you
          </span>
        ) : null}
        {primary.map((action) => (
          <div key={action.id} data-staged={action.status === "recommended" ? "true" : undefined}>
            <CommandTile
              label={action.label}
              tone={action.status === "recommended" ? "info" : "neutral"}
              classChip={GATED_ACTIONS.has(action.id) ? "C3" : "C2"}
              expiresAt={action.status === "recommended" ? stagedExpiresAt : null}
              staged={action.status === "recommended"}
              gated={GATED_ACTIONS.has(action.id)}
              onClick={() => onAction(action.id)}
              disabled={action.status === "disabled"}
            />
          </div>
        ))}
        {secondary.map((action) => (
          <CommandTile
            key={action.id}
            label={action.label}
            tone="neutral"
            classChip="C2"
            onClick={() => onAction(action.id)}
            disabled={action.status === "disabled"}
            style={{ opacity: 0.85 }}
          />
        ))}
      </div>
    </div>
  );
}