import { h } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { avatar, button, card, listItem } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { confirmDialog } from '../../ui/modal.js';
import { updateProfile, lock, bus, deleteCurrentProfile } from '../../app.js';
import { prepareAvatar } from '../../ui/theme.js';
import { confirmIdentity, deleteServerData } from '../security-flows.js';

const AVATARS = ['🌙', '🌸', '🌷', '🌺', '🌼', '🦋', '🌿', '✨', '💜', '🌊', '🍓', '🐱'];

/** @param {import('../shell.js').ViewContext} ctx */
export function render(ctx) {
  const profile = ctx.state.derived?.profile ?? {};
  const nameInput = h('input', { class: 'input', id: 'p-name', maxLength: 40, value: profile.name ?? '', autocomplete: 'nickname' });
  const yearInput = h('input', { class: 'input input--short', id: 'p-year', type: 'number', inputMode: 'numeric', min: 1930, max: new Date().getFullYear() - 8, value: profile.birthYear ?? '' });
  const fileInput = h('input', {
    type: 'file',
    accept: 'image/*',
    class: 'sr-only',
    id: 'p-photo',
    onChange: async (/** @type {Event} */ e) => {
      const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
      if (!file) return;
      try {
        const photo = await prepareAvatar(file);
        await updateProfile({ photo });
        toast(t('settings.profile.photoSaved'), { type: 'success' });
      } catch {
        toast(t('settings.profile.photoError'), { type: 'error' });
      }
    },
  });
  const profiles = ctx.state.profiles;
  return h(
    'div',
    { class: 'stack' },
    card({
      children: [
        h('div', { class: 'profile-edit' }, avatar({ name: profile.name, avatar: profile.avatar, photo: profile.photo }, 72), h('div', { class: 'btn-row' }, h('label', { class: 'btn btn--soft btn--sm', for: 'p-photo', text: t('settings.profile.uploadPhoto') }), fileInput, profile.photo ? button({ label: t('settings.profile.removePhoto'), variant: 'ghost', size: 'sm', onClick: () => updateProfile({ photo: null }) }) : null)),
        h('span', { class: 'field__label', id: 'emoji-label', text: t('onboarding.avatar') }),
        h(
          'div',
          { class: 'avatar-picker', role: 'group', 'aria-labelledby': 'emoji-label' },
          AVATARS.map((a) => h('button', { type: 'button', class: ['avatar-option', profile.avatar === a ? 'is-on' : ''], 'aria-pressed': String(profile.avatar === a), 'aria-label': a, text: a, onClick: () => updateProfile({ avatar: a }) })),
        ),
        h(
          'form',
          {
            class: 'stack',
            onSubmit: async (/** @type {SubmitEvent} */ e) => {
              e.preventDefault();
              const year = Number(yearInput.value);
              const birthYear = yearInput.value && Number.isInteger(year) && year >= 1930 && year <= new Date().getFullYear() - 8 ? year : null;
              if (yearInput.value && birthYear === null) return toast(t('settings.profile.yearInvalid'), { type: 'error' });
              await updateProfile({ name: nameInput.value.trim() || undefined, birthYear });
              toast(t('common.savedShort'), { type: 'success' });
            },
          },
          h('label', { class: 'field__label', for: 'p-name', text: t('onboarding.name') }),
          nameInput,
          h('label', { class: 'field__label', for: 'p-year', text: t('onboarding.birthYear') }),
          yearInput,
          h('p', { class: 'field__hint', text: t('onboarding.birthYearHint') }),
          button({ label: t('common.save'), variant: 'primary', type: 'submit' }),
        ),
      ],
    }),
    card({
      title: t('settings.profile.profiles'),
      icon: 'users',
      children: [
        h('p', { class: 'muted small', text: t('settings.profile.profilesText', { count: profiles.length }) }),
        h(
          'div',
          { class: 'list' },
          profiles.length > 1 ? listItem({ icon: 'users', title: t('settings.profile.switch'), onClick: () => lock('switch') }) : null,
          listItem({ icon: 'user-plus', title: t('settings.profile.add'), subtitle: t('settings.profile.addDesc'), onClick: async () => {
            const ok = await confirmDialog({ title: t('settings.profile.add'), message: t('settings.profile.addConfirm'), confirmLabel: t('common.continue') });
            if (!ok) return;
            lock('switch');
            bus.emit('add-profile');
          } }),
          listItem({
            icon: 'delete',
            title: t('settings.profile.delete'),
            subtitle: t('settings.profile.deleteDesc'),
            danger: true,
            onClick: async () => {
              const ok = await confirmDialog({ title: t('settings.profile.delete'), message: t('settings.profile.deleteConfirm'), confirmLabel: t('common.delete'), danger: true });
              if (!ok) return;
              if (!(await confirmIdentity(t('settings.profile.deleteReauth')))) return;
              // First the profile's server data (the keys to delete it disappear with the profile).
              if (!(await deleteServerData('profile'))) return;
              const remaining = await deleteCurrentProfile();
              toast(t('settings.profile.deleted'));
              if (!remaining) bus.emit('add-profile');
            },
          }),
        ),
      ],
    }),
  );
}
