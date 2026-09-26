// Reusable, accessible UI building blocks.

import { h, s, replace } from '../core/dom.js';
import { icon } from './icons.js';
import { t } from '../core/i18n.js';
import { clamp } from '../core/store.js';

let idSeq = 0;
/** @param {string} prefix */
export const nextId = (prefix = 'c') => `${prefix}-${++idSeq}`;

/**
 * @param {{ label?: string, icon?: string, iconAfter?: string, variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link' | 'soft',
 *   size?: 'sm' | 'md' | 'lg', full?: boolean, onClick?: (e: MouseEvent) => void, type?: 'button' | 'submit', disabled?: boolean,
 *   fk?: string, attrs?: Record<string, any>, class?: string, busy?: boolean }} o
 */
export function button(o) {
  return h(
    'button',
    {
      type: o.type ?? 'button',
      class: ['btn', `btn--${o.variant ?? 'secondary'}`, o.size ? `btn--${o.size}` : '', o.full ? 'btn--full' : '', o.class ?? ''],
      disabled: o.disabled || o.busy,
      'aria-busy': o.busy ? 'true' : null,
      dataset: o.fk ? { fk: o.fk } : undefined,
      attrs: o.attrs,
      onClick: o.onClick,
    },
    o.busy ? spinner() : o.icon ? icon(o.icon, { size: 18 }) : null,
    o.label ? h('span', { text: o.label }) : null,
    o.iconAfter ? icon(o.iconAfter, { size: 18 }) : null,
  );
}

/**
 * @param {{ icon: string, label: string, onClick?: (e: MouseEvent) => void, variant?: string, fk?: string, pressed?: boolean, size?: number, class?: string }} o
 */
export function iconButton(o) {
  return h(
    'button',
    {
      type: 'button',
      class: ['icon-btn', o.variant ? `icon-btn--${o.variant}` : '', o.class ?? ''],
      'aria-label': o.label,
      title: o.label,
      'aria-pressed': o.pressed === undefined ? null : String(o.pressed),
      dataset: o.fk ? { fk: o.fk } : undefined,
      onClick: o.onClick,
    },
    icon(o.icon, { size: o.size ?? 20 }),
  );
}

export function spinner() {
  return h('span', { class: 'spinner', 'aria-hidden': 'true' });
}

/**
 * Toggle chip (aria-pressed).
 * @param {{ label: string, selected: boolean, onClick: () => void, icon?: string, tone?: string, fk?: string, disabled?: boolean, level?: number }} o
 */
export function chip(o) {
  return h(
    'button',
    {
      type: 'button',
      class: ['chip', o.tone ? `chip--${o.tone}` : '', o.selected ? 'chip--on' : '', o.level ? `chip--level${o.level}` : ''],
      'aria-pressed': String(o.selected),
      dataset: o.fk ? { fk: o.fk } : undefined,
      disabled: o.disabled,
      onClick: o.onClick,
    },
    o.icon ? icon(o.icon, { size: 16 }) : null,
    h('span', { text: o.label }),
    o.level ? h('span', { class: 'chip__level', 'aria-hidden': 'true', text: '•'.repeat(o.level) }) : null,
  );
}

/**
 * Single- or multi-select chip group with internal state.
 * @template {string | number} V
 * @param {{ label: string, options: Array<{ value: V, label: string, icon?: string, tone?: string }>, value: V | V[] | null | undefined,
 *   multiple?: boolean, allowNone?: boolean, onChange: (value: any) => void, hideLabel?: boolean, id?: string }} o
 */
