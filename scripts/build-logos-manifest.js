#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — Logo Manifest Builder (Node)

   Lists every image file under Site DB/logos/ and writes
   logos/logos-manifest.json so the admin team-logo picker auto-populates
   even on static hosts (GitHub Pages) that have no /api/team-logos endpoint.

   Runs automatically on push to logos/** and on a daily schedule via
   .github/workflows/update-logos-manifest.yml. Also usable locally:
     node scripts/build-logos-manifest.js

   Output:
     logos/logos-manifest.json
       { generatedAt, logos: ["teams/Haas.png", "mini/Redbull.png", "f1.png", ...] }
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.resolve(process.env.BTG_SITE_ROOT || (function () {
  var local = path.join(__dirname, '..', '..', 'Site DB');
  return fs.existsSync(local) ? local : path.join(__dirname, '..');
})());
const LOGOS_DIR = path.join(SITE_ROOT, 'logos');
const OUT_FILE = path.join(LOGOS_DIR, 'logos-manifest.json');
const IMG_EXT = ['.png', '.webp', '.svg', '.jpg', '.jpeg', '.gif'];

const logos = [];
(function walk(d, rel) {
  if (!fs.existsSync(d)) return;
  fs.readdirSync(d, { withFileTypes: true }).forEach(function (e) {
    var full = path.join(d, e.name);
    var r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) walk(full, r);
    else if (e.isFile() && IMG_EXT.indexOf(path.extname(e.name).toLowerCase()) !== -1) {
      logos.push(r.split(path.sep).join('/'));
    }
  });
})(LOGOS_DIR, '');

fs.writeFileSync(OUT_FILE, JSON.stringify({
  generatedAt: new Date().toISOString(),
  logos: logos.sort()
}, null, 2));
console.log('Wrote ' + logos.length + ' logo paths to ' + OUT_FILE);
