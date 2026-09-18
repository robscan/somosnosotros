-- somosnosotros · migración 0032 · el rol de entonces, no el de hoy (OL-070, bitácora 101)
-- Hallazgo del founder (2026-09-17): ascendió a dos cuentas a administradoras y sus eventos, lugares, artistas y
-- «voy» de ANTES de serlo desaparecieron de «Coincidencias», «Publica la comunidad» y del embudo «Cómo va la
-- comunidad». `indicadores_ahora()` y `panel_comunidad()` preguntaban quién es administrador HOY (`perfiles.rol`)
-- sobre datos de cualquier fecha, así que ascender a alguien borraba retroactivamente su actividad pasada.
-- N2 del documento 18 («los indicadores de la comunidad no cuentan a los administradores», porque «si no, tu propia
-- actividad infla todo») es sobre la actividad de un administrador MIENTRAS lo es, no sobre borrar lo que alguien
-- hizo antes de serlo. El arreglo: cada fila se compara contra el rol que tenía la cuenta EN ESE MOMENTO, no el de
-- ahora. `cambios_de_rol` (migración 0028) ya guarda cada cambio real con su fecha; no hace falta ningún dato nuevo.
-- Con esto, los números que ve el founder van a cambiar al mezclar: hoy «Publica la comunidad» deja de ser 0.
-- Ampliada tras la revisión de gestión de cambios: también «Personas activas» (N2 nombra los tres indicadores, no
-- dos — dejar uno sin arreglar contradice a los otros en la misma pantalla) y `personas_nuevas` de "Gestionar"
-- (misma pantalla que "Personas activas"). El filtro «nuevas» de `panel_personas` y `tira_destacados` quedan fuera:
-- ni comparten pantalla con esto (personas) ni son de esta pieza (destacados, decisión del founder, ver OL-070). La
-- foto del día que ya se guardó con los números viejos se borra al final, para que se vuelva a escribir bien.

-- ---------- el rol que tenía una cuenta en un momento dado ----------
-- El rol es binario ('admin' o 'usuario'): antes de su primer cambio registrado, era el contrario de ese cambio. Sin
-- ningún cambio registrado, el rol de hoy vale para cualquier fecha (una cuenta de origen, o una que nunca cambió).
create function public.rol_en(p_perfil uuid, p_ts timestamptz) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select c.rol from public.cambios_de_rol c where c.perfil_id = p_perfil and c.creado_en <= p_ts order by c.creado_en desc limit 1),
    (select case c.rol when 'admin' then 'usuario' else 'admin' end from public.cambios_de_rol c
      where c.perfil_id = p_perfil and c.creado_en > p_ts order by c.creado_en asc limit 1),
    (select p.rol from public.perfiles p where p.id = p_perfil)
  );
$$;
comment on function public.rol_en(uuid, timestamptz) is 'El rol de una cuenta en un momento dado, no el de hoy: para que ascender a alguien no borre de los indicadores lo que hizo antes de serlo (OL-070, bitácora 101).';
revoke execute on function public.rol_en(uuid, timestamptz) from public, anon, authenticated;

