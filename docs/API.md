# API del backend opcional

Implementación: `netlify/functions/api.mjs` (Netlify Functions v2, ruta `/api/*`), `push-dispatch.mjs` (programada cada 5 min) y `cleanup.mjs` (diaria). Almacenamiento: Netlify Blobs con consistencia fuerte.

Convenciones:

- Solo mismo origen. Peticiones con `Origin` de otro sitio → `403 forbidden-origin`.
- Cuerpos JSON (`Content-Type: application/json`), con límite de tamaño por ruta (`413 too-large`).
- Autenticación por capacidad: `Authorization: Bearer <token>` con un token aleatorio de 32 bytes en base64url (43 caracteres). El servidor guarda solo `SHA-256("menstruapp:" + token)`.
- Todos los datos de usuaria son `{ iv, ct }`: AES-GCM en base64, cifrados en el dispositivo.
- Errores: `{ "error": "<código>" }` sin detalles internos. Límite de tasa → `429` con `Retry-After`.
- Todas las respuestas: `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, CSP `default-src 'none'`.

## Salud

`GET /api/health` → `200 { ok, version, push, sync, share }` — indica qué funciones están activas (la app oculta las que no lo estén).

## Sincronización

| Método | Ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| GET | `/api/sync` | — | `200 { iv, ct, version }` · `404` si no existe |
| PUT | `/api/sync` | `{ iv, ct, baseVersion }` (≤ 5,5 MB) | `200 { version }` · `409 { error: "conflict", version }` si `baseVersion` no es la actual |
| DELETE | `/api/sync` | — | `204` |

El token se deriva con HKDF del código de sincronización (256 bits); la clave de cifrado se deriva por separado del mismo código, así que el token no permite descifrar. El cliente descarga, fusiona registro a registro (gana el `updatedAt` más reciente, incluidas las lápidas de borrado) y sube con la versión leída; ante `409` repite el ciclo.

## Recordatorios push

| Método | Ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| GET | `/api/push/key` | — | `200 { publicKey }` (VAPID) · `404` si push no está configurado |
| PUT | `/api/push/subscription` | `{ subscription: { endpoint, keys: { p256dh, auth } } }` | `204` · `400 invalid-endpoint` si el servicio push no está en la lista blanca |
| PUT | `/api/push/schedule` | `{ items: [{ at, payload }] }` (≤ 200; `at` en ms dentro de [ahora − 1 h, ahora + 62 d]; `payload` = JSON de `{ iv, ct }`) | `204` · `404` si el dispositivo no está registrado |
| DELETE | `/api/push` | — | `204` |

`push-dispatch` envía como máximo los 3 avisos más recientes vencidos por dispositivo (descarta los de más de 3 h), marca el progreso con `sentUntil` y elimina suscripciones que el servicio push declara inexistentes (404/410). Servicios admitidos: FCM, Mozilla autopush, Apple Web Push y WNS (solo HTTPS, puerto 443, sin credenciales).

## Enlaces para compartir

| Método | Ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| POST | `/api/share` | `{ id, iv, ct, expiresAt, deleteToken }` (`id` 16–64 base64url; `expiresAt` ≤ 30 días) | `201 { id, expiresAt }` · `409 exists` |
| GET | `/api/share/:id` | — | `200 { iv, ct, expiresAt }` · `404` · `410 expired` (y se borra) |
| DELETE | `/api/share/:id` | `Authorization: Bearer <deleteToken>` | `204` · `403` si el token no coincide |

El enlace tiene la forma `https://<sitio>/share.html#<id>.<clave>`: el fragmento `#…` nunca se envía al servidor. La página `share.html` descarga el texto cifrado, lo descifra en el navegador (AAD `menstruapp-share-v1:<id>`) y borra el fragmento de la barra de direcciones.

## Variables de entorno

Ver [`.env.example`](../.env.example): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `MENSTRUAPP_DISABLE_SYNC`, `MENSTRUAPP_DISABLE_SHARE`.

## Desarrollo local

`npm run dev` levanta `scripts/serve.mjs`, que sirve `public/` con las cabeceras de `_headers` y enruta `/api/*` a la función con un almacén en memoria (`MENSTRUAPP_STORE=memory`). Los tests del API están en `tests/unit/api.test.js`.
