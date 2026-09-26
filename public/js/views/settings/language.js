import { h } from '../../core/dom.js';
import { t, setLanguage, LANGUAGES, getLanguage } from '../../core/i18n.js';
import { card, segmented } from '../../ui/components.js';
import { setPrefs } from '../../app.js';

/** @param {import('../shell.js').ViewContext} ctx */
export function render(ctx) {
  const prefs = ctx.state.prefs;
  return h(
    'div',
    { class: 'stack' },
    card({
      title: t('settings.language.language'),
      icon: 'languages',
      children: [
        segmented({
          label: t('settings.language.language'),
          hideLabel: true,
          options: LANGUAGES.map((l) => ({ value: l.code, label: l.label })),
          value: getLanguage(),
          onChange: (code) => {
            setLanguage(code);
            setPrefs({ lang: /** @type {'es' | 'en'} */ (code) });
          },
        }),
        h('p', { class: 'muted small', text: t('settings.language.more') }),
      ],
    }),
    card({
      title: t('settings.language.weekStart'),
      icon: 'calendar',
      children: segmented({
        label: t('settings.language.weekStart'),
        hideLabel: true,
        options: [
          { value: 'auto', label: t('settings.language.auto') },
          { value: 1, label: t('settings.language.monday') },
          { value: 0, label: t('settings.language.sunday') },
        ],
        value: prefs.weekStart,
        onChange: (v) => setPrefs({ weekStart: /** @type {any} */ (v) }),
      }),
    }),
  );
}
