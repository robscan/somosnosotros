# 550 · OL-517 · La hoja de Lugares tiembla al volver de la lista hacia el mapa

**Fecha:** 2026-11-12. **Rama:** `hoja-lugares-temblor` (desde `origin/main` 51d468b5). **Quién:** operador del Gestor de cambios IX. **Migración:** ninguna. **Diseño:** sin cambios (docs/rediseno/50, P5b).

## Qué reportó el founder (en su iPhone)

«cuando en la sección lugares la sheet de lugares se extiende hacia arriba, la desplazo hasta llegar a el fondo o tal vez un punto medio del desplazamiento, luego jalo para regresarme a ver el mapa y esconder la sheet. En cuanto llega la sheet al tope al límite de la pantalla, todavía cubriendo el mapa, debajo de los filtros, tiene un efecto como de rebote eterno… no decide si bajar a la mitad, a medium, o quedarse extendida… me han comentado que esto sucede en otros lugares».

## La causa, demostrada con una traza por cuadro

La hoja es un solo desplazador con anclaje (`scroll-snap-type: y mandatory`) en recogida · asoma · llena; llena, `data-libre` quita el anclaje para que la lista tenga su inercia entera. En `HojaLugares.pintar`, que corre con cada evento de desplazamiento, había dos dueños del mismo movimiento:

- **Camino A, el del reporte (dedo ya levantado):** con la lista llena y desplazada, un jalón hacia abajo deja una inercia que llega al principio de la lista y sigue de largo. `pintar` escribía `scrollTop = llena` **en cada cuadro** mientras la inercia estuviera por debajo de llena. Escribir `scrollTop` no detiene la inercia del navegador: sigue desde ahí, vuelve a bajar de llena, la hoja la vuelve a subir… hasta que la inercia se agota.
- **Camino B (dedo puesto al cruzar llena):** `pintar` quita y pone `data-libre` según la posición, también con el dedo puesto. Si al volver el anclaje el navegador reancla la hoja en llena (lo que hace WebKit al cambiar `scroll-snap-type` fuera de un desplazamiento que él sepa de la persona), la hoja vuelve a quitar el anclaje, el dedo la vuelve a bajar, vuelve el anclaje… y la hoja va y viene bajo el dedo.

**Evidencia** (guion `docs/rediseno/capturas-550/550-traza.mjs`: la misma página de la prueba de componente, 390×844, 30 renglones; se registra por cuadro y por evento `y`, `data-hoja`, `data-libre` y cada escritura de `scrollTop` de la hoja; la posición de cada evento se lee en captura, antes de que la hoja reaccione, o sea donde la dejó la inercia). Trazas completas en `550-traza-antes.txt` (con `origin/main`) y `550-traza-despues.txt`:

| Gesto | Antes | Después |
|---|---|---|
| A · Chromium, toques reales (CDP): lista en 1500, jalón de 450 px en 110 ms hacia abajo | **40 escrituras** en 650 ms; en cada cuadro la inercia deja la hoja entre 618 y 644 (16 a 42 px bajo el tope) y la hoja la sube a 660: el temblor | **1 escritura**: la inercia cruza (626), se detiene, llena exacta (660) 20 ms después |
| C · como B, imitando el reanclaje de WebKit al volver el anclaje con el dedo puesto | **103 cambios** de `data-libre`; la hoja se queda pegada en llena bajo el dedo (termina en 660 aunque el dedo jaló 600 px) | **2 cambios**; el dedo baja la hoja y se ancla en asoma (250) |
| Inercia simulada en Chromium que, como reporta el iPhone, no se detiene al escribir `scrollTop` | 115 escrituras | 1 |
| La misma en WebKit (Playwright) | 127 escrituras | 1 |
| B · Chromium, arrastre lento con el dedo que pasa el principio de la lista | 0 escrituras, un solo cambio del anclaje, termina en asoma | igual |

Gráfica del gesto A: **`550-01-traza-gesto-founder.png`** (rojo: dónde la puso la inercia en cada evento; círculo: escritura de la hoja). Antes, la línea roja queda por debajo de llena 650 ms con una escritura en cada punto; después, un solo punto bajo llena y la hoja quieta en ella.

