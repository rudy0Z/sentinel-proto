/*
 * ─── Obsidian-glass kit: data-viz primitives ────────────────────────────────
 * Redesign 2026 (docs/redesign-2026/04 §1.6, §2). Zero runtime deps — the
 * `@microcharts/react` patterns (bullet, forecast-cone, heat-cell, mini-bar,
 * dual-sparkline) and number-flow's animated numerals, re-tokenized:
 * all colors come from `viz`/`tint` helpers, all geometry from `radius`/`space`.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  NUMERIC_TNUM,
  T,
  border,
  font,
  motion,
  radius,
  space,
  tracking,
  typeStyle,
  typeWeight,
  tint,
  viz,
} from "../../tokens";

const REDUCED = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ─── HairlineBar — 2px-class precision meter (PanelViz.SignalBar successor) ─ */

export function HairlineBar({
  label,
  value,
  display,
  tone = T.cyan,
  height = 4,
  style,
}: {
  label?: string;
  /** 0–100 */
  value: number;
  display?: string;
  tone?: string;
  height?: number;
  style?: CSSProperties;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: space.md, minWidth: 0, ...style }}>
      {label ? (
        <span
          style={{
            fontFamily: font.mono,
            fontSize: typeStyle.metadata.size,
            letterSpacing: tracking.telemetry,
            textTransform: "uppercase",
            color: T.textMuted,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      ) : null}
      <div
        style={{
          flex: 1,
          height,
          borderRadius: radius.pill,
          background: viz.barTrack,
          overflow: "hidden",
        }}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        aria-label={label ?? "value"}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: "100%",
            borderRadius: radius.pill,
            background: viz.barFill(tone),
            transition: `width ${motion.deliberate}`,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: font.mono,
          fontSize: typeStyle.metadata.size,
          color: T.textSecondary,
          minWidth: 34,
          textAlign: "right",
          whiteSpace: "nowrap",
          fontFeatureSettings: NUMERIC_TNUM,
        }}
      >
        {display ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}

/* ─── ArcGauge — 24-segment radial meter with endpoint dot (Aerion pattern) ── */

