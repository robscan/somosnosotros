# 247 · Calendario propio con días sin eventos desactivados: código (OL-218)

**Fecha:** 2026-09-25/26 · **Rama:** `calendario-codigo`, desde `origin/main` (`245df2a`) · **OL:** OL-218 · **Modelo:**
Sonnet 5. Sin council, workflows ni subagentes. Pieza de código con prototipo firmado (OL-216, bitácora 245).

## Por qué

El founder firmó el prototipo `docs/rediseno/prototipos/calendario-dias-con-eventos.html` (OL-216, bitácora 245):
la hoja propia de fecha (`ui/SelectorFecha`, OL-162) reemplaza al `<input type="date">` nativo de `ui/ChipFecha`
en Agenda y Lugares, con los días sin eventos desactivados. Esta pieza es el código real.

**Precisión del founder, a mitad de la pieza (relayada por el gestor):** «En calendario se me pasó pedirte un
texto de instrucción claro, ahora dice "Fecha", puede ser "Selecciona una fecha" y ojo, esto lo tenemos que usar
en eventos también. Ahí puede ser "Selecciona la fecha del evento". Con sus cambios obvios, pero es el mismo
canon.» Con las precisiones que la acompañaron (citadas donde corresponde, abajo).

## Qué leí

`CLAUDE.md`, la entrada OL-218 completa en `docs/ops/OPEN_LOOPS.md`, el prototipo firmado completo y la bitácora
245 (estados, decisiones del founder, evidencia), `src/components/ui/ChipFecha.tsx` + `.module.css` (las dos
ramas antes de esta pieza), `src/components/ui/SelectorFecha.tsx` + `.module.css` (OL-162), `src/lib/calendario.ts`
(`semanasDelMes`), `src/lib/fechas.ts` (`diaLocal`, `diaLargo`, `terminaDe`/`eventoPaso`, `filtroSinPasar`),
`src/lib/agenda.ts` (`filtrarAgenda`, `agruparPorDia`), `src/lib/lugares.ts` (`diasConEvento`,
`lugaresConEventoElDia`), `src/lib/cargarAgenda.ts`, `src/app/lugares/page.tsx` + `VistaLugares.tsx`,
`src/components/AgendaInicio.tsx`, `src/app/eventos/SelectorCuando.tsx` + `FormularioEvento.tsx`,
`src/lib/fechaNativa.ts` (+ su prueba), `src/components/ui/ChipFecha.componentes.test.mjs` (el canon de prueba de
componente a actualizar).

## Decisión de fondo: sin consulta nueva, sin migración

La encargo pedía investigar «la consulta más barata posible». La más barata es **ninguna**: Agenda
(`cargarAgenda`) y Lugares (`cargar()` de `/lugares/page.tsx`) ya cargan, en su única consulta pesada de
eventos, `inicio`, `fin` y `zona` de cada evento — exactamente lo que hace falta para saber qué días tienen
eventos. Se calcula del lado del cliente (Lugares, síncrono) o se deriva de la misma promesa diferida (Agenda),
sin ninguna consulta ni función SQL nueva. **No hay migración en este PR.**

- **Horizonte:** el que ya cubre esa consulta — `cargarAgenda` trae hasta 300 eventos futuros (ordenados por
  inicio); `cargar()` de Lugares, hasta 500 ligados a un lugar. El último día con datos decide hasta qué mes se
  puede navegar (`haySiguienteMes`); no hay un tope de meses aparte. Si algún día se anuncia un evento con mucha
  anticipación, se podrá navegar hasta ese mes — igual que "hasta donde haya datos" del prototipo.
- **Criterio distinto en Agenda y en Lugares**, tal como pedía el encargo: en Agenda cuenta *cualquier* evento de
  la ciudad ese día; en Lugares, solo los que tienen `lugar_id` (mismo criterio que ya usaba
  `lugaresConEventoElDia` para filtrar el mapa y la lista, OL-174/OL-210) — un evento en "otro sitio" no cuenta
  para Lugares, porque filtrar por ese día ahí no movería ningún pin ni renglón. Verificado en las capturas 05 y
  08/09 con un evento de ejemplo sin lugar (30 de septiembre): activo en Agenda, "sin eventos" en Lugares.

## `src/lib/calendario.ts`: las piezas nuevas, todas puras y probadas

- **`diasActivosCalendario(eventos)`** → `Map<"YYYY-MM-DD", cuántos>`. Sin `fin`, el evento ocupa solo su día de
  inicio (mismo criterio que `terminaDe` en `fechas.ts`: sin fin explícito, nunca dura más que ese día). **Con
  `fin`, ocupa cada día de calendario entre el de inicio y el de fin, inclusive, en la zona del propio evento —
  un evento de varios días cuenta en cada día que ocupa.** Un `fin` corrupto (antes del inicio) se acota al
  inicio, para no perder ni ese día.
