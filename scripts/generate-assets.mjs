#!/usr/bin/env node
// Generates every image asset from the brand artwork (no binary sources to maintain):
//   public/assets/icons/*        favicon, PWA icons (any / maskable / monochrome), apple-touch,
//                                notification badge and home-screen shortcut icons
//   public/assets/splash/*       iOS launch images + <link> tags injected into index.html
//   public/assets/screenshots/*  manifest screenshots rendered from the real app with demo data
// Usage: node scripts/generate-assets.mjs [--skip-screenshots]
// Needs Chromium (Playwright). Set CHROMIUM_PATH to use a specific binary.

/* global document, window */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT_ICONS = path.join(PUBLIC, 'assets/icons');
const OUT_SPLASH = path.join(PUBLIC, 'assets/splash');
const OUT_SHOTS = path.join(PUBLIC, 'assets/screenshots');
const DEFAULT_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync(DEFAULT_CHROME) ? DEFAULT_CHROME : undefined);

const DROP = 'M60 8C60 8 22 50 22 76a38 38 0 0 0 76 0C98 50 60 8 60 8Z';
const MOON = 'M71 58a20 20 0 1 0 0 34a16 16 0 1 1 0-34Z';
const BG_TOP = '#2c1c38';
const BG_BOTTOM = '#17111e';

/**
 * The logo (drop + crescent) centred in a size×size canvas.
 * @param {{ size: number, scale: number, background?: 'rounded' | 'full' | 'circle' | null, mono?: boolean }} o
 */
function logoSvg({ size, scale, background = null, mono = false }) {
  // The drop's bounding box is x 22–98, y 8–114 in a 120-unit box (centre 60, 61).
  const s = (size * scale) / 106;
  const tx = size / 2 - 60 * s;
  const ty = size / 2 - 61 * s;
  const bg =
    background === 'rounded'
      ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>`
      : background === 'full'
        ? `<rect width="${size}" height="${size}" fill="url(#bg)"/>`
        : background === 'circle'
          ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#bg)"/>`
          : '';
  const art = mono
    ? `<mask id="m"><path d="${DROP}" fill="#fff"/><path d="${MOON}" fill="#000"/></mask><rect x="0" y="0" width="120" height="120" fill="#fff" mask="url(#m)"/>`
    : `<path d="${DROP}" fill="url(#drop)"/><path d="${MOON}" fill="#fff" opacity="0.92"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BG_TOP}"/><stop offset="1" stop-color="${BG_BOTTOM}"/></linearGradient>
  <linearGradient id="drop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f59ab8"/><stop offset="1" stop-color="#9a5fd6"/></linearGradient>
</defs>
${bg}<g transform="translate(${tx} ${ty}) scale(${s})">${art}</g>
</svg>`;
}

