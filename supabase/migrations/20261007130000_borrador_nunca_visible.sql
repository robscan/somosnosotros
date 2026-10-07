-- somosnosotros · OL-328 · un borrador de programa nunca es visible y la administración manda sobre lo oculto (bitácora 357)
-- Hallazgo P1 de la revisión de Codex (OL-327, 2026-10-07 08:21, reproducido en PostgreSQL 17 con las 86 migraciones): la migración de
-- OL-321 (20261006160000_eventos_clase.sql) dejaba volver a mostrar lo que la administración ocultó.
--   · `publicar_borrador_de_programa` es SECURITY DEFINER y ponía `visible = true, borrador = false` con solo mirar `borrador` y el autor.
--   · Nada impedía insertar un acto propio con `visible = true, borrador = true` (la restricción y el disparador de OL-321 solo vigilan el
--     paso a borrador en un UPDATE).
--   Reproducción: una cuenta normal inserta un acto de su festival con `visible = true, borrador = true` → la administración lo oculta →
--   la autora llama la función → queda `visible = true, borrador = false` y anon vuelve a verlo. La protección de siempre
--   (`proteger_autor_y_visible`: quien no administra no vuelve a mostrar) no la frena porque la función corre como dueña de la tabla.
--   Pasa también con un borrador legítimo: ya está oculto, la administración lo «oculta» y su autor lo publica después.
--
-- Arreglo:
--   1. Restricción `eventos_borrador_oculto`: un borrador nunca es visible.
--   2. Columna `retirado_por_admin`: la marca la administración al ocultar (cuando su UPDATE nombra `visible` con false, aunque ya
--      estuviera oculto, como un borrador) y la quita al volver a mostrar. Quien no administra no la cambia.
--   3. `publicar_borrador_de_programa` solo publica un borrador propio, oculto y no retirado por la administración.
--
-- Solo añade: una columna con su valor de siempre (false), una restricción, un disparador y su función, y `create or replace` de
-- `publicar_borrador_de_programa` con la misma firma (reemplazar una función es código, no datos: ninguna fila cambia por ello).
-- Filas: en producción hoy hay 0 borradores y 0 festivales (consulta del gestor, 2026-10-07), así que la restricción no choca con nada.
-- Por si acaso, antes de crearla se ocultan los borradores visibles que hubiera (idempotente: sin filas así, no toca nada).
-- `publicar_programa` no cambia: inserta los desmarcados visibles y en la misma transacción `programa_ocultar_borrador` los deja
-- `visible = false, borrador = true` en un solo UPDATE, que cumple la restricción; los marcados quedan `visible = true, borrador = false`.
-- La aplica el gestor antes de unir el código (la ficha del festival lee `retirado_por_admin`).

-- ---------- 1. Un borrador nunca es visible ----------
update public.eventos set visible = false where borrador and visible;
alter table public.eventos add constraint eventos_borrador_oculto check (not borrador or not visible);

-- ---------- 2. Lo que retiró la administración ----------
alter table public.eventos add column retirado_por_admin boolean not null default false;
comment on column public.eventos.retirado_por_admin is 'La administración lo ocultó (OL-328): su autor no lo vuelve a publicar como borrador. La pone y la quita solo la administración.';

-- Antes de cada UPDATE que nombra `visible` o `retirado_por_admin`. Solo vigila lo que piden las cuentas (anon y authenticated), como
-- `proteger_autor_y_visible`: lo que hace la propia base (funciones security definer, llave de servicio, migraciones) no pasa por aquí,
-- y por eso la función no es security definer (current_user tiene que ser quien hace el cambio).
-- · La administración: si fija `retirado_por_admin` a mano, vale lo que puso; si no, ocultar (visible = false, aunque ya estuviera
--   oculto) lo marca como retirado y volver a mostrar lo desmarca y deja de ser borrador (si no, chocaría con la restricción).
-- · Quien no administra: no cambia `retirado_por_admin` (ocultar y volver a mostrar ya se lo impide `proteger_autor_y_visible`).
create function public.eventos_retirado_por_admin() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if not public.es_admin() then
    if new.retirado_por_admin is distinct from old.retirado_por_admin then
      raise exception 'solo la administración retira o devuelve una ficha' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.retirado_por_admin is distinct from old.retirado_por_admin then
    return new;
  end if;
  if new.visible then
    new.retirado_por_admin := false;
    new.borrador := false;
  else
    new.retirado_por_admin := true;
  end if;
  return new;
end $$;
revoke all on function public.eventos_retirado_por_admin() from public, anon, authenticated;
create trigger eventos_retirado_por_admin before update of visible, retirado_por_admin on public.eventos
  for each row execute function public.eventos_retirado_por_admin();

-- ---------- 3. Publicar un borrador del programa ----------
-- Desde la ficha del festival: lo vuelve visible y el festival recalcula su periodo. Solo su autor, solo un borrador oculto y nunca uno que
-- la administración retiró. Sigue siendo SECURITY DEFINER porque es imprescindible: el autor no puede cambiar `visible` por sí mismo
-- (`proteger_autor_y_visible` se lo impide a quien no administra, y así debe seguir), y esta es la única puerta para hacerlo; por eso
-- comprueba aquí, con la fila bloqueada, todo lo que la base no comprobaría por él.
-- Errores: `sin_permiso` si no hay sesión, no existe o no es suyo (no revela si existe); `no_publicable` si es suyo pero no es un borrador
-- oculto o la administración lo retiró (la app dice «La administración retiró esta actividad»). Los dos con errcode 42501.
create or replace function public.publicar_borrador_de_programa(p_evento uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v public.eventos;
begin
  if auth.uid() is null then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  select * into v from public.eventos where id = p_evento for update;
  if not found or v.creado_por is distinct from auth.uid() then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if not v.borrador or v.visible or v.retirado_por_admin then
    raise exception 'no_publicable' using errcode = '42501';
  end if;
  update public.eventos set visible = true, borrador = false where id = p_evento;
  perform public.recalcular_festival(v.evento_padre_id);
  return jsonb_build_object('id', p_evento, 'padre', v.evento_padre_id);
end $$;
revoke all on function public.publicar_borrador_de_programa(uuid) from public, anon;
grant execute on function public.publicar_borrador_de_programa(uuid) to authenticated;
