/* ============================================================
   Core: helpers, icons, art, modals, global state, boot, router
   ============================================================ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uid = () => Store.uid();
const pad = (n) => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const fmtTime = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (d instanceof Date ? d : parseISO(d)).toLocaleDateString(undefined, opts);
const fmtStamp = (ts) => new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const fmtSize = (b) => (b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const dayLabel = (ts) => {
  const d = new Date(ts), t = new Date();
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()), b = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const diff = Math.round((b - a) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === t.getFullYear() ? undefined : 'numeric' });
};

/* ---------- icons (square caps, mitred joins) ---------- */
const ICON_PATHS = {
  inbox: '<path d="M3 4h18v13H8l-5 4z"/><path d="M7 9h10M7 13h6"/>',
  image: '<rect x="3" y="4" width="18" height="16"/><path d="M3 16l5-5 4 4 3-3 6 6"/><rect x="14" y="7" width="3" height="3"/>',
  lock: '<rect x="4" y="10" width="16" height="11"/><path d="M8 10V6h8v4M12 14v3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/><rect x="7" y="13" width="3" height="3"/>',
  more: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
  note: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h6"/>',
  contacts: '<rect x="4" y="3" width="16" height="18"/><rect x="9" y="7" width="6" height="5"/><path d="M7 18c1-3 9-3 10 0"/>',
  star: '<path d="M12 2c.6 5.4 3.6 8.4 10 10-6.4 1.6-9.4 4.6-10 10-.6-5.4-3.6-8.4-10-10 6.4-1.6 9.4-4.6 10-10z"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><rect x="14" y="4" width="4" height="4"/><rect x="8" y="10" width="4" height="4"/><rect x="16" y="16" width="4" height="4"/>',
  search: '<rect x="4" y="4" width="12" height="12"/><path d="M16 16l5 5"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
  edit: '<path d="M4 20h4L20 8l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  close: '<path d="M5 5l14 14M19 5L5 19"/>',
  left: '<path d="M15 4l-8 8 8 8"/>',
  right: '<path d="M9 4l8 8-8 8"/>',
  pin: '<path d="M9 3h6l-1 6 4 4H6l4-4zM12 13v8"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  send: '<path d="M3 11l18-8-8 18-2-8z"/>',
  file: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/>',
  pdf: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 13h2v4M8 13h2a1 1 0 010 2H8M13 13v4h1.5a1.5 1.5 0 001.5-1.5v-1a1.5 1.5 0 00-1.5-1.5z"/>',
  phone: '<path d="M5 3h4l2 5-3 2c1 2 3 4 5 5l2-3 5 2v4c0 1-1 2-2 2C10 20 4 14 3 5c0-1 1-2 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14"/><path d="M3 6l9 7 9-7"/>',
  bell: '<path d="M6 17V10a6 6 0 0112 0v7l2 2H4zM10 21h4"/>',
  dots: '<rect x="4" y="11" width="3" height="3"/><rect x="10.5" y="11" width="3" height="3"/><rect x="17" y="11" width="3" height="3"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><rect x="3" y="5" width="2" height="2"/><rect x="3" y="11" width="2" height="2"/><rect x="3" y="17" width="2" height="2"/>',
  grid: '<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>',
  map: '<path d="M12 21s-7-6-7-12a7 7 0 0114 0c0 6-7 12-7 12z"/><rect x="10" y="7" width="4" height="4"/>',
  clock: '<rect x="3" y="3" width="18" height="18"/><path d="M12 7v5l3 3"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><rect x="10" y="10" width="4" height="4"/>',
};
const icon = (n, cls = '') =>
  n === 'star'
    ? `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICON_PATHS.star}</svg>`
    : `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${ICON_PATHS[n] || ''}</svg>`;