/** A Lucide icon (from our extracted icon data) in white on an accent circle. */
async function shortcutSvg(/** @type {string} */ name, size = 96) {
  const icons = (await import(path.join(PUBLIC, 'js/ui/icon-data.js'))).default;
  const nodes = /** @type {Array<[string, Record<string, string>]>} */ (icons[name]);
  if (!nodes) throw new Error(`icon ${name} not found`);
  const inner = nodes
    .map(
      ([tag, attrs]) =>
        `<${tag} ${Object.entries(attrs)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ')}/>`,
    )
    .join('');
  const pad = size * 0.27;
  const k = (size - 2 * pad) / 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f08aad"/><stop offset="1" stop-color="#b457c9"/></linearGradient></defs>
<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#g)"/>
<g transform="translate(${pad} ${pad}) scale(${k})" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
</svg>`;
}

/** @param {import('@playwright/test').Page} page @param {string} svg @param {number} size @param {string} file */
async function renderSvg(page, svg, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.locator('svg').screenshot({ path: file, omitBackground: true });
}

// iOS launch images: CSS size × device pixel ratio (portrait).
const SPLASH_DEVICES = [
  [320, 568, 2],
  [375, 667, 2],
  [414, 736, 3],
  [375, 812, 3],
  [414, 896, 2],
  [414, 896, 3],
  [390, 844, 3],
  [428, 926, 3],
  [393, 852, 3],
  [430, 932, 3],
  [402, 874, 3],
  [440, 956, 3],
  [744, 1133, 2],
  [768, 1024, 2],
  [810, 1080, 2],
  [820, 1180, 2],
  [834, 1112, 2],
  [834, 1194, 2],
  [1024, 1366, 2],
];

async function fontFaces() {
  const read = async (/** @type {string} */ f) => (await fs.readFile(path.join(PUBLIC, 'assets/fonts', f))).toString('base64');
  return `@font-face{font-family:'Playfair Display';font-weight:600;src:url(data:font/woff2;base64,${await read('playfair-display-latin-600-normal.woff2')}) format('woff2')}`;
}

/** @param {import('@playwright/test').Browser} browser */
async function renderSplash(browser) {
  await fs.mkdir(OUT_SPLASH, { recursive: true });
  const faces = await fontFaces();
  const links = [];
  /** @type {Map<number, import('@playwright/test').Page>} */
  const pages = new Map();
  for (const [w, h, dpr] of SPLASH_DEVICES) {
    const file = `splash-${w * dpr}x${h * dpr}.png`;
    if (!pages.has(dpr)) pages.set(dpr, await (await browser.newContext({ deviceScaleFactor: dpr })).newPage());
    const page = /** @type {import('@playwright/test').Page} */ (pages.get(dpr));
    await page.setViewportSize({ width: w, height: h });
    const logo = logoSvg({ size: Math.round(Math.min(w, h) * 0.26), scale: 0.9 });
    await page.setContent(`<!doctype html><html><head><style>${faces}
      html,body{margin:0;height:100%}
      body{display:grid;place-content:center;justify-items:center;gap:${Math.round(w * 0.04)}px;
        background:#17111e;}
      span{font-family:'Playfair Display',Georgia,serif;font-weight:600;color:#f7f0fa;font-size:${Math.round(Math.min(w, h) * 0.085)}px;letter-spacing:.01em}
    </style></head><body>${logo}<span>Menstruapp</span></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT_SPLASH, file), scale: 'device' });
    links.push(
      `    <link rel="apple-touch-startup-image" media="screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" href="/assets/splash/${file}" />`,
    );
  }
  for (const p of pages.values()) await p.context().close();
  const indexPath = path.join(PUBLIC, 'index.html');
  const index = await fs.readFile(indexPath, 'utf8');
  const next = index.replace(/<!-- <splash> -->[\s\S]*?<!-- <\/splash> -->/, `<!-- <splash> -->\n${links.join('\n')}\n    <!-- </splash> -->`);
  if (next === index && !index.includes('<!-- <splash> -->')) throw new Error('splash markers not found in index.html');
  await fs.writeFile(indexPath, next);
}

// ------------------------------------------------------------------------------ demo data

const iso = (/** @type {Date} */ d) => d.toISOString().slice(0, 10);
const addDays = (/** @type {string} */ s, /** @type {number} */ n) => iso(new Date(Date.parse(`${s}T00:00:00Z`) + n * 86_400_000));

/** Six realistic cycles ending with today on cycle day 9. */
function demoData(/** @type {string} */ today) {
  const lengths = [29, 27, 30, 28, 29, 28];
  let start = addDays(today, -8 - lengths.reduce((a, b) => a + b, 0));
  /** @type {Record<string, any>} */
  const days = {};
  const cycles = [...lengths, null];
  cycles.forEach((len, ci) => {
    const flows = ['medium', 'heavy', 'medium', 'light', 'spotting'];
    flows.forEach((flow, i) => {
      const d = addDays(start, i);
      if (d > today) return;
      days[d] = { flow, ...(i < 2 ? { symptoms: { cramps: i === 0 ? 2 : 1, ...(ci % 2 ? { fatigue: 1 } : {}) }, moods: i === 0 ? ['sensitive'] : ['calm'], energy: 2 } : {}) };
    });
    if (!len) return;
    const ov = len - 14;
    for (let i = 5; i < len; i++) {
      const d = addDays(start, i);
      if (d > today) break;
      const e = days[d] ?? {};
      if (i >= ov - 3 && i <= ov) e.mucus = i === ov - 1 || i === ov ? 'eggwhite' : 'creamy';
      if (i === ov - 1) e.lh = 'positive';
      if (ci >= lengths.length - 3) {
        e.bbt = Math.round((i <= ov ? 36.35 + ((i * 7) % 5) / 100 : 36.72 + ((i * 3) % 4) / 100) * 100) / 100;
      }
      if (i > len - 5) {
        e.symptoms = { bloating: 1, breastTenderness: 1, ...(i === len - 2 ? { headache: 2 } : {}) };
        e.moods = [i % 2 ? 'irritable' : 'sensitive'];
        e.energy = 2;
      } else if (i > 6 && i < ov) {
        e.moods = [i % 3 ? 'energetic' : 'happy'];
        e.energy = 4;
      }
      if (i % 4 === 0) e.sleepHours = 7.5;
      if (Object.keys(e).length) days[d] = e;
    }
    start = addDays(start, len);
  });
  days[today] = { ...(days[today] ?? {}), moods: ['happy'], energy: 4, symptoms: undefined };
  return { days };
}

