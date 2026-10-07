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
- **Festival** — «Agrupa varios eventos.»

Cambiar la clase cambia **solo el paso del tiempo**; nombre, dónde, quién, precio y cartel se conservan.

### Exposición: «¿Cuándo se puede visitar?»
Sustituye a «¿Qué día es?» y «¿A qué hora?». Dos fechas (**Desde** y **Hasta**, el calendario de siempre; «Hasta» inclusivo) y debajo la casilla **«Horario del lugar»**, marcada si el lugar lo tiene, con su resumen («Ma–Do · 10:00 a.m.–6:00 p.m. · Cierra Lu»); al desmarcarla aparece la hoja de franjas de OL-315 («Agregar otro horario», ley de Postel). Si el lugar no tiene horario, la casilla no sale y el renglón de horario queda opcional en «Revisa» («Horario · Agregar»; sin él se publica con «Horario por confirmar», como pide el modelo: no se inventa). **Inauguración:** renglón opcional en «Revisa» («Inauguración · Agregar» → fecha y hora): se publica como acto puntual ligado (`inaugura_id`); la inauguración no hereda el horario de visita ni al revés. Si el cartel ya traía «Inauguración jue 5 · 19:00 · visita del 6 al 30» (H1), los dos renglones llegan llenos.

### Taller o curso: «¿Qué días son las sesiones?»
Sustituye a «¿Qué día es?». Calendario con **varios días marcables** (toque por día; el cartel ya los trae si los lee) y debajo la hora con la casilla **«Misma hora todas las sesiones»** (marcada) del prototipo firmado de OL-310; al desmarcar, un renglón por sesión con su hoja (ya construido en OL-311). Se publica **un** taller; «Voy» es al taller entero (prototipo aceptado); la ficha lista «Sesión n de N» y marca la que cambia de sede. Sin «sesión» en días intermedios sin evidencia.

### Festival: dos entradas, ninguna obliga
1. **El cartel trae varios eventos (H6, aceptado):** tras la lectura, «El cartel trae 3 eventos», cada uno como renglón con su fecha, hora y sede, marcados; un toque publica los marcados y los junta en el festival («Programa registrado: 3 actividades»); los desmarcados quedan como borrador. Antes de publicar se puede tocar un renglón y corregir su dato (lo que faltaba en el prototipo).
2. **Altas separadas (H4, aceptado en punteado):** al publicar el **segundo acto distinto** con el mismo festival y edición en la fuente, la sugerencia punteada «Estos dos eventos forman parte de Festival X» → «Relacionar los dos». Además, en «Revisa» de cualquier evento, renglón opcional **«Parte de un festival · Agregar»**: busca un marco existente por nombre (no se liga por parecido: la persona lo elige) o crea uno nuevo con solo el nombre; el marco toma su periodo del programa registrado. Un festival ajeno queda como propuesta pendiente hasta que lo confirme quien lo administra (permisos del modelo).

Un marco sin actos no sale en la agenda (no promete nada); se publica con al menos un acto.

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
