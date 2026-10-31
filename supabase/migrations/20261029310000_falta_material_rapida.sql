-- somosnosotros · OL-498 · migración 20261029310000 · «Falta material» sin recorrer todos los eventos por cada ficha (bitácora 530)
-- `instagram_falta_material` (OL-488, migración 20261029240000) buscaba la próxima fecha de cada artista o lugar sin material con un
-- `join lateral` sobre toda la tabla `eventos`, preguntando en cada evento si la ficha estaba en él y convirtiendo su hora con su zona
-- (`p_desde::timestamp at time zone e.zona`, por fila: así no puede usar el índice de `inicio`). Crece al cuadrado: en producción, el
-- 2026-10-31, tardó 3 648 ms y leyó 2 880 341 bloques para devolver 14 filas, y la portada de Administración la esperaba antes de pintar.
--
-- Solo reemplaza la función, con la misma firma, las mismas columnas y lo mismo que devuelve (la prueba
-- supabase/tests/pg/instagram-sin-material-rapida.test.mjs compara fila por fila con una copia de la de antes). Ahora va al revés:
--   1. primero el conjunto chico: los eventos visibles que caen en los 30 días desde `p_desde` (desde ahora si la semana ya empezó). Se
--      leen por el índice de `inicio` con un margen de un día en UTC (las zonas van de −12 a +14 h) y luego se recortan con los límites
--      exactos, calculados una vez por zona distinta, no por evento;
--   2. de esos eventos, sus artistas (`eventos_artistas`) y sus lugares (`lugar_id`), y la primera fecha de cada uno (`distinct on`);
--   3. solo sobre esas fichas: qué les falta y qué más, la ciudad (el slug de cada texto de ciudad se calcula una vez), las publicadas
--      en 6 meses y el orden;
--   4. y solo sobre las 100 que salen: quién la lleva y si ya se le pidió esa semana.
-- Lo que no cambia: `security definer`, `search_path = ''`, solo la administración (`es_admin()`), los permisos (authenticated y
-- service_role) y el orden (próxima fecha, nombre, id). Un empate exacto de hora entre dos eventos de la misma ficha se resuelve por el
-- id del evento (antes quedaba al azar del plan).
begin;