- **`hayMesAnterior`/`haySiguienteMes`**: hasta dónde se puede navegar. "Mes anterior" no antes del mes de hoy (si
  `bloquearPasado`); "mes siguiente" no más allá del último día con datos (o siempre, si no hay `diasActivos` —
  la hoja de alta de evento no restringe por día).
- **`etiquetaDia`**: el nombre accesible completo a partir del texto largo ya calculado (`fechas.ts#diaLargo`) —
  agrega "hoy", "ya pasó"/"sin eventos"/"N evento(s)" (solo si se sabe: `conEventos` llega `undefined` en la hoja
  de alta de evento) y, solo en modo "filtro", "toca para quitar" en el día ya elegido.
- **`mesInicial`**: el mes con el que abre la hoja (el de la fecha ya elegida, o el del límite).
- **`ocupaDia(evento, fecha)`**: la misma regla de `diasActivosCalendario`, para un evento solo — la usan Agenda
  y Lugares al **filtrar** por el día del chip (ver "Un bug de verdad que encontré", abajo).

36 pruebas nuevas en `calendario.test.ts` (antes 20): expansión de varios días, con zonas distintas; un `fin`
corrupto no cuelga la función ni pierde el día de inicio; navegación de mes con y sin `diasActivos`; las cuatro
combinaciones de `etiquetaDia`; `mesInicial` con y sin fecha.

## `ui/SelectorFecha.tsx`: un componente, dos modos (parametrizado, no copiado)

Precisión del founder: «Hazlo parametrizando el mismo componente (modo "filtro" vs modo "campo"), sin copiarlo.»
Un solo prop nuevo, `modo: "filtro" | "campo"` (obligatorio, sin default — los dos usos actuales lo dicen
explícito):

| | **"filtro"** (`ChipFecha`: Agenda, Lugares) | **"campo"** (`SelectorCuando`: alta/edición de evento) |
|---|---|---|
| Tocar un día disponible | Lo elige, filtra y **cierra la hoja sola** (pausa de 180 ms para ver el círculo marcarse, como el prototipo) | Lo elige (se ve marcado al instante); la hoja **sigue abierta** — la hora y el botón "Listo" siguen el flujo de siempre |
| Tocar el mismo día ya elegido | Lo **quita** (filtro vacío) y cierra igual | **No hace nada** — la fecha es obligatoria |
| Botón "Listo" | No existe | Sigue igual |
| `diasActivos` | Sí (desactiva "sin eventos") | No se pasa — todos los días futuros se pueden elegir |
| Título | "Selecciona una fecha" | "Selecciona la fecha del evento" |

Un día pasado se bloquea siempre, **salvo el que ya traía `fecha` al abrir la hoja** (`diaBloqueado`): al editar
un evento ya pasado, su propia fecha se sigue viendo y se puede conservar, sin abrir la puerta a elegir *otro*
día pasado. Reemplaza al prop `bloquearPasado` que existía antes (`SelectorCuando` pasaba `false`, sin ninguna
restricción de pasado en absoluto): **cambio de comportamiento real**, ver "Decisiones propias" más abajo.

**Otros arreglos del founder ya decididos en el prototipo, ahora en código real:**
- **Fuera del mes: vacío e intocable.** `.dia.fuera { visibility: hidden }` (antes solo atenuaba la opacidad,
  `elegirDia` sí los aceptaba — un descuido, no una decisión, señalado en la bitácora 245). Ahora sin
  `data-fecha`, `aria-hidden`, `tabIndex={-1}` fijo y `elegirDia` los ignora explícitamente.
- **Desactivado, un solo estilo:** `.desactivado { opacity: .65 }` agrupa "pasado" y "sin eventos" (antes
  `.pasado` tenía su propia regla a `opacity: .35`). El `aria-label` sí distingue la razón.
- **Mes anterior/siguiente con `disabled` de verdad:** antes ninguna de las dos flechas tenía tope.
- **Nombres accesibles completos:** antes los botones de día no llevaban `aria-label` en absoluto — solo el
  número visible.

**Cargando (Agenda):** `diasActivos` puede llegar como `Promise` (Agenda, diferida junto con la consulta
pesada). `use()` puede llamarse condicionalmente (a diferencia de los demás Hooks): con la promesa sin resolver,
`SelectorFecha` entero suspende — título, flechas de mes y rejilla juntos, nada a medias. `ui/ChipFecha` envuelve
la hoja en su propio `<Suspense>`, con `SelectorFechaCargando` (exportado aparte) de respaldo: mismo título y
tamaño de rejilla (esqueleto de círculos latiendo, ya usado en otras partes de la app), sin saltos al resolver.

## `ui/ChipFecha.tsx`: sin rama nativa

