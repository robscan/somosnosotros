-- somosnosotros · OL-487 · migración 20261029230000 · la semana de Instagram se arma sola los miércoles (bitácora 519)
-- En OL-479 (bitácora 511) la semana de Instagram se arma al abrir la pestaña «Semana» de Administración › Instagram: si nadie la abre, la que
-- viene no se programa. El founder aceptó la recomendación del gestor: que se arme sola los miércoles, con el latido que ya existe y sin cron
-- nuevo. El latido elegido es `redes-latido` (OL-465, migración 20261028140000): ya corre cada minuto, mira la cola de Instagram y llama a
-- /api/redes/correr, la ruta que trabaja esa cola con la llave de servicio; lo que arma la semana son justo trabajos de esa cola.
--
-- Cómo: un miércoles entre las 9:00 y las 9:59 de la hora de cada ciudad (`ciudades.zona`), si la ciudad está abierta, tiene eventos la semana
-- que viene y a esa semana le faltan días, `redes_vivos()` la cuenta como algo por hacer; el latido llama a la ruta, y la ruta arma la semana con
-- la MISMA función de la pestaña (`armarLoQueFalta` en src/app/admin/instagram/semana.ts, la que usa `cargarSemana`), a nombre de la
-- administración. Idempotente: un día que ya tiene su fila no se toca (`instagram_semana_guardar`, `on conflict do nothing`), y con la semana
-- completa la ciudad deja de contar. Si armarla falla, la ruta lo anota en sus registros («redes: …», sin secretos ni datos de personas) y sigue
-- con la cola; el latido lo vuelve a intentar al minuto siguiente mientras dure la hora.
--
-- LO ÚNICO QUE SE CAMBIA: `redes_vivos()` (misma firma, mismos permisos: nadie fuera de su dueño) suma las ciudades por armar a los trabajos
-- listos. Sin ciudades por armar cuenta exactamente lo mismo que antes. Ninguna fila cambia.
--
-- LO DEMÁS SOLO AÑADE:
--   · `instagram_semana.armada_por` (nula): quién armó el día: `pestana` (al abrir la pestaña) o `latido` (el miércoles, sola). Las filas de antes
--     se quedan en null. La pone su valor por omisión: `latido` solo dentro de `instagram_semana_latido`, que lo marca para su transacción.
--   · `instagram_semana_por_armar(p_ahora)`: las ciudades a las que el latido les arma la que viene en ese instante. Solo la llave de servicio.
--   · `instagram_semana_quien_arma()`: a nombre de qué cuenta de la administración se arma (quien conectó Instagram; si no, quien tocó la semana
--     por última vez; si no, la más antigua). Interna.
--   · `instagram_semana_latido(p_funcion, p_args)`: llama a `instagram_candidatos`, `instagram_sugerencias` o `instagram_semana_guardar` tal cual,
--     como si la sesión fuera la de esa cuenta (como `aceptar_propuesta_como`, OL-453): así la regla, los permisos y lo que se anota (quién lo
--     armó, a quién avisar cuando salga) son los de la pestaña, sin copiar su lógica. Solo la llave de servicio; ninguna otra función.
-- Sin `cron.schedule` nuevo.
begin;

-- ---------- 1. Quién armó cada día ----------
alter table public.instagram_semana
  add column armada_por text check (armada_por in ('pestana', 'latido'));
alter table public.instagram_semana
  alter column armada_por set default (case when pg_catalog.current_setting('somosnosotros.armada_por', true) = 'latido' then 'latido' else 'pestana' end);
comment on column public.instagram_semana.armada_por is 'OL-487: quién armó el día: pestana (al abrir Administración › Instagram › Semana) o latido (el miércoles, sola). Null: antes de OL-487.';

-- ---------- 2. Las ciudades por armar ----------
-- Un miércoles entre las 9:00 y las 9:59 de su hora, la ciudad abierta con eventos la semana que viene (que empiezan o siguen esa semana) a cuya
-- semana que viene le faltan días. Lo mismo dice `tocaArmarLaQueViene` en src/lib/instagram/semana.ts: las dos reglas van juntas.
create function public.instagram_semana_por_armar(p_ahora timestamptz default now())
returns table (ciudad text, zona text, lunes date)
language sql stable security definer set search_path = '' as $$
  with en_hora as materialized (
    select c.slug, c.zona, (date_trunc('week', p_ahora at time zone c.zona)::date + 7) as lunes
    from public.ciudades c
    where c.estado = 'abierta'
      and extract(isodow from p_ahora at time zone c.zona) = 3
      and extract(hour from p_ahora at time zone c.zona) = 9
  )
  select h.slug, h.zona, h.lunes
  from en_hora h
  where (select count(*) from public.instagram_semana s where s.ciudad = h.slug and s.fecha between h.lunes and h.lunes + 6) < 7
    and exists (
      select 1 from public.eventos e
      where e.visible and not e.borrador and not e.retirado_por_admin and not e.cancelado
        and e.inicio < ((h.lunes + 7)::timestamp at time zone h.zona)
        and e.termina > (h.lunes::timestamp at time zone h.zona)
        and public.ciudad_slug(e.ciudad) = h.slug)
  order by h.slug;
