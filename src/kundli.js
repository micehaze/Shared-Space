/* ============================================================
   Our Kundlis — calculated Vedic natal charts + life timelines
   Birth date, time and place in → everything else is computed.
   ============================================================ */
const HELP = {
  lagna: 'Your ascendant: the zodiac sign rising at your birthplace when you were born. It sets the starting point for the houses and is sensitive to birth time.',
  rashi: 'Your Moon sign: the zodiac sign containing the Moon at birth in the selected Vedic calculation system.',
  nakshatra: 'Your lunar mansion: one of 27 sections of the zodiac determined from the Moon’s position at birth.',
  pada: 'The quarter (1–4) of your Nakshatra, determined by the Moon’s precise position within that Nakshatra.',
  houses: 'Twelve chart sectors traditionally associated with different areas of life, such as home, work, partnerships and resources.',
  dasha: 'A traditional sequence of planetary time periods used in Jyotish interpretation; it is not a scientifically established forecast.',
  ayanamsa: 'The reference adjustment used to calculate sidereal zodiac positions; different choices can change chart results.',
};
const GRAHA_HELP = {
  Sun: 'Solar position; traditionally linked to vitality, identity, authority and self-expression.',
  Moon: 'Moon position; traditionally linked to emotions, habits, sensitivity and the inner mind. Rashi is the sign occupied by Chandra.',
  Mars: 'Mars position; traditionally linked to action, courage, assertiveness and conflict.',
  Mercury: 'Mercury position; traditionally linked to speech, reasoning, learning and commerce.',
  Jupiter: 'Jupiter position; traditionally linked to wisdom, teachers, growth and belief.',
  Venus: 'Venus position; traditionally linked to relationships, pleasure, beauty and art.',
  Saturn: 'Saturn position; traditionally linked to discipline, effort, duties and limits.',
  Rahu: 'A calculated lunar orbital node, not a physical planet; traditionally associated with desire, novelty and worldly ambition.',
  Ketu: 'The opposite lunar orbital node; traditionally associated with release, introspection and detachment.',
};
const HOUSE_THEMES = ['Self, body and outlook', 'Family, speech and resources', 'Siblings, courage and communication', 'Home, mother and comfort', 'Children, creativity and learning', 'Health, service and obstacles', 'Partnerships and marriage', 'Change, longevity and shared resources', 'Fortune, teachers and dharma', 'Career, status and action', 'Gains, friends and hopes', 'Expenses, rest and spiritual life'];
const DASHA_NAMES = { Ketu: 'Ketu', Venus: 'Shukra (Venus)', Sun: 'Surya (Sun)', Moon: 'Chandra (Moon)', Mars: 'Mangal (Mars)', Rahu: 'Rahu', Jupiter: 'Guru (Jupiter)', Saturn: 'Shani (Saturn)', Mercury: 'Budh (Mercury)' };
const signName = (i) => `${Astro.SIGNS[i]} (${Astro.SIGNS_EN[i]})`;
const tip = (key, label) => `<span class="tip"><button type="button" class="info" aria-label="What is ${esc(label)}?" aria-expanded="false">i</button><span class="tip-body" role="tooltip">${esc(HELP[key] || key)}</span></span>`;
const fmtBorn = (bi) => {
  const d = new Date(Date.UTC(bi.y, bi.m - 1, bi.d));
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) + (bi.timeKnown ? ', ' + bi.time : ', time unknown');
};
const ampm = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
document.addEventListener('click', (e) => {
  const b = e.target.closest('.info');
  $$('.info[aria-expanded="true"]').forEach((x) => { if (x !== b) x.setAttribute('aria-expanded', 'false'); });
  if (b) b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') !== 'true');
});

/* ---------- storage ---------- */
function kundaliOf(seat) {
  if (seat === S.me.seat) {
    const priv = S.data.mine.find((d) => d.id === 'kundali');
    if (priv) return { ...priv, shared: false };
  }
  const p = S.data.profiles[seat];
  if (p && p.kind === 'kundali') return p;
  if (p && p.kind === 'kundali-stub') return { stub: true, shared: false };
  return null;
}
const legacyOf = (seat) => { const p = S.data.profiles[seat]; return p && !p.kind && (p.birth || p.kundli) ? p : null; };
async function saveKundali(doc, shared) {
  const seat = S.me.seat;
  const body = { ...doc, kind: 'kundali', seat, owner: S.me.id, shared, updatedAt: Date.now(), createdAt: doc.createdAt || Date.now() };
  const pubRef = S.st.db.doc('profiles/' + seat), privRef = myPrivColl().doc('kundali');
  const legacy = legacyOf(seat);
  if (legacy) body.legacy = { birth: legacy.birth || null, kundli: legacy.kundli || null, notes: legacy.notes || '', chart: legacy.chart || '', chartType: legacy.chartType || '' };
  if (shared) {
    await retryOnce(() => pubRef.set(body));
    if (S.data.mine.some((d) => d.id === 'kundali')) await privRef.delete().catch(() => {});
  } else {
    await retryOnce(() => privRef.set(body));
    await retryOnce(() => pubRef.set({ kind: 'kundali-stub', seat, owner: S.me.id, shared: false, updatedAt: Date.now() }));
  }
}

/* ---------- calculation ---------- */
let enginePromise = null;
const getEngine = () => enginePromise || (enginePromise = Astro.pickEngine());
async function calculate(inp, settings) {
  const engine = await getEngine();
  const [y, m, d] = inp.date.split('-').map(Number);
  const [h, mi] = inp.timeKnown ? inp.time.split(':').map(Number) : [12, 0];
  const conv = TZ.localToUtc({ y, m, d, h, mi }, inp.tz);
  const pick = conv.status === 'ok' ? conv : conv.options[Math.min(inp.choice || 0, conv.options.length - 1)];
  const res = Astro.compute(engine, { utcMs: pick.utcMs, lat: inp.place.lat, lon: inp.place.lon, timeKnown: inp.timeKnown }, settings);
  if (!inp.timeKnown) {
    const at = (hh, mm) => { const c = TZ.localToUtc({ y, m, d, h: hh, mi: mm }, inp.tz); return Astro.compute(engine, { utcMs: c.status === 'ok' ? c.utcMs : c.options[0].utcMs, lat: inp.place.lat, lon: inp.place.lon, timeKnown: false }, settings); };
    const a = at(0, 0), b = at(23, 59);
    res.moonRange = { signs: [...new Set([a.moon.sign, res.moon.sign, b.moon.sign])], naks: [...new Set([a.moon.nak, res.moon.nak, b.moon.nak])], padas: [...new Set([a.moon.pada, b.moon.pada])].length > 1 || a.moon.nak !== b.moon.nak ? null : a.moon.pada };
    res.dashaShiftDays = Math.round(Math.abs(a.dasha.list[0].end - b.dasha.list[0].end) / 86400000);
  }
  if (engine !== Astro.builtin) {
    const b = Astro.compute(Astro.builtin, { utcMs: pick.utcMs, lat: inp.place.lat, lon: inp.place.lon, timeKnown: inp.timeKnown }, settings);
    res.crossCheck = { against: Astro.builtin.name, maxDiff: Math.max(...res.planets.map((p, i) => Astro.angDiff(p.lon, b.planets[i].lon))) };
  }
  const conf = TZ.confidence({ y, m, d }, pick.offsetSec);
  return {
    res,
    timezone: { id: inp.tz, offsetSec: pick.offsetSec, offsetLabel: TZ.fmtOffset(pick.offsetSec), abbr: TZ.abbr(inp.tz, pick.utcMs), status: conv.status, choice: inp.choice || 0, how: inp.place.tzHow || '', confidence: conf },
    utc: new Date(pick.utcMs).toISOString(),
  };
}
function buildDoc(inp, calc, prev) {
  const [y, m, d] = inp.date.split('-').map(Number);
  const r = calc.res;
  return {
    name: inp.name || '',
    birth_input: { y, m, d, time: inp.timeKnown ? inp.time : null, timeKnown: inp.timeKnown },
    birthplace: { label: inp.place.label, name: inp.place.name || '', region: inp.place.region || '', cc: inp.place.cc || '', lat: +inp.place.lat.toFixed(5), lon: +inp.place.lon.toFixed(5), precision: inp.place.precision || '', source: inp.place.source || '' },
    timezone: calc.timezone, utc_birth_instant: calc.utc,
    settings: r.settings,
    calculation: { version: r.version, engine: r.engine, ayanamsaDeg: r.ayanamsaDeg, crossCheck: r.crossCheck || null, computedAt: r.computedAt },
    lagna: r.lagna, houses: r.houses, moon: r.moon, moonRange: r.moonRange || null, dashaShiftDays: r.dashaShiftDays || 0,
    planets: r.planets.map(({ key, lon, sign, deg, nak, pada, house, retro }) => ({ key, lon: +lon.toFixed(5), sign, deg: +deg.toFixed(5), nak, pada, house: house || null, retro })),
    dasha: { nakLord: r.dasha.nakLord, balanceYears: r.dasha.balanceYears, list: r.dasha.list },
    uploads: prev ? prev.uploads || [] : [], notes: prev ? prev.notes || '' : '', createdAt: prev ? prev.createdAt : Date.now(),
  };
}
function diffSummary(prev, next) {
  if (!prev || !prev.moon) return [];
  const out = [];
  const lag = (k) => (k.lagna ? signName(k.lagna.sign) : 'unavailable');
  if (lag(prev) !== lag(next)) out.push(`Lagna: ${lag(prev)} → ${lag(next)}`);
  if (prev.moon.sign !== next.moon.sign) out.push(`Rashi: ${signName(prev.moon.sign)} → ${signName(next.moon.sign)}`);
  if (prev.moon.nak !== next.moon.nak || prev.moon.pada !== next.moon.pada) out.push(`Nakshatra: ${Astro.NAKS[prev.moon.nak]} ${prev.moon.pada} → ${Astro.NAKS[next.moon.nak]} ${next.moon.pada}`);
  for (const p of next.planets) {
    const q = prev.planets.find((x) => x.key === p.key);
    if (q && (q.sign !== p.sign || q.house !== p.house)) out.push(`${grahaLabel(p.key)}: ${Astro.SIGNS[q.sign]}${q.house ? ' (house ' + q.house + ')' : ''} → ${Astro.SIGNS[p.sign]}${p.house ? ' (house ' + p.house + ')' : ''}`);
  }
  if (prev.dasha && next.dasha && prev.dasha.list[0].lord !== next.dasha.list[0].lord) out.push(`Birth Mahadasha: ${prev.dasha.list[0].lord} → ${next.dasha.list[0].lord}`);
  return out;
}
const grahaLabel = (key) => { const g = Astro.GRAHAS.find((x) => x.key === key); return g.key === 'Rahu' || g.key === 'Ketu' ? g.name : `${g.name} (${g.en})`; };

