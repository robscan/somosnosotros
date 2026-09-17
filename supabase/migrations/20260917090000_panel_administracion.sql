-- somosnosotros · migración 0025 · panel de administración (docs/rediseno/18 y 19, firmados por el founder el 2026-09-16)
-- Lo que el panel lee y hace, y ningún cliente puede por sí mismo:
--   · cuatro indicadores de los últimos 7 días y su foto diaria (conteos, sin datos personales);
--   · lo pendiente con el nombre de la ficha; personas con su cuenta de acceso (correo oculto) y su actividad;
--   · listas de lugares, eventos y artistas con filtros por lo que pide atención;
--   · hacer o quitar administradores, solo desde las cuentas de origen (D1) y con registro de quién y cuándo;
--   · el último día que cada cuenta abrió la app (D3): solo el día, ni la hora ni qué miró.
-- Nada nuevo en `perfiles`: esa tabla se lee sin sesión (revisión 2026-09-14). Lo nuevo vive en tablas que solo lee la
-- administración y en funciones que comprueban el rol por dentro.

-- ---------- ¿ya pasó? (la misma regla que filtroSinPasar en src/lib/fechas.ts) ----------
create function public.sin_pasar(p_inicio timestamptz, p_fin timestamptz) returns boolean
language sql stable set search_path = public as $$
  select case
    when p_fin is not null then p_fin >= now()
    else p_inicio >= (date_trunc('day', now() at time zone 'America/Mexico_City') at time zone 'America/Mexico_City')
  end;
$$;
comment on function public.sin_pasar(timestamptz, timestamptz) is 'El evento no ha pasado: con hora de fin, hasta que termina; sin ella, hasta que acaba su día en la ciudad.';

-- ---------- tablas ----------
-- Quién cambió el rol de quién y cuándo (decisión 9). Escribe solo cambiar_rol.
create table public.cambios_de_rol (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  rol text not null check (rol in ('admin', 'usuario')),
  por uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);
create index cambios_de_rol_perfil_idx on public.cambios_de_rol (perfil_id, creado_en desc);

-- El último día (en la ciudad) que cada cuenta abrió la app (D3). Escribe solo marcar_visto.
create table public.cuentas_vistas (
  perfil_id uuid primary key references public.perfiles (id) on delete cascade,
  dia date not null
);
comment on table public.cuentas_vistas is 'Solo el último día que la cuenta abrió la app: ni la hora ni qué miró. La lee la administración.';

-- La foto de cada día de los indicadores, para comparar con hace una semana y dibujar la tendencia. Solo conteos.
create table public.indicadores_diarios (
  dia date primary key,
  activas integer not null,
  cuentas integer not null,
  coincidencias integer not null,
  eventos_semana integer not null,
  lugares_con_fecha integer not null,
  lugares integer not null,
  comunidad integer not null,
  proximos integer not null,
  guardado_en timestamptz not null default now()
);

alter table public.cambios_de_rol enable row level security;
alter table public.cuentas_vistas enable row level security;
alter table public.indicadores_diarios enable row level security;
create policy "cambios_de_rol: lee la administración" on public.cambios_de_rol for select to authenticated using (public.es_admin());
create policy "cuentas_vistas: lee la administración" on public.cuentas_vistas for select to authenticated using (public.es_admin());
create policy "indicadores_diarios: lee la administración" on public.indicadores_diarios for select to authenticated using (public.es_admin());

-- ---------- ¿soy administrador de origen? (D1) ----------
-- De origen: administrador y con su correo en admin_correos (las cuentas que nacen administradoras). Solo ellas hacen o
-- quitan administradores; a una cuenta de origen no se le quita el rol desde la app.
create function public.es_admin_de_origen() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfiles p
    join auth.users u on u.id = p.id
    join public.admin_correos a on lower(a.correo) = lower(u.email)
    where p.id = auth.uid() and p.rol = 'admin'
  );
$$;

