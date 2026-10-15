import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { DissentDirection, OverrideReason } from "../tokens";
import { T, font, layer, material, motion, radius, space, surface, tint, tracking, typeScale, typeWeight } from "../tokens";
import { OVERRIDE_REASONS } from "../mockData";

/*
 * DissentGate — the human gate for disagreeing with TALON.
 *
 * Every other gate in Sentinel asks the operator to authorize something TALON
 * prepared. This one is the mirror: the operator is refusing TALON, or acting
 * where TALON declined to. It exists because an unexplained override is
 * unreviewable later — by a supervisor, by the next shift, and most of all by
 * the operator themselves when they are asked to justify the call.
 *
 * The gate deliberately shows TALON's position one last time before the
 * operator commits. Not to argue: to make sure the disagreement is real rather
 * than a misread, and so the record shows exactly what was declined.
 */

const COPY: Record<
  DissentDirection,
  { eyebrow: string; title: string; talonLabel: string; consequence: string[] }
> = {
  "talon-escalates": {
    eyebrow: "Overruling a recommendation",
    title: "You are declining an escalation TALON recommends.",
    talonLabel: "TALON's position",
    consequence: [
      "The incident closes on your authority, with your reason attached.",
      "TALON keeps the hypothesis under reduced-weight watch — it is not deleted.",
      "It will not raise this with you again below a raised confidence threshold.",
      "If new evidence crosses that threshold, it goes to the duty supervisor, not back to you.",
    ],
  },
  "talon-holds": {
    eyebrow: "Acting past a hold",
    title: "TALON does not have grounds to recommend this escalation.",
    talonLabel: "TALON's assessment",
    consequence: [
      "The escalation proceeds — authority is yours, not TALON's.",
      "The packet is marked operator-initiated so the receiving authority knows the basis.",
      "TALON's objection and confidence at this moment travel with the packet.",
      "You are not later measured against a confidence the system never offered.",
    ],
  },
};

const TALON_STATEMENT: Record<DissentDirection, { text: string; confidence: number }> = {
  "talon-escalates": {
    text: "Thermal, satellite IR, and burn-history signals converge at 78%. I assess this as an authority-notifiable wildfire risk and recommend escalation.",
    confidence: 78,
  },
  "talon-holds": {
    text: "Evidence sits at 46%. Satellite confirmation is absent and the visual feed is smoke-obscured. I do not have grounds to recommend escalation yet.",
    confidence: 46,
  },
};

