/* ============================================================
   Document locker
   ============================================================ */
const fileKind = (t) => (t === 'application/pdf' ? 'pdf' : /^image\//.test(t) ? 'img' : 'txt');
function allLockerItems() {
  const shared = S.data.lockers.map((d) => ({ ...d, priv: false }));
  const mine = S.data.mine.filter((d) => d.kind === 'file').map((d) => ({ ...d, priv: true }));
  return [...shared, ...mine].sort((a, b) => (b.at || 0) - (a.at || 0));
}
VIEWS.locker = {
  cat: '',
  q: '',
  mount(el) {
    el.innerHTML = `${pageHead('Locker', 'Important papers, kept safe and easy to find.')}
      <div class="toolbar">
        <button class="btn" id="addDoc">${icon('upload')}Add a file</button>
        <div class="search grow">${icon('search')}<input class="input" id="lq" type="search" placeholder="Search titles, notes, categories" aria-label="Search files"></div>
      </div>
      <div class="chips" role="group" aria-label="Category">${[['', 'All'], ...LOCKER_CATS.map((c) => [c, c])].map(([v, l]) => `<button class="chip" data-c="${v}">${l}</button>`).join('')}</div>
      <div id="lrows"></div>`;
    const add = $('#addDoc', el);
    if (!S.st.assets) add.outerHTML = `<p class="hint">You can open files. To add files, ask the space owner to give you Editor access.</p>`;
    else add.onclick = () => openDocUpload();
    $('#lq', el).value = this.q;
    $('#lq', el).oninput = (e) => { this.q = e.target.value; draw(); };
    $$('[data-c]', el).forEach((b) => (b.onclick = () => { this.cat = b.dataset.c; draw(); }));
    const draw = () => {
      $$('[data-c]', el).forEach((b) => b.setAttribute('aria-pressed', b.dataset.c === this.cat));
      const q = this.q.trim().toLowerCase();
      const all = allLockerItems();
      const list = all.filter((d) => (!this.cat || d.category === this.cat) && (!q || [d.title, d.note, d.category, d.name].join(' ').toLowerCase().includes(q)));
      const box = $('#lrows', el);
      if (!all.length) { box.innerHTML = S.loaded.lockers ? `<div class="empty">${icon('star', 'spark')}<strong>The locker is empty</strong>Add passports, insurance, tickets or anything you’ll need to find fast. PDFs and photos work best.</div>` : '<p class="hint">Loading files…</p>'; return; }
      if (!list.length) { box.innerHTML = `<div class="empty"><strong>No files match</strong>Try another word or category.</div>`; return; }
      box.innerHTML = `<div class="rows">${list.map((d) => `<button class="rowi" data-id="${esc(d.id)}" data-p="${d.priv ? 1 : ''}">
          <span class="ic ${fileKind(d.type)}">${icon(fileKind(d.type) === 'pdf' ? 'pdf' : fileKind(d.type) === 'img' ? 'image' : 'file')}</span>
          <span style="min-width:0"><span class="t">${esc(d.title)}</span><span class="s">${esc(d.category || 'Other')} · ${esc(fmtSize(d.size || 0))} · ${esc(nameOf(d.seat))}</span></span>
          <span class="r">${d.priv ? '<span class="pill priv">Only you</span><br>' : ''}${esc(fmtDate(new Date(d.at), { day: 'numeric', month: 'short', year: '2-digit' }))}</span></button>`).join('')}</div>`;
      $$('[data-id]', box).forEach((b) => (b.onclick = () => { const d = list.find((x) => x.id === b.dataset.id && !!x.priv === !!b.dataset.p); d && openDoc(d); }));
    };
    draw();
    this.off = onData((k) => (k === 'lockers' || k === 'mine' || k === 'names' || k === 'members') && draw());
  },
  unmount() { this.off && this.off(); },
};

function openDocUpload() {
  openModal({
    title: 'Add a file',
    body: `<form id="duf">
      <label class="field"><span>File</span><input type="file" name="file" required accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.md,.json,application/pdf,image/*,text/plain"></label>
      <p class="hint" style="margin-top:-8px;margin-bottom:14px">PDF, JPG, PNG, WebP, GIF or plain text, up to 20 MB. For Word or Excel files, save them as PDF first.</p>
      <label class="field"><span>Title</span><input name="title" required maxlength="140" placeholder="e.g. Maya’s passport"></label>
      <label class="field"><span>Category</span><select name="category">${LOCKER_CATS.map((c) => `<option>${c}</option>`).join('')}</select></label>
      <label class="field"><span>Note (optional)</span><textarea name="note" maxlength="2000" placeholder="Expiry date, policy number, where the original is…"></textarea></label>
      <label class="check"><input type="checkbox" name="priv"> Keep this file to myself</label>
      <div class="progress" hidden><i style="width:60%"></i></div>
    </form>`,
    foot: `<button class="btn ghost" data-x2>Cancel</button><button class="btn" data-go>${icon('upload')}Add file</button>`,
    onMount: (m, close) => {
      const f = $('#duf', m);
      $('[data-x2]', m).onclick = () => close();
      f.file.onchange = () => { const fl = f.file.files[0]; if (fl && !f.title.value) f.title.value = fl.name.replace(/\.[^.]+$/, ''); };
      $('[data-go]', m).onclick = async () => {
        if (!f.reportValidity()) return;
        const file = f.file.files[0];
        const type = ALLOWED_DOC[extOf(file.name)] || (Object.values(ALLOWED_DOC).includes(file.type) ? file.type : null);
        if (!type) { toast('That file type can’t be stored. Use PDF, an image or plain text.', 'err'); return; }
        if (file.size > 20 * 1024 * 1024) { toast('That file is over 20 MB. Choose a smaller file.', 'err'); return; }
        const go = $('[data-go]', m); go.disabled = true; go.textContent = 'Uploading…'; $('.progress', m).hidden = false;
        try {
          const up = await upload(file, type);
          const body = { kind: 'file', asset: up.id, name: file.name, type, size: up.sizeBytes || file.size, title: f.title.value.trim(), category: f.category.value, note: f.note.value.trim(), seat: S.me.seat, at: Date.now() };
          if (f.priv.checked) await retryOnce(() => myPrivColl().doc('file-' + uid()).set(body));
          else await retryOnce(() => S.st.db.collection('lockers').doc(uid()).set(body));
          toast('File added'); close();
        } catch (e) { toast(errText(e), 'err'); go.disabled = false; go.textContent = 'Try again'; }
      };
    },
  });
}

function docRefOf(d) { return d.priv ? myPrivColl().doc(d.id) : S.st.db.doc('lockers/' + d.id); }

function openDoc(d) {
  const k = fileKind(d.type);
  const preview = k === 'pdf'
    ? `<iframe class="pv-frame" data-asset="${esc(d.asset)}" title="${esc(d.title)}"></iframe><p class="hint">If the preview stays blank, use Open or Download.</p>`
    : k === 'img' ? `<img class="pv-img" data-asset="${esc(d.asset)}" alt="${esc(d.title)}">`
      : `<pre class="pv-text" id="pvt">Loading…</pre>`;
  openModal({
    title: d.title, wide: true,
    body: `${preview}
      <dl class="dl"><dt>Category</dt><dd>${esc(d.category || 'Other')}</dd><dt>File</dt><dd>${esc(d.name)} · ${esc(fmtSize(d.size || 0))}</dd>
      <dt>Added</dt><dd>${esc(fmtStamp(d.at))} by ${esc(nameOf(d.seat))}</dd><dt>Who sees it</dt><dd>${d.priv ? 'Only you' : 'Both of you'}</dd>
      ${d.note ? `<dt>Note</dt><dd style="white-space:pre-wrap">${esc(d.note)}</dd>` : ''}</dl>`,
    foot: `<button class="btn ghost left" data-del>${icon('trash')}Delete</button><button class="btn ghost" data-ed>${icon('edit')}Edit</button><a class="btn ghost" data-asset="${esc(d.asset)}" target="_blank" rel="noopener">${icon('eye')}Open</a><button class="btn" data-dl>${icon('download')}Download</button>`,
    onMount: async (m, close) => {
      hydrate(m);
      if (k === 'txt') { try { const u = await assetUrl(d.asset); $('#pvt', m).textContent = (await (await fetch(u)).text()).slice(0, 200000); } catch { $('#pvt', m).textContent = 'Preview unavailable. Use Download.'; } }
      $('[data-dl]', m).onclick = async () => {
        try { const u = await assetUrl(d.asset); const b = await (await fetch(u)).blob(); if (await saveFile(d.name, b)) toast('Download started'); } catch { toast('Couldn’t download this file. Try Open instead.', 'err'); }
      };
      $('[data-ed]', m).onclick = () => { close(); editDoc(d); };
      $('[data-del]', m).onclick = async () => {
        if (!(await confirmBox(`Delete “${d.title}”${d.priv ? '' : ' for both of you'}? This can’t be undone.`, 'Delete file'))) return;
        try { await docRefOf(d).delete(); if (S.st.assets) S.st.assets.delete(d.asset).catch(() => {}); toast('File deleted'); close(); } catch (e) { toast(errText(e), 'err'); }
      };
    },
  });
}

function editDoc(d) {
  openModal({
    title: 'Edit file details',
    body: `<form id="def"><label class="field"><span>Title</span><input name="title" required maxlength="140" value="${esc(d.title)}"></label>
      <label class="field"><span>Category</span><select name="category">${LOCKER_CATS.map((c) => `<option ${c === d.category ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label class="field"><span>Note</span><textarea name="note" maxlength="2000">${esc(d.note || '')}</textarea></label></form>`,
    foot: `<button class="btn ghost" data-x2>Cancel</button><button class="btn" data-s>Save changes</button>`,
    onMount: (m, close) => {
      $('[data-x2]', m).onclick = () => close();
      $('[data-s]', m).onclick = async () => {
        const f = $('#def', m); if (!f.reportValidity()) return;
        try { await retryOnce(() => docRefOf(d).update({ title: f.title.value.trim(), category: f.category.value, note: f.note.value.trim() })); toast('File saved'); close(); } catch (e) { toast(errText(e), 'err'); }
      };
    },
  });
}
