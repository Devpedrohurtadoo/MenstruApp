// Safe DOM construction helpers. The whole app builds its UI through these functions:
// text always goes through textContent and URLs are validated, so no user-controlled
// string can ever be parsed as HTML (and the CSP enforces Trusted Types to guarantee it).

const SVG_NS = 'http://www.w3.org/2000/svg';
const URL_PROPS = new Set(['href', 'src', 'action', 'formAction', 'poster']);
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'blob:']);
const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=\s]+$/i;

/**
 * Returns the URL if it is safe to assign to an href/src, otherwise null.
 * @param {string} value
 * @param {{ allowDataImage?: boolean }} [opts]
 * @returns {string | null}
 */
export function safeUrl(value, opts = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (opts.allowDataImage && SAFE_DATA_IMAGE.test(raw)) return raw;
  try {
    const base = typeof location !== 'undefined' ? location.href : 'https://localhost/';
    const url = new URL(raw, base);
    return SAFE_PROTOCOLS.has(url.protocol) ? raw : null;
  } catch {
    return null;
  }
}

/** @param {unknown} child @param {Node[]} out */
function flatten(child, out) {
  if (child === null || child === undefined || child === false || child === true) return;
  if (Array.isArray(child)) {
    for (const c of child) flatten(c, out);
  } else if (child instanceof Node) {
    out.push(child);
  } else {
    out.push(document.createTextNode(String(child)));
  }
}

/** Boolean DOM properties that default to true, so an explicit `false` must be applied. */
const TRUE_BY_DEFAULT = new Set(['spellcheck', 'translate']);

/**
 * @param {Element} el
 * @param {Record<string, any>} props
 * @param {boolean} isSvg
 */
function applyProps(el, props, isSvg) {
  for (const [key, value] of Object.entries(props)) {
    // `false` means "leave the default", except for properties whose default is true.
    if (value === undefined || value === null || (value === false && !TRUE_BY_DEFAULT.has(key))) continue;
    if (key === 'class' || key === 'className') {
      const cls = classNames(value);
      if (cls) el.setAttribute('class', cls);
    } else if (key === 'text') {
      el.textContent = String(value);
    } else if (key === 'style') {
      const style = /** @type {HTMLElement} */ (el).style;
      for (const [prop, v] of Object.entries(value)) {
        if (v !== undefined && v !== null) style.setProperty(prop, String(v));
      }
    } else if (key === 'dataset') {
      for (const [k, v] of Object.entries(value)) {
        if (v !== undefined && v !== null) el.setAttribute(`data-${k}`, String(v));
      }
    } else if (key === 'attrs') {
      for (const [k, v] of Object.entries(value)) {
        if (v === undefined || v === null || v === false) continue;
        el.setAttribute(k, v === true ? '' : String(v));
      }
    } else if (key === 'on') {
      for (const [evt, handler] of Object.entries(value)) el.addEventListener(evt, handler);
    } else if (key.length > 2 && key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'ref') {
      value(el);
    } else if (URL_PROPS.has(key)) {
      const url = safeUrl(value, { allowDataImage: key === 'src' });
      if (url) el.setAttribute(key, url);
    } else if (key.startsWith('aria-') || key.startsWith('data-') || key === 'role' || isSvg) {
      el.setAttribute(key, value === true ? '' : String(value));
    } else if (key === 'for') {
      el.setAttribute('for', String(value));
    } else if (key in el) {
      // Direct DOM properties (value, checked, disabled, type, id, hidden, ...)
      /** @type {any} */ (el)[key] = value;
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
}

/**
 * Normalises class values: string, array or { className: condition } maps.
 * @param {any} value
 * @returns {string}
 */
export function classNames(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(classNames).filter(Boolean).join(' ');
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, on]) => Boolean(on))
      .map(([name]) => name)
      .join(' ');
  }
  return '';
}

/**
 * Creates an HTML element.
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Record<string, any> | null} [props]
 * @param {...any} children
 * @returns {HTMLElementTagNameMap[K]}
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) applyProps(el, props, false);
  const nodes = [];
  flatten(children, nodes);
  if (nodes.length) el.append(...nodes);
  return el;
}

/**
 * Creates an SVG element.
 * @param {string} tag
 * @param {Record<string, any> | null} [props]
 * @param {...any} children
 * @returns {SVGElement}
 */
export function s(tag, props, ...children) {
  const el = /** @type {SVGElement} */ (document.createElementNS(SVG_NS, tag));
  if (props) applyProps(el, props, true);
  const nodes = [];
  flatten(children, nodes);
  if (nodes.length) el.append(...nodes);
  return el;
}

/** Removes every child of an element. @param {Element} el */
export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * Replaces the content of an element.
 * @param {Element} el
 * @param {...any} children
 */
export function replace(el, ...children) {
  const nodes = [];
  flatten(children, nodes);
  // eslint-disable-next-line no-restricted-syntax -- this is the null-safe wrapper
  el.replaceChildren(...nodes);
}

/**
 * Runs a re-render and gives keyboard focus back to the "same" control in the new content,
 * found by its data-fk (focus key) or id. Without this, focus falls back to <body> and keyboard
 * and screen-reader users have to start again from the top of the page.
 * @param {() => void} renderFn
 */
export function preservingFocus(renderFn) {
  const active = /** @type {HTMLElement | null} */ (document.activeElement);
  const fk = active?.dataset?.fk;
  const id = active && active !== document.body ? active.id : '';
  renderFn();
  if (!active || document.contains(active)) return;
  const target = fk ? document.querySelector(`[data-fk="${CSS.escape(fk)}"]`) : id ? document.getElementById(id) : null;
  /** @type {HTMLElement | null} */ (target)?.focus({ preventScroll: true });
}

/** A span that is only read by assistive technology. @param {string} text */
export function srOnly(text) {
  return h('span', { class: 'sr-only', text });
}

/**
 * Announces a message through the ARIA live regions declared in index.html.
 * @param {string} message
 * @param {'polite' | 'assertive'} [politeness]
 */
export function announce(message, politeness = 'polite') {
  const region = document.getElementById(politeness === 'assertive' ? 'live-assertive' : 'live-polite');
  if (!region) return;
  region.textContent = '';
  // A new text node on the next frame makes screen readers re-announce identical messages.
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

/** @param {Element} container @returns {HTMLElement[]} */
export function focusables(container) {
  return /** @type {HTMLElement[]} */ (Array.from(container.querySelectorAll(FOCUSABLE))).filter(
    (el) => !el.hasAttribute('inert') && el.getClientRects().length > 0,
  );
}

/**
 * Keeps keyboard focus inside a container (for dialogs). Returns a release function.
 * @param {HTMLElement} container
 * @returns {() => void}
 */
export function trapFocus(container) {
  /** @param {KeyboardEvent} e */
  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const items = focusables(container);
    if (!items.length) {
      e.preventDefault();
      container.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  container.addEventListener('keydown', onKey);
  return () => container.removeEventListener('keydown', onKey);
}

/**
 * Triggers a file download for a Blob without touching the DOM permanently.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename, class: 'sr-only' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** @returns {boolean} */
export function prefersReducedMotion() {
  if (document.documentElement.dataset.motion === 'reduce') return true;
  if (document.documentElement.dataset.motion === 'full') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
