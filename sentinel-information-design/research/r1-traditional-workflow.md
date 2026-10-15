# R1 — Traditional Wildfire Detection-to-Response Workflow (Pre-AI, Pre-Drone)

**Study:** FlytBase Sentinel — operator-interface information design
**Doc type:** Desk-research breakdown · **Compiled:** 2026-09-22 · **Author:** Wildfire-response workflow researcher (subagent R1)
**KPI anchor (given, not re-derived):** traditional first-signal → effective response ≈ **48 min**; Sentinel target ≈ **90 s** (AI detection → validated alert → drone tasking decision).
**All web figures below carry source URLs. Anything without a bracketed source is an explicit ESTIMATE by the author.**

---

## (a) Flow table: step → actor → data used → typical time → source

| # | Step | Actor | Data used (format) | Typical time | Source / basis |
|---|------|-------|--------------------|--------------|----------------|
| 1 | Ignition occurs | Environment | — | — | — |
| 2a | Detection — fire lookout tower | Human lookout (increasingly scarce) | Naked-eye/binocular smoke observation; fire-finder bearing; phone/radio | ESTIMATE 5–45 min after smoke becomes visible; ~0 detection at night | Lookouts "detect the fires quicker than the satellites and catch them when they're small" — NYT 2023: https://www.nytimes.com/2023/09/14/us/america-fire-spotters-lookouts.html ; historic reporting via telephone/radio from towers — Wikipedia: https://en.wikipedia.org/wiki/Fire_lookout_tower ; NPS fire-lookouts handbook (fire-finder procedure): https://npshistory.com/publications/fire-lookouts-handbook.pdf |
| 2b | Detection — 911 / civilian report | Public | Verbal location description over phone (unstandardized) | "Fire personnel tend to say fires are typically reported within 15 min of ignition. In reality, it is usually difficult…" (i.e., 15 min is optimistic perception) | Govil et al. 2020, MDPI Remote Sensing: https://www.mdpi.com/2072-4292/12/10/1575 |
| 2c | Detection — satellite hotspots (MODIS/VIIRS) | Space segment + processing chain | Thermal anomaly pixels (375 m VIIRS / 1 km MODIS); per-pass snapshot | VIIRS NIFC feed: available within ~3¼ h after sensor detection; LANCE ~3 h; best-in-class satellites up to ~90 min orbit + downlink + processing; MODIS products can carry ~2-day processing delay; revisit-interval + processing delays delay small-fire detection (figures map to sources in order) | NIFC: https://data-nifc.opendata.arcgis.com/ ; XPRIZE: https://www.xprize.org/ ; https://offnadir-delta.com/ ; PMC review 2026: https://pmc.ncbi.nlm.nih.gov/ ; https://www.exci.ai/ |
| 2d | Detection — aerial patrol | Contract/agency aircraft | Visual smoke recon; radio smoke report | Cadence-bound (scheduled flights only); response-time variance across agencies studied over 1,476 fires | Magstadt 2026, USDA FS / SciDirect: https://research.fs.usda.gov/ ; https://www.sciencedirect.com/ |
| 2e | Detection — fixed camera network (ALERTWildfire/ALERTCalifornia) | Camera operator / monitoring center | Panoramic imagery; every 2 min a new pan is taken & scanned by AI in the AI-augmented deployments; human pan-tilt-zoom confirmation historically | Pan cycle = 2 min | Oregon Hazards Lab (ALERTWest): https://ohaz.uoregon.edu/ ; AI smoke confirmation beats 911 eyewitness reports — EPRI: https://distribution.epri.com/ ; CAL FIRE+ALERTCalifornia+DigitalPath AI confirmation system (2023) — https://firesafemarin.org/ ; 1,050+ cameras monitored by AI — TIME 2023: https://time.com/ |
| 3 | Detection → verified report reaching dispatch | Lookout / caller / operator | Radio or phone call; verbal lat/long or landmark; often cross-checked against second source (tower bearing triangulation, camera pan, aircraft) | ESTIMATE 2–10 min incl. call handling | Dispatchers' work begins on first report from lookout or 911 — USFS "Discovering dispatch": https://www.fs.usda.gov/ ; call processing benchmark 64–90 s (structural analog, NFPA 1710) — IAFF: https://www.iaff.org/ |
| 4 | Dispatch: CAD entry + resource assignment | Interagency dispatch center (WildCAD etc.) | CAD incident record; availability/status boards; radio tone-out | ESTIMATE 1–5 min; structural benchmark: alarm answering ≤15 s, processing 64–90 s | WildCAD in interagency use — SWCC: https://gacc.nifc.gov/ ; USFS CAD standardization RFI: https://www.forestsandrangelands.gov/ ; NFPA 1710 benchmarks — IAFF (above); DC FEMS: https://fems.dc.gov/ |
| 5 | Crew assembly / turnout | Initial-attack crew | PPE, apparatus, radio briefing | ESTIMATE 1–5 min wildland (urban benchmark 80 s fire turnout) | NFPA 1710 turnout 80 s fire / 60 s EMS — IAFF: https://www.iaff.org/ ; https://www.emergent.tech/ ; wildland crews slower than urban station crews (ESTIMATE) |
| 6 | Travel to scene | Engines / handcrew / dozer | Paper maps, GPS, radio updates from dispatch; road network | ESTIMATE 10–30+ min rural/remote; urban benchmark 240 s (4 min, 90th pct) | NFPA 1710 travel 240 s — MTAS: https://www.mtas.tennessee.edu/ ; "initial ground response is often slowed by distance, rugged terrain, and sparse road access, giving wildfires time to run" — Commercial UAV News 2025: https://www.commercialuavnews.com/ ; aerial response-time variance across 1,476 fires — Magstadt 2026 (above) |
| 7 | On-scene size-up before effective action | First-arriving IC | Visual recon; radio reports from lookouts/aircraft; paper topographic maps; weather observations; IRPG risk process (Look → Evaluate → Decide) | ESTIMATE 5–15 min (field practice; no published single figure found) | NWCG Initial Attack Sizeup/Safety checklist (fuels/weather/topography/fire behavior, plan, communicate): http://www.nwcg.gov/ ; Wildland Fire Incident Management Field Guide — "advise dispatch… assume command… provide dispatch with a sizeup report… initiate risk management process": https://gacc.nifc.gov/ ; size-up factors — Colorado Firecamp tactics guide: https://www.coloradofirecamp.com/ |
| 8 | First effective action (water/tool on fire, or tasking of air) | Crew | — | = end of measured window | — |

