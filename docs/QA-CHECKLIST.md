# Checklist de QA antes de publicar

Dos partes: lo **automático** (bloquea el despliegue si falla; se ejecuta en CI y en cada build de Netlify) y lo **manual**, que conviene marcar en un **móvil Android (Chrome)** y un **iPhone (Safari, app instalada)** en cada versión importante, porque ningún test sustituye al dispositivo real.

## Resultado de la última verificación

<!-- qa-results -->

## 0. Automático (bloquea el despliegue si falla)

- [ ] `npm run build` en verde (sello del service worker, ESLint con reglas de seguridad, tests unitarios). Es lo que ejecuta Netlify: si falla, no se publica nada.
- [ ] `npm run typecheck` sin errores (TypeScript estricto sobre JSDoc).
- [ ] `npm run test:e2e` en verde (onboarding, bloqueo, registro, calendario, navegación rápida, cifrado en reposo, offline, instalabilidad, actualización de versión, axe en claro/oscuro, Luna, idiomas, copia/borrado/restauración, embarazo, PDF, sync y enlaces).
- [ ] CI de GitHub en verde: además de lo anterior, `npm audit --omit=dev` sin vulnerabilidades altas y el service worker sellado con el contenido actual.

## 1. Instalación y PWA

- [ ] Android: aparece «Instalar», el icono adaptativo se ve bien (sin recortes) y abre a pantalla completa.
- [ ] iPhone: «Añadir a pantalla de inicio» muestra el icono y la pantalla de carga correctos; la barra de estado no tapa contenido (notch / isla dinámica).
- [ ] Accesos directos (mantener pulsado el icono): «Registrar hoy» abre el registro del día; «Calendario» y «Luna» abren su pantalla.
- [ ] Modo avión tras la primera visita: la app abre, se desbloquea y funciona (incluidas Aprende y Luna).
- [ ] Nueva versión publicada: aparece el aviso «Hay una nueva versión» y «Actualizar» recarga sin perder datos.

## 2. Primer uso y seguridad

- [ ] Onboarding completo en cada modo (seguir ciclo, buscar embarazo, evitar embarazo, embarazo, posparto, perimenopausia).
- [ ] El código de recuperación se puede copiar y descargar; no se puede continuar sin marcar «Lo he guardado».
- [ ] PIN incorrecto → mensaje; tras varios fallos → espera progresiva que sobrevive a recargar.
- [ ] Recuperación con el código → obliga a crear un PIN nuevo y emite un código nuevo (el anterior deja de funcionar).
- [ ] Biometría (si el dispositivo la admite): activar, bloquear, desbloquear con huella/rostro.
- [ ] Bloqueo automático por inactividad y «Bloquear al salir de la app».
- [ ] Pantalla segura: la calculadora funciona y volver exige desbloquear.
- [ ] Varios perfiles: cada uno con su PIN; los datos no se mezclan.

## 3. Registro y predicciones

- [ ] «Me ha venido la regla» registra hoy; el anillo pasa a día 1.
- [ ] Registro diario: todas las secciones guardan (flujo, síntomas con 3 intensidades, ánimo, energía, temperatura con validación, moco, LH, test, relaciones, medicación, sueño, agua, ejercicio, peso, notas) y el cierre guarda automáticamente.
- [ ] Calendario: «Editar regla» marca/desmarca días; flechas y teclado recorren los días; no se pueden registrar días futuros.
- [ ] Con 3+ ciclos, las predicciones y la ventana fértil son coherentes con el calendario y el anillo.
- [ ] Avisos: retraso ≥ 5 días, sangrado abundante, sangrado entre reglas, síntomas de alarma (fiebre, desmayo, dolor intenso) muestran la tarjeta adecuada y enlazan al artículo.

## 4. Recordatorios

- [ ] Permiso de notificaciones; notificación de prueba.
- [ ] Recordatorio de píldora con pauta 21+7: no suena en la semana de descanso.
- [ ] Notificaciones discretas: el texto no menciona la regla ni la salud.
- [ ] (Con VAPID configurado) Avisos con la app cerrada: llegan a su hora.

## 5. Datos

