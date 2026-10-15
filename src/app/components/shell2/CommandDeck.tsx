/*
 * ─── Command Deck (shell v2) — docs/redesign-2026/03 §Architecture ─────────
 * Full-width obsidian-glass deck that re-homes the navbar's truths and the
 * action plinth's commands. The center bay is TALON's cradle: the curved
 * inlay is styling (an honest FUI translation — doc 02 §2), and the gate
 * geometry is invariant during a hold. Gates live here and ONLY here.
 */
import { GATED_ACTIONS } from "../../domain/stateMachine";
import type { TalonSurface } from "../../domain/talonSurface";
import type { QuickActionId, ShellState } from "../../tokens";
import { INCIDENT } from "../../mockData";
import { T, font, materialGlass, motion, radius, shadow, space, tracking, typeStyle, typeWeight, layer } from "../../tokens";
import { CommandTile, KitStyles, SectionEyebrow, StatusPill } from "../kit/core";
import { TranscriptBars } from "../kit/feedback";
import { TalonMark } from "../talon/TalonMark";

const DECK_HEIGHT = 88;

export function CommandDeck({
  state,
  surface,
  onAction,
  timeString,
  incidentElapsed,
  live,
  liveConnected,
  stagedExpiresAt,
}: {
  state: ShellState;
  surface: TalonSurface;
  onAction: (id: QuickActionId) => void;
  timeString: string;
  incidentElapsed: number;
  live: boolean;
  liveConnected: boolean;
  stagedExpiresAt: number | null;
}) {
  const primary = state.actionSurface.primary.filter((a) => a.status === "available" || a.status === "recommended").slice(0, 2);
  const secondary = state.actionSurface.secondary.filter((a) => a.status === "available" || a.status === "recommended").slice(0, 1);
  const voiceActive = state.talonConversation.voiceState === "listening" || state.talonConversation.voiceState === "processing";
  const minutes = Math.floor(incidentElapsed / 60);
  const seconds = String(incidentElapsed % 60).padStart(2, "0");

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
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        columnGap: space.xl,
        padding: `0 ${space.xl}px`,
      }}
    >
      <KitStyles />

      {/* Truth cluster — the only things the old navbar earned its keep for */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <SectionEyebrow label={INCIDENT.id} lip={`${timeString} UTC`} />
        <div style={{ display: "flex", alignItems: "center", gap: space.md }}>
          <StatusPill label={state.mode} tone={state.mode === "rescue" ? "danger" : state.mode === "contain" ? "caution" : "info"} />
          <span style={{ fontFamily: font.mono, fontSize: typeStyle.metadata.size, letterSpacing: tracking.telemetry, color: T.textSecondary, ...{ fontFeatureSettings: '"tnum"' } }}>
            T+{minutes}:{seconds}
          </span>
          {live ? <StatusPill label={liveConnected ? "LIVE-SIM" : "LIVE-SIM · OFFLINE"} tone={liveConnected ? "info" : "caution"} pulse={!liveConnected} /> : null}
        </div>
      </div>

      {/* TALON cradle — the curved center bay (styling, not hardware claims) */}
      <div style={{ display: "flex", alignItems: "center", gap: space.lg, justifyContent: "center" }}>
        <div
          title={surface.postureLine}
          style={{
            width: 60,
            height: 60,
            borderRadius: radius.pill,
            background: "rgba(5, 11, 19, 0.92)",
            border: `1px solid ${surface.tone}`,
            boxShadow: shadow.quiet,
            display: "grid",
            placeItems: "center",
            transition: `border-color ${motion.normal}, box-shadow ${motion.normal}`,
          }}
        >
          <TalonMark size={40} state={surface.markState} color={surface.tone} />
        </div>
        <div style={{ display: "grid", gap: 3, maxWidth: 420 }}>
          <span
            style={{
              fontFamily: font.mono,
              fontSize: typeStyle.eyebrow.size,
          lineHeight: `${typeStyle.eyebrow.lineHeight}px`,
          fontWeight: typeStyle.eyebrow.weight,
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
        <TranscriptBars active={voiceActive} bars={18} tone={surface.tone} height={20} />
      </div>

      {/* Commands — staged tiles carry the expiry ring (R4); gates only here */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: space.md, minWidth: 0 }}>
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

export const DECK_BOTTOM_INSET = DECK_HEIGHT + space.md * 2 + space.md;
