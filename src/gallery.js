/* ============================================================
   Gallery
   ============================================================ */
const photoSortKey = (p) => (p.date || '') + String(p.at || 0).padStart(15, '0');
VIEWS.gallery = {
  sort: 'new',
  album: '',
  mount(el) {
    el.innerHTML = `${pageHead('Gallery', 'Photos you both want to keep.')}
      <div class="toolbar">
        <label class="btn" id="upBtn">${icon('upload')}Add photos<input type="file" id="pf" accept="image/*,.heic,.heif" multiple class="sr"></label>
        <span class="grow"></span>
        <label class="sr" for="psort">Sort</label>
        <select id="psort" class="input" style="width:auto;min-height:44px"><option value="new">Newest first</option><option value="old">Oldest first</option></select>
      </div>
      <div class="chips" id="albums" role="group" aria-label="Albums"></div>
      <div id="pgrid"></div>`;
    if (!S.st.assets) $('#upBtn', el).outerHTML = `<p class="hint">You can view photos. To add photos, ask the space owner to give you Editor access.</p>`;
    $('#psort', el).value = this.sort;
    $('#psort', el).onchange = (e) => { this.sort = e.target.value; draw(); };
    const pf = $('#pf', el);
    if (pf) pf.onchange = () => { const files = [...pf.files]; pf.value = ''; if (files.length) openPhotoUpload(files); };
    const draw = () => {
      const albums = [...new Set(S.data.photos.map((p) => p.album).filter(Boolean))].sort();
      if (this.album && !albums.includes(this.album)) this.album = '';
      $('#albums', el).innerHTML = albums.length ? [['', 'All photos'], ...albums.map((a) => [a, a])].map(([v, l]) => `<button class="chip" data-al="${esc(v)}" aria-pressed="${v === this.album}">${esc(l)}</button>`).join('') : '';
      $$('[data-al]', el).forEach((b) => (b.onclick = () => { this.album = b.dataset.al; draw(); }));
      const list = this.list();
      const g = $('#pgrid', el);
      if (!S.data.photos.length) {
        g.innerHTML = S.loaded.photos ? `<div class="empty">${icon('star', 'spark')}<strong>No photos yet</strong>Add a few from your phone or computer. You can group them into albums as you go.</div>` : `<p class="hint">Loading photos…</p>`;
        return;
      }
      g.innerHTML = `<div class="grid">${list.map((p, i) => `<button class="tile" data-i="${i}" aria-label="${esc(p.caption || 'Photo')} · ${esc(p.date ? fmtDate(p.date) : '')}"><img data-asset="${esc(p.thumb || p.full)}" alt="" loading="lazy" decoding="async">${p.caption ? `<span class="cap">${esc(p.caption)}</span>` : ''}</button>`).join('')}</div>`;
      $$('[data-i]', g).forEach((b) => (b.onclick = () => openViewer(this.list(), Number(b.dataset.i))));
      hydrate(g);
    };
    draw();
    this.off = onData((k) => k === 'photos' && draw());
  },
  list() {
    const l = S.data.photos.filter((p) => !this.album || p.album === this.album).sort((a, b) => photoSortKey(b).localeCompare(photoSortKey(a)));
    return this.sort === 'old' ? l.reverse() : l;
  },
  unmount() { this.off && this.off(); },
};