- [ ] Copia cifrada → borrar todo → restaurar: todo vuelve (días, ajustes, recordatorios).
- [ ] Exportar CSV y abrirlo en una hoja de cálculo; importar un CSV de otra app.
- [ ] Informe PDF: se abre en el visor del móvil, con acentos correctos y paginación.
- [ ] Sincronización entre dos dispositivos (añadir un día en uno, aparece en el otro; borrar también se propaga).
- [ ] Enlace para compartir: se abre en otro navegador, caduca y se puede revocar.

## 6. Apariencia y accesibilidad

- [ ] Tema claro/oscuro/automático, cada color principal y un color personalizado de bajo contraste (debe ajustarse solo).
- [ ] Fondos predefinidos, color sólido e imagen propia (se reduce; se puede quitar).
- [ ] Texto al 160 %: nada se corta ni se solapa.
- [ ] Lector de pantalla (TalkBack / VoiceOver): anillo, calendario, chips y diálogos se anuncian correctamente.
- [ ] «Reducir movimiento» del sistema desactiva animaciones y partículas.
- [ ] Pantalla de 320 px de ancho: sin desplazamiento horizontal.

## 7. Contenido

- [ ] Español e inglés: sin claves sin traducir ni textos cortados.
- [ ] Luna: preguntas sugeridas, preguntas personales, y frases de crisis/violencia muestran los teléfonos de ayuda.
- [ ] Artículos: enlaces relacionados y «Cuándo consultar».

## 8. Seguridad: OWASP Top 10

