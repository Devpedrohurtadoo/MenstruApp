// HTTP helpers shared by the functions: JSON responses with strict headers, bounded body
// parsing, bearer-token hashing, origin checks and a best-effort in-memory rate limiter.

import { createHash, timingSafeEqual } from 'node:crypto';

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cross-Origin-Resource-Policy': 'same-origin',
};

export class HttpError extends Error {
  /** @param {number} status @param {string} code */
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

/**
 * @param {number} status
 * @param {any} [body]
 * @param {Record<string, string>} [headers]
 */
export function json(status, body, headers = {}) {
  return new Response(body === undefined || status === 204 ? null : JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...headers } });
}

/** @param {HttpError | Error} err */
export function errorResponse(err) {
  if (err instanceof HttpError) {
    /** @type {Record<string, string>} */
    const extra = err.status === 429 ? { 'Retry-After': '60' } : {};
    return json(err.status, { error: err.code }, extra);
  }
  // Never leak internals (and never log request bodies or tokens).
  console.error('[api] unexpected error:', err?.name ?? 'Error');
  return json(500, { error: 'internal' });
}

/**
 * Reads and parses a JSON body with a hard size limit.
 * @param {Request} req
 * @param {number} maxBytes
 */
export async function readJson(req, maxBytes) {
  const type = req.headers.get('content-type') ?? '';
  if (!/^application\/json\b/i.test(type)) throw new HttpError(415, 'unsupported-media-type');
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > maxBytes) throw new HttpError(413, 'too-large');
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) throw new HttpError(413, 'too-large');
  try {
    const value = JSON.parse(text);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('shape');
    return value;
  } catch {
    throw new HttpError(400, 'invalid-json');
  }
}

export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** SHA-256 hex digest of a token: the server never stores raw tokens. @param {string} token */
export function hashToken(token) {
  return createHash('sha256').update(`menstruapp:${token}`).digest('hex');
}

/** @param {string} a @param {string} b */
export function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Extracts and validates "Authorization: Bearer <43-char base64url token>".
 * @param {Request} req
 */
export function bearer(req) {
  const m = /^Bearer ([A-Za-z0-9_-]+)$/.exec(req.headers.get('authorization') ?? '');
  if (!m || !TOKEN_RE.test(m[1])) throw new HttpError(401, 'unauthorized');
  return m[1];
}

/**
 * Rejects cross-site browser requests (defence in depth; the API uses no cookies).
 * @param {Request} req
 */
export function checkOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'forbidden-origin');
  }
  if (originHost !== host) throw new HttpError(403, 'forbidden-origin');
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') throw new HttpError(403, 'forbidden-origin');
}

/** Fixed-window limiter per client and bucket (per function instance, best effort). */
const windows = new Map();
/**
 * @param {string} client
 * @param {string} bucket
 * @param {number} limit requests per minute
 */
export function rateLimit(client, bucket, limit) {
  const now = Date.now();
  const key = `${bucket}:${client}`;
  const w = windows.get(key);
  if (!w || now - w.start > 60_000) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 20_000) for (const [k, v] of windows) if (now - v.start > 60_000) windows.delete(k);
    return;
  }
  w.count++;
  if (w.count > limit) throw new HttpError(429, 'rate-limited');
}

/** Test helper. */
export function resetRateLimits() {
  windows.clear();
}
