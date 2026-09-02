import type { CSSProperties } from "react";
import type { TalonSessionPhase } from "../../tokens";

/**
 * Visual states the mark can hold. These collapse the session phases into the
 * distinct *motion* signatures — several phases share one signature because
 * they represent the same kind of work.
 */
export type TalonMarkState =
  | "watching"
  | "listening"
  | "searching"
  | "solving"
  | "gated"
  | "executing"
  | "blocked"
  | "receipt";

export interface TalonMarkProps {
  color: string;
  size?: number;
  style?: CSSProperties;
  title?: string;
  decorative?: boolean;
  /** Drives the motion signature. Defaults to a quiet watch. */
  state?: TalonMarkState;
}

/** Session phase → motion signature. */
export function markStateForPhase(phase: TalonSessionPhase | undefined): TalonMarkState {
  switch (phase) {
    case "input": return "listening";
    case "review": return "searching";
    case "checking": return "searching";
    case "recommendation": return "solving";
    case "human-gate": return "gated";
    case "executing": return "executing";
    case "receipt": return "receipt";
    case "error": return "blocked";
    case "cancelled": return "watching";
    default: return "watching";
  }
}

/** Human-readable verb per state, for the live region and for anyone who wants a text pairing. */
export const TALON_MARK_STATE_LABEL: Record<TalonMarkState, string> = {
  watching: "Watching",
  listening: "Listening",
  searching: "Checking evidence",
  solving: "Preparing recommendation",
  gated: "Awaiting human authorization",
  executing: "Executing, supervised",
  blocked: "Blocked",
  receipt: "Receipt recorded",
};

/*
 * ─── The convergence gate ────────────────────────────────────────────────────
 *
 * Three source vectors enter a guarded centre through a three-bladed aperture.
 * The geometry is instrument-grade — an aperture/reticle, not a badge or a
 * shield — and rotationally symmetric, so it reads as a system rather than an
 * emblem. The aperture is what lets the mark carry the actual thesis: the
 * blades physically CLOSE over the core at a human gate and hold there. A
 * particle orb can show an AI thinking; it cannot show an AI being stopped.
 *
 * Legibility correction: the geometry above is the identity, but geometry
 * alone was too subtle at 60px — the first version of this mark relied on
 * stroke-opacity shifts of a few percent, which do not read at control size.
 * Two things now carry state unmistakably instead of subtly:
 *   1. the core is a FILLED disc whose fill strength jumps hard between
 *      states (a resting glint vs. a solid lit disc is a shape difference,
 *      not a shade difference — visible at a glance, not on inspection);
 *   2. three states that are easy to get WRONG in an emergency instrument —
 *      gated, blocked, receipt — get an unambiguous glyph overlay (lock,
 *      caution, check) rather than asking the operator to read blade angles.
 * Single-colour by contract — state rides on fill, glyph, and motion, never
 * a coloured glow.
 */
/*
 * TalonMark is a thin wrapper that remounts the real SVG whenever `state`
 * changes (via `key`). This is deliberate, not incidental: every rule in
 * talon.css assumes a fresh element, which is what makes a transition play
 * every time rather than only on the states a CSS selector-diffing quirk
 * happens to restart. It is what makes "the states are invisible" actually
 * fixed, not just less-subtle.
 */
export function TalonMark(props: TalonMarkProps) {
  return <TalonMarkInner key={props.state ?? "watching"} {...props} />;
}

function TalonMarkInner({
  color,
  size = 32,
  style,
  title = "TALON convergence gate",
  decorative = false,
  state = "watching",
}: TalonMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      color={color}
      style={style}
      className="talon-mark"
      data-state={state}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : `${title}: ${TALON_MARK_STATE_LABEL[state]}`}
      aria-hidden={decorative || undefined}
    >
      {/* Outer perimeter. A second, wider ring pulses outward once on every
          state change (talon-mark__burst) so a transition is caught in the
          instant it happens, not deduced from two static frames. */}
      <circle
        className="talon-mark__ring"
        cx="24"
        cy="24"
        r="21"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity=".45"
      />
      <circle
        className="talon-mark__burst"
        cx="24"
        cy="24"
        r="21"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />

      {/* Three inbound source vectors, entering through the aperture gaps. */}
      <g
        className="talon-mark__vectors"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity=".9"
      >
        <path d="M41.32 14 L31.79 19.5" />
        <path d="M24 44 L24 33" />
        <path d="M6.68 14 L16.21 19.5" />
      </g>

      {/* Aperture blades. These rotate closed at a gate and open on release. */}
      <g
        className="talon-mark__blades"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path className="talon-mark__blade" d="M16.96 10.76 A15 15 0 0 1 31.04 10.76" />
        <path className="talon-mark__blade" d="M38.99 24.52 A15 15 0 0 1 31.95 36.72" />
        <path className="talon-mark__blade" d="M16.05 36.72 A15 15 0 0 1 9.01 24.52" />
      </g>

      {/* The guarded decision centre — a filled disc, not a hollow ring, so
          "lit" vs. "resting" is a shape change, not a shade change. */}
      <g className="talon-mark__core">
        <circle className="talon-mark__core-fill" cx="24" cy="24" r="9" fill="currentColor" />
        <circle cx="24" cy="24" r="9" stroke="currentColor" strokeWidth="1.4" opacity=".5" />
      </g>

      {/* Unambiguous glyph overlays. Rendered always, shown only for their
          state via talon.css — legible at a glance, no geometry to parse. */}
      <g className="talon-mark__glyph talon-mark__glyph--gated" stroke={color} strokeWidth="0" fill="none">
        <rect x="18.5" y="23.5" width="11" height="9" rx="2" fill="#071019" stroke={color} strokeWidth="1.6" />
        <path d="M20.5 23.5 v-3 a3.5 3.5 0 0 1 7 0 v3" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="24" cy="27.6" r="1.3" fill={color} />
      </g>

      <g className="talon-mark__glyph talon-mark__glyph--blocked">
        <path d="M24 18.5 L31 30.5 H17 Z" fill="#071019" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M24 23.2 v4.1" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="24" cy="29.4" r="0.9" fill={color} />
      </g>

      <g className="talon-mark__glyph talon-mark__glyph--receipt">
        <circle cx="24" cy="24" r="8" fill="#071019" stroke={color} strokeWidth="1.6" />
        <path d="M20 24.2 L23 27.2 L28.5 20.8" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
