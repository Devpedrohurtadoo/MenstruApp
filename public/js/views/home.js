// "Today": the home dashboard, adapted to the usage mode.

import { h } from '../core/dom.js';
import { t, raw, fmtDate, fmtRelativeDays, getLanguage } from '../core/i18n.js';
import { addDays, diffDays, dayNumber } from '../core/dates.js';
import { icon } from '../ui/icons.js';
import { button, card, chip, notice, emptyState, progressBar, badge } from '../ui/components.js';
import { cycleRing } from '../ui/ring.js';
import { toast } from '../ui/toast.js';
import { celebrate } from '../ui/effects.js';
import { saveDay, store, setPrefs } from '../app.js';
import { BLEEDING, DAILY_METHODS } from '../domain/catalog.js';
import { fertilityLevel } from '../domain/cycle.js';
import { installCard } from '../pwa/install.js';

const QUICK_MOODS = ['happy', 'calm', 'energetic', 'sensitive', 'sad', 'anxious', 'irritable'];
const QUICK_SYMPTOMS = {
  default: ['cramps', 'headache', 'bloating', 'fatigue', 'breastTenderness', 'acne'],
  pregnant: ['nausea', 'fatigue', 'heartburn', 'backPain', 'swelling', 'insomnia'],
  postpartum: ['fatigue', 'breastPain', 'perinealPain', 'backPain', 'insomnia', 'leakage'],
  perimenopause: ['hotFlashes', 'nightSweats', 'insomnia', 'jointPain', 'brainFog', 'vaginalDryness'],
};

/** Info notices dismissed today (kept in memory for the session). */
const dismissed = new Set();

/** @param {import('./shell.js').ViewContext} ctx */
export function title(ctx) {
  const name = ctx.state.derived?.profile.name;
  return name ? t('home.greeting', { name }) : t('nav.home');
}

/** @param {import('./shell.js').ViewContext} ctx */
export function render(ctx) {
  const { derived, data, prefs, install } = ctx.state;
  if (!derived || !data) return h('div');
  const { settings, analysis, flags, today } = derived;
  const entry = data.days[today] ?? {};

  // Home-screen shortcut "Log today" (manifest): open the day log once, then clean the URL.
  if (ctx.route.params.get('log') === 'today') {
    ctx.navigate('home', { replace: true });
    setTimeout(() => ctx.openLog(today), 0);
  }

  const blocks = [];
  blocks.push(h('p', { class: 'home__date', text: capitalize(fmtDate(today, 'weekday')) }));

  // Notices first (urgent ones can never be dismissed).
  for (const n of derived.notices) {
    const key = `${n.id}:${today}`;
    if (n.level === 'info' && dismissed.has(key)) continue;
    const box = notice({
      level: n.level,
      announceKey: key,
      title: t(`notices.${n.id}.title`, n.params),
      text: t(`notices.${n.id}.text`, n.params),
      action: n.article ? h('a', { class: 'link', href: `#/learn/article/${n.article}`, text: t('common.learnMore') }) : null,
      onDismiss:
        n.level === 'info'
          ? () => {
              dismissed.add(key);
              // Remove just this notice and move focus to what comes next (a full re-render
              // would drop keyboard focus back to the top of the page).
              const next = /** @type {HTMLElement | null} */ (box.nextElementSibling?.querySelector('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])') ?? null);
              box.remove();
              if (next) next.focus();
              else /** @type {HTMLElement | null} */ (document.getElementById('main'))?.focus();
            }
          : undefined,
    });
    blocks.push(box);
  }

  if (flags.pregnancy && derived.pregnancy) blocks.push(pregnancyCard(derived, ctx));
  else if (flags.postpartum && !flags.predictions) blocks.push(postpartumCard(derived, data, ctx));
  else blocks.push(cycleCard(derived, data, ctx));

  blocks.push(quickLog(derived, entry, ctx));

  const method = settings.contraception?.method;
  if (method && DAILY_METHODS.has(method) && (flags.mode === 'avoid' || flags.mode === 'track')) {
    blocks.push(pillCard(entry, today));
  }

  if (flags.predictions && analysis.prediction && !flags.pregnancy) blocks.push(upcoming(derived));
  if (settings.features.dailyTips) blocks.push(tipCard(derived));
  if (settings.features.streaks && derived.streak.current >= 2) {
    blocks.push(
      h(
        'div',
        { class: 'streak' },
        icon('flame', { size: 20 }),
        h('span', { text: t('home.streak', { count: derived.streak.current }) }),
        derived.streak.loggedToday ? null : h('span', { class: 'muted small', text: t('home.streakKeep') }),
      ),
    );
  }
  if (!install.standalone && Date.now() - prefs.installPromptDismissedAt > 14 * 86_400_000) {
    const cardEl = installCard({
      onDismiss: () => {
        setPrefs({ installPromptDismissedAt: Date.now() });
        cardEl?.remove();
      },
    });
    if (cardEl) blocks.push(cardEl);
  }
  blocks.push(h('p', { class: 'disclaimer', text: t('common.disclaimer') }));
  return h('div', { class: 'view home' }, blocks);
}

