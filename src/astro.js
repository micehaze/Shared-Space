/* ============================================================
   Vice Space calculation engine — Vedic natal chart
   - Primary: Astronomy Engine (MIT, cosinekitty) when it loads and
     passes a self-test against the built-in engine.
   - Built-in: Meeus "Astronomical Algorithms" (Sun ch.25, Moon ch.47,
     sidereal time ch.12, obliquity ch.22) + JPL/Standish Keplerian
     elements for the planets (valid 1800–2050, degrades outside).
   - Sidereal zodiac via ayanamsa = value at reference epoch + IAU 2006
     general precession in longitude (matches Swiss Ephemeris modes to
     within arcseconds for modern dates).
   Nothing here is guessed by a language model: every value is computed.
   ============================================================ */
const Astro = (() => {
  const VERSION = 'vicespace-calc 1.0';
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const norm = (x) => ((x % 360) + 360) % 360;
  const sin = (d) => Math.sin(d * D2R), cos = (d) => Math.cos(d * D2R), tan = (d) => Math.tan(d * D2R);

  /* ---------- time ---------- */
  const jdFromMs = (ms) => ms / 86400000 + 2440587.5;
  function deltaT(year) {
    // Espenak & Meeus (2006) polynomial fits, seconds
    let t;
    if (year >= 2005 && year < 2050) { t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    if (year >= 1986 && year < 2005) { t = year - 2000; return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
    if (year >= 1961 && year < 1986) { t = year - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
    if (year >= 1941 && year < 1961) { t = year - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
    if (year >= 1920 && year < 1941) { t = year - 1920; return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t ** 3; }
    if (year >= 1900 && year < 1920) { t = year - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
    if (year >= 1860 && year < 1900) { t = year - 1860; return 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174; }
    const u = (year - 1820) / 100; return -20 + 32 * u * u;
  }

  /* ---------- Sun (Meeus ch.25, mean equinox of date) ---------- */
  function sunLon(T) {
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
    return norm(L0 + C - 0.00569); // true longitude + aberration, mean equinox of date (Meeus' -0.00478 sin Ω nutation term omitted)
  }

  /* ---------- nutation in longitude (deg), low precision ---------- */
  function nutLon(T) {
    const om = 125.04452 - 1934.136261 * T, Ls = 280.4665 + 36000.7698 * T, Lm = 218.3165 + 481267.8813 * T;
    return (-17.2 * sin(om) - 1.32 * sin(2 * Ls) - 0.23 * sin(2 * Lm) + 0.21 * sin(2 * om)) / 3600;
  }

  /* ---------- Moon (Meeus ch.47, main periodic terms) ---------- */
  const MOON_L = [
    [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618], [0, 1, 0, 0, -185116],
    [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066], [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758],
    [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720], [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528],
    [0, 0, 1, -2, 10980], [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
    [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036], [2, 0, 2, 0, 3994],
    [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689], [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390],
    [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236], [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048],
    [2, 0, 1, -2, -1773], [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110], [3, 0, -1, 0, -892],
    [2, 1, 1, 0, -810], [4, -1, -2, 0, 759], [0, 2, -1, 0, -713], [2, 2, -1, 0, -700], [2, 1, -2, 0, 691],
    [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537], [4, -1, 0, 0, 520], [1, 0, -2, 0, -487],
    [2, 1, 0, -2, -399], [0, 0, 2, -2, -381], [1, 1, 1, 0, 351], [3, 0, -2, 0, -340], [4, 0, -3, 0, 330],
    [2, -1, 2, 0, 327], [0, 2, 1, 0, -323], [1, 1, -1, 0, 299], [2, 0, 3, 0, 294],
  ];
  function moonArgs(T) {
    return {
      Lp: 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T ** 3 / 538841 - T ** 4 / 65194000,
      D: 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T ** 3 / 545868 - T ** 4 / 113065000,
      M: 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T ** 3 / 24490000,
      Mp: 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T ** 3 / 69699 - T ** 4 / 14712000,
      F: 93.272095 + 483202.0175233 * T - 0.0036539 * T * T - T ** 3 / 3526000 + T ** 4 / 863310000,
    };
  }
  function moonLon(T) {
    const { Lp, D, M, Mp, F } = moonArgs(T);
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    let s = 0;
    for (const [d, m, mp, f, c] of MOON_L) {
      const e = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
      s += c * e * sin(d * D + m * M + mp * Mp + f * F);
    }
    const A1 = 119.75 + 131.849 * T, A2 = 53.09 + 479264.29 * T;
    s += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
    return norm(Lp + s / 1e6); // geocentric, mean equinox of date
  }
  function meanNode(T) { return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T ** 3 / 467441 - T ** 4 / 60616000); }
  function trueNode(T) {
    const { D, M, Mp, F } = moonArgs(T);
    return norm(meanNode(T) - 1.4979 * sin(2 * (D - F)) - 0.15 * sin(M) - 0.1226 * sin(2 * D) + 0.1176 * sin(2 * F) - 0.0801 * sin(2 * (Mp - F)));
  }

  /* ---------- planets: JPL Keplerian elements (Standish), J2000 ecliptic ---------- */
  const EL = {
    Mercury: [[0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593], [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
    Venus: [[0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255], [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418]],
    Earth: [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0], [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0]],
    Mars: [[1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
    Jupiter: [[5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
    Saturn: [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
    Uranus: [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503], [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
    Neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
    Pluto: [[39.48211675, 0.2488273, 17.14001206, 238.92903833, 224.06891629, 110.30393684], [-0.00031596, 0.0000517, 0.00004818, 145.20780515, -0.04062942, -0.01183482]],
  };
  function helio(name, T) {
    const [e0, r] = EL[name];
    const [a, e, I, L, w, O] = e0.map((v, i) => v + r[i] * T);
    const om = w - O;
    let M = norm(L - w); if (M > 180) M -= 360;
    let E = M + R2D * e * sin(M);
    for (let i = 0; i < 12; i++) { const dE = (M - (E - R2D * e * sin(E))) / (1 - e * cos(E)); E += dE; if (Math.abs(dE) < 1e-9) break; }
    const xp = a * (cos(E) - e), yp = a * Math.sqrt(1 - e * e) * sin(E);
    const x = (cos(om) * cos(O) - sin(om) * sin(O) * cos(I)) * xp + (-sin(om) * cos(O) - cos(om) * sin(O) * cos(I)) * yp;
    const y = (cos(om) * sin(O) + sin(om) * cos(O) * cos(I)) * xp + (-sin(om) * sin(O) + cos(om) * cos(O) * cos(I)) * yp;
    const z = sin(om) * sin(I) * xp + cos(om) * sin(I) * yp;
    return [x, y, z];
  }
  const precJ2000toDate = (T) => (5028.796195 * T + 1.1054348 * T * T) / 3600; // general precession in longitude, deg
  function planetLon(name, T) {
    const earth = helio('Earth', T);
    let p = helio(name, T);
    // one light-time iteration
    const dist = Math.hypot(p[0] - earth[0], p[1] - earth[1], p[2] - earth[2]);
    p = helio(name, T - (dist * 0.0057755183) / 36525);
    const lon = Math.atan2(p[1] - earth[1], p[0] - earth[0]) * R2D;
    return norm(lon + precJ2000toDate(T) - 20.4898 / 3600); // to mean equinox of date, annual aberration (approx)
  }

  /* ---------- sidereal time & ascendant ---------- */
  function gmstDeg(jdUT) {
    const T = (jdUT - 2451545) / 36525;
    return norm(280.46061837 + 360.98564736629 * (jdUT - 2451545) + 0.000387933 * T * T - T ** 3 / 38710000);
  }
  const meanObliquity = (T) => 23.439291111 - (46.815 * T + 0.00059 * T * T - 0.001813 * T ** 3) / 3600;
  function ascendant(ramc, eps, lat) {
    return norm(Math.atan2(cos(ramc), -(sin(ramc) * cos(eps) + tan(lat) * sin(eps))) * R2D);
  }

  /* ---------- ayanamsa ---------- */
  const AYANAMSAS = {
    lahiri: { name: 'Lahiri (Chitrapaksha)', jd0: 2435553.5, a0: 23.250182778 - 0.004658035 },
    raman: { name: 'B. V. Raman', jd0: 2415020.0, a0: 21.01444 },
    kp: { name: 'Krishnamurti (KP)', jd0: 2415020.0, a0: 22.363889 },
  };
  function pA(T) { return (5028.796195 * T + 1.1054348 * T * T + 0.00007964 * T ** 3 - 0.000023857 * T ** 4) / 3600; }
  function ayanamsa(jdTT, key = 'lahiri') {
    const a = AYANAMSAS[key] || AYANAMSAS.lahiri;
    return a.a0 + pA((jdTT - 2451545) / 36525) - pA((a.jd0 - 2451545) / 36525);
  }

  /* ---------- engines ---------- */
  const BODIES = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const builtin = {
    name: 'Vice Space built-in (Meeus / JPL elements)',
    tropical(ms) {
      const y = new Date(ms).getUTCFullYear();
      const jdTT = jdFromMs(ms) + deltaT(y) / 86400;
      const T = (jdTT - 2451545) / 36525;
      const out = { Sun: sunLon(T), Moon: moonLon(T) };
      for (const p of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']) out[p] = planetLon(p, T);
      return out;
    },
  };
  let AE = null;
  const aeEngine = {
    name: 'Astronomy Engine 2.1.19',
    tropical(ms) {
      const d = new Date(ms), t = AE.MakeTime(d);
      const T = (t.tt) / 36525;
      const out = {};
      for (const b of [...BODIES, 'Uranus', 'Neptune', 'Pluto']) out[b] = norm(AE.Ecliptic(AE.GeoVector(AE.Body[b], t, true)).elon - nutLon(T)); // true → mean equinox
      return out;
    },
  };
  let engineReady = null;
  function loadAE() {
    if (engineReady) return engineReady;
    engineReady = new Promise((res) => {
      if (window.Astronomy) { AE = window.Astronomy; return res(true); }
      if (window.OSS_NO_CDN && !window.ENKO_VENDOR) return res(false);
      const s = document.createElement('script');
      s.src = window.ENKO_VENDOR ? window.ENKO_VENDOR + 'astronomy.browser.min.js' : 'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js';
      s.async = true;
      const to = setTimeout(() => res(false), 8000);
      s.onload = () => { clearTimeout(to); AE = window.Astronomy || null; res(!!AE); };
      s.onerror = () => { clearTimeout(to); res(false); };
      document.head.appendChild(s);
    });
    return engineReady;
  }
  // Self-test: Astronomy Engine must agree with the built-in engine at reference instants
  function selfTest() {
    try {
      const tol = { Sun: 0.05, Moon: 0.2, Mercury: 0.2, Venus: 0.2, Mars: 0.3, Jupiter: 0.6, Saturn: 0.8, Uranus: 1, Neptune: 1, Pluto: 1.5 };
      for (const ms of [Date.UTC(1950, 5, 1), Date.UTC(1999, 4, 14, 4, 25), Date.UTC(2024, 0, 1)]) {
        const a = aeEngine.tropical(ms), b = builtin.tropical(ms);
        for (const k of Object.keys(tol)) if (angDiff(a[k], b[k]) > tol[k]) return false;
      }
      return true;
    } catch (e) { return false; }
  }
  const angDiff = (a, b) => { const d = Math.abs(norm(a) - norm(b)); return d > 180 ? 360 - d : d; };
  async function pickEngine() {
    const ok = await loadAE();
    return ok && selfTest() ? aeEngine : builtin;
  }

  /* ---------- Jyotish vocabulary ---------- */
  const SIGNS = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];
  const SIGNS_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const NAKS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
  const GRAHAS = [
    { key: 'Sun', name: 'Surya', en: 'Sun', ab: 'Su' }, { key: 'Moon', name: 'Chandra', en: 'Moon', ab: 'Mo' },
    { key: 'Mars', name: 'Mangal', en: 'Mars', ab: 'Ma' }, { key: 'Mercury', name: 'Budh', en: 'Mercury', ab: 'Me' },
    { key: 'Jupiter', name: 'Guru', en: 'Jupiter', ab: 'Ju' }, { key: 'Venus', name: 'Shukra', en: 'Venus', ab: 'Ve' },
    { key: 'Saturn', name: 'Shani', en: 'Saturn', ab: 'Sa' }, { key: 'Rahu', name: 'Rahu', en: 'North lunar node', ab: 'Ra' },
    { key: 'Ketu', name: 'Ketu', en: 'South lunar node', ab: 'Ke' },
  ];
  const DASHA = [['Ketu', 7], ['Venus', 20], ['Sun', 6], ['Moon', 10], ['Mars', 7], ['Rahu', 18], ['Jupiter', 16], ['Saturn', 19], ['Mercury', 17]];
  const NAK_SPAN = 40 / 3, PADA_SPAN = 10 / 3;
  const YEAR_MS = 365.25 * 86400000;

  function point(lon) {
    const sign = Math.floor(lon / 30), deg = lon - sign * 30;
    const nak = Math.min(26, Math.floor(lon / NAK_SPAN));
    const pada = Math.min(4, Math.floor((lon - nak * NAK_SPAN) / PADA_SPAN) + 1);
    return { lon, sign, deg, nak, pada };
  }
  const dms = (deg) => { let d = Math.floor(deg), m = Math.round((deg - d) * 60); if (m === 60) { d += 1; m = 0; } return `${d}°${String(m).padStart(2, '0')}′`; };

  function dashas(moonLon, birthMs) {
    const nak = Math.min(26, Math.floor(moonLon / NAK_SPAN));
    const frac = (moonLon - nak * NAK_SPAN) / NAK_SPAN;
    const li = nak % 9;
    const [, y0] = DASHA[li];
    let start = birthMs - frac * y0 * YEAR_MS;
    const out = [];
    for (let k = 0; k < 10; k++) {
      const [lord, yrs] = DASHA[(li + k) % 9];
      const end = start + yrs * YEAR_MS;
      const subs = [];
      let s = start;
      for (let j = 0; j < 9; j++) {
        const [sl, sy] = DASHA[(li + k + j) % 9];
        const e = s + (yrs * sy / 120) * YEAR_MS;
        if (e > birthMs) subs.push({ lord: sl, start: Math.max(s, birthMs), end: e });
        s = e;
      }
      out.push({ lord, years: yrs, start: Math.max(start, birthMs), end, partial: start < birthMs, subs });
      start = end;
      if (start > birthMs + 120 * YEAR_MS) break;
    }
    return { nakLord: DASHA[li][0], balanceYears: (1 - frac) * y0, list: out };
  }

  /* ---------- full chart ---------- */
  function compute(engine, { utcMs, lat, lon, timeKnown = true }, settings = {}) {
    const st = { ayanamsa: 'lahiri', houses: 'whole', node: 'mean', ...settings };
    const y = new Date(utcMs).getUTCFullYear();
    const jdUT = jdFromMs(utcMs), jdTT = jdUT + deltaT(y) / 86400;
    const T = (jdTT - 2451545) / 36525;
    const ay = ayanamsa(jdTT, st.ayanamsa);
    const trop = engine.tropical(utcMs);
    const tropPrev = engine.tropical(utcMs - 43200000), tropNext = engine.tropical(utcMs + 43200000);
    trop.Rahu = st.node === 'true' ? trueNode(T) : meanNode(T);
    const planets = GRAHAS.map((g) => {
      let tl = g.key === 'Ketu' ? norm(trop.Rahu + 180) : trop[g.key];
      const p = point(norm(tl - ay));
      let retro = false;
      if (g.key === 'Rahu' || g.key === 'Ketu') retro = true;
      else if (g.key !== 'Sun' && g.key !== 'Moon') { const d = norm(tropNext[g.key] - tropPrev[g.key]); retro = d > 180; }
      return { ...g, ...p, retro };
    });
    let lagna = null, houses = null;
    if (timeKnown) {
      const ramc = norm(gmstDeg(jdUT) + lon);
      const asc = norm(ascendant(ramc, meanObliquity(T), lat) - ay);
      lagna = point(asc);
      houses = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, sign: (lagna.sign + i) % 12, start: st.houses === 'equal' ? norm(asc + i * 30) : ((lagna.sign + i) % 12) * 30 }));
      for (const p of planets) p.house = st.houses === 'equal' ? Math.floor(norm(p.lon - asc) / 30) + 1 : ((p.sign - lagna.sign + 12) % 12) + 1;
    }
    const moon = planets.find((p) => p.key === 'Moon');
    return {
      version: VERSION, engine: engine.name, settings: st, ayanamsaDeg: ay,
      lagna, houses, planets, moon: { sign: moon.sign, nak: moon.nak, pada: moon.pada, lon: moon.lon },
      dasha: dashas(moon.lon, utcMs), utcMs, lat, lon, timeKnown, computedAt: Date.now(),
    };
  }

  return { VERSION, compute, pickEngine, builtin, obliquity: (T) => meanObliquity(T), ayanamsa, AYANAMSAS, SIGNS, SIGNS_EN, NAKS, GRAHAS, DASHA, point, dms, norm, angDiff, sunLon, moonLon, planetLon, meanNode, trueNode, gmstDeg, ascendant, meanObliquity, deltaT, jdFromMs, nutLon };
})();
if (typeof module !== 'undefined') module.exports = Astro;
