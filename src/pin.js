/* ============================================================
   Personal PINs for the shared-phone mode.
   Each person has their own 4–6 digit PIN. Switching to the
   other person, and opening the app after time away, needs that
   person's PIN, so nobody can write, upload or create a Kundali
   as their partner.
   ============================================================ */
const PIN = (() => {
  const KEY = (seat) => 'oss.pin.' + seat;
  const UNLOCK = 'oss.unlockedAt', AWAY_MS = 5 * 60 * 1000, FRESH_MS = 5 * 60 * 1000;
  const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  async function hash(seat, pin) {
    const data = new TextEncoder().encode('vice-space-pin|' + seat + '|' + pin);
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', data);
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 2166136261; for (const c of data) { h ^= c; h = Math.imul(h, 16777619) >>> 0; } return 'f' + h.toString(16);
  }
  const has = (seat) => !!get(KEY(seat));
  async function set(seat, pin) { put(KEY(seat), await hash(seat, pin)); }
  async function check(seat, pin) { return get(KEY(seat)) === (await hash(seat, pin)); }
  const markUnlocked = () => put(UNLOCK, String(Date.now()));
  const fresh = () => Date.now() - Number(get(UNLOCK) || 0) < FRESH_MS;
  const valid = (p) => /^\d{4,6}$/.test(p);
  let fails = 0, lockedUntil = 0;

  // one dialog for create / enter
  function ask(seat, mode, { closable = true } = {}) {
    const who = nameOf(seat);
    return new Promise((resolve) => {
      openModal({
        title: mode === 'create' ? `Set ${who}’s PIN` : `${who}’s PIN`, label: 'PIN',
        body: `<form id="pinf" autocomplete="off">
          ${mode === 'create' ? `<p style="margin-top:0">Only <b>${esc(who)}</b> should choose this. It stops anyone else from writing, uploading or creating a Kundali as ${esc(who)}.</p>` : `<p style="margin-top:0">Enter <b>${esc(who)}</b>’s PIN to continue as ${esc(who)}.</p>`}
          <label class="field"><span>${mode === 'create' ? 'New PIN (4–6 digits)' : 'PIN'}</span><input id="pin1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" required></label>
          ${mode === 'create' ? '<label class="field"><span>Repeat the PIN</span><input id="pin2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" required></label>' : ''}
          <p class="hint" id="pinErr" role="alert"></p>
          ${mode === 'enter' ? '<p class="hint">Forgot it? A PIN can only be removed by deleting all data on this phone (Settings → Delete everything).</p>' : ''}
        </form>`,
        foot: `${closable ? '<button class="btn ghost" data-x2>Cancel</button>' : ''}<button class="btn" data-ok>${mode === 'create' ? 'Save PIN' : 'Unlock'}</button>`,
        onMount: (m, close) => {
          const err = (t) => { $('#pinErr', m).textContent = t; };
          const go = async () => {
            const p1 = $('#pin1', m).value.trim();
            if (mode === 'create') {
              const p2 = $('#pin2', m).value.trim();
              if (!valid(p1)) return err('Use 4 to 6 digits.');
              if (p1 !== p2) return err('The two PINs don’t match.');
              await set(seat, p1); close(true); return;
            }
            if (Date.now() < lockedUntil) return err(`Too many attempts. Try again in ${Math.ceil((lockedUntil - Date.now()) / 1000)} s.`);
            if (await check(seat, p1)) { fails = 0; close(true); return; }
            fails++; $('#pin1', m).value = '';
            if (fails >= 5) { lockedUntil = Date.now() + 30000; fails = 0; err('Wrong PIN. Wait 30 seconds before trying again.'); } else err('Wrong PIN.');
          };
          $('[data-ok]', m).onclick = go;
          $('#pinf', m).onsubmit = (e) => { e.preventDefault(); go(); };
          const x = $('[data-x2]', m); if (x) x.onclick = () => close(false);
          setTimeout(() => $('#pin1', m).focus(), 50);
        },
        onClose: (v) => resolve(!!v),
      });
    });
  }
  // switch who is writing — always needs the target's PIN
  async function switchTo(seat) {
    if (seat === S.me.seat) return;
    const okd = has(seat) ? await ask(seat, 'enter') : await ask(seat, 'create');
    if (!okd) return;
    markUnlocked();
    S.st.switchPerson(seat);
  }
  // full-screen lock: pick who you are, enter your PIN
  function lockScreen() {
    if (document.querySelector('.pinlock')) return;
    const el = document.createElement('div');
    el.className = 'pinlock';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Vice Space is locked');
    el.innerHTML = `<div class="pinlock-box"><span class="wordmark">Vice Space</span><p>Who’s using the app?</p>
      <div class="pinlock-who">${['A', 'B'].filter((s) => S.members[s]).map((s) => `<button class="btn${s === S.me.seat ? '' : ' ghost'}" data-who="${s}">${esc(nameOf(s))}</button>`).join('')}</div></div>`;
    document.body.appendChild(el);
    $$('[data-who]', el).forEach((b) => (b.onclick = async () => {
      const seat = b.dataset.who;
      const okd = has(seat) ? await ask(seat, 'enter', { closable: true }) : await ask(seat, 'create', { closable: true });
      if (!okd) return;
      markUnlocked();
      if (seat !== S.me.seat) { S.st.switchPerson(seat); return; }
      el.remove();
    }));
  }
  function guard() {
    if (S.st.mode !== 'local') return;
    if (has(S.me.seat) && !fresh()) lockScreen(); else markUnlocked();
    setInterval(() => { if (!document.hidden && !document.querySelector('.pinlock')) markUnlocked(); }, 30000);
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { hiddenAt = Date.now(); markUnlocked(); return; }
      if (hiddenAt && Date.now() - hiddenAt > AWAY_MS && has(S.me.seat)) lockScreen();
    });
  }
  return { has, set, check, ask, switchTo, lockScreen, guard, markUnlocked, valid };
})();
