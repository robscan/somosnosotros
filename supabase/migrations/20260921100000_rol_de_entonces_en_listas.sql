-- somosnosotros · migración 0044 · el rol de entonces también en las listas y en el carril (OL-093, bitácora 128)
-- La bitácora 101 (OL-070, migración 20260917170000) arregló indicadores_ahora()/panel_comunidad() para comparar
-- cada fila contra rol_en(perfil, fecha) — el rol que tenía la cuenta CUANDO actuó — en vez del rol de hoy. Esa misma
-- bitácora avisó y dejó sin tocar otros sitios con el mismo patrón. Tres de ellos son el origen de L1 y L27 del
-- founder (2026-09-21) y una tercera pantalla ya documentada: panel_eventos()/panel_fichas_conteos() (filtro
-- 'comunidad': la lista y el badge detrás de la tarjeta «Publica la comunidad»), tira_destacados() (el carril de
-- Destacados, CTE `voy`) y panel_personas()/panel_personas_conteos() (filtro y badge 'nuevas', pantalla Personas — el
-- tercer sitio que la bitácora 101 dejó documentado y sin tocar, añadido aquí por no merecer pieza propia; el badge
-- se suma porque es el mismo defecto exacto de L1 en una tercera pantalla, aunque el gestor solo pidió la lista)
-- seguían comparando contra el rol de HOY
-- (perfiles.rol). El número (con rol_en) y la lista o el carril (con el rol de hoy) pueden salir de criterios
-- distintos: si alguien publicó o dijo «voy» siendo usuario y lo ascienden después, el número lo sigue contando pero
-- la lista o el carril lo excluyen — «el número dice 2 y no se ve nada» (L1), o un evento con 3 asistentes reales cae
-- a 2 y desaparece del carril aunque nada cambió en el evento (L27, reproducido en supabase/tests/agenda_numeros.mjs).
--
-- rol_en(perfil, fecha) es security definer con EXECUTE revocado de authenticated a propósito (Security Advisor,
-- 20260918130000): lee perfiles y cambios_de_rol sin ninguna guarda de quién pregunta, así que concederle EXECUTE a
-- authenticated dejaría que cualquier cuenta con sesión preguntara por RPC el rol de cualquier otra en cualquier
-- momento (revisión de gestión de cambios). panel_eventos(), panel_fichas_conteos() y panel_personas() son security
-- invoker desde ese mismo endurecimiento (corren con los privilegios de quien las llama), así que no pueden llamar a
-- rol_en() directamente. En su lugar, un ayudante mínimo que exige es_admin() por dentro antes de delegar en rol_en():
create or replace function public.rol_en_para_admin(p_perfil uuid, p_ts timestamptz) returns text
language sql stable security definer set search_path = '' as $$
  select case when public.es_admin() then public.rol_en(p_perfil, p_ts) end;
$$;
comment on function public.rol_en_para_admin(uuid, timestamptz) is 'rol_en(), pero solo para quien ya es administrador (es_admin() por dentro): null para cualquier otra cuenta. Puente para las funciones invoker (panel_eventos, panel_fichas_conteos, panel_personas) que necesitan el rol de entonces sin heredar el EXECUTE de rol_en() (OL-093, bitácora 128).';
revoke execute on function public.rol_en_para_admin(uuid, timestamptz) from public, anon;
grant execute on function public.rol_en_para_admin(uuid, timestamptz) to authenticated, service_role;

create or replace function public.panel_eventos(p_buscar text default null, p_filtro text default 'proximos', p_limite integer default 30, p_desde integer default 0)
returns table (id uuid, titulo text, imagen text, inicio timestamptz, fin timestamptz, visible boolean, sitio text, autor text, autor_admin boolean, van integer, total bigint)
language sql stable security invoker set search_path = '' as $$
  select e.id, e.titulo, e.imagen, e.inicio, e.fin, e.visible, coalesce(l.nombre, e.sitio_texto), p.nombre, coalesce(p.rol = 'admin', false),
    (select count(*) from public.asistencias a where a.evento_id = e.id and a.estado = 'voy')::int,
    count(*) over ()
  from public.eventos e
  left join public.lugares l on l.id = e.lugar_id
  left join public.perfiles p on p.id = e.creado_por
  where public.es_admin()
    and e.termina >= now()
    and (coalesce(trim(p_buscar), '') = '' or public.normalizar_nombre(p_buscar) <> '' and public.normalizar_nombre(e.titulo) like '%' || public.normalizar_nombre(p_buscar) || '%')
    and case coalesce(p_filtro, 'proximos')
      when 'semana' then e.visible and e.inicio < now() + interval '7 days'
      when 'sin_imagen' then e.visible and e.imagen is null
      when 'comunidad' then e.visible and (p.id is null or public.rol_en_para_admin(p.id, e.creado_en) <> 'admin')
      when 'ocultos' then not e.visible
      else e.visible
    end
  order by e.inicio, e.titulo, e.id
  limit greatest(least(p_limite, 600), 1) offset greatest(p_desde, 0);
