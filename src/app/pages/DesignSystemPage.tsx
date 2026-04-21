import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  ACTIONBAR_H,
  ACTIONBAR_H_EXPANDED,
  DISABLED_OPACITY,
  GLASS,
  GLASS_SUBTLE,
  GI,
  MODE_META,
  PANEL_TITLES,
  T,
  font,
} from "../tokens";

const FRAME = {
  canvasW: 1440,
  canvasH: 900,
  navbarH: 52,
  leftRailW: 300,
  rightRailW: 300,
  tileW: 152,
  tileH: 68,
  tileGap: 12,
};

const colorTokens = [
  { name: "bgBase", value: T.bgBase, usage: "Root canvas background and documentation surfaces." },
  { name: "bgPanel", value: T.bgPanel, usage: "Panel bodies, cards, and secondary containers." },
  { name: "bgRaised", value: T.bgRaised, usage: "Elevated states and active surfaces." },
  { name: "bgMap", value: T.bgMap, usage: "Map canvas and top navigation strip." },
  { name: "cyan", value: T.cyan, usage: "System intelligence, TALON recommendations, live feeds." },
  { name: "amber", value: T.amber, usage: "Verification, caution, and escalating review." },
  { name: "red", value: T.red, usage: "Containment, danger, abort, and blocked authority." },
  { name: "fire", value: T.fire, usage: "Rescue, evacuation, and high-consequence actions." },
  { name: "teal", value: T.teal, usage: "Monitoring, safe states, and completed actions." },
  { name: "yellow", value: T.yellow, usage: "Ground-team guidance and field coordination." },
  { name: "textPrimary", value: T.textPrimary, usage: "Headlines, active labels, and selected values." },
  { name: "textSecondary", value: T.textSecondary, usage: "Body copy, descriptions, and helper text." },
  { name: "textMuted", value: T.textMuted, usage: "Telemetry labels, timestamps, and quiet metadata." },
];

const typeScale = [
  { label: "Display / page header", spec: "Inter 700 / 32", sample: "Sentinel Operator Shell 2.0" },
  { label: "Section title", spec: "Inter 700 / 20", sample: "Action System" },
  { label: "Panel title", spec: "Inter 600 / 13", sample: "Tactical Intelligence" },
  { label: "Body copy", spec: "Inter 400 / 12", sample: "Recommendations explain why the system is surfacing this action." },
  { label: "Action tile label", spec: "Inter 700 / 11 / uppercase", sample: "AUTHORIZE" },
  { label: "Telemetry label", spec: "JetBrains Mono 9-10 / uppercase", sample: "03:49:18 UTC" },
  { label: "Metric value", spec: "JetBrains Mono 11", sample: "91%  98%  ETA 00:43" },
];

const operationalSemantics = [
  { label: MODE_META.scan.label, color: MODE_META.scan.color, body: MODE_META.scan.statusText },
  { label: MODE_META.verify.label, color: MODE_META.verify.color, body: MODE_META.verify.statusText },
  { label: MODE_META.contain.label, color: MODE_META.contain.color, body: MODE_META.contain.statusText },
  { label: MODE_META.rescue.label, color: MODE_META.rescue.color, body: MODE_META.rescue.statusText },
];

const actionPhases = [
  {
    phase: "Alert interrupt",
    tone: T.amber,
    note: "Command interrupt over baseline. This is not yet a full scene takeover.",
    actions: ["Dispatch Lidar-02", "Dismiss"],
  },
  {
    phase: "Verify",
    tone: T.amber,
    note: "Assessment language is explicit and operator-owned.",
    actions: ["Open verification", "Hold in background", "Confirm active incident", "Monitor only"],
  },
  {
    phase: "Contain",
    tone: T.red,
    note: "Five primary staging actions plus three secondary actions in a split action bar.",
    actions: ["Deploy survey", "Stage perimeter", "Guide responders", "Prepare evacuation", "Relay field intel", "Notify auth.", "Notify teams", "Authorize"],
  },
  {
    phase: "Rescue",
    tone: T.fire,
    note: "Two rescue routes, optional backup under signal degradation, and explicit shutdown control.",
    actions: ["Emergency evacuate", "Residential evac drone", "Guide personnel", "Deploy backup", "Abort mission", "Stand down"],
  },
];

