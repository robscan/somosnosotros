# 480 · Lector de la Cartelera de la Ciudad de México (OL-448)

**Fecha:** 2026-10-22. **Rama:** `cartelera-cdmx`, desde `origin/main` (`618380a5`). **Operador:** agente de la pieza (Claude) para el Gestor VII,
sin otros agentes. **Migración:** ninguna. **Variables de entorno:** ninguna. **Pantallas:** ninguna nueva; en la hoja «Buscar agendas y eventos»
de Ciudad de México la primera fuente dice «Cartelera de la Ciudad de México y agendas de gobierno». **Estado:** lista para la revisión del gestor.

## El pedido

El founder preguntó por qué la cartelera de la ciudad no se leía y dijo: «No quites nada, si cultura los mete nosotros también. Me gusta que leas
con calma para no tirar el sitio.»

No se leía porque cartelera.cdmx.gob.mx se arma con JavaScript: la rutina le daba la página a la lectura web de la API, que la devolvía vacía (las
dos corridas de OL-444: 8 agendas, 2,56 USD, 0 propuestas). La cartelera tiene una API interna sin llave que el gestor encontró con curl:
`POST /api/v1/internal/events/search_builder` (`by_event_page=N`: 9 eventos por página, 101 páginas, ~906 eventos; con `by_venue_page=N` trae
además la página N de recintos, 26 páginas, 227 recintos) y la ficha de cada evento (`GET /<id>/<dd-mm-aaaa>/<texto>`, HTML con
`var cdmx_billboard_event_info = {…};`).

## Qué cambió

**El lector** (`src/lib/rutinas/carteleraCdmx.ts`, puro, sin `server-only`: lo usan la rutina y el guion de la Mac):

- `leerLista` (página de la lista y de recintos), `extraerObjetoJs` (el objeto de la ficha con sus llaves en equilibrio: comillas, escapes, `}`
  y `;` dentro de los textos no lo cortan) y `leerFicha` (dirección y punto, descripción en texto plano, tipo, funciones, duración, costos,
  recinto, imagen, enlace). Teléfonos, correos y WhatsApp de la ficha no se leen.
- `filasDeFicha`: cada evento como las filas que la rutina ya sabe proponer. Una por día de función de hoy en adelante, a su primera hora (con su
  fin por la duración). Una **exposición** con varios días es una sola fila abierta (`visita`) del primero al último; un **taller**, todas sus
  sesiones (hasta 31); lo demás, sus funciones de los próximos 60 días (hasta 31). «00:00» es como la cartelera dice «sin hora»: vale la de la
  descripción («12 horas», «a las 17:30», «de 10 a 18 horas»); si tampoco la dice, no da filas.
- La clase por el tipo (el de la lista o el de la ficha, el primero que diga una): Museos y Exposiciones → exposición, Cursos y Talleres → taller,
  Festivales y Ferias → festival; lo demás (Congresos, Recorridos, Al Aire Libre…), la del título o evento. **Nada se descarta por tipo.**
- El costo (`precioDeCartelera`): «Gratuito» → «Gratis», «$ 50» → «$50», varios → «General $120, Estudiantes $60» (el primero manda y lo demás
  queda como nota del costo, la regla de OL-441).
- **La calma** (`clienteCartelera`): un solo cliente, una petición a la vez (aunque se le pidan dos sin esperar), **al menos 1,5 s** entre el fin
  de una y el principio de la otra (también entre pasos: la última queda en el cursor), reintentos ante 429, 5xx o sin respuesta con 3, 6 y 12 s
  (o lo que pida `Retry-After`, hasta 60 s), un 404 no se reintenta, y `User-Agent: somosnosotrxs.org (lector de cartelera; contacto en el sitio)`.
  Un 429 que no se resuelve detiene el paso: sigue en el siguiente latido.
- Los recintos: `cruzarRecinto` (el mismo nombre, o el único que coincide, como `resolverLugar`; o uno a menos de 150 m con un nombre parecido,
  `nombresParecidos` de «Buscar lugares») y `datosDeRecinto` (la propuesta de lugar: nombre, tipo por el nombre, dirección, punto, imagen de la
  lista de recintos, enlace del evento como red, `cartelera_recinto`).

