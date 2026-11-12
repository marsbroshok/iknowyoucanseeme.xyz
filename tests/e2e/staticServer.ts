import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Minimal static server for the e2e suite, mimicking GitHub Pages:
 * `dir/` → `dir/index.html`, `dir` → 301 to `dir/`, unknown → 404.
 * Serves the default build (`dist`, no Web3Forms key) on 4325 and the
 * keyed build (`dist-e2e-keyed`) on 4326 from one process, so Playwright
 * starts and stops both together.
 */
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

function serve(root: string, port: number): Promise<void> {
  const base = path.resolve(root);
  if (!fs.existsSync(base)) throw new Error(`[e2e server] Build directory not found: ${base}`);
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    const target = path.normalize(path.join(base, urlPath));
    if (!target.startsWith(base)) {
      res.writeHead(403).end();
      return;
    }
    let file = target;
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!urlPath.endsWith('/')) {
        res.writeHead(301, { Location: `${urlPath}/` }).end();
        return;
      }
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, resolve));
}

await serve('dist-e2e-keyed', 4326);
await serve('dist', 4325);
console.log('[e2e server] dist on :4325, dist-e2e-keyed on :4326');
