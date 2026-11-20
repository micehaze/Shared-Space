/* ============================================================
   Shared notepad — revision check prevents silent overwrites
   ============================================================ */
function allNotes() {
  const shared = S.data.notes.map((n) => ({ ...n, priv: false }));
  const mine = S.data.mine.filter((d) => d.kind === 'note').map((n) => ({ ...n, priv: true }));
  return [...shared, ...mine].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.editedAt || b.at || 0) - (a.editedAt || a.at || 0));
}
const noteRef = (n) => (n.priv ? myPrivColl().doc(n.id) : S.st.db.doc('notes/' + n.id));
function mdLite(src) {
  const lines = esc(src).split('\n');
  let out = '', inList = false;
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\W)_(.+?)_(?=\W|$)/g, '$1<i>$2</i>').replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
  for (const l of lines) {
    if (/^[-*] /.test(l)) { if (!inList) { out += '<ul>'; inList = true; } out += `<li>${inline(l.slice(2))}</li>`; continue; }
    if (inList) { out += '</ul>'; inList = false; }
    if (/^#{1,3} /.test(l)) out += `<h4>${inline(l.replace(/^#+ /, ''))}</h4>`;
    else out += l ? `<div>${inline(l)}</div>` : '<div>&nbsp;</div>';
  }
  if (inList) out += '</ul>';
  return out;
}

/* ---------- rich text: colours, photos, sanitizing ---------- */
const NOTE_COLORS = [
  ['ink', '#1A1030', 'Ink'], ['pink', '#D4136F', 'Hot pink'], ['purple', '#6A2BD6', 'Purple'], ['blue', '#1A57C9', 'Blue'],
  ['teal', '#0B7C82', 'Teal'], ['green', '#2A7D2A', 'Green'], ['orange', '#C2570A', 'Orange'], ['red', '#B8102C', 'Red'],
];
const colorClassOf = (raw) => {
  if (!raw) return null;
  let hex = String(raw).trim().toLowerCase();
  const m = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) hex = '#' + [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('');
  const hit = NOTE_COLORS.find(([, h]) => h.toLowerCase() === hex);
  return hit ? 'c-' + hit[0] : null;
};
function sanitizeNote(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html || '');
  const KEEP = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'H3', 'H4', 'UL', 'OL', 'LI', 'P', 'DIV', 'BR', 'SPAN', 'IMG', 'A', 'BLOCKQUOTE']);
  const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'svg', 'SVG', 'MATH', 'TEMPLATE', 'LINK', 'META', 'INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'FORM']);
  const walk = (node) => {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 3) continue;
      if (ch.nodeType !== 1) { ch.remove(); continue; }
      const tag = ch.tagName;
      if (DROP.has(tag)) { ch.remove(); continue; }
      walk(ch);
      if (tag === 'FONT') { const c = colorClassOf(ch.getAttribute('color')); const sp = document.createElement('span'); if (c) sp.className = c; while (ch.firstChild) sp.appendChild(ch.firstChild); ch.replaceWith(sp); continue; }
      if (!KEEP.has(tag)) { const frag = document.createDocumentFragment(); while (ch.firstChild) frag.appendChild(ch.firstChild); ch.replaceWith(frag); continue; }
      const cls = tag === 'SPAN' ? ([...ch.classList].find((c) => /^c-[a-z]+$/.test(c) && NOTE_COLORS.some(([n]) => 'c-' + n === c)) || colorClassOf(ch.style.color)) : null;
      const asset = tag === 'IMG' ? ch.getAttribute('data-asset') : null;
      const href = tag === 'A' ? ch.getAttribute('href') : null;
      for (const a of [...ch.attributes]) ch.removeAttribute(a.name);
      if (tag === 'SPAN') { if (cls) ch.className = cls; else { const frag = document.createDocumentFragment(); while (ch.firstChild) frag.appendChild(ch.firstChild); ch.replaceWith(frag); } }
      if (tag === 'IMG') { if (asset && /^[\w\-.:\/]{4,120}$/.test(asset)) { ch.setAttribute('data-asset', asset); ch.className = 'nimg'; ch.setAttribute('alt', 'Photo in note'); } else ch.remove(); }
      if (tag === 'A') { if (href && /^https?:\/\//i.test(href)) { ch.setAttribute('href', href); ch.setAttribute('target', '_blank'); ch.setAttribute('rel', 'noopener'); } }
    }
  };
  walk(tpl.content);
  return tpl.innerHTML.replace(/(<br>\s*){3,}/g, '<br><br>').trim();
}
const noteImages = (html) => [...String(html || '').matchAll(/data-asset="([^"]+)"/g)].map((m) => m[1]);
const noteHtmlOf = (n) => (n && n.html ? sanitizeNote(n.html) : n && n.body ? mdLite(n.body) : '');

