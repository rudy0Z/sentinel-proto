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
      {/* Outer collimator frame — chamfered tactical polygon with cardinal ticks */}
      <path
        className="talon-mark__ring"
        d="M14 4 L34 4 L44 14 L44 34 L34 44 L14 44 L4 34 L4 14 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity=".45"
      />
      <path
        className="talon-mark__burst"
        d="M14 4 L34 4 L44 14 L44 34 L34 44 L14 44 L4 34 L4 14 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      {/* 4 Cardinal optical reticle ticks */}
      <g className="talon-mark__ticks" stroke="currentColor" strokeWidth="1.5" opacity=".55" strokeLinecap="round">
        <line x1="24" y1="2" x2="24" y2="5" />
        <line x1="24" y1="43" x2="24" y2="46" />
        <line x1="2" y1="24" x2="5" y2="24" />
        <line x1="43" y1="24" x2="46" y2="24" />
      </g>

      {/* Three inbound source vectors, entering through the aperture gaps. */}
      <g
        className="talon-mark__vectors"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity=".9"
      >
        <path d="M40 13 L31 19" />
        <path d="M24 44 L24 33" />
        <path d="M8 13 L17 19" />
      </g>

      {/* Prehensile vector claws (The Grip) — 3 angular chevrons that rotate and clamp shut. */}
      <g
        className="talon-mark__blades"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.22"
      >
        {/* Top claw */}
        <path className="talon-mark__blade" d="M14 12 L24 6 L34 12 L28 15 L24 11 L20 15 Z" />
        {/* Bottom-right claw */}
        <path className="talon-mark__blade" d="M39.4 21.3 L39.6 33 L29.4 38.7 L29.8 32 L35.3 30.5 L33.8 25 Z" />
        {/* Bottom-left claw */}
        <path className="talon-mark__blade" d="M8.6 21.3 L8.4 33 L18.6 38.7 L18.2 32 L12.7 30.5 L14.2 25 Z" />
      </g>

      {/* The guarded decision centre — faceted diamond core with state-reactive fill */}
      <g className="talon-mark__core">
        <polygon className="talon-mark__core-fill" points="24,17 31,24 24,31 17,24" fill="currentColor" />
        <polygon points="24,15 33,24 24,33 15,24" stroke="currentColor" strokeWidth="1.4" opacity=".5" fill="none" />
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
