// Classic (non-module) script loaded synchronously in <head>: applies the saved theme before
// the first paint so there is no flash of the wrong colours. Keep it tiny and dependency-free.
(function () {
  'use strict';
  const root = document.documentElement;
  let prefs;
  try {
    prefs = JSON.parse(localStorage.getItem('menstruapp:prefs:v1') || '{}') || {};
  } catch {
    prefs = {};
  }
  const systemLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  root.setAttribute('data-theme', prefs.theme === 'light' || prefs.theme === 'dark' ? prefs.theme : systemLight ? 'light' : 'dark');
  if (prefs.motion === 'reduce' || prefs.motion === 'full') root.setAttribute('data-motion', prefs.motion);
  if (prefs.contrast === 'more') root.setAttribute('data-contrast', 'more');
  if (prefs.lang === 'es' || prefs.lang === 'en') root.setAttribute('lang', prefs.lang);
  const scale = Number(prefs.textScale);
  if (scale >= 0.85 && scale <= 1.6) root.style.setProperty('--text-scale', String(scale));
  const bg = prefs.background;
  if (bg && bg.type === 'preset' && /^[a-z]{3,12}$/.test(bg.preset)) root.setAttribute('data-bg', bg.preset);
  else if (bg && bg.type === 'color' && /^#[0-9a-f]{6}$/i.test(bg.color)) {
    root.setAttribute('data-bg', 'color');
    root.style.setProperty('--bg-color', bg.color);
  }
  const accent = /^#[0-9a-f]{6}$/i.test(prefs.accent) ? prefs.accent : null;
  if (accent) {
    root.style.setProperty('--accent', accent);
    const n = parseInt(accent.slice(1), 16);
    const lin = function (c) {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
    // Pick whichever text colour (white or the dark ink #1d1024, luminance ≈ 0.0077) contrasts more.
    root.style.setProperty('--on-accent', (lum + 0.05) / 0.0577 > 1.05 / (lum + 0.05) ? '#1d1024' : '#ffffff');
  }
})();
