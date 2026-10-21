# 466 · La rutina de agendas entiende festivales, talleres y exposiciones, y no propone lo que no es de la ciudad (OL-433)

**Fecha:** 2026-10-21. **Rama:** `rutina-agendas-festivales`, desde `origin/main` (`f0856e61`). **Operador:** agente de la pieza (Claude) para el
Gestor VII, sin otros agentes. **Migración:** ninguna (todo en `propuestas.datos`, jsonb). **Variables de entorno:** ninguna nueva. **Capturas:**
ninguna: no cambia ninguna pantalla. **Estado:** lista para la revisión del gestor.

## El pedido

El founder, 21 de octubre: «Las rutinas que buscan eventos, lugares y artistas tienen criterios para evitar duplicados? en el caso de eventos:
Tiene criterios para identificar festivales, galerías, talleres? Incluso si se trata de eventos faltantes de un festival ya registrado por
ejemplo? Veo sugerencias de eventos ahora en la app que podrían pertenecer a festivales», y después «arranca 433».

La primera corrida real de San Luis (OL-429, 31 propuestas) lo dejó ver: actos de **Xantolo** propuestos como eventos sueltos; el mismo concierto
dos veces con títulos distintos («Hermanos Pérez Meza Big Band» y «Los Hermanos Pérez Meza Big Band: Esto somos», mismo día, hora y sitio);
«Noche de recorridos» propuesto aunque ya estaba «Noches de Recorridos CEART» ese día y hora; y cuatro lecturas en el **Museo Tamuantzán**
(Ciudad Valles) propuestas como si fueran de San Luis.

## Qué cambió

Archivos: `src/lib/rutinas/agendas.ts` (la rutina), `src/lib/rutinas/publicarEvento.ts` (publicar al aceptar), `src/lib/rutinas/formaEvento.ts`
(**nuevo**, puro: festivales, programas, clase, sesiones, series, exposición y la frase para la bandeja), `src/lib/cargaEventos.ts` (la regla de
títulos de la rutina y la sigla de un lugar), `src/lib/rutinas/filtros.ts` (otro municipio en el texto), `src/lib/propuestas.ts` (solo el
comentario del contrato de `datos`), sus pruebas y un banco nuevo de la base. Sin tocar `motor.ts`, Ciudades, la bandeja ni Showcase.

### 1. Festivales

- **Festival registrado.** Antes de proponer, cada trozo de la agenda lee los eventos de la ciudad en esos días **y lo que empezó antes y
  sigue** (un festival con sus fechas, una exposición, un taller): así están los festivales (`clase = festival`, visibles, no borrador) y sus
  actos. Una fila es **acto** de un festival si cae en sus fechas (de `inicio` al final de su periodo, con **3 días de margen**: su periodo sale
  de los actos que ya tiene) y el título, la descripción, el programa que dice la agenda o el nombre de la agenda lo **nombran**: «Xantolo 2026»
  se reconoce por «xantolo», «Fotovisión 31» por «fotovision», «Otoño Sonoro» por las dos palabras; un festival con nombre de género («Festival
  de Jazz») solo por su nombre entero (`claveDeFestival`, `nombraAlFestival`). Va con `datos.marco = { id, titulo }`. Si el acto ya está bajo el
  festival (mismo día y sitio, título de la misma función) es `ya_existe`; si la fila es el festival mismo, también.
- **Festival nuevo.** El modelo dice ahora `programa` en cada fila: el festival, feria, ciclo o programa especial con nombre propio del que es
  parte («porque la agenda lo pone bajo ese encabezado, porque la agenda entera es su programa o porque el título o la descripción lo nombran»),
  nunca una categoría, un mes, el lugar ni la agenda (lo vuelve a filtrar `programaDeAgenda`). Se propone **primero el festival** (propuesta de
  `clase: festival`, con `inicio` de su primer acto, `termina` del último, `actos`, `programa` y el sitio de su primer acto) cuando hay dos filas
  del mismo programa, una que ya se propuso suelta en esta corrida con ese programa (pasa a ser acto suyo), el programa se lee como festival
  («Festival…», «Encuentro…», «Jornadas…») o la agenda entera es su programa («Agenda programación XANTOLO en tu ciudad»). Sus actos llevan
  `marco_propuesto` (el id de la propuesta del festival: la rutina pone el id al insertar), `programa` y `espera` («Se publica cuando aceptes el
  festival «Otoño Sonoro».»). Una propuesta de festival de una corrida anterior sin decidir también vale (se le suman actos); una rechazada, no
  (los actos van sueltos con su `programa`); una aceptada y publicada, como festival registrado.