Ya no hay `<input type="date">` ni la máquina de estados de `lib/fechaNativa.ts` (OL-188/OL-204): la hoja propia
es la única rama, en cualquier pantalla — el nativo no podía desactivar un día suelto, y ya había dado dos
regresiones reales. **Borrados `src/lib/fechaNativa.ts` y su prueba** (`fechaNativa.test.ts`): sin más usos en
el repo (confirmado con `grep`).

Con fecha elegida, el resto de la pastilla (ícono + texto, no la ✕) ahora es un botón que reabre la hoja con ese
día ya marcado — pieza que el prototipo agregó para que "tocar el día ya elegido lo quita" tuviera un camino
para alcanzarse una vez cerrada la hoja (bitácora 245). Un `<span class="sr-solo">Cambiar la fecha,</span>` antes
del texto visible, para que el lector de pantalla no anuncie solo la fecha sin decir que se puede tocar.

## Un bug de verdad que encontré (y arreglé): el `.then()` de la Promise de Next no encadena

Para Agenda, `diasActivos` se deriva de `agenda` (la Promise que Next reenvía del servidor al cliente, RSC) con
`agenda.then((a) => diasActivosCalendario(a.eventos))`. **Esto compila, no truena, y deja `diasActivos` en
`undefined` sin ningún error** — el `.then()` de esa Promise especial no devuelve una Promise encadenable de
verdad (confirmado agregando `.catch()` encima: `TypeError: Cannot read properties of undefined (reading
'catch')`, porque `agenda.then(...)` mismo devuelve `undefined`). Sin esto, el calendario de Agenda se veía
"bien" a simple vista (los días pasados atenuados) pero **ningún día decía "N eventos"/"sin eventos"** y ningún
día futuro se desactivaba jamás — confirmado leyendo los `aria-label` reales con Playwright, no solo mirando la
pantalla (memoria: "verificar contra lo firmado").

**Arreglo:** envolver a mano en una Promise propia, usando `agenda.then(onCumplida, onRechazada)` solo por su
efecto (nunca por su valor de retorno) —

```ts
const diasActivos = useMemo(
  () => new Promise<DiasActivos>((resolve, reject) => {
    agenda.then((a) => resolve(diasActivosCalendario(a.eventos)), reject);
  }),
  [agenda],
);
```

Documentado en el propio código (`AgendaInicio.tsx`) para que nadie repita el error con otra derivada de
`agenda` u otra promesa reenviada del servidor.

## Otro bug de verdad, expuesto por esta misma pieza: un evento de varios días no se hallaba al filtrar

El encargo pedía "un evento de varios días cuenta en cada día que ocupa, igual que la Agenda" como si fuera una
regla ya existente. **No lo era:** `filtrarAgenda` y `lugares.ts#diasConEvento` (el filtro de verdad, cuando se
elige un día) solo miraban el día de *inicio* del evento — nunca lo expandían. Con `diasActivosCalendario` ya
marcando activos todos los días que ocupa un evento largo, esto significaba: **el calendario podía marcar el 7
de octubre como disponible (por un evento del 6 al 8), pero elegirlo en la Agenda mostraba "Ese día no hay nada
todavía".** Confirmado de verdad, no solo temido: con un evento de ejemplo del 6 al 8 de octubre, elegir el 7
daba una lista vacía antes del arreglo.

**Arreglo:** `ocupaDia` (nueva, en `calendario.ts`, misma regla que `diasActivosCalendario` para un evento
solo) reemplaza la comparación de un solo día en `agenda.ts#filtrarAgenda` y en `lugares.ts#diasConEvento` — las
dos funciones que de verdad deciden qué se ve al elegir un día. **No toqué `agruparPorDia`** (la vista sin
filtro, "Próximos días"): ahí un evento largo sigue apareciendo una sola vez, bajo su día de inicio — cambiar eso
repetiría la misma tarjeta bajo varios títulos de día, una decisión de diseño aparte que no pedía este encargo.
Señalado para que el gestor lo confirme: **el alcance de este arreglo es "que lo que el calendario marca
disponible siempre dé resultados al elegirlo"**, no "que la lista sin filtro muestre un evento largo repetido".
Dos pruebas nuevas (`agenda.test.ts`, `lugares.test.ts`) que fallaban antes del arreglo y pasan después.

## Precisiones del founder sobre el alta de evento — cómo las resolví

1. **Título:** "Selecciona una fecha" (Agenda/Lugares) confirmado literal. Para eventos, el founder dio un solo
   ejemplo ("Selecciona la fecha del evento") sin distinguir Empieza de Termina. **Decisión propia:** usé el
   mismo texto literal para las dos hojas (Empieza y Termina), en vez de inventar "…de fin" — el founder dio una
   frase, no dos, y el contexto (qué píldora se tocó) ya distingue cuál es cuál detrás de la hoja. **Señalado
   para que el gestor confirme o pida la variante distinta si prefiere.**