function openPhotoUpload(files) {
  const albums = [...new Set(S.data.photos.map((p) => p.album).filter(Boolean))];
  const lm = files[0].lastModified ? isoOf(new Date(files[0].lastModified)) : todayISO();
  const previews = files.slice(0, 24).map((f) => URL.createObjectURL(f));
  openModal({
    title: `Add ${files.length} photo${files.length > 1 ? 's' : ''}`,
    body: `<div class="thumbs">${previews.map((u) => `<img src="${u}" alt="">`).join('')}${files.length > 24 ? `<p class="hint">+${files.length - 24} more</p>` : ''}</div>
      <form id="puf">
        <label class="field"><span>Caption (optional)</span><input name="caption" maxlength="300" placeholder="Where were you? What happened?"></label>
        <div class="row">
          <label class="field"><span>Album (optional)</span><input name="album" list="albumList" maxlength="60" placeholder="e.g. Goa 2026"><datalist id="albumList">${albums.map((a) => `<option value="${esc(a)}">`).join('')}</datalist></label>
          <label class="field"><span>Date</span><input name="date" type="date" value="${lm}"></label>
        </div>
        <p class="hint">JPG, PNG, WebP, GIF or HEIC. Large photos are resized to save space; a small preview is made for the grid.</p>
        <div class="progress" hidden><i></i></div>
        <div id="upErr" role="alert"></div>
      </form>`,
    foot: `<button class="btn ghost" data-x2>Cancel</button><button class="btn" data-go>${icon('upload')}Upload ${files.length}</button>`,
    onClose: () => previews.forEach((u) => URL.revokeObjectURL(u)),
    onMount: (m, close) => {
      $('[data-x2]', m).onclick = () => close();
      $('[data-go]', m).onclick = async () => {
        const f = $('#puf', m), go = $('[data-go]', m);
        go.disabled = true; $('[data-x2]', m).disabled = true;
        const bar = $('.progress', m); bar.hidden = false;
        const errs = [];
        let done = 0;
        for (const file of files) {
          try {
            const { thumb, full, w, h } = await prepPhoto(file);
            const fu = await upload(full, full.type || 'image/jpeg');
            const tu = await upload(thumb, 'image/jpeg');
            await retryOnce(() => S.st.db.collection('photos').doc(uid()).set({
              full: fu.id, thumb: tu.id, w, h, size: fu.sizeBytes, name: file.name,
              caption: f.caption.value.trim(), album: f.album.value.trim(), date: f.date.value || todayISO(),
              seat: S.me.seat, at: Date.now(),
            }));
          } catch (e) { errs.push(`${file.name}: ${e.message && e.code === 'decode' ? e.message : errText(e)}`); }
          done++; $('i', bar).style.width = (done / files.length) * 100 + '%';
          go.textContent = `Uploading ${done}/${files.length}…`;
        }
        if (errs.length) {
          $('#upErr', m).innerHTML = `<div class="banner" style="margin-top:12px">${errs.length} couldn’t be added:<br>${errs.map(esc).join('<br>')}</div>`;
          go.textContent = 'Done'; go.disabled = false; go.onclick = () => close();
          $('[data-x2]', m).disabled = false;
          if (errs.length < files.length) toast(`${files.length - errs.length} photo${files.length - errs.length > 1 ? 's' : ''} added`);
        } else { toast(`${files.length} photo${files.length > 1 ? 's' : ''} added`); close(); }
      };
    },
  });
}