- **Al aceptar** (`publicarEvento.ts`, por las mismas cuatro llamadas que ya hace la bandeja: `prepararEvento` → `aceptar_propuesta` →
  `insertarEvento` → `ligarFicha`):
  - un acto con `marco` se publica con `evento_padre_id` y su clase sin ser festival (nunca festival dentro de festival), y el festival recalcula
    su periodo con sus actos (`recalcular_festival`; si la base no dejara llamarla, la misma regla en `periodoDePrograma`);
  - el **festival** propuesto se publica como **marco**: sin pedirle punto a su sitio (sus sedes son las de sus actos, como `publicar_programa`),
    del primer al último acto, sin precio («Por confirmar»); y **ahí mismo** se publican colgados de él los actos que ya se habían aceptado y
    esperaban (`ligarFicha` → `publicarActosEnEspera`). Si ya hay un festival con ese nombre en esas fechas: «Ya está el festival «…» en esas
    fechas: recházala como duplicado.»;
  - un **acto aceptado antes que su festival** se acepta pero **no se publica suelto**: espera (`insertarEvento` no lo inserta). Se publica al
    aceptar el festival o, si algo falla, al empezar la siguiente corrida de agendas (que ahora publica primero los festivales y cuenta aparte
    `en_espera`). Si el festival se rechazó, el acto aceptado se publica como evento suelto.

### 2. Talleres, días seguidos y series

La rutina mira cada fila contra las propuestas abiertas **de la corrida** (también las de trozos anteriores de la agenda: un PDF se lee por
semanas) con el mismo título (sin «sesión 2», «día 3», «1 de 4») en el mismo sitio, otro día:

- **Taller** (lo dice el título: taller, curso, laboratorio, diplomado) o **días seguidos**: se suma como sesión a esa propuesta (`sesiones:
  [{ inicio, fin? }]`, `inicio` y `fin` de la primera). Al aceptar se publica **un solo evento**: un taller de clase `taller` con una fila por
  sesión en `eventos_sesiones` (días sueltos, todas en una sola inserción: la base valida al cerrar la transacción que haya de 2 a 31); unos días
  seguidos con el mismo horario, un evento de varios días **sin filas** («Mismo horario todos los días», OL-310); con horas distintas, con una
  fila por día (OL-311). Una sesión que acaba de madrugada queda sin hora de fin (la base no deja que una sesión pase de la medianoche de su día).
  Un taller aceptado a medias se publica con las sesiones que quedan.
- **Otra cadencia** (cada semana, un cineclub, «Todos los lunes son de Palique»): la app **no tiene una clase para series**, así que va **una
  propuesta por fecha**, todas marcadas con `serie = { fechas: [ISO…], cada: 7 }` (se actualiza en las hermanas cuando llega otra fecha). Al
  aceptar, cada una publica su fecha.

### 3. Exposiciones

Siguen como «Inauguración: …» en su fecha. Si la agenda dice hasta cuándo se visita (el modelo lo entrega en `termina`), la propuesta lleva
`clase: exposicion`, `termina` (el final del día de cierre) y `exposicion` (el nombre sin «Inauguración:»). Al aceptar se publican la
**inauguración** (evento, con `sugerencias.exposicion = aceptada` para que la app no vuelva a sugerirla) y la **exposición** ligada por
`inaugura_id`, del primer minuto de ese día al último del de cierre, en el mismo sitio, sin su hora ni su precio (como
`publicar_exposicion_de_inauguracion`); la de un festival cuelga también de él. Si la exposición ya estaba en ese sitio, no se duplica: se le
liga la inauguración. Sin periodo, una «exposición» se propone como evento.

### 4. La clase por el título

