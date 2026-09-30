# 273 · Ajustes del founder tras revisar las vistas previas (OL-245)

**Fecha:** 2026-09-30 · **Rama:** `ui-ajustes`, desde `origin/ui-lenguaje` (`2c57dc46`) · **OL:** OL-245 · **PR:** por abrir contra `main` (va al final de la cadena #266 · #268 → #282, sin unir) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows.

## Pedido

El founder revisa en su iPhone (y en el simulador de iPad mini de su Chrome) las vistas previas de la cadena de la reestructura y manda ajustes. Van todos en esta rama, encima de la cadena, cada uno en su commit, con el criterio de siempre: «con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código». Cada ajuste tiene su sección, con su cita, lo que cambió, la medida y las capturas.

Cómo se midió, en las tres secciones: Chrome de la Mac con `playwright-core`, la app compilada contra el respaldo local inventado (`scripts/ops/auditoria-ui/respaldo-local`, nunca producción), con el reloj fijo de `npm run medir` (miércoles 7 de octubre de 2026, 10:00) y la sesión de `ana@example.com`. El mapa es el real de Mapbox: la llave pública solo estuvo en un `.env.local` temporal (una sola línea) y en la compilación de trabajo; ambos, con `.next`, se borraron al cerrar. Las capturas están en `docs/rediseno/capturas-273/` como PNG de paleta y cada una se abrió para describirla aquí. Los scripts de medición se quedaron en la carpeta de trabajo, no en el repositorio.

## 1. Mapa: el pin elegido ya no atenúa a los demás

**Founder (2026-09-30):** «En mapa, cuando selecciono un pin se ve muy claro que está activo, no es necesario hacer los otros transparentes, porque se solapan, déjalos con la misma opacidad por favor.»

**Qué cambió.** Se retiró la atenuación entera (no se dejó en 1): fuera `OPACIDAD_ATENUADA`, `opacidadPin`, la propiedad `opacidad` de `propiedadesPin` con su parámetro `hayElegido`, el `hayElegido` de `aGeoJSON` y las cuatro lecturas de pintura de `Mapa.tsx` (`circle-opacity`, `circle-stroke-opacity` y los dos `text-opacity`, el de los nombres y el del día), con sus dos pruebas de `pines.test.ts` y los comentarios que la mencionaban (la cabecera de `pines.ts`; en `Mapa.tsx`, la prop `elegido`, `aGeoJSON`, `capaNombres` y `agregarCapas`; y uno de `VistaLugares.tsx`, que también decía «atenuados»). El elegido conserva todo lo demás: crece ×1,9, el aro de 4, la sombra, su nombre más grande y siempre a la vista, encima de los otros (prioridad 4) y el pulso. Nada más del mapa cambió.

**Medida**, con el mapa real (estilo `light-v11`, no el del founder: solo se copió la llave). La opacidad sale de los píxeles de la captura: (fondo − visto) / (fondo − color del pin), con el elegido puesto y el fondo leído con las capas de pines ocultas; el pin se lee arriba del día blanco, dentro de su círculo.

| Pin que no es el elegido | Antes: visto sobre el fondo | Después |
|---|---|---|
| Aether, con día (`#6d34c8` sobre `#f7f7f7`), teléfono 390 con ACHE elegido y con el Teatro elegido | `#b296e0` = **0,50** | `#6d34c8` = **1,00** |
| Casa del Poeta, sin día (`#1a1a1a` sobre `#fdfdfd`), teléfono con el Teatro elegido | `#8c8c8c` = **0,50** | `#1a1a1a` = **1,00** |
| Los mismos dos, escritorio 1280 con el Teatro elegido | 0,50 y 0,50 | 1,00 y 1,00 |

- **El elegido queda encima de un vecino que lo toca** (el Teatro de la Paz y el Museo Nacional de la Máscara, a unos 115 m: a zoom 14, 25,8 px entre centros; a 13,5, 18,2). Se leen dos píxeles de la captura: uno dentro de los dos círculos y otro en el aro blanco del elegido que cae sobre el disco del vecino. A zoom 14 son `#6d34c8` (el color del elegido; el del vecino es `#1a1a1a`) y `#ffffff`; a 13,5, `#6d34c8` (el vecino queda casi bajo el disco). Al revés (elegido el punto chico de la Máscara, vecino el círculo con día del Teatro, a 13,5): `#1a1a1a` y `#ffffff`. **Antes y después dan lo mismo**: el orden de las capas y la prioridad no cambiaron; lo único que cambia es que el vecino, ahora entero, ya no deja ver la sombra del elegido por debajo.
- **Ningún nombre cae sobre un pin, contado como en P8** (`queryRenderedFeatures` sobre las capas de nombres, con una consulta del tamaño del círculo de cada pin, borde incluido y menos los 2 px de relleno del texto): **0 → 0** con la lista sola (teléfono y escritorio), con cada uno de los nueve lugares elegidos desde la lista (390), con el par del Teatro y la Máscara a cuatro zooms y con el escritorio.
- **Ningún nombre ajeno se encima al del elegido:** una rejilla de 2 px sobre las cajas de los nombres da **0 celdas en común** entre la caja del nombre del elegido y las de los demás, en los nueve lugares, en el par a cuatro zooms y en el escritorio, antes y después. Su nombre se pinta siempre (9 de 9).
- Cuántos nombres se pintan: igual con ocho de los nueve lugares elegidos y con el escritorio; entre las dos corridas cambió un nombre con el Teatro elegido (de 3 a 4) y en el teléfono sin elegir (de 6 a 7), y ninguno de los que se pintan cae sobre un pin.

**Capturas** (`docs/rediseno/capturas-273/`, teléfono 390×844 a 2×, escritorio 1280×800; «antes» es la compilación de `origin/ui-lenguaje` y «después» este commit):

1. **`273-01` · ACHE Galería elegido desde la lista, con un pellizco a zoom 13,5** (390): antes, «ACHE Galería» con su aro, su sombra y «Lun» al doble; a su lado, «Aether» con «Mar» en lila pálido, «Teatro de…» con «Sáb» en lila pálido en el borde derecho, «Museo N… de la M…» en gris y un punto gris. Después, la misma vista: «Mar» y «Sáb» en el violeta entero, «Aether» y «Teatro de» enteros, «Museo N… de la M…» en negro y el punto negro. El elegido, igual.
2. **`273-02` · Teatro de la Paz elegido con su vecino pegado, zoom 14** (390): antes, el disco violeta con su aro blanco y, asomando bajo el aro arriba a la derecha, el punto gris de la Máscara; «Aether» pálido a la izquierda y los puntos y nombres del Ferrocarril y de la Casa del Poeta en gris. Después, el mismo punto de la Máscara, negro, asomando bajo el mismo aro (el elegido encima), «Aether» en violeta entero y los otros dos puntos y nombres en negro.
3. **`273-03` · el panel con el elegido, escritorio** (1280×800): antes, el panel con la ficha del Teatro y el mapa con «Sáb» al doble, «Aether» pálido y los puntos de la Máscara, el Ferrocarril y la Casa del Poeta en gris con sus nombres grises. Después, la misma vista con «Aether» en violeta entero y los tres puntos y sus nombres en negro.
