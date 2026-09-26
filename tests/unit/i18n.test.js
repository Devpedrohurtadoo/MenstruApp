import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import es from '../../public/js/i18n/es.js';
import en from '../../public/js/i18n/en.js';
import {
  MODES,
  FLOW,
  FLOW_COLORS,
  CLOTS,
  MUCUS,
  LH,
  PREGNANCY_TEST,
  SEX,
  LIBIDO,
  EXERCISE,
  MOODS,
  SYMPTOM_IDS,
  SYMPTOM_GROUPS,
  SYMPTOMS,
  CONTRACEPTION,
} from '../../public/js/domain/catalog.js';
import { REMINDER_TYPES } from '../../public/js/data/schema.js';
import { ACHIEVEMENTS } from '../../public/js/domain/streaks.js';
import { ACCENTS, BACKGROUND_PRESETS } from '../../public/js/data/prefs.js';
import { t, setLanguage } from '../../public/js/core/i18n.js';

const PLURAL = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
const isPlural = (/** @type {any} */ v) => v && typeof v === 'object' && !Array.isArray(v) && 'other' in v && Object.keys(v).every((k) => PLURAL.has(k));

/** @returns {Map<string, any>} leaf key → value (strings, arrays and plural objects are leaves) */
function flatten(/** @type {any} */ obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string' || Array.isArray(v) || isPlural(v)) out.set(key, v);
    else if (v && typeof v === 'object') flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
}

const placeholders = (/** @type {any} */ v) => {
  const text = typeof v === 'string' ? v : isPlural(v) ? Object.values(v).join(' ') : JSON.stringify(v);
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
};

const ES = flatten(es);
const EN = flatten(en);

function resolves(/** @type {Map<string, any>} */ dict, /** @type {string} */ key) {
  if (dict.has(key)) return true;
  // A key may point to a subtree (e.g. raw('tips.general') is a leaf, raw('legal.privacy') too).
  return [...dict.keys()].some((k) => k.startsWith(`${key}.`));
}

function sourceFiles() {
  /** @type {string[]} */
  const files = [];
  const walk = (/** @type {string} */ dir) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) {
        if (!/[/\\](i18n|content)$/.test(p)) walk(p);
      } else if (p.endsWith('.js') && !p.endsWith('icon-data.js')) files.push(p);
    }
  };
  walk('public/js');
  return files;
}

describe('i18n dictionaries', () => {
  it('have exactly the same keys in every language', () => {
    const missingInEn = [...ES.keys()].filter((k) => !EN.has(k));
    const missingInEs = [...EN.keys()].filter((k) => !ES.has(k));
    expect(missingInEn).toEqual([]);
    expect(missingInEs).toEqual([]);
  });

  it('use the same placeholders in every language', () => {
    const mismatched = [...ES.keys()].filter((k) => EN.has(k) && placeholders(ES.get(k)).join() !== placeholders(EN.get(k)).join());
    expect(mismatched).toEqual([]);
  });

  it('never contain markup or empty strings', () => {
    for (const [k, v] of [...ES, ...EN]) {
      const text = typeof v === 'string' ? v : JSON.stringify(v);
      expect(text.trim().length, k).toBeGreaterThan(0);
      expect(/<[a-z/!]/i.test(text), k).toBe(false);
    }
  });

  it('keep plural forms consistent (every form has an "other")', () => {
    for (const [k, v] of [...ES, ...EN]) if (v && typeof v === 'object' && !Array.isArray(v)) expect(isPlural(v), k).toBe(true);
  });

  it('structure legal texts as [heading, paragraphs[]] in both languages', () => {
    for (const key of ['legal.privacy', 'legal.terms']) {
      const a = ES.get(key);
      const b = EN.get(key);
      expect(a.length).toBe(b.length);
      for (const [heading, paragraphs] of [...a, ...b]) {
        expect(typeof heading).toBe('string');
        expect(Array.isArray(paragraphs) && paragraphs.every((p) => typeof p === 'string')).toBe(true);
      }
    }
  });
});