/** @param {string} s */
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * @param {NonNullable<import('../app.js').AppState['derived']>} d
 * @param {import('../app.js').Data} data
 * @param {import('./shell.js').ViewContext} ctx
 */
function cycleCard(d, data, ctx) {
  const { analysis, flags, today, settings } = d;
  const cur = analysis.current;
  const pred = analysis.prediction;
  if (!analysis.hasData || !cur) {
    return card({
      class: 'hero',
      children: emptyState({
        title: t('home.noDataTitle'),
        text: t(flags.menopause ? 'home.noDataMenopause' : 'home.noDataText'),
        action: button({ label: t('home.logPeriod'), icon: 'droplet', variant: 'primary', onClick: () => startPeriod(today) }),
      }),
    });
  }
  if (flags.menopause) return menopauseCard(d, data, ctx);
  if (cur.stale) {
    return card({
      class: 'hero',
      children: emptyState({
        title: t('home.staleTitle'),
        text: t('home.staleText', { date: fmtDate(cur.start, 'long') }),
        action: button({ label: t('home.logPeriod'), icon: 'droplet', variant: 'primary', onClick: () => startPeriod(today) }),
      }),
    });
  }

  const inPeriod = cur.inPeriod && BLEEDING.has(data.days[today]?.flow ?? '') ? true : cur.inPeriod;
  const periodLength = pred?.periodLength ?? settings.periodLength ?? 5;
  const cycleLength = pred?.cycleLength ?? settings.cycleLength ?? 28;
  const ovDay = pred ? diffDays(cur.start, pred.ovulationDay) + 1 : null;
  /** @type {string} */
  let headline;
  if (cur.late) headline = t('home.late', { count: cur.lateDays });
  else if (inPeriod) headline = t('home.periodDay', { day: diffDays(cur.start, today) + 1 });
  else if (pred && pred.daysUntilPeriod === 0) headline = t('home.periodToday');
  else if (pred) headline = t('home.periodIn', { count: pred.daysUntilPeriod });
  else headline = t('home.cycleDayOnly', { day: cur.cycleDay });

  const fert = pred && flags.fertility ? fertilityLevel(diffDays(pred.ovulationDay, today)) : null;
  const center = [
    h('span', { class: 'ring__day', text: t('home.day', { day: cur.cycleDay }) }),
    cur.phase ? h('span', { class: 'ring__phase', text: t(`phases.${cur.phase}`) }) : null,
    h('span', { class: 'ring__headline', text: headline }),
  ];
  const ring = cycleRing({
    cycleLength,
    cycleDay: cur.cycleDay,
    periodLength,
    ovulationDay: ovDay,
    fertileFrom: ovDay ? ovDay - 5 : null,
    fertileTo: ovDay ? ovDay + 1 : null,
    showFertility: flags.fertility,
    late: cur.late,
    label: [t('home.day', { day: cur.cycleDay }), cur.phase ? t(`phases.${cur.phase}`) : '', headline].filter(Boolean).join('. '),
    center,
  });

  const details = [];
  if (pred) {
    details.push(
      h(
        'p',
        { class: 'hero__line' },
        icon('calendar', { size: 16 }),
        h('span', { text: t('home.nextPeriod', { date: fmtDate(pred.nextPeriodStart, 'short'), margin: pred.margin }) }),
        badge(t(`confidence.${pred.confidence}`), pred.confidence === 'high' ? 'good' : pred.confidence === 'medium' ? 'neutral' : 'warn'),
      ),
    );
    if (flags.fertility) {
      details.push(
        h(
          'p',
          { class: 'hero__line' },
          icon('egg', { size: 16 }),
          h('span', {
            text: fert ? t(`home.fertility.${fert}`) : pred.daysUntilOvulation > 0 ? t('home.ovulationIn', { count: pred.daysUntilOvulation }) : t('home.fertility.none'),
          }),
        ),
      );
    }
    if (flags.lowConfidence) details.push(h('p', { class: 'muted small', text: t('home.lowConfidence') }));
    if (flags.fertility && flags.contraceptionDisclaimer) details.push(h('p', { class: 'muted small', text: t('home.notContraception') }));
  }

  const actions = [];
  if (inPeriod) {
    actions.push(
      h('p', { class: 'hero__ask', text: t('home.stillBleeding') }),
      h(
        'div',
        { class: 'chips chips--center' },
        ['spotting', 'light', 'medium', 'heavy', 'none'].map((f) =>
          chip({
            label: t(f === 'none' ? 'home.periodEnded' : `flow.${f}`),
            selected: data.days[today]?.flow === f,
            tone: f === 'none' ? undefined : 'period',
            fk: `flow-${f}`,
            onClick: () => quickSave(today, { flow: data.days[today]?.flow === f ? undefined : f }),
          }),
        ),
      ),
    );
  } else {
    actions.push(button({ label: t('home.periodStarted'), icon: 'droplet', variant: 'primary', full: true, fk: 'period-start', onClick: () => startPeriod(today) }));
  }

  return card({ class: 'hero', children: [ring, h('div', { class: 'hero__details' }, details), h('div', { class: 'hero__actions' }, actions)] });
}

