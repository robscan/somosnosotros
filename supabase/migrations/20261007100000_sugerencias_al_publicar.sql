-- somosnosotros · OL-323 · sugerencias al publicar: la exposición tras la inauguración (H1, H2) y el festival tras el segundo acto (H4, H5)
-- Modelo: docs/investigaciones/eventos-modelo.md §10; prototipo aceptado docs/rediseno/prototipos/eventos-superficies.html (bitácora 314);
-- bitácora 352. Va DESPUÉS de 20261006160000_eventos_clase (OL-321): usa `clase`, `inaugura_id`, `evento_padre_id`, `eventos_horarios` y
-- `recalcular_festival`.
--
-- Solo añade: una columna con su valor de siempre (`{}`), y cuatro funciones nuevas. Nada de lo que ya existe cambia de significado.
--
-- - `eventos.sugerencias`: lo que el sistema anotó para no insistir (modelo §10: «ignorar no es confirmar»; una sugerencia descartada no
--   vuelve a salir para ese evento ni en sus ediciones, ni la misma agrupación por un tercer acto) y la mención del festival que leyó el cartel
--   (el título no siempre la trae y el segundo acto la necesita para reconocer al primero):
--     {"mencion_festival": "Festival Umbral 2026",
--      "exposicion": {"estado": "descartada|aceptada"},
--      "festival": {"estado": "descartada|aceptada", "clave": "festival umbral|2026"}}
--   Se lee como el resto del evento (la mención sale del cartel público; el estado solo dice si su autor aceptó o no una ayuda).
-- - Crear la exposición, ligarla o relacionar los actos con su festival son una sola operación cada una (todo o nada) y reintentables con la
--   misma clave: nunca dejan una exposición sin su inauguración ni un festival sin sus actos.

-- ---------- 1. Lo anotado ----------
alter table public.eventos add column sugerencias jsonb not null default '{}'::jsonb
  constraint eventos_sugerencias_objeto check (jsonb_typeof(sugerencias) = 'object');
comment on column public.eventos.sugerencias is 'OL-323: lo anotado de las sugerencias al publicar (mención del festival leída del cartel, exposición y festival descartados o aceptados) para no volver a ofrecerlas.';

-- Descartar o aceptar una sugerencia: solo quien gestiona el evento. Una aceptada no se vuelve descartada (salir de «Publicado» tras aceptar
-- no la borra). Con los permisos de quien llama.
create function public.anotar_sugerencia(p_evento uuid, p_tipo text, p_estado text, p_clave text default null) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if p_tipo is null or p_tipo not in ('exposicion', 'festival') or p_estado is null or p_estado not in ('descartada', 'aceptada') then
    raise exception 'sugerencia_invalida' using errcode = '22023';
  end if;
  if auth.uid() is null or not exists (select 1 from public.eventos where id = p_evento and public.gestiona_evento(p_evento)) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  update public.eventos
    set sugerencias = sugerencias || jsonb_build_object(p_tipo, jsonb_strip_nulls(jsonb_build_object('estado', p_estado, 'clave', left(p_clave, 200))))
    where id = p_evento and (sugerencias->p_tipo->>'estado') is distinct from 'aceptada'
      and (sugerencias->p_tipo->>'estado') is distinct from p_estado;
end $$;
comment on function public.anotar_sugerencia(uuid, text, text, text) is 'OL-323: anota una sugerencia al publicar como descartada o aceptada (no se vuelve a ofrecer).';
revoke all on function public.anotar_sugerencia(uuid, text, text, text) from public, anon;
grant execute on function public.anotar_sugerencia(uuid, text, text, text) to authenticated;

