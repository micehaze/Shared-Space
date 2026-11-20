/* ============================================================
   Settings: members, notifications, storage, export, privacy, install
   ============================================================ */
VIEWS.account = {
  mount(el) {
    const draw = async () => {
      const seatCard = (s) => {
        const m = S.members[s];
        if (!m) return `<div class="seat free"><div class="n">Empty seat</div><p style="margin:4px 0 0">Share this page with one person. The first to open it takes this seat.</p></div>`;
        return `<div class="seat ${s}"><div class="n">${esc(nameOf(s))}</div><p style="margin:4px 0 0;font-weight:600">${s === S.me.seat ? 'You' : 'Your partner'} · joined ${esc(fmtDate(new Date(m.joinedAt || Date.now())))}</p>
          ${s === S.me.seat ? `<button class="btn sm ghost" style="margin-top:10px" data-nick>${icon('edit')}Change my name</button>` : ''}</div>`;
      };
      const notifSupported = typeof Notification !== 'undefined';
      const notifOn = !!(S.prefs.notify && notifSupported && Notification.permission === 'granted');
      el.innerHTML = `${pageHead('Settings', 'Who’s here, what’s shared, and how to take the space with you.')}
      <div class="set-sec">
        <h2 class="sec" style="margin-top:0">The two of you</h2>
        <div class="seats">${seatCard('A')}${seatCard('B')}</div>
        ${S.st.mode === 'cloud' ? `<p class="hint" style="margin-top:12px">To invite your partner, use Share on this page in Claude and add them by email. Give them Editor access so they can upload photos and files. Only two people can ever join.</p>`
          : S.st.mode === 'firebase' ? `<p class="hint" style="margin-top:12px">Signed in as ${esc(S.st.email || '')}. To invite your partner, have them install Vice Space and create an account — the first new account takes the empty seat, then the space locks. Only two people can ever join.</p><button class="btn ghost sm" id="signOut" style="margin-top:8px">Sign out</button>`
            : window.OSS_STANDALONE ? `<p class="hint" style="margin-top:12px">Everything is saved on this phone only — nothing is uploaded. Switch who’s writing at the top of the screen. Uninstalling the app or clearing its storage deletes everything, so download your data now and then.</p>`
              : `<p class="hint" style="margin-top:12px">Demo mode: use the switch at the top to see the space from each side.</p>`}

        <h2 class="sec">Reminders</h2>
        <p style="margin-top:0">Upcoming dates always appear at the top of your inbox, based on the reminder you choose for each date.</p>
        <label class="check"><input type="checkbox" id="notif" ${notifOn ? 'checked' : ''} ${notifSupported ? '' : 'disabled'}> Also alert me in this browser</label>
        ${!notifSupported ? '<p class="hint">This browser or view can’t show alerts.</p>' : ''}

        <h2 class="sec">Storage</h2>
        <div id="stor"><p class="hint">Checking…</p></div>

        <h2 class="sec">Your data</h2>
        <p style="margin-top:0">Download everything you can see — messages, notes, contacts, dates, profiles and file lists — as one JSON file. Photos and documents stay in the space; the export lists them.</p>
        <div class="row"><button class="btn blue" id="exp">${icon('download')}Download my data</button><button class="btn ghost" id="expCopy">Copy as text</button></div>

        <h2 class="sec">Privacy</h2>
        <ul style="padding-left:20px;margin-top:0">
          <li>Messages, photos, contacts, dates, timelines and Kundli pages are shared between the two of you.</li>
          <li>Notes and locker files marked “Keep to myself” are visible only to you.</li>
          <li>Nobody else can open this space unless one of you shares it.</li>
        </ul>
        <button class="btn danger" id="wipeMine">${icon('trash')}Delete my private notes and files</button>
        ${S.st.mode === 'local' ? `<button class="btn ghost" id="wipeAll" style="margin-left:10px">Reset demo</button>` : ''}
        ${S.st.mode === 'firebase' ? `<h2 class="sec">Delete account</h2><p style="margin-top:0">Deletes your login, your private notes and files, and frees your seat in the space. Messages and items you shared stay for your partner.</p><button class="btn danger" id="delAcct">Delete my account</button>` : ''}

        ${window.EnkoAndroid ? '' : `<h2 class="sec">Put it on your phone</h2>
        <p style="margin-top:0"><b>iPhone:</b> open this page in Safari, tap the Share button, then <i>Add to Home Screen</i>.</p>
        <p><b>Android:</b> open this page in Chrome, tap the ⋮ menu, then <i>Add to Home screen</i>.</p>
        <p class="hint">It opens like an app and stays signed in. Both of you see the same space on every device.</p>
`}
      </div>`;
      const nk = $('[data-nick]', el); if (nk) nk.onclick = editNick;
      const so = $('#signOut', el); if (so) so.onclick = async () => { if (await confirmBox('Sign out of Vice Space on this device?', 'Sign out', false)) S.st.signOut(); };
      $('#notif', el).onchange = async (e) => {
        if (e.target.checked) await enableNotifications(); else { await savePrefs({ notify: false }); toast('Browser alerts are off'); }
        draw();
      };
      $('#exp', el).onclick = async () => { const j = await exportJson(); if (await saveFile('vice-space-' + todayISO() + '.json', j, 'application/json')) toast('Export ready'); };
      $('#expCopy', el).onclick = async () => { try { await navigator.clipboard.writeText(await exportJson()); toast('Copied to clipboard'); } catch { toast('Copy isn’t allowed here. Use Download instead.', 'err'); } };
      $('#wipeMine', el).onclick = wipeMine;
      const da = $('#delAcct', el);
      if (da) da.onclick = () => openModal({
        title: 'Delete your account?',
        body: `<p style="margin-top:0">This can’t be undone. Enter your password to confirm.</p><label class="field"><span>Password</span><input id="dpw" type="password" autocomplete="current-password"></label><p class="hint" id="derr" role="alert"></p>`,
        foot: `<button class="btn ghost" data-x2>Cancel</button><button class="btn danger" data-go>Delete my account</button>`,
        onMount: (m, close) => {
          $('[data-x2]', m).onclick = () => close();
          $('[data-go]', m).onclick = async () => {
            const b = $('[data-go]', m); b.disabled = true;
            try { await S.st.deleteAccount($('#dpw', m).value); close(); toast('Account deleted'); setTimeout(() => location.reload(), 800); }
            catch (e) { b.disabled = false; $('#derr', m).textContent = /wrong-password|invalid-credential/.test(e.code || '') ? 'That password isn’t right.' : 'Couldn’t delete the account. Check your connection and try again.'; }
          };
        },
      });
      const wa = $('#wipeAll', el);
      if (wa) wa.onclick = async () => { if (await confirmBox('Erase all demo data in this browser?', 'Reset demo')) { S.st.wipe(); location.reload(); } };
      if (S.st.assets) {
        try {
          const { usage } = await S.st.assets.list();
          const pct = usage.maxBytes ? Math.min(100, (usage.bytes / usage.maxBytes) * 100) : 0;
          $('#stor', el).innerHTML = `<div class="meter" role="img" aria-label="${pct.toFixed(0)}% used"><i style="width:${pct}%"></i></div><p class="hint">${fmtSize(usage.bytes)} of ${fmtSize(usage.maxBytes || 0)} used · ${usage.files} files. Each file can be up to 20 MB.</p>`;
        } catch { $('#stor', el).innerHTML = S.st.mode === 'firebase' ? '<p class="hint">Photos and files are stored in your Firebase project. See usage in the Firebase console under Storage. Each file can be up to 20 MB.</p>' : '<p class="hint">Storage details aren’t available right now.</p>'; }
      } else $('#stor', el).innerHTML = '<p class="hint">You can view files. Ask the space owner for Editor access to upload.</p>';
    };
    draw();
    this.off = onData((k) => (k === 'members' || k === 'names') && draw());
  },
  unmount() { this.off && this.off(); },
};

