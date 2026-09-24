# 205 · Cabecera de Lugares con chip de fecha; chip solo ícono; «ver en lista» abajo (OL-170)

**Fecha:** 2026-09-24 · **Rama:** `lugares-cabecera-fecha`, desde `origin/main`.

Pedido del founder: «Mantén canon de header entre agenda y lugares, es decir nuestro selector de fecha. […]
estado inicial solo con icono, sin palabra "seleccionar", al seleccionar fecha escribir "mie 30 sep" evitar
el "de" para ahorrar espacio. Y por último: en mapa mueve el accionable para ver en listado abajo, puede
flotar sobre agregar lugar. Anticipa que pasaría si los chips del lado derecho en header son muy anchos por
nombre de ciudad. Se empalma con buscador? Ahora la idea de traer chip de fecha a mapa es para filtrar por
fecha precisamente». Solo prototipo y documento: nada de código de la app (`src/**`) se tocó, solo se leyó
para entender el canon existente (`AgendaInicio.tsx`, `ui/Cabecera.tsx`, `ui/Chip.tsx`, `ui/SelectorFecha.tsx`,
`VistaLugares.tsx`).

## Qué se entregó

1. **`docs/rediseno/prototipos/cabeceras.html`**: sección nueva «OL-170» al final (cinco teléfonos propios,
   montados aparte de los que ya firmó el founder en OL-087 — no los toca): el chip de fecha en su estado
   inicial (solo el ícono, área de toque ≥44 px con un `::before` invisible), con «mié 30 sep» elegido (sin
   «de»), y el caso de la ciudad de nombre largo con y sin la regla de truncado, más el mismo caso a 320 px.
2. **`docs/rediseno/prototipos/mapa-lugares.html`**: sección nueva «OL-170» al final (cuatro teléfonos propios,
   montados aparte de los cuatro que ya firmó el founder en OL-124→OL-141): el chip de fecha antes del de
   ciudad (mismo orden que Agenda), sin el botón redondo de Mapa · Lista en el renglón 1 (baja al pie); el
   mapa filtrado por fecha (con resultado y sin ninguno); la Lista con «Ver en mapa» en el mismo lugar que
   «Ver en lista» del Mapa.
3. **`docs/rediseno/45-lugares-cabecera-fecha.md`**: qué cambia en Agenda (solo el chip) y en Lugares (chip,
   filtro por fecha, botón de lista abajo), la tabla de anchos medidos (320/375/390 px, San Luis Potosí y el
   caso al tope), la regla propuesta con su razón, y las decisiones que debe firmar el founder.
4. **Nueve capturas reales** en `docs/rediseno/capturas-205/` (numeradas 01–09, detalladas en el documento).

## Cómo se construyó el prototipo

Ninguna de las dos secciones nuevas toca las funciones ni el HTML de lo ya firmado: cada una es un bloque de
HTML/CSS/JS propio, montado con `document.querySelectorAll(".estudio")[1]` (mapa) o un contenedor nuevo
(`#estudioOL170`, cabeceras), reusando solo lo que ya era seguro reusar sin tocarlo: en `mapa-lugares.html`,
la constante `LUGARES`, la función `svg()` y el `<template id="plantilla">` existentes (clonados, nunca
mutados en el original); en `cabeceras.html`, los tokens del `:root` y la fuente ya cargada. El mecanismo de
encoger + truncar el chip de ciudad (`.chipCiudad170.conRegla170` / `.chipCiudad.conRegla`) reproduce el que
ya existe en `src/components/ui/Chip.module.css` (`.deContexto`: `flex: 0 1 auto` + `min-width: 0` +
`text-overflow: ellipsis`), no uno inventado para esta pieza.

