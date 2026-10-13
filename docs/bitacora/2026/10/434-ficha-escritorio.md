# 434 · El cartel entero en la ficha de escritorio y un visor que cabe en la ventana (OL-403)

**Fecha:** 2026-10-13. **Rama:** `ficha-escritorio`, base `origin/main` (`5de9f172`). **Operador:** agente del Gestor VI (Opus 5.5), en un árbol aislado. **Sin migración, sin variables nuevas, sin consultas nuevas.**
**Estado:** lista para la revisión del gestor y el «publica» del founder. Vista previa: `https://somosnosotros-git-ficha-escritorio-robscans-projects.vercel.app`.

## El encargo

El founder, el 13 de octubre, con dos capturas de su Mac (ventana ancha, ficha a dos columnas): «Dos ajustes necesarios en ficha de eventos y artistas para desktop: En eventos no se aprovecha el alto disponible de columna, que está vacía, debemos presentar el cartel completo sin cortarse, luego al dar tap, cuidar la proporción porque se hace mas grande que el view port y no se puede hacer scroll. En artistas pasa lo mismo y la portada no se muestra».

## Por qué pasaba

1. **El cartel cortado y la columna vacía.** Desde 1048 px la ficha va a dos columnas (`ui/Ficha.module.css`, bloque 10) y la portada se quedaba en la caja del teléfono: 3:2 con `object-fit: cover` (`Cartel.module.css`, `.heroe`) en la ficha normal y 4:3 en la cabecera oscura (exposición, taller, festival). Un cartel 4:5 a 1280×800 salía en una caja de 367×245: cortado arriba y abajo, y el resto de la columna izquierda en blanco mientras la derecha seguía (capturas 01 y 04).
2. **El visor más grande que la ventana.** `VisorImagen` es una rejilla de una celda con `place-items: center` y la imagen con `max-width: 100%; max-height: 100%`. La fila de esa celda era `auto`: crecía hasta el alto del cartel, así que el `100%` medía el cartel y no la ventana. En el teléfono no se notaba (manda el ancho: un cartel de 390 de ancho cabe a lo alto); en escritorio, un cartel de 1080×1350 se abría a 1080×1350 en una ventana de 800 de alto, y a 1× la imagen no se puede mover: la mitad de abajo quedaba fuera, sin salida (captura 11).
3. **«La portada no se muestra» en artistas.** No lo pude reproducir. Con la portada 3:2 del respaldo la ficha de artista se ve igual que la de un lugar (captura 07), y en producción probé tres artistas con portada (Irán Castillo, Luis Felipe Tovar y Grayson Perry) a 1512×900 en Chrome y en WebKit (el motor de Safari), entrando directo y desde la ficha de un evento: en los tres la portada se ve, cortada a 3:2 como el cartel. El `Heroe` del artista sí le pasa su portada; la caja es la misma que la del evento. Lo más probable: la ficha que vio el founder no tiene portada (sale el símbolo SN, que en el teléfono también sale) o su portada es vertical y se veía recortada. **Duda para el founder:** ¿qué artista era? Con el nombre se comprueba en un minuto.

## Lo que cambió

- **`src/components/ui/Ficha.module.css`, solo desde 1048 px** (bloque 10): la portada va entera, con su proporción, a lo ancho de su columna y con el alto de la ventana como tope (`--alto-portada` = la ventana menos la barra de la app y el aire de arriba y abajo); la caja se ciñe a la imagen (`justify-self: start`, `width/height: auto`, `max-width: 100%`), así las esquinas redondas son las del cartel. Se queda pegada bajo la barra de la app mientras la columna de la derecha pasa (`position: sticky`, `top: --portada-arriba`). La cabecera oscura pierde su caja 4:3 y hace lo mismo (el título y los números siguen en su tarjeta oscura a la derecha). Sin portada, el símbolo SN se queda como estaba (3:2; 4:3 en la oscura). Atrás sigue donde estaba, arriba a la izquierda sobre la portada. Vale para el evento, el artista, el lugar y el sitio: los cuatro usan `ui/Ficha` y `ui/Heroe`. La ficha dentro de la hoja de Lugares (un panel) no cambia.
- **`src/components/Cartel.module.css`**: la celda del visor mide la ventana (`grid-template: minmax(0, 1fr) / minmax(0, 1fr)`); con eso el tope de la imagen es la ventana y abre ajustada, entera y centrada, a cualquier tamaño. Acercada, con el ratón la imagen enseña la mano (`cursor: grab`).
- **`src/lib/acercar.ts` y `src/components/VisorImagen.tsx`**: la rueda y el trackpad. Con Ctrl/⌘ o el pellizco del trackpad, acercan y alejan siempre alrededor del cursor. Sin tecla: a 1× la rueda acerca (no hay nada que desplazar) y, ya acercada, **desplaza la imagen** como una página (dos dedos en el trackpad o la rueda del ratón), sin salirse de sus bordes. Un mismo giro sigue haciendo lo que empezó (pausa de 250 ms), así girar la rueda desde 1× acerca de corrido y no solo el primer paso. Arrastrar con el ratón ya movía la imagen acercada (eventos de puntero); ahora tiene su prueba. El pellizco y el doble toque del teléfono no cambian.

## Verificación

