/* ============================================================
   Contacts
   ============================================================ */
VIEWS.contacts = {
  cat: '',
  q: '',
  mount(el) {
    el.innerHTML = `${pageHead('Contacts', 'The people and numbers you both rely on.')}
      <div class="toolbar"><button class="btn" id="addC">${icon('plus')}Add contact</button>
      <div class="search grow">${icon('search')}<input class="input" id="cq" type="search" placeholder="Search names, numbers, notes" aria-label="Search contacts"></div></div>
      <div class="chips" role="group" aria-label="Category">${[['', 'All'], ...CONTACT_CATS.map((c) => [c, c])].map(([v, l]) => `<button class="chip" data-c="${v}">${l}</button>`).join('')}</div>
      <div id="crows"></div>`;
    $('#addC', el).onclick = () => openContact();
    $('#cq', el).value = this.q;
    $('#cq', el).oninput = (e) => { this.q = e.target.value; draw(); };
    $$('[data-c]', el).forEach((b) => (b.onclick = () => { this.cat = b.dataset.c; draw(); }));
    const draw = () => {
      $$('[data-c]', el).forEach((b) => b.setAttribute('aria-pressed', b.dataset.c === this.cat));
      const q = this.q.trim().toLowerCase();
      const all = [...S.data.contacts].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      const list = all.filter((c) => (!this.cat || c.category === this.cat) && (!q || [c.name, c.relation, c.phone, c.email, c.address, c.notes].join(' ').toLowerCase().includes(q)));
      const box = $('#crows', el);
      if (!all.length) { box.innerHTML = S.loaded.contacts ? `<div class="empty">${icon('star', 'spark')}<strong>No contacts yet</strong>Add family, the doctor, the plumber, an emergency number — anyone you’d hate to search for at 2 a.m.</div>` : '<p class="hint">Loading contacts…</p>'; return; }
      if (!list.length) { box.innerHTML = `<div class="empty"><strong>No contacts match</strong>Try another name or category.</div>`; return; }
      box.innerHTML = `<div class="rows">${list.map((c) => `<div class="rowi" style="cursor:default">
          <span class="ic" style="background:${c.category === 'Emergency' ? '#FCD5DA' : c.category === 'Family' ? 'var(--rouge)' : c.category === 'Friends' ? 'var(--mist)' : 'var(--blue)'};font-weight:800">${esc((c.name || '?').trim().charAt(0).toUpperCase())}</span>
          <button style="all:unset;cursor:pointer;min-width:0" data-id="${esc(c.id)}"><span class="t" style="display:block">${esc(c.name)}</span><span class="s" style="display:block">${esc([c.relation, c.category].filter(Boolean).join(' · '))}${c.phone ? ' · ' + esc(c.phone) : ''}</span></button>
          <span class="row" style="gap:4px">${c.phone ? `<a class="icon-btn" href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}" aria-label="Call ${esc(c.name)} at ${esc(c.phone)}">${icon('phone')}</a>` : ''}${c.email ? `<a class="icon-btn" href="mailto:${esc(c.email)}" aria-label="Email ${esc(c.name)} at ${esc(c.email)}">${icon('mail')}</a>` : ''}</span></div>`).join('')}</div>`;
      $$('[data-id]', box).forEach((b) => (b.onclick = () => openContact(S.data.contacts.find((c) => c.id === b.dataset.id))));
    };
    draw();
    this.off = onData((k) => k === 'contacts' && draw());
  },
  unmount() { this.off && this.off(); },
};

