import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

 let port = 4400;
const portIdx = process.argv.indexOf('--port');
if (portIdx !== -1 && process.argv[portIdx + 1]) {
  port = parseInt(process.argv[portIdx + 1], 10) || 4400;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
};

function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);

    if (url.hostname === 'design.penpot.app' || url.hostname === 'app.penpot.app') {
      return true;
    }

    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;


  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const rawPath = req.url?.split('?')[0] || '/';
  const urlPath = rawPath === '/' ? '/index.html' : rawPath;

  const resolvedPath = path.resolve(distDir, '.' + urlPath);
  if (!resolvedPath.startsWith(distDir + path.sep) && resolvedPath !== distDir) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`File not found: ${urlPath}`);
    return;
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(resolvedPath).pipe(res);
});

const HOST = '127.0.0.1';

server.listen(port, HOST, () => {
  console.log(`\n⚡ Vitra Penpot Plugin Server running at:`);
  console.log(`   ➜  Plugin URL:  http://${HOST}:${port}/manifest.json`);
  console.log(`   ➜  Plugin JS:   http://${HOST}:${port}/plugin.js`);
  console.log(`   ➜  Plugin UI:   http://${HOST}:${port}/index.html`);
  console.log(`   ➜  Network:     Bound to loopback (${HOST})`);
  console.log(`   ➜  CORS:        Scoped to Penpot & Localhost origins\n`);
  console.log(`  In Penpot Web (design.penpot.app):`);
  console.log(`   1. Press Ctrl + Alt + P (or click Menu -> Plugins Manager)`);
  console.log(`   2. In the modal, paste: http://${HOST}:${port}/manifest.json`);
  console.log(`   3. Click Install and launch the plugin!\n`);
});

if (port === 4400) {
  const fallbackServer = http.createServer((req, res) => {

    server.emit('request', req, res);
  });
  fallbackServer.on('error', () => {});
  fallbackServer.listen(4000, HOST, () => {
    console.log(`   (Also listening on fallback port: http://${HOST}:4000/manifest.json)`);
  });
}
