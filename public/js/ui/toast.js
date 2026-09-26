import { h } from '../core/dom.js';
import { icon } from './icons.js';

/** @type {HTMLElement | null} */
let container = null;

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
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
    { class: ['toast', `toast--${type}`], role: type === 'error' ? 'alert' : 'status' },
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
  setTimeout(dismiss, opts.duration ?? (opts.action ? 7000 : 3500));
  return dismiss;
}
