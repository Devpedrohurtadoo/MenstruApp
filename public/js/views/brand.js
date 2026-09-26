import { h, s } from '../core/dom.js';

let gid = 0;

/** Menstruapp logo: a drop holding a crescent moon. @param {{ size?: number, withName?: boolean }} [o] */
export function brandMark(o = {}) {
  const id = `brand-grad-${++gid}`;
  const size = o.size ?? 56;
  const svg = s(
    'svg',
    { class: 'brand__mark', viewBox: '0 0 120 120', width: size, height: size, 'aria-hidden': 'true' },
    s(
      'defs',
      null,
      s('linearGradient', { id, x1: '0', y1: '0', x2: '1', y2: '1' }, s('stop', { offset: '0', 'stop-color': '#f59ab8' }), s('stop', { offset: '1', 'stop-color': '#9a5fd6' })),
    ),
    s('path', { d: 'M60 8C60 8 22 50 22 76a38 38 0 0 0 76 0C98 50 60 8 60 8Z', fill: `url(#${id})` }),
    s('path', { d: 'M71 58a20 20 0 1 0 0 34a16 16 0 1 1 0-34Z', fill: '#fff', opacity: '0.92' }),
  );
  return h('div', { class: 'brand' }, svg, o.withName === false ? null : h('span', { class: 'brand__name', text: 'Menstruapp' }));
}
