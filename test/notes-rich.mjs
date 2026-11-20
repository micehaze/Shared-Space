// Phone-only first run (Android build) + rich notes: colour and photo
import { createRequire } from 'node:module';
import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const html = readFileSync(new URL('../android/app/src/main/assets/www/index.html', import.meta.url));
const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(5185);
mkdirSync('/home/claude/app/shots4', { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.stack));
const W = (ms) => p.waitForTimeout(ms);
const shot = (n) => p.screenshot({ path: `/home/claude/app/shots4/${n}.png` });
await p.goto('http://localhost:5185/');
await p.waitForSelector('#setupForm'); await shot('01-setup');
await p.fill('#setupForm [name=a]', 'Anya'); await p.fill('#setupForm [name=b]', 'Rohan'); await p.click('#setupForm button');
await p.waitForSelector('#draft'); await W(400);
console.log('who bar:', await p.$eval('.demo-bar', (e) => e.innerText.replace(/\s+/g, ' ')));
await p.fill('#draft', 'Hi from the phone-only app'); await p.click('#sendBtn'); await W(400);
await shot('02-inbox');
// switch writer
await p.click('.demo-bar [data-p="B"]'); await p.waitForSelector('#draft'); await W(500);
console.log('after switch:', await p.$eval('.demo-bar [aria-pressed="true"]', (e) => e.textContent), '|', await p.$$eval('.msg .meta b', (b) => b.map((x) => x.textContent)));
// rich note
await p.goto('http://localhost:5185/#notepad'); await W(300);
await p.click('#newNote');
await p.fill('#nt', 'Weekend plan');
await p.click('#nb'); await p.keyboard.type('Pack the pink jacket and the camera.');
// select the word "pink" and colour it
await p.evaluate(() => { const ed = document.querySelector('#nb'); const t = ed.firstChild; const i = t.textContent.indexOf('pink'); const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 4); const s = getSelection(); s.removeAllRanges(); s.addRange(r); ed.dispatchEvent(new Event('mouseup')); });
await p.click('.swatches [data-c="#D4136F"]'); await W(100);
// bold "camera"
await p.evaluate(() => { const ed = document.querySelector('#nb'); const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let n; while ((n = walker.nextNode())) { const i = n.textContent.indexOf('camera'); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 6); const s = getSelection(); s.removeAllRanges(); s.addRange(r); ed.dispatchEvent(new Event('mouseup')); break; } } });
await p.click('[data-f="bold"]'); await W(100);
// add a photo at the end
await p.evaluate(() => { const ed = document.querySelector('#nb'); const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); ed.dispatchEvent(new Event('mouseup')); });
const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 500; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 500); gr.addColorStop(0, '#3B1E86'); gr.addColorStop(.7, '#D1397F'); gr.addColorStop(1, '#FFB547'); g.fillStyle = gr; g.fillRect(0, 0, 800, 500); return c.toDataURL('image/png').split(',')[1]; });
await p.setInputFiles('#nimg', { name: 'sunset.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
await W(1200);
await p.click('#nsave'); await W(600);
const saved = await p.evaluate(() => { const db = JSON.parse(localStorage.getItem('oss.db.v1')); const k = Object.keys(db).find((x) => x.startsWith('notes/')); return db[k]; });
console.log('saved html:', saved.html);
console.log('images:', saved.images, '| body:', JSON.stringify(saved.body));
await shot('03-note-rich');
// reopen from the list and check the photo shows
await p.click('#nback'); await W(300); await shot('04-note-list');
await p.click('.note-card'); await W(600);
console.log('reopened img src set:', await p.$eval('#nb img.nimg', (i) => !!i.src && i.naturalWidth > 0));
console.log('colour kept:', await p.$eval('#nb .c-pink', (s) => getComputedStyle(s).color));
// sanitizer: scripts and event handlers are stripped
console.log('sanitize:', await p.evaluate(() => sanitizeNote('<p onclick="x()">Hi <script>alert(1)</script><img src=x onerror=alert(1)><font color="#6A2BD6">purple</font><span style="color: rgb(212, 19, 111)">pink</span><a href="javascript:alert(1)">bad</a></p>')));
await shot('05-note-reopen');
console.log('ERRORS:', errs.length ? errs : 'none');
await browser.close(); srv.close();
