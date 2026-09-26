// Minimal, strict schema validator used for every piece of untrusted data:
// imported backups, synced snapshots, shared links, CSV rows and even our own saves.
// It returns a *cleaned copy* (unknown keys stripped) and rejects prototype-pollution keys.

import { isISODate, isTime } from './dates.js';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const DEFAULT_MAX_STRING = 10_000;

/**
 * @typedef {{ type: string, optional?: boolean, nullable?: boolean, [k: string]: any }} Schema
 */

export const v = {
  /** @param {{min?:number,max?:number,pattern?:RegExp,optional?:boolean,nullable?:boolean,trim?:boolean}} [o] */
  string: (o = {}) => ({ type: 'string', ...o }),
  /** @param {{min?:number,max?:number,integer?:boolean,optional?:boolean,nullable?:boolean}} [o] */
  number: (o = {}) => ({ type: 'number', ...o }),
  /** @param {{optional?:boolean,nullable?:boolean}} [o] */
  boolean: (o = {}) => ({ type: 'boolean', ...o }),
  /** ISO calendar date "YYYY-MM-DD". @param {{optional?:boolean,nullable?:boolean}} [o] */
  date: (o = {}) => ({ type: 'date', ...o }),
  /** "HH:MM" 24h. @param {{optional?:boolean,nullable?:boolean}} [o] */
  time: (o = {}) => ({ type: 'time', ...o }),
  /** @param {readonly (string|number)[]} values @param {{optional?:boolean,nullable?:boolean}} [o] */
  enum: (values, o = {}) => ({ type: 'enum', values, ...o }),
  /** @param {Schema} items @param {{min?:number,max?:number,unique?:boolean,optional?:boolean,nullable?:boolean}} [o] */
  array: (items, o = {}) => ({ type: 'array', items, ...o }),
  /** @param {Record<string, Schema>} shape @param {{optional?:boolean,nullable?:boolean,strict?:boolean}} [o] */
  object: (shape, o = {}) => ({ type: 'object', shape, ...o }),
  /**
   * Dictionary with validated keys and values.
   * @param {Schema} key @param {Schema} value @param {{max?:number,optional?:boolean,nullable?:boolean}} [o]
   */
  record: (key, value, o = {}) => ({ type: 'record', key, value, ...o }),
};

