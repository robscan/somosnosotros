# 197 · Hoja propia de fecha y hora en escritorio (OL-162)

**Fecha:** 2026-09-23 · **Rama:** `fecha-escritorio`, desde `origin/main` (`b1767b3`), confirmada con `git branch --show-current` antes del primer commit · **OL:** OL-162 · **Modelo:** Sonnet 5. Sin council, workflows ni subagentes.

## Por qué

El selector nativo de fecha/hora de Chrome no aparece en la app instalada en un monitor externo (bitácora [195](./195-selector-fecha-chrome.md), OL-160), donde no se pudo reproducir la causa ni confirmar el síntoma con una captura del sistema. El founder: «incluye hoja propia de selector de fecha para desktop de una vez; es un riesgo que no quiero correr». En móvil y táctil el selector nativo funciona bien y se queda igual.

## Qué leí

`CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, la entrada OL-162 en `docs/ops/OPEN_LOOPS.md`, `docs/PRINCIPIOS_UX.md`, el canon de hojas `src/components/ui/Hoja.tsx`, `src/app/eventos/SelectorCuando.tsx` y su CSS, `src/components/AgendaInicio.tsx` (el chip de fecha), `src/lib/fechas.ts` (`isoALocal`/`localAIso`/`sugerirInicio`/`ZONA_INICIAL`), `src/components/ui/Chip.tsx` (`ChipNativo`, el patrón del input nativo encima del chip) y `docs/rediseno/prototipos/alta-evento-lugar.html` como referencia de estilo.

## Prototipo

`docs/rediseno/prototipos/fecha-escritorio.html`, 1280×800, Bricolage Grotesque: dos pantallas de escritorio (fondo oscurecido + hoja pegada abajo, centrada al ancho de columna, como el canon `ui/Hoja`).

- **Alta de evento · «Cuándo empieza»**: calendario del mes (lunes a domingo, hoy con aro, 23 elegido en violeta, días pasados atenuados, flechas de mes), lista de horas en pasos de 15 minutos con la sugerida (7:00 p.m.) en negrita y visible sin buscarla, la duración tal cual funciona hoy, y «Listo».
- **Agenda · chip de fecha**: la misma hoja, solo con calendario (sin horas ni duración: Agenda filtra por día, no por instante).

Dos capturas 1280×800 en `docs/rediseno/capturas-197/01-prototipo-alta-evento.png` y `02-prototipo-agenda.png`. No esperé firma: seguí directo al código, como pide el encargo.

## Código

1. **`src/lib/calendario.ts` (+ `calendario.test.ts`).** Ya existía con la lógica del archivo `.ics` (`archivoIcs`, `escaparIcs`, `nombreArchivoIcs`); le agregué al mismo archivo (sin tocar lo que había) la lógica pura del calendario: `semanasDelMes` (las semanas del mes, lunes a domingo, con relleno del mes anterior/siguiente, marcando hoy y lo pasado contra un límite `min` opcional), `diasEnMes`, `mesSiguiente`/`mesAnterior`, `sumarDiasIso`, `pasosHora` (pasos de 15 minutos, 96 horas) y `pasoMasCercano`. 12 pruebas nuevas: meses de 5 y 6 semanas, año bisiesto (2028), límites `min` antes/después de hoy, y los pasos de hora.
2. **`src/components/ui/SelectorFecha.tsx` (+ `.module.css`).** El calendario y, con `conHora`, la lista de horas, envueltos en la propia `ui/Hoja` (`titulo`, `plano`). Teclado: flechas entre días (cruzando de mes si hace falta), Enter/Espacio elige, Escape cierra (ya lo maneja `Hoja`); `role="grid"`/`"gridcell"`/`"listbox"`/`"option"`, roving `tabindex`. Un día antes de hoy (o de `min`) se ve siempre atenuado; `bloquearPasado` (por defecto `true`) decide si además no se puede elegir — en `true` para Agenda (como su `min={hoy}` nativo de hoy), en `false` para el alta de evento (el selector nativo de hoy no restringía la fecha, solo avisaba "Esa hora ya pasó" aparte; con `false` se conserva esa regla).
3. **`src/components/usePunteroFinoAncho.ts`.** `useSyncExternalStore` sobre `matchMedia("(pointer: fine) and (min-width: 760px)")`: en el servidor (y antes de hidratar) da `false`, así el `<input>` nativo es lo único que hay sin JavaScript.
4. **`src/app/eventos/SelectorCuando.tsx`.** En escritorio (`usePunteroFinoAncho`), los chips de fecha y hora de "Empieza" y "Termina" dejan de ser `ChipNativo` y abren la hoja (`SelectorFecha` con `conHora`, `bloquearPasado={false}`); en táctil y móvil, sin cambios (siguen siendo `ChipNativo`). La hora sugerida se marca en la lista: `sugeridaActual` es una función (no el valor), para no leer una `ref` durante el render — se llama solo al abrir la hoja (evento, no render) y su resultado se guarda en un estado local (`sugeridaHoja`) que sí se pasa como valor a `SelectorFecha`.
5. **`src/app/eventos/FormularioEvento.tsx`.** Una línea: pasa `sugeridaActual={() => sugerida.current}` a `SelectorCuando` (la `ref` que ya existía para "mientras nadie toque la hora, sigue a la sugerida").
6. **`src/components/AgendaInicio.tsx`.** El chip de fecha, en escritorio, abre la misma hoja (`SelectorFecha` sin `conHora`, con `min={hoy}`); en táctil y móvil sigue el `<label>` con el `<input type="date">` invisible encima, igual que hoy.

`isoALocal`/`localAIso`/zona horaria/formato ISO: sin tocar. Duración y resugerencia: sin tocar (siguen calculándose exactamente igual, solo cambia de dónde sale la nueva fecha/hora).

### Dos ajustes de lint que no estaban en el plan

- `sugerida.current` no se puede leer durante el render (regla nueva del linter de React, `react-hooks/refs`): resuelto pasando una función en vez del valor (punto 4).
- `usePunteroFinoAncho` no puede hacer `setState` síncrono dentro de un efecto (`react-hooks/set-state-in-effect`): resuelto con `useSyncExternalStore` en vez de `useState` + `useEffect`.

## Pruebas

`src/lib/calendario.test.ts`: 12 pruebas nuevas (agregadas a las 8 que ya había del `.ics`, sin tocarlas) — meses de 5 y 6 semanas, el 29 de febrero de un año bisiesto, `pasado` sin límite propio (antes de hoy) y con `min` antes/después de hoy, los 96 pasos de 15 minutos y el redondeo al paso más cercano.

```
npm run lint       # verde (1 warning preexistente, ajeno: docs/diseno/logotipo/iconos-sn.mjs)
npm run typecheck  # verde
npm test           # verde: 90 archivos, 1133 pruebas (1121 + 12 nuevas)
npm run build      # verde
```

## Evidencia real (Chrome real vía `playwright-core`)

`playwright-core` instalado solo en el scratchpad de la sesión (`npm install --no-save`, nunca en el repo). Para el alta de evento (pide sesión) monté un respaldo 100 % local sin red en el scratchpad (`respaldo/backend.mjs`, Node puro): imita `GET /auth/v1/user`, `POST /auth/v1/token` y cualquier tabla de `/rest/v1/` con filas vacías salvo `perfiles` (una fila admin inventada, `admin@example.com` — nunca pisa el repo), con `.env.local` apuntando a `http://127.0.0.1:4180` y una cookie `sb-127-auth-token` con un JWT sin firma válida (mismo patrón ya usado en las bitácoras 070/144/195); `.env.local` se borró antes de comitear, junto con el respaldo (vive solo en el scratchpad). `next build && next start -p 3212` (build de producción). Chrome real (`/Applications/Google Chrome.app`) vía `playwright-core`.

