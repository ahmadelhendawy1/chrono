'use strict';
const assert = require('assert');
const W = require('../lib/weather');
const P = require('../lib/prayer');
let pass = 0;
const ok = (name, fn) => { try { fn(); pass++; console.log('ok  -', name); } catch (e) { console.error('FAIL -', name, '\n   ', e.message); process.exitCode = 1; } };

// ---- weather mapping
ok('clear day/night', () => { assert.equal(W.iconFor(0, 1), 'clear_day'); assert.equal(W.iconFor(0, 0), 'clear_night'); });
ok('thunder / snow / fog', () => { assert.equal(W.iconFor(95, 1), 'thunderstorm'); assert.equal(W.iconFor(73, 1), 'snow'); assert.equal(W.iconFor(45, 1), 'fog'); });
ok('showers use day/night', () => { assert.equal(W.iconFor(81, 1), 'showers_day'); assert.equal(W.iconFor(81, 0), 'showers_night'); });
ok('wind only when clear-ish', () => { assert.equal(W.iconFor(1, 1, 50), 'wind'); assert.equal(W.iconFor(3, 1, 50), 'cloudy'); });
ok('every icon name has a file', () => {
  const fs = require('fs');
  W.ICONS.forEach((n) => assert.ok(fs.existsSync(__dirname + '/../src/assets/weather/' + n + '.png'), n));
});
ok('one misty hour does not make the day foggy', () => {
  const codes = [45, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0];
  assert.ok(['clear_day', 'mostly_clear_day'].includes(W.dailyIcon(codes, 45, 10)));
});
ok('2+ rain hours show rain', () => {
  assert.equal(W.dailyIcon([3, 3, 61, 61, 61, 3, 3, 3, 3, 3, 3, 3, 3], 61, 10), 'rain');
});
ok('mostly foggy day is fog', () => {
  assert.equal(W.dailyIcon([45, 45, 45, 45, 45, 45, 45, 3, 3, 3, 3, 3, 3], 45, 5), 'fog');
});
ok('normalise builds 8 days from API-shaped data', () => {
  const time = []; const wc = [];
  for (let d = 0; d < 8; d++) for (let h = 0; h < 24; h++) { time.push(`2026-11-${String(2 + d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`); wc.push(0); }
  const json = {
    current: { temperature_2m: 26.4, apparent_temperature: 27, relative_humidity_2m: 40, weather_code: 2, is_day: 1, wind_speed_10m: 12 },
    daily: { time: Array.from({ length: 8 }, (_, d) => `2026-11-${String(2 + d).padStart(2, '0')}`), weather_code: Array(8).fill(3), temperature_2m_max: Array(8).fill(29.4), temperature_2m_min: Array(8).fill(19.6), precipitation_probability_max: Array(8).fill(10), wind_speed_10m_max: Array(8).fill(15), sunrise: Array(8).fill('x'), sunset: Array(8).fill('y') },
    hourly: { time, weather_code: wc }
  };
  const n = W.normalise(json, { name: 'Cairo' });
  assert.equal(n.days.length, 8); assert.equal(n.days[0].max, 29); assert.equal(n.days[0].min, 20);
  assert.equal(n.days[0].icon, 'clear_day'); assert.equal(n.current.icon, 'partly_cloudy_day'); assert.equal(n.current.temp, 26);
});

