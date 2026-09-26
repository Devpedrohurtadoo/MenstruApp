// RFC 4180 CSV writer/parser. The writer neutralises spreadsheet formula injection
// (cells starting with = + - @ tab or CR are prefixed with an apostrophe, per OWASP).

const FORMULA_START = /^[=+\-@\t\r]/;

/** @param {unknown} value */
function cell(value) {
  let str = value === null || value === undefined ? '' : String(value);
  if (FORMULA_START.test(str)) str = `'${str}`;
  if (/[",\r\n;]/.test(str)) str = `"${str.replace(/"/g, '""')}"`;
  return str;
}

/**
 * @param {unknown[][]} rows
 * @returns {string}
 */
export function toCSV(rows) {
  return `${rows.map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}

/**
 * Parses CSV text (auto-detects "," or ";" delimiters, strips a UTF-8 BOM).
 * @param {string} text
 * @param {{ maxRows?: number }} [opts]
 * @returns {string[][]}
 */
export function parseCSV(text, opts = {}) {
  const maxRows = opts.maxRows ?? 100_000;
  const src = text.replace(/^\uFEFF/, ''); // strip a UTF-8 byte-order mark
  const firstLine = src.slice(0, src.search(/\r?\n/) === -1 ? src.length : src.search(/\r?\n/));
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      if (rows.length >= maxRows) return rows;
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((c) => c !== '')) rows.push(row);
  }
  return rows;
}
