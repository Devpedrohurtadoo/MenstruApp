// Accessible dialogs and bottom sheets: focus trap, `inert` background, Escape to close,
// focus restoration and Android/iOS back-gesture support (the back button closes the sheet
// instead of leaving the screen).

import { h, trapFocus, focusables, replace } from '../core/dom.js';
import { icon } from './icons.js';
import { t } from '../core/i18n.js';

/** @typedef {{ close: (opts?: { fromHistory?: boolean, result?: any }) => void, el: HTMLElement, body: HTMLElement, closed: Promise<any> }} ModalHandle */

/** @type {Array<{ handle: ModalHandle, pushed: boolean, dismissible: boolean }>} */
const stack = [];
let ignorePops = 0;
/** @type {Array<() => void>} */
let afterBackQueue = [];
let seq = 0;

window.addEventListener('popstate', () => {
  if (ignorePops > 0) {
    ignorePops--;
    const queue = afterBackQueue;
    afterBackQueue = [];
    queue.forEach((fn) => fn());
    return;
  }
  const top = stack[stack.length - 1];
  if (top && top.pushed) {
    top.pushed = false;
    if (top.dismissible) top.handle.close({ fromHistory: true });
    else history.pushState({ menstruModal: ++seq }, '');
  }
});

/** @param {() => void} fn */
function whenHistorySettled(fn) {
  if (ignorePops > 0) afterBackQueue.push(fn);
  else fn();
}

function setBackgroundInert(on) {
  for (const id of ['app', 'particles']) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (on) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }
  // Lower modals in the stack become inert too.
  stack.forEach((entry, i) => {
    if (i < stack.length - 1) entry.handle.el.setAttribute('inert', '');
    else entry.handle.el.removeAttribute('inert');
  });
}

/**
 * @param {{ title: string, content: Node | ((handle: ModalHandle) => Node), footer?: Node | null, variant?: 'sheet' | 'dialog' | 'full',
 *   dismissible?: boolean, onClose?: (result: any) => void, initialFocus?: string, className?: string, describedBy?: string }} opts
 * @returns {ModalHandle}
 */
export function openModal(opts) {
  const id = `modal-${++seq}`;
  const previousFocus = /** @type {HTMLElement | null} */ (document.activeElement);
  // The opener may be re-created while the dialog is open (views re-render on data changes):
  // remember how to find it again.
  const returnKey = previousFocus?.dataset?.fk ?? '';
  const returnId = previousFocus && previousFocus !== document.body ? previousFocus.id : '';
  const dismissible = opts.dismissible ?? true;
  /** @type {(value: any) => void} */
  let resolveClosed = () => {};
  const closed = new Promise((resolve) => (resolveClosed = resolve));
  let isClosed = false;

  const body = h('div', { class: 'modal__body' });
  const titleEl = h('h2', { class: 'modal__title', id: `${id}-title`, text: opts.title });
  const closeBtn = dismissible
    ? h('button', { type: 'button', class: 'icon-btn modal__close', 'aria-label': t('common.close'), onClick: () => handle.close() }, icon('close'))
    : null;
  const panel = h(
    'div',
    {
      class: ['modal__panel', `modal__panel--${opts.variant ?? 'sheet'}`, opts.className ?? ''],
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': `${id}-title`,
      'aria-describedby': opts.describedBy ?? null,
      tabIndex: -1,
    },
    h('div', { class: 'modal__handle', 'aria-hidden': 'true' }),
    h('header', { class: 'modal__header' }, titleEl, closeBtn),
    body,
    opts.footer ? h('footer', { class: 'modal__footer' }, opts.footer) : null,
  );
  const overlay = h('div', {
    class: 'modal__overlay',
    onClick: () => {
      if (dismissible) handle.close();
    },
  });
  const root = h('div', { class: ['modal', `modal--${opts.variant ?? 'sheet'}`], id }, overlay, panel);
  const release = trapFocus(panel);
  /** @param {KeyboardEvent} e */
  const onKey = (e) => {
    if (e.key === 'Escape' && dismissible && stack[stack.length - 1]?.handle === handle) {
      e.stopPropagation();
      handle.close();
    }
  };
  root.addEventListener('keydown', onKey);

  /** @type {ModalHandle} */
  const handle = {
    el: root,
    body,
    closed,
    close({ fromHistory = false, result } = {}) {
      if (isClosed) return;
      isClosed = true;
      const idx = stack.findIndex((s) => s.handle === handle);
      const entry = stack[idx];
      if (idx >= 0) stack.splice(idx, 1);
      if (entry?.pushed && !fromHistory) {
        ignorePops++;
        history.back();
      }
      release();
      root.classList.add('modal--closing');
      const finish = () => {
        root.remove();
        setBackgroundInert(stack.length > 0);
        const target =
          previousFocus && document.contains(previousFocus)
            ? previousFocus
            : /** @type {HTMLElement | null} */ (returnKey ? document.querySelector(`[data-fk="${CSS.escape(returnKey)}"]`) : returnId ? document.getElementById(returnId) : null);
        target?.focus({ preventScroll: true });
      };
      const reduce = document.documentElement.dataset.motion === 'reduce' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduce) finish();
      else setTimeout(finish, 180);
      opts.onClose?.(result);
      resolveClosed(result);
    },
  };

  const content = typeof opts.content === 'function' ? opts.content(handle) : opts.content;
  replace(body, content);
  document.body.append(root);
  const entry = { handle, pushed: false, dismissible };
  stack.push(entry);
  setBackgroundInert(true);
  whenHistorySettled(() => {
    if (isClosed) return;
    history.pushState({ menstruModal: seq }, '');
    entry.pushed = true;
  });
  requestAnimationFrame(() => {
    root.classList.add('modal--open');
    const target = opts.initialFocus ? /** @type {HTMLElement | null} */ (panel.querySelector(opts.initialFocus)) : null;
    (target ?? focusables(body)[0] ?? panel).focus({ preventScroll: true });
  });
  return handle;
}

