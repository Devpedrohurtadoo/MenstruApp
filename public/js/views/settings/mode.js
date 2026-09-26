import { h, replace } from '../../core/dom.js';
import { t, fmtDate } from '../../core/i18n.js';
import { todayISO, addDays, isISODate } from '../../core/dates.js';
import { icon } from '../../ui/icons.js';
import { button, card, chipGroup, toggle, segmented, notice } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { openModal, confirmDialog } from '../../ui/modal.js';
import { updateSettings, store, startPregnancy, endPregnancy, saveReminders } from '../../app.js';
import { MODES, CONTRACEPTION } from '../../domain/catalog.js';
import { defaultReminders } from '../../domain/reminders.js';
import { pregnancyDateRange } from '../../domain/pregnancy.js';

const MODE_ICONS = { track: 'calendar', conceive: 'sprout', avoid: 'shield', pregnant: 'baby', postpartum: 'heart-handshake', perimenopause: 'leaf' };

/** @param {import('../shell.js').ViewContext} ctx */
export function render(ctx) {
  const d = /** @type {NonNullable<typeof ctx.state.derived>} */ (ctx.state.derived);
  const settings = d.settings;
  const blocks = [];

  blocks.push(
    card({
      title: t('settings.mode.current'),
      icon: MODE_ICONS[/** @type {keyof typeof MODE_ICONS} */ (settings.mode)],
      children: [
        h('p', { class: 'lead', text: t(`modes.${settings.mode}.title`) }),
        h('p', { class: 'muted', text: t(`modes.${settings.mode}.desc`) }),
        settings.modeSince ? h('p', { class: 'muted small', text: t('settings.mode.since', { date: fmtDate(settings.modeSince, 'long') }) }) : null,
      ],
    }),
  );

  if (settings.mode === 'pregnant' && d.pregnancy) {
    blocks.push(
      card({
        title: t('settings.mode.pregnancy'),
        icon: 'baby',
        children: [
          d.pregnancy.issue ? notice({ level: 'info', title: t(`pregnancy.invalid.${d.pregnancy.issue}`), text: t('pregnancy.invalid.text') }) : null,
          h('p', { text: t('pregnancy.weeks', { weeks: d.pregnancy.weeks, days: d.pregnancy.days }) }),
          h('p', { class: 'muted', text: t('settings.mode.dueDate', { date: fmtDate(d.pregnancy.dueDate, 'long') }) }),
          h(
            'div',
            { class: 'btn-row' },
            button({ label: t('settings.mode.editPregnancy'), icon: 'edit', variant: 'soft', onClick: () => pregnancyDialog() }),
            button({ label: t('settings.mode.endPregnancy'), variant: 'ghost', onClick: () => endPregnancyDialog() }),
          ),
        ],
      }),
    );
  } else {
    blocks.push(
      h('h2', { class: 'section-heading', text: t('settings.mode.change') }),
      h(
        'div',
        { class: 'mode-grid' },
        MODES.filter((m) => m !== settings.mode).map((m) =>
          h(
            'button',
            {
              type: 'button',
              class: 'mode-card',
              onClick: async () => {
                if (m === 'pregnant') return pregnancyDialog();
                const ok = await confirmDialog({
                  title: t('settings.mode.confirmTitle', { mode: t(`modes.${m}.title`) }),
                  message: t('settings.mode.confirmText'),
                  confirmLabel: t('common.change'),
                });
                if (!ok) return;
                /** @type {Record<string, any>} */
                const patch = { mode: m };
                if (m === 'postpartum' && !settings.postpartum) patch.postpartum = { birthDate: todayISO(), breastfeeding: 'partial', periodReturned: false };
                await updateSettings(patch);
                await ensureModeReminders(m);
                toast(t('settings.mode.changed'), { type: 'success' });
              },
            },
            h('span', { class: 'mode-card__icon' }, icon(MODE_ICONS[/** @type {keyof typeof MODE_ICONS} */ (m)], { size: 22 })),
            h('span', { class: 'mode-card__title', text: t(`modes.${m}.title`) }),
            h('span', { class: 'mode-card__desc', text: t(`modes.${m}.desc`) }),
          ),
        ),
      ),
    );
  }

  if (settings.mode === 'postpartum') {
    const pp = settings.postpartum ?? { birthDate: todayISO(), breastfeeding: 'partial', periodReturned: false };
    blocks.push(
      card({
        title: t('settings.mode.postpartum'),
        icon: 'heart-handshake',
        children: [
          dateField('pp-birth', t('onboarding.birthDate'), pp.birthDate, (v) => updateSettings({ postpartum: { ...pp, birthDate: v } }), { min: addDays(todayISO(), -730) }),
          chipGroup({
            label: t('onboarding.breastfeeding'),
            options: ['exclusive', 'partial', 'no'].map((v) => ({ value: v, label: t(`onboarding.bf.${v}`) })),
            value: pp.breastfeeding,
            allowNone: false,
            onChange: (v) => updateSettings({ postpartum: { ...pp, breastfeeding: v } }),
          }),
          toggle({
            label: t('onboarding.periodReturned'),
            description: t('settings.mode.periodReturnedDesc'),
            checked: pp.periodReturned,
            onChange: (v) => updateSettings({ postpartum: { ...pp, periodReturned: v } }),
          }),
          pp.breastfeeding === 'exclusive' ? notice({ level: 'info', title: t('settings.mode.lamTitle'), text: t('settings.mode.lamText') }) : null,
        ],
      }),
    );
  }

  if (settings.mode === 'perimenopause') {
    const overAYear = Boolean(settings.menopause?.overAYear);
    blocks.push(
      card({
        title: t('modes.perimenopause.title'),
        icon: 'leaf',
        children: toggle({
          label: t('onboarding.overAYear'),
          description: t('onboarding.overAYearDesc'),
          checked: overAYear,
          onChange: (v) => updateSettings({ menopause: { overAYear: v } }),
        }),
      }),
    );
  }

  if (settings.mode === 'avoid' || settings.mode === 'track' || settings.mode === 'postpartum') {
    const c = settings.contraception ?? { method: 'none' };
    blocks.push(
      card({
        title: t('settings.mode.contraception'),
        icon: 'pill',
        children: [
          chipGroup({
            label: t('onboarding.method'),
            options: CONTRACEPTION.map((m) => ({ value: m, label: t(`contraception.${m}`) })),
            value: c.method,
            allowNone: false,
            onChange: async (v) => {
              // The pill-free week only exists for the combined pill: other methods keep no regimen.
              const { pillRegimen, ...rest } = c;
              await updateSettings({ contraception: v === 'pill_combined' ? { ...rest, method: v, pillRegimen: pillRegimen ?? '21_7' } : { ...rest, method: v } });
              await ensureMethodReminder(v);
            },
          }),
          c.method === 'pill_combined'
            ? chipGroup({
                label: t('onboarding.pillRegimen'),
                options: ['21_7', '24_4', '28', 'continuous'].map((v) => ({ value: v, label: t(`contraception.regimen.${v}`) })),
                value: c.pillRegimen ?? '21_7',
                allowNone: false,
                onChange: (v) => updateSettings({ contraception: { ...c, pillRegimen: v } }),
              })
            : null,
          ['pill_combined', 'pill_progestin', 'patch', 'ring', 'injection', 'iud_hormonal', 'iud_copper', 'implant'].includes(c.method)
            ? dateField(
                'c-start',
                t(`settings.mode.startDate.${c.method.startsWith('pill') ? 'pill' : c.method}`),
                c.startDate ?? null,
                (v) => updateSettings({ contraception: { ...c, startDate: v } }),
                { min: addDays(todayISO(), -3650) },
              )
            : null,
          h('a', { class: 'link', href: '#/learn/article/metodos-anticonceptivos', text: t('settings.mode.compareMethods') }),
        ],
      }),
    );
  }

  if (settings.mode === 'avoid') {
    blocks.push(
      card({
        title: t('settings.mode.fertilityInAvoid'),
        icon: 'egg',
        children: [
          toggle({
            label: t('settings.mode.showFertility'),
            description: t('settings.mode.showFertilityDesc'),
            checked: Boolean(settings.features.fertilityInAvoid),
            onChange: (v) => updateSettings({ features: { ...settings.features, fertilityInAvoid: v } }),
          }),
          notice({ level: 'info', title: t('onboarding.notContraceptionTitle'), text: t('onboarding.notContraception') }),
        ],
      }),
    );
  }
  return h('div', { class: 'stack' }, blocks);
}

