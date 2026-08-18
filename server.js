/**
 * BeTheGrid — Simple static file server.
 * Serves the Site/ folder over HTTP so fetch() of JSON data works
 * (file:// protocol blocks XHR/fetch to local files).
 *
 * Usage:  node server.js   → http://localhost:8080
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

function contentType(file) {
  return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  // Normalize URL, default to index.html
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  // API: list series folders under Data/ (auto-discovery)
  if (urlPath === '/api/series') {
    const dataDir = path.join(ROOT, 'Data');
    fs.readdir(dataDir, { withFileTypes: true }, (err, entries) => {
      if (err) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('[]'); return; }
      const series = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(series));
    });
    return;
  }

  // API: list all files (recursive) inside a series folder
  // e.g. /api/series-files?series=XGT
  if (urlPath === '/api/series-files') {
    const url = new URL(req.url, 'http://localhost');
    const series = url.searchParams.get('series');
    if (!series) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end('{"error":"missing series"}'); return; }
    const dir = path.join(ROOT, 'Data', series);
    // A series may exist only in the roster (e.g. F2 has no folder yet) — in
    // that case there are simply no files to list.
    if (!fs.existsSync(dir)) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end('[]');
      return;
    }
    const out = [];
    (function walk(d) {
      fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.isFile()) out.push(path.relative(dir, full).split(path.sep).join('/'));
      });
    })(dir);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(out.sort()));
    return;
  }

  let filePath = path.normalize(path.join(ROOT, urlPath));

  // Prevent path traversal outside ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // Not found — try index.html fallback for clean paths
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    fs.readFile(filePath, (err2, data) => {
      if (err2) { res.writeHead(500); res.end('Server error'); return; }
      res.writeHead(200, { 'Content-Type': contentType(filePath) });
      res.end(data);
    });
  });
});

// Graceful handling if the port is already in use (e.g. F5 launched twice,
// or a dev server is already running). Exit 0 so the preLaunchTask passes
// and the browser simply connects to the existing server.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('Port ' + PORT + ' already in use — using existing server on http://localhost:' + PORT);
    process.exit(0);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log('BeTheGrid server running at http://localhost:' + PORT);
});
