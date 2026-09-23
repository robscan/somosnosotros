# 42 · Festivales y eventos con varios actos (OL-151, propuesta de modelo)

**Estado:** propuesta, sin código. Pieza C5 de la cola (`docs/ops/COLA_DE_PIEZAS.md`, L51). Paso 3 del camino en pasos chicos del doc `24-grafo-cultural.md` («Evento padre — festivales y eventos con varios actos. Con prototipo antes»). Este documento es el análisis y la propuesta; el prototipo de pantalla es una pieza aparte, después de que el founder elija una forma de modelarlo.

## 1. Los casos

**Los tres que dio el founder (L51):**

1. **Festival de varios días con varios eventos sueltos.** El founder no dio un nombre, pero en la agenda real es el patrón de Fotovisión 31 (IPBA): un festival del 24 de septiembre al 12 de noviembre con un programa de actividades repartidas en ese rango, publicado como un PDF único.
2. **Inauguración con varias salas el mismo día.** Un museo (el founder cita "museo de arte contemporáneo") abre varias salas a la vez y al evento de apertura asisten músicos y otros artistas: un solo momento, un solo lugar, varios actos y varios artistas a la vez.
3. **EIMIM del CEART.** Evento de varios días con talleres y conciertos, además de "otros eventos": mezcla el caso 1 (varios días) con tener actos de distinto tipo (taller, concierto) dentro del mismo festival.

**Dos más que aparecen en la agenda real (`docs/ops/AGENDAS_CULTURALES.md`):**

4. **Festival de Cine UASLP.** Del 5 al 9 de octubre, una sola sede (CC200): varios días, un solo lugar, la función de cada día es su propio acto con su propio horario.
5. **Festival Internacional de Cine de San Luis Potosí (XIV).** 27 y 28 de noviembre, "sedes por anunciar": varios días y, a diferencia del caso 4, varios lugares a la vez — el mismo patrón de Fotovisión pero más corto.

En conjunto cubren las tres variables que hay que resolver: **varios días**, **varios lugares** y **varios actos con horario propio dentro de un mismo paraguas**.

## 2. Formas de modelarlo

### A. Evento padre con actos hijos

Un evento normal (el festival) y cada acto es también un evento normal que apunta al padre con una columna nueva (`eventos.evento_padre_id`, nullable, migración que solo añade).

- **Ventajas:** cada acto sigue siendo un evento de verdad — conserva lugar propio, horario propio, "Voy"/"Me interesa" propios, ficha propia, se puede compartir por separado. Resuelve los 5 casos, incluido el de varios lugares (cada acto trae su `lugar_id`).
- **Costo:** el alta se vuelve de dos pasos cuando hay actos (crear el padre, luego cada acto ligado a él); hay que decidir qué pasa si alguien borra o esconde el padre (los hijos no deberían desaparecer solos).
- **Qué rompe:**
  - *Agenda:* si se lista cada acto como evento suelto, un festival de 10 talleres llena la agenda de esos días; hay que decidir si se agrupan visualmente bajo el padre o se listan sueltos con una etiqueta "parte de [festival]".
  - *Ficha:* la ficha del padre necesita una sección nueva ("Programa": lista de actos), y la ficha de cada acto necesita un enlace de vuelta al padre.
  - *Coincidencias/"Voy":* si alguien marca "Voy" al padre, ¿implica algo sobre los actos? Se recomienda que no: "Voy" vive solo en el evento concreto (el padre, si tiene su propio horario, o cada acto). Evita inventar semántica nueva.
  - *Avisos:* un aviso nuevo de acto dentro de un festival que ya sigo es el mismo aviso de "nuevo evento en un lugar que sigo" si el acto respeta `lugar_id`; no hace falta un aviso especial.
  - *Compartir:* cada acto comparte su propia tarjeta; el padre comparte la suya con el rango de fechas.

### B. Un solo evento con "programa" de varios días

El festival sigue siendo una sola fila en `eventos` (con `inicio`/`fin` cubriendo todo el rango) y se le añade una tabla nueva `eventos_programa` (evento_id, fecha, hora, título del bloque, descripción corta) para el detalle día por día.

- **Ventajas:** no toca la agenda ni las coincidencias ni "Voy": el festival sigue siendo un evento como cualquier otro, con una tarjeta más larga en su ficha. El alta de un evento de un solo día no cambia en nada.
- **Costo:** el programa es texto/datos planos, no eventos reales: no hay "Voy" a un taller suelto, no hay ficha propia por acto, no se comparte un acto por separado, y si un acto tiene su propio lugar (el CEART con actividades en dos edificios) hay que repetir el lugar dentro de cada renglón del programa en vez de reusar `lugares`.
- **Qué rompe:**
  - *Agenda:* el festival aparece una sola vez, sin llenar la agenda — esto es una ventaja frente a A.
  - *Ficha:* necesita una tabla de horarios nueva en la pantalla del evento; no hay ficha de "taller de las 5pm" para compartir aparte.
  - *Coincidencias/"Voy":* solo existen a nivel de todo el festival, no por acto — pierde precisión en el caso 3 (EIMIM) y el caso 2 (inauguración con varias salas), donde a alguien le puede interesar solo un artista del programa.
  - *Compartir:* solo se comparte el festival completo, nunca un acto.

### C. Etiqueta de festival que agrupa eventos sueltos

Cada acto se da de alta como evento normal e independiente (sin padre), y se añade una tabla ligera `festivales` (id, nombre, descripción, imagen, rango de fechas) más una tabla puente `eventos_festivales` (evento_id, festival_id) para asociarlos. El festival es más una etiqueta que un evento.

