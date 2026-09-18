# 099 · "Nuevos" no pone arriba lo recién publicado

**Fecha:** 2026-09-17 · **Rama:** `nuevos-por-publicacion`, desde `origin/main` ecc913a · **OL:** OL-068 · **PR:** pendiente

## De dónde sale

El founder, en el chat:

> «cuestiona la manera como se organizan eventos "Nuevos" en agenda, se acaba de publicar uno hoy y el comportamiento esperado es verlo en la sima de la lista por ser el mas reciente. Coordina con chat de gestion de cambios y entiende reglas de operación»

## Instrucciones de gestión de cambios

Se le avisó antes de tocar nada (regla 0) con el diagnóstico. Contestó: rama `nuevos-por-publicacion` desde `origin/main` ecc913a, bitácora **099**, **OL-068**; ningún choque (ni `deslizar-en-perfil-y-fichas` ni `cartel-aparte` tocan `AgendaInicio.tsx`, `src/lib/agenda.ts` ni `RenglonEvento.tsx`), pero la pieza B de deslizar entra a `main` antes, así que hay que traer `main` antes del PR; sin migración; **prototipo antes que código** y documento en `docs/rediseno` con el número que sigue al 22; que lo firme el founder antes de escribir código. Para cuando se construya: una prueba de la combinación que hoy falta (`filtrarAgenda` junto con `agruparPorDia`) que falle antes del arreglo, quitar el código que quede inerte, capturas a 390×844 y comprobar que Todos y Cercanos no cambian.

El script `scripts/ops/siguiente-bitacora.sh` decía 098 y OL-067; el encargado los tenía reservados para otra pieza sin archivos, así que valen los suyos (099, OL-068). Es el caso exacto para el que existe la regla 4.

## El diagnóstico

Tres hallazgos, en orden de profundidad:

1. **El orden por fecha de publicación es código inerte.** `filtrarAgenda` (`src/lib/agenda.ts`) ordena Nuevos por `creado_en` descendente, pero `AgendaInicio.tsx:130` llama `agruparPorDia(lista, ahora)` sin `ordenDado`, y `agruparPorDia` re-ordena con `compararEventos` (por `inicio`). Ese `sort` no llega nunca a la pantalla.
2. **Pasar `ordenDado = true` no arregla nada.** `agruparPorDia` siempre ordena los grupos por día del evento ascendente (su último `sort`). Un evento publicado hoy que sucede en tres semanas cae en el penúltimo encabezado, aunque dentro de su día vaya primero. Reproducido con una prueba temporal (cuatro eventos, el publicado hoy salió 4 de 4).
3. **La pestaña no distingue nada en producción.** Medido en el navegador a 390×844 el 2026-09-17: **Todos = 96 eventos en 29 encabezados + Destacados; Nuevos = 88 eventos en 29 encabezados**, los dos terminando en "dom 6 de dic". Nuevos muestra el 92% de Todos, en el mismo orden y con los mismos encabezados, porque las agendas institucionales se cargaron todas dentro de la misma semana y el umbral de `esNuevo` son 7 días fijos.

Por qué nadie lo vio: `agenda.test.ts` prueba `filtrarAgenda` sola, nunca junto con `agruparPorDia`, que es donde se pierde el orden.

Y hay una decisión firmada que la pantalla no cumple: la **decisión 15** de [02-inicio-flujo-y-estados.md](../../rediseno/02-inicio-flujo-y-estados.md), del founder el 2026-09-14, dice «**Nuevos** muestra lo agregado en los últimos 7 días, **lo más reciente primero**». No es un cambio de opinión suyo: es un defecto contra lo que ya había firmado.

## El fondo

La pestaña **selecciona** por fecha de publicación y **se organiza** por fecha del evento: dos ejes, y el segundo anula al primero. «Lo más reciente primero» y «agrupado por día del evento» no pueden ser verdad a la vez. La app ya resuelve bien este eje en `/novedades` (`agruparNovedades` y `tituloDia`: Hoy · Ayer · Esta semana · Hace más), pero ahí solo entra lo que la persona sigue.