VIEWS.notepad = {
  flush: true,
  cur: null,
  mount(el) {
    el.innerHTML = `<div class="notes" id="notesWrap">
      <div class="list">
        ${pageHead('Notepad', 'Lists, plans and things to remember.')}
        <div class="toolbar"><button class="btn" id="newNote">${icon('plus')}New note</button>
        <div class="search grow">${icon('search')}<input class="input" id="nq" type="search" placeholder="Search notes" aria-label="Search notes"></div></div>
        <div id="nlist"></div>
      </div>
      <div class="ed" id="ned"></div>
    </div>`;
    const wrap = $('#notesWrap', el);
    let q = '';
    let dirty = false, saving = false, conflictOpen = false, timer = null, remoteNewer = false;
    let cur = null; // {id, priv, rev, isNew, seat, at}
    const drawList = () => {
      const all = allNotes().filter((n) => !q || [n.title, n.body, ...(n.items || []).map((i) => i.text)].join(' ').toLowerCase().includes(q));
      const box = $('#nlist', el);
      if (!allNotes().length) { box.innerHTML = S.loaded.notes ? `<div class="empty">${icon('star', 'spark')}<strong>No notes yet</strong>Start a shopping list, a trip plan or a list of gift ideas.</div>` : '<p class="hint">Loading notes…</p>'; return; }
      box.innerHTML = all.length ? all.map((n) => {
        const done = (n.items || []).filter((i) => i.done).length, tot = (n.items || []).length;
        const img = (n.images || [])[0];
        return `<button class="note-card ${n.pinned ? 'pinned' : ''} ${cur && cur.id === n.id ? 'active' : ''} ${img ? 'has-img' : ''}" data-n="${esc(n.id)}" data-p="${n.priv ? 1 : ''}">
          ${img ? `<img class="nthumb" data-asset="${esc(img)}" alt="">` : ''}
          <span class="t">${n.pinned ? icon('pin') : ''}${esc(n.title || 'Untitled')}</span>
          ${n.body ? `<span class="p">${esc(n.body.slice(0, 160))}</span>` : ''}
          <span class="m">${tot ? `${done}/${tot} done · ` : ''}${n.priv ? 'Only you · ' : ''}${esc(nameOf(n.editedSeat || n.seat))}, ${esc(fmtDate(new Date(n.editedAt || n.at), { day: 'numeric', month: 'short' }))}</span></button>`;
      }).join('') : `<p class="hint">No notes match.</p>`;
      hydrate(box);
      $$('[data-n]', box).forEach((b) => (b.onclick = async () => {
        if (dirty && !(await confirmBox('You have unsaved changes in this note. Leave without saving?', 'Leave', true))) return;
        const n = allNotes().find((x) => x.id === b.dataset.n && !!x.priv === !!b.dataset.p); n && open(n);
      }));
    };
    const status = (txt, cls = '') => { const s = $('#nst', el); if (s) { s.textContent = txt; s.className = 'st ' + cls; } };
    const savedLine = (n) => `Saved · edited by ${n.editedSeat === S.me.seat || (!n.editedSeat && n.seat === S.me.seat) ? 'you' : nameOf(n.editedSeat || n.seat)}, ${fmtStamp(n.editedAt || n.at)}`;
    const collect = () => {
      const ed = $('#nb', el);
      const html = sanitizeNote(ed.innerHTML);
      return {
      title: $('#nt', el).value.trim(),
      html, body: (ed.innerText || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 20000), images: noteImages(html),
      items: $$('.ck[data-i]', el).map((r) => ({ id: r.dataset.i, text: $('input[type=text]', r).value, done: $('input[type=checkbox]', r).checked })).filter((i) => i.text.trim()),
      pinned: $('#npin', el).getAttribute('aria-pressed') === 'true',
      };
    };
    const drawItems = (items) => {
      $('#nitems', el).innerHTML = items.map((i) => `<div class="ck ${i.done ? 'done' : ''}" data-i="${esc(i.id)}"><input type="checkbox" ${i.done ? 'checked' : ''} aria-label="Done"><input type="text" value="${esc(i.text)}" aria-label="Checklist item" maxlength="300"><button class="icon-btn" data-rm aria-label="Remove item">${icon('close')}</button></div>`).join('');
      $$('.ck[data-i]', el).forEach((r) => {
        $('input[type=checkbox]', r).onchange = (e) => { r.classList.toggle('done', e.target.checked); touch(); };
        $('input[type=text]', r).oninput = touch;
        $('[data-rm]', r).onclick = () => { r.remove(); touch(); };
      });
    };
    const touch = () => { dirty = true; status('Unsaved changes', 'dirty'); clearTimeout(timer); timer = setTimeout(() => save(), 2000); };
    const open = (n, isNew = false) => {
      clearTimeout(timer);
      cur = isNew ? { id: uid(), priv: false, rev: 0, isNew: true, seat: S.me.seat, at: Date.now() } : { id: n.id, priv: n.priv, rev: n.rev || 0, isNew: false, seat: n.seat, at: n.at };
      dirty = false; remoteNewer = false;
      const d = isNew ? { title: '', body: '', items: [], pinned: false } : n;
      $('#ned', el).innerHTML = `<button class="btn ghost sm back" id="nback">${icon('left')}All notes</button>
        <div id="nbanner"></div>
        <label class="sr" for="nt">Title</label><input class="ed-title" id="nt" maxlength="140" placeholder="Title" value="${esc(d.title || '')}">
        <div class="fmt" role="toolbar" aria-label="Formatting">
          <button type="button" data-f="bold" aria-label="Bold"><b>B</b></button><button type="button" data-f="italic" aria-label="Italic"><i>I</i></button><button type="button" data-f="underline" aria-label="Underline"><u>U</u></button>
          <button type="button" data-f="h" aria-label="Heading">H</button><button type="button" data-f="list" aria-label="Bulleted list">${icon('list').replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-3px"')}</button>
          <label class="fmt-photo" title="Add photo from phone">${icon('image').replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-3px"')} Photo<input type="file" id="nimg" accept="image/*" multiple class="sr"></label>
          <span style="flex:1"></span>
          <button type="button" id="npin" aria-pressed="${!!d.pinned}" title="Pin to top">${icon('pin').replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-3px"')} Pin</button>
        </div>
        <div class="swatches" role="toolbar" aria-label="Text colour"><span class="lbl">Colour</span>${NOTE_COLORS.map(([n, h, l]) => `<button type="button" class="sw-c" data-c="${h}" style="--c:${h}" aria-label="${l} text" title="${l}">A</button>`).join('')}</div>
        <div class="ed-body rich" id="nb" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Note" data-ph="Write here… select text to colour it, or add a photo.">${noteHtmlOf(d)}</div>
        <div class="checklist"><div class="lbl">Checklist</div><div id="nitems"></div>
          <form id="nadd" class="ck"><span style="width:22px;text-align:center">${icon('plus').replace('<svg', '<svg style="width:18px;height:18px"')}</span><input type="text" id="nai" placeholder="Add an item and press Enter" aria-label="New checklist item" maxlength="300"></form></div>
        ${isNew ? `<label class="check" style="margin-top:12px"><input type="checkbox" id="npriv"> Keep this note to myself</label>` : (n.priv ? `<p class="hint">Only you can see this note.</p>` : '')}
        <div class="save-line"><span class="st" id="nst">${isNew ? 'New note — not saved yet' : esc(savedLine(n))}</span>
          <span class="row"><button class="btn ghost sm" id="ndel" ${isNew ? 'hidden' : ''}>${icon('trash')}Delete</button><button class="btn sm" id="nsave">Save note</button></span></div>`;
      drawItems(d.items || []);
      wrap.classList.add('editing');
      $('#nback', el).onclick = async () => { if (dirty) await save(); wrap.classList.remove('editing'); cur = null; drawList(); };
      $('#nt', el).oninput = touch;
      const ed = $('#nb', el);
      hydrate(ed);
      ed.oninput = touch;
      ed.addEventListener('paste', (e) => { const t = e.clipboardData && e.clipboardData.getData('text/plain'); if (t != null) { e.preventDefault(); document.execCommand('insertText', false, t); } });
      const keepSel = () => { const s2 = getSelection(); if (s2.rangeCount && ed.contains(s2.anchorNode)) savedRange = s2.getRangeAt(0).cloneRange(); };
      ed.addEventListener('keyup', keepSel); ed.addEventListener('mouseup', keepSel); ed.addEventListener('touchend', keepSel); ed.addEventListener('blur', keepSel);
      $$('.fmt button, .swatches button', el).forEach((b) => b.addEventListener('mousedown', (e) => e.preventDefault()));
      $$('.swatches [data-c]', el).forEach((b) => (b.onclick = () => { restoreSel(); document.execCommand('styleWithCSS', false, false); document.execCommand('foreColor', false, b.dataset.c); keepSel(); touch(); }));
      $('#nimg', el).onchange = async (e) => {
        const files = [...e.target.files]; e.target.value = ''; if (!files.length) return;
        if (!S.st.assets) { toast('Photos need upload access to this space.', 'err'); return; }
        status('Adding photo…', 'dirty');
        for (const f of files) {
          try {
            const bmp = await decodeImage(f).catch(() => null);
            if (!bmp) throw { code: 'decode', message: isHeic(f) ? 'This phone can’t read HEIC photos here. Choose a JPG instead.' : 'That file isn’t a readable image.' };
            const blob = await scaleTo(bmp, 1600, 'image/jpeg', 0.85);
            const up = await upload(blob, 'image/jpeg');
            restoreSel();
            const html = `<img data-asset="${esc(up.id)}" class="nimg" alt="Photo in note"><br>`;
            if (savedRange && ed.contains(savedRange.startContainer)) document.execCommand('insertHTML', false, html);
            else { ed.insertAdjacentHTML('beforeend', html); }
            keepSel();
          } catch (er) { toast(er && er.code === 'decode' ? er.message : errText(er), 'err'); }
        }
        hydrate(ed); touch();
      };
      $('#npin', el).onclick = (e) => { const b = e.currentTarget; b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); touch(); };
      const np = $('#npriv', el); if (np) np.onchange = () => { cur.priv = np.checked; };
      $('#nadd', el).onsubmit = (e) => {
        e.preventDefault(); const v = $('#nai', el).value.trim(); if (!v) return;
        drawItems([...collect().items, { id: uid(), text: v, done: false }]); $('#nai', el).value = ''; touch();
      };
      $$('[data-f]', el).forEach((b) => (b.onclick = () => fmt(b.dataset.f)));
      $('#nsave', el).onclick = () => save(true);
      const del = $('#ndel', el);
      if (del) del.onclick = async () => {
        if (!cur || cur.isNew) return;
        if (!(await confirmBox(`Delete “${$('#nt', el).value || 'Untitled'}”${cur.priv ? '' : ' for both of you'}?`, 'Delete note'))) return;
        const imgs = noteImages($('#nb', el).innerHTML);
        try { clearTimeout(timer); await noteRef(cur).delete(); if (S.st.assets) imgs.forEach((id) => S.st.assets.delete(id).catch(() => {})); toast('Note deleted'); dirty = false; cur = null; wrap.classList.remove('editing'); emptyEd(); drawList(); } catch (e) { toast(errText(e), 'err'); }
      };
      drawList();
      if (isNew) $('#nt', el).focus();
    };
    let savedRange = null;
    const restoreSel = () => {
      const ed = $('#nb', el); if (!ed) return;
      ed.focus();
      if (savedRange && ed.contains(savedRange.startContainer)) { const s2 = getSelection(); s2.removeAllRanges(); s2.addRange(savedRange); }
    };
    const fmt = (f) => {
      restoreSel();
      if (f === 'h') { const cur2 = document.queryCommandValue('formatBlock'); document.execCommand('formatBlock', false, /h3/i.test(cur2) ? 'div' : 'h3'); }
      else if (f === 'list') document.execCommand('insertUnorderedList');
      else document.execCommand(f);
      touch();
    };
    const emptyEd = () => { $('#ned', el).innerHTML = `<div class="empty" style="margin-top:40px">${icon('star', 'spark')}<strong>Pick a note or start a new one</strong>Both of you can edit shared notes. If you both change the same note, you’ll be asked which version to keep.</div>`; };
    const showConflict = (remote) => new Promise((res) => {
      conflictOpen = true;
      openModal({
        title: 'This note changed while you were editing',
        body: `<p style="margin-top:0">${esc(nameOf(remote.editedSeat || remote.seat))} saved a different version at ${esc(fmtStamp(remote.editedAt || remote.at))}. Nothing has been overwritten yet.</p>
          <p class="hint">Their version starts: “${esc((remote.title || '') + ' — ' + (remote.body || '').slice(0, 120))}”</p>`,
        foot: `<button class="btn ghost" data-a="copy">Save mine as a copy</button><button class="btn ghost" data-a="theirs">Use their version</button><button class="btn" data-a="mine">Keep mine</button>`,
        onMount: (m, close) => $$('[data-a]', m).forEach((b) => (b.onclick = () => close(b.dataset.a))),
        onClose: (v) => { conflictOpen = false; res(v || 'cancel'); },
      });
    });
    const save = async (explicit = false) => {
      clearTimeout(timer);
      if (!cur || saving || conflictOpen) return;
      if (!dirty && !explicit) return;
      const fields = collect();
      if (cur.isNew && !fields.title && !fields.body.trim() && !fields.items.length && !fields.images.length) { status('Write something first'); return; }
      saving = true; status('Saving…');
      const ref = noteRef(cur);
      try {
        const snap = cur.isNew ? { exists: false } : await retryOnce(() => ref.get());
        let rev = cur.rev;
        if (!cur.isNew && snap.exists && (snap.data().rev || 0) !== cur.rev) {
          saving = false;
          const remote = snap.data();
          const choice = await showConflict(remote);
          if (choice === 'theirs') { dirty = false; open({ id: cur.id, priv: cur.priv, ...remote }); toast('Loaded their version'); return; }
          if (choice === 'copy') {
            const nid = uid();
            const copy = { ...fields, title: (fields.title || 'Untitled') + ' (my copy)', rev: 1, seat: S.me.seat, at: Date.now(), editedSeat: S.me.seat, editedAt: Date.now(), kind: 'note' };
            await (cur.priv ? myPrivColl().doc(nid) : S.st.db.collection('notes').doc(nid)).set(copy);
            dirty = false; open({ id: cur.id, priv: cur.priv, ...remote }); toast('Your version was saved as a copy'); return;
          }
          if (choice !== 'mine') { status('Not saved — choose a version to continue', 'dirty'); return; }
          saving = true; rev = remote.rev || 0;
        }
        const body = { ...fields, kind: 'note', rev: rev + 1, seat: cur.seat, at: cur.at, editedSeat: S.me.seat, editedAt: Date.now() };
        await retryOnce(() => ref.set(body));
        const wasNew = cur.isNew;
        cur.rev = rev + 1; cur.isNew = false;
        if (wasNew) {
          $('#ndel', el).hidden = false;
          const np = $('#npriv', el); if (np) np.closest('label').outerHTML = cur.priv ? '<p class="hint">Only you can see this note.</p>' : '';
        }
        if (JSON.stringify(collect()) === JSON.stringify(fields)) { dirty = false; status(savedLine(body)); } else touch();
        remoteNewer = false; $('#nbanner', el) && ($('#nbanner', el).innerHTML = '');
      } catch (e) { status('Not saved. ' + errText(e), 'dirty'); toast(errText(e), 'err'); }
      saving = false;
    };
    $('#newNote', el).onclick = async () => { if (dirty && !(await confirmBox('You have unsaved changes. Leave without saving?', 'Leave'))) return; open(null, true); };
    $('#nq', el).oninput = (e) => { q = e.target.value.trim().toLowerCase(); drawList(); };
    emptyEd(); drawList();
    if (this.cur) { const n = allNotes().find((x) => x.id === this.cur); if (n) open(n); }
    this.off = onData((k) => {
      if (k !== 'notes' && k !== 'mine' && k !== 'members' && k !== 'names') return;
      drawList();
      if (cur && !cur.isNew && !saving) {
        const n = allNotes().find((x) => x.id === cur.id && x.priv === cur.priv);
        if (!n) { $('#nbanner', el).innerHTML = `<div class="banner">This note was deleted. Save to bring it back.</div>`; cur.isNew = true; return; }
        if ((n.rev || 0) > cur.rev) {
          if (!dirty) { open(n); toast(`${nameOf(n.editedSeat || n.seat)} updated this note`); }
          else if (!remoteNewer) { remoteNewer = true; $('#nbanner', el).innerHTML = `<div class="banner">${esc(nameOf(n.editedSeat || n.seat))} just saved a newer version. When you save, you’ll choose which to keep.</div>`; }
        }
      }
    });
    this.leave = () => { if (dirty) save(); this.cur = cur && !cur.isNew ? cur.id : null; };
  },
  unmount() { this.leave && this.leave(); this.off && this.off(); },
};
