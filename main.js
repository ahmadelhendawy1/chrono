'use strict';
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, Notification, net, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const weatherLib = require('./lib/weather');
const prayerLib = require('./lib/prayer');

app.setName('Chrono');
if (process.platform === 'win32') app.setAppUserModelId('com.ai4edutech.chrono');

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

// ---------------------------------------------------------------- constants
const WIDGET_ORDER = ['analog', 'weather', 'prayer', 'calendar', 'digital', 'world', 'notes', 'calc'];
// Natural (unzoomed) CSS sizes. Height is re-measured from the page after render.
const WIDGET_SIZE = {
  analog: { w: 240, h: 265 }, weather: { w: 380, h: 344 }, prayer: { w: 330, h: 432 },
  calendar: { w: 330, h: 302 }, digital: { w: 320, h: 136 }, world: { w: 330, h: 305 },
  notes: { w: 290, h: 282 }, calc: { w: 290, h: 364 }
};
const BAR_INNER_W = 340;   // widget column width in bar mode (CSS px)
const BAR_PAD = 10;        // transparent padding around each card (CSS px)
const BAR_COLLAPSED_W = 30;

const DEFAULTS = {
  lang: 'en',
  theme: 'glass',            // glass | dark | light
  mode: 'bar',               // bar (Windows 7 sidebar style) | free
  barSide: 'right',
  alwaysOnTop: false,
  locked: false,
  opacity: 0.92,
  scale: 1,
  hour12: true,
  autostart: false,
  order: WIDGET_ORDER.slice(),
  enabled: { analog: true, weather: true, prayer: true, calendar: true, digital: false, world: false, notes: false, calc: false },
  location: { name: 'Cairo, Egypt', short: 'Cairo', ar: 'القاهرة', lat: 30.0444, lon: 31.2357, tz: 'Africa/Cairo' },
  units: 'c',
  weather: { days: 5, layout: 'full' },
  clock: { face: 0, seconds: true, sweep: false, showDate: true, digitalStyle: 0, digitalSeconds: true, digitalAmPm: true, digitalHijri: false },
  calendar: { weekStart: 6, hijri: true, hijriOffset: 0 },
  world: { seconds: false, cities: [
    { name: 'Cairo', tz: 'Africa/Cairo' }, { name: 'Riyadh', tz: 'Asia/Riyadh' },
    { name: 'London', tz: 'Europe/London' }, { name: 'New York', tz: 'America/New_York' },
    { name: 'Tokyo', tz: 'Asia/Tokyo' }
  ] },
  prayer: { method: 'Egyptian', asr: 'standard', adjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, notify: true, remindBefore: 10, showSunrise: true, showQibla: true, layout: 'full' },
  widgetScale: {},           // per-widget size multiplier (0.4 - 2)
  widgetLang: {},            // per-widget language override: 'ar' | 'en' (missing = follow the app language)
  barAutoFit: true,          // shrink the bar contents so everything fits the screen height
  noteColor: 0
};

// ---------------------------------------------------------------- storage
const userDir = app.getPath('userData');
const files = {
  settings: path.join(userDir, 'chrono-settings.json'),
  state: path.join(userDir, 'chrono-state.json'),
  notes: path.join(userDir, 'chrono-notes.json'),
  weather: path.join(userDir, 'chrono-weather-cache.json')
};

const clone = (o) => JSON.parse(JSON.stringify(o));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function deepMerge(base, patch) {
  for (const k of Object.keys(patch || {})) {
    if (isObj(patch[k]) && isObj(base[k])) deepMerge(base[k], patch[k]);
    else base[k] = patch[k];
  }
  return base;
}
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
const writers = {};
function writeJson(key, data) {
  clearTimeout(writers[key]);
  writers[key] = setTimeout(() => {
    try { fs.mkdirSync(userDir, { recursive: true }); fs.writeFileSync(files[key], JSON.stringify(data, null, 2)); }
    catch (e) { console.error('write failed', key, e.message); }
  }, 250);
}

