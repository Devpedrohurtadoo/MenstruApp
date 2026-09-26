// "Luna": an on-device health assistant. It never sends messages anywhere.
// It scores the question against a curated knowledge base (content/luna-<lang>.js),
// always checks for red flags first (heavy bleeding, severe pain, pregnancy bleeding,
// self-harm, violence...) and can answer personal questions from the user's own data
// ("when is my next period?", "am I fertile today?") through contextual handlers.
//
// Matching rules
//  - Keywords match whole words. A trailing "*" marks a stem ("sangr*" → sangro, sangrando) and
//    "#" stands for a number ("estoy de # semanas"). Informational keywords (intents, contextual
//    questions, small talk) also accept an "s"/"es" plural on their last word; red-flag terms
//    never do, so "swollen leg" (one leg: a clot warning) does not match "swollen legs".
//  - A red flag fires on any of its `patterns`, or on a `combo` when every group of words appears
//    anywhere in the message ("fever" + "tampon"). A group entry "@pregnant" refers to the
//    knowledge base's `contexts`: it is satisfied by an affirmative phrase in the message ("I'm
//    8 weeks pregnant", not "if I'm pregnant") or by the user's mode (pregnant, or postpartum
//    during the first 12 weeks).
//  - A negation right before a term ("no", "not", "haven't", "nunca", "sin", allowing a few
//    auxiliary words such as "tengo" or "have") silences it, but never for flags marked
//    `alwaysFlag` (suicide, self-harm, violence...). Clause breaks (",", ".", "?") stop a
//    negation, and "never bled this much" is not a negation.
//  - When a red flag fires, only the intents it lists as `related` (or its `follow` intent) are
//    added after the urgent message: an emergency is never followed by unrelated advice.
//  - Intents can name a safer intent to use instead in a situation (`insteadIn: { pregnant: id }`),
//    so, for example, cramp advice that mentions ibuprofen is never given in pregnancy.

/** @param {string} text */
export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Like normalize(), but keeps clause breaks as "|" tokens so that phrases never match across
 * sentences and a negation in one clause never applies to the next one.
 * @param {string} text
 */
