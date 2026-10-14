# 439 · Acercar el cartel en las historias de Inicio (OL-408)

**Fecha:** 2026-10-14. **Rama:** `historias-zoom`, base `origin/main` (`aa2909cf`). **Operador:** agente de la pieza, sin otros agentes. **Sin migración, sin tablas nuevas y sin variables de entorno nuevas.**
**Estado:** lista para la revisión del gestor y el «publica» del founder.

## El encargo

El founder, el 14 de octubre, textual: «Que se pueda hacer zoom en las imágenes de las historias».

Las historias son el cartel a pantalla completa que se abre al tocar un círculo de la fila «Ahora» de Inicio (OL-359, bitácora 390; prototipo firmado en la 388). Hasta hoy el cartel no se podía acercar: el pellizco caía en los gestos de la historia (tocar pasa, deslizar cierra o cambia).

## Lo que se ve

1. **Pellizcar acerca el cartel** alrededor de los dedos, hasta 4× (lo mismo que el visor del cartel, OL-249). El punto del cartel que estaba bajo los dedos se queda bajo los dedos.
2. **Acercado, uno o dos dedos lo recorren.** El cartel no sale de su celda: la cabecera (con la ✕) y «Ver ficha», el marcador y «Cómo llegar» siguen a la vista y funcionan.
3. **Mientras está acercado, la historia se queda quieta:** la barra de arriba deja de llenarse, no pasa sola a la siguiente, y deslizar mueve el cartel (no cierra ni cambia de historia).
4. **Un toque lo devuelve a 1×**, en la misma historia, y la barra sigue llenándose desde donde iba. Pellizcar hacia dentro hasta 1× también la reanuda.
5. **A 1× todo sigue como antes:** tocar a la derecha pasa, en el tercio izquierdo vuelve, mantener pausa, deslizar hacia abajo cierra.
6. **En escritorio** (la historia en su marco 9:16), la rueda sobre el cartel lo acerca alrededor del cursor y, acercado, lo desplaza; Ctrl/⌘ con la rueda o el pellizco del trackpad acercan y alejan siempre (como el visor, OL-403). Un clic lo devuelve a 1×. No hay teclas `+`/`−`: el visor no las tiene y no las inventé.
7. **Sin doble toque para acercar**, como pedía el encargo: en las historias el toque simple ya avanza, y esperar un posible segundo toque retrasaría cada toque.

## Decisión: el toque simple con el cartel acercado

**Lo devuelve a 1× (y el avance sigue); nunca pasa de historia.** Las otras opciones eran «no hacer nada» o «pasar de historia como siempre». Pasar de historia sería lo que más sorprende: alguien que está leyendo la letra chica y toca para «soltar» perdería el cartel. «No hacer nada» deja a la persona sin una salida obvia del zoom en un teléfono (tendría que pellizcar hacia dentro con precisión). Tocar para volver es lo que hace la app de Fotos del iPhone con la interfaz y es la salida más corta: un toque y la historia vuelve a ser historia. La vuelta se anima con la duración corriente (`--duracion`) y es instantánea con «Reducir movimiento».

## Una sola mecánica: `useZoomImagen`

El pellizco, el arrastre con uno o dos dedos y la rueda salieron de `VisorImagen.tsx` a **`src/components/useZoomImagen.ts`**, que usan los dos. La cuenta sigue en `src/lib/acercar.ts` (sin cambios). El hook crea las dos referencias (la caja y la imagen), pone la transformación directo en la imagen sin pasar por el estado de React y da `tocar`, `mover` y `soltar` para que cada pantalla los enganche a sus eventos de puntero; `soltar` dice dónde fue el toque si fue un toque limpio (un dedo, sin moverse, sin cancelar), y cada pantalla decide qué hace con él: el visor, su doble toque y su cierre; las historias, volver a 1×.

- **El visor no cambia:** mismo comportamiento, mismos límites (`bordes: "caja"`, el valor por omisión). Sus 7 pruebas de `VisorImagen.componentes.test.mjs` siguen en verde.
- **Los límites en las historias (`bordes: "imagen"`):** la celda del cartel es más alta que el cartel (en 390×844, 685 px de alto contra 458). Con los límites del visor, mientras el cartel cabe entero a lo alto se recentra en cada paso del pellizco, y en la primera captura un pellizco sobre la letra chica de abajo la dejaba 130 px más abajo de los dedos (el visor tiene lo mismo, documentado en sus pruebas, pero allí la ventana mide casi lo que la imagen). En las historias el cartel se mueve hasta que sus bordes llegan a donde estaban a 1×: el punto bajo los dedos se queda bajo los dedos; una prueba lo vigila con un punto al 30 % del ancho y al 85 % del alto.
- **Safari iOS:** los gestos terminan con `pointerup` y `pointercancel` (también en `window`), nunca con `pointerleave`. El cartel lleva `touch-action: none` y `-webkit-touch-callout: none` (sin vista previa al mantener el dedo). La capa entera de la historia ya tenía `touch-action: none` desde OL-359 (lo necesita deslizar hacia abajo para cerrar); no lo quité.
- **Cómo conviven con los gestos de la historia** (`Historias.tsx`): un dedo que se posa sobre el cartel (o cualquiera, si ya hay otro dedo en el cartel o el cartel está acercado) es también del zoom. Si llega un segundo dedo (pellizco) o el cartel está acercado, el gesto de la historia se suelta: ni pasa, ni cierra, ni cambia. La historia queda pausada mientras haya un dedo puesto (como «mantener») y mientras el cartel esté acercado (`data-pausada`). Cambiar de historia con las flechas del teclado deja el cartel nuevo a 1×.