/* ---------- scenery: palm + skyline silhouettes ---------- */
const PALM = `<svg viewBox="0 0 160 260" aria-hidden="true" class="palm CLS"><path d="M84 258c-2-60 -4-120 4-176l7 1c-7 56-6 115-4 175z"/><path d="M90 84c-16-24-46-34-84-26 30-2 58 8 82 30z"/><path d="M90 84c-4-30-24-54-56-66 26 16 44 38 52 68z"/><path d="M91 83c10-28 32-46 64-50-28 10-48 28-60 54z"/><path d="M92 85c24-14 50-12 68 4-22-8-44-6-66 4z"/><path d="M90 86c-22-6-50 6-70 30 22-18 46-26 70-26z"/><path d="M92 86c20 6 38 26 44 52-10-22-26-38-46-48z"/><path d="M89 84c-2-26 6-50 24-70-12 22-18 44-20 70z"/></svg>`;
const palm = (cls) => PALM.replace('CLS', cls);
const SKYLINE = `<svg class="skyline" viewBox="0 0 400 150" preserveAspectRatio="none" aria-hidden="true"><path d="M0 150V108h18V92h14v16h10V70h22v38h8V84h16v24h12V40h26v68h8V60h12V48h18v60h10V76h20v32h8V30h28v78h10V88h16v20h12V62h20v46h10V96h22v54z"/><g fill="#ffc93c" opacity=".55"><rect x="48" y="78" width="3" height="3"/><rect x="56" y="90" width="3" height="3"/><rect x="128" y="48" width="3" height="3"/><rect x="136" y="64" width="3" height="3"/><rect x="128" y="80" width="3" height="3"/><rect x="246" y="40" width="3" height="3"/><rect x="256" y="56" width="3" height="3"/><rect x="246" y="72" width="3" height="3"/><rect x="306" y="70" width="3" height="3"/><rect x="176" y="58" width="3" height="3"/></g></svg>`;

/* ---------- constants ---------- */
const SEAT_LABEL = { A: 'Person A', B: 'Person B' };
const LOCKER_CATS = ['Identity', 'Finance', 'Medical', 'Home', 'Travel', 'Work', 'Other'];
const CONTACT_CATS = ['Family', 'Friends', 'Services', 'Emergency', 'Other'];
const DATE_TYPES = ['Birthday', 'Anniversary', 'Meeting', 'Other'];
const REMIND_OPTS = [[-1, 'No reminder'], [0, 'On the day'], [1, '1 day before'], [3, '3 days before'], [7, '7 days before'], [30, '30 days before']];

/* ---------- global state ---------- */
const S = {
  st: null,             // store handle
  me: { id: null, seat: null },
  members: { A: null, B: null },
  profileNames: {},
  prefs: {},
  bootLastSeen: null,
  inboxLimit: 60,
  data: { inbox: [], photos: [], lockers: [], notes: [], contacts: [], dates: [], profiles: {}, events: [], mine: [] },
  loaded: {},
  view: null,
  subs: [],
  listeners: new Set(),
};
const emit = (key) => { for (const l of S.listeners) l(key); };
const onData = (fn) => { S.listeners.add(fn); return () => S.listeners.delete(fn); };
const partnerSeat = () => (S.me.seat === 'A' ? 'B' : 'A');
const nameOf = (seat) => {
  const m = S.members[seat];
  if (!m) return SEAT_LABEL[seat];
  return m.nick || S.profileNames[m.id] || SEAT_LABEL[seat];
};
const myPrivColl = () => S.st.db.collection('data/users/' + S.me.id);

/* ---------- asset hydration ---------- */
async function hydrate(root = document) {
  for (const el of $$('[data-asset]', root)) {
    const id = el.getAttribute('data-asset');
    if (!id || el.dataset.hyd === id) continue;
    el.dataset.hyd = id;
    const url = S.st.mode === 'cloud' ? '/_blob/' + id : await S.st.resolveAsset(id);
    if (!url) { el.classList.add('missing'); continue; }
    if (el.tagName === 'A') el.href = url;
    else if (el.tagName === 'IFRAME') el.src = url;
    else el.src = url;
  }
}
const assetUrl = async (id) => (S.st.mode === 'cloud' ? '/_blob/' + id : S.st.resolveAsset(id));

/* ---------- toasts ---------- */
function toast(msg, kind = '') {
  let wrap = $('.toasts');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toasts'; wrap.setAttribute('role', 'status'); document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), kind === 'err' ? 5200 : 2800);
}

