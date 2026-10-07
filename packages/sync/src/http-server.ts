import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

export interface HttpServerOptions {
  port: number;
  projectPath?: string;
  staticDir?: string;
  onError?: (err: Error) => void;
}

export function createSyncHttpServer(options: HttpServerOptions): http.Server {
  const candidateDirs = [
    options.staticDir,
    path.resolve(process.cwd(), 'apps/canvas-web/dist'),
    path.resolve(__dirname, '../../../apps/canvas-web/dist'),
    path.resolve(__dirname, '../../../../apps/canvas-web/dist'),
    path.resolve(__dirname, '../../apps/canvas-web/dist'),
  ].filter(Boolean) as string[];

  const staticDir = candidateDirs.find((dir) => fs.existsSync(dir) && fs.statSync(dir).isDirectory());

  const httpServer = http.createServer((req, res) => {
     const origin = req.headers.origin;
    if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    const parsedUrl = new URL(req.url || '/', `http://localhost:${options.port}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    if (staticDir) {
      const filePath = path.join(staticDir, pathname === '/' ? 'index.html' : pathname.slice(1));

       if (!filePath.startsWith(staticDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }

       if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        if (req.method === 'GET') {
          fs.createReadStream(filePath).pipe(res);
        } else {
          res.end();
        }
        return;
      }

       const indexPath = path.join(staticDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (req.method === 'GET') {
          fs.createReadStream(indexPath).pipe(res);
        } else {
          res.end();
        }
        return;
      }
    }

    const displayProject = options.projectPath ? path.basename(options.projectPath) : 'in-memory';

     res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Vitra Sync Server</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f111a; color: #cdd6f4; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .box { background: #181825; border: 1px solid #313244; border-radius: 12px; padding: 32px; max-width: 500px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
      h1 { margin-top: 0; color: #89b4fa; font-size: 24px; }
      p { color: #a6adc8; font-size: 14px; line-height: 1.6; }
      code { background: #11111b; padding: 3px 8px; border-radius: 6px; color: #f9e2af; font-family: monospace; }
      .badge { display: inline-block; padding: 4px 10px; background: #a6e3a1; color: #11111b; font-weight: 600; border-radius: 20px; font-size: 12px; margin-bottom: 16px; }
    </style>
  </head>
  <body>
    <div class="box">
      <div class="badge">Vitra Engine Active</div>
      <h1>Vitra Sync Server</h1>
      <p>Listening on <code>ws://localhost:${options.port}</code></p>
      <p>Project: <code>${displayProject}</code></p>
      <p style="font-size: 12px; color: #6c7086; margin-top: 24px;">Canvas web bundle not found. Run <code>pnpm --filter canvas-web build</code> to enable the canvas UI.</p>
    </div>
  </body>
</html>`);
  });

  return httpServer;
}