function normalizeClauses(text) {
  const tokens = String(text ?? '')
    .toLowerCase()
    // "sí" (yes) affirms what follows, unlike "si" (if): keep it apart before accents are removed.
    .replace(/(^|[^a-z0-9áéíóúüñ])sí(?![a-z0-9áéíóúüñ])/g, '$1 | ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/(\d)[.,](?=\d)/g, '$1 ')
    .replace(/[.,;:!?¡¿()[\]{}"…\n\r]+/g, ' | ')
    .replace(/[^a-z0-9ñ|]+/g, ' ')
    .split(' ')
    .filter(Boolean);
  /** @type {string[]} */
  const out = [];
  for (const t of tokens) if (t !== '|' || (out.length && out[out.length - 1] !== '|')) out.push(t);
  if (out[out.length - 1] === '|') out.pop();
  return out.join(' ');
}

/** @param {string} s */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @typedef {{ re: RegExp, all: RegExp, numeric: boolean }} Matcher
 */

/**
 * Compiles a keyword into a whole-word matcher (see the rules at the top of this file).
 * @param {string} keyword
 * @param {boolean} plural accept an "s"/"es" plural on the last word
 * @returns {Matcher}
 */
function compile(keyword, plural) {
  const raw = String(keyword).trim();
  const stem = raw.endsWith('*');
  const words = raw
    .replace(/\*$/, '')
    .split(/\s+/)
    .map((w) => (w === '#' ? '\\d+' : escapeRe(normalize(w))))
    .filter(Boolean);
  const last = words[words.length - 1] ?? '';
  const end = stem ? '' : plural && /^[a-zñ]{3,}$/.test(last) ? '(?:e?s)?(?= |$)' : '(?= |$)';
  const source = `(?:^| )${words.join(' ')}${end}`;
  return { re: new RegExp(source), all: new RegExp(source, 'g'), numeric: words.includes('\\d+') };
}

// Negations silence a red-flag term when they come right before it, possibly with a few
// auxiliary words in between ("no tengo fiebre", "I haven't had any bleeding").
const NEGATIONS = new Set([
  'no', 'nunca', 'jamas', 'sin', 'tampoco', 'ni', 'ningun', 'ninguna', 'ninguno', 'apenas',
  'not', 'never', 'without', 'nor', 'none', 'cannot', 'cant', 'dont', 'doesnt', 'didnt', 'havent', 'hasnt', 'hadnt',
  'isnt', 'arent', 'wasnt', 'werent', 'wont', 'wouldnt', 'couldnt', 'shouldnt', 'aint', 'barely', 'hardly',
]);
/** "don't" is normalised to "don t": the word before a lone "t". */
const CONTRACTED = new Set(['don', 'doesn', 'didn', 'haven', 'hasn', 'hadn', 'isn', 'aren', 'wasn', 'weren', 'won', 'wouldn', 'couldn', 'shouldn', 'can', 'ain', 'mustn']);
/** Hypothetical markers: "si estoy embarazada", "what if I'm pregnant" are not statements. */
const HYPOTHETICAL = new Set(['si', 'if', 'whether']);
const FILLERS = new Set([
  'me', 'te', 'se', 'lo', 'la', 'las', 'los', 'le', 'les', 'el', 'un', 'una', 'unos', 'unas', 'he', 'has', 'ha', 'hemos', 'han',
  'habia', 'habido', 'hay', 'tengo', 'tienes', 'tiene', 'tenia', 'tenido', 'tener', 'tenga', 'estoy', 'estas', 'esta', 'estaba',
  'estado', 'estar', 'este', 'noto', 'notado', 'siento', 'sentido', 'veo', 'visto', 'muy', 'mucho', 'mucha', 'muchos', 'muchas',
  'nada', 'de', 'ya', 'todavia', 'aun', 'creo', 'que', 'mas', 'demasiado',
  'i', 'm', 've', 'd', 'll', 're', 's', 'im', 'ive', 'have', 'has', 'had', 'been', 'am', 'is', 'was', 'are', 'were', 'be', 'a', 'an',
  'any', 'really', 'feel', 'feeling', 'felt', 'get', 'got', 'getting', 'ever', 'even', 'much', 'very', 'actually', 'currently',
  'yet', 'do', 'did', 'does', 'it', 'think', 'noticed', 'seen',
]);
const MAX_FILLERS = 3;
/** "I've never bled this much" / "nunca he sangrado tanto": an intensifier, not a negation. */
const INTENSIFIED = /^ (?:(?:nunca )?(?:tanto|tan|asi)|como (?:hoy|ahora|nunca|este|esta)|(?:this|that|so) (?:much|bad|badly|heavy|heavily|hard)|like (?:this|that)|as (?:much|bad|badly|heavy|heavily) as)(?= |$)/;

/**
 * Whether the term found at [start, end) is negated (or, with `hypothetical`, only supposed).
 * @param {string} text
 * @param {number} start
 * @param {number} end
 * @param {boolean} hypothetical
 */
function negated(text, start, end, hypothetical) {
  const before = text.slice(0, start).split(' ').filter(Boolean);
  const wordEnd = text.indexOf(' ', end) === -1 ? text.length : text.indexOf(' ', end);
  const intensified = INTENSIFIED.test(text.slice(wordEnd));
  let fillers = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    const w = before[i];
    if (w === '|') return false;
    if (NEGATIONS.has(w) || (w === 't' && CONTRACTED.has(before[i - 1] ?? ''))) return !intensified;
    if (hypothetical && HYPOTHETICAL.has(w)) return true;
    if (!FILLERS.has(w) || ++fillers > MAX_FILLERS) return false;
  }
  return false;
}

/**
 * @param {Matcher} m
 * @param {string} text
 * @param {'plain' | 'negatable' | 'affirmative'} how affirmative = neither negated nor hypothetical
 *   (a phrase with a number, "si estoy de 8 semanas", is taken as a statement)
 */
function hit(m, text, how) {
  if (how === 'plain') return m.re.test(text);
  for (const match of text.matchAll(m.all)) {
    const index = match.index ?? 0;
    const start = index + (match[0].startsWith(' ') ? 1 : 0);
    if (!negated(text, start, index + match[0].length, how === 'affirmative' && !m.numeric)) return true;
  }
  return false;
}

/**
 * @typedef {{ id: string, topic: string, keywords: Record<string, number>, answer: string[], article?: string,
 *   followUps?: string[], insteadIn?: Record<string, string> }} Intent
 * @typedef {{ id: string, patterns?: string[], combos?: string[][][], unless?: string[], alwaysFlag?: boolean,
 *   answer: string[], related?: string[], follow?: string }} RedFlag
 * @typedef {{ intents: Intent[], redFlags: RedFlag[], contexts?: Record<string, string[]>,
 *   contextual: Record<string, Record<string, number>>, smalltalk: Record<string, { keywords: string[], answer: string[] }>,
 *   fallback: string[], disclaimer: string }} KnowledgeBase
 * @typedef {{ paragraphs: string[], article?: string, urgent: boolean, intent?: string, related?: string[], followUps?: string[],
 *   flags?: string[] }} LunaReply
 * @typedef {{ contextual?: Record<string, () => string[] | null>, name?: string, mode?: string, postpartumWeeks?: number | null }} ReplyContext
 *   `mode` is the usage mode; `postpartumWeeks` the weeks since birth in postpartum mode (unknown = treated as early).
 */

/** Situations implied by the usage mode. @param {ReplyContext} ctx */
function modeContexts(ctx) {
  /** @type {Set<string>} */
  const set = new Set();
  if (ctx.mode === 'pregnant') set.add('pregnant');
  if (ctx.mode === 'postpartum' && (ctx.postpartumWeeks === null || ctx.postpartumWeeks === undefined || ctx.postpartumWeeks <= 12)) set.add('postpartum');
  return set;
}

/**
 * @param {KnowledgeBase} kb
 */
export function createLuna(kb) {
  const intents = kb.intents.map((i) => ({
    ...i,
    matchers: Object.entries(i.keywords).map(([k, w]) => ({ re: compile(k, true).re, w })),
  }));
  const byId = new Map(intents.map((i) => [i.id, i]));
  const contexts = new Map(Object.entries(kb.contexts ?? {}).map(([id, terms]) => [id, terms.map((t) => compile(t, false))]));
  const group = (/** @type {string[]} */ terms) => ({
    contexts: terms.filter((t) => t.startsWith('@')).map((t) => t.slice(1)),
    terms: terms.filter((t) => !t.startsWith('@')).map((t) => compile(t, false)),
  });
  const flags = kb.redFlags.map((f) => ({
    ...f,
    patternMatchers: (f.patterns ?? []).map((p) => compile(p, false)),
    comboMatchers: (f.combos ?? []).map((combo) => combo.map(group)),
    unlessMatchers: (f.unless ?? []).map((t) => compile(t, false)),
  }));
  const contextual = Object.entries(kb.contextual).map(([id, keywords]) => ({
    id,
    matchers: Object.entries(keywords).map(([k, w]) => ({ re: compile(k, true).re, w })),
  }));
  const smalltalk = Object.entries(kb.smalltalk).map(([id, s]) => ({ id, answer: s.answer, matchers: s.keywords.map((k) => compile(k, true).re) }));

  /**
   * @param {Array<{ re: RegExp, w: number }>} matchers
   * @param {string} text
   */
  const score = (matchers, text) => {
    let total = 0;
    let hits = 0;
    for (const m of matchers) {
      if (m.re.test(text)) {
        total += m.w;
        hits++;
      }
    }
    return hits > 1 ? total + 0.5 * (hits - 1) : total;
  };

  /**
   * Situations that apply to this message: from the mode or stated in the message itself.
   * @param {string} text
   * @param {Set<string>} fromMode
   */
  const situations = (text, fromMode) => {
    const set = new Set(fromMode);
    for (const [id, terms] of contexts) if (terms.some((m) => hit(m, text, 'affirmative'))) set.add(id);
    return set;
  };

  /**
   * @param {(typeof flags)[number]} f
   * @param {string} text
   * @param {Set<string>} active situations
   */
  const fires = (f, text, active) => {
    const how = f.alwaysFlag ? 'plain' : 'negatable';
    if (f.patternMatchers.some((m) => hit(m, text, how))) return true;
    if (!f.comboMatchers.length || f.unlessMatchers.some((m) => hit(m, text, 'plain'))) return false;
    return f.comboMatchers.some((combo) => combo.every((g) => g.contexts.some((c) => active.has(c)) || g.terms.some((m) => hit(m, text, how))));
  };

  /**
   * The intent to answer with in the current situations (e.g. pregnancy-safe pain advice).
   * @param {(typeof intents)[number]} intent
   * @param {Set<string>} active
   */
  const resolve = (intent, active) => {
    for (const [situation, id] of Object.entries(intent.insteadIn ?? {})) {
      const other = byId.get(id);
      if (active.has(situation) && other) return other;
    }
    return intent;
  };

  return {
    /**
     * @param {string} message
     * @param {ReplyContext} [ctx]
     * @returns {LunaReply}
     */
    reply(message, ctx = {}) {
      const text = normalizeClauses(message);
      if (!text) return { paragraphs: kb.fallback, urgent: false };

      const active = situations(text, modeContexts(ctx));
      const urgent = flags.filter((f) => fires(f, text, active));

      const candidates = [
        ...intents.map((i) => ({ kind: /** @type {const} */ ('intent'), id: i.id, score: score(i.matchers, text), intent: i })),
        ...contextual.map((c) => ({ kind: /** @type {const} */ ('context'), id: c.id, score: score(c.matchers, text), intent: null })),
      ]
        .filter((c) => c.score >= 2)
        .sort((a, b) => b.score - a.score);
      const best = candidates[0];
      const bestIntent = best?.kind === 'intent' && best.intent ? resolve(best.intent, active) : null;

      if (urgent.length) {
        // Emergencies first, then only content related to them (never unrelated advice).
        const allowed = new Set(urgent.flatMap((f) => f.related ?? []));
        const follow = urgent.map((f) => f.follow).find((id) => id && byId.has(id));
        const chosen = bestIntent && allowed.has(bestIntent.id) ? bestIntent : follow ? byId.get(follow) : undefined;
        /** @type {LunaReply} */
        const result = { paragraphs: urgent.flatMap((f) => f.answer), urgent: true, flags: urgent.map((f) => f.id) };
        if (chosen) {
          result.paragraphs.push(...chosen.answer);
          result.intent = chosen.id;
          result.article = chosen.article;
          result.followUps = chosen.followUps;
        }
        const related = candidates
          .filter((c) => c.kind === 'intent' && allowed.has(c.id) && c.id !== chosen?.id)
          .slice(0, 2)
          .map((c) => c.id);
        if (related.length) result.related = related;
        result.paragraphs.push(kb.disclaimer);
        return result;
      }

      /** @type {string[]} */
      const paragraphs = [];
      /** @type {LunaReply} */
      const result = { paragraphs, urgent: false };
      if (best?.kind === 'context') {
        const handler = ctx.contextual?.[best.id];
        const answer = handler ? handler() : null;
        if (answer?.length) {
          paragraphs.push(...answer);
          result.intent = best.id;
        }
      } else if (bestIntent) {
        paragraphs.push(...bestIntent.answer);
        result.intent = bestIntent.id;
        result.article = bestIntent.article;
        result.followUps = bestIntent.followUps;
      }
      const related = candidates
        .slice(1)
        .filter((c) => c.kind === 'intent' && best && c.score >= best.score * 0.75 && c.id !== best.id && c.id !== result.intent)
        .slice(0, 2)
        .map((c) => c.id);
      if (related.length) result.related = related;

      if (!result.intent) {
        const chat = smalltalk.find((s) => s.matchers.some((re) => re.test(text)));
        if (chat) return { paragraphs: chat.answer.map((p) => p.replace(/\s?\{name\}/g, ctx.name ? ` ${ctx.name}` : '')), urgent: false, intent: `smalltalk.${chat.id}` };
        return { paragraphs: kb.fallback, urgent: false };
      }
      paragraphs.push(kb.disclaimer);
      return result;
    },
    /** @param {string} id */
    intent(id) {
      return intents.find((i) => i.id === id) ?? null;
    },
  };
}
