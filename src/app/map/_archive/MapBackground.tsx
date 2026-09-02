/**
 * MapBackground — Static 1440×900 isometric-style tactical environment
 * California foothills · ~3AM · Glassmorphism command-center background
 *
 * Visual layers (bottom → top):
 *  1  Deep terrain base
 *  2  Hill elevation / ridge shading
 *  3  Forest polygon mass (north + extensions)
 *  4  Dense tree-cluster ellipses (organic masses)
 *  5  Individual crown highlights
 *  6  Reservoir + creek
 *  7  Topographic contour lines
 *  8  Road network
 *  9  Residential zone + street grid + buildings
 * 10  Zone fills (amber tint, grey fill)
 * 11  Zone boundary lines (brightest elements)
 * 12  Patrol routes + drone icons
 * 13  Atmospheric vignette
 */

// ── Deterministic tree scatter (avoid Math.random for SSR) ────────────────────
const CROWN_DOTS: [number, number, number, number][] = [
  // [cx, cy, r, opacity_offset]  — NW forest
  [38,140,5,0],[62,124,4,1],[88,138,6,0],[115,118,4,2],[144,132,5,1],
  [170,112,4,0],[198,128,6,2],[228,115,5,1],[258,130,4,0],[285,118,6,1],
  [55,162,4,2],[95,155,5,0],[138,168,4,1],[182,158,6,0],[224,172,5,2],
  [265,162,4,1],[308,175,6,0],[342,162,4,2],
  // N-central forest
  [378,148,5,0],[415,135,4,1],[448,152,6,2],[482,138,5,0],[518,154,4,1],
  [555,140,6,0],[592,156,4,2],[628,142,5,1],[665,158,6,0],[702,144,4,2],
  [395,172,4,1],[435,165,5,0],[478,178,4,2],[525,168,6,1],[568,182,4,0],
  [615,170,5,2],[658,184,4,1],[700,172,6,0],[742,186,5,2],
  // NE forest
  [738,145,4,0],[775,132,6,1],[812,148,5,2],[848,134,4,0],[885,150,6,1],
  [924,136,5,0],[962,152,4,2],[1000,138,6,1],[1038,154,5,0],
  [758,168,4,1],[798,158,5,0],[838,172,4,2],[878,162,6,1],[920,176,4,0],
  // E forest
  [1078,142,4,1],[1118,128,6,0],[1158,144,5,2],[1198,130,4,1],[1240,146,6,0],
  [1278,132,5,2],[1318,148,4,1],[1358,134,6,0],[1398,150,5,2],[1432,138,4,1],
  [1095,168,5,0],[1140,158,4,2],[1185,172,6,1],[1228,160,5,0],[1272,175,4,2],
  [1315,164,6,1],[1355,178,5,0],[1395,166,4,2],
  // Second canopy row (deeper south)
  [48,205,4,0],[112,198,5,1],[178,212,4,2],[245,202,6,0],[315,215,5,1],
  [388,208,4,2],[462,220,6,0],[538,212,4,1],[615,225,5,2],[692,218,4,0],
  [768,230,6,1],[845,222,5,0],[922,235,4,2],[1002,225,6,1],[1082,238,5,0],
  [1165,228,4,2],[1248,242,6,1],[1332,232,5,0],[1415,245,4,2],
];

// ── Building grid  (10 cols × 5 rows, matches MapCanvas BUILDINGS) ─────────────
const BUILDINGS = (() => {
  const list: { x: number; y: number; w: number; h: number; lit: boolean; variant: number }[] = [];
  for (let c = 0; c < 10; c++) {
    for (let r = 0; r < 5; r++) {
      list.push({
        x: 502 + c * 50 + 5,
        y: 576 + r * 44 + 4,
        w: 40,
        h: 36,
        lit: (c * 7 + r * 13) % 6 === 0,
        variant: (c + r * 3) % 4,
      });
    }
  }
  return list;
})();

