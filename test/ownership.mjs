// Ownership & PIN: you can only add or change things as yourself.
import { createRequire } from 'node:module';
import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const html = readFileSync(new URL('../android/app/src/main/assets/www/index.html', import.meta.url));
const srv = http.createServer((q, r) => { if (q.url !== '/' && !q.url.startsWith('/#')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(5191);
const OUT = '/home/claude/app/shots7'; mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => { errs.push(e.stack || String(e)); });
let last = 'start'; let fails = 0; const ok = (c, m) => { last = m; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const W = (ms) => p.waitForTimeout(ms);
const me = () => p.evaluate(() => S.me.seat);

await p.goto('http://localhost:5191/');
await p.waitForSelector('#setupForm');
await p.fill('#setupForm [name=a]', 'Anya'); await p.fill('#setupForm [name=pin]', '12'); await p.fill('#setupForm [name=b]', 'Rohan');
await p.click('#setupForm button'); await W(300);
ok(await p.$('#setupForm') && /PIN/i.test(await p.$eval('#setupErr', (e) => e.textContent)), 'Setup rejects a too-short PIN');
await p.fill('#setupForm [name=pin]', '1111'); await p.click('#setupForm button');
await p.waitForSelector('#draft'); await W(500);
ok(await me() === 'A', 'After setup you are Anya');

// switching to the partner: first time creates their PIN (they must be present)
await p.click('.demo-bar [data-p="B"]'); await W(300);
ok(!!(await p.$('#pin1')), 'Switching to Rohan asks for a PIN');
await p.fill('#pin1', '2222'); if (await p.$('#pin2')) await p.fill('#pin2', '2222');
await p.click('[data-ok]'); await p.waitForLoadState('load'); await W(800);
ok(await me() === 'B', 'Rohan is now using the app');

// switching back requires Anya's PIN; a wrong PIN is refused
await p.click('.demo-bar [data-p="A"]'); await W(300);
await p.fill('#pin1', '9999'); await p.click('[data-ok]'); await W(400);
ok(await me() === 'B' && !!(await p.$('#pin1')), 'Wrong PIN does not switch person');
await p.screenshot({ path: OUT + '/30-pin-wrong.png' });
await p.fill('#pin1', '1111'); await p.click('[data-ok]'); await p.waitForLoadState('load'); await W(800);
ok(await me() === 'A', 'Correct PIN switches back to Anya');

// Anya's things are read-only for Rohan — create them as Anya, then look as Rohan
await p.evaluate(async () => {
  const db = S.st.db, at = Date.now();
  await db.collection('contacts').doc('c1').set({ name: 'Anya’s dentist', phone: '123', seat: 'A', at });
  await db.collection('dates').doc('d1').set({ title: 'Anya’s exam', label: 'Exam', date: '2027-01-10', seat: 'A', at });
  await db.collection('notes').doc('n1').set({ title: 'Anya’s list', body: 'milk', seat: 'A', at, rev: 1 });
});
await p.click('.demo-bar [data-p="B"]'); await W(300);
await p.fill('#pin1', '2222'); await p.click('[data-ok]'); await p.waitForLoadState('load'); await W(800);
ok(await me() === 'B', 'Back to Rohan with his PIN');

const foot = () => p.$eval('.modal', (m) => m.innerText);
await p.evaluate(() => openContact(S.data.contacts.find((c) => c.id === 'c1'))); await W(300);
ok(!/Delete|Save/.test(await foot()) && await p.$eval('.modal fieldset', (f) => f.disabled), 'Rohan cannot edit or delete Anya’s contact');
await p.screenshot({ path: OUT + '/31-contact-ro.png' });
await p.keyboard.press('Escape'); await W(200);
const dEv = await p.evaluate(() => (S.data.dates || []).find((d) => d.id === 'd1'));
await p.evaluate((d) => openDateForm(d), dEv); await W(300);
ok(!/Delete|Save/.test(await foot()), 'Rohan cannot edit or delete Anya’s date');
await p.keyboard.press('Escape'); await W(200);
await p.evaluate(() => openDoc({ id: 'l1', title: 'Anya’s passport', name: 'p.txt', type: 'text/plain', size: 3, asset: 'x', seat: 'A', at: Date.now() })); await W(300);
ok(!(await p.$('.modal [data-del]')) && !(await p.$('.modal [data-ed]')) && /only they can edit/.test(await foot()), 'Rohan cannot edit or delete Anya’s locker item');
await p.keyboard.press('Escape'); await W(200);
await p.evaluate(() => openViewer([{ id: 'p1', full: 'x', caption: 'Anya’s photo', seat: 'A', at: Date.now() }], 0)); await W(300);
ok(!(await p.$('.viewer [data-del]')) && !(await p.$('.viewer [data-ed]')), 'Rohan cannot edit or delete Anya’s photo');
await p.click('.viewer [data-c]'); await W(200);
await p.evaluate(() => openViewer([{ id: 'p2', full: 'x', caption: 'Rohan’s photo', seat: 'B', at: Date.now() }], 0)); await W(300);
ok(!!(await p.$('.viewer [data-del]')), 'Rohan can delete his own photo');
await p.click('.viewer [data-c]'); await W(200);

// note: read-only + copy
await p.goto('http://localhost:5191/#notepad'); await W(400);
const cards = await p.$$('.note-card'); await cards[0].click(); await W(300);
ok(!(await p.$eval('#nb', (e) => e.isContentEditable)) && /copy as mine/.test(await p.$eval('#nsave', (e) => e.textContent)), 'Anya’s note is read-only for Rohan, with “Save a copy as mine”');

// charts: Rohan cannot create Anya’s chart
await p.goto('http://localhost:5191/#kundlis'); await W(400);
await p.click('#ktabs [data-k="A"]'); await W(300);
const kb = await p.$$eval('#kbody button', (a) => a.map((b) => b.textContent).join(' | '));
ok(!/create|birth|edit/i.test(kb), 'No way to create or edit Anya’s chart as Rohan');
await p.screenshot({ path: OUT + '/32-partner-chart.png' });
await p.click('#ktabs [data-k="B"]'); await W(300);
ok(/create|birth/i.test(await p.$$eval('#kbody button', (a) => a.map((b) => b.textContent).join(' | '))), 'Rohan can create his own chart');

// lock screen
await p.click('.demo-bar [data-lock]'); await W(300);
ok(!!(await p.$('.pinlock')), 'Lock button shows the “Who’s using the app?” screen');
await p.screenshot({ path: OUT + '/33-lock.png' });

console.log(fails ? `${fails} CHECK(S) FAILED` : 'ALL CHECKS PASSED');
console.log('ERRORS:', errs.length ? errs : 'none');
await browser.close(); srv.close();
process.exit(fails || errs.length ? 1 : 0);