## Archivo por archivo

- `src/components/useZoomImagen.ts` (nuevo): el hook descrito arriba.
- `src/components/VisorImagen.tsx`: usa el hook; se queda con el doble toque, el cierre y Escape (de 138 a 78 líneas).
- `src/components/inicio/Historias.tsx`: el hook sobre la celda (`.centro`) y el cartel; `acercada` en el estado (pausa y `data-acercada` en la celda); el reparto de dedos entre el zoom y el gesto de la historia; el toque acercado vuelve a 1×.
- `src/components/inicio/Historias.module.css`: el cartel con `touch-action: none` y `-webkit-touch-callout: none`; la celda acercada recorta (`overflow: hidden` con el radio de la tarjeta); la mano del ratón con el cartel acercado; la transición de la vuelta (`data-suave`). Solo tokens.
- `src/components/inicio/HistoriasZoom.componentes.test.mjs` (nuevo): 5 pruebas en Chrome real con toques por CDP a 390×844 y sin «Reducir movimiento» (el avance corre, para ver que se pausa): (1) pellizcar acerca hasta 4× y pausa la barra (`playState` «paused»), un dedo lo recorre y deslizar hacia abajo no cierra; (2) el punto bajo los dedos se queda; (3) acercado, un toque a la derecha no pasa: vuelve a 1×, misma historia y la barra «running»; a 1× el mismo toque pasa a la siguiente; (4) pellizcar hacia dentro hasta 1× reanuda y la ✕ cierra acercado; (5) en escritorio, la rueda acerca y pausa, y un clic vuelve a 1× sin pasar. Comprobé que las cinco fallan con el código de antes y pasan con el nuevo; tres corridas seguidas en verde.
- `docs/ops/OPEN_LOOPS.md`: OL-408 y el «Last updated».

## Verificación

- `npm run lint`: 0 errores (1 aviso que ya estaba: `page` sin usar en `VisorImagen.componentes.test.mjs`, línea 173; no toqué ese archivo).
- `npm run typecheck`: correcto.
- `npm test`: **220 archivos, 3 907 pruebas**, todas en verde.
- `npm run inventario`: sin novedades (342 medidas en duro, 1 bloque duplicado aceptado).
- `npm run medir`: **40 pantallas × 4 anchos, sin novedades** (128 s). Las historias no se miden en ninguna pantalla: solo existen tras tocar un círculo y ninguna pantalla de `pantallas-*.json` lo hace. La fila «Ahora» sí se mide en `01-inicio`, `s01-inicio-sesion` y `s28-inicio-banner-compartir`, y no cambió (la pieza no añade nodos: solo atributos). `medidas.aceptadas.json` sin tocar.
- Pruebas de componentes: `VisorImagen` 7/7, `FilaAhora` 8/8 y `HistoriasZoom` 5/5.

## Capturas (`docs/rediseno/capturas-439/`, 390×844 a 2×)

Respaldo local (datos inventados) + `next build` + `next start` con el reloj fijo de la medición (miércoles 7 de octubre de 2026, 10:00 en San Luis Potosí), **sin `.env` en el árbol** (llaves inventadas solo en el entorno de la orden). Chrome real con toques, agente de iPhone. El cartel es inventado (4:5, con dos renglones de letra chica abajo) y se contesta en el navegador: no se pidió ninguna imagen a Storage.

1. `01-historia-a-1x.png`: la historia «Concierto de la Orquesta Sinfónica de San Luis Potosí» (HOY · 18:00 · Templo de San Francisco). El cartel entero a lo ancho, centrado; la letra chica de abajo apenas se lee. La primera barra de arriba va llenándose.
2. `02-historia-acercada.png`: la misma historia tras un pellizco de 40 a 120 px entre los dedos sobre la letra chica: 3×. «Cupo limitado · Calle Inventada 12…» y «…lee al acercar: programa, hora…» quedan grandes y legibles a la altura donde estaban los dedos; arriba asoma «ARTE» y «…eba». El cartel queda recortado en su celda: la cabecera con la ✕ y «Ver ficha», el marcador y «Cómo llegar» siguen a la vista. La barra de arriba está detenida (`data-pausada`, la animación en «paused»).
3. `03-toque-vuelve-a-1x.png`: tras un toque a la derecha: el cartel a 1×, la misma historia (no pasó a la siguiente) y la barra de arriba sigue llenándose desde donde iba (`running`).

## Lo que no pude probar

- **El pellizco real en el simulador de iPhone:** el simulador «FLOWYA iPhone SE» (926414EF) no aparece en `xcrun simctl list devices` de esta máquina (solo hay iPhone 17/17e/18 Pro/Air e iPads de iOS 27, todos apagados), y no arranqué otro para no estorbar a otro chat. Las pruebas usan toques reales de Chrome por CDP, que pasan por los mismos eventos de puntero que Safari, pero el pellizco en Safari de verdad queda para el founder.

## Para el founder (en su iPhone, en la vista previa)

https://somosnosotros-git-historias-zoom-robscans-projects.vercel.app

1. Abrir una historia con cartel desde la fila de círculos y pellizcar sobre la letra chica: se acerca donde están los dedos y la barra de arriba se detiene.
2. Con un dedo, recorrer el cartel; deslizar hacia abajo no debe cerrar.
3. Un toque: vuelve a 1×, sigue en la misma historia y la barra continúa.
4. Pellizcar hacia dentro hasta 1×: la barra continúa.
5. Mantener el dedo sobre el cartel no debe sacar la vista previa de la imagen de Safari.
