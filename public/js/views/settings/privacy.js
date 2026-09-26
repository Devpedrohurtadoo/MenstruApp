import { h } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { card, toggle, button, listItem, notice, segmented } from '../../ui/components.js';
import { icon } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { updateSettings, setPrefs, lock, newRecoveryCode, enableBiometric, disableBiometric } from '../../app.js';
import { biometricsLikelyAvailable } from '../../security/webauthn.js';
import { askCurrentSecret, chooseNewLock, showRecoveryCode } from '../security-flows.js';

/** @param {import('../shell.js').ViewContext} ctx */
export async function render(ctx) {
  const d = /** @type {NonNullable<typeof ctx.state.derived>} */ (ctx.state.derived);
  const info = /** @type {NonNullable<typeof ctx.state.session>} */ (ctx.state.session).vaultInfo;
  const sec = d.settings.security;
  const bioAvailable = await biometricsLikelyAvailable();
  const save = (/** @type {Record<string, any>} */ patch) => updateSettings({ security: { ...sec, ...patch } });

  const lockLabel = info.primary === 'pin' ? t('settings.security.lockPin', { count: info.pinDigits ?? 0 }) : info.primary === 'passphrase' ? t('settings.security.lockPassphrase') : t('settings.security.lockNone');

  return h(
    'div',
    { class: 'stack' },
    card({
      title: t('settings.security.lock'),
      icon: 'lock',
      children: [
        h('p', { class: 'lead', text: lockLabel }),
        h('p', { class: ['security-note', info.needsSecret ? 'security-note--good' : ''] }, icon(info.needsSecret ? 'shield-check' : 'shield-alert', { size: 16 }), h('span', { text: t(info.needsSecret ? 'settings.security.encrypted' : 'settings.security.encryptedDevice') })),
        info.primary === 'none' ? notice({ level: 'info', title: t('settings.security.noLockTitle'), text: t('settings.security.noLockText') }) : null,
        button({
          label: info.primary === 'none' ? t('settings.security.addLock') : t('lock.change'),
          icon: 'key-round',
          variant: 'primary',
          onClick: async () => {
            const attempt = await askCurrentSecret({ reason: t('settings.security.reauthChange') });
            if (!attempt) return;
            try {
              const { verifyCurrentUser } = await import('../../app.js');
              await verifyCurrentUser(attempt);
            } catch {
              return toast(t('lock.wrongGeneric'), { type: 'error' });
            }
            await chooseNewLock(attempt);
          },
        }),
        info.needsSecret
          ? listItem({
              icon: 'key-round',
              title: t('settings.security.recovery'),
              subtitle: t('settings.security.recoveryDesc'),
              onClick: async () => {
                const attempt = await askCurrentSecret({ reason: t('settings.security.reauthRecovery') });
                if (!attempt) return;
                try {
                  const code = await newRecoveryCode(attempt);
                  await showRecoveryCode(code, { required: true });
                } catch {
                  toast(t('lock.wrongGeneric'), { type: 'error' });
                }
              },
            })
          : null,
      ],
    }),
    info.needsSecret
      ? card({
          title: t('settings.security.biometric'),
          icon: 'fingerprint',
          children: bioAvailable || info.hasBiometric
            ? toggle({
                label: t('settings.security.biometricToggle'),
                description: t('settings.security.biometricDesc'),
                checked: info.hasBiometric,
                onChange: async (on) => {
                  try {
                    if (on) {
                      const attempt = await askCurrentSecret({ reason: t('settings.security.reauthBiometric') });
                      if (!attempt || attempt.type === 'webauthn') return ctx.navigate('settings/privacy', { replace: true });
                      await enableBiometric(attempt);
                      toast(t('settings.security.biometricOn'), { type: 'success' });
                    } else {
                      await disableBiometric();
                      toast(t('settings.security.biometricOff'));
                    }
                  } catch (err) {
                    console.error(err);
                    toast(t('settings.security.biometricUnavailable'), { type: 'error' });
                  }
                  ctx.navigate('settings/privacy', { replace: true });
                },
              })
            : h('p', { class: 'muted', text: t('settings.security.biometricNotSupported') }),
        })
      : null,
    info.needsSecret
      ? card({
          title: t('settings.security.autoLock'),
          icon: 'timer',
          children: [
            segmented({
              label: t('settings.security.autoLockAfter'),
              options: [1, 5, 15, 30, 0].map((n) => ({ value: n, label: n ? t('settings.security.minutes', { count: n }) : t('settings.security.never') })),
              value: sec.autoLockMinutes,
              onChange: (v) => save({ autoLockMinutes: v }),
            }),
            toggle({ label: t('settings.security.lockOnHide'), description: t('settings.security.lockOnHideDesc'), checked: sec.lockOnHide, onChange: (v) => save({ lockOnHide: v }) }),
            button({ label: t('shell.lockNow'), icon: 'lock', variant: 'soft', onClick: () => lock('manual') }),
          ],
        })
      : null,
    card({
      title: t('settings.security.discreet'),
      icon: 'eye-off',
      children: [
        toggle({ label: t('settings.security.discreetNotifications'), description: t('settings.security.discreetNotificationsDesc'), checked: sec.discreetNotifications, onChange: (v) => save({ discreetNotifications: v }) }),
        toggle({ label: t('settings.security.hideNames'), description: t('settings.security.hideNamesDesc'), checked: ctx.state.prefs.hideProfileNames, onChange: (v) => { setPrefs({ hideProfileNames: v }); } }),
        info.needsSecret ? listItem({ icon: 'shield', title: t('settings.security.safeScreen'), subtitle: t('settings.security.safeScreenDesc'), onClick: () => import('../camouflage.js').then((m) => m.showCamouflage()) }) : null,
        h('p', { class: 'muted small', text: t('settings.security.discreetIconNote') }),
      ],
    }),
    info.needsSecret
      ? card({
          title: t('settings.security.guest'),
          icon: 'users',
          children: [
            h('p', { class: 'muted', text: t('settings.security.guestDesc') }),
            toggle({ label: t('settings.security.guestNextPeriod'), checked: sec.guestShowNextPeriod, onChange: (v) => save({ guestShowNextPeriod: v }) }),
            toggle({ label: t('settings.security.guestPhase'), checked: sec.guestShowPhase, onChange: (v) => save({ guestShowPhase: v }) }),
            button({ label: t('settings.security.guestStart'), icon: 'eye', variant: 'soft', onClick: () => import('../camouflage.js').then((m) => m.showGuest()) }),
          ],
        })
      : null,
    card({
      title: t('settings.security.howProtected'),
      icon: 'shield-check',
      children: h('ul', { class: 'bullets' }, ['p1', 'p2', 'p3', 'p4', 'p5'].map((k) => h('li', { text: t(`settings.security.protection.${k}`) }))),
    }),
  );
}
