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

/**
 * Like ensureContrast(), but against every background the colour may be drawn on (the worst
 * one decides).
 * @param {string} color
 * @param {string[]} backgrounds
 * @param {number} target
 */
export function ensureContrastAll(color, backgrounds, target) {
  const worst = (/** @type {string} */ c) => Math.min(...backgrounds.map((b) => contrastRatio(c, b)));
  if (worst(color) >= target) return color;
  const towardsBlack = backgrounds.reduce((sum, b) => sum + luminance(b), 0) / backgrounds.length > 0.4;
  const c = hexToRgb(color);
  for (let i = 1; i <= 40; i++) {
    const f = i / 40;
    const candidate = towardsBlack
      ? toHex({ r: c.r * (1 - f), g: c.g * (1 - f), b: c.b * (1 - f) })
      : toHex({ r: c.r + (255 - c.r) * f, g: c.g + (255 - c.g) * f, b: c.b + (255 - c.b) * f });
    if (worst(candidate) >= target) return candidate;
  }
  return towardsBlack ? '#000000' : '#ffffff';
}

/** Source-over compositing of `fg` at `alpha` on an opaque `bg` (what the browser paints). */
function over(/** @type {string} */ fg, /** @type {number} */ alpha, /** @type {string} */ bg) {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  return toHex({ r: f.r * alpha + b.r * (1 - alpha), g: f.g * alpha + b.g * (1 - alpha), b: f.b * alpha + b.b * (1 - alpha) });
}

/**
 * The theme colours text and marks are drawn on (kept in sync with app.css; a unit test checks
 * it). `surface`/`surface2`/`glass` are [colour, alpha] because they are translucent.
 */
export const THEME_TOKENS = {
  dark: {
    bg: '#17111e',
    surface: /** @type {[string, number]} */ (['#ffffff', 0.055]),
    surface2: /** @type {[string, number]} */ (['#ffffff', 0.1]),
    surfaceSolid: '#221a2c',
    surfaceRaised: '#2a2035',
    glass: /** @type {[string, number]} */ (['#1a1322', 0.72]),
    text: '#f7f0fa',
    text2: '#d6c9e0',
    muted: '#ab9bb9',
  },
  light: {
    bg: '#fbf7fb',
    surface: /** @type {[string, number]} */ (['#ffffff', 0.86]),
    surface2: /** @type {[string, number]} */ (['#f5edf6', 1]),
    surfaceSolid: '#ffffff',
    surfaceRaised: '#ffffff',
    glass: /** @type {[string, number]} */ (['#fbf7fb', 0.8]),
    text: '#2a1f33',
    text2: '#493b55',
    muted: '#6b5c78',
  },
};

/** Tints of the background presets (their most saturated points), see app.css. */
const PRESET_TINTS = /** @type {Array<[string | null, number]>} */ ([
  [null, 0.26], // aurora: the accent itself
  ['#8b5cf6', 0.18],
  ['#f7966e', 0.22],
  ['#a78bfa', 0.24],
  ['#38bdf8', 0.18],
  ['#4ade80', 0.14],
  ['#6366f1', 0.2],
  ['#f7b267', 0.12],
]);

/**
 * Every opaque colour the accent can end up on in a theme: page (with each background preset),
 * cards, the tint of selected chips, dialogs, toasts and the tab bar; plus, with a custom
 * background image, the brightest/darkest thing the veil can leave behind.
 * @param {'light' | 'dark'} theme
 * @param {string} accent
 * @param {number | null} imageDim
 */
export function accentBackdrops(theme, accent, imageDim = null) {
  const t = THEME_TOKENS[theme];
  const card = over(t.surface[0], t.surface[1], t.bg);
  // Page, card, a surface-2 inside a card, dialogs/toasts (solid and raised), the tab bar, selected chips.
  const list = [t.bg, card, over(t.surface2[0], t.surface2[1], card), t.surfaceSolid, t.surfaceRaised, over(t.glass[0], t.glass[1], t.bg), over(accent, 0.16, card)];
  for (const [tint, alpha] of PRESET_TINTS) list.push(over(tint ?? accent, alpha, t.bg));
  if (imageDim !== null) list.push(theme === 'dark' ? over('#000000', imageDim, '#ffffff') : over('#ffffff', imageDim, '#000000'));
  return list;
}

