# Seguridad de Menstruapp

Este documento describe el modelo de amenazas, el diseño criptográfico y las defensas de la aplicación. Las afirmaciones de este documento están cubiertas por tests automáticos (`tests/unit/security.test.js`, `tests/unit/api.test.js`, `tests/unit/static.test.js`, `tests/e2e/core.spec.mjs`).

## 1. Modelo de amenazas

| Amenaza | Defensa |
| --- | --- |
| Alguien coge el móvil desbloqueado | Bloqueo con PIN/contraseña/biometría, bloqueo automático por inactividad y al salir de la app, pantalla segura (calculadora), modo invitada, nombres ocultos. |
| Robo del dispositivo o copia del almacenamiento del navegador | Todo el contenido está cifrado (AES-256-GCM). Sin el secreto, los datos son ilegibles. Los identificadores de registro son HMAC opacos: ni siquiera se ven las fechas registradas. |
| Fuerza bruta del PIN | PBKDF2-SHA256 con 600 000 iteraciones y sal aleatoria por bóveda; bloqueo progresivo en la interfaz tras intentos fallidos (con persistencia). Se recomienda PIN de 6 dígitos o contraseña. |
| XSS / inyección de código | CSP `script-src 'self'` sin `unsafe-*`, Trusted Types obligatorios (una única política que solo admite `/sw.js`), DOM construido con nodos (nunca `innerHTML`; lo impide una regla de ESLint), sanitización de URLs (`safeUrl`), validación de esquemas en toda entrada (importaciones, sincronización, formularios). |
| Clickjacking | `X-Frame-Options: DENY` y `frame-ancestors 'none'`. |
| Terceros / rastreo | Cero recursos externos: fuentes e iconos autoalojados, sin analíticas ni SDKs. `Referrer-Policy: no-referrer`, `Permissions-Policy` restrictiva. Un test E2E falla si la app hace una petición fuera del origen. |
| Servidor comprometido (funciones opcionales) | El servidor solo recibe datos cifrados en el dispositivo. Las claves nunca salen del dispositivo (la clave de un enlace compartido va en el fragmento `#` de la URL, que el navegador no envía). |
| Filtración de la base de datos del servidor | Solo contiene texto cifrado y hashes SHA-256 de tokens de 256 bits: no hay contraseñas ni datos personales que robar. |
| SSRF mediante suscripciones push | Lista blanca de servicios push (FCM, Mozilla, Apple, WNS), solo HTTPS en el puerto 443, sin credenciales en la URL; se revalida antes de cada envío. |
| Abuso / DoS del API | Límite de tasa de Netlify (`config.rateLimit`) + limitador por instancia y por endpoint, límites de tamaño de cuerpo, validación estricta de tipos, TTL y limpieza diaria. |
| CSRF | El API no usa cookies; además rechaza peticiones con `Origin` de otro sitio o `Sec-Fetch-Site: cross-site`. |
| Actualizaciones maliciosas o mezcla de versiones | El service worker precarga todos los archivos de una versión con hash de contenido; las actualizaciones solo se aplican cuando la usuaria pulsa «Actualizar». |

**Fuera de alcance**: un dispositivo con malware/root, extensiones del navegador maliciosas, o alguien que conozca el PIN. Un navegador sin Web Crypto no puede ejecutar la app (se muestra un error en lugar de degradar la seguridad).

## 2. Diseño criptográfico (`public/js/security/`)

```
secreto (PIN / contraseña / código de recuperación)
   └─ PBKDF2-SHA256 (600k / 200k para el código de 160 bits, sal de 16 B) → KEK (AES-GCM, no extraíble)
          └─ envuelve → secreto maestro aleatorio de 32 bytes (uno por perfil)
biometría (WebAuthn PRF) ─ salida PRF → HKDF → KEK       (candado adicional opcional)
sin bloqueo ─ clave CryptoKey no extraíble guardada en IndexedDB (candado "device")

secreto maestro ─ HKDF-SHA256 ─┬─ clave de registros (AES-256-GCM)
                               └─ clave de identificadores (HMAC-SHA256) → id opaco de cada registro
```

