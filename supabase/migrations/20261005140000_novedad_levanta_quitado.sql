-- OL-285: una novedad posterior al «quitado» de la administración lo levanta (regla del founder, 2026-10-04).
-- Solo reemplaza la lectura artistas_destacados_novedades (misma firma y columnas); no toca tablas ni filas.
--
-- Cómo se fecha el quitado: public.cambiar_destacado borra el renglón de la ficha e inserta uno nuevo con
-- creado_en = coalesce(p_creado_en, now()). Quitar desde la pantalla no manda p_creado_en, así que el renglón
-- «quitado» queda con la fecha de ese momento; Deshacer repone la fecha del renglón anterior, no una nueva.
-- Esa fecha es el momento del quitado. Regla: el veto vale mientras el quitado vigente (hasta > now()) sea posterior
-- o igual a la novedad vigente más reciente del artista (creado_en del quitado >= creado_en de la novedad).
-- Si la novedad es posterior, el artista entra por novedad. Si luego se vuelve a quitar, la fecha nueva vuelve a vetar.
-- tira_destacados no cambia: un quitado vigente nunca sale por asistentes (su renglón excluye la ficha), así que
-- un artista quitado con novedad posterior sale una sola vez, por el grupo de novedades.
create or replace function public.artistas_destacados_novedades(p_ciudad text)
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
      -- Veto editorial: solo si el quitado vigente es posterior o igual a la novedad vigente más reciente.
      and not exists (select 1 from public.destacados d
        where d.artista_id = a.id and d.quitado and d.hasta > now() and d.creado_en >= n.creado_en)
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
  'OL-275/OL-285: artistas visibles de la ciudad con foto; elegidos, novedades vigentes por recencia y asistentes; el quitado vigente de la administración veta la novedad solo si es posterior o igual a ella (una novedad posterior lo levanta); máximo12 sin duplicados. No cambia la tira de eventos o lugares.';