$$;

create or replace function public.panel_fichas_conteos(p_tipo text) returns json
language sql stable security invoker set search_path = '' as $$
  select case
    when not public.es_admin() then null
    when p_tipo = 'lugares' then json_build_object(
      'todos', (select count(*) from public.lugares),
      'ocultos', (select count(*) from public.lugares where not visible),
      'sin_fecha', (select count(*) from public.lugares l where l.visible and not l.privado
        and not exists (select 1 from public.eventos e where e.lugar_id = l.id and e.visible and e.termina >= now())),
      'sin_foto', (select count(*) from public.lugares where portada is null),
      'catalogo', (select count(*) from public.lugares where origen = 'capo'))
    when p_tipo = 'eventos' then json_build_object(
      'proximos', (select count(*) from public.eventos e where e.visible and e.termina >= now()),
      'semana', (select count(*) from public.eventos e where e.visible and e.termina >= now() and e.inicio < now() + interval '7 days'),
      'sin_imagen', (select count(*) from public.eventos e where e.visible and e.termina >= now() and e.imagen is null),
      'comunidad', (select count(*) from public.eventos e left join public.perfiles p on p.id = e.creado_por
        where e.visible and e.termina >= now() and (p.id is null or public.rol_en_para_admin(p.id, e.creado_en) <> 'admin')),
      'ocultos', (select count(*) from public.eventos e where not e.visible and e.termina >= now()))
    when p_tipo = 'artistas' then json_build_object(
      'todos', (select count(*) from public.artistas),
      'por_reclamar', (select count(*) from public.artistas a where a.origen = 'capo'
        and not exists (select 1 from public.artistas_cuentas c where c.artista_id = a.id)),
      'llevados', (select count(distinct artista_id) from public.artistas_cuentas),
      'sin_foto', (select count(*) from public.artistas where foto is null),
      'ocultos', (select count(*) from public.artistas where not visible))
  end;
$$;

