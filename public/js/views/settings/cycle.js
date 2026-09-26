import { h } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { card, stepper, segmented, toggle } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { updateSettings } from '../../app.js';

/** @param {import('../shell.js').ViewContext} ctx */
export function render(ctx) {
  const d = /** @type {NonNullable<typeof ctx.state.derived>} */ (ctx.state.derived);
  const s = d.settings;
  const stats = d.analysis.stats;
  const save = async (/** @type {Record<string, any>} */ patch) => {
    await updateSettings(patch);
    toast(t('common.savedShort'), { type: 'success' });
  };
  return h(
    'div',
    { class: 'stack' },
    card({
      title: t('settings.cycle.defaults'),
      icon: 'calendar',
      children: [
        h('p', { class: 'muted small', text: t('settings.cycle.defaultsText') }),
        stepper({ label: t('onboarding.cycleLength'), value: s.cycleLength ?? null, min: 15, max: 90, unit: t('common.daysShort'), allowUnknown: true, onChange: (v) => save({ cycleLength: v }) }),
        stats.cycle ? h('p', { class: 'field__hint', text: t('settings.cycle.learned', { value: Math.round(stats.cycle.mean), count: stats.cycle.count }) }) : null,
        stepper({ label: t('onboarding.periodLength'), value: s.periodLength ?? null, min: 1, max: 15, unit: t('common.daysShort'), allowUnknown: true, onChange: (v) => save({ periodLength: v }) }),
        stepper({ label: t('settings.cycle.luteal'), value: s.lutealLength ?? null, min: 8, max: 18, unit: t('common.daysShort'), allowUnknown: true, unknownLabel: t('settings.cycle.lutealAuto'), onChange: (v) => save({ lutealLength: v }) }),
        h('p', { class: 'field__hint', text: t('settings.cycle.lutealHint', { value: stats.lutealLength }) }),
        toggle({ label: t('onboarding.newToThis'), description: t('onboarding.newToThisDesc'), checked: s.experience === 'new', onChange: (v) => save({ experience: v ? 'new' : 'experienced' }) }),
      ],
    }),
    card({
      title: t('settings.cycle.units'),
      icon: 'thermometer',
      children: [
        segmented({ label: t('settings.cycle.tempUnit'), options: [{ value: 'C', label: '°C' }, { value: 'F', label: '°F' }], value: s.temperatureUnit ?? 'C', onChange: (v) => save({ temperatureUnit: v }) }),
        segmented({ label: t('settings.cycle.weightUnit'), options: [{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }], value: s.weightUnit ?? 'kg', onChange: (v) => save({ weightUnit: v }) }),
      ],
    }),
    card({
      title: t('settings.cycle.features'),
      icon: 'sparkles',
      children: [
        toggle({ label: t('settings.cycle.streaks'), description: t('settings.cycle.streaksDesc'), checked: s.features.streaks, onChange: (v) => save({ features: { ...s.features, streaks: v } }) }),
        toggle({ label: t('settings.cycle.tips'), checked: s.features.dailyTips, onChange: (v) => save({ features: { ...s.features, dailyTips: v } }) }),
        toggle({ label: t('settings.cycle.celebrations'), description: t('settings.cycle.celebrationsDesc'), checked: s.features.celebrations, onChange: (v) => save({ features: { ...s.features, celebrations: v } }) }),
      ],
    }),
  );
}
