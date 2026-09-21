# 143 · Fichas por completar (D2, OL-108)

**Fecha:** 2026-09-21 · **Rama:** `fichas-por-completar` (base `origin/main` `841d4ca`) · **Pieza:** OL-108 (D2 de `docs/ops/COLA_DE_PIEZAS.md`, L48 del anexo) · **Modelo:** Sonnet 5, esfuerzo medio · **Solo documento**, sin código de la app ni cambios de datos.

## Qué pidió el founder (L48)

> «Crear tarea de investigación, para identificar cuáles artistas o lugares fueron creados y no tienen ficha y cuáles han estado activos recientemente. La investigación será para completar esa ficha buscando datos en internet. Presentar las propuestas de ficha y foto antes de publicar.»

## Cómo se trabajó

1. Aviso de arranque al «Gestor de cambios II» por `SendMessage`, esperada su respuesta antes de tocar nada (cambió el modelo efectivo a Sonnet 5, esfuerzo medio).
2. Lectura de `CLAUDE.md`, `docs/ops/GESTION_DE_CAMBIOS.md`, `docs/ops/ASIGNACIONES.md` (fila OL-108), `docs/ops/COLA_DE_PIEZAS.md` (D2 y L48), `docs/DEFINICION.md`, y las bitácoras [028](028-importacion-capo.md) (importación CAPO) y [032](032-instituciones-y-agendas.md) (instituciones y agendas) para entender de dónde salieron los datos que hoy tiene la base.
3. Revisión del esquema real (`supabase/migrations/20260913120000_base.sql`, `20260914050000_artistas.sql`, `20260916120000_lugares_cuentas.sql`) para definir «ficha completa» con columnas que existen de verdad, no con supuestos.
4. Antes de conectar a producción: SQL exacto mandado al gestor por `SendMessage`, con el método (guion `.mjs`, `pg`, `begin…set transaction read only…rollback`, cadena de `.env` leída dentro del proceso y nunca impresa). El gestor lo revisó contra las migraciones y dio el sí con dos ajustes:
   - `eventos.termina >= now()` en vez de `sin_pasar()` (la regla vieja de la zona horaria de Ciudad de México; la app ya usa `termina`, que va con la zona de cada evento).
   - `artistas.ciudad`/`lugares.ciudad` y `lugares.lat`/`lng` son obligatorias con valor por omisión: no cuentan como hueco real. Se midió aparte cuántas tienen una ciudad *distinta* del valor por omisión (0 hoy), para el día en que el directorio crezca a otras ciudades.
5. Guion corrido una sola vez, el 2026-09-21, desde el worktree `dreamy-pascal-3c3407` (tiene `pg` instalado; no se instaló nada nuevo). El archivo se copió ahí, se corrió, y se borró de inmediato — `git status` de ese worktree quedó limpio, comprobado. Resultado escrito a `resultado-fichas.json` en el scratchpad de esta sesión (nunca en el repo): incluye los `uuid` de cada ficha, que no van al repo público por ser datos internos aunque las fichas en sí sean públicas.
6. Con los números medidos, se completó `docs/rediseno/32-fichas-por-completar.md`: definición de ficha completa/activa, la medición, el orden de prioridad, la propuesta de cómo completar sin capturistas, y una muestra de 10 fichas (5 artistas, 5 lugares) con propuesta de texto.
7. Para la muestra, se buscó cada nombre en internet (una decena de búsquedas, dentro del cupo de la sesión). La mayoría de los artistas activos e incompletos resultaron ser actos locales pequeños sin presencia pública indexable — eso es parte del hallazgo: para ellos el sistema no tendrá de dónde proponer casi nada y hay que pedírselo directo a quien gestiona la ficha o al organizador del evento donde tocan. Un caso (La Lupita Fullband) se descartó a propósito: la única coincidencia encontrada es una banda nacional distinta, y no hay forma confiable de confirmar que sea el mismo acto — no se le atribuyó esa identidad.

## Resultado de la medición (producción, 2026-09-21)

| | Artistas visibles (538) | Lugares visibles (58) |
| --- | --- | --- |
| Con foto | 315 (59 %) | 46 (79 %) |
| Con descripción | 527 (98 %) | 56 (97 %) |
| Con disciplina/tipo | 528 (98 %) | 58 (100 %) |
| Con contacto/enlace | 528 (98 %) | 57 (98 %) |
| Con dirección escrita | — | 58 (100 %) |

La foto es, con mucho, el único hueco grande: el resto de los campos ya está casi completo en toda la base, porque las importaciones del CAPO y de instituciones los llenaron al dar de alta; la foto quedó fuera a propósito por derechos de autor (bitácoras 028 y 032).

**Activas e incompletas:** 14 artistas (9 son fichas creadas al vuelo desde el alta de un evento, vacías salvo el nombre) y 8 lugares (6 solo sin foto, 2 también sin descripción). El detalle, con nombre y qué falta, está en el documento — los `uuid` quedan en el scratchpad de la sesión.

## Evidencia

- SQL corrido con el sí del gestor de cambios (mensaje del 2026-09-21), solo lectura dentro de `begin…set transaction read only…rollback`. Nunca se imprimió la cadena de conexión ni el `.env` real entró a esta carpeta.
- `docs/rediseno/32-fichas-por-completar.md`: definición, medición, orden de prioridad, propuesta de proceso sin capturistas y muestra de 10 fichas con texto y fuente cuando se encontró.
- Sin build/lint/tests: es documentación, no toca código (regla de pruebas focalizadas de `GESTION_DE_CAMBIOS.md` — documentación sola requiere revisar el diff, no build ni unitarias).
- Entrada propia en `docs/ops/OPEN_LOOPS.md` (OL-108) completada; trozo propio añadido al frente de «Last updated», sin tocar lo que ya había.

## Pendiente

- Visto bueno del founder sobre el tono de la muestra de 10 fichas y sobre el proceso propuesto (qué propone el sistema, qué confirma la persona) antes de construir nada.
- Si se aprueba, decidir dónde vive la propuesta (¿tabla nueva de "propuestas por ficha", o reutilizar el flujo de reportes/`es_mio`?) — no se diseñó a propósito: es la siguiente pieza, no esta.