2. **Sin días "sin eventos" en modo "campo":** cumplido — no se pasa `diasActivos`, así que ningún día futuro se
   desactiva por falta de eventos (solo por estar en el pasado, o fuera del mes).
3. **Un toque elige y no cierra sola en "campo":** interpretación propia, señalada. El pedido literal decía "un
   toque elige la fecha y cierra"; pero también dice "la hora... se queda como están hoy" — y hoy la hora se
   confirma con el botón "Listo" de la propia hoja, junto con la fecha. Cerrar la hoja sola al tocar el día
   dejaría sin poder elegir la hora en el mismo gesto. Implementé: el día se marca al instante (mismo lenguaje
   visual que "filtro"), pero la hoja **no** se cierra sola — sigue el flujo de "Listo" de siempre. Si el
   founder quiso literalmente que cerrara sin más (dejando la hora tal como estaba, sin poder cambiarla en ese
   toque), es un cambio de una línea (mover el modo "campo" a la misma rama de auto-cierre que "filtro") — pero
   entonces "la hora se queda como está hoy" ya no describiría el resultado (la hora habría quedado fija en la
   sugerida, sin poder tocarla). **Señalado para que el gestor lo confirme.**
4. **Tocar la fecha ya elegida no la quita:** cumplido — no-op explícito en modo "campo" (`if (d.fecha ===
   elegido) return;`), la fecha es obligatoria. No until ningún caso donde debiera poder quitarse: "Termina" ya
   tiene su propio botón ✕ (fuera de la hoja) para quitar la hora de fin completa, sin tocar el calendario.
5. **Pasado desactivado, salvo el día que ya trae el evento al editarlo:** cumplido con `diaBloqueado` (ver
   arriba). **Cambio de comportamiento real, señalado con subrayado:** antes (`bloquearPasado={false}` en
   `SelectorCuando`) se podía elegir **cualquier** día pasado libremente al dar de alta o editar un evento (el
   comentario original decía "el alta de evento no restringía la fecha... para no cambiar esa regla"). Ahora
   solo se puede *conservar* la fecha que el evento ya tenía si es pasada — no elegir otra distinta. Si algún
   flujo real dependía de mover un evento a un día pasado cualquiera (una corrección administrativa atrasada,
   por ejemplo), esto lo bloquea. **El founder pidió justo este cambio con estas palabras, así que lo apliqué,
   pero lo marco por el tamaño del cambio de comportamiento.**
6. **Sin rama nativa en el alta de evento en móvil, tampoco:** encontrado al intentar capturar la pantalla —
   `SelectorCuando` seguía usando el selector nativo (`ChipNativo`) en la rama táctil/móvil (`usePunteroFinoAncho`
   en `false`); la hoja propia solo reemplazaba al nativo en escritorio (OL-162). La precisión del founder de "el
   mismo componente de hoja se usa... en el alta y la edición de evento" no traía excepción de plataforma, y es
   exactamente la misma unificación que ya hizo `ui/ChipFecha` para Agenda y Lugares. Quité la rama
   `usePunteroFinoAncho`/`ChipNativo` de `SelectorCuando.tsx`: ahora las píldoras de fecha y hora abren la hoja
   propia en cualquier pantalla. `ChipNativo` sigue existiendo en `ui/Chip.tsx` (lo usa `CrearObraAqui.tsx`,
   fuera del alcance de esta pieza) — no se borró.

## Un bug de CSS de verdad, encontrado al capturar

`.dia:hover { background: var(--fondo-suave) }` (ya existía, de OL-162) le ganaba a `.elegido` por especificidad
(dos clases contra una), sin importar el orden: un día **ya elegido** se veía gris, como recién desmarcado, en
cuanto el mouse quedaba encima — reproducible con un mouse real en escritorio, no solo con Playwright. Lo
encontré al capturar "tocar el mismo día ya elegido no hace nada" en el alta de evento: la captura mostraba el
día en gris a pesar de que el estado (`aria-selected`, la clase `elegido`) seguía correcto. Arreglo de una línea:
`.dia:hover:not(.elegido)`.

## Evidencia

```
npm run lint && npm run typecheck && npm test && npm run build
```
Los cuatro en verde. **1320 pruebas en 105 archivos** (dos más que al empezar la pieza: el evento de varios días
en `agenda.test.ts` y en `lugares.test.ts`; `calendario.test.ts` pasó de 20 a 36). Sin `npm run test:db`: no hay
migración.

