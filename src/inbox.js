/* ============================================================
   Inbox — the emotional centre. Durable, per-day buckets per person.
   ============================================================ */
const Outbox = {
  key: () => 'oss.outbox.' + S.me.id,
  items: null,
  load() {
    if (this.items) return this.items;
    this.items = lsGet(this.key(), []).map((i) => (i.state === 'saving' ? { ...i, state: 'failed', err: 'This message was still saving when the page closed.' } : i));
    return this.items;
  },
  save() { lsSet(this.key(), this.items.filter((i) => i.state !== 'saved')); },
};
const knownBuckets = new Set();
let writeChain = Promise.resolve();
let lastSavedId = null;

function bucketId(ts) { return new Date(ts).toISOString().slice(0, 10) + '~' + S.me.seat; }

function queueWrite(item) {
  item.state = 'saving'; item.err = '';
  Outbox.save(); emit('outbox');
  writeChain = writeChain.then(async () => {
    const bid = bucketId(item.ts);
    const ref = S.st.db.doc('inbox/' + bid);
    const m = { t: item.t, ts: item.ts, by: S.me.id };
    try {
      await retryOnce(async () => {
        let exists = (S.inboxBuckets && S.inboxBuckets[bid]) || knownBuckets.has(bid);
        if (!exists) exists = (await ref.get()).exists;
        if (exists) {
          try { await ref.update({ msgs: { [item.id]: m } }); }
          catch (e) {
            if (e && e.code === 'invalid_argument' && !(await ref.get()).exists) await ref.set({ day: bid.slice(0, 10), seat: S.me.seat, msgs: { [item.id]: m } });
            else throw e;
          }
        } else await ref.set({ day: bid.slice(0, 10), seat: S.me.seat, msgs: { [item.id]: m } });
      });
      knownBuckets.add(bid);
      item.state = 'saved';
      lastSavedId = item.id;
      Outbox.items = Outbox.items.filter((i) => i !== item);
      markSeen(item.ts);
    } catch (e) {
      item.state = 'failed';
      item.err = errText(e);
    }
    Outbox.save(); emit('outbox');
  });
  return writeChain;
}

function sendMessage(text) {
  const ts = Date.now();
  const item = { id: 'm' + ts.toString(36) + Math.random().toString(36).slice(2, 6), t: text, ts, state: 'saving' };
  Outbox.load().push(item);
  return queueWrite(item);
}

async function deleteMessage(m) {
  if (!(await confirmBox('Delete this message for both of you? A “message deleted” marker stays in its place.', 'Delete message'))) return;
  try {
    await retryOnce(() => S.st.db.doc('inbox/' + m.bucket).update({ msgs: { [m.id]: { del: true, t: '' } } }));
    toast('Message deleted');
  } catch (e) { toast(errText(e), 'err'); }
}

function linkify(t) {
  return esc(t).replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
}

