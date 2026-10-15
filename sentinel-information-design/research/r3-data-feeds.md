# R3 — External Data Feeds & AI Computation Pipelines (FlytBase Sentinel / Talon)

Desk research, 2026-09-22. Replacement run; compact inventory for information-design study.
Legend: **[est]** = estimate/inferred from industry practice; **[unverified]** = not confirmed this session.
KPI anchor: 48 min → 90 s response. Every Talon computation and operator feed below must be traceable to a source or labeled.

## (a) External source inventory

| # | Source | Format | Resolution / cadence | Latency | Access / API | Reliability limits | Source URL |
|---|--------|--------|----------------------|---------|--------------|--------------------|------------|
| 1 | MODIS active fire (Terra/Aqua) | CSV/GeoJSON, WMS tiles | ~1 km pixels; ~2–4 passes/scene/day (day+night) | ~2–4 h post-acquisition (LANCE NRT) [est] | FIRMS API (area/text), WMS | 1 km pixel = large minimum detectable area; cloud/cover gaps; false hotspots (solar glare, industrial) | https://firms.modaps.eosdis.nasa.gov/ |
| 2 | VIIRS I-band active fire (S-NPP/NOAA-20) | CSV/GeoJSON, WMS | 375 m; ~4 passes/day/constellation [est] | ~2–4 h NRT [est]; update cycle ~3 h [est] | FIRMS API | Clouds mask detection; small fires <375 m may miss; nighttime improved vs MODIS | https://firms.modaps.eosdis.nasa.gov/ |
| 3 | GOES-R ABI Fire (FDC/HSC) | NetCDF, fire mask + temp/area/FRP | Full-disk 10 min (CONUS 5 min); **mesoscale sectors 1 min** | ~1–5 min from scan [est] | NOAA/AWS open data (GOES-16/18/19) | 2 km (CONUS) / 0.5–1 km (meso) pixels — detection bias toward large/hot; sunrise/sunset artifact; sits above horizon only for its footprint | https://www.ncei.noaa.gov/products/goes-r-abie-fire-product ; https://www.goes-r.gov/ (GOES-16 detects fires 10–15 min before 911 avg) |
| 4 | Ground/IoT — temp/RH/CO/smoke (e.g., Dryad Silvanet) | JSON over LoRaWAN (mesh) | Point sensors; event-driven + periodic heartbeat, minutes [est] | Seconds–minutes [est] | Vendor cloud API/webhooks | Battery life vs tx rate; RF range in canopy; sensor drift/CO cross-sensitivity; gateways are single points | https://www.dryad.net/ (Silvanet measures temp, RH, CO…); LoRa forest WSN: https://www.mdpi.com/ (temp/RH/smoke/PM2.5 nodes) |
| 5 | ALERTWildfire / ALERTCalifornia PTZ camera net | H.264/HLS video + pan/tilt/zoom snapshots | ~1–5 fps streamed per camera [est]; pan cycle sweeps horizon [est] | Real-time | Web viewer, some open video feeds | Sunrise/sunset glare, fog/cloud, lens dirt; PTZ blind spots; loss of backhaul | https://alertcalifornia.org/ (AI smoke detect, pan-tilt-zoom, auto-alert dispatchers) ; EPRI PTZ+AI: https://distribution.epri.com/ |
| 6 | RAWS (Remote Automated Weather Stations) | CSV/XML via API | Point obs; **hourly standard** (some 10-min special) [est] | Minutes [est] | Synthesis API (NIFC/wildfire.gov), MesoWest | Point location only — not spatial; sensor icing/failure; comms dropout | https://www.nifc.gov/ (measures wind speed/dir, air temp, precip, RH, solar radiation, fuel moisture) |
| 7 | METAR (airport weather) | Text/CSV | Point obs; hourly + SPECIs | Minutes | NOAA/NWS APIs | Airport-sited, not fire-terrain; less relevant than RAWS for canopy/wind [est] | https://www.weather.gov/ (fire-weather criteria) |
| 8 | Red-flag weather thresholds (derived) | Boolean state per zone | Computed on RH + wind obs/forecast | Real-time on obs | Computed (see weather.gov criteria) | Criteria vary by NWS office | RH ≤15% + sustained/frequent gusts ≥25 mph = red-flag event — https://www.weather.gov/ |
| 9 | DEM (Copernicus GLO-30 / SRTM / NED) | GeoTIFF, terrain derivatives | 30 m global [est]; static (months–years refresh) | Static | OpenTopography, AWS open data, USGS | DSM includes canopy/buildings (affects slope/wind calc); voids in steep terrain | https://registry.opendata.aws/ (Copernicus GLO-30); https://portal.opentopography.org/ |
| 10 | Land cover / fuel models (LANDFIRE FBFM40) | GeoTIFF raster | 30 m; refresh ~2 yr (LANDFIRE 2020) [est] | Static | LANDFIRE/USGS, data.gov | Post-fire/re-growth stale; 40-class generalization of real fuel | https://www.landfire.gov/ (Scott & Burgan 40 FBFM40) ; https://catalog.data.gov/ |
| 11 | Roads / water / admin layers | GeoJSON / shapefile | Vector; static–yearly | Static | OSM, national gov portals | OSM completeness varies; seasonal road closure lag | [unverified — standard GIS practice] |
| 12 | FIRMS email/alerts wrapper | Email/JSON webhook | Per AOI, per detection batch | Same as #1–2 | FIRMS subscription API | Alert batch delay; cloud "no-data" is silent | https://firms.modaps.eosdis.nasa.gov/ (email alerts per AOI) |

