// Session-level security of the app service layer (the parts that need IndexedDB and a session):
// throttling that parallel guesses cannot bypass, an atomic recovery, work that outlives its
// session, device-only security settings, and what sync and share links carry.
import { describe, it, expect, beforeAll } from 'vitest';

// Minimal browser surface used by app.js and the modules it loads.
const noop = () => {};
Object.assign(globalThis, {
  window: globalThis,
  addEventListener: noop,
  removeEventListener: noop,
  document: { hidden: false, title: '', addEventListener: noop, removeEventListener: noop, documentElement: { dataset: {} } },
  history: { replaceState: noop, pushState: noop, back: noop },
  location: { pathname: '/', hostname: 'localhost', origin: 'https://menstruapp.test' },
});

const app = await import('../../public/js/app.js');
const {
  store,
  createProfile,
  unlock,
  beginRecovery,
  lock,
  lockoutStatus,
  saveDoc,
  saveDay,
  updateSettings,
  localRecords,
  applyRemoteRecords,
  sessionGuard,
  SessionChangedError,
  daysAgo,
} = app;
const { MAX_ATTEMPTS } = await import('../../public/js/security/lockout.js');
const { mergeRecords } = await import('../../public/js/pwa/sync.js');
const { buildShareSnapshot } = await import('../../public/js/pwa/share.js');

const PIN = '482719';
/** @type {{ profileId: string, recoveryCode: string }} */
let profile;

beforeAll(async () => {
  await app.initApp();
  const created = await createProfile({ name: 'Prueba', lock: { method: 'pin', secret: PIN }, settings: { mode: 'track' } });
  profile = { profileId: created.profileId, recoveryCode: /** @type {string} */ (created.recoveryCode) };
});

describe('throttling', () => {
  it('counts every wrong PIN even when attempts race in parallel', async () => {
    lock();
    const results = await Promise.allSettled(Array.from({ length: MAX_ATTEMPTS + 3 }, () => unlock(profile.profileId, { type: 'pin', secret: '000000' })));
    const wrong = results.filter((r) => r.status === 'rejected' && /** @type {any} */ (r.reason).name === 'WrongSecretError').length;
    const throttled = results.filter((r) => r.status === 'rejected' && /** @type {any} */ (r.reason).throttled).length;
    expect(wrong).toBe(MAX_ATTEMPTS);
    expect(throttled).toBe(3);
    expect((await lockoutStatus(profile.profileId)).locked).toBe(true);
    // While the PIN is locked out, even the right PIN waits…
    await expect(unlock(profile.profileId, { type: 'pin', secret: PIN })).rejects.toMatchObject({ throttled: true });
  });

  it('keeps the recovery code usable during a PIN lockout (it cannot be guessed)', async () => {
    expect((await lockoutStatus(profile.profileId)).locked).toBe(true);
    const recovery = await beginRecovery(profile.profileId, profile.recoveryCode);
    recovery.cancel();
  });
});

describe('recovery', () => {
  it('changes nothing until the new lock is saved, then retires the used code', async () => {
    // Abandoned half-way (app closed, auto-lock): the old code still works.
    (await beginRecovery(profile.profileId, profile.recoveryCode)).cancel();
    expect(store.get().session).toBeNull();

    const recovery = await beginRecovery(profile.profileId, profile.recoveryCode);
    const { recoveryCode } = await recovery.saveNewLock({ method: 'pin', secret: '135792' });
    expect(recoveryCode).toMatch(/[0-9A-Z]/);
    await recovery.open();
    expect(store.get().session?.profileId).toBe(profile.profileId);
    expect((await lockoutStatus(profile.profileId)).locked).toBe(false);

    lock();
    await expect(beginRecovery(profile.profileId, profile.recoveryCode)).rejects.toMatchObject({ name: 'WrongSecretError' });
    (await beginRecovery(profile.profileId, /** @type {string} */ (recoveryCode))).cancel();
    await unlock(profile.profileId, { type: 'pin', secret: '135792' });
    profile.recoveryCode = /** @type {string} */ (recoveryCode);
  });
});

describe('work that outlives its session', () => {
  it('does not bring decrypted data back into memory after locking', async () => {
    const saving = saveDoc('profile', { name: 'Otra', createdAt: Date.now() });
    lock();
    await saving;
    expect(store.get().data).toBeNull();
    expect(store.get().derived).toBeNull();
  });

  it('refuses to apply records fetched for a session that is gone', async () => {
    await unlock(profile.profileId, { type: 'pin', secret: '135792' });
    const guard = sessionGuard();
    lock();
    await unlock(profile.profileId, { type: 'pin', secret: '135792' });
    const day = { kind: /** @type {const} */ ('day'), key: '2024-01-02', value: { flow: 'light' }, updatedAt: Date.now() };
    await expect(applyRemoteRecords([day], guard)).rejects.toBeInstanceOf(SessionChangedError);
    expect(store.get().data?.days['2024-01-02']).toBeUndefined();
  });
});

