/* ============================================================
   Storage layer
   - cloud: claude.ai artifact capabilities (db, user, assets, downloads)
   - local: same API surface, backed by localStorage + IndexedDB
     (used for demo / testing outside claude.ai and for the PWA build)
   ============================================================ */

const Store = (() => {
  const SEG_OK = /^[A-Za-z0-9_\-.~:@+]+$/;

  /* ---------------- local document store ---------------- */
  function makeLocalDb() {
    const KEY = 'oss.db.v1';
    let data = {};
    try { data = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { data = {}; }
    const listeners = new Set();
    const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { console.warn('local save failed', e); } };
    const err = (code, message) => Object.assign(new Error(message), { code, message });
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const segs = (p) => p.split('/');
    const check = (p, even) => {
      const s = segs(p);
      if (s.some((x) => !SEG_OK.test(x) || x === '.' || x === '..')) throw new TypeError('bad path ' + p);
      if ((s.length % 2 === 0) !== even) throw new TypeError('path parity ' + p);
    };
    const deepMerge = (a, b) => {
      const out = { ...a };
      for (const [k, v] of Object.entries(b)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) out[k] = deepMerge(a[k], v);
        else out[k] = v;
      }
      return out;
    };
    const snapOf = (path) => {
      const body = data[path];
      const id = path.split('/').pop();
      const frozen = body ? Object.freeze(clone(body)) : undefined;
      return { id, exists: !!body, data: () => frozen, metadata: { fromCache: false, hasPendingWrites: false } };
    };
    const cmp = (a, b) => (a === b ? 0 : a === undefined ? 1 : b === undefined ? -1 : a < b ? -1 : 1);
    const runQuery = (q) => {
      const depth = segs(q.path).length + 1;
      let rows = Object.keys(data)
        .filter((p) => p.startsWith(q.path + '/') && segs(p).length === depth)
        .map((p) => ({ p, d: data[p] }));
      for (const [f, op, v] of q.filters) {
        rows = rows.filter(({ d }) => {
          const x = d[f];
          switch (op) {
            case '==': return x === v;
            case '!=': return x !== v;
            case '<': return x < v;
            case '<=': return x <= v;
            case '>': return x > v;
            case '>=': return x >= v;
            case 'in': return v.includes(x);
            case 'not-in': return !v.includes(x);
            case 'array-contains': return Array.isArray(x) && x.includes(v);
            default: return true;
          }
        });
      }
      if (q.order) {
        const [f, dir] = q.order;
        rows.sort((a, b) => cmp(a.d[f], b.d[f]) * (dir === 'desc' ? -1 : 1));
      } else rows.sort((a, b) => cmp(a.p, b.p));
      if (q.lim) rows = rows.slice(0, q.lim);
      const docs = rows.map(({ p }) => snapOf(p));
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
    };
    const notify = () => {
      for (const l of [...listeners]) setTimeout(() => { if (listeners.has(l)) l.fire(); }, 0);
    };
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY) return;
      try { data = JSON.parse(e.newValue || '{}') || {}; } catch { data = {}; }
      notify();
    });
    const delay = () => new Promise((r) => setTimeout(r, 60 + Math.random() * 120));

    function docRef(path) {
      check(path, true);
      return {
        id: path.split('/').pop(), path,
        async get() { await delay(); return snapOf(path); },
        async set(body) { data[path] = clone(body); persist(); notify(); await delay(); },
        async update(body) {
          if (!data[path]) { await delay(); throw err('invalid_argument', 'document does not exist'); }
          data[path] = deepMerge(data[path], clone(body)); persist(); notify(); await delay();
        },
        async delete() { delete data[path]; persist(); notify(); await delay(); },
        async acquire() { return { acquired: true, version: 1 }; },
        onSnapshot(next) {
          const l = { fire: () => next(snapOf(path)) };
          listeners.add(l); l.fire();
          return () => listeners.delete(l);
        },
        collection(sub) { return collRef(path + '/' + sub); },
      };
    }
    function query(path, q) {
      return {
        where(f, op, v) { return query(path, { ...q, filters: [...q.filters, [f, op, v]] }); },
        orderBy(f, dir = 'asc') { return query(path, { ...q, order: [f, dir] }); },
        limit(n) { return query(path, { ...q, lim: n }); },
        async get() { await delay(); return runQuery({ path, ...q }); },
        onSnapshot(next) {
          const l = { fire: () => next(runQuery({ path, ...q })) };
          listeners.add(l); setTimeout(() => listeners.has(l) && l.fire(), 30);
          return () => listeners.delete(l);
        },
      };
    }
    function collRef(path) {
      check(path, false);
      return Object.assign(query(path, { filters: [], order: null, lim: 0 }), {
        path,
        doc(id) { return docRef(path + '/' + (id || uid())); },
        async add(body) { const r = docRef(path + '/' + uid()); await r.set(body); return r; },
      });
    }
    return {
      doc: docRef, collection: collRef,
      _wipe() { data = {}; persist(); notify(); },
    };
  }

  /* ---------------- local asset store (IndexedDB) ---------------- */
  function makeLocalAssets() {
    const cache = new Map();
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('oss-assets', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('blobs');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const tx = async (mode, fn) => {
      const db = await open();
      return new Promise((res, rej) => {
        const t = db.transaction('blobs', mode);
        const req = fn(t.objectStore('blobs'));
        t.oncomplete = () => res(req && req.result);
        t.onerror = () => rej(t.error);
      });
    };
    return {
      async upload(blob, opts = {}) {
        if (blob.size > 20 * 1024 * 1024) throw { code: 'too_large', message: 'Over 20 MB' };
        const id = 'L' + uid() + uid();
        const type = opts.type || blob.type || 'application/octet-stream';
        const b = new Blob([blob], { type });
        await tx('readwrite', (s) => s.put({ blob: b, at: Date.now() }, id));
        const url = URL.createObjectURL(b);
        cache.set(id, url);
        return { id, url, sizeBytes: b.size, contentType: type };
      },
      async list() {
        const all = await tx('readonly', (s) => s.getAll());
        const bytes = (all || []).reduce((n, r) => n + (r.blob ? r.blob.size : 0), 0);
        return { assets: [], usage: { files: (all || []).length, bytes, maxFiles: 5000, maxBytes: 500 * 1024 * 1024 } };
      },
      async delete(id) {
        await tx('readwrite', (s) => s.delete(id));
        cache.delete(id);
        return { deleted: true };
      },
      async resolve(id) {
        if (cache.has(id)) return cache.get(id);
        const rec = await tx('readonly', (s) => s.get(id));
        if (!rec) return null;
        const url = URL.createObjectURL(rec.blob);
        cache.set(id, url);
        return url;
      },
    };
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  const withTimeout = (p, ms, fallback = null) =>
    Promise.race([p, new Promise((r) => setTimeout(() => r(fallback), ms))]);

  async function waitForClaude(ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (window.claude && typeof window.claude.use === 'function') return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  }

  /* ---------------- init ---------------- */
  async function init() {
    if (window.ENKO_FIREBASE && typeof FirebaseStore !== 'undefined') { const r = await FirebaseStore.init(); if (r) return r; }
    const inClaude = window.OSS_STANDALONE ? false : await waitForClaude(/^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.protocol === 'file:' ? 600 : 5000);
    if (inClaude) {
      const use = (n) => withTimeout(window.claude.use(n).catch(() => null), 10000);
      const [db, user, assets, downloads] = await Promise.all([use('db'), use('user'), use('assets'), use('downloads')]);
      if (!db || !user) return { mode: 'cloud', ok: false };
      const id = await user.id();
      if (!id) return { mode: 'cloud', ok: false };
      return {
        mode: 'cloud', ok: true, db, user, assets, downloads, myId: id,
        assetUrl: (aid) => (aid ? '/_blob/' + aid : ''),
        resolveAsset: async (aid) => (aid ? '/_blob/' + aid : null),
        async names(ids) {
          try { const ps = await user.profiles(ids.filter(Boolean)); const out = {}; for (const i of ids) out[i] = (ps && ps[i] && ps[i].name) || ''; return out; } catch { return {}; }
        },
      };
    }
    // local / demo
    const db = makeLocalDb();
    const assets = makeLocalAssets();
    let who = 'A';
    try { who = localStorage.getItem('oss.demoPerson') || 'A'; } catch {}
    return {
      mode: 'local', ok: true, db, assets, downloads: null, myId: 'demo-' + who,
      assetUrl: () => '',
      resolveAsset: (aid) => assets.resolve(aid),
      async names() { return {}; },
      switchPerson(seat) { try { localStorage.setItem('oss.demoPerson', seat); } catch {} location.reload(); },
      wipe() { db._wipe(); },
    };
  }

  return { init, uid, withTimeout };
})();
