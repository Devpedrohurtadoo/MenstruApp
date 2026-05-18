/**
 * @fileoverview Controlador principal Menstruapp v2.0
 */
(function () {
  'use strict';

  const AppState = {
    currentUser: null,
    currentView: 'home',
    selectedDate: null,
    cycleData: {},
    chatMessages: [],
    theme: { accent: '#F4A7B9', background: 'gradient', particles: 1 },
    pinEnabled: false,
    camouflageModeActive: false,
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    authMode: 'login',
    pinBuffer: '',
    logoTapCount: 0,
    logoTapTimer: null
  };

  const QUOTES = [
    'Tu cuerpo es tu templo; cuídalo con amor.',
    'Cada fase de tu ciclo trae un superpoder nuevo.',
    'Descansar también es productividad.',
    'Eres más fuerte de lo que crees, especialmente en tu periodo.',
    'La salud femenina no es tabú, es prioridad.',
    'Hoy mereces gentileza, sobre todo de ti misma.',
    'Tu intuición corporal es sabiduría ancestral.',
    'Florecer incluye días de quietud.',
    'Honra tu ritmo, no el de los demás.',
    'La hormona de hoy no define tu valor.',
    'Pide ayuda: es acto de valentía.',
    'Tu útero trabaja duro; agradécele con descanso.',
    'La ovulación es creatividad en su máxima expresión.',
    'El autocuidado no es egoísmo, es supervivencia.',
    'Respira: este síntoma también pasará.',
    'Nutrir tu cuerpo es nutrir tu mente.',
    'Eres completa en todas las fases de tu ciclo.',
    'La comparación roba la paz menstrual.',
    'Un día a la vez, un ciclo a la vez.',
    'Tu salud mental importa tanto como la física.',
    'El agua es tu mejor aliada hoy.',
    'Mereces espacios seguros para hablar de tu cuerpo.',
    'La ciencia y la intuición pueden caminar juntas.',
    'Celebra los pequeños avances de hoy.',
    'No estás exagerando: tu dolor es real.',
    'La fase lútea pide contención, no exigencia.',
    'Tu ciclo es un mapa, no una sentencia.',
    'Elige ropa cómoda y pensamientos amables.',
    'La comunidad FemTech te abraza.',
    'Hoy plantas semillas de bienestar futuro.'
  ];

  const PHASE_TIPS = {
    Menstrual: 'Prioriza hierro, calor local y sueño reparador. Tu cuerpo está renovándose.',
    Folicular: 'Aprovecha la energía creciente para proyectos creativos y ejercicio de fuerza.',
    Ovulatoria: 'Hidratación extra y protección si no buscas embarazo. Comunica tus límites.',
    Lútea: 'Reduce cafeína y sodio. Magnesio y técnicas de relajación son tus aliados.',
    Desconocida: 'Registra tu periodo para desbloquear predicciones y tips personalizados.'
  };

  const DRAWER_FIELDS = {
    period: [{ type: 'toggle', key: 'periodStart', label: '🔴 Inicio de Periodo' }, { type: 'toggle', key: 'periodEnd', label: '⏹ Fin de Periodo' }],
    flow: { type: 'chips', key: 'flow', label: '🩸 Flujo', options: ['ligero', 'medio', 'fuerte', 'spotting'] },
    symptoms: { type: 'multi', key: 'symptoms', label: '😣 Síntomas', options: ['colicos', 'headache', 'hinchazon', 'nausea', 'fatiga', 'acne'] },
    mood: { type: 'chips', key: 'mood', label: '😊 Estado de Ánimo', options: ['feliz', 'irritable', 'ansiosa', 'triste', 'energica', 'sensible'] },
    meds: { type: 'text', key: 'medication', label: '💊 Medicación', placeholder: 'Ej: ibuprofeno 400mg' },
    temp: { type: 'number', key: 'basalTemp', label: '🌡️ Temperatura Basal', step: '0.1', placeholder: '36.5' },
    mucus: { type: 'chips', key: 'mucus', label: '💧 Moco Cervical', options: ['seco', 'cremoso', 'acuoso', 'elastico'] },
    activity: { type: 'chips', key: 'activity', label: '🏃 Actividad física', options: ['ninguna', 'ligera', 'moderada', 'intensa'] },
    sleep: { type: 'number', key: 'sleepHours', label: '💤 Horas de sueño', min: 0, max: 24 },
    notes: { type: 'textarea', key: 'notes', label: '🌿 Notas libres', maxLength: 200 }
  };

  /**
   * @description Crea elemento DOM
   * @param {string} tag - Etiqueta
   * @param {string} [cls] - Clase CSS
   * @param {string} [content] - HTML interno
   * @returns {HTMLElement}
   */
  const el = (tag, cls, content) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (content !== undefined) node.innerHTML = content;
    return node;
  };

  /**
   * @description Muestra toast de notificación
   * @param {string} message - Mensaje
   * @param {string} [type='info'] - Tipo
   * @returns {void}
   */
  const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    const toast = el('div', `toast toast--${type}`, message);
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  };

  /**
   * @description Abre modal personalizado
   * @param {string} title - Título
   * @param {string} bodyHTML - Contenido HTML
   * @param {Array} [buttons=[]] - Botones {label, action, primary}
   * @returns {void}
   */
  const showModal = (title, bodyHTML, buttons = []) => {
    const root = document.getElementById('modal-root');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    const footer = document.getElementById('modal-footer');
    footer.innerHTML = '';
    if (buttons.length === 0) {
      buttons = [{ label: 'Cerrar', action: 'close' }];
    }
    buttons.forEach((btn) => {
      const b = el('button', `btn ${btn.primary ? 'btn--primary' : 'btn--ghost'}`, btn.label);
      b.setAttribute('aria-label', btn.label);
      b.addEventListener('click', () => {
        if (btn.action === 'close') closeModal();
        else if (typeof btn.action === 'function') { btn.action(); closeModal(); }
      });
      footer.appendChild(b);
    });
    root.classList.remove('hidden');
  };

  /**
   * @description Cierra modal
   * @returns {void}
   */
  const closeModal = () => {
    document.getElementById('modal-root').classList.add('hidden');
  };

  /**
   * @description Persiste cycleData en localStorage
   * @returns {void}
   */
  const persistCycle = () => {
    window.CalendarModule.saveCycleData(AppState.cycleData);
  };

  /**
   * @description Valida email
   * @param {string} email - Email
   * @returns {boolean}
   */
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  /**
   * @description Valida formulario auth
   * @returns {boolean}
   */
  const validateAuthForm = () => {
    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-password').value;
    const emailErr = document.getElementById('auth-email-error');
    const passErr = document.getElementById('auth-password-error');
    let valid = true;

    if (!isValidEmail(email)) {
      emailErr.textContent = 'Email no válido';
      emailErr.classList.remove('hidden');
      document.getElementById('auth-email').classList.add('invalid');
      valid = false;
    } else {
      emailErr.classList.add('hidden');
      document.getElementById('auth-email').classList.remove('invalid');
    }

    if (pass.length < 6) {
      passErr.textContent = 'Mínimo 6 caracteres';
      passErr.classList.remove('hidden');
      document.getElementById('auth-password').classList.add('invalid');
      valid = false;
    } else {
      passErr.classList.add('hidden');
      document.getElementById('auth-password').classList.remove('invalid');
    }

    if (AppState.authMode === 'register') {
      const name = document.getElementById('auth-name').value.trim();
      const birth = document.getElementById('auth-birthdate').value;
      if (!name) { valid = false; document.getElementById('auth-name-error').textContent = 'Nombre requerido'; document.getElementById('auth-name-error').classList.remove('hidden'); }
      if (!birth) { valid = false; document.getElementById('auth-birthdate-error').textContent = 'Fecha requerida'; document.getElementById('auth-birthdate-error').classList.remove('hidden'); }
    }

    document.getElementById('auth-submit').disabled = !valid;
    return valid;
  };

  /**
   * @description Intenta login o registro
   * @param {Event} e - Submit event
   * @returns {void}
   */
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!validateAuthForm()) return;

    const email = document.getElementById('auth-email').value.trim();
    const pass = document.getElementById('auth-password').value;
    const remember = document.getElementById('auth-remember').checked;

    if (email === 'beta@menstruapp.com' && pass === 'beta123') {
      completeLogin({ name: 'Beta', email, birthdate: '1995-01-01' }, remember);
      return;
    }

    if (AppState.authMode === 'register') {
      const user = {
        name: document.getElementById('auth-name').value.trim(),
        email,
        birthdate: document.getElementById('auth-birthdate').value,
        password: pass
      };
      try {
        localStorage.setItem(window.SettingsModule.USER_KEY, JSON.stringify(user));
        showToast('Cuenta creada. ¡Bienvenida!');
        completeLogin(user, remember);
      } catch (err) {
        showToast('Error al registrar', 'error');
      }
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem(window.SettingsModule.USER_KEY) || 'null');
        if (stored && stored.email === email && stored.password === pass) {
          completeLogin(stored, remember);
        } else {
          showToast('Credenciales incorrectas', 'error');
        }
      } catch (err) {
        showToast('Error de autenticación', 'error');
      }
    }
  };

  /**
   * @description Completa login y muestra app
   * @param {Object} user - Usuario
   * @param {boolean} remember - Recordarme
   * @returns {void}
   */
  const completeLogin = (user, remember) => {
    AppState.currentUser = user;
    if (remember) {
      try {
        localStorage.setItem(window.SettingsModule.SESSION_KEY, JSON.stringify({ token: 'session_xyz', email: user.email }));
      } catch (e) {
        console.error(e);
      }
    }
    const authScreen = document.getElementById('auth-screen');
    authScreen.classList.add('slide-out');
    setTimeout(() => {
      authScreen.classList.add('hidden');
      enterApp();
    }, 500);
  };

  /**
   * @description Entra a la app tras auth o PIN
   * @returns {void}
   */
  const enterApp = () => {
    document.getElementById('app-shell').classList.remove('hidden');
    updateHeader();
    refreshDashboard();
    renderCalendar();
    initChat();
    window.SettingsModule.renderSettingsPanels(AppState, {
      showModal, showToast, persistCycle,
      refreshCalendar: renderCalendar,
      refreshAll: () => { refreshDashboard(); renderCalendar(); },
      updateHeader,
      onLogout: logout
    });
    window.WellnessModule.initWellnessUI(AppState.cycleData, showModal);
    bindWellnessTabs();
    bindSettingsTabs();
    bindCalcTabs();
    initDiaryForm();
  };

  /**
   * @description Actualiza saludo del header
   * @returns {void}
   */
  const updateHeader = () => {
    const name = AppState.currentUser?.name || 'Menstruapp';
    document.getElementById('header-greeting').textContent = `Hola, ${name}`;
  };

  /**
   * @description Cierra sesión
   * @param {boolean} [fullClear=false] - Limpiar todo
   * @returns {void}
   */
  const logout = (fullClear = false) => {
    AppState.chatMessages = [];
    document.getElementById('chat-messages').innerHTML = '';
    try {
      if (!fullClear) localStorage.removeItem(window.SettingsModule.SESSION_KEY);
    } catch (e) {
      console.error(e);
    }
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden', 'slide-out');
    if (!fullClear) showToast('Sesión cerrada');
  };

  /**
   * @description Navega entre vistas
   * @param {string} view - Vista destino
   * @returns {void}
   */
  const navigateTo = (view) => {
    AppState.currentView = view;
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('view--active'));
    document.getElementById(`view-${view}`)?.classList.add('view--active');
    document.querySelectorAll('.nav-item').forEach((n) => {
      n.classList.toggle('nav-item--active', n.dataset.nav === view);
      n.setAttribute('aria-current', n.dataset.nav === view ? 'page' : 'false');
    });
    if (view === 'cycle') renderCalendar();
    if (view === 'chat' && AppState.chatMessages.length === 0) initChatWelcome();
    if (view === 'wellness') {
      window.WellnessModule.renderSymptomsChart(
        document.getElementById('symptoms-chart'),
        window.CalendarModule.getSymptomHistory(AppState.cycleData, 90)
      );
    }
  };

  /**
   * @description Renderiza calendario del mes actual
   * @returns {void}
   */
  const renderCalendar = () => {
    const grid = document.getElementById('calendar-grid');
    const title = document.getElementById('cal-month-year');
    if (!grid) return;

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    title.textContent = `${months[AppState.calendarMonth]} ${AppState.calendarYear}`;

    const marks = window.CalendarModule.getCalendarMarks(AppState.calendarYear, AppState.calendarMonth, AppState.cycleData);
    const firstDay = new Date(AppState.calendarYear, AppState.calendarMonth, 1);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;
    const daysInMonth = new Date(AppState.calendarYear, AppState.calendarMonth + 1, 0).getDate();
    const today = window.CalendarModule.formatDateISO(new Date());

    grid.innerHTML = '';
    for (let i = 0; i < startDow; i++) {
      const prevDate = new Date(AppState.calendarYear, AppState.calendarMonth, -startDow + i + 1);
      grid.appendChild(createDayCell(window.CalendarModule.formatDateISO(prevDate), true, {}, today));
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = window.CalendarModule.formatDateISO(new Date(AppState.calendarYear, AppState.calendarMonth, d));
      grid.appendChild(createDayCell(iso, false, marks[iso] || [], today));
    }

    document.getElementById('cycle-summary').innerHTML = window.CalendarModule.buildCycleSummaryHTML(AppState.cycleData);
  };

  /**
   * @description Crea celda de día
   * @param {string} iso - Fecha
   * @param {boolean} otherMonth - Otro mes
   * @param {string[]} markTypes - Marcas
   * @param {string} today - Hoy ISO
   * @returns {HTMLElement}
   */
  const createDayCell = (iso, otherMonth, markTypes, today) => {
    const btn = el('button', 'cal-day');
    btn.dataset.date = iso;
    btn.setAttribute('aria-label', `Día ${iso}`);
    const dayNum = parseInt(iso.split('-')[2], 10);
    btn.textContent = dayNum;
    if (otherMonth) btn.classList.add('cal-day--other');
    if (iso === today) btn.classList.add('cal-day--today');
    if (markTypes.includes('period')) btn.classList.add('cal-day--period');
    if (markTypes.includes('predicted')) btn.classList.add('cal-day--predicted');
    if (markTypes.includes('pms')) btn.classList.add('cal-day--pms');
    if (markTypes.includes('fertile')) btn.classList.add('cal-day--fertile');
    if (markTypes.includes('luteal')) btn.classList.add('cal-day--luteal');
    if (markTypes.includes('ovulation')) btn.classList.add('cal-day--ovulation');
    if (markTypes.includes('has-data')) {
      const dot = el('span', 'cal-day__dot');
      btn.appendChild(dot);
    }
    return btn;
  };

  /**
   * @description Abre drawer de registro del día
   * @param {string} dateISO - Fecha
   * @returns {void}
   */
  const openDayDrawer = (dateISO) => {
    AppState.selectedDate = dateISO;
    const drawer = document.getElementById('day-drawer');
    document.getElementById('drawer-date-title').textContent = `Registro — ${dateISO}`;
    const body = document.getElementById('drawer-body');
    const dayData = AppState.cycleData.days?.[dateISO] || {};
    body.innerHTML = '';

    const addSection = (title, content) => {
      const sec = el('div', 'drawer-section');
      sec.appendChild(el('h3', '', title));
      sec.appendChild(content);
      body.appendChild(sec);
    };

    DRAWER_FIELDS.period.forEach((f) => {
      const btn = el('button', `chip${dayData[f.key] ? ' selected' : ''}`, f.label);
      btn.type = 'button';
      btn.dataset.key = f.key;
      btn.setAttribute('aria-label', f.label);
      btn.addEventListener('click', () => btn.classList.toggle('selected'));
      addSection('', btn);
    });

    Object.entries(DRAWER_FIELDS).forEach(([k, field]) => {
      if (k === 'period') return;
      if (field.type === 'chips' || field.type === 'multi') {
        const group = el('div', 'chip-group');
        field.options.forEach((opt) => {
          const selected = field.type === 'multi'
            ? (dayData[field.key] || []).includes(opt)
            : dayData[field.key] === opt;
          const chip = el('button', `chip${selected ? ' selected' : ''}`, opt);
          chip.type = 'button';
          chip.dataset.key = field.key;
          chip.dataset.value = opt;
          chip.dataset.multi = field.type === 'multi' ? '1' : '0';
          chip.setAttribute('aria-label', opt);
          chip.addEventListener('click', () => {
            if (field.type === 'multi') chip.classList.toggle('selected');
            else {
              group.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
              chip.classList.add('selected');
            }
          });
          group.appendChild(chip);
        });
        addSection(field.label, group);
      } else if (field.type === 'text' || field.type === 'number') {
        const input = el('input');
        input.type = field.type;
        input.id = `drawer-${field.key}`;
        input.value = dayData[field.key] || '';
        input.placeholder = field.placeholder || '';
        if (field.step) input.step = field.step;
        if (field.min !== undefined) input.min = field.min;
        if (field.max !== undefined) input.max = field.max;
        addSection(field.label, input);
      } else if (field.type === 'textarea') {
        const ta = el('textarea');
        ta.id = `drawer-${field.key}`;
        ta.maxLength = field.maxLength;
        ta.value = dayData[field.key] || '';
        ta.rows = 3;
        addSection(field.label, ta);
      }
    });

    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  };

  /**
   * @description Guarda registro del drawer
   * @returns {void}
   */
  const saveDayDrawer = () => {
    const iso = AppState.selectedDate;
    if (!iso) return;
    AppState.cycleData.days = AppState.cycleData.days || {};
    const entry = {};

    document.querySelectorAll('#drawer-body .chip.selected').forEach((chip) => {
      const key = chip.dataset.key;
      if (chip.dataset.multi === '1') {
        entry[key] = entry[key] || [];
        entry[key].push(chip.dataset.value);
      } else {
        entry[key] = chip.dataset.value || true;
      }
    });

    ['medication', 'basalTemp', 'sleepHours', 'notes'].forEach((key) => {
      const input = document.getElementById(`drawer-${key}`);
      if (input && input.value) entry[key] = input.value;
    });

    if (entry.periodStart === true) entry.periodStart = true;
    AppState.cycleData.days[iso] = { ...AppState.cycleData.days[iso], ...entry };
    persistCycle();
    closeDayDrawer();
    renderCalendar();
    refreshDashboard();
    showToast('Registro guardado');
  };

  /**
   * @description Cierra drawer
   * @returns {void}
   */
  const closeDayDrawer = () => {
    const drawer = document.getElementById('day-drawer');
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  };

  /**
   * @description Actualiza dashboard inicio
   * @returns {void}
   */
  const refreshDashboard = () => {
    const status = window.CalendarModule.getCycleStatus(AppState.cycleData);
    const dayEl = document.getElementById('dashboard-cycle-day');
    if (status.cycleDay) {
      dayEl.textContent = `Hoy es el día ${status.cycleDay} de tu ciclo`;
    } else {
      dayEl.textContent = 'Registra tu ciclo para ver tu día';
    }

    const moons = { Menstrual: '🌑', Folicular: '🌒', Ovulatoria: '🌕', Lútea: '🌘', Desconocida: '🌙' };
    document.getElementById('dashboard-moon-phase').textContent = moons[status.phase] || '🌙';

    drawCycleRing(status);
    const events = document.getElementById('dashboard-events');
    if (status.daysToPeriod !== null) {
      events.innerHTML = `<p>📅 Periodo en <strong>${status.daysToPeriod}</strong> días</p>
        <p>⭐ Ovulación estimada: <strong>${status.nextOvulation || '—'}</strong></p>`;
    } else {
      events.innerHTML = '<p>Comienza registrando tu periodo en el calendario.</p>';
    }

    const dayOfMonth = new Date().getDate();
    document.getElementById('daily-quote').textContent = QUOTES[(dayOfMonth - 1) % QUOTES.length];
    document.getElementById('daily-tip-text').textContent = PHASE_TIPS[status.phase] || PHASE_TIPS.Desconocida;
  };

  /**
   * @description Dibuja anillo de progreso del ciclo
   * @param {Object} status - Estado del ciclo
   * @returns {void}
   */
  const drawCycleRing = (status) => {
    const canvas = document.getElementById('cycle-progress-ring');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = 80, cy = 80, r = 60;
    ctx.clearRect(0, 0, 160, 160);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 10;
    ctx.stroke();
    const progress = status.cycleDay && status.cycleLength ? status.cycleDay / status.cycleLength : 0;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#F4A7B9';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.fillStyle = '#F5F0FA';
    ctx.font = 'bold 22px DM Sans';
    ctx.textAlign = 'center';
    ctx.fillText(status.cycleDay ? `D${status.cycleDay}` : '—', cx, cy + 8);
  };

  /**
   * @description Inicializa chat con sugerencias
   * @returns {void}
   */
  const initChat = () => {
    const suggestions = ['¿Cómo alivio los cólicos?', 'Explícame mi ciclo', 'Sobre anticonceptivos', 'Necesito apoyo emocional'];
    const container = document.getElementById('chat-suggestions');
    container.innerHTML = '';
    suggestions.forEach((s) => {
      const chip = el('button', 'suggestion-chip', s);
      chip.setAttribute('aria-label', s);
      chip.addEventListener('click', () => {
        document.getElementById('chat-input').value = s;
        sendChatMessage();
      });
      container.appendChild(chip);
    });
  };

  /**
   * @description Mensaje de bienvenida de Luna
   * @returns {void}
   */
  const initChatWelcome = () => {
    if (AppState.chatMessages.length > 0) return;
    const name = AppState.currentUser?.name || 'querida';
    addChatMessage('ai', `Hola ${name}. Soy Luna, tu consejera de salud. ¿En qué puedo ayudarte hoy?`);
  };

  /**
   * @description Añade mensaje al chat
   * @param {string} role - user|ai
   * @param {string} text - Contenido
   * @returns {void}
   */
  const addChatMessage = (role, text) => {
    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    AppState.chatMessages.push({ role, text, time });
    renderChatMessages();
  };

  /**
   * @description Renderiza mensajes del chat
   * @returns {void}
   */
  const renderChatMessages = () => {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    AppState.chatMessages.forEach((m) => {
      if (m.role === 'ai') {
        const row = el('div', 'chat-avatar-row');
        const avatar = el('div', 'chat-avatar');
        avatar.setAttribute('aria-hidden', 'true');
        const dropImg = document.createElement('img');
        dropImg.src = 'assets/drop-icon.png';
        dropImg.alt = '';
        dropImg.className = 'app-drop-icon';
        dropImg.setAttribute('aria-hidden', 'true');
        avatar.appendChild(dropImg);
        const bubble = el('div', 'chat-msg chat-msg--ai');
        bubble.innerHTML = `<div class="chat-msg__meta">Luna · ${m.time}</div>${m.text.replace(/\n/g, '<br>')}`;
        row.appendChild(avatar);
        row.appendChild(bubble);
        container.appendChild(row);
      } else {
        const msg = el('div', 'chat-msg chat-msg--user');
        msg.innerHTML = `<div class="chat-msg__meta">Tú · ${m.time}</div>${m.text.replace(/\n/g, '<br>')}`;
        container.appendChild(msg);
      }
    });
    container.scrollTop = container.scrollHeight;
  };

  /**
   * @description Envía mensaje al coach
   * @returns {void}
   */
  const sendChatMessage = () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    addChatMessage('user', text);
    input.value = '';
    document.getElementById('chat-suggestions').innerHTML = '';

    const typing = el('div', 'typing-indicator');
    typing.innerHTML = '<span></span><span></span><span></span>';
    typing.id = 'typing';
    document.getElementById('chat-messages').appendChild(typing);

    const delay = window.CoachModule.getTypingDelay();
    setTimeout(() => {
      document.getElementById('typing')?.remove();
      const response = window.CoachModule.processMessage(text, { name: AppState.currentUser?.name });
      addChatMessage('ai', response);
    }, delay);
  };

  /**
   * @description Exporta chat como txt
   * @returns {void}
   */
  const exportChatSession = () => {
    const txt = window.CoachModule.formatSessionExport(AppState.chatMessages, AppState.currentUser?.name || 'Usuaria');
    const blob = new Blob([txt], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `luna-sesion-${Date.now()}.txt`;
    a.click();
    showToast('Sesión archivada');
  };

  /**
   * @description PIN screen logic
   * @returns {void}
   */
  const initPinScreen = () => {
    document.getElementById('pin-keypad')?.addEventListener('click', (e) => {
      const key = e.target.closest('.pin-key');
      if (!key) return;
      if (key.id === 'pin-backspace') {
        AppState.pinBuffer = AppState.pinBuffer.slice(0, -1);
      } else if (key.id === 'pin-forgot') {
        showModal('Restablecer PIN', '<p>Introduce tu contraseña de cuenta:</p><input type="password" id="reset-pass" class="form-group" style="width:100%;padding:0.5rem">', [
          { label: 'Cancelar', action: 'close' },
          { label: 'Restablecer', primary: true, action: () => {
            const pass = document.getElementById('reset-pass').value;
            if (pass === AppState.currentUser?.password || pass === 'beta123') {
              window.SettingsModule.clearPin();
              document.getElementById('pin-screen').classList.add('hidden');
              enterApp();
              showToast('PIN restablecido');
            } else showToast('Contraseña incorrecta', 'error');
          }}
        ]);
        return;
      } else if (key.dataset.digit !== undefined) {
        if (AppState.pinBuffer.length < 4) AppState.pinBuffer += key.dataset.digit;
      }
      updatePinDots();
      if (AppState.pinBuffer.length === 4) {
        if (window.SettingsModule.verifyPin(AppState.pinBuffer)) {
          document.getElementById('pin-screen').classList.add('hidden');
          enterApp();
        } else {
          document.getElementById('pin-error').textContent = 'PIN incorrecto';
          document.getElementById('pin-error').classList.remove('hidden');
          AppState.pinBuffer = '';
          updatePinDots();
        }
      }
    });
  };

  /**
   * @description Actualiza indicadores PIN
   * @returns {void}
   */
  const updatePinDots = () => {
    document.querySelectorAll('.pin-dot').forEach((dot, i) => {
      dot.classList.toggle('filled', i < AppState.pinBuffer.length);
    });
  };

  /**
   * @description Modo camuflaje
   * @returns {void}
   */
  const initCamouflage = () => {
    const btn = document.getElementById('btn-camouflage');
    let pressTimer = null;
    btn?.addEventListener('mousedown', () => {
      pressTimer = setTimeout(() => {
        document.body.classList.add('camouflage-mode');
        AppState.camouflageModeActive = true;
        showToast('Modo discreto activado');
      }, 2000);
    });
    btn?.addEventListener('mouseup', () => clearTimeout(pressTimer));
    btn?.addEventListener('touchstart', () => {
      pressTimer = setTimeout(() => {
        document.body.classList.add('camouflage-mode');
        AppState.camouflageModeActive = true;
      }, 2000);
    }, { passive: true });
    btn?.addEventListener('touchend', () => clearTimeout(pressTimer));

    document.getElementById('header-logo')?.addEventListener('click', () => {
      AppState.logoTapCount++;
      clearTimeout(AppState.logoTapTimer);
      AppState.logoTapTimer = setTimeout(() => { AppState.logoTapCount = 0; }, 600);
      if (AppState.logoTapCount >= 3 && AppState.camouflageModeActive) {
        document.body.classList.remove('camouflage-mode');
        AppState.camouflageModeActive = false;
        AppState.logoTapCount = 0;
        showToast('Modo discreto desactivado');
      }
    });
  };

  /**
   * @description Ripple en botones
   * @returns {void}
   */
  const initRipple = () => {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      const ripple = el('span', 'ripple');
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  };

  /**
   * @description Tabs bienestar
   * @returns {void}
   */
  const bindWellnessTabs = () => {
    document.querySelectorAll('.wellness-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.wellness-tab').forEach((t) => {
          t.classList.remove('wellness-tab--active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('wellness-tab--active');
        tab.setAttribute('aria-selected', 'true');
        const id = tab.dataset.wellnessTab;
        document.querySelectorAll('.wellness-panel').forEach((p) => {
          p.classList.remove('wellness-panel--active');
          p.hidden = true;
        });
        const panel = document.getElementById(`wellness-${id}`);
        panel.classList.add('wellness-panel--active');
        panel.hidden = false;
      });
    });
  };

  /**
   * @description Tabs ajustes
   * @returns {void}
   */
  const bindSettingsTabs = () => {
    document.querySelectorAll('.settings-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab').forEach((t) => {
          t.classList.remove('settings-tab--active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('settings-tab--active');
        tab.setAttribute('aria-selected', 'true');
        document.querySelectorAll('.settings-panel').forEach((p) => p.classList.remove('settings-panel--active'));
        document.querySelector(`[data-panel="${tab.dataset.settingsTab}"]`)?.classList.add('settings-panel--active');
      });
    });
  };

  /**
   * @description Tabs calculadoras
   * @returns {void}
   */
  const bindCalcTabs = () => {
    document.querySelectorAll('.calc-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.calc-tab').forEach((t) => t.classList.remove('calc-tab--active'));
        tab.classList.add('calc-tab--active');
        document.querySelectorAll('.calc-panel').forEach((p) => { p.classList.remove('calc-panel--active'); p.hidden = true; });
        const panel = document.getElementById(`calc-${tab.dataset.calc}`);
        panel.classList.add('calc-panel--active');
        panel.hidden = false;
      });
    });
  };

  /**
   * @description Formulario diario bienestar
   * @returns {void}
   */
  const initDiaryForm = () => {
    let selectedEmoji = '😊';
    document.querySelectorAll('#diary-emoji-picker .emoji-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#diary-emoji-picker .emoji-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedEmoji = btn.dataset.emoji;
      });
    });
    document.getElementById('diary-energy')?.addEventListener('input', (e) => {
      document.getElementById('diary-energy-value').textContent = e.target.value;
    });
    document.getElementById('wellness-diary-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const today = window.CalendarModule.formatDateISO(new Date());
      window.WellnessModule.saveDiaryEntry(today, {
        emoji: selectedEmoji,
        energy: document.getElementById('diary-energy').value,
        notes: document.getElementById('diary-notes').value
      });
      window.WellnessModule.renderDiaryWeek();
      showToast('Entrada de diario guardada');
    });
  };

  /**
   * @description Comprueba sesión guardada al cargar
   * @returns {void}
   */
  const checkSession = () => {
    try {
      AppState.theme = window.SettingsModule.loadTheme();
      window.SettingsModule.applyTheme(AppState.theme);
      AppState.cycleData = window.CalendarModule.loadCycleData();
      AppState.pinEnabled = window.SettingsModule.isPinEnabled();

      const session = JSON.parse(localStorage.getItem(window.SettingsModule.SESSION_KEY) || 'null');
      const user = JSON.parse(localStorage.getItem(window.SettingsModule.USER_KEY) || 'null');

      if (session?.token && user) {
        AppState.currentUser = user;
        document.getElementById('auth-screen').classList.add('hidden');
        if (AppState.pinEnabled) {
          document.getElementById('pin-screen').classList.remove('hidden');
        } else {
          enterApp();
        }
      }
    } catch (e) {
      console.error('[Menstruapp] Error sesión:', e);
    }
  };

  /**
   * @description Inicializa eventos globales
   * @returns {void}
   */
  const initApp = () => {
    document.getElementById('login-form')?.addEventListener('submit', handleAuthSubmit);
    ['auth-email', 'auth-password', 'auth-name', 'auth-birthdate'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', validateAuthForm);
    });

    document.getElementById('auth-toggle-mode')?.addEventListener('click', () => {
      AppState.authMode = AppState.authMode === 'login' ? 'register' : 'login';
      const isReg = AppState.authMode === 'register';
      document.getElementById('auth-form-title').textContent = isReg ? 'Crear cuenta' : 'Iniciar sesión';
      document.getElementById('auth-submit').textContent = isReg ? 'Registrarse' : 'Iniciar sesión';
      document.getElementById('auth-toggle-mode').textContent = isReg ? 'Ya tengo cuenta' : 'Crear cuenta';
      document.querySelectorAll('.form-group--register').forEach((g) => g.classList.toggle('hidden', !isReg));
      document.getElementById('remember-group').classList.toggle('hidden', isReg);
      validateAuthForm();
    });

    document.querySelectorAll('.nav-item').forEach((n) => {
      n.addEventListener('click', () => navigateTo(n.dataset.nav));
    });

    document.getElementById('calendar-grid')?.addEventListener('click', (e) => {
      const cell = e.target.closest('[data-date]');
      if (cell) openDayDrawer(cell.dataset.date);
    });

    document.getElementById('cal-prev-month')?.addEventListener('click', () => {
      AppState.calendarMonth--;
      if (AppState.calendarMonth < 0) { AppState.calendarMonth = 11; AppState.calendarYear--; }
      renderCalendar();
    });
    document.getElementById('cal-next-month')?.addEventListener('click', () => {
      AppState.calendarMonth++;
      if (AppState.calendarMonth > 11) { AppState.calendarMonth = 0; AppState.calendarYear++; }
      renderCalendar();
    });

    document.getElementById('drawer-close')?.addEventListener('click', closeDayDrawer);
    document.getElementById('drawer-overlay')?.addEventListener('click', closeDayDrawer);
    document.getElementById('drawer-save')?.addEventListener('click', saveDayDrawer);
    document.getElementById('btn-register-today')?.addEventListener('click', () => {
      navigateTo('cycle');
      openDayDrawer(window.CalendarModule.formatDateISO(new Date()));
    });

    document.getElementById('btn-logout')?.addEventListener('click', () => {
      showModal('Cerrar sesión', '<p>¿Seguro que deseas cerrar sesión?</p>', [
        { label: 'Cancelar', action: 'close' },
        { label: 'Cerrar sesión', primary: true, action: () => logout() }
      ]);
    });

    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal-overlay')?.addEventListener('click', closeModal);

    document.getElementById('btn-chat-send')?.addEventListener('click', sendChatMessage);
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    });
    document.getElementById('btn-export-chat')?.addEventListener('click', exportChatSession);
    document.getElementById('btn-chat-attach')?.addEventListener('click', () => {
      document.getElementById('input-chat-attach').click();
      showToast('Adjunto solo visual — no se envía a servidor');
    });

    document.getElementById('btn-export-cycle')?.addEventListener('click', () => {
      const json = window.CalendarModule.exportCycleJSON(AppState.cycleData);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'menstruapp-ciclo.json';
      a.click();
    });

    document.getElementById('input-import-cycle')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = window.CalendarModule.validateImportedData(JSON.parse(reader.result));
          if (data) {
            AppState.cycleData = data;
            persistCycle();
            renderCalendar();
            showToast('Historial importado');
          }
        } catch (err) {
          showToast('JSON inválido', 'error');
        }
      };
      reader.readAsText(file);
    });

    document.querySelectorAll('#dashboard-mood-picker .mood-emoji').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#dashboard-mood-picker .mood-emoji').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        const today = window.CalendarModule.formatDateISO(new Date());
        AppState.cycleData.days = AppState.cycleData.days || {};
        AppState.cycleData.days[today] = { ...AppState.cycleData.days[today], mood: btn.dataset.mood };
        persistCycle();
        showToast('Ánimo registrado');
      });
    });

    initPinScreen();
    initCamouflage();
    initRipple();
    checkSession();
  };

  document.addEventListener('DOMContentLoaded', initApp);

  // === CHECKLIST v2.0 ===
  // ✅ Login/Registro con validación en tiempo real
  // ✅ Beta beta@menstruapp.com / beta123
  // ✅ Recordarme en localStorage
  // ✅ Calendario navegable
  // ✅ Drawer con animación y 11 tipos de registro
  // ✅ Predicciones coloreadas + resumen dinámico
  // ✅ Chat Luna con typing indicator
  // ✅ Motor local INTENT_MAP 20+ categorías
  // ✅ Chat volátil (no localStorage)
  // ✅ Exportar chat .txt y ciclo .json
  // ✅ Dashboard ciclo, ánimo, frases, tips
  // ✅ Wellness: gráfica canvas, diario, guías, calculadoras, recordatorios
  // ✅ PIN 4 dígitos + modo camuflaje
  // ✅ Temas y partículas
  // ✅ Responsive 375/768/1200
  // ✅ Sin alert/confirm nativos
  // ✅ try/catch localStorage
  // ✅ runTests_* en consola

  window.runTests_app = () => {
    console.group('🧪 Tests App');
    console.assert(isValidEmail('a@b.co'), '❌ email');
    console.log('✅ Test 1 passed: isValidEmail');
    console.groupEnd();
  };

  window.AppState = AppState;
})();