describe('sync', () => {
  it('never exports or imports the security settings of a device', async () => {
    await updateSettings({ security: { ...store.get().derived?.settings.security, autoLockMinutes: 1, lockOnHide: true } });
    const settings = localRecords().find((r) => r.kind === 'doc' && r.key === 'settings');
    expect(settings?.value).toBeDefined();
    expect(settings?.value).not.toHaveProperty('security');
    // A linked device (or an attacker) tries to switch this device's auto-lock off.
    const remote = { ...settings?.value, security: { autoLockMinutes: 0, lockOnHide: false } };
    await applyRemoteRecords([{ kind: 'doc', key: 'settings', value: remote, updatedAt: Date.now() + 1000 }]);
    expect(store.get().derived?.settings.security).toMatchObject({ autoLockMinutes: 1, lockOnHide: true });
  });

  it('treats remote timestamps from the future as "now"', () => {
    const now = 1_700_000_000_000;
    const remote = [{ kind: 'day', key: '2024-03-01', value: { flow: 'heavy' }, updatedAt: now + 365 * 86_400_000 }];
    const local = [{ kind: 'day', key: '2024-03-02', value: { flow: 'light' }, updatedAt: now - 1000 }];
    const { toApplyLocally, merged, remoteNeedsUpdate } = mergeRecords(local, remote, now);
    expect(toApplyLocally[0].updatedAt).toBe(now);
    expect(merged.find((r) => r.key === '2024-03-01')?.updatedAt).toBe(now);
    expect(remoteNeedsUpdate).toBe(true);
    // A later local edit wins again.
    const edit = [{ kind: 'day', key: '2024-03-01', value: { flow: 'light' }, updatedAt: now + 5000 }];
    expect(mergeRecords(edit, merged, now + 6000).toApplyLocally.map((r) => r.key)).not.toContain('2024-03-01');
  });
});

describe('share links', () => {
  it('carry only what the shared page shows for the chosen scopes', () => {
    const snap = buildShareSnapshot(['predictions', 'cycles', 'symptoms'], { includeName: false });
    expect(Object.keys(snap).every((k) => ['v', 'createdAt', 'lang', 'predictions', 'cycles', 'stats', 'symptoms'].includes(k))).toBe(true);
    expect(snap).not.toHaveProperty('mode');
    expect(snap).not.toHaveProperty('moods');
    expect(snap).not.toHaveProperty('name');
    const minimal = buildShareSnapshot(['cycles'], { includeName: true });
    expect(minimal).not.toHaveProperty('symptoms');
    expect(minimal).not.toHaveProperty('notes');
    expect(minimal.name).toBe('Otra');
  });
});

describe('what the app tells the cycle engine', () => {
  it('flags any bleeding after the user said a year had passed without periods', async () => {
    await updateSettings({ mode: 'perimenopause', menopause: { overAYear: true } });
    expect(store.get().derived?.notices.some((n) => n.id === 'postmenopausalBleeding')).toBe(false);
    await saveDay(daysAgo(1), { flow: 'spotting' });
    expect(store.get().derived?.notices.some((n) => n.id === 'postmenopausalBleeding')).toBe(true);
    await saveDay(daysAgo(1), {});
  });

  it('does not take lochia after a birth for a period', async () => {
    await updateSettings({ mode: 'postpartum', postpartum: { birthDate: daysAgo(10), breastfeeding: 'partial', periodReturned: true } });
    for (let i = 9; i >= 5; i--) await saveDay(daysAgo(i), { flow: 'heavy' });
    expect(store.get().derived?.analysis.periods).toEqual([]);
    for (let i = 9; i >= 5; i--) await saveDay(daysAgo(i), {});
    await updateSettings({ mode: 'track' });
  });
});

describe('reminder texts', () => {
  it('say when a titled reminder falls, and nothing of it in discreet mode', async () => {
    const { renderText } = await import('../../public/js/pwa/notifications.js');
    const at = (/** @type {string} */ shownOn, /** @type {string} */ title) => ({
      key: 'k',
      reminderId: 'r',
      type: 'appointment',
      at: 0,
      date: shownOn,
      params: { title, date: '2026-03-02' },
    });
    expect(renderText(at('2026-03-02', 'Dentista'), false).body).toBe('Dentista · hoy');
    expect(renderText(at('2026-03-01', 'Dentista'), false).body).toBe('Dentista · mañana');
    expect(renderText(at('2026-02-26', 'Dentista'), false).body).toBe('Dentista · el 2 de marzo');
    expect(renderText(at('2026-02-26', ''), false).body).toBe('Tienes una cita el 2 de marzo.');
    expect(JSON.stringify(renderText(at('2026-03-02', 'Dentista'), true))).not.toContain('Dentista');
  });

  it('bring the tip of the day for the topic of that day', async () => {
    const { renderText } = await import('../../public/js/pwa/notifications.js');
    const { raw } = await import('../../public/js/core/i18n.js');
    const tip = (/** @type {string} */ topic, /** @type {boolean} */ discreet) =>
      renderText({ key: 'k', reminderId: 'daily_tip', type: 'daily_tip', at: 0, date: '2026-03-02', params: { topic } }, discreet);
    expect(raw('tips.menstrual')).toContain(tip('menstrual', false).body);
    expect(raw('tips.pregnancy')).toContain(tip('pregnancy', false).body);
    expect(tip('menstrual', false).title).toBe('Consejo del día 🌙');
    expect(tip('menstrual', true).body).not.toBe(tip('menstrual', false).body);
  });
});