**Prueba de componente** (`ChipFecha.componentes.test.mjs`, reescrita — ya no simula el selector nativo, que ya
no existe; ahora cubre el flujo real): 8 pruebas con Chrome real vía `playwright-core` 1.63.0 y esbuild, igual
que antes de esta pieza. Los días se ubican por `[data-fecha]` (estable), no por su nombre accesible: elegir un
día cambia su propio `aria-label` al instante (agrega ", toca para quitar"), así que un `getByRole(...,
{name})` tomado antes del toque dejaría de encontrar nada después — encontrado al escribir la prueba, no algo
que hubiera que adivinar. **Reloj de la página fijado con `page.clock.install()`** al 25 de septiembre de 2026:
`SelectorFecha` calcula "hoy" con `new Date()` de verdad (el prop `hoy` que le llega solo pone el límite mínimo,
no lo que cuenta como "hoy"); sin fijar el reloj, la prueba se rompió sola a mitad de esta sesión cuando el reloj
real pasó del 25 al 26 de septiembre — un día antes decía "sin eventos" y pasó a decir "hoy, sin eventos".
Arreglado fijando el reloj del navegador, no ajustando la fecha esperada (que se habría vuelto a romper mañana).

**Capturas reales** (`next build && next start`, Chrome real vía `playwright-core`, Bricolage Grotesque cargada
— confirmado con `document.fonts.check`, no la fuente del sistema) contra un **respaldo local de solo lectura**
con datos inventados (memoria "Proyecto somosnosotros": producción está bloqueada para "Production Reads" desde
el 2026-09-16). El respaldo (`servidor.mjs`, en el scratchpad, no en el repo) imita lo mínimo de Auth + PostgREST
que piden Agenda, Lugares y el alta de evento: 5 lugares, 10 eventos (uno de varios días, del 6 al 8 de octubre;
uno "en otro sitio", sin lugar, el 30 de septiembre — para poder capturar la diferencia real entre el criterio de
Agenda y el de Lugares) y una sesión de solo lectura inventada (cookie `sb-127-auth-token`, JWT HS256 sin firma
válida pero bien formado — mismo truco que documenta la memoria del proyecto) para llegar a `/eventos/nuevo` sin
tocar ninguna cuenta real. Todas en `docs/rediseno/capturas-247/`, abiertas y miradas una por una (no solo
generadas):

1. **`247-01-agenda-hoja-abierta.png`** — Agenda, hoja abierta, septiembre. Hoy (26, el reloj real de la sesión
   avanzó del 25 al 26 a mitad de la pieza) con aro; 25, 27, 29, 30 en contraste completo (con eventos, 30 por el
   evento "en otro sitio"); el resto atenuado (~3:1). "Mes anterior" deshabilitado.
2. **`247-02a-agenda-dia-elegido-en-hoja.png`** — domingo 27 tocado, capturada dentro de la pausa de 180 ms: el
   círculo ya se ve elegido (relleno morado), la hoja todavía abierta.
3. **`247-02b-agenda-chip-tras-elegir.png`** — pasada la pausa: la hoja se cerró sola, el chip dice "dom 27 sep
   ✕", la Agenda queda filtrada a "domingo 27 de septiembre · 2".
4. **`247-03-agenda-reabrir-con-fecha-elegida.png`** — tocada la pastilla (no la ✕): la hoja reabre con el 27 ya
   marcado, en su mes.
5. **`247-04a-agenda-toca-para-quitar-en-vuelo.png`** — tocado otra vez el 27 ya elegido, dentro de la pausa: el
   círculo ya perdió el relleno.
6. **`247-04b-agenda-quitado-chip-vacio.png`** — pasada la pausa: hoja cerrada, chip de vuelta a solo el ícono,
   Agenda sin filtrar.
7. **`247-05-agenda-mes-siguiente.png`** — octubre: 1, 4, 6, 7, 8 (el evento de varios días, los tres días
   marcados) y 12 con eventos; el resto atenuado; "Mes siguiente" deshabilitado (sin datos después del 12).
8. **`247-06-agenda-cargando.png`** — capturada reteniendo a propósito la respuesta de la consulta de
   `cargarAgenda()` (con Chrome real, contra la app real detrás, no una maqueta aislada): rejilla de círculos
   latiendo, las dos flechas de mes deshabilitadas, la Agenda real (con sus datos) atenuada detrás.
9. **`247-07-escritorio-hoja.png`** — 1280×900: la misma hoja, mismos estados (25/27/29/30 con eventos).
10. **`247-08-lugares-hoja-abierta.png`** — Lugares, Lista: 25 (hoy, con eventos), 27 y 29 con eventos; **30
    atenuado ("sin eventos")** — a diferencia de Agenda, confirmando que Lugares no cuenta el evento "en otro
    sitio".
11. **`247-09-lugares-dia-elegido-lista.png`** — domingo 27 elegido: la Lista de Lugares queda en "Museo
    Francisco Cossío" (el único lugar con evento ese día).
