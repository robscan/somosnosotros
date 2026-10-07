-- OL-330: integridad al ligar eventos, reintentar altas y escribir sesiones.
-- Solo añade columnas, índices y disparadores; no cambia ni borra filas existentes.
-- Antes de aplicarla, comprobar que no hay inauguraciones ligadas más de una vez.
create unique index eventos_una_exposicion_por_inauguracion
  on public.eventos (inaugura_id) where inaugura_id is not null;

-- La operación pertenece a la cuenta que da de alta el lugar.
alter table public.lugares add column operacion_guardado uuid;
create unique index lugares_operacion_guardado_unica
  on public.lugares (creado_por, operacion_guardado) where operacion_guardado is not null;

create function public.conservar_operacion_lugar() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.operacion_guardado is distinct from old.operacion_guardado then
    raise exception 'operacion_inmutable' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.conservar_operacion_lugar() from public, anon, authenticated, service_role;
create trigger lugares_conservar_operacion before update of operacion_guardado on public.lugares
  for each row execute function public.conservar_operacion_lugar();

-- Misma firma y permisos que antes. Los clientes nuevos mandan su clave estable;
-- los antiguos conservan idempotencia para el mismo contenido y la misma cuenta.
create or replace function public.crear_lugar_con_horario(p_datos jsonb, p_franjas jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  d public.lugares;
  v_autor uuid := auth.uid();
  v_operacion uuid;
  v_id uuid;
  v_slug text;
begin
  if v_autor is null then raise exception 'sin_permiso' using errcode = '42501'; end if;
  if jsonb_typeof(p_datos) is distinct from 'object'
    or jsonb_typeof(p_franjas) is distinct from 'array' or jsonb_array_length(p_franjas) > 50 then
    raise exception 'horario_invalido' using errcode = '22023';
  end if;
  d := jsonb_populate_record(null::public.lugares, p_datos);
  v_operacion := coalesce(d.operacion_guardado,
    pg_catalog.md5(v_autor::text || ':' || p_datos::text || ':' || p_franjas::text)::uuid);
  perform pg_catalog.pg_advisory_xact_lock(7310, pg_catalog.hashtext(v_autor::text || ':' || v_operacion::text));
  select id, slug into v_id, v_slug from public.lugares
    where creado_por = v_autor and operacion_guardado = v_operacion;
  if found then return jsonb_build_object('id', v_id, 'slug', v_slug, 'repetido', true); end if;
  insert into public.lugares (nombre, tipo, direccion, lat, lng, descripcion, redes, portada, privado,
    detalle, ciudad, zona, creado_por, operacion_guardado)
  values (d.nombre, d.tipo, d.direccion, d.lat, d.lng, d.descripcion, coalesce(d.redes, '[]'::jsonb),
    d.portada, coalesce(d.privado, false), d.detalle, d.ciudad, coalesce(d.zona, 'America/Mexico_City'),
    v_autor, v_operacion)
  returning id, slug into v_id, v_slug;
  perform public.guardar_horario_lugar(v_id, p_franjas);
  return jsonb_build_object('id', v_id, 'slug', v_slug, 'repetido', false);
end $$;
revoke all on function public.crear_lugar_con_horario(jsonb, jsonb) from public, anon;
grant execute on function public.crear_lugar_con_horario(jsonb, jsonb) to authenticated;

-- Una fila privada por evento serializa los cambios de sesiones sin alterar la
-- revisión del evento. La actualización de esta fila también protege REPEATABLE
-- READ: una transacción con instantánea anterior debe reintentarse (40001).
create table public.eventos_sesiones_guardia (
  evento_id uuid primary key references public.eventos(id) on delete cascade,
  marca boolean not null default false
);
alter table public.eventos_sesiones_guardia enable row level security;
revoke all on public.eventos_sesiones_guardia from public, anon, authenticated, service_role;

-- SECURITY DEFINER únicamente para escribir la guardia privada. Verifica permiso
-- por cada sesión y no modifica datos del evento. El UPDATE del padre ya pasa
-- por RLS o por la propagación autorizada de zona desde un lugar. Sin llamada directa.
create function public.ordenar_escritura_sesiones() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_ids uuid[];
  v_id uuid;
begin
  if tg_table_name = 'eventos' then v_ids := array[new.id];
  elsif tg_op = 'INSERT' then v_ids := array[new.evento_id];
  elsif tg_op = 'DELETE' then v_ids := array[old.evento_id];
  else v_ids := array[old.evento_id, new.evento_id]; end if;
  -- Orden fijo al mover una sesión. NO KEY UPDATE permite la comprobación de su FK.
  for v_id in select distinct x from unnest(v_ids) x order by x loop
    if tg_table_name = 'eventos_sesiones'
      and pg_catalog.current_setting('role', true) in ('anon', 'authenticated')
      and exists (select 1 from public.eventos where id = v_id)
      and not public.gestiona_evento(v_id) then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
    perform 1 from public.eventos where id = v_id for no key update;
    if not found then continue; end if; -- borrado en cascada del evento
    insert into public.eventos_sesiones_guardia as g (evento_id) values (v_id)
      on conflict (evento_id) do update set marca = not g.marca;
  end loop;
  if tg_op = 'DELETE' then return old; end if;
  if tg_table_name = 'eventos' then return new; end if;
  -- Cortar el crecimiento en la fila 32, antes de acumular un lote grande. La
  -- guardia anterior hace seguro este recuento también frente a otra conexión.
  if (select count(*) from public.eventos_sesiones
      where evento_id = new.evento_id and id <> new.id) >= 31 then
    raise exception 'sesiones_invalidas' using errcode = '22023';
  end if;
  return new;
end $$;
revoke all on function public.ordenar_escritura_sesiones() from public, anon, authenticated, service_role;
create trigger eventos_sesiones_ordenar before insert or update or delete on public.eventos_sesiones
  for each row execute function public.ordenar_escritura_sesiones();
create trigger eventos_periodo_ordenar before update of inicio, fin, zona on public.eventos
  for each row execute function public.ordenar_escritura_sesiones();

-- Se valida el estado final de la transacción: editar puede cambiar primero el
-- evento y después sustituir sus sesiones, o eliminar todas al volver al horario común.
-- Validación interna también sobre actos que cambie la propagación de zona de
-- un lugar: no devuelve datos ni tiene permisos de llamada desde la API.
create function public.validar_integridad_sesiones() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_ids uuid[];
  v_id uuid;
  e public.eventos;
  n integer;
  dia_inicial date;
  dia_final date;
begin
  if tg_table_name = 'eventos' then v_ids := array[new.id];
  elsif tg_op = 'INSERT' then v_ids := array[new.evento_id];
  elsif tg_op = 'DELETE' then v_ids := array[old.evento_id];
  else v_ids := array[old.evento_id, new.evento_id]; end if;
  for v_id in select distinct x from unnest(v_ids) x order by x loop
    select * into e from public.eventos where id = v_id for no key update;
    if not found then continue; end if; -- borrado en cascada del evento
    select count(*) into n from public.eventos_sesiones where evento_id = v_id;
    if n = 0 then continue; end if;
    if n < 2 or n > 31 or e.fin is null then
      raise exception 'sesiones_invalidas' using errcode = '22023';
    end if;
    dia_inicial := pg_catalog.timezone(e.zona, e.inicio)::date;
    dia_final := pg_catalog.timezone(e.zona, e.fin)::date;
    if exists (select 1 from public.eventos_sesiones s where s.evento_id = v_id and (
      s.fecha <> pg_catalog.timezone(e.zona, s.inicio)::date
      or s.fecha < dia_inicial or s.fecha > dia_final
      or (s.fin is not null and s.fin > pg_catalog.timezone(e.zona, (s.fecha + 1)::timestamp))))
      or not exists (select 1 from public.eventos_sesiones where evento_id = v_id and inicio = e.inicio)
      or not exists (select 1 from public.eventos_sesiones where evento_id = v_id and fecha = dia_final) then
      raise exception 'sesiones_invalidas' using errcode = '22023';
    end if;
  end loop;
  return null;
end $$;
revoke all on function public.validar_integridad_sesiones() from public, anon, authenticated, service_role;
create constraint trigger eventos_sesiones_integridad after insert or update or delete on public.eventos_sesiones
  deferrable initially deferred for each row execute function public.validar_integridad_sesiones();
create constraint trigger eventos_periodo_integridad after update of inicio, fin, zona on public.eventos
  deferrable initially deferred for each row execute function public.validar_integridad_sesiones();