- `npm run lint`: 0 errores (1 aviso que ya estaba en `main`, en `VisorImagen.componentes.test.mjs`).
- `npm run typecheck`: limpio.
- `npm test`: **3 862 pruebas en 215 archivos, en verde**; 4 nuevas en `acercar.test.ts` (cuándo la rueda acerca y cuándo desplaza, el giro que sigue, el desplazamiento topado en los bordes de un cartel 4:5 a 2× en 1280×800, líneas y páginas de la rueda en px).
- `npm run test:componentes`: **606 de 606**. `VisorImagen.componentes.test.mjs` gana un segundo cartel (4:5, 1080×1350) y dos pruebas de escritorio a 1280×800: abre a **640×800**, de 320 a 960 y de 0 a 800 (antes, 1080×1350 desde y = 0); acercado, la rueda lo baja exactamente lo que avanzó, al final el pie del cartel queda en 800 y arrastrar con el ratón lo mueve 200 px sin cerrarlo. La de la rueda de antes ahora aleja con Ctrl. Las cuatro del teléfono, igual.
- `npm run inventario`: sin novedades (342 medidas en duro, aceptado 342).
- `npm run medir`: **39 pantallas × 4 anchos en 134 s, sin novedades**; ningún presupuesto se movió (a 1280 la portada cambia de medida, no de nodos).
- Medidas con el respaldo local y `next start` (reloj fijo, sin `.env` en el árbol), con la app pidiendo imágenes de prueba de cada proporción, a 1280×800:

  | Ficha | Antes (caja de la portada) | Después |
  |---|---|---|
  | Evento con cartel 4:5 | 367×245, cortado | **367×459**, entero |
  | Taller (cabecera oscura) con cartel 9:16 | 367×275, cortado | **367×653**, entero |
  | Taller 9:16 en 1280×600 | — | **284×504**: topado por el alto, entero |
  | Artista con portada 3:2 | 367×245 | 367×245, igual |
  | Artista sin portada (SN) | 367×245 | 367×245, igual |
  | Lugar con portada 3:2 | 367×245 | 367×245, igual |
  | Exposición (cabecera oscura) con cartel 4:5 | 367×275, cortado | **367×459**, entero |
  | Visor del cartel 4:5 | 1080×1350, se sale | **640×800** |
  | Visor del cartel 9:16 | 1080×1920, se sale | **450×800** |

  Al bajar la página 368 px la portada sigue en y = 76 (la barra de la app más 20 de aire): pegada. En WebKit (Safari) a 1280×800, las mismas medidas en la ficha y el visor dentro de la ventana.
- **El teléfono no cambió:** a 390×844 las seis fichas (evento, taller, artista con y sin portada, lugar, exposición) dan las mismas medidas y **las mismas capturas, byte a byte** (mismo md5), con el CSS de `main` y con el de esta rama.

## Capturas (`docs/rediseno/capturas-434/`)

Las de escritorio, a 1280×800 y a 2×; las del teléfono, a 390×844 a 3×. Las imágenes son de prueba: rojo arriba («ARRIBA DEL CARTEL»), azul abajo («ABAJO DEL CARTEL»), un marco negro y su proporción al centro: si se ven las dos franjas y el marco entero, el cartel no está cortado.

1. `01-antes-evento-4x5-1280.png`: el problema. El cartel 4:5 en una caja 3:2: no se ven ni la franja roja ni la azul, y bajo la portada la columna izquierda está vacía hasta abajo.
2. `02-despues-evento-4x5-1280.png`: el cartel entero, con las dos franjas y el marco, las esquinas redondas del cartel y Atrás arriba a la izquierda; la columna de la derecha sin cambios.
3. `03-despues-evento-4x5-bajando-1280.png`: la página bajada 368 px: la derecha ya va por «Dónde» y «Artistas» y el cartel sigue arriba, bajo la barra de la app.
4. `04-antes-taller-9x16-1280.png`: el taller (cabecera oscura) con un cartel 9:16 en su caja 4:3: solo se ve el centro.
5. `05-despues-taller-9x16-1280.png`: el 9:16 entero a la izquierda (367×653), y la tarjeta oscura con el título y los números a la derecha, como antes.
6. `06-despues-taller-9x16-1280x600.png`: la ventana baja (600): el cartel se encoge a 284×504 para caber entero, pegado a la izquierda.
7. `07-antes-artista-portada-1280.png`: el artista con portada 3:2 antes: se ve (la del respaldo es 3:2, así que cabe).
8. `08-despues-artista-portada-1280.png`: igual que antes, entera.
9. `09-despues-artista-sin-portada-1280.png`: sin portada, el símbolo SN en su caja 3:2, como hoy.
10. `10-despues-lugar-3x2-1280.png`: la ficha del lugar, igual que antes con una portada 3:2.
11. `11-antes-visor-4x5-1280.png`: el visor antes: el cartel a 1080×1350, desbordado; se ve la franja roja y la mitad de abajo queda fuera de la ventana.
12. `12-despues-visor-4x5-1280.png`: el visor después: 640×800, entero y centrado, con la ✕ arriba a la derecha.
13. `13-despues-visor-9x16-1280.png`: el 9:16 en el visor: 450×800, entero.
14. `14-despues-evento-390.png`, 15. `15-despues-artista-390.png`, 16. `16-despues-taller-390.png`: el teléfono después, idéntico al de antes (cabecera a sangre con su velo y el título encima; la oscura del taller con su alto mínimo).

## Lo que queda

- **Duda para el founder:** qué artista era el de «la portada no se muestra», para comprobar esa ficha en concreto.
- **Duda para el founder:** en el visor, con el ratón, la rueda acerca solo desde 1× (de corrido mientras se gira); ya acercada, desplaza. Para alejar: doble clic (vuelve a 1×), Ctrl o ⌘ con la rueda, o el pellizco del trackpad. Es como Vista Previa y Figma; si prefiere que la rueda siempre acerque y aleje (como antes), el desplazamiento quedaría solo con el arrastre y los dos dedos del trackpad no se podrían distinguir de la rueda.
- La prueba en su Mac (Safari y la app instalada desde Chrome) con la vista previa.