/** @param {number} port */
async function startServer(port) {
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts/serve.mjs'), '--port', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve, reject) => {
    child.stdout.on('data', (b) => String(b).includes('dev server') && resolve(undefined));
    child.on('exit', (c) => reject(new Error(`server exited ${c}`)));
    setTimeout(() => reject(new Error('server timeout')), 10_000);
  });
  return child;
}

/** @param {import('@playwright/test').Browser} browser */
async function renderScreenshots(browser) {
  await fs.mkdir(OUT_SHOTS, { recursive: true });
  const port = 8900 + Math.floor(Math.random() * 90);
  const server = await startServer(port);
  const base = `http://localhost:${port}`;
  try {
    for (const variant of /** @type {const} */ (['narrow', 'wide'])) {
      const narrow = variant === 'narrow';
      const context = await browser.newContext({
        viewport: narrow ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        deviceScaleFactor: narrow ? 2 : 1.25,
        locale: 'es-ES',
        colorScheme: 'dark',
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      await page.goto(`${base}/`, { waitUntil: 'networkidle' });
      await page.check('#consent');
      await page.getByRole('button', { name: 'Empezar' }).click();
      await page.getByRole('radio', { name: /Seguir mi ciclo/ }).click();
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByRole('button', { name: 'No lo recuerdo' }).click();
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.fill('#ob-name', 'Lucía');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByRole('radio', { name: 'Sin bloqueo' }).click();
      await page.check('#none-ack');
      await page.getByRole('button', { name: 'Continuar' }).click();
      await page.getByRole('button', { name: 'Crear mi perfil' }).click();
      await page.getByRole('button', { name: 'Entrar en Menstruapp' }).click();
      const today = await page.evaluate(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      });
      await page.evaluate(async (payload) => {
        const m = await import('/js/app.js');
        await m.importData(payload, 'replace');
      }, demoData(today));
      await page.goto(`${base}/#/home`);
      await page.waitForTimeout(600);
      const dismiss = page.locator('.install-card button[aria-label]').first();
      if (await dismiss.count()) await dismiss.click().catch(() => {});
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT_SHOTS, `home-${variant}.png`) });
      if (narrow) {
        await page.goto(`${base}/#/calendar`);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(OUT_SHOTS, 'calendar-narrow.png') });
      }
      await context.close();
    }
  } finally {
    server.kill();
  }
}

async function main() {
  await fs.mkdir(OUT_ICONS, { recursive: true });
  await fs.writeFile(path.join(OUT_ICONS, 'favicon.svg'), logoSvg({ size: 64, scale: 0.94 }));
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage();
  const icons = [
    ['favicon-32.png', 32, { scale: 0.94 }],
    ['icon-192.png', 192, { scale: 0.6, background: 'rounded' }],
    ['icon-512.png', 512, { scale: 0.6, background: 'rounded' }],
    ['maskable-192.png', 192, { scale: 0.48, background: 'full' }],
    ['maskable-512.png', 512, { scale: 0.48, background: 'full' }],
    ['monochrome-512.png', 512, { scale: 0.62, mono: true }],
    ['apple-touch-icon.png', 180, { scale: 0.6, background: 'full' }],
    ['badge-96.png', 96, { scale: 0.82, mono: true }],
  ];
  for (const [file, size, opts] of /** @type {Array<[string, number, any]>} */ (icons)) {
    await renderSvg(page, logoSvg({ size, ...opts }), size, path.join(OUT_ICONS, file));
  }
  for (const [file, icon] of [
    ['shortcut-log.png', 'plus'],
    ['shortcut-calendar.png', 'calendar'],
    ['shortcut-luna.png', 'message-circle-heart'],
  ]) {
    await renderSvg(page, await shortcutSvg(icon), 96, path.join(OUT_ICONS, file));
  }
  await page.close();
  await renderSplash(browser);
  if (!process.argv.includes('--skip-screenshots')) await renderScreenshots(browser);
  await browser.close();
  console.log('Assets generated: icons, splash screens' + (process.argv.includes('--skip-screenshots') ? '' : ', screenshots'));
}

await main();
