// Checks the five Kundli requirements from both partners' point of view.
import { createRequire } from 'node:module';
import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const html = readFileSync(new URL('../dist/index.html', import.meta.url));
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(5184);
const OUT = '/home/claude/app/shots6'; mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const errors = [], fails = [], passes = [];
const ok = (cond, msg) => (cond ? passes : fails).push(msg);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
const p = await ctx.newPage();
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
const base = 'http://localhost:5184/';
const W = (ms) => p.waitForTimeout(ms);
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const make = async (name, date, time, city) => {
  await p.goto(base + '#kundlis'); await W(300);
  await p.click(`#ktabs [data-k="${await p.evaluate(() => S.me.seat)}"]`).catch(() => {});
  await p.waitForSelector('[data-create]'); await p.click('[data-create]');
  await p.fill('#wn', name); await p.fill('#wd', date); await p.fill('#wt', time);
  await p.click('[data-next]'); await p.fill('#pq', city); await W(400);
  await p.click('.pcard[data-i="0"]'); await W(200);
  await p.click('[data-next]'); await W(200); await p.click('[data-next]');
  await p.waitForSelector('#wsh', { timeout: 15000 });
  if (!(await p.isChecked('#wsh'))) await p.check('#wsh');
  await p.click('[data-next]'); await W(800);
};
await p.goto(base + '#inbox'); await p.waitForSelector('.demo-bar');
await p.click('.demo-bar [data-p="A"]'); await W(400);
await make('Anya', '1999-05-14', '07:25', 'Moscow');
await p.click('.demo-bar [data-p="B"]'); await W(400);
await make('Rohan', '1996-02-02', '20:40', 'Mumbai');
ok(await p.$eval('#ktabs [aria-pressed="true"]', (e) => e.dataset.k) === 'pair', 'After the second Kundli is saved, Compatibility opens automatically');

for (const viewer of ['A', 'B']) {
  await p.click(`.demo-bar [data-p="${viewer}"]`); await W(400);
  await p.goto(base + '#kundlis'); await W(500);
  const V = `[viewing as ${viewer}]`;
  // 1 — both charts and the compatibility map
  for (const seat of ['A', 'B']) {
    await p.click(`#ktabs [data-k="${seat}"]`); await W(250);
    await p.click('[data-sub="chart"]'); await W(250);
    ok(await p.$('#kbody svg.kchart') !== null, `${V} 1. Chart of person ${seat} is visible`);
  }
  await p.click('#ktabs [data-k="pair"]'); await W(400);
  ok(await p.$('.wheel') !== null, `${V} 1. Compatibility map (two-ring wheel) is visible`);
  ok((await p.$$('.kgrid2.two svg.kchart')).length === 2, `${V} 1. Compatibility kundali (each other's planets in your houses) is visible`);
  ok((await p.$$('.koota')).length === 8, `${V} 1. All 8 Guna Milan kootas shown`);
  // 4 — couple daily prediction
  const tog = await p.$eval('.panel:has(h3:text-matches("Today together"))', (e) => e.innerText).catch(() => '');
  ok(/Best plan for today/.test(tog) && /Your week together/.test(tog) && /Best day for a date/.test(tog), `${V} 4. Daily prediction for the couple (today + week) is visible`);
  if (viewer === 'A') { await p.$eval('.panel:has(h3:text-matches("Today together"))', (e) => e.scrollIntoView()); await W(150); await p.screenshot({ path: `${OUT}/04-together.png` }); }
  // 5 — side by side short summaries
  const gl2 = await p.$$eval('.glance.two tbody tr', (r) => r.length);
  ok(gl2 >= 10, `${V} 2/5. Side-by-side summary table has ${gl2} rows (Lagna … Manglik) for both`);
  for (const seat of ['A', 'B']) {
    await p.click(`#ktabs [data-k="${seat}"]`); await W(250);
    // 2 + 5 — explained
    await p.click('[data-sub="explain"]'); await W(300);
    const rows = await p.$$eval('.glance tbody th', (a) => a.map((e) => e.textContent));
    for (const need of ['Lagna', 'Rashi', 'Sun sign', 'Nakshatra', 'Pada', 'Varna', 'Vashya', 'Gana', 'Yoni', 'Nadi', 'Manglik']) ok(rows.some((r) => r.startsWith(need)), `${V} 2. Person ${seat}: "${need}" explained at a glance`);
    const rds = await p.$$eval('.rd', (a) => a.map((d) => ({ t: d.querySelector('.rd-t').textContent, g: (d.querySelector('.rd-g') || {}).textContent || '', b: d.querySelector('.rd-b').textContent })));
    const grahas = rds.filter((r) => /Surya|Chandra|Mangal|Budh|Guru|Shukra|Shani|Rahu|Ketu/.test(r.t) && !/yoga/i.test(r.t));
    ok(grahas.length === 9, `${V} 2. Person ${seat}: all 9 grahas explained (${grahas.length})`);
    ok(rds.filter((r) => /bhava/.test(r.t)).length === 12, `${V} 2. Person ${seat}: all 12 houses explained`);
    const noShort = rds.filter((r) => !r.g && !/yoga|Manglik|Kemadruma/i.test(r.t));
    ok(noShort.length === 0, `${V} 5. Person ${seat}: every position has a one-line summary${noShort.length ? ' — missing: ' + noShort.map((r) => r.t).join(', ') : ''}`);
    const maxShort = Math.max(...rds.filter((r) => r.g).map((r) => words(r.g)));
    ok(maxShort <= 30, `${V} 5. Person ${seat}: summaries are short (longest ${maxShort} words)`);
    const shortest = rds.filter((r) => r.g).sort((x, y) => words(x.b) - words(y.b))[0]; const minLong = words(shortest.b);
    ok(minLong >= 25, `${V} 5. Person ${seat}: full explanations are detailed (shortest ${minLong} words: ${shortest.t})`);
    if (viewer === 'A' && seat === 'A') { await p.screenshot({ path: `${OUT}/02-glance.png` }); await p.$eval('.rd:has(.rd-t:text-matches("Surya"))', (e) => e.scrollIntoView()); await W(150); await p.screenshot({ path: `${OUT}/03-grahas.png` }); }
    // 3 — daily prediction with advice
    await p.click('[data-sub="forecast"]'); await W(300); await p.click('[data-fc="today"]'); await W(300);
    const today = await p.$eval('#kbody', (e) => e.innerText);
    ok(/Today for/.test(today) && /\bDo\b/.test(today) && /Avoid/.test(today) && /Colour of the day/.test(today), `${V} 3. Person ${seat}: daily prediction with Do / Avoid advice`);
    if (viewer === 'A' && seat === 'B') await p.screenshot({ path: `${OUT}/05-today-advice.png` });
  }
}
console.log(passes.map((x) => 'PASS ' + x).join('\n'));
console.log(fails.length ? fails.map((x) => 'FAIL ' + x).join('\n') : 'ALL CHECKS PASSED');
console.log('ERRORS:', errors.length ? errors : 'none');
await browser.close(); srv.close();
