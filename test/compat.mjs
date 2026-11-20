// Two Kundalis → automatic compatibility, explained positions, forecasts, section backdrops
import { createRequire } from 'node:module';
import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const html = readFileSync(new URL('../dist/index.html', import.meta.url));
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(5183);
const OUT = '/home/claude/app/shots5'; mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
const p = await ctx.newPage();
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
const base = 'http://localhost:5183/';
const W = (ms) => p.waitForTimeout(ms);
const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
const make = async (name, date, time, city) => {
  await p.goto(base + '#kundlis'); await W(300);
  await p.click(`[data-k]:has-text("${name === 'Anya' ? 'Person A' : 'Person B'}")`).catch(() => {});
  await p.waitForSelector('[data-create]');
  await p.click('[data-create]');
  await p.fill('#wn', name); await p.fill('#wd', date); await p.fill('#wt', time);
  await p.click('[data-next]'); await p.fill('#pq', city); await W(400);
  await p.click('.pcard[data-i="0"]'); await W(200);
  await p.click('[data-next]'); await W(200); await p.click('[data-next]');
  await p.waitForSelector('#wsh', { timeout: 15000 });
  if (!(await p.isChecked('#wsh'))) await p.check('#wsh');
  await p.click('[data-next]'); await p.waitForSelector('.kcard', { timeout: 8000 }); await W(300);
};
await p.goto(base + '#inbox'); await p.waitForSelector('.demo-bar');
await make('Anya', '1999-05-14', '07:25', 'Moscow');
await p.click('.demo-bar [data-p="B"]'); await W(500);
await make('Rohan', '1996-02-02', '20:40', 'Mumbai');
// fresh visit → compatibility first
{
  await p.goto(base + '#inbox'); await W(200); await p.reload(); await W(500);
  await p.goto(base + '#kundlis'); await W(600);
}
console.log('vis', await p.evaluate(() => [kundaliOf('A'), kundaliOf('B')].map((k) => k ? (k.stub ? 'stub' : k.name) : null)));
const pressed = await p.$eval('#ktabs [aria-pressed="true"]', (e) => e.textContent);
console.log('default tab:', pressed);
await shot('01-compat-top');
console.log('score:', await p.$eval('.gm-score', (e) => e.innerText.replace(/\s+/g, ' ')));
console.log('kootas:', await p.$$eval('.koota summary', (a) => a.map((e) => e.innerText.replace(/\s+/g, ' ')).join(' | ')));
await p.click('.koota >> nth=7'); await W(100);
await p.$eval('.wheel', (e) => e.scrollIntoView({ block: 'start' })); await W(150); await shot('02-compat-map');
await p.$eval('.kgrid2.two', (e) => e.scrollIntoView({ block: 'start' })); await W(150); await shot('03-compat-overlay');
await p.click('[data-groom="B"]'); await W(300);
console.log('swapped score:', await p.$eval('.gm-score', (e) => e.innerText.replace(/\s+/g, ' ')));
// explained
await p.click('#ktabs [data-k="A"]'); await W(300);
await p.click('[data-sub="explain"]'); await W(300); await shot('04-explained');
const nRd = await p.$$eval('.rd', (a) => a.length); console.log('reading sections:', nRd);
const txt = await p.$eval('.rd[open] .rd-b', (e) => e.innerText); console.log('lagna reading words:', txt.split(/\s+/).length);
await p.click('.rd:nth-of-type(6) summary').catch(() => {});
// forecast
await p.click('[data-sub="forecast"]'); await W(400); await shot('05-today');
for (const r of ['week', 'month', 'year']) { const t0 = Date.now(); await p.click(`[data-fc="${r}"]`); await W(300); console.log(r, 'ms', Date.now() - t0); await shot('06-' + r); }
console.log('year text:', (await p.$eval('#kbody', (e) => e.innerText)).slice(0, 400).replace(/\s+/g, ' '));
// partner view of the other person's forecast
await p.click('#ktabs [data-k="B"]'); await W(300); console.log('B sub:', await p.$eval('.ksub [aria-pressed="true"]', (e) => e.textContent));
// backdrops per section
for (const v of ['inbox', 'gallery', 'locker', 'dates', 'notepad', 'kundlis']) { await p.goto(base + '#' + v); await W(700); console.log(v, '→', await p.$eval('.scene', (e) => e.dataset.key)); await shot('bg-' + v); }
console.log('ERRORS:', errors.length ? errors : 'none');
await browser.close(); srv.close();