-- ---------- indicadores de ahora (sin permiso para clientes: los usan panel_resumen y guardar_indicadores) ----------
create function public.indicadores_ahora() returns json
language sql stable security definer set search_path = public as $$
  with
  admins as (select id from public.perfiles where rol = 'admin'),
  hoy as (select (now() at time zone 'America/Mexico_City')::date as d),
  gente as (
    select p.id, p.creado_en, p.novedades_vistas_en, u.last_sign_in_at, v.dia as visto
    from public.perfiles p
    join auth.users u on u.id = p.id
    left join public.cuentas_vistas v on v.perfil_id = p.id
    where p.rol <> 'admin'
  ),
  senales as (
    select g.id,
      coalesce(g.visto > (select d from hoy) - 7, false) or coalesce(g.novedades_vistas_en >= now() - interval '7 days', false) or coalesce(g.last_sign_in_at >= now() - interval '7 days', false) as abrio,
      exists (select 1 from public.asistencias a where a.usuario_id = g.id and a.creado_en >= now() - interval '7 days') as voy,
      exists (select 1 from public.seguimientos s where s.usuario_id = g.id and s.creado_en >= now() - interval '7 days') as siguio,
      exists (select 1 from public.lugares l where l.creado_por = g.id and l.creado_en >= now() - interval '7 days')
        or exists (select 1 from public.eventos e where e.creado_por = g.id and e.creado_en >= now() - interval '7 days')
        or exists (select 1 from public.artistas a where a.creado_por = g.id and a.creado_en >= now() - interval '7 days') as publico,
      exists (select 1 from public.reportes r where r.creado_por = g.id and r.creado_en >= now() - interval '7 days') as reporto,
      g.creado_en >= now() - interval '7 days' as nueva
    from gente g
  ),
  proximos as (
    select e.id, e.titulo, e.inicio, e.lugar_id, e.creado_por, e.creado_en
    from public.eventos e
    where e.visible and public.sin_pasar(e.inicio, e.fin)
  ),
  semana as (select * from proximos where inicio < now() + interval '7 days'),
  van as (
    select s.id, s.titulo, count(*) as n
    from semana s
    join public.asistencias a on a.evento_id = s.id and a.estado = 'voy'
    where a.usuario_id not in (select id from admins)
    group by s.id, s.titulo
  ),
  lugares_visibles as (select l.id from public.lugares l where l.visible and not l.privado),
  comunidad as (select * from proximos p where p.creado_por is null or p.creado_por not in (select id from admins))
  select json_build_object(
    'activas', (select count(*) from senales where abrio or voy or siguio or publico or reporto),
    'cuentas', (select count(*) from gente),
    'coincidencias', (select count(*) from van where n >= 2),
    'eventos_semana', (select count(*) from semana),
    'lugares_con_fecha', (select count(distinct p.lugar_id) from proximos p where p.lugar_id in (select id from lugares_visibles)),
    'lugares', (select count(*) from lugares_visibles),
    'comunidad', (select count(*) from comunidad),
    'proximos', (select count(*) from proximos),
    'comunidad_nuevos', (select count(*) from comunidad where creado_en >= now() - interval '7 days'),
    'desglose', json_build_object(
      'abrieron', (select count(*) from senales where abrio),
      'voy', (select count(*) from senales where voy),
      'siguieron', (select count(*) from senales where siguio),
      'publicaron', (select count(*) from senales where publico),
      'nuevas', (select count(*) from senales where nueva),
      'con_2', (select count(*) from van where n = 2),
      'con_3_a_5', (select count(*) from van where n between 3 and 5),
      'con_6_o_mas', (select count(*) from van where n >= 6),
      'mayor', (select json_build_object('id', id, 'titulo', titulo, 'n', n) from van where n >= 2 order by n desc, titulo limit 1),
      'personas_que_publican', (select count(distinct creado_por) from comunidad where creado_por is not null)
    )
  );
$$;

-- ---------- la foto del día (la toma la tarea de cada mañana con la llave de servicio) ----------
create function public.guardar_indicadores() returns void
language plpgsql security definer set search_path = public as $$
declare
  j json := public.indicadores_ahora();
begin
  insert into public.indicadores_diarios (dia, activas, cuentas, coincidencias, eventos_semana, lugares_con_fecha, lugares, comunidad, proximos)
  values ((now() at time zone 'America/Mexico_City')::date, (j ->> 'activas')::int, (j ->> 'cuentas')::int, (j ->> 'coincidencias')::int,
    (j ->> 'eventos_semana')::int, (j ->> 'lugares_con_fecha')::int, (j ->> 'lugares')::int, (j ->> 'comunidad')::int, (j ->> 'proximos')::int)
  on conflict (dia) do update set activas = excluded.activas, cuentas = excluded.cuentas, coincidencias = excluded.coincidencias,
    eventos_semana = excluded.eventos_semana, lugares_con_fecha = excluded.lugares_con_fecha, lugares = excluded.lugares,
    comunidad = excluded.comunidad, proximos = excluded.proximos, guardado_en = now();
