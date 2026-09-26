import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase, deleteDatabase, getAll } from '../../public/js/data/idb.js';
import { ProfileRepo } from '../../public/js/data/repo.js';
import { deriveProfileKeys } from '../../public/js/security/vault.js';
import { randomBytes } from '../../public/js/security/crypto.js';
import { readLegacyData, hasLegacyData, clearLegacyData } from '../../public/js/data/legacy.js';
import { backupBlob, encryptedBackupBlob, readBackup, BackupError, daysToCSV, csvToDays } from '../../public/js/data/backup.js';
import { toCSV, parseCSV } from '../../public/js/lib/csv.js';
import { importCSV, importAppleHealth, parseFlexibleDate } from '../../public/js/data/importers.js';

let dbName = 0;
async function freshRepo() {
  const db = await openDatabase(`test-${++dbName}`);
  const keys = await deriveProfileKeys(randomBytes(32));
  return { db, repo: new ProfileRepo(db, 'profile-a', keys), keys };
}

describe('encrypted repository', () => {
  it('stores days and documents encrypted with opaque ids', async () => {
    const { db, repo } = await freshRepo();
    await repo.saveDay('2024-03-01', { flow: 'heavy', notes: 'dolor fuerte' });
    await repo.saveDoc('profile', { name: 'Lucía' });
    const rows = await getAll(db, 'records');
    expect(rows).toHaveLength(2);
    const raw = JSON.stringify(rows);
    expect(raw).not.toContain('2024-03-01');
    expect(raw).not.toContain('heavy');
    expect(raw).not.toContain('Lucía');
    const data = await repo.loadAll();
    expect(data.days['2024-03-01']).toMatchObject({ flow: 'heavy', notes: 'dolor fuerte' });
    expect(data.docs.profile).toEqual({ name: 'Lucía' });
    expect(data.unreadable).toBe(0);
  });

  it('keeps tombstones for deletions and never mixes profiles', async () => {
    const { db, repo, keys } = await freshRepo();
    await repo.saveDay('2024-03-01', { flow: 'light' });
    await repo.saveDay('2024-03-01', {});
    const other = new ProfileRepo(db, 'profile-b', keys);
    await other.saveDay('2024-03-02', { flow: 'medium' });
    const data = await repo.loadAll();
    expect(data.days['2024-03-01']).toBeUndefined();
    expect(data.clock['day:2024-03-01']).toBeTypeOf('number');
    expect(Object.keys(data.days)).toHaveLength(0);
    expect((await other.loadAll()).days['2024-03-02']).toMatchObject({ flow: 'medium' });
  });

  it('cannot read records with another key and reports them as unreadable', async () => {
    const { db, repo } = await freshRepo();
    await repo.saveDay('2024-03-01', { flow: 'light' });
    const intruder = new ProfileRepo(db, 'profile-a', await deriveProfileKeys(randomBytes(32)));
    const data = await intruder.loadAll();
    expect(Object.keys(data.days)).toHaveLength(0);
    expect(data.unreadable).toBe(1);
  });

  it('wipes a profile completely', async () => {
    const { db, repo } = await freshRepo();
    await repo.saveDay('2024-03-01', { flow: 'light' });
    await repo.saveDoc('settings', { mode: 'track' });
    expect(await repo.wipe()).toBe(2);
    expect(await getAll(db, 'records')).toHaveLength(0);
    db.close();
    await deleteDatabase(`test-${dbName}`);
  });
});

