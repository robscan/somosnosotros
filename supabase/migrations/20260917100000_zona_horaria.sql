-- somosnosotros · migración 0029 · lugares y eventos de cualquier país: la zona horaria de cada uno
-- Hasta hoy la app leía y mostraba todas las horas con el reloj de la Ciudad de México. El contexto ordena, no limita
-- (founder, 2026-09-16): cada lugar y cada evento guarda la zona horaria de donde está, con su nombre IANA
-- ("Europe/Madrid"). La pone la app al guardar, a partir del punto en el mapa (src/lib/zona.ts).
-- Lo que ya existe queda en la zona de la Ciudad de México, que es la de San Luis Potosí.

-- ---------- ¿es una zona? ----------
-- Área y ciudad, como la da el mapa de zonas ("America/Mexico_City", "America/Argentina/Cordoba"), y que la base la
-- reconozca. Sin abreviaturas ("CST") ni variantes que el teléfono no entiende ("posix/…"). La misma forma que
-- `zonaSegura` en src/lib/fechas.ts.
create function public.zona_valida(p_zona text) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  if p_zona is null or p_zona !~ '^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific|Etc)/[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+)?$' then
    return false;
  end if;
  perform pg_catalog.timezone(p_zona, timestamptz '2000-01-01 00:00+00');
  return true;
exception when others then
  return false;
end;
$$;

-- ---------- la zona de cada lugar y cada evento ----------
alter table public.lugares add column zona text not null default 'America/Mexico_City'
  constraint lugares_zona_valida check (public.zona_valida(zona));
comment on column public.lugares.zona is 'Zona horaria (IANA) de donde está el lugar. La pone la app al guardar, desde su punto.';

alter table public.eventos add column zona text not null default 'America/Mexico_City'
  constraint eventos_zona_valida check (public.zona_valida(zona));
comment on column public.eventos.zona is 'Zona horaria (IANA) del evento: la de su lugar o la del punto de su sitio. Las horas se leen y se muestran en ella.';

-- Un evento en un lugar tiene la zona del lugar, aunque quien lo guarda mande otra. Definer: el lugar puede no ser
-- visible para quien publica (privado u oculto) y aun así la zona tiene que ser la suya.
create function public.eventos_zona_del_lugar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.lugar_id is not null then
    new.zona := coalesce((select l.zona from public.lugares l where l.id = new.lugar_id), new.zona);
  end if;
  return new;
end;
$$;
create trigger eventos_zona_del_lugar before insert or update of lugar_id, zona on public.eventos
  for each row execute function public.eventos_zona_del_lugar();

-- Si el lugar cambia de zona (se corrigió su punto, o un lugar de Cancún deja la de México por defecto al volver a
-- guardarse), sus eventos cambian con él, sean de quien sean, y conservan la hora a la vista: sus horas se escribieron en
-- la zona vieja, así que "19:00" sigue siendo las 19:00 en la nueva (cambia el instante, no la hora de pared). Se calcula
-- con la zona que tenía cada evento. El disparador de eventos vuelve a poner la zona del lugar: la misma.
-- Si el inicio cae en el hueco del cambio de horario de la zona nueva (las 02:30 del día que el reloj salta de 02:00 a
-- 03:00 no existen y Postgres las pasa a las 03:30), un fin que sí existe quedaría antes y rompería `fin > inicio`: se
-- deshacía el guardado entero del lugar. Entonces el fin conserva la duración, contada en segundos.
create function public.lugares_zona_a_sus_eventos() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.eventos e set
    inicio = c.inicio,
    fin = case when c.fin <= c.inicio then c.inicio + pg_catalog.make_interval(secs => extract(epoch from e.fin) - extract(epoch from e.inicio)) else c.fin end,
    sitio_revelar_desde = c.revelar,
    zona = new.zona
  from (
    select x.id,
      pg_catalog.timezone(new.zona, pg_catalog.timezone(x.zona, x.inicio)) as inicio,
      pg_catalog.timezone(new.zona, pg_catalog.timezone(x.zona, x.fin)) as fin,
      pg_catalog.timezone(new.zona, pg_catalog.timezone(x.zona, x.sitio_revelar_desde)) as revelar
    from public.eventos x
    where x.lugar_id = new.id and x.zona <> new.zona
  ) c
  where e.id = c.id;
  return null;