let settings = deepMerge(clone(DEFAULTS), readJson(files.settings, {}));
if (settings.location && settings.location.short === 'Cairo' && !settings.location.ar) settings.location.ar = 'القاهرة';
// keep new widgets in `order` after upgrades
WIDGET_ORDER.forEach((w) => { if (!settings.order.includes(w)) settings.order.push(w); });
settings.order = settings.order.filter((w) => WIDGET_ORDER.includes(w));
let state = Object.assign({ positions: {}, popouts: [], barCollapsed: false }, readJson(files.state, {}));
let notes = readJson(files.notes, null) || [{ id: 'n1', text: '', color: 0 }];
let weatherCache = readJson(files.weather, null);

// ---------------------------------------------------------------- windows
const iconPath = path.join(__dirname, 'src', 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
const appIcon = fs.existsSync(iconPath) ? iconPath : path.join(__dirname, 'src', 'assets', 'icon.png');
const preload = path.join(__dirname, 'preload.js');
const webPrefs = { preload, contextIsolation: true, nodeIntegration: false, sandbox: false };

const widgetWins = {};   // id -> BrowserWindow
let barWin = null;
let settingsWin = null;
const noteWins = {};     // noteId -> BrowserWindow
let tray = null;
let visible = true;
let quitting = false;

const scale = () => Math.min(2, Math.max(0.6, Number(settings.scale) || 1));
const clampW = (v) => Math.min(2, Math.max(0.4, Number(v) || 1));
// Free-floating windows: global size x this widget's own size.
const scaleFor = (id) => Math.min(3, Math.max(0.3, scale() * clampW((settings.widgetScale || {})[id] || 1)));
const enabledList = () => settings.order.filter((w) => settings.enabled[w]);
const windowSig = () => JSON.stringify([settings.mode, settings.barSide, settings.alwaysOnTop, scale(), enabledList(), settings.locked, settings.mode === 'free' ? settings.widgetScale : null]);

function applyTop(win) {
  win.setAlwaysOnTop(!!settings.alwaysOnTop, settings.alwaysOnTop ? 'floating' : 'normal');
}

function baseOpts(extra) {
  return Object.assign({
    frame: false, transparent: true, resizable: false, hasShadow: false, skipTaskbar: true,
    show: false, icon: appIcon, backgroundColor: '#00000000', webPreferences: webPrefs
  }, extra);
}

function clampToDisplay(x, y, w, h) {
  const d = screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) }).workArea;
  return {
    x: Math.min(Math.max(Math.round(x), d.x - Math.round(w * 0.6)), d.x + d.width - Math.round(w * 0.4)),
    y: Math.min(Math.max(Math.round(y), d.y), d.y + d.height - 40)
  };
}

// First-run placement: pack widgets into columns along the chosen screen edge, never overlapping.
let slot = null;
function resetSlots() { slot = null; }
function defaultPos(id) {
  const wa = screen.getPrimaryDisplay().workArea; const s = scale(); const gap = 4;
  const w = Math.round((WIDGET_SIZE[id].w + BAR_PAD * 2) * s); const h = Math.round((WIDGET_SIZE[id].h + BAR_PAD * 2) * s);
  const left = settings.barSide === 'left';
  if (!slot) slot = { x: left ? wa.x : wa.x + wa.width, y: wa.y + 6, colW: 0, first: true };
  if (!slot.first && slot.y + h > wa.y + wa.height) {
    slot.x += left ? slot.colW + gap : -(slot.colW + gap); slot.y = wa.y + 6; slot.colW = 0;
  }
  if (slot.first) { slot.first = false; }
  const x = left ? slot.x : slot.x - w;
  const pos = { x, y: slot.y };
  slot.y += h + gap; slot.colW = Math.max(slot.colW, w);
  return pos;
}