**Un detalle que decide el tamaño del cambio:** `RenglonEvento` solo muestra la **hora** (`horaCorta`), nunca el día; el día vive únicamente en el encabezado del grupo. Si Nuevos deja de agrupar por día del evento, el renglón tiene que decir el día, o un evento de octubre se leería igual que uno de esta noche.

## Qué se hizo

Solo documentos; ninguna línea de código de la app:

- **`docs/rediseno/23-nuevos-por-publicacion.md`:** el problema con su evidencia, el error de fondo, las tres formas de resolverlo con lo que gana y pierde cada una, la recomendación (B) y una pregunta abierta que es del founder (el umbral de 7 días).
- **`docs/rediseno/prototipos/nuevos-por-publicacion.html`:** cuatro teléfonos a 390×844 con **los mismos seis eventos** — cómo está hoy, A, B y C — con un anillo (solo del prototipo) sobre el evento publicado hoy y, debajo de cada uno, en qué posición cae. Mirado con `front-visual`: hoy **5 de 6**, A **1 de 6**, B **1 de 6**, C **5 de 6**. Publicado para el iPhone en https://claude.ai/artifact/9uSskNENJyzdyxQRHwzUsM

Dos correcciones salieron de mirarlo, no de razonarlo: los glifos de la barra de estado del iPhone salían como cajas vacías (ahora los mismos que el resto de los prototipos), y **A se ve tan limpia como B con seis eventos**, que es engañoso — con los 88 de producción son 88 renglones seguidos sin un solo asidero. El dato de producción (88 de 96) y el costo de cada variante quedaron escritos en el prototipo para que la muestra pequeña no decida por el founder.

## Lo que recomiendo

**B · por día de publicación.** C se descarta sola: no resuelve lo que pidió (su evento seguiría en posición 5 de 6). A y B ponen las dos lo recién publicado en la cima, pero A lo hace dejando la lista sin ninguna referencia. B cumple la decisión 15 al pie, reutiliza `tituloDia` ya probado, y dice en voz alta lo que la pestaña promete. Con B van dos cosas que no son opcionales: el renglón de Nuevos muestra el día del evento, y los encabezados dicen «Publicado hoy / Publicado ayer / Esta semana» para no chocar con el «Hoy» que ya significa «el evento es hoy» en Todos.

## Lo que firmó el founder

Miró el prototipo y contestó: «tomo tu recomendación y de acuerdo en mostrar nuevos desde la ultima vez que entraste, pero con un tome máximo de 7 días. No olvides empty state que además invite a subir eventos.» Tomó **B** y, de paso, contestó la pregunta que estaba aparte (el umbral) y añadió el vacío. Después eligió los textos: la versión corta del vacío, y para los encabezados escribió «Lo mas nuevo, Publicado ayer, etc» — mejor que mi «Publicado hoy», porque con el umbral por última visita el primer grupo **no siempre es de hoy** y «hoy» mentiría.

Gestión de cambios autorizó arrancar desde `ecc913a` sin esperar la pieza B de deslizar, con dos reglas que salieron de comprobar sus 28 archivos: **añadir en vez de modificar**, y el día del renglón como prop opcional. Su `EventosPorDia.tsx` importa `agruparPorDia` y `RenglonEvento`, así que dejando los dos como estaban, su pieza no hay que revisarla cuando entre.

## Qué se construyó (tres partes, un PR)

**1 · La pestaña se pinta por cuándo se publicó.** `agruparPorPublicacion` es nueva y vive al lado de `agruparPorDia`, que no se toca. Tres grupos: «Lo más nuevo» (sin fecha), «Publicado ayer» y «Esta semana»; con el tope de 7 días no puede haber un cuarto (el «Hace más» de `/novedades` no aplica aquí). Lo publicado a la vez va en orden de agenda, para que dos cargas no lo traigan distinto (bitácora 062).