end $$;

-- ---------- el resumen del panel ----------
create function public.panel_resumen() returns json
language plpgsql security definer set search_path = public as $$
declare
  ahora json;
  hoy date := (now() at time zone 'America/Mexico_City')::date;
begin
  if not public.es_admin() then
    raise exception 'solo la administración' using errcode = '42501';
  end if;
  ahora := public.indicadores_ahora();
  -- Si la tarea de la mañana no dejó la foto de hoy, la deja el primer vistazo del día.
  insert into public.indicadores_diarios (dia, activas, cuentas, coincidencias, eventos_semana, lugares_con_fecha, lugares, comunidad, proximos)
  values (hoy, (ahora ->> 'activas')::int, (ahora ->> 'cuentas')::int, (ahora ->> 'coincidencias')::int, (ahora ->> 'eventos_semana')::int,
    (ahora ->> 'lugares_con_fecha')::int, (ahora ->> 'lugares')::int, (ahora ->> 'comunidad')::int, (ahora ->> 'proximos')::int)
  on conflict (dia) do nothing;
  return json_build_object(
    'ahora', ahora,
    'historia', (
      select coalesce(json_agg(json_build_object('dia', i.dia, 'activas', i.activas, 'coincidencias', i.coincidencias, 'eventos_semana', i.eventos_semana, 'comunidad', i.comunidad) order by i.dia), '[]'::json)
      from public.indicadores_diarios i
      where i.dia >= hoy - 90 and i.dia < hoy
    ),
    'gestionar', json_build_object(
      'personas', (select count(*) from public.perfiles),
      'personas_nuevas', (select count(*) from public.perfiles where rol <> 'admin' and creado_en >= now() - interval '7 days'),
      'nunca_entraron', (select count(*) from public.perfiles p join auth.users u on u.id = p.id where u.last_sign_in_at is null),
      'correo_con_problema', (select count(*) from public.perfiles where avisos_correo_motivo in ('rebote', 'queja')),
      'lugares', (select count(*) from public.lugares where visible and not privado),
      'lugares_sin_fecha', (select count(*) from public.lugares l where l.visible and not l.privado
        and not exists (select 1 from public.eventos e where e.lugar_id = l.id and e.visible and public.sin_pasar(e.inicio, e.fin))),
      'lugares_ocultos', (select count(*) from public.lugares where not visible),
      'lugares_privados', (select count(*) from public.lugares where privado),
      'eventos', (select count(*) from public.eventos e where e.visible and public.sin_pasar(e.inicio, e.fin)),
      'eventos_sin_imagen', (select count(*) from public.eventos e where e.visible and public.sin_pasar(e.inicio, e.fin) and e.imagen is null),
      'artistas', (select count(*) from public.artistas where visible),
      'artistas_ocultos', (select count(*) from public.artistas where not visible),
      'artistas_llevados', (select count(distinct artista_id) from public.artistas_cuentas),
      'invitaciones', (select count(*) from public.invitaciones_enviadas)
    )
  );
end $$;

-- ---------- lo pendiente, con el nombre de la ficha y de quien lo pide (del más viejo al más nuevo) ----------
create function public.panel_pendientes()
returns table (id uuid, tipo text, objeto_id uuid, motivo text, detalle text, creado_en timestamptz, creado_por uuid, autor text, objeto text, objeto_visible boolean)
language sql stable security definer set search_path = public as $$
  select r.id, r.tipo, r.objeto_id, r.motivo, r.detalle, r.creado_en, r.creado_por, pa.nombre,
    case r.tipo when 'lugar' then l.nombre when 'evento' then e.titulo when 'artista' then a.nombre else pp.nombre end,
    case r.tipo when 'lugar' then l.visible when 'evento' then e.visible when 'artista' then a.visible else true end
  from public.reportes r
  left join public.perfiles pa on pa.id = r.creado_por
  left join public.lugares l on r.tipo = 'lugar' and l.id = r.objeto_id
  left join public.eventos e on r.tipo = 'evento' and e.id = r.objeto_id
  left join public.artistas a on r.tipo = 'artista' and a.id = r.objeto_id
  left join public.perfiles pp on r.tipo = 'perfil' and pp.id = r.objeto_id
  where not r.atendido and public.es_admin()
  order by r.creado_en, r.id
  limit 100;