describe('i18n coverage of the source code', () => {
  const files = sourceFiles();
  const sources = files.map((f) => fs.readFileSync(f, 'utf8'));

  it('defines every literal key passed to t() / raw()', () => {
    const missing = new Set();
    for (const src of sources) {
      for (const m of src.matchAll(/\b(?:t|raw)\(\s*(['"])([a-zA-Z][\w.]*)\1/g)) if (!resolves(ES, m[2])) missing.add(m[2]);
    }
    expect([...missing]).toEqual([]);
  });

  it('defines every key referenced indirectly as a string (lists of keys, error codes)', () => {
    const namespaces = new Set([...ES.keys()].map((k) => k.split('.')[0]));
    const missing = new Set();
    for (const src of sources) {
      for (const m of src.matchAll(/(['"])([a-z][a-zA-Z]*(?:\.[a-zA-Z0-9_]+)+)\1/g)) {
        const key = m[2];
        if (!namespaces.has(key.split('.')[0])) continue;
        if (/\.(js|css|png|svg|html|json|xml|txt)$/.test(key)) continue;
        if (!resolves(ES, key)) missing.add(key);
      }
    }
    expect([...missing]).toEqual([]);
  });

  it('defines every key built dynamically from the domain catalogues', () => {
    /** @type {string[]} */
    const keys = [];
    const each = (/** @type {string} */ prefix, /** @type {readonly (string|number)[]} */ ids, suffix = '') => ids.forEach((id) => keys.push(`${prefix}.${id}${suffix}`));
    each('symptoms', SYMPTOM_IDS);
    each('symptomGroups', SYMPTOM_GROUPS);
    each('moods', MOODS);
    each('flow', FLOW);
    each('flowColors', FLOW_COLORS);
    each('clots', CLOTS);
    each('mucus', MUCUS);
    each('lh', LH);
    each('pregnancyTest', PREGNANCY_TEST);
    each('sex', SEX);
    each('libido', LIBIDO);
    each('exercise', EXERCISE);
    each('energy', [1, 2, 3, 4, 5]);
    each('intensity', [0, 1, 2, 3]);
    each('modes', MODES, '.title');
    each('modes', MODES, '.desc');
    each('onboarding.basicsTitle', MODES);
    each('contraception', CONTRACEPTION);
    each('contraception.regimen', ['21_7', '24_4', '28', 'continuous']);
    each('reminders.types', REMINDER_TYPES, '.title');
    each('reminders.types', REMINDER_TYPES, '.desc');
    each('notifications', REMINDER_TYPES, '.title');
    each('notifications', REMINDER_TYPES, '.body');
    each('notifications.actions', ['take', 'patchApply', 'patchChange', 'patchRemove', 'ringInsert', 'ringRemove']);
    each('achievements', ACHIEVEMENTS);
    each('settings.appearance.accents', Object.keys(ACCENTS));
    each('settings.appearance.bgs', BACKGROUND_PRESETS);
    each('settings.appearance.particleLevels', [0, 1, 2, 3]);
    each('phases', ['menstrual', 'follicular', 'ovulatory', 'luteal']);
    each('luna.ctx.phaseInfo', ['menstrual', 'follicular', 'ovulatory', 'luteal']);
    each('confidence', ['high', 'medium', 'low']);
    each('luna.ctx.confidence', ['high', 'medium', 'low']);
    each('home.fertility', ['high', 'medium', 'low', 'none']);
    each('luna.ctx.fertile', ['high', 'medium', 'low', 'none']);
    each('calendar.a11y.fertility', ['high', 'medium', 'low']);
    each('calendar.a11y.ovulation', ['confirmed', 'lh', 'estimated']);
    each('calendar.excluded', ['gap', 'pregnancy']);
    each('report.ovMethod', ['bbt', 'lh', 'estimate']);
    each('analysis.regularity', ['veryRegular', 'regular', 'variable']);
    each('tips', ['general', 'menstrual', 'follicular', 'ovulatory', 'luteal', 'pregnancy', 'postpartum', 'menopause']);
    each('learn.consultLevels', ['urgent', 'soon', 'routine']);
    each('log.sections', ['period', 'bleeding', 'symptoms', 'mood', 'fertility', 'sex', 'contraception', 'body', 'notes']);
    each('fatal', ['crypto', 'storage', 'unknown']);
    each('nav', ['home', 'calendar', 'log', 'analysis', 'learn', 'luna', 'settings', 'report', 'pregnancy']);
    each('onboarding.bf', ['exclusive', 'partial', 'no']);
    each('onboarding.pregDateLabel', ['lmp', 'due', 'conception']);
    each('settings.mode.startDate', ['pill', 'patch', 'ring', 'injection', 'iud_hormonal', 'iud_copper', 'implant']);
    each('settings.mode.outcomes', ['birth', 'loss', 'other']);
    each('settings.reminders.deliveryModes', ['none', 'foreground', 'periodic', 'push']);
    each('settings.reminders.repeat', ['none', 'daily', 'weekly', 'monthly', 'yearly']);
    each('settings.data.importErrors', ['invalid', 'needsPassword', 'wrongPassword', 'tooLarge']);
    each('settings.security.protection', ['p1', 'p2', 'p3', 'p4', 'p5']);
    each(
      'settings.sections',
      ['profile', 'mode', 'cycle', 'reminders', 'appearance', 'privacy', 'data', 'share', 'language', 'about'].flatMap((s) => [s, `${s}Desc`]),
    );
    each('share', ['how1', 'how2', 'how3']);
    each('share.scopes', ['predictions', 'cycles', 'symptoms', 'notes']);
    each('sync', ['what1', 'what2', 'what3']);
    each('common', ['today', 'yesterday']);
    // Notices produced by the insights engine.
    const insights = fs.readFileSync('public/js/domain/insights.js', 'utf8');
    const noticeIds = [...insights.matchAll(/id: (?:unprotected \? )?'(\w+)'(?: : '(\w+)')?/g)].flatMap((m) => [m[1], m[2]]).filter(Boolean);
    expect(noticeIds.length).toBeGreaterThan(15);
    for (const id of noticeIds) keys.push(`notices.${id}.title`, `notices.${id}.text`);
    for (const s of SYMPTOMS.filter((x) => x.redFlag)) keys.push(`notices.redFlag.${s.id}.title`, `notices.redFlag.${s.id}.text`);

    const missing = keys.filter((k) => !resolves(ES, k));
    expect(missing).toEqual([]);
  });
});

describe('t()', () => {
  it('selects plural forms and interpolates', () => {
    setLanguage('es');
    expect(t('common.days', { count: 1 })).toBe('1 día');
    expect(t('common.days', { count: 3 })).toBe('3 días');
    expect(t('pregnancy.dueIn', { count: 0, date: 'x' })).toContain('hoy');
    setLanguage('en');
    expect(t('common.days', { count: 1 })).toBe('1 day');
    expect(t('home.periodIn', { count: 12 })).toBe('Period in 12 days');
    expect(t('does.not.exist')).toBe('does.not.exist');
    setLanguage('es');
  });

  it('says "today" rather than "in 0 days" in period reminders', () => {
    setLanguage('es');
    expect(t('notifications.period_soon.body', { count: 0, start: '3 de mayo' })).toBe('Podría llegar hoy (3 de mayo).');
    expect(t('notifications.period_soon.body', { count: 2, start: '3 de mayo' })).toBe('Podría llegar en 2 días (hacia el 3 de mayo).');
    setLanguage('en');
    expect(t('notifications.period_soon.body', { count: 0, start: 'May 3' })).toBe('It could start today (May 3).');
    setLanguage('es');
  });
});
