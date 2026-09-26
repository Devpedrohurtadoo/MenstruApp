// Full daily log in a bottom sheet. Changes are saved with "Save" or automatically when the
// sheet is closed, so nothing typed is ever lost.

import { h, replace } from '../core/dom.js';
import { t, fmtDate } from '../core/i18n.js';
import { addDays, todayISO } from '../core/dates.js';
import { icon } from '../ui/icons.js';
import { button, chip, chipGroup, iconButton, segmented, stepper, toggle } from '../ui/components.js';
import { openModal, confirmDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { celebrate } from '../ui/effects.js';
import { saveDay, store } from '../app.js';
import {
  FLOW,
  FLOW_COLORS,
  CLOTS,
  MOODS,
  MUCUS,
  LH,
  PREGNANCY_TEST,
  SEX,
  LIBIDO,
  EXERCISE,
  SYMPTOM_GROUPS,
  BLEEDING,
  DAILY_METHODS,
  symptomsForMode,
  cToF,
  fToC,
  kgToLb,
  lbToKg,
  BBT_RANGE_C,
  WEIGHT_RANGE_KG,
} from '../domain/catalog.js';
import { logSections } from '../domain/modes.js';

/** @param {string} [initialIso] */
export function openDayLog(initialIso) {
  let iso = initialIso && initialIso <= todayISO() ? initialIso : todayISO();
  /** @type {Record<string, any>} */
  let entry = {};
  let dirty = false;
  const content = h('div', { class: 'daylog' });

  const load = () => {
    entry = structuredClone(store.get().data?.days[iso] ?? {});
    delete entry.updatedAt;
    dirty = false;
    render();
  };

  const set = (/** @type {string} */ key, /** @type {any} */ value) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) delete entry[key];
    else entry[key] = value;
    dirty = true;
  };

  const persist = async (/** @type {{ silent?: boolean }} */ opts = {}) => {
    if (!dirty) return true;
    try {
      const { achievements } = await saveDay(iso, entry);
      dirty = false;
      if (!opts.silent) toast(t('log.saved'), { type: 'success' });
      for (const a of achievements) {
        toast(t('achievements.unlocked', { name: t(`achievements.${a}`) }), { type: 'success' });
        if (store.get().derived?.settings.features.celebrations) celebrate();
      }
      return true;
    } catch (err) {
      console.error(err);
      toast(t('errors.save'), { type: 'error' });
      return false;
    }
  };

  const changeDay = async (/** @type {number} */ delta) => {
    await persist({ silent: true });
    const next = addDays(iso, delta);
    if (next > todayISO()) return;
    iso = next;
    load();
    modalTitle();
  };

  const modalTitle = () => {
    const el = modal.el.querySelector('.modal__title');
    if (el) el.textContent = titleFor(iso);
  };

  const render = () => {
    const derived = store.get().derived;
    if (!derived) return;
    const mode = derived.settings.mode;
    const sections = logSections(mode);
    const tempUnit = derived.settings.temperatureUnit ?? 'C';
    const weightUnit = derived.settings.weightUnit ?? 'kg';
    const nav = h(
      'div',
      { class: 'daylog__nav' },
      iconButton({ icon: 'chevron-left', label: t('log.prevDay'), onClick: () => changeDay(-1) }),
      h('span', { class: 'daylog__date', text: fmtDate(iso, 'weekdayShort') }),
      iconButton({ icon: 'chevron-right', label: t('log.nextDay'), onClick: () => changeDay(1), class: iso >= todayISO() ? 'is-hidden' : '' }),
    );
    /** @type {Node[]} */
    const blocks = [nav];

    const section = (/** @type {string} */ id, /** @type {string} */ ic, /** @type {any[]} */ children, /** @type {boolean} */ open = true) =>
      h('details', { class: 'log-section', open }, h('summary', null, icon(ic, { size: 18 }), h('span', { text: t(`log.sections.${id}`) })), h('div', { class: 'log-section__body' }, children));

    for (const name of sections) {
      if (name === 'period' || name === 'bleeding') {
        const flowOptions = FLOW.map((f) => ({ value: f, label: t(`flow.${f}`), tone: f === 'none' ? undefined : 'period' }));
        /** @type {Node[]} */
        const children = [
          chipGroup({ label: t(name === 'bleeding' ? 'log.bleeding' : 'log.flow'), options: flowOptions, value: entry.flow, onChange: (v) => { set('flow', v); render(); } }),
        ];
        if (BLEEDING.has(entry.flow ?? '') || entry.flow === 'spotting') {
          children.push(
            chipGroup({ label: t('log.color'), options: FLOW_COLORS.map((c) => ({ value: c, label: t(`flowColors.${c}`) })), value: entry.flowColor, onChange: (v) => set('flowColor', v) }),
            chipGroup({ label: t('log.clots'), options: CLOTS.map((c) => ({ value: c, label: t(`clots.${c}`) })), value: entry.clots, onChange: (v) => set('clots', v) }),
            h('a', { class: 'link small', href: '#/learn/article/colores-flujo', text: t('log.colorGuide') }),
          );
        }
        if (name === 'bleeding') children.push(h('p', { class: 'muted small', text: t('log.pregnancyBleedingNote') }));
        blocks.push(section(name, 'droplet', children));
      }
      if (name === 'symptoms') blocks.push(section('symptoms', 'activity', symptomPicker(mode)));
      if (name === 'mood') {
        blocks.push(
          section('mood', 'brain', [
            chipGroup({ label: t('log.moods'), options: MOODS.map((m) => ({ value: m, label: t(`moods.${m}`) })), value: entry.moods ?? [], multiple: true, onChange: (v) => set('moods', v) }),
            segmented({
              label: t('log.energy'),
              options: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: t(`energy.${n}`) })),
              value: entry.energy ?? 0,
              onChange: (v) => set('energy', v),
            }),
            chipGroup({ label: t('log.libido'), options: LIBIDO.map((l) => ({ value: l, label: t(`libido.${l}`) })), value: entry.libido, onChange: (v) => set('libido', v) }),
          ]),
        );
      }
      if (name === 'fertility') {
        const bbtValue = typeof entry.bbt === 'number' ? (tempUnit === 'F' ? cToF(entry.bbt) : entry.bbt) : '';
        const [minC, maxC] = BBT_RANGE_C;
        const bbtInput = h('input', {
          class: 'input input--short',
          id: 'log-bbt',
          type: 'number',
          inputMode: 'decimal',
          step: '0.01',
          min: tempUnit === 'F' ? cToF(minC) : minC,
          max: tempUnit === 'F' ? cToF(maxC) : maxC,
          value: bbtValue,
          onChange: (/** @type {Event} */ e) => {
            const el = /** @type {HTMLInputElement} */ (e.target);
            const raw = parseFloat(el.value.replace(',', '.'));
            if (!el.value) return set('bbt', undefined);
            const c = tempUnit === 'F' ? fToC(raw) : raw;
            if (!Number.isFinite(c) || c < minC || c > maxC) {
              el.setAttribute('aria-invalid', 'true');
              toast(t('log.bbtInvalid'), { type: 'error' });
              return;
            }
            el.removeAttribute('aria-invalid');
            set('bbt', Math.round(c * 100) / 100);
          },
        });
        blocks.push(
          section(
            'fertility',
            'thermometer',
            [
              h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'log-bbt', text: t('log.bbt', { unit: tempUnit === 'F' ? '°F' : '°C' }) }), bbtInput, h('p', { class: 'field__hint', text: t('log.bbtHint') })),
              toggle({ label: t('log.bbtDisturbed'), description: t('log.bbtDisturbedDesc'), checked: Boolean(entry.bbtDisturbed), onChange: (v) => set('bbtDisturbed', v || undefined) }),
              chipGroup({ label: t('log.mucus'), options: MUCUS.map((m) => ({ value: m, label: t(`mucus.${m}`) })), value: entry.mucus, onChange: (v) => set('mucus', v) }),
              chipGroup({ label: t('log.lh'), options: LH.map((m) => ({ value: m, label: t(`lh.${m}`) })), value: entry.lh, onChange: (v) => set('lh', v) }),
              chipGroup({ label: t('log.pregnancyTest'), options: PREGNANCY_TEST.map((m) => ({ value: m, label: t(`pregnancyTest.${m}`) })), value: entry.pregnancyTest, onChange: (v) => set('pregnancyTest', v) }),
            ],
            derived.flags.fertilityFocus || Boolean(entry.bbt || entry.mucus || entry.lh || entry.pregnancyTest),
          ),
        );
      }
      if (name === 'sex') {
        blocks.push(section('sex', 'heart', [chipGroup({ label: t('log.sex'), options: SEX.map((m) => ({ value: m, label: t(`sex.${m}`) })), value: entry.sex, onChange: (v) => set('sex', v) }), h('p', { class: 'muted small', text: t('log.sexPrivacy') })], Boolean(entry.sex)));
      }
      if (name === 'contraception') {
        const method = derived.settings.contraception?.method;
        const children = [];
        if (method && DAILY_METHODS.has(method)) {
          children.push(toggle({ label: t('log.contraceptionTaken'), checked: entry.contraceptionTaken === true, onChange: (v) => set('contraceptionTaken', v) }));
        }
        children.push(medsEditor());
        blocks.push(section('contraception', 'pill', children, Boolean(entry.meds?.length || entry.contraceptionTaken !== undefined)));
      }
      if (name === 'body') {
        const weightValue = typeof entry.weight === 'number' ? (weightUnit === 'lb' ? kgToLb(entry.weight) : entry.weight) : '';
        const weightInput = h('input', {
          class: 'input input--short',
          id: 'log-weight',
          type: 'number',
          inputMode: 'decimal',
          step: '0.1',
          value: weightValue,
          onChange: (/** @type {Event} */ e) => {
            const el = /** @type {HTMLInputElement} */ (e.target);
            if (!el.value) return set('weight', undefined);
            const raw = parseFloat(el.value.replace(',', '.'));
            const kg = weightUnit === 'lb' ? lbToKg(raw) : raw;
            if (!Number.isFinite(kg) || kg < WEIGHT_RANGE_KG[0] || kg > WEIGHT_RANGE_KG[1]) {
              el.setAttribute('aria-invalid', 'true');
              toast(t('log.weightInvalid'), { type: 'error' });
              return;
            }
            el.removeAttribute('aria-invalid');
            set('weight', Math.round(kg * 10) / 10);
          },
        });
        blocks.push(
          section(
            'body',
            'bed',
            [
              stepper({ label: t('log.sleep'), value: entry.sleepHours ?? null, min: 0, max: 24, step: 0.5, decimals: 1, unit: t('common.hoursShort'), allowUnknown: true, unknownLabel: '—', onChange: (v) => set('sleepHours', v ?? undefined) }),
              stepper({ label: t('log.water'), value: entry.water ?? null, min: 0, max: 40, unit: t('log.glasses'), allowUnknown: true, unknownLabel: '—', onChange: (v) => set('water', v ?? undefined) }),
              chipGroup({ label: t('log.exercise'), options: EXERCISE.map((m) => ({ value: m, label: t(`exercise.${m}`) })), value: entry.exercise, onChange: (v) => set('exercise', v) }),
              h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'log-weight', text: t('log.weight', { unit: weightUnit }) }), weightInput),
            ],
            Boolean(entry.sleepHours || entry.water || entry.exercise || entry.weight),
          ),
        );
      }
      if (name === 'notes') {
        const counter = h('span', { class: 'field__hint', 'aria-live': 'polite', text: t('log.charsLeft', { count: 2000 - (entry.notes?.length ?? 0) }) });
        blocks.push(
          section(
            'notes',
            'notebook-pen',
            [
              h('label', { class: 'field__label sr-only', for: 'log-notes', text: t('log.notes') }),
              h('textarea', {
                class: 'input textarea',
                id: 'log-notes',
                rows: 4,
                maxLength: 2000,
                placeholder: t('log.notesPlaceholder'),
                value: entry.notes ?? '',
                onInput: (/** @type {Event} */ e) => {
                  const v = /** @type {HTMLTextAreaElement} */ (e.target).value;
                  set('notes', v.trim() ? v : undefined);
                  counter.textContent = t('log.charsLeft', { count: 2000 - v.length });
                },
              }),
              counter,
            ],
            Boolean(entry.notes),
          ),
        );
      }
    }
    replace(content, blocks);
  };

  const symptomPicker = (/** @type {string} */ mode) => {
    const list = symptomsForMode(mode);
    return SYMPTOM_GROUPS.map((group) => {
      const items = list.filter((s) => s.group === group);
      if (!items.length) return null;
      return h(
        'div',
        { class: ['symptom-group', group === 'warning' ? 'symptom-group--warning' : ''] },
        h('h4', { class: 'symptom-group__title', text: t(`symptomGroups.${group}`) }),
        group === 'warning' ? h('p', { class: 'muted small', text: t('log.warningSymptomsNote') }) : null,
        h(
          'div',
          { class: 'chips' },
          items.map((s) => {
            const level = entry.symptoms?.[s.id] ?? 0;
            const btn = chip({
              label: t(`symptoms.${s.id}`),
              selected: level > 0,
              level: level || undefined,
              tone: s.redFlag ? 'warning' : 'symptom',
              onClick: () => {
                const next = { ...(entry.symptoms ?? {}) };
                const lv = (next[s.id] ?? 0) + 1;
                if (lv > 3) delete next[s.id];
                else next[s.id] = lv;
                set('symptoms', Object.keys(next).length ? next : undefined);
                const fresh = symptomPicker(mode);
                { const body = btn.closest('.log-section__body'); if (body) replace(body, fresh); }
                /** @type {HTMLElement | null} */ (content.querySelector(`[data-sym="${s.id}"]`))?.focus();
              },
            });
            btn.dataset.sym = s.id;
            btn.setAttribute('aria-label', `${t(`symptoms.${s.id}`)}: ${level ? t(`intensity.${level}`) : t('intensity.0')}`);
            return btn;
          }),
        ),
      );
    }).concat(h('p', { class: 'muted small', text: t('log.intensityHint') }));
  };

  const medsEditor = () => {
    const wrap = h('div', { class: 'meds' });
    const draw = () => {
      const meds = /** @type {Array<{ name: string, dose?: string }>} */ (entry.meds ?? []);
      const nameInput = h('input', { class: 'input', id: 'med-name', maxLength: 80, placeholder: t('log.medName'), autocomplete: 'off' });
      const doseInput = h('input', { class: 'input input--short', id: 'med-dose', maxLength: 40, placeholder: t('log.medDose'), autocomplete: 'off' });
      replace(
        wrap,
        h('span', { class: 'field__label', text: t('log.meds') }),
        meds.length
          ? h(
              'ul',
              { class: 'meds__list' },
              meds.map((m, i) =>
                h(
                  'li',
                  null,
                  h('span', { text: m.dose ? `${m.name} · ${m.dose}` : m.name }),
                  iconButton({
                    icon: 'close',
                    label: t('log.removeMed', { name: m.name }),
                    size: 16,
                    onClick: () => {
                      set('meds', meds.filter((_, j) => j !== i));
                      draw();
                    },
                  }),
                ),
              ),
            )
          : null,
        h(
          'form',
          {
            class: 'meds__add',
            onSubmit: (/** @type {SubmitEvent} */ e) => {
              e.preventDefault();
              const name = nameInput.value.trim();
              if (!name) return;
              if (meds.length >= 12) return toast(t('log.medsLimit'), { type: 'error' });
              set('meds', [...meds, doseInput.value.trim() ? { name, dose: doseInput.value.trim() } : { name }]);
              draw();
              /** @type {HTMLElement | null} */ (wrap.querySelector('#med-name'))?.focus();
            },
          },
          h('label', { class: 'sr-only', for: 'med-name', text: t('log.medName') }),
          nameInput,
          h('label', { class: 'sr-only', for: 'med-dose', text: t('log.medDose') }),
          doseInput,
          button({ label: t('common.add'), icon: 'plus', variant: 'soft', size: 'sm', type: 'submit' }),
        ),
      );
    };
    draw();
    return wrap;
  };

  const footer = h(
    'div',
    { class: 'btn-row' },
    button({
      label: t('log.clearDay'),
      icon: 'delete',
      variant: 'ghost',
      onClick: async () => {
        if (!Object.keys(store.get().data?.days[iso] ?? {}).length && !Object.keys(entry).length) return;
        const ok = await confirmDialog({ title: t('log.clearDayTitle'), message: t('log.clearDayText', { date: fmtDate(iso, 'long') }), confirmLabel: t('common.delete'), danger: true });
        if (!ok) return;
        entry = {};
        dirty = true;
        if (await persist({ silent: true })) {
          toast(t('log.cleared'));
          render();
        }
      },
    }),
    button({
      label: t('common.save'),
      icon: 'check',
      variant: 'primary',
      onClick: async () => {
        if (await persist()) {
          saved = true;
          modal.close();
        }
      },
    }),
  );
  let saved = false;
  const modal = openModal({
    title: titleFor(iso),
    content,
    footer,
    variant: 'sheet',
    className: 'modal__panel--tall',
    onClose: () => {
      if (!saved && dirty) persist().then((ok) => ok && toast(t('log.autoSaved')));
    },
  });
  load();
}

/** @param {string} iso */
function titleFor(iso) {
  const today = todayISO();
  if (iso === today) return t('log.titleToday');
  if (iso === addDays(today, -1)) return t('log.titleYesterday');
  return fmtDate(iso, 'dayMonth');
}
