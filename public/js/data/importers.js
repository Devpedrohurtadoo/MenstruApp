// Importers for data coming from other apps. Web apps cannot read Apple Health or Health
// Connect directly, so we support their export files instead:
//  - Apple Health "export.xml" (menstrual flow, spotting, basal temperature, LH tests, mucus)
//  - any CSV with a date column (and optionally a flow/bleeding column)

import { parseCSV } from '../lib/csv.js';
import { isISODate, isoFromParts } from '../core/dates.js';
import { csvToDays } from './backup.js';

/** @param {string} s */
const norm = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

const FLOW_WORDS = /** @type {Array<[RegExp, string]>} */ ([
  [/^(heavy|fuerte|abundante|intens[oa]|alto|high|3)$/, 'heavy'],
  [/^(medium|medio|media|moderad[oa]|normal|regular|2)$/, 'medium'],
  [/^(light|ligero|ligera|leve|poco|bajo|low|1)$/, 'light'],
  [/^(spotting|manchado|manchas|goteo|spot)$/, 'spotting'],
  [/^(none|ninguno|nada|no|0)$/, 'none'],
  [/^(yes|si|true|x|period|regla|sangrado|bleeding|menstruation)$/, 'medium'],
]);

/** @param {string} value */
export function parseFlowWord(value) {
  const v = norm(value);
  for (const [re, flow] of FLOW_WORDS) if (re.test(v)) return flow;
  return null;
}

/**
 * Parses a date string in several common formats.
 * @param {string} raw
 * @param {'dmy' | 'mdy'} ambiguousOrder how to read 03/04/2024
 * @returns {string | null}
 */
export function parseFlexibleDate(raw, ambiguousOrder = 'dmy') {
  const s = String(raw).trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) {
    const iso = isoFromParts(Number(m[1]), Number(m[2]), Number(m[3]));
    return isISODate(iso) ? iso : null;
  }
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    let day;
    let month;
    if (a > 12) [day, month] = [a, b];
    else if (b > 12) [month, day] = [a, b];
    else if (ambiguousOrder === 'mdy') [month, day] = [a, b];
    else [day, month] = [a, b];
    const iso = isoFromParts(y, month, day);
    return isISODate(iso) ? iso : null;
  }
  return null;
}

/**
 * Imports a CSV file. Menstruapp's own export is detected and fully restored; for other CSVs
 * we look for a date column and an optional flow column (each listed date without a flow
 * column is considered a period day).
 * @param {string} text
 * @param {{ ambiguousOrder?: 'dmy' | 'mdy' }} [opts]
 * @returns {{ days: Record<string, any>, format: 'menstruapp' | 'generic', rows: number, skipped: number }}
 */
export function importCSV(text, opts = {}) {
  const own = csvToDays(text);
  if (own) return { days: own, format: 'menstruapp', rows: Object.keys(own).length, skipped: 0 };
  const rows = parseCSV(text);
  if (!rows.length) return { days: {}, format: 'generic', rows: 0, skipped: 0 };
  const header = rows[0].map(norm);
  let dateCol = header.findIndex((h) => /(date|fecha|dia|day)/.test(h));
  if (dateCol < 0) dateCol = header.findIndex((h) => /(start|inicio|comienzo)/.test(h));
  let flowCol = header.findIndex((h, i) => i !== dateCol && /(flow|flujo|bleed|sangrado|period|regla|menstru|intensi)/.test(h));
  let body = rows.slice(1);
  if (dateCol < 0) {
    // No header: assume the first column contains dates.
    dateCol = 0;
    flowCol = rows[0].length > 1 && parseFlowWord(rows[0][1]) ? 1 : -1;
    body = rows;
  }
  /** @type {Record<string, any>} */
  const days = {};
  let skipped = 0;
  for (const r of body.slice(0, 50_000)) {
    const iso = parseFlexibleDate(r[dateCol] ?? '', opts.ambiguousOrder ?? 'dmy');
    if (!iso) {
      skipped++;
      continue;
    }
    const flow = flowCol >= 0 ? parseFlowWord(r[flowCol] ?? '') : 'medium';
    if (!flow) {
      skipped++;
      continue;
    }
    days[iso] = { flow };
  }
  return { days, format: 'generic', rows: body.length, skipped };
}

