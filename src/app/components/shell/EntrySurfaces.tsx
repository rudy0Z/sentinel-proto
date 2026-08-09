import { T, border, font, layer, material, radius, space, surface, tint, tracking, typeScale, typeStyle, typeWeight } from "../../tokens";

export function EntryScreen({ onBeginScenario, onExploreFree }: { onBeginScenario: () => void; onExploreFree: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: layer.entry,
        ...material.scrim,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 700ms ease",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: space["2xl"], maxWidth: 480, padding: `0 ${space["3xl"]}px`, textAlign: "center" }}>
        <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, letterSpacing: tracking.eyebrow, textTransform: "uppercase" }}>
          Wildfire Response · Prototype
        </div>
        <div style={{ fontFamily: font.sans, fontSize: typeStyle.metric.size, fontWeight: typeWeight.bold, color: T.textPrimary, lineHeight: 1.1, letterSpacing: tracking.tight }}>
          FlytBase Sentinel
        </div>
        <div style={{ fontFamily: font.sans, fontSize: typeStyle.panelTitle.size, color: T.textSecondary, lineHeight: 1.7, maxWidth: 340 }}>
          Wildfire response command interface.<br />AI proposes. Operator authorizes.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: space.sm, width: "100%", maxWidth: 260, marginTop: space.md }}>
          <button
            type="button"
            onClick={onBeginScenario}
            style={{
              padding: `${space.md}px 0`,
              borderRadius: radius.tile,
              background: T.cyan,
              border: "none",
              color: T.onAction,
              fontFamily: font.sans,
              fontSize: typeStyle.brand.size,
              fontWeight: typeWeight.semibold,
              cursor: "pointer",
              letterSpacing: tracking.tight,
            }}
          >
            Begin Scenario
          </button>
          <button
            type="button"
            onClick={onExploreFree}
            style={{
              padding: `${space.md}px 0`,
              borderRadius: radius.tile,
              background: "transparent",
              border: `1px solid ${border.strong}`,
              color: T.textSecondary,
              fontFamily: font.sans,
              fontSize: typeScale.title,
              cursor: "pointer",
            }}
          >
            Explore freely
          </button>
        </div>
      </div>
    </div>
  );
}

export function ScenarioBrief({ onReady }: { onReady: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: layer.modal,
        ...material.scrim,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 400ms ease",
      }}
    >
      <div
        style={{
          ...material.overlay,
          maxWidth: 460,
          width: "100%",
          margin: `0 ${space["2xl"]}px`,
          padding: `${space["3xl"]}px ${space.xl}px`,
          display: "flex",
          flexDirection: "column",
          gap: space.xl,
        }}
      >
        <div>
          <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.amber, letterSpacing: tracking.eyebrow, textTransform: "uppercase", marginBottom: space.sm }}>
            03:47 UTC — Thermal anomaly detected, Grid 4C, Altadena
          </div>
          <div style={{ fontFamily: font.sans, fontSize: typeStyle.heading.size, fontWeight: typeWeight.semibold, color: T.textPrimary, lineHeight: 1.4 }}>
            TALON is analyzing. You are the operator on duty.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: space.sm }}>
          {(["Intelligence", "Authority Packet", "Operations"] as const).map((phase, i) => (
            <div key={phase} style={{ display: "flex", alignItems: "center", gap: space.sm }}>
              <span style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textSecondary, letterSpacing: tracking.telemetry }}>{phase}</span>
              {i < 2 && <span style={{ color: T.textMuted, fontSize: typeScale.label }}>·</span>}
            </div>
          ))}
        </div>

        <div style={{ fontFamily: font.sans, fontSize: typeScale.title, color: T.textSecondary, lineHeight: 1.65 }}>
          Your role: authorize or override the critical calls.
        </div>

        <button
          type="button"
          onClick={onReady}
          style={{
            padding: `${space.md}px ${space["2xl"]}px`,
            borderRadius: radius.tile,
            background: T.cyan,
            border: "none",
            color: T.onAction,
            fontFamily: font.sans,
            fontSize: typeStyle.brand.size,
            fontWeight: typeWeight.semibold,
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          I&apos;m ready
        </button>
      </div>
    </div>
  );
}

