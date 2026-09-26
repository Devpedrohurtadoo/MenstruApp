import { describe, it, expect } from 'vitest';
import { v, validate } from '../../public/js/core/validate.js';
import { dayEntrySchema, backupSchema } from '../../public/js/data/schema.js';

describe('validate', () => {
  const schema = v.object({
    name: v.string({ max: 5 }),
    age: v.number({ integer: true, min: 0, max: 120, optional: true }),
    tags: v.array(v.enum(['a', 'b']), { optional: true, max: 2, unique: true }),
  });

  it('accepts valid data and strips unknown keys', () => {
    const r = validate(schema, { name: 'Ana', age: 30, extra: 'x' });
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ name: 'Ana', age: 30 });
  });

  it('rejects wrong types, ranges and lengths', () => {
    expect(validate(schema, { name: 'Anastasia' }).ok).toBe(false);
    expect(validate(schema, { name: 'Ana', age: 1.5 }).ok).toBe(false);
    expect(validate(schema, { name: 'Ana', age: -1 }).ok).toBe(false);
    expect(validate(schema, { name: 'Ana', age: Number.NaN }).ok).toBe(false);
    expect(validate(schema, { name: 'Ana', tags: ['c'] }).ok).toBe(false);
    expect(validate(schema, { age: 3 }).ok).toBe(false);
  });

  it('rejects prototype pollution keys', () => {
    const payload = JSON.parse('{"name":"x","__proto__":{"polluted":true}}');
    const r = validate(schema, payload);
    expect(r.ok).toBe(false);
    expect({}.polluted).toBeUndefined();
    const rec = validate(v.record(v.string(), v.number()), JSON.parse('{"constructor":1}'));
    expect(rec.ok).toBe(false);
  });

  it('rejects non-plain objects', () => {
    expect(validate(schema, new Date()).ok).toBe(false);
    expect(validate(schema, ['Ana']).ok).toBe(false);
  });

  it('validates day entries with enums and ranges', () => {
    expect(validate(dayEntrySchema, { flow: 'medium', symptoms: { cramps: 2 }, moods: ['happy'], bbt: 36.6 }).ok).toBe(true);
    expect(validate(dayEntrySchema, { flow: 'torrential' }).ok).toBe(false);
    expect(validate(dayEntrySchema, { symptoms: { cramps: 5 } }).ok).toBe(false);
    expect(validate(dayEntrySchema, { symptoms: { unknown: 1 } }).ok).toBe(false);
    expect(validate(dayEntrySchema, { bbt: 45 }).ok).toBe(false);
    expect(validate(dayEntrySchema, { notes: 'x'.repeat(2001) }).ok).toBe(false);
  });

  it('validates full backups', () => {
    const good = { format: 'menstruapp-backup', version: 3, exportedAt: '2024-01-01T00:00:00Z', data: { days: { '2024-01-01': { flow: 'light' } } } };
    expect(validate(backupSchema, good).ok).toBe(true);
    const bad = { ...good, data: { days: { 'not-a-date': { flow: 'light' } } } };
    expect(validate(backupSchema, bad).ok).toBe(false);
  });
});
