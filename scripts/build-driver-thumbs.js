// ═══════════════════════════════════════════════════════════════════════════
//  Generate small webp thumbnails for driver photos.
//
//  logos/drivers/*.png are ~1254x1254 / ~1.5MB each, but the site only ever
//  shows them small (driver page hero ~76px). Downloading the full PNG every
//  time a driver is opened is the single slowest part of the page, so this
//  writes a 256px webp per photo into logos/drivers/thumbs/. driverPhotoImg
//  prefers the thumb and falls back to the original only when a thumb is
//  missing. Run with:  npm run thumbs
// ═══════════════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const srcDir = path.join(__dirname, '..', 'logos', 'drivers');
const outDir = path.join(srcDir, 'thumbs');
fs.mkdirSync(outDir, { recursive: true });

const SIZE = 256; // plenty for a 76px hero (2x retina = 152px)
const files = fs.readdirSync(srcDir).filter(function (f) { return /\.png$/i.test(f); });

let saved = 0, before = 0, skipped = 0;
(async () => {
  for (const f of files) {
    const src = path.join(srcDir, f);
    const base = f.replace(/\.png$/i, '');
    const out = path.join(outDir, base + '.webp');
    const srcSize = fs.statSync(src).size;
    before += srcSize;
    if (fs.existsSync(out) && fs.statSync(out).size > 0 && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) {
      saved += fs.statSync(out).size;
      skipped++;
      continue;
    }
    const info = await sharp(src)
      .resize(SIZE, SIZE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(out);
    const outSize = fs.statSync(out).size;
    saved += outSize;
    console.log(base + ': ' + (srcSize / 1024).toFixed(0) + 'KB -> ' + (outSize / 1024).toFixed(0) + 'KB webp (' + info.width + 'x' + info.height + ')');
  }
  console.log('\nDone: ' + files.length + ' photos (' + skipped + ' cached). ' + (before / 1048576).toFixed(1) + 'MB -> ' + (saved / 1048576).toFixed(1) + 'MB of thumbs');
})().catch(function (e) { console.error(e); process.exit(1); });