VIEWS.inbox = {
  flush: true,
  mount(el) {
    Outbox.load();
    el.innerHTML = `<div class="inbox">
      <div class="inbox-col">
        <div class="inbox-bar">
          <div class="ib-title"><h1 class="h-script">Inbox</h1><p class="sub" id="ibSub"></p></div>
          <a class="next" href="#dates" id="nextUp"></a>
          <button class="icon-btn" id="searchBtn" aria-label="Search messages">${icon('search')}</button>
        </div>
        <div id="remBox"></div>
        <div class="thread" id="thread" role="log" aria-label="Messages" aria-live="polite"></div>
        <form class="composer" id="composer">
          <div class="box">
            <label class="sr" for="draft">Write a message</label>
            <textarea id="draft" rows="1" placeholder="Write something to keep…" maxlength="8000"></textarea>
            <button class="btn" type="submit" id="sendBtn">${icon('send')}<span>Save &amp; send</span></button>
          </div>
          <div class="status"><span id="cStatus"></span><span id="cHint"></span></div>
        </form>
      </div>
      <aside class="rail" id="rail" aria-label="Coming up"></aside>
    </div>`;
    const thread = $('#thread', el);
    const ta = $('#draft', el);
    const dKey = 'oss.draft.' + S.me.id;
    ta.value = lsGet(dKey, '');
    const fine = matchMedia('(pointer: fine)').matches;
    $('#cHint', el).textContent = fine ? 'Enter to send · Shift+Enter for a new line' : '';
    const size = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 4, innerHeight * 0.4) + 'px'; };
    const setStatus = () => {
      const s = $('#cStatus', el);
      if (!s) return;
      if (ta.value.trim()) { s.className = ''; s.textContent = 'Draft — not sent yet'; }
      else if (!s.classList.contains('ok')) s.textContent = '';
    };
    ta.addEventListener('input', () => { size(); lsSet(dKey, ta.value); $('#cStatus', el).classList.remove('ok'); setStatus(); });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && ((fine && !e.shiftKey) || e.metaKey || e.ctrlKey)) { e.preventDefault(); $('#composer', el).requestSubmit(); }
    });
    size(); setStatus();
    $('#composer', el).onsubmit = (e) => {
      e.preventDefault();
      const text = ta.value.replace(/\s+$/, '');
      if (!text.trim()) { ta.focus(); return; }
      ta.value = ''; lsSet(dKey, ''); size();
      const s = $('#cStatus', el); s.className = ''; s.textContent = 'Saving…';
      stick = true;
      sendMessage(text).then(() => {
        const failed = Outbox.items.some((i) => i.state === 'failed');
        if (failed) { s.className = ''; s.textContent = 'Not sent. Your text is kept below — tap Retry.'; }
        else { s.className = 'ok'; s.textContent = '✦ Saved'; setTimeout(() => { if (s.textContent === '✦ Saved') { s.textContent = ''; s.className = ''; } setStatus(); }, 2600); }
      });
      ta.focus();
    };
    $('#searchBtn', el).onclick = openSearch;

    let stick = true, firstPaint = true, scrollToNew = true;
    const render = () => {
      const nearBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 100;
      const prevH = thread.scrollHeight, prevTop = thread.scrollTop;
      const saved = S.data.inbox;
      const ids = new Set(saved.map((m) => m.id));
      Outbox.items = Outbox.items.filter((i) => !(ids.has(i.id) && i.state !== 'saving'));
      const pend = Outbox.items.filter((i) => !ids.has(i.id) || i.state === 'saving').map((i) => ({ ...i, seat: S.me.seat, pending: true }));
      const pendIds = new Set(pend.map((p) => p.id));
      const all = [...saved.filter((m) => !pendIds.has(m.id)), ...pend].sort((a, b) => a.ts - b.ts);
      const loading = !S.loaded.inbox;
      let html = '';
      if (S.inboxHasMore) html += `<div class="older"><button class="btn ghost sm" id="olderBtn">Load older messages</button></div>`;
      if (!all.length) {
        html += loading
          ? `<div class="empty"><strong>Opening your inbox…</strong></div>`
          : `<div class="empty">${icon('star', 'spark')}<strong>Your first page is blank</strong>Write something below and choose Save &amp; send. ${S.members[partnerSeat()] ? esc(nameOf(partnerSeat())) + ' will see it the next time they open the space.' : 'Your partner will see it once they join.'}</div>`;
      }
      if (S.loaded.inbox === 'slow' || S.loaded.inbox === 'error') html = `<div class="banner">${icon('clock')} Can’t reach your messages right now. What you see may be out of date.</div>` + html;
      let lastDay = '', prev = null, newShown = false;
      const lastMine = [...all].reverse().find((m) => m.seat === S.me.seat && !m.pending && !m.del);
      for (const m of all) {
        const dl = dayLabel(m.ts);
        if (dl !== lastDay) { html += `<div class="day-sep">${esc(dl)}</div>`; lastDay = dl; prev = null; }
        if (!newShown && S.bootLastSeen != null && m.seat !== S.me.seat && m.ts > S.bootLastSeen && !m.pending) {
          html += `<div class="new-sep" id="newSep">${S.bootLastSeen ? 'New since your last visit' : 'New for you'}</div>`; newShown = true; prev = null;
        }
        const mine = m.seat === S.me.seat;
        const grouped = prev && prev.seat === m.seat && m.ts - prev.ts < 5 * 60000;
        const cls = ['msg', mine ? 'mine' : 'theirs', grouped ? 'grouped' : '', m.del ? 'deleted' : '', m.pending ? (m.state === 'failed' ? 'failed' : 'pending') : ''].join(' ');
        html += `<div class="${cls}" id="msg-${esc(m.id)}">`;
        if (!grouped) html += `<div class="meta"><b>${esc(mine ? 'You' : nameOf(m.seat))}</b><time datetime="${new Date(m.ts).toISOString()}" title="${esc(fmtStamp(m.ts))}">${fmtTime(m.ts)}</time>${mine && !m.del && !m.pending ? `<button class="more" data-del="${esc(m.id)}" aria-label="Delete message">${icon('trash')}</button>` : ''}</div>`;
        else if (mine && !m.del && !m.pending) html += `<div class="meta"><button class="more" data-del="${esc(m.id)}" aria-label="Delete message sent ${esc(fmtTime(m.ts))}">${icon('trash')}</button></div>`;
        html += `<div class="bubble">${m.del ? `Message deleted by ${esc(mine ? 'you' : nameOf(m.seat))}` : linkify(m.t)}</div>`;
        if (m.pending && m.state === 'saving') html += `<div class="state">Saving…</div>`;
        else if (m.pending && m.state === 'failed') html += `<div class="state fail" role="alert">Not saved. ${esc(m.err || '')} <button data-retry="${esc(m.id)}">Retry</button><button data-discard="${esc(m.id)}">Discard</button></div>`;
        else if (lastMine && m.id === lastMine.id) html += `<div class="state">${icon('star')} Saved · ${esc(fmtTime(m.ts))}</div>`;
        html += `</div>`;
        prev = m;
      }
      thread.innerHTML = html;
      const ob = $('#olderBtn', thread);
      if (ob) ob.onclick = () => { S.inboxLimit += 60; keepOffset = true; subInbox(); ob.disabled = true; ob.textContent = 'Loading…'; };
      $$('[data-del]', thread).forEach((b) => (b.onclick = () => { const m = S.data.inbox.find((x) => x.id === b.dataset.del); m && deleteMessage(m); }));
      $$('[data-retry]', thread).forEach((b) => (b.onclick = () => { const it = Outbox.items.find((i) => i.id === b.dataset.retry); it && queueWrite(it); }));
      $$('[data-discard]', thread).forEach((b) => (b.onclick = async () => {
        const it = Outbox.items.find((i) => i.id === b.dataset.discard);
        if (!it) return;
        if (!ta.value.trim()) { ta.value = it.t; lsSet(dKey, it.t); size(); setStatus(); }
        Outbox.items = Outbox.items.filter((i) => i !== it); Outbox.save(); emit('outbox');
        toast('Removed. The text is back in the message box.');
      }));
      if (keepOffset) { thread.scrollTop = thread.scrollHeight - prevH + prevTop; keepOffset = false; }
      else if (firstPaint && all.length && !loading && S.bootLastSeen != null) {
        const ns = $('#newSep', thread);
        if (ns && scrollToNew) thread.scrollTop = ns.offsetTop - thread.clientHeight / 3; else thread.scrollTop = thread.scrollHeight;
        firstPaint = false;
      } else if (stick || nearBottom) thread.scrollTop = thread.scrollHeight;
      stick = false;
      if (S.view === 'inbox' && document.visibilityState === 'visible') {
        const lastPartner = [...saved].reverse().find((m) => m.seat !== S.me.seat);
        if (lastPartner) markSeen(lastPartner.ts);
      }
      if (pendingJump) { const id = pendingJump; const t = $('#msg-' + CSS.escape(id), thread); if (t) { pendingJump = null; thread.scrollTop = t.offsetTop - thread.clientHeight / 3; t.classList.add('flash'); } }
    };
    let keepOffset = false;
    const renderSide = () => {
      const ps = partnerSeat();
      $('#ibSub', el).textContent = S.members[ps] ? `Everything you and ${nameOf(ps)} have saved, oldest at the top.` : 'Your partner will see everything here once they join.';
      const ups = upcoming(5);
      const nx = $('#nextUp', el);
      if (ups[0]) nx.innerHTML = `${icon('calendar')}<span><b>${esc(relDays(ups[0].days))}</b> · ${esc(ups[0].ev.title)}</span>`;
      else nx.innerHTML = `${icon('calendar')}<span>Add a birthday or anniversary</span>`;
      $('#rail', el).innerHTML = `<h2 class="sec" style="margin-top:0">Coming up</h2>${upcomingList(ups)}<p style="margin-top:18px"><a class="btn ghost sm" href="#dates">${icon('plus')}Add a date</a></p>`;
      bindUpcoming($('#rail', el));
      const rems = activeReminders().filter((r) => !lsGet('oss.dismiss', {})[r.key]);
      $('#remBox', el).innerHTML = rems.length ? `<div class="reminders" style="margin:0;padding:10px calc(16px + var(--safe-r)) 0 calc(16px + var(--safe-l))">${rems.map((r) => `<div class="reminder" role="status">${icon('bell')}<div style="flex:1">${esc(r.ev.title)}<small>${esc(r.text)}</small></div><button class="icon-btn" data-dis="${esc(r.key)}" aria-label="Dismiss reminder">${icon('close')}</button></div>`).join('')}</div>` : '';
      $$('[data-dis]', el).forEach((b) => (b.onclick = () => { const d = lsGet('oss.dismiss', {}); d[b.dataset.dis] = 1; lsSet('oss.dismiss', d); renderSide(); }));
    };
    render(); renderSide();
    this.off = onData((k) => {
      if (k === 'inbox' || k === 'outbox' || k === 'members' || k === 'names' || k === 'mine') render();
      if (k === 'dates' || k === 'mine' || k === 'members' || k === 'names') renderSide();
    });
    this.vis = () => { if (document.visibilityState === 'visible') render(); };
    document.addEventListener('visibilitychange', this.vis);
    if (!fine) setTimeout(() => {}, 0); else ta.focus();
  },
  unmount() { this.off && this.off(); document.removeEventListener('visibilitychange', this.vis); },
};
let pendingJump = null;