/* ---------- chart drawing ---------- */
function chartSvg(k, style = 'north', sel = '') {
  const timeKnown = !!k.lagna;
  const first = timeKnown ? k.lagna.sign : k.moon.sign;
  const houseOf = (p) => (timeKnown && p.house ? p.house : ((p.sign - first + 12) % 12) + 1);
  const mark = (p) => `<tspan class="gm${p.key === sel ? ' sel' : ''}" data-g="${p.key}">${Astro.GRAHAS.find((g) => g.key === p.key).ab}${p.retro && p.key !== 'Rahu' && p.key !== 'Ketu' ? '℞' : ''}</tspan>`;
  const byHouse = {}, bySign = {};
  for (const p of k.planets) { (byHouse[houseOf(p)] = byHouse[houseOf(p)] || []).push(p); (bySign[p.sign] = bySign[p.sign] || []).push(p); }
  const lines = (arr, x, y, max = 3) => { const out = []; for (let i = 0; i < arr.length; i += max) out.push(arr.slice(i, i + max)); return out.map((row, i) => `<text x="${x}" y="${y + i * 17 - ((out.length - 1) * 17) / 2}" text-anchor="middle" class="gt">${row.map(mark).join(' ')}</text>`).join(''); };
  const title = timeKnown ? 'Lagna chart' : 'Moon chart (Chandra lagna) — birth time unknown';
  if (style === 'south') {
    const pos = [[1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1], [0, 0]]; // Aries..Pisces
    let cells = '';
    for (let s = 0; s < 12; s++) {
      const [c, r] = pos[s], x = c * 100, y = r * 100;
      const isFirst = s === first;
      cells += `<rect x="${x}" y="${y}" width="100" height="100" class="cell${isFirst ? ' first' : ''}"/>`;
      if (isFirst) cells += `<line x1="${x}" y1="${y}" x2="${x + 22}" y2="${y + 22}" class="asl"/><text x="${x + 26}" y="${y + 16}" class="hl">${timeKnown ? 'As' : 'Mo'}</text>`;
      cells += `<text x="${x + 94}" y="${y + 16}" text-anchor="end" class="sn">${Astro.SIGNS[s]}</text>`;
      cells += lines(bySign[s] || [], x + 50, y + 60, 3);
    }
    return `<svg class="kchart" viewBox="-2 -2 404 404" role="img" aria-label="${esc(title)}, South Indian style">${cells}<text x="200" y="192" text-anchor="middle" class="ct">${timeKnown ? 'Rashi chart' : 'Moon chart'}</text><text x="200" y="214" text-anchor="middle" class="cs">South Indian · Calculated by Vice Space</text></svg>`;
  }
  const P = { T: [200, 0], R: [400, 200], B: [200, 400], L: [0, 200], C: [200, 200], a: [100, 100], b: [300, 100], c: [300, 300], d: [100, 300], TL: [0, 0], TR: [400, 0], BR: [400, 400], BL: [0, 400] };
  const SN_POS = { 1: [200, 172], 2: [100, 78], 3: [78, 100], 4: [172, 200], 5: [78, 300], 6: [100, 322], 7: [200, 228], 8: [300, 322], 9: [322, 300], 10: [228, 200], 11: [322, 100], 12: [300, 78] };
  const H = { 1: ['T', 'b', 'C', 'a'], 2: ['TL', 'T', 'a'], 3: ['TL', 'a', 'L'], 4: ['L', 'a', 'C', 'd'], 5: ['L', 'd', 'BL'], 6: ['BL', 'd', 'B'], 7: ['B', 'd', 'C', 'c'], 8: ['B', 'c', 'BR'], 9: ['BR', 'c', 'R'], 10: ['R', 'c', 'C', 'b'], 11: ['R', 'b', 'TR'], 12: ['TR', 'b', 'T'] };
  let g = '';
  for (let h = 1; h <= 12; h++) {
    const pts = H[h].map((n) => P[n]);
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const sign = (first + h - 1) % 12;
    g += `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" class="cell${h === 1 ? ' first' : ''}"><title>House ${h}: ${esc(signName(sign))}</title></polygon>`;
    const [nx, ny] = SN_POS[h];
    g += `<text x="${nx}" y="${ny + 4}" text-anchor="middle" class="sn">${sign + 1}</text>`;
    g += lines(byHouse[h] || [], cx, cy + 6, pts.length === 4 ? 3 : 2);
  }
  g += `<text x="200" y="${timeKnown ? 52 : 50}" text-anchor="middle" class="hl">${timeKnown ? 'Asc' : 'Moon'}</text>`;
  return `<svg class="kchart" viewBox="-2 -2 404 404" role="img" aria-label="${esc(title)}, North Indian style. House 1 is the top diamond; numbers are signs, 1 = Aries.">${g}</svg>`;
}

