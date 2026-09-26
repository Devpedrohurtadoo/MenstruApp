# Checklist de QA antes de publicar

Marca cada punto en un **móvil Android (Chrome)** y un **iPhone (Safari, app instalada)**; lo que dice «auto» ya lo cubren los tests automáticos (`npm run verify`), pero conviene revisarlo a ojo en cada versión importante.

## 0. Automático (bloquea el despliegue si falla)

- [ ] `npm run build` en verde (sello del service worker, ESLint con reglas de seguridad, tests unitarios).
- [ ] `npm run typecheck` sin errores.
- [ ] `npm run test:e2e` en verde (onboarding, bloqueo, registro, calendario, cifrado en reposo, offline, instalabilidad, axe en claro/oscuro, Luna, idiomas, copia/borrado/restauración, embarazo, PDF, sync y enlaces).

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
