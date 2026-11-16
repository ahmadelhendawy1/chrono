'use strict';
// Builds dist/Chrono-win32-x64/Chrono.exe from any OS, then stamps the Chrono icon + version info into the exe.
const path = require('path'); const fs = require('fs');
const { packager } = require('@electron/packager');
const ResEdit = require('resedit');

(async () => {
  const root = path.join(__dirname, '..');
  const out = path.join(root, 'dist');
  const [appPath] = await packager({
    dir: root, out, overwrite: true, platform: 'win32', arch: 'x64', name: 'Chrono', executableName: 'Chrono',
    prune: true, asar: true, appVersion: require('../package.json').version,
    ignore: [/^\/dist($|\/)/, /^\/test($|\/)/, /^\/scripts($|\/)/, /^\/build\/icon-src\.png$/, /^\/\.git/, /\/\.DS_Store$/]
  });
  const exe = path.join(appPath, 'Chrono.exe');
  let note = 'icon stamped';
  try {
    const buf = fs.readFileSync(exe);
    const ne = ResEdit.NtExecutable.from(buf, { ignoreCert: true });
    const res = ResEdit.NtExecutableResource.from(ne);
    const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(root, 'build', 'icon.ico')));
    const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
    const g = groups[0];
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, g ? g.id : 1, g ? g.lang : 1033, ico.icons.map((i) => i.data));
    const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
    if (vi) {
      vi.setStringValues({ lang: 1033, codepage: 1200 }, { FileDescription: 'Chrono', ProductName: 'Chrono', InternalName: 'Chrono', OriginalFilename: 'Chrono.exe', CompanyName: 'AI4EduTech', LegalCopyright: 'AI4EduTech', ProductVersion: require('../package.json').version, FileVersion: require('../package.json').version });
      vi.outputToResourceEntries(res.entries);
    }
    res.outputResource(ne);
    fs.writeFileSync(exe, Buffer.from(ne.generate()));
  } catch (e) { note = 'icon NOT stamped: ' + e.message; }
  console.log('Built:', exe, '(' + note + ')');
})().catch((e) => { console.error(e); process.exit(1); });