-- ---------- 2. H1 / H2: publicar la exposición que abre una inauguración ----------
-- La inauguración ya está publicada (un evento puntual). La exposición nace con su nombre y su periodo (del primer día de visita a las 00:00 al
-- final del día de cierre, como la arma el alta: `periodoDeVisita`), el mismo lugar o sitio, el mismo cartel, el mismo enlace y quién expone; NO
-- hereda la hora de la ceremonia ni su precio (prototipo aceptado: «la exposición no hereda su hora ni su precio»). Su horario: el propio si
-- llega (`p_horario`, franjas como `eventos_horarios`) o, sin él, el del lugar. Se publica con sus avisos, como cualquier alta, ligada a la
-- inauguración por `inaugura_id`, y la sugerencia queda aceptada en la inauguración: todo en la misma transacción. Un reintento con la misma
-- clave devuelve la ya creada.
create function public.publicar_exposicion_de_inauguracion(p_inauguracion uuid, p_titulo text, p_inicio timestamptz, p_fin timestamptz,
  p_horario jsonb, p_operacion uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  i public.eventos;
  ya public.eventos;
  v_id uuid;
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_quien jsonb;
  v_dias smallint[];
  f jsonb;
begin
  if auth.uid() is null then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_operacion is null then
    raise exception 'operacion_requerida' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(7304, hashtext(p_operacion::text));
  select * into ya from public.eventos where id = p_operacion;
  if found then
    if ya.creado_por is distinct from auth.uid() or ya.inaugura_id is distinct from p_inauguracion then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
    return jsonb_build_object('id', ya.id, 'slug', ya.slug, 'repetido', true);
  end if;
  select * into i from public.eventos where id = p_inauguracion;
  if not found or not public.gestiona_evento(p_inauguracion) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  -- Una inauguración en un sitio reservado no abre una exposición (su dirección y su hora de revelado son de ese evento: OL-321, decisión 7).
  if i.clase <> 'puntual' or i.sitio_reservado or i.borrador then
    raise exception 'inauguracion_invalida' using errcode = '23514';
  end if;
  if exists (select 1 from public.eventos x where x.inaugura_id = p_inauguracion) then
    raise exception 'ya_inaugura' using errcode = '23505';
  end if;
  if v_titulo = '' or char_length(v_titulo) > 120 or p_inicio is null or p_fin is null or p_fin <= p_inicio then
    raise exception 'exposicion_invalida' using errcode = '22023';
  end if;
  -- Quién expone: los mismos de la inauguración (los que se pueden ver; uno oculto no se vuelve a ligar).
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'nombre', a.nombre) order by ea.orden, a.nombre), '[]'::jsonb) into v_quien
    from public.eventos_artistas ea join public.artistas a on a.id = ea.artista_id where ea.evento_id = i.id;
  v_id := (public.guardar_evento_con_avisos(null,
    jsonb_build_object('titulo', v_titulo, 'inicio', p_inicio, 'fin', p_fin, 'lugar_id', i.lugar_id,
      'sitio_texto', case when i.lugar_id is null then i.sitio_texto end, 'sitio_direccion', i.sitio_direccion,
      'sitio_lat', i.sitio_lat, 'sitio_lng', i.sitio_lng, 'sitio_reservado', false, 'sitio_revelar_desde', null,
      'ciudad', i.ciudad, 'zona', i.zona, 'imagen', i.imagen, 'enlace', i.enlace, 'descripcion', null, 'precio', null),
    null, v_quien, null, p_operacion)->>'id')::uuid;
  update public.eventos set clase = 'exposicion', inaugura_id = p_inauguracion where id = v_id;

  -- El horario propio, si llega (si no, vale el del lugar; sin ninguno, «Horario por confirmar»).
  if jsonb_typeof(p_horario) = 'array' then
    if jsonb_array_length(p_horario) > 50 then
      raise exception 'horario_invalido' using errcode = '22023';
    end if;
    for f in select * from jsonb_array_elements(p_horario) loop
      if jsonb_typeof(f) is distinct from 'object' or jsonb_typeof(f->'dias') is distinct from 'array' then
        raise exception 'horario_invalido' using errcode = '22023';
      end if;
      select array_agg(distinct d::smallint order by d::smallint) into v_dias from jsonb_array_elements_text(f->'dias') d;
      insert into public.eventos_horarios (evento_id, dias, abre, cierra)
      values (v_id, coalesce(v_dias, '{}'), (f->>'abre')::time, (f->>'cierra')::time);
    end loop;
  end if;

  update public.eventos set sugerencias = sugerencias || '{"exposicion": {"estado": "aceptada"}}'::jsonb where id = p_inauguracion;
  return jsonb_build_object('id', v_id, 'slug', (select slug from public.eventos where id = v_id));
end $$;
comment on function public.publicar_exposicion_de_inauguracion(uuid, text, timestamptz, timestamptz, jsonb, uuid) is 'OL-323 (H1, H2): publica la exposición de una inauguración ya publicada, ligada por inaugura_id, en una sola operación reintentable.';
revoke all on function public.publicar_exposicion_de_inauguracion(uuid, text, timestamptz, timestamptz, jsonb, uuid) from public, anon;
grant execute on function public.publicar_exposicion_de_inauguracion(uuid, text, timestamptz, timestamptz, jsonb, uuid) to authenticated;