export function chipGroup(o) {
  const id = o.id ?? nextId('cg');
  let current = o.multiple ? [...(/** @type {V[]} */ (o.value ?? []))] : (o.value ?? null);
  const wrap = h('div', { class: 'chips', role: 'group', 'aria-labelledby': `${id}-label` });
  const render = () => {
    replace(wrap,
      ...o.options.map((opt) => {
        const selected = o.multiple ? /** @type {V[]} */ (current).includes(opt.value) : current === opt.value;
        return chip({
          label: opt.label,
          icon: opt.icon,
          tone: opt.tone,
          fk: `cg-${o.label}-${String(opt.value)}`,
          selected,
          onClick: () => {
            if (o.multiple) {
              const arr = /** @type {V[]} */ (current);
              current = selected ? arr.filter((v) => v !== opt.value) : [...arr, opt.value];
            } else {
              current = selected && o.allowNone !== false ? null : opt.value;
            }
            render();
            o.onChange(current);
            /** @type {HTMLElement | null} */ (wrap.children[o.options.indexOf(opt)])?.focus();
          },
        });
      }),
    );
  };
  render();
  return h(
    'div',
    { class: 'field' },
    h('span', { class: ['field__label', o.hideLabel ? 'sr-only' : ''], id: `${id}-label`, text: o.label }),
    wrap,
  );
}

/**
 * Segmented control (one of a few options).
 * @template {string | number} V
 * @param {{ label: string, options: Array<{ value: V, label: string, icon?: string }>, value: V, onChange: (v: V) => void, hideLabel?: boolean }} o
 */
export function segmented(o) {
  const id = nextId('seg');
  let current = o.value;
  const group = h('div', { class: 'segmented', role: 'radiogroup', 'aria-labelledby': `${id}-label` });
  const render = () =>
    replace(group,
      ...o.options.map((opt, idx) =>
        h(
          'button',
          {
            type: 'button',
            role: 'radio',
            'aria-checked': String(opt.value === current),
            // Keep the group reachable with Tab even when nothing is selected yet.
            tabIndex: opt.value === current || (idx === 0 && !o.options.some((x) => x.value === current)) ? 0 : -1,
            class: ['segmented__opt', opt.value === current ? 'is-on' : ''],
            dataset: { fk: `seg-${o.label}-${String(opt.value)}` },
            onClick: () => select(opt.value),
            onKeydown: (/** @type {KeyboardEvent} */ e) => {
              const i = o.options.findIndex((x) => x.value === current);
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                select(o.options[(i + 1) % o.options.length].value, true);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                select(o.options[(i - 1 + o.options.length) % o.options.length].value, true);
              }
            },
          },
          opt.icon ? icon(opt.icon, { size: 16 }) : null,
          h('span', { text: opt.label }),
        ),
      ),
    );
  /** @param {V} v @param {boolean} [focus] */
  const select = (v, focus = false) => {
    current = v;
    render();
    o.onChange(v);
    if (focus) /** @type {HTMLElement | null} */ (group.querySelector('[aria-checked="true"]'))?.focus();
  };
  render();
  return h('div', { class: 'field' }, h('span', { class: ['field__label', o.hideLabel ? 'sr-only' : ''], id: `${id}-label`, text: o.label }), group);
}

/**
 * Switch (checkbox with role="switch").
 * @param {{ label: string, checked: boolean, onChange: (checked: boolean) => void, description?: string, disabled?: boolean, fk?: string }} o
 */
export function toggle(o) {
  const id = nextId('sw');
  const input = h('input', {
    type: 'checkbox',
    role: 'switch',
    id,
    class: 'switch__input',
    checked: o.checked,
    disabled: o.disabled,
    dataset: { fk: o.fk ?? `tg-${o.label}` },
    'aria-describedby': o.description ? `${id}-desc` : null,
    onChange: (/** @type {Event} */ e) => o.onChange(/** @type {HTMLInputElement} */ (e.target).checked),
  });
  return h(
    'div',
    { class: 'switch-row' },
    h(
      'label',
      { class: 'switch', for: id },
      h('span', { class: 'switch__text' }, h('span', { class: 'switch__label', text: o.label }), o.description ? h('span', { class: 'switch__desc', id: `${id}-desc`, text: o.description }) : null),
      input,
      h('span', { class: 'switch__track', 'aria-hidden': 'true' }, h('span', { class: 'switch__thumb' })),
    ),
  );
}

/**
 * Numeric stepper with − / + buttons.
 * @param {{ label: string, value: number | null, min: number, max: number, step?: number, unit?: string, onChange: (v: number | null) => void,
 *   allowUnknown?: boolean, unknownLabel?: string, decimals?: number }} o
 */
