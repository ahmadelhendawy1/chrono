'use strict';
// Dev-only: runs the real app under xvfb with a simulated mouse and checks edge-reveal + the widget switch panel.
const { app, BrowserWindow, screen } = require('electron');
const fs = require('fs'); const path = require('path');
const dir = process.env.CHRONO_TEST_DIR; const out = process.env.CHRONO_OUT; const mode = process.env.CHRONO_MODE || 'bar';
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(out, { recursive: true });
app.setPath('userData', dir);
app.commandLine.appendSwitch('no-sandbox'); app.commandLine.appendSwitch('disable-gpu');
fs.writeFileSync(path.join(dir, 'chrono-settings.json'), JSON.stringify({ mode, lang: process.env.CHRONO_LANG || 'en', pinned: false,
  enabled: { analog: true, weather: true, prayer: true, calendar: false, digital: false, world: false, alarm: false, notes: false, calc: false } }));

const logs = []; const results = []; let fails = 0;
const check = (name, cond) => { results.push((cond ? 'ok   ' : 'FAIL ') + name); console.log('STEP', cond ? 'ok' : 'FAIL', name); if (!cond) fails++; };
app.on('web-contents-created', (_e, wc) => wc.on('console-message', (_ev, level, msg) => { if (level >= 2) logs.push(msg); }));

