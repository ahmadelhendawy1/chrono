/* Chrono settings window */
(async function () {
  'use strict';
  const api = window.chrono;
  let s = await api.getSettings();
  let t = window.makeT(s.lang);
  const q = new URLSearchParams(location.search);
  let tab = q.get('tab') || 'general';
  const appVersion = api.version ? await api.version() : '';
  const TABS = ['general', 'widgets', 'location', 'weather', 'clock', 'calendar', 'world', 'prayer', 'about'];
  const TAB_KEY = { general: 'sGeneral', widgets: 'sWidgets', location: 'sLocation', weather: 'sWeather', clock: 'sClock', calendar: 'sCalendar', world: 'sWorld', prayer: 'sPrayer', about: 'sAbout' };
  const WIDGETS = ['analog', 'weather', 'prayer', 'calendar', 'digital', 'world', 'notes', 'calc'];
  const FACE_NAMES = ['Classic', 'Railway', 'Black', 'Gold', 'Roman', 'Navy', 'Arabic', 'Islamic', 'Walnut', 'Classroom'];
  const CITIES = [
    ['Cairo', 'Africa/Cairo'], ['Alexandria', 'Africa/Cairo'], ['Makkah', 'Asia/Riyadh'], ['Riyadh', 'Asia/Riyadh'], ['Dubai', 'Asia/Dubai'], ['Doha', 'Asia/Qatar'], ['Kuwait', 'Asia/Kuwait'],
    ['Amman', 'Asia/Amman'], ['Istanbul', 'Europe/Istanbul'], ['London', 'Europe/London'], ['Paris', 'Europe/Paris'], ['Berlin', 'Europe/Berlin'], ['Moscow', 'Europe/Moscow'],
    ['New York', 'America/New_York'], ['Chicago', 'America/Chicago'], ['Los Angeles', 'America/Los_Angeles'], ['Toronto', 'America/Toronto'], ['Sao Paulo', 'America/Sao_Paulo'],
    ['Karachi', 'Asia/Karachi'], ['Delhi', 'Asia/Kolkata'], ['Dhaka', 'Asia/Dhaka'], ['Jakarta', 'Asia/Jakarta'], ['Singapore', 'Asia/Singapore'], ['Beijing', 'Asia/Shanghai'],
    ['Tokyo', 'Asia/Tokyo'], ['Sydney', 'Australia/Sydney'], ['Johannesburg', 'Africa/Johannesburg'], ['Lagos', 'Africa/Lagos']
  ];

  // ----------------------------------------------------------- tiny DOM helpers
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const k of Object.keys(props || {})) {
      const v = props[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => { if (c !== undefined && c !== null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  }
  const fld = (label, control, hint) => h('div', { class: 'fld' }, h('div', { class: 'lbl' }, label, hint ? h('small', {}, hint) : null), control);
  const toggle = (val, cb) => { const b = h('button', { class: 'sw' + (val ? ' on' : ''), role: 'switch', 'aria-checked': String(!!val), onclick: () => { b.classList.toggle('on'); cb(b.classList.contains('on')); b.setAttribute('aria-checked', String(b.classList.contains('on'))); } }); return b; };
  const seg = (opts, val, cb) => { const wrap = h('div', { class: 'seg' }); opts.forEach(([v, label]) => wrap.append(h('button', { class: v === val ? 'on' : '', onclick: () => { [...wrap.children].forEach((c) => c.classList.remove('on')); wrap.querySelector(`[data-v="${v}"]`).classList.add('on'); cb(v); }, 'data-v': String(v) }, label))); return wrap; };
  const select = (opts, val, cb) => { const el = h('select', { onchange: () => cb(el.value) }); opts.forEach(([v, l]) => el.append(h('option', { value: v, selected: String(v) === String(val) }, l))); return el; };
  const slider = (min, max, step, val, fmt, cb) => {
    const out = h('span', { style: 'min-width:46px;text-align:end;color:var(--txt2)' }, fmt(val));
    const r = h('input', { type: 'range', min, max, step, value: val });
    r.addEventListener('input', () => { out.textContent = fmt(Number(r.value)); });
    r.addEventListener('change', () => cb(Number(r.value)));
    return h('div', { style: 'display:flex;align-items:center;gap:10px' }, r, out);
  };

  async function patch(p, rerender) {
    s = await api.patch(p);
    if (rerender) render();
  }

  // ----------------------------------------------------------- tabs
  function tabGeneral() {
    return [
      h('h2', {}, t('sGeneral')),
      h('div', { class: 'group' },
        fld(t('language'), seg([['en', 'English'], ['ar', 'العربية']], s.lang, async (v) => { await patch({ lang: v }); t = window.makeT(v); document.body.dir = v === 'ar' ? 'rtl' : 'ltr'; render(); })),
        fld(t('theme'), seg([['glass', t('themeGlass')], ['dark', t('themeDark')], ['light', t('themeLight')]], s.theme, (v) => patch({ theme: v }))),
        fld(t('layout'), seg([['bar', t('layoutBar')], ['free', t('layoutFree')]], s.mode, (v) => patch({ mode: v }, true))),
        fld(t('pinned'), toggle(s.pinned !== false, (v) => patch({ pinned: v }, true)), t('pinnedHelp')),
        (s.mode === 'bar' || s.pinned === false) ? fld(s.mode === 'bar' ? t('barSide') : t('edgeSide'), seg([['right', t('right')], ['left', t('left')]], s.barSide, (v) => patch({ barSide: v }))) : null,
        fld(t('alwaysTop'), toggle(s.alwaysOnTop, (v) => patch({ alwaysOnTop: v }))),
        fld(t('lock'), toggle(s.locked, (v) => patch({ locked: v }))),
        fld(t('autostart'), toggle(s.autostart, (v) => patch({ autostart: v }))),
        s.mode === 'bar' ? fld(t('barFit'), toggle(s.barAutoFit, (v) => patch({ barAutoFit: v }))) : null,
        fld(t('hour12'), toggle(s.hour12, (v) => patch({ hour12: v }))),
        fld(t('opacity'), slider(25, 100, 5, Math.round(s.opacity * 100), (v) => v + '%', (v) => patch({ opacity: v / 100 }))),
        fld(t('scale'), slider(70, 160, 10, Math.round(s.scale * 100), (v) => v + '%', (v) => patch({ scale: v / 100 })))),
      h('h2', { style: 'font-size:18px;margin-top:6px' }, t('widgetLang')), h('p', { class: 'sub' }, t('widgetLangHelp')),
      h('div', { class: 'group' }, ['weather', 'prayer', 'calendar', 'analog', 'digital', 'world'].map((id) =>
        fld(t(id), seg([['', t('auto')], ['en', 'English'], ['ar', 'العربية']], (s.widgetLang || {})[id] || '', (v) => patch({ widgetLang: { [id]: v } }))))),
      h('button', { class: 'btn ghost', onclick: async () => { if (confirm(t('resetConfirm'))) { s = await api.reset(); t = window.makeT(s.lang); document.body.dir = s.lang === 'ar' ? 'rtl' : 'ltr'; render(); } } }, t('reset'))
    ];
  }

  function tabWidgets() {
    const list = h('div', { class: 'wlist' });
    s.order.forEach((id, i) => {
      list.append(h('div', { class: 'item' },
        h('div', { class: 'moveBtns' },
          h('button', { disabled: i === 0, title: t('moveUp'), onclick: () => { const o = s.order.slice(); [o[i - 1], o[i]] = [o[i], o[i - 1]]; patch({ order: o }, true); } }, '▲'),
          h('button', { disabled: i === s.order.length - 1, title: t('moveDown'), onclick: () => { const o = s.order.slice(); [o[i + 1], o[i]] = [o[i], o[i + 1]]; patch({ order: o }, true); } }, '▼')),
        h('div', { class: 'lbl' }, t(id), h('small', {}, t('desc.' + id))),
        toggle(s.enabled[id], (v) => patch({ enabled: { [id]: v } }))));
    });
    const sizes = h('div', { class: 'group' });
    s.order.forEach((id) => {
      const cur = Math.round(((s.widgetScale || {})[id] || 1) * 100);
      const r = slider(40, 200, 5, cur, (v) => v + '%', (v) => patch({ widgetScale: { [id]: v / 100 } }));
      sizes.append(fld(t(id), h('div', { style: 'display:flex;gap:8px;align-items:center' }, r, h('button', { class: 'btn ghost small', onclick: () => patch({ widgetScale: { [id]: 1 } }, true) }, t('reset100')))));
    });
    return [h('h2', {}, t('sWidgets')), h('p', { class: 'sub' }, t('widgetsHelp')), h('div', { class: 'group' }, list),
      h('h2', { style: 'font-size:18px;margin-top:8px' }, t('widgetSizes')), h('p', { class: 'sub' }, t('widgetSizesHelp')), sizes];
  }

  function citySearchBox(onPick, btnLabel) {
    const input = h('input', { type: 'search', placeholder: t('searchCity') });
    const out = h('div', { class: 'results' });
    async function go() {
      const v = input.value.trim(); if (!v) return;
      out.textContent = t('loading');
      const r = await api.geo(v, s.lang);
      out.innerHTML = '';
      if (r && r.error) { out.append(h('div', { class: 'note' }, t('searchFailed'))); return; }
      if (!r || !r.length) { out.append(h('div', { class: 'note' }, t('noResults'))); return; }
      r.forEach((c) => out.append(h('div', { class: 'res' }, h('div', {}, c.name, h('div', {}, h('small', {}, `${c.lat.toFixed(2)}, ${c.lon.toFixed(2)} · ${c.tz || ''}`))), h('button', { class: 'btn small', onclick: () => onPick(c) }, btnLabel))));
    }
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    return h('div', {}, h('div', { class: 'row2' }, input, h('button', { class: 'btn', onclick: go }, t('search'))), out);
  }

  function tabLocation() {
    const L = s.location;
    return [
      h('h2', {}, t('sLocation')),
      h('p', { class: 'sub' }, t('prayerNote')),
      h('div', { class: 'group' },
        h('div', { class: 'cur' }, h('div', {}, h('small', {}, t('current')), h('b', {}, L.name), h('small', {}, `${Number(L.lat).toFixed(4)}, ${Number(L.lon).toFixed(4)} · ${L.tz || ''}`))),
        citySearchBox(async (c) => {
          // also remember the Arabic spelling so Arabic widgets show it
          let ar = '';
          try { const r = await api.geo(c.short, 'ar'); const m = Array.isArray(r) ? r.find((x) => Math.abs(x.lat - c.lat) < 0.05 && Math.abs(x.lon - c.lon) < 0.05) : null; ar = m ? m.short : ''; } catch (e) { /* offline: fine */ }
          patch({ location: { name: c.name, short: c.short, ar, lat: c.lat, lon: c.lon, tz: c.tz } }, true);
        }, t('setLoc')))
    ];
  }

  function tabWeather() {
    return [
      h('h2', {}, t('sWeather')),
      h('div', { class: 'group' },
        fld(t('units'), seg([['c', t('celsius')], ['f', t('fahrenheit')]], s.units, (v) => patch({ units: v }))),
        fld(t('forecastDays'), seg([[5, t('days5')], [8, t('days8')]], s.weather.days, (v) => patch({ weather: { days: v } }))),
        fld(t('wLayout'), seg([['full', t('wFull')], ['strip', t('wStrip')]], s.weather.layout, (v) => patch({ weather: { layout: v } }))),
        fld(t('refreshNow'), h('button', { class: 'btn', onclick: () => api.refreshWeather() }, t('refresh')))),
      h('p', { class: 'note' }, t('dataBy'), ' · ', t('sLocation') + ': ' + s.location.name)
    ];
  }

  function tabClock() {
    const faces = h('div', { class: 'grid' });
    FACE_NAMES.forEach((n, i) => faces.append(h('button', { class: 'faceBtn' + (s.clock.face === i ? ' on' : ''), title: n, onclick: () => patch({ clock: { face: i } }, true) }, h('img', { src: `assets/dials/f${i}.webp`, alt: n }))));
    const digs = h('div', { class: 'digGrid' });
    for (let i = 0; i < 6; i++) digs.append(h('button', { class: 'digBtn' + (s.clock.digitalStyle === i ? ' on' : ''), onclick: () => patch({ clock: { digitalStyle: i } }, true) }, h('div', { class: `digital ds${i} mini` }, h('span', { class: 'tm' }, '10:42'))));
    return [
      h('h2', {}, t('sClock')),
      h('div', { class: 'group' }, h('div', { class: 'fld' }, h('div', { class: 'lbl' }, t('face'))), faces,
        fld(t('showSeconds'), toggle(s.clock.seconds, (v) => patch({ clock: { seconds: v } }))),
        fld(t('sweep'), toggle(s.clock.sweep, (v) => patch({ clock: { sweep: v } }))),
        fld(t('showDate'), toggle(s.clock.showDate, (v) => patch({ clock: { showDate: v } })))),
      h('div', { class: 'group' }, h('div', { class: 'fld' }, h('div', { class: 'lbl' }, t('digStyle'))), digs,
        fld(t('showSeconds'), toggle(s.clock.digitalSeconds, (v) => patch({ clock: { digitalSeconds: v } }))),
        fld(t('showAmPm'), toggle(s.clock.digitalAmPm, (v) => patch({ clock: { digitalAmPm: v } }))),
        fld(t('showHijri'), toggle(s.clock.digitalHijri, (v) => patch({ clock: { digitalHijri: v } }))))
    ];
  }

  function tabCalendar() {
    return [
      h('h2', {}, t('sCalendar')),
      h('div', { class: 'group' },
        fld(t('weekStart'), seg([[6, t('sat')], [0, t('sun')], [1, t('mon')]], s.calendar.weekStart, (v) => patch({ calendar: { weekStart: v } }))),
        fld(t('showHijriCal'), toggle(s.calendar.hijri, (v) => patch({ calendar: { hijri: v } }))),
        fld(t('hijriOffset'), seg([[-2, '−2'], [-1, '−1'], [0, '0'], [1, '+1'], [2, '+2']], s.calendar.hijriOffset, (v) => patch({ calendar: { hijriOffset: v } })))),
      h('p', { class: 'note' }, t('hijriNote'))
    ];
  }

  function tabWorld() {
    const list = h('div', { class: 'wlist' });
    (s.world.cities || []).forEach((c, i) => list.append(h('div', { class: 'item' }, h('div', { class: 'lbl' }, c.name, h('small', {}, c.tz)), h('button', { class: 'btn ghost small', onclick: () => { const cs = s.world.cities.slice(); cs.splice(i, 1); patch({ world: { cities: cs } }, true); } }, t('remove')))));
    const quick = select([['', t('addCity') + '…'], ...CITIES.map(([n, z]) => [n + '|' + z, n])], '', (v) => {
      if (!v) return; const [name, tz] = v.split('|');
      patch({ world: { cities: [...s.world.cities, { name, tz }] } }, true);
    });
    return [
      h('h2', {}, t('sWorld')),
      h('div', { class: 'group' }, fld(t('worldSeconds'), toggle(s.world.seconds, (v) => patch({ world: { seconds: v } })))),
      h('div', { class: 'group' }, h('div', { class: 'fld' }, h('div', { class: 'lbl' }, t('yourCities')), quick), list,
        citySearchBox((c) => { if (!c.tz) return; patch({ world: { cities: [...s.world.cities, { name: c.short, tz: c.tz }] } }, true); }, t('addCity')))
    ];
  }

  function tabPrayer() {
    const holder = h('div', {});
    const methodSel = h('select', { onchange: () => patch({ prayer: { method: methodSel.value } }) });
    api.prayer(0).then((r) => {
      Object.entries(r.methods).forEach(([k, n]) => methodSel.append(h('option', { value: k, selected: k === s.prayer.method }, n)));
    });
    const adj = h('div', { class: 'adj' });
    ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach((k) => {
      const inp = h('input', { type: 'number', min: -30, max: 30, step: 1, value: s.prayer.adjust[k] || 0 });
      inp.addEventListener('change', () => patch({ prayer: { adjust: { [k]: Math.max(-30, Math.min(30, parseInt(inp.value, 10) || 0)) } } }));
      adj.append(h('label', {}, t('pray.' + k), inp));
    });
    holder.append(
      h('h2', {}, t('sPrayer')), h('p', { class: 'sub' }, t('prayerNote')),
      h('div', { class: 'group' },
        fld(t('pLayout'), seg([['full', t('pFull')], ['next', t('pNext')]], s.prayer.layout || 'full', (v) => patch({ prayer: { layout: v } }))),
        fld(t('method'), methodSel),
        fld(t('asr'), seg([['standard', t('asrStd')], ['hanafi', t('asrHanafi')]], s.prayer.asr, (v) => patch({ prayer: { asr: v } }))),
        h('div', { class: 'fld' }, h('div', { class: 'lbl' }, t('adjust'))), adj,
        fld(t('notify'), toggle(s.prayer.notify, (v) => patch({ prayer: { notify: v } }))),
        fld(t('remind'), select([[0, t('off')], [5, '5 ' + t('minutes')], [10, '10 ' + t('minutes')], [15, '15 ' + t('minutes')], [20, '20 ' + t('minutes')]], s.prayer.remindBefore, (v) => patch({ prayer: { remindBefore: Number(v) } }))),
        fld(t('showSunrise'), toggle(s.prayer.showSunrise, (v) => patch({ prayer: { showSunrise: v } }))),
        fld(t('showQibla'), toggle(s.prayer.showQibla, (v) => patch({ prayer: { showQibla: v } })))),
      h('p', { class: 'note' }, t('sLocation') + ': ', h('span', { class: 'pill' }, s.location.name))
    );
    return [holder];
  }

  function tabAbout() {
    return [
      h('h2', {}, 'Chrono'), h('p', { class: 'sub' }, t('aboutText')),
      h('div', { class: 'group' }, h('div', { class: 'fld' }, h('div', { class: 'lbl' }, 'Version', h('small', {}, appVersion)))),
      h('p', { class: 'note' }, t('tray')), h('p', { class: 'note' }, t('dataBy'))
    ];
  }

  const RENDER = { general: tabGeneral, widgets: tabWidgets, location: tabLocation, weather: tabWeather, clock: tabClock, calendar: tabCalendar, world: tabWorld, prayer: tabPrayer, about: tabAbout };

  function render() {
    document.body.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = s.lang;
    document.title = 'Chrono – ' + t('settings');
    const nav = document.getElementById('nav'); nav.innerHTML = '';
    nav.append(h('div', { class: 'brand' }, h('img', { src: 'assets/icon.png', alt: '' }), 'Chrono'));
    TABS.forEach((k) => nav.append(h('button', { class: k === tab ? 'on' : '', onclick: () => { tab = k; render(); } }, t(TAB_KEY[k]))));
    const panel = document.getElementById('panel'); const top = panel.scrollTop; panel.innerHTML = '';
    RENDER[tab]().flat().forEach((n) => n && panel.append(n));
    panel.scrollTop = top;
  }

  api.onSettings((ns, from) => {
    s = ns;
    if (from === api.id) return;
    t = window.makeT(s.lang);
    const a = document.activeElement;
    if (!(a && (a.tagName === 'INPUT' || a.tagName === 'SELECT'))) render();
  });
  api.onSettingsTab((k) => { if (TABS.includes(k)) { tab = k; render(); } else { tab = ({ analog: 'clock', digital: 'clock', notes: 'widgets', calc: 'widgets' })[k] || 'general'; if (k === 'weather') tab = 'weather'; if (k === 'prayer') tab = 'prayer'; if (k === 'calendar') tab = 'calendar'; if (k === 'world') tab = 'world'; render(); } });
  if (!TABS.includes(tab)) tab = ({ analog: 'clock', digital: 'clock', notes: 'widgets', calc: 'widgets' })[tab] || 'general';
  render();
})();