Seis capturas en `docs/rediseno/capturas-197/`, todas abiertas y miradas antes de esta entrega:

1. **`01-prototipo-alta-evento.png`** (1280×800) — el prototipo: calendario + horas + duración + Listo.
2. **`02-prototipo-agenda.png`** (1280×800) — el prototipo: calendario solo.
3. **`03-alta-evento-hoja-cuando.png`** (1280×800, app real) — `/eventos/nuevo`, renglón "Cuándo" abierto, hoja "Cuándo empieza" real: calendario de septiembre de 2026 con el 23 (hoy, según el reloj de la Mac) elegido en violeta, lista de horas con "7:00 p.m." marcada y ya visible sin desplazar, "Listo". Confirma que el componente real (no el prototipo) pinta igual que el diseño.
4. **`04-agenda-hoja-fecha.png`** (1280×800, app real) — `/agenda`, chip "Seleccionar" tocado: la misma hoja, solo calendario, sin horas.
5. **`05-agenda-standalone-hoja-fecha.png`** (1280×800, app real, `display-mode: standalone` forzado a verdadero — Chrome headless no deja instalar una PWA de verdad, así que se sobreescribió solo esa consulta de `matchMedia`, dejando el resto real) — mismo resultado que la 4: la hoja abre igual en modo app instalada.
6. **`06-movil-alta-evento-nativo.png`** (390×844, `isMobile`/`hasTouch`, user agent de iPhone) — `/eventos/nuevo` con "Cuándo" abierto: los chips nativos de siempre (sin cambio visual). Medido, no solo mirado: `matchMedia("(pointer: fine) and (min-width: 760px)").matches` da `false`; al tocar el chip de fecha, `document.activeElement.getAttribute("type")` da `"date"` (el `<input>` nativo recibe el foco) y no hay ningún `[role=dialog][aria-label='Cuándo empieza']` en el árbol — la hoja de escritorio no aparece.