**La rutina** (`src/lib/rutinas/agendas.ts`):

- En Ciudad de México (por slug, nombre o alias: `esCiudadDeMexico`), `agenda-cultura` empieza por la tarea `cartelera`, **sin la API (0 USD)**;
  la página de cartelera.cdmx.gob.mx (guía o agenda guardada) ya no se le da a la API y no se buscan otras de gobierno. Universidades, guías y web
  siguen igual detrás.
- **Por pasos:** primero las páginas de la lista (cada una con su página de recintos), luego las fichas. Caben `peticionesPorPaso(plazo)` =
  (195 s − 45 s de reserva) / 2,5 s = **60 peticiones por paso** (1,5 s de calma + ~1 s de respuesta; medido: 1,78 s de media), y nunca si quedan
  menos de 47,5 s. Lo que falta queda en `resumen.cursor.cartelera` (página siguiente, fichas por leer como `[id, día, tipo]`, ids vistos,
  recintos, última petición) y sigue en el siguiente latido. El avance cuenta por dentro (lista 20 %, fichas 80 %).
- Lo de fuera del radio de la ciudad no se pide; lo ya propuesto antes desde la cartelera (`datos.cartelera_id`, cualquier estado) tampoco.
- Lo leído se propone por lotes con el **mismo `proponer`** de siempre: ya está en `eventos`, ya propuesto, rechazado antes, la misma función,
  sesiones de un taller o de días seguidos, series, festivales. Sin tope de propuestas por tarea (lo que la cartelera publica, entra). Cada
  propuesta lleva `url` = su ficha (fuente y enlace del evento), `imagen`, `cartelera_id`, el punto del recinto (no se busca en el mapa) y, si el
  recinto no está, `lugar_propuesto`. Fuente en la bandeja: **«Cartelera de la Ciudad de México»**.
- Fuera de la ciudad se decide una vez por evento (la regla de `proponer`: alcaldías de la ciudad en la dirección), no por función; su recinto
  tampoco se propone.
- El recinto que falta se propone como **lugar** (tipo `lugar`) una sola vez en la ciudad (no si ya se propuso o se rechazó: `armarConocidos` /
  `motivoPorNombre` de «Buscar lugares»).
- `resumen.cartelera`: eventos listados, fichas leídas y fallidas, propuestos, recintos nuevos y por tipo (leídos y propuestos), sin nombres.
- `parametros.solo_cartelera` (el guion): solo esa tarea, sin publicar lo aceptado ni tocar las agendas guardadas.

**Publicar** (`src/lib/rutinas/publicarEvento.ts`): una propuesta con `clase: exposicion` y `visita` se publica como **exposición** (del primer
minuto de su primer día —hoy, si ya abrió— al último del día de cierre), no como inauguración, y no si ya está esa exposición en ese sitio esas
fechas. `lugaresDeCiudad` trae además `lat` y `lng` (para el cruce por cercanía).

**La bandeja** (`src/app/admin/ciudades/acciones.ts`): al aceptar un evento con `datos.imagen`, después de publicarlo se pone como cartel por el
camino de «Buscar carteles» (`ponerCartel`: se baja, se prepara, se guarda en Storage). Si no se puede, el evento queda publicado sin cartel y la
línea lo dice: «… · se publicó sin cartel: su imagen no se pudo bajar».

**El motor** (`motor.ts`, `lugares.ts`): `dormir` opcional en las dependencias y el contexto (las pruebas pasan un reloj falso; por omisión, espera
de verdad).

