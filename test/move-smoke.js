'use strict';
// Dev-only: real pointer events (xdotool) on a free-floating widget - grab anywhere, drag, click still works, grip resizes.
const { app, BrowserWindow, screen } = require('electron');
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const dir = process.env.CHRONO_TEST_DIR;
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', dir);
app.commandLine.appendSwitch('no-sandbox'); app.commandLine.appendSwitch('disable-gpu');
fs.writeFileSync(path.join(dir, 'chrono-settings.json'), JSON.stringify({ mode: 'free', lang: 'en', pinned: true,
  enabled: { analog: true, weather: false, prayer: false, calendar: true, digital: false, world: false, alarm: false, notes: false, calc: false } }));
const results = []; let fails = 0;
const check = (n, c) => { results.push((c ? 'ok   ' : 'FAIL ') + n); console.log('STEP', c ? 'ok' : 'FAIL', n); if (!c) fails++; };
require('../main.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const xdo = (...a) => execFileSync('xdotool', a.map(String));
const widget = (id) => BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && w.webContents.getURL().includes('w=' + id));
const js = (w, c) => Promise.race([w.webContents.executeJavaScript(c), new Promise((r) => setTimeout(() => r('__timeout'), 5000))]);
async function drag(x1, y1, x2, y2) {
  xdo('mousemove', x1, y1); await sleep(150); xdo('mousedown', 1); await sleep(120);
  for (let i = 1; i <= 10; i++) { xdo('mousemove', Math.round(x1 + (x2 - x1) * i / 10), Math.round(y1 + (y2 - y1) * i / 10)); await sleep(40); }
  await sleep(200); xdo('mouseup', 1); await sleep(500);
}
app.whenReady().then(async () => {
  await sleep(3500);
  // 1) grab the calendar by its day grid (was a no-drag area before) and move it
  let cal = widget('calendar'); let b = cal.getBounds();
  const gx = b.x + Math.round(b.width / 2); const gy = b.y + Math.round(b.height * 0.6);
  await drag(gx, gy, gx - 300, gy + 40);
  let b2 = widget('calendar').getBounds();
  check(`calendar moves when grabbed on its day grid (${b.x},${b.y} -> ${b2.x},${b2.y})`, Math.abs(b2.x - (b.x - 300)) <= 6 && Math.abs(b2.y - (b.y + 40)) <= 6);
  check('size unchanged by moving', b2.width === b.width && b2.height === b.height);
  // 2) a plain click on the "next month" arrow still works (no move)
  const titleBefore = await js(widget('calendar'), "document.querySelector('.calTitle').textContent");
  const r = await js(widget('calendar'), "(() => { const z = window.outerWidth / innerWidth; const e = [...document.querySelectorAll('.calHead button, .card button')].find(x => /chev/.test(x.innerHTML) || x.textContent.trim() === '' ) ; const bb = document.querySelectorAll('.card button'); const btn = bb[bb.length-1]; const r = btn.getBoundingClientRect(); return { x: (r.left + r.width/2) * z, y: (r.top + r.height/2) * z }; })()");
  b2 = widget('calendar').getBounds();
  xdo('mousemove', Math.round(b2.x + r.x), Math.round(b2.y + r.y)); await sleep(150); xdo('click', 1); await sleep(600);
  const titleAfter = await js(widget('calendar'), "document.querySelector('.calTitle').textContent");
  check(`plain click on a button still works (${titleBefore} -> ${titleAfter})`, titleAfter !== titleBefore);
  check('click did not move the widget', JSON.stringify(widget('calendar').getBounds()) === JSON.stringify(b2));
  // 3) hover shows the tools (hover is no longer eaten by a drag region)
  xdo('mousemove', b2.x + 40, b2.y + 40); await sleep(500);
  check('hovering the widget shows its buttons', (await js(widget('calendar'), "getComputedStyle(document.querySelector('.tools')).opacity")) === '1');
  // 4) analog clock: grip visible and drags to resize
  let an = widget('analog'); const a0 = an.getBounds();
  check('analog clock has a visible resize grip', Number(await js(an, "getComputedStyle(document.querySelector('.rsGrip')).opacity")) > 0.3);
  await drag(a0.x + a0.width - 8, a0.y + a0.height - 8, a0.x + a0.width + 110, a0.y + a0.height + 110);
  await sleep(800);
  const a1 = widget('analog').getBounds();
  check(`analog grows by dragging its corner grip (${a0.width}x${a0.height} -> ${a1.width}x${a1.height})`, a1.width > a0.width + 50);
  check('analog did not move while resizing', a1.x === a0.x && a1.y === a0.y);
  // 5) grab the analog clock by its face and move it
  await drag(a1.x + a1.width / 2, a1.y + a1.height / 2 - 20, a1.x + a1.width / 2 - 150, a1.y + a1.height / 2 + 100);
  const a2 = widget('analog').getBounds();
  check(`analog moves when grabbed on its face (${a1.x},${a1.y} -> ${a2.x},${a2.y})`, Math.abs(a2.x - (a1.x - 150)) <= 6 && Math.abs(a2.y - (a1.y + 120)) <= 6);
  // 6) Ctrl + wheel now reaches the widget
  xdo('mousemove', a2.x + a2.width / 2, a2.y + a2.height / 2); await sleep(200);
  xdo('keydown', 'ctrl'); xdo('click', 5); await sleep(200); xdo('click', 5); xdo('keyup', 'ctrl'); await sleep(900);
  const a3 = widget('analog').getBounds();
  check(`Ctrl + wheel resizes with the real mouse (${a2.width} -> ${a3.width})`, a3.width < a2.width);
  await sleep(500);
  const st = JSON.parse(fs.readFileSync(path.join(dir, 'chrono-state.json'), 'utf8'));
  check('new positions saved', st.positions.calendar && Math.abs(st.positions.calendar.x - b2.x) <= 2);
  console.log(results.join('\n'));
  app.exit(fails ? 1 : 0);
});
