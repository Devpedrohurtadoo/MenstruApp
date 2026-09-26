// Cycle ring: an SVG donut showing the period, fertile window, ovulation and today.

import { h, s } from '../core/dom.js';

const CX = 120;
const CY = 120;
const R = 98;

/** @param {number} deg */
function point(deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CX + R * Math.cos(rad), CY + R * Math.sin(rad)];
}

/**
 * @param {number} fromDeg
 * @param {number} toDeg
 */
function arcPath(fromDeg, toDeg) {
  const span = Math.max(0.5, Math.min(359.9, toDeg - fromDeg));
  const [x0, y0] = point(fromDeg);
  const [x1, y1] = point(fromDeg + span);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${span > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/**
 * @param {{ cycleLength: number, cycleDay: number | null, periodLength: number, ovulationDay: number | null,
 *   fertileFrom?: number | null, fertileTo?: number | null, showFertility: boolean, label: string, center: Array<Node | null>, late?: boolean }} o
 *   Day numbers are 1-based positions inside the cycle.
 */
export function cycleRing(o) {
  const L = Math.max(o.cycleLength, o.cycleDay ?? 0, 1);
  const deg = (/** @type {number} */ day) => ((day - 1) / L) * 360;
  const layers = [s('circle', { class: 'ring__track', cx: CX, cy: CY, r: R })];
  layers.push(s('path', { class: 'ring__seg ring__seg--period', d: arcPath(deg(1), deg(o.periodLength + 1) - 1.5) }));
  if (o.showFertility && o.fertileFrom && o.fertileTo) {
    layers.push(s('path', { class: 'ring__seg ring__seg--fertile', d: arcPath(deg(o.fertileFrom), deg(o.fertileTo + 1) - 1.5) }));
  }
  if (o.showFertility && o.ovulationDay) {
    const [x, y] = point(deg(o.ovulationDay) + 180 / L);
    layers.push(s('circle', { class: 'ring__ovulation', cx: x, cy: y, r: 7 }));
  }
  if (o.cycleDay) {
    const d = Math.min(o.cycleDay, L);
    layers.push(s('path', { class: 'ring__progress', d: arcPath(0, deg(d) + 360 / L) }));
    const [x, y] = point(deg(d) + 180 / L);
    layers.push(s('circle', { class: ['ring__today', o.late ? 'ring__today--late' : ''], cx: x, cy: y, r: 11 }));
  }
  return h(
    'div',
    { class: 'ring', role: 'img', 'aria-label': o.label },
    s('svg', { viewBox: '0 0 240 240', class: 'ring__svg', 'aria-hidden': 'true' }, ...layers),
    h('div', { class: 'ring__center', 'aria-hidden': 'true' }, ...o.center),
  );
}
