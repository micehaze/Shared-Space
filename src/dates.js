/* ============================================================
   Special dates & reminders
   Dates are stored as wall-calendar days (YYYY-MM-DD) and always
   read in the viewer's own time zone, so an annual date lands on
   the same calendar day for both of you.
   ============================================================ */
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
function mkDay(y, m, d) { if (m === 2 && d === 29 && !isLeap(y)) d = 28; return new Date(y, m - 1, d); }
function startOfToday() { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
function nextOcc(ev, from = startOfToday()) {
  const [y, m, d] = ev.date.split('-').map(Number);
  if (ev.repeat !== 'annual') return mkDay(y, m, d);
  let dt = mkDay(from.getFullYear(), m, d);
  if (dt < from) dt = mkDay(from.getFullYear() + 1, m, d);
  return dt;
}
const daysUntil = (dt) => Math.round((dt - startOfToday()) / 86400000);
const relDays = (n) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n < 0 ? `${-n} days ago` : n < 7 ? `In ${n} days` : n < 60 ? `In ${Math.round(n / 7)} week${Math.round(n / 7) > 1 ? 's' : ''}` : `In ${Math.round(n / 30)} months`);
function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function occLabel(ev, next) {
  const y0 = Number(ev.date.slice(0, 4));
  const n = next.getFullYear() - y0;
  if (ev.repeat !== 'annual' || !ev.knowYear || n <= 0) return '';
  if (ev.type === 'Birthday') return `turns ${n}`;
  if (ev.type === 'Anniversary') return `${ordinal(n)} anniversary`;
  return `${ordinal(n)} time`;
}
function upcoming(n = 50) {
  return S.data.dates
    .map((ev) => { const next = nextOcc(ev); return { ev, next, days: daysUntil(next) }; })
    .filter((x) => x.days >= 0)
    .sort((a, b) => a.days - b.days || (a.ev.time || '').localeCompare(b.ev.time || ''))
    .slice(0, n);
}
function activeReminders() {
  return upcoming(200)
    .filter((x) => x.ev.remind != null && x.ev.remind >= 0 && x.days <= x.ev.remind)
    .map((x) => ({ ...x, key: x.ev.id + ':' + isoOf(x.next), text: `${relDays(x.days)} · ${fmtDate(x.next, { weekday: 'long', day: 'numeric', month: 'long' })}${x.ev.time ? ' at ' + x.ev.time : ''}` }));
}
const calTile = (dt) => `<span class="cal" aria-hidden="true"><b>${dt.getDate()}</b><small>${dt.toLocaleDateString(undefined, { month: 'short' })}</small></span>`;
function upcomingList(ups) {
  if (!ups.length) return `<div class="empty">${icon('star', 'spark')}<strong>No dates yet</strong>Add birthdays, anniversaries and plans so they show up here.</div>`;
  return `<div class="up-list">${ups.map((u) => `<button class="up" data-ev="${esc(u.ev.id)}">${calTile(u.next)}<span><span class="t">${esc(u.ev.title)}</span><br><span class="s"><span class="${u.days <= 7 ? 'soon' : ''}">${esc(relDays(u.days))}</span>${occLabel(u.ev, u.next) ? ' · ' + esc(occLabel(u.ev, u.next)) : ''}</span></span></button>`).join('')}</div>`;
}
function bindUpcoming(el) {
  $$('[data-ev]', el).forEach((b) => (b.onclick = () => { const ev = S.data.dates.find((d) => d.id === b.dataset.ev); ev && openDateForm(ev); }));
}