**Un detalle de CSS que valió la pena medir en vez de suponer:** la primera versión del caso «sin regla» (07)
le dio `position: relative` a todos los chips (`.chip170`, para el truco del área de toque del chip de fecha).
Eso hacía que el chip de ciudad desbordado, al ser un elemento posicionado, pintara **encima** de la lupa
(no posicionada) y la tapara por completo — un bug de mi propio CSS, no del canon real. Medido con
`getBoundingClientRect()` antes de aceptarlo: se corrigió dejando `position: relative` solo en el chip de
fecha (que sí lo necesita para su `::before`); con eso, el chip de ciudad desbordado vuelve a pintarse
**detrás** de la lupa (que sí queda tocable), que es el «se empalma» real que preguntó el founder — no un
tapado total. La captura 07 de esta entrega ya es la versión corregida.

## Medidas (no a ojo)

Guion de medición (scratchpad de la sesión, no en el repo) ejecutado sobre el prototipo con Chrome real
(`playwright-core`), con la fuente real de la app inyectada (ver «Correcciones del gestor»): ancho del chip
de ciudad y espacio libre hasta la lupa, a 320/375/390 px, con «San Luis Potosí» (la única ciudad de
producción, `src/lib/ciudad.ts`) y con «Dolores Hidalgo Cuna de la Independencia Nacional» (el caso al tope
que pidió el founder), en los dos estados del chip de fecha. Tabla completa en el documento
[`45-lugares-cabecera-fecha.md`](../../../rediseno/45-lugares-cabecera-fecha.md). Hallazgo: «San Luis
Potosí» se lee completa en 390 px siempre; el recorte solo aparece a partir de 375 px, y solo con una fecha
elegida (a 375 px, «San Luis Pot…»; a 320 px, «Sa…»). Sin fecha elegida se lee completa en los tres anchos.
Queda anotado como decisión para el founder.

## Capturas reales (`docs/rediseno/capturas-205/`), 390×844 (09 a 320 px de ancho)

Chromium de `/opt/pw-browsers` vía `playwright-core` (`npm i --no-save` en el scratchpad de la sesión, nunca
en el repo). Cada captura inyectó la fuente real con `page.addStyleTag()` (el `.woff2` variable del build de
la app) y esperó con `page.waitForFunction` a que `[...document.fonts]` tuviera una entrada «Bricolage
Grotesque» con `status === "loaded"` (máx. 20 s); las nueve dieron `loaded`. El `<link>` de los dos archivos
del repo sigue intacto, apuntando a `fonts.googleapis.com`, como todos los demás prototipos — el truco es
solo del script de captura, nunca del archivo. Las nueve se abrieron con `Read` y se compararon letra por
letra contra Arial antes de aceptarlas: los trazos de «SMSNSTRS», «Ver en lista»/«Ver en mapa» y los títulos
de renglón son inconfundiblemente Bricolage Grotesque (condensada, con los rasgos propios de la fuente), no
la de reserva. Detalle de esta corrección en «Correcciones del gestor», abajo.

- **`01.png`** — Agenda, chip de fecha solo ícono.
- **`02.png`** — Agenda, con «mié 30 sep» elegido; «San Luis Potosí» se lee completa, con aire antes de la lupa.
- **`03.png`** — Lugares (Mapa), chip solo ícono (sin filtro), «Ver en lista» flotando sobre «Registrar lugar», color de acción violeta (como en producción).
- **`04.png`** — Lugares (Mapa) filtrado por «jue 24 sep»: un solo lugar pintado.
- **`05.png`** — Lugares (Mapa) filtrado por «lun 21 sep», sin resultados: aviso «Ningún lugar tiene eventos ese día».
- **`06.png`** — Lugares (Lista), «Ver en mapa» flotando en el mismo lugar que «Ver en lista» del Mapa.
- **`07.png`** — Cabecera con ciudad al tope, SIN la regla: se empalma con la lupa (el chip pinta detrás de ella).
- **`08.png`** — El mismo caso CON la regla: se recorta a «Dolo…», sin solape.
- **`09.png`** — Lo mismo, a 320 px de ancho.

