// First-run onboarding: privacy first, then mode, cycle basics, profile, protection and
// reminders. Data from Menstruapp v2 (plain localStorage) is detected and imported encrypted.

import { h, replace, announce, preservingFocus } from '../core/dom.js';
import { t, setLanguage, getLanguage, LANGUAGES } from '../core/i18n.js';
import { todayISO, addDays, isISODate, rangeISO } from '../core/dates.js';
import { icon } from '../ui/icons.js';
import { button, segmented, stepper, toggle, chipGroup, notice, rovingRadios } from '../ui/components.js';
import { toast } from '../ui/toast.js';
import { openModal } from '../ui/modal.js';
import { celebrate } from '../ui/effects.js';
import { createProfile, setPrefs, enableBiometric } from '../app.js';
import { readLegacyData, clearLegacyData } from '../data/legacy.js';
import { secretProblem } from '../security/vault.js';
import { biometricsLikelyAvailable } from '../security/webauthn.js';
import { MODES, CONTRACEPTION } from '../domain/catalog.js';
import { pregnancyDateRange } from '../domain/pregnancy.js';
import { brandMark } from './brand.js';
import { showRecoveryCode } from './security-flows.js';
import { privacyPolicy } from './legal.js';
import { installCard } from '../pwa/install.js';

const AVATARS = ['🌙', '🌸', '🌷', '🌺', '🌼', '🦋', '🌿', '✨', '💜', '🌊', '🍓', '🐱'];
const MODE_ICONS = { track: 'calendar', conceive: 'sprout', avoid: 'shield', pregnant: 'baby', postpartum: 'heart-handshake', perimenopause: 'leaf' };

/**
 * @param {HTMLElement} root
 * @param {{ onFinish: () => void }} opts
 */