export function stepper(o) {
  const id = nextId('st');
  let value = o.value;
  const step = o.step ?? 1;
  const decimals = o.decimals ?? 0;
  const display = h('output', { class: 'stepper__value', id: `${id}-out`, 'aria-live': 'polite' });
  const unknownBtn = o.allowUnknown ? h('button', { type: 'button', class: 'link-btn', onClick: () => set(null) }) : null;
  const render = () => {
    display.textContent = value === null ? (o.unknownLabel ?? t('common.unknown')) : `${value.toFixed(decimals)}${o.unit ? ` ${o.unit}` : ''}`;
    if (unknownBtn) {
      unknownBtn.textContent = o.unknownLabel ?? t('common.dontKnow');
      unknownBtn.setAttribute('aria-pressed', String(value === null));
    }
    minus.disabled = value !== null && value <= o.min;
    plus.disabled = value !== null && value >= o.max;
  };
  /** @param {number | null} v */
  const set = (v) => {
    value = v === null ? null : Math.round(clamp(v, o.min, o.max) * 10 ** decimals) / 10 ** decimals;
    render();
    o.onChange(value);
  };
  const start = () => (value === null ? Math.round((o.min + o.max) / 2) : value);
  const minus = h('button', { type: 'button', class: 'icon-btn', dataset: { fk: `st-${o.label}-minus` }, 'aria-label': t('common.decrease', { label: o.label }), onClick: () => set(start() - (value === null ? 0 : step)) }, icon('minus'));
  const plus = h('button', { type: 'button', class: 'icon-btn', dataset: { fk: `st-${o.label}-plus` }, 'aria-label': t('common.increase', { label: o.label }), onClick: () => set(start() + (value === null ? 0 : step)) }, icon('plus'));
  render();
  return h(
    'div',
    { class: 'field' },
    h('span', { class: 'field__label', id: `${id}-label`, text: o.label }),
    h('div', { class: 'stepper', role: 'group', 'aria-labelledby': `${id}-label` }, minus, display, plus),
    unknownBtn,
  );
}

/**
 * Label + control + hint/error wrapper.
 * @param {{ label: string, control: HTMLElement, hint?: string, error?: string, id?: string }} o
 */
export function field(o) {
  const id = o.id ?? o.control.id ?? nextId('f');
  o.control.id = id;
  const hintId = o.hint ? `${id}-hint` : null;
  const errId = `${id}-err`;
  o.control.setAttribute('aria-describedby', [hintId, errId].filter(Boolean).join(' '));
  const err = h('p', { class: 'field__error', id: errId, role: 'alert', hidden: !o.error, text: o.error ?? '' });
  return {
    el: h('div', { class: 'field' }, h('label', { class: 'field__label', for: id, text: o.label }), o.control, o.hint ? h('p', { class: 'field__hint', id: hintId, text: o.hint }) : null, err),
    /** @param {string | null} msg */
    setError(msg) {
      err.textContent = msg ?? '';
      err.hidden = !msg;
      o.control.setAttribute('aria-invalid', msg ? 'true' : 'false');
    },
  };
}

/**
 * @param {{ title?: string, icon?: string, tone?: string, children?: any, action?: Node | null, class?: string, headingLevel?: 2 | 3 }} o
 */
export function card(o) {
  const tag = o.headingLevel === 2 ? 'h2' : 'h3';
  return h(
    'section',
    { class: ['card', o.tone ? `card--${o.tone}` : '', o.class ?? ''] },
    o.title
      ? h('header', { class: 'card__head' }, o.icon ? h('span', { class: 'card__icon' }, icon(o.icon, { size: 18 })) : null, h(tag, { class: 'card__title', text: o.title }), o.action ?? null)
      : null,
    o.children,
  );
}

/**
 * @param {{ title: string, text?: string, art?: Node, action?: Node | null }} o
 */
export function emptyState(o) {
  return h('div', { class: 'empty' }, o.art ?? blossom(), h('p', { class: 'empty__title', text: o.title }), o.text ? h('p', { class: 'empty__text', text: o.text }) : null, o.action ?? null);
}

