-- somosnosotros · OL-326 · panel de administración al día: fichas vinculadas (por cualquier vía) y dos aportes nuevos
-- Pedido del founder (2026-10-07): «hay KPI que ya no se alimentan, ejemplo el de fichas reclamadas: como vinculamos directo, no crece
-- ese número, solo el de artistas que llevan su ficha». Hoy una cuenta llega a llevar una ficha por cuatro caminos y solo uno deja un
-- reporte `es_mio` (lo único que contaba «Solicitaron su ficha», panel_capo): la solicitud que aprueba la administración, el correo
-- ligado (`reclamar_si_correo_coincide`, aprueba solo, sin reporte), «Soy yo / Es mi grupo» al darse de alta (inserta el vínculo directo)
-- y el vínculo que pone la administración. Todos terminan en una fila de `artistas_cuentas` / `lugares_cuentas`; eso es lo que cuenta aquí.
--
-- SOLO AÑADE: dos funciones nuevas de solo lectura, sin tablas, columnas ni datos nuevos. No reemplaza ninguna función del panel
-- (`panel_resumen`, `panel_comunidad` y `panel_capo` quedan tal cual). Cada una falla por separado (A5): si una no responde, el resto
-- del panel se ve igual. Solo agregados: ningún id de persona ni correo sale de ellas.
--
--   · panel_fichas()  → fichas de artista y de lugar que alguna cuenta lleva, con la vía por la que se ligó la primera cuenta, la
--     serie de 12 semanas (se reconstruye de `creado_en` de los propios vínculos: no hace falta una foto diaria) y cuántos artistas
--     visibles tienen foto.
--   · panel_aportes() → «Voy / Me interesa» y «primera vez que publican» de los últimos 7 días contra los 7 anteriores.
--
-- La vía NO se guarda en ninguna parte: se deduce de lo que sí queda (reporte `es_mio` previo de esa cuenta → solicitud; ficha creada por
-- esa cuenta en ese mismo momento → alta; su correo coincide con el contacto que el CAPO capturó para esa ficha → correo ligado; lo demás
-- → otra vía, p. ej. la administración la ligó). Es una inferencia y el panel lo dice. Guardarla exacta pediría una columna y tocar los
-- tres sitios que insertan: decisión del founder, anotada en la bitácora 355.

-- ---------- panel_fichas() ----------
create function public.panel_fichas() returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.es_admin() then
    raise exception 'solo la administración' using errcode = '42501';
  end if;
  return (
    with vinculos as (
      select 'artista'::text as tipo, c.artista_id as ficha, c.perfil_id, c.creado_en,
        case
          when exists (select 1 from public.reportes r
            where r.tipo = 'artista' and r.objeto_id = c.artista_id and r.creado_por = c.perfil_id
              and r.motivo = 'es_mio' and r.creado_en <= c.creado_en) then 'solicitud'
          when exists (select 1 from public.artistas a
            where a.id = c.artista_id and a.creado_por = c.perfil_id and c.creado_en <= a.creado_en + interval '2 minutes') then 'alta'
          when exists (select 1 from public.contactos_importados ci
            join auth.users u on lower(u.email) = lower(ci.correo)
            where ci.artista_id = c.artista_id and u.id = c.perfil_id) then 'correo'
          else 'otra'
        end as via
      from public.artistas_cuentas c
      union all
      select 'lugar'::text, c.lugar_id, c.perfil_id, c.creado_en,
        case
          when exists (select 1 from public.reportes r
            where r.tipo = 'lugar' and r.objeto_id = c.lugar_id and r.creado_por = c.perfil_id
              and r.motivo = 'es_mio' and r.creado_en <= c.creado_en) then 'solicitud'
          else 'otra'
        end
      from public.lugares_cuentas c
    ),
    -- Una fila por ficha: la primera cuenta que la ligó (aunque la lleven varias, cuenta una vez).
    fichas as (
      select distinct on (v.tipo, v.ficha) v.tipo, v.ficha, v.creado_en as desde, v.via
      from vinculos v
      order by v.tipo, v.ficha, v.creado_en, v.perfil_id
    ),
    -- Acumulado de hace k semanas (k = 0 es hoy): cuántas fichas ya tenían cuenta ligada entonces.
    semanas as (
      select k, (select count(*) from fichas f where f.desde <= now() - k * interval '7 days') as n
      from generate_series(0, 11) as k
    )
    select json_build_object(
      'artistas', (select count(*) from fichas where tipo = 'artista'),
      'lugares', (select count(*) from fichas where tipo = 'lugar'),
      'vias', json_build_object(
        'solicitud', (select count(*) from fichas where via = 'solicitud'),
        'alta', (select count(*) from fichas where via = 'alta'),
        'correo', (select count(*) from fichas where via = 'correo'),
        'otra', (select count(*) from fichas where via = 'otra')
      ),
      'serie', (select json_agg(n order by k desc) from semanas),
      'artistas_por_reclamar', (select count(*) from public.artistas a
        where a.origen = 'capo' and not exists (select 1 from public.artistas_cuentas c where c.artista_id = a.id)),
      'artistas_visibles', (select count(*) from public.artistas where visible),
      'artistas_con_foto', (select count(*) from public.artistas where visible and nullif(btrim(foto), '') is not null)
    )
  );
