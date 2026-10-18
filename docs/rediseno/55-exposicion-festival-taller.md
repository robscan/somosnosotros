# 55 — Exposición, taller y festival en el alta por pasos, en inicio, agenda y filtros

**Punto 4 del orden firmado por el founder (2026-10-06):** «al llegar a exposición/festival/taller debemos abordar también cómo se mostrarán en inicio y agenda, cómo se considerarán en filtros, etc.». Escrito por el Gestor de cambios IV la noche del 2026-10-06 con el founder ausente: **las decisiones de abajo son del gestor y quedan por confirmar**; nada de esto sale a producción sin su «publica».

Se apoya en lo que ya está decidido o aceptado, sin volver a abrirlo:
- [Doc 42](42-festivales.md) (OL-151): evento padre con actos hijos (`eventos.evento_padre_id`), un renglón por festival en la agenda, «Programa» en la ficha del padre.
- [Modelo y recorridos](../investigaciones/eventos-modelo.md) (OL-272, del founder): una identidad por actividad y **su forma de ocurrir aparte** (puntual, periodo visitable, curso con sesiones, marco de festival); la estructura la prepara el sistema, no un cuestionario; «Me interesa» para exposición y curso; nada de «visitable hoy» sin horario; programa parcial dicho («Programa registrado: 3 actividades»).
- Prototipo aceptado el 2026-10-05 (OL-286, bitácora 314): el cartel con varios eventos de un festival se publica de una vez (H6); el taller de varias sesiones es un solo taller cuya ficha lista las sesiones y «Voy» es al taller entero (H7); sugerencias en punteado al publicar (H1, H2, H4).
- Ya construido: sesiones por día (`eventos_sesiones`, OL-311), horario del lugar por franjas (`lugares_horarios`, OL-315), la agenda por sesión (OL-320, en curso) y el alta por pasos con «Revisa» como centro.

## 1. Qué cambia en el modelo (migración que solo añade)

| Añade | Para qué |
| --- | --- |
| `eventos.clase text not null default 'puntual' check (clase in ('puntual','exposicion','taller','festival'))` | Cómo ocurre. Todo lo de hoy es `puntual`. |
| `eventos.evento_padre_id uuid references eventos(id) on delete set null` | El acto apunta a su festival (doc 42). Sin anidar festivales. |
| `eventos_horarios` (igual que `lugares_horarios`: `evento_id`, `dias`, `abre`, `cierra`) | Horario propio de una exposición cuando no es el del lugar. Sin filas, la exposición usa el horario del lugar; sin horario en ninguno de los dos, «Horario por confirmar». |
| `eventos.inaugura_id uuid references eventos(id) on delete set null` | La apertura (acto puntual) que inaugura la exposición; opcional. |

Lo que ya existe se reutiliza: una **exposición** es un evento con `clase='exposicion'`, `inicio` = primer día de visita y `fin` = cierre **inclusivo** (el final de ese día en su zona); un **taller** es `clase='taller'` con sus fechas en `eventos_sesiones` (la misma tabla de OL-311); un **festival** es `clase='festival'` con `inicio`/`fin` = el programa registrado (del primer al último acto) y sus actos con `evento_padre_id`. La función `guardar_evento_con_sesiones` gana la clase, el padre, el horario propio y la inauguración en la misma transacción; publicar un programa (H6) escribe el marco y sus actos en una sola operación atómica e idempotente (`operacion_guardado`).

## 2. El alta por pasos: el sistema propone la forma, la persona la confirma

No hay selector de tipo al principio (regla del founder: tira de tipos solo para evento/lugar/artista; «no coloques primero un selector de tipo»). **La clase la propone lo que ya se sabe:** la lectura del cartel (`Lectura` gana `clase` y, cuando el cartel lo trae, `visita: {desde, hasta}`, `sesiones: [...]` o `actos: [...]`) o las palabras del título («exposición», «muestra», «expo» → exposición; «taller», «curso», «laboratorio», «diplomado» → taller; «festival», «encuentro», «jornadas», «muestra de cine» → festival). Se confirma en **«Revisa»** con un renglón propio (icono de etiqueta: «Exposición · Cambiar»); «Cambiar» abre una hoja con las cuatro formas en lenguaje llano:

