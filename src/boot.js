/* ============================================================
   Boot, membership, subscriptions, shell, router
   ============================================================ */
const VIEWS = {};
const NAV = [
  ['inbox', 'Inbox', 'inbox'],
  ['gallery', 'Gallery', 'image'],
  ['locker', 'Locker', 'lock'],
  ['notepad', 'Notepad', 'note'],
  ['contacts', 'Contacts', 'contacts'],
  ['dates', 'Special dates', 'calendar'],
  ['kundlis', 'Our Charts', 'star'],
  ['account', 'Settings', 'sliders'],
];
const TAB_NAV = ['inbox', 'gallery', 'locker', 'dates'];

const root = () => document.getElementById('root');

function showLoading() {
  root().innerHTML = `<div class="loading"><span class="wordmark">Vice Space</span></div>`;
}

function gate(html) {
  root().innerHTML = `<div class="gate">${palm('l')}${palm('r')}${SKYLINE}<div class="card">${html}</div></div>`;
  const ps = $$('.gate .palm');
  if (ps[0]) Object.assign(ps[0].style, { left: '-40px', bottom: '8vh', height: '62vh' });
  if (ps[1]) Object.assign(ps[1].style, { right: '-50px', bottom: '4vh', height: '50vh', transform: 'scaleX(-1)' });
}

async function boot() {
  if (!document.querySelector('.scene')) document.body.insertAdjacentHTML('afterbegin', `<div class="scene" aria-hidden="true">${SCENE}</div>`);
  showLoading();
  const st = await Store.init();
  S.st = st;
  if (!st.ok && st.needAuth) { FirebaseStore.authGate(st.auth, () => boot()); return; }
  if (!st.ok) {
    gate(`<span class="wordmark">Vice Space</span>
      <p>Sign in to Claude to open your shared space. This page only opens for the two people it was shared with.</p>
      <button class="btn" onclick="location.reload()">Try again</button>`);
    return;
  }
  S.me.id = st.myId;
  let snap;
  try { snap = await retryOnce(() => st.db.doc('space/members').get()); } catch (e) {
    gate(`<span class="wordmark">Vice Space</span><p>${esc(errText(e))}</p><button class="btn" onclick="location.reload()">Try again</button>`);
    return;
  }
  const seats = (snap.exists && snap.data().seats) || {};
  const mine = ['A', 'B'].find((k) => seats[k] && seats[k].id === S.me.id);
  if (mine) return startApp(mine);
  const free = !seats.A ? 'A' : !seats.B ? 'B' : null;
  if (!free) {
    gate(`<span class="wordmark">Vice Space</span>
      <p>This space already belongs to two people, so it can’t take another member. If you think that’s wrong, ask the person who shared it with you.</p>`);
    return;
  }
  if (st.mode === 'local') {
    const seat = st.myId.endsWith('B') ? 'B' : 'A';
    if (window.OSS_STANDALONE && !seats.A && !seats.B) return phoneSetup();
    if (!seats[seat]) await claimSeat(seat === 'A' ? 'Person A' : 'Person B', seat);
    return startApp(seat);
  }
  const first = free === 'A';
  gate(`<span class="wordmark">${first ? 'Welcome home' : 'Come on in'}</span>
    <p>${first ? 'Set up your private space for two. After this, share the page with one other person so they can join.' : 'Someone saved a place for you here. Pick the name they’ll see on your messages.'}</p>
    <form id="joinForm">
      <label class="field"><span>Your name in this space</span><input name="nick" required maxlength="40" autocomplete="nickname" placeholder="e.g. Maya"></label>
      <button class="btn" type="submit">${first ? 'Create our space' : 'Join this space'}</button>
      <p class="hint" id="joinErr" role="alert"></p>
    </form>`);
  $('#joinForm').onsubmit = async (e) => {
    e.preventDefault();
    const nick = e.target.nick.value.trim();
    const btn = $('button', e.target); btn.disabled = true;
    try {
      const seat = await claimSeat(nick);
      if (!seat) { $('#joinErr').textContent = 'Both places in this space were just taken.'; return; }
      startApp(seat);
    } catch (err) { $('#joinErr').textContent = errText(err); btn.disabled = false; }
  };
}

