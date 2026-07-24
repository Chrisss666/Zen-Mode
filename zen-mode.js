// NAME: Zen Mode
// AUTHOR: Chrisss666
// DESCRIPTION: A minimalist, distraction-free fullscreen player overlay for Spotify.
//              Glassmorphism album art, elegant typography, and a scene engine that
//              reacts to K-Pop / K-Drama OST / Anime / Lo-Fi vibes with hand-built
//              inline-SVG background scenes — falling back to a dynamic blur of the
//              current cover art. Toggle from the playbar moon button or F8.
//
// License: MIT (see LICENSE)
// Repo:    https://github.com/Chrisss666/zen-mode
//
// Sections in this file:
//   0. Bootstrap                5. Icons + overlay DOM
//   1. Typography                6. Track reading + rendering
//   2. SVG scene assets           7. Playback / progress
//   3. Scene detection             8. Open / close
//   4. Styles                       9. Boot

/// <reference path="../globals.d.ts" />

(function ZenMode() {
  // ---------------------------------------------------------------------------
  // 0. Bootstrap — wait until the Spicetify surface we rely on is ready.
  // ---------------------------------------------------------------------------
  const ready =
    typeof Spicetify !== "undefined" &&
    Spicetify.Player &&
    Spicetify.Player.addEventListener &&
    Spicetify.Playbar &&
    Spicetify.Playbar.Button;

  if (!ready) {
    setTimeout(ZenMode, 300);
    return;
  }
  if (document.getElementById("zen-mode-overlay")) return; // guard double-injection

  const ID = { style: "zen-mode-style", font: "zen-mode-font", overlay: "zen-mode-overlay" };

  // ---------------------------------------------------------------------------
  // 1. Typography — unique, non-UI webfonts (graceful fallback if CSP blocks).
  // ---------------------------------------------------------------------------
  function injectFont() {
    if (document.getElementById(ID.font)) return;
    const pre1 = Object.assign(document.createElement("link"), { rel: "preconnect", href: "https://fonts.googleapis.com" });
    const pre2 = Object.assign(document.createElement("link"), { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" });
    const link = Object.assign(document.createElement("link"), {
      id: ID.font, rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Space+Grotesk:wght@300;400;500&display=swap",
    });
    document.head.append(pre1, pre2, link);
  }
  const FONT_DISPLAY = `'Playfair Display', 'Cinzel', Georgia, serif`;
  const FONT_SANS = `'Space Grotesk', 'Segoe UI', system-ui, sans-serif`;

  // ---------------------------------------------------------------------------
  // 2. SVG scene assets — real, embedded background illustrations.
  //    Injected as inline <svg> (NOT background-image), which is immune to
  //    Spotify's Content-Security-Policy that blocks external / data: images.
  // ---------------------------------------------------------------------------
  const R = (min, max) => Math.round((min + Math.random() * (max - min)) * 10) / 10;

  function svgStars(n, opts = {}) {
    const { w = 1600, h = 620, colors = ["#ffffff"], rMin = 0.6, rMax = 2.3 } = opts;
    let s = "";
    for (let i = 0; i < n; i++) {
      const x = R(0, w), y = R(0, h), r = R(rMin, rMax);
      const c = colors[Math.floor(Math.random() * colors.length)];
      const dur = R(2.5, 6), delay = R(0, 5), op = R(0.35, 1);
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"><animate attributeName="opacity" values="${(op * 0.25).toFixed(2)};${op.toFixed(2)};${(op * 0.25).toFixed(2)}" dur="${dur}s" begin="-${delay}s" repeatCount="indefinite"/></circle>`;
    }
    return s;
  }
  function svgRain(n, opts = {}) {
    const { w = 1700, color = "rgba(200,225,230,0.22)", len = 22 } = opts;
    let s = "";
    for (let i = 0; i < n; i++) {
      const x = R(0, w), y = R(-260, 700), dur = R(0.6, 1.2), delay = R(0, 1.2), sw = R(0.6, 1.4);
      s += `<line x1="${x}" y1="${y}" x2="${x - 8}" y2="${y + len}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"><animateTransform attributeName="transform" type="translate" values="0 0; 70 1260" dur="${dur}s" begin="-${delay}s" repeatCount="indefinite"/></line>`;
    }
    return s;
  }
  function svgHearts(n) {
    const HP = "M12 21 C12 21 3 14.5 3 8.6 C3 5.5 5.4 3 8.6 3 C10.4 3 12 4.2 12 4.2 C12 4.2 13.6 3 15.4 3 C18.6 3 21 5.5 21 8.6 C21 14.5 12 21 12 21 Z";
    let s = "";
    for (let i = 0; i < n; i++) {
      const x = R(120, 1480), sc = R(0.5, 1.3), dur = R(9, 17), delay = R(0, 14), op = R(0.15, 0.5);
      s += `<g opacity="${op}"><path d="${HP}" fill="#ff9ec4" transform="scale(${sc})"/><animateTransform attributeName="transform" type="translate" values="${x} 960; ${x + R(-70, 70)} -100" dur="${dur}s" begin="-${delay}s" repeatCount="indefinite"/></g>`;
    }
    return s;
  }
  const cloud = (x, y, w, o, dur) => {
    const h = w * 0.42;
    return `<g opacity="${o}"><ellipse cx="${x}" cy="${y}" rx="${w}" ry="${h}" fill="#ffe7d6"/><ellipse cx="${x + w * 0.5}" cy="${y + h * 0.3}" rx="${w * 0.7}" ry="${h * 0.8}" fill="#ffdccb"/><ellipse cx="${x - w * 0.45}" cy="${y + h * 0.25}" rx="${w * 0.55}" ry="${h * 0.7}" fill="#ffe0d0"/><animateTransform attributeName="transform" type="translate" values="0 0; ${w * 0.4} 0; 0 0" dur="${dur}s" repeatCount="indefinite"/></g>`;
  };
  const sparkle = (x, y, s) =>
    `<path d="M${x} ${y - s} L${x + s * 0.26} ${y - s * 0.26} L${x + s} ${y} L${x + s * 0.26} ${y + s * 0.26} L${x} ${y + s} L${x - s * 0.26} ${y + s * 0.26} L${x - s} ${y} L${x - s * 0.26} ${y - s * 0.26} Z" fill="#fff6fb"><animate attributeName="opacity" values="0.2;1;0.2" dur="${R(3, 6)}s" begin="-${R(0, 3)}s" repeatCount="indefinite"/></path>`;

  const SVG_OPEN = `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">`;

  function animeScene() {
    const clouds = [[220, 190, 170, 0.5, 60], [560, 130, 150, 0.42, 82], [1030, 230, 200, 0.45, 54], [1360, 160, 140, 0.35, 72]]
      .map((c) => cloud(...c)).join("");
    const birds = [[300, 210], [356, 230], [412, 205], [1180, 165], [1236, 185]]
      .map(([x, y]) => `<path d="M${x} ${y} q10 -11 20 0 q10 -11 20 0" stroke="#241a30" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.5"/>`).join("");
    return `${SVG_OPEN}
      <defs>
        <linearGradient id="an-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#574a86"/><stop offset="0.38" stop-color="#c96f95"/>
          <stop offset="0.68" stop-color="#ff9c73"/><stop offset="1" stop-color="#ffd79e"/>
        </linearGradient>
        <radialGradient id="an-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#fff8ea"/><stop offset="0.45" stop-color="#ffe0a4"/>
          <stop offset="1" stop-color="#ffb877" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#an-sky)"/>
      <circle cx="1060" cy="560" r="400" fill="url(#an-sun)" opacity="0.8"/>
      <circle cx="1060" cy="560" r="118" fill="#fff2d6" opacity="0.95"/>
      ${clouds}${birds}
      <path d="M0 690 Q 380 630 780 680 T 1600 665 L1600 900 L0 900 Z" fill="#8a5580" opacity="0.5"/>
      <path d="M0 760 Q 460 700 980 755 T 1600 745 L1600 900 L0 900 Z" fill="#4a3358" opacity="0.85"/>
      <path d="M0 820 Q 520 780 1080 815 T 1600 805 L1600 900 L0 900 Z" fill="#281a34"/>
      <g stroke="#1c1226" stroke-width="6" opacity="0.9">
        <line x1="250" y1="520" x2="250" y2="820"/><line x1="188" y1="560" x2="312" y2="560"/><line x1="204" y1="600" x2="296" y2="600"/>
      </g>
      <path d="M130 566 C 420 560 920 556 1500 548" stroke="#1c1226" stroke-width="2" fill="none" opacity="0.7"/>
      <path d="M130 606 C 420 602 920 598 1500 592" stroke="#1c1226" stroke-width="2" fill="none" opacity="0.7"/>
    </svg>`;
  }

  function kpopScene() {
    const stars = svgStars(60, { colors: ["#ffffff", "#ffd9f2", "#d5e4ff", "#fff2c2"] });
    const sparkles = [[250, 180, 18], [520, 260, 12], [1180, 150, 20], [1360, 300, 14], [820, 120, 16]].map((s) => sparkle(...s)).join("");
    const hearts = svgHearts(10);
    let sky = "", x = 0;
    while (x < 1600) {
      const w = R(60, 120), bh = R(90, 250), by = 900 - bh;
      sky += `<rect x="${x}" y="${by}" width="${w}" height="${bh}" fill="#120a24"/>`;
      for (let wy = by + 16; wy < 884; wy += 26)
        for (let wx = x + 10; wx < x + w - 10; wx += 22)
          if (Math.random() < 0.32) sky += `<rect x="${wx}" y="${wy}" width="7" height="9" fill="#ffd98a" opacity="${R(0.4, 0.9)}"/>`;
      x += w + R(4, 16);
    }
    return `${SVG_OPEN}
      <defs>
        <linearGradient id="kp-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#160c2b"/><stop offset="0.5" stop-color="#38235c"/><stop offset="1" stop-color="#182747"/></linearGradient>
        <radialGradient id="kp-moon" cx="0.4" cy="0.4" r="0.6"><stop offset="0" stop-color="#fff6fb"/><stop offset="0.7" stop-color="#ffd9ef"/><stop offset="1" stop-color="#e5a7d8" stop-opacity="0"/></radialGradient>
        <radialGradient id="kp-glow" cx="0.5" cy="1" r="0.85"><stop offset="0" stop-color="#7c5cff" stop-opacity="0.45"/><stop offset="1" stop-color="#7c5cff" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#kp-sky)"/>
      ${stars}
      <circle cx="1250" cy="230" r="240" fill="url(#kp-moon)" opacity="0.7"/>
      <circle cx="1250" cy="230" r="88" fill="#fff4fa"/>
      ${sparkles}
      <rect width="1600" height="900" fill="url(#kp-glow)"/>
      ${sky}${hearts}
    </svg>`;
  }

  function kdramaScene() {
    const rain = svgRain(80);
    let bokeh = "";
    for (let i = 0; i < 14; i++) bokeh += `<circle cx="${R(0, 1600)}" cy="${R(400, 880)}" r="${R(8, 34)}" fill="#cfe0e0" opacity="${R(0.04, 0.14)}"/>`;
    return `${SVG_OPEN}
      <defs>
        <linearGradient id="kd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12222a"/><stop offset="0.5" stop-color="#26363d"/><stop offset="1" stop-color="#16201f"/></linearGradient>
        <radialGradient id="kd-lamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffe6bf" stop-opacity="0.55"/><stop offset="1" stop-color="#ffe6bf" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#kd-sky)"/>
      <ellipse cx="800" cy="520" rx="1200" ry="120" fill="#3a4a50" opacity="0.22"><animateTransform attributeName="transform" type="translate" values="-60 0; 60 0; -60 0" dur="30s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="500" cy="650" rx="1000" ry="90" fill="#2a383e" opacity="0.3"/>
      ${bokeh}
      <g><line x1="1360" y1="360" x2="1360" y2="884" stroke="#0e1719" stroke-width="10"/><path d="M1360 360 q -60 0 -72 42" stroke="#0e1719" stroke-width="8" fill="none"/><circle cx="1286" cy="412" r="190" fill="url(#kd-lamp)"/><circle cx="1286" cy="412" r="15" fill="#ffdca6"/></g>
      ${rain}
      <rect x="0" y="822" width="1600" height="80" fill="#0e1719" opacity="0.5"/>
      <ellipse cx="1286" cy="862" rx="120" ry="18" fill="#ffdca6" opacity="0.15"/>
    </svg>`;
  }

  function lofiScene() {
    const g = { x: 250, y: 90, w: 1100, h: 600 }; // window glass opening
    // Rain falling behind the glass (cool, subtle, slanted).
    let rain = "";
    for (let i = 0; i < 46; i++) {
      const x = R(g.x, g.x + g.w), y = R(g.y - 120, g.y + g.h), len = R(14, 26), dur = R(0.7, 1.3), delay = R(0, 1.2), sw = R(0.6, 1.3);
      rain += `<line x1="${x}" y1="${y}" x2="${x - 6}" y2="${y + len}" stroke="rgba(190,215,235,0.28)" stroke-width="${sw}" stroke-linecap="round"><animateTransform attributeName="transform" type="translate" values="0 0; 60 900" dur="${dur}s" begin="-${delay}s" repeatCount="indefinite"/></line>`;
    }
    // Distant city bokeh (soft, breathing lights near the horizon).
    let bok = "";
    const bcols = ["#ffd9a0", "#ffc27a", "#a9c9e6", "#cfe0f0", "#f0b0c0"];
    for (let i = 0; i < 16; i++) {
      const cx = R(g.x + 20, g.x + g.w - 20), cy = R(g.y + g.h * 0.5, g.y + g.h - 30), r = R(5, 22);
      const c = bcols[Math.floor(Math.random() * bcols.length)], op = R(0.08, 0.26);
      bok += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" opacity="${op}"><animate attributeName="opacity" values="${(op * 0.55).toFixed(2)};${op.toFixed(2)};${(op * 0.55).toFixed(2)}" dur="${R(3, 7)}s" begin="-${R(0, 4)}s" repeatCount="indefinite"/></circle>`;
    }
    // Distant skyline silhouette with a few lit windows.
    let sky = "", sx = g.x;
    while (sx < g.x + g.w) {
      const w = R(30, 70), bh = R(30, 110), by = g.y + g.h - bh;
      sky += `<rect x="${sx}" y="${by}" width="${w}" height="${bh}" fill="#0e1a2a"/>`;
      if (Math.random() < 0.6) sky += `<rect x="${(sx + w * 0.35).toFixed(1)}" y="${(by + 10).toFixed(1)}" width="5" height="6" fill="#ffcf8a" opacity="${R(0.3, 0.7)}"/>`;
      sx += w + R(2, 10);
    }
    // Rain ON the glass: static droplets (with a highlight) + running streaks.
    let drops = "";
    for (let i = 0; i < 46; i++) {
      const cx = R(g.x, g.x + g.w), cy = R(g.y, g.y + g.h), r = R(1.5, 4.2);
      drops += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(206,224,240,0.20)"/><circle cx="${(cx - r * 0.3).toFixed(1)}" cy="${(cy - r * 0.3).toFixed(1)}" r="${(r * 0.35).toFixed(1)}" fill="rgba(255,255,255,0.45)"/>`;
    }
    let streaks = "";
    for (let i = 0; i < 9; i++) {
      const x = R(g.x + 20, g.x + g.w - 20), y = R(g.y, g.y + g.h * 0.45), len = R(28, 80), dur = R(4.5, 9), delay = R(0, 8), op = R(0.28, 0.5);
      streaks += `<g><rect x="${x}" y="${y}" width="2" height="${len}" rx="1" fill="rgba(210,226,242,0.5)"/><circle cx="${x + 1}" cy="${y + len}" r="${R(2, 3.4)}" fill="rgba(222,236,250,0.6)"/><animateTransform attributeName="transform" type="translate" values="0 0; 0 ${R(130, 260)}" dur="${dur}s" begin="-${delay}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;${op.toFixed(2)};0" dur="${dur}s" begin="-${delay}s" repeatCount="indefinite"/></g>`;
    }
    // Foreground props resting on the sill.
    const plant = `<g transform="translate(1080 470)">
        <path d="M60 150 C 8 92 -2 20 40 -22 C 56 30 72 92 72 150 Z" fill="#20160f"/>
        <path d="M72 150 C 62 72 84 8 134 -12 C 122 52 112 112 92 150 Z" fill="#2a1d13"/>
        <path d="M66 150 C 66 80 98 28 164 30 C 132 82 112 122 96 150 Z" fill="#191008"/>
        <path d="M58 150 C 52 92 16 62 -34 72 C 6 102 40 132 60 150 Z" fill="#241811"/>
        <path d="M30 150 L150 150 L138 236 L42 236 Z" fill="#3a271a"/>
        <rect x="22" y="140" width="136" height="22" rx="5" fill="#4a3320"/>
      </g>`;
    const mug = `<g transform="translate(330 640)">
        <path d="M64 8 q28 2 28 24 q0 22 -28 22" fill="none" stroke="#241812" stroke-width="9"/>
        <rect x="0" y="4" width="66" height="56" rx="10" fill="#2c1e15"/>
        <ellipse cx="33" cy="6" rx="33" ry="8" fill="#170f0a"/>
        <path d="M22 -4 q-11 -16 0 -34 q11 -16 0 -34" stroke="rgba(255,241,222,0.32)" stroke-width="4" fill="none" stroke-linecap="round"><animate attributeName="opacity" values="0.08;0.4;0.08" dur="4.5s" repeatCount="indefinite"/></path>
        <path d="M44 -4 q11 -16 0 -34 q-11 -16 0 -34" stroke="rgba(255,241,222,0.26)" stroke-width="4" fill="none" stroke-linecap="round"><animate attributeName="opacity" values="0.34;0.06;0.34" dur="5.5s" repeatCount="indefinite"/></path>
      </g>`;
    return `${SVG_OPEN}
      <defs>
        <linearGradient id="cw-wall" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#1f1620"/><stop offset="0.55" stop-color="#34241f"/><stop offset="1" stop-color="#48342a"/></linearGradient>
        <radialGradient id="cw-lamp" cx="0.16" cy="0.2" r="0.72"><stop offset="0" stop-color="#ffcf8a" stop-opacity="0.32"/><stop offset="1" stop-color="#ffcf8a" stop-opacity="0"/></radialGradient>
        <linearGradient id="cw-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10203a"/><stop offset="0.55" stop-color="#1b3350"/><stop offset="1" stop-color="#24435f"/></linearGradient>
        <linearGradient id="cw-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3c2a1c"/><stop offset="1" stop-color="#22150d"/></linearGradient>
        <linearGradient id="cw-sill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3d28"/><stop offset="1" stop-color="#3a271a"/></linearGradient>
        <clipPath id="cw-glass"><rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="10"/></clipPath>
      </defs>
      <rect width="1600" height="900" fill="url(#cw-wall)"/>
      <rect width="1600" height="900" fill="url(#cw-lamp)"/>
      <g clip-path="url(#cw-glass)">
        <rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" fill="url(#cw-night)"/>
        ${bok}${sky}${rain}${drops}${streaks}
        <rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" fill="#0a1524" opacity="0.12"/>
      </g>
      <rect x="608" y="${g.y}" width="16" height="${g.h}" fill="url(#cw-wood)"/>
      <rect x="976" y="${g.y}" width="16" height="${g.h}" fill="url(#cw-wood)"/>
      <rect x="${g.x}" y="382" width="${g.w}" height="16" fill="url(#cw-wood)"/>
      <rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="12" fill="none" stroke="url(#cw-wood)" stroke-width="34"/>
      <rect x="200" y="700" width="1200" height="26" fill="url(#cw-sill)"/>
      <rect x="200" y="726" width="1200" height="30" fill="#1a1109"/>
      ${plant}${mug}
      <rect width="1600" height="900" fill="url(#cw-lamp)"/>
    </svg>`;
  }

  const SCENE_SVG = {};
  function buildScenes() {
    SCENE_SVG.anime = animeScene();
    SCENE_SVG.kpop = kpopScene();
    SCENE_SVG.kdrama = kdramaScene();
    SCENE_SVG.lofi = lofiScene();
  }

  // Scene metadata: label + badge icon + accent glow (rgb) + how much of the
  // blurred cover shows behind (0 = pure scene art, 1 = full cover).
  const SCENES = {
    anime:   { label: "Slice-of-Life Sunset", icon: "🌇", glow: "255,180,140", blur: 0 },
    kpop:    { label: "K-Pop Neon Night",     icon: "✦",  glow: "200,150,255", blur: 0 },
    kdrama:  { label: "K-Drama Rain",         icon: "🌧", glow: "150,200,205", blur: 0 },
    lofi:    { label: "Lo-Fi Rainy Window",   icon: "☕", glow: "230,175,120", blur: 0 },
    default: { label: "Album Aura",           icon: "💿", glow: "180,170,255", blur: 1 },
  };
  const CYCLE = ["auto", "anime", "kpop", "lofi", "kdrama", "default"];

  // ---------------------------------------------------------------------------
  // 3. Scene detection from track metadata.
  // ---------------------------------------------------------------------------
  const KPOP_ARTISTS = ["bts", "blackpink", "twice", "stray kids", "newjeans", "new jeans", "le sserafim", "seventeen", "iu", "aespa", "txt", "tomorrow x together", "red velvet", "itzy", "exo", "nct", "ateez", "(g)i-dle", "g-idle", "gidle", "ive", "riize", "illit", "enhypen", "day6", "bigbang", "mamamoo", "gfriend", "kep1er", "zerobaseone", "zb1", "nmixx", "baekhyun", "taeyeon", "jungkook", "jimin", "rosé", "rose", "jennie", "lisa", "psy", "got7", "shinee", "super junior", "monsta x", "tomorrow", "kiss of life", "babymonster", "meovv"];
  const ANIME_ARTISTS = ["yoasobi", "lisa", "aimer", "radwimps", "kenshi yonezu", "yonezu", "eve", "reol", "ado", "vaundy", "fujii kaze", "king gnu", "mrs. green apple", "official hige", "yorushika", "zutomayo", "milet", "supercell", "joe hisaishi", "hiroyuki sawano", "aimyon", "tuyu", "chihiro", "kessoku band", "myth & roid", "flow", "lisa (jp)", "wagakki"];
  const LOFI_HINTS = /lo-?fi|chillhop|chill\s?beats|beats to (relax|study)|study\s?beats|jazzhop|jazz\s?hop|\brainy?\b|sleep|to study|to relax|nujabes|instrumental beat/;

  const HANGUL = /[가-힣ᄀ-ᇿ㄰-㆏]/;
  const KANA = /[぀-ゟ゠-ヿ]/;
  const includesAny = (hay, list) => list.some((a) => hay.includes(a));

  function detectScene(t) {
    const raw = `${t.title} ${t.artist} ${t.album}`;
    const hay = raw.toLowerCase();
    const isOST = /\bost\b|original\s+soundtrack|드라마/.test(hay);
    if (isOST) return KANA.test(raw) ? "anime" : "kdrama";
    if (KANA.test(raw) || /\banime\b|ghibli|amv|vocaloid|city\s?pop|\bop\b|\bost\b/.test(hay) || includesAny(hay, ANIME_ARTISTS)) return "anime";
    if (HANGUL.test(raw) || /k-?pop/.test(hay) || includesAny(hay, KPOP_ARTISTS)) return "kpop";
    if (LOFI_HINTS.test(hay)) return "lofi";
    return "default";
  }

  // ---------------------------------------------------------------------------
  // 4. Styles.
  // ---------------------------------------------------------------------------
  function injectStyle() {
    if (document.getElementById(ID.style)) return;
    const style = document.createElement("style");
    style.id = ID.style;
    style.textContent = `
      #${ID.overlay} {
        position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 99999;
        opacity: 0; visibility: hidden; pointer-events: none;
        transition: opacity .55s ease, visibility 0s linear .55s;
        overflow: hidden; font-family: ${FONT_SANS};
        --zen-glow: 180,170,255; cursor: default;
      }
      #${ID.overlay}.zen-open { opacity: 1; visibility: visible; pointer-events: auto; transition: opacity .55s ease; }

      .zen-layer { position: absolute; inset: 0; }
      #zen-bg-blur {
        width: 100%; height: 100%; object-fit: cover; transform: scale(1.18);
        filter: blur(46px) saturate(1.35) brightness(0.62);
        opacity: 1; transition: opacity 1.1s ease;
        animation: zenBreathe 26s ease-in-out infinite alternate; will-change: opacity, transform;
      }
      #zen-bg-scene {
        opacity: 0; transition: opacity 1s ease;
        animation: zenScenePan 46s ease-in-out infinite alternate; will-change: opacity, transform;
      }
      #zen-bg-scene svg { width: 100%; height: 100%; display: block; }
      #zen-scrim {
        background:
          radial-gradient(circle at 50% 42%, transparent 30%, rgba(0,0,0,0.34) 78%, rgba(0,0,0,0.6) 100%),
          linear-gradient(to top, rgba(0,0,0,0.5), transparent 34%);
        pointer-events: none;
      }
      .zen-orb { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.42; pointer-events: none; mix-blend-mode: screen; }
      .zen-orb.o1 { width: 40vmin; height: 40vmin; left: -8vmin; top: 8vmin; background: rgba(var(--zen-glow),0.5); animation: zenDrift1 34s ease-in-out infinite alternate; }
      .zen-orb.o2 { width: 32vmin; height: 32vmin; right: -6vmin; bottom: 6vmin; background: rgba(255,190,210,0.35); animation: zenDrift2 40s ease-in-out infinite alternate; }

      #zen-content {
        position: relative; z-index: 3; height: 100%; width: 100%;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: clamp(18px, 3.2vh, 40px); text-align: center; user-select: none; pointer-events: none;
      }
      #zen-cover-wrap { position: relative; pointer-events: auto; cursor: pointer; animation: zenFloat 8.5s ease-in-out infinite; }
      #zen-cover {
        width: min(46vh, 42vw); height: min(46vh, 42vw); max-width: 520px; max-height: 520px;
        object-fit: cover; border-radius: 28px;
        box-shadow: 0 2px 0 rgba(255,255,255,0.10) inset, 0 34px 90px rgba(0,0,0,0.55), 0 14px 40px rgba(0,0,0,0.45), 0 0 70px rgba(var(--zen-glow),0.28);
        transition: transform .4s cubic-bezier(.2,.8,.2,1), box-shadow .5s ease, opacity .5s ease; backdrop-filter: blur(4px);
      }
      #zen-cover-wrap::after { content: ""; position: absolute; inset: 0; border-radius: 28px; pointer-events: none;
        box-shadow: 0 0 0 1px rgba(255,255,255,0.14) inset; background: linear-gradient(135deg, rgba(255,255,255,0.16), transparent 42%); }
      #zen-cover-wrap:hover #zen-cover { transform: scale(1.02); }
      #zen-cover.zen-swap { opacity: 0; transform: scale(0.97); }
      #zen-play-hint { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .3s ease; pointer-events: none; }
      #zen-cover-wrap:hover #zen-play-hint { opacity: 1; }
      #zen-play-hint svg { width: 68px; height: 68px; fill: #fff; filter: drop-shadow(0 6px 20px rgba(0,0,0,.5)); }

      #zen-meta { pointer-events: none; max-width: min(84vw, 900px); }
      #zen-title {
        font-family: ${FONT_DISPLAY}; font-weight: 600; line-height: 1.07; letter-spacing: 0.4px;
        color: #fbf7ff; margin: 0; text-shadow: 0 4px 30px rgba(0,0,0,0.5);
        overflow-wrap: anywhere; word-break: break-word;
        display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
        font-size: clamp(30px, 4.6vw, 66px); /* default (medium) */
      }
      #zen-title.len-s  { font-size: clamp(34px, 5.6vw, 82px); }
      #zen-title.len-m  { font-size: clamp(30px, 4.4vw, 62px); }
      #zen-title.len-l  { font-size: clamp(26px, 3.4vw, 48px); -webkit-line-clamp: 2; }
      #zen-title.len-xl { font-size: clamp(22px, 2.6vw, 38px); -webkit-line-clamp: 2; letter-spacing: 0.2px; }
      #zen-artist {
        font-family: ${FONT_SANS}; font-weight: 300; font-size: clamp(15px, 1.7vw, 24px);
        letter-spacing: 5px; text-transform: uppercase; color: rgba(255,255,255,0.72);
        margin: clamp(10px, 1.6vh, 20px) auto 0; max-width: min(80vw, 780px); overflow-wrap: anywhere;
      }
      #zen-artist.tight { letter-spacing: 2px; font-size: clamp(14px, 1.3vw, 18px); }

      #zen-controls { position: absolute; left: 50%; bottom: clamp(28px, 5vh, 64px); transform: translateX(-50%); z-index: 4;
        display: flex; flex-direction: column; align-items: center; gap: 16px; width: min(60vw, 640px);
        opacity: 0; transition: opacity .5s ease; pointer-events: none; }
      #${ID.overlay}.zen-ui #zen-controls { opacity: 1; pointer-events: auto; }
      #zen-progress { width: 100%; height: 4px; border-radius: 4px; background: rgba(255,255,255,0.18); overflow: hidden; cursor: pointer; }
      #zen-progress-fill { height: 100%; width: 0%; border-radius: 4px; background: rgba(255,255,255,0.9); box-shadow: 0 0 12px rgba(var(--zen-glow),0.8); transition: width .18s linear; }
      #zen-times { display: flex; justify-content: space-between; width: 100%; font-size: 12px; letter-spacing: 1px; color: rgba(255,255,255,0.55); margin-top: -6px; }
      #zen-buttons { display: flex; align-items: center; gap: 26px; }
      .zen-ctrl { background: none; border: none; padding: 8px; cursor: pointer; color: rgba(255,255,255,0.85); display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: transform .2s ease, color .2s ease, background .2s ease; }
      .zen-ctrl:hover { color: #fff; transform: scale(1.12); background: rgba(255,255,255,0.08); }
      .zen-ctrl svg { fill: currentColor; }
      .zen-ctrl.side svg { width: 26px; height: 26px; }
      #zen-playpause { width: 60px; height: 60px; background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.18); }
      #zen-playpause svg { width: 26px; height: 26px; }

      /* scene badge (top-left) — click to cycle / force a scene */
      #zen-badge { position: absolute; top: clamp(20px, 3vh, 36px); left: clamp(22px, 3vw, 46px); z-index: 5;
        display: flex; align-items: center; gap: 9px; padding: 8px 15px; border-radius: 999px;
        background: rgba(20,20,32,0.42); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.14);
        font-size: 12.5px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.82);
        cursor: pointer; pointer-events: auto; opacity: 0; transition: opacity .5s ease, transform .2s ease; }
      #${ID.overlay}.zen-ui #zen-badge { opacity: 1; }
      #zen-badge:hover { transform: scale(1.04); color: #fff; }
      #zen-badge .zen-badge-icon { font-size: 15px; }
      #zen-badge .zen-badge-mode { opacity: 0.55; font-size: 10px; letter-spacing: 1px; }

      #zen-exit { position: absolute; top: clamp(20px, 3vh, 36px); right: clamp(22px, 3vw, 46px); z-index: 5;
        font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.4);
        opacity: 0; transition: opacity .5s ease; pointer-events: none; display: flex; align-items: center; gap: 8px; }
      #${ID.overlay}.zen-ui #zen-exit { opacity: 1; }
      #zen-exit svg { width: 14px; height: 14px; fill: currentColor; }

      .zen-btn-active { color: var(--spice-button-active, #1ed760) !important; }

      @keyframes zenFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
      @keyframes zenBreathe { 0% { transform: scale(1.14); } 100% { transform: scale(1.24); } }
      @keyframes zenScenePan { 0% { transform: scale(1.06) translate(-1%, -1%); } 100% { transform: scale(1.12) translate(1.5%, 1%); } }
      @keyframes zenDrift1 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(16vmin,10vmin) scale(1.25); } }
      @keyframes zenDrift2 { 0% { transform: translate(0,0) scale(1.1); } 100% { transform: translate(-14vmin,-8vmin) scale(0.9); } }
      @media (prefers-reduced-motion: reduce) { #zen-cover-wrap, #zen-bg-blur, #zen-bg-scene, .zen-orb { animation: none !important; } }
    `;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // 5. Icons + overlay DOM.
  // ---------------------------------------------------------------------------
  const SVG = {
    moon: `<svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 1.3A7 7 0 1 0 14.7 10 5.6 5.6 0 0 1 6 1.3z"/></svg>`,
    play: `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>`,
    prev: `<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zM9.5 12l8.5 6V6z"/></svg>`,
    next: `<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 6v12l8.5-6z"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"/></svg>`,
  };

  let overlay, coverImg, bgBlur, sceneLayer, titleEl, artistEl, ppBtn, fillEl, curEl, durEl, badgeEl, badgeLabel, badgeMode;

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.id = ID.overlay;
    overlay.innerHTML = `
      <img id="zen-bg-blur" class="zen-layer" alt="" />
      <div id="zen-bg-scene" class="zen-layer"></div>
      <div class="zen-orb o1"></div>
      <div class="zen-orb o2"></div>
      <div id="zen-scrim" class="zen-layer"></div>

      <div id="zen-badge" title="Szene wechseln (klicken) · Auto ↔ manuell">
        <span class="zen-badge-icon">✦</span>
        <span class="zen-badge-label">Auto</span>
        <span class="zen-badge-mode">AUTO</span>
      </div>
      <div id="zen-exit">${SVG.close}<span>Klicken zum Schließen · Esc</span></div>

      <div id="zen-content">
        <div id="zen-cover-wrap" title="Play / Pause">
          <img id="zen-cover" alt="Album cover" />
          <div id="zen-play-hint">${SVG.play}</div>
        </div>
        <div id="zen-meta">
          <h1 id="zen-title">—</h1>
          <p id="zen-artist"></p>
        </div>
      </div>

      <div id="zen-controls">
        <div id="zen-progress"><div id="zen-progress-fill"></div></div>
        <div id="zen-times"><span id="zen-cur">0:00</span><span id="zen-dur">0:00</span></div>
        <div id="zen-buttons">
          <button class="zen-ctrl side" id="zen-prev" title="Vorheriger Titel">${SVG.prev}</button>
          <button class="zen-ctrl" id="zen-playpause" title="Play / Pause">${SVG.play}</button>
          <button class="zen-ctrl side" id="zen-next" title="Nächster Titel">${SVG.next}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const $ = (s) => overlay.querySelector(s);
    coverImg = $("#zen-cover"); bgBlur = $("#zen-bg-blur"); sceneLayer = $("#zen-bg-scene");
    titleEl = $("#zen-title"); artistEl = $("#zen-artist"); ppBtn = $("#zen-playpause");
    fillEl = $("#zen-progress-fill"); curEl = $("#zen-cur"); durEl = $("#zen-dur");
    badgeEl = $("#zen-badge"); badgeLabel = $(".zen-badge-label"); badgeMode = $(".zen-badge-mode");

    // Any click that reaches the overlay itself = an empty area → close.
    // (Interactive children below stopPropagation, so they never reach here.)
    overlay.addEventListener("click", closeZen);
    $("#zen-cover-wrap").addEventListener("click", (e) => { e.stopPropagation(); Spicetify.Player.togglePlay(); });
    ppBtn.addEventListener("click", (e) => { e.stopPropagation(); Spicetify.Player.togglePlay(); });
    $("#zen-prev").addEventListener("click", (e) => { e.stopPropagation(); Spicetify.Player.back(); });
    $("#zen-next").addEventListener("click", (e) => { e.stopPropagation(); Spicetify.Player.next(); });
    $("#zen-progress").addEventListener("click", (e) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const dur = Spicetify.Player.getDuration();
      if (dur) Spicetify.Player.seek(pct * dur);
    });
    badgeEl.addEventListener("click", (e) => { e.stopPropagation(); cycleScene(); });

    overlay.addEventListener("mousemove", revealUI);
  }

  // ---------------------------------------------------------------------------
  // 6. Track reading + rendering.
  // ---------------------------------------------------------------------------
  function spotifyImageToUrl(u) {
    if (!u) return "";
    return u.startsWith("spotify:image:") ? "https://i.scdn.co/image/" + u.slice(14) : u;
  }
  function getCurrentTrack() {
    const data = Spicetify.Player.data || {};
    const item = data.item || data.track || {};
    const meta = item.metadata || {};
    const title = meta.title || item.name || "Nichts wird abgespielt";
    let artist = meta.artist_name || "";
    let i = 1;
    while (meta["artist_name:" + i]) { artist += (artist ? ", " : "") + meta["artist_name:" + i]; i++; }
    if (!artist && Array.isArray(item.artists)) artist = item.artists.map((a) => a.name).join(", ");
    const album = meta.album_title || (item.album && item.album.name) || "";
    const rawImg = meta.image_xlarge_url || meta.image_large_url || meta.image_url || meta.image_small_url ||
      (item.images && item.images[0] && item.images[0].url) || "";
    return { title, artist: artist || "Unbekannter Künstler", album, image: spotifyImageToUrl(rawImg) };
  }

  function applyTitleFit(title) {
    const len = (title || "").length;
    const cls = len > 44 ? "len-xl" : len > 28 ? "len-l" : len > 15 ? "len-m" : "len-s";
    titleEl.classList.remove("len-s", "len-m", "len-l", "len-xl");
    titleEl.classList.add(cls);
  }
  function applyArtistFit(artist) {
    artistEl.classList.toggle("tight", (artist || "").length > 32);
  }

  // ---- scene state ----
  let sceneMode = "auto";     // "auto" or a forced scene key
  let lastTrack = null;
  let currentSVGKey = null;

  function resolveSceneKey(track) {
    return sceneMode === "auto" ? detectScene(track) : sceneMode;
  }
  function applyScene(track) {
    const key = resolveSceneKey(track);
    const scene = SCENES[key] || SCENES.default;
    if (key === "default") {
      sceneLayer.style.opacity = "0";
      bgBlur.style.opacity = "1";
    } else {
      if (currentSVGKey !== key) { sceneLayer.innerHTML = SCENE_SVG[key] || ""; currentSVGKey = key; }
      sceneLayer.style.opacity = "1";
      bgBlur.style.opacity = String(scene.blur);
    }
    overlay.style.setProperty("--zen-glow", scene.glow);
    badgeEl.querySelector(".zen-badge-icon").textContent = scene.icon;
    badgeLabel.textContent = scene.label;
    badgeMode.textContent = sceneMode === "auto" ? "AUTO" : "MANUELL";
    console.log(`[Zen Mode] scene: ${key} (${sceneMode}) · ${track.title} — ${track.artist}`);
  }
  function cycleScene() {
    const idx = CYCLE.indexOf(sceneMode);
    sceneMode = CYCLE[(idx + 1) % CYCLE.length];
    if (lastTrack) applyScene(lastTrack);
    revealUI();
  }

  function crossfadeImg(imgEl, url) {
    if (!url || imgEl.src === url) return;
    const pre = new Image();
    pre.onload = () => {
      imgEl.classList.add("zen-swap");
      setTimeout(() => { imgEl.src = url; requestAnimationFrame(() => imgEl.classList.remove("zen-swap")); }, 180);
    };
    pre.onerror = () => { imgEl.src = url; };
    pre.src = url;
  }

  function renderTrack() {
    const track = getCurrentTrack();
    lastTrack = track;
    titleEl.textContent = track.title;
    artistEl.textContent = track.artist;
    applyTitleFit(track.title);
    applyArtistFit(track.artist);
    crossfadeImg(coverImg, track.image);
    crossfadeImg(bgBlur, track.image);
    applyScene(track);
    syncPlayState();
    syncProgress();
  }

  // ---------------------------------------------------------------------------
  // 7. Playback / progress.
  // ---------------------------------------------------------------------------
  function fmt(ms) { if (!ms || ms < 0) ms = 0; const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
  function syncPlayState() {
    const playing = Spicetify.Player.isPlaying();
    ppBtn.innerHTML = playing ? SVG.pause : SVG.play;
    overlay.querySelector("#zen-play-hint").innerHTML = playing ? SVG.pause : SVG.play;
  }
  function syncProgress() {
    const dur = Spicetify.Player.getDuration() || 0, cur = Spicetify.Player.getProgress() || 0;
    fillEl.style.width = dur ? `${(cur / dur) * 100}%` : "0%";
    curEl.textContent = fmt(cur); durEl.textContent = fmt(dur);
  }

  let uiTimer = null;
  function revealUI() { overlay.classList.add("zen-ui"); clearTimeout(uiTimer); uiTimer = setTimeout(() => overlay.classList.remove("zen-ui"), 2600); }

  // ---------------------------------------------------------------------------
  // 8. Open / close.
  // ---------------------------------------------------------------------------
  let progressTimer = null, isOpen = false;
  function openZen() {
    if (isOpen) return; isOpen = true;
    injectFont(); renderTrack();
    overlay.classList.add("zen-open"); revealUI();
    zenButton.element.classList.add("zen-btn-active");
    if (zenButton.active !== undefined) zenButton.active = true;
    progressTimer = setInterval(syncProgress, 500);
    document.addEventListener("keydown", onKeydown, true);
  }
  function closeZen() {
    if (!isOpen) return; isOpen = false;
    overlay.classList.remove("zen-open", "zen-ui");
    zenButton.element.classList.remove("zen-btn-active");
    if (zenButton.active !== undefined) zenButton.active = false;
    clearInterval(progressTimer); progressTimer = null;
    document.removeEventListener("keydown", onKeydown, true);
  }
  function toggleZen() { isOpen ? closeZen() : openZen(); }
  function onKeydown(e) { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeZen(); } }

  // ---------------------------------------------------------------------------
  // 9. Boot.
  // ---------------------------------------------------------------------------
  injectStyle();
  buildScenes();
  buildOverlay();

  Spicetify.Player.addEventListener("songchange", () => { if (isOpen) renderTrack(); });
  Spicetify.Player.addEventListener("onplaypause", () => { if (isOpen) syncPlayState(); });

  const zenButton = new Spicetify.Playbar.Button("Zen Mode", SVG.moon, toggleZen, false, false);
  zenButton.element.classList.add("zen-mode-toggle");

  // Global shortcut: F8 toggles Zen Mode. Registered as a single capture-phase
  // keydown on window — fires before page handlers and does NOT depend on
  // Spicetify.Mousetrap. (Ctrl+Z was dropped: Spotify's Electron shell swallows
  // it as the "Undo" edit-accelerator, so the keydown never reached us.)
  function onZenHotkey(e) {
    if (e.key !== "F8" && e.code !== "F8") return;
    const el = document.activeElement, tag = el && el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (el && el.isContentEditable)) return;
    e.preventDefault();
    toggleZen();
  }
  window.addEventListener("keydown", onZenHotkey, true);

  console.log("[Zen Mode] ready — playbar moon button or F8. Click the scene badge (top-left) to switch scenes.");
})();
