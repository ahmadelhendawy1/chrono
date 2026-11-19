'use strict';
// Dev-only: Windows 7 style sidebar - one shared width, size S/M/L, auto-fit on add/remove, window hugs the column.
const { app, BrowserWindow, screen } = require('electron');
const fs = require('fs'); const path = require('path');
const dir = process.env.CHRONO_TEST_DIR; const out = process.env.CHRONO_OUT; const lang = process.env.CHRONO_LANG || 'en';
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(out, { recursive: true });
app.setPath('userData', dir);
app.commandLine.appendSwitch('no-sandbox'); app.commandLine.appendSwitch('disable-gpu');
// weather carries an old per-widget size (0.7) - in the sidebar it must still match the others
fs.writeFileSync(path.join(dir, 'chrono-settings.json'), JSON.stringify({ mode: 'bar', lang, pinned: true, widgetScale: { weather: 0.7, prayer: 1.3 },
  enabled: { analog: true, weather: true, prayer: true, calendar: false, digital: false, world: false, alarm: false, notes: false, calc: false } }));
const results = []; let fails = 0;
const check = (n, c) => { results.push((c ? 'ok   ' : 'FAIL ') + n); console.log('STEP', c ? 'ok' : 'FAIL', n); if (!c) fails++; };
require('../main.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bar = () => BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && /bar\.html/.test(w.webContents.getURL()));
const js = (c) => Promise.race([bar().webContents.executeJavaScript(c), new Promise((r) => setTimeout(() => r('__timeout'), 5000))]);
const layout = () => js(`(() => { const W = innerWidth, H = innerHeight;
  const cards = [...document.querySelectorAll('.slot > *')].map(e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), right: Math.round(W - r.right), bottom: Math.round(r.bottom) }; });
  return { W, H, zoom: document.getElementById('barInner').style.zoom, cards, maxBottom: Math.max(...cards.map(c => c.bottom)), head: Math.round(document.querySelector('.barTop').getBoundingClientRect().width) }; })()`);
const patch = (p) => js(`window.chrono.patch(${JSON.stringify(p)})`);
app.whenReady().then(async () => {
  await sleep(3500);
  let L = await layout();
  const widths = L.cards.map((c) => c.w);
  check(`all docked widgets share one width ${JSON.stringify(widths)} (old per-widget sizes ignored)`, widths.every((w) => Math.abs(w - widths[0]) <= 1));
  check('all flush to the right edge', L.cards.every((c) => c.right === 0));
  check('header as wide as the column', Math.abs(L.head - widths[0]) <= 2);
  const wa = screen.getPrimaryDisplay().workArea;
  let b = bar().getBounds();
  check(`window hugs the column (window ${b.width}px, column ${widths[0]}px)`, b.width <= widths[0] + 14 && b.x + b.width === wa.x + wa.width);
  await bar().webContents.capturePage().then((i) => fs.writeFileSync(path.join(out, 'large.png'), i.toPNG()));
  // size button: L -> S
  await js("document.querySelector('.sizeBtn').click()"); await sleep(1500);
  L = await layout(); b = bar().getBounds();
  const small = L.cards[0].w;
  check(`size button switches to Small (${widths[0]} -> ${small}px)`, small < widths[0] * 0.8 && L.cards.every((c) => Math.abs(c.w - small) <= 1));
  check(`window shrinks with it (${b.width}px)`, b.width <= small + 14 + 1 || b.width <= 200 + 14);
  check('settings saved as small', JSON.parse(fs.readFileSync(path.join(dir, 'chrono-settings.json'))).barSize === 'small');
  await bar().webContents.capturePage().then((i) => fs.writeFileSync(path.join(out, 'small.png'), i.toPNG()));
  await patch({ barSize: 'large' }); await sleep(1500);
  // add widgets later -> column auto-shrinks to fit the screen height, still one width
  await patch({ enabled: { calendar: true, digital: true, world: true, alarm: true } }); await sleep(2500);
  L = await layout();
  check(`after adding 4 widgets everything still fits the screen (bottom ${L.maxBottom} <= ${L.H}, zoom ${L.zoom})`, L.maxBottom <= L.H && Number(L.zoom) < 1);
  check('and they still share one width', L.cards.every((c) => Math.abs(c.w - L.cards[0].w) <= 1));
  check('still flush right', L.cards.every((c) => c.right === 0));
  b = bar().getBounds();
  check(`window still hugs the narrower column (${b.width}px for ${L.cards[0].w}px)`, b.width <= Math.max(L.cards[0].w, 260) + 14);
  check('header buttons all visible', await js("(() => { const r = document.querySelector('.barTop').getBoundingClientRect(); return [...document.querySelectorAll('.barTop button')].every(b => { const x = b.getBoundingClientRect(); return x.right <= innerWidth + 1 && x.left >= r.left - 1; }); })()"));
  await bar().webContents.capturePage().then((i) => fs.writeFileSync(path.join(out, 'many.png'), i.toPNG()));
  // remove them again -> grows back to full size
  await patch({ enabled: { calendar: false, digital: false, world: false, alarm: false } }); await sleep(2500);
  L = await layout();
  check(`after removing them the column grows back (zoom ${L.zoom})`, Number(L.zoom) === 1 && Math.abs(L.cards[0].w - widths[0]) <= 1);
  // Ctrl + wheel over the sidebar changes the column size
  await js("document.querySelector('.slot').dispatchEvent(new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, bubbles: true, cancelable: true }))"); await sleep(1200);
  check('Ctrl + wheel over the sidebar steps the size down', JSON.parse(fs.readFileSync(path.join(dir, 'chrono-settings.json'))).barSize === 'medium');
  // a popped-out widget still uses its own size
  await js("document.querySelector('.slot[data-id=weather] .tools .popBtn').click()"); await sleep(2500);
  const fw = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && w.webContents.getURL().includes('w=weather'));
  check('popped-out weather uses its own (0.7) size', !!fw && Math.abs(fw.webContents.getZoomFactor() - 0.7) < 0.02);
  console.log(results.join('\n'));
  app.exit(fails ? 1 : 0);
});
