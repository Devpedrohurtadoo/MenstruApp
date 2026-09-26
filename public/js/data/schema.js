// Schemas for everything we persist, import, sync or share.

import { v } from '../core/validate.js';
import {
  CLOTS,
  CONTRACEPTION,
  EXERCISE,
  FLOW,
  FLOW_COLORS,
  LH,
  LIBIDO,
  MODES,
  MOODS,
  MUCUS,
  PREGNANCY_OUTCOMES,
  PREGNANCY_TEST,
  SEX,
  SYMPTOM_IDS,
  BBT_RANGE_C,
  WEIGHT_RANGE_KG,
} from '../domain/catalog.js';

const opt = { optional: true };
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export const dayEntrySchema = v.object({
  flow: v.enum(FLOW, opt),
  flowColor: v.enum(FLOW_COLORS, opt),
  clots: v.enum(CLOTS, opt),
  symptoms: v.record(v.enum(SYMPTOM_IDS), v.number({ integer: true, min: 1, max: 3 }), { optional: true, max: 80 }),
  moods: v.array(v.enum(MOODS), { optional: true, max: MOODS.length, unique: true }),
  energy: v.number({ integer: true, min: 1, max: 5, optional: true }),
  libido: v.enum(LIBIDO, opt),
  sex: v.enum(SEX, opt),
  bbt: v.number({ min: BBT_RANGE_C[0], max: BBT_RANGE_C[1], optional: true }),
  bbtDisturbed: v.boolean(opt),
  mucus: v.enum(MUCUS, opt),
  lh: v.enum(LH, opt),
  pregnancyTest: v.enum(PREGNANCY_TEST, opt),
  contraceptionTaken: v.boolean(opt),
  meds: v.array(v.object({ name: v.string({ min: 1, max: 80, trim: true }), dose: v.string({ max: 40, trim: true, optional: true }) }), {
    optional: true,
    max: 12,
  }),
  weight: v.number({ min: WEIGHT_RANGE_KG[0], max: WEIGHT_RANGE_KG[1], optional: true }),
  sleepHours: v.number({ min: 0, max: 24, optional: true }),
  water: v.number({ integer: true, min: 0, max: 40, optional: true }),
  exercise: v.enum(EXERCISE, opt),
  notes: v.string({ max: 2000, optional: true }),
  updatedAt: v.number({ integer: true, min: 0, optional: true }),
});

export const daysSchema = v.record(v.date(), dayEntrySchema, { max: 60_000 });

export const profileSchema = v.object({
  name: v.string({ max: 40, trim: true, optional: true }),
  birthYear: v.number({ integer: true, min: 1900, max: 2100, optional: true, nullable: true }),
  avatar: v.string({ max: 16, optional: true }),
  photo: v.string({ max: 150_000, pattern: /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/, optional: true, nullable: true }),
  color: v.string({ pattern: HEX_COLOR, optional: true }),
  createdAt: v.number({ integer: true, min: 0, optional: true }),
});

export const settingsSchema = v.object({
  mode: v.enum(MODES),
  experience: v.enum(['new', 'experienced'], opt),
  cycleLength: v.number({ integer: true, min: 15, max: 90, optional: true, nullable: true }),
  periodLength: v.number({ integer: true, min: 1, max: 15, optional: true, nullable: true }),
  lutealLength: v.number({ integer: true, min: 8, max: 18, optional: true, nullable: true }),
  temperatureUnit: v.enum(['C', 'F'], opt),
  weightUnit: v.enum(['kg', 'lb'], opt),
  contraception: v.object(
    {
      method: v.enum(CONTRACEPTION),
      startDate: v.date({ optional: true, nullable: true }),
      pillRegimen: v.enum(['21_7', '24_4', '28', 'continuous'], opt),
      time: v.time(opt),
    },
    opt,
  ),
  postpartum: v.object(
    {
      birthDate: v.date(),
      breastfeeding: v.enum(['exclusive', 'partial', 'no']),
      periodReturned: v.boolean(),
    },
    opt,
  ),
  /** Perimenopause: no period for over a year, as stated by the user (any bleeding is then checked). */
  menopause: v.object({ overAYear: v.boolean() }, opt),
  features: v.object(
    {
      streaks: v.boolean(),
      dailyTips: v.boolean(),
      fertilityInAvoid: v.boolean(),
      celebrations: v.boolean(),
    },
    opt,
  ),
  security: v.object(
    {
      autoLockMinutes: v.number({ integer: true, min: 0, max: 60 }),
      lockOnHide: v.boolean(),
      discreetNotifications: v.boolean(),
      guestShowNextPeriod: v.boolean(),
      guestShowPhase: v.boolean(),
    },
    opt,
  ),
  onboardedAt: v.number({ integer: true, min: 0, optional: true }),
  /** Date the current mode was chosen (e.g. "trying to conceive since"). */
  modeSince: v.date({ optional: true, nullable: true }),
});

export const REMINDER_TYPES = /** @type {const} */ ([
  'period_soon',
  'period_late',
  'fertile_start',
  'ovulation',
  'log_daily',
  'daily_tip',
  'bbt',
  'pill',
  'patch',
  'ring',
  'injection',
  'checkup',
  'pregnancy_week',
  'appointment',
  'custom',
  'backup',
]);