$$;
revoke all on function public.instagram_semana_por_armar(timestamptz) from public, anon, authenticated;
grant execute on function public.instagram_semana_por_armar(timestamptz) to service_role;
comment on function public.instagram_semana_por_armar(timestamptz) is 'OL-487: las ciudades a las que el latido de redes les arma la semana que viene en ese instante (miércoles de 9:00 a 9:59 en su hora, abiertas, con eventos esa semana y días por armar). Solo service_role.';

-- ---------- 3. El latido cuenta las ciudades por armar ----------
create or replace function public.redes_vivos() returns integer
language sql stable security definer set search_path = '' as $$
  select (
    select count(*)::integer
    from public.redes_trabajos t
    where (t.estado = 'en_cola' and t.siguiente_en <= now())
       or (t.estado = 'publicando' and coalesce(t.ocupada_hasta <= now(), true))
  ) + (select count(*)::integer from public.instagram_semana_por_armar(now()));
$$;
comment on function public.redes_vivos() is 'OL-465 + OL-487: cuántos trabajos de redes esperan y nadie trabaja, más las ciudades a las que toca armarles la semana que viene de Instagram (miércoles de 9:00 a 9:59 en su hora).';

-- ---------- 4. A nombre de quién, y lo que el latido pide ----------
create function public.instagram_semana_quien_arma() returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.id from public.instagram_conexion x join public.perfiles p on p.id = x.conectado_por and p.rol = 'admin' limit 1),
    (select p.id from public.instagram_semana s join public.perfiles p on p.id = s.actualizado_por and p.rol = 'admin'
      order by s.actualizado_en desc limit 1),
    (select p.id from public.perfiles p where p.rol = 'admin' order by p.creado_en, p.id limit 1));
$$;
revoke all on function public.instagram_semana_quien_arma() from public, anon, authenticated, service_role;

create function public.instagram_semana_latido(p_funcion text, p_args jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_admin uuid;
  v_r jsonb;
begin
  if p_funcion is null or p_funcion not in ('instagram_candidatos', 'instagram_sugerencias', 'instagram_semana_guardar') then
    raise exception 'El latido no pide esa función.' using errcode = '42501';
  end if;
  v_admin := public.instagram_semana_quien_arma();
  if v_admin is null then
    raise exception 'No hay una cuenta de la administración a cuyo nombre armar la semana.' using errcode = '42501';
  end if;
  -- Solo para esta transacción: la sesión es la de esa cuenta (`auth.uid()`, `es_admin()`) y lo que se guarde lleva «armada por el latido».
  perform pg_catalog.set_config('request.jwt.claims', pg_catalog.json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  perform pg_catalog.set_config('request.jwt.claim.sub', v_admin::text, true);
  perform pg_catalog.set_config('somosnosotros.armada_por', 'latido', true);
  if p_funcion = 'instagram_candidatos' then
    select coalesce(jsonb_agg(to_jsonb(c) - 'ordinality' order by c.ordinality), '[]'::jsonb) into v_r
    from rows from (public.instagram_candidatos(p_args ->> 'p_ciudad', p_args ->> 'p_tipo', (p_args ->> 'p_desde')::date)) with ordinality as c;
  elsif p_funcion = 'instagram_sugerencias' then
    select coalesce(jsonb_agg(to_jsonb(s) - 'ordinality' order by s.ordinality), '[]'::jsonb) into v_r
    from rows from (public.instagram_sugerencias(p_args ->> 'p_ciudad', (p_args ->> 'p_dias')::integer)) with ordinality as s;
  else
    v_r := to_jsonb(public.instagram_semana_guardar(p_args ->> 'p_ciudad', p_args -> 'p_casillas'));
  end if;
  return v_r;
end $$;
revoke all on function public.instagram_semana_latido(text, jsonb) from public, anon, authenticated;
grant execute on function public.instagram_semana_latido(text, jsonb) to service_role;
comment on function public.instagram_semana_latido(text, jsonb) is 'OL-487: instagram_candidatos, instagram_sugerencias o instagram_semana_guardar a nombre de la administración (instagram_semana_quien_arma), para que el latido de redes arme la semana con la misma función que la pestaña. Solo service_role.';

commit;
