import { h } from '../../core/dom.js';
import { t, fmtDate, fmtTime } from '../../core/i18n.js';
import { todayISO, isISODate, isTime, localTimestamp } from '../../core/dates.js';
import { uid } from '../../core/store.js';
import { icon } from '../../ui/icons.js';
import { button, card, toggle, notice, iconButton, chipGroup } from '../../ui/components.js';
import { toast } from '../../ui/toast.js';
import { openModal } from '../../ui/modal.js';
import { saveReminders } from '../../app.js';
import { defaultReminders } from '../../domain/reminders.js';
import { notificationStatus, requestNotificationPermission, testNotification, deliveryInfo } from '../../pwa/notifications.js';

/** @param {import('../shell.js').ViewContext} ctx */
export async function render(ctx) {
  const saved = /** @type {import('../../domain/reminders.js').Reminder[]} */ (ctx.state.data?.docs.reminders?.items ?? []);
  // Reminders of the current mode that this profile has never saved (e.g. added in an update) show up switched off.
  const items = [...saved, ...defaultReminders(ctx.state.derived?.settings.mode ?? 'track').filter((d) => !saved.some((r) => r.id === d.id))];
  const status = notificationStatus();
  const delivery = await deliveryInfo();
  const update = async (/** @type {string} */ id, /** @type {Record<string, any>} */ patch) => {
    await saveReminders(items.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const standard = items.filter((r) => !['custom', 'appointment', 'checkup'].includes(r.type));
  const dated = items.filter((r) => ['custom', 'appointment', 'checkup'].includes(r.type));

  return h(
    'div',
    { class: 'stack' },
    status === 'denied'
      ? notice({ level: 'consult', title: t('settings.reminders.deniedTitle'), text: t('settings.reminders.deniedText') })
      : status === 'default'
        ? notice({
            level: 'info',
            title: t('settings.reminders.permissionTitle'),
            text: t('settings.reminders.permissionText'),
            action: button({
              label: t('settings.reminders.allow'),
              variant: 'primary',
              size: 'sm',
              onClick: async () => {
                await requestNotificationPermission();
                ctx.navigate('settings/reminders', { replace: true });
              },
            }),
          })
        : status === 'unsupported'
          ? notice({ level: 'info', title: t('settings.reminders.unsupportedTitle'), text: t('settings.reminders.unsupportedText') })
          : null,
    card({
      title: t('settings.reminders.delivery'),
      icon: 'bell',
      children: [
        h('p', { class: 'muted', text: t(`settings.reminders.deliveryModes.${delivery.mode}`) }),
        delivery.canEnablePush
          ? button({
              label: t('settings.reminders.enablePush'),
              icon: 'cloud',
              variant: 'soft',
              onClick: () => import('../../pwa/push.js').then((m) => m.enablePush()).then(() => ctx.navigate('settings/reminders', { replace: true })),
            })
          : null,
        delivery.pushEnabled
          ? button({
              label: t('settings.reminders.disablePush'),
              variant: 'ghost',
              size: 'sm',
              onClick: () => import('../../pwa/push.js').then((m) => m.disablePush()).then(() => ctx.navigate('settings/reminders', { replace: true })),
            })
          : null,
        status === 'granted' ? button({ label: t('settings.reminders.test'), icon: 'bell', variant: 'ghost', size: 'sm', onClick: () => testNotification() }) : null,
      ],
    }),
    card({
      title: t('settings.reminders.list'),
      icon: 'alarm-clock',
      children: standard.map((r) =>
        h(
          'div',
          { class: 'reminder-row' },
          toggle({
            label: t(`reminders.types.${r.type}.title`),
            description: t(`reminders.types.${r.type}.desc`),
            checked: r.enabled,
            onChange: (v) => update(r.id, { enabled: v }),
          }),
          h(
            'div',
            { class: 'reminder-row__opts' },
            h('label', { class: 'sr-only', for: `rt-${r.id}`, text: t('settings.reminders.timeFor', { name: t(`reminders.types.${r.type}.title`) }) }),
            h('input', {
              type: 'time',
              class: 'input input--short',
              id: `rt-${r.id}`,
              dataset: { fk: `rt-${r.id}` },
              value: r.time,
              onChange: (/** @type {Event} */ e) => {
                const v = /** @type {HTMLInputElement} */ (e.target).value;
                if (isTime(v)) update(r.id, { time: v });
              },
            }),
            r.type === 'period_soon' || r.type === 'period_late' || r.type === 'injection'
              ? h(
                  'label',
                  { class: 'inline-field' },
                  h('span', { text: t(r.type === 'period_late' ? 'settings.reminders.daysAfter' : 'settings.reminders.daysBefore') }),
                  h('input', {
                    type: 'number',
                    class: 'input input--tiny',
                    dataset: { fk: `rd-${r.id}` },
                    'aria-label': t('settings.reminders.daysFor', { name: t(`reminders.types.${r.type}.title`) }),
                    min: r.type === 'period_late' ? 1 : 0,
                    max: 14,
                    value: r.daysBefore ?? 2,
                    onChange: (/** @type {Event} */ e) => {
                      const n = Number(/** @type {HTMLInputElement} */ (e.target).value);
                      if (Number.isInteger(n) && n >= 0 && n <= 14) update(r.id, { daysBefore: n });
                    },
                  }),
                )
              : null,
          ),
        ),
      ),
    }),
    card({
      title: t('settings.reminders.custom'),
      icon: 'calendar-plus',
      children: [
        dated.length
          ? h(
              'ul',
              { class: 'dated-list' },
              dated.map((r) =>
                h(
                  'li',
                  null,
                  icon(r.type === 'appointment' ? 'stethoscope' : 'bell', { size: 18 }),
                  h(
                    'span',
                    { class: 'dated-list__text' },
                    h('strong', { text: r.title || t(`reminders.types.${r.type}.title`) }),
                    h('span', {
                      class: 'muted small',
                      text: `${r.date ? fmtDate(r.date, 'medium') : t('settings.reminders.every')} · ${fmtTime(localTimestamp(todayISO(), r.time))} · ${t(`settings.reminders.repeat.${r.repeat ?? 'none'}`)}`,
                    }),
                  ),
                  // Each row's controls say which reminder they act on.
                  toggle({
                    label: t('common.enabled'),
                    ariaLabel: t('settings.reminders.enableNamed', { title: r.title || t(`reminders.types.${r.type}.title`) }),
                    fk: `rc-on-${r.id}`,
                    checked: r.enabled,
                    onChange: (v) => update(r.id, { enabled: v }),
                  }),
                  iconButton({
                    icon: 'delete',
                    label: t('settings.reminders.deleteNamed', { title: r.title || t(`reminders.types.${r.type}.title`) }),
                    onClick: async () => {
                      await saveReminders(items.filter((x) => x.id !== r.id));
                      toast(t('settings.reminders.deleted'), {
                        action: { label: t('common.undo'), onClick: () => saveReminders([...(ctx.state.data?.docs.reminders?.items ?? []).filter((x) => x.id !== r.id), r]) },
                      });
                    },
                  }),
                ),
              ),
            )
          : h('p', { class: 'muted', text: t('settings.reminders.noCustom') }),
        button({ label: t('settings.reminders.add'), icon: 'plus', variant: 'soft', onClick: () => addDialog(items) }),
      ],
    }),
    h('p', { class: 'muted small', text: t('settings.reminders.privacyNote') }),
  );
}

/** @param {import('../../domain/reminders.js').Reminder[]} items */
function addDialog(items) {
  let type = 'appointment';
  let repeat = 'none';
  const titleInput = h('input', { class: 'input', id: 'rem-title', maxLength: 80, placeholder: t('settings.reminders.titlePlaceholder') });
  const dateInput = h('input', { class: 'input', id: 'rem-date', type: 'date', min: todayISO(), value: todayISO() });
  const timeInput = h('input', { class: 'input input--short', id: 'rem-time', type: 'time', value: '09:00' });
  const leadInput = h('input', { class: 'input input--tiny', id: 'rem-lead', type: 'number', min: 0, max: 14, value: 0 });
  const content = h(
    'form',
    {
      class: 'stack',
      onSubmit: async (/** @type {SubmitEvent} */ e) => {
        e.preventDefault();
        const date = dateInput.value;
        if (!isISODate(date) || !isTime(timeInput.value)) return toast(t('settings.reminders.invalid'), { type: 'error' });
        const lead = Math.min(14, Math.max(0, Number(leadInput.value) || 0));
        await saveReminders([
          ...items,
          {
            id: uid().slice(0, 16),
            type: /** @type {any} */ (type),
            enabled: true,
            title: titleInput.value.trim() || undefined,
            date,
            time: timeInput.value,
            daysBefore: lead,
            repeat: /** @type {any} */ (repeat),
          },
        ]);
        modal.close();
        toast(t('settings.reminders.added'), { type: 'success' });
      },
    },
    chipGroup({
      label: t('settings.reminders.kind'),
      options: [
        { value: 'appointment', label: t('reminders.types.appointment.title') },
        { value: 'checkup', label: t('reminders.types.checkup.title') },
        { value: 'custom', label: t('reminders.types.custom.title') },
      ],
      value: type,
      allowNone: false,
      onChange: (v) => (type = v),
    }),
    h('label', { class: 'field__label', for: 'rem-title', text: t('settings.reminders.titleLabel') }),
    titleInput,
    h('label', { class: 'field__label', for: 'rem-date', text: t('settings.reminders.date') }),
    dateInput,
    h('label', { class: 'field__label', for: 'rem-time', text: t('settings.reminders.time') }),
    timeInput,
    h('label', { class: 'field__label', for: 'rem-lead', text: t('settings.reminders.leadDays') }),
    leadInput,
    chipGroup({
      label: t('settings.reminders.repeatLabel'),
      options: ['none', 'weekly', 'monthly', 'yearly'].map((v) => ({ value: v, label: t(`settings.reminders.repeat.${v}`) })),
      value: repeat,
      allowNone: false,
      onChange: (v) => (repeat = v),
    }),
    button({ label: t('common.add'), variant: 'primary', type: 'submit', full: true }),
  );
  const modal = openModal({ title: t('settings.reminders.add'), content, variant: 'dialog' });
}