// ---- prayer
const cairo = { lat: 30.0444, lon: 31.2357 };
const cfg = { method: 'Egyptian', asr: 'standard', adjust: {} };
const hm = (iso) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' });
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
ok('Cairo 2 Nov 2026 times fall in plausible windows (NOT checked against an official timetable)', () => {
  const r = P.compute(cairo, cfg, new Date('2026-11-02T10:00:00Z'));
  const win = { fajr: ['04:30', '05:00'], sunrise: ['06:00', '06:25'], dhuhr: ['11:30', '11:55'], asr: ['14:30', '15:00'], maghrib: ['16:55', '17:30'], isha: ['18:10', '18:55'] };
  Object.keys(win).forEach((k) => {
    const got = hm(r.times[k]);
    console.log('      ', k.padEnd(8), got, '(window ' + win[k].join('-') + ')');
    assert.ok(toMin(got) >= toMin(win[k][0]) && toMin(got) <= toMin(win[k][1]), k + ' ' + got);
  });
});
ok('times are in chronological order', () => {
  const r = P.compute(cairo, cfg, new Date('2026-11-02T10:00:00Z'));
  const v = P.ORDER.map((k) => new Date(r.times[k]).getTime());
  for (let i = 1; i < v.length; i++) assert.ok(v[i] > v[i - 1]);
});
ok('qibla from Cairo is ~136 degrees', () => {
  const r = P.compute(cairo, cfg, new Date('2026-11-02T10:00:00Z'));
  assert.ok(Math.abs(r.qibla - 136) < 2, String(r.qibla));
});
ok('next prayer after Isha is tomorrow\'s Fajr', () => {
  const n = P.nextPrayer(cairo, cfg, new Date('2026-11-02T20:30:00Z')); // 22:30 Cairo
  assert.equal(n.name, 'fajr'); assert.ok(new Date(n.time) > new Date('2026-11-02T20:30:00Z'));
});
ok('Hanafi Asr is later than Standard', () => {
  const a = P.compute(cairo, cfg, new Date('2026-11-02T10:00:00Z')).times.asr;
  const b = P.compute(cairo, { ...cfg, asr: 'hanafi' }, new Date('2026-11-02T10:00:00Z')).times.asr;
  assert.ok(new Date(b) > new Date(a));
});
ok('per-prayer adjustment moves the time', () => {
  const a = P.compute(cairo, cfg, new Date('2026-11-02T10:00:00Z')).times.fajr;
  const b = P.compute(cairo, { ...cfg, adjust: { fajr: 5 } }, new Date('2026-11-02T10:00:00Z')).times.fajr;
  assert.equal((new Date(b) - new Date(a)) / 60000, 5);
});
ok('every listed method computes', () => {
  Object.keys(P.METHODS).forEach((m) => P.compute(cairo, { method: m, asr: 'standard' }, new Date('2026-11-02T10:00:00Z')));
});