function createWidgetWindow(id) {
  const def = WIDGET_SIZE[id]; const s = scaleFor(id);
  const w = Math.round((def.w + BAR_PAD * 2) * s); const h = Math.round((def.h + BAR_PAD * 2) * s);
  const saved = state.positions[id] || defaultPos(id);
  const pos = clampToDisplay(saved.x, saved.y, w, h);
  const win = new BrowserWindow(baseOpts({ width: w, height: h, x: pos.x, y: pos.y, alwaysOnTop: !!settings.alwaysOnTop }));
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'src', 'widget.html'), { query: { w: id } });
  win.webContents.on('did-finish-load', () => win.webContents.setZoomFactor(s));
  win.once('ready-to-show', () => { if (visible) win.show(); });
  let t;
  win.on('move', () => {
    clearTimeout(t);
    t = setTimeout(() => { const [x, y] = win.getPosition(); state.positions[id] = { x, y }; writeJson('state', state); }, 300);
  });
  win.on('closed', () => { delete widgetWins[id]; });
  widgetWins[id] = win;
  applyTop(win);
}

function barBounds(collapsed) {
  const wa = screen.getPrimaryDisplay().workArea; const s = scale();
  const fullW = Math.round((BAR_INNER_W + BAR_PAD * 2) * s);
  const w = collapsed ? Math.round(BAR_COLLAPSED_W * s) : fullW;
  const x = settings.barSide === 'left' ? wa.x : wa.x + wa.width - w;
  return { x, y: wa.y, width: w, height: wa.height };
}

function createBarWindow() {
  const b = barBounds(state.barCollapsed);
  barWin = new BrowserWindow(baseOpts(Object.assign({}, b, { alwaysOnTop: !!settings.alwaysOnTop })));
  barWin.removeMenu();
  barWin.loadFile(path.join(__dirname, 'src', 'bar.html'), { query: { side: settings.barSide } });
  barWin.webContents.on('did-finish-load', () => barWin && barWin.webContents.setZoomFactor(scale()));
  barWin.once('ready-to-show', () => { if (visible) barWin.show(); });
  barWin.on('closed', () => { barWin = null; });
  applyTop(barWin);
}

function createNoteWindow(noteId) {
  if (noteWins[noteId]) { noteWins[noteId].focus(); return; }
  const wa = screen.getPrimaryDisplay().workArea;
  const saved = state.positions['note:' + noteId] || { x: wa.x + wa.width - 560, y: wa.y + 120 };
  const s = scale(); const w = Math.round(250 * s); const h = Math.round(250 * s);
  const pos = clampToDisplay(saved.x, saved.y, w, h);
  const win = new BrowserWindow(baseOpts({ width: w, height: h, x: pos.x, y: pos.y, alwaysOnTop: true }));
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'src', 'note.html'), { query: { id: noteId } });
  win.webContents.on('did-finish-load', () => win.webContents.setZoomFactor(s));
  win.once('ready-to-show', () => win.show());
  let t;
  win.on('move', () => {
    clearTimeout(t);
    t = setTimeout(() => { const [x, y] = win.getPosition(); state.positions['note:' + noteId] = { x, y }; writeJson('state', state); }, 300);
  });
  win.on('closed', () => {
    delete noteWins[noteId];
    if (!quitting) { state.popouts = state.popouts.filter((n) => n !== noteId); writeJson('state', state); }
  });
  win.setAlwaysOnTop(true, 'floating');
  noteWins[noteId] = win;
}

function closeAllWidgetWindows() {
  Object.values(widgetWins).forEach((w) => { try { w.destroy(); } catch (e) { /* gone */ } });
  for (const k of Object.keys(widgetWins)) delete widgetWins[k];
  if (barWin) { try { barWin.destroy(); } catch (e) { /* gone */ } barWin = null; }
}

