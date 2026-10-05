-- OL-283: las ciudades que solo tienen eventos (sin ningún lugar) pueden conocer su centro por el punto de sus eventos.
-- Solo reemplaza la función: no toca tablas ni filas. Misma firma y mismos campos de antes (lugares, eventos, lat_suma,
-- lng_suma conservan nombre y significado); añade eventos_con_punto, ev_lat_suma y ev_lng_suma, que cuentan y suman
-- únicamente los eventos vigentes y visibles sin lugar (lugar_id nulo) con coordenadas públicas: sitio_lat y sitio_lng
-- presentes y sitio_reservado falso. Un sitio reservado nunca aporta coordenadas (privacidad); la restricción
-- eventos_reservado_sin_punto_publico ya lo impide en los datos y aquí se repite el filtro como segunda guarda.
-- Se aplica ANTES de desplegar el código; el código viejo ignora los campos nuevos.
create or replace function public.ciudades_agregadas(p_ahora timestamptz default now())
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(grupo order by grupo.ciudad, grupo.zona), '[]'::jsonb)
  from (
    select ciudad, zona, sum(lugares)::bigint as lugares, sum(eventos)::bigint as eventos,
      sum(lat_suma) as lat_suma, sum(lng_suma) as lng_suma,
      sum(eventos_con_punto)::bigint as eventos_con_punto,
      sum(ev_lat_suma) as ev_lat_suma, sum(ev_lng_suma) as ev_lng_suma
    from (
      select l.ciudad, l.zona, count(*) as lugares, 0::bigint as eventos,
        coalesce(sum(l.lat), 0) as lat_suma, coalesce(sum(l.lng), 0) as lng_suma,
        0::bigint as eventos_con_punto, 0::double precision as ev_lat_suma, 0::double precision as ev_lng_suma
      from public.lugares l where l.visible and not l.privado
      group by l.ciudad, l.zona
      union all
      select e.ciudad, e.zona, 0::bigint, count(*), 0::double precision, 0::double precision,
        count(*) filter (where p.con_punto), coalesce(sum(e.sitio_lat) filter (where p.con_punto), 0),
        coalesce(sum(e.sitio_lng) filter (where p.con_punto), 0)
      from public.eventos e
      cross join lateral (
        select e.lugar_id is null and e.sitio_lat is not null and e.sitio_lng is not null
          and not e.sitio_reservado as con_punto
      ) p
      where e.visible and e.termina >= p_ahora
      group by e.ciudad, e.zona
    ) fuentes
    group by ciudad, zona
  ) grupo
$$;

revoke all on function public.ciudades_agregadas(timestamptz) from public;
grant execute on function public.ciudades_agregadas(timestamptz) to anon, authenticated, service_role;
comment on function public.ciudades_agregadas(timestamptz) is 'OL-268/OL-283: suma lugares públicos y eventos vigentes por ciudad/zona, con RLS del invocador; añade el recuento y la suma de coordenadas de los eventos vigentes sin lugar con punto público (nunca reservados) para el centro de ciudades sin lugares. La app conserva la canonización de nombres.';
