/*
 * ─── Shell v2 kit-based panels (docs/redesign-2026/03 P5) ───────────────────
 * The first surfaces rebuilt entirely on the obsidian-glass kit. They consume
 * the same domain data as the legacy panels (getSignalHistory, drone roster,
 * live telemetry frames) so scripted and live modes render identically.
 */
import { getSignalHistory } from "../../domain/talon";
import { FIRE, burnedAcres } from "../../map/fire/fireModel";
import type { DroneRosterEntry, ShellState } from "../../tokens";
import { INCIDENT } from "../../mockData";
import { font, light, space, tracking, typeStyle, typeWeight, NUMERIC_TNUM, tint, T, border, surface } from "../../tokens";
import { PanelGlass, SectionEyebrow, StatusPill } from "../kit/core";
import { ArcGauge, HairlineBar, Numeral, SegmentedCells, Sparkline } from "../kit/viz";

/*
 * HeroMetric — the dashboardcn card anatomy (doc 13 Phase I hierarchy pass):
 * eyebrow → one hero value at display size → delta chip → sparkline. One focal
 * number per card; supporting values stay at title size. Deltas are derived
 * from the visible series only (never invented).
 */
function HeroMetric({
  label,
  value,
  suffix,
  delta,
  deltaSuffix,
  series,
  tone,
  seriesTone,
}: {
  label: string;
  value: number;
  suffix?: string;
  /** Derived from the visible series: last point minus the point before it. */
  delta?: number;
  deltaSuffix?: string;
  series?: number[];
  tone: string;
  seriesTone?: string;
}) {
  const raised = (delta ?? 0) > 0;
  const flat = (delta ?? 0) === 0;
  return (
    <div style={{ display: "grid", gap: space.sm, minWidth: 0 }}>
      <span
        style={{
          fontFamily: font.mono,
          fontSize: typeStyle.eyebrow.size,
          lineHeight: `${typeStyle.eyebrow.lineHeight}px`,
          fontWeight: typeWeight.semibold,
          letterSpacing: tracking.eyebrow,
          textTransform: "uppercase",
          color: light.textMuted,
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: space.sm, minWidth: 0 }}>
        <Numeral
          value={value}
          suffix={suffix}
          style={{
            fontFamily: font.sans,
            fontSize: typeStyle.display.size,
            lineHeight: `${typeStyle.display.lineHeight}px`,
            fontWeight: typeWeight.bold,
            letterSpacing: tracking.displayTight,
            color: tone,
            fontFeatureSettings: NUMERIC_TNUM,
          }}
        />
        {typeof delta === "number" ? (
          <span
            style={{
              fontFamily: font.mono,
              fontSize: typeStyle.metadata.size,
              fontWeight: typeWeight.semibold,
              letterSpacing: tracking.telemetry,
              color: flat ? light.textMuted : raised ? light.tone.danger : light.tone.safe,
              border: `1px solid ${tint(flat ? light.textMuted : raised ? light.tone.danger : light.tone.safe, 0.35)}`,
              borderRadius: 4,
              padding: "1px 5px",
              whiteSpace: "nowrap",
            }}
          >
            {raised ? "▲" : flat ? "— " : "▼"} {flat ? "hold" : `${deltaSuffix ?? ""}${Math.abs(delta)}`}
          </span>
        ) : null}
      </div>
      {series && series.length > 1 ? (
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <Sparkline series={series} tone={seriesTone ?? tone} width={150} height={22} />
        </div>
      ) : null}
    </div>
  );
}

/** Delta derived from a visible series: last point minus the one before it. */
function seriesDelta(series: number[]): number {
  if (series.length < 2) return 0;
  return Math.round((series[series.length - 1] - series[series.length - 2]) * 10) / 10;
}

/* ─── C1 Convergence card — the buried hero, given a permanent home (G-01) ── */

export function ConvergenceCard({ state, evidenceConfidence }: { state: ShellState; evidenceConfidence: number }) {
  const history = getSignalHistory(state.scene);
  return (
    <PanelGlass light variant="raised" padding={space.lg} style={{ display: "grid", gap: space.md }}>
      <SectionEyebrow onLight label="Convergence" lip={`${INCIDENT.id}`} tier="T3" />
      <HeroMetric
        label="Fused confidence"
        value={Math.round(evidenceConfidence)}
        suffix="%"
        delta={seriesDelta(history.confidence)}
        deltaSuffix="pts "
        series={history.confidence}
        tone={light.tone.info}
      />
      <div style={{ display: "grid", gap: space.sm }}>
        <SignalRow label="Thermal" series={history.thermal} tone={light.tone.danger} />
        <SignalRow label="Structures" series={history.structures} tone={light.tone.caution} />
      </div>
    </PanelGlass>
  );
}

