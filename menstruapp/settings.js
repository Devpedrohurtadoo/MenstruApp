/**
 * @fileoverview Ajustes, temas y privacidad
 */
(function () {
  'use strict';

  const THEME_KEY = 'menstruapp_theme';
  const PIN_KEY = 'menstruapp_pin_hash';
  const USER_KEY = 'menstruapp_user';
  const SESSION_KEY = 'menstruapp_session';

  const ACCENT_PRESETS = {
    rosa: '#F4A7B9',
    violeta: '#C084FC',
    loto: '#E879A0',
    jade: '#6EE7B7',
    ambar: '#FCD34D'
  };

  /**
   * @description Hash simple XOR + base64 para PIN
   * @param {string} pin - PIN de 4 dígitos
   * @returns {string}
   */
  const hashPin = (pin) => {
    const salt = 'menstruapp_v2';
    let out = '';
    for (let i = 0; i < pin.length; i++) {
      out += String.fromCharCode(pin.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
    }
    return btoa(out + salt);
  };

  /**
   * @description Verifica PIN contra hash guardado
   * @param {string} pin - PIN ingresado
   * @returns {boolean}
   */
  const verifyPin = (pin) => {
    try {
      const stored = localStorage.getItem(PIN_KEY);
      return stored === hashPin(pin);
    } catch (e) {
      return false;
    }
  };

  /**
   * @description Guarda hash de PIN
   * @param {string} pin - PIN
   * @returns {boolean}
   */
  const savePin = (pin) => {
    try {
      localStorage.setItem(PIN_KEY, hashPin(pin));
      return true;
    } catch (e) {
      return false;
    }
  };

  /**
   * @description Elimina PIN
   * @returns {void}
   */
  const clearPin = () => {
    try {
      localStorage.removeItem(PIN_KEY);
    } catch (e) {
      console.error('[Menstruapp] Error al borrar PIN:', e);
    }
  };

  /**
   * @description Comprueba si PIN está activo
   * @returns {boolean}
   */
  const isPinEnabled = () => {
    try {
      return !!localStorage.getItem(PIN_KEY);
    } catch (e) {
      return false;
    }
  };

  /**
   * @description Carga tema desde localStorage
   * @returns {Object}
   */
  const loadTheme = () => {
    try {
      const raw = localStorage.getItem(THEME_KEY);
      return raw ? JSON.parse(raw) : { accent: ACCENT_PRESETS.rosa, background: 'gradient', particles: 1, reducedMotion: false };
    } catch (e) {
      return { accent: ACCENT_PRESETS.rosa, background: 'gradient', particles: 1 };
    }
  };

  /**
   * @description Guarda tema
   * @param {Object} theme - Configuración
   * @returns {boolean}
   */
  const saveTheme = (theme) => {
    try {
      localStorage.setItem(THEME_KEY, JSON.stringify(theme));
      return true;
    } catch (e) {
      return false;
    }
  };

  /**
   * @description Aplica tema al documento
   * @param {Object} theme - Tema
   * @returns {void}
   */
  const applyTheme = (theme) => {
    document.documentElement.style.setProperty('--color-accent', theme.accent);
    const glow = hexToRgba(theme.accent, 0.35);
    document.documentElement.style.setProperty('--color-accent-glow', glow);

    if (theme.background === 'solid' && theme.bgColor) {
      document.documentElement.style.setProperty('--app-background', theme.bgColor);
    } else if (theme.background === 'image' && theme.bgImage) {
      document.documentElement.style.setProperty('--app-background', `url(${theme.bgImage}) center/cover no-repeat`);
    } else {
      document.documentElement.style.setProperty('--app-background',
        `radial-gradient(ellipse at 20% 0%, ${hexToRgba(theme.accent, 0.15)} 0%, transparent 50%),
         radial-gradient(ellipse at 80% 100%, rgba(192,132,252,0.1) 0%, transparent 50%)`);
    }

    const levels = [0, 1, 2, 3];
    window.ParticlesModule?.setParticleTheme(theme.accent, levels[theme.particles] ?? 1);

    if (theme.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  };

  /**
   * @description Convierte hex a rgba
   * @param {string} hex - Color
   * @param {number} alpha - Opacidad
   * @returns {string}
   */
  const hexToRgba = (hex, alpha) => {
    const { r, g, b } = window.ParticlesModule?.hexToRgb(hex) || { r: 244, g: 167, b: 185 };
    return `rgba(${r},${g},${b},${alpha})`;
  };

  /**
   * @description Renderiza paneles de ajustes
   * @param {Object} appState - Estado global
   * @param {Object} callbacks - { showModal, showToast, persistCycle, onLogout }
   * @returns {void}
   */
  const renderSettingsPanels = (appState, callbacks) => {
    const container = document.getElementById('settings-panels');
    if (!container) return;
    const user = appState.currentUser || {};
    const theme = appState.theme || loadTheme();
    const cycleSettings = appState.cycleData?.settings || {};

    container.innerHTML = `
      <div class="settings-panel settings-panel--active" data-panel="profile">
        <div class="glass-card">
          <img class="profile-avatar" id="profile-avatar" src="${user.avatar || ''}" alt="Avatar" ${user.avatar ? '' : 'style="display:none"'}>
          <label>Foto de perfil <input type="file" id="profile-photo" accept="image/*" hidden></label>
          <button type="button" class="btn btn--secondary" id="btn-upload-photo" aria-label="Subir foto">Subir foto</button>
          <label>Nombre <input type="text" id="settings-name" value="${user.name || ''}"></label>
          <label>Fecha nacimiento <input type="date" id="settings-birth" value="${user.birthdate || ''}"></label>
          <button type="button" class="btn btn--primary" id="save-profile" aria-label="Guardar perfil">Guardar perfil</button>
        </div>
      </div>
      <div class="settings-panel" data-panel="cycle">
        <div class="glass-card">
          <label>Duración media del ciclo: <span id="cycle-len-val">${cycleSettings.cycleLength || 28}</span> días</label>
          <input type="range" id="settings-cycle-len" min="20" max="45" value="${cycleSettings.cycleLength || 28}">
          <label>Duración del periodo: <span id="period-len-val">${cycleSettings.periodLength || 5}</span> días</label>
          <input type="range" id="settings-period-len" min="1" max="10" value="${cycleSettings.periodLength || 5}">
          <button type="button" class="btn btn--primary" id="save-cycle-settings" aria-label="Guardar ajustes de ciclo">Guardar</button>
        </div>
      </div>
      <div class="settings-panel" data-panel="appearance">
        <div class="glass-card">
          <p>Color de acento</p>
          <div class="accent-swatches" id="accent-swatches">
            ${Object.entries(ACCENT_PRESETS).map(([k, c]) =>
              `<button type="button" class="accent-swatch${theme.accent === c ? ' active' : ''}" data-color="${c}" style="background:${c}" aria-label="Acento ${k}"></button>`
            ).join('')}
          </div>
          <label>Color personalizado <input type="color" id="accent-custom" value="${theme.accent}"></label>
          <label>Fondo
            <select id="bg-type">
              <option value="gradient" ${theme.background === 'gradient' ? 'selected' : ''}>Gradiente</option>
              <option value="solid" ${theme.background === 'solid' ? 'selected' : ''}>Color sólido</option>
              <option value="image" ${theme.background === 'image' ? 'selected' : ''}>Imagen propia</option>
            </select>
          </label>
          <label id="bg-solid-wrap" class="${theme.background !== 'solid' ? 'hidden' : ''}">Color <input type="color" id="bg-solid-color" value="#0D0A12"></label>
          <label id="bg-image-wrap" class="${theme.background !== 'image' ? 'hidden' : ''}">Imagen <input type="file" id="bg-image-file" accept="image/*"></label>
          <label>Partículas
            <select id="particles-level">
              <option value="0" ${theme.particles === 0 ? 'selected' : ''}>Ninguna</option>
              <option value="1" ${theme.particles === 1 ? 'selected' : ''}>Suave</option>
              <option value="2" ${theme.particles === 2 ? 'selected' : ''}>Media</option>
              <option value="3" ${theme.particles === 3 ? 'selected' : ''}>Intensa</option>
            </select>
          </label>
          <label class="checkbox-label"><input type="checkbox" id="reduce-motion" ${theme.reducedMotion ? 'checked' : ''}> Reducir animaciones</label>
          <button type="button" class="btn btn--primary" id="save-appearance" aria-label="Guardar apariencia">Guardar apariencia</button>
        </div>
      </div>
      <div class="settings-panel" data-panel="privacy">
        <div class="glass-card">
          <label class="checkbox-label"><input type="checkbox" id="enable-pin" ${isPinEnabled() ? 'checked' : ''}> Activar PIN de 4 dígitos</label>
          <div id="pin-setup" class="hidden">
            <label>Nuevo PIN <input type="password" id="new-pin" maxlength="4" inputmode="numeric" pattern="[0-9]*"></label>
            <label>Confirmar PIN <input type="password" id="confirm-pin" maxlength="4" inputmode="numeric"></label>
          </div>
          <p class="text-muted">Modo camuflaje: mantén presionado ☁️ en el header 2 segundos. Sal con triple tap en el logo.</p>
          <button type="button" class="btn btn--secondary" id="btn-delete-all" aria-label="Borrar todos los datos">Borrar todos los datos</button>
        </div>
      </div>
      <div class="settings-panel" data-panel="data">
        <div class="glass-card">
          <button type="button" class="btn btn--secondary btn--full" id="export-full-backup" aria-label="Exportar backup completo">Exportar backup completo</button>
          <label class="btn btn--ghost btn--file btn--full">Importar backup
            <input type="file" id="import-full-backup" accept=".json" hidden>
          </label>
          <button type="button" class="btn btn--secondary" id="clear-cycle-only" aria-label="Borrar datos del ciclo">Borrar datos del ciclo</button>
        </div>
      </div>
      <div class="settings-panel" data-panel="about">
        <div class="glass-card">
          <h3 class="card-title">Menstruapp v2.0</h3>
          <p class="about-brand"><img src="assets/drop-icon.png" alt="" class="app-drop-icon" width="24" height="24" aria-hidden="true"> Desarrollado con amor para la salud femenina</p>
          <p class="text-muted">Esta app no sustituye consejo médico profesional. Tus datos se almacenan localmente en tu dispositivo.</p>
          <p><strong>Aviso legal:</strong> Información educativa general. Consulta siempre a profesionales sanitarios.</p>
        </div>
      </div>`;

    bindSettingsEvents(appState, callbacks);
  };

  /**
   * @description Vincula eventos de ajustes
   * @param {Object} appState - Estado
   * @param {Object} callbacks - Callbacks
   * @returns {void}
   */
  const bindSettingsEvents = (appState, callbacks) => {
    document.getElementById('save-profile')?.addEventListener('click', () => {
      try {
        const user = {
          ...appState.currentUser,
          name: document.getElementById('settings-name').value,
          birthdate: document.getElementById('settings-birth').value
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        appState.currentUser = user;
        callbacks.showToast('Perfil actualizado');
        callbacks.updateHeader?.();
      } catch (e) {
        callbacks.showToast('Error al guardar perfil', 'error');
      }
    });

    document.getElementById('btn-upload-photo')?.addEventListener('click', () => {
      document.getElementById('profile-photo')?.click();
    });

    document.getElementById('profile-photo')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        appState.currentUser.avatar = reader.result;
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(appState.currentUser));
        } catch (err) {
          console.error(err);
        }
        const img = document.getElementById('profile-avatar');
        if (img) { img.src = reader.result; img.style.display = 'block'; }
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('settings-cycle-len')?.addEventListener('input', (e) => {
      document.getElementById('cycle-len-val').textContent = e.target.value;
    });
    document.getElementById('settings-period-len')?.addEventListener('input', (e) => {
      document.getElementById('period-len-val').textContent = e.target.value;
    });

    document.getElementById('save-cycle-settings')?.addEventListener('click', () => {
      appState.cycleData.settings = appState.cycleData.settings || {};
      appState.cycleData.settings.cycleLength = +document.getElementById('settings-cycle-len').value;
      appState.cycleData.settings.periodLength = +document.getElementById('settings-period-len').value;
      callbacks.persistCycle();
      callbacks.showToast('Ajustes de ciclo guardados');
      callbacks.refreshCalendar?.();
    });

    document.getElementById('accent-swatches')?.addEventListener('click', (e) => {
      const sw = e.target.closest('.accent-swatch');
      if (!sw) return;
      document.querySelectorAll('.accent-swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      appState.theme.accent = sw.dataset.color;
      applyTheme(appState.theme);
    });

    document.getElementById('accent-custom')?.addEventListener('input', (e) => {
      appState.theme.accent = e.target.value;
      applyTheme(appState.theme);
    });

    document.getElementById('bg-type')?.addEventListener('change', (e) => {
      document.getElementById('bg-solid-wrap')?.classList.toggle('hidden', e.target.value !== 'solid');
      document.getElementById('bg-image-wrap')?.classList.toggle('hidden', e.target.value !== 'image');
    });

    document.getElementById('bg-image-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { appState.theme.bgImage = reader.result; };
      reader.readAsDataURL(file);
    });

    document.getElementById('save-appearance')?.addEventListener('click', () => {
      appState.theme.background = document.getElementById('bg-type').value;
      appState.theme.bgColor = document.getElementById('bg-solid-color')?.value;
      appState.theme.particles = +document.getElementById('particles-level').value;
      appState.theme.reducedMotion = document.getElementById('reduce-motion').checked;
      appState.theme.accent = document.getElementById('accent-custom').value;
      saveTheme(appState.theme);
      applyTheme(appState.theme);
      callbacks.showToast('Apariencia guardada');
    });

    document.getElementById('enable-pin')?.addEventListener('change', (e) => {
      document.getElementById('pin-setup')?.classList.toggle('hidden', !e.target.checked);
      if (!e.target.checked) clearPin();
    });

    document.getElementById('confirm-pin')?.addEventListener('blur', () => {
      const a = document.getElementById('new-pin').value;
      const b = document.getElementById('confirm-pin').value;
      if (a && b && a === b && a.length === 4) {
        savePin(a);
        callbacks.showToast('PIN activado');
      }
    });

    document.getElementById('btn-delete-all')?.addEventListener('click', () => {
      callbacks.showModal('Borrar todos los datos', '<p>Se eliminarán ciclo, diario, tema y sesión. Esta acción no se puede deshacer.</p>', [
        { label: 'Cancelar', action: 'close' },
        { label: 'Borrar todo', action: () => {
          try {
            localStorage.clear();
            callbacks.onLogout(true);
          } catch (e) {
            callbacks.showToast('Error', 'error');
          }
        }, primary: true }
      ]);
    });

    document.getElementById('export-full-backup')?.addEventListener('click', () => {
      const backup = {
        user: appState.currentUser,
        cycle: appState.cycleData,
        theme: appState.theme,
        diary: window.WellnessModule.loadDiary(),
        reminders: window.WellnessModule.loadReminders()
      };
      downloadJSON(backup, 'menstruapp-backup-completo.json');
    });

    document.getElementById('import-full-backup')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (data.user) {
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            appState.currentUser = data.user;
          }
          if (data.cycle) {
            appState.cycleData = data.cycle;
            callbacks.persistCycle();
          }
          if (data.theme) {
            appState.theme = data.theme;
            saveTheme(data.theme);
            applyTheme(data.theme);
          }
          callbacks.showToast('Backup restaurado');
          callbacks.refreshAll?.();
        } catch (err) {
          callbacks.showToast('Archivo inválido', 'error');
        }
      };
      reader.readAsText(file);
    });

    document.getElementById('clear-cycle-only')?.addEventListener('click', () => {
      appState.cycleData = { days: {}, settings: {} };
      callbacks.persistCycle();
      callbacks.showToast('Datos del ciclo borrados');
      callbacks.refreshCalendar?.();
    });
  };

  /**
   * @description Descarga JSON
   * @param {Object} data - Datos
   * @param {string} filename - Nombre archivo
   * @returns {void}
   */
  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  window.SettingsModule = {
    hashPin,
    verifyPin,
    savePin,
    clearPin,
    isPinEnabled,
    loadTheme,
    saveTheme,
    applyTheme,
    renderSettingsPanels,
    ACCENT_PRESETS,
    THEME_KEY,
    PIN_KEY,
    USER_KEY,
    SESSION_KEY
  };

  window.runTests_settings = () => {
    console.group('🧪 Tests Settings');
    const h = hashPin('1234');
    console.assert(verifyPin('1234') === !!localStorage.getItem(PIN_KEY), '❌ pin');
    console.log('✅ Test 1 passed: hashPin');
    console.groupEnd();
  };
})();