Toda propuesta de evento lleva `datos.clase` (`claseDeLaAgenda`: `claseSugerida` por el título, exposición si hay periodo, «puntual» si no) y
`publicarEvento` la respeta: un «Festival callejero de títeres» de un día es un festival sin programa (OL-413: un día, una hora y un sitio con su
punto). Donde el costo es opcional (OL-411: festival, taller, exposición, acto, inauguración), lo que la agenda no dice queda «Por confirmar» y
«Gratis» se guarda escrito.

### 5. Repetidos que se escapaban

- **La misma función con otro título en la corrida**: mismo día, **misma hora** y mismo sitio, con títulos de la misma función → una sola
  propuesta, la más completa: el título más largo, el otro en `variantes`, y lo que a una le falte (fin, precio, descripción, dirección) de la
  otra. Cuenta como `descartados.unido` (y en `duplicados`). Contra una de otra corrida: `ya_propuesto`; contra una rechazada: `rechazado_antes`.
- **La regla de títulos de la rutina** (`mismoEventoDeAgenda`, en `cargaEventos.ts`), más fina que la de `eventos_parecidos` que sigue usando el
  importador: palabras con contenido **en singular** y **sin las del nombre del sitio**; si **cada uno tiene una palabra propia** que el otro no
  dice, son distintos; si no, son el mismo cuando comparten dos palabras o una que no es genérica («inauguración», «concierto», «taller»,
  «noche»… no distinguen). `parecidoGuardado` acepta esa regla (el importador sigue con la suya) y la rutina la usa contra lo guardado, además de
  un evento de varios días que cubra ese día.
- **Al aceptar**, lo que `eventos_parecidos` devuelve se vuelve a mirar con esa regla: la bandeja no tiene «es otro», y la base tomaba por
  iguales dos inauguraciones distintas del mismo día en el mismo museo («Inauguración de la exposición …» comparten dos palabras).
- **Un lugar por su sigla**: `resolverLugar` reconoce «CEART» como «Centro de las Artes de San Luis Potosí Centenario (CEART)» si es el único
  con esa sigla (también le sirve al importador).

Pares probados (`cargaEventos.test.ts`): **se unen** «Hermanos Pérez Meza Big Band» ⊂ «Los Hermanos Pérez Meza Big Band: Esto somos»; «Noche
de recorridos» = «Noches de Recorridos CEART» (con y sin saber el sitio); «Gitanos mexicanos 2.ª edición: Pargazz» = «Pargazz: Gitanos
mexicanos, 2ª Edición»; «Recital de guitarra» ≈ «Recital de Guitarra Clásica»; «Xil» ≈ «Xil en concierto». **No se unen** «Inauguración:
Raíces» / «Inauguración: Ecos del agua» (mismo museo, día y hora); «Inauguración de la exposición Raíces de la tierra» / «… Ecos del agua» (que
la regla de la base sí unía); «Concierto de la Banda de Música del Estado» / «Concierto de la Orquesta Sinfónica del Estado»; «Fotovisión 31:
charla sobre la exposición Échele mai» / «… charla con integrantes de la exposición Entrelazos»; «Concierto» / «Concierto de jazz»; «Noche de
Museos» / «Noche de recorridos».

### 6. Fuera de la ciudad

- **Por el texto** (`otroMunicipioEnTexto`): un sitio fuera del directorio que la agenda pone en otro municipio («Museo Tamuantzán, Cd. Valles»,
  «Casa de Cultura de Ciudad Fernández», «municipio de Rioverde»), en el nombre del sitio o en el municipio que dio el modelo. «Ciudad
  Universitaria», la ciudad misma y sus alias no sacan a nadie. Un lugar del directorio nunca queda fuera por esto.
- **Por el mapa**: un sitio fuera del directorio se busca en Mapbox **dentro del área** de la ciudad (`radio_km` de los parámetros o el del
  zoom), por nombre y por dirección (`ubicarSitioEnArea`, la misma búsqueda de la publicación). Si no aparece ahí, `fuera_de_la_ciudad`. Si
  aparece, su punto queda en la propuesta (`lat`, `lng`, `direccion_mapa`) y al aceptarla ya no se vuelve a buscar. Lo buscado se guarda en el
  cursor de la corrida (hasta 300 sitios): «Plaza de Armas» se busca una vez por corrida, no una por trozo. Si en un paso el mapa no ubica
  **ninguno de tres o más** sitios distintos, se asume que no respondió: no se descarta a nadie y queda el aviso «El mapa no respondió…». Sin
  token de Mapbox o sin centro de la ciudad, no se decide así (aviso «Sin mapa…»).
