# 310 · El calendario «Cuándo» a 320 px sin recortar el domingo

**Pieza:** OL-282. **Rama:** `calendario-320` (base `origin/main`). **Fecha:** 2026-10-05.
**Estado:** arreglo medido en Chromium contra el respaldo local a 320, 390 y 1280 px; falta mirarlo en un iPhone de 320 (SE de primera generación) o en el simulador.

## Defecto

`ui/Calendario` (lo usan la hoja «Cuándo» de los filtros y la hoja de fecha del alta de evento, `ui/SelectorFecha`) dibujaba siete
columnas de círculos de 44 px con 2 px de hueco: 7 × 44 + 6 × 2 = 320 px. La hoja deja 280 px de ancho útil en un teléfono de 320 px
(20 px de relleno por lado), así que el calendario era 40 px más ancho que su caja.

## Causa

`.semana` usaba `grid-template-columns: repeat(7, 1fr)`. Una columna `1fr` no baja del ancho mínimo de su contenido, y el día mide 44 px fijos
(`width: var(--toque-min)`): las columnas se quedaban en 44 y la fila se salía de la rejilla. En las filas con rango la banda
(`.enRango`, `width: 100%`) hacía que esas columnas se encogieran a 30,7 px y las demás filas no, de modo que la rejilla quedaba descuadrada
(medido antes: día de rango de 30,7 px de ancho junto a círculos de 44).

## Arreglo (solo `src/components/ui/Calendario.module.css`; `Calendario.tsx` no cambia)

- `.semana`: `repeat(7, minmax(0, 1fr))`, filas fijas de `--toque-min` (44) con `align-items: center`, y `container-type: inline-size` para que cada
  día conozca el ancho real de su columna. El hueco de 2 px pasa a ser `--hueco` (el mismo valor, sin cambio visual).
- `.dia`: diámetro `--d = round(down, min(var(--toque-min), (100cqw - 6 * var(--hueco)) / 7), 1px)`. Con 350 px (390) o más sale 44, el valor de antes. Con 280 px
  (320) sale 38. Se redondea hacia abajo a píxeles enteros: con el ancho fraccionario de la columna (38,28 px) el número de la cuarta columna
  caía a 0,02 px de un límite de redondeo y se veía medio píxel más arriba que los demás (visto en la primera versión con `aspect-ratio`, medido y corregido).
- `.dia::before`: el toque. Llena la fila de 44 px y la columna entera (1 px a cada lado cierra el hueco de 2 px, salvo en el primero y el último día de la fila,
  para no salirse de la rejilla), como el `::before` de `ui/Chip`. Con el círculo de 44 no añade nada visible.
- `.enRango` conserva `width: 100%` y toma el mismo alto del círculo (`--d`), así que la banda sigue continua y a la altura de los extremos.
- Sin márgenes negativos, sin medidas en duro nuevas (`npm run inventario`: 344 aceptadas, 344 ahora; un `-1px` en `inset` contaba como medida y se pasó a `calc(var(--hueco) / -2)`).

## Medidas (Chromium, respaldo local, reloj fijo; rango del 14 al 18 de octubre elegido; hoja «Cuándo» de `/agenda`)

| Ancho | Borde derecho del último día vs hoja | Rejilla se desplaza de lado | Círculo | Toque (alto × ancho) |
|---|---|---|---|---|
| 320 antes | 340 contra 320: el domingo se sale 20 px | sí | 44 (30,7 en la banda) | 44 × 30,7 a 44 |
| 320 después | 299,8 contra 320 | no | 38 | 44 × 39 (la columna mide 40,3 de pitch) |
| 390 antes | 367,8 contra 390 | no | 44 | 44 × 44 |
| 390 después | 367,8 contra 390 | no | 44 | 44 × 45 (el `::before` cubre el hueco) |
| 1280 antes | 902,8 contra 940 | no | 44 | 44 × 44 |
| 1280 después | 902,8 contra 940 | no | 44 | 44 × 45 |