**Failure modes of the traditional chain (per sources):** night blindness (lookouts, visual recon), smoke occlusion & terrain masking, unverified/inaccurate civilian location reports, satellite revisit gaps & small-fire misses, lookouts de-staffed (California's tower network shrank from 77+ historically) — https://wildfiretoday.com/ , https://www.latimes.com/ ; night/terrain failure context for initial attack — WFCA: https://wfca.com/ .

---

## (b) Where the ~48 minutes goes (allocation with low/high ranges)

Sourced anchors exist for structural dispatch steps (NFPA 1710) and satellite latency; wildland-specific steps are partly judgment-based. Ranges constructed so the midpoint ≈ 48 min. **ESTIMATE allocation, anchored to cited benchmarks.**

| Segment | Low (min) | High (min) | Mid (min) | Anchoring |
|---|---|---|---|---|
| 1. Detection latency (ignition → something sees it) | 5 | 25 | 12 | Camera pan cycle 2 min (ohaz.uoregon.edu) is the floor of machine vision; 911-report "~15 min" perception (Govil 2020, mdpi.com) is the typical case; lookouts 5–45 min (NYT 2023). *Satellite-only scenarios (1–4 h+) already blow past 48 min and are excluded as atypical.* |
| 2. Verify + report to dispatch | 2 | 10 | 5 | Lookout/camera cross-confirmation; call processing 64–90 s structural benchmark (iaff.org) |
| 3. Dispatch processing + assignment (CAD) | 1 | 5 | 3 | NFPA 1710 alarm processing 64–90 s; wildland interagency CAD adds overhead (forestsandrangelands.gov) |
| 4. Crew turnout / assembly | 1 | 5 | 3 | NFPA 80 s fire turnout; wildland crews slower (ESTIMATE) |
| 5. Travel to scene | 10 | 30 | 18 | Urban floor 240 s (mtas.tennessee.edu); rural reality: distance/terrain/road access (commercialuavnews.com) |
| 6. On-scene size-up → effective action | 5 | 15 | 7 | IRPG/NWCG size-up + IC initial report practice (nwcg.gov, gacc.nifc.gov); duration ESTIMATE |
| **Total** | **24** | **90** | **≈48** | Matches given anchor |

Reading: in the *favorable* case (staffed lookout, quick 911, close station) the chain can run ~25 min; in remote/night/satellite-only cases it exceeds 90 min. The 48-min anchor sits in the plausible middle for a rural-but-instrumented district.

---

## (c) Compression map — traditional step → Sentinel/Talon data → realistic compressed time

| Traditional step | Traditional data (format, latency) | Sentinel/Talon data that compresses it | Realistic compressed time | Notes |
|---|---|---|---|---|
| Detection latency (2a–2e) | Eyes/towers/911 (verbal, 5–45 min); satellite thermal (1–4 h, 375 m–1 km grid); camera pans (2-min cadence) | Persistent thermal+EO video from drone/dock patrol; onboard AI smoke/heat detection; continuous revisit | ~1–5 s machine latency; effectively detection-bound by smoke signature appearance, not by channel cadence (ESTIMATE) | Mirrors ALERTWest 2-min scan logic but at drone altitude & revisit rate |
| Verify + report (3) | Second-source confirmation via radio/phone (2–10 min) | AI classification + single live georeferenced video feed the operator validates in-window | ~10–30 s | Removes triangulation & caller ambiguity |
| Dispatch/assignment (4) | CAD entry, radio tone-out (1–5 min) | Alert auto-carries GPS coordinates; drone tasking is a UI decision on the same feed (Talon-style docking) | ~10–30 s | The 90-s KPI covers detection→validated alert→tasking decision only |
| Crew turnout + travel (5–6) | Physical movement (11–35 min) | **Not compressible** by information systems | unchanged | Honest boundary: Sentinel moves *information*, not apparatus; value = crews launch toward a verified, mapped target |
| On-scene size-up (7) | Visual recon + paper maps + radio (5–15 min, fails at night/in terrain) | Aerial thermal/4K orthomosaic, live fire-edge overlay, GPS perimeter, hotspot list, wind/terrain read from above — available **before** crews arrive | 5–15 min → ~0–2 min at decision point (ESTIMATE) | Drone-on-scene feeds substitute the IC's walk-in recon; thermal defeats night/smoke |
| First effective action (8) | — | Crews arrive with pre-built tactical picture; attack line chosen pre-arrival | Net effect: "effective response" clock can start at drone-arrival, not crew-arrival | This is where part of the 48→90-s gap is *narratively* honest vs. *physically* honest (see uncertainties) |

---

## (d) Sources

1. Govil K. et al. 2020, *Preliminary Results from a Wildfire Detection System Using Deep Learning on Remote Camera Images*, MDPI — https://www.mdpi.com/2072-4292/12/10/1575 (the "reported within 15 min of ignition" perception vs reality)
2. NIFC open data, *VIIRS Thermal Hotspots and Fire Activity* — https://data-nifc.opendata.arcgis.com/ (~3¼ h availability after VIIRS detection)
3. XPRIZE, *Eyes in the Sky: Space-Based Wildfire Detection* — https://www.xprize.org/ (≤90 min orbit+downlink+process best case)
4. offnadir-delta.com, *Active Fire Monitoring with NASA FIRMS* — https://offnadir-delta.com/ (MODIS ~2-day processing delay note)
5. PMC/NIKH review 2026, *A Review on Forest Fire Detection Techniques* — https://pmc.ncbi.nlm.nih.gov/ (satellite revisit/processing/transmission delays; historical lookout/patrol methods)
6. exci.ai, *How to Overcome Satellites' Limitations in Early Wildfire Detection* — https://www.exci.ai/ (revisit-time criticality)
7. Oregon Hazards Lab, *Wildfire Detection Cameras* — https://ohaz.uoregon.edu/ (ALERTWest 2-min pan + AI scan)
8. EPRI, *Smoke Detection Cameras* — https://distribution.epri.com/ (camera confirmation vs 911 eyewitness)
9. Fire Safe Marin, *Fire Detection Cameras* — https://firesafemarin.org/ (CAL FIRE/ALERTCalifornia/DigitalPath AI, 2023)
10. TIME / California Gov, *AlertCalifornia & Cal Fire AI Wildfire Detector* — https://time.com/ + https://www.gov.ca.gov/ (1,050+ cameras under AI)
11. NYT, *America's Fire Spotters Aren't Ready to Fade Away* — https://www.nytimes.com/2023/09/14/us/america-fire-spotters-lookouts.html (lookouts detect quicker than satellites; catch fires small)
12. Wildfire Today — https://wildfiretoday.com/ (lookout staffing decline, 77-tower history); LA Times 2019 opinion — https://www.latimes.com/
13. Wikipedia, *Fire lookout tower* — https://en.wikipedia.org/wiki/Fire_lookout_tower (historical report channels)
14. NPS History, *Fire Lookouts Handbook* — https://npshistory.com/publications/fire-lookouts-handbook.pdf (fire-finder bearing procedure)
15. IAFF, *NFPA Standard 1710* summary — https://www.iaff.org/ (alarm processing 64–90 s; turnout 60/80 s; first engine 240 s)
16. DC FEMS — https://fems.dc.gov/ (80 s turnout + 240 s travel = 5:20 response); emergent.tech — https://www.emergent.tech/ ; MTAS travel-time note — https://www.mtas.tennessee.edu/ ; FireRescue1 benchmarks — https://www.firerescue1.com/
17. USFS, *Discovering dispatch* — https://www.fs.usda.gov/ (dispatch starts at lookout/911 report); SWCC WildCAD — https://gacc.nifc.gov/ ; USFS CAD RFI — https://www.forestsandrangelands.gov/
18. NWCG, *Initial Attack Sizeup/Safety* — http://www.nwcg.gov/ ; NWCG *Crown Fire/Spotting* — http://www.nwcg.gov/
19. NWCG *Wildland Fire Incident Management Field Guide* — https://gacc.nifc.gov/ (on-scene: assume command, sizeup report, risk management)
20. Colorado Firecamp, *Wildland Fire Suppression Tactics Reference Guide* — https://www.coloradofirecamp.com/ (size-up factors)
21. Commercial UAV News, *From Detection to Action: Closing the 95-Year Gap in Aerial [Detection]* — https://www.commercialuavnews.com/ (ground response slowed by distance/terrain/road access)
22. Magstadt S. et al. 2026, *An Assessment of Aerial Firefighting Response Times* — https://research.fs.usda.gov/ + https://www.sciencedirect.com/ + https://papers.ssrn.com/ (1,476 fires, agency variance)
23. Cardil Forradellas A. et al. 2025, *Assessing the Suppression Difficulty of Wildland Fires for Initial Attack Response* — https://connectsci.au/ + https://repositori.udl.cat/ (containment probability falls with response time; first-2-hour window)
24. Rodrigues M. et al. 2019, *Modeling initial attack success, Catalonia* — https://pubmed.ncbi.nlm.nih.gov/
25. Huang M.S. et al. 2024, *Machine Learning Estimates on the Impacts of Detection Times* — https://pmc.ncbi.nlm.nih.gov/ (1-h reporting-delay reduction → 0.25% suppression-cost reduction; useful counterweight)
26. Reimer J. et al. 2019, *Measuring Initial Attack Suppression Effectiveness* — https://www.mdpi.com/ (IA success 83–99%)
27. WFCA, *Initial Attack: Strengthening Decisions When Minutes Define Outcomes* — https://wfca.com/ (IC decision context under poor information)

---

## (e) Uncertainties

1. **The 48-minute anchor itself.** No single public dataset decomposes an end-to-end "detection → effective response" 48-min figure for wildland fire; the anchor was given as a project KPI and the allocation in (b) was *constructed* to sum to it. Treat segment shares as design heuristics, not measurements.
2. **Detection latency distribution.** The only near-number is the "~15 min report" *perception* flagged as optimistic by Govil 2020. Real reporting delay spans minutes (camera AI) to hours (satellite-only, unstaffed land). Huang 2024 even finds 1-h reporting improvements yield only ~0.25% suppression-cost savings — useful honesty check if Sentinel claims huge average savings across *all* fires; the big win is on the fast-growing-ignition tail, not the median.
3. **Size-up duration (5–15 min) is an estimate.** Practice guides describe the *content* of size-up but no published typical duration was found; IC behavior varies by agency and fire.
4. **Urban benchmarks ≠ wildland reality.** NFPA 1710 numbers (64–90 s processing, 80 s turnout, 240 s travel) are structural-fire, career-department, 90th-percentile urban figures used here as floors; wildland interagency dispatch and rural travel run longer.
5. **Night/terrain failure modes are qualitative.** Sources confirm lookouts/visual recon fail at night and in smoke/terrain, but no latency penalty figures exist; night weight in the allocation is judgment.
6. **Compression claims.** The 90-s Sentinel figure covers detection→validated alert→tasking decision, *not* ground-crew travel; any KPI narrative must not imply 90-s water-on-fire.
7. **Some citation URLs are top-level** (publisher landing pages surfaced by search rather than exact articles: pmc.ncbi.nlm.nih.gov, xprize.org, iaff.org, nwcg.gov, etc.). Document-level links were kept where search returned them; the rest should be re-anchored to exact URLs before external publication.