- **Evento** — «Pasa un día a una hora.»
- **Exposición** — «Se puede visitar varios días, en un horario.»
- **Taller o curso** — «Varias sesiones, una inscripción.»
- **Festival** — «Reúne varias presentaciones.» (OL-413; antes «Agrupa varios eventos.»)

Cambiar la clase cambia **solo el paso del tiempo**; nombre, dónde, quién, precio y cartel se conservan.

**«¿Qué es?» (OL-413, 18 de octubre de 2026).** El founder: «si hay dudas el sistema podría preguntar al usuario si es festival, galería, o evento,
solo cuando el sistema no lo pueda resolver o no sea claro». Cuando la lectura del cartel no trae la clase (y el título no propone ninguna) o lo
leído se contradice (dice festival sin programa y nada lo anuncia como festival; dice exposición sin periodo de visita), el alta pregunta una
sola vez «¿Qué es?» antes del paso del tiempo, con cuatro opciones grandes como «¿Cuánto cuesta?»: **Evento · Festival · Exposición · Taller o
curso** (la galería es la exposición; el taller se incluye porque es una clase que existe). Sin preselección; elegir una avanza. En los casos
claros no se pregunta nada.

### Exposición: «¿Cuándo se puede visitar?»
Sustituye a «¿Qué día es?» y «¿A qué hora?». Dos fechas (**Desde** y **Hasta**, el calendario de siempre; «Hasta» inclusivo) y debajo la casilla **«Horario del lugar»**, marcada si el lugar lo tiene, con su resumen («Ma–Do · 10:00 a.m.–6:00 p.m. · Cierra Lu»); al desmarcarla aparece la hoja de franjas de OL-315 («Agregar otro horario», ley de Postel). Si el lugar no tiene horario, la casilla no sale y el renglón de horario queda opcional en «Revisa» («Horario · Agregar»; sin él se publica con «Horario por confirmar», como pide el modelo: no se inventa). **Inauguración:** renglón opcional en «Revisa» («Inauguración · Agregar» → fecha y hora): se publica como acto puntual ligado (`inaugura_id`); la inauguración no hereda el horario de visita ni al revés. Si el cartel ya traía «Inauguración jue 5 · 19:00 · visita del 6 al 30» (H1), los dos renglones llegan llenos.

### Taller o curso: «¿Qué días son las sesiones?»
Sustituye a «¿Qué día es?». Calendario con **varios días marcables** (toque por día; el cartel ya los trae si los lee) y debajo la hora con la casilla **«Misma hora todas las sesiones»** (marcada) del prototipo firmado de OL-310; al desmarcar, un renglón por sesión con su hoja (ya construido en OL-311). Se publica **un** taller; «Voy» es al taller entero (prototipo aceptado); la ficha lista «Sesión n de N» y marca la que cambia de sede. Sin «sesión» en días intermedios sin evidencia.

### Festival: la definición aprobada (OL-413, 18 de octubre de 2026)

Founder, tras subir dos carteles que la lectura partió en «varios eventos» (Cumbiachella y Trayectos Interactivos): «es un solo evento con varias
presentaciones», «si festival implica llenar 4 fichas por separado de manera forzosa aunque todo pase en el mismo lugar, entonces sí debemos
cambiar la definición de festival»; y sobre la propuesta: **«Adelante con la definición»**. Donde lo de abajo diga otra cosa, vale esto:

- **Festival = un nombre que reúne varias presentaciones. El programa (actos como fichas separadas) es OPCIONAL.**
- **Un día y un lugar** (Cumbiachella: 30/10, 8 p.m.–2 a.m., Lunaria): UNA ficha de clase festival, con su día, su horario, su lugar y la
  alineación en «Quién». Conserva lo de festival (cabecera oscura, portada del sistema, la etiqueta «Festival»). Sin actos. En el alta pide día,
  hora y dónde como un evento, y «Revisa» ofrece «Programa · Agregar» para quien sí quiera actos. Se publica con
  `publicar_festival_sin_programa` (migración `20261018120000_festival_sin_programa.sql`, que solo añade).
