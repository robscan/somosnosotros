-- OL-459 · Destacados automáticos por interés y vistas (bitácora 491).
-- Pedido del founder (2026-10-23): «Quisiera que los eventos con un me interesa, voy o con más de 5 vistas se formen en
-- destacados de manera automática». Sustituye, solo para eventos, la regla firmada del doc 20 (2026-09-16: al menos 3 «Voy»).
--
-- Solo añade: una tabla nueva (`vistas_evento`) con su sal secreta, una función nueva para contar una vista
-- (`contar_vista_evento`) y `create or replace` de `tira_destacados` con la MISMA firma y las MISMAS columnas
-- (id, motivo, hasta, van): `artistas_destacados_novedades` la lee por posición y no cambia.
--
-- La regla nueva de eventos (futuros o en curso, visibles, sin lugar o en uno visible y no privado):
--   entra lo que eligió la administración, o lo que tiene al menos 1 «Voy», o al menos 1 «Me interesa», o 6 vistas o más.
--   Un quitado vigente nunca sale. No cuentan la administración (rol de entonces) ni quien publicó el evento.
-- Orden: elegidos primero (lo más reciente antes); luego por puntos (Voy 20, Me interesa 10, cada vista 1); luego lo más
-- cercano en el tiempo (lo que ya está en curso cuenta como «ahora»). Tope: 8, el de siempre.
-- Lugares y artistas: sin cambio (elegidos y al menos 3 personas con «Voy» a sus eventos).
begin;

-- ---------- Las vistas de la ficha de un evento, sin datos personales ----------
-- Una fila por visitante, por evento y por día (en la zona del evento). La clave es un resumen (sha256) de una sal secreta,
-- el visitante, el evento y el día: no guarda la cuenta, ni la cookie, ni la IP, y no se puede unir con otro día ni con
-- otro evento. Solo sirve para no contar dos veces lo mismo el mismo día.
create table public.vistas_evento (
  evento_id uuid not null references public.eventos(id) on delete cascade,
  dia date not null,
  clave text not null check (clave ~ '^[0-9a-f]{64}$'),
  primary key (evento_id, dia, clave)
);
comment on table public.vistas_evento is
  'OL-459: una vista por visitante, evento y día. La clave es sha256(sal, visitante, evento, día): sin cuenta, cookie ni IP. Solo la escribe contar_vista_evento y la lee tira_destacados.';
alter table public.vistas_evento enable row level security;
revoke all on public.vistas_evento from public, anon, authenticated;

-- La sal: un valor al azar que solo leen las funciones de la base (ninguna política, ningún permiso).
create table public.vistas_sal (
  id boolean primary key default true check (id),
  sal text not null default gen_random_uuid()::text
);
comment on table public.vistas_sal is 'OL-459: la sal secreta de vistas_evento. Nadie la lee fuera de contar_vista_evento.';
insert into public.vistas_sal default values;
alter table public.vistas_sal enable row level security;
revoke all on public.vistas_sal from public, anon, authenticated;

-- Cuenta una vista. La llama solo el servidor de la app (POST /api/vista, con la llave de servicio): así nadie suma vistas
-- con la llave pública. p_visitante: el id de la cuenta o el identificador anónimo de la cookie (16 a 64 caracteres
-- simples); p_usuario: la cuenta, si hay, solo para no contar a la administración ni a quien publicó el evento.
-- Devuelve true si contó (la primera del día de ese visitante), false si no.
create function public.contar_vista_evento(p_evento uuid, p_visitante text, p_usuario uuid default null)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_autor uuid;
  v_zona text;
  v_dia date;
  v_sal text;
begin
  if p_evento is null or p_visitante is null or p_visitante !~ '^[A-Za-z0-9_-]{16,64}$' then
    return false;
  end if;
  select e.creado_por, e.zona into v_autor, v_zona
  from public.eventos e
  left join public.lugares l on l.id = e.lugar_id
  where e.id = p_evento and e.visible and e.termina >= now() and (e.lugar_id is null or (l.visible and not l.privado));
  if not found then
    return false;
  end if;
  if p_usuario is not null and (p_usuario = v_autor or public.rol_en(p_usuario, now()) = 'admin') then
    return false;
  end if;
  v_dia := (now() at time zone coalesce(v_zona, 'America/Mexico_City'))::date;
  select s.sal into v_sal from public.vistas_sal s;
  insert into public.vistas_evento (evento_id, dia, clave)
  values (p_evento, v_dia, encode(sha256(convert_to(v_sal || ':' || p_visitante || ':' || p_evento::text || ':' || v_dia::text, 'UTF8')), 'hex'))
  on conflict do nothing;
  return found;
end;
$$;
comment on function public.contar_vista_evento(uuid, text, uuid) is
  'OL-459: una vista por visitante, evento y día; no cuenta a la administración ni a quien publicó el evento, ni eventos ocultos o que ya pasaron. Solo service_role.';
revoke all on function public.contar_vista_evento(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.contar_vista_evento(uuid, text, uuid) to service_role;

-- ---------- La tira, con la regla nueva de eventos ----------
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
  -- Primero lo elegido, lo más reciente antes; después por puntos y, a iguales puntos, lo más cercano en el tiempo. Se quedan 8.
  select f.id, case when f.quitado is false then 'elegido' else f.senal end, f.hasta, f.van
  from fichas f
  where f.quitado is false or (f.quitado is null and f.senal is not null)
  order by f.quitado is false desc, f.creado_en desc nulls last, f.puntos desc, f.cuando nulls last, f.nombre, f.id
  limit 8;
$$;
comment on function public.tira_destacados(text, text) is
  'OL-459: eventos: elegidos, o con al menos 1 Voy, 1 Me interesa o 6 vistas (sin la administración ni quien lo publicó); orden elegidos, puntos (Voy 20, Me interesa 10, vista 1), cercanía; quitado vigente nunca. Lugares y artistas: elegidos o 3 personas con Voy. Máximo 8.';
revoke all on function public.tira_destacados(text, text) from public;
grant execute on function public.tira_destacados(text, text) to anon, authenticated, service_role;

commit;
