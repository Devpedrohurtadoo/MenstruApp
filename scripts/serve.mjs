#!/usr/bin/env node
// Local development server that behaves like the Netlify deploy:
//  - serves public/ with the exact headers from public/_headers (CSP, Trusted Types, HSTS…)
//  - routes /api/* to netlify/functions/api.mjs with an in-memory store
//  - no dependencies. Usage: node scripts/serve.mjs [--port 8888] [--root <dir>]

import http from 'node:http';
import zlib from 'node:zlib';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// --root serves another copy of public/ (the e2e update test publishes a "new version" there).
const argRoot = process.argv.indexOf('--root');
const PUBLIC = argRoot > -1 ? path.resolve(process.argv[argRoot + 1]) : path.join(ROOT, 'public');
const argPort = process.argv.indexOf('--port');
const PORT = Number(argPort > -1 ? process.argv[argPort + 1] : (process.env.PORT ?? 8888));
process.env.MENSTRUAPP_STORE ??= 'memory';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

/** Parses Netlify's _headers format into [{ pattern, headers }]. */
async function loadHeaderRules() {
  const text = await fs.readFile(path.join(PUBLIC, '_headers'), 'utf8').catch(() => '');
  /** @type {Array<{ pattern: string, headers: Array<[string, string]> }>} */
  const rules = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) rules.push({ pattern: line.trim(), headers: [] });
    else {
      const i = line.indexOf(':');
      rules.at(-1)?.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
    }
  }
  return rules;
}

/** @param {string} pattern @param {string} pathname */
function matches(pattern, pathname) {
  if (pattern.endsWith('*')) return pathname.startsWith(pattern.slice(0, -1));
  return pattern === pathname;
}

const api = (await import(path.join(ROOT, 'netlify/functions/api.mjs'))).default;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const request = new Request(url, { method: req.method, headers: /** @type {any} */ (req.headers), body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body });
      const response = await api(request, { ip: req.socket.remoteAddress });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const file = path.normalize(path.join(PUBLIC, pathname));
    // Inside the served folder only (a bare prefix check would also match "public-x/").
    if (!file.startsWith(PUBLIC + path.sep) || path.basename(file).startsWith('_')) throw Object.assign(new Error('forbidden'), { code: 'ENOENT' });
    const data = await fs.readFile(file);
    /** @type {Record<string, string>} */
    const headers = { 'Content-Type': TYPES[/** @type {keyof typeof TYPES} */ (path.extname(file))] ?? 'application/octet-stream' };
    for (const rule of await loadHeaderRules()) if (matches(rule.pattern, pathname)) for (const [k, v] of rule.headers) headers[k] = v;
    // Compress text like Netlify's CDN does (Brotli when accepted, else gzip).
    const accept = String(req.headers['accept-encoding'] ?? '');
    let body = data;
    if (/^(text\/|application\/(json|manifest|xml))|image\/svg/.test(headers['Content-Type']) && data.length > 1024) {
      if (/\bbr\b/.test(accept)) {
        body = zlib.brotliCompressSync(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
        headers['Content-Encoding'] = 'br';
      } else if (/\bgzip\b/.test(accept)) {
        body = zlib.gzipSync(data);
        headers['Content-Encoding'] = 'gzip';
      }
      headers.Vary = 'Accept-Encoding';
    }
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (err) {
    const notFound = /** @type {any} */ (err)?.code === 'ENOENT' || /** @type {any} */ (err)?.code === 'EISDIR';
    res.writeHead(notFound ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(notFound ? 'Not found' : 'Server error');
  }
});

server.listen(PORT, () => console.log(`Menstruapp dev server → http://localhost:${PORT}`));
