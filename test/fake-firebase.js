// Minimal in-browser stand-in for the Firebase compat SDK (auth, firestore, storage),
// with Firestore semantics that matter to Enko: update() needs an existing doc and
// takes FieldPath/value pairs; set() replaces; live snapshots; transactions.
(() => {
  const KEY = 'fakefs', AKEY = 'fakeauth', UKEY = 'fakeusers', BKEY = 'fakeblobs';
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  let data = load(KEY, {});
  const listeners = new Set();
  const notify = () => { save(KEY, data); for (const l of [...listeners]) setTimeout(() => listeners.has(l) && l(), 0); };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const err = (code) => Object.assign(new Error(code), { code });
  class FieldPath { constructor(...s) { this.s = s; } }
  const meta = { fromCache: false, hasPendingWrites: false };
  const dsnap = (path) => ({ id: path.split('/').pop(), exists: !!data[path], data: () => (data[path] ? clone(data[path]) : undefined), metadata: meta });
  function applyUpdate(path, args) {
    if (!data[path]) throw err('not-found');
    const d = clone(data[path]);
    for (let i = 0; i < args.length; i += 2) {
      const segs = args[i] instanceof FieldPath ? args[i].s : String(args[i]).split('.');
      let o = d; for (const s of segs.slice(0, -1)) { if (typeof o[s] !== 'object' || o[s] === null || Array.isArray(o[s])) o[s] = {}; o = o[s]; }
      o[segs[segs.length - 1]] = clone(args[i + 1]);
    }
    data[path] = d;
  }
  function docRef(path) {
    return {
      id: path.split('/').pop(), path,
      async get() { await tick(); return dsnap(path); },
      async set(v, o) { await tick(); data[path] = o && o.merge ? { ...(data[path] || {}), ...clone(v) } : clone(v); notify(); },
      async update(...a) { await tick(); applyUpdate(path, a); notify(); },
      async delete() { await tick(); delete data[path]; notify(); },
      onSnapshot(next) { const l = () => next(dsnap(path)); listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l); },
    };
  }
  const tick = () => new Promise((r) => setTimeout(r, 15));
  function query(path, st) {
    const run = () => {
      const depth = path.split('/').length + 1;
      let rows = Object.keys(data).filter((p) => p.startsWith(path + '/') && p.split('/').length === depth).map((p) => [p, data[p]]);
      for (const [f, op, v] of st.w) rows = rows.filter(([, d]) => (op === '==' ? d[f] === v : true));
      if (st.o) rows.sort((a, b) => (a[1][st.o[0]] < b[1][st.o[0]] ? -1 : 1) * (st.o[1] === 'desc' ? -1 : 1));
      else rows.sort((a, b) => (a[0] < b[0] ? -1 : 1));
      if (st.l) rows = rows.slice(0, st.l);
      const docs = rows.map(([p]) => dsnap(p));
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: meta };
    };
    return {
      where: (f, op, v) => query(path, { ...st, w: [...st.w, [f, op, v]] }),
      orderBy: (f, d) => query(path, { ...st, o: [f, d || 'asc'] }),
      limit: (n) => query(path, { ...st, l: n }),
      async get() { await tick(); return run(); },
      onSnapshot(next) { const l = () => next(run()); listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l); },
    };
  }
  const fs = {
    async enablePersistence() {},
    doc: docRef,
    collection: (p) => query(p, { w: [], o: null, l: 0 }),
    async runTransaction(fn) {
      const tx = { get: async (r) => dsnap(r.path), set: (r, v) => { data[r.path] = clone(v); }, update: (r, ...a) => applyUpdate(r.path, a) };
      const out = await fn(tx); notify(); return out;
    },
  };
  // auth
  let user = load(AKEY, null);
  const authL = new Set();
  const setUser = (u) => { user = u; save(AKEY, u); for (const l of authL) l(u); };
  const auth = {
    get currentUser() { return user; },
    onAuthStateChanged(cb) { authL.add(cb); setTimeout(() => cb(user), 0); return () => authL.delete(cb); },
    async createUserWithEmailAndPassword(email, pw) { const us = load(UKEY, {}); if (us[email]) throw err('auth/email-already-in-use'); us[email] = { pw, uid: 'uid_' + Math.random().toString(36).slice(2, 10) }; save(UKEY, us); setUser({ uid: us[email].uid, email }); },
    async signInWithEmailAndPassword(email, pw) { const us = load(UKEY, {}); if (!us[email] || us[email].pw !== pw) throw err('auth/invalid-credential'); setUser({ uid: us[email].uid, email }); },
    async sendPasswordResetEmail() {},
    async signOut() { setUser(null); },
  };
  // storage (blobs as data URLs in memory + localStorage index)
  const blobs = new Map();
  const storage = {
    ref(p) {
      return {
        async put(b) { const u = URL.createObjectURL(b); blobs.set(p, u); const idx = load(BKEY, {}); idx[p] = 1; save(BKEY, idx); },
        async getDownloadURL() { if (!blobs.has(p)) throw err('storage/object-not-found'); return blobs.get(p); },
        async delete() { blobs.delete(p); },
      };
    },
  };
  const firestore = () => fs; firestore.FieldPath = FieldPath;
  window.firebase = { apps: [], initializeApp(c) { this.apps.push(c); return {}; }, app() { return {}; }, auth: () => auth, firestore, storage: () => storage };
  window.__fakeData = () => data;
})();
