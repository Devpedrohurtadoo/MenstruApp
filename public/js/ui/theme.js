// Applies appearance preferences: light/dark theme, accent colour (with automatic contrast
// correction), background (preset gradient, solid colour or the user's own image), text size,
// motion and contrast. Everything goes through CSS custom properties (CSP-safe CSSOM).

import { get } from '../data/idb.js';

const root = () => document.documentElement;

/** @param {string} hex */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** @param {{ r: number, g: number, b: number }} c */
function toHex({ r, g, b }) {
  return `#${[r, g, b].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('')}`;
}

/** WCAG relative luminance. @param {string} hex */
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = (/** @type {number} */ c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** @param {string} a @param {string} b */
export function contrastRatio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/**
 * Darkens/lightens a colour until it reaches the target contrast against a background.
 * @param {string} color
 * @param {string} background
 * @param {number} target
 */
export function ensureContrast(color, background, target = 4.5) {
  if (contrastRatio(color, background) >= target) return color;
  const towardsBlack = luminance(background) > 0.4;
  const c = hexToRgb(color);
  for (let i = 1; i <= 20; i++) {
    const f = i / 20;
    const candidate = towardsBlack
      ? toHex({ r: c.r * (1 - f), g: c.g * (1 - f), b: c.b * (1 - f) })
      : toHex({ r: c.r + (255 - c.r) * f, g: c.g + (255 - c.g) * f, b: c.b + (255 - c.b) * f });
    if (contrastRatio(candidate, background) >= target) return candidate;
  }
  return towardsBlack ? '#000000' : '#ffffff';
}

/** Surface colours the accent is drawn on, per theme (kept in sync with app.css). */
const SURFACES = { light: '#fbf7fb', dark: '#17111e' };

/** @param {import('../data/prefs.js').Prefs} prefs */
export function resolvedTheme(prefs) {
  if (prefs.theme === 'light' || prefs.theme === 'dark') return prefs.theme;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * Accent diagnostics for the appearance settings (warn about low-contrast picks).
 * @param {string} accent
 * @param {'light' | 'dark'} theme
 */
export function accentReport(accent, theme) {
  const surface = SURFACES[theme];
  const ratio = contrastRatio(accent, surface);
  return { ratio: Math.round(ratio * 10) / 10, adjusted: ratio < 3, textColor: ensureContrast(accent, surface, 4.5) };
}

/** @type {string | null} */
let bgObjectUrl = null;

/**
 * @param {import('../data/prefs.js').Prefs} prefs
 * @param {IDBDatabase | null} [db] needed to load a custom background image
 */
export async function applyTheme(prefs, db = null) {
  const el = root();
  const theme = resolvedTheme(prefs);
  el.dataset.theme = theme;
  el.style.setProperty('--accent', prefs.accent);
  const onAccent = contrastRatio('#ffffff', prefs.accent) >= contrastRatio('#1d1024', prefs.accent) ? '#ffffff' : '#1d1024';
  el.style.setProperty('--on-accent', onAccent);
  el.style.setProperty('--accent-text', ensureContrast(prefs.accent, SURFACES[theme], 4.5));
  el.style.setProperty('--text-scale', String(prefs.textScale));
  if (prefs.motion === 'system') delete el.dataset.motion;
  else el.dataset.motion = prefs.motion;
  if (prefs.contrast === 'more') el.dataset.contrast = 'more';
  else delete el.dataset.contrast;

  const bg = prefs.background;
  el.style.setProperty('--bg-dim', String(bg.dim));
  if (bg.type === 'image' && db) {
    const blob = await get(db, 'blobs', 'background').catch(() => null);
    if (blob instanceof Blob) {
      if (bgObjectUrl) URL.revokeObjectURL(bgObjectUrl);
      bgObjectUrl = URL.createObjectURL(blob);
      el.style.setProperty('--bg-image', `url("${bgObjectUrl}")`);
      el.dataset.bg = 'image';
    } else {
      el.dataset.bg = bg.preset;
    }
  } else if (bg.type === 'color') {
    el.dataset.bg = 'color';
    el.style.setProperty('--bg-color', bg.color);
  } else {
    el.dataset.bg = bg.preset;
  }
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#fbf7fb' : '#17111e');
}

/**
 * Re-applies the theme when the OS switches between light and dark.
 * @param {() => import('../data/prefs.js').Prefs} getPrefs
 */
export function watchSystemTheme(getPrefs) {
  const mq = window.matchMedia?.('(prefers-color-scheme: light)');
  mq?.addEventListener('change', () => {
    const prefs = getPrefs();
    if (prefs.theme === 'auto') root().dataset.theme = resolvedTheme(prefs);
  });
}

/**
 * Resizes and re-encodes a user image for use as background (max 1600px, JPEG ~80%).
 * @param {File} file
 * @returns {Promise<Blob>}
 */
export async function prepareBackgroundImage(file) {
  if (!/^image\/(png|jpe?g|webp|gif|avif|heic|heif)$/i.test(file.type)) throw new Error('unsupported');
  if (file.size > 25 * 1024 * 1024) throw new Error('tooLarge');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode'))), 'image/jpeg', 0.82),
  );
}

/**
 * Small square avatar as a data URL (max 256px).
 * @param {File} file
 */
export async function prepareAvatar(file) {
  if (!/^image\//.test(file.type) || file.size > 25 * 1024 * 1024) throw new Error('unsupported');
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.min(256, side);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.8);
}
