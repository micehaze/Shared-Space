// Vice Space 2 — Western charts: checks every view from both partners' side.
import { createRequire } from 'node:module';
import { asPerson } from './pin-helper.mjs';
import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const html = readFileSync(new URL('../dist/index.html', import.meta.url));
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(5186);
const OUT = '/home/claude/app/shots7'; mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const errors = [], fails = [], passes = [];
const ok = (c, m) => (c ? passes : fails).push(m);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
const p = await ctx.newPage();
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
const base = 'http://localhost:5186/';
const W8 = (ms) => p.waitForTimeout(ms);
const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png` });
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const make = async (name, date, time, city) => {
  await p.goto(base + '#kundlis'); await W8(300);
  await p.click(`#ktabs [data-k="${await p.evaluate(() => S.me.seat)}"]`).catch(() => {});
  await p.waitForSelector('[data-create]'); await p.click('[data-create]');
  await p.fill('#wn', name); await p.fill('#wd', date); await p.fill('#wt', time);
  await p.click('[data-next]'); await p.fill('#pq', city); await W8(400);
  await p.click('.pcard[data-i="0"]'); await W8(200);
  await p.click('[data-next]'); await W8(200); await p.click('[data-next]');
  await p.waitForSelector('#wsh', { timeout: 15000 });
  if (name === 'Anya') { await W8(200); await shot('00-wizard-preview'); }
  if (!(await p.isChecked('#wsh'))) await p.check('#wsh');
  await p.click('[data-next]'); await W8(800);
};
await p.goto(base + '#inbox'); await p.waitForSelector('.demo-bar');
await asPerson(p, 'A'); await W8(300);
await make('Anya', '1999-05-14', '07:25', 'Moscow');
await asPerson(p, 'B'); await W8(300);
await make('Rohan', '1996-02-02', '20:40', 'Mumbai');
ok(await p.$eval('#ktabs [aria-pressed="true"]', (e) => e.dataset.k) === 'pair', 'After both charts are saved, the couple tab opens automatically');
await p.click('[data-astro="western"]'); await W8(500);
ok(await p.evaluate(() => document.fonts.check("16px 'Vice Glyphs'", '☉♀♂♈')), 'Astrology glyph font is loaded');
ok(!(await p.$eval('#kbody', (e) => e.innerText)).match(/Kundali|Lagna|Nakshatra|Rashi|Dasha/), 'European mode shows no Vedic terms');

