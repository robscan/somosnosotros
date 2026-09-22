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

## Pendiente (de la primera entrega, resuelto abajo)

- Visto bueno del founder sobre el tono de la muestra de 10 fichas y sobre el proceso propuesto (qué propone el sistema, qué confirma la persona) antes de construir nada.
- Si se aprueba, decidir dónde vive la propuesta (¿tabla nueva de "propuestas por ficha", o reutilizar el flujo de reportes/`es_mio`?) — no se diseñó a propósito: es la siguiente pieza, no esta.

## Ronda 2 — PR #132 unido, retoques de privacidad y grupos (2026-09-21)

**Rama:** `fichas-por-completar-2` (base `origin/main` tras unir #132, `4ed0133`). Misma pieza, mismo OL-108.

1. El gestor leyó la primera entrega entera y pidió dos retoques antes de aceptar (repo público): quitar de las listas con nombre la frase "tiene cuenta que lo/la gestiona" (dato de cuentas, no de la ficha) y quitar el nombre civil de Neto Medellín de la propuesta de texto. Hechos con `git commit --amend` (el commit no estaba subido, así que el dato no quedó en ningún historial público). El gestor comprobó `023f9dc`, subió la rama y abrió el [PR #132](https://github.com/robscan/somosnosotros/pull/132).
2. **El founder aprobó la regla y el tono** («me gusta propuesta de B… cuida no modificar fichas reclamadas») y el PR #132 se unió a `main` (`61679d7`).
3. **Regla nueva y dura, del founder:** una ficha reclamada o con cuenta que la gestiona (fila en `artistas_cuentas`/`lugares_cuentas`) no se toca nunca desde fuera — ni texto, ni disciplina, ni foto. Solo se le avisa a quien la gestiona. Escrita en la sección 5 del doc 32, sin nombrar qué fichas están en ese caso (siguen siendo dato de cuentas).
4. Con esa regla, se separaron las 14 + 8 fichas activas e incompletas en tres grupos (sección 7 del doc 32), cruzando `tiene_gestor` (ya medido en la primera ronda, no reutilizado para agrupar entonces) con la fuente pública encontrada:
   - **(a) Reclamada/gestionada** (3 artistas, 0 lugares): solo aviso, nunca se toca.
   - **(b) Sin gestionar, con fuente pública** (2 artistas, 5 lugares): de esos, solo 2 fichas (Canto Quetzal y Laboratorio Centro Histórico) tienen un hueco de *texto* real con fuente que lo sostiene — el resto del grupo (Neto Medellín y cuatro lugares) solo le falta la foto, con fuente de dónde pedirla.
   - **(c) Sin gestionar, sin rastro público** (9 artistas, 3 lugares): aviso a quien organizó el evento, o al administrador si no hay ese dato.
   - **Sin nueva lectura de producción**: el reparto sale de cruzar datos ya medidos. Se completó la investigación en internet de los 8 artistas y el lugar que faltaban por buscar en la primera ronda (Acorde On, Canto Quetzal, Dais Qrohc, Fly Marina, Gordo Ang, Katana Lírica, Gerardo Canela, Laboratorio Centro Histórico); una mención (Katana Lírica) fue demasiado vaga para sostener un texto y se descartó, igual que La Lupita Fullband en la primera ronda.
5. **Texto exacto, campo por campo, con fuente**, para las dos fichas del grupo (b) con hueco de texto (sección 7.1 del doc): descripción, disciplina/tipo, detalle y redes, dentro de los topes (600/40 caracteres, contados). Listo para copiar y pegar (sección 7.3).
6. **Revisión del código de avisos** (solo lectura, sin tocar nada) antes de proponer un canal: hoy no existe ningún aviso dentro de la app ni para quien gestiona una ficha ni para el autor de un evento sobre su propia ficha o evento — el motor de avisos ya construido (`avisos_fiables.sql`) los excluye a propósito (`avisos_destinatarios`: `where p.id is distinct from j.actor and p.id is distinct from e.creado_por`); son las piezas **B3**/**B4** de la cola, pendientes. Se propuso el texto del aviso y, aparte, la pieza mínima para cuando le toque su turno — sin construirla aquí.

## Evidencia (ronda 2)

- Sin lectura de producción nueva: cero conexiones a la base en esta ronda.
- Código de avisos revisado por lectura (`supabase/migrations/20260918140000_avisos_fiables.sql`, `src/app/api/avisos-pendientes/route.ts`, `src/lib/avisosWorker.ts`) para no proponer un canal que no existe.
- Investigación en internet: 8 búsquedas más (Acorde On, Canto Quetzal, Dais Qrohc, Fly Marina, Gordo Ang, Katana Lírica, Gerardo Canela, Laboratorio Centro Histórico).
- `docs/rediseno/32-fichas-por-completar.md`: sección 5 con la regla de fichas reclamadas, sección 7 con los tres grupos, el texto campo por campo y cómo se aplicaría a mano.
- Sin build/lint/tests: documentación, no toca código.

## Pendiente

- Visto bueno del founder sobre el texto exacto del grupo (b) antes de que alguien lo copie a Administración.
- Las piezas B3/B4 (avisos al gestor de una ficha y al autor de un evento) siguen sin construir; esta pieza solo dejó el texto propuesto para cuando les toque.