function openDateForm(ev) {
  const e = ev || { type: 'Birthday', repeat: 'annual', remind: 7, date: todayISO(), knowYear: true };
  const ro = !!(ev && ev.seat && ev.seat !== S.me.seat);
  openModal({
    title: ev ? 'Edit date' : 'Add a date',
    body: `<form id="df">
      <label class="field"><span>What’s the occasion?</span><input name="title" required maxlength="120" value="${esc(e.title || '')}" placeholder="e.g. Maya’s birthday"></label>
      <div class="row">
        <label class="field"><span>Type</span><select name="type">${DATE_TYPES.map((t) => `<option ${t === e.type ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="field"><span>Date</span><input name="date" type="date" required value="${esc(e.date || '')}"></label>
        <label class="field"><span>Time (optional)</span><input name="time" type="time" value="${esc(e.time || '')}"></label>
      </div>
      <label class="check"><input type="checkbox" name="repeat" ${e.repeat === 'annual' ? 'checked' : ''}> Repeats every year</label>
      <label class="check"><input type="checkbox" name="knowYear" ${e.knowYear !== false ? 'checked' : ''}> The year is real (show age or years together)</label>
      <label class="field" style="margin-top:8px"><span>Remind us</span><select name="remind">${REMIND_OPTS.map(([v, l]) => `<option value="${v}" ${Number(e.remind ?? -1) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Note (optional)</span><textarea name="note" maxlength="2000">${esc(e.note || '')}</textarea></label>
      ${ev ? `<p class="hint">Added by ${esc(nameOf(ev.seat))} · ${esc(fmtStamp(ev.at))}${ro ? ` — only ${esc(nameOf(ev.seat))} can change or delete it` : ''}</p>` : ''}
    </form>`,
    foot: ro ? '<button class="btn" data-x2>Close</button>' : `${ev ? `<button class="btn ghost left" data-del>${icon('trash')}Delete</button>` : ''}<button class="btn ghost" data-x2>Cancel</button><button class="btn" data-save>${ev ? 'Save changes' : 'Add date'}</button>`,
    onMount: (m, close) => {
      const f = $('#df', m);
      $('[data-x2]', m).onclick = () => close();
      if (ro) { $$('input, select, textarea', f).forEach((x) => { x.disabled = true; }); return; }
      f.type.onchange = () => { if (['Birthday', 'Anniversary'].includes(f.type.value)) f.repeat.checked = true; };
      $('[data-save]', m).onclick = async () => {
        if (!f.reportValidity()) return;
        const body = {
          title: f.title.value.trim(), type: f.type.value, date: f.date.value, time: f.time.value || '',
          repeat: f.repeat.checked ? 'annual' : 'once', knowYear: f.knowYear.checked, remind: Number(f.remind.value), note: f.note.value.trim(),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        const btn = $('[data-save]', m); btn.disabled = true; btn.textContent = 'Saving…';
        try {
          if (ev) await retryOnce(() => S.st.db.doc('dates/' + ev.id).update({ ...body, editedSeat: S.me.seat, editedAt: Date.now() }));
          else await retryOnce(() => S.st.db.collection('dates').doc(uid()).set({ ...body, seat: S.me.seat, at: Date.now() }));
          toast(ev ? 'Date saved' : 'Date added'); close();
        } catch (er) { toast(errText(er), 'err'); btn.disabled = false; btn.textContent = 'Try again'; }
      };
      const d = $('[data-del]', m);
      if (d) d.onclick = async () => {
        if (!(await confirmBox(`Delete “${e.title}”?`, 'Delete date'))) return;
        try { await S.st.db.doc('dates/' + ev.id).delete(); toast('Date deleted'); close(); } catch (er) { toast(errText(er), 'err'); }
      };
    },
  });
}

VIEWS.dates = {
  mode: 'list',
  month: null,
  sel: null,
  mount(el) {
    if (!this.month) { const t = new Date(); this.month = new Date(t.getFullYear(), t.getMonth(), 1); }
    el.innerHTML = `${pageHead('Special dates', 'Birthdays, anniversaries and plans you don’t want to miss.')}
      <div class="toolbar">
        <div class="seg" role="group" aria-label="View"><button data-m="list">${'List'}</button><button data-m="cal">Calendar</button></div>
        <span class="grow"></span>
        <button class="btn" id="addDate">${icon('plus')}Add a date</button>
      </div>
      <div id="dbody"></div>`;
    $('#addDate', el).onclick = () => openDateForm();
    $$('[data-m]', el).forEach((b) => (b.onclick = () => { this.mode = b.dataset.m; draw(); }));
    const draw = () => {
      $$('[data-m]', el).forEach((b) => b.setAttribute('aria-pressed', b.dataset.m === this.mode));
      const box = $('#dbody', el);
      if (this.mode === 'list') box.innerHTML = this.listHtml(); else box.innerHTML = this.calHtml();
      $$('[data-ev]', box).forEach((b) => (b.onclick = () => { const ev = S.data.dates.find((d) => d.id === b.dataset.ev); ev && openDateForm(ev); }));
      const pm = $('[data-pm]', box), nm = $('[data-nm]', box);
      if (pm) pm.onclick = () => { this.month = new Date(this.month.getFullYear(), this.month.getMonth() - 1, 1); draw(); };
      if (nm) nm.onclick = () => { this.month = new Date(this.month.getFullYear(), this.month.getMonth() + 1, 1); draw(); };
      $$('[data-day]', box).forEach((b) => (b.onclick = () => { this.sel = b.dataset.day; draw(); }));
      const n = $('#notifyBtn', box);
      if (n) n.onclick = enableNotifications;
    };
    draw();
    this.off = onData((k) => { if (k === 'dates' || k === 'members' || k === 'mine') draw(); });
  },
  unmount() { this.off && this.off(); },
  row(u) {
    const extra = [u.ev.type, occLabel(u.ev, u.next), u.ev.repeat === 'annual' ? 'every year' : 'one time', u.ev.time ? 'at ' + u.ev.time : ''].filter(Boolean).join(' · ');
    return `<button class="date-row" data-ev="${esc(u.ev.id)}">${calTile(u.next)}
      <span style="min-width:0"><span style="font-weight:700;font-size:13px;display:block">${esc(u.ev.title)}</span><span class="s" style="color:var(--text-dim);font-size:11px">${esc(extra)}</span>${u.ev.remind >= 0 ? `<span style="display:block;font-size:11px;color:var(--text-dim)">${icon('bell').replace('<svg', '<svg style="width:13px;height:13px;vertical-align:-2px"')} ${esc(REMIND_OPTS.find(([v]) => v === u.ev.remind)[1])}</span>` : ''}</span>
      <span class="when ${u.days === 0 ? 'today' : ''}">${esc(u.days < 0 ? 'Passed' : relDays(u.days))}</span></button>`;
  },
  listHtml() {
    if (!S.data.dates.length) return `<div class="empty">${icon('star', 'spark')}<strong>Nothing on the calendar yet</strong>Start with a birthday or the day you met. Yearly dates come back around on their own.</div>`;
    const ups = upcoming(500);
    const past = S.data.dates.filter((e) => e.repeat !== 'annual' && daysUntil(nextOcc(e)) < 0)
      .map((ev) => { const next = nextOcc(ev); return { ev, next, days: daysUntil(next) }; }).sort((a, b) => b.next - a.next);
    const notif = typeof Notification !== 'undefined' && !(S.prefs.notify && Notification.permission === 'granted');
    return `${notif ? `<div class="banner">${icon('bell')}<span style="flex:1">Reminders always show in your inbox. You can also get alerts from this browser.</span><button class="btn sm ghost" id="notifyBtn">Turn on alerts</button></div>` : ''}
      <h2 class="sec" style="margin-top:6px">Upcoming</h2>${ups.length ? ups.map((u) => this.row(u)).join('') : '<p class="hint">Nothing ahead.</p>'}
      ${past.length ? `<h2 class="sec">Already happened</h2>${past.map((u) => this.row(u)).join('')}` : ''}`;
  },
  calHtml() {
    const m = this.month, y = m.getFullYear(), mo = m.getMonth();
    const first = new Date(y, mo, 1);
    const startDow = (first.getDay() + 6) % 7; // Monday first
    const start = new Date(y, mo, 1 - startDow);
    const today = isoOf(new Date());
    const byDay = {};
    for (const ev of S.data.dates) {
      const [ey, em, ed] = ev.date.split('-').map(Number);
      for (const yy of [y - 1, y, y + 1]) {
        if (ev.repeat !== 'annual' && yy !== ey) continue;
        if (ev.repeat === 'annual' && yy < ey) continue;
        const dt = mkDay(yy, em, ed); const k = isoOf(dt);
        (byDay[k] = byDay[k] || []).push(ev);
      }
    }
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const k = isoOf(d); const evs = byDay[k] || [];
      cells += `<button data-day="${k}" class="${d.getMonth() !== mo ? 'out' : ''} ${k === today ? 'today' : ''} ${k === this.sel ? 'sel' : ''}" aria-label="${esc(fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' }))}${evs.length ? ', ' + evs.length + ' date' + (evs.length > 1 ? 's' : '') : ''}">${d.getDate()}${evs.length ? `<span class="dots">${evs.slice(0, 3).map(() => '<i></i>').join('')}</span>` : ''}</button>`;
    }
    const sel = this.sel && byDay[this.sel];
    const dows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return `<div class="month" style="max-width:620px">
      <div class="month-h"><button data-pm aria-label="Previous month">${icon('left')}</button><span>${esc(m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))}</span><button data-nm aria-label="Next month">${icon('right')}</button></div>
      <div class="dow">${dows.map((d) => `<span>${d}</span>`).join('')}</div><div class="days">${cells}</div></div>
      <div style="max-width:620px;margin-top:16px">${this.sel ? `<h2 class="sec" style="margin-top:0">${esc(fmtDate(this.sel, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</h2>${sel ? sel.map((ev) => this.row({ ev, next: parseISO(this.sel), days: daysUntil(parseISO(this.sel)) })).join('') : '<p class="hint">Nothing on this day.</p>'}` : '<p class="hint">Tap a day to see what’s on it.</p>'}</div>`;
  },
};

async function enableNotifications() {
  if (typeof Notification === 'undefined') { toast('This browser can’t show alerts here. Reminders still appear in your inbox.', 'err'); return; }
  try {
    const p = await Notification.requestPermission();
    if (p === 'granted') { await savePrefs({ notify: true }); toast('Alerts are on for this browser'); checkBrowserReminders(); }
    else toast('Alerts are blocked here. Reminders still appear in your inbox.', 'err');
  } catch { toast('This view can’t ask for alerts. Reminders still appear in your inbox.', 'err'); }
  emit('mine');
}
