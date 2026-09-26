// Lightweight, accessible SVG charts (no dependency). Every chart has a text summary for
// screen readers and an optional data table behind a <details> element.

import { h, s } from '../core/dom.js';
import { fmtNumber, t } from '../core/i18n.js';

/**
 * @param {string[]} headers
 * @param {Array<Array<string | number>>} rows
 * @param {string} caption
 */
function dataTable(headers, rows, caption) {
  return h(
    'details',
    { class: 'chart__data' },
    h('summary', { text: t('charts.showData') }),
    h(
      'table',
      { class: 'table' },
      h('caption', { class: 'sr-only', text: caption }),
      h('thead', null, h('tr', null, headers.map((x) => h('th', { scope: 'col', text: x })))),
      h('tbody', null, rows.map((r) => h('tr', null, r.map((c, i) => (i === 0 ? h('th', { scope: 'row', text: String(c) }) : h('td', { text: String(c) })))))),
    ),
  );
}

/**
 * Vertical bar chart (e.g. cycle lengths) with an optional reference band and average line.
 * @param {{ title: string, summary: string, data: Array<{ label: string, value: number | null, muted?: boolean }>, unit: string,
 *   band?: [number, number], average?: number | null, yMin?: number, yMax?: number, valueHeader?: string }} o
 */
export function barChart(o) {
  const W = 320;
  const H = 180;
  const pad = { l: 30, r: 8, t: 12, b: 26 };
  const values = o.data.map((d) => d.value).filter((v) => v !== null);
  const yMin = o.yMin ?? Math.max(0, Math.min(...values, o.band?.[0] ?? Infinity) - 4);
  const yMax = o.yMax ?? Math.max(...values, o.band?.[1] ?? -Infinity) + 4;
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const y = (/** @type {number} */ v) => pad.t + ih - ((v - yMin) / Math.max(1, yMax - yMin)) * ih;
  const n = Math.max(1, o.data.length);
  const slot = iw / n;
  const bw = Math.min(28, slot * 0.62);
  const parts = [];
  if (o.band) {
    parts.push(s('rect', { class: 'chart__band', x: pad.l, width: iw, y: y(o.band[1]), height: Math.max(0, y(o.band[0]) - y(o.band[1])) }));
  }
  const ticks = niceTicks(yMin, yMax, 4);
  for (const tick of ticks) {
    parts.push(s('line', { class: 'chart__grid', x1: pad.l, x2: W - pad.r, y1: y(tick), y2: y(tick) }));
    parts.push(s('text', { class: 'chart__tick', x: pad.l - 5, y: y(tick) + 3, 'text-anchor': 'end' }, String(tick)));
  }
  o.data.forEach((d, i) => {
    const cx = pad.l + slot * i + slot / 2;
    if (d.value !== null) {
      parts.push(
        s('rect', { class: ['chart__bar', d.muted ? 'chart__bar--muted' : ''], x: cx - bw / 2, width: bw, y: y(d.value), height: Math.max(1, pad.t + ih - y(d.value)), rx: 4 }),
        s('text', { class: 'chart__value', x: cx, y: y(d.value) - 4, 'text-anchor': 'middle' }, String(d.value)),
      );
    }
    if (n <= 12 || i % Math.ceil(n / 12) === 0) parts.push(s('text', { class: 'chart__tick', x: cx, y: H - 8, 'text-anchor': 'middle' }, d.label));
  });
  if (o.average) parts.push(s('line', { class: 'chart__avg', x1: pad.l, x2: W - pad.r, y1: y(o.average), y2: y(o.average) }));
  return h(
    'figure',
    { class: 'chart' },
    h('figcaption', { class: 'chart__title', text: o.title }),
    s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart__svg', role: 'img', 'aria-label': o.summary }, s('title', null, o.summary), ...parts),
    dataTable([t('charts.cycle'), o.valueHeader ?? o.unit], o.data.map((d) => [d.label, d.value ?? '—']), o.title),
  );
}

/**
 * Line chart for daily series (basal temperature, weight...). Null values create gaps.
 * @param {{ title: string, summary: string, points: Array<{ label: string, value: number | null, flag?: boolean }>, unit: string,
 *   decimals?: number, reference?: number | null, markers?: Array<{ index: number, label: string }> }} o
 */
