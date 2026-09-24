# 45 · Cabecera de Lugares con chip de fecha; chip solo ícono; «ver en lista» abajo

**Estado:** propuesta, sin código. Espera la firma del founder. · **OL:** OL-170 · **Bitácora:** [205](../bitacora/2026/09/205-lugares-cabecera-fecha.md) · **Prototipos:** [`prototipos/cabeceras.html`](prototipos/cabeceras.html) (sección «OL-170», al final) y [`prototipos/mapa-lugares.html`](prototipos/mapa-lugares.html) (sección «OL-170», al final). Solo documento y prototipo: nada de esto toca `src/**`.

## Lo que pidió el founder (2026-09-24, palabras suyas)

> Mantén canon de header entre agenda y lugares, es decir nuestro selector de fecha. Pero ajustemos: estado inicial solo con icono, sin palabra "seleccionar", al seleccionar fecha escribir "mie 30 sep" evitar el "de" para ahorrar espacio. Y por último: en mapa mueve el accionable para ver en listado abajo, puede flotar sobre agregar lugar. Anticipa que pasaría si los chips del lado derecho en header son muy anchos por nombre de ciudad. Se empalma con buscador? Ahora la idea de traer chip de fecha a mapa es para filtrar por fecha precisamente.

Cuatro pedidos, en orden: (1) el mismo chip de fecha en Agenda y Lugares; (2) ese chip empieza solo con el ícono; (3) con fecha elegida dice «mié 30 sep»; (4) en el mapa, el botón de «ver en lista» baja al pie, y el chip pasa a filtrar; más una pregunta abierta (los chips anchos por el nombre de la ciudad, ¿se empalman con el buscador?) que este documento contesta con medidas reales.

## Qué cambia en Agenda

Solo el chip. Hoy (`src/components/AgendaInicio.tsx`, líneas ~94–127) el estado sin fecha dice **«Seleccionar»** junto al ícono y el caret; con fecha, dice el día largo con «de» (`diaCorto()`, `src/lib/fechas.ts`: «sáb 20 de sep»), o «Hoy»/«Mañana» si cae en esos dos días. Nada más de Agenda se toca: el buscador, la ciudad, las pestañas y el resto de la cabecera siguen igual.

**Ajuste 1 — estado inicial, solo el ícono.** Se quita la palabra «Seleccionar»: el chip queda como un botón redondo de 40×40, del mismo alto que los demás chips del renglón (los botones de acción ya son así: la lupa, Mapa · Lista). El área de toque llega a 44+ px con un borde invisible alrededor del botón (`::before` con `inset: -4px`, sin cambiar lo que se ve) — así se cumplen las dos cosas que pidió el founder: «mismo alto que los otros chips» y «área de toque ≥ 44 px», que no son la misma medida pero sí compatibles.

**Ajuste 2 — con fecha, «mié 30 sep».** Día de la semana en tres letras, minúscula y con su acento («mié», «sáb», «lun»…), número sin cero a la izquierda, mes en tres letras — **sin «de»**. Es un cambio de una línea en `diaCortoDe()` (`src/lib/fechas.ts`): hoy arma `{ weekday: "short", day: "numeric", month: "short", ...conAnio }` y el propio `Intl.DateTimeFormat` de `es-MX` mete el «de»; se resuelve quitándolo del resultado (o armando el texto a mano con las tres partes) — no hace falta escribir un formateador nuevo.

**Pendiente de firma — «Hoy» y «Mañana».** Hoy `diaCorto()` dice tres cosas distintas: «Hoy», «Mañana» o la fecha con «de». Pero en el chip de Agenda, elegir el día de hoy en realidad **limpia el filtro** (`setFecha(f === hoy ? "" : f)`, `AgendaInicio.tsx` línea 125): el chip nunca llega a decir «Hoy», vuelve directo al ícono solo. Elegir **mañana** sí podría dejar «Mañana» escrito en el chip, mezclando una palabra con fechas cortas en el mismo control. Dos caminos:

- **(a) Dejar «Mañana» como caso especial del chip.** Menos cambio; una palabra más corta que «jue 25 sep».
- **(b) El chip siempre usa la fecha corta, sin excepción** («jue 25 sep» también para mañana). Es lo que muestran las capturas 01/02 de este documento y la nuestra recomendación: el ícono ya avisa «hay una fecha elegida», y mezclar una palabra («Mañana») con una fecha corta («mié 30 sep») en el mismo chip pide dos lecturas distintas para la misma cosa. Una sola regla es más fácil de mantener y de leer de un vistazo.

Ninguna de las dos opciones toca los títulos de día **dentro** de las listas de la Agenda («Hoy», «Mañana», que siguen agrupando la lista) — eso es aparte del chip y no cambia.

## Qué cambia en Lugares

