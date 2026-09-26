// Reusable security dialogs: re-authentication, choosing a new PIN/passphrase and showing the
// recovery code (which is displayed exactly once and never stored in clear).

import { h, downloadBlob, replace } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { segmented, button } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { secretProblem } from '../security/vault.js';
import { groupCode } from '../security/crypto.js';
import { changeLock, store } from '../app.js';

/**
 * Asks the user to confirm who they are before a sensitive change.
 * @param {{ reason: string }} opts
 * @returns {Promise<null | { type: 'pin' | 'passphrase' | 'device' | 'webauthn', secret?: string }>}
 */
export function askCurrentSecret(opts) {
  const info = store.get().session?.vaultInfo;
  if (!info) return Promise.resolve(null);
  if (!info.needsSecret) return Promise.resolve({ type: 'device' });
  /** @type {null | { type: any, secret?: string }} */
  let result = null;
  const isPin = info.primary === 'pin';
  const input = h('input', {
    type: 'password',
    class: 'input',
    id: 'reauth-secret',
    inputMode: isPin ? 'numeric' : 'text',
    autocomplete: 'current-password',
    maxLength: isPin ? 8 : 256,
    required: true,
  });
  const form = h(
    'form',
    {
      class: 'stack',
      onSubmit: (/** @type {SubmitEvent} */ e) => {
        e.preventDefault();
        if (!input.value) return;
        result = { type: info.primary, secret: input.value };
        modal.close();
      },
    },
    h('p', { class: 'muted', text: opts.reason }),
    h('label', { class: 'field__label', for: 'reauth-secret', text: t(isPin ? 'lock.currentPin' : 'lock.currentPassphrase') }),
    input,
    h('button', { type: 'submit', class: 'btn btn--primary btn--full', text: t('common.continue') }),
    info.hasBiometric
      ? button({
          label: t('lock.useBiometric'),
          icon: 'fingerprint',
          variant: 'ghost',
          full: true,
          onClick: () => {
            result = { type: 'webauthn' };
            modal.close();
          },
        })
      : null,
  );
  const modal = openModal({ title: t('lock.confirmIdentity'), variant: 'dialog', content: form, initialFocus: '#reauth-secret' });
  return modal.closed.then(() => result);
}

