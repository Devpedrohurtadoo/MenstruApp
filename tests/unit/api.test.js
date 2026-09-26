import { describe, it, expect, beforeEach, vi } from 'vitest';

process.env.MENSTRUAPP_STORE = 'memory';

const sent = [];
vi.mock('web-push', () => ({
  default: {
    sendNotification: vi.fn(async (sub, payload) => {
      sent.push({ endpoint: sub.endpoint, payload });
      if (sub.endpoint.includes('gone')) throw Object.assign(new Error('gone'), { statusCode: 410 });
      return { statusCode: 201 };
    }),
  },
}));

const { default: api } = await import('../../netlify/functions/api.mjs');
const { dispatch } = await import('../../netlify/functions/push-dispatch.mjs');
const { cleanup } = await import('../../netlify/functions/cleanup.mjs');
const { resetMemoryStores } = await import('../../netlify/functions/lib/store.mjs');
const { resetRateLimits } = await import('../../netlify/functions/lib/http.mjs');
const { isAllowedEndpoint } = await import('../../netlify/functions/lib/push.mjs');

const TOKEN = 'A'.repeat(43);
const TOKEN2 = 'B'.repeat(43);
const blob = { iv: 'AAAAAAAAAAAAAAAA', ct: 'Q2lwaGVydGV4dA==' };
const P256 = 'B' + 'x'.repeat(86); // 87 chars, like a real uncompressed P-256 key in base64url
const AUTH = 'y'.repeat(22);

/**
 * @param {string} path
 * @param {{ method?: string, token?: string, body?: any, headers?: Record<string, string>, raw?: string }} [o]
 */
async function call(path, o = {}) {
  /** @type {Record<string, string>} */
  const headers = { host: 'app.test', ...(o.headers ?? {}) };
  if (o.token) headers.authorization = `Bearer ${o.token}`;
  let body;
  if (o.raw !== undefined) body = o.raw;
  else if (o.body !== undefined) {
    body = JSON.stringify(o.body);
    headers['content-type'] = 'application/json';
  }
  const res = await api(new Request(`https://app.test${path}`, { method: o.method ?? 'GET', headers, body }), { ip: '203.0.113.7' });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null, headers: res.headers };
}

beforeEach(() => {
  resetMemoryStores();
  resetRateLimits();
  sent.length = 0;
  process.env.VAPID_PUBLIC_KEY = 'BPublicKeyForTests';
  process.env.VAPID_PRIVATE_KEY = 'private';
  process.env.VAPID_SUBJECT = 'mailto:privacy@example.org';
});

describe('health and hardening', () => {
  it('reports capabilities with strict headers', async () => {
    const r = await call('/api/health');
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true, push: true, sync: true, share: true });
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('content-security-policy')).toContain("default-src 'none'");
    delete process.env.VAPID_PRIVATE_KEY;
    expect((await call('/api/health')).json.push).toBe(false);
  });

  it('rejects cross-site requests', async () => {
    expect((await call('/api/health', { headers: { origin: 'https://evil.example' } })).status).toBe(403);
    expect((await call('/api/health', { headers: { origin: 'https://app.test', 'sec-fetch-site': 'cross-site' } })).status).toBe(403);
    expect((await call('/api/health', { headers: { origin: 'https://app.test', 'sec-fetch-site': 'same-origin' } })).status).toBe(200);
  });

  it('requires well-formed bearer tokens', async () => {
    expect((await call('/api/sync')).status).toBe(401);
    expect((await call('/api/sync', { token: 'short' })).status).toBe(401);
    expect((await call('/api/sync', { headers: { authorization: `Basic ${TOKEN}` } })).status).toBe(401);
  });

  it('rejects wrong content types, malformed JSON and oversized bodies', async () => {
    expect((await call('/api/sync', { method: 'PUT', token: TOKEN, raw: '{}', headers: { 'content-type': 'text/plain' } })).status).toBe(415);
    expect((await call('/api/sync', { method: 'PUT', token: TOKEN, raw: '{nope', headers: { 'content-type': 'application/json' } })).status).toBe(400);
    expect((await call('/api/sync', { method: 'PUT', token: TOKEN, raw: '[1]', headers: { 'content-type': 'application/json' } })).status).toBe(400);
    const huge = { iv: blob.iv, ct: 'A'.repeat(6_000_000), baseVersion: 0 };
    expect((await call('/api/sync', { method: 'PUT', token: TOKEN, body: huge })).status).toBe(413);
  });

  it('answers unknown routes with 404 and never leaks internals', async () => {
    const r = await call('/api/nope');
    expect(r.status).toBe(404);
    expect(r.json).toEqual({ error: 'not-found' });
    expect((await call('/api/share/a/b/c')).status).toBe(404);
  });

  it('rate-limits abusive clients', async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await call('/api/share', { method: 'POST', body: {} })).status;
    expect(last).toBe(429);
  });
});

