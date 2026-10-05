-- OL-275: novedades en destacados y resumen público para los sellos.
-- Solo añade dos lecturas y un índice; tira_destacados y escrituras actuales intactas.
create index novedades_artista_visibles_recencia_idx
  on public.novedades_artista (creado_en desc, artista_id, id desc)
  include (proveedor, publicado_por) where visible;

-- Resumen público de la última novedad VISIBLE aún vigente, por ciudad y lote de artistas.
-- ids null: ciudad; ids vacíos: nada. Empates deterministas, 168 horas exactas.
create function public.novedades_recientes_artistas(p_ciudad text, p_ids uuid[] default null)
returns table (artista_id uuid, novedad_id uuid, proveedor text, creado_en timestamptz)
language sql stable security definer set search_path = '' as $$
  select distinct on (n.artista_id) n.artista_id, n.id, n.proveedor, n.creado_en
  from public.novedades_artista n
  join public.artistas a on a.id = n.artista_id
  where a.visible and a.ciudad = p_ciudad
    and (p_ids is null or a.id = any(p_ids))
    and n.visible
    and n.creado_en > now() - interval '168 hours' and n.creado_en <= now()
    and (public.es_admin() or not public.bloqueado_por_mi(n.publicado_por))
  order by n.artista_id, n.creado_en desc, n.id desc;
$$;
revoke all on function public.novedades_recientes_artistas(text, uuid[]) from public;
grant execute on function public.novedades_recientes_artistas(text, uuid[]) to anon, authenticated, service_role;
comment on function public.novedades_recientes_artistas(text, uuid[]) is
  'OL-275: última novedad visible y no bloqueada de artistas públicos de una ciudad; máximo una por artista, vigente menos de 168 horas. Sin títulos, URLs ni autores.';

-- La decisión editorial privada se lee aquí, sin abrir su tabla a visitantes.
-- Elegidos → novedades → asistentes; orden heredado de la tira; máximo12 con foto.
-- El respaldo existente de próximos/seguidores queda en la aplicación solo si los tres grupos de esta tira quedan vacíos.
create function public.artistas_destacados_novedades(p_ciudad text)
returns table (id uuid, motivo text, hasta timestamptz, van integer, novedad_id uuid, proveedor text, novedad_creado_en timestamptz)
language sql stable security definer set search_path = '' as $$
  with tira as materialized (
    -- Única fuente de la decisión, asistentes y orden existentes; conserva su tope interno8.
    select t.id, t.motivo, t.hasta, t.van, t.posicion, a.nombre
    from public.tira_destacados('artistas', p_ciudad)
      with ordinality as t(id, motivo, hasta, van, posicion)
    join public.artistas a on a.id = t.id
    where a.visible and a.ciudad = p_ciudad and nullif(btrim(a.foto), '') is not null
  ),
  ultimas as materialized (
    select * from public.novedades_recientes_artistas(p_ciudad)
  ),
  candidatas as (
    select t.id, t.nombre, t.motivo, t.hasta, t.van, 0 as grupo, t.posicion,
      n.novedad_id, n.proveedor, n.creado_en as novedad_creado_en
    from tira t left join ultimas n on n.artista_id = t.id
    where t.motivo = 'elegido'
    union all
    select a.id, a.nombre, 'novedad', n.creado_en + interval '168 hours', 0, 1, null::bigint,
      n.novedad_id, n.proveedor, n.creado_en
    from ultimas n join public.artistas a on a.id = n.artista_id
    where a.visible and a.ciudad = p_ciudad and nullif(btrim(a.foto), '') is not null
      and not exists (select 1 from tira t where t.id = a.id and t.motivo = 'elegido')
      and not exists (select 1 from public.destacados d
        where d.artista_id = a.id and d.quitado and d.hasta > now())
    union all
    select t.id, t.nombre, t.motivo, t.hasta, t.van, 2, t.posicion,
      null::uuid, null::text, null::timestamptz
    from tira t
    where t.motivo = 'asistentes' and not exists (select 1 from ultimas n where n.artista_id = t.id)
  )
  select c.id, c.motivo, c.hasta, c.van, c.novedad_id, c.proveedor, c.novedad_creado_en
  from candidatas c
  order by c.grupo,
    case when c.grupo = 1 then c.novedad_creado_en end desc nulls last,
    c.posicion nulls last, c.nombre, c.id
  limit 12;
$$;
revoke all on function public.artistas_destacados_novedades(text) from public;
grant execute on function public.artistas_destacados_novedades(text) to anon, authenticated, service_role;
comment on function public.artistas_destacados_novedades(text) is
  'OL-275: artistas visibles de la ciudad con foto; elegidos, novedades vigentes por recencia y asistentes; veto editorial vigente, máximo12 sin duplicados. No cambia la tira de eventos o lugares.';