/** @param {unknown} x @returns {x is Record<string, unknown>} */
export function isPlainObject(x) {
  if (x === null || typeof x !== 'object' || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

/**
 * @param {Schema} schema
 * @param {unknown} value
 * @param {string} path
 * @param {string[]} errors
 * @returns {any}
 */
function run(schema, value, path, errors) {
  if (value === null && schema.nullable) return null;
  if (value === undefined || value === null) {
    errors.push(`${path}: required`);
    return undefined;
  }
  switch (schema.type) {
    case 'string': {
      if (typeof value !== 'string') return fail(errors, path, 'expected string');
      // NUL characters are never legitimate input and break some storage layers.
      // eslint-disable-next-line no-control-regex
      let str = value.replace(/\u0000/g, '');
      if (schema.trim) str = str.trim();
      const max = schema.max ?? DEFAULT_MAX_STRING;
      if (str.length > max) return fail(errors, path, `longer than ${max}`);
      if (schema.min !== undefined && str.length < schema.min) return fail(errors, path, `shorter than ${schema.min}`);
      if (schema.pattern && !schema.pattern.test(str)) return fail(errors, path, 'invalid format');
      return str;
    }
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return fail(errors, path, 'expected number');
      if (schema.integer && !Number.isInteger(value)) return fail(errors, path, 'expected integer');
      if (schema.min !== undefined && value < schema.min) return fail(errors, path, `below ${schema.min}`);
      if (schema.max !== undefined && value > schema.max) return fail(errors, path, `above ${schema.max}`);
      return value;
    }
    case 'boolean':
      if (typeof value !== 'boolean') return fail(errors, path, 'expected boolean');
      return value;
    case 'date':
      if (!isISODate(/** @type {string} */ (value))) return fail(errors, path, 'expected YYYY-MM-DD date');
      return value;
    case 'time':
      if (!isTime(/** @type {string} */ (value))) return fail(errors, path, 'expected HH:MM time');
      return value;
    case 'enum':
      if (!schema.values.includes(value)) return fail(errors, path, 'unexpected value');
      return value;
    case 'array': {
      if (!Array.isArray(value)) return fail(errors, path, 'expected array');
      if (schema.max !== undefined && value.length > schema.max) return fail(errors, path, `more than ${schema.max} items`);
      if (schema.min !== undefined && value.length < schema.min) return fail(errors, path, `fewer than ${schema.min} items`);
      const out = [];
      const before = errors.length;
      value.forEach((item, i) => out.push(run(schema.items, item, `${path}[${i}]`, errors)));
      if (errors.length > before) return undefined;
      if (schema.unique) return Array.from(new Set(out));
      return out;
    }
    case 'object': {
      if (!isPlainObject(value)) return fail(errors, path, 'expected object');
      /** @type {Record<string, any>} */
      const out = {};
      const before = errors.length;
      for (const key of Object.keys(value)) {
        if (FORBIDDEN_KEYS.has(key)) {
          errors.push(`${path}.${key}: forbidden key`);
        } else if (schema.strict && !(key in schema.shape)) {
          errors.push(`${path}.${key}: unknown key`);
        }
      }
      for (const [key, sub] of Object.entries(schema.shape)) {
        const raw = value[key];
        if (raw === undefined) {
          if (!sub.optional) errors.push(`${path}.${key}: required`);
          continue;
        }
        const cleaned = run(sub, raw, `${path}.${key}`, errors);
        if (cleaned !== undefined) out[key] = cleaned;
      }
      return errors.length > before ? undefined : out;
    }
    case 'record': {
      if (!isPlainObject(value)) return fail(errors, path, 'expected object');
      const keys = Object.keys(value);
      if (schema.max !== undefined && keys.length > schema.max) return fail(errors, path, `more than ${schema.max} entries`);
      /** @type {Record<string, any>} */
      const out = Object.create(null);
      const before = errors.length;
      for (const key of keys) {
        if (FORBIDDEN_KEYS.has(key)) {
          errors.push(`${path}.${key}: forbidden key`);
          continue;
        }
        run(schema.key, key, `${path}{${key}}`, errors);
        const cleaned = run(schema.value, value[key], `${path}.${key}`, errors);
        if (cleaned !== undefined) out[key] = cleaned;
      }
      return errors.length > before ? undefined : Object.assign({}, out);
    }
    default:
      return fail(errors, path, `unknown schema type ${schema.type}`);
  }
}

/** @param {string[]} errors @param {string} path @param {string} msg @returns {undefined} */
function fail(errors, path, msg) {
  errors.push(`${path}: ${msg}`);
  return undefined;
}

/**
 * Validates and cleans a value.
 * @param {Schema} schema
 * @param {unknown} value
 * @returns {{ ok: true, value: any } | { ok: false, errors: string[] }}
 */
export function validate(schema, value) {
  /** @type {string[]} */
  const errors = [];
  const cleaned = run(schema, value, '$', errors);
  if (errors.length) return { ok: false, errors: errors.slice(0, 50) };
  return { ok: true, value: cleaned };
}

/**
 * Like validate() but throws a ValidationError.
 * @param {Schema} schema
 * @param {unknown} value
 */
export function assertValid(schema, value) {
  const result = validate(schema, value);
  if (!result.ok) throw new ValidationError(result.errors);
  return result.value;
}

export class ValidationError extends Error {
  /** @param {string[]} errors */
  constructor(errors) {
    super(`Invalid data: ${errors.slice(0, 3).join('; ')}`);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