const HK_FLOW = /** @type {Record<string, string>} */ ({
  Unspecified: 'medium',
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
  None: 'none',
});
const HK_MUCUS = /** @type {Record<string, string>} */ ({ Dry: 'dry', Sticky: 'sticky', Creamy: 'creamy', Watery: 'watery', EggWhite: 'eggwhite' });

/** @param {string} tag @param {string} name */
function attr(tag, name) {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
}

/**
 * Streams an Apple Health export.xml (can be hundreds of MB) and extracts cycle data.
 * @param {Blob} file
 * @param {(fraction: number) => void} [onProgress]
 * @returns {Promise<{ days: Record<string, any>, records: number }>}
 */
export async function importAppleHealth(file, onProgress) {
  /** @type {Record<string, any>} */
  const days = {};
  let records = 0;
  let buffer = '';
  let read = 0;
  const decoder = new TextDecoder();
  const reader = file.stream().getReader();
  const TAG = /<Record\b[^>]*>/g;
  for (;;) {
    const { value, done } = await reader.read();
    if (value) {
      read += value.byteLength;
      buffer += decoder.decode(value, { stream: true });
    }
    if (done) buffer += decoder.decode();
    // Only scan up to the last complete tag; keep the rest for the next chunk.
    const cut = done ? buffer.length : buffer.lastIndexOf('<');
    const scan = buffer.slice(0, Math.max(0, cut));
    buffer = buffer.slice(Math.max(0, cut));
    TAG.lastIndex = 0;
    let m;
    while ((m = TAG.exec(scan))) {
      const tag = m[0];
      if (!tag.includes('HKCategoryTypeIdentifier') && !tag.includes('HKQuantityTypeIdentifierBasalBodyTemperature')) continue;
      const type = attr(tag, 'type');
      const start = attr(tag, 'startDate')?.slice(0, 10);
      const val = attr(tag, 'value') ?? '';
      if (!type || !start || !isISODate(start)) continue;
      const day = (days[start] = days[start] ?? {});
      if (type === 'HKCategoryTypeIdentifierMenstrualFlow') {
        const key = val.replace(/^HKCategoryValue(MenstrualFlow|VaginalBleeding)/, '');
        if (Object.hasOwn(HK_FLOW, key)) {
          day.flow = HK_FLOW[key];
          records++;
        }
      } else if (type === 'HKCategoryTypeIdentifierIntermenstrualBleeding' || type === 'HKCategoryTypeIdentifierPersistentIntermenstrualBleeding') {
        if (!day.flow) day.flow = 'spotting';
        records++;
      } else if (type === 'HKQuantityTypeIdentifierBasalBodyTemperature') {
        const unit = attr(tag, 'unit');
        let t = parseFloat(val);
        if (unit === 'degF') t = ((t - 32) * 5) / 9;
        if (t >= 34.5 && t <= 39.5) {
          day.bbt = Math.round(t * 100) / 100;
          records++;
        }
      } else if (type === 'HKCategoryTypeIdentifierOvulationTestResult') {
        if (/LuteinizingHormoneSurge|Positive/.test(val)) day.lh = 'positive';
        else if (/Negative/.test(val)) day.lh = day.lh ?? 'negative';
        records++;
      } else if (type === 'HKCategoryTypeIdentifierCervicalMucusQuality') {
        const key = val.replace(/^HKCategoryValueCervicalMucusQuality/, '');
        if (Object.hasOwn(HK_MUCUS, key)) {
          day.mucus = HK_MUCUS[key];
          records++;
        }
      }
      if (!Object.keys(day).length) delete days[start];
    }
    if (onProgress && file.size) onProgress(Math.min(1, read / file.size));
    if (done) break;
  }
  for (const iso of Object.keys(days)) if (!Object.keys(days[iso]).length) delete days[iso];
  return { days, records };
}