A 390 y a 1280 la captura de después es idéntica píxel por píxel a la de antes (diferencia de imágenes sin ningún píxel distinto, 780×1688 y 2560×1600).
La letra Bricolage Grotesque cargó en todas las corridas (`Bricolage Grotesque loaded`).

## Límite que hay que decir claro

A 320 px el criterio «toque de al menos 44 px» se cumple en alto (la fila entera mide 44) pero **no en ancho**: siete columnas en 280 px dan 40 px de
paso, así que el ancho de cada día es 39 como mucho. Ni con un `::before` más grande se pasa de ahí sin que un día le robe el toque al vecino. Para llegar a 44 de ancho
haría falta que la hoja diera 308 px útiles (menos relleno a 320), y eso es de `ui/Hoja`, fuera de esta pieza. Queda anotado para el gestor: 39 × 44 con
el círculo visible de 38 es lo mejor posible con el relleno actual. `npm run medir` no revisa la hoja cerrada de Cuándo (límite conocido de la prueba).

## Capturas (`docs/rediseno/capturas-310/`, abiertas una por una)

- `cuando-320-antes.png` (320×640 a 2×): hoja «Cuándo» con el rango «14 oct – 18 oct». La columna D solo trae «10» en la primera fila: el «11» queda
  fuera de la pantalla a la derecha; la banda del rango (15, 16, 17) sale más angosta que los círculos de 14 y 18.
- `cuando-320-despues.png`: la misma hoja. Se ven las siete letras L M M J V S D y siete días por fila; 11, 18 y 25 (domingos) completos dentro del margen de 20 px; círculos
  de 38 px; el 7 con su aro de «hoy», el 14 y el 18 rellenos en morado con su punto blanco, la banda lila continua del 15 al 17 a la altura de los círculos, el 22 gris por el
  puntero encima. Todos los números en la misma línea.
- `cuando-390-despues.png`: 390×844. Siete columnas con círculos de 44 como antes; mismo rango, banda continua; sin diferencia con la de antes.
- `cuando-1280-despues.png`: 1280×800, hoja centrada de 600 px; círculos de 44, banda ancha continua del 15 al 17; sin diferencia con la de antes.
- `selector-fecha-320-despues.png`: la hoja de fecha del alta de evento (`ui/SelectorFecha`, que comparte `ui/Calendario`) a 320 px: «Selecciona la fecha del evento», 7 como día elegido en círculo
  morado, 8 gris por el puntero, domingos 11, 18 y 25 completos, lista de horas debajo. También estaba recortada antes y queda arreglada.

## Pruebas

- Nueva en `src/components/FilaEventos.componentes.test.mjs` (la prueba de Cuándo que ya tenía el calendario real con su CSS): «a 320, 390 y 1280 px los siete días caben en la hoja…».
  Comprueba que ningún día sobresale de la hoja, que la rejilla ni la página se desplazan de lado, que el círculo mide 44 (38 a 320) y que el toque real, medido con `elementFromPoint`,
  mide 44 de alto. Control negativo: con el CSS anterior falla (`a 320 px un día sobresale 20 px de la hoja`). `abrir()` toma ahora un ancho opcional (390 por omisión).
- Componentes: FilaEventos, Hoja y Chip, 34 de 34 (eran 33 de 33 antes de añadir la prueba nueva a FilaEventos). `calendario.test.ts` 40 de 40.
- `npm run lint`: 0 errores (1 aviso viejo en `VisorImagen.componentes.test.mjs`, ajeno). `npm run typecheck` limpio. `npm run inventario` sin novedades.
- `npm run medir -- --solo=agenda` (3 pantallas × 4 anchos) y `--solo=alta-evento`: sin novedades.

## Riesgos

- `container-type: inline-size` en `.semana` y `round()` en CSS: soportados en Safari 16+ y 15.4+ respectivamente (iOS 26 en la app instalada); en un navegador sin `round()` el `--d` no
  vale y el día perdería ancho y alto (queda sin tamaño): el soporte de las dos es amplio desde 2023, pero no se probó en Safari del iPhone.
- Las filas miden 44 fijos: si un día tuviera contenido de más de 44 de alto (no lo tiene), se recortaría.
