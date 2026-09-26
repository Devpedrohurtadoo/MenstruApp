// Web Push helpers: VAPID configuration, subscription validation (with an allowlist of push
// services to prevent SSRF) and sending already-encrypted payloads.

import webpush from 'web-push';
import { HttpError } from './http.mjs';

/** Known browser push services. Anything else is rejected (no requests to arbitrary hosts). */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/,
  /^[a-z0-9-]+\.push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

export function vapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? '';
  const subject = process.env.VAPID_SUBJECT ?? '';
  if (!publicKey || !privateKey || !/^(mailto:|https:\/\/)/.test(subject)) return null;
  return { publicKey, privateKey, subject };
}

/** @param {string} endpoint */
export function isAllowedEndpoint(endpoint) {
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return false;
  return PUSH_HOSTS.some((re) => re.test(url.hostname));
}

/**
 * Validates and normalises a PushSubscription JSON.
 * @param {any} sub
 * @returns {{ endpoint: string, keys: { p256dh: string, auth: string } }}
 */
export function validateSubscription(sub) {
  if (!sub || typeof sub !== 'object') throw new HttpError(400, 'invalid-subscription');
  const endpoint = typeof sub.endpoint === 'string' ? sub.endpoint : '';
  const p256dh = typeof sub.keys?.p256dh === 'string' ? sub.keys.p256dh : '';
  const auth = typeof sub.keys?.auth === 'string' ? sub.keys.auth : '';
  if (endpoint.length > 1024 || !isAllowedEndpoint(endpoint)) throw new HttpError(400, 'invalid-endpoint');
  if (!B64URL.test(p256dh) || p256dh.length < 80 || p256dh.length > 100) throw new HttpError(400, 'invalid-subscription');
  if (!B64URL.test(auth) || auth.length < 16 || auth.length > 32) throw new HttpError(400, 'invalid-subscription');
  return { endpoint, keys: { p256dh, auth } };
}

/**
 * Sends one encrypted reminder. Returns 'gone' when the subscription no longer exists.
 * @param {{ endpoint: string, keys: { p256dh: string, auth: string } }} subscription
 * @param {string} payload
 * @param {{ publicKey: string, privateKey: string, subject: string }} vapid
 * @returns {Promise<'sent' | 'gone' | 'failed'>}
 */
export async function sendPush(subscription, payload, vapid) {
  if (!isAllowedEndpoint(subscription.endpoint)) return 'gone';
  try {
    await webpush.sendNotification(subscription, payload, {
      TTL: 6 * 3600,
      urgency: 'normal',
      timeout: 8000,
      vapidDetails: vapid,
    });
    return 'sent';
  } catch (err) {
    const status = /** @type {any} */ (err)?.statusCode;
    if (status === 404 || status === 410) return 'gone';
    return 'failed';
  }
}