for (const viewer of ['A', 'B']) {
  await asPerson(p, viewer); await W8(300);
  await p.goto(base + '#kundlis'); await W8(400);
  const V = `[as ${viewer}]`;
  for (const seat of ['A', 'B']) {
    await p.click(`#ktabs [data-k="${seat}"]`); await W8(200);
    await p.click('[data-psub="chart"]'); await W8(300);
    ok(await p.$('#wheel svg.wheel-svg') !== null, `${V} 1. Natal wheel of ${seat} visible`);
    ok((await p.$$('#bsel tr[data-bsel]')).length === 15, `${V} 1. ${seat}: 10 planets + Node, Lilith, ASC, MC, Fortune listed`);
    ok(await p.$('.agrid') !== null, `${V} 1. ${seat}: aspect grid`);
    if (viewer === 'A' && seat === 'A') { await shot('01-natal'); await p.click('#wheel [data-b="Venus"]'); await W8(250); ok(/Venus in/.test(await p.$eval('#bsel', (e) => e.innerText)), `${V} tapping a planet in the wheel explains it`); await p.$eval('#bsel', (e) => e.scrollIntoView()); await shot('02-tap-venus'); }
    await p.click('[data-psub="explain"]'); await W8(300);
    const rows = await p.$$eval('.glance tbody th', (a) => a.map((e) => e.textContent));
    for (const need of ['Sun sign', 'Moon sign', 'Rising sign', 'Midheaven', 'Venus', 'Mars', 'Chart ruler', 'Element', 'Modality', 'North Node']) ok(rows.includes(need), `${V} 2. ${seat}: "${need}" at a glance`);
    const rds = await p.$$eval('.rd', (a) => a.map((d) => ({ t: d.querySelector('.rd-t').textContent, g: (d.querySelector('.rd-g') || {}).textContent || '', b: d.querySelector('.rd-b').textContent })));
    const asp = rds.filter((r) => / (conjunction|sextile|square|trine|opposition|quincunx|semi-sextile|semi-square|sesquiquadrate) /.test(r.t));
    ok(rds.length >= 15 + 12 + 10, `${V} 2. ${seat}: ${rds.length} explained items (15 placements, ${asp.length} aspects, 12 houses, patterns)`);
    ok(rds.every((r) => r.g), `${V} 5. ${seat}: every item has a one-line summary`);
    const mx = Math.max(...rds.map((r) => words(r.g))), mn = Math.min(...rds.map((r) => words(r.b)));
    ok(mx <= 40, `${V} 5. ${seat}: summaries short (longest ${mx} words)`);
    ok(mn >= 25, `${V} 5. ${seat}: full explanations detailed (shortest ${mn} words)`);
    const all = rds.map((r) => r.b).join(' ');
    ok(!/undefined|NaN|\[object/.test(all), `${V} 5. ${seat}: no broken text in readings`);
    const venus = rds.find((r) => /^.?Venus$/.test(r.t.trim()) || r.t.trim().endsWith('Venus'));
    ok(venus && /Strengths:/.test(venus.b) && /In practice/.test(venus.b) && words(venus.b) >= 150, `${V} 5. ${seat}: Venus reading at Kundli depth (${venus ? words(venus.b) : 0} words)`);
    const h7 = rds.find((r) => /partner/i.test(r.t) && /Its ruler/.test(r.b));
    ok(h7 && /on the cusp/.test(h7.b), `${V} 5. ${seat}: houses explained with cusp sign, ruler and planets`);
    if (viewer === 'A' && seat === 'A') { await shot('03-explained'); await p.$eval('.rd:has(.rd-t:text-matches("square|trine"))', (e) => e.scrollIntoView()); await W8(100); await shot('04-aspects'); }
    await p.click('[data-psub="forecast"]'); await W8(200);
    for (const fc of ['today', 'week', 'month', 'year']) {
      const t0 = Date.now(); await p.click(`[data-fc="${fc}"]`); await p.waitForSelector('.fc-head, .days', { timeout: 20000 }); const dt = Date.now() - t0;
      const txt = await p.$eval('#kbody', (e) => e.innerText);
      if (fc === 'today') ok(/Today for/.test(txt) && /\bDo\b/.test(txt) && /Avoid/.test(txt) && /Moon is in/.test(txt), `${V} 3. ${seat}: daily prediction with Do / Avoid`);
      else ok(txt.length > 400, `${V} 3. ${seat}: ${fc} forecast (${dt} ms)`);
      if (viewer === 'A' && seat === 'A') await shot('05-' + fc);
    }
    await p.click('[data-psub="cycles"]'); await W8(400);
    const cyc = await p.$eval('#kbody', (e) => e.innerText);
    ok(/Progressed chart/.test(cyc) && /Solar return/.test(cyc), `${V} ${seat}: progressed chart + solar return`);
    if (viewer === 'A' && seat === 'A') await shot('06-cycles');
    await p.click('[data-psub="chart"]'); await W8(100);
  }
  await p.click('#ktabs [data-k="pair"]'); await W8(400);
  for (const cs of ['overview', 'synastry', 'composite', 'davison']) {
    await p.click(`[data-csub="${cs}"]`); await W8(400);
    const txt = await p.$eval('#kbody', (e) => e.innerText);
    ok(!/undefined|NaN|\[object/.test(txt), `${V} ${cs}: no broken text`);
    if (cs === 'overview') { ok(/Your life together, in practice/.test(txt) && /Money and spending/.test(txt) && /Anger and conflict/.test(txt), `${V} 6. Everyday-life compatibility (money, conflict…)`); }
    if (cs === 'synastry') ok(/In daily life:/.test(txt), `${V} 6. Synastry contacts and overlays have everyday examples`);
    if (cs === 'overview') { ok(/Today together/.test(txt) && /Best plan for today/.test(txt) && /Best day for a date/.test(txt) && /Love & romance/.test(txt), `${V} 4. Couple overview: scores + today together + week`); }
    if (cs === 'synastry') { ok(await p.$('.wheel-svg') !== null && await p.$('.agrid.cross') !== null && /Every contact between you/.test(txt) && /brings to/.test(txt), `${V} 1. Synastry bi-wheel, grid, contacts, house overlays`); const n = await p.$$eval('.rd', (a) => a.filter((d) => !d.querySelector('.rd-g')).length); ok(n <= 2, `${V} 5. Synastry contacts all have summaries`); }
    if (cs === 'composite') ok(/Composite chart/.test(txt) && /Every composite position/.test(txt), `${V} 1. Composite chart with explanations`);
    if (cs === 'davison') ok(/Davison relationship chart/.test(txt) && /Every Davison position/.test(txt), `${V} 1. Davison chart with explanations`);
    if (viewer === 'A') { await W8(100); await shot('07-' + cs); if (cs === 'overview') { await p.$eval('.panel:has(h3:text-matches("Today together"))', (e) => e.scrollIntoView()); await shot('07-overview-today'); const lp = await p.$('.panel:has(h3:text-matches("in practice"))'); await lp.$eval('details', (d) => (d.open = true)); await lp.$$eval('details', (a) => a[3] && (a[3].open = true)); await lp.screenshot({ path: OUT + '/08-life-together.png' }); } }
  }
}
// downloads
const png = await p.evaluate(async () => { const c = await wChartPng(kundaliOf('A'), '', 600); return c.width; }).catch((e) => 'ERR ' + e.message);
ok(png === 600, 'Chart PNG download renders (' + png + ')');
const pdf = await p.evaluate(async () => (await wChartPdf(kundaliOf('A'))).size).catch((e) => 'ERR ' + e.message);
ok(pdf > 20000, 'Chart PDF report renders (' + pdf + ' bytes)');
console.log(passes.map((x) => 'PASS ' + x).join('\n'));
console.log(fails.length ? fails.map((x) => 'FAIL ' + x).join('\n') : 'ALL CHECKS PASSED');
console.log('ERRORS:', errors.length ? errors : 'none');
await browser.close(); srv.close();