1. **El mismo chip de fecha, antes del de ciudad** (mismo orden que Agenda: fecha primero, ciudad después). Hoy la cabecera de Lugares (`VistaLugares.tsx`) solo tiene el chip de ciudad, un botón redondo Mapa · Lista y la lupa; con este cambio, el renglón queda: **chip de fecha · chip de ciudad · lupa** — igual que Agenda.
2. **El chip filtra.** Con una fecha elegida, el Mapa solo pinta los pines de los lugares con evento ese día; los demás lugares se quitan del mapa, no solo cambian de color o de tamaño (a diferencia del resto de la app, donde el pin nunca desaparece, aquí es justo lo que pidió el founder: «la idea de traer chip de fecha a mapa es para filtrar por fecha precisamente»). Sin ningún lugar con evento ese día, el mapa queda vacío con un aviso: **«Ningún lugar tiene eventos ese día»**. En la Lista (cuando exista ese filtro ahí también), el mismo criterio aplicaría a los renglones — no se prototipó la Lista filtrada en esta pieza porque el founder solo pidió el mapa; queda anotado como pregunta abierta más abajo.
3. **El botón redondo de Mapa · Lista sale del renglón 1 y baja al pie del mapa**, flotando sobre «Registrar lugar», como pidió el founder. En la Lista, su inverso es «Ver en mapa», en el mismo lugar.

### Dónde queda cada botón flotante (para que no se pisen)

El founder pidió anticipar esto explícitamente. Hoy el mapa ya tiene dos botones fijos: el de **ubicación** (abajo a la izquierda, `src/components/Mapa.module.css`/canon de OL-125) y **«Registrar lugar»** (abajo a la derecha). Los listados, por su parte, ya tienen el botón **↑ de volver arriba** (abajo a la izquierda, `ui/Cabecera.module.css` → `.volver`, aparece tras bajar un tramo).

| Vista | Esquina izquierda | Esquina derecha |
| --- | --- | --- |
| **Mapa** | Botón de ubicación (16 px sobre el borde; sube más si hay una hoja de lugar abierta) | «Registrar lugar» a 16 px del borde; **«Ver en lista» flota justo encima**, a 76 px del borde (16 + 48 de su alto + 12 de aire) |
| **Lista** | Botón **↑** (solo aparece tras bajar un buen tramo) | «Registrar lugar» a 16 px del borde; **«Ver en mapa» flota justo encima**, a 76 px del borde — mismo lugar exacto que «Ver en lista» en el Mapa |

**Por qué no se pisan nunca:** cada botón de la esquina izquierda vive en una sola vista — la ubicación solo existe en el Mapa, el ↑ solo en la Lista — así que nunca están los dos a la vez ni compiten por el mismo sitio, aunque ocupen la misma posición en la pantalla. Del lado derecho, «Ver en lista»/«Ver en mapa» es **secundario** (contorno, no relleno): no compite visualmente con «Registrar lugar», que sigue siendo la acción primaria de la pantalla, y queda claramente por encima de ella, con 12 px de aire entre los dos. Comprobado con `getBoundingClientRect()` en las capturas 03 y 06 (abajo): ningún botón flotante se solapa con otro ni con el contenido de la lista.

## Las medidas: ¿se empalma el chip de ciudad con el buscador?

Medido con Chrome real (`playwright-core`) sobre el prototipo, no a ojo: ancho del chip de ciudad y espacio libre hasta la lupa, a los tres anchos que pide el canon (320, 375 y 390 px), con la ciudad que hay hoy en producción (**San Luis Potosí** — es la única, `src/lib/ciudad.ts`: «no hay alta de ciudad, las ciudades salen de los lugares que hay») y con el caso al tope que pidió el founder (**Dolores Hidalgo Cuna de la Independencia Nacional**), en los dos estados del chip de fecha (ícono solo / con «mié 30 sep» elegido).

| Ancho | Chip de fecha | Ciudad | Ancho del chip de ciudad | ¿Se lee completo? | Libre hasta la lupa |
| --- | --- | --- | --- | --- | --- |
| 390 px | ícono (40 px) | San Luis Potosí | 181 px | Completo | 81 px |
| 390 px | ícono (40 px) | Dolores Hidalgo Cuna… | 262 px | Recortado («Dolores Hidalgo Cuna…») | 0 px |
| 390 px | «mié 30 sep» (147 px) | San Luis Potosí | 155 px | **Recortado** («San Luis …») | 0 px |
| 390 px | «mié 30 sep» (147 px) | Dolores Hidalgo Cuna… | 155 px | Recortado («Dolo…») | 0 px |
| 375 px | ícono (40 px) | San Luis Potosí | 181 px | Completo | 66 px |
| 375 px | ícono (40 px) | Dolores Hidalgo Cuna… | 247 px | Recortado | 0 px |
| 375 px | «mié 30 sep» (147 px) | San Luis Potosí | 140 px | Recortado («San Lui…») | 0 px |
| 375 px | «mié 30 sep» (147 px) | Dolores Hidalgo Cuna… | 140 px | Recortado | 0 px |
| 320 px | ícono (40 px) | San Luis Potosí | 181 px | Completo (11 px de sobra, el mínimo) | 11 px |
| 320 px | ícono (40 px) | Dolores Hidalgo Cuna… | 192 px | Recortado | 0 px |
| 320 px | «mié 30 sep» (147 px) | San Luis Potosí | 85 px | Recortado («San …») | 0 px |
| 320 px | «mié 30 sep» (147 px) | Dolores Hidalgo Cuna… | 85 px | Recortado | 0 px |