describe('/api/sync', () => {
  it('stores one encrypted snapshot with optimistic concurrency', async () => {
    expect((await call('/api/sync', { token: TOKEN })).status).toBe(404);
    const first = await call('/api/sync', { method: 'PUT', token: TOKEN, body: { ...blob, baseVersion: 0 } });
    expect(first).toMatchObject({ status: 200, json: { version: 1 } });
    const got = await call('/api/sync', { token: TOKEN });
    expect(got.json).toEqual({ ...blob, version: 1 });
    // A stale writer gets 409 with the current version.
    const stale = await call('/api/sync', { method: 'PUT', token: TOKEN, body: { ...blob, baseVersion: 0 } });
    expect(stale).toMatchObject({ status: 409, json: { error: 'conflict', version: 1 } });
    expect((await call('/api/sync', { method: 'PUT', token: TOKEN, body: { ...blob, baseVersion: 1 } })).json.version).toBe(2);
    // Tokens are isolated.
    expect((await call('/api/sync', { token: TOKEN2 })).status).toBe(404);
    expect((await call('/api/sync', { method: 'DELETE', token: TOKEN })).status).toBe(204);
    expect((await call('/api/sync', { token: TOKEN })).status).toBe(404);
  });

  it('only accepts base64 ciphertext', async () => {
    const r = await call('/api/sync', { method: 'PUT', token: TOKEN, body: { iv: '<script>', ct: 'x', baseVersion: 0 } });
    expect(r.status).toBe(400);
    expect((await call('/api/sync', { method: 'PUT', token: TOKEN, body: { ...blob, baseVersion: -1 } })).status).toBe(400);
  });
});

