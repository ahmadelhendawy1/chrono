'use strict';
// Dev-only: launches the real app headlessly (xvfb), seeds sample data, screenshots every window, logs renderer errors.
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs'); const path = require('path');
const dir = process.env.CHRONO_TEST_DIR; const out = process.env.CHRONO_OUT; const mode = process.env.CHRONO_MODE || 'bar';
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(out, { recursive: true });
app.setPath('userData', dir);
app.commandLine.appendSwitch('no-sandbox'); app.commandLine.appendSwitch('disable-gpu');

const settings = { mode, lang: process.env.CHRONO_LANG || 'en', theme: process.env.CHRONO_THEME || 'glass',
  enabled: { analog: true, weather: true, prayer: true, calendar: true, digital: true, world: true, notes: true, calc: true },
  weather: { days: Number(process.env.CHRONO_DAYS || 5), layout: process.env.CHRONO_LAYOUT || 'full' },
  clock: { face: Number(process.env.CHRONO_FACE || 0), digitalStyle: Number(process.env.CHRONO_DSTYLE || 0) } };
if (process.env.CHRONO_EXTRA) Object.assign(settings, JSON.parse(process.env.CHRONO_EXTRA));
fs.writeFileSync(path.join(dir, 'chrono-settings.json'), JSON.stringify(settings));
fs.writeFileSync(path.join(dir, 'chrono-notes.json'), JSON.stringify([{ id: 'n1', text: 'Buy markers\nPrint worksheets for 6/B\nCall parents', color: 0 }, { id: 'n2', text: '', color: 3 }]));
// weather cache from API-shaped sample data (replaced by live data if the network allows)
const W = require('../lib/weather');
const time = []; const wc = [];
const dayCodes = [[0], [1], [2], [3], [61], [45], [95], [71]];
for (let d = 0; d < 8; d++) for (let hh = 0; hh < 24; hh++) { time.push(`2026-11-${String(2 + d).padStart(2, '0')}T${String(hh).padStart(2, '0')}:00`); wc.push(dayCodes[d][0]); }
const sample = W.normalise({
  current: { temperature_2m: 26.4, apparent_temperature: 27.1, relative_humidity_2m: 41, weather_code: 2, is_day: 1, wind_speed_10m: 14 },
  daily: { time: Array.from({ length: 8 }, (_, d) => `2026-11-${String(2 + d).padStart(2, '0')}`), weather_code: Array(8).fill(3), temperature_2m_max: [29, 28, 27, 24, 22, 23, 21, 19], temperature_2m_min: [20, 19, 18, 17, 16, 17, 15, 12], precipitation_probability_max: Array(8).fill(10), wind_speed_10m_max: Array(8).fill(15), sunrise: Array(8).fill('x'), sunset: Array(8).fill('y') },
  hourly: { time, weather_code: wc } }, { name: 'Cairo, Egypt', lat: 30.0444, lon: 31.2357 });
fs.writeFileSync(path.join(dir, 'chrono-weather-cache.json'), JSON.stringify(sample));

const logs = [];
app.on('web-contents-created', (_e, wc2) => {
  wc2.on('console-message', (_ev, level, msg, line, src) => { if (level >= 2) logs.push(`[console ${level}] ${msg} (${path.basename(src || '')}:${line})`); });
  wc2.on('render-process-gone', (_ev, d) => logs.push('[render-process-gone] ' + d.reason));
  wc2.on('did-fail-load', (_ev, code, desc, url) => logs.push(`[did-fail-load] ${desc} ${url}`));
});
require('../main.js');
app.whenReady().then(() => {
  const tabs = (process.env.CHRONO_SETTINGS_TABS || '').split(',').filter(Boolean);
  tabs.forEach((tab, i) => {
    const w = new BrowserWindow({ width: 860, height: 640, show: true, x: 40 + i * 10, y: 40, webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, sandbox: false } });
    w.loadFile(path.join(__dirname, '..', 'src', 'settings.html'), { query: { tab } });
  });
  setTimeout(async () => {
    const info = [];
    for (const w of BrowserWindow.getAllWindows()) {
      const url = w.webContents.getURL(); const name = (url.split('/').pop().replace(/[?=&]/g, '_').replace('.html', '')) || 'win';
      const img = await w.webContents.capturePage();
      fs.writeFileSync(path.join(out, name + '.png'), img.toPNG());
      info.push(`${name}: window ${w.getSize().join('x')} at ${w.getPosition().join(',')}`);
    }
    fs.writeFileSync(path.join(out, 'report.txt'), info.join('\n') + '\n--- renderer errors ---\n' + (logs.join('\n') || '(none)') + '\n');
    app.exit(0);
  }, Number(process.env.CHRONO_WAIT || 7000));
});
