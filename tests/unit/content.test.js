import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import libEs from '../../public/js/content/library-es.js';
import libEn from '../../public/js/content/library-en.js';
import lunaEs from '../../public/js/content/luna-es.js';
import lunaEn from '../../public/js/content/luna-en.js';
import pregEs from '../../public/js/content/pregnancy-es.js';
import pregEn from '../../public/js/content/pregnancy-en.js';
import es from '../../public/js/i18n/es.js';
import en from '../../public/js/i18n/en.js';
import ICONS from '../../public/js/ui/icon-data.js';
import { createLuna } from '../../public/js/domain/luna.js';

const LIBS = { es: libEs, en: libEn };
const LUNAS = { es: lunaEs, en: lunaEn };
const DICTS = { es, en };
const CONTEXT_HANDLERS = ['nextPeriod', 'fertileNow', 'ovulation', 'cycleDay', 'cycleNormal', 'periodLength', 'pregnancyWeek', 'pregnancyChance'];

/** Every article id the app links to from code (views + insights). */
function referencedArticles() {
  const ids = new Set();
  const walk = (/** @type {string} */ dir) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) {
        if (!p.endsWith('content')) walk(p);
      } else if (p.endsWith('.js')) {
        const src = fs.readFileSync(p, 'utf8');
        for (const m of src.matchAll(/#\/learn\/article\/([a-z0-9-]+)/g)) ids.add(m[1]);
        for (const m of src.matchAll(/article: '([a-z0-9-]+)'/g)) ids.add(m[1]);
      }
    }
  };
  walk('public/js');
  return ids;
}

describe('learning library', () => {
  it('has the same categories and articles in every language', () => {
    const ids = (/** @type {any} */ lib) => lib.articles.map((/** @type {any} */ a) => a.id).sort();
    expect(ids(libEn)).toEqual(ids(libEs));
    expect(libEn.categories.map((c) => c.id)).toEqual(libEs.categories.map((c) => c.id));
    expect(libEn.help.map((c) => c.id)).toEqual(libEs.help.map((c) => c.id));
    for (const a of libEs.articles) {
      const b = libEn.articles.find((x) => x.id === a.id);
      expect(b?.category, a.id).toBe(a.category);
      expect([...(b?.related ?? [])].sort(), a.id).toEqual([...(a.related ?? [])].sort());
      expect([...(b?.modes ?? [])].sort(), a.id).toEqual([...(a.modes ?? [])].sort());
    }
  });

  for (const [lang, lib] of Object.entries(LIBS)) {
    it(`is internally consistent (${lang})`, () => {
      const articleIds = new Set(lib.articles.map((a) => a.id));
      expect(articleIds.size).toBe(lib.articles.length);
      const categories = new Set(lib.categories.map((c) => c.id));
      for (const c of lib.categories) expect(c.icon in ICONS, c.icon).toBe(true);
      for (const a of lib.articles) {
        expect(categories.has(a.category), `${a.id} → ${a.category}`).toBe(true);
        expect(a.title && a.summary && a.body.length && a.keywords.length, a.id).toBeTruthy();
        for (const r of a.related ?? []) expect(articleIds.has(r), `${a.id} related ${r}`).toBe(true);
        for (const b of a.body) expect(Boolean(b.h || b.p || b.ul?.length), a.id).toBe(true);
      }
      for (const c of lib.categories) expect(lib.articles.some((a) => a.category === c.id), c.id).toBe(true);
      expect(lib.glossary.length).toBeGreaterThan(20);
      expect(lib.faq.length).toBeGreaterThan(8);
      for (const level of ['urgent', 'soon', 'routine']) expect(lib.consult[level].length).toBeGreaterThan(3);
    });

    it(`contains every article the app links to (${lang})`, () => {
      const ids = new Set(lib.articles.map((a) => a.id));
      const missing = [...referencedArticles()].filter((id) => !ids.has(id));
      expect(missing).toEqual([]);
    });
  }
});

