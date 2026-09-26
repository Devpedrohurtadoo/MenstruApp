# Prompt maestro para generar/completar "Menstruapp" con IA

## Qué es este documento

Es un **prompt listo para copiar y pegar** en cualquier IA generativa de código (Claude, Claude Code, ChatGPT, etc.) para que diseñe, complete y deje en estado de producción la app de seguimiento menstrual **Menstruapp**: una PWA (Progressive Web App) que se sube a Netlify y se instala en el móvil "Añadir a pantalla de inicio", funcionando como una app nativa normal.

No genera código por sí mismo: es la **especificación completa** (funcionalidades, seguridad, arquitectura, diseño, despliegue y criterios de calidad) que le da a la IA todo el contexto necesario para hacerlo bien a la primera, sin ambigüedades y sin tener que preguntar constantemente.

## Cómo usarlo

1. Copia **todo** el bloque que empieza en `EMPIEZA EL PROMPT` y termina en `TERMINA EL PROMPT` (todo lo que está dentro del bloque de código grande de más abajo).
2. Pégalo como primer mensaje a la IA que vaya a programar la app (idealmente con acceso a este mismo repositorio, para que pueda leer y ampliar el código ya existente).
3. Revisa el plan que te proponga antes de dejarla escribir código masivamente, y pide iteraciones por bloques (primero seguridad y datos, luego funcionalidades, luego diseño) en vez de "todo de golpe".
4. Ajusta las partes marcadas como `[EDITABLE]` a tu gusto antes de enviarlo (nombre final, paleta de color por defecto, alcance de la primera versión, etc.).

## Contexto importante del repositorio actual (léelo antes de enviar el prompt)

Este repo **ya no está vacío**: ya existe una primera versión funcional de Menstruapp (HTML/CSS/JS puro, sin frameworks) con, entre otras cosas, pantallas de login/registro, bloqueo por PIN, modo camuflaje/discreto, calendario del ciclo, un asistente llamado **"Luna"** (`coach.js`), un módulo de bienestar (`wellness.js`) y un sistema de temas/fondos personalizables (`settings.js`). Por eso el prompt está escrito para que la IA **audite y complete** lo que ya existe en vez de asumir que parte de cero (esto evita que te reescriba o te duplique trabajo ya hecho). El prompt incluye una sección específica ("Estado actual del proyecto") con estos detalles para que la IA la tenga en cuenta.

Cosas a tener en cuenta que el prompt le pide corregir:

- Hay **archivos duplicados**: existe una copia completa en la raíz del repo y otra copia (ligeramente distinta) dentro de la carpeta `menstruapp/`. Hay que decidir una única carpeta fuente de verdad.
- Todavía **no hay Service Worker** ni `netlify.toml`, así que la app aún no es 100% instalable/offline ni está configurada para Netlify.
- Todo el almacenamiento es local (`localStorage`); no hay backend ni copia de seguridad en la nube todavía.
- No hay tests automatizados todavía.

---

## 🧠 EMPIEZA EL PROMPT (copia desde aquí)

