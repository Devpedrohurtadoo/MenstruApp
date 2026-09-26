// "Luna": an on-device health assistant. It never sends messages anywhere.
// It scores the question against a curated knowledge base (content/luna-<lang>.js),
// always checks for red flags first (heavy bleeding, severe pain, pregnancy bleeding,
// self-harm, violence...) and can answer personal questions from the user's own data
// ("when is my next period?", "am I fertile today?") through contextual handlers.

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

/** @param {string} s */
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @param {string} keyword */
function compile(keyword) {
  const k = normalize(keyword);
  // Short keywords (e.g. "sop", "diu", "its") must be whole words so "sopa" never matches.
  const strictEnd = k.length <= 4;
  return new RegExp(`(?:^| )${escapeRe(k)}${strictEnd ? '(?= |$)' : ''}`);
}

/**
 * @typedef {{ id: string, topic: string, keywords: Record<string, number>, answer: string[], article?: string, followUps?: string[] }} Intent
 * @typedef {{ id: string, patterns: string[], answer: string[] }} RedFlag
 * @typedef {{ intents: Intent[], redFlags: RedFlag[], contextual: Record<string, Record<string, number>>,
 *   smalltalk: Record<string, { keywords: string[], answer: string[] }>, fallback: string[], disclaimer: string }} KnowledgeBase
 * @typedef {{ paragraphs: string[], article?: string, urgent: boolean, intent?: string, related?: string[], followUps?: string[] }} LunaReply
 */

/**
 * @param {KnowledgeBase} kb
 */
export function createLuna(kb) {
  const intents = kb.intents.map((i) => ({
    ...i,
    matchers: Object.entries(i.keywords).map(([k, w]) => ({ re: compile(k), w })),
  }));
  const flags = kb.redFlags.map((f) => ({ ...f, matchers: f.patterns.map(compile) }));
  const contextual = Object.entries(kb.contextual).map(([id, keywords]) => ({
    id,
    matchers: Object.entries(keywords).map(([k, w]) => ({ re: compile(k), w })),
  }));
  const smalltalk = Object.entries(kb.smalltalk).map(([id, s]) => ({ id, answer: s.answer, matchers: s.keywords.map(compile) }));

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

  return {
    /**
     * @param {string} message
     * @param {{ contextual?: Record<string, () => string[] | null>, name?: string }} [ctx]
     * @returns {LunaReply}
     */
    reply(message, ctx = {}) {
      const text = normalize(message);
      if (!text) return { paragraphs: kb.fallback, urgent: false };

      const urgent = flags.filter((f) => f.matchers.some((re) => re.test(text)));
      /** @type {string[]} */
      const paragraphs = urgent.flatMap((f) => f.answer);

      const candidates = [
        ...intents.map((i) => ({ kind: /** @type {const} */ ('intent'), id: i.id, score: score(i.matchers, text), intent: i })),
        ...contextual.map((c) => ({ kind: /** @type {const} */ ('context'), id: c.id, score: score(c.matchers, text), intent: null })),
      ]
        .filter((c) => c.score >= 2)
        .sort((a, b) => b.score - a.score);

      const best = candidates[0];
      /** @type {LunaReply} */
      const result = { paragraphs, urgent: urgent.length > 0 };

      if (best?.kind === 'context') {
        const handler = ctx.contextual?.[best.id];
        const answer = handler ? handler() : null;
        if (answer?.length) {
          paragraphs.push(...answer);
          result.intent = best.id;
        }
      } else if (best?.kind === 'intent' && best.intent) {
        paragraphs.push(...best.intent.answer);
        result.intent = best.id;
        result.article = best.intent.article;
        result.followUps = best.intent.followUps;
      }
      const related = candidates
        .slice(1)
        .filter((c) => c.kind === 'intent' && best && c.score >= best.score * 0.75 && c.id !== best.id)
        .slice(0, 2)
        .map((c) => c.id);
      if (related.length) result.related = related;

      if (!result.intent && !urgent.length) {
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