const caseStudyEssentials = [
  {
    title: "Phase color ladder",
    body: "Monitoring uses teal, verification uses amber, containment uses red, and rescue uses fire. The color shift is the urgency model.",
    caption: "Use this to explain escalation without describing every component.",
  },
  {
    title: "Operator shell frame",
    body: "One top telemetry strip, two information rails, one spatial canvas, and one full-width action bar.",
    caption: "This is the architecture diagram worth placing in the case study body.",
  },
  {
    title: "Authorization pattern",
    body: "The system recommends and stages. The human explicitly authorizes. High-consequence execution uses a 2-second hold, not an accidental click.",
    caption: "This is the cleanest expression of human-AI responsibility sharing.",
  },
  {
    title: "Trust markers",
    body: "System intelligence stays cyan, telemetry is monospaced, and actions stay auditable instead of magical.",
    caption: "Use this when explaining why Sentinel feels reliable under pressure.",
  },
  {
    title: "Failure behavior",
    body: "Failures downgrade states and surface exceptions; they should not hijack the operator with noisy modal blocks.",
    caption: "This keeps the case study grounded in real operations instead of ideal-path mockups.",
  },
  {
    title: "Core component subset",
    body: "Only show action tiles, status pills, confidence state, modal glass, and the shell layout. The rest can stay in appendix material.",
    caption: "This is the minimal set worth inserting as a design-system figure.",
  },
];

