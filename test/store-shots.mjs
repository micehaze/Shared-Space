// Seed realistic demo content and capture phone screens for a preview board
import { createRequire } from 'node:module';
import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const html = readFileSync(new URL('../dist/index.html', import.meta.url));
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(5181);
const OUT = '/home/claude/app/store/screens'; mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 360, height: 720 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '.demo-bar{display:none!important}'; document.head.appendChild(s); }));
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.stack));
const base = 'http://localhost:5181/';
const W = (ms) => p.waitForTimeout(ms);
const as = async (seat) => { await p.goto(base); await p.evaluate((s) => localStorage.setItem('oss.demoPerson', s), seat); await p.goto(base + '#inbox'); await p.reload(); await p.waitForSelector('#draft'); await W(500); };
const nick = async (name) => { await p.goto(base + '#account'); await W(300); await p.click('[data-nick]'); await p.fill('#nk', name); await p.click('.modal [data-s]'); await W(300); };
const send = async (t) => { await p.goto(base + '#inbox'); await p.waitForSelector('#draft'); await p.fill('#draft', t); await p.click('#sendBtn'); await W(500); };

await as('A'); await nick('Anya');
await send('Good morning ☀️ I saved the photos from Sunday in the gallery.');
await send('Also — the passport renewal letter is in the Locker under Identity.');
await as('B'); await nick('Rohan');
await send('Saw them, they’re lovely. The one by the lake is my favourite 💗');
await send('Dinner at 8 tonight? I’ll book the place near the river.');
await as('A');
await send('Yes! See you at 8.');
// dates
await p.goto(base + '#dates'); await W(200);
const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(5, 10);
for (const [t, ty, d] of [['Rohan’s birthday', 'Birthday', `1994-${soon}`], ['Our anniversary', 'Anniversary', '2019-02-14'], ['Mum’s birthday', 'Birthday', '1968-01-09']]) {
  await p.click('#addDate'); await p.fill('input[name=title]', t); await p.selectOption('select[name=type]', ty); await p.fill('input[name=date]', d); await p.click('[data-save]'); await W(350);
}
// note
await p.goto(base + '#notepad'); await W(200); await p.click('#newNote');
await p.fill('#nt', 'Goa trip — packing'); await p.fill('#nb', 'Flights on Friday 9:40.\n- sunscreen\n- **passports**\n- chargers');
for (const i of ['Book hotel', 'Buy travel insurance', 'Pack the camera']) { await p.fill('#nai', i); await p.press('#nai', 'Enter'); }
await p.click('.ck[data-i] input[type=checkbox]'); await p.click('#nsave'); await W(500);
// contacts
await p.goto(base + '#contacts');
for (const [n, r, c, ph] of [['Dr. Mehta', 'Family doctor', 'Services', '+91 98200 12345'], ['Asha Sharma', 'Anya’s mum', 'Family', '+91 98765 43210'], ['City Hospital', '24-hour emergency', 'Emergency', '112']]) {
  await p.click('#addC'); await p.fill('input[name=name]', n); await p.fill('input[name=relation]', r); await p.selectOption('select[name=category]', c); await p.fill('input[name=phone]', ph); await p.click('[data-s]'); await W(300);
}
// gallery: soft generated photos
await p.goto(base + '#gallery'); await W(200);
const pics = await p.evaluate(async () => {
  const sets = [['#F7B6CE', '#FFE3D3', '#8CCBD1'], ['#FFD3E4', '#E95891', '#FFF0F5'], ['#B3DEE2', '#FFF9FB', '#F7B6CE'], ['#FFE1D0', '#F5C9DB', '#B83D72'], ['#ECF2D8', '#B3DEE2', '#E27396'], ['#FBD3E1', '#FFC9A8', '#6E5060']];
  return sets.map((c, i) => { const cv = document.createElement('canvas'); cv.width = 900; cv.height = 900; const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 900); gr.addColorStop(0, c[0]); gr.addColorStop(.65, c[1]); gr.addColorStop(1, c[2]); g.fillStyle = gr; g.fillRect(0, 0, 900, 900);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(250 + i * 70, 330, 110, 0, 7); g.fill();
    g.fillStyle = c[2]; g.beginPath(); g.moveTo(0, 900); for (let x = 0; x <= 900; x += 60) g.lineTo(x, 620 + Math.sin(x / 90 + i) * 60); g.lineTo(900, 900); g.fill();
    return cv.toDataURL('image/png').split(',')[1]; });
});
await p.setInputFiles('#pf', pics.map((b, i) => ({ name: `photo${i + 1}.png`, mimeType: 'image/png', buffer: Buffer.from(b, 'base64') })));
await W(300); await p.fill('#puf input[name=album]', 'Goa 2026'); await p.fill('#puf input[name=caption]', 'Sunset walk'); await p.click('[data-go]'); await W(2500);
// locker
await p.goto(base + '#locker');
for (const [t, c] of [['Anya — passport', 'Identity'], ['Home insurance 2026', 'Finance'], ['Vaccination record', 'Medical']]) {
  await p.click('#addDoc'); await p.setInputFiles('#duf input[name=file]', { name: 'doc.txt', mimeType: 'text/plain', buffer: Buffer.from('Reference copy') }); await p.fill('#duf input[name=title]', t); await p.selectOption('#duf select[name=category]', c); await p.click('[data-go]'); await W(500);
}
// kundli
await p.goto(base + '#kundlis'); await W(300); await p.click('[data-create]');
await p.fill('#wn', 'Anya'); await p.fill('#wd', '1996-03-21'); await p.fill('#wt', '06:40'); await p.click('[data-next]');
await p.fill('#pq', 'Pune'); await W(300); await p.click('.pcard[data-i="0"]'); await W(200); await p.click('[data-next]'); await W(200);
await shotWizard();
await p.click('[data-next]'); await p.waitForSelector('.kgrid2.tight', { timeout: 15000 }); await p.click('[data-next]'); await p.waitForSelector('.kcard'); await W(400);
async function shotWizard() { await p.screenshot({ path: `${OUT}/07-kundli-review.png` }); }

// ---------- captures (as Anya) ----------
await W(3200); // let toasts clear
const cap = async (hash, name, fn) => { await p.goto(base + '#' + hash); await W(700); if (fn) await fn(); await W(300); await p.screenshot({ path: `${OUT}/${name}.png` }); };
await cap('inbox', '01-inbox');
await cap('gallery', '02-gallery');
await cap('locker', '03-locker');
await cap('dates', '04-dates');
await cap('notepad', '05-notepad', async () => { const c = await p.$('.note-card'); if (c && await c.isVisible()) { await c.click(); await W(300); } });
await cap('kundlis', '06-kundli', async () => { await p.$eval('.kids', (e) => e.scrollIntoView({ block: 'start' })); await p.evaluate(() => { const v = document.querySelector('#view'); v.scrollTop -= 230; }); });
await cap('kundlis', '08-kundli-chart', async () => { await p.$eval('.chartp', (e) => e.scrollIntoView({ block: 'start' })); });
await cap('kundlis', '09-kundli-dasha', async () => { await p.$eval('.dashas', (e) => e.scrollIntoView({ block: 'center' })); });
await cap('contacts', '10-contacts');
await cap('inbox', '11-more', async () => { await p.click('#moreBtn'); });
console.log('errors:', errs.length ? errs : 'none');
await browser.close(); srv.close();
