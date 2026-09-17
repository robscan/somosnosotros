-- somosnosotros · migración 0031 · cómo va la comunidad (docs/rediseno/21, opción A, firmada por el founder el
-- 2026-09-17: «A» — solo lo que ya existe, sin guardar nada nuevo sobre las personas)
-- Una sola función, de solo lectura, sobre columnas que ya existen: perfiles.creado_en, asistencias, seguimientos,
-- quién publicó un lugar/evento/artista, cuentas_vistas y el inicio de sesión real (auth.users.last_sign_in_at).
-- No añade tablas ni columnas. Los administradores no cuentan (N2, docs/rediseno/18).
--
-- El embudo, de las cuentas nuevas de los últimos 30 días:
--   1. cuántas se registraron;
--   2. de esas, cuántas hicieron algo en su primera semana (Voy, Me interesa, seguir, o publicar un lugar, un
--      evento o un artista) — antes de que pasaran los 7 días desde su alta;
--   3. de las que ya llevan más de 7 días de vida (`vuelven_base`), cuántas volvieron después de esa primera
--      semana: con una fila en `cuentas_vistas` posterior, o un inicio de sesión real (`last_sign_in_at`)
--      posterior. Es un proxy, no una curva de retención completa (doc 21 explica el porqué): `cuentas_vistas`
--      solo guarda el último día, no un historial.
create function public.panel_comunidad() returns json
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
      where p.rol <> 'admin' and p.creado_en >= now() - ventana
    ),
    hizo_algo as (
      select n.id from nuevas n where
        exists (select 1 from public.asistencias a where a.usuario_id = n.id and a.creado_en < n.creado_en + semana)
        or exists (select 1 from public.seguimientos s where s.usuario_id = n.id and s.creado_en < n.creado_en + semana)
        or exists (select 1 from public.lugares l where l.creado_por = n.id and l.creado_en < n.creado_en + semana)
        or exists (select 1 from public.eventos e where e.creado_por = n.id and e.creado_en < n.creado_en + semana)
        or exists (select 1 from public.artistas ar where ar.creado_por = n.id and ar.creado_en < n.creado_en + semana)
    ),
    con_edad as (
      select n.id, n.creado_en from nuevas n where n.creado_en <= now() - semana
    ),
    volvio as (
      select c.id
      from con_edad c
      left join public.cuentas_vistas v on v.perfil_id = c.id
      left join auth.users u on u.id = c.id
      where coalesce(v.dia::timestamptz, '-infinity'::timestamptz) > (c.creado_en + semana)
         or coalesce(u.last_sign_in_at, '-infinity'::timestamptz) > c.creado_en + semana
    )
    select json_build_object(
      'registradas', (select count(*) from nuevas),
      'hicieron_algo', (select count(*) from hizo_algo),
      'vuelven_base', (select count(*) from con_edad),
      'vuelven', (select count(*) from volvio)
    )
  );
end $$;
comment on function public.panel_comunidad() is 'Embudo de alta de la comunidad, doc 21 opción A: solo administración, sin guardar nada nuevo.';

revoke all on function public.panel_comunidad() from public, anon;
grant execute on function public.panel_comunidad() to authenticated;