/** @param {string} today */
async function startPeriod(today) {
  const entry = store.get().data?.days[today] ?? {};
  await quickSave(today, { flow: BLEEDING.has(entry.flow ?? '') ? entry.flow : 'medium' });
  toast(t('home.periodLogged'), { type: 'success', action: { label: t('common.edit'), onClick: () => import('./daylog.js').then((m) => m.openDayLog(today)) } });
}

/**
 * @param {string} iso
 * @param {Record<string, any>} patch
 */
async function quickSave(iso, patch) {
  const current = store.get().data?.days[iso] ?? {};
  try {
    const { achievements } = await saveDay(iso, { ...current, ...patch });
    for (const a of achievements) {
      toast(t('achievements.unlocked', { name: t(`achievements.${a}`) }), { type: 'success' });
      if (store.get().derived?.settings.features.celebrations) celebrate();
    }
  } catch (err) {
    console.error(err);
    toast(t('errors.save'), { type: 'error' });
  }
}

/**
 * @param {NonNullable<import('../app.js').AppState['derived']>} d
 * @param {Record<string, any>} entry
 * @param {import('./shell.js').ViewContext} ctx
 */
function quickLog(d, entry, ctx) {
  const moods = entry.moods ?? [];
  const symptoms = entry.symptoms ?? {};
  const list = QUICK_SYMPTOMS[/** @type {keyof typeof QUICK_SYMPTOMS} */ (d.flags.mode)] ?? QUICK_SYMPTOMS.default;
  return card({
    title: t('home.howAreYou'),
    icon: 'heart',
    children: [
      h('div', { class: 'chips', role: 'group', 'aria-label': t('log.moods') }, QUICK_MOODS.map((m) =>
        chip({
          label: t(`moods.${m}`),
          selected: moods.includes(m),
          fk: `mood-${m}`,
          onClick: () => quickSave(d.today, { moods: moods.includes(m) ? moods.filter((/** @type {string} */ x) => x !== m) : [...moods, m] }),
        }),
      )),
      h('div', { class: 'chips', role: 'group', 'aria-label': t('log.symptoms') }, list.map((sym) =>
        chip({
          label: t(`symptoms.${sym}`),
          selected: Boolean(symptoms[sym]),
          tone: 'symptom',
          fk: `sym-${sym}`,
          onClick: () => {
            const next = { ...symptoms };
            if (next[sym]) delete next[sym];
            else next[sym] = 2;
            quickSave(d.today, { symptoms: next });
          },
        }),
      )),
      button({ label: t('home.fullLog'), icon: 'notebook-pen', variant: 'ghost', full: true, onClick: () => ctx.openLog(d.today) }),
    ],
  });
}