**Lo que no se pudo ver:** el simulador indicado (FLOWYA iPhone SE, UDID 926414EF…) **no existe en esta Mac**: `xcrun simctl list` solo tiene dispositivos de iOS 27.0 (iPhone 17, 17e, 18 Pro, Air, iPads y `ol503-respaldo`), ningún SE. No creé uno ni usé otro. El camino A está demostrado en Chromium con su inercia real y con una inercia simulada en Chromium y WebKit; que el iPhone del founder siga la inercia tras la escritura es lo que dice su reporte, y contradice lo medido el 2026-10-01 en el SE con iOS 26.3 (bitácora 277: «`scrollTop = llena` corta la inercia» en Safari): **por confirmar** si cambió con iOS 27. El camino B solo se imitó (el reanclaje de WebKit no se puede provocar en Chromium).

## Qué cambió

`src/app/lugares/HojaLugares.tsx`, solo `pintar`, un `detener` nuevo y dos marcas del gesto:

1. **Un solo dueño al soltar (camino A).** Cuando la inercia de la lista baja de llena con el anclaje quitado, `detener(llena)` la detiene **una vez por gesto**: la hoja deja de desplazar dos cuadros (`overflow-y: hidden`, que es lo que suelta la inercia en Chrome; con uno solo no llega al hilo que la lleva y sigue), se pone en llena con una sola escritura y vuelve a desplazar. Ya no hay escrituras cuadro a cuadro contra la inercia. Si aun así la inercia siguiera, no se vuelve a escribir: al reposo vuelve el anclaje y la hoja se ancla en una altura, nunca entre dos.
2. **Con el dedo puesto el anclaje vuelve una sola vez por gesto (camino B).** Quitarlo al cruzar llena hacia arriba sigue igual (no puede reanclar nada: así el mismo gesto sigue desplazando la lista); ponerlo al bajar de llena también; lo que ya no pasa es volver a quitarlo en el mismo gesto. Las marcas (`detenida`, `anclaVolvio`) se limpian con cada toque nuevo, y el toque nuevo devuelve el desplazamiento si llegó en los dos cuadros de `detener` (el gesto gana).

La conducta firmada no cambia: llena, la lista se desplaza libre con su inercia entera; la inercia que baja de llena se detiene arriba de la lista (el gesto siguiente la baja); el dedo que sigue jalando desde el principio de la lista la baja a asoma o recogida; al soltar entre alturas el navegador elige por posición y velocidad; nada se cierra; la rueda (sin toque) se comporta igual que antes.

**Una excepción mínima, por confirmar:** si en el mismo gesto el dedo baja de llena y luego vuelve a subir la lista por encima de llena antes de soltar, al soltar la hoja se ancla en llena en vez de seguir con la inercia de la lista (antes el anclaje se volvía a quitar). Es el precio de no quitar y poner el anclaje varias veces bajo el dedo; el gesto siguiente desplaza la lista como siempre.

## Otros sitios revisados («se queda temblando porque no sabe hacia dónde ajustarse»)

Busqué todo lo que combine anclaje o posiciones automáticas con escrituras de desplazamiento mientras el dedo o la inercia siguen (`scroll-snap`, `scrollTop =`, `scrollTo`, `scrollBy`, `scrollIntoView` en `src/`):

- **La ficha dentro de la hoja (recogida · media · llena):** es la misma hoja y el mismo `pintar`; el arreglo la cubre. ✔
- **`src/components/MemoriaScroll.tsx:125` (arreglado, mismo mecanismo y chico):** al volver a una pantalla, durante 600 ms después de reponer el desplazamiento, cada 50 ms devolvía la página a la posición guardada si se movía (`vigilar`). Si la persona empezaba a desplazar en ese rato, la página volvía hacia atrás cada 50 ms contra su dedo o su inercia. Ahora un `touchstart` o una rueda terminan la vigilancia (el gesto gana). Sin prueba de componente propia (no la tiene); probado con lint, tipos y la suite.
- **`src/app/lugares/HojaLugares.tsx` (ResizeObserver, ≈ línea 393, hallazgo, no arreglado):** si cambia el tamaño de la hoja o de su contenido con la hoja entre alturas, la lleva con `irA` (desplazamiento suave) a su altura, aunque haya un dedo puesto. Es una sola animación y no un bucle; solo pasaría si llegan renglones o fotos justo durante un arrastre entre alturas. Si se quisiera, sería un `!tocando.current` en esa condición; no lo toqué para no agrandar la pieza.
- **`src/components/Destacados.tsx:110` (carriles con `scroll-snap-type: x mandatory`):** solo escribe `scrollLeft` una vez al montar; `onScroll` solo guarda. Un solo dueño. ✔
- **La tira de imágenes de las hojas de Instagram (`HojaInstagram.module.css:62`, `x proximity`):** anclaje del navegador sin escrituras de JavaScript. ✔
- **`ui/Hoja`:** no arrastra ni escribe desplazamiento. ✔ **`ui/useCampoVisible` (la sonda del pie de OL-376):** sus correcciones están acotadas (a lo más 6 empujones de 1 px, uno cada 6 cuadros atascados, solo con un campo enfocado y durante 1,2 s) y marca cuando el dedo movió la página (`loMovioLaPersona`); no es un bucle contra la inercia. ✔
- **`ui/Cabecera` y la barra que se recoge (`Armazon.tsx:66-80`):** solo leen el desplazamiento; la barra ya tiene una calma (`CALMA_MS`) contra el ir y venir. ✔
- **El visor de historias (`inicio/Historias.tsx:352-380`):** el arrastre es suyo (puntero y `transform`), sin anclaje ni desplazamiento nativo. ✔

