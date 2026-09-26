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
        for (const target of Object.values(i.insteadIn ?? {})) expect(ids.has(target), `${i.id} insteadIn ${target}`).toBe(true);
        for (const w of Object.values(i.keywords)) expect(w).toBeGreaterThan(0);
      }
      expect(Object.keys(kb.contextual).sort()).toEqual([...CONTEXT_HANDLERS].sort());
      const contexts = new Set(Object.keys(kb.contexts ?? {}));
      for (const f of kb.redFlags) {
        expect((f.patterns?.length || f.combos?.length) && f.answer.length, f.id).toBeTruthy();
        for (const id of [...(f.related ?? []), ...(f.follow ? [f.follow] : [])]) expect(ids.has(id), `${f.id} → ${id}`).toBe(true);
        for (const combo of f.combos ?? []) {
          expect(combo.length, f.id).toBeGreaterThan(0);
          for (const group of combo) {
            expect(group.length, f.id).toBeGreaterThan(0);
            for (const term of group.filter((t) => t.startsWith('@'))) expect(contexts.has(term.slice(1)), `${f.id} ${term}`).toBe(true);
          }
        }
      }
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

  it('greets with or without a name', () => {
    const es = createLuna(lunaEs);
    expect(es.reply('hola', { name: 'Ana' }).paragraphs[0]).toMatch(/^¡Hola Ana!/);
    expect(es.reply('hola').paragraphs[0]).toMatch(/^¡Hola!/);
  });
});

