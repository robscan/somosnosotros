# 313 · Una novedad posterior al «quitado» lo levanta

**Pieza:** OL-285. **Rama:** `novedad-levanta-quitado` sobre `origin/main` `d85ac73a`. **Fecha:** 2026-10-05.
**Estado:** candidato para revisión del gestor; migración sin aplicar a ninguna base remota; sin PR ni publicación.

## La regla en llano

Regla aprobada por el founder el 2026-10-04. Si la administración quita a un artista de destacados y después ese
artista publica una novedad, la novedad lo vuelve a poner en el carril «Artistas destacadxs» de Inicio. El quitado solo
sigue vetando mientras sea posterior o igual a la novedad vigente más reciente (menos de 168 horas). Si la
administración lo vuelve a quitar después de esa novedad, el veto regresa.

## Cómo se fecha el quitado (comprobado antes de escribir SQL)

- `public.destacados` (`20260917140000_destacados.sql`) tiene `creado_en timestamptz not null default now()` y no
  tiene `actualizado_en`. Hay un solo renglón por artista (índice único `destacados_artista_unico`).
- `public.cambiar_destacado` no actualiza: borra el renglón de la ficha e inserta uno nuevo. Cita de la migración:
  `delete from public.destacados where ... = p_id;` seguido de
  `insert into public.destacados (..., quitado, hasta, creado_en) values (..., p_estado = 'quitado', ..., coalesce(p_creado_en, now()))`.
- Quitar desde la pantalla (`DestacarFicha.tsx`) llama con `creado: null`, así que el renglón «quitado» queda con
  `creado_en = now()` del momento exacto del quitado. Esa fecha es fiable.
- Deshacer (`p_creado_en` explícito, no futuro, validado en la base y en `fechasValidas`) repone la fecha del renglón
  anterior, no una nueva: deshacer un quitado antiguo conserva su fecha antigua, coherente con la regla.
- Limitación conocida: solo la administración puede llamar a `cambiar_destacado` y puede pasar un `p_creado_en` pasado a
  propósito; no es un riesgo de seguridad (es admin), pero es la única vía por la que la fecha no sería «ahora».

Conclusión: la fecha es fiable, no hizo falta añadir columnas.

## Cambio (único cambio de comportamiento)

Migración `supabase/migrations/20261005140000_novedad_levanta_quitado.sql`: `create or replace function
public.artistas_destacados_novedades(p_ciudad text)`, misma firma y columnas, `security definer`,
`search_path = ''`, mismos `revoke`/`grant`, comentario actualizado. Diff respecto de la versión de OL-275 (todo lo
demás idéntico: orden, tope 12, foto obligatoria, bloqueos, elegidos, asistentes):

```diff
-      and not exists (select 1 from public.destacados d
-        where d.artista_id = a.id and d.quitado and d.hasta > now())
+      -- Veto editorial: solo si el quitado vigente es posterior o igual a la novedad vigente más reciente.
+      and not exists (select 1 from public.destacados d
+        where d.artista_id = a.id and d.quitado and d.hasta > now() and d.creado_en >= n.creado_en)
```

`n` es la fila de `ultimas` (`novedades_recientes_artistas`): una sola novedad por artista, la visible, no bloqueada y
vigente más reciente, así que «la novedad vigente más reciente» ya viene resuelta. Una novedad oculta, borrada o de más
de 168 horas no cuenta.

## `tira_destacados` y coherencia

`tira_destacados` no necesitó cambios. Une `destacados` por artista con `hasta > now()` y deja pasar solo
`quitado is false` o `quitado is null and van >= 3`; un quitado vigente nunca entra por asistentes. Por tanto, un
artista quitado con asistentes y novedad posterior no aparece en `tira` (ni como elegido ni como asistente) y sale una
sola vez desde el grupo de novedades. Un artista quitado con asistentes y sin novedad posterior no sale (probado). El
grupo de asistentes ya excluía a quien tuviera una novedad vigente, sin cambios. No hay duplicados: cada grupo sale de
una fuente disjunta y las pruebas lo comprueban. `src/` no se tocó.

## Pruebas

Archivo nuevo `supabase/tests/pg/novedad-levanta-quitado.test.mjs` (datos sintéticos en transacción con rollback; 56
comprobaciones por rol en anon, authenticated, authenticated admin y service_role más 6 sueltas = 62):
quitado vigente sin novedad posterior no sale; novedad posterior al quitado sale por novedad; novedad anterior no sale;
novedad y quitado en el mismo instante no sale (`>=`); quitado vencido sale como hoy; novedad posterior ya de 168 horas
exactas no sale; elegido sigue en su grupo con su sello; quitado con asistentes y novedad posterior sale una vez; quitado
con asistentes sin novedad no sale; dos novedades (cuenta la más reciente); novedad oculta no levanta; control sin quitado;
sin duplicados, orden y columnas; `cambiar_destacado` fecha con `now()` y vuelve a vetar; deshacer con `p_creado_en`
repone la fecha y la novedad levanta de nuevo; artista vetado con novedad nueva vuelve una sola vez; tope de 12 con 19
quitados levantados más elegido; definer estable, `search_path` vacío y sin `EXECUTE` a `public`.

Resultados, en un clúster PostgreSQL 17 local desechable (el del puerto 5432 estaba ocupado por otro chat y los roles de
prueba son del clúster):

- `npm run test:db`: 78 migraciones, 1531 pruebas, 0 fallaron (62 nuevas; 1469 las demás).
- Control negativo: sin la migración (función de OL-275), 77 migraciones y 15 de mis comprobaciones fallan.
- `npm run lint`: 0 errores, 1 advertencia ya existente (`VisorImagen.componentes.test.mjs`, `page` sin usar).
- `npm run typecheck`: correcto.

## Límites y riesgos

- La migración no se aplicó a ninguna base remota. Solo reemplaza una función de lectura; reversible reaplicando la
  definición de OL-275.
- Dos novedades distintas en `creado_en` idéntico al quitado se resuelven a favor del quitado (`>=`).
- Un quitado hecho por la administración justo después de una novedad (mismo segundo) la veta, como se espera.
- Al deshacer un quitado antiguo después de una novedad nueva, el artista vuelve por novedad (consecuencia coherente de
  que Deshacer repone la fecha original).
- No se cambió `src/`: el carril ya consume la función sin conocer el veto.
