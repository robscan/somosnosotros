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

(Se anota al cerrar el segundo commit.)