create or replace function public.instagram_falta_material(p_ciudad text, p_desde date)
returns table (
  tipo text, id uuid, slug text, nombre text, foto text, falta text[], otros text[], proxima_titulo text, proxima_inicio timestamptz, proxima_zona text,
  lleva uuid[], lleva_nombre text, pedido_en timestamptz
)
language sql stable security definer set search_path = '' as $$
  with
  -- 1. Los eventos de la ventana. El margen de un día en UTC deja pasar los de cualquier zona y usa el índice `eventos_inicio_idx`.
  previos as (
    select e.id, e.titulo, e.inicio, e.zona, e.ciudad, e.lugar_id
    from public.eventos e
    where public.es_admin() and p_ciudad is not null and p_desde is not null
      and e.visible and not e.borrador and not e.cancelado and not e.retirado_por_admin
      and e.inicio >= greatest(p_desde::timestamp at time zone 'UTC' - interval '1 day', now())
      and e.inicio < (p_desde + 30)::timestamp at time zone 'UTC' + interval '1 day'
  ),
  -- Los límites exactos, una vez por zona: desde el lunes a medianoche en su zona (o desde ahora, si ya empezó) hasta 30 días después.
  limites as (
    select z.zona, greatest(p_desde::timestamp at time zone z.zona, now()) as desde, (p_desde + 30)::timestamp at time zone z.zona as hasta
    from (select distinct p.zona from previos p) z
  ),
  ventana as (
    select p.* from previos p join limites l on l.zona = p.zona
    where p.inicio >= l.desde and p.inicio < l.hasta
  ),
  -- 2. Las fichas con fecha y su primera fecha.
  fechas as (
    select 'artista'::text as tipo, ea.artista_id as ficha, v.id as evento, v.titulo, v.inicio, v.zona, v.ciudad
    from ventana v join public.eventos_artistas ea on ea.evento_id = v.id
    union all
    select 'lugar', v.lugar_id, v.id, v.titulo, v.inicio, v.zona, v.ciudad
    from ventana v where v.lugar_id is not null
  ),
  proxima as (
    select distinct on (f.tipo, f.ficha) f.tipo, f.ficha, f.titulo, f.inicio, f.zona, f.ciudad
    from fechas f
    order by f.tipo, f.ficha, f.inicio, f.evento
  ),
  -- 3. Solo esas fichas: visibles, que no dijeron que no, con lo que les falta.
  fichas as (
    select 'artista'::text as tipo, a.id, a.slug, a.nombre, a.ciudad, coalesce(nullif(btrim(a.foto), ''), nullif(btrim(a.portada), '')) as foto,
      array_remove(array[
        case when coalesce(btrim(a.foto), '') = '' then 'foto' when not public.instagram_material_propio(a.foto) then 'foto_ajena' end,
        case when coalesce(btrim(a.portada), '') = '' then 'portada' when not public.instagram_material_propio(a.portada) then 'portada_ajena' end
      ], null) as falta,
      array_remove(array[
        case when char_length(coalesce(a.descripcion, '')) < 120 then 'descripcion' end,
        case when not (coalesce(a.redes, '[]'::jsonb)::text ~* 'instagram\.com/[A-Za-z0-9._]') then 'instagram' end
      ], null) as otros,
      p.titulo as proxima_titulo, p.inicio as proxima_inicio, p.zona as proxima_zona, p.ciudad as proxima_ciudad
    from proxima p join public.artistas a on a.id = p.ficha
    where p.tipo = 'artista' and a.visible and not exists (select 1 from public.instagram_fuera f where f.artista_id = a.id)
    union all
    select 'lugar', l.id, l.slug, l.nombre, l.ciudad, nullif(btrim(l.portada), ''),
      array_remove(array[case when coalesce(btrim(l.portada), '') = '' then 'portada' when not public.instagram_material_propio(l.portada) then 'portada_ajena' end], null),
      array_remove(array[case when char_length(coalesce(l.descripcion, '')) < 120 then 'descripcion' end], null),
      p.titulo, p.inicio, p.zona, p.ciudad
    from proxima p join public.lugares l on l.id = p.ficha
    where p.tipo = 'lugar' and l.visible and not l.privado and not exists (select 1 from public.instagram_fuera f where f.lugar_id = l.id)
  ),
  sin as (select * from fichas f where cardinality(f.falta) > 0),
  -- El slug de cada texto de ciudad, una vez (la de la ficha o la de su próxima fecha).
  slugs as (
    select x.c, public.ciudad_slug(x.c) as s
    from (select s.ciudad as c from sin s union select s.proxima_ciudad from sin s) x
  ),
  elegidas as (
    select s.* from sin s
    left join slugs sf on sf.c is not distinct from s.ciudad
    left join slugs sp on sp.c is not distinct from s.proxima_ciudad
    where (sf.s = p_ciudad or sp.s = p_ciudad)
      and not exists (select 1 from public.instagram_publicaciones ip
        where ip.estado = 'publicada' and ip.artista_id = s.id and ip.creado_en >= now() - interval '6 months')
      and not exists (select 1 from public.instagram_publicaciones ip
        where ip.estado = 'publicada' and ip.lugar_id = s.id and ip.creado_en >= now() - interval '6 months')
    order by s.proxima_inicio, s.nombre, s.id
    limit 100
  )
  -- 4. Quién la lleva y si ya se le pidió, solo de las que salen.
  select c.tipo, c.id, c.slug, c.nombre, c.foto, c.falta, c.otros, c.proxima_titulo, c.proxima_inicio, c.proxima_zona,
    q.lleva, (select p.nombre from public.perfiles p where p.id = q.lleva[1]),
    least(
      (select min(m.creado_en) from public.instagram_material_pedidos m where m.artista_id = c.id and m.semana = p_desde),
      (select min(m.creado_en) from public.instagram_material_pedidos m where m.lugar_id = c.id and m.semana = p_desde))
  from elegidas c
  cross join lateral (select public.instagram_quien_lleva(c.tipo, c.id) as lleva) q
  order by c.proxima_inicio, c.nombre, c.id;
$$;
revoke all on function public.instagram_falta_material(text, date) from public, anon;
grant execute on function public.instagram_falta_material(text, date) to authenticated, service_role;
comment on function public.instagram_falta_material(text, date) is 'OL-488 (OL-498: primero los eventos de la ventana, luego sus fichas): los artistas y lugares de una ciudad con fecha en los 30 días desde un lunes que se quedan fuera de la semana de Instagram por falta de foto o portada (qué falta, su próxima fecha, quién la lleva y si ya se le pidió esa semana). Solo administración.';

commit;