/* ---------- search ---------- */
function openSearch() {
  const p = partnerSeat();
  openModal({
    title: 'Search messages', wide: true,
    body: `<div class="row">
        <label class="field" style="flex:2 1 220px"><span>Words</span><input id="sq" type="search" placeholder="e.g. Goa, passport, dinner" autofocus></label>
        <label class="field"><span>Written by</span><select id="sw"><option value="">Either of you</option><option value="${S.me.seat}">You</option><option value="${p}">${esc(nameOf(p))}</option></select></label>
      </div>
      <div class="row">
        <label class="field"><span>From</span><input id="sf" type="date"></label>
        <label class="field"><span>To</span><input id="st" type="date"></label>
      </div>
      <div id="sres" aria-live="polite"><p class="hint">Loading your full history…</p></div>`,
    onMount: async (m, close) => {
      let all = [];
      try {
        const snap = await retryOnce(() => S.st.db.collection('inbox').get());
        for (const d of snap.docs) { const b = d.data(); for (const [id, x] of Object.entries(b.msgs || {})) if (!x.del) all.push({ id, seat: b.seat, bucket: d.id, ...x }); }
      } catch (e) { all = S.data.inbox.filter((x) => !x.del); }
      all.sort((a, b) => b.ts - a.ts);
      const run = () => {
        const q = $('#sq', m).value.trim().toLowerCase();
        const w = $('#sw', m).value, f = $('#sf', m).value, t = $('#st', m).value;
        const from = f ? parseISO(f).getTime() : 0, to = t ? parseISO(t).getTime() + 86400000 : Infinity;
        const res = all.filter((x) => (!q || x.t.toLowerCase().includes(q)) && (!w || x.seat === w) && x.ts >= from && x.ts < to);
        const hl = (s) => { const e = esc(s); if (!q) return e; const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&/g, '&amp;').replace(/</g, '&lt;') + ')', 'gi'); return e.replace(re, '<mark>$1</mark>'); };
        $('#sres', m).innerHTML = !q && !w && !f && !t
          ? `<p class="hint">${all.length} saved messages. Type a word or pick dates to search.</p>`
          : res.length
            ? `<p class="hint">${res.length} found</p><div class="rows">${res.slice(0, 200).map((x) => `<button class="rowi" style="grid-template-columns:1fr auto" data-j="${esc(x.id)}"><div style="min-width:0"><div class="s"><b style="color:var(--frost)">${esc(x.seat === S.me.seat ? 'You' : nameOf(x.seat))}</b> · ${esc(fmtStamp(x.ts))}</div><div style="white-space:pre-wrap;margin-top:4px">${hl(x.t.length > 400 ? x.t.slice(0, 400) + '…' : x.t)}</div></div><span class="r">Show</span></button>`).join('')}</div>`
            : `<div class="empty"><strong>Nothing matches</strong>Try fewer words or a wider date range.</div>`;
        $$('[data-j]', m).forEach((b) => (b.onclick = () => {
          pendingJump = b.dataset.j; close();
          if (S.inboxLimit < 1000) { S.inboxLimit = 1000; subInbox(); } else emit('inbox');
        }));
      };
      ['input', 'change'].forEach((ev) => $$('input,select', m).forEach((i) => i.addEventListener(ev, run)));
      run();
    },
  });
}
