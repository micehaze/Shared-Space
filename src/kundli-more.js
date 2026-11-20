/* ============================================================
   Kundlis: explained positions, compatibility (Guna Milan),
   and day / week / month / year forecasts from transits.
   All of it is computed from the saved charts with classical
   Jyotish rules. It is traditional interpretation, not science.
   ============================================================ */
const FC = (() => {
  const B = () => Astro.builtin;
  const KEYS7 = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const DAY = 86400000;
  function lons(ms, st = {}) {
    const jd = Astro.jdFromMs(ms), jdTT = jd + Astro.deltaT(new Date(ms).getUTCFullYear()) / 86400;
    const T = (jdTT - 2451545) / 36525, ay = Astro.ayanamsa(jdTT, st.ayanamsa || 'lahiri');
    const t = B().tropical(ms), nd = st.node === 'true' ? Astro.trueNode(T) : Astro.meanNode(T);
    const o = {};
    for (const k of KEYS7) o[k] = Astro.norm(t[k] - ay);
    o.Rahu = Astro.norm(nd - ay); o.Ketu = Astro.norm(nd + 180 - ay);
    return o;
  }
  function sky(ms, st) {
    const a = lons(ms, st), b = lons(ms - DAY / 2, st), c = lons(ms + DAY / 2, st);
    return Astro.GRAHAS.map((g) => ({ key: g.key, ...Astro.point(a[g.key]), retro: g.key === 'Rahu' || g.key === 'Ketu' ? true : g.key !== 'Sun' && g.key !== 'Moon' && Astro.norm(c[g.key] - b[g.key]) > 180 }));
  }
  function ingresses(key, from, to, st, step) {
    const out = [];
    let t = from, s = Math.floor(lons(t, st)[key] / 30);
    while (t < to) {
      const t2 = Math.min(to, t + step), s2 = Math.floor(lons(t2, st)[key] / 30);
      if (s2 !== s) {
        let lo = t, hi = t2;
        for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (Math.floor(lons(m, st)[key] / 30) === s) lo = m; else hi = m; }
        out.push({ key, at: hi, from: s, to: s2 });
        s = s2;
      }
      t = t2;
    }
    return out;
  }
  const noon = (d) => { const x = new Date(d); x.setHours(12, 0, 0, 0); return x.getTime(); };
  const WEEKDAY_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  function day(k, ms) {
    const L = lons(ms, k.settings);
    const mSign = Math.floor(L.Moon / 30), mNak = Math.min(26, Math.floor(L.Moon / (360 / 27)));
    const h = JY.fromMoon(mSign, k.moon.sign);
    const tara = JY.tara(k.moon.nak, mNak);
    const ch = h === 8;
    const wl = WEEKDAY_LORD[new Date(ms).getDay()];
    const wr = JY.rel(wl, JY.SIGN_LORD[k.moon.sign]);
    const jH = JY.fromMoon(Math.floor(L.Jupiter / 30), k.moon.sign), sH = JY.fromMoon(Math.floor(L.Saturn / 30), k.moon.sign);
    let score = 50 + (JY.GOOD.Moon.includes(h) ? 16 : -9) + (tara[1] === 'good' ? 13 : tara[1] === 'bad' ? -14 : -4) + (ch ? -20 : 0)
      + (wr === 'friend' || wr === 'same' ? 4 : wr === 'enemy' ? -4 : 0) + (JY.GOOD.Jupiter.includes(jH) ? 4 : -1) + (JY.GOOD.Saturn.includes(sH) ? 3 : [12, 1, 2, 8].includes(sH) ? -4 : 0);
    score = Math.max(6, Math.min(96, Math.round(score)));
    return { ms, h, mSign, mNak, tara, ch, wl, wr, score, lagnaH: k.lagna ? ((mSign - k.lagna.sign + 12) % 12) + 1 : null };
  }
  const WEIGHT = { Jupiter: 3, Saturn: 3, Rahu: 1.5, Ketu: 1, Mars: 1.5, Sun: 1, Venus: 1, Mercury: 1 };
  function period(k, ms) {
    const L = lons(ms, k.settings);
    let s = 0, w = 0;
    for (const key in WEIGHT) {
      const h = JY.fromMoon(Math.floor(L[key] / 30), k.moon.sign);
      // compare with the share of houses that are good for this planet, so slow planets with few good houses don't drag every month down
      s += ((JY.GOOD[key].includes(h) ? 1 : 0) - JY.GOOD[key].length / 12) * WEIGHT[key]; w += WEIGHT[key];
      if (key === 'Saturn' && [12, 1, 2, 8].includes(h)) s -= 0.4;
    }
    return Math.max(6, Math.min(96, Math.round(52 + 75 * (s / w))));
  }
  const rating = (s) => (s >= 72 ? 'Excellent' : s >= 58 ? 'Good' : s >= 44 ? 'Mixed' : 'Take care');
  return { lons, sky, ingresses, day, period, rating, noon, DAY };
})();

