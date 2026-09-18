-- somosnosotros · migración 0033 · tope de lecturas de cartel (docs/rediseno/23, firmado por el founder el 2026-09-17)
-- Leer un cartel es lo único de la app que cuesta dinero por uso (2-3 centavos de dólar la lectura). Con 85 eventos
-- en producción, sin tope el mes serían unos pocos dólares: esto NO es un ahorro, es un fusible contra un accidente
-- —alguien subiendo cuarenta fotos, un reintento en bucle—, y por eso el número es alto y no estorba a nadie real.
--   · 20 lecturas al mes por cuenta, renovadas el día 1 en la hora de la ciudad; las fallidas también cuentan,
--     porque cuestan lo mismo;
--   · la administración no tiene tope;
--   · al acabarse, una sola salida: pedir más, que llega a "Pendiente" del panel como un motivo más de reportes;
--   · el admin resuelve el contacto fuera de la app y, si quiere, sube esa cuenta a 100 al mes.
-- El tope de cada quien vive en su propia tabla y NO en perfiles, que se lee sin sesión: ahí sería público quién
-- tiene cupo ampliado, y una columna en una tabla que la propia cuenta puede actualizar es una vía de escalada.
-- Aquí no hay puerta que forzar: nadie más que la administración toca estas tablas.
-- Solo añade: dos tablas, cinco funciones, un motivo más en reportes y dos columnas en panel_pendientes.

-- ---------- cuánto puede cada quien ----------
-- El que rige si la cuenta no tiene fila propia en topes_de_lectura.
create function public.tope_de_cartel_base()
returns integer language sql immutable as $$ select 20 $$;
comment on function public.tope_de_cartel_base() is 'Lecturas de cartel al mes por cuenta (docs/rediseno/23). La administración no tiene tope.';

-- Solo las excepciones: quien no está aquí va con el tope base.
create table public.topes_de_lectura (
  perfil_id uuid primary key references public.perfiles (id) on delete cascade,
  tope integer not null check (tope >= 0 and tope <= 1000),
  cambiado_por uuid references public.perfiles (id) on delete set null,
  cambiado_en timestamptz not null default now()
);
comment on table public.topes_de_lectura is 'Cupos ampliados a mano por la administración. Sin fila = tope_de_cartel_base().';
alter table public.topes_de_lectura enable row level security;
revoke all on public.topes_de_lectura from public, anon, authenticated;
grant select on public.topes_de_lectura to authenticated;
create policy "topes: lee la administración" on public.topes_de_lectura for select to authenticated using (public.es_admin());
-- Nadie escribe de frente, ni siquiera el admin: el único camino es dar_mas_lecturas (definer).

-- ---------- una fila por lectura ----------
-- No se guarda nada del cartel: ni la imagen ni lo que decía. Solo quién y cuándo, para contar el mes y para que
-- la administración pueda decidir una petición sabiendo si esa cuenta además publicó.
create table public.lecturas_cartel (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  creado_en timestamptz not null default now()
);
comment on table public.lecturas_cartel is 'Una fila por lectura de cartel. Sin nada del cartel: solo quién y cuándo.';
create index lecturas_cartel_perfil_idx on public.lecturas_cartel (perfil_id, creado_en desc);
alter table public.lecturas_cartel enable row level security;
revoke all on public.lecturas_cartel from public, anon, authenticated;
grant select on public.lecturas_cartel to authenticated;
create policy "lecturas: lee la administración" on public.lecturas_cartel for select to authenticated using (public.es_admin());
-- Nadie inserta desde el cliente: solo apartar_lectura_de_cartel (definer).

-- El mes corriente en la hora de la ciudad: el cupo se renueva el día 1, no a medianoche de Londres.
create function public.inicio_del_mes()
returns timestamptz language sql stable as $$
  select date_trunc('month', now() at time zone 'America/Mexico_City') at time zone 'America/Mexico_City'
$$;

-- ---------- lo que le queda a quien pregunta ----------
-- Definer y solo lo suyo: nadie ve el cupo de nadie (el patrón del doc 21, firmado).
create function public.mi_cupo_de_cartel()
returns table (usadas integer, tope integer, sin_tope boolean, pedida boolean)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::integer from public.lecturas_cartel l where l.perfil_id = auth.uid() and l.creado_en >= public.inicio_del_mes()),
    coalesce((select t.tope from public.topes_de_lectura t where t.perfil_id = auth.uid()), public.tope_de_cartel_base()),
    public.es_admin(),
    -- Si ya pidió más, lo dice aquí: nadie puede leer sus propias filas de `reportes`, y abrirlas sería peor.
    exists (select 1 from public.reportes r where r.creado_por = auth.uid() and r.motivo = 'mas_lecturas' and not r.atendido)
  where auth.uid() is not null;
$$;

-- ---------- apartar una lectura ----------
-- Comprueba y anota en el mismo paso, antes de llamar al modelo: si se hiciera en dos, dos toques seguidos pasarían
-- los dos. Devuelve false cuando ya no hay cupo; la administración nunca se topa.
create function public.apartar_lectura_de_cartel()
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_usadas integer;
  v_tope integer;