## Correcciones del gestor

El gestor devolvió la primera entrega con dos hallazgos; los dos se corrigieron en esta misma rama antes de
volver a entregar.

**1) Bloqueante — color.** Las pantallas nuevas del mapa (03 a 06) salían en azul petróleo `#0f6b7c`
(«Entrar», barra inferior, pines con evento, «Registrar lugar»): es el `--primario` con el que se firmó el
prototipo original (OL-124→OL-141), pero ya no es el color de producción — el founder firmó el violeta
`#6d34c8` el 2026-09-23 (doc 37, OL-146; `src/app/globals.css` línea 11) y no podía evaluar un prototipo con
un color que ya no existe. Corrección: `--primario` (y `--primario-suave`) se puso en el `<div class="estudio">`
de la sección OL-170 de `mapa-lugares.html`, no en el `:root` del archivo — así los pines/botones nuevos usan
el violeta de producción (con `--ok` verde para lo seguido y `--destacado` naranja para lo destacado, sin
aros, exactamente como ya está en producción tras OL-146) sin cambiar el color de los cuatro teléfonos de
arriba, que el founder ya vio y firmó en azul. Se revisó también `cabeceras.html`: su sección OL-170 no usa
`--primario` en ningún estado (los chips y el botón redondo son siempre neutros, sin color de acción), así
que no arrastraba el azul y no necesitó cambio. Las capturas 03 a 06 se rehicieron y se confirmaron a ojo con
`Read` (violeta en «Entrar», la píldora activa del nav, «Registrar lugar» y los pines con evento; naranja en
el destacado; verde en los seguidos, sin cambios).

**2) Dato que no cuadraba.** La primera versión del documento 45 decía que, con «mié 30 sep» elegido, hasta
«San Luis Potosí» se recortaba a «San Luis …» en 390 px — pero la captura 02 mostraba el nombre completo,
con aire. Causa: el guion de medición y de captura usaba el `.woff2` que `fonts.googleapis.com` sirve a un
navegador headless sin las señas completas de uno real (tres subconjuntos estáticos por rango, pedidos con
`curl`), que no aplicaba bien el eje de condensado (`font-stretch`/`font-variation-settings: "wdth"`) de
Bricolage Grotesque — el texto salía más ancho de lo que sale con la fuente real, y por eso se truncaba antes
de lo que trunca de verdad. Se corrigió inyectando el `.woff2` variable real (el mismo del build de la app,
que el gestor dejó preparado en el scratchpad) y volviendo a medir con `getBoundingClientRect()` a 320/375/390
px: con la fuente correcta, «San Luis Potosí» se lee completa en 390 px siempre, y el recorte solo aparece a
partir de 375 px y solo con una fecha elegida (375 px → «San Luis Pot…», 320 px → «Sa…»). La tabla, el
hallazgo y la decisión 2 del documento 45 se reescribieron con estos números; las capturas 01/02/07/08/09
(que también usaban la fuente equivocada) se rehicieron con la fuente correcta — el texto cambia de ancho en
algunas (por ejemplo «San Luis Potosí» ahora se ve completa en la 02), aunque el diseño y la regla no
cambiaron.

## Lo que no se tocó

- `src/**` no se editó en ningún momento (solo se leyó, según lo encargado).
- `prototipos/lugar-evento-pantalla.html` (de OL-169) no se tocó.
- Los teléfonos ya firmados en `cabeceras.html` (OL-087) y `mapa-lugares.html` (OL-124→OL-141) siguen igual:
  las nuevas secciones son bloques aparte, al final de cada archivo.

## Correos en el diff

`git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` no encontró ninguna dirección.

## Cierre

Sin push del founder pedido todavía en este chat más allá de lo indicado en el encargo (`git push -u origin
lugares-cabecera-fecha` al terminar, sin PR). Commit local en `lugares-cabecera-fecha` con
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
