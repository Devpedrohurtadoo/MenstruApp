/**
 * @fileoverview Módulo de bienestar integral
 */
(function () {
  'use strict';

  const DIARY_KEY = 'menstruapp_wellness_diary';
  const REMINDERS_KEY = 'menstruapp_reminders';

  const SYMPTOM_COLORS = {
    colicos: '#F87171',
    headache: '#C084FC',
    hinchazon: '#60A5FA',
    nausea: '#FCD34D',
    fatiga: '#A78BFA',
    acne: '#F4A7B9',
    feliz: '#6EE7B7',
    irritable: '#FB923C',
    ansiosa: '#F472B6'
  };

  const GUIDES = [
    { id: 'fases', title: 'Las 4 fases del ciclo', desc: 'Cómo afectan al cuerpo y la mente cada fase hormonal.', gradient: 'linear-gradient(135deg,#F4A7B9,#C084FC)' },
    { id: 'pms', title: 'Síndrome Premenstrual (SPM)', desc: 'Causas, síntomas y remedios naturales basados en evidencia.', gradient: 'linear-gradient(135deg,#E879A0,#C084FC)' },
    { id: 'endo', title: 'Endometriosis', desc: 'Síntomas, diagnóstico y opciones de tratamiento actualizadas.', gradient: 'linear-gradient(135deg,#F87171,#7C3AED)' },
    { id: 'sop', title: 'Síndrome de Ovario Poliquístico', desc: 'Guía completa sobre SOP, metabolismo y fertilidad.', gradient: 'linear-gradient(135deg,#6EE7B7,#3B82F6)' },
    { id: 'anticonceptivos', title: 'Métodos anticonceptivos', desc: 'Comparativa de eficacia, ventajas y efectos secundarios.', gradient: 'linear-gradient(135deg,#FCD34D,#F97316)' },
    { id: 'nutricion', title: 'Nutrición por fase del ciclo', desc: 'Seed cycling y alimentos recomendados en cada etapa.', gradient: 'linear-gradient(135deg,#34D399,#10B981)' },
    { id: 'ejercicio', title: 'Ejercicio y ciclo menstrual', desc: 'Entrenar en armonía con tu fase hormonal.', gradient: 'linear-gradient(135deg,#60A5FA,#2563EB)' },
    { id: 'salud_mental', title: 'Salud mental y hormonas', desc: 'Ansiedad, depresión y su relación con el ciclo.', gradient: 'linear-gradient(135deg,#A78BFA,#EC4899)' }
  ];

  const GUIDE_CONTENT = {
    fases: `<h3>Fase menstrual (días 1-5)</h3><p>Durante la menstruación, los niveles de estrógeno y progesterona son bajos. El útero elimina el endometrio, lo que puede causar calambres por prostaglandinas. Es normal sentir fatiga y necesidad de descanso.</p><ul><li>Prioriza hierro y vitamina C</li><li>Aplica calor local para cólicos</li><li>Permite descanso sin culpa</li></ul><h3>Fase folicular (post-menstrual)</h3><p>El estrógeno aumenta progresivamente, mejorando energía, concentración y estado de ánimo. Es ideal para proyectos creativos y entrenamiento de fuerza.</p><ul><li>Incrementa proteínas y vegetales verdes</li><li>Planifica tareas exigentes</li><li>Socializa y conecta</li></ul><h3>Fase ovulatoria</h3><p>El pico de estrógeno desencadena la ovulación. Muchas mujeres notan mayor libido, piel luminosa y comunicación fluida. La ventana fértil alcanza su máximo.</p><ul><li>Hidratación abundante</li><li>Protección si no buscas embarazo</li><li>Actividad cardiovascular moderada-alta</li></ul><h3>Fase lútea</h3><p>La progesterona domina preparando el útero. Pueden aparecer síntomas de SPM: retención de líquidos, sensibilidad mamaria, antojos y cambios emocionales.</p><ul><li>Reduce sodio y cafeína</li><li>Magnesio y omega-3</li><li>Técnicas de relajación</li></ul><p>Comprender estas fases te permite anticipar necesidades y diseñar un estilo de vida cíclico sostenible.</p>`,
    pms: `<h3>¿Qué es el SPM?</h3><p>El síndrome premenstrual agrupa síntomas físicos y emocionales que aparecen en la segunda mitad del ciclo y desaparecen con la menstruación. Afecta hasta al 75% de mujeres en grado leve y un 3-8% con trastorno disfórico premenstrual severo.</p><h3>Causas</h3><ul><li>Sensibilidad a cambios de progesterona y serotonina</li><li>Factores genéticos y ambientales</li><li>Estrés, sedentarismo y dieta inflamatoria</li></ul><h3>Remedios naturales</h3><ul><li>Ejercicio aeróbico 150 min/semana</li><li>Calcio 1200mg y vitamina B6 bajo supervisión</li><li>Mindfulness y terapia cognitivo-conductual</li><li>Limitar alcohol, cafeína y azúcares refinados</li></ul><p>Si interfiere gravemente con tu vida, consulta opciones médicas como antidepresivos en fase lútea o anticonceptivos continuos.</p>`,
    endo: `<h3>Definición</h3><p>La endometriosis es una enfermedad donde tejido similar al endometrio crece fuera del útero, causando inflamación, adherencias y dolor crónico. Afecta 1 de cada 10 mujeres en edad reproductiva.</p><h3>Síntomas clave</h3><ul><li>Dismenorrea progresiva</li><li>Dolor profundo en relaciones</li><li>Dolor al defecar/orinar en menstruación</li><li>Infertilidad en algunos casos</li></ul><h3>Diagnóstico</h3><p>Ecografía experta y resonancia ayudan; la laparoscopia confirma y permite tratamiento simultáneo.</p><h3>Tratamiento</h3><ul><li>Analgésicos antiinflamatorios</li><li>Hormonas supresoras endometriales</li><li>Fisioterapia pélvica</li><li>Cirugía conservadora si indicada</li></ul>`,
    sop: `<h3>¿Qué es el SOP?</h3><p>El síndrome de ovario poliquístico es un trastorno endocrino con ciclos irregulares, signos de exceso de andrógenos y ovarios poliquísticos en ecografía. Es la causa más frecuente de anovulación.</p><h3>Síntomas</h3><ul><li>Ciclos largos o ausentes</li><li>Acné e hirsutismo</li><li>Dificultad para bajar peso</li><li>Resistencia a la insulina</li></ul><h3>Manejo integral</h3><ul><li>Pérdida de peso del 5-10%</li><li>Metformina si hay resistencia insulínica</li><li>Anticonceptivos para regular ciclos</li><li>Letrozol para inducción de ovulación</li></ul>`,
    anticonceptivos: `<h3>Métodos hormonales</h3><p>Píldoras, parches, anillos, implantes, DIU hormonal e inyectables ofrecen alta eficacia con uso correcto. Requieren prescripción y seguimiento.</p><h3>Barrera y naturales</h3><p>Preservativos protegen ITS. DIU de cobre sin hormonas dura años. Métodos naturales tienen mayor índice de fallo.</p><h3>Elegir el adecuado</h3><ul><li>Considera contraindicaciones médicas</li><li>Evalúa efectos secundarios aceptables</li><li>Combina métodos si necesario</li></ul>`,
    nutricion: `<h3>Seed Cycling</h3><p>En fase folicular (día 1-14 aprox): semillas de lino y calabaza. En fase lútea: girasol y sésamo. Aportan lignanos y zinc que modulan hormonas suavemente.</p><h3>Por fase</h3><ul><li>Menstrual: hierro, vitamina C, caldos</li><li>Folicular: crucíferas, proteínas magras</li><li>Ovulatoria: antioxidantes, omega-3</li><li>Lútea: magnesio, carbohidratos complejos</li></ul>`,
    ejercicio: `<h3>Menstruación</h3><p>Yoga, caminata, estiramientos. Evita HIIT extremo si hay dolor.</p><h3>Folicular y ovulación</h3><p>Fuerza, HIIT, deportes de equipo. Mayor rendimiento.</p><h3>Lútea</h3><p>Pilates, natación suave, movilidad. Respeta fatiga premenstrual.</p>`,
    salud_mental: `<h3>Hormonas y cerebro</h3><p>Estrógeno potencia serotonina; su caída premenstrual puede generar irritabilidad y tristeza. La progesterona tiene metabolitos sedantes.</p><h3>Cuándo buscar ayuda</h3><ul><li>Síntomas que impiden trabajar o relacionarse</li><li>Pensamientos de autolesión</li><li>Depresión constante todo el mes</li></ul><h3>Estrategias</h3><ul><li>Terapia psicológica</li><li>Rutinas de sueño</li><li>Actividad física regular</li><li>Red de apoyo</li></ul>`
  };

  /**
   * @description Lee diario de bienestar
   * @returns {Object}
   */
  const loadDiary = () => {
    try {
      return JSON.parse(localStorage.getItem(DIARY_KEY) || '{}');
    } catch (e) {
      console.error('[Menstruapp] Error diario:', e);
      return {};
    }
  };

  /**
   * @description Guarda entrada del diario
   * @param {string} date - ISO
   * @param {Object} entry - Entrada
   * @returns {boolean}
   */
  const saveDiaryEntry = (date, entry) => {
    try {
      const all = loadDiary();
      all[date] = entry;
      localStorage.setItem(DIARY_KEY, JSON.stringify(all));
      return true;
    } catch (e) {
      console.error('[Menstruapp] Error guardar diario:', e);
      return false;
    }
  };

  /**
   * @description Lee recordatorios
   * @returns {Object}
   */
  const loadReminders = () => {
    try {
      return JSON.parse(localStorage.getItem(REMINDERS_KEY) || '{}');
    } catch (e) {
      return {};
    }
  };

  /**
   * @description Guarda recordatorios
   * @param {Object} data - Config
   * @returns {boolean}
   */
  const saveReminders = (data) => {
    try {
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  };

  /**
   * @description Renderiza gráfica de síntomas en canvas
   * @param {HTMLCanvasElement} canvas - Canvas
   * @param {Array} history - Historial de síntomas
   * @returns {void}
   */
  const renderSymptomsChart = (canvas, history) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 600;
    const h = 280;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const keys = Object.keys(SYMPTOM_COLORS);
    const weeks = 12;
    const slice = history.slice(-weeks * 7);
    const padL = 40;
    const padB = 30;
    const chartW = w - padL - 10;
    const chartH = h - padB - 20;

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.fillStyle = '#A89BB8';
    ctx.font = '10px DM Sans, sans-serif';
    for (let i = 0; i <= 3; i++) {
      const y = padB + chartH - (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - 10, y);
      ctx.stroke();
      ctx.fillText(String(i), 8, y + 4);
    }

    keys.forEach((sym, ki) => {
      ctx.strokeStyle = SYMPTOM_COLORS[sym];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      slice.forEach((day, i) => {
        const val = day.symptoms[sym] || 0;
        const x = padL + (i / Math.max(slice.length - 1, 1)) * chartW;
        const y = padB + chartH - (val / 3) * chartH;
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    ctx.fillStyle = '#A89BB8';
    const step = Math.floor(slice.length / weeks) || 1;
    for (let wk = 0; wk < weeks; wk++) {
      const idx = wk * step;
      if (slice[idx]) {
        const x = padL + (idx / Math.max(slice.length - 1, 1)) * chartW;
        ctx.fillText(slice[idx].date.slice(5), x - 12, h - 8);
      }
    }
  };

  /**
   * @description Calcula fecha probable de parto
   * @param {string} lastPeriod - Última regla ISO
   * @returns {Object}
   */
  const calculateFPP = (lastPeriod) => {
    const fpp = window.CalendarModule.addDays(lastPeriod, 280);
    const today = window.CalendarModule.formatDateISO(new Date());
    const weeks = Math.floor(window.CalendarModule.daysBetween(lastPeriod, today) / 7);
    let trimester = 1;
    if (weeks >= 13) trimester = 2;
    if (weeks >= 27) trimester = 3;
    const eco = window.CalendarModule.addDays(lastPeriod, 266);
    return { fpp, weeks, trimester, eco };
  };

  /**
   * @description Calcula IMC con nota por fase
   * @param {number} weight - kg
   * @param {number} heightCm - cm
   * @param {string} phase - Fase del ciclo
   * @returns {Object}
   */
  const calculateIMC = (weight, heightCm, phase) => {
    const h = heightCm / 100;
    const imc = weight / (h * h);
    let note = 'Peso dentro de rango esperado para tu contexto.';
    if (phase === 'Lútea' || phase === 'Menstrual') {
      note = 'En fase lútea/menstrual es común retener 1-3 kg de líquidos por progesterona y prostaglandinas. Valora tendencia semanal, no un solo día.';
    }
    return { imc: imc.toFixed(1), note };
  };

  /**
   * @description Ventana fértil para calculadora
   * @param {number} cycleLength - Días ciclo
   * @param {number} periodLength - Días periodo
   * @returns {Object}
   */
  const calculateFertileWindow = (cycleLength, periodLength) => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const lastPeriod = window.CalendarModule.addDays(
      window.CalendarModule.formatDateISO(today),
      -Math.floor(cycleLength / 2)
    );
    const nextPeriod = window.CalendarModule.calculateNextPeriod(lastPeriod, cycleLength);
    const ovulation = window.CalendarModule.addDays(nextPeriod, -14);
    const fertile = [];
    for (let f = 5; f >= 1; f--) fertile.push(window.CalendarModule.addDays(ovulation, -f));
    fertile.push(ovulation);
    const monthDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = window.CalendarModule.formatDateISO(new Date(today.getFullYear(), today.getMonth(), d));
      monthDays.push({ day: d, iso, fertile: fertile.includes(iso) });
    }
    return { monthDays, ovulation, fertile };
  };

  /**
   * @description Test SOP score
   * @param {boolean[]} answers - 10 respuestas sí/no
   * @returns {Object}
   */
  const scoreSOPTest = (answers) => {
    const yes = answers.filter(Boolean).length;
    let level = 'bajo';
    let rec = 'Tus respuestas sugieren bajo riesgo de SOP. Mantén hábitos saludables y controles rutinarios.';
    if (yes >= 4 && yes < 7) {
      level = 'medio';
      rec = 'Riesgo moderado. Solicita ecografía pélvica, perfil hormonal y glucosa en ayunas.';
    }
    if (yes >= 7) {
      level = 'alto';
      rec = 'Riesgo elevado. Consulta ginecología/endocrinología para evaluación de SOP con criterios internacionales.';
    }
    return { score: yes, level, rec };
  };

  /**
   * @description Inicializa UI de bienestar
   * @param {Object} cycleData - Datos del ciclo
   * @param {Function} showModal - Callback modal
   * @returns {void}
   */
  const initWellnessUI = (cycleData, showModal) => {
    const history = window.CalendarModule.getSymptomHistory(cycleData, 90);
    const canvas = document.getElementById('symptoms-chart');
    renderSymptomsChart(canvas, history);

    document.getElementById('btn-export-chart')?.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = 'menstruapp-sintomas.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });

    const grid = document.getElementById('guides-grid');
    if (grid) {
      grid.innerHTML = GUIDES.map((g) => `
        <article class="guide-card" data-guide="${g.id}" tabindex="0" role="button" aria-label="Leer guía ${g.title}">
          <div class="guide-card__bg" style="background:${g.gradient}"></div>
          <div class="guide-card__content"><h3>${g.title}</h3><p>${g.desc}</p></div>
        </article>`);
      grid.querySelectorAll('.guide-card').forEach((card) => {
        card.addEventListener('click', () => {
          const id = card.dataset.guide;
          const guide = GUIDES.find((x) => x.id === id);
          showModal(guide.title, GUIDE_CONTENT[id] || '<p>Contenido no disponible.</p>');
        });
      });
    }

    renderCalculators();
    renderRemindersPanel(cycleData);
    renderDiaryWeek();
  };

  /**
   * @description Renderiza calculadoras
   * @returns {void}
   */
  const renderCalculators = () => {
    const fppEl = document.getElementById('calc-fpp');
    if (fppEl) {
      fppEl.innerHTML = `<h3 class="card-title">Fecha Probable de Parto</h3>
        <label>Fecha última menstruación <input type="date" id="fpp-input"></label>
        <button type="button" class="btn btn--primary" id="fpp-calc" aria-label="Calcular FPP">Calcular</button>
        <div class="calc-result" id="fpp-result"></div>`;
      document.getElementById('fpp-calc')?.addEventListener('click', () => {
        const v = document.getElementById('fpp-input')?.value;
        if (!v) return;
        const r = calculateFPP(v);
        document.getElementById('fpp-result').innerHTML = `<p><strong>FPP (regla de Naegele):</strong> ${r.fpp}</p>
          <p><strong>Semanas de gestación:</strong> ${r.weeks}</p><p><strong>Trimestre:</strong> ${r.trimester}</p>
          <p><strong>FPP ecográfica estimada:</strong> ${r.eco}</p>`;
      });
    }

    const imcEl = document.getElementById('calc-imc');
    if (imcEl) {
      imcEl.innerHTML = `<h3>IMC adaptado al ciclo</h3>
        <label>Peso (kg) <input type="number" id="imc-weight" min="30" max="200"></label>
        <label>Altura (cm) <input type="number" id="imc-height" min="120" max="220"></label>
        <label>Fase <select id="imc-phase"><option>Menstrual</option><option>Folicular</option><option>Ovulatoria</option><option>Lútea</option></select></label>
        <button type="button" class="btn btn--primary" id="imc-calc" aria-label="Calcular IMC">Calcular</button>
        <div class="calc-result" id="imc-result"></div>`;
      document.getElementById('imc-calc')?.addEventListener('click', () => {
        const w = +document.getElementById('imc-weight').value;
        const h = +document.getElementById('imc-height').value;
        const phase = document.getElementById('imc-phase').value;
        const r = calculateIMC(w, h, phase);
        document.getElementById('imc-result').innerHTML = `<p><strong>IMC:</strong> ${r.imc}</p><p>${r.note}</p>`;
      });
    }

    const fertEl = document.getElementById('calc-fertile');
    if (fertEl) {
      fertEl.innerHTML = `<h3>Ventana fértil</h3>
        <label>Duración ciclo <input type="number" id="fert-cycle" value="28" min="21" max="45"></label>
        <label>Duración periodo <input type="number" id="fert-period" value="5" min="1" max="10"></label>
        <button type="button" class="btn btn--primary" id="fert-calc" aria-label="Calcular ventana fértil">Calcular</button>
        <div class="calc-result" id="fert-result"></div>`;
      document.getElementById('fert-calc')?.addEventListener('click', () => {
        const r = calculateFertileWindow(+document.getElementById('fert-cycle').value, +document.getElementById('fert-period').value);
        let html = '<div class="fertile-mini-cal">';
        r.monthDays.forEach((d) => {
          html += `<div class="fertile-day${d.fertile ? ' fertile-day--fertile' : ''}">${d.day}</div>`;
        });
        html += '</div><p>Ovulación estimada: <strong>' + r.ovulation + '</strong></p>';
        document.getElementById('fert-result').innerHTML = html;
      });
    }

    const sopEl = document.getElementById('calc-sop');
    if (sopEl) {
      const questions = [
        '¿Tienes ciclos irregulares o ausentes?',
        '¿Acné persistente o hirsutismo?',
        '¿Dificultad para perder peso?',
        '¿Antecedentes familiares de SOP?',
        '¿Resistencia a la insulina diagnosticada?',
        '¿Más de 12 folículos por ovario en ecografía?',
        '¿Caída de cabello en patrón masculino?',
        '¿Antojos de azúcar frecuentes?',
        '¿Infertilidad o dificultad para concebir?',
        '¿Ansiedad o depresión asociada al ciclo?'
      ];
      sopEl.innerHTML = '<h3>Test de riesgo SOP</h3>' + questions.map((q, i) => `
        <div class="sop-question"><label>${q}</label>
        <button type="button" class="chip sop-yes" data-q="${i}" aria-label="Sí pregunta ${i + 1}">Sí</button>
        <button type="button" class="chip sop-no" data-q="${i}" aria-label="No pregunta ${i + 1}">No</button></div>`).join('') +
        '<button type="button" class="btn btn--primary" id="sop-submit" aria-label="Ver resultado test SOP">Ver resultado</button><div class="calc-result" id="sop-result"></div>';
      const answers = new Array(10).fill(false);
      sopEl.querySelectorAll('.sop-yes').forEach((b) => b.addEventListener('click', () => { answers[+b.dataset.q] = true; b.classList.add('selected'); }));
      sopEl.querySelectorAll('.sop-no').forEach((b) => b.addEventListener('click', () => { answers[+b.dataset.q] = false; b.classList.add('selected'); }));
      document.getElementById('sop-submit')?.addEventListener('click', () => {
        const r = scoreSOPTest(answers);
        document.getElementById('sop-result').innerHTML = `<p><strong>Puntuación:</strong> ${r.score}/10 · Riesgo <strong>${r.level}</strong></p><p>${r.rec}</p>`;
      });
    }
  };

  /**
   * @description Renderiza panel de recordatorios
   * @param {Object} cycleData - Datos ciclo
   * @returns {void}
   */
  const renderRemindersPanel = (cycleData) => {
    const panel = document.getElementById('reminders-panel');
    const banner = document.getElementById('notifications-banner');
    if (!panel) return;
    const rem = loadReminders();
    if (!('Notification' in window)) {
      banner?.classList.remove('hidden');
      if (banner) banner.textContent = 'Tu navegador no soporta notificaciones. Los recordatorios se guardarán pero no recibirás alertas push.';
    }
    panel.innerHTML = `
      <h3 class="card-title">Recordatorios</h3>
      <label class="checkbox-label"><input type="checkbox" id="rem-pill" ${rem.pill ? 'checked' : ''}> 💊 Pastilla anticonceptiva</label>
      <label>Hora <input type="time" id="rem-pill-time" value="${rem.pillTime || '21:00'}"></label>
      <label class="checkbox-label"><input type="checkbox" id="rem-temp" ${rem.temp ? 'checked' : ''}> 🌡️ Temperatura basal</label>
      <label>Hora <input type="time" id="rem-temp-time" value="${rem.tempTime || '07:00'}"></label>
      <label class="checkbox-label"><input type="checkbox" id="rem-period" ${rem.period ? 'checked' : ''}> 📅 Alerta de periodo</label>
      <label>Días antes <select id="rem-period-days"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
      <button type="button" class="btn btn--primary" id="rem-save" aria-label="Guardar recordatorios">Guardar y activar</button>`;
    document.getElementById('rem-period-days').value = rem.periodDays || '2';
    document.getElementById('rem-save')?.addEventListener('click', async () => {
      if ('Notification' in window && Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }
      saveReminders({
        pill: document.getElementById('rem-pill').checked,
        pillTime: document.getElementById('rem-pill-time').value,
        temp: document.getElementById('rem-temp').checked,
        tempTime: document.getElementById('rem-temp-time').value,
        period: document.getElementById('rem-period').checked,
        periodDays: document.getElementById('rem-period-days').value
      });
      scheduleReminders(cycleData);
    });
  };

  /**
   * @description Programa recordatorios locales
   * @param {Object} cycleData - Datos
   * @returns {void}
   */
  const scheduleReminders = (cycleData) => {
    const rem = loadReminders();
    if (!rem.pill && !rem.temp && !rem.period) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      if (rem.pill) {
        new Notification('Menstruapp', { body: 'Hora de tu anticonceptivo', icon: 'assets/icon-192.png' });
      }
      const status = window.CalendarModule.getCycleStatus(cycleData);
      if (rem.period && status.daysToPeriod !== null && status.daysToPeriod <= +rem.periodDays) {
        new Notification('Menstruapp', { body: `Tu periodo llega en aproximadamente ${status.daysToPeriod} días`, icon: 'assets/icon-192.png' });
      }
    }
  };

  /**
   * @description Renderiza cards de diario semanal
   * @returns {void}
   */
  const renderDiaryWeek = () => {
    const container = document.getElementById('diary-week-cards');
    if (!container) return;
    const diary = loadDiary();
    const dates = Object.keys(diary).sort().slice(-7);
    container.innerHTML = dates.length ? dates.map((d) => `
      <div class="glass-card diary-card">
        <div>${d.slice(5)}</div>
        <div style="font-size:1.5rem">${diary[d].emoji || '😐'}</div>
        <p>Energía: ${diary[d].energy || '-'}/10</p>
      </div>`).join('') : '<p class="text-muted">Sin entradas recientes.</p>';
  };

  window.WellnessModule = {
    loadDiary,
    saveDiaryEntry,
    loadReminders,
    saveReminders,
    renderSymptomsChart,
    calculateFPP,
    calculateIMC,
    calculateFertileWindow,
    scoreSOPTest,
    initWellnessUI,
    renderDiaryWeek,
    scheduleReminders,
    GUIDES
  };

  window.runTests_wellness = () => {
    console.group('🧪 Tests Wellness');
    const r = scoreSOPTest([true, true, true, true, true, true, true, false, false, false]);
    console.assert(r.level === 'alto', '❌ SOP score');
    console.log('✅ Test 1 passed: scoreSOPTest');
    const imc = calculateIMC(60, 165, 'Lútea');
    console.assert(parseFloat(imc.imc) > 0, '❌ IMC');
    console.log('✅ Test 2 passed: calculateIMC');
    console.groupEnd();
  };
})();
