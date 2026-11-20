/* ============================================================
   Time zones — IANA tzdb via the browser's Intl API (historical rules,
   DST, and pre-standard local mean time where the database has it).
   ============================================================ */
const TZ = (() => {
  const fmtCache = new Map();
  const fmt = (tz) => {
    if (!fmtCache.has(tz)) fmtCache.set(tz, new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', era: 'short' }));
    return fmtCache.get(tz);
  };
  function isValid(tz) { try { fmt(tz).format(0); return true; } catch { return false; } }
  // offset in seconds (local − UTC) at a UTC instant
  function offsetSec(tz, utcMs) {
    const parts = {};
    for (const p of fmt(tz).formatToParts(new Date(Math.floor(utcMs / 1000) * 1000))) parts[p.type] = p.value;
    let y = Number(parts.year); if (parts.era && /^B/.test(parts.era)) y = 1 - y;
    const wall = Date.UTC(y, Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second));
    const d = new Date(0); d.setUTCFullYear(y, Number(parts.month) - 1, Number(parts.day)); d.setUTCHours(Number(parts.hour) % 24, Number(parts.minute), Number(parts.second));
    return Math.round((d.getTime() - Math.floor(utcMs / 1000) * 1000) / 1000) || Math.round((wall - Math.floor(utcMs / 1000) * 1000) / 1000);
  }
  const wallMs = ({ y, m, d, h = 12, mi = 0 }) => { const t = new Date(0); t.setUTCFullYear(y, m - 1, d); t.setUTCHours(h, mi, 0, 0); return t.getTime(); };
  // Local clock time → UTC, detecting skipped (gap) and repeated (overlap) clock times
  function localToUtc(local, tz) {
    const L = wallMs(local);
    const cands = new Set([offsetSec(tz, L - 86400000), offsetSec(tz, L + 86400000), offsetSec(tz, L)]);
    const sols = [];
    for (const o of cands) { const u = L - o * 1000; if (offsetSec(tz, u) === o && !sols.some((s) => s.utcMs === u)) sols.push({ utcMs: u, offsetSec: o }); }
    sols.sort((a, b) => a.utcMs - b.utcMs);
    if (sols.length === 1) return { status: 'ok', ...sols[0] };
    if (sols.length > 1) return { status: 'overlap', options: sols };
    // gap: the clock jumped over this time. Offer the time read with the offset before and after the jump.
    const before = offsetSec(tz, L - 86400000), after = offsetSec(tz, L + 86400000);
    return { status: 'gap', options: [{ utcMs: L - before * 1000, offsetSec: before, label: 'before' }, { utcMs: L - after * 1000, offsetSec: after, label: 'after' }] };
  }
  function fmtOffset(sec) {
    const s = sec < 0 ? '−' : '+', a = Math.abs(sec);
    const h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60), r = a % 60;
    return `UTC${s}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${r ? ':' + String(r).padStart(2, '0') : ''}`;
  }
  function confidence(local, offset) {
    const notes = [];
    if (offset % 900 !== 0) notes.push('This offset is local mean time — clocks were set by the Sun, not a standard zone. Records from this period can be uncertain.');
    if (local.y < 1970) notes.push('Time zone records before 1970 can be incomplete. If you have a local source (birth certificate, almanac), check the offset shown.');
    return { level: notes.length ? 'check' : 'good', notes };
  }
  function abbr(tz, utcMs) {
    try { return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(utcMs)).find((p) => p.type === 'timeZoneName').value; } catch { return ''; }
  }
  return { isValid, offsetSec, localToUtc, fmtOffset, confidence, abbr, wallMs };
})();
if (typeof module !== 'undefined') module.exports = TZ;
