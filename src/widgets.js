/* Chrono widgets. Each widget is a function (holder, ctx) that renders into `holder`.
   ctx: { s: settings, t: translate, api: window.chrono, lang, bar, mem, every(ms, fn), sub(kind, fn), raf(fn) }  */
(function () {
  'use strict';

  // ------------------------------------------------------------------ helpers
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const k of Object.keys(props || {})) {
      const v = props[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => { if (c !== undefined && c !== null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  }
  const P = {
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    pop: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>', pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    arrow: '<path d="M12 3l5 9h-3.5v9h-3v-9H7z"/>', back: '<path d="M4 7h16M4 12h16M4 17h10"/>', chevL: '<path d="M14 5l-7 7 7 7"/>', chevR: '<path d="M10 5l7 7-7 7"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>'
  };
  const ic = (n) => h('span', { html: `<svg class="ic" viewBox="0 0 24 24">${P[n]}</svg>`, style: { display: 'inline-grid', placeItems: 'center' } });
  const pad2 = (n) => String(n).padStart(2, '0');
  const loc = (ctx) => (ctx.lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB');

  const LANG_WIDGETS = ['weather', 'prayer', 'calendar', 'analog', 'digital', 'world'];
  function langButton(ctx, id) {
    if (!LANG_WIDGETS.includes(id) || !ctx.api.patch) return null;
    const next = ctx.lang === 'ar' ? 'en' : 'ar';
    return h('button', { class: 'langBtn', title: next === 'ar' ? 'العربية' : 'English', onclick: () => ctx.api.patch({ widgetLang: { [id]: next } }) }, next === 'ar' ? 'ع' : 'EN');
  }
  const placeName = (ctx, fallback) => (ctx.lang === 'ar' && ctx.s.location.ar) ? ctx.s.location.ar : (ctx.s.location.short || fallback || ctx.s.location.name);
  function tools(ctx, id, extra) {
    return h('div', { class: 'tools' },
      extra || null,
      langButton(ctx, id),
      h('button', { title: ctx.t('settings'), onclick: () => ctx.api.openSettings(id) }, ic('gear')),
      ctx.api.hideWidget ? h('button', { title: ctx.t('hide'), onclick: () => ctx.api.hideWidget(id) }, ic('close')) : null);
  }

  function tzParts(date, tz) {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    const o = {};
    f.formatToParts(date).forEach((p) => { if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10); });
    return o;
  }
  function offsetMin(tz, date) {
    const p = tzParts(date, tz);
    return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  }
  function hijriFmt(date, offset, lang, opts) {
    const d = new Date(date.getTime() + (offset || 0) * 86400000);
    const l = (lang === 'ar' ? 'ar-EG' : 'en-US') + '-u-ca-islamic-umalqura-nu-latn';
    return new Intl.DateTimeFormat(l, opts || { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }
  function hijriDay(date, offset) {
    const d = new Date(date.getTime() + (offset || 0) * 86400000);
    const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura-nu-latn', { day: 'numeric' }).formatToParts(d);
    return parts.find((p) => p.type === 'day').value;
  }
  const toUnit = (c, units) => (c === null || c === undefined ? '–' : (units === 'f' ? Math.round(c * 9 / 5 + 32) : c) + '°');

  const W = {};

  // ------------------------------------------------------------------ WEATHER
  const SKY = {
    clear_day: 'sky-day', mostly_clear_day: 'sky-day', partly_cloudy_day: 'sky-day2', showers_day: 'sky-rain', cloudy: 'sky-cloud', fog: 'sky-fog',
    drizzle: 'sky-rain', rain: 'sky-rain', heavy_rain: 'sky-rain', sleet: 'sky-rain', snow: 'sky-snow', thunderstorm: 'sky-storm', wind: 'sky-cloud',
    clear_night: 'sky-night', mostly_clear_night: 'sky-night', partly_cloudy_night: 'sky-night', showers_night: 'sky-night'
  };
  const wxImg = (name, cls) => h('img', { class: cls || '', src: `assets/weather/${name}.png`, alt: name, draggable: 'false' });

  W.weather = function (root, ctx) {
    const { t, s } = ctx;
    const days = s.weather.days === 8 ? 8 : 5;
    const strip = s.weather.layout === 'strip';
    const card = h('div', { class: `card weather w${days}` });
    root.append(card);

    let data = null; let offline = false;
    function render() {
      card.innerHTML = '';
      card.className = `card weather w${days}` + (strip ? ' strip' : '') + (data && !strip ? ' ' + (SKY[data.current.icon] || 'sky-day') : ' sky-day');
      card.append(tools(ctx, 'weather', h('button', { title: t('refresh'), onclick: () => ctx.api.refreshWeather() }, ic('refresh'))));
      if (!data) { card.append(h('div', { class: 'wEmpty' }, offline ? t('noData') : t('loading'))); return; }
      const c = data.current;
      if (!strip) {
        card.append(h('div', { class: 'wTop' },
          h('div', { class: 'wLeft' },
            h('div', { class: 'wCity' }, ic('pin'), h('span', {}, placeName(ctx, data.location.name))),
            h('div', { class: 'wTemp' }, toUnit(c.temp, s.units)),
            h('div', { class: 'wCond' }, t('cond.' + c.icon)),
            h('div', { class: 'wHL' }, `${t('high')} ${toUnit(data.days[0].max, s.units)}  ·  ${t('low')} ${toUnit(data.days[0].min, s.units)}`)),
          wxImg(c.icon, 'wBig')));
        card.append(h('div', { class: 'wMeta' },
          h('span', {}, `${t('feels')} ${toUnit(c.feels, s.units)}`),
          h('span', {}, `${t('humidity')} ${c.humidity ?? '–'}%`),
          h('span', {}, `${t('wind')} ${c.wind ?? '–'} ${t('kmh')}`)));
      }
      const row = h('div', { class: 'wDays' });
      data.days.slice(0, days).forEach((d, i) => {
        const dt = new Date(d.date + 'T12:00:00Z');
        const name = i === 0 && strip ? t('today') : new Intl.DateTimeFormat(loc(ctx), { weekday: 'short', timeZone: 'UTC' }).format(dt);
        row.append(h('div', { class: 'wDay' + (i === 0 ? ' first' : '') },
          h('div', { class: 'dn' }, name),
          h('div', { class: 'dd' }, `${dt.getUTCDate()}/${dt.getUTCMonth() + 1}`),
          wxImg(d.icon, 'di'),
          h('div', { class: 'dt' }, toUnit(d.max, s.units)),
          strip ? null : h('div', { class: 'dl' }, toUnit(d.min, s.units))));
      });
      card.append(row);
      if (!strip) {
        const when = new Date(data.updated);
        card.append(h('div', { class: 'wFoot' }, `${t('updated')} ${new Intl.DateTimeFormat(loc(ctx), { hour: '2-digit', minute: '2-digit', hour12: s.hour12 }).format(when).toUpperCase()}${offline ? ' · ' + t('offline') : ''}`));
      }
    }
    render();
    ctx.api.weather().then((d) => { if (d) { data = d; render(); } });
    ctx.sub('weather', (d) => { data = d; offline = false; render(); });
    ctx.sub('weatherError', () => { offline = true; render(); });
  };

  // ------------------------------------------------------------------ ANALOG CLOCK
  // Hand colours chosen per dial so they are always readable.
  const HANDS = [
    { hour: '#15171c', min: '#15171c', sec: '#d4281e' }, { hour: '#101114', min: '#101114', sec: '#d4281e' },
    { hour: '#f4f4f4', min: '#f4f4f4', sec: '#ff7a1a' }, { hour: '#2b1a0a', min: '#2b1a0a', sec: '#a31616' },
    { hour: '#17120c', min: '#17120c', sec: '#a31616' }, { hour: '#eef2f8', min: '#eef2f8', sec: '#ff8a3d' },
    { hour: '#0b3d2e', min: '#0b3d2e', sec: '#b01818' }, { hour: '#f3d27a', min: '#f3d27a', sec: '#ff6b4a' },
    { hour: '#f1d28a', min: '#f1d28a', sec: '#ff6b4a' }, { hour: '#1f5fd6', min: '#d6322b', sec: '#1f9d4d' }
  ];

  function drawHand(g, deg, len, width, color) {
    g.save(); g.rotate(deg * Math.PI / 180);
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = width * 0.7; g.shadowOffsetY = width * 0.25;
    g.fillStyle = color; g.beginPath();
    g.moveTo(-width / 2, width * 1.6); g.lineTo(-width / 2, -len * 0.18); g.lineTo(-width * 0.2, -len);
    g.lineTo(width * 0.2, -len); g.lineTo(width / 2, -len * 0.18); g.lineTo(width / 2, width * 1.6); g.closePath(); g.fill();
    g.restore();
  }

  W.analog = function (root, ctx) {
    const { s, t } = ctx;
    const face = Math.min(9, Math.max(0, (s.clock.face | 0)));
    const col = HANDS[face];
    const SIZE = 220;
    const cv = h('canvas', { width: SIZE * 2, height: SIZE * 2, class: 'hands' });
    const wrap = h('div', { class: 'analogWrap' },
      h('img', { class: 'dial', src: `assets/dials/f${face}.webp`, width: SIZE, height: SIZE, draggable: 'false' }), cv);
    const datePill = s.clock.showDate ? h('div', { class: 'datePill' }) : null;
    const box = h('div', { class: 'holder analog' }, tools(ctx, 'analog'), wrap, datePill);
    root.append(box);

    function draw(now) {
      const g = cv.getContext('2d'); const Wd = cv.width; const R = Wd / 2;
      g.clearRect(0, 0, Wd, Wd); g.save(); g.translate(R, R);
      const sweep = s.clock.sweep;
      const sec = now.getSeconds() + (sweep ? now.getMilliseconds() / 1000 : 0);
      const min = now.getMinutes() + sec / 60;
      const hr = (now.getHours() % 12) + min / 60;
      drawHand(g, hr * 30, R * 0.5, R * 0.072, col.hour);
      drawHand(g, min * 6, R * 0.74, R * 0.05, col.min);
      if (s.clock.seconds) {
        g.save(); g.rotate(sec * 6 * Math.PI / 180);
        g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
        g.strokeStyle = col.sec; g.lineWidth = R * 0.014; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, R * 0.2); g.lineTo(0, -R * 0.82); g.stroke();
        g.fillStyle = col.sec; g.beginPath(); g.arc(0, 0, R * 0.04, 0, Math.PI * 2); g.fill(); g.restore();
      } else {
        g.fillStyle = col.hour; g.beginPath(); g.arc(0, 0, R * 0.035, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
    let lastSec = -1;
    function tick() {
      const now = new Date();
      if (s.clock.sweep && s.clock.seconds) { draw(now); }
      else if (now.getSeconds() !== lastSec) { lastSec = now.getSeconds(); draw(now); }
      if (datePill && now.getDate() !== datePill._d) {
        datePill._d = now.getDate();
        datePill.textContent = new Intl.DateTimeFormat(loc(ctx), { weekday: 'short', day: 'numeric', month: 'short' }).format(now);
      }
    }
    tick();
    if (s.clock.sweep && s.clock.seconds) ctx.raf(tick); else ctx.every(200, tick);
  };

  // ------------------------------------------------------------------ DIGITAL CLOCK
  W.digital = function (root, ctx) {
    const { s } = ctx;
    const style = Math.min(5, Math.max(0, s.clock.digitalStyle | 0));
    const time = h('span', { class: 'tm' }); const sec = h('span', { class: 'sc' }); const ap = h('span', { class: 'ap' });
    const date = h('div', { class: 'dg-date' }); const hij = s.clock.digitalHijri ? h('div', { class: 'dg-hijri' }) : null;
    const card = h('div', { class: `card digital ds${style}` }, tools(ctx, 'digital'),
      h('div', { class: 'dg-main' }, time, h('div', { class: 'dg-side' }, s.clock.digitalSeconds ? sec : null, s.clock.digitalAmPm && s.hour12 ? ap : null)),
      date, hij);
    root.append(card);
    function tick() {
      const now = new Date();
      let hr = now.getHours(); let suffix = '';
      if (s.hour12) { suffix = hr >= 12 ? (ctx.lang === 'ar' ? 'م' : 'PM') : (ctx.lang === 'ar' ? 'ص' : 'AM'); hr = hr % 12 || 12; }
      time.textContent = `${s.hour12 ? hr : pad2(hr)}:${pad2(now.getMinutes())}`;
      sec.textContent = pad2(now.getSeconds()); ap.textContent = suffix;
      date.textContent = new Intl.DateTimeFormat(loc(ctx), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
      if (hij) hij.textContent = hijriFmt(now, s.calendar.hijriOffset, ctx.lang);
    }
    tick(); ctx.every(500, tick);
  };

  // ------------------------------------------------------------------ CALENDAR
  W.calendar = function (root, ctx) {
    const { s, t } = ctx;
    const mem = ctx.mem.calendar = ctx.mem.calendar || { y: null, m: null };
    const now0 = new Date();
    if (mem.y === null) { mem.y = now0.getFullYear(); mem.m = now0.getMonth(); }
    const card = h('div', { class: 'card calendar' }); root.append(card);
    const ws = s.calendar.weekStart;
    function render() {
      card.innerHTML = '';
      card.append(tools(ctx, 'calendar'));
      const first = new Date(mem.y, mem.m, 1);
      const title = new Intl.DateTimeFormat(loc(ctx), { month: 'long', year: 'numeric' }).format(first);
      let hijTitle = '';
      if (s.calendar.hijri) {
        const a = hijriFmt(new Date(mem.y, mem.m, 1), s.calendar.hijriOffset, ctx.lang, { month: 'long', year: 'numeric' });
        const b = hijriFmt(new Date(mem.y, mem.m + 1, 0), s.calendar.hijriOffset, ctx.lang, { month: 'long', year: 'numeric' });
        hijTitle = a === b ? a : `${a} – ${b}`;
      }
      card.append(h('div', { class: 'calHead' },
        h('button', { class: 'btn nav', title: t('prev'), onclick: () => { mem.m--; if (mem.m < 0) { mem.m = 11; mem.y--; } render(); } }, ic(ctx.lang === 'ar' ? 'right' : 'left')),
        h('div', { class: 'calTitle', title: t('today'), onclick: () => { const n = new Date(); mem.y = n.getFullYear(); mem.m = n.getMonth(); render(); } },
          h('div', { class: 'ct' }, title), hijTitle ? h('div', { class: 'ch' }, hijTitle) : null),
        h('button', { class: 'btn nav', title: t('next'), onclick: () => { mem.m++; if (mem.m > 11) { mem.m = 0; mem.y++; } render(); } }, ic(ctx.lang === 'ar' ? 'left' : 'right'))));
      const grid = h('div', { class: 'calGrid' });
      for (let i = 0; i < 7; i++) {
        const dow = (ws + i) % 7;
        const ref = new Date(2023, 0, 1 + dow); // 2023-01-01 is a Sunday
        grid.append(h('div', { class: 'dow' + (dow === 5 ? ' fri' : '') }, new Intl.DateTimeFormat(loc(ctx), { weekday: 'short' }).format(ref)));
      }
      const lead = (first.getDay() - ws + 7) % 7;
      const dim = new Date(mem.y, mem.m + 1, 0).getDate();
      const today = new Date();
      for (let i = 0; i < lead; i++) grid.append(h('div', { class: 'cell empty' }));
      for (let d = 1; d <= dim; d++) {
        const dt = new Date(mem.y, mem.m, d, 12);
        const isToday = dt.getFullYear() === today.getFullYear() && dt.getMonth() === today.getMonth() && dt.getDate() === today.getDate();
        grid.append(h('div', { class: 'cell' + (isToday ? ' today' : '') + (dt.getDay() === 5 ? ' fri' : '') },
          h('span', { class: 'g' }, d),
          s.calendar.hijri ? h('span', { class: 'hj' }, hijriDay(dt, s.calendar.hijriOffset)) : null));
      }
      card.append(grid);
    }
    render();
    let day = now0.getDate();
    ctx.every(30000, () => { const n = new Date(); if (n.getDate() !== day) { day = n.getDate(); render(); } });
  };

  // ------------------------------------------------------------------ CALCULATOR
  // Recursive-descent evaluator (no eval / Function). Supports + - * / ^ % ! ( ) sin cos tan asin acos atan ln log sqrt abs pi e.
  function calcEvalCore(src, deg) {
    const str = src; let i = 0;
    const peek = () => str[i];
    const toRad = (x) => (deg ? x * Math.PI / 180 : x);
    const fromRad = (x) => (deg ? x * 180 / Math.PI : x);
    const F = {
      sin: (x) => { const r = Math.sin(toRad(x)); return Math.abs(r) < 1e-15 ? 0 : r; }, cos: (x) => { const r = Math.cos(toRad(x)); return Math.abs(r) < 1e-15 ? 0 : r; },
      tan: (x) => Math.tan(toRad(x)), asin: (x) => fromRad(Math.asin(x)), acos: (x) => fromRad(Math.acos(x)), atan: (x) => fromRad(Math.atan(x)),
      ln: Math.log, log: Math.log10, sqrt: Math.sqrt, abs: Math.abs
    };
    function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const op = str[i++]; const r = term(); v = op === '+' ? v + r : v - r; } return v; }
    function term() {
      let v = power();
      for (;;) {
        if (peek() === '*' || peek() === '/') { const op = str[i++]; const r = power(); v = op === '*' ? v * r : v / r; }
        else if (peek() === '(' || /[a-z]/.test(peek() || '')) { v *= power(); }
        else break;
      }
      return v;
    }
    function power() { const b = unary(); if (peek() === '^') { i++; return Math.pow(b, power()); } return b; }
    function unary() { if (peek() === '-') { i++; return -unary(); } if (peek() === '+') { i++; return unary(); } return postfix(); }
    function postfix() {
      let v = primary();
      while (peek() === '%' || peek() === '!') {
        if (str[i++] === '%') v /= 100;
        else { if (v < 0 || v > 170 || Math.floor(v) !== v) throw new Error('fact'); let f = 1; for (let k = 2; k <= v; k++) f *= k; v = f; }
      }
      return v;
    }
    function primary() {
      const c = peek();
      if (c === '(') { i++; const v = expr(); if (peek() !== ')') throw new Error('paren'); i++; return v; }
      if (/[0-9.]/.test(c || '')) { const m = /^(\d+\.?\d*|\.\d+)/.exec(str.slice(i)); if (!m) throw new Error('num'); i += m[0].length; return parseFloat(m[0]); }
      if (/[a-z]/.test(c || '')) {
        const name = /^[a-z]+/.exec(str.slice(i))[0]; i += name.length;
        if (name === 'pi') return Math.PI;
        if (name === 'e' && peek() !== '(') return Math.E;
        if (F[name]) { if (peek() !== '(') throw new Error('fn'); i++; const v = expr(); if (peek() !== ')') throw new Error('paren'); i++; return F[name](v); }
        throw new Error('name');
      }
      throw new Error('syntax');
    }
    const v = expr();
    if (i < str.length) throw new Error('trailing');
    return v;
  }
  // Public evaluator: normalises symbols, auto-closes parentheses, validates the result.
  function calculate(src, deg) {
    let s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/√/g, 'sqrt');
    let open = 0; for (const ch of s) { if (ch === '(') open++; else if (ch === ')') open--; }
    s += ')'.repeat(Math.max(0, open));
    const v = calcEvalCore(s, deg);
    if (!Number.isFinite(v)) throw new Error('math');
    return v;
  }
  const fmtNum = (v) => { const n = Number(v.toPrecision(12)); return Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-9 && n !== 0) ? n.toExponential(6).replace(/\.?0+e/, 'e') : String(n); };
  W._calc = { calculate, fmtNum };

  W.calc = function (root, ctx) {
    const { t } = ctx;
    const mem = ctx.mem.calc = ctx.mem.calc || { expr: '', result: '', sci: false, deg: true, justEvaluated: false };
    const exprEl = h('div', { class: 'cExpr' }); const resEl = h('div', { class: 'cRes' });
    const sciBox = h('div', { class: 'cSci' });
    const pad = h('div', { class: 'cPad' });
    const card = h('div', { class: 'card calc', tabindex: '0' }, tools(ctx, 'calc',
      h('button', { title: t('sci'), onclick: () => { mem.sci = !mem.sci; render(); } }, h('b', { style: { fontSize: '11px' } }, 'fx'))),
    h('div', { class: 'cScreen nodrag' }, exprEl, resEl), sciBox, pad);
    root.append(card);

    const OPS = '+−×÷^';
    function press(k) {
      if (k === 'C') { mem.expr = ''; mem.result = ''; mem.justEvaluated = false; }
      else if (k === '⌫') { mem.expr = mem.expr.replace(/(sin|cos|tan|asin|acos|atan|ln|log|sqrt|√)\($|.$/, ''); mem.justEvaluated = false; }
      else if (k === '=') {
        if (!mem.expr) return;
        try { const v = calculate(mem.expr, mem.deg); mem.result = fmtNum(v); mem.prev = mem.expr; mem.expr = mem.result; mem.justEvaluated = true; }
        catch (e) { mem.result = t('err'); mem.justEvaluated = false; }
      } else if (k === '±') {
        const m = /(\d+\.?\d*|\.\d+|π)$/.exec(mem.expr);
        if (!m) { mem.expr = mem.expr + '−'; }
        else {
          const idx = m.index; const before = mem.expr[idx - 1]; const beforePrev = mem.expr[idx - 2];
          if (before === '−' && (idx - 1 === 0 || '+−×÷^('.includes(beforePrev))) mem.expr = mem.expr.slice(0, idx - 1) + mem.expr.slice(idx);
          else mem.expr = mem.expr.slice(0, idx) + '−' + mem.expr.slice(idx);
        }
      } else {
        const isOp = OPS.includes(k) || k === '%';
        if (mem.justEvaluated && !isOp && k !== ')' && k !== '²') mem.expr = '';
        mem.justEvaluated = false;
        if (k === 'x²') mem.expr += '^2';
        else if (['sin', 'cos', 'tan', 'ln', 'log', '√'].includes(k)) mem.expr += k + '(';
        else if (k === '.') { const m = /(\d*\.?\d*)$/.exec(mem.expr); if (!m[0].includes('.')) mem.expr += m[0] === '' ? '0.' : '.'; }
        else if (OPS.includes(k) && mem.expr === '' && k !== '−') { /* ignore leading operator */ }
        else if (OPS.includes(k) && OPS.includes(mem.expr.slice(-1)) && k !== '−') mem.expr = mem.expr.slice(0, -1) + k;
        else mem.expr += k;
        // live preview
        mem.result = '';
        try { if (mem.expr && /\d|π|e/.test(mem.expr) && !OPS.includes(mem.expr.slice(-1))) mem.result = fmtNum(calculate(mem.expr, mem.deg)); } catch (e) { mem.result = ''; }
        if (mem.result === mem.expr) mem.result = '';
      }
      paint();
    }
    function btn(label, cls, key) { return h('button', { class: 'ck ' + (cls || ''), onclick: () => press(key || label) }, label); }
    function paint() {
      exprEl.textContent = mem.justEvaluated && mem.prev ? mem.prev + ' =' : (mem.expr || '');
      resEl.textContent = mem.justEvaluated ? mem.expr : (mem.result || (mem.expr ? '' : '0'));
      resEl.classList.toggle('err', mem.result === t('err'));
    }
    function render() {
      sciBox.innerHTML = ''; pad.innerHTML = '';
      if (mem.sci) {
        sciBox.append(h('button', { class: 'ck fn', onclick: () => { mem.deg = !mem.deg; render(); } }, mem.deg ? t('deg') : t('rad')),
          btn('sin', 'fn'), btn('cos', 'fn'), btn('tan', 'fn'), btn('ln', 'fn'), btn('log', 'fn'), btn('√', 'fn'), btn('^', 'fn'),
          btn('(', 'fn'), btn(')', 'fn'), btn('x²', 'fn'), btn('π', 'fn'));
      }
      ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '±', '0', '.', '='].forEach((k) => {
        const cls = k === '=' ? 'eq' : ('+−×÷'.includes(k) ? 'op' : (k === 'C' || k === '⌫' || k === '%' || k === '±' ? 'fn' : 'num'));
        pad.append(btn(k, cls));
      });
      paint();
    }
    render();
    card.addEventListener('keydown', (e) => {
      const k = e.key;
      if (/^[0-9]$/.test(k) || k === '.') press(k);
      else if (k === '+') press('+'); else if (k === '-') press('−'); else if (k === '*') press('×'); else if (k === '/') { e.preventDefault(); press('÷'); }
      else if (k === '^') press('^'); else if (k === '%') press('%'); else if (k === '(' || k === ')') press(k);
      else if (k === 'Enter' || k === '=') { e.preventDefault(); press('='); }
      else if (k === 'Backspace') press('⌫'); else if (k === 'Escape' || k === 'Delete') press('C');
    });
    card.addEventListener('mousedown', () => card.focus());
  };

  // ------------------------------------------------------------------ WORLD TIME
  const AR_CITY = { Cairo: 'القاهرة', Alexandria: 'الإسكندرية', Makkah: 'مكة المكرمة', Riyadh: 'الرياض', Dubai: 'دبي', Doha: 'الدوحة', Kuwait: 'الكويت', Amman: 'عمّان', Istanbul: 'إسطنبول', London: 'لندن', Paris: 'باريس', Berlin: 'برلين', Moscow: 'موسكو', 'New York': 'نيويورك', Chicago: 'شيكاغو', 'Los Angeles': 'لوس أنجلوس', Toronto: 'تورونتو', 'Sao Paulo': 'ساو باولو', Karachi: 'كراتشي', Delhi: 'دلهي', Dhaka: 'دكا', Jakarta: 'جاكرتا', Singapore: 'سنغافورة', Beijing: 'بكين', Tokyo: 'طوكيو', Sydney: 'سيدني', Johannesburg: 'جوهانسبرغ', Lagos: 'لاغوس' };
  W.world = function (root, ctx) {
    const { s, t } = ctx;
    const card = h('div', { class: 'card world' }, tools(ctx, 'world'), h('div', { class: 'title wTitle' }, t('world')));
    const list = h('div', { class: 'wList' }); card.append(list); root.append(card);
    const rows = (s.world.cities || []).map((c) => {
      const name = h('div', { class: 'wcName' }); const sub = h('div', { class: 'wcSub' });
      const time = h('div', { class: 'wcTime' }); const icon = h('span', { class: 'wcIcon' });
      list.append(h('div', { class: 'wcRow' }, icon, h('div', { class: 'wcL' }, name, sub), time));
      return { c, name, sub, time, icon, last: '' };
    });
    function tick() {
      const now = new Date(); const myOff = -now.getTimezoneOffset();
      const myDate = new Intl.DateTimeFormat('en-CA').format(now);
      rows.forEach((r) => {
        let ok = true; let p; let off;
        try { p = tzParts(now, r.c.tz); off = offsetMin(r.c.tz, now); } catch (e) { ok = false; }
        if (!ok) { r.name.textContent = r.c.name; r.time.textContent = '?'; return; }
        const hr = s.hour12 ? (p.hour % 12 || 12) : pad2(p.hour);
        const suffix = s.hour12 ? ' ' + (p.hour >= 12 ? (ctx.lang === 'ar' ? 'م' : 'PM') : (ctx.lang === 'ar' ? 'ص' : 'AM')) : '';
        const cityDate = `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
        const cmp = cityDate === myDate ? 0 : (cityDate > myDate ? 1 : -1);
        const diff = off - myOff;
        const unit = ctx.lang === 'ar' ? ' س' : 'h';
        const dtxt = diff === 0 ? '' : ` · \u2066${diff > 0 ? '+' : '−'}${Math.floor(Math.abs(diff) / 60)}${Math.abs(diff) % 60 ? ':' + pad2(Math.abs(diff) % 60) : ''}${unit}\u2069`;
        const html = `${hr}:${pad2(p.minute)}${s.world.seconds ? ':' + pad2(p.second) : ''}${suffix}`;
        r.name.textContent = (ctx.lang === 'ar' && AR_CITY[r.c.name]) || r.c.name;
        r.sub.textContent = (cmp === 0 ? t('sameDay') : cmp > 0 ? t('tomorrow') : t('yesterday')) + dtxt;
        if (r.time.textContent !== html) r.time.textContent = html;
        const day = p.hour >= 6 && p.hour < 18;
        const key = day ? 'sun' : 'moon';
        if (r.last !== key) { r.last = key; r.icon.innerHTML = `<svg class="ic ${key}" viewBox="0 0 24 24">${P[key]}</svg>`; }
      });
    }
    tick(); ctx.every(s.world.seconds ? 500 : 2000, tick);
  };

  // ------------------------------------------------------------------ STICKY NOTES
  const NOTE_COLORS = ['#ffe97a', '#ffb3c1', '#a8e6a1', '#9fd3ff', '#d8b9ff'];
  W.notes = function (root, ctx) {
    const { t } = ctx;
    const mem = ctx.mem.notes = ctx.mem.notes || { sel: null };
    let list = []; let saveT = null;
    const card = h('div', { class: 'card notes' }); root.append(card);
    const save = () => { clearTimeout(saveT); saveT = setTimeout(() => ctx.api.setNotes(list), 350); };
    function cur() { return list.find((n) => n.id === mem.sel) || list[0]; }
    function render() {
      if (!list.length) list = [{ id: 'n' + Date.now().toString(36), text: '', color: ctx.s.noteColor | 0 }];
      const n = cur(); mem.sel = n.id;
      const color = NOTE_COLORS[n.color % NOTE_COLORS.length];
      card.innerHTML = '';
      card.style.background = `linear-gradient(170deg, ${color}, ${shade(color)})`;
      card.style.setProperty('--sticky', color);
      card.append(tools(ctx, 'notes'));
      const tabs = h('div', { class: 'nTabs nodrag' });
      list.forEach((x, i) => tabs.append(h('button', { class: 'nTab' + (x.id === n.id ? ' on' : ''), style: { background: NOTE_COLORS[x.color % NOTE_COLORS.length] }, title: (x.text || '').slice(0, 40) || t('newNote'), onclick: () => { mem.sel = x.id; render(); } }, String(i + 1))));
      tabs.append(h('button', { class: 'nTab add', title: t('newNote'), onclick: () => { const id = 'n' + Date.now().toString(36); list.push({ id, text: '', color: (ctx.s.noteColor | 0) }); mem.sel = id; save(); render(); } }, ic('plus')));
      card.append(tabs);
      const ta = h('textarea', { class: 'nText', placeholder: t('notePh'), spellcheck: 'false' });
      ta.value = n.text; ta.addEventListener('input', () => { n.text = ta.value; save(); });
      card.append(ta);
      const bar = h('div', { class: 'nBar nodrag' });
      NOTE_COLORS.forEach((c, i) => bar.append(h('button', { class: 'nDot' + (n.color === i ? ' on' : ''), style: { background: c }, onclick: () => { n.color = i; save(); render(); } })));
      bar.append(h('span', { class: 'sp' }),
        h('button', { class: 'nAct', title: t('popOut'), onclick: () => { clearTimeout(saveT); ctx.api.setNotes(list).then(() => ctx.api.popoutNote(n.id)); } }, ic('pop')),
        h('button', { class: 'nAct', title: t('delNote'), onclick: () => { list = list.filter((x) => x.id !== n.id); mem.sel = null; save(); render(); } }, ic('trash')));
      card.append(bar);
    }
    ctx.api.getNotes().then((l) => { list = l || []; render(); });
    ctx.sub('notes', (l) => { const active = document.activeElement; if (active && active.classList && active.classList.contains('nText')) return; list = l; render(); });
    ctx.cleanups.push(() => { clearTimeout(saveT); if (list.length) ctx.api.setNotes(list); });
  };
  function shade(hex) {
    const n = parseInt(hex.slice(1), 16); const f = 0.88;
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => pad2(Math.round(v * f).toString(16))).join('');
  }

  // Floating (popped-out) sticky note window.
  W.noteWindow = function (root, ctx, noteId) {
    let list = []; let saveT = null;
    const card = h('div', { class: 'card notes pop' }); root.append(card);
    const save = () => { clearTimeout(saveT); saveT = setTimeout(() => ctx.api.setNotes(list), 350); };
    function render() {
      const n = list.find((x) => x.id === noteId);
      if (!n) { ctx.api.closeSelf(); return; }
      const color = NOTE_COLORS[n.color % NOTE_COLORS.length];
      card.innerHTML = '';
      card.style.background = `linear-gradient(170deg, ${color}, ${shade(color)})`;
      card.append(h('div', { class: 'tools' }, h('button', { title: ctx.t('close'), onclick: () => ctx.api.closeSelf() }, ic('close'))));
      const ta = h('textarea', { class: 'nText', placeholder: ctx.t('notePh'), spellcheck: 'false' });
      ta.value = n.text; ta.addEventListener('input', () => { n.text = ta.value; save(); });
      card.append(ta);
      const bar = h('div', { class: 'nBar nodrag' });
      NOTE_COLORS.forEach((c, i) => bar.append(h('button', { class: 'nDot' + (n.color === i ? ' on' : ''), style: { background: c }, onclick: () => { n.color = i; save(); render(); } })));
      card.append(bar);
    }
    ctx.api.getNotes().then((l) => { list = l || []; render(); });
    ctx.sub('notes', (l) => { const a = document.activeElement; if (a && a.classList && a.classList.contains('nText')) return; list = l; render(); });
  };

  // ------------------------------------------------------------------ PRAYER TIMES
  const PRAY_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  W.prayer = function (root, ctx) {
    const { s, t } = ctx;
    const other = makeT(ctx.lang === 'ar' ? 'en' : 'ar');
    const nextOnly = s.prayer.layout === 'next';
    const card = h('div', { class: 'card prayer' + (nextOnly ? ' next-only' : '') }); root.append(card);
    const tz = s.location.tz || undefined;
    const fmt = (iso) => new Intl.DateTimeFormat(loc(ctx), { hour: '2-digit', minute: '2-digit', hour12: s.hour12, timeZone: tz }).format(new Date(iso)).toUpperCase();
    let data = null; let lastKey = '';
    let cdEl = null; let nextEl = null;

    async function load() {
      try { data = await ctx.api.prayer(0); lastKey = new Date().toDateString(); render(); } catch (e) { card.textContent = String(e); }
    }
    function currentKey(now) {
      let cur = null;
      PRAY_KEYS.forEach((k) => { if (new Date(data.times[k]) <= now) cur = k; });
      return cur;
    }
    function render() {
      if (!data) return;
      const now = new Date();
      const cur = currentKey(now); const nx = data.next.name;
      card.innerHTML = '';
      card.append(tools(ctx, 'prayer'));
      card.append(h('div', { class: 'pHead' },
        h('div', { class: 'title' }, t('prayer')),
        h('div', { class: 'pLoc' }, ic('pin'), h('span', {}, placeName(ctx)))));
      nextEl = h('div', { class: 'pNextName' }, t('pray.' + nx));
      cdEl = h('div', { class: 'pCount' }, '--:--:--');
      card.append(h('div', { class: 'pHero' },
        h('div', { class: 'pLabel' }, t('nextPrayer')),
        nextEl, h('div', { class: 'pAt' }, fmt(data.next.time)), cdEl));
      const list = h('div', { class: 'pList' });
      PRAY_KEYS.forEach((k) => {
        if (k === 'sunrise' && !s.prayer.showSunrise) return;
        const past = new Date(data.times[k]) <= now;
        list.append(h('div', { class: 'pRow' + (k === nx ? ' next' : '') + (k === cur ? ' cur' : '') + (past && k !== cur ? ' past' : '') + (k === 'sunrise' ? ' sun' : '') },
          h('div', { class: 'pn' }, h('span', { class: 'pm' }, t('pray.' + k)), h('span', { class: 'ps' }, other('pray.' + k))),
          h('div', { class: 'pt' }, fmt(data.times[k]))));
      });
      if (!nextOnly) card.append(list);
      const foot = h('div', { class: 'pFoot' },
        h('div', { class: 'pDate' },
          h('div', {}, new Intl.DateTimeFormat(loc(ctx), { weekday: 'long', day: 'numeric', month: 'long' }).format(now)),
          h('div', { class: 'hj' }, hijriFmt(now, s.calendar.hijriOffset, ctx.lang))));
      if (s.prayer.showQibla) {
        foot.append(h('div', { class: 'pQibla', title: `${t('qibla')} ${data.qibla}° ${t('fromNorth')}` },
          h('span', { class: 'qArrow', style: { transform: `rotate(${data.qibla}deg)` }, html: `<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-opacity=".5"/><path d="M12 3.5l3.4 8.5H12.9v8h-1.8v-8H8.6z" fill="currentColor"/></svg>` }),
          h('span', {}, `${t('qibla')} ${Math.round(data.qibla)}°`)));
      }
      card.append(foot);
      countdown();
    }
    function countdown() {
      if (!data || !cdEl) return;
      const ms = new Date(data.next.time) - new Date();
      if (ms <= 0) { load(); return; }
      const sec = Math.floor(ms / 1000);
      cdEl.textContent = `${pad2(Math.floor(sec / 3600))}:${pad2(Math.floor(sec % 3600 / 60))}:${pad2(sec % 60)}`;
    }
    load();
    ctx.every(1000, () => { if (new Date().toDateString() !== lastKey) load(); else countdown(); });
  };

  window.Widgets = W;
  window.ChronoUI = { h, ic, NOTE_COLORS };
})();
