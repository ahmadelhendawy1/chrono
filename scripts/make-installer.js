'use strict';
// Builds dist/installer/Chrono-Setup-<version>.exe - one self-contained Windows installer.
// Uses NSIS (makensis) directly, so no Wine is needed on Linux/macOS.
//   1) node scripts/package-win.js      -> dist/Chrono-win32-x64 (icon stamped into Chrono.exe)
//   2) node scripts/make-installer.js   -> dist/installer/Chrono-Setup-<version>.exe
// Env overrides: CHRONO_APP_DIR (payload folder), MAKENSIS (binary), NSISDIR (NSIS home).
const path = require('path'); const fs = require('fs'); const os = require('os');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const version = require('../package.json').version;
const appDir = process.env.CHRONO_APP_DIR || path.join(root, 'dist', 'Chrono-win32-x64');
const outDir = path.join(root, 'dist', 'installer');
const outFile = path.join(outDir, `Chrono-Setup-${version}.exe`);

function findNsis() {
  if (process.env.MAKENSIS) return { bin: process.env.MAKENSIS, home: process.env.NSISDIR };
  const cache = path.join(os.homedir(), '.cache', 'electron-builder', 'nsis');
  if (fs.existsSync(cache)) {
    for (const d of fs.readdirSync(cache)) {
      const bin = path.join(cache, d, process.platform === 'darwin' ? 'mac' : 'linux', 'makensis');
      if (fs.existsSync(bin)) return { bin, home: path.join(cache, d) };
    }
  }
  return { bin: 'makensis', home: process.env.NSISDIR };
}

if (!fs.existsSync(path.join(appDir, 'Chrono.exe')) && !process.env.CHRONO_APP_DIR) { console.error('Run scripts/package-win.js first.'); process.exit(1); }

// Electron ships ~55 UI-language packs; Chrono only needs English and Arabic (others fall back to English).
const loc = path.join(appDir, 'locales');
if (fs.existsSync(loc) && !process.env.CHRONO_APP_DIR) {
  fs.readdirSync(loc).forEach((f) => { if (!['en-US.pak', 'ar.pak'].includes(f)) fs.rmSync(path.join(loc, f)); });
}

fs.mkdirSync(outDir, { recursive: true });
fs.rmSync(outFile, { force: true });
const nsis = findNsis();
const env = Object.assign({}, process.env);
if (nsis.home) env.NSISDIR = nsis.home;
const args = ['-V2', `-DAPP_DIR=${appDir}`, `-DVERSION=${version}`, `-DOUTFILE=${outFile}`, `-DICON=${path.join(root, 'build', 'icon.ico')}`, path.join(root, 'build', 'installer.nsi')];
console.log('makensis:', nsis.bin);
const r = spawnSync(nsis.bin, args, { env, stdio: 'inherit' });
if (r.status !== 0 || !fs.existsSync(outFile)) { console.error('makensis failed (exit ' + r.status + ')'); process.exit(1); }
console.log('Installer:', outFile, (fs.statSync(outFile).size / 1048576).toFixed(1) + ' MB');
