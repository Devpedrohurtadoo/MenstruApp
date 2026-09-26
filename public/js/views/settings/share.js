import { h } from '../../core/dom.js';
import { t, fmtDateTime } from '../../core/i18n.js';
import { card, button, chipGroup, segmented, toggle, notice, iconButton } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { openModal, confirmDialog } from '../../ui/modal.js';
import { createShare, revokeShare, shareUrl } from '../../pwa/share.js';

/** @param {import('../shell.js').ViewContext} ctx */
export function render(ctx) {
  if (!ctx.state.server.share) return notice({ level: 'info', title: t('share.unavailableTitle'), text: t('share.unavailable') });
  const items = (ctx.state.data?.docs.shares?.items ?? []).filter((/** @type {{ expiresAt: number }} */ s) => s.expiresAt > Date.now());
  const rerender = () => ctx.navigate('settings/share', { replace: true });
  return h(
    'div',
    { class: 'stack' },
    card({
      title: t('share.title'),
      icon: 'share-2',
      children: [
        h('p', { text: t('share.intro') }),
        h('ul', { class: 'bullets' }, ['how1', 'how2', 'how3'].map((k) => h('li', { text: t(`share.${k}`) }))),
        button({
          label: t('share.create'),
          icon: 'link',
          variant: 'primary',
          fk: 'share-create',
          onClick: async () => {
            const { confirmIdentity } = await import('../security-flows.js');
            if (await confirmIdentity(t('share.reauth'))) createDialog(rerender);
          },
        }),
      ],
    }),
    card({
      title: t('share.active'),
      icon: 'link',
      children: items.length
        ? h(
            'ul',
            { class: 'dated-list' },
            items.map((/** @type {any} */ s) =>
              h(
                'li',
                null,
                h('span', { class: 'dated-list__text' }, h('strong', { text: s.label || t('share.untitled') }), h('span', { class: 'muted small', text: `${s.scope.map((/** @type {string} */ x) => t(`share.scopes.${x}`)).join(', ')} · ${t('share.expires', { date: fmtDateTime(s.expiresAt) })}` })),
                iconButton({ icon: 'copy', label: t('share.copyLinkNamed', { label: s.label || t('share.untitled') }), onClick: () => copy(shareUrl(s)) }),
                iconButton({
                  icon: 'delete',
                  label: t('share.revokeNamed', { label: s.label || t('share.untitled') }),
                  onClick: async () => {
                    const ok = await confirmDialog({ title: t('share.revoke'), message: t('share.revokeText'), confirmLabel: t('share.revoke'), danger: true });
                    if (!ok) return;
                    try {
                      await revokeShare(s.id);
                      toast(t('share.revoked'));
                      // The row is gone: keep focus in the page, on the "create" button.
                      /** @type {HTMLElement | null} */ (document.querySelector('[data-fk="share-create"]'))?.focus();
                    } catch {
                      // Only forgotten once the server confirmed it: it can be revoked again later.
                      toast(t('share.revokeFailed'), { type: 'error', duration: 8000 });
                    }
                    rerender();
                  },
                }),
              ),
            ),
          )
        : h('p', { class: 'muted', text: t('share.none') }),
    }),
  );
}

/** @param {string} url */
async function copy(url) {
  try {
    await navigator.clipboard.writeText(url);
    toast(t('common.copied'), { type: 'success' });
  } catch {
    toast(t('common.copyFailed'), { type: 'error' });
  }
}

/** @param {() => void} done */
function createDialog(done) {
  /** @type {Array<'predictions' | 'cycles' | 'symptoms' | 'notes'>} */
  let scope = ['predictions', 'cycles'];
  let days = 7;
  let includeName = false;
  const label = h('input', { class: 'input', id: 'share-label', maxLength: 40, placeholder: t('share.labelPlaceholder') });
  const content = h(
    'div',
    { class: 'stack' },
    chipGroup({
      label: t('share.what'),
      multiple: true,
      options: ['predictions', 'cycles', 'symptoms', 'notes'].map((s) => ({ value: s, label: t(`share.scopes.${s}`) })),
      value: scope,
      onChange: (v) => (scope = v),
    }),
    segmented({ label: t('share.duration'), options: [1, 7, 30].map((n) => ({ value: n, label: t('share.days', { count: n }) })), value: days, onChange: (v) => (days = v) }),
    toggle({ label: t('share.includeName'), checked: includeName, onChange: (v) => (includeName = v) }),
    h('label', { class: 'field__label', for: 'share-label', text: t('share.label') }),
    label,
    notice({ level: 'info', title: t('share.privacyTitle'), text: t('share.privacy') }),
    button({
      label: t('share.create'),
      variant: 'primary',
      full: true,
      onClick: async () => {
        if (!scope.length) return toast(t('share.pickSomething'), { type: 'error' });
        try {
          const url = await createShare({ scope, days, label: label.value.trim(), includeName });
          modal.close();
          if (navigator.share) {
            await navigator.share({ title: 'Menstruapp', url }).catch(() => copy(url));
          } else {
            await copy(url);
          }
          done();
        } catch (err) {
          console.error(err);
          toast(t('share.error'), { type: 'error' });
        }
      },
    }),
  );
  const modal = openModal({ title: t('share.create'), content, variant: 'dialog' });
}