$$;

-- ---------- personas ----------
create function public.panel_personas(p_buscar text default null, p_filtro text default 'todas', p_limite integer default 30, p_desde integer default 0)
returns table (
  id uuid, nombre text, foto text, rol text, reservado boolean, creado_en timestamptz, confirmado boolean,
  ultima_entrada timestamptz, visto date, correo_oculto text, va_a integer, sigue integer, publico integer,
  lleva text, lleva_n integer, total bigint
)
language sql stable security definer set search_path = public as $$
  with base as (
    select p.id, p.nombre, p.foto, p.rol, p.reservado, p.creado_en,
      u.email_confirmed_at is not null as confirmado, u.last_sign_in_at as ultima_entrada, v.dia as visto, u.email
    from public.perfiles p
    join auth.users u on u.id = p.id
    left join public.cuentas_vistas v on v.perfil_id = p.id
    where public.es_admin()
      and (coalesce(trim(p_buscar), '') = ''
        or public.normalizar_nombre(p.nombre) like '%' || public.normalizar_nombre(p_buscar) || '%'
        or lower(u.email) like '%' || lower(trim(p_buscar)) || '%')
      and case coalesce(p_filtro, 'todas')
        when 'nuevas' then p.rol <> 'admin' and p.creado_en >= now() - interval '7 days'
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
      where a.usuario_id = b.id and a.estado = 'voy' and e.visible and public.sin_pasar(e.inicio, e.fin))::int,
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

create function public.panel_personas_conteos() returns json
language sql stable security definer set search_path = public as $$
  select case when public.es_admin() then json_build_object(
    'todas', (select count(*) from public.perfiles),
    'nuevas', (select count(*) from public.perfiles where rol <> 'admin' and creado_en >= now() - interval '7 days'),
    'sin_entrar', (select count(*) from public.perfiles p join auth.users u on u.id = p.id where u.last_sign_in_at is null),
    'administracion', (select count(*) from public.perfiles where rol = 'admin')
  ) end;
$$;

-- La ficha de administración de una persona: cuenta, actividad y rol, con lo que hace falta para decidir las guardas.
create function public.panel_persona(p_perfil uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', p.id, 'nombre', p.nombre, 'foto', p.foto, 'colonia', p.colonia, 'reservado', p.reservado, 'rol', p.rol, 'creado_en', p.creado_en,
    'correo_oculto', case when u.email is null then null else left(split_part(u.email, '@', 1), 2) || '…@' || split_part(u.email, '@', 2) end,
    'confirmado', u.email_confirmed_at is not null,
    'ultima_entrada', u.last_sign_in_at,
    'visto', v.dia,
    'avisos_correo', p.avisos_correo,
    'avisos_correo_motivo', p.avisos_correo_motivo,
    'telefonos', (select count(*) from public.suscripciones_push s where s.usuario_id = p.id),
    'va_a', (select count(*) from public.asistencias a join public.eventos e on e.id = a.evento_id
      where a.usuario_id = p.id and a.estado = 'voy' and e.visible and public.sin_pasar(e.inicio, e.fin)),
    'le_interesa', (select count(*) from public.asistencias a join public.eventos e on e.id = a.evento_id
      where a.usuario_id = p.id and a.estado = 'me_interesa' and e.visible and public.sin_pasar(e.inicio, e.fin)),
    'sigue_lugares', (select count(*) from public.seguimientos s where s.usuario_id = p.id and s.lugar_id is not null),
    'sigue_artistas', (select count(*) from public.seguimientos s where s.usuario_id = p.id and s.artista_id is not null),
    'publico_lugares', (select count(*) from public.lugares l where l.creado_por = p.id),
    'publico_eventos', (select count(*) from public.eventos e where e.creado_por = p.id),
    'publico_artistas', (select count(*) from public.artistas a where a.creado_por = p.id),
    'lleva', (
      select coalesce(json_agg(json_build_object('tipo', x.tipo, 'id', x.id, 'nombre', x.nombre) order by x.nombre), '[]'::json)
      from (
        select 'artista' as tipo, a.id, a.nombre from public.artistas_cuentas c join public.artistas a on a.id = c.artista_id where c.perfil_id = p.id
        union all
        select 'lugar', l.id, l.nombre from public.lugares_cuentas c join public.lugares l on l.id = c.lugar_id where c.perfil_id = p.id
      ) x
    ),
    'reclamos', (select count(*) from public.reportes r where r.creado_por = p.id and r.motivo in ('es_mio', 'retirar')),
    'reportes', (select count(*) from public.reportes r where r.creado_por = p.id and r.motivo not in ('es_mio', 'retirar')),
    'pendientes', (select count(*) from public.reportes r where r.creado_por = p.id and not r.atendido),
    'de_origen', exists (select 1 from public.admin_correos a where lower(a.correo) = lower(u.email)),
    'es_yo', p.id = auth.uid(),
    'puedo_cambiar_rol', public.es_admin_de_origen(),
    'administradores', (select count(*) from public.perfiles where rol = 'admin'),
    'cambio_rol', (
      select json_build_object('rol', c.rol, 'creado_en', c.creado_en, 'por', c.por, 'por_nombre', pp.nombre)
      from public.cambios_de_rol c left join public.perfiles pp on pp.id = c.por
      where c.perfil_id = p.id
      order by c.creado_en desc
      limit 1
    )
  )
  from public.perfiles p
  join auth.users u on u.id = p.id
  left join public.cuentas_vistas v on v.perfil_id = p.id
  where p.id = p_perfil and public.es_admin();