end;
$$;
create trigger lugares_zona_a_sus_eventos after update of zona on public.lugares
  for each row when (old.zona is distinct from new.zona) execute function public.lugares_zona_a_sus_eventos();

-- ---------- cuándo deja de verse un evento ----------
-- Con hora de fin, al terminar; sin ella, al acabar su día en su zona (pedido del founder, 2026-09-16). Antes lo
-- calculaba la app con el día de la Ciudad de México; ahora cada evento con el suyo. Las listas filtran con
-- `termina >= ahora` (filtroSinPasar en src/lib/fechas.ts).
alter table public.eventos add column termina timestamptz not null generated always as (
  coalesce(fin, pg_catalog.timezone(zona, pg_catalog.date_trunc('day', pg_catalog.timezone(zona, inicio)) + interval '1 day'))
) stored;
comment on column public.eventos.termina is 'Cuándo deja de mostrarse: al terminar o, sin hora de fin, al acabar su día en la zona del evento.';
create index eventos_termina_idx on public.eventos (termina) where visible;
create index eventos_ciudad_termina_idx on public.eventos (ciudad, termina) where visible;

-- ---------- el panel, con la misma regla ----------
-- El panel (migración 0028) copió en SQL la regla de las listas como `sin_pasar(inicio, fin)`, con el día de la Ciudad
-- de México. Para que siga siendo la misma regla con eventos de cualquier zona, sus funciones comparan `e.termina`.
-- Son las de la 0028 tal cual, salvo `public.sin_pasar(e.inicio, e.fin)` → `e.termina >= now()`: misma firma, mismos
-- permisos y el mismo resultado mientras todos los eventos estén en esa zona, así que el código que corre hoy no cambia.
-- `sin_pasar` se queda (nada se quita), ya sin uso.
comment on function public.sin_pasar(timestamptz, timestamptz) is 'Regla vieja, con el día de la Ciudad de México. Desde la migración 0029 el panel y las listas usan eventos.termina, que va con la zona de cada evento.';

create or replace function public.indicadores_ahora() returns json
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
    where e.visible and e.termina >= now()
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

create or replace function public.panel_resumen() returns json
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
        and not exists (select 1 from public.eventos e where e.lugar_id = l.id and e.visible and e.termina >= now())),
      'lugares_ocultos', (select count(*) from public.lugares where not visible),
      'lugares_privados', (select count(*) from public.lugares where privado),
      'eventos', (select count(*) from public.eventos e where e.visible and e.termina >= now()),
      'eventos_sin_imagen', (select count(*) from public.eventos e where e.visible and e.termina >= now() and e.imagen is null),
      'artistas', (select count(*) from public.artistas where visible),
      'artistas_ocultos', (select count(*) from public.artistas where not visible),
      'artistas_llevados', (select count(distinct artista_id) from public.artistas_cuentas),
      'invitaciones', (select count(*) from public.invitaciones_enviadas)
    )
  );
end $$;

