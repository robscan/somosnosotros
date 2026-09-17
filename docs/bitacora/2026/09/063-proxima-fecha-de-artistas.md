# 063 · La próxima fecha de cada artista ya no depende del orden en que llegan las filas

**Fecha:** 2026-09-16 (noche) · **Rama:** `proxima-fecha-artistas` ([PR #67](https://github.com/robscan/somosnosotros/pull/67)) · **Pieza:** OL-038, lo que quedó aparte en la bitácora [062](062-orden-estable-a-la-misma-hora.md) ([PR #66](https://github.com/robscan/somosnosotros/pull/66)).

## El hallazgo
En la lista de Artistas, quien tiene fechas muestra "Próximo: …" con la más cercana, y esos artistas van primero, ordenados por esa fecha. La página tomaba la primera fila que le llegaba de cada artista, con la idea de que llegaban por hora. Nada lo garantizaba:
- un artista con dos fechas podía mostrar la que no es la más próxima y quedar mal colocado en la lista;
- el corte de 500 filas no se quedaba con las fechas más próximas.

Hoy no se ve en producción: ningún artista tiene fechas ligadas. La tabla que liga eventos y artistas tiene 0 filas, medido con la llave pública; su lectura es pública, así que es el total real.

## Por qué pasaba
- La consulta pide las filas de `eventos_artistas` (qué artista va a qué evento), cada una con su evento dentro. El orden se pedía con `order("inicio", { referencedTable: "eventos" })`, que viaja como `eventos.order=inicio.asc`. Eso ordena lo que va **dentro** de cada fila (su único evento), no las filas.
- La documentación de PostgREST lo dice en "Embedded Filters": ese orden acomoda lo embebido y no cambia el orden de las filas. La base lo confirma (solo lectura): al pedir ese orden con una columna que no existe, el error nombra la tabla de dentro (`eventos_1`); con `order=evento(…)`, nombra la de las filas (`eventos_artistas_evento_1`).
- Sin un orden de filas, Postgres las entrega como le resulte. El comentario "vienen ordenadas por inicio" no tenía quién lo cumpliera.
- La clave iba como `eventos.order` y el alias del evento en la consulta es `evento`. PostgREST acepta los dos nombres para ese parámetro: no daba error, pero tampoco ordenaba las filas.

## Qué se hizo
- **La fecha se elige en el servidor de Next, con el criterio de la agenda.** `conProximaFecha` (`src/lib/artistas.ts`) ya existía, pero solo la usaban las pruebas y ordenaba solo por hora. Ahora:
  - ordena con `compararEventos` de la bitácora 062: hora; a la misma hora, título; luego id;
  - se queda con la primera fecha de cada artista;
  - la página la usa en lugar de su propio recorrido, así que el resultado ya no depende del orden de llegada.
- **La base entrega las filas en orden de verdad:** `order=evento(inicio),evento(titulo),evento(id),artista_id`. PostgREST permite ordenar las filas por una columna del registro ligado cuando es uno solo por fila, como aquí el evento. Así el corte de 500 se queda con las fechas más próximas, y siempre con las mismas.
- **Lo que decidió la forma de la consulta** (probado en producción, solo lectura):
  - la consulta nueva responde bien;
  - con el nombre de la tabla (`eventos(inicio)`) en vez del alias responde error, por eso va `evento(…)`;
  - PostgREST solo ordena por columnas que estén en el select: sin `titulo` responde error. Por eso la consulta trae `titulo`, y el código lo dice en un comentario.
- **Revisado, sin cambios:**
  - la ficha de artista pide los eventos como filas, con orden real desde la 062;
  - `personas/consultas.ts` usa `referencedTable` solo para filtrar y ordena en el servidor;
  - no queda otro `order` con `referencedTable` en el código.

## Lo que se ve distinto
Nada, mientras no haya fechas ligadas. Cuando las haya, cada artista muestra su fecha más próxima; si tiene dos a la misma hora, la del título que va antes en orden alfabético.

## Evidencia
- **Prueba nueva en `artistas.test.ts`.** Llegan cinco fechas en desorden: la Orquesta con dos (la más lejana primero), el Mariachi con dos a la misma hora, el Coro con una; además, un artista sin fechas. En los dos órdenes de llegada salen las mismas fechas, y la lista queda Mariachi, Orquesta, Coro, el que no tiene fechas. Con el `conProximaFecha` anterior la prueba falla: el Mariachi se queda con la fecha que llega primero.
- **lint, typecheck, 181 pruebas y build en verde.** El build corrió sin variables de entorno, como en CI.
- **Captura móvil 390×844 de /artistas.** Como producción no tiene fechas ligadas, se probó con `next dev` y datos locales, sin escribir en producción. Se usó un intermediario de prueba en la Mac, entre la app y Supabase:
  - reenvía a producción solo lecturas y bloquea lo demás (bloqueó, por ejemplo, un conteo de la agenda que usa POST);
  - a la consulta de fechas responde con cinco enlaces inventados entre artistas y eventos reales y próximos;
  - los entrega en desorden, pida el orden que pida la app.
- **Antes (código del PR #66), en el orden de llegada normal:**
  - Mariachi Femenil Voces de México: "mañana · 19:00 · Patio del Edificio Central de la UASLP";
  - Coro Vuela Alto: "vie 18 de sep · 17:30 · Centro de las Artes… (CEART)";
  - Orquesta de Cámara Sofía Cancino, tercera: "vie 25 de sep · 20:00 · Teatro de la Paz", aunque tenía fecha mañana a las 20:00.
- **Antes, con las mismas filas en orden inverso:** la Orquesta salía con mañana a las 20:00 y el Mariachi en Teatro de la Paz. El resultado dependía del orden de llegada.
- **Después, en los dos órdenes:**
  - Mariachi: "mañana · 19:00 · Teatro de la Paz";
  - Orquesta, segunda: "mañana · 20:00 · Parroquia de San Sebastián";
  - Coro, tercero, con la misma fecha.
  - El resto de la pantalla, igual.
- **La consulta que salió de la app, registrada por el intermediario:** `order=evento(inicio).asc,evento(titulo).asc,evento(id).asc,artista_id.asc`, con `titulo` dentro del evento.
- **Una sola carga salió con error**, `proxima is not defined`, mientras el servidor recargaba entre dos ediciones del mismo archivo. Después de la última compilación, todas las cargas respondieron bien, sin errores.

## Queda
- **Orden de mezcla:** esta rama sale encima del PR #66, porque usa `compararEventos`. Se mezcla después del #66; hasta entonces, su PR muestra también los cambios del #66.
- **`main` local:** la rama sale de lo publicado del #66 (`origin/orden-estable-agenda`). A pedido del encargado de gestión de cambios, `main` local (bitácoras 057 a 059 y 061) ya está traído a la rama. OPEN_LOOPS quedó con OL-038, OL-037 y OL-036, resuelto como en la rama del #66, y lint, typecheck, 181 pruebas y build siguieron en verde. Está solo en commits locales: subirlos publicaría los tres commits de `main` que el founder aún no publica. Se suben cuando `main` esté en GitHub.