/**
 * Collects a new PIN or passphrase (entered twice) and applies it.
 * @param {{ type: any, secret?: string }} currentAttempt proof of the current identity
 * @param {{ forced?: boolean, allowNone?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
export function chooseNewLock(currentAttempt, opts = {}) {
  const info = store.get().session?.vaultInfo;
  /** @type {'pin' | 'passphrase' | 'none'} */
  let method = info?.primary === 'passphrase' ? 'passphrase' : 'pin';
  let done = false;
  const container = h('div', { class: 'stack' });
  const render = () => {
    const first = h('input', {
      type: 'password',
      class: 'input',
      id: 'new-secret',
      inputMode: method === 'pin' ? 'numeric' : 'text',
      autocomplete: 'new-password',
      maxLength: method === 'pin' ? 8 : 256,
    });
    const second = h('input', {
      type: 'password',
      class: 'input',
      id: 'new-secret-2',
      inputMode: method === 'pin' ? 'numeric' : 'text',
      autocomplete: 'new-password',
      maxLength: method === 'pin' ? 8 : 256,
    });
    const error = h('p', { class: 'field__error', role: 'alert', hidden: true });
    const submit = h('button', { type: 'submit', class: 'btn btn--primary btn--full', text: t('common.save') });
    const form = h(
      'form',
      {
        class: 'stack',
        onSubmit: async (/** @type {SubmitEvent} */ e) => {
          e.preventDefault();
          const showError = (/** @type {string} */ msg) => {
            error.textContent = msg;
            error.hidden = false;
          };
          if (method !== 'none') {
            const problem = secretProblem(method, first.value);
            if (problem) return showError(t(problem));
            if (first.value !== second.value) return showError(t('lock.errors.mismatch'));
          }
          submit.disabled = true;
          submit.textContent = t('common.saving');
          try {
            const { recoveryCode } = await changeLock(currentAttempt, { method, secret: method === 'none' ? undefined : first.value });
            done = true;
            modal.close();
            toast(t('lock.changed'), { type: 'success' });
            if (recoveryCode) await showRecoveryCode(recoveryCode, { required: true });
          } catch (err) {
            console.error(err);
            showError(t('lock.errors.changeFailed'));
            submit.disabled = false;
            submit.textContent = t('common.save');
          }
        },
      },
      method === 'none'
        ? h('p', { class: 'notice-text', text: t('lock.noneWarning') })
        : [
            h('label', { class: 'field__label', for: 'new-secret', text: t(method === 'pin' ? 'lock.newPin' : 'lock.newPassphrase') }),
            first,
            h('p', { class: 'field__hint', text: t(method === 'pin' ? 'lock.pinHint' : 'lock.passphraseHint') }),
            h('label', { class: 'field__label', for: 'new-secret-2', text: t('lock.repeat') }),
            second,
          ],
      error,
      submit,
    );
    const options = [
      { value: /** @type {const} */ ('pin'), label: t('lock.methods.pin') },
      { value: /** @type {const} */ ('passphrase'), label: t('lock.methods.passphrase') },
    ];
    if (opts.allowNone !== false && !opts.forced) options.push(/** @type {any} */ ({ value: 'none', label: t('lock.methods.none') }));
    replace(container,
      segmented({
        label: t('lock.method'),
        options: /** @type {any} */ (options),
        value: method,
        onChange: (v) => {
          method = /** @type {any} */ (v);
          render();
        },
      }),
      form,
    );
  };
  render();
  const modal = openModal({
    title: opts.forced ? t('lock.createNew') : t('lock.change'),
    variant: 'dialog',
    content: container,
    dismissible: !opts.forced,
    initialFocus: '#new-secret',
  });
  return modal.closed.then(() => done);
}

/**
 * Shows a recovery code once, with copy/download helpers.
 * @param {string} code
 * @param {{ required?: boolean }} [opts]
 */
export function showRecoveryCode(code, opts = {}) {
  const grouped = groupCode(code);
  const confirm = h('input', { type: 'checkbox', id: 'rc-saved' });
  const cont = h('button', { type: 'button', class: 'btn btn--primary btn--full', text: t('common.continue'), disabled: Boolean(opts.required) });
  confirm.addEventListener('change', () => (cont.disabled = !confirm.checked));
  const content = h(
    'div',
    { class: 'stack' },
    h('p', { text: t('recovery.explain') }),
    h('div', { class: 'recovery-code', 'aria-label': t('recovery.codeLabel') }, h('code', { text: grouped })),
    h(
      'div',
      { class: 'btn-row' },
      button({
        label: t('common.copy'),
        icon: 'copy',
        variant: 'soft',
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(grouped);
            toast(t('common.copied'), { type: 'success' });
          } catch {
            toast(t('common.copyFailed'), { type: 'error' });
          }
        },
      }),
      button({
        label: t('common.download'),
        icon: 'download',
        variant: 'soft',
        onClick: () => downloadBlob(new Blob([`${t('recovery.fileHeader')}\n\n${grouped}\n`], { type: 'text/plain' }), 'menstruapp-codigo-recuperacion.txt'),
      }),
    ),
    h('p', { class: 'muted small' }, icon('info', { size: 14 }), ' ', t('recovery.warning')),
    opts.required ? h('label', { class: 'check', for: 'rc-saved' }, confirm, h('span', { text: t('recovery.saved') })) : null,
    cont,
  );
  const modal = openModal({ title: t('recovery.title'), variant: 'dialog', content, dismissible: !opts.required });
  cont.addEventListener('click', () => modal.close());
  return modal.closed;
}
