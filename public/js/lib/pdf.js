// Minimal PDF 1.4 writer (no dependency): standard Helvetica fonts with WinAnsi encoding,
// automatic pagination, wrapped text, simple tables, filled rectangles and lines.
// Enough for a clean, printable medical-visit report that works offline on every device.

const PAGE = { w: 595.28, h: 841.89 }; // A4 in points
const MARGIN = 48;

// Helvetica glyph widths (1/1000 em) for WinAnsi codes 32–255 (AFM metrics).
// prettier-ignore
const HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,350,556,350,222,556,333,1000,556,556,333,1000,667,333,1000,350,611,350,350,222,222,333,333,350,556,1000,333,1000,500,333,944,350,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];

// Unicode → WinAnsi (cp1252) for the 0x80–0x9F range.
const CP1252 = /** @type {Record<number, number>} */ ({
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89,
  0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95,
  0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
});

/** @param {string} text @returns {number[]} WinAnsi codes (unsupported characters become "?") */
export function encodeWinAnsi(text) {
  const out = [];
  for (const ch of String(text).normalize('NFC')) {
    const cp = /** @type {number} */ (ch.codePointAt(0));
    if (cp === 0x09) out.push(32);
    else if (cp >= 0x20 && cp <= 0x7e) out.push(cp);
    else if (cp >= 0xa0 && cp <= 0xff) out.push(cp);
    else if (CP1252[cp]) out.push(CP1252[cp]);
    else if (cp === 0x2212) out.push(0x2d);
    else if (cp === 0xa0 || cp === 0x202f) out.push(32);
    else out.push(0x3f);
  }
  return out;
}

/** @param {string} text @param {number} size @param {boolean} bold */
export function textWidth(text, size, bold = false) {
  let w = 0;
  for (const c of encodeWinAnsi(text)) w += HELV[c - 32] ?? 556;
  return (w / 1000) * size * (bold ? 1.06 : 1);
}

/** @param {number[]} codes */
function pdfString(codes) {
  let s = '(';
  for (const c of codes) {
    if (c === 0x28 || c === 0x29 || c === 0x5c) s += `\\${String.fromCharCode(c)}`;
    else if (c < 0x20 || c > 0x7e) s += `\\${c.toString(8).padStart(3, '0')}`;
    else s += String.fromCharCode(c);
  }
  return `${s})`;
}

/** @param {string} hex */
function rgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(' ');
}

const n2 = (/** @type {number} */ x) => (Math.round(x * 100) / 100).toString();

export class PdfDoc {
  constructor({ title = 'Menstruapp', author = 'Menstruapp' } = {}) {
    this.title = title;
    this.author = author;
    /** @type {string[][]} */
    this.pages = [];
    this.y = 0;
    this.footer = '';
    this.addPage();
  }

  get width() {
    return PAGE.w - MARGIN * 2;
  }

  addPage() {
    this.pages.push([]);
    this.y = PAGE.h - MARGIN;
  }

  /** @param {string} op */
  op(op) {
    this.pages[this.pages.length - 1].push(op);
  }

  /** @param {number} needed */
  ensure(needed) {
    if (this.y - needed < MARGIN + 24) this.addPage();
  }

  /**
   * @param {string} text
   * @param {{ size?: number, bold?: boolean, color?: string, x?: number, maxWidth?: number, gap?: number, align?: 'left' | 'right' }} [o]
   */
  text(text, o = {}) {
    const size = o.size ?? 10.5;
    const lead = size * 1.35;
    const x = o.x ?? MARGIN;
    const maxWidth = o.maxWidth ?? this.width - (x - MARGIN);
    for (const line of this.wrap(text, size, Boolean(o.bold), maxWidth)) {
      this.ensure(lead);
      this.y -= lead;
      const lx = o.align === 'right' ? x + maxWidth - textWidth(line, size, o.bold) : x;
      this.op(`BT /${o.bold ? 'F2' : 'F1'} ${size} Tf ${rgb(o.color ?? '#2a1f33')} rg ${n2(lx)} ${n2(this.y)} Td ${pdfString(encodeWinAnsi(line))} Tj ET`);
    }
    this.y -= o.gap ?? 2;
  }