let cursor = { x: 400, y: 400 };
require('../main.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
app.whenReady().then(async () => {
  screen.getCursorScreenPoint = () => cursor;   // simulated mouse
  const d = screen.getPrimaryDisplay();
  const chrono = () => BrowserWindow.getAllWindows().filter((w) => /widget\.html|bar\.html/.test(w.webContents.getURL()));
  const anyVisible = () => chrono().some((w) => w.isVisible());
  const allVisible = () => chrono().length > 0 && chrono().every((w) => w.isVisible());
  const TO = (p, ms, tag) => { let done = false; p = Promise.resolve(p).then((v) => { done = true; return v; }); return Promise.race([p, new Promise((r) => setTimeout(() => { if (done) return r(null); console.log('TIMEOUT', tag, JSON.stringify(BrowserWindow.getAllWindows().filter(w=>!w.isDestroyed()&&/bar\.html/.test(w.webContents.getURL())).map(w=>[w.getBounds(), w.isVisible()])), JSON.stringify(cursor)); r(null); }, ms))]); };
  const shot = async (name) => { for (const w of chrono()) { const img = await TO(w.webContents.capturePage(), 5000, 'capture ' + name); if (img) fs.writeFileSync(path.join(out, name + '-' + w.id + '.png'), img.toPNG()); } };

  await sleep(1500); check('startup: shown briefly so people see it', allVisible());
  await sleep(4000); check('startup: hides again when the mouse is elsewhere', !anyVisible());
  cursor = { x: d.bounds.x + d.bounds.width - 1, y: d.workArea.y + 300 };
  await sleep(150); check('quick flick past the edge does not pop it', !anyVisible());
  await sleep(500); check('mouse on right edge pops it out', allVisible());
  check('popped-out widgets sit on top of other apps', chrono().every((w) => w.isAlwaysOnTop()));
  const r = chrono()[0].getBounds();
  cursor = { x: r.x + 40, y: r.y + 120 }; await sleep(1200); check('stays while the mouse is over it', allVisible());
  cursor = { x: 300, y: 300 }; await sleep(1100); check('hides after the mouse leaves', !anyVisible());
  cursor = { x: d.bounds.width - 1, y: d.workArea.y + d.workArea.height + 10 }; await sleep(700); check('taskbar corner does not pop it', !anyVisible());

  if (mode === 'bar') {
    cursor = { x: d.bounds.width - 1, y: 200 }; await sleep(600);
    const bar = chrono()[0]; const barId = bar.webContents.id;
    // keep the simulated mouse over the sidebar even when it auto-shrinks around fewer/more widgets
    const follow = setInterval(() => { if (!bar.isDestroyed()) { const bb = bar.getBounds(); cursor = { x: bb.x + 20, y: 40 }; } }, 40);
    cursor = { x: bar.getBounds().x + 20, y: 40 };
    await TO(bar.webContents.executeJavaScript("document.querySelector('.barTop button:not(.pinBtn):not(.sizeBtn)').click()"), 5000, "document.querySelector('.barTop button:not(.pinBt"); await sleep(500);
    const rows = await TO(bar.webContents.executeJavaScript("[...document.querySelectorAll('.wpRow')].map(b => b.textContent + ':' + b.classList.contains('on')).join(',')"), 5000, "[...document.querySelectorAll('.wpRow')].map(b =>");
    check('widgets panel lists all 9 with on/off state', rows.split(',').length === 9 && /Calendar:false/.test(rows) && /Weather:true/.test(rows));
    await TO(bar.webContents.executeJavaScript("[...document.querySelectorAll('.wpRow')].find(b => b.textContent.startsWith('Calendar')).click()"), 5000, "[...document.querySelectorAll('.wpRow')].find(b ="); await sleep(800);
    const s1 = JSON.parse(fs.readFileSync(path.join(dir, 'chrono-settings.json'), 'utf8'));
    check('one click turns a closed widget back on', s1.enabled.calendar === true);
    check('bar was not rebuilt (panel stays open)', chrono()[0].webContents.id === barId && await TO(bar.webContents.executeJavaScript("!!document.querySelector('.wPanel') && !!document.querySelector('.slot[data-id=calendar]')"), 5000, "!!document.querySelector('.wPanel') && !!document"));
    await shot('panel');
    // close weather with its X, then bring it back from the panel
    await TO(bar.webContents.executeJavaScript("document.querySelector('.slot[data-id=weather] .tools button:last-child').click()"), 5000, "document.querySelector('.slot[data-id=weather] .t"); await sleep(700);
    check('X closes the weather widget', await TO(bar.webContents.executeJavaScript("!document.querySelector('.slot[data-id=weather]')"), 5000, "!document.querySelector('.slot[data-id=weather]')"));
    await TO(bar.webContents.executeJavaScript("[...document.querySelectorAll('.wpRow')].find(b => b.textContent.startsWith('Weather')).click()"), 5000, "[...document.querySelectorAll('.wpRow')].find(b ="); await sleep(800);
    check('weather comes back with its switch (no reset)', await TO(bar.webContents.executeJavaScript("!!document.querySelector('.slot[data-id=weather]')"), 5000, "!!document.querySelector('.slot[data-id=weather]'"));
    // all off -> empty hint, bar still there
    await TO(bar.webContents.executeJavaScript("window.chrono.patch({ enabled: { analog:false, weather:false, prayer:false, calendar:false, alarm:false } })"), 5000, 'window.chrono.patch({ enabled: { analog:false, we'); await sleep(700);
    await TO(bar.webContents.executeJavaScript("document.querySelector('.barTop button:not(.pinBtn):not(.sizeBtn)').click()"), 5000, "document.querySelector('.barTop button:not(.pinBt"); await sleep(400);
    check('all widgets off: bar + hint remain so they can be turned back on', chrono().length === 1 && await TO(bar.webContents.executeJavaScript("!!document.querySelector('.wpEmpty')"), 5000, '!!document.querySelector(\'.wpEmpty\')"'));
    await shot('empty');
    await TO(bar.webContents.executeJavaScript("window.chrono.patch({ enabled: { weather: true, prayer: true } })"), 5000, 'window.chrono.patch({ enabled: { weather: true, p'); await sleep(600);
    clearInterval(follow);
  }
  if (mode === 'bar') {
    const bar = chrono()[0]; const wb = bar.getBounds();
    check('bar touches the right screen edge', wb.x + wb.width === d.workArea.x + d.workArea.width);
    const gap = await TO(bar.webContents.executeJavaScript("(() => { const W = window.innerWidth; return [...document.querySelectorAll('.slot > *')].map(e => Math.round(W - e.getBoundingClientRect().right)); })()"), 5000, '(() => { const W = window.innerWidth; return [...');
    check('cards sit flush on the right (no gap): ' + JSON.stringify(gap), gap.length > 0 && gap.every((g) => g === 0));
    check('no visible scrollbar strip', await TO(bar.webContents.executeJavaScript("document.getElementById('barScroll').offsetWidth === document.getElementById('barScroll').clientWidth"), 5000, "document.getElementById('barScroll').offsetWidth "));
    // pin button: click it -> pinned, stays visible after the mouse leaves
    await TO(bar.webContents.executeJavaScript("document.querySelector('.pinBtn').click()"), 5000, 'document.querySelector(\'.pinBtn\').click()"'); await sleep(900);
  } else {
    await chrono()[0].webContents.executeJavaScript("window.chrono.patch({ pinned: true })"); await sleep(900);
  }
  cursor = { x: 300, y: 300 }; await sleep(2000);
  check('pinned: widgets stay visible', allVisible());
  await shot('final');
  fs.writeFileSync(path.join(out, 'report.txt'), results.join('\n') + '\n--- renderer errors ---\n' + (logs.join('\n') || '(none)') + '\n');
  app.exit(fails ? 1 : 0);
});