/** @param {Record<string, any>} entry @param {string} today */
function pillCard(entry, today) {
  const taken = entry.contraceptionTaken === true;
  return card({
    title: t('home.pillTitle'),
    icon: 'pill',
    children: button({
      label: taken ? t('home.pillTaken') : t('home.pillMark'),
      icon: taken ? 'circle-check' : 'pill',
      variant: taken ? 'soft' : 'primary',
      full: true,
      fk: 'pill',
      onClick: () => quickSave(today, { contraceptionTaken: !taken }),
    }),
  });
}

/** @param {NonNullable<import('../app.js').AppState['derived']>} d */
function upcoming(d) {
  const pred = /** @type {NonNullable<typeof d.analysis.prediction>} */ (d.analysis.prediction);
  const today = d.today;
  const events = [];
  if (d.flags.fertility && pred.fertileStart > today) events.push({ date: pred.fertileStart, label: t('home.events.fertile'), ic: 'sprout' });
  if (d.flags.fertility && pred.ovulationDay >= today) events.push({ date: pred.ovulationDay, label: t('home.events.ovulation'), ic: 'egg' });
  if (pred.pmsStart > today) events.push({ date: pred.pmsStart, label: t('home.events.pms'), ic: 'waves' });
  if (pred.nextPeriodStart >= today) events.push({ date: pred.nextPeriodStart, label: t('home.events.period'), ic: 'droplet' });
  events.sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!events.length) return null;
  return card({
    title: t('home.upcoming'),
    icon: 'calendar-days',
    children: h(
      'ul',
      { class: 'events' },
      events.slice(0, 4).map((e) =>
        h(
          'li',
          { class: 'events__item' },
          h('span', { class: 'events__icon' }, icon(e.ic, { size: 18 })),
          h('span', { class: 'events__label', text: e.label }),
          h('span', { class: 'events__when', text: `${fmtDate(e.date, 'short')} · ${fmtRelativeDays(diffDays(today, e.date))}` }),
        ),
      ),
    ),
  });
}

/** @param {NonNullable<import('../app.js').AppState['derived']>} d */
function tipCard(d) {
  const phase = d.flags.pregnancy ? 'pregnancy' : d.flags.postpartum && !d.flags.predictions ? 'postpartum' : d.flags.menopause ? 'menopause' : d.analysis.current?.phase ?? 'general';
  const tips = /** @type {string[]} */ (raw(`tips.${phase}`) ?? raw('tips.general') ?? []);
  if (!tips.length) return null;
  const tip = tips[dayNumber(d.today) % tips.length];
  return card({ title: t('home.tipTitle'), icon: 'lightbulb', children: h('p', { class: 'tip', text: tip }) });
}

/**
 * @param {NonNullable<import('../app.js').AppState['derived']>} d
 * @param {import('./shell.js').ViewContext} ctx
 */