describe('legacy v2 migration', () => {
  beforeEach(() => localStorage.clear());

  it('converts v2 data including diary entries and periods', () => {
    localStorage.setItem(
      'menstruapp_cycle_data',
      JSON.stringify({
        days: {
          '2024-01-01': { periodStart: true, periodEnd: '2024-01-04', flow: 'fuerte', symptoms: ['colicos', 'fatiga'], mood: 'triste' },
          '2024-01-02': { flow: 'medio', basalTemp: '36,5', mucus: 'cremoso', medication: 'ibuprofeno 400mg' },
          '2024-01-29': { periodStart: true },
          'bad-date': { flow: 'medio' },
        },
        settings: { cycleLength: 29, periodLength: 4 },
      }),
    );
    localStorage.setItem('menstruapp_wellness_diary', JSON.stringify({ '2024-01-02': { emoji: '😊', energy: '8', notes: 'Mejor' } }));
    localStorage.setItem('menstruapp_user', JSON.stringify({ name: 'Ana', birthdate: '1995-05-01', password: 'plaintext!' }));
    localStorage.setItem('menstruapp_reminders', JSON.stringify({ pill: true, pillTime: '21:30', period: true, periodDays: '3' }));
    expect(hasLegacyData()).toBe(true);
    const legacy = readLegacyData();
    expect(legacy).not.toBeNull();
    const { days, profile, settings, reminders } = /** @type {any} */ (legacy);
    expect(days['2024-01-01']).toMatchObject({ flow: 'heavy', symptoms: { cramps: 2, fatigue: 2 }, moods: ['sad'] });
    expect(days['2024-01-02']).toMatchObject({ flow: 'medium', bbt: 36.5, mucus: 'creamy', moods: ['happy'], energy: 4, notes: 'Mejor' });
    expect(days['2024-01-03'].flow).toBe('medium');
    expect(days['2024-01-04'].flow).toBe('medium');
    expect(days['2024-01-29'].flow).toBe('medium');
    expect(days['bad-date']).toBeUndefined();
    expect(profile).toEqual({ name: 'Ana', birthYear: 1995 });
    expect(JSON.stringify(legacy)).not.toContain('plaintext!');
    expect(settings).toEqual({ cycleLength: 29, periodLength: 4 });
    expect(reminders).toEqual([
      { id: 'pill', type: 'pill', enabled: true, time: '21:30' },
      { id: 'period_soon', type: 'period_soon', enabled: true, time: '09:00', daysBefore: 3 },
    ]);
    clearLegacyData();
    expect(hasLegacyData()).toBe(false);
  });

  it('survives corrupted legacy JSON', () => {
    localStorage.setItem('menstruapp_cycle_data', '{not json');
    const legacy = readLegacyData();
    expect(legacy?.stats.days).toBe(0);
  });
});

describe('backups', () => {
  const data = {
    days: { '2024-02-01': { flow: 'medium', moods: ['calm'], notes: '=cmd|"/c calc"!A1' } },
    docs: { profile: { name: 'Eva' }, settings: { mode: 'track' }, sync: { enabled: true, secret: 'x' } },
  };

  it('round-trips a plain JSON backup (without device-only docs)', async () => {
    const text = await backupBlob(data).text();
    expect(text).not.toContain('"sync"');
    const restored = await readBackup(text);
    expect(restored.days).toEqual(data.days);
    expect(restored.docs.profile).toEqual({ name: 'Eva' });
  });

  it('round-trips an encrypted backup and requires the right password', async () => {
    const text = await (await encryptedBackupBlob(data, 'contraseña segura')).text();
    expect(text).not.toContain('Eva');
    await expect(readBackup(text)).rejects.toMatchObject({ code: 'needsPassword' });
    await expect(readBackup(text, 'otra')).rejects.toMatchObject({ code: 'wrongPassword' });
    const restored = await readBackup(text, 'contraseña segura');
    expect(restored.encrypted).toBe(true);
    expect(restored.days).toEqual(data.days);
  });

  it('rejects malformed or malicious files', async () => {
    await expect(readBackup('not json')).rejects.toBeInstanceOf(BackupError);
    await expect(readBackup(JSON.stringify({ format: 'menstruapp-backup', version: 3, exportedAt: 'x', data: { days: { x: {} } } }))).rejects.toBeInstanceOf(BackupError);
    const polluted = '{"format":"menstruapp-backup","version":3,"exportedAt":"x","data":{"days":{},"__proto__":{"admin":true}}}';
    await expect(readBackup(polluted)).rejects.toBeInstanceOf(BackupError);
    expect(/** @type {any} */ ({}).admin).toBeUndefined();
  });

  it('exports CSV safely (formula injection neutralised) and re-imports it', () => {
    const csv = daysToCSV(data.days);
    expect(csv).toContain(`"'=cmd|""/c calc""!A1"`);
    const back = csvToDays(csv);
    expect(back?.['2024-02-01']).toMatchObject({ flow: 'medium', moods: ['calm'], notes: '=cmd|"/c calc"!A1' });
  });
});

