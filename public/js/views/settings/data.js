import { h, downloadBlob } from '../../core/dom.js';
import { t, fmtNumber, fmtDateTime } from '../../core/i18n.js';
import { todayISO } from '../../core/dates.js';
import { card, button, listItem, notice, segmented, progressBar } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { openModal, confirmDialog, askSecret } from '../../ui/modal.js';
import { importData, deleteEverything, storageStatus, recordEvent, setPrefs } from '../../app.js';
import { backupBlob, encryptedBackupBlob, csvBlob, readBackup, BackupError } from '../../data/backup.js';
import { importCSV, importAppleHealth } from '../../data/importers.js';

/** @param {import('../shell.js').ViewContext} ctx */
export async function render(ctx) {
  const data = /** @type {NonNullable<typeof ctx.state.data>} */ (ctx.state.data);
  const storage = await storageStatus();
  const syncState = data.docs.sync;
  const exportName = (/** @type {string} */ ext) => `menstruapp-${todayISO()}.${ext}`;

  const fileInput = h('input', {
    type: 'file',
    class: 'sr-only',
    id: 'import-file',
    accept: '.json,.csv,.xml,.txt,application/json,text/csv,text/xml',
    onChange: async (/** @type {Event} */ e) => {
      const el = /** @type {HTMLInputElement} */ (e.target);
      const file = el.files?.[0];
      el.value = '';
      if (file) await handleImport(file);
    },
  });

  return h(
    'div',
    { class: 'stack' },
    card({
      title: t('settings.data.export'),
      icon: 'download',
      children: [
        h('p', { class: 'muted', text: t('settings.data.exportText') }),
        h(
          'div',
          { class: 'list' },
          listItem({ icon: 'file-down', title: t('settings.data.pdf'), subtitle: t('settings.data.pdfDesc'), href: '#/report' }),
          listItem({
            icon: 'shield-check',
            title: t('settings.data.encryptedBackup'),
            subtitle: t('settings.data.encryptedBackupDesc'),
            onClick: async () => {
              const password = await askSecret({ title: t('settings.data.encryptedBackup'), label: t('settings.data.backupPassword'), hint: t('settings.data.backupPasswordHint'), minLength: 8, autocomplete: 'new-password', account: t('settings.data.backupAccount') });
              if (!password) return;
              const blob = await encryptedBackupBlob(data, password);
              downloadBlob(blob, exportName('menstruapp'));
              setPrefs({ backupNudgeAt: Date.now() });
              await recordEvent('backupDone');
              toast(t('settings.data.exported'), { type: 'success' });
            },
          }),
          listItem({
            icon: 'file-text',
            title: t('settings.data.json'),
            subtitle: t('settings.data.jsonDesc'),
            onClick: async () => {
              const ok = await confirmDialog({ title: t('settings.data.json'), message: t('settings.data.plainWarning'), confirmLabel: t('common.download') });
              if (!ok) return;
              downloadBlob(backupBlob(data), exportName('json'));
              setPrefs({ backupNudgeAt: Date.now() });
              await recordEvent('backupDone');
            },
          }),
          listItem({
            icon: 'chart',
            title: t('settings.data.csv'),
            subtitle: t('settings.data.csvDesc'),
            onClick: async () => {
              const ok = await confirmDialog({ title: t('settings.data.csv'), message: t('settings.data.plainWarning'), confirmLabel: t('common.download') });
              if (ok) downloadBlob(csvBlob(data.days), exportName('csv'));
            },
          }),
        ),
      ],
    }),
    card({
      title: t('settings.data.import'),
      icon: 'upload',
      children: [
        h('p', { class: 'muted', text: t('settings.data.importText') }),
        h('label', { class: 'btn btn--soft', for: 'import-file' }, h('span', { text: t('settings.data.chooseFile') })),
        fileInput,
        h('p', { class: 'muted small', text: t('settings.data.importFormats') }),
      ],
    }),
    card({
      title: t('settings.data.sync'),
      icon: 'cloud',
      children: ctx.state.server.sync
        ? [
            h('p', { class: 'muted', text: syncState?.enabled ? t('settings.data.syncOn', { date: syncState.lastSyncAt ? fmtDateTime(syncState.lastSyncAt) : '—' }) : t('settings.data.syncOff') }),
            button({ label: syncState?.enabled ? t('settings.data.syncManage') : t('settings.data.syncEnable'), icon: 'cloud', variant: 'soft', onClick: () => import('../../pwa/sync.js').then((m) => m.openSyncSettings()) }),
          ]
        : h('p', { class: 'muted', text: t('settings.data.syncUnavailable') }),
    }),
    card({
      title: t('settings.data.storage'),
      icon: 'smartphone',
      children: [
        h('p', { text: t(storage.persisted ? 'settings.data.persisted' : 'settings.data.notPersisted') }),
        storage.quota ? progressBar(storage.usage / storage.quota, t('settings.data.usage')) : null,
        storage.quota ? h('p', { class: 'muted small', text: t('settings.data.usageText', { used: fmtNumber(storage.usage / 1e6, { maximumFractionDigits: 1 }), total: fmtNumber(storage.quota / 1e9, { maximumFractionDigits: 1 }) }) }) : null,
        !storage.persisted && isIOS() ? notice({ level: 'info', title: t('settings.data.iosTitle'), text: t('settings.data.iosText') }) : null,
        data.unreadable ? notice({ level: 'consult', title: t('settings.data.unreadableTitle', { count: data.unreadable }), text: t('settings.data.unreadableText') }) : null,
      ],
    }),
    card({
      title: t('settings.data.delete'),
      icon: 'delete',
      tone: 'danger',
      children: [
        h('p', { class: 'muted', text: t('settings.data.deleteText') }),
        button({
          label: t('settings.data.deleteAll'),
          icon: 'delete',
          variant: 'danger',
          onClick: async () => {
            const first = await confirmDialog({ title: t('settings.data.deleteAll'), message: t('settings.data.deleteAllText'), confirmLabel: t('common.continue'), danger: true });
            if (!first) return;
            const word = await askSecret({ title: t('settings.data.deleteAll'), label: t('settings.data.typeDelete', { word: t('settings.data.deleteWord') }), confirmLabel: t('common.delete'), plain: true });
            if (!word || word.trim().toUpperCase() !== t('settings.data.deleteWord').toUpperCase()) return toast(t('settings.data.deleteCancelled'));
            try {
              const remote = await import('../../pwa/services.js');
              await remote.deleteRemoteData().catch(() => undefined);
              await deleteEverything();
            } finally {
              location.replace(location.pathname);
            }
          },
        }),
      ],
    }),
  );
}