Bricolage Grotesque cargada en las tres pantallas de escritorio (`document.fonts.check('16px "Bricolage Grotesque"')` = `true`).

## Correos

`git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` sin resultados (el único match del prototipo es un falso positivo de la URL de Google Fonts, `wght@12..96`, no un correo). El único correo real de esta pieza, `admin@example.com`, es un dato inventado del respaldo local del scratchpad: nunca se comitea, vive fuera del repo.

## Alcance y límites

- Solo se tocaron los dos sitios que pide la entrada OL-162 (el "Cuándo" del alta de evento y el chip de fecha de Agenda). `ChipNativo` en sí no se tocó — sigue usándose tal cual en `src/app/admin/obras-colectivas/CrearObraAqui.tsx`, fuera del alcance de esta pieza.
- La hoja de "Termina" (fecha y hora de fin) usa el mismo patrón que "Empieza": abre `SelectorFecha` con calendario y horas; no lleva su propio prototipo dibujado (el prototipo cubre "Empieza" y el chip de Agenda, que son los dos casos que pide la entrada), pero el código y las pruebas cubren los tres chips iguales.
- No se probó con el founder en su Mac real ni en un monitor externo de verdad: la evidencia es Chrome real vía `playwright-core`, en una sola pantalla. La confirmación final de que esto resuelve el síntoma original (bitácora 195) queda para cuando el founder lo pruebe en su equipo.
- `package.json` y el lock, intactos. `.env.local` y el respaldo local del scratchpad no forman parte del commit.

Sin push ni PR. Rama `fecha-escritorio`; a revisión del gestor.

## Corrección del gestor (2026-09-23)

El gestor abrió `03-alta-evento-hoja-cuando.png` y pidió cuatro ajustes antes de pasarlo al founder:

1. **El título del mes salía «Septiembre De 2026».** No era `tituloMes()` (que ya ponía mayúscula solo a la inicial: "Septiembre de 2026"); era `.cabeceraMes strong { text-transform: capitalize }` en `SelectorFecha.module.css`, que pone mayúscula a cada palabra y convertía la "de" en "De". Se quitó esa regla (queda solo la mayúscula inicial de `tituloMes`). Mismo arreglo en el prototipo, que además tenía el título hardcodeado sin "de" ("Septiembre 2026"): se corrigió a "Septiembre de 2026" en los dos usos del archivo.
2. **Las filas del calendario medían ~80px de alto.** `.dia` usaba `aspect-ratio: 1`, y con columnas de ~80px de ancho (600px de columna ÷ 7) el aspect-ratio estiraba cada fila a esa misma altura. Cambiado a un círculo fijo de 44px (el toque mínimo, `--toque-min`), centrado en su columna con `margin: 0 auto` en vez de estirarse: el calendario queda compacto (una semana ronda 44px + 2px de separación, no ~80px). Mismo cambio en el prototipo.
3. **La lista de horas mostraba solo 2-3 filas.** `.horas` tenía `flex: 1; min-height: 0` dentro de `.selector { height: 100% }`, pero la hoja no tiene una altura fija (crece con su contenido, `max-height: calc(100% - 48px)` del canon `ui/Hoja`) — así que ese `100%` no resolvía a nada útil y el flex se quedaba chico. Cambiado a una altura fija de 6 filas (`calc(6 * var(--toque-min))`, 264px), desplazable; la hora elegida se sigue centrando al abrir (`scrollIntoView({ block: "center" })`, sin cambios ahí). Mismo cambio en el prototipo (220px → 264px).
4. **La duración no se veía en la hoja.** No era un error de recorte: `SelectorFecha` nunca la mostraba (el prototipo sí la dibujaba, pero el componente real no tenía esa fila). Se agregó: `SelectorFecha` recibe un prop `duracion` opcional (texto ya formado, ej. "2 horas" o "Sin hora de fin") y lo pinta debajo de las horas, arriba de "Listo", solo si se manda; `SelectorCuando` lo calcula con una función nueva, `etiquetaDuracion(horas)` (misma variable `duracion` que ya existía, sin tocar cómo se calcula), y se lo pasa solo a la hoja de "Empieza" (como en el prototipo). En la captura re-tomada se ve "Duración · Sin hora de fin" (un evento nuevo no trae hora de fin todavía) — el mismo texto que ya usa hoy el chip de "Termina" cuando no hay fin, así que "como hoy" queda literal. Cabe completo sin desplazar a 1280×800 (medido en la captura: la hoja entera, del asa a "Listo", termina antes del borde inferior de la ventana).

### Verificación tras la corrección

```
npm run lint       # verde (mismo warning preexistente y ajeno de siempre)
npm run typecheck  # verde
npm test           # verde: 90 archivos, 1133 pruebas (sin cambios de lógica que probar aquí: todo es CSS + una fila nueva)
npm run build      # verde
```

### Capturas reemplazadas

Mismo método que la entrega original (Chrome real vía `playwright-core`; para las reales, el mismo respaldo local sin red — cookie nueva, mismo patrón — levantado y vuelto a borrar):

- **`01-prototipo-alta-evento.png`** y **`02-prototipo-agenda.png`** (prototipo, 1280×800): título correcto, calendario compacto; `02` no lo pidió el gestor explícitamente, pero comparte el mismo CSS que `01` — dejarlo con el bug viejo habría sido inconsistente dentro del mismo archivo, así que se regeneró también.
- **`03-alta-evento-hoja-cuando.png`** (app real, 1280×800): los cuatro ajustes juntos — "Septiembre de 2026", calendario compacto, seis filas de hora visibles (7:00 p.m. centrada), y "Duración · Sin hora de fin" debajo, todo dentro de los 800px sin desplazar.
- **`04-agenda-hoja-fecha.png`** y **`05-agenda-standalone-hoja-fecha.png`** (app real, 1280×800): mismo título y calendario compactos; sin horas ni duración, como antes (Agenda no las lleva).

`06-movil-alta-evento-nativo.png` no cambió (nada de esto toca táctil/móvil); se volvió a generar por completitud del script y salió igual, byte a byte.
