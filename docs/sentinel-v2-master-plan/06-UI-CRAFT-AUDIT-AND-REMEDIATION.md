# FlytBase Sentinel V2: Master Blueprint Vault
## 06 — Visual UI Craft Audit & Precision Remediation

> **Document Status**: Canonical Craft & Design System Standard  
> **Repository Location**: `docs/sentinel-v2-master-plan/`  
> **Target Audience**: Design Directors, Design System Leads, Frontend Polish Engineers  

---

## 1. Executive Craft Assessment

To ensure Sentinel represents the top 1% of design craftsmanship, every micro-visual detail must withstand forensic inspection. 

While Sentinel's macro layout (dual rails, material elevation, locked 3-lead palette) is authoritative, a forensic static-code scan and 1:1 pixel inspection revealed several micro-execution defects that must be resolved prior to backend deployment.

---

## 2. Forensic Punchlist & Verified Defects

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FORENSIC CRAFT DEFECT MATRIX                                   │
├────┬───────────────────────────┬─────────────────────────────────┬───────────────────────────────┤
│ #  │ Defect Description        │ Code Location                   │ Severity & Visual Impact      │
├────┼───────────────────────────┼─────────────────────────────────┼───────────────────────────────┤
│ 1  │ Left-Rail Bottom Clip     │ `RailStack.tsx:218-264`         │ **HIGH VISUAL BREAK**: The    │
│    │                           │ `SentinelShell.tsx:983-1005`    │ bottom "Agent Relay" row is   │
│    │                           │ `LeftPanel.tsx:179-195`         │ sliced in half at 1080p.      │
├────┼───────────────────────────┼─────────────────────────────────┼───────────────────────────────┤
│ 2  │ Tabular Numerals (`tnum`) │ `Navbar.tsx:434`                │ **MEDIUM (MOTION JITTER)**:   │
│    │ Rollout Gap               │ `LeftPanel.tsx`, `PriorityPanel`│ Clock & ETAs lack tnum; glyphs│
│    │                           │                                 │ jitter 1–2px horizontally.    │
├────┼───────────────────────────┼─────────────────────────────────┼───────────────────────────────┤
│ 3  │ 4px Grid Violations       │ 28 sites (`SentinelShell.tsx`,  │ **MEDIUM (DESIGN DRIFT)**:    │
│    │ (`gap: 10` Persistence)   │ `ActionModal`, `ComponentsPage`)│ Off-grid gap causes uneven    │
│    │                           │                                 │ component breathing rhythm.   │
├────┼───────────────────────────┼─────────────────────────────────┼───────────────────────────────┤
│ 4  │ Blocked-Gate Pill Over-   │ `ActionBar.tsx:178`             │ **MEDIUM (DENSITY BLUR)**:    │
│    │ Density                   │ `ActionBar.tsx:741-755`         │ Blocked command wraps 3 lines │
│    │                           │                                 │ in a 56px touch target.       │
├────┼───────────────────────────┼─────────────────────────────────┼───────────────────────────────┤
│ 5  │ Verify-Feed Overlay Text  │ `SentinelShell.tsx:2372-2436`   │ **HIGH (LEGIBILITY CLASH)**:  │
│    │ Collision                 │                                 │ Cyan reticle text sits directly│
│    │                           │                                 │ on top of red `THERMAL_CORE`. │
├────┼───────────────────────────┼─────────────────────────────────┼───────────────────────────────┤
│ 6  │ Novel Tracking Values     │ `ActionModal.tsx:882` (0.4em)   │ **LOW (LINT WARNING)**:       │
│    │                           │ `DesignSystemPage.tsx:184`      │ Non-tokenized tracking values.│
├────┼───────────────────────────┼─────────────────────────────────┼───────────────────────────────┤
│ 7  │ Outdated Yellow Reference │ `DESIGN.md:108`                 │ **LOW (DOC CONTRADICTION)**:  │
│    │                           │                                 │ Yellow documented though dead.│
└────┴───────────────────────────┴─────────────────────────────────┴───────────────────────────────┘
```

---

## 3. Deep-Dive Remediation Engineering

### 3.1 Defect 1: Left-Rail Bottom Clip
- **Root Cause**: In `SentinelShell.tsx`, the rail container is bounded by `top: PANEL_TOP` (~60px) and `bottom: railBottomInset` (~104px), leaving ~916px of vertical height at 1080p. The combined height of `IntelPanel` (Hero Metric + Grid + Freshness + MiniTrend + Agent Relay) is ~950px. Because scrollbars are visually hidden, the bottom Agent Relay text ("running" / "complete") is clipped clean in half.
- **Remediation**:
  1. Add `paddingBottom: space.lg` to `RailStack.tsx` scroll container.
  2. In `LeftPanel.tsx`, clamp the `AgentRelayStrip` to display a maximum of 3 agents with a clean `+n more` disclosure toggle.
  3. Increase bottom fade gradient contrast so scrollable content is immediately obvious.

### 3.2 Defect 2: Tabular Numerals (`tnum`) Rollout
- **Root Cause**: `fontFeatureSettings: '"tnum"'` was implemented in `TalonCopilotPanel.tsx`, but omitted in `Navbar.tsx:434` (`OperatorClock`):
  ```tsx
  // BEFORE (Navbar.tsx:434):
  <span style={{ fontFamily: font.mono, fontSize: typeScale.title, fontWeight: typeWeight.bold, color: T.textPrimary, letterSpacing: "0.04em" }}>
    {timeString} UTC
  </span>
  ```
  Because digits `0` and `1` have different proportional widths in JetBrains Mono when `tnum` is absent, the clock and adjacent operator chip jump horizontally every single second.
- **Remediation**:
  ```tsx
  // AFTER:
  <span style={{ fontFamily: font.mono, fontSize: typeScale.title, fontWeight: typeWeight.bold, color: T.textPrimary, letterSpacing: "0.04em", fontFeatureSettings: '"tnum"' }}>
    {timeString} UTC
  </span>
  ```
  Apply `fontFeatureSettings: '"tnum"'` systematically across all ETA readouts, countdown badges, and timestamp columns.

### 3.3 Defect 3: Off-Grid `gap: 10` Cleanup
- **Root Cause**: 28 instances of `gap: 10` or `gap: "10px"` violate the 4px design grid (4, 8, 12, 16).
- **Remediation**:
  - Convert compact button clusters to `gap: space.sm` (8px).
  - Convert panel sections and card layouts to `gap: space.md` (12px).
  - Ensures 100% token purity and consistent visual rhythm across all screens.

### 3.4 Defect 4: Blocked-Gate Pill Truncation
- **Root Cause**: In `ActionBar.tsx`, disabled command subtitles wrap across multiple lines (`WebkitLineClamp: 2`), cramming 3 lines of dense text into a 56px pill.
- **Remediation**:
  ```tsx
  // Restrict to single line with clean ellipsis:
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  ```
  Display the complete explanatory blocker text (*"Blocked by source conflict. Verify burn permit before packet preparation."*) in the standard operational tooltip.

### 3.5 Defect 5: Verify-Feed Text-on-Polygon Collision
- **Root Cause**: In `SentinelShell.tsx:2372-2436`, both the SVG fire polygon (`THERMAL_CORE`) and the HUD caption (`◉ LIVE — Lidar-02 · Grid 4C`) are placed at `position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center"`. They render directly on top of each other.
- **Remediation**:
  - Offset the center HUD reticle and text cluster **40px downwards** (`transform: translateY(40px)`).
  - Reposition the floating `SCENES` chip 16px higher so it clears the thermal legend on the right edge of `drone-thermal-feed.png`.

---

## 4. Documentation & Design System Purging

1. **Purge Yellow in `DESIGN.md`**:
   - Line 108 of `DESIGN.md` still lists Yellow as a palette color.
   - Update `DESIGN.md` to document the locked 3-lead palette (`T.cyan`, `T.amber`, `T.red`, plus utility `T.teal`).
2. **Progressive `typeStyle` Adoption**:
   - Gradually migrate files from raw `fontSize: typeScale.body` to full `typeStyle.body` recipes (bundling size, line-height, weight, and tracking).
