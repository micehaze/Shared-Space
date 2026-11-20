/* ============================================================
   European chart wheel (SVG) + aspect grid
   ============================================================ */
const WHEEL = (() => {
  const EL_COL = ['#FF5F7A', '#FFB547', '#63E6FF', '#9B7BFF'];
  const ASP_COL = { soft: '#63E6FF', hard: '#FF3EA5', adjust: '#FFB547', conj: '#FFE3F2' };
  const THEMES = {
    dark: { line: 'rgba(185,171,223,.55)', strong: '#FFB547', text: '#FFFFFF', dim: '#B9ABDF', ringA: 0.22, bg: 'none', inner: '#FF8CC6', outer: '#63E6FF', transit: '#FFB547', circle: 'rgba(11,7,32,.55)' },
    light: { line: '#9A88C8', strong: '#C2570A', text: '#1A1030', dim: '#5A4A80', ringA: 0.28, bg: '#FFFFFF', inner: '#B0105E', outer: '#1A57C9', transit: '#C2570A', circle: '#FFF7FB' },
  };
  const f = (n) => n.toFixed(1);
  const FONT = `font-family="'Vice Glyphs','Vice Sans',sans-serif"`;
  function spread(items, minSep) {
    const xs = items.map((it) => ({ ...it, p: it.rel }));
    xs.sort((a, b) => a.p - b.p);
    for (let it = 0; it < 40; it++) {
      let moved = false;
      for (let i = 0; i < xs.length; i++) {
        const a = xs[i], b = xs[(i + 1) % xs.length];
        let d = b.p - a.p; if (i === xs.length - 1) d += 360;
        if (xs.length > 1 && d < minSep) { const push = (minSep - d) / 2 + 0.01; a.p -= push; b.p += push; moved = true; }
      }
      if (!moved) break;
    }
    return xs;
  }
  /*
    opts: { base: chart (houses/rotation), inner: bodies[], outer: bodies[] | null,
            aspects: [{a, b, type, orb, lim, outer?}], theme, innerColor, outerColor, sel }
  */
  function svg(opts) {
    const T = THEMES[opts.theme || 'dark'];
    const base = opts.base;
    const rot = base && base.asc != null ? base.asc : 0;
    const bi = !!opts.outer;
    const R0 = 206, R1 = 180, Rsep = bi ? 146 : null, Ra = bi ? 86 : 96;
    const pt = (lon, r) => { const a = ((180 + lon - rot) * Math.PI) / 180; return [r * Math.cos(a), -r * Math.sin(a)]; };
    let s = `<circle r="${R0}" fill="${T.circle}" stroke="${T.line}" stroke-width="1.2"/>`;
    // zodiac ring
    for (let i = 0; i < 12; i++) {
      const a0 = i * 30, a1 = a0 + 30;
      const [x1, y1] = pt(a0, R0), [x2, y2] = pt(a1, R0), [x3, y3] = pt(a1, R1), [x4, y4] = pt(a0, R1);
      s += `<path d="M${f(x1)},${f(y1)} A${R0},${R0} 0 0 0 ${f(x2)},${f(y2)} L${f(x3)},${f(y3)} A${R1},${R1} 0 0 1 ${f(x4)},${f(y4)}Z" fill="${EL_COL[i % 4]}" fill-opacity="${T.ringA}" stroke="${T.line}" stroke-width=".8"/>`;
      const [tx, ty] = pt(a0 + 15, (R0 + R1) / 2);
      s += `<text x="${f(tx)}" y="${f(ty)}" dy=".35em" text-anchor="middle" font-size="15" fill="${EL_COL[i % 4]}" ${FONT}>${W.SG[i]}</text>`;
    }
    for (let d = 0; d < 360; d += 1) { const len = d % 10 === 0 ? 7 : d % 5 === 0 ? 4.5 : 2.2; const [a, b] = pt(d, R1), [c, e] = pt(d, R1 - len); s += `<line x1="${f(a)}" y1="${f(b)}" x2="${f(c)}" y2="${f(e)}" stroke="${T.line}" stroke-width="${d % 10 ? 0.5 : 0.8}"/>`; }
    s += `<circle r="${R1}" fill="none" stroke="${T.line}" stroke-width="1"/>`;
    if (bi) s += `<circle r="${Rsep}" fill="none" stroke="${T.line}" stroke-width=".8" stroke-dasharray="2 3"/>`;
    s += `<circle r="${Ra}" fill="none" stroke="${T.line}" stroke-width="1"/>`;
    // houses
    if (base && base.cusps) {
      base.cusps.forEach((c, i) => {
        const ang = i % 3 === 0;
        const [a, b] = pt(c, ang ? R1 : (bi ? Rsep : R1)), [x, y] = pt(c, Ra);
        s += `<line x1="${f(a)}" y1="${f(b)}" x2="${f(x)}" y2="${f(y)}" stroke="${ang ? T.strong : T.line}" stroke-width="${ang ? 1.6 : 0.8}"/>`;
        const nx = base.cusps[(i + 1) % 12]; const midL = c + Astro.norm(nx - c) / 2;
        const [hx, hy] = pt(midL, Ra + 9);
        s += `<text x="${f(hx)}" y="${f(hy)}" dy=".35em" text-anchor="middle" font-size="8.5" fill="${T.dim}" font-family="'Vice Sans',sans-serif">${i + 1}</text>`;
      });
      for (const [lon, lab] of [[base.asc, 'AC'], [base.mc, 'MC'], [base.asc + 180, 'DC'], [base.mc + 180, 'IC']]) {
        const [x, y] = pt(lon + 4, R1 - 13);
        s += `<text x="${f(x)}" y="${f(y)}" dy=".35em" text-anchor="middle" font-size="8.5" font-weight="700" fill="${T.strong}" font-family="'Vice Sans',sans-serif">${lab}</text>`;
      }
    }
    // aspect lines
    for (const a of opts.aspects || []) {
      const A = opts.inner.find((b) => b.key === a.a), Bb = (a.outer ? opts.outer : opts.inner).find((b) => b.key === a.b);
      if (!A || !Bb || a.type === 'conj') continue;
      const asp = W.ASP[a.type];
      const [x1, y1] = pt(A.lon, Ra), [x2, y2] = pt(Bb.lon, Ra);
      const op = 0.35 + 0.65 * (1 - a.orb / (a.lim || 8));
      s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${ASP_COL[asp.kind]}" stroke-width="${asp.minor ? 0.7 : 1.3}" stroke-opacity="${f(op)}"${asp.minor || asp.kind === 'adjust' ? ' stroke-dasharray="3 2"' : ''}><title>${W.NAME[a.a]} ${asp.name} ${W.NAME[a.b]}</title></line>`;
    }
    // bodies
    const ring = (list, rGlyph, rTickFrom, rTickTo, col, cls) => {
      const items = spread(list.map((b) => ({ b, rel: Astro.norm(b.lon - rot) })), bi ? 8.5 : 7.2);
      let out = '';
      for (const it of items) {
        const lonDraw = it.p + rot;
        const [tx1, ty1] = pt(it.b.lon, rTickFrom), [tx2, ty2] = pt(it.b.lon, rTickTo);
        const [gx, gy] = pt(lonDraw, rGlyph), [dx, dy] = pt(lonDraw, rGlyph - (bi ? 13 : 17));
        const on = opts.sel && opts.sel === it.b.key;
        const g = W.GLYPH[it.b.key] + (W.GLYPH[it.b.key].length === 1 ? '︎' : '');
        out += `<g class="wb ${cls}" data-b="${it.b.key}" style="cursor:pointer"><title>${W.NAME[it.b.key]} ${W.SIGNS[it.b.sign]} ${W.dms(it.b.deg)}${it.b.retro ? ' R' : ''}</title>
          <line x1="${f(tx1)}" y1="${f(ty1)}" x2="${f(tx2)}" y2="${f(ty2)}" stroke="${col}" stroke-width="1.2"/>
          ${on ? `<rect x="${f(gx - 10)}" y="${f(gy - 10)}" width="20" height="20" fill="none" stroke="${T.strong}" stroke-width="1.4"/>` : ''}
          <text x="${f(gx)}" y="${f(gy)}" dy=".36em" text-anchor="middle" font-size="${['ASC', 'MC'].includes(it.b.key) ? 9 : bi ? 14 : 16}" font-weight="${['ASC', 'MC'].includes(it.b.key) ? 700 : 400}" fill="${col}" ${FONT}>${g}</text>
          ${bi ? '' : `<text x="${f(dx)}" y="${f(dy)}" dy=".35em" text-anchor="middle" font-size="7.5" fill="${T.dim}" font-family="'Vice Sans',sans-serif">${Math.floor(it.b.deg)}°${it.b.retro ? '℞' : ''}</text>`}</g>`;
      }
      return out;
    };
    const ic = opts.innerColor || T.inner, oc = opts.outerColor || T.outer;
    if (bi) {
      s += ring(opts.inner, 120, Rsep, Rsep - 6, ic, 'in');
      s += ring(opts.outer, 163, R1, R1 - 6, oc, 'out');
    } else s += ring(opts.inner, 150, R1, R1 - 9, ic, 'in');
    const bg = T.bg !== 'none' ? `<rect x="-215" y="-215" width="430" height="430" fill="${T.bg}"/>` : '';
    return `<svg class="wheel-svg" viewBox="-212 -212 424 424" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(opts.label || 'Chart wheel')}">${bg}${s}</svg>`;
  }
  /* aspect grid: natal = triangle, cross = full A×B grid */
  function grid(rows, cols, aspects, opts = {}) {
    const find = (r, c) => aspects.find((a) => (a.a === r && a.b === c) || (!opts.cross && a.a === c && a.b === r));
    const g = (k) => W.GLYPH[k] + (W.GLYPH[k].length === 1 ? '︎' : '');
    let h = `<table class="agrid${opts.cross ? ' cross' : ''}"><thead><tr><th></th>${(opts.cross ? cols : cols.slice(0, -1)).map((c) => `<th title="${W.NAME[c]}" class="${opts.cross ? 'cb' : ''}">${g(c)}</th>`).join('')}</tr></thead><tbody>`;
    rows.forEach((r, i) => {
      if (!opts.cross && i === 0) return;
      h += `<tr><th title="${W.NAME[r]}" class="${opts.cross ? 'ca' : ''}">${g(r)}</th>`;
      (opts.cross ? cols : cols.slice(0, i)).forEach((c) => {
        const a = find(r, c);
        h += a ? `<td class="k-${W.ASP[a.type].kind}" title="${W.NAME[r]} ${W.ASP[a.type].name} ${W.NAME[c]} (${a.orb.toFixed(1)}°)">${W.ASP[a.type].glyph}${W.ASP[a.type].glyph.length === 1 ? '︎' : ''}<small>${Math.round(a.orb)}</small></td>` : '<td></td>';
      });
      h += '</tr>';
    });
    return h + '</tbody></table>';
  }
  return { svg, grid, EL_COL };
})();