**2 · El corte es la última visita, con tope de 7 días.** `corteNuevos` lo calcula; `src/lib/nuevosVisto.ts` guarda la marca en el teléfono con el patrón de `VistoHoy` (clave propia, cada acceso entre `try`/`catch`): sin migración, sirve sin cuenta y no guarda nada nuevo sobre nadie. No se reutilizó `novedades_vistas_en`, que es otra cosa. La marca **avanza solo al mirar Nuevos**, después de leer la anterior, y el corte **viaja en la memoria de pantalla**: releerlo al volver de una ficha habría dado una lista vacía, rompiendo la decisión 17 de 02.

**3 · El vacío dice su causa e invita a publicar**, con los textos del founder («Ya estás al día.» / «Nada nuevo esta semana.», las dos con «¿Sabes de un evento? Publícalo.»). Sin cuenta lleva a `/entrar?siguiente=/eventos/nuevo`, el patrón de `ListaLugares`, que ahorra el salto intermedio.

El día del evento en el renglón es la prop opcional `conDia`, que solo pide Nuevos y solo sin día elegido ni búsqueda (con cualquiera de las dos, la lista vuelve a ir por día del evento y el encabezado ya lo dice). `esNuevo` se quitó: con el corte quedaba inerte, y solo la usaba su propia prueba.

## Evidencia

- **Lint** 0 errores (1 aviso previo en otro archivo), **tipos** limpios, **build** en verde y **361 pruebas** en 38 archivos (antes 344 en 37): 17 nuevas.
- **La prueba que faltaba detecta el defecto:** con la llamada a `agruparPorDia` en vez de `agruparPorPublicacion`, «pone arriba lo último publicado» **falla**; restaurada, pasa. Comprobado cambiando solo esa línea, con respaldo, y confirmado idéntico después.
- **El umbral, con sus cuatro casos** (sin marca, marca de ayer, marca de hace un mes, marca en el futuro por un reloj mal puesto) y **el contrato del que depende la pantalla**: el corte nunca es inválido, ni null, ni posterior a ahora, ni anterior al tope — con almacén vacío, roto, en modo privado (lanza) o inexistente. Por eso no puede salir un «Ya estás al día» falso ni la lista dar un salto al encogerse.
- **Mirado a 390×844** con `next dev` de la rama y datos inventados, sin producción (el `preview_start` del entorno arranca en el árbol principal, así que el servidor se levantó en el worktree, en otro puerto):
  - **Nuevos:** «Lo más nuevo · 2» con el taller publicado hace una hora **primero**, y su renglón diciendo «jue 8 de oct · 18:00»; debajo «Publicado ayer» y «Esta semana · 3». Antes, ese mismo evento salía quinto de seis.
  - **El vacío:** «Ya estás al día.» con «¿Sabes de un evento? Publícalo.» y el botón, en la segunda visita.
  - **Todos:** sin cambios — grupos por día del evento, icono de reloj y solo la hora, sin día en el renglón. Eso confirma que `RenglonEvento` por defecto no cambió, y con él las fichas de lugar y de artista.
  - La marca se escribe al tocar la pestaña, y el corte de la primera visita fue **7.00 días exactos** (el tope), no la marca.
- Chrome sin ventana no sirvió para dejar las capturas en archivo: no hidrata, y capturaba la pestaña Todos con el ancho cortado. Se descartó; las capturas válidas son las del navegador a 390×844.

## Lo que queda

1. **Una decisión del founder:** el botón del vacío repite el flotante «Publicar evento», que `Publicar.tsx` define como «la única acción de las pantallas raíz». Quedan dos botones iguales en la misma pantalla. Se construyó con el botón, que es lo que él aprobó al elegir el texto; quitarlo es una línea. Corregido en el documento 23, donde yo había dicho que convivían como «Usar mi ubicación» y «Entrar» — no es el mismo caso: esos hacen algo distinto del flotante.
2. Traer `main` antes del PR y, si la pieza B de deslizar ya entró, comprobar con capturas que las fichas de lugar y de artista siguen igual.
3. `next dev` añade solo un bloque `nextjs-agent-rules` a `CLAUDE.md`. Se revirtió en este árbol; le pasa a cualquier chat que arranque el servidor.