export function ScenarioEndCard({ onExplore }: { onExplore: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: layer.entry,
        ...material.scrim,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 600ms ease",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: space.lg, maxWidth: 380, padding: `0 ${space["3xl"]}px`, textAlign: "center" }}>
        <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.textMuted, letterSpacing: tracking.eyebrow, textTransform: "uppercase" }}>
          INC-2024-0847 · Altadena Grid 4C
        </div>
        <div style={{ fontFamily: font.sans, fontSize: typeStyle.display.size, fontWeight: typeWeight.bold, color: T.teal, letterSpacing: tracking.tight }}>
          Situation handled.
        </div>
        <div style={{ fontFamily: font.sans, fontSize: typeStyle.brand.size, color: T.textSecondary, lineHeight: 1.7 }}>
          All assets recalled. Returning to passive monitoring.
        </div>
        <button
          type="button"
          onClick={onExplore}
          style={{
            marginTop: space.sm,
            padding: `${space.md}px ${space["2xl"]}px`,
            borderRadius: radius.tile,
            background: T.cyan,
            border: "none",
            color: T.onAction,
            fontFamily: font.sans,
            fontSize: typeStyle.brand.size,
            fontWeight: typeWeight.semibold,
            cursor: "pointer",
          }}
        >
          Explore the system freely
        </button>
      </div>
    </div>
  );
}

export function SituationResolved({
  elapsedMins,
  structuresProtected,
  operatorDecisions,
}: {
  elapsedMins: number;
  structuresProtected: number;
  operatorDecisions: number;
}) {
  const metrics = [
    { value: `${elapsedMins} min`, label: "Time to contain" },
    { value: String(structuresProtected), label: "Structures protected" },
    { value: String(Math.max(1, operatorDecisions)), label: "Operator decisions" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: layer.entry,
        background: T.bgBase,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 600ms ease",
      }}
    >
      <div style={{ fontFamily: font.mono, fontSize: typeScale.body, color: T.textMuted, letterSpacing: tracking.eyebrow, marginBottom: space.lg }}>INC-2024-0847</div>
      <div style={{ fontFamily: font.sans, fontSize: typeStyle.metric.size, fontWeight: typeWeight.bold, color: T.teal, letterSpacing: tracking.telemetry, marginBottom: space.xl }}>SITUATION RESOLVED</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: space["2xl"], marginBottom: space["3xl"] }}>
        {metrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              padding: `${space.xl}px ${space["2xl"]}px`,
              background: surface.inset,
              border: `1px solid ${border.subtle}`,
              borderRadius: radius.overlay,
              textAlign: "center",
              width: 140,
            }}
          >
            <div style={{ fontFamily: font.sans, fontSize: typeStyle.metric.size, color: T.textPrimary, marginBottom: space.xs }}>{metric.value}</div>
            <div style={{ fontFamily: font.mono, fontSize: typeScale.label, color: T.textMuted, textTransform: "uppercase" }}>{metric.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          maxWidth: 440,
          padding: `${space.lg}px ${space.xl}px`,
          background: tint(T.teal, 0.05),
          border: `1px solid ${tint(T.teal, 0.25)}`,
          borderRadius: radius.panel,
          display: "flex",
          gap: space.md,
          alignItems: "flex-start",
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: radius.pill, background: T.teal, marginTop: space.sm, flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: font.mono, fontSize: typeScale.metadata, color: T.teal, letterSpacing: tracking.eyebrow, textTransform: "uppercase", marginBottom: space.sm }}>TALON · Final Audit Log</div>
          <div style={{ fontFamily: font.sans, fontSize: typeScale.title, color: T.textSecondary, lineHeight: 1.6 }}>
            Incident closed. Supervised drone assets recalled. Ground team staging returned to nominal. The complete audit trail has been filed and preserved contextually. Returning system to passive monitoring.
          </div>
        </div>
      </div>
    </div>
  );
}
