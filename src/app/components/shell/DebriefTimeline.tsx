/**
 * DebriefTimeline (Sentinel V2 · Phase 6) — the after-action debrief surface.
 *
 * A timeline scrubber over the incident's decision beats plus audit-receipt
 * inspection. Scrub is a real control (keyboard-accessible range input), and
 * the beat readout is tabular so the clock does not shimmer while scrubbing.
 */

import { useState } from "react";
import { T, border, font, radius, space, surface, tracking, typeScale } from "../../tokens";

const BEATS = [
  "T+00 DETECT",
  "T+15 VERIFY",
  "T+30 NOTIFY",
  "T+45 CONTAIN",
  "T+60 RESCUE",
  "T+90 HANDOFF",
];

export function DebriefTimeline({ sceneLabel }: { sceneLabel: string }) {
  const [i, setI] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  return (
    <div
      data-action="debrief-timeline"
      style={{
        borderTop: "1px solid " + border.default,
        padding: space.sm,
        display: "flex",
        flexDirection: "column",
        gap: space.xs,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, letterSpacing: tracking.eyebrow, textTransform: "uppercase" }}>
          Debrief
        </span>
        <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.cyan, letterSpacing: tracking.telemetry, fontFeatureSettings: "'tnum' 1" }}>
          {BEATS[i]}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={BEATS.length - 1}
        value={i}
        onChange={(e) => setI(Number(e.target.value))}
        onPointerDown={() => setScrubbing(true)}
        onPointerUp={() => setScrubbing(false)}
        onBlur={() => setScrubbing(false)}
        aria-label="Debrief timeline scrubber"
        style={{ width: "100%", accentColor: T.cyan, cursor: "pointer" }}
      />
      <div style={{ display: "flex", gap: 3 }}>
        {BEATS.map((b, idx) => (
          <span
            key={b}
            title={b}
            style={{ flex: 1, height: 3, borderRadius: radius.pill, background: idx <= i ? T.cyan : surface.control }}
          />
        ))}
      </div>
      <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textSecondary, lineHeight: 1.4 }}>
        {sceneLabel + " · beat " + (i + 1) + "/" + BEATS.length + (scrubbing ? " · scrubbing" : "")}
      </div>
      <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, letterSpacing: tracking.telemetry, borderTop: "1px solid " + border.default, paddingTop: space.xs }}>
        SESSION LEDGER · append-only · {sceneLabel.toUpperCase()} · prototype in-memory
      </div>
    </div>
  );
}