export function MapBackground() {
  return (
    <svg
      viewBox="0 0 1440 900"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        {/* ── Terrain atmosphere gradient ── */}
        <linearGradient id="mbAtmos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0B1E10" />
          <stop offset="45%"  stopColor="#0A1A0F" />
          <stop offset="100%" stopColor="#080F0A" />
        </linearGradient>

        {/* ── Hill radial lighting ── */}
        <radialGradient id="mbHillNW" cx="22%" cy="18%" r="48%">
          <stop offset="0%"   stopColor="#122818" />
          <stop offset="100%" stopColor="#0A1A0F" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mbHillNE" cx="82%" cy="14%" r="44%">
          <stop offset="0%"   stopColor="#0F2414" />
          <stop offset="100%" stopColor="#0A1A0F" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mbHillC" cx="52%" cy="28%" r="40%">
          <stop offset="0%"   stopColor="#0E2212" />
          <stop offset="100%" stopColor="#0A1A0F" stopOpacity="0" />
        </radialGradient>

        {/* ── Valley floor darkening ── */}
        <radialGradient id="mbValley" cx="50%" cy="72%" r="42%">
          <stop offset="0%"   stopColor="#050C06" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#050C06" stopOpacity="0" />
        </radialGradient>

        {/* ── Reservoir shimmer ── */}
        <radialGradient id="mbLake" cx="38%" cy="28%" r="58%">
          <stop offset="0%"   stopColor="#0C2828" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#061414" stopOpacity="0"  />
        </radialGradient>

        {/* ── Forest canopy texture (tight circles) ── */}
        <pattern id="mbForestTex" x="0" y="0" width="20" height="18" patternUnits="userSpaceOnUse">
          <circle cx="5"  cy="6"  r="4.5" fill="#0C1E0E" opacity="0.9" />
          <circle cx="14" cy="12" r="4"   fill="#0B1C0C" opacity="0.75"/>
          <circle cx="10" cy="3"  r="3"   fill="#0D200F" opacity="0.6" />
        </pattern>

        {/* ── Sparse buffer-zone texture ── */}
        <pattern id="mbBufferTex" x="0" y="0" width="28" height="24" patternUnits="userSpaceOnUse">
          <circle cx="7"  cy="8"  r="4"   fill="#0C1E0E" opacity="0.5" />
          <circle cx="20" cy="16" r="3.5" fill="#0B1C0C" opacity="0.4" />
        </pattern>

        {/* ── Very faint sub-grid ── */}
        <pattern id="mbGrid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M80,0 L0,0 0,80" fill="none" stroke="#0C1C0F" strokeWidth="0.35" opacity="0.5" />
        </pattern>

        {/* ── Blur filters ── */}
        <filter id="mbBlur6"  x="-50%"  y="-50%"  width="200%" height="200%"><feGaussianBlur stdDeviation="6"  /></filter>
        <filter id="mbBlur14" x="-60%"  y="-60%"  width="220%" height="220%"><feGaussianBlur stdDeviation="14" /></filter>
        <filter id="mbBlur28" x="-80%"  y="-80%"  width="260%" height="260%"><feGaussianBlur stdDeviation="28" /></filter>
        <filter id="mbBlur45" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="45" /></filter>

        {/* ── Vignette ── */}
        <radialGradient id="mbVignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="rgba(0,0,0,0)"    />
          <stop offset="75%"  stopColor="rgba(0,0,0,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.62)" />
        </radialGradient>
      </defs>

      {/* ═══════════════════════════════════════════════════════════
          LAYER 1 — Base terrain
      ═══════════════════════════════════════════════════════════ */}
      <rect width="1440" height="900" fill="url(#mbAtmos)" />
      <rect width="1440" height="900" fill="url(#mbGrid)"  />

      {/* ═══════════════════════════════════════════════════════════
          LAYER 2 — Hill lighting + ridge
      ═══════════════════════════════════════════════════════════ */}
      <rect width="1440" height="900" fill="url(#mbHillNW)" />
      <rect width="1440" height="900" fill="url(#mbHillNE)" />
      <rect width="1440" height="900" fill="url(#mbHillC)"  />
      <rect width="1440" height="900" fill="url(#mbValley)" />

      {/* Ridge spine — elevated band running NE→SW */}
      <ellipse cx="680" cy="215" rx="590" ry="78"
        fill="#0F2416" opacity="0.52"
        filter="url(#mbBlur14)"
        transform="rotate(-10 680 215)"
      />
      {/* Ridge crest highlight (top edge catches ambient light) */}
      <path
        d="M 0,235 C 80,218 160,228 240,212 C 320,196 420,210 520,194
           C 620,178 720,192 820,176 C 920,160 1020,174 1120,158
           C 1220,142 1330,158 1440,144"
        fill="none" stroke="#182E1C" strokeWidth="2.5" opacity="0.5"
      />
      {/* Ridge body polygon */}
      <polygon
        points="
          0,252  120,234 248,240 372,224 498,238 622,220 748,234
          874,218 1000,232 1128,216 1256,228 1382,214 1440,220
          1440,268 1382,255 1256,268 1128,252 1000,268 874,253
          748,268 622,254 498,272 372,258 248,274 120,268 0,285
        "
        fill="#0E2416" opacity="0.72"
      />

      {/* ═══════════════════════════════════════════════════════════
          LAYER 3 — Main forest polygon mass (northern half)
      ═══════════════════════════════════════════════════════════ */}
      {/* Core northern forest */}
      <path
        d="M 0,0 L 1440,0 L 1440,268
           C 1390,264 1345,278 1298,262
           C 1251,246 1204,265 1155,248
           C 1106,231 1058,252 1008,235
           C 958,218 908,240 856,222
           C 804,204 752,228 699,210
           C 646,192 592,218 538,200
           C 484,182 430,206 374,188
           C 318,170 262,194 205,178
           C 148,162 90,185 42,168
           L 0,162
           Z"
        fill="#0D2010"
      />
      {/* Forest texture overlay */}
      <path
        d="M 0,0 L 1440,0 L 1440,268
           C 1390,264 1345,278 1298,262
           C 1251,246 1204,265 1155,248
           C 1106,231 1058,252 1008,235
           C 958,218 908,240 856,222
           C 804,204 752,228 699,210
           C 646,192 592,218 538,200
           C 484,182 430,206 374,188
           C 318,170 262,194 205,178
           C 148,162 90,185 42,168
           L 0,162
           Z"
        fill="url(#mbForestTex)" opacity="0.6"
      />

      {/* NE dense forest arm (extending south on east slope) */}
      <path
        d="M 1190,0 L 1440,0 L 1440,420
           C 1402,408 1365,418 1326,400
           C 1287,382 1258,396 1222,375
           C 1195,360 1182,336 1190,268
           Z"
        fill="#0F2214" opacity="0.72"
      />
      <path
        d="M 1190,0 L 1440,0 L 1440,420
           C 1402,408 1365,418 1326,400
           C 1287,382 1258,396 1222,375
           C 1195,360 1182,336 1190,268
           Z"
        fill="url(#mbForestTex)" opacity="0.45"
      />

      {/* NW forest extension (down toward reservoir) */}
      <path
        d="M 0,0 L 295,0 L 295,305
           C 248,312 198,320 145,308
           C 92,296 44,304 0,295
           Z"
        fill="#0F2214" opacity="0.65"
      />
      <path
        d="M 0,0 L 295,0 L 295,305
           C 248,312 198,320 145,308
           C 92,296 44,304 0,295
           Z"
        fill="url(#mbForestTex)" opacity="0.4"
      />

      {/* ═══════════════════════════════════════════════════════════
          LAYER 4 — Dense tree-cluster ellipses (organic masses)
      ═══════════════════════════════════════════════════════════ */}

      {/* NW clusters */}
      <ellipse cx="88"   cy="165" rx="82"  ry="56"  fill="#102618" opacity="0.62" />
      <ellipse cx="58"   cy="132" rx="60"  ry="44"  fill="#0F2416" opacity="0.58" />
      <ellipse cx="175"  cy="148" rx="95"  ry="62"  fill="#112818" opacity="0.55" />
      <ellipse cx="155"  cy="200" rx="78"  ry="48"  fill="#102618" opacity="0.52" />
      <ellipse cx="258"  cy="178" rx="88"  ry="58"  fill="#0F2416" opacity="0.50" />
      <ellipse cx="228"  cy="232" rx="72"  ry="45"  fill="#102618" opacity="0.48" />

      {/* N-central clusters */}
      <ellipse cx="405"  cy="155" rx="102" ry="66"  fill="#112818" opacity="0.55" />
      <ellipse cx="498"  cy="138" rx="88"  ry="58"  fill="#102618" opacity="0.52" />
      <ellipse cx="452"  cy="202" rx="95"  ry="60"  fill="#0F2416" opacity="0.50" />
      <ellipse cx="572"  cy="148" rx="105" ry="64"  fill="#112818" opacity="0.52" />
      <ellipse cx="548"  cy="210" rx="90"  ry="56"  fill="#102618" opacity="0.48" />
      <ellipse cx="662"  cy="158" rx="100" ry="62"  fill="#0F2416" opacity="0.50" />
      <ellipse cx="638"  cy="222" rx="85"  ry="52"  fill="#112818" opacity="0.46" />

      {/* NE clusters */}
      <ellipse cx="758"  cy="148" rx="98"  ry="64"  fill="#102618" opacity="0.52" />
      <ellipse cx="845"  cy="162" rx="105" ry="66"  fill="#0F2416" opacity="0.50" />
      <ellipse cx="800"  cy="222" rx="95"  ry="58"  fill="#112818" opacity="0.48" />
      <ellipse cx="935"  cy="152" rx="102" ry="62"  fill="#102618" opacity="0.50" />
      <ellipse cx="895"  cy="218" rx="88"  ry="55"  fill="#0F2416" opacity="0.46" />

      {/* E slopes — long vertical arm */}
      <ellipse cx="1078" cy="148" rx="118" ry="72"  fill="#112818" opacity="0.55" />
      <ellipse cx="1042" cy="222" rx="105" ry="65"  fill="#102618" opacity="0.52" />
      <ellipse cx="1165" cy="168" rx="125" ry="78"  fill="#0F2416" opacity="0.55" />
      <ellipse cx="1135" cy="242" rx="108" ry="68"  fill="#112818" opacity="0.50" />
      <ellipse cx="1255" cy="178" rx="130" ry="80"  fill="#102618" opacity="0.55" />
      <ellipse cx="1218" cy="262" rx="112" ry="70"  fill="#0F2416" opacity="0.50" />
      <ellipse cx="1338" cy="162" rx="118" ry="74"  fill="#112818" opacity="0.52" />
      <ellipse cx="1302" cy="248" rx="105" ry="66"  fill="#102618" opacity="0.48" />
      <ellipse cx="1408" cy="185" rx="90"  ry="58"  fill="#0F2416" opacity="0.50" />
      <ellipse cx="1375" cy="275" rx="88"  ry="56"  fill="#112818" opacity="0.45" />
      <ellipse cx="1418" cy="320" rx="78"  ry="50"  fill="#102618" opacity="0.42" />

      {/* Buffer-zone sparse tree islands */}
      <ellipse cx="340"  cy="348" rx="65"  ry="40"  fill="#0E2214" opacity="0.40" />
      <ellipse cx="488"  cy="368" rx="58"  ry="36"  fill="#0F2416" opacity="0.36" />
      <ellipse cx="635"  cy="358" rx="70"  ry="42"  fill="#0E2214" opacity="0.38" />
      <ellipse cx="820"  cy="372" rx="62"  ry="38"  fill="#0F2416" opacity="0.36" />
      <ellipse cx="965"  cy="355" rx="72"  ry="44"  fill="#0E2214" opacity="0.40" />
      <ellipse cx="1115" cy="370" rx="68"  ry="40"  fill="#0F2416" opacity="0.38" />
      <ellipse cx="1275" cy="362" rx="60"  ry="36"  fill="#0E2214" opacity="0.36" />

      {/* ═══════════════════════════════════════════════════════════
          LAYER 5 — Individual tree crown highlights
      ═══════════════════════════════════════════════════════════ */}
      {CROWN_DOTS.map(([cx, cy, r, vo], i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill={
            i % 4 === 0 ? "#152E1C" :
            i % 4 === 1 ? "#132A18" :
            i % 4 === 2 ? "#112614" :
                          "#172E1E"
          }
          opacity={0.52 + (vo as number) * 0.06}
        />
      ))}

      {/* ═══════════════════════════════════════════════════════════
          LAYER 6 — Reservoir + creek
      ═══════════════════════════════════════════════════════════ */}
      {/* Reservoir body */}
      <path
        d="M 72,118 C 80,98 100,82 124,76 C 148,70 172,76 190,92
           C 208,108 215,130 212,152 C 209,174 196,188 178,196
           C 160,204 138,200 120,188 C 102,176 88,156 80,136
           Z"
        fill="#061414"
      />
      {/* Subtle shimmer gradient */}
      <path
        d="M 72,118 C 80,98 100,82 124,76 C 148,70 172,76 190,92
           C 208,108 215,130 212,152 C 209,174 196,188 178,196
           C 160,204 138,200 120,188 C 102,176 88,156 80,136
           Z"
        fill="url(#mbLake)" opacity="0.85"
      />
      {/* Water surface ripple lines */}
      <path d="M 102,112 C 118,105 138,108 155,104" fill="none" stroke="#0C2828" strokeWidth="1.4" opacity="0.55" />
      <path d="M 112,128 C 130,122 148,125 165,120" fill="none" stroke="#0A2424" strokeWidth="1.2" opacity="0.45" />
      <path d="M 118,145 C 136,139 154,142 170,137" fill="none" stroke="#0A2424" strokeWidth="1"   opacity="0.38" />
      <path d="M 110,162 C 125,157 142,160 158,155" fill="none" stroke="#092020" strokeWidth="0.9" opacity="0.32" />
      {/* North-shore ambient glint */}
      <path
        d="M 84,118 C 95,104 112,94 130,88 C 148,82 164,85 180,94"
        fill="none" stroke="#112C2C" strokeWidth="2" opacity="0.42"
      />
      {/* Reservoir label */}
      <rect x="110" y="130" width="64" height="13" rx="2" fill="rgba(0,0,0,0.5)" />
      <text
        x="142" y="140"
        fill="#082828" fontSize="7.5"
        fontFamily="'JetBrains Mono',monospace" fontWeight="700"
        textAnchor="middle" letterSpacing="0.1em"
      >RESERVOIR</text>

      {/* Creek flowing SE from reservoir */}
      <path
        d="M 205,186 C 240,215 268,248 280,285 C 290,315 288,348 284,380"
        fill="none" stroke="#071616" strokeWidth="4.5" opacity="0.65"
        strokeLinecap="round"
      />
      <path
        d="M 205,186 C 240,215 268,248 280,285 C 290,315 288,348 284,380"
        fill="none" stroke="#091A1A" strokeWidth="2" opacity="0.45"
        strokeLinecap="round"
      />

      {/* ═══════════════════════════════════════════════════════════
          LAYER 7 — Topographic contour lines
      ═══════════════════════════════════════════════════════════ */}
      {[
        { d: "M 180,178 C 248,165 318,172 395,158 C 472,144 550,158 628,144 C 706,130 784,144 862,130", op: 0.42 },
        { d: "M 0,198 C 65,186 140,195 218,180 C 295,165 372,178 448,162 C 524,146 600,162 678,148 C 756,134 834,148 912,132 C 990,116 1068,130 1145,116", op: 0.38 },
        { d: "M 280,238 C 368,225 458,238 548,222 C 638,206 728,220 818,205 C 908,190 998,205 1088,190 C 1178,175 1268,188 1358,174", op: 0.32 },
        { d: "M 0,308 C 100,295 202,308 305,294 C 408,280 510,295 612,280 C 714,265 816,280 918,265 C 1020,250 1122,265 1225,252", op: 0.28 },
        { d: "M 0,365 C 120,352 242,365 364,352 C 486,339 608,352 730,339 C 852,326 974,338 1095,326", op: 0.22 },
      ].map(({ d, op }, i) => (
        <path key={i} d={d} fill="none" stroke="#0D1E10" strokeWidth="1.1" opacity={op} />
      ))}

      {/* ═══════════════════════════════════════════════════════════
          LAYER 8 — Road network
      ═══════════════════════════════════════════════════════════ */}
      {/* Main N-S arterials */}
      <path
        d="M 502,900 L 502,576 C 502,520 500,462 496,404
           C 492,354 488,312 484,274 C 480,242 477,210 474,178"
        fill="none" stroke="#1C2E18" strokeWidth="3.5" opacity="0.92"
      />
      <path
        d="M 1002,900 L 1002,576 C 1002,520 1000,462 997,405
           C 994,354 990,313 986,274 C 982,242 978,210 975,178"
        fill="none" stroke="#1C2E18" strokeWidth="3.5" opacity="0.92"
      />

      {/* Center access road */}
      <path
        d="M 752,576 C 750,518 748,462 746,408
           C 744,366 742,336 740,298 C 738,268 738,248 740,226"
        fill="none" stroke="#1A2C16" strokeWidth="2.5" opacity="0.80"
      />

      {/* E-W connector through buffer zone */}
      <path
        d="M 455,500 C 555,496 655,492 752,492 C 849,492 949,494 1049,497"
        fill="none" stroke="#192A14" strokeWidth="2.2" opacity="0.68"
      />

      {/* Short stubs connecting arterials to buffer road */}
      <path d="M 502,500 L 502,576" fill="none" stroke="#172812" strokeWidth="1.8" opacity="0.70" />
      <path d="M 752,492 L 752,576" fill="none" stroke="#172812" strokeWidth="1.8" opacity="0.65" />
      <path d="M 1002,497 L 1002,576" fill="none" stroke="#172812" strokeWidth="1.8" opacity="0.70" />

      {/* Spur roads into forest (dirt tracks) */}
      <path
        d="M 596,418 C 610,404 622,388 634,370 C 644,354 648,338 650,320"
        fill="none" stroke="#152410" strokeWidth="1.4" opacity="0.48"
        strokeDasharray="6,4"
      />
      <path
        d="M 878,412 C 892,398 904,382 912,364 C 918,348 922,330 924,310"
        fill="none" stroke="#152410" strokeWidth="1.4" opacity="0.48"
        strokeDasharray="6,4"
      />

      {/* Road centre-line markings (very faint white dashes on main roads) */}
      <path d="M 502,576 L 502,900" fill="none" stroke="#1F3018" strokeWidth="0.8" strokeDasharray="18,12" opacity="0.35" />
      <path d="M 1002,576 L 1002,900" fill="none" stroke="#1F3018" strokeWidth="0.8" strokeDasharray="18,12" opacity="0.35" />

      {/* ═══════════════════════════════════════════════════════════
          LAYER 9 — Residential zone
      ═══════════════════════════════════════════════════════════ */}
      {/* Zone cleared-land base — very slightly lighter than forest floor */}
      <rect x="462" y="566" width="580" height="248" fill="#0C1A0B" opacity="0.96" />
      {/* Subtle orange-brown urban glow (streetlights) */}
      <ellipse cx="752" cy="670" rx="240" ry="90" fill="#1A1200" opacity="0.04" filter="url(#mbBlur28)" />

      {/* Street grid — vertical */}
      {[502,552,602,652,702,752,802,852,902,952,1002].map((x) => (
        <line key={x} x1={x} y1={566} x2={x} y2={814}
          stroke="#1A2C16" strokeWidth="2.5" opacity="0.88"
        />
      ))}
      {/* Street grid — horizontal */}
      {[576,620,664,708,752,796].map((y) => (
        <line key={y} x1={462} y1={y} x2={1042} y2={y}
          stroke="#1A2C16" strokeWidth="2.5" opacity="0.88"
        />
      ))}

      {/* Cul-de-sac circle hints at southern end */}
      <circle cx="752" cy="814" r="18" fill="none" stroke="#1A2C16" strokeWidth="2" opacity="0.6" />

      {/* Buildings */}
      {BUILDINGS.map((b, i) => (
        <g key={i}>
          {/* Rooftop */}
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="1"
            fill={b.lit ? "#212E1C" : "#1A2418"}
          />
          {/* Isometric front wall (3px strip, slightly lighter) */}
          <rect x={b.x} y={b.y + b.h - 4} width={b.w} height={4}
            fill={b.lit ? "#283820" : "#1E2C1A"}
          />
          {/* Isometric side wall (2px right strip) */}
          <rect x={b.x + b.w - 2} y={b.y} width={2} height={b.h}
            fill={b.lit ? "#243420" : "#1C2A18"} opacity="0.7"
          />
          {/* Window lights */}
          {b.lit && (
            <>
              <rect x={b.x + 5}  y={b.y + 7} width={7} height={5} rx="1" fill="#324A28" opacity="0.85" />
              <rect x={b.x + 22} y={b.y + 7} width={7} height={5} rx="1" fill="#2E4224" opacity="0.70" />
              {b.variant === 0 && (
                <rect x={b.x + 12} y={b.y + 20} width={12} height={4} rx="1" fill="#2A3E22" opacity="0.55" />
              )}
            </>
          )}
          {/* Dark window outlines on all buildings */}
          {!b.lit && (
            <>
              <rect x={b.x + 5}  y={b.y + 7} width={6} height={4} rx="1" fill="#151E12" opacity="0.6" />
              <rect x={b.x + 20} y={b.y + 7} width={6} height={4} rx="1" fill="#131C10" opacity="0.55" />
            </>
          )}
        </g>
      ))}

      {/* Parking lots / open areas between blocks */}
      <rect x="658" y="624" width="44" height="36" rx="1" fill="#111A0F" opacity="0.7" />
      <rect x="758" y="668" width="44" height="36" rx="1" fill="#111A0F" opacity="0.7" />

      {/* ═══════════════════════════════════════════════════════════
          LAYER 10 — Zone fills
      ═══════════════════════════════════════════════════════════ */}
      {/* Forest zone — very faint amber tint */}
      <path
        d="M 0,0 L 1440,0 L 1440,310
           C 1388,306 1340,322 1290,308
           C 1240,294 1190,312 1138,298
           C 1086,284 1036,304 984,290
           C 932,276 882,296 830,282
           C 778,268 728,288 675,274
           C 622,260 570,280 516,266
           C 462,252 410,272 356,258
           C 302,244 248,264 194,250
           C 140,236 86,256 42,244
           L 0,240
           Z"
        fill="#F5A623" opacity="0.025"
      />

      {/* Buffer zone — very faint grey tint */}
      <path
        d="M 0,240 C 50,250 120,244 200,258 C 280,272 360,260 440,274
           C 520,288 600,278 680,290 C 760,302 840,294 920,305
           C 1000,316 1080,308 1160,318 C 1240,328 1320,320 1400,328 L 1440,330
           L 1440,540 C 1360,536 1280,542 1200,538 C 1120,534 1040,540 960,536
           C 880,532 800,540 720,536 C 640,532 560,538 480,534
           C 420,531 360,536 280,530 C 200,524 100,532 0,526
           Z"
        fill="#8899AA" opacity="0.018"
      />

      {/* ═══════════════════════════════════════════════════════════
          LAYER 11 — Zone boundary lines (brightest map elements)
      ═══════════════════════════════════════════════════════════ */}

      {/* ── FOREST ZONE — amber dashed ── */}
      <path
        d="M 0,244 C 44,240 90,252 140,240
           C 190,228 240,246 292,234
           C 344,222 396,240 448,228
           C 500,216 552,234 604,222
           C 656,210 708,228 760,216
           C 812,204 864,222 916,210
           C 968,198 1020,216 1072,204
           C 1124,192 1178,210 1232,198
           C 1286,186 1340,204 1394,192
           L 1440,190"
        fill="none"
        stroke="#F5A623"
        strokeWidth="2"
        strokeDasharray="14,7"
        opacity="0.84"
      />
      {/* Forest label pill */}
      <rect x="16" y="232" width="98" height="16" rx="3" fill="rgba(0,0,0,0.58)" />
      <text x="65" y="244"
        fill="#F5A623" fontSize="8.5"
        fontFamily="'JetBrains Mono',monospace" fontWeight="700"
        textAnchor="middle" letterSpacing="0.1em" opacity="0.90"
      >FOREST ZONE</text>

      {/* ── BUFFER ZONE — grey dotted ── */}
      <path
        d="M 440,534 C 502,530 582,526 662,524
           C 742,522 822,524 902,526
           C 962,528 1010,532 1060,532"
        fill="none"
        stroke="#8899AA"
        strokeWidth="1.6"
        strokeDasharray="4,5"
        opacity="0.68"
      />
      {/* Buffer label */}
      <rect x="442" y="520" width="82" height="14" rx="3" fill="rgba(0,0,0,0.52)" />
      <text x="483" y="531"
        fill="#8899AA" fontSize="8"
        fontFamily="'JetBrains Mono',monospace" fontWeight="700"
        textAnchor="middle" letterSpacing="0.08em" opacity="0.78"
      >BUFFER ZONE</text>

      {/* ── RESIDENTIAL ZONE — red dashed ── */}
      <rect
        x="462" y="556" width="580" height="258" rx="4"
        fill="none"
        stroke="#E5533C"
        strokeWidth="1.8"
        strokeDasharray="11,5"
        opacity="0.80"
      />
      {/* Residential label */}
      <rect x="652" y="559" width="138" height="16" rx="3" fill="rgba(0,0,0,0.58)" />
      <text x="721" y="571"
        fill="#E5533C" fontSize="8.5"
        fontFamily="'JetBrains Mono',monospace" fontWeight="700"
        textAnchor="middle" letterSpacing="0.08em" opacity="0.90"
      >RESIDENTIAL ZONE</text>

      {/* ═══════════════════════════════════════════════════════════
          LAYER 12 — Patrol routes + drone icons (always visible, very faint)
      ═══════════════════════════════════════════════════════════ */}

      {/* Route 1 — NW forest loop */}
      <ellipse cx="305" cy="192" rx="230" ry="102"
        fill="none" stroke="#00C8FF" strokeWidth="1.5"
        strokeDasharray="10,6" opacity="0.22"
        transform="rotate(-14 305 192)"
      />
      {/* Route 2 — NE forest loop */}
      <ellipse cx="1062" cy="166" rx="212" ry="92"
        fill="none" stroke="#00C8FF" strokeWidth="1.5"
        strokeDasharray="10,6" opacity="0.22"
        transform="rotate(10 1062 166)"
      />
      {/* Route 3 — Buffer / center wide loop */}
      <ellipse cx="682" cy="452" rx="275" ry="110"
        fill="none" stroke="#00C8FF" strokeWidth="1.4"
        strokeDasharray="10,6" opacity="0.20"
      />

      {/* Drone icon S-01 (NW route) */}
      <g transform="translate(162,206)">
        <rect x="-7" y="-1.5" width="14" height="3" rx="1.5" fill="#00C8FF" opacity="0.82" />
        <rect x="-1.5" y="-7" width="3" height="14" rx="1.5" fill="#00C8FF" opacity="0.82" />
        <circle cx="0" cy="0" r="2.5" fill="#00C8FF" opacity="0.92" />
        <circle cx="-7" cy="0"  r="2" fill="none" stroke="#00C8FF" strokeWidth="1" opacity="0.55" />
        <circle cx="7"  cy="0"  r="2" fill="none" stroke="#00C8FF" strokeWidth="1" opacity="0.55" />
        <circle cx="0"  cy="-7" r="2" fill="none" stroke="#00C8FF" strokeWidth="1" opacity="0.55" />
        <circle cx="0"  cy="7"  r="2" fill="none" stroke="#00C8FF" strokeWidth="1" opacity="0.55" />
        <text x="13" y="4" fill="#00C8FF" fontSize="7.5"
          fontFamily="'JetBrains Mono',monospace" fontWeight="700"
          letterSpacing="0.06em" opacity="0.72">S-01</text>
      </g>

      {/* Drone icon S-02 (NE route) */}
      <g transform="translate(1060,166)">
        <rect x="-7" y="-1.5" width="14" height="3" rx="1.5" fill="#00C8FF" opacity="0.82" />
        <rect x="-1.5" y="-7" width="3" height="14" rx="1.5" fill="#00C8FF" opacity="0.82" />
        <circle cx="0" cy="0" r="2.5" fill="#00C8FF" opacity="0.92" />
        <circle cx="-7" cy="0"  r="2" fill="none" stroke="#00C8FF" strokeWidth="1" opacity="0.55" />
        <circle cx="7"  cy="0"  r="2" fill="none" stroke="#00C8FF" strokeWidth="1" opacity="0.55" />
        <circle cx="0"  cy="-7" r="2" fill="none" stroke="#00C8FF" strokeWidth="1" opacity="0.55" />
        <circle cx="0"  cy="7"  r="2" fill="none" stroke="#00C8FF" strokeWidth="1" opacity="0.55" />
        <text x="13" y="4" fill="#00C8FF" fontSize="7.5"
          fontFamily="'JetBrains Mono',monospace" fontWeight="700"
          letterSpacing="0.06em" opacity="0.72">S-02</text>
      </g>

      {/* ═══════════════════════════════════════════════════════════
          LAYER 13 — Atmospheric vignette + edge darkening
      ═══════════════════════════════════════════════════════════ */}
      <rect width="1440" height="900" fill="url(#mbVignette)" />

      {/* Hard edge darkening — makes floating panels pop */}
      <rect width="1440" height="900"
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="60"
      />
    </svg>
  );
}
