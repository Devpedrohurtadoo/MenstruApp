# Menstruapp 🌙

**Tu ciclo, tus datos.** PWA de salud menstrual que se instala en el móvil como una app normal, funciona sin conexión y **cifra todo en el dispositivo**. Sin cuentas, sin anuncios, sin rastreadores.

- Web app instalable (Android, iPhone, escritorio) con modo offline completo.
- Español e inglés (preparada para más idiomas).
- Frontend sin dependencias ni paso de compilación · backend opcional en Netlify Functions.

> Menstruapp es una herramienta informativa: no diagnostica ni sustituye a un profesional sanitario, y sus predicciones **no son un método anticonceptivo**.

---

## Funcionalidades

| Área                      | Qué incluye                                                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Modos de uso**          | Seguir el ciclo · Buscar embarazo · Evitar embarazo · Embarazo · Posparto · Perimenopausia. Cada modo adapta pantallas, síntomas, avisos y recordatorios.                                                                                                     |
| **Hoy**                   | Anillo del ciclo (día, fase, fertilidad, regla prevista), registro rápido de ánimo/síntomas, «Me ha venido la regla», próximos eventos, consejo del día, rachas y logros, tarjeta de anticonceptivo diario.                                                   |
| **Registro diario**       | Flujo, color, coágulos, 38 síntomas con intensidad (incluye señales de alarma), 12 estados de ánimo, energía, libido, temperatura basal, moco cervical, test LH y de embarazo, relaciones, anticonceptivo y medicación, sueño, agua, ejercicio, peso y notas. |
| **Calendario**            | Regla registrada/estimada/prevista, ventana fértil por niveles, ovulación estimada o confirmada, premenstrual, modo «Editar regla», navegación por teclado, historial de ciclos.                                                                              |
| **Predicción**            | Motor propio: media ponderada con descarte de atípicos, margen de incertidumbre, nivel de confianza, fase lútea aprendida, confirmación de ovulación por temperatura (regla 3 sobre 6) y LH, rangos FIGO y adolescentes, pausas por embarazo.                 |
| **Avisos de salud**       | Retrasos, amenorrea, ciclos cortos/largos/irregulares, sangrado abundante o prolongado, sangrado entre reglas, sangrado en el embarazo o tras la menopausia, señales de alarma, anticoncepción de urgencia. Tono informativo, nunca alarmista.                |
| **Análisis**              | Estadísticas, gráficos accesibles (con tabla de datos), patrones personales por fase, síntomas frecuentes, temperatura basal por ciclo, peso.                                                                                                                 |
| **Luna**                  | Asistente que responde **en el dispositivo** (sin IA externa): ~55 temas, preguntas personales con tus datos («¿cuándo me viene?», «¿estoy fértil?»), y detección de urgencias, crisis y violencia con teléfonos de ayuda.                                    |
| **Aprende**               | 38 artículos revisados, glosario, FAQ, guía «Cuándo consultar» y ayuda de la app.                                                                                                                                                                             |
| **Embarazo y posparto**   | Semanas y fecha probable de parto, nota semanal (sem. 4–42), contador de movimientos, cronómetro de contracciones, fin de embarazo con acompañamiento en pérdidas, lactancia y método MELA.                                                                   |
| **Recordatorios**         | Regla próxima/retrasada, ventana fértil, ovulación, registro diario, temperatura, píldora (respeta descansos), parche, anillo, inyección, citas, revisiones, copias. Notificaciones **discretas** opcionales.                                                 |
| **Personalización**       | Tema claro/oscuro/auto, 8 colores + color libre con ajuste automático de contraste, 8 fondos, color sólido o **tu propia imagen**, partículas, movimiento reducido, tamaño de texto, alto contraste.                                                          |
| **Privacidad**            | Varios perfiles por dispositivo, PIN/contraseña/biometría, código de recuperación, bloqueo automático y al salir, **pantalla segura** (calculadora funcional), modo invitada, nombres ocultos.                                                                |
| **Tus datos**             | Copia cifrada, JSON, CSV, informe PDF para la consulta, importación desde otras apps (CSV) y Apple Salud, borrado total.                                                                                                                                      |
| **Opcional con servidor** | Sincronización cifrada de extremo a extremo entre dispositivos, recordatorios push con la app cerrada (contenido cifrado) y enlaces temporales de solo lectura para tu profesional.                                                                           |

## Privacidad y seguridad (resumen)

- Cada registro se cifra con **AES-256-GCM**; la clave maestra se protege con tu PIN/contraseña (**PBKDF2-SHA256, 600 000 iteraciones**), código de recuperación, biometría (WebAuthn PRF) o una clave del dispositivo. Los identificadores de registro son opacos (HMAC).
- **Content-Security-Policy** estricta (`script-src 'self'`, sin inline), **Trusted Types**, HSTS, COOP, Permissions-Policy. El DOM se construye sin `innerHTML` (regla de lint obligatoria).
- Cero peticiones a terceros: fuentes e iconos autoalojados.
- El servidor (opcional) solo almacena datos cifrados en el dispositivo; los tokens son capacidades aleatorias de 256 bits y solo se guarda su hash.

Detalles: [docs/SECURITY.md](docs/SECURITY.md) · [docs/PRIVACY.md](docs/PRIVACY.md) · [docs/API.md](docs/API.md)

---

## Puesta en marcha local

Requisitos: **Node.js 22** o superior.

```bash
npm install
npm run dev            # http://localhost:8888 — mismas cabeceras que en Netlify + API en memoria
```

Comprobaciones:

```bash
npm run build          # sella el service worker + lint + tests unitarios (lo mismo que ejecuta Netlify)
npm run typecheck      # TypeScript sobre JSDoc (modo estricto)
npm run test:e2e       # Playwright en Chromium móvil: flujos, offline, accesibilidad (axe), CSP, sync…
npm run verify         # todo lo anterior
```

> Si cambias cualquier archivo de `public/`, ejecuta `npm run stamp` (o `npm run build`) para que el service worker distribuya la nueva versión. Los tests fallan si el sello está desactualizado.

## Desplegar en Netlify

### Opción A · Desde Git (recomendada: incluye el backend opcional)

1. Sube este repositorio a GitHub/GitLab/Bitbucket.
2. En Netlify: **Add new site → Import an existing project** y elige el repositorio.
3. Netlify lee `netlify.toml` automáticamente:
   - _Build command_: `npm run build` · _Publish directory_: `public` · _Functions_: `netlify/functions`.
4. (Opcional) Recordatorios con la app cerrada: genera claves con `npm run vapid` y añádelas en **Site configuration → Environment variables** (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Ver [.env.example](.env.example).
5. **Deploy**. Cada push crea un despliegue; si un test falla, el despliegue se detiene (no se publica nada roto).
6. Los _Deploy Previews_ de cada pull request permiten probar cambios en el móvil antes de publicarlos.

La sincronización y los enlaces para compartir funcionan sin configuración (usan Netlify Blobs). Las funciones programadas (`push-dispatch` cada 5 minutos y `cleanup` diaria) se activan solas.

### Opción B · Arrastrar y soltar (solo frontend)

1. Ejecuta `npm run stamp` (si has cambiado algo).
2. Entra en [app.netlify.com/drop](https://app.netlify.com/drop) y arrastra la carpeta **`public/`**.

La app funciona completa en el dispositivo (las cabeceras de seguridad de `public/_headers` también se aplican). Sin backend, la sincronización, los push con la app cerrada y los enlaces para compartir quedan ocultos automáticamente.

### Opción C · Netlify CLI

```bash
npx netlify-cli deploy --build          # borrador
npx netlify-cli deploy --build --prod   # producción
```

### Dominio y HTTPS

Netlify sirve HTTPS automáticamente (necesario para PWA, cifrado y notificaciones). Con dominio propio, actívalo en **Domain management**; HSTS ya está configurado.

## Instalar en el móvil

- **Android (Chrome, Edge, Samsung Internet)**: abre la web → botón **Instalar** de la tarjeta de inicio, o menú ⋮ → _Instalar aplicación_.
- **iPhone/iPad (Safari)**: botón **Compartir** → _Añadir a pantalla de inicio_. En iOS 16.4+ las notificaciones funcionan con la app instalada.
- **Escritorio**: icono de instalar en la barra de direcciones.

Incluye iconos adaptativos (maskable y monocromo), accesos directos (Registrar hoy, Calendario, Luna), pantallas de carga para iPhone/iPad y capturas para la ficha de instalación.

---

## Estructura

```
public/                  ← lo que se publica (sin paso de compilación)
  index.html, share.html, sw.js, manifest.webmanifest, _headers, robots.txt
  css/app.css            sistema de diseño (tokens, temas, componentes, movimiento, impresión)
  js/
    core/                DOM seguro, fechas, i18n, validación de esquemas, estado
    security/            criptografía, bóveda, WebAuthn, bloqueo por intentos
    data/                IndexedDB, repositorio cifrado, esquemas, copias, importadores, migración v2
    domain/              motor del ciclo, avisos, modos, embarazo, recordatorios, rachas, Luna
    ui/                  componentes, modales, iconos, anillo, gráficos, temas, efectos
    views/               pantallas (hoy, calendario, registro, análisis, aprende, Luna, ajustes…)
    pwa/                 service worker, instalación, notificaciones, push, sync, compartir
    i18n/                es.js, en.js
    content/             biblioteca, base de Luna y notas de embarazo (es/en)
  assets/                fuentes, iconos, splash iOS, capturas
netlify/functions/       api.mjs (sync/push/share), push-dispatch.mjs, cleanup.mjs, lib/
scripts/                 serve (dev), stamp-sw, generate-assets, extract-icons, vapid
tests/unit/              Vitest: motor, cripto, datos, i18n, contenido, API, invariantes estáticas
tests/e2e/               Playwright: flujos completos, offline, accesibilidad, seguridad, sync
docs/                    SECURITY, PRIVACY, API, QA-CHECKLIST
```

## Personalizar

- **Textos**: `public/js/i18n/es.js` y `en.js` (un test verifica que ambos idiomas tienen las mismas claves y marcadores).
- **Contenido educativo / Luna**: `public/js/content/`. Los tests comprueban que cada artículo enlazado existe y que cada pregunta sugerida obtiene respuesta.
- **Añadir un idioma**: crea `i18n/<código>.js`, `content/library-<código>.js`, `content/luna-<código>.js` y `content/pregnancy-<código>.js`, y regístralo en `core/i18n.js`.
- **Iconos e imágenes**: `npm run assets` los regenera desde el logotipo (necesita Chromium de Playwright).

## Créditos

Iconos [Lucide](https://lucide.dev) (ISC) · Fuentes [DM Sans](https://github.com/googlefonts/dm-fonts) y [Playfair Display](https://github.com/clauseggers/Playfair) (SIL OFL 1.1).
Contenido sanitario basado en OMS, FIGO, NHS, ACOG, FSRH, NICE y SEGO.