function SignalRow({ label, series, tone }: { label: string; series: number[]; tone: string }) {
  const current = series.length > 0 ? series[series.length - 1] : 0;
  const delta = seriesDelta(series);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: space.md }}>
      <span
        style={{
          fontFamily: font.mono,
          fontSize: typeStyle.metadata.size,
          letterSpacing: tracking.telemetry,
          textTransform: "uppercase",
          color: light.textMuted,
          width: 76,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <Numeral
        value={current}
        style={{ fontFamily: font.sans, fontSize: typeStyle.title.size, fontWeight: typeWeight.semibold, color: tone, fontFeatureSettings: NUMERIC_TNUM }}
      />
      {delta !== 0 ? (
        <span style={{ fontFamily: font.mono, fontSize: typeStyle.metadata.size, fontWeight: typeWeight.semibold, letterSpacing: tracking.telemetry, color: delta > 0 ? light.tone.danger : light.tone.safe, whiteSpace: "nowrap" }}>
          {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
        </span>
      ) : null}
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
        <Sparkline series={series} tone={tone} width={120} height={24} />
      </div>
    </div>
  );
}

/* ─── C2 Telemetry strip — live-frame ready (5 Hz) with scripted fallback ─── */

/**
 * Fire behaviour — standard NWCG fire-weather metrics.
 *
 * These are the definitions a wildland operator actually reads: rate of spread
 * in chains per hour, energy release component, fine dead fuel moisture, flame
 * length. They were the most conspicuous gap in the panel set — a fire map with
 * no behaviour numbers is a picture, not a picture of a fire.
 *
 * HONESTY: the values are AUTHORED, not computed by a Rothermel run, and the
 * header states that on the surface. Acres is DERIVED from the drawn
 * perimeter geometry so the number cannot disagree with the map.
 */
export function FireBehaviourBlock({ dark = true }: { dark?: boolean }) {
  const m = FIRE.metrics;
  const text = dark ? T.textSecondary : light.textSecondary;
  const muted = dark ? T.textMuted : light.textMuted;
  const cells: Array<[string, string]> = [
    ["ROS", `${m.rosChainsPerHr} ch/hr`],
    ["ERC", `${m.erc}`],
    ["FUEL", `${m.fuelMoisturePct}%`],
    ["FLAME", `${m.flameLengthFt} ft`],
    ["AREA", `${burnedAcres()} ac`],
  ];
  return (
    <div style={{ display: "grid", gap: space.sm }}>
      <SectionEyebrow
        onLight={!dark}
        label="Fire behaviour"
        lip="NWCG"
        tier="T3"
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: space.sm }}>
        {cells.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "grid",
              gap: 2,
              padding: `${space.xs}px ${space.sm}px`,
              borderRadius: 8,
              background: dark ? surface.control : light.inset,
              border: `1px solid ${dark ? border.soft : light.border}`,
            }}
          >
            <span
              style={{
                fontFamily: font.mono,
                fontSize: typeStyle.eyebrow.size,
                letterSpacing: tracking.eyebrow,
                textTransform: "uppercase",
                color: muted,
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: typeStyle.control.size,
                fontWeight: typeWeight.semibold,
                fontFeatureSettings: NUMERIC_TNUM,
                color: dark ? T.textPrimary : light.textPrimary,
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
      <span style={{ fontFamily: font.sans, fontSize: typeStyle.metadata.size, color: text, lineHeight: 1.4 }}>
        {m.basis}. Area derived from the newest perimeter.
      </span>
    </div>
  );
}

