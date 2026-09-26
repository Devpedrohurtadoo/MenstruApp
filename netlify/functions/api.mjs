// Menstruapp optional backend (Netlify Functions v2). It never receives readable health data:
//  - /api/sync    one end-to-end encrypted snapshot per sync code (optimistic concurrency).
//  - /api/push    push subscription + encrypted reminder schedule per device (capability token).
//  - /api/share   read-only encrypted summaries with expiry; the key lives in the URL fragment.
// Tokens are 256-bit random values held by the client; only their SHA-256 is stored.

import { openStore } from './lib/store.mjs';
import { json, errorResponse, readJson, bearer, hashToken, safeEqual, checkOrigin, rateLimit, HttpError, TOKEN_RE } from './lib/http.mjs';
import { vapidConfig, validateSubscription } from './lib/push.mjs';

export const VERSION = '3.0.0';
const MAX_SYNC_BYTES = 5_500_000;
const MAX_SHARE_BYTES = 600_000;
const MAX_SCHEDULE_BYTES = 400_000;
const SHARE_MAX_DAYS = 30;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const SHARE_ID = /^[A-Za-z0-9_-]{16,64}$/;

/** @param {Request} req @param {any} [context] */
function clientId(req, context) {
  return context?.ip ?? req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

/** @param {any} v @param {number} max */
const isB64 = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max && B64.test(v);

/** @param {any} body @param {number} maxCt */
function encryptedBlob(body, maxCt) {
  if (!body || typeof body !== 'object' || !isB64(body.iv, 24) || !isB64(body.ct, maxCt)) throw new HttpError(400, 'invalid-payload');
  return { iv: body.iv, ct: body.ct };
}

// ------------------------------------------------------------------------------ sync

/** @param {Request} req */
async function sync(req) {
  const store = openStore('sync');
  const key = `s/${hashToken(bearer(req))}`;
  if (req.method === 'GET') {
    const entry = await store.get(key);
    if (!entry) throw new HttpError(404, 'not-found');
    return json(200, { iv: entry.data.iv, ct: entry.data.ct, version: entry.data.version }, { ETag: entry.etag });
  }
  if (req.method === 'PUT') {
    const body = await readJson(req, MAX_SYNC_BYTES);
    const blob = encryptedBlob(body, MAX_SYNC_BYTES);
    const baseVersion = Number.isInteger(body.baseVersion) && body.baseVersion >= 0 ? body.baseVersion : -1;
    if (baseVersion < 0) throw new HttpError(400, 'invalid-version');
    const current = await store.get(key);
    const currentVersion = current ? Number(current.data.version) || 0 : 0;
    if (currentVersion !== baseVersion) return json(409, { error: 'conflict', version: currentVersion });
    const version = currentVersion + 1;
    const record = { ...blob, version, updatedAt: Date.now() };
    const result = current ? await store.set(key, record, { onlyIfMatch: current.etag }) : await store.set(key, record, { onlyIfNew: true });
    if (!result.modified) return json(409, { error: 'conflict' });
    return json(200, { version });
  }
  if (req.method === 'DELETE') {
    await store.delete(key);
    return json(204);
  }
  throw new HttpError(405, 'method-not-allowed');
}

// ------------------------------------------------------------------------------ push

/** @param {Request} req @param {string} sub */
async function push(req, sub) {
  if (sub === 'key' && req.method === 'GET') {
    const vapid = vapidConfig();
    if (!vapid) throw new HttpError(404, 'push-disabled');
    return json(200, { publicKey: vapid.publicKey }, { 'Cache-Control': 'public, max-age=3600' });
  }
  if (!vapidConfig()) throw new HttpError(404, 'push-disabled');
  const store = openStore('push');
  const key = `d/${hashToken(bearer(req))}`;

  if (sub === 'subscription' && req.method === 'PUT') {
    const body = await readJson(req, 4096);
    const subscription = validateSubscription(body.subscription);
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await store.get(key);
      const record = { subscription, items: current?.data.items ?? [], sentUntil: current?.data.sentUntil ?? Date.now(), updatedAt: Date.now() };
      const r = current ? await store.set(key, record, { onlyIfMatch: current.etag }) : await store.set(key, record, { onlyIfNew: true });
      if (r.modified) return json(204);
    }
    throw new HttpError(409, 'conflict');
  }

  if (sub === 'schedule' && req.method === 'PUT') {
    const body = await readJson(req, MAX_SCHEDULE_BYTES);
    if (!Array.isArray(body.items) || body.items.length > 200) throw new HttpError(400, 'invalid-items');
    const now = Date.now();
    const items = body.items
      .map((/** @type {any} */ it) => ({ at: it?.at, payload: it?.payload }))
      .filter(
        (/** @type {any} */ it) =>
          Number.isInteger(it.at) && it.at > now - 3600_000 && it.at < now + 62 * 86_400_000 && typeof it.payload === 'string' && it.payload.length <= 1500,
      )
      .sort((/** @type {any} */ a, /** @type {any} */ b) => a.at - b.at);
    for (const it of items) {
      let parsed;
      try {
        parsed = JSON.parse(it.payload);
      } catch {
        throw new HttpError(400, 'invalid-payload');
      }
      encryptedBlob(parsed, 1200);
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await store.get(key);
      if (!current) throw new HttpError(404, 'not-found');
      const r = await store.set(key, { ...current.data, items, updatedAt: now }, { onlyIfMatch: current.etag });
      if (r.modified) return json(204);
    }
    throw new HttpError(409, 'conflict');
  }

  if (sub === '' && req.method === 'DELETE') {
    await store.delete(key);
    return json(204);
  }
  throw new HttpError(404, 'not-found');
}

