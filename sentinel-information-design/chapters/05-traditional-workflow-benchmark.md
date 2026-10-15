# 05 · Traditional Workflow Benchmark — Where the 48 Minutes Goes

**Study:** FlytBase Sentinel — operator-interface information design · **Doc type:** synthesis chapter (built entirely from R1 desk research; no new research) · **Compiled:** 2026-09-22
**KPI anchor (given, not re-derived):** traditional first-signal → effective response ≈ **48 min**; Sentinel target ≈ **90 s** (AI detection → validated alert → drone tasking decision) [challenge brief; repo `FlytBase_Sentinel_Project_Brief_Con.txt` §1]. `PRODUCT.md` states it plainly: "48-minute baseline and 90-second target come from the challenge brief, not a field study."

### Honesty note — read before using any number below

> **The 48-minute end-to-end decomposition is a constructed allocation calibrated to the challenge-brief anchor, not a measurement.** No public dataset decomposes an end-to-end "detection → effective response" 48-min figure for wildland fire [R1 §e1]. Segment low/high ranges in table (b) were built so the midpoint ≈ 48 min; the NFPA 1710 numbers used as anchors (64–90 s alarm processing, 80 s turnout, 240 s travel) are **structural-fire, career-department, 90th-percentile urban floors** — wildland interagency dispatch and rural travel run longer [R1 §e4]. Only the structural-dispatch steps and satellite latencies have real sourced anchors; detection-latency distribution, size-up duration (5–15 min), and night/terrain penalties are judgment [R1 §e2, §e3, §e5]. Treat segment shares as design heuristics, not measurements.
>
> **Scope note (counterweight):** Huang et al. 2024 estimates a 1-hour reporting-delay reduction yields only ≈ **0.25 % suppression-cost savings** across all fires [R1 source 25: https://pmc.ncbi.nlm.nih.gov/]. Sentinel's claim therefore targets **time-to-decision on the fast-growing-ignition tail** — where initial-attack success collapses with response time [R1 sources 23, 24: https://connectsci.au/, https://pubmed.ncbi.nlm.nih.gov/; IA success 83–99% https://www.mdpi.com/] — **not** average total suppression cost, and not 90-second water-on-fire [R1 §e6]. Any KPI narrative must not imply otherwise.

---

## (a) Step-by-step flow — first signal to first effective action

| # | Step | Actor | Data used (format) | Typical time | Source / basis |
|---|------|-------|--------------------|--------------|----------------|
| 1 | Ignition occurs | Environment | — | — | — |
| 2a | Detection — fire lookout tower | Human lookout (increasingly scarce) | Naked-eye/binocular smoke; fire-finder bearing; phone/radio | ESTIMATE 5–45 min after smoke visible; ~0 detection at night | Lookouts "detect the fires quicker than the satellites and catch them when they're small" — NYT 2023: https://www.nytimes.com/2023/09/14/us/america-fire-spotters-lookouts.html ; reporting via telephone/radio — Wikipedia: https://en.wikipedia.org/wiki/Fire_lookout_tower ; fire-finder procedure — https://npshistory.com/publications/fire-lookouts-handbook.pdf |
| 2b | Detection — 911 / civilian report | Public | Verbal location over phone (unstandardized) | ESTIMATE — "typically reported within 15 min" is optimistic perception | Govil et al. 2020: https://www.mdpi.com/2072-4292/12/10/1575 [R1] |
| 2c | Detection — satellite hotspots (MODIS/VIIRS) | Space segment + processing chain | Thermal anomaly pixels (375 m VIIRS / 1 km MODIS); per-pass snapshot | VIIRS NIFC feed ~3¼ h after sensor detection; best-case orbit+downlink+process ~90 min; MODIS ~2-day processing; revisit/processing delays (figures map to sources in order) | https://data-nifc.opendata.arcgis.com/ ; https://www.xprize.org/ ; https://offnadir-delta.com/ ; https://pmc.ncbi.nlm.nih.gov/ , https://www.exci.ai/ [R1] |
| 2d | Detection — aerial patrol | Contract/agency aircraft | Visual smoke recon; radio smoke report | Cadence-bound (scheduled flights); variance across 1,476 fires | Magstadt 2026: https://research.fs.usda.gov/ , https://www.sciencedirect.com/ [R1] |
| 2e | Detection — fixed camera network (ALERTWildfire/ALERTCalifornia) | Camera operator / monitoring center | Panoramic imagery; 2-min pan cycle, AI-scanned in AI-augmented deployments | Pan cycle 2 min | https://ohaz.uoregon.edu/ ; AI confirmation beats 911 — https://distribution.epri.com/ ; CAL FIRE+ALERTCalifornia+DigitalPath — https://firesafemarin.org/ ; 1,050+ cameras — https://time.com/ [R1] |
| 3 | Verified report reaching dispatch | Lookout / caller / operator | Radio/phone call; verbal lat/long or landmark; second-source cross-check (triangulation, camera pan, aircraft) | ESTIMATE 2–10 min incl. call handling | Dispatch begins on first report — https://www.fs.usda.gov/ ; call processing 64–90 s benchmark (NFPA 1710) — https://www.iaff.org/ [R1] |
| 4 | Dispatch: CAD entry + resource assignment | Interagency dispatch center (WildCAD etc.) | CAD incident record; status boards; radio tone-out | ESTIMATE 1–5 min; structural benchmark: answering ≤15 s, processing 64–90 s | https://gacc.nifc.gov/ ; https://www.forestsandrangelands.gov/ ; https://www.iaff.org/ ; https://fems.dc.gov/ [R1] |
| 5 | Crew assembly / turnout | Initial-attack crew | PPE, apparatus, radio briefing | ESTIMATE 1–5 min wildland (urban benchmark 80 s turnout) | https://www.iaff.org/ ; https://www.emergent.tech/ [R1] |
| 6 | Travel to scene | Engines / handcrew / dozer | Paper maps, GPS, radio updates; road network | ESTIMATE 10–30+ min rural/remote; urban benchmark 240 s | https://www.mtas.tennessee.edu/ ; terrain/road-access reality — https://www.commercialuavnews.com/ ; https://www.sciencedirect.com/ [R1] |
| 7 | On-scene size-up before effective action | First-arriving IC | Visual recon; radio reports; paper topographic maps; weather obs; IRPG Look→Evaluate→Decide | ESTIMATE 5–15 min (no published single figure) | NWCG sizeup/safety — http://www.nwcg.gov/ ; Incident Management Field Guide — https://gacc.nifc.gov/ ; size-up factors — https://www.coloradofirecamp.com/ [R1] |
| 8 | First effective action (water/tool on fire, or tasking of air) | Crew | — | = end of measured window | — [R1] |

**Failure modes of the traditional chain [R1]:** night blindness (lookouts, visual recon), smoke occlusion & terrain masking, unverified/inaccurate civilian location reports, satellite revisit gaps & small-fire misses, de-staffed lookouts (California's tower network shrank from 77+ — https://wildfiretoday.com/ , https://www.latimes.com/ ; night/terrain context — https://wfca.com/ ).

## (b) The 48-minute allocation (low / high ranges, midpoint ≈ 48)

**ESTIMATE allocation, anchored to cited benchmarks; constructed to match the given KPI anchor** (see honesty note).

| Segment | Low (min) | High (min) | Mid (min) | Anchoring |
|---|---|---|---|---|
| 1. Detection latency (ignition → something sees it) | 5 | 25 | 12 | Camera pan cycle 2 min (https://ohaz.uoregon.edu/) is the machine-vision floor; 911 "~15 min" perception (Govil 2020, https://www.mdpi.com/2072-4292/12/10/1575) is the typical case; lookouts 5–45 min (NYT 2023). *Satellite-only scenarios (1–4 h+) already blow past 48 min and are excluded as atypical.* |
| 2. Verify + report to dispatch | 2 | 10 | 5 | Lookout/camera cross-confirmation; call processing 64–90 s structural benchmark (https://www.iaff.org/) |
| 3. Dispatch processing + assignment (CAD) | 1 | 5 | 3 | NFPA 1710 alarm processing 64–90 s; wildland interagency CAD adds overhead (https://www.forestsandrangelands.gov/) |
| 4. Crew turnout / assembly | 1 | 5 | 3 | NFPA 80 s fire turnout (https://www.iaff.org/); wildland crews slower (ESTIMATE) |
| 5. Travel to scene | 10 | 30 | 18 | Urban floor 240 s (https://www.mtas.tennessee.edu/); rural reality: distance/terrain/road access (https://www.commercialuavnews.com/) |
| 6. On-scene size-up → effective action | 5 | 15 | 7 | IRPG/NWCG size-up + IC initial report practice (http://www.nwcg.gov/, https://gacc.nifc.gov/); duration ESTIMATE |
| **Total** | **24** | **90** | **≈48** | Matches given anchor |

Reading: favorable case (staffed lookout, quick 911, close station) ≈ 25 min; remote/night/satellite-only > 90 min. The 48-min anchor sits in the plausible middle for a rural-but-instrumented district [R1].

## (c) Compression map — traditional step → Sentinel/TALON capability → compressed time

| Traditional step | Traditional data (format, latency) | Sentinel/TALON data that compresses it | Realistic compressed time | Notes |
|---|---|---|---|---|
| Detection latency (2a–2e) | Eyes/towers/911 (verbal, 5–45 min); satellite thermal (1–4 h, 375 m–1 km grid); camera pans (2-min cadence) | Persistent thermal+EO video from drone/dock patrol; onboard AI smoke/heat detection; continuous revisit | ~1–5 s machine latency; effectively detection-bound by smoke-signature appearance, not channel cadence (ESTIMATE) | Mirrors ALERTWest 2-min scan logic at drone altitude & revisit rate |
| Verify + report (3) | Second-source confirmation via radio/phone (2–10 min) | AI classification + single live georeferenced video feed the operator validates in-window | ~10–30 s | Removes triangulation & caller ambiguity |
| Dispatch/assignment (4) | CAD entry, radio tone-out (1–5 min) | Alert auto-carries GPS coordinates; drone tasking is a UI decision on the same feed (TALON-style docking) | ~10–30 s | The 90-s KPI covers detection→validated alert→tasking decision only |
| Crew turnout + travel (5–6) | Physical movement (11–35 min) | **Not compressible** by information systems | unchanged | Honest boundary: Sentinel moves *information*, not apparatus; value = crews launch toward a verified, mapped target |
| On-scene size-up (7) | Visual recon + paper maps + radio (5–15 min; fails at night/in terrain) | Aerial thermal/4K orthomosaic, live fire-edge overlay, GPS perimeter, hotspot list, wind/terrain read from above — available **before** crews arrive | 5–15 min → ~0–2 min at decision point (ESTIMATE) | Drone-on-scene feeds substitute the IC's walk-in recon; thermal defeats night/smoke |
| First effective action (8) | — | Crews arrive with pre-built tactical picture; attack line chosen pre-arrival | Net effect: "effective response" clock can start at drone-arrival, not crew-arrival | Where part of the 48→90-s gap is *narratively* honest vs. *physically* honest (see R1 §e6) |

## (d) Side-by-side — traditional chain vs Sentinel 90-second arc

The Sentinel arc [repo brief §4]: **0–15 s** sensor fusion before interrupt (thermal spike 03:47:03 → alert threshold crossed 03:47:18 → nearest drone launches autonomously) → **15–45 s** single-question VERIFY → **45–75 s** CONTAIN authorize (press-and-hold) → **75–90 s** RESCUE exception-only supervision. The compression is not "humans removed" — it is humans repositioned at exactly three gates.

| Traditional chain (≈48 min mid) | Sentinel 90-second arc | Human gate |
|---|---|---|
| Detection: lookout/911/satellite/camera — 5–45 min verbal or snapshot latency (rows 2a–2e) | 0–15 s: thermal+EO frames fused silently; AI smoke/heat detection on dock-scout patrol; nearest drone already launching at threshold [repo][R1][R2] | *(none — TALON fuses before interrupt)* |
| Verify + report: second-source triangulation by radio/phone — 2–10 min (row 3) | 15–45 s: single-question VERIFY on one georeferenced feed — anomaly location, corroborating sources, drone ETA, rising confidence bar; evidence card, confirm/dismiss [repo][R4] | **Gate 1 — VERIFY:** operator confirms the AI's read (confirm-incident) [repo] |
| Dispatch: CAD entry + radio tone-out — 1–5 min (row 4) | 45–75 s: alert already carries GPS; drone tasking = UI decision; authority packet drafted (Grade-1/2/3 → CAL_FIRE_NORTH / USFS_REGION_5 / COUNTY_OES); strategy proposals (ridge-anchor / creek-buffer / defensive-holding) staged [repo][R1] | **Gate 2 — AUTHORIZE:** press-and-hold containment authorization; notify-authorities; TALON proposals never self-execute (gated actions only) [repo] |
| Turnout + travel: physical movement — 11–35 min, **not compressible** (rows 5–6) | Launch overlaps VERIFY (dock airborne 45–60 s [R2·S7][R2·S8]); crews dispatch toward a verified, mapped target with ETA countdowns — information advantage, not teleportation [R1][R4] | *(none — physical world unchanged)* |
| On-scene size-up: IC walk-in recon + paper maps — 5–15 min, fails at night/smoke (row 7) | Aerial thermal/LiDAR read, spread rings 15/30/60 min, wind, structures-at-risk 47, evacuation corridors — before crews arrive [repo][R1] | *(folded into Gate 2 evidence)* |
| First effective action: clock ends at crew arrival (row 8) | 75–90 s: RESCUE supervision — ghost→active drone handoff, ingress routing, cleared structures; exception-only interrupts [repo] | **Gate 3 — SUPERVISE:** operator monitors by exception; overrides captured as dissent with reason (never silent) [repo] |
| Post-incident: verbal debrief; reporting lag | ICS-209-style debrief (authority packet AUD-90-0847), full audit timeline (AI/TALON/Operator/System actors) [repo][R4·S34] | *(post-mission)* |

**What the arc claims and does not claim:** the 90 s covers detection → validated alert → tasking decision (gates 1–2) plus supervision handoff; it does **not** compress crew travel or water-on-fire [R1 §e6]. The information chain collapses from ~48 min to seconds because every handoff that used to be a human voice on a radio becomes a state the operator already sees; the three remaining human gates (verify → authorize → supervise) are where judgment — and the prototype's entire interaction design [repo] — lives.
