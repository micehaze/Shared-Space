/* ============================================================
   Firebase backend for the Android / self-hosted app.
   Exposes the same interface as the claude.ai capabilities
   (db / assets / user), so every screen works unchanged.
   Needs: window.firebase (compat SDK) + window.ENKO_FIREBASE config.
   ============================================================ */
const FirebaseStore = (() => {
  const mapErr = (e) => {
    const c = (e && e.code) || '';
    const code = /permission-denied|not-found|invalid-argument|failed-precondition/.test(c) ? 'invalid_argument'
      : /resource-exhausted/.test(c) ? 'resource_exhausted'
        : /unauthenticated/.test(c) ? 'revoked'
          : /storage\/unauthorized/.test(c) ? 'invalid_argument'
            : /storage\/quota-exceeded/.test(c) ? 'quota_or_state'
              : 'unavailable';
    return Object.assign(new Error((e && e.message) || code), { code, cause: e });
  };
  const wrapDoc = (s) => ({ id: s.id, exists: s.exists, data: () => (s.exists ? s.data() : undefined), metadata: { fromCache: s.metadata.fromCache, hasPendingWrites: s.metadata.hasPendingWrites } });
  const wrapQuery = (s) => ({ docs: s.docs.map(wrapDoc), size: s.size, empty: s.empty, docChanges: () => s.docChanges().map((c) => ({ type: c.type, doc: wrapDoc(c.doc), oldIndex: c.oldIndex, newIndex: c.newIndex })), metadata: { fromCache: s.metadata.fromCache, hasPendingWrites: s.metadata.hasPendingWrites } });
  const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
  // {a:{b:1,c:{d:2}}} → [[['a','b'],1],[['a','c','d'],2]]  (deep-merge semantics, like the claude.ai store)
  function flatten(obj, pre = [], out = []) {
    for (const [k, v] of Object.entries(obj)) {
      if (isPlain(v) && Object.keys(v).length) flatten(v, [...pre, k], out);
      else out.push([[...pre, k], v === undefined ? null : v]);
    }
    return out;
  }
  const clean = (v) => JSON.parse(JSON.stringify(v)); // drop undefined, freeze-safe

  function makeDb(fs) {
    function docRef(path) {
      const r = fs.doc(path);
      return {
        id: r.id, path,
        async get() { try { return wrapDoc(await r.get()); } catch (e) { throw mapErr(e); } },
        async set(body) { try { await r.set(clean(body)); } catch (e) { throw mapErr(e); } },
        async update(body) {
          const pairs = flatten(clean(body));
          if (!pairs.length) return;
          const args = [];
          for (const [p, v] of pairs) args.push(new firebase.firestore.FieldPath(...p), v);
          try { await r.update(...args); } catch (e) { throw mapErr(e); }
        },
        async delete() { try { await r.delete(); } catch (e) { throw mapErr(e); } },
        async acquire() { return { acquired: true }; },
        onSnapshot(next, err) { return r.onSnapshot((s) => next(wrapDoc(s)), (e) => err && err(mapErr(e))); },
        collection(sub) { return collRef(path + '/' + sub); },
      };
    }
    function q(base, path) {
      return {
        where: (f, op, v) => q(base.where(f, op, v), path),
        orderBy: (f, d = 'asc') => q(base.orderBy(f, d), path),
        limit: (n) => q(base.limit(n), path),
        async get() { try { return wrapQuery(await base.get()); } catch (e) { throw mapErr(e); } },
        onSnapshot(next, err) { return base.onSnapshot((s) => next(wrapQuery(s)), (e) => err && err(mapErr(e))); },
      };
    }
    function collRef(path) {
      const c = fs.collection(path);
      return Object.assign(q(c, path), {
        path,
        doc: (id) => docRef(path + '/' + (id || Store.uid())),
        async add(body) { const d = docRef(path + '/' + Store.uid()); await d.set(body); return d; },
      });
    }
    return { doc: docRef, collection: collRef };
  }

  function makeAssets(st) {
    const cache = new Map();
    return {
      async upload(blob, opts = {}) {
        if (blob.size > 20 * 1024 * 1024) throw { code: 'too_large' };
        const id = 'enko/' + Store.uid() + Store.uid();
        const type = opts.type || blob.type || 'application/octet-stream';
        try {
          const ref = st.ref(id);
          await ref.put(blob, { contentType: type, cacheControl: 'private, max-age=31536000' });
          const url = await ref.getDownloadURL();
          cache.set(id, url);
          return { id, url, sizeBytes: blob.size, contentType: type };
        } catch (e) { throw mapErr(e); }
      },
      async list() { throw { code: 'capability_removed' }; },
      async delete(id) { try { await st.ref(id).delete(); cache.delete(id); return { deleted: true }; } catch (e) { if (/object-not-found/.test(e.code)) return { deleted: false }; throw mapErr(e); } },
      async resolve(id) {
        if (cache.has(id)) return cache.get(id);
        try { const u = await st.ref(id).getDownloadURL(); cache.set(id, u); return u; } catch { return null; }
      },
    };
  }

  async function init() {
    const cfg = window.ENKO_FIREBASE;
    if (!cfg || !window.firebase) return null;
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
    const auth = firebase.auth();
    const fs = firebase.firestore();
    try { await fs.enablePersistence({ synchronizeTabs: false }); } catch {}
    const user = await new Promise((res) => { const un = auth.onAuthStateChanged((u) => { un(); res(u); }); });
    void app;
    if (!user) return { mode: 'firebase', ok: false, needAuth: true, auth };
    const db = makeDb(fs);
    const assets = makeAssets(firebase.storage());
    return {
      mode: 'firebase', ok: true, db, assets, downloads: null, myId: user.uid, email: user.email, auth,
      assetUrl: () => '',
      resolveAsset: (aid) => assets.resolve(aid),
      async names() { return {}; },
      signOut: () => auth.signOut().then(() => location.reload()),
      // Play policy: in-app account deletion. Removes private data and the seat, then the login.
      async deleteAccount(password) {
        const u = auth.currentUser;
        if (password) await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, password));
        const mine = await fs.collection('data/users/' + u.uid).get();
        for (const d of mine.docs) await d.ref.delete();
        await fs.runTransaction(async (tx) => {
          const ref = fs.doc('space/members'); const snap = await tx.get(ref);
          if (!snap.exists) return;
          const dta = snap.data(); const seat = ['A', 'B'].find((k) => dta.seats && dta.seats[k] && dta.seats[k].id === u.uid);
          if (!seat) return;
          tx.update(ref, new firebase.firestore.FieldPath('seats', seat), firebase.firestore.FieldValue.delete(), 'ids', (dta.ids || []).filter((x) => x !== u.uid));
        });
        await u.delete();
      },
      // Seats are claimed in a transaction so two people can't take the same one
      async claimSeat(nick) {
        const ref = fs.doc('space/members');
        return fs.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          const data = snap.exists ? snap.data() : { seats: {}, ids: [] };
          const seats = data.seats || {}, ids = data.ids || [];
          const have = ['A', 'B'].find((k) => seats[k] && seats[k].id === user.uid);
          if (have) return have;
          const seat = !seats.A ? 'A' : !seats.B ? 'B' : null;
          if (!seat) return null;
          const entry = { id: user.uid, nick, joinedAt: Date.now() };
          if (snap.exists) tx.update(ref, new firebase.firestore.FieldPath('seats', seat), entry, 'ids', [...ids, user.uid]);
          else tx.set(ref, { seats: { [seat]: entry }, ids: [user.uid] });
          return seat;
        }).catch((e) => { throw mapErr(e); });
      },
    };
  }

  /* ---------- sign-in screen ---------- */
  function authGate(auth, done) {
    let mode = 'in';
    const draw = (msg = '') => {
      gate(`<span class="wordmark">Vice Space</span>
        <p>${mode === 'in' ? 'Sign in to your shared space.' : mode === 'up' ? 'Create your account. You’ll pick the name your partner sees next.' : 'Enter your email and we’ll send a link to reset your password.'}</p>
        <form id="af" novalidate>
          <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" required></label>
          ${mode !== 'reset' ? `<label class="field"><span>Password</span><input name="pw" type="password" autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}" minlength="8" required></label>` : ''}
          <p class="hint" id="aerr" role="alert" style="color:#8E1B2E;min-height:1em">${esc(msg)}</p>
          <button class="btn" type="submit" style="width:100%">${mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}</button>
        </form>
        <p style="margin:16px 0 0;display:flex;gap:14px;flex-wrap:wrap">
          ${mode !== 'in' ? '<button class="linkish" data-m="in">I have an account</button>' : '<button class="linkish" data-m="up">Create an account</button><button class="linkish" data-m="reset">Forgot password?</button>'}
        </p>`);
      $$('[data-m]').forEach((b) => (b.onclick = () => { mode = b.dataset.m; draw(); }));
      $('#af').onsubmit = async (e) => {
        e.preventDefault();
        const f = e.target, email = f.email.value.trim(), pw = f.pw ? f.pw.value : '';
        if (!/^\S+@\S+\.\S+$/.test(email)) return draw('Enter a valid email address.');
        if (mode !== 'reset' && pw.length < 8) return draw('Use at least 8 characters for the password.');
        const btn = $('button[type=submit]', f); btn.disabled = true;
        try {
          if (mode === 'in') await auth.signInWithEmailAndPassword(email, pw);
          else if (mode === 'up') await auth.createUserWithEmailAndPassword(email, pw);
          else { await auth.sendPasswordResetEmail(email); mode = 'in'; return draw('Reset link sent. Check your email, then sign in.'); }
          done();
        } catch (er) {
          const c = (er && er.code) || '';
          draw(/wrong-password|invalid-credential|user-not-found|invalid-login/.test(c) ? 'That email and password don’t match.'
            : /email-already-in-use/.test(c) ? 'There’s already an account with this email. Sign in instead.'
              : /too-many-requests/.test(c) ? 'Too many attempts. Wait a few minutes and try again.'
                : /network/.test(c) ? 'No connection. Check your internet and try again.' : 'Something went wrong. Try again.');
        }
      };
      setTimeout(() => { const i = $('#af input'); i && i.focus(); }, 30);
    };
    draw();
  }
  return { init, authGate, flatten };
})();
if (typeof module !== 'undefined') module.exports = FirebaseStore;