// ------------------------------------------------------------------------------ share

/** @param {Request} req @param {string} id */
async function share(req, id) {
  const store = openStore('share');
  if (!id && req.method === 'POST') {
    const body = await readJson(req, MAX_SHARE_BYTES);
    if (!SHARE_ID.test(body.id ?? '')) throw new HttpError(400, 'invalid-id');
    if (!TOKEN_RE.test(body.deleteToken ?? '')) throw new HttpError(400, 'invalid-token');
    const blob = encryptedBlob(body, MAX_SHARE_BYTES);
    const now = Date.now();
    const expiresAt = Number(body.expiresAt);
    if (!Number.isInteger(expiresAt) || expiresAt <= now || expiresAt > now + SHARE_MAX_DAYS * 86_400_000 + 60_000) throw new HttpError(400, 'invalid-expiry');
    const r = await store.set(`x/${body.id}`, { ...blob, expiresAt, createdAt: now, deleteHash: hashToken(body.deleteToken) }, { onlyIfNew: true });
    if (!r.modified) throw new HttpError(409, 'exists');
    return json(201, { id: body.id, expiresAt });
  }
  if (!SHARE_ID.test(id)) throw new HttpError(404, 'not-found');
  const key = `x/${id}`;
  if (req.method === 'GET') {
    const entry = await store.get(key);
    if (!entry) throw new HttpError(404, 'not-found');
    if (entry.data.expiresAt <= Date.now()) {
      await store.delete(key);
      throw new HttpError(410, 'expired');
    }
    return json(200, { iv: entry.data.iv, ct: entry.data.ct, expiresAt: entry.data.expiresAt }, { 'X-Robots-Tag': 'noindex, nofollow' });
  }
  if (req.method === 'DELETE') {
    const token = bearer(req);
    const entry = await store.get(key);
    if (!entry) return json(204);
    if (!safeEqual(entry.data.deleteHash, hashToken(token))) throw new HttpError(403, 'forbidden');
    await store.delete(key);
    return json(204);
  }
  throw new HttpError(405, 'method-not-allowed');
}

// ------------------------------------------------------------------------------ router

/**
 * @param {Request} req
 * @param {any} [context] Netlify context (ip, geo…); unused beyond rate limiting.
 */
export default async function handler(req, context) {
  try {
    checkOrigin(req);
    const url = new URL(req.url);
    const parts = url.pathname.replace(/^\/api\/?/, '').split('/');
    const [area, sub = ''] = parts;
    if (parts.length > 2) throw new HttpError(404, 'not-found');
    const client = clientId(req, context);
    rateLimit(client, 'all', 120);

    if (area === 'health' && req.method === 'GET') {
      return json(200, {
        ok: true,
        version: VERSION,
        push: Boolean(vapidConfig()),
        sync: process.env.MENSTRUAPP_DISABLE_SYNC !== '1',
        share: process.env.MENSTRUAPP_DISABLE_SHARE !== '1',
      });
    }
    if (area === 'sync' && !sub) {
      if (process.env.MENSTRUAPP_DISABLE_SYNC === '1') throw new HttpError(404, 'sync-disabled');
      rateLimit(client, 'sync', 30);
      return await sync(req);
    }
    if (area === 'push') {
      rateLimit(client, 'push', 30);
      return await push(req, sub);
    }
    if (area === 'share') {
      if (process.env.MENSTRUAPP_DISABLE_SHARE === '1') throw new HttpError(404, 'share-disabled');
      // Creating links is limited tightly; revoking must always go through (bulk "revoke all").
      if (req.method === 'GET') rateLimit(client, 'share-read', 60);
      else if (req.method === 'DELETE') rateLimit(client, 'share-delete', 120);
      else rateLimit(client, 'share-write', 10);
      return await share(req, sub);
    }
    throw new HttpError(404, 'not-found');
  } catch (err) {
    return errorResponse(/** @type {Error} */ (err));
  }
}

export const config = {
  path: ['/api/*'],
  rateLimit: {
    windowLimit: 300,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