function openViewer(list, i, opts = {}) {
  const v = document.createElement('div');
  v.className = 'viewer'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'Photo viewer');
  document.body.appendChild(v);
  const prevFocus = document.activeElement;
  const close = () => { v.remove(); document.removeEventListener('keydown', key); modalStack.splice(modalStack.indexOf(close), 1); prevFocus && prevFocus.focus(); };
  modalStack.push(close);
  const draw = () => {
    const p = list[i];
    if (!p) return close();
    v.innerHTML = `<div class="vtop"><span>${i + 1} of ${list.length}</span><span class="row" style="gap:4px">
        ${opts.readOnly ? '' : `<button class="icon-btn" data-ed aria-label="Edit details">${icon('edit')}</button>`}
        <button class="icon-btn" data-dl aria-label="Download">${icon('download')}</button>
        ${opts.readOnly ? '' : `<button class="icon-btn" data-del aria-label="Delete photo">${icon('trash')}</button>`}
        <button class="icon-btn" data-c aria-label="Close">${icon('close')}</button></span></div>
      <div class="stage"><img data-asset="${esc(p.full)}" alt="${esc(p.caption || 'Photo')}">
        ${list.length > 1 ? `<button class="nav prev" data-p aria-label="Previous photo">${icon('left')}</button><button class="nav next" data-n aria-label="Next photo">${icon('right')}</button>` : ''}</div>
      <div class="vinfo">${p.caption ? `<p style="font-weight:700;font-size:13px">${esc(p.caption)}</p>` : ''}
        ${opts.readOnly ? '' : `<p class="s">${esc(p.date ? fmtDate(p.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '')}${p.album ? ' · ' + esc(p.album) : ''} · added by ${esc(nameOf(p.seat))}</p>`}</div>`;
    hydrate(v);
    $('[data-c]', v).onclick = close;
    const pv = $('[data-p]', v), nx = $('[data-n]', v);
    if (pv) pv.onclick = () => { i = (i - 1 + list.length) % list.length; draw(); };
    if (nx) nx.onclick = () => { i = (i + 1) % list.length; draw(); };
    $('[data-dl]', v).onclick = async () => {
      try { const url = await assetUrl(p.full); const b = await (await fetch(url)).blob(); await saveFile(p.name || 'photo.jpg', b); } catch { toast('Couldn’t download this photo.', 'err'); }
    };
    if (!opts.readOnly) $('[data-del]', v).onclick = async () => {
      if (!(await confirmBox('Delete this photo for both of you? This can’t be undone.', 'Delete photo'))) return;
      try {
        await S.st.db.doc('photos/' + p.id).delete();
        if (S.st.assets) { S.st.assets.delete(p.full).catch(() => {}); if (p.thumb) S.st.assets.delete(p.thumb).catch(() => {}); }
        list.splice(i, 1); if (i >= list.length) i = list.length - 1; toast('Photo deleted'); draw();
      } catch (e) { toast(errText(e), 'err'); }
    };
    if (!opts.readOnly) $('[data-ed]', v).onclick = () => editPhoto(p, (np) => { list[i] = np; draw(); });
    $('[data-c]', v).focus();
  };
  const key = (e) => {
    if (modalStack[modalStack.length - 1] !== close) return;
    if (e.key === 'ArrowLeft' && list.length > 1) { i = (i - 1 + list.length) % list.length; draw(); }
    if (e.key === 'ArrowRight' && list.length > 1) { i = (i + 1) % list.length; draw(); }
  };
  document.addEventListener('keydown', key);
  let sx = null;
  v.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  v.addEventListener('touchend', (e) => {
    if (sx == null || list.length < 2) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 60) { i = (i + (dx < 0 ? 1 : -1) + list.length) % list.length; draw(); }
  });
  draw();
}

function editPhoto(p, done) {
  const albums = [...new Set(S.data.photos.map((x) => x.album).filter(Boolean))];
  openModal({
    title: 'Photo details',
    body: `<form id="pef"><label class="field"><span>Caption</span><input name="caption" maxlength="300" value="${esc(p.caption || '')}"></label>
      <div class="row"><label class="field"><span>Album</span><input name="album" list="al2" maxlength="60" value="${esc(p.album || '')}"><datalist id="al2">${albums.map((a) => `<option value="${esc(a)}">`).join('')}</datalist></label>
      <label class="field"><span>Date</span><input name="date" type="date" value="${esc(p.date || '')}"></label></div></form>`,
    foot: `<button class="btn ghost" data-x2>Cancel</button><button class="btn" data-s>Save changes</button>`,
    onMount: (m, close) => {
      $('[data-x2]', m).onclick = () => close();
      $('[data-s]', m).onclick = async () => {
        const f = $('#pef', m);
        const patch = { caption: f.caption.value.trim(), album: f.album.value.trim(), date: f.date.value || p.date };
        try { await retryOnce(() => S.st.db.doc('photos/' + p.id).update(patch)); toast('Photo saved'); close(); done({ ...p, ...patch }); } catch (e) { toast(errText(e), 'err'); }
      };
    },
  });
}