export function DissentGate({
  direction,
  onConfirm,
  onCancel,
}: {
  direction: DissentDirection;
  onConfirm: (reason: OverrideReason, note?: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<OverrideReason | null>(null);
  const [note, setNote] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const copy = COPY[direction];
  const talon = TALON_STATEMENT[direction];
  const accent = direction === "talon-escalates" ? T.amber : T.red;

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      restoreFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      /* Window-CAPTURE, so this fires before bubble handlers. If another modal
       * is stacked on top of this one (ActionModal opened while the dissent gate
       * was up), the topmost dialog owns Escape — otherwise this gate would
       * cancel itself out from under the operator's actual target. */
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
      if (dialogs.length > 1) return;
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    };
    window.addEventListener("keydown", closeOnEscape, true);
    return () => window.removeEventListener("keydown", closeOnEscape, true);
  }, [onCancel]);

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) {
      event.preventDefault();
      event.currentTarget.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div
      ref={dialogRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: layer.entry,
        ...material.scrim,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: `fadeIn ${motion.normal}`,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm disagreement with TALON"
      tabIndex={-1}
      onKeyDown={trapFocus}
    >
      <div
        style={{
          width: 560,
          ...material.overlay,
          border: `1px solid ${tint(accent, 0.3)}`,
          padding: `${space.lg}px ${space.lg}px`,
        }}
      >
        <div
          style={{
            fontFamily: font.mono,
            fontSize: typeScale.label,
            letterSpacing: tracking.eyebrow,
            textTransform: "uppercase",
            color: accent,
            marginBottom: space.sm,
          }}
        >
          {copy.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: font.sans,
            fontSize: typeScale.heading,
            fontWeight: typeWeight.bold,
            color: T.textPrimary,
            lineHeight: 1.35,
            margin: 0,
            marginBottom: space.md,
          }}
        >
          {copy.title}
        </h2>

        {/* TALON's position, restated verbatim before the operator commits. */}
        <div
          style={{
            padding: `${space.md}px ${space.md}px`,
            background: tint(T.cyan, 0.06),
            border: `1px solid ${tint(T.cyan, 0.18)}`,
            borderRadius: radius.panel,
            marginBottom: space.md,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: space.sm,
            }}
          >
            <span
              style={{
                fontFamily: font.mono,
                fontSize: typeScale.label,
                letterSpacing: tracking.eyebrow,
                textTransform: "uppercase",
                color: T.cyan,
              }}
            >
              {copy.talonLabel}
            </span>
            <span style={{ fontFamily: font.mono, fontSize: 10, color: T.textMuted }}>
              {talon.confidence}% confidence
            </span>
          </div>
          <p
            style={{
              fontFamily: font.sans,
              fontSize: typeScale.body,
              color: T.textSecondary,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {talon.text}
          </p>
        </div>

        <div
          style={{
            fontFamily: font.sans,
            fontSize: typeScale.label,
            fontWeight: typeWeight.semibold,
            color: T.textPrimary,
            marginBottom: space.sm,
          }}
        >
          Your reason <span style={{ color: accent }}>*</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, marginBottom: space.md }}>
          {OVERRIDE_REASONS.map((option) => {
            const selected = option === reason;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setReason(option)}
                aria-pressed={selected}
                style={{
                  fontFamily: font.sans,
                  fontSize: typeScale.label,
                  fontWeight: selected ? typeWeight.semibold : typeWeight.regular,
                  color: selected ? accent : T.textSecondary,
                  background: selected ? tint(accent, 0.16) : "rgba(255,255,255,0.04)",
                  border: `1px solid ${selected ? tint(accent, 0.55) : "rgba(255,255,255,0.10)"}`,
                  borderRadius: radius.tile,
                  padding: "7px 14px",
                  cursor: "pointer",
                  transition: `background ${motion.fast}, border-color ${motion.fast}, color ${motion.fast}`,
                }}
              >
                {option}
              </button>
            );
          })}
        </div>

        <label
          htmlFor="dissent-note"
          style={{
            display: "block",
            fontFamily: font.sans,
            fontSize: typeScale.label,
            color: T.textMuted,
            marginBottom: space.xs,
          }}
        >
          What do you know that TALON does not? (optional, goes on the record)
        </label>
        <textarea
          id="dissent-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder="Permitted burn on the north ridge — I have the permit reference and visual on the crew."
          style={{
            width: "100%",
            resize: "none",
            fontFamily: font.sans,
            fontSize: typeScale.body,
            color: T.textPrimary,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: radius.tile,
            padding: `${space.sm}px ${space.sm}px`,
            marginBottom: space.md,
            outlineColor: accent,
          }}
        />

        {/* What follows from this — stated before the operator commits, not after. */}
        <div
          style={{
            padding: `${space.md}px ${space.md}px`,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: radius.panel,
            marginBottom: space.md,
          }}
        >
          <div
            style={{
              fontFamily: font.mono,
              fontSize: typeScale.label,
              letterSpacing: tracking.eyebrow,
              textTransform: "uppercase",
              color: T.textMuted,
              marginBottom: space.sm,
            }}
          >
            What happens next
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 6 }}>
            {copy.consequence.map((line) => (
              <li
                key={line}
                style={{
                  fontFamily: font.sans,
                  fontSize: typeScale.label,
                  color: T.textSecondary,
                  lineHeight: 1.55,
                }}
              >
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: "flex", gap: space.sm, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontFamily: font.sans,
              fontSize: typeScale.body,
              fontWeight: typeWeight.semibold,
              color: T.textSecondary,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: radius.tile,
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Go back
          </button>
          <button
            type="button"
            disabled={!reason}
            onClick={() => reason && onConfirm(reason, note.trim() || undefined)}
            style={{
              fontFamily: font.sans,
              fontSize: typeScale.body,
              fontWeight: typeWeight.bold,
              color: reason ? accent : T.textMuted,
              background: reason ? tint(accent, 0.16) : "rgba(255,255,255,0.04)",
              border: `1px solid ${reason ? accent : "rgba(255,255,255,0.10)"}`,
              borderRadius: radius.tile,
              padding: "10px 20px",
              cursor: reason ? "pointer" : "not-allowed",
              transition: `background ${motion.fast}, border-color ${motion.fast}, color ${motion.fast}`,
            }}
          >
            Record and continue
          </button>
        </div>
      </div>
    </div>
  );
}