function openContact(c) {
  const x = c || { category: 'Family', dates: [] };
  const dateRow = (d = {}) => `<div class="row cdate" style="gap:8px;margin-bottom:8px"><input class="input" style="flex:2 1 140px" placeholder="e.g. Birthday" value="${esc(d.label || '')}" aria-label="Date label"><input class="input" type="date" style="flex:1 1 140px" value="${esc(d.date || '')}" aria-label="Date"><button type="button" class="icon-btn" data-rmd aria-label="Remove date">${icon('close')}</button></div>`;
  const ro = !!(c && c.seat && c.seat !== S.me.seat);
  openModal({
    title: c ? c.name : 'Add contact',
    body: `<form id="cf"><fieldset class="ro-fs" ${ro ? 'disabled' : ''}>
      <label class="field"><span>Name</span><input name="name" required maxlength="120" value="${esc(x.name || '')}"></label>
      <div class="row"><label class="field"><span>Relationship</span><input name="relation" maxlength="80" value="${esc(x.relation || '')}" placeholder="e.g. Maya’s sister"></label>
      <label class="field"><span>Category</span><select name="category">${CONTACT_CATS.map((k) => `<option ${k === x.category ? 'selected' : ''}>${k}</option>`).join('')}</select></label></div>
      <div class="row"><label class="field"><span>Phone</span><input name="phone" type="tel" maxlength="40" value="${esc(x.phone || '')}"></label>
      <label class="field"><span>Email</span><input name="email" type="email" maxlength="120" value="${esc(x.email || '')}"></label></div>
      ${c && (c.phone || c.email) ? `<p class="hint" style="margin-top:-6px;margin-bottom:12px">${c.phone ? `Call: <a href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${esc(c.phone)}</a> ` : ''}${c.email ? ` Email: <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}</p>` : ''}
      <label class="field"><span>Address (optional)</span><textarea name="address" maxlength="500" style="min-height:70px">${esc(x.address || '')}</textarea></label>
      <div class="lbl" style="margin-bottom:8px">Important dates</div><div id="cdates">${(x.dates || []).map(dateRow).join('')}</div>
      <button type="button" class="btn ghost sm" id="addD" style="margin-bottom:14px">${icon('plus')}Add a date</button>
      <label class="field"><span>Notes</span><textarea name="notes" maxlength="2000">${esc(x.notes || '')}</textarea></label>
      </fieldset>${c ? `<p class="hint">Added by ${esc(nameOf(c.seat))} · ${esc(fmtStamp(c.at))}${ro ? ` — only ${esc(nameOf(c.seat))} can change or delete it` : ''}</p>` : ''}
    </form>`,
    foot: ro ? '<button class="btn" data-x2>Close</button>' : `${c ? `<button class="btn ghost left" data-del>${icon('trash')}Delete</button>` : ''}<button class="btn ghost" data-x2>Cancel</button><button class="btn" data-s>${c ? 'Save changes' : 'Add contact'}</button>`,
    onMount: (m, close) => {
      const f = $('#cf', m);
      if (ro) { $('[data-x2]', m).onclick = () => close(); return; }
      const bindRm = () => $$('[data-rmd]', m).forEach((b) => (b.onclick = () => b.closest('.cdate').remove()));
      bindRm();
      $('#addD', m).onclick = () => { $('#cdates', m).insertAdjacentHTML('beforeend', dateRow()); bindRm(); };
      $('[data-x2]', m).onclick = () => close();
      $('[data-s]', m).onclick = async () => {
        if (!f.reportValidity()) return;
        const body = {
          name: f.name.value.trim(), relation: f.relation.value.trim(), category: f.category.value, phone: f.phone.value.trim(), email: f.email.value.trim(),
          address: f.address.value.trim(), notes: f.notes.value.trim(),
          dates: $$('.cdate', m).map((r) => ({ label: $$('input', r)[0].value.trim(), date: $$('input', r)[1].value })).filter((d) => d.label || d.date),
        };
        try {
          if (c) await retryOnce(() => S.st.db.doc('contacts/' + c.id).update(body));
          else await retryOnce(() => S.st.db.collection('contacts').doc(uid()).set({ ...body, seat: S.me.seat, at: Date.now() }));
          toast(c ? 'Contact saved' : 'Contact added'); close();
        } catch (e) { toast(errText(e), 'err'); }
      };
      const d = $('[data-del]', m);
      if (d) d.onclick = async () => {
        if (!(await confirmBox(`Delete ${c.name} from your contacts?`, 'Delete contact'))) return;
        try { await S.st.db.doc('contacts/' + c.id).delete(); toast('Contact deleted'); close(); } catch (e) { toast(errText(e), 'err'); }
      };
    },
  });
}
