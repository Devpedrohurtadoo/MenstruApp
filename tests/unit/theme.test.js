// Colour guarantees of the theme engine (WCAG 2.2: 4.5:1 for text, 3:1 for UI marks), for every
// built-in accent, both themes, custom background colours and background photos.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { THEME_TOKENS, accentColors, accentBackdrops, contrastRatio, readableBackground, MIN_IMAGE_DIM } from '../../public/js/ui/theme.js';
import { ACCENTS } from '../../public/js/data/prefs.js';

const css = fs.readFileSync('public/css/app.css', 'utf8');

/** Custom properties declared in the block that starts with `selector {`. @param {string} selector */
function tokensOf(selector) {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThan(-1);
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

/** '#rrggbb' or 'rgb(r g b / a)' → [hex, alpha]. @param {string} value */
function colour(value) {
  const rgb = /^rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)$/.exec(value);
  if (!rgb) return [value, 1];
  const hex = `#${[rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
  return [hex, rgb[4] === undefined ? 1 : Number(rgb[4])];
}

describe('theme tokens', () => {
  it('mirror the colours declared in app.css', () => {
    for (const [theme, selector] of /** @type {const} */ ([
      ['dark', ":root,\n[data-theme='dark']"],
      ['light', "[data-theme='light']"],
    ])) {
      const declared = tokensOf(selector);
      const t = THEME_TOKENS[theme];
      expect(declared.bg).toBe(t.bg);
      expect(colour(declared.surface)).toEqual(t.surface);
      expect(colour(declared['surface-2'])).toEqual(t.surface2);
      expect(declared['surface-solid']).toBe(t.surfaceSolid);
      expect(declared['surface-raised']).toBe(t.surfaceRaised);
      expect(colour(declared.glass)).toEqual(t.glass);
      expect(declared.text).toBe(t.text);
      expect(declared['text-2']).toBe(t.text2);
      expect(declared.muted).toBe(t.muted);
    }
  });
});

describe('accent colours', () => {
  for (const theme of /** @type {const} */ (['dark', 'light'])) {
    for (const [name, accent] of [...Object.entries(ACCENTS), ['custom-yellow', '#ffe066'], ['custom-navy', '#1b2a4a'], ['custom-grey', '#8a8a8a']]) {
      it(`${name} (${theme}): text 4.5:1 and marks 3:1 on every surface, buttons readable at rest and on hover`, () => {
        const c = accentColors(accent, theme);
        for (const b of accentBackdrops(theme, accent)) {
          expect(contrastRatio(c.text, b), `text on ${b}`).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(c.ui, b), `ui on ${b}`).toBeGreaterThanOrEqual(3);
        }
        expect(contrastRatio(c.onAccent, c.fill)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe('backgrounds', () => {
  it('adjusts a custom background colour until all text is readable on it', () => {
    for (const theme of /** @type {const} */ (['dark', 'light'])) {
      const t = THEME_TOKENS[theme];
      for (const colour of ['#ffffff', '#000000', '#ff0000', '#808080', '#f0e0f0', '#241a2e', '#3355ff']) {
        const bg = readableBackground(colour, theme);
        expect(contrastRatio(t.text, bg), `${theme} ${colour}→${bg}`).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(t.muted, bg), `${theme} ${colour}→${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('dims photos enough for text over any pixel (secondary text included)', () => {
    for (const theme of /** @type {const} */ (['dark', 'light'])) {
      const t = THEME_TOKENS[theme];
      for (const pixel of [0, 128, 255]) {
        // The veil is black (dark theme) or white (light theme) at MIN_IMAGE_DIM opacity.
        const veil = theme === 'dark' ? 0 : 255;
        const v = Math.round(veil * MIN_IMAGE_DIM + pixel * (1 - MIN_IMAGE_DIM));
        const hex = `#${v.toString(16).padStart(2, '0').repeat(3)}`;
        expect(contrastRatio(t.text, hex), `${theme} pixel ${pixel}`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(t.text2, hex), `${theme} pixel ${pixel}`).toBeGreaterThanOrEqual(4.5);
        for (const accent of Object.values(ACCENTS)) expect(contrastRatio(accentColors(accent, theme, MIN_IMAGE_DIM).text, hex)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