- **Cifrado de registros**: AES-256-GCM con IV aleatorio de 96 bits por escritura. El id del registro se usa como datos asociados (AAD): un registro no se puede mover ni intercambiar por otro sin que falle la autenticación.
- **Varios candados**: el mismo secreto maestro se envuelve con cada método (PIN, recuperación, biometría). Cambiar el PIN no re-cifra los datos. Tras usar el código de recuperación, se obliga a fijar un nuevo PIN y **se rota el código**.
- **Código de recuperación**: 160 bits aleatorios en Crockford Base32 (sin caracteres ambiguos), mostrado una sola vez; nunca se almacena en claro.
- **Borrado**: los registros eliminados dejan una lápida cifrada (necesaria para sincronizar). «Borrar todo» elimina IndexedDB, Web Storage, cachés y el service worker, y los datos del servidor.
- **Memoria**: los buffers con material sensible se sobrescriben con ceros tras su uso (mejor esfuerzo; JavaScript no garantiza el borrado).
- **Copias de seguridad cifradas**: PBKDF2 (600k) con la contraseña de la copia + AES-GCM; formato versionado y validado al importar.

## 3. Endurecimiento del frontend

- CSP (idéntica en `_headers` y en `<meta>`; lo verifica un test):
  `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-src 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types menstruapp`
- Sin estilos inline: los valores dinámicos (colores, anchuras) se aplican mediante la CSSOM (`style.setProperty`), permitida por la CSP.
- Reglas de ESLint obligatorias en CI y en el build de Netlify: prohíben `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`, `eval`/`new Function`, temporizadores con cadenas, atributos `on*`, y el uso de `localStorage`/`sessionStorage` fuera del módulo de preferencias (que nunca contiene datos de salud).
- Imágenes de fondo y foto de perfil: se decodifican y re-codifican en un `<canvas>` (se eliminan los metadatos EXIF, incluida la geolocalización). La foto de perfil se guarda cifrada; la imagen de fondo es una preferencia visual que se muestra antes de desbloquear y se guarda sin cifrar en el dispositivo (así se indica en Ajustes).
- Lo único que se guarda sin cifrar, además de las preferencias visuales, es la lista de perfiles con su apodo y emoji (para el selector de la pantalla de bloqueo; puede ocultarse en pantalla con «Ocultar nombres») y los metadatos técnicos de las bóvedas (sal, iteraciones, datos envueltos).
- Todas las URL asignadas a `href`/`src` pasan por `safeUrl`: solo se admiten `http(s):`, `mailto:`, `tel:`, `blob:` y `data:image` en base64 (nunca `javascript:`).

## 4. Backend opcional (`netlify/functions/`)

- **Capacidades**: cada dispositivo/código genera tokens aleatorios de 256 bits; el servidor guarda `SHA-256("menstruapp:" + token)`. No hay cuentas.
- **Sync**: un único blob cifrado por código de sincronización, con control de versión optimista (`409` ante conflicto; el cliente fusiona registro a registro con «gana el cambio más reciente»). Borrado tras 400 días sin uso.
- **Push**: el dispositivo cifra el texto de cada recordatorio con una clave que solo tiene él; el servidor solo guarda la hora y el blob cifrado y lo reenvía (cifrado de nuevo por el protocolo Web Push) al servicio push del navegador.
- **Compartir**: resumen cifrado con una clave aleatoria que solo está en el enlace (`/share.html#<id>.<clave>`); caducidad máxima de 30 días; revocable con un token de borrado.
- Respuestas con `Cache-Control: no-store`, `nosniff`, CSP `default-src 'none'`; los errores nunca exponen detalles internos ni se registran cuerpos o tokens.

## 5. Verificación continua

- `npm run build` (Netlify) y CI: sellado del service worker, ESLint (reglas de seguridad), tests unitarios (criptografía, bóveda, bloqueo, validación, API, invariantes de cabeceras y CSP).
- E2E (Playwright): comprueba que no hay violaciones de CSP/Trusted Types ni peticiones a terceros, que las notas no aparecen en claro en IndexedDB ni en localStorage, bloqueo/desbloqueo y recuperación.

## 6. Limitaciones conocidas

- La seguridad del PIN depende de su longitud: un PIN de 4 dígitos es cómodo pero débil frente a un atacante con una copia del almacenamiento y mucho tiempo. La app recomienda 6+ dígitos o una contraseña.
- La biometría depende del soporte de la extensión PRF de WebAuthn (Chrome/Android y Safari recientes). Si no está disponible, la opción no se ofrece.
- En iOS, Safari puede borrar el almacenamiento de webs no instaladas tras semanas sin uso: por eso se recomienda instalar la PWA y hacer copias.

## 7. Informar de vulnerabilidades

Por favor, no abras una incidencia pública. Escribe al responsable del despliegue con los detalles y pasos para reproducirla; se responderá en un máximo de 7 días.
