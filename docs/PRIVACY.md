# Privacidad: qué datos existen, dónde y durante cuánto tiempo

Menstruapp sigue el principio de **privacidad por diseño y por defecto** (art. 25 RGPD): todo funciona en el dispositivo y cualquier función con servidor es opcional, está desactivada por defecto y va cifrada de extremo a extremo. La política que ve la usuaria está en la app (Ajustes → Acerca de → Política de privacidad; textos en `public/js/i18n/*.js`, clave `legal.privacy`).

## Inventario de datos

| Dato | Dónde | Cifrado | Retención |
| --- | --- | --- | --- |
| Registros diarios (regla, síntomas, ánimo, temperatura, relaciones, notas…) | IndexedDB del navegador | Sí, AES-256-GCM por registro; ids opacos (HMAC) | Hasta que la usuaria los borre |
| Ajustes del ciclo, modo, embarazo, recordatorios, logros, foto de perfil | IndexedDB | Sí | Hasta que se borren |
| Bóveda (sal, iteraciones, clave maestra envuelta) | IndexedDB | La clave maestra va envuelta con el PIN/contraseña | Mientras exista el perfil |
| Lista de perfiles (apodo, emoji) | IndexedDB | No (se muestra en la pantalla de bloqueo; se puede ocultar en pantalla) | Mientras exista el perfil |
| Preferencias visuales (idioma, tema, color, fondo, tamaño de texto) | `localStorage` | No (no contienen datos de salud) | Hasta «Borrar todo» |
| Imagen de fondo elegida | IndexedDB | No (preferencia visual previa al desbloqueo) | Hasta que se quite |
| Textos de los próximos recordatorios | IndexedDB | Sí, con una clave del dispositivo no extraíble | Se regeneran continuamente |
| Conversaciones con Luna | Solo en memoria | — | Se borran al bloquear |
| **Servidor (opcional)** sincronización | Netlify Blobs | Sí, clave derivada del código de sincronización que solo tiene la usuaria | Se borra al desactivarla, con «Borrar todo» o tras 400 días sin uso |
| **Servidor (opcional)** recordatorios push | Netlify Blobs | Texto cifrado en el dispositivo; se guardan la suscripción push y la hora de cada aviso | Se borra al desactivarlo; limpieza tras 90 días sin actividad |
| **Servidor (opcional)** enlaces compartidos | Netlify Blobs | Sí, la clave solo está en el enlace | Máximo 30 días; revocables |

**No existen**: cuentas, correos, contraseñas en servidor, analíticas, publicidad, huellas del navegador, geolocalización, contactos, ni peticiones a terceros.

## Bases legales (RGPD)

- Uso local: la propia usuaria trata sus datos en su dispositivo; el responsable del despliegue no accede a ellos.
- Funciones con servidor: **consentimiento explícito** (art. 9.2.a), recogido con una casilla específica antes de activarlas, y revocable desactivándolas (lo que borra los datos del servidor).
- Minimización: el servidor no puede leer contenido; solo guarda lo imprescindible para funcionar y lo borra automáticamente (función `cleanup` diaria).

## Derechos de la usuaria, sin intermediarios

- **Acceso y portabilidad**: exportación JSON, CSV, PDF y copia cifrada (Ajustes → Tus datos).
- **Rectificación**: edición de cualquier día o ajuste.
- **Supresión**: borrar un día, un perfil o todo (incluidos los datos del servidor).
- **Oposición / retirada del consentimiento**: desactivar sincronización, push o enlaces.

## Menores

La app no pide edad obligatoriamente ni datos identificativos. Si se indica el año de nacimiento, solo se usa para aplicar los rangos normales de la adolescencia. Se recomienda que menores de 14 años (o la edad que marque cada país) la usen con conocimiento de su familia.

## Si despliegas tu propia instancia

- Eres responsable del tratamiento de los datos cifrados que almacene tu servidor (aunque no puedas leerlos). Revisa y adapta los textos legales de `legal.privacy` y `legal.terms` (incluye tu identidad y contacto).
- Netlify actúa como encargado del tratamiento; revisa su DPA y la región de Netlify Blobs.
- No añadas analíticas, fuentes externas ni scripts de terceros: romperían las garantías anteriores (y la CSP lo bloquearía).
