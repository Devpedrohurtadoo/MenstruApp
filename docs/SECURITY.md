# Seguridad de Menstruapp

Este documento describe el modelo de amenazas, el diseño criptográfico y las defensas de la aplicación. Las afirmaciones de este documento están cubiertas por tests automáticos (`tests/unit/security.test.js`, `tests/unit/api.test.js`, `tests/unit/static.test.js`, `tests/e2e/core.spec.mjs`).

## 1. Modelo de amenazas

| Amenaza | Defensa |
| --- | --- |
| Alguien coge el móvil desbloqueado | Bloqueo con PIN/contraseña/biometría, bloqueo automático por inactividad y al salir de la app (tras 30 s fuera), pantalla segura (calculadora), modo invitada, nombres ocultos. Sacar datos del dispositivo exige volver a introducir el PIN: exportar (copia, JSON, CSV, PDF), crear enlaces para compartir y activar o vincular la sincronización. |
| Robo del dispositivo o copia del almacenamiento del navegador | Todo el contenido está cifrado (AES-256-GCM). Sin el secreto, los datos son ilegibles. Los identificadores de registro son HMAC opacos: ni siquiera se ven las fechas registradas. |
| Fuerza bruta del PIN desde la app | Tras 5 fallos, espera progresiva (30 s → 15 min) que sobrevive a recargar. Los intentos se procesan de uno en uno y cada uno se cuenta *antes* de la derivación de clave, así que ni los intentos en paralelo ni cerrar la app a mitad saltan el contador; la reautenticación (cambiar PIN, exportar…) usa el mismo contador. Una espera registrada con el reloj adelantado se recorta al máximo (15 min). El código de recuperación y la biometría no se pueden adivinar y siguen disponibles durante la espera. |
| Fuerza bruta del PIN con una copia del almacenamiento | Solo la frena el coste de PBKDF2 (600 000 iteraciones): en un portátil, un PIN de 4 dígitos cae en minutos y uno de 6 en horas; la longitud del PIN se guarda sin cifrar (la usa el teclado). **Solo una contraseña larga resiste este ataque**: la app lo recomienda para quien necesite esa protección. El contador de intentos es un dato local que alguien con acceso técnico al navegador puede borrar. |
| XSS / inyección de código | CSP `script-src 'self'` sin `unsafe-*`, Trusted Types obligatorios (una única política que solo admite `/sw.js`), DOM construido con nodos (nunca `innerHTML`; lo impide una regla de ESLint), sanitización de URLs (`safeUrl`), validación de esquemas en toda entrada (importaciones, sincronización, formularios). |
| Clickjacking | `X-Frame-Options: DENY` y `frame-ancestors 'none'`. |
| Terceros / rastreo | Cero recursos externos: fuentes e iconos autoalojados, sin analíticas ni SDKs. `Referrer-Policy: no-referrer`, `Permissions-Policy` restrictiva. Un test E2E falla si la app hace una petición fuera del origen. |
| Servidor comprometido (funciones opcionales) | El servidor solo recibe datos cifrados en el dispositivo. Las claves nunca salen del dispositivo (la clave de un enlace compartido va en el fragmento `#` de la URL, que el navegador no envía). |
| Filtración de la base de datos del servidor | Solo contiene texto cifrado y hashes SHA-256 de tokens de 256 bits: no hay contraseñas ni datos personales que robar. |
| SSRF mediante suscripciones push | Lista blanca de servicios push (FCM, Mozilla, Apple, WNS), solo HTTPS en el puerto 443, sin credenciales ni host codificado (`%`, `\`) en la URL; se guarda y se envía la forma canónica (así la validación y la librería de envío leen el mismo host) y se revalida antes de cada envío. |
| Abuso / DoS del API | Límite de tasa global de Netlify (`config.rateLimit`, 300/min por IP) + limitador adicional por instancia y por endpoint, límites de tamaño de cuerpo, validación estricta de tipos, TTL y limpieza diaria que reparte el tiempo entre almacenes y continúa donde se quedó. |
| CSRF | El API no usa cookies; además rechaza peticiones con `Origin` de otro sitio o `Sec-Fetch-Site: cross-site`. |
| Actualizaciones maliciosas o mezcla de versiones | El service worker precarga todos los archivos de una versión con hash de contenido; las actualizaciones solo se aplican cuando la usuaria pulsa «Actualizar». |
| Un dispositivo vinculado (o su código) en malas manos | La sincronización solo lleva datos, nunca los ajustes de seguridad (bloqueo automático, bloqueo al salir, notificaciones discretas): cada dispositivo conserva los suyos. Las marcas de tiempo del futuro cuentan como «ahora», para que no ganen para siempre las fusiones. |
| Carreras al cambiar de perfil o bloquear | Cada trabajo asíncrono (guardar, sincronizar) queda ligado a la sesión en que empezó: si se bloquea o se cambia de perfil, no escribe en el otro perfil ni devuelve datos descifrados a la memoria. |

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
- **Varios candados**: el mismo secreto maestro se envuelve con cada método (PIN, recuperación, biometría). Cambiar el PIN no re-cifra los datos. Tras usar el código de recuperación, se obliga a fijar un nuevo PIN y **se rota el código**; el perfil no se abre hasta que ambos están guardados, así que un proceso abandonado no cambia nada.
- **Biometría**: la clave de acceso se crea con un nombre neutro («Menstruapp»), porque aparece en el gestor de contraseñas del teléfono. Al desactivarla o borrar el perfil se avisa al gestor (API *Signal* de WebAuthn, donde exista) para que la elimine; no hay forma estándar de borrarla directamente.
- **Código de recuperación**: 160 bits aleatorios en Crockford Base32 (sin caracteres ambiguos), mostrado una sola vez; nunca se almacena en claro.
- **Borrado**: los registros eliminados dejan una lápida cifrada (necesaria para sincronizar). «Borrar todo» elimina IndexedDB, Web Storage, cachés y el service worker; antes borra del servidor la copia sincronizada, los enlaces y los avisos push del perfil abierto (las claves para hacerlo desaparecen con él). Si el servidor no responde, se pregunta si reintentar, continuar o cancelar. Borrar un perfil hace lo mismo con los datos de ese perfil y detiene sus recordatorios. Los datos en el servidor de otros perfiles bloqueados caducan solos (enlaces ≤ 30 días, avisos 90 días, sincronización 400 días sin uso). Desde la pantalla de bloqueo se puede borrar un perfil sin su PIN (para quien lo ha olvidado): sus datos son ilegibles igualmente.
- **Memoria**: los buffers con material sensible se sobrescriben con ceros tras su uso (mejor esfuerzo; JavaScript no garantiza el borrado).
- **Copias de seguridad cifradas**: PBKDF2 (600k) con la contraseña de la copia + AES-GCM; formato versionado y validado al importar.

## 3. Endurecimiento del frontend

- CSP (idéntica en `_headers` y en `<meta>`; lo verifica un test):
  `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-src 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types menstruapp`
- Sin estilos inline: los valores dinámicos (colores, anchuras) se aplican mediante la CSSOM (`style.setProperty`), permitida por la CSP.
- Reglas de ESLint obligatorias en CI y en el build de Netlify: prohíben `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`, `eval`/`new Function`, temporizadores con cadenas, atributos `on*`, y el uso de `localStorage`/`sessionStorage` fuera del módulo de preferencias (que nunca contiene datos de salud).
- Imágenes de fondo y foto de perfil: se decodifican y re-codifican en un `<canvas>` (se eliminan los metadatos EXIF, incluida la geolocalización). La foto de perfil se guarda cifrada; la imagen de fondo es una preferencia visual que se muestra antes de desbloquear y se guarda sin cifrar en el dispositivo (así se indica en Ajustes).
- Lo único que se guarda sin cifrar, además de las preferencias visuales, es la lista de perfiles con su apodo y emoji (para el selector de la pantalla de bloqueo; puede ocultarse en pantalla con «Ocultar nombres»), los metadatos técnicos de las bóvedas (sal, iteraciones, longitud del PIN, datos envueltos) y la hora de los próximos recordatorios.
- **Recordatorios**: tienen que poder mostrarse con la app bloqueada, así que su texto no puede depender del PIN: se cifra con una clave del dispositivo (no extraíble) guardada junto a ellos. Protege frente a una lectura casual del almacenamiento, no frente a alguien con acceso técnico al navegador desbloqueado; con «Notificaciones discretas» el texto guardado ya es neutro. Sus identificadores y la lista de avisos mostrados son opacos (HMAC), no dicen de qué trata cada aviso.
- **Historial y título**: las búsquedas y las preguntas a Luna nunca van en la URL; el título de la pestaña solo nombra la sección («Hoy», «Aprende»…), nunca un nombre ni una situación; al bloquear, el título vuelve a «Menstruapp» y la dirección se limpia. Las rutas de navegación (por ejemplo, el artículo que se está leyendo) sí quedan en el historial del navegador.
- Todas las URL asignadas a `href`/`src` pasan por `safeUrl`: solo se admiten `http(s):`, `mailto:`, `tel:`, `blob:` y `data:image` en base64 (nunca `javascript:`).

## 4. Backend opcional (`netlify/functions/`)

- **Capacidades**: cada dispositivo/código genera tokens aleatorios de 256 bits; el servidor guarda `SHA-256("menstruapp:" + token)`. No hay cuentas.
- **Sync**: un único blob cifrado por código de sincronización, con control de versión optimista (`409` ante conflicto; el cliente fusiona registro a registro con «gana el cambio más reciente»). Borrado tras 400 días sin uso.
- **Push**: el dispositivo cifra el texto de cada recordatorio con una clave que solo tiene él; el servidor solo guarda la hora y el blob cifrado y lo reenvía (cifrado de nuevo por el protocolo Web Push) al servicio push del navegador.
- **Compartir**: resumen cifrado con una clave aleatoria que solo está en el enlace (`/share.html#<id>.<clave>`); contiene exactamente lo que muestra la página para los apartados elegidos (ni el modo de uso ni el estado de ánimo); caducidad máxima de 30 días; revocable con un token de borrado, que solo se olvida cuando el servidor confirma el borrado.
- Respuestas con `Cache-Control: no-store`, `nosniff`, CSP `default-src 'none'`; los errores nunca exponen detalles internos ni se registran cuerpos o tokens.

## 5. Verificación continua

- `npm run build` (Netlify) y CI: sellado del service worker, ESLint (reglas de seguridad), tests unitarios (criptografía, bóveda, bloqueo, validación, API, invariantes de cabeceras y CSP).
- E2E (Playwright): comprueba que no hay violaciones de CSP/Trusted Types ni peticiones a terceros, que las notas no aparecen en claro en IndexedDB ni en localStorage, bloqueo/desbloqueo y recuperación.

## 6. Limitaciones conocidas

- La seguridad del PIN depende de su longitud: un PIN de 4 dígitos es cómodo pero débil frente a un atacante con una copia del almacenamiento (cae en minutos; uno de 6 dígitos, en horas). Frente a ese ataque solo protege una contraseña larga.
- Adelantar el reloj del dispositivo acorta la espera tras varios intentos fallidos: el navegador no ofrece una hora de confianza.
- La biometría depende del soporte de la extensión PRF de WebAuthn (Chrome/Android y Safari recientes). Si no está disponible, la opción no se ofrece.
- En iOS, Safari puede borrar el almacenamiento de webs no instaladas tras semanas sin uso: por eso se recomienda instalar la PWA y hacer copias.

## 7. Informar de vulnerabilidades

Por favor, no abras una incidencia pública. Escribe al responsable del despliegue con los detalles y pasos para reproducirla; se responderá en un máximo de 7 días.
