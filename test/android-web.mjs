// Runs the Android build's web layer in Chrome with a stand-in Firebase:
// two accounts sign up, claim the two seats, sync messages; a third is locked out.
import { createRequire } from 'node:module';
import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const html = readFileSync(new URL('../android/app/src/main/assets/www/index.html', import.meta.url));
const fake = readFileSync(new URL('./fake-firebase.js', import.meta.url));
const srv = http.createServer((q, r) => {
  if (q.url.startsWith('/enko-config.js')) { r.writeHead(200, { 'content-type': 'text/javascript' }); return r.end('window.ENKO_FIREBASE = { apiKey: "test", projectId: "enko-test" };'); }
  if (q.url.startsWith('/vendor/firebase-app-compat.js')) { r.writeHead(200, { 'content-type': 'text/javascript' }); return r.end(fake); }
  if (q.url.startsWith('/vendor/')) { r.writeHead(200, { 'content-type': 'text/javascript' }); return r.end('/* stub */'); }
  r.writeHead(200, { 'content-type': 'text/html' }); r.end(html);
}).listen(5183);
mkdirSync('/home/claude/app/shots3', { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.stack));
const base = 'http://localhost:5183/';
const W = (ms) => p.waitForTimeout(ms);
const shot = (n) => p.screenshot({ path: `/home/claude/app/shots3/${n}.png` });
const signUp = async (email, nick) => {
  await p.goto(base); await p.waitForSelector('#af');
  await p.click('[data-m="up"]'); await p.fill('#af [name=email]', email); await p.fill('#af [name=pw]', 'correct-horse-1');
  await p.click('#af button[type=submit]');
  if (nick) { await p.waitForSelector('#joinForm'); await p.fill('#joinForm [name=nick]', nick); await p.click('#joinForm button'); await p.waitForSelector('#draft'); await W(400); }
};
const signOut = async () => { await p.goto(base + '#account'); await W(300); await p.click('#signOut'); await p.click('.modal [data-ok]'); await p.waitForSelector('#af'); };
await p.goto(base); await p.waitForSelector('#af'); await shot('01-signin');
await signUp('anya@example.com', 'Anya'); await shot('02-joined-A');
await p.fill('#draft', 'Hello from the Android build 💗'); await p.click('#sendBtn'); await W(600);
console.log('A state:', await p.$eval('.msg.mine:last-of-type .state', (e) => e.textContent).catch(() => '-'));
await signOut();
await signUp('rohan@example.com', 'Rohan'); await W(500);
console.log('B sees:', await p.$$eval('.bubble', (b) => b.map((x) => x.textContent)));
await p.fill('#draft', 'Got it on my phone!'); await p.click('#sendBtn'); await W(600);
await shot('03-B-inbox');
// delete flow uses update() with field paths
await p.click('.msg.mine [data-del]'); await p.click('.modal [data-ok]'); await W(500);
console.log('after delete:', await p.$$eval('.bubble', (b) => b.map((x) => x.textContent)));
// note + date + kundli quick checks
await p.goto(base + '#dates'); await p.click('#addDate'); await p.fill('input[name=title]', 'Anniversary'); await p.fill('input[name=date]', '2019-02-14'); await p.click('[data-save]'); await W(400);
await p.goto(base + '#notepad'); await p.click('#newNote'); await p.fill('#nt', 'Shopping'); await p.fill('#nai', 'Milk'); await p.press('#nai', 'Enter'); await p.click('#nsave'); await W(500);
console.log('note:', await p.$eval('#nst', (e) => e.textContent));
await p.goto(base + '#kundlis'); await p.click('[data-create]'); await p.fill('#wd', '1994-07-11'); await p.fill('#wt', '21:15'); await p.click('[data-next]');
await p.fill('#pq', 'Mumbai'); await W(300); await p.click('.pcard[data-i="0"]'); await p.click('[data-next]'); await W(200); await p.click('[data-next]');
await p.waitForSelector('.kgrid2.tight', { timeout: 15000 }); await p.click('[data-next]'); await p.waitForSelector('.kcard'); await W(300);
console.log('kundli:', await p.$eval('.kids', (e) => e.innerText.split('\n').filter(Boolean).slice(0, 8).join(' | ')));
await shot('04-B-kundli');
// photo upload via storage
await p.goto(base + '#gallery');
const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 400; const g = c.getContext('2d'); g.fillStyle = '#F7B6CE'; g.fillRect(0, 0, 400, 400); return c.toDataURL('image/png').split(',')[1]; });
await p.setInputFiles('#pf', { name: 'p.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }); await W(200); await p.click('[data-go]'); await W(1200);
console.log('photos:', await p.$$eval('.tile img', (i) => i.map((x) => !!x.src).length));
await signOut();
// third person
await signUp('stranger@example.com'); await W(800);
console.log('third person sees:', await p.$eval('.gate .card', (e) => e.innerText.replace(/\s+/g, ' ').slice(0, 120)));
await shot('05-locked');
// stored member doc
console.log('members ids:', await p.evaluate(() => __fakeData()['space/members'].ids.length));
console.log('ERRORS:', errs.length ? errs : 'none');
await browser.close(); srv.close();