12. **`247-10-alta-evento-formulario.png`** — el formulario de alta (canon de renglones resueltos), "Cuándo · Hoy
    · 19:00".
13. **`247-10b-alta-evento-cuando-expandido.png`** — tocado "Cambiar" en el renglón Cuándo: se expande
    `SelectorCuando` inline, con sus píldoras Empieza/Termina (ya sin selector nativo).
14. **`247-11-alta-evento-hoja-abierta.png`** — tocada la píldora de fecha: la hoja abre con título "Selecciona
    la fecha del evento", el día sugerido (26, hoy) ya elegido, los días 1-25 bloqueados por pasado, 27+
    disponibles sin ninguno "sin eventos" (modo "campo": no se restringe por datos), lista de horas y "Listo".
15. **`247-12-alta-evento-dia-elegido-sigue-abierta.png`** — tocado otra vez el mismo día (26) ya elegido: sigue
    marcado (el arreglo de `.dia:hover:not(.elegido)` en acción: sin él, se hubiera visto gris), la hoja **sigue
    abierta** (no se cierra sola, a diferencia del modo "filtro").

**Correos:** `git diff | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` → solo el falso positivo `@keyframes` (CSS,
ya anotado en la bitácora 245). Sin correos reales en el diff ni en las capturas (datos inventados: lugares,
eventos y un "Admin de prueba" ficticio, con `admin@example.com`).

## Alcance y límites

- **No toqué `apps/**` ni Inicio** (`src/components/Inicio.tsx`, `src/components/inicio/**`, `src/lib/inicio.ts`
  — OL-217 en curso), como pedía el encargo.
- **Sin migración ni función SQL nueva**: los datos ya estaban cargados (ver "Decisión de fondo" arriba). Si el
  gestor prefiere una consulta agregada en la base más adelante (por ejemplo, si el horizonte natural de
  `cargarAgenda`/`cargar()` deja de alcanzar), es un cambio aparte, no necesario hoy.
- **`agruparPorDia` (Agenda sin filtro) no expandí para eventos largos** — ver "Otro bug de verdad" arriba: un
  evento de varios días sigue apareciendo una sola vez, bajo su día de inicio, en la vista sin filtro. Señalado
  para el gestor.