Mapeo con la edición 2021 del [OWASP Top 10](https://owasp.org/Top10/) y las dos categorías nuevas de la edición 2025. «Test» indica qué prueba automática lo vigila; lo demás se revisa en cada auditoría de código.

| Riesgo                                                     | Cómo lo mitiga Menstruapp                                                                                                                                                                                                                                                                           | Verificación                                                                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A01 Control de acceso roto**                             | Sin cuentas: cada perfil es una bóveda cifrada local. El API funciona por capacidades (tokens aleatorios de 256 bits; el servidor solo guarda su hash) y cada ruta exige el token de su recurso; revocar un enlace exige un token de borrado distinto; solo se aceptan peticiones del mismo origen. | Test: `tests/unit/api.test.js` (sin token, token ajeno, origen cruzado).                                                                                  |
| **A02 Fallos criptográficos**                              | AES-256-GCM por registro (IV aleatorio, id del registro como AAD), PBKDF2-SHA256 de 600 000 iteraciones, HKDF para separar claves, ids opacos con HMAC, HSTS. El servidor solo recibe datos cifrados en el dispositivo.                                                                             | Tests: `security.test.js`, `data.test.js`; e2e «datos cifrados en reposo» (las notas no aparecen en IndexedDB ni en `localStorage`).                      |
| **A03 Inyección (XSS, fórmulas…)**                         | DOM construido con nodos (ESLint prohíbe `innerHTML`, `eval`…), Trusted Types obligatorios, CSP sin `unsafe-inline`/`unsafe-eval`, `safeUrl` en todo `href`/`src`, validación de esquemas en importaciones y sincronización, CSV exportado con neutralización de fórmulas (`= + - @`).              | ESLint en CI; tests `static.test.js` (CSP idéntica en cabecera y `<meta>`), `validate.test.js`, `data.test.js`; e2e sin violaciones de CSP/Trusted Types. |
| **A04 Diseño inseguro**                                    | Modelo de amenazas documentado (`docs/SECURITY.md`), local-first, privacidad por defecto, funciones con servidor opcionales y con consentimiento, bloqueo progresivo, código de recuperación que rota tras usarse, «pantalla segura».                                                               | Revisión de diseño; e2e de bloqueo, recuperación y pantalla segura.                                                                                       |
| **A05 Configuración de seguridad incorrecta**              | Cabeceras estrictas en `public/_headers` (CSP, HSTS, `X-Frame-Options`, COOP/CORP, `Permissions-Policy`, `nosniff`); API con `no-store` y CSP `default-src 'none'`; errores sin detalles internos.                                                                                                  | Tests: `static.test.js` (cabeceras y CSP), e2e «cabeceras de seguridad».                                                                                  |
| **A06 Componentes vulnerables u obsoletos**                | Frontend sin dependencias de terceros en ejecución (fuentes e iconos autoalojados); backend con dos dependencias (`@netlify/blobs`, `web-push`).                                                                                                                                                    | CI: `npm audit --omit=dev --audit-level=high`.                                                                                                            |
| **A07 Fallos de identificación y autenticación**           | PIN/contraseña derivados con PBKDF2, intentos limitados con espera progresiva persistente, biometría con WebAuthn PRF, bloqueo automático y al salir, recuperación de 160 bits.                                                                                                                     | Tests: `security.test.js` (bloqueo, recuperación); e2e de PIN erróneo y recuperación.                                                                     |
| **A08 Fallos de integridad de software y datos**           | Service worker con precarga versionada por hash de contenido; las actualizaciones esperan a que la usuaria pulse «Actualizar»; copias y sincronización autenticadas con AES-GCM (un archivo manipulado no se importa); `npm ci` con lockfile; ningún script de CDN.                                 | Tests: `static.test.js` (sello del SW), e2e de actualización y de copia/restauración.                                                                     |
| **A09 Fallos de registro y monitorización**                | Por privacidad no se registran cuerpos, tokens ni datos personales; los errores del API devuelven códigos genéricos y quedan en los logs de funciones de Netlify; los 429 limitan abusos.                                                                                                           | Revisión de código. Si se despliega en producción, conviene activar las alertas de funciones de Netlify.                                                  |
| **A10 SSRF**                                               | Las suscripciones push solo se aceptan hacia servicios en lista blanca (FCM, Mozilla, Apple, WNS), por HTTPS en el puerto 443 y sin credenciales; se revalida antes de cada envío.                                                                                                                  | Test: `api.test.js` (endpoints rechazados).                                                                                                               |
| **2025 · Fallos en la cadena de suministro**               | Dependencias mínimas y fijadas en `package-lock.json`, instalación con `npm ci`, sin recursos externos en tiempo de ejecución (un test e2e falla si la app pide algo fuera de su origen).                                                                                                           | CI (`npm ci`, `npm audit`); e2e «sin peticiones a terceros».                                                                                              |
| **2025 · Gestión incorrecta de condiciones excepcionales** | Fallo cerrado: sin Web Crypto la app no arranca en modo inseguro; un error de descifrado deja la bóveda bloqueada; IndexedDB se autorrepara si falta el esquema; el API responde con códigos genéricos.                                                                                             | Tests: `data.test.js` (esquema), `security.test.js` (secretos erróneos).                                                                                  |

Revisión manual de seguridad en cada versión importante:

- [ ] Las cabeceras del sitio publicado coinciden con `public/_headers` (por ejemplo con las herramientas de desarrollo o [securityheaders.com](https://securityheaders.com)).
- [ ] En las herramientas de desarrollo → Application → IndexedDB no se ve ningún dato de salud legible.
- [ ] Con el móvil en modo avión y la app bloqueada no se puede acceder a ningún dato sin el PIN.

## 9. Accesibilidad (WCAG 2.2 AA)

Automático: axe-core recorre en tema claro y oscuro la bienvenida, las pantallas principales, los ajustes, el registro diario, los diálogos y la pantalla de bloqueo. Manual (sección 6): lector de pantalla, texto grande, 320 px y movimiento reducido.

- [ ] Navegación completa con teclado externo (Tab, flechas en calendario y selectores, Escape cierra diálogos) con el foco siempre visible.
- [ ] Contraste suficiente también con un color principal personalizado y con imagen de fondo.

## 10. Rendimiento

Presupuesto: primera visita con 4G lenta simulada, LCP < 3,5 s, TBT < 200 ms y CLS < 0,1; visitas siguientes servidas desde la caché del service worker (arranque sin red).

- [ ] Lighthouse (móvil) del sitio publicado: Rendimiento ≥ 90 y el resto de categorías en 100.
- [ ] Un móvil de gama baja abre la app instalada en menos de 2 s y el calendario se desplaza con fluidez.

## 11. PWA e instalabilidad

Automático: el test de instalabilidad consulta a Chrome (`Page.getInstallabilityErrors`) y valida el manifest; el de modo sin conexión arranca la app sin red; el de actualización comprueba que una versión nueva espera a «Actualizar» y conserva los datos. Manual: sección 1.
