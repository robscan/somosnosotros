# 279 · Fecha y hora en violeta; el título de las tarjetas se ajusta a su contenido (OL-251)

**Fecha:** 2026-10-01 · **Rama:** `ui-fecha-violeta`, desde `origin/main` (`6b6c000f`) · **OL:** OL-251 · **PR:** #290 contra `main`, sin unir · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows.

Dos cambios del founder, decididos sobre el prototipo (versión 3, variante «A · Solo color»): «para que sea más barato el cambio, solo haz ajuste de color sobre el productivo».

## 1. La línea de cuándo en violeta (solo color)

Nada se mueve ni cambia de tamaño ni de peso: la línea de cuándo pasa a `var(--primario)` (#6d34c8).

- **Tarjetas de los carriles de Inicio** (`Destacados.tsx` / `.module.css`): el primer dato (`t.detalle`: «mañana · 19:30», «sáb 10 de oct · 18:00», «Próximo: mañana · 19:00»). `detalle` es a veces un cuándo y a veces un tipo («Museo») o una disciplina («Música · Grupo») cuando el lugar o el artista no tienen próximo evento; esos no son un cuándo y quedan grises. Por eso la tarjeta gana el campo `cuando` (`lib/destacados.ts`: siempre en eventos; en lugar y artista solo con próximo) y la clase `.cuando` va solo ahí.
- **Renglones** (`ui/Renglon.module.css`): la línea de un renglón de lista que lleva `<b>` (la hora o fecha) es la de cuándo en los tres renglones que existen (`RenglonEvento`, el «Próximo: …» de `RenglonLugar` y de `RenglonArtista`), así que una sola regla cubre Agenda (Todos y Nuevos), Perfil, fichas de lugar y artista y donde se use `RenglonEvento`, sin tocar los componentes. Icono de reloj o calendario y hora/fecha en violeta; «· Gratis», «· 1 va» (spans sin clase) vuelven al gris `--texto-suave`; «Te interesa» trae su propio color.
- **Contraste medido** (WCAG 2.x): #6d34c8 sobre #ffffff 7.06:1, sobre #f6f5f1 (fondo de Inicio) 6.47:1; pasa 4.5:1 con holgura.

## 2. El título de la tarjeta se ajusta a su contenido

**Causa** (la del founder, confirmada): el carril repartía sus filas con `subgrid` (`.carril` con `grid-template-rows: var(--foto) auto auto`, `li` y `.tarjeta` en `subgrid`), así que la fila del título medía lo del título más largo de todo el carril.

**Cambio** (`Destacados.module.css`): sin `subgrid`. El carril solo alinea arriba (`align-items: start`); cada `.tarjeta` es su propia rejilla `var(--foto) auto auto` (foto, título, datos). La foto conserva su alto explícito (`height: var(--foto)`, el arreglo de Safari de OL-246; no se volvió a `100%`). `.sola` pone sus filas `auto` en la tarjeta en vez de en el carril. **`.sinFoto`**: su fondo y su nombre grande ocupaban foto + fila del título compartida; ahora ocupan la fila de la foto (mismo alto que la foto de las demás) y los datos van debajo, pegados; es el único cambio visible de esa tarjeta (la barrera era una fila compartida que ya no existe).

**Alto del título, antes / después** (390 px, respaldo local): en «Tus planes» el título de «LXS COLOCAOS…» medía 39.1 px (la fila compartida de dos líneas) aunque su texto es de una línea; ahora 19.5 px, y su tarjeta mide 190.5 px en vez de 218.1 (los datos suben pegados al título). La de dos líneas no cambia (39.1 px).

## Pruebas

- `Destacados.componentes.test.mjs`: la prueba de las filas compartidas cambia de sentido: con un título de una línea los datos quedan pegados (hueco 0), la caja del título mide lo que su texto, y las fotos siguen alineadas arriba con el mismo alto (132 px). Nueva: la línea de cuándo es violeta (`rgb(109, 52, 200)`), el sitio gris, y el tipo de un lugar sin próximo gris. La del sin foto ahora compara el fondo con la foto de las demás y suma foto + título + datos sin hueco.
- `destacados.test.ts`: `cuando` en las tarjetas de evento, de lugar con próximo y de artista con próxima; ausente sin ellos.
- `npm run lint && typecheck && test && inventario`, `test:componentes` (205 de 205) y `medir`: verdes. **`medir` no cambia ningún presupuesto** (nodos y profundidad iguales: quitar `subgrid` no cambia el árbol, solo el CSS).

## Capturas (`docs/rediseno/capturas-279/`, 390×844, Chrome, respaldo local inventado; los carteles son un gris liso)

- `antes-1-carril-inicio.png` / `despues-1-carril-inicio.png`: «Tus planes». Antes: la tarjeta de título de una línea («LXS COLOCAOS…») deja un hueco blanco entre su título y los datos grises; después: los datos suben pegados y «dom 11 de oct · 19:00» va en violeta, el sitio en gris.
- `antes-2-carril-semana.png` / `despues-2-carril-semana.png`: «Esta semana», dos tarjetas de dos líneas; solo cambia el color de la fecha y la altura (los datos ya no tienen la fila compartida).
- `despues-3-carril-sin-foto.png`: el final del carril con «Macario, Xantolo camino al Mictlán» sin foto: fondo suave a la altura de la foto, nombre grande, rótulo «Hoy» y el botón; datos debajo, «hoy · 19:00» violeta.
- `antes-4-agenda.png` / `despues-4-agenda.png`: Agenda, Todos. Antes: reloj gris y hora negra; después: reloj y hora en violeta; «· 1 va» y el sitio, grises; el chip y los botones, igual.
- `safari-1-artistas-destacadxs.png` y `safari-2-esta-semana.png`: Safari del simulador «FLOWYA iPhone SE» (iOS 26.3) con la app local (los carteles se cargaron de verdad, los pinta el respaldo local con sus direcciones públicas). Las fotos siguen a su alto y ningún título se encima: «Pimpolina» (una línea) junto a «Orquesta Sinfónica de San Luis Potosí» (dos), con la fecha violeta pegada a cada título.

## Límites

- Los renglones de lugar sin próximo y de artista sin próxima no llevan línea de cuándo: no cambian. La pantalla de Perfil usa `RenglonEvento` y no se capturó aparte (misma regla).
- Pestaña Nuevos y fichas de lugar y artista: cubiertas por la misma regla de `Renglon.module.css` y las pruebas de `medir`; no se capturaron una a una.
- Preparación: el simulador tardó en arrancar (varios intentos); se apagó al terminar. Un `pkill next-server` general del operador pudo detener también un servidor `next` ajeno en la Mac durante las primeras capturas.