**La carga inicial** (`scripts/instituciones/cartelera-cdmx.ts`, por `correr.mjs`, que ahora resuelve `server-only` vacío como las pruebas):
reutiliza `pasoAgendas` con `solo_cartelera`, por pasos de 10 minutos. Sin `--simular` crea una corrida `agendas` de la ciudad (tope 0,01 USD: no
usa la API), guarda el avance en ella (si el guion se corta, el latido la retoma al vencer `ocupada_hasta`, 30 min), la deja «terminada» con sus
propuestas y guarda los ids para deshacer; si hay una búsqueda de agendas en curso en la ciudad, no empieza. Con `--simular` lee la cartelera de
verdad y la base solo para leer (`soloLectura`: lo que escribiría se anota y no se toca nada). Las dos imprimen y guardan el informe.

## Decisiones por confirmar (founder o gestor)

1. **Las alcaldías de la ciudad siguen mandando.** «No quites nada» lo apliqué a los tipos. Ciudad de México tiene sus parámetros (las alcaldías
   turísticas y 12 km, decisión del 21 de octubre): lo que está lejos ni se pide y lo de otras alcaldías (los FARO de Iztapalapa o Gustavo A.
   Madero, Xochimilco) se cuenta en `fuera_de_la_ciudad`. Si el founder quiere toda la cartelera, basta con ampliar alcaldías y radio en los
   parámetros de la ciudad, sin código.
2. **Sin hora, no entra.** La cartelera pone «00:00» cuando no sabe la hora (en la muestra, 2 de 5). Si la descripción tampoco la dice, el evento
   cuenta como `sin_hora` (la regla de siempre: día y hora exactos). Alternativa: proponerlos «todo el día» (hace falta decidir cómo se publican).
3. **Exposiciones abiertas** (`visita`): se publican como exposición del día que abre (o hoy) al último día que lista la cartelera; en las
   permanentes la cartelera lista ~5 semanas, así que su fin es ese. Es una forma nueva en `publicarEvento.ts`.
4. **La imagen como cartel:** en muchas fichas la imagen es una foto del recinto, no un cartel. Se pone al aceptar; si se prefiere no ponerla, es
   quitar `datos.imagen`. La imagen del recinto va en su propuesta de lugar, pero **aceptar un lugar todavía no la pone como portada** (pieza aparte).
5. **La descripción se copia** en texto plano (sin la firma «CarteleraCdMx»); las de la API se redactaban con palabras propias. Es texto público
   del gobierno de la ciudad, con su enlace como fuente.
6. **El evento y su recinto nuevo no se esperan:** `datos.lugar_propuesto` nombra la propuesta del lugar; si el lugar se acepta antes que el
   evento, el evento queda en ese lugar (por su nombre); si no, se publica como sitio con el punto de la cartelera. No hay una espera como la de
   los actos de un festival.
7. **Varias funciones el mismo día:** solo la primera hora (una propuesta no tiene dos funciones el mismo día). Una serie semanal que no es taller
   da una propuesta por fecha (la regla de siempre), solo de los próximos 60 días.
8. **El tipo del recinto sale de su nombre** («Colegio de San Ildefonso» queda Escuela, aunque es museo); la administración lo ve al aceptar.

## Evidencia

