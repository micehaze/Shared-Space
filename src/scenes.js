/* ============================================================
   Five section backdrops — one drawing language (flat silhouettes,
   striped suns, the same palm, same 400×800 frame), five moments:
   Ocean Drive afternoon · sunset over water · dusk coastline ·
   downtown night from below · magenta skyline.
   ============================================================ */
const SCENES = (() => {
  const PALM_PATHS = `<path d="M84 258c-2-60 -4-120 4-176l7 1c-7 56-6 115-4 175z"/><path d="M90 84c-16-24-46-34-84-26 30-2 58 8 82 30z"/><path d="M90 84c-4-30-24-54-56-66 26 16 44 38 52 68z"/><path d="M91 83c10-28 32-46 64-50-28 10-48 28-60 54z"/><path d="M92 85c24-14 50-12 68 4-22-8-44-6-66 4z"/><path d="M90 86c-22-6-50 6-70 30 22-18 46-26 70-26z"/><path d="M92 86c20 6 38 26 44 52-10-22-26-38-46-48z"/><path d="M89 84c-2-26 6-50 24-70-12 22-18 44-20 70z"/>`;
  const f = (n) => n.toFixed(1);
  const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const grad = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('')}</linearGradient>`;
  // palm: trunk base at (x, y), height h; lean in degrees; flip mirrors the crown
  const palm = (id, x, y, h, lean = 0, flip = false, extra = '') => {
    const w = h * 0.62;
    return `<g transform="translate(${f(x)} ${f(y)}) rotate(${lean}) scale(${flip ? -1 : 1} 1)"${extra}><use href="#${id}" x="${f(-w * 0.56)}" y="${f(-h)}" width="${f(w)}" height="${f(h)}"/></g>`;
  };
  // striped retro sun (gaps widen towards the bottom)
  const sun = (id, cx, cy, r, fill, n = 6) => {
    let gaps = '';
    for (let i = 0; i < n; i++) { const t = i / n; const y = cy + r * (0.05 + t * 0.9); gaps += `<rect x="${f(cx - r)}" y="${f(y)}" width="${f(2 * r)}" height="${f(1.2 + t * r * 0.11)}" fill="#000"/>`; }
    return `<mask id="${id}m"><rect x="${f(cx - r)}" y="${f(cy - r)}" width="${f(2 * r)}" height="${f(2 * r)}" fill="#fff"/>${gaps}</mask><circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" mask="url(#${id}m)"/>`;
  };
  const sparkle = (x, y, s, c, op = 1) => `<path d="M${f(x)} ${f(y - s)}Q${f(x + s * 0.14)} ${f(y - s * 0.14)} ${f(x + s)} ${f(y)}Q${f(x + s * 0.14)} ${f(y + s * 0.14)} ${f(x)} ${f(y + s)}Q${f(x - s * 0.14)} ${f(y + s * 0.14)} ${f(x - s)} ${f(y)}Q${f(x - s * 0.14)} ${f(y - s * 0.14)} ${f(x)} ${f(y - s)}Z" fill="${c}" opacity="${op}"/>`;
  function skyline(r, x0, x1, base, hMin, hMax, opts = {}) {
    let b = '', w = '', x = x0;
    while (x < x1) {
      const bw = (opts.wMin || 10) + r() * (opts.wVar || 18), h = hMin + Math.pow(r(), 1.6) * (hMax - hMin);
      const top = base - h;
      b += `<rect x="${f(x)}" y="${f(top)}" width="${f(bw)}" height="${f(h + 2)}"/>`;
      if (opts.crown && h > hMax * 0.62) b += `<rect x="${f(x + bw * 0.25)}" y="${f(top - 8)}" width="${f(bw * 0.5)}" height="9"/><rect x="${f(x + bw * 0.45)}" y="${f(top - 20)}" width="1.6" height="13"/>`;
      if (opts.win) for (let wy = top + 4; wy < base - 3; wy += 5) for (let wx = x + 2; wx < x + bw - 2; wx += 3.6) if (r() > opts.winP) w += `<rect x="${f(wx)}" y="${f(wy)}" width="1.5" height="1.8"/>`;
      x += bw + (opts.gap || 1) + r() * 2;
    }
    return { b, w };
  }
  const frame = (key, defs, body) => `<svg class="scene-svg" data-scene="${key}" viewBox="-400 0 1200 800" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><symbol id="${key}P" viewBox="0 0 160 260">${PALM_PATHS}</symbol>${defs}</defs>${body}</svg>`;

  /* 1 · Ocean Drive afternoon — inbox */
  function day() {
    const r = rng(11), H = 588;
    const sky = grad('dyS', [[0, '#3C9FDB'], [0.3, '#76C3EC'], [0.52, '#BFE2F1'], [0.64, '#FFD0DE'], [0.735, '#FFA9C8']]);
    const sunG = grad('dySun', [[0, '#FF9CC6'], [1, '#FF4F93']]);
    const ground = grad('dyG', [[0, '#F59BBE'], [0.12, '#B86AA8'], [0.5, '#4A2F7A'], [1, '#1A1036']]);
    // pastel deco blocks
    const COLS = ['#FFFFFF', '#FFE3EE', '#D6F3EE', '#FFF0D8', '#E9E1FF'];
    let deco = '', x = -406;
    while (x < 806) {
      const w = 26 + r() * 34, h = 34 + r() * 46, c = COLS[Math.floor(r() * COLS.length)], top = H - h;
      deco += `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h + 2)}" fill="${c}"/>`;
      if (r() > 0.45) deco += `<rect x="${f(x + w * 0.3)}" y="${f(top - 10)}" width="${f(w * 0.4)}" height="11" fill="${c}"/><rect x="${f(x + w * 0.42)}" y="${f(top - 18)}" width="${f(w * 0.16)}" height="9" fill="${c}"/>`;
      for (let wy = top + 7; wy < H - 6; wy += 9) deco += `<rect x="${f(x + 4)}" y="${f(wy)}" width="${f(w - 8)}" height="3" fill="#8FD3EE" opacity=".8"/>`;
      deco += `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="2" fill="#FF7EB6" opacity=".55"/>`;
      x += w + 2 + r() * 6;
    }
    const far = [-330, -250, -120, -40, 40, 120, 260, 340, 450, 540, 620, 730].map((px, i) => palm('dyP', px, H + 2, 110 + i * 7, (i % 2 ? 4 : -4), i % 2 === 1)).join('');
    const near = palm('dyP', -350, 820, 600, -4) + palm('dyP', -250, 836, 460, 6, true) + palm('dyP', 660, 830, 470, -5) + palm('dyP', 760, 820, 620, 5, true) + palm('dyP', 34, 820, 560, -6) + palm('dyP', 86, 830, 430, 5, true) + palm('dyP', 372, 820, 580, 6, true) + palm('dyP', 318, 836, 420, -4);
    return frame('dy', sky + sunG + ground, `<rect x="-400" width="1200" height="800" fill="url(#dyS)"/>
      <g fill="#fff" opacity=".85"><ellipse cx="70" cy="190" rx="46" ry="10"/><ellipse cx="96" cy="182" rx="30" ry="9"/><ellipse cx="318" cy="248" rx="54" ry="9"/><ellipse cx="290" cy="242" rx="26" ry="8"/><ellipse cx="-220" cy="300" rx="70" ry="11"/><ellipse cx="-190" cy="292" rx="34" ry="9"/><ellipse cx="560" cy="160" rx="60" ry="10"/><ellipse cx="600" cy="152" rx="30" ry="9"/><ellipse cx="700" cy="330" rx="50" ry="9"/></g>
      ${sun('dySn', 200, 432, 100, 'url(#dySun)', 7)}
      <rect x="-400" y="${H - 1}" width="1200" height="${800 - H + 1}" fill="url(#dyG)"/>
      ${deco}
      <rect x="-400" y="${H}" width="1200" height="7" fill="#2FB3A0"/>
      <g fill="#14A5A2" opacity=".9">${far}</g>
      <g fill="#0B6E78">${near}</g>`);
  }

  /* 2 · Sunset over water — gallery */
  function sunset() {
    const H = 500;
    const sky = grad('ssS', [[0, '#2A0E55'], [0.25, '#6A1B7A'], [0.44, '#C22A7E'], [0.53, '#F2457F'], [0.6, '#FF7A52'], [0.625, '#FF9A5C']]);
    const sea = grad('ssW', [[0, '#FFA25A'], [0.06, '#F0607A'], [0.35, '#8A2276'], [1, '#1E0834']]);
    const sunG = grad('ssSun', [[0, '#FFF4B8'], [0.6, '#FFB25E'], [1, '#FF5F7A']]);
    let refl = '', shim = '';
    for (let i = 0; i < 16; i++) { const y = H + 6 + i * i * 1.25, w = 150 - i * 7.5; refl += `<rect x="${f(200 - w / 2)}" y="${f(y)}" width="${f(w)}" height="${f(2 + i * 0.35)}" fill="#FFD48A" opacity="${f(0.85 - i * 0.045)}"/>`; }
    const r = rng(23);
    for (let i = 0; i < 110; i++) { const y = H + 10 + r() * 290, x = -400 + r() * 1200, w = 10 + r() * 50; shim += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="1.2" fill="#FFB3C8" opacity="${f(0.15 + r() * 0.35)}"/>`; }
    const trees = palm('ssP', -380, 830, 640, 18) + palm('ssP', 780, 830, 620, -18, true) + palm('ssP', 10, 830, 560, 16) + palm('ssP', 396, 830, 520, -18, true);
    const shore = palm('ssP', -330, H + 2, 240, 16) + palm('ssP', -270, H + 2, 170, 26, true) + palm('ssP', -200, H + 2, 120, 8) + palm('ssP', 600, H + 2, 130, -8, true) + palm('ssP', 690, H + 2, 220, -18) + palm('ssP', 760, H + 2, 160, -8, true) + palm('ssP', 30, H + 2, 210, 14) + palm('ssP', 96, H + 2, 110, 6, true) + palm('ssP', 316, H + 2, 120, -10, true) + palm('ssP', 352, H + 2, 178, -16) + palm('ssP', 384, H + 2, 140, -6, true);
    return frame('ss', sky + sea + sunG, `<rect x="-400" width="1200" height="${H}" fill="url(#ssS)"/>
      <g fill="#FFB0C8" opacity=".35"><rect x="20" y="300" width="140" height="3"/><rect x="250" y="330" width="120" height="2"/><rect x="60" y="380" width="90" height="2"/><rect x="-300" y="350" width="180" height="3"/><rect x="480" y="280" width="200" height="3"/><rect x="560" y="400" width="140" height="2"/></g>
      <svg x="-400" y="0" width="1200" height="${H}" viewBox="-400 0 1200 ${H}" overflow="hidden">${sun('ssSn', 200, H, 92, 'url(#ssSun)', 6)}</svg>
      <rect x="-400" y="${H}" width="1200" height="${800 - H}" fill="url(#ssW)"/>
      ${refl}${shim}
      <g fill="#3A0A44" opacity=".42" transform="translate(0 ${2 * H}) scale(1 -1)">${shore}</g>
      <path d="M-410 ${H + 3} L150 ${H + 3} Q170 ${H - 1} 150 ${H - 4} L-410 ${H - 6}Z M810 ${H + 3} L290 ${H + 3} Q272 ${H - 1} 292 ${H - 4} L810 ${H - 7}Z" fill="#2A0630"/>
      <g fill="#2A0630">${shore}</g>
      <g fill="#1A0420">${trees}</g>`);
  }

  /* 3 · Dusk coastline — dates */
  function coast() {
    const H = 516, r = rng(37);
    const sky = grad('csS', [[0, '#26296F'], [0.24, '#4F449C'], [0.44, '#9C76C2'], [0.57, '#EAA3C8'], [0.645, '#FFC9B2']]);
    const sea = grad('csW', [[0, '#8D7CC4'], [0.18, '#5550A2'], [0.6, '#2A2868'], [1, '#110F33']]);
    const cloud = (cx, cy, s, c, hi) => `<g><ellipse cx="${cx}" cy="${cy}" rx="${48 * s}" ry="${13 * s}" fill="${c}"/><ellipse cx="${cx - 20 * s}" cy="${cy - 9 * s}" rx="${22 * s}" ry="${14 * s}" fill="${c}"/><ellipse cx="${cx + 12 * s}" cy="${cy - 13 * s}" rx="${26 * s}" ry="${17 * s}" fill="${c}"/><ellipse cx="${cx + 8 * s}" cy="${cy - 22 * s}" rx="${16 * s}" ry="${8 * s}" fill="${hi}" opacity=".7"/></g>`;
    const clouds = cloud(80, 150, 1.4, '#C08AD0', '#FFD3E6') + cloud(300, 110, 1.1, '#B07CCB', '#FFD3E6') + cloud(250, 300, 1.6, '#F2A7CB', '#FFE6EF') + cloud(70, 360, 1.1, '#F5B3CC', '#FFE6EF') + cloud(340, 410, 0.9, '#FFC1C6', '#FFF0F0') + cloud(-240, 200, 1.5, '#B585CE', '#FFD3E6') + cloud(-120, 380, 1.2, '#F3ADCB', '#FFE6EF') + cloud(560, 240, 1.4, '#C08AD0', '#FFD3E6') + cloud(700, 380, 1.2, '#F5B3CC', '#FFE6EF');
    const topL = (x) => { const u = (190 - x) / 600; return H + 6 - (100 * Math.sqrt(u) + 22 * Math.sin(u * 9)); };
    const topR = (x) => { const u = (x - 222) / 588; return H + 6 - (120 * Math.sqrt(u) + 20 * Math.sin(u * 7 + 1)); };
    const hill = (a, b, top) => { let d = `M${a} ${H + 20}`; for (let x = a; a < b ? x <= b : x >= b; x += a < b ? 8 : -8) d += ` L${f(x)} ${f(top(x))}`; return d + ` L${b} ${H + 20}Z`; };
    const hillL = hill(-410, 190, topL), hillR = hill(810, 222, topR);
    let lights = '';
    for (let i = 0; i < 520; i++) {
      const left = r() < 0.5, x = left ? -410 + r() * 600 : 222 + r() * 588;
      const topY = left ? topL(x) : topR(x);
      const y = topY + 4 + r() * (H + 6 - topY);
      if (y > H + 4) continue;
      lights += `<rect x="${f(x)}" y="${f(y)}" width="1.4" height="1.4" fill="${r() > 0.3 ? '#FFD38A' : '#FFFFFF'}" opacity="${f(0.55 + r() * 0.45)}"/>`;
    }
    let shim = '';
    for (let i = 0; i < 100; i++) { const y = H + 12 + r() * 270, x = -400 + r() * 1200; shim += `<rect x="${f(x)}" y="${f(y)}" width="${f(8 + r() * 40)}" height="1.1" fill="#F6B8D8" opacity="${f(0.15 + r() * 0.35)}"/>`; }
    const trees = palm('csP', -340, 826, 640, 4, true) + palm('csP', -260, 836, 420, -8) + palm('csP', 700, 830, 560, -4) + palm('csP', 30, 826, 600, -5) + palm('csP', 88, 836, 420, 9, true) + palm('csP', 374, 824, 520, 5, true);
    return frame('cs', sky + sea, `<rect x="-400" width="1200" height="${H}" fill="url(#csS)"/>${clouds}
      <rect x="-400" y="${H}" width="1200" height="${800 - H}" fill="url(#csW)"/>${shim}
      <path d="${hillR}" fill="#2D2A6C"/><path d="${hillL}" fill="#24215C"/>${lights}
      <path d="M-410 ${H + 30} Q-200 ${H + 6} -10 ${H + 4} Q120 ${H + 34} 230 ${H + 22} Q330 ${H + 12} 410 ${H + 40} Q600 ${H + 60} 810 ${H + 20} L810 ${H + 26} Q600 ${H + 66} 410 ${H + 46} Q330 ${H + 18} 230 ${H + 28} Q120 ${H + 40} -10 ${H + 10} Q-200 ${H + 12} -410 ${H + 36}Z" fill="#FFC9B2" opacity=".35"/>
      <g fill="#120F33">${trees}</g>`);
  }

  /* 4 · Downtown night from below — locker */
  function downtown() {
    const r = rng(53);
    const sky = grad('dtS', [[0, '#03061F'], [0.45, '#0A1A52'], [1, '#1D4C9C']]);
    const up = grad('dtU', [[0, '#081633'], [0.55, '#123D7A'], [1, '#49B7DF']]);
    const glow = `<radialGradient id="dtH" cx=".5" cy="1" r=".7"><stop offset="0" stop-color="#3E8BE6" stop-opacity=".7"/><stop offset="1" stop-color="#3E8BE6" stop-opacity="0"/></radialGradient>`;
    // towers converge towards a vanishing point above the frame
    const VX = 200, VY = -520;
    const towers = [[-460, -240, 0.74], [-260, -80, 0.58], [-100, 70, 0.62], [60, 150, 0.46], [130, 190, 0.3], [250, 300, 0.36], [290, 360, 0.5], [350, 480, 0.66], [470, 640, 0.56], [620, 860, 0.76]];
    let tw = '', wins = '';
    for (const [b0, b1, k] of towers) {
      const at = (bx, y) => bx + (VX - bx) * ((800 - y) / (800 - VY));
      const top = 800 - (800 - VY) * k;
      tw += `<polygon points="${f(b0)},800 ${f(b1)},800 ${f(at(b1, top))},${f(top)} ${f(at(b0, top))},${f(top)}" fill="#08102E"/><line x1="${f(b1)}" y1="800" x2="${f(at(b1, top))}" y2="${f(top)}" stroke="#2E6FD0" stroke-width="1" opacity=".7"/>`;
      const cols = Math.max(3, Math.round((b1 - b0) / 12));
      for (let y = 796; y > top + 6; y -= 9 * (0.45 + 0.55 * ((y - VY) / (800 - VY)))) {
        const L = at(b0, y), R = at(b1, y), cw = (R - L) / cols, s = (y - VY) / (800 - VY);
        for (let c = 0; c < cols; c++) if (r() > 0.55) { const col = r() > 0.75 ? '#FFD28A' : r() > 0.4 ? '#9BE7FF' : '#FFFFFF'; wins += `<rect x="${f(L + c * cw + cw * 0.22)}" y="${f(y - 4 * s)}" width="${f(cw * 0.56)}" height="${f(Math.max(0.8, 3.4 * s))}" fill="${col}" opacity="${f(0.5 + r() * 0.5)}"/>`; }
      }
    }
    let stars = '';
    for (let i = 0; i < 40; i++) stars += `<circle cx="${f(120 + r() * 160)}" cy="${f(r() * 260)}" r="${f(0.3 + r() * 0.8)}" fill="#fff" opacity="${f(0.3 + r() * 0.6)}"/>`;
    const trees = palm('dtP', -300, 840, 560, -8) + palm('dtP', 720, 840, 560, 8, true) + palm('dtP', 46, 840, 520, -10) + palm('dtP', 110, 840, 360, 14, true) + palm('dtP', 360, 840, 560, 10, true) + palm('dtP', 300, 844, 380, -12);
    return frame('dt', sky + up + glow, `<rect x="-400" width="1200" height="800" fill="url(#dtS)"/>${stars}
      <rect x="-400" width="1200" height="800" fill="url(#dtH)"/>${tw}${wins}
      <g fill="url(#dtU)">${trees}</g>`);
  }

  /* 5 · Magenta skyline with sparkles — notes, contacts, kundlis, settings */
  function magenta() {
    const r = rng(71), H = 620;
    const sky = grad('mgS', [[0, '#14051F'], [0.3, '#3E0B4F'], [0.55, '#8E1670'], [0.7, '#D4217C'], [0.775, '#FF72AA']]);
    const ground = grad('mgG', [[0, '#3A0A3E'], [1, '#0E0214']]);
    const back = skyline(r, -404, 804, H, 20, 70, { win: true, winP: 0.8, wMin: 9, wVar: 16 });
    const front = skyline(r, -160, 560, H, 30, 150, { win: true, winP: 0.7, wMin: 12, wVar: 22, crown: true, gap: 3 });
    let sp = '';
    for (let i = 0; i < 70; i++) { const big = r() > 0.84; sp += sparkle(-400 + r() * 1200, 30 + r() * 440, big ? 7 + r() * 6 : 2 + r() * 3, r() > 0.5 ? '#FFFFFF' : '#FFC2E0', big ? 0.95 : 0.6 + r() * 0.35); }
    const trees = [[-340, 520, -2], [-270, 360, 3, true], [640, 380, -3, true], [740, 540, 2], [24, 470, -3], [74, 330, 4, true], [330, 360, -3, true], [384, 520, 3]].map(([x, h, l, fl]) => palm('mgP', x, 812, h, l, fl)).join('');
    return frame('mg', sky + ground + `<radialGradient id="mgGl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF8CC6" stop-opacity=".7"/><stop offset="1" stop-color="#FF8CC6" stop-opacity="0"/></radialGradient>`,
      `<rect x="-400" width="1200" height="800" fill="url(#mgS)"/>
      <ellipse cx="200" cy="${H}" rx="560" ry="100" fill="url(#mgGl)"/>${sp}
      <g fill="#5A1252">${back.b}</g><g fill="#FFB3DA" opacity=".55">${back.w}</g>
      <g fill="#2E0834">${front.b}</g><g fill="#FFC86B" opacity=".8">${front.w}</g>
      <rect x="-400" y="${H}" width="1200" height="${800 - H}" fill="url(#mgG)"/>
      <g fill="#12021A">${trees}</g>`);
  }

  const MAKERS = { day, sunset, coast, downtown, magenta };
  const BY_VIEW = { inbox: 'day', gallery: 'sunset', locker: 'downtown', dates: 'coast' };
  const cache = {};
  function set(view) {
    const key = BY_VIEW[view] || 'magenta';
    const box = document.querySelector('.scene');
    if (!box || box.dataset.key === key) return;
    cache[key] = cache[key] || MAKERS[key]();
    box.dataset.key = key;
    box.innerHTML = cache[key];
    box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap');
  }
  return { set, MAKERS, BY_VIEW };
})();