/* Phone-only first run: both names, both seats on this device */
function phoneSetup() {
  gate(`<span class="wordmark">Vice Space</span>
    <p>A private space for two, kept on this phone. Nothing is uploaded anywhere.</p>
    <form id="setupForm">
      <label class="field"><span>Your name</span><input name="a" required maxlength="40" autocomplete="nickname" placeholder="e.g. Anya"></label>
      <label class="field"><span>Your PIN (4–6 digits)</span><input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" required autocomplete="off"></label>
      <label class="field"><span>Your partner’s name</span><input name="b" required maxlength="40" placeholder="e.g. Rohan"></label>
      <button class="btn" type="submit">Open our space</button>
      <p class="hint" id="setupErr" role="alert"></p>
      <p class="hint">You can both use this phone. Each of you has your own PIN, so nobody can write, upload or create a Kundali as the other. Your partner sets their PIN the first time they switch to their name.</p>
    </form>`);
  $('#setupForm').onsubmit = async (e) => {
    e.preventDefault();
    const a = e.target.a.value.trim(), bb = e.target.b.value.trim(), pin = e.target.pin.value.trim();
    if (!a || !bb) return;
    if (!PIN.valid(pin)) { $('#setupErr').textContent = 'Choose a PIN of 4 to 6 digits.'; return; }
    await PIN.set('A', pin); PIN.markUnlocked();
    const now = Date.now();
    await S.st.db.doc('space/members').set({ seats: { A: { id: 'demo-A', nick: a, joinedAt: now }, B: { id: 'demo-B', nick: bb, joinedAt: now } } });
    try { localStorage.setItem('oss.demoPerson', 'A'); } catch {}
    S.me.id = 'demo-A';
    startApp('A');
  };
}

async function claimSeat(nick, forceSeat) {
  if (S.st.claimSeat) return S.st.claimSeat(nick);
  const ref = S.st.db.doc('space/members');
  for (let i = 0; i < 6; i++) {
    const lease = await ref.acquire({ holder: S.me.id, ttlMs: 4000 });
    if (!lease.acquired) { await new Promise((r) => setTimeout(r, 700)); continue; }
    const snap = await ref.get();
    const seats = (snap.exists && snap.data().seats) || {};
    const have = ['A', 'B'].find((k) => seats[k] && seats[k].id === S.me.id);
    if (have) return have;
    const seat = forceSeat && !seats[forceSeat] ? forceSeat : !seats.A ? 'A' : !seats.B ? 'B' : null;
    if (!seat) return null;
    const entry = { id: S.me.id, nick, joinedAt: Date.now() };
    if (snap.exists) await ref.update({ seats: { [seat]: entry } });
    else await ref.set({ seats: { [seat]: entry } });
    return seat;
  }
  throw { code: 'unavailable' };
}

/* ---------- subscriptions ---------- */
function sub(key, q, map) {
  const timer = setTimeout(() => { if (!S.loaded[key]) { S.loaded[key] = 'slow'; emit(key); } }, 10000);
  const un = q.onSnapshot(
    (snap) => { map(snap); if (!snap.metadata || !snap.metadata.fromCache) { clearTimeout(timer); S.loaded[key] = true; } else if (!S.loaded[key]) S.loaded[key] = 'cache'; emit(key); },
    (e) => { clearTimeout(timer); S.loaded[key] = 'error'; console.warn(key, e); emit(key); },
  );
  S.subs.push(un);
  return un;
}
const docsOf = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

let inboxUnsub = null;
function subInbox() {
  inboxUnsub && inboxUnsub();
  inboxUnsub = sub('inbox', S.st.db.collection('inbox').orderBy('day', 'desc').limit(S.inboxLimit), (snap) => {
    const msgs = [];
    const buckets = {};
    for (const d of snap.docs) {
      const b = d.data();
      buckets[d.id] = true;
      for (const [id, m] of Object.entries(b.msgs || {})) msgs.push({ id, seat: b.seat, bucket: d.id, ...m });
    }
    msgs.sort((a, b) => a.ts - b.ts);
    S.data.inbox = msgs;
    S.inboxBuckets = buckets;
    S.inboxHasMore = snap.size >= S.inboxLimit;
  });
}