**«0 px libre» no es un choque: es el límite funcionando.** Es el punto exacto donde el chip de ciudad, al encogerse, toca el borde izquierdo de la lupa sin cruzarlo — comprobado con `getBoundingClientRect()`: el borde derecho del chip y el borde izquierdo del botón de la lupa coinciden exactamente, nunca se superponen. En el capítulo «sin regla» (más abajo) sí hay un choque real, distinto de este.

**Hallazgo que el founder debe conocer:** con una fecha elegida, **hasta «San Luis Potosí» —la única ciudad que hay hoy— se recorta** a «San Luis …» en un iPhone normal (390 px). No es un error de la regla (el mecanismo evita el choque, que es lo que importa), pero si el founder quiere que el nombre de la única ciudad de la plataforma siempre se lea completo, hay una opción a evaluar (ver «Decisiones que debe firmar el founder»).

## La regla propuesta (y por qué)

**El chip de ciudad se encoge y se corta con puntos suspensivos antes de tocar la lupa; la lupa nunca se mueve ni se achica.**

- **No hace falta inventar un mecanismo nuevo**: el que ya existe en `src/components/ui/Chip.module.css` (clase `.deContexto`, usada hoy por el chip de fecha y el de ciudad de Agenda) ya hace exactamente esto — `flex: 0 1 auto` + `min-width: 0` en el chip, `overflow: hidden; text-overflow: ellipsis` en su texto. El prototipo reproduce el mismo mecanismo (clases `.chip170`/`.chipCiudad170` en `cabeceras.html`, `.chipFecha`/`.chipCiudad` en `mapa-lugares.html`), no uno inventado para esta pieza.
- **No es un número fijo de caracteres.** Un tope fijo («máximo 12 letras») se ve bien en un ancho y raro en otro; dejar que el texto ocupe el espacio que sobra y se corte solo cuando hace falta es correcto en cualquier ancho — las cuatro filas de «San Luis Potosí» en la tabla lo prueban: a veces se lee completo (cuando sobra espacio) y a veces se recorta (cuando no), sin que nadie tenga que decidir un número.
- **La lupa nunca cede.** La rejilla del renglón 1 (`minmax(0, 1fr) | auto`, la misma que ya usa `ui/Cabecera.module.css`) reserva siempre el ancho completo de la lupa (40 px); lo que se puede encoger a cero es el contexto (fecha + ciudad), nunca las acciones. Es la opción contraria a que «el buscador cede y se vuelve ícono» (ya es solo ícono hoy) o a un carril deslizable en el renglón 1 (dos chips no necesitan una fila que se desliza; ver el punto siguiente).
- **Por qué no un carril deslizable en el renglón 1:** el renglón 1 solo lleva dos chips (fecha, ciudad) más la lupa — deslizar una fila de dos elementos para leer el segundo completo es más fricción que un texto recortado con «…», y rompería el patrón de que el renglón 1 nunca se desliza (solo el renglón 2, pestañas, ya se desliza cuando no caben). Un carril deslizable sí tiene sentido si algún día hay **más** de dos chips en ese renglón; con dos, la regla de encoger + recortar alcanza.

### Con y sin la regla, a la vista

- **Captura 07 — sin la regla:** el chip de ciudad no se encoge (`flex: none`, sin `text-overflow`); su texto entero se pinta detrás de la lupa (el chip, no posicionado, pierde el orden de pintado frente a un elemento posicionado, y aquí ninguno lo está, así que gana el que va después en el HTML: la lupa) y la cola del nombre queda cortada por el borde redondeado del teléfono, invisible — la lupa sigue tocable porque queda encima, pero el nombre de la ciudad ya no se puede leer. **Esto sí es el choque real** que preguntó el founder.
- **Captura 08 — con la regla:** el mismo caso (misma fecha, misma ciudad al tope) se lee «Dolo…», con la lupa intacta y 0 px de por medio, sin overlap.
- **Captura 09 — 320 px, con la regla:** el ancho más chico que soporta la app; la regla se sostiene («Dol…», lupa intacta, sin scroll horizontal de la página).