function rebuildWindows() {
  closeAllWidgetWindows();
  resetSlots();
  if (settings.mode === 'bar') { if (enabledList().length) createBarWindow(); }
  else enabledList().forEach(createWidgetWindow);
  buildTrayMenu();
}

function openSettings(tab) {
  if (settingsWin) { settingsWin.show(); settingsWin.focus(); if (tab) settingsWin.webContents.send('settings:tab', tab); return; }
  settingsWin = new BrowserWindow({
    width: 860, height: 640, minWidth: 720, minHeight: 520, title: 'Chrono', icon: appIcon, autoHideMenuBar: true,
    backgroundColor: '#0e1a2e', show: false, webPreferences: webPrefs
  });
  settingsWin.removeMenu();
  settingsWin.loadFile(path.join(__dirname, 'src', 'settings.html'), { query: tab ? { tab } : {} });
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.on('closed', () => { settingsWin = null; });
}

function setVisible(v) {
  visible = v;
  const all = [barWin, ...Object.values(widgetWins), ...Object.values(noteWins)].filter(Boolean);
  all.forEach((w) => (v ? w.showInactive() : w.hide()));
  buildTrayMenu();
}

// ---------------------------------------------------------------- strings for tray / notifications
const TR = {
  en: { show: 'Show widgets', hide: 'Hide widgets', widgets: 'Widgets', settings: 'Settings…', lock: 'Lock position', top: 'Always on top', mode: 'Layout', bar: 'Sidebar (gadget bar)', free: 'Free-floating', autostart: 'Start with Windows', quit: 'Quit Chrono', refresh: 'Refresh weather',
    names: { analog: 'Analog clock', weather: 'Weather', prayer: 'Prayer times', calendar: 'Calendar', digital: 'Digital clock', world: 'World time', notes: 'Sticky notes', calc: 'Calculator' },
    pray: { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' }, itsTime: (n) => `It is time for ${n}`, inMin: (n, m) => `${n} in ${m} minutes` },
  ar: { show: 'إظهار الودجات', hide: 'إخفاء الودجات', widgets: 'الودجات', settings: 'الإعدادات…', lock: 'تثبيت المواضع', top: 'دائماً في المقدمة', mode: 'طريقة العرض', bar: 'شريط جانبي', free: 'ودجات حرة', autostart: 'التشغيل مع ويندوز', quit: 'إغلاق Chrono', refresh: 'تحديث الطقس',
    names: { analog: 'ساعة عقارب', weather: 'الطقس', prayer: 'مواقيت الصلاة', calendar: 'التقويم', digital: 'ساعة رقمية', world: 'التوقيت العالمي', notes: 'ملاحظات لاصقة', calc: 'آلة حاسبة' },
    pray: { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' }, itsTime: (n) => `حان الآن موعد صلاة ${n}`, inMin: (n, m) => `باقي ${m} دقيقة على ${n}` }
};
const tr = () => TR[settings.lang === 'ar' ? 'ar' : 'en'];

function buildTrayMenu() {
  if (!tray) return;
  const t = tr();
  const patch = (p) => applyPatch(p, 'tray');
  const menu = Menu.buildFromTemplate([
    { label: visible ? t.hide : t.show, click: () => setVisible(!visible) },
    { type: 'separator' },
    { label: t.widgets, submenu: WIDGET_ORDER.map((id) => ({
      label: t.names[id], type: 'checkbox', checked: !!settings.enabled[id],
      click: (mi) => patch({ enabled: { [id]: mi.checked } })
    })) },
    { label: t.mode, submenu: [
      { label: t.bar, type: 'radio', checked: settings.mode === 'bar', click: () => patch({ mode: 'bar' }) },
      { label: t.free, type: 'radio', checked: settings.mode === 'free', click: () => patch({ mode: 'free' }) }
    ] },
    { label: t.lock, type: 'checkbox', checked: !!settings.locked, click: (mi) => patch({ locked: mi.checked }) },
    { label: t.top, type: 'checkbox', checked: !!settings.alwaysOnTop, click: (mi) => patch({ alwaysOnTop: mi.checked }) },
    { label: t.autostart, type: 'checkbox', checked: !!settings.autostart, click: (mi) => patch({ autostart: mi.checked }) },
    { type: 'separator' },
    { label: t.refresh, click: () => refreshWeather() },
    { label: t.settings, click: () => openSettings() },
    { type: 'separator' },
    { label: t.quit, click: () => { quitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip('Chrono');
}

function createTray() {
  let img = nativeImage.createFromPath(path.join(__dirname, 'src', 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'));
  if (process.platform !== 'win32') img = img.resize({ width: 22, height: 22 });
  tray = new Tray(img);
  tray.on('click', () => setVisible(!visible));
  tray.on('double-click', () => openSettings());
  buildTrayMenu();
}

// ---------------------------------------------------------------- settings plumbing
function broadcast(channel, ...args) {
  BrowserWindow.getAllWindows().forEach((w) => { if (!w.isDestroyed()) w.webContents.send(channel, ...args); });
}

function applyAutostart() {
  try { app.setLoginItemSettings({ openAtLogin: !!settings.autostart, args: [] }); } catch (e) { /* not supported (Linux dev) */ }
}

function applyPatch(patch, from) {
  const before = windowSig();
  const locBefore = JSON.stringify(settings.location);
  const prayerBefore = JSON.stringify([settings.prayer, settings.location]);
  deepMerge(settings, patch);
  writeJson('settings', settings);
  applyAutostart();
  broadcast('settings:changed', settings, from);
  if (windowSig() !== before) rebuildWindows(); else buildTrayMenu();
  if (JSON.stringify(settings.location) !== locBefore) refreshWeather();
  if (JSON.stringify([settings.prayer, settings.location]) !== prayerBefore) firedToday = {};
  return settings;
}

ipcMain.handle('settings:get', () => settings);
ipcMain.handle('settings:patch', (_e, patch, from) => applyPatch(patch, from));
ipcMain.handle('settings:reset', (_e, from) => {
  settings = clone(DEFAULTS); writeJson('settings', settings); applyAutostart();
  broadcast('settings:changed', settings, from); rebuildWindows(); refreshWeather(); return settings;
});
ipcMain.handle('state:get', () => ({ barCollapsed: state.barCollapsed }));

// notes live outside settings so typing never re-renders other widgets
ipcMain.handle('notes:get', () => notes);
ipcMain.handle('notes:set', (e, list, from) => {
  notes = Array.isArray(list) ? list : notes; writeJson('notes', notes);
  BrowserWindow.getAllWindows().forEach((w) => { if (!w.isDestroyed() && w.webContents !== e.sender) w.webContents.send('notes:changed', notes, from); });
  return true;
});
ipcMain.on('notes:popout', (_e, noteId) => {
  if (!state.popouts.includes(noteId)) state.popouts.push(noteId);
  writeJson('state', state); createNoteWindow(noteId);
});

// ---------------------------------------------------------------- weather
async function refreshWeather() {
  try {
    const data = await weatherLib.fetchWeather((u) => net.fetch(u), settings.location);
    weatherCache = data; writeJson('weather', data);
    broadcast('weather:changed', data);
    return data;
  } catch (e) {
    console.error('weather refresh failed:', e.message);
    broadcast('weather:error', String(e.message));
    return weatherCache;
  }
}
ipcMain.handle('weather:get', () => weatherCache);
ipcMain.handle('weather:refresh', () => refreshWeather());
ipcMain.handle('geo:search', async (_e, q, lang) => {
  try { return await weatherLib.searchCity((u) => net.fetch(u), String(q || '').trim(), lang); }
  catch (e) { return { error: e.message }; }
});

// ---------------------------------------------------------------- prayer
ipcMain.handle('prayer:get', (_e, offsetDays) => {
  const day = new Date(Date.now() + (Number(offsetDays) || 0) * 86400000);
  const r = prayerLib.compute(settings.location, settings.prayer, day);
  r.next = prayerLib.nextPrayer(settings.location, settings.prayer, new Date());
  r.methods = prayerLib.METHODS;
  return r;
});
ipcMain.handle('prayer:methods', () => prayerLib.METHODS);

let firedToday = {};
let firedDay = '';
function prayerTick() {
  try {
    const now = new Date();
    const dayKey = now.toDateString();
    if (dayKey !== firedDay) { firedDay = dayKey; firedToday = {}; }
    if (!settings.prayer.notify || !Notification.isSupported()) return;
    const r = prayerLib.compute(settings.location, settings.prayer, now);
    const t = tr();
    prayerLib.ORDER.forEach((k) => {
      if (k === 'sunrise') return;
      const at = new Date(r.times[k]).getTime();
      const diff = now.getTime() - at;
      if (diff >= 0 && diff < 60000 && !firedToday[k + ':now']) {
        firedToday[k + ':now'] = true;
        new Notification({ title: 'Chrono', body: t.itsTime(t.pray[k]), icon: appIcon }).show();
      }
      const before = Number(settings.prayer.remindBefore) || 0;
      const until = at - now.getTime();
      if (before > 0 && until > 0 && until <= before * 60000 && until > (before - 1) * 60000 - 20000 && !firedToday[k + ':pre']) {
        firedToday[k + ':pre'] = true;
        new Notification({ title: 'Chrono', body: t.inMin(t.pray[k], before), icon: appIcon, silent: true }).show();
      }
    });
  } catch (e) { console.error('prayer tick failed', e.message); }
}

// ---------------------------------------------------------------- window / ui IPC
ipcMain.on('ui:size', (e, w, h) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || win === barWin || win === settingsWin || !(w > 0) || !(h > 0)) return;
  const id = Object.keys(widgetWins).find((k) => widgetWins[k] === win);
  const s = id ? scaleFor(id) : scale();
  const nw = Math.round(w * s); const nh = Math.round(h * s);
  const [cw, ch] = win.getContentSize();
  if (Math.abs(cw - nw) > 1 || Math.abs(ch - nh) > 1) win.setContentSize(nw, nh);
});
ipcMain.on('ui:hide-widget', (_e, id) => { if (settings.enabled[id]) applyPatch({ enabled: { [id]: false } }, 'ui'); });
ipcMain.on('ui:open-settings', (_e, tab) => openSettings(tab));
ipcMain.on('ui:close-self', (e) => { const w = BrowserWindow.fromWebContents(e.sender); if (w) w.close(); });
ipcMain.on('bar:collapse', (_e, collapsed) => {
  state.barCollapsed = !!collapsed; writeJson('state', state);
  if (barWin) { barWin.setBounds(barBounds(state.barCollapsed)); barWin.webContents.send('bar:collapsed', state.barCollapsed); }
});

// ---------------------------------------------------------------- lifecycle
app.on('second-instance', () => { if (!visible) setVisible(true); else openSettings(); });
app.on('window-all-closed', (e) => { if (!quitting) e.preventDefault(); });
app.on('before-quit', () => { quitting = true; });

app.whenReady().then(() => {
  createTray();
  applyAutostart();
  rebuildWindows();
  state.popouts.forEach(createNoteWindow);
  if (weatherCache) setTimeout(() => broadcast('weather:changed', weatherCache), 800);
  refreshWeather();
  setInterval(refreshWeather, 30 * 60 * 1000);
  setInterval(prayerTick, 15 * 1000);
  powerMonitor.on('resume', () => setTimeout(refreshWeather, 4000));
  screen.on('display-metrics-changed', () => { if (settings.mode === 'bar' && barWin) barWin.setBounds(barBounds(state.barCollapsed)); });
  if (process.argv.includes('--settings')) openSettings();
});
