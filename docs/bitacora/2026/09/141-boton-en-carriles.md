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

## El founder elige "Sobre la foto" y pide un rediseño del botón, universal

> «Sobre foto funciona. Solo quiero corregir algo, intercambia estado de botón activo por el estado default, cuando voy quiero que se vea con el verde intenso. En todos los casos incluidos listados. Quita textos, solo deja botón de acción + o - El toast explica lo que pasa. Que sea un botón redondo con la acción cuida que sea de al rededor de 48 px»

"Sobre la foto" queda como el diseño único (`disenoActual` por defecto en el prototipo); "Abajo" y "Lateral" se quedan en el selector solo de referencia. Rediseño del botón, aplicado en el mismo `.boton-fila` que usan tarjetas y renglón (añadida una sección "Listado" a cada pantalla del prototipo para verlo también ahí, no solo en las tarjetas):

- **Sin texto:** solo el icono. El nombre completo sigue en el `aria-label` (fijo, no cambia con el estado) y el toast dice qué pasó.
- **Estados intercambiados:** antes, invitar era el tono fuerte (`--primario` sólido) y decidido el callado (`--primario-suave`); ahora es al revés.
- **Redondo, ~48 px** (el token `--toque`), en vez de la pastilla con esquinas redondeadas.
- **"En todos los casos incluidos listados"**: no es solo para las tarjetas de los carriles (OL-106) — cambia el aspecto del botón que **ya está en producción** en los renglones de Agenda, Lugares, Artistas y Mi perfil (OL-104, `ui/BotonRenglon`, integrado en el PR #126). Avisado al founder en el chat que esto afecta a ese componente compartido, y quedo esperando su confirmación explícita antes de tocar código de producción — el prototipo ya lo muestra en ambos contextos para que lo vea junto.

### Tres rondas de ajuste fino, en el mismo chat

1. **Icono decidido, de "−" a check:** primer intento con un guion (simetría visual con el "+"); el founder corrigió: «Estado activo es icono de check no "-"». Vuelto a `IconoOk` (el mismo trazo que ya usa el resto de la app).
2. **El verde era un tono inventado.** Primer intento con `--ok` (`#1f6f43`, "verde: Voy confirmado" en `globals.css`); el founder objetó: «El color verde debe ser el mismo de accionables principales, estas inventando un tono nuevo» y ofreció la alternativa de crear un tono "Success" propio. Medido antes de decidir: `--ok` solo se usa hoy como color de **texto** en tres sitios (`ConsentimientoAvisos`, `ActivarAvisos`, `ui/Reclamar`), nunca como fondo de un botón — sería el primer caso. Recomendación aplicada (sin crear un token nuevo a ciegas): reusar `--primario`, el color de todos los accionables principales de la app (Publicar, la nav activa). Si el founder de verdad quiere un verde de éxito distinto, queda pendiente que dé el tono exacto.
3. **Borde gris quitado** del estado por defecto (pedido explícito): ahora es blanco liso, sin `box-shadow` de borde.
4. **En la tarjeta redonda de artista, el check flota sobre el perímetro del círculo**, no adentro: «que el icono de check salga del contenedor de círculo, que flote sobre el perímetro». Medido con trigonometría antes de escribir el CSS: círculo de 104 px (radio 52), botón de 48 px (radio 24); el centro del botón cae en el punto del círculo a 45° arriba a la derecha (`52 + 52·cos45° ≈ 88.8`, `52 − 52·sin45° ≈ 15.2`), lo que da un desplazamiento de `top: -9px; right: -9px` respecto de colocarlo pegado a la esquina. Verificado con `getBoundingClientRect`: la distancia entre el centro del botón y el centro de la foto midió 52.33 px — coincide con el radio (52 px).
5. **Se recortaba: «hay máscara en el contenedor».** El founder tenía razón: `.carril` lleva `overflow-x: auto`, y eso obliga al navegador a recortar también el desborde vertical, no solo el horizontal (`overflow-y` computa a `auto`, confirmado con `getComputedStyle`) — el badge que sobresalía 9 px arriba del círculo caía en esa zona recortada, aunque en la primera revisión visual no se notara. Arreglo: el carril (solo en la tarjeta redonda con este diseño) gana el `padding-top` que el badge necesita, para que quepa dentro de su propia caja en vez de desbordarla. Verificado: `botonTop >= carrilTop` con `getBoundingClientRect`, ya no queda fuera de los límites que recorta el `overflow`.

Preguntado al founder cuál es el tamaño mínimo accionable de la app: **44 px** (`--toque-min`, el piso de Apple/WCAG); 48 px (`--toque`) es el cómodo, el que ya se estaba usando.

## Firma del founder

«firmo, adelante» — confirma el diseño final tal como quedó tras las cuatro rondas de ajuste: "Sobre la foto", botón redondo ~48 px solo icono, `--primario` sólido al decidir (sin verde nuevo), sin borde por defecto, y el mismo diseño también en los renglones de las listas (sustituye el aspecto de `ui/BotonRenglon` desde OL-104). Línea en «Decidido» de `OPEN_LOOPS.md` con sus palabras.

## El gestor confirma sin choque y da seis condiciones

«sin choque. Ninguna pieza en curso toca `ui/BotonRenglon`, `BotonRenglon.module.css` ni `Renglon.module.css`... Adelante con OL-106» — con seis condiciones: (1) el cambio al botón compartido en su propio commit; (2) `aria-label` fijo sin contradecir `aria-pressed`, zona de toque 44 px mínima; (3) medir que la columna `auto` del renglón no salte de ancho entre estados; (4) contraste sobre fotos claras/oscuras, botón que no abre la ficha ni dispara `huboArrastre` al revés; (5) capturas PNG reales a 390×844 de los cinco carriles y los renglones de las cuatro listas, en los dos estados, título al tope; (6) lint/typecheck/test/build, sin subagentes.

## Código

**`Destacados.tsx`/`Destacados.module.css`** (commit `cef8b3e`): prop `boton?: (t: Tarjeta) => EstadoBotonRenglon`; el botón es hermano del `<Link>`, colocado por estructura (`.carril > li > button`) — no hace falta tocar `ui/BotonRenglon` para posicionarlo. `alTocarCarril` suma `stopPropagation()` al `preventDefault()` que ya tenía (condición 4: un arrastre que empieza sobre el botón no lo dispara, porque `preventDefault()` solo cancela la navegación del `<Link>`, no detiene la propagación al botón). `AgendaInicio`/`ListaLugares`/`ListaArtistas` pasan `boton={}` reutilizando `asistenciaTodos.boton`/`seguir.boton`, los mismos hooks que ya usan sus renglones — ninguna consulta nueva.

**Hallazgo aparte, corregido en el mismo commit:** el resaltado de hover/active en escritorio se veía "completamente sin sentido" (founder) — vivía en `.frente` (solo la columna del enlace) y se cortaba justo antes de la columna del botón. Movido a `.renglon` (la fila completa) con `:has()`.

**`ui/BotonRenglon`** (commit `7cdac7b`, aparte, condición 1): redondo, ~48 px, solo icono ("+"/check), `--primario` sólido al decidir, sin borde por defecto (con `--sombra` para el contraste sobre fotos, condición 4). `aria-label` ya venía fijo desde la corrección anterior del gestor (condición 2); zona de toque `min-width`/`min-height: --toque-min` (44 px) aunque el círculo mida 48. Se quita el campo `etiqueta`, sin uso.

**Condición 3 (ancho de la columna), verificada:** con el componente real, `getComputedStyle(li).gridTemplateColumns` midió `330px 48px` en los dos estados (decidido y no) — la columna del botón no cambia de ancho porque ahora es un círculo de tamaño fijo, no texto variable.

**Condición 5 (capturas reales):** simulador FLOWYA iPhone SE (926414EF, iOS 26.3, Safari), con un banco Vite aparte (componentes reales `Destacados`, `RenglonEvento`, `RenglonLugar`, `RenglonArtista`, `BotonRenglon`, datos inventados, sin Supabase ni `.env`) y capturas con `simctl io … screenshot` — PNG reales, no simuladas. El iPhone 15 Pro (390×844 exacto) falló varias veces con errores intermitentes de `simctl` (device IO) tras arrancar; se usó el SE (375×667 puntos, no 390×844 — misma salvedad que la bitácora 129) en su lugar. Seis capturas en el scratchpad de la sesión:
- `01-agenda-destacados-arriba.png`, `02-agenda-renglones-y-detalle.png`: Agenda, carril grande y renglones (Voy sin decidir y decidido), título al tope de 120+ caracteres.
- `03-lugares-destacados-y-renglones.png`: Lugares, Destacados + "Con eventos esta semana" + renglones, Seguir en los dos estados.
- `05-artistas-redondas-y-renglones.png`: Artistas, tarjeta redonda con el botón flotando sobre el perímetro sin recortarse, y renglones.
- `06-perfil-arriba.png`, `07-perfil-renglones.png`: Mi perfil, pestañas Voy a/Sigo con el botón que quita al tocar.

**Condición 6:** `npm run lint && npm run typecheck && npm test`: lint sin errores (el warning de siempre, ajeno); typecheck en verde; 763 pruebas en verde, 7 en rojo (`scripts/test-db.test.ts`, preexistentes, falta `pg` en este árbol); `npm run build` en verde. Sin subagentes en toda la pieza.

## Entrega

Commit local, rama `boton-en-carriles`, sin push. Nueve commits en total (propuesta, prototipo, ajustes de diseño, firma, código de `Destacados`, arreglo de hover, botón compartido). Entregado al gestor con hash, archivos y evidencia.

## Corrección de evidencia: fuente y gutter del banco

El gestor abrió las capturas y devolvió la evidencia (no el código, ya aceptado) por dos causas medidas en el propio banco:

1. **Tipografía:** las capturas salían en serif del sistema. Causa: `--fuente` (`globals.css`) es `var(--fuente-bricolage), -apple-system, …` — un solo `var()` sin argumento de reserva seguido de otras fuentes en la MISMA lista separada por comas, no como reserva de ese `var()`. `--fuente-bricolage` la pone `next/font/google` en `<html>` en la app real; el banco (Vite, sin *pipeline* de Next) nunca la define, así que `var(--fuente-bricolage)` es inválido y, por regla de CSS, invalida la declaración `font-family` **entera** — no salta a las demás fuentes de la lista, cae al valor heredado/inicial del navegador (serif). Arreglo: `<html style="--fuente-bricolage: 'Bricolage Grotesque'">` en el banco, con la misma hoja de Google Fonts y los mismos ejes (`opsz`, `wdth`) que usan los prototipos.
2. **Márgenes:** los renglones del banco iban en un `<ul>` propio, sin la clase real de gutter de cada pantalla. Medido en el código real antes de tocar el banco: en Lugares y Artistas el propio `<ul>`/su contenedor ya trae `padding: 0 var(--gutter)` (`ListaLugares.module.css` `.lista > ul`, `ListaArtistas.module.css` `.lista`); en Agenda lo pone `.grupo` (`margin: 0 var(--gutter) …`); en Mi perfil no lo pone la lista sino el `<main className={ficha.pagina}>` de más arriba (`ui/Ficha.module.css`, `padding: 0 var(--gutter) …`). Arreglo: el banco importa esas cuatro clases reales (`AgendaInicio.module.css`, `ListaLugares.module.css`, `ListaArtistas.module.css`, `FichaPersona.module.css` y `ui/Ficha.module.css`) y envuelve cada lista exactamente como la pantalla real, en vez de un `<ul>` propio.

**Medido con `getBoundingClientRect` en Chrome (390×844), las cuatro pantallas, los dos estados:** distancia del botón al borde derecho y de la foto al borde izquierdo, siempre **20 px** (`--gutter`), igual decidido o no — ninguna columna salta ni se pega al borde. `document.documentElement.scrollWidth > vw` es `false` en las cuatro: sin desborde horizontal. En Artistas, los dos badges de la tarjeta redonda quedan con `left ≥ 0` y `right ≤ 390`: dentro del viewport, sin recortarse.

**Capturas reales** (`simctl io … screenshot`, mismo simulador FLOWYA iPhone SE, banco corregido): `01-agenda-arriba.png`, `02-agenda-renglones.png`, `03-lugares.png`, `04-artistas.png` (carril redondo y renglones en el mismo encuadre), `05-perfil.png` — ya con la tipografía Bricolage Grotesque correcta y el gutter real de 20 px visible en los dos bordes. Enviadas al founder y referenciadas al gestor.

No se tocó código de producto en esta ronda, solo el banco de verificación.

Sin migración.
