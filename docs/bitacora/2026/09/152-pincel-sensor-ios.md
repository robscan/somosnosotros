# 152 · Pincel: el permiso del sensor en el iPhone (OL-117)

**Fecha:** 2026-09-22 · **OL:** OL-117 · **Rama:** `pincel-sensor-ios` desde `origin/main` (`4bc9520`) · **Commit:** `c240d75` (código), este documento aparte · **Sin push** (lo sube el gestor).

## El síntoma

El founder, probando el bloque 3 de Pincel en producción (iPhone, iOS 26, primero desde la app añadida al inicio desde Safari y después en Safari): el mando carga bien («1 personas aquí») y, al presionar el botón, sale en rojo **«Este navegador no tiene sensor de movimiento.»** Un iPhone tiene sensor: el mensaje era falso.

## La causa, medida en el código, no supuesta

Ese texto solo salía de dos sitios de `empezarAPintar` (`src/app/obra/[id]/mando/Mando.tsx`): el `else` cuando no existe `DeviceOrientationEvent` (no es el caso de un iPhone) y el **`catch` de `DeviceOrientationEvent.requestPermission()`** — cualquier rechazo de esa promesa se daba por «sin soporte». Y en Safari de iOS esa promesa **rechaza con `NotAllowedError`** cuando no la llama un gesto que Safari cuente como activación del usuario: se llamaba desde `pointerdown`, que no siempre cuenta (`click`, `touchend` y `pointerup` sí); también rechaza si el permiso ya se negó antes. Que pase igual en Safari y en la app instalada apunta al gesto. Encima, en la app instalada (standalone) WebKit ha rechazado ese permiso aunque el gesto sea válido, porque el permiso vive en Safari y no en la app del inicio — dato del gestor con historial de WebKit; el founder lo vio primero ahí.

## Qué cambia

- **Tres casos, cada uno con su texto** (`decidirSensor` y `textoDelSensor` en `src/lib/pincel.ts`, puros, 9 pruebas): sin constructor → de verdad no hay sensor («Este navegador no tiene sensor de movimiento.», el único caso que lo dice); rechazo con error → **negado**; respuesta `denied` explícita → negado. En negado y sin-soporte, el `name: message` del error se guarda en el estado y se muestra **en gris pequeño bajo el texto rojo** (mientras dura la prueba del founder; también `console.warn`), para leerlo del iPhone si el arreglo del gesto no basta — p. ej. `(NotAllowedError: Requesting device orientation access requires a user gesture to prompt)`.
- **El permiso se pide al soltar** (`onClick` del botón grande), no en `pointerdown`. Hasta tenerlo, la ayuda dice «Toca el punto para activar el sensor» y el botón no pinta; el `aria-label` del botón dice lo mismo. Con el permiso, pintar sigue siendo mantener presionado, como hoy. Chrome y Android (sin `requestPermission`): concedido directo, como antes.
- **Negado en Safari:** «Sin permiso del sensor. Actívalo en Ajustes → Apps → Safari → Movimiento y orientación, y toca el punto otra vez.» — la ruta es la de iOS 18; en iOS 26 la confirma el founder en su teléfono (aquí no se pudo).
- **Negado en la app instalada** (`navigator.standalone === true` o `display-mode: standalone`, consultado solo tras el rechazo y solo en el cliente): «En la app instalada el iPhone no deja usar el sensor. Abre este enlace en Safari.» con un botón **Abrir en Safari** — la misma URL del mando con `target="_blank"`, que desde la app instalada abre Safari, donde el permiso sí se puede dar.
- «1 personas aquí» → «1 persona aquí» (`personasAqui`, 1 prueba).
- Sin `DeviceMotionEvent` extra, sin migración.

## Verificación

Con Chrome real (`playwright-core`, scratchpad de la sesión; ver memoria `reference-captura-png-real`), forzando cada caso con `addInitScript` — corre antes que el código de la página, así que sí alcanza al constructor que captura React —, seis capturas a 390×844 en `…/scratchpad/evidencia-ol088/mando-sensor-390x844-*.png`: `sin-pedir` («Toca el punto para activar el sensor»), `negado-safari` (`requestPermission` forzado a rechazar con `NotAllowedError`, el error del iPhone: ruta de Ajustes + detalle gris), `negado-instalada` (`navigator.standalone = true`: texto del gestor + botón con `href` de la misma URL y `target=_blank` + detalle), `sin-soporte` (sin constructor), `denied` (respuesta explícita) y `concedido` (Chrome sin `requestPermission`: tras tocar, «Mantén presionado y mueve tu celular»). En los seis, el texto leído del DOM coincide con el esperado y `scrollWidth`/`clientWidth` es 390/390.

`npm run typecheck && npm run lint` (0 errores) `&& npm test` (875/875, 10 nuevas) `&& npm run build`: verde.

**Lo que solo puede verificar el founder en su iPhone:** que en iOS 26 el `click` al soltar baste para que Safari muestre el diálogo del permiso. Si aun así rechaza, el gris bajo el rojo dice exactamente qué devolvió, y en la app instalada queda el camino de abrir en Safari.
