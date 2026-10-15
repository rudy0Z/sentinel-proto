/*
 * ─── Obsidian-glass kit: core primitives ────────────────────────────────────
 * Redesign 2026 (docs/redesign-2026/04 §2). Every primitive is a token-only
 * recipe — no free-form hex, blur, radius, or shadow at call sites. Sources
 * mined from the local component vault and re-tokenized on arrival:
 *   PanelGlass    — glass-lens-react GlassSurface + kokonutui liquid-glass-card
 *   StatusDot/Pill — kibo packages/status
 *   EvidenceChip  — cult-ui ai-elements inline-citation + sources
 *   CommandTile   — current action tile + class chip + expiry ring
 *   TierDot       — attention tiers from domain/attention.ts (ISA-18.2-flavored)
 */
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  NUMERIC_TNUM,
  tint,
  T,
  border,
  ease,
  font,
  light,
  materialGlass,
  materialLight,
  motion,
  radius,
  space,
  surface,
  tracking,
  typeStyle,
  typeWeight,
  viz,
} from "../../tokens";

/* Injected once per page: kit-scoped keyframes + reduced-motion guard. */
let kitStylesInjected = false;

/** Spreadable tabular-numeral fragment (NUMERIC_TNUM is the raw value). */
const NUMERIC_TNUM_AS_STYLE = { fontFeatureSettings: NUMERIC_TNUM } as const;
export function KitStyles() {
  useEffect(() => {
    if (kitStylesInjected) return;
    kitStylesInjected = true;
    const style = document.createElement("style");
    style.id = "sentinel-kit-styles";
    style.textContent = `
      @keyframes kitPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(28,184,230,0.0), 0 0 8px rgba(28,184,230,0.15); }
        50% { box-shadow: 0 0 0 5px rgba(28,184,230,0.10), 0 0 16px rgba(28,184,230,0.30); }
      }
      @keyframes kitAlertPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(229,83,60,0.0), 0 0 8px rgba(229,83,60,0.20); }
        50% { box-shadow: 0 0 0 5px rgba(229,83,60,0.12), 0 0 16px rgba(229,83,60,0.38); }
      }
      @keyframes kitRise {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes kitWave {
        0%, 100% { transform: scaleY(0.35); }
        50% { transform: scaleY(1); }
      }
      /* CommandButton key travel: the edge lifts 2px, the press collapses it
         and pushes the plate 1px down — tactile without the isometric tilt. */
      .kit-key { transform: translateY(0); }
      .kit-key:active:not(:disabled) { transform: translateY(1px); border-bottom-width: 1px; }
      @media (prefers-reduced-motion: reduce) {
        .kit-anim, [data-kit-anim] { animation: none !important; transition: none !important; }
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
}

/* ─── PanelGlass ─────────────────────────────────────────────────────────── */

export function PanelGlass({
  variant = "panel",
  padding = space.lg,
  /** Light-chrome surfaces (rails, Mind console, cards) — doc 13 Phase C. */
  light: isLight,
  children,
  style,
  ...rest
}: {
  variant?: "panel" | "raised" | "deck" | "label";
  padding?: number | string;
  light?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  const lightVariant = variant === "deck" ? "raised" : variant === "label" ? "label" : variant === "raised" ? "raised" : "panel";
  return (
    <div
      {...rest}
      style={{
        ...(isLight ? materialLight[lightVariant] : materialGlass[variant]),
        padding,
        color: isLight ? light.textPrimary : T.textPrimary,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── TierDot — attention tier indicator (doc 03: T1 takeover … T4 log) ───── */

export type Tier = "T1" | "T2" | "T3" | "T4";

const TIER_TONE: Record<Tier, string> = {
  T1: T.red,
  T2: T.amber,
  T3: T.cyan,
  T4: T.textMuted,
};

export function TierDot({ tier, size = 6 }: { tier: Tier; size?: number }) {
  const tone = TIER_TONE[tier];
  const interrupting = tier === "T1" || tier === "T2";
  return (
    <span
      aria-hidden="true"
      data-kit-anim={interrupting ? "true" : undefined}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: radius.pill,
        background: tone,
        opacity: tier === "T4" ? 0.55 : 1,
        animation: tier === "T1" ? "kitAlertPulse 1.6s ease-in-out infinite" : tier === "T2" ? "kitPulse 2.4s ease-in-out infinite" : undefined,
      }}
    />
  );
}

/* ─── SectionEyebrow — mono uppercase header with optional live lip ──────── */

export function SectionEyebrow({
  label,
  lip,
  tier,
  onLight,
  style,
}: {
  label: string;
  /** One load-bearing live value, right-aligned ("FLEET · 2 RTB · 14%"). */
  lip?: string;
  tier?: Tier;
  onLight?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: space.sm,
        ...style,
      }}
    >
      {tier ? <TierDot tier={tier} /> : null}
      <span
        style={{
          fontFamily: font.mono,
          fontSize: typeStyle.eyebrow.size,
          lineHeight: `${typeStyle.eyebrow.lineHeight}px`,
          fontWeight: typeStyle.eyebrow.weight,
          textTransform: "uppercase",
          color: onLight ? light.textMuted : T.textMuted,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: onLight ? light.border : border.soft }} aria-hidden="true" />
      {lip ? (
        <span
          style={{
            fontFamily: font.mono,
            fontSize: typeStyle.metadata.size,
                        lineHeight: `${typeStyle.metadata.lineHeight}px`,
            letterSpacing: tracking.telemetry,
            color: onLight ? light.textSecondary : T.textSecondary,
            whiteSpace: "nowrap",
            ...NUMERIC_TNUM_AS_STYLE,
          }}
        >
          {lip}
        </span>
      ) : null}
    </div>
  );
}

/* ─── StatusDot / StatusPill (kibo status pattern) ───────────────────────── */

export type PillTone = "info" | "safe" | "caution" | "danger" | "neutral";

const PILL_TONE: Record<PillTone, string> = {
  info: T.cyan,
  safe: T.teal,
  caution: T.amber,
  danger: T.red,
  neutral: T.textMuted,
};

/** Contrast-calibrated triad for light-chrome surfaces (WCAG AA on white). */
const PILL_TONE_LIGHT: Record<PillTone, string> = {
  info: light.tone.info,
  safe: light.tone.safe,
  caution: light.tone.caution,
  danger: light.tone.danger,
  neutral: light.tone.neutral,
};

export function pillTone(tone: PillTone, onLight?: boolean): string {
  return onLight ? PILL_TONE_LIGHT[tone] : PILL_TONE[tone];
}

export function StatusDot({ tone, pulse, onLight }: { tone: PillTone; pulse?: boolean; onLight?: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-kit-anim={pulse ? "true" : undefined}
      style={{
        width: 6,
        height: 6,
        flexShrink: 0,
        borderRadius: radius.pill,
        background: pillTone(tone, onLight),
        animation: pulse ? "kitPulse 2.4s ease-in-out infinite" : undefined,
      }}
    />
  );
}

export function StatusPill({
  label,
  tone = "neutral",
  pulse,
  onLight,
  style,
}: {
  label: string;
  tone?: PillTone;
  pulse?: boolean;
  onLight?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space.sm,
        padding: `2px ${space.sm + 2}px`,
        borderRadius: radius.pill,
        border: `1px solid ${onLight ? light.border : border.hairline}`,
        background: onLight ? light.control : "rgba(255, 255, 255, 0.03)",
        fontFamily: font.mono,
        fontSize: typeStyle.metadata.size,
        letterSpacing: tracking.telemetry,
        textTransform: "uppercase",
        color: pillTone(tone, onLight),
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <StatusDot tone={tone} pulse={pulse} onLight={onLight} />
      {label}
    </span>
  );
}

/* ─── EvidenceChip (cult-ui inline-citation pattern) ─────────────────────── */

export type EvidenceStatus = "pending" | "active" | "stale" | "failed" | "missing";

const EVIDENCE_TONE: Record<EvidenceStatus, PillTone> = {
  active: "info",
  pending: "neutral",
  stale: "caution",
  failed: "danger",
  missing: "neutral",
};

export function EvidenceChip({
  kind,
  status,
  confidence,
  title,
  onLight,
}: {
  kind: string;
  status: EvidenceStatus;
  confidence?: number;
  title?: string;
  onLight?: boolean;
}) {
  const tone = EVIDENCE_TONE[status];
  const dashed = status === "missing";
  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space.sm,
        padding: `3px ${space.sm + 2}px`,
        borderRadius: radius.control,
        border: `1px ${dashed ? "dashed" : "solid"} ${onLight ? light.border : border.hairline}`,
        background: status === "active" ? tint(onLight ? light.tone.info : T.cyan, 0.08) : onLight ? light.control : "rgba(255, 255, 255, 0.03)",
        fontFamily: font.mono,
        fontSize: typeStyle.metadata.size,
        letterSpacing: tracking.telemetry,
        textTransform: "uppercase",
        color: status === "active" ? (onLight ? light.tone.info : T.cyan) : status === "failed" ? (onLight ? light.tone.danger : T.red) : onLight ? light.textSecondary : T.textSecondary,
        whiteSpace: "nowrap",
      }}
    >
      <StatusDot tone={tone} pulse={status === "active"} onLight={onLight} />
      {kind}
      {typeof confidence === "number" ? (
        <span style={{ color: onLight ? light.textMuted : T.textMuted, fontFeatureSettings: NUMERIC_TNUM }}>{confidence}%</span>
      ) : null}
    </span>
  );
}

/* ─── CommandTile — staged command with class chip + expiry ring ─────────── */

export function CommandTile({
  label,
  tone = "info",
  onClick,
  disabled,
  /** Consequence class chip: 1 = autonomous telemetry, 2 = staged, 3 = hold. */
  classChip,
  /** Epoch ms when the staged recommendation expires (doc 03 R4). */
  expiresAt,
  staged,
  /** Gated verbs ride the key travel (CommandButton grammar). */
  gated,
  style,
}: {
  label: string;
  tone?: PillTone;
  onClick?: () => void;
  disabled?: boolean;
  classChip?: string;
  expiresAt?: number | null;
  staged?: boolean;
  gated?: boolean;
  style?: CSSProperties;
}) {
  const accent = PILL_TONE[tone];
  /*
   * Gated verbs require the 2-second hold (constitution: Class-3). A plain
   * click never fires them — press, hold past the bar, and the verb commits.
   * Release before completion cancels silently. Reduced motion keeps the
   * hold: it is safety friction, not animation.
   */
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<number | undefined>(undefined);
  const firedRef = useRef(false);
  const startHold = () => {
    if (!gated || disabled) return;
    firedRef.current = false;
    const started = performance.now();
    holdTimerRef.current = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - started) / 2000);
      setHoldProgress(p);
      if (p >= 1) {
        window.clearInterval(holdTimerRef.current);
        setHoldProgress(0);
        firedRef.current = true;
        onClick?.();
      }
    }, 40);
  };
  const cancelHold = () => {
    window.clearInterval(holdTimerRef.current);
    setHoldProgress(0);
  };
  const handleClick = () => {
    if (gated) {
      firedRef.current = false; // a plain click never fires a gated verb
      return;
    }
    onClick?.();
  };
  return (
    <button
      type="button"
      className={gated ? "kit-key" : undefined}
      data-gated={gated ? "true" : undefined}
      data-kit-anim={gated ? "true" : undefined}
      onClick={handleClick}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space.sm,
        height: 52,
        padding: `0 ${space.lg}px`,
        borderRadius: radius.tile,
        border: `1px solid ${accent}`,
        background: `rgba(255, 255, 255, 0.04)`,
        boxShadow: staged ? `inset 0 0 0 1px rgba(255, 255, 255, 0.04), 0 0 0 3px tint(T.cyan, 0.10)` : "none",
        color: T.textPrimary,
        fontFamily: font.sans,
        fontSize: typeStyle.control.size,
        fontWeight: typeWeight.semibold,
        letterSpacing: tracking.fine,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: `background ${motion.normal}, box-shadow ${motion.normal}`,
        ...style,
      }}
    >
      {classChip ? (
        <span
          style={{
            fontFamily: font.mono,
            fontSize: typeStyle.eyebrow.size,
            letterSpacing: tracking.telemetry,
            color: accent,
            border: `1px solid ${accent}`,
            borderRadius: radius.dense,
            padding: "1px 4px",
          }}
        >
          {classChip}
        </span>
      ) : null}
      <span style={{ whiteSpace: "nowrap" }}>{label}</span>
      {expiresAt ? <CountdownRing expiresAt={expiresAt} tone={accent} /> : null}
      {gated && holdProgress > 0 ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            height: 3,
            width: `${holdProgress * 100}%`,
            background: accent,
            borderRadius: radius.pill,
            transition: "width 40ms linear",
          }}
        />
      ) : null}
    </button>
  );
}

function CountdownRing({ expiresAt, tone }: { expiresAt: number; tone: string }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAt - Date.now()));
  const totalRef = useRef(Math.max(1, expiresAt - Date.now()));
  useEffect(() => {
    const id = window.setInterval(() => setRemaining(Math.max(0, expiresAt - Date.now())), 250);
    return () => window.clearInterval(id);
  }, [expiresAt]);
  const frac = Math.min(1, remaining / totalRef.current);
  const r = 8;
  const c = 2 * Math.PI * r;
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r={r} fill="none" stroke={viz.arcTrack} strokeWidth="2" />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        transform="rotate(-90 10 10)"
        style={{ transition: "stroke-dashoffset 250ms linear" }}
      />
    </svg>
  );
}

/* ─── GlassToggle (better-design glassmorphic-dark switch pattern) ────────── */

export function GlassToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space.sm,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        color: T.textSecondary,
        fontFamily: font.mono,
        fontSize: typeStyle.metadata.size,
        letterSpacing: tracking.telemetry,
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          width: 32,
          height: 18,
          borderRadius: radius.pill,
          background: checked ? tint(T.cyan, 0.25) : "rgba(255, 255, 255, 0.06)",
          border: `1px solid ${checked ? tint(T.cyan, 0.55) : border.hairline}`,
          position: "relative",
          transition: `background ${motion.normal}, border-color ${motion.normal}`,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 15 : 2,
            width: 12,
            height: 12,
            borderRadius: radius.pill,
            background: checked ? T.cyan : T.textMuted,
            transition: `left ${motion.normal}`,
          }}
        />
      </span>
      {label}
    </button>
  );
}

/* ─── CommandButton — the keycap translation (doc 13 Phase D) ─────────────
 * A top-view chamfered key with real travel: 2px edge lift that collapses and
 * a 1px downward press on :active, ~120ms. The isometric keycap idea survives
 * as this flat plate — it speaks the same chamfer language as the TALON mark.
 * Reserved for gated verbs (hold-to-authorize, dispatch): every button being a
 * keycap would make none of them special. */
export function CommandButton({
  label,
  tone = "info",
  onClick,
  disabled,
  gated,
  onLight,
  style,
}: {
  label: string;
  tone?: PillTone;
  onClick?: () => void;
  disabled?: boolean;
  /** Gated verbs get the key travel and the semantic accent border. */
  gated?: boolean;
  onLight?: boolean;
  style?: CSSProperties;
}) {
  const accent = pillTone(tone, onLight);
  return (
    <button
      type="button"
      className="kit-key"
      data-gated={gated ? "true" : undefined}
      data-kit-anim="true"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: space.sm,
        height: 40,
        padding: `0 ${space.lg}px`,
        borderRadius: radius.dense,
        border: `1px solid ${gated ? accent : onLight ? light.borderStrong : border.strong}`,
        borderBottomWidth: 3,
        background: gated ? tint(accent, 0.12) : onLight ? light.control : surface.control,
        color: gated ? accent : onLight ? light.textPrimary : T.textPrimary,
        fontFamily: font.mono,
        fontSize: typeStyle.control.size,
        fontWeight: typeWeight.semibold,
        letterSpacing: tracking.telemetry,
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: `transform 120ms ${ease.out}, border-width 120ms ${ease.out}, background ${motion.normal}`,
        ...style,
      }}
    >
      {label}
    </button>
  );
}
