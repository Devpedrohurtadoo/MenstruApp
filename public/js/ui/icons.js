import { s } from '../core/dom.js';
import DATA from './icon-data.js';

/** Friendly aliases → Lucide names. */
const ALIASES = /** @type {Record<string, string>} */ ({
  home: 'house',
  chart: 'chart-column',
  learn: 'book-open',
  luna: 'message-circle-heart',
  chat: 'message-circle',
  delete: 'trash',
  edit: 'pencil',
  close: 'x',
  alert: 'triangle-alert',
  help: 'circle-question-mark',
  fingerprint: 'fingerprint-pattern',
  smile: 'face-slightly-smiling',
  water: 'glass-water',
  history: 'clock-arrow-down',
  more: 'ellipsis',
  test: 'test-tube-diagonal',
  waves: 'waves-horizontal',
});

/**
 * Renders an inline SVG icon. Decorative by default (aria-hidden); pass a label to expose it.
 * @param {string} name
 * @param {{ size?: number, label?: string, class?: string, strokeWidth?: number }} [opts]
 */
export function icon(name, opts = {}) {
  const key = ALIASES[name] ?? name;
  const nodes = /** @type {Array<[string, Record<string, string>]>} */ (/** @type {any} */ (DATA)[key] ?? DATA['circle-question-mark']);
  const size = opts.size ?? 20;
  return s(
    'svg',
    {
      class: ['icon', opts.class ?? ''].join(' ').trim(),
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': opts.strokeWidth ?? 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': opts.label ? null : 'true',
      role: opts.label ? 'img' : null,
      'aria-label': opts.label ?? null,
      focusable: 'false',
    },
    nodes.map(([tag, attrs]) => s(tag, { ...attrs, key: undefined })),
  );
}
