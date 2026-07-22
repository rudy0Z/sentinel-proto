import { useState } from "react";
import type { DissentDirection, OverrideReason } from "../tokens";
import { T, font, layer, motion, radius, shadow, space, surface, tint, typeScale, typeWeight } from "../tokens";
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
  const copy = COPY[direction];
  const talon = TALON_STATEMENT[direction];
  const accent = direction === "talon-escalates" ? T.amber : T.red;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: layer.entry,
        background: "rgba(4,8,14,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: `fadeIn ${motion.normal}`,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm disagreement with TALON"
    >
      <div
        style={{
          width: 560,
          background: surface.overlay,
          border: `1px solid ${tint(accent, 0.3)}`,
          borderRadius: radius.overlay,
          boxShadow: shadow.quiet,
          padding: `${space["2xl"]}px ${space["3xl"]}px`,
        }}
      >
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 9,
            letterSpacing: "0.12em",
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
            marginBottom: space.lg,
          }}
        >
          {copy.title}
        </h2>

        {/* TALON's position, restated verbatim before the operator commits. */}
        <div
          style={{
            padding: `${space.lg}px ${space.xl}px`,
            background: tint(T.cyan, 0.06),
            border: `1px solid ${tint(T.cyan, 0.18)}`,
            borderRadius: radius.card,
            marginBottom: space.xl,
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
                fontSize: 9,
                letterSpacing: "0.1em",
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg }}>
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
                  borderRadius: radius.lg,
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
            borderRadius: radius.lg,
            padding: `${space.sm}px ${space.md}px`,
            marginBottom: space.xl,
            outlineColor: accent,
          }}
        />

        {/* What follows from this — stated before the operator commits, not after. */}
        <div
          style={{
            padding: `${space.lg}px ${space.xl}px`,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: radius.card,
            marginBottom: space.xl,
          }}
        >
          <div
            style={{
              fontFamily: font.mono,
              fontSize: 9,
              letterSpacing: "0.1em",
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

        <div style={{ display: "flex", gap: space.md, justifyContent: "flex-end" }}>
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
              borderRadius: radius.lg,
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
              borderRadius: radius.lg,
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
