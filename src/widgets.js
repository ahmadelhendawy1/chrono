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
    gear: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    pop: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>', pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    arrow: '<path d="M12 3l5 9h-3.5v9h-3v-9H7z"/>', back: '<path d="M4 7h16M4 12h16M4 17h10"/>', chevL: '<path d="M14 5l-7 7 7 7"/>', chevR: '<path d="M10 5l7 7-7 7"/>',
    pushpin: '<path d="M9 3h6l-1.2 6.2L17 12.5H7l3.2-3.3z"/><path d="M12 12.5V21"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    play: '<path d="M8 5l11 7-11 7z"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    dock: '<path d="M4 4h16v16H4z"/><path d="M14 4v16"/><path d="M11 9l-3 3 3 3"/>',
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
    const s = ctx.s;
    // sidebar: pop this one widget out to float on the desktop; popped-out widget: put it back in the sidebar
    const pop = ctx.bar && ctx.api.detachWidget ? h('button', { class: 'popBtn', title: ctx.t('popOutWidget'), onclick: (e) => {
      const card = e.currentTarget.closest('.slot') || e.currentTarget.closest('.card');
      const z = window.outerHeight / Math.max(1, window.innerHeight);
      const y = window.screenY + (card ? card.getBoundingClientRect().top : 0) * z;
      ctx.api.detachWidget(id, { y });
    } }, ic('pop')) : null;
    const dock = !ctx.bar && s.mode === 'bar' && ctx.api.dockWidget ? h('button', { class: 'popBtn', title: ctx.t('dockWidget'), onclick: () => ctx.api.dockWidget(id) }, ic('dock')) : null;
    return h('div', { class: 'tools' },
      extra || null,
      pop, dock,
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
    const mem = ctx.mem.calc = ctx.mem.calc || { expr: '', result: '', sci: false, deg: true, justEvaluated: false, tab: 'calc' };
    // Persistent part (memory, history, items, saved lists) lives in the main process.
    let data = { memory: 0, history: [], items: [], archive: [], currency: '' };
    let saveT = null;
    const save = () => { clearTimeout(saveT); saveT = setTimeout(() => ctx.api.setCalc && ctx.api.setCalc(data), 250); };
    const money = (v) => (Math.round(v * 100) / 100).toLocaleString(ctx.lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const cur = () => (data.currency || t('currencyDefault'));
    const evalField = (str) => { const v = String(str || '').trim(); if (!v) return 0; try { return calculate(v.replace(/,/g, '.'), true); } catch (e) { return NaN; } };

    const card = h('div', { class: 'card calc', tabindex: '0' });
    root.append(card);
    const tabsEl = h('div', { class: 'cTabs nodrag' });
    const body = h('div', { class: 'cBody' });
    card.append(tools(ctx, 'calc', mem.tab === 'calc' ? h('button', { title: t('sci'), onclick: () => { mem.sci = !mem.sci; renderBody(); } }, h('b', { style: { fontSize: '11px' } }, 'fx')) : null), tabsEl, body);

    function renderTabs() {
      tabsEl.innerHTML = '';
      [['calc', t('calcTab')], ['items', t('itemsTab')], ['hist', t('histTab')]].forEach(([id, label]) => {
        tabsEl.append(h('button', { class: 'cTab' + (mem.tab === id ? ' on' : ''), onclick: () => { mem.tab = id; renderAll(); } }, label));
      });
    }

    // ---------------- calculator tab
    let exprEl; let resEl; let memEl;
    const OPS = '+−×÷^';
    function press(k) {
      if (k === 'C') { mem.expr = ''; mem.result = ''; mem.justEvaluated = false; }
      else if (k === '⌫') { mem.expr = mem.expr.replace(/(sin|cos|tan|asin|acos|atan|ln|log|sqrt|√)\($|.$/, ''); mem.justEvaluated = false; }
      else if (k === '=') {
        if (!mem.expr) return;
        try {
          const v = calculate(mem.expr, mem.deg); const r = fmtNum(v);
          if (!mem.justEvaluated) { data.history.unshift({ expr: mem.expr, result: r, at: Date.now() }); data.history = data.history.slice(0, 200); save(); }
          mem.result = r; mem.prev = mem.expr; mem.expr = r; mem.justEvaluated = true;
        } catch (e) { mem.result = t('err'); mem.justEvaluated = false; }
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
        mem.result = '';
        try { if (mem.expr && /\d|π|e/.test(mem.expr) && !OPS.includes(mem.expr.slice(-1))) mem.result = fmtNum(calculate(mem.expr, mem.deg)); } catch (e) { mem.result = ''; }
        if (mem.result === mem.expr) mem.result = '';
      }
      paint();
    }
    // value currently on screen (for M+ / M− / MS)
    function shown() {
      try { const src = mem.justEvaluated ? mem.expr : mem.expr; return src ? calculate(src, mem.deg) : 0; } catch (e) { return NaN; }
    }
    function memKey(k) {
      const v = shown();
      if (k === 'MC') data.memory = 0;
      else if (k === 'MR') { const r = fmtNum(data.memory || 0); if (mem.justEvaluated || !mem.expr || OPS.includes(mem.expr.slice(-1)) || mem.expr.slice(-1) === '(') { if (mem.justEvaluated) mem.expr = ''; mem.expr += r; mem.justEvaluated = false; mem.result = ''; } else { mem.expr = r; } }
      else if (!Number.isFinite(v)) return;
      else if (k === 'M+') data.memory = (data.memory || 0) + v;
      else if (k === 'M−') data.memory = (data.memory || 0) - v;
      else if (k === 'MS') data.memory = v;
      if (k !== 'MR') save();
      paint();
    }
    function paint() {
      if (!exprEl) return;
      exprEl.textContent = mem.justEvaluated && mem.prev ? mem.prev + ' =' : (mem.expr || '');
      resEl.textContent = mem.justEvaluated ? mem.expr : (mem.result || (mem.expr ? '' : '0'));
      resEl.classList.toggle('err', mem.result === t('err'));
      memEl.textContent = data.memory ? 'M  ' + fmtNum(data.memory) : '';
    }
    function btn(label, cls, key) { return h('button', { class: 'ck ' + (cls || ''), onclick: () => press(key || label) }, label); }
    function renderCalc() {
      exprEl = h('div', { class: 'cExpr' }); resEl = h('div', { class: 'cRes' }); memEl = h('div', { class: 'cMem' });
      body.append(h('div', { class: 'cScreen nodrag' }, memEl, exprEl, resEl));
      const memRow = h('div', { class: 'cMemRow' });
      ['MC', 'MR', 'M+', 'M−', 'MS'].forEach((k) => memRow.append(h('button', { class: 'mk', title: t('mem.' + k), onclick: () => memKey(k) }, k)));
      body.append(memRow);
      if (mem.sci) {
        const sciBox = h('div', { class: 'cSci' });
        sciBox.append(h('button', { class: 'ck fn', onclick: () => { mem.deg = !mem.deg; renderBody(); } }, mem.deg ? t('deg') : t('rad')),
          btn('sin', 'fn'), btn('cos', 'fn'), btn('tan', 'fn'), btn('ln', 'fn'), btn('log', 'fn'), btn('√', 'fn'), btn('^', 'fn'),
          btn('(', 'fn'), btn(')', 'fn'), btn('x²', 'fn'), btn('π', 'fn'));
        body.append(sciBox);
      }
      const pad = h('div', { class: 'cPad' });
      ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '±', '0', '.', '='].forEach((k) => {
        const cls = k === '=' ? 'eq' : ('+−×÷'.includes(k) ? 'op' : (k === 'C' || k === '⌫' || k === '%' || k === '±' ? 'fn' : 'num'));
        pad.append(btn(k, cls));
      });
      body.append(pad);
      paint();
    }

    // ---------------- items × price tab
    function itemsTotal(items) { return (items || []).reduce((sum, it) => { const q = evalField(it.qty === '' || it.qty == null ? '1' : it.qty); const p = evalField(it.price); return sum + (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0); }, 0); }
    function renderItems() {
      if (!data.items.length) data.items.push({ name: '', qty: '1', price: '' });
      const list = h('div', { class: 'iList nodrag' });
      const totalEl = h('div', { class: 'iTotal' });
      const countEl = h('div', { class: 'iCount' });
      const refreshTotal = () => {
        totalEl.textContent = money(itemsTotal(data.items)) + ' ' + cur();
        const n = data.items.filter((it) => it.name || it.price).length;
        countEl.textContent = t('itemsCount')(n);
      };
      list.append(h('div', { class: 'iHead' }, h('span', {}, t('item')), h('span', {}, t('qty')), h('span', {}, t('price')), h('span', {}, t('lineTotal')), h('span', {})));
      data.items.forEach((it, i) => {
        const line = h('span', { class: 'iLine' });
        const upd = () => {
          const q = evalField(it.qty === '' ? '1' : it.qty); const p = evalField(it.price);
          line.textContent = it.price === '' ? '' : (Number.isFinite(q) && Number.isFinite(p) ? money(q * p) : '?');
          line.classList.toggle('bad', !(Number.isFinite(q) && Number.isFinite(p)));
          refreshTotal(); save();
        };
        const field = (key, cls, ph, mode) => {
          const inp = h('input', { class: 'iIn ' + cls, value: it[key] == null ? '' : it[key], placeholder: ph, inputmode: mode || 'text', spellcheck: 'false' });
          inp.addEventListener('input', () => { it[key] = inp.value; upd(); });
          inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (i === data.items.length - 1) { data.items.push({ name: '', qty: '1', price: '' }); save(); renderBody(); const ins = body.querySelectorAll('.iIn.name'); if (ins.length) ins[ins.length - 1].focus(); }
              else { const ins = body.querySelectorAll('.iIn.name'); if (ins[i + 1]) ins[i + 1].focus(); }
            }
          });
          return inp;
        };
        list.append(h('div', { class: 'iRow' },
          field('name', 'name', t('itemPh')), field('qty', 'qty', '1', 'decimal'), field('price', 'price', '0', 'decimal'), line,
          h('button', { class: 'iDel', title: t('delete'), onclick: () => { data.items.splice(i, 1); save(); renderBody(); } }, ic('close'))));
        upd();
      });
      body.append(list);
      body.append(h('button', { class: 'iAdd nodrag', onclick: () => { data.items.push({ name: '', qty: '1', price: '' }); save(); renderBody(); const ins = body.querySelectorAll('.iIn.name'); if (ins.length) ins[ins.length - 1].focus(); } }, ic('plus'), h('span', {}, t('addItem'))));
      const curIn = h('input', { class: 'iCur', value: data.currency, placeholder: t('currencyDefault'), title: t('currency'), spellcheck: 'false' });
      curIn.addEventListener('input', () => { data.currency = curIn.value.slice(0, 6); refreshTotal(); save(); });
      body.append(h('div', { class: 'iFoot nodrag' },
        h('div', { class: 'iSum' }, countEl, h('div', { class: 'iTotRow' }, h('span', { class: 'iTotLbl' }, t('total')), totalEl)),
        h('div', { class: 'iBtns' },
          curIn,
          h('button', { class: 'iBtn', title: t('copyList'), onclick: (e) => copyList(e.currentTarget) }, ic('copy')),
          h('button', { class: 'iBtn', title: t('saveList'), onclick: (e) => saveList(e.currentTarget) }, ic('save')),
          h('button', { class: 'iBtn', title: t('newList'), onclick: () => { data.items = []; save(); renderBody(); } }, ic('trash')))));
      refreshTotal();
    }
    function listText(items, total) {
      const lines = items.filter((it) => it.name || it.price).map((it) => {
        const q = evalField(it.qty === '' ? '1' : it.qty); const p = evalField(it.price);
        return `${it.name || '—'}  ${fmtNum(q)} × ${money(p)} = ${money(q * p)}`;
      });
      return lines.concat(['----', `${t('total')}: ${money(total)} ${cur()}`]).join('\n');
    }
    function flash(btnEl) { if (!btnEl) return; btnEl.classList.add('done'); setTimeout(() => btnEl.classList.remove('done'), 900); }
    function copyList(btnEl) { navigator.clipboard.writeText(listText(data.items, itemsTotal(data.items))).then(() => flash(btnEl), () => {}); }
    function saveList(btnEl) {
      const items = data.items.filter((it) => it.name || it.price);
      if (!items.length) return;
      const total = itemsTotal(items);
      const first = items.find((it) => it.name);
      data.archive.unshift({ at: Date.now(), items: JSON.parse(JSON.stringify(items)), total, currency: cur(), title: first ? first.name + (items.length > 1 ? ' +' + (items.length - 1) : '') : '' });
      data.archive = data.archive.slice(0, 100);
      save(); flash(btnEl);
    }

    // ---------------- history tab
    function when(at) {
      const d = new Date(at); const now = new Date();
      const same = d.toDateString() === now.toDateString();
      return new Intl.DateTimeFormat(loc(ctx), same ? { hour: 'numeric', minute: '2-digit', hour12: ctx.s.hour12 } : { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: ctx.s.hour12 }).format(d);
    }
    function renderHist() {
      const wrap = h('div', { class: 'hWrap nodrag' });
      wrap.append(h('div', { class: 'hSec' }, h('span', {}, t('calcHistory')),
        data.history.length ? h('button', { class: 'hClear', onclick: () => { data.history = []; save(); renderBody(); } }, t('clear')) : null));
      if (!data.history.length) wrap.append(h('div', { class: 'hEmpty' }, t('noHistory')));
      data.history.slice(0, 60).forEach((x) => wrap.append(h('button', { class: 'hRow', title: t('useResult'), onclick: () => { mem.expr = x.result; mem.prev = x.expr; mem.justEvaluated = true; mem.tab = 'calc'; renderAll(); } },
        h('div', { class: 'hExpr' }, x.expr + ' ='), h('div', { class: 'hRes' }, x.result), h('div', { class: 'hAt' }, when(x.at)))));
      wrap.append(h('div', { class: 'hSec' }, h('span', {}, t('savedLists')),
        data.archive.length ? h('button', { class: 'hClear', onclick: () => { data.archive = []; save(); renderBody(); } }, t('clear')) : null));
      if (!data.archive.length) wrap.append(h('div', { class: 'hEmpty' }, t('noLists')));
      data.archive.forEach((a, i) => wrap.append(h('div', { class: 'hList' },
        h('button', { class: 'hListMain', title: t('openList'), onclick: () => { data.items = JSON.parse(JSON.stringify(a.items)); save(); mem.tab = 'items'; renderAll(); } },
          h('div', { class: 'hExpr' }, (a.title || t('list')) + ' · ' + t('itemsCount')(a.items.length)),
          h('div', { class: 'hRes' }, money(a.total) + ' ' + (a.currency || '')), h('div', { class: 'hAt' }, when(a.at))),
        h('button', { class: 'iDel', title: t('delete'), onclick: () => { data.archive.splice(i, 1); save(); renderBody(); } }, ic('close')))));
      body.append(wrap);
    }

    function renderBody() {
      body.innerHTML = ''; exprEl = null;
      card.dataset.tab = mem.tab;
      if (mem.tab === 'items') renderItems(); else if (mem.tab === 'hist') renderHist(); else renderCalc();
    }
    function renderAll() {
      // tools row carries the fx button only on the calculator tab
      const old = card.querySelector('.tools'); if (old) old.replaceWith(tools(ctx, 'calc', mem.tab === 'calc' ? h('button', { title: t('sci'), onclick: () => { mem.sci = !mem.sci; renderBody(); } }, h('b', { style: { fontSize: '11px' } }, 'fx')) : null));
      renderTabs(); renderBody();
    }
    renderAll();
    if (ctx.api.getCalc) ctx.api.getCalc().then((d) => { if (d) data = Object.assign(data, d); renderBody(); });
    ctx.sub('calc', (d) => { const a = document.activeElement; if (a && card.contains(a) && a.tagName === 'INPUT') return; data = Object.assign(data, d); renderBody(); });
    ctx.cleanups.push(() => { if (saveT) { clearTimeout(saveT); ctx.api.setCalc && ctx.api.setCalc(data); } });
    card.addEventListener('keydown', (e) => {
      if (mem.tab !== 'calc' || (e.target && e.target.tagName === 'INPUT')) return;
      const k = e.key;
      if (/^[0-9]$/.test(k) || k === '.') press(k);
      else if (k === '+') press('+'); else if (k === '-') press('−'); else if (k === '*') press('×'); else if (k === '/') { e.preventDefault(); press('÷'); }
      else if (k === '^') press('^'); else if (k === '%') press('%'); else if (k === '(' || k === ')') press(k);
      else if (k === 'Enter' || k === '=') { e.preventDefault(); press('='); }
      else if (k === 'Backspace') press('⌫'); else if (k === 'Escape' || k === 'Delete') press('C');
    });
    card.addEventListener('mousedown', (e) => { if (!e.target.closest('input')) card.focus(); });
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
      ta.value = n.text; ta.addEventListener('input', () => { n.text = ta.value; n.html = textToHtml(ta.value); save(); });
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

  // Floating sticky note window - Windows 7 style: solid colour, resizable, + / × in a strip that shows on hover,
  // rich text (Ctrl+B / I / U / T, Ctrl+Shift+L for a bullet list), right-click for colours.
  const NOTE_BG = ['#fdf38d', '#ffc4d1', '#c7f0bf', '#c9e7ff', '#e5d4ff', '#f2f2f2'];
  const escHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const textToHtml = (s) => escHtml(s).replace(/\n/g, '<br>');
  // keep only simple formatting tags, no attributes
  function cleanHtml(html) {
    const tpl = document.createElement('template'); tpl.innerHTML = String(html || '');
    const OK = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1, BR: 1, DIV: 1, P: 1, UL: 1, OL: 1, LI: 1, SPAN: 1 };
    (function walk(node) {
      [...node.childNodes].forEach((c) => {
        if (c.nodeType === 1) {
          if (!OK[c.tagName]) { c.replaceWith(...c.childNodes); walk(node); return; }
          [...c.attributes].forEach((a) => c.removeAttribute(a.name));
          walk(c);
        } else if (c.nodeType !== 3) c.remove();
      });
    })(tpl.content);
    return tpl.innerHTML;
  }
  W._notes = { cleanHtml, textToHtml };

  W.noteWindow = function (root, ctx, noteId) {
    const { t } = ctx;
    let list = []; let saveT = null; let n = null;
    document.body.classList.add('stickyPage');
    const save = () => { clearTimeout(saveT); saveT = setTimeout(() => ctx.api.setNotes(list), 300); };
    const strip = h('div', { class: 'sStrip' });
    const ed = h('div', { class: 'sText nodrag', contenteditable: 'true', spellcheck: 'false', 'data-ph': t('notePh') });
    const menu = h('div', { class: 'sMenu nodrag' });
    const confirmBox = h('div', { class: 'sConfirm nodrag' });
    root.append(strip, ed, menu, confirmBox);

    function paintColor() {
      const c = NOTE_BG[(n.color | 0) % NOTE_BG.length];
      document.body.style.background = c;
      root.style.setProperty('--sticky', c);
    }
    function renderStrip() {
      strip.innerHTML = '';
      strip.append(
        h('button', { class: 'sBtn nodrag', title: t('newNote'), onclick: () => ctx.api.newNote() }, ic('plus')),
        h('span', { class: 'sp' }),
        h('button', { class: 'sBtn nodrag' + (n.onTop ? ' on' : ''), title: t('noteOnTop'), onclick: () => { n.onTop = !n.onTop; save(); ctx.api.setNotes(list).then(() => ctx.api.noteStyle(noteId)); renderStrip(); } }, ic('pushpin')),
        h('button', { class: 'sBtn nodrag', title: t('noteColor'), onclick: (e) => openMenu(e) }, h('span', { class: 'sSwatch' })),
        h('button', { class: 'sBtn nodrag', title: t('dockNote'), onclick: () => { clearTimeout(saveT); ctx.api.setNotes(list).then(() => ctx.api.dockNote(noteId)); } }, ic('dock')),
        h('button', { class: 'sBtn nodrag', title: t('delNote'), onclick: () => askDelete() }, ic('close')));
    }
    function openMenu(e) {
      e.preventDefault(); e.stopPropagation();
      menu.innerHTML = '';
      NOTE_BG.forEach((c, i) => menu.append(h('button', { class: 'sDot' + ((n.color | 0) === i ? ' on' : ''), style: { background: c }, title: t('noteColor'),
        onclick: () => { n.color = i; save(); paintColor(); menu.classList.remove('open'); ctx.api.setNotes(list).then(() => ctx.api.noteStyle(noteId)); } })));
      menu.classList.add('open');
    }
    function askDelete() {
      const empty = !ed.textContent.trim();
      if (empty) { ctx.api.deleteNote(noteId); return; }
      confirmBox.innerHTML = '';
      confirmBox.append(h('div', {}, t('delNoteQ')),
        h('div', { class: 'row' },
          h('button', { class: 'yes', onclick: () => ctx.api.deleteNote(noteId) }, t('yes')),
          h('button', { onclick: () => confirmBox.classList.remove('open') }, t('no'))));
      confirmBox.classList.add('open');
    }
    root.addEventListener('mousedown', (e) => { if (!menu.contains(e.target)) menu.classList.remove('open'); });
    root.addEventListener('contextmenu', (e) => { if (n) openMenu(e); });

    ed.addEventListener('input', () => { n.html = cleanHtml(ed.innerHTML); n.text = ed.innerText.replace(/\n{3,}/g, '\n\n').trim(); save(); });
    ed.addEventListener('paste', (e) => { e.preventDefault(); const txt = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, txt); });
    ed.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      const cmd = k === 'b' ? 'bold' : k === 'i' ? 'italic' : k === 'u' ? 'underline' : k === 't' ? 'strikeThrough' : (k === 'l' && e.shiftKey) ? 'insertUnorderedList' : null;
      if (k === 'n') { e.preventDefault(); ctx.api.newNote(); return; }
      if (cmd) { e.preventDefault(); document.execCommand(cmd); }
    });

    function load(l) {
      list = l || [];
      n = list.find((x) => x.id === noteId);
      if (!n) { ctx.api.closeSelf(); return; }
      paintColor(); renderStrip();
      const html = n.html ? cleanHtml(n.html) : textToHtml(n.text);
      if (ed.innerHTML !== html) ed.innerHTML = html;
    }
    ctx.api.getNotes().then((l) => { load(l); if (!ed.textContent) setTimeout(() => ed.focus(), 50); });
    ctx.sub('notes', (l) => {
      if (document.activeElement === ed && n) {   // typing here: keep our copy of this note, take the rest
        const i = (l || []).findIndex((x) => x.id === noteId);
        if (i < 0) { ctx.api.closeSelf(); return; }
        list = l; list[i] = n; return;
      }
      load(l);
    });
    ctx.cleanups.push(() => { if (saveT) { clearTimeout(saveT); ctx.api.setNotes(list); } });
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

  // ------------------------------------------------------------------ ALARM CLOCK
  // Alarms are scheduled by the main process (they ring even when this widget is hidden); this widget edits them.
  const ALARM_SOUNDS = ['classic', 'chimes', 'digital', 'gentle'];
  function fmtHM(hhmm, ctx) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || ''); if (!m) return { main: hhmm || '', ap: '' };
    const H = Number(m[1]);
    if (!ctx.s.hour12) return { main: pad2(H) + ':' + m[2], ap: '' };
    return { main: (H % 12 || 12) + ':' + m[2], ap: H >= 12 ? (ctx.lang === 'ar' ? 'م' : 'PM') : (ctx.lang === 'ar' ? 'ص' : 'AM') };
  }
  function untilText(ms, t) {
    const totalMin = Math.max(0, Math.ceil(ms / 60000));
    const d = Math.floor(totalMin / 1440); const hh = Math.floor((totalMin % 1440) / 60); const mm = totalMin % 60;
    return t('inTime')(d, hh, mm);
  }
  W.alarm = function (root, ctx) {
    const { t } = ctx;
    const mem = ctx.mem.alarm = ctx.mem.alarm || { open: null };
    let info = { alarms: [], next: null, snoozes: [], ringing: null };
    let saveT = null; let stopPreview = null;
    const card = h('div', { class: 'card alarm' }); root.append(card);
    const head = h('div', { class: 'aHead' }); const listEl = h('div', { class: 'aList nodrag' });
    card.append(tools(ctx, 'alarm'), head, listEl);
    const dayNames = (() => { const f = new Intl.DateTimeFormat(loc(ctx), { weekday: 'short' }); return [0, 1, 2, 3, 4, 5, 6].map((d) => f.format(new Date(2024, 0, 7 + d))); })();
    const chipNames = ctx.lang === 'ar' ? (() => { const f = new Intl.DateTimeFormat(loc(ctx), { weekday: 'narrow' }); return [0, 1, 2, 3, 4, 5, 6].map((d) => f.format(new Date(2024, 0, 7 + d))); })() : dayNames;
    const weekOrder = (() => { const ws = Number(ctx.s.calendar && ctx.s.calendar.weekStart) || 0; return [0, 1, 2, 3, 4, 5, 6].map((i) => (ws + i) % 7); })();
    const push = () => { clearTimeout(saveT); saveT = setTimeout(() => ctx.api.setAlarms(info.alarms).then((p) => { info.next = p.next; info.snoozes = p.snoozes; paintHead(); }), 250); };
    function daysText(a) {
      if (!a.days.length) return t('once');
      if (a.days.length === 7) return t('everyDay');
      return weekOrder.filter((d) => a.days.includes(d)).map((d) => dayNames[d]).join(' · ');
    }
    function paintHead() {
      head.innerHTML = '';
      const title = h('div', { class: 'title' }, ic('bell'), h('span', {}, t('alarms')));
      let sub;
      if (info.next) {
        const a = info.alarms.find((x) => x.id === info.next.id);
        const hm = new Intl.DateTimeFormat(loc(ctx), { hour: 'numeric', minute: '2-digit', hour12: ctx.s.hour12, weekday: new Date(info.next.at).toDateString() !== new Date().toDateString() ? 'short' : undefined }).format(new Date(info.next.at));
        sub = h('div', { class: 'aNext' }, (info.next.snooze ? t('snoozedUntil') : t('nextAlarm')) + ' ' + hm + ' · ' + untilText(info.next.at - Date.now(), t) + (a && a.label ? ' · ' + a.label : ''));
      } else sub = h('div', { class: 'aNext dim' }, t('noAlarmsOn'));
      head.append(title, sub);
      (info.snoozes || []).forEach((z) => head.append(h('div', { class: 'aSnz' }, '💤 ' + (z.label || t('alarm')) + ' · ' + new Intl.DateTimeFormat(loc(ctx), { hour: 'numeric', minute: '2-digit', hour12: ctx.s.hour12 }).format(new Date(z.at)),
        h('button', { onclick: () => ctx.api.cancelSnooze(z.id) }, t('cancel')))));
    }
    function sw(on, onchange) {
      return h('button', { class: 'aSw' + (on ? ' on' : ''), role: 'switch', 'aria-checked': String(on), onclick: (e) => { e.stopPropagation(); onchange(!on); } }, h('span'));
    }
    function stepper(val, max, onset) {
      const v = h('div', { class: 'aNum' }, pad2(val));
      const set = (x) => { const n = (x + max + 1) % (max + 1); onset(n); };
      v.addEventListener('wheel', (e) => { e.preventDefault(); set(val + (e.deltaY < 0 ? 1 : -1)); }, { passive: false });
      return h('div', { class: 'aStep' },
        h('button', { onclick: () => set(val + 1) }, '▲'), v, h('button', { onclick: () => set(val - 1) }, '▼'));
    }
    function editor(a) {
      const [H, M] = a.time.split(':').map(Number);
      const setTime = (hh, mm) => { a.time = pad2(hh) + ':' + pad2(mm); a.enabled = true; push(); renderList(); };
      const box = h('div', { class: 'aEdit' });
      const timeRow = h('div', { class: 'aTime' });
      if (ctx.s.hour12) {
        const h12 = H % 12 || 12; const pm = H >= 12;
        timeRow.append(stepper(h12, 12, (x) => { const v = x === 0 ? 12 : x; setTime((v % 12) + (pm ? 12 : 0), M); }), h('div', { class: 'aColon' }, ':'),
          stepper(M, 59, (x) => setTime(H, x)),
          h('div', { class: 'aAmPm' },
            h('button', { class: !pm ? 'on' : '', onclick: () => setTime(H % 12, M) }, ctx.lang === 'ar' ? 'ص' : 'AM'),
            h('button', { class: pm ? 'on' : '', onclick: () => setTime((H % 12) + 12, M) }, ctx.lang === 'ar' ? 'م' : 'PM')));
      } else {
        timeRow.append(stepper(H, 23, (x) => setTime(x, M)), h('div', { class: 'aColon' }, ':'), stepper(M, 59, (x) => setTime(H, x)));
      }
      box.append(timeRow);
      const quick = h('div', { class: 'aQuick' });
      [5, 10, 30, 60].forEach((m) => quick.append(h('button', { onclick: () => { const d = new Date(Date.now() + m * 60000); a.days = []; setTime(d.getHours(), d.getMinutes()); } }, '+' + (m < 60 ? m + t('minShort') : '1' + t('hourShort')))));
      box.append(quick);
      const label = h('input', { class: 'aLabel', value: a.label, placeholder: t('alarmLabelPh'), maxlength: '60', spellcheck: 'false' });
      label.addEventListener('input', () => { a.label = label.value; push(); });
      box.append(label);
      const days = h('div', { class: 'aDays' });
      weekOrder.forEach((d) => days.append(h('button', { class: a.days.includes(d) ? 'on' : '', title: dayNames[d], onclick: () => { a.days = a.days.includes(d) ? a.days.filter((x) => x !== d) : a.days.concat(d); push(); renderList(); } }, chipNames[d])));
      box.append(h('div', { class: 'aLbl' }, t('repeat') + ' · ' + daysText(a)), days);
      // sound
      const soundSel = h('select', { class: 'aSel' });
      ALARM_SOUNDS.forEach((k) => soundSel.append(h('option', { value: k, selected: a.sound === k }, t('tone.' + k))));
      if (a.file) soundSel.append(h('option', { value: 'file', selected: a.sound === 'file' }, '🎵 ' + a.fileName));
      soundSel.append(h('option', { value: '__pick' }, t('pickMusic')));
      soundSel.addEventListener('change', async () => {
        if (soundSel.value === '__pick') {
          const r = await ctx.api.pickAlarmSound();
          if (r) { a.file = r.file; a.fileName = r.fileName; a.sound = 'file'; }
          push(); renderList(); return;
        }
        a.sound = soundSel.value; push();
      });
      const prev = h('button', { class: 'aPrev', title: t('preview') }, ic(stopPreview ? 'stop' : 'play'));
      prev.addEventListener('click', () => {
        if (stopPreview) { stopPreview(); stopPreview = null; prev.replaceChildren(ic('play')); return; }
        stopPreview = window.ChronoSound.play({ sound: a.sound, file: a.file, volume: a.volume, rampUp: false });
        prev.replaceChildren(ic('stop'));
        const mine = stopPreview;
        setTimeout(() => { if (stopPreview === mine) { stopPreview(); stopPreview = null; prev.replaceChildren(ic('play')); } }, 6000);
      });
      box.append(h('div', { class: 'aLbl' }, t('sound')), h('div', { class: 'aRow' }, soundSel, prev));
      const vol = h('input', { type: 'range', min: '5', max: '100', value: String(Math.round(a.volume * 100)), class: 'aVol' });
      vol.addEventListener('input', () => { a.volume = Number(vol.value) / 100; push(); });
      const snz = h('select', { class: 'aSel small' });
      [1, 3, 5, 10, 15, 20, 30].forEach((m) => snz.append(h('option', { value: String(m), selected: a.snooze === m }, m + ' ' + t('minShort'))));
      snz.addEventListener('change', () => { a.snooze = Number(snz.value); push(); });
      const ramp = h('label', { class: 'aChk' }, h('input', { type: 'checkbox', checked: a.rampUp }), h('span', {}, t('rampUp')));
      ramp.querySelector('input').addEventListener('change', (e) => { a.rampUp = e.target.checked; push(); });
      box.append(h('div', { class: 'aRow' }, h('span', { class: 'aLbl inline' }, t('volume')), vol),
        h('div', { class: 'aRow' }, h('span', { class: 'aLbl inline' }, t('snooze')), snz, ramp));
      box.append(h('div', { class: 'aRow end' },
        h('button', { class: 'aDel', onclick: () => { info.alarms = info.alarms.filter((x) => x.id !== a.id); mem.open = null; push(); renderList(); } }, ic('trash'), h('span', {}, t('delete'))),
        h('button', { class: 'aDone', onclick: () => { mem.open = null; if (stopPreview) { stopPreview(); stopPreview = null; } renderList(); } }, t('done'))));
      return box;
    }
    function renderList() {
      listEl.innerHTML = '';
      const sorted = info.alarms.slice().sort((x, y) => x.time.localeCompare(y.time));
      if (!sorted.length) listEl.append(h('div', { class: 'aEmpty' }, t('noAlarms')));
      sorted.forEach((a) => {
        const f = fmtHM(a.time, ctx);
        const row = h('div', { class: 'aItem' + (a.enabled ? '' : ' off') + (info.ringing === a.id ? ' ringing' : '') + (mem.open === a.id ? ' open' : '') });
        const top = h('div', { class: 'aTop', onclick: () => { mem.open = mem.open === a.id ? null : a.id; renderList(); } },
          h('div', { class: 'aClock' }, h('span', { class: 'hm' }, f.main), f.ap ? h('span', { class: 'ap' }, f.ap) : null),
          h('div', { class: 'aMeta' }, h('div', { class: 'aName' }, a.label || t('alarm')), h('div', { class: 'aDaysTxt' }, daysText(a) + (a.sound === 'file' ? ' · 🎵' : ''))),
          sw(a.enabled, (v) => { a.enabled = v; push(); renderList(); }));
        row.append(top);
        if (mem.open === a.id) row.append(editor(a));
        listEl.append(row);
      });
      listEl.append(h('button', { class: 'aAdd', onclick: () => {
        const d = new Date(Date.now() + 60 * 60000); d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5 % 60);
        const a = { id: 'a' + Date.now().toString(36), time: pad2(d.getHours()) + ':' + pad2(d.getMinutes()), label: '', days: [], enabled: true, sound: 'classic', file: '', fileName: '', volume: 0.8, snooze: 5, rampUp: true };
        info.alarms.push(a); mem.open = a.id; push(); renderList();
      } }, ic('plus'), h('span', {}, t('addAlarm'))));
      paintHead();
    }
    function apply(p) { info = Object.assign(info, p); info.alarms = (p.alarms || []).map((x) => Object.assign({}, x)); renderList(); }
    ctx.api.getAlarms().then(apply);
    ctx.sub('alarms', (p) => {
      const a = document.activeElement;
      if (mem.open && a && card.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'SELECT')) { info.next = p.next; info.snoozes = p.snoozes; info.ringing = p.ringing; paintHead(); return; }
      apply(p);
    });
    ctx.every(20000, paintHead);
    ctx.cleanups.push(() => { if (stopPreview) stopPreview(); if (saveT) { clearTimeout(saveT); ctx.api.setAlarms(info.alarms); } });
  };

  // Ringing banner window (bottom-right, above the notification area).
  W.ringWindow = function (root, ctx) {
    const { t } = ctx;
    document.body.classList.add('ringPage');
    let stop = null;
    const card = h('div', { class: 'card ring' }); root.append(card);
    ctx.api.ringInfo().then((r) => {
      if (!r) { ctx.api.closeSelf(); return; }
      const a = r.alarm;
      const now = new Date();
      card.append(
        h('div', { class: 'rIcon' }, ic('bell')),
        h('div', { class: 'rMain' },
          h('div', { class: 'rLabel' }, (a.label || t('alarm')) + (r.snooze ? ' · ' + t('snoozeAgain') : '')),
          h('div', { class: 'rTime' }, new Intl.DateTimeFormat(loc(ctx), { hour: 'numeric', minute: '2-digit', hour12: ctx.s.hour12 }).format(now)),
          h('div', { class: 'rBtns nodrag' },
            h('button', { class: 'rSnooze', onclick: () => ctx.api.ringSnooze() }, '💤 ' + t('snooze') + ' ' + a.snooze + ' ' + t('minShort')),
            h('button', { class: 'rStop', onclick: () => ctx.api.ringStop() }, t('stop')))));
      stop = window.ChronoSound.play({ sound: a.sound, file: a.file, volume: a.volume, rampUp: a.rampUp });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') ctx.api.ringStop(); });
    });
    ctx.cleanups.push(() => { if (stop) stop(); });
    window.addEventListener('beforeunload', () => { if (stop) stop(); });
  };

  window.Widgets = W;
  window.ChronoUI = { h, ic, NOTE_COLORS };
})();
