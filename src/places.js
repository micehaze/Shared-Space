/* ============================================================
   Birthplace: search, map pin, coordinates → IANA time zone
   Sources, in order:
     1. Built-in places (IANA zone cities + major cities) — instant, offline
     2. OpenStreetMap Nominatim — only where the page may reach the web
        (self-hosted build); searched on submit, never as autocomplete
     3. Claude — inside claude.ai, where the page can't reach the web
     4. Manual: drop a pin or type coordinates
   ============================================================ */
const Places = (() => {
  const ZONES = GEO.zones.map(([cc, lat, lon, tz, note]) => ({ cc, lat, lon, tz, note, city: tz.split('/').pop().replace(/_/g, ' ') }));
  const zonesOf = (cc) => ZONES.filter((z) => z.cc === cc);
  const country = (cc) => GEO.countries[cc] || cc || '';
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function km(a, b, c, d) {
    const r = Math.PI / 180, x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(x));
  }
  function tzFor(lat, lon, cc) {
    const pool = cc ? zonesOf(cc) : [];
    if (pool.length === 1) return { tz: pool[0].tz, how: 'country', alternatives: [] };
    const list = (pool.length ? pool : ZONES).map((z) => ({ ...z, d: km(lat, lon, z.lat, z.lon) })).sort((a, b) => a.d - b.d);
    return { tz: list[0].tz, how: pool.length ? 'nearest-in-country' : 'nearest', alternatives: (pool.length ? list : list.slice(0, 8)).map((z) => z.tz) };
  }
  function nearestName(lat, lon) {
    let best = null;
    for (const c of GEO.cities) { const d = km(lat, lon, c[3], c[4]); if (!best || d < best.d) best = { d, name: c[0], cc: c[2] }; }
    for (const z of ZONES) { const d = km(lat, lon, z.lat, z.lon); if (!best || d < best.d) best = { d, name: z.city, cc: z.cc }; }
    return best;
  }
  function searchLocal(q) {
    const f = fold(q).replace(/,/g, ' ').trim();
    if (!f) return [];
    const toks = f.split(/\s+/);
    const out = [];
    for (const [name, region, cc, lat, lon] of GEO.cities) {
      const hay = fold(`${name} ${region} ${country(cc)} ${cc}`);
      if (toks.every((t) => hay.includes(t))) out.push({ name, region, cc, lat, lon, precision: 'city', source: 'built-in', score: fold(name).startsWith(toks[0]) ? 2 : 1 });
    }
    for (const z of ZONES) {
      const hay = fold(`${z.city} ${z.note} ${country(z.cc)} ${z.cc} ${z.tz}`);
      if (toks.every((t) => hay.includes(t)) && !out.some((o) => o.cc === z.cc && fold(o.name) === fold(z.city))) out.push({ name: z.city, region: z.note.replace(/^MSK[+-]\d+ - /, ''), cc: z.cc, lat: z.lat, lon: z.lon, tz: z.tz, precision: 'city', source: 'built-in', score: fold(z.city).startsWith(toks[0]) ? 2 : 1 });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 8).map(finish);
  }
  function finish(p) {
    let tzInfo;
    if (p.tz && TZ.isValid(p.tz) && (!p.cc || !zonesOf(p.cc).length || zonesOf(p.cc).some((z) => z.tz === p.tz))) tzInfo = { tz: p.tz, how: p.source === 'claude' ? 'suggested' : 'listed', alternatives: zonesOf(p.cc).map((z) => z.tz) };
    else tzInfo = tzFor(p.lat, p.lon, p.cc);
    return { ...p, label: [p.name, p.region && p.region !== p.name ? p.region : '', country(p.cc)].filter(Boolean).join(', '), tz: tzInfo.tz, tzHow: tzInfo.how, tzAlternatives: tzInfo.alternatives };
  }
  async function searchWeb(q, signal) {
    const url = (window.ENKO_GEOCODER || 'https://nominatim.openstreetmap.org/search') + '?format=jsonv2&addressdetails=1&limit=6&q=' + encodeURIComponent(q);
    const r = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('geocoder ' + r.status);
    const js = await r.json();
    return js.map((x) => {
      const a = x.address || {};
      const name = a.city || a.town || a.village || a.suburb || a.county || x.name || String(x.display_name).split(',')[0];
      const prec = /house|building|road|street/.test(x.addresstype || x.type) ? 'street' : /suburb|quarter|neighbourhood|district/.test(x.addresstype || '') ? 'district' : 'city';
      return finish({ name: prec === 'street' ? String(x.display_name).split(',').slice(0, 2).join(',') : name, region: a.state || a.region || '', cc: String(a.country_code || '').toUpperCase(), lat: Number(x.lat), lon: Number(x.lon), precision: prec, source: 'openstreetmap' });
    });
  }
  async function searchClaude(q, signal) {
    const sample = await claude.use('sample');
    if (!sample) throw { code: 'not_granted' };
    const prompt = `You are a geocoder. Find up to 5 real places matching this birthplace search: "${q.replace(/"/g, "'").slice(0, 200)}".
Reply with only a JSON array. Each item: {"name": string (place or street), "region": string (state/province/district), "country_code": ISO 3166-1 alpha-2, "lat": number, "lon": number, "timezone": IANA time zone id, "precision": "street"|"district"|"city"|"region"}.
Use coordinates you are confident of, with 4 decimals. If the search is ambiguous, include the main candidates. If you don't know the place, reply [].`;
    const arr = await sample.json(prompt, { modelTier: 'quick', signal, cache: { gcTime: 86400000 } });
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && isFinite(x.lat) && isFinite(x.lon) && Math.abs(x.lat) <= 90 && Math.abs(x.lon) <= 180 && /^[A-Za-z]{2}$/.test(x.country_code || ''))
      .slice(0, 5)
      .map((x) => finish({ name: String(x.name).slice(0, 80), region: String(x.region || '').slice(0, 80), cc: String(x.country_code).toUpperCase(), lat: Number(x.lat), lon: Number(x.lon), tz: String(x.timezone || ''), precision: ['street', 'district', 'city', 'region'].includes(x.precision) ? x.precision : 'city', source: 'claude' }));
  }
  let webOk = null;
  async function canReachWeb() {
    if (webOk !== null) return webOk;
    if (window.OSS_NO_CDN) return (webOk = false);
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 3500);
      const r = await fetch((window.ENKO_GEOCODER || 'https://nominatim.openstreetmap.org/search') + '?format=jsonv2&limit=1&q=London', { signal: c.signal });
      clearTimeout(t); webOk = r.ok;
    } catch { webOk = false; }
    return webOk;
  }
  async function searchWide(q, signal) {
    if (await canReachWeb()) return { results: await searchWeb(q, signal), source: 'openstreetmap' };
    if (window.claude) return { results: await searchClaude(q, signal), source: 'claude' };
    throw { code: 'offline' };
  }
  function fromPin(lat, lon, prevCc) {
    const n = nearestName(lat, lon);
    const cc = n && n.d < 250 ? n.cc : prevCc || (n && n.cc) || '';
    const tzi = tzFor(lat, lon, cc);
    return { name: n && n.d < 60 ? `Near ${n.name}` : 'Dropped pin', region: '', cc, lat, lon, label: `${n && n.d < 60 ? 'Near ' + n.name : 'Dropped pin'}${cc ? ', ' + country(cc) : ''}`, precision: 'pin', source: 'pin', tz: tzi.tz, tzHow: tzi.how, tzAlternatives: tzi.alternatives };
  }
  return { searchLocal, searchWide, canReachWeb, tzFor, zonesOf, country, fromPin, km, ZONES };
})();