```
Actúa como un equipo de desarrollo de software senior y multidisciplinar formado por: arquitecta/o full-stack, diseñadora/or UX/UI especializada en salud femenina, especialista en seguridad informática (AppSec) y QA. Vas a diseñar, completar y dejar lista para producción una Progressive Web App (PWA) llamada "Menstruapp".

===========================================================
1. CONTEXTO Y OBJETIVO
===========================================================
Menstruapp es una aplicación web para mujeres y personas menstruantes centrada en la salud menstrual y reproductiva: ciclo, regla, ovulación, fertilidad, síntomas, bienestar emocional y físico, y educación en salud femenina. Debe:

- Poder subirse a Netlify como sitio estático (con funciones serverless si hacen falta) y funcionar perfectamente en producción con un dominio HTTPS.
- Poder instalarse en el móvil (Android e iOS) mediante "Añadir a pantalla de inicio", abriéndose a pantalla completa, sin barra del navegador, con icono y splash screen propios, exactamente como una app nativa.
- Funcionar también perfectamente en escritorio (responsive), aunque el diseño y las prioridades son mobile-first.
- Ser una herramienta seria de salud: precisa, empática, sin tabúes, sin lenguaje infantilizante ni vergonzante, inclusiva (válida tanto para mujeres cis como para hombres trans y personas no binarias que menstrúan).
- Tratar los datos de salud del cuerpo de la usuaria con el máximo nivel de seguridad y privacidad posible, porque son datos extremadamente sensibles.

IMPORTANTE: este repositorio puede contener ya una primera versión de la app (revisa "Estado actual del proyecto" al final). Tu trabajo no es empezar de cero porque sí: audita lo que ya existe, consérvalo y amplíalo cuando sea razonable, y solo reescribe cuando el código existente sea inseguro, esté roto o no puedas cumplir un requisito de otra forma.

===========================================================
2. FORMA DE TRABAJAR
===========================================================
- Antes de escribir código, presenta brevemente un plan por fases (por ejemplo: 1. arquitectura y datos, 2. seguridad y autenticación, 3. funcionalidades core, 4. funcionalidades avanzadas, 5. diseño/temas/animaciones, 6. PWA y despliegue, 7. testing y auditoría final) y ve completándolas de una en una, no todo de golpe en un único archivo gigante.
- Explica las decisiones técnicas importantes (por qué esa librería, por qué ese modelo de datos, por qué ese enfoque de seguridad) en 2-3 frases, no en ensayos.
- Escribe código limpio, modular, comentado solo donde el "por qué" no sea obvio, con nombres descriptivos.
- No inventes funcionalidades médicas peligrosas (por ejemplo, no diagnostiques enfermedades ni sustituyas a un/a profesional sanitario). Ver sección de restricciones.
- Al final de cada fase, entrega una checklist de lo que has cubierto y lo que queda pendiente.

===========================================================
3. USUARIAS Y MODOS DE USO
===========================================================
La app debe adaptar contenido, predicciones y avisos según el "modo" que elija la usuaria en el onboarding (debe poder cambiarlo luego en ajustes):

- Solo seguimiento del ciclo (uso general).
- Buscando quedarse embarazada (foco en ventana fértil, ovulación, temperatura basal, moco cervical).
- Evitando el embarazo (foco en método anticonceptivo usado, recordatorios de toma, alertas de riesgo).
- Embarazo en curso (cambia todo el modelo: semanas de gestación, hitos, sin predicciones de ciclo).
- Posparto / lactancia (ciclo irregular o ausente, otro tipo de seguimiento).
- Perimenopausia / menopausia (ciclos irregulares, síntomas específicos, sin foco en fertilidad).

Debe funcionar igual de bien para adolescentes que acaban de empezar a menstruar (con contenido educativo básico) que para mujeres adultas con ciclos muy documentados.

===========================================================
4. STACK TÉCNICO RECOMENDADO
===========================================================
Usa este stack salvo que el código ya existente en el repo justifique otra cosa (en ese caso, respeta y evoluciona el stack existente en vez de migrarlo sin necesidad):

- Frontend: HTML5 + CSS3 + JavaScript moderno (ES2022+), o React/Vite si se reescribe desde cero. TypeScript si el equipo lo prefiere para reducir bugs.
- Gestión de estado: simple (módulos + localStorage/IndexedDB) si es vanilla JS; Zustand/Context si es React. Nada de sobreingeniería.
- Animaciones: CSS transitions/keyframes para lo simple; una librería ligera (ej. Motion/Framer Motion en React, o clases CSS + IntersectionObserver en vanilla) para lo más elaborado. Deben poder desactivarse (modo "reducir movimiento").
- Gráficas/estadísticas: una librería ligera tipo Chart.js.
- Almacenamiento local: IndexedDB para datos estructurados (más robusto que localStorage para volúmenes de datos de varios años), con fallback a localStorage para preferencias simples.
- Backend (si se implementa sincronización en la nube): Netlify Functions (serverless) + una base de datos gestionada con buen soporte de cifrado (ej. Postgres gestionado, o un backend-as-a-service con autenticación integrada). Debe ser opcional: la app tiene que funcionar 100% offline y solo-local si la usuaria no quiere crear cuenta en la nube.
- Autenticación (si hay backend): proveedor probado (ej. autenticación gestionada por el propio backend-as-a-service, u OAuth), nunca autenticación casera mal hecha.
- Service Worker: Workbox o hecho a mano, para caché offline e instalación PWA real.
- Testing: framework de test unitario + test end-to-end (ej. Playwright) para los flujos críticos.
- Control de calidad de código: linter + formateador automático, revisado en cada cambio.

===========================================================
5. FUNCIONALIDADES OBLIGATORIAS (MVP COMPLETO)
===========================================================

5.1 Onboarding y perfil
- Bienvenida explicando qué hace la app y cómo protege sus datos, antes de pedir ningún dato.
- Selección de modo de uso (ver sección 3), fecha de última regla, duración media de ciclo y de regla (con valores por defecto razonables si no los sabe).
- Perfil editable: nombre/apodo, fecha de nacimiento (opcional), foto/avatar (opcional), preferencias.
- Posibilidad de usar la app totalmente offline/anónima, sin registrar cuenta, si no se quiere sincronización en la nube.

5.2 Calendario y predicción del ciclo
- Calendario mensual navegable con: días de regla (pasados y futuros previstos), ventana fértil, día estimado de ovulación, fase premenstrual (PMS), fase actual resaltada.
- Algoritmo de predicción que aprenda de los ciclos registrados (promedio móvil de los últimos N ciclos, ajustado si detecta irregularidad), no solo un cálculo fijo de 28 días.
- Vista de "hoy": día del ciclo, fase actual, información relevante de esa fase (qué es normal sentir), próximos eventos previstos.
- Historial completo de ciclos anteriores, con duración de cada uno y variabilidad.
- Aviso claro y no alarmista si detecta un ciclo muy irregular o un retraso significativo, sugiriendo (sin diagnosticar) consultar con un profesional si se repite.

5.3 Registro diario de datos
- Flujo (nada / manchado / ligero / moderado / abundante), color, presencia de coágulos.
- Síntomas físicos (dolor menstrual, dolor de cabeza, hinchazón, sensibilidad en el pecho, acné, náuseas, fatiga, cambios de apetito, etc.) con intensidad.
- Estado de ánimo y energía (varias opciones, incluida la posibilidad de registrar varias emociones el mismo día).
- Libido.
- Temperatura basal y moco cervical (para métodos de fertilidad), como sección opcional/avanzada.
- Actividad sexual (con/sin protección) — relevante para predicciones de fertilidad y embarazo, tratado con naturalidad y sin juicio.
- Medicación/anticonceptivos: registro de qué método se usa y recordatorio de toma (píldora diaria, parche semanal, anillo, DIU con fecha de revisión, etc.).
- Peso y otras notas libres, opcional.
- Todo el registro debe poder hacerse en menos de 30 segundos desde la pantalla de inicio ("registrar hoy" siempre visible y accesible).
- Posibilidad de editar o borrar cualquier registro pasado.

5.4 Recordatorios y notificaciones
- Notificaciones locales (Web Push si hay backend, o notificaciones locales del navegador/PWA si no lo hay) configurables para: días antes de la próxima regla, día fértil/ovulación, hora de tomar la medicación/anticonceptivo, recordatorio diario de registrar cómo se siente, contenido motivacional/tip del día.
- Cada tipo de notificación debe poder activarse/desactivarse por separado y elegir la hora de envío.
- Las notificaciones no deben revelar contenido sensible en la pantalla de bloqueo del móvil si la usuaria activa "modo discreto" (ver seguridad).

5.5 Estadísticas y tendencias
- Gráficas de duración del ciclo y de la regla a lo largo del tiempo.
- Correlación entre síntomas/ánimo y fase del ciclo (ej. "sueles sentir más fatiga en tus días premenstruales").
- Resumen exportable (ver 5.10).

5.6 Personalización visual (tema y fondo editables)
- Selector de color de acento con paleta predefinida + selector de color personalizado (rueda de color libre).
- Fondo personalizable: degradado (varias opciones), color sólido a elegir, o imagen propia subida por la usuaria.
- Modo claro / oscuro / automático (según el sistema).
- Control de intensidad de animaciones/partículas decorativas, incluyendo la opción de desactivarlas completamente (accesibilidad y rendimiento).
- Todo cambio de tema se aplica en caliente, sin recargar la app, y se conserva entre sesiones.

5.7 Animaciones y microinteracciones
- Transiciones suaves entre pantallas y vistas del calendario.
- Pequeñas animaciones de celebración/apoyo (ej. al completar un registro, al alcanzar una racha de registros diarios).
- Ilustraciones o animaciones ligeras en estados vacíos ("aún no tienes registros esta semana") en vez de pantallas en blanco.
- Deben ser fluidas (60fps), ligeras en batería/CPU, y siempre respetar `prefers-reduced-motion` y el ajuste manual de la sección 5.6.

5.8 Educación y ayuda ("Luna" u otro asistente de salud)
- Biblioteca de contenido educativo por categorías: el ciclo y sus fases, fertilidad y anticoncepción, ITS, menopausia y perimenopausia, salud mental y emocional, nutrición y ejercicio según la fase del ciclo, mitos vs. realidad, glosario de términos.
- Buscador dentro del contenido de ayuda.
- Un asistente conversacional de salud (tipo "Luna") que responda dudas frecuentes con información general y basada en buenas prácticas, SIEMPRE dejando claro que no sustituye a un/a profesional médico y sugiriendo consulta profesional ante señales de alarma (dolor extremo, sangrado anómalo muy abundante, ausencia de regla prolongada sin explicación, etc.).
- Sección de preguntas frecuentes (FAQ) y checklist de "cuándo consultar a un/a profesional".
- Centro de ayuda/soporte de la propia app (cómo usar cada función, cómo exportar datos, cómo borrar la cuenta).

5.9 Privacidad de acceso a la app
- Bloqueo de la app con PIN y, si el dispositivo lo soporta, biometría (huella/Face ID vía WebAuthn).
- Auto-bloqueo tras X minutos de inactividad (configurable).
- "Modo discreto/camuflaje": posibilidad de cambiar el nombre e icono visibles de la app (dentro de lo que permite una PWA) y de ocultar el contenido sensible en notificaciones.
- Opción de "modo invitada" de solo lectura para compartir el dispositivo puntualmente sin exponer todo el historial.

5.10 Exportación, copia de seguridad y portabilidad de datos
- Exportar historial completo en PDF (informe legible para llevar a la consulta médica) y en CSV/JSON (datos en bruto).
- Importar datos desde una exportación previa.
- Copia de seguridad cifrada, local (archivo descargable) siempre disponible, y en la nube si hay backend (con cifrado de extremo a extremo si es técnicamente viable).
- Botón claro de "borrar todos mis datos" que borre de verdad todo (local y remoto), con doble confirmación.

5.11 Accesibilidad e idiomas
- Compatible con lectores de pantalla (etiquetas ARIA correctas, foco de teclado visible, orden de tabulación lógico).
- Contraste de color suficiente (AA de WCAG 2.1 como mínimo) incluso al personalizar colores: si la usuaria elige una combinación de bajo contraste, avisar.
- Tamaño de texto ajustable.
- Español e inglés como mínimo, con arquitectura preparada para añadir más idiomas fácilmente.

5.12 PWA y funcionamiento offline
- La app debe ser 100% usable sin conexión para todo lo que no dependa explícitamente de la nube (registrar datos, ver calendario, ver estadísticas, leer contenido educativo ya descargado).
- Los datos generados offline se sincronizan solos en cuanto vuelve la conexión, si hay backend.

===========================================================
6. FUNCIONALIDADES AVANZADAS (siguiente fase, no bloquean el lanzamiento)
===========================================================
- Compartir acceso de solo lectura con la pareja o con un familiar/médico mediante enlace o código temporal y revocable.
- Integración opcional con Google Fit / Apple Health.
- Detección de patrones irregulares con aviso proactivo (no diagnóstico) sugiriendo revisión médica.
- Comunidad o foro moderado entre usuarias (requiere moderación seria y reglas claras de privacidad; no implementar sin un plan de moderación).
- Gamificación ligera (rachas de registro, logros) sin caer en presión innecesaria.
- Widgets/accesos directos del sistema operativo (shortcuts en el manifest) para "Registrar hoy" directamente.
- Modo multi-perfil en el mismo dispositivo.

===========================================================
7. SEGURIDAD Y PRIVACIDAD (REQUISITO CRÍTICO, NO NEGOCIABLE)
===========================================================
Estás tratando datos de salud íntimos. El objetivo es cero vulnerabilidades explotables y cero fugas de datos. Aplica como mínimo:

- Todo el tráfico exclusivamente por HTTPS (Netlify ya lo da por defecto) + cabecera HSTS.
- Content-Security-Policy estricta, X-Content-Type-Options: nosniff, X-Frame-Options: DENY o frame-ancestors 'none', Referrer-Policy restrictiva, Permissions-Policy limitando cámara/micrófono/geolocalización a lo estrictamente necesario.
- Sanitizar y validar TODA entrada de usuario, tanto en frontend como en backend (si existe): nunca confiar solo en la validación del cliente. Prevenir XSS, inyección SQL/NoSQL, CSRF, y cualquier variante de inyección.
- Si hay backend con contraseñas: hash con algoritmo moderno resistente (Argon2id o bcrypt con coste adecuado), nunca en texto plano ni con hashes débiles (MD5/SHA1 solos).
- Si hay sesiones/tokens: expiración corta, renovación segura, invalidación real al cerrar sesión, cookies con `HttpOnly`, `Secure` y `SameSite=Strict/Lax`.
- Cifrado en reposo de los datos de salud sensibles, y cifrado de extremo a extremo si hay sincronización en la nube, de forma que ni el propio backend pueda leer el contenido en claro salvo lo estrictamente necesario para operar.
- Ningún secreto (claves de API, credenciales de base de datos) en el código fuente ni en el repositorio: todo en variables de entorno configuradas en Netlify.
- Rate limiting y protección contra fuerza bruta en cualquier endpoint de autenticación.
- Principio de mínimo privilegio en cualquier función serverless o acceso a base de datos.
- Sin dependencias de terceros con vulnerabilidades conocidas (auditar con las herramientas estándar del ecosistema elegido antes de cada entrega); mantener las dependencias mínimas imprescindibles.
- Cumplimiento del espíritu de RGPD: consentimiento explícito antes de recoger datos, información clara de qué se recoge y para qué, derecho real a exportar y a borrar todo (ver 5.10), no compartir ni vender datos a terceros, no incluir rastreadores publicitarios de terceros.
- Registros/logs del sistema sin datos de salud ni contraseñas en texto plano.
- Revisión de seguridad final tipo checklist OWASP Top 10 antes de dar cualquier entrega por terminada.

===========================================================
8. CALIDAD, TESTING Y "CERO BUGS"
===========================================================
El objetivo es una app sin errores bloqueantes ni comportamientos inesperados. Para acercarte lo máximo posible a esto:

- Cada pantalla debe manejar explícitamente sus estados de carga, error y vacío (nunca una pantalla en blanco o rota).
- Manejo de errores robusto en todas las funciones asíncronas (red, almacenamiento), con mensajes comprensibles para la usuaria, nunca un error técnico crudo en pantalla.
- Tests unitarios de la lógica de negocio (cálculo de predicciones de ciclo, validaciones de formularios, cifrado/descifrado).
- Tests end-to-end de los flujos críticos: registro/login, registrar el día, ver calendario, cambiar tema, exportar datos, borrar cuenta.
- Linter y formateador ejecutados y en verde antes de cualquier entrega.
- Probar manualmente la instalación como PWA en Chrome (Android) y Safari (iOS) antes de dar la tarea por completada.
- Auditoría de rendimiento y accesibilidad (Lighthouse u equivalente), apuntando a puntuaciones altas (90+) en Rendimiento, Accesibilidad, Buenas Prácticas, SEO y PWA.
- No entregues una funcionalidad "a medias": si no te da tiempo a completar algo con calidad, dilo explícitamente en vez de dejar código incompleto o simulado.

===========================================================
9. REQUISITOS TÉCNICOS DE PWA E INSTALACIÓN EN MÓVIL
===========================================================
- `manifest.json` completo: `name`, `short_name`, `description`, `start_url`, `scope`, `display: standalone`, `orientation`, `theme_color`, `background_color`, iconos en varios tamaños incluyendo 192x192 y 512x512 con `purpose: "any maskable"`, y `shortcuts` para accesos directos.
- Service Worker (Workbox u equivalente) con estrategia de caché adecuada: "network first" para datos que cambian, "cache first" para estáticos, precaching del shell de la app para que abra instantáneamente incluso offline.
- Meta tags específicas de iOS ya presentes o añadidas: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`, viewport correcto que evite zoom accidental pero sin romper accesibilidad (no deshabilitar el zoom por completo).
- Splash screens básicas para que la apertura en móvil se vea pulida.
- Un banner/prompt propio de "Instalar Menstruapp" que aproveche el evento `beforeinstallprompt` en Android y unas instrucciones claras para "Compartir → Añadir a pantalla de inicio" en iOS (donde ese evento no existe).
- Verifica que, una vez instalada, la app abre en modo standalone (sin barra de direcciones) tanto en Android como en iOS.