- `npm run lint` (0 errores; el aviso de `VisorImagen.componentes.test.mjs` ya estaba), `npm run typecheck`, **`npm test`: 4 620 pruebas**,
  **`TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 108 migraciones, 2 359 pruebas, 0 fallaron** (sin migración),
  `npm run inventario` (sin novedades), `npm run medir` (53 pantallas × 4 anchos, sin novedades), **`npm run test:componentes`: 719 de 719**,
  `npm run build` en verde.
- Pruebas nuevas (`carteleraCdmx.test.ts`, con respuestas reales recortadas en `carteleraCdmxMuestras.ts`): la lista, la ficha, el objeto con
  comillas, llaves y punto y coma dentro de sus textos, los costos, la clase por tipo, las filas (taller, exposición, festival, «00:00»), los
  recintos, la calma con reloj falso (1,5 s, una a la vez, User-Agent, 429 con `Retry-After`, 5xx con 3/6/12 s, 404 sin reintento, la calma entre
  pasos), 60 peticiones por paso; de punta a punta con el motor y la base falsa: 5 eventos (4 propuestos, 1 fuera de la ciudad), 2 recintos
  nuevos como lugares, 0 USD, **la segunda corrida no pide fichas ya propuestas ni propone nada** (`ya_propuesto: 4`), por pasos con el cursor
  (3 peticiones por paso), un 429 sin fin detiene el paso y sigue en el siguiente, y `solo_cartelera` no publica ni guarda agendas; publicar una
  exposición abierta y su duplicado. `agendas.test.ts`: la cartelera ya no va a la API. `acciones.aceptar.test.ts`: el cartel al aceptar y su nota.
  `scripts/instituciones/cartelera-cdmx.test.ts`: `soloLectura` no escribe nada y el informe.
- **Muestra real y pequeña, de solo lectura** (2 páginas de lista + 5 fichas, con el lector y su calma; ninguna base), 22 de octubre:

```
[0.8 s] lista 1: 9 eventos, 9 recintos; 101 páginas, 908 eventos en total; recintos en 26 páginas
[2.7 s] lista 2: 9 eventos, 9 recintos
[4.3 s] ficha 35125 · Museos y Exposiciones → clase exposicion · «El Arte Popular y la vida cotidiana» · Museo de Arte Popular (Cuauhtémoc) · costo $60 · 1 fila(s): 2026-10-22 10:00 hasta 2026-11-29 · imagen sí
[6.0 s] ficha 40980 · Cursos y Talleres → clase taller · «Fantasmitas» · FARO de Oriente (Iztapalapa) · costo Gratis · 0 fila(s) · imagen sí
[7.7 s] ficha 40028 · Congresos y Convenciones → clase puntual · «X Congreso Latinoamericano de la Franquicia» · Expo Reforma CONACO (Cuauhtémoc) · costo Gratis · 2 fila(s): 2026-10-22 09:00–21:00, 2026-10-23 09:00–21:00 · imagen sí
[9.4 s] ficha 40605 · Festivales y Ferias → clase festival · «Pachanga Antirracista» · Secretaría de Cultura de la Ciudad de México (Álvaro Obregón) · costo Gratis · 0 fila(s) · imagen sí
[11.0 s] ficha 30075 · Recorridos → clase puntual · «Casa Ofrenda Día de Muertos Mexskeletons» · Bosques del Sur Xochimilco (Xochimilco) · costo $200 · 31 fila(s): 2026-10-22 10:00–11:00, 2026-10-23 10:00–11:00, 2026-10-24 10:00–11:00, … · imagen sí

7 peticiones en 11.0 s; separación entre inicios: mínima 1652 ms, media 1801 ms
```

  «0 fila(s)»: la ficha dice «00:00» y su descripción no da la hora (punto 2). «Fantasmitas», «Pachanga» y la «Casa Ofrenda» están en
  alcaldías que no son de la ciudad en sus parámetros, así que la rutina los contaría `fuera_de_la_ciudad` (punto 1). En toda la sesión hice
  **32 peticiones** a la cartelera (estudiar el formato, dos fichas con «00:00» y esta muestra, que corrí tres veces mientras ajustaba el lector), todas con 1,5 s o más entre
  una y otra, ninguna en paralelo.

## Lo que quedó fuera

- La portada de un lugar aceptado con la imagen del recinto (punto 4).
- Una espera entre un evento y su recinto propuesto (punto 6).
- Los eventos sin hora (punto 2).
- Ninguna pantalla nueva; el informe por tipo vive en `resumen.cartelera` y en el informe del guion, no en Ciudades.

## La carga inicial (para el gestor)

Desde la carpeta principal (la que tiene `.env`):

```
node scripts/instituciones/correr.mjs cartelera-cdmx --autor <id del admin> --simular
node scripts/instituciones/correr.mjs cartelera-cdmx --autor <id del admin>
```

Duración estimada: 101 páginas de lista y unas 600–800 fichas (las que están dentro de 12 km) a ~1,8 s cada una: **de 25 a 35 minutos**, cada
una. El informe queda en `scripts/instituciones/salida/cartelera-cdmx-…md` (y, sin `--simular`, los ids de lo propuesto). Con el motor, la misma
lectura toma unos 13 pasos de 60 peticiones.
