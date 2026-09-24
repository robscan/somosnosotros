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
(`playwright-core`): ancho del chip de ciudad y espacio libre hasta la lupa, a 320/375/390 px, con «San Luis
Potosí» (la única
ciudad de producción, `src/lib/ciudad.ts`) y con «Dolores Hidalgo Cuna de la Independencia Nacional» (el
caso al tope que pidió el founder), en los dos estados del chip de fecha. Tabla completa en el documento
[`45-lugares-cabecera-fecha.md`](../../../rediseno/45-lugares-cabecera-fecha.md). Hallazgo a destacar: con
una fecha elegida, **hasta «San Luis Potosí» se recorta** a «San Luis …» en 390 px — la regla evita el
choque (0 px libres, nunca solape), pero acorta el nombre de la única ciudad que hay hoy; queda anotado como
decisión para el founder.

## Capturas reales (`docs/rediseno/capturas-205/`), 390×844 (09 a 320 px de ancho)

Chromium de `/opt/pw-browsers` vía `playwright-core` (`npm i --no-save` en el scratchpad de la sesión, nunca
en el repo). En este entorno Chromium no confía en el certificado del proxy y Google Fonts no carga
(`net::ERR_CERT_AUTHORITY_INVALID`), y `document.fonts.check(...)` puede dar `true` en vacío sin que la fuente
real haya llegado (le pasó al operador de OL-169). Corrección del gestor, atendida: en vez de fiarse de
`check()`, cada captura inyectó la fuente local con `page.addStyleTag()` (el mismo `.woff2` variable del build
de la app, servido por `file://` desde el scratchpad — nunca desde el repo) y esperó con `page.waitForFunction`
a que `[...document.fonts]` tuviera una entrada `Bricolage Grotesque` con `status === "loaded"` (máx. 20 s);
las nueve dieron `loaded`. El `<link>` de los dos archivos del repo sigue intacto, apuntando a
`fonts.googleapis.com`, como todos los demás prototipos — el truco es solo del script de captura. Las nueve
se abrieron con `Read` y se compararon letra por letra contra Arial antes de aceptarlas: los trazos de
«SMSNSTRS», «Ver en lista»/«Ver en mapa» y los títulos de renglón son inconfundiblemente Bricolage Grotesque
(condensada, con los rasgos propios de la fuente), no la de reserva.

- **`01.png`** — Agenda, chip de fecha solo ícono.
- **`02.png`** — Agenda, con «mié 30 sep» elegido; revela que «San Luis Potosí» ya se recorta a «San Luis …».
- **`03.png`** — Lugares (Mapa), chip solo ícono (sin filtro) y «Ver en lista» flotando sobre «Registrar lugar».
- **`04.png`** — Lugares (Mapa) filtrado por «jue 24 sep»: un solo lugar pintado.
- **`05.png`** — Lugares (Mapa) filtrado por «lun 21 sep», sin resultados: aviso «Ningún lugar tiene eventos ese día».
- **`06.png`** — Lugares (Lista), «Ver en mapa» flotando en el mismo lugar que «Ver en lista» del Mapa.
- **`07.png`** — Cabecera con ciudad al tope, SIN la regla: se empalma con la lupa (el chip pinta detrás de ella).
- **`08.png`** — El mismo caso CON la regla: se recorta a «Dolo…», sin solape.
- **`09.png`** — Lo mismo, a 320 px de ancho.

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