- **Ventajas:** más simple que A para el caso de varios lugares (4 y 5): no hay que decidir qué evento es "el padre", el festival es solo una carpeta. Los eventos existentes de una edición pasada se pueden retroetiquetar sin tocarlos.
- **Costo:** el festival no es un evento y por tanto no tiene fecha/hora propia visible en la agenda como un renglón — necesita su propia pantalla tipo "mini-lugar" (como la ficha de un lugar, pero de festival) y su propia entrada en el buscador.
- **Qué rompe:**
  - *Agenda:* cada acto aparece suelto (como B evitaría llenarla, pero aquí si llena, igual que A) salvo que se agregue una fila "resumen del festival" además de los actos — duplicidad a resolver.
  - *Ficha:* nueva pantalla de festival distinta a evento y a lugar; añade un tercer tipo de ficha al canon (hoy son artista, lugar, evento).
  - *Coincidencias/"Voy":* igual que A, cada acto tiene su propio "Voy" — no rompe nada ahí.
  - *Avisos/Compartir:* el festival se puede compartir como carpeta; los actos se comparten solos, igual que A.

## 3. Recomendación

**Opción A (evento padre con actos hijos), con una precisión:** el padre es opcional y solo aparece cuando hace falta agrupar. El evento de un solo día no se complica: sigue siendo la misma fila de `eventos` de siempre, sin tocar el alta actual (`src/app/eventos/FormularioEvento.tsx`) ni una sola prueba de las existentes.

**Por qué, frente a B y C:**
- B pierde "Voy"/ficha/compartir por acto, que es justo lo que ya funciona bien en cada evento suelto (fase 4 del `PLAN.md`) y lo que más le importa al founder para que la gente se conozca. No vale la pena perderlo por ahorrar una tabla.
- C exige una pantalla y un tipo de ficha nuevos (festival como cuarto tipo, junto a artista/lugar/evento) para resolver algo que A resuelve reusando la ficha de evento que ya existe. Es más trabajo por menos beneficio, salvo que en el futuro el founder quiera festivales que agrupen ediciones históricas sin login — ahí C valdría más, pero no es el caso hoy.
- A cubre los 5 casos con una sola columna nueva y ninguna tabla nueva.

**Migración (solo añade, ninguna renombra ni borra):**
```sql
alter table public.eventos
  add column evento_padre_id uuid references public.eventos (id) on delete set null;
```
Un evento puede ser padre de varios (`evento_padre_id` en los hijos apunta a él) y el padre mismo tiene `evento_padre_id` nulo. No hace falta tocar `eventos_artistas` ni ninguna otra tabla de las 5 del `PLAN.md`.

**Cómo se ve:**

- **Agenda:** un renglón por festival (el padre), no uno por acto. Los actos no aparecen sueltos en Hoy/Esta semana/Próximos salvo que el padre no tenga su propio horario (caso 2, la inauguración: ahí el padre y el acto principal pueden ser el mismo evento). Esto evita que un festival de 10 talleres llene la agenda y es coherente con "filtrar no es navegar": la persona entra al festival y de ahí ve el programa, no al revés.
- **Ficha:** la ficha del padre gana una sección "Programa" (lista de actos con su fecha, hora y lugar, cada uno tocable a su propia ficha). La ficha de un acto gana una línea "Parte de [nombre del festival]" que regresa al padre. Sigue el mismo patrón de "relaciones" que ya propone el doc 24 para artista y lugar.
- **Alta:** el formulario de evento no cambia para el caso normal. Se agrega un renglón opcional, al final (como "Duplicar evento" hoy), del tipo "¿Es parte de un festival?" que deja elegir un evento padre ya existente o crear uno nuevo. El caso especial se abre solo cuando hace falta, tal como pide el founder.
- **Coincidencias, "Voy", avisos, compartir:** viven en el evento concreto (el acto o el padre si tiene su propio horario), sin inventar una capa nueva — misma regla en los cinco casos.

## 4. Cómo lo leería la IA del cartel

Hoy `src/lib/cartel.ts` lee un cartel y devuelve un solo evento (`Lectura`: título, fecha, hora, lugar, artistas, etc.) — no distingue programa de varios días. Con el modelo A, cuando el cartel muestra un programa completo (el PDF de Fotovisión, el cartel del EIMIM con varios talleres y conciertos), conviene:

- Agregar al esquema `Lectura` un campo opcional `actos` (lista de `{ titulo, fecha, hora, lugar }`, igual de tolerante a `null` que el resto) para que la IA separe el festival de sus actos cuando el cartel ya trae el desglose.
- Si el cartel es de un solo acto de un festival ya existente (por ejemplo el cartel de un concierto puntual que dice "parte de EIMIM 2026"), que la IA devuelva el nombre del festival en un campo de texto simple (`festival: string | null`) para que la persona lo confirme y lo ligue al padre correcto, sin adivinar por nombre.
- Ningún acto propuesto por la IA se liga solo: la persona confirma el padre igual que hoy confirma artistas y lugar — mismo candado que ya pide el doc 24 ("lo que propone la IA se confirma antes de publicarse como hecho").

Esto es un ajuste futuro del prompt y del esquema de `cartel.ts`, no parte de esta pieza (solo documento).

## 5. Preguntas para el founder

1. En la inauguración con varias salas (caso 2): ¿el padre necesita su propio horario visible en la agenda, o basta con que la agenda muestre el primer acto (la apertura) y el resto vive solo en la ficha?
2. Cuando un acto no tiene lugar propio (usa el mismo lugar que el festival, como el Festival de Cine UASLP en CC200), ¿repetimos el lugar en cada acto o dejamos que el acto herede el lugar del padre si no se especifica otro?
3. ¿Un festival puede tener actos de otras personas (otro lugar publicando su propio acto dentro de un festival ajeno), o siempre los da de alta quien creó el padre?