begin
  if auth.uid() is null then
    return false;
  end if;
  if current_setting('transaction_isolation') not in ('read committed', 'read uncommitted') then
    raise exception 'La reserva requiere READ COMMITTED' using errcode = '25001';
  end if;
  -- Contar y anotar no basta: en dos transacciones a la vez las dos leen 19 y las dos pasan (comprobado con 2 y con
  -- 5: el mes acababa en 21 y en 24). El cerrojo las pone en fila por cuenta y se suelta al terminar la transacción.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if not public.es_admin() then
    select coalesce((select t.tope from public.topes_de_lectura t where t.perfil_id = auth.uid()), public.tope_de_cartel_base()) into v_tope;
    select count(*) into v_usadas from public.lecturas_cartel l where l.perfil_id = auth.uid() and l.creado_en >= public.inicio_del_mes();
    if v_usadas >= v_tope then
      return false;
    end if;
  end if;
  insert into public.lecturas_cartel (perfil_id) values (auth.uid());
  return true;
end
$$;

-- ---------- pedir más ----------
-- Un motivo más en reportes, que ya tiene hecho el camino de "Pendiente": tarjeta, decisión y contador.
alter table public.reportes drop constraint reportes_motivo_check;
alter table public.reportes add constraint reportes_motivo_check
  check (motivo in ('falso', 'ofensivo', 'duplicado', 'no_cultural', 'otro', 'es_mio', 'retirar', 'mas_lecturas'));
comment on column public.reportes.motivo is 'es_mio / retirar: un artista real pide la ficha (decisión 11). mas_lecturas: pide más lecturas de cartel (docs/rediseno/23).';

-- Una sola petición sin atender por cuenta: que nadie pueda llenar el panel.
create unique index reportes_una_peticion_de_lecturas on public.reportes (creado_por)
  where motivo = 'mas_lecturas' and not atendido;

-- La política de antes solo exigía creado_por = auth.uid(), así que se podía pedir capacidad apuntando al perfil de
-- otra persona. Para este motivo se exige además que apunte al propio.
drop policy "reportes: reporto con sesión" on public.reportes;
create policy "reportes: reporto con sesión" on public.reportes for insert to authenticated
  -- `not atendido` cierra el atajo: con `atendido = true` el índice único no aplicaba y se podían meter mil.
  with check (creado_por = auth.uid() and (motivo <> 'mas_lecturas' or (tipo = 'perfil' and objeto_id = auth.uid() and not atendido)));

-- ---------- lo que necesita el panel para decidir ----------
-- Cuántas leyó y cuántas publicó este mes: "leyó 20 y publicó 18" y "leyó 20 y publicó 0" piden decisiones distintas.
-- Cambia la forma de lo que devuelve, así que hay que soltarla y volver a darle el permiso al final.
drop function public.panel_pendientes();
create function public.panel_pendientes()
returns table (id uuid, tipo text, objeto_id uuid, motivo text, detalle text, creado_en timestamptz, creado_por uuid, autor text, objeto text, objeto_visible boolean, lecturas integer, publicados integer)
language sql stable security definer set search_path = public as $$
  select r.id, r.tipo, r.objeto_id, r.motivo, r.detalle, r.creado_en, r.creado_por, pa.nombre,
    case r.tipo when 'lugar' then l.nombre when 'evento' then e.titulo when 'artista' then a.nombre else pp.nombre end,
    case r.tipo when 'lugar' then l.visible when 'evento' then e.visible when 'artista' then a.visible else true end,
    case when r.motivo = 'mas_lecturas' then
      (select count(*)::integer from public.lecturas_cartel lc where lc.perfil_id = r.creado_por and lc.creado_en >= public.inicio_del_mes()) end,
    case when r.motivo = 'mas_lecturas' then
      (select count(*)::integer from public.eventos ev where ev.creado_por = r.creado_por and ev.creado_en >= public.inicio_del_mes()) end
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

-- ---------- dar más ----------
-- El botón de la tarjeta del panel. Sube esa cuenta a 100 al mes; si necesita más, ya hay conversación abierta.
create function public.dar_mas_lecturas(p_perfil uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  insert into public.topes_de_lectura (perfil_id, tope, cambiado_por, cambiado_en)
  values (p_perfil, 100, auth.uid(), now())
  on conflict (perfil_id) do update set tope = 100, cambiado_por = auth.uid(), cambiado_en = now();
end
$$;

-- ---------- pedir cupo no es reportar a nadie ----------
-- La petición vive en `reportes` porque reusa su camino, pero no es un reporte ni cuenta como actividad: sin esto
-- saldría como reporte y como pendiente en la ficha de la persona, y como señal en los indicadores. Se recrean las
-- dos funciones tal como están en 20260917100000, con el motivo fuera de sus contadores y nada más.
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
      exists (select 1 from public.reportes r where r.creado_por = g.id and r.motivo <> 'mas_lecturas' and r.creado_en >= now() - interval '7 days') as reporto,
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
    'reportes', (select count(*) from public.reportes r where r.creado_por = p.id and r.motivo not in ('es_mio', 'retirar', 'mas_lecturas')),
    'pendientes', (select count(*) from public.reportes r where r.creado_por = p.id and r.motivo <> 'mas_lecturas' and not r.atendido),
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

-- ---------- permisos de las funciones ----------
revoke execute on function public.panel_pendientes() from public, anon;
grant execute on function public.panel_pendientes() to authenticated;
revoke execute on function public.tope_de_cartel_base() from public, anon;
revoke execute on function public.inicio_del_mes() from public, anon;
revoke execute on function public.mi_cupo_de_cartel() from public, anon;
revoke execute on function public.apartar_lectura_de_cartel() from public, anon;
revoke execute on function public.dar_mas_lecturas(uuid) from public, anon;
grant execute on function public.tope_de_cartel_base() to authenticated;
grant execute on function public.inicio_del_mes() to authenticated;
grant execute on function public.mi_cupo_de_cartel() to authenticated;
grant execute on function public.apartar_lectura_de_cartel() to authenticated;
grant execute on function public.dar_mas_lecturas(uuid) to authenticated;
