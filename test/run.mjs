// Headless Chrome walkthrough in demo (local) mode
import { createRequire } from 'node:module';
import { asPerson } from './pin-helper.mjs';
import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');

const html = readFileSync(new URL('../dist/index.html', import.meta.url));
const srv = http.createServer((req, res) => {
  if (req.url.startsWith('/fonts')) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': 'text/html' }); res.end(html);
}).listen(5177);
mkdirSync('/home/claude/app/shots', { recursive: true });
const shot = (p, n) => p.screenshot({ path: `/home/claude/app/shots/${n}.png` });

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const errors = [];
const mk = async (opts) => {
  const ctx = await browser.newContext(opts);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts|ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
  return { ctx, p };
};
const base = 'http://localhost:5177/';

// ---------- phone: Person A ----------
const { ctx: phoneCtx, p } = await mk({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto(base + '#inbox');
await p.waitForSelector('#draft', { timeout: 8000 });
await p.waitForTimeout(400);
await shot(p, '01-phone-inbox-empty');
await p.fill('#draft', 'Hi love — saving this so we never lose it.\nDinner at 8?');
await p.click('#sendBtn');
await p.waitForTimeout(150);
await shot(p, '02-phone-saving');
await p.waitForTimeout(800);
await p.fill('#draft', 'Also: passport renewal is due in March.');
await p.click('#sendBtn');
await p.waitForTimeout(900);
await shot(p, '03-phone-saved');
console.log('A messages:', await p.$$eval('.msg', (e) => e.length), 'state:', await p.$eval('.msg.mine:last-child .state', (e) => e.textContent).catch(() => '-'));

// switch to B (same browser storage)
await asPerson(p, 'B');
await p.waitForSelector('#draft');
await p.waitForTimeout(700);
await p.fill('#draft', 'Yes! 8 works. ✨');
await p.click('#sendBtn');
await p.waitForTimeout(900);
await shot(p, '04-phone-B-view');
console.log('B sees:', await p.$$eval('.msg', (e) => e.map((x) => (x.classList.contains('mine') ? 'mine:' : 'theirs:') + x.querySelector('.bubble').textContent.slice(0, 20))));

// back to A: unread divider
await asPerson(p, 'A');
await p.waitForSelector('#draft');
await p.waitForTimeout(800);
console.log('A new-sep:', !!(await p.$('#newSep')));

// dates
await p.goto(base + '#dates');
await p.waitForTimeout(300);
await p.click('#addDate');
await p.fill('input[name=title]', 'Sam’s birthday');
const soon = new Date(Date.now() + 3 * 86400000);
const iso = (d) => d.toISOString().slice(0, 10);
await p.fill('input[name=date]', `1994-${iso(soon).slice(5)}`);
await p.click('[data-save]');
await p.waitForTimeout(500);
await p.click('#addDate');
await p.fill('input[name=title]', 'Our anniversary');
await p.selectOption('select[name=type]', 'Anniversary');
await p.fill('input[name=date]', '2019-02-14');
await p.click('[data-save]');
await p.waitForTimeout(500);
await shot(p, '05-phone-dates');
await p.click('[data-m="cal"]');
await p.waitForTimeout(200);
await shot(p, '06-phone-calendar');

// inbox reminder
await p.goto(base + '#inbox');
await p.waitForTimeout(600);
await shot(p, '07-phone-inbox-reminder');

// notes
await p.goto(base + '#notepad');
await p.waitForTimeout(300);
await p.click('#newNote');
await p.fill('#nt', 'Goa trip');
await p.fill('#nb', '# Packing\n- sunscreen\n- **passports**');
await p.fill('#nai', 'Book hotel'); await p.press('#nai', 'Enter');
await p.fill('#nai', 'Buy tickets'); await p.press('#nai', 'Enter');
await p.click('#nsave');
await p.waitForTimeout(600);
await shot(p, '08-phone-note');
console.log('note status:', await p.$eval('#nst', (e) => e.textContent));

// contacts
await p.goto(base + '#contacts');
await p.click('#addC');
await p.fill('input[name=name]', 'Dr. Mehta');
await p.fill('input[name=relation]', 'Family doctor');
await p.selectOption('select[name=category]', 'Services');
await p.fill('input[name=phone]', '+91 98200 12345');
await p.click('[data-s]');
await p.waitForTimeout(500);
await shot(p, '09-phone-contacts');

// gallery upload (generated png)
await p.goto(base + '#gallery');
await p.waitForTimeout(300);
const png = await p.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 600); gr.addColorStop(0, '#5b2bd8'); gr.addColorStop(.6, '#f0389a'); gr.addColorStop(1, '#ffc93c'); g.fillStyle = gr; g.fillRect(0, 0, 800, 600);
  return c.toDataURL('image/png').split(',')[1];
});
await p.setInputFiles('#pf', [{ name: 'sunset.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }, { name: 'beach.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }]);
await p.waitForTimeout(300);
await p.fill('#puf input[name=album]', 'Goa 2026');
await p.fill('#puf input[name=caption]', 'Sunset at Anjuna');
await p.click('[data-go]');
await p.waitForTimeout(1500);
await shot(p, '11-phone-gallery');
await p.click('.tile');
await p.waitForTimeout(400);
await shot(p, '12-phone-viewer');
await p.keyboard.press('Escape');

