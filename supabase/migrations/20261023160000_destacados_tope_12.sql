-- OL-460 · La tira de destacados pasa de 8 a 12 (bitácora 492).
-- Decisión del founder (2026-10-23), tras OL-459: «12 está bien». El carril estelar de Inicio ya enseña hasta 12 (TOPE_ESTELAR)
-- y «Artistas destacadxs» también (artistas_destacados_novedades corta en 12 y lee esta tira: no cambia).
-- Solo `create or replace` de tira_destacados, idéntica a la de 20261023150000_destacados_automaticos.sql salvo el tope:
-- misma firma, mismas columnas (id, motivo, hasta, van), mismos permisos.
begin;

create or replace function public.tira_destacados(p_tipo text, p_ciudad text)
returns table (id uuid, motivo text, hasta timestamptz, van integer)
language sql stable security definer set search_path = '' as $$
  with
  -- Lo que puede salir: eventos visibles que no han terminado, sin lugar o en un lugar visible y no privado.
  proximos as (
    select e.id, e.lugar_id, e.ciudad, e.inicio, e.titulo, e.creado_por
    from public.eventos e
    left join public.lugares l on l.id = e.lugar_id
    where e.visible and e.termina >= now() and (e.lugar_id is null or (l.visible and not l.privado))
  ),
  -- Quién va a cada uno, sin contar a quien era administrador CUANDO dijo «voy» (D2, rol de entonces: OL-093).
  voy as (
    select a.evento_id, a.usuario_id
    from public.asistencias a
    join public.perfiles p on p.id = a.usuario_id
    join proximos e on e.id = a.evento_id
    where a.estado = 'voy' and public.rol_en(p.id, a.creado_en) <> 'admin'
  ),
  -- Señales de un evento de la ciudad (OL-459): «Voy» y «Me interesa» de quien no es la administración ni quien lo publicó,
  -- y sus vistas (una por visitante y día; la administración y quien lo publicó ya no se cuentan al guardarlas).
  senales_evento as (
    select a.evento_id,
      count(*) filter (where a.estado = 'voy')::int as voy,
      count(*) filter (where a.estado = 'me_interesa')::int as interesan
    from public.asistencias a
    join proximos e on e.id = a.evento_id
    where p_tipo = 'eventos' and e.ciudad = p_ciudad
      and a.usuario_id is distinct from e.creado_por
      and public.rol_en(a.usuario_id, a.creado_en) <> 'admin'
    group by a.evento_id
  ),
  vistas as (
    select v.evento_id, count(*)::int as n
    from public.vistas_evento v
    join proximos e on e.id = v.evento_id
    where p_tipo = 'eventos' and e.ciudad = p_ciudad
    group by v.evento_id
  ),
  -- En un lugar o un artista cuentan personas, no «Voy»: quien va a tres eventos del mismo foro cuenta una vez (D1, D2).
  van_lugar as (
    select e.lugar_id, count(distinct v.usuario_id)::int as n
    from voy v join proximos e on e.id = v.evento_id
    where e.lugar_id is not null
    group by e.lugar_id
  ),
  van_artista as (
    select ea.artista_id, count(distinct v.usuario_id)::int as n
    from voy v join public.eventos_artistas ea on ea.evento_id = v.evento_id
    group by ea.artista_id
  ),
  -- senal: por qué entraría sin que nadie lo eligiera (null: no entra). puntos: Voy 20, Me interesa 10, cada vista 1.
  fichas as (
    select e.id, greatest(e.inicio, now()) as cuando, e.titulo as nombre, d.quitado, d.creado_en, d.hasta,
      coalesce(s.voy, 0) as van,
      case when coalesce(s.voy, 0) >= 1 then 'asistentes'
           when coalesce(s.interesan, 0) >= 1 then 'interes'
           when coalesce(w.n, 0) >= 6 then 'vistas' end as senal,
      20 * coalesce(s.voy, 0) + 10 * coalesce(s.interesan, 0) + coalesce(w.n, 0) as puntos
    from proximos e
    left join public.destacados d on d.evento_id = e.id
    left join senales_evento s on s.evento_id = e.id
    left join vistas w on w.evento_id = e.id
    where p_tipo = 'eventos' and e.ciudad = p_ciudad
    union all
    select l.id, null, l.nombre, d.quitado, d.creado_en, d.hasta, coalesce(v.n, 0),
      case when coalesce(v.n, 0) >= 3 then 'asistentes' end, coalesce(v.n, 0)
    from public.lugares l
    left join public.destacados d on d.lugar_id = l.id and d.hasta > now()
    left join van_lugar v on v.lugar_id = l.id
    where p_tipo = 'lugares' and l.visible and not l.privado and l.ciudad = p_ciudad
    union all
    select a.id, null, a.nombre, d.quitado, d.creado_en, d.hasta, coalesce(v.n, 0),
      case when coalesce(v.n, 0) >= 3 then 'asistentes' end, coalesce(v.n, 0)
    from public.artistas a
    left join public.destacados d on d.artista_id = a.id and d.hasta > now()
    left join van_artista v on v.artista_id = a.id
    where p_tipo = 'artistas' and a.visible and a.ciudad = p_ciudad
  )
  -- Primero lo elegido, lo más reciente antes; después por puntos y, a iguales puntos, lo más cercano en el tiempo. Se quedan 12 (OL-460).
  select f.id, case when f.quitado is false then 'elegido' else f.senal end, f.hasta, f.van
  from fichas f
  where f.quitado is false or (f.quitado is null and f.senal is not null)
  order by f.quitado is false desc, f.creado_en desc nulls last, f.puntos desc, f.cuando nulls last, f.nombre, f.id
  limit 12;
$$;
comment on function public.tira_destacados(text, text) is
  'OL-459: eventos: elegidos, o con al menos 1 Voy, 1 Me interesa o 6 vistas (sin la administración ni quien lo publicó); orden elegidos, puntos (Voy 20, Me interesa 10, vista 1), cercanía; quitado vigente nunca. Lugares y artistas: elegidos o 3 personas con Voy. Máximo 12 (OL-460).';
revoke all on function public.tira_destacados(text, text) from public;
grant execute on function public.tira_destacados(text, text) to anon, authenticated, service_role;

commit;