export function lineChart(o) {
  const W = 320;
  const H = 180;
  const pad = { l: 38, r: 8, t: 12, b: 26 };
  const vals = o.points.map((p) => p.value).filter((v) => v !== null);
  if (!vals.length) return h('p', { class: 'muted', text: t('charts.noData') });
  const lo = Math.min(...vals, o.reference ?? Infinity);
  const hi = Math.max(...vals, o.reference ?? -Infinity);
  const margin = Math.max((hi - lo) * 0.15, 0.1);
  const yMin = lo - margin;
  const yMax = hi + margin;
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (/** @type {number} */ i) => pad.l + (o.points.length <= 1 ? iw / 2 : (i / (o.points.length - 1)) * iw);
  const y = (/** @type {number} */ v) => pad.t + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const parts = [];
  const decimals = o.decimals ?? 1;
  for (const tick of [yMin + (yMax - yMin) * 0.1, (yMin + yMax) / 2, yMax - (yMax - yMin) * 0.1]) {
    parts.push(s('line', { class: 'chart__grid', x1: pad.l, x2: W - pad.r, y1: y(tick), y2: y(tick) }));
    parts.push(s('text', { class: 'chart__tick', x: pad.l - 5, y: y(tick) + 3, 'text-anchor': 'end' }, fmtNumber(tick, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })));
  }
  if (o.reference) parts.push(s('line', { class: 'chart__avg', x1: pad.l, x2: W - pad.r, y1: y(o.reference), y2: y(o.reference) }));
  let d = '';
  let pen = false;
  o.points.forEach((p, i) => {
    if (p.value === null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)} `;
    pen = true;
  });
  parts.push(s('path', { class: 'chart__line', d: d.trim() }));
  o.points.forEach((p, i) => {
    if (p.value !== null) parts.push(s('circle', { class: ['chart__dot', p.flag ? 'chart__dot--flag' : ''], cx: x(i), cy: y(p.value), r: p.flag ? 3.5 : 2.5 }));
  });
  for (const m of o.markers ?? []) {
    parts.push(s('line', { class: 'chart__marker', x1: x(m.index), x2: x(m.index), y1: pad.t, y2: pad.t + ih }));
  }
  const step = Math.ceil(o.points.length / 6);
  o.points.forEach((p, i) => {
    if (i % step === 0) parts.push(s('text', { class: 'chart__tick', x: x(i), y: H - 8, 'text-anchor': 'middle' }, p.label));
  });
  return h(
    'figure',
    { class: 'chart' },
    h('figcaption', { class: 'chart__title', text: o.title }),
    s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart__svg', role: 'img', 'aria-label': o.summary }, s('title', null, o.summary), ...parts),
    dataTable(
      [t('charts.date'), o.unit],
      o.points.filter((p) => p.value !== null).map((p) => [p.label, fmtNumber(/** @type {number} */ (p.value), { maximumFractionDigits: decimals })]),
      o.title,
    ),
  );
}

/**
 * Frequency table with colour intensity (e.g. symptoms × cycle phase).
 * @param {{ caption: string, columns: string[], rows: Array<{ label: string, values: number[] }> }} o values are percentages
 */
export function heatTable(o) {
  return h(
    'div',
    { class: 'heat-wrap' },
    h(
      'table',
      { class: 'heat' },
      h('caption', { text: o.caption }),
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, h('span', { class: 'sr-only', text: t('charts.item') })), o.columns.map((c) => h('th', { scope: 'col', text: c })))),
      h(
        'tbody',
        null,
        o.rows.map((r) =>
          h(
            'tr',
            null,
            h('th', { scope: 'row', text: r.label }),
            r.values.map((v) => h('td', { class: 'heat__cell', style: { '--v': String(Math.min(1, v / 100)) } }, h('span', { text: `${v}%` }))),
          ),
        ),
      ),
    ),
  );
}

/**
 * @param {number} min
 * @param {number} max
 * @param {number} count
 */
function niceTicks(min, max, count) {
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((st) => st >= raw) ?? raw;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}