export function closeAllModals() {
  for (const entry of [...stack].reverse()) entry.handle.close();
}

export function hasOpenModal() {
  return stack.length > 0;
}

/**
 * @param {{ title: string, message: string, confirmLabel?: string, cancelLabel?: string, danger?: boolean }} opts
 * @returns {Promise<boolean>}
 */
export function confirmDialog(opts) {
  let answered = false;
  const handle = openModal({
    title: opts.title,
    variant: 'dialog',
    content: h('p', { class: 'modal__message', text: opts.message }),
    footer: h(
      'div',
      { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn btn--ghost', text: opts.cancelLabel ?? t('common.cancel'), onClick: () => handle.close({ result: false }) }),
      h('button', {
        type: 'button',
        class: ['btn', opts.danger ? 'btn--danger' : 'btn--primary'],
        text: opts.confirmLabel ?? t('common.confirm'),
        onClick: () => {
          answered = true;
          handle.close({ result: true });
        },
      }),
    ),
  });
  return handle.closed.then(() => answered);
}

/**
 * A question with several answers (e.g. retry / continue anyway / cancel).
 * @param {{ title: string, message: string, choices: Array<{ value: string, label: string, variant?: 'primary' | 'danger' | 'ghost' | 'soft' }> }} opts
 * @returns {Promise<string | null>} the chosen value, or null when dismissed
 */
export function choiceDialog(opts) {
  /** @type {string | null} */
  let chosen = null;
  const handle = openModal({
    title: opts.title,
    variant: 'dialog',
    content: h('p', { class: 'modal__message', text: opts.message }),
    footer: h(
      'div',
      { class: 'btn-row btn-row--stack' },
      opts.choices.map((c) =>
        h('button', {
          type: 'button',
          class: ['btn', `btn--${c.variant ?? 'soft'}`],
          text: c.label,
          onClick: () => {
            chosen = c.value;
            handle.close({ result: c.value });
          },
        }),
      ),
    ),
  });
  return handle.closed.then(() => chosen);
}

/**
 * Asks for a secret (password) without ever echoing it in the DOM, or, with `plain`, for a
 * visible typed confirmation (e.g. "type DELETE").
 * @param {{ title: string, label: string, hint?: string, confirmLabel?: string, minLength?: number, autocomplete?: string, plain?: boolean, account?: string }} opts
 * @returns {Promise<string | null>}
 */
export function askSecret(opts) {
  /** @type {string | null} */
  let value = null;
  const input = h('input', {
    type: opts.plain ? 'text' : 'password',
    class: 'input',
    id: 'ask-secret-input',
    autocomplete: opts.autocomplete ?? (opts.plain ? 'off' : 'current-password'),
    autocapitalize: opts.plain ? 'characters' : null,
    spellcheck: false,
    minLength: opts.minLength ?? 1,
    maxLength: 256,
    required: true,
  });
  const error = h('p', { class: 'field__error', role: 'alert', hidden: true });
  const form = h(
    'form',
    {
      class: 'stack',
      onSubmit: (/** @type {SubmitEvent} */ e) => {
        e.preventDefault();
        if (input.value.length < (opts.minLength ?? 1)) {
          error.textContent = t('common.tooShort', { count: opts.minLength ?? 1 });
          error.hidden = false;
          return;
        }
        value = input.value;
        handle.close({ result: value });
      },
    },
    // Lets a password manager file the secret under a recognizable account name.
    opts.account && !opts.plain ? h('input', { type: 'text', autocomplete: 'username', value: opts.account, hidden: true, readOnly: true, tabIndex: -1 }) : null,
    h('label', { class: 'field__label', for: 'ask-secret-input', text: opts.label }),
    input,
    opts.hint ? h('p', { class: 'field__hint', text: opts.hint }) : null,
    error,
    h('button', { type: 'submit', class: 'btn btn--primary btn--full', text: opts.confirmLabel ?? t('common.continue') }),
  );
  const handle = openModal({ title: opts.title, variant: 'dialog', content: form, initialFocus: '#ask-secret-input' });
  return handle.closed.then(() => value);
}