function editNick() {
  openModal({
    title: 'Your name in this space',
    body: `<label class="field"><span>Name</span><input id="nk" maxlength="40" value="${esc(nameOf(S.me.seat))}"></label>`,
    foot: `<button class="btn ghost" data-x2>Cancel</button><button class="btn" data-s>Save name</button>`,
    onMount: (m, close) => {
      $('[data-x2]', m).onclick = () => close();
      $('[data-s]', m).onclick = async () => {
        const v = $('#nk', m).value.trim(); if (!v) return;
        try { await retryOnce(() => S.st.db.doc('space/members').update({ seats: { [S.me.seat]: { nick: v } } })); toast('Name saved'); close(); } catch (e) { toast(errText(e), 'err'); }
      };
    },
  });
}

async function exportJson() {
  let inbox = S.data.inbox;
  try {
    const snap = await S.st.db.collection('inbox').get();
    inbox = [];
    for (const d of snap.docs) { const b = d.data(); for (const [id, m] of Object.entries(b.msgs || {})) inbox.push({ id, seat: b.seat, ...m }); }
    inbox.sort((a, b) => a.ts - b.ts);
  } catch {}
  const who = (s) => nameOf(s);
  return JSON.stringify({
    exportedAt: new Date().toISOString(), exportedBy: who(S.me.seat),
    members: { A: who('A'), B: who('B') },
    messages: inbox.map((m) => ({ author: who(m.seat), at: new Date(m.ts).toISOString(), text: m.del ? null : m.t, deleted: !!m.del })),
    photos: S.data.photos.map((p) => ({ caption: p.caption, album: p.album, date: p.date, by: who(p.seat), file: p.full })),
    locker: allLockerItems().map((d) => ({ title: d.title, category: d.category, note: d.note, file: d.name, private: d.priv, by: who(d.seat), at: new Date(d.at).toISOString() })),
    notes: allNotes().map((n) => ({ title: n.title, body: n.body, checklist: n.items, pinned: n.pinned, private: n.priv, editedBy: who(n.editedSeat || n.seat), editedAt: new Date(n.editedAt || n.at).toISOString() })),
    contacts: S.data.contacts.map(({ id, seat, at, ...c }) => c),
    dates: S.data.dates.map(({ id, seat, at, ...d }) => d),
    profiles: S.data.profiles,
    timeline: S.data.events.map(({ id, ...e }) => ({ ...e, scope: e.scope === 'shared' ? 'shared' : who(e.scope), seat: undefined })),
  }, null, 2);
}

async function wipeMine() {
  const items = S.data.mine.filter((d) => d.kind === 'note' || d.kind === 'file');
  if (!items.length) { toast('You have no private notes or files'); return; }
  if (!(await confirmBox(`Delete your ${items.length} private notes and files? Shared items stay. This can’t be undone.`, 'Delete my private data'))) return;
  let n = 0;
  for (const d of items) {
    try { await myPrivColl().doc(d.id).delete(); if (d.kind === 'file' && S.st.assets) S.st.assets.delete(d.asset).catch(() => {}); n++; } catch {}
  }
  toast(`Deleted ${n} private item${n === 1 ? '' : 's'}`);
}
