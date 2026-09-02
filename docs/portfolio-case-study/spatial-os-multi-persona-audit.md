# Spatial OS — Multi-persona audit vs prior map visual audit

**Branch:** `feat/map-spatial-os`  
**Compared to:** prior canvas `sentinel-map-visual-audit` (legacy MapCanvas dialect)  
**Live canvases:** `sentinel-spatial-os-audit-vs-prior` · `sentinel-portfolio-prototype-test`

## Post-uplift scores (A–F)

**Portfolio gate: SHIP** · `verify:routes` 0 failures · `verify:flows` 18/18 · `verify:design` green  
Details: `spatial-os-score-uplift-status.md`

| Persona | Before | After | Why |
|---------|--------|-------|-----|
| Visual craft | 6.5 | **8.5** | UNVERIFIED copy back; route glow gone; one MapLabel recipe; token colors |
| Product / ops | 6 | **8.5** | Auto evidence envelope; legend truth; single NAMED/EGRESS route authority |
| Engineering | 7 | **8.5** | Mid-flight transit fix; typed shell updates; verify:map in design; smoke expanded |
| Product designer | 7 | **8.5** | Label clamp; pre-incident forest policy; declutter; corridor tint; drag-to-assign |
| Recruiter (5–8m) | 8 | **9** | `?core=1` share path; guided failure beat; fresh stills; honest claims |

## Headline (pre-uplift audit)

Architecture improved for real (MapFrame + roads + pathfollow). Prior critical craft issues on markers/zones are mostly cleared. **P0 craft is incomplete** (route glow, empty UNVERIFIED badge). **Product thesis signal regressed** (automatic evidence-uncertainty envelope dropped from the map). Recruiter still **shortlists (8/10)**; portfolio stills are **HOLD**.

## Persona scores (pre-uplift)

| Persona | Score | Verdict |
|---------|-------|---------|
| Visual craft | 6.5/10 | Mixed — P0 incomplete |
| Product / ops | 6/10 | Coords real; trust signal lost |
| Engineering | 7/10 | Solid spine; major latent bugs |
| Product designer | 7/10 | Not theater; not screenshot-ready |
| Recruiter (5–8m) | 8/10 | PASS / shortlist |

## Delta vs prior visual audit

| Theme | Prior | Now | Delta |
|-------|-------|-----|-------|
| Glow-as-presence | Critical everywhere | Markers clean; RouteLine glow remains | Partial |
| Label recipes | 4 heights / 10.5px | ~20–22 metadata; RouteLine own chip | Mostly fixed |
| Drone vs team | Two craft languages | Shared rings; no unit glow | P1 largely met |
| Anomaly | 5-layer bloom | Slimmer; **empty UNVERIFIED rect** | Slim + regression |
| Zone strokes | Unordered | Locked forest/buffer/residential ladder | P2 met in code |
| Spatial authority | Figma soup | MapFrame + Dijkstra | New win |
| Evidence envelope | Auto from exceptions | Manual zoneMargins only | **Regression** |

## Cross-cutting P0s

1. Restore UNVERIFIED text (or delete empty rect) — `ZoneLayer.tsx`
2. Re-wire automatic evidence envelope from `operationalException.spatialUncertainty`
3. Kill `RouteLine` `route-glow`; fold route chip into `MapLabel`
4. Regenerate `verification-artifacts/` against `SpatialMapCanvas` (current PNGs are stale)

## Agents

- Visual: [Visual craft audit](90b6853b-53f5-4b4b-9ad6-29b02d58f73e)
- Product: [Product ops audit](c8e211d1-2ff6-47f9-8a85-eaebb403e275)
- Eng: [Engineering quality audit](6919fe36-b151-4ef0-b46e-7cd61f2ff3f3)
- Designer: [Designer persona audit](4a99a9f4-7f67-4e27-8e94-6bff559f6e5f)
- Recruiter: [Recruiter prototype test](4157dc68-c707-4a02-a608-1bce356af8f9)