/* ---------- view ---------- */
VIEWS.kundlis = {
  tab: null, q: '', style: 'north', sel: '',
  mount(el) {
    const vis = (x) => { const k = kundaliOf(x); return k && !k.stub; };
    if (!this.tab) this.auto = true;
    try { this.style = localStorage.getItem('enko.chartStyle') || 'north'; } catch {}
    const mode = () => { try { return localStorage.getItem('vs.astro') === 'western' ? 'western' : 'vedic'; } catch { return 'vedic'; } };
    el.innerHTML = `${pageHead('Our Charts', 'Your birth charts, each other’s charts and your compatibility — in Vedic or European astrology.')}
      <div class="seg astro-sw" role="group" aria-label="Astrology style" id="kstyle"></div>
      <div class="ktabs" role="group" aria-label="Profile" id="ktabs"></div><div id="kbody"></div>`;
    const draw = () => {
      const m = mode();
      if (this.auto || !this.tab) this.tab = vis('A') && vis('B') ? 'pair' : S.me.seat;
      $('#kstyle', el).innerHTML = [['vedic', 'Vedic · Kundli'], ['western', 'European · Natal chart']].map(([k, l]) => `<button data-astro="${k}" aria-pressed="${k === m}">${l}</button>`).join('');
      $$('[data-astro]', el).forEach((b) => (b.onclick = () => { try { localStorage.setItem('vs.astro', b.dataset.astro); } catch {} this.sel = ''; draw(); }));
      $('#ktabs', el).innerHTML = [['pair', m === 'western' ? 'Synastry' : 'Compatibility'], ['A', nameOf('A')], ['B', nameOf('B')], ['shared', 'Our timeline']].map(([k, l]) => `<button data-k="${k}" aria-pressed="${k === this.tab}">${esc(l)}</button>`).join('');
      $$('[data-k]', el).forEach((b) => (b.onclick = () => { this.tab = b.dataset.k; this.auto = false; this.sel = ''; NV.WV.selB = ''; draw(); }));
      const box = $('#kbody', el);
      if (m === 'western') {
        box.innerHTML = NV.WV.render();
        this.bind(box);
        NV.WV.bindW(box);
        hydrate(box);
        return;
      }
      const k = this.tab === 'A' || this.tab === 'B' ? kundaliOf(this.tab) : null;
      const full = k && !k.stub;
      box.innerHTML = this.tab === 'shared' ? this.timelineHtml('shared')
        : this.tab === 'pair' ? this.pairHtml()
          : !full ? this.profileHtml(this.tab) + this.timelineHtml(this.tab)
            : this.subNav() + (this.sub === 'explain' ? this.explainHtml(k, this.tab) : this.sub === 'forecast' ? this.forecastHtml(k, this.tab) : this.profileHtml(this.tab) + this.timelineHtml(this.tab));
      this.bind(box);
      this.bindMore(box);
      hydrate(box);
    };
    this.draw = draw;
    draw();
    getEngine();
    NV.WV.useEngine();
    this.off = onData((k) => ['profiles', 'events', 'members', 'names', 'mine'].includes(k) && draw());
  },
  unmount() { this.off && this.off(); },
  profileHtml(seat) {
    const own = seat === S.me.seat;
    const k = kundaliOf(seat);
    if (!k || k.stub) {
      if (own) return `<section class="hero-empty"><h2>Create your Kundali</h2><p>Enter your birth date, time and place. Vice Space works out the time zone, then calculates your Lagna, Rashi, Nakshatra, planets, houses and Dashas — no astrology knowledge needed.</p><button class="btn" data-create>${icon('star')}Start with birth details</button>${legacyOf(seat) ? '<p class="hint">Your earlier manual entries are kept and will be attached to the new profile for reference.</p>' : ''}</section>`;
      if (k && k.stub) return `<div class="empty">${icon('lock', 'spark')}<strong>${esc(nameOf(seat))} keeps their Kundali private</strong>They can choose to share it from their own profile.</div>`;
      return `<div class="empty">${icon('star', 'spark')}<strong>${S.members[seat] ? esc(nameOf(seat)) + ' hasn’t created a Kundali yet' : 'Waiting for the second person to join'}</strong></div>`;
    }
    const bi = k.birth_input, tz = k.timezone || {}, tk = bi.timeKnown;
    const mr = k.moonRange;
    const rashi = tk || !mr || mr.signs.length === 1 ? signName(k.moon.sign) : mr.signs.map(signName).join(' or ');
    const nak = tk || !mr || mr.naks.length === 1 ? Astro.NAKS[k.moon.nak] : mr.naks.map((n) => Astro.NAKS[n]).join(' / ');
    const pada = tk ? String(k.moon.pada) : mr && mr.padas ? String(mr.padas) : 'Needs birth time';
    const id = (key, label, value, extra = '') => `<div class="kid"><div class="kid-h">${label}${tip(key, label)}</div><div class="kid-v">${esc(value)}</div><p class="kid-help">${esc(HELP[key])}</p>${extra}</div>`;
    const calc = k.calculation || {};
    const st = k.settings || {};
    const cur = k.dasha.list.find((d) => d.start <= Date.now() && d.end > Date.now());
    const curSub = cur && cur.subs.find((s) => s.start <= Date.now() && s.end > Date.now());
    const planets = k.planets;
    const sel = planets.find((p) => p.key === this.sel);
    return `<section class="kcard">
      <div class="kcard-top">
        <div><h2 class="big-name">${esc(k.name || nameOf(seat))}</h2>
          <p class="born">Born ${esc(fmtBorn(bi))}${tk ? ` <span class="muted">(${esc(ampm(bi.time))})</span>` : ''}<br>${esc(k.birthplace.label)} · ${esc(tz.id)} · ${esc(tz.offsetLabel)} at birth${tz.abbr && !/^GMT/.test(tz.abbr) ? ' (' + esc(tz.abbr) + ')' : ''}</p>
          <p class="badges"><span class="badge-calc">${icon('check')}Calculated by Vice Space</span>${own ? `<span class="badge-share">${k.shared ? 'Shared with ' + esc(nameOf(partnerSeat())) : 'Only you can see this'}</span>` : ''}</p></div>
        ${own ? `<div class="kact"><button class="btn sm" data-edit>${icon('edit')}Edit birth details</button><button class="btn ghost sm" data-recalc>Recalculate</button><button class="btn ghost sm" data-dl>${icon('download')}Download</button></div>` : `<div class="kact"><button class="btn ghost sm" data-dl>${icon('download')}Download</button></div>`}
      </div>
      ${!tk ? `<div class="banner warn">${icon('clock')}<span>Birth time unknown — Lagna and houses can’t be calculated, so the chart below uses the Moon’s sign as house 1. ${mr && mr.signs.length > 1 ? 'The Moon changed sign on this day, so Rashi depends on the time. ' : ''}Add a birth time, even approximate, for a full chart.</span></div>` : ''}
      ${(tz.confidence && tz.confidence.notes.length) ? `<div class="banner">${icon('bell')}<span>${tz.confidence.notes.map(esc).join(' ')}</span></div>` : ''}
      <div class="kids">
        ${id('lagna', 'Lagna', tk && k.lagna ? `${signName(k.lagna.sign)} ${Astro.dms(k.lagna.deg)}` : 'Unavailable without birth time')}
        ${id('rashi', 'Rashi', rashi)}
        ${id('nakshatra', 'Nakshatra', nak)}
        ${id('pada', 'Pada', pada)}
      </div>
    </section>

    <section class="kgrid2">
      <div class="panel chartp">
        <div class="ph"><h3>${tk ? 'Birth chart' : 'Moon chart'}</h3>
          <div class="seg sm" role="group" aria-label="Chart style"><button data-style="north" aria-pressed="${this.style === 'north'}">North Indian</button><button data-style="south" aria-pressed="${this.style === 'south'}">South Indian</button></div></div>
        <div class="chartwrap" id="chartwrap">${chartSvg(k, this.style, this.sel)}</div>
        <p class="legend"><b>How to read it:</b> ${this.style === 'north' ? 'the top diamond is house 1 (Lagna); houses run anticlockwise. Small numbers are signs (1 = Mesha/Aries … 12 = Meena/Pisces).' : 'each square is a fixed sign, starting from Mesha (Aries) second from top-left and running clockwise; the slashed square marks Lagna.'} Su Sun · Mo Moon · Ma Mars · Me Mercury · Ju Jupiter · Ve Venus · Sa Saturn · Ra Rahu · Ke Ketu · ℞ retrograde. Tap a graha for details.</p>
      </div>
      <div class="panel" id="gsel">${sel ? this.grahaDetail(sel) : `<h3>Grahas</h3><p class="muted" style="margin-top:0">Tap a graha in the chart or the table to see where it sits and what it traditionally represents.</p>
        <dl class="gloss">${Astro.GRAHAS.map((g) => `<dt><button class="linkish" data-gsel="${g.key}">${esc(grahaLabel(g.key))}</button></dt><dd>${esc(GRAHA_HELP[g.key])}</dd>`).join('')}</dl>`}</div>
    </section>

    <section class="panel">
      <div class="ph"><h3>Graha placements</h3><span class="tip"><button type="button" class="info" aria-label="How to read this table" aria-expanded="false">i</button><span class="tip-body" role="tooltip">Sign: the sidereal zodiac sign. Degree: position inside that sign, 0°–30° (′ = arcminutes). Nakshatra · pada: the lunar mansion and its quarter at that position. House: which of the 12 houses the graha falls in. ℞ (retrograde): the graha appears to move backwards from Earth; Rahu and Ketu always move this way.</span></span></div>
      <div class="tablewrap"><table class="graha"><thead><tr><th>Graha</th><th>Sign</th><th>Degree</th><th>Nakshatra · pada</th><th>House</th><th>Motion</th></tr></thead><tbody>
      ${planets.map((p) => `<tr class="${p.key === this.sel ? 'on' : ''}" data-gsel="${p.key}" tabindex="0"><td><b>${esc(grahaLabel(p.key))}</b>${p.key === 'Rahu' || p.key === 'Ketu' ? '<br><small class="muted">lunar node</small>' : ''}</td><td>${esc(signName(p.sign))}</td><td>${Astro.dms(p.deg)}</td><td>${esc(Astro.NAKS[p.nak])} · ${p.pada}</td><td>${p.house && tk ? p.house : '—'}</td><td>${p.retro ? '℞ retrograde' : 'direct'}</td></tr>`).join('')}
      </tbody></table></div>
    </section>

    <section class="panel">
      <div class="ph"><h3>Houses (Bhavas)${tip('houses', 'houses')}</h3></div>
      <p class="kid-help" style="margin-top:0">${esc(HELP.houses)}</p>
      ${tk && k.houses ? `<div class="houses">${k.houses.map((h) => { const ps = planets.filter((p) => p.house === h.n); return `<div class="house"><span class="hn">${h.n}</span><div><b>${esc(signName(h.sign))}</b>${st.houses === 'equal' ? ` <small class="muted">from ${Astro.dms(h.start % 30)}</small>` : ''}<br><small class="muted">${esc(HOUSE_THEMES[h.n - 1])}</small>${ps.length ? `<br><span class="hp">${ps.map((p) => esc(grahaLabel(p.key))).join(', ')}</span>` : ''}</div></div>`; }).join('')}</div>` : `<p class="muted">Houses need an exact birth time.</p>`}
    </section>

    <section class="panel">
      <div class="ph"><h3>Vimshottari Dasha${tip('dasha', 'Dasha')}</h3></div>
      <p class="kid-help" style="margin-top:0">${esc(HELP.dasha)}</p>
      <p>${tk ? '' : `<b>Approximate:</b> without a birth time these dates can shift by up to ${Math.max(1, Math.round((k.dashaShiftDays || 0) / 30))} months. `}Born in the Mahadasha of <b>${esc(DASHA_NAMES[k.dasha.list[0].lord])}</b> (Moon in ${esc(Astro.NAKS[k.moon.nak])}, ruled by ${esc(k.dasha.nakLord)}), with ${k.dasha.balanceYears.toFixed(2)} years remaining at birth.${cur ? ` Now: <b>${esc(DASHA_NAMES[cur.lord])}</b>${curSub ? ` / ${esc(DASHA_NAMES[curSub.lord])}` : ''}.` : ''}</p>
      <div class="dashas">${k.dasha.list.map((d, i) => { const isCur = d === cur; return `<details class="dasha${isCur ? ' cur' : ''}" ${isCur ? 'open' : ''}><summary><span class="dz-l">${esc(DASHA_NAMES[d.lord])}${isCur ? ' <span class="now">Now</span>' : ''}</span><span class="dz-d">${esc(fmtMonth(d.start))} – ${esc(fmtMonth(d.end))}${d.partial ? ' <small class="muted">(balance at birth)</small>' : ` <small class="muted">${d.years} yrs</small>`}</span></summary>
        <ul class="subs">${d.subs.map((s) => `<li class="${s.start <= Date.now() && s.end > Date.now() ? 'cur' : ''}"><span>${esc(DASHA_NAMES[d.lord].split(' ')[0])} / ${esc(DASHA_NAMES[s.lord])}</span><span>${esc(fmtDay(s.start))} – ${esc(fmtDay(s.end))}</span></li>`).join('')}</ul></details>`; }).join('')}</div>
      <p class="hint">Antardasha lengths follow the traditional rule (Mahadasha years × sub-lord years ÷ 120). One year is counted as 365.25 days.</p>
    </section>

    <section class="panel settings-p">
      <div class="ph"><h3>How this was calculated</h3><button class="btn ghost sm" data-learn>Learn more</button></div>
      <p class="muted" style="margin-top:0">Sidereal zodiac · ${esc((Astro.AYANAMSAS[st.ayanamsa] || Astro.AYANAMSAS.lahiri).name)} ayanamsa${tip('ayanamsa', 'ayanamsa')} (${Astro.dms(calc.ayanamsaDeg || 0)}) · ${st.houses === 'equal' ? 'equal houses from the Lagna degree' : 'whole-sign houses'} · ${st.node === 'true' ? 'true' : 'mean'} lunar nodes · Vimshottari Dasha from the Moon’s Nakshatra.<br>
      Birth instant ${esc(k.utc_birth_instant.replace('T', ' ').slice(0, 16))} UTC · ${esc(k.birthplace.lat.toFixed(4))}°, ${esc(k.birthplace.lon.toFixed(4))}° · ${esc(calc.engine || '')} · ${esc(calc.version || '')}${calc.crossCheck ? ` · cross-checked against the built-in engine (max difference ${calc.crossCheck.maxDiff.toFixed(2)}°)` : ''}.</p>
      ${own ? `<details class="adv"><summary>Advanced settings</summary>
        <div class="row" style="margin-top:12px">
          <label class="field"><span>Ayanamsa</span><select id="setAy">${Object.entries(Astro.AYANAMSAS).map(([key, a]) => `<option value="${key}" ${key === st.ayanamsa ? 'selected' : ''}>${esc(a.name)}${key === 'lahiri' ? ' — default' : ''}</option>`).join('')}</select></label>
          <label class="field"><span>Houses</span><select id="setHo"><option value="whole" ${st.houses !== 'equal' ? 'selected' : ''}>Whole sign — default</option><option value="equal" ${st.houses === 'equal' ? 'selected' : ''}>Equal from Lagna degree</option></select></label>
          <label class="field"><span>Lunar nodes</span><select id="setNo"><option value="mean" ${st.node !== 'true' ? 'selected' : ''}>Mean — default</option><option value="true" ${st.node === 'true' ? 'selected' : ''}>True</option></select></label>
        </div><button class="btn sm" data-applyset>Apply and recalculate</button><p class="hint">Changing a setting recalculates the whole chart and shows what changed before saving.</p></details>` : ''}
    </section>

    <section class="panel">
      <div class="ph"><h3>Reference documents</h3>${own && S.st.assets ? `<label class="btn ghost sm">${icon('upload')}Upload birth chart image or PDF<input type="file" class="sr" data-upref accept="image/*,application/pdf"></label>` : ''}</div>
      <p class="muted" style="margin-top:0">Optional. An older chart you already have, kept for comparison. Vice Space never reads values from it — the chart above is calculated from your birth details.</p>
      ${(k.uploads || []).length ? `<div class="refs">${k.uploads.map((u, i) => `<div class="ref"><span class="pill cat">Reference document</span> ${/^image\//.test(u.type) ? `<img data-asset="${esc(u.id)}" alt="${esc(u.name)}" data-big="${esc(u.id)}">` : `<a data-asset="${esc(u.id)}" target="_blank" rel="noopener">${icon('pdf')} ${esc(u.name)}</a>`}${own ? `<button class="icon-btn" data-rmref="${i}" aria-label="Remove ${esc(u.name)}">${icon('trash')}</button>` : ''}</div>`).join('')}</div>` : ''}
      ${k.legacy && own ? `<details class="adv"><summary>Earlier manual entries</summary><p class="hint">Kept from before charts were calculated automatically. Not used in any calculation.</p><pre class="pv-text">${esc(JSON.stringify(k.legacy.kundli || {}, null, 1)).slice(0, 4000)}</pre></details>` : ''}
    </section>

    <section class="panel">
      <div class="ph"><h3>Personal notes</h3>${own ? '<button class="btn ghost sm" data-notes>Edit</button>' : ''}</div>
      ${k.notes ? `<p class="prose">${esc(k.notes)}</p>` : `<p class="muted">${own ? 'Anything you want to remember alongside your chart.' : 'No notes.'}</p>`}
    </section>
    ${own ? `<section class="panel"><div class="ph"><h3>Sharing</h3></div><label class="check"><input type="checkbox" data-share ${k.shared ? 'checked' : ''}> Let ${esc(nameOf(partnerSeat()))} see my Kundali</label><p class="hint">Your birth place is shown as a city-level label and coordinates; it is never public.</p></section>` : ''}`;
  },
  grahaDetail(p) {
    const k = kundaliOf(this.tab);
    return `<h3>${esc(grahaLabel(p.key))}</h3>
      <p class="gpos">${esc(signName(p.sign))} ${Astro.dms(p.deg)}${p.retro ? ' ℞' : ''}<br>${esc(Astro.NAKS[p.nak])}, pada ${p.pada}${p.house && k && k.lagna ? ` · house ${p.house} <small class="muted">(${esc(HOUSE_THEMES[p.house - 1].toLowerCase())})</small>` : ''}</p>
      <p>${esc(GRAHA_HELP[p.key])}</p>
      ${p.key === 'Moon' ? `<p class="hint">Chandra is the Moon itself; your Rashi is the sign Chandra occupies — here ${esc(signName(p.sign))}.</p>` : ''}
      ${p.key === 'Rahu' || p.key === 'Ketu' ? '<p class="hint">Rahu and Ketu are always exactly opposite each other and always move retrograde.</p>' : ''}
      <p class="hint">Meanings are traditional interpretations, not facts or predictions.</p>
      <button class="btn ghost sm" data-gsel="">Show all grahas</button>`;
  },
  timelineHtml(scope) {
    const q = this.q.trim().toLowerCase();
    const evs = S.data.events.filter((e) => e.scope === scope).filter((e) => !q || [e.title, e.location, e.description, ...(e.tags || [])].join(' ').toLowerCase().includes(q)).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    const canAdd = scope === 'shared' || scope === S.me.seat;
    const total = S.data.events.filter((e) => e.scope === scope).length;
    return `<h2 class="sec">${scope === 'shared' ? 'Our timeline' : 'Life timeline'}</h2>
      <div class="toolbar">${canAdd ? `<button class="btn" data-addev="${scope}">${icon('plus')}Add a moment</button>` : ''}
        <div class="search grow">${icon('search')}<input class="input" data-tq type="search" placeholder="Search places, people, tags" aria-label="Search timeline" value="${esc(this.q)}"></div></div>
      ${!total ? `<div class="empty">${icon('star', 'spark')}<strong>No moments yet</strong>${canAdd ? 'Add a first meeting, a trip, a graduation — anything worth remembering.' : `${esc(nameOf(scope))} hasn’t added any moments yet.`}</div>`
        : !evs.length ? `<p class="hint">No moments match.</p>`
          : `<div class="timeline">${evs.map((e) => `<article class="tl">
          <div class="d">${esc(fmtDate(e.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }))}${e.time ? ' · ' + esc(e.time) : ''}</div>
          <div class="t">${esc(e.title)}</div>
          ${e.location ? `<div class="l">${esc(e.location)}</div>` : ''}
          ${e.description ? `<p>${esc(e.description)}</p>` : ''}
          ${(e.tags || []).length ? `<div class="tags">${e.tags.map((t) => `<span class="pill cat">${esc(t)}</span>`).join('')}</div>` : ''}
          ${(e.att || []).length ? `<div class="att">${e.att.map((a) => /^image\//.test(a.type) ? `<img data-asset="${esc(a.id)}" alt="${esc(a.name)}" data-big="${esc(a.id)}" loading="lazy">` : `<a data-asset="${esc(a.id)}" target="_blank" rel="noopener">${esc(a.name)}</a>`).join('')}</div>` : ''}
          ${(e.seat || e.scope) === S.me.seat ? `<div class="acts"><button class="btn ghost sm" data-eev="${esc(e.id)}">${icon('edit')}Edit</button></div>` : ''}
          <div class="hint" style="font-size:12px">Added by ${esc(nameOf(e.seat))}</div></article>`).join('')}</div>`}`;
  },
  bind(box) {
    const seat = this.tab;
    const k = seat !== 'shared' ? kundaliOf(seat) : null;
    const on = (sel, fn) => $$(sel, box).forEach((b) => (b.onclick = (e) => fn(b, e)));
    on('[data-create]', () => openBirthWizard(null));
    on('[data-edit]', () => openBirthWizard(k));
    on('[data-recalc]', () => recalc(k, k.settings, 'Recalculated with the current engine'));
    on('[data-dl]', () => openDownload(k, this.style));
    on('[data-learn]', openLearnMore);
    on('[data-style]', (b) => { this.style = b.dataset.style; try { localStorage.setItem('enko.chartStyle', this.style); } catch {} this.draw(); });
    on('[data-gsel]', (b) => { this.sel = b.dataset.gsel; this.draw(); if (this.sel) { const g = $('#gsel'); g && g.scrollIntoView({ block: 'nearest' }); } });
    $$('tr[data-gsel]', box).forEach((r) => r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); r.click(); } }));
    const cw = $('#chartwrap', box);
    if (cw) cw.onclick = (e) => { const t = e.target.closest('[data-g]'); if (t) { this.sel = t.dataset.g; this.draw(); } };
    on('[data-applyset]', () => recalc(k, { ayanamsa: $('#setAy', box).value, houses: $('#setHo', box).value, node: $('#setNo', box).value }, 'Settings applied'));
    const sh = $('[data-share]', box);
    if (sh) sh.onchange = async () => {
      const want = sh.checked;
      if (!(await confirmBox(want ? `Share your Kundali with ${nameOf(partnerSeat())}? They’ll see your birth details and chart.` : `Stop sharing your Kundali? ${nameOf(partnerSeat())} will no longer see it.`, want ? 'Share' : 'Stop sharing', !want))) { sh.checked = !want; return; }
      try { const { shared, ...rest } = k; await saveKundali(rest, want); toast(want ? 'Kundali shared' : 'Kundali is now private'); } catch (e) { toast(errText(e), 'err'); sh.checked = !want; }
    };
    on('[data-notes]', () => {
      openModal({ title: 'Personal notes', body: `<label class="field"><span class="sr">Notes</span><textarea id="kn" style="min-height:200px" maxlength="10000">${esc(k.notes || '')}</textarea></label>`, foot: `<button class="btn ghost" data-x2>Cancel</button><button class="btn" data-s>Save notes</button>`,
        onMount: (m, close) => { $('[data-x2]', m).onclick = () => close(); $('[data-s]', m).onclick = async () => { try { const { shared, ...rest } = k; await saveKundali({ ...rest, notes: $('#kn', m).value }, shared); toast('Notes saved'); close(); } catch (e) { toast(errText(e), 'err'); } }; } });
    });
    const up = $('[data-upref]', box);
    if (up) up.onchange = async () => {
      const f = up.files[0]; up.value = ''; if (!f) return;
      try {
        let blob = f, type = f.type;
        if (type !== 'application/pdf') { const x = await prepPhoto(f); blob = x.full; type = blob.type || 'image/jpeg'; }
        const u = await upload(blob, type);
        const { shared, ...rest } = k;
        await saveKundali({ ...rest, uploads: [...(k.uploads || []), { id: u.id, name: f.name, type, at: Date.now() }] }, shared);
        toast('Reference document added');
      } catch (e) { toast(e && e.code === 'decode' ? e.message : errText(e), 'err'); }
    };
    on('[data-rmref]', async (b) => {
      const u = k.uploads[Number(b.dataset.rmref)];
      if (!(await confirmBox(`Remove “${u.name}”?`, 'Remove'))) return;
      const { shared, ...rest } = k;
      try { await saveKundali({ ...rest, uploads: k.uploads.filter((x) => x !== u) }, shared); if (S.st.assets) S.st.assets.delete(u.id).catch(() => {}); toast('Removed'); } catch (e) { toast(errText(e), 'err'); }
    });
    on('[data-addev]', (b) => editEvent(null, b.dataset.addev));
    on('[data-eev]', (b) => editEvent(S.data.events.find((e) => e.id === b.dataset.eev)));
    const tq = $('[data-tq]', box);
    if (tq) tq.oninput = debounce((e) => { this.q = e.target.value; const pos = e.target.selectionStart; this.draw(); const n = $('[data-tq]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 250);
    $$('[data-big]', box).forEach((img) => (img.onclick = () => openViewer([{ full: img.dataset.big, caption: img.alt, name: img.alt, seat: S.me.seat, id: '' }], 0, { readOnly: true })));
  },
};
const fmtMonth = (ms) => new Date(ms).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
const fmtDay = (ms) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

async function recalc(k, settings, msg) {
  const inp = inputFromDoc(k);
  try {
    const calc = await calculate(inp, settings);
    const next = buildDoc(inp, calc, k);
    const changes = diffSummary(k, next);
    const go = await new Promise((res) => openModal({
      title: 'Check the recalculated chart', label: 'Recalculated',
      body: changes.length ? `<p style="margin-top:0">These values change:</p><ul class="changes">${changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : `<p style="margin-top:0">Nothing that’s shown in the chart changed. Exact degrees may differ slightly.</p>`,
      foot: `<button class="btn ghost" data-no>Keep the current chart</button><button class="btn" data-ok>Save new chart</button>`,
      onMount: (m, close) => { $('[data-no]', m).onclick = () => close(false); $('[data-ok]', m).onclick = () => close(true); },
      onClose: (v) => res(!!v),
    }));
    if (!go) return;
    const { shared } = k;
    await saveKundali({ ...next, name: k.name }, shared);
    toast(msg);
  } catch (e) { console.error(e); toast(e && e.code ? errText(e) : 'Couldn’t calculate the chart. Check the birth details.', 'err'); }
}
function inputFromDoc(k) {
  const bi = k.birth_input;
  return { name: k.name, date: `${bi.y}-${pad(bi.m)}-${pad(bi.d)}`, time: bi.time || '12:00', timeKnown: bi.timeKnown, tz: k.timezone.id, choice: k.timezone.choice || 0, place: { ...k.birthplace, tzHow: k.timezone.how } };
}

/* ---------- birth details wizard ---------- */
function openBirthWizard(existing) {
  const st = existing ? inputFromDoc(existing) : { name: '', date: '', time: '', timeKnown: true, tz: '', choice: 0, place: null };
  if (existing && !existing.birth_input.timeKnown) st.time = '';
  let step = 1, map = null, calcOut = null, searchCtl = null;
  const shareDefault = existing ? existing.shared : true;
  const settings = existing ? existing.settings : { ayanamsa: 'lahiri', houses: 'whole', node: 'mean' };
  openModal({
    title: existing ? 'Edit birth details' : 'Create your birth chart', wide: true, label: 'Birth details',
    body: `<ol class="steps" aria-label="Steps"><li data-s="1">Date &amp; time</li><li data-s="2">Birthplace</li><li data-s="3">Review</li><li data-s="4">Your chart</li></ol><div id="wz"></div>`,
    foot: `<button class="btn ghost left" data-back>Back</button><button class="btn" data-next>Continue</button>`,
    onClose: () => { map && map.destroy(); searchCtl && searchCtl.abort(); },
    onMount: (m, close) => {
      const wz = $('#wz', m), next = $('[data-next]', m), back = $('[data-back]', m);
      const draw = () => {
        $$('.steps li', m).forEach((li) => { li.classList.toggle('on', Number(li.dataset.s) === step); li.classList.toggle('done', Number(li.dataset.s) < step); });
        back.style.visibility = step > 1 && step < 5 ? 'visible' : 'hidden';
        if (step === 1) {
          wz.innerHTML = `<label class="field"><span>Name on the chart (optional)</span><input id="wn" maxlength="80" value="${esc(st.name)}" placeholder="${esc(nameOf(S.me.seat))}"></label>
            <div class="row"><label class="field"><span>Date of birth</span><input id="wd" type="date" required min="1800-01-01" max="${todayISO()}" value="${esc(st.date)}"></label>
            <label class="field"><span>Local birth time</span><input id="wt" type="time" value="${esc(st.time)}" ${st.timeKnown ? '' : 'disabled'}><small class="hint" id="wtEcho" aria-live="polite"></small></label></div>
            <label class="check"><input type="checkbox" id="wu" ${st.timeKnown ? '' : 'checked'}> I don’t know the exact birth time</label>
            <p class="hint">Use the clock time where you were born, as written on a birth certificate. Vice Space works out the time zone and daylight saving for that date.</p>
            <p class="hint" id="wErr" role="alert"></p>`;
          const echo = () => { const v = $('#wt', m).value; $('#wtEcho', m).textContent = v ? `${v} — ${ampm(v)}` : ''; };
          $('#wt', m).oninput = echo; echo();
          $('#wu', m).onchange = (e) => { $('#wt', m).disabled = e.target.checked; };
          next.textContent = 'Continue';
        } else if (step === 2) {
          const p = st.place;
          wz.innerHTML = `<form id="ps" class="search-row" role="search"><div class="search grow">${icon('search')}<input class="input" id="pq" type="search" placeholder="City, district or street — e.g. Vilnius, Lithuania" autocomplete="off" aria-label="Search birthplace"></div><button class="btn ghost" type="submit">Search</button></form>
            <div id="pres" class="pres" aria-live="polite"></div>
            <div class="mapbox" id="mapbox"></div>
            <div id="psel" class="psel"></div>
            <details class="adv" id="manual"><summary>Enter coordinates yourself</summary>
              <div class="row" style="margin-top:10px"><label class="field"><span>Latitude</span><input id="mla" type="number" step="0.0001" min="-90" max="90" placeholder="54.6872"></label>
              <label class="field"><span>Longitude</span><input id="mlo" type="number" step="0.0001" min="-180" max="180" placeholder="25.2797"></label>
              <label class="field"><span>Country</span><select id="mcc"><option value="">Choose…</option>${Object.entries(GEO.countries).sort((a, b) => a[1].localeCompare(b[1])).map(([cc, n]) => `<option value="${cc}">${esc(n)}</option>`).join('')}</select></label></div>
              <button type="button" class="btn ghost sm" id="mgo">Use these coordinates</button></details>`;
          const start = p || { lat: 22, lon: 78 };
          map = MapPicker($('#mapbox', m), { lat: start.lat, lon: start.lon, onPick: (a, b) => { st.place = Places.fromPin(a, b, st.place && st.place.cc); st.tz = st.place.tz; showSel(); } });
          if (p) map.setPoint(p.lat, p.lon, 9);
          const showSel = () => {
            const s = st.place;
            $('#psel', m).innerHTML = s ? `<div class="selcard"><div><b>${esc(s.label)}</b><br><small>${s.lat.toFixed(4)}°, ${s.lon.toFixed(4)}° · ${esc(s.precision === 'pin' ? 'pin on map' : s.precision + ' level')}${s.source === 'claude' ? ' · found by Claude — check the pin' : s.source === 'openstreetmap' ? ' · OpenStreetMap' : ''}</small></div><div class="tzline">${icon('clock')}<span>${esc(s.tz)}</span></div></div>` : '<p class="hint">Search for the place, or tap the map to drop a pin.</p>';
            next.disabled = !s;
          };
          const pick = (r) => { st.place = r; st.tz = r.tz; map.setPoint(r.lat, r.lon, r.precision === 'street' ? 15 : r.precision === 'district' ? 12 : 9); showSel(); };
          const results = (list, src, q) => {
            const box = $('#pres', m);
            box.innerHTML = list.length ? list.map((r, i) => `<button type="button" class="pcard" data-i="${i}"><b>${esc(r.name)}</b><small>${esc([r.region, Places.country(r.cc)].filter(Boolean).join(', '))}</small><small class="muted">${esc(r.tz)}</small></button>`).join('') + (src === 'built-in' ? `<button type="button" class="pcard more" data-wide>${icon('search')}<b>Search more widely</b><small>Districts, streets, smaller towns</small></button>` : '')
              : `<p class="hint">${src === 'built-in' ? 'Not in the built-in list.' : 'Nothing found.'} ${src === 'built-in' ? '' : 'Try another spelling, or drop a pin / enter coordinates below.'}</p>${src === 'built-in' ? `<button type="button" class="pcard more" data-wide>${icon('search')}<b>Search more widely for “${esc(q)}”</b></button>` : ''}`;
            $$('[data-i]', box).forEach((b) => (b.onclick = () => pick(list[Number(b.dataset.i)])));
            const w = $('[data-wide]', box); if (w) w.onclick = () => wide(q);
          };
          const wide = async (q) => {
            searchCtl && searchCtl.abort(); searchCtl = new AbortController();
            $('#pres', m).innerHTML = `<p class="hint">Searching…</p>`;
            try { const { results: r, source } = await Places.searchWide(q, searchCtl.signal); results(r, source, q); }
            catch (e) {
              if (e && e.code === 'cancelled') return;
              $('#pres', m).innerHTML = `<p class="hint">${e && e.code === 'not_granted' ? 'Wider search needs permission to ask Claude.' : 'Wider search isn’t available right now.'} Drop a pin on the map or enter coordinates below.</p>`;
              $('#manual', m).open = true;
            }
          };
          $('#ps', m).onsubmit = (e) => { e.preventDefault(); const q = $('#pq', m).value.trim(); if (!q) return; const loc = Places.searchLocal(q); if (loc.length === 1 && !loc[0].region) pick(loc[0]); results(loc, 'built-in', q); };
          $('#pq', m).oninput = debounce(() => { const q = $('#pq', m).value.trim(); if (q.length >= 2) results(Places.searchLocal(q), 'built-in', q); else $('#pres', m).innerHTML = ''; }, 200);
          $('#mgo', m).onclick = () => {
            const a = parseFloat($('#mla', m).value), b = parseFloat($('#mlo', m).value), cc = $('#mcc', m).value;
            if (!(Math.abs(a) <= 90 && Math.abs(b) <= 180)) { toast('Enter a latitude between −90 and 90 and a longitude between −180 and 180.', 'err'); return; }
            const r = Places.fromPin(a, b, cc); if (cc) { const t = Places.tzFor(a, b, cc); Object.assign(r, { cc, tz: t.tz, tzHow: t.how, tzAlternatives: t.alternatives, label: `${a.toFixed(4)}°, ${b.toFixed(4)}°, ${Places.country(cc)}` }); }
            pick(r);
          };
          showSel();
          setTimeout(() => $('#pq', m).focus(), 50);
          next.textContent = 'Continue';
        } else if (step === 3) {
          const p = st.place;
          const [y, mo, d] = st.date.split('-').map(Number);
          const [h, mi] = st.timeKnown ? st.time.split(':').map(Number) : [12, 0];
          const conv = TZ.localToUtc({ y, m: mo, d, h, mi }, st.tz);
          const pickOpt = conv.status === 'ok' ? conv : conv.options[Math.min(st.choice, conv.options.length - 1)];
          const conf = TZ.confidence({ y }, pickOpt.offsetSec);
          const alts = [...new Set([st.tz, ...(p.tzAlternatives || []), ...Places.zonesOf(p.cc).map((z) => z.tz)])].filter(TZ.isValid);
          const born = new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
          wz.innerHTML = `<div class="review">
              <p class="rv-line">Born ${esc(born)}, ${st.timeKnown ? esc(st.time) + ` <span class="muted">(${esc(ampm(st.time))})</span>` : '<i>time unknown</i>'}, ${esc(p.label)}</p>
              <p class="rv-tz"><b>${esc(st.tz)}</b> · UTC offset at birth: <b>${esc(TZ.fmtOffset(pickOpt.offsetSec))}</b>${TZ.abbr(st.tz, pickOpt.utcMs) && !/^GMT/.test(TZ.abbr(st.tz, pickOpt.utcMs)) ? ' (' + esc(TZ.abbr(st.tz, pickOpt.utcMs)) + ')' : ''}<br><small class="muted">= ${esc(new Date(pickOpt.utcMs).toISOString().replace('T', ' ').slice(0, 16))} UTC · ${p.lat.toFixed(4)}°, ${p.lon.toFixed(4)}°</small></p>
            </div>
            ${conv.status === 'gap' ? `<div class="banner warn" role="alert">${icon('clock')}<span>${esc(st.time)} didn’t exist on this date in ${esc(st.tz)} — clocks jumped forward that night. Which did you mean?</span></div>
              <div class="choice">${conv.options.map((o, i) => `<label class="check"><input type="radio" name="ch" value="${i}" ${i === st.choice ? 'checked' : ''}> Read with the offset ${o.label === 'before' ? 'before' : 'after'} the change (${esc(TZ.fmtOffset(o.offsetSec))})</label>`).join('')}</div>` : ''}
            ${conv.status === 'overlap' ? `<div class="banner warn" role="alert">${icon('clock')}<span>${esc(st.time)} happened twice on this date in ${esc(st.tz)} — clocks went back that night. Which one?</span></div>
              <div class="choice">${conv.options.map((o, i) => `<label class="check"><input type="radio" name="ch" value="${i}" ${i === st.choice ? 'checked' : ''}> ${i === 0 ? 'First' : 'Second'} time, ${esc(TZ.fmtOffset(o.offsetSec))} (${esc(new Date(o.utcMs).toISOString().slice(11, 16))} UTC)</label>`).join('')}</div>` : ''}
            ${conf.notes.map((n) => `<div class="banner">${icon('bell')}<span>${esc(n)}</span></div>`).join('')}
            ${p.tzHow === 'nearest-in-country' || p.tzHow === 'nearest' ? `<div class="banner">${icon('map')}<span>${esc(Places.country(p.cc) || 'This area')} has more than one time zone. Vice Space picked the zone of the nearest major city — please confirm.</span></div>` : ''}
            ${alts.length > 1 ? `<label class="field" style="max-width:420px"><span>Time zone</span><select id="tzs">${alts.map((t) => `<option ${t === st.tz ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>` : ''}
            ${!st.timeKnown ? `<p class="hint">Without a birth time, Lagna and houses can’t be calculated. Planet positions are worked out for noon; Vice Space will show which Moon results could change during the day.</p>` : ''}
            <p class="hint">Calculation: sidereal zodiac, ${esc((Astro.AYANAMSAS[settings.ayanamsa] || Astro.AYANAMSAS.lahiri).name)} ayanamsa, ${settings.houses === 'equal' ? 'equal' : 'whole-sign'} houses, Vimshottari Dasha. You can change these later under Advanced settings.</p>`;
          $$('[name=ch]', m).forEach((r) => (r.onchange = () => { st.choice = Number(r.value); draw(); }));
          const tzs = $('#tzs', m); if (tzs) tzs.onchange = () => { st.tz = tzs.value; st.choice = 0; st.place = { ...st.place, tzHow: 'chosen' }; draw(); };
          next.textContent = 'Generate chart';
        } else if (step === 4) {
          const r = calcOut.doc;
          const changes = diffSummary(existing, r);
          wz.innerHTML = `<div class="kgrid2 tight"><div class="chartwrap small">${chartSvg(r, 'north', '')}</div>
            <div><p class="badge-calc">${icon('check')}Calculated by Vice Space</p>
            <dl class="dl"><dt>Lagna</dt><dd>${r.lagna ? esc(signName(r.lagna.sign)) + ' ' + Astro.dms(r.lagna.deg) : 'Unavailable (no birth time)'}</dd>
            <dt>Rashi</dt><dd>${r.moonRange && r.moonRange.signs.length > 1 ? r.moonRange.signs.map(signName).map(esc).join(' or ') : esc(signName(r.moon.sign))}</dd>
            <dt>Nakshatra</dt><dd>${r.moonRange && r.moonRange.naks.length > 1 ? r.moonRange.naks.map((n) => esc(Astro.NAKS[n])).join(' / ') : esc(Astro.NAKS[r.moon.nak]) + ', pada ' + r.moon.pada}</dd>
            <dt>Mahadasha at birth</dt><dd>${esc(DASHA_NAMES[r.dasha.list[0].lord])}</dd></dl>
            ${changes.length ? `<p style="margin-bottom:4px"><b>Changed from your saved chart:</b></p><ul class="changes">${changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
            <label class="check"><input type="checkbox" id="wsh" ${shareDefault ? 'checked' : ''}> Let ${esc(nameOf(partnerSeat()))} see my Kundali</label>
            <p class="hint">${esc(calcOut.doc.calculation.engine)}${calcOut.doc.calculation.crossCheck ? `, cross-checked (max difference ${calcOut.doc.calculation.crossCheck.maxDiff.toFixed(2)}°)` : ''}.</p></div></div>`;
          next.textContent = 'Save Kundali';
        }
      };
      back.onclick = () => { if (step > 1) { if (step === 2) { map && map.destroy(); map = null; } step--; next.disabled = false; draw(); } };
      next.onclick = async () => {
        if (step === 1) {
          const d = $('#wd', m).value, t = $('#wt', m).value, unk = $('#wu', m).checked;
          const err = (s) => { $('#wErr', m).textContent = s; };
          if (!d) return err('Enter the date of birth.');
          const [y] = d.split('-').map(Number);
          if (y < 1800 || d > todayISO()) return err('Enter a date between 1800 and today.');
          if (!unk && !t) return err('Enter the birth time, or tick “I don’t know the exact birth time”.');
          Object.assign(st, { name: $('#wn', m).value.trim(), date: d, time: t, timeKnown: !unk, choice: 0 });
          step = 2; draw();
        } else if (step === 2) {
          if (!st.place) return;
          map && map.destroy(); map = null; step = 3; draw();
        } else if (step === 3) {
          next.disabled = true; next.textContent = 'Calculating…';
          try {
            const calc = await calculate(st, settings);
            calcOut = { calc, doc: { ...buildDoc(st, calc, existing), name: st.name } };
            step = 4; draw();
          } catch (e) { console.error(e); toast('Couldn’t calculate the chart. Check the details and try again.', 'err'); next.textContent = 'Generate chart'; }
          next.disabled = false;
        } else if (step === 4) {
          next.disabled = true; next.textContent = 'Saving…';
          try { await saveKundali(calcOut.doc, $('#wsh', m).checked); const both = ['A', 'B'].every((x) => { const kk = kundaliOf(x); return kk && !kk.stub; }); toast(both ? 'Kundali saved — compatibility calculated' : 'Kundali saved'); close(); VIEWS.kundlis.tab = both ? 'pair' : S.me.seat; VIEWS.kundlis.auto = false; VIEWS.kundlis.draw && VIEWS.kundlis.draw(); }
          catch (e) { toast(errText(e), 'err'); next.disabled = false; next.textContent = 'Save Kundali'; }
        }
      };
      draw();
    },
  });
}

function openLearnMore() {
  openModal({
    title: 'How Vice Space calculates your chart', wide: true,
    body: `<div class="learn">
      <p>Astrology is a traditional interpretive practice, not a verified science. Vice Space calculates the <b>chart data</b> — where the Sun, Moon and planets were — with standard astronomy. Meanings shown are traditional interpretations, not facts or predictions.</p>
      <h4>1. Your moment of birth</h4><p>Your local clock time and birthplace are turned into one exact instant in Universal Time, using the official world time-zone database and the rules in force on your birth date — including daylight saving and historical changes.</p>
      <h4>2. Where everything was</h4><p>Planet positions are computed for that instant${''} with Astronomy Engine, an open-source library checked against NASA JPL data, and cross-checked against Vice Space’s own engine. If the library can’t load, Vice Space’s own engine is used and the page says so.</p>
      <h4>3. Sidereal zodiac</h4><p>Vedic astrology measures signs against the stars. The ayanamsa (Lahiri by default) is the gap between the seasonal and the star-based zodiac — about 24° today.</p>
      <h4>4. Lagna and houses</h4><p>The Lagna is the sign rising in the east at your birthplace at that moment. With whole-sign houses, the Lagna’s sign becomes house 1 and the next signs follow in order.</p>
      <h4>5. Moon details</h4><p>Your Rashi is the Moon’s sign. The 27 Nakshatras each span 13°20′, split into four padas of 3°20′.</p>
      <h4>6. Dashas</h4><p>The Vimshottari sequence starts from the ruler of the Moon’s Nakshatra. How far the Moon had travelled through that Nakshatra sets how much of the first period remained at birth.</p>
    </div>`,
  });
}

/* ---------- downloads: PNG and PDF ---------- */
async function chartPng(k, style, size = 1200) {
  const svg = chartSvg(k, style, '').replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" `)
    .replace('>', `><style>${CHART_CSS}</style><rect x="-2" y="-2" width="404" height="404" fill="#FFF9FB"/>`);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const g = c.getContext('2d'); g.fillStyle = '#FFF9FB'; g.fillRect(0, 0, size, size); g.drawImage(img, 0, 0, size, size);
  return c;
}
const CHART_CSS = `.cell{fill:#FFF9FB;stroke:#B83D72;stroke-width:1.5}.cell.first{fill:#FFE4EE}.sn{font:600 11px sans-serif;fill:#9A6A82}.gt{font:700 14px sans-serif;fill:#3E2A36}.hl{font:600 11px sans-serif;fill:#B83D72}.ct{font:700 16px sans-serif;fill:#3E2A36}.cs{font:12px sans-serif;fill:#6E5060}.asl{stroke:#B83D72;stroke-width:1.5}`;
function openDownload(k, style) {
  const base = (k.name || nameOf(k.seat) || 'kundali').replace(/[^\w-]+/g, '_');
  openModal({
    title: 'Download chart',
    body: `<p style="margin-top:0">Save a copy of the calculated chart.</p><div class="row"><button class="btn" data-png>${icon('image')}Chart image (PNG)</button><button class="btn ghost" data-pdf>${icon('pdf')}Full report (PDF)</button></div>`,
    onMount: (m, close) => {
      $('[data-png]', m).onclick = async () => { try { const c = await chartPng(k, style); const b = await new Promise((r) => c.toBlob(r, 'image/png')); if (await saveFile(base + '-chart.png', b)) toast('Chart image saved'); close(); } catch (e) { console.error(e); toast('Couldn’t make the image.', 'err'); } };
      $('[data-pdf]', m).onclick = async () => { try { const b = await kundaliPdf(k, style); if (await saveFile(base + '-kundali.pdf', b)) toast('Report saved'); close(); } catch (e) { console.error(e); toast('Couldn’t make the PDF.', 'err'); } };
    },
  });
}
async function kundaliPdf(k, style) {
  const c = await chartPng(k, style, 900);
  const jpg = new Uint8Array(await (await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92))).arrayBuffer());
  const bi = k.birth_input, tz = k.timezone;
  const L = [];
  L.push(['h', `${k.name || nameOf(k.seat)} - Kundali`]);
  L.push(['p', `Born ${fmtBorn(bi)} - ${k.birthplace.label}`]);
  L.push(['p', `${tz.id}, ${tz.offsetLabel.replace('−', '-')} at birth - ${k.utc_birth_instant.replace('T', ' ').slice(0, 16)} UTC - ${k.birthplace.lat.toFixed(4)}, ${k.birthplace.lon.toFixed(4)}`]);
  L.push(['p', `Calculated by Vice Space (${k.calculation.engine}, ${k.calculation.version}). Sidereal, ${(Astro.AYANAMSAS[k.settings.ayanamsa] || Astro.AYANAMSAS.lahiri).name} ayanamsa, ${k.settings.houses === 'equal' ? 'equal' : 'whole-sign'} houses.`]);
  L.push(['img']);
  L.push(['b', `Lagna: ${k.lagna ? signName(k.lagna.sign) + ' ' + Astro.dms(k.lagna.deg) : 'unavailable (birth time unknown)'}    Rashi: ${signName(k.moon.sign)}    Nakshatra: ${Astro.NAKS[k.moon.nak]}, pada ${k.moon.pada}`]);
  L.push(['h2', 'Graha placements']);
  for (const p of k.planets) L.push(['m', `${grahaLabel(p.key).padEnd(18)} ${signName(p.sign).padEnd(24)} ${Astro.dms(p.deg).padEnd(8)} ${(Astro.NAKS[p.nak] + ' ' + p.pada).padEnd(20)} ${p.house && k.lagna ? 'house ' + p.house : ''}${p.retro ? '  R' : ''}`]);
  L.push(['h2', 'Vimshottari Mahadashas']);
  for (const d of k.dasha.list) L.push(['m', `${DASHA_NAMES[d.lord].padEnd(18)} ${fmtMonth(d.start)} - ${fmtMonth(d.end)}`]);
  L.push(['s', 'Positions are calculated chart data. Interpretations in Jyotish are traditional, not scientific forecasts.']);
  return makePdf(L, jpg, c.width, c.height);
}
function makePdf(lines, jpg, iw, ih) {
  const W = 595, H = 842, M = 48;
  const enc = (s) => String(s).replace(/[′]/g, "'").replace(/[–—]/g, '-').replace(/[^\x20-\x7E°]/g, '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const pages = []; let cur = [], y = H - M;
  const need = (h) => { if (y - h < M) { pages.push(cur); cur = []; y = H - M; } };
  for (const [t, s] of lines) {
    if (t === 'img') { const w = 300, h = (ih / iw) * w; need(h + 24); cur.push(`q ${w} 0 0 ${h} ${(W - w) / 2} ${y - h - 10} cm /Im1 Do Q`); y -= h + 22; continue; }
    const [font, size, lead] = t === 'h' ? ['F2', 18, 26] : t === 'h2' ? ['F2', 12, 22] : t === 'b' ? ['F2', 10, 16] : t === 'm' ? ['F3', 8.5, 12] : t === 's' ? ['F1', 8, 14] : ['F1', 10, 14];
    const maxChars = font === 'F3' ? 110 : Math.floor((W - 2 * M) / (size * 0.5));
    const words = String(s).split(' '); const rows = []; let row = '';
    for (const w of words) { if ((row + ' ' + w).trim().length > maxChars) { rows.push(row); row = w; } else row = (row + ' ' + w).trim(); }
    rows.push(row);
    for (const r of rows) { need(lead); y -= lead; cur.push(`BT /${font} ${size} Tf ${M} ${y} Td (${enc(r)}) Tj ET`); }
  }
  pages.push(cur);
  const objs = [];
  const add = (s) => { objs.push(s); return objs.length; };
  const catalog = add(''), pagesId = add('');
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const f3 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>');
  const im = add({ img: true });
  const kids = [];
  for (const p of pages) {
    const content = p.join('\n');
    const cid = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> /XObject << /Im1 ${im} 0 R >> >> /Contents ${cid} 0 R >>`));
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const te = new TextEncoder();
  const latin1 = (s) => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
  const parts = [latin1('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')]; let off = parts[0].length; const xref = [];
  objs.forEach((o, i) => {
    xref.push(off);
    let chunk;
    if (o && o.img) {
      const head = latin1(`${i + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
      const tail = latin1('\nendstream\nendobj\n');
      chunk = new Uint8Array(head.length + jpg.length + tail.length); chunk.set(head); chunk.set(jpg, head.length); chunk.set(tail, head.length + jpg.length);
    } else chunk = latin1(`${i + 1} 0 obj\n${o}\nendobj\n`);
    parts.push(chunk); off += chunk.length;
  });
  const x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${xref.map((n) => String(n).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${off}\n%%EOF`;
  parts.push(latin1(x));
  void te;
  return new Blob(parts, { type: 'application/pdf' });
}

/* ---------- life timeline events (unchanged behaviour) ---------- */
function editEvent(ev, scope) {
  const e = ev || { scope, date: todayISO(), tags: [], att: [] };
  let att = [...(e.att || [])];
  const scopes = [[S.me.seat, 'My timeline'], ['shared', 'Our timeline']];
  openModal({
    title: ev ? 'Edit moment' : 'Add a moment',
    body: `<form id="ef">
      <label class="field"><span>What happened?</span><input name="title" required maxlength="140" value="${esc(e.title || '')}" placeholder="e.g. First trip to Jaipur"></label>
      <div class="row"><label class="field"><span>Date</span><input name="date" type="date" required value="${esc(e.date || '')}"></label>
      <label class="field"><span>Time (optional)</span><input name="time" type="time" value="${esc(e.time || '')}"></label></div>
      <label class="field"><span>Where</span><input name="location" maxlength="160" value="${esc(e.location || '')}" placeholder="Place, city"></label>
      <label class="field"><span>Story</span><textarea name="description" maxlength="5000">${esc(e.description || '')}</textarea></label>
      <label class="field"><span>Tags</span><input name="tags" maxlength="200" value="${esc((e.tags || []).join(', '))}" placeholder="travel, family, firsts"></label>
      <label class="field"><span>Save to</span><select name="scope">${scopes.map(([v, l]) => `<option value="${v}" ${v === e.scope ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="field"><span>Photos or documents</span><div id="attl" class="hint"></div>${S.st.assets ? `<input type="file" name="files" multiple accept="image/*,application/pdf">` : '<p class="hint">Ask for Editor access to attach files.</p>'}</div>
    </form>`,
    foot: `${ev ? `<button class="btn ghost left" data-del>${icon('trash')}Delete</button>` : ''}<button class="btn ghost" data-x2>Cancel</button><button class="btn" data-s>${ev ? 'Save changes' : 'Add moment'}</button>`,
    onMount: (m, close) => {
      const f = $('#ef', m);
      const drawAtt = () => {
        $('#attl', m).innerHTML = att.map((a, i) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:8px">${esc(a.name)}<button type="button" class="icon-btn" style="width:32px;height:32px" data-ra="${i}" aria-label="Remove ${esc(a.name)}">${icon('close')}</button></span>`).join('');
        $$('[data-ra]', m).forEach((b) => (b.onclick = () => { att.splice(Number(b.dataset.ra), 1); drawAtt(); }));
      };
      drawAtt();
      $('[data-x2]', m).onclick = () => close();
      $('[data-s]', m).onclick = async () => {
        if (!f.reportValidity()) return;
        const btn = $('[data-s]', m); btn.disabled = true; btn.textContent = 'Saving…';
        try {
          for (const file of f.files ? [...f.files.files] : []) {
            let blob = file, type = file.type;
            if (type !== 'application/pdf') { const x = await prepPhoto(file); blob = x.full; type = blob.type || 'image/jpeg'; }
            const up = await upload(blob, type);
            att.push({ id: up.id, name: file.name, type });
          }
          const body = { title: f.title.value.trim(), date: f.date.value, time: f.time.value, location: f.location.value.trim(), description: f.description.value.trim(), tags: f.tags.value.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12), scope: f.scope.value, att };
          if (ev) await retryOnce(() => S.st.db.doc('events/' + ev.id).update({ ...body, editedSeat: S.me.seat, editedAt: Date.now() }));
          else await retryOnce(() => S.st.db.collection('events').doc(uid()).set({ ...body, seat: S.me.seat, at: Date.now() }));
          toast(ev ? 'Moment saved' : 'Moment added'); close();
        } catch (er) { toast(er && er.code === 'decode' ? er.message : errText(er), 'err'); btn.disabled = false; btn.textContent = 'Try again'; }
      };
      const d = $('[data-del]', m);
      if (d) d.onclick = async () => {
        if (!(await confirmBox(`Delete “${e.title}” from the timeline?`, 'Delete moment'))) return;
        try { await S.st.db.doc('events/' + ev.id).delete(); toast('Moment deleted'); close(); } catch (er) { toast(errText(er), 'err'); }
      };
    },
  });
}
