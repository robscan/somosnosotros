-- somosnosotros · OL-341 · «Este festival ya está publicado. ¿Es tu participación?» (bitácora 370)
-- Caso real (2026-10-07): dos artistas publicaron cada uno «Electric Universe Festival» (mismo título, misma fecha, mismo sitio) como eventos
-- sueltos y el gestor tuvo que convertirlo a mano en un festival con dos actos. Al publicar un evento puntual, «Publicado» busca con las
-- lecturas de siempre un evento visible con un título muy parecido el mismo día (`src/lib/sugerenciasParecido.ts`) y ofrece:
--   (a) si es un festival: ligar el evento nuevo como acto suyo                                   → `unir_a_festival_parecido`;
--   (b) si es un evento suelto de otra cuenta: volverlo el marco de un festival con los dos como actos → `festival_de_dos_parecidos`.
-- Las dos escriben en una fila ajena (el festival que gana un acto y recalcula su periodo; el evento de otra persona que pasa a ser acto), así
-- que son SECURITY DEFINER y acotadas: solo esa transformación, solo cuando el título y el día coinciden con la misma regla que la pantalla
-- (`titulos_parecidos`), solo con lo visible, y nada que la administración ocultó (OL-328: `retirado_por_admin`) vuelve a verse: no se toca
-- `visible` de nadie ni `creado_por` del evento ajeno.
--
-- Solo añade: cuatro funciones nuevas y amplía `anotar_sugerencia` (misma firma, mismos permisos) con el tipo `parecido` («No, es otro
-- evento» o aceptada). Va DESPUÉS de 20261007130000_borrador_nunca_visible (lee `retirado_por_admin`) y de 20261007100000_sugerencias_al_publicar.