export default function DesignSystemPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: T.bgBase,
        minHeight: "100vh",
        color: T.textPrimary,
        fontFamily: font.sans,
        paddingBottom: 64,
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${T.bgBase}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 999px; }
      `}</style>

      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          height: 52,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 32px",
          background: "rgba(6,10,18,0.92)",
          backdropFilter: "blur(14px)",
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={topButtonStyle}
        >
          Back to App
        </button>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>
            FlytBase <span style={{ color: T.cyan }}>Sentinel</span>
          </span>
          <span style={{ ...badgeStyle, color: T.cyan, borderColor: "rgba(0,200,255,0.28)" }}>
            Design System 2.0
          </span>
        </div>
        <div style={{ marginLeft: "auto", fontFamily: font.mono, fontSize: 10, color: T.textMuted }}>
          Current live token reference
        </div>
      </div>

      <div style={{ width: 1320, maxWidth: "calc(100vw - 48px)", margin: "0 auto", paddingTop: 32 }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ ...badgeStyle, display: "inline-flex", color: T.amber, borderColor: "rgba(245,166,35,0.24)", marginBottom: 12 }}>
            Synced to current operator shell
          </div>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            Design System 2.0
          </h1>
          <p style={{ margin: "14px 0 0", maxWidth: 840, fontSize: 14, lineHeight: 1.65, color: T.textSecondary }}>
            This page replaces the older concept-sheet reference. It documents the current token set, current shell layout,
            current action language, and the minimal subset worth carrying into the case study.
          </p>
        </div>

        <Section title="Section 1 - Core Tokens" description="Current visual primitives used by the live shell. These import from the actual token source instead of hardcoded legacy values.">
          <div style={grid3Style}>
            {colorTokens.map((token) => (
              <TokenCard key={token.name} name={token.name} value={token.value} usage={token.usage} />
            ))}
          </div>
        </Section>

        <Section title="Section 2 - Type and Operational Semantics" description="Typography stays restrained. Meaning comes from color, language, spacing, and explicit state labels.">
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 20 }}>
            <Card>
              <div style={sectionEyebrowStyle}>Typography scale</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {typeScale.map((row) => (
                  <div key={row.label} style={{ display: "flex", gap: 18, paddingBottom: 12, borderBottom: `1px solid ${GI.borderDim}` }}>
                    <div style={{ width: 220, flexShrink: 0, fontFamily: font.mono, fontSize: 10, color: T.textMuted }}>
                      {row.label}
                      <div style={{ marginTop: 4 }}>{row.spec}</div>
                    </div>
                    <div style={{ fontSize: row.label === "Display / page header" ? 24 : row.label === "Section title" ? 20 : row.label === "Panel title" ? 13 : row.label === "Body copy" ? 12 : row.label === "Action tile label" ? 11 : row.label === "Telemetry label" ? 10 : 11, fontFamily: row.label.includes("Telemetry") || row.label.includes("Metric") ? font.mono : font.sans, fontWeight: row.label === "Body copy" ? 400 : row.label.includes("Metric") || row.label.includes("Telemetry") ? 400 : 700, letterSpacing: row.label === "Action tile label" ? "0.06em" : undefined, textTransform: row.label === "Action tile label" ? "uppercase" : undefined }}>
                      {row.sample}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div style={sectionEyebrowStyle}>Operational mode semantics</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {operationalSemantics.map((item) => (
                  <div key={item.label} style={{ padding: 14, borderRadius: 14, border: `1px solid ${item.color}33`, background: `${item.color}12` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, display: "inline-block" }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.label}</span>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.55, color: T.textSecondary }}>{item.body}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Section>

        <Section title="Section 3 - Shell Layout" description="Current operator shell geometry and panel vocabulary. This reflects the live frame, not the older 44px / 316px concept sheet.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 0.9fr", gap: 20 }}>
            <Card>
              <div style={sectionEyebrowStyle}>Frame preview</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <ShellPreview expanded={false} />
                <ShellPreview expanded />
              </div>
            </Card>

            <Card>
              <div style={sectionEyebrowStyle}>Current dimensions</div>
              <SpecRow label="Canvas" value={`${FRAME.canvasW} x ${FRAME.canvasH}`} note="Reference frame used for documentation and case study figures." />
              <SpecRow label="Navbar" value={`${FRAME.navbarH}px`} note="Telemetry strip with brand, system status, controls, UTC, and operator." />
              <SpecRow label="Left rail" value={`${FRAME.leftRailW}px`} note={PANEL_TITLES.contain.left} />
              <SpecRow label="Right rail" value={`${FRAME.rightRailW}px`} note={PANEL_TITLES.rescue.priority} />
              <SpecRow label="Action bar" value={`${ACTIONBAR_H}px collapsed / ${ACTIONBAR_H_EXPANDED}px expanded`} note="Split-row action surface for contain and selected rescue states." />
              <SpecRow label="Action tile" value={`${FRAME.tileW} x ${FRAME.tileH}`} note={`Gap ${FRAME.tileGap}px between tiles`} />
            </Card>
          </div>
        </Section>

        <Section title="Section 4 - Action Language 2.0" description="Current action labels, grouped by phase. These are the labels the live product uses today.">
          <div style={grid2Style}>
            {actionPhases.map((phase) => (
              <Card key={phase.phase}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: phase.tone, display: "inline-block" }} />
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{phase.phase}</div>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: T.textSecondary, marginBottom: 14 }}>{phase.note}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {phase.actions.map((action) => (
                    <span key={action} style={{ ...actionPillStyle, borderColor: `${phase.tone}33`, color: phase.tone, background: `${phase.tone}14` }}>
                      {action}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
            <MiniRule title="Hold to authorize" body="High-consequence authorization remains a 2-second hold instead of a plain click." />
            <MiniRule title="Disabled state" body={`Locked actions drop to ${Math.round(DISABLED_OPACITY * 100)}% opacity with reduced contrast.`} />
            <MiniRule title="Split action bar" body="Containment exposes primary and secondary rows instead of forcing everything into one dense strip." />
            <MiniRule title="Copy style" body="Labels stay short, operational, and verb-first. System recommendations explain why in nearby body copy." />
          </div>
        </Section>

        <Section title="Section 5 - Surface Recipes" description="The live interface depends more on material consistency than decorative variety.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
            <SurfaceCard title="GLASS" description="Primary panel and action-bar surface. Deep transparent blue with heavy blur and a lifted shadow." style={GLASS} />
            <SurfaceCard
              title="Modal glass"
              description="High-focus surface for confirmation and mission-brief overlays."
              style={{
                background: "rgba(8, 16, 28, 0.96)",
                backdropFilter: "blur(32px) saturate(1.4)",
                WebkitBackdropFilter: "blur(32px) saturate(1.4)",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.65)",
              }}
            />
            <SurfaceCard title="GLASS_SUBTLE" description="Inner card surface for dense readouts and small status modules." style={GLASS_SUBTLE} />
            <SurfaceCard
              title="Disabled"
              description="Applied to unavailable actions. Contrast and opacity drop before any extra ornament is added."
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${GI.borderDim}`,
                borderRadius: 20,
                opacity: DISABLED_OPACITY,
              }}
            />
          </div>
        </Section>

        <Section title="Section 6 - Case Study Essentials" description="This is the compact subset worth carrying into the case study. It is intentionally smaller than the full reference.">
          <Card>
            <div style={sectionEyebrowStyle}>Only the required design-system material</div>
            <div style={grid3Style}>
              {caseStudyEssentials.map((item) => (
                <div key={item.title} style={{ padding: 16, borderRadius: 16, border: `1px solid ${GI.border}`, background: GI.surface }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{item.title}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6, color: T.textSecondary }}>{item.body}</div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${GI.borderDim}`, fontFamily: font.mono, fontSize: 10, lineHeight: 1.55, color: T.textMuted }}>
                    Case study note: {item.caption}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: `1px solid ${GI.border}` }}>
          <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.06em", color: T.textMuted }}>
            FlytBase Sentinel - Design System 2.0 - Current build reference - Case study essentials included
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: T.textMuted }}>
          {title}
        </div>
        <p style={{ margin: "8px 0 0", maxWidth: 820, fontSize: 13, lineHeight: 1.65, color: T.textSecondary }}>
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 20,
        border: `1px solid ${GI.border}`,
        background: "rgba(255,255,255,0.03)",
        boxShadow: GI.glow,
      }}
    >
      {children}
    </div>
  );
}

function TokenCard({ name, value, usage }: { name: string; value: string; usage: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 16, border: `1px solid ${GI.border}`, background: GI.surface }}>
      <div style={{ height: 42, borderRadius: 10, background: value, border: `1px solid ${GI.borderDim}`, marginBottom: 12 }} />
      <div style={{ fontSize: 12, fontWeight: 700 }}>{name}</div>
      <div style={{ marginTop: 4, fontFamily: font.mono, fontSize: 10, color: T.textMuted }}>{value}</div>
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.55, color: T.textSecondary }}>{usage}</div>
    </div>
  );
}

function SurfaceCard({ title, description, style }: { title: string; description: string; style: CSSProperties }) {
  return (
    <div style={{ padding: 16, borderRadius: 20, border: `1px solid ${GI.border}`, background: "rgba(255,255,255,0.03)" }}>
      <div style={{ ...style, height: 92, marginBottom: 12 }} />
      <div style={{ fontSize: 12, fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.55, color: T.textSecondary }}>{description}</div>
    </div>
  );
}

function MiniRule({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 14, border: `1px solid ${GI.border}`, background: GI.surface }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 11, lineHeight: 1.55, color: T.textSecondary }}>{body}</div>
    </div>
  );
}

function SpecRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 180px 1fr", gap: 14, padding: "12px 0", borderBottom: `1px solid ${GI.borderDim}` }}>
      <div style={{ fontFamily: font.mono, fontSize: 10, color: T.textMuted }}>{label}</div>
      <div style={{ fontFamily: font.mono, fontSize: 11, color: T.textPrimary }}>{value}</div>
      <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.55 }}>{note}</div>
    </div>
  );
}

function ShellPreview({ expanded }: { expanded: boolean }) {
  const actionBarHeight = expanded ? ACTIONBAR_H_EXPANDED : ACTIONBAR_H;
  const previewWidth = 560;
  const scale = previewWidth / FRAME.canvasW;
  const previewHeight = Math.round(FRAME.canvasH * scale);
  const leftW = Math.round(FRAME.leftRailW * scale);
  const rightW = Math.round(FRAME.rightRailW * scale);
  const navH = Math.round(FRAME.navbarH * scale);
  const barH = Math.round(actionBarHeight * scale);

  return (
    <div>
      <div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{expanded ? "Expanded action bar" : "Collapsed action bar"}</div>
        <span style={{ ...badgeStyle, color: expanded ? T.red : T.cyan, borderColor: expanded ? `${T.red}33` : `${T.cyan}33` }}>
          {expanded ? `${ACTIONBAR_H_EXPANDED}px` : `${ACTIONBAR_H}px`}
        </span>
      </div>
      <div style={{ height: previewHeight, borderRadius: 16, overflow: "hidden", border: `1px solid ${T.border}`, background: T.bgMap }}>
        <div style={{ height: navH, borderBottom: `1px solid ${T.border}`, background: T.bgMap, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px" }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: T.cyan }}>Sentinel</span>
          <span style={{ fontSize: 8, color: T.textMuted, fontFamily: font.mono }}>Monitoring</span>
        </div>
        <div style={{ display: "flex", height: previewHeight - navH - barH }}>
          <PreviewRail width={leftW} title="Left rail" subtitle={PANEL_TITLES.contain.left} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted, fontFamily: font.mono, fontSize: 9 }}>
            Map canvas
          </div>
          <PreviewRail width={rightW} title="Right rail" subtitle={PANEL_TITLES.rescue.priority} />
        </div>
        <div style={{ height: barH, borderTop: `1px solid ${T.border}`, background: T.bgPanel, padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: expanded ? 8 : 0 }}>
          <PreviewTileRow color={T.cyan} />
          {expanded ? <PreviewTileRow color={T.red} secondary /> : null}
        </div>
      </div>
    </div>
  );
}

function PreviewRail({ width, title, subtitle }: { width: number; title: string; subtitle: string }) {
  return (
    <div style={{ width, flexShrink: 0, borderRight: `1px solid ${T.border}`, borderLeft: `1px solid ${T.border}`, background: T.bgPanel, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
      <div style={{ fontFamily: font.mono, fontSize: 8, color: T.textMuted }}>{title}</div>
      <div style={{ fontSize: 9, fontWeight: 600 }}>{subtitle}</div>
    </div>
  );
}

function PreviewTileRow({ color, secondary = false }: { color: string; secondary?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: secondary ? 3 : 5 }).map((_, index) => (
        <div
          key={`${secondary ? "secondary" : "primary"}-${index}`}
          style={{
            width: secondary ? 72 : 80,
            height: 22,
            borderRadius: 8,
            border: `1px solid ${color}44`,
            background: `${color}14`,
          }}
        />
      ))}
    </div>
  );
}

const topButtonStyle: CSSProperties = {
  borderRadius: 10,
  border: "1px solid rgba(0,200,255,0.24)",
  background: "rgba(0,200,255,0.1)",
  color: T.cyan,
  padding: "8px 12px",
  fontFamily: font.sans,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid",
  fontFamily: font.mono,
  fontSize: 10,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const sectionEyebrowStyle: CSSProperties = {
  fontFamily: font.mono,
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: T.textMuted,
  marginBottom: 14,
};

const actionPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 10px",
  borderRadius: 999,
  border: "1px solid",
  fontSize: 11,
  fontWeight: 700,
};

const grid2Style: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
};

const grid3Style: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
};