-- ---------- 3. H1 / H2 con la exposición ya publicada: ligar la inauguración ----------
-- Las dos gestionadas por quien llama (una exposición ajena sería una propuesta pendiente, que este modelo no tiene: OL-321, decisión 5); una
-- exposición con otra inauguración no se pisa. El disparador de OL-321 vuelve a comprobar que la inauguración es un acto puntual que gestiona.
create function public.ligar_inauguracion(p_exposicion uuid, p_inauguracion uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  x public.eventos;
begin
  if auth.uid() is null then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  select * into x from public.eventos where id = p_exposicion for update;
  if not found or not public.gestiona_evento(p_exposicion) or not public.gestiona_evento(p_inauguracion) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if x.clase <> 'exposicion' then
    raise exception 'no_es_exposicion' using errcode = '23514';
  end if;
  if x.inaugura_id = p_inauguracion then
    return jsonb_build_object('id', x.id, 'slug', x.slug, 'repetido', true);
  end if;
  if x.inaugura_id is not null or exists (select 1 from public.eventos o where o.inaugura_id = p_inauguracion) then
    raise exception 'ya_inaugura' using errcode = '23505';
  end if;
  update public.eventos set inaugura_id = p_inauguracion where id = p_exposicion;
  update public.eventos set sugerencias = sugerencias || '{"exposicion": {"estado": "aceptada"}}'::jsonb where id = p_inauguracion;
  return jsonb_build_object('id', x.id, 'slug', x.slug);
end $$;
comment on function public.ligar_inauguracion(uuid, uuid) is 'OL-323: liga una inauguración ya publicada a una exposición propia ya publicada (sin crear otra).';
revoke all on function public.ligar_inauguracion(uuid, uuid) from public, anon;
grant execute on function public.ligar_inauguracion(uuid, uuid) to authenticated;

-- ---------- 4. H4 / H5: relacionar los actos con su festival ----------
-- `p_marco`: un festival propio que ya existe (H5); sin él, uno nuevo con el nombre de la mención (`p_titulo`) y la clave `p_operacion` (H4),
-- que toma el sitio de su primer acto y el periodo de su programa registrado (como «Parte de un festival» de OL-321). Cada acto lo gestiona
-- quien llama, no es un festival ni un borrador y no es ya parte de otro festival (moverlo de uno a otro es cosa de editar). Un festival ajeno
-- no se ofrece (OL-321, decisión 5). Todo o nada; un reintento con la misma clave no crea otro festival.
create function public.relacionar_en_festival(p_eventos uuid[], p_marco uuid, p_titulo text, p_operacion uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  marco public.eventos;
  primero public.eventos;
  a public.eventos;
  v_marco uuid;
  v_id uuid;
  v_titulo text := btrim(coalesce(p_titulo, ''));
begin
  if auth.uid() is null then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_eventos is null or cardinality(p_eventos) < 1 or cardinality(p_eventos) > 10 then
    raise exception 'actos_invalidos' using errcode = '22023';
  end if;
  if p_marco is not null then
    select * into marco from public.eventos where id = p_marco;
    if not found or marco.clase <> 'festival' or marco.creado_por is distinct from auth.uid() then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
    v_marco := p_marco;
  else
    if p_operacion is null then
      raise exception 'operacion_requerida' using errcode = '22023';
    end if;
    perform pg_advisory_xact_lock(7304, hashtext(p_operacion::text));
    select * into marco from public.eventos where id = p_operacion;
    if found and (marco.clase <> 'festival' or marco.creado_por is distinct from auth.uid()) then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
    v_marco := p_operacion;
  end if;

  -- Cada acto: propio (o gestionado), visible o no, pero no un festival, no un borrador y no de otro festival.
  foreach v_id in array p_eventos loop
    select * into a from public.eventos where id = v_id for update;
    if not found or not public.gestiona_evento(v_id) then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
    if a.clase = 'festival' or a.borrador or (a.evento_padre_id is not null and a.evento_padre_id <> v_marco) then
      raise exception 'acto_invalido' using errcode = '23514';
    end if;
  end loop;

  if p_marco is null and marco.id is null then
    if v_titulo = '' or char_length(v_titulo) > 120 then
      raise exception 'festival_invalido' using errcode = '22023';
    end if;
    select * into primero from public.eventos where id = any(p_eventos) order by inicio, id limit 1;
    insert into public.eventos (id, operacion_guardado, titulo, inicio, fin, lugar_id, sitio_texto, sitio_direccion, sitio_lat, sitio_lng,
      sitio_reservado, ciudad, zona, creado_por, clase)
    values (v_marco, v_marco, v_titulo, primero.inicio, primero.termina, primero.lugar_id,
      case when primero.lugar_id is null then primero.sitio_texto end,
      case when primero.sitio_reservado then null else primero.sitio_direccion end,
      case when primero.sitio_reservado then null else primero.sitio_lat end,
      case when primero.sitio_reservado then null else primero.sitio_lng end,
      false, primero.ciudad, primero.zona, auth.uid(), 'festival');
  end if;

  update public.eventos set evento_padre_id = v_marco where id = any(p_eventos) and evento_padre_id is distinct from v_marco;
  update public.eventos set sugerencias = sugerencias || '{"festival": {"estado": "aceptada"}}'::jsonb
    where id = any(p_eventos) and (sugerencias->'festival'->>'estado') is distinct from 'aceptada';
  perform public.recalcular_festival(v_marco);
  return jsonb_build_object('id', v_marco, 'slug', (select slug from public.eventos where id = v_marco),
    'titulo', (select titulo from public.eventos where id = v_marco),
    'actos', (select count(*) from public.eventos x where x.evento_padre_id = v_marco and x.visible));
end $$;
comment on function public.relacionar_en_festival(uuid[], uuid, text, uuid) is 'OL-323 (H4, H5): liga actos propios a un festival propio (existente o nuevo con el nombre de la mención) en una sola operación reintentable.';
revoke all on function public.relacionar_en_festival(uuid[], uuid, text, uuid) from public, anon;
grant execute on function public.relacionar_en_festival(uuid[], uuid, text, uuid) to authenticated;