end $$;
comment on function public.panel_fichas() is 'OL-326: fichas de artista y de lugar con una cuenta ligada, por la vía que sea (solicitud aprobada, correo ligado, «Soy yo» al darse de alta, otra), serie semanal y artistas visibles con foto. Solo administración; solo agregados; la vía se deduce, no se guarda.';
revoke all on function public.panel_fichas() from public, anon;
grant execute on function public.panel_fichas() to authenticated;

-- ---------- panel_aportes() ----------
create function public.panel_aportes() returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.es_admin() then
    raise exception 'solo la administración' using errcode = '42501';
  end if;
  return (
    with
    -- Los últimos 14 días de Voy y Me interesa, con el rol de entonces (N2: lo que hace la administración no cuenta).
    gestos as (
      select a.usuario_id, a.estado, a.creado_en
      from public.asistencias a
      where a.creado_en >= now() - interval '14 days' and public.rol_en(a.usuario_id, a.creado_en) <> 'admin'
    ),
    publicaciones as (
      select l.creado_por as perfil, l.creado_en from public.lugares l where l.creado_por is not null
      union all
      select e.creado_por, e.creado_en from public.eventos e where e.creado_por is not null
      union all
      select a.creado_por, a.creado_en from public.artistas a where a.creado_por is not null
    ),
    -- La primera vez que cada cuenta publicó algo siendo usuaria (no administradora en ese momento).
    primeras as (
      select p.perfil, min(p.creado_en) as primera
      from publicaciones p
      where public.rol_en(p.perfil, p.creado_en) <> 'admin'
      group by p.perfil
    )
    select json_build_object(
      'gestos_ahora', (select count(*) from gestos where creado_en >= now() - interval '7 days'),
      'gestos_antes', (select count(*) from gestos where creado_en < now() - interval '7 days'),
      'voy', (select count(*) from gestos where creado_en >= now() - interval '7 days' and estado = 'voy'),
      'me_interesa', (select count(*) from gestos where creado_en >= now() - interval '7 days' and estado = 'me_interesa'),
      'personas', (select count(distinct usuario_id) from gestos where creado_en >= now() - interval '7 days'),
      'primeras_ahora', (select count(*) from primeras where primera >= now() - interval '7 days'),
      'primeras_antes', (select count(*) from primeras where primera >= now() - interval '14 days' and primera < now() - interval '7 days'),
      'han_publicado', (select count(*) from primeras)
    )
  );
end $$;
comment on function public.panel_aportes() is 'OL-326: Voy / Me interesa de los últimos 7 días contra los 7 anteriores y cuentas que publicaron por primera vez, sin contar administradores (rol de entonces). Solo administración; solo agregados.';
revoke all on function public.panel_aportes() from public, anon;
grant execute on function public.panel_aportes() to authenticated;
