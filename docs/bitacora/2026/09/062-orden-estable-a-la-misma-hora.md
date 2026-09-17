# 062 · Los eventos a la misma hora ya no cambian de orden entre cargas

**Fecha:** 2026-09-16 (noche) · **Rama:** `orden-estable-agenda` ([PR #66](https://github.com/robscan/somosnosotros/pull/66)) · **Pieza:** OL-037, hallazgo anotado al verificar la ✕ como icono (bitácora 060, [PR #65](https://github.com/robscan/somosnosotros/pull/65)).

## Qué vio el founder
En el simulador del iPhone, con la agenda en el jueves 17, los eventos de las 19:00 salieron en distinto orden entre dos cargas de la misma pantalla: primero "Demostración folclórica…" y en la siguiente "Lectura del Taller de Creación Literaria…".

## Por qué pasaba
- La agenda pide los eventos a la base ordenados solo por hora (`order("inicio")`). Entre eventos que empiezan a la misma hora, Postgres no promete ningún orden: los entrega como los tenga guardados, y eso cambia cuando se edita una fila o cuando la base elige otro camino para responder.
- La pantalla no volvía a ordenar esos empates. `agruparPorDia` ordena por hora y, entre iguales, respeta el orden en que llegan; con un día elegido, la lista se pinta tal como sale del filtro.
- Choca con la memoria de pantalla: al volver de una ficha se repone el scroll, pero si la lista llegó en otro orden la persona cae en otro evento.
- Medido en producción (solo lectura, con la llave pública): de 85 eventos próximos, 31 comparten hora con otro, en 13 horas distintas. El jueves 17 a las 19:00 son cuatro. En seis cargas seguidas la base repitió su orden porque nada se movió entre ellas, pero ese orden no está garantizado ni sigue un criterio que la persona pueda ver.

## Qué se hizo
- **Un criterio: `compararEventos`** (`src/lib/agenda.ts`). Por hora; a la misma hora, por título en orden alfabético, el mismo de Lugares y Artistas (sin acentos, mayúsculas ni signos); si el título también coincide, por id.
- **Agenda de inicio.** `agruparPorDia` y `filtrarAgenda` lo usan. `filtrarAgenda` ahora ordena siempre, así que el orden no depende de cómo llegue de la base, tampoco con un día elegido. Cercanos (por distancia) y Nuevos (lo más reciente primero) dejan sus empates en ese mismo orden.
- **Consultas** de la agenda, la ficha de lugar y la ficha de artista: `order("inicio").order("titulo").order("id")`. Así el corte (300 eventos en la agenda, 30 en cada ficha) es siempre el mismo. En pantalla manda `compararEventos`, porque la base ordena los títulos con otra regla (por ejemplo, pone las letras griegas al final).
- **Novedades.** Los "Hoy vas" del día llevan todos la misma fecha y salían en el orden que diera la base. Ahora lo que pasó a la vez va por la hora del evento, luego por título y al final por su clave; `Novedad` suma `inicio`.
- **Revisado, sin cambios:**
  - Fichas de lugar y de artista: su lista pasa por `agruparPorDia`. La línea "Próximo" del lugar solo muestra la hora; la del artista toma la primera fecha de la consulta, ya desempatada.
  - Mi perfil y la ficha de otra persona: sus listas pasan por `agruparPorDia`.
  - Lista de Lugares: del próximo evento solo se ve la hora; un empate no cambia nada en pantalla.

## Lo que se ve distinto
Los eventos de una misma hora van en orden alfabético. «ΚΟΣΜΟΣ: Camerata de San Luis…» queda en la C, porque el orden alfabético de la app se salta los signos y las letras que no son latinas, como en Lugares y Artistas. Si se prefiere otro criterio para estos casos, se cambia en un solo sitio.

## Evidencia
- Dos pruebas nuevas; con el código anterior las dos fallan (el orden seguía al de llegada) y con el arreglo pasan:
  - `agenda.test.ts`: cuatro eventos a las 19:00, dos con el mismo título, que llegan en dos órdenes; salen igual en la agenda por días y en las cuatro pestañas con el día elegido.
  - `novedades.test.ts`: tres "Hoy vas" que llegan en dos órdenes.
- lint, typecheck, 180 pruebas y build en verde.
- Captura móvil 390×844 (@3x) en Chrome, antes (producción) y después (la rama en `next dev` con los datos de producción), en el mismo estado: jueves 17 elegido. Cada captura se miró entera.
  - Antes, a las 19:00: Lectura, Demostración, Mariachi, ΚΟΣΜΟΣ.
  - Después: ΚΟΣΜΟΣ, Demostración, Lectura, Mariachi. Nada más cambia en la pantalla.
- Cinco cargas nuevas de la agenda servida por la rama: el mismo orden las cinco veces.
- Las fichas de lugar (Museo Laberinto, 11 eventos; Teatro del IMSS, 12) cargan con su lista y sin errores. La consulta de la ficha de artista con el desempate responde sin error.
- Novedades no se vio en pantalla: hace falta una cuenta con dos "Voy" el mismo día. Lo cubre la prueba.

## Queda
- **Lista de Artistas.** La "Próxima" fecha de cada artista es la primera fila de su consulta, y esa consulta pide el orden por hora a los eventos ligados (`referencedTable`), no a las filas. Con `!inner` suele salir en ese orden, pero la base no lo garantiza: con dos fechas podría mostrar una que no es la más próxima. Hoy no se ve (ningún artista tiene fechas ligadas). Va como tarea aparte.
- **Subir el merge de `main`.** `main` local (bitácoras 057 a 059 y 061, reglas de gestión de cambios) ya está traído a la rama y OPEN_LOOPS quedó con las dos entradas, en commits locales. No se subieron: harían públicos los commits de `main` antes de que el founder lo publique. Se suben cuando `main` esté en GitHub.