describe('Luna knowledge base', () => {
  for (const [lang, kb] of Object.entries(LUNAS)) {
    const lib = LIBS[/** @type {'es' | 'en'} */ (lang)];
    const luna = createLuna(kb);
    const contextual = Object.fromEntries(CONTEXT_HANDLERS.map((id) => [id, () => [`ctx:${id}`]]));

    it(`is well formed (${lang})`, () => {
      const ids = new Set(kb.intents.map((i) => i.id));
      expect(ids.size).toBe(kb.intents.length);
      const articles = new Set(lib.articles.map((a) => a.id));
      for (const i of kb.intents) {
        expect(i.topic && i.answer.length && Object.keys(i.keywords).length, i.id).toBeTruthy();
        if (i.article) expect(articles.has(i.article), `${i.id} → ${i.article}`).toBe(true);
        for (const f of i.followUps ?? []) expect(ids.has(f), `${i.id} followUp ${f}`).toBe(true);
        for (const w of Object.values(i.keywords)) expect(w).toBeGreaterThan(0);
      }
      expect(Object.keys(kb.contextual).sort()).toEqual([...CONTEXT_HANDLERS].sort());
      for (const f of kb.redFlags) expect(f.patterns.length && f.answer.length, f.id).toBeTruthy();
      expect(kb.fallback.length).toBeGreaterThan(0);
    });

    it(`routes every topic back to its own intent (${lang})`, () => {
      const wrong = kb.intents.filter((i) => luna.reply(i.topic, { contextual }).intent !== i.id).map((i) => i.id);
      expect(wrong).toEqual([]);
    });

    it(`answers every suggested question (${lang})`, () => {
      for (const q of Object.values(DICTS[/** @type {'es' | 'en'} */ (lang)].luna.suggest)) {
        expect(luna.reply(q, { contextual }).intent, q).toBeTruthy();
      }
    });
  }

  it('flags emergencies and crises first, without false alarms on everyday phrases', () => {
    const es = createLuna(lunaEs);
    const enL = createLuna(lunaEn);
    for (const q of ['empapo una compresa cada hora', 'estoy embarazada y sangro', 'no quiero vivir', 'mi pareja me pega', 'mi bebé se mueve menos', 'tengo fiebre y tampón puesto: fiebre con tampon']) {
      expect(es.reply(q).urgent, q).toBe(true);
    }
    for (const q of ["I'm soaking a pad every hour", 'I want to kill myself', 'my partner hits me', 'pregnant and bleeding', "baby isn't moving"]) {
      expect(enL.reply(q).urgent, q).toBe(true);
    }
    for (const q of ['¿puede hacerme daño el ibuprofeno?', '¿puedo cortarme el pelo con la regla?', 'me gusta la sopa', 'tengo cólicos']) {
      expect(es.reply(q).urgent, q).toBe(false);
    }
    for (const q of ['I hurt my knee at the gym', 'I love grapes', 'I have cramps']) {
      expect(enL.reply(q).urgent, q).toBe(false);
    }
    // Crisis answers always include a phone line.
    expect(es.reply('quiero morirme').paragraphs.join(' ')).toMatch(/024/);
    expect(enL.reply('I want to die').paragraphs.join(' ')).toMatch(/988/);
  });

  it('greets with or without a name', () => {
    const es = createLuna(lunaEs);
    expect(es.reply('hola', { name: 'Ana' }).paragraphs[0]).toMatch(/^¡Hola Ana!/);
    expect(es.reply('hola').paragraphs[0]).toMatch(/^¡Hola!/);
  });
});

describe('pregnancy notes', () => {
  it('cover weeks 4 to 42 in every language', () => {
    for (const notes of [pregEs, pregEn]) {
      for (let w = 4; w <= 42; w++) expect(typeof notes[w] === 'string' && notes[w].length > 40, `week ${w}`).toBe(true);
    }
  });
});