/**
 * @param {string} id
 * @param {string} label
 * @param {string | null} value
 * @param {(v: string) => any} onChange
 * @param {{ min?: string, max?: string }} [range]
 */
function dateField(id, label, value, onChange, range = {}) {
  return h(
    'div',
    { class: 'field' },
    h('label', { class: 'field__label', for: id, text: label }),
    h('input', {
      type: 'date',
      class: 'input',
      id,
      value: value ?? '',
      min: range.min,
      max: range.max ?? todayISO(),
      onChange: (/** @type {Event} */ e) => {
        const v = /** @type {HTMLInputElement} */ (e.target).value;
        if (isISODate(v)) onChange(v);
      },
    }),
  );
}

/** @param {string} mode */
async function ensureModeReminders(mode) {
  const current = store.get().data?.docs.reminders?.items ?? [];
  const ids = new Set(current.map((/** @type {{ id: string }} */ r) => r.id));
  const extra = defaultReminders(mode).filter((r) => !ids.has(r.id));
  if (extra.length) await saveReminders([...current, ...extra]);
}

/** @param {string} method */
async function ensureMethodReminder(method) {
  /** @type {Record<string, string>} */
  const map = { pill_combined: 'pill', pill_progestin: 'pill', patch: 'patch', ring: 'ring', injection: 'injection' };
  const type = map[method];
  if (!type) return;
  const current = store.get().data?.docs.reminders?.items ?? [];
  if (current.some((/** @type {{ type: string }} */ r) => r.type === type)) return;
  await saveReminders([...current, { id: type, type, enabled: false, time: type === 'pill' ? '21:00' : '09:00', ...(type === 'injection' ? { daysBefore: 7 } : {}) }]);
}