function pregnancyCard(d, ctx) {
  const p = /** @type {NonNullable<typeof d.pregnancy>} */ (d.pregnancy);
  const weekNote = h('p', { class: 'tip', text: '…' });
  import(`../content/pregnancy-${getLanguage()}.js`)
    .then((m) => {
      weekNote.textContent = m.default[p.noteWeek] ?? '';
    })
    .catch(() => (weekNote.textContent = ''));
  return card({
    class: 'hero',
    children: [
      h('div', { class: 'preg' }, icon('baby', { size: 32 }), h('p', { class: 'preg__weeks', text: t('pregnancy.weeks', { weeks: p.weeks, days: p.days }) }), h('p', { class: 'muted', text: t('pregnancy.trimester', { n: p.trimester }) })),
      progressBar(p.progress, t('pregnancy.progress')),
      h('p', { class: 'hero__line' }, icon('calendar-check', { size: 16 }), h('span', { text: p.overdue ? t('pregnancy.overdue', { count: -p.daysToDue }) : t('pregnancy.dueIn', { date: fmtDate(p.dueDate, 'long'), count: p.daysToDue }) })),
      h('h3', { class: 'card__subtitle', text: t('pregnancy.thisWeek', { week: p.noteWeek }) }),
      weekNote,
      // The kick counter starts at week 24: before that the tools page is the week-by-week guide.
      h('div', { class: 'btn-row' }, button({ label: t(p.weeks >= 24 ? 'pregnancy.tools' : 'pregnancy.weekByWeek'), icon: p.weeks >= 24 ? 'footprints' : 'baby', variant: 'soft', onClick: () => ctx.navigate('pregnancy') })),
      h('p', { class: 'muted small', text: t('pregnancy.disclaimer') }),
    ],
  });
}

/**
 * @param {NonNullable<import('../app.js').AppState['derived']>} d
 * @param {import('../app.js').Data} data
 * @param {import('./shell.js').ViewContext} ctx
 */
function postpartumCard(d, data, ctx) {
  const birth = d.settings.postpartum?.birthDate;
  const weeks = birth ? Math.floor(diffDays(birth, d.today) / 7) : null;
  return card({
    class: 'hero',
    children: [
      h('div', { class: 'preg' }, icon('heart-handshake', { size: 32 }), h('p', { class: 'preg__weeks', text: weeks !== null ? t('postpartum.weeks', { count: weeks }) : t('modes.postpartum.title') })),
      h('p', { text: t(weeks !== null && weeks < 6 ? 'postpartum.early' : 'postpartum.later') }),
      button({ label: t('postpartum.periodBack'), icon: 'droplet', variant: 'soft', full: true, onClick: () => ctx.navigate('settings/mode') }),
      h('a', { class: 'link', href: '#/learn/article/posparto', text: t('common.learnMore') }),
    ],
  });
}

/**
 * @param {NonNullable<import('../app.js').AppState['derived']>} d
 * @param {import('../app.js').Data} data
 * @param {import('./shell.js').ViewContext} ctx
 */
function menopauseCard(d, data, ctx) {
  const last = d.analysis.periods.at(-1);
  const since = last ? diffDays(last.end, d.today) : null;
  const hot = Object.keys(data.days).filter((iso) => iso > addDays(d.today, -7) && data.days[iso].symptoms?.hotFlashes).length;
  return card({
    class: 'hero',
    children: [
      h('div', { class: 'preg' }, icon('leaf', { size: 32 }), h('p', { class: 'preg__weeks', text: since !== null ? t('menopause.daysSince', { count: since }) : t('modes.perimenopause.title') })),
      since !== null ? progressBar(Math.min(1, since / 365), t('menopause.progress')) : null,
      since !== null ? h('p', { class: 'muted small', text: since >= 365 ? t('menopause.reached') : t('menopause.toGo', { count: 365 - since }) }) : null,
      h('p', { class: 'hero__line' }, icon('zap', { size: 16 }), h('span', { text: t('menopause.hotFlashesWeek', { count: hot }) })),
      h('div', { class: 'hero__actions' }, button({ label: t('home.logBleeding'), icon: 'droplet', variant: 'soft', full: true, onClick: () => ctx.openLog(d.today) })),
    ],
  });
}