- Al modelo se le pide además el municipio cuando la agenda lo pone junto a la sede, y que lo de otra ciudad no entre.

### Lo que dice ahora `resumen` (contadores, nunca nombres)

`descartados.unido` (nuevo) y `duplicados` lo cuenta; y, si no son cero, `festivales` (propuestas de festival nuevas), `actos` (propuestas que
son actos de un festival, registrado o propuesto), `sesiones` (sesiones sumadas a una propuesta), `series` (fechas que entraron a una serie) y
`en_espera` (actos aceptados que siguen esperando a su festival al empezar la corrida).

## Qué propondría hoy sobre las 31 propuestas del 21 de octubre

El encargo nombra 13 de las 31; las otras 18 no las veo sin leer producción (no se leyó). Lo que la rutina haría con las 13, con las reglas de
esta pieza (reproducido con datos inventados en `agendasFormas.test.ts`, primera prueba, y comprobado en las cargas reales de octubre del
gestor, que dicen que Xantolo y Fotovisión 31 están en la base como **eventos sueltos**, sin un festival con actos):

| Lo que propuso | Lo que propondría | Cuántas |
|---|---|---|
| «Fiesta de Luz» ×3 (tres noches en Plaza de Armas), «Tzompantli», «Macario», «Entre elementos y almas» (6, sueltas) | Con Xantolo registrado como festival: 4 actos con `marco` (Fiesta de Luz, **una** propuesta con 3 sesiones). Sin festival registrado (lo que hay hoy): primero la propuesta del festival «Xantolo 2026» y los 4 actos con `marco_propuesto` (la agenda es su programa: «Agenda programación XANTOLO en tu ciudad») | 6 → 4 o 5 |
| «Hermanos Pérez Meza Big Band» y «Los Hermanos Pérez Meza Big Band: Esto somos» | una: «Los Hermanos Pérez Meza Big Band: Esto somos», con la otra en `variantes` (`unido`) | 2 → 1 |
| «Noche de recorridos» (CEART) | nada: `ya_existe` («Noches de Recorridos CEART» ese día y hora) | 1 → 0 |
| 4 lecturas en el Museo Tamuantzán | nada: `fuera_de_la_ciudad` (el mapa no lo encuentra a 15 km de San Luis; si la agenda escribe «Cd. Valles», sin preguntarle al mapa) | 4 → 0 |
| **Las 13** | | **13 → 6** |

De las 18 restantes, cambiaría lo que caiga en estos mismos casos (otra sesión de un taller, otra fecha de una serie, la misma función con otro
título, un sitio que el mapa no ubica en San Luis); además cada una llevaría su `clase`.

## Lo que la bandeja de OL-432 debe mostrar (sin tocar su pantalla aquí)

Todo sale de `datos`, y `etiquetaDeForma(datos, ahora, zona)` (en `src/lib/rutinas/formaEvento.ts`, pura, probada) ya da la frase:

| `datos` | Frase (`que`) | Además |
|---|---|---|
| `marco: { id, titulo }` | «Acto de «Xantolo 2026»» | |
| `marco_propuesto`, `programa`, `espera` | «Acto de «Otoño Sonoro»» | `espera`: «Se publica cuando aceptes el festival «Otoño Sonoro».» — es lo que debería decir la línea de lo hecho al aceptar un acto antes que su festival (hoy `acciones.ts` dice «no se pudo publicar ahora: se publica con la siguiente corrida de agendas», que no es lo que pasa) |
| `clase: festival`, `actos: 6`, `inicio`, `termina` | «Festival · 6 actos» | `detalle`: el periodo («Del 23 de oct al 2 de nov»). Sería bueno que la bandeja ponga el festival antes que sus actos |
| `clase: festival` sin `actos` | «Festival» | un festival sin programa |
| `clase: taller`, `sesiones` | «Taller · 4 sesiones» | `detalle`: «4 sesiones · jue 22, vie 23, sáb 24 y jue 29 de oct · 5:00–7:00 pm» (`resumenTaller`) |
| `clase: puntual`, `sesiones` | «Evento de 3 días» | `detalle` como el del taller |
| `serie: { fechas, cada }` | «Serie · 4 fechas, cada semana» | |
| `clase: exposicion`, `termina`, `exposicion` | «Exposición «Raíces» · hasta el lun 30 de nov» | |
| `variantes` | — | «También como «Hermanos Pérez Meza Big Band»» (si se quiere) |

