# 161 · Pincel: el grosor en el iPhone real y la latencia (OL-126)

**Fecha:** 2026-09-22 · **OL:** OL-126 · **Rama:** `pincel-grosor-y-latencia` desde `origin/main` (`4469c01`, con #145–#151) · **Commits:** dos, uno por parte (los hashes van en los avisos al gestor y en OPEN_LOOPS) · **Sin push** (lo sube el gestor) · Sin migración.

## Lo que dijo el founder (literal, desde su iPhone real, tras probar lo publicado)

«Grosor se sigue bloqueando cuando trato de pintar y jalo arriba o abajo, demasiada latencia, aunque ya corresponde la dirección entre celular y pincel.»

El sentido ya está bien (OL-120). Quedan dos cosas, y esta vez el simulador no bastó: en el simulador el grosor pasaba (bitácora 155), en el aparato no. La evidencia del gesto tiene que venir del iPhone del founder; de aquí sale una **sonda** para que la lea, más las cerraduras que pidió el gestor.

## Parte 1 · La sonda y las cerraduras del gesto

**Sonda (`/obra/<id>/mando?sonda=1`).** Un recuadro fijo arriba a la izquierda, en la zona vacía del mando (no tapa el botón, las tarjetas ni la ayuda), que enseña: la fila (`pintando`/`esperando`/`fuera` y cuántos hay), el estado del sensor, cuántas lecturas por segundo da el sensor de verdad, y `pres` (presionado), `cap` (si el botón tiene capturado el puntero: `hasPointerCapture` justo después de `setPointerCapture`), `desp` (px del arrastre), `grosor` y `pos`; debajo, los últimos ocho eventos con hora: `pointerdown/up/cancel` (tipo de puntero y `y`), `pointermove`, `touchmove` (y si Safari lo marcó como no cancelable), `touchend/cancel`, `blur` y «visibilidad oculta». **Sin `?sonda=1` no cambia nada visible**: `anotar` no hace nada y el recuadro no se pinta — medido con Chrome real: rects idénticos con y sin el parámetro (botón 128 px con centro en y = 610.5, tarjetas en 568.5, Centrar en 480.5, ayuda en 692.5, 390/390; `sonda: null` sin parámetro). El parámetro lo lee `page.tsx` (`searchParams`) y llega como prop.

**Cerraduras, por las tres sospechas del gestor:**

- **(a) Desplazamiento / «tirar para refrescar» de Safari.** `.mando { touch-action: none; overscroll-behavior: contain }` (el área entera del mando, no solo el botón); `html` y `body` con `overscroll-behavior: none` mientras el mando está montado (se repone al salir; medido: `["none","none"]`); y, mientras hay un dedo presionando, `touchmove` NO pasivo en el documento con `preventDefault` (cuando es cancelable; la sonda avisa si Safari lo manda «no cancelable», que es cuando ya decidió desplazar).
- **(b) El `click` de encender y el `pointerdown` de pintar.** No se pisan por construcción: `click` solo enciende si está apagado y `pointerdown` solo pinta si está encendido; la sonda anota los dos («pointerdown touch y=359 apagado» → «pointerup»), así que en el iPhone se ve si el orden es otro.
- **(c) `setPointerCapture` con toques.** Se comprueba con `hasPointerCapture` (la sonda lo enseña como `cap=sí/no`) y, por si Safari no entrega `pointermove`, el arrastre se lee también del `touchmove` del documento (`touches[0].clientY`), con `touchend`/`touchcancel` como soltar; las dos vías calculan lo mismo, así que no se pisan. Además `blur` y `visibilitychange` sueltan: si entra una llamada a media pulsación, el botón no se queda trabado.

**Verificación.**

- Chrome real, 390×844 (`evidencia-ol126/mando-ol126-390x844-sin-sonda.png`, `-con-sonda.png`, `-con-sonda-arrastre.png`): rects iguales en los dos; `touch-action: none` en el mando y `overscroll-behavior: none` en html/body; arrastre de 60 px con el puntero: punto 16 → 52.6 → **56 tras soltar**, y la sonda durante el arrastre dice `pres=sí cap=sí desp=60 grosor=3.50` con los `pointermove mouse` uno por uno.
- Simulador de iPhone SE, iOS 26.3, Safari real con toques (`sim-1-sonda.png` … `sim-4-despues.png`): la sonda se ve; el toque anota «pointerdown touch y=359 apagado» y «pointerup» y saca el diálogo del sensor; Allow → `sensor=concedido`; arrastre de 60 pt hacia arriba: llegan **`pointermove touch` y `touchmove` por igual** (mismos `y`: 345, 330, 315, 299), `pointerup touch` al final, **grosor 3.50 y el punto de 56 pt** que se queda. En el simulador no hay sensor: «0 lecturas/s».

**Lo que tiene que leer el founder en su iPhone** con `?sonda=1` al presionar y jalar: (1) si aparece `cap=no`, la captura falla ahí (sospecha c: el respaldo por `touchmove` debería seguir); (2) si aparece `touchmove … (no cancelable)`, `pointercancel` o `touchcancel`, Safari se llevó el gesto (sospecha a); (3) si tras `pointerdown` no aparece ningún `pointermove` ni `touchmove`, el dedo no está generando movimiento para la página (otra cosa: p. ej. el botón de la app instalada); (4) el orden `pointerdown … pointerup` con «apagado/encendido» dice si el encender y el pintar se pisan (sospecha b).

`npm run typecheck && npm run lint` (0 errores; 1 aviso previo en `docs/diseno/logotipo/iconos-sn.mjs`) `&& npm test && npm run build`: verde.

## Parte 2 · La latencia

**Qué sumaba antes (medido en el código, no supuesto):** el mando agrupaba las lecturas y mandaba un `trazo` cada 333 ms (3/s, y el primero salía en el primer tic, no al presionar), la posición sin pintar iba al mismo ritmo, y la pared deslizaba el punto tenue otros 333 ms. En el peor caso, del movimiento del teléfono a verlo en la pared: hasta 333 (agrupación) + red/Realtime + 333 (transición del punto) — y el trazo se dibujaba al llegar, pero el punto que lo acompaña llegaba tarde.

**Qué cambia:**

- **Ritmo según el cupo** (`ritmoDeTrazo(cupo)` en `src/lib/pincel.ts`): pintando, `MENSAJES_POR_SEGUNDO_PINTANDO = 6` por mando mientras `cupo × 6 ≤ PRESUPUESTO_MENSAJES_POR_SEGUNDO = 100` — con el cupo de 10 por defecto, **10 × 6 = 60/s**; con 17–20 mandos baja solo a 5/s (**20 × 5 = 100/s**). Sin pintar, la posición va a `POSICIONES_POR_SEGUNDO = 2`. Pruebas puras: 10 → 6, 1 → 6, 16 → 6, 17 → 5, 20 → 5, y `cupo × ritmo ≤ 100` para todo cupo de 1 a 20; `intervaloMs` (6 → 167, 5 → 200, 2 → 500, 0 → 1000, sin división por cero). Las constantes viejas `MENSAJES_POR_SEGUNDO` e `INTERVALO_MENSAJE_MS` desaparecen: nadie más las usaba.
- **El primer punto sale al instante** al presionar (donde está el punto tenue), sin esperar al primer tic; después, las lecturas agrupadas cada 167 ms (con el cupo de 10).
- **La pared dibuja el trazo en cuanto llega** (ya era así) y **solo el punto tenue se suaviza, en `SUAVIZADO_PUNTO_MS = 120`** (antes 333); prueba: `≤ 120`.
- **Marcas de tiempo de punta a punta:** cada mensaje lleva `muestra` (ms de época de la última lectura del sensor incluida) y `enviado` (ms de época al mandarlo), opcionales y validadas si vienen (un cliente viejo sin marcas sigue entrando; una marca que no es número finito invalida el mensaje); la pared anota cuándo lo recibió y cuándo terminó de dibujar, y `latenciasDe` (pura, 4 pruebas) da agrupación (muestra→envío), red (envío→recepción), dibujo y total (muestra→dibujo). La parte «red» cruza los relojes de dos aparatos (en un iPhone y una Mac con hora automática, decenas de ms de desfase como mucho); agrupación y dibujo son de un solo reloj y exactas.
- **Sonda de la pared (`/obra/<id>/pared?sonda=1`)**, abajo a la izquierda: mensajes en el último segundo, el último mensaje (de quién, cuántos puntos, sus cuatro latencias), la media de las últimas 12 y la advertencia del reloj. Sin `?sonda=1` no cambia nada (medido: `sonda: null`, mismos puntos y mismo lienzo). `page.tsx` lee `searchParams` y pasa `sonda`.
- La sonda del mando dice también el ritmo vigente: «trazo 6/s, posición 2/s».

**Verificación (Chrome real, respaldo local con marcas de tiempo en su log):**

- Ritmo real del mando (`medir-ritmo-ol126.mjs`, lecturas del sensor despachadas a 30/s): sin pintar, 60 lecturas en 2 s → **5 posiciones a 498, 498, 504, 497 ms** (2/s); al presionar, **el primer trazo llega al respaldo −1 ms después del `mousedown`** (mismo instante, con 1 punto) y después **15 trazos en 2.2 s a 163–170 ms** (6/s) con 4–5 puntos cada uno; el último trazo trae `enviado`/`muestra` (agrupación 131 ms porque las lecturas ya habían parado; llegada al respaldo 2 ms después del envío); al soltar, la posición con las marcas.
- Pared 1280×800 (`evidencia-ol126/pared-ol126-1280x800-sin-sonda.png`, `-con-sonda.png`): transición del punto **0.12 s**; un trazo de 4 puntos inyectado con marcas: **a los 40 ms ya hay 2 436 px pintados** (antes 0) mientras el punto aún va a medio camino (opacidad 0.39, en (973, 208) rumbo a (1056, 260)) — el trazo no espera al punto; la sonda dice «último trazo de persona- (4 puntos): sensor→envío 20 ms · envío→recepción 6 ms · dibujo 1 ms · total 27 ms · media (3): envío→recepción 6 ms · total 34 ms»; un mensaje sin marcas entra y sale como «sensor→envío — · envío→recepción — · dibujo 0 ms · total —».

`npm run typecheck && npm run lint` (0 errores; 1 aviso previo) `&& npm test && npm run build`: verde.

**Lo que solo puede verificar el founder:** la latencia sentida en su iPhone con la pared en la Mac: con `?sonda=1` en la pared, «total» es lo que tarda su movimiento en dibujarse (con el desfase de relojes en «envío→recepción»); si «sensor→envío» ronda los 170 ms es la agrupación de 6/s (el presupuesto); si «envío→recepción» es grande, es Realtime/red, no la app.