export function ArcGauge({
  value,
  tone = T.cyan,
  caption,
  width = 168,
  style,
}: {
  /** 0–100 */
  value: number;
  tone?: string;
  caption?: string;
  width?: number;
  style?: CSSProperties;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const segments = 24;
  const span = 180 / segments; // degrees per segment across the top half
  const arc = span - 3; // 3° gap
  const cx = width / 2;
  const cy = width * 0.46;
  const r = width / 2 - 10;
  const fillCount = Math.round((clamped / 100) * segments);

  const polar = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  };
  const segPath = (i: number) => {
    const a0 = 180 - i * span;
    const a1 = a0 - arc;
    const p0 = polar(a0);
    const p1 = polar(a1);
    return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  };
  const dotAngle = 180 - Math.min(fillCount, segments) * span + (span - arc) / 2;
  const dot = polar(Math.max(0, Math.min(180, dotAngle)));

  return (
    <div style={{ position: "relative", width, ...style }}>
      <svg width={width} height={cy + 12} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped)} aria-label={caption ?? "gauge"}>
        {Array.from({ length: segments }, (_, i) => (
          <path
            key={i}
            d={segPath(i)}
            fill="none"
            stroke={i < fillCount ? tint(tone, 0.35 + 0.6 * (i / (segments - 1))) : viz.arcTrack}
            strokeWidth={i < fillCount ? 5 : 4}
            strokeLinecap="round"
          />
        ))}
        <circle cx={dot.x} cy={dot.y} r={3} fill={fillCount > 0 ? tone : viz.arcTrack} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: cy - 34,
          display: "grid",
          justifyItems: "center",
          gap: 2,
        }}
      >
        <Numeral
          value={Math.round(clamped)}
          suffix="%"
          style={{
            fontFamily: font.sans,
            fontSize: typeStyle.display.size,
            lineHeight: 1,
            fontWeight: typeWeight.bold,
            color: T.textPrimary,
          }}
        />
        {caption ? (
          <span
            style={{
              fontFamily: font.mono,
              fontSize: typeStyle.eyebrow.size,
              lineHeight: `${typeStyle.eyebrow.lineHeight}px`,
              fontWeight: typeStyle.eyebrow.weight,
              textTransform: "uppercase",
              color: T.textMuted,
            }}
          >
            {caption}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Sparkline (microcharts dual-sparkline pattern) ─────────────────────── */

export function Sparkline({
  series,
  tone = T.cyan,
  width = 128,
  height = 30,
  area = true,
}: {
  series: number[];
  tone?: string;
  width?: number;
  height?: number;
  area?: boolean;
}) {
  if (series.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = Math.max(1e-6, max - min);
  const px = (i: number) => (i / (series.length - 1)) * (width - 4) + 2;
  const py = (v: number) => height - 3 - ((v - min) / range) * (height - 6);
  const points = series.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const last = { x: px(series.length - 1), y: py(series[series.length - 1]) };
  return (
    <svg width={width} height={height} aria-hidden="true" style={{ flexShrink: 0 }}>
      {area ? (
        <polygon points={`2,${height - 1} ${points} ${width - 2},${height - 1}`} fill={viz.sparkArea(tone)} stroke="none" />
      ) : null}
      <polyline points={points} fill="none" stroke={viz.sparkStroke(tone)} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={2.2} fill={tone} />
    </svg>
  );
}

/* ─── BarcodeHistogram — vertical micro-columns (microcharts mini-bar) ────── */

export function BarcodeHistogram({
  series,
  tone = T.cyan,
  width = 128,
  height = 28,
}: {
  series: number[];
  tone?: string;
  width?: number;
  height?: number;
}) {
  if (series.length === 0) return <svg width={width} height={height} aria-hidden="true" />;
  const max = Math.max(...series, 1);
  const slot = width / series.length;
  const barW = Math.max(1.5, Math.min(4, slot - 1.5));
  return (
    <svg width={width} height={height} aria-hidden="true" style={{ flexShrink: 0 }}>
      {series.map((v, i) => {
        const h = Math.max(1.5, (v / max) * (height - 2));
        return (
          <rect
            key={i}
            x={(i * slot + (slot - barW) / 2).toFixed(2)}
            y={(height - h).toFixed(2)}
            width={barW.toFixed(2)}
            height={h.toFixed(2)}
            rx={1}
            fill={tint(tone, 0.35 + 0.55 * (v / max))}
          />
        );
      })}
    </svg>
  );
}

/* ─── HeatCells — freshness/confidence grid (microcharts heat-cell) ───────── */

export function HeatCells({
  cells,
  tone = T.cyan,
  cols = 9,
}: {
  cells: Array<{ label: string; level: number }>;
  tone?: string;
  cols?: number;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 14px)`, gap: 3 }}>
      {cells.map((cell) => (
        <span
          key={cell.label}
          title={`${cell.label} — ${Math.round(cell.level * 100)}%`}
          style={{
            width: 14,
            height: 14,
            borderRadius: radius.dense,
            background: viz.heatCell(tone, cell.level),
            border: `1px solid ${border.soft}`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── SegmentedCells — consumable-resource bar (doc 13 Phase D) ────────────
 * The segmented-progress-card idea, corrected for the domain: no 3D tilt
 * (instruments don't tilt), and segments carry semantic thresholds — a bar
 * that stays one colour to 5% is lying. Stagger entrance ≤60ms, disabled
 * under reduced motion. */
export function SegmentedCells({
  value,
  total = 12,
  label,
  warnAt = 0.35,
  riskAt = 0.15,
  style,
}: {
  /** 0..1 fill fraction — the resource remaining. */
  value: number;
  total?: number;
  label?: string;
  /** Fractions below these thresholds shift the fill tone (honesty law). */
  warnAt?: number;
  riskAt?: number;
  style?: CSSProperties;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const fillCount = Math.round(clamped * total);
  const tone = clamped <= riskAt ? T.red : clamped <= warnAt ? T.amber : T.teal;
  return (
    <div style={{ display: "grid", gap: space.sm, ...style }}>
      {label ? (
        <span style={{ fontFamily: font.mono, fontSize: typeStyle.eyebrow.size, fontWeight: typeWeight.semibold, letterSpacing: tracking.eyebrow, textTransform: "uppercase", color: T.textMuted }}>
          {label}
        </span>
      ) : null}
      <div data-testid="segmented-cells" style={{ display: "flex", gap: 3 }} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped * 100)} aria-label={label ?? "resource"}>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            data-kit-anim="true"
            style={{
              flex: 1,
              height: 12,
              borderRadius: radius.dense,
              background: i < fillCount ? tint(tone, 0.5 + 0.5 * (i / Math.max(1, total - 1))) : T.bgRaised,
              border: `1px solid ${i < fillCount ? tint(tone, 0.7) : border.soft}`,
              animation: REDUCED() ? undefined : `kitRise 240ms ${"cubic-bezier(0.23,1,0.32,1)"} ${i * 20}ms both`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── ForecastCone — projection + uncertainty band (microcharts forecast-cone) ─ */

export function ForecastCone({
  history,
  forecast,
  lower,
  upper,
  tone = T.amber,
  width = 200,
  height = 64,
}: {
  history: number[];
  forecast: number[];
  lower: number[];
  upper: number[];
  tone?: string;
  width?: number;
  height?: number;
}) {
  const all = [...history, ...upper, ...lower];
  if (all.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = Math.max(1e-6, max - min);
  const total = history.length + forecast.length;
  const px = (i: number) => (i / (total - 1)) * (width - 4) + 2;
  const py = (v: number) => height - 4 - ((v - min) / range) * (height - 8);
  const histPoints = history.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const fcStart = history.length - 1;
  const midPoints = [history[fcStart], ...forecast].map((v, i) => `${px(fcStart + i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const cone = [
    ...upper.map((v, i) => `${px(fcStart + i).toFixed(1)},${py(v).toFixed(1)}`),
    ...[...lower].reverse().map((v, i) => `${px(total - 1 - i).toFixed(1)},${py(v).toFixed(1)}`),
  ].join(" ");
  return (
    <svg width={width} height={height} role="img" aria-label="projection with uncertainty cone">
      <polygon points={cone} fill={viz.coneFill(tone)} stroke="none" />
      <polyline points={histPoints} fill="none" stroke={viz.sparkStroke(T.cyan)} strokeWidth="1.5" strokeLinecap="round" />
      <polyline points={midPoints} fill="none" stroke={viz.coneEdge(tone)} strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Numeral — animated tabular numeral (number-flow pattern) ────────────── */

export function Numeral({
  value,
  suffix,
  style,
}: {
  value: number;
  suffix?: string;
  style?: CSSProperties;
}) {
  const [shown, setShown] = useState(value);
  const prevRef = useRef(value);
  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    if (from === value || REDUCED()) {
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 300;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease.out
      setShown(from + (value - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const rendered = Number.isInteger(value) ? Math.round(shown) : shown.toFixed(1);
  return (
    <span style={{ fontFeatureSettings: NUMERIC_TNUM, ...style }}>
      {rendered}
      {suffix ? <span style={{ fontSize: "0.6em", color: T.textMuted }}>{suffix}</span> : null}
    </span>
  );
}

/* ─── Ticker — streaming one-liners (kibo ticker pattern) ─────────────────── */

export function Ticker({
  entries,
  max = 6,
}: {
  entries: Array<{ id: string; text: string; tone?: string }>;
  max?: number;
}) {
  return (
    <div style={{ display: "grid", gap: space.sm }}>
      {entries.slice(0, max).map((entry) => (
        <div
          key={entry.id}
          data-kit-anim="true"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: space.md,
            animation: "kitRise 240ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          <span
            aria-hidden="true"
            style={{ width: 4, height: 4, borderRadius: radius.pill, background: entry.tone ?? T.textMuted, flexShrink: 0, alignSelf: "center" }}
          />
          <span style={{ fontFamily: font.sans, fontSize: typeStyle.body.size, color: T.textSecondary, lineHeight: 1.5 }}>
            {entry.text}
          </span>
        </div>
      ))}
    </div>
  );
}