- **Título de las dos hojas del alta de evento (Empieza/Termina) con el mismo texto literal** ("Selecciona la
  fecha del evento") — decisión propia, señalada arriba.
- **"Un toque cierra la hoja en modo 'campo'"**: interpreté que NO se cierra sola (el "Listo" de la hora se
  mantiene) — señalado arriba, con la alternativa de una línea si el gestor prefiere lo literal.
- **Cambio de comportamiento real:** en el alta/edición de evento, ya no se puede elegir libremente cualquier día
  pasado — solo conservar el que el evento ya traía. Pedido explícito del founder, pero de un tamaño que vale la
  pena que el gestor confirme antes de mandarlo a producción.
- El respaldo local (`servidor.mjs`, capturas.mjs y las demás) quedó en el scratchpad de esta sesión, no en el
  repo (memoria: "probar componentes... vitest desde el scratchpad", "gestión de cambios no quiere infraestructura
  de prueba en el repo").

Rama `calendario-codigo`; commit local, push y PR sin unir, como pide el encargo.

## Revisión del gestor (2026-09-26): dos correcciones antes de pasarlo al founder

**1) El PR chocaba con `main`.** `origin/main` avanzó bastante mientras esta pieza estaba en curso (OL-211,
212, 213, 214, 216 segunda vuelta, 217, 219, 220). Choque en tres archivos:

- **`src/lib/calendario.ts`**: auto-mergeó limpio, sin marcas de conflicto — OL-214 (bitácora 243, "A mi
  calendario y Compartir nativos") agregó `finPorDefecto`/`EventoCalendarioNativo`/`datosEventoNativo` a la mitad
  del archivo (después de `archivoIcs`); mis funciones nuevas de OL-218 van al final, después de `pasoMasCercano`
  — zonas distintas, sin choque de líneas de verdad.
- **`src/lib/calendario.test.ts`**: choque real, en la única línea que las dos piezas tocaron — el `import` del
  principio. Se resolvió a mano, uniendo las dos listas (`datosEventoNativo` de OL-214 junto con
  `diasActivosCalendario`, `etiquetaDia`, etc. de OL-218). Las 40 pruebas (36 de esta pieza + 4 de OL-214) pasan
  juntas.
- **`docs/ops/OPEN_LOOPS.md`**: resuelto con `python3 scripts/ops/resolver_ol.py` (el caso normal: mi rama solo
  tocó la línea de su propia entrada OL-218, sin trozos nuevos de "Last updated"). Comprobado línea por línea
  contra `origin/main` (`diff`): las 557 líneas de main quedaron intactas, la única diferencia es la línea
  OL-218 misma, ahora más larga (con lo entregado). Nada de "Last updated" ni de "Decidido" se perdió.

`git merge origin/main --no-edit` (commit `97a2c71`). Los tres archivos en conflicto quedaron resueltos; el
resto del choque (`apps/ios/**`, `src/components/inicio/**`, etc.) lo trajo `git` solo, sin marcas de conflicto
— contenido nuevo de main que mi rama no tocaba.

Vueltos a correr, ya con `main` adentro: `npm run lint && npm run typecheck && npm test && npm run build`, los
cuatro en verde. `npm test` ahora corre **108 archivos, 1416 pruebas** (más que antes: se sumaron las de OL-214 y
las demás piezas que traía main). `src/lib/calendario.test.ts` solo, 40 pruebas, verde.

**2) La flecha "‹" de mes anterior se veía negra (activa) en vez de gris (desactivada).** Cierto: `SelectorFecha`
ya le pone `disabled` a la flecha (`hayMesAnterior`), pero **`SelectorFecha.module.css` nunca tuvo una regla
`.flecha:disabled`** — no es un choque de especificidad, es que antes de esta pieza esa flecha nunca se
deshabilitaba (no había tope de mes), así que el estilo nunca hizo falta. Con `disabled` puesto y sin estilo, el
navegador solo agrega su propio gris de "control deshabilitado" muy tenue, casi indistinguible del negro normal
en este diseño — de ahí que se viera "activa".

Arreglo: agregada `.flecha:disabled { color: var(--texto-suave); opacity: 0.35; cursor: default; }` en
`SelectorFecha.module.css`, el mismo valor que ya trae el prototipo firmado
(`docs/rediseno/prototipos/calendario-dias-con-eventos.html`, regla `.flecha:disabled`) — **no** el 0.65 de
`.dia.desactivado` (son elementos distintos: un botón de navegación de mes, no un día del calendario).

**Recapturadas `247-01` y `247-12`** (mismo respaldo local, mismos datos; el reloj real de la sesión ya iba en
26 de septiembre, por eso "hoy" en las capturas es el 26, no el 25 — sin cambio de fondo, ya documentado arriba
en la entrega original). Abiertas y comparadas:

- **`247-01-agenda-hoja-abierta.png`**: la flecha "‹" ahora se ve gris/tenue, igual que en el prototipo firmado
  (comparada directamente contra `docs/rediseno/capturas-245/245-01-hoja-sin-fecha.png`, que llegó al repo con
  este mismo merge — antes no estaba en mi árbol). Confirmado también por computada: `opacity: 0.35`, `color:
  rgb(92, 92, 92)` (`--texto-suave`), `disabled: true` — antes del arreglo la regla no existía y el navegador
  pintaba su propio gris apenas perceptible.
- **`247-12-alta-evento-dia-elegido-sigue-abierta.png`**: misma flecha, mismo arreglo (el componente es el
  mismo `SelectorFecha`, en modo "campo" aquí); de paso confirma que el arreglo anterior (`.dia:hover:not(.elegido)`)
  se mantiene — el día 26 sigue elegido (relleno morado) al tocarlo otra vez.

`npm run lint && npm run typecheck && npm test && npm run build` corridos una vez más tras el arreglo de CSS
(no cambia nada de JS/TS, pero se corrió completo de todas formas, como pide la revisión): los cuatro en verde,
mismas 1416 pruebas.

Push al mismo PR #258 (sin unir); `gh pr checks` en verde, incluido `verificar` (el que no había corrido por el
choque).

## Corrección del founder sobre lo firmado (2026-09-26): "Listo" también en modo "filtro"

El founder cambió lo que había firmado en el prototipo (bitácora 245: "sin botón Listo" en Agenda y Lugares).
Palabras exactas, relayadas por el gestor — primero: «Entonces deja listo en los dos lados»; después, más
explícito: **«Hace rato quise decir que dejaras el botón de listo en los dos calendarios».**

**Comportamiento nuevo, en los dos modos por igual:**
- Tocar un día disponible lo **marca**, sin cerrar la hoja.
- Tocar el mismo día ya marcado lo **desmarca** (modo "filtro"; en "campo" sigue sin hacer nada — la fecha ahí es
  obligatoria).
- **"Listo" aplica lo marcado y cierra** — en "filtro", "Listo" con nada marcado quita el filtro (aplica ""); por
  eso "Listo" nunca se deshabilita en ese modo, marcado o no.
- La ✕ de la hoja (o Escape, o tocar fuera) **cierra sin aplicar nada** — lo marcado se descarta si no se llegó
  a tocar "Listo".
- La ✕ del chip (fuera de la hoja, cuando ya hay una fecha aplicada) se queda igual: quita directo, sin abrir la
  hoja.
