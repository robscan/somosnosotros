-- OL-268: agregados públicos por ciudad/zona, sin descargar ni truncar las fichas individuales.
-- JSON escalar: el límite de filas de PostgREST no recorta la lista de grupos.
-- Invoker conserva RLS; visible/privado se filtran también para quien administra.
create function public.ciudades_agregadas(p_ahora timestamptz default now())
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(grupo order by grupo.ciudad, grupo.zona), '[]'::jsonb)
  from (
    select ciudad, zona, sum(lugares)::bigint as lugares, sum(eventos)::bigint as eventos,
      sum(lat_suma) as lat_suma, sum(lng_suma) as lng_suma
    from (
      select l.ciudad, l.zona, count(*) as lugares, 0::bigint as eventos,
        coalesce(sum(l.lat), 0) as lat_suma, coalesce(sum(l.lng), 0) as lng_suma
      from public.lugares l where l.visible and not l.privado
      group by l.ciudad, l.zona
      union all
      select e.ciudad, e.zona, 0::bigint, count(*), 0::double precision, 0::double precision
      from public.eventos e where e.visible and e.termina >= p_ahora
      group by e.ciudad, e.zona
    ) fuentes
    group by ciudad, zona
  ) grupo
$$;

create function public.ciudades_artistas_agregadas()
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(grupo order by grupo.ciudad), '[]'::jsonb)
  from (
    select a.ciudad, count(*) as artistas
    from public.artistas a where a.visible
    group by a.ciudad
  ) grupo
$$;

revoke all on function public.ciudades_agregadas(timestamptz) from public;
revoke all on function public.ciudades_artistas_agregadas() from public;
grant execute on function public.ciudades_agregadas(timestamptz) to anon, authenticated, service_role;
grant execute on function public.ciudades_artistas_agregadas() to anon, authenticated, service_role;
comment on function public.ciudades_agregadas(timestamptz) is 'OL-268: suma lugares públicos y eventos vigentes por ciudad/zona, con RLS del invocador. La app conserva la canonización de nombres.';
comment on function public.ciudades_artistas_agregadas() is 'OL-268: recuento de artistas visibles por ciudad, con RLS del invocador.';