## (b) AI-pipeline inventory (what Talon computes)

| Pipeline | Inputs | Outputs (artifact + rate) | Compute class | Failure mode |
|----------|--------|---------------------------|---------------|--------------|
| Smoke-detection CNN (YOLO-class) | Video frames from PTZ/fixed cameras, ~1–5 fps [est], 1080p–4K [est] | Bounding box + class "smoke" + confidence (0–1), per frame; alert on threshold + persistence [est] | Edge GPU or cloud GPU; lightweight variants (LD-YOLO on YOLOv8) real-time | False positives: clouds, fog, dust, solar glare, sunrise/sunset, haze (SmokyNet documented 79% FP pre-dedup — see (c)); misses small/distant smoke; night under-detects | 
| Thermal-anomaly detection | Drone thermal (MWIR/LWIR) + satellite thermal (MODIS 375m/1km, ABI) | Heat "hotspot" point/centroid + temp + FRP; per pass | CPU/GPU lightweight | Sun-warmed rocks/rooftops = false hotspot; temporal drift needs differencing [est] |
| Fire-spread simulation (Rothermel ROS via FARSITE / Cell2Fire) | DEM 30 m, fuel model 30 m (FBFM40), wind obs (RAWS/METAR hourly), fuel moisture (10-h), ignition point | Perimeter polygon + per-cell arrival time + spread rate/FLI; one snapshot per run or hourly re-run [est] | CPU; FARSITE minutes-hours for landscape [est]; Cell2Fire parallel/C++, "short periods" for large scenes (https://github.com/cell2fire/Cell2Fire) | Garbage-in: stale fuel map or point wind extrapolation → wrong perimeter; runtime too slow for 90-s KPI unless grid/area bounded [est] |
| Fire-perimeter extraction (thermal/optical) | Thermal imagery (drone flyover) + NIR/optical + active-fire points | GeoJSON perimeter polygon; per flight pass or per satellite revisit | GPU segmentation or thresholding | Cloud/smoke obscures; thermal bleed across pixels; perimeter polygon accuracy limited by sensor res (1 km MODIS ≫ 375 m VIIRS ≫ drone) [est] |
| Multi-sensor fusion / corroboration (meta-pipeline) | All above outputs | "Confirmed fire" event w/ confidence + evidence bundle (snapshot + hotspot id + wind vector); event-driven | CPU/cloud | Single-source detection goes unconfirmed → alert suppressed (miss) or auto-escalated (FP) — policy choice |

## (c) Multi-source corroboration / fusion notes (false-alarm reduction)

- **Reality check:** SmokeyNet (HPWREN/UCSD) — after suppressing repeat detections in a 1-hour window, only **21% of notifications were real smoke (79% FP)**: https://arxiv.org/abs/2205.05915. So camera-AI alone is not trusted; fusion is mandatory.
- **Temporal dedup:** discard repeat triggers in the same pan/tilt/time window (SmokeyNet method above).
- **Cross-modal check:** camera smoke bbox ∩ satellite hotspot (FIRMS/GOES) within radius + time window = "confirmed". GOES detects fires on average 10–15 min before 911 calls (https://www.goes-r.gov/), so satellite corroboration is feasible within the 90-s budget only for mesoscale/1-min data.
- **Repetitive-daily-event filter:** solar glare at same time/azimuth removed via historical pattern (HPWREN lessons: https://www.hpwren.ucsd.edu/).
- **Weather-gating:** red-flag conditions (RH≤15%, winds≥25 mph — https://www.weather.gov/) raise alert priority; low-wind/high-RH smoke detections may be deprioritized [est].
- **IoT cross-check:** LoRaWAN CO/temp spike within camera sector corroborates; isolated single-sensor spike = lower confidence [est].
- **Human-in-the-loop:** industry practice (ALERTCalifornia) routes AI-confirmed detections to dispatchers for verification before dispatch — Talon analog: operator confirm step before drone tasking [est].

## (d) Sources

1. NASA FIRMS — https://firms.modaps.eosdis.nasa.gov/
2. NASA Earthdata VIIRS 375 m active fire — https://www.earthdata.nasa.gov/
3. Google EE FIRMS/VIIRS catalog — https://developers.google.com/earth-engine/datasets/catalog/NASA_LANCE_SNPP_VIIRS_C2
4. GOES-R program — https://www.goes-r.gov/
5. NOAA NCEI GOES-R ABI Fire product — https://www.ncei.noaa.gov/
6. RAWS (NIFC) — https://www.nifc.gov/
7. ALERTCalifornia — https://alertcalifornia.org/
8. EPRI PTZ smoke cameras — https://distribution.epri.com/
9. Dryad Silvanet LoRaWAN — https://www.dryad.net/
10. LoRa forest WSN (MDPI 2026) — https://www.mdpi.com/
11. LANDFIRE FBFM40 — https://www.landfire.gov/
12. Copernicus GLO-30 DEM — https://registry.opendata.aws/
13. Red-flag criteria — https://www.weather.gov/
14. FARSITE / FlamMap — https://research.fs.usda.gov/ ; https://landscapetoolbox.org/
15. Cell2Fire — https://www.frontiersin.org/ ; https://github.com/cell2fire/Cell2Fire
16. SmokeyNet arXiv — https://arxiv.org/abs/2205.05915
17. HPWREN lessons — https://www.hpwren.ucsd.edu/
18. YOLO smoke models — https://www.mdpi.com/ ; https://link.springer.com/

## (e) Uncertainties

- FIRMS NRT latency (2–4 h) is from general NRT documentation, not a per-dataset SLA — verify against current LANCE docs before citing in final design.
- GOES mesoscale 1-min cadence and ABI latency (~1–5 min) inferred from product family; exact operational latency not measured here.
- Camera fps/resolution, alert thresholds, and edge-vs-cloud split for Talon are industry-typical estimates, not FlytBase specs.
- FARSITE/Cell2Fire runtimes vary by landscape size/fuel complexity; "minutes-hours" is order-of-magnitude only.
- SmokeyNet 79% FP is one system at one point in time (2022); current deployed systems likely lower — do not generalize blindly.
- LoRaWAN mesh specifics (range, heartbeat period, battery) are vendor-variable.
- Operator-fusion policy (auto-escalate vs suppress on single-source) is a design choice, not an external fact.