===========================================================
10. DESPLIEGUE EN NETLIFY
===========================================================
- Incluir `netlify.toml` con el comando de build, el directorio de publicación, cabeceras de seguridad (sección 7) y, si aplica, la carpeta de funciones serverless (`netlify/functions`).
- Documentar en el README qué variables de entorno hay que configurar en el panel de Netlify (nunca en el repo) y cómo obtenerlas.
- Confirmar que las URLs relativas y las rutas de assets funcionan correctamente cuando el sitio se sirve desde la raíz de un dominio de Netlify.
- Explicar cómo se generan los "deploy previews" automáticos de Netlify por rama/PR, para poder revisar cambios antes de fusionarlos a producción.

===========================================================
11. ESTRUCTURA DE CARPETAS ESPERADA
===========================================================
Propone y justifica una estructura de carpetas clara (por ejemplo: `/src` o raíz para la app, `/assets` para iconos e imágenes, `/netlify/functions` para backend serverless si existe, `/tests` para pruebas, `/docs` para documentación). Si el repositorio actual tiene archivos duplicados o desorganizados, propon una migración ordenada en vez de seguir acumulando copias.

===========================================================
12. ESTADO ACTUAL DEL PROYECTO (AUDITA ESTO ANTES DE EMPEZAR)
===========================================================
Este repositorio ya contiene una primera versión de Menstruapp en HTML/CSS/JS puro (sin build ni framework), con, entre otras cosas:

- `index.html`, `app.js` (controlador principal), `calendar.js` (ciclo y predicciones), `coach.js` (asistente de salud "Luna"), `wellness.js` (bienestar), `settings.js` (ajustes, temas y privacidad), `particles.js` (fondo animado), `styles.css`, y un `manifest.json` básico.
- Ya existen: pantallas de login/registro, bloqueo por PIN, modo camuflaje/discreto, selector de tema de color y de fondo (degradado/color sólido/imagen propia), intensidad de partículas, calendario del ciclo con fases y leyenda, un widget de estado de ánimo, cita y tip del día.
- Existe una carpeta `menstruapp/` con una copia adicional (ligeramente distinta) de casi los mismos archivos. Antes de seguir añadiendo funcionalidades, decide y consolida una única carpeta como fuente de verdad y elimina la duplicidad, documentando qué hiciste y por qué.
- Todavía NO existen: Service Worker (por lo que la instalación offline real aún no funciona del todo), `netlify.toml` (no está configurado el despliegue), backend/sincronización en la nube (todo vive en `localStorage` del navegador), y tests automatizados.
- Tu misión: auditar ese código, conservar y mejorar lo que ya funciona bien, corregir cualquier fallo de seguridad o de UX que encuentres, y completar todo lo que falte de las secciones 5 a 11 de este prompt hasta dejar la app lista para producción.

