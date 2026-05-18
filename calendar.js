/**
 * @fileoverview Lógica del ciclo menstrual y predicciones
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'menstruapp_cycle_data';
  const DEFAULT_CYCLE = 28;
  const DEFAULT_PERIOD = 5;

  /**
   * @description Parsea fecha ISO a objeto Date local
   * @param {string} iso - Fecha YYYY-MM-DD
   * @returns {Date}
   */
  const parseDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  /**
   * @description Formatea Date a ISO YYYY-MM-DD
   * @param {Date} date - Fecha
   * @returns {string}
   */
  const formatDateISO = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  /**
   * @description Suma días a una fecha ISO
   * @param {string} iso - Fecha base
   * @param {number} days - Días a sumar
   * @returns {string}
   */
  const addDays = (iso, days) => {
    const d = parseDate(iso);
    d.setDate(d.getDate() + days);
    return formatDateISO(d);
  };

  /**
   * @description Diferencia en días entre dos fechas ISO
   * @param {string} from - Fecha inicio
   * @param {string} to - Fecha fin
   * @returns {number}
   */
  const daysBetween = (from, to) => {
    const a = parseDate(from);
    const b = parseDate(to);
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
  };

  /**
   * @description Calcula próximo periodo
   * @param {string} lastPeriodDate - Último inicio ISO
   * @param {number} cycleLength - Duración del ciclo
   * @returns {string} Fecha ISO del próximo periodo
   */
  const calculateNextPeriod = (lastPeriodDate, cycleLength) =>
    addDays(lastPeriodDate, cycleLength);

  /**
   * @description Lee datos del ciclo desde localStorage
   * @returns {Object}
   */
  const loadCycleData = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { days: {}, settings: {} };
    } catch (e) {
      console.error('[Menstruapp] Error al leer datos del ciclo:', e);
      return { days: {}, settings: {} };
    }
  };

  /**
   * @description Guarda datos del ciclo en localStorage
   * @param {Object} data - Datos completos
   * @returns {boolean}
   */
  const saveCycleData = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[Menstruapp] Error al guardar datos del ciclo:', e);
      return false;
    }
  };

  /**
   * @description Obtiene registros de inicio de periodo ordenados
   * @param {Object} cycleData - Datos del ciclo
   * @returns {string[]} Fechas ISO
   */
  const getPeriodStarts = (cycleData) => {
    const days = cycleData.days || {};
    return Object.keys(days)
      .filter((d) => days[d]?.periodStart)
      .sort();
  };

  /**
   * @description Calcula duración media del ciclo
   * @param {Object} cycleData - Datos
   * @param {number} [manualOverride] - Override manual
   * @returns {number}
   */
  const getAverageCycleLength = (cycleData, manualOverride) => {
    if (manualOverride) return manualOverride;
    const starts = getPeriodStarts(cycleData);
    if (starts.length < 2) {
      return cycleData.settings?.cycleLength || DEFAULT_CYCLE;
    }
    const lengths = [];
    const recent = starts.slice(-4);
    for (let i = 1; i < recent.length; i++) {
      lengths.push(daysBetween(recent[i - 1], recent[i]));
    }
    if (lengths.length === 0) return DEFAULT_CYCLE;
    const lastThree = lengths.slice(-3);
    if (lastThree.length < 3 && starts.length >= 2) {
      return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) || DEFAULT_CYCLE;
    }
    return Math.round(lastThree.reduce((a, b) => a + b, 0) / lastThree.length) || DEFAULT_CYCLE;
  };

  /**
   * @description Calcula duración media del periodo
   * @param {Object} cycleData - Datos
   * @param {number} [manualOverride] - Override
   * @returns {number}
   */
  const getAveragePeriodLength = (cycleData, manualOverride) => {
    if (manualOverride) return manualOverride;
    const days = cycleData.days || {};
    const durations = [];
    Object.keys(days).forEach((d) => {
      if (days[d]?.periodStart && typeof days[d]?.periodEnd === 'string') {
        const len = daysBetween(d, days[d].periodEnd) + 1;
        if (len > 0 && len <= 15) durations.push(len);
      }
    });
    if (durations.length === 0) return cycleData.settings?.periodLength || DEFAULT_PERIOD;
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) || DEFAULT_PERIOD;
  };

  /**
   * @description Último inicio de periodo registrado
   * @param {Object} cycleData - Datos
   * @returns {string|null}
   */
  const getLastPeriodStart = (cycleData) => {
    const starts = getPeriodStarts(cycleData);
    return starts.length ? starts[starts.length - 1] : null;
  };

  /**
   * @description Predice próximos N inicios de periodo
   * @param {Object} cycleData - Datos
   * @param {number} count - Cantidad de predicciones
   * @returns {string[]}
   */
  const predictPeriodStarts = (cycleData, count = 3) => {
    const last = getLastPeriodStart(cycleData);
    if (!last) return [];
    const cycleLen = getAverageCycleLength(cycleData, cycleData.settings?.cycleLength);
    const predictions = [];
    let current = last;
    for (let i = 0; i < count; i++) {
      current = calculateNextPeriod(current, cycleLen);
      predictions.push(current);
    }
    return predictions;
  };

  /**
   * @description Genera mapa de marcas del calendario para un mes
   * @param {number} year - Año
   * @param {number} month - Mes 0-11
   * @param {Object} cycleData - Datos
   * @returns {Object<string,string[]>} date -> clases
   */
  const getCalendarMarks = (year, month, cycleData) => {
    const marks = {};
    const cycleLen = getAverageCycleLength(cycleData, cycleData.settings?.cycleLength);
    const periodLen = getAveragePeriodLength(cycleData, cycleData.settings?.periodLength);
    const days = cycleData.days || {};
    const today = formatDateISO(new Date());

    Object.keys(days).forEach((d) => {
      if (!marks[d]) marks[d] = [];
      if (days[d]?.periodStart || days[d]?.flow || days[d]?.periodEnd) {
        if (!marks[d].includes('period')) marks[d].push('period');
      }
      if (Object.keys(days[d] || {}).length > 0) marks[d].push('has-data');
    });

    const markRange = (startIso, len, type) => {
      for (let i = 0; i < len; i++) {
        const iso = addDays(startIso, i);
        const dt = parseDate(iso);
        if (dt.getFullYear() === year && dt.getMonth() === month) {
          if (!marks[iso]) marks[iso] = [];
          if (!marks[iso].includes(type)) marks[iso].push(type);
        }
      }
    };

    getPeriodStarts(cycleData).forEach((start) => {
      let end = start;
      if (typeof days[start]?.periodEnd === 'string') end = days[start].periodEnd;
      else {
        const starts = getPeriodStarts(cycleData);
        const idx = starts.indexOf(start);
        if (idx < starts.length - 1) {
          end = addDays(starts[idx + 1], -1);
        } else {
          end = addDays(start, periodLen - 1);
        }
      }
      let cur = start;
      while (cur <= end) {
        if (!marks[cur]) marks[cur] = [];
        if (!marks[cur].includes('period')) marks[cur].push('period');
        cur = addDays(cur, 1);
      }
    });

    const allPredictions = [];
    const last = getLastPeriodStart(cycleData);
    if (last) {
      let cur = last;
      for (let i = 0; i < 4; i++) {
        cur = calculateNextPeriod(cur, cycleLen);
        allPredictions.push(cur);
      }
    }

    allPredictions.slice(0, 3).forEach((predStart) => {
      markRange(predStart, periodLen, 'predicted');
      for (let p = 4; p >= 1; p--) {
        const pmsDate = addDays(predStart, -p);
        const dt = parseDate(pmsDate);
        if (dt.getFullYear() === year && dt.getMonth() === month) {
          if (!marks[pmsDate]) marks[pmsDate] = [];
          if (!marks[pmsDate].includes('pms')) marks[pmsDate].push('pms');
        }
      }
      const ovulationDay = addDays(predStart, -14);
      const dtOv = parseDate(ovulationDay);
      if (dtOv.getFullYear() === year && dtOv.getMonth() === month) {
        if (!marks[ovulationDay]) marks[ovulationDay] = [];
        if (!marks[ovulationDay].includes('ovulation')) marks[ovulationDay].push('ovulation');
      }
      for (let f = 5; f >= 1; f--) {
        const fertileDate = addDays(ovulationDay, -f);
        const dtF = parseDate(fertileDate);
        if (dtF.getFullYear() === year && dtF.getMonth() === month) {
          if (!marks[fertileDate]) marks[fertileDate] = [];
          if (!marks[fertileDate].includes('fertile')) marks[fertileDate].push('fertile');
        }
      }
      const lutealStart = addDays(ovulationDay, 1);
      const lutealEnd = addDays(predStart, -1);
      let curL = lutealStart;
      while (curL <= lutealEnd) {
        const dtL = parseDate(curL);
        if (dtL.getFullYear() === year && dtL.getMonth() === month) {
          if (!marks[curL]) marks[curL] = [];
          if (!marks[curL].includes('luteal') && !marks[curL].includes('fertile') && !marks[curL].includes('ovulation')) {
            marks[curL].push('luteal');
          }
        }
        curL = addDays(curL, 1);
      }
    });

    return marks;
  };

  /**
   * @description Calcula día actual del ciclo y fase
   * @param {Object} cycleData - Datos
   * @returns {{ cycleDay: number|null, phase: string, daysToPeriod: number|null, nextOvulation: string|null }}
   */
  const getCycleStatus = (cycleData) => {
    const last = getLastPeriodStart(cycleData);
    const today = formatDateISO(new Date());
    if (!last) {
      return { cycleDay: null, phase: 'Desconocida', daysToPeriod: null, nextOvulation: null };
    }
    const cycleLen = getAverageCycleLength(cycleData, cycleData.settings?.cycleLength);
    const cycleDay = daysBetween(last, today) + 1;
    const nextPeriod = calculateNextPeriod(last, cycleLen);
    const daysToPeriod = daysBetween(today, nextPeriod);
    const ovulationDay = addDays(nextPeriod, -14);

    let phase = 'Folicular';
    if (cycleDay <= getAveragePeriodLength(cycleData, cycleData.settings?.periodLength)) {
      phase = 'Menstrual';
    } else if (cycleDay >= cycleLen - 16 && cycleDay <= cycleLen - 12) {
      phase = 'Ovulatoria';
    } else if (cycleDay > cycleLen - 12) {
      phase = 'Lútea';
    } else if (cycleDay > getAveragePeriodLength(cycleData)) {
      phase = 'Folicular';
    }
    if (daysBetween(today, ovulationDay) >= -1 && daysBetween(today, ovulationDay) <= 1) {
      phase = 'Ovulatoria';
    }

    return { cycleDay, phase, daysToPeriod, nextOvulation: ovulationDay, cycleLength: cycleLen };
  };

  /**
   * @description Genera HTML de resumen del ciclo
   * @param {Object} cycleData - Datos
   * @returns {string}
   */
  const buildCycleSummaryHTML = (cycleData) => {
    const status = getCycleStatus(cycleData);
    const avgCycle = getAverageCycleLength(cycleData, cycleData.settings?.cycleLength);
    const avgPeriod = getAveragePeriodLength(cycleData, cycleData.settings?.periodLength);

    if (!status.cycleDay) {
      return '<p>Registra el <strong>inicio de tu periodo</strong> para activar predicciones personalizadas.</p>';
    }

    return `<p>Estás en el <strong>día ${status.cycleDay}</strong> de tu ciclo.</p>
      <p>Fase actual: <strong>${status.phase}</strong></p>
      <p>Próximo periodo en aproximadamente <strong>${status.daysToPeriod} días</strong>.</p>
      <p>Longitud media del ciclo: <strong>${avgCycle} días</strong> · Periodo: <strong>${avgPeriod} días</strong>.</p>`;
  };

  /**
   * @description Exporta datos a JSON descargable
   * @param {Object} cycleData - Datos
   * @returns {string}
   */
  const exportCycleJSON = (cycleData) => JSON.stringify(cycleData, null, 2);

  /**
   * @description Importa datos desde JSON parseado
   * @param {Object} parsed - Objeto importado
   * @returns {Object|null}
   */
  const validateImportedData = (parsed) => {
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.days) parsed.days = {};
    if (!parsed.settings) parsed.settings = {};
    return parsed;
  };

  /**
   * @description Extrae síntomas de últimos N días para gráfica
   * @param {Object} cycleData - Datos
   * @param {number} days - Días hacia atrás
   * @returns {Array<{date:string,symptoms:Object}>}
   */
  const getSymptomHistory = (cycleData, days = 90) => {
    const result = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = formatDateISO(d);
      const entry = cycleData.days?.[iso] || {};
      const intensity = {};
      (entry.symptoms || []).forEach((s) => { intensity[s] = 3; });
      if (entry.mood) intensity[entry.mood] = 2;
      if (entry.flow) intensity[`flow_${entry.flow}`] = entry.flow === 'fuerte' ? 3 : entry.flow === 'medio' ? 2 : 1;
      result.push({ date: iso, symptoms: intensity });
    }
    return result;
  };

  window.CalendarModule = {
    STORAGE_KEY,
    parseDate,
    formatDateISO,
    addDays,
    daysBetween,
    calculateNextPeriod,
    loadCycleData,
    saveCycleData,
    getPeriodStarts,
    getAverageCycleLength,
    getAveragePeriodLength,
    getLastPeriodStart,
    predictPeriodStarts,
    getCalendarMarks,
    getCycleStatus,
    buildCycleSummaryHTML,
    exportCycleJSON,
    validateImportedData,
    getSymptomHistory,
    DEFAULT_CYCLE,
    DEFAULT_PERIOD
  };

  window.runTests_calendar = () => {
    console.group('🧪 Tests Calendar Module');
    const result = calculateNextPeriod('2024-01-15', 28);
    console.assert(result === '2024-02-12', `❌ Test 1 falló: ${result}`);
    console.log('✅ Test 1 passed: calculateNextPeriod');
    const data = { days: { '2024-01-01': { periodStart: true }, '2024-01-29': { periodStart: true } } };
    const avg = getAverageCycleLength(data);
    console.assert(avg === 28, `❌ Test 2: ${avg}`);
    console.log('✅ Test 2 passed: getAverageCycleLength');
    console.groupEnd();
  };
})();
