// Build targets:
//   node build.mjs            → dist/index.html             (claude.ai artifact)
//   node build.mjs --pwa      → pwa/index.html              (self-hosted web app)
//   node build.mjs --android  → android/app/src/main/assets/www/index.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const src = (f) => readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const font = (f) => readFileSync(new URL('./src/fonts/' + f, import.meta.url)).toString('base64');
// DejaVu Sans (Bitstream Vera licence, redistributable): a Verdana-like 2000s UI face, embedded so the APK looks right offline
const FONTS = `@font-face{font-family:'Vice Sans';src:url(data:font/woff;base64,${font('dejavu.woff')}) format('woff');font-weight:400;font-display:swap}
@font-face{font-family:'Vice Sans';src:url(data:font/woff;base64,${font('dejavu-bold.woff')}) format('woff');font-weight:700;font-display:swap}
@font-face{font-family:'Vice Glyphs';src:url(data:font/woff;base64,${font('glyphs.woff')}) format('woff');unicode-range:U+2609,U+263D-263F,U+2640,U+2642-2647,U+260A-260D,U+26B8,U+2297,U+25B3,U+25A1,U+2220,U+211E,U+2648-2653;font-display:block}
@font-face{font-family:'Vice Glyphs';src:url(data:font/woff;base64,${font('glyphs2.woff')}) format('woff');unicode-range:U+26B9-26BC;font-display:block}`;
const order = ['store.js', 'firebase-store.js', 'core.js', 'scenes.js', 'pin.js', 'boot.js', 'dates.js', 'inbox.js', 'gallery.js', 'locker.js', 'notes.js', 'contacts.js', 'geodata.js', 'tz.js', 'astro.js', 'places.js', 'jyotish.js', 'jyotish-deep.js', 'western.js', 'wkb.js', 'wkb-deep.js', 'life.js', 'wheel.js', 'kundli.js', 'kundli-more.js', 'natal-view.js', 'account.js'];
const js = `window.VS_GLYPHS='${font('glyphs.woff')}';\n` + order.map(src).join('\n') + '\nboot();\n';
const target = process.argv.includes('--android') ? 'android' : process.argv.includes('--pwa') ? 'pwa' : 'dist';
let pre = '', head = '';
if (target === 'pwa') {
  pre = 'window.OSS_STANDALONE = true;\n';
  head = '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icon-180.png">\n<link rel="icon" href="icon-192.png">';
}
if (target === 'android') {
  pre = "window.OSS_STANDALONE = true; window.ENKO_VENDOR = 'vendor/';\n";
  // Phone-only: no backend. (firebase-store.js stays bundled but inactive until a config is added.)
  // The script logo font is bundled by the GitHub build (vendor/mr-dafoe.woff2) so it works offline.
  head = `<style>@font-face{font-family:'Mr Dafoe';src:url(vendor/mr-dafoe.woff2) format('woff2');font-display:swap}</style>`;
}
const sw = target === 'pwa' ? `\nif ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});\n` : '';
const html = src('index.html')
  .replace('/*CSS*/', () => src('styles.css').replace('/*FONTS*/', () => FONTS))
  .replace('/*JS*/', () => pre + js + sw)
  .replace('<!--PWA-->', head);
const dir = { dist: './dist/', pwa: './pwa/', android: './android/app/src/main/assets/www/' }[target];
mkdirSync(new URL(dir, import.meta.url), { recursive: true });
writeFileSync(new URL(dir + 'index.html', import.meta.url), html);
console.log(dir + 'index.html', (html.length / 1024).toFixed(1) + ' KB');