// ---- calculator (loads the real widgets.js with a stub window)
global.window = {}; require('../src/widgets.js');
const C = global.window.Widgets._calc;
const calc = (e, deg = true) => C.fmtNum(C.calculate(e, deg));
ok('calc: precedence and parentheses', () => { assert.equal(calc('2+3×4'), '14'); assert.equal(calc('(2+3)×4'), '20'); assert.equal(calc('10−4÷2'), '8'); });
ok('calc: floating point noise is cleaned', () => { assert.equal(calc('0.1+0.2'), '0.3'); assert.equal(calc('1÷3'), '0.333333333333'); });
ok('calc: percent, power, factorial, unary minus', () => { assert.equal(calc('50%'), '0.5'); assert.equal(calc('2^10'), '1024'); assert.equal(calc('5!'), '120'); assert.equal(calc('−3+5'), '2'); assert.equal(calc('5−−3'), '8'); assert.equal(calc('2^3^2'), '512'); });
ok('calc: scientific (degrees / radians)', () => { assert.equal(calc('sin(30)'), '0.5'); assert.equal(calc('cos(90)'), '0'); assert.equal(calc('sin(π÷2)', false), '1'); assert.equal(calc('√(16)'), '4'); assert.equal(calc('log(1000)'), '3'); assert.equal(calc('ln(e)'), '1'); });
ok('calc: unclosed parentheses auto-close, implicit multiply', () => { assert.equal(calc('2×(3+4'), '14'); assert.equal(calc('2(3)'), '6'); assert.equal(calc('2π', false), String(Number((2 * Math.PI).toPrecision(12)))); });
ok('calc: division by zero and bad input throw', () => { assert.throws(() => calc('1÷0')); assert.throws(() => calc('2++')); assert.throws(() => calc('foo(2)')); });
ok('calc: code injection attempt is rejected, not executed', () => { assert.throws(() => calc('process.exit()')); assert.throws(() => calc('constructor')); });
// ---- screen-edge reveal
const E = require('../lib/edge');
const disp = { bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } };
ok('edge: right edge pixel triggers, 3px in does not', () => { assert.ok(E.atScreenEdge({ x: 1919, y: 500 }, disp, 'right')); assert.ok(E.atScreenEdge({ x: 1918, y: 500 }, disp, 'right')); assert.ok(!E.atScreenEdge({ x: 1916, y: 500 }, disp, 'right')); });
ok('edge: left side only reacts to the left edge', () => { assert.ok(E.atScreenEdge({ x: 0, y: 10 }, disp, 'left')); assert.ok(!E.atScreenEdge({ x: 1919, y: 10 }, disp, 'left')); assert.ok(!E.atScreenEdge({ x: 0, y: 10 }, disp, 'right')); });
ok('edge: taskbar corner (Show desktop) does not trigger', () => { assert.ok(!E.atScreenEdge({ x: 1919, y: 1060 }, disp, 'right')); });
ok('edge: second monitor offset is respected', () => { const d2 = { bounds: { x: -1280, y: 0, width: 1280, height: 1024 }, workArea: { x: -1280, y: 0, width: 1280, height: 984 } }; assert.ok(E.atScreenEdge({ x: -1280, y: 100 }, d2, 'left')); assert.ok(E.atScreenEdge({ x: -1, y: 100 }, d2, 'right')); });
ok('edge: insideRect with margin', () => { const r = { x: 1560, y: 0, width: 360, height: 1040 }; assert.ok(E.insideRect({ x: 1560, y: 5 }, r, 0)); assert.ok(E.insideRect({ x: 1552, y: 5 }, r, 10)); assert.ok(!E.insideRect({ x: 1540, y: 5 }, r, 10)); });
// ---- alarms
const A = require('../lib/alarm');
const at = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
ok('alarm: one-time later today', () => { assert.strictEqual(A.nextFire(A.normalize({ time: '07:30' }), at(2026, 11, 18, 6, 0)), at(2026, 11, 18, 7, 30)); });
ok('alarm: one-time already passed -> tomorrow', () => { assert.strictEqual(A.nextFire(A.normalize({ time: '07:30' }), at(2026, 11, 18, 8, 0)), at(2026, 11, 19, 7, 30)); });
ok('alarm: exact minute counts (>=)', () => { assert.strictEqual(A.nextFire(A.normalize({ time: '07:30' }), at(2026, 11, 18, 7, 30)), at(2026, 11, 18, 7, 30)); });
ok('alarm: weekdays only (Sun-Thu) skips Fri/Sat', () => { const a = A.normalize({ time: '06:00', days: [0, 1, 2, 3, 4] }); assert.strictEqual(new Date(A.nextFire(a, at(2026, 11, 20, 7, 0))).getDay(), 0); });   // Fri 20 Nov -> Sun 22
ok('alarm: disabled never rings', () => { assert.strictEqual(A.nextFire(A.normalize({ time: '06:00', enabled: false }), Date.now()), null); });
ok('alarm: crosses month end', () => { assert.strictEqual(A.nextFire(A.normalize({ time: '00:05' }), at(2026, 11, 30, 23, 0)), at(2026, 12, 1, 0, 5)); });
ok('alarm: normalize cleans bad input', () => { const a = A.normalize({ time: '99:99', days: [9, 1, 1, '3'], volume: 7, snooze: 0, sound: 'file' }); assert.strictEqual(a.time, '07:00'); assert.deepStrictEqual(a.days, [1, 3]); assert.strictEqual(a.volume, 1); assert.strictEqual(a.snooze, 5); assert.strictEqual(a.sound, 'classic'); });
ok('alarm: soonest picks earliest incl. snooze', () => { const now = at(2026, 11, 18, 6, 0); const x = A.normalize({ id: 'x', time: '07:00' }); const y = A.normalize({ id: 'y', time: '06:30' }); const s1 = A.soonest([x, y], [{ at: now + 10 * 60000, alarm: x }], now); assert.ok(s1.snooze && s1.alarm.id === 'x'); assert.strictEqual(A.soonest([x, y], [], now).alarm.id, 'y'); });
console.log(pass + ' checks passed');