// locker
await p.goto(base + '#locker');
await p.click('#addDoc');
await p.setInputFiles('#duf input[name=file]', { name: 'insurance.txt', mimeType: 'text/plain', buffer: Buffer.from('Policy 123-456\nRenews 1 March') });
await p.selectOption('#duf select[name=category]', 'Finance');
await p.click('[data-go]');
await p.waitForTimeout(700);
await shot(p, '13-phone-locker');
await p.click('.rowi');
await p.waitForTimeout(500);
await shot(p, '14-phone-locker-open');
await p.keyboard.press('Escape');

// more + settings
await p.goto(base + '#inbox');
await p.click('#moreBtn');
await p.waitForTimeout(200);
await shot(p, '15-phone-more');
await p.goto(base + '#account');
await p.waitForTimeout(400);
await shot(p, '16-phone-settings');

// ---------- desktop ----------
const { p: d } = await mk({ viewport: { width: 1440, height: 900 } });
// share storage: desktop has its own origin storage per context, so replay by copying localStorage
const ls = await p.evaluate(() => localStorage.getItem('oss.db.v1'));
await d.goto(base);
await d.evaluate((v) => { localStorage.setItem('oss.db.v1', v); localStorage.setItem('oss.demoPerson', 'B'); }, ls);
await d.goto(base + '#inbox'); await d.reload();
await d.waitForSelector('#draft');
await d.waitForTimeout(700);
await shot(d, '20-desk-inbox');
for (const v of ['gallery', 'locker', 'notepad', 'contacts', 'dates', 'account']) {
  await d.goto(base + '#' + v); await d.waitForTimeout(500); await shot(d, '21-desk-' + v);
}
// search
await d.goto(base + '#inbox'); await d.waitForTimeout(400);
await d.click('#searchBtn'); await d.fill('#sq', 'passport'); await d.waitForTimeout(500);
await shot(d, '22-desk-search');

// ---------- note conflict (two contexts sharing storage via storage events isn't possible across contexts; simulate) ----------
await d.goto(base + '#notepad'); await d.waitForTimeout(400);
await d.click('.note-card');
await d.waitForTimeout(200);
// ---------- ownership: B opens A's note — read-only, can only save a copy ----------
const roTxt = await d.$eval('#nbanner', (e) => e.innerText);
const editable = await d.$eval('#nb', (e) => e.isContentEditable);
const saveLbl = await d.$eval('#nsave', (e) => e.textContent.trim());
console.log('partner note read-only:', /Written by/.test(roTxt) && !editable && /copy as mine/.test(saveLbl) ? 'yes' : 'NO', '|', saveLbl);
if (editable || !/copy as mine/.test(saveLbl)) errors.push('partner note is editable');
const nBefore = await d.$$eval('.note-card', (a) => a.length);
await d.click('#nsave'); await d.waitForTimeout(600);
await d.goto(base + '#notepad'); await d.waitForTimeout(400);
const nAfter = await d.$$eval('.note-card', (a) => a.length);
console.log('copy saved as mine:', nAfter === nBefore + 1 ? 'yes' : 'NO', nBefore, '→', nAfter);
if (nAfter !== nBefore + 1) errors.push('copy not saved');
await shot(d, '23-desk-readonly');

console.log('ERRORS:', errors.length ? errors : 'none');
await browser.close(); srv.close();
