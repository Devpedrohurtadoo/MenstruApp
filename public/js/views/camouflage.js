// Discreet screens:
//  - "Safe screen": the app locks and shows a working calculator. Typing the PIN followed by
//    "=" unlocks it again; with a passphrase, a long press on the display opens the lock screen.
//  - "Guest mode": locks the app and only shows the pieces of information the user allowed.

import { h, replace } from '../core/dom.js';
import { t, fmtDate, fmtNumber } from '../core/i18n.js';
import { button, card } from '../ui/components.js';
import { store, lock, unlock } from '../app.js';

/** @type {null | { nextPeriod: string | null, phase: string | null }} */
let guestSnapshot = null;

export function showCamouflage() {
  lock(/** @type {any} */ ('camouflage'));
}

export function showGuest() {
  const d = store.get().derived;
  const sec = d?.settings.security;
  guestSnapshot = {
    nextPeriod: sec?.guestShowNextPeriod && d?.analysis.prediction ? d.analysis.prediction.nextPeriodStart : null,
    phase: sec?.guestShowPhase && d?.analysis.current?.phase ? d.analysis.current.phase : null,
  };
  lock(/** @type {any} */ ('guest'));
}

/**
 * @param {HTMLElement} root
 * @param {() => void} onExit shows the regular lock screen
 */
export function renderGuest(root, onExit) {
  const snap = guestSnapshot ?? { nextPeriod: null, phase: null };
  guestSnapshot = null;
  replace(
    root,
    h(
      'main',
      { class: 'screen screen--center guest' },
      card({
        title: t('guest.title'),
        headingLevel: 1,
        icon: 'users',
        children: [
          h('p', { class: 'muted', text: t('guest.text') }),
          snap.nextPeriod ? h('p', { class: 'lead', text: t('guest.nextPeriod', { date: fmtDate(snap.nextPeriod, 'long') }) }) : null,
          snap.phase ? h('p', { class: 'lead', text: t('guest.phase', { phase: t(`phases.${snap.phase}`) }) }) : null,
          !snap.nextPeriod && !snap.phase ? h('p', { text: t('guest.nothing') }) : null,
          button({ label: t('guest.exit'), icon: 'lock', variant: 'soft', full: true, onClick: onExit }),
        ],
      }),
    ),
  );
}

/**
 * @param {HTMLElement} root
 * @param {() => void} onExit shows the regular lock screen
 */
export function renderCalculator(root, onExit) {
  const { profiles, prefs } = store.get();
  const profileId = prefs.lastProfileId ?? profiles[0]?.id;
  document.title = t('camouflage.title');
  let display = '0';
  /** @type {number | null} */
  let acc = null;
  /** @type {string | null} */
  let op = null;
  let fresh = true;
  let checking = false;
  const screen = h('output', { class: 'calc__display', 'aria-live': 'polite', text: display });
  let pressTimer = 0;
  // Holding the display for 1.5 s leaves the calculator: with a finger, or holding Enter/Space
  // on it with a keyboard (it is focusable for that).
  screen.tabIndex = 0;
  screen.addEventListener('pointerdown', () => {
    pressTimer = window.setTimeout(onExit, 1500);
  });
  for (const evt of ['pointerup', 'pointerleave', 'pointercancel']) screen.addEventListener(evt, () => clearTimeout(pressTimer));
  screen.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
      e.preventDefault();
      pressTimer = window.setTimeout(onExit, 1500);
    }
  });
  screen.addEventListener('keyup', () => clearTimeout(pressTimer));

  const show = () => {
    const n = Number(display);
    screen.textContent = Number.isFinite(n) && display !== '-' && !display.endsWith('.') ? fmtNumber(n, { maximumFractionDigits: 8 }) : display;
  };
  const compute = (/** @type {number} */ a, /** @type {number} */ b, /** @type {string} */ o) => (o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : b === 0 ? NaN : a / b);
  const press = async (/** @type {string} */ k) => {
    if (/^\d$/.test(k)) {
      display = fresh || display === '0' ? k : (display + k).slice(0, 12);
      fresh = false;
    } else if (k === '.') {
      if (fresh) display = '0.';
      else if (!display.includes('.')) display += '.';
      fresh = false;
    } else if (k === 'C') {
      display = '0';
      acc = null;
      op = null;
      fresh = true;
    } else if (k === '±') {
      display = display.startsWith('-') ? display.slice(1) : `-${display}`;
    } else if (k === '%') {
      display = String(Number(display) / 100);
    } else if (['+', '−', '×', '÷'].includes(k)) {
      const cur = Number(display);
      acc = acc === null || fresh ? cur : compute(acc, cur, /** @type {string} */ (op));
      op = k;
      display = String(Number.isFinite(acc) ? Math.round(acc * 1e8) / 1e8 : 'Error');
      fresh = true;
    } else if (k === '=') {
      if (op === null && /^\d{4,8}$/.test(display) && profileId) {
        if (checking) return; // one PIN check at a time
        checking = true;
        const candidate = display;
        try {
          await unlock(profileId, { type: 'pin', secret: candidate });
          document.title = 'Menstruapp';
          return;
        } catch {
          /* wrong or throttled: keep behaving like a calculator */
        } finally {
          checking = false;
        }
      }
      if (op !== null && acc !== null) {
        const r = compute(acc, Number(display), op);
        display = Number.isFinite(r) ? String(Math.round(r * 1e8) / 1e8) : 'Error';
        acc = null;
        op = null;
        fresh = true;
      }
    }
    show();
  };
  const keys = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '='];
  replace(
    root,
    h(
      'main',
      { class: 'screen calc' },
      h('h1', { class: 'sr-only', text: t('camouflage.title') }),
      screen,
      h(
        'div',
        { class: 'calc__keys' },
        keys.map((k) =>
          h('button', {
            type: 'button',
            class: ['calc__key', /[÷×−+=]/.test(k) ? 'calc__key--op' : '', k === '0' ? 'calc__key--wide' : '', /[C±%]/.test(k) ? 'calc__key--fn' : ''],
            text: k,
            onClick: () => press(k),
          }),
        ),
      ),
    ),
  );
}