export function renderOnboarding(root, opts) {
  const legacy = readLegacyData();
  const s = {
    step: 0,
    consent: false,
    importLegacy: Boolean(legacy && legacy.stats.days > 0),
    mode: /** @type {string | null} */ (null),
    lastPeriod: /** @type {string | null} */ (null),
    lastPeriodUnknown: false,
    periodLength: /** @type {number | null} */ (legacy?.settings.periodLength ?? 5),
    cycleLength: /** @type {number | null} */ (legacy?.settings.cycleLength ?? 28),
    experience: 'experienced',
    method: 'none',
    pillRegimen: '21_7',
    packStart: todayISO(),
    pillTime: '21:00',
    pregBasis: /** @type {'lmp' | 'due' | 'conception'} */ ('lmp'),
    pregDate: /** @type {string | null} */ (null),
    birthDate: /** @type {string | null} */ (null),
    breastfeeding: 'exclusive',
    periodReturned: false,
    overAYear: false,
    name: legacy?.profile.name ?? '',
    birthYear: /** @type {number | null} */ (legacy?.profile.birthYear ?? null),
    avatar: '🌙',
    lock: /** @type {'pin' | 'passphrase' | 'none'} */ ('pin'),
    secret: '',
    secret2: '',
    noneAck: false,
    reminders: /** @type {Record<string, boolean>} */ ({ period_soon: true, log_daily: false, pill: true, bbt: false, pregnancy_week: true }),
    busy: false,
  };
  if (legacy?.theme?.accent && /^#[0-9a-f]{6}$/i.test(legacy.theme.accent)) setPrefs({ accent: legacy.theme.accent });

  const screen = h('main', { class: 'screen onboarding' });
  replace(root, screen);

  const STEPS = ['welcome', 'mode', 'basics', 'profile', 'protect', 'reminders'];

  const go = (/** @type {number} */ delta) => {
    s.step = Math.max(0, Math.min(STEPS.length - 1, s.step + delta));
    render();
    const heading = /** @type {HTMLElement | null} */ (screen.querySelector('h1'));
    heading?.focus();
  };

  // Validation errors are announced by fail() and linked to the fields (aria-describedby);
  // no role="alert" here, or they would be read twice.
  const errorBox = () => h('p', { class: 'field__error', id: 'ob-error', hidden: true });

  const dateInput = (/** @type {string} */ id, /** @type {string | null} */ value, /** @type {(v: string | null) => void} */ onChange, /** @type {{ min?: string, max?: string }} */ range = {}) =>
    h('input', {
      type: 'date',
      class: 'input',
      id,
      'aria-describedby': 'ob-error',
      value: value ?? '',
      max: range.max ?? todayISO(),
      min: range.min ?? '1990-01-01',
      onChange: (/** @type {Event} */ e) => {
        const v = /** @type {HTMLInputElement} */ (e.target).value;
        onChange(isISODate(v) ? v : null);
      },
    });

  const views = {
    welcome: () => {
      const langSwitch = segmented({
        label: t('onboarding.language'),
        key: 'lang',
        hideLabel: true,
        options: LANGUAGES.map((l) => ({ value: l.code, label: l.label })),
        value: getLanguage(),
        onChange: (code) => {
          setLanguage(code);
          setPrefs({ lang: /** @type {'es' | 'en'} */ (code) });
          render();
        },
      });
      const consentHint = h('p', { class: 'muted small', id: 'consent-hint', hidden: s.consent, text: t('onboarding.consentHint') });
      const consent = h('input', {
        type: 'checkbox',
        id: 'consent',
        checked: s.consent,
        onChange: (/** @type {Event} */ e) => {
          s.consent = /** @type {HTMLInputElement} */ (e.target).checked;
          startBtn.disabled = !s.consent;
          consentHint.hidden = s.consent;
        },
      });
      const startBtn = button({ label: t('onboarding.start'), variant: 'primary', size: 'lg', full: true, disabled: !s.consent, attrs: { 'aria-describedby': 'consent-hint' }, onClick: () => go(1) });
      return {
        title: t('onboarding.welcomeTitle'),
        body: [
          h('div', { class: 'onboarding__lang' }, icon('languages', { size: 18 }), langSwitch),
          h('p', { class: 'lead', text: t('onboarding.welcomeLead') }),
          h(
            'ul',
            { class: 'promise-list' },
            [
              ['lock', 'onboarding.promise1'],
              ['shield-check', 'onboarding.promise2'],
              ['cloud-off', 'onboarding.promise3'],
              ['heart', 'onboarding.promise4'],
            ].map(([ic, key]) => h('li', null, h('span', { class: 'promise-list__icon' }, icon(ic, { size: 20 })), h('span', { text: t(key) }))),
          ),
          legacy
            ? notice({
                level: 'info',
                title: t('onboarding.legacyTitle', { count: legacy.stats.days }),
                text: t('onboarding.legacyText'),
                action: toggle({ label: t('onboarding.legacyImport'), checked: s.importLegacy, onChange: (v) => (s.importLegacy = v) }),
              })
            : null,
          // One whole sentence (no pieces glued together) and the policy link outside the label.
          h('label', { class: 'check', for: 'consent' }, consent, h('span', { text: t('onboarding.consent') })),
          h('button', { type: 'button', class: 'link-btn', text: t('onboarding.readPolicy'), onClick: () => openModal({ title: t('legal.privacyTitle'), content: privacyPolicy(), variant: 'full' }) }),
          h('p', { class: 'muted small', text: t('onboarding.disclaimer') }),
        ],
        footer: [startBtn, consentHint],
      };
    },

    mode: () => ({
      title: t('onboarding.modeTitle'),
      body: [
        h('p', { class: 'lead', text: t('onboarding.modeLead') }),
        rovingRadios(h(
          'div',
          { class: 'mode-grid', role: 'radiogroup', 'aria-label': t('onboarding.modeTitle') },
          MODES.map((m) =>
            h(
              'button',
              {
                type: 'button',
                role: 'radio',
                'aria-checked': String(s.mode === m),
                dataset: { fk: `mode-${m}` },
                class: ['mode-card', s.mode === m ? 'is-on' : ''],
                onClick: () => {
                  s.mode = m;
                  render();
                },
              },
              h('span', { class: 'mode-card__icon' }, icon(MODE_ICONS[/** @type {keyof typeof MODE_ICONS} */ (m)], { size: 24 })),
              h('span', { class: 'mode-card__title', text: t(`modes.${m}.title`) }),
              h('span', { class: 'mode-card__desc', text: t(`modes.${m}.desc`) }),
            ),
          ),
        )),
      ],
      valid: () => Boolean(s.mode),
    }),

    basics: () => {
      const err = errorBox();
      /** @type {Node[]} */
      const body = [];
      const mode = s.mode;
      if (mode === 'pregnant') {
        body.push(
          segmented({
            label: t('onboarding.pregBasis'),
            options: [
              { value: 'lmp', label: t('onboarding.pregLmp') },
              { value: 'due', label: t('onboarding.pregDue') },
              { value: 'conception', label: t('onboarding.pregConception') },
            ],
            value: s.pregBasis,
            onChange: (v) => {
              s.pregBasis = /** @type {any} */ (v);
              s.pregDate = null;
              render();
            },
          }),
          h('label', { class: 'field__label', for: 'preg-date', text: t(`onboarding.pregDateLabel.${s.pregBasis}`) }),
          dateInput('preg-date', s.pregDate, (v) => (s.pregDate = v), pregnancyDateRange(s.pregBasis, todayISO())),
        );
      } else if (mode === 'postpartum') {
        body.push(
          h('label', { class: 'field__label', for: 'birth-date', text: t('onboarding.birthDate') }),
          dateInput('birth-date', s.birthDate, (v) => (s.birthDate = v), { min: addDays(todayISO(), -730) }),
          chipGroup({
            label: t('onboarding.breastfeeding'),
            options: ['exclusive', 'partial', 'no'].map((v) => ({ value: v, label: t(`onboarding.bf.${v}`) })),
            value: s.breastfeeding,
            allowNone: false,
            onChange: (v) => (s.breastfeeding = v),
          }),
          toggle({ label: t('onboarding.periodReturned'), checked: s.periodReturned, onChange: (v) => { s.periodReturned = v; render(); } }),
        );
        if (s.periodReturned) {
          body.push(h('label', { class: 'field__label', for: 'last-period', text: t('onboarding.lastPeriod') }), dateInput('last-period', s.lastPeriod, (v) => (s.lastPeriod = v)));
        }
      } else {
        if (mode === 'perimenopause') {
          body.push(toggle({ label: t('onboarding.overAYear'), description: t('onboarding.overAYearDesc'), checked: s.overAYear, onChange: (v) => { s.overAYear = v; render(); } }));
        }
        if (!(mode === 'perimenopause' && s.overAYear)) {
          body.push(
            h('label', { class: 'field__label', for: 'last-period', text: t('onboarding.lastPeriod') }),
            h(
              'div',
              { class: 'quick-dates' },
              dateInput('last-period', s.lastPeriod, (v) => {
                s.lastPeriod = v;
                s.lastPeriodUnknown = false;
              }),
              h('div', { class: 'chips' }, [
                ['today', todayISO()],
                ['yesterday', addDays(todayISO(), -1)],
              ].map(([key, iso]) =>
                h('button', { type: 'button', class: ['chip', s.lastPeriod === iso ? 'chip--on' : ''], 'aria-pressed': String(s.lastPeriod === iso), dataset: { fk: `quick-${key}` }, text: t(`common.${key}`), onClick: () => { s.lastPeriod = iso; s.lastPeriodUnknown = false; render(); } }),
              ), h('button', { type: 'button', class: ['chip', s.lastPeriodUnknown ? 'chip--on' : ''], 'aria-pressed': String(s.lastPeriodUnknown), dataset: { fk: 'quick-unknown' }, text: t('onboarding.dontRemember'), onClick: () => { s.lastPeriodUnknown = !s.lastPeriodUnknown; if (s.lastPeriodUnknown) s.lastPeriod = null; render(); } })),
            ),
            stepper({ label: t('onboarding.periodLength'), key: 'period-length', value: s.periodLength, min: 1, max: 12, unit: t('common.daysShort'), allowUnknown: true, onChange: (v) => (s.periodLength = v) }),
            stepper({ label: t('onboarding.cycleLength'), key: 'cycle-length', value: s.cycleLength, min: 18, max: 60, unit: t('common.daysShort'), allowUnknown: true, onChange: (v) => (s.cycleLength = v) }),
            h('p', { class: 'field__hint', text: t('onboarding.cycleLengthHint') }),
          );
        }
        if (mode !== 'perimenopause') {
          body.push(toggle({ label: t('onboarding.newToThis'), description: t('onboarding.newToThisDesc'), checked: s.experience === 'new', onChange: (v) => (s.experience = v ? 'new' : 'experienced') }));
        }
        if (mode === 'avoid' || mode === 'track') {
          body.push(
            chipGroup({
              label: t('onboarding.method'),
              options: CONTRACEPTION.map((m) => ({ value: m, label: t(`contraception.${m}`) })),
              value: s.method,
              allowNone: false,
              onChange: (v) => {
                s.method = v;
                render();
              },
            }),
          );
          if (s.method.startsWith('pill')) {
            body.push(
              // Only the combined pill has a pill-free week; the minipill is taken every day.
              ...(s.method === 'pill_combined'
                ? [
                    chipGroup({
                      label: t('onboarding.pillRegimen'),
                      options: ['21_7', '24_4', '28', 'continuous'].map((v) => ({ value: v, label: t(`contraception.regimen.${v}`) })),
                      value: s.pillRegimen,
                      allowNone: false,
                      onChange: (v) => (s.pillRegimen = v),
                    }),
                  ]
                : []),
              h('label', { class: 'field__label', for: 'pack-start', text: t('onboarding.packStart') }),
              dateInput('pack-start', s.packStart, (v) => (s.packStart = v ?? todayISO()), { min: addDays(todayISO(), -60) }),
              h('label', { class: 'field__label', for: 'pill-time', text: t('onboarding.pillTime') }),
              h('input', { type: 'time', class: 'input', id: 'pill-time', value: s.pillTime, onChange: (/** @type {Event} */ e) => (s.pillTime = /** @type {HTMLInputElement} */ (e.target).value || '21:00') }),
            );
          }
          if (mode === 'avoid') body.push(notice({ level: 'info', title: t('onboarding.notContraceptionTitle'), text: t('onboarding.notContraception') }));
        }
      }
      body.push(err);
      return {
        title: t(`onboarding.basicsTitle.${mode}`),
        body,
        valid: () => {
          const fail = (/** @type {string} */ key) => {
            err.textContent = t(key);
            err.hidden = false;
            return false;
          };
          if (mode === 'pregnant' && !s.pregDate) return fail('onboarding.errors.pregDate');
          if (mode === 'postpartum' && !s.birthDate) return fail('onboarding.errors.birthDate');
          return true;
        },
      };
    },

    profile: () => {
      const nameInput = h('input', { class: 'input', id: 'ob-name', value: s.name, maxLength: 40, autocomplete: 'nickname', onInput: (/** @type {Event} */ e) => (s.name = /** @type {HTMLInputElement} */ (e.target).value) });
      const err = errorBox();
      const maxYear = new Date().getFullYear() - 8;
      const yearInput = h('input', {
        class: 'input',
        id: 'ob-year',
        'aria-describedby': 'ob-error',
        type: 'number',
        inputMode: 'numeric',
        min: 1930,
        max: new Date().getFullYear() - 8,
        value: s.birthYear ?? '',
        onInput: (/** @type {Event} */ e) => {
          const v = Number(/** @type {HTMLInputElement} */ (e.target).value);
          s.birthYear = Number.isInteger(v) && v >= 1930 && v <= new Date().getFullYear() - 8 ? v : null;
        },
      });
      return {
        title: t('onboarding.profileTitle'),
        body: [
          h('p', { class: 'lead', text: t('onboarding.profileLead') }),
          h('label', { class: 'field__label', for: 'ob-name', text: t('onboarding.name') }),
          nameInput,
          h('label', { class: 'field__label', for: 'ob-year', text: t('onboarding.birthYear') }),
          yearInput,
          h('p', { class: 'field__hint', text: t('onboarding.birthYearHint') }),
          err,
          h('span', { class: 'field__label', id: 'avatar-label', text: t('onboarding.avatar') }),
          rovingRadios(h(
            'div',
            { class: 'avatar-picker', role: 'radiogroup', 'aria-labelledby': 'avatar-label' },
            AVATARS.map((a, i) =>
              h('button', { type: 'button', role: 'radio', 'aria-checked': String(s.avatar === a), 'aria-label': a, dataset: { fk: `avatar-${i}` }, class: ['avatar-option', s.avatar === a ? 'is-on' : ''], text: a, onClick: () => { s.avatar = a; render(); } }),
            ),
          )),
        ],
        // The year is optional, but a typed year out of range is pointed out, not dropped silently.
        valid: () => {
          if (!yearInput.value.trim() || s.birthYear !== null) return true;
          err.textContent = t('onboarding.errors.birthYear', { min: 1930, max: maxYear });
          err.hidden = false;
          announce(err.textContent, 'assertive');
          yearInput.focus();
          return false;
        },
      };
    },

    protect: () => {
      const err = errorBox();
      /** @type {Node[]} */
      const inputs = [];
      if (s.lock !== 'none') {
        const isPin = s.lock === 'pin';
        const a = h('input', { type: 'password', class: 'input', id: 'ob-secret', 'aria-describedby': 'ob-error', inputMode: isPin ? 'numeric' : 'text', maxLength: isPin ? 8 : 256, autocomplete: 'new-password', value: s.secret, onInput: (/** @type {Event} */ e) => (s.secret = /** @type {HTMLInputElement} */ (e.target).value) });
        const b = h('input', { type: 'password', class: 'input', id: 'ob-secret2', 'aria-describedby': 'ob-error', inputMode: isPin ? 'numeric' : 'text', maxLength: isPin ? 8 : 256, autocomplete: 'new-password', value: s.secret2, onInput: (/** @type {Event} */ e) => (s.secret2 = /** @type {HTMLInputElement} */ (e.target).value) });
        inputs.push(
          // Lets a password manager file the secret under a recognizable account name.
          h('input', { type: 'text', autocomplete: 'username', value: s.name.trim() || 'Menstruapp', hidden: true, readOnly: true, tabIndex: -1 }),
          h('label', { class: 'field__label', for: 'ob-secret', text: t(isPin ? 'lock.newPin' : 'lock.newPassphrase') }),
          a,
          h('p', { class: 'field__hint', text: t(isPin ? 'lock.pinHint' : 'lock.passphraseHint') }),
          h('label', { class: 'field__label', for: 'ob-secret2', text: t('lock.repeat') }),
          b,
        );
      } else {
        const ack = h('input', { type: 'checkbox', id: 'none-ack', checked: s.noneAck, onChange: (/** @type {Event} */ e) => (s.noneAck = /** @type {HTMLInputElement} */ (e.target).checked) });
        inputs.push(h('p', { class: 'notice-text', text: t('lock.noneWarning') }), h('label', { class: 'check', for: 'none-ack' }, ack, h('span', { text: t('onboarding.noneAck') })));
      }
      return {
        title: t('onboarding.protectTitle'),
        body: [
          h('p', { class: 'lead', text: t('onboarding.protectLead') }),
          segmented({
            label: t('lock.method'),
            options: [
              { value: 'pin', label: t('lock.methods.pin') },
              { value: 'passphrase', label: t('lock.methods.passphrase') },
              { value: 'none', label: t('lock.methods.none') },
            ],
            value: s.lock,
            onChange: (v) => {
              s.lock = /** @type {any} */ (v);
              s.secret = s.secret2 = '';
              render();
            },
          }),
          ...inputs,
          err,
        ],
        valid: () => {
          const fail = (/** @type {string} */ key) => {
            err.textContent = t(key);
            err.hidden = false;
            announce(t(key), 'assertive');
            return false;
          };
          if (s.lock === 'none') return s.noneAck ? true : fail('onboarding.errors.noneAck');
          const problem = secretProblem(s.lock, s.secret);
          if (problem) return fail(problem);
          if (s.secret !== s.secret2) return fail('lock.errors.mismatch');
          return true;
        },
      };
    },

    reminders: () => {
      const mode = s.mode;
      const options = [
        mode !== 'pregnant' && ['period_soon', 'bell'],
        ['log_daily', 'notebook-pen'],
        s.method.startsWith('pill') && ['pill', 'pill'],
        mode === 'conceive' && ['bbt', 'thermometer'],
        mode === 'pregnant' && ['pregnancy_week', 'baby'],
      ].filter(Boolean);
      return {
        title: t('onboarding.remindersTitle'),
        body: [
          h('p', { class: 'lead', text: t('onboarding.remindersLead') }),
          ...options.map((o) => {
            const [id, ic] = /** @type {[string, string]} */ (o);
            return h('div', { class: 'reminder-choice' }, icon(ic, { size: 20 }), toggle({ label: t(`reminders.types.${id}.title`), description: t(`reminders.types.${id}.desc`), checked: Boolean(s.reminders[id]), onChange: (v) => (s.reminders[id] = v) }));
          }),
          h('p', { class: 'muted small', text: t('onboarding.remindersNote') }),
        ],
        nextLabel: t('onboarding.finish'),
      };
    },
  };

  const finish = async () => {
    if (s.busy) return;
    s.busy = true;
    render();
    try {
      const today = todayISO();
      const mode = /** @type {string} */ (s.mode);
      /** @type {Record<string, any>} */
      const days = s.importLegacy && legacy ? { ...legacy.days } : {};
      if (s.lastPeriod && !s.lastPeriodUnknown && (mode !== 'postpartum' || s.periodReturned)) {
        days[s.lastPeriod] = { ...(days[s.lastPeriod] ?? {}), flow: days[s.lastPeriod]?.flow ?? 'medium' };
        // If the stated period started within the typical length, it is ongoing: log up to today.
        const len = s.periodLength ?? 5;
        if (s.lastPeriod >= addDays(today, -(len - 1))) for (const d of rangeISO(s.lastPeriod, today)) days[d] = { ...(days[d] ?? {}), flow: days[d]?.flow ?? 'medium' };
      }
      /** @type {Record<string, any>} */
      const settings = {
        mode,
        experience: s.experience,
        cycleLength: s.cycleLength,
        periodLength: s.periodLength,
        ...(s.importLegacy && legacy ? legacy.settings : {}),
      };
      if (s.method !== 'none' && (mode === 'avoid' || mode === 'track')) {
        settings.contraception = { method: s.method, startDate: s.method.startsWith('pill') ? s.packStart : null, ...(s.method === 'pill_combined' ? { pillRegimen: s.pillRegimen } : {}), time: s.pillTime };
      }
      if (mode === 'perimenopause' && s.overAYear) settings.menopause = { overAYear: true };
      if (mode === 'postpartum' && s.birthDate) settings.postpartum = { birthDate: s.birthDate, breastfeeding: s.breastfeeding, periodReturned: s.periodReturned };
      const reminders = Object.entries(s.reminders)
        .filter(([id, on]) => on && (id !== 'pill' || s.method.startsWith('pill')))
        .map(([id]) => ({ id, type: id, enabled: true, time: id === 'pill' ? s.pillTime : id === 'bbt' ? '07:00' : id === 'log_daily' ? '21:00' : '09:00', ...(id === 'period_soon' ? { daysBefore: 2 } : {}) }));
      if (s.importLegacy && legacy) for (const r of legacy.reminders) if (!reminders.some((x) => x.id === r.id)) reminders.push(r);
      const pregnancy = mode === 'pregnant' && s.pregDate ? { active: true, basis: s.pregBasis, date: s.pregDate, startedAt: Date.now(), history: [] } : null;
      const { recoveryCode } = await createProfile({
        name: s.name.trim() || undefined,
        birthYear: s.birthYear,
        avatar: s.avatar,
        lock: { method: s.lock, secret: s.lock === 'none' ? undefined : s.secret },
        settings,
        days,
        reminders,
        importLegacy: s.importLegacy,
        pregnancy,
      });
      if (!s.importLegacy && legacy) clearLegacyData();
      s.secret = s.secret2 = '';
      if (reminders.length && 'Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {
          /* ignore */
        }
      }
      renderDone(recoveryCode);
    } catch (err) {
      console.error('[onboarding]', err);
      s.busy = false;
      render();
      toast(t('onboarding.errors.create'), { type: 'error' });
    }
  };

  const renderDone = async (/** @type {string | null} */ recoveryCode) => {
    celebrate();
    const bioAvailable = s.lock !== 'none' && (await biometricsLikelyAvailable());
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || /** @type {any} */ (navigator).standalone === true;
    const linkSlot = h('div', { class: 'stack' });
    replace(
      screen,
      h(
        'div',
        { class: 'onboarding__inner' },
        brandMark({ withName: false }),
        h('h1', { class: 'onboarding__title', tabIndex: -1, text: t('onboarding.doneTitle') }),
        h('p', { class: 'lead', text: t('onboarding.doneLead') }),
        recoveryCode ? notice({ level: 'consult', title: t('recovery.title'), text: t('onboarding.recoveryNext') }) : null,
        bioAvailable
          ? button({
              label: t('onboarding.enableBiometric'),
              icon: 'fingerprint',
              variant: 'soft',
              full: true,
              onClick: async () => {
                try {
                  await enableBiometric({ type: s.lock === 'pin' ? 'pin' : 'passphrase', secret: pendingSecret });
                  toast(t('settings.security.biometricOn'), { type: 'success' });
                } catch (err) {
                  console.error(err);
                  toast(t('settings.security.biometricUnavailable'), { type: 'error' });
                }
              },
            })
          : null,
        !standalone ? installCard() : null,
        isIOS && !standalone ? notice({ level: 'info', title: t('onboarding.iosTitle'), text: t('onboarding.iosText') }) : null,
        button({ label: t('onboarding.enterApp'), variant: 'primary', size: 'lg', full: true, onClick: () => { pendingSecret = ''; opts.onFinish(); } }),
        linkSlot,
      ),
    );
    // "Already using Menstruapp on another device?" — only when the optional sync backend exists.
    import('../pwa/api.js')
      .then((m) => m.serverFeatures())
      .then((f) => {
        if (!f?.sync) return;
        replace(linkSlot,
          h('p', { class: 'muted small', text: t('onboarding.linkDeviceText') }),
          button({
            label: t('onboarding.linkDevice'),
            icon: 'link',
            variant: 'ghost',
            full: true,
            onClick: () => {
              pendingSecret = '';
              opts.onFinish();
              import('../pwa/sync.js').then((m) => m.openSyncSettings());
            },
          }),
        );
      })
      .catch(() => {});
    /** @type {HTMLElement | null} */ (screen.querySelector('h1'))?.focus();
    if (recoveryCode) await showRecoveryCode(recoveryCode, { required: true });
  };

  // Kept only until the "done" screen is left, so biometrics can be enabled right away.
  let pendingSecret = '';

  const render = () => preservingFocus(() => renderStep());
  const renderStep = () => {
    const name = STEPS[s.step];
    const view = views[/** @type {keyof typeof views} */ (name)]();
    const isLast = s.step === STEPS.length - 1;
    // "Step N of 6" as real text (an aria-label on a plain div is not exposed), linked to the
    // heading that receives focus on every step.
    const progress = h(
      'div',
      { class: 'steps' },
      h('span', { class: 'sr-only', id: 'ob-progress', text: t('onboarding.progress', { current: s.step + 1, total: STEPS.length }) }),
      STEPS.map((_, i) => h('span', { class: ['steps__dot', i <= s.step ? 'is-on' : ''], 'aria-hidden': 'true' })),
    );
    const custom = /** @type {any} */ (view).footer;
    const next = () => {
      if (s.busy) return;
      const valid = /** @type {any} */ (view).valid;
      if (valid && !valid()) return;
      if (name === 'protect') pendingSecret = s.secret;
      if (isLast) finish();
      else go(1);
    };
    const footer = custom ?? [
      s.step > 0 ? button({ label: t('common.back'), variant: 'ghost', onClick: () => go(-1), disabled: s.busy }) : null,
      button({ label: s.busy ? t('onboarding.creating') : (/** @type {any} */ (view).nextLabel ?? t('common.continue')), variant: 'primary', type: 'submit', busy: s.busy }),
    ];
    replace(
      screen,
      h(
        'div',
        { class: 'onboarding__inner' },
        s.step === 0 ? brandMark() : progress,
        h('h1', { class: 'onboarding__title', tabIndex: -1, 'aria-describedby': s.step === 0 ? null : 'ob-progress', text: view.title }),
        // A real form: Enter moves to the next step and password managers see the new secret.
        h(
          'form',
          {
            class: 'onboarding__form',
            noValidate: true,
            onSubmit: (/** @type {SubmitEvent} */ e) => {
              e.preventDefault();
              if (!custom) next();
            },
          },
          h('div', { class: 'stack' }, view.body),
          h('div', { class: 'onboarding__footer' }, footer),
        ),
      ),
    );
  };

  render();
}
