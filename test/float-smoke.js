'use strict';
// Dev-only: free-mode resizing (wheel + corner grip) and popping single widgets out of the sidebar.
const { app, BrowserWindow, screen } = require('electron');
const fs = require('fs'); const path = require('path');
const dir = process.env.CHRONO_TEST_DIR; const out = process.env.CHRONO_OUT;
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(out, { recursive: true });
app.setPath('userData', dir);
app.commandLine.appendSwitch('no-sandbox'); app.commandLine.appendSwitch('disable-gpu');
fs.writeFileSync(path.join(dir, 'chrono-settings.json'), JSON.stringify({ mode: 'free', lang: 'en', pinned: true,
  enabled: { analog: true, weather: true, prayer: false, calendar: true, digital: false, world: false, alarm: false, notes: false, calc: false } }));
const results = []; const logs = []; let fails = 0;
const check = (n, c) => { results.push((c ? 'ok   ' : 'FAIL ') + n); console.log('STEP', c ? 'ok' : 'FAIL', n); if (!c) fails++; };
app.on('web-contents-created', (_e, wc) => wc.on('console-message', (_ev, level, msg) => { if (level >= 2) logs.push(msg); }));
let cursor = null;
require('../main.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wins = (re) => BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed() && re.test(w.webContents.getURL()));
const widget = (id) => wins(/widget\.html/).find((w) => w.webContents.getURL().includes('w=' + id));
const js = (w, c) => Promise.race([w.webContents.executeJavaScript(c), new Promise((r) => setTimeout(() => r('__timeout'), 5000))]);
const readS = () => JSON.parse(fs.readFileSync(path.join(dir, 'chrono-settings.json'), 'utf8'));
app.whenReady().then(async () => {
  const real = screen.getCursorScreenPoint.bind(screen);
  screen.getCursorScreenPoint = () => cursor || real();
  await sleep(3000);
  // ---- free mode: Ctrl + wheel
  let cal = widget('calendar'); const others = wins(/widget\.html/).filter((w) => w !== cal).map((w) => w.id);
  const b0 = cal.getBounds();
  for (let i = 0; i < 4; i++) await js(cal, "document.querySelector('.card').dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true }))");
  await sleep(900);
  cal = widget('calendar'); const b1 = cal.getBounds();
  check(`free: Ctrl+wheel grows the widget (${b0.width}x${b0.height} -> ${b1.width}x${b1.height})`, b1.width > b0.width * 1.12 && b1.height > b0.height * 1.12);
  check('free: resizing does not rebuild the other widgets', wins(/widget\.html/).filter((w) => w !== cal).every((w) => others.includes(w.id)));
  check('free: new size saved', Math.abs((readS().widgetScale || {}).calendar - 1.2) < 0.011);
  // ---- free mode: wheel over the grip (no Ctrl) shrinks
  for (let i = 0; i < 2; i++) await js(cal, "document.querySelector('.rsGrip').dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }))");
  await sleep(900);
  const b2 = widget('calendar').getBounds();
  check(`free: wheel over the corner grip shrinks (${b1.width} -> ${b2.width})`, b2.width < b1.width);
  // ---- free mode: corner grip drag
  const g0 = widget('calendar').getBounds();
  cursor = { x: g0.x + g0.width - 8, y: g0.y + g0.height - 8 };
  await js(widget('calendar'), "window.chrono.resizeStart('calendar')"); await sleep(100);
  cursor = { x: cursor.x + 120, y: cursor.y + 120 }; await sleep(300);
  const gMid = widget('calendar').getBounds();
  check(`grip: dragging outward grows it live (${g0.width} -> ${gMid.width})`, gMid.width > g0.width + 60);
  check('grip: top-left corner stays put', gMid.x === g0.x && gMid.y === g0.y);
  cursor = { x: cursor.x - 220, y: cursor.y - 220 }; await sleep(300);
  const gIn = widget('calendar').getBounds();
  check(`grip: dragging inward shrinks it (${gMid.width} -> ${gIn.width})`, gIn.width < g0.width);
  await js(widget('calendar'), "window.chrono.resizeEnd('calendar')"); await sleep(800);
  const sc = (readS().widgetScale || {}).calendar;
  check('grip: final size saved (' + sc + ')', sc > 0.4 && sc < 1);
  check('grip is shown on floating widgets', await js(widget('calendar'), "!!document.querySelector('.rsGrip')"));
  fs.writeFileSync(path.join(out, 'free-cal.png'), (await widget('calendar').webContents.capturePage()).toPNG());
  cursor = null;

  // ---- bar mode: pop one widget out
  await js(widget('calendar'), "window.chrono.patch({ mode: 'bar' })"); await sleep(2500);
  let bar = wins(/bar\.html/)[0];
  check('bar mode: no floating widgets yet', wins(/widget\.html/).length === 0 && !!bar);
  check('cog settings button + pop-out button on widgets', await js(bar, "!!document.querySelector('.slot[data-id=weather] .tools .popBtn')"));
  const slotsBefore = await js(bar, "[...document.querySelectorAll('.slot')].map(s => s.dataset.id).join(',')");
  await js(bar, "document.querySelector('.slot[data-id=weather] .tools .popBtn').click()"); await sleep(2000);
  const fw = widget('weather');
  check('pop-out: weather now floats in its own window', !!fw && fw.isVisible());
  const slotsAfter = await js(bar, "[...document.querySelectorAll('.slot')].map(s => s.dataset.id).join(',')");
  check(`pop-out: sidebar closes the gap (${slotsBefore} -> ${slotsAfter})`, slotsAfter === slotsBefore.split(',').filter((x) => x !== 'weather').join(','));
  check('pop-out: sidebar window was not rebuilt', wins(/bar\.html/)[0] === bar);
  const bb = bar.getBounds(); const wb = fw.getBounds();
  check('pop-out: placed next to the sidebar, not on top of it', wb.x + wb.width <= bb.x);
  check('popped-out widget has a dock button + resize grip', await js(fw, "!!document.querySelector('.tools .popBtn') && !!document.querySelector('.rsGrip')"));
  fs.writeFileSync(path.join(out, 'bar-after-pop.png'), (await bar.webContents.capturePage()).toPNG());
  fs.writeFileSync(path.join(out, 'popped-weather.png'), (await fw.webContents.capturePage()).toPNG());
  // unpinned sidebar hides, popped-out widget stays
  await js(bar, "window.chrono.patch({ pinned: false })"); cursor = { x: 200, y: 200 }; await sleep(2500);
  check('unpinned: sidebar hides but the popped-out widget stays on the desktop', !wins(/bar\.html/)[0].isVisible() && widget('weather').isVisible());
  await js(bar, "window.chrono.patch({ pinned: true })"); await sleep(800); cursor = null;
  // dock it back
  await js(widget('weather'), "document.querySelector('.tools .popBtn').click()"); await sleep(1500);
  check('dock: floating window closes', !widget('weather'));
  check('dock: weather back in the sidebar in its old place', (await js(bar, "[...document.querySelectorAll('.slot')].map(s => s.dataset.id).join(',')")) === slotsBefore);
  fs.writeFileSync(path.join(out, 'report.txt'), results.join('\n') + '\n--- renderer errors ---\n' + (logs.join('\n') || '(none)') + '\n');
  app.exit(fails ? 1 : 0);
});