function pregnancyDialog() {
  const preg = store.get().data?.docs.pregnancy;
  let basis = preg?.active ? preg.basis : 'lmp';
  let date = preg?.active ? preg.date : null;
  const box = h('div', { class: 'stack' });
  const draw = () => {
    replace(
      box,
      segmented({
        label: t('onboarding.pregBasis'),
        options: [
          { value: 'lmp', label: t('onboarding.pregLmp') },
          { value: 'due', label: t('onboarding.pregDue') },
          { value: 'conception', label: t('onboarding.pregConception') },
        ],
        value: basis,
        onChange: (v) => {
          basis = v;
          date = null;
          draw();
        },
      }),
      dateField(
        'preg-date-s',
        t(`onboarding.pregDateLabel.${basis}`),
        date,
        (v) => (date = v),
        pregnancyDateRange(/** @type {'lmp' | 'due' | 'conception'} */ (basis), todayISO()),
      ),
      button({
        label: t('common.save'),
        variant: 'primary',
        full: true,
        onClick: async () => {
          if (!date) return toast(t('onboarding.errors.pregDate'), { type: 'error' });
          await startPregnancy({ basis: /** @type {any} */ (basis), date });
          await ensureModeReminders('pregnant');
          modal.close();
          toast(t('settings.mode.changed'), { type: 'success' });
        },
      }),
    );
  };
  draw();
  const modal = openModal({ title: t('settings.mode.pregnancy'), content: box, variant: 'dialog' });
}

function endPregnancyDialog() {
  /** @type {'birth' | 'loss' | 'other' | null} */
  let outcome = null;
  let date = todayISO();
  let nextMode = 'postpartum';
  let breastfeeding = /** @type {'exclusive' | 'partial' | 'no'} */ ('exclusive');
  const box = h('div', { class: 'stack' });
  const draw = () => {
    replace(
      box,
      h('p', { class: 'muted', text: t('settings.mode.endIntro') }),
      chipGroup({
        label: t('settings.mode.outcome'),
        options: [
          { value: 'birth', label: t('settings.mode.outcomes.birth') },
          { value: 'loss', label: t('settings.mode.outcomes.loss') },
          { value: 'other', label: t('settings.mode.outcomes.other') },
        ],
        value: outcome,
        allowNone: false,
        onChange: (v) => {
          outcome = v;
          nextMode = v === 'birth' ? 'postpartum' : 'track';
          draw();
        },
      }),
      outcome === 'loss'
        ? notice({
            level: 'info',
            title: t('settings.mode.lossTitle'),
            text: t('settings.mode.lossText'),
            action: h('a', { class: 'link', href: '#/learn/article/perdida-gestacional', text: t('common.learnMore') }),
          })
        : null,
      outcome ? dateField('end-date', t('settings.mode.endDate'), date, (v) => (date = v), { min: addDays(todayISO(), -365) }) : null,
      outcome === 'birth'
        ? chipGroup({
            label: t('onboarding.breastfeeding'),
            options: ['exclusive', 'partial', 'no'].map((v) => ({ value: v, label: t(`onboarding.bf.${v}`) })),
            value: breastfeeding,
            allowNone: false,
            onChange: (v) => (breastfeeding = v),
          })
        : null,
      outcome && outcome !== 'birth'
        ? chipGroup({
            label: t('settings.mode.nextMode'),
            options: ['track', 'conceive', 'avoid', 'postpartum'].map((m) => ({ value: m, label: t(`modes.${m}.title`) })),
            value: nextMode,
            allowNone: false,
            onChange: (v) => (nextMode = v),
          })
        : null,
      outcome
        ? button({
            label: t('common.save'),
            variant: 'primary',
            full: true,
            onClick: async () => {
              await endPregnancy({ outcome: /** @type {any} */ (outcome), date, nextMode, breastfeeding });
              modal.close();
              toast(outcome === 'birth' ? t('settings.mode.congrats') : t('settings.mode.saved'), { type: 'success' });
            },
          })
        : null,
    );
  };
  draw();
  const modal = openModal({ title: t('settings.mode.endPregnancy'), content: box, variant: 'dialog' });
}