## Decisiones por confirmar (founder o gestor)

1. **3 días de margen** alrededor de las fechas de un festival registrado (su periodo sale de los actos que ya tiene).
2. **Cuándo se propone un festival nuevo**: dos filas del mismo programa, una suelta de antes en la corrida, un programa que se lee como festival,
   o la agenda entera es su programa.
3. **Un acto aceptado antes que su festival se acepta y espera** (no se publica suelto); se publica al aceptar el festival. La línea de lo hecho
   de hoy dice otra cosa hasta que OL-432 use `datos.espera`.
4. **Festival rechazado → sus actos aceptados se publican sueltos.**
5. **Días seguidos con el mismo título y sitio = un evento de varios días** (puntual; sin filas si el horario es el mismo); el **taller**, siempre
   con sus sesiones.
6. **Series: una propuesta por fecha marcada con `serie`** (no hay clase para series en la app).
7. **Lo que el mapa no ubica dentro de la ciudad ya no se propone** (`fuera_de_la_ciudad`; antes se proponía y al aceptarlo decía «no se
   publicó: el mapa no lo encuentra»). Si el mapa no ubica tres o más sitios en un paso, se asume caído y no se descarta a nadie.
8. **La regla de títulos de la rutina manda también al aceptar** (filtra lo que `eventos_parecidos` devuelve).
9. **Precio no dicho en un acto, taller, festival o exposición = «Por confirmar»** (en un evento suelto, como antes: gratis).
10. **La exposición se publica sin precio, descripción ni horario propio** (el del lugar), como la app; la de un festival cuelga de él.
11. **Los eventos sueltos ya guardados de un festival nuevo no se cuelgan solos** de él al aceptarlo (ver «fuera»).

## Evidencia (árbol sin `.env`; sin red ni producción)