function startSubs() {
  const db = S.st.db;
  sub('members', db.doc('space/members'), (snap) => {
    const seats = (snap.exists && snap.data().seats) || {};
    S.members = { A: seats.A || null, B: seats.B || null };
    const ids = [seats.A && seats.A.id, seats.B && seats.B.id].filter(Boolean);
    S.st.names(ids).then((n) => { S.profileNames = n; emit('names'); });
  });
  subInbox();
  sub('photos', db.collection('photos'), (s) => { S.data.photos = docsOf(s); });
  sub('lockers', db.collection('lockers'), (s) => { S.data.lockers = docsOf(s); });
  sub('notes', db.collection('notes'), (s) => { S.data.notes = docsOf(s); });
  sub('contacts', db.collection('contacts'), (s) => { S.data.contacts = docsOf(s); });
  sub('dates', db.collection('dates'), (s) => { S.data.dates = docsOf(s); checkBrowserReminders(); });
  sub('profiles', db.collection('profiles'), (s) => { const o = {}; for (const d of s.docs) o[d.id] = d.data(); S.data.profiles = o; });
  sub('events', db.collection('events'), (s) => { S.data.events = docsOf(s); });
  let first = true;
  sub('mine', myPrivColl(), (s) => {
    const all = docsOf(s);
    S.data.mine = all;
    const p = all.find((d) => d.id === 'prefs');
    S.prefs = p || {};
    if (first && s.metadata && !s.metadata.fromCache) { first = false; S.bootLastSeen = S.prefs.lastSeenTs || 0; }
    else if (first && !s.metadata) { first = false; S.bootLastSeen = S.prefs.lastSeenTs || 0; }
  });
}

/* ---------- prefs ---------- */
let prefsWriting = Promise.resolve();
function savePrefs(patch) {
  const ref = myPrivColl().doc('prefs');
  prefsWriting = prefsWriting.then(async () => {
    const exists = S.data.mine.some((d) => d.id === 'prefs');
    S.prefs = { ...S.prefs, ...patch };
    try {
      if (exists) await ref.update(patch); else await ref.set({ kind: 'prefs', ...S.prefs });
    } catch (e) { console.warn('prefs', e); }
  });
  return prefsWriting;
}
let seenT = null, seenPending = 0;
function markSeen(ts) {
  if (ts <= (S.prefs.lastSeenTs || 0)) return;
  seenPending = Math.max(seenPending, ts);
  if (!seenT) seenT = setTimeout(flushSeen, 1200);
}
function flushSeen() {
  clearTimeout(seenT); seenT = null;
  if (seenPending > (S.prefs.lastSeenTs || 0)) savePrefs({ lastSeenTs: seenPending });
}
addEventListener('pagehide', () => seenT && flushSeen());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && seenT) flushSeen(); });

function unreadCount() {
  const last = S.prefs.lastSeenTs || 0;
  return S.data.inbox.filter((m) => m.seat !== S.me.seat && m.ts > last && !m.del).length;
}

