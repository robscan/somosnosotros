# Cabeceras consistentes (OL-087)

Pedido del founder, 2026-09-18: la cabecera de Agenda, Lugares y Artistas no tenía el mismo formato ni el mismo orden. La búsqueda era una lupa en la Agenda y un campo siempre abierto en las otras dos. La ciudad era contexto en la Agenda y un chip más entre los filtros en las otras. Los filtros eran pestañas en la Agenda y chips en las otras. «Cerca» aparecía de tres maneras: pestaña, chip y botón sobre el mapa. En Lugares, al bajar solo se quedaban Mapa · Lista.

Se tomó la cabecera de la Agenda como modelo, porque era la única con decisiones firmadas (02, decisiones 6, 15, 16 y 18). Prototipo en `docs/rediseno/prototipos/cabeceras.html`, con las correcciones del founder en el mismo chat, y firmado por él el 2026-09-19 («adelante a maquetar, recuerda el principio de limpieza máxima sin sobre anidar, con código inmaculado»). La firma incluye tres cambios a lo ya firmado en Lugares: Mapa · Lista pasa de pestañas a un botón redondo; «Cerca de mí» pasa a ser la pestaña Cercanos, exclusiva con el tipo; y en el mapa Cercanos sustituye al botón redondo de ubicación.

## Qué quedó

- **`ui/Cabecera`**, una sola cabecera para las tres pantallas y una rejilla plana: renglón 1 con el contexto (fecha, ciudad) y las acciones (botones redondos; la lupa, siempre la última). El campo de búsqueda ocupa ese renglón con el mismo alto. Debajo van las pestañas y, en Artistas, el segundo nivel en chips. Se queda pegada arriba.
- **Al bajar se esconde el renglón 1** y quedan las pestañas (y la tira de letras); al subir un poco, vuelve. Con la búsqueda abierta no se esconde. La cabecera publica en `--alto-cabecera` lo que deja a la vista. Ahí se pegan el título del día en la Agenda (antes, un valor fijo `--alto-cabecera-agenda`) y la tira de letras de OL-085.
- **Botón ↑ para volver arriba**, abajo a la izquierda y frente al botón de publicar; aparece tras bajar una pantalla.
- **Chip de contexto común** (`chip.deContexto`, en `ui/Chip`): 40 px, en negrita y con el icono suave; el texto se corta antes que empujar la lupa. Lo usan la fecha de la Agenda y `ChipCiudad`.
- **`PestanaEnlace`** en `ui/Pestanas`, para filtros que viven en la URL (tipos de Lugares, disciplinas de Artistas). Reemplaza la entrada del historial, no mueve el scroll y late mientras el servidor responde, como `ChipEnlace`. La pestaña elegida se desliza a la vista si la tira no cabe.
- **`Buscador`** (el de la URL) acepta `autoFocus` y `onCerrar`: la ✕ borra `q` y cierra el campo.
- **Lugares**: la cabecera es la misma en Mapa y en Lista, y el mapa llena lo que queda debajo. Se quitaron el buscador, los chips flotantes y el botón de ubicación del mapa; lo encontrado por la lupa sigue flotando sobre él. Cercanos pide la ubicación al tocarla, suelta el tipo y, si ya hay ubicación, vuelve a centrar el mapa.
- **Artistas**: la cabecera se ve siempre (también con la ciudad vacía); la lupa aparece a partir de 8 artistas y las pestañas de disciplina a partir de 12.

## Integración con la tira de letras (OL-085)

La tira y la letra iluminada vienen hechas de directorios; no se reescribieron. Tres ajustes de integración:

1. `.tira` se pega en `top: var(--alto-cabecera)` y sigue a la cabecera cuando se compacta. Se retiró `usePegajosos`, que medía lo pegado arriba y guardaba `--tapa` solo al cambiar de tamaño: con una cabecera que se esconde, esa medida quedaba vieja. Ahora la cabecera publica su propio alto.
2. Antes de saltar a una letra, `antesDeSaltar()` compacta la cabecera al momento y sin animar. Así `irAlGrupo` mide el alto final, y el propio salto no la vuelve a desplegar.
3. **Arreglo en `useLetraActiva`**: se añadió un píxel de margen a la línea de corte. Tras el salto el separador quedaba en 100,09 contra una línea en 100, y se iluminaba la letra anterior. Probablemente también pasaba en producción.

## Verificación

- Typecheck, lint (solo el aviso previo del logotipo), 686 pruebas y `npm run build`, todo en verde.
- Vista en el navegador integrado a 390×844 con `next dev` de la rama, contra un respaldo local de solo lectura con datos inventados (sin producción).
- **Agenda**: al bajar se esconde el renglón 1 y el título del día sube con la cabecera; al subir vuelve; ↑ lleva arriba; la lupa abre el campo con foco y sin cambiar el alto (100 px).
- **Lugares**: lista con Todos · Cercanos · tipos. Cercanos, con la ubicación simulada, ordena por distancia y quita la tira. Museo cambia `?tipo=` y la pestaña se desliza a la vista. En Mapa, el mapa llena hasta la navegación y la lupa busca sobre él. La letra M cae justo bajo la tira y se ilumina.
- **Artistas**: la lupa escribe `?q=` con foco y la ✕ la borra. Música muestra el segundo nivel. La M cae bajo la tira con los tres renglones pegados.
- Escritorio a 1280: gutters alineados con la columna.
- Capturas de 390×844 entregadas a gestión de cambios, fuera del repo.
- Sin migración.
- No se probó en el iPhone del founder, con lector de pantalla ni con el mapa real (sin token de Mapbox en local).
