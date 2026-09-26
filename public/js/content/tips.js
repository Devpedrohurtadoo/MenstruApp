// The tip of the day: the same one on the home screen and in the "tip of the day" reminder.

import { raw } from '../core/i18n.js';
import { dayNumber } from '../core/dates.js';

/**
 * @param {string} topic life stage or cycle phase (see tipTopic() in domain/modes.js)
 * @param {string} date ISO date the tip is for
 */
export function tipOfTheDay(topic, date) {
  const tips = /** @type {string[]} */ (raw(`tips.${topic}`) ?? raw('tips.general') ?? []);
  return tips.length ? tips[dayNumber(date) % tips.length] : '';
}