## Estados de «Hoy»/«Mañana» dentro de las listas — sin cambio

Aparte del chip: los títulos «Hoy» y «Mañana» que agrupan la Agenda (`diaCorto()` usado en los encabezados de sección) siguen igual, elija lo que elija el chip. Esta pieza no los toca.

## Preguntas abiertas (fuera de esta pieza)

- **¿La Lista de Lugares también se filtra por fecha, o solo el Mapa?** El founder solo mencionó el mapa («la idea de traer chip de fecha a mapa es para filtrar por fecha»); si la Lista debe seguir el mismo filtro (para que Mapa y Lista muestren siempre lo mismo, con «ver en mapa»/«ver en lista» llevando a la vista contraria del mismo resultado), es una línea más de trabajo que no se prototipó aquí.
- **¿Qué pasa con «Cercanos»?** Hoy «Cercanos» centra el mapa en la persona (OL-128); esta pieza no lo toca ni lo combina con la fecha. Si se eligen los dos a la vez (cercanos + una fecha), falta decidir si se combinan («cercanos con evento ese día») o si uno gana al otro.

## Prototipo y capturas

`prototipos/cabeceras.html` y `prototipos/mapa-lugares.html`: cada uno con una sección nueva «OL-170» al final, con sus propios teléfonos — no tocan ni reusan los teléfonos ya firmados por el founder más arriba en esos mismos documentos (OL-087 en `cabeceras.html`, OL-124→OL-141 en `mapa-lugares.html`). Fuente Bricolage Grotesque cargada de Google Fonts, como en los demás prototipos.

Capturas reales (Chromium de `/opt/pw-browsers` por `playwright-core`, `document.fonts.check('700 20px "Bricolage Grotesque"')` = `true` en las nueve, 390×844 a doble densidad salvo la 09), en [`capturas-205/`](capturas-205/):

- **`01.png`** — Agenda, el chip de fecha en su estado inicial: solo el ícono del calendario, sin la palabra «Seleccionar», mismo alto que el chip de ciudad.
- **`02.png`** — Agenda, con «mié 30 sep» elegido (sin «de»), con su quitar (✕); revela el hallazgo de la tabla: «San Luis Potosí» ya se recorta a «San Luis …» en 390 px con una fecha elegida.
- **`03.png`** — Lugares (Mapa), el chip de fecha solo ícono (sin filtro: se ven los mismos lugares de siempre) y **«Ver en lista» flotando sobre «Registrar lugar»**, con el botón de ubicación intacto abajo a la izquierda.
- **`04.png`** — Lugares (Mapa) filtrado: con «jue 24 sep» elegido, solo queda pintado el lugar con evento ese día (Casa de Cultura del Barrio de Tlaxcala); los demás se quitan del mapa.
- **`05.png`** — Lugares (Mapa) filtrado sin resultados: con «lun 21 sep» elegido (ningún lugar del catálogo de ejemplo tiene evento un lunes), el mapa queda vacío con el aviso «Ningún lugar tiene eventos ese día».
- **`06.png`** — Lugares (Lista), con **«Ver en mapa» flotando sobre «Registrar lugar»**, en el mismo lugar exacto que en el Mapa.
- **`07.png`** — Cabecera con «Dolores Hidalgo Cuna de la Independencia Nacional» **sin** la regla: el nombre se empalma con la lupa (el choque real que preguntó el founder).
- **`08.png`** — El mismo caso **con** la regla: se recorta a «Dolo…», la lupa queda intacta y sin solaparse.
- **`09.png`** — Lo mismo, a 320 px de ancho: la regla se sostiene, sin scroll horizontal.

## Decisiones que debe firmar el founder

1. **«Hoy»/«Mañana» en el chip de fecha:** ¿se quedan como caso especial (opción a) o el chip siempre usa la fecha corta, sin excepción (opción b, la que muestran las capturas 01/02 y la que recomendamos)?
2. **El hallazgo de «San Luis Potosí» recortada:** ¿le parece aceptable que la única ciudad de la plataforma se lea «San Luis …» cuando hay una fecha elegida en 390 px (la regla evita el choque, solo acorta el texto), o prefiere que se investigue una forma de darle al chip de ciudad un ancho mínimo (p. ej. 96 px, para que nunca enseñe menos de ~10 caracteres), a costa de que el chip de fecha tenga que ceder espacio primero?
3. **¿La Lista de Lugares también filtra por fecha**, o el filtro es solo del Mapa (como pidió literalmente)?
4. **Aprobar la posición de «Ver en lista»/«Ver en mapa»** (flotante, secundario, 76 px del borde, sobre «Registrar lugar») y que el botón redondo salga del renglón 1 de la cabecera de Lugares.
5. **Probar las nueve capturas en su iPhone (Safari)**, como manda la regla del proyecto antes de pasar a código.