const HOUSE_DO = ['self-care, fresh starts and how you present yourself', 'money planning, family time and honest talk', 'messages, short trips and bold first steps', 'home, rest, cooking and family', 'romance, play, creative work and study', 'chores, health routines and clearing your to-do list', 'time with your partner, meetings and agreements', 'quiet research, reflection and shared finances (carefully)', 'learning, travel plans, gratitude and teachers', 'work, visibility and decisions', 'friends, networking and collecting what you’ve earned', 'rest, sleep, meditation and letting go'];
const OVERLAY = { Sun: 'brings warmth, attention and a sense of purpose to', Moon: 'brings emotional comfort and familiarity to', Mars: 'energises — and can heat up —', Mercury: 'stimulates talk and shared ideas around', Jupiter: 'expands, protects and blesses', Venus: 'adds affection, attraction and pleasure to', Saturn: 'adds commitment, seriousness and some weight to', Rahu: 'creates fascination and restless attraction around', Ketu: 'brings a familiar, “known you before” feeling — and some detachment — to' };
const HOUSE_AVOID = ['overreacting to small things', 'careless spending and sharp words', 'impatience and gossip', 'bringing work stress home', 'risky bets and drama in love', 'skipping rest and arguing at work', 'taking your partner for granted', 'big decisions, risky travel and arguments', 'rigid opinions and preaching', 'cutting corners at work', 'overcommitting to plans', 'overspending, late nights and isolating yourself'];
const DAY_COLOR = { Sun: 'orange or red', Moon: 'white or silver', Mars: 'red', Mercury: 'green', Jupiter: 'yellow', Venus: 'white or pastel pink', Saturn: 'dark blue or black' };
const COUPLE_PLAN = ['try something new together', 'a good dinner, at home or out', 'a short trip or a long talk', 'a cosy evening at home', 'a date — romance and fun are favoured', 'sort out practical things together', 'quality time as a couple; talk about plans', 'a deep, honest talk — gently', 'plan a trip or learn something together', 'back each other’s work goals', 'see friends together', 'rest together and have an early night'];
const MOON_OVER = { Sun: 'confidence and attention', Moon: 'emotions close to the surface', Mars: 'energy — and a quicker temper', Mercury: 'chatty, good for talks', Jupiter: 'optimism and generosity', Venus: 'affection and attraction run high', Saturn: 'seriousness, maybe tiredness', Rahu: 'restlessness and cravings', Ketu: 'distracted or dreamy' };
function coupleDay(kA, kB, ms, nA, nB) {
  const a = FC.day(kA, ms), b = FC.day(kB, ms);
  let score = (a.score + b.score) / 2;
  const romance = [5, 7, 11];
  if (romance.includes(a.h) || romance.includes(b.h)) score += 6;
  if (JY.GOOD.Moon.includes(a.h) && JY.GOOD.Moon.includes(b.h)) score += 4;
  if (a.ch || b.ch) score -= 8;
  const touch = [];
  for (const [k, n] of [[kA, nA], [kB, nB]]) for (const p of k.planets) if (p.sign === a.mSign && MOON_OVER[p.key]) touch.push({ who: n, key: p.key, t: MOON_OVER[p.key] });
  if (touch.some((x) => x.key === 'Venus' || x.key === 'Jupiter')) score += 3;
  if (touch.some((x) => x.key === 'Saturn')) score -= 2;
  score = Math.max(6, Math.min(96, Math.round(score)));
  const best = [a, b].sort((x, y) => (JY.GOOD.Moon.includes(y.h) ? 1 : 0) - (JY.GOOD.Moon.includes(x.h) ? 1 : 0) || ([5, 7, 11, 4].includes(y.h) ? 1 : 0) - ([5, 7, 11, 4].includes(x.h) ? 1 : 0))[0];
  return { ms, a, b, score, touch, plan: COUPLE_PLAN[best.h - 1] };
}
const fmtW = (ms) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const scoreBar = (s, cls = '') => `<span class="meter ${cls}"><i style="width:${s}%"></i></span>`;
const rd = (title, body, open = false, sub = '', g = '') => `<details class="rd"${open ? ' open' : ''}><summary><span class="rd-t">${title}</span>${sub ? `<span class="rd-s">${sub}</span>` : ''}${g ? `<span class="rd-g">${g}</span>` : ''}</summary><div class="rd-b">${body}</div></details>`;
const DISCLAIM = '<p class="hint">These readings follow classical Jyotish rules applied to the calculated positions. They are traditional interpretations for reflection — not scientific facts or guaranteed predictions.</p>';

function placeIn(k, planets) {
  return { lagna: k.lagna, moon: k.moon, planets: planets.map((p) => ({ ...p, house: k.lagna ? ((p.sign - k.lagna.sign + 12) % 12) + 1 : null })) };
}
function yogas(k) {
  const pl = (key) => k.planets.find((p) => p.key === key);
  const moon = pl('Moon'), out = [];
  const fromM = (p) => JY.fromMoon(p.sign, moon.sign);
  const jh = fromM(pl('Jupiter'));
  if ([1, 4, 7, 10].includes(jh)) out.push(['Gaja Kesari yoga', 'Jupiter is in an angle from your Moon. Traditionally this gives good judgement, respect and the ability to recover from setbacks — “the elephant and the lion”.']);
  if (pl('Sun').sign === pl('Mercury').sign) out.push(['Budha-Aditya yoga', 'The Sun and Mercury share a sign: intelligence and communication are linked with your sense of self — good for study, writing and business.']);
  if (moon.sign === pl('Mars').sign) out.push(['Chandra-Mangala yoga', 'The Moon and Mars share a sign: emotional drive and enterprise; traditionally a yoga for earning, though moods can run hot.']);
  const others = k.planets.filter((p) => !['Sun', 'Moon', 'Rahu', 'Ketu'].includes(p.key));
  if (!others.some((p) => [2, 12].includes(fromM(p)))) out.push(['Kemadruma (by the simple rule)', 'No planet sits next to your Moon (2nd or 12th from it). Traditionally this can bring periods of feeling alone; many astrologers cancel it when planets are in angles from the Moon or Lagna — so treat it lightly.']);
  if (k.lagna) {
    const MP = { Mars: ['Ruchaka', 'courage, leadership and physical strength'], Mercury: ['Bhadra', 'intelligence, eloquence and business skill'], Jupiter: ['Hamsa', 'wisdom, ethics and good fortune'], Venus: ['Malavya', 'charm, artistic taste and comfort'], Saturn: ['Sasa', 'discipline, endurance and authority'] };
    for (const key in MP) {
      const p = pl(key), dg = JY.dignity(key, p.lon).k;
      if ([1, 4, 7, 10].includes(p.house) && ['own', 'exalted', 'moolatrikona'].includes(dg)) out.push([`${MP[key][0]} yoga (Pancha Mahapurusha)`, `${JY.label(key)} is strong in an angle from your Lagna — traditionally a mark of ${MP[key][1]}.`]);
    }
  }
  const m = JY.manglik(k);
  out.push([m.any ? 'Manglik (Kuja dosha)' : 'Not Manglik', m.any ? `Mars is in your ${m.byLagna ? JY.ord(m.fromLagna) + ' house from the Lagna' : ''}${m.byLagna && m.byMoon ? ' and ' : ''}${m.byMoon ? JY.ord(m.fromMoon) + ' from the Moon' : ''}. Traditionally this asks for patience in close relationships and is balanced when the partner is also Manglik. ${m.mitig}` : 'Mars is not in the houses (1, 2, 4, 7, 8, 12) traditionally linked with Kuja dosha.']);
  return out;
}

