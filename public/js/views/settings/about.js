import { h } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { card, listItem, button } from '../../ui/components.js';
import { openModal } from '../../ui/modal.js';
import { toast } from '../../ui/toast.js';
import { APP_VERSION } from '../../data/backup.js';
import { privacyPolicy, legalNotice, licenses } from '../legal.js';
import { brandMark } from '../brand.js';
import { checkForUpdate } from '../../pwa/sw-register.js';

/** @param {import('../shell.js').ViewContext} _ctx */
export function render(_ctx) {
  return h(
    'div',
    { class: 'stack' },
    card({
      children: [
        h('div', { class: 'about-head' }, brandMark(), h('p', { class: 'muted', text: t('settings.about.version', { version: APP_VERSION }) })),
        h('p', { text: t('settings.about.mission') }),
        h('p', { class: 'muted small', text: t('common.disclaimer') }),
        button({
          label: t('settings.about.checkUpdates'),
          icon: 'refresh-cw',
          variant: 'soft',
          onClick: async () => {
            const found = await checkForUpdate();
            toast(found ? t('shell.updateReady') : t('settings.about.upToDate'));
          },
        }),
      ],
    }),
    h(
      'div',
      { class: 'list' },
      listItem({ icon: 'shield-check', title: t('legal.privacyTitle'), onClick: () => openModal({ title: t('legal.privacyTitle'), content: privacyPolicy(), variant: 'full' }) }),
      listItem({ icon: 'file-text', title: t('legal.termsTitle'), onClick: () => openModal({ title: t('legal.termsTitle'), content: legalNotice(), variant: 'full' }) }),
      listItem({ icon: 'award', title: t('legal.licensesTitle'), onClick: () => openModal({ title: t('legal.licensesTitle'), content: licenses(), variant: 'dialog' }) }),
      listItem({ icon: 'lightbulb', title: t('learn.help'), href: '#/learn/help' }),
    ),
  );
}
