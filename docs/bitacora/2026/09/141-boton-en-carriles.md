# 141 · Botón en las tarjetas de los carriles (OL-106)

**Fecha:** 2026-09-21 · **Rama:** `boton-en-carriles`, desde `origin/main` (`f87e76b`) · Continuación de OL-104 (bitácora 139).

## Qué pidió el founder

> «Incluye botón voy y seguir en templates de destacados y con eventos en esta semana. (Agenda, lugares y artistas.» (2026-09-21)

El gestor encargó la pieza a este chat, porque ya tiene el componente (`ui/BotonRenglon`) y los hooks (`useAsistenciaEnLista`, `useSeguirEnLista`) de OL-104. Orden obligatorio: medir, prototipo, firma del founder, código.

## Qué se midió (sin tocar código)

- **Los cinco carriles**, todos hijos de `src/components/Destacados.tsx`: Destacados en Agenda (`grande`, evento), Destacados en Lugares (`grande`, lugar), Destacados en Artistas (`grande`, artista — rectangular, no redondo), "Con eventos esta semana" en Lugares (normal, 220 px, lugar) y en Artistas (`redondas`, 104 px, artista).
- **El tipo `Tarjeta`** (`{id, href, foto, titulo, detalle, van}`) ya trae `id`/`titulo` de la propia entidad de la tarjeta en los cinco casos — incluido "Con eventos esta semana" (`src/lib/eventosSemana.ts`, `tarjetasDeSemana`), donde medí con cuidado que la tarjeta es del **lugar o artista**, no del evento (`id: ficha.id`, `href: /lugares/{id}` o `/artistas/{id}`). Coincide con la recomendación del gestor: el botón de esas tarjetas es "Seguir" a la entidad, no una acción sobre el evento.
- **Sin consultas nuevas:** cada pantalla ya instancia `useAsistenciaEnLista`/`useSeguirEnLista` para sus renglones; como `Tarjeta` ya tiene `id`/`titulo`, la misma llamada (`asistencia.boton(t)`, `seguir.boton(t.id, t.titulo)`) sirve para la tarjeta, sin traer nada del servidor.
- **`huboArrastre` no cubre un botón nuevo dentro del carril:** `alTocarCarril` (capturado en el `<ul>`) hoy solo hace `e.preventDefault()` cuando hubo arrastre, que cancela la navegación del `<Link>` pero no detiene la propagación del clic — un botón hermano del enlace recibiría el toque igual. Hace falta sumar `e.stopPropagation()` en la fase de captura, antes de que el clic llegue al botón. Es el único cambio necesario en `Destacados.tsx`; `huboArrastre` y `UMBRAL_DECISION` (`lib/deslizar.ts`) no cambian.

## Propuesta y prototipo

Documento [`docs/rediseno/30-boton-en-carriles.md`](../../rediseno/30-boton-en-carriles.md): reutilizar `ui/BotonRenglon` con una prop `compacto` (nueva, no un componente distinto) para la tarjeta redonda (104 px, solo icono, sin la palabra); el botón siempre debajo del texto, hermano del `<Link>`, nunca anidado; en la variante de una sola tarjeta (foto al lado), el botón ocupa una fila propia a lo ancho.

Prototipo interactivo en [`prototipos/boton-en-carriles.html`](../../rediseno/prototipos/boton-en-carriles.html), publicado como Artifact: https://claude.ai/artifact/BS3Rt5qshzqfwAmMEH2Nvx — con el mecanismo real de `huboArrastre` (no uno simulado): arrastrar el carril empezando sobre un botón no lo dispara, comprobado con eventos de puntero (`pointerdown` + `click` con 40 px de movimiento → `aria-pressed` no cambia; el mismo toque sin arrastre → sí cambia).

**Hallazgo de maquetación al revisar con `front-visual` (corregido en el prototipo antes de mostrarlo):** el `<li>` del carril, con `display: grid` y sin `grid-template-columns` propio, pone sus hijos (la tarjeta y la fila del botón) uno al lado del otro en la misma fila en vez de apilarlos — el auto-flow de fila por defecto necesita una columna explícita para envolver. Medido con `getComputedStyle` (mostraba dos columnas en vez de una) antes de enseñárselo al founder. Queda anotado para el código real: `Destacados.module.css` necesita `grid-template-columns: minmax(0, 1fr)` en `.carril > li` al sumar la fila del botón.

## Corrección del founder al ver el prototipo

> «Te vuelvo a llamar la atención por calidad en maquetación. el botón Voy aparece debajo de texto mal integrado.» (2026-09-21)

Medido: `.fila-boton` centraba el botón bajo todo el ancho de la tarjeta, mientras el título y el detalle van alineados a la izquierda — el botón quedaba flotando, sin relación visual con el texto de arriba. Corregido: alineado a la izquierda, como el resto del contenido; solo la tarjeta redonda de artista sigue centrando (su texto también está centrado ahí, `text-align: center`). Artifact republicado en el mismo enlace (versión 2).

## Dos diseños más, pedidos por el founder

> «integra el botón a el row con texto del lado derecho y haz otra prueba con el botón en el extremo superior derecho de la imagen»

Añadidos al mismo prototipo (versión 3), con un segundo selector ("Abajo" / "Lateral" / "Sobre la foto") para comparar los tres sin salir de la pantalla:

- **Lateral:** el botón entra en la esquina inferior derecha de la tarjeta, a la altura del renglón de fecha/hora (`detalle`). El botón (44 px) es más alto que esa línea de texto (≈21 px): se centra con flex sobre una caja del alto de la línea, para no invadir el título de arriba.
- **Sobre la foto:** el botón flota en la esquina superior derecha de la imagen.
- En la tarjeta redonda y en "una sola tarjeta" (foto al lado del texto), "Lateral" no tiene sitio real y cae de vuelta al diseño "Abajo", sin forzarlo.

**Dos bugs de posicionamiento, medidos y corregidos antes de mostrarlo:**
1. En "una sola tarjeta" con "Sobre la foto", el botón (`position:absolute; left:84px; right:auto`) medía 224 px de ancho en vez de encogerse a su contenido (~90 px) — `right:auto` no basta para que un elemento absoluto con `left` fijo se encoja: hacía falta `width: max-content` explícito.
2. Con eso puesto, seguía midiendo 224 px: el `padding-left: 136px` de la regla del diseño "Abajo" (para alinear con el texto en esa otra variante) se seguía aplicando y se sumaba al ancho (`box-sizing: border-box` cuenta el padding dentro del `width`). Reseteado a `0` para esta variante.
3. Con el ancho ya correcto, el botón invadía el título porque estaba anclado a una posición fija (`left: 84px`) en vez de a la propia foto (124 px de ancho): con un título de dos líneas el botón quedaba a la altura de la segunda línea de texto, no de la foto. Corregido: anclado a la esquina de la foto con `right: calc(100% - 124px + espacio)`, no a un valor fijo — así funciona sea cual sea el ancho real de la tarjeta.

Los tres, probados con el mismo mecanismo real de `huboArrastre` (arrastrar desde el botón no lo dispara, en los tres diseños).

## Qué falta

Firma del founder sobre cuál de los tres diseños prefiere. Código solo después, con la comprobación medida a 320/375/390 px que pide el gestor.

Sin migración. Sin subagentes.
