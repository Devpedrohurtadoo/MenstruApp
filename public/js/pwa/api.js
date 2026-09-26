// Tiny fetch wrapper for the optional Netlify Functions backend (same origin only).

export class ApiError extends Error {
  /** @param {number} status @param {string} code */
  constructor(status, code) {
    super(`API ${status}: ${code}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * @param {string} path e.g. "/api/health"
 * @param {{ method?: string, token?: string, body?: any, timeoutMs?: number, headers?: Record<string, string> }} [opts]
 */
export async function api(path, opts = {}) {
  if (!path.startsWith('/api/')) throw new Error('Only same-origin /api/ paths are allowed');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);
  /** @type {Record<string, string>} */
  const headers = { Accept: 'application/json', ...(opts.headers ?? {}) };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(path, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
    });
    const text = await res.text();
    /** @type {any} */
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) throw new ApiError(res.status, json?.error ?? 'error');
    return { status: res.status, json, etag: res.headers.get('ETag') };
  } finally {
    clearTimeout(timer);
  }
}

/** @returns {Promise<{ push: boolean, sync: boolean, share: boolean }>} */
export async function serverFeatures() {
  try {
    const { json } = await api('/api/health', { timeoutMs: 5000 });
    return { push: Boolean(json?.push), sync: Boolean(json?.sync), share: Boolean(json?.share) };
  } catch {
    return { push: false, sync: false, share: false };
  }
}