describe('/api/push', () => {
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: P256, auth: AUTH } };

  it('only allows known push services (no SSRF)', () => {
    expect(isAllowedEndpoint('https://fcm.googleapis.com/fcm/send/x')).toBe(true);
    expect(isAllowedEndpoint('https://web.push.apple.com/abc')).toBe(true);
    expect(isAllowedEndpoint('https://wns2-par02p.notify.windows.com/w/?token=x')).toBe(true);
    expect(isAllowedEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true);
    expect(isAllowedEndpoint('http://fcm.googleapis.com/x')).toBe(false);
    expect(isAllowedEndpoint('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isAllowedEndpoint('https://fcm.googleapis.com.evil.example/x')).toBe(false);
    expect(isAllowedEndpoint('https://user:pw@fcm.googleapis.com/x')).toBe(false);
    expect(isAllowedEndpoint('https://fcm.googleapis.com:8443/x')).toBe(false);
  });

  it('exposes the VAPID public key only when configured', async () => {
    expect((await call('/api/push/key')).json).toEqual({ publicKey: 'BPublicKeyForTests' });
    delete process.env.VAPID_PUBLIC_KEY;
    expect((await call('/api/push/key')).status).toBe(404);
  });

  it('registers devices, stores encrypted schedules and sends due reminders', async () => {
    expect((await call('/api/push/subscription', { method: 'PUT', token: TOKEN, body: { subscription: { ...subscription, endpoint: 'https://evil.example/x' } } })).status).toBe(400);
    expect((await call('/api/push/schedule', { method: 'PUT', token: TOKEN, body: { items: [] } })).status).toBe(404);
    expect((await call('/api/push/subscription', { method: 'PUT', token: TOKEN, body: { subscription } })).status).toBe(204);
    const now = Date.now();
    const payload = JSON.stringify(blob);
    const items = [
      { at: now + 60_000, payload },
      { at: now + 3_600_000, payload },
      { at: now + 400 * 86_400_000, payload }, // too far: dropped
      { at: now, payload: 'not json' },
    ];
    expect((await call('/api/push/schedule', { method: 'PUT', token: TOKEN, body: { items } })).status).toBe(400);
    expect((await call('/api/push/schedule', { method: 'PUT', token: TOKEN, body: { items: items.slice(0, 3) } })).status).toBe(204);

    // Nothing is due yet.
    expect((await dispatch({ now })).sent).toBe(0);
    const first = await dispatch({ now: now + 61_000 });
    expect(first).toMatchObject({ devices: 1, sent: 1 });
    expect(sent[0]).toEqual({ endpoint: subscription.endpoint, payload });
    // Nothing is sent twice.
    expect((await dispatch({ now: now + 62_000 })).sent).toBe(0);
    // The next one goes out when due.
    expect((await dispatch({ now: now + 3_600_000 })).sent).toBe(1);
    expect((await call('/api/push', { method: 'DELETE', token: TOKEN })).status).toBe(204);
    expect((await dispatch({ now: now + 7_200_000 })).devices).toBe(0);
  });

  it('forgets subscriptions the push service reports as gone', async () => {
    const gone = { ...subscription, endpoint: 'https://fcm.googleapis.com/fcm/send/gone' };
    await call('/api/push/subscription', { method: 'PUT', token: TOKEN, body: { subscription: gone } });
    const now = Date.now();
    await call('/api/push/schedule', { method: 'PUT', token: TOKEN, body: { items: [{ at: now + 1000, payload: JSON.stringify(blob) }] } });
    expect((await dispatch({ now: now + 2000 })).removed).toBe(1);
    expect((await dispatch({ now: now + 3000 })).devices).toBe(0);
  });
});

describe('/api/share', () => {
  const id = 'abcdefghijklmnop1234';

  it('creates, reads and revokes read-only encrypted summaries', async () => {
    const expiresAt = Date.now() + 7 * 86_400_000;
    const created = await call('/api/share', { method: 'POST', body: { id, ...blob, expiresAt, deleteToken: TOKEN } });
    expect(created.status).toBe(201);
    expect((await call('/api/share', { method: 'POST', body: { id, ...blob, expiresAt, deleteToken: TOKEN } })).status).toBe(409);
    const got = await call(`/api/share/${id}`);
    expect(got.json).toEqual({ ...blob, expiresAt });
    expect(got.json).not.toHaveProperty('deleteHash');
    expect((await call(`/api/share/${id}`, { method: 'DELETE', token: TOKEN2 })).status).toBe(403);
    expect((await call(`/api/share/${id}`, { method: 'DELETE', token: TOKEN })).status).toBe(204);
    expect((await call(`/api/share/${id}`)).status).toBe(404);
  });

  it('enforces expiry limits and expires links', async () => {
    const tooLong = Date.now() + 40 * 86_400_000;
    expect((await call('/api/share', { method: 'POST', body: { id, ...blob, expiresAt: tooLong, deleteToken: TOKEN } })).status).toBe(400);
    expect((await call('/api/share', { method: 'POST', body: { id: 'short', ...blob, expiresAt: Date.now() + 1000, deleteToken: TOKEN } })).status).toBe(400);
    await call('/api/share', { method: 'POST', body: { id, ...blob, expiresAt: Date.now() + 50, deleteToken: TOKEN } });
    await new Promise((r) => setTimeout(r, 80));
    expect((await call(`/api/share/${id}`)).status).toBe(410);
    expect((await call(`/api/share/${id}`)).status).toBe(404);
  });

  it('cleans up expired data on schedule', async () => {
    await call('/api/share', { method: 'POST', body: { id, ...blob, expiresAt: Date.now() + 60_000, deleteToken: TOKEN } });
    await call('/api/sync', { method: 'PUT', token: TOKEN, body: { ...blob, baseVersion: 0 } });
    const later = Date.now() + 401 * 86_400_000;
    expect(await cleanup({ now: later })).toEqual({ share: 1, sync: 1, push: 0 });
  });
});