-- ---------- 1. La regla de los títulos (la misma de `lib/sugerenciasParecido.ts`) ----------
-- Distintivo: al menos tres palabras con contenido (sin artículos, preposiciones ni conjunciones) o una de las palabras de festival (lista
-- cerrada). Así «Concierto» o «Taller de cerámica» el mismo día no se toman por el mismo evento. Internas: solo las usan las funciones de abajo.
create function public.titulo_distintivo(p_titulo text) returns boolean
language sql stable set search_path = '' as $$
  with palabras as (
    select w from pg_catalog.regexp_split_to_table(public.normalizar_nombre(p_titulo), ' ') as w where w <> ''
  )
  select exists (select 1 from palabras where w in ('festival', 'fest', 'encuentro', 'muestra', 'ciclo', 'jornadas'))
    or (select count(*) from palabras
        where w not in ('de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'con', 'a', 'al', 'para', 'por', 'un', 'una', 'o', 'u', 'the', 'of', 'and')) >= 3;
$$;
comment on function public.titulo_distintivo(text) is 'OL-341: el título nombra algo propio (3 palabras con contenido o una palabra de festival), no un género.';
revoke all on function public.titulo_distintivo(text) from public, anon, authenticated;

-- Parecidos: normalizados, iguales o uno dentro del otro por palabras enteras, y el más corto distintivo.
create function public.titulos_parecidos(p_a text, p_b text) returns boolean
language sql stable set search_path = '' as $$
  with n as (select public.normalizar_nombre(p_a) as a, public.normalizar_nombre(p_b) as b),
  c as (select case when length(a) <= length(b) then a else b end as corto, case when length(a) <= length(b) then b else a end as largo from n)
  select corto <> '' and position(' ' || corto || ' ' in ' ' || largo || ' ') > 0 and public.titulo_distintivo(corto) from c;
$$;
comment on function public.titulos_parecidos(text, text) is 'OL-341: dos títulos nombran el mismo evento (iguales o uno dentro del otro, normalizados y distintivos).';
revoke all on function public.titulos_parecidos(text, text) from public, anon, authenticated;

-- ---------- 2. Lo anotado: el tipo `parecido` ----------
-- Igual que en OL-323, con un tipo más: «No, es otro evento» (o salir sin tocarla) la anota descartada y no vuelve a salir para ese evento.
create or replace function public.anotar_sugerencia(p_evento uuid, p_tipo text, p_estado text, p_clave text default null) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if p_tipo is null or p_tipo not in ('exposicion', 'festival', 'parecido') or p_estado is null or p_estado not in ('descartada', 'aceptada') then
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

-- ---------- 3. (a) Unir el evento propio al festival que ya está publicado ----------
-- El evento: lo gestiona quien llama, es puntual, visible, no es borrador ni acto de otro festival. El festival: visible, no retirado por la
-- administración, con un título parecido al del evento (el que se publicó, antes de renombrarlo) y su periodo cubre el día del evento (el fin
-- cuenta un segundo antes: «hasta las 00:00 del 13» terminó el 12). El acto entra con `p_titulo` (el nombre de la participación; vacío: el
-- suyo) y el festival recalcula su periodo. El festival puede ser de otra cuenta: por eso SECURITY DEFINER (el disparador de OL-321 solo deja
-- ligar a un marco propio). Ligarlo otra vez no cambia nada.
create function public.unir_a_festival_parecido(p_evento uuid, p_festival uuid, p_titulo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e public.eventos;
  f public.eventos;
  v_titulo text := btrim(coalesce(p_titulo, ''));
begin
  if auth.uid() is null then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  -- Primero el festival: el mismo orden que `festival_de_dos_parecidos`, que también lo bloquea.
  select * into f from public.eventos where id = p_festival for update;
  select * into e from public.eventos where id = p_evento for update;
  if e.id is null or not public.gestiona_evento(p_evento) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if f.id is not null and e.evento_padre_id = f.id then
    return jsonb_build_object('id', f.id, 'slug', f.slug, 'titulo', f.titulo, 'repetido', true,
      'actos', (select count(*) from public.eventos x where x.evento_padre_id = f.id and x.visible));
  end if;
  if e.clase <> 'puntual' or e.borrador or not e.visible or e.evento_padre_id is not null then
    raise exception 'acto_invalido' using errcode = '23514';
  end if;
  if f.id is null or f.clase <> 'festival' or not f.visible or f.borrador or f.retirado_por_admin then
    raise exception 'festival_invalido' using errcode = '23514';
  end if;
  if not public.titulos_parecidos(e.titulo, f.titulo) then
    raise exception 'no_parecido' using errcode = '23514';
  end if;
  if pg_catalog.timezone(e.zona, e.inicio)::date not between pg_catalog.timezone(f.zona, f.inicio)::date
      and pg_catalog.timezone(f.zona, greatest(f.inicio, coalesce(f.fin, f.inicio) - interval '1 second'))::date then
    raise exception 'otro_dia' using errcode = '23514';
  end if;
  if char_length(v_titulo) > 120 then
    raise exception 'titulo_invalido' using errcode = '22023';
  end if;
  update public.eventos
    set evento_padre_id = f.id,
        titulo = case when v_titulo <> '' then v_titulo else titulo end,
        sugerencias = sugerencias || '{"parecido": {"estado": "aceptada"}}'::jsonb
    where id = e.id;
  perform public.recalcular_festival(f.id);
  return jsonb_build_object('id', f.id, 'slug', f.slug, 'titulo', f.titulo,
    'actos', (select count(*) from public.eventos x where x.evento_padre_id = f.id and x.visible));
end $$;
comment on function public.unir_a_festival_parecido(uuid, uuid, text) is 'OL-341 (a): liga un evento propio recién publicado como acto del festival ya publicado con un título parecido el mismo día.';
revoke all on function public.unir_a_festival_parecido(uuid, uuid, text) from public, anon;
grant execute on function public.unir_a_festival_parecido(uuid, uuid, text) to authenticated;

-- ---------- 4. (b) Dos eventos iguales de dos cuentas: un festival con los dos ----------
-- El nuevo: lo gestiona quien llama, puntual, visible, sin borrador ni festival. El existente: de OTRA cuenta, puntual, visible, no retirado por
-- la administración, sin borrador; con un título parecido y el mismo día (cada uno en su zona). En una sola operación:
--   · nace el marco (`clase = 'festival'`, id = `p_operacion`) con el título, las fechas, el sitio (sin la dirección si es reservado), el
--     cartel, el enlace y el AUTOR del existente: el festival es de quien lo publicó primero;
--   · el existente pasa a ser su acto: solo cambia `evento_padre_id` (su autor, su título y `visible` quedan como estaban);
--   · el nuevo entra como acto con `p_titulo` (vacío: el suyo) y queda la sugerencia aceptada;
--   · el festival recalcula su periodo con sus dos actos.
-- Un reintento con la misma clave devuelve el festival ya creado. Si mientras tanto el existente ya entró a un festival (otra persona lo
-- convirtió primero), el nuevo se une a ese (lo mismo que (a), con sus comprobaciones). Una conversión a la vez por evento existente.
create function public.festival_de_dos_parecidos(p_existente uuid, p_nuevo uuid, p_titulo text, p_operacion uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  x public.eventos;
  n public.eventos;
  ya public.eventos;
  v_titulo text := btrim(coalesce(p_titulo, ''));
begin
  if auth.uid() is null then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_operacion is null then
    raise exception 'operacion_requerida' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(7341, hashtext(p_existente::text));
  select * into ya from public.eventos where id = p_operacion;
  if found then
    if ya.clase = 'festival' and exists (select 1 from public.eventos a where a.id = p_nuevo and a.evento_padre_id = p_operacion)
        and public.gestiona_evento(p_nuevo) then
      return jsonb_build_object('id', ya.id, 'slug', ya.slug, 'titulo', ya.titulo, 'repetido', true,
        'actos', (select count(*) from public.eventos a where a.evento_padre_id = ya.id and a.visible));
    end if;
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  select * into x from public.eventos where id = p_existente for update;
  select * into n from public.eventos where id = p_nuevo for update;
  if n.id is null or not public.gestiona_evento(p_nuevo) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if n.clase <> 'puntual' or n.borrador or not n.visible or n.evento_padre_id is not null then
    raise exception 'acto_invalido' using errcode = '23514';
  end if;
  -- Otra persona lo convirtió primero: el nuevo se une a ese festival.
  if x.id is not null and x.evento_padre_id is not null then
    return public.unir_a_festival_parecido(p_nuevo, x.evento_padre_id, v_titulo);
  end if;
  if x.id is null or x.clase <> 'puntual' or x.borrador or not x.visible or x.retirado_por_admin
      or x.creado_por is not distinct from n.creado_por then
    raise exception 'evento_invalido' using errcode = '23514';
  end if;
  if not public.titulos_parecidos(n.titulo, x.titulo) then
    raise exception 'no_parecido' using errcode = '23514';
  end if;
  if pg_catalog.timezone(n.zona, n.inicio)::date <> pg_catalog.timezone(x.zona, x.inicio)::date then
    raise exception 'otro_dia' using errcode = '23514';
  end if;
  if char_length(v_titulo) > 120 then
    raise exception 'titulo_invalido' using errcode = '22023';
  end if;

  insert into public.eventos (id, operacion_guardado, titulo, inicio, fin, lugar_id, sitio_texto, sitio_direccion, sitio_lat, sitio_lng,
    sitio_reservado, ciudad, zona, imagen, enlace, creado_por, clase)
  values (p_operacion, p_operacion, x.titulo, x.inicio, x.fin, x.lugar_id,
    case when x.lugar_id is null then x.sitio_texto end,
    case when x.sitio_reservado then null else x.sitio_direccion end,
    case when x.sitio_reservado then null else x.sitio_lat end,
    case when x.sitio_reservado then null else x.sitio_lng end,
    false, x.ciudad, x.zona,
    -- El cartel, si es de la app (uno externo que puso la administración no pasaría `proteger_imagen_origen` con quien llama).
    case when public.imagen_origen_permitido(x.imagen, false, false) then x.imagen end,
    x.enlace, x.creado_por, 'festival');
  update public.eventos set evento_padre_id = p_operacion where id = x.id;
  update public.eventos
    set evento_padre_id = p_operacion,
        titulo = case when v_titulo <> '' then v_titulo else titulo end,
        sugerencias = sugerencias || '{"parecido": {"estado": "aceptada"}}'::jsonb
    where id = n.id;
  perform public.recalcular_festival(p_operacion);
  return jsonb_build_object('id', p_operacion, 'slug', (select slug from public.eventos where id = p_operacion), 'titulo', x.titulo,
    'actos', (select count(*) from public.eventos a where a.evento_padre_id = p_operacion and a.visible));
end $$;
comment on function public.festival_de_dos_parecidos(uuid, uuid, text, uuid) is 'OL-341 (b): vuelve el marco de un festival el evento igual de otra cuenta (su autor lo conserva) con los dos eventos como actos, en una sola operación reintentable.';
revoke all on function public.festival_de_dos_parecidos(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.festival_de_dos_parecidos(uuid, uuid, text, uuid) to authenticated;