/* ---------- reminders (browser notifications after opt-in) ---------- */
function checkBrowserReminders() {
  if (!S.prefs.notify || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const fired = lsGet('oss.fired', {});
  for (const r of activeReminders()) {
    const key = r.ev.id + ':' + isoOf(r.next);
    if (fired[key]) continue;
    try { new Notification(r.ev.title, { body: r.text }); fired[key] = 1; } catch {}
  }
  lsSet('oss.fired', fired);
}

/* ---------- shell ---------- */
function startApp(seat) {
  S.me.seat = seat;
  const demo = S.st.mode === 'local';
  root().innerHTML = `<div class="app ${demo ? 'has-demo' : ''}">
    ${demo ? `<div class="demo-bar"><span>${window.OSS_STANDALONE ? 'Writing as' : 'Demo mode: saved in this browser only. Viewing as'}</span>
      <span class="sw" role="group" aria-label="Who is writing"><button data-p="A" aria-pressed="${seat === 'A'}">${esc(nameOf('A'))}</button><button data-p="B" aria-pressed="${seat === 'B'}">${esc(nameOf('B'))}</button></span><button class="db-lock" data-lock type="button">${PIN.has(seat) ? 'Lock' : 'Set my PIN'}</button>${window.OSS_STANDALONE ? '<span class="db-note">Saved on this phone</span>' : ''}</div>` : ''}
    <aside class="side" aria-label="Main">
      <span class="wordmark">Vice Space</span>
      <div class="tag" id="sideTag"></div>
      <nav>${NAV.map(([k, l, i]) => `<a href="#${k}" data-nav="${k}">${icon(i)}<span>${l}</span>${k === 'inbox' ? '<span class="badge" id="badgeSide" hidden></span>' : ''}</a>`).join('')}</nav>
      ${SKYLINE}
    </aside>
    <header class="sky">${palm('l')}${palm('r')}<div class="title-wrap"><span class="wordmark" id="skyTitle"></span><span class="where" id="skyWhere"></span></div></header>
    <main class="main" id="main"><div class="view" id="view" tabindex="-1"></div></main>
    <nav class="tabs" aria-label="Main">
      ${TAB_NAV.map((k) => { const [, l, i] = NAV.find((n) => n[0] === k); return `<a href="#${k}" data-nav="${k}">${icon(i)}<span>${k === 'dates' ? 'Dates' : l}</span>${k === 'inbox' ? '<span class="badge" id="badgeTab" hidden></span>' : ''}</a>`; }).join('')}
      <button type="button" data-nav="more" id="moreBtn">${icon('more')}<span>More</span></button>
    </nav>
  </div>`;
  if (demo) {
    $$('.demo-bar [data-p]').forEach((b) => (b.onclick = () => PIN.switchTo(b.dataset.p)));
    const lk = $('.demo-bar [data-lock]');
    lk.onclick = async () => {
      if (PIN.has(S.me.seat)) { PIN.lockScreen(); return; }
      if (await PIN.ask(S.me.seat, 'create')) { PIN.markUnlocked(); lk.textContent = 'Lock'; toast('PIN saved — only you can write as ' + nameOf(S.me.seat)); }
    };
  }
  $('#moreBtn').onclick = openMore;
  startSubs();
  onData(() => { updateChrome(); });
  window.addEventListener('hashchange', route);
  route();
  if (demo) PIN.guard();
}

function openMore() {
  openModal({
    title: 'More',
    body: `<div class="more-sheet">${NAV.filter(([k]) => !TAB_NAV.includes(k)).map(([k, l, i]) => `<a href="#${k}">${icon(i)}${l}</a>`).join('')}</div>`,
    onMount: (m, close) => $$('a', m).forEach((a) => a.addEventListener('click', () => close())),
  });
}

function updateChrome() {
  const n = S.view === 'inbox' ? 0 : unreadCount();
  for (const id of ['badgeSide', 'badgeTab']) { const b = document.getElementById(id); if (b) { b.hidden = !n; b.textContent = n > 99 ? '99+' : n; } }
  const p = partnerSeat();
  const tag = S.members[p] ? `${nameOf(S.me.seat)} & ${nameOf(p)}` : `${nameOf(S.me.seat)} · waiting for your partner`;
  const t = $('#sideTag'); if (t) t.textContent = tag;
  $$('.demo-bar [data-p]').forEach((x) => { x.textContent = nameOf(x.dataset.p); });
}

let current = null;
function route() {
  const key = (location.hash || '#inbox').slice(1);
  const k = VIEWS[key] ? key : 'inbox';
  if (current && current.unmount) current.unmount();
  while (modalStack.length) modalStack[modalStack.length - 1]();
  S.view = k;
  const v = VIEWS[k];
  current = v;
  SCENES.set(k);
  $$('[data-nav]').forEach((a) => a.toggleAttribute('aria-current', false));
  $$(`[data-nav="${k}"]`).forEach((a) => a.setAttribute('aria-current', 'page'));
  const more = $('#moreBtn');
  if (more && !TAB_NAV.includes(k)) more.setAttribute('aria-current', 'page');
  const label = NAV.find((n) => n[0] === k)[1];
  $('#skyTitle').textContent = label;
  $('#skyWhere').textContent = k === 'inbox' && S.members[partnerSeat()] ? `You & ${nameOf(partnerSeat())}` : 'Vice Space';
  document.title = `${label} · Vice Space`;
  const el = $('#view');
  el.className = 'view' + (v.flush ? ' flush' : '');
  el.scrollTop = 0;
  el.innerHTML = '';
  v.mount(el);
  updateChrome();
}

const pageHead = (title, sub, actions = '') =>
  `<div class="page-head"><div><h1 class="h-script">${esc(title)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div><div class="row">${actions}</div></div>`;

/* mobile-visible action row (page-head is desktop only) */
const mobileActions = (html) => `<div class="toolbar mob-only">${html}</div>`;