create or replace function public.tira_destacados(p_tipo text, p_ciudad text)
returns table (id uuid, motivo text, hasta timestamptz, van integer)
language sql stable security definer set search_path = '' as $$
  with
  -- Lo que puede salir: eventos visibles que no han terminado, sin lugar o en un lugar visible y no privado.
  proximos as (
    select e.id, e.lugar_id, e.ciudad, e.inicio, e.titulo
    from public.eventos e
    left join public.lugares l on l.id = e.lugar_id
    where e.visible and e.termina >= now() and (e.lugar_id is null or (l.visible and not l.privado))
  ),
  -- Quién va a cada uno, sin contar a quien era administrador CUANDO dijo «voy» (D2, rol de entonces: OL-093).
  -- Definer: llama a rol_en() directamente, no necesita el ayudante para admins.
  voy as (
    select a.evento_id, a.usuario_id
    from public.asistencias a
    join public.perfiles p on p.id = a.usuario_id
    join proximos e on e.id = a.evento_id
    where a.estado = 'voy' and public.rol_en(p.id, a.creado_en) <> 'admin'
  ),
  van_evento as (select evento_id, count(*)::int as n from voy group by evento_id),
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
  fichas as (
    select e.id, e.inicio, e.titulo as nombre, d.quitado, d.creado_en, d.hasta, coalesce(v.n, 0) as van
    from proximos e
    left join public.destacados d on d.evento_id = e.id
    left join van_evento v on v.evento_id = e.id
    where p_tipo = 'eventos' and e.ciudad = p_ciudad
    union all
    select l.id, null, l.nombre, d.quitado, d.creado_en, d.hasta, coalesce(v.n, 0)
    from public.lugares l
    left join public.destacados d on d.lugar_id = l.id and d.hasta > now()
    left join van_lugar v on v.lugar_id = l.id
    where p_tipo = 'lugares' and l.visible and not l.privado and l.ciudad = p_ciudad
    union all
    select a.id, null, a.nombre, d.quitado, d.creado_en, d.hasta, coalesce(v.n, 0)
    from public.artistas a
    left join public.destacados d on d.artista_id = a.id and d.hasta > now()
    left join van_artista v on v.artista_id = a.id
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

-- El tercer sitio que la bitácora 101 dejó documentado y sin tocar (ampliación pedida por el gestor): panel_personas(),
-- filtro 'nuevas', pantalla Personas — mismo patrón. A diferencia de panel_eventos()/panel_fichas_conteos(), el
-- Security Advisor NO puso panel_personas() en security invoker (solo le cambió el search_path): sigue security
-- definer, así que llama a rol_en() directamente, igual que tira_destacados(), sin necesitar el ayudante de arriba.
create or replace function public.panel_personas(p_buscar text default null, p_filtro text default 'todas', p_limite integer default 30, p_desde integer default 0)
returns table (
  id uuid, nombre text, foto text, rol text, reservado boolean, creado_en timestamptz, confirmado boolean,
  ultima_entrada timestamptz, visto date, correo_oculto text, va_a integer, sigue integer, publico integer,
  lleva text, lleva_n integer, total bigint
)
language sql stable security definer set search_path = '' as $$
  with base as (
    select p.id, p.nombre, p.foto, p.rol, p.reservado, p.creado_en,
      u.email_confirmed_at is not null as confirmado, u.last_sign_in_at as ultima_entrada, v.dia as visto, u.email
    from public.perfiles p
    join auth.users u on u.id = p.id
    left join public.cuentas_vistas v on v.perfil_id = p.id
    where public.es_admin()
      and (coalesce(trim(p_buscar), '') = ''
        or (public.normalizar_nombre(p_buscar) <> '' and public.normalizar_nombre(p.nombre) like '%' || public.normalizar_nombre(p_buscar) || '%')
        or lower(u.email) like '%' || replace(replace(replace(lower(trim(p_buscar)), '\', '\\'), '%', '\%'), '_', '\_') || '%')
      and case coalesce(p_filtro, 'todas')
        when 'nuevas' then public.rol_en(p.id, p.creado_en) <> 'admin' and p.creado_en >= now() - interval '7 days'
        when 'sin_entrar' then u.last_sign_in_at is null
        when 'administracion' then p.rol = 'admin'
        else true
      end
  ),
  fichas as (
    select c.perfil_id, a.nombre, c.creado_en from public.artistas_cuentas c join public.artistas a on a.id = c.artista_id
    union all
    select c.perfil_id, l.nombre, c.creado_en from public.lugares_cuentas c join public.lugares l on l.id = c.lugar_id
  )
  select b.id, b.nombre, b.foto, b.rol, b.reservado, b.creado_en, b.confirmado, b.ultima_entrada, b.visto,
    case when b.email is null then null else left(split_part(b.email, '@', 1), 2) || '…@' || split_part(b.email, '@', 2) end,
    (select count(*) from public.asistencias a join public.eventos e on e.id = a.evento_id
      where a.usuario_id = b.id and a.estado = 'voy' and e.visible and e.termina >= now())::int,
    (select count(*) from public.seguimientos s where s.usuario_id = b.id)::int,
    ((select count(*) from public.lugares l where l.creado_por = b.id)
      + (select count(*) from public.eventos e where e.creado_por = b.id)
      + (select count(*) from public.artistas a where a.creado_por = b.id))::int,
    (select f.nombre from fichas f where f.perfil_id = b.id order by f.creado_en limit 1),
    (select count(*) from fichas f where f.perfil_id = b.id)::int,
    count(*) over ()
  from base b
  order by greatest(b.ultima_entrada, b.visto::timestamp at time zone 'America/Mexico_City', b.creado_en) desc nulls last, b.nombre, b.id
  limit greatest(least(p_limite, 600), 1) offset greatest(p_desde, 0);
$$;

-- El badge 'nuevas' de la pantalla Personas (chip junto al filtro) sale de panel_personas_conteos(), no de
-- panel_personas(): mismo patrón exacto, sin tocarlo se repetiría aquí mismo el defecto de L1 (número con un
-- criterio, lista con otro) en una tercera pantalla. También security definer, mismo tratamiento que panel_personas().
create or replace function public.panel_personas_conteos() returns json
language sql stable security definer set search_path = '' as $$
  select case when public.es_admin() then json_build_object(
    'todas', (select count(*) from public.perfiles),
    'nuevas', (select count(*) from public.perfiles where public.rol_en(id, creado_en) <> 'admin' and creado_en >= now() - interval '7 days'),
    'sin_entrar', (select count(*) from public.perfiles p join auth.users u on u.id = p.id where u.last_sign_in_at is null),
    'administracion', (select count(*) from public.perfiles where rol = 'admin')
  ) end;
$$;