export function TelemetryStripV2({
  thermalF,
  confidence,
  windLabel,
  structuresCleared,
  source,
  drone,
}: {
  thermalF: number;
  confidence: number;
  windLabel: string;
  structuresCleared: number;
  source: "scripted" | "live";
  /** The tracked asset's HUD fields (panels-charter §7): GS/ALT/HDG + BAT/LINK. */
  drone?: { name: string; gs: number; alt: number; hdg: number; bat: number; link: number } | null;
}) {
  const history = getSignalHistory("verify-active");
  return (
    <PanelGlass light variant="panel" padding={space.md} style={{ display: "grid", gap: space.md }}>
      <SectionEyebrow onLight
        label="Live telemetry"
        lip={source === "live" ? "WS 5 Hz" : "scripted"}
        tier={source === "live" ? "T3" : "T4"}
      />
      {/* One focal number per card (dashboardcn anatomy): thermal leads,
          confidence / cleared / wind support at title size. */}
      <HeroMetric
        label="Thermal"
        value={thermalF}
        suffix="°F"
        delta={seriesDelta(history.thermal)}
        series={history.thermal}
        tone={light.tone.danger}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: `${space.sm}px ${space.md}px` }}>
        <MetricCell label="Fused" value={Math.round(confidence)} suffix="%" tone={light.tone.info} />
        <MetricCell label="Cleared" value={structuresCleared} suffix="⁄47" tone={light.tone.safe} />
        <div style={{ display: "grid", gap: 2, alignContent: "start" }}>
          <span
            style={{
              fontFamily: font.mono,
              fontSize: typeStyle.eyebrow.size,
          lineHeight: `${typeStyle.eyebrow.lineHeight}px`,
          fontWeight: typeStyle.eyebrow.weight,
              textTransform: "uppercase",
              color: light.textMuted,
            }}
          >
            Wind
          </span>
          <span style={{ fontFamily: font.sans, fontSize: typeStyle.title.size, fontWeight: typeWeight.semibold, color: light.textPrimary, fontFeatureSettings: NUMERIC_TNUM }}>
            {windLabel}
          </span>
        </div>
      </div>
      {drone ? (
        <div style={{ display: "grid", gap: space.sm, borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: space.sm }}>
          <SectionEyebrow onLight label={`${drone.name} · HUD`} tier="T3" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: `${space.sm}px ${space.md}px` }}>
            <MetricCell label="Ground speed" value={drone.gs} suffix=" m/s" tone={light.tone.info} />
            <MetricCell label="Altitude" value={drone.alt} suffix=" m AGL" tone={light.tone.safe} />
            <MetricCell label="Heading" value={drone.hdg} suffix="°" tone={light.tone.caution} />
          </div>
          <HairlineBar label="BAT" value={drone.bat} tone={drone.bat < 25 ? light.tone.caution : light.tone.safe} height={3} />
          <HairlineBar label="LINK" value={drone.link} tone={light.tone.info} height={3} />
        </div>
      ) : null}
    </PanelGlass>
  );
}

function MetricCell({ label, value, suffix, tone }: { label: string; value: number; suffix?: string; tone: string }) {
  return (
    <div style={{ display: "grid", gap: 2, alignContent: "start" }}>
      <span
        style={{
          fontFamily: font.mono,
          fontSize: typeStyle.eyebrow.size,
          lineHeight: `${typeStyle.eyebrow.lineHeight}px`,
          fontWeight: typeStyle.eyebrow.weight,
          textTransform: "uppercase",
          color: light.textMuted,
        }}
      >
        {label}
      </span>
      <Numeral value={value} suffix={suffix} style={{ fontFamily: font.sans, fontSize: typeStyle.panelTitle.size, fontWeight: typeWeight.semibold, color: tone, fontFeatureSettings: NUMERIC_TNUM }} />
    </div>
  );
}

/* ─── P5 Fleet rows — status pill + hairline battery/signal (kibo status) ─── */

export function FleetRowsV2({ drones }: { drones: DroneRosterEntry[] }) {
  return (
    <PanelGlass light variant="panel" padding={space.md} style={{ display: "grid", gap: space.md }}>
      <SectionEyebrow onLight
        label="Fleet"
        lip={`${drones.filter((d) => d.battery < 30).length} low · ${drones.length} active`}
        tier={drones.some((d) => d.battery < 20) ? "T2" : "T4"}
      />
      <div style={{ display: "grid", gap: space.md }}>
        {drones.slice(0, 5).map((drone) => (
          <div key={drone.id} style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: space.md }}>
              <span style={{ fontFamily: font.sans, fontSize: typeStyle.control.size, fontWeight: typeWeight.semibold, color: light.textPrimary }}>
                {drone.name}
              </span>
              <span style={{ fontFamily: font.mono, fontSize: typeStyle.metadata.size, color: light.textMuted, flex: 1, minWidth: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.35 }}>
                {drone.capabilityLabel}
              </span>
              <StatusPill onLight label={drone.status} tone={drone.battery < 20 ? "caution" : "info"} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
              <span style={{ fontFamily: font.mono, fontSize: typeStyle.eyebrow.size, fontWeight: typeWeight.semibold, letterSpacing: tracking.eyebrow, color: light.textMuted }}>BAT</span>
              <SegmentedCells value={drone.battery / 100} total={10} style={{ flex: 1 }} />
              <span style={{ fontFamily: font.mono, fontSize: typeStyle.metadata.size, color: light.textSecondary, fontFeatureSettings: NUMERIC_TNUM }}>{drone.battery}%</span>
            </div>
            <HairlineBar label="SIG" value={drone.signal} tone={light.tone.info} height={3} />
          </div>
        ))}
      </div>
    </PanelGlass>
  );
}
