# Menstruapp

PWA (Progressive Web App) de seguimiento menstrual y salud femenina integral: calendario de ciclo con predicciones, registro diario de síntomas, asistente de salud local ("Luna"), módulo de bienestar (diario, guías, calculadoras, recordatorios), tema y fondo personalizables, modo PIN/discreto, y más.

Es HTML/CSS/JavaScript puro (sin framework ni build step): se puede servir tal cual desde cualquier hosting estático, incluido Netlify, y se instala en el móvil como app (`Compartir → Añadir a pantalla de inicio` / `Instalar app`).

> **Estado del proyecto:** en desarrollo activo siguiendo la especificación de [`PROMPT_MENSTRUAPP_IA.md`](./PROMPT_MENSTRUAPP_IA.md). La sección [Roadmap](#roadmap) de más abajo refleja qué fases están completas y cuáles quedan pendientes.

## Ejecutar en local

No requiere build. Basta con servir la carpeta como sitio estático:

```bash
npx --yes serve .
# o, si usas la extensión Live Server de VS Code, con la carpeta abierta como workspace
```

Abre la URL que te indique (por defecto algo como `http://localhost:3000`) — `crypto.subtle` (usado para el PIN y las contraseñas) requiere un **contexto seguro**, y `localhost` cuenta como tal, igual que cualquier dominio HTTPS en producción.

También puedes abrir `preview-mobile.html` para ver la app enmarcada como si fuera un móvil mientras desarrollas.

## Tests

```bash
npm install
npm test
```

Usa [Vitest](https://vitest.dev). Por ahora cubre la lógica pura y crítica de seguridad (`crypto-utils.js`, `pin-lockout.js`); ampliar la cobertura a más módulos es parte del roadmap (Fase 6).

## Seguridad

Los datos de esta app son de salud íntima, así que se tratan con el máximo cuidado posible dentro de las limitaciones de una app 100% cliente (sin servidor):

- **Sin credenciales hardcodeadas.** Versiones anteriores incluían una cuenta de acceso (`beta@menstruapp.com` / `beta123`) y un atajo de "PIN olvidado" con esa misma contraseña fija, visibles en el código fuente de cualquier instalación. Se eliminaron por completo: cualquier backdoor en código servido al cliente es, por definición, público.
- **Contraseña y PIN nunca en texto plano.** Se derivan y verifican con PBKDF2-SHA256 (210 000 iteraciones, salt aleatorio por registro) vía [WebCrypto](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API) — ver `crypto-utils.js`. Sustituye al esquema anterior (XOR + base64 con salt fijo), que era trivialmente reversible.
- **Bloqueo por intentos fallidos de PIN** con backoff exponencial (`pin-lockout.js`): tras 5 intentos fallidos, la app bloquea el teclado un tiempo creciente. Mitiga adivinar el PIN desde la propia interfaz.
- **Límite honesto:** todo esto es lógica que corre en el navegador de la propia usuaria; no protege frente a alguien con acceso físico/depurador al mismo dispositivo y sesión ya iniciada, ni sustituye a cifrar los datos en reposo (ciclo, diario) — eso es la Fase 2 del roadmap, todavía no implementada. Hoy esos datos siguen en `localStorage` sin cifrar, igual que en versiones previas.
- Si encuentras un problema de seguridad, o algo en este documento ya no describe el código actual, abre un issue antes de asumir que sigue siendo así.

## Estructura

```
index.html            Marcado de la app (pantallas de auth/PIN, dashboard, calendario, chat, bienestar, ajustes)
app.js                Controlador principal: navegación, auth, drawer de registro, PIN, camuflaje
calendar.js           Cálculo de ciclo, predicciones y marcas de calendario
coach.js              Motor de respuestas local de "Luna" (basado en reglas, sin llamadas externas)
wellness.js           Diario, guías educativas, calculadoras (FPP, IMC, ventana fértil, test SOP), recordatorios
settings.js           Tema/fondo personalizables, PIN, panel de ajustes, backup/restore
particles.js          Fondo animado de partículas (Canvas)
crypto-utils.js       Hashing (PBKDF2) y cifrado (AES-GCM) vía WebCrypto — sin dependencias de DOM
pin-lockout.js        Lógica pura de bloqueo por intentos fallidos de PIN — sin dependencias de DOM
styles.css            Estilos (tema con variables CSS, glassmorphism, responsive)
assets/               Iconos y assets de marca
tests/                Tests unitarios (Vitest)
preview-mobile.html   Vista previa de desarrollo enmarcada como móvil (no forma parte de la app en producción)
```

## Aviso legal

Menstruapp ofrece información educativa general y no sustituye el consejo, diagnóstico o tratamiento de profesionales sanitarios. Ante cualquier duda o síntoma persistente, consulta a un/a profesional.

## Roadmap

Fases según [`PROMPT_MENSTRUAPP_IA.md`](./PROMPT_MENSTRUAPP_IA.md):

- [x] **Fase 1 — Seguridad crítica y saneado del repo:** eliminación de credenciales hardcodeadas, hashing PBKDF2 real de PIN/contraseña, bloqueo por intentos, eliminación de la carpeta duplicada `menstruapp/`, tooling de tests.
- [ ] **Fase 2 — Cifrado en reposo:** migrar ciclo/diario de JSON plano en `localStorage` a almacenamiento cifrado (AES-GCM) en IndexedDB.
- [ ] **Fase 3 — Funcionalidades core pendientes:** modos de uso (embarazo, posparto, menopausia...), auto-bloqueo por inactividad, biometría (WebAuthn), exportación a PDF.
- [ ] **Fase 4 — Funcionalidades avanzadas:** compartir acceso de solo lectura, integraciones de salud opcionales, detección de patrones irregulares.
- [ ] **Fase 5 — PWA técnica y Netlify:** manifest completo con iconos maskable/512, Service Worker con caché offline real, `netlify.toml` con cabeceras de seguridad.
- [ ] **Fase 6 — Accesibilidad, i18n, testing e2e y auditoría final:** WCAG 2.1 AA, es/en, Playwright, Lighthouse.