Object.assign(VIEWS.kundlis, {
  sub: 'chart', fc: 'today', cache: {},
  subNav() {
    return `<div class="seg ksub" role="group" aria-label="View">${[['chart', 'Chart'], ['explain', 'Explained'], ['forecast', 'Forecast']].map(([k, l]) => `<button data-sub="${k}" aria-pressed="${k === this.sub}">${l}</button>`).join('')}</div>`;
  },
  /* ---------- explained ---------- */
  explainHtml(k, seat) {
    const nm = esc(k.name || nameOf(seat));
    const cur = k.dasha.list.find((d) => d.start <= Date.now() && d.end > Date.now());
    const curSub = cur && cur.subs.find((s) => s.start <= Date.now() && s.end > Date.now());
    const pSub = (p) => `${esc(signName(p.sign))} ${Astro.dms(p.deg)}${p.house && k.lagna ? ` · house ${p.house}` : ''} · ${esc(JY.dignity(p.key, p.lon).k)}${p.retro && p.key !== 'Rahu' && p.key !== 'Ketu' ? ' · ℞' : ''}`;
    return `<section class="panel"><div class="ph"><h3>${nm}’s chart, explained</h3></div>
        <p style="margin-top:0">Every position in ${nm}’s Kundali, one by one: what each point means in general and what it means in this exact place. Open any section to read it.</p>${DISCLAIM}</section>
      <section class="panel"><div class="ph"><h3>${nm} at a glance</h3></div>
        <table class="glance"><tbody>${JY.profile(k).map(([l, v, m]) => `<tr><th>${esc(l)}</th><td><b>${esc(v)}</b><span>${esc(m)}</span></td></tr>`).join('')}</tbody></table>
        <p class="hint">Tap any position below for the full explanation.</p></section>
      <section class="panel"><div class="ph"><h3>The four keys</h3></div>
        ${rd('Lagna — the rising sign', JY.lagnaReading(k), false, k.lagna ? esc(signName(k.lagna.sign)) : 'needs birth time', JY.lagnaGlance(k))}
        ${rd('Rashi — the Moon sign', JY.rashiReading(k), false, esc(signName(k.moon.sign)), JY.rashiGlance(k))}
        ${rd('Nakshatra — the birth star', JY.nakReading(k), false, esc(Astro.NAKS[k.moon.nak]), JY.nakGlance(k))}
        ${rd('Pada — the quarter of the star', JY.padaReading(k), false, `pada ${k.moon.pada}`, JY.padaGlance(k))}
      </section>
      <section class="panel"><div class="ph"><h3>Every graha, explained</h3></div>
        ${k.planets.map((p, i) => rd(`<span class="ab">${Astro.GRAHAS.find((g) => g.key === p.key).ab}</span>${esc(JY.label(p.key))}`, JY.grahaReading(k, p), false, pSub(p), JY.glance(k, p))).join('')}
      </section>
      ${k.lagna ? `<section class="panel"><div class="ph"><h3>The 12 houses, one by one</h3></div>
        ${k.houses.map((h) => {
          const lord = JY.SIGN_LORD[h.sign], lp = k.planets.find((p) => p.key === lord), occ = k.planets.filter((p) => p.house === h.n);
          const H = JY.HOUSES[h.n - 1];
          return rd(`<span class="ab">${h.n}</span>${esc(H.name)}`, `<p>The ${JY.ord(h.n)} house covers <b>${H.a}</b>.</p>
            <p>In your chart it falls in <b>${esc(signName(h.sign))}</b>, so you approach these matters with ${JY.SIGNS[h.sign].kw}.</p>
            <p>Its lord is <b>${esc(JY.label(lord))}</b>, placed in your ${JY.ord(lp.house)} house (${JY.HOUSES[lp.house - 1].a.split(',').slice(0, 3).join(',')}). This links the two areas: what happens in one tends to show up in the other. The lord is ${JY.dignity(lord, lp.lon).t}.</p>
            <p>${occ.length ? `Planets here: <b>${occ.map((p) => esc(JY.label(p.key))).join(', ')}</b> — they colour this house strongly with their own nature (see each graha above).` : 'No planets sit here, so the house is read mainly through its lord and sign — an empty house is not a weak or “missing” area of life.'}</p>`, false, `${esc(signName(h.sign))}${occ.length ? ' · ' + occ.map((p) => Astro.GRAHAS.find((g) => g.key === p.key).ab).join(' ') : ''}`, JY.houseGlance(k, h.n).replace(/^./, (c) => c.toUpperCase()));
        }).join('')}</section>` : ''}
      <section class="panel"><div class="ph"><h3>Yogas and special notes</h3></div>
        ${yogas(k).map(([t, d]) => rd(esc(t), `<p>${d}</p>`)).join('')}
      </section>
      ${cur ? `<section class="panel"><div class="ph"><h3>The period you are in now</h3></div>
        <p style="margin-top:0"><b>${esc(DASHA_NAMES[cur.lord])} Mahadasha</b> (${esc(fmtMonth(cur.start))} – ${esc(fmtMonth(cur.end))})${curSub ? `, <b>${esc(DASHA_NAMES[curSub.lord])} Antardasha</b> (until ${esc(fmtDay(curSub.end))})` : ''}.</p>
        <p>${JY.dashaReading(k, cur.lord, curSub && curSub.lord)}</p></section>` : ''}`;
  },
  /* ---------- forecasts ---------- */
  forecastHtml(k, seat) {
    const key = `${seat}:${this.fc}:${new Date().toDateString()}:${k.updatedAt || ''}`;
    if (this.cache[key]) return this.cache[key];
    const nm = esc(k.name || nameOf(seat));
    const seg = `<div class="seg fcseg" role="group" aria-label="Forecast range">${[['today', 'Today'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(([x, l]) => `<button data-fc="${x}" aria-pressed="${x === this.fc}">${l}</button>`).join('')}</div>`;
    const now = Date.now(), st = k.settings;
    let body = '';
    const lineFor = (key, sign) => JY.transitLine(key, JY.fromMoon(sign, k.moon.sign));
    if (this.fc === 'today') {
      const d = FC.day(k, now);
      const sky = FC.sky(now, st);
      const H = JY.HOUSES[d.h - 1];
      body = `<section class="panel"><div class="ph"><h3>Today for ${nm} · ${esc(fmtW(now))}</h3></div>
        <div class="fc-head"><div class="fc-score"><b>${d.score}</b><span>${FC.rating(d.score)}</span></div>${scoreBar(d.score)}</div>
        <p><b>The Moon is in ${esc(signName(d.mSign))}</b>, in the star ${esc(Astro.NAKS[d.mNak])}. That is your <b>${JY.ord(d.h)} house from your birth Moon</b> — ${H.a.split(',').slice(0, 3).join(',')} — which is traditionally ${JY.GOOD.Moon.includes(d.h) ? 'a <b>favourable</b> position for the Moon: feelings and events tend to flow' : 'a <b>testing</b> position for the Moon: moods can dip and plans need more care'}.</p>
        ${d.ch ? '<div class="banner warn"><span><b>Chandrashtama day.</b> The Moon is in the 8th from your birth Moon — traditionally the most sensitive 2–3 days of the month. Avoid big decisions, arguments and risky travel; rest more.</span></div>' : ''}
        <p><b>Today’s star is your ${d.tara[0]} tara</b> (counted from your birth star ${esc(Astro.NAKS[k.moon.nak])}): ${d.tara[2]}.</p>
        <p><b>${new Date(now).toLocaleDateString(undefined, { weekday: 'long' })}</b> is ruled by ${esc(JY.label(d.wl))}, which is ${d.wr === 'same' ? 'your own Moon-sign lord' : d.wr === 'friend' ? 'a friend' : d.wr === 'enemy' ? 'an enemy' : 'neutral'} to your Moon-sign lord ${esc(JY.label(JY.SIGN_LORD[k.moon.sign]))}${d.wr === 'friend' || d.wr === 'same' ? ' — a little extra support' : d.wr === 'enemy' ? ' — go gently' : ''}.</p>
        <div class="advice"><div class="ok"><b>Do</b><ul><li>${HOUSE_DO[d.h - 1].replace(/^./, (c) => c.toUpperCase())}</li>${d.lagnaH && d.lagnaH !== d.h ? `<li>${HOUSE_DO[d.lagnaH - 1].replace(/^./, (c) => c.toUpperCase())}</li>` : ''}${d.tara[1] === 'good' ? '<li>Start or push important tasks</li>' : ''}</ul></div>
          <div class="no"><b>Avoid</b><ul><li>${HOUSE_AVOID[d.h - 1].replace(/^./, (c) => c.toUpperCase())}</li>${d.tara[1] === 'bad' || d.ch ? '<li>Signing, launching or starting big things</li>' : ''}${d.ch ? '<li>Arguments and risky travel</li>' : ''}</ul></div></div>
        <p class="hint">Colour of the day (${new Date(now).toLocaleDateString(undefined, { weekday: 'long' })}, ruled by ${esc(JY.P[d.wl].en)}): ${DAY_COLOR[d.wl]}.</p>
      </section>
      <section class="kgrid2"><div class="panel chartp"><div class="ph"><h3>Today’s sky in your chart</h3></div>
        <div class="chartwrap">${chartSvg(placeIn(k, sky), this.style)}</div>
        <p class="legend">Where the planets are right now, placed in ${nm}’s ${k.lagna ? 'houses from the Lagna' : 'houses counted from the Moon'}.</p></div>
        <div class="panel"><div class="ph"><h3>Each planet today</h3></div>
        <ul class="tlist">${sky.map((p) => { const l = lineFor(p.key, p.sign); return `<li class="${l.good ? 'ok' : 'no'}"><b>${Astro.GRAHAS.find((g) => g.key === p.key).ab}</b> ${esc(signName(p.sign))}${p.retro && p.key !== 'Rahu' && p.key !== 'Ketu' ? ' ℞' : ''}<br><small>${l.t}</small></li>`; }).join('')}</ul></div></section>`;
    } else if (this.fc === 'week') {
      const start = FC.noon(now);
      const days = Array.from({ length: 7 }, (_, i) => FC.day(k, start + i * FC.DAY));
      const best = [...days].sort((a, b) => b.score - a.score)[0];
      const worst = days.filter((d) => d.score < 44 || d.ch);
      const ing = ['Sun', 'Mercury', 'Venus', 'Mars'].flatMap((p) => FC.ingresses(p, start - FC.DAY / 2, start + 7 * FC.DAY, st, FC.DAY)).sort((a, b) => a.at - b.at);
      body = `<section class="panel"><div class="ph"><h3>The next 7 days for ${nm}</h3></div>
        <div class="days">${days.map((d) => `<div class="dcell${d.ch ? ' ch' : ''}${d === best ? ' best' : ''}"><b>${esc(new Date(d.ms).toLocaleDateString(undefined, { weekday: 'short' }))}</b><small>${esc(new Date(d.ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))}</small><span class="vbar"><i style="height:${d.score}%"></i></span><span class="dn">${d.score}</span><small>${esc(Astro.SIGNS_EN[d.mSign].slice(0, 3))} · H${d.h}</small><small>${d.tara[0]}</small></div>`).join('')}</div>
        <p><b>Best day:</b> ${esc(fmtW(best.ms))} — the Moon is in your ${JY.ord(best.h)} from the Moon and it is your ${best.tara[0]} tara. Good for ${HOUSE_DO[best.h - 1]}.</p>
        <p><b>Go easy on:</b> ${worst.length ? worst.map((d) => `${esc(fmtW(d.ms))}${d.ch ? ' (Chandrashtama)' : ` (${d.tara[0]} tara)`}`).join(', ') : 'no especially difficult days this week'}.</p>
        <h4>Day by day</h4><ul class="tlist">${days.map((d) => `<li class="${d.score >= 58 ? 'ok' : d.score < 44 ? 'no' : ''}"><b>${esc(fmtW(d.ms))} · ${FC.rating(d.score)}</b><br><small>Moon in ${esc(signName(d.mSign))} (${esc(Astro.NAKS[d.mNak])}) — your ${JY.ord(d.h)} from the Moon: ${HOUSE_DO[d.h - 1]}. ${d.tara[0]} tara: ${d.tara[2]}.</small></li>`).join('')}</ul>
        ${ing.length ? `<h4>Planets changing sign this week</h4><ul class="tlist">${ing.map((x) => { const l = lineFor(x.key, x.to); return `<li class="${l.good ? 'ok' : 'no'}"><b>${esc(fmtW(x.at))}: ${esc(JY.label(x.key))} enters ${esc(signName(x.to))}</b><br><small>${l.t}</small></li>`; }).join('')}</ul>` : ''}
        ${DISCLAIM}</section>`;
    } else if (this.fc === 'month') {
      const start = FC.noon(now);
      const days = Array.from({ length: 30 }, (_, i) => FC.day(k, start + i * FC.DAY));
      const top = [...days].sort((a, b) => b.score - a.score).slice(0, 4).sort((a, b) => a.ms - b.ms);
      const chd = days.filter((d) => d.ch);
      const L = FC.lons(now, st);
      const ing = ['Sun', 'Mercury', 'Venus', 'Mars'].flatMap((p) => FC.ingresses(p, start, start + 30 * FC.DAY, st, FC.DAY)).sort((a, b) => a.at - b.at);
      const cur = k.dasha.list.find((d) => d.start <= now && d.end > now);
      const cs = cur && cur.subs.find((s) => s.start <= now && s.end > now);
      const avg = Math.round(days.reduce((s, d) => s + d.score, 0) / days.length);
      body = `<section class="panel"><div class="ph"><h3>The next 30 days for ${nm}</h3></div>
        <div class="fc-head"><div class="fc-score"><b>${avg}</b><span>${FC.rating(avg)} month</span></div>${scoreBar(avg)}</div>
        <div class="mbars" role="img" aria-label="Daily rating for the next 30 days">${days.map((d) => `<span class="${d.ch ? 'ch' : ''}" style="height:${d.score}%" title="${esc(fmtW(d.ms))}: ${d.score}"></span>`).join('')}</div>
        <div class="mbars-x"><span>${esc(fmtW(days[0].ms))}</span><span>${esc(fmtW(days[29].ms))}</span></div>
        <p><b>Strongest days:</b> ${top.map((d) => esc(fmtW(d.ms))).join(', ')}. <b>Chandrashtama (sensitive) days:</b> ${chd.length ? chd.map((d) => esc(fmtW(d.ms))).join(', ') : 'none this month'}.</p>
        <h4>The month’s planets</h4><ul class="tlist">${['Sun', 'Mercury', 'Venus', 'Mars'].map((p) => { const l = lineFor(p, Math.floor(L[p] / 30)); return `<li class="${l.good ? 'ok' : 'no'}"><b>${esc(JY.label(p))} in ${esc(signName(Math.floor(L[p] / 30)))}</b><br><small>${l.t}</small></li>`; }).join('')}</ul>
        ${ing.length ? `<h4>Sign changes</h4><ul class="tlist">${ing.map((x) => { const l = lineFor(x.key, x.to); return `<li class="${l.good ? 'ok' : 'no'}"><b>${esc(fmtW(x.at))}: ${esc(JY.label(x.key))} enters ${esc(signName(x.to))}</b><br><small>${l.t}</small></li>`; }).join('')}</ul>` : ''}
        ${cur ? `<h4>Your Dasha this month</h4><p><b>${esc(DASHA_NAMES[cur.lord])} / ${cs ? esc(DASHA_NAMES[cs.lord]) : ''}</b>${cs && cs.end < start + 30 * FC.DAY ? ` — changing on ${esc(fmtDay(cs.end))}` : ''}. ${JY.dashaReading(k, cur.lord, cs && cs.lord)}</p>` : ''}
        ${DISCLAIM}</section>`;
    } else {
      const start = FC.noon(now), end = start + 365 * FC.DAY;
      const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(start); d.setDate(1); d.setMonth(d.getMonth() + i); const pts = [1, 8, 15, 22].map((x) => { const t = new Date(d); t.setDate(x); return FC.period(k, t.getTime()); }); return { ms: d.getTime(), score: Math.round(pts.reduce((a, b) => a + b, 0) / 4) }; });
      const L = FC.lons(now, st);
      const slow = ['Jupiter', 'Saturn', 'Rahu', 'Ketu'];
      const ing = ['Jupiter', 'Saturn', 'Rahu'].flatMap((p) => FC.ingresses(p, start, end, st, 4 * FC.DAY)).sort((a, b) => a.at - b.at);
      const satH = JY.fromMoon(Math.floor(L.Saturn / 30), k.moon.sign);
      const ss = [12, 1, 2].includes(satH) ? `<div class="banner"><span><b>Sade Sati is running</b> — Saturn is in the ${JY.ord(satH)} from your Moon (${satH === 12 ? 'first, rising phase' : satH === 1 ? 'peak phase' : 'final, setting phase'}). This 7½-year transit traditionally brings responsibility, pressure and maturity; steady routines and patience pay off.</span></div>` : satH === 8 ? '<div class="banner warn"><span><b>Ashtama Shani</b> — Saturn in the 8th from your Moon: a traditionally demanding transit. Look after health, avoid risky ventures and keep finances conservative.</span></div>' : satH === 4 ? '<div class="banner"><span><b>Kantaka (Ardhashtama) Shani</b> — Saturn in the 4th from your Moon: home and peace of mind can feel heavier; keep things simple at home.</span></div>' : `<p>Saturn is in your ${JY.ord(satH)} from the Moon — you are <b>not</b> in Sade Sati.</p>`;
      const nextSubs = k.dasha.list.flatMap((d) => d.subs.map((s) => ({ ...s, maha: d.lord }))).filter((s) => s.end > now && s.start < end);
      const bestM = [...months].sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.ms - b.ms), worstM = [...months].sort((a, b) => a.score - b.score).slice(0, 2).sort((a, b) => a.ms - b.ms);
      const mo = (ms) => new Date(ms).toLocaleDateString(undefined, { month: 'short' });
      const avg = Math.round(months.reduce((s, m) => s + m.score, 0) / 12);
      body = `<section class="panel"><div class="ph"><h3>The next 12 months for ${nm}</h3></div>
        <div class="fc-head"><div class="fc-score"><b>${avg}</b><span>${FC.rating(avg)} year</span></div>${scoreBar(avg)}</div>
        <div class="ybars" role="img" aria-label="Monthly rating for the next 12 months">${months.map((m) => `<div><span class="vbar"><i style="height:${m.score}%"></i></span><small>${esc(mo(m.ms))}</small><small class="dn">${m.score}</small></div>`).join('')}</div>
        <p><b>Most supportive months:</b> ${bestM.map((m) => esc(new Date(m.ms).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))).join(', ')}. <b>Months to pace yourself:</b> ${worstM.map((m) => esc(new Date(m.ms).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))).join(', ')}.</p>
        ${ss}
        <h4>The slow planets — the year’s big themes</h4><ul class="tlist">${slow.map((p) => { const s = Math.floor(L[p] / 30), l = lineFor(p, s); return `<li class="${l.good ? 'ok' : 'no'}"><b>${esc(JY.label(p))} in ${esc(signName(s))}</b>${k.lagna ? ` <small class="muted">(your ${JY.ord(((s - k.lagna.sign + 12) % 12) + 1)} house from Lagna)</small>` : ''}<br><small>${l.t}</small></li>`; }).join('')}</ul>
        ${ing.length ? `<h4>Major sign changes this year</h4><ul class="tlist">${ing.map((x) => { const l = lineFor(x.key, x.to); const extra = x.key === 'Rahu' ? ` Ketu moves into ${esc(signName((x.to + 6) % 12))} at the same time.` : ''; return `<li class="${l.good ? 'ok' : 'no'}"><b>${esc(fmtDay(x.at))}: ${esc(JY.label(x.key))} enters ${esc(signName(x.to))}</b><br><small>${l.t}${extra}</small></li>`; }).join('')}</ul>` : '<p class="muted">Jupiter, Saturn and the nodes stay in their current signs for the whole year.</p>'}
        <h4>Dasha periods in the next 12 months</h4><ul class="tlist">${nextSubs.map((s) => `<li><b>${esc(DASHA_NAMES[s.maha])} / ${esc(DASHA_NAMES[s.lord])}</b> <small class="muted">${esc(fmtDay(Math.max(s.start, now)))} – ${esc(fmtDay(s.end))}</small><br><small>${JY.dashaReading(k, s.maha, s.lord)}</small></li>`).join('')}</ul>
        ${DISCLAIM}</section>`;
    }
    const html = `${seg}${body}`;
    this.cache = { [key]: html };
    return html;
  },
  /* ---------- compatibility ---------- */
  pairHtml() {
    const kA = kundaliOf('A'), kB = kundaliOf('B');
    const ok = (k) => k && !k.stub;
    if (!ok(kA) || !ok(kB)) {
      const miss = ['A', 'B'].filter((s) => !ok(kundaliOf(s)));
      return `<div class="empty">${icon('star', 'spark')}<strong>Compatibility appears automatically once both Kundalis are visible</strong>${miss.map((s) => { const k = kundaliOf(s); return k && k.stub ? `${esc(nameOf(s))}’s Kundali is private — turn on sharing in their profile.` : `${esc(nameOf(s))} hasn’t created a Kundali yet.`; }).join(' ')}</div>`;
    }
    let groom = 'A';
    try { groom = localStorage.getItem('vs.groom') === 'B' ? 'B' : 'A'; } catch {}
    const bride = groom === 'A' ? 'B' : 'A';
    const kG = groom === 'A' ? kA : kB, kBr = groom === 'A' ? kB : kA;
    const g = JY.guna(kG, kBr);
    const nA = esc(kA.name || nameOf('A')), nB = esc(kB.name || nameOf('B'));
    const mA = JY.manglik(kA), mB = JY.manglik(kB);
    const pl = (k, key) => k.planets.find((p) => p.key === key);
    const full = g.K.filter((x) => x.pts === x.max).map((x) => x.key), zero = g.K.filter((x) => x.pts === 0).map((x) => x.key);
    const mm = mA.any === mB.any ? (mA.any ? 'Both of you are Manglik, which traditionally cancels the dosha.' : 'Neither of you is Manglik — no Kuja dosha to balance.') : `${mA.any ? nA : nB} is Manglik and ${mA.any ? nB : nA} is not. Traditionally this calls for care; it is often considered reduced by other strengths in the charts.`;
    const harm = [];
    const eM = JY.elementHarmony(kA.moon.sign, kB.moon.sign);
    harm.push(['Moon signs (emotional nature)', `${nA}: ${esc(signName(kA.moon.sign))}; ${nB}: ${esc(signName(kB.moon.sign))} — ${eM.t}.`, eM.s]);
    if (kA.lagna && kB.lagna) { const e = JY.elementHarmony(kA.lagna.sign, kB.lagna.sign); harm.push(['Rising signs (temperament)', `${nA}: ${esc(signName(kA.lagna.sign))}; ${nB}: ${esc(signName(kB.lagna.sign))} — ${e.t}.`, e.s]); }
    const lum = (x, y, nx, ny) => { const d = JY.fromMoon(pl(x, 'Sun').sign, y.moon.sign); const good = [1, 5, 7, 9].includes(d), bad = [6, 8].includes(d); return [`${nx}’s Sun and ${ny}’s Moon`, `${nx}’s Sun is ${d === 1 ? 'in the same sign as' : `${JY.ord(d)} from`} ${ny}’s Moon — ${good ? 'a classic sign of mutual support: one gives direction, the other feels understood' : bad ? 'a tense angle: you may misread each other’s needs at times' : 'a neutral link'}.`, good ? 1 : bad ? -1 : 0]; };
    harm.push(lum(kA, kB, nA, nB), lum(kB, kA, nB, nA));
    const vm = (x, y, nx, ny) => { const v = pl(x, 'Venus'), m = pl(y, 'Mars'); const e = JY.elementHarmony(v.sign, m.sign); const conj = v.sign === m.sign; return [`${nx}’s Venus and ${ny}’s Mars (attraction)`, `${esc(signName(v.sign))} and ${esc(signName(m.sign))} — ${conj ? 'in the same sign: strong physical chemistry' : e.t}.`, conj ? 2 : e.s]; };
    harm.push(vm(kA, kB, nA, nB), vm(kB, kA, nB, nA));
    const seventh = (x, y, nx, ny) => { if (!x.lagna) return null; const s7 = (x.lagna.sign + 6) % 12; const hit = (y.lagna && y.lagna.sign === s7) || y.moon.sign === s7; return hit ? [`${ny} embodies ${nx}’s 7th house`, `${nx}’s house of marriage is ${esc(signName(s7))}, and ${ny}’s ${y.lagna && y.lagna.sign === s7 ? 'rising sign' : 'Moon'} is there — traditionally a strong sign of a destined partnership.`, 2] : null; };
    [seventh(kA, kB, nA, nB), seventh(kB, kA, nB, nA)].forEach((x) => x && harm.push(x));
    const overlay = (owner, other, nO, nX) => other.planets.map((p) => { const h = owner.lagna ? ((p.sign - owner.lagna.sign + 12) % 12) + 1 : JY.fromMoon(p.sign, owner.moon.sign); const romance = [1, 5, 7, 8, 12].includes(h) && ['Venus', 'Mars', 'Moon', 'Sun'].includes(p.key); return `<li class="${romance ? 'ok' : ''}"><b>${nX}’s ${esc(JY.label(p.key))} → ${nO}’s ${JY.ord(h)} house</b><br><small>${nX}’s ${esc(JY.P[p.key].en)} ${OVERLAY[p.key]} ${nO}’s ${JY.HOUSES[h - 1].a.split(',').slice(0, 3).join(',')}.${romance ? ' A classic romance contact.' : ''}</small></li>`; }).join('');
    const pct = Math.round((g.total / 36) * 100);
    return `<section class="panel"><div class="ph"><h3>${nA} &amp; ${nB} — Guna Milan</h3></div>
        <div class="roles"><span class="muted">Guna Milan is directional. Traditional roles:</span><div class="seg sm" role="group" aria-label="Roles"><button data-groom="A" aria-pressed="${groom === 'A'}">${nA} groom · ${nB} bride</button><button data-groom="B" aria-pressed="${groom === 'B'}">${nB} groom · ${nA} bride</button></div></div>
        <div class="gm-top"><div class="gm-score"><b>${g.total % 1 ? g.total.toFixed(1) : g.total}</b><span>of 36 gunas</span></div>
          <div class="gm-meter"><span class="meter big"><i style="width:${pct}%"></i><em style="left:${(18 / 36) * 100}%"></em><em style="left:${(25 / 36) * 100}%"></em><em style="left:${(33 / 36) * 100}%"></em></span><div class="gm-band">${esc(g.band)}</div>
          <p class="hint">Under 18 is traditionally not recommended · 18–24 average · 25–32 very good · 33–36 excellent.</p></div></div>
        <p>${nA} and ${nB} score <b>${g.total % 1 ? g.total.toFixed(1) : g.total} of 36</b>. ${full.length ? `Full marks in <b>${full.join(', ')}</b>.` : ''} ${zero.length ? `No points in <b>${zero.join(', ')}</b>${g.K.some((x) => x.cancelled) ? ' (a traditional cancellation applies — see below)' : ''}.` : 'Every koota scores some points.'} ${mm}</p>
        <div class="kootas">${g.K.map((x) => `<details class="koota"><summary><span class="kn">${x.key}</span><span class="kbar"><i style="width:${(x.pts / x.max) * 100}%"></i></span><span class="kp">${x.pts}/${x.max}</span></summary><p><b>What it measures:</b> ${x.what}.</p><p>${x.detail}</p></details>`).join('')}</div>
        ${DISCLAIM}</section>
      ${this.togetherHtml(kA, kB, nA, nB)}
      <section class="kgrid2"><div class="panel"><div class="ph"><h3>Compatibility map</h3></div>
          <div class="chartwrap">${this.wheel(kA, kB)}</div>
          <p class="legend"><span class="swc a"></span>${nA} (inner ring) · <span class="swc b"></span>${nB} (outer ring). Both charts on one sidereal zodiac, Aries at the left and the signs running anticlockwise. Lines join planets of yours that sit within 8° of each other: gold for supportive pairs, pink for intense ones.</p></div>
        <div class="panel"><div class="ph"><h3>Where you meet</h3></div>
          <ul class="tlist">${harm.map(([t, d, s]) => `<li class="${s > 0 ? 'ok' : s < 0 ? 'no' : ''}"><b>${t}</b><br><small>${d}</small></li>`).join('')}</ul>
          <h4>Manglik check</h4><ul class="tlist"><li class="${mA.any ? 'no' : 'ok'}"><b>${nA}: ${mA.any ? 'Manglik' : 'not Manglik'}</b><br><small>Mars ${kA.lagna ? `in the ${JY.ord(mA.fromLagna)} from Lagna, ` : ''}${JY.ord(mA.fromMoon)} from the Moon. ${mA.any ? mA.mitig : ''}</small></li><li class="${mB.any ? 'no' : 'ok'}"><b>${nB}: ${mB.any ? 'Manglik' : 'not Manglik'}</b><br><small>Mars ${kB.lagna ? `in the ${JY.ord(mB.fromLagna)} from Lagna, ` : ''}${JY.ord(mB.fromMoon)} from the Moon. ${mB.any ? mB.mitig : ''}</small></li></ul><p class="hint">${mm}</p></div></section>
      <section class="panel"><div class="ph"><h3>Compatibility kundali — each other’s planets in your houses</h3></div>
        <p style="margin-top:0">This is how Jyotish reads a couple’s charts together: the partner’s grahas are placed into your houses to see which parts of your life they touch.</p>
        <div class="kgrid2 two"><div><h4>${nB}’s grahas in ${nA}’s chart</h4><div class="chartwrap">${chartSvg(placeIn(kA, kB.planets), this.style)}</div></div>
          <div><h4>${nA}’s grahas in ${nB}’s chart</h4><div class="chartwrap">${chartSvg(placeIn(kB, kA.planets), this.style)}</div></div></div>
        ${rd(`What ${nB} brings to ${nA}’s life`, `<ul class="tlist">${overlay(kA, kB, nA, nB)}</ul>`, true)}
        ${rd(`What ${nA} brings to ${nB}’s life`, `<ul class="tlist">${overlay(kB, kA, nB, nA)}</ul>`)}
      </section>
      <section class="panel"><div class="ph"><h3>Every position, side by side</h3></div>
        <p style="margin-top:0">Each row has a one-line summary for both of you; open it for the full explanation.</p>
        <table class="glance two"><thead><tr><th></th><th>${nA}</th><th>${nB}</th></tr></thead><tbody>${JY.profile(kA).map((r, i) => { const q = JY.profile(kB).find((x) => x[0] === r[0]) || ['', '—', '']; return `<tr><th>${esc(r[0])}</th><td><b>${esc(r[1])}</b><span>${esc(r[2])}</span></td><td><b>${esc(q[1])}</b><span>${esc(q[2])}</span></td></tr>`; }).join('')}</tbody></table>
        ${rd('Lagna', `<div class="two-col"><div><h4>${nA}</h4>${JY.lagnaReading(kA)}</div><div><h4>${nB}</h4>${JY.lagnaReading(kB)}</div></div>`, false, `${kA.lagna ? esc(Astro.SIGNS_EN[kA.lagna.sign]) : '—'} · ${kB.lagna ? esc(Astro.SIGNS_EN[kB.lagna.sign]) : '—'}`, `<b>${nA}:</b> ${JY.lagnaGlance(kA)}<br><b>${nB}:</b> ${JY.lagnaGlance(kB)}`)}
        ${rd('Rashi', `<div class="two-col"><div><h4>${nA}</h4>${JY.rashiReading(kA)}</div><div><h4>${nB}</h4>${JY.rashiReading(kB)}</div></div>`, false, `${esc(Astro.SIGNS_EN[kA.moon.sign])} · ${esc(Astro.SIGNS_EN[kB.moon.sign])}`, `<b>${nA}:</b> ${JY.rashiGlance(kA)}<br><b>${nB}:</b> ${JY.rashiGlance(kB)}`)}
        ${rd('Nakshatra', `<div class="two-col"><div><h4>${nA}</h4>${JY.nakReading(kA)}</div><div><h4>${nB}</h4>${JY.nakReading(kB)}</div></div>`, false, `${esc(Astro.NAKS[kA.moon.nak])} · ${esc(Astro.NAKS[kB.moon.nak])}`, `<b>${nA}:</b> ${JY.nakGlance(kA)}<br><b>${nB}:</b> ${JY.nakGlance(kB)}`)}
        ${kA.planets.map((p) => { const q = pl(kB, p.key); return rd(`<span class="ab">${Astro.GRAHAS.find((x) => x.key === p.key).ab}</span>${esc(JY.label(p.key))}`, `<div class="two-col"><div><h4>${nA}</h4>${JY.grahaReading(kA, p)}</div><div><h4>${nB}</h4>${JY.grahaReading(kB, q)}</div></div>`, false, `${esc(Astro.SIGNS_EN[p.sign])}${p.house && kA.lagna ? ' H' + p.house : ''} · ${esc(Astro.SIGNS_EN[q.sign])}${q.house && kB.lagna ? ' H' + q.house : ''}`, `<b>${nA}:</b> ${JY.glance(kA, p)}<br><b>${nB}:</b> ${JY.glance(kB, q)}`); }).join('')}
      </section>`;
  },
  togetherHtml(kA, kB, nA, nB) {
    const start = FC.noon(Date.now());
    const days = Array.from({ length: 7 }, (_, i) => coupleDay(kA, kB, start + i * FC.DAY, nA, nB));
    const t = days[0], best = [...days].sort((x, y) => y.score - x.score)[0];
    const low = (d, n) => (d.ch ? `${n} may be more sensitive than usual (Chandrashtama) — extra patience helps.` : d.tara[1] === 'bad' ? `${n} may feel blocked or tired (${d.tara[0]} tara) — don’t push hard decisions on them.` : d.score < 44 ? `${n}’s mood may dip a little today — keep things light.` : '');
    const notes = [low(t.a, nA), low(t.b, nB)].filter(Boolean);
    const both = t.a.score >= 58 && t.b.score >= 58 ? 'A good day for important joint decisions.' : t.a.score < 44 && t.b.score < 44 ? 'Keep it calm today and postpone serious talks.' : 'Fine for everyday plans; keep big talks light.';
    return `<section class="panel"><div class="ph"><h3>Today together · ${esc(fmtW(t.ms))}</h3></div>
      <div class="fc-head"><div class="fc-score"><b>${t.score}</b><span>${FC.rating(t.score)}</span></div>${scoreBar(t.score)}</div>
      <div class="pair-days"><div><b>${nA}</b> ${t.a.score} · ${FC.rating(t.a.score)}<small>Moon in your ${JY.ord(t.a.h)}: ${HOUSE_DO[t.a.h - 1]}</small></div><div><b>${nB}</b> ${t.b.score} · ${FC.rating(t.b.score)}<small>Moon in your ${JY.ord(t.b.h)}: ${HOUSE_DO[t.b.h - 1]}</small></div></div>
      <p><b>The Moon is in ${esc(signName(t.a.mSign))}.</b> ${both} Best plan for today: <b>${t.plan}</b>.</p>
      ${t.touch.length ? `<ul class="tlist">${t.touch.map((x) => `<li class="${['Venus', 'Jupiter', 'Moon', 'Mercury'].includes(x.key) ? 'ok' : ['Saturn', 'Mars', 'Rahu'].includes(x.key) ? 'no' : ''}"><b>Moon over ${x.who}’s ${x.key === 'Rahu' || x.key === 'Ketu' ? x.key : esc(JY.P[x.key].en)}</b><br><small>${x.t}.</small></li>`).join('')}</ul>` : ''}
      ${notes.length ? `<p>${notes.join(' ')}</p>` : ''}
      <h4>Your week together</h4>
      <div class="days">${days.map((d) => `<div class="dcell${d === best ? ' best' : ''}${d.a.ch || d.b.ch ? ' ch' : ''}"><b>${esc(new Date(d.ms).toLocaleDateString(undefined, { weekday: 'short' }))}</b><small>${esc(new Date(d.ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))}</small><span class="vbar"><i style="height:${d.score}%"></i></span><span class="dn">${d.score}</span></div>`).join('')}</div>
      <p><b>Best day for a date:</b> ${esc(fmtW(best.ms))} — ${best.plan}.</p></section>`;
  },
  wheel(kA, kB) {
    const R = 170, pt = (lon, r) => { const a = ((180 + lon) * Math.PI) / 180; return [r * Math.cos(a), -r * Math.sin(a)]; };
    let s = '';
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = pt(i * 30, R), [x2, y2] = pt(i * 30 + 30, R), [x3, y3] = pt(i * 30 + 30, 146), [x4, y4] = pt(i * 30, 146);
      s += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 0 0 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A146,146 0 0 1 ${x4.toFixed(1)},${y4.toFixed(1)}Z" class="wz${i % 2 ? ' alt' : ''}"/>`;
      const [tx, ty] = pt(i * 30 + 15, 158);
      s += `<text x="${tx.toFixed(1)}" y="${(ty + 3.5).toFixed(1)}" text-anchor="middle" class="wl">${esc(Astro.SIGNS_EN[i].slice(0, 3))}</text>`;
      const [lx1, ly1] = pt(i * 30, 146), [lx2, ly2] = pt(i * 30, 30);
      s += `<line x1="${lx1.toFixed(1)}" y1="${ly1.toFixed(1)}" x2="${lx2.toFixed(1)}" y2="${ly2.toFixed(1)}" class="wsp"/>`;
    }
    s += '<circle r="146" class="wr"/><circle r="98" class="wr dim"/><circle r="30" class="wr"/>';
    const place = (k, r0, cls) => {
      const pts = [...k.planets.map((p) => ({ key: p.key, ab: Astro.GRAHAS.find((g) => g.key === p.key).ab, lon: p.lon })), ...(k.lagna ? [{ key: 'Asc', ab: 'As', lon: k.lagna.lon }] : [])].sort((a, b) => a.lon - b.lon);
      const lanes = [-99, -99, -99];
      return pts.map((p) => { let lane = lanes.findIndex((l) => p.lon - l >= 11); if (lane < 0) lane = lanes.indexOf(Math.min(...lanes)); lanes[lane] = p.lon; const r = r0 - lane * 21; const [x, y] = pt(p.lon, r), [dx, dy] = pt(p.lon, cls === 'b' ? 146 : 30); p.xy = [x, y]; return `<line x1="${dx.toFixed(1)}" y1="${dy.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="wtick ${cls}"/><rect x="${(x - 10).toFixed(1)}" y="${(y - 7).toFixed(1)}" width="20" height="14" class="wp ${cls}"/><text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" class="wt">${p.ab}</text>`; }).join('');
    };
    const ring = { a: [], b: [] };
    const outerB = place(kB, 135, 'b'), innerA = place(kA, 86, 'a');
    // contacts
    const KEYS = ['Sun', 'Moon', 'Mars', 'Venus', 'Jupiter', 'Saturn'];
    let lines = '';
    for (const a of KEYS) for (const b of KEYS) {
      const pa = kA.planets.find((p) => p.key === a), pb = kB.planets.find((p) => p.key === b);
      if (Astro.angDiff(pa.lon, pb.lon) < 8) {
        const soft = ['Venus', 'Jupiter', 'Moon'].includes(a) || ['Venus', 'Jupiter', 'Moon'].includes(b);
        const hard = a === 'Saturn' || b === 'Saturn' || (a === 'Mars' && b === 'Mars');
        const [x1, y1] = pt(pa.lon, 34), [x2, y2] = pt(pb.lon, 142);
        lines += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="wc ${soft && !hard ? 'soft' : 'hard'}"><title>${esc(JY.label(a))} – ${esc(JY.label(b))}</title></line>`;
      }
    }
    void ring;
    return `<svg class="kchart wheel" viewBox="-176 -176 352 352" role="img" aria-label="Both charts on one zodiac wheel">${s}${lines}${outerB}${innerA}</svg>`;
  },
  bindMore(box) {
    $$('[data-sub]', box).forEach((b) => (b.onclick = () => { this.sub = b.dataset.sub; this.draw(); }));
    $$('[data-fc]', box).forEach((b) => (b.onclick = () => { this.fc = b.dataset.fc; this.draw(); }));
    $$('[data-groom]', box).forEach((b) => (b.onclick = () => { try { localStorage.setItem('vs.groom', b.dataset.groom); } catch {} this.draw(); }));
  },
});