- `npm run lint`: 0 errores (el aviso viejo de `VisorImagen.componentes.test.mjs`). `npm run typecheck` en verde.
- `npm test`: 256 archivos, **4 245 pruebas** (23 nuevas), todas bien:
  - `agendasFormas.test.ts` (2, nueva, de punta a punta con el motor real y la base, la API y Mapbox falsos): **los casos del 21 de octubre**
    (Xantolo registrado con un acto: el acto que ya estaba es `ya_existe`; «Tzompantli», «Macario» (por el título), «Entre elementos y almas»
    (por la agenda) y «Fiesta de Luz» (tres noches, una propuesta con tres sesiones y el punto de la plaza) van con `marco`; los Pérez Meza, una
    con `variantes`, el precio de una y la descripción de la otra; «Noche de recorridos» con «CEART» → `ya_existe`; las cuatro lecturas del
    Tamuantzán y «Cd. Valles» → `fuera_de_la_ciudad`), el **taller** con su cuarta sesión llegada en el trozo siguiente, la **serie** semanal,
    la **exposición** con periodo y la inauguración distinta del mismo museo y hora, el **festival nuevo** «Otoño Sonoro» que nace con su segundo
    acto y se lleva al primero, y el **festival sin programa**; «Plaza de Armas» se busca en el mapa una sola vez por corrida. Y **al aceptar**: el
    acto antes que su festival espera (y sigue esperando al empezar otra corrida: `en_espera: 1`); al aceptar el festival se publican el marco
    sin punto y el acto colgado; el otro acto, después, también; «Fiesta de Luz» como evento de tres días sin filas de sesiones y Xantolo con su
    periodo recalculado; el taller con sus cuatro sesiones; la inauguración y la exposición ligada; la otra inauguración del mismo museo y hora,
    publicada; el festival sin programa.
  - `publicarEvento.test.ts` (+5): la base ve parecidas dos inauguraciones distintas y se publica; la misma función sí se frena; un acto de un
    festival rechazado (o de uno que dejó de ser festival) va suelto; un festival ya registrado en esas fechas no se duplica; una exposición que
    ya estaba se liga; si las sesiones fallan no queda el evento a medias; un taller a medias, con las que quedan; todas pasadas, «ya pasó».
  - `formaEvento.test.ts` (9, nueva), `cargaEventos.test.ts` (+5: los pares que se unen y los que no, el singular, `parecidoGuardado` con la
    regla, la sigla), `filtros.test.ts` (+2: otro municipio en el texto) y `agendas.test.ts` (el contrato con `clase`, el contador `unido`). Las
    52 del importador (`scripts/instituciones`) siguen bien.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 103 migraciones, **2 212 comprobaciones, 0 fallaron**. Banco nuevo
  `supabase/tests/pg/rutina-agendas-festivales.test.mjs` (sin migración: las filas con la forma exacta de `publicarEvento`, como
  `service_role`): el marco de un festival entra sin punto y un evento suelto sin punto no; los actos cuelgan con la llave de servicio; ni
  festival dentro de festival ni acto de algo que no es festival; `recalcular_festival` se puede llamar con la llave de servicio y da lo mismo que
  `periodoDePrograma`; las sesiones de un taller entran juntas y una suelta no; una por día; una sesión que pasa de la medianoche se rechaza y sin
  hora de fin entra; el evento de varios días acaba con su último día y lleva su punto; la exposición ligada a su inauguración (solo a un evento
  puntual) y la inauguración sin sugerir otra; una exposición que ya estaba se liga después; las propuestas con id puesto por la rutina, su
  `datos` cambiado y los actos que esperan encontrados por `datos->>'marco_propuesto'`. El banco encontró dos cosas que se corrigieron antes de
  entregar: las sesiones de madrugada (ahora sin hora de fin) y que la llave de servicio sí puede llamar `recalcular_festival` (ahora se usa).
- `npm run inventario`: sin novedades. `npm run medir`: 49 pantallas × 4 anchos, **sin novedades** (Ciudades, su hoja, la bandeja y Corridas,
  s32 a s35: 149 · 175 · 59 · 61 nodos a 390, como en la 461 y la 462).
- `npm run test:componentes` completo: **669 de 669** (Chrome real; la bandeja no cambió).
- **Con `main` unido** (`0eb456bf`, OL-430 #550; choques en `src/lib/propuestas.ts` y OPEN_LOOPS resueltos conservando lo de las dos ramas):
  typecheck y lint en verde, **4 275 unitarias**, **test:db 2 225/0**, inventario y medir sin novedades, **componentes 672 de 672**.

## Lo que se dejó fuera

- **Colgar de su festival los eventos sueltos que ya están en la base** (los 17 de Xantolo y Fotovisión 31) al aceptar el festival: cambia
  fichas existentes, algunas de otras cuentas; necesita decisión del founder (o la sugerencia que la app ya tiene, «Este festival ya está
  publicado», OL-341).
- **Proponer como lugar el sitio de un evento** que no está en el directorio (pendiente desde OL-429).
- **El horario propio de una exposición** (`eventos_horarios`): la agenda casi nunca lo da; la exposición usa el del lugar.
- **El importador de la Mac** sigue con la regla de `eventos_parecidos` (solo gana la sigla de `resolverLugar`).
- **Pantallas**: nada; lo nuevo de `datos` lo mostrará OL-432.

## Para la siguiente corrida real (gestor)

1. Unir; no hay migración ni variables.
2. San Luis, «Buscar agendas y eventos», tope 2,00 USD. En `rutinas_corridas.resumen`: `descartados.unido` y `fuera_de_la_ciudad`,
   `festivales`, `actos`, `sesiones`, `series`, `avisos` (que no salga «El mapa no respondió»). En las propuestas: `datos.clase`, `marco` o
   `marco_propuesto` en lo de Xantolo y Fotovisión 31, `sesiones` en «Fiesta de Luz».
3. En la bandeja (antes de OL-432 no se ve la forma): aceptar primero el festival propuesto y después sus actos; o un acto antes (queda
   aceptado sin evento hasta aceptar su festival).