- **Varios días o varias sedes:** festival con programa, como antes, pero los actos **heredan el lugar del festival**, que se pregunta **una
  sola vez** (el «Dónde» del festival); la sede de un acto se pide solo si el cartel le da otra, y siempre se puede cambiar una por una.
- **Una noche con varias actividades que no se presenta como festival** (Trayectos Interactivos): **un evento**. Las actividades van a la
  descripción y quienes se presentan a «Quién» (supuesto: el founder no lo dijo en palabras; es lo coherente con la definición).
- **La lectura del cartel** ya no convierte en festival todo cartel con dos o más actos: la regla vive en el código (`lib/actosLeidos`): actos el
  mismo día (o de madrugada del siguiente) en el mismo lugar se juntan; el mismo título varios días seguidos en un lugar es un evento de varios
  días con la hora de cada uno (una obra en temporada); solo con días distintos o sedes distintas hay programa.
- **El lugar por su dirección:** si el nombre leído no cruza con el directorio, la dirección leída se compara (calle y número, sin acentos,
  prefijos, código postal, ciudad ni país: `lib/direccionCartel`) con la de los lugares; con uno solo, «¿Es en Laboratorio Centro Histórico?».
- **En las listas:** un festival sin ningún acto publicado de hasta 31 días va como un evento (`festivalComoEvento`, `lib/claseEvento`): su
  renglón en su día con su hora en Agenda y en las fichas de lugar y de artista, su «Voy», su punto en «Cuándo», «Ahora»; en Inicio sigue solo en
  «Festivales y expos» (OL-347), con su día y su hora y sin «Programa por confirmar»; su ficha, sin «Programa» vacío, con su día, su hora y su
  lugar bajo el título y «cuándo · Costo · Van» en la banda. Uno más largo sin actos (un festival de meses anunciado sin programa) sigue como
  marco con «Programa por confirmar».

### Festival: dos entradas, ninguna obliga (6 de octubre; con el programa opcional desde OL-413)
1. **El cartel trae varios eventos (H6, aceptado):** tras la lectura, «El cartel trae 3 eventos», cada uno como renglón con su fecha, hora y sede, marcados; un toque publica los marcados y los junta en el festival («Programa registrado: 3 actividades»); los desmarcados quedan como borrador. Antes de publicar se puede tocar un renglón y corregir su dato (lo que faltaba en el prototipo).
2. **Altas separadas (H4, aceptado en punteado):** al publicar el **segundo acto distinto** con el mismo festival y edición en la fuente, la sugerencia punteada «Estos dos eventos forman parte de Festival X» → «Relacionar los dos». Además, en «Revisa» de cualquier evento, renglón opcional **«Parte de un festival · Agregar»**: busca un marco existente por nombre (no se liga por parecido: la persona lo elige) o crea uno nuevo con solo el nombre; el marco toma su periodo del programa registrado. Un festival ajeno queda como propuesta pendiente hasta que lo confirme quien lo administra (permisos del modelo).

~~Un marco sin actos no sale en la agenda (no promete nada); se publica con al menos un acto.~~ Desde OL-413 un festival se publica también sin
actos: es una ficha con su día, su hora y su lugar, y sale en la agenda en su día como un evento.

## 3. Cómo se ve en inicio, agenda, filtros y fichas