export const reminderSchema = v.object({
  id: v.string({ pattern: ID_RE }),
  type: v.enum(REMINDER_TYPES),
  enabled: v.boolean(),
  time: v.time(),
  daysBefore: v.number({ integer: true, min: 0, max: 14, optional: true }),
  weekday: v.number({ integer: true, min: 0, max: 6, optional: true }),
  date: v.date(opt),
  title: v.string({ max: 80, trim: true, optional: true }),
  repeat: v.enum(['none', 'daily', 'weekly', 'monthly', 'yearly'], opt),
});

export const remindersSchema = v.object({
  items: v.array(reminderSchema, { max: 100 }),
});

export const pregnancySchema = v.object({
  active: v.boolean(),
  basis: v.enum(['lmp', 'due', 'conception']),
  date: v.date(),
  startedAt: v.number({ integer: true, min: 0 }),
  endedOn: v.date(opt),
  outcome: v.enum(PREGNANCY_OUTCOMES, opt),
  kicks: v.array(
    v.object({ start: v.number({ integer: true, min: 0 }), end: v.number({ integer: true, min: 0 }), count: v.number({ integer: true, min: 0, max: 200 }) }),
    { optional: true, max: 1000 },
  ),
  contractions: v.array(v.object({ start: v.number({ integer: true, min: 0 }), end: v.number({ integer: true, min: 0 }) }), {
    optional: true,
    max: 2000,
  }),
  /** Past pregnancies, excluded from cycle statistics. */
  history: v.array(v.object({ from: v.date(), to: v.date() }), { optional: true, max: 20 }),
});

export const gamificationSchema = v.object({
  achievements: v.record(v.string({ pattern: ID_RE }), v.date(), { max: 100 }),
});

export const syncStateSchema = v.object({
  enabled: v.boolean(),
  secret: v.string({ pattern: /^[0-9A-Z]{52}$/, optional: true }),
  /** Sync code whose server copy still has to be deleted (sync was turned off while offline). */
  pendingDelete: v.string({ pattern: /^[0-9A-Z]{52}$/, optional: true }),
  lastSyncAt: v.number({ integer: true, min: 0, optional: true }),
  remoteVersion: v.number({ integer: true, min: 0, optional: true }),
});

export const sharesSchema = v.object({
  items: v.array(
    v.object({
      id: v.string({ pattern: /^[A-Za-z0-9_-]{16,64}$/ }),
      deleteToken: v.string({ pattern: /^[A-Za-z0-9_-]{16,128}$/ }),
      key: v.string({ pattern: /^[A-Za-z0-9_-]{16,128}$/ }),
      createdAt: v.number({ integer: true, min: 0 }),
      expiresAt: v.number({ integer: true, min: 0 }),
      scope: v.array(v.enum(['predictions', 'cycles', 'symptoms', 'notes']), { max: 4, unique: true }),
      label: v.string({ max: 40, trim: true, optional: true }),
    }),
    { max: 50 },
  ),
});

/** Documents stored once per profile (besides day entries). */
export const DOC_SCHEMAS = /** @type {const} */ ({
  profile: profileSchema,
  settings: settingsSchema,
  reminders: remindersSchema,
  pregnancy: pregnancySchema,
  gamification: gamificationSchema,
  sync: syncStateSchema,
  shares: sharesSchema,
});

/** Documents that travel with backups and sync (device-specific ones stay local). */
export const PORTABLE_DOCS = /** @type {const} */ (['profile', 'settings', 'reminders', 'pregnancy', 'gamification']);

export const BACKUP_FORMAT = 'menstruapp-backup';
export const ENCRYPTED_BACKUP_FORMAT = 'menstruapp-encrypted-backup';

export const backupSchema = v.object({
  format: v.enum([BACKUP_FORMAT]),
  version: v.number({ integer: true, min: 1, max: 3 }),
  exportedAt: v.string({ max: 40 }),
  app: v.string({ max: 20, optional: true }),
  data: v.object({
    profile: { ...profileSchema, optional: true },
    settings: { ...settingsSchema, optional: true },
    reminders: { ...remindersSchema, optional: true },
    pregnancy: { ...pregnancySchema, optional: true, nullable: true },
    gamification: { ...gamificationSchema, optional: true },
    days: daysSchema,
  }),
});

export const encryptedBackupSchema = v.object({
  format: v.enum([ENCRYPTED_BACKUP_FORMAT]),
  version: v.number({ integer: true, min: 1, max: 1 }),
  kdf: v.object({
    name: v.enum(['PBKDF2']),
    hash: v.enum(['SHA-256']),
    iterations: v.number({ integer: true, min: 100_000, max: 5_000_000 }),
    salt: v.string({ max: 64 }),
  }),
  iv: v.string({ max: 64 }),
  ct: v.string({ max: 80_000_000 }),
});

/** Default settings for a new profile. @param {string} mode */
export function defaultSettings(mode = 'track') {
  return {
    mode,
    experience: 'experienced',
    cycleLength: null,
    periodLength: null,
    lutealLength: null,
    temperatureUnit: 'C',
    weightUnit: 'kg',
    features: { streaks: true, dailyTips: true, fertilityInAvoid: false, celebrations: true },
    security: {
      autoLockMinutes: 5,
      lockOnHide: true,
      discreetNotifications: false,
      guestShowNextPeriod: true,
      guestShowPhase: false,
    },
  };
}