/* ---------- Map picker ---------- */
function MapPicker(host, { lat, lon, onPick }) {
  let mode = 'canvas';
  const api = { setPoint() {}, destroy() {} };
  const tryLeaflet = async () => {
    if (window.OSS_NO_CDN) return false;
    const tileUrl = window.ENKO_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileOk = await new Promise((r) => { const i = new Image(); const t = setTimeout(() => r(false), 3500); i.onload = () => { clearTimeout(t); r(true); }; i.onerror = () => { clearTimeout(t); r(false); }; i.src = tileUrl.replace('{z}', '1').replace('{x}', '1').replace('{y}', '0'); });
    if (!tileOk) return false;
    if (!window.L) {
      await new Promise((r) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = window.ENKO_VENDOR ? window.ENKO_VENDOR + 'leaflet.css' : 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(l); const s = document.createElement('script'); s.src = window.ENKO_VENDOR ? window.ENKO_VENDOR + 'leaflet.js' : 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = r; s.onerror = r; document.head.appendChild(s); });
    }
    if (!window.L) return false;
    host.innerHTML = '<div class="leaf" style="height:100%"></div>';
    const map = L.map(host.firstChild).setView([lat, lon], 10);
    L.tileLayer(tileUrl, { maxZoom: 19, attribution: window.ENKO_TILE_ATTRIB || '© OpenStreetMap contributors' }).addTo(map);
    const mk = L.marker([lat, lon], { draggable: true, keyboard: true, title: 'Birthplace pin' }).addTo(map);
    mk.on('dragend', () => { const p = mk.getLatLng(); onPick(p.lat, p.lng); });
    map.on('click', (e) => { mk.setLatLng(e.latlng); onPick(e.latlng.lat, e.latlng.lng); });
    api.setPoint = (a, b, z) => { mk.setLatLng([a, b]); map.setView([a, b], z || Math.max(map.getZoom(), 10)); };
    api.destroy = () => map.remove();
    mode = 'tiles';
    return true;
  };
  /* canvas fallback: graticule + place dots + draggable pin, Web Mercator */
  const drawCanvas = () => {
    host.innerHTML = `<canvas class="mp-canvas" tabindex="0" aria-label="Location picker. Arrow keys move the pin; plus and minus zoom."></canvas>
      <div class="mp-zoom"><button type="button" data-z="1" aria-label="Zoom in">+</button><button type="button" data-z="-1" aria-label="Zoom out">−</button></div>
      <p class="mp-note">Simplified map — street tiles can’t load in this view. Search for the place, then fine-tune the pin; the coordinates are what the chart uses.</p>`;
    const cv = host.querySelector('canvas');
    let z = 5, cLat = lat, cLon = lon, pLat = lat, pLon = lon;
    const TS = 256;
    const proj = (la, lo) => { const s = Math.sin((Math.max(-85, Math.min(85, la)) * Math.PI) / 180); return [((lo + 180) / 360) * TS * 2 ** z, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TS * 2 ** z]; };
    const unproj = (x, y) => { const n = Math.PI - (2 * Math.PI * y) / (TS * 2 ** z); return [(180 / Math.PI) * Math.atan(Math.sinh(n)), (x / (TS * 2 ** z)) * 360 - 180]; };
    const pts = [...GEO.cities.map((c) => ({ n: c[0], la: c[3], lo: c[4], big: true })), ...Places.ZONES.map((zz) => ({ n: zz.city, la: zz.lat, lo: zz.lon }))];
    const draw = () => {
      const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const [cx, cy] = proj(cLat, cLon), ox = cx - w / 2, oy = cy - h / 2;
      g.fillStyle = '#FFF4F8'; g.fillRect(0, 0, w, h);
      const step = z >= 11 ? 0.05 : z >= 9 ? 0.25 : z >= 7 ? 1 : z >= 5 ? 5 : 10;
      const [la1, lo1] = unproj(ox, oy), [la2, lo2] = unproj(ox + w, oy + h);
      g.strokeStyle = '#F5C9DB'; g.lineWidth = 1; g.font = '11px ' + getComputedStyle(document.body).fontFamily; g.fillStyle = '#9A7488';
      for (let lo = Math.ceil(lo1 / step) * step; lo <= lo2; lo += step) { const [x] = proj(0, lo); g.beginPath(); g.moveTo(x - ox, 0); g.lineTo(x - ox, h); g.stroke(); g.fillText(lo.toFixed(step < 1 ? 2 : 0) + '°', x - ox + 3, h - 6); }
      for (let la = Math.ceil(la2 / step) * step; la <= la1; la += step) { const [, y] = proj(la, 0); g.beginPath(); g.moveTo(0, y - oy); g.lineTo(w, y - oy); g.stroke(); g.fillText(la.toFixed(step < 1 ? 2 : 0) + '°', 4, y - oy - 3); }
      const placed = [];
      for (const p of pts) {
        const [x, y] = proj(p.la, p.lo); const sx = x - ox, sy = y - oy;
        if (sx < -20 || sy < -20 || sx > w + 20 || sy > h + 20) continue;
        g.fillStyle = p.big ? '#B83D72' : '#D98AAB'; g.fillRect(sx - 3, sy - 3, 6, 6);
        if ((z >= 6 || p.big && z >= 4) && !placed.some(([a, b]) => Math.abs(a - sx) < 70 && Math.abs(b - sy) < 14)) { g.fillStyle = '#3E2A36'; g.fillText(p.n, sx + 6, sy + 4); placed.push([sx, sy]); }
      }
      const [px, py] = proj(pLat, pLon), sx = px - ox, sy = py - oy;
      g.fillStyle = '#E95891'; g.strokeStyle = '#3E2A36'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 11, sy - 22); g.lineTo(sx + 11, sy - 22); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#FFF9FB'; g.fillRect(sx - 3, sy - 19, 6, 6);
    };
    const setPin = (a, b, emit = true) => { pLat = Math.max(-85, Math.min(85, a)); pLon = ((b + 540) % 360) - 180; draw(); if (emit) onPick(pLat, pLon); };
    let drag = null;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const toLL = (sx, sy) => { const [cx, cy] = proj(cLat, cLon); return unproj(cx - cv.clientWidth / 2 + sx, cy - cv.clientHeight / 2 + sy); };
    const pointers = new Map();
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId); pointers.set(e.pointerId, pt(e));
      const [x, y] = pt(e); const [px, py] = proj(pLat, pLon), [cx, cy] = proj(cLat, cLon);
      const sx = px - cx + cv.clientWidth / 2, sy = py - cy + cv.clientHeight / 2;
      drag = { onPin: Math.abs(x - sx) < 16 && y < sy + 6 && y > sy - 30, x, y, moved: false, cLat, cLon };
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drag) return; const [x, y] = pt(e); const prev = pointers.get(e.pointerId); pointers.set(e.pointerId, [x, y]);
      if (pointers.size === 2 && prev) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (drag.pinch) { if (d / drag.pinch > 1.4) { z = Math.min(16, z + 1); drag.pinch = d; draw(); } else if (drag.pinch / d > 1.4) { z = Math.max(2, z - 1); drag.pinch = d; draw(); } } else drag.pinch = d; drag.moved = true; return; }
      if (Math.abs(x - drag.x) + Math.abs(y - drag.y) > 4) drag.moved = true;
      if (drag.onPin) { const [a, b] = toLL(x, y); pLat = a; pLon = b; draw(); }
      else if (drag.moved) { const [cx, cy] = proj(drag.cLat, drag.cLon); [cLat, cLon] = unproj(cx - (x - drag.x), cy - (y - drag.y)); draw(); }
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (!drag) return;
      if (drag.onPin && drag.moved) setPin(pLat, pLon);
      else if (!drag.moved && pointers.size === 0) { const [x, y] = pt(e); const [a, b] = toLL(x, y); setPin(a, b); }
      if (!pointers.size) drag = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); z = Math.max(2, Math.min(16, z + (e.deltaY < 0 ? 1 : -1))); draw(); }, { passive: false });
    cv.addEventListener('keydown', (e) => {
      const s = 40 / 2 ** z; const k = { ArrowUp: [s, 0], ArrowDown: [-s, 0], ArrowLeft: [0, -s], ArrowRight: [0, s] }[e.key];
      if (k) { e.preventDefault(); setPin(pLat + k[0], pLon + k[1]); cLat = pLat; cLon = pLon; draw(); }
      if (e.key === '+' || e.key === '=') { z = Math.min(16, z + 1); draw(); }
      if (e.key === '-') { z = Math.max(2, z - 1); draw(); }
    });
    host.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => { z = Math.max(2, Math.min(16, z + Number(b.dataset.z))); cLat = pLat; cLon = pLon; draw(); }));
    const ro = new ResizeObserver(draw); ro.observe(cv);
    api.setPoint = (a, b, zz) => { pLat = a; pLon = b; cLat = a; cLon = b; if (zz) z = zz; draw(); };
    api.destroy = () => ro.disconnect();
    draw();
  };
  drawCanvas();
  tryLeaflet().then((ok) => { if (ok) api.mode = 'tiles'; }).catch(() => {});
  api.mode = mode;
  return api;
}
