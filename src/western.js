/* ============================================================
   Western (tropical) astrology engine
   Natal charts with Placidus / Porphyry / Equal / Whole-sign houses,
   aspects, patterns, composite, Davison, secondary progressions,
   solar returns and transit searches (ingresses, stations,
   lunations, exact aspects).
   ============================================================ */
const W = (() => {
  const { norm, angDiff } = Astro;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const sin = (d) => Math.sin(d * D2R), cos = (d) => Math.cos(d * D2R), tan = (d) => Math.tan(d * D2R);
  const asin = (x) => Math.asin(x) * R2D, atan2 = (y, x) => Math.atan2(y, x) * R2D;
  const DAY = 86400000, YEAR = 365.2422;
  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const SG = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'].map((g) => g + '︎');
  const PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const BODIES = [...PLANETS, 'Node', 'Lilith'];
  const GLYPH = { Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇', Node: '☊', SNode: '☋', Lilith: '⚸', ASC: 'AC', MC: 'MC', Fortune: '⊗' };
  const NAME = { Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus', Mars: 'Mars', Jupiter: 'Jupiter', Saturn: 'Saturn', Uranus: 'Uranus', Neptune: 'Neptune', Pluto: 'Pluto', Node: 'North Node', SNode: 'South Node', Lilith: 'Lilith', ASC: 'Ascendant', MC: 'Midheaven', Fortune: 'Part of Fortune' };
  const ASPECTS = [
    { key: 'conj', a: 0, name: 'conjunction', glyph: '☌', kind: 'conj', orb: 8 },
    { key: 'opp', a: 180, name: 'opposition', glyph: '☍', kind: 'hard', orb: 8 },
    { key: 'trine', a: 120, name: 'trine', glyph: '△', kind: 'soft', orb: 7 },
    { key: 'square', a: 90, name: 'square', glyph: '□', kind: 'hard', orb: 7 },
    { key: 'sextile', a: 60, name: 'sextile', glyph: '⚹', kind: 'soft', orb: 5 },
    { key: 'quincunx', a: 150, name: 'quincunx', glyph: '⚻', kind: 'adjust', orb: 3, minor: true },
    { key: 'semisextile', a: 30, name: 'semi-sextile', glyph: '⚺', kind: 'soft', orb: 2, minor: true },
    { key: 'semisquare', a: 45, name: 'semi-square', glyph: '∠', kind: 'hard', orb: 2, minor: true },
    { key: 'sesqui', a: 135, name: 'sesquiquadrate', glyph: '⚼', kind: 'hard', orb: 2, minor: true },
  ];
  const ASP = Object.fromEntries(ASPECTS.map((a) => [a.key, a]));

  let engine = Astro.builtin;
  const setEngine = (e) => { if (!e || e === engine) return false; engine = e; cache.clear(); return true; };

  const time = (ms) => {
    const jdUT = Astro.jdFromMs(ms), jdTT = jdUT + Astro.deltaT(new Date(ms).getUTCFullYear()) / 86400;
    return { jdUT, jdTT, T: (jdTT - 2451545) / 36525 };
  };
  const meanPerigee = (T) => norm(83.3532465 + 4069.0137287 * T - 0.01032 * T * T - T ** 3 / 80053 + T ** 4 / 18999000);
  function lons(ms, st = {}, eng = engine) {
    const { T } = time(ms);
    const t = eng.tropical(ms);
    const o = {};
    for (const k of PLANETS) o[k] = norm(t[k]);
    o.Node = st.node === 'mean' ? Astro.meanNode(T) : Astro.trueNode(T);
    o.Lilith = norm(meanPerigee(T) + 180);
    return o;
  }
  const point = (key, lon, extra = {}) => ({ key, lon, sign: Math.floor(lon / 30), deg: lon % 30, ...extra });

  /* ---------- houses ---------- */
  const raOf = (lon, eps) => norm(atan2(sin(lon) * cos(eps), cos(lon)));
  const lonOfRa = (ra, eps) => norm(atan2(sin(ra), cos(ra) * cos(eps)));
  function housesFromRamc(ramc, eps, lat, sys = 'placidus') {
    const mc = lonOfRa(ramc, eps), asc = Astro.ascendant(ramc, eps, lat);
    const ic = norm(mc + 180), dsc = norm(asc + 180);
    let c = null, used = sys;
    if (sys === 'placidus') {
      const cusp = (f, upper) => {
        let ra = upper ? ramc + f * 90 : ramc + 180 - f * 90;
        for (let i = 0; i < 30; i++) {
          const l = lonOfRa(ra, eps), dec = asin(sin(eps) * sin(l));
          const x = tan(lat) * tan(dec);
          if (Math.abs(x) >= 1) return NaN;
          const ad = asin(x);
          const nra = upper ? ramc + f * (90 + ad) : ramc + 180 - f * (90 - ad);
          if (Math.abs(norm(nra - ra + 180) - 180) < 1e-7) { ra = nra; break; }
          ra = nra;
        }
        return lonOfRa(ra, eps);
      };
      const c11 = cusp(1 / 3, true), c12 = cusp(2 / 3, true), c2 = cusp(2 / 3, false), c3 = cusp(1 / 3, false);
      if ([c11, c12, c2, c3].every(Number.isFinite)) c = [asc, c2, c3, ic, norm(c11 + 180), norm(c12 + 180), dsc, norm(c2 + 180), norm(c3 + 180), mc, c11, c12];
      else used = 'equal';
    }
    if (!c && used === 'porphyry' && norm(ic - asc) > 180) used = 'equal';
    if (!c && used === 'porphyry') {
      const q1 = norm(ic - asc), q2 = norm(dsc - ic);
      c = [asc, norm(asc + q1 / 3), norm(asc + (2 * q1) / 3), ic, norm(ic + q2 / 3), norm(ic + (2 * q2) / 3)];
      c = [...c, ...c.map((x) => norm(x + 180))];
    }
    if (!c && used === 'equal') c = Array.from({ length: 12 }, (_, i) => norm(asc + i * 30));
    if (!c && sys === 'whole') c = Array.from({ length: 12 }, (_, i) => norm(Math.floor(asc / 30) * 30 + i * 30));
    return { asc, mc, cusps: c, sys: used };
  }
  function houseOf(lon, cusps) {
    for (let i = 0; i < 12; i++) { const a = cusps[i], b = cusps[(i + 1) % 12]; if (norm(lon - a) < norm(b - a)) return i + 1; }
    return 1;
  }

  /* ---------- aspects ---------- */
  const LUM = ['Sun', 'Moon'], ANGLES = ['ASC', 'MC'], MINORPTS = ['Node', 'Lilith', 'Fortune'];
  function orbFor(asp, a, b, mode) {
    let o = asp.orb;
    if (mode === 'synastry') o = { conj: 7, opp: 7, trine: 6, square: 6, sextile: 4 }[asp.key] || 1.5;
    if (mode === 'transit') o = 0;
    if (LUM.includes(a) || LUM.includes(b)) o += asp.minor ? 0 : 2;
    if (ANGLES.includes(a) || ANGLES.includes(b)) { if (asp.minor) return -1; o = Math.min(o, 5); }
    if (MINORPTS.includes(a) || MINORPTS.includes(b)) { if (!['conj', 'opp'].includes(asp.key)) return -1; o = 3; }
    return o;
  }
  function aspects(listA, listB = null, mode = 'natal', opt = {}) {
    const out = [];
    const pairs = [];
    if (listB) for (const a of listA) for (const b of listB) pairs.push([a, b]);
    else for (let i = 0; i < listA.length; i++) for (let j = i + 1; j < listA.length; j++) pairs.push([listA[i], listA[j]]);
    for (const [a, b] of pairs) {
      if (!listB && ((a.key === 'Node' && b.key === 'Lilith') || (a.key === 'ASC' && b.key === 'MC') || (a.key === 'Fortune' || b.key === 'Fortune'))) continue;
      const d = angDiff(a.lon, b.lon);
      for (const asp of ASPECTS) {
        if (opt.majorOnly && asp.minor) continue;
        const lim = opt.orb != null ? opt.orb : orbFor(asp, a.key, b.key, mode);
        if (lim < 0) continue;
        const orb = Math.abs(d - asp.a);
        if (orb <= lim) {
          let applying = null;
          if (a.speed != null || b.speed != null) {
            const d2 = angDiff(a.lon + (a.speed || 0) * 0.05, b.lon + (b.speed || 0) * 0.05);
            applying = Math.abs(d2 - asp.a) < orb;
          }
          out.push({ a: a.key, b: b.key, type: asp.key, orb, lim, applying, exact: orb < 1 });
          break;
        }
      }
    }
    return out.sort((x, y) => x.orb / x.lim - y.orb / y.lim);
  }

  /* ---------- patterns & balance ---------- */
  const EL = ['fire', 'earth', 'air', 'water'], MODE = ['cardinal', 'fixed', 'mutable'];
  function patterns(ch) {
    const P = ch.bodies.filter((b) => PLANETS.includes(b.key));
    const asp = ch.aspects.filter((a) => PLANETS.includes(a.a) && PLANETS.includes(a.b));
    const has = (x, y, t) => asp.some((a) => a.type === t && ((a.a === x && a.b === y) || (a.a === y && a.b === x)));
    const keys = P.map((p) => p.key), out = [];
    const seen = new Set();
    const addP = (type, ks, extra = {}) => { const id = type + [...ks].sort().join(); if (seen.has(id)) return; seen.add(id); out.push({ type, keys: ks, ...extra }); };
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) for (let k = j + 1; k < keys.length; k++) {
      const [x, y, z] = [keys[i], keys[j], keys[k]];
      if (has(x, y, 'trine') && has(y, z, 'trine') && has(x, z, 'trine')) addP('Grand trine', [x, y, z]);
      for (const [o1, o2, ap] of [[x, y, z], [x, z, y], [y, z, x]]) {
        if (has(o1, o2, 'opp') && has(o1, ap, 'square') && has(o2, ap, 'square')) addP('T-square', [o1, o2, ap], { apex: ap });
        if (has(o1, o2, 'sextile') && has(o1, ap, 'quincunx') && has(o2, ap, 'quincunx')) addP('Yod', [o1, o2, ap], { apex: ap });
      }
    }
    for (const t of out.filter((p) => p.type === 'T-square')) {
      const [o1, o2, ap] = t.keys;
      for (const q of keys) if (![o1, o2, ap].includes(q) && has(ap, q, 'opp') && has(q, o1, 'square') && has(q, o2, 'square')) addP('Grand cross', [o1, o2, ap, q]);
    }
    const bySign = {}, byHouse = {};
    for (const p of P) { (bySign[p.sign] = bySign[p.sign] || []).push(p.key); if (p.house) (byHouse[p.house] = byHouse[p.house] || []).push(p.key); }
    for (const [s, ks] of Object.entries(bySign)) if (ks.length >= 3) addP('Stellium', ks, { sign: Number(s) });
    for (const [h, ks] of Object.entries(byHouse)) if (ks.length >= 3) addP('Stellium', ks, { house: Number(h) });
    return out;
  }
  const WEIGHT = { Sun: 3, Moon: 3, ASC: 3, MC: 1, Mercury: 2, Venus: 2, Mars: 2, Jupiter: 1, Saturn: 1, Uranus: 0.5, Neptune: 0.5, Pluto: 0.5 };
  function balance(ch) {
    const el = [0, 0, 0, 0], mo = [0, 0, 0], hemi = { upper: 0, lower: 0, east: 0, west: 0 };
    for (const b of [...ch.bodies, ...ch.points]) {
      const w = WEIGHT[b.key]; if (!w) continue;
      el[b.sign % 4] += w; mo[b.sign % 3] += w;
      if (b.house && PLANETS.includes(b.key)) { if (b.house >= 7) hemi.upper++; else hemi.lower++; if (b.house >= 10 || b.house <= 3) hemi.east++; else hemi.west++; }
    }
    const tot = el.reduce((a, b) => a + b, 0) || 1;
    const top = (arr, names) => names[arr.indexOf(Math.max(...arr))];
    const low = (arr, names) => names[arr.indexOf(Math.min(...arr))];
    return { el: el.map((x) => x / tot), mo: mo.map((x) => x / tot), dominantEl: top(el, EL), weakEl: low(el, EL), dominantMode: top(mo, MODE), hemi };
  }
  const RULER = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Pluto', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  const TRAD_RULER = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

  /* ---------- the chart ---------- */
  const cache = new Map();
  function chart({ utcMs, lat, lon, timeKnown = true }, st = {}) {
    st = { houses: 'placidus', node: 'true', ...st };
    const id = [utcMs, lat, lon, timeKnown, st.houses, st.node, engine.name].join('|');
    if (cache.has(id)) return cache.get(id);
    const now = lons(utcMs, st), a = lons(utcMs - DAY / 2, st), b = lons(utcMs + DAY / 2, st);
    const speed = (k) => { let d = norm(b[k] - a[k]); if (d > 180) d -= 360; return d; };
    const bodies = BODIES.map((k) => point(k, now[k], { speed: speed(k), retro: speed(k) < 0 && k !== 'Lilith' }));
    const { T, jdUT } = time(utcMs);
    const eps = Astro.meanObliquity(T);
    let points = [], cusps = null, asc = null, mc = null, sys = null;
    if (timeKnown) {
      const ramc = norm(Astro.gmstDeg(jdUT) + lon);
      const h = housesFromRamc(ramc, eps, lat, st.houses);
      ({ asc, mc, cusps, sys } = h);
      for (const x of bodies) x.house = houseOf(x.lon, cusps);
      const sun = now.Sun, moon = now.Moon, day = norm(sun - asc) >= 180;
      points = [point('ASC', asc, { house: 1 }), point('MC', mc, { house: 10 }), point('Fortune', norm(day ? asc + moon - sun : asc + sun - moon))];
      points[2].house = houseOf(points[2].lon, cusps);
    }
    const ch = { utcMs, lat, lon, timeKnown, settings: st, sys, bodies, points, cusps, asc, mc, eps };
    ch.aspects = aspects([...bodies, ...points], null, 'natal');
    ch.patterns = patterns(ch);
    ch.balance = balance(ch);
    ch.ruler = timeKnown ? RULER[Math.floor(asc / 30)] : null;
    ch.tradRuler = timeKnown ? TRAD_RULER[Math.floor(asc / 30)] : null;
    ch.isDay = timeKnown ? norm(now.Sun - asc) >= 180 : null;
    if (cache.size > 200) cache.clear();
    cache.set(id, ch);
    return ch;
  }
  const docInput = (doc) => ({ utcMs: Date.parse(doc.utc_birth_instant), lat: doc.birthplace.lat, lon: doc.birthplace.lon, timeKnown: doc.birth_input.timeKnown });
  const docSettings = (doc) => ({ houses: (doc.settings && doc.settings.wHouses) || 'placidus', node: (doc.settings && doc.settings.wNode) || 'true' });
  const fromDoc = (doc) => chart(docInput(doc), docSettings(doc));
  const get = (ch, key) => ch.bodies.find((b) => b.key === key) || ch.points.find((b) => b.key === key);
  const all = (ch) => [...ch.bodies, ...ch.points];

  /* ---------- relationship charts ---------- */
  const mid = (a, b) => { let d = norm(b - a); if (d > 180) d -= 360; return norm(a + d / 2); };
  function composite(cA, cB) {
    const bodies = cA.bodies.map((x) => { const y = get(cB, x.key); return point(x.key, mid(x.lon, y.lon), { speed: 0, retro: false }); });
    let points = [], cusps = null, asc = null, mc = null;
    const timeKnown = cA.timeKnown && cB.timeKnown;
    if (timeKnown) {
      mc = mid(cA.mc, cB.mc);
      const eps = 23.4367, lat = (cA.lat + cB.lat) / 2;
      const h = housesFromRamc(raOf(mc, eps), eps, lat, cA.settings.houses);
      asc = h.asc; cusps = h.cusps;
      for (const x of bodies) x.house = houseOf(x.lon, cusps);
      points = [point('ASC', asc, { house: 1 }), point('MC', mc, { house: 10 })];
    }
    const ch = { composite: true, timeKnown, bodies, points, cusps, asc, mc, settings: cA.settings };
    ch.aspects = aspects([...bodies, ...points], null, 'natal');
    ch.patterns = patterns(ch);
    ch.balance = balance(ch);
    return ch;
  }
  function davison(inA, inB, st) {
    const utcMs = Math.round((inA.utcMs + inB.utcMs) / 2);
    const lat = (inA.lat + inB.lat) / 2;
    let dl = inB.lon - inA.lon; if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
    let lon = inA.lon + dl / 2; if (lon > 180) lon -= 360; if (lon < -180) lon += 360;
    return { ...chart({ utcMs, lat, lon, timeKnown: inA.timeKnown && inB.timeKnown }, st), davison: true };
  }
  function progressed(inp, st, atMs = Date.now()) {
    const natal = chart(inp, st);
    const pMs = inp.utcMs + ((atMs - inp.utcMs) / YEAR);
    const pc = chart({ ...inp, utcMs: pMs, timeKnown: false }, st);
    const arc = norm(get(pc, 'Sun').lon - get(natal, 'Sun').lon);
    let points = [];
    if (natal.timeKnown) {
      const pmc = norm(natal.mc + arc);
      const h = housesFromRamc(raOf(pmc, natal.eps), natal.eps, inp.lat, 'equal');
      points = [point('ASC', h.asc), point('MC', pmc)];
      for (const b of pc.bodies) b.house = houseOf(b.lon, natal.cusps);
      for (const p of points) p.house = houseOf(p.lon, natal.cusps);
    }
    const bodies = pc.bodies.filter((b) => !['Node', 'Lilith'].includes(b.key));
    const phaseAngle = norm(get(pc, 'Moon').lon - get(pc, 'Sun').lon);
    const toNatal = aspects([...bodies.filter((b) => ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'].includes(b.key)), ...points], all(natal).filter((b) => b.key !== 'Fortune' && b.key !== 'Lilith'), 'progressed', { orb: 1, majorOnly: true });
    return { progressed: true, atMs, pMs, bodies, points, phaseAngle, arc, toNatal, natal };
  }
  function solarReturn(inp, st, year) {
    const natalSun = get(chart(inp, st), 'Sun').lon;
    const b = new Date(inp.utcMs);
    let t = Date.UTC(year, b.getUTCMonth(), b.getUTCDate(), b.getUTCHours(), b.getUTCMinutes());
    for (let i = 0; i < 8; i++) {
      let d = norm(natalSun - lons(t, st, Astro.builtin).Sun); if (d > 180) d -= 360;
      t += (d / 0.9856) * DAY;
      if (Math.abs(d) < 1e-5) break;
    }
    return { ...chart({ ...inp, utcMs: t }, st), solarReturn: true, year };
  }

  /* ---------- transit searches ---------- */
  const signedTo = (from, to) => { let d = norm(to - from); if (d > 180) d -= 360; return d; };
  function bisect(f, lo, hi, n = 30) { const s = Math.sign(f(lo)); for (let i = 0; i < n; i++) { const m = (lo + hi) / 2; if (Math.sign(f(m)) === s) lo = m; else hi = m; } return (lo + hi) / 2; }
  function ingresses(key, from, to, st, step = DAY) {
    const out = [];
    let t = from, s = Math.floor(lons(t, st, Astro.builtin)[key] / 30);
    while (t < to) {
      const t2 = Math.min(to, t + step), s2 = Math.floor(lons(t2, st, Astro.builtin)[key] / 30);
      if (s2 !== s) {
        let lo = t, hi = t2;
        for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (Math.floor(lons(m, st, Astro.builtin)[key] / 30) === s) lo = m; else hi = m; }
        out.push({ key, at: hi, from: s, to: s2 }); s = s2;
      }
      t = t2;
    }
    return out;
  }
  function stations(key, from, to, st, step = DAY) {
    const sp = (t) => signedTo(lons(t - DAY / 4, st, Astro.builtin)[key], lons(t + DAY / 4, st, Astro.builtin)[key]);
    const out = [];
    let t = from, v = sp(t);
    while (t < to) {
      const t2 = Math.min(to, t + step), v2 = sp(t2);
      if (Math.sign(v2) !== Math.sign(v) && v2 !== 0) { const at = bisect(sp, t, t2, 22); out.push({ key, at, turns: v2 < 0 ? 'retrograde' : 'direct', lon: lons(at, st, Astro.builtin)[key] }); }
      t = t2; v = v2;
    }
    return out;
  }
  function lunations(from, to, st) {
    const el = (t) => { const l = lons(t, st, Astro.builtin); return norm(l.Moon - l.Sun); };
    const out = [];
    let t = from, e = el(t);
    while (t < to) {
      const t2 = t + DAY / 2, e2 = el(t2);
      for (const target of [0, 180]) {
        const a = signedTo(target, e), b = signedTo(target, e2);
        if (a < 0 && b >= 0 && b - a < 90) {
          const at = bisect((x) => signedTo(target, el(x)), t, t2, 26);
          const l = lons(at, st, Astro.builtin);
          const nodeDist = Math.min(angDiff(l.Sun, l.Node), angDiff(l.Sun, l.Node + 180));
          out.push({ type: target === 0 ? 'new' : 'full', at, lon: l.Moon, eclipse: target === 0 ? nodeDist < 17 : nodeDist < 11 });
        }
      }
      t = t2; e = e2;
    }
    return out.filter((x) => x.at >= from && x.at <= to);
  }
  // exact transit aspects of moving bodies to fixed natal longitudes (series precomputed once)
  function hits(keys, targets, from, to, st, step, angles = [0, 60, 90, 120, 180]) {
    keys = [].concat(keys);
    const times = []; for (let t = from; t < to; t += step) times.push(t); times.push(to);
    const series = times.map((t) => lons(t, st, Astro.builtin));
    const out = [];
    for (const key of keys) for (const tg of targets) for (const ang of angles) for (const sgn of ang === 0 || ang === 180 ? [1] : [1, -1]) {
      const aim = norm(tg.lon + sgn * ang);
      let v = signedTo(aim, series[0][key]);
      for (let i = 1; i < times.length; i++) {
        const v2 = signedTo(aim, series[i][key]);
        if (Math.sign(v) !== Math.sign(v2) && Math.abs(v - v2) < 30) out.push({ a: key, b: tg.key, type: ASPECTS.find((x) => x.a === ang).key, at: bisect((t) => signedTo(aim, lons(t, st, Astro.builtin)[key]), times[i - 1], times[i], 22) });
        v = v2;
      }
    }
    return out.sort((a, b) => a.at - b.at);
  }
  const phaseName = (ang) => ['New Moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full Moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'][Math.floor(norm(ang + 22.5) / 45) % 8];
  const dms = (deg) => { let d = Math.floor(deg), m = Math.round((deg - d) * 60); if (m === 60) { d += 1; m = 0; } return `${d}°${String(m).padStart(2, '0')}′`; };
  return { SIGNS, SG, PLANETS, BODIES, GLYPH, NAME, ASPECTS, ASP, EL, MODE, RULER, TRAD_RULER, chart, fromDoc, docInput, docSettings, get, all, aspects, composite, davison, progressed, solarReturn, lons, ingresses, stations, lunations, hits, houseOf, phaseName, dms, signedTo, DAY, YEAR, housesFromRamc, mid, engineName: () => engine.name, setEngine };
})();
if (typeof module !== 'undefined') module.exports = W;
