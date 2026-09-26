// Static invariants of the shipped files: they catch "works on my machine" deploy bugs.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { computeManifest, staticImports, renderPreloads } from '../../scripts/stamp-sw.mjs';
import { PdfDoc, encodeWinAnsi, textWidth } from '../../public/js/lib/pdf.js';

const PUBLIC = path.resolve('public');
const read = (/** @type {string} */ f) => fs.readFileSync(path.join(PUBLIC, f), 'utf8');

/** @param {string} csp */
const directives = (csp) =>
  Object.fromEntries(
    csp
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [name, ...values] = d.split(/\s+/);
        return [name, values.sort().join(' ')];
      }),
  );

function headerRules() {
  /** @type {Record<string, Record<string, string>>} */
  const rules = {};
  let current = '';
  for (const line of read('_headers').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) rules[(current = line.trim())] = {};
    else {
      const i = line.indexOf(':');
      rules[current][line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return rules;
}

/** @param {string} file */
function pngSize(file) {
  const buf = fs.readFileSync(path.join(PUBLIC, file));
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
}

describe('service worker', () => {
  it('is stamped with the current precache manifest (run `npm run stamp`)', async () => {
    const { version, urls } = await computeManifest();
    const sw = read('sw.js');
    expect(sw).toContain(`const VERSION = '${version}';`);
    for (const url of urls) expect(sw).toContain(`'${url}'`);
    expect(urls).toContain('/index.html');
    expect(urls).toContain('/js/main.js');
    expect(urls.some((u) => u.startsWith('/assets/splash/') || u.startsWith('/assets/screenshots/'))).toBe(false);
  });

  it('preloads exactly the static module graph of each page (run `npm run stamp`)', async () => {
    for (const [page, entry] of [
      ['index.html', 'js/main.js'],
      ['share.html', 'js/share/view.js'],
    ]) {
      const preloads = await staticImports(entry);
      expect(preloads.length).toBeGreaterThan(3);
      expect(read(page), page).toContain(renderPreloads(preloads));
    }
  });
});

describe('security headers and CSP', () => {
  const rules = headerRules();
  const global = rules['/*'];

  it('sends the hardening headers on every response', () => {
    expect(global['Strict-Transport-Security']).toMatch(/max-age=\d{7,}/);
    expect(global['X-Content-Type-Options']).toBe('nosniff');
    expect(global['X-Frame-Options']).toBe('DENY');
    expect(global['Referrer-Policy']).toBe('no-referrer');
    expect(global['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(global['Permissions-Policy']).toContain('camera=()');
    expect(global['Permissions-Policy']).toContain('geolocation=()');
  });

  it('uses a strict CSP without unsafe sources, with Trusted Types', () => {
    const csp = directives(global['Content-Security-Policy']);
    expect(csp['default-src']).toBe("'self'");
    expect(csp['script-src']).toBe("'self'");
    expect(csp['style-src']).toBe("'self'");
    expect(csp['object-src']).toBe("'none'");
    expect(csp['base-uri']).toBe("'none'");
    expect(csp['frame-ancestors']).toBe("'none'");
    expect(csp['require-trusted-types-for']).toBe("'script'");
    expect(JSON.stringify(csp)).not.toMatch(/unsafe|\*|https?:/);
  });

  it('keeps the <meta> CSP of every page identical to the header CSP', () => {
    const header = directives(global['Content-Security-Policy']);
    delete header['frame-ancestors']; // not allowed in <meta>
    for (const page of ['index.html', 'share.html']) {
      const m = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(read(page));
      expect(m, page).toBeTruthy();
      expect(directives(/** @type {RegExpExecArray} */ (m)[1]), page).toEqual(header);
    }
  });

  it('never caches the HTML shell, the manifest or the service worker for long', () => {
    for (const f of ['/sw.js', '/index.html', '/manifest.webmanifest']) expect(rules[f]?.['Cache-Control'], f).toMatch(/no-cache|no-store/);
    expect(rules['/share.html']['X-Robots-Tag']).toContain('noindex');
  });
});

describe('HTML pages', () => {
  for (const page of ['index.html', 'share.html']) {
    it(`${page} has no inline scripts, styles or handlers and all references exist`, () => {
      const html = read(page);
      expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
      expect(html).not.toMatch(/<style\b/i);
      expect(html).not.toMatch(/\sstyle=/i);
      expect(html).not.toMatch(/\son[a-z]+=/i);
      for (const m of html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)) expect(fs.existsSync(path.join(PUBLIC, m[1])), m[1]).toBe(true);
    });
  }
});

describe('web app manifest', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));

  it('is installable (name, start_url, display, 192 and 512 icons, maskable)', () => {
    expect(manifest.name && manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toMatch(/^\//);
    expect(manifest.scope).toBe('/');
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
    const sizes = manifest.icons.map((/** @type {any} */ i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((/** @type {any} */ i) => i.purpose === 'maskable')).toBe(true);
  });

  it('references images that exist with the declared sizes', () => {
    const images = [...manifest.icons, ...manifest.screenshots, ...manifest.shortcuts.flatMap((/** @type {any} */ s) => s.icons)];
    for (const img of images) expect(pngSize(img.src), img.src).toBe(img.sizes);
  });
});

describe('module graph', () => {
  it('resolves every static and dynamic import to an existing file', () => {
    const files = [];
    const walk = (/** @type {string} */ d) => {
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.js')) files.push(p);
      }
    };
    walk(path.join(PUBLIC, 'js'));
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/(?:from\s+|import\()\s*(['"`])(\.{1,2}\/[^'"`]+)\1/g)) {
        const spec = m[2];
        const variants = spec.includes('${') ? ['es', 'en'].map((l) => spec.replace(/\$\{[^}]+\}/, l)) : [spec];
        for (const v of variants) expect(fs.existsSync(path.resolve(path.dirname(file), v)), `${path.relative(PUBLIC, file)} → ${v}`).toBe(true);
      }
    }
  });
});

describe('PDF writer', () => {
  it('has Helvetica metrics for every WinAnsi code', () => {
    expect(textWidth('M', 10)).toBeCloseTo(8.33, 2);
    expect(encodeWinAnsi('ñ€✓')).toEqual([0xf1, 0x80, 0x3f]);
    for (let c = 32; c <= 255; c++) expect(Number.isFinite(textWidth(String.fromCharCode(c), 10))).toBe(true);
  });

  it('produces a structurally valid PDF (xref offsets point at their objects)', async () => {
    const doc = new PdfDoc({ title: 'Informe (prueba) — ñandú' });
    doc.heading('Resumen');
    for (let i = 0; i < 120; i++) doc.text(`Línea ${i} con acentos: áéíóú ü ç € (paréntesis) \\ barra`);
    doc.table(
      ['A', 'B'],
      [
        ['1', '2'],
        ['3', '4'],
      ],
      [0.5, 0.5],
    );
    const bytes = new Uint8Array(await doc.toBlob().arrayBuffer());
    const text = Buffer.from(bytes).toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    const startxref = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
    const entries = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(entries.length).toBeGreaterThan(5);
    entries.forEach((off, i) => expect(text.slice(off, off + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
    for (const m of text.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
      const start = /** @type {number} */ (m.index) + m[0].length;
      expect(text.slice(start + Number(m[1]), start + Number(m[1]) + 10)).toBe('\nendstream');
    }
    expect((text.match(/\/Type \/Page /g) ?? []).length).toBeGreaterThan(1);
  });
});
