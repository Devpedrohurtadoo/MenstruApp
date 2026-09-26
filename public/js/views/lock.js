// Lock screen: profile picker, PIN pad / passphrase, biometrics, throttling and recovery.

import { h, replace } from '../core/dom.js';
import { t, fmtNumber } from '../core/i18n.js';
import { icon } from '../ui/icons.js';
import { avatar, button } from '../ui/components.js';
import { confirmDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { store, unlock, beginRecovery, getVault, lockoutStatus, wipeLockedProfile } from '../app.js';
import { describeVault } from '../security/vault.js';
import { brandMark } from './brand.js';

/**
 * @param {HTMLElement} root
 * @param {{ onReset: () => void }} opts
 */
export async function renderLock(root, opts) {
  const { profiles, prefs } = store.get();
  if (!profiles.length) return opts.onReset();
  let profileId = profiles.some((p) => p.id === prefs.lastProfileId) ? /** @type {string} */ (prefs.lastProfileId) : profiles[0].id;
  let pin = '';
  let busy = false;
  let recoveryMode = false;
  /** Last error shown under the keypad/form (kept across re-renders). */
  let errorMessage = '';
  /** @type {ReturnType<typeof setInterval> | undefined} */
  let countdown;
  /** @type {ReturnType<typeof describeVault>} */
  let info;

  const screen = h('main', { class: 'screen lock' });
  replace(root, screen);

  const load = async () => {
    const vault = await getVault(profileId);
    if (!vault) {
      await wipeLockedProfile(profileId);
      return renderLock(root, opts);
    }
    info = describeVault(vault);
    pin = '';
    render();
  };

  const tryUnlock = async (/** @type {any} */ attempt) => {
    if (busy) return;
    busy = true;
    render();
    try {
      if (attempt.type === 'recovery') {
        // The profile opens only after a new lock is saved and the used code replaced.
        const recovery = await beginRecovery(profileId, attempt.secret);
        clearInterval(countdown);
        const { chooseNewLock } = await import('./security-flows.js');
        if (await chooseNewLock(null, { forced: true, apply: (next) => recovery.saveNewLock(next) })) await recovery.open();
        else recovery.cancel();
        return;
      }
      await unlock(profileId, attempt);
      clearInterval(countdown);
    } catch (/** @type {any} */ err) {
      busy = false;
      pin = '';
      if (err?.throttled) {
        render();
        return;
      }
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
        render();
        return;
      }
      const status = err?.status;
      const msg =
        err?.name === 'WrongSecretError'
          ? status?.locked
            ? t('lock.tooManyAttempts')
            : t(attempt.type === 'recovery' ? 'lock.wrongRecovery' : attempt.type === 'passphrase' ? 'lock.wrongPassphrase' : 'lock.wrongPin', { count: status?.attemptsLeft ?? 0 })
          : attempt.type === 'webauthn'
            ? t('lock.biometricFailed')
            : t('lock.unlockError');
      errorMessage = msg;
      await render(); // the error is a role="alert": announced once, no extra announcement
      screen.querySelector('.lock__dots')?.classList.add('shake');
    }
  };

  const onKey = (/** @type {KeyboardEvent} */ e) => {
    if (recoveryMode || !info || info.primary !== 'pin' || busy) return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') press('back');
  };
  document.addEventListener('keydown', onKey);
  const observer = new MutationObserver(() => {
    if (!document.contains(screen)) {
      document.removeEventListener('keydown', onKey);
      clearInterval(countdown);
      observer.disconnect();
    }
  });
  observer.observe(root, { childList: true });

  const press = (/** @type {string} */ key) => {
    if (busy) return;
    if (key === 'back') pin = pin.slice(0, -1);
    else if (pin.length < (info.pinDigits ?? 8)) pin += key;
    if (errorMessage && pin.length) {
      // A new attempt starts: clear the previous error.
      errorMessage = '';
      const el = screen.querySelector('.lock__error');
      if (el) el.textContent = '';
    }
    renderDots();
    if (pin.length === info.pinDigits) tryUnlock({ type: 'pin', secret: pin });
  };

  const dots = h('div', { class: 'lock__dots', 'aria-hidden': 'true' });
  const renderDots = () => {
    dots.classList.remove('shake');
    replace(
      dots,
      Array.from({ length: info.pinDigits ?? 6 }, (_, i) => h('span', { class: ['lock__dot', i < pin.length ? 'is-filled' : ''] })),
    );
    const live = screen.querySelector('.lock__pin-status');
    if (live) live.textContent = t('lock.digitsEntered', { count: pin.length, total: info.pinDigits ?? 6 });
  };

  const render = async () => {
    const status = await lockoutStatus(profileId);
    const profile = profiles.find((p) => p.id === profileId);
    const hideNames = store.get().prefs.hideProfileNames;
    clearInterval(countdown);
    const errorEl = h('p', { class: 'lock__error', role: 'alert', text: errorMessage });
    // The countdown is updated every second, so it must not be a live region (it would be read
    // out every second); the alert above says once how long to wait.
    const countdownEl = h('p', { class: 'lock__countdown muted small' });
    if (status.locked) {
      if (!errorMessage) errorEl.textContent = t('lock.waitSeconds', { count: Math.ceil(status.remainingMs / 1000) });
      const update = async () => {
        const s = await lockoutStatus(profileId);
        if (!s.locked) {
          clearInterval(countdown);
          errorMessage = '';
          render();
          return;
        }
        countdownEl.textContent = t('lock.countdown', { count: Math.ceil(s.remainingMs / 1000) });
      };
      update();
      countdown = setInterval(update, 1000);
    }

    const picker =
      profiles.length > 1
        ? h(
            'div',
            { class: 'lock__profiles', role: 'group', 'aria-label': t('lock.chooseProfile') },
            profiles.map((p, i) =>
              h(
                'button',
                {
                  type: 'button',
                  class: ['lock__profile', p.id === profileId ? 'is-active' : ''],
                  'aria-pressed': String(p.id === profileId),
                  'aria-label': hideNames || !p.label ? t('lock.profileN', { n: i + 1 }) : p.label,
                  onClick: () => {
                    profileId = p.id;
                    recoveryMode = false;
                    load();
                  },
                },
                avatar({ avatar: p.avatar, color: p.color }, 48),
                !hideNames && p.label ? h('span', { class: 'lock__profile-name', text: p.label }) : null,
              ),
            ),
          )
        : null;

    const greeting = h('h1', { class: 'lock__title', text: !hideNames && profile?.label ? t('lock.hello', { name: profile.label }) : t('lock.welcomeBack') });

    /** @type {Array<Node | null>} */
    let body;
    if (recoveryMode) {
      const input = h('input', { class: 'input input--code', id: 'recovery-input', autocomplete: 'off', autocapitalize: 'characters', spellcheck: false, maxLength: 64 });
      body = [
        h('p', { class: 'lock__subtitle', text: t('lock.recoveryPrompt') }),
        h(
          'form',
          {
            class: 'stack lock__form',
            onSubmit: (/** @type {SubmitEvent} */ e) => {
              e.preventDefault();
              if (input.value.trim()) tryUnlock({ type: 'recovery', secret: input.value });
            },
          },
          h('label', { class: 'field__label', for: 'recovery-input', text: t('lock.recoveryCode') }),
          input,
          // The recovery code cannot be guessed, so it stays usable while the PIN is locked out.
          button({ label: busy ? t('lock.checking') : t('lock.unlock'), variant: 'primary', type: 'submit', full: true, busy }),
        ),
        errorEl,
        countdownEl,
        h(
          'div',
          { class: 'lock__links' },
          h('button', {
            type: 'button',
            class: 'link-btn',
            text: t('lock.backToPin'),
            onClick: () => {
              recoveryMode = false;
              errorMessage = '';
              render();
            },
          }),
          h('button', { type: 'button', class: 'link-btn link-btn--danger', text: t('lock.noRecovery'), onClick: resetProfile }),
        ),
      ];
    } else if (!info.needsSecret) {
      body = [
        h('p', { class: 'lock__subtitle', text: t('lock.noLockProfile') }),
        button({ label: t('lock.enter'), variant: 'primary', full: true, busy, onClick: () => tryUnlock({ type: 'device' }) }),
        errorEl,
        countdownEl,
      ];
    } else if (info.primary === 'pin') {
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', info.hasBiometric ? 'bio' : '', '0', 'back'];
      body = [
        h('p', { class: 'lock__subtitle', text: busy ? t('lock.checking') : t('lock.enterPin') }),
        dots,
        h('p', { class: 'sr-only lock__pin-status', 'aria-live': 'polite' }),
        errorEl,
        countdownEl,
        h(
          'div',
          { class: ['keypad', status.locked || busy ? 'is-disabled' : ''], role: 'group', 'aria-label': t('lock.keypad') },
          keys.map((k) => {
            if (!k) return h('span', { class: 'keypad__blank' });
            if (k === 'back')
              return h(
                'button',
                { type: 'button', class: 'keypad__key keypad__key--action', 'aria-label': t('lock.deleteDigit'), disabled: status.locked || busy, onClick: () => press('back') },
                icon('arrow-left', { size: 22 }),
              );
            if (k === 'bio')
              return h(
                'button',
                { type: 'button', class: 'keypad__key keypad__key--action', 'aria-label': t('lock.useBiometric'), disabled: busy, onClick: () => tryUnlock({ type: 'webauthn' }) },
                icon('fingerprint', { size: 24 }),
              );
            return h('button', { type: 'button', class: 'keypad__key', disabled: status.locked || busy, onClick: () => press(k), text: fmtNumber(Number(k)) });
          }),
        ),
        h(
          'div',
          { class: 'lock__links' },
          h('button', {
            type: 'button',
            class: 'link-btn',
            text: t('lock.forgotPin'),
            onClick: () => {
              recoveryMode = true;
              errorMessage = '';
              render();
            },
          }),
        ),
      ];
    } else {
      const input = h('input', { type: 'password', class: 'input', id: 'pass-input', autocomplete: 'current-password', maxLength: 256 });
      body = [
        h('p', { class: 'lock__subtitle', text: t('lock.enterPassphrase') }),
        h(
          'form',
          {
            class: 'stack lock__form',
            onSubmit: (/** @type {SubmitEvent} */ e) => {
              e.preventDefault();
              if (input.value) tryUnlock({ type: 'passphrase', secret: input.value });
            },
          },
          h('label', { class: 'field__label sr-only', for: 'pass-input', text: t('lock.passphrase') }),
          input,
          button({ label: busy ? t('lock.checking') : t('lock.unlock'), variant: 'primary', type: 'submit', full: true, busy, disabled: status.locked }),
        ),
        info.hasBiometric
          ? button({ label: t('lock.useBiometric'), icon: 'fingerprint', variant: 'ghost', full: true, disabled: busy, onClick: () => tryUnlock({ type: 'webauthn' }) })
          : null,
        errorEl,
        countdownEl,
        h(
          'div',
          { class: 'lock__links' },
          h('button', {
            type: 'button',
            class: 'link-btn',
            text: t('lock.forgotPassphrase'),
            onClick: () => {
              recoveryMode = true;
              errorMessage = '';
              render();
            },
          }),
        ),
      ];
    }

    replace(screen, h('div', { class: 'lock__inner' }, brandMark(), picker, avatar({ avatar: profile?.avatar, color: profile?.color }, 64), greeting, ...body));
    if (info.primary === 'pin' && !recoveryMode) renderDots();
    /** @type {HTMLElement | null} */ (screen.querySelector('#recovery-input, #pass-input'))?.focus();
  };

  const resetProfile = async () => {
    const ok = await confirmDialog({ title: t('lock.resetTitle'), message: t('lock.resetMessage'), confirmLabel: t('lock.resetConfirm'), danger: true });
    if (!ok) return;
    const remaining = await wipeLockedProfile(profileId);
    toast(t('lock.resetDone'));
    if (!remaining) opts.onReset();
    else renderLock(root, opts);
  };

  await load();
}