/** iOS/iPadOS Safari, where storage of non-installed web apps can be evicted after weeks of disuse. */
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** @param {File} file */
async function handleImport(file) {
  try {
    /** @type {{ days: Record<string, any>, docs?: Record<string, any> } | null} */
    let payload = null;
    let summary = '';
    if (/\.xml$/i.test(file.name) || file.type.includes('xml')) {
      const progress = toast(t('settings.data.reading'), { duration: 60_000 });
      const { days, records } = await importAppleHealth(file);
      progress();
      payload = { days };
      summary = t('settings.data.appleSummary', { records, days: Object.keys(days).length });
    } else {
      if (file.size > 60 * 1024 * 1024) throw new BackupError('tooLarge');
      const text = await file.text();
      if (/^\s*\{/.test(text)) {
        let password;
        try {
          payload = await readBackup(text);
        } catch (err) {
          if (!(err instanceof BackupError) || err.code !== 'needsPassword') throw err;
          password = await askSecret({ title: t('settings.data.encryptedBackup'), label: t('settings.data.backupPassword'), account: t('settings.data.backupAccount') });
          if (!password) return;
          payload = await readBackup(text, password);
        }
        summary = t('settings.data.backupSummary', { days: Object.keys(payload.days).length });
      } else {
        const order = /** @type {'dmy' | 'mdy'} */ (navigator.language?.toLowerCase().startsWith('en-us') ? 'mdy' : 'dmy');
        const result = importCSV(text, { ambiguousOrder: order });
        payload = { days: result.days };
        summary = t('settings.data.csvSummary', { days: Object.keys(result.days).length, skipped: result.skipped });
      }
    }
    if (!payload || !Object.keys(payload.days).length && !payload.docs) return toast(t('settings.data.nothingToImport'), { type: 'error' });
    let strategy = /** @type {'merge' | 'replace'} */ ('merge');
    const content = h(
      'div',
      { class: 'stack' },
      h('p', { text: summary }),
      segmented({
        label: t('settings.data.strategy'),
        options: [
          { value: 'merge', label: t('settings.data.merge') },
          { value: 'replace', label: t('settings.data.replace') },
        ],
        value: strategy,
        onChange: (v) => (strategy = /** @type {any} */ (v)),
      }),
      h('p', { class: 'muted small', text: t('settings.data.strategyHint') }),
      button({
        label: t('settings.data.importNow'),
        variant: 'primary',
        full: true,
        onClick: async () => {
          if (strategy === 'replace') {
            const ok = await confirmDialog({ title: t('settings.data.replace'), message: t('settings.data.replaceWarning'), confirmLabel: t('settings.data.replace'), danger: true });
            if (!ok) return;
          }
          const { imported } = await importData(/** @type {any} */ (payload), strategy);
          modal.close();
          toast(t('settings.data.imported', { count: imported }), { type: 'success' });
        },
      }),
    );
    const modal = openModal({ title: t('settings.data.import'), content, variant: 'dialog' });
  } catch (err) {
    console.error('[import]', err);
    const code = err instanceof BackupError ? err.code : 'invalid';
    toast(t(`settings.data.importErrors.${code}`), { type: 'error' });
  }
}
