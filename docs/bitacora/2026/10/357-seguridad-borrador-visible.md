# 357 · Un borrador de programa nunca es visible y la administración manda sobre lo oculto

**Pieza:** OL-328 (arreglo de seguridad P1 hallado por la revisión de Codex, OL-327). **Rama:** `seguridad-borrador-visible` (sobre `origin/main` `06b51c59`). **Fecha:** 2026-10-07. **Operador:** Claude Opus 5.5 (agente del gestor IV).
**Estado:** hecho y probado en un PostgreSQL 17 local con las 87 migraciones y con la app compilada contra el respaldo local; falta que el gestor aplique la migración y el «publica» del founder. **Migración que solo añade:** `20261007130000_borrador_nunca_visible.sql` (la aplica el gestor antes de unir).

## Qué se halló

Codex (OL-327, 2026-10-07 08:21) lo reprodujo en PostgreSQL 17 con las 86 migraciones (`.buzon/tmp-codex/pg-casos.mjs` y `pg-casos.log`, casos `moderacion_borrador` y `moderacion_borrador_visible_directo`). En la migración de OL-321 (`20261006160000_eventos_clase.sql`):

- `publicar_borrador_de_programa` es SECURITY DEFINER (corre como dueña de la tabla) y ponía `visible = true, borrador = false` con solo mirar que fuera borrador y que el autor coincidiera.
- Nada impedía insertar un acto propio con `visible = true, borrador = true`: la restricción `eventos_borrador_con_padre` y el disparador `eventos_clase_coherente` solo vigilan el paso a borrador en un UPDATE.

**Reproducción:** una cuenta normal inserta un acto de su festival con `visible = true, borrador = true` → la administración lo oculta (`visible = false`) → la autora llama la función → queda `visible = true, borrador = false` y anon vuelve a verlo. La protección de siempre (`proteger_autor_y_visible`, 2026-09-17: quien no administra no vuelve a mostrar lo oculto) no la frena porque dentro de una función SECURITY DEFINER el usuario ya no es `authenticated`. Pasa también con un borrador legítimo: ya está oculto, la administración lo «oculta» (no cambia nada) y su autor lo publica después.

En producción hoy hay 0 borradores y 0 festivales (consulta del gestor): nadie lo aprovechó y la restricción nueva no choca con filas.

## El arreglo

Migración `20261007130000_borrador_nunca_visible.sql`, que solo añade:

1. **Un borrador nunca es visible:** `eventos_borrador_oculto check (not borrador or not visible)`. Antes, un `update ... set visible = false where borrador and visible` por si acaso (idempotente; hoy no toca ninguna fila).
2. **`eventos.retirado_por_admin`** (boolean, false de siempre) y el disparador `eventos_retirado_por_admin` (antes de un UPDATE que nombra `visible` o `retirado_por_admin`; security invoker, como `proteger_autor_y_visible`, y sin permiso de ejecución para las cuentas):
   - La administración oculta (`visible = false`, aunque ya estuviera oculto, como un borrador) → `retirado_por_admin = true`.
   - La administración vuelve a mostrar → `retirado_por_admin = false` y `borrador = false` (si no, chocaría con la restricción: mostrar un borrador es publicarlo).
   - Si la administración pone o quita la marca a mano, vale lo que puso.
   - Quien no administra no cambia la marca (42501). Ocultar y mostrar ya se lo impedía `proteger_autor_y_visible`.
   - Lo que hace la propia base (funciones SECURITY DEFINER, la llave de servicio, migraciones) no pasa por la marca, igual que la protección de siempre.
3. **`publicar_borrador_de_programa`**, `create or replace` con la misma firma (reemplazar una función es código, no datos): bloquea la fila y exige sesión, que sea del autor, `borrador`, `not visible` y `not retirado_por_admin`. Errores: `sin_permiso` (sin sesión, no existe o no es suyo, sin decir cuál) y `no_publicable` (es suyo pero no es un borrador oculto o la administración lo retiró), los dos con errcode 42501. `set search_path = ''`.
4. **`publicar_programa` no cambia** (verificado): los desmarcados se insertan y en la misma transacción `programa_ocultar_borrador` los deja `visible = false, borrador = true` en un solo UPDATE (cumple la restricción); los marcados quedan `visible = true, borrador = false`.

**La app** (nada más de interfaz):

- `src/app/eventos/acciones.ts` · `publicarBorrador`: si la base contesta `no_publicable`, vuelve a la ficha del festival con `?error=no_publicable`.
- `src/app/eventos/[id]/page.tsx`: los actos del festival traen `retirado_por_admin`; un borrador retirado no enseña «Publicar» y su renglón dice «retirado por la administración» en vez de «borrador»; con `?error=no_publicable`, el aviso «La administración retiró esta actividad.» arriba, con los demás avisos.
- Respaldo local (`scripts/ops/auditoria-ui/respaldo-local/fixture.mjs`): los eventos traen `retirado_por_admin: false`.