create or replace function public.panel_personas(p_buscar text default null, p_filtro text default 'todas', p_limite integer default 30, p_desde integer default 0)
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
        or (public.normalizar_nombre(p_buscar) <> '' and public.normalizar_nombre(p.nombre) like '%' || public.normalizar_nombre(p_buscar) || '%')
        or lower(u.email) like '%' || replace(replace(replace(lower(trim(p_buscar)), '\', '\\'), '%', '\%'), '_', '\_') || '%')
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

create or replace function public.panel_persona(p_perfil uuid) returns json
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
      where a.usuario_id = p.id and a.estado = 'voy' and e.visible and e.termina >= now()),
    'le_interesa', (select count(*) from public.asistencias a join public.eventos e on e.id = a.evento_id
      where a.usuario_id = p.id and a.estado = 'me_interesa' and e.visible and e.termina >= now()),
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

create or replace function public.panel_lugares(p_buscar text default null, p_filtro text default 'todos', p_limite integer default 30, p_desde integer default 0)
returns table (id uuid, nombre text, foto text, tipo text, detalle text, visible boolean, privado boolean, origen text, proximas integer, lleva text, lleva_n integer, total bigint)
language sql stable security definer set search_path = public as $$
  select l.id, l.nombre, l.portada, l.tipo, l.detalle, l.visible, l.privado, l.origen,
    (select count(*) from public.eventos e where e.lugar_id = l.id and e.visible and e.termina >= now())::int,
    (select p.nombre from public.lugares_cuentas c join public.perfiles p on p.id = c.perfil_id where c.lugar_id = l.id order by c.creado_en limit 1),
    (select count(*) from public.lugares_cuentas c where c.lugar_id = l.id)::int,
    count(*) over ()
  from public.lugares l
  where public.es_admin()
    and (coalesce(trim(p_buscar), '') = '' or public.normalizar_nombre(p_buscar) <> '' and public.normalizar_nombre(l.nombre) like '%' || public.normalizar_nombre(p_buscar) || '%')
    and case coalesce(p_filtro, 'todos')
      when 'ocultos' then not l.visible
      when 'sin_fecha' then l.visible and not l.privado
        and not exists (select 1 from public.eventos e where e.lugar_id = l.id and e.visible and e.termina >= now())
      when 'sin_foto' then l.portada is null
      when 'catalogo' then l.origen = 'capo'
      else true
    end
  order by l.nombre_orden nulls last, l.nombre, l.id
  limit greatest(least(p_limite, 600), 1) offset greatest(p_desde, 0);
$$;

create or replace function public.panel_eventos(p_buscar text default null, p_filtro text default 'proximos', p_limite integer default 30, p_desde integer default 0)
returns table (id uuid, titulo text, imagen text, inicio timestamptz, fin timestamptz, visible boolean, sitio text, autor text, autor_admin boolean, van integer, total bigint)
language sql stable security definer set search_path = public as $$
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
      when 'comunidad' then e.visible and (p.id is null or p.rol <> 'admin')
      when 'ocultos' then not e.visible
      else e.visible
    end
  order by e.inicio, e.titulo, e.id
  limit greatest(least(p_limite, 600), 1) offset greatest(p_desde, 0);
$$;

create or replace function public.panel_artistas(p_buscar text default null, p_filtro text default 'todos', p_limite integer default 30, p_desde integer default 0)
returns table (id uuid, nombre text, foto text, disciplina text, detalle text, visible boolean, origen text, proximas integer, lleva text, lleva_n integer, total bigint)
language sql stable security definer set search_path = public as $$
  select a.id, a.nombre, a.foto, a.disciplina, a.detalle, a.visible, a.origen,
    (select count(*) from public.eventos_artistas ea join public.eventos e on e.id = ea.evento_id
      where ea.artista_id = a.id and e.visible and e.termina >= now())::int,
    (select p.nombre from public.artistas_cuentas c join public.perfiles p on p.id = c.perfil_id where c.artista_id = a.id order by c.creado_en limit 1),
    (select count(*) from public.artistas_cuentas c where c.artista_id = a.id)::int,
    count(*) over ()
  from public.artistas a
  where public.es_admin()
    and (coalesce(trim(p_buscar), '') = '' or public.normalizar_nombre(p_buscar) <> '' and public.normalizar_nombre(a.nombre) like '%' || public.normalizar_nombre(p_buscar) || '%')
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

create or replace function public.panel_fichas_conteos(p_tipo text) returns json
language sql stable security definer set search_path = public as $$
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
        where e.visible and e.termina >= now() and (p.id is null or p.rol <> 'admin')),
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
