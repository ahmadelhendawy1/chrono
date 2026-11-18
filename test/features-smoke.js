'use strict';
// Dev-only: runs the real app under xvfb and exercises alarms, the calculator tabs and floating sticky notes.
const { app, BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
const dir = process.env.CHRONO_TEST_DIR; const out = process.env.CHRONO_OUT; const lang = process.env.CHRONO_LANG || 'en';
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(out, { recursive: true });
app.setPath('userData', dir);
app.commandLine.appendSwitch('no-sandbox'); app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
fs.writeFileSync(path.join(dir, 'chrono-settings.json'), JSON.stringify({ mode: 'bar', lang, pinned: true, hour12: true,
  enabled: { analog: false, weather: false, prayer: false, calendar: false, digital: false, world: false, alarm: true, notes: false, calc: true } }));
const logs = []; const results = []; let fails = 0;
const check = (name, cond) => { results.push((cond ? 'ok   ' : 'FAIL ') + name); if (!cond) fails++; };
app.on('web-contents-created', (_e, wc) => wc.on('console-message', (_ev, level, msg, line, src) => { if (level >= 2) logs.push(msg + ' @' + (src || '').split('/').pop() + ':' + line); }));
require('../main.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJ = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { return null; } };
const winBy = (re) => BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed() && re.test(w.webContents.getURL()));
async function shot(w, name) { const img = await w.webContents.capturePage(); fs.writeFileSync(path.join(out, name + '.png'), img.toPNG()); }
const js = (w, code) => w.webContents.executeJavaScript(code);

app.whenReady().then(async () => {
  await sleep(2500);
  const bar = winBy(/bar\.html/)[0];
  check('bar loaded with alarm + calc widgets', !!bar && await js(bar, "!!document.querySelector('.card.alarm') && !!document.querySelector('.card.calc')"));

  // ---------------- calculator
  await js(bar, `(() => { const c = document.querySelector('.card.calc'); c.focus(); for (const k of '12+30') c.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); c.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); })()`);
  await sleep(300);
  check('calc: 12+30 = 42', (await js(bar, "document.querySelector('.cRes').textContent")) === '42');
  await js(bar, "[...document.querySelectorAll('.mk')].find(b => b.textContent === 'M+').click()"); await sleep(150);
  await js(bar, "[...document.querySelectorAll('.mk')].find(b => b.textContent === 'M+').click()"); await sleep(150);
  check('calc: memory M+ twice = 84', /84/.test(await js(bar, "document.querySelector('.cMem').textContent")));
  await js(bar, "[...document.querySelectorAll('.ck')].find(b => b.textContent === 'C').click()"); await sleep(100);
  await js(bar, "[...document.querySelectorAll('.mk')].find(b => b.textContent === 'MR').click()"); await sleep(150);
  check('calc: MR recalls 84', (await js(bar, "document.querySelector('.cExpr').textContent")) === '84');
  // items tab
  await js(bar, "[...document.querySelectorAll('.cTab')][1].click()"); await sleep(300);
  await js(bar, `(() => { const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    let r = document.querySelectorAll('.iRow'); set(r[0].querySelector('.name'), 'Bread'); set(r[0].querySelector('.qty'), '3'); set(r[0].querySelector('.price'), '2.5');
    document.querySelector('.iAdd').click(); })()`); await sleep(300);
  await js(bar, `(() => { const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    const r = document.querySelectorAll('.iRow'); set(r[1].querySelector('.name'), 'Milk'); set(r[1].querySelector('.qty'), '2'); set(r[1].querySelector('.price'), '12*2'); })()`); await sleep(300);
  const total = await js(bar, "document.querySelector('.iTotal').textContent");
  check('items: 3×2.5 + 2×(12*2) = 55.5 total (' + total + ')', /^55\.5 /.test(total));
  await shot(bar, 'calc-items');
  await js(bar, "document.querySelectorAll('.iBtn')[1].click()"); await sleep(700);
  const cj = readJ('chrono-calc.json');
  check('items: list saved to archive + history persisted + memory persisted', cj && cj.archive.length === 1 && cj.archive[0].total === 55.5 && cj.history.length >= 1 && cj.history[0].result === '42' && cj.memory === 84);
  await js(bar, "[...document.querySelectorAll('.cTab')][2].click()"); await sleep(300);
  check('history tab shows the calculation and the saved list', await js(bar, "document.querySelectorAll('.hRow').length === 1 && document.querySelectorAll('.hList').length === 1"));
  await shot(bar, 'calc-history');
  await js(bar, "document.querySelector('.hRow').click()"); await sleep(300);
  check('history: clicking a calculation brings it back', await js(bar, "document.querySelector('.cTab.on').textContent") === (lang === 'ar' ? 'حاسبة' : 'Calc') && (await js(bar, "document.querySelector('.cRes').textContent")) === '42');
  await js(bar, "[...document.querySelectorAll('.cTab')][0].click()"); await sleep(200);
  await shot(bar, 'calc-main');

  // ---------------- alarm: add one for the next minute and let it ring
  await js(bar, "document.querySelector('.aAdd').click()"); await sleep(500);
  check('alarm: editor opens for the new alarm', await js(bar, "!!document.querySelector('.aEdit')"));
  await shot(bar, 'alarm-editor');
  const now = new Date(); const nx = new Date(now.getTime() + 60000);
  const hhmm = String(nx.getHours()).padStart(2, '0') + ':' + String(nx.getMinutes()).padStart(2, '0');
  await js(bar, `window.chrono.getAlarms().then(p => { const a = p.alarms[0]; a.time = '${hhmm}'; a.label = 'Test wake'; a.days = []; return window.chrono.setAlarms(p.alarms); })`);
  await sleep(800);
  const aj = readJ('chrono-alarms.json');
  check('alarm saved to disk', aj && aj.length === 1 && aj[0].time === hhmm && aj[0].enabled === true);
  check('alarm widget shows "next" countdown', /in|بعد/.test(await js(bar, "document.querySelector('.aNext').textContent")));
  const waitMs = (60 - new Date().getSeconds()) * 1000 + 2500;
  await sleep(waitMs);
  let ring = winBy(/ring\.html/)[0];
  check('alarm rang at its minute (banner window open)', !!ring && ring.isVisible());
  if (ring) {
    await sleep(800);
    check('banner shows label + Stop / Snooze', await js(ring, "document.querySelector('.rLabel').textContent.includes('Test wake') && !!document.querySelector('.rStop') && !!document.querySelector('.rSnooze')"));
    check('banner sits bottom-right above the taskbar', (() => { const b = ring.getBounds(); const wa = require('electron').screen.getPrimaryDisplay().workArea; return b.x + b.width <= wa.x + wa.width && b.x + b.width > wa.x + wa.width - 40 && b.y + b.height <= wa.y + wa.height && b.y + b.height > wa.y + wa.height - 40; })());
    check('banner is always on top', ring.isAlwaysOnTop());
    await shot(ring, 'ring');
    const aj2 = readJ('chrono-alarms.json');
    check('one-time alarm switches itself off after ringing', aj2 && aj2[0].enabled === false);
    await js(ring, "document.querySelector('.rSnooze').click()"); await sleep(800);
    check('snooze closes the banner', winBy(/ring\.html/).length === 0);
    check('widget shows the snooze with cancel', await js(bar, "!!document.querySelector('.aSnz button')"));
    await js(bar, "document.querySelector('.aSnz button').click()"); await sleep(500);
    check('cancel snooze clears it', await js(bar, "!document.querySelector('.aSnz')"));
  }

  // ---------------- floating sticky notes
  const id = await js(bar, 'window.chrono.newNote()'); await sleep(1500);
  let nw = winBy(/note\.html/)[0];
  check('new floating note window opens', !!nw && nw.isVisible());
  if (nw) {
    check('note window is resizable and solid (Windows 7 style)', nw.isResizable());
    await js(nw, `(() => { const e = document.querySelector('.sText'); e.innerHTML = '<b>Buy milk</b><br>call Ali'; e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await sleep(800);
    let nj = readJ('chrono-notes.json'); const n = nj && nj.find((x) => x.id === id);
    check('note text + bold formatting saved', n && /<b>Buy milk<\/b>/.test(n.html) && /Buy milk/.test(n.text));
    nw.setSize(320, 260); await sleep(800);
    const st = readJ('chrono-state.json');
    check('note size remembered after resize', st && st.sizes && st.sizes['note:' + id] && st.sizes['note:' + id].w === 320);
    await js(nw, "document.querySelectorAll('.sBtn')[2].click()"); await sleep(300);
    await js(nw, "document.querySelectorAll('.sDot')[1].click()"); await sleep(800);
    nj = readJ('chrono-notes.json');
    check('note colour changed (pink)', nj.find((x) => x.id === id).color === 1);
    await shot(nw, 'note');
    await js(nw, "document.querySelectorAll('.sBtn')[0].click()"); await sleep(1500);
    check('+ in a note opens another floating note', winBy(/note\.html/).length === 2);
    const n2 = winBy(/note\.html/).find((w) => w !== nw);
    await js(n2, "document.querySelectorAll('.sBtn')[4].click()"); await sleep(800);
    check('× on an empty note deletes it straight away', winBy(/note\.html/).length === 1 && readJ('chrono-notes.json').length === nj.length);
    await js(nw, "document.querySelectorAll('.sBtn')[4].click()"); await sleep(300);
    check('× on a note with text asks first', await js(nw, "document.querySelector('.sConfirm').classList.contains('open')"));
    await shot(nw, 'note-confirm');
    await js(nw, "document.querySelector('.sConfirm .yes').click()"); await sleep(800);
    check('confirm deletes the note', winBy(/note\.html/).length === 0 && !readJ('chrono-notes.json').some((x) => x.id === id));
  }
  await shot(bar, 'bar-final');
  fs.writeFileSync(path.join(out, 'report.txt'), results.join('\n') + '\n--- renderer errors ---\n' + (logs.join('\n') || '(none)') + '\n');
  app.exit(fails ? 1 : 0);
});