describe('csv', () => {
  it('parses quotes, escaped quotes, CRLF, BOM and semicolons', () => {
    expect(parseCSV('﻿a,b\r\n"x, y","he said ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'he said "hi"'],
    ]);
    expect(parseCSV('fecha;flujo\n01/02/2024;medio\n')).toEqual([
      ['fecha', 'flujo'],
      ['01/02/2024', 'medio'],
    ]);
    expect(parseCSV(toCSV([['multi\nline', 'b']]))).toEqual([['multi\nline', 'b']]);
  });
});

describe('importers', () => {
  it('parses flexible dates', () => {
    expect(parseFlexibleDate('2024-03-05')).toBe('2024-03-05');
    expect(parseFlexibleDate('05/03/2024')).toBe('2024-03-05');
    expect(parseFlexibleDate('05/03/2024', 'mdy')).toBe('2024-05-03');
    expect(parseFlexibleDate('25/03/24', 'mdy')).toBe('2024-03-25');
    expect(parseFlexibleDate('31/02/2024')).toBeNull();
  });

  it('imports generic CSVs with or without a flow column', () => {
    const a = importCSV('Fecha,Flujo\n01/03/2024,abundante\n02/03/2024,ligero\nbad,medio\n');
    expect(a.days).toEqual({ '2024-03-01': { flow: 'heavy' }, '2024-03-02': { flow: 'light' } });
    expect(a.skipped).toBe(1);
    const b = importCSV('Period start\n2024-01-01\n2024-01-29\n');
    expect(b.days['2024-01-29']).toEqual({ flow: 'medium' });
  });

  it('streams Apple Health exports', async () => {
    const xml = `<?xml version="1.0"?><HealthData>
      <Record type="HKCategoryTypeIdentifierMenstrualFlow" sourceName="Health" startDate="2024-01-05 00:00:00 +0100" endDate="2024-01-05 00:00:00 +0100" value="HKCategoryValueMenstrualFlowHeavy">
        <MetadataEntry key="HKMenstrualCycleStart" value="1"/>
      </Record>
      <Record type="HKCategoryTypeIdentifierMenstrualFlow" startDate="2024-01-06 00:00:00 +0100" value="HKCategoryValueVaginalBleedingLight"/>
      <Record type="HKQuantityTypeIdentifierBasalBodyTemperature" unit="degF" startDate="2024-01-20 07:00:00 +0100" value="98.1"/>
      <Record type="HKCategoryTypeIdentifierOvulationTestResult" startDate="2024-01-18 07:00:00 +0100" value="HKCategoryValueOvulationTestResultLuteinizingHormoneSurge"/>
      <Record type="HKQuantityTypeIdentifierStepCount" startDate="2024-01-18 07:00:00 +0100" value="3000"/>
    </HealthData>`;
    // Tiny chunks to exercise tag boundaries across reads.
    const bytes = new TextEncoder().encode(xml);
    const stream = new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
        controller.close();
      },
    });
    const fakeFile = { size: bytes.length, stream: () => stream };
    const { days, records } = await importAppleHealth(/** @type {any} */ (fakeFile));
    expect(records).toBe(4);
    expect(days['2024-01-05']).toEqual({ flow: 'heavy' });
    expect(days['2024-01-06']).toEqual({ flow: 'light' });
    expect(days['2024-01-18']).toEqual({ lh: 'positive' });
    expect(days['2024-01-20'].bbt).toBeCloseTo(36.72, 1);
  });
});