$$;

-- El correo completo, al tocar "Ver" (D2).
create function public.panel_correo(p_perfil uuid) returns text
language sql stable security definer set search_path = public as $$
  select u.email from auth.users u where u.id = p_perfil and public.es_admin();
$$;

-- ---------- hacer o quitar administradores (decisión 9, D1) ----------
-- Devuelve 'ok' o la causa por la que no se hizo: sin_permiso, rol_desconocido, no_existe, sin_cambio, sin_confirmar,
-- a_ti_mismo, de_origen, ultimo. El trigger proteger_rol sigue como segunda barrera.
create function public.cambiar_rol(p_perfil uuid, p_rol text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_rol text;
  v_confirmado boolean;
  v_origen boolean;
begin
  if not public.es_admin_de_origen() then
    return 'sin_permiso';
  end if;
  if p_rol is null or p_rol not in ('admin', 'usuario') then
    return 'rol_desconocido';
  end if;
  select p.rol, u.email_confirmed_at is not null, exists (select 1 from public.admin_correos a where lower(a.correo) = lower(u.email))
    into v_rol, v_confirmado, v_origen
  from public.perfiles p join auth.users u on u.id = p.id
  where p.id = p_perfil
  for update of p;
  if not found then
    return 'no_existe';
  end if;
  if v_rol = p_rol then
    return 'sin_cambio';
  end if;
  if p_rol = 'admin' and not v_confirmado then
    return 'sin_confirmar';
  end if;
  if p_rol = 'usuario' then
    if p_perfil = auth.uid() then
      return 'a_ti_mismo';
    end if;
    if v_origen then
      return 'de_origen';
    end if;
    if (select count(*) from public.perfiles where rol = 'admin') <= 1 then
      return 'ultimo';
    end if;
  end if;
  update public.perfiles set rol = p_rol where id = p_perfil;
  insert into public.cambios_de_rol (perfil_id, rol, por) values (p_perfil, p_rol, auth.uid());
  return 'ok';
end $$;

-- ---------- abrió la app hoy (D3): una escritura al día por cuenta, a lo más ----------
create function public.marcar_visto() returns void
language sql security definer set search_path = public as $$
  insert into public.cuentas_vistas (perfil_id, dia)
  select auth.uid(), (now() at time zone 'America/Mexico_City')::date
  where exists (select 1 from public.perfiles where id = auth.uid())
  on conflict (perfil_id) do update set dia = excluded.dia where public.cuentas_vistas.dia < excluded.dia;
$$;

-- ---------- listas de fichas ----------
create function public.panel_lugares(p_buscar text default null, p_filtro text default 'todos', p_limite integer default 30, p_desde integer default 0)
returns table (id uuid, nombre text, foto text, tipo text, detalle text, visible boolean, privado boolean, origen text, proximas integer, lleva text, lleva_n integer, total bigint)
language sql stable security definer set search_path = public as $$
  select l.id, l.nombre, l.portada, l.tipo, l.detalle, l.visible, l.privado, l.origen,
    (select count(*) from public.eventos e where e.lugar_id = l.id and e.visible and public.sin_pasar(e.inicio, e.fin))::int,
    (select p.nombre from public.lugares_cuentas c join public.perfiles p on p.id = c.perfil_id where c.lugar_id = l.id order by c.creado_en limit 1),
    (select count(*) from public.lugares_cuentas c where c.lugar_id = l.id)::int,
    count(*) over ()
  from public.lugares l
  where public.es_admin()
    and (coalesce(trim(p_buscar), '') = '' or public.normalizar_nombre(l.nombre) like '%' || public.normalizar_nombre(p_buscar) || '%')
    and case coalesce(p_filtro, 'todos')
      when 'ocultos' then not l.visible
      when 'sin_fecha' then l.visible and not l.privado
        and not exists (select 1 from public.eventos e where e.lugar_id = l.id and e.visible and public.sin_pasar(e.inicio, e.fin))
      when 'sin_foto' then l.portada is null
      when 'catalogo' then l.origen = 'capo'
      else true
    end
  order by l.nombre_orden nulls last, l.nombre, l.id
  limit greatest(least(p_limite, 600), 1) offset greatest(p_desde, 0);
$$;

create function public.panel_eventos(p_buscar text default null, p_filtro text default 'proximos', p_limite integer default 30, p_desde integer default 0)
returns table (id uuid, titulo text, imagen text, inicio timestamptz, fin timestamptz, visible boolean, sitio text, autor text, autor_admin boolean, van integer, total bigint)
language sql stable security definer set search_path = public as $$
  select e.id, e.titulo, e.imagen, e.inicio, e.fin, e.visible, coalesce(l.nombre, e.sitio_texto), p.nombre, coalesce(p.rol = 'admin', false),
    (select count(*) from public.asistencias a where a.evento_id = e.id and a.estado = 'voy')::int,
    count(*) over ()
  from public.eventos e
  left join public.lugares l on l.id = e.lugar_id
  left join public.perfiles p on p.id = e.creado_por
  where public.es_admin()
    and public.sin_pasar(e.inicio, e.fin)
    and (coalesce(trim(p_buscar), '') = '' or public.normalizar_nombre(e.titulo) like '%' || public.normalizar_nombre(p_buscar) || '%')
    and case coalesce(p_filtro, 'proximos')
      when 'semana' then e.visible and e.inicio < now() + interval '7 days'
      when 'sin_imagen' then e.visible and e.imagen is null
      when 'comunidad' then e.visible and (p.id is null or p.rol <> 'admin')
      when 'ocultos' then not e.visible
      else e.visible
    end
  order by e.inicio, e.titulo, e.id
  limit greatest(least(p_limite, 600), 1) offset greatest(p_desde, 0);
$$;

create function public.panel_artistas(p_buscar text default null, p_filtro text default 'todos', p_limite integer default 30, p_desde integer default 0)
returns table (id uuid, nombre text, foto text, disciplina text, detalle text, visible boolean, origen text, proximas integer, lleva text, lleva_n integer, total bigint)
language sql stable security definer set search_path = public as $$
  select a.id, a.nombre, a.foto, a.disciplina, a.detalle, a.visible, a.origen,
    (select count(*) from public.eventos_artistas ea join public.eventos e on e.id = ea.evento_id
      where ea.artista_id = a.id and e.visible and public.sin_pasar(e.inicio, e.fin))::int,
    (select p.nombre from public.artistas_cuentas c join public.perfiles p on p.id = c.perfil_id where c.artista_id = a.id order by c.creado_en limit 1),
    (select count(*) from public.artistas_cuentas c where c.artista_id = a.id)::int,
    count(*) over ()
  from public.artistas a
  where public.es_admin()
    and (coalesce(trim(p_buscar), '') = '' or public.normalizar_nombre(a.nombre) like '%' || public.normalizar_nombre(p_buscar) || '%')
    and case coalesce(p_filtro, 'todos')
      when 'por_reclamar' then a.origen = 'capo' and not exists (select 1 from public.artistas_cuentas c where c.artista_id = a.id)
      when 'llevados' then exists (select 1 from public.artistas_cuentas c where c.artista_id = a.id)
      when 'sin_foto' then a.foto is null
      when 'ocultos' then not a.visible
      else true
    end
  order by a.nombre_orden nulls last, a.nombre, a.id
  limit greatest(least(p_limite, 600), 1) offset greatest(p_desde, 0);
$$;

-- Cuántas fichas da cada chip de su lista.
create function public.panel_fichas_conteos(p_tipo text) returns json
language sql stable security definer set search_path = public as $$
  select case
    when not public.es_admin() then null
    when p_tipo = 'lugares' then json_build_object(
      'todos', (select count(*) from public.lugares),
      'ocultos', (select count(*) from public.lugares where not visible),
      'sin_fecha', (select count(*) from public.lugares l where l.visible and not l.privado
        and not exists (select 1 from public.eventos e where e.lugar_id = l.id and e.visible and public.sin_pasar(e.inicio, e.fin))),
      'sin_foto', (select count(*) from public.lugares where portada is null),
      'catalogo', (select count(*) from public.lugares where origen = 'capo'))
    when p_tipo = 'eventos' then json_build_object(
      'proximos', (select count(*) from public.eventos e where e.visible and public.sin_pasar(e.inicio, e.fin)),
      'semana', (select count(*) from public.eventos e where e.visible and public.sin_pasar(e.inicio, e.fin) and e.inicio < now() + interval '7 days'),
      'sin_imagen', (select count(*) from public.eventos e where e.visible and public.sin_pasar(e.inicio, e.fin) and e.imagen is null),
      'comunidad', (select count(*) from public.eventos e left join public.perfiles p on p.id = e.creado_por
        where e.visible and public.sin_pasar(e.inicio, e.fin) and (p.id is null or p.rol <> 'admin')),
      'ocultos', (select count(*) from public.eventos e where not e.visible and public.sin_pasar(e.inicio, e.fin)))
    when p_tipo = 'artistas' then json_build_object(
      'todos', (select count(*) from public.artistas),
      'por_reclamar', (select count(*) from public.artistas a where a.origen = 'capo'
        and not exists (select 1 from public.artistas_cuentas c where c.artista_id = a.id)),
      'llevados', (select count(distinct artista_id) from public.artistas_cuentas),
      'sin_foto', (select count(*) from public.artistas where foto is null),
      'ocultos', (select count(*) from public.artistas where not visible))
  end;
$$;

-- ---------- permisos ----------
-- Por dentro: sin permiso para ningún cliente. La foto del día, solo la llave de servicio (tarea de la mañana).
revoke execute on function public.indicadores_ahora() from public, anon, authenticated;
revoke execute on function public.guardar_indicadores() from public, anon, authenticated;
grant execute on function public.guardar_indicadores() to service_role;
-- Con sesión: cada función comprueba el rol por dentro (la del resumen falla; las demás no devuelven nada).
revoke execute on function public.es_admin_de_origen() from public, anon;
revoke execute on function public.panel_resumen() from public, anon;
revoke execute on function public.panel_pendientes() from public, anon;
revoke execute on function public.panel_personas(text, text, integer, integer) from public, anon;
revoke execute on function public.panel_personas_conteos() from public, anon;
revoke execute on function public.panel_persona(uuid) from public, anon;
revoke execute on function public.panel_correo(uuid) from public, anon;
revoke execute on function public.cambiar_rol(uuid, text) from public, anon;
revoke execute on function public.marcar_visto() from public, anon;
revoke execute on function public.panel_lugares(text, text, integer, integer) from public, anon;
revoke execute on function public.panel_eventos(text, text, integer, integer) from public, anon;
revoke execute on function public.panel_artistas(text, text, integer, integer) from public, anon;
revoke execute on function public.panel_fichas_conteos(text) from public, anon;
grant execute on function public.es_admin_de_origen() to authenticated;
grant execute on function public.panel_resumen() to authenticated;
grant execute on function public.panel_pendientes() to authenticated;
grant execute on function public.panel_personas(text, text, integer, integer) to authenticated;
grant execute on function public.panel_personas_conteos() to authenticated;
grant execute on function public.panel_persona(uuid) to authenticated;
grant execute on function public.panel_correo(uuid) to authenticated;
grant execute on function public.cambiar_rol(uuid, text) to authenticated;
grant execute on function public.marcar_visto() to authenticated;
grant execute on function public.panel_lugares(text, text, integer, integer) to authenticated;
grant execute on function public.panel_eventos(text, text, integer, integer) to authenticated;
grant execute on function public.panel_artistas(text, text, integer, integer) to authenticated;
grant execute on function public.panel_fichas_conteos(text) to authenticated;
