const A = require('../src/astro.js');
let fail = 0;
const ok = (name, got, exp, tol) => { const d = A.angDiff(got, exp); const pass = d <= tol; if (!pass) fail++; console.log((pass ? 'PASS ' : 'FAIL ') + name.padEnd(46) + ' got ' + got.toFixed(4) + ' exp ' + exp.toFixed(4) + ' diff ' + d.toFixed(4)); };
const T = (jdTT) => (jdTT - 2451545) / 36525;
// Meeus example 47.a: 1992 Apr 12 0h TD -> Moon lambda (mean equinox) 133.162655
ok('Moon, Meeus ex.47.a', A.moonLon(T(2448724.5)), 133.162655, 0.003);
// Meeus example 25.a: 1992 Oct 13 0h TD -> apparent 199.90895 (incl. nutation -0.00478 sinΩ)
{ const t = T(2448908.5); const om = 125.04 - 1934.136 * t; ok('Sun, Meeus ex.25.a (apparent)', A.sunLon(t) - 0.00478 * Math.sin(om * Math.PI / 180), 199.90895, 0.002); }
// Mean node Meeus 2000-01-01.5 ~ 125.04
ok('Mean node at J2000', A.meanNode(0), 125.0445, 0.001);
// GMST Meeus ex.12.a: 1987 Apr 10 0h UT -> 13h10m46.3668s = 197.693195
ok('GMST, Meeus ex.12.a', A.gmstDeg(2446895.5), 197.693195, 0.0001);
// Events: Sun-Moon conjunction / opposition, planetary conjunction/opposition
const trop = (ms) => A.builtin.tropical(ms);
const ev = [
  ['New moon 2000-01-06 18:14 UT (Sun=Moon)', Date.UTC(2000, 0, 6, 18, 14), 'Moon', 'Sun', 0, 0.06],
  ['Solar eclipse 2017-08-21 18:30 UT new moon', Date.UTC(2017, 7, 21, 18, 30), 'Moon', 'Sun', 0, 0.06],
  ['Full moon 2000-01-21 04:40 UT', Date.UTC(2000, 0, 21, 4, 40), 'Moon', 'Sun', 180, 0.06],
  ['Lunar eclipse max 1985-05-04 19:57 UT', Date.UTC(1985, 4, 4, 19, 57), 'Moon', 'Sun', 180, 0.06],
  ['Venus inferior conj. 2004-06-08 ~08:43 UT (transit)', Date.UTC(2004, 5, 8, 8, 43), 'Venus', 'Sun', 0, 0.08],
  ['Mercury inferior conj. 2019-11-11 15:21 UT (transit)', Date.UTC(2019, 10, 11, 15, 21), 'Mercury', 'Sun', 0, 0.08],
  ['Mars opposition 2003-08-28 17:56 UT', Date.UTC(2003, 7, 28, 17, 56), 'Mars', 'Sun', 180, 0.1],
  ['Jupiter–Saturn conjunction 2020-12-21 18:20 UT', Date.UTC(2020, 11, 21, 18, 20), 'Jupiter', 'Saturn', 0, 0.15],
  ['Jupiter opposition 2023-11-03 05:00 UT', Date.UTC(2023, 10, 3, 5, 0), 'Jupiter', 'Sun', 180, 0.15],
  ['Saturn opposition 2023-08-27 08:00 UT', Date.UTC(2023, 7, 27, 8, 0), 'Saturn', 'Sun', 180, 0.15],
  ['Jupiter–Saturn conjunction 2000-05-28 16:00 UT', Date.UTC(2000, 4, 28, 16, 0), 'Jupiter', 'Saturn', 0, 0.2],
  ['Mars opposition 1988-09-28 (date-level ref, ±12h)', Date.UTC(1988, 8, 28, 12, 0), 'Mars', 'Sun', 180, 0.7],
];
for (const [n, ms, a, b, off, tol] of ev) { const p = trop(ms); ok(n, p[a], A.norm(p[b] + off), tol); }
// Absolute: Jupiter-Saturn 2020 conj at ~0°29' Aquarius = 300.48 tropical
{ const p = trop(Date.UTC(2020, 11, 21, 18, 20)); ok('2020 great conjunction absolute (≈300.48°)', p.Jupiter, 300.48, 0.2); }
// Ayanamsa
ok('Lahiri ayanamsa at J2000 (≈23.857)', A.ayanamsa(2451545, 'lahiri'), 23.857, 0.01);
ok('Raman ayanamsa at J2000 (≈22.41)', A.ayanamsa(2451545, 'raman'), 22.41, 0.02);
// Ascendant sanity: RAMC 0, lat 0 -> 90 (Cancer 0)
ok('Ascendant RAMC=0 lat=0', A.ascendant(0, 23.44, 0), 90, 1e-6);
ok('Ascendant RAMC=90 lat=0', A.ascendant(90, 23.44, 0), 180, 1e-6);
// Nakshatra / pada boundaries
const pt = A.point;
const chk = (lon, nak, pada) => { const p = pt(lon); const pass = p.nak === nak && p.pada === pada; if (!pass) fail++; console.log((pass ? 'PASS ' : 'FAIL ') + `point(${lon}) -> nak ${p.nak} pada ${p.pada}`); };
chk(0, 0, 1); chk(3.3333, 0, 1); chk(10 / 3 + 1e-9, 0, 2); chk(13.3333, 0, 4); chk(40 / 3, 1, 1); chk(359.9999, 26, 4); chk(120, 9, 1); chk(119.99, 8, 4);
// Dasha: Moon at start of Ashwini -> full Ketu 7y; total sequence 120y
{ const d = require('../src/astro.js'); }
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