-- ---------- indicadores_ahora(): los tres indicadores de personas (N2, doc 18), con el rol de entonces ----------
-- Igual que en 20260917100000_zona_horaria.sql, salvo `gente`/`senales`, `van` y `comunidad`: en vez de comparar
-- contra quién es administrador hoy (la CTE `admins`, y el prefiltro `where p.rol <> 'admin'` de `gente`, que aquí ya
-- no hacen falta), cada señal se compara con su propio rol_en, contra la fecha de esa fila (cuándo abrió la app,
-- cuándo dijo «voy», cuándo publicó, cuándo se registró). Gestión de cambios lo pidió tras revisar la pieza: dejar
-- «Coincidencias» y «Publica la comunidad» arregladas pero «Personas activas» no, contradice la misma pantalla (N2
-- nombra los tres) — alguien ascendido podía desaparecer de "activas" aunque hubiera actuado esta semana antes de
-- serlo. `gente` ya no filtra por rol (se filtraría a quien es administrador HOY, el mismo error): trae a todos, y
-- cada señal decide con su propio rol_en. `agenda`/`lugares` no llevan rol, no se tocan.
create or replace function public.indicadores_ahora() returns json
language sql stable security definer set search_path = public as $$
  with
  hoy as (select (now() at time zone 'America/Mexico_City')::date as d),
  gente as (
    select p.id, p.creado_en, p.novedades_vistas_en, u.last_sign_in_at, v.dia as visto
    from public.perfiles p
    join auth.users u on u.id = p.id
    left join public.cuentas_vistas v on v.perfil_id = p.id
  ),
  senales as (
    select g.id,
      (coalesce(g.visto > (select d from hoy) - 7, false) and public.rol_en(g.id, g.visto::timestamptz) <> 'admin')
        or (coalesce(g.novedades_vistas_en >= now() - interval '7 days', false) and public.rol_en(g.id, g.novedades_vistas_en) <> 'admin')
        or (coalesce(g.last_sign_in_at >= now() - interval '7 days', false) and public.rol_en(g.id, g.last_sign_in_at) <> 'admin')
        as abrio,
      exists (select 1 from public.asistencias a where a.usuario_id = g.id and a.creado_en >= now() - interval '7 days' and public.rol_en(a.usuario_id, a.creado_en) <> 'admin') as voy,
      exists (select 1 from public.seguimientos s where s.usuario_id = g.id and s.creado_en >= now() - interval '7 days' and public.rol_en(s.usuario_id, s.creado_en) <> 'admin') as siguio,
      exists (select 1 from public.lugares l where l.creado_por = g.id and l.creado_en >= now() - interval '7 days' and public.rol_en(l.creado_por, l.creado_en) <> 'admin')
        or exists (select 1 from public.eventos e where e.creado_por = g.id and e.creado_en >= now() - interval '7 days' and public.rol_en(e.creado_por, e.creado_en) <> 'admin')
        or exists (select 1 from public.artistas a where a.creado_por = g.id and a.creado_en >= now() - interval '7 days' and public.rol_en(a.creado_por, a.creado_en) <> 'admin') as publico,
      exists (select 1 from public.reportes r where r.creado_por = g.id and r.motivo <> 'mas_lecturas' and r.creado_en >= now() - interval '7 days' and public.rol_en(r.creado_por, r.creado_en) <> 'admin') as reporto,
      (g.creado_en >= now() - interval '7 days' and public.rol_en(g.id, g.creado_en) <> 'admin') as nueva
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
    where public.rol_en(a.usuario_id, a.creado_en) <> 'admin'
    group by s.id, s.titulo
  ),
  lugares_visibles as (select l.id from public.lugares l where l.visible and not l.privado),
  comunidad as (select * from proximos p where p.creado_por is null or public.rol_en(p.creado_por, p.creado_en) <> 'admin')
  select json_build_object(
    'activas', (select count(*) from senales where abrio or voy or siguio or publico or reporto),
    'cuentas', (select count(*) from gente g where public.rol_en(g.id, g.creado_en) <> 'admin'),
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

-- ---------- panel_comunidad(): el embudo, con el rol de entonces ----------
-- Igual que en 20260917150000_panel_como_va.sql, salvo `nuevas`: el filtro de rol compara contra el rol que tenía la
-- cuenta AL REGISTRARSE (su propio creado_en), no el de hoy. hizo_algo, con_edad y volvio ya parten de nuevas, así
-- que heredan el arreglo sin tocarlos.
create or replace function public.panel_comunidad() returns json
language plpgsql security definer set search_path = public as $$
declare
  ventana constant interval := interval '30 days';
  semana constant interval := interval '7 days';
begin
  if not public.es_admin() then
    raise exception 'solo la administración' using errcode = '42501';
  end if;
  return (
    with nuevas as (
      select p.id, p.creado_en
      from public.perfiles p
      where public.rol_en(p.id, p.creado_en) <> 'admin' and p.creado_en >= now() - ventana
    ),
    hizo_algo as (
      select n.id from nuevas n where
        exists (select 1 from public.asistencias a where a.usuario_id = n.id and a.creado_en >= n.creado_en and a.creado_en < n.creado_en + semana and public.rol_en(n.id, a.creado_en) <> 'admin')
        or exists (select 1 from public.seguimientos s where s.usuario_id = n.id and s.creado_en >= n.creado_en and s.creado_en < n.creado_en + semana and public.rol_en(n.id, s.creado_en) <> 'admin')
        or exists (select 1 from public.lugares l where l.creado_por = n.id and l.creado_en >= n.creado_en and l.creado_en < n.creado_en + semana and public.rol_en(n.id, l.creado_en) <> 'admin')
        or exists (select 1 from public.eventos e where e.creado_por = n.id and e.creado_en >= n.creado_en and e.creado_en < n.creado_en + semana and public.rol_en(n.id, e.creado_en) <> 'admin')
        or exists (select 1 from public.artistas ar where ar.creado_por = n.id and ar.creado_en >= n.creado_en and ar.creado_en < n.creado_en + semana and public.rol_en(n.id, ar.creado_en) <> 'admin')
    ),
    con_edad as (
      select n.id, n.creado_en from nuevas n where n.creado_en <= now() - semana
    ),
    volvio as (
      select c.id
      from con_edad c
      left join public.cuentas_vistas v on v.perfil_id = c.id
      left join auth.users u on u.id = c.id
      where (coalesce(v.dia::timestamptz, '-infinity'::timestamptz) > (c.creado_en + semana) and public.rol_en(c.id, v.dia::timestamptz) <> 'admin')
         or (coalesce(u.last_sign_in_at, '-infinity'::timestamptz) > c.creado_en + semana and public.rol_en(c.id, u.last_sign_in_at) <> 'admin')
    )
    select json_build_object(
      'registradas', (select count(*) from nuevas),
      'hicieron_algo', (select count(*) from hizo_algo),
      'vuelven_base', (select count(*) from con_edad),
      'vuelven', (select count(*) from volvio)
    )
  );
end $$;

-- ---------- panel_resumen(): personas_nuevas, con el rol de entonces ----------
-- Igual que en 20260917100000_zona_horaria.sql, salvo `personas_nuevas`: comparte pantalla con «Personas activas»
-- (ambos en /admin, "Gestionar" justo debajo de "Últimos 7 días"), así que lleva el mismo arreglo. El resto de
-- `gestionar` (lugares, eventos, artistas) no lleva rol, no se toca.
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
      'personas_nuevas', (select count(*) from public.perfiles p where public.rol_en(p.id, p.creado_en) <> 'admin' and p.creado_en >= now() - interval '7 days'),
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

-- ---------- la foto de hoy, ya guardada con los números viejos, se vuelve a escribir con estos ----------
-- panel_resumen() solo inserta la foto del día si no existe («on conflict do nothing»): la de hoy puede haberse
-- guardado antes de este arreglo, con coincidencias/comunidad más bajas de lo real y activas sin las cuentas
-- ascendidas. Sin borrarla, la tendencia de "Últimos 7 días" dibujaría un escalón que no pasó de verdad. El primer
-- vistazo del día, después de esta migración, la vuelve a dejar con indicadores_ahora() ya corregido.
delete from public.indicadores_diarios where dia = (now() at time zone 'America/Mexico_City')::date;