| Dónde | Evento puntual (hoy) | Exposición | Taller | Festival |
| --- | --- | --- | --- | --- |
| **Inicio** | Estelar, Esta semana, Nuevos, Más adelante: igual | **Carril propio «Para visitar»** con las exposiciones vigentes en la ciudad («Hasta el 30 nov · Museo Francisco Cossío»), ordenadas por la que cierra antes. No entran en «Esta semana» cada día: no son algo que pasa hoy a una hora. | Cada sesión sale como ocurrencia en el carril que le toque (OL-320), con «Sesión 2 de 4» en la tarjeta. | En los carriles sale **el marco** una vez («Festival X · 3 actividades esta semana»), no sus 10 actos. |
| **Agenda por día** | Igual | Al final del día, sección **«Para visitar hoy»**: las exposiciones abiertas ese día según su horario (del lugar o propio), con «Abre 10:00–6:00 p.m.»; sin horario, «Horario por confirmar» y **no** cuentan como «visitable hoy». | Una tarjeta por sesión del día, «Sesión 2 de 4». | **Un bloque por festival** con sus actos de ese día debajo (cada acto tocable a su ficha); el marco no sale en días sin actos. |
| **Cuándo (calendario)** | Punto por día | Sin punto por día de visita: la exposición no es una fecha; sale en «Para visitar». | Punto en cada día con sesión | Punto en cada día con actos |
| **Filtros (hoja)** | — | Grupo nuevo **«Qué»**: Todo · Eventos · Exposiciones · Talleres · Festivales (una sola elección; a demanda, como pide el modelo). Un filtro por artista o lugar elige actos y los agrupa bajo su festival. |
| **Ficha** | Igual | «Hasta el dom 30 nov · Abre hoy 10:00–6:00 p.m.» (o «Horario por confirmar»); «Inauguración · jue 5, 7:00 p.m.» si la hay; **«Me interesa»** en vez de «Voy» (no se inventa un día de asistencia); «Cómo llegar». | Lista de sesiones con «Sesión n de N» y la sede si cambia (ya está); **«Voy»** al taller entero; enlace de inscripción si lo hay. | Sección **«Programa»** por día con cada acto; «Programa registrado: N actividades»; **«Me interesa»** en el marco, «Voy» en cada acto. El acto dice «Parte de Festival X». |
| **Compartir / calendario** | Igual | Texto con «Hasta el…»; el .ics marca el periodo (todo el día). | Un VEVENT por sesión (siguiente paso de OL-320). | El .ics del marco lleva el periodo; el de cada acto, el acto. |
| **Pasado** | Igual (OL-023) | Se oculta al terminar el día de cierre. | Al terminar la última sesión. | Al terminar el último acto registrado. |

Los números de la agenda («12 eventos esta semana») cuentan ocurrencias: una por sesión de taller, una por acto de festival (el marco no suma), y las exposiciones aparte («y 4 para visitar»).

### Al día: lo que quedó (OL-410, 14 de octubre de 2026)

La tabla de arriba es la propuesta del 6 de octubre. Desde entonces se firmó y se construyó lo siguiente; donde la tabla diga otra cosa, vale esto:

- **Inicio:** las exposiciones y los festivales van juntos en el carril «Festivales y expos» (OL-342), todos los festivales vigentes, también sin actos («Programa por confirmar», OL-346); el marco solo sale ahí y sus actos salen sueltos en los demás carriles (OL-347). «Nuevos eventos» junta los actos nuevos en la tarjeta de su festival (OL-385).
- **Agenda:** «Para visitar hoy» va con las exposiciones que abren ese día y también con las que no tienen horario conocido («Horario por confirmar», después de las otras; OL-381). El bloque de festival dice «Programa registrado: N actividades · hoy M».
- **Fichas de lugar y de artista (OL-410, firma del founder del 14 de octubre sobre el prototipo de OL-409: «F Bloque como Agenda · S La hora de cada función, en su día · E Grupo "Para visitar", sin Voy · U En curso "Hasta el …", por venir "Del … al …"»):** piden lo mismo que Agenda (`COLUMNAS_EVENTO_LISTA` y `completarEventos`, `lib/cargarAgenda`; `lib/cargarEventosFicha`) y lo arman igual (`lib/eventosFicha`):
  - **F:** un festival es un bloque (`BloqueFestival`) con todas sus funciones en ese lugar (o de ese artista) debajo, cada una con su día y su hora; el bloque va en el día de su **siguiente función** ahí, nunca bajo el día en que empezó el festival. Su cabecera: «Hasta el sáb 17 de oct · 7 funciones aquí» (en un artista, «2 funciones suyas»). Sin funciones por venir ahí, no sale (lo que pasó está en el Historial o la Trayectoria). El marco nunca es un renglón suelto: si es de la ficha y no tiene ningún acto publicado, sale solo su cabecera con «Programa por confirmar».
  - **S:** cada función y cada sesión en su día, con su hora de inicio y de fin («17:30–19:20»; un taller, «18:00–20:00 · Sesión 2 de 3»). Una función de un acto de festival no dice «Día n de N». Nunca el primer inicio pegado al último fin («20:00–19:00»). Lo mismo en el programa de la ficha de un festival, en Buscar y en «Tus planes» (la próxima función o sesión).
  - **E:** las exposiciones van en el grupo «Para visitar», arriba de los días, sin «Voy»: abierta, «Abre 17:00–22:00 · hasta el dom 8 de nov» (en 24 h, también en «Para visitar hoy» de Agenda) con el reloj (o «Horario por confirmar», o «Hoy cierra»); por abrir, sus días. Nunca «00:00» bajo su día de apertura.
  - El número «Eventos · N próximos» (o «Fechas») y el de la sección cuentan lo que se lista: cada renglón, cada función de un bloque, la cabecera sola de un festival y cada exposición.
