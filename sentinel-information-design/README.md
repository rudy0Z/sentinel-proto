# Sentinel Information-Design Research Package

**FlytBase Sentinel · wildfire AI response console · rev A · 2026-09-22**
KPI anchor: 48-minute traditional response -> 90-second Sentinel target (challenge-brief figures; treated as design constraints).

## Start here

- **index.html** - the full research package, rendered as one self-contained page (11 chapters, 57 tables). Open this in a browser.
- **console-wireframe.html** - annotated 1920x1080 operator-console wireframe (12 numbered callouts, legend at bottom).

## Folder map

| Folder | Contents |
|---|---|
| chapters/ | Markdown sources for chapters 00-10: mission-timeline data map, TALON data inventory, operator decision matrix (30 rows), drone fleet spec, traditional 48-min benchmark, gap analysis (15 rows), UI component spec (21 components), KPI traceability (x32), risk register & exception playbook, research appendix |
| research/ | Raw desk research with cited sources: traditional workflow (r1), drone fleet & bandwidth (r2), external data feeds & AI pipelines (r3), operator UX & console patterns (r4) |
| verification/ | Repo audit (file-referenced), review log, V1 fact review, V2 acceptance sweep (12/12 PASS), plan |

## Key conclusions in 60 seconds

1. The 48-minute bottleneck is detection latency + verification + dispatch + size-up (travel is not compressible) - ch05.
2. TALON needs 9 evidence kinds fused before the operator is interrupted; confidence is shown as convergence, not a binary alert - ch02.
3. Operators make 30 time-critical decisions across IC / mission-operator / remote-pilot roles; every one maps to a specific panel and refresh rate - ch03.
4. Seven drone classes cover the mission; dock-based thermal scout is the 45-60 s "verify" strike; handover keeps coverage continuous - ch04.
5. The current repo UI has 15 prioritized gaps; the blocking ones are the tiered alert hierarchy, live feeds, and multi-incident operability - ch06.
6. Every proposed component traces to a segment of the 90-second arc; total compressed window: 15+30+30+15 = 90 s vs 2,880 s => x32 - ch08.

## Honesty notes

- The 48-minute decomposition is a constructed allocation calibrated to the challenge-brief anchor, not a field measurement.
- Press-and-hold duration, multi-fire live operations, and auto-hold policy are design hypotheses requiring real-operator validation.
- This is a research & design specification - no production code was changed in this repository.