describe('Luna red flags (real knowledge bases)', () => {
  const LUNA = { es: createLuna(lunaEs), en: createLuna(lunaEn) };

  /** [language, message, expected red flag] */
  const URGENT = [
    ['es', 'empapo una compresa cada hora', 'heavyBleeding'],
    ['es', 'He empapado dos compresas en una hora', 'heavyBleeding'],
    ['es', 'Estoy sangrando mucho y me mareo', 'heavyBleeding'],
    ['es', 'No, estoy sangrando muchísimo', 'heavyBleeding'],
    ['es', 'Nunca he sangrado tanto y me mareo', 'heavyBleeding'],
    ['es', 'tengo un dolor insoportable', 'severePain'],
    ['es', 'Creo que me voy a desmayar', 'fainting'],
    ['es', 'me he desmayado en clase', 'fainting'],
    ['es', 'estoy embarazada y sangro', 'pregnancyBleeding'],
    ['es', 'Estoy embarazada de 8 semanas y estoy sangrando con dolor', 'pregnancyBleeding'],
    ['es', 'estoy de 10 semanas de embarazo y he manchado', 'pregnancyBleeding'],
    ['es', 'Sí estoy embarazada y he manchado', 'pregnancyBleeding'],
    ['es', '¿Es normal sangrar si estoy embarazada de 8 semanas?', 'pregnancyBleeding'],
    ['es', 'No sé si es normal, estoy empapando una compresa cada hora', 'heavyBleeding'],
    ['es', 'no puedo mas sangro muchisimo', 'heavyBleeding'],
    ['es', 'Tengo fiebre y llevo un tampón', 'toxicShock'],
    ['es', 'tengo fiebre y tampón puesto: fiebre con tampon', 'toxicShock'],
    ['es', 'llevo la copa menstrual y tengo mucha fiebre', 'toxicShock'],
    ['es', 'veo borroso y me duele la cabeza', 'preeclampsia'],
    ['es', 'mi bebé se mueve menos', 'fetalMovement'],
    ['es', 'creo que he roto aguas', 'waterBreak'],
    ['es', 'me falta el aire', 'chest'],
    ['es', 'tengo dolor en el pecho y me cuesta respirar', 'chest'],
    ['es', 'no quiero vivir', 'selfHarm'],
    ['es', 'Me quiero matar', 'selfHarm'],
    ['es', 'Me voy a matar', 'selfHarm'],
    ['es', 'Me corto los brazos', 'selfHarm'],
    ['es', 'No me quiero matar pero lo pienso mucho', 'selfHarm'],
    ['es', 'mi pareja me pega', 'violence'],
    ['es', 'me pega mi novio cuando bebe', 'violence'],
    ['es', 'mi pareja no me pega pero me da miedo', 'violence'],
    ['en', "I'm soaking a pad every hour", 'heavyBleeding'],
    ['en', 'I soaked through two pads in an hour', 'heavyBleeding'],
    ["en", "I'm bleeding a lot and I feel dizzy", 'heavyBleeding'],
    ['en', "I've never bled this much and I feel dizzy", 'heavyBleeding'],
    ['en', "I don't know what to do I'm bleeding so much", 'heavyBleeding'],
    ['en', 'the pain is excruciating', 'severePain'],
    ['en', 'I feel faint', 'fainting'],
    ['en', 'pregnant and bleeding', 'pregnancyBleeding'],
    ['en', "I'm 8 weeks pregnant and have bleeding and cramps", 'pregnancyBleeding'],
    ['en', "I have a fever and I'm using a tampon", 'toxicShock'],
    ['en', 'blurry vision and a headache', 'preeclampsia'],
    ['en', "baby isn't moving", 'fetalMovement'],
    ['en', 'I think my waters broke', 'waterBreak'],
    ['en', 'I have chest pain', 'chest'],
    ['en', 'I want to kill myself', 'selfHarm'],
    ['en', 'I want to end it all', 'selfHarm'],
    ['en', "I don't want to be alive anymore", 'selfHarm'],
    ['en', 'I cut myself', 'selfHarm'],
    ['en', 'my partner hits me', 'violence'],
    ['en', 'he hit me last night', 'violence'],
  ];

  /** Everyday phrases that must not raise an alarm (including the audited false positives). */
  const CALM = [
    ['es', '¿puede hacerme daño el ibuprofeno?'],
    ['es', '¿puedo cortarme el pelo con la regla?'],
    ['es', 'me gusta la sopa'],
    ['es', 'tengo cólicos'],
    ['es', 'La regla me pega muy fuerte'],
    ['es', 'No tengo fiebre pero llevo tampón'],
    ['es', 'No me he desmayado nunca'],
    ['es', 'Me despierto empapada en sudor'],
    ['es', '¿Puedo estar embarazada si mancho?'],
    ['es', 'Si estoy embarazada, ¿puedo sangrar un poco?'],
    ['es', '¿Cómo sé si estoy embarazada? He manchado un poco'],
    ['es', 'Quiero quedarme embarazada y tengo manchado entre reglas'],
    ['es', 'Estoy embarazada y me sangran las encías'],
    ['es', 'tengo dolor en el pecho antes de la regla'],
    ['es', '¿Cada cuántas horas cambio el tampón?'],
    ['es', 'cuarentena por covid'],
    ['en', 'I hurt my knee at the gym'],
    ['en', 'I love grapes'],
    ['en', 'I have cramps'],
    ['en', 'Cramps hit me really hard'],
    ['en', 'I think I hit menopause'],
    ['en', 'It beats me why my period is late'],
    ['en', 'swollen legs in pregnancy'],
    ['en', "I haven't fainted but I feel tired"],
    ['en', 'Could I be pregnant if I am spotting?'],
    ['en', 'I want to get pregnant and I have spotting between periods'],
    ["en", "I'm pregnant and my gums are bleeding"],
    ['en', 'How often should I change my tampon?'],
    ['en', "I don't have a fever, can I use a tampon?"],
  ];

  it.each(URGENT)('flags "%s: %s" as %s', (lang, message, flag) => {
    const r = LUNA[/** @type {'es' | 'en'} */ (lang)].reply(message);
    expect(r.urgent).toBe(true);
    expect(r.flags).toContain(flag);
  });

  it.each(CALM)('does not alarm on "%s: %s"', (lang, message) => {
    expect(LUNA[/** @type {'es' | 'en'} */ (lang)].reply(message).urgent).toBe(false);
  });

  it('always gives a phone line in a crisis', () => {
    expect(LUNA.es.reply('quiero morirme').paragraphs.join(' ')).toMatch(/024/);
    expect(LUNA.en.reply('I want to die').paragraphs.join(' ')).toMatch(/988/);
    expect(LUNA.es.reply('Me quiero matar').paragraphs.join(' ')).toMatch(/024/);
    expect(LUNA.es.reply('mi pareja me pega').paragraphs.join(' ')).toMatch(/016/);
  });

  it('adds only related information after an urgent answer', () => {
    const products = { es: lunaEs.intents.find((i) => i.id === 'products'), en: lunaEn.intents.find((i) => i.id === 'products') };
    const soaked = LUNA.es.reply('Empapo una compresa cada hora');
    expect(soaked.intent).not.toBe('products');
    expect(soaked.paragraphs).not.toContain(products.es?.answer[0]);
    const tss = LUNA.en.reply("I have a fever and I'm using a tampon");
    expect(tss.intent).toBe('tss');
    expect(tss.paragraphs).not.toContain(products.en?.answer[0]);
    const pregnant = LUNA.en.reply("I'm 8 weeks pregnant and have bleeding and cramps");
    expect(pregnant.intent).toBe('pregnancyWarning');
    expect(pregnant.paragraphs.join(' ')).not.toMatch(/ibuprofen/i);
    const crisis = LUNA.es.reply('No quiero vivir, ¿cuándo me viene la regla?', { contextual: { nextPeriod: () => ['ctx:nextPeriod'] } });
    expect(crisis.urgent).toBe(true);
    expect(crisis.paragraphs).not.toContain('ctx:nextPeriod');
  });

  it('knows the user is pregnant from her mode and never suggests anti-inflammatories then', () => {
    const cramps = { es: lunaEs.intents.find((i) => i.id === 'cramps'), en: lunaEn.intents.find((i) => i.id === 'cramps') };
    for (const [lang, message] of [['es', 'Estoy sangrando y me duele mucho la tripa'], ['en', "I'm bleeding and have bad cramps"]]) {
      const l = /** @type {'es' | 'en'} */ (lang);
      const plain = LUNA[l].reply(message);
      expect(plain.urgent, message).toBe(false);
      const r = LUNA[l].reply(message, { mode: 'pregnant' });
      expect(r.urgent, message).toBe(true);
      expect(r.flags).toEqual(expect.arrayContaining(['pregnancyBleeding', 'pregnancyPain']));
      expect(r.intent).toBe('pregnancyWarning');
      expect(r.paragraphs).not.toContain(cramps[l]?.answer[0]);
    }
    // Mild cramps in pregnancy: pregnancy-safe advice instead of ibuprofen.
    expect(LUNA.es.reply('tengo cólicos', { mode: 'pregnant' }).intent).toBe('pregnancyCramps');
    expect(LUNA.en.reply('I have cramps', { mode: 'pregnant' }).intent).toBe('pregnancyCramps');
    expect(LUNA.en.reply("I'm pregnant and I have cramps").intent).toBe('pregnancyCramps');
    expect(LUNA.es.reply('tengo cólicos').intent).toBe('cramps');
  });

  it('treats heavy bleeding in the first weeks after birth as urgent, but not normal lochia', () => {
    const early = { mode: 'postpartum', postpartumWeeks: 2 };
    expect(LUNA.es.reply('Estoy sangrando mucho', early).flags).toContain('postpartumHaemorrhage');
    expect(LUNA.en.reply("I'm bleeding a lot and passing large clots", early).flags).toContain('postpartumHaemorrhage');
    expect(LUNA.es.reply('Estoy sangrando', early).urgent).toBe(false);
    expect(LUNA.es.reply('Estoy sangrando mucho', { mode: 'postpartum', postpartumWeeks: 30 }).urgent).toBe(false);
  });

  it('gives current menopause and emergency contraception guidance', () => {
    const text = (/** @type {any} */ kb, /** @type {string} */ id) => kb.intents.find((/** @type {any} */ i) => i.id === id).answer.join(' ');
    expect(text(lunaEs, 'menopause')).toMatch(/2 años después de la última regla si ocurre antes de los 50/);
    expect(text(lunaEn, 'menopause')).toMatch(/2 years after your last period if it happens before age 50/);
    expect(text(lunaEs, 'emergencyContraception')).not.toMatch(/últimos días/);
    expect(text(lunaEs, 'emergencyContraception')).toMatch(/cuanto antes.*ulipristal.*120 horas.*levonorgestrel.*72 horas/);
    expect(text(lunaEn, 'emergencyContraception')).not.toMatch(/later days/);
    expect(text(lunaEn, 'emergencyContraception')).toMatch(/as soon as possible.*ulipristal.*120 hours.*levonorgestrel.*72 hours/);
  });
});

describe('Luna topics (real knowledge bases)', () => {
  const es = createLuna(lunaEs);
  const en = createLuna(lunaEn);

  it('routes everyday phrasings to the right topic', () => {
    expect(es.reply('cosas para mamás primerizas').intent).not.toBe('breastPain');
    expect(es.reply('me duelen las mamas antes de la regla').intent).toBe('breastPain');
    expect(es.reply('cuarentena por covid').intent).toBeUndefined();
    expect(es.reply('¿es normal sangrar en la cuarentena?').intent).toBe('postpartumBleeding');
    expect(en.reply('I have really bad cramping').intent).toBe('cramps');
    expect(en.reply('can I get pregnant while breastfeeding').intent).toBe('breastfeedingFertility');
    expect(en.reply('breastfeeding and my breasts are sore').intent).not.toBe(undefined);
  });
});

describe('pregnancy notes', () => {
  it('cover weeks 4 to 42 in every language', () => {
    for (const notes of [pregEs, pregEn]) {
      for (let w = 4; w <= 42; w++) expect(typeof notes[w] === 'string' && notes[w].length > 40, `week ${w}`).toBe(true);
    }
  });
});