===========================================================
13. ENTREGABLES ESPERADOS
===========================================================
- Código fuente completo, funcional y organizado según la sección 11.
- `README.md` con instrucciones de instalación, desarrollo local y despliegue en Netlify paso a paso.
- `.env.example` documentando cualquier variable de entorno necesaria (sin valores reales).
- Documentación breve de cualquier backend/API creada.
- Checklist final de QA cubriendo: funcionalidades completas, seguridad (OWASP Top 10), accesibilidad, rendimiento, PWA/instalabilidad, y resultado de los tests.

===========================================================
14. DEFINICIÓN DE "TERMINADO" (CRITERIOS DE ACEPTACIÓN)
===========================================================
Considera la tarea terminada solo cuando:
- Todas las funcionalidades obligatorias (sección 5) están implementadas y probadas manualmente.
- No quedan errores de consola, advertencias críticas, ni pantallas rotas en ningún flujo principal.
- Los tests automatizados definidos pasan en verde.
- La checklist de seguridad (sección 7) está revisada punto por punto.
- La app se instala correctamente como PWA en Android y iOS y funciona sin conexión para lo esencial.
- El sitio compila y se despliega sin errores en Netlify con la configuración documentada.
- El diseño es coherente, accesible, personalizable (tema y fondo) y con animaciones fluidas que respetan `prefers-reduced-motion`.

