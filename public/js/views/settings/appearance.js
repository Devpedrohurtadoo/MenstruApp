import { h } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { put, del } from '../../data/idb.js';
import { card, segmented, toggle, button, notice } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { setPrefs, store } from '../../app.js';
import { ACCENTS, BACKGROUND_PRESETS } from '../../data/prefs.js';
import { accentReport, resolvedTheme, prepareBackgroundImage } from '../../ui/theme.js';

/** @param {import('../shell.js').ViewContext} ctx */
export function render(ctx) {
  const prefs = ctx.state.prefs;
  const theme = resolvedTheme(prefs);
  const report = accentReport(prefs.accent, theme);
  const rerender = () => ctx.navigate('settings/appearance', { replace: true });
  const set = (/** @type {Partial<import('../../data/prefs.js').Prefs>} */ patch) => {
    setPrefs(patch);
    rerender();
  };

  const swatches = h(
    'div',
    { class: 'swatches', role: 'radiogroup', 'aria-label': t('settings.appearance.accent') },
    Object.entries(ACCENTS).map(([name, color]) =>
      h('button', {
        type: 'button',
        role: 'radio',
        class: ['swatch', prefs.accent === color ? 'is-on' : ''],
        'aria-checked': String(prefs.accent === color),
        'aria-label': t(`settings.appearance.accents.${name}`),
        dataset: { fk: `accent-${name}` },
        style: { '--swatch': color },
        onClick: () => set({ accent: color }),
      }),
    ),
  );
  const custom = h('input', {
    type: 'color',
    class: 'color-input',
    id: 'accent-custom',
    value: prefs.accent,
    onChange: (/** @type {Event} */ e) => {
      const v = /** @type {HTMLInputElement} */ (e.target).value;
      if (/^#[0-9a-f]{6}$/i.test(v)) set({ accent: v });
    },
  });

  const bg = prefs.background;
  const bgPresets = h(
    'div',
    { class: 'bg-presets', role: 'radiogroup', 'aria-label': t('settings.appearance.bgPresets') },
    BACKGROUND_PRESETS.map((p) =>
      h(
        'button',
        {
          type: 'button',
          role: 'radio',
          class: ['bg-preset', `bg-preset--${p}`, bg.type === 'preset' && bg.preset === p ? 'is-on' : ''],
          'aria-checked': String(bg.type === 'preset' && bg.preset === p),
          dataset: { fk: `bg-${p}` },
          onClick: () => set({ background: { ...bg, type: 'preset', preset: p } }),
        },
        h('span', { class: 'bg-preset__label', text: t(`settings.appearance.bgs.${p}`) }),
      ),
    ),
  );
  const colorInput = h('input', {
    type: 'color',
    class: 'color-input',
    id: 'bg-color',
    value: bg.color,
    onChange: (/** @type {Event} */ e) => {
      const v = /** @type {HTMLInputElement} */ (e.target).value;
      if (/^#[0-9a-f]{6}$/i.test(v)) set({ background: { ...bg, type: 'color', color: v } });
    },
  });
  const fileInput = h('input', {
    type: 'file',
    accept: 'image/*',
    class: 'sr-only',
    id: 'bg-file',
    onChange: async (/** @type {Event} */ e) => {
      const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
      if (!file) return;
      try {
        const blob = await prepareBackgroundImage(file);
        const db = store.get().db;
        if (!db) return;
        await put(db, 'blobs', blob, 'background');
        set({ background: { ...bg, type: 'image' } });
        toast(t('settings.appearance.bgSaved'), { type: 'success' });
      } catch {
        toast(t('settings.appearance.bgError'), { type: 'error' });
      }
    },
  });
  const dim = h('input', {
    type: 'range',
    class: 'range',
    id: 'bg-dim',
    min: 0,
    max: 0.85,
    step: 0.05,
    value: bg.dim,
    onChange: (/** @type {Event} */ e) => set({ background: { ...bg, dim: Number(/** @type {HTMLInputElement} */ (e.target).value) } }),
  });
  const scale = h('input', {
    type: 'range',
    class: 'range',
    id: 'text-scale',
    min: 0.85,
    max: 1.6,
    step: 0.05,
    value: prefs.textScale,
    'aria-valuetext': `${Math.round(prefs.textScale * 100)}%`,
    onChange: (/** @type {Event} */ e) => set({ textScale: Number(/** @type {HTMLInputElement} */ (e.target).value) }),
  });

  return h(
    'div',
    { class: 'stack' },
    card({
      title: t('settings.appearance.theme'),
      icon: 'sun-moon',
      children: segmented({
        label: t('settings.appearance.theme'),
        hideLabel: true,
        options: [
          { value: 'auto', label: t('settings.appearance.themes.auto'), icon: 'sun-moon' },
          { value: 'light', label: t('settings.appearance.themes.light'), icon: 'sun' },
          { value: 'dark', label: t('settings.appearance.themes.dark'), icon: 'moon' },
        ],
        value: prefs.theme,
        onChange: (v) => set({ theme: /** @type {any} */ (v) }),
      }),
    }),
    card({
      title: t('settings.appearance.accent'),
      icon: 'palette',
      children: [
        swatches,
        h('div', { class: 'inline-field' }, h('label', { for: 'accent-custom', text: t('settings.appearance.customColor') }), custom),
        report.adjusted ? notice({ level: 'info', title: t('settings.appearance.contrastTitle'), text: t('settings.appearance.contrastText', { ratio: report.ratio }) }) : null,
        h('div', { class: 'preview' }, h('span', { class: 'preview__chip', text: t('settings.appearance.preview') }), h('a', { class: 'link', href: '#/settings/appearance', text: t('settings.appearance.previewLink') })),
      ],
    }),
    card({
      title: t('settings.appearance.background'),
      icon: 'image',
      children: [
        bgPresets,
        h('div', { class: 'inline-field' }, h('label', { for: 'bg-color', text: t('settings.appearance.bgColor') }), colorInput),
        h('div', { class: 'btn-row' }, h('label', { class: 'btn btn--soft btn--sm', for: 'bg-file', text: t('settings.appearance.bgImage') }), fileInput, bg.type === 'image' ? button({ label: t('settings.appearance.bgRemove'), variant: 'ghost', size: 'sm', onClick: async () => { const db = store.get().db; if (db) await del(db, 'blobs', 'background'); set({ background: { ...bg, type: 'preset' } }); } }) : null),
        bg.type === 'image' ? h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'bg-dim', text: t('settings.appearance.bgDim') }), dim) : null,
        h('p', { class: 'muted small', text: t('settings.appearance.bgPrivacy') }),
      ],
    }),
    card({
      title: t('settings.appearance.motion'),
      icon: 'sparkles',
      children: [
        segmented({
          label: t('settings.appearance.particles'),
          options: [0, 1, 2, 3].map((n) => ({ value: n, label: t(`settings.appearance.particleLevels.${n}`) })),
          value: prefs.particles,
          onChange: (v) => set({ particles: v }),
        }),
        segmented({
          label: t('settings.appearance.animations'),
          options: [
            { value: 'system', label: t('settings.appearance.motionModes.system') },
            { value: 'reduce', label: t('settings.appearance.motionModes.reduce') },
            { value: 'full', label: t('settings.appearance.motionModes.full') },
          ],
          value: prefs.motion,
          onChange: (v) => set({ motion: /** @type {any} */ (v) }),
        }),
      ],
    }),
    card({
      title: t('settings.appearance.accessibility'),
      icon: 'accessibility',
      children: [
        h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'text-scale', text: t('settings.appearance.textSize', { pct: Math.round(prefs.textScale * 100) }) }), scale),
        toggle({ label: t('settings.appearance.highContrast'), description: t('settings.appearance.highContrastDesc'), checked: prefs.contrast === 'more', onChange: (v) => set({ contrast: v ? 'more' : 'normal' }) }),
      ],
    }),
  );
}