## Pruebas

- **Base** (`supabase/tests/pg/borrador-nunca-visible.test.mjs`, 30 comprobaciones): insertar visible y borrador falla (23514); ni la administración deja un borrador visible; el caso de Codex con un borrador legítimo (la administración lo oculta → retirado → la autora recibe `no_publicable` y anon no lo ve); el caso «visible directo» ya sin la marca (no vuelve a borrador, ni por `programa_ocultar_borrador`, ni por la función, ni por UPDATE); la autora no pone ni quita la marca; un borrador normal se publica y anon lo ve, otra cuenta y un id inexistente reciben `sin_permiso`, anon no ejecuta; la administración vuelve a mostrar un borrador retirado y un acto oculto; la marca a mano; `publicar_programa` sigue igual; ningún borrador visible en toda la base al final.
- **Control negativo:** con la migración sin el punto 3 (la función de antes), 4 comprobaciones fallan, entre ellas «la autora no publica un borrador que la administración retiró» y «anon no lo ve»: la prueba atrapa el hueco.
- `npm run test:db`: 87 migraciones, **1779 comprobaciones, 0 fallos** (antes 1749). Las de OL-321 (`eventos-clase.test.mjs`) siguen en verde: «ni se vuelve a mostrar como borrador» ahora recibe `no_publicable`, con el mismo 42501.
- `npm test`: 170 archivos, **2981 pruebas**; tres nuevas de `publicarBorrador` en `clase.acciones.test.ts` (publicado vuelve a la ficha; `no_publicable` vuelve con el aviso; otro rechazo vuelve sin aviso).
- `npm run lint` (sin errores; el aviso de `VisorImagen.componentes.test.mjs` ya estaba), `npm run typecheck`, `npm run inventario` y `npm run medir` (35 pantallas × 4 anchos) sin novedades: `s25-ficha-festival` tiene los mismos nodos.
- **Capturas** a 390×844 (`docs/rediseno/capturas-357/`, app compilada contra el respaldo local con la sesión de Ana, autora del festival; para la 02 y la 03 el borrador del respaldo se marcó retirado solo durante la captura):
  - `01-borrador-con-publicar.png`: el programa con «Función de clausura · borrador» y «Publicar», como antes.
  - `02-borrador-retirado-sin-publicar.png`: el mismo renglón dice «retirado por la administración» y no hay «Publicar».
  - `03-error-no-publicable-aviso.png`: arriba de la ficha, en rojo, «La administración retiró esta actividad.» sobre el aviso de siempre del festival oculto del respaldo.

## Decisiones del operador

- **La función sigue SECURITY DEFINER**, porque es imprescindible: el autor no puede cambiar `visible` por sí mismo (`proteger_autor_y_visible` se lo impide a quien no administra, y debe seguir así) y esta es la única puerta. Con SECURITY INVOKER habría que abrir esa protección para los borradores, que es más superficie. A cambio, la función comprueba todo con la fila bloqueada.
- **Dos errores en vez de uno:** `sin_permiso` si no es suyo (o no existe) y `no_publicable` si es suyo pero no se puede publicar. Con un solo `no_publicable`, la administración (que ve el botón en los borradores ajenos) leería «La administración retiró esta actividad» por un borrador que no es suyo.
- **La marca se pone cuando el UPDATE nombra `visible` con false**, aunque el valor no cambie (así se cubre el borrador legítimo, que ya estaba oculto). Los formularios de editar no mandan `visible`; solo lo mandan «Ocultar» de la ficha y el panel de reportes, los dos de la administración.
- **Volver a mostrar un borrador lo publica** (deja de ser borrador): es lo único compatible con la restricción.
- **Sin rellenar la marca en filas viejas:** los eventos que la administración ocultó antes no son borradores y nadie más que ella puede volverlos borrador, así que la función ya los rechaza.
- **El renglón del borrador retirado dice «retirado por la administración»** en vez de «borrador»: sin el botón, si no, la autora no sabría por qué no puede publicarlo. Es el único texto nuevo además del aviso.

## Qué queda

- Que el gestor aplique `20261007130000_borrador_nunca_visible.sql` en Supabase antes de unir (la ficha del festival pide la columna) y el «publica» del founder.
- Fuera de esta pieza, anotado: cuando la administración vuelve a mostrar un acto de un festival, el periodo del festival no se recalcula (`cambiarVisibleEvento` no llama a `recalcular_festival`); tampoco al ocultarlo. Y un borrador de un festival que la administración ocultó (el marco, no el acto) se sigue pudiendo publicar: es un acto aparte, como cualquier alta nueva. Si el founder quiere que ocultar un festival retire también sus borradores, es otra pieza.