  /** @param {string} text @param {number} size @param {boolean} bold @param {number} maxWidth */
  wrap(text, size, bold, maxWidth) {
    const lines = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (textWidth(candidate, size, bold) <= maxWidth || !line) line = candidate;
        else {
          lines.push(line);
          line = word;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  /** @param {string} text */
  heading(text) {
    this.ensure(40);
    this.y -= 10;
    this.text(text, { size: 14, bold: true, color: '#8a3b6b', gap: 4 });
    this.rule();
  }

  rule(color = '#e8dcef') {
    this.op(`${rgb(color)} RG 0.8 w ${n2(MARGIN)} ${n2(this.y)} m ${n2(PAGE.w - MARGIN)} ${n2(this.y)} l S`);
    this.y -= 8;
  }

  /** @param {number} h */
  space(h) {
    this.y -= h;
  }

  /**
   * @param {number} x @param {number} y @param {number} w @param {number} h @param {string} color
   */
  rect(x, y, w, h, color) {
    this.op(`${rgb(color)} rg ${n2(x)} ${n2(y)} ${n2(w)} ${n2(h)} re f`);
  }

  /**
   * Simple table with header row, zebra rows and automatic page breaks.
   * @param {string[]} headers
   * @param {string[][]} rows
   * @param {number[]} widths fractions summing to 1
   */
  table(headers, rows, widths) {
    const size = 9.5;
    const pad = 4;
    const colW = widths.map((f) => f * this.width);
    const drawRow = (/** @type {string[]} */ cells, /** @type {boolean} */ header, /** @type {number} */ index) => {
      const wrapped = cells.map((c, i) => this.wrap(c, size, header, colW[i] - pad * 2));
      const height = Math.max(...wrapped.map((l) => l.length)) * size * 1.3 + pad * 2;
      this.ensure(height);
      const top = this.y;
      if (header) this.rect(MARGIN, top - height, this.width, height, '#f3e8f1');
      else if (index % 2) this.rect(MARGIN, top - height, this.width, height, '#faf6fb');
      let x = MARGIN;
      wrapped.forEach((lines, i) => {
        lines.forEach((line, li) => {
          const ly = top - pad - size * 1.3 * (li + 1) + 2;
          this.op(`BT /${header ? 'F2' : 'F1'} ${size} Tf ${rgb('#2a1f33')} rg ${n2(x + pad)} ${n2(ly)} Td ${pdfString(encodeWinAnsi(line))} Tj ET`);
        });
        x += colW[i];
      });
      this.y = top - height;
    };
    drawRow(headers, true, 0);
    rows.forEach((r, i) => {
      if (this.y - 20 < MARGIN + 24) {
        this.addPage();
        drawRow(headers, true, 0);
      }
      drawRow(r, false, i);
    });
    this.y -= 8;
  }

  /**
   * Horizontal bar list (label, value, fraction).
   * @param {Array<{ label: string, value: string, fraction: number }>} items
   * @param {string} color
   */
  bars(items, color = '#d9678f') {
    const size = 9.5;
    const labelW = this.width * 0.38;
    const barW = this.width * 0.42;
    for (const it of items) {
      this.ensure(16);
      this.y -= 15;
      this.op(`BT /F1 ${size} Tf ${rgb('#2a1f33')} rg ${n2(MARGIN)} ${n2(this.y + 3)} Td ${pdfString(encodeWinAnsi(it.label))} Tj ET`);
      this.rect(MARGIN + labelW, this.y + 1, barW, 9, '#f1e6f0');
      this.rect(MARGIN + labelW, this.y + 1, Math.max(1, barW * Math.min(1, it.fraction)), 9, color);
      this.op(`BT /F1 ${size} Tf ${rgb('#6d5e7a')} rg ${n2(MARGIN + labelW + barW + 8)} ${n2(this.y + 3)} Td ${pdfString(encodeWinAnsi(it.value))} Tj ET`);
    }
    this.y -= 8;
  }

  /** @returns {Blob} */
  toBlob() {
    /** @type {string[]} */
    const objects = [];
    const add = (/** @type {string} */ body) => {
      objects.push(body);
      return objects.length;
    };
    const catalogId = add('');
    const pagesId = add('');
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const pageIds = [];
    this.pages.forEach((ops, i) => {
      const footer = `BT /F1 8 Tf ${rgb('#8a7c96')} rg ${n2(MARGIN)} 28 Td ${pdfString(encodeWinAnsi(`${this.footer}   ·   ${i + 1}/${this.pages.length}`))} Tj ET`;
      const stream = [...ops, footer].join('\n');
      const contentId = add(`<< /Length ${latin1Length(stream)} >>\nstream\n${stream}\nendstream`);
      pageIds.push(
        add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE.w} ${PAGE.h}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contentId} 0 R >>`),
      );
    });
    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    const infoId = add(`<< /Title ${pdfString(encodeWinAnsi(this.title))} /Author ${pdfString(encodeWinAnsi(this.author))} /Producer (Menstruapp) >>`);

    let out = '%PDF-1.4\n%âãÏÓ\n';
    const offsets = [];
    objects.forEach((body, i) => {
      offsets.push(latin1Length(out));
      out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = latin1Length(out);
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
    out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return new Blob([bytes], { type: 'application/pdf' });
  }
}

/** Every character we emit is a single byte (latin1), so length === byte length. @param {string} s */
function latin1Length(s) {
  return s.length;
}