- **Sin pausa ni cierre automático al tocar un día** (se quitó `PAUSA_ANTES_DE_CERRAR` y el `setTimeout` que
  cerraba sola la hoja): ya no hace falta, "Listo" es el único gesto que aplica y cierra.

**Qué cambié:**
- `SelectorFecha.tsx`: `elegirDia` ya no distingue por `modo` para cerrar — nunca cierra sola; solo decide si
  tocar el mismo día ya marcado lo desmarca ("filtro") o no hace nada ("campo"). `puedeConfirmar` ahora depende
  del modo: en "filtro" siempre `true` (marcado o no, "Listo" se puede tocar); en "campo" sigue exigiendo un día
  (y, con `conHora`, también una hora). El botón "Listo" ya no está condicionado a `modo === "campo"`: se
  renderiza siempre. Quitados `PAUSA_ANTES_DE_CERRAR`, el `pausaRef` y su `useEffect` de limpieza (código muerto
  sin la pausa).
- `SelectorFechaCargando`: agregado un botón "Listo" deshabilitado, en el mismo lugar donde va el de verdad —
  sin él, el esqueleto de "cargando" quedaría más corto que la hoja real y todo saltaría un poco al resolver
  (confirmado en la captura `247-06`, que ya lo muestra reservado).
- `ChipFecha.tsx`: **sin cambios** — `alListo` (`onCambiar(f); onCerrar();`) ya solo se llama desde `onListo`, que
  ahora solo dispara al tocar "Listo" en vez de al tocar un día; el mecanismo ya estaba bien armado para esto.
- `SelectorCuando.tsx`: sin cambios — modo "campo" ya tenía este comportamiento desde el principio de la pieza.

**Pruebas:** reescrita `ChipFecha.componentes.test.mjs` (9 casos, antes 9 con otro guion): ahora marca con un
toque y confirma con "Listo" en vez de esperar una pausa; nueva prueba de que la ✕ de la hoja cierra sin aplicar
lo marcado; `"Listo"` visible y sin deshabilitar desde que se abre la hoja, con o sin nada marcado. Sin cambios
en las pruebas unitarias (`calendario.test.ts`, `agenda.test.ts`, `lugares.test.ts`): la lógica pura que prueban
(`ocupaDia`, `diasActivosCalendario`, `etiquetaDia`, etc.) no cambió, solo el mecanismo de la hoja alrededor.
`npm run lint && npm run typecheck && npm test && npm run build` en verde (108 archivos, 1416 pruebas).

**Recapturadas las 10 vistas de Agenda y Lugares** (todas cambiaron: ahora muestran "Listo"), abiertas y
comparadas una por una:

- **`247-01-agenda-hoja-abierta.png`**: igual que antes, más el botón "Listo" abajo, sin deshabilitar aunque nada
  esté marcado.
- **`247-02a-agenda-dia-elegido-en-hoja.png`**: domingo 27 tocado — se marca (relleno morado), la hoja **sigue
  abierta** (ya no hay pausa ni cierre solo), "Listo" visible y habilitado.
- **`247-02b-agenda-chip-tras-elegir.png`**: tras tocar "Listo" — hoja cerrada, chip "dom 27 sep ✕", Agenda
  filtrada. Idéntica, byte a byte, a la versión anterior (el estado final es el mismo; solo cambió cómo se llega).
- **`247-03-agenda-reabrir-con-fecha-elegida.png`**: reabierta con la pastilla, 27 sigue marcado, "Listo" visible.
- **`247-04a-agenda-toca-para-quitar-en-vuelo.png`**: tocado otra vez el 27 ya marcado — se desmarca, la hoja
  **sigue abierta**, "Listo" sigue habilitado (no se deshabilita por quedar sin nada marcado).
- **`247-04b-agenda-quitado-chip-vacio.png`**: tras tocar "Listo" con nada marcado — hoja cerrada, filtro
  quitado, chip de vuelta al ícono solo.
- **`247-05-agenda-mes-siguiente.png`**: octubre, con "Listo" abajo; "Mes siguiente" sigue deshabilitado
  correctamente (gris, confirma que el arreglo de la flecha se mantiene).
- **`247-06-agenda-cargando.png`**: el esqueleto ahora reserva el lugar de "Listo" con un botón deshabilitado del
  mismo tamaño — sin saltos al resolver.
- **`247-07-escritorio-hoja.png`**: la misma hoja en 1280×900, con "Listo".
- **`247-08-lugares-hoja-abierta.png`**: con "Listo".
- **`247-09-lugares-dia-elegido-lista.png`**: domingo 27 marcado y confirmado con "Listo" — la Lista de Lugares
  queda en "Museo Francisco Cossío".

Push al mismo PR #258 (sin unir); `gh pr checks` pendiente de correr tras este push.