/* ---------- modals ---------- */
const modalStack = [];
function openModal({ title, body, foot = '', wide = false, onMount, onClose, label }) {
  const prevFocus = document.activeElement;
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(label || title)}">
    <div class="mh"><h2>${esc(title)}</h2><button class="icon-btn" data-x aria-label="Close">${icon('close')}</button></div>
    <div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ''}</div>`;
  document.body.appendChild(scrim);
  const m = scrim.firstElementChild;
  let closed = false;
  const close = (v) => {
    if (closed) return; closed = true;
    scrim.remove(); modalStack.splice(modalStack.indexOf(close), 1);
    onClose && onClose(v);
    prevFocus && prevFocus.focus && prevFocus.focus();
  };
  modalStack.push(close);
  scrim.addEventListener('mousedown', (e) => { if (e.target === scrim) close(); });
  $('[data-x]', m).onclick = () => close();
  onMount && onMount(m, close);
  setTimeout(() => { const f = $('[autofocus]', m) || $('input,textarea,select,button:not([data-x])', m); f && f.focus(); }, 30);
  return close;
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalStack.length) modalStack[modalStack.length - 1](); });
// Android back button: close the top dialog first; the app handles page history itself
window.enkoBack = () => { if (modalStack.length) { modalStack[modalStack.length - 1](); return true; } return false; };

function confirmBox(text, okLabel = 'Delete', danger = true) {
  return new Promise((res) => {
    openModal({
      title: 'Are you sure?', label: 'Confirm',
      body: `<p style="margin:0">${esc(text)}</p>`,
      foot: `<button class="btn ghost" data-no>Cancel</button><button class="btn ${danger ? 'danger' : ''}" data-ok>${esc(okLabel)}</button>`,
      onMount: (m, close) => { $('[data-no]', m).onclick = () => close(false); $('[data-ok]', m).onclick = () => close(true); },
      onClose: (v) => res(!!v),
    });
  });
}

/* ---------- download / save a file to the viewer ---------- */
async function saveFile(filename, blobOrText, type = 'application/octet-stream') {
  const blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type });
  if (window.EnkoAndroid && window.EnkoAndroid.saveFile) {
    const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(blob); });
    const out = window.EnkoAndroid.saveFile(filename, blob.type || type, b64);
    if (out === 'ok') { toast('Saved to Downloads'); return false; }
    toast('Couldn’t save the file: ' + out, 'err'); return false;
  }
  if (S.st.downloads) {
    try { await S.st.downloads.save({ filename, data: blob }); return true; } catch (e) {
      if (e && (e.code === 'cancelled' || e.code === 'declined' || e.code === 'user_cancelled')) return false;
      try { await S.st.downloads.save({ filename, data: await blob.text() }); return true; } catch {}
    }
  }
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  } catch { return false; }
}

/* ---------- error text ---------- */
function errText(e) {
  const c = e && e.code;
  if (c === 'quota_exceeded' || c === 'quota_or_state') return 'Storage is full. Delete some items and try again.';
  if (c === 'too_large') return 'That file is over 20 MB. Choose a smaller file.';
  if (c === 'unsupported_type') return 'That file type can’t be stored. Use PDF, JPG, PNG, WebP, GIF or plain text.';
  if (c === 'rate_limited' || c === 'resource_exhausted') return 'Too many changes at once. Wait a moment and try again.';
  if (c === 'invalid_argument') return 'You don’t have permission to change this. Ask the space owner for Editor access.';
  if (c === 'revoked' || c === 'not_granted') return 'Your access to this space changed. Reload to continue.';
  return 'Couldn’t reach the server. Check your connection and try again.';
}
async function retryOnce(fn) {
  try { return await fn(); } catch (e) {
    if (e && (e.code === 'unavailable' || e.code === 'store_unavailable')) { await new Promise((r) => setTimeout(r, 400 + Math.random() * 600)); return fn(); }
    throw e;
  }
}

/* ---------- image processing ---------- */
async function decodeImage(file) {
  try { return await createImageBitmap(file); } catch {}
  const url = URL.createObjectURL(file);
  try { const img = new Image(); img.src = url; await img.decode(); return img; } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
function scaleTo(src, max, type = 'image/jpeg', q = 0.85) {
  const w = src.width, h = src.height, k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(b), type, q));
}
const isHeic = (f) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);
async function prepPhoto(file) {
  const bmp = await decodeImage(file).catch(() => null);
  if (!bmp) throw { code: 'decode', message: isHeic(file) ? 'This browser can’t read HEIC. Open the photo on your iPhone in Safari, or export it as JPG.' : 'This file isn’t a readable image.' };
  const thumb = await scaleTo(bmp, 520, 'image/jpeg', 0.8);
  let full = file;
  const okType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
  if (!okType || file.size > 12 * 1024 * 1024) full = await scaleTo(bmp, 3200, 'image/jpeg', 0.9);
  return { thumb, full, w: bmp.width, h: bmp.height };
}
async function upload(blob, type) {
  if (!S.st.assets) throw { code: 'not_granted' };
  return retryOnce(() => S.st.assets.upload(blob, type ? { type } : undefined));
}
const ALLOWED_DOC = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  txt: 'text/plain', csv: 'text/csv', md: 'text/markdown', json: 'application/json',
};
const extOf = (n) => (String(n).split('.').pop() || '').toLowerCase();

/* ---------- Vice City night boulevard backdrop (drawn, not a photo) ---------- */
const SCENE = (() => {
  const VX = 200, VY = 652; // vanishing point
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const stars = Array.from({ length: 70 }, () => `<circle cx="${(rnd() * 400).toFixed(1)}" cy="${(rnd() * 420).toFixed(1)}" r="${(rnd() * 0.9 + 0.3).toFixed(2)}" opacity="${(rnd() * 0.6 + 0.3).toFixed(2)}"/>`).join('');
  // skyline at the horizon
  let sky = '', win = '', x = 110;
  while (x < 290) {
    const w = 8 + rnd() * 16, h = 18 + rnd() * (Math.abs(x - VX) < 40 ? 70 : 38);
    sky += `<rect x="${x.toFixed(1)}" y="${(VY - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`;
    for (let wy = VY - h + 4; wy < VY - 4; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (rnd() > 0.72) win += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="1.4" height="1.6"/>`;
    x += w + 1 + rnd() * 3;
  }
  // palm rows + lamps converging on the vanishing point
  let palms = '', lamps = '';
  for (const side of [-1, 1]) {
    for (let k = 0; k < 9; k++) {
      const t = Math.pow(0.72, k + 0.6);           // ≈1 = nearest, → 0 at horizon
      const bx = VX + side * (18 + 250 * t);       // trunk base x
      const by = VY + 150 * t;                     // ground y
      const h = 30 + 560 * t;                      // palm height
      const w = h * 0.62;
      palms += `<use href="#palm" x="${(bx - w / 2).toFixed(1)}" y="${(by - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"${side > 0 ? ` transform="scale(-1 1) translate(${(-2 * bx).toFixed(1)} 0)"` : ''}/>`;
      if (k % 1 === 0 && k > 0) {
        const lx = VX + side * (12 + 205 * t), ly = VY - 8 - 150 * t, r = 1.2 + 9 * t;
        lamps += `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="${(r * 4).toFixed(1)}" fill="url(#lampGlow)"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="${r.toFixed(1)}" fill="#FFD9A0"/>`;
      }
    }
  }
  return `<svg class="scene-svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060823"/><stop offset=".32" stop-color="#151A5E"/><stop offset=".56" stop-color="#3B1E86"/><stop offset=".72" stop-color="#7A2690"/><stop offset=".8" stop-color="#D1397F"/><stop offset=".815" stop-color="#E9658A"/><stop offset=".82" stop-color="#1A0A2C"/><stop offset="1" stop-color="#0B0516"/></linearGradient>
    <radialGradient id="haze" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF6FA8" stop-opacity=".85"/><stop offset=".45" stop-color="#C2318C" stop-opacity=".35"/><stop offset="1" stop-color="#C2318C" stop-opacity="0"/></radialGradient>
    <radialGradient id="lampGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF9A3C" stop-opacity=".9"/><stop offset=".35" stop-color="#FF5A7A" stop-opacity=".35"/><stop offset="1" stop-color="#FF5A7A" stop-opacity="0"/></radialGradient>
    <linearGradient id="roadG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A1640"/><stop offset=".25" stop-color="#1A0B26"/><stop offset="1" stop-color="#07030D"/></linearGradient>
    <symbol id="palm" viewBox="0 0 160 260"><path d="M84 258c-2-60 -4-120 4-176l7 1c-7 56-6 115-4 175z"/><path d="M90 84c-16-24-46-34-84-26 30-2 58 8 82 30z"/><path d="M90 84c-4-30-24-54-56-66 26 16 44 38 52 68z"/><path d="M91 83c10-28 32-46 64-50-28 10-48 28-60 54z"/><path d="M92 85c24-14 50-12 68 4-22-8-44-6-66 4z"/><path d="M90 86c-22-6-50 6-70 30 22-18 46-26 70-26z"/><path d="M92 86c20 6 38 26 44 52-10-22-26-38-46-48z"/><path d="M89 84c-2-26 6-50 24-70-12 22-18 44-20 70z"/></symbol>
  </defs>
  <rect width="400" height="800" fill="url(#skyG)"/>
  <g fill="#FFF3FF">${stars}</g>
  <ellipse cx="${VX}" cy="${VY - 10}" rx="230" ry="120" fill="url(#haze)"/>
  <g fill="#1D0B36">${sky}</g><g fill="#FFC86B" opacity=".75">${win}</g>
  <path d="M${VX - 6} ${VY} L${VX + 6} ${VY} L520 800 L-120 800 Z" fill="url(#roadG)"/>
  <path d="M${VX - 0.6} ${VY} L${VX + 0.6} ${VY} L${VX + 7} 800 L${VX - 7} 800 Z" fill="#E8B04A" opacity=".75"/>
  <g fill="#0A0418">${palms}</g>
  ${lamps}
</svg>`;
})();
