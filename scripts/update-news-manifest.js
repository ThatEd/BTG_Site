#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — News Manifest Builder (Node)
   Scans the Site/news folder for article JSON files and regenerates:
     • news/manifest.json  → { "articles": [ "file.json", ... ] }
     • news/index.json     → [ "key", ... ]  (F1CC-compatible array of keys)
   The news page reads either format (index.json first, manifest fallback).

   Usage:
     node Site/scripts/update-news-manifest.js
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.resolve(__dirname, '..');
const NEWS_ROOT = path.join(SITE_ROOT, 'news');

// Files that are indexes, not articles.
const SKIP = new Set(['manifest.json', 'index.json']);

if (!fs.existsSync(NEWS_ROOT)) {
  console.error('news/ folder not found:', NEWS_ROOT);
  process.exit(1);
}

const files = fs
  .readdirSync(NEWS_ROOT)
  .filter((f) => /\.json$/i.test(f) && !SKIP.has(f))
  .sort();

const manifest = { articles: files };
const index = files.map((f) => f.replace(/\.json$/i, ''));

fs.writeFileSync(
  path.join(NEWS_ROOT, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n'
);
fs.writeFileSync(
  path.join(NEWS_ROOT, 'index.json'),
  JSON.stringify(index, null, 2) + '\n'
);

console.log('News manifest updated:', files.length, 'article(s)');
console.log('  manifest.json ->', manifest.articles.join(', ') || '(empty)');
console.log('  index.json    ->', index.join(', ') || '(empty)');
