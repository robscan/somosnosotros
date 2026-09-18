-- OL-078: nombre/alias y direccion publica tienen round-trip independiente.
-- Sin backfill: el texto humano previo no se interpreta ni se separa.
alter table public.eventos add column sitio_direccion text
  check (sitio_direccion is null or (char_length(btrim(sitio_direccion)) > 0 and char_length(sitio_direccion) <= 200));
alter table public.eventos add constraint eventos_direccion_solo_publica
  check (sitio_direccion is null or (not sitio_reservado and lugar_id is null));
alter table public.eventos add constraint eventos_direccion_con_punto
  check (sitio_direccion is null or (sitio_lat is not null and sitio_lng is not null));
alter table public.eventos add constraint eventos_reservado_sin_punto_publico
  check (not sitio_reservado or (sitio_lat is null and sitio_lng is null));
comment on column public.eventos.sitio_direccion is 'Direccion publica estructurada de otro sitio. NULL en legacy sin separar, lugar registrado y sitio reservado.';

-- Reemplaza 181100 sin cambiar firma, seguridad, revision, idempotencia ni artistas.
create or replace function public.guardar_evento_completo(p_evento uuid, p_datos jsonb, p_privado jsonb, p_quien jsonb, p_revision timestamptz default null, p_operacion uuid default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v public.eventos;
  anterior public.eventos;
  privado public.eventos_sitio_privado;
  item jsonb;
  artista uuid;
  artistas uuid[] := '{}';
  previos uuid[] := '{}';
  v_nombre text;
  cuando boolean := false;
  donde boolean := false;
begin
  if auth.uid() is null then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_operacion is null then
    raise exception 'operacion_requerida' using errcode = '22023';
  end if;
  if jsonb_typeof(p_datos) is distinct from 'object'
    or jsonb_typeof(p_quien) is distinct from 'array' or jsonb_array_length(p_quien) > 6 then
    raise exception 'datos_invalidos' using errcode = '22023';
  end if;
  v := jsonb_populate_record(null::public.eventos, p_datos);
  v.sitio_reservado := coalesce(v.sitio_reservado, false);
  if v.sitio_reservado then
    if jsonb_typeof(p_privado) is distinct from 'object' or v.lugar_id is not null
      or v.sitio_direccion is not null or v.sitio_lat is not null or v.sitio_lng is not null then
      raise exception 'sitio_reservado_invalido' using errcode = '23514';
    end if;
    privado := jsonb_populate_record(null::public.eventos_sitio_privado, p_privado);
    if coalesce(btrim(privado.direccion), '') = '' or privado.revelar_desde is null
      or privado.revelar_desde is distinct from v.sitio_revelar_desde then
      raise exception 'direccion_reservada_invalida' using errcode = '23514';
    end if;
  elsif p_privado is not null and p_privado <> 'null'::jsonb then
    raise exception 'direccion_privada_en_sitio_publico' using errcode = '23514';
  end if;

  if p_evento is null then
    -- La misma alta conserva su UUID al reintentar, incluso si la primera respuesta se perdio.
    perform pg_advisory_xact_lock(7304, hashtext(p_operacion::text));
    select * into anterior from public.eventos where id = p_operacion;
    if found then
      if anterior.creado_por is distinct from auth.uid() then
        raise exception 'sin_permiso' using errcode = '42501';
      end if;
      return jsonb_build_object('id', anterior.id, 'artistas',
        (select coalesce(jsonb_agg(artista_id), '[]') from public.eventos_artistas where evento_id = anterior.id),
        'artistas_anteriores', '[]'::jsonb, 'lugar_anterior', null, 'cambio', null, 'repetido', true);
    end if;
    insert into public.eventos (id, operacion_guardado, titulo, inicio, fin, lugar_id, descripcion, imagen, precio, enlace,
      sitio_texto, sitio_direccion, sitio_lat, sitio_lng, sitio_reservado, sitio_revelar_desde, ciudad, zona, creado_por)
    values (p_operacion, p_operacion, v.titulo, v.inicio, v.fin, v.lugar_id, v.descripcion, v.imagen, v.precio, v.enlace,
      v.sitio_texto, v.sitio_direccion, v.sitio_lat, v.sitio_lng, v.sitio_reservado, v.sitio_revelar_desde, v.ciudad, v.zona, auth.uid())
    returning * into v;
  else
    select * into anterior from public.eventos where id = p_evento for update;
    if not found or not public.gestiona_evento(p_evento) then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
    if anterior.operacion_guardado = p_operacion then
      return jsonb_build_object('id', anterior.id, 'artistas',
        (select coalesce(jsonb_agg(artista_id), '[]') from public.eventos_artistas where evento_id = anterior.id),
        'artistas_anteriores', '[]'::jsonb, 'lugar_anterior', null, 'cambio', null, 'repetido', true);
    end if;
    if p_revision is null or anterior.actualizado_en is distinct from p_revision then
      raise exception 'evento_actualizado' using errcode = '40001';
    end if;
    -- Clientes anteriores no pueden borrar la direccion estructurada por omision.
    if not (p_datos ? 'sitio_direccion') and not v.sitio_reservado and v.lugar_id is null then
      v.sitio_direccion := anterior.sitio_direccion;
    end if;
    select coalesce(array_agg(artista_id), '{}') into previos
      from public.eventos_artistas where evento_id = p_evento;
    cuando := anterior.inicio is distinct from v.inicio or anterior.fin is distinct from v.fin;
    donde := anterior.lugar_id is distinct from v.lugar_id or anterior.sitio_texto is distinct from v.sitio_texto
      or anterior.sitio_direccion is distinct from v.sitio_direccion
      or anterior.sitio_lat is distinct from v.sitio_lat or anterior.sitio_lng is distinct from v.sitio_lng
      or anterior.sitio_reservado is distinct from v.sitio_reservado;
    if v.sitio_reservado and anterior.sitio_reservado then
      donde := donde or not exists (select 1 from public.eventos_sitio_privado p where p.evento_id = p_evento)
        or exists (select 1 from public.eventos_sitio_privado p where p.evento_id = p_evento
        and (p.direccion is distinct from privado.direccion or p.lat is distinct from privado.lat or p.lng is distinct from privado.lng));
    end if;
    update public.eventos set operacion_guardado = p_operacion, titulo = v.titulo, inicio = v.inicio, fin = v.fin, lugar_id = v.lugar_id,
      descripcion = v.descripcion, imagen = v.imagen, precio = v.precio, enlace = v.enlace,
      sitio_texto = v.sitio_texto, sitio_direccion = v.sitio_direccion, sitio_lat = v.sitio_lat, sitio_lng = v.sitio_lng,
      sitio_reservado = v.sitio_reservado, sitio_revelar_desde = v.sitio_revelar_desde, ciudad = v.ciudad, zona = v.zona
      where id = p_evento returning * into v;
    if not found then raise exception 'sin_permiso' using errcode = '42501'; end if;
  end if;

  if v.sitio_reservado then
    -- Una direccion privada nueva/cambiada exige pin. Legacy intacto conserva ambos NULL.
    -- La comprobacion ocurre dentro de la transaccion; el rechazo revierte tambien el evento.
    if privado.lat is null or privado.lng is null then
      if privado.lat is not null or privado.lng is not null or anterior.id is null or not anterior.sitio_reservado
        or not exists (select 1 from public.eventos_sitio_privado p where p.evento_id = v.id
          and p.direccion = privado.direccion and p.lat is null and p.lng is null) then
        raise exception 'direccion_privada_sin_punto' using errcode = '23514';
      end if;
    end if;
    insert into public.eventos_sitio_privado (evento_id, direccion, lat, lng, indicaciones, revelar_desde)
      values (v.id, privado.direccion, privado.lat, privado.lng, privado.indicaciones, privado.revelar_desde)
      on conflict (evento_id) do update set direccion = excluded.direccion, lat = excluded.lat,
        lng = excluded.lng, indicaciones = excluded.indicaciones, revelar_desde = excluded.revelar_desde;
  else
    delete from public.eventos_sitio_privado where evento_id = v.id;
  end if;

  -- Orden global de cerrojos: dos eventos con los mismos nombres en distinto orden no se bloquean entre si.
  for v_nombre in select distinct public.normalizar_nombre(x->>'nombre') from jsonb_array_elements(p_quien) x
    where coalesce(x->>'id', '') = '' order by 1
  loop
    perform pg_advisory_xact_lock(7303, hashtext(v.ciudad || ':' || v_nombre));
  end loop;
  for item in select * from jsonb_array_elements(p_quien) loop
    v_nombre := btrim(item->>'nombre');
    if coalesce(v_nombre, '') = '' or char_length(v_nombre) > 80 then
      raise exception 'artista_invalido' using errcode = '22023';
    end if;
    artista := null;
    if coalesce(item->>'id', '') <> '' then
      select a.id into artista from public.artistas a where a.id = (item->>'id')::uuid;
      if artista is null then raise exception 'artista_no_disponible' using errcode = '42501'; end if;
    else
      select a.id into artista from public.artistas a
        where a.visible and public.normalizar_nombre(a.nombre) = public.normalizar_nombre(v_nombre)
        order by (a.ciudad = v.ciudad) desc, a.nombre, a.id limit 1;
      if artista is null then
        insert into public.artistas (nombre, disciplina, tipo, ciudad, creado_por)
          values (v_nombre, 'por_completar', coalesce(item->>'tipo', 'solista'), v.ciudad, auth.uid()) returning id into artista;
      end if;
    end if;
    if not artista = any(artistas) then artistas := array_append(artistas, artista); end if;
  end loop;
  delete from public.eventos_artistas where evento_id = v.id;
  insert into public.eventos_artistas (evento_id, artista_id, orden)
    select v.id, id, (orden - 1)::smallint from unnest(artistas) with ordinality as a(id, orden);

  return jsonb_build_object('id', v.id, 'artistas', artistas, 'artistas_anteriores', previos,
    'lugar_anterior', anterior.lugar_id,
    'cambio', case when cuando and donde then 'ambos' when cuando then 'cuando' when donde then 'donde' else null end);
end;
$$;
revoke all on function public.guardar_evento_completo(uuid, jsonb, jsonb, jsonb, timestamptz, uuid) from public, anon;
grant execute on function public.guardar_evento_completo(uuid, jsonb, jsonb, jsonb, timestamptz, uuid) to authenticated;