/**
 * Colours derived from the accent: text in the accent colour (4.5:1 on everything it is drawn
 * on), UI marks such as focus rings, selected borders and switches (3:1), the fill of accent
 * buttons with its text colour (4.5:1; a mid-tone custom accent is nudged so that one of them
 * works), and which way the hover state must move to keep that contrast.
 * @param {string} accent
 * @param {'light' | 'dark'} theme
 * @param {number | null} [imageDim]
 */
export function accentColors(accent, theme, imageDim = null) {
  const backdrops = accentBackdrops(theme, accent, imageDim);
  const onAccent = contrastRatio('#ffffff', accent) >= contrastRatio('#1d1024', accent) ? '#ffffff' : '#1d1024';
  return {
    text: ensureContrastAll(accent, backdrops, 4.6),
    ui: ensureContrastAll(accent, backdrops, 3.1),
    fill: ensureContrast(accent, onAccent, 4.6),
    onAccent,
    hoverMix: onAccent === '#ffffff' ? '#000000' : '#ffffff',
  };
}

/** Minimum dimming of a custom background image (below it, text over it is not readable). */
export const MIN_IMAGE_DIM = 0.7;

/**
 * A custom solid background colour, adjusted (towards the theme's own background) until every
 * text colour of the theme stays readable on it, cards included.
 * @param {string} color
 * @param {'light' | 'dark'} theme
 */
export function readableBackground(color, theme) {
  const t = THEME_TOKENS[theme];
  const ok = (/** @type {string} */ c) => [c, over(t.surface[0], t.surface[1], c)].every((b) => contrastRatio(t.muted, b) >= 4.5 && contrastRatio(t.text, b) >= 7);
  if (ok(color)) return color;
  const target = hexToRgb(theme === 'dark' ? '#000000' : '#ffffff');
  const c = hexToRgb(color);
  for (let i = 1; i <= 40; i++) {
    const f = i / 40;
    const candidate = toHex({ r: c.r + (target.r - c.r) * f, g: c.g + (target.g - c.g) * f, b: c.b + (target.b - c.b) * f });
    if (ok(candidate)) return candidate;
  }
  return t.bg;
}

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
  const ratio = contrastRatio(accent, THEME_TOKENS[theme].bg);
  const colors = accentColors(accent, theme);
  return { ratio: Math.round(ratio * 10) / 10, adjusted: colors.text !== accent || colors.ui !== accent, textColor: colors.text };
}

/** @type {string | null} */
let bgObjectUrl = null;
/** @type {IDBDatabase | null} */
let currentDb = null;

/**
 * @param {import('../data/prefs.js').Prefs} prefs
 * @param {IDBDatabase | null} [db] needed to load a custom background image
 */
export async function applyTheme(prefs, db = null) {
  if (db) currentDb = db;
  const el = root();
  const theme = resolvedTheme(prefs);
  el.dataset.theme = theme;
  const bg = prefs.background;
  const imageDim = bg.type === 'image' ? Math.max(MIN_IMAGE_DIM, bg.dim) : null;
  const colors = accentColors(prefs.accent, theme, imageDim);
  el.style.setProperty('--accent', colors.fill);
  el.style.setProperty('--on-accent', colors.onAccent);
  el.style.setProperty('--accent-text', colors.text);
  el.style.setProperty('--accent-ui', colors.ui);
  el.style.setProperty('--hover-mix', colors.hoverMix);
  el.style.setProperty('--text-scale', String(prefs.textScale));
  if (prefs.motion === 'system') delete el.dataset.motion;
  else el.dataset.motion = prefs.motion;
  if (prefs.contrast === 'more') el.dataset.contrast = 'more';
  else delete el.dataset.contrast;

  el.style.setProperty('--bg-dim', String(imageDim ?? bg.dim));
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
    el.style.setProperty('--bg-color', readableBackground(bg.color, theme));
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
    // Everything contrast-dependent (accent text, background colour) is recomputed for the new theme.
    if (prefs.theme === 'auto') applyTheme(prefs, currentDb);
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