/** Decorative illustration used in empty states. */
export function blossom() {
  // currentColor (set through CSS) instead of var() in presentation attributes, for Safari.
  const petals = [0, 72, 144, 216, 288].map((deg) =>
    s('ellipse', { cx: 60, cy: 38, rx: 13, ry: 22, transform: `rotate(${deg} 60 60)`, fill: 'currentColor', opacity: 0.35 }),
  );
  return s(
    'svg',
    { class: 'empty__art', viewBox: '0 0 120 120', width: 96, height: 96, 'aria-hidden': 'true' },
    s('circle', { cx: 60, cy: 60, r: 56, fill: 'currentColor', opacity: 0.08 }),
    ...petals,
    s('circle', { cx: 60, cy: 60, r: 10, fill: 'currentColor' }),
  );
}

/**
 * Settings/list row.
 * @param {{ icon?: string, title: string, subtitle?: string, onClick?: () => void, trailing?: Node | null, href?: string, danger?: boolean, fk?: string }} o
 */
export function listItem(o) {
  const inner = [
    o.icon ? h('span', { class: 'list-item__icon' }, icon(o.icon, { size: 20 })) : null,
    h('span', { class: 'list-item__text' }, h('span', { class: 'list-item__title', text: o.title }), o.subtitle ? h('span', { class: 'list-item__sub', text: o.subtitle }) : null),
    o.trailing ?? (o.onClick || o.href ? icon('chevron-right', { size: 18, class: 'list-item__chev' }) : null),
  ];
  const cls = ['list-item', o.danger ? 'list-item--danger' : ''];
  if (o.href) return h('a', { class: cls, href: o.href, dataset: o.fk ? { fk: o.fk } : undefined }, ...inner);
  if (o.onClick) return h('button', { type: 'button', class: cls, onClick: o.onClick, dataset: o.fk ? { fk: o.fk } : undefined }, ...inner);
  return h('div', { class: cls }, ...inner);
}

/** @param {string} text @param {string} [tone] */
export function badge(text, tone = 'neutral') {
  return h('span', { class: ['badge', `badge--${tone}`], text });
}

/**
 * Notice banner (info / consult / urgent).
 * @param {{ level: 'info' | 'consult' | 'urgent' | 'success', title?: string, text?: string, action?: Node | null, onDismiss?: () => void }} o
 */
export function notice(o) {
  const iconName = o.level === 'urgent' ? 'siren' : o.level === 'consult' ? 'stethoscope' : o.level === 'success' ? 'circle-check' : 'info';
  return h(
    'div',
    { class: ['notice', `notice--${o.level}`], role: o.level === 'urgent' ? 'alert' : null },
    h('span', { class: 'notice__icon' }, icon(iconName, { size: 20 })),
    h('div', { class: 'notice__body' }, o.title ? h('p', { class: 'notice__title', text: o.title }) : null, o.text ? h('p', { class: 'notice__text', text: o.text }) : null, o.action ?? null),
    o.onDismiss ? iconButton({ icon: 'close', label: t('common.dismiss'), onClick: o.onDismiss, size: 16, class: 'notice__close' }) : null,
  );
}

/**
 * Profile avatar (photo, emoji or initial).
 * @param {{ name?: string, avatar?: string, photo?: string | null, color?: string }} profile
 * @param {number} [size]
 */
export function avatar(profile, size = 40) {
  const style = { '--avatar-size': `${size}px`, '--avatar-color': profile.color ?? 'var(--accent)' };
  if (profile.photo) return h('img', { class: 'avatar', src: profile.photo, alt: '', style, width: size, height: size });
  const text = profile.avatar || (profile.name ? profile.name.trim().charAt(0).toUpperCase() : '🌙');
  return h('span', { class: 'avatar', style, 'aria-hidden': 'true', text });
}

/** Section heading inside a view. @param {string} text @param {Node | null} [action] */
export function sectionTitle(text, action = null) {
  return h('div', { class: 'section-title' }, h('h2', { text }), action);
}

/**
 * Horizontal progress bar.
 * @param {number} fraction 0..1
 * @param {string} label accessible label
 */
export function progressBar(fraction, label) {
  const pct = Math.round(clamp(fraction, 0, 1) * 100);
  return h(
    'div',
    { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': label },
    h('div', { class: 'progress__bar', style: { width: `${pct}%` } }),
  );
}
