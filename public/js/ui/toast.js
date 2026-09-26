import { h } from '../core/dom.js';
import { icon } from './icons.js';

/** @type {HTMLElement | null} */
let container = null;

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  // One live region that exists before any toast is added; toasts themselves carry no live
  // role (nested live regions would be read twice).
  container = h('div', { class: 'toasts', 'aria-live': 'polite', 'aria-relevant': 'additions' });
  document.body.append(container);
  return container;
}

/**
 * @param {string} message
 * @param {{ type?: 'info' | 'success' | 'error', duration?: number, action?: { label: string, onClick: () => void } }} [opts]
 */
export function toast(message, opts = {}) {
  const type = opts.type ?? 'info';
  const box = ensureContainer();
  const iconName = type === 'success' ? 'circle-check' : type === 'error' ? 'circle-alert' : 'info';
  const el = h(
    'div',
    { class: ['toast', `toast--${type}`] },
    icon(iconName, { size: 18 }),
    h('span', { class: 'toast__text', text: message }),
    opts.action
      ? h('button', {
          type: 'button',
          class: 'toast__action',
          text: opts.action.label,
          onClick: () => {
            opts.action?.onClick();
            dismiss();
          },
        })
      : null,
  );
  const dismiss = () => {
    el.classList.add('toast--out');
    setTimeout(() => el.remove(), 200);
  };
  box.append(el);
  while (box.children.length > 3) box.firstElementChild?.remove();
  // Time to read and act (WCAG 2.2.1): longer with an action, paused while hovered or focused.
  let remaining = opts.duration ?? (opts.action ? 10_000 : 4000);
  let started = Date.now();
  let timer = setTimeout(dismiss, remaining);
  const pause = () => {
    clearTimeout(timer);
    remaining -= Date.now() - started;
  };
  const resume = () => {
    started = Date.now();
    clearTimeout(timer);
    timer = setTimeout(dismiss, Math.max(2000, remaining));
  };
  el.addEventListener('mouseenter', pause);
  el.addEventListener('mouseleave', resume);
  el.addEventListener('focusin', pause);
  el.addEventListener('focusout', resume);
  return dismiss;
}
