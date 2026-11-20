/* ============================================================
   Our Charts — Western astrology view (Vice Space 2)
   Person: Chart · Explained · Forecast · Cycles
   Couple: Overview · Synastry · Composite · Davison
   ============================================================ */
const NV = (() => {
  const DAY = W.DAY;
  const g = WK.G;
  const SN = (s) => `${W.SG[s]} ${W.SIGNS[s]}`;
  const posTxt = (b) => `${W.SIGNS[b.sign]} ${W.dms(b.deg)}${b.retro && W.PLANETS.includes(b.key) ? ' ℞' : ''}`;
  const fmtW = (ms) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtD = (ms) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const meter = (s, cls = '') => `<span class="meter ${cls}"><i style="width:${s}%"></i></span>`;
  const rd = (title, body, open = false, sub = '', gl = '') => `<details class="rd"${open ? ' open' : ''}><summary><span class="rd-t">${title}</span>${sub ? `<span class="rd-s">${sub}</span>` : ''}${gl ? `<span class="rd-g">${gl}</span>` : ''}</summary><div class="rd-b">${body}</div></details>`;
  const DISCLAIM = '<p class="hint">Astrology is a traditional interpretive practice, not a science. Positions are calculated precisely; meanings are classical Western interpretations offered for reflection, not guaranteed predictions.</p>';
  const ab = (k) => `<span class="gl">${g(k)}</span>`;
  const rating = (s) => (s >= 72 ? 'Excellent' : s >= 58 ? 'Good' : s >= 44 ? 'Mixed' : 'Take care');
  const noon = (ms) => { const d = new Date(ms); d.setHours(12, 0, 0, 0); return d.getTime(); };
  const DAY_COLOR = ['orange or gold (Sun)', 'white or silver (Moon)', 'red (Mars)', 'green or yellow (Mercury)', 'blue or purple (Jupiter)', 'pink or pastel green (Venus)', 'black or dark blue (Saturn)'];
  const personal = (ch) => W.all(ch).filter((b) => !['Fortune', 'Lilith', 'Node'].includes(b.key));

  /* ---------- transits for a day ---------- */
  const T_ORB = { Moon: 6, Sun: 2.5, Mercury: 2, Venus: 2, Mars: 2, Jupiter: 2, Saturn: 2, Uranus: 1.5, Neptune: 1.5, Pluto: 1.5 };
  const T_W = { Moon: 5, Sun: 4, Mercury: 3, Venus: 5, Mars: 4, Jupiter: 5, Saturn: 5, Uranus: 3, Neptune: 3, Pluto: 3 };
  const BENEFIC = ['Venus', 'Jupiter', 'Sun', 'Moon', 'Mercury'];
  function transitHits(ch, L, keys = W.PLANETS, targets = personal(ch)) {
    const out = [];
    for (const k of keys) for (const t of targets) {
      const d = Astro.angDiff(L[k], t.lon);
      for (const asp of W.ASPECTS.filter((a) => !a.minor || a.key === 'quincunx')) {
        const lim = T_ORB[k] * (asp.key === 'quincunx' ? 0.5 : 1);
        const orb = Math.abs(d - asp.a);
        if (orb <= lim) { out.push({ a: k, b: t.key, type: asp.key, orb, lim }); break; }
      }
    }
    return out;
  }
  const hitVal = (h) => { const kind = W.ASP[h.type].kind; const v = kind === 'soft' ? 1 : kind === 'hard' ? -1 : kind === 'conj' ? (BENEFIC.includes(h.a) ? 0.8 : -0.6) : -0.4; return v * T_W[h.a] * (['Sun', 'Moon', 'ASC'].includes(h.b) ? 1.2 : 1) * (0.4 + 0.6 * (1 - h.orb / h.lim)); };
  function day(ch, ms, st) {
    const L = W.lons(ms, st, Astro.builtin), Lb = W.lons(ms - DAY / 4, st, Astro.builtin);
    const moonSign = Math.floor(L.Moon / 30);
    const moonHouse = ch.cusps ? W.houseOf(L.Moon, ch.cusps) : ((moonSign - W.get(ch, 'Sun').sign + 12) % 12) + 1;
    const phaseAng = Astro.norm(L.Moon - L.Sun);
    const hits = transitHits(ch, L).sort((a, b) => Math.abs(hitVal(b)) - Math.abs(hitVal(a)));
    const mercR = W.signedTo(Lb.Mercury, L.Mercury) < 0;
    let score = 50 + hits.reduce((s, h) => s + hitVal(h), 0) * 1.6 - (mercR ? 3 : 0);
    score = Math.max(8, Math.min(96, Math.round(score)));
    return { ms, L, moonSign, moonHouse, phaseAng, phase: W.phaseName(phaseAng), hits, score, mercR };
  }
  function yearScore(ch, ms, st) {
    const L = W.lons(ms, st, Astro.builtin);
    const hs = transitHits(ch, L, ['Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'], personal(ch)).map((h) => ({ ...h, lim: h.lim + 2, orb: Math.max(0, h.orb) }));
    const extra = transitHits(ch, L, ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'], personal(ch).filter((b) => ['Sun', 'Moon', 'Venus', 'ASC', 'MC'].includes(b.key)));
    return Math.max(8, Math.min(96, Math.round(52 + [...hs, ...extra].reduce((s, h) => s + hitVal(h), 0) * 1.1)));
  }
  const RETRO_KEYS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  function retrogrades(ms, st) {
    const a = W.lons(ms - DAY / 2, st, Astro.builtin), b = W.lons(ms + DAY / 2, st, Astro.builtin);
    return RETRO_KEYS.filter((k) => W.signedTo(a[k], b[k]) < 0);
  }
  const RETRO_TXT = { Mercury: 'review, rethink and double-check plans, messages and travel', Venus: 'revisit old loves and values; delay big purchases and makeovers', Mars: 'redirect energy inward; avoid starting fights or risky projects', Jupiter: 'inner growth over outer expansion', Saturn: 'review commitments and structures', Uranus: 'inner freedom; quiet rebellion', Neptune: 'clearer sight — illusions fade', Pluto: 'inner transformation' };
  const hitLi = (h, nm) => `<li class="${W.ASP[h.type].kind === 'soft' ? 'ok' : W.ASP[h.type].kind === 'hard' ? 'no' : ''}"><b>${ab(h.a)} ${W.NAME[h.a]} ${W.ASP[h.type].name} ${nm ? nm + '’s' : 'your'} ${W.NAME[h.b]}</b>${h.at ? ` <small class="muted">${fmtD(h.at)}</small>` : ''}<br><small>${WK.transitGlance(h)} ${WK.cap(WK.transitAdvice(h))}.</small></li>`;

  /* ---------- couple day ---------- */
  const COUPLE_PLAN = ['do something new together', 'a good dinner or a small treat', 'a long talk or a short trip', 'a cosy evening at home', 'a date — romance and fun are favoured', 'sort out practical things together', 'quality time as a couple; talk about plans', 'a deep, honest talk — gently', 'plan a trip or learn something together', 'back each other’s work goals', 'see friends together', 'rest together and have an early night'];
  function coupleDay(cA, cB, comp, ms, nA, nB) {
    const a = day(cA, ms, cA.settings), b = day(cB, ms, cB.settings);
    const L = a.L;
    const ch = transitHits(comp, L, ['Moon', 'Sun', 'Venus', 'Mars', 'Jupiter', 'Saturn'], W.all(comp).filter((x) => ['Sun', 'Moon', 'Venus', 'Mars', 'ASC'].includes(x.key)));
    const compHouse = comp.cusps ? W.houseOf(L.Moon, comp.cusps) : null;
    let score = (a.score + b.score) / 2 + ch.reduce((s, h) => s + hitVal(h), 0) * 1.2;
    score = Math.max(8, Math.min(96, Math.round(score)));
    const touch = [];
    for (const [c, n] of [[cA, nA], [cB, nB]]) for (const k of ['Sun', 'Moon', 'Venus', 'Mars']) { const p = W.get(c, k); if (Astro.angDiff(L.Moon, p.lon) < 8) touch.push({ who: n, key: k }); }
    return { ms, a, b, score, comp: ch, compHouse, touch, plan: COUPLE_PLAN[(compHouse || a.moonHouse) - 1] };
  }
  const MOON_OVER = { Sun: 'attention and warmth flow towards them', Moon: 'their feelings are close to the surface — be gentle', Venus: 'affection and attraction run high', Mars: 'desire and energy — and a quicker temper' };

  /* ---------- view ---------- */
  const WV = {
    get tab() { return VIEWS.kundlis.tab; },
    draw() { VIEWS.kundlis.draw && VIEWS.kundlis.draw(); },
    timelineHtml(s) { return VIEWS.kundlis.timelineHtml(s); },
    psub: 'chart', csub: 'overview', fc: 'today', selB: '', synBase: 'A', cache: {},
    render(box) {
      const k = this.tab === 'A' || this.tab === 'B' ? kundaliOf(this.tab) : null;
      const full = k && !k.stub;
      try {
        return this.tab === 'shared' ? this.timelineHtml('shared')
          : this.tab === 'pair' ? this.pairHtml()
            : !full ? this.emptyHtml(this.tab) + this.timelineHtml(this.tab)
              : this.personNav() + (this.psub === 'explain' ? this.explainHtml(k, this.tab) : this.psub === 'forecast' ? this.forecastHtml(k, this.tab) : this.psub === 'cycles' ? this.cyclesHtml(k, this.tab) : this.chartHtml(k, this.tab) + this.timelineHtml(this.tab));
      } catch (e) { console.error(e); return `<div class="empty"><strong>Couldn’t draw this chart</strong>${esc(e.message || String(e))}</div>`; }
    },
    useEngine() { getEngine().then((e) => { if (W.setEngine(e)) { this.cache = {}; this.draw(); } }).catch(() => {}); },
    emptyHtml(seat) {
      const own = seat === S.me.seat, k = kundaliOf(seat);
      if (own) return `<section class="hero-empty"><h2>Create your birth chart</h2><p>Enter your birth date, time and place. Vice Space finds the time zone and calculates your Sun, Moon and Rising signs, all ten planets, houses and aspects — then explains every position.</p><button class="btn" data-create>${icon('star')}Start with birth details</button></section>`;
      if (k && k.stub) return `<div class="empty">${icon('lock', 'spark')}<strong>${esc(nameOf(seat))} keeps their chart private</strong>They can choose to share it from their own profile.</div>`;
      return `<div class="empty">${icon('star', 'spark')}<strong>${S.members[seat] ? esc(nameOf(seat)) + ' hasn’t created a chart yet' : 'Waiting for the second person to join'}</strong></div>`;
    },
    personNav() {
      return `<div class="seg ksub" role="group" aria-label="View">${[['chart', 'Chart'], ['explain', 'Explained'], ['forecast', 'Forecast'], ['cycles', 'Cycles']].map(([k, l]) => `<button data-psub="${k}" aria-pressed="${k === this.psub}">${l}</button>`).join('')}</div>`;
    },
    nm(seat, k) { return esc((k && k.name) || nameOf(seat)); },

    /* ===== natal chart ===== */
    chartHtml(k, seat) {
      const ch = W.fromDoc(k), own = seat === S.me.seat, bi = k.birth_input, tz = k.timezone || {}, tk = bi.timeKnown;
      const sun = W.get(ch, 'Sun'), moon = W.get(ch, 'Moon'), asc = W.get(ch, 'ASC');
      const sel = this.selB && W.get(ch, this.selB);
      const st = W.docSettings(k);
      const big = (label, b, sub, named) => `<div class="kid"><div class="kid-h">${label}</div><div class="kid-v">${b ? `${ab(b.key)} ${named ? W.NAME[b.key] + ' in ' : ''}${esc(W.SIGNS[b.sign])}` : '—'}</div><p class="kid-help">${b ? esc(WK.glance(ch, b).split('. Shows')[0].replace(/^[^:]+: /, '')) : esc(sub)}</p></div>`;
      const rows = W.all(ch);
      return `<section class="kcard">
        <div class="kcard-top"><div><h2 class="big-name">${this.nm(seat, k)}</h2>
          <p class="born">Born ${esc(fmtBorn(bi))}${tk ? ` <span class="muted">(${esc(ampm(bi.time))})</span>` : ''}<br>${esc(k.birthplace.label)} · ${esc(tz.id || '')} · ${esc(tz.offsetLabel || '')} at birth</p>
          <p class="badges"><span class="badge-calc">${icon('check')}Calculated by Vice Space</span>${own ? `<span class="badge-share">${k.shared ? 'Shared with ' + esc(nameOf(partnerSeat())) : 'Only you can see this'}</span>` : ''}</p></div>
          ${own ? `<div class="kact"><button class="btn sm" data-edit>${icon('edit')}Edit birth details</button><button class="btn ghost sm" data-wdl>${icon('download')}Download</button></div>` : `<div class="kact"><button class="btn ghost sm" data-wdl>${icon('download')}Download</button></div>`}</div>
        ${!tk ? `<div class="banner warn">${icon('clock')}<span>Birth time unknown — the Rising sign, Midheaven and houses can’t be calculated, and the Moon may be a few degrees off. Add a birth time, even approximate, for a full chart.</span></div>` : ''}
        <div class="kids">${big('Sun sign', sun)}${big('Moon sign', moon)}${big('Rising sign', asc, 'Needs birth time')}${big('Chart ruler', ch.ruler ? W.get(ch, ch.ruler) : null, 'Needs birth time', true)}</div>
      </section>
      <section class="kgrid2"><div class="panel chartp"><div class="ph"><h3>Natal chart</h3></div>
          <div class="chartwrap wheelwrap" id="wheel">${WHEEL.svg({ base: ch, inner: rows.filter((b) => b.key !== 'Fortune' && b.key !== 'ASC' && b.key !== 'MC'), aspects: ch.aspects.filter((a) => !['ASC', 'MC', 'Fortune', 'Lilith'].includes(a.a) && !['ASC', 'MC', 'Fortune', 'Lilith'].includes(a.b)), sel: this.selB, label: 'Natal chart wheel' })}</div>
          <p class="legend"><b>How to read it:</b> the outer ring is the zodiac, starting from the Ascendant (AC) on the left; numbers 1–12 are the houses, running anticlockwise. Inside: the planets, and lines for aspects — <span class="lc soft">blue</span> flowing, <span class="lc hard">pink</span> tense, <span class="lc adj">amber dashed</span> adjusting. Tap a planet.</p></div>
        <div class="panel" id="bsel">${sel ? `<h3>${ab(sel.key)} ${W.NAME[sel.key]} in ${esc(W.SIGNS[sel.sign])}</h3><p class="rd-g" style="padding:0;margin:0 0 6px">${esc(WK.glance(ch, sel))}</p>${WK.placement(ch, sel)}<button class="btn ghost sm" data-bsel="">Show all</button>`
          : `<h3>Planets &amp; points</h3><p class="muted" style="margin-top:0">Tap a planet in the wheel or a row to read what it means for you.</p>
          <div class="tablewrap"><table class="graha"><thead><tr><th></th><th>Sign</th><th>Degree</th><th>House</th><th>Note</th></tr></thead><tbody>${rows.map((b) => `<tr data-bsel="${b.key}" tabindex="0"><td><b>${ab(b.key)} ${W.NAME[b.key]}</b></td><td>${esc(W.SIGNS[b.sign])}</td><td>${W.dms(b.deg)}</td><td>${b.house || '—'}</td><td>${b.retro && W.PLANETS.includes(b.key) ? '℞ ' : ''}${W.PLANETS.includes(b.key) && WK.dignity(b.key, b.sign).k !== 'peregrine' ? esc(WK.dignity(b.key, b.sign).k) : ''}</td></tr>`).join('')}</tbody></table></div>`}</div></section>
      <section class="kgrid2">
        <div class="panel"><div class="ph"><h3>Aspect grid</h3></div>${WHEEL.grid(W.BODIES.concat(tk ? ['ASC', 'MC'] : []), W.BODIES.concat(tk ? ['ASC', 'MC'] : []), ch.aspects)}
          <p class="legend">☌ conjunction · ⚹ sextile · □ square · △ trine · ☍ opposition · ⚻ quincunx — the small number is the orb in degrees.</p></div>
        <div class="panel"><div class="ph"><h3>Balance</h3></div>${this.balanceHtml(ch)}</div></section>
      ${tk ? `<section class="panel"><div class="ph"><h3>Houses (${esc(ch.sys === 'placidus' ? 'Placidus' : ch.sys === 'whole' ? 'Whole sign' : ch.sys === 'porphyry' ? 'Porphyry' : 'Equal')})</h3></div>
        ${st.houses === 'placidus' && ch.sys !== 'placidus' ? '<p class="hint">Placidus houses don’t work this close to the poles, so equal houses are used.</p>' : ''}
        <div class="houses">${ch.cusps.map((c, i) => { const ps = ch.bodies.filter((b) => b.house === i + 1); return `<div class="house"><span class="hn">${i + 1}</span><div><b>${esc(W.SIGNS[Math.floor(c / 30)])} ${W.dms(c % 30)}</b><br><small class="muted">${esc(WK.HOUSE[i][0])}</small>${ps.length ? `<br><span class="hp">${ps.map((p) => ab(p.key) + ' ' + W.NAME[p.key]).join(', ')}</span>` : ''}</div></div>`; }).join('')}</div></section>` : ''}
      <section class="panel settings-p"><div class="ph"><h3>How this was calculated</h3><button class="btn ghost sm" data-wlearn>Learn more</button></div>
        <p class="muted" style="margin-top:0">Tropical zodiac · ${esc({ placidus: 'Placidus', whole: 'Whole-sign', equal: 'Equal', porphyry: 'Porphyry' }[st.houses])} houses · ${st.node === 'mean' ? 'mean' : 'true'} lunar node · mean Black Moon Lilith · ${esc(W.engineName())}.<br>Birth instant ${esc(k.utc_birth_instant.replace('T', ' ').slice(0, 16))} UTC · ${esc(k.birthplace.lat.toFixed(4))}°, ${esc(k.birthplace.lon.toFixed(4))}°.</p>
        ${own ? `<details class="adv"><summary>Advanced settings</summary><div class="row" style="margin-top:12px">
          <label class="field"><span>House system</span><select id="wHo">${[['placidus', 'Placidus — default'], ['whole', 'Whole sign'], ['equal', 'Equal'], ['porphyry', 'Porphyry']].map(([v, l]) => `<option value="${v}" ${v === st.houses ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field"><span>Lunar node</span><select id="wNo"><option value="true" ${st.node !== 'mean' ? 'selected' : ''}>True — default</option><option value="mean" ${st.node === 'mean' ? 'selected' : ''}>Mean</option></select></label></div>
          <button class="btn sm" data-wapply>Apply</button></details>` : ''}</section>
      <section class="panel"><div class="ph"><h3>Personal notes</h3>${own ? '<button class="btn ghost sm" data-notes>Edit</button>' : ''}</div>
        ${k.notes ? `<p class="prose">${esc(k.notes)}</p>` : `<p class="muted">${own ? 'Anything you want to remember alongside your chart.' : 'No notes.'}</p>`}</section>
      ${own ? `<section class="panel"><div class="ph"><h3>Sharing</h3></div><label class="check"><input type="checkbox" data-share ${k.shared ? 'checked' : ''}> Let ${esc(nameOf(partnerSeat()))} see my chart</label><p class="hint">Sharing lets you both see each other’s charts, synastry, composite and forecasts.</p></section>` : ''}`;
    },
    balanceHtml(ch) {
      const b = ch.balance, bar = (v, col) => `<span class="meter"><i style="width:${Math.round(v * 100)}%;background:${col}"></i></span>`;
      return `<div class="bal">${W.EL.map((e, i) => `<div><span>${WK.cap(e)}</span>${bar(b.el[i], WHEEL.EL_COL[i])}<small>${Math.round(b.el[i] * 100)}%</small></div>`).join('')}</div>
        <div class="bal">${W.MODE.map((m, i) => `<div><span>${WK.cap(m)}</span>${bar(b.mo[i], '#FF8CC6')}<small>${Math.round(b.mo[i] * 100)}%</small></div>`).join('')}</div>
        <p style="margin-bottom:0"><b>Strongest element:</b> ${WK.EL_TXT[b.dominantEl]}. <b>Weakest:</b> ${b.weakEl}. <b>Mode:</b> ${WK.MODE_TXT[b.dominantMode]}.${ch.timeKnown ? ` ${b.hemi.upper > b.hemi.lower ? 'Most planets are above the horizon — a public, outward-facing life.' : 'Most planets are below the horizon — a private, inner-focused life.'} ${b.hemi.east > b.hemi.west ? 'Most are on the eastern side — you shape your own destiny.' : 'Most are on the western side — life unfolds through other people.'}` : ''}</p>
        ${ch.patterns.length ? `<p style="margin-bottom:0"><b>Patterns:</b> ${ch.patterns.map((p) => `${p.type} (${p.keys.map((x) => W.NAME[x]).join(', ')})`).join('; ')}.</p>` : ''}`;
    },

    /* ===== explained ===== */
    explainHtml(k, seat) {
      const ch = W.fromDoc(k), nm = this.nm(seat, k);
      const rows = [];
      const add = (label, val, mean) => rows.push(`<tr><th>${esc(label)}</th><td><b>${val}</b><span>${esc(mean)}</span></td></tr>`);
      for (const [label, key] of [['Sun sign', 'Sun'], ['Moon sign', 'Moon'], ['Rising sign', 'ASC'], ['Midheaven', 'MC'], ['Mercury', 'Mercury'], ['Venus', 'Venus'], ['Mars', 'Mars']]) { const b = W.get(ch, key); if (b) add(label, `${ab(key)} ${esc(W.SIGNS[b.sign])}`, WK.glance(ch, b).split(' Shows up')[0]); }
      if (ch.ruler) { const r = W.get(ch, ch.ruler); add('Chart ruler', `${ab(ch.ruler)} ${W.NAME[ch.ruler]}`, `Rules your Rising sign; in ${W.SIGNS[r.sign]}${r.house ? `, house ${r.house} — your energy flows into ${WK.HOUSE[r.house - 1][0]}` : ''}.`); }
      add('Element', esc(WK.cap(ch.balance.dominantEl)), WK.cap(WK.EL_TXT[ch.balance.dominantEl].split(' — ')[1]) + '.');
      add('Modality', esc(WK.cap(ch.balance.dominantMode)), WK.cap(WK.MODE_TXT[ch.balance.dominantMode].split(' — ')[1]) + '.');
      const top = ch.aspects.find((a) => W.PLANETS.includes(a.a) && W.PLANETS.includes(a.b));
      if (top) add('Tightest aspect', `${W.NAME[top.a]} ${W.ASP[top.type].glyph}︎ ${W.NAME[top.b]}`, WK.aspectGlance(top));
      const node = W.get(ch, 'Node'); add('North Node', `${ab('Node')} ${esc(W.SIGNS[node.sign])}`, WK.glance(ch, node).split(' Shows up')[0]);
      const sorted = ch.aspects.filter((a) => a.a !== 'Fortune' && a.b !== 'Fortune');
      return `<section class="panel"><div class="ph"><h3>${nm}’s chart, explained</h3></div><p style="margin-top:0">Every planet, point, house and aspect in ${nm}’s chart — a one-line summary first, the full explanation one tap away.</p>${DISCLAIM}</section>
        <section class="panel"><div class="ph"><h3>${nm} at a glance</h3></div><table class="glance"><tbody>${rows.join('')}</tbody></table></section>
        <section class="panel"><div class="ph"><h3>Every planet and point</h3></div>
          ${W.all(ch).map((b) => rd(`${ab(b.key)}${W.NAME[b.key]}`, WK.placement(ch, b), false, `${esc(posTxt(b))}${b.house && !['ASC', 'MC'].includes(b.key) ? ' · house ' + b.house : ''}`, esc(WK.glance(ch, b)))).join('')}</section>
        <section class="panel"><div class="ph"><h3>Every aspect (${sorted.length})</h3></div><p class="muted" style="margin-top:0">Aspects are the angles between planets — how the parts of your personality talk to each other. Tightest first.</p>
          ${sorted.map((a) => rd(`${ab(a.a)}${W.ASP[a.type].glyph}︎${ab(a.b)} ${W.NAME[a.a]} ${W.ASP[a.type].name} ${W.NAME[a.b]}`, WK.aspectDetail(a), false, `orb ${a.orb.toFixed(1)}°`, esc(WK.aspectGlance(a)))).join('')}</section>
        ${ch.patterns.length ? `<section class="panel"><div class="ph"><h3>Chart patterns</h3></div>${ch.patterns.map((p) => rd(esc(p.type), `<p>${WK.PATTERN[p.type]}</p><p>Planets: ${p.keys.map((x) => `${W.NAME[x]} in ${W.SIGNS[W.get(ch, x).sign]}`).join(', ')}.${p.apex ? ` Apex: <b>${W.NAME[p.apex]}</b> — ${WK.P[p.apex].what}` : ''}</p>`, false, p.sign != null ? W.SIGNS[p.sign] : p.house ? 'house ' + p.house : '', esc(WK.PATTERN[p.type].split('. ')[0] + '.'))).join('')}</section>` : ''}
        ${ch.cusps ? `<section class="panel"><div class="ph"><h3>The 12 houses</h3></div>${ch.cusps.map((c, i) => {
          const s = Math.floor(c / 30), ruler = W.RULER[s], rb = W.get(ch, ruler), occ = ch.bodies.filter((b) => b.house === i + 1);
          return rd(`<span class="ab">${i + 1}</span>${esc(WK.cap(WK.HOUSE[i][0]))}`, WK.houseDeep(ch, i, s, ruler, rb, occ), false, esc(W.SIGNS[s]) + (occ.length ? ' · ' + occ.map((b) => g(b.key)).join(' ') : ''), esc(`${WK.cap(WK.HOUSE[i][0])} — approached with ${WK.SIGN[s].kw}.`));
        }).join('')}</section>` : ''}`;
    },

    /* ===== forecasts ===== */
    forecastHtml(k, seat) {
      const ch = W.fromDoc(k), st = ch.settings, nm = this.nm(seat, k);
      const key = `${seat}:${this.fc}:${new Date().toDateString()}:${k.updatedAt || ''}`;
      if (this.cache[key]) return this.cache[key];
      const seg = `<div class="seg fcseg" role="group" aria-label="Forecast range">${[['today', 'Today'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']].map(([x, l]) => `<button data-fc="${x}" aria-pressed="${x === this.fc}">${l}</button>`).join('')}</div>`;
      const now = Date.now(), start = noon(now);
      const head = (s, label) => `<div class="fc-head"><div class="fc-score"><b>${s}</b><span>${label}</span></div>${meter(s)}</div>`;
      const targets = personal(ch);
      let body = '';
      if (this.fc === 'today') {
        const d = day(ch, now, st);
        const rets = retrogrades(now, st);
        const sky = W.chart({ utcMs: now, lat: ch.lat, lon: ch.lon, timeKnown: false }, st);
        const doL = [WK.HOUSE_DO[d.moonHouse - 1], ...d.hits.filter((h) => hitVal(h) > 0).slice(0, 2).map(WK.transitAdvice)];
        const avoidL = [WK.HOUSE_AVOID[d.moonHouse - 1], ...d.hits.filter((h) => hitVal(h) < 0).slice(0, 2).map(WK.transitAdvice), ...(rets.includes('Mercury') ? ['signing contracts without re-reading them'] : [])];
        body = `<section class="panel"><div class="ph"><h3>Today for ${nm} · ${esc(fmtW(now))}</h3></div>${head(d.score, rating(d.score))}
          <p><b>The Moon is in ${esc(W.SIGNS[d.moonSign])}</b>, moving through your <b>${WK.ord(d.moonHouse)} house</b>${ch.cusps ? '' : ' (counted from your Sun)'} — ${WK.HOUSE[d.moonHouse - 1][0]}. Emotionally, today ${WK.FEEL[d.moonSign].replace('you need', 'you need')}.</p>
          <p><b>${d.phase}</b> — ${WK.PHASE_TXT[d.phase]}.</p>
          ${d.hits.length ? `<h4>Today’s transits to your chart</h4><ul class="tlist">${d.hits.slice(0, 6).map((h) => hitLi(h)).join('')}</ul>` : '<p class="muted">No major transits to your personal planets today — a quiet day astrologically.</p>'}
          <div class="advice"><div class="ok"><b>Do</b><ul>${[...new Set(doL)].map((x) => `<li>${esc(WK.cap(x))}</li>`).join('')}</ul></div><div class="no"><b>Avoid</b><ul>${[...new Set(avoidL)].map((x) => `<li>${esc(WK.cap(x))}</li>`).join('')}</ul></div></div>
          ${rets.length ? `<p><b>Retrograde now:</b> ${rets.map((r) => `${W.NAME[r]} (${RETRO_TXT[r]})`).join('; ')}.</p>` : ''}
          <p class="hint">Colour of the day: ${DAY_COLOR[new Date(now).getDay()]}.</p></section>
          <section class="kgrid2"><div class="panel"><div class="ph"><h3>Today’s sky around your chart</h3></div>
            <div class="chartwrap wheelwrap">${WHEEL.svg({ base: ch, inner: ch.bodies.filter((b) => W.PLANETS.includes(b.key)), outer: sky.bodies.filter((b) => W.PLANETS.includes(b.key)), aspects: d.hits.map((h) => ({ a: h.b, b: h.a, type: h.type, orb: h.orb, lim: h.lim, outer: true })).filter((x) => W.PLANETS.includes(x.a)), outerColor: '#FFB547', label: 'Transits around the natal chart' })}</div>
            <p class="legend">Inner ring: your natal planets. <span style="color:#FFB547">Outer ring: where the planets are now.</span> Lines: today’s transits.</p></div>
          <div class="panel"><div class="ph"><h3>Planets today</h3></div><ul class="tlist">${sky.bodies.filter((b) => W.PLANETS.includes(b.key)).map((b) => `<li><b>${ab(b.key)} ${W.NAME[b.key]} in ${esc(W.SIGNS[b.sign])}${b.retro ? ' ℞' : ''}</b>${ch.cusps ? ` <small class="muted">your ${WK.ord(W.houseOf(b.lon, ch.cusps))} house</small>` : ''}<br><small>${esc(WK.TONE[b.key] ? WK.cap(WK.TONE[b.key]) : '')} ${ch.cusps ? 'in ' + esc(WK.HOUSE[W.houseOf(b.lon, ch.cusps) - 1][0]) : ''}.</small></li>`).join('')}</ul></div></section>`;
      } else if (this.fc === 'week') {
        const days = Array.from({ length: 7 }, (_, i) => day(ch, i === 0 ? now : start + i * DAY, st));
        const best = [...days].sort((a, b) => b.score - a.score)[0], low = days.filter((x) => x.score < 44);
        const hits = W.hits(['Sun', 'Mercury', 'Venus', 'Mars'], targets, start - DAY / 2, start + 7 * DAY, st, DAY / 2);
        const ing = ['Sun', 'Mercury', 'Venus', 'Mars'].flatMap((p) => W.ingresses(p, start - DAY / 2, start + 7 * DAY, st, DAY)).sort((a, b) => a.at - b.at);
        const lun = W.lunations(start - DAY / 2, start + 7 * DAY, st);
        body = `<section class="panel"><div class="ph"><h3>The next 7 days for ${nm}</h3></div>
          <div class="days">${days.map((x) => `<div class="dcell${x === best ? ' best' : ''}${x.score < 44 ? ' ch' : ''}"><b>${esc(new Date(x.ms).toLocaleDateString(undefined, { weekday: 'short' }))}</b><small>${esc(new Date(x.ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))}</small><span class="vbar"><i style="height:${x.score}%"></i></span><span class="dn">${x.score}</span><small>${W.SG[x.moonSign]} H${x.moonHouse}</small></div>`).join('')}</div>
          <p><b>Best day:</b> ${esc(fmtW(best.ms))} — good for ${WK.HOUSE_DO[best.moonHouse - 1]}. <b>Go easy on:</b> ${low.length ? low.map((x) => esc(fmtW(x.ms))).join(', ') : 'no especially difficult days'}.</p>
          <h4>Day by day</h4><ul class="tlist">${days.map((x) => `<li class="${x.score >= 58 ? 'ok' : x.score < 44 ? 'no' : ''}"><b>${esc(fmtW(x.ms))} · ${rating(x.score)}</b><br><small>Moon in ${esc(W.SIGNS[x.moonSign])}, your ${WK.ord(x.moonHouse)} house: ${WK.HOUSE_DO[x.moonHouse - 1]}.${x.hits[0] ? ' ' + WK.transitGlance(x.hits[0]) : ''}</small></li>`).join('')}</ul>
          ${hits.length ? `<h4>Exact transits this week</h4><ul class="tlist">${hits.map((h) => hitLi(h)).join('')}</ul>` : ''}
          ${ing.length || lun.length ? `<h4>In the sky</h4><ul class="tlist">${[...ing.map((x) => ({ at: x.at, t: `<b>${ab(x.key)} ${W.NAME[x.key]} enters ${esc(W.SIGNS[x.to])}</b> <small class="muted">${fmtD(x.at)}</small>${ch.cusps ? `<br><small>In your ${WK.ord(W.houseOf(x.to * 30 + 0.01, ch.cusps))} house: ${WK.TONE[x.key]} turns to ${WK.HOUSE[W.houseOf(x.to * 30 + 0.01, ch.cusps) - 1][0]}.</small>` : ''}` })), ...lun.map((x) => ({ at: x.at, t: `<b>${x.type === 'new' ? 'New Moon' : 'Full Moon'} in ${esc(W.SIGNS[Math.floor(x.lon / 30)])}${x.eclipse ? ' (eclipse)' : ''}</b> <small class="muted">${fmtD(x.at)}</small><br><small>${ch.cusps ? `In your ${WK.ord(W.houseOf(x.lon, ch.cusps))} house (${WK.HOUSE[W.houseOf(x.lon, ch.cusps) - 1][0]}): ` : ''}${WK.PHASE_TXT[x.type === 'new' ? 'New Moon' : 'Full Moon']}.</small>` }))].sort((a, b) => a.at - b.at).map((x) => `<li>${x.t}</li>`).join('')}</ul>` : ''}${DISCLAIM}</section>`;
      } else if (this.fc === 'month') {
        const days = Array.from({ length: 30 }, (_, i) => day(ch, start + i * DAY, st));
        const avg = Math.round(days.reduce((s, x) => s + x.score, 0) / 30);
        const top = [...days].sort((a, b) => b.score - a.score).slice(0, 4).sort((a, b) => a.ms - b.ms), low = [...days].sort((a, b) => a.score - b.score).slice(0, 3).sort((a, b) => a.ms - b.ms);
        const end = start + 30 * DAY;
        const hits = W.hits(['Sun', 'Mercury', 'Venus', 'Mars'], targets.filter((b) => ['Sun', 'Moon', 'Venus', 'Mars', 'ASC', 'MC'].includes(b.key)), start, end, st, DAY);
        const lun = W.lunations(start, end, st);
        const ing = ['Sun', 'Mercury', 'Venus', 'Mars'].flatMap((p) => W.ingresses(p, start, end, st, DAY)).sort((a, b) => a.at - b.at);
        const sta = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].flatMap((p) => W.stations(p, start, end, st, DAY)).sort((a, b) => a.at - b.at);
        body = `<section class="panel"><div class="ph"><h3>The next 30 days for ${nm}</h3></div>${head(avg, rating(avg) + ' month')}
          <div class="mbars" role="img" aria-label="Daily rating for 30 days">${days.map((x) => `<span class="${x.score < 44 ? 'ch' : ''}" style="height:${x.score}%" title="${esc(fmtW(x.ms))}: ${x.score}"></span>`).join('')}</div>
          <div class="mbars-x"><span>${esc(fmtW(days[0].ms))}</span><span>${esc(fmtW(days[29].ms))}</span></div>
          <p><b>Best days:</b> ${top.map((x) => esc(fmtW(x.ms))).join(', ')}. <b>Quieter days:</b> ${low.map((x) => esc(fmtW(x.ms))).join(', ')}.</p>
          ${lun.length ? `<h4>New and Full Moons</h4><ul class="tlist">${lun.map((x) => { const h = ch.cusps ? W.houseOf(x.lon, ch.cusps) : null; return `<li class="${x.eclipse ? 'no' : ''}"><b>${x.type === 'new' ? 'New Moon' : 'Full Moon'} in ${esc(W.SIGNS[Math.floor(x.lon / 30)])}${x.eclipse ? ' — eclipse' : ''}</b> <small class="muted">${fmtD(x.at)}</small><br><small>${h ? `Lights up your ${WK.ord(h)} house — ${WK.HOUSE[h - 1][0]}. ` : ''}${WK.PHASE_TXT[x.type === 'new' ? 'New Moon' : 'Full Moon']}.${x.eclipse ? ' Eclipses bring faster, fated-feeling change in this area.' : ''}</small></li>`; }).join('')}</ul>` : ''}
          ${hits.length ? `<h4>Key transits</h4><ul class="tlist">${hits.slice(0, 14).map((h) => hitLi(h)).join('')}</ul>` : ''}
          ${ing.length ? `<h4>Planets changing sign</h4><ul class="tlist">${ing.map((x) => `<li><b>${ab(x.key)} ${W.NAME[x.key]} enters ${esc(W.SIGNS[x.to])}</b> <small class="muted">${fmtD(x.at)}</small>${ch.cusps ? `<br><small>${WK.cap(WK.TONE[x.key])} moves into your ${WK.ord(W.houseOf(x.to * 30 + 0.01, ch.cusps))} house — ${WK.HOUSE[W.houseOf(x.to * 30 + 0.01, ch.cusps) - 1][0]}.</small>` : ''}</li>`).join('')}</ul>` : ''}
          ${sta.length ? `<h4>Retrograde turns</h4><ul class="tlist">${sta.map((x) => `<li class="${x.turns === 'retrograde' ? 'no' : 'ok'}"><b>${W.NAME[x.key]} turns ${x.turns}</b> <small class="muted">${fmtD(x.at)}</small><br><small>${x.turns === 'retrograde' ? WK.cap(RETRO_TXT[x.key]) : 'Plans connected with ' + WK.TONE[x.key] + ' move forward again'}.</small></li>`).join('')}</ul>` : ''}${DISCLAIM}</section>`;
      } else {
        const end = start + 365 * DAY;
        const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(start); d.setDate(1); d.setMonth(d.getMonth() + i); const pts = [3, 10, 17, 24].map((x) => { const t = new Date(d); t.setDate(x); return yearScore(ch, t.getTime(), st); }); return { ms: d.getTime(), score: Math.round(pts.reduce((a, b) => a + b, 0) / 4) }; });
        const avg = Math.round(months.reduce((s, m) => s + m.score, 0) / 12);
        const raw = W.hits(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'], W.all(ch).filter((b) => !['Fortune', 'Lilith'].includes(b.key)), start, end, st, 2 * DAY);
        const groups = []; for (const h of raw) { const gk = groups.find((x) => x.a === h.a && x.b === h.b && x.type === h.type); if (gk) gk.dates.push(h.at); else groups.push({ ...h, dates: [h.at] }); }
        const L = W.lons(now, st, Astro.builtin);
        const ecl = W.lunations(start, end, st).filter((x) => x.eclipse);
        const merc = W.stations('Mercury', start, end, st, DAY);
        const mercP = []; for (let i = 0; i < merc.length; i++) if (merc[i].turns === 'retrograde') mercP.push([merc[i].at, (merc[i + 1] || {}).at]);
        if (merc[0] && merc[0].turns === 'direct') mercP.unshift([null, merc[0].at]);
        const jh = ch.cusps ? W.houseOf(L.Jupiter, ch.cusps) : null, sh = ch.cusps ? W.houseOf(L.Saturn, ch.cusps) : null;
        const mo = (ms) => new Date(ms).toLocaleDateString(undefined, { month: 'short' });
        const bestM = [...months].sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.ms - b.ms), lowM = [...months].sort((a, b) => a.score - b.score).slice(0, 2).sort((a, b) => a.ms - b.ms);
        body = `<section class="panel"><div class="ph"><h3>The next 12 months for ${nm}</h3></div>${head(avg, rating(avg) + ' year')}
          <div class="ybars" role="img" aria-label="Monthly rating">${months.map((m) => `<div><span class="vbar"><i style="height:${m.score}%"></i></span><small>${esc(mo(m.ms))}</small><small class="dn">${m.score}</small></div>`).join('')}</div>
          <p><b>Most supportive months:</b> ${bestM.map((m) => esc(new Date(m.ms).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))).join(', ')}. <b>Pace yourself in:</b> ${lowM.map((m) => esc(new Date(m.ms).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))).join(', ')}.</p>
          <h4>The year’s big themes</h4><ul class="tlist">
            <li class="ok"><b>${ab('Jupiter')} Jupiter in ${esc(W.SIGNS[Math.floor(L.Jupiter / 30)])}</b>${jh ? ` <small class="muted">your ${WK.ord(jh)} house</small>` : ''}<br><small>${jh ? `Growth, luck and opportunities come through ${WK.HOUSE[jh - 1][0]}.` : 'Growth and opportunities in ' + WK.THEME[Math.floor(L.Jupiter / 30)] + '.'}</small></li>
            <li class="no"><b>${ab('Saturn')} Saturn in ${esc(W.SIGNS[Math.floor(L.Saturn / 30)])}</b>${sh ? ` <small class="muted">your ${WK.ord(sh)} house</small>` : ''}<br><small>${sh ? `Responsibility, hard work and lasting results in ${WK.HOUSE[sh - 1][0]}.` : 'Work and responsibility around ' + WK.THEME[Math.floor(L.Saturn / 30)] + '.'}</small></li></ul>
          ${groups.length ? `<h4>Major transits to your chart</h4><ul class="tlist">${groups.map((x) => { const kind = W.ASP[x.type].kind; const ret = WK.RETURNS[`${x.a}-${x.b}-${x.type}`]; return `<li class="${kind === 'soft' ? 'ok' : kind === 'hard' ? 'no' : ''}"><b>${ab(x.a)} ${W.NAME[x.a]} ${W.ASP[x.type].name} your ${W.NAME[x.b]}</b> <small class="muted">exact ${x.dates.map(fmtD).join(', ')}</small><br><small>${ret ? WK.cap(ret) + '. ' : ''}${WK.cap(WK.SLOW_TXT[x.a][kind === 'conj' ? 'conj' : kind === 'soft' ? 'soft' : 'hard'])} — touching ${WK.P[x.b].core}. ${WK.cap(WK.transitAdvice(x))}.</small></li>`; }).join('')}</ul>` : '<p class="muted">No exact slow-planet transits to your chart this year — a year to build on what you have.</p>'}
          ${ecl.length ? `<h4>Eclipses</h4><ul class="tlist">${ecl.map((x) => { const h = ch.cusps ? W.houseOf(x.lon, ch.cusps) : null; return `<li class="no"><b>${x.type === 'new' ? 'Solar' : 'Lunar'} eclipse in ${esc(W.SIGNS[Math.floor(x.lon / 30)])}</b> <small class="muted">${fmtD(x.at)}</small><br><small>${h ? `Your ${WK.ord(h)} house — ${WK.HOUSE[h - 1][0]}: ` : ''}${x.type === 'new' ? 'a powerful new beginning' : 'a culmination or ending'}; changes here can come quickly.</small></li>`; }).join('')}</ul>` : ''}
          ${mercP.length ? `<h4>Mercury retrograde periods</h4><p>${mercP.map(([a, b]) => `${a ? fmtD(a) : 'now'} – ${b ? fmtD(b) : 'later'}`).join('; ')}. Double-check messages, travel and contracts.</p>` : ''}
          <p class="hint">For your progressed chart and solar return, open <b>Cycles</b>.</p>${DISCLAIM}</section>`;
      }
      const html = seg + body;
      this.cache = { [key]: html };
      return html;
    },

    /* ===== cycles: transits, progressions, solar return ===== */
    cyclesHtml(k, seat) {
      const ch = W.fromDoc(k), st = ch.settings, nm = this.nm(seat, k), inp = W.docInput(k);
      const pr = W.progressed(inp, st, Date.now());
      const pSun = W.get(pr, 'Sun'), pMoon = W.get(pr, 'Moon');
      const by = new Date(inp.utcMs);
      const thisYear = new Date().getFullYear();
      let srYear = thisYear; if (Date.now() < Date.UTC(thisYear, by.getUTCMonth(), by.getUTCDate())) srYear -= 1;
      const sr = W.solarReturn(inp, st, srYear);
      const srSun = W.get(sr, 'Sun'), srMoon = W.get(sr, 'Moon'), srAsc = W.get(sr, 'ASC');
      const srSunH = sr.cusps ? W.houseOf(srSun.lon, sr.cusps) : null, srMoonH = sr.cusps ? W.houseOf(srMoon.lon, sr.cusps) : null;
      const emph = sr.cusps ? Object.entries(sr.bodies.filter((b) => W.PLANETS.includes(b.key)).reduce((m, b) => ((m[b.house] = (m[b.house] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 2) : [];
      return `<section class="panel"><div class="ph"><h3>Progressed chart · ${nm} today</h3></div>
        <p style="margin-top:0">Secondary progressions move the chart forward one day for each year of life — they show slow inner development. Progressed age ${((Date.now() - inp.utcMs) / (W.YEAR * DAY)).toFixed(1)} years.</p>
        <div class="kgrid2"><div class="chartwrap wheelwrap">${WHEEL.svg({ base: ch, inner: ch.bodies.filter((b) => W.PLANETS.includes(b.key)), outer: pr.bodies.filter((b) => W.PLANETS.includes(b.key)), aspects: pr.toNatal.filter((a) => W.PLANETS.includes(a.b) && W.PLANETS.includes(a.a)).map((a) => ({ a: a.b, b: a.a, type: a.type, orb: a.orb, lim: 1, outer: true })), outerColor: '#9B7BFF', label: 'Progressed chart around the natal chart' })}</div>
        <div>
          ${rd(`${ab('Sun')} Progressed Sun in ${esc(W.SIGNS[pSun.sign])}`, `<p>Your progressed Sun moves about one degree a year and changes sign roughly every 30 years. In ${W.SIGNS[pSun.sign]} your sense of self matures towards ${WK.SIGN[pSun.sign].kw}.${pSun.sign !== W.get(ch, 'Sun').sign ? ` You were born a ${W.SIGNS[W.get(ch, 'Sun').sign]}; that core stays, with ${W.SIGNS[pSun.sign]} layered on top.` : ''}</p>`, true, W.dms(pSun.deg), esc(`Identity matures towards ${WK.SIGN[pSun.sign].kw}.`))}
          ${rd(`${ab('Moon')} Progressed Moon in ${esc(W.SIGNS[pMoon.sign])}`, `<p>The progressed Moon changes sign every two and a half years and is the best guide to your current emotional chapter. ${WK.PROG_MOON(pMoon.sign)}${pMoon.house ? ` It is in your ${WK.ord(pMoon.house)} house: feelings centre on ${WK.HOUSE[pMoon.house - 1][0]}.` : ''}</p>`, false, `${W.dms(pMoon.deg)}${pMoon.house ? ' · house ' + pMoon.house : ''}`, esc(WK.PROG_MOON(pMoon.sign).split(';')[0] + '.'))}
          ${rd('Progressed lunar phase', `<p>The angle between progressed Sun and Moon forms a 30-year cycle. You are in the <b>${W.phaseName(pr.phaseAngle)}</b> phase: ${WK.PHASE_TXT[W.phaseName(pr.phaseAngle)]}.</p>`, false, W.phaseName(pr.phaseAngle), esc(WK.cap(WK.PHASE_TXT[W.phaseName(pr.phaseAngle)]) + '.'))}
          ${pr.toNatal.length ? pr.toNatal.map((a) => rd(`Progressed ${W.NAME[a.a]} ${W.ASP[a.type].name} natal ${W.NAME[a.b]}`, `<p>Progressed aspects within 1° are active for one to two years. ${WK.aspectGlance(a)} This theme is being developed now.</p>`, false, `orb ${a.orb.toFixed(2)}°`, esc(WK.aspectGlance(a)))).join('') : ''}
        </div></div></section>
      <section class="panel"><div class="ph"><h3>Solar return ${srYear}–${srYear + 1}</h3></div>
        <p style="margin-top:0">The chart for the exact moment the Sun returned to its birth position on ${fmtD(sr.utcMs)} — the astrological “birthday chart” for the year. Calculated for your birthplace.</p>
        <div class="kgrid2"><div class="chartwrap wheelwrap">${WHEEL.svg({ base: sr, inner: sr.bodies.filter((b) => W.PLANETS.includes(b.key) || b.key === 'Node'), aspects: sr.aspects.filter((a) => W.PLANETS.includes(a.a) && W.PLANETS.includes(a.b) && !W.ASP[a.type].minor), label: 'Solar return chart' })}</div>
        <div>${sr.timeKnown ? `
          ${rd(`Year’s Rising sign: ${esc(W.SIGNS[srAsc.sign])}`, `<p>The solar-return Ascendant sets the tone of the year: you approach it in a ${WK.CORE[srAsc.sign]} way.</p>`, true, '', esc(`A ${WK.CORE[srAsc.sign].split(',')[0]} year.`))}
          ${rd(`Sun in the ${WK.ord(srSunH)} house`, `<p>Where the Sun falls in the return chart is the year’s main focus: <b>${WK.HOUSE[srSunH - 1][0]}</b>. ${WK.HOUSE[srSunH - 1][1]}</p>`, false, '', esc(`Main focus: ${WK.HOUSE[srSunH - 1][0]}.`))}
          ${rd(`Moon in ${esc(W.SIGNS[srMoon.sign])}, ${WK.ord(srMoonH)} house`, `<p>The return Moon shows what you emotionally need this year: ${WK.FEEL[srMoon.sign]}, mostly around ${WK.HOUSE[srMoonH - 1][0]}.</p>`, false, '', esc(`Emotional needs: ${WK.FEEL[srMoon.sign].replace('you need ', '')}.`))}
          ${emph.length ? `<p><b>Busiest houses:</b> ${emph.map(([h, n]) => `${WK.ord(Number(h))} (${n} planets — ${WK.HOUSE[h - 1][0]})`).join('; ')}.</p>` : ''}` : '<p class="muted">The solar return needs a birth time for its houses.</p>'}</div></div>${DISCLAIM}</section>`;
    },

    /* ===== couple ===== */
    pairHtml() {
      const kA = kundaliOf('A'), kB = kundaliOf('B');
      const ok = (k) => k && !k.stub;
      if (!ok(kA) || !ok(kB)) {
        const miss = ['A', 'B'].filter((s) => !ok(kundaliOf(s)));
        return `<div class="empty">${icon('star', 'spark')}<strong>Your synastry appears automatically once both charts are shared</strong>${miss.map((s) => { const k = kundaliOf(s); return k && k.stub ? `${esc(nameOf(s))}’s chart is private — turn on sharing in their profile.` : `${esc(nameOf(s))} hasn’t created a chart yet.`; }).join(' ')}</div>`;
      }
      const cA = W.fromDoc(kA), cB = W.fromDoc(kB), nA = this.nm('A', kA), nB = this.nm('B', kB);
      const nav = `<div class="seg ksub" role="group" aria-label="Couple view">${[['overview', 'Overview'], ['synastry', 'Synastry'], ['composite', 'Composite'], ['davison', 'Davison']].map(([x, l]) => `<button data-csub="${x}" aria-pressed="${x === this.csub}">${l}</button>`).join('')}</div>`;
      const pts = (c) => W.all(c).filter((b) => b.key !== 'Fortune');
      const syn = W.aspects(pts(cA), pts(cB), 'synastry');
      if (this.csub === 'synastry') return nav + this.synastryHtml(cA, cB, nA, nB, syn);
      if (this.csub === 'composite') return nav + this.compositeHtml(W.composite(cA, cB), nA, nB);
      if (this.csub === 'davison') return nav + this.davisonHtml(W.davison(W.docInput(kA), W.docInput(kB), cA.settings), nA, nB);
      return nav + this.overviewHtml(cA, cB, nA, nB, syn);
    },
    overviewHtml(cA, cB, nA, nB, syn) {
      const sc = WK.synScores(syn);
      const comp = W.composite(cA, cB);
      const start = noon(Date.now());
      const days = Array.from({ length: 7 }, (_, i) => coupleDay(cA, cB, comp, i === 0 ? Date.now() : start + i * DAY, nA, nB));
      const t = days[0], best = [...days].sort((x, y) => y.score - x.score)[0];
      const fits = [['Sun signs', 'Sun'], ['Moon signs', 'Moon'], ['Venus & Mars', 'VM'], ['Rising signs', 'ASC']].map(([l, k]) => {
        if (k === 'VM') { const e1 = WK.elementFit(W.get(cA, 'Venus').sign, W.get(cB, 'Mars').sign), e2 = WK.elementFit(W.get(cB, 'Venus').sign, W.get(cA, 'Mars').sign); return [l, `${nA}’s Venus & ${nB}’s Mars: ${e1.t}. ${nB}’s Venus & ${nA}’s Mars: ${e2.t}.`, e1.s + e2.s]; }
        const a = W.get(cA, k), b = W.get(cB, k); if (!a || !b) return null;
        const e = WK.elementFit(a.sign, b.sign); return [l, `${W.SIGNS[a.sign]} & ${W.SIGNS[b.sign]} — ${e.t}.`, e.s];
      }).filter(Boolean);
      const low = (d, n) => (d.score < 44 ? `${n} may feel ${d.hits.find((h) => hitVal(h) < 0) ? WK.transitGlance(d.hits.find((h) => hitVal(h) < 0)).replace(/\.$/, '').toLowerCase().replace('your', 'their') : 'a bit low'} today — extra patience helps.` : '');
      const notes = [low(t.a, nA), low(t.b, nB)].filter(Boolean);
      const both = t.a.score >= 58 && t.b.score >= 58 ? 'A good day for important joint decisions.' : t.a.score < 44 && t.b.score < 44 ? 'Keep it calm and postpone serious talks.' : 'Fine for everyday plans; keep big talks light.';
      const strongest = syn.filter((x) => W.PLANETS.includes(x.a) && W.PLANETS.includes(x.b)).slice(0, 5);
      return `<section class="panel"><div class="ph"><h3>${nA} &amp; ${nB}</h3></div>
          <div class="gm-top"><div class="gm-score"><b>${sc.overall.score}</b><span>overall harmony</span></div>
          <div class="gm-meter">${['love', 'emotion', 'talk', 'passion', 'commit'].map((id) => `<div class="cat"><span>${sc[id].name}</span>${meter(sc[id].score)}<b>${sc[id].score}</b></div>`).join('')}</div></div>
          <p class="hint">A summary of the ${syn.length} aspects between your charts, weighted by the planets that matter most in relationships. A starting point for reflection, not a verdict.</p>
          <ul class="tlist">${fits.map(([l, d, s]) => `<li class="${s > 0 ? 'ok' : s < 0 ? 'no' : ''}"><b>${l}</b><br><small>${esc(d)}</small></li>`).join('')}</ul></section>
        ${LIFE.areasHtml((seat, key) => W.get(seat === 'A' ? cA : cB, key).sign, nA, nB)}
        <section class="panel"><div class="ph"><h3>Today together · ${esc(fmtW(t.ms))}</h3></div>
          <div class="fc-head"><div class="fc-score"><b>${t.score}</b><span>${rating(t.score)}</span></div>${meter(t.score)}</div>
          <div class="pair-days"><div><b>${nA}</b> ${t.a.score} · ${rating(t.a.score)}<small>Moon in your ${WK.ord(t.a.moonHouse)}: ${WK.HOUSE_DO[t.a.moonHouse - 1]}</small></div><div><b>${nB}</b> ${t.b.score} · ${rating(t.b.score)}<small>Moon in your ${WK.ord(t.b.moonHouse)}: ${WK.HOUSE_DO[t.b.moonHouse - 1]}</small></div></div>
          <p><b>The Moon is in ${esc(W.SIGNS[t.a.moonSign])}</b>${t.compHouse ? `, in your composite chart’s ${WK.ord(t.compHouse)} house (${WK.HOUSE[t.compHouse - 1][0]})` : ''}. ${both} Best plan for today: <b>${t.plan}</b>.</p>
          ${t.comp.length || t.touch.length ? `<ul class="tlist">${t.comp.slice(0, 3).map((h) => `<li class="${hitVal(h) > 0 ? 'ok' : hitVal(h) < 0 ? 'no' : ''}"><b>${ab(h.a)} ${W.NAME[h.a]} ${W.ASP[h.type].name} your composite ${W.NAME[h.b]}</b><br><small>${WK.transitGlance(h).replace('your', 'your shared')} ${WK.cap(WK.transitAdvice(h))}.</small></li>`).join('')}${t.touch.map((x) => `<li class="${x.key === 'Mars' ? 'no' : 'ok'}"><b>Moon over ${x.who}’s ${W.NAME[x.key]}</b><br><small>${MOON_OVER[x.key]}.</small></li>`).join('')}</ul>` : ''}
          ${notes.length ? `<p>${notes.map(esc).join(' ')}</p>` : ''}
          <h4>Your week together</h4>
          <div class="days">${days.map((d) => `<div class="dcell${d === best ? ' best' : ''}${d.score < 44 ? ' ch' : ''}"><b>${esc(new Date(d.ms).toLocaleDateString(undefined, { weekday: 'short' }))}</b><small>${esc(new Date(d.ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))}</small><span class="vbar"><i style="height:${d.score}%"></i></span><span class="dn">${d.score}</span></div>`).join('')}</div>
          <p><b>Best day for a date:</b> ${esc(fmtW(best.ms))} — ${best.plan}.</p></section>
        <section class="panel"><div class="ph"><h3>Your strongest connections</h3></div>
          ${strongest.map((x) => rd(`${ab(x.a)}${W.ASP[x.type].glyph}︎${ab(x.b)} ${nA}’s ${W.NAME[x.a]} ${W.ASP[x.type].name} ${nB}’s ${W.NAME[x.b]}`, WK.synDetail(x, nA, nB) + (LIFE.syn(x, nA, nB) ? `<p><b>In daily life:</b> ${LIFE.syn(x, nA, nB)}</p>` : ''), false, `orb ${x.orb.toFixed(1)}°`, esc(WK.synGlance(x)))).join('')}
          <p class="hint">All ${syn.length} contacts are explained under <b>Synastry</b>.</p>${DISCLAIM}</section>`;
    },
    synastryHtml(cA, cB, nA, nB, syn) {
      const baseA = this.synBase !== 'B';
      const inner = baseA ? cA : cB, outer = baseA ? cB : cA;
      const wl = WHEEL.svg({ base: inner, inner: inner.bodies.filter((b) => W.PLANETS.includes(b.key) || b.key === 'Node'), outer: outer.bodies.filter((b) => W.PLANETS.includes(b.key) || b.key === 'Node'), aspects: syn.filter((x) => W.PLANETS.includes(x.a) && W.PLANETS.includes(x.b) && !W.ASP[x.type].minor).map((x) => (baseA ? { ...x, outer: true } : { ...x, a: x.b, b: x.a, outer: true })), innerColor: '#FF8CC6', outerColor: '#63E6FF', label: 'Synastry bi-wheel' });
      const overlay = (owner, other, nO, nX) => other.bodies.filter((b) => W.PLANETS.includes(b.key) || b.key === 'Node').concat(W.get(other, 'ASC') ? [W.get(other, 'ASC')] : []).map((b) => { if (!owner.cusps) return ''; const h = W.houseOf(b.lon, owner.cusps); const rom = [1, 5, 7, 8, 12].includes(h) && ['Sun', 'Moon', 'Venus', 'Mars'].includes(b.key); return `<li class="${rom ? 'ok' : ''}"><b>${nX}’s ${ab(b.key)} ${W.NAME[b.key]} → ${nO}’s ${WK.ord(h)} house</b><br><small>${nX}’s ${W.NAME[b.key]} ${WK.OVERLAY[b.key]} ${nO}’s ${WK.HOUSE[h - 1][0]}.${rom ? ' A classic romance contact.' : ''}<br><b>In daily life:</b> ${LIFE.overlay(b.key, h, nX, nO)}</small></li>`; }).join('');
      const rowsA = W.BODIES.concat(cA.timeKnown ? ['ASC', 'MC'] : []), rowsB = W.BODIES.concat(cB.timeKnown ? ['ASC', 'MC'] : []);
      return `<section class="kgrid2"><div class="panel"><div class="ph"><h3>Synastry bi-wheel</h3><div class="seg sm" role="group" aria-label="Whose houses"><button data-synbase="A" aria-pressed="${baseA}">${nA}’s houses</button><button data-synbase="B" aria-pressed="${!baseA}">${nB}’s houses</button></div></div>
          <div class="chartwrap wheelwrap">${wl}</div>
          <p class="legend"><span class="swc a"></span>Inner: ${baseA ? nA : nB}. <span class="swc b"></span>Outer: ${baseA ? nB : nA}, placed in ${baseA ? nA : nB}’s houses. Lines are aspects between your charts.</p></div>
        <div class="panel"><div class="ph"><h3>Aspect grid</h3></div><p class="muted" style="margin-top:0">Rows: ${nA}. Columns: ${nB}.</p>${WHEEL.grid(rowsA, rowsB, syn, { cross: true })}</div></section>
      <section class="panel"><div class="ph"><h3>Every contact between you (${syn.length})</h3></div><p class="muted" style="margin-top:0">Tightest first. Each line is one planet of ${nA} in aspect to one planet of ${nB}.</p>
        ${syn.map((x) => rd(`${ab(x.a)}${W.ASP[x.type].glyph}︎${ab(x.b)} ${nA}’s ${W.NAME[x.a]} ${W.ASP[x.type].name} ${nB}’s ${W.NAME[x.b]}`, WK.synDetail(x, nA, nB) + (LIFE.syn(x, nA, nB) ? `<p><b>In daily life:</b> ${LIFE.syn(x, nA, nB)}</p>` : ''), false, `orb ${x.orb.toFixed(1)}°`, esc(WK.synGlance(x)))).join('')}</section>
      <section class="panel"><div class="ph"><h3>Each other’s planets in your houses</h3></div>
        ${cA.cusps ? rd(`What ${nB} brings to ${nA}’s life`, `<ul class="tlist">${overlay(cA, cB, nA, nB)}</ul>`, true) : ''}
        ${cB.cusps ? rd(`What ${nA} brings to ${nB}’s life`, `<ul class="tlist">${overlay(cB, cA, nB, nA)}</ul>`) : ''}
        ${!cA.cusps || !cB.cusps ? '<p class="hint">House overlays need both birth times.</p>' : ''}</section>
      <section class="panel"><div class="ph"><h3>Every position, side by side</h3></div>
        <table class="glance two"><thead><tr><th></th><th>${nA}</th><th>${nB}</th></tr></thead><tbody>${W.BODIES.concat(['ASC', 'MC']).map((key) => { const a = W.get(cA, key), b = W.get(cB, key); if (!a && !b) return ''; const cell = (c, x) => (x ? `<b>${esc(posTxt(x))}${x.house && !['ASC', 'MC'].includes(key) ? ' · H' + x.house : ''}</b><span>${esc(WK.glance(c, x).split(' Shows up')[0].replace(/^[^:]+: /, ''))}</span>` : '<span>—</span>'); return `<tr><th>${ab(key)} ${W.NAME[key]}</th><td>${cell(cA, a)}</td><td>${cell(cB, b)}</td></tr>`; }).join('')}</tbody></table>${DISCLAIM}</section>`;
    },
    compositeHtml(co, nA, nB) {
      const asp = co.aspects.filter((a) => W.PLANETS.includes(a.a) && (W.PLANETS.includes(a.b) || ['ASC', 'MC'].includes(a.b)));
      return `<section class="kgrid2"><div class="panel"><div class="ph"><h3>Composite chart</h3></div>
          <div class="chartwrap wheelwrap">${WHEEL.svg({ base: co, inner: co.bodies.filter((b) => b.key !== 'Lilith'), aspects: asp, innerColor: '#FFB547', label: 'Composite chart' })}</div>
          <p class="legend">The composite chart is built from the midpoints between ${nA}’s and ${nB}’s planets. It describes the relationship as a third entity — what you create together.</p></div>
        <div class="panel"><div class="ph"><h3>The relationship at a glance</h3></div><table class="glance"><tbody>${['Sun', 'Moon', 'ASC', 'Venus', 'Mars', 'Mercury', 'Saturn'].map((key) => { const b = W.get(co, key); return b ? `<tr><th>${ab(key)} ${W.NAME[key]}</th><td><b>${esc(W.SIGNS[b.sign])}${b.house && key !== 'ASC' ? ' · H' + b.house : ''}</b><span>${esc(WK.glance(co, b, 'composite'))}</span></td></tr>` : ''; }).join('')}</tbody></table>
          ${this.balanceHtml(co)}</div></section>
      <section class="panel"><div class="ph"><h3>Every composite position</h3></div>
        ${W.all(co).map((b) => rd(`${ab(b.key)}${W.NAME[b.key]}`, WK.placement(co, b).replace('<b>What it is.</b>', '<b>In a composite chart</b> this point describes the relationship. In general,') , false, `${esc(posTxt(b))}${b.house && !['ASC', 'MC'].includes(b.key) ? ' · house ' + b.house : ''}`, esc(WK.glance(co, b, 'composite')))).join('')}</section>
      <section class="panel"><div class="ph"><h3>Composite aspects (${asp.length})</h3></div>
        ${asp.map((a) => rd(`${ab(a.a)}${W.ASP[a.type].glyph}︎${ab(a.b)} ${W.NAME[a.a]} ${W.ASP[a.type].name} ${W.NAME[a.b]}`, WK.aspectDetail(a, 'composite'), false, `orb ${a.orb.toFixed(1)}°`, esc(WK.aspectGlance(a, 'composite')))).join('')}
        ${co.patterns.length ? `<p><b>Patterns:</b> ${co.patterns.map((p) => `${p.type} (${p.keys.map((x) => W.NAME[x]).join(', ')}) — ${WK.PATTERN[p.type].split('. ')[0]}.`).join(' ')}</p>` : ''}${DISCLAIM}</section>`;
    },
    davisonHtml(dv, nA, nB) {
      return `<section class="kgrid2"><div class="panel"><div class="ph"><h3>Davison relationship chart</h3></div>
          <div class="chartwrap wheelwrap">${WHEEL.svg({ base: dv, inner: dv.bodies.filter((b) => b.key !== 'Lilith'), aspects: dv.aspects.filter((a) => W.PLANETS.includes(a.a) && W.PLANETS.includes(a.b)), innerColor: '#9B7BFF', label: 'Davison chart' })}</div>
          <p class="legend">The Davison chart is a real moment: halfway in time between your births (${fmtD(dv.utcMs)}) and halfway in space (${dv.lat.toFixed(2)}°, ${dv.lon.toFixed(2)}°). Like the composite, it describes the relationship itself — many astrologers read it as the couple’s “birth chart”.</p></div>
        <div class="panel"><div class="ph"><h3>At a glance</h3></div><table class="glance"><tbody>${['Sun', 'Moon', 'ASC', 'Venus', 'Mars', 'Mercury', 'Jupiter', 'Saturn'].map((key) => { const b = W.get(dv, key); return b ? `<tr><th>${ab(key)} ${W.NAME[key]}</th><td><b>${esc(W.SIGNS[b.sign])}${b.house && key !== 'ASC' ? ' · H' + b.house : ''}</b><span>${esc(WK.glance(dv, b, 'composite'))}</span></td></tr>` : ''; }).join('')}</tbody></table></div></section>
      <section class="panel"><div class="ph"><h3>Every Davison position</h3></div>
        ${W.all(dv).map((b) => rd(`${ab(b.key)}${W.NAME[b.key]}`, WK.placement(dv, b), false, `${esc(posTxt(b))}${b.house && !['ASC', 'MC'].includes(b.key) ? ' · house ' + b.house : ''}`, esc(WK.glance(dv, b, 'composite')))).join('')}</section>
      <section class="panel"><div class="ph"><h3>Davison aspects</h3></div>
        ${dv.aspects.filter((a) => a.a !== 'Fortune' && a.b !== 'Fortune').map((a) => rd(`${ab(a.a)}${W.ASP[a.type].glyph}︎${ab(a.b)} ${W.NAME[a.a]} ${W.ASP[a.type].name} ${W.NAME[a.b]}`, WK.aspectDetail(a, 'composite'), false, `orb ${a.orb.toFixed(1)}°`, esc(WK.aspectGlance(a, 'composite')))).join('')}${DISCLAIM}</section>`;
    },
    bindW(box) {
      const on = (sel, fn) => $$(sel, box).forEach((b) => (b.onclick = (e) => fn(b, e)));
      on('[data-psub]', (b) => { this.psub = b.dataset.psub; this.selB = ''; this.draw(); });
      on('[data-csub]', (b) => { this.csub = b.dataset.csub; this.draw(); });
      on('[data-fc]', (b) => { this.fc = b.dataset.fc; this.draw(); });
      on('[data-synbase]', (b) => { this.synBase = b.dataset.synbase; this.draw(); });
      on('[data-bsel]', (b) => { this.selB = b.dataset.bsel; this.draw(); if (this.selB) { const p = $('#bsel'); p && p.scrollIntoView({ block: 'nearest' }); } });
      $$('tr[data-bsel]', box).forEach((r) => r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); r.click(); } }));
      const wh = $('#wheel', box);
      if (wh) wh.onclick = (e) => { const t = e.target.closest('[data-b]'); if (t) { this.selB = t.dataset.b; this.draw(); } };
      on('[data-wdl]', () => { const k = kundaliOf(this.tab); if (k) wOpenDownload(k); });
      on('[data-wlearn]', () => wOpenLearnMore());
      on('[data-wapply]', async () => {
        const k = kundaliOf(this.tab); if (!k) return;
        const { shared, ...rest } = k;
        try { await saveKundali({ ...rest, settings: { ...(rest.settings || {}), wHouses: $('#wHo', box).value, wNode: $('#wNo', box).value } }, shared); this.cache = {}; toast('Settings applied'); } catch (e) { toast(errText(e), 'err'); }
      });
    },
  };
  return { day, coupleDay, transitHits, WV };
})();

function wOpenLearnMore() {
  openModal({
    title: 'How Vice Space calculates your chart', wide: true,
    body: `<div class="learn">
      <p>Astrology is a traditional interpretive practice, not a verified science. Vice Space calculates the <b>chart data</b> — where the Sun, Moon and planets were — with standard astronomy. The meanings are classical Western interpretations, offered for reflection.</p>
      <h4>1. Your moment of birth</h4><p>Your local clock time and birthplace become one exact instant in Universal Time, using the official time-zone database and the rules in force on your birth date — including daylight saving.</p>
      <h4>2. Where everything was</h4><p>Positions of the Sun, Moon and all planets out to Pluto are computed with Astronomy Engine (checked against NASA JPL data) when available, otherwise with Vice Space’s own engine. Both agree to a fraction of a degree.</p>
      <h4>3. Tropical zodiac</h4><p>Western astrology measures signs from the spring equinox: 0° Aries is where the Sun is on the first day of spring.</p>
      <h4>4. Ascendant, Midheaven and houses</h4><p>The Ascendant is the degree rising in the east at your birthplace; the Midheaven is the highest point. Houses use the Placidus system by default (it divides the time each degree takes to rise). Near the poles, where Placidus fails, equal houses are used.</p>
      <h4>5. Aspects</h4><p>Aspects are angles between planets: conjunction 0°, sextile 60°, square 90°, trine 120°, opposition 180°, plus minor ones. Each has an allowed “orb” — wider for the Sun and Moon.</p>
      <h4>6. Relationship charts</h4><p><b>Synastry</b> compares two charts directly. The <b>composite</b> uses the midpoints between your planets. The <b>Davison</b> chart is cast for the moment and place halfway between your births.</p>
      <h4>7. Forecasts</h4><p>Daily to yearly forecasts come from <b>transits</b> — where the planets are now relative to your chart — plus New and Full Moons, eclipses, retrogrades, <b>secondary progressions</b> (one day after birth for each year of life) and your <b>solar return</b>.</p>
    </div>`,
  });
}


/* ---------- European downloads ---------- */
async function wChartPng(k, style, size = 1200) {
  const ch = W.fromDoc(k);
  const fontCss = window.VS_GLYPHS ? `<style>@font-face{font-family:'Vice Glyphs';src:url(data:font/woff;base64,${window.VS_GLYPHS}) format('woff')}</style>` : '';
  const svg = WHEEL.svg({ base: ch, inner: ch.bodies, aspects: ch.aspects.filter((a) => W.PLANETS.includes(a.a) && W.PLANETS.includes(a.b)), theme: 'light', label: 'Natal chart' })
    .replace('<svg ', `<svg width="${size}" height="${size}" `).replace(/(<svg[^>]*>)/, `$1${fontCss}`);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const g = c.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, size, size); g.drawImage(img, 0, 0, size, size);
  return c;
}
function wOpenDownload(k, style) {
  const base = (k.name || nameOf(k.seat) || 'chart').replace(/[^\w-]+/g, '_');
  openModal({
    title: 'Download chart',
    body: `<p style="margin-top:0">Save a copy of the calculated chart.</p><div class="row"><button class="btn" data-png>${icon('image')}Chart wheel (PNG)</button><button class="btn ghost" data-pdf>${icon('pdf')}Full report (PDF)</button></div>`,
    onMount: (m, close) => {
      $('[data-png]', m).onclick = async () => { try { const c = await wChartPng(k, style); const b = await new Promise((r) => c.toBlob(r, 'image/png')); if (await saveFile(base + '-natal-chart.png', b)) toast('Chart image saved'); close(); } catch (e) { console.error(e); toast('Couldn’t make the image.', 'err'); } };
      $('[data-pdf]', m).onclick = async () => { try { const b = await wChartPdf(k, style); if (await saveFile(base + '-natal-chart.pdf', b)) toast('Report saved'); close(); } catch (e) { console.error(e); toast('Couldn’t make the PDF.', 'err'); } };
    },
  });
}
async function wChartPdf(k, style) {
  const c = await wChartPng(k, style, 900);
  const jpg = new Uint8Array(await (await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92))).arrayBuffer());
  const ch = W.fromDoc(k), bi = k.birth_input, tz = k.timezone;
  const L = [];
  L.push(['h', `${k.name || nameOf(k.seat)} - Natal chart`]);
  L.push(['p', `Born ${fmtBorn(bi)} - ${k.birthplace.label}`]);
  L.push(['p', `${tz.id}, ${tz.offsetLabel.replace('−', '-')} at birth - ${k.utc_birth_instant.replace('T', ' ').slice(0, 16)} UTC - ${k.birthplace.lat.toFixed(4)}, ${k.birthplace.lon.toFixed(4)}`]);
  L.push(['p', `Calculated by Vice Space. Tropical zodiac, ${ch.sys || 'no'} houses, ${ch.settings.node} node.`]);
  L.push(['img']);
  L.push(['h2', 'Planets and points']);
  for (const b of W.all(ch)) L.push(['m', `${W.NAME[b.key].padEnd(16)} ${W.SIGNS[b.sign].padEnd(12)} ${W.dms(b.deg).padEnd(8)} ${b.house && !['ASC', 'MC'].includes(b.key) ? 'house ' + b.house : ''}${b.retro && W.PLANETS.includes(b.key) ? '  R' : ''}`]);
  L.push(['h2', 'What it means']);
  for (const b of W.all(ch)) L.push(['p', `${W.NAME[b.key]}: ${WK.glance(ch, b)}`]);
  L.push(['h2', 'Aspects']);
  for (const a of ch.aspects.filter((x) => x.a !== 'Fortune' && x.b !== 'Fortune')) L.push(['p', `${W.NAME[a.a]} ${W.ASP[a.type].name} ${W.NAME[a.b]} (${a.orb.toFixed(1)}): ${WK.aspectGlance(a)}`]);
  L.push(['s', 'Positions are calculated chart data. Interpretations are traditional, not scientific forecasts.']);
  return makePdf(L, jpg, c.width, c.height);
}
