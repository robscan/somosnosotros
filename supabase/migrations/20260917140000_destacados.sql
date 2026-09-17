-- somosnosotros · migración 0030 · destacados (docs/rediseno/20, firmado por el founder el 2026-09-16: «1A, 2A, 3A, 4A»)
-- Arriba de la Agenda, de Lugares y de Artistas, una tira con lo que elige la administración y lo que tiene más asistentes:
--   · un evento elegido dura hasta que pasa; un lugar o un artista, dos semanas;
--   · por asistentes entra lo que tiene al menos 3 «Voy», sin contar a la administración (D2); en un lugar o un artista
--     cuentan quienes van a sus próximos eventos (D1);
--   · la administración también quita lo que entra por asistentes, por el mismo tiempo (D3);
--   · hasta 8 por sección, solo de la ciudad que se ve, y nunca algo oculto, privado o que ya pasó.
-- No se cuentan visitas ni se guarda nada nuevo de las personas. Solo añade: una tabla y cuatro funciones.

-- ---------- lo que decide la administración ----------
-- Una ficha por renglón: elegida (quitado = false) o quitada aunque tenga asistentes (quitado = true).
create table public.destacados (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references public.eventos (id) on delete cascade,
  lugar_id uuid references public.lugares (id) on delete cascade,
  artista_id uuid references public.artistas (id) on delete cascade,
  quitado boolean not null default false,
  -- Lugares y artistas: hasta cuándo. Eventos: null, vale mientras no pase.
  hasta timestamptz,
  creado_por uuid default auth.uid() references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  constraint destacados_una_ficha check (num_nonnulls(evento_id, lugar_id, artista_id) = 1),
  constraint destacados_hasta check ((evento_id is null) = (hasta is not null))
);
comment on table public.destacados is 'Lo que la administración eligió destacar o quitó de destacados. Lo que entra por asistentes se calcula en public.tira_destacados().';
create unique index destacados_evento_unico on public.destacados (evento_id) where evento_id is not null;
create unique index destacados_lugar_unico on public.destacados (lugar_id) where lugar_id is not null;
create unique index destacados_artista_unico on public.destacados (artista_id) where artista_id is not null;

alter table public.destacados enable row level security;
create policy "destacados: solo la administración" on public.destacados for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ---------- la tira de una sección ----------
-- Definer, como van_por_evento: cuenta los «Voy» de todas las cuentas, también las reservadas, sin decir de quién.
create function public.tira_destacados(p_tipo text, p_ciudad text)
returns table (id uuid, motivo text, hasta timestamptz, van integer)
language sql stable security definer set search_path = public as $$
  with
  van as (
    select a.evento_id, count(*)::int as n
    from public.asistencias a
    join public.perfiles p on p.id = a.usuario_id
    join public.eventos e on e.id = a.evento_id
    where a.estado = 'voy' and p.rol <> 'admin' and e.visible and e.termina >= now()
    group by a.evento_id
  ),
  fichas as (
    select e.id, e.inicio, e.titulo as nombre, d.quitado, d.creado_en, d.hasta, coalesce(v.n, 0) as van
    from public.eventos e
    left join public.destacados d on d.evento_id = e.id
    left join van v on v.evento_id = e.id
    where p_tipo = 'eventos' and e.visible and e.ciudad = p_ciudad and e.termina >= now()
    union all
    select l.id, null, l.nombre, d.quitado, d.creado_en, d.hasta,
      coalesce((select sum(v.n) from van v join public.eventos e on e.id = v.evento_id where e.lugar_id = l.id), 0)::int
    from public.lugares l
    left join public.destacados d on d.lugar_id = l.id and d.hasta > now()
    where p_tipo = 'lugares' and l.visible and not l.privado and l.ciudad = p_ciudad
    union all
    select a.id, null, a.nombre, d.quitado, d.creado_en, d.hasta,
      coalesce((select sum(v.n) from van v join public.eventos_artistas ea on ea.evento_id = v.evento_id where ea.artista_id = a.id), 0)::int
    from public.artistas a
    left join public.destacados d on d.artista_id = a.id and d.hasta > now()
    where p_tipo = 'artistas' and a.visible and a.ciudad = p_ciudad
  ),
  -- Primero lo elegido, lo más reciente antes; después por asistentes. Se quedan 8.
  tira as (
    select * from fichas
    where quitado is false or (quitado is null and van >= 3)
    order by quitado is false desc, creado_en desc nulls last, van desc, nombre, id
    limit 8
  )
  select t.id, case when t.quitado is false then 'elegido' else 'asistentes' end, t.hasta, t.van
  from tira t
  -- En la agenda, por día y hora; en lugares y artistas, en el mismo orden de arriba.
  order by t.inicio nulls last, t.quitado is false desc, t.creado_en desc nulls last, t.van desc, t.nombre, t.id;
$$;
comment on function public.tira_destacados(text, text) is 'La tira de destacados de una sección (eventos, lugares o artistas) en una ciudad: id, por qué (elegido o asistentes), hasta cuándo y cuántos van.';

-- ---------- destacar, quitar o dejar como estaba ----------
-- Invoker: la regla por fila vuelve a exigir la administración.
create function public.cambiar_destacado(p_tipo text, p_id uuid, p_estado text) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not public.es_admin() then
    raise exception 'Solo la administración cambia los destacados' using errcode = '42501';
  end if;
  if p_tipo not in ('eventos', 'lugares', 'artistas') or p_estado not in ('elegido', 'quitado', 'ninguno') then
    raise exception 'Destacado no válido' using errcode = '22023';
  end if;
  delete from public.destacados
  where case p_tipo when 'eventos' then evento_id when 'lugares' then lugar_id else artista_id end = p_id;
  if p_estado <> 'ninguno' then
    insert into public.destacados (evento_id, lugar_id, artista_id, quitado, hasta)
    values (
      case when p_tipo = 'eventos' then p_id end,
      case when p_tipo = 'lugares' then p_id end,
      case when p_tipo = 'artistas' then p_id end,
      p_estado = 'quitado',
      case when p_tipo <> 'eventos' then now() + interval '14 days' end
    );
  end if;
end;
$$;

-- ---------- el panel: los destacados de un tipo en todas las ciudades ----------
create function public.panel_destacados(p_tipo text)
returns table (id uuid, nombre text, foto text, motivo text, hasta timestamptz, van integer)
language sql stable security definer set search_path = public as $$
  select d.id, coalesce(e.titulo, l.nombre, a.nombre), coalesce(e.imagen, l.portada, a.foto), d.motivo, d.hasta, d.van
  from (
    select ciudad from public.eventos where p_tipo = 'eventos'
    union select ciudad from public.lugares where p_tipo = 'lugares'
    union select ciudad from public.artistas where p_tipo = 'artistas'
  ) c
  cross join lateral public.tira_destacados(p_tipo, c.ciudad) d
  left join public.eventos e on p_tipo = 'eventos' and e.id = d.id
  left join public.lugares l on p_tipo = 'lugares' and l.id = d.id
  left join public.artistas a on p_tipo = 'artistas' and a.id = d.id
  where public.es_admin()
  order by 2, 1;
$$;

-- ---------- permisos ----------
revoke execute on function public.cambiar_destacado(text, uuid, text) from public, anon;
revoke execute on function public.panel_destacados(text) from public, anon;
grant execute on function public.tira_destacados(text, text) to anon, authenticated;
grant execute on function public.cambiar_destacado(text, uuid, text) to authenticated;
grant execute on function public.panel_destacados(text) to authenticated;
