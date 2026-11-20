import { createRequire } from 'node:module';
import http from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const html = readFileSync(new URL('../dist/index.html', import.meta.url));
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(5179);
mkdirSync('/home/claude/app/shots2', { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const errors = [];
const mk = async (opts) => {
  const ctx = await browser.newContext({ ...opts, acceptDownloads: true });
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  return p;
};
const shot = (p, n) => p.screenshot({ path: `/home/claude/app/shots2/${n}.png` });
const base = 'http://localhost:5179/';
const log = (...a) => console.log(...a);

// ---------- Desktop, Person A: Journey A (Moscow) ----------
const d = await mk({ viewport: { width: 1440, height: 900 } });
await d.goto(base + '#kundlis');
await d.waitForSelector('[data-create]');
await shot(d, '01-desk-kundli-empty');
await d.click('[data-create]');
await d.fill('#wn', 'Anya');
await d.fill('#wd', '1999-05-14');
await d.fill('#wt', '07:25');
await d.waitForTimeout(100);
log('time echo:', await d.$eval('#wtEcho', (e) => e.textContent));
await shot(d, '02-wizard-step1');
await d.click('[data-next]');
await d.fill('#pq', 'Moscow');
await d.waitForTimeout(400);
await shot(d, '03-wizard-search');
await d.click('.pcard[data-i="0"]');
await d.waitForTimeout(300);
log('selected:', await d.$eval('#psel', (e) => e.innerText.replace(/\s+/g, ' ')));
await shot(d, '04-wizard-place');
await d.click('[data-next]');
await d.waitForTimeout(200);
log('review:', await d.$eval('.review', (e) => e.innerText.replace(/\s+/g, ' ')));
await shot(d, '05-wizard-review');
await d.click('[data-next]');
await d.waitForSelector('.kgrid2.tight', { timeout: 15000 });
await shot(d, '06-wizard-chart');
log('preview:', await d.$eval('.kgrid2.tight .dl', (e) => e.innerText.replace(/\s+/g, ' ')));
await d.click('[data-next]');
await d.waitForSelector('.kcard', { timeout: 8000 });
await d.waitForTimeout(400);
await shot(d, '07-desk-kundli');
await d.screenshot({ path: '/home/claude/app/shots2/07b-desk-kundli-full.png', fullPage: false });
// scroll captures
for (const [i, sel] of [['08', '.chartp'], ['09', 'table.graha'], ['10', '.houses'], ['11', '.dashas'], ['12', '.settings-p']]) {
  await d.$eval(sel, (e) => e.scrollIntoView({ block: 'start' })); await d.waitForTimeout(150); await shot(d, i + '-desk-' + sel.replace(/[^a-z]/g, ''));
}
// tooltip
await d.$eval('.kids', (e) => e.scrollIntoView({ block: 'center' }));
await d.click('.kids .info');
await d.waitForTimeout(200);
await shot(d, '13-tooltip');
// graha select
await d.click('tr[data-gsel="Moon"]');
await d.waitForTimeout(200);
log('graha panel:', await d.$eval('#gsel', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 200)));
// south style
await d.click('[data-style="south"]');
await d.waitForTimeout(200);
await d.$eval('.chartp', (e) => e.scrollIntoView({ block: 'start' }));
await shot(d, '14-south');
await d.click('[data-style="north"]');
// planets table text
log('placements:\n' + (await d.$eval('table.graha tbody', (e) => e.innerText)));
// Advanced settings → recalc with Raman
await d.$eval('.settings-p', (e) => e.scrollIntoView());
await d.click('.settings-p summary');
await d.selectOption('#setAy', 'raman');
await d.click('[data-applyset]');
await d.waitForSelector('.modal [data-ok]', { timeout: 10000 });
log('changes:', await d.$eval('.modal .mb', (e) => e.innerText.replace(/\s+/g, ' ')));
await shot(d, '15-recalc-diff');
await d.click('.modal [data-ok]');
await d.waitForTimeout(500);
// PDF download
await d.$eval('.kcard', (e) => e.scrollIntoView());
await d.click('.kcard [data-dl]');
const [dl] = await Promise.all([d.waitForEvent('download'), d.click('.modal [data-pdf]')]);
const pdfPath = '/home/claude/app/shots2/kundali.pdf'; await dl.saveAs(pdfPath);
await d.waitForTimeout(300);
await d.click('.kcard [data-dl]');
const [dl2] = await Promise.all([d.waitForEvent('download'), d.click('.modal [data-png]')]);
await dl2.saveAs('/home/claude/app/shots2/chart.png');

// ---------- Journey B: Vilnius pin + Journey C: unknown time, as Person B on phone ----------
const ls = await d.evaluate(() => localStorage.getItem('oss.db.v1'));
const p = await mk({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(base);
await p.evaluate((v) => { localStorage.setItem('oss.db.v1', v); localStorage.setItem('oss.demoPerson', 'B'); }, ls);
await p.goto(base + '#kundlis'); await p.reload();
await p.waitForSelector('#ktabs');
await p.waitForTimeout(500);
await p.click('[data-k="A"]'); await p.waitForTimeout(300);
await shot(p, '20-phone-partner-view');
await p.click('[data-k="B"]'); await p.waitForTimeout(200);
await p.click('[data-create]');
await p.fill('#wd', '1990-08-02');
await p.check('#wu');
await p.click('[data-next]');
await p.fill('#pq', 'Vilnius');
await p.press('#pq', 'Enter');
await p.waitForTimeout(300);
await shot(p, '21-phone-place');
// nudge the pin by tapping the map
const box = await p.$eval('.mp-canvas', (e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
await p.mouse.click(box[0] + box[2] / 2 + 30, box[1] + box[3] / 2 + 10);
await p.waitForTimeout(200);
log('pin:', await p.$eval('#psel', (e) => e.innerText.replace(/\s+/g, ' ')));
await p.click('[data-next]'); await p.waitForTimeout(200);
await shot(p, '22-phone-review');
await p.click('[data-next]');
await p.waitForSelector('.kgrid2.tight', { timeout: 15000 });
await shot(p, '23-phone-chart-preview');
await p.click('[data-next]');
await p.waitForSelector('.kcard'); await p.waitForTimeout(300);
await shot(p, '24-phone-kundli-unknown-time');
log('unknown-time ids:', await p.$eval('.kids', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 300)));

// ---------- DST gap & wider search fallback, Person B editing ----------
await p.click('[data-edit]');
await p.uncheck('#wu');
await p.fill('#wd', '2024-03-31');
await p.fill('#wt', '03:30');
await p.click('[data-next]');
await p.fill('#pq', 'Ulaanbaatar Sukhbaatar district'); await p.press('#pq', 'Enter'); await p.waitForTimeout(200);
const wide = await p.$('[data-wide]'); if (wide) { await wide.click(); await p.waitForTimeout(800); }
log('wide search msg:', await p.$eval('#pres', (e) => e.innerText.replace(/\s+/g, ' ')));
await p.fill('#mla', '54.6872'); await p.fill('#mlo', '25.2797'); await p.selectOption('#mcc', 'LT'); await p.click('#mgo');
await p.waitForTimeout(200);
await p.click('[data-next]'); await p.waitForTimeout(200);
log('gap review:', await p.$eval('#wz', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 400)));
await shot(p, '25-phone-gap');
await p.keyboard.press('Escape');

// ---------- whole-app theme screenshots ----------
for (const v of ['inbox', 'gallery', 'locker', 'notepad', 'contacts', 'dates', 'account']) { await d.goto(base + '#' + v); await d.waitForTimeout(400); await shot(d, '30-desk-' + v); }
for (const v of ['inbox', 'dates', 'account']) { await p.goto(base + '#' + v); await p.waitForTimeout(400); await shot(p, '31-phone-' + v); }

log('ERRORS:', errors.length ? errors : 'none');
await browser.close(); srv.close();
