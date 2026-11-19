/* Chrono host: loads settings, mounts widgets into widget.html / bar.html / note.html and keeps them in sync. */
(async function () {
  'use strict';
  const api = window.chrono;
  const q = new URLSearchParams(location.search);
  const page = document.body.dataset.page; // widget | bar | note
  const bar = page === 'bar';
  let s = await api.getSettings();

  const mem = {};
  const subs = { weather: new Set(), weatherError: new Set(), notes: new Set(), calc: new Set(), alarms: new Set() };
  api.onWeather((d) => subs.weather.forEach((f) => f(d)));
  api.onWeatherError((e) => subs.weatherError.forEach((f) => f(e)));
  api.onNotes((l) => subs.notes.forEach((f) => f(l)));
  if (api.onCalc) api.onCalc((d) => subs.calc.forEach((f) => f(d)));
  if (api.onAlarms) api.onAlarms((d) => subs.alarms.forEach((f) => f(d)));

  let mounted = []; // [{ cleanups }]
  let panelOpen = false; // bar: the widget on/off panel survives re-renders
  const ALL_WIDGETS = ['analog', 'weather', 'prayer', 'calendar', 'digital', 'world', 'alarm', 'notes', 'calc'];
  const LANG_WIDGETS = ['weather', 'prayer', 'calendar', 'analog', 'digital', 'world'];
  function langFor(id) { const o = (s.widgetLang || {})[id]; return o === 'ar' || o === 'en' ? o : s.lang; }
  function makeCtx(id) {
    const cleanups = [];
    const lang = langFor(id);
    return {
      s, t: window.makeT(lang), api, lang, bar, mem, cleanups, id,
      every(ms, fn) { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); },
      raf(fn) { let on = true; const loop = () => { if (!on) return; fn(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); cleanups.push(() => { on = false; }); },
      sub(kind, fn) { subs[kind].add(fn); cleanups.push(() => subs[kind].delete(fn)); }
    };
  }
  function teardown() { mounted.forEach((m) => m.cleanups.forEach((c) => { try { c(); } catch (e) { /* ignore */ } })); mounted = []; }

  function applyBody() {
    const b = document.body;
    b.dataset.theme = s.theme;
    b.dir = s.lang === 'ar' ? 'rtl' : 'ltr';
    b.classList.toggle('locked', !!s.locked);
    document.documentElement.style.setProperty('--a', String(Math.min(1, Math.max(0.25, Number(s.opacity) || 0.92))));
  }

  const root = document.getElementById('root');

  function mountWidget(id, into) {
    const ctx = makeCtx(id);
    mounted.push(ctx);
    into.dir = ctx.lang === 'ar' ? 'rtl' : 'ltr';
    try {
      if (id === 'note') window.Widgets.noteWindow(into, ctx, q.get('id'));
      else if (id === 'ring') window.Widgets.ringWindow(into, ctx);
      else window.Widgets[id](into, ctx);
    } catch (e) {
      console.error('widget failed', id, e);
      into.append(Object.assign(document.createElement('div'), { className: 'card', textContent: id + ': ' + e.message, style: 'padding:12px;color:#fff' }));
    }
  }

  function mountAll() {
    teardown();
    root.innerHTML = '';
    applyBody();
    if (page === 'widget') {
      mountWidget(q.get('w'), root);
    } else if (page === 'ring') {
      mountWidget('ring', root);
    } else if (page === 'note') {
      mountWidget('note', root);
    } else {
      const t = window.makeT(s.lang);
      const { h, ic } = window.ChronoUI;
      const scroll = h('div', { id: 'barScroll', class: 'scroll' });
      const top = h('div', { class: 'barTop' },
        h('span', { class: 'title' }, 'Chrono'),
        h('span', { class: 'row' },
          h('button', { class: 'pinBtn' + (s.pinned !== false ? ' on' : ''), title: s.pinned !== false ? t('unpinTip') : t('pinTip'), onclick: () => api.patch({ pinned: s.pinned === false }) }, ic('pushpin')),
          h('button', { class: panelOpen ? 'on' : '', title: t('widgetsMenu'), onclick: () => { panelOpen = !panelOpen; mountAll(); } }, ic('grid')),
          h('button', { title: t('settings'), onclick: () => api.openSettings() }, ic('gear')),
          h('button', { title: '', onclick: () => api.collapseBar(true) }, ic(s.barSide === 'left' ? 'chevL' : 'chevR'))));
      scroll.append(top);
      if (panelOpen) {
        // one switch per widget: turn any closed widget back on with a single click
        const panel = h('div', { class: 'wPanel' }, h('div', { class: 'wpTitle' }, t('widgetsMenu')));
        ALL_WIDGETS.forEach((id) => {
          const on = !!s.enabled[id];
          panel.append(h('button', { class: 'wpRow' + (on ? ' on' : ''), role: 'switch', 'aria-checked': String(on),
            onclick: () => api.patch({ enabled: { [id]: !on } }) }, h('span', {}, t(id)), h('span', { class: 'wpSw' })));
        });
        scroll.append(panel);
      }
      const inner = h('div', { id: 'barInner' });
      const order = (s.order || []).filter((id) => s.enabled[id] && !(s.detached || {})[id]);
      if (!order.length && !panelOpen) inner.append(h('button', { class: 'wpEmpty', onclick: () => { panelOpen = true; mountAll(); } }, ic('plus'), h('span', {}, t('noWidgets'))));
      order.forEach((id) => {
        const z = Math.min(1, Math.max(0.4, Number((s.widgetScale || {})[id]) || 1));
        const slot = h('div', { class: 'slot', 'data-id': id });
        if (z !== 1) slot.style.zoom = String(z);
        inner.append(slot); mountWidget(id, slot);
      });
      scroll.append(inner);
      fitBar(inner, scroll);
      const handle = h('button', { id: 'handle', onclick: () => api.collapseBar(false) }, ic(s.barSide === 'left' ? 'chevR' : 'chevL'));
      root.append(scroll, handle);
    }
  }


  // Bar: if everything is taller than the screen, shrink the whole column so it fits (no hidden widgets).
  let fitObserver = null; let fitHandler = null;
  function fitBar(inner, scroll) {
    if (fitObserver) fitObserver.disconnect();
    if (fitHandler) window.removeEventListener('resize', fitHandler);
    inner.style.zoom = '1';
    let cur = 1;
    // keep the "Chrono" header (and the widgets panel) exactly as wide as the widget column under it
    const alignTop = () => {
      const cards = [...inner.querySelectorAll('.slot > *')];
      const w = cards.length ? Math.max(...cards.map((c) => c.getBoundingClientRect().width)) : 0;
      const width = Math.round(Math.max(w || 340 * cur, 200));
      scroll.querySelectorAll('.barTop, .wPanel').forEach((el) => { el.style.width = width + 'px'; el.style.boxSizing = 'border-box'; });
    };
    if (!s.barAutoFit) {
      const ro = new ResizeObserver(() => requestAnimationFrame(alignTop)); ro.observe(inner);
      fitObserver = ro; alignTop(); return;
    }
    const apply = () => {
      const natural = inner.getBoundingClientRect().height / cur;
      const topEl = scroll.firstChild;
      const top = topEl ? topEl.getBoundingClientRect().height + 8 : 40;
      const avail = window.innerHeight - top - 8;
      const z = natural > avail && natural > 0 ? Math.max(0.35, avail / natural) : 1;
      if (Math.abs(z - cur) > 0.005) { cur = z; inner.style.zoom = String(z); }
      alignTop();
    };
    let raf = 0;
    const schedule = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; apply(); }); };
    fitHandler = schedule;
    fitObserver = new ResizeObserver(schedule);
    fitObserver.observe(inner);
    window.addEventListener('resize', schedule);
    apply();
  }

  // Ctrl + mouse wheel over a widget resizes just that widget.
  let wheelAcc = 0; let wheelTimer = null; let wheelId = null;
  window.addEventListener('wheel', (e) => {
    const onGrip = page === 'widget' && e.target.closest && e.target.closest('.rsGrip');
    if (!e.ctrlKey && !onGrip) return;
    e.preventDefault();
    const slotEl = e.target.closest ? e.target.closest('.slot') : null;
    const id = page === 'widget' ? q.get('w') : (slotEl ? slotEl.dataset.id : null);
    if (!id) return;
    if (wheelId !== id) { wheelAcc = 0; wheelId = id; }
    wheelAcc += e.deltaY < 0 ? 0.05 : -0.05;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      const cur = Number((s.widgetScale || {})[id]) || 1;
      const next = Math.round(Math.min(2, Math.max(0.4, cur + wheelAcc)) * 100) / 100;
      wheelAcc = 0;
      if (next !== cur) api.patch({ widgetScale: { [id]: next } });
    }, 180);
  }, { passive: false });

  api.onSettings((ns, from) => {
    s = ns;
    mountAll();
  });

  document.body.classList.toggle('bar', bar);
  if (bar) document.body.classList.add(q.get('side') === 'left' ? 'side-left' : 'side-right');
  mountAll();

  if (bar) {
    const st = await api.getState();
    document.body.classList.toggle('collapsed', !!st.barCollapsed);
    api.onBarCollapsed((c) => document.body.classList.toggle('collapsed', !!c));
  } else if (page === 'widget') {
    // corner grip: drag out to grow, in to shrink (or scroll the wheel over it)
    const wid = q.get('w');
    const grip = document.createElement('div');
    grip.className = 'rsGrip'; grip.title = window.makeT(s.lang)('resizeTip');
    grip.innerHTML = '<svg viewBox="0 0 16 16"><path d="M15 6L6 15M15 10.5L10.5 15M15 14.5L14.5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>';
    document.body.append(grip);
    let dragging = false;
    grip.addEventListener('pointerdown', (e) => { if (s.locked) return; e.preventDefault(); dragging = true; grip.setPointerCapture(e.pointerId); document.body.classList.add('resizing'); api.resizeStart(wid); });
    const end = () => { if (!dragging) return; dragging = false; document.body.classList.remove('resizing'); api.resizeEnd(wid); };
    grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end); grip.addEventListener('lostpointercapture', end);
    // Move the widget: press anywhere on it and drag (past a few pixels, so plain clicks still work).
    // The main process follows the real cursor, so it works the same at every zoom level.
    if (!s.locked) {
      const NO_GRAB = 'input, textarea, select, [contenteditable="true"], .rsGrip';
      let down = null; let moving = false;
      document.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || (e.target.closest && e.target.closest(NO_GRAB))) return;
        const sc = e.target.closest && e.target.closest('.scroll, .aList, .iList, .hWrap, .nList');
        if (sc && sc.scrollHeight > sc.clientHeight && e.offsetX >= sc.clientWidth - 2 && e.target === sc) return;   // its scrollbar
        down = { x: e.screenX, y: e.screenY, id: e.pointerId, el: e.target };
        api.dragArm();   // main notes the exact cursor + window position at the press
      }, true);
      document.addEventListener('pointermove', (e) => {
        if (!down || moving) return;
        if (Math.abs(e.screenX - down.x) + Math.abs(e.screenY - down.y) < 5) return;
        moving = true;
        try { down.el.setPointerCapture(down.id); } catch (err) { /* element gone */ }
        document.body.classList.add('moving');
        api.dragStart();
      }, true);
      const up = () => {
        if (moving) {
          api.dragEnd();
          document.body.classList.remove('moving');
          const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };   // a drag is not a click
          window.addEventListener('click', swallow, true);
          setTimeout(() => window.removeEventListener('click', swallow, true), 0);
        }
        down = null; moving = false;
      };
      document.addEventListener('pointerup', up, true);
      document.addEventListener('pointercancel', up, true);
      window.addEventListener('blur', () => { if (moving) up(); });
    }
    const report = () => api.resize(root.offsetWidth, root.offsetHeight);
    new ResizeObserver(report).observe(root);
    report();
  }
})();
