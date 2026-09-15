# 030 · Filtros en Lugares y Artistas

**Fecha:** 2026-09-14 · **Rama:** trabajo sin commit sobre `main` (el founder decide el PR) · **Pieza:** OL-006 (Artistas) y OL-005 (Lugares)

## Qué pidió el founder
"Respecto a las secciones de lugares y artistas ya es muy necesario proveer filtros para facilitar la tarea de encontrar."

## Lo que dicen los datos (producción, 2026-09-14)
- **521 artistas:** música 306, artes visuales 85, teatro 52, letras 31, danza 28, cine 12, otro 7. Solistas 352, grupos 166, colectivos 3.
- Dentro de música, el detalle que trajo el CAPO agrupa en seis géneros: rock/metal/alternativo 88, pop/urbano/electrónica 68, regional/tropical/versátil 47, tradicional/folclore/canto nuevo 47, académica/clásica 32, jazz/blues/soul 23. En artes visuales: pintura 51, fotografía 12, multidisciplina 10, gráfica 7, escultura 5. Teatro, danza, letras y cine no tienen detalle que valga un chip.
- **14 lugares:** otro 6, foro 4, colectivo 2, galería 1, casa de cultura 1.

Conclusión: un solo nivel (disciplina) deja 306 de música: hace falta un segundo nivel, pero solo donde exista. En Lugares el tipo apenas separa porque 6 de 14 están en "Otro": el filtro sirve cuando los tipos estén bien puestos.

## Lo que se hizo
- **Artistas**: chips de disciplina bajo la búsqueda, en la cabecera pegajosa, a partir de 12 artistas (**decisión 2 de Artistas, ya firmada**, que no se había construido): Todos · Música · Teatro · Danza · Artes visuales · Letras · Cine · Otro, solo las disciplinas con alguien. **Segundo nivel (nuevo, para su firma):** al elegir una disciplina, una segunda fila con sus detalles (género o técnica) cuando al menos dos de ellos reúnen 3 artistas o más, de más a menos frecuente: Todo · Rock, metal y alternativo · Pop, urbano y electrónica … Cambiar la disciplina limpia el detalle. El conteo ("306 artistas") dice cuánto queda. Vacíos: "Todavía no hay artistas de jazz registrados." y "Nadie de música se llama «x». ¿Lo registras?".
- **Lugares (lista)**: una sola fila de chips bajo la búsqueda: **Cerca de mí** (antes iba solo, arriba; el founder preguntó por qué no estaba con los demás) · Todos · Casa de cultura · Foro · Galería · Colectivo · Otro (tipos solo los presentes, a partir de 8 lugares). "Cerca de mí" usa ahora `ui/Chip` como los demás (con `disabled` mientras se pide la ubicación); el aviso de ubicación va bajo la fila. Vacío: "Todavía no hay lugares de tipo galería." **El mapa filtra igual**: el tipo vive en `VistaLugares` y vale para las dos vistas (cambiar de Mapa a Lista no lo pierde); sobre el mapa la fila de chips flota arriba, en la columna, y el logotipo y la atribución de Mapbox pasan abajo a la izquierda (el botón de ubicación sube 32 px).
- `lib/artistas.ts`: `filtrarArtistas(artistas, busqueda, { disciplina, detalle })`, `disciplinasPresentes`, `detallesDe`, `UMBRAL_CHIPS_ARTISTAS = 12`, `MINIMO_POR_DETALLE = 3`. `lib/lugares.ts`: `filtrarLugares(lugares, busqueda, tipo)`, `tiposPresentes`, `UMBRAL_CHIPS_LUGARES = 8`. Chips con `ui/Chip` (`Chips` + `Chip`), los mismos del alta de evento. Estado local (no en la URL).

## Verificación
- Lint, typecheck, 101 pruebas (4 nuevas: disciplina, detalle, tipo, orden de los chips; la del importador ahora espera `circo`) y build en verde.
- Mirado a 390×844: Artistas con la fila de disciplinas; "Música" abre la segunda fila y deja 306; Lugares → Lista con la búsqueda y la fila Cerca de mí · tipos; mapa con búsqueda y chips flotando, "vert" acerca a Vértika con su tarjeta y "casa" encuadra tres.

## Para el founder
- Firmar el segundo nivel de Artistas y los chips de tipo en Lugares.
- En Lugares quedan dos controles antes de la lista: la búsqueda y la fila de chips.
- Revisar el tipo de los 6 lugares en "Otro" (vienen del CAPO): sin eso el filtro no separa.
- **Nombres en el mapa** (pedido del founder: "se fusionan con otros nombres"): del color de acción, DIN Pro Bold 14 px, halo blanco de 2 px; las colonias y calles del estilo van en gris y mayúsculas, así que ya no se confunden.
- **Buscador en el mapa** (pregunta del founder): sí, y es el mismo de la lista (`busqueda` vive en `VistaLugares`). Sobre el mapa flota encima de los chips; el mapa muestra solo lo que coincide y va a ello: un solo resultado, se acerca y abre su tarjeta; varios, los encuadra bajo la búsqueda (`Mapa` recibe `encuadre`). Sin coincidencias: "Ningún lugar se llama así. Si existe, regístralo." sobre el mapa.
- **Artes circenses como disciplina** (decisión del founder: "Otro" solo tenía artes circenses): migración 0012 (`20260914070000_artes_circenses.sql`, **aplicada a producción**): entra `circo` en la lista cerrada y los 7 artistas del CAPO que estaban en "otro · artes circenses" pasan a `circo` sin detalle. En código, `DISCIPLINAS` lleva "Artes circenses" antes de "Otro", el importador clasifica `artes-circenses` como `circo` y el icono es la máscara. Hoy "otro" queda en 0 artistas y el chip desaparece solo. En Lugares, "Otro" se mantiene (decisión del founder: los tipos son variados).
- **Las filas de chips corren a todo lo ancho** (corrección del founder: en escritorio se recortaban en el borde de la columna). La caja que las contiene no pone gutter; la búsqueda y los textos lo ponen ellos (`margin-inline: var(--gutter)`) y la fila de chips lleva el gutter como relleno interior, así el primer chip queda alineado con la columna y los demás siguen hasta el borde de la pantalla. En el teléfono no cambia nada. Regla nueva en [LINEA_GRAFICA.md](../../../diseno/LINEA_GRAFICA.md).
- **Revisión con lupa** (el founder avisó: "acabas de romper buscador de mapa"). Lo que se rompió al sacar los chips de la columna y cómo quedó: (1) el campo de búsqueda del mapa tenía `width: 100%` y, con margen a los lados, se salía por la derecha → `width: auto` (hijo del grid, se estira solo); (2) el campo de la lista, al pasar de `padding` del contenedor a margen propio, se encogió a su ancho natural (un `input` no se estira con `width: auto`) → `width: calc(100% - 2 * var(--gutter))`; (3) al buscar algo sin resultado en el mapa, la tarjeta del lugar anterior seguía abierta → la búsqueda cierra la tarjeta salvo con un único resultado. Comprobado a 390 y 1280: mapa ("vert" → Vértika con tarjeta; "zzz" → aviso y sin tarjeta), lista (búsqueda a lo ancho de la columna, fila Cerca de mí · tipos completa en escritorio), Artistas (dos filas a todo lo ancho, pegadas al bajar).
- Por decidir: si los filtros van en la URL para compartir "los foros".
