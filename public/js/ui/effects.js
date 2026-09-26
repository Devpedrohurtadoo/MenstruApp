// Decorative motion: floating petals in the background and a small celebration burst.
// Both respect prefers-reduced-motion and the in-app "reduce motion" preference, pause when
// the tab is hidden and cap the device pixel ratio to save battery.

import { prefersReducedMotion } from '../core/dom.js';

/** @type {{ stop: () => void, setLevel: (n: number) => void } | null} */
let particles = null;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} level 0 (off) … 3
 */
export function startParticles(canvas, level) {
  particles?.stop();
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let intensity = level;
  let raf = 0;
  let running = true;
  let last = 0;
  // Soft, blurry petals don't need retina resolution: 1× keeps each frame cheap.
  const dpr = 1;
  const FRAME_MS = 1000 / 30;
  /** @type {Array<{ x: number, y: number, r: number, vy: number, vx: number, rot: number, vr: number, a: number, petal: boolean }>} */
  let items = [];
  const resize = () => {
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    const count = Math.round(Math.min(60, (innerWidth * innerHeight) / 26_000) * (intensity / 2 + 0.25));
    items = Array.from({ length: intensity ? count : 0 }, () => spawn(true));
  };
  const spawn = (/** @type {boolean} */ anywhere) => ({
    x: Math.random() * innerWidth,
    y: anywhere ? Math.random() * innerHeight : -12,
    r: 2 + Math.random() * 4.5,
    vy: 0.15 + Math.random() * 0.35,
    vx: (Math.random() - 0.5) * 0.25,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.01,
    a: 0.08 + Math.random() * 0.16,
    petal: Math.random() > 0.4,
  });
  const color = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e0668f';
  let fill = color();
  const frame = (/** @type {number} */ now) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    // ~30 fps is plenty for slow ambient motion and halves the work.
    if (now - last < FRAME_MS) return;
    const steps = last ? Math.min(3, (now - last) / (1000 / 60)) : 1;
    last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = fill;
    for (const p of items) {
      p.y += p.vy * (0.6 + intensity * 0.3) * steps;
      p.x += p.vx * steps;
      p.rot += p.vr * steps;
      if (p.y > innerHeight + 12) Object.assign(p, spawn(false));
      ctx.globalAlpha = p.a;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      if (p.petal) ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
      else ctx.arc(0, 0, p.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };
  const onVisibility = () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (running && intensity && !prefersReducedMotion()) raf = requestAnimationFrame(frame);
  };
  const begin = () => {
    cancelAnimationFrame(raf);
    fill = color();
    resize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    last = 0;
    if (intensity && !prefersReducedMotion()) raf = requestAnimationFrame(frame);
  };
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);
  // Decoration never competes with the first render: start once the browser is idle.
  const idle = /** @type {any} */ (window).requestIdleCallback ?? ((/** @type {() => void} */ cb) => setTimeout(cb, 1200));
  idle(() => running && begin(), { timeout: 2500 });
  particles = {
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    setLevel(n) {
      intensity = n;
      running = true;
      begin();
    },
  };
}

/** @param {number} level */
export function setParticleLevel(level) {
  particles?.setLevel(level);
}

/** Short celebratory burst of petals (skipped with reduced motion). */
export function celebrate() {
  if (prefersReducedMotion()) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'celebrate';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.remove();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const styles = getComputedStyle(document.documentElement);
  const palette = [styles.getPropertyValue('--accent').trim() || '#e0668f', '#f7b4c9', '#b9a2f5', '#ffd08a', '#8fd8c5'];
  const cx = innerWidth / 2;
  const cy = innerHeight * 0.4;
  const parts = Array.from({ length: 70 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 6;
    return { x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3, r: 3 + Math.random() * 4, rot: Math.random() * 6, c: palette[Math.floor(Math.random() * palette.length)] };
  });
  const start = performance.now();
  const frame = (/** @type {number} */ now) => {
    const t = (now - start) / 1300;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.18;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += 0.1;
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = p.c;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (t < 1) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