- **U · el cuándo de un festival y una exposición, en todas las superficies** (tarjetas de Inicio y Buscar, renglones de Agenda y de las fichas, la ficha del festival y de la exposición, «Tus planes», la hoja de Lugares): ya en curso (hoy es uno de sus días) «Hasta el sáb 17 de oct»; por venir «Del 12 al 17 de oct»; de un solo día, ese día. Una sola regla: `textoDePeriodo` (`lib/fechas`) y `cuandoDePeriodo` (`lib/claseEvento`). El alta y la edición de un festival (el resumen de su periodo) siguen diciendo sus días.
- **El costo** (C y K de la misma firma: se puede dejar vacío; sin dato, «Por confirmar») es otra pieza, OL-411.
- **OL-413 (18 de octubre de 2026): el festival sin programa.** Con la definición aprobada (§2), un festival sin ningún acto publicado de hasta 31
  días ya no es una cabecera con «Programa por confirmar» ni falta en la agenda: es un renglón en su día con su hora, en Agenda, en las fichas
  de lugar y de artista, en Buscar y en «Tus planes», con «Voy»; en Inicio, en «Festivales y expos» con su día y su hora y su lugar; en «Nuevos»,
  suelto. Su ficha no tiene «Programa» vacío ni dice «Programa registrado: 0 actividades»; su autor agrega el programa desde el menú. El de más
  de 31 días sin actos sigue como estaba.

## 4. Piezas

1. **OL-321 · Modelo y alta por pasos de exposición, taller y festival** (migración que solo añade; `Lectura` del cartel con clase, visita, sesiones y actos; el paso del tiempo según la clase; renglones nuevos en «Revisa»; publicar programa H6 con corrección por renglón; «Parte de un festival» con marco nuevo o existente; la ficha de cada clase). Prototipo: [`prototipos/exposicion-festival-taller.html`](prototipos/exposicion-festival-taller.html).
2. **OL-322 · Inicio, agenda, Cuándo y filtros** (carril «Para visitar», sección «Para visitar hoy», bloque de festival por día, «Sesión n de N», grupo «Qué» en la hoja de filtros, números de la agenda). Arranca cuando OL-320 (ocurrencias) esté unida: se apoya en esa fuente.
3. **OL-323 · Sugerencias al publicar (H1, H2, H4)** con el modelo ya en pie: la exposición tras la inauguración y el festival tras el segundo acto, en punteado como el prototipo aceptado.

## 5. Por confirmar con el founder (decisiones del gestor)

1. La clase se **propone y se confirma en «Revisa»** (sin selector al inicio). Alternativa: preguntarla justo después del nombre cuando no hay pista.
2. «Me interesa» para exposición y festival, «Voy» para taller y actos.
3. Carril «Para visitar» en inicio y sección «Para visitar hoy» al final de la agenda del día, en vez de repetir la exposición cada día.
4. Un bloque por festival en la agenda del día, con sus actos debajo (en vez de un renglón por acto o solo el marco).
5. El grupo «Qué» en la hoja de filtros, con una sola elección.
6. Inauguración como renglón opcional de la exposición (acto ligado), no como paso obligado.