===========================================================
15. RESTRICCIONES Y BUENAS PRÁCTICAS ÉTICAS
===========================================================
- La app informa y acompaña, pero nunca sustituye a un/a profesional médico: cualquier texto orientativo debe dejarlo claro y remitir a ayuda profesional ante señales de alarma.
- Lenguaje inclusivo, sin tabúes, sin vergüenza ni infantilización, válido para cualquier persona menstruante.
- Nunca vender, compartir ni monetizar los datos de salud de las usuarias con terceros; sin publicidad basada en estos datos.
- Nunca implementar patrones oscuros (dark patterns) para retener a la usuaria o dificultar el borrado de su cuenta/datos.
- Cualquier contenido educativo sobre salud debe ser prudente, general y no alarmista, evitando afirmaciones médicas categóricas no verificables.

Antes de darte por finalizada la tarea, resume en una checklist qué has completado de cada sección de este prompt (5 a 15) y qué queda pendiente, si algo queda pendiente.
```

## ⬆️ TERMINA EL PROMPT

---

## Notas finales (para ti, no para la IA)

- **Sobre el "0 bugs / 0 hackeos" que pediste:** ningún software real puede garantizarse matemáticamente sin ningún fallo, pero el prompt de arriba lo trata como un objetivo estricto y exigible: pide auditoría de seguridad tipo OWASP, testing automatizado, revisión de cada entrega y una checklist final de aceptación. Es la forma realista de acercarse al máximo a "cero bugs, cero vulnerabilidades".
- Si prefieres avanzar por partes en vez de pedir todo de una vez, puedes enviar primero solo las secciones 1-4 y 12 (contexto, stack y estado actual) para que la IA proponga el plan, y luego ir añadiendo el resto de secciones en mensajes sucesivos.
- Las partes `[EDITABLE]` mencionadas arriba son un recordatorio: revisa sobre todo la sección 3 (modos de uso que realmente quieres cubrir en la v1) y la 6 (qué funcionalidades avanzadas quieres ya vs. más adelante) antes de enviarlo, para no disparar el alcance de la primera versión más de la cuenta.
