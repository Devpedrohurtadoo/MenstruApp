// Read-only viewer for shared summaries. The decryption key lives only in the URL fragment
// (never sent to the server); the page fetches the ciphertext and decrypts it locally.

import { h, replace } from '../core/dom.js';
import { t, setLanguage, detectLanguage, fmtDate, fmtDateTime } from '../core/i18n.js';
import { fromB64Url, decryptJSON } from '../security/crypto.js';
import { brandMark } from '../views/brand.js';
import { icon } from '../ui/icons.js';

const root = /** @type {HTMLElement} */ (document.getElementById('app'));

/** @param {string} title @param {string} text */
function message(title, text) {
  replace(root, h('div', { class: 'share-view' }, brandMark(), h('div', { class: 'card' }, h('h1', { class: 'card__title', text: title }), h('p', { text }))));
}

let loadSeq = 0;

async function main() {
  const seq = ++loadSeq;
  document.title = `${t('shareView.title')} · Menstruapp`;
  // Another link opened meanwhile (see the hashchange listener): drop this older one.
  const stale = () => seq !== loadSeq;
  setLanguage(detectLanguage());
  const [id, key] = location.hash.replace(/^#/, '').split('.');
  // Remove the key from the address bar/history as soon as we have it.
  history.replaceState(null, '', location.pathname);
  if (!id || !key || !/^[A-Za-z0-9_-]{16,64}$/.test(id) || !/^[A-Za-z0-9_-]{40,50}$/.test(key)) return message(t('shareView.invalidTitle'), t('shareView.invalid'));
  let json;
  try {
    const res = await fetch(`/api/share/${encodeURIComponent(id)}`, { credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
    if (stale()) return;
    if (res.status === 404 || res.status === 410) return message(t('shareView.goneTitle'), t('shareView.gone'));
    if (!res.ok) throw new Error(String(res.status));
    json = await res.json();
  } catch {
    if (!stale()) message(t('shareView.errorTitle'), t('shareView.error'));
    return;
  }
  /** @type {any} */
  let snap;
  try {
    const cryptoKey = await crypto.subtle.importKey('raw', fromB64Url(key), 'AES-GCM', false, ['decrypt']);
    snap = await decryptJSON(cryptoKey, { iv: json.iv, ct: json.ct }, `menstruapp-share-v1:${id}`);
  } catch {
    if (!stale()) message(t('shareView.invalidTitle'), t('shareView.invalid'));
    return;
  }
  if (stale()) return;
  if (snap?.lang === 'es' || snap?.lang === 'en') setLanguage(snap.lang);
  const blocks = [];
  blocks.push(h('p', { class: 'muted small', text: t('shareView.createdAt', { date: fmtDateTime(Number(snap.createdAt) || Date.now()) }) }));
  if (typeof snap.name === 'string') blocks.push(h('p', { class: 'lead', text: t('shareView.from', { name: snap.name.slice(0, 40) }) }));
  const p = snap.predictions;
  if (p && typeof p.nextPeriodStart === 'string') {
    blocks.push(
      h(
        'section',
        { class: 'card' },
        h('h2', { class: 'card__title' }, icon('calendar', { size: 18 }), ` ${t('shareView.predictions')}`),
        h('p', { text: t('shareView.nextPeriod', { date: fmtDate(p.nextPeriodStart, 'long'), margin: Number(p.margin) || 0 }) }),
        p.phaseToday ? h('p', { text: t('shareView.phase', { phase: t(`phases.${String(p.phaseToday)}`), date: fmtDate(p.asOf, 'long') }) }) : null,
        p.fertile?.start ? h('p', { text: t('shareView.fertile', { from: fmtDate(p.fertile.start, 'short'), to: fmtDate(p.fertile.end, 'short') }) }) : null,
      ),
    );
  }
  if (Array.isArray(snap.cycles) && snap.cycles.length) {
    blocks.push(
      h(
        'section',
        { class: 'card' },
        h('h2', { class: 'card__title' }, icon('history', { size: 18 }), ` ${t('shareView.cycles')}`),
        snap.stats?.cycle ? h('p', { text: t('shareView.avgCycle', { mean: Math.round(snap.stats.cycle.mean) }) }) : null,
        h(
          'table',
          { class: 'table' },
          h('thead', null, h('tr', null, h('th', { scope: 'col', text: t('report.start') }), h('th', { scope: 'col', text: t('report.cycleLength') }), h('th', { scope: 'col', text: t('report.periodLength') }))),
          h(
            'tbody',
            null,
            snap.cycles.slice(-12).map((/** @type {any} */ c) =>
              h('tr', null, h('td', { text: typeof c.start === 'string' ? fmtDate(c.start, 'medium') : '—' }), h('td', { text: c.length ? t('common.days', { count: Number(c.length) }) : t('report.ongoing') }), h('td', { text: c.periodLength ? t('common.days', { count: Number(c.periodLength) }) : '—' })),
            ),
          ),
        ),
      ),
    );
  }
  if (Array.isArray(snap.symptoms) && snap.symptoms.length) {
    blocks.push(
      h(
        'section',
        { class: 'card' },
        h('h2', { class: 'card__title' }, icon('activity', { size: 18 }), ` ${t('shareView.symptoms')}`),
        h('ul', { class: 'bullets' }, snap.symptoms.slice(0, 12).map((/** @type {any} */ s) => h('li', { text: `${t(`symptoms.${String(s.id)}`)} — ${t('analysis.timesDays', { count: Number(s.count) || 0 })}` }))),
      ),
    );
  }
  if (Array.isArray(snap.notes) && snap.notes.length) {
    blocks.push(
      h(
        'section',
        { class: 'card' },
        h('h2', { class: 'card__title' }, icon('notebook-pen', { size: 18 }), ` ${t('shareView.notes')}`),
        snap.notes.slice(-60).map((/** @type {any} */ n) => h('p', null, h('strong', { text: `${fmtDate(String(n.date), 'medium')}: ` }), String(n.text ?? '').slice(0, 2000))),
      ),
    );
  }
  blocks.push(h('p', { class: 'disclaimer', text: t('shareView.disclaimer') }));
  replace(root, h('div', { class: 'share-view' }, brandMark(), h('h1', { class: 'share-view__title', text: t('shareView.title') }), ...blocks));
}

main();
// Opening another link in this same tab only changes the fragment (no page load): load it too.
window.addEventListener('hashchange', () => {
  if (location.hash.length > 1) main();
});