## Pruebas

- **Nueva, en `HojaLugares.componentes.test.mjs`:** «la inercia de la lista llena que cruza llena hacia abajo se detiene en llena una sola vez…»: con una inercia simulada que no se detiene al escribir `scrollTop` (solo si la hoja deja de desplazar), la hoja escribe a lo más una vez, termina en llena exacta, con la lista libre y desplazando. **Con `origin/main` falla** («la hoja escribió el desplazamiento 114 veces contra la inercia»); con el arreglo pasa. Es determinista (no usa toques por CDP), así que corre también en la CI de Linux.
- **Ampliada, la de toques reales** («al soltar, la hoja va directo a su altura…», en la cuarentena de la CI de Linux y obligatoria en Mac): el gesto del founder con la inercia real de Chromium (a lo más una escritura y termina en llena; **con `origin/main` falla con 45 escrituras**) y el camino B con el reanclaje imitado (el anclaje cambia a lo más dos veces y el dedo baja la hoja a asoma).
- `lib/hoja` no cambió.
- Verde: `npm run lint` (0 errores; 2 avisos que ya estaban, en archivos que no toqué), `typecheck`, `npm test` (332 archivos, 5250 pruebas), `test:componentes` (824 de 824), `inventario` y `medir` (64 pantallas × 4 anchos, sin novedades). Las 18 pruebas de la hoja, 3 de 3 veces seguidas.
- Recorridos pedidos, cubiertos por las pruebas de la hoja que siguen en verde: subir de recogida a asoma y de asoma a llena de un impulso, soltar entre asoma y llena (a la más cercana), la ficha (media · llena · recogida y la flecha), filtrar con la lista llena, «reducir movimiento», el panel desde 792.

## Capturas (`docs/rediseno/capturas-550/`)

- **`550-01-traza-gesto-founder.png`:** la gráfica del gesto A antes y después (descrita arriba).
- **`550-02-despues-390x844-llena-en-el-tope.png`:** la página de la prueba a 390×844 justo después del gesto A con el arreglo: la hoja llena, quieta bajo la fila de contexto («chip»), el asa y «12 lugares» arriba, los renglones desde el 0. Es el componente aislado, no la app: con la app no cambia nada estático, el cambio es de movimiento.
- `550-traza-antes.txt`, `550-traza-despues.txt` y el guion `550-traza.mjs` (`node 550-traza.mjs <raíz del árbol> <salida.txt>`).

## Lo que falta probar en un iPhone de verdad

- Que en el iPhone del founder `overflow-y: hidden` durante dos cuadros suelte la inercia de la hoja (en Chrome sí, medido; en Safari es lo habitual, no lo pude ver). Si no la soltara, la hoja ya no temblaría (una sola escritura) pero podría seguir bajando y anclarse en asoma al reposo en vez de quedarse llena: **por confirmar en el iPhone**, con el mismo gesto del reporte (lista llena a media lista o al fondo, jalón hacia abajo con y sin impulso).
- El camino B con el dedo puesto en Safari real.
- **Para el gestor:** el simulador FLOWYA iPhone SE (926414EF…) no está en esta Mac; si se quiere la prueba en Safari del simulador, hay que decir en cuál.

## Decisiones por confirmar

- La excepción del gesto que baja de llena y vuelve a subir sin soltar (arriba).
- Si se arregla el `irA` del ResizeObserver con un dedo puesto (hallazgo, arriba).
